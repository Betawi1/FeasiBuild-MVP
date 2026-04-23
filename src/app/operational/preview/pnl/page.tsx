"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import { exportToCSV } from "@/lib/downloads/exportToCSV";
import { exportToExcel } from "@/lib/downloads/exportToExcel";
import {
  buildPnlExportRows,
  computeOperationalHotelHoldPnl,
} from "@/lib/operational-pnl";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";
import useFinModelStore from "@/store/useFinModelStore";

const COLS = 2 + OPERATIONAL_ROOM_REVENUE_YEARS;

function sumYearValues(values: number[]) {
  return values
    .slice(0, OPERATIONAL_ROOM_REVENUE_YEARS)
    .reduce((a, b) => a + b, 0);
}

export default function OperationalPnlPreviewPage() {
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

  const fmtMoney = useCallback(
    (n: number) =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      }).format(Math.round(n)),
    []
  );

  const fmtPct = (v: number | null) =>
    v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

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

  const yearIndices = useMemo(
    () => Array.from({ length: OPERATIONAL_ROOM_REVENUE_YEARS }, (_, i) => i),
    []
  );

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 pb-32 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-white">
            Operating profit & loss (P&L)
          </h1>
          <p className="text-sm text-slate-400">
            Project: {projectInfo.city || "—"},{" "}
            {projectInfo.country || "—"} • Currency: {currencyCode} • 10-year
            projection (Component 2, Steps 1–5)
          </p>
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
              {pnl
                ? fmtMoney(pnl.totalHotelRevenue[0] ?? 0)
                : "—"}
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
          <div className="mb-6 overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              10-year operating P&L ({currencyCode})
            </h2>
            <table className="min-w-[1220px] w-full">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[180px] border-b border-slate-700 bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Line item
                    </th>
                    {yearIndices.map((i) => (
                      <th
                        key={i}
                        className="min-w-[100px] border-b border-slate-700 px-3 py-3 text-right text-sm font-semibold text-slate-300 tabular-nums"
                      >
                        Y{i + 1}
                      </th>
                    ))}
                    <th className="min-w-[100px] border-b border-l border-slate-700 px-3 py-3 text-right text-sm font-semibold text-slate-300 tabular-nums">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-700 bg-slate-900/50">
                    <td
                      colSpan={COLS}
                      className="px-4 py-3 text-sm font-semibold text-emerald-400"
                    >
                      REVENUE
                    </td>
                  </tr>
                  <PnLRow
                    label="Room revenue"
                    values={pnl.revenueByStream.rooms}
                    fmt={fmtMoney}
                  />
                  <PnLRow
                    label="Food revenue"
                    values={pnl.revenueByStream.food}
                    fmt={fmtMoney}
                  />
                  <PnLRow
                    label="Beverage revenue"
                    values={pnl.revenueByStream.beverage}
                    fmt={fmtMoney}
                  />
                  <PnLSubRow
                    label="Sub-total F&B revenue"
                    values={yearIndices.map(
                      (i) =>
                        (pnl.revenueByStream.food[i] ?? 0) +
                        (pnl.revenueByStream.beverage[i] ?? 0)
                    )}
                    fmt={fmtMoney}
                  />
                  <PnLRow
                    label="Room service"
                    values={pnl.revenueByStream.roomService}
                    fmt={fmtMoney}
                  />
                  <PnLRow
                    label="Telecom"
                    values={pnl.revenueByStream.telecom}
                    fmt={fmtMoney}
                  />
                  <PnLRow
                    label="Spa, health & leisure"
                    values={pnl.revenueByStream.spaHealth}
                    fmt={fmtMoney}
                  />
                  <PnLRow
                    label="Rental & other"
                    values={pnl.revenueByStream.rentalOther}
                    fmt={fmtMoney}
                  />
                  <PnLSubRow
                    label="Sub-total other operating revenue"
                    values={yearIndices.map(
                      (i) =>
                        (pnl.revenueByStream.roomService[i] ?? 0) +
                        (pnl.revenueByStream.telecom[i] ?? 0) +
                        (pnl.revenueByStream.spaHealth[i] ?? 0) +
                        (pnl.revenueByStream.rentalOther[i] ?? 0)
                    )}
                    fmt={fmtMoney}
                  />
                  <PnLTotalRow
                    label="TOTAL REVENUE"
                    values={pnl.totalHotelRevenue}
                    fmt={fmtMoney}
                    tone="emerald"
                  />

                  <tr className="border-t border-slate-700">
                    <td colSpan={COLS} className="h-2 bg-slate-950/40 p-0" />
                  </tr>

                  <tr className="border-t border-slate-700 bg-slate-900/50">
                    <td
                      colSpan={COLS}
                      className="px-4 py-3 text-sm font-semibold text-rose-400"
                    >
                      EXPENSES
                    </td>
                  </tr>
                  <PnLRow
                    label="Rooms — payroll"
                    values={pnl.directCostsByYear.roomsPayroll}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="Rooms — other"
                    values={pnl.directCostsByYear.roomsOther}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="Food — cost of sales"
                    values={pnl.directCostsByYear.foodCostOfSale}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="Beverage — cost of sales"
                    values={pnl.directCostsByYear.beverageCostOfSale}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="F&B — payroll"
                    values={pnl.directCostsByYear.fbPayroll}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="F&B — other"
                    values={pnl.directCostsByYear.fbOther}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="Telecom"
                    values={pnl.directCostsByYear.telecomCost}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="Spa & health"
                    values={pnl.directCostsByYear.healthLeisureCost}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="Rental & other depts."
                    values={pnl.directCostsByYear.otherDeptsCost}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLSubRow
                    label="Sub-total direct costs"
                    values={pnl.totalDirectCosts}
                    fmt={fmtMoney}
                  />
                  <PnLRow
                    label="G&A"
                    values={pnl.ga}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="Marketing & sales"
                    values={pnl.marketingSales}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="Property operations & maintenance"
                    values={pnl.propertyOpsMaintenance}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="Utilities"
                    values={pnl.utilities}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="Base management fee"
                    values={pnl.baseManagementFee}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="Incentive fee"
                    values={pnl.incentiveFee}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLRow
                    label="Renovation provision"
                    values={pnl.renovationProvision}
                    fmt={fmtMoney}
                    indent
                  />
                  <PnLSubRow
                    label="Sub-total undistributed & fixed"
                    values={yearIndices.map(
                      (i) =>
                        (pnl.undistributedFour[i] ?? 0) +
                        (pnl.fixedThree[i] ?? 0)
                    )}
                    fmt={fmtMoney}
                  />
                  <PnLTotalRow
                    label="TOTAL EXPENSES"
                    values={pnl.totalExpenses}
                    fmt={fmtMoney}
                    tone="rose"
                  />

                  <tr className="border-t border-slate-700">
                    <td colSpan={COLS} className="h-2 bg-slate-950/40 p-0" />
                  </tr>

                  <PnLTotalRow
                    label="EBITDA"
                    values={pnl.ebitda}
                    fmt={fmtMoney}
                    tone="sky"
                  />

                  <tr className="border-t border-slate-700 bg-slate-900/40">
                    <td
                      colSpan={COLS}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Depreciation & amortisation
                    </td>
                  </tr>
                  <PnLRow
                    label="Construction"
                    values={pnl.depreciationConstruction}
                    fmt={fmtMoney}
                    indent
                    muted
                  />
                  <PnLRow
                    label="FFE"
                    values={pnl.depreciationFfe}
                    fmt={fmtMoney}
                    indent
                    muted
                  />

                  <PnLTotalRow
                    label="EBIT"
                    values={pnl.ebit}
                    fmt={fmtMoney}
                    tone="indigo"
                  />
                  <PnLTotalRow
                    label="Net income / loss (preview)"
                    values={pnl.netIncome}
                    fmt={fmtMoney}
                    tone="net"
                  />
                  <tr className="border-t border-slate-700">
                    <td className="sticky left-0 z-10 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-400">
                      YoY net income growth
                    </td>
                    <td className="border-r border-slate-700/50 px-3 py-3 text-right text-sm text-slate-500 tabular-nums">
                      —
                    </td>
                    {incomeGrowthPct.slice(1).map((g, i) => (
                      <td
                        key={i}
                        className={`border-r border-slate-700/50 px-3 py-3 text-right text-sm tabular-nums ${
                          g == null
                            ? "text-slate-500"
                            : g >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                        }`}
                      >
                        {fmtPct(g)}
                      </td>
                    ))}
                    <td className="border-l border-r border-slate-700/50 px-3 py-3 text-right text-sm text-slate-500 tabular-nums">
                      —
                    </td>
                  </tr>
                </tbody>
              </table>
          </div>
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

