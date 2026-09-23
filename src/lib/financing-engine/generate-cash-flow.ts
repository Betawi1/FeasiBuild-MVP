/**
 * FeasiBuild Financing Calculation Engine
 * Generates pre-calculated monthly cash flow data for preview tables.
 *
 * Features:
 * - Sale escrow rules: staged | progress | ten_ninety | closed_loop_escrow | project_guarantee_account | none (location defaults only)
 * - 1-Month Offsets for Interest, Fees, Withdrawals
 * - Gap-Fill Sequencing: Equity -> RCF -> Backstop Equity
 * - 30/70 Milestone Rule (staged / former UAE-KSA math)
 * - 10/90 70% Sales Cap & Trust Account Logic
 * - IRR/NPV Solver (Newton-Raphson)
 */

import { sendOpsAlert } from "@/lib/ops-monitor";
import {
  CLOSED_LOOP_CONTRACTOR_RETENTION_PCT,
  CLOSED_LOOP_CHINA_MAX_LOAN_OF_TDC,
  ESCROW_RULE_HORIZON_OFFSET,
  GUARANTEE_DEFAULT_PROFIT_MILESTONE_PCT,
  GUARANTEE_DEFAULT_RETENTION_PCT,
  GUARANTEE_DEFAULT_THRESHOLD_PCT,
  resolveClosedLoopToppingOut,
  resolveGuaranteeRetentionBasis,
  resolveGuaranteeRetentionMonths,
  isAbuDhabiCity,
  isCommercialSaleAsset,
  isUaeLocation,
  resolveEscrowRule,
  resolveSaleProjectEscrowRule,
} from "@/lib/financing-engine/escrow-rules";
import { resolveActualConstructionEndMonth } from "@/lib/construction-end";
import {
  cumulativeConstructionProgressPct,
  findFirstMonthAtCumulativeProgress,
  lastNonZeroMonth,
  shiftSalesInflowsToStartMonth,
} from "@/lib/sale-cash-preview-profile";

// --- TYPES ---

export type Jurisdiction = 'UAE_SA' | 'MALAYSIA' | 'AUSTRALIA' | 'CHINA' | 'OTHER';

export type MalaysiaPropertyType = 'LANDED' | 'HIGH_RISE';

type MalaysiaHdaMilestone = {
  id: string;
  threshold: number;
  percent: number;
  label: string;
  propertyType?: MalaysiaPropertyType;
};

/** Malaysia HDA: S-curve threshold (%) → withdrawal % of cumulative actual sales collected. */
const MALAYSIA_HDA_MILESTONES: MalaysiaHdaMilestone[] = [
  { id: '2a', threshold: 15, percent: 0.1, label: 'Foundation' },
  { id: '2b', threshold: 30, percent: 0.15, label: 'Framework' },
  { id: '2c', threshold: 45, percent: 0.1, label: 'Walls' },
  { id: '2d', threshold: 60, percent: 0.1, label: 'M&E' },
  { id: '2e', threshold: 75, percent: 0.1, label: 'Plastering' },
  { id: '2f_2g', threshold: 90, percent: 0.1, label: 'Sewer/Drains' },
  { id: '2h', threshold: 90, percent: 0.05, label: 'Roads', propertyType: 'LANDED' },
  { id: '3', threshold: 95, percent: 0.175, label: 'Water/Elec', propertyType: 'HIGH_RISE' },
  { id: '3', threshold: 95, percent: 0.125, label: 'Water/Elec', propertyType: 'LANDED' },
  { id: '4', threshold: 100, percent: 0.025, label: 'Completion' },
];

/** Normalize store / wizard values to engine enum (case-insensitive). */
function normalizeMalaysiaPropertyType(
  raw: MalaysiaPropertyType | string | undefined
): MalaysiaPropertyType {
  if (!raw) return 'HIGH_RISE';
  const v = String(raw).toUpperCase().replace(/[\s-]/g, '_');
  if (v.includes('LANDED') || v === 'G' || v === 'SCHEDULE_G') return 'LANDED';
  return 'HIGH_RISE';
}

function filterMalaysiaMilestonesForPropertyType(
  propertyType: MalaysiaPropertyType
): MalaysiaHdaMilestone[] {
  return MALAYSIA_HDA_MILESTONES.filter((ms) => {
    if (!ms.propertyType) return true;
    return ms.propertyType === propertyType;
  });
}

/**
 * Statutory HDA construction deposit (Schedule G/H) applies only to Malaysian
 * residential for-sale projects. Warehouse, retail, office, hotel, and data
 * centre are not HDA-regulated even when the progress-drawdown rule is selected.
 */
function hdaDepositApplies(
  inputs: FinancingInputs,
  selectedRule: string
): boolean {
  const commercial =
    inputs.financingModel === "commercial" ||
    isCommercialSaleAsset({
      buildingType: inputs.buildingType,
      buildingSubType: inputs.buildingSubType,
    });
  return (
    selectedRule === "progress" &&
    inputs.jurisdiction === "MALAYSIA" &&
    !commercial &&
    inputs.hdaDepositEnabled !== false
  );
}

export type FinancingStream = "sale" | "operational";

export type FinancingInputs = {
  /** Hard router: sale vs operational (from Component 1). */
  stream?: FinancingStream;
  businessModel?: string;
  projectType?: string;
  exitStrategy?: "sale" | "hold" | "refinance";
  /** Sale product class — HDA deposit is Malaysia residential-only. Escrow follows the selected rule. */
  financingModel?: "commercial" | "residential";
  buildingType?: string;
  buildingSubType?: string;
  // Project Context
  constructionPeriodMonths: number;
  sCurveMonthly: number[];
  phases: string[];
  
  // Costs (Monthly arrays)
  monthlyCosts: {
    construction: number[];
    soft: number[];
    powc: number[];
    /** Sale warehouse FF&E only; omit/empty for other asset types. */
    ffe?: number[];
  };
  landCost: number;
  monthlySalesInflows: number[]; // From Component 3 Total Inflow
  
  // Financing Config (From Components 3 & 4)
  jurisdiction: Jurisdiction;
  landEquityPercent: number;
  /** Post-haircut land equity counted at M0 (e.g. land × 70% when land is 100% equity). */
  landEquityValue: number;
  /** Cash equity required at M0 from Component 4 Step 3 (after land equity counted toward TDC). */
  cashEquityRequired: number;

  // Equity & Debt
  approvedCreditFacility: number;
  constructionLoanLtcPct: number;
  interestRatePct: number;
  idcTreatment: 'capitalize' | 'paid-current';
  
  // Land term loan (all escrow rules; enabled when land equity < 100%)
  landLoanEnabled?: boolean;
  landLoanAmount: number;
  /** Annual rate as decimal (e.g. 0.065 for 6.5%). */
  landLoanRatePct: number;
  landLoanTenorMonths?: number;
  landLoanInterestTreatment?:
    | "capitalize"
    | "paid-current-quarterly"
    | "paid-current-semiannual";
  landLoanArrangementFeePct: number;
  landLoanValuationFeePct: number;
  
  // Preference Shares
  prefSharesEnabled: boolean;
  prefSharesAmount: number;
  /** Annual dividend rate as decimal (e.g. 0.09); semi-annual coupon = amount × this / 2, paid M6, M12, … */
  prefSharesReturnPct: number;
  
  // Fees
  commitmentFeePct: number; // Annual % on undrawn facility (e.g. 0.5 = 0.5% p.a.); monthly = undrawn × pct/100/12
  escrowSetupFee: number;
  escrowManagementFeePct: number; // Annual %
  escrowDepositRatePct: number;
  
  // Jurisdiction Specifics
  milestoneMonths: number[]; // Months triggering drawdown/certification
  /** Staged escrow: 3 or 6 — first cert at M{interval}, withdrawal next month. */
  certificationIntervalMonths: number;
  /** Staged escrow: retention held until release (percent points, default 5). */
  retentionPercent?: number;
  /** Malaysia HDA deposit as percent points (e.g. 3 = 3% of total construction costs). */
  hdaDepositPct: number;
  hdaDepositEnabled?: boolean;
  /** Sum of construction cost line (pre-calculated in bridge). */
  totalConstructionCosts: number;
  projectedGDV?: number;
  trustAccountFeePct: number; // Australia: Annual %
  trustAccountDepositRatePct: number; // Australia: Annual %
  /** Malaysia Schedule G (landed) vs high-rise — controls Stage 2h milestone. */
  malaysiaPropertyType?: MalaysiaPropertyType;

  /** 10/90 Rule: purchase deposit % held in trust (percent points, default 10). */
  auDepositPct?: number;
  /** 10/90 Rule: balance % paid at settlement (percent points, default 90). */
  auBalancePct?: number;
  /**
   * Closed-loop topping-out. The C2 shift runs in any jurisdiction when this is
   * true and the percent is above 0. Undefined keeps the legacy default
   * (on for CHINA, off otherwise). The 70% TDC cap is not tied to this flag.
   */
  closedLoopToppingOutEnabled?: boolean;
  /** Cumulative C1 progress % that must be reached before shifted sales begin. */
  closedLoopToppingOutPct?: number;

  /** Project guarantee account: cumulative S-curve % before cost reimbursement (default 20). */
  guaranteeThresholdPercent?: number;
  /** Stage-1 profit milestone. Must be above the threshold and below 100 (default 60). */
  guaranteeProfitMilestonePercent?: number;
  /** Defect retention percent (default 5). The basis decides what it multiplies. */
  guaranteeRetentionPercent?: number;
  /**
   * construction_cost: fixed percent of total C1 construction cost (Abu Dhabi default).
   * escrow_proceeds: percent of cumulative inflows (default everywhere else).
   * Omitted values follow the project location.
   */
  guaranteeRetentionBasis?: "construction_cost" | "escrow_proceeds";
  /** Months after completion before the retention pool is released (minimum 12). */
  guaranteeRetentionMonths?: number;
  /** Construction-loan interest is a permitted escrow use when this is not false. */
  guaranteeInterestPermitted?: boolean;
  /**
   * Share of each soft-cost month that is the C1 "Other Fees" allocation (0–1).
   * Excluded from permitted spend. Default 0.10 matches the C1 allocation default.
   */
  guaranteeSoftOtherFeesShare?: number;

  /** ISO / display country — used for VN/TH flexible horizon. */
  country?: string;
  countryCode?: string;
  city?: string;
  /** Step 5 escrow rule (ten_ninety | staged | progress | closed_loop_escrow | project_guarantee_account | none; legacy uae/malaysia/australia accepted). */
  escrowWithdrawalMode?: string;
  /** Aliases for wizard / legacy field names. */
  withdrawalMethod?: string;
  escrowModelType?: string;
};

