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
  resolveDataCentrePnlSeries,
  type DataCentrePnlSeries,
} from "@/lib/data-centre-pnl-series";
import {
  PnlTableRenderer,
  type PnlRow,
} from "./shared/PnlTableRenderer";

export type { DataCentrePnlSeries };
export { resolveDataCentrePnlSeries };

const YEARS = OPERATIONAL_ROOM_REVENUE_YEARS;

function buildDataCentrePnlRows(series: DataCentrePnlSeries): PnlRow[] {
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

  const daLines: PnlRow[] = [
    line("Building Depreciation", series.buildingDep, { muted: true }),
    line("M&E Depreciation", series.meDep, { muted: true }),
  ];
  if (series.includeIT) {
    daLines.push(
      line("IT Hardware Depreciation", series.itDep, { muted: true })
    );
  }
  daLines.push(
    line("FF&E Reserve", series.ffeReserve, { muted: true }),
    {
      label: "TOTAL D&A",
      values: series.totalDa,
      isSubtotal: true,
    }
  );

  return [
    { group: "REVENUE", values: [], isGroupHeader: true, tone: "emerald" },
    line("Power Capacity Revenue", series.powerRevenue),
    line("Space Revenue", series.spaceRevenue),
    {
      label: "Total Primary Revenue",
      values: series.totalPrimaryRevenue,
      isSubtotal: true,
    },
    line("Cross-Connect Fees", series.crossConnect),
    line("Metered Power", series.meteredPower),
    line("Maintenance Markup", series.maintenanceMarkup),
    line("Installation Fees", series.installation),
    {
      label: "Total Other Income",
      values: series.totalOtherIncome,
      isSubtotal: true,
    },
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
    line("Power Cost", series.powerCost),
    line("Maintenance & Repairs", series.maintenance),
    line("Labor & Staffing", series.labor),
    line("Insurance", series.insurance),
    line("Property Tax", series.propertyTax),
    line("Security", series.security),
    line("Water & Utilities", series.waterUtilities),
    line("G&A", series.gAndA),
    line("Management Fee", series.mgmtFee),
    {
      label: "TOTAL OPEX",
      values: series.totalOpEx,
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
    ...daLines,

    { values: [], isSpacer: true },

    { group: "NET INCOME", values: [], isGroupHeader: true },
    {
      label: "EBIT (Operating Profit)",
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

function buildDataCentrePnlExportRows(
  series: DataCentrePnlSeries,
  currencyCode: string
): (string | number)[][] {
  const Y = (arr: number[]) => arr.slice(0, YEARS).map((n) => Math.round(n));

  const daExport: (string | number)[][] = [
    ["Building Depreciation", ...Y(series.buildingDep)],
    ["M&E Depreciation", ...Y(series.meDep)],
  ];
  if (series.includeIT) {
    daExport.push(["IT Hardware Depreciation", ...Y(series.itDep)]);
  }
  daExport.push(
    ["FF&E Reserve", ...Y(series.ffeReserve)],
    ["TOTAL D&A", ...Y(series.totalDa)]
  );

  return [
    [`Data Centre Operating P&L — ${currencyCode}`, ...Array(10).fill("")],
    ["", ...Array(10).fill("")],
    ["", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9", "Y10"],
    ["REVENUE", ...Array(10).fill("")],
    ["Power Capacity Revenue", ...Y(series.powerRevenue)],
    ["Space Revenue", ...Y(series.spaceRevenue)],
    ["Total Primary Revenue", ...Y(series.totalPrimaryRevenue)],
    ["Cross-Connect Fees", ...Y(series.crossConnect)],
    ["Metered Power", ...Y(series.meteredPower)],
    ["Maintenance Markup", ...Y(series.maintenanceMarkup)],
    ["Installation Fees", ...Y(series.installation)],
    ["Total Other Income", ...Y(series.totalOtherIncome)],
    ["TOTAL REVENUE", ...Y(series.totalRevenue)],
    ["", ...Array(10).fill("")],
    ["OPERATING EXPENSES", ...Array(10).fill("")],
    ["Power Cost", ...Y(series.powerCost)],
    ["Maintenance & Repairs", ...Y(series.maintenance)],
    ["Labor & Staffing", ...Y(series.labor)],
    ["Insurance", ...Y(series.insurance)],
    ["Property Tax", ...Y(series.propertyTax)],
    ["Security", ...Y(series.security)],
    ["Water & Utilities", ...Y(series.waterUtilities)],
    ["G&A", ...Y(series.gAndA)],
    ["Management Fee", ...Y(series.mgmtFee)],
    ["TOTAL OPEX", ...Y(series.totalOpEx)],
    ["", ...Array(10).fill("")],
    ["EBITDA", ...Y(series.ebitda)],
    ["", ...Array(10).fill("")],
    ["DEPRECIATION & AMORTIZATION", ...Array(10).fill("")],
    ...daExport,
    ["", ...Array(10).fill("")],
    ["EBIT (Operating Profit)", ...Y(series.ebit)],
    ["Net Income / Loss (preview)", ...Y(series.netIncome)],
  ];
}

export default function DataCentrePnlTable() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);

  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashInflows = useFinModelStore((s) => s[finStream].cashInflows);
  const currencyCode = projectInfo.currency || "AED";

  const series = useMemo(
    () =>
      resolveDataCentrePnlSeries({
        projectInfo,
        dataCentreRevenue: cashInflows?.dataCentreRevenue,
        dataCentreOtherIncome: cashInflows?.dataCentreOtherIncome,
        dataCentreOpEx: cashInflows?.dataCentreOpEx,
        dataCentreDepreciation: cashInflows?.dataCentreDepreciation,
      }),
    [
      projectInfo,
      cashInflows?.dataCentreRevenue,
      cashInflows?.dataCentreOtherIncome,
      cashInflows?.dataCentreOpEx,
      cashInflows?.dataCentreDepreciation,
    ]
  );

  const tableRows = useMemo(() => {
    if (!series) return [];
    return buildDataCentrePnlRows(series);
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
    return buildDataCentrePnlExportRows(series, currencyCode);
  }, [series, currencyCode]);

  const handleExportExcel = useCallback(() => {
    if (!exportRows.length) return;
    const city = projectInfo.city?.replace(/\s+/g, "_") || "project";
    exportToExcel({
      fileName: `operational_data_centre_pnl_${city}`,
      sheets: [{ sheetName: "P&L", data: exportRows }],
    });
  }, [exportRows, projectInfo.city]);

  const handleExportCsv = useCallback(() => {
    if (!exportRows.length) return;
    const city = projectInfo.city?.replace(/\s+/g, "_") || "project";
    exportToCSV({
      filename: `operational_data_centre_pnl_${city}.csv`,
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
    (cashInflows?.dataCentreRevenue?.totalAnnualRevenue ?? 0) > 0 ||
    (cashInflows?.dataCentreRevenue?.itLoadKw ?? 0) > 0;

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
            assetType="data_centre"
            currencyCode={currencyCode}
            title={`10-year data centre operating P&L (${currencyCode})`}
          />
        ) : (
          <div className="mb-6 overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/50 p-6 text-center text-sm text-slate-400">
            P&L will appear after inputs are synced from the cash inflows wizard.
          </div>
        )}

        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/30 p-4">
          <p className="text-sm text-slate-400">
            <span className="text-lg">ℹ️</span> Read-only preview. Interest and
            taxes are not applied (net income equals EBIT for this view). D&amp;A
            drops to 0 after each asset&apos;s useful life; FF&amp;E reserve
            escalates with revenue.
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
