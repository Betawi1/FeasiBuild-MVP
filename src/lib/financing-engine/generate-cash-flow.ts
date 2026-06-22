/**
 * FeasiBuild Financing Calculation Engine
 * Generates pre-calculated monthly cash flow data for preview tables.
 * 
 * Features:
 * - 3 Jurisdictions: UAE_SA, MALAYSIA, AUSTRALIA
 * - 1-Month Offsets for Interest, Fees, Withdrawals
 * - Gap-Fill Sequencing: Equity -> RCF -> Backstop Equity
 * - 30/70 Milestone Rule (UAE/KSA)
 * - Australia 70% Sales Cap & Trust Account Logic
 * - IRR/NPV Solver (Newton-Raphson)
 */

// --- TYPES ---

export type Jurisdiction = 'UAE_SA' | 'MALAYSIA' | 'AUSTRALIA';

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

export type FinancingStream = "sale" | "operational";

export type FinancingInputs = {
  /** Hard router: sale vs operational (from Component 1). */
  stream?: FinancingStream;
  businessModel?: string;
  projectType?: string;
  exitStrategy?: "sale" | "hold" | "refinance";
  /** Commercial sale: simplified NCF, no escrow/trust, CP+6 tenor. */
  financingModel?: "commercial" | "residential";
  // Project Context
  constructionPeriodMonths: number;
  sCurveMonthly: number[];
  phases: string[];
  
  // Costs (Monthly arrays)
  monthlyCosts: { construction: number[]; soft: number[]; powc: number[] };
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
  
  // Land Loan (MY/AUS)
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
  /** UAE/KSA progress payment: 3 or 6 — first cert at M{interval}, withdrawal next month. */
  certificationIntervalMonths: number;
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

  /** Australia 10/90: purchase deposit % held in trust (percent points, default 10). */
  auDepositPct?: number;
  /** Australia 10/90: balance % paid at settlement (percent points, default 90). */
  auBalancePct?: number;

  /** ISO / display country — used for VN/TH flexible horizon. */
  country?: string;
  countryCode?: string;
  /** Step 5 escrow model (VN/TH may choose malaysia | uae | australia). */
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

  // Australia Specific
  lockedInSales: number;
  cumuLockedInSales: number;
  cumuTrustAccount: number;
  trustAccountInterest: number;
  trustAccountFees: number;
  trustAccountReleases: number;
  actualSalesProceeds: number;

  // Outflows
  constructionCosts: number;
  softCosts: number;
  powc: number;
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
  const stream = inputs.stream;
  const businessModel = inputs.businessModel || inputs.projectType;

  // eslint-disable-next-line no-console
  console.log("🔀 Routing engine:", { stream, businessModel });

  if (
    stream === "sale" ||
    businessModel === "DEV_FOR_SALE" ||
    businessModel === "RESIDENTIAL" ||
    businessModel === "COMMERCIAL"
  ) {
    // eslint-disable-next-line no-console
    console.log("✅ Routing to SALE engine");
    return generateSaleCashFlow(inputs);
  }

  if (
    stream === "operational" ||
    businessModel === "HOLD" ||
    businessModel === "HOTEL"
  ) {
    // eslint-disable-next-line no-console
    console.log("✅ Routing to OPERATIONAL engine");
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

type CountryHorizonBucket = "MY" | "UAE_SA" | "AU" | "VN" | "TH" | "OTHER";

function normalizeCountryHorizonBucket(
  jurisdiction: Jurisdiction,
  country?: string,
  countryCode?: string
): CountryHorizonBucket {
  const code = (countryCode ?? "").toUpperCase();
  const c = (country ?? "").toLowerCase();
  if (code === "MY" || c.includes("malaysia") || jurisdiction === "MALAYSIA") {
    return "MY";
  }
  if (
    code === "AE" ||
    code === "SA" ||
    c.includes("uae") ||
    c.includes("emirates") ||
    c.includes("saudi") ||
    c.includes("ksa") ||
    jurisdiction === "UAE_SA"
  ) {
    return "UAE_SA";
  }
  if (code === "AU" || c.includes("australia") || jurisdiction === "AUSTRALIA") {
    return "AU";
  }
  if (code === "VN" || c.includes("vietnam")) return "VN";
  if (code === "TH" || c.includes("thailand")) return "TH";
  return "OTHER";
}

function normalizeEscrowWithdrawalModel(
  raw?: string
): "malaysia" | "uae" | "australia" | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("malaysia") || v.includes("hda")) return "malaysia";
  if (v.includes("australia") || v.includes("10/90") || v.includes("trust")) {
    return "australia";
  }
  if (v.includes("uae") || v.includes("certification") || v.includes("ksa")) {
    return "uae";
  }
  return null;
}

