import {
  computeCommonDistributionByMonth,
  getLoanRepaymentMonthFromMonthlyData,
  getMonthlyDataValueFromStore,
  type MonthlyDataField,
} from "@/lib/common-equity-net-series";
import { paybackMonthCrossingFromNegative } from "@/lib/equity-irr";
import { annualIrrPercentFromMonthlyNetEquityFlows } from "@/lib/net-equity-flow-irr";
import { calculatePreferenceAdjustments } from "@/lib/preference-simple";

/** Minimal monthly row shape produced by C4 / `projectIRR.monthlyData`. */
export type C5MonthlyDataRow = {
  month: number;
  equityInjection?: number;
  ncfPostFinancing?: number;
  cumulativeNcfPostFinancing?: number;
  principalRepayment?: number;
};

/**
 * Preference inputs + timing context (derived on the preview page today).
 * `returnPercent` is a percentage points value (e.g. 8 for 8% p.a.).
 */
export type EquityPreferenceConfig = {
  hasPreference: boolean;
  amount: number;
  returnPercent: number;
  returnType: string;
  tenorMonths: number;
  constructionPeriod: number;
  /** Construction + pre-op buffer end — quarterly pref coupons stop here (same as preference-simple). */
  stabilizationEndMonth: number;
  operationalFyeMonths: number[];
  horizonMonths: number;
};

export type C5TableRow = {
  month: number;
  prefDraw: number;
  commonDraw: number;
  totalDraw: number;
  prefDist: number;
  commonDist: number;
  promoteDist: number;
  totalDist: number;
  netEquityCF: number;
  cumulativeEquity: number;
};

export type C5EngineResult = {
  equityCashFlows: number[];
  tableRows: C5TableRow[];
  metrics: {
    irr: number;
    multiple: number;
    payback: number | null;
  };
  preferenceSchedule: {
    draws: number[];
    dividends: number[];
    principal: number[];
  };
  /** Dense Series — equity injections row G from C4 (no preference split). */
  baseEquityInjections: number[];
  /** Incremental NCF post-financing from C4 cumulative series. */
  monthlyDistributionsRaw: number[];
  loanPayoffMonth: number | null;
};

/**
 * Component 5 equity linker: reads C4 monthly rows only — no construction/debt/IDC math.
 * Preference coupons/principal are layered using the same helpers as `/lib/preference-simple`.
 */
