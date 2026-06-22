"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import { exportToCSV } from "@/lib/downloads/exportToCSV";
import { exportToExcel } from "@/lib/downloads/exportToExcel";
import type { OperationalRetailHoldSnapshot } from "@/lib/operational-pnl";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";
import BenchmarkProfile from "@/components/BenchmarkProfile";
import useFinModelStore from "@/store/useFinModelStore";
import type {
  RetailDepreciationConfig,
  RetailOpexConfig,
} from "@/store/useFinModelStore";
import {
  PnlTableRenderer,
  type PnlRow,
} from "./shared/PnlTableRenderer";

const YEARS = OPERATIONAL_ROOM_REVENUE_YEARS;

export type RetailPnlSeries = {
  baseRent: number[];
  percentageRent: number[];
  recoveries: number[];
  parking: number[];
  advertising: number[];
  totalRevenue: number[];
  cam: number[];
  propertyInsurance: number[];
  marketingGa: number[];
  mgmtFee: number[];
  renovation: number[];
  totalExpenses: number[];
  ebitda: number[];
  constructionDep: number[];
  ffeDep: number[];
  tiAmort: number[];
  totalDa: number[];
  ebit: number[];
  netIncome: number[];
};

function yearValues(source: number[] | undefined, years = YEARS): number[] {
  return Array.from({ length: years }, (_, i) => source?.[i] ?? 0);
}

function resolveRetailPnlSeries(
  snap: OperationalRetailHoldSnapshot | undefined,
  retailOpex: RetailOpexConfig | undefined,
  retailDepreciation: RetailDepreciationConfig | undefined
): RetailPnlSeries | null {
  if (!snap?.revenueValues?.length) return null;

  const baseRent = yearValues(snap.revenueValues);

  const percentageRent = yearValues(snap.percentageRentValues);
  const recoveries = yearValues(snap.camRecoveryValues);
  const parking = yearValues(snap.parkingRevenueValues);
  const advertising = yearValues(snap.advertisingValues);

  const opexRows =
    retailOpex?.projection?.length === YEARS
      ? retailOpex.projection
      : Array.from({ length: YEARS }, (_, i) => ({
          cam: snap.opexCamValues?.[i] ?? 0,
          tax: snap.opexPropertyTaxValues?.[i] ?? 0,
          insurance: snap.opexInsuranceValues?.[i] ?? 0,
          marketing: snap.opexMarketingValues?.[i] ?? 0,
          gAndA: snap.opexGaValues?.[i] ?? 0,
          mgmtFee: snap.opexMgmtFeeValues?.[i] ?? 0,
          renovation: snap.opexRenovationValues?.[i] ?? 0,
        }));

  const cam = opexRows.map((r) => r.cam);
  const propertyInsurance = opexRows.map((r) => r.tax + r.insurance);
  const marketingGa = opexRows.map((r) => r.marketing + r.gAndA);
  const mgmtFee = opexRows.map((r) => r.mgmtFee);
  const renovation = opexRows.map((r) => r.renovation);
  const totalExpenses = opexRows.map(
    (r) => r.cam + r.tax + r.insurance + r.marketing + r.gAndA + r.mgmtFee + r.renovation
  );

  const totalRevenue = baseRent.map(
    (v, i) =>
      v +
      percentageRent[i] +
      recoveries[i] +
      parking[i] +
      advertising[i]
  );

  const ebitda = totalRevenue.map((rev, i) => rev - totalExpenses[i]);

  const deprRows =
    retailDepreciation?.projection?.length === YEARS
      ? retailDepreciation.projection.map((r) => ({
          constructionDep: r.constructionDep,
          ffeDep: r.ffeDep,
          tiAmort: r.tiAmort,
          leasingCommAmort: r.leasingCommAmort,
        }))
      : Array.from({ length: YEARS }, (_, i) => ({
          constructionDep: snap.depConstructionValues?.[i] ?? 0,
          ffeDep: snap.depFfeValues?.[i] ?? 0,
          tiAmort: snap.depTiValues?.[i] ?? 0,
          leasingCommAmort: snap.depLeasingCommValues?.[i] ?? 0,
        }));

  const constructionDep = deprRows.map((r) => r.constructionDep);
  const ffeDep = deprRows.map((r) => r.ffeDep);
  const tiAmort = deprRows.map((r) => r.tiAmort);
  const leasingCommAmort = deprRows.map((r) => r.leasingCommAmort);
  const totalDa = constructionDep.map(
    (v, i) => v + ffeDep[i] + tiAmort[i] + leasingCommAmort[i]
  );

  const ebit = ebitda.map((v, i) => v - totalDa[i]);
  const netIncome = [...ebit];

  return {
    baseRent,
    percentageRent,
    recoveries,
    parking,
    advertising,
    totalRevenue,
    cam,
    propertyInsurance,
    marketingGa,
    mgmtFee,
    renovation,
    totalExpenses,
    ebitda,
    constructionDep,
    ffeDep,
    tiAmort,
    totalDa,
    ebit,
    netIncome,
  };
}

