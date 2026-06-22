export type AnnualCashFlowPoint = {
  year: string;
  value: number;
};

/**
 * Aggregates monthly cash flow into yearly buckets (Al Arabiya schedule convention).
 * Year 1 = M0–M12 (13 months inclusive); Year 2+ = 12-month blocks; stub tail = final year.
 */
export function aggregateMonthlyToYearly(
  monthlyData: number[]
): AnnualCashFlowPoint[] {
  if (monthlyData.length === 0) return [];

  const yearlyData: AnnualCashFlowPoint[] = [];
  let yearIndex = 1;
  let i = 0;

  while (i < monthlyData.length) {
    const endIndex =
      yearIndex === 1
        ? Math.min(12, monthlyData.length - 1)
        : Math.min(i + 11, monthlyData.length - 1);

    let sum = 0;
    for (let j = i; j <= endIndex; j++) {
      sum += monthlyData[j] ?? 0;
    }

    yearlyData.push({ year: `Year ${yearIndex}`, value: sum });
    yearIndex += 1;
    i = endIndex + 1;
  }

  return yearlyData;
}

/** Converts monthly cash flow (M0…) into annual buckets; stub final period counts as full year. */
export function annualizeCashFlow(
  monthlyData: number[],
  startMonth: number = 0
): AnnualCashFlowPoint[] {
  const annualData: AnnualCashFlowPoint[] = [];
  let yearIndex = 1;
  let currentYearSum = 0;
  let monthsInCurrentYear = 0;

  for (let i = startMonth; i < monthlyData.length; i++) {
    currentYearSum += monthlyData[i] ?? 0;
    monthsInCurrentYear += 1;

    if (monthsInCurrentYear === 12 || i === monthlyData.length - 1) {
      annualData.push({
        year: `Year ${yearIndex}`,
        value: currentYearSum,
      });
      yearIndex += 1;
      currentYearSum = 0;
      monthsInCurrentYear = 0;
    }
  }

  return annualData;
}

/** Running total by annual period (for Cumulative NCF row). */
export function cumulativeAnnualSeries(
  annual: AnnualCashFlowPoint[]
): AnnualCashFlowPoint[] {
  let running = 0;
  return annual.map((row) => {
    running += row.value;
    return { year: row.year, value: running };
  });
}

export function formatThousands(
  value: number,
  decimals = 0
): string {
  const k = value / 1000;
  return k.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

export function pctOfTotal(value: number, total: number): string {
  if (!total) return "—";
  return `${Math.round((value / total) * 1000) / 10}%`;
}
