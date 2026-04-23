"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import { exportToCSV } from "@/lib/downloads/exportToCSV";
import { exportToExcel } from "@/lib/downloads/exportToExcel";
import {
  buildSimplifiedPreferenceWaterfall,
  calculatePreferenceAdjustments,
} from "@/lib/preference-simple";
import {
  allocateWaterfallCashFlows,
  type WaterfallCashFlows,
} from "@/lib/waterfall";
import {
  buildCommonEquityTableRows,
  computeCommonDistributionByMonth,
  cumulativeNetEquityFromRows,
  getMonthlyDataValueFromStore,
  type MonthlyDataField,
} from "@/lib/common-equity-net-series";
import { annualIrrPercentFromMonthlySeries } from "@/lib/equity-irr";
import { calculateCommonEquityMetrics } from "@/lib/equity-metrics";
import { computeTrueCommonDistributionsFromFyeNcf } from "@/lib/true-common-distributions";
import { solveAnnualIRRPreferred, type CashFlowPoint } from "@/lib/irr-calculations";
import useFinModelStore, {
  DEFAULT_PREFERENCE_TENOR_MONTHS,
  getOperationalYearMonthRange,
} from "@/store/useFinModelStore";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";

// XIRR calculation for monthly cash flows (Newton-Raphson)
function calculateMonthlyXIRR(
  cashFlows: number[],
  maxIterations = 100,
  precision = 0.0001
): number {
  if (cashFlows.length < 2) return 0;

  // Initial guess: 1% monthly ≈ 12.7% annual
  let rate = 0.01;

  for (let iter = 0; iter < maxIterations; iter++) {
    let npv = 0;
    let derivative = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const cf = cashFlows[t] ?? 0;
      const denom = Math.pow(1 + rate, t);
      npv += cf / denom;
      derivative -= (t * cf) / Math.pow(1 + rate, t + 1);
    }

    if (Math.abs(npv) < precision) return rate;
    if (Math.abs(derivative) < 1e-10) break;

    rate = rate - npv / derivative;
    if (rate < -0.99 || rate > 10) break;
  }

  return rate;
}

// Discount factor for month M given monthly IRR (PV = CF × DF)
function calculateDiscountFactor(month: number, monthlyIRR: number): number {
  return month >= 0 && monthlyIRR > -1
    ? Math.pow(1 + monthlyIRR, -month)
    : 0;
}

/** Same as `/preview/financing` — used for stage sub-header, column spans, and legend. */
function getStageWithDuration(
  m: number,
  constructionPeriod: number,
  totalHoldPeriodMonths: number
): string {
  if (m === 0) return "Pre-Construction";

  if (m >= 1 && m <= 6) {
    return "Enabling Works (6 months)";
  }

  if (m >= 7 && m <= 15) {
    return "Sub-Structure (9 months)";
  }

  if (m >= 16 && m <= constructionPeriod) {
    const duration = constructionPeriod - 15;
    return `Super Structure & Finishes (${duration} months)`;
  }

  if (m > constructionPeriod && m <= totalHoldPeriodMonths) {
    const spanMonths = totalHoldPeriodMonths - constructionPeriod;
    return `Post-Completion (${spanMonths} months)`;
  }

  return "";
}

function phaseHeaderClasses(
  m: number,
  constructionPeriod: number,
  totalHoldPeriodMonths: number
): string {
  if (m <= 2)
    return "bg-blue-900/30 border-blue-700/50 text-blue-300";
  if (m <= 5)
    return "bg-cyan-900/30 border-cyan-700/50 text-cyan-300";
  if (m <= constructionPeriod)
    return "bg-emerald-900/30 border-emerald-700/50 text-emerald-300";
  if (m <= totalHoldPeriodMonths)
    return "bg-amber-900/30 border-amber-700/50 text-amber-300";
  return "bg-purple-900/30 border-purple-700/50 text-purple-300";
}

type TableRow = {
  month: number;
  prefDraw: number;
  commonDraw: number;
  totalDraw: number;
  prefDist: number;
  commonDist: number;
  promoteDist: number;
  totalDist: number;
  netEquityCF: number;
};

