"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import { exportToCSV } from "@/lib/downloads/exportToCSV";
import { exportToExcel } from "@/lib/downloads/exportToExcel";
import {
  buildPnlExportRows,
  computeOperationalHotelHoldPnl,
  type OperationalPnlComputed,
} from "@/lib/operational-pnl";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";
import BenchmarkProfile from "@/components/BenchmarkProfile";
import useFinModelStore from "@/store/useFinModelStore";
import {
  PnlTableRenderer,
  type PnlRow,
} from "./shared/PnlTableRenderer";

function buildHotelPnlRows(
  pnl: OperationalPnlComputed,
  incomeGrowthPct: (number | null)[],
  years: number
): PnlRow[] {
  const yearIndices = Array.from({ length: years }, (_, i) => i);

  const line = (
    label: string,
    values: number[],
    opts?: Partial<PnlRow>
  ): PnlRow => ({
    label,
    values,
    ...opts,
  });

  const subtotal = (label: string, values: number[]): PnlRow => ({
    label,
    values,
    isSubtotal: true,
  });

  const total = (
    label: string,
    values: number[],
    tone: NonNullable<PnlRow["tone"]>
  ): PnlRow => ({
    label,
    values,
    isBold: true,
    tone,
  });

  return [
    { group: "REVENUE", values: [], isGroupHeader: true, tone: "emerald" },
    line("Room revenue", pnl.revenueByStream.rooms),
    line("Food revenue", pnl.revenueByStream.food),
    line("Beverage revenue", pnl.revenueByStream.beverage),
    subtotal(
      "Sub-total F&B revenue",
      yearIndices.map(
        (i) =>
          (pnl.revenueByStream.food[i] ?? 0) +
          (pnl.revenueByStream.beverage[i] ?? 0)
      )
    ),
    line("Room service", pnl.revenueByStream.roomService),
    line("Telecom", pnl.revenueByStream.telecom),
    line("Spa, health & leisure", pnl.revenueByStream.spaHealth),
    line("Rental & other", pnl.revenueByStream.rentalOther),
    subtotal(
      "Sub-total other operating revenue",
      yearIndices.map(
        (i) =>
          (pnl.revenueByStream.roomService[i] ?? 0) +
          (pnl.revenueByStream.telecom[i] ?? 0) +
          (pnl.revenueByStream.spaHealth[i] ?? 0) +
          (pnl.revenueByStream.rentalOther[i] ?? 0)
      )
    ),
    total("TOTAL REVENUE", pnl.totalHotelRevenue, "emerald"),

    { values: [], isSpacer: true },

    { group: "EXPENSES", values: [], isGroupHeader: true, tone: "rose" },
    line("Rooms — payroll", pnl.directCostsByYear.roomsPayroll, { indent: true }),
    line("Rooms — other", pnl.directCostsByYear.roomsOther, { indent: true }),
    line("Food — cost of sales", pnl.directCostsByYear.foodCostOfSale, {
      indent: true,
    }),
    line("Beverage — cost of sales", pnl.directCostsByYear.beverageCostOfSale, {
      indent: true,
    }),
    line("F&B — payroll", pnl.directCostsByYear.fbPayroll, { indent: true }),
    line("F&B — other", pnl.directCostsByYear.fbOther, { indent: true }),
    line("Telecom", pnl.directCostsByYear.telecomCost, { indent: true }),
    line("Spa & health", pnl.directCostsByYear.healthLeisureCost, {
      indent: true,
    }),
    line("Rental & other depts.", pnl.directCostsByYear.otherDeptsCost, {
      indent: true,
    }),
    subtotal("Sub-total direct costs", pnl.totalDirectCosts),
    line("G&A", pnl.ga, { indent: true }),
    line("Marketing & sales", pnl.marketingSales, { indent: true }),
    line("Property operations & maintenance", pnl.propertyOpsMaintenance, {
      indent: true,
    }),
    line("Utilities", pnl.utilities, { indent: true }),
    line("Base management fee", pnl.baseManagementFee, { indent: true }),
    line("Incentive fee", pnl.incentiveFee, { indent: true }),
    line("Renovation provision", pnl.renovationProvision, { indent: true }),
    subtotal(
      "Sub-total undistributed & fixed",
      yearIndices.map(
        (i) => (pnl.undistributedFour[i] ?? 0) + (pnl.fixedThree[i] ?? 0)
      )
    ),
    total("TOTAL EXPENSES", pnl.totalExpenses, "rose"),

    { values: [], isSpacer: true },

    total("EBITDA", pnl.ebitda, "sky"),

    {
      group: "Depreciation & amortisation",
      values: [],
      isSectionHeader: true,
    },
    line("Construction", pnl.depreciationConstruction, {
      indent: true,
      muted: true,
    }),
    line("FFE", pnl.depreciationFfe, { indent: true, muted: true }),

    total("EBIT", pnl.ebit, "indigo"),
    total("Net income / loss (preview)", pnl.netIncome, "net"),

    {
      label: "YoY net income growth",
      values: incomeGrowthPct,
      isPercent: true,
    },
  ];
}

