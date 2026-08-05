"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import BenchmarkProfile from "@/components/BenchmarkProfile";
import { exportToCSV } from "@/lib/downloads/exportToCSV";
import { exportToExcel } from "@/lib/downloads/exportToExcel";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";
import useFinModelStore from "@/store/useFinModelStore";
import {
  resolveWarehouseCapexBases,
  resolveWarehousePnlSeries,
  type WarehousePnlSeries,
} from "@/lib/warehouse-pnl-series";
import {
  PnlTableRenderer,
  type PnlRow,
} from "./shared/PnlTableRenderer";

export type { WarehousePnlSeries };
export { resolveWarehousePnlSeries };

const YEARS = OPERATIONAL_ROOM_REVENUE_YEARS;

function buildWarehousePnlRows(series: WarehousePnlSeries): PnlRow[] {
  const line = (
    label: string,
    values: number[],
    opts?: Partial<PnlRow>
  ): PnlRow => ({ label, values, indent: true, ...opts });

  const incomeGrowthPct: (number | null)[] = series.netIncome.map(
    (income, i) => {
      if (i === 0) return null;
      const prev = series.netIncome[i - 1] ?? 0;
      if (prev === 0) return null;
      return ((income - prev) / Math.abs(prev)) * 100;
    }
  );

  return [
    { group: "REVENUE", values: [], isGroupHeader: true, tone: "emerald" },
    line("Base Rent", series.baseRent),
    line("Yard Revenue", series.yard),
    line("Parking Revenue", series.parking),
    line("CAM / Tax / Insurance Recoveries", series.camTax),
    line("Advertising / Signage", series.advertising),
    {
      label: "TOTAL REVENUE",
      values: series.totalRevenue,
      isBold: true,
      tone: "emerald",
    },

    { values: [], isSpacer: true },

    {
      group: "OPERATING EXPENSES",
      values: [],
      isGroupHeader: true,
      tone: "rose",
    },
    line("Property Tax", series.propertyTax),
    line("Insurance", series.insurance),
    line("Maintenance", series.maintenance),
    line("Landscaping", series.landscaping),
    line("Utilities", series.utilities),
    line("Security", series.security),
    line("Management Fee", series.mgmtFee),
    line("G&A", series.gAndA),
    {
      label: "TOTAL EXPENSES",
      values: series.totalExpenses,
      isBold: true,
      tone: "rose",
    },

    { values: [], isSpacer: true },

    {
      group: "NET OPERATING INCOME",
      values: [],
      isGroupHeader: true,
    },
    {
      label: "EBITDA",
      values: series.ebitda,
      isBold: true,
      tone: "sky",
      isCalculated: true,
    },

    { values: [], isSpacer: true },

    {
      group: "DEPRECIATION & AMORTIZATION",
      values: [],
      isGroupHeader: true,
    },
    line("Construction", series.buildingDep, { muted: true }),
    line("Site Improvements", series.siteDep, { muted: true }),
    line("FF&E", series.ffeDep, { muted: true }),
    {
      label: "TOTAL D&A",
      values: series.totalDa,
      isSubtotal: true,
    },

    { values: [], isSpacer: true },

    { group: "NET INCOME", values: [], isGroupHeader: true },
    {
      label: "EBIT",
      values: series.ebit,
      isBold: true,
      tone: "indigo",
      isCalculated: true,
    },
    {
      label: "Net Income / Loss (preview)",
      values: series.netIncome,
      isBold: true,
      tone: "net",
      isCalculated: true,
    },
    {
      label: "YoY Net Income Growth",
      values: incomeGrowthPct,
      isPercent: true,
      isCalculated: true,
    },
  ];
}

