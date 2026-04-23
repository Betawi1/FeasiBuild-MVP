/**
 * FFE spread in proportion to construction cash each month (same S-curve weights).
 *
 * This matches the operational cash-outflows preview/export behavior.
 * Works for any construction period because it only relies on the provided
 * construction monthly series (typically M0..M{constructionPeriod}).
 */
export function allocateFfeMonthly(ffeTotal: number, construction: number[]): number[] {
  const tm = construction.length;
  const out = new Array(tm).fill(0);
  const S = construction.reduce((a, b) => a + b, 0);
  if (ffeTotal <= 0 || S <= 0) return out;
  for (let m = 0; m < tm; m++) {
    out[m] = (ffeTotal * (construction[m] || 0)) / S;
  }
  return out;
}