export type MonthlyRow = {
  month: number;
  phase: string;
  progressPct: number;
  isMilestone: boolean;

  // Universal Inflows
  salesProceeds: number;
  escrowBalance: number;
  escrowInterest: number;
  escrowAccountFees: number;
  progressWithdrawal: number;
  escrowReleases: number; // Added per user request
  /** Malaysia: stakeholder retention released at VP+8 / VP+24. */
  retentionRelease: number;
  /** Project guarantee account: permitted-cost reimbursement (1-month offset). */
  permittedCostReimbursement: number;
  /** Project guarantee account: mandatory construction-loan prepayment from surplus. */
  lenderCashSweep: number;
  /** Project guarantee account: surplus released to the developer after the sweep. */
  developerProfitWithdrawal: number;
  /** Project guarantee account: defect-retention pool released at Stage 3. */
  defectRetentionRelease: number;
  /**
   * Set only on the Stage-3 month. The retention target at release.
   * Compare with defectRetentionRelease to see whether the hold was fully funded.
   */
  guaranteeRetentionTarget?: number;

  // Australia Specific
  lockedInSales: number;
  cumuLockedInSales: number;
  cumuTrustAccount: number;
  /** 10/90: depositPct × locked-in sales this month, lodged in trust. */
  depositToTrust: number;
  /** 10/90: balancePct × sales value of units settling this month. */
  balancePayment: number;
  trustAccountInterest: number;
  trustAccountFees: number;
  trustAccountReleases: number;
  actualSalesProceeds: number;

  // Outflows
  constructionCosts: number;
  softCosts: number;
  powc: number;
  /** Sale warehouse FF&E; 0 for non-warehouse. */
  ffe: number;
  totalOutflowsExclLand: number;
  landCost: number;
  hda3Deposit: number; // Malaysia
  totalOutflowsInclLand: number;
  ncf: number;

  // Loans
  landLoanDrawdown: number;
  landLoanInterest: number;
  landLoanRepayment: number;
  landLoanFees: number;

  constLoanDrawdown: number;
  constLoanCumulative: number;
  constLoanInterest: number;
  constLoanRepayment: number;
  constLoanCommitmentFee: number;
  /** Outstanding RCF balance after draw/repay this month (end-of-month `state.rcfBalance`). */
  cumulativeDrawdown: number;

  // Mezzanine
  prefDrawdown: number;
  prefDividend: number;
  prefRepayment: number;

  // Equity
  capitalHdaDeposit: number;
  capitalLand: number;
  capitalCash: number;
  cumulativeCapital: number;

  // Bottom Line
  ncfAfterFinancing: number;
  cumulativeNcf: number;

  // IRR
  irrCashFlow: number;
  /** Net CF to equity (distribution − injection); mirrors `irrCashFlow` for Component 5. */
  equityCashFlow: number;
  irrDiscountRate: number;
  irrNpv: number;
};

// --- ENGINE ---

/** Hard router — no silent fallback between sale and operational. */
export function generateFinancingCashFlow(inputs: FinancingInputs): MonthlyRow[] {
  try {
    return routeFinancingCashFlow(inputs);
  } catch (error) {
    void sendOpsAlert(error instanceof Error ? error : String(error), {
      source: "Financing Engine",
      stream: inputs.stream,
      businessModel: inputs.businessModel || inputs.projectType,
    });
    throw error;
  }
}

function routeFinancingCashFlow(inputs: FinancingInputs): MonthlyRow[] {
  const stream = inputs.stream;
  const businessModel = inputs.businessModel || inputs.projectType;

  // eslint-disable-next-line no-console
  console.debug("🔀 Routing engine:", { stream, businessModel });

  if (
    stream === "sale" ||
    businessModel === "DEV_FOR_SALE" ||
    businessModel === "RESIDENTIAL" ||
    businessModel === "COMMERCIAL"
  ) {
    // eslint-disable-next-line no-console
    console.debug("✅ Routing to SALE engine");
    return generateSaleCashFlow(inputs);
  }

  if (
    stream === "operational" ||
    businessModel === "HOLD" ||
    businessModel === "HOTEL"
  ) {
    // eslint-disable-next-line no-console
    console.debug("✅ Routing to OPERATIONAL engine");
    return generateOperationalCashFlow(inputs);
  }

  throw new Error(
    `❌ Engine routing error: Unknown stream/businessModel. ` +
      `Expected 'sale' | 'operational', got stream='${stream}', businessModel='${businessModel}'. ` +
      `Check Component 1 project type selection.`
  );
}

/** Sale (development-for-sale): CP + 6 horizon, exitStrategy sale, no hold/M168 tail. */
export function generateSaleCashFlow(inputs: FinancingInputs): MonthlyRow[] {
  return runFinancingEngineCore({
    ...inputs,
    stream: "sale",
    exitStrategy: "sale",
  });
}

/**
 * Operational-style escrow/development tail (jurisdiction extensions).
 * Hotel hold models use `operational/engine/c4.levered.engine` — not this module.
 */
export function generateOperationalCashFlow(
  inputs: FinancingInputs
): MonthlyRow[] {
  return runFinancingEngineCore({
    ...inputs,
    stream: "operational",
  });
}

function selectedSaleEscrowRule(inputs: FinancingInputs) {
  const raw =
    inputs.escrowWithdrawalMode || inputs.withdrawalMethod || inputs.escrowModelType;
  // Explicit mode (already resolved by the sale bridge/wizard) always wins.
  if (raw != null && String(raw).trim() !== "") {
    return resolveEscrowRule({
      withdrawalMode: raw,
      jurisdiction: inputs.jurisdiction,
    });
  }
  return resolveSaleProjectEscrowRule({
    withdrawalMode: raw,
    jurisdiction: inputs.jurisdiction,
    country: inputs.country,
    countryCode: inputs.countryCode,
    city: inputs.city,
    buildingType: inputs.buildingType,
    buildingSubType: inputs.buildingSubType,
  });
}

/**
 * Last month index for sale stream (M0 … saleHorizon inclusive).
 * Follows the SELECTED escrow rule for every asset class (not country, not commercial/residential):
 * staged / ten_ninety → CP+12, progress → CP+24, none / unset → CP+6.
 * closed_loop_escrow → max(actual construction end + 24, last sales month + 1).
 * project_guarantee_account → CP + retention months (default 12, minimum 12).
 * Construction end is the last non-zero C1 S-curve month, never the financing
 * factory default. When topping-out is on, the last sales month is read from a
 * shifted copy; the caller's array is unchanged.
 */
function closedLoopToppingOutSales(
  inputs: FinancingInputs,
  constructionWindow: number
): number[] | null {
  const topping = resolveClosedLoopToppingOut({
    toppingOutEnabled: inputs.closedLoopToppingOutEnabled,
    toppingOutPercent: inputs.closedLoopToppingOutPct,
    china: inputs.jurisdiction === "CHINA",
  });
  if (!topping.enabled || !(topping.percent > 0)) return null;
  const progress = cumulativeConstructionProgressPct(
    inputs.monthlyCosts?.construction || [],
    constructionWindow
  );
  const toppingMonth = findFirstMonthAtCumulativeProgress(progress, topping.percent);
  return shiftSalesInflowsToStartMonth(
    inputs.monthlySalesInflows || [],
    toppingMonth + 1
  );
}

export function resolveSaleHorizonLastMonth(inputs: FinancingInputs): number {
  const constructionMonths = inputs.constructionPeriodMonths || 42;
  const rule = selectedSaleEscrowRule(inputs);
  if (rule === "project_guarantee_account") {
    return constructionMonths + resolveGuaranteeRetentionMonths(inputs.guaranteeRetentionMonths);
  }
  if (rule !== "closed_loop_escrow") {
    return constructionMonths + ESCROW_RULE_HORIZON_OFFSET[rule];
  }
  const completionMonth = resolveActualConstructionEndMonth(
    { constructionPeriod: inputs.constructionPeriodMonths },
    inputs.monthlyCosts?.construction
  );
  const shifted = closedLoopToppingOutSales(inputs, constructionMonths);
  const sales = shifted ?? inputs.monthlySalesInflows ?? [];
  return Math.max(
    completionMonth + ESCROW_RULE_HORIZON_OFFSET.closed_loop_escrow,
    lastNonZeroMonth(sales) + 1
  );
}

// --- STRATEGY MODELS ---

/** Strategy A: UAE/KSA Escrow Logic */
function applyUaeKsaEscrowLogic(
  row: MonthlyRow,
  state: any,
  inputs: FinancingInputs,
  m: number,
  salesThisMonth: number,
  totalSales: number,
  interestEarned: number,
  feePayable: number
) {
  const interval = inputs.certificationIntervalMonths;
  const safeInterval = interval === 3 || interval === 6 ? interval : 6;
  const monthlyOutflowExclLand =
    row.constructionCosts + row.softCosts + row.powc + (row.ffe || 0);
  state.costsSinceLastCert += monthlyOutflowExclLand;
  const cp = inputs.constructionPeriodMonths;
  const isCertMonth = m > 0 && m <= cp && m % safeInterval === 0;
  const escrowAtCertMonth = state.escrowBalance + salesThisMonth + interestEarned - feePayable;

  if (isCertMonth) {
    const eligibleAmount = Math.min(state.costsSinceLastCert, Math.max(0, escrowAtCertMonth));
    state.pendingWithdrawal = eligibleAmount;
    state.costsSinceLastCert = 0;
  }

  const isWithdrawalMonth = m - 1 > 0 && m - 1 <= cp && (m - 1) % safeInterval === 0;
  if (isWithdrawalMonth && state.pendingWithdrawal > 0) {
    row.progressWithdrawal = state.pendingWithdrawal;
    state.pendingWithdrawal = 0;
  } else {
    row.progressWithdrawal = 0;
  }

  const balanceAfterFlows = state.escrowBalance + salesThisMonth + interestEarned - feePayable - row.progressWithdrawal;
  const retentionPctPoints = inputs.retentionPercent ?? 5;
  const retentionFloor = totalSales * (retentionPctPoints / 100);
  const finalReleaseMonth = inputs.constructionPeriodMonths + 12;
  let releaseAmount = 0;

  if (m >= inputs.constructionPeriodMonths + 1) {
    if (m === finalReleaseMonth) {
      releaseAmount = balanceAfterFlows;
      state.escrowBalance = 0;
    } else {
      const surplus = balanceAfterFlows - retentionFloor;
      if (surplus > 0) { releaseAmount = surplus; state.escrowBalance = retentionFloor; }
      else { releaseAmount = 0; state.escrowBalance = balanceAfterFlows; }
    }
  } else {
    state.escrowBalance = balanceAfterFlows;
  }

  row.escrowReleases = releaseAmount;
  row.escrowBalance = state.escrowBalance;
  row.escrowInterest = interestEarned;
  row.escrowAccountFees = feePayable;
}

