"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import useFinModelStore from "@/store/useFinModelStore";
import {
  buildSaleCashflowDetailProfile,
  type SaleCashflowDetailProfile,
} from "@/lib/sale-cash-preview-profile";
import { buildSaleCashOutflowProfile } from "@/store/useSaleModelStore";
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
import { useStreamPrefix, withStreamPrefix } from "@/lib/stream-path";

import type { CashOutflows } from "@/store/useFinModelStore";

type DisplayedMonthlyTotalBreakdown = {
  land: number;
  construction: number;
  soft: number;
  powc: number;
  total: number;
};

/** Matches on-screen Construction + POWC plugging and land M0-only timing (same as Preview rows). */
function buildDisplayedMonthlyTotalBreakdown(
  detail: SaleCashflowDetailProfile,
  cashOutflows: CashOutflows,
  constructionSeries: number[],
  constructionPeriod: number,
  constructionTotalDisplayed: number
): DisplayedMonthlyTotalBreakdown[] {
  const monthsArr = detail.months;
  const lastPowcIdx = monthsArr.length - 1;
  const powcTarget = Math.round(cashOutflows.powc || 0);

  return monthsArr.map((_, idx) => {
    const land = idx === 0 ? Math.round(cashOutflows.landCost || 0) : 0;

    const m = monthsArr[idx] ?? 0;
    let construction: number;
    if (m !== constructionPeriod) {
      construction = Math.round(constructionSeries[m] || 0);
    } else {
      const prevDisplayedSum = monthsArr.slice(0, idx).reduce((sum, prevM) => {
        return sum + Math.round(constructionSeries[prevM] || 0);
      }, 0);
      construction = Math.round(constructionTotalDisplayed - prevDisplayedSum);
    }

    const soft = Math.round(detail.softCostsTotal[idx] || 0);

    let powc: number;
    if (idx !== lastPowcIdx) {
      powc = Math.round(detail.powcTotal[idx] || 0);
    } else {
      const prevDisplayedSum = monthsArr
        .slice(0, idx)
        .reduce(
          (sum, _, prevIdx) =>
            sum + Math.round(detail.powcTotal[prevIdx] || 0),
          0
        );
      powc = Math.round(powcTarget - prevDisplayedSum);
    }

    const total = land + construction + soft + powc;
    return { land, construction, soft, powc, total };
  });
}

