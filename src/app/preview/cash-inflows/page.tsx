"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useFinModelStore from "@/store/useFinModelStore";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";
import { buildCashOutflowProfile } from "@/store/useFinModelStore";
import { exportToCSV } from "@/lib/downloads/exportToCSV";
import { exportToExcel } from "@/lib/downloads/exportToExcel";

type MonthPoint = { month: number; amount: number };

export default function PreviewCashInflowsPage() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const cashInflows = useFinModelStore((s) => s.cashInflows);

  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement | null>(null);

  // Sales period = Construction Period + Post-Completion Buffer
  const constructionPeriod = cashOutflows.constructionPeriod || 30;
  const postCompletionBuffer = 6;
  const totalMonths = constructionPeriod + postCompletionBuffer; // 36 => M0..M36 (37 points)
  const months = useMemo(
    () => Array.from({ length: totalMonths + 1 }, (_, i) => i),
    [totalMonths]
  );

  // Outflow profile is M0..M{constructionPeriod} (M0..M30) already; we pad to M36 with zeros.
  const outflowProfile = useMemo(
    () => buildCashOutflowProfile(cashOutflows),
    [cashOutflows]
  );

  // Stage boundaries for headers (construction months only)
  const sa = cashOutflows.stageAllocation;
  const s1Pct = sa?.stage1Percent ?? 20;
  const s2Pct = sa?.stage2Percent ?? 30;
  const stage1Label = sa?.stage1Label ?? "Enabling";
  const stage2Label = sa?.stage2Label ?? "Sub-Structure";
  const stage3Label = sa?.stage3Label ?? "Super + Finishes";
  const stage1Months = Math.max(0, Math.round(constructionPeriod * (s1Pct / 100)));
  const stage2Months = Math.max(
    0,
    Math.round(constructionPeriod * ((s1Pct + s2Pct) / 100)) - stage1Months
  );
  const stage3Months = Math.max(0, constructionPeriod - stage1Months - stage2Months);

  const inflowsByMonth = useMemo(() => {
    const schedule: MonthPoint[] = cashInflows.monthlyInflowSchedule || [];
    const map = new Map<number, number>();
    for (const p of schedule) {
      map.set(p.month, (map.get(p.month) || 0) + (p.amount || 0));
    }
    return map;
  }, [cashInflows.monthlyInflowSchedule]);

  const inflowSeries = useMemo(
    () => months.map((m) => inflowsByMonth.get(m) || 0),
    [months, inflowsByMonth]
  );

  // Split monthly inflows into unit vs bulk sales using the same share
  // percentage that `/preview/financing` and other previews rely on.
  const bulkShare = (cashInflows.bulkSales?.bulkSalesSharePercent ?? 0) / 100;
  const bulkInflowSeries = useMemo(
    () => months.map((m) => (inflowSeries[m] || 0) * bulkShare),
    [months, inflowSeries, bulkShare]
  );
  const unitInflowSeries = useMemo(
    () => months.map((m) => (inflowSeries[m] || 0) * (1 - bulkShare)),
    [months, inflowSeries, bulkShare]
  );

  const outflowSeries = useMemo(() => {
    const padded = Array(totalMonths + 1).fill(0);
    // outflowProfile.monthlyTotal aligns to indices 0..constructionPeriod
    for (let m = 0; m <= Math.min(constructionPeriod, totalMonths); m++) {
      padded[m] = outflowProfile.monthlyTotal[m] || 0;
    }
    return padded;
  }, [outflowProfile.monthlyTotal, constructionPeriod, totalMonths]);

  const netSeries = useMemo(
    () => months.map((m) => (inflowSeries[m] || 0) - (outflowSeries[m] || 0)),
    [months, inflowSeries, outflowSeries]
  );

  const cumulativeSeries = useMemo(() => {
    let running = 0;
    return months.map((m) => {
      running += netSeries[m] || 0;
      return running;
    });
  }, [months, netSeries]);

  // Decomposed outflow series (for per-row totals)
  const landSeries = useMemo(() => {
    const arr = Array(totalMonths + 1).fill(0);
    arr[0] = cashOutflows.landCost || 0;
    return arr;
  }, [cashOutflows.landCost, totalMonths]);

  const constructionSeries = useMemo(() => {
    const padded = Array(totalMonths + 1).fill(0);
    for (let m = 0; m <= Math.min(constructionPeriod, totalMonths); m++) {
      padded[m] = outflowProfile.construction[m] || 0;
    }
    return padded;
  }, [outflowProfile.construction, constructionPeriod, totalMonths]);

  const softCostsSeries = useMemo(() => {
    const padded = Array(totalMonths + 1).fill(0);
    for (let m = 0; m <= Math.min(constructionPeriod, totalMonths); m++) {
      padded[m] = outflowProfile.softCosts[m] || 0;
    }
    return padded;
  }, [outflowProfile.softCosts, constructionPeriod, totalMonths]);

  const powcSeries = useMemo(() => {
    const padded = Array(totalMonths + 1).fill(0);
    for (let m = 0; m <= Math.min(constructionPeriod, totalMonths); m++) {
      padded[m] = outflowProfile.powc[m] || 0;
    }
    return padded;
  }, [outflowProfile.powc, constructionPeriod, totalMonths]);

  // Row totals
  const totalInflowAll = inflowSeries.reduce((s, v) => s + v, 0);
  const totalUnitInflowAll = unitInflowSeries.reduce((s, v) => s + v, 0);
  const totalBulkInflowAll = bulkInflowSeries.reduce((s, v) => s + v, 0);
  const hasBulkSales = bulkInflowSeries.some((v) => v > 0);
  const totalLand = landSeries.reduce((s, v) => s + v, 0);
  const totalConstruction = constructionSeries.reduce((s, v) => s + v, 0);
  const totalSoft = softCostsSeries.reduce((s, v) => s + v, 0);
  const totalPowc = powcSeries.reduce((s, v) => s + v, 0);
  const totalOutflowAll = outflowSeries.reduce((s, v) => s + v, 0);
  const totalNetAll = netSeries.reduce((s, v) => s + v, 0);
  const cumulativeFinal = cumulativeSeries[cumulativeSeries.length - 1] || 0;

  // Match `/preview/cash-outflows` construction display rounding:
  // - Monthly Construction Cost values are rounded to 1 decimal (thousands)
  // - Last construction month is "plugged" so displayed monthly sum == displayed total
  const roundTo1dp = (n: number) => Math.round(n * 10) / 10;
  const lastConstructionMonthIndex = constructionPeriod;
  const constructionTotalThousandsDisplayed = roundTo1dp(
    (cashOutflows.constructionCost || 0) / 1000
  );
  const previousConstructionMonthsSumThousandsDisplayed = constructionSeries
    .slice(0, lastConstructionMonthIndex)
    .reduce((sum, v) => sum + roundTo1dp((v || 0) / 1000), 0);

  const exportRows = useMemo(() => {
    const header = ["Cost Item", ...months.map((m) => `M${m}`), "Total"];

    const unitSalesRow: (string | number | null)[] = [
      "Unit Sales",
      ...months.map((m) => {
        const k = roundTo1dp((unitInflowSeries[m] || 0) / 1000);
        return k !== 0 ? k : null;
      }),
      roundTo1dp(totalUnitInflowAll / 1000),
    ];

    const bulkSalesRow: (string | number | null)[] = [
      "Bulk Sales",
      ...months.map((m) => {
        const k = roundTo1dp((bulkInflowSeries[m] || 0) / 1000);
        return k !== 0 ? k : null;
      }),
      roundTo1dp(totalBulkInflowAll / 1000),
    ];

    const totalInflowRow: (string | number | null)[] = [
      "Total Inflow",
      ...months.map((m) => roundTo1dp((inflowSeries[m] || 0) / 1000)),
      roundTo1dp(totalInflowAll / 1000),
    ];

    const landRow: (string | number | null)[] = [
      "Land Cost",
      ...months.map((m) => (m === 0 ? roundTo1dp((landSeries[m] || 0) / 1000) : null)),
      roundTo1dp(totalLand / 1000),
    ];

    const constructionRow: (string | number | null)[] = [
      "Construction Cost",
      ...months.map((m) => {
        const isLastConstructionMonth = m === constructionPeriod;
        const baseThousands = roundTo1dp((constructionSeries[m] || 0) / 1000);
        const displayedThousands = isLastConstructionMonth
          ? roundTo1dp(
              constructionTotalThousandsDisplayed -
                previousConstructionMonthsSumThousandsDisplayed
            )
          : baseThousands;
        return displayedThousands > 0 ? displayedThousands : null;
      }),
      constructionTotalThousandsDisplayed,
    ];

    const softRow: (string | number | null)[] = [
      "Soft Costs",
      ...months.map((m) => roundTo1dp((softCostsSeries[m] || 0) / 1000)),
      roundTo1dp(totalSoft / 1000),
    ];

    const powcRow: (string | number | null)[] = [
      "POWC",
      ...months.map((m) => roundTo1dp((powcSeries[m] || 0) / 1000)),
      roundTo1dp(totalPowc / 1000),
    ];

    const totalOutflowRow: (string | number | null)[] = [
      "Total Outflow",
      ...months.map((m) => roundTo1dp((outflowSeries[m] || 0) / 1000)),
      roundTo1dp(totalOutflowAll / 1000),
    ];

    const netRow: (string | number | null)[] = [
      "Net Cash Flow",
      ...months.map((m) => roundTo1dp((netSeries[m] || 0) / 1000)),
      roundTo1dp(totalNetAll / 1000),
    ];

    const cumulativeRow: (string | number | null)[] = [
      "Cumulative NCF",
      ...months.map((m) => roundTo1dp((cumulativeSeries[m] || 0) / 1000)),
      roundTo1dp(cumulativeFinal / 1000),
    ];

    const rows: (string | number | null)[][] = [
      header,
      unitSalesRow,
      ...(hasBulkSales ? [bulkSalesRow] : []),
      totalInflowRow,
      landRow,
      constructionRow,
      softRow,
      powcRow,
      totalOutflowRow,
      netRow,
      cumulativeRow,
    ];

    return rows;
  }, [
    months,
    unitInflowSeries,
    bulkInflowSeries,
    inflowSeries,
    landSeries,
    constructionSeries,
    softCostsSeries,
    powcSeries,
    outflowSeries,
    netSeries,
    cumulativeSeries,
    hasBulkSales,
    totalUnitInflowAll,
    totalBulkInflowAll,
    totalInflowAll,
    totalLand,
    totalSoft,
    totalPowc,
    totalOutflowAll,
    totalNetAll,
    cumulativeFinal,
    constructionPeriod,
    constructionTotalThousandsDisplayed,
    previousConstructionMonthsSumThousandsDisplayed,
  ]);

  const currency = projectInfo.currency || "AED";
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);

  const formatNumber = (value: number) => {
    if (!value || Number.isNaN(value)) return "-";
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 1,
    }).format(value / 1000);
  };

  const fileBase = `cash-inflows_${projectInfo.city || "project"}_${currency}`;

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
            📊 Cash Flow Preview — Pre-Financing (Components 1 + 2)
          </h1>
          <p className="text-sm text-slate-400">
            Project: {projectInfo.city || "—"}, {projectInfo.country || "—"} •
            Currency: {currency} • Period: {constructionPeriod} +{" "}
            {postCompletionBuffer} months
          </p>
        </div>

        <div className="mb-6 overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            MONTHLY CASH FLOWS ({currency} &apos;000)
          </h2>

          <table className="min-w-[2200px] w-full text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 min-w-[150px] border-b border-slate-700 bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-300">
                  Cost Item
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
                  Total
                </th>
              </tr>
              {/* Stage headers */}
              <tr>
                <th className="sticky left-0 border-b border-slate-700 bg-slate-800" />
                <th className="border-b border-slate-700 bg-slate-900/30 px-1 py-1 text-center text-xs text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="font-semibold">Pre-Construction</span>
                    <span className="text-[10px] text-slate-500">({1} months)</span>
                  </div>
                </th>
                <th
                  colSpan={stage1Months}
                  className="border-b border-slate-700 border-l-2 border-l-emerald-600 bg-slate-900/50 px-2 py-2 text-center text-xs font-medium text-emerald-400"
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
                  className="border-b border-slate-700 border-l-2 border-l-emerald-600 bg-slate-900/50 px-2 py-2 text-center text-xs font-medium text-emerald-400"
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
                  className="border-b border-slate-700 border-l-2 border-l-emerald-600 bg-slate-900/50 px-2 py-2 text-center text-xs font-medium text-emerald-400"
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
                  className="border-b border-slate-700 border-l-2 border-l-slate-600 bg-slate-900/20 px-2 py-2 text-center text-xs font-medium text-slate-300"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="font-semibold">Post-Completion</span>
                    <span className="text-[10px] text-slate-500">
                      ({postCompletionBuffer} months)
                    </span>
                  </div>
                </th>
                <th className="border-b border-slate-700" />
              </tr>
            </thead>
            <tbody>
              {/* Inflows */}
              <tr className="bg-emerald-900/10">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-emerald-300">
                  CASH INFLOWS
                </td>
                {months.map((m) => (
                  <td key={m} className="border-b border-slate-700/50" />
                ))}
                <td className="border-b border-slate-700" />
              </tr>
              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 pl-8 pr-4 py-3 text-left text-sm font-medium text-slate-200">
                  Unit Sales
                </td>
                {months.map((m) => (
                  <td
                    key={m}
                    className="border-b border-slate-700/50 px-2 py-3 text-center text-xs text-emerald-400"
                  >
                    {formatNumber(unitInflowSeries[m] || 0)}
                  </td>
                ))}
                <td className="border-b border-slate-700 px-4 py-3 text-right text-sm font-semibold text-emerald-400">
                  {formatNumber(totalUnitInflowAll)}
                </td>
              </tr>

              {hasBulkSales && (
                <tr>
                  <td className="sticky left-0 border-r border-slate-700 bg-slate-800 pl-8 pr-4 py-3 text-left text-sm font-medium text-slate-200">
                    Bulk Sales
                  </td>
                  {months.map((m) => (
                    <td
                      key={m}
                      className="border-b border-slate-700/50 px-2 py-3 text-center text-xs text-emerald-400"
                    >
                      {formatNumber(bulkInflowSeries[m] || 0)}
                    </td>
                  ))}
                  <td className="border-b border-slate-700 px-4 py-3 text-right text-sm font-semibold text-emerald-400">
                    {formatNumber(totalBulkInflowAll)}
                  </td>
                </tr>
              )}

              <tr className="bg-slate-900/50 font-medium">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-white">
                  TOTAL INFLOW
                </td>
                {months.map((m) => (
                  <td
                    key={m}
                    className="border-b border-slate-700/50 px-2 py-3 text-center text-xs text-emerald-400"
                  >
                    {formatNumber(inflowSeries[m] || 0)}
                  </td>
                ))}
                <td className="border-b border-slate-700 px-4 py-3 text-right text-sm font-semibold text-emerald-400">
                  {formatNumber(totalInflowAll)}
                </td>
              </tr>

              {/* Outflows */}
              <tr className="bg-red-900/10">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-red-300">
                  CASH OUTFLOWS
                </td>
                {months.map((m) => (
                  <td key={m} className="border-b border-slate-700/50" />
                ))}
                <td className="border-b border-slate-700" />
              </tr>
              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300">
                  Land Cost
                </td>
                {months.map((m) => (
                  <td
                    key={m}
                    className="border-b border-slate-700/50 px-2 py-2 text-center text-xs text-red-400"
                  >
                    {formatNumber(landSeries[m] || 0)}
                  </td>
                ))}
                <td className="border-b border-slate-700 px-4 py-2 text-right text-sm font-semibold text-red-400">
                  {formatNumber(totalLand)}
                </td>
              </tr>
              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200">
                  Construction Cost
                </td>
                {months.map((m) => (
                  <td
                    key={m}
                    className="border-b border-slate-700/50 px-2 py-3 text-center text-xs text-slate-400"
                  >
                    {(() => {
                      const isLastConstructionMonth = m === constructionPeriod;
                      const baseThousands = roundTo1dp(
                        (constructionSeries[m] || 0) / 1000
                      );
                      const pluggedThousands = isLastConstructionMonth
                        ? roundTo1dp(
                            constructionTotalThousandsDisplayed -
                              previousConstructionMonthsSumThousandsDisplayed
                          )
                        : baseThousands;

                      return pluggedThousands > 0
                        ? formatNumber(pluggedThousands * 1000)
                        : "-";
                    })()}
                  </td>
                ))}
                <td className="border-b border-slate-700 px-4 py-3 text-right text-sm font-medium text-slate-200">
                  {formatNumber(constructionTotalThousandsDisplayed * 1000)}
                </td>
              </tr>
              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300">
                  Soft Costs
                </td>
                {months.map((m) => (
                  <td
                    key={m}
                    className="border-b border-slate-700/50 px-2 py-2 text-center text-xs text-red-400"
                  >
                    {formatNumber(softCostsSeries[m] || 0)}
                  </td>
                ))}
                <td className="border-b border-slate-700 px-4 py-2 text-right text-sm font-semibold text-red-400">
                  {formatNumber(totalSoft)}
                </td>
              </tr>
              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300">
                  POWC
                </td>
                {months.map((m) => (
                  <td
                    key={m}
                    className="border-b border-slate-700/50 px-2 py-2 text-center text-xs text-red-400"
                  >
                    {formatNumber(powcSeries[m] || 0)}
                  </td>
                ))}
                <td className="border-b border-slate-700 px-4 py-2 text-right text-sm font-semibold text-red-400">
                  {formatNumber(totalPowc)}
                </td>
              </tr>
              <tr className="bg-red-900/10 font-semibold">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-2 text-sm text-red-300">
                  Total Outflow
                </td>
                {months.map((m) => (
                  <td
                    key={m}
                    className="border-b border-slate-700/50 px-2 py-2 text-center text-xs text-red-400"
                  >
                    {formatNumber(outflowSeries[m] || 0)}
                  </td>
                ))}
                <td className="border-b border-slate-700 px-4 py-2 text-right text-sm font-semibold text-red-400">
                  {formatNumber(totalOutflowAll)}
                </td>
              </tr>

              {/* Net / cumulative */}
              <tr className="bg-blue-900/10">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-2 text-blue-300">
                  <span className="font-semibold">NET CASH FLOW</span>
                  <br />
                  <span className="text-xs font-normal text-slate-400">
                    (Inflows - Outflows)
                  </span>
                </td>
                {months.map((m) => (
                  <td
                    key={m}
                    className={`border-b border-slate-700/50 px-1 py-2 text-center text-xs ${
                      (netSeries[m] || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {formatNumber(netSeries[m] || 0)}
                  </td>
                ))}
                <td
                  className={`border-b border-slate-700 px-4 py-2 text-right text-sm font-semibold ${
                    totalNetAll >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatNumber(totalNetAll)}
                </td>
              </tr>
              <tr className="bg-blue-900/20 font-semibold">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-2 text-blue-300">
                  CUMULATIVE NCF
                </td>
                {months.map((m) => (
                  <td
                    key={m}
                    className={`border-b border-slate-700/50 px-1 py-2 text-center text-xs ${
                      (cumulativeSeries[m] || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {formatNumber(cumulativeSeries[m] || 0)}
                  </td>
                ))}
                <td className="border-b border-slate-700 px-4 py-2 text-right text-sm font-semibold text-blue-300">
                  {formatNumber(cumulativeFinal)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mt-4 text-xs text-slate-500">
            ℹ️ Values shown in {currency} &apos;000. Outflows end at M{constructionPeriod}
            ; M{constructionPeriod + 1}–M{totalMonths} outflows are 0 by design.
          </p>
        </div>

        {/* Quick totals */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="text-xs text-slate-400 mb-1">Total Inflows</p>
            <p className="text-lg font-semibold text-emerald-400">
              {formatCurrency(inflowSeries.reduce((s, v) => s + v, 0))}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="text-xs text-slate-400 mb-1">Total Outflows</p>
            <p className="text-lg font-semibold text-red-400">
              {formatCurrency(outflowSeries.reduce((s, v) => s + v, 0))}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="text-xs text-slate-400 mb-1">Net Surplus (Pre-Financing)</p>
            <p className="text-lg font-semibold text-white">
              {formatCurrency(cumulativeSeries[cumulativeSeries.length - 1] || 0)}
            </p>
          </div>
        </div>

        {downloadOpen ? (
          <div
            ref={downloadRef}
            className="fixed bottom-24 left-4 right-4 z-50 rounded-xl border border-slate-700 bg-slate-800/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md md:left-1/2 md:right-auto md:w-[320px] md:-translate-x-1/2"
          >
            <p className="mb-2 text-xs font-medium text-slate-300">
              Download pre-financing cash flows as…
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  exportToExcel({
                    filename: fileBase,
                    sheetName: "Pre-Financing (000)",
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
          previousRoute={withStreamPrefix(
            streamPrefix,
            "/cash-inflows?step=9"
          )}
          nextRoute={withStreamPrefix(
            streamPrefix,
            streamPrefix === "/operational" ? "/preview/pnl" : "/project-irr"
          )}
          nextLabel={
            streamPrefix === "/operational"
              ? "Operating P&L preview →"
              : undefined
          }
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
}
