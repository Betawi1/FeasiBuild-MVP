"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import useFinModelStore, {
  buildCashOutflowProfile,
} from "@/store/useFinModelStore";
import {
  DEFAULT_POWC_ALLOCATION,
  DEFAULT_SOFT_COST_ALLOCATION,
} from "@/lib/cash-outflow-default-allocations";
import {
  POWC_STEP13_TIMING_NOTES,
  SOFT_COSTS_TIMING_NOTES,
} from "@/lib/cash-outflow-powc-timing";
import { exportToCSV, type CsvCell } from "@/lib/downloads/exportToCSV";
import { exportToExcel, type ExcelCell } from "@/lib/downloads/exportToExcel";
import {
  buildOperationalCashOutCsvPrefix,
  buildOperationalCashOutExcelSheets,
  buildOperationalMonthlyExportRows,
} from "@/lib/operational-cash-outflows-excel";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";

export default function PreviewCashOutflowsPage() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);

  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement | null>(null);

  const profile = buildCashOutflowProfile(cashOutflows);

  const currencyCode = projectInfo.currency || "AED";

  // Match `/preview/cash-outflows` displayed rounding exactly:
  // when each month's value is rounded for display, the row sum can differ slightly
  // from the displayed total. We "plug" the final construction month so the
  // displayed monthly values sum to the displayed construction total.
  const roundTo1dp = (n: number) => Math.round(n * 10) / 10;
  const constructionTotalThousandsDisplayed = roundTo1dp(
    (cashOutflows.constructionCost || 0) / 1000
  );
  const lastConstructionIdx = Math.max(0, profile.construction.length - 1);
  const previousConstructionMonthsSumThousandsDisplayed = profile.construction
    .slice(0, lastConstructionIdx)
    .reduce((sum, v) => sum + roundTo1dp((v || 0) / 1000), 0);

  // Ensure the construction monthly breakdown sums exactly to the
  // provided construction total (including contingency).
  // buildCashOutflowProfile nudges monthly totals to match TDC, but the
  // `construction` breakdown array can still drift by small float/rounding
  // amounts, which shows up as an off-by-difference when summing the row.
  const expectedConstructionTotal = cashOutflows.constructionCost || 0;
  const actualConstructionTotal = profile.construction.reduce(
    (sum, v) => sum + (v || 0),
    0
  );
  const constructionDiff = expectedConstructionTotal - actualConstructionTotal;
  if (Math.abs(constructionDiff) > 1 && profile.construction.length > 1) {
    const lastIdx = profile.construction.length - 1;
    // Index 0 is M0 (pre-construction); apply drift absorption to last month.
    profile.construction[lastIdx] += constructionDiff;
  }

  /** Pad Step 13 metadata to at least 4 columns; align with monthly sheet when present. */
  const step13PadWidth = Math.max(profile.months.length + 2, 4);

  const step13MetaRows = useMemo((): ExcelCell[][] => {
    const pad = (cells: ExcelCell[]): ExcelCell[] => {
      const row = [...cells];
      while (row.length < step13PadWidth) row.push(null);
      return row;
    };
    const po = cashOutflows.powcAllocation ?? { ...DEFAULT_POWC_ALLOCATION };
    const sc = cashOutflows.softCostAllocation ?? {
      ...DEFAULT_SOFT_COST_ALLOCATION,
    };
    const powcTotalAmt = cashOutflows.powc || 0;
    const softTotalAmt = cashOutflows.softCosts || 0;
    const r1 = (v: number) => Math.round(v * 10) / 10;

    return [
      pad(["Step 13 — POWC sub-allocation (% of total POWC)"]),
      pad(["Site establishment", po.siteEstablishment]),
      pad(["Overhead costs", po.overhead]),
      pad(["Authority fees", po.authorityFees]),
      pad([
        "POWC % sum",
        po.siteEstablishment + po.overhead + po.authorityFees,
      ]),
      pad([]),
      pad(["POWC timing applied in monthly model"]),
      pad([POWC_STEP13_TIMING_NOTES]),
      pad([]),
      pad(["POWC line — implied totals ('000) from Step 13 % × POWC total"]),
      pad([
        "Site establishment ('000)",
        r1((powcTotalAmt * po.siteEstablishment) / 100 / 1000),
      ]),
      pad([
        "Overhead ('000)",
        r1((powcTotalAmt * po.overhead) / 100 / 1000),
      ]),
      pad([
        "Authority fees ('000)",
        r1((powcTotalAmt * po.authorityFees) / 100 / 1000),
      ]),
      pad([]),
      pad(["Step 13 — Soft cost sub-allocation (% of total soft costs)"]),
      pad(["Main architect", sc.architect]),
      pad(["Project management", sc.projectManagement]),
      pad(["Engineering consultant", sc.engineering]),
      pad(["Geotechnical consultant", sc.geotechnical]),
      pad(["Other fees", sc.otherFees]),
      pad([
        "Soft % sum",
        sc.architect +
          sc.projectManagement +
          sc.engineering +
          sc.geotechnical +
          sc.otherFees,
      ]),
      pad([]),
      pad(["Soft costs aggregate timing (cash flow model)"]),
      pad([SOFT_COSTS_TIMING_NOTES]),
      pad([]),
      pad(["Soft line — implied totals ('000) from Step 13 % × soft total"]),
      pad([
        "Main architect ('000)",
        r1((softTotalAmt * sc.architect) / 100 / 1000),
      ]),
      pad([
        "Project management ('000)",
        r1((softTotalAmt * sc.projectManagement) / 100 / 1000),
      ]),
      pad([
        "Engineering ('000)",
        r1((softTotalAmt * sc.engineering) / 100 / 1000),
      ]),
      pad([
        "Geotechnical ('000)",
        r1((softTotalAmt * sc.geotechnical) / 100 / 1000),
      ]),
      pad([
        "Other fees ('000)",
        r1((softTotalAmt * sc.otherFees) / 100 / 1000),
      ]),
      pad([]),
      pad(["— End Step 13 metadata —"]),
      pad([]),
    ];
  }, [
    step13PadWidth,
    cashOutflows.powcAllocation,
    cashOutflows.softCostAllocation,
    cashOutflows.powc,
    cashOutflows.softCosts,
  ]);

  const exportRows = useMemo(() => {
    const months = profile.months;
    if (months.length === 0) return [];

    if (streamPrefix === "/operational") {
      return buildOperationalMonthlyExportRows({
        profile: {
          months: profile.months,
          construction: profile.construction,
          ffe: profile.ffe,
          softCosts: profile.softCosts,
          powc: profile.powc,
          monthlyTotal: profile.monthlyTotal,
          cumulative: profile.cumulative,
        },
        cashOutflows,
        projectInfo,
        roundTo1dp,
        lastConstructionIdx,
        constructionTotalThousandsDisplayed,
        previousConstructionMonthsSumDisplayed:
          previousConstructionMonthsSumThousandsDisplayed,
      });
    }

    const header = ["Cost Item", ...months.map((m) => `M${m}`), "Total"];

    const landRow: (string | number | null)[] = [
      "Land Cost",
      ...months.map((_, idx) => (idx === 0 ? cashOutflows.landCost / 1000 : null)),
      cashOutflows.landCost / 1000,
    ];

    const constructionRow: (string | number | null)[] = [
      "Construction Cost",
      ...months.map((_, idx) => {
        const isLastConstructionMonth = idx === lastConstructionIdx;
        const baseDisplayedThousands = roundTo1dp((profile.construction[idx] || 0) / 1000);
        const displayedThousands = isLastConstructionMonth
          ? roundTo1dp(
              constructionTotalThousandsDisplayed -
                previousConstructionMonthsSumThousandsDisplayed
            )
          : baseDisplayedThousands;
        return displayedThousands > 0 ? displayedThousands : null;
      }),
      constructionTotalThousandsDisplayed,
    ];

    const softCostsRow: (string | number | null)[] = [
      "Soft Costs",
      ...months.map((_, idx) => roundTo1dp((profile.softCosts[idx] || 0) / 1000)),
      roundTo1dp((cashOutflows.softCosts || 0) / 1000),
    ];

    const powcRow: (string | number | null)[] = [
      "POWC",
      ...months.map((_, idx) => roundTo1dp((profile.powc[idx] || 0) / 1000)),
      roundTo1dp((cashOutflows.powc || 0) / 1000),
    ];

    const monthlyTotalRow: (string | number | null)[] = [
      "Monthly Total",
      ...months.map((_, idx) => roundTo1dp((profile.monthlyTotal[idx] || 0) / 1000)),
      roundTo1dp((cashOutflows.tdc || 0) / 1000),
    ];

    const cumulativeRow: (string | number | null)[] = [
      "Cumulative",
      ...months.map((_, idx) => roundTo1dp((profile.cumulative[idx] || 0) / 1000)),
      roundTo1dp((profile.cumulative[profile.cumulative.length - 1] || 0) / 1000),
    ];

    return [
      header,
      landRow,
      constructionRow,
      softCostsRow,
      powcRow,
      monthlyTotalRow,
      cumulativeRow,
    ];
  }, [
    streamPrefix,
    projectInfo,
    profile.months,
    profile.construction,
    profile.softCosts,
    profile.powc,
    profile.monthlyTotal,
    profile.cumulative,
    cashOutflows,
    lastConstructionIdx,
    constructionTotalThousandsDisplayed,
    previousConstructionMonthsSumThousandsDisplayed,
  ]);

  const csvExportRows = useMemo(() => {
    const isOperational = streamPrefix === "/operational";
    const prefix = isOperational
      ? buildOperationalCashOutCsvPrefix(projectInfo, cashOutflows)
      : [];
    const monthlyBlock =
      exportRows.length === 0
        ? step13MetaRows
        : [...step13MetaRows, ...exportRows];
    if (isOperational) return [...prefix, ...monthlyBlock];
    return monthlyBlock;
  }, [
    streamPrefix,
    projectInfo,
    cashOutflows,
    step13MetaRows,
    exportRows,
  ]);

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

  const fileBase = `cash-outflows_${projectInfo.city || "project"}_${currencyCode}`;

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 pb-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-white">
            📊 Development Financials Preview
          </h1>
          <p className="text-sm text-slate-400">
            Project: {projectInfo.city || "—"},{" "}
            {projectInfo.country || "—"} • Currency: {projectInfo.currency} •
            Construction: {cashOutflows.constructionPeriod} months
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="mb-1 text-xs text-slate-400">Land Cost</p>
            <p className="text-lg font-semibold text-white">
              {formatCurrency(cashOutflows.landCost, currencyCode)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="mb-1 text-xs text-slate-400">Construction Cost</p>
            <p className="text-lg font-semibold text-white">
              {formatCurrency(cashOutflows.constructionCost, currencyCode)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="mb-1 text-xs text-slate-400">Soft Costs</p>
            <p className="text-lg font-semibold text-white">
              {formatCurrency(cashOutflows.softCosts, currencyCode)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="mb-1 text-xs text-slate-400">
              Total Development Cost
            </p>
            <p className="text-lg font-semibold text-emerald-400">
              {formatCurrency(cashOutflows.tdc, currencyCode)}
            </p>
          </div>
        </div>

        <div className="mb-6 overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Monthly Cash Outflows ({currencyCode} &apos;000)
          </h2>

          {profile.months.length === 0 ? (
            <p className="text-sm text-slate-400">
              Set a positive construction period and generate the model in
              Component 1 to see the monthly cash flow profile.
            </p>
          ) : (
            <table className="min-w-[1200px] w-full">
              <thead>
                {streamPrefix === "/operational" ? (
                  <>
                    <tr>
                      {(exportRows[0] ?? []).map((h, hi) => {
                        const ncol = (exportRows[0] ?? []).length;
                        const isFirst = hi === 0;
                        const isLast = hi === ncol - 1;
                        return (
                          <th
                            key={hi}
                            className={`border-b border-slate-700 bg-slate-800 py-3 text-xs font-medium text-slate-300 ${
                              isFirst
                                ? "sticky left-0 z-10 min-w-[120px] px-4 text-left"
                                : isLast
                                  ? "min-w-[72px] px-4 text-right font-semibold tabular-nums"
                                  : "min-w-[56px] px-2 text-center text-slate-400"
                            }`}
                          >
                            {h === "" || h == null ? "" : String(h)}
                          </th>
                        );
                      })}
                    </tr>
                    <tr>
                      <th className="sticky left-0 border-b border-slate-700 bg-slate-800" />
                      <th className="border-b border-slate-700 bg-slate-900/30 px-2 py-2 text-center text-xs font-medium text-slate-500">
                        M0
                      </th>
                      {profile.stages.map((stage, stageIndex) => (
                        <th
                          key={`${stage.name}-${stageIndex}`}
                          colSpan={stage.monthSpan}
                          className="border-b border-slate-700 border-l-2 border-l-emerald-600 bg-slate-900/50 px-2 py-2 text-center text-xs font-medium text-emerald-400"
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="font-semibold">{stage.name}</span>
                            <span className="text-[10px] text-slate-500">
                              ({stage.monthSpan} months)
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="border-b border-slate-700" />
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <th className="sticky left-0 min-w-[150px] border-b border-slate-700 bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-300">
                        Cost Item
                      </th>
                      {profile.months.map((month) => (
                        <th
                          key={month}
                          className="min-w-[60px] border-b border-slate-700 px-2 py-3 text-center text-xs font-medium text-slate-400"
                        >
                          M{month}
                        </th>
                      ))}
                      <th className="border-b border-slate-700 px-4 py-3 text-right text-sm font-semibold text-slate-300">
                        Total
                      </th>
                    </tr>
                    <tr>
                      <th className="sticky left-0 border-b border-slate-700 bg-slate-800" />

                      <th className="border-b border-slate-700 bg-slate-900/30 px-2 py-2 text-center text-xs font-medium text-slate-500">
                        M0
                      </th>

                      {profile.stages.map((stage, stageIndex) => (
                        <th
                          key={`${stage.name}-${stageIndex}`}
                          colSpan={stage.monthSpan}
                          className="border-b border-slate-700 border-l-2 border-l-emerald-600 bg-slate-900/50 px-2 py-2 text-center text-xs font-medium text-emerald-400"
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="font-semibold">{stage.name}</span>
                            <span className="text-[10px] text-slate-500">
                              ({stage.monthSpan} months)
                            </span>
                          </div>
                        </th>
                      ))}

                      <th className="border-b border-slate-700" />
                    </tr>
                  </>
                )}
              </thead>
              <tbody>
                {streamPrefix === "/operational"
                  ? exportRows.slice(1).map((row, ri) => {
                      const ncol = row.length;
                      const label = String(row[0] ?? "");
                      const isTotalRow =
                        label === "Monthly Total" || label === "Cumulative";
                      return (
                        <tr
                          key={ri}
                          className={
                            isTotalRow
                              ? "border-t border-slate-700 bg-slate-900/50"
                              : "border-t border-slate-700"
                          }
                        >
                          {row.map((cell, ci) => {
                            const isFirst = ci === 0;
                            const isLast = ci === ncol - 1;
                            return (
                              <td
                                key={ci}
                                className={`px-2 py-3 text-xs ${
                                  isFirst
                                    ? "sticky left-0 z-10 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200"
                                    : isLast
                                      ? "border-r border-slate-700/50 text-right text-sm font-medium tabular-nums text-slate-200"
                                      : "border-r border-slate-700/50 text-center text-slate-400"
                                } ${
                                  isTotalRow && isLast
                                    ? "font-semibold text-emerald-400"
                                    : ""
                                } ${
                                  isTotalRow && !isFirst && !isLast
                                    ? "font-medium text-white"
                                    : ""
                                }`}
                              >
                                {cell === ""
                                  ? ""
                                  : cell === null
                                    ? "-"
                                    : typeof cell === "number"
                                      ? formatNumber(cell)
                                      : String(cell)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  : (
                      <>
                        <tr className="border-t border-slate-700">
                          <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200">
                            Land Cost
                          </td>
                          {profile.months.map((_, idx) => (
                            <td
                              key={idx}
                              className="border-r border-slate-700/50 px-2 py-3 text-center text-xs text-slate-400"
                            >
                              {idx === 0
                                ? formatNumber(cashOutflows.landCost / 1000)
                                : "-"}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-200">
                            {formatNumber(cashOutflows.landCost / 1000)}
                          </td>
                        </tr>

                        <tr className="border-t border-slate-700">
                          <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200">
                            Construction Cost
                          </td>
                          {profile.months.map((_, idx) => (
                            <td
                              key={idx}
                              className="border-r border-slate-700/50 px-2 py-3 text-center text-xs text-slate-400"
                            >
                              {(() => {
                                const isLastConstructionMonth =
                                  idx === lastConstructionIdx;
                                const baseDisplayedThousands = roundTo1dp(
                                  (profile.construction[idx] || 0) / 1000
                                );
                                const displayedThousands =
                                  isLastConstructionMonth
                                    ? roundTo1dp(
                                        constructionTotalThousandsDisplayed -
                                          previousConstructionMonthsSumThousandsDisplayed
                                      )
                                    : baseDisplayedThousands;

                                return displayedThousands > 0
                                  ? formatNumber(displayedThousands)
                                  : "-";
                              })()}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-200">
                            {formatNumber(constructionTotalThousandsDisplayed)}
                          </td>
                        </tr>

                        <tr className="border-t border-slate-700">
                          <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200">
                            Soft Costs
                          </td>
                          {profile.months.map((_, idx) => (
                            <td
                              key={idx}
                              className="border-r border-slate-700/50 px-2 py-3 text-center text-xs text-slate-400"
                            >
                              {formatNumber(profile.softCosts[idx] / 1000)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-200">
                            {formatNumber(cashOutflows.softCosts / 1000)}
                          </td>
                        </tr>

                        <tr className="border-t border-slate-700">
                          <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200">
                            POWC
                          </td>
                          {profile.months.map((_, idx) => (
                            <td
                              key={idx}
                              className="border-r border-slate-700/50 px-2 py-3 text-center text-xs text-slate-400"
                            >
                              {formatNumber(profile.powc[idx] / 1000)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-200">
                            {formatNumber((cashOutflows.powc || 0) / 1000)}
                          </td>
                        </tr>

                        <tr className="border-t border-slate-700 bg-slate-900/50">
                          <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white">
                            Monthly Total
                          </td>
                          {profile.months.map((_, idx) => (
                            <td
                              key={idx}
                              className="border-r border-slate-700/50 px-2 py-3 text-center text-xs font-medium text-white"
                            >
                              {formatNumber(profile.monthlyTotal[idx] / 1000)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-400">
                            {formatNumber(cashOutflows.tdc / 1000)}
                          </td>
                        </tr>

                        <tr className="border-t border-slate-700">
                          <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white">
                            Cumulative
                          </td>
                          {profile.months.map((_, idx) => (
                            <td
                              key={idx}
                              className="border-r border-slate-700/50 px-2 py-3 text-center text-xs font-medium text-emerald-400"
                            >
                              {formatNumber(profile.cumulative[idx] / 1000)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-400">
                            {formatNumber(
                              profile.cumulative[profile.cumulative.length - 1] /
                                1000
                            )}
                          </td>
                        </tr>
                      </>
                    )}
              </tbody>
            </table>
          )}
        </div>

        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/30 p-4">
          <p className="text-sm text-slate-400">
            <span className="text-lg">ℹ️</span> Construction S-curve follows
            stage allocation: {cashOutflows.stageAllocation.stage1Label} (
            {cashOutflows.stageAllocation.stage1Percent}%) →{" "}
            {cashOutflows.stageAllocation.stage2Label} (
            {cashOutflows.stageAllocation.stage2Percent}%) →{" "}
            {cashOutflows.stageAllocation.stage3Label} (
            {cashOutflows.stageAllocation.stage3Percent}
            %). POWC months use your Step 13 % split and the timing rules in the
            Excel &quot;Step 13 inputs&quot; sheet. Soft costs use Step 13 line
            weights; aggregate cash is 50% M0, 30% M1, 20% M2.
          </p>
        </div>

        {downloadOpen ? (
          <div
            ref={downloadRef}
            className="fixed bottom-24 left-4 right-4 z-50 rounded-xl border border-slate-700 bg-slate-800/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md md:left-1/2 md:right-auto md:w-[320px] md:-translate-x-1/2"
          >
            <p className="mb-2 text-xs font-medium text-slate-300">
              Download cash outflows as…
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const monthlySheet =
                    exportRows.length > 0
                      ? exportRows
                      : [
                          [
                            "Set construction period and generate model for monthly rows",
                          ],
                        ];
                  const sheets =
                    streamPrefix === "/operational"
                      ? [
                          ...buildOperationalCashOutExcelSheets(
                            projectInfo,
                            cashOutflows
                          ),
                          {
                            sheetName: "Step 13 inputs",
                            data: step13MetaRows,
                          },
                          { sheetName: "Monthly (000)", data: monthlySheet },
                        ]
                      : [
                          {
                            sheetName: "Step 13 inputs",
                            data: step13MetaRows,
                          },
                          { sheetName: "Monthly (000)", data: monthlySheet },
                        ];
                  exportToExcel({
                    fileName: fileBase,
                    sheets,
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
                    rows: csvExportRows as CsvCell[][],
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
            "/cash-outflows?step=14"
          )}
          nextRoute={withStreamPrefix(streamPrefix, "/cash-inflows")}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
}

function formatCurrency(value: number, currency: string) {
  if (!value || Number.isNaN(value)) return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "AED",
      maximumFractionDigits: 0,
    }).format(value);
  }
}

function formatNumber(value: number) {
  if (!value || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value);
}
