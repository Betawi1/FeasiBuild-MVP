/**
 * Single source of truth for construction-end month (C1 S-curve / C3 grid).
 * Component 4 timing must use this — never `financing.constructionPeriodMonths`
 * (that field defaults to 30 and goes stale).
 */

export const DEFAULT_FINANCING_CONSTRUCTION_PERIOD_MONTHS = 30;

export function lastNonZeroMonthIndex(
  series: ArrayLike<number> | undefined,
  eps = 1e-9
): number {
  if (!series || series.length === 0) return -1;
  for (let m = series.length - 1; m >= 0; m--) {
    if (Math.abs(Number(series[m]) || 0) > eps) return m;
  }
  return -1;
}

/**
 * Last month with construction cash (S-curve), else C1 `constructionPeriod`.
 * Never reads financing defaults.
 */
export function resolveActualConstructionEndMonth(
  cashOutflows: { constructionPeriod?: number },
  constructionSeries?: ArrayLike<number>
): number {
  const fromCurve = lastNonZeroMonthIndex(constructionSeries);
  if (fromCurve >= 0) return fromCurve;
  return Math.max(0, Math.floor(Number(cashOutflows.constructionPeriod) || 0));
}

/** Pre-op buffer last month and first operating month (same as C3). */
export function constructionPhaseMonths(
  actualConstructionEnd: number,
  preOpBufferMonths: number
): { preOpeningEnd: number; operationsStart: number } {
  const end = Math.max(0, Math.floor(actualConstructionEnd));
  const preOpeningEnd = end + preOpBufferMonths;
  return { preOpeningEnd, operationsStart: preOpeningEnd + 1 };
}

/**
 * Copy C1 into financing when the stored value is unset or the factory default
 * and C1 differs. Explicit non-default overrides are kept on the field
 * (timing still uses `resolveActualConstructionEndMonth`).
 */
export function alignStaleFinancingConstructionPeriod(
  stored: number | undefined | null,
  actualConstructionEnd: number
): number {
  const actual = Math.max(0, Math.round(Number(actualConstructionEnd) || 0));
  const s = Math.round(Number(stored) || 0);
  if (actual <= 0) {
    return s > 0 ? s : DEFAULT_FINANCING_CONSTRUCTION_PERIOD_MONTHS;
  }
  if (s <= 0) return actual;
  if (s === DEFAULT_FINANCING_CONSTRUCTION_PERIOD_MONTHS && actual !== s) {
    return actual;
  }
  return s;
}
