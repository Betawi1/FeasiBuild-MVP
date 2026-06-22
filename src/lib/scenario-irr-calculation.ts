/**
 * Levered equity IRR for Component 6 — aligned with Component 4 (C4) methodology:
 * monthly equity injections (land + cash) as outflows, terminal cumulative NCF post-financing at exit.
 */

import { annualIrrPercentFromMonthlySeries } from "@/lib/equity-irr";
import { buildCashFlowArray } from "@/lib/irr-calculations";
import type { FinancingMetrics } from "@/store/financingStore";
import type {
  CashInflows,
  CashOutflows,
  ProjectIRR,
} from "@/store/useFinModelStore";

export type LegacyOperationalShocks = Partial<{
  adr: number;
  occupancy: number;
  constructionCost: number;
  constructionDuration: number;
  interestRate: number;
  operatingExpenses: number;
  exitCapRate: number;
  ffeReserve: number;
}>;

type MonthlyFinancingRow = {
  month?: number;
  equityInjection?: number;
  landEquityInjection?: number;
  cashEquityInjection?: number;
  cumulativeNcfPostFinancing?: number;
};

/** Same series as `c4.levered.engine` `leveredEquityMonthlyCashFlows`. */
export function buildLeveredEquityCashFlowsFromMonthlyData(
  monthlyData: MonthlyFinancingRow[],
  terminalMonth: number
): number[] {
  if (!monthlyData.length || terminalMonth < 0) return [];

  const rowByMonth = (m: number) =>
    monthlyData[m]?.month === m
      ? monthlyData[m]
      : monthlyData.find((d) => d.month === m);

  const flows: number[] = new Array(terminalMonth + 1).fill(0);
  for (let m = 0; m <= terminalMonth; m++) {
    const row = rowByMonth(m);
    const eq = row?.equityInjection ?? 0;
    const cumPost = row?.cumulativeNcfPostFinancing ?? 0;
    if (eq > 0) {
      flows[m] = -eq;
    } else if (m === terminalMonth) {
      flows[m] = cumPost;
    } else {
      flows[m] = 0;
    }
  }
  return flows;
}

/** Build from persisted `projectIRR` (Component 4 preview sync). */
export function buildLeveredEquityCashFlowsFromProjectIrr(
  projectIRR: ProjectIRR | null | undefined
): number[] {
  if (!projectIRR) return [];

  const md = (projectIRR.monthlyData ?? []) as MonthlyFinancingRow[];
  const injections = projectIRR.equityInjectionByMonth ?? [];
  const timelineLength = Math.max(
    md.length,
    injections.length,
    projectIRR.cumulativeNcfPostFinancingByMonth?.length ?? 0,
    1
  );
  const terminalMonth = Math.max(0, timelineLength - 1);

  const rows: MonthlyFinancingRow[] = [];
  for (let m = 0; m <= terminalMonth; m++) {
    const fromMd = md.find((r) => r.month === m);
    const landPlusCash =
      Number(fromMd?.landEquityInjection ?? 0) +
      Number(fromMd?.cashEquityInjection ?? 0);
    const eq =
      injections[m] ??
      fromMd?.equityInjection ??
      (landPlusCash > 0 ? landPlusCash : 0);
    const cumPost =
      fromMd?.cumulativeNcfPostFinancing ??
      projectIRR.cumulativeNcfPostFinancingByMonth?.[m] ??
      0;
    rows.push({
      month: m,
      equityInjection: eq,
      cumulativeNcfPostFinancing: cumPost,
    });
  }

  return buildLeveredEquityCashFlowsFromMonthlyData(rows, terminalMonth);
}

export function leveredEquityIrrPctFromCashFlows(cashFlows: number[]): number {
  if (!cashFlows.length) return 0;
  return annualIrrPercentFromMonthlySeries(cashFlows) ?? 0;
}

/**
 * Component 4 persisted headline IRR (`financingMetrics.equityIRR` or `projectMetrics.leveredEquityIRR`).
 */
