/**
 * Yearly cash-flow IRR / NPV helpers for operational project-IRR preview.
 * Discounting matches the NPV table: cash in column Y(t+1) uses factor (1+r)^(t+1), t = 0…n-1.
 */

export function calculateIRRYearly(
  cashFlows: number[],
  guess = 0.1,
  maxIterations = 100,
  toleranceAbs = 1
): { irr: number; iterations: number } {
  if (cashFlows.length === 0) {
    return { irr: NaN, iterations: 0 };
  }
  if (cashFlows.every((cf) => cf === 0)) {
    return { irr: 0, iterations: 0 };
  }

  const scale = Math.max(1, ...cashFlows.map((cf) => Math.abs(cf)));
  const tol = Math.max(toleranceAbs, 1e-7 * scale);

  let rate = guess;

  for (let iter = 0; iter < maxIterations; iter++) {
    let base = 1 + rate;
    if (base <= 1e-6) {
      rate = -0.5;
      base = 1 + rate;
    }

    let npv = 0;
    let dNpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const cf = cashFlows[t] ?? 0;
      const pow1 = Math.pow(base, t + 1);
      npv += cf / pow1;
      dNpv -= ((t + 1) * cf) / Math.pow(base, t + 2);
    }
    if (Math.abs(npv) < tol) {
      return { irr: rate, iterations: iter + 1 };
    }
    if (dNpv === 0 || !Number.isFinite(dNpv)) {
      return { irr: NaN, iterations: iter + 1 };
    }

    rate -= npv / dNpv;
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  return { irr: NaN, iterations: maxIterations };
}

export function calculateNPVYearly(
  cashFlows: number[],
  discountRate: number
): number {
  const base = 1 + discountRate;
  if (base <= 0) return 0;
  return cashFlows.reduce(
    (npv, cf, t) => npv + cf / Math.pow(base, t + 1),
    0
  );
}

export function calculateYearlyDiscountFactors(
  rate: number,
  years: number
): number[] {
  const base = 1 + rate;
  if (base <= 0) return Array.from({ length: years }, () => NaN);
  return Array.from({ length: years }, (_, t) => 1 / Math.pow(base, t + 1));
}

export function calculateCapitalMetrics(cashFlows: number[]) {
  const outflows = cashFlows
    .filter((cf) => cf < 0)
    .reduce((a, b) => a + b, 0);
  const inflows = cashFlows
    .filter((cf) => cf > 0)
    .reduce((a, b) => a + b, 0);
  const absOut = Math.abs(outflows);
  const equityMultiple = absOut > 0 ? inflows / absOut : 0;

  return {
    totalOutflows: absOut,
    totalInflows: inflows,
    equityMultiple,
  };
}