const cellFirst =
  "sticky left-0 z-10 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200";
const cellNum =
  "border-r border-slate-700/50 px-3 py-3 text-right text-sm tabular-nums text-slate-300";
const cellNumMuted =
  "border-r border-slate-700/50 px-3 py-3 text-right text-sm tabular-nums text-slate-400";

const cellTotal =
  "border-l border-r border-slate-700/50 px-3 py-3 text-right text-sm tabular-nums text-slate-300";
const cellTotalMuted =
  "border-l border-r border-slate-700/50 px-3 py-3 text-right text-sm tabular-nums text-slate-400";

function PnLRow({
  label,
  values,
  fmt,
  indent,
  muted,
}: {
  label: ReactNode;
  values: number[];
  fmt: (n: number) => string;
  indent?: boolean;
  muted?: boolean;
}) {
  return (
    <tr className="border-t border-slate-700 transition-colors hover:bg-slate-800/30">
      <td
        className={`${cellFirst} ${indent ? "pl-8" : ""} ${muted ? "text-slate-400" : ""}`}
      >
        {label}
      </td>
      {values.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS).map((v, i) => (
        <td key={i} className={muted ? cellNumMuted : cellNum}>
          {fmt(v)}
        </td>
      ))}
      <td className={muted ? cellTotalMuted : cellTotal}>
        {fmt(sumYearValues(values))}
      </td>
    </tr>
  );
}

