/**
 * IRR / multiple / payback on uniform month-end equity cash-flow series.
 */

function npvMonthly(rate: number, amounts: number[]): number {
  let s = 0;
  for (let t = 0; t < amounts.length; t++) {
    s += amounts[t] / Math.pow(1 + rate, t);
  }
  return s;
}

function dNpvMonthly(rate: number, amounts: number[]): number {
  let s = 0;
  for (let t = 1; t < amounts.length; t++) {
    s -= (t * amounts[t]) / Math.pow(1 + rate, t + 1);
  }
  return s;
}

/**
 * Monthly period IRR (not annualized) on month indices 0..n-1.
 * Uses scale-aware NPV tolerance (large project cash flows fail with fixed 1e-7),
 * multiple Newton starting points, and bisection fallback.
 */
export function monthlyIrrFromSeries(amounts: number[]): number | null {
  if (amounts.length < 2) return null;
  const hasNeg = amounts.some((cf) => cf < 0);
  const hasPos = amounts.some((cf) => cf > 0);
  if (!hasNeg || !hasPos) return null;

  const scale = Math.max(
    1,
    amounts.reduce((a, b) => a + Math.abs(b), 0)
  );
  const absTol = Math.max(1e-9 * scale, 0.01);

  const tryNewton = (initial: number): number | null => {
    let rate = initial;
    for (let i = 0; i < 200; i++) {
      const npv = npvMonthly(rate, amounts);
      if (Math.abs(npv) < absTol) return rate;
      const deriv = dNpvMonthly(rate, amounts);
      if (!Number.isFinite(npv) || !Number.isFinite(deriv)) return null;
      if (Math.abs(deriv) < 1e-20) return null;
      const next = rate - npv / deriv;
      if (!Number.isFinite(next) || next <= -0.999999) return null;
      if (Math.abs(next - rate) < 1e-14) {
        if (Math.abs(npvMonthly(next, amounts)) < absTol) return next;
        return null;
      }
      rate = next;
    }
    return Math.abs(npvMonthly(rate, amounts)) < absTol ? rate : null;
  };

  for (const guess of [
    0.0005, 0.001, 0.002, 0.004, 0.006, 0.008, 0.01, 0.015, 0.02, 0.03,
    0.04, 0.05, 0.07, 0.1, 0.12, 0.15, 0.18, 0.22, 0.28, 0.35,
  ]) {
    const r = tryNewton(guess);
    if (r != null && r > -1 && r < 50) return r;
  }

  // Bisection: bracket a root of NPV(r)=0 for r > -1
  let lo = -0.999;
  let hi = 0.5;
  let vLo = npvMonthly(lo, amounts);
  let vHi = npvMonthly(hi, amounts);

  let expand = 0;
  while (vLo * vHi > 0 && hi < 80 && expand < 120) {
    hi = hi * 1.15 + 0.01;
    vHi = npvMonthly(hi, amounts);
    expand++;
    if (!Number.isFinite(vHi)) break;
  }

  if (vLo * vHi > 0) {
    lo = 0;
    vLo = npvMonthly(lo, amounts);
    hi = 0.02;
    vHi = npvMonthly(hi, amounts);
    expand = 0;
    while (vLo * vHi > 0 && hi < 80 && expand < 200) {
      hi += 0.02;
      vHi = npvMonthly(hi, amounts);
      expand++;
    }
  }

  if (!Number.isFinite(vLo) || !Number.isFinite(vHi) || vLo * vHi > 0) {
    return null;
  }

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const vm = npvMonthly(mid, amounts);
    if (Math.abs(vm) < absTol) return mid;
    if (vLo * vm <= 0) {
      hi = mid;
      vHi = vm;
    } else {
      lo = mid;
      vLo = vm;
    }
    if (hi - lo < 1e-14) return (lo + hi) / 2;
  }

  return (lo + hi) / 2;
}

/** Monthly IRR (decimal per month), or 0 if not solvable. */
export function calculateMonthlyIRR(amounts: number[]): number {
  return monthlyIrrFromSeries(amounts) ?? 0;
}

/** Annual IRR in percent (e.g. 19.5 means 19.5% p.a.). */
export function annualIrrPercentFromMonthlySeries(amounts: number[]): number | null {
  const m = monthlyIrrFromSeries(amounts);
  if (m == null) return null;
  return (Math.pow(1 + m, 12) - 1) * 100;
}

export function equityMultipleFromSeries(amounts: number[]): number | null {
  if (!amounts.length) return null;
  const out = amounts.filter((c) => c < 0).reduce((s, c) => s + c, 0);
  const inn = amounts.filter((c) => c > 0).reduce((s, c) => s + c, 0);
  if (out === 0) return null;
  return inn / Math.abs(out);
}

/** First month index (0-based) when cumulative CF turns non-negative. */
export function paybackMonthFromSeries(amounts: number[]): number | null {
  let cum = 0;
  for (let t = 0; t < amounts.length; t++) {
    cum += amounts[t];
    if (cum >= 0) return t;
  }
  return null;
}

/**
 * First month index when cumulative CF crosses from negative to non-negative,
 * requiring `t >= 1` so an all-positive or zero M0 does not yield payback at M0.
 */
export function paybackMonthCrossingFromNegative(amounts: number[]): number | null {
  let cum = 0;
  for (let t = 0; t < amounts.length; t++) {
    const prevCum = cum;
    cum += amounts[t];
    if (t >= 1 && cum >= 0 && prevCum < 0) return t;
  }
  return null;
}

/** Month-end cumulative cash (same length as input). */
export function cumulativeSeries(amounts: number[]): number[] {
  const out: number[] = [];
  let s = 0;
  for (const cf of amounts) {
    s += cf;
    out.push(s);
  }
  return out;
}

export function sumNegativeFlows(amounts: number[]): number {
  return amounts.filter((c) => c < 0).reduce((s, c) => s + c, 0);
}

export function sumPositiveFlows(amounts: number[]): number {
  return amounts.filter((c) => c > 0).reduce((s, c) => s + c, 0);
}