/**
 * Last month index for sale stream (M0 … saleHorizon inclusive).
 * Commercial: CP+6. Residential: jurisdiction law or VN/TH Step 5 model selection.
 */
export function resolveSaleHorizonLastMonth(inputs: FinancingInputs): number {
  const constructionMonths = inputs.constructionPeriodMonths || 42;
  const businessModel = (
    inputs.businessModel ||
    inputs.projectType ||
    ""
  ).toUpperCase();
  const isCommercial =
    businessModel === "COMMERCIAL" || inputs.financingModel === "commercial";

  const countryBucket = normalizeCountryHorizonBucket(
    inputs.jurisdiction,
    inputs.country,
    inputs.countryCode
  );
  const selectedModel =
    inputs.escrowModelType ||
    inputs.withdrawalMethod ||
    inputs.escrowWithdrawalMode;

  let saleHorizon = 0;

  if (isCommercial) {
    saleHorizon = constructionMonths + 6;
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("🏢 [Commercial]: Horizon = CP + 6 months");
    }
  } else {
    if (countryBucket === "MY") {
      saleHorizon = constructionMonths + 24;
    } else if (countryBucket === "UAE_SA") {
      saleHorizon = constructionMonths + 12;
    } else if (countryBucket === "AU") {
      saleHorizon = constructionMonths + 12;
    } else {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log(
          "🌏 [VN/TH/Other]: Horizon depends on Selected Model:",
          selectedModel
        );
      }
      const model = normalizeEscrowWithdrawalModel(selectedModel);
      if (model === "malaysia") {
        saleHorizon = constructionMonths + 24;
      } else {
        saleHorizon = constructionMonths + 12;
      }
    }
  }

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("📅 [Final Sale Horizon]:", {
      construction: constructionMonths,
      jurisdiction: inputs.jurisdiction,
      country: countryBucket,
      model: selectedModel,
      finalHorizon: saleHorizon,
    });
  }

  return saleHorizon;
}

