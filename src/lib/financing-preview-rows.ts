/**
 * Horizon-aligned monthly series for Component 4 financing preview rows.
 *
 * Construction cash flows live on M0..M{constructionEndMonth} only. Any remainder
 * from the logistic S-curve (shares do not sum to 1) is NOT a post-completion
 * cash flow — TDC reconciliation belongs on `monthlyTotal` / Total Outflow.
 */

export type SparseConstructionScheduleEntry = {
  month?: number;
  m?: number;
  amount?: number;
  value?: number;
};

export function alignMonthlyPreviewRow(
  source: number[] | undefined,
  horizonMonths: number,
  lastInclusiveMonth: number
): number[] {
  const horizon = Math.max(0, Math.floor(horizonMonths));
  const last = Math.floor(lastInclusiveMonth);
  const row = new Array(horizon).fill(0);
  for (let m = 0; m < horizon; m++) {
    if (m <= last) row[m] = Number(source?.[m] ?? 0) || 0;
  }
  return row;
}

export function buildConstructionCostPreviewRow(args: {
  profileConstruction: number[] | undefined;
  sparseSchedule?: unknown;
  horizonMonths: number;
  constructionEndMonth: number;
}): number[] {
  const { profileConstruction, sparseSchedule, horizonMonths, constructionEndMonth } =
    args;
  const horizon = Math.max(0, Math.floor(horizonMonths));
  const end = Math.max(0, Math.floor(constructionEndMonth));
  const row = new Array(horizon).fill(0);

  if (Array.isArray(sparseSchedule) && sparseSchedule.length > 0) {
    for (const entry of sparseSchedule) {
      const rec = entry as SparseConstructionScheduleEntry;
      const month = Number(rec?.month ?? rec?.m ?? 0);
      const amount = Number(rec?.amount ?? rec?.value ?? 0);
      if (!Number.isFinite(month) || month < 0 || month >= horizon) continue;
      if (month > end) continue;
      row[month] += Number.isFinite(amount) ? amount : 0;
    }
    return row;
  }

  for (let m = 0; m <= end && m < horizon; m++) {
    row[m] = Number(profileConstruction?.[m] ?? 0) || 0;
  }
  return row;
}

export function sumMonthlyRow(row: number[]): number {
  return row.reduce((s, v) => s + (Number(v) || 0), 0);
}

/** Indices after construction end with a non-zero (the phantom-cell hunt). */
export function postConstructionNonZeroIndices(
  row: number[],
  constructionEndMonth: number,
  eps = 1e-6
): number[] {
  const extra: number[] = [];
  for (let m = constructionEndMonth + 1; m < row.length; m++) {
    if (Math.abs(Number(row[m]) || 0) > eps) extra.push(m);
  }
  return extra;
}

export function assertFinancingPreviewRow(args: {
  label: string;
  row: number[];
  horizonMonths: number;
  displayedTotal: number;
  constructionEndMonth?: number;
}): void {
  if (process.env.NODE_ENV !== "development") return;
  const { label, row, horizonMonths, displayedTotal, constructionEndMonth } = args;
  if (row.length !== horizonMonths) {
    // eslint-disable-next-line no-console
    console.error(
      `[preview-row] ${label}: length ${row.length} !== horizon ${horizonMonths}`
    );
  }
  const sum = sumMonthlyRow(row);
  if (Math.abs(sum - displayedTotal) > 0.5) {
    // eslint-disable-next-line no-console
    console.error(
      `[preview-row] ${label}: sum(row) ${sum} !== displayed total ${displayedTotal}`
    );
  }
  if (constructionEndMonth != null) {
    const extra = postConstructionNonZeroIndices(row, constructionEndMonth);
    if (extra.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `[preview-row] ${label}: non-zero after construction end M${constructionEndMonth}:`,
        extra.map((m) => ({ m, v: row[m] }))
      );
    }
  }
}

/** Dev-console diff: render series vs profile (Total Outflow's construction component). */
export function logConstructionRowVsCalc(args: {
  constructionRow: number[];
  profileConstruction: number[] | undefined;
  monthlyTotal: number[] | undefined;
  constructionEndMonth: number;
  horizonMonths: number;
}): void {
  if (process.env.NODE_ENV !== "development") return;
  const {
    constructionRow,
    profileConstruction,
    monthlyTotal,
    constructionEndMonth,
    horizonMonths,
  } = args;
  const calc = alignMonthlyPreviewRow(
    profileConstruction,
    horizonMonths,
    constructionEndMonth
  );
  const mismatched: { m: number; render: number; calc: number }[] = [];
  const n = Math.max(constructionRow.length, calc.length);
  for (let m = 0; m < n; m++) {
    const a = Number(constructionRow[m]) || 0;
    const b = Number(calc[m]) || 0;
    if (Math.abs(a - b) > 1) mismatched.push({ m, render: a, calc: b });
  }
  const extraOnRender = postConstructionNonZeroIndices(
    constructionRow,
    constructionEndMonth
  );
  const extraOnCalc = postConstructionNonZeroIndices(calc, constructionEndMonth);
  // eslint-disable-next-line no-console
  console.log("🔍 Construction Cost render vs calc (profile.construction):", {
    constructionEndMonth,
    extraNonZeroIndexOnRender: extraOnRender,
    extraNonZeroIndexOnCalc: extraOnCalc,
    mismatchedMonths: mismatched,
    monthlyTotalLen: monthlyTotal?.length ?? 0,
    constructionRowLen: constructionRow.length,
    calcLen: calc.length,
  });
}