/** Normalize IRR stored as decimal (0.1767) or percent (17.67). */
export function toIrrPercent(
  maybePctOrDecimal: number | null | undefined
): number | null {
  if (maybePctOrDecimal == null || !Number.isFinite(maybePctOrDecimal)) {
    return null;
  }
  if (Math.abs(maybePctOrDecimal) > 0 && Math.abs(maybePctOrDecimal) <= 1.5) {
    return maybePctOrDecimal * 100;
  }
  return maybePctOrDecimal;
}

/** Unlevered project IRR (%) from Component 3 `/preview/project-irr`. */
export function resolveUnleveredProjectIrrPct(
  operationalProjectIRR: ProjectIRR | null | undefined,
  rootProjectIRR?: ProjectIRR | null | undefined
): number | null {
  const fromOperational = toIrrPercent(operationalProjectIRR?.unleveredIRR ?? null);
  const fromRoot = toIrrPercent(rootProjectIRR?.unleveredIRR ?? null);
  const pct = fromOperational ?? fromRoot;
  return pct != null && pct > 0 ? pct : null;
}

/** Same logic as Component 4 Step 1 funding requirement chart. */
export function computeOperationalPeakFundingGap(
  cashOutflows: CashOutflows,
  cashInflows: CashInflows,
  constructionPeriod: number,
  postCompletionBufferMonths = 6
): number {
  const flows = buildCashFlowArray(
    cashOutflows,
    cashInflows,
    constructionPeriod,
    postCompletionBufferMonths
  );
  let cumulative = 0;
  let minCumulative = 0;
  for (const p of flows) {
    cumulative += p.amount;
    if (cumulative < minCumulative) minCumulative = cumulative;
  }
  return Math.abs(minCumulative);
}

/** Peak funding gap (Component 4 Step 1), persisted or recomputed from C1/C2 cash flows. */
export function resolvePeakFundingGap(params: {
  financingMetrics?: FinancingMetrics | null;
  cashOutflows: CashOutflows;
  cashInflows: CashInflows;
  constructionPeriod: number;
  postCompletionBufferMonths?: number;
}): number {
  const stored = params.financingMetrics?.peakFundingGap;
  if (stored != null && stored > 0) return stored;
  return computeOperationalPeakFundingGap(
    params.cashOutflows,
    params.cashInflows,
    params.constructionPeriod,
    params.postCompletionBufferMonths ?? 6
  );
}

export type Component4EquityHeadlines = {
  leveredIrrPct: number | null;
  totalEquity: number;
  totalLoanDrawdown: number;
  equityMultiple: number;
};

/** Headline equity KPIs synced from Component 4 financing preview. */
export function resolveComponent4EquityHeadlines(params: {
  financingMetrics?: FinancingMetrics | null;
  projectIRR?: ProjectIRR | null;
  fallbackLoanDrawdown?: number;
  fallbackEquityMultiple?: number;
  fallbackTotalEquity?: number;
}): Component4EquityHeadlines {
  const {
    financingMetrics,
    projectIRR,
    fallbackLoanDrawdown = 0,
    fallbackEquityMultiple = 0,
    fallbackTotalEquity = 0,
  } = params;

  const leveredIrrPct = resolveLeveredEquityIrrPctFromFinModelStore({
    financingMetrics,
    projectIRR,
  });

  const totalEquity =
    financingMetrics?.totalEquityAmount ??
    projectIRR?.projectMetrics?.totalEquityInvested ??
    fallbackTotalEquity;

  const totalLoanDrawdown =
    financingMetrics?.totalLoanDrawdown ?? fallbackLoanDrawdown;

  const equityMultiple =
    financingMetrics?.equityMultiple ??
    projectIRR?.projectMetrics?.equityMultiple ??
    fallbackEquityMultiple;

  return {
    leveredIrrPct,
    totalEquity,
    totalLoanDrawdown,
    equityMultiple,
  };
}

