import { getOperationalYearMonthRange } from "@/store/useFinModelStore";

export type MonthlyDataRowForDistributions = {
  month: number;
  equityInjection?: number;
  ncfPostFinancing?: number;
};

/**
 * Total common distributions for headline metrics: sum of NCF post-financing at each
 * operational FYE (end of OY1..OY10) from the first FYE **after** the later of
 * (last positive equity injection month, last negative NCF post month), through
 * the exit FYE (same exit year mapping as `/preview/financing`).
 */
export function computeTrueCommonDistributionsFromFyeNcf(params: {
  monthlyData: MonthlyDataRowForDistributions[] | undefined;
  constructionPeriod: number;
  /** Spreadsheet exit year Y4..Y13 (same clamp as financing preview). */
  exitYearSpreadsheet: number;
}): {
  total: number;
  lastEquityInjectionMonth: number;
  lastNegativeNcfPostMonth: number;
  firstDistributionFyeMonth: number | null;
  exitFyeMonth: number;
  /** The operating-year FYE months (end month indices) that were summed. */
  countedFyeMonths: number[];
  /** For each counted month, the NCF post used (0 when row missing). */
  countedFyeNcfPost: Array<{ month: number; ncfPostFinancing: number }>;
  /** Any expected counted months with missing rows in `monthlyData`. */
  missingCountedMonths: number[];
} {
  const { monthlyData, constructionPeriod, exitYearSpreadsheet } = params;
  const rows = [...(monthlyData ?? [])].sort((a, b) => a.month - b.month);
  if (!rows.length) {
    return {
      total: 0,
      lastEquityInjectionMonth: 0,
      lastNegativeNcfPostMonth: 0,
      firstDistributionFyeMonth: null,
      exitFyeMonth: 0,
      countedFyeMonths: [],
      countedFyeNcfPost: [],
      missingCountedMonths: [],
    };
  }

  let lastEquityInjectionMonth = 0;
  let lastNegativeNcfPostMonth = 0;
  for (const d of rows) {
    if ((d.equityInjection ?? 0) > 0) lastEquityInjectionMonth = d.month;
    if ((d.ncfPostFinancing ?? 0) < 0) lastNegativeNcfPostMonth = d.month;
  }
  const cutoff = Math.max(lastEquityInjectionMonth, lastNegativeNcfPostMonth);

  const exitOy = Math.min(10, Math.max(1, exitYearSpreadsheet - 3));
  const exitFyeMonth = getOperationalYearMonthRange(
    exitOy,
    constructionPeriod
  ).endMonth;

  const fyeEndMonths: number[] = [];
  for (let oy = 1; oy <= 10; oy++) {
    fyeEndMonths.push(
      getOperationalYearMonthRange(oy, constructionPeriod).endMonth
    );
  }

  const firstDistributionFyeMonth =
    fyeEndMonths.find((m) => m > cutoff) ?? null;

  if (firstDistributionFyeMonth == null) {
    return {
      total: 0,
      lastEquityInjectionMonth,
      lastNegativeNcfPostMonth,
      firstDistributionFyeMonth: null,
      exitFyeMonth,
      countedFyeMonths: [],
      countedFyeNcfPost: [],
      missingCountedMonths: [],
    };
  }

  const byMonth = new Map<number, MonthlyDataRowForDistributions>();
  for (const r of rows) byMonth.set(r.month, r);

  let total = 0;
  const countedFyeMonths: number[] = [];
  const countedFyeNcfPost: Array<{ month: number; ncfPostFinancing: number }> = [];
  const missingCountedMonths: number[] = [];
  for (const endM of fyeEndMonths) {
    if (endM < firstDistributionFyeMonth || endM > exitFyeMonth) continue;
    countedFyeMonths.push(endM);
    const row = byMonth.get(endM);
    const ncfPost = row?.ncfPostFinancing ?? 0;
    if (!row) missingCountedMonths.push(endM);
    countedFyeNcfPost.push({ month: endM, ncfPostFinancing: ncfPost });
    total += ncfPost;
  }

  return {
    total,
    lastEquityInjectionMonth,
    lastNegativeNcfPostMonth,
    firstDistributionFyeMonth,
    exitFyeMonth,
    countedFyeMonths,
    countedFyeNcfPost,
    missingCountedMonths,
  };
}
