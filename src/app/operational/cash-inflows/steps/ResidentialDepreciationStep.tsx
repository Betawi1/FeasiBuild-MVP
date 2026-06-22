"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BenchmarkHeader from "@/components/BenchmarkHeader";
import {
  computeResidentialDepreciationSeries,
  getResidentialDepreciationBenchmark,
  resolveResidentialDepreciationBenchmark,
  type ResidentialDepreciationYearRow,
} from "@/lib/benchmarks/residential-depreciation";
import {
  defaultOperationalResidentialHoldSnapshot,
  type OperationalResidentialHoldSnapshot,
} from "@/lib/operational-pnl";
import { useStreamPrefix, withStreamPrefix } from "@/lib/stream-path";
import useFinModelStore from "@/store/useFinModelStore";
import type { ResidentialDepreciationConfig } from "@/store/useFinModelStore";
import { getOperationalResidentialHoldSnapshot } from "./ResidentialOpexStep";

export type ResidentialDepreciationStepErrors = Record<string, string>;

type LifeFieldKey =
  | "constructionLife"
  | "ffeLife"
  | "ffeRenovationPctYear6"
  | "arMonths"
  | "apMonths";

const LIFE_FIELD_LABELS: Record<LifeFieldKey, string> = {
  constructionLife: "Construction Useful Life (years)",
  ffeLife: "FFE Useful Life (years)",
  ffeRenovationPctYear6: "FFE Renovation (% of initial) – Year 6",
  arMonths: "Accounts Receivable (months of revenue)",
  apMonths: "Accounts Payable (months of opex)",
};

export type ResidentialDepreciationTableRow = {
  year: number;
  constructionDeprec: number;
  ffeDeprec: number;
  totalDeprec: number;
  ar: number;
  ap: number;
  netWc: number;
  changeInWc: number;
  isOverridden: boolean;
};

function toTableRow(
  row: ResidentialDepreciationYearRow,
  manual: Record<string, number>
): ResidentialDepreciationTableRow {
  const constructionDeprec =
    manual.constructionDeprec ?? row.constructionDep;
  const ffeDeprec = manual.ffeDeprec ?? row.ffeDep;
  const ar = manual.ar ?? row.ar;
  const ap = manual.ap ?? row.ap;
  const totalDeprec =
    manual.totalDeprec ??
    (manual.constructionDeprec != null || manual.ffeDeprec != null
      ? constructionDeprec + ffeDeprec
      : row.totalDep);
  const netWc = manual.netWc ?? ar - ap;

  return {
    year: row.year,
    constructionDeprec,
    ffeDeprec,
    totalDeprec,
    ar,
    ap,
    netWc,
    changeInWc: 0,
    isOverridden: Object.keys(manual).length > 0,
  };
}

function applyChangeInWc(
  rows: ResidentialDepreciationTableRow[],
  manualYearValues: Record<number, Record<string, number>>
): ResidentialDepreciationTableRow[] {
  let prevNetWc = 0;
  return rows.map((row) => {
    const manual = manualYearValues[row.year] || {};
    const changeInWc = manual.changeInWc ?? row.netWc - prevNetWc;
    prevNetWc = row.netWc;
    return { ...row, changeInWc };
  });
}

function tableRowToYearRow(
  row: ResidentialDepreciationTableRow,
  totalRevenue: number
): ResidentialDepreciationYearRow {
  return {
    year: row.year,
    constructionDep: row.constructionDeprec,
    ffeDep: row.ffeDeprec,
    totalDep: row.totalDeprec,
    ar: row.ar,
    ap: row.ap,
    netWc: row.netWc,
    changeInWc: row.changeInWc,
    totalRevenue,
  };
}