/** Strategy B: Malaysia HDA Logic */
function applyMalaysiaHdaLogic(
  row: MonthlyRow,
  state: any,
  inputs: FinancingInputs,
  m: number,
  salesThisMonth: number,
  interestEarned: number,
  feePayable: number,
  totalSales: number
) {
  if (m === 0 && state.hdaDepositAmount > 0) state.escrowBalance += state.hdaDepositAmount;
  row.escrowInterest = interestEarned;
  if (m === inputs.constructionPeriodMonths + 24 && state.hdaDepositAmount > 0) {
    row.escrowInterest += state.hdaDepositAmount * inputs.escrowDepositRatePct * (inputs.constructionPeriodMonths / 12);
  }
  row.escrowAccountFees = feePayable;
  state.totalActualSalesCollected += salesThisMonth;
  const balanceAfterInflows = state.escrowBalance + salesThisMonth + interestEarned - feePayable;
  const isConstruction = m <= inputs.constructionPeriodMonths;
  const monthsSinceVP = m - inputs.constructionPeriodMonths;
  const hdaFloor = state.hdaDepositAmount > 0 && !state.hdaDepositReleased ? state.hdaDepositAmount : 0;

  let progressWithdrawal = 0;
  let escrowRelease = 0;

  if (isConstruction) {
    const currentProgress = inputs.sCurveMonthly[m] ?? row.progressPct ?? 0;
    const stage1Withdrawal = salesThisMonth * 0.1;
    let milestoneEntitlement = 0;
    const propertyType = normalizeMalaysiaPropertyType(inputs.malaysiaPropertyType ?? (inputs as any).propertyType);
    const applicableMilestones = filterMalaysiaMilestonesForPropertyType(propertyType);

    for (const milestone of applicableMilestones) {
      if (currentProgress >= milestone.threshold && !state.malaysiaPaidMilestones.includes(milestone.id)) {
        const entitlement = state.totalActualSalesCollected * milestone.percent;
        milestoneEntitlement += entitlement;
        state.malaysiaPaidMilestones.push(milestone.id);
      }
    }
    const totalEntitlement = stage1Withdrawal + milestoneEntitlement;
    const withdrawableBalance = Math.max(0, balanceAfterInflows - hdaFloor);
    progressWithdrawal = Math.min(totalEntitlement, withdrawableBalance);
  } else {
    let retentionPercent = 0;
    if (monthsSinceVP >= 1 && monthsSinceVP <= 8) retentionPercent = 0.05;
    else if (monthsSinceVP >= 9 && monthsSinceVP <= 23) retentionPercent = 0.025;
    else if (monthsSinceVP === 24) retentionPercent = 0;

    const gdvOrSales = state.totalActualSalesCollected || inputs.projectedGDV || totalSales;
    const requiredRetention = gdvOrSales * retentionPercent;
    const hdaLocked = monthsSinceVP < 24 ? hdaFloor : 0;
    const minimumEscrowBalance = requiredRetention + hdaLocked;
    const surplus = balanceAfterInflows - minimumEscrowBalance;
    if (surplus > 0) escrowRelease = surplus;
    if (monthsSinceVP === 24 && !state.hdaDepositReleased) {
      state.hdaDepositReleased = true;
      state.hdaDepositAmount = 0;
    }
  }

  row.progressWithdrawal = progressWithdrawal;
  row.escrowReleases = escrowRelease;
  row.retentionRelease = isConstruction ? 0 : escrowRelease;
  state.escrowBalance = balanceAfterInflows - progressWithdrawal - escrowRelease;
  row.escrowBalance = state.escrowBalance;
}

/** Strategy C: 10/90 Rule — deposit in trust at lock; balance + deposit released at settlement. */
function applyAustralia1090Logic(
  row: MonthlyRow,
  state: any,
  inputs: FinancingInputs,
  m: number,
  salesThisMonth: number,
  interestEarned: number,
  feePayable: number,
  _totalSales: number
) {
  const depositPct = (inputs.auDepositPct ?? 10) / 100;
  const balancePct = (inputs.auBalancePct ?? 90) / 100;
  const constructionEnd = inputs.constructionPeriodMonths;
  const monthsSinceConstructionEnd = m - constructionEnd;

  row.lockedInSales = salesThisMonth;
  state.cumuLockedSales += salesThisMonth;
  row.cumuLockedInSales = state.cumuLockedSales;
  row.trustAccountInterest = interestEarned;
  row.trustAccountFees = feePayable;

  const depositThisMonth = salesThisMonth * depositPct;
  row.depositToTrust = depositThisMonth;

  // CP locks settle at handover (first post-CP month). Post-CP locks settle in the lock month.
  let settlingSales = 0;
  if (m <= constructionEnd) {
    state.auConstructionSalesCumulative += salesThisMonth;
  } else if (m === constructionEnd + 1) {
    settlingSales =
      (Number(state.auConstructionSalesCumulative) || 0) + salesThisMonth;
    state.auConstructionBalancePaid = true;
  } else {
    settlingSales = salesThisMonth;
  }

  const balancePayment = settlingSales * balancePct;
  const depositPrincipalRelease = settlingSales * depositPct;
  row.balancePayment = balancePayment;

  state.trustAccountBalance += depositThisMonth + interestEarned - feePayable;

  let trustRelease = Math.min(
    Math.max(0, depositPrincipalRelease),
    Math.max(0, state.trustAccountBalance)
  );
  state.trustAccountBalance -= trustRelease;

  // Residual trust (interest − fees, any leftover principal) fully released at CP+12, never later.
  if (monthsSinceConstructionEnd === 12 && state.trustAccountBalance !== 0) {
    trustRelease += state.trustAccountBalance;
    state.trustAccountBalance = 0;
  }

  row.trustAccountReleases = trustRelease;
  row.actualSalesProceeds = balancePayment + trustRelease;
  row.escrowReleases = trustRelease;
  row.cumuTrustAccount = state.trustAccountBalance;
  row.escrowBalance = state.trustAccountBalance;
}

/**
 * Strategy E: Closed-Loop Escrow.
 * Every buyer inflow is locked until practical completion, then released as one lump.
 * Collections after completion pass through in the same month. Interest and management
 * fees accrue only while the prior balance is positive, and never after the lump release.
 * No progress withdrawals. Contractor retention is a cost-timing item, not an escrow movement.
 */
function applyClosedLoopEscrowLogic(
  row: MonthlyRow,
  state: { escrowBalance: number },
  _inputs: FinancingInputs,
  m: number,
  salesThisMonth: number,
  interestEarned: number,
  feePayable: number,
  completionMonth: number
) {
  row.progressWithdrawal = 0;
  row.retentionRelease = 0;

  const prior = state.escrowBalance;
  const sales = Math.max(0, salesThisMonth);
  const accountOpen = prior > 1e-9;

  // After the lump release the account stays at zero. Later sales pass through
  // and must not revive interest, fees, or a negative balance.
  if (m > completionMonth) {
    row.escrowInterest = 0;
    row.escrowAccountFees = 0;
    row.escrowReleases = sales;
    state.escrowBalance = 0;
    row.escrowBalance = 0;
    return;
  }

  // 1-month offset: interest and the management fee use the prior balance, and
  // only while that balance is still positive. M0 keeps the one-off setup fee
  // (not a balance-based management charge).
  let interest = 0;
  let fees = 0;
  if (m === 0) {
    fees = Math.max(0, feePayable);
  } else if (accountOpen) {
    interest = interestEarned;
    fees = Math.max(0, feePayable);
  }

  let next = prior + sales + interest - fees;
  if (next < -1e-9) {
    fees = Math.max(0, fees + next);
    next = 0;
  } else if (next < 0) {
    next = 0;
  }

  row.escrowInterest = interest;
  row.escrowAccountFees = fees;

  if (m === completionMonth) {
    row.escrowReleases = next;
    state.escrowBalance = 0;
  } else {
    row.escrowReleases = 0;
    state.escrowBalance = next;
  }
  row.escrowBalance = state.escrowBalance;
}

