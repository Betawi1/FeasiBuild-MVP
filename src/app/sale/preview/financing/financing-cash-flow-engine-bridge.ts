import type {
  FinancingInputs,
  Jurisdiction,
  MonthlyRow as EngineMonthlyRow,
} from "@/lib/financing-engine/generate-cash-flow";
import {
  generateFinancingCashFlow,
  resolveSaleHorizonLastMonth,
} from "@/lib/financing-engine/generate-cash-flow";
import type { FinancingConfig } from "@/lib/sale-financing-engine";
import { computeReimbursementMilestones } from "@/lib/milestone-drawdown";
import type {
  CashOutflowProfile,
  CashOutflows,
  Financing,
  FinModelStreamKey,
  MonthlyCashFlowPoint,
  ProjectInfo,
} from "@/store/useFinModelStore";

import type { MonthlyRow as UaeCashFlowRow } from "./components/cash-flow-table-uae-sa";
import type { MonthlyRow as MalaysiaCashFlowRow } from "./components/cash-flow-table-malaysia";
import type { MonthlyRow as AustraliaCashFlowRow } from "./components/cash-flow-table-australia";

export function resolveFinancingEngineJurisdiction(projectInfo: ProjectInfo): Jurisdiction {
  const code = projectInfo.countryCode?.toUpperCase() ?? "";
  const c = projectInfo.country?.toLowerCase() ?? "";
  if (code === "AE" || c.includes("uae") || c.includes("emirates")) return "UAE_SA";
  if (code === "SA" || c.includes("saudi") || c.includes("ksa")) return "UAE_SA";
  if (code === "MY" || c.includes("malaysia")) return "MALAYSIA";
  if (code === "AU" || c.includes("australia")) return "AUSTRALIA";
  return "UAE_SA";
}

export type FinancingEngineTimelineOptions = {
  commercial?: boolean;
  sale?: boolean;
  constructionPeriodMonths?: number;
  country?: string;
  countryCode?: string;
  withdrawalMode?: string;
  businessModel?: string;
  projectType?: string;
};

function saleHorizonInputsFromTimelineOptions(
  jurisdiction: Jurisdiction,
  constructionPeriodMonths: number,
  options?: FinancingEngineTimelineOptions
): FinancingInputs {
  return {
    constructionPeriodMonths,
    jurisdiction,
    financingModel: options?.commercial ? "commercial" : "residential",
    businessModel: options?.businessModel,
    projectType: options?.projectType,
    country: options?.country,
    countryCode: options?.countryCode,
    escrowWithdrawalMode: options?.withdrawalMode,
    withdrawalMethod: options?.withdrawalMode,
    stream: "sale",
    exitStrategy: "sale",
    sCurveMonthly: [],
    phases: [],
    monthlyCosts: { construction: [], soft: [], powc: [] },
    landCost: 0,
    monthlySalesInflows: [],
    landEquityPercent: 100,
    landEquityValue: 0,
    cashEquityRequired: 0,
    approvedCreditFacility: 0,
    constructionLoanLtcPct: 0,
    interestRatePct: 0,
    idcTreatment: "capitalize",
    landLoanAmount: 0,
    landLoanRatePct: 0,
    landLoanArrangementFeePct: 0,
    landLoanValuationFeePct: 0,
    prefSharesEnabled: false,
    prefSharesAmount: 0,
    prefSharesReturnPct: 0,
    commitmentFeePct: 0,
    escrowSetupFee: 0,
    escrowManagementFeePct: 0,
    escrowDepositRatePct: 0,
    milestoneMonths: [],
    certificationIntervalMonths: 6,
    hdaDepositPct: 3,
    totalConstructionCosts: 0,
    trustAccountFeePct: 0,
    trustAccountDepositRatePct: 0,
  };
}

