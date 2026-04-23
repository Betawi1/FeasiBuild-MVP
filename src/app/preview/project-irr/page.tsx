"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useFinModelStore, { buildCashOutflowProfile } from "@/store/useFinModelStore";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import { exportToCSV } from "@/lib/downloads/exportToCSV";
import { exportToExcel } from "@/lib/downloads/exportToExcel";
import {
  buildCashFlowArray,
  solveAnnualIRR,
  type CashFlowPoint,
} from "@/lib/irr-calculations";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";

export default function PreviewProjectIRRPage() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const cashInflows = useFinModelStore((s) => s.cashInflows);

  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement | null>(null);

  const constructionPeriod = cashOutflows.constructionPeriod || 30;
  const postCompletionBuffer = 6;
  const totalMonths = constructionPeriod + postCompletionBuffer; // last month index
  const months = useMemo(
    () => Array.from({ length: totalMonths + 1 }, (_, i) => i),
    [totalMonths]
  );

  const cashFlows: CashFlowPoint[] = useMemo(
    () =>
      buildCashFlowArray(
        cashOutflows,
        cashInflows,
        constructionPeriod,
        postCompletionBuffer
      ),
    [cashOutflows, cashInflows, constructionPeriod]
  );

  const netCashFlows = useMemo(() => cashFlows.map((cf) => cf.amount), [cashFlows]);

  // Gross inflows/outflows (pre-financing) for unlevered multiple metrics.
  // Keep this aligned with `/preview/cash-inflows`: outflows from outflow profile
  // and inflows from monthly inflow schedule over the same displayed horizon.
  const outflowProfile = useMemo(
    () => buildCashOutflowProfile(cashOutflows),
    [cashOutflows]
  );
  const inflowsByMonth = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of cashInflows.monthlyInflowSchedule || []) {
      map.set(p.month, (map.get(p.month) || 0) + (p.amount || 0));
    }
    return map;
  }, [cashInflows.monthlyInflowSchedule]);
  const totalReturnsGross = useMemo(
    () => months.reduce((sum, m) => sum + (inflowsByMonth.get(m) || 0), 0),
    [months, inflowsByMonth]
  );
  const capitalInvestedGross = useMemo(() => {
    const paddedOutflows = Array(totalMonths + 1).fill(0);
    for (let m = 0; m <= Math.min(constructionPeriod, totalMonths); m++) {
      paddedOutflows[m] = outflowProfile.monthlyTotal[m] || 0;
    }
    return paddedOutflows.reduce((sum, v) => sum + v, 0);
  }, [outflowProfile.monthlyTotal, constructionPeriod, totalMonths]);
  // FORCED CORRECT: Unlevered Metrics from direct store totals.
  // This bypasses any monthly-series scope/aggregation issues.
  const unleveredMetrics = useMemo(() => {
    const capitalInvested =
      cashOutflows.tdc ||
      (cashOutflows.landCost || 0) +
        (cashOutflows.constructionCost || 0) +
        (cashOutflows.softCosts || 0) +
        (cashOutflows.powc || 0);

    const totalReturns = cashInflows.netProceeds || 0;
    const equityMultiple =
      capitalInvested > 0 ? totalReturns / capitalInvested : 0;
    const netSurplus = totalReturns - capitalInvested;

    // eslint-disable-next-line no-console
    console.log("🔍 ========== UNLEVERED METRICS (FORCED) ==========");
    // eslint-disable-next-line no-console
    console.log(
      "🔍 Capital Invested (TDC):",
      (capitalInvested / 1000).toFixed(1),
      "k"
    );
    // eslint-disable-next-line no-console
    console.log(
      "🔍 Total Returns (Net Proceeds):",
      (totalReturns / 1000).toFixed(1),
      "k"
    );
    // eslint-disable-next-line no-console
    console.log("🔍 Equity Multiple:", equityMultiple.toFixed(2), "x");
    // eslint-disable-next-line no-console
    console.log("🔍 Net Surplus:", (netSurplus / 1000).toFixed(1), "k");
    // eslint-disable-next-line no-console
    console.log("🔍 Expected: 18,276.3k / 22,272.0k / 1.22x / 3,995.8k");
    // eslint-disable-next-line no-console
    console.log("================================================");

    return { capitalInvested, totalReturns, equityMultiple, netSurplus };
  }, [
    cashOutflows.tdc,
    cashOutflows.landCost,
    cashOutflows.constructionCost,
    cashOutflows.softCosts,
    cashOutflows.powc,
    cashInflows.netProceeds,
  ]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("🔍 ========== PROJECT IRR DEBUG ==========");
    // eslint-disable-next-line no-console
    console.log("🔍 Cash Outflows Store:");
    // eslint-disable-next-line no-console
    console.log("  Land Cost:", ((cashOutflows.landCost || 0) / 1000).toFixed(1));
    // eslint-disable-next-line no-console
    console.log(
      "  Construction Cost:",
      ((cashOutflows.constructionCost || 0) / 1000).toFixed(1)
    );
    // eslint-disable-next-line no-console
    console.log("  Soft Costs:", ((cashOutflows.softCosts || 0) / 1000).toFixed(1));
    // eslint-disable-next-line no-console
    console.log("  POWC:", ((cashOutflows.powc || 0) / 1000).toFixed(1));
    // eslint-disable-next-line no-console
    console.log("  TDC:", ((cashOutflows.tdc || 0) / 1000).toFixed(1));
    // eslint-disable-next-line no-console
    console.log("🔍 Cash Inflows Store:");
    // eslint-disable-next-line no-console
    console.log("  Net Proceeds:", ((cashInflows.netProceeds || 0) / 1000).toFixed(1));
    // eslint-disable-next-line no-console
    console.log("🔍 Computed Unlevered Metrics:");
    // eslint-disable-next-line no-console
    console.log("  Capital Invested:", (unleveredMetrics.capitalInvested / 1000).toFixed(1));
    // eslint-disable-next-line no-console
    console.log("  Total Returns:", (unleveredMetrics.totalReturns / 1000).toFixed(1));
    // eslint-disable-next-line no-console
    console.log("  Equity Multiple:", `${unleveredMetrics.equityMultiple.toFixed(2)}x`);
    // eslint-disable-next-line no-console
    console.log("========================================");
  }, [
    cashOutflows.landCost,
    cashOutflows.constructionCost,
    cashOutflows.softCosts,
    cashOutflows.powc,
    cashOutflows.tdc,
    cashInflows.netProceeds,
    unleveredMetrics,
  ]);

  const solved = useMemo(() => solveAnnualIRR(cashFlows, 1e-7, 100), [cashFlows]);

  const discountData = useMemo(() => {
    const annualIRR = solved.annualIRR;
    if (annualIRR == null) {
      return {
        annualIRR: null as number | null,
        monthlyRate: null as number | null,
        discountFactors: months.map(() => 1),
        discountedCashFlows: netCashFlows.map(() => 0),
        cumulativeNPV: netCashFlows.map(() => 0),
      };
    }

    const monthlyRate = solved.monthlyIRR;
    const discountFactors = months.map((m) => 1 / Math.pow(1 + annualIRR, m / 12));
    const discountedCashFlows = netCashFlows.map((cf, idx) => cf * discountFactors[idx]);

    let running = 0;
    const cumulativeNPV = discountedCashFlows.map((v) => {
      running += v;
      return running;
    });

    return {
      annualIRR,
      monthlyRate,
      discountFactors,
      discountedCashFlows,
      cumulativeNPV,
    };
  }, [solved.annualIRR, solved.monthlyIRR, months, netCashFlows]);

  const netCashFlowTotal = netCashFlows.reduce((s, v) => s + v, 0);
  const discountedCashFlowTotal = discountData.discountedCashFlows.reduce(
    (s, v) => s + v,
    0
  );
  const cumulativeNPVFinal =
    discountData.cumulativeNPV[discountData.cumulativeNPV.length - 1] || 0;
  const annualIRR = discountData.annualIRR;
  const monthlyRate = discountData.monthlyRate;
  const discountedSum =
    discountData.cumulativeNPV[discountData.cumulativeNPV.length - 1] || 0;
  const finalCumulativeNPV = discountedSum;

  const exportRows = useMemo(() => {
    const header = ["Line Item", ...months.map((m) => `M${m}`), "TOTAL"];
    const roundK = (v: number) => Math.round(v / 1000);

    const ncfRow: (string | number | null)[] = [
      "Net Cash Flow",
      ...months.map((_, idx) => {
        const k = roundK(netCashFlows[idx] || 0);
        return k === 0 ? null : k;
      }),
      roundK(netCashFlowTotal) === 0 ? null : roundK(netCashFlowTotal),
    ];

    const dfRow: (string | number | null)[] = [
      "Discount Factor",
      ...months.map((_, idx) => {
        const f = discountData.discountFactors[idx];
        return f == null || !Number.isFinite(f) ? null : f;
      }),
      null,
    ];

    const dcfRow: (string | number | null)[] = [
      "Discounted Cash Flow",
      ...months.map((_, idx) => {
        const k = roundK(discountData.discountedCashFlows[idx] || 0);
        return k === 0 ? null : k;
      }),
      roundK(discountedCashFlowTotal) === 0 ? null : roundK(discountedCashFlowTotal),
    ];

    const npvRow: (string | number | null)[] = [
      "Cumulative NPV",
      ...months.map((_, idx) => {
        const k = roundK(discountData.cumulativeNPV[idx] || 0);
        return k === 0 ? null : k;
      }),
      roundK(cumulativeNPVFinal) === 0 ? null : roundK(cumulativeNPVFinal),
    ];

    const summaryRows: (string | number | null)[][] = [
      [],
      ["Metric", "Value"],
      [
        "Unlevered IRR (annual %)",
        annualIRR == null ? null : Number((annualIRR * 100).toFixed(4)),
      ],
      [
        "Monthly discount rate (%)",
        monthlyRate == null ? null : Number((monthlyRate * 100).toFixed(6)),
      ],
      ["Iterations to converge", solved.iterations],
      [
        "Capital invested (TDC) ('000)",
        roundK(unleveredMetrics.capitalInvested),
      ],
      [
        "Total returns (net proceeds) ('000)",
        roundK(unleveredMetrics.totalReturns),
      ],
      [
        "Unlevered equity multiple (x)",
        unleveredMetrics.equityMultiple > 0
          ? Number(unleveredMetrics.equityMultiple.toFixed(4))
          : null,
      ],
      ["Σ discounted cash flows NPV ('000)", roundK(discountedSum)],
    ];

    return [header, ncfRow, dfRow, dcfRow, npvRow, ...summaryRows];
  }, [
    months,
    netCashFlows,
    discountData.discountFactors,
    discountData.discountedCashFlows,
    discountData.cumulativeNPV,
    netCashFlowTotal,
    discountedCashFlowTotal,
    cumulativeNPVFinal,
    annualIRR,
    monthlyRate,
    solved.iterations,
    unleveredMetrics.capitalInvested,
    unleveredMetrics.totalReturns,
    unleveredMetrics.equityMultiple,
    discountedSum,
  ]);

  const currency = projectInfo.currency || "AED";
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);

  const formatNumber = (value: number) => {
    if (value === 0 || value === -0) return "-";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
      Math.round(value / 1000)
    );
  };
  const formatThousandsOneDecimal = (value: number) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 1000);

  // Stage labels: mirror `/preview/cash-inflows` formatting (Title Case + duration)
  const stage1Label = cashOutflows.stageAllocation?.stage1Label ?? "Enabling";
  const stage2Label = cashOutflows.stageAllocation?.stage2Label ?? "Sub-Structure";
  const stage3Label = cashOutflows.stageAllocation?.stage3Label ?? "Super + Finishes";
  const preStageLabel = "Pre-Construction";
  const postStageLabel = "Post-Completion";

  const formatFactor = (value: number) => {
    if (!Number.isFinite(value)) return "-";
    return value.toFixed(6);
  };

  const sa = cashOutflows.stageAllocation;
  const s1Pct = sa?.stage1Percent ?? 20;
  const s2Pct = sa?.stage2Percent ?? 30;
  const stage1Months = Math.max(0, Math.round(constructionPeriod * (s1Pct / 100)));
  const stage2Months = Math.max(
    0,
    Math.round(constructionPeriod * ((s1Pct + s2Pct) / 100)) - stage1Months
  );
  const stage3Months = Math.max(0, constructionPeriod - stage1Months - stage2Months);

  const fileBase = `project-irr_${projectInfo.city || "project"}_${currency}`;

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

  const handleDownload = () => {
    setDownloadOpen((v) => !v);
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 pb-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-white">
            Project IRR Preview — Cash Flow & NPV (M0–M36)
          </h1>
          <p className="text-sm text-slate-400">
            Unlevered IRR from Component 2 inflows and Component 1 outflows. Values shown in {currency} &apos;000.
          </p>
        </div>

        {/* IRR Verification Card */}
        <div className="mb-6 bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">IRR Calculation Verification</h2>

          {/* Vertical list verification values (label above value) */}
          <div className="mt-1 space-y-4 text-sm">
            <div className="space-y-1">
              <p className="text-xs text-slate-400">
                Unlevered IRR (annual, solved)
              </p>
              <p className="text-sm font-semibold text-emerald-400">
                {annualIRR == null ? "N/A" : `${(annualIRR * 100).toFixed(2)}%`}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400">
                Monthly discount rate (derived)
              </p>
              <p className="text-sm font-semibold text-emerald-400">
                {monthlyRate == null ? "N/A" : `${(monthlyRate * 100).toFixed(3)}%`}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400">Iterations to converge</p>
              <p className="text-sm font-semibold text-slate-200">
                {solved.iterations}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400">
                Σ Discounted Cash Flows (NPV)
              </p>
              <p className="text-sm font-semibold text-slate-200">
                {formatNumber(discountedSum)}{" "}
                <span className="text-xs text-slate-500">(in '000)</span>
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400">
                Capital Invested (Total Outflows)
              </p>
              <p className="text-sm font-semibold text-slate-200">
                {formatThousandsOneDecimal(unleveredMetrics.capitalInvested)}{" "}
                <span className="text-xs text-slate-500">(in '000)</span>
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400">
                Total Returns (Total Inflows)
              </p>
              <p className="text-sm font-semibold text-slate-200">
                {formatThousandsOneDecimal(unleveredMetrics.totalReturns)}{" "}
                <span className="text-xs text-slate-500">(in '000)</span>
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400">Unlevered Equity Multiple</p>
              <p className="text-sm font-semibold text-emerald-400">
                {unleveredMetrics.equityMultiple > 0
                  ? `${unleveredMetrics.equityMultiple.toFixed(2)}x`
                  : "N/A"}
              </p>
            </div>

            <div className="space-y-1 pt-1">
              <p className="text-xs text-slate-400">Formula</p>
              <p className="text-xs text-slate-300 font-mono">
                Σ [NCFₘ / (1+IRR)^(m/12)] = 0
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            IRR is the discount rate that makes the net present value (NPV) of the cash flows equal to zero.
            Higher IRR means faster recovery of capital.
          </p>
        </div>

        {/* Cash Flow + NPV Table */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6 overflow-x-auto">
          <h2 className="text-lg font-semibold text-white mb-4">NPV Table (Discount Factor Method)</h2>

          <table className="min-w-[2200px] w-full text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 min-w-[180px] border-b border-slate-700 bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-300">
                  Line Item
                </th>
                {months.map((m) => (
                  <th
                    key={m}
                    className="min-w-[60px] border-b border-slate-700 px-2 py-3 text-center text-xs font-medium text-slate-400"
                  >
                    M{m}
                  </th>
                ))}
                <th className="border-b border-slate-700 px-4 py-3 text-right text-sm font-semibold text-slate-300">
                  TOTAL
                </th>
              </tr>
              <tr>
                <th className="sticky left-0 border-b border-slate-700 bg-slate-800" />
                <th className="border-b border-slate-700 bg-slate-900/30 px-1 py-1 text-center text-xs text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="font-semibold">{preStageLabel}</span>
                    <span className="text-[10px] text-slate-500">({1} months)</span>
                  </div>
                </th>
                <th
                  colSpan={stage1Months}
                  className="border-b border-slate-700 border-l-2 border-l-emerald-600 bg-slate-900/50 px-1 py-1 text-center text-xs text-emerald-400"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="font-semibold">{stage1Label}</span>
                    <span className="text-[10px] text-slate-500">
                      ({stage1Months} months)
                    </span>
                  </div>
                </th>
                <th
                  colSpan={stage2Months}
                  className="border-b border-slate-700 border-l-2 border-l-emerald-600 bg-slate-900/30 px-1 py-1 text-center text-xs text-emerald-400"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="font-semibold">{stage2Label}</span>
                    <span className="text-[10px] text-slate-500">
                      ({stage2Months} months)
                    </span>
                  </div>
                </th>
                <th
                  colSpan={stage3Months}
                  className="border-b border-slate-700 border-l-2 border-l-emerald-600 bg-slate-900/50 px-1 py-1 text-center text-xs text-emerald-400"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="font-semibold">{stage3Label}</span>
                    <span className="text-[10px] text-slate-500">
                      ({stage3Months} months)
                    </span>
                  </div>
                </th>
                <th
                  colSpan={postCompletionBuffer}
                  className="border-b border-slate-700 border-l-2 border-l-slate-600 bg-slate-900/20 px-1 py-1 text-center text-xs text-slate-300"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="font-semibold">{postStageLabel}</span>
                    <span className="text-[10px] text-slate-500">
                      ({postCompletionBuffer} months)
                    </span>
                  </div>
                </th>
                <th className="border-b border-slate-700" />
              </tr>
            </thead>

            <tbody>
              <tr className="bg-emerald-900/10">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-emerald-300">
                  NET CASH FLOW
                </td>
                {months.map((_, idx) => (
                  <td
                    key={idx}
                    className="border-b border-slate-700/50 px-2 py-2 text-center text-xs text-emerald-400"
                  >
                    {formatNumber(netCashFlows[idx] || 0)}
                  </td>
                ))}
                <td className="border-b border-slate-700/50 px-4 py-2 text-right text-sm font-semibold text-emerald-400">
                  {formatNumber(netCashFlowTotal)}
                </td>
              </tr>

              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300">
                  DISCOUNT FACTOR
                </td>
                {months.map((_, idx) => (
                  <td
                    key={idx}
                    className="border-b border-slate-700/50 px-2 py-2 text-center text-xs text-slate-400"
                  >
                    {formatFactor(discountData.discountFactors[idx] || 0)}
                  </td>
                ))}
                <td className="border-b border-slate-700/50 px-4 py-2 text-right text-sm font-semibold text-slate-400">
                  -
                </td>
              </tr>

              <tr className="bg-slate-900/40">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">
                  DISCOUNTED CASH FLOW
                </td>
                {months.map((_, idx) => (
                  <td
                    key={idx}
                    className={`border-b border-slate-700/50 px-2 py-2 text-center text-xs ${
                      (discountData.discountedCashFlows[idx] || 0) >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatNumber(discountData.discountedCashFlows[idx] || 0)}
                  </td>
                ))}
                <td className="border-b border-slate-700/50 px-4 py-2 text-right text-sm font-semibold text-emerald-400">
                  {formatNumber(discountedCashFlowTotal)}
                </td>
              </tr>

              <tr className="bg-slate-900/60 font-semibold">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">
                  CUMULATIVE NPV
                </td>
                {months.map((_, idx) => (
                  <td
                    key={idx}
                    className={`border-b border-slate-700/50 px-2 py-2 text-center text-xs ${
                      (discountData.cumulativeNPV[idx] || 0) >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatNumber(discountData.cumulativeNPV[idx] || 0)}
                  </td>
                ))}
                <td className="border-b border-slate-700/50 px-4 py-2 text-right text-sm font-semibold text-emerald-400">
                  {formatNumber(cumulativeNPVFinal)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mt-4 text-xs text-slate-500">
            ℹ️ IRR is solved so that cumulative NPV approaches 0 at M{totalMonths}.
            Final NPV: {formatNumber(finalCumulativeNPV)} &apos;000.
          </p>
        </div>

        {downloadOpen ? (
          <div
            ref={downloadRef}
            className="fixed bottom-24 left-4 right-4 z-50 rounded-xl border border-slate-700 bg-slate-800/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md md:left-1/2 md:right-auto md:w-[320px] md:-translate-x-1/2"
          >
            <p className="mb-2 text-xs font-medium text-slate-300">
              Download project IRR preview as…
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  exportToExcel({
                    filename: fileBase,
                    sheetName: "Project IRR (NPV)",
                    rows: exportRows,
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
                    rows: exportRows,
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
          previousRoute={withStreamPrefix(streamPrefix, "/project-irr")}
          nextRoute={withStreamPrefix(streamPrefix, "/financing")}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
}
