"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  computeRetailDepreciationSeries,
  getRetailDepreciationBenchmark,
  resolveRetailDepreciationBenchmark,
  type RetailDepreciationYearRow,
} from "@/lib/benchmarks/retail-depreciation";
import useFinModelStore from "@/store/useFinModelStore";
import { AiInput } from "@/components/ui/AiInput";
import type { RetailDepreciationConfig } from "@/store/useFinModelStore";
import type { OperationalRetailHoldSnapshot } from "@/lib/operational-pnl";
import { getOperationalRetailHoldSnapshot } from "./RetailOtherIncomeStep";

export type RetailDepreciationStepErrors = Record<string, string>;

type LifeFieldKey =
  | "constructionLife"
  | "ffeLife"
  | "ffeRenovationPctYear6"
  | "tiLife"
  | "leasingCommLife"
  | "arMonths"
  | "apMonths";

const LIFE_FIELD_LABELS: Record<LifeFieldKey, string> = {
  constructionLife: "Construction Useful Life (years)",
  ffeLife: "FFE Useful Life (years)",
  ffeRenovationPctYear6: "FFE Renovation (% of initial) – Year 6",
  tiLife: "TI Useful Life (years)",
  leasingCommLife: "Leasing Commissions Life (years)",
  arMonths: "Accounts Receivable (months of revenue)",
  apMonths: "Accounts Payable (months of opex)",
};

export type RetailDepreciationTableRow = {
  year: number;
  constructionDeprec: number;
  ffeDeprec: number;
  tiAmort: number;
  leasingCommAmort: number;
  totalDeprecAmort: number;
  ar: number;
  ap: number;
  netWc: number;
  isOverridden: boolean;
};

function toTableRow(
  row: RetailDepreciationYearRow,
  manual: Record<string, number>
): RetailDepreciationTableRow {
  const constructionDeprec =
    manual.constructionDeprec ?? row.constructionDep;
  const ffeDeprec = manual.ffeDeprec ?? row.ffeDep;
  const tiAmort = manual.tiAmort ?? row.tiAmort;
  const leasingCommAmort = manual.leasingCommAmort ?? row.leasingCommAmort;
  const ar = manual.ar ?? row.ar;
  const ap = manual.ap ?? row.ap;
  const totalDeprecAmort =
    manual.totalDeprecAmort ??
    constructionDeprec + ffeDeprec + tiAmort + leasingCommAmort;
  const netWc = manual.netWc ?? ar - ap;

  return {
    year: row.year,
    constructionDeprec,
    ffeDeprec,
    tiAmort,
    leasingCommAmort,
    totalDeprecAmort,
    ar,
    ap,
    netWc,
    isOverridden: Object.keys(manual).length > 0,
  };
}

function tableRowToYearRow(row: RetailDepreciationTableRow): RetailDepreciationYearRow {
  return {
    year: row.year,
    constructionDep: row.constructionDeprec,
    ffeDep: row.ffeDeprec,
    tiAmort: row.tiAmort,
    leasingCommAmort: row.leasingCommAmort,
    totalDep: row.totalDeprecAmort,
    ar: row.ar,
    ap: row.ap,
    netWc: row.netWc,
    totalRevenue: 0,
  };
}