export function resolveLeveredEquityIrrPctFromFinModelStore(params: {
  financingMetrics?: FinancingMetrics | null;
  projectIRR?: ProjectIRR | null;
}): number | null {
  const { financingMetrics, projectIRR } = params;

  if (
    financingMetrics?.equityIRR != null &&
    Number.isFinite(financingMetrics.equityIRR) &&
    financingMetrics.equityIRR > 0
  ) {
    return financingMetrics.equityIRR * 100;
  }

  const fromPm = projectIRR?.projectMetrics?.leveredEquityIRR;
  if (fromPm != null && Number.isFinite(fromPm) && fromPm > 0) {
    return fromPm;
  }

  const flows = buildLeveredEquityCashFlowsFromProjectIrr(projectIRR);
  if (flows.length) {
    const pct = leveredEquityIrrPctFromCashFlows(flows);
    return pct > 0 ? pct : null;
  }

  return null;
}

/** Apply legacy shock keys to a C4-style levered equity cash-flow series and solve IRR. */
export function leveredEquityIrrPctWithLegacyShocks(
  baseCashFlows: number[],
  shocks: LegacyOperationalShocks
): number {
  if (!baseCashFlows.length) return 0;
  if (Object.values(shocks).every((v) => v === 0 || v == null)) {
    return leveredEquityIrrPctFromCashFlows(baseCashFlows);
  }

  const s = (v: number | undefined) => v ?? 0;
  const constructionMult = 1 + s(shocks.constructionCost) / 100;
  const adrMult = 1 + s(shocks.adr) / 100;
  const occMult = 1 + (s(shocks.occupancy) * 1.5) / 100;
  const opexMult = 1 + s(shocks.operatingExpenses) / 100;
  const ffeMult = 1 + (s(shocks.ffeReserve) * 0.75) / 100;
  const durationMult = 1 + (s(shocks.constructionDuration) * 10) / (12 * 100);
  const interestMult = 1 + (s(shocks.interestRate) * 6) / (300 * 100);
  const exitCapMult = 1 + (s(shocks.exitCapRate) * 8) / (150 * 100);

  const revenueMult = adrMult * occMult;
  const costMult =
    constructionMult * opexMult * ffeMult * durationMult * interestMult;
  const terminalMult = revenueMult / Math.max(0.01, exitCapMult);

  const terminalIdx = baseCashFlows.length - 1;
  const shocked = baseCashFlows.map((cf, m) => {
    if (cf < 0) return cf * constructionMult;
    if (m === terminalIdx && cf > 0) return cf * terminalMult;
    return cf;
  });

  return leveredEquityIrrPctFromCashFlows(shocked);
}

export function logComponent6IrrDebug(params: {
  label: string;
  totalEquityInvested?: number;
  netExitProceeds?: number;
  cashFlows: number[];
  calculatedIrrPct: number;
  expectedIrrPct?: number;
}): void {
  if (process.env.NODE_ENV !== "development") return;
  const { label, cashFlows, calculatedIrrPct, expectedIrrPct } = params;
  // eslint-disable-next-line no-console
  console.log(`=== Component 6 IRR Debug (${label}) ===`);
  // eslint-disable-next-line no-console
  console.log("Equity Invested:", params.totalEquityInvested ?? "—");
  // eslint-disable-next-line no-console
  console.log("Net Exit Proceeds:", params.netExitProceeds ?? "—");
  // eslint-disable-next-line no-console
  console.log(
    "Cash Flow Series (first 5 / last 3):",
    cashFlows.slice(0, 5),
    "...",
    cashFlows.slice(-3)
  );
  // eslint-disable-next-line no-console
  console.log("Calculated IRR (%):", calculatedIrrPct.toFixed(4));
  if (expectedIrrPct != null) {
    // eslint-disable-next-line no-console
    console.log("Expected IRR (from Comp 4, %):", expectedIrrPct.toFixed(4));
  }
}