function buildRetailPnlRows(series: RetailPnlSeries): PnlRow[] {
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
    line("Percentage Rent (Overage)", series.percentageRent),
    line("CAM & Tax Recoveries", series.recoveries),
    line("Parking Income", series.parking),
    line("Advertising, Kiosk & Events", series.advertising),
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
    line("CAM", series.cam),
    line("Property & Insurance", series.propertyInsurance),
    line("Marketing & G&A", series.marketingGa),
    line("Management Fee", series.mgmtFee),
    line("Renovation Provision", series.renovation),
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
    line("Construction", series.constructionDep, { muted: true }),
    line("FFE", series.ffeDep, { muted: true }),
    line("TI Allowance", series.tiAmort, { muted: true }),
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

function buildRetailPnlExportRows(
  series: RetailPnlSeries,
  currencyCode: string
): (string | number)[][] {
  const Y = (arr: number[]) =>
    arr.slice(0, YEARS).map((n) => Math.round(n));

  return [
    [`Retail Operating P&L — ${currencyCode}`, ...Array(10).fill("")],
    ["", ...Array(10).fill("")],
    ["", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9", "Y10"],
    ["REVENUE", ...Array(10).fill("")],
    ["Base Rent", ...Y(series.baseRent)],
    ["Percentage Rent (Overage)", ...Y(series.percentageRent)],
    ["CAM & Tax Recoveries", ...Y(series.recoveries)],
    ["Parking Income", ...Y(series.parking)],
    ["Advertising, Kiosk & Events", ...Y(series.advertising)],
    ["TOTAL REVENUE", ...Y(series.totalRevenue)],
    ["", ...Array(10).fill("")],
    ["OPERATING EXPENSES", ...Array(10).fill("")],
    ["CAM", ...Y(series.cam)],
    ["Property & Insurance", ...Y(series.propertyInsurance)],
    ["Marketing & G&A", ...Y(series.marketingGa)],
    ["Management Fee", ...Y(series.mgmtFee)],
    ["Renovation Provision", ...Y(series.renovation)],
    ["TOTAL EXPENSES", ...Y(series.totalExpenses)],
    ["", ...Array(10).fill("")],
    ["EBITDA", ...Y(series.ebitda)],
    ["", ...Array(10).fill("")],
    ["DEPRECIATION & AMORTIZATION", ...Array(10).fill("")],
    ["Construction", ...Y(series.constructionDep)],
    ["FFE", ...Y(series.ffeDep)],
    ["TI Allowance", ...Y(series.tiAmort)],
    ["TOTAL D&A", ...Y(series.totalDa)],
    ["", ...Array(10).fill("")],
    ["EBIT", ...Y(series.ebit)],
    ["Net Income / Loss (preview)", ...Y(series.netIncome)],
  ];
}

export default function RetailPnlTable() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);

  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const snap = useFinModelStore((s) => s[finStream].retailHoldSnapshot);
  const retailOpex = projectInfo.retailOpex;
  const retailDepreciation = projectInfo.retailDepreciation;

  const currencyCode = projectInfo.currency || "AED";

  const series = useMemo(
    () => resolveRetailPnlSeries(snap, retailOpex, retailDepreciation),
    [snap, retailOpex, retailDepreciation]
  );

  const tableRows = useMemo(() => {
    if (!series) return [];
    return buildRetailPnlRows(series);
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
    return buildRetailPnlExportRows(series, currencyCode);
  }, [series, currencyCode]);

  const handleExportExcel = useCallback(() => {
    if (!exportRows.length) return;
    const city = projectInfo.city?.replace(/\s+/g, "_") || "project";
    exportToExcel({
      fileName: `operational_retail_pnl_${city}`,
      sheets: [{ sheetName: "P&L", data: exportRows }],
    });
  }, [exportRows, projectInfo.city]);

  const handleExportCsv = useCallback(() => {
    if (!exportRows.length) return;
    const city = projectInfo.city?.replace(/\s+/g, "_") || "project";
    exportToCSV({
      filename: `operational_retail_pnl_${city}.csv`,
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

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 pb-32 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-white">
            Operating profit & loss (P&L)
          </h1>
          <BenchmarkProfile />
          {!snap?.revenueValues?.length ? (
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
            assetType="retail"
            currencyCode={currencyCode}
            title={`10-year retail operating P&L (${currencyCode})`}
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