/** Post–construction tail (months) after last construction month index, per engine. */
export function financingEnginePostExtensionMonths(
  jurisdiction: Jurisdiction,
  options?: FinancingEngineTimelineOptions
): number {
  const cp = options?.constructionPeriodMonths ?? 42;
  if (options?.sale) {
    return (
      resolveSaleHorizonLastMonth(
        saleHorizonInputsFromTimelineOptions(jurisdiction, cp, options)
      ) - cp
    );
  }
  if (options?.commercial) return 6;
  return jurisdiction === "MALAYSIA" ? 24 : 12;
}

/** Sale stream: residential = escrow/trust; commercial = direct sales sweep (Component 1 sub-type). */
export function isResidentialSaleProject(projectInfo: ProjectInfo): boolean {
  const sub = (projectInfo.buildingSubType ?? "").toLowerCase();
  if (sub.startsWith("residential_") || sub.includes("residential")) {
    return true;
  }
  if (sub.startsWith("commercial_") || sub.includes("commercial")) {
    return false;
  }
  const bt = (projectInfo.buildingType ?? "").toLowerCase();
  return bt === "residential";
}

export function isCommercialFinancingModel(
  projectInfo: ProjectInfo,
  financing?: Financing,
  wizardParam?: string | null
): boolean {
  if (wizardParam === "commercial") return true;
  if (wizardParam === "residential") return false;

  // Component 1 product selection wins over stale financing.wizard flags.
  if (isResidentialSaleProject(projectInfo)) return false;

  const sub = (projectInfo.buildingSubType ?? "").toLowerCase();
  if (sub.startsWith("commercial_")) return true;

  if (financing?.financingModel === "commercial") return true;
  if (financing?.financingModel === "residential") return false;

  const bt = (projectInfo.buildingType ?? "").toLowerCase();
  return bt.length > 0 && bt !== "residential";
}

/** Last month index in the financing engine grid (e.g. CP=42, UAE → 54). */
export function financingEngineTimelineLastMonth(
  jurisdiction: Jurisdiction,
  constructionPeriodMonths: number,
  options?: FinancingEngineTimelineOptions
): number {
  if (options?.sale) {
    return resolveSaleHorizonLastMonth(
      saleHorizonInputsFromTimelineOptions(
        jurisdiction,
        constructionPeriodMonths,
        { ...options, constructionPeriodMonths }
      )
    );
  }
  return (
    constructionPeriodMonths +
    financingEnginePostExtensionMonths(jurisdiction, {
      ...options,
      constructionPeriodMonths,
    })
  );
}

/** Number of monthly columns (M0 through last month inclusive). */
export function financingEngineTimelineMonthCount(
  jurisdiction: Jurisdiction,
  constructionPeriodMonths: number,
  options?: FinancingEngineTimelineOptions
): number {
  return financingEngineTimelineLastMonth(jurisdiction, constructionPeriodMonths, options) + 1;
}

function mapIdcToEngine(
  raw: Financing["idcTreatment"] | FinancingConfig["idcTreatment"] | undefined
): "capitalize" | "paid-current" {
  if (raw === "current") return "paid-current";
  return "capitalize";
}

/** Pad / trim dense monthly sales to the financing engine horizon (M0 … last month). */
function extendMonthlySalesInflowsToEngineTimeline(
  base: number[],
  jurisdiction: Jurisdiction,
  constructionPeriodMonths: number,
  options?: FinancingEngineTimelineOptions
): number[] {
  const expectedLength = financingEngineTimelineMonthCount(
    jurisdiction,
    constructionPeriodMonths,
    options
  );
  if (base.length >= expectedLength) {
    return base.slice(0, expectedLength);
  }
  const extended = [...base];
  while (extended.length < expectedLength) {
    extended.push(0);
  }
  return extended;
}

/** Dense monthly totals from Component 3 `monthlyInflowSchedule` only (no financing-side reallocation). */
function monthlySalesInflowsFromInflowSchedule(
  schedule: MonthlyCashFlowPoint[],
  length: number
): number[] {
  const out = Array.from({ length }, () => 0);
  for (const p of schedule) {
    const m = Math.round(Number(p.month));
    const amt = Number(p.amount);
    if (!Number.isFinite(m) || m < 0 || m >= length) continue;
    out[m] += Number.isFinite(amt) ? amt : 0;
  }
  return out;
}