export default function PreviewCashOutflowsPage() {
  const streamPrefix = useStreamPrefix();
  const projectInfo = useFinModelStore((s) => s.sale.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.sale.cashOutflows);
  const updateCashOutflows = useFinModelStore((s) => s.updateCashOutflows);

  useEffect(() => {
    console.log("🏢 [Sale Preview C1] Cash Outflows Loaded:", {
      stream: "sale",
      hasData: !!cashOutflows,
      landCost: cashOutflows?.landCost,
      constructionCost: cashOutflows?.constructionCost,
    });
  }, [cashOutflows]);

  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement | null>(null);

  const detail = useMemo(
    () => buildSaleCashflowDetailProfile(cashOutflows, projectInfo),
    [cashOutflows, projectInfo]
  );
  const months = detail.months;

  const outflowProfile = useMemo(
    () => buildSaleCashOutflowProfile(cashOutflows, projectInfo),
    [cashOutflows, projectInfo]
  );
  const monthlyConstructionCost = outflowProfile.construction;
  const constructionSeries = monthlyConstructionCost;
  const constructionPeriod = cashOutflows.constructionPeriod || 0;

  const currencyCode = projectInfo.currency || "AED";

  // Round to nearest whole number (0 decimals)
  const roundToWhole = (n: number) => Math.round(n);

  /** Display rounding: plug last construction month so displayed monthly sum == displayed total. */
  const constructionTotalDisplayed = roundToWhole(cashOutflows.constructionCost || 0);

  // Helper: Plug last month to match displayed total
  const plugLastMonth = (
    rawArray: number[],
    totalTarget: number,
    lastMonthIndex: number
  ): number[] => {
    const plugged = [...rawArray];
    const prevSum = plugged
      .slice(0, lastMonthIndex)
      .reduce((sum, val) => sum + Math.round(val || 0), 0);
    const pluggedValue = Math.round(totalTarget) - prevSum;
    plugged[lastMonthIndex] = pluggedValue;
    return plugged;
  };

  const pluggedSeriesForStore = useMemo(() => {
    const lastConstIdx = Math.max(0, cashOutflows.constructionPeriod || 0);
    const constRaw = Array.isArray(outflowProfile.construction)
      ? outflowProfile.construction
      : [];
    const softRaw = Array.isArray(outflowProfile.softCosts)
      ? outflowProfile.softCosts
      : [];

    const pluggedConstruction = plugLastMonth(
      constRaw,
      cashOutflows.constructionCost || 0,
      lastConstIdx
    );

    // Same series as the Component 2 preview table (`buildSaleCashflowDetailProfile`), not
    // `buildSaleCashOutflowProfile` POWC (different allocator). Plug last month to match `powc` total.
    const powcFromDetail = Array.isArray(detail.powcTotal) ? [...detail.powcTotal] : [];
    const lastPowcIdx = Math.max(0, powcFromDetail.length - 1);
    const pluggedPowc =
      powcFromDetail.length > 0
        ? plugLastMonth(powcFromDetail, cashOutflows.powc || 0, lastPowcIdx)
        : [];

    return { pluggedConstruction, pluggedPowc, softRaw };
  }, [
    cashOutflows.constructionCost,
    cashOutflows.constructionPeriod,
    cashOutflows.powc,
    detail.powcTotal,
    outflowProfile.construction,
    outflowProfile.softCosts,
  ]);

  useEffect(() => {
    // Save PLUGGED arrays to store (not raw) so downstream previews match this page.
    const next = {
      ...(cashOutflows as any),
      monthlyConstructionCosts: pluggedSeriesForStore.pluggedConstruction,
      monthlyPowc: pluggedSeriesForStore.pluggedPowc,
      monthlySoftCosts: pluggedSeriesForStore.softRaw,
    };

    const prev = cashOutflows as any;
    const sameConstruction =
      Array.isArray(prev.monthlyConstructionCosts) &&
      JSON.stringify(prev.monthlyConstructionCosts) ===
        JSON.stringify(next.monthlyConstructionCosts);
    const samePowc =
      Array.isArray(prev.monthlyPowc) &&
      JSON.stringify(prev.monthlyPowc) === JSON.stringify(next.monthlyPowc);
    const sameSoft =
      Array.isArray(prev.monthlySoftCosts) &&
      JSON.stringify(prev.monthlySoftCosts) ===
        JSON.stringify(next.monthlySoftCosts);

    if (sameConstruction && samePowc && sameSoft) return;

    if (process.env.NODE_ENV === "development") {
      const pt = detail.powcTotal;
      // eslint-disable-next-line no-console
      console.log("💾 [Saving POWC to Store]:", {
        source: "detail.powcTotal",
        length: pt.length,
        M0: pt[0],
        M1: pt[1],
        M2: pt[2],
        shouldBeM0: 900383,
      });
    }

    updateCashOutflows(next, "sale");
  }, [cashOutflows, detail.powcTotal, pluggedSeriesForStore, updateCashOutflows]);

  const previewTableNumberFmt = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      }),
    []
  );

  const displayedMonthlyTotals = useMemo(
    () =>
      buildDisplayedMonthlyTotalBreakdown(
        detail,
        cashOutflows,
        constructionSeries,
        constructionPeriod,
        constructionTotalDisplayed
      ),
    [
      detail,
      cashOutflows,
      constructionSeries,
      constructionPeriod,
      constructionTotalDisplayed,
    ]
  );

  const displayedGrandTotal = useMemo(
    () => displayedMonthlyTotals.reduce((s, row) => s + row.total, 0),
    [displayedMonthlyTotals]
  );

  /** Pad Step 13 metadata to at least 4 columns; align with monthly sheet when present. */
  const step13PadWidth = Math.max(detail.months.length + 2, 4);

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
    const r0 = (v: number) => roundToWhole(v);

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
      pad(["Sale preview — authority fees (overrides operational wording for this export)"]),
      pad([
        "50% of authority bucket in M0 + M1 (25% each); 50% spread over last 3 construction months.",
      ]),
      pad([]),
      pad(["POWC line — implied totals from Step 13 % × POWC total"]),
      pad([
        "Site establishment",
        r0((powcTotalAmt * po.siteEstablishment) / 100),
      ]),
      pad([
        "Overhead",
        r0((powcTotalAmt * po.overhead) / 100),
      ]),
      pad([
        "Authority fees",
        r0((powcTotalAmt * po.authorityFees) / 100),
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
      pad(["Soft line — implied totals from Step 13 % × soft total"]),
      pad([
        "Main architect",
        r0((softTotalAmt * sc.architect) / 100),
      ]),
      pad([
        "Project management",
        r0((softTotalAmt * sc.projectManagement) / 100),
      ]),
      pad([
        "Engineering",
        r0((softTotalAmt * sc.engineering) / 100),
      ]),
      pad([
        "Geotechnical",
        r0((softTotalAmt * sc.geotechnical) / 100),
      ]),
      pad([
        "Other fees",
        r0((softTotalAmt * sc.otherFees) / 100),
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

  useEffect(() => {
    // Simulate what user sees when copying to Excel (display rounding accumulation)
    const monthsForDisplay = detail.months;
    if (monthsForDisplay.length === 0) return;

    const displayedValues = monthsForDisplay.map((m: number) =>
      roundToWhole(constructionSeries[m] || 0)
    );
    const lastIdx = constructionPeriod;
    const prevSum = displayedValues.slice(0, lastIdx).reduce((a, b) => a + (b || 0), 0);
    const pluggedLast = roundToWhole(constructionTotalDisplayed - prevSum);
    const totalWithPlug = prevSum + pluggedLast;

    console.log("🎯 [Display Sum Verification]:", {
      targetTotal: constructionTotalDisplayed,
      prevDisplayedSum: prevSum,
      pluggedLast,
      totalWithPlug,
      matches: Math.abs(totalWithPlug - constructionTotalDisplayed) < 1,
    });
  }, [
    constructionSeries,
    constructionPeriod,
    constructionTotalDisplayed,
    detail.months,
  ]);

  useEffect(() => {
    const powcTarget = roundToWhole(cashOutflows.powc || 0);
    const displayedValues = detail.months.map((_, idx) => {
      if (idx === detail.months.length - 1) {
        const prevSum = detail.months
          .slice(0, idx)
          .reduce(
            (s, _, i) => s + (roundToWhole(detail.powcTotal[i]) || 0),
            0
          );
        return roundToWhole(powcTarget - prevSum);
      }
      return roundToWhole(detail.powcTotal[idx]);
    });
    const totalWithPlug = displayedValues.reduce((a, b) => a + b, 0);

    console.log("🎯 [POWC Display Sum Verification]:", {
      target: powcTarget,
      displayedSum: totalWithPlug,
      matches: Math.abs(totalWithPlug - powcTarget) < 1,
    });
  }, [detail.months, detail.powcTotal, cashOutflows.powc]);

  useEffect(() => {
    if (displayedMonthlyTotals.length === 0) return;
    console.log("🎯 [Monthly Total — nuke & pave / first 5 months]:", {
      sample: displayedMonthlyTotals.slice(0, 5).map((b, i) => ({
        idx: i,
        monthLabel: detail.months[i],
        ...b,
      })),
      displayedGrandTotal,
      tdcRounded: Math.round(cashOutflows.tdc || 0),
    });
  }, [
    displayedMonthlyTotals,
    displayedGrandTotal,
    detail.months,
    cashOutflows.tdc,
  ]);

  const exportRows = useMemo(() => {
    const months = detail.months;
    if (months.length === 0) return [];

    const header = ["Cost Item", ...months.map((m) => `M${m}`), "Total"];

    const seriesRow = (
      label: string,
      monthly: number[],
      total: number
    ): (string | number | null)[] => [
      label,
      ...months.map((_, idx) => roundToWhole(monthly[idx] || 0)),
      roundToWhole(total),
    ];

    const landRow: (string | number | null)[] = [
      "Land Cost",
      ...months.map((_, idx) => (idx === 0 ? cashOutflows.landCost : null)),
      cashOutflows.landCost,
    ];

    const constructionRow: (string | number | null)[] = [
      "Construction Cost",
      ...months.map((m, idx) => {
        const isLastConstructionMonth = m === constructionPeriod;

        if (!isLastConstructionMonth) {
          const rounded = roundToWhole(constructionSeries[m] || 0);
          return rounded > 0 ? rounded : null;
        }

        const prevDisplayedSum = months
          .slice(0, idx)
          .reduce((sum, prevM) => {
            const prevRounded = roundToWhole(constructionSeries[prevM] || 0);
            return sum + (prevRounded || 0);
          }, 0);

        const pluggedValue = roundToWhole(
          (cashOutflows.constructionCost || 0) - prevDisplayedSum
        );

        return pluggedValue > 0 ? pluggedValue : null;
      }),
      constructionTotalDisplayed,
    ];

    const softTotalRow = seriesRow(
      "Soft Costs",
      detail.softCostsTotal,
      cashOutflows.softCosts || 0
    );
    const softSubRows = detail.softCostLines.map((row) =>
      seriesRow(`  ${row.label}`, row.monthly, row.total)
    );

    const powcTargetDisplayed = roundToWhole(cashOutflows.powc || 0);
    const powcTotalRow: (string | number | null)[] = [
      "POWC",
      ...months.map((_, idx) => {
        const isLastMonth = idx === months.length - 1;
        if (!isLastMonth) {
          const rounded = roundToWhole(detail.powcTotal[idx] || 0);
          return rounded > 0 ? rounded : null;
        }
        const prevDisplayedSum = months
          .slice(0, idx)
          .reduce(
            (sum, _, prevIdx) =>
              sum + roundToWhole(detail.powcTotal[prevIdx] || 0),
            0
          );
        const plugged = roundToWhole(powcTargetDisplayed - prevDisplayedSum);
        return plugged > 0 ? plugged : null;
      }),
      powcTargetDisplayed,
    ];
    const powcSubRows = detail.powcLines.map((row) =>
      seriesRow(`  ${row.label}`, row.monthly, row.total)
    );

    const displayBreakdown = buildDisplayedMonthlyTotalBreakdown(
      detail,
      cashOutflows,
      constructionSeries,
      constructionPeriod,
      constructionTotalDisplayed
    );

    const monthlyGrand = displayBreakdown.reduce((s, b) => s + b.total, 0);

    const monthlyTotalRow: (string | number | null)[] = [
      "Monthly Total",
      ...displayBreakdown.map((b) => (b.total > 0 ? b.total : null)),
      monthlyGrand,
    ];

    const cumulativeRow: (string | number | null)[] = [
      "Cumulative",
      ...(() => {
        let running = 0;
        return displayBreakdown.map((b) => {
          running += b.total;
          return running > 0 ? running : null;
        });
      })(),
      monthlyGrand,
    ];

    return [
      header,
      landRow,
      constructionRow,
      softTotalRow,
      ...softSubRows,
      powcTotalRow,
      ...powcSubRows,
      monthlyTotalRow,
      cumulativeRow,
    ];
  }, [
    detail,
    cashOutflows,
    constructionSeries,
    constructionPeriod,
    constructionTotalDisplayed,
  ]);

  const csvExportRows = useMemo(() => {
    const monthlyBlock =
      exportRows.length === 0
        ? step13MetaRows
        : [...step13MetaRows, ...exportRows];
    return monthlyBlock;
  }, [step13MetaRows, exportRows]);

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
            Monthly Cash Outflows ({currencyCode})
          </h2>

          {detail.months.length === 0 ? (
            <p className="text-sm text-slate-400">
              Set a positive construction period and generate the model in
              Component 1 to see the monthly cash flow profile.
            </p>
          ) : (
            <table className="min-w-[1200px] w-full">
              <thead>
                <>
                  <tr>
                    <th className="sticky left-0 min-w-[150px] border-b border-slate-700 bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Cost Item
                    </th>
                    {detail.months.map((month) => (
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

                    {detail.stages.map((stage, stageIndex) => (
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
              </thead>
              <tbody>
                <PreviewSeriesRow
                  label="Land Cost"
                  monthsLen={detail.months.length}
                  getCell={(idx) =>
                    idx === 0
                      ? formatNumber(cashOutflows.landCost)
                      : "—"
                  }
                  totalFormatted={formatNumber(cashOutflows.landCost)}
                  rowClass="border-t border-slate-700"
                />

                <PreviewSeriesRow
                  label="Construction Cost"
                  monthsLen={detail.months.length}
                  getCell={(idx) => {
                    const m = detail.months[idx] ?? 0;
                    const isLastConstructionMonth = m === constructionPeriod;

                    if (!isLastConstructionMonth) {
                      const base = roundToWhole(constructionSeries[m] || 0);
                      return base > 0 ? formatNumber(base) : "—";
                    }

                    const prevDisplayedSum = detail.months
                      .slice(0, idx)
                      .reduce((sum, prevM) => {
                        const prevRounded = roundToWhole(constructionSeries[prevM] || 0);
                        return sum + (prevRounded || 0);
                      }, 0);
                    const plugged = roundToWhole(
                      constructionTotalDisplayed - prevDisplayedSum
                    );

                    return plugged > 0 ? formatNumber(plugged) : "—";
                  }}
                  totalFormatted={formatNumber(constructionTotalDisplayed)}
                  rowClass="border-t border-slate-700"
                />

                <PreviewSeriesRow
                  label="Soft Costs"
                  monthsLen={detail.months.length}
                  getCell={(idx) =>
                    formatNumber(detail.softCostsTotal[idx])
                  }
                  totalFormatted={formatNumber(
                    cashOutflows.softCosts || 0
                  )}
                  rowClass="border-t-2 border-slate-600"
                />

                {detail.softCostLines.map((row) => (
                  <PreviewSeriesRow
                    key={row.key}
                    label={row.label}
                    monthsLen={detail.months.length}
                    indent
                    getCell={(idx) => {
                      const v = roundToWhole(row.monthly[idx] || 0);
                      return v > 0 ? formatNumber(v) : "—";
                    }}
                    totalFormatted={formatNumber(row.total)}
                    rowClass="border-t border-slate-700/80"
                  />
                ))}

                <tr className="border-t-2 border-slate-600">
                  <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200">
                    POWC
                  </td>
                  {detail.months.map((_, idx) => {
                    const isLastMonth = idx === detail.months.length - 1;
                    const powcTarget = roundToWhole(cashOutflows.powc || 0);

                    if (!isLastMonth) {
                      const rounded = roundToWhole(detail.powcTotal[idx] || 0);
                      return (
                        <td
                          key={idx}
                          className="border-r border-slate-700/50 px-2 py-3 text-center text-xs text-slate-400"
                        >
                          {rounded > 0 ? formatNumber(rounded) : "—"}
                        </td>
                      );
                    }

                    const prevDisplayedSum = detail.months
                      .slice(0, idx)
                      .reduce((sum, _, prevIdx) => {
                        return (
                          sum +
                          (roundToWhole(detail.powcTotal[prevIdx] || 0) || 0)
                        );
                      }, 0);

                    const plugged = roundToWhole(
                      powcTarget - prevDisplayedSum
                    );

                    return (
                      <td
                        key={idx}
                        className="border-r border-slate-700/50 px-2 py-3 text-center text-xs text-slate-400"
                      >
                        {plugged > 0
                          ? formatNumber(plugged)
                          : "—"}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right text-sm font-semibold text-red-400">
                    {formatNumber(roundToWhole(cashOutflows.powc || 0))}
                  </td>
                </tr>

                {detail.powcLines.map((row) => (
                  <PreviewSeriesRow
                    key={row.key}
                    label={row.label}
                    monthsLen={detail.months.length}
                    indent
                    getCell={(idx) => {
                      const v = roundToWhole(row.monthly[idx] || 0);
                      return v > 0 ? formatNumber(v) : "—";
                    }}
                    totalFormatted={formatNumber(row.total)}
                    rowClass="border-t border-slate-700/80"
                  />
                ))}

                {/* --- Monthly Total: sum of displayed Land + Construction (plugged) + Soft + POWC (plugged) --- */}
                <tr className="border-t border-slate-700 bg-slate-900/50">
                  <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white">
                    Monthly Total
                  </td>
                  {displayedMonthlyTotals.map((b, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-700/50 px-2 py-3 text-center text-xs font-medium text-white"
                    >
                      {b.total > 0
                        ? previewTableNumberFmt.format(b.total)
                        : "—"}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-400">
                    {previewTableNumberFmt.format(displayedGrandTotal)}
                  </td>
                </tr>

                {/* --- Cumulative: running sum of displayed monthly totals above --- */}
                <tr className="border-t border-slate-700">
                  <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white">
                    Cumulative
                  </td>
                  {(() => {
                    let running = 0;
                    return displayedMonthlyTotals.map((b, idx) => {
                      running += b.total;
                      return (
                        <td
                          key={idx}
                          className="border-r border-slate-700/50 px-2 py-3 text-center text-xs font-medium text-emerald-400"
                        >
                          {running > 0
                            ? previewTableNumberFmt.format(running)
                            : "—"}
                        </td>
                      );
                    });
                  })()}
                  <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-400">
                    {previewTableNumberFmt.format(displayedGrandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/30 p-4">
          <p className="text-sm text-slate-400">
            <span className="text-lg">ℹ️</span> Construction spend is spread
            uniformly within each Step 12 stage across M1–M
            {cashOutflows.constructionPeriod}. Stage headers:{" "}
            {cashOutflows.stageAllocation.stage1Label} (
            {cashOutflows.stageAllocation.stage1Percent}%) →{" "}
            {cashOutflows.stageAllocation.stage2Label} (
            {cashOutflows.stageAllocation.stage2Percent}%) →{" "}
            {cashOutflows.stageAllocation.stage3Label} (
            {cashOutflows.stageAllocation.stage3Percent}
            %) →{" "}
            {cashOutflows.stageAllocation.stage4Label} (
            {cashOutflows.stageAllocation.stage4Percent}
            %). Site / overhead POWC follow standard Step 13 timing; authority
            fees in this preview use 50% in M0+M1 (half each) and 50% over the
            last three construction months. Soft costs (total and each Step 13
            line) use 50% M0, 30% M1, 20% M2. No FFE in the Sale stream.
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
                  const sheets = [
                    {
                      sheetName: "Step 13 inputs",
                      data: step13MetaRows,
                    },
                    { sheetName: "Monthly", data: monthlySheet },
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

function PreviewSeriesRow({
  label,
  monthsLen,
  getCell,
  totalFormatted,
  rowClass,
  indent,
  strong,
}: {
  label: string;
  monthsLen: number;
  getCell: (idx: number) => string;
  totalFormatted: string;
  rowClass?: string;
  indent?: boolean;
  strong?: boolean;
}) {
  const labelCls = `sticky left-0 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm ${
    indent
      ? "pl-8 text-slate-400"
      : strong
        ? "font-semibold text-white"
        : "font-medium text-slate-200"
  }`;
  const cellNum = strong
    ? "border-r border-slate-700/50 px-2 py-3 text-center text-xs font-medium text-white"
    : "border-r border-slate-700/50 px-2 py-3 text-center text-xs text-slate-400";
  const cellTotal = strong
    ? "px-4 py-3 text-right text-sm font-semibold text-emerald-400"
    : "px-4 py-3 text-right text-sm font-medium text-slate-200";

  return (
    <tr className={rowClass}>
      <td className={labelCls}>{label}</td>
      {Array.from({ length: monthsLen }, (_, idx) => (
        <td key={idx} className={cellNum}>
          {getCell(idx)}
        </td>
      ))}
      <td className={cellTotal}>{totalFormatted}</td>
    </tr>
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
  if (!value || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}
