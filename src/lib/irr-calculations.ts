import {
  buildCashOutflowProfile,
  type CashInflows,
  type CashOutflows,
  type MonthlyCashFlowPoint,
} from "@/store/useFinModelStore";

export type CashFlowPoint = {
  month: number;
  /**
   * Positive = net inflow for the month, Negative = net outflow for the month.
   * This is the same sign convention used across the IRR computations in previews/wizard.
   */
  amount: number;
};

function computeNPVAnnualRate(
  annualIRR: number,
  cashFlows: CashFlowPoint[]
): number {
  const onePlus = 1 + annualIRR;
  if (onePlus <= 0) return Number.POSITIVE_INFINITY;
  return cashFlows.reduce((sum, cf) => sum + cf.amount / Math.pow(onePlus, cf.month / 12), 0);
}

export const solveAnnualIRR = (
  cashFlows: CashFlowPoint[],
  tolerance = 1e-7,
  maxIterations = 100
): {
  annualIRR: number | null; // decimal (e.g. 0.1024 for 10.24%)
  monthlyIRR: number | null; // decimal (e.g. 0.0085 per month)
  iterations: number;
  npvAtIRR: number;
} => {
  if (!cashFlows.length || cashFlows.length < 2) {
    return { annualIRR: null, monthlyIRR: null, iterations: 0, npvAtIRR: 0 };
  }

  const hasPos = cashFlows.some((v) => v.amount > 0);
  const hasNeg = cashFlows.some((v) => v.amount < 0);
  if (!hasPos || !hasNeg) {
    return { annualIRR: null, monthlyIRR: null, iterations: 0, npvAtIRR: computeNPVAnnualRate(0, cashFlows) };
  }

  // Bracket the root via scan (bisection requires NPV to change sign).
  const minRate = -0.9;
  const maxRate = 2.0;
  const scanSteps = 250;

  let leftRate = minRate;
  let leftNpv = computeNPVAnnualRate(leftRate, cashFlows);
  let rightRate: number | null = null;
  let rightNpv = 0;

  for (let i = 1; i <= scanSteps; i++) {
    const r = minRate + ((maxRate - minRate) * i) / scanSteps;
    const npv = computeNPVAnnualRate(r, cashFlows);
    if (!Number.isFinite(npv) || !Number.isFinite(leftNpv)) {
      leftRate = r;
      leftNpv = npv;
      continue;
    }

    if (leftNpv === 0) {
      rightRate = null;
      rightNpv = 0;
      return {
        annualIRR: leftRate,
        monthlyIRR: Math.pow(1 + leftRate, 1 / 12) - 1,
        iterations: 0,
        npvAtIRR: 0,
      };
    }

    if (npv === 0) {
      return {
        annualIRR: r,
        monthlyIRR: Math.pow(1 + r, 1 / 12) - 1,
        iterations: 0,
        npvAtIRR: 0,
      };
    }

    if (leftNpv * npv < 0) {
      rightRate = r;
      rightNpv = npv;
      break;
    }

    leftRate = r;
    leftNpv = npv;
  }

  if (rightRate == null || !Number.isFinite(leftNpv) || !Number.isFinite(rightNpv)) {
    return { annualIRR: null, monthlyIRR: null, iterations: 0, npvAtIRR: leftNpv };
  }

  let low = leftRate;
  let high = rightRate;
  let npvLow = leftNpv;
  let npvHigh = rightNpv;

  let iterations = 0;
  let mid = (low + high) / 2;
  let npvMid = computeNPVAnnualRate(mid, cashFlows);

  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1;
    npvMid = computeNPVAnnualRate(mid, cashFlows);
    if (!Number.isFinite(npvMid)) break;

    if (Math.abs(npvMid) <= tolerance) break;

    if (npvLow * npvMid <= 0) {
      high = mid;
      npvHigh = npvMid;
    } else {
      low = mid;
      npvLow = npvMid;
    }

    mid = (low + high) / 2;
  }

  const annualIRR = mid;
  const monthlyIRR = Math.pow(1 + annualIRR, 1 / 12) - 1;

  return { annualIRR, monthlyIRR, iterations, npvAtIRR: npvMid };
};