function padArray(arr: number[], len: number): number[] {
  const out = [...arr];
  while (out.length < len) out.push(0);
  return out.slice(0, len);
}

function expandPhasesForMonths(
  constructionPeriod: number,
  stages: { name: string; monthSpan: number }[],
  engineMonths: number
): string[] {
  const labels: string[] = [];
  const useStages = stages.length > 0 ? stages : [{ name: "Construction", monthSpan: Math.max(1, constructionPeriod) }];
  for (let m = 0; m < engineMonths; m++) {
    if (m === 0) {
      labels.push("Pre-Construction");
      continue;
    }
    if (m > constructionPeriod) {
      labels.push("Post-Construction");
      continue;
    }
    let cum = 0;
    let label = useStages[0]?.name ?? "Construction";
    for (const st of useStages) {
      cum += Math.max(0, st.monthSpan);
      if (m <= cum) {
        label = st.name;
        break;
      }
    }
    labels.push(label);
  }
  return labels;
}

function buildQuarterlyMilestoneMonths(
  financing: Financing,
  constructionPeriod: number,
  finStream: FinModelStreamKey
): number[] | null {
  if (financing.drawdownActiveTab !== "quarterly" || finStream === "operational") return null;
  const out: number[] = [];
  const first = Math.max(
    0,
    Math.min(constructionPeriod, Math.round(Number(financing.drawdownQuarterly?.firstMonth ?? 0)))
  );
  const last = Math.max(
    0,
    Math.min(constructionPeriod, Math.round(Number(financing.drawdownQuarterly?.lastMonth ?? constructionPeriod)))
  );
  if (first > last) return null;
  for (let mm = first; mm <= last; mm += 3) {
    out.push(mm);
  }
  if (out.length > 0 && out[out.length - 1] !== last) {
    out.push(last);
  }
  return out.length > 0 ? out : null;
}

function buildMilestoneMonths(params: {
  financing: Financing;
  cashOutflows: CashOutflows;
  constructionPeriod: number;
  costSchedule: number[];
  totalLandCost: number;
  landCost: number;
  tdc: number;
  finStream: FinModelStreamKey;
}): number[] {
  const { financing, cashOutflows, constructionPeriod, costSchedule, totalLandCost, landCost, tdc, finStream } =
    params;

  const quarterly = buildQuarterlyMilestoneMonths(financing, constructionPeriod, finStream);
  if (quarterly && quarterly.length > 0) {
    return quarterly;
  }

  const { milestones } = computeReimbursementMilestones({
    autoCalculateMilestoneMonths: financing.autoCalculateMilestoneMonths ?? true,
    milestoneThresholds: financing.milestoneThresholds ?? [30, 60, 90, 100],
    certificationInterval: financing.certificationInterval ?? 3,
    overrideMilestoneMonths: financing.overrideMilestoneMonths ?? null,
    costSchedule,
    totalLandCost,
    landCost,
    constructionPeriod,
    tdc: tdc || cashOutflows.tdc || 0,
  });
  return milestones.map((x) => x.month);
}

/** Component 1 building sub-type + Component 4 escrow config → Schedule G vs H. */
function resolveMalaysiaPropertyType(
  projectInfo: ProjectInfo,
  financing: Financing
): "LANDED" | "HIGH_RISE" {
  const fromEscrow = financing.escrowConfig?.malaysia?.propertyType;
  if (fromEscrow === "LANDED" || fromEscrow === "HIGH_RISE") {
    return fromEscrow;
  }

  const sub = projectInfo.buildingSubType?.toLowerCase() ?? "";
  if (sub.includes("landed")) return "LANDED";
  if (
    sub.includes("high_rise") ||
    sub.includes("high-rise") ||
    sub === "commercial_strata_office"
  ) {
    return "HIGH_RISE";
  }

  return "HIGH_RISE";
}

