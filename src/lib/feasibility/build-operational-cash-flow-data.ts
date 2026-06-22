import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import {
  calculateCapitalMetrics,
  calculateIRRYearly,
} from "@/lib/operational-irr-calculator";
import {
  computeOperationalProjectIrrPnl,
  type OperationalProjectIrrPnl,
} from "@/lib/operational-project-irr-pnl";
import type { OperationalCashFlowData } from "@/types/feasibility";
import type { FeasibilityProjectBundle } from "@/types/feasibility";
import {
  buildCashOutflowProfile,
  type CashOutflows,
  type OfficeDepreciationConfig,
  type OfficeOpexConfig,
  type ResidentialDepreciationConfig,
  type ResidentialOpexConfig,
  type RetailDepreciationConfig,
  type RetailOpexConfig,
} from "@/store/useFinModelStore";
import type {
  OperationalHotelHoldSnapshot,
  OperationalOfficeHoldSnapshot,
  OperationalResidentialHoldSnapshot,
  OperationalRetailHoldSnapshot,
} from "@/lib/operational-pnl";

const YEAR_COUNT = 13;
const TERMINAL_VALUE_COL_INDEX = 12;
const STABILIZED_NOI_COL_INDEX = 12;

function padToYearCount(values: number[], count = YEAR_COUNT): number[] {
  const out = values.slice();
  while (out.length < count) out.push(0);
  return out.slice(0, count);
}

/** Shift operational P&L into Y4–Y13 (prepend 3 development slots). */
function shiftBy3(data: number[]): number[] {
  return [0, 0, 0, ...data.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS)];
}

/**
 * Bucket monthly development outflows into Y1–Y3 (M0–M12, M13–M24, M25+).
 * Returns negative amounts (cash outflows).
 */
function totalDevelopmentCostsYearlyFromMonthlyTotal(
  monthlyTotal: number[],
  constructionPeriod: number
): number[] {
  const last = Math.max(0, constructionPeriod);
  const len = last + 1;
  const padded = Array.from({ length: len }, (_, m) => monthlyTotal[m] ?? 0);
  const sumSeg = (start: number, end: number) =>
    start > end || start >= len
      ? 0
      : padded.slice(start, Math.min(end + 1, len)).reduce((a, b) => a + b, 0);
  const y1 = -sumSeg(0, Math.min(12, last));
  const y2 = last >= 13 ? -sumSeg(13, Math.min(24, last)) : 0;
  const y3 = last >= 25 ? -sumSeg(25, last) : 0;
  return [y1, y2, y3, ...Array.from({ length: YEAR_COUNT - 3 }, () => 0)];
}

function toThousands(n: number): number {
  return Math.round(n / 1000);
}

function toThousandsSeries(values: number[]): number[] {
  return values.map(toThousands);
}

export type OperationalCashFlowContext = {
  cashOutflows: CashOutflows;
  buildingType?: string;
  hotelSnapshot?: OperationalHotelHoldSnapshot | null;
  retailSnapshot?: OperationalRetailHoldSnapshot | null;
  officeSnapshot?: OperationalOfficeHoldSnapshot | null;
  residentialSnapshot?: OperationalResidentialHoldSnapshot | null;
  retailOpex?: RetailOpexConfig;
  retailDepreciation?: RetailDepreciationConfig;
  officeOpex?: OfficeOpexConfig;
  officeDepreciation?: OfficeDepreciationConfig;
  residentialOpex?: ResidentialOpexConfig;
  residentialDepreciation?: ResidentialDepreciationConfig;
  exitCapRate?: number;
  projectIRR?: number;
  equityMultiple?: number;
  paybackPeriod?: number;
};