export default function HotelPnlTable() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);

  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const snapshot = useFinModelStore((s) => s[finStream].hotelHoldSnapshot);

  const currencyCode = projectInfo.currency || "AED";

  const pnl = useMemo(() => {
    if (!snapshot) return null;
    return computeOperationalHotelHoldPnl(
      snapshot,
      cashOutflows.constructionCost || 0,
      cashOutflows.ffe || 0
    );
  }, [snapshot, cashOutflows.constructionCost, cashOutflows.ffe]);

  const incomeGrowthPct = useMemo(() => {
    if (!pnl) return [];
    return pnl.netIncome.map((income, i) => {
      if (i === 0) return null;
      const prev = pnl.netIncome[i - 1] ?? 0;
      if (prev === 0) return null;
      return ((income - prev) / Math.abs(prev)) * 100;
    });
  }, [pnl]);

  const tableRows = useMemo(() => {
    if (!pnl) return [];
    return buildHotelPnlRows(
      pnl,
      incomeGrowthPct,
      OPERATIONAL_ROOM_REVENUE_YEARS
    );
  }, [pnl, incomeGrowthPct]);

  const fmtMoney = useCallback(
    (n: number) =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      }).format(Math.round(n)),
    []
  );

  const exportRows = useMemo(() => {
    if (!pnl) return [];
    return buildPnlExportRows(pnl, currencyCode);
  }, [pnl, currencyCode]);

  const handleExportExcel = useCallback(() => {
    if (!exportRows.length) return;
    const city = projectInfo.city?.replace(/\s+/g, "_") || "project";
    exportToExcel({
      fileName: `operational_pnl_${city}`,
      sheets: [{ sheetName: "P&L", data: exportRows }],
    });
  }, [exportRows, projectInfo.city]);

  const handleExportCsv = useCallback(() => {
    if (!exportRows.length) return;
    const city = projectInfo.city?.replace(/\s+/g, "_") || "project";
    exportToCSV({
      filename: `operational_pnl_${city}.csv`,
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
          {!snapshot ? (
            <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
              No saved inputs yet. Open{" "}
              <strong>Operating Financials</strong> (cash inflows) so Steps 1–5
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
              {pnl ? fmtMoney(pnl.totalHotelRevenue[0] ?? 0) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="mb-1 text-xs text-slate-400">Y1 EBITDA</p>
            <p className="text-lg font-semibold text-emerald-400">
              {pnl ? fmtMoney(pnl.ebitda[0] ?? 0) : "—"}
            </p>
          </div>
        </div>

        {pnl ? (
          <PnlTableRenderer
            rows={tableRows}
            years={OPERATIONAL_ROOM_REVENUE_YEARS}
            assetType="hotel"
            currencyCode={currencyCode}
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
              disabled={!pnl}
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
              disabled={!pnl}
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
          "/cash-inflows?step=5"
        )}
        nextRoute={withStreamPrefix(streamPrefix, "/project-irr")}
        nextLabel="Next →"
      />
    </div>
  );
}