function PnLSubRow({
  label,
  values,
  fmt,
}: {
  label: ReactNode;
  values: number[];
  fmt: (n: number) => string;
}) {
  return (
    <tr className="border-t border-slate-700 bg-slate-800/40 font-semibold">
      <td className={`${cellFirst} font-semibold text-slate-200`}>{label}</td>
      {values.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS).map((v, i) => (
        <td
          key={i}
          className="border-r border-slate-700/50 bg-slate-800/40 px-3 py-3 text-right text-sm font-semibold tabular-nums text-slate-200"
        >
          {fmt(v)}
        </td>
      ))}
      <td className="border-l border-r border-slate-700/50 bg-slate-800/40 px-3 py-3 text-right text-sm font-semibold tabular-nums text-slate-200">
        {fmt(sumYearValues(values))}
      </td>
    </tr>
  );
}

function PnLTotalRow({
  label,
  values,
  fmt,
  tone,
}: {
  label: ReactNode;
  values: number[];
  fmt: (n: number) => string;
  tone: "emerald" | "rose" | "sky" | "indigo" | "net";
}) {
  const accent =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "rose"
        ? "text-rose-400"
        : tone === "sky"
          ? "text-sky-400"
          : tone === "indigo"
            ? "text-indigo-400"
            : "text-white";

  const totalSum = sumYearValues(values);
  const totalClass =
    tone === "net"
      ? totalSum >= 0
        ? "text-emerald-400"
        : "text-rose-400"
      : accent;

  return (
    <tr className="border-t-2 border-slate-600 bg-slate-900/50">
      <td
        className={`sticky left-0 z-10 border-r border-slate-700 bg-slate-800 px-4 py-4 text-base font-bold text-white`}
      >
        {label}
      </td>
      {values.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS).map((v, i) => (
        <td
          key={i}
          className={`border-r border-slate-700/50 bg-slate-900/50 px-3 py-4 text-right text-base font-bold tabular-nums ${
            tone === "net"
              ? v >= 0
                ? "text-emerald-400"
                : "text-rose-400"
              : accent
          }`}
        >
          {fmt(v)}
        </td>
      ))}
      <td
        className={`border-l border-r border-slate-700/50 bg-slate-900/50 px-3 py-4 text-right text-base font-bold tabular-nums ${totalClass}`}
      >
        {fmt(totalSum)}
      </td>
    </tr>
  );
}