export function buildRetailDepreciationFromSnapshot(
  snap: OperationalRetailHoldSnapshot | undefined,
  rows: RetailDepreciationYearRow[] | RetailDepreciationTableRow[]
): RetailDepreciationConfig | undefined {
  if (snap?.constructionLife == null && !rows.length) return undefined;
  const normalized = rows.map((r) =>
    "constructionDeprec" in r
      ? tableRowToYearRow(r as RetailDepreciationTableRow)
      : (r as RetailDepreciationYearRow)
  );
  return {
    constructionLife: snap?.constructionLife ?? 25,
    ffeLife: snap?.ffeLife ?? 6,
    ffeRenovationPctYear6: snap?.ffeRenovationPctYear6 ?? 40,
    tiLife: snap?.tiLife ?? 8,
    leasingCommLife: snap?.leasingCommLife ?? 5,
    tiCapital: snap?.tiCapital ?? 0,
    leasingCommCapital: snap?.leasingCommCapital ?? 0,
    arMonths: snap?.arMonths ?? 1,
    apMonths: snap?.apMonths ?? 1,
    projection: normalized.map((r) => ({
      year: r.year,
      constructionDep: r.constructionDep,
      ffeDep: r.ffeDep,
      tiAmort: r.tiAmort,
      leasingCommAmort: r.leasingCommAmort,
      totalDep: r.totalDep,
      ar: r.ar,
      ap: r.ap,
      netWc: r.netWc,
    })),
  };
}

export function validateRetailDepreciationStep(
  snap: OperationalRetailHoldSnapshot | undefined
): RetailDepreciationStepErrors {
  const next: RetailDepreciationStepErrors = {};
  const lives = [
    ["constructionLife", snap?.constructionLife],
    ["ffeLife", snap?.ffeLife],
    ["tiLife", snap?.tiLife],
    ["leasingCommLife", snap?.leasingCommLife],
  ] as const;
  for (const [key, v] of lives) {
    if (v == null || !Number.isFinite(v) || v <= 0) {
      next[key] = `${LIFE_FIELD_LABELS[key as LifeFieldKey]} must be greater than 0.`;
    }
  }
  return next;
}