/** Dev-only ledger checks. Production builds skip these. */
function assertClosedLoopEscrowLedger(
  rows: MonthlyRow[],
  completionMonth: number,
  horizonLength: number
): void {
  if (process.env.NODE_ENV !== "development") return;

  const series: Array<[string, number[]]> = [
    ["escrow balance", rows.map((r) => r.escrowBalance)],
    ["escrow interest", rows.map((r) => r.escrowInterest)],
    ["escrow fees", rows.map((r) => r.escrowAccountFees)],
    ["escrow releases", rows.map((r) => r.escrowReleases)],
  ];
  for (const [label, row] of series) {
    if (row.length !== horizonLength) {
      // eslint-disable-next-line no-console
      console.error(
        `[closed-loop] ${label}: length ${row.length} !== horizon ${horizonLength}`
      );
    }
  }

  let lockedSales = 0;
  let passThrough = 0;
  let releaseSum = 0;
  let interestSum = 0;
  let feeSum = 0;
  for (const row of rows) {
    if (row.escrowBalance < -1e-6) {
      // eslint-disable-next-line no-console
      console.error(
        `[closed-loop] escrow balance < 0 at M${row.month}: ${row.escrowBalance}`
      );
    }
    if (row.month <= completionMonth) lockedSales += row.salesProceeds;
    else passThrough += row.salesProceeds;
    releaseSum += row.escrowReleases;
    interestSum += row.escrowInterest;
    feeSum += row.escrowAccountFees;
    if (row.month > completionMonth) {
      if (Math.abs(row.escrowBalance) > 1e-4) {
        // eslint-disable-next-line no-console
        console.error(`[closed-loop] balance not zero after release at M${row.month}`);
      }
      if (Math.abs(row.escrowInterest) > 1e-4) {
        // eslint-disable-next-line no-console
        console.error(`[closed-loop] interest after release at M${row.month}`);
      }
      if (Math.abs(row.escrowAccountFees) > 1e-4) {
        // eslint-disable-next-line no-console
        console.error(`[closed-loop] fees after release at M${row.month}`);
      }
      if (Math.abs(row.escrowReleases - Math.max(0, row.salesProceeds)) > 1e-4) {
        // eslint-disable-next-line no-console
        console.error(
          `[closed-loop] pass-through release !== sales at M${row.month}`
        );
      }
    }
  }

  // The completion lump releases locked principal plus net trust income
  // (interest earned while the account was open, minus fees charged then).
  const expected = lockedSales + passThrough + interestSum - feeSum;
  if (Math.abs(releaseSum - expected) > 0.5) {
    // eslint-disable-next-line no-console
    console.error(
      `[closed-loop] sum(releases) ${releaseSum} !== locked sales ${lockedSales} + pass-through ${passThrough} + interest ${interestSum} - fees ${feeSum}`
    );
  }
}