export function buildResidentialDepreciationFromSnapshot(
  snap: OperationalResidentialHoldSnapshot | undefined,
  rows?: ResidentialDepreciationYearRow[] | ResidentialDepreciationTableRow[]
): ResidentialDepreciationConfig | undefined {
  if (snap?.constructionLife == null && !snap?.depTotalValues?.length) {
    return undefined;
  }

  const projection: ResidentialDepreciationConfig["projection"] =
    rows && rows.length > 0
      ? rows.map((r) => {
          const normalized =
            "constructionDeprec" in r
              ? tableRowToYearRow(
                  r as ResidentialDepreciationTableRow,
                  0
                )
              : (r as ResidentialDepreciationYearRow);
          return {
            year: normalized.year,
            constructionDep: normalized.constructionDep,
            ffeDep: normalized.ffeDep,
            totalDep: normalized.totalDep,
            ar: normalized.ar,
            ap: normalized.ap,
            netWc: normalized.netWc,
            changeInWc: normalized.changeInWc,
            totalRevenue: normalized.totalRevenue,
          };
        })
      : Array.from({ length: 10 }, (_, i) => ({
          year: i + 1,
          constructionDep: snap?.depConstructionValues?.[i] ?? 0,
          ffeDep: snap?.depFfeValues?.[i] ?? 0,
          totalDep: snap?.depTotalValues?.[i] ?? 0,
          ar: snap?.wcArValues?.[i] ?? 0,
          ap: snap?.wcApValues?.[i] ?? 0,
          netWc: snap?.wcNetValues?.[i] ?? 0,
          changeInWc: snap?.wcChangeValues?.[i] ?? 0,
        }));

  return {
    usefulLives: {
      construction: snap?.constructionLife ?? 30,
      ffe: snap?.ffeLife ?? 7,
      ffeRenovationPctYear6: snap?.ffeRenovationPctYear6 ?? 40,
    },
    workingCapital: {
      arMonths: snap?.arMonths ?? 1,
      apMonths: snap?.apMonths ?? 1,
    },
    projection,
  };
}

export function validateResidentialDepreciationStep(
  snap: OperationalResidentialHoldSnapshot | undefined
): ResidentialDepreciationStepErrors {
  const next: ResidentialDepreciationStepErrors = {};
  const lives = [
    ["constructionLife", snap?.constructionLife],
    ["ffeLife", snap?.ffeLife],
  ] as const;
  for (const [key, v] of lives) {
    if (v == null || !Number.isFinite(v) || v <= 0) {
      next[key] = `${LIFE_FIELD_LABELS[key as LifeFieldKey]} must be greater than 0.`;
    }
  }
  const rev =
    (snap?.totalBaseRentValues?.[0] ?? snap?.residentialRentValues?.[0] ?? 0) +
    (snap?.otherIncomeTotalValues?.[0] ?? 0);
  if (!Number.isFinite(rev) || rev <= 0) {
    next.totalRevenue =
      "Total Year 1 revenue must be greater than 0 (configure Steps 1–2).";
  }
  return next;
}

const inputBase =
  "w-full rounded bg-slate-900 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

function overrideFieldClass(overridden: boolean): string {
  return overridden
    ? `${inputBase} border-2 border-amber-500/70`
    : `${inputBase} border border-slate-600`;
}