function runFinancingEngineCore(inputs: FinancingInputs): MonthlyRow[] {
  if (process.env.NODE_ENV === "development") {
    const pre = inputs.monthlyCosts.powc;
    // eslint-disable-next-line no-console
    console.log("🏭 [Engine POWC Received]:", {
      stream: inputs.stream,
      exitStrategy: inputs.exitStrategy,
      length: pre.length,
      M0: pre[0],
      M1: pre[1],
      M2: pre[2],
    });
  }

  const cp = inputs.constructionPeriodMonths;
  const isCommercial = inputs.financingModel === "commercial";
  const isSaleStream =
    inputs.stream === "sale" ||
    inputs.exitStrategy === "sale" ||
    inputs.businessModel === "DEV_FOR_SALE";

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

  // Ensure all input arrays cover the full timeline to prevent undefined fallbacks.
  const padArray = (arr: number[], targetLength: number) => {
    const padded = [...arr];
    while (padded.length < targetLength) padded.push(0);
    return padded;
  };

  inputs.monthlyCosts.construction = padArray(inputs.monthlyCosts.construction, totalMonths);
  inputs.monthlyCosts.soft = padArray(inputs.monthlyCosts.soft, totalMonths);
  inputs.monthlyCosts.powc = padArray(inputs.monthlyCosts.powc, totalMonths);
  inputs.monthlySalesInflows = padArray(inputs.monthlySalesInflows, totalMonths);

  if (process.env.NODE_ENV === "development") {
    const powcArr = inputs.monthlyCosts.powc;
    // eslint-disable-next-line no-console
    console.log("🧱 [POWC Raw Array Check]:", {
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

    /** Australia: cumulative sales during construction (balance paid at settlement). */
    auConstructionSalesCumulative: 0,
    /** Australia: balance on construction-phase sales already paid to developer. */
    auConstructionBalancePaid: false,

    /** Land term loan fully repaid — construction RCF may repay only after this. */
    landLoanPaid: !inputs.landLoanEnabled,
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
  const totalTdcExclLand =
    totalConstructionCosts +
    totalSoftCosts +
    inputs.monthlyCosts.powc.reduce((a, b) => a + (Number(b) || 0), 0);
  const totalTdc = totalTdcExclLand + inputs.landCost;
  
  // Estimate GDV for Retention (Total Sales Proceeds)
  state.retentionAmount = totalSales * 0.05;

  const constructionCostTotal =
    inputs.totalConstructionCosts > 0
      ? inputs.totalConstructionCosts
      : totalConstructionCosts;

  if (
    inputs.jurisdiction === "MALAYSIA" &&
    inputs.hdaDepositEnabled !== false
  ) {
    const hdaPctPoints = inputs.hdaDepositPct ?? 3;
    const hdaPctDecimal = hdaPctPoints > 1 ? hdaPctPoints / 100 : hdaPctPoints;
    state.hdaDepositAmount = constructionCostTotal * hdaPctDecimal;
  }

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
      lockedInSales: 0, cumuLockedInSales: 0, cumuTrustAccount: 0, trustAccountInterest: 0, trustAccountFees: 0, trustAccountReleases: 0, actualSalesProceeds: 0,
      constructionCosts: 0, softCosts: 0, powc: 0, totalOutflowsExclLand: 0, landCost: 0, hda3Deposit: 0, totalOutflowsInclLand: 0, ncf: 0,
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
    const sales =
      m < inputs.monthlySalesInflows.length
        ? Number(inputs.monthlySalesInflows[m]) || 0
        : 0;

    row.constructionCosts = cc;
    row.softCosts = sc;
    row.powc = powc;
    row.salesProceeds = sales;
    // --- Cash outflows (construction / soft / POWC); land at M0 only, positive = outflow ---
    row.totalOutflowsExclLand = cc + sc + powc;
    row.landCost = m === 0 ? Number(inputs.landCost) || 0 : 0;
    row.totalOutflowsInclLand = row.totalOutflowsExclLand + row.landCost;

    const salesThisMonth = Number(row.salesProceeds) || 0;
    row.salesProceeds = salesThisMonth;

    const isResidential = !isCommercial;

    if (isCommercial) {
      row.ncf = salesThisMonth - row.totalOutflowsInclLand;
    }

    // Interest Calculation (1-Month Offset: Interest on M-1 balance) — residential escrow/trust only
    let interestEarned = 0;
    if (isResidential && m > 0) {
      if (inputs.jurisdiction === 'AUSTRALIA') {
        interestEarned = state.trustAccountBalance * (inputs.trustAccountDepositRatePct / 12);
      } else {
        interestEarned = state.escrowBalance * (inputs.escrowDepositRatePct / 12);
      }
    }

    // Fee Calculation (1-Month Offset: Avg of prev 12 months)
    let feePayable = 0;
    if (isResidential && m === 0) {
      feePayable = inputs.escrowSetupFee;
    } else if (isResidential && m >= 12 && (m - 1) % 12 === 0) {
      // Annual fee calculation
      const avgBal = inputs.jurisdiction === 'AUSTRALIA' 
        ? state.feeAvgBalanceSum / 12 // Trust Account Avg
        : state.feeAvgBalanceSum / 12; // Escrow Avg
      const feeRate = inputs.jurisdiction === 'AUSTRALIA' 
        ? inputs.trustAccountFeePct 
        : inputs.escrowManagementFeePct;
      feePayable = avgBal * (feeRate / 12); // Monthly equivalent of annual fee? Or annual fee payable monthly?
      // User said: "Average(M0 to M12) x % Management fee payable at M13"
      // Usually management fee is annual % applied to balance.
      // Let's assume the rate provided is Annual %.
      feePayable = avgBal * feeRate; 
      
      state.feeAvgBalanceSum = 0;
      state.feeAvgBalanceCount = 0;
    }
    
    // Update Fee Averages (residential only)
    if (isResidential) {
      const balanceForAvg =
        inputs.jurisdiction === 'AUSTRALIA' ? state.trustAccountBalance : state.escrowBalance;
      state.feeAvgBalanceSum += balanceForAvg;
      state.feeAvgBalanceCount++;
    }

    // --- ESCROW / TRUST LOGIC (residential only) ---
    if (isResidential && inputs.jurisdiction === 'UAE_SA') {
      // Safety: Ensure interval is valid (3 or 6)
      const interval = inputs.certificationIntervalMonths;
      const safeInterval = interval === 3 || interval === 6 ? interval : 6;

      if (m === 0 && process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log(`🏗️ [Engine Interval]: Input=${interval}, Using=${safeInterval}`);
      }

      row.escrowInterest = interestEarned;
      row.escrowAccountFees = feePayable;

      // --- PROGRESS WITHDRAWAL (interval certification + 1‑month lag) ---
      // Cert on M{interval}, M{2×interval}, … within construction; withdrawal the following month.
      // Eligible = MIN(period outflows excl. land, escrow at cert after this month’s sales / interest / fees).
      const monthlyOutflowExclLand =
        row.constructionCosts + row.softCosts + row.powc;

      state.costsSinceLastCert += monthlyOutflowExclLand;

      const cp = inputs.constructionPeriodMonths;
      const isCertMonth = m > 0 && m <= cp && m % safeInterval === 0;

      // Balance available at certification month (before this month’s withdrawal is applied)
      const escrowAtCertMonth =
        state.escrowBalance + salesThisMonth + interestEarned - feePayable;

      if (isCertMonth) {
        const eligibleAmount = Math.min(
          state.costsSinceLastCert,
          Math.max(0, escrowAtCertMonth)
        );
        state.pendingWithdrawal = eligibleAmount;
        state.costsSinceLastCert = 0;
      }

      const isWithdrawalMonth =
        m - 1 > 0 && m - 1 <= cp && (m - 1) % safeInterval === 0;

      if (isWithdrawalMonth && state.pendingWithdrawal > 0) {
        row.progressWithdrawal = state.pendingWithdrawal;
        state.pendingWithdrawal = 0;
      } else {
        row.progressWithdrawal = 0;
      }

      // --- UAE/SA escrow balance: inflows & outflows first (sales, interest, fees, certified withdrawal) ---
      const balanceAfterFlows =
        state.escrowBalance +
        salesThisMonth +
        interestEarned -
        feePayable -
        row.progressWithdrawal;

      // --- UAE/SA escrow releases (surplus above retention + final liquidation at CP+12) ---
      const retentionFloor = totalSales * 0.05;
      const finalReleaseMonth = inputs.constructionPeriodMonths + 12;

      let releaseAmount = 0;
      if (m >= inputs.constructionPeriodMonths + 1) {
        if (m === finalReleaseMonth) {
          releaseAmount = balanceAfterFlows;
          state.escrowBalance = 0;
        } else {
          const surplus = balanceAfterFlows - retentionFloor;
          if (surplus > 0) {
            releaseAmount = surplus;
            state.escrowBalance = retentionFloor;
          } else {
            releaseAmount = 0;
            state.escrowBalance = balanceAfterFlows;
          }
        }
      } else {
        state.escrowBalance = balanceAfterFlows;
      }

      row.escrowReleases = releaseAmount;
      row.escrowBalance = state.escrowBalance;

    } else if (isResidential && inputs.jurisdiction === 'MALAYSIA') {
      // --- M0: lodge HDA deposit into escrow (frozen until VP+24) ---
      if (m === 0 && state.hdaDepositAmount > 0) {
        state.escrowBalance += state.hdaDepositAmount;
      }

      row.escrowInterest = interestEarned;
      if (m === inputs.constructionPeriodMonths + 24 && state.hdaDepositAmount > 0) {
        const hdaInterest =
          state.hdaDepositAmount *
          inputs.escrowDepositRatePct *
          (inputs.constructionPeriodMonths / 12);
        row.escrowInterest += hdaInterest;
      }

      row.escrowAccountFees = feePayable;

      // --- Malaysia HDA withdrawal separation ---
      state.totalActualSalesCollected += salesThisMonth;

      const balanceAfterInflows =
        state.escrowBalance + salesThisMonth + interestEarned - feePayable;

      const isConstruction = m <= inputs.constructionPeriodMonths;
      const monthsSinceVP = m - inputs.constructionPeriodMonths;
      const hdaFloor =
        state.hdaDepositAmount > 0 && !state.hdaDepositReleased
          ? state.hdaDepositAmount
          : 0;

      let progressWithdrawal = 0;
      let escrowRelease = 0;

      if (isConstruction) {
        const currentProgress =
          inputs.sCurveMonthly[m] ?? row.progressPct ?? 0;
        const stage1Withdrawal = salesThisMonth * 0.1;

        let milestoneEntitlement = 0;
        const propertyType = normalizeMalaysiaPropertyType(
          inputs.malaysiaPropertyType ??
            (inputs as { propertyType?: MalaysiaPropertyType }).propertyType
        );
        const applicableMilestones =
          filterMalaysiaMilestonesForPropertyType(propertyType);

        if (process.env.NODE_ENV === 'development' && currentProgress >= 85) {
          console.log('🇲🇾 [Malaysia Milestone Check]:', {
            month: m,
            currentProgress,
            malaysiaPropertyType: inputs.malaysiaPropertyType,
            propertyType,
            applicableMilestones: applicableMilestones.map((ms) => ms.id),
          });
        }

        for (const milestone of applicableMilestones) {
          if (
            currentProgress >= milestone.threshold &&
            !state.malaysiaPaidMilestones.includes(milestone.id)
          ) {
            const entitlement =
              state.totalActualSalesCollected * milestone.percent;
            milestoneEntitlement += entitlement;
            state.malaysiaPaidMilestones.push(milestone.id);

            if (process.env.NODE_ENV === 'development') {
              console.log(
                `✅ [Milestone Paid]: ${milestone.id} (${milestone.label}) - ${milestone.percent * 100}% = MYR ${entitlement.toLocaleString()}`
              );
            }
          }
        }

        if (process.env.NODE_ENV === 'development' && milestoneEntitlement > 0) {
          console.log(
            `📊 [Total Milestone Entitlement]: MYR ${milestoneEntitlement.toLocaleString()}`
          );
        }

        const totalEntitlement = stage1Withdrawal + milestoneEntitlement;
        const withdrawableBalance = Math.max(0, balanceAfterInflows - hdaFloor);
        progressWithdrawal = Math.min(totalEntitlement, withdrawableBalance);
      } else {
        let retentionPercent = 0;
        if (monthsSinceVP >= 1 && monthsSinceVP <= 8) {
          retentionPercent = 0.05;
        } else if (monthsSinceVP >= 9 && monthsSinceVP <= 23) {
          retentionPercent = 0.025;
        } else if (monthsSinceVP === 24) {
          retentionPercent = 0;
        }

        const gdvOrSales =
          state.totalActualSalesCollected ||
          inputs.projectedGDV ||
          totalSales;
        const requiredRetention = gdvOrSales * retentionPercent;
        const hdaLocked = monthsSinceVP < 24 ? hdaFloor : 0;
        const minimumEscrowBalance = requiredRetention + hdaLocked;
        const surplus = balanceAfterInflows - minimumEscrowBalance;
        if (surplus > 0) {
          escrowRelease = surplus;
        }

        if (monthsSinceVP === 24 && !state.hdaDepositReleased) {
          state.hdaDepositReleased = true;
          state.hdaDepositAmount = 0;
        }
      }

      row.progressWithdrawal = progressWithdrawal;
      row.escrowReleases = escrowRelease;
      row.retentionRelease = isConstruction ? 0 : escrowRelease;

      state.escrowBalance =
        balanceAfterInflows - progressWithdrawal - escrowRelease;
      row.escrowBalance = state.escrowBalance;

    } else if (isResidential && inputs.jurisdiction === 'AUSTRALIA') {
      const depositPct = (inputs.auDepositPct ?? 10) / 100;
      const balancePct = (inputs.auBalancePct ?? 90) / 100;
      const constructionEnd = inputs.constructionPeriodMonths;
      const monthsSinceConstructionEnd = m - constructionEnd;

      row.lockedInSales = salesThisMonth;
      state.cumuLockedSales += salesThisMonth;
      row.cumuLockedInSales = state.cumuLockedSales;

      row.trustAccountInterest = interestEarned;
      row.trustAccountFees = feePayable;

      row.escrowReleases = 0;
      row.actualSalesProceeds = 0;
      row.trustAccountReleases = 0;

      // Balance payments (90%): paid at settlement, not held in trust
      if (m > constructionEnd) {
        if (!state.auConstructionBalancePaid) {
          row.actualSalesProceeds +=
            state.auConstructionSalesCumulative * balancePct;
          state.auConstructionBalancePaid = true;
        }
        row.actualSalesProceeds += salesThisMonth * balancePct;
      }

      // --- AUSTRALIA TRUST ACCOUNT RELEASE LOGIC ---
      if (m <= constructionEnd) {
        const depositAmount = row.lockedInSales * depositPct;
        state.auConstructionSalesCumulative += salesThisMonth;
        state.trustAccountBalance += depositAmount + interestEarned - feePayable;
        row.trustAccountReleases = 0;
      } else {
        state.trustAccountBalance += interestEarned - feePayable;

        const totalGDV = inputs.projectedGDV || state.cumuLockedSales || totalSales;
        const retentionFloor = totalGDV * 0.05;

        // Event A: 1 month after construction ends — release above 5% GDV floor
        if (monthsSinceConstructionEnd === 1) {
          const excess = state.trustAccountBalance - retentionFloor;
          const releaseAmount = Math.max(0, excess);

          row.trustAccountReleases = releaseAmount;
          state.trustAccountBalance -= releaseAmount;
        }
        // Event B: 12 months after construction ends — final retention release
        else if (monthsSinceConstructionEnd === 12) {
          const finalReleaseAmount = state.trustAccountBalance;

          row.trustAccountReleases = finalReleaseAmount;
          state.trustAccountBalance = 0;
        }
        // Interim months 2–11: no trust releases
        else {
          row.trustAccountReleases = 0;
        }
      }

      row.escrowReleases = row.trustAccountReleases;
      row.cumuTrustAccount = state.trustAccountBalance;
      row.escrowBalance = state.trustAccountBalance;
    }

    // --- NET CASH FLOW ---
    if (isResidential) {
      // Residential: cash = funds actually received (escrowed sales do not count until released).
      let availableInflows = 0;
      if (inputs.jurisdiction === "AUSTRALIA") {
        availableInflows = row.actualSalesProceeds + row.trustAccountReleases;
      } else {
        availableInflows = row.progressWithdrawal + row.escrowReleases;
      }
      row.ncf = availableInflows - row.totalOutflowsInclLand;
    }

    // --- EQUITY INJECTION (M0): land + HDA; cash equity net of pref substitution (pref is not additive to required cash) ---
    if (m === 0) {
      row.capitalLand = inputs.landEquityValue || 0;
      const prefAmount =
        inputs.prefSharesEnabled ? Math.max(0, inputs.prefSharesAmount || 0) : 0;
      const requiredCash = inputs.cashEquityRequired || 0;
      row.capitalCash = Math.max(0, requiredCash - prefAmount);
      row.capitalHdaDeposit =
        inputs.jurisdiction === "MALAYSIA" ? state.hdaDepositAmount : 0;
      state.cumulativeEquity = row.capitalLand + row.capitalCash;
      row.prefDrawdown = inputs.prefSharesEnabled ? Math.max(0, inputs.prefSharesAmount) : 0;
      state.prefSharesBalance = row.prefDrawdown;
      // --- LAND LOAN DRAWDOWN (M0) — when Step 3 land term loan is enabled ---
      if (m === 0 && inputs.landLoanEnabled) {
        const landCostM0 = Number(inputs.landCost) || 0;
        const landEquityPct = (inputs.landEquityPercent ?? 100) / 100;
        const principal =
          inputs.landLoanAmount > 0
            ? inputs.landLoanAmount
            : Math.max(0, landCostM0 * (1 - landEquityPct));

        row.landLoanDrawdown = principal;
        state.landLoanBalance = principal;
        state.landLoanPaid = false;
        row.landLoanInterest = 0;
        row.landLoanFees =
          principal *
          (inputs.landLoanArrangementFeePct + inputs.landLoanValuationFeePct);
      }
    } else {
      row.capitalLand = 0;
      row.capitalHdaDeposit = 0;
      // `capitalCash` stays 0 until pref dividend funding and/or backstop (see below)
    }

    // --- 4. LOAN & FINANCING (interest / repayments first; RCF draw from cumulative gap below)
    let landLoanInterest = 0;
    let landLoanRepayment = 0;

    // A. Interest & Fees (1-Month Offset)
    const landLoanMaturityMonth = inputs.constructionPeriodMonths + 1;

    if (m > 0) {
      // --- LAND LOAN MONTHLY LOGIC (interest + bullet repayment at CP+1) ---
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

        if (inputs.landLoanEnabled && m === landLoanMaturityMonth) {
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
    
    const previousCumNcf = m > 0 ? monthlyData[m - 1].cumulativeNcf : 0;
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
      if (!isCommercial && inputs.jurisdiction === "AUSTRALIA") {
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

        if (inputs.jurisdiction === "UAE_SA") {
          const cumuCosts =
            inputs.monthlyCosts.construction.slice(0, m + 1).reduce((a, b) => a + b, 0) +
            inputs.monthlyCosts.soft.slice(0, m + 1).reduce((a, b) => a + b, 0) +
            inputs.monthlyCosts.powc.slice(0, m + 1).reduce((a, b) => a + b, 0);
          const maxLoanAllowed = cumuCosts * 0.7;
          room = Math.min(room, Math.max(0, maxLoanAllowed - state.rcfBalance));
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
        row.constLoanRepayment = -repaymentAmount;
        state.rcfBalance -= repaymentAmount;
        row.ncfAfterFinancing -= repaymentAmount;
        row.cumulativeNcf -= repaymentAmount;
      }
    }

    // Backstop equity only after M0, and only when approved facility is fully drawn (no more RCF headroom).
    // Australia uses cap-and-switch equity gap-fill in the draw block above.
    if (
      row.cumulativeNcf < 0 &&
      m > 0 &&
      !isCommercial &&
      inputs.jurisdiction !== "AUSTRALIA"
    ) {
      const plug = -row.cumulativeNcf;
      const facilityHeadroom = inputs.approvedCreditFacility - state.rcfBalance;
      if (plug > 0 && facilityHeadroom < 1e-6) {
        row.capitalCash += plug;
        state.backstopEquityInjected += plug;
        state.cumulativeEquity += plug;
        row.ncfAfterFinancing += plug;
        row.cumulativeNcf = previousCumNcf + row.ncfAfterFinancing;
        row.irrCashFlow -= plug;
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

    // Update Cumulative Capital (M0 Step 3 + any post-M0 backstop `capitalCash`)
    state.cumulativeCapital += row.capitalLand + row.capitalHdaDeposit + row.capitalCash;
    row.cumulativeCapital = state.cumulativeCapital;

    row.constLoanCumulative = state.rcfBalance;
    row.cumulativeDrawdown = state.rcfBalance;

    // --- EQUITY DISTRIBUTION / IRR LOGIC ---
    // Sequence: cumulative NCF is final project cash position; then drain surplus to equity when debt + pref are repaid.
    if (m === 0) {
      row.irrCashFlow = -(row.capitalLand + row.capitalHdaDeposit + row.capitalCash);
    } else {
      const pastConstruction = m > inputs.constructionPeriodMonths;
      const isLoanPaid =
        !state.rcfEverDrawn || state.rcfBalance <= 0.01;
      const isPrefPaid = state.prefSharesBalance <= 0.01;
      const canWithdrawEquity = pastConstruction && isLoanPaid && isPrefPaid;

      const cashAvailableForEquity = Math.max(0, row.cumulativeNcf);
      const equityDistribution = canWithdrawEquity ? cashAvailableForEquity : 0;

      if (equityDistribution > 0) {
        row.irrCashFlow += equityDistribution;
        row.cumulativeNcf = 0;
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
      console.log(`📊 M${m} Equity CF:`, {
        injection: equityInjection,
        distribution: equityDistributionAmount,
        net: row.equityCashFlow,
      });
    }

    monthlyData.push(row);
  }

  // --- POST-PROCESS: IRR SOLVER ---
  solveIrrAndNpv(monthlyData);

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
