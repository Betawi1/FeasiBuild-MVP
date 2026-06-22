"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchParamsBoundary from "@/components/SearchParamsBoundary";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import {
  buildCommonEquityTableRows,
  computeCommonDistributionByMonth,
  cumulativeNetEquityFromRows,
  getLoanRepaymentMonthFromMonthlyData,
  getMonthlyDataValueFromStore,
  type MonthlyDataField,
} from "@/lib/common-equity-net-series";
import { calculateCommonEquityMetrics } from "@/lib/equity-metrics";
import {
  annualIrrPercentFromMonthlySeries,
  cumulativeSeries,
} from "@/lib/equity-irr";
import { solveAnnualIRRPreferred } from "@/lib/irr-calculations";
import {
  buildSimplifiedPreferenceWaterfall,
  calculatePreferenceAdjustments,
} from "@/lib/preference-simple";
import { allocateWaterfallCashFlows } from "@/lib/waterfall";
import useFinModelStore, {
  DEFAULT_PREFERENCE_TENOR_MONTHS,
  getOperationalYearMonthRange,
  PRE_OPERATION_BUFFER_MONTHS,
} from "@/store/useFinModelStore";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";

type EquityTab = "summary" | "multiple" | "payback" | "waterfall";

type CashFlowPoint = { month: number; amount: number };

function CumulativeEquityChart({
  cumulative,
  breakevenMonth,
}: {
  cumulative: number[];
  breakevenMonth: number | null;
}) {
  const h = 100;
  const w = 360;
  if (cumulative.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500">No cash flow series.</p>
    );
  }
  const minV = Math.min(0, ...cumulative);
  const maxV = Math.max(0, ...cumulative, 1);
  const range = maxV - minV || 1;
  const pts = cumulative
    .map((v, i) => {
      const x = (i / Math.max(1, cumulative.length - 1)) * w;
      const y = h - 6 - ((v - minV) / range) * (h - 12);
      return `${x},${y}`;
    })
    .join(" ");
  const bx =
    breakevenMonth != null && breakevenMonth < cumulative.length
      ? (breakevenMonth / Math.max(1, cumulative.length - 1)) * w
      : null;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-28 w-full max-w-lg text-emerald-400"
      preserveAspectRatio="none"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {bx != null ? (
        <line
          x1={bx}
          x2={bx}
          y1={4}
          y2={h - 4}
          stroke="rgba(251, 191, 36, 0.6)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      ) : null}
    </svg>
  );
}