export default function ResidentialDepreciationStep() {
  const router = useRouter();
  const streamPrefix = useStreamPrefix();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const snap = useFinModelStore((s) => s.operational.residentialHoldSnapshot);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const residentialOpex = projectInfo.residentialOpex;
  const currencyCode = projectInfo.currency || "AED";

  const benchmark = useMemo(
    () =>
      getResidentialDepreciationBenchmark(
        projectInfo?.country || "UAE",
        projectInfo?.residentialSegment || "high_rise",
        projectInfo?.residentialPositioning || "grade_a"
      ),
    [
      projectInfo?.country,
      projectInfo?.residentialSegment,
      projectInfo?.residentialPositioning,
    ]
  );

  const resolved = useMemo(
    () =>
      resolveResidentialDepreciationBenchmark(
        projectInfo?.country || "UAE",
        projectInfo?.residentialSegment || "high_rise",
        projectInfo?.residentialPositioning || "grade_a"
      ),
    [
      projectInfo?.country,
      projectInfo?.residentialSegment,
      projectInfo?.residentialPositioning,
    ]
  );

  const constructionBase = Math.max(0, cashOutflows.constructionCost || 0);
  const ffeBase = Math.max(0, cashOutflows.ffe || 0);

  const totalRevenueByYear = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const base =
          snap?.totalBaseRentValues?.[i] ??
          (snap?.residentialRentValues?.[i] ?? 0) +
            (snap?.retailMinRentValues?.[i] ?? 0);
        const other = snap?.otherIncomeTotalValues?.[i] ?? 0;
        return base + other;
      }),
    [
      snap?.totalBaseRentValues,
      snap?.residentialRentValues,
      snap?.retailMinRentValues,
      snap?.otherIncomeTotalValues,
    ]
  );

  const opexValues = useMemo(() => {
    if (snap?.opexTotalValues?.some((v) => v > 0)) {
      return snap.opexTotalValues;
    }
    return (
      residentialOpex?.projection?.map((r) => r.total) ?? Array(10).fill(0)
    );
  }, [snap?.opexTotalValues, residentialOpex?.projection]);

  const [constructionLife, setConstructionLife] = useState(
    snap?.constructionLife ?? resolved.constructionLife
  );
  const [ffeLife, setFfeLife] = useState(snap?.ffeLife ?? resolved.ffeLife);
  const [ffeRenovationPctYear6, setFfeRenovationPctYear6] = useState(
    snap?.ffeRenovationPctYear6 ?? resolved.ffeRenovationPctYear6
  );
  const [arMonths, setArMonths] = useState(snap?.arMonths ?? resolved.arMonths);
  const [apMonths, setApMonths] = useState(snap?.apMonths ?? resolved.apMonths);

  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    snap?.depSectionOverrides ?? {}
  );
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Record<string, number>>
  >(snap?.depManualYearValues ?? {});

  const formulaRows = useMemo(
    () =>
      computeResidentialDepreciationSeries({
        constructionCost: constructionBase,
        initialFfe: ffeBase,
        constructionLife,
        ffeLife,
        ffeRenovationPctYear6,
        arMonths,
        apMonths,
        totalRevenueByYear,
        opexByYear: opexValues,
      }),
    [
      constructionBase,
      ffeBase,
      constructionLife,
      ffeLife,
      ffeRenovationPctYear6,
      arMonths,
      apMonths,
      totalRevenueByYear,
      opexValues,
    ]
  );

  const tableData = useMemo(() => {
    const rows = applyChangeInWc(
      formulaRows.map((row) =>
        toTableRow(row, manualYearValues[row.year] || {})
      ),
      manualYearValues
    );
    const totals = rows.reduce(
      (acc, r) => ({
        depreciation: acc.depreciation + r.totalDeprec,
        ar: acc.ar + r.ar,
        ap: acc.ap + r.ap,
        netWc: acc.netWc + r.netWc,
        changeInWc: acc.changeInWc + r.changeInWc,
      }),
      { depreciation: 0, ar: 0, ap: 0, netWc: 0, changeInWc: 0 }
    );
    return { rows, totals };
  }, [formulaRows, manualYearValues]);

  const ffeRenovationAmount =
    ffeBase > 0 ? ffeBase * (ffeRenovationPctYear6 / 100) : 0;

  const flushPersist = useCallback(() => {
    const prev = getOperationalResidentialHoldSnapshot();
    const yearRows = tableData.rows.map((r, i) =>
      tableRowToYearRow(r, totalRevenueByYear[i] ?? 0)
    );
    const merged: OperationalResidentialHoldSnapshot = {
      ...defaultOperationalResidentialHoldSnapshot,
      ...prev,
      constructionLife,
      ffeLife,
      ffeRenovationPctYear6,
      arMonths,
      apMonths,
      depSectionOverrides: overrides,
      depManualYearValues: manualYearValues,
      depConstructionValues: tableData.rows.map((r) => r.constructionDeprec),
      depFfeValues: tableData.rows.map((r) => r.ffeDeprec),
      depTotalValues: tableData.rows.map((r) => r.totalDeprec),
      wcArValues: tableData.rows.map((r) => r.ar),
      wcApValues: tableData.rows.map((r) => r.ap),
      wcNetValues: tableData.rows.map((r) => r.netWc),
      wcChangeValues: tableData.rows.map((r) => r.changeInWc),
    };
    const store = useFinModelStore.getState();
    store.updateResidentialHoldSnapshot(merged, "operational");
    const residentialDepreciation = buildResidentialDepreciationFromSnapshot(
      merged,
      yearRows
    );
    if (residentialDepreciation) {
      store.updateProjectInfo({ residentialDepreciation }, "operational");
    }
  }, [
    constructionLife,
    ffeLife,
    ffeRenovationPctYear6,
    arMonths,
    apMonths,
    overrides,
    manualYearValues,
    tableData,
    totalRevenueByYear,
  ]);

  useEffect(() => {
    const timer = setTimeout(flushPersist, 200);
    return () => clearTimeout(timer);
  }, [flushPersist]);

  useEffect(() => {
    if (!benchmark || Object.keys(overrides).length > 0) return;
    if (snap?.constructionLife != null) return;
    setConstructionLife(resolved.constructionLife);
    setFfeLife(resolved.ffeLife);
    setFfeRenovationPctYear6(resolved.ffeRenovationPctYear6);
    setArMonths(resolved.arMonths);
    setApMonths(resolved.apMonths);
  }, [benchmark, overrides, snap?.constructionLife, resolved]);

  const handleResetDeprec = () => {
    setConstructionLife(resolved.constructionLife);
    setFfeLife(resolved.ffeLife);
    setFfeRenovationPctYear6(resolved.ffeRenovationPctYear6);
    setOverrides((prev) => ({ ...prev, depreciations: false }));
  };

  const handleResetWc = () => {
    setArMonths(resolved.arMonths);
    setApMonths(resolved.apMonths);
    setOverrides((prev) => ({ ...prev, wc: false }));
  };

  const handleResetAll = () => {
    handleResetDeprec();
    handleResetWc();
    setOverrides({});
    setManualYearValues({});
  };

  const handleFieldChange = (
    section: "depreciations" | "wc",
    field: LifeFieldKey,
    value: number
  ) => {
    const setters: Record<LifeFieldKey, (v: number) => void> = {
      constructionLife: setConstructionLife,
      ffeLife: setFfeLife,
      ffeRenovationPctYear6: setFfeRenovationPctYear6,
      arMonths: setArMonths,
      apMonths: setApMonths,
    };
    setters[field](value);
    setOverrides((prev) => ({ ...prev, [section]: true, [field]: true }));
  };

  const handleCellOverride = (year: number, stream: string, value: number) => {
    setManualYearValues((prev) => ({
      ...prev,
      [year]: { ...prev[year], [stream]: value },
    }));
  };

  const handleGeneratePnl = () => {
    flushPersist();
    router.push(withStreamPrefix(streamPrefix, "/preview/pnl"));
  };

  const chartData = tableData.rows.map((row) => ({
    year: `Y${row.year}`,
    "Total Depreciation": row.totalDeprec / 1_000_000,
  }));

  const deprecOverride = !!overrides.depreciations;
  const wcOverride = !!overrides.wc;

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 4 — Depreciation &amp; Working Capital
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Configure depreciation schedules and working capital assumptions.
          <span className="ml-1 text-amber-500">Amber borders</span> indicate
          manual overrides.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Depreciation Bases (from Component 1)
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-400">Construction Cost</p>
            <p className="font-mono text-lg text-emerald-400">
              {constructionBase.toLocaleString()} {currencyCode}
            </p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-400">
              FFE (Appliances, Fixtures, A/C)
            </p>
            <p className="font-mono text-lg text-emerald-400">
              {ffeBase.toLocaleString()} {currencyCode}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          <strong>Note:</strong> Residential typically has no separate Tenant
          Improvements — finishes are included in construction cost.
        </p>
      </div>

      {benchmark && projectInfo && (
        <BenchmarkHeader
          assetType="residential"
          country={projectInfo.country}
          segment={projectInfo.residentialSegment}
          positioning={projectInfo.residentialPositioning}
          furnishingLevel={projectInfo.residentialFurnishingLevel}
          isServicedApartment={projectInfo.residentialIsServicedApartment}
          isManualOverride={Object.values(overrides).some(Boolean)}
          onUseDefaults={handleResetAll}
        />
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Useful Life &amp; Working Capital Assumptions
          </h3>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={handleResetDeprec}
              className="text-emerald-400 transition hover:text-emerald-300"
            >
              Reset depreciation
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={handleResetWc}
              className="text-emerald-400 transition hover:text-emerald-300"
            >
              Reset WC
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Construction Useful Life (years)
            </label>
            <input
              type="number"
              value={constructionLife}
              onChange={(e) =>
                handleFieldChange(
                  "depreciations",
                  "constructionLife",
                  Number(e.target.value)
                )
              }
              className={overrideFieldClass(deprecOverride)}
            />
            <p className="mt-1 text-[10px] text-slate-500">Straight-line</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              FFE Useful Life (years)
            </label>
            <input
              type="number"
              value={ffeLife}
              onChange={(e) =>
                handleFieldChange("depreciations", "ffeLife", Number(e.target.value))
              }
              className={overrideFieldClass(deprecOverride)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              FFE Renovation (% of initial) – Year 6
            </label>
            <input
              type="number"
              value={ffeRenovationPctYear6}
              onChange={(e) =>
                handleFieldChange(
                  "depreciations",
                  "ffeRenovationPctYear6",
                  Number(e.target.value)
                )
              }
              className={overrideFieldClass(deprecOverride)}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Capitalized at Year 6, amortized over remaining useful life
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Accounts Receivable (months of revenue)
            </label>
            <input
              type="number"
              step="0.5"
              value={arMonths}
              onChange={(e) =>
                handleFieldChange("wc", "arMonths", Number(e.target.value))
              }
              className={overrideFieldClass(wcOverride)}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Rent collected monthly
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Accounts Payable (months of opex)
            </label>
            <input
              type="number"
              step="0.5"
              value={apMonths}
              onChange={(e) =>
                handleFieldChange("wc", "apMonths", Number(e.target.value))
              }
              className={overrideFieldClass(wcOverride)}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Pay expenses monthly
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR DEPRECIATION &amp; WORKING CAPITAL TABLE ({currencyCode} M)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="border-r border-slate-700 px-2 py-3">Year</th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Const. Deprec
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  FFE Deprec
                </th>
                <th className="border-r border-slate-700 px-2 py-3 text-right">
                  Total Deprec
                </th>
                <th className="border-r border-slate-700 px-2 py-3">A/R</th>
                <th className="border-r border-slate-700 px-2 py-3">A/P</th>
                <th className="border-r border-slate-700 px-2 py-3 text-right">
                  Net WC
                </th>
                <th className="px-2 py-3 text-right">Change in WC</th>
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row) => (
                <tr
                  key={row.year}
                  className={`border-b border-slate-800 transition ${
                    row.isOverridden
                      ? "bg-amber-900/10"
                      : "hover:bg-slate-800/50"
                  }`}
                >
                  <td className="border-r border-slate-700 px-2 py-3 font-medium text-white">
                    Y{row.year}
                  </td>
                  {(["constructionDeprec", "ffeDeprec"] as const).map(
                    (stream) => (
                      <td
                        key={stream}
                        className="border-r border-slate-700 px-2 py-3"
                      >
                        <input
                          type="number"
                          step="0.01"
                          value={(row[stream] / 1_000_000).toFixed(2)}
                          onChange={(e) =>
                            handleCellOverride(
                              row.year,
                              stream,
                              parseFloat(e.target.value) * 1_000_000
                            )
                          }
                          className={`w-20 rounded bg-slate-800 p-1 text-right ${
                            manualYearValues[row.year]?.[stream]
                              ? "border border-amber-500"
                              : "border border-transparent"
                          }`}
                        />
                      </td>
                    )
                  )}
                  <td className="border-r border-slate-700 px-2 py-3 text-right font-mono text-emerald-400">
                    {(row.totalDeprec / 1_000_000).toFixed(2)}
                  </td>
                  {(["ar", "ap", "netWc"] as const).map((stream) => (
                    <td
                      key={stream}
                      className="border-r border-slate-700 px-2 py-3"
                    >
                      <input
                        type="number"
                        step="0.01"
                        value={(row[stream] / 1_000_000).toFixed(2)}
                        onChange={(e) =>
                          handleCellOverride(
                            row.year,
                            stream,
                            parseFloat(e.target.value) * 1_000_000
                          )
                        }
                        className={`w-20 rounded bg-slate-800 p-1 text-right ${
                          manualYearValues[row.year]?.[stream]
                            ? "border border-amber-500"
                            : "border border-transparent"
                        }`}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-3 text-right font-mono text-emerald-400">
                    {(row.changeInWc / 1_000_000).toFixed(2)}
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-800 font-bold text-white">
                <td className="border-r border-slate-700 px-2 py-3">
                  10-Year Total
                </td>
                <td colSpan={2} />
                <td className="border-r border-slate-700 px-2 py-3 text-right text-emerald-400">
                  {(tableData.totals.depreciation / 1_000_000).toFixed(2)}
                </td>
                <td colSpan={3} />
                <td className="px-2 py-3 text-right">
                  {(tableData.totals.netWc / 1_000_000).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-700 bg-slate-800/50 p-3 text-[10px] text-slate-400">
          <p>
            <strong>Note:</strong> FFE renovation at Year 6:{" "}
            {ffeRenovationPctYear6}% × {ffeBase.toLocaleString()} ={" "}
            {ffeRenovationAmount.toLocaleString()} {currencyCode}, amortized
            over remaining useful life from Year 6.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <p className="text-sm text-slate-300">
          <span className="font-medium text-amber-400">
            Working Capital Cash Flow Impact:
          </span>{" "}
          Year 1 change = Net WC Year 1 – 0; Year 2+ change = Net WC Year t – Net
          WC Year t-1. Positive change = cash outflow (increase in working
          capital); negative change = cash inflow.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          TOTAL DEPRECIATION BY YEAR ({currencyCode} M)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                vertical={false}
              />
              <XAxis
                dataKey="year"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}M`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
                formatter={(val) => `${Number(val ?? 0).toFixed(2)}M`}
              />
              <Line
                type="monotone"
                dataKey="Total Depreciation"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleGeneratePnl}
          className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-emerald-500"
        >
          Generate P&amp;L →
        </button>
      </div>
    </div>
  );
}