/**
 * Solve annual IRR but select among multiple possible roots.
 * When cash flows have multiple sign changes, NPV(r)=0 can have multiple solutions.
 * This helper scans for *all* brackets then chooses the root closest to `preferredAnnualIRR`.
 */
export const solveAnnualIRRPreferred = (
  cashFlows: CashFlowPoint[],
  options?: {
    /** Absolute NPV tolerance in currency units. */
    tolerance?: number;
    maxIterations?: number;
    /** Root selection anchor; pick the root closest to this (default 0.12). */
    preferredAnnualIRR?: number;
    /** How to choose among multiple roots. */
    selection?: "closest" | "max";
    /** Search range for annual IRR roots. */
    minRate?: number;
    maxRate?: number;
    scanSteps?: number;
  }
): {
  annualIRR: number | null;
  monthlyIRR: number | null;
  iterations: number;
  npvAtIRR: number;
  /** All candidate roots found in scan range. */
  candidates: Array<{ annualIRR: number; npvAtIRR: number }>;
} => {
  const tol = options?.tolerance ?? 1e-7;
  const maxIts = options?.maxIterations ?? 200;
  const preferred = options?.preferredAnnualIRR ?? 0.12;
  const selection = options?.selection ?? "closest";
  const minRate = options?.minRate ?? -0.9;
  const maxRate = options?.maxRate ?? 2.0;
  const scanSteps = options?.scanSteps ?? 500;

  if (!cashFlows.length || cashFlows.length < 2) {
    return {
      annualIRR: null,
      monthlyIRR: null,
      iterations: 0,
      npvAtIRR: 0,
      candidates: [],
    };
  }

  const hasPos = cashFlows.some((v) => v.amount > 0);
  const hasNeg = cashFlows.some((v) => v.amount < 0);
  if (!hasPos || !hasNeg) {
    const npv0 = computeNPVAnnualRate(0, cashFlows);
    return {
      annualIRR: null,
      monthlyIRR: null,
      iterations: 0,
      npvAtIRR: npv0,
      candidates: [],
    };
  }

  const npvAt = (r: number) => computeNPVAnnualRate(r, cashFlows);

  // Collect all brackets where NPV changes sign.
  const brackets: Array<{ lo: number; hi: number; vLo: number; vHi: number }> = [];
  let prevR = minRate;
  let prevV = npvAt(prevR);
  for (let i = 1; i <= scanSteps; i++) {
    const r = minRate + ((maxRate - minRate) * i) / scanSteps;
    const v = npvAt(r);
    if (!Number.isFinite(prevV) || !Number.isFinite(v)) {
      prevR = r;
      prevV = v;
      continue;
    }
    if (prevV === 0) {
      brackets.push({ lo: prevR, hi: prevR, vLo: 0, vHi: 0 });
    } else if (v === 0) {
      brackets.push({ lo: r, hi: r, vLo: 0, vHi: 0 });
    } else if (prevV * v < 0) {
      brackets.push({ lo: prevR, hi: r, vLo: prevV, vHi: v });
    }
    prevR = r;
    prevV = v;
  }

  const candidates: Array<{ annualIRR: number; npvAtIRR: number }> = [];

  const bisect = (lo0: number, hi0: number, vLo0: number, vHi0: number) => {
    if (lo0 === hi0) return { r: lo0, npv: 0, iters: 0 };
    let lo = lo0;
    let hi = hi0;
    let vLo = vLo0;
    let vHi = vHi0;
    let mid = (lo + hi) / 2;
    let vMid = npvAt(mid);
    let iters = 0;
    for (let i = 0; i < maxIts; i++) {
      iters = i + 1;
      vMid = npvAt(mid);
      if (!Number.isFinite(vMid)) break;
      if (Math.abs(vMid) <= tol) break;
      if (vLo * vMid <= 0) {
        hi = mid;
        vHi = vMid;
      } else {
        lo = mid;
        vLo = vMid;
      }
      mid = (lo + hi) / 2;
    }
    return { r: mid, npv: vMid, iters };
  };

  for (const b of brackets) {
    if (b.lo === b.hi) {
      candidates.push({ annualIRR: b.lo, npvAtIRR: 0 });
      continue;
    }
    const out = bisect(b.lo, b.hi, b.vLo, b.vHi);
    if (Number.isFinite(out.r) && out.r > -0.999 && out.r < 50 && Number.isFinite(out.npv)) {
      candidates.push({ annualIRR: out.r, npvAtIRR: out.npv });
    }
  }

  if (!candidates.length) {
    const npv0 = npvAt(preferred);
    return {
      annualIRR: null,
      monthlyIRR: null,
      iterations: 0,
      npvAtIRR: npv0,
      candidates: [],
    };
  }

  if (selection === "max") {
    candidates.sort((a, b) => {
      if (a.annualIRR !== b.annualIRR) return b.annualIRR - a.annualIRR;
      return Math.abs(a.npvAtIRR) - Math.abs(b.npvAtIRR);
    });
  } else {
    // Choose closest-to-preferred root (tie-breaker: smaller |NPV|, then higher IRR).
    candidates.sort((a, b) => {
      const da = Math.abs(a.annualIRR - preferred);
      const db = Math.abs(b.annualIRR - preferred);
      if (da !== db) return da - db;
      const na = Math.abs(a.npvAtIRR);
      const nb = Math.abs(b.npvAtIRR);
      if (na !== nb) return na - nb;
      return b.annualIRR - a.annualIRR;
    });
  }

  const chosen = candidates[0]!;
  return {
    annualIRR: chosen.annualIRR,
    monthlyIRR: Math.pow(1 + chosen.annualIRR, 1 / 12) - 1,
    iterations: 0,
    npvAtIRR: chosen.npvAtIRR,
    candidates,
  };
};