export default function RetailDepreciationStep() {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const aiC2 = cashOutflows?.aiResearchData?.c2_operational;
  const aiDep = aiC2?.step6_useful_life_working_capital;
  const snap = useFinModelStore((s) => s.operational.retailHoldSnapshot);
  const retailOpex = projectInfo.retailOpex;
  const currencyCode = projectInfo.currency || "AED";

  const benchmark = useMemo(
    () =>
      getRetailDepreciationBenchmark(
        projectInfo?.country || "UAE",
        projectInfo?.retailSegment || "regional_mall",
        projectInfo?.retailPositioning || "mid_market"
      ),
    [
      projectInfo?.country,
      projectInfo?.retailSegment,
      projectInfo?.retailPositioning,
    ]
  );

  const resolved = useMemo(
    () =>
      resolveRetailDepreciationBenchmark(
        projectInfo?.country || "UAE",
        projectInfo?.retailSegment || "regional_mall",
        projectInfo?.retailPositioning || "mid_market"
      ),
    [
      projectInfo?.country,
      projectInfo?.retailSegment,
      projectInfo?.retailPositioning,
    ]
  );

  const constructionBase = Math.max(0, cashOutflows.constructionCost || 0);
  const ffeBase = Math.max(0, cashOutflows.ffe || 0);
  const defaultTiBase = Math.round(
    constructionBase * (resolved.tiPctOfConstruction / 100)
  );
  const defaultLeasingBase = Math.round(
    constructionBase * (resolved.leasingCommPctOfConstruction / 100)
  );
  const tiBase =
    cashOutflows.tiAllowance ??
    snap?.tiCapital ??
    defaultTiBase;
  const leasingCommBase =
    cashOutflows.leasingCommissions ??
    snap?.leasingCommCapital ??
    defaultLeasingBase;

  const minRentValues = snap?.revenueValues ?? Array(10).fill(0);
  const otherIncomeValues =
    snap?.otherIncomeTotalValues ??
    Array(10).fill(0);
  const opexValues = useMemo(() => {
    if (snap?.opexTotalValues?.some((v) => v > 0)) {
      return snap.opexTotalValues;
    }
    return (
      retailOpex?.projection?.map((r) => r.total) ?? Array(10).fill(0)
    );
  }, [snap?.opexTotalValues, retailOpex?.projection]);

  const totalRevenueByYear = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        return (minRentValues[i] || 0) + (otherIncomeValues[i] || 0);
      }),
    [minRentValues, otherIncomeValues]
  );

  const [constructionLife, setConstructionLife] = useState(
    snap?.constructionLife ?? resolved.constructionLife
  );
  const [ffeLife, setFfeLife] = useState(snap?.ffeLife ?? resolved.ffeLife);
  const [ffeRenovationPctYear6, setFfeRenovationPctYear6] = useState(
    snap?.ffeRenovationPctYear6 ?? resolved.ffeRenovationPctYear6
  );
  const [tiLife, setTiLife] = useState(snap?.tiLife ?? resolved.tiLife);
  const [leasingCommLife, setLeasingCommLife] = useState(
    snap?.leasingCommLife ?? resolved.leasingCommLife
  );
  const [arMonths, setArMonths] = useState(snap?.arMonths ?? resolved.arMonths);
  const [apMonths, setApMonths] = useState(snap?.apMonths ?? resolved.apMonths);

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Record<string, number>>
  >({});

  const formulaRows = useMemo(
    () =>
      computeRetailDepreciationSeries({
        constructionCost: constructionBase,
        initialFfe: ffeBase,
        constructionLife,
        ffeLife,
        ffeRenovationPctYear6,
        tiCapital: tiBase,
        tiLife,
        leasingCommCapital: leasingCommBase,
        leasingCommLife,
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
      tiBase,
      tiLife,
      leasingCommBase,
      leasingCommLife,
      arMonths,
      apMonths,
      totalRevenueByYear,
      opexValues,
    ]
  );

  const tableData = useMemo(() => {
    const rows = formulaRows.map((row) =>
      toTableRow(row, manualYearValues[row.year] || {})
    );
    const totals = rows.reduce(
      (acc, r) => ({
        depreciations: acc.depreciations + r.constructionDeprec + r.ffeDeprec,
        amortizations: acc.amortizations + r.tiAmort + r.leasingCommAmort,
        total: acc.total + r.totalDeprecAmort,
        ar: acc.ar + r.ar,
        ap: acc.ap + r.ap,
        netWc: acc.netWc + r.netWc,
      }),
      {
        depreciations: 0,
        amortizations: 0,
        total: 0,
        ar: 0,
        ap: 0,
        netWc: 0,
      }
    );
    return { rows, totals };
  }, [formulaRows, manualYearValues]);

  const persistSnapshot = useCallback(() => {
    const prev = getOperationalRetailHoldSnapshot();
    const yearRows = tableData.rows.map(tableRowToYearRow);
    const merged: OperationalRetailHoldSnapshot = {
      ...prev,
      glaSqft: prev?.glaSqft ?? 0,
      rentEscalationPct: prev?.rentEscalationPct ?? 0,
      baseRentPerSqftValues: prev?.baseRentPerSqftValues ?? [],
      occupancyValues: prev?.occupancyValues ?? [],
      effectiveLeasedValues: prev?.effectiveLeasedValues ?? [],
      revenueValues: prev?.revenueValues ?? [],
      constructionLife,
      ffeLife,
      ffeRenovationPctYear6,
      tiLife,
      leasingCommLife,
      tiCapital: tiBase,
      leasingCommCapital: leasingCommBase,
      arMonths,
      apMonths,
      depConstructionValues: tableData.rows.map((r) => r.constructionDeprec),
      depFfeValues: tableData.rows.map((r) => r.ffeDeprec),
      depTiValues: tableData.rows.map((r) => r.tiAmort),
      depLeasingCommValues: tableData.rows.map((r) => r.leasingCommAmort),
      depTotalValues: tableData.rows.map((r) => r.totalDeprecAmort),
      wcArValues: tableData.rows.map((r) => r.ar),
      wcApValues: tableData.rows.map((r) => r.ap),
      wcNetValues: tableData.rows.map((r) => r.netWc),
    };
    const store = useFinModelStore.getState();
    store.updateRetailHoldSnapshot(merged, "operational");
    const retailDepreciation = buildRetailDepreciationFromSnapshot(
      merged,
      yearRows
    );
    if (retailDepreciation) {
      store.updateProjectInfo({ retailDepreciation }, "operational");
    }
  }, [
    constructionLife,
    ffeLife,
    ffeRenovationPctYear6,
    tiLife,
    leasingCommLife,
    tiBase,
    leasingCommBase,
    arMonths,
    apMonths,
    tableData,
  ]);

  useEffect(() => {
    const timer = setTimeout(persistSnapshot, 200);
    return () => clearTimeout(timer);
  }, [persistSnapshot]);

  useEffect(() => {
    if (!benchmark || Object.keys(overrides).length > 0) return;
    if (snap?.constructionLife != null) return;
    const b = resolved;
    setConstructionLife(b.constructionLife);
    setFfeLife(b.ffeLife);
    setFfeRenovationPctYear6(b.ffeRenovationPctYear6);
    setTiLife(b.tiLife);
    setLeasingCommLife(b.leasingCommLife);
    setArMonths(b.arMonths);
    setApMonths(b.apMonths);
  }, [benchmark, overrides, snap?.constructionLife, resolved]);

  const handleResetAll = () => {
    if (aiDep) {
      setConstructionLife(aiDep.construction_useful_life_years ?? resolved.constructionLife);
      setFfeLife(aiDep.ffe_useful_life_years ?? resolved.ffeLife);
      setFfeRenovationPctYear6(
        aiDep.ffe_renovation_pct_year_6 ?? resolved.ffeRenovationPctYear6
      );
      setTiLife(aiDep.ti_useful_life_years ?? resolved.tiLife);
      setLeasingCommLife(aiDep.leasing_commissions_life_years ?? resolved.leasingCommLife);
      setArMonths(aiDep.accounts_receivable_months_revenue ?? resolved.arMonths);
      setApMonths(aiDep.accounts_payable_months_opex ?? resolved.apMonths);
    } else {
      const b = resolved;
      setConstructionLife(b.constructionLife);
      setFfeLife(b.ffeLife);
      setFfeRenovationPctYear6(b.ffeRenovationPctYear6);
      setTiLife(b.tiLife);
      setLeasingCommLife(b.leasingCommLife);
      setArMonths(b.arMonths);
      setApMonths(b.apMonths);
    }
    setOverrides({});
    setManualYearValues({});
  };

  const handleFieldChange = (field: LifeFieldKey, value: number) => {
    const setters: Record<LifeFieldKey, (v: number) => void> = {
      constructionLife: setConstructionLife,
      ffeLife: setFfeLife,
      ffeRenovationPctYear6: setFfeRenovationPctYear6,
      tiLife: setTiLife,
      leasingCommLife: setLeasingCommLife,
      arMonths: setArMonths,
      apMonths: setApMonths,
    };
    setters[field](value);
    setOverrides((prev) => ({ ...prev, [field]: true }));
  };

  const handleCellOverride = (year: number, stream: string, value: number) => {
    setManualYearValues((prev) => ({
      ...prev,
      [year]: { ...prev[year], [stream]: value },
    }));
  };

  const chartData = tableData.rows.map((row) => ({
    year: `Y${row.year}`,
    "Total Deprec. & Amort.": row.totalDeprecAmort / 1_000_000,
  }));

  const fmtBase = (v: number) =>
    `${v.toLocaleString()} ${currencyCode}`;

  const segmentLabel = (projectInfo?.retailSegment || "regional_mall").replace(
    /_/g,
    " "
  );
  const positioningLabel = (
    projectInfo?.retailPositioning || "mid_market"
  ).replace(/_/g, " ");

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 4 — Depreciation, Amortization &amp; Working Capital
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Configure depreciation schedules and working capital assumptions.
          <span className="ml-1 text-amber-500">Amber borders</span> indicate
          manual overrides.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Depreciation &amp; Amortization Bases (from Component 1)
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-400">
              Construction Cost (Depreciation Base)
            </p>
            <p className="mt-1 font-mono text-lg text-emerald-400">
              {fmtBase(constructionBase)}
            </p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-400">FFE Base</p>
            <p className="mt-1 font-mono text-lg text-emerald-400">
              {fmtBase(ffeBase)}
            </p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-400">
              Tenant Improvements (TI) Allowance
            </p>
            <p className="mt-1 font-mono text-lg text-emerald-400">
              {fmtBase(tiBase)}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              {cashOutflows.tiAllowance != null
                ? "From Component 1 cash outflows."
                : `Benchmark default: ${resolved.tiPctOfConstruction}% of construction.`}
            </p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-400">
              Leasing Commissions Capitalized
            </p>
            <p className="mt-1 font-mono text-lg text-emerald-400">
              {fmtBase(leasingCommBase)}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              {cashOutflows.leasingCommissions != null
                ? "From Component 1 cash outflows."
                : `Benchmark default: ${resolved.leasingCommPctOfConstruction}% of construction.`}
            </p>
          </div>
        </div>
      </div>

      {benchmark && (
        <div className="mb-6 border-b border-slate-700 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-slate-500">
                BENCHMARK
              </span>
              <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
                <span className="text-xs text-slate-300">
                  Retail • {segmentLabel} • {positioningLabel} •{" "}
                  {projectInfo?.country || "—"}
                </span>
              </div>
              {Object.values(overrides).some(Boolean) && (
                <div className="rounded-full border border-amber-600/50 bg-amber-900/30 px-3 py-1">
                  <span className="text-xs text-amber-400">Manual overrides</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleResetAll}
              className="text-xs text-emerald-400 transition hover:text-emerald-300"
            >
              Reset to benchmark
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Useful Life &amp; Working Capital Assumptions
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.constructionLife}
              value={
                constructionLife || aiDep?.construction_useful_life_years || 0
              }
              onChange={(val) =>
                handleFieldChange("constructionLife", Number(val))
              }
              type="number"
              isAiGenerated={
                !!aiDep?.construction_useful_life_years &&
                !overrides.constructionLife
              }
              isManualOverride={!!overrides.constructionLife}
              helperText="Straight-line depreciation"
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.ffeLife}
              value={ffeLife || aiDep?.ffe_useful_life_years || 0}
              onChange={(val) => handleFieldChange("ffeLife", Number(val))}
              type="number"
              isAiGenerated={
                !!aiDep?.ffe_useful_life_years && !overrides.ffeLife
              }
              isManualOverride={!!overrides.ffeLife}
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.ffeRenovationPctYear6}
              value={
                ffeRenovationPctYear6 || aiDep?.ffe_renovation_pct_year_6 || 0
              }
              onChange={(val) =>
                handleFieldChange("ffeRenovationPctYear6", Number(val))
              }
              type="number"
              isAiGenerated={
                !!aiDep?.ffe_renovation_pct_year_6 &&
                !overrides.ffeRenovationPctYear6
              }
              isManualOverride={!!overrides.ffeRenovationPctYear6}
              helperText="Capitalized at Year 6, amortized over remaining life"
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.tiLife}
              value={tiLife || aiDep?.ti_useful_life_years || 0}
              onChange={(val) => handleFieldChange("tiLife", Number(val))}
              type="number"
              isAiGenerated={
                !!aiDep?.ti_useful_life_years && !overrides.tiLife
              }
              isManualOverride={!!overrides.tiLife}
              helperText="Straight-line over lease term or building life"
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.leasingCommLife}
              value={
                leasingCommLife || aiDep?.leasing_commissions_life_years || 0
              }
              onChange={(val) =>
                handleFieldChange("leasingCommLife", Number(val))
              }
              type="number"
              isAiGenerated={
                !!aiDep?.leasing_commissions_life_years &&
                !overrides.leasingCommLife
              }
              isManualOverride={!!overrides.leasingCommLife}
              helperText="Straight-line (matches average lease term)"
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.arMonths}
              value={
                arMonths || aiDep?.accounts_receivable_months_revenue || 0
              }
              onChange={(val) => handleFieldChange("arMonths", Number(val))}
              type="number"
              step={0.5}
              isAiGenerated={
                !!aiDep?.accounts_receivable_months_revenue && !overrides.arMonths
              }
              isManualOverride={!!overrides.arMonths}
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.apMonths}
              value={apMonths || aiDep?.accounts_payable_months_opex || 0}
              onChange={(val) => handleFieldChange("apMonths", Number(val))}
              type="number"
              step={0.5}
              isAiGenerated={
                !!aiDep?.accounts_payable_months_opex && !overrides.apMonths
              }
              isManualOverride={!!overrides.apMonths}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-2 py-3">Year</th>
              <th className="px-2 py-3">Const. Deprec.</th>
              <th className="px-2 py-3">FFE Deprec.</th>
              <th className="px-2 py-3">TI Amort.</th>
              <th className="px-2 py-3">Leasing Comm.</th>
              <th className="px-2 py-3 text-right">Total D&amp;A</th>
              <th className="px-2 py-3">A/R</th>
              <th className="px-2 py-3">A/P</th>
              <th className="px-2 py-3 text-right">Net WC</th>
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row) => (
              <tr
                key={row.year}
                className={`border-b border-slate-800 transition ${row.isOverridden ? "bg-amber-900/10" : "hover:bg-slate-800/50"}`}
              >
                <td className="px-2 py-3 font-medium text-white">Y{row.year}</td>
                {(
                  [
                    "constructionDeprec",
                    "ffeDeprec",
                    "tiAmort",
                    "leasingCommAmort",
                  ] as const
                ).map((stream) => (
                  <td key={stream} className="px-2 py-3">
                    <input
                      type="number"
                      value={(row[stream] / 1000).toFixed(0)}
                      onChange={(e) =>
                        handleCellOverride(
                          row.year,
                          stream,
                          parseFloat(e.target.value) * 1000
                        )
                      }
                      className={`w-20 rounded bg-slate-800 p-1 text-right ${manualYearValues[row.year]?.[stream] ? "border border-amber-500" : "border border-transparent"}`}
                    />
                  </td>
                ))}
                <td className="px-2 py-3 text-right font-mono text-emerald-400">
                  {(row.totalDeprecAmort / 1000).toLocaleString()}
                </td>
                {(["ar", "ap"] as const).map((stream) => (
                  <td key={stream} className="px-2 py-3">
                    <input
                      type="number"
                      value={(row[stream] / 1000).toFixed(0)}
                      onChange={(e) =>
                        handleCellOverride(
                          row.year,
                          stream,
                          parseFloat(e.target.value) * 1000
                        )
                      }
                      className={`w-20 rounded bg-slate-800 p-1 text-right ${manualYearValues[row.year]?.[stream] ? "border border-amber-500" : "border border-transparent"}`}
                    />
                  </td>
                ))}
                <td className="px-2 py-3 text-right font-mono text-emerald-400">
                  {(row.netWc / 1000).toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-800 font-bold text-white">
              <td className="px-2 py-3">10-Year Total</td>
              <td colSpan={4} />
              <td className="px-2 py-3 text-right text-emerald-400">
                {(tableData.totals.total / 1000).toLocaleString()}
              </td>
              <td colSpan={2} />
              <td className="px-2 py-3 text-right">
                {(tableData.totals.netWc / 1000).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <p className="text-sm text-slate-300">
          <span className="font-medium text-amber-400">Note:</span> Tenant
          Improvements are typically landlord-funded. If tenants contribute to
          TI, reduce the TI base accordingly. Leasing commissions are also
          landlord costs, amortized over the lease term.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          TOTAL DEPRECIATION &amp; AMORTIZATION BY YEAR ({currencyCode} M)
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
                dataKey="Total Deprec. & Amort."
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
