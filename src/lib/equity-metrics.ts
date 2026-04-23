import {
  paybackMonthCrossingFromNegative,
} from "@/lib/equity-irr";
import { solveAnnualIRRPreferred, type CashFlowPoint } from "@/lib/irr-calculations";
import { computeTrueCommonDistributionsFromFyeNcf } from "@/lib/true-common-distributions";

export type CommonEquityMetrics = {
  peakCommonEquity: number;
  totalCommonEquityInvested: number;
  totalCommonDistributions: number;
  /** Annual IRR in percent (e.g. 11.58 means 11.58% p.a.). */
  commonEquityIrrPct: number;
  /** NPV at solved IRR (should be ~0). */
  npvAtIrr: number;
  commonEquityMultiple: number;
  /** Month index (M#) or null if never crosses. */
  commonEquityPaybackMonth: number | null;
  /** Cash-flow array used for IRR/payback, indexed by month 0..exitFyeMonth. */
  equityCashFlowsByMonth: number[];
  /** Distribution logic details for debugging/UX. */
  distributionMeta: ReturnType<typeof computeTrueCommonDistributionsFromFyeNcf>;
};

export type MonthlyDataRow = {
  month: number;
  equityInjection?: number;
  ncfPostFinancing?: number;
};

/**
 * Shared headline common-equity KPI logic for BOTH:
 * - Component 5 (`/equity-returns`)
 * - Preview equity returns (`/preview/equity-returns`)
 *
 * Rules:
 * - Peak common equity = max cumulative sum of equity injections (Row G running sum).
 * - Total invested = sum of equity injections (Row G).
 * - Total distributions = sum of NCF post at op-year FYE months after the later of:
 *   last equity injection month and last negative NCF post month, through exit FYE.
 * - IRR/payback are computed from a monthly cash-flow array:
 *   equity injections are negative until distributions start; distributions are only
 *   recognized at the counted FYE months (other months are 0).
 */
export function calculateCommonEquityMetrics(params: {
  monthlyData: MonthlyDataRow[] | undefined;
  constructionPeriod: number;
  exitYear?: number | null | undefined; // spreadsheet exit year Y4..Y13
}): CommonEquityMetrics | null {
  const { monthlyData, constructionPeriod, exitYear } = params;
  const md = [...(monthlyData ?? [])].sort((a, b) => a.month - b.month);
  if (!md.length) return null;

  const exitYearSpreadsheet = Math.max(
    4,
    Math.min(13, Math.round(Number(exitYear ?? 13) || 13))
  );

  const distributionMeta = computeTrueCommonDistributionsFromFyeNcf({
    monthlyData: md,
    constructionPeriod,
    exitYearSpreadsheet,
  });

  // Totals / peak from Row G.
  let totalCommonEquityInvested = 0;
  let cum = 0;
  let peakCommonEquity = 0;
  for (const r of md) {
    const eq = r.equityInjection ?? 0;
    totalCommonEquityInvested += eq;
    cum += eq;
    peakCommonEquity = Math.max(peakCommonEquity, cum);
  }

  const totalCommonDistributions = distributionMeta.total;

  // Build IRR/payback cash-flow series on months 0..exitFyeMonth.
  const byMonth = new Map<number, MonthlyDataRow>();
  for (const r of md) byMonth.set(r.month, r);

  const exitFyeMonth = distributionMeta.exitFyeMonth;
  const firstDistFye =
    distributionMeta.firstDistributionFyeMonth ?? (exitFyeMonth + 1);
  const counted = new Set(distributionMeta.countedFyeMonths);

  const equityCashFlowsByMonth: number[] = new Array(exitFyeMonth + 1).fill(0);
  for (let m = 0; m <= exitFyeMonth; m++) {
    const row = byMonth.get(m);
    const eq = row?.equityInjection ?? 0;
    const ncfPost = row?.ncfPostFinancing ?? 0;
    if (m < firstDistFye) {
      equityCashFlowsByMonth[m] = -Math.max(0, eq);
    } else {
      equityCashFlowsByMonth[m] = counted.has(m) ? ncfPost : 0;
    }
  }

  const irrPoints: CashFlowPoint[] = equityCashFlowsByMonth.map((amount, month) => ({
    month,
    amount,
  }));
  // Solve annual IRR directly from the definition Σ CF_t / (1+IRR)^(t/12) = 0.
  const solved = solveAnnualIRRPreferred(irrPoints, {
    tolerance: 1000,
    maxIterations: 250,
    selection: "max", // when multiple IRR roots exist, use the higher one (matches Python result)
    preferredAnnualIRR: 0.125,
  });
  const commonEquityIrrPct =
    solved.annualIRR != null && Number.isFinite(solved.annualIRR)
      ? solved.annualIRR * 100
      : 0;
  const commonEquityPaybackMonth =
    paybackMonthCrossingFromNegative(equityCashFlowsByMonth);

  const commonEquityMultiple =
    totalCommonEquityInvested > 0
      ? totalCommonDistributions / totalCommonEquityInvested
      : 0;

  return {
    peakCommonEquity,
    totalCommonEquityInvested,
    totalCommonDistributions,
    commonEquityIrrPct,
    npvAtIrr: solved.npvAtIRR,
    commonEquityMultiple,
    commonEquityPaybackMonth,
    equityCashFlowsByMonth,
    distributionMeta,
  };
}