function buildWarehousePnlExportRows(
  series: WarehousePnlSeries,
  currencyCode: string
): (string | number)[][] {
  const Y = (arr: number[]) => arr.slice(0, YEARS).map((n) => Math.round(n));

  return [
    [`Warehouse Operating P&L — ${currencyCode}`, ...Array(10).fill("")],
    ["", ...Array(10).fill("")],
    ["", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9", "Y10"],
    ["REVENUE", ...Array(10).fill("")],
    ["Base Rent", ...Y(series.baseRent)],
    ["Yard Revenue", ...Y(series.yard)],
    ["Parking Revenue", ...Y(series.parking)],
    ["CAM / Tax / Insurance Recoveries", ...Y(series.camTax)],
    ["Advertising / Signage", ...Y(series.advertising)],
    ["TOTAL REVENUE", ...Y(series.totalRevenue)],
    ["", ...Array(10).fill("")],
    ["OPERATING EXPENSES", ...Array(10).fill("")],
    ["Property Tax", ...Y(series.propertyTax)],
    ["Insurance", ...Y(series.insurance)],
    ["Maintenance", ...Y(series.maintenance)],
    ["Landscaping", ...Y(series.landscaping)],
    ["Utilities", ...Y(series.utilities)],
    ["Security", ...Y(series.security)],
    ["Management Fee", ...Y(series.mgmtFee)],
    ["G&A", ...Y(series.gAndA)],
    ["TOTAL EXPENSES", ...Y(series.totalExpenses)],
    ["", ...Array(10).fill("")],
    ["EBITDA", ...Y(series.ebitda)],
    ["", ...Array(10).fill("")],
    ["DEPRECIATION & AMORTIZATION", ...Array(10).fill("")],
    ["Construction", ...Y(series.buildingDep)],
    ["Site Improvements", ...Y(series.siteDep)],
    ["FF&E", ...Y(series.ffeDep)],
    ["TOTAL D&A", ...Y(series.totalDa)],
    ["", ...Array(10).fill("")],
    ["EBIT", ...Y(series.ebit)],
    ["Net Income / Loss (preview)", ...Y(series.netIncome)],
  ];
}

export default function WarehousePnlTable() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);

  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const cashInflows = useFinModelStore((s) => s[finStream].cashInflows);
  const currencyCode = projectInfo.currency || "AED";

  const { buildingCost, siteImprovementsCost, ffeCost } =
    resolveWarehouseCapexBases(cashOutflows);

  const series = useMemo(
    () =>
      resolveWarehousePnlSeries({
        warehouseRevenue: cashInflows?.warehouseRevenue,
        warehouseOtherIncome: cashInflows?.warehouseOtherIncome,
        warehouseOpEx: cashInflows?.warehouseOpEx,
        warehouseDepreciation: cashInflows?.warehouseDepreciation,
        buildingCost,
        siteImprovementsCost,
        ffeCost,
      }),
    [
      cashInflows?.warehouseRevenue,
      cashInflows?.warehouseOtherIncome,
      cashInflows?.warehouseOpEx,
      cashInflows?.warehouseDepreciation,
      buildingCost,
      siteImprovementsCost,
      ffeCost,
    ]
  );

  const tableRows = useMemo(() => {
    if (!series) return [];
    return buildWarehousePnlRows(series);
  }, [series]);

  const fmtMoney = useCallback(
    (n: number) =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      }).format(Math.round(n)),
    []
  );

  const exportRows = useMemo(() => {
    if (!series) return [];
    return buildWarehousePnlExportRows(series, currencyCode);
  }, [series, currencyCode]);

  const handleExportExcel = useCallback(() => {
    if (!exportRows.length) return;
    const city = projectInfo.city?.replace(/\s+/g, "_") || "project";
    exportToExcel({
      fileName: `operational_warehouse_pnl_${city}`,
      sheets: [{ sheetName: "P&L", data: exportRows }],
    });
  }, [exportRows, projectInfo.city]);

  const handleExportCsv = useCallback(() => {
    if (!exportRows.length) return;
    const city = projectInfo.city?.replace(/\s+/g, "_") || "project";
    exportToCSV({
      filename: `operational_warehouse_pnl_${city}.csv`,
      rows: exportRows,
    });
  }, [exportRows, projectInfo.city]);

  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement | null>(null);

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

  const handleDownloadToggle = useCallback(() => {
    setDownloadOpen((v) => !v);
  }, []);

  const hasSyncedInputs =
    (cashInflows?.warehouseRevenue?.totalAnnualRevenue ?? 0) > 0 ||
    (cashInflows?.warehouseRevenue?.totalGfa ?? 0) > 0;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 pb-32 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-white">
            Operating profit & loss (P&L)
          </h1>
          <BenchmarkProfile />
          {!hasSyncedInputs ? (
            <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
              No saved inputs yet. Open{" "}
              <strong>Operating Financials</strong> (cash inflows) so Steps 1–4
              sync to the model, then return here.
            </p>
          ) : null}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="mb-1 text-xs text-slate-400">Horizon</p>
            <p className="text-lg font-semibold text-white">10 years</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="mb-1 text-xs text-slate-400">Display</p>
            <p className="text-lg font-semibold text-white">Full amounts</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="mb-1 text-xs text-slate-400">Y1 total revenue</p>
            <p className="text-lg font-semibold text-white">
              {series ? fmtMoney(series.totalRevenue[0] ?? 0) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="mb-1 text-xs text-slate-400">Y1 EBITDA</p>
            <p className="text-lg font-semibold text-emerald-400">
              {series ? fmtMoney(series.ebitda[0] ?? 0) : "—"}
            </p>
          </div>
        </div>

        {series ? (
          <PnlTableRenderer
            rows={tableRows}
            years={YEARS}
            assetType="warehouse"
            currencyCode={currencyCode}
            title={`10-year warehouse operating P&L (${currencyCode})`}
          />
        ) : (
          <div className="mb-6 overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/50 p-6 text-center text-sm text-slate-400">
            P&L will appear after inputs are synced from the cash inflows wizard.
          </div>
        )}

        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/30 p-4">
          <p className="text-sm text-slate-400">
            <span className="text-lg">ℹ️</span> Read-only preview. Interest and
            taxes are not applied (net income equals EBIT for this view).
          </p>
        </div>
      </div>

      {downloadOpen ? (
        <div
          ref={downloadRef}
          className="fixed bottom-24 left-4 right-4 z-50 rounded-xl border border-slate-700 bg-slate-800/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md md:left-1/2 md:right-auto md:w-[320px] md:-translate-x-1/2"
        >
          <p className="mb-2 text-xs font-medium text-slate-300">
            Download P&L as…
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!series}
              onClick={() => {
                handleExportExcel();
                setDownloadOpen(false);
              }}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Excel (.xlsx)
            </button>
            <button
              type="button"
              disabled={!series}
              onClick={() => {
                handleExportCsv();
                setDownloadOpen(false);
              }}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              CSV (.csv)
            </button>
          </div>
        </div>
      ) : null}

      <PreviewFloatingBar
        onDownload={handleDownloadToggle}
        previousRoute={withStreamPrefix(
          streamPrefix,
          "/cash-inflows?step=4"
        )}
        nextRoute={withStreamPrefix(streamPrefix, "/project-irr")}
        nextLabel="Next →"
      />
    </div>
  );
}