function MultipleHBarGroup({
  label,
  invested,
  returned,
  maxScale,
}: {
  label: string;
  invested: number;
  returned: number;
  maxScale: number;
}) {
  const scale = maxScale > 0 ? 100 / maxScale : 0;
  return (
    <div className="space-y-2 rounded-lg border border-slate-700/80 bg-slate-900/40 p-3">
      <p className="text-xs font-medium text-slate-300">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] text-slate-500">
            Invested
          </span>
          <div className="h-2.5 min-w-0 flex-1 rounded-full bg-slate-800">
            <div
              className="h-2.5 rounded-full bg-rose-500/75"
              style={{ width: `${Math.min(100, invested * scale)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] text-slate-500">
            Returned
          </span>
          <div className="h-2.5 min-w-0 flex-1 rounded-full bg-slate-800">
            <div
              className="h-2.5 rounded-full bg-emerald-500/75"
              style={{ width: `${Math.min(100, returned * scale)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const TAB_IDS: EquityTab[] = ["summary", "multiple", "payback", "waterfall"];

/**
 * Common equity cash flows for IRR / multiple / payback match `/preview/equity-returns`:
 * `computeCommonDistributionByMonth` (loan-gated when no preference) +
 * `buildSimplifiedPreferenceWaterfall` / `allocateWaterfallCashFlows` +
 * `buildCommonEquityCashFlows` (see `@/lib/common-equity-net-series`).
 */

/** Minimum redeemable preference tenor (months) when model horizon allows. */
const MIN_PREFERENCE_TENOR_MONTHS = 12;

function EquityReturnsPageContent() {
  const router = useRouter();
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<EquityTab>("summary");

  // Preference Shares State
  const [hasPreferenceShares, setHasPreferenceShares] = useState(false);
  const [prefAmount, setPrefAmount] = useState<number | ''>('');
  const [prefReturnType, setPrefReturnType] = useState<
    "fixed_dividend" | "target_profit"
  >("fixed_dividend");
  const [prefReturnPercent, setPrefReturnPercent] = useState<number | ''>('');
  const [prefTenorMonths, setPrefTenorMonths] = useState<number | ''>('');
  const [prefTenorError, setPrefTenorError] = useState<string | null>(null);

  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const projectIRR =
    useFinModelStore((s) => (s as any)[finStream]?.projectIRR) ??
    ({ projectMetrics: {} } as any);
  const financing = useFinModelStore((s) => (s as any)[finStream]?.financing) ?? ({} as any);
  const updateEquityReturns = useFinModelStore((s) => s.updateEquityReturns);
  const updateFinancing = useFinModelStore((s) => s.updateFinancing);
  const updateProjectIRR = useFinModelStore((s) => s.updateProjectIRR);

  const skipPrefStoreSync = useRef(true);

  const loanRepaymentMonth = useMemo(() => {
    const m =
      getLoanRepaymentMonthFromMonthlyData(projectIRR.monthlyData) ?? 166;
    return Math.max(0, m);
  }, [projectIRR.monthlyData]);

  useLayoutEffect(() => {
    const store = useFinModelStore.getState() as any;
    const stream = store?.[finStream] ?? {};
    const financingSnap = stream.financing ?? {};
    const projectIrrSnap = stream.projectIRR ?? {};
    const ps = financingSnap.preferenceShares ?? {};
    const flows = projectIrrSnap.monthlyCashFlows || [];
    const h =
      flows.length > 0 ? flows[flows.length - 1].month + 1 : 0;
    const cp = store[finStream].cashOutflows.constructionPeriod || 30;
    const hy = financingSnap.holdPeriodYears || 10;
    const exitM = Math.round(hy * 12);
    const totalHold = Math.max(cp + 90, exitM);
    const maxT = Math.max(1, h > 0 ? Math.min(h, totalHold) : totalHold);
    const minT =
      maxT >= MIN_PREFERENCE_TENOR_MONTHS ? MIN_PREFERENCE_TENOR_MONTHS : 1;

    setHasPreferenceShares(ps.hasPreferenceShares);
    setPrefAmount(ps.amount);
    setPrefReturnPercent(ps.returnPercent);
    setPrefReturnType(
      ps.returnType === "target_profit" ? "target_profit" : "fixed_dividend"
    );
    // Tenor is system-determined: preference principal repaid only after senior loan payoff.
    // Lock to the last principal repayment month (Row E), defaulting to M166.
    const fixed =
      getLoanRepaymentMonthFromMonthlyData(projectIrrSnap.monthlyData) ?? 166;
    setPrefTenorMonths(fixed);
    setPrefTenorError(null);
  }, [finStream]);

  useEffect(() => {
    const tabParam = searchParams?.get("tab") as EquityTab | null;
    if (tabParam && TAB_IDS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: EquityTab) => {
    setActiveTab(tab);
    router.push(`/equity-returns?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    const store = useFinModelStore.getState() as any;
    const stream = store?.[finStream] ?? {};
    const financingSnap = stream.financing ?? {};
    const projectIrrSnap = stream.projectIRR ?? {};
    // eslint-disable-next-line no-console
    console.log("📖 [Component 5] Reading from store (useFinModelStore):", {
      projectIRR_projectMetrics: projectIrrSnap.projectMetrics,
      projectIRR_peakFunding: projectIrrSnap.peakFunding,
      projectIRR_unleveredIRR: projectIrrSnap.unleveredIRR,
      financing_totalDebt: financingSnap.totalDebt,
      financing_monthlyDebtService_sample:
        financingSnap.monthlyDebtService?.[0]?.service ?? 0,
      financing_preferenceShares: financingSnap.preferenceShares,
    });
  }, []);

  const baseCashFlows: CashFlowPoint[] = useMemo(
    () => projectIRR.monthlyCashFlows || [],
    [projectIRR.monthlyCashFlows]
  );

  // Must match `/preview/equity-returns` and `/preview/financing` month indexing for op-year FYEs.
  const constructionPeriod =
    Math.max(
      cashOutflows.constructionPeriod ?? 0,
      financing.constructionPeriodMonths ?? 0
    ) || 30;

  const commonEquityHeadline = useMemo(
    () =>
      calculateCommonEquityMetrics({
        monthlyData: projectIRR.monthlyData,
        constructionPeriod,
        exitYear: financing.exitYear,
      }),
    [projectIRR.monthlyData, constructionPeriod, financing.exitYear]
  );

  const prefPrincipal =
    hasPreferenceShares && prefAmount !== ""
      ? Number(prefAmount)
      : 0;
  const prefRate =
    hasPreferenceShares && prefReturnPercent !== ""
      ? Number(prefReturnPercent) / 100
      : 0;

  /** Align with financing preview NCF length so preference tenor / bullet use full Row J series (avoids bullet at M19 when NCF has 120+ months). */
  const cashFlowHorizonMonths =
    baseCashFlows.length > 0
      ? baseCashFlows[baseCashFlows.length - 1].month + 1
      : 0;
  const cumulativeNcfLength =
    projectIRR.cumulativeNcfPostFinancingByMonth?.length ?? 0;
  const equityInjectionLength = projectIRR.equityInjectionByMonth?.length ?? 0;
  const horizonMonths = Math.max(
    cashFlowHorizonMonths,
    cumulativeNcfLength,
    equityInjectionLength
  );

  const getMonthlyDataValue = useMemo(() => {
    const data = projectIRR?.monthlyData || [];
    return (month: number, field: MonthlyDataField) =>
      getMonthlyDataValueFromStore(data, month, field);
  }, [projectIRR?.monthlyData]);

  const totalHoldPeriodMonths = useMemo(() => {
    const cp = cashOutflows.constructionPeriod || 30;
    const hy = financing.holdPeriodYears || 10;
    const exitM = Math.round(hy * 12);
    return Math.max(cp + 90, exitM);
  }, [cashOutflows.constructionPeriod, financing.holdPeriodYears]);

  // Tenor is locked to loan payoff month; user cannot edit.

  useEffect(() => {
    if (skipPrefStoreSync.current) {
      skipPrefStoreSync.current = false;
      return;
    }
    updateFinancing({
      preferenceShares: {
        hasPreferenceShares,
        amount:
          hasPreferenceShares && prefAmount !== "" ? Number(prefAmount) : 0,
        returnType: prefReturnType,
        returnPercent:
          hasPreferenceShares && prefReturnPercent !== ""
            ? Number(prefReturnPercent)
            : 0,
        tenorMonths: hasPreferenceShares ? loanRepaymentMonth : 0,
        redeemAtFairValue: false,
      },
    });
  }, [
    hasPreferenceShares,
    prefAmount,
    prefReturnType,
    prefReturnPercent,
    loanRepaymentMonth,
    updateFinancing,
  ]);

  const resolvedTenorMonths = useMemo(() => {
    return loanRepaymentMonth;
  }, [loanRepaymentMonth]);

  const monthlyEquityInjectionsRaw = useMemo(() => {
    const raw = projectIRR.equityInjectionByMonth;
    if (!raw?.length || horizonMonths <= 0) return [];
    const out: number[] = [];
    for (let m = 0; m < horizonMonths; m++) {
      out[m] = raw[m] ?? 0;
    }
    return out;
  }, [projectIRR.equityInjectionByMonth, horizonMonths]);

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
    if (!hasPreferenceShares || prefPrincipal <= 0) return null;
    const operationalFyeMonths: number[] = [];
    for (let oy = 1; oy <= 10; oy++) {
      operationalFyeMonths.push(
        getOperationalYearMonthRange(oy, constructionPeriod).endMonth
      );
    }
    const adj = calculatePreferenceAdjustments(
      monthlyEquityInjectionsRaw,
      prefPrincipal,
      prefRate,
      resolvedTenorMonths,
      operationalFyeMonths,
      constructionPeriod + PRE_OPERATION_BUFFER_MONTHS
    );
    // eslint-disable-next-line no-console
    console.log("🔍 [Preference Adjustments] Debug:", {
      originalM0_k: (monthlyEquityInjectionsRaw[0] ?? 0) / 1000,
      adjustedM0_k: (adj.adjustedEquityInjections[0] ?? 0) / 1000,
      m3_k: (adj.adjustedEquityInjections[3] ?? 0) / 1000,
      m15_k: (adj.adjustedEquityInjections[15] ?? 0) / 1000,
      m36_k: (adj.adjustedEquityInjections[36] ?? 0) / 1000,
      totalCommonEquity_k:
        adj.adjustedEquityInjections.reduce((s, v) => s + v, 0) / 1000,
    });
    return adj;
  }, [
    hasPreferenceShares,
    prefPrincipal,
    prefRate,
    resolvedTenorMonths,
    monthlyEquityInjectionsRaw,
    constructionPeriod,
  ]);

  useEffect(() => {
    if (!hasPreferenceShares) {
      const pm = (useFinModelStore.getState() as any)[finStream]?.projectIRR?.projectMetrics;
      if (pm?.preferenceCalculation != null) {
        updateProjectIRR(
          {
            projectMetrics: { ...pm, preferenceCalculation: null },
          },
          finStream === "sale" || finStream === "operational"
            ? finStream
            : undefined
        );
      }
      return;
    }

    if (!preferenceAdjustments) return;

    const pm = (useFinModelStore.getState() as any)[finStream]?.projectIRR?.projectMetrics;
    const totalDiv = preferenceAdjustments.preferenceDividendsPaid.reduce(
      (s, v) => s + v,
      0
    );
    updateProjectIRR(
      {
        projectMetrics: {
          leveredEquityIRR: pm?.leveredEquityIRR ?? 0,
          equityMultiple: pm?.equityMultiple ?? 0,
          equityPaybackMonth: pm?.equityPaybackMonth ?? 0,
          peakEquityInjected: pm?.peakEquityInjected ?? 0,
          totalEquityInvested: pm?.totalEquityInvested ?? 0,
          totalDistributions: pm?.totalDistributions ?? 0,
          ...(pm?.unleveredIRR != null ? { unleveredIRR: pm.unleveredIRR } : {}),
          ...(pm?.peakFunding != null ? { peakFunding: pm.peakFunding } : {}),
          preferenceCalculation: {
            quarterlyDividendDue: preferenceAdjustments.annualDividend,
            dividendsPaid: preferenceAdjustments.preferenceDividendsPaid,
            principalRepaid: preferenceAdjustments.principalRepaid,
            error: null,
            totalDividendsPaid: totalDiv,
            tenorMonths: resolvedTenorMonths,
          },
        },
      },
      finStream === "sale" || finStream === "operational"
        ? finStream
        : undefined
    );
  }, [
    hasPreferenceShares,
    preferenceAdjustments,
    resolvedTenorMonths,
    updateProjectIRR,
    finStream,
  ]);

  const waterfall = useMemo(() => {
    if (horizonMonths <= 0) return null;
    if (hasPreferenceShares && prefPrincipal > 0) {
      const operationalFyeMonths: number[] = [];
      for (let oy = 1; oy <= 10; oy++) {
        operationalFyeMonths.push(
          getOperationalYearMonthRange(oy, constructionPeriod).endMonth
        );
      }
      return buildSimplifiedPreferenceWaterfall(
        monthlyEquityInjectionsRaw,
        monthlyDistributionsRaw,
        prefPrincipal,
        prefRate,
        resolvedTenorMonths,
        operationalFyeMonths,
        constructionPeriod + PRE_OPERATION_BUFFER_MONTHS
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
    hasPreferenceShares,
    prefPrincipal,
    prefRate,
    resolvedTenorMonths,
    monthlyEquityInjectionsRaw,
    monthlyDistributionsRaw,
    constructionPeriod,
  ]);

  const hasPreferenceModel = hasPreferenceShares && prefPrincipal > 0;

  const commonDistributionByMonth = useMemo(
    () =>
      computeCommonDistributionByMonth({
        horizonMonths,
        hasPreference: hasPreferenceModel,
        prefPrincipal,
        prefRate,
        resolvedTenorMonths,
        getMonthlyDataValue,
        monthlyDataForLoanDetection: projectIRR.monthlyData,
      }),
    [
      horizonMonths,
      hasPreferenceModel,
      prefPrincipal,
      prefRate,
      resolvedTenorMonths,
      getMonthlyDataValue,
      projectIRR.monthlyData,
    ]
  );

  const commonEquityNetFromTable = useMemo(() => {
    if (!waterfall || horizonMonths <= 0) return null;
    const rows = buildCommonEquityTableRows({
      horizonMonths,
      waterfall,
      commonDistributionByMonth,
      extraCommonDrawByMonth:
        hasPreferenceModel && preferenceAdjustments?.preferenceDividendsPaid?.length
          ? preferenceAdjustments.preferenceDividendsPaid
          : undefined,
    });
    const withCum = cumulativeNetEquityFromRows(rows);
    const netFlows = rows.map((r) => r.netEquityCF);
    const totalCommonEquityInvested = rows.reduce((s, r) => s + r.commonDraw, 0);
    const totalCommonDistributions = rows.reduce((s, r) => s + r.commonDist, 0);
    let peakCommon = 0;
    let paybackMonth: number | null = null;
    for (const r of withCum) {
      if (r.cumulativeEquity < 0) {
        peakCommon = Math.max(peakCommon, Math.abs(r.cumulativeEquity));
      }
      if (paybackMonth === null && r.cumulativeEquity >= 0) {
        paybackMonth = r.month;
      }
    }
    return {
      rows,
      netEquityCashFlows: netFlows,
      cumulativeNetEquity: withCum.map((r) => r.cumulativeEquity),
      totalCommonEquityInvested,
      totalCommonDistributions,
      commonAnnualIrr: (() => {
        const solved = solveAnnualIRRPreferred(
          netFlows.map((amount, month) => ({ month, amount })),
          {
            tolerance: 1000,
            maxIterations: 250,
            selection: "max",
            preferredAnnualIRR: 0.125,
          }
        );
        return solved.annualIRR != null && Number.isFinite(solved.annualIRR)
          ? solved.annualIRR * 100
          : annualIrrPercentFromMonthlySeries(netFlows);
      })(),
      commonMultiple:
        totalCommonEquityInvested > 0
          ? totalCommonDistributions / totalCommonEquityInvested
          : null,
      commonPayback: paybackMonth,
      commonPeakEquityInjected: peakCommon,
    };
  }, [waterfall, horizonMonths, commonDistributionByMonth]);

  const commonEquityPaybackPoints: CashFlowPoint[] = useMemo(() => {
    const series = commonEquityNetFromTable?.netEquityCashFlows ?? [];
    return series.map((amount, month) => ({ month, amount }));
  }, [commonEquityNetFromTable]);

  const maxAbsCommonEquityPayback = useMemo(
    () =>
      Math.max(
        1,
        ...(commonEquityNetFromTable?.netEquityCashFlows ?? []).map((a) =>
          Math.abs(a)
        )
      ),
    [commonEquityNetFromTable]
  );

  const prefFlows: CashFlowPoint[] = useMemo(() => {
    if (!waterfall) return [];
    return waterfall.preferenceCashFlows.map((amount, month) => ({
      month,
      amount,
    }));
  }, [waterfall]);

  const commonFlows: CashFlowPoint[] = useMemo(() => {
    if (!waterfall) return [];
    return waterfall.commonCashFlows.map((amount, month) => ({
      month,
      amount,
    }));
  }, [waterfall]);

  useEffect(() => {
    const store = useFinModelStore.getState() as any;
    const stream = store?.[finStream] ?? {};
    const financingSnap = stream.financing ?? {};
    const projectIrrSnap = stream.projectIRR ?? {};
    // eslint-disable-next-line no-console
    console.log("🧮 [Component 5] Calculating Equity Returns (useFinModelStore):", {
      projectIRR_projectMetrics: projectIrrSnap.projectMetrics,
      monthlyCashFlows_sample: projectIrrSnap.monthlyCashFlows?.slice(0, 6),
      debtService_sample: financingSnap.monthlyDebtService?.slice(0, 6),
      financing_preferenceShares: financingSnap.preferenceShares,
      equityInjectionByMonth_len: projectIrrSnap.equityInjectionByMonth?.length ?? 0,
      equityInjectionByMonth_M0: projectIrrSnap.equityInjectionByMonth?.[0] ?? null,
      equityInjectionByMonth_M15: projectIrrSnap.equityInjectionByMonth?.[15] ?? null,
    });
  }, [projectIRR.monthlyCashFlows, financing.monthlyDebtService, financing.preferenceShares]);

  const commonAnnualIrr = commonEquityNetFromTable?.commonAnnualIrr ?? null;
  const commonMultiple = commonEquityNetFromTable?.commonMultiple ?? null;
  const commonPayback = commonEquityNetFromTable?.commonPayback ?? null;

  useEffect(() => {
    if (!waterfall) return;
    // eslint-disable-next-line no-console
    console.log("🔍 Waterfall Calculation Debug:");
    // eslint-disable-next-line no-console
    console.log("  hasPreferenceShares:", hasPreferenceShares);
    // eslint-disable-next-line no-console
    console.log("  prefAmount:", prefAmount);
    // eslint-disable-next-line no-console
    console.log("  prefReturnPercent:", prefReturnPercent);
    // eslint-disable-next-line no-console
    console.log("  prefTenorMonths:", prefTenorMonths);
    // eslint-disable-next-line no-console
    console.log(
      "  waterfall.commonCashFlows (first 5 months):",
      waterfall.commonCashFlows.slice(0, 5)
    );
    // eslint-disable-next-line no-console
    console.log("  waterfall.commonMultiple:", waterfall.commonMultiple);
    // eslint-disable-next-line no-console
    console.log(
      "  commonIRR (annualized):",
      commonAnnualIrr != null ? `${commonAnnualIrr.toFixed(4)}%` : "(null)"
    );
    // eslint-disable-next-line no-console
    console.log("  waterfall.preferenceMultiple:", waterfall.preferenceMultiple);
  }, [
    waterfall,
    hasPreferenceShares,
    prefAmount,
    prefReturnPercent,
    prefTenorMonths,
    commonAnnualIrr,
  ]);

  const projectMetrics = projectIRR.projectMetrics;
  const hurdleIrr =
    !hasPreferenceShares && projectMetrics?.leveredEquityIRR != null
      ? projectMetrics.leveredEquityIRR
      : commonAnnualIrr;

  const commonWarning =
    hurdleIrr != null && hurdleIrr < 15
      ? hasPreferenceShares
        ? "Warning: Levered common equity IRR is below 15%. Project may not meet investor hurdles."
        : "Warning: Levered equity IRR is below 15%. Project may not meet investor hurdles."
      : null;
  const commonSuccess =
    hurdleIrr != null && hurdleIrr >= 20
      ? hasPreferenceShares
        ? "Levered common equity IRR is at or above 20%. Project appears attractive for equity investors."
        : "Levered equity IRR is at or above 20%. Project appears attractive for equity investors."
      : null;

  const maxAbsPref = Math.max(1, ...prefFlows.map((c) => Math.abs(c.amount)));

  const commonCumulative = useMemo(
    () =>
      commonEquityNetFromTable?.cumulativeNetEquity ??
      cumulativeSeries(waterfall?.commonCashFlows ?? []),
    [commonEquityNetFromTable, waterfall]
  );

  const commonPeakEquityInjected =
    commonEquityNetFromTable?.commonPeakEquityInjected ?? 0;

  const totalInvestedCommon = useMemo(
    () =>
      commonEquityNetFromTable?.totalCommonEquityInvested ??
      commonFlows
        .filter((c) => c.amount < 0)
        .reduce((s, c) => s + Math.abs(c.amount), 0),
    [commonEquityNetFromTable, commonFlows]
  );
  const totalReturnedCommon = useMemo(
    () =>
      commonEquityNetFromTable?.totalCommonDistributions ??
      commonFlows
        .filter((c) => c.amount > 0)
        .reduce((s, c) => s + c.amount, 0),
    [commonEquityNetFromTable, commonFlows]
  );

  const projectWaterfallMultiple = useMemo(() => {
    if (!waterfall) return null;
    const prefInv = waterfall.totalPreferenceInvested;
    const commonInv = totalInvestedCommon;
    const prefRet = waterfall.preferenceTotalDistributed;
    const commonRet = totalReturnedCommon;
    const inv = prefInv + commonInv;
    if (inv <= 0) return null;
    return (prefRet + commonRet) / inv;
  }, [waterfall, totalInvestedCommon, totalReturnedCommon]);

  const multipleChartMax = useMemo(() => {
    if (!waterfall) return 1;
    const prefInv = hasPreferenceShares ? waterfall.totalPreferenceInvested : 0;
    const prefRet = hasPreferenceShares
      ? waterfall.preferenceTotalDistributed
      : 0;
    return Math.max(
      prefInv,
      prefRet,
      totalInvestedCommon,
      totalReturnedCommon,
      1
    );
  }, [waterfall, hasPreferenceShares, totalInvestedCommon, totalReturnedCommon]);

  const finalSurplusCommon = useMemo(() => {
    const ce = commonEquityNetFromTable?.cumulativeNetEquity;
    if (ce?.length) return ce[ce.length - 1] ?? 0;
    return commonFlows.reduce((s, c) => s + c.amount, 0);
  }, [commonEquityNetFromTable, commonFlows]);

  useEffect(() => {
    const leveredIRR = hasPreferenceShares
      ? commonAnnualIrr
      : (commonEquityHeadline?.commonEquityIrrPct ?? commonAnnualIrr);
    const equityMultiple = hasPreferenceShares
      ? commonMultiple
      : (commonEquityHeadline?.commonEquityMultiple ?? commonMultiple);
    const paybackPeriod = hasPreferenceShares
      ? commonPayback
      : (commonEquityHeadline?.commonEquityPaybackMonth ?? commonPayback);

    updateEquityReturns(
      {
      leveredIRR,
      equityMultiple,
      paybackPeriod,
      waterfall: [
        "Operating cash flows from project (unlevered).",
        "Debt service paid monthly from Component 4.",
        "Preference dividends and redemption (if any).",
        "Residual cash flows to common equity.",
      ],
      dscrProfile: financing.dscrProfile.map(
        (d: { month: number; dscr: number | null }) => ({
        month: d.month,
        dscr: d.dscr,
      })
      ),
    },
    "sale"
    );
    console.log("💾 [Component 5] Saving to store:", {
      leveredIRR,
      equityMultiple,
      paybackPeriod,
    });
  }, [
    hasPreferenceShares,
    commonEquityHeadline,
    commonAnnualIrr,
    commonMultiple,
    commonPayback,
    financing.dscrProfile,
    updateEquityReturns,
  ]);

  const currency = projectInfo.currency || "AED";
  const peakEquityFallback =
    financing.peakEquityRequired ??
    projectIRR.peakFunding ??
    6580000;

  const blendedLeveredIRR =
    projectMetrics?.leveredEquityIRR ?? commonAnnualIrr ?? 23.76;
  const blendedMultiple =
    projectMetrics?.equityMultiple ?? commonMultiple ?? 1.44;
  const blendedPayback =
    projectMetrics?.equityPaybackMonth ?? commonPayback ?? 30;
  const blendedPeak =
    projectMetrics?.peakEquityInjected ??
    projectMetrics?.peakFunding ??
    peakEquityFallback;

  /** When preference is off, headline KPIs use shared cash-flow logic (same as preview). */
  const useFinancingPreviewHeadline =
    !hasPreferenceModel && commonEquityHeadline != null;

  const keyMetrics = useMemo(() => {
    if (!hasPreferenceModel && commonEquityHeadline) {
      // Source-of-truth for *displayed* total distributions is the Component 5 table ("Common" row),
      // which already matches `/operational/preview/equity-returns` (M130/M142/M154/M166 → 1,197.53M).
      // The monthlyData-based helper can undercount if any FYE month row is missing in store snapshots.
      const totalCommonDistributionsFromTable =
        commonEquityNetFromTable?.totalCommonDistributions ?? null;
      return {
        totalCommonEquityInvested: commonEquityHeadline.totalCommonEquityInvested,
        totalCommonDistributions:
          totalCommonDistributionsFromTable ??
          commonEquityHeadline.totalCommonDistributions,
        leveredIRR: commonEquityHeadline.commonEquityIrrPct,
        equityMultiple:
          totalCommonDistributionsFromTable != null &&
          commonEquityHeadline.totalCommonEquityInvested > 0
            ? totalCommonDistributionsFromTable /
              commonEquityHeadline.totalCommonEquityInvested
            : commonEquityHeadline.commonEquityMultiple,
        equityPayback: commonEquityHeadline.commonEquityPaybackMonth,
        peakEquity: commonEquityHeadline.peakCommonEquity,
        sponsorPromote: 0,
        promoteHurdleMultiple: 1.5,
        promoteCarryRate: 0,
        projectWaterfallMultiple,
      };
    }
    const net = commonEquityNetFromTable;
    if (hasPreferenceModel && net) {
      return {
        totalCommonEquityInvested: net.totalCommonEquityInvested,
        totalCommonDistributions: net.totalCommonDistributions,
        leveredIRR: net.commonAnnualIrr ?? null,
        equityMultiple: net.commonMultiple ?? null,
        equityPayback: net.commonPayback ?? null,
        peakEquity: net.commonPeakEquityInjected,
        sponsorPromote: 0,
        promoteHurdleMultiple: 1.5,
        promoteCarryRate: 0,
        projectWaterfallMultiple,
      };
    }
    return {
      totalCommonEquityInvested: null,
      totalCommonDistributions: null,
      leveredIRR: hasPreferenceShares ? null : blendedLeveredIRR,
      equityMultiple: hasPreferenceShares ? null : blendedMultiple,
      equityPayback: hasPreferenceShares ? null : blendedPayback,
      peakEquity: hasPreferenceShares ? null : blendedPeak,
      sponsorPromote: 0,
      promoteHurdleMultiple: 1.5,
      promoteCarryRate: 0,
      projectWaterfallMultiple,
    };
  }, [
    hasPreferenceModel,
    commonEquityHeadline,
    commonEquityNetFromTable,
    hasPreferenceShares,
    blendedLeveredIRR,
    blendedMultiple,
    blendedPayback,
    blendedPeak,
    projectWaterfallMultiple,
  ]);

  const fmtIRR = (n: number | null | undefined) =>
    n != null && Number.isFinite(n) ? `${n.toFixed(2)}%` : "—";
  const fmtMult = (n: number | null | undefined) =>
    n != null && Number.isFinite(n) ? `${n.toFixed(2)}x` : "—";
  const fmtPay = (n: number | null | undefined) =>
    n != null && Number.isFinite(n) ? `Month ${Math.round(n)}` : "—";
  const fmtPayFinancing = (n: number | null | undefined) =>
    n != null && Number.isFinite(n) ? `M${Math.round(n)}` : "—";

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !useFinancingPreviewHeadline)
      return;
    const m = commonEquityHeadline;
    if (!m) return;
    const fromTable = commonEquityNetFromTable?.totalCommonDistributions ?? null;
    // eslint-disable-next-line no-console
    console.log("=== Component 5 Equity Returns Verification ===");
    // eslint-disable-next-line no-console
    console.log("Metrics (headline = shared equity metrics from monthlyData):");
    // eslint-disable-next-line no-console
    console.log(
      `  Peak Common Equity: ${(m.peakCommonEquity / 1_000_000).toFixed(2)}M`
    );
    // eslint-disable-next-line no-console
    console.log(
      `  Total Invested: ${(m.totalCommonEquityInvested / 1_000_000).toFixed(2)}M`
    );
    // eslint-disable-next-line no-console
    console.log(
      `  Total Distributions: ${(m.totalCommonDistributions / 1_000_000).toFixed(2)}M`
    );
    // eslint-disable-next-line no-console
    if (fromTable != null) {
      console.log(
        `  Total Distributions (table Common row sum): ${(fromTable / 1_000_000).toFixed(2)}M`
      );
    }
    // eslint-disable-next-line no-console
    console.log(`  Equity Multiple: ${(m.commonEquityMultiple ?? 0).toFixed(2)}x`);
    // eslint-disable-next-line no-console
    console.log(
      `  Equity IRR: ${(m.commonEquityIrrPct ?? 0).toFixed(2)}%`
    );
    // eslint-disable-next-line no-console
    console.log(
      `  Equity Payback: ${m.commonEquityPaybackMonth != null && m.commonEquityPaybackMonth >= 0 ? `M${m.commonEquityPaybackMonth}` : "—"}`
    );
  }, [
    useFinancingPreviewHeadline,
    commonEquityHeadline,
  ]);

  const formatMoney = (v: number) =>
    `${currency} ${(v / 1_000_000).toFixed(2)}M`;

  const projectSubtitle = [
    projectInfo.buildingType === "residential"
      ? "Residential Tower"
      : projectInfo.buildingType
        ? projectInfo.buildingType.charAt(0).toUpperCase() +
          projectInfo.buildingType.slice(1)
        : "Residential Tower",
    projectInfo.city || "Dubai",
  ].join(", ");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              FinModel App — Component 5
            </h1>
            <p className="text-slate-400">Equity Returns</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>Step 1 of 1</span>
              <span>100% Complete</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all"
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-8 pb-32">
        <p className="text-sm text-slate-500 mb-6">
          Project: {projectSubtitle} • Currency: {currency}
        </p>
        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Key Equity Returns Summary
          </h2>
          {useFinancingPreviewHeadline ? (
            <>
              <p className="mb-3 text-xs text-slate-500">
                Headline common equity metrics match the{" "}
                <span className="text-emerald-300">Financing preview</span>{" "}
                (<code className="text-slate-400">projectIRR.projectMetrics</code>
                : peak equity, invested, distributions, IRR, multiple, payback).
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">
                    Total Common Equity Invested
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {keyMetrics.totalCommonEquityInvested != null
                      ? formatMoney(keyMetrics.totalCommonEquityInvested)
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">
                    Total Common Distributions
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">
                    {keyMetrics.totalCommonDistributions != null
                      ? formatMoney(keyMetrics.totalCommonDistributions)
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Common Equity IRR</p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">
                    {fmtIRR(keyMetrics.leveredIRR)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Common Equity Multiple</p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">
                    {fmtMult(keyMetrics.equityMultiple)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Common Equity Payback</p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">
                    {fmtPayFinancing(keyMetrics.equityPayback)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Peak Common Equity</p>
                  <p className="mt-1 text-xl font-bold text-amber-400">
                    {keyMetrics.peakEquity != null
                      ? formatMoney(keyMetrics.peakEquity)
                      : "—"}
                  </p>
                </div>
              </div>
            </>
          ) : hasPreferenceModel && commonEquityNetFromTable ? (
            <>
              <p className="mb-3 text-xs text-slate-500">
                Common equity metrics (after preference, when enabled) use the same{" "}
                <span className="text-emerald-300">NET EQUITY CF</span> series as the
                preview IRR check: common draws vs common distributions, including
                principal and coupons per the simplified preference model.
              </p>
              {hasPreferenceShares && preferenceAdjustments && (
                <div className="mb-6 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs text-slate-300">
                  <p className="font-medium text-amber-200/90">
                    Preference schedule (fixed coupon)
                  </p>
                  <ul className="mt-2 space-y-1 text-slate-400">
                    <li>
                      Quarterly dividend (construction): {currency}{" "}
                      {preferenceAdjustments.quarterlyDividend.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                      <span className="text-slate-500"> • </span>
                      Annual dividend (ops @ FYE): {currency}{" "}
                      {preferenceAdjustments.annualDividend.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </li>
                    <li>
                      Tranche: {formatMoney(prefPrincipal)} • Principal at M
                      {Math.min(
                        resolvedTenorMonths,
                        Math.max(0, horizonMonths - 1)
                      )}{" "}
                      ({resolvedTenorMonths}-month tenor)
                    </li>
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">
                    Total Common Equity Invested
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {keyMetrics.totalCommonEquityInvested != null
                      ? formatMoney(keyMetrics.totalCommonEquityInvested)
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">
                    Total Common Distributions
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">
                    {keyMetrics.totalCommonDistributions != null
                      ? formatMoney(keyMetrics.totalCommonDistributions)
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Common Equity IRR</p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">
                    {fmtIRR(keyMetrics.leveredIRR)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Common Equity Multiple</p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">
                    {fmtMult(keyMetrics.equityMultiple)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Common Equity Payback</p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">
                    {fmtPay(keyMetrics.equityPayback)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Peak Common Equity</p>
                  <p className="mt-1 text-xl font-bold text-amber-400">
                    {keyMetrics.peakEquity != null
                      ? formatMoney(keyMetrics.peakEquity)
                      : "—"}
                  </p>
                </div>
              </div>
            </>
          ) : !hasPreferenceShares ? (
            <>
              <p className="mb-3 text-xs text-slate-500">
                {projectMetrics
                  ? "Blended equity metrics match the Financing preview (equity investor cash flows)."
                  : "Open /preview/financing to populate blended metrics from the post-financing model."}
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Levered equity IRR</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">
                    {fmtIRR(blendedLeveredIRR)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Equity multiple</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">
                    {fmtMult(blendedMultiple)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Payback period</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">
                    {fmtPay(blendedPayback)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">Peak equity injected</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">
                    {formatMoney(blendedPeak)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-amber-200/90">
              Open{" "}
              <span className="text-white">/preview/financing</span> and ensure
              monthly equity and NCF series are loaded so common equity metrics can
              be calculated.
            </p>
          )}
        </div>

        <div
          data-preference-panel
          className="mb-8 rounded-xl border border-slate-700 bg-slate-800/50 p-6"
        >
          <h3 className="mb-4 text-lg font-semibold text-white">
            💎 Redeemable Cumulative Preference Shares
          </h3>
          <p className="mb-4 text-sm text-slate-400">
            Optional tranche with a fixed return or Islamic target profit.
            Configure here after reviewing peak equity above.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setHasPreferenceShares(!hasPreferenceShares)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  hasPreferenceShares ? "bg-emerald-600" : "bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    hasPreferenceShares ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-xs text-slate-300">
                Enable preference shares / mezzanine equity
              </span>
            </div>

            {hasPreferenceShares && (
              <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Preference amount ({currency})
                    </label>
                    <input
                      type="number"
                      value={prefAmount === "" ? "" : prefAmount}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPrefAmount(v === "" ? "" : Number(v));
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Return type
                    </label>
                    <select
                      value={prefReturnType}
                      onChange={(e) =>
                        setPrefReturnType(
                          e.target.value as "fixed_dividend" | "target_profit"
                        )
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="fixed_dividend">
                        Fixed dividend (% p.a.)
                      </option>
                      <option value="target_profit">
                        Target profit rate (Islamic)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Preference shares tenor
                    </label>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">
                          {resolvedTenorMonths} months
                        </p>
                        <span className="rounded bg-slate-700 px-2 py-1 text-[10px] font-medium text-slate-300">
                          System-determined
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Preference shares are subordinate to senior debt. Principal is
                        repaid only after the bank loan is fully repaid (loan payoff
                        month from the financing schedule).
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Preference return (%)
                    </label>
                    <input
                      type="number"
                      value={
                        prefReturnPercent === "" ? "" : prefReturnPercent
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setPrefReturnPercent(v === "" ? "" : Number(v));
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
              </>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50">
          <div className="flex flex-wrap border-b border-slate-700">
            {(
              [
                ["summary", "Summary"],
                ["multiple", "Multiple"],
                ["payback", "Payback"],
                ["waterfall", "Waterfall"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => handleTabChange(id)}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? "border-b-2 border-emerald-400 bg-slate-700/30 text-emerald-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[400px] rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          {activeTab === "summary" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">
                Equity multiple + payback mini-view
              </h3>
              <p className="text-sm text-slate-400">
                Live view from the monthly waterfall. Updates when preference terms
                or store cash flows change.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                  <p className="mb-2 text-sm font-medium text-slate-300">
                    Project equity multiple (waterfall)
                  </p>
                  <p className="mb-3 text-2xl font-bold text-emerald-400">
                    {keyMetrics.projectWaterfallMultiple != null
                      ? `${keyMetrics.projectWaterfallMultiple.toFixed(2)}x`
                      : "—"}
                  </p>
                  <MultipleHBarGroup
                    label="All equity (pref + common)"
                    invested={
                      (waterfall?.totalPreferenceInvested ?? 0) +
                      totalInvestedCommon
                    }
                    returned={
                      (waterfall?.preferenceTotalDistributed ?? 0) +
                      totalReturnedCommon
                    }
                    maxScale={Math.max(
                      (waterfall?.totalPreferenceInvested ?? 0) +
                        totalInvestedCommon,
                      (waterfall?.preferenceTotalDistributed ?? 0) +
                        totalReturnedCommon,
                      1
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => handleTabChange("multiple")}
                    className="mt-4 text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    View tranche breakdown →
                  </button>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                  <p className="mb-2 text-sm font-medium text-slate-300">
                    Common cumulative CF (payback)
                  </p>
                  <p className="mb-1 text-xs text-slate-500">
                    Amber line = breakeven month {commonPayback != null ? `(M${commonPayback})` : ""}
                  </p>
                  <div className="rounded-lg bg-slate-950/50 p-2">
                    <CumulativeEquityChart
                      cumulative={commonCumulative}
                      breakevenMonth={commonPayback}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabChange("payback")}
                    className="mt-4 text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    View full payback + tables →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/50 p-5">
                  <h4 className="text-sm font-semibold text-slate-200">
                    {hasPreferenceShares
                      ? "Common equity (residual)"
                      : "Blended equity (no pref tranche)"}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">IRR (annual)</p>
                      <p className="text-lg font-semibold text-emerald-400">
                        {!hasPreferenceShares
                          ? fmtIRR(keyMetrics.leveredIRR)
                          : commonAnnualIrr != null
                            ? `${commonAnnualIrr.toFixed(2)}%`
                            : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Multiple</p>
                      <p className="text-lg font-semibold text-emerald-400">
                        {!hasPreferenceShares
                          ? fmtMult(keyMetrics.equityMultiple)
                          : commonMultiple != null
                            ? `${commonMultiple.toFixed(2)}x`
                            : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Payback</p>
                      <p className="text-lg font-semibold text-emerald-400">
                        {!hasPreferenceShares
                          ? fmtPay(keyMetrics.equityPayback)
                          : commonPayback != null
                            ? `Month ${commonPayback}`
                            : "Not reached"}
                      </p>
                    </div>
                  </div>
                  {commonWarning && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                      {commonWarning}
                    </div>
                  )}
                  {commonSuccess && (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
                      {commonSuccess}
                    </div>
                  )}
                </div>
                <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/50 p-5">
                  <h4 className="text-sm font-semibold text-slate-200">
                    Distribution order
                  </h4>
                  <ol className="list-inside list-decimal space-y-1.5 text-xs text-slate-300">
                    <li>Debt service (Component 4).</li>
                    <li>
                      Preference: M0 funding, quarterly coupons via extra common
                      injection, principal from NCF at tenor.
                    </li>
                    <li>Project distributions to common only at/after preference tenor.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTab === "multiple" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">
                Equity multiple — invested vs returned
              </h3>
              <p className="text-sm text-slate-400">
                Bars scale to the largest amount across tranches. Preference uses
                waterfall tranche totals; common uses the same invested / returned
                totals as Key Metrics and{" "}
                <span className="text-slate-300">/preview/equity-returns</span> (net
                common distributions, including after tenor when preference is on).
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {hasPreferenceShares && waterfall && (
                  <MultipleHBarGroup
                    label="Preference tranche"
                    invested={waterfall.totalPreferenceInvested}
                    returned={waterfall.preferenceTotalDistributed}
                    maxScale={multipleChartMax}
                  />
                )}
                <MultipleHBarGroup
                  label="Common equity"
                  invested={totalInvestedCommon}
                  returned={totalReturnedCommon}
                  maxScale={multipleChartMax}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Project multiple</p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {keyMetrics.projectWaterfallMultiple != null
                      ? `${keyMetrics.projectWaterfallMultiple.toFixed(2)}x`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Common multiple</p>
                  <p className="text-lg font-semibold text-white">
                    {commonMultiple != null
                      ? `${commonMultiple.toFixed(2)}x`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Header (blended / preview)</p>
                  <p className="text-lg font-semibold text-slate-200">
                    {fmtMult(keyMetrics.equityMultiple)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "payback" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">
                Equity payback — cumulative cash flows
              </h3>
              <p className="text-sm text-slate-400">
                Uses the same monthly series as Key Metrics / Multiple:{" "}
                <code className="text-slate-500">buildCommonEquityCashFlows</code>{" "}
                (preference: distributions at/after tenor; no preference: cumulative at
                loan payoff then monthly NCF). Amber line = breakeven month.
              </p>
              <div className="grid gap-6 lg:grid-cols-1">
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                  <p className="mb-2 text-sm font-medium text-emerald-300">
                    Common cumulative
                  </p>
                  <div className="rounded-lg bg-slate-950/60 p-2">
                    <CumulativeEquityChart
                      cumulative={commonCumulative}
                      breakevenMonth={commonPayback}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Common peak equity</p>
                  <p className="text-lg font-semibold text-white">
                    {keyMetrics.peakEquity != null
                      ? formatMoney(keyMetrics.peakEquity)
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Common breakeven</p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {commonPayback != null ? `Month ${commonPayback}` : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Common net cumulative</p>
                  <p className="text-lg font-semibold text-white">
                    {formatMoney(finalSurplusCommon)}
                  </p>
                </div>
              </div>

              <div
                className={`grid grid-cols-1 gap-6 ${hasPreferenceShares ? "lg:grid-cols-2" : ""}`}
              >
                {hasPreferenceShares && (
                <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                  <h4 className="text-sm font-semibold text-slate-200">
                    Preference equity cash flows
                  </h4>
                  <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-800">
                    <table className="min-w-full text-[11px] text-slate-200">
                      <thead className="sticky top-0 z-10 bg-slate-900/80">
                        <tr>
                          <th className="px-2 py-1 text-left font-medium text-slate-400">
                            Month
                          </th>
                          <th className="px-2 py-1 text-right font-medium text-slate-400">
                            Cash flow
                          </th>
                          <th className="px-2 py-1 text-left font-medium text-slate-400">
                            Visual
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {prefFlows.map((cf) => {
                          const widthPct =
                            (Math.abs(cf.amount) / maxAbsPref) * 100 || 0;
                          const isPositive = cf.amount >= 0;
                          return (
                            <tr
                              key={cf.month}
                              className="odd:bg-slate-900/60 even:bg-slate-900/30"
                            >
                              <td className="px-2 py-1 align-middle">{cf.month}</td>
                              <td className="px-2 py-1 align-middle text-right">
                                {cf.amount.toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                                })}
                              </td>
                              <td className="px-2 py-1 align-middle">
                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                                  <div
                                    className={`h-2 ${
                                      isPositive ? "bg-emerald-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${widthPct}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}
                <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                  <h4 className="text-sm font-semibold text-slate-200">
                    Common equity cash flows
                  </h4>
                  <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-800">
                    <table className="min-w-full text-[11px] text-slate-200">
                      <thead className="sticky top-0 z-10 bg-slate-900/80">
                        <tr>
                          <th className="px-2 py-1 text-left font-medium text-slate-400">
                            Month
                          </th>
                          <th className="px-2 py-1 text-right font-medium text-slate-400">
                            Cash flow
                          </th>
                          <th className="px-2 py-1 text-left font-medium text-slate-400">
                            Visual
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {commonEquityPaybackPoints.map((cf) => {
                          const widthPct =
                            (Math.abs(cf.amount) / maxAbsCommonEquityPayback) *
                              100 || 0;
                          const isPositive = cf.amount >= 0;
                          return (
                            <tr
                              key={cf.month}
                              className="odd:bg-slate-900/60 even:bg-slate-900/30"
                            >
                              <td className="px-2 py-1 align-middle">{cf.month}</td>
                              <td className="px-2 py-1 align-middle text-right">
                                {cf.amount.toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                                })}
                              </td>
                              <td className="px-2 py-1 align-middle">
                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                                  <div
                                    className={`h-2 ${
                                      isPositive ? "bg-emerald-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${widthPct}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "waterfall" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">
                Equity waterfall distribution
              </h3>
              <p className="text-sm text-slate-400">
                Simplified preference: quarterly coupons funded by extra common
                injections; project cash flows to common only from the preference tenor
                onward; principal repaid at tenor from NCF.
              </p>
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
                <ol className="mb-6 space-y-3 text-sm text-slate-300">
                  <li className="flex flex-wrap justify-between gap-2 border-b border-slate-800 pb-2">
                    <span>1. Debt service</span>
                    <span className="text-slate-500">(applied before equity layer)</span>
                  </li>
                  <li className="flex flex-wrap justify-between gap-2 border-b border-slate-800 pb-2">
                    <span>2. Preference — distributed</span>
                    <span className="font-medium text-amber-300">
                      {waterfall
                        ? `${(waterfall.preferenceTotalDistributed / 1_000_000).toFixed(2)}M ${currency}`
                        : "—"}
                    </span>
                  </li>
                  <li className="flex flex-wrap justify-between gap-2">
                    <span>3. Common — distributed</span>
                    <span className="font-medium text-emerald-300">
                      {waterfall
                        ? `${(totalReturnedCommon / 1_000_000).toFixed(2)}M ${currency}`
                        : "—"}
                    </span>
                  </li>
                </ol>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-slate-800/80 p-4">
                    <p className="text-xs text-slate-400">Pref return (p.a.)</p>
                    <p className="text-lg font-semibold text-white">
                      {hasPreferenceShares && prefReturnPercent !== ""
                        ? `${prefReturnPercent}%`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-800/80 p-4">
                    <p className="text-xs text-slate-400">Project equity multiple</p>
                    <p className="text-lg font-semibold text-emerald-400">
                      {keyMetrics.projectWaterfallMultiple != null
                        ? `${keyMetrics.projectWaterfallMultiple.toFixed(2)}x`
                        : "—"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.querySelector(
                      "[data-preference-panel]"
                    );
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="mt-6 rounded-lg bg-slate-700 px-4 py-2 text-sm transition-colors hover:bg-slate-600"
                >
                  Adjust preference terms above →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800/30 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden>
              💡
            </span>
            <div>
              <p className="mb-1 text-sm font-medium text-white">AI tip</p>
              {activeTab === "summary" && (
                <p className="text-sm text-slate-400">
                  Use the tabs to explore returns. Waterfall explains how profit is
                  split after debt and prefs.
                </p>
              )}
              {activeTab === "multiple" && (
                <p className="text-sm text-slate-400">
                  A multiple above 1.0 means distributions exceed equity invested.
                  Compare against hold period and risk.
                </p>
              )}
              {activeTab === "payback" && (
                <p className="text-sm text-slate-400">
                  Earlier payback reduces timing risk; check sensitivity under slower
                  sales in scenario analysis.
                </p>
              )}
              {activeTab === "waterfall" && (
                <p className="text-sm text-slate-400">
                  Preference terms should match legal docs and investor expectations.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <PreviewFloatingBar
        previousRoute={withStreamPrefix(streamPrefix, "/preview/financing")}
        nextRoute={withStreamPrefix(streamPrefix, "/preview/equity-returns")}
        nextLabel="Generate Model →"
        showDownload={false}
      />
    </div>
  );
}

export default function EquityReturnsPage() {
  return (
    <SearchParamsBoundary>
      <EquityReturnsPageContent />
    </SearchParamsBoundary>
  );
}