export const calculateEquityMultiple = (cashFlows: CashFlowPoint[]) => {
  const totalInflows = cashFlows.filter((cf) => cf.amount > 0).reduce((s, cf) => s + cf.amount, 0);
  const totalOutflows = Math.abs(cashFlows.filter((cf) => cf.amount < 0).reduce((s, cf) => s + cf.amount, 0));
  if (totalOutflows === 0) return null;
  return totalInflows / totalOutflows;
};

export const calculatePaybackPeriodMonths = (
  cashFlows: CashFlowPoint[]
): number | null => {
  let cumulative = 0;
  for (const cf of cashFlows) {
    cumulative += cf.amount;
    if (cumulative >= 0) return cf.month;
  }
  return null;
};

export const calculatePeakFunding = (cashFlows: CashFlowPoint[]): number => {
  let cumulative = 0;
  let minCumulative = 0;
  for (const cf of cashFlows) {
    cumulative += cf.amount;
    if (cumulative < minCumulative) minCumulative = cumulative;
  }
  return Math.abs(minCumulative);
};

export const buildCashFlowArray = (
  cashOutflows: CashOutflows,
  cashInflows: CashInflows,
  constructionPeriod: number,
  postCompletionBuffer = 6
): CashFlowPoint[] => {
  const totalMonths = constructionPeriod + postCompletionBuffer; // last month index
  const outflowProfile = buildCashOutflowProfile(cashOutflows);

  const inflowSchedule = cashInflows.monthlyInflowSchedule || [];
  const inflowMap = new Map<number, number>();
  for (const p of inflowSchedule as MonthlyCashFlowPoint[]) {
    inflowMap.set(p.month, (inflowMap.get(p.month) || 0) + (p.amount || 0));
  }

  const flows: CashFlowPoint[] = [];
  for (let m = 0; m <= totalMonths; m++) {
    const inflow = inflowMap.get(m) || 0;
    const outflow = m <= constructionPeriod ? outflowProfile.monthlyTotal[m] || 0 : 0;
    flows.push({ month: m, amount: inflow - outflow });
  }

  return flows;
};