function buildSCurveProgressPct(
  construction: number[],
  constructionPeriod: number,
  engineMonths: number
): number[] {
  const total = construction.reduce((a, b) => a + (b || 0), 0);
  const out: number[] = [];
  let cum = 0;
  for (let m = 0; m < engineMonths; m++) {
    cum += construction[m] || 0;
    out.push(total > 0 ? (cum / total) * 100 : 0);
  }
  return out;
}

export type FinancingEnginePreviewBundle = {
  jurisdiction: Jurisdiction;
  inputs: FinancingInputs;
  rows: EngineMonthlyRow[];
};

export function buildFinancingEnginePreview(params: {
  projectInfo: ProjectInfo;
  cashOutflows: CashOutflows;
  financing: Financing;
  financingConfig: FinancingConfig | undefined;
  outflowProfile: CashOutflowProfile;
  constructionCostSchedule: number[];
  constructionPeriod: number;
  /** Component 3 `cashInflows.monthlyInflowSchedule` — raw store; only merged by month index for the engine grid. */
  monthlyInflowSchedule: MonthlyCashFlowPoint[];
  finStream: FinModelStreamKey;
  effectiveInterestRatePercent: number;
  debtFacilityAmount: number;
  /** Component 4 Step 3 — post-haircut land equity counted toward TDC (e.g. land × 70% when land is 100% equity). */
  landEquityValue: number;
  /** Component 4 Step 3 — cash equity required after land equity counted toward TDC. */
  cashEquityRequired: number;
}): FinancingEnginePreviewBundle {
  const {
    projectInfo,
    cashOutflows,
    financing,
    financingConfig,
    outflowProfile,
    constructionCostSchedule,
    constructionPeriod,
    monthlyInflowSchedule,
    finStream,
    effectiveInterestRatePercent,
    debtFacilityAmount,
    landEquityValue,
    cashEquityRequired,
  } = params;

  const jurisdiction = resolveFinancingEngineJurisdiction(projectInfo);
  const commercial = isCommercialFinancingModel(projectInfo, financing);
  const withdrawalMode =
    financing.escrowConfig?.withdrawalMode ??
    (financing as { escrowWithdrawalMode?: string }).escrowWithdrawalMode;
  const timelineOpts: FinancingEngineTimelineOptions = {
    commercial,
    sale: true,
    constructionPeriodMonths: constructionPeriod,
    country: projectInfo.country,
    countryCode: projectInfo.countryCode,
    withdrawalMode,
    businessModel: projectInfo.businessModel ?? "DEV_FOR_SALE",
    projectType:
      projectInfo.projectType ?? (commercial ? "COMMERCIAL" : "RESIDENTIAL"),
  };
  const engineMonths = Math.max(
    1,
    financingEngineTimelineMonthCount(jurisdiction, constructionPeriod, timelineOpts)
  );

  // DIRECT LINK: Component 2 monthly arrays (no redistribution / merging).
  // Use the preview's monthly arrays as-is; the engine handles padding internally.
  const monthlyConstruction = padArray(outflowProfile.construction || [], engineMonths);
  const monthlySoft = padArray(outflowProfile.softCosts || [], engineMonths);
  const monthlyPowc = padArray(outflowProfile.powc || [], engineMonths);

  const monthlySalesInflows = extendMonthlySalesInflowsToEngineTimeline(
    monthlySalesInflowsFromInflowSchedule(monthlyInflowSchedule, engineMonths),
    jurisdiction,
    constructionPeriod,
    timelineOpts
  );

  const costSchedule = padArray(outflowProfile.monthlyTotal || [], engineMonths);
  const totalLandCost = cashOutflows.landCost || 0;
  const landCost = cashOutflows.landCost || 0;
  const tdc = cashOutflows.tdc || 0;
  const totalConstructionCosts = monthlyConstruction.reduce(
    (sum, v) => sum + (Number(v) || 0),
    0
  );
  const projectedGDV =
    monthlySalesInflows.reduce((sum, v) => sum + (Number(v) || 0), 0) || tdc * 1.2;

  const milestoneMonths = buildMilestoneMonths({
    financing,
    cashOutflows,
    constructionPeriod,
    costSchedule,
    totalLandCost,
    landCost,
    tdc,
    finStream,
  });

  const sCurveMonthly = buildSCurveProgressPct(monthlyConstruction, constructionPeriod, engineMonths);
  const phases = expandPhasesForMonths(constructionPeriod, outflowProfile.stages || [], engineMonths);

  const idcSource = financingConfig?.idcTreatment ?? financing.idcTreatment;
  const pref = financing.preferenceShares;
  const landFin = financing.landFinancing;
  const landLoanActive = landFin?.type === "land_loan";
  const landEquityPct = financing.landEquityPercent ?? 100;
  const landLoanPrincipal = landLoanActive
    ? Math.max(
        0,
        landFin?.landLoanAmount ??
          landCost * (1 - landEquityPct / 100)
      )
    : 0;
  const landLoanTenorMonths =
    landFin?.landLoanTenorMonths ??
    (landFin?.landLoanTenorYears && landFin.landLoanTenorYears > 0
      ? Math.round(landFin.landLoanTenorYears * 12)
      : constructionPeriod + 6);

  /** Annual commitment fee in percent points (e.g. 0.5 = 0.5% p.a. on undrawn). Engine uses `/100/12`. */
  const commitmentFeeAnnualPercent =
    financing.commitmentFeePct ??
    financingConfig?.commitmentFeePct ??
    financing.commitmentFeeRate ??
    0.5;

  const facilityFromFinancing =
    financing.approvedCreditFacility && financing.approvedCreditFacility > 0
      ? financing.approvedCreditFacility
      : financing.debtFacilityAmount && financing.debtFacilityAmount > 0
        ? financing.debtFacilityAmount
        : debtFacilityAmount;

  const inputs: FinancingInputs = {
    stream: "sale",
    businessModel: projectInfo.businessModel ?? "DEV_FOR_SALE",
    projectType:
      projectInfo.projectType ??
      (commercial ? "COMMERCIAL" : "RESIDENTIAL"),
    exitStrategy: "sale",
    financingModel: commercial ? "commercial" : "residential",
    country: projectInfo.country,
    countryCode: projectInfo.countryCode,
    escrowWithdrawalMode: withdrawalMode,
    withdrawalMethod: withdrawalMode,
    jurisdiction,
    constructionPeriodMonths: constructionPeriod,
    sCurveMonthly,
    phases,
    monthlyCosts: {
      construction: monthlyConstruction,
      soft: monthlySoft,
      powc: monthlyPowc,
    },
    landCost,
    monthlySalesInflows,
    landEquityPercent: financing.landEquityPercent ?? 100,
    landEquityValue,
    cashEquityRequired,
    approvedCreditFacility: Math.max(0, facilityFromFinancing),
    constructionLoanLtcPct:
      financingConfig?.loanToCostPercent ?? financing.loanToCostPercent ?? 65,
    /** Engine applies `(rate / 12)` to balances — pass annual rate as decimal (e.g. 0.08 for 8%). */
    interestRatePct: Math.max(0, effectiveInterestRatePercent) / 100,
    idcTreatment: mapIdcToEngine(idcSource),
    landLoanEnabled: landLoanActive,
    landLoanAmount: landLoanPrincipal,
    landLoanRatePct: ((landFin?.landLoanRatePercent ?? 6.5) as number) / 100,
    landLoanTenorMonths,
    landLoanInterestTreatment: landFin?.landLoanInterestTreatment ?? "capitalize",
    landLoanArrangementFeePct:
      (financing as { landLoanArrangementFeePct?: number }).landLoanArrangementFeePct ??
      0.01,
    landLoanValuationFeePct:
      (financing as { landLoanValuationFeePct?: number }).landLoanValuationFeePct ??
      0.0025,
    prefSharesEnabled: pref?.hasPreferenceShares ?? false,
    prefSharesAmount: Math.max(0, pref?.amount ?? 0),
    prefSharesReturnPct: ((pref?.returnPercent ?? 0) as number) / 100,
    commitmentFeePct: commitmentFeeAnnualPercent,
    escrowSetupFee: (financing as { escrowSetupFee?: number }).escrowSetupFee ?? 5000,
    escrowManagementFeePct: (financing as { escrowManagementFeePct?: number }).escrowManagementFeePct ?? 0.0005,
    /** Annual deposit yield as decimal (e.g. 0.039 ≈ 3.9% p.a.). */
    escrowDepositRatePct: (financing as { escrowDepositRatePct?: number }).escrowDepositRatePct ?? 0.039,
    milestoneMonths,
    certificationIntervalMonths: Math.max(
      1,
      Math.round(
        Number(
          financing.certificationInterval ??
            financingConfig?.certificationIntervalMonths ??
            6
        )
      )
    ),
    hdaDepositEnabled:
      financing.hdaDepositEnabled ??
      financing.escrowConfig?.malaysia?.hdaDepositEnabled ??
      true,
    hdaDepositPct:
      financing.hdaDepositPct ??
      financing.escrowConfig?.malaysia?.hdaDepositPct ??
      3,
    totalConstructionCosts,
    projectedGDV,
    malaysiaPropertyType:
      jurisdiction === "MALAYSIA"
        ? resolveMalaysiaPropertyType(projectInfo, financing)
        : undefined,
    trustAccountFeePct: (financing as { trustAccountFeePct?: number }).trustAccountFeePct ?? 0.002,
    trustAccountDepositRatePct:
      (financing as { trustAccountDepositRatePct?: number }).trustAccountDepositRatePct ?? 0.005,
    auDepositPct:
      financing.escrowConfig?.australia?.depositPct ??
      financing.escrowConfig?.australia?.retentionPct ??
      10,
    auBalancePct:
      financing.escrowConfig?.australia?.balancePct ??
      financing.escrowConfig?.australia?.releasePct ??
      90,
  };

  const rows = generateFinancingCashFlow(inputs);
  return { jurisdiction, inputs, rows };
}