function computeYearlyCashFlowCore(
  pnl: OperationalProjectIrrPnl | null,
  cashOutflows: CashOutflows,
  exitCapRate: number
): {
  netCashFlowsYearly: number[];
  terminalValueRaw: number;
  netIncomeShifted: number[];
  depreciationShifted: number[];
  changeInWCShifted: number[];
  totalDevelopmentCostsYearly: number[];
  ffeRenovationShifted: number[];
} {
  const outflowProfile = buildCashOutflowProfile(cashOutflows);
  const cp = Math.max(0, cashOutflows.constructionPeriod || 0);
  const ffeInvestment = cashOutflows.ffe || 0;

  const totalDevelopmentCostsYearly = totalDevelopmentCostsYearlyFromMonthlyTotal(
    outflowProfile.monthlyTotal,
    cp
  );

  let netIncomeYearly: number[];
  let depreciationYearly: number[];
  let changeInWorkingCapitalYearly: number[];

  if (pnl) {
    netIncomeYearly = padToYearCount(pnl.netIncome.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS));
    depreciationYearly = padToYearCount(
      pnl.depreciationTotal.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS)
    );
    changeInWorkingCapitalYearly = padToYearCount(
      pnl.changeInWorkingCapital.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS)
    );
  } else {
    const z = padToYearCount([]);
    netIncomeYearly = z;
    depreciationYearly = z;
    changeInWorkingCapitalYearly = z;
  }

  const netIncomeShifted = shiftBy3(netIncomeYearly);
  const depreciationShifted = shiftBy3(depreciationYearly);
  const changeInWCShifted = shiftBy3(changeInWorkingCapitalYearly);

  const ffeRenovPct = (pnl?.ffeRenovationPctYear6 ?? 50) / 100;
  const ffeRenovationShifted = Array.from({ length: YEAR_COUNT }, () => 0);
  ffeRenovationShifted[8] = -ffeInvestment * ffeRenovPct;

  const stabilizedNOI =
    (netIncomeShifted[STABILIZED_NOI_COL_INDEX] ?? 0) +
    (depreciationShifted[STABILIZED_NOI_COL_INDEX] ?? 0);
  const cap = exitCapRate > 0 ? exitCapRate : 7;
  const terminalValueRaw =
    cap > 0 ? Math.round(stabilizedNOI / (cap / 100)) : 0;

  const terminalValueYearly = Array.from({ length: YEAR_COUNT }, () => 0);
  terminalValueYearly[TERMINAL_VALUE_COL_INDEX] = terminalValueRaw;

  const netCashFlowsYearly = netIncomeShifted.map((ni, i) => {
    const operating = ni + depreciationShifted[i]! - changeInWCShifted[i]!;
    return (
      operating +
      ffeRenovationShifted[i]! +
      totalDevelopmentCostsYearly[i]! +
      terminalValueYearly[i]!
    );
  });

  return {
    netCashFlowsYearly,
    terminalValueRaw,
    netIncomeShifted,
    depreciationShifted,
    changeInWCShifted,
    totalDevelopmentCostsYearly,
    ffeRenovationShifted,
  };
}

function paybackFromCumulative(cumulative: number[]): number {
  for (let i = 0; i < cumulative.length; i++) {
    if ((cumulative[i] ?? 0) >= 0) {
      return Math.round((i + 1) * 10) / 10;
    }
  }
  return 0;
}