export default function EquityReturnsPreviewPage() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement | null>(null);

  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const financing = useFinModelStore((s) => s.financing);
  const projectIRR = useFinModelStore((s) => s.projectIRR);
  const projectMetrics = projectIRR.projectMetrics;
  // eslint-disable-next-line no-console
  console.log("📖 [/preview/equity-returns] Store check:", {
    equityInjectionByMonth_len: projectIRR.equityInjectionByMonth?.length ?? 0,
    cumulativeNcf_len: projectIRR.cumulativeNcfPostFinancingByMonth?.length ?? 0,
    monthlyFundingStack_len: financing.monthlyFundingStack?.length ?? 0,
    hasPreferenceShares: financing.preferenceShares?.hasPreferenceShares,
    prefAmount: financing.preferenceShares?.amount,
  });

  const baseCashFlows = projectIRR.monthlyCashFlows || [];
  const cashFlowHorizonMonths =
    baseCashFlows.length > 0
      ? baseCashFlows[baseCashFlows.length - 1].month + 1
      : 0;
  const cumulativeNcfLength =
    projectIRR.cumulativeNcfPostFinancingByMonth?.length ?? 0;
  const equityInjectionLength = projectIRR.equityInjectionByMonth?.length ?? 0;
  const constructionPeriod =
    Math.max(
      cashOutflows.constructionPeriod ?? 0,
      financing.constructionPeriodMonths ?? 0
    ) || 30;
  const POST_COMPLETION_BUFFER_MONTHS = 6;
  const holdPeriodYears = financing.holdPeriodYears || 10;
  const stabilizationEndMonth = constructionPeriod + POST_COMPLETION_BUFFER_MONTHS;
  const repaymentHorizonMonths = Math.round(holdPeriodYears * 12);
  const totalHoldPeriodMonths = Math.max(
    constructionPeriod + 90,
    stabilizationEndMonth + repaymentHorizonMonths
  );

  const horizonMonths = Math.max(
    cashFlowHorizonMonths,
    cumulativeNcfLength,
    equityInjectionLength,
    totalHoldPeriodMonths + 1
  );

  /** Same column schedule as `/preview/financing` (monthly through stabilization, then +12m anchors). */
  const previewColumnMonths = useMemo(() => {
    const lastDetailedMonth = Math.min(
      totalHoldPeriodMonths,
      stabilizationEndMonth
    );
    const out: number[] = [];
    for (let m = 0; m <= lastDetailedMonth; m++) {
      out.push(m);
    }
    for (let k = 1; ; k++) {
      const y = lastDetailedMonth + 12 * k;
      if (y > totalHoldPeriodMonths) break;
      out.push(y);
    }
    if (
      totalHoldPeriodMonths > lastDetailedMonth &&
      !out.includes(totalHoldPeriodMonths)
    ) {
      out.push(totalHoldPeriodMonths);
    }
    return Array.from(new Set(out)).sort((a, b) => a - b);
  }, [stabilizationEndMonth, totalHoldPeriodMonths]);

  const ps = financing.preferenceShares;
  const hasPreference =
    ps.hasPreferenceShares && ps.amount > 0;
  const prefPrincipal = hasPreference ? ps.amount : 0;
  const prefRate = hasPreference ? ps.returnPercent / 100 : 0;
  const resolvedTenorMonths =
    financing.preferenceShares.tenorMonths || DEFAULT_PREFERENCE_TENOR_MONTHS;

  const getMonthlyDataValue = useMemo(() => {
    const data = projectIRR?.monthlyData || [];
    return (month: number, field: MonthlyDataField) =>
      getMonthlyDataValueFromStore(data, month, field);
  }, [projectIRR?.monthlyData]);

  const operationalFyeMonths = useMemo(() => {
    const out: number[] = [];
    for (let oy = 1; oy <= 10; oy++) {
      out.push(getOperationalYearMonthRange(oy, constructionPeriod).endMonth);
    }
    return Array.from(new Set(out)).sort((a, b) => a - b);
  }, [constructionPeriod]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("🚨 [Preview Equity] DIRECT DATA READ TEST:");
    for (const m of [0, 1, 2, 3, 15, 16, 17, 18, 19, 36]) {
      // eslint-disable-next-line no-console
      console.log(
        `  M${m}: equityInjection=${getMonthlyDataValue(m, "equityInjection") / 1000}k, ncfPostFinancing=${getMonthlyDataValue(m, "ncfPostFinancing") / 1000}k`
      );
    }
  }, [getMonthlyDataValue, projectIRR?.monthlyData]);

  useEffect(() => {
    const md = projectIRR?.monthlyData || [];
    // eslint-disable-next-line no-console
    console.log("💾 [Preview Equity] projectIRR.monthlyData snapshot:", {
      length: md.length,
      M0: md[0]?.equityInjection,
      M11: md[11]?.equityInjection,
      M15: md[15]?.equityInjection,
    });
  }, [projectIRR?.monthlyData]);

  const monthlyEquityInjectionsRaw = useMemo(() => {
    if (horizonMonths <= 0) return [];
    const md = projectIRR.monthlyData;
    const raw = projectIRR.equityInjectionByMonth;
    const out: number[] = [];
    for (let m = 0; m < horizonMonths; m++) {
      if (md?.length) {
        const row =
          md[m]?.month === m ? md[m] : md.find((d) => d.month === m);
        if (row !== undefined) {
          out[m] = row.equityInjection ?? 0;
          continue;
        }
      }
      out[m] =
        raw?.[m] ??
        (financing.monthlyFundingStack?.find((s) => s.month === m)
          ?.equityThisMonth ?? 0);
    }
    return out;
  }, [
    horizonMonths,
    projectIRR.monthlyData,
    projectIRR.equityInjectionByMonth,
    financing.monthlyFundingStack,
  ]);

  /** Sum of Row G equity injection — same basis as `/preview/financing` + `projectMetrics.totalEquityInvested`. */
  const equityInjectionFullHorizon = useMemo(() => {
    const md = projectIRR.monthlyData;
    if (md?.length)
      return md.reduce((s, d) => s + (d.equityInjection ?? 0), 0);
    return monthlyEquityInjectionsRaw.reduce((s, v) => s + v, 0);
  }, [projectIRR.monthlyData, monthlyEquityInjectionsRaw]);

  const landAs100Equity = (financing.landEquityPercent ?? 40) >= 100;

  const monthlyDistributionsRaw = useMemo(() => {
    const cum = projectIRR.cumulativeNcfPostFinancingByMonth;
    if (!cum?.length || horizonMonths <= 0) return [];
    const out: number[] = [];
    for (let m = 0; m < horizonMonths; m++) {
      const c = cum[m] ?? 0;
      const prev = m > 0 ? cum[m - 1] ?? 0 : 0;
      out[m] = Math.max(0, c - prev);
    }
    return out;
  }, [projectIRR.cumulativeNcfPostFinancingByMonth, horizonMonths]);

  const preferenceAdjustments = useMemo(() => {
    if (!hasPreference || prefPrincipal <= 0) return null;
    if (monthlyEquityInjectionsRaw.length === 0) return null;
    const adj = calculatePreferenceAdjustments(
      monthlyEquityInjectionsRaw,
      prefPrincipal,
      prefRate,
      resolvedTenorMonths,
      operationalFyeMonths,
      constructionPeriod + POST_COMPLETION_BUFFER_MONTHS
    );
    // eslint-disable-next-line no-console
    console.log("🚨 [Preview Equity] preferenceAdjustments DEBUG:", {
      originalM0_k: (monthlyEquityInjectionsRaw[0] ?? 0) / 1000,
      adjustedM0_k: (adj.adjustedEquityInjections[0] ?? 0) / 1000,
      m15_k: (adj.adjustedEquityInjections[15] ?? 0) / 1000,
      m36_k: (adj.adjustedEquityInjections[36] ?? 0) / 1000,
    });
    return adj;
  }, [
    hasPreference,
    prefPrincipal,
    prefRate,
    resolvedTenorMonths,
    monthlyEquityInjectionsRaw,
    operationalFyeMonths,
    constructionPeriod,
  ]);

  /** Live adjustment or store snapshot — unified shape for tables + key metrics. */
  const preferenceCalcForBreakdown = useMemo(() => {
    if (!hasPreference || prefPrincipal <= 0) return null;
    if (preferenceAdjustments) {
      const totalDividendsPaid =
        preferenceAdjustments.preferenceDividendsPaid.reduce((s, v) => s + v, 0);
      return {
        preferenceDividendsPaid: preferenceAdjustments.preferenceDividendsPaid,
        quarterlyDividendDue: preferenceAdjustments.annualDividend,
        totalDividendsPaid,
        principalRepaid: preferenceAdjustments.principalRepaid,
        principalRepaymentMonth: preferenceAdjustments.principalRepaymentMonth,
        error: null as string | null,
      };
    }
    const snap = projectMetrics?.preferenceCalculation;
    if (!snap?.dividendsPaid?.length) return null;
    return {
      preferenceDividendsPaid: snap.dividendsPaid,
      quarterlyDividendDue: snap.quarterlyDividendDue,
      totalDividendsPaid: snap.totalDividendsPaid,
      principalRepaid: snap.principalRepaid,
      principalRepaymentMonth: snap.tenorMonths,
      error: snap.error,
    };
  }, [hasPreference, prefPrincipal, preferenceAdjustments, projectMetrics]);

  const preferenceBreakdown = useMemo(() => {
    if (!hasPreference || prefPrincipal <= 0 || horizonMonths <= 0) return null;
    const src = preferenceCalcForBreakdown;
    if (!src?.preferenceDividendsPaid?.length) return null;
    const tenorEndIdx = Math.min(
      Math.max(0, resolvedTenorMonths),
      Math.max(0, horizonMonths - 1)
    );
    const principalRepaid = src.principalRepaid ?? 0;
    const divByMonth = Array.from({ length: horizonMonths }, (_, m) =>
      m < src.preferenceDividendsPaid.length
        ? src.preferenceDividendsPaid[m] ?? 0
        : 0
    );
    const principalByMonth = Array.from({ length: horizonMonths }, (_, m) =>
      m === tenorEndIdx && principalRepaid > 0 ? principalRepaid : 0
    );
    return {
      divByMonth,
      principalByMonth,
      totalDividends: divByMonth.reduce((s, v) => s + v, 0),
      totalPrincipal: principalRepaid,
      tenorEndIdx,
    };
  }, [
    hasPreference,
    prefPrincipal,
    horizonMonths,
    preferenceCalcForBreakdown,
    resolvedTenorMonths,
  ]);

  const waterfall: WaterfallCashFlows | null = useMemo(() => {
    if (horizonMonths <= 0) return null;
    if (hasPreference && prefPrincipal > 0) {
      return buildSimplifiedPreferenceWaterfall(
        monthlyEquityInjectionsRaw,
        monthlyDistributionsRaw,
        prefPrincipal,
        prefRate,
        resolvedTenorMonths,
        operationalFyeMonths,
        constructionPeriod + POST_COMPLETION_BUFFER_MONTHS
      );
    }
    return allocateWaterfallCashFlows({
      monthlyEquityInjections: monthlyEquityInjectionsRaw.map((v) => -Math.max(0, v)),
      monthlyDistributions: monthlyDistributionsRaw,
      preferenceAmount: 0,
      preferenceReturnRate: 0,
      redemptionAtFairValue: false,
      holdPeriodMonths: horizonMonths,
    });
  }, [
    horizonMonths,
    hasPreference,
    prefPrincipal,
    prefRate,
    resolvedTenorMonths,
    monthlyEquityInjectionsRaw,
    monthlyDistributionsRaw,
    operationalFyeMonths,
    constructionPeriod,
  ]);

  const commonDistributionByMonth = useMemo(
    () =>
      computeCommonDistributionByMonth({
        horizonMonths,
        hasPreference,
        prefPrincipal,
        prefRate,
        resolvedTenorMonths,
        getMonthlyDataValue,
        monthlyDataForLoanDetection: projectIRR.monthlyData,
      }),
    [
      horizonMonths,
      hasPreference,
      prefPrincipal,
      prefRate,
      resolvedTenorMonths,
      getMonthlyDataValue,
      projectIRR.monthlyData,
    ]
  );

  const tableData: TableRow[] = useMemo(() => {
    if (!waterfall) return [];
    return buildCommonEquityTableRows({
      horizonMonths,
      waterfall,
      commonDistributionByMonth,
      extraCommonDrawByMonth:
        hasPreference && preferenceCalcForBreakdown?.preferenceDividendsPaid?.length
          ? preferenceCalcForBreakdown.preferenceDividendsPaid
          : undefined,
    });
  }, [
    waterfall,
    horizonMonths,
    commonDistributionByMonth,
    hasPreference,
    preferenceCalcForBreakdown,
  ]);

  const tableDataWithCumulative = useMemo(
    () => cumulativeNetEquityFromRows(tableData),
    [tableData]
  );

  const previewColumnMonthSet = useMemo(
    () => new Set(previewColumnMonths),
    [previewColumnMonths]
  );

  const displayedTableData = useMemo(
    () =>
      tableDataWithCumulative.filter((r) =>
        previewColumnMonthSet.has(r.month)
      ),
    [tableDataWithCumulative, previewColumnMonthSet]
  );

  const netEquityCashFlows = useMemo(
    () => tableData.map((r) => r.netEquityCF),
    [tableData]
  );

  const exitYearSpreadsheet = Math.max(
    4,
    Math.min(13, Math.round(Number(financing.exitYear ?? 13) || 13))
  );

  const commonEquityHeadline = useMemo(
    () =>
      calculateCommonEquityMetrics({
        monthlyData: projectIRR.monthlyData,
        constructionPeriod,
        exitYear: financing.exitYear,
      }),
    [projectIRR.monthlyData, constructionPeriod, financing.exitYear]
  );

  // Kept for table-mode / exports / debug (preference logic still uses this table).
  const trueCommonDistributionsMeta = useMemo(
    () =>
      computeTrueCommonDistributionsFromFyeNcf({
        monthlyData: projectIRR.monthlyData,
        constructionPeriod,
        exitYearSpreadsheet,
      }),
    [projectIRR.monthlyData, constructionPeriod, exitYearSpreadsheet]
  );

  /**
   * IRR cash flows MUST match the displayed spreadsheet row:
   * "Net equity CF (distributions − draws)" = Common distribution − Common draw,
   * where Common draw = Draws total − Preference draw (same as table rendering).
   *
   * IMPORTANT: Do NOT use any separate monthlyData-derived series here, or the IRR can drift
   * from what the user sees in the table.
   */
  const irrSeries = useMemo(() => {
    if (!tableData.length) return [];
    return tableData.map((r) => {
      const commonDraw = Math.max(0, (r.totalDraw ?? 0) - (r.prefDraw ?? 0));
      const commonDist = r.commonDist ?? 0;
      return commonDist - commonDraw;
    });
  }, [tableData]);

  const irrSolved = useMemo(() => {
    const points: CashFlowPoint[] = irrSeries.map((amount, month) => ({
      month,
      amount,
    }));
    // Enforce NPV≈0 via Σ CF_t/(1+r)^(t/12)=0.
    return solveAnnualIRRPreferred(points, {
      tolerance: 1000,
      maxIterations: 250,
      selection: "max",
      preferredAnnualIRR: 0.125,
    });
  }, [irrSeries]);

  const irrCheckData = useMemo(() => {
    if (irrSeries.length === 0) return [];
    const annual = irrSolved.annualIRR ?? 0;
    let run = 0;
    return irrSeries.map((cf, idx) => {
      const discountFactor = 1 / Math.pow(1 + annual, idx / 12);
      const discountedCF = cf * discountFactor;
      run += discountedCF;
      return { month: idx, discountFactor, discountedCF, cumulativeNPV: run };
    });
  }, [irrSeries, irrSolved.annualIRR]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!irrSeries.length) return;
    const annual = irrSolved.annualIRR ?? 0;
    const npv = irrSolved.npvAtIRR ?? 0;
    // eslint-disable-next-line no-console
    console.log("=== IRR Cash Flow Source Verification ===");
    // eslint-disable-next-line no-console
    console.log("Cash flows read from: Net equity CF row (tableData). Same as spreadsheet: ✅");
    // eslint-disable-next-line no-console
    console.log(`Solved IRR: ${(annual * 100).toFixed(6)}%`);
    // eslint-disable-next-line no-console
    console.log(`NPV at IRR (Σ DCF): ${(npv / 1000).toFixed(6)}K`);

    const nonZero = irrSeries
      .map((v, m) => ({ month: m, value: v }))
      .filter((x) => Math.abs(x.value) > 1e-6);
    // eslint-disable-next-line no-console
    console.log(
      `Non-zero Net equity CF months: ${nonZero.length} (this should match the spreadsheet row, even if the UI only shows a subset of months)`
    );
    // eslint-disable-next-line no-console
    console.log(
      "First 30 non-zero months:",
      nonZero
        .slice(0, 30)
        .map((x) => `M${x.month}:${(x.value / 1000).toFixed(2)}K`)
        .join(", ")
    );

    const md = projectIRR.monthlyData ?? [];
    const eqMonths = md
      .filter((d) => (d.equityInjection ?? 0) > 0)
      .map((d) => ({ month: d.month, eq: d.equityInjection ?? 0 }))
      .sort((a, b) => a.month - b.month);
    // eslint-disable-next-line no-console
    console.log("=== ALL Equity Injections in monthlyData ===");
    // eslint-disable-next-line no-console
    console.log(`Total equity injection months: ${eqMonths.length}`);
    // eslint-disable-next-line no-console
    console.log(
      "First 30 equity injection months:",
      eqMonths
        .slice(0, 30)
        .map((x) => `M${x.month}:${(x.eq / 1000).toFixed(2)}K`)
        .join(", ")
    );

    const checkMonths = [3, 6, 9, 12, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 30, 33, 36, 39, 42, 45];
    // eslint-disable-next-line no-console
    console.log("Missing months check (equityInjection):");
    checkMonths.forEach((m) => {
      const row = md.find((d) => d.month === m);
      const eq = row?.equityInjection ?? 0;
      // eslint-disable-next-line no-console
      console.log(`  M${m}: ${eq > 0 ? `${(eq / 1000).toFixed(2)}K ✅` : "0K ❌"}`);
    });
    const keyMonths = [0, 2, 15, 58, 70, 118, 130, 142, 154, 166].filter(
      (m) => m < irrSeries.length
    );
    // eslint-disable-next-line no-console
    console.log("Key months (Net equity CF):");
    keyMonths.forEach((m) => {
      // eslint-disable-next-line no-console
      console.log(`  M${m}: ${(irrSeries[m]! / 1000).toFixed(2)}K`);
    });
  }, [irrSeries, irrSolved.annualIRR, irrSolved.npvAtIRR, projectIRR.monthlyData]);

  const keyMetrics = useMemo(() => {
    // When preference is OFF, the table ("spreadsheet") is the source of truth for headline totals:
    // read totals from the SAME row values shown on-screen (visible column months).
    if (!hasPreference && displayedTableData.length > 0) {
      const totalDistributionsFromSheet = displayedTableData.reduce(
        (s, r) => s + (r.commonDist ?? 0),
        0
      );
      const totalInvestedFromSheet = displayedTableData.reduce((s, r) => {
        const eq = getMonthlyDataValue(r.month, "equityInjection");
        return s + Math.max(0, eq);
      }, 0);

      // Peak common equity matches the Financing preview "Cumulative Equity" row, which is a running sum of Row G.
      let peakFromSheet = 0;
      let run = 0;
      for (const r of displayedTableData) {
        run += Math.max(0, getMonthlyDataValue(r.month, "equityInjection"));
        peakFromSheet = Math.max(peakFromSheet, run);
      }

      const equityMultiple =
        totalInvestedFromSheet > 0
          ? totalDistributionsFromSheet / totalInvestedFromSheet
          : 0;

      const irrPct =
        commonEquityHeadline?.commonEquityIrrPct ??
        annualIrrPercentFromMonthlySeries(netEquityCashFlows) ??
        0;

      return {
        totalEquityInvested: totalInvestedFromSheet,
        totalDistributions: totalDistributionsFromSheet,
        leveredEquityIRR: irrPct,
        equityMultiple,
        equityPayback: commonEquityHeadline?.commonEquityPaybackMonth ?? null,
        sponsorPromote: 0,
        peakEquity: peakFromSheet,
      };
    }

    if (!hasPreference && commonEquityHeadline) {
      return {
        totalEquityInvested: commonEquityHeadline.totalCommonEquityInvested,
        totalDistributions: commonEquityHeadline.totalCommonDistributions,
        leveredEquityIRR: commonEquityHeadline.commonEquityIrrPct,
        equityMultiple: commonEquityHeadline.commonEquityMultiple,
        equityPayback: commonEquityHeadline.commonEquityPaybackMonth,
        sponsorPromote: 0,
        peakEquity: commonEquityHeadline.peakCommonEquity,
      };
    }

    const totalCommonEquityInvested = hasPreference
      ? tableData.reduce((s, r) => s + r.commonDraw, 0)
      : projectMetrics?.totalEquityInvested ?? equityInjectionFullHorizon;
    const totalCommonDistributions = tableData.reduce(
      (s, r) => s + r.commonDist,
      0
    );

    // Preference / table mode: peak common equity = max deficit in cumulative NET EQUITY CF.
    let peakCommon = 0;
    for (const r of tableDataWithCumulative) {
      if (r.cumulativeEquity < 0) {
        peakCommon = Math.max(peakCommon, Math.abs(r.cumulativeEquity));
      }
    }

    const payIdx = tableDataWithCumulative.findIndex(
      (r) => r.cumulativeEquity >= 0
    );
    const equityPayback = payIdx >= 0 ? payIdx : null;

    const prefIrrSolved = solveAnnualIRRPreferred(
      netEquityCashFlows.map((amount, month) => ({ month, amount })),
      {
        tolerance: 1000,
        maxIterations: 250,
        selection: "max",
        preferredAnnualIRR: 0.125,
      }
    );
    const commonEquityIRR =
      prefIrrSolved.annualIRR != null && Number.isFinite(prefIrrSolved.annualIRR)
        ? prefIrrSolved.annualIRR * 100
        : annualIrrPercentFromMonthlySeries(netEquityCashFlows) ?? 0;

    const equityMultiple =
      totalCommonEquityInvested > 0
        ? totalCommonDistributions / totalCommonEquityInvested
        : 0;

    return {
      totalEquityInvested: totalCommonEquityInvested,
      totalDistributions: totalCommonDistributions,
      leveredEquityIRR: commonEquityIRR,
      equityMultiple,
      equityPayback,
      sponsorPromote: 0,
      peakEquity: peakCommon,
    };
  }, [
    hasPreference,
    commonEquityHeadline,
    displayedTableData,
    getMonthlyDataValue,
    projectMetrics?.totalEquityInvested,
    equityInjectionFullHorizon,
    projectIRR.monthlyData?.length,
    tableData,
    tableDataWithCumulative,
    netEquityCashFlows,
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (hasPreference) return;
    if (!(projectIRR.monthlyData?.length ?? 0)) return;
    if (!commonEquityHeadline) return;

    const md = projectIRR.monthlyData ?? [];
    const {
      lastEquityInjectionMonth,
      lastNegativeNcfPostMonth,
      firstDistributionFyeMonth,
      exitFyeMonth,
      total,
    } = commonEquityHeadline.distributionMeta;

    const fyeEnds: number[] = [];
    for (let oy = 1; oy <= 10; oy++) {
      const { endMonth } = getOperationalYearMonthRange(
        oy,
        constructionPeriod
      );
      fyeEnds.push(endMonth);
    }

    // eslint-disable-next-line no-console
    console.log("=== Total Common Distributions Verification ===");
    // eslint-disable-next-line no-console
    console.log("Distribution timeline:");
    // eslint-disable-next-line no-console
    console.log(`  Last equity injection: M${lastEquityInjectionMonth}`);
    // eslint-disable-next-line no-console
    console.log(`  Last negative NCF post: M${lastNegativeNcfPostMonth}`);
    // eslint-disable-next-line no-console
    console.log(
      `  First counted FYE (end of op year): M${firstDistributionFyeMonth ?? "—"}`
    );
    // eslint-disable-next-line no-console
    console.log(`  Exit FYE cap: M${exitFyeMonth}`);
    // eslint-disable-next-line no-console
    console.log("\nNCF post at each op FYE:");
    for (const endM of fyeEnds) {
      const row = md.find((d) => d.month === endM);
      const ncfPost = row?.ncfPostFinancing ?? 0;
      const counted =
        commonEquityHeadline.distributionMeta.countedFyeMonths.includes(endM);
      // eslint-disable-next-line no-console
      console.log(
        `  M${endM}: ${(ncfPost / 1000).toFixed(0)}K ${counted ? "✅ counted" : "—"}`
      );
    }
    // eslint-disable-next-line no-console
    console.log("\nTotals:");
    // eslint-disable-next-line no-console
    console.log(
      `  Total common distributions (FYEs only, post-reinvest rule): ${(total / 1_000_000).toFixed(2)}M`
    );
    // eslint-disable-next-line no-console
    if (commonEquityHeadline.distributionMeta.missingCountedMonths.length) {
      console.log(
        "⚠️ Missing monthlyData rows for counted months:",
        commonEquityHeadline.distributionMeta.missingCountedMonths
          .map((m) => `M${m}`)
          .join(", ")
      );
    }
  }, [
    hasPreference,
    projectIRR.monthlyData,
    constructionPeriod,
    commonEquityHeadline,
  ]);

  /** Same grouping as `/preview/financing`, using visible columns only. */
  const stageGroups = useMemo(() => {
    const groups: Array<{ label: string; colSpan: number }> = [];
    for (const row of displayedTableData) {
      const label = getStageWithDuration(
        row.month,
        constructionPeriod,
        totalHoldPeriodMonths
      );
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.colSpan += 1;
      } else {
        groups.push({ label, colSpan: 1 });
      }
    }
    return groups;
  }, [displayedTableData, constructionPeriod, totalHoldPeriodMonths]);

  const equityLineTotals = useMemo(() => {
    type Row = (typeof tableDataWithCumulative)[0];
    const z = (fn: (r: Row) => number) =>
      displayedTableData.reduce((s, r) => s + fn(r), 0);

    const drawTotalFooter = !hasPreference
      ? projectMetrics?.totalEquityInvested ?? equityInjectionFullHorizon
      : tableData.reduce((s, r) => s + r.totalDraw, 0);
    const prefDrawFooter = hasPreference
      ? tableData.reduce((s, r) => s + r.prefDraw, 0)
      : 0;
    const commonDrawFooter = !hasPreference
      ? drawTotalFooter - prefDrawFooter
      : tableData.reduce(
          (s, r) => s + Math.max(0, r.totalDraw - r.prefDraw),
          0
        );

    // NPV at IRR must be ~0, computed from the full monthly series (not only visible columns).
    const discountedCF = irrSolved.npvAtIRR ?? 0;
    return {
      prefDraw: prefDrawFooter,
      commonDraw: commonDrawFooter,
      totalDraw: drawTotalFooter,
      prefDist: z((r) => r.prefDist),
      commonDist: z((r) => r.commonDist),
      totalDist: z((r) => r.totalDist),
      netEquityCF: z((r) => r.netEquityCF),
      discountedCF,
      lastCumulative:
        displayedTableData[displayedTableData.length - 1]?.cumulativeEquity ?? 0,
    };
  }, [
    displayedTableData,
    irrSolved.npvAtIRR,
    hasPreference,
    projectMetrics?.totalEquityInvested,
    equityInjectionFullHorizon,
    tableData,
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const md = projectIRR.monthlyData ?? [];
    const m0 = md.find((d) => d.month === 0)?.equityInjection ?? 0;
    const m1 = md.find((d) => d.month === 1)?.equityInjection ?? 0;
    const m58 = md.find((d) => d.month === 58)?.equityInjection ?? 0;
    const m166 = md.find((d) => d.month === 166)?.equityInjection ?? 0;
    const totalEq = md.reduce((s, d) => s + (d.equityInjection ?? 0), 0);
    let cum = 0;
    let peakCum = 0;
    for (const d of md) {
      cum += d.equityInjection ?? 0;
      peakCum = Math.max(peakCum, cum);
    }
    // eslint-disable-next-line no-console
    console.log("=== Equity Draws Verification ===");
    // eslint-disable-next-line no-console
    console.log("Equity Draws (projectIRR.monthlyData, same as Financing preview):");
    // eslint-disable-next-line no-console
    console.log(`  M0: ${(m0 / 1000).toFixed(0)}K`);
    // eslint-disable-next-line no-console
    console.log(`  M1: ${(m1 / 1000).toFixed(0)}K`);
    // eslint-disable-next-line no-console
    console.log(`  M58: ${(m58 / 1000).toFixed(0)}K`);
    // eslint-disable-next-line no-console
    console.log(`  M166: ${(m166 / 1000).toFixed(0)}K`);
    // eslint-disable-next-line no-console
    console.log("\nTotals:");
    // eslint-disable-next-line no-console
    console.log(
      `  Total Equity Invested: ${(totalEq / 1_000_000).toFixed(2)}M (store projectMetrics: ${((projectMetrics?.totalEquityInvested ?? 0) / 1_000_000).toFixed(2)}M)`
    );
    // eslint-disable-next-line no-console
    console.log(
      `  Peak Cumulative (sum injections): ${(peakCum / 1_000_000).toFixed(2)}M (KPI peak uses max cumulative equity path in engine)`
    );
    // eslint-disable-next-line no-console
    console.log("\nLand as 100% equity (landEquityPercent >= 100):");
    // eslint-disable-next-line no-console
    console.log(`  Status: ${landAs100Equity ? "ON" : "OFF"}`);
  }, [
    projectIRR.monthlyData,
    projectMetrics?.totalEquityInvested,
    landAs100Equity,
  ]);

  const tableMinWidthPx =
    150 + 88 + Math.max(displayedTableData.length, 1) * 60;

  const currency = projectInfo.currency || "AED";
  const projectLabel = [
    projectInfo.city || "Dubai",
    projectInfo.country || "UAE",
  ].join(", ");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const npvCommon = equityLineTotals.discountedCF;

  /** Matrix for Excel/CSV — same visible months as the table (`previewColumnMonths`). */
  const exportRows = useMemo((): (string | number | null)[][] => {
    if (displayedTableData.length === 0) {
      return [
        [
          "No monthly equity data — complete Component 4 and open Financing preview first.",
        ],
      ];
    }

    const k = (v: number) => Math.round(v / 1000);
    const months = displayedTableData;

    const header = ["EQUITY ITEM", ...months.map((r) => `M${r.month}`), "TOTAL"];

    const prefDrawRow: (string | number | null)[] = [
      "Preference draw",
      ...months.map((r) => (r.prefDraw > 0 ? k(r.prefDraw) : null)),
      k(equityLineTotals.prefDraw),
    ];

    const commonDrawRow: (string | number | null)[] = [
      "Common draw",
      ...months.map((r) => {
        if (!hasPreference) {
          const v = getMonthlyDataValue(r.month, "equityInjection");
          return v > 0 ? k(v) : null;
        }
        const cd = Math.max(0, r.totalDraw - r.prefDraw);
        return cd > 0 ? k(cd) : null;
      }),
      k(equityLineTotals.totalDraw - equityLineTotals.prefDraw),
    ];

    const totalDrawRow: (string | number | null)[] = [
      "Draws total",
      ...months.map((r) => {
        if (!hasPreference) {
          const v = getMonthlyDataValue(r.month, "equityInjection");
          return v > 0 ? k(v) : null;
        }
        return r.totalDraw > 0 ? k(r.totalDraw) : null;
      }),
      k(equityLineTotals.totalDraw),
    ];

    const prefDivRow: (string | number | null)[] = [
      "Preference dividend",
      ...months.map((r) => {
        const v = preferenceBreakdown?.divByMonth?.[r.month] ?? 0;
        return v > 0 ? k(v) : null;
      }),
      k(preferenceBreakdown?.totalDividends ?? 0),
    ];

    const prefPrincipalRow: (string | number | null)[] = [
      "Pref. principal repaid",
      ...months.map((r) => {
        const v = preferenceBreakdown?.principalByMonth?.[r.month] ?? 0;
        return v > 0 ? k(v) : null;
      }),
      k(preferenceBreakdown?.totalPrincipal ?? 0),
    ];

    const commonDistRow: (string | number | null)[] = [
      "Common distribution",
      ...months.map((r) => (r.commonDist > 0 ? k(r.commonDist) : null)),
      k(equityLineTotals.commonDist),
    ];

    const totalDistRow: (string | number | null)[] = [
      "Dist. total",
      ...months.map((r) => (r.totalDist > 0 ? k(r.totalDist) : null)),
      k(equityLineTotals.totalDist),
    ];

    const netCommonRow: (string | number | null)[] = [
      "Net equity CF (common, dist − draw)",
      ...months.map((r) => {
        const cd = !hasPreference
          ? getMonthlyDataValue(r.month, "equityInjection")
          : Math.max(0, r.totalDraw - r.prefDraw);
        const net = (r.commonDist ?? 0) - cd;
        return net !== 0 ? k(net) : null;
      }),
      k(
        months.reduce((s, r) => {
          const cd = !hasPreference
            ? getMonthlyDataValue(r.month, "equityInjection")
            : Math.max(0, r.totalDraw - r.prefDraw);
          return s + ((r.commonDist ?? 0) - cd);
        }, 0)
      ),
    ];

    const cumulativeRow: (string | number | null)[] = [
      "Cumulative equity",
      ...months.map((r) =>
        r.cumulativeEquity !== 0 ? k(r.cumulativeEquity) : null
      ),
      k(equityLineTotals.lastCumulative),
    ];

    const discountFactorRow: (string | number | null)[] = [
      "Discount factor",
      ...months.map((r) => {
        const irr = irrCheckData[r.month];
        return irr?.discountFactor != null
          ? Number(irr.discountFactor.toFixed(6))
          : null;
      }),
      null,
    ];

    const discountedCfRow: (string | number | null)[] = [
      "Discounted CF",
      ...months.map((r) => {
        const irr = irrCheckData[r.month];
        const dcf = irr?.discountedCF ?? 0;
        return dcf !== 0 ? k(dcf) : null;
      }),
      k(npvCommon),
    ];

    const summaryRows: (string | number | null)[][] = [
      [],
      ["Metric", "Value"],
      ["Project", projectLabel],
      ["Currency", currency],
      ["Model horizon (months)", horizonMonths],
      [
        "Visible column months (matches Financing preview)",
        previewColumnMonths.join(", "),
      ],
      ["Total common equity invested", keyMetrics.totalEquityInvested],
      ["Total common distributions", keyMetrics.totalDistributions],
      ["Common equity IRR (%)", Number(keyMetrics.leveredEquityIRR.toFixed(4))],
      [
        "Common equity multiple (x)",
        keyMetrics.equityMultiple > 0
          ? Number(keyMetrics.equityMultiple.toFixed(4))
          : null,
      ],
      [
        "Common equity payback (month index)",
        keyMetrics.equityPayback ?? null,
      ],
      ["Peak common equity", keyMetrics.peakEquity],
      ["Σ discounted common CFs (NPV, currency)", npvCommon],
    ];

    return [
      header,
      prefDrawRow,
      commonDrawRow,
      totalDrawRow,
      prefDivRow,
      prefPrincipalRow,
      commonDistRow,
      totalDistRow,
      netCommonRow,
      cumulativeRow,
      discountFactorRow,
      discountedCfRow,
      ...summaryRows,
    ];
  }, [
    displayedTableData,
    equityLineTotals,
    preferenceBreakdown,
    irrCheckData,
    npvCommon,
    previewColumnMonths,
    projectLabel,
    currency,
    horizonMonths,
    keyMetrics,
    hasPreference,
    getMonthlyDataValue,
  ]);

  const getExportData = useCallback(
    (): (string | number | null)[][] => exportRows,
    [exportRows]
  );

  const fileBase = `equity-returns_${projectInfo.city || "project"}_${currency}`;

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (!downloadOpen) return;
      const el = downloadRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setDownloadOpen(false);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [downloadOpen]);

  const handleDownloadMenu = () => {
    setDownloadOpen((v) => !v);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-32 text-white">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                Equity returns — model preview
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Project: {projectLabel} • Currency: {currency} • Horizon:{" "}
                {horizonMonths > 0 ? `${horizonMonths} months` : "—"}
                {projectMetrics
                  ? " • Linked to Financing preview metrics where available"
                  : ""}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {!waterfall ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
            <p className="font-medium text-white">No monthly series yet</p>
            <p className="mt-2 text-slate-300">
              Complete Component 4 and open{" "}
              <Link
                href={withStreamPrefix(streamPrefix, "/preview/financing")}
                className="text-emerald-400 underline"
              >
                Financing preview
              </Link>{" "}
              so project cash flows and{" "}
              <code className="text-slate-400">projectMetrics</code> populate.
              Ensure the financing wizard has generated{" "}
              <code className="text-slate-400">monthlyFundingStack</code> and
              unlevered monthly flows.
            </p>
          </div>
        ) : (
          <>
            {hasPreference && preferenceAdjustments && (
              <div className="mb-6 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
                💡 Preference shares: {currency}{" "}
                {(preferenceAdjustments.preferenceDraws[0] / 1000).toFixed(0)}k at
                M0 • Quarterly dividend (construction): {currency}{" "}
                {(preferenceAdjustments.quarterlyDividend / 1000).toFixed(1)}k •
                Annual dividend (ops @ FYE): {currency}{" "}
                {(preferenceAdjustments.annualDividend / 1000).toFixed(1)}k •
                Principal repaid: {currency}{" "}
                {(preferenceAdjustments.principalRepaid / 1000).toFixed(0)}k at M
                {preferenceAdjustments.principalRepaymentMonth}
              </div>
            )}
            <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-300">
                  Land as 100% equity
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    landAs100Equity
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-600/20 text-slate-400"
                  }`}
                >
                  {landAs100Equity ? "ON" : "OFF"}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Uses{" "}
                <code className="text-slate-400">financing.landEquityPercent</code>{" "}
                (same rule as Financing preview: percent ≥ 100 ⇒ land cost at M0).
                Land cost reference: {formatCurrency(cashOutflows.landCost || 0)}.
              </p>
            </div>
            <div className="mb-8">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-white">
                  MONTHLY EQUITY CASH FLOWS ({currency} &apos;000)
                </h2>
                <p className="text-xs text-slate-400">
                  Model M0–M{horizonMonths - 1} • Table columns match Financing
                  preview (monthly through M{stabilizationEndMonth}, then yearly
                  to M{totalHoldPeriodMonths}). Draw totals (right) are full
                  model sums from{" "}
                  <code className="text-slate-500">projectIRR.monthlyData</code>{" "}
                  Row G, matching Financing preview.
                </p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table
                  className="w-full text-xs text-white"
                  style={{ minWidth: tableMinWidthPx }}
                >
                  <thead>
                    <tr className="bg-slate-900">
                      <th
                        scope="col"
                        className="sticky left-0 z-50 min-w-[150px] border-b border-r border-slate-700 bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-300"
                      >
                        EQUITY ITEM
                      </th>
                      {displayedTableData.map((row) => (
                        <th
                          key={row.month}
                          scope="col"
                          className={`min-w-[60px] border-b border-r border-slate-700/50 px-2 py-2 text-center text-xs font-medium ${phaseHeaderClasses(
                            row.month,
                            constructionPeriod,
                            totalHoldPeriodMonths
                          )}`}
                        >
                          M{row.month}
                        </th>
                      ))}
                      <th
                        scope="col"
                        className="sticky right-0 z-50 min-w-[88px] border-b border-l-2 border-emerald-500 bg-slate-800 px-4 py-3 text-right text-sm font-semibold text-slate-300"
                      >
                        TOTAL
                      </th>
                    </tr>
                    <tr className="bg-slate-900/50">
                      <th
                        scope="col"
                        className="sticky left-0 z-50 border-b border-r border-slate-700 bg-slate-800"
                      />
                      {stageGroups.map((g, i) => {
                        const durationMatch = g.label.match(/\(([^)]+)\)$/);
                        const stageName = durationMatch
                          ? g.label.replace(/\s*\([^)]+\)\s*$/, "")
                          : g.label;
                        const duration = durationMatch?.[1] || null;
                        return (
                          <th
                            key={`${g.label}-${i}`}
                            scope="col"
                            colSpan={g.colSpan}
                            className={`border-b border-slate-700 bg-slate-900/50 px-2 py-2 text-center text-xs font-medium text-emerald-400 border-r border-slate-700/50 ${
                              i > 0 ? "border-l-2 border-l-emerald-600" : ""
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="font-semibold">{stageName}</span>
                              {duration && (
                                <span className="text-[10px] text-white">
                                  ({duration})
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                      <th
                        scope="col"
                        className="sticky right-0 z-50 border-b border-l-2 border-emerald-500 bg-slate-800"
                      />
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-t-2 border-slate-600 bg-emerald-500/10">
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-emerald-500/10 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                        Equity draws
                        <span className="mt-1 block text-[10px] font-normal normal-case text-slate-300/80">
                          {!hasPreference
                            ? "Row G from Financing preview (monthlyData)"
                            : "Split from preference waterfall"}
                        </span>
                      </td>
                      {displayedTableData.map((row) => {
                        const inj = getMonthlyDataValue(
                          row.month,
                          "equityInjection"
                        );
                        const show = !hasPreference ? inj : 0;
                        return (
                          <td
                            key={`d-h-${row.month}`}
                            className="border-r border-slate-700/50 bg-emerald-500/10 px-2 py-3 text-center text-slate-400"
                          >
                            {!hasPreference && show > 0
                              ? (show / 1000).toFixed(0)
                              : "—"}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 z-40 border-l-2 border-emerald-500 bg-emerald-500/10 px-4 py-3 text-right text-sm font-semibold text-emerald-300">
                        {!hasPreference
                          ? (equityLineTotals.totalDraw / 1000).toFixed(0)
                          : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-slate-950 px-6 py-3 pl-8 text-left font-medium text-slate-200">
                        • Preference
                      </td>
                      {displayedTableData.map((row) => (
                        <td
                          key={`pd-${row.month}`}
                          className="border-r border-slate-700/50 px-2 py-3 text-center text-xs text-slate-400"
                        >
                          {row.prefDraw > 0
                            ? (row.prefDraw / 1000).toFixed(0)
                            : "-"}
                        </td>
                      ))}
                      <td className="sticky right-0 z-40 border-l-2 border-emerald-500 bg-slate-950 px-4 py-3 text-right text-sm font-semibold text-slate-300">
                        {(equityLineTotals.prefDraw / 1000).toFixed(0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-slate-950 px-6 py-3 pl-8 text-left font-medium text-slate-200">
                        • Common
                      </td>
                      {displayedTableData.map((row) => {
                        const inj = getMonthlyDataValue(
                          row.month,
                          "equityInjection"
                        );
                        const commonDraw = !hasPreference
                          ? inj
                          : Math.max(0, row.totalDraw - row.prefDraw);
                        return (
                          <td
                            key={`cd-${row.month}`}
                            className="border-r border-slate-700/50 px-2 py-3 text-center text-xs text-slate-400"
                          >
                            {commonDraw > 0 ? (commonDraw / 1000).toFixed(0) : "-"}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 z-40 border-l-2 border-emerald-500 bg-slate-950 px-4 py-3 text-right text-sm font-semibold text-slate-300">
                        {(
                          (equityLineTotals.totalDraw - equityLineTotals.prefDraw) /
                          1000
                        ).toFixed(0)}
                      </td>
                    </tr>
                    <tr className="bg-slate-900/50">
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-slate-900/50 px-6 py-3 text-left font-semibold text-white">
                        Draws total
                      </td>
                      {displayedTableData.map((row) => {
                        const inj = getMonthlyDataValue(
                          row.month,
                          "equityInjection"
                        );
                        const total =
                          !hasPreference ? inj : row.totalDraw;
                        return (
                          <td
                            key={`td-${row.month}`}
                            className="border-r border-slate-700/50 px-2 py-3 text-center text-xs font-semibold text-emerald-400"
                          >
                            {total > 0 ? (total / 1000).toFixed(0) : "-"}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 z-40 border-l-2 border-emerald-500 bg-slate-900/50 px-4 py-3 text-right text-sm font-bold text-emerald-400">
                        {(equityLineTotals.totalDraw / 1000).toFixed(0)}
                      </td>
                    </tr>

                    <tr className="border-t-2 border-slate-600 bg-amber-500/10">
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-amber-500/10 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                        Distributions
                      </td>
                      {displayedTableData.map((row) => (
                        <td
                          key={`dist-h-${row.month}`}
                          className="border-r border-slate-700/50 bg-amber-500/10 px-2 py-3 text-center text-slate-400"
                        >
                          —
                        </td>
                      ))}
                      <td className="sticky right-0 z-40 border-l-2 border-emerald-500 bg-amber-500/10 px-4 py-3 text-right text-slate-400">
                        —
                      </td>
                    </tr>
                    {/* DISTRIBUTIONS - Preference Dividend (informational; funded via extra common injections) */}
                    <tr>
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-slate-950 px-6 py-3 pl-8 text-left font-medium text-slate-200">
                        • Preference dividend
                      </td>
                      {displayedTableData.map((row) => {
                        const v = preferenceBreakdown?.divByMonth?.[row.month] ?? 0;
                        return (
                          <td
                            key={`pdiv-${row.month}`}
                            className="border-r border-slate-700/50 px-2 py-3 text-center text-xs text-blue-400"
                          >
                            {v > 0 ? (v / 1000).toFixed(0) : "-"}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 z-40 border-l-2 border-emerald-500 bg-slate-950 px-4 py-3 text-right text-sm font-semibold text-blue-400">
                        {(
                          ((preferenceBreakdown?.totalDividends ?? 0) / 1000) || 0
                        ).toFixed(0)}
                      </td>
                    </tr>
                    {/* DISTRIBUTIONS - Preference Principal Repaid (deducted from NCF at tenor month) */}
                    <tr>
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-slate-950 px-6 py-3 pl-8 text-left font-medium text-slate-200">
                        • Pref. principal repaid
                      </td>
                      {displayedTableData.map((row) => {
                        const v =
                          preferenceBreakdown?.principalByMonth?.[row.month] ?? 0;
                        return (
                          <td
                            key={`pprin-${row.month}`}
                            className="border-r border-slate-700/50 px-2 py-3 text-center text-xs text-slate-400"
                          >
                            {v > 0 ? (v / 1000).toFixed(0) : "-"}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 z-40 border-l-2 border-emerald-500 bg-slate-950 px-4 py-3 text-right text-sm font-semibold text-slate-300">
                        {(
                          ((preferenceBreakdown?.totalPrincipal ?? 0) / 1000) || 0
                        ).toFixed(0)}
                      </td>
                    </tr>
                    {/* (Legacy) Kept removed: preference principal is shown above in the informational row */}
                    <tr>
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-slate-950 px-6 py-3 pl-8 text-left font-medium text-slate-200">
                        • Common
                      </td>
                      {displayedTableData.map((row) => (
                        <td
                          key={`cfd-${row.month}`}
                          className="border-r border-slate-700/50 px-2 py-3 text-center text-xs text-slate-400"
                        >
                          {row.commonDist > 0
                            ? (row.commonDist / 1000).toFixed(0)
                            : "-"}
                        </td>
                      ))}
                      <td className="sticky right-0 z-40 border-l-2 border-emerald-500 bg-slate-950 px-4 py-3 text-right text-sm font-semibold text-slate-300">
                        {(equityLineTotals.commonDist / 1000).toFixed(0)}
                      </td>
                    </tr>
                    <tr className="bg-slate-900/50">
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-slate-900/50 px-6 py-3 text-left font-semibold text-white">
                        Dist. total
                      </td>
                      {displayedTableData.map((row) => (
                        <td
                          key={`tdist-${row.month}`}
                          className="border-r border-slate-700/50 px-2 py-3 text-center text-xs font-semibold text-emerald-400"
                        >
                          {row.totalDist > 0
                            ? (row.totalDist / 1000).toFixed(0)
                            : "-"}
                        </td>
                      ))}
                      <td className="sticky right-0 z-40 border-l-2 border-emerald-500 bg-slate-900/50 px-4 py-3 text-right text-sm font-bold text-emerald-400">
                        {(equityLineTotals.totalDist / 1000).toFixed(0)}
                      </td>
                    </tr>

                    <tr className="border-t-2 border-slate-600 bg-slate-900/50">
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-slate-900/50 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                        Net equity CF (distributions − draws)
                      </td>
                      {displayedTableData.map((row) => (
                        <td
                          key={`n-h-${row.month}`}
                          className="border-r border-slate-700/50 bg-slate-900/50 px-2 py-3 text-center text-slate-400"
                        >
                          —
                        </td>
                      ))}
                      <td className="sticky right-0 z-40 border-l-2 border-emerald-500 bg-slate-900/50 px-4 py-3 text-right text-slate-400">
                        —
                      </td>
                    </tr>
                    <tr className="font-medium">
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-slate-950 px-6 py-3 pl-8 text-left text-slate-200" />
                      {displayedTableData.map((row) => {
                        const inj = getMonthlyDataValue(
                          row.month,
                          "equityInjection"
                        );
                        const commonDraw = !hasPreference
                          ? inj
                          : Math.max(0, row.totalDraw - row.prefDraw);
                        const commonDist = row.commonDist ?? 0;
                        const net = commonDist - commonDraw;

                        if ([0, 15, 18, resolvedTenorMonths, resolvedTenorMonths + 1].includes(row.month)) {
                          // eslint-disable-next-line no-console
                          console.log(`📊 [NET EQUITY CF] M${row.month}:`, {
                            commonDraw_k: commonDraw / 1000,
                            commonDist_k: commonDist / 1000,
                            net_k: net / 1000,
                          });
                        }

                        return (
                          <td
                            key={`necf-${row.month}`}
                            className={`border-r border-slate-700/50 px-2 py-3 text-center text-xs ${
                              net >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {net !== 0 ? (net / 1000).toFixed(0) : "-"}
                          </td>
                        );
                      })}
                      <td
                        className={`sticky right-0 z-40 border-l-2 border-emerald-500 bg-slate-950 px-4 py-3 text-right text-sm font-bold ${
                          displayedTableData.reduce((s, r) => {
                            const inj = getMonthlyDataValue(
                              r.month,
                              "equityInjection"
                            );
                            const cd = !hasPreference
                              ? inj
                              : Math.max(0, r.totalDraw - r.prefDraw);
                            return s + ((r.commonDist ?? 0) - cd);
                          }, 0) >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {(
                          displayedTableData.reduce((s, r) => {
                            const inj = getMonthlyDataValue(
                              r.month,
                              "equityInjection"
                            );
                            const cd = !hasPreference
                              ? inj
                              : Math.max(0, r.totalDraw - r.prefDraw);
                            return s + ((r.commonDist ?? 0) - cd);
                          }, 0) / 1000
                        ).toFixed(0)}
                      </td>
                    </tr>

                    <tr className="border-t-2 border-slate-600 bg-slate-900/50">
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-slate-900/50 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                        Cumulative equity
                      </td>
                      {displayedTableData.map((row) => (
                        <td
                          key={`c-h-${row.month}`}
                          className="border-r border-slate-700/50 bg-slate-900/50 px-2 py-3 text-center text-slate-400"
                        >
                          —
                        </td>
                      ))}
                      <td className="sticky right-0 z-40 border-l-2 border-emerald-500 bg-slate-900/50 px-4 py-3 text-right text-slate-400">
                        —
                      </td>
                    </tr>
                    <tr className="font-medium">
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-slate-950 px-6 py-3 pl-8 text-left text-slate-200" />
                      {displayedTableData.map((row) => (
                        <td
                          key={`cum-${row.month}`}
                          className={`border-r border-slate-700/50 px-2 py-3 text-center text-xs ${
                            row.cumulativeEquity >= 0
                              ? "text-emerald-400"
                              : "text-slate-400"
                          }`}
                        >
                          {row.cumulativeEquity !== 0
                            ? (row.cumulativeEquity / 1000).toFixed(0)
                            : "-"}
                        </td>
                      ))}
                      <td
                        className={`sticky right-0 z-40 border-l-2 border-emerald-500 bg-slate-950 px-4 py-3 text-right text-sm font-bold ${
                          equityLineTotals.lastCumulative >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {(equityLineTotals.lastCumulative / 1000).toFixed(0)}
                      </td>
                    </tr>

                    <tr className="border-t-2 border-slate-600 bg-purple-500/10">
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-purple-500/10 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                        IRR check (common CF)
                      </td>
                      {displayedTableData.map((row) => (
                        <td
                          key={`irr-h-${row.month}`}
                          className="border-r border-slate-700/50 bg-purple-500/10 px-2 py-3 text-center text-slate-400"
                        >
                          —
                        </td>
                      ))}
                      <td className="sticky right-0 z-40 border-l-2 border-emerald-500 bg-purple-500/10 px-4 py-3 text-right text-slate-400">
                        —
                      </td>
                    </tr>
                    <tr>
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-slate-950 px-6 py-3 pl-8 text-left font-medium text-slate-200">
                        Discount factor
                      </td>
                      {displayedTableData.map((drow) => {
                        const row = irrCheckData[drow.month];
                        return (
                          <td
                            key={`df-${drow.month}`}
                            className="border-r border-slate-700/50 px-2 py-3 text-center text-xs text-slate-400"
                          >
                            {row?.discountFactor != null
                              ? row.discountFactor.toFixed(3)
                              : "-"}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 z-40 border-l-2 border-emerald-500 bg-slate-950 px-4 py-3 text-right text-sm text-slate-400">
                        —
                      </td>
                    </tr>
                    <tr>
                      <td className="sticky left-0 z-40 border-r border-slate-700 bg-slate-950 px-6 py-3 pl-8 text-left font-medium text-slate-200">
                        Discounted CF
                      </td>
                      {displayedTableData.map((drow) => {
                        const row = irrCheckData[drow.month];
                        const dcf = row?.discountedCF ?? 0;
                        return (
                          <td
                            key={`dcf-${drow.month}`}
                            className={`border-r border-slate-700/50 px-2 py-3 text-center text-xs ${
                              Math.abs(dcf) < 1
                                ? "text-emerald-400"
                                : "text-slate-400"
                            }`}
                          >
                            {dcf !== 0 ? (dcf / 1000).toFixed(0) : "-"}
                          </td>
                        );
                      })}
                      <td
                        className={`sticky right-0 z-40 border-l-2 border-emerald-500 bg-slate-950 px-4 py-3 text-right text-sm font-bold ${
                          Math.abs(npvCommon) < 1000
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {(npvCommon / 1000).toFixed(0)}
                        {Math.abs(npvCommon) < 1000 ? " ≈0" : ""}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sub-heading / legend — same structure as `/preview/financing` stage sub-header row */}
              <div className="mt-4 space-y-3 border-t border-slate-700 pt-4">
                <div className="flex flex-wrap items-stretch gap-0 overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/30">
                  {stageGroups.map((g, i) => {
                    const durationMatch = g.label.match(/\(([^)]+)\)$/);
                    const stageName = durationMatch
                      ? g.label.replace(/\s*\([^)]+\)\s*$/, "")
                      : g.label;
                    const duration = durationMatch?.[1] || null;
                    return (
                      <div
                        key={`${g.label}-${i}`}
                        className={`flex min-w-[100px] flex-1 flex-col items-center justify-center gap-1 border-slate-700/50 bg-slate-900/50 px-3 py-2 text-center ${
                          i > 0 ? "border-l-2 border-l-emerald-600" : ""
                        }`}
                      >
                        <span className="text-xs font-semibold text-emerald-400">
                          {stageName}
                        </span>
                        {duration && (
                          <span className="text-[10px] text-white">
                            ({duration})
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">
                  Σ discounted common CFs (NPV @ IRR, full monthly series):{" "}
                  {(npvCommon / 1000).toFixed(1)} &apos;000
                  {Math.abs(npvCommon) < 1000 ? " (≈0)" : ""}. Common equity IRR
                  still uses the full monthly series.
                </p>
              </div>
            </div>

            <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">
                📈 Key Equity Metrics{" "}
                {hasPreference
                  ? "(Common Equity After Preference)"
                  : "(Common Equity Only)"}
              </h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">
                    Total Common Equity Invested
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {formatCurrency(keyMetrics.totalEquityInvested)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">
                    Total Common Distributions
                  </p>
                  <p className="mt-1 text-lg font-semibold text-emerald-400">
                    {formatCurrency(keyMetrics.totalDistributions)}
                  </p>
                  {!hasPreference && commonEquityHeadline ? (
                    <p className="mt-1 text-[10px] text-slate-500">
                      Sum of NCF post at each operating FYE from M
                      {commonEquityHeadline.distributionMeta.firstDistributionFyeMonth ?? "—"}{" "}
                      through exit FYE M{commonEquityHeadline.distributionMeta.exitFyeMonth}{" "}
                      (after last equity injection M
                      {commonEquityHeadline.distributionMeta.lastEquityInjectionMonth} and last
                      negative NCF post M
                      {commonEquityHeadline.distributionMeta.lastNegativeNcfPostMonth}).
                    </p>
                  ) : null}
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Common Equity IRR</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-400">
                    {keyMetrics.leveredEquityIRR.toFixed(2)}%
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Matches IRR check (shared equity cash flows)
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Common Equity Multiple</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-400">
                    {keyMetrics.equityMultiple.toFixed(2)}x
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Common Equity Payback</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-400">
                    {keyMetrics.equityPayback != null
                      ? `Month ${keyMetrics.equityPayback}`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Peak Common Equity</p>
                  <p className="mt-1 text-lg font-semibold text-amber-400">
                    {formatCurrency(keyMetrics.peakEquity)}
                  </p>
                </div>
              </div>
              {hasPreference && preferenceCalcForBreakdown && (
                <div className="mt-6 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs text-slate-300">
                  <p className="font-medium text-amber-200/90">
                    Preference schedule (fixed coupon)
                  </p>
                  <ul className="mt-2 space-y-1 text-slate-400">
                    <li>
                      Annual dividend (paid at FYE):{" "}
                      {formatCurrency(
                        preferenceCalcForBreakdown.quarterlyDividendDue
                      )}
                    </li>
                    <li>
                      Total dividends paid (model):{" "}
                      {formatCurrency(
                        preferenceCalcForBreakdown.totalDividendsPaid
                      )}
                    </li>
                    <li>
                      Principal bullet:{" "}
                      {preferenceBreakdown
                        ? `M${preferenceBreakdown.tenorEndIdx} (${resolvedTenorMonths}-month tenor)`
                        : "—"}
                    </li>
                    {preferenceCalcForBreakdown.error ? (
                      <li className="text-red-300">
                        {preferenceCalcForBreakdown.error}
                      </li>
                    ) : null}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {downloadOpen ? (
        <div
          ref={downloadRef}
          className="fixed bottom-24 left-4 right-4 z-50 rounded-xl border border-slate-700 bg-slate-800/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md md:left-1/2 md:right-auto md:w-[320px] md:-translate-x-1/2"
        >
          <p className="mb-2 text-xs font-medium text-slate-300">
            Download equity returns preview as…
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                exportToExcel({
                  filename: fileBase,
                  sheetName: "Equity Returns (000)",
                  rows: getExportData(),
                });
                setDownloadOpen(false);
              }}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => {
                exportToCSV({
                  filename: fileBase,
                  rows: getExportData(),
                });
                setDownloadOpen(false);
              }}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600"
            >
              CSV (.csv)
            </button>
          </div>
        </div>
      ) : null}

      <PreviewFloatingBar
        previousRoute={withStreamPrefix(streamPrefix, "/equity-returns")}
        nextRoute={withStreamPrefix(streamPrefix, "/scenario-analysis")}
        onDownload={handleDownloadMenu}
      />
    </div>
  );
}