export function mapEngineRowsToUae(rows: EngineMonthlyRow[]): UaeCashFlowRow[] {
  return rows.map((r) => ({
    month: r.month,
    phase: r.phase,
    progressPct: r.progressPct,
    isMilestone: r.isMilestone,
    salesProceeds: r.salesProceeds,
    escrowInterest: r.escrowInterest,
    escrowAccountFees: r.escrowAccountFees,
    escrowBalance: r.escrowBalance,
    escrowReleases: r.escrowReleases,
    progressWithdrawal: r.progressWithdrawal,
    constructionCosts: r.constructionCosts,
    softCosts: r.softCosts,
    powc: r.powc,
    totalOutflowsExclLand: r.totalOutflowsExclLand,
    landCost: r.landCost,
    totalOutflowsInclLand: r.totalOutflowsInclLand,
    ncf: r.ncf,
    loanDrawdown: r.constLoanDrawdown,
    cumulativeLoanDrawdown: r.constLoanCumulative,
    interestPayment: r.constLoanInterest,
    loanRepayment: r.constLoanRepayment,
    commitmentFee: r.constLoanCommitmentFee,
    prefDrawdown: r.prefDrawdown,
    prefDividend: r.prefDividend,
    prefRepayment: r.prefRepayment,
    capitalLandInjection: r.capitalLand,
    capitalCashInjection: r.capitalCash,
    cumulativeCapital: r.cumulativeCapital,
    ncfAfterFinancing: r.ncfAfterFinancing,
    cumulativeNcfAfterFinancing: r.cumulativeNcf,
    equityCashFlow: r.irrCashFlow,
    discountRate: r.irrDiscountRate,
    npv: r.irrNpv,
  }));
}

export function mapEngineRowsToMalaysia(rows: EngineMonthlyRow[]): MalaysiaCashFlowRow[] {
  return rows as unknown as MalaysiaCashFlowRow[];
}

export function mapEngineRowsToAustralia(rows: EngineMonthlyRow[]): AustraliaCashFlowRow[] {
  return rows as unknown as AustraliaCashFlowRow[];
}