export function buildOperationalCashFlowData(
  bundle: FeasibilityProjectBundle,
  ctx: OperationalCashFlowContext
): OperationalCashFlowData {
  const pnl = computeOperationalProjectIrrPnl(ctx.buildingType, {
    hotelSnapshot: ctx.hotelSnapshot ?? undefined,
    retailSnapshot: ctx.retailSnapshot ?? undefined,
    officeSnapshot: ctx.officeSnapshot ?? undefined,
    residentialSnapshot: ctx.residentialSnapshot ?? undefined,
    retailOpex: ctx.retailOpex,
    retailDepreciation: ctx.retailDepreciation,
    officeOpex: ctx.officeOpex,
    officeDepreciation: ctx.officeDepreciation,
    residentialOpex: ctx.residentialOpex,
    residentialDepreciation: ctx.residentialDepreciation,
    constructionCost: ctx.cashOutflows.constructionCost || 0,
    ffe: ctx.cashOutflows.ffe || 0,
  });

  const exitCapRate = ctx.exitCapRate ?? 7;
  const core = computeYearlyCashFlowCore(pnl, ctx.cashOutflows, exitCapRate);

  const yearlyRaw = Array.from({ length: YEAR_COUNT }, (_, i) => {
    const netIncome = core.netIncomeShifted[i] ?? 0;
    const depreciation = core.depreciationShifted[i] ?? 0;
    const workingCapital = -(core.changeInWCShifted[i] ?? 0);
    const netOperatingCF = netIncome + depreciation + workingCapital;
    const initialInvestment =
      (core.totalDevelopmentCostsYearly[i] ?? 0) +
      (core.ffeRenovationShifted[i] ?? 0);
    const netInvestingCF = initialInvestment;
    const equity = 0;
    const preSales = 0;
    const netFinancingCF = equity + preSales;
    const freeCashFlow = netOperatingCF + netInvestingCF;
    const netCashFlow = freeCashFlow + netFinancingCF;

    return {
      year: `Year ${i + 1}`,
      netIncome,
      depreciation,
      workingCapital,
      netOperatingCF,
      initialInvestment,
      netInvestingCF,
      freeCashFlow,
      equity,
      preSales,
      netFinancingCF,
      netCashFlow,
      cumulativeCash: 0,
    };
  });

  let cumulative = 0;
  const yearlyData = yearlyRaw.map((row) => {
    cumulative += row.netCashFlow;
    return {
      ...row,
      netIncome: toThousands(row.netIncome),
      depreciation: toThousands(row.depreciation),
      workingCapital: toThousands(row.workingCapital),
      netOperatingCF: toThousands(row.netOperatingCF),
      initialInvestment: toThousands(row.initialInvestment),
      netInvestingCF: toThousands(row.netInvestingCF),
      freeCashFlow: toThousands(row.freeCashFlow),
      equity: toThousands(row.equity),
      preSales: toThousands(row.preSales),
      netFinancingCF: toThousands(row.netFinancingCF),
      netCashFlow: toThousands(row.netCashFlow),
      cumulativeCash: toThousands(cumulative),
    };
  });

  const { irr } = calculateIRRYearly(core.netCashFlowsYearly);
  const capital = calculateCapitalMetrics(core.netCashFlowsYearly);
  const cumulativeFull = yearlyRaw.map((_, i) =>
    yearlyRaw.slice(0, i + 1).reduce((s, r) => s + r.netCashFlow, 0)
  );

  const projectIRR =
    ctx.projectIRR ??
    (Number.isFinite(irr) ? Math.round(irr * 1000) / 10 : bundle.component4.projectIRR);
  const equityMultiple =
    ctx.equityMultiple ??
    (capital.equityMultiple > 0
      ? Math.round(capital.equityMultiple * 100) / 100
      : bundle.component4.equityMultiple);
  const paybackPeriod =
    ctx.paybackPeriod ??
    (paybackFromCumulative(cumulativeFull) || bundle.component4.paybackPeriod);

  return {
    title: "Financial Analysis",
    subtitle: "Cash Flow Statement",
    currency: bundle.currency,
    yearlyData,
    terminalValue: toThousands(core.terminalValueRaw),
    metrics: {
      projectIRR,
      equityMultiple,
      paybackPeriod,
    },
  };
}

export function buildOperationalCashFlowFromBundle(
  bundle: FeasibilityProjectBundle
): OperationalCashFlowData {
  return buildOperationalCashFlowData(bundle, {
    cashOutflows: {
      landCost: bundle.component1.landCost,
      constructionCost: bundle.component1.constructionCost,
      softCosts: bundle.component1.softCosts,
      ffe: bundle.component1.ffe,
      powc: bundle.component1.powc,
      tdc: bundle.component4.tdc,
      constructionPeriod: bundle.component1.constructionPeriod,
      contingencyPercent: 10,
      buildingBUA: bundle.component1.buildingBUA,
      parkingBUA: bundle.component1.parkingBUA,
      basementBUA: 0,
      buildingRate: bundle.component1.buildingRate,
      parkingRate: bundle.component1.parkingRate,
      basementRate: bundle.component1.basementRate,
      landArea: 0,
      landRate: 0,
      softCostPercent: 0,
      powcPercent: 0,
      ffePercent: 0,
      stageAllocation: {
        stage1Label: "Stage 1",
        stage1Percent: 25,
        stage2Label: "Stage 2",
        stage2Percent: 25,
        stage3Label: "Stage 3",
        stage3Percent: 25,
        stage4Label: "Stage 4",
        stage4Percent: 25,
      },
      powcStartMonth: 0,
      powcDurationMonths: 0,
    } as CashOutflows,
    buildingType: "hotel",
    exitCapRate: 7,
    projectIRR: bundle.component4.projectIRR,
    equityMultiple: bundle.component4.equityMultiple,
    paybackPeriod: bundle.component4.paybackPeriod,
  });
}

export function isOperationalCashFlowData(
  data: unknown
): data is OperationalCashFlowData {
  return (
    !!data &&
    typeof data === "object" &&
    "yearlyData" in data &&
    "metrics" in data
  );
}