export function calculateEquityReturns(
  monthlyData: C5MonthlyDataRow[],
  preferenceConfig: EquityPreferenceConfig
): C5EngineResult {
  const horizon = Math.max(
    0,
    Math.round(preferenceConfig.horizonMonths || 0)
  );

  if (!monthlyData?.length || horizon <= 0) {
    return {
      equityCashFlows: [],
      tableRows: [],
      metrics: { irr: 0, multiple: 0, payback: null },
      preferenceSchedule: { draws: [], dividends: [], principal: [] },
      baseEquityInjections: [],
      monthlyDistributionsRaw: [],
      loanPayoffMonth: null,
    };
  }

  const H = Math.max(1, horizon);

  const baseEquityInjections: number[] = new Array(H).fill(0);
  for (const row of monthlyData) {
    const m = row.month;
    if (m >= 0 && m < H) {
      baseEquityInjections[m] = Math.max(0, Number(row.equityInjection) || 0);
    }
  }

  const cumNcf: number[] = new Array(H).fill(0);
  for (const row of monthlyData) {
    const m = row.month;
    if (m >= 0 && m < H) {
      cumNcf[m] = Number(row.cumulativeNcfPostFinancing) || 0;
    }
  }

  const monthlyDistributionsRaw: number[] = new Array(H).fill(0);
  for (let m = 0; m < H; m++) {
    const c = cumNcf[m] ?? 0;
    const prev = m > 0 ? cumNcf[m - 1] ?? 0 : 0;
    monthlyDistributionsRaw[m] = Math.max(0, c - prev);
  }

  const loanPayoffMonth = getLoanRepaymentMonthFromMonthlyData(monthlyData);

  const getMonthlyDataValue = (month: number, field: MonthlyDataField) =>
    getMonthlyDataValueFromStore(monthlyData, month, field);

  const hasPreference =
    preferenceConfig.hasPreference &&
    preferenceConfig.amount > 0;

  const prefPrincipal = hasPreference ? preferenceConfig.amount : 0;
  const prefRate = hasPreference ? preferenceConfig.returnPercent / 100 : 0;
  const tenorMonths = Math.round(preferenceConfig.tenorMonths || 0);
  const stabilizationEndMonth = Math.round(
    preferenceConfig.stabilizationEndMonth || 0
  );
  const operationalFyeMonths = preferenceConfig.operationalFyeMonths ?? [];
  const payoutMonth =
    loanPayoffMonth != null ? loanPayoffMonth : tenorMonths;

  const prefDraws = new Array(H).fill(0);
  const prefDivs = new Array(H).fill(0);
  const prefPrincipalByMonth = new Array(H).fill(0);
  const commonDraw = new Array(H).fill(0);
  const commonDist = new Array(H).fill(0);

  if (!hasPreference) {
    for (let m = 0; m < H; m++) {
      commonDraw[m] = baseEquityInjections[m] ?? 0;
    }
    const dist = computeCommonDistributionByMonth({
      horizonMonths: H,
      hasPreference: false,
      prefPrincipal: 0,
      prefRate: 0,
      resolvedTenorMonths: 0,
      getMonthlyDataValue,
      monthlyDataForLoanDetection: monthlyData,
    });
    for (let m = 0; m < H; m++) {
      commonDist[m] = dist[m] ?? 0;
    }
  } else {
    const adj = calculatePreferenceAdjustments(
      baseEquityInjections,
      prefPrincipal,
      prefRate,
      tenorMonths,
      operationalFyeMonths,
      stabilizationEndMonth
    );

    for (let m = 0; m < H; m++) {
      commonDraw[m] = adj.adjustedEquityInjections[m] ?? 0;
      prefDraws[m] = adj.preferenceDraws[m] ?? 0;
      prefDivs[m] = adj.preferenceDividendsPaid[m] ?? 0;
    }

    const principalMonth = Math.min(
      Math.max(0, payoutMonth),
      H - 1
    );
    prefPrincipalByMonth[principalMonth] = prefPrincipal;

    for (let m = 0; m < H; m++) {
      const dist = monthlyDistributionsRaw[m] ?? 0;
      if (m < payoutMonth) {
        commonDist[m] = 0;
      } else if (m === payoutMonth) {
        commonDist[m] = Math.max(0, dist - prefPrincipal);
      } else {
        commonDist[m] = dist;
      }
    }
  }

  const tableRowsUncum: C5TableRow[] = [];
  for (let m = 0; m < H; m++) {
    const cd = Number(commonDraw[m] ?? 0) || 0;
    const pd = Number(prefDraws[m] ?? 0) || 0;
    const cDist = Number(commonDist[m] ?? 0) || 0;
    const pDist = Number(prefDivs[m] ?? 0) || 0;
    const pPrin = Number(prefPrincipalByMonth[m] ?? 0) || 0;

    const netEquityCF = cDist - cd;

    tableRowsUncum.push({
      month: m,
      prefDraw: pd,
      commonDraw: cd,
      totalDraw: pd + cd,
      prefDist: pDist,
      commonDist: cDist,
      promoteDist: 0,
      totalDist: cDist + pDist + pPrin,
      netEquityCF,
      cumulativeEquity: 0,
    });
  }

  let run = 0;
  const tableRows = tableRowsUncum.map((row) => {
    run += Number(row.netEquityCF ?? 0) || 0;
    return { ...row, cumulativeEquity: run };
  });

  const equityCashFlows = tableRows.map(
    (r) => Number(r.netEquityCF ?? 0) || 0
  );

  const irrPct = annualIrrPercentFromMonthlyNetEquityFlows(equityCashFlows);

  const totalCommonDraw = commonDraw.reduce((s, v) => s + Math.max(0, v), 0);
  const totalCommonDist = commonDist.reduce((s, v) => s + Math.max(0, v), 0);
  const multiple =
    totalCommonDraw > 1e-6 ? totalCommonDist / totalCommonDraw : 0;

  const payback = paybackMonthCrossingFromNegative(equityCashFlows);

  return {
    equityCashFlows,
    tableRows,
    metrics: {
      irr: irrPct,
      multiple,
      payback,
    },
    preferenceSchedule: {
      draws: prefDraws,
      dividends: prefDivs,
      principal: prefPrincipalByMonth,
    },
    baseEquityInjections,
    monthlyDistributionsRaw,
    loanPayoffMonth,
  };
}