function clampGuaranteePercent(raw: number | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

/** Cumulative construction-cost percent through `last` (C1 S-curve). */
function cumulativeCostProgressPct(series: number[], last: number): number[] {
  const end = Math.max(0, last);
  let total = 0;
  for (let m = 0; m <= end; m++) total += Math.max(0, Number(series[m]) || 0);
  const out: number[] = [];
  let cum = 0;
  for (let m = 0; m <= end; m++) {
    cum += Math.max(0, Number(series[m]) || 0);
    out.push(total > 1e-9 ? (cum / total) * 100 : m === end ? 100 : 0);
  }
  return out;
}

type GuaranteeLedgerState = {
  escrowBalance: number;
  rcfBalance: number;
  guaranteeCumulativeInflows: number;
  guaranteeReimbursementCarry: number;
};

/**
 * Strategy F: Project Guarantee Account.
 * Buyer proceeds sit in the account. Permitted costs reimburse one month after
 * they are incurred, starting at the threshold month (pre-threshold spend catches
 * up then). Profit surplus releases at the milestone and at completion, sweeping
 * the construction loan first. The retention target is a fixed share of
 * construction cost, or a share of cumulative proceeds. After completion,
 * collections top that target up before any developer release. Stage 3 pays
 * out the balance and closes the account.
 */
function guaranteeRetentionTarget(
  basis: "construction_cost" | "escrow_proceeds",
  retentionRate: number,
  constructionCostTotal: number,
  cumulativeInflows: number
): number {
  if (basis === "construction_cost") {
    return Math.max(0, constructionCostTotal) * retentionRate;
  }
  return Math.max(0, cumulativeInflows) * retentionRate;
}

function applyProjectGuaranteeAccountLogic(
  row: MonthlyRow,
  state: GuaranteeLedgerState,
  inputs: FinancingInputs,
  m: number,
  salesThisMonth: number,
  priorRows: MonthlyRow[],
  permittedCost: number[],
  calendar: {
    thresholdMonth: number;
    stage1Month: number;
    stage2Month: number;
    stage3Month: number;
    completionMonth: number;
    retentionRate: number;
    retentionBasis: "construction_cost" | "escrow_proceeds";
    constructionCostTotal: number;
    interestPermitted: boolean;
  }
) {
  const sales = Math.max(0, salesThisMonth);
  row.permittedCostReimbursement = 0;
  row.lenderCashSweep = 0;
  row.developerProfitWithdrawal = 0;
  row.defectRetentionRelease = 0;
  row.progressWithdrawal = 0;
  row.retentionRelease = 0;
  row.escrowReleases = 0;

  // Account is closed. Later collections pass through and must not revive accruals.
  if (m > calendar.stage3Month) {
    row.escrowInterest = 0;
    row.escrowAccountFees = 0;
    row.developerProfitWithdrawal = sales;
    row.escrowReleases = sales;
    state.escrowBalance = 0;
    row.escrowBalance = 0;
    return;
  }

  const prior = state.escrowBalance;
  let interest = 0;
  let fees = 0;
  if (m === 0) {
    fees = Math.max(0, Number(inputs.escrowSetupFee) || 0);
  } else if (prior > 1e-9 && m <= calendar.stage3Month) {
    interest = prior * ((Number(inputs.escrowDepositRatePct) || 0) / 12);
    fees = prior * ((Number(inputs.escrowManagementFeePct) || 0) / 12);
  }

  let next = prior + interest - fees;
  if (next < -1e-9) {
    fees = Math.max(0, fees + next);
    next = 0;
  } else if (next < 0) {
    next = 0;
  }
  next += sales;

  state.guaranteeCumulativeInflows += sales;
  const retentionTarget = guaranteeRetentionTarget(
    calendar.retentionBasis,
    calendar.retentionRate,
    calendar.constructionCostTotal,
    state.guaranteeCumulativeInflows
  );

  const interestSpend = (t: number) =>
    calendar.interestPermitted
      ? Math.max(0, -(Number(priorRows[t]?.constLoanInterest) || 0))
      : 0;

  // Reimbursements are not capped by the retention pool. Shortfall carries forward.
  let due = state.guaranteeReimbursementCarry;
  if (m === calendar.thresholdMonth + 1) {
    for (let t = 0; t <= calendar.thresholdMonth; t++) {
      due += (Number(permittedCost[t]) || 0) + interestSpend(t);
    }
  } else if (m > calendar.thresholdMonth + 1) {
    const t = m - 1;
    due += (Number(permittedCost[t]) || 0) + interestSpend(t);
  }
  const reimbursed = Math.min(Math.max(0, due), Math.max(0, next));
  next -= reimbursed;
  state.guaranteeReimbursementCarry = Math.max(0, due - reimbursed);
  row.permittedCostReimbursement = reimbursed;

  // After completion, and outside the Stage-1/Stage-2 surplus months, collections
  // top the retention target up before any developer release.
  if (
    m > calendar.completionMonth &&
    m < calendar.stage3Month &&
    m !== calendar.stage1Month + 1 &&
    m !== calendar.stage2Month + 1
  ) {
    const balanceBefore = next - sales + reimbursed;
    const release = Math.min(
      Math.max(0, next),
      Math.max(0, balanceBefore + sales - retentionTarget)
    );
    next -= release;
    row.developerProfitWithdrawal += release;
  }

  const releaseSurplus = (reserveRemainingCosts: boolean) => {
    let remaining = 0;
    if (reserveRemainingCosts) {
      for (let t = calendar.stage1Month + 1; t <= calendar.completionMonth; t++) {
        remaining += Number(permittedCost[t]) || 0;
      }
    }
    const surplus = Math.max(0, next - remaining - retentionTarget);
    const outstanding = Math.max(0, state.rcfBalance - row.lenderCashSweep);
    const sweep = Math.min(surplus, outstanding);
    const developer = Math.max(0, surplus - sweep);
    next -= surplus;
    row.lenderCashSweep += sweep;
    row.developerProfitWithdrawal += developer;
  };

  if (m === calendar.stage1Month + 1) releaseSurplus(true);
  if (m === calendar.stage2Month + 1) releaseSurplus(false);

  if (m === calendar.stage3Month) {
    const funded = Math.max(0, next);
    const hold = Math.min(funded, retentionTarget);
    const excess = Math.max(0, funded - retentionTarget);
    row.developerProfitWithdrawal += excess;
    row.defectRetentionRelease = hold;
    row.guaranteeRetentionTarget = retentionTarget;
    next = 0;
  }

  if (next < 0) next = 0;
  state.escrowBalance = next;
  row.escrowBalance = next;
  row.escrowInterest = interest;
  row.escrowAccountFees = fees;
  row.progressWithdrawal = row.permittedCostReimbursement;
  row.escrowReleases = row.developerProfitWithdrawal + row.defectRetentionRelease;
  row.retentionRelease = row.defectRetentionRelease;
}

/** Stage-3 retention funding. `funded` is what the account actually released against `target`. */
export function guaranteeStage3RetentionFunding(
  rows: Array<{ defectRetentionRelease?: number; guaranteeRetentionTarget?: number }>
): { funded: number; target: number } | null {
  const stage = rows.find((row) => row.guaranteeRetentionTarget !== undefined);
  if (!stage || stage.guaranteeRetentionTarget === undefined) return null;
  return {
    funded: Math.max(0, Number(stage.defectRetentionRelease) || 0),
    target: Math.max(0, stage.guaranteeRetentionTarget),
  };
}

function assertProjectGuaranteeLedger(
  rows: MonthlyRow[],
  stage3Month: number,
  horizonLength: number
): void {
  if (process.env.NODE_ENV !== "development") return;
  const series: Array<[string, number[]]> = [
    ["permitted cost reimbursement", rows.map((r) => r.permittedCostReimbursement)],
    ["lender cash sweep", rows.map((r) => r.lenderCashSweep)],
    ["developer profit withdrawal", rows.map((r) => r.developerProfitWithdrawal)],
    ["defect retention release", rows.map((r) => r.defectRetentionRelease)],
  ];
  for (const [label, values] of series) {
    if (values.length !== horizonLength) {
      // eslint-disable-next-line no-console
      console.error(
        `[guarantee] ${label}: length ${values.length} !== horizon ${horizonLength}`
      );
    }
  }
  for (const row of rows) {
    if (row.escrowBalance < -1e-6) {
      // eslint-disable-next-line no-console
      console.error(
        `[guarantee] escrow balance < 0 at M${row.month}: ${row.escrowBalance}`
      );
    }
    if (row.month > stage3Month) {
      if (Math.abs(row.escrowBalance) > 1e-4) {
        // eslint-disable-next-line no-console
        console.error(`[guarantee] balance after closure at M${row.month}`);
      }
      if (Math.abs(row.escrowInterest) > 1e-4 || Math.abs(row.escrowAccountFees) > 1e-4) {
        // eslint-disable-next-line no-console
        console.error(`[guarantee] accrual after closure at M${row.month}`);
      }
    }
  }
}

/** Strategy D: Non-Escrow (Universal Fallback) */
function applyNonEscrowLogic(
  row: MonthlyRow,
  state: any,
  inputs: FinancingInputs,
  salesThisMonth: number
) {
  // Direct sales sweep, no escrow/trust logic
  row.ncf = salesThisMonth - row.totalOutflowsInclLand;
  row.escrowBalance = 0;
  row.escrowInterest = 0;
  row.escrowAccountFees = 0;
  row.progressWithdrawal = 0;
  row.escrowReleases = 0;
  row.retentionRelease = 0;
  row.lockedInSales = 0;
  row.cumuLockedInSales = 0;
  row.cumuTrustAccount = 0;
  row.depositToTrust = 0;
  row.balancePayment = 0;
  row.trustAccountInterest = 0;
  row.trustAccountFees = 0;
  row.trustAccountReleases = 0;
  row.actualSalesProceeds = 0;
}

function runFinancingEngineCore(inputs: FinancingInputs): MonthlyRow[] {
  if (process.env.NODE_ENV === "development") {
    const pre = inputs.monthlyCosts.powc;
    // eslint-disable-next-line no-console
    console.debug("🏭 [Engine POWC Received]:", {
      stream: inputs.stream,
      exitStrategy: inputs.exitStrategy,
      length: pre.length,
      M0: pre[0],
      M1: pre[1],
      M2: pre[2],
    });
  }

  const cp = inputs.constructionPeriodMonths;
  const selectedRule = selectedSaleEscrowRule(inputs);
  const closedLoop = selectedRule === "closed_loop_escrow";
  const closedLoopChina = closedLoop && inputs.jurisdiction === "CHINA";
  const guaranteeRule = selectedRule === "project_guarantee_account";
  const guaranteeAbuDhabi =
    guaranteeRule &&
    isUaeLocation(inputs.country, inputs.countryCode) &&
    isAbuDhabiCity(inputs.city);
  const isCommercial = inputs.financingModel === "commercial";
  const isSaleStream =
    inputs.stream === "sale" ||
    inputs.exitStrategy === "sale" ||
    inputs.businessModel === "DEV_FOR_SALE";

  console.debug("🔍 [DEBUG ENGINE CORE] Starting runFinancingEngineCore:", {
    isCommercial: inputs.financingModel === "commercial",
    jurisdiction: inputs.jurisdiction,
    constructionPeriod: inputs.constructionPeriodMonths,
    saleHorizon: isSaleStream ? resolveSaleHorizonLastMonth(inputs) : "N/A",
    totalMonths: isSaleStream ? resolveSaleHorizonLastMonth(inputs) + 1 : "N/A",
  });

  /** Last month index (e.g. CP=42, MY residential sale → M66). */
  const lastMonthIndex = isSaleStream
    ? resolveSaleHorizonLastMonth(inputs)
    : isCommercial
      ? cp + 6
      : cp +
        (inputs.jurisdiction === "MALAYSIA"
          ? 24
          : inputs.jurisdiction === "UAE_SA"
            ? 12
            : 12);
  const saleHorizon = lastMonthIndex;
  const totalMonths = saleHorizon + 1;

  // Topping-out shifts a copy of C2 in any jurisdiction. The 100% land-equity
  // lock and land-loan suspension stay on the China copy only.
  const shiftedSales = closedLoop ? closedLoopToppingOutSales(inputs, cp) : null;
  if (shiftedSales || closedLoopChina) {
    const land = Number(inputs.landCost) || 0;
    const userPct = inputs.landEquityPercent ?? 100;
    /** Same 70% land-equity haircut the C4 wizard uses when land equity is 100%. */
    const landEquityHaircut = 0.7;
    inputs = {
      ...inputs,
      monthlyCosts: { ...inputs.monthlyCosts },
      monthlySalesInflows: shiftedSales ?? inputs.monthlySalesInflows,
      ...(closedLoopChina
        ? {
            landEquityPercent: 100,
            landEquityValue: land,
            landLoanAmount: 0,
            landLoanEnabled: false,
            cashEquityRequired:
              userPct >= 100
                ? inputs.cashEquityRequired
                : Math.max(
                    0,
                    (Number(inputs.cashEquityRequired) || 0) - land * landEquityHaircut
                  ),
          }
        : {}),
    };
  }

  // Abu Dhabi completion-account overlay: land is 100% equity while this rule is
  // selected. The caller's stored land split is not mutated. No loan-to-cost cap.
  if (guaranteeAbuDhabi) {
    const land = Number(inputs.landCost) || 0;
    const userPct = inputs.landEquityPercent ?? 100;
    const landEquityHaircut = 0.7;
    inputs = {
      ...inputs,
      monthlyCosts: { ...inputs.monthlyCosts },
      landEquityPercent: 100,
      landEquityValue: land,
      landLoanAmount: 0,
      landLoanEnabled: false,
      cashEquityRequired:
        userPct >= 100
          ? inputs.cashEquityRequired
          : Math.max(
              0,
              (Number(inputs.cashEquityRequired) || 0) - land * landEquityHaircut
            ),
    };
  }

  // Ensure all input arrays cover the full timeline to prevent undefined fallbacks.
  const padArray = (arr: number[], targetLength: number) => {
    const padded = [...arr];
    while (padded.length < targetLength) padded.push(0);
    return padded;
  };

  inputs.monthlyCosts.construction = padArray(inputs.monthlyCosts.construction, totalMonths);
  inputs.monthlyCosts.soft = padArray(inputs.monthlyCosts.soft, totalMonths);
  inputs.monthlyCosts.powc = padArray(inputs.monthlyCosts.powc, totalMonths);
  inputs.monthlyCosts.ffe = padArray(inputs.monthlyCosts.ffe || [], totalMonths);
  inputs.monthlySalesInflows = padArray(inputs.monthlySalesInflows, totalMonths);

  if (process.env.NODE_ENV === "development") {
    const powcArr = inputs.monthlyCosts.powc;
    // eslint-disable-next-line no-console
    console.debug("🧱 [POWC Raw Array Check]:", {
      totalMonths,
      length: powcArr.length,
      M0: powcArr[0],
      M1: powcArr[1],
      M2: powcArr[2],
      M3: powcArr[3],
      Last: powcArr[powcArr.length - 1],
    });
  }

  const monthlyData: MonthlyRow[] = [];

  // --- STATE INITIALIZATION ---
  const state = {
    // Balances
    escrowBalance: 0,
    trustAccountBalance: 0,
    landLoanBalance: 0,
    rcfBalance: 0, // Cumulative Drawn
    cumuLockedSales: 0,
    cumulativeCapital: 0,
    
    // Equity Tracking
    initialCashEquity: 0, // Calculated based on TDC - Debt - Land/Pref
    remainingCashEquity: 0,
    backstopEquityInjected: 0,
    /** M0 Step 3 land + cash; increased only by post-M0 backstop when facility is fully drawn. */
    cumulativeEquity: 0,

    // Fee Logic
    lastFeeCalcMonth: -12,
    feeAvgBalanceSum: 0,
    feeAvgBalanceCount: 0,
    
    // Retention Logic
    retentionAmount: 0, // 5% of GDV (Estimated as Total Sales)
    
    // IRR Tracking
    equityCashFlows: [] as number[],

    // UAE/KSA certification & progress withdrawal (interval-based)
    costsSinceLastCert: 0,
    pendingWithdrawal: 0,

    /** Remaining Component 4 equity pool (land + cash) before RCF may draw. */
    availableEquity: 0,

    /** Outstanding preference share principal (for equity distribution trigger). */
    prefSharesBalance: inputs.prefSharesEnabled
      ? inputs.prefSharesAmount || 0
      : 0,
    /** Last month a pref dividend/accrual was paid or settled. */
    lastPrefDividendMonth: 0,

    /** Malaysia HDA: milestone IDs already triggered (no carry-forward of unpaid amounts). */
    malaysiaPaidMilestones: [] as string[],
    /** Malaysia HDA: cumulative actual sales deposited into escrow. */
    totalActualSalesCollected: 0,
    /** Malaysia: % of construction costs lodged in escrow at M0 (locked until VP+24). */
    hdaDepositAmount: 0,
    hdaDepositReleased: false,
    /** True once any RCF principal has been drawn (gap-fill). */
    rcfEverDrawn: false,

    /** Project guarantee account: buyer inflows lodged to date, and unpaid reimbursement. */
    guaranteeCumulativeInflows: 0,
    guaranteeReimbursementCarry: 0,

    /** Australia: cumulative sales during construction (balance paid at settlement). */
    auConstructionSalesCumulative: 0,
    /** Australia: balance on construction-phase sales already paid to developer. */
    auConstructionBalancePaid: false,

    /** Land term loan fully repaid — construction RCF may repay only after this. */
    landLoanPaid: true,

    /** IRR equity distributions already paid — do not reset displayed cumulative NCF. */
    equityDistributedToDate: 0,
  };

  state.availableEquity =
    (Number(inputs.landEquityValue) || 0) + (Number(inputs.cashEquityRequired) || 0);

  // Pre-calculations
  let totalSales = 0;
  for (let mi = 0; mi < totalMonths; mi++) {
    const v =
      mi < inputs.monthlySalesInflows.length ? inputs.monthlySalesInflows[mi] : 0;
    totalSales += Number(v) || 0;
  }
  const totalConstructionCosts = inputs.monthlyCosts.construction.reduce((a, b) => a + b, 0);
  const totalSoftCosts = inputs.monthlyCosts.soft.reduce((a, b) => a + b, 0);
  const totalFfe = (inputs.monthlyCosts.ffe || []).reduce(
    (a, b) => a + (Number(b) || 0),
    0
  );
  const totalTdcExclLand =
    totalConstructionCosts +
    totalSoftCosts +
    inputs.monthlyCosts.powc.reduce((a, b) => a + (Number(b) || 0), 0) +
    totalFfe;
  const totalTdc = totalTdcExclLand + inputs.landCost;
  
  // Estimate GDV for Retention (Total Sales Proceeds)
  const retentionPctPoints = inputs.retentionPercent ?? 5;
  state.retentionAmount = totalSales * (retentionPctPoints / 100);

  const constructionCostTotal =
    inputs.totalConstructionCosts > 0
      ? inputs.totalConstructionCosts
      : totalConstructionCosts;

  if (hdaDepositApplies(inputs, selectedRule)) {
    const hdaPctPoints = inputs.hdaDepositPct ?? 3;
    const hdaPctDecimal = hdaPctPoints > 1 ? hdaPctPoints / 100 : hdaPctPoints;
    state.hdaDepositAmount = constructionCostTotal * hdaPctDecimal;
  }

  const closedLoopCompletionMonth = closedLoop
    ? resolveActualConstructionEndMonth(
        { constructionPeriod: inputs.constructionPeriodMonths },
        inputs.monthlyCosts.construction
      )
    : cp;

  const contractorRetentionRate = CLOSED_LOOP_CONTRACTOR_RETENTION_PCT / 100;
  let contractorRetentionTotal = 0;
  if (closedLoop) {
    const series = inputs.monthlyCosts.construction;
    for (let i = 0; i <= closedLoopCompletionMonth; i++) {
      contractorRetentionTotal += (Number(series[i]) || 0) * contractorRetentionRate;
    }
  }
  const closedLoopLoanCap = closedLoopChina
    ? totalTdc * CLOSED_LOOP_CHINA_MAX_LOAN_OF_TDC
    : Number.POSITIVE_INFINITY;

  const guaranteeThreshold = clampGuaranteePercent(
    inputs.guaranteeThresholdPercent,
    GUARANTEE_DEFAULT_THRESHOLD_PCT
  );
  let guaranteeMilestone = clampGuaranteePercent(
    inputs.guaranteeProfitMilestonePercent,
    GUARANTEE_DEFAULT_PROFIT_MILESTONE_PCT
  );
  if (guaranteeMilestone <= guaranteeThreshold) {
    guaranteeMilestone = Math.min(99, guaranteeThreshold + 0.01);
  }
  if (guaranteeMilestone >= 100) guaranteeMilestone = 99;
  const guaranteeRetentionRate =
    clampGuaranteePercent(
      inputs.guaranteeRetentionPercent,
      GUARANTEE_DEFAULT_RETENTION_PCT
    ) / 100;
  const guaranteeRetentionMonths = resolveGuaranteeRetentionMonths(
    inputs.guaranteeRetentionMonths
  );
  const guaranteeInterestPermitted = inputs.guaranteeInterestPermitted !== false;
  const guaranteeOtherFeesShare = Math.min(
    1,
    Math.max(0, Number(inputs.guaranteeSoftOtherFeesShare ?? 0.1) || 0)
  );
  const guaranteeCompletionMonth = guaranteeRule
    ? resolveActualConstructionEndMonth(
        { constructionPeriod: inputs.constructionPeriodMonths },
        inputs.monthlyCosts.construction
      )
    : cp;
  const guaranteeProgress = cumulativeCostProgressPct(
    inputs.monthlyCosts.construction,
    guaranteeCompletionMonth
  );
  const guaranteeCalendar = {
    thresholdMonth: findFirstMonthAtCumulativeProgress(
      guaranteeProgress,
      guaranteeThreshold
    ),
    stage1Month: findFirstMonthAtCumulativeProgress(
      guaranteeProgress,
      guaranteeMilestone
    ),
    stage2Month: guaranteeCompletionMonth,
    stage3Month: guaranteeCompletionMonth + guaranteeRetentionMonths,
    completionMonth: guaranteeCompletionMonth,
    retentionRate: guaranteeRetentionRate,
    retentionBasis: resolveGuaranteeRetentionBasis(inputs.guaranteeRetentionBasis, {
      country: inputs.country,
      countryCode: inputs.countryCode,
      city: inputs.city,
    }),
    constructionCostTotal: (() => {
      const fromSeries = inputs.monthlyCosts.construction.reduce(
        (sum, value) => sum + Math.max(0, Number(value) || 0),
        0
      );
      if (fromSeries > 1e-9) return fromSeries;
      return Math.max(0, Number(inputs.totalConstructionCosts) || 0);
    })(),
    interestPermitted: guaranteeInterestPermitted,
  };
  const guaranteePermittedCost = guaranteeRule
    ? inputs.monthlyCosts.construction.map((cc, idx) => {
        const soft = Number(inputs.monthlyCosts.soft[idx]) || 0;
        const powc = Number(inputs.monthlyCosts.powc[idx]) || 0;
        const ffe = Number(inputs.monthlyCosts.ffe?.[idx]) || 0;
        return (
          (Number(cc) || 0) +
          powc +
          soft * (1 - guaranteeOtherFeesShare) +
          ffe
        );
      })
    : [];

  // --- MONTHLY LOOP ---
  for (let m = 0; m <= saleHorizon; m++) {
    const isConstructionPhase = m <= inputs.constructionPeriodMonths;
    const isMilestone = inputs.milestoneMonths.includes(m);
    const progressPct = inputs.sCurveMonthly[Math.min(m, inputs.sCurveMonthly.length - 1)] || 0;
    const phase = inputs.phases[Math.min(m, inputs.phases.length - 1)];
    
    // --- ROW DATA INIT ---
    const row: MonthlyRow = {
      month: m, phase, progressPct, isMilestone,
      salesProceeds: 0, escrowBalance: 0, escrowInterest: 0, escrowAccountFees: 0, progressWithdrawal: 0, escrowReleases: 0, retentionRelease: 0,
      permittedCostReimbursement: 0, lenderCashSweep: 0, developerProfitWithdrawal: 0, defectRetentionRelease: 0,
      lockedInSales: 0, cumuLockedInSales: 0, cumuTrustAccount: 0, depositToTrust: 0, balancePayment: 0, trustAccountInterest: 0, trustAccountFees: 0, trustAccountReleases: 0, actualSalesProceeds: 0,
      constructionCosts: 0, softCosts: 0, powc: 0, ffe: 0, totalOutflowsExclLand: 0, landCost: 0, hda3Deposit: 0, totalOutflowsInclLand: 0, ncf: 0,
      landLoanDrawdown: 0, landLoanInterest: 0, landLoanRepayment: 0, landLoanFees: 0,
      constLoanDrawdown: 0, constLoanCumulative: state.rcfBalance, constLoanInterest: 0, constLoanRepayment: 0, constLoanCommitmentFee: 0, cumulativeDrawdown: 0,
      prefDrawdown: 0, prefDividend: 0, prefRepayment: 0,
      capitalHdaDeposit: 0, capitalLand: 0, capitalCash: 0, cumulativeCapital: state.cumulativeCapital,
      ncfAfterFinancing: 0, cumulativeNcf: 0,
      irrCashFlow: 0, equityCashFlow: 0, irrDiscountRate: 0, irrNpv: 0
    };

    // --- UNIVERSAL DATA LINKING (APPLIES TO ALL JURISDICTIONS) ---
    // DIRECT PASS-THROUGH from Components 2 & 3. NO S-Curve redistribution.
    const cc =
      m < inputs.monthlyCosts.construction.length
        ? Number(inputs.monthlyCosts.construction[m]) || 0
        : 0;
    const sc =
      m < inputs.monthlyCosts.soft.length ? Number(inputs.monthlyCosts.soft[m]) || 0 : 0;
    const powc =
      m < inputs.monthlyCosts.powc.length ? inputs.monthlyCosts.powc[m] ?? 0 : 0;
    const ffe =
      m < (inputs.monthlyCosts.ffe?.length ?? 0)
        ? Number(inputs.monthlyCosts.ffe?.[m]) || 0
        : 0;
    const sales =
      m < inputs.monthlySalesInflows.length
        ? Number(inputs.monthlySalesInflows[m]) || 0
        : 0;

    row.constructionCosts = cc;
    row.softCosts = sc;
    row.powc = powc;
    row.ffe = ffe;
    row.salesProceeds = sales;
    // Closed-loop: hold 3% of building works through the actual construction end;
    // pay the accumulated retention once, at completion + 24.
    // Not an escrow movement — switching rules skips this block and restores the gross S-curve.
    if (closedLoop && m <= closedLoopCompletionMonth) {
      row.constructionCosts = cc * (1 - contractorRetentionRate);
    }
    if (closedLoop && m === closedLoopCompletionMonth + 24) {
      row.constructionCosts += contractorRetentionTotal;
    }
    // --- Cash outflows (construction / soft / POWC / FFE); land at M0 only, positive = outflow ---
    row.totalOutflowsExclLand = row.constructionCosts + sc + powc + ffe;
    row.landCost = m === 0 ? Number(inputs.landCost) || 0 : 0;
    row.totalOutflowsInclLand = row.totalOutflowsExclLand + row.landCost;

    const salesThisMonth = Number(row.salesProceeds) || 0;
    row.salesProceeds = salesThisMonth;

    const useAustraliaTrust = selectedRule === "ten_ninety";
    const applyEscrowRules = selectedRule !== "none";

    if (!applyEscrowRules) {
      row.ncf = salesThisMonth - row.totalOutflowsInclLand;
    }

    // Interest Calculation (1-Month Offset: Interest on M-1 balance) — escrow/trust rules only
    let interestEarned = 0;
    if (applyEscrowRules && m > 0) {
      if (useAustraliaTrust) {
        interestEarned = state.trustAccountBalance * (inputs.trustAccountDepositRatePct / 12);
      } else {
        interestEarned = state.escrowBalance * (inputs.escrowDepositRatePct / 12);
      }
    }

    // Fee Calculation (1-Month Offset: Avg of prev 12 months)
    let feePayable = 0;
    if (applyEscrowRules && m === 0) {
      feePayable = inputs.escrowSetupFee;
    } else if (applyEscrowRules && m >= 12 && (m - 1) % 12 === 0) {
      // Annual fee calculation
      const avgBal = state.feeAvgBalanceSum / 12;
      const feeRate = useAustraliaTrust
        ? inputs.trustAccountFeePct
        : inputs.escrowManagementFeePct;
      // User said: "Average(M0 to M12) x % Management fee payable at M13"
      // Usually management fee is annual % applied to balance.
      // Let's assume the rate provided is Annual %.
      feePayable = avgBal * feeRate;

      state.feeAvgBalanceSum = 0;
      state.feeAvgBalanceCount = 0;
    }

    // Update Fee Averages (residential escrow/trust only)
    if (applyEscrowRules) {
      const balanceForAvg = useAustraliaTrust
        ? state.trustAccountBalance
        : state.escrowBalance;
      state.feeAvgBalanceSum += balanceForAvg;
      state.feeAvgBalanceCount++;
    }

    // --- ESCROW / TRUST ROUTER (Strategy Pattern) — selected rule, every asset class ---
    console.debug(`🔍 [DEBUG ENGINE ROUTER] Month ${m}:`, {
      selectedRule,
      jurisdiction: inputs.jurisdiction,
      financingModel: inputs.financingModel,
    });

    if (selectedRule === "none") {
      applyNonEscrowLogic(row, state, inputs, salesThisMonth);
    } else if (selectedRule === "staged") {
      applyUaeKsaEscrowLogic(
        row,
        state,
        inputs,
        m,
        salesThisMonth,
        totalSales,
        interestEarned,
        feePayable
      );
    } else if (selectedRule === "progress") {
      applyMalaysiaHdaLogic(
        row,
        state,
        inputs,
        m,
        salesThisMonth,
        interestEarned,
        feePayable,
        totalSales
      );
    } else if (selectedRule === "ten_ninety") {
      applyAustralia1090Logic(
        row,
        state,
        inputs,
        m,
        salesThisMonth,
        interestEarned,
        feePayable,
        totalSales
      );
    } else if (selectedRule === "closed_loop_escrow") {
      applyClosedLoopEscrowLogic(
        row,
        state,
        inputs,
        m,
        salesThisMonth,
        interestEarned,
        feePayable,
        closedLoopCompletionMonth
      );
    } else if (selectedRule === "project_guarantee_account") {
      applyProjectGuaranteeAccountLogic(
        row,
        state,
        inputs,
        m,
        salesThisMonth,
        monthlyData,
        guaranteePermittedCost,
        guaranteeCalendar
      );
    } else {
      applyNonEscrowLogic(row, state, inputs, salesThisMonth);
    }

    // --- NET CASH FLOW ---
    if (applyEscrowRules) {
      // Escrow/trust: cash = funds actually received (escrowed sales do not count until released).
      let availableInflows = 0;
      if (useAustraliaTrust) {
        // ASP already = balance payment + trust release (do not add releases again).
        availableInflows = row.actualSalesProceeds;
      } else if (selectedRule === "project_guarantee_account") {
        availableInflows =
          row.permittedCostReimbursement +
          row.developerProfitWithdrawal +
          row.defectRetentionRelease +
          row.lenderCashSweep;
      } else {
        availableInflows = row.progressWithdrawal + row.escrowReleases;
      }
      row.ncf = availableInflows - row.totalOutflowsInclLand;
    }

    // --- EQUITY INJECTION (M0): full land cost + cash gap-fill; HDA deposit separate ---
    if (m === 0) {
      row.capitalLand = inputs.landEquityValue || 0;
      const prefAmount =
        inputs.prefSharesEnabled ? Math.max(0, inputs.prefSharesAmount || 0) : 0;
      const requiredCash = inputs.cashEquityRequired || 0;
      row.capitalCash = Math.max(0, requiredCash - prefAmount);
      row.capitalHdaDeposit = hdaDepositApplies(inputs, selectedRule)
        ? state.hdaDepositAmount
        : 0;
      state.cumulativeEquity = row.capitalLand + row.capitalCash;
      row.prefDrawdown = inputs.prefSharesEnabled ? Math.max(0, inputs.prefSharesAmount) : 0;
      state.prefSharesBalance = row.prefDrawdown;
      // --- LAND LOAN DRAWDOWN (M0) — all rules; not assumed 100% land equity ---
      {
        const landCostM0 = Number(inputs.landCost) || 0;
        const landEquityPct = (inputs.landEquityPercent ?? 100) / 100;
        const principal =
          inputs.landLoanAmount > 0
            ? inputs.landLoanAmount
            : Math.max(0, landCostM0 * (1 - landEquityPct));
        const enableLandLoan = principal > 1e-6 && landEquityPct < 1;

        if (enableLandLoan) {
          row.landLoanDrawdown = principal;
          state.landLoanBalance = principal;
          state.landLoanPaid = false;
          row.landLoanInterest = 0;
          row.landLoanFees =
            principal *
            (inputs.landLoanArrangementFeePct + inputs.landLoanValuationFeePct);
        }
      }
    } else {
      row.capitalLand = 0;
      row.capitalHdaDeposit = 0;
      // `capitalCash` stays 0 until pref dividend funding and/or backstop (see below)
    }

    // --- 4. LOAN & FINANCING (interest / repayments first; RCF draw from cumulative gap below)
    let landLoanInterest = 0;
    let landLoanRepayment = 0;

    // A. Interest & Fees (1-Month Offset: interest at M_t on balance at end of M_{t-1})
    const landLoanTenorMonths =
      inputs.landLoanTenorMonths && inputs.landLoanTenorMonths > 0
        ? inputs.landLoanTenorMonths
        : inputs.constructionPeriodMonths + 6;
    const landLoanMaturityMonth = landLoanTenorMonths;

    if (m > 0) {
      // --- LAND LOAN MONTHLY LOGIC (interest + bullet at Step 3 tenor = CP+6) ---
      if (state.landLoanBalance > 0) {
        const monthlyInterest = state.landLoanBalance * (inputs.landLoanRatePct / 12);
        const interestTreatment =
          inputs.landLoanInterestTreatment ?? "capitalize";

        if (interestTreatment === "capitalize") {
          state.landLoanBalance += monthlyInterest;
          row.landLoanInterest = 0;
        } else {
          const paymentInterval =
            interestTreatment === "paid-current-quarterly" ? 3 : 6;
          if (m % paymentInterval === 0) {
            landLoanInterest = monthlyInterest * paymentInterval;
            row.landLoanInterest = -landLoanInterest;
          } else {
            row.landLoanInterest = 0;
          }
        }

        if (m === landLoanMaturityMonth) {
          landLoanRepayment = state.landLoanBalance;
          row.landLoanRepayment = -landLoanRepayment;
          state.landLoanBalance = 0;
          state.landLoanPaid = true;
        }
      }

      // RCF Interest
      if (state.rcfBalance > 0) {
        const rcfInterest = state.rcfBalance * (inputs.interestRatePct / 12);
        row.constLoanInterest = -rcfInterest;
        if (inputs.idcTreatment === 'capitalize') {
           // Increase RCF balance? Usually IDC is capitalized into the loan.
           // We'll track it separately or add to balance.
           // For simplicity, we just record the cash flow.
           // If capitalized, it doesn't hit NCF as a cash outflow, it increases debt.
           // If paid current, it hits NCF.
           // User said "IDC on land loan: Capitalize".
           // We'll assume RCF IDC is also capitalized if chosen.
           // state.rcfBalance += rcfInterest; 
           // But for NCF calculation, we treat it as 0 outflow if capitalized.
           row.constLoanInterest = 0; 
        }
      }
      
      // --- Preference shares: semi-annual dividend (M6, M12, …); funded by matching capital cash injection ---
      if (
        inputs.prefSharesEnabled &&
        state.prefSharesBalance > 0 &&
        inputs.prefSharesAmount > 0
      ) {
        const annualDividend =
          inputs.prefSharesAmount * inputs.prefSharesReturnPct;
        const semiAnnualDividend = annualDividend / 2;
        const isDividendMonth = m > 0 && m % 6 === 0;
        if (isDividendMonth && m !== state.lastPrefDividendMonth) {
          row.prefDividend = -semiAnnualDividend;
          row.capitalCash += semiAnnualDividend;
          state.cumulativeEquity += semiAnnualDividend;
          // Investor funds the dividend top-up — record as equity outflow for IRR
          row.irrCashFlow -= semiAnnualDividend;
          state.lastPrefDividendMonth = m;
        }
      }
    }
    
    const previousCumNcf =
      m > 0 ? Number(monthlyData[m - 1]?.cumulativeNcf) || 0 : 0;
    const operatingNcf = row.ncf;
    const arrangementFeeM0 = m === 0 ? -inputs.approvedCreditFacility * 0.001 : 0;

    // --- COMMITMENT FEE (construction period only; facility expires after CP) ---
    const totalFacility = inputs.approvedCreditFacility || 0;
    let monthlyCommitmentFee = 0;
    if (isConstructionPhase && totalFacility > 0) {
      if (state.rcfBalance >= totalFacility) {
        monthlyCommitmentFee = 0;
      } else {
        const currentUndrawn = Math.max(0, totalFacility - state.rcfBalance);
        if (currentUndrawn > 0) {
          monthlyCommitmentFee = -(currentUndrawn * (inputs.commitmentFeePct / 100 / 12));
        }
      }
    }
    row.constLoanCommitmentFee =
      m === 0 ? arrangementFeeM0 : monthlyCommitmentFee;

    // --- Period NCF before gap-fill RCF draw (excludes HDA deposit → escrow) ---
    if (selectedRule === "project_guarantee_account" && row.lenderCashSweep > 0) {
      row.constLoanRepayment = -row.lenderCashSweep;
    }

    const loanFlowsExDraw =
      row.constLoanInterest +
      row.constLoanRepayment +
      row.constLoanCommitmentFee +
      row.landLoanDrawdown +
      row.landLoanInterest +
      row.landLoanRepayment;
    const prefFlows = row.prefDrawdown + row.prefDividend + row.prefRepayment;
    const equityFlows = row.capitalLand + row.capitalCash;
    const periodNcfBeforeDraw =
      operatingNcf + loanFlowsExDraw + prefFlows + equityFlows;

    const projectedBalance = previousCumNcf + periodNcfBeforeDraw;

    row.constLoanDrawdown = 0;
    let equityGapFill = 0;

    // --- LOAN DRAWDOWN (construction period only) ---
    if (isConstructionPhase) {
      if (useAustraliaTrust) {
        // --- 10/90 GAP FILL WITH 70% LTV CAP & EQUITY SWITCH ---
        if (projectedBalance < -1e-6) {
          const deficitAmount = -projectedBalance;
          const maxLoanCumulative = state.cumuLockedSales * 0.7;
          const currentLoanBalance = state.rcfBalance;
          const maxNewDrawdown = Math.max(0, maxLoanCumulative - currentLoanBalance);
          const facilityLimit = Math.max(
            0,
            inputs.approvedCreditFacility - currentLoanBalance
          );
          const loanLimit = Math.min(maxNewDrawdown, facilityLimit);
          const loanDrawdown = Math.min(deficitAmount, loanLimit);

          row.constLoanDrawdown = loanDrawdown;
          if (loanDrawdown > 0) {
            state.rcfBalance += loanDrawdown;
            state.rcfEverDrawn = true;
          }

          const remainingDeficit = deficitAmount - loanDrawdown;
          if (remainingDeficit > 0) {
            equityGapFill = remainingDeficit;
            row.capitalCash += equityGapFill;
            state.backstopEquityInjected += equityGapFill;
            state.cumulativeEquity += equityGapFill;
            if (m > 0) {
              row.irrCashFlow -= equityGapFill;
            }
          }
        }
      } else if (projectedBalance < -1e-6) {
        const fundingGap = -projectedBalance;
        let room = Math.max(0, inputs.approvedCreditFacility - state.rcfBalance);

        if (selectedRule === "staged") {
          const cumuCosts =
            inputs.monthlyCosts.construction.slice(0, m + 1).reduce((a, b) => a + b, 0) +
            inputs.monthlyCosts.soft.slice(0, m + 1).reduce((a, b) => a + b, 0) +
            inputs.monthlyCosts.powc.slice(0, m + 1).reduce((a, b) => a + b, 0) +
            (inputs.monthlyCosts.ffe || [])
              .slice(0, m + 1)
              .reduce((a, b) => a + (Number(b) || 0), 0);
          const maxLoanAllowed = cumuCosts * 0.7;
          room = Math.min(room, Math.max(0, maxLoanAllowed - state.rcfBalance));
        }

        if (closedLoopChina) {
          room = Math.min(
            room,
            Math.max(0, closedLoopLoanCap - state.rcfBalance)
          );
        }

        const drawdown = Math.min(fundingGap, room);
        if (drawdown > 0) {
          row.constLoanDrawdown = drawdown;
          state.rcfBalance += drawdown;
          state.rcfEverDrawn = true;
        }
      }
    }

    row.ncfAfterFinancing =
      periodNcfBeforeDraw + row.constLoanDrawdown + equityGapFill;
    row.cumulativeNcf = previousCumNcf + row.ncfAfterFinancing;

    // Sweep is a prepayment booked in period NCF above. Apply it to the balance
    // after this month's draw so the draw does not refill the swept principal,
    // and so this month's interest (already calculated) stays on the pre-sweep balance.
    if (selectedRule === "project_guarantee_account" && row.lenderCashSweep > 0) {
      state.rcfBalance = Math.max(0, state.rcfBalance - row.lenderCashSweep);
    }

    // --- RCF repayment: after land loan cleared; from CP+1; capped so cumulative NCF stays >= 0 ---
    const repaymentStartMonth = inputs.constructionPeriodMonths + 1;
    if (
      m >= repaymentStartMonth &&
      state.landLoanPaid &&
      state.rcfBalance > 0
    ) {
      const availableSurplus = Math.max(0, row.cumulativeNcf);
      const repaymentAmount = Math.min(state.rcfBalance, availableSurplus);
      if (repaymentAmount > 0) {
        row.constLoanRepayment = (row.constLoanRepayment || 0) - repaymentAmount;
        state.rcfBalance -= repaymentAmount;
        row.ncfAfterFinancing -= repaymentAmount;
        row.cumulativeNcf -= repaymentAmount;
      }
    }

    // --- PREFERENCE SHARES PRINCIPAL REPAYMENT (after construction RCF fully repaid) ---
    if (inputs.prefSharesEnabled && state.prefSharesBalance > 0 && m > 0) {
      const isConstructionLoanPaid =
        state.rcfBalance <= 0.01 &&
        (state.rcfEverDrawn || m > inputs.constructionPeriodMonths);

      if (isConstructionLoanPaid) {
        const monthsSinceLastDividend = Math.max(0, m - state.lastPrefDividendMonth);
        const monthlyDividend =
          (inputs.prefSharesAmount * inputs.prefSharesReturnPct) / 12;
        const accruedDividend = monthsSinceLastDividend * monthlyDividend;

        const principalRepayment = state.prefSharesBalance;
        const totalPrefDue = principalRepayment + accruedDividend;

        if (row.cumulativeNcf >= totalPrefDue) {
          row.prefRepayment = -principalRepayment;
          if (accruedDividend > 0) {
            row.prefDividend = (row.prefDividend || 0) - accruedDividend;
          }

          state.prefSharesBalance = 0;
          state.lastPrefDividendMonth = m;

          row.ncfAfterFinancing -= totalPrefDue;
          row.cumulativeNcf -= totalPrefDue;
        }
      }
    }

    // Single source of truth: running sum of monthly NCF after loan & equity (never reset
    // by equity distributions). Gap-fill any remaining shortfall once RCF cannot draw —
    // including the land-loan bullet month.
    row.ncfAfterFinancing = Number.isFinite(row.ncfAfterFinancing)
      ? row.ncfAfterFinancing
      : 0;
    row.cumulativeNcf = previousCumNcf + row.ncfAfterFinancing;
    if (!Number.isFinite(row.cumulativeNcf)) row.cumulativeNcf = 0;
    if (row.cumulativeNcf < -1e-6 && m > 0) {
      const facilityHeadroom = Math.max(
        0,
        (inputs.approvedCreditFacility || 0) - state.rcfBalance
      );
      const loanCapRoom = closedLoopChina
        ? Math.max(0, closedLoopLoanCap - state.rcfBalance)
        : facilityHeadroom;
      const rcfCanStillDraw =
        isConstructionPhase && Math.min(facilityHeadroom, loanCapRoom) > 1e-6;
      const australiaConstructionHandled = useAustraliaTrust && isConstructionPhase;
      if (!australiaConstructionHandled && !rcfCanStillDraw) {
        const plug = -row.cumulativeNcf;
        row.capitalCash += plug;
        state.backstopEquityInjected += plug;
        state.cumulativeEquity += plug;
        row.ncfAfterFinancing += plug;
        row.cumulativeNcf = 0;
        row.irrCashFlow -= plug;
      }
    }

    // Update Cumulative Capital (M0 Step 3 + any post-M0 backstop `capitalCash`)
    state.cumulativeCapital += row.capitalLand + row.capitalHdaDeposit + row.capitalCash;
    row.cumulativeCapital = state.cumulativeCapital;

    row.constLoanCumulative = state.rcfBalance;
    row.cumulativeDrawdown = state.rcfBalance;

    // --- EQUITY DISTRIBUTION / IRR LOGIC ---
    // Do not drain / zero displayed cumulative NCF. Do not distribute while the land
    // term loan is still outstanding (bullet is part of NCF before any residual sweep).
    if (m === 0) {
      row.irrCashFlow = -(row.capitalLand + row.capitalHdaDeposit + row.capitalCash);
    } else {
      const pastConstruction = m > inputs.constructionPeriodMonths;
      const isRcfPaid = !state.rcfEverDrawn || state.rcfBalance <= 0.01;
      const isPrefPaid = state.prefSharesBalance <= 0.01;
      const canWithdrawEquity =
        pastConstruction && isRcfPaid && isPrefPaid && state.landLoanPaid;

      const distributable = canWithdrawEquity
        ? Math.max(0, row.cumulativeNcf - (state.equityDistributedToDate || 0))
        : 0;

      if (distributable > 0) {
        row.irrCashFlow += distributable;
        state.equityDistributedToDate += distributable;
      }
    }

    const equityInjection =
      (row.capitalLand ?? 0) +
      (row.capitalHdaDeposit ?? 0) +
      (row.capitalCash ?? 0);
    const equityDistributionAmount = Math.max(0, row.irrCashFlow);
    row.equityCashFlow = row.irrCashFlow;
    state.equityCashFlows.push(row.equityCashFlow);

    if (process.env.NODE_ENV === "development" && (m <= 12 || m % 12 === 0)) {
      // eslint-disable-next-line no-console
      console.debug(`📊 M${m} Equity CF:`, {
        injection: equityInjection,
        distribution: equityDistributionAmount,
        net: row.equityCashFlow,
      });
    }

    monthlyData.push(row);
  }

  // --- POST-PROCESS: IRR SOLVER ---
  solveIrrAndNpv(monthlyData);

  if (closedLoop) {
    assertClosedLoopEscrowLedger(
      monthlyData,
      closedLoopCompletionMonth,
      totalMonths
    );
  }
  if (guaranteeRule) {
    assertProjectGuaranteeLedger(
      monthlyData,
      guaranteeCalendar.stage3Month,
      totalMonths
    );
  }

  return monthlyData;
}

function solveIrrAndNpv(data: MonthlyRow[]) {
  const flows = data.map(r => r.irrCashFlow);
  let rate = 0.15; // Initial guess 15%
  
  // Newton-Raphson
  for (let i = 0; i < 50; i++) {
    let npv = 0;
    let dNpv = 0;
    for (let t = 0; t < flows.length; t++) {
      // Time in years: t/12
      const disc = Math.pow(1 + rate, t / 12);
      npv += flows[t] / disc;
      dNpv -= (t / 12) * flows[t] / Math.pow(1 + rate, t / 12 + 1);
    }
    
    if (Math.abs(npv) < 100) break; // Tolerance
    if (dNpv === 0) break;
    rate -= npv / dNpv;
  }
  
  // Apply Discount Rates
  let cumNpv = 0;
  data.forEach((row, t) => {
    row.irrDiscountRate = 1 / Math.pow(1 + rate, (t * 30) / 360); // 30/360 convention
    const periodNpv = row.irrCashFlow * row.irrDiscountRate;
    cumNpv += periodNpv;
    row.irrNpv = periodNpv;
  });
  
  // Adjust last NPV to force zero
  if (data.length > 0) {
    data[data.length - 1].irrNpv -= cumNpv;
  }
}
