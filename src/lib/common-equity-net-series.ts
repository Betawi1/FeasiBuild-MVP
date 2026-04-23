import type { WaterfallCashFlows } from "./waterfall";

export type MonthlyDataField =
  | "equityInjection"
  | "ncfPostFinancing"
  | "cumulativeNcfPostFinancing";

export function getMonthlyDataValueFromStore(
  monthlyData:
    | Array<{
        month: number;
        equityInjection?: number;
        ncfPostFinancing?: number;
        cumulativeNcfPostFinancing?: number;
        principalRepayment?: number;
      }>
    | undefined,
  month: number,
  field: MonthlyDataField
): number {
  const row = monthlyData?.find((d) => d.month === month);
  return row?.[field] || 0;
}

/** Last month index where loan principal was repaid (from Row E in /preview/financing). */
export function getLoanRepaymentMonthFromMonthlyData(
  monthlyData: Array<{ month: number; principalRepayment?: number }> | undefined
): number | null {
  let last: number | null = null;
  for (const row of monthlyData ?? []) {
    if (Math.abs(row.principalRepayment ?? 0) > 0) {
      last = row.month;
    }
  }
  return last;
}

/**
 * Common distributions for the simplified preference model (aligned with preview table).
 */
export function computeCommonDistributionByMonth(params: {
  horizonMonths: number;
  hasPreference: boolean;
  prefPrincipal: number;
  prefRate: number;
  resolvedTenorMonths: number;
  getMonthlyDataValue: (month: number, field: MonthlyDataField) => number;
  /** When preference is off: gate distributions until loan is repaid (uses `principalRepayment`). */
  monthlyDataForLoanDetection?:
    | Array<{ month: number; principalRepayment?: number }>
    | undefined;
}): number[] {
  const {
    horizonMonths,
    hasPreference,
    prefPrincipal,
    prefRate,
    resolvedTenorMonths,
    getMonthlyDataValue,
    monthlyDataForLoanDetection,
  } = params;

  if (horizonMonths <= 0) return [];

  const out: number[] = new Array(horizonMonths).fill(0);
  const principal = hasPreference ? prefPrincipal : 0;
  const tenorMonth = resolvedTenorMonths;

  if (hasPreference) {
    const cumAtTenor = getMonthlyDataValue(
      tenorMonth,
      "cumulativeNcfPostFinancing"
    );
    const cumAtM48 = getMonthlyDataValue(48, "cumulativeNcfPostFinancing");
    const peakCum = Math.max(cumAtTenor, cumAtM48);

    // Preference dividends are funded via additional equity injections (draws),
    // not deducted from project cash distributions at the tenor month.
    const commonAtTenor = Math.max(0, peakCum - principal);
    out[tenorMonth] = commonAtTenor;

    for (let m = tenorMonth + 1; m < horizonMonths; m++) {
      out[m] = Math.max(0, getMonthlyDataValue(m, "ncfPostFinancing"));
    }

    return out;
  }

  // No preference: cumulative NCF at loan payoff month, then monthly NCF (matches Component 5 preview).
  const loanRepaymentMonth = getLoanRepaymentMonthFromMonthlyData(
    monthlyDataForLoanDetection
  );
  if (loanRepaymentMonth != null) {
    for (let m = 0; m < horizonMonths; m++) {
      if (m < loanRepaymentMonth) {
        out[m] = 0;
      } else if (m === loanRepaymentMonth) {
        out[m] = Math.max(
          0,
          getMonthlyDataValue(m, "cumulativeNcfPostFinancing")
        );
      } else {
        out[m] = Math.max(0, getMonthlyDataValue(m, "ncfPostFinancing"));
      }
    }
    return out;
  }

  for (let m = 0; m < horizonMonths; m++) {
    out[m] = Math.max(0, getMonthlyDataValue(m, "ncfPostFinancing"));
  }
  return out;
}

export type CommonEquityTableRow = {
  month: number;
  prefDraw: number;
  commonDraw: number;
  totalDraw: number;
  prefDist: number;
  commonDist: number;
  promoteDist: number;
  totalDist: number;
  netEquityCF: number;
};

export function buildCommonEquityTableRows(params: {
  horizonMonths: number;
  waterfall: WaterfallCashFlows;
  commonDistributionByMonth: number[];
  /**
   * Optional: extra common draw amount to force-count in months where the net common cash flow is positive.
   * Used to reflect preference coupons that are funded via additional equity injection even if offset by a
   * same-month distribution (e.g. exit month M166).
   */
  extraCommonDrawByMonth?: number[];
}): CommonEquityTableRow[] {
  const { horizonMonths, waterfall, commonDistributionByMonth, extraCommonDrawByMonth } =
    params;
  if (horizonMonths <= 0) return [];

  return Array.from({ length: horizonMonths }, (_, idx) => {
    const pcf = waterfall.preferenceCashFlows[idx] ?? 0;
    const ccf = waterfall.commonCashFlows[idx] ?? 0;
    const prefDraw = pcf < 0 ? -pcf : 0;
    const commonDrawBase = ccf < 0 ? -ccf : 0;
    const extra = Math.max(0, extraCommonDrawByMonth?.[idx] ?? 0);
    // Avoid double-counting months where common cash flow is already negative (draw).
    // Only "force-count" extra draw when the net common cash flow is non-negative.
    const commonDraw = commonDrawBase + (commonDrawBase > 0 ? 0 : extra);
    const prefDist = pcf > 0 ? pcf : 0;
    const commonDist =
      commonDistributionByMonth[idx] ?? (ccf > 0 ? ccf : 0);
    const totalDraw = prefDraw + commonDraw;
    const totalDist = prefDist + commonDist;
    const commonDrawsForNet = Math.max(0, totalDraw - prefDraw);
    const netEquityCF = commonDist - commonDrawsForNet;
    return {
      month: idx,
      prefDraw,
      commonDraw,
      totalDraw,
      prefDist,
      commonDist,
      promoteDist: 0,
      totalDist,
      netEquityCF,
    };
  });
}

export function cumulativeNetEquityFromRows(
  rows: CommonEquityTableRow[]
): Array<CommonEquityTableRow & { cumulativeEquity: number }> {
  let cumulative = 0;
  return rows.map((row) => {
    cumulative += row.netEquityCF;
    return { ...row, cumulativeEquity: cumulative };
  });
}

/**
 * Monthly net common equity cash flows (distributions − common draws).
 * Same as `/preview/equity-returns` table `NET EQUITY CF` / Summary & Multiple metrics.
 */
export function buildCommonEquityCashFlows(params: {
  horizonMonths: number;
  waterfall: WaterfallCashFlows;
  commonDistributionByMonth: number[];
}): number[] {
  return buildCommonEquityTableRows(params).map((r) => r.netEquityCF);
}

/** @deprecated Use `buildCommonEquityCashFlows` (identical). */
export function buildCommonEquityNetCashFlowsFromWaterfall(
  params: Parameters<typeof buildCommonEquityCashFlows>[0]
): number[] {
  return buildCommonEquityCashFlows(params);
}
