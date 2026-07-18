"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  computeOfficeDepreciationSeries,
  resolveOfficeDepreciationBenchmark,
  resolveOfficeDepreciationBases,
  type OfficeDepreciationYearRow,
} from "@/lib/benchmarks/office-depreciation";
import { normalizeAiResearchData } from "@/lib/constants/aiPrompts";
import type { OperationalOfficeHoldSnapshot } from "@/lib/operational-pnl";
import useFinModelStore from "@/store/useFinModelStore";
import type { OfficeDepreciationConfig } from "@/store/useFinModelStore";
import { AiInput } from "@/components/ui/AiInput";
import { getOperationalOfficeHoldSnapshot } from "./OfficeRevenueStep";

export type OfficeDepreciationStepErrors = Record<string, string>;

type LifeFieldKey =
  | "constructionLife"
  | "ffeLife"
  | "ffeRenovationPctYear6"
  | "officeTiLife"
  | "retailTiLife"
  | "officeLeasingCommLife"
  | "retailLeasingCommLife"
  | "arMonths"
  | "apMonths";

const LIFE_FIELD_LABELS: Record<LifeFieldKey, string> = {
  constructionLife: "Construction Useful Life (years)",
  ffeLife: "FFE Useful Life (years)",
  ffeRenovationPctYear6: "FFE Renovation (% of initial) – Year 6",
  officeTiLife: "Office TI Useful Life (years)",
  retailTiLife: "Retail TI Useful Life (years)",
  officeLeasingCommLife: "Office Leasing Comm Life (years)",
  retailLeasingCommLife: "Retail Leasing Comm Life (years)",
  arMonths: "Accounts Receivable (months of revenue)",
  apMonths: "Accounts Payable (months of opex)",
};

export type OfficeDepreciationTableRow = {
  year: number;
  constructionDeprec: number;
  ffeDeprec: number;
  officeTiAmort: number;
  retailTiAmort: number;
  officeLeasingCommAmort: number;
  retailLeasingCommAmort: number;
  totalDeprecAmort: number;
  ar: number;
  ap: number;
  netWc: number;
  isOverridden: boolean;
};

function toTableRow(
  row: OfficeDepreciationYearRow,
  manual: Record<string, number>
): OfficeDepreciationTableRow {
  const constructionDeprec =
    manual.constructionDeprec ?? row.constructionDep;
  const ffeDeprec = manual.ffeDeprec ?? row.ffeDep;
  const officeTiAmort = manual.officeTiAmort ?? row.officeTiAmort;
  const retailTiAmort = manual.retailTiAmort ?? row.retailTiAmort;
  const officeLeasingCommAmort =
    manual.officeLeasingCommAmort ?? row.officeLeasingCommAmort;
  const retailLeasingCommAmort =
    manual.retailLeasingCommAmort ?? row.retailLeasingCommAmort;
  const ar = manual.ar ?? row.ar;
  const ap = manual.ap ?? row.ap;
  const totalDeprecAmort =
    manual.totalDeprecAmort ??
    constructionDeprec +
      ffeDeprec +
      officeTiAmort +
      retailTiAmort +
      officeLeasingCommAmort +
      retailLeasingCommAmort;
  const netWc = manual.netWc ?? ar - ap;

  return {
    year: row.year,
    constructionDeprec,
    ffeDeprec,
    officeTiAmort,
    retailTiAmort,
    officeLeasingCommAmort,
    retailLeasingCommAmort,
    totalDeprecAmort,
    ar,
    ap,
    netWc,
    isOverridden: Object.keys(manual).length > 0,
  };
}

function tableRowToYearRow(row: OfficeDepreciationTableRow): OfficeDepreciationYearRow {
  return {
    year: row.year,
    constructionDep: row.constructionDeprec,
    ffeDep: row.ffeDeprec,
    officeTiAmort: row.officeTiAmort,
    retailTiAmort: row.retailTiAmort,
    officeLeasingCommAmort: row.officeLeasingCommAmort,
    retailLeasingCommAmort: row.retailLeasingCommAmort,
    totalDep: row.totalDeprecAmort,
    ar: row.ar,
    ap: row.ap,
    netWc: row.netWc,
    totalRevenue: 0,
  };
}

export function buildOfficeDepreciationFromSnapshot(
  snap: OperationalOfficeHoldSnapshot | undefined,
  rows: OfficeDepreciationYearRow[] | OfficeDepreciationTableRow[],
  bases: {
    constructionCost: number;
    ffe: number;
    officeTi: number;
    retailTi: number;
    officeLeasingComm: number;
    retailLeasingComm: number;
  }
): OfficeDepreciationConfig | undefined {
  if (snap?.constructionLife == null && !rows.length) return undefined;
  const normalized = rows.map((r) =>
    "constructionDeprec" in r
      ? tableRowToYearRow(r as OfficeDepreciationTableRow)
      : (r as OfficeDepreciationYearRow)
  );
  return {
    usefulLives: {
      construction: snap?.constructionLife ?? 25,
      ffe: snap?.ffeLife ?? 7,
      officeTi: snap?.officeTiLife ?? 10,
      retailTi: snap?.retailTiLife ?? 8,
      officeLeasingComm: snap?.officeLeasingCommLife ?? 5,
      retailLeasingComm: snap?.retailLeasingCommLife ?? 4,
    },
    ffeRenovationPctYear6: snap?.ffeRenovationPctYear6 ?? 50,
    workingCapital: {
      arMonths: snap?.arMonths ?? 1,
      apMonths: snap?.apMonths ?? 1,
    },
    bases,
    projection: normalized.map((r) => ({
      year: r.year,
      constructionDep: r.constructionDep,
      ffeDep: r.ffeDep,
      officeTiAmort: r.officeTiAmort,
      retailTiAmort: r.retailTiAmort,
      officeLeasingCommAmort: r.officeLeasingCommAmort,
      retailLeasingCommAmort: r.retailLeasingCommAmort,
      totalDep: r.totalDep,
      ar: r.ar,
      ap: r.ap,
      netWc: r.netWc,
    })),
  };
}

export function validateOfficeDepreciationStep(
  snap: OperationalOfficeHoldSnapshot | undefined
): OfficeDepreciationStepErrors {
  const next: OfficeDepreciationStepErrors = {};
  const lives: Array<[keyof OfficeDepreciationStepErrors, number | undefined]> =
    [
      ["constructionLife", snap?.constructionLife],
      ["ffeLife", snap?.ffeLife],
      ["officeTiLife", snap?.officeTiLife],
      ["retailTiLife", snap?.retailTiLife],
      ["officeLeasingCommLife", snap?.officeLeasingCommLife],
      ["retailLeasingCommLife", snap?.retailLeasingCommLife],
    ];
  for (const [key, v] of lives) {
    if (v == null || !Number.isFinite(v) || v <= 0) {
      const label =
        LIFE_FIELD_LABELS[key as LifeFieldKey] ?? String(key);
      next[key] = `${label} must be greater than 0.`;
    }
  }
  return next;
}

const DA_STREAMS = [
  "constructionDeprec",
  "ffeDeprec",
  "officeTiAmort",
  "retailTiAmort",
  "officeLeasingCommAmort",
  "retailLeasingCommAmort",
] as const;

export default function OfficeDepreciationStep() {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const snap = useFinModelStore((s) => s.operational.officeHoldSnapshot);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const officeOpex = projectInfo.officeOpex;
  const currencyCode = projectInfo.currency || "AED";

  const aiC2 = useMemo(() => {
    const raw = cashOutflows?.aiResearchData;
    if (!raw) return undefined;
    const hasNested =
      !!raw.c2_operational?.step6_useful_life_working_capital ||
      !!raw.c2_operational?.step1_base_rent;
    if (!hasNested) {
      return (
        normalizeAiResearchData(raw) as {
          c2_operational?: typeof raw.c2_operational;
        }
      )?.c2_operational;
    }
    return raw.c2_operational;
  }, [cashOutflows?.aiResearchData]);

  const aiStep6 = aiC2?.step6_useful_life_working_capital;
  const aiConstructionLife = aiStep6?.construction_useful_life_years;
  const aiFfeLife = aiStep6?.ffe_useful_life_years;
  const aiFfeRenovationPct = aiStep6?.ffe_renovation_pct_year_6;
  const aiOfficeTiLife = aiStep6?.ti_useful_life_years;
  const aiRetailTiLife = aiStep6?.retail_ti_useful_life_years;
  const aiLeasingCommLife = aiStep6?.leasing_commissions_life_years;
  const aiArMonths = aiStep6?.accounts_receivable_months_revenue;
  const aiApMonths = aiStep6?.accounts_payable_months_opex;

  const coworkingDelivery =
    projectInfo.officeSegment === "co_working"
      ? projectInfo.officeCoworkingDelivery
      : undefined;

  const resolved = useMemo(
    () =>
      resolveOfficeDepreciationBenchmark(
        projectInfo?.country || "UAE",
        projectInfo?.officeSegment || "prime_tower",
        projectInfo?.officePositioning || "grade_a",
        coworkingDelivery
      ),
    [
      projectInfo?.country,
      projectInfo?.officeSegment,
      projectInfo?.officePositioning,
      coworkingDelivery,
    ]
  );

  const constructionBase = Math.max(0, cashOutflows.constructionCost || 0);
  const ffeBase = Math.max(0, cashOutflows.ffe || 0);
  const officeGla = snap?.officeGlaSqft ?? 0;
  const retailGla = snap?.retailGlaSqft ?? 0;

  const capitalBases = useMemo(
    () =>
      resolveOfficeDepreciationBases(
        {
          constructionCost: constructionBase,
          initialFfe: ffeBase,
          officeGlaSqft: officeGla,
          retailGlaSqft: retailGla,
          officeTiCapital:
            cashOutflows.officeTiAllowance ?? snap?.officeTiCapital,
          retailTiCapital:
            cashOutflows.retailTiAllowance ?? snap?.retailTiCapital,
          officeLeasingCommCapital:
            cashOutflows.officeLeasingCommissions ??
            snap?.officeLeasingCommCapital,
          retailLeasingCommCapital:
            cashOutflows.retailLeasingCommissions ??
            snap?.retailLeasingCommCapital,
        },
        resolved
      ),
    [
      constructionBase,
      ffeBase,
      officeGla,
      retailGla,
      cashOutflows.officeTiAllowance,
      cashOutflows.retailTiAllowance,
      cashOutflows.officeLeasingCommissions,
      cashOutflows.retailLeasingCommissions,
      snap?.officeTiCapital,
      snap?.retailTiCapital,
      snap?.officeLeasingCommCapital,
      snap?.retailLeasingCommCapital,
      resolved,
    ]
  );

  const baseRentValues = snap?.totalBaseRentValues ?? Array(10).fill(0);
  const otherIncomeValues =
    snap?.otherIncomeTotalValues ?? Array(10).fill(0);
  const opexValues = useMemo(() => {
    if (snap?.opexTotalValues?.some((v) => v > 0)) {
      return snap.opexTotalValues;
    }
    return officeOpex?.projection?.map((r) => r.total) ?? Array(10).fill(0);
  }, [snap?.opexTotalValues, officeOpex?.projection]);

  const totalRevenueByYear = useMemo(
    () =>
      Array.from(
        { length: 10 },
        (_, i) => (baseRentValues[i] || 0) + (otherIncomeValues[i] || 0)
      ),
    [baseRentValues, otherIncomeValues]
  );

  const [constructionLife, setConstructionLife] = useState(
    snap?.constructionLife ?? resolved.constructionLife
  );
  const [ffeLife, setFfeLife] = useState(snap?.ffeLife ?? resolved.ffeLife);
  const [ffeRenovationPctYear6, setFfeRenovationPctYear6] = useState(
    snap?.ffeRenovationPctYear6 ?? resolved.ffeRenovationPctYear6
  );
  const [officeTiLife, setOfficeTiLife] = useState(
    snap?.officeTiLife ?? resolved.officeTiLife
  );
  const [retailTiLife, setRetailTiLife] = useState(
    snap?.retailTiLife ?? resolved.retailTiLife
  );
  const [officeLeasingCommLife, setOfficeLeasingCommLife] = useState(
    snap?.officeLeasingCommLife ?? resolved.officeLeasingCommLife
  );
  const [retailLeasingCommLife, setRetailLeasingCommLife] = useState(
    snap?.retailLeasingCommLife ?? resolved.retailLeasingCommLife
  );
  const [arMonths, setArMonths] = useState(snap?.arMonths ?? resolved.arMonths);
  const [apMonths, setApMonths] = useState(snap?.apMonths ?? resolved.apMonths);

  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    () => snap?.depSectionOverrides ?? {}
  );
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Record<string, number>>
  >({});

  const formulaRows = useMemo(
    () =>
      computeOfficeDepreciationSeries({
        constructionCost: constructionBase,
        initialFfe: ffeBase,
        constructionLife,
        ffeLife,
        ffeRenovationPctYear6,
        officeTiCapital: capitalBases.officeTiCapital,
        retailTiCapital: capitalBases.retailTiCapital,
        officeTiLife,
        retailTiLife,
        officeLeasingCommCapital: capitalBases.officeLeasingCommCapital,
        retailLeasingCommCapital: capitalBases.retailLeasingCommCapital,
        officeLeasingCommLife,
        retailLeasingCommLife,
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
      capitalBases,
      officeTiLife,
      retailTiLife,
      officeLeasingCommLife,
      retailLeasingCommLife,
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
        amortizations:
          acc.amortizations +
          r.officeTiAmort +
          r.retailTiAmort +
          r.officeLeasingCommAmort +
          r.retailLeasingCommAmort,
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
    const prev = getOperationalOfficeHoldSnapshot();
    if (!prev) return;
    const yearRows = tableData.rows.map(tableRowToYearRow);
    const merged: OperationalOfficeHoldSnapshot = {
      ...prev,
      constructionLife,
      ffeLife,
      ffeRenovationPctYear6,
      officeTiLife,
      retailTiLife,
      officeLeasingCommLife,
      retailLeasingCommLife,
      officeTiCapital: capitalBases.officeTiCapital,
      retailTiCapital: capitalBases.retailTiCapital,
      officeLeasingCommCapital: capitalBases.officeLeasingCommCapital,
      retailLeasingCommCapital: capitalBases.retailLeasingCommCapital,
      arMonths,
      apMonths,
      depSectionOverrides: overrides,
      depConstructionValues: tableData.rows.map((r) => r.constructionDeprec),
      depFfeValues: tableData.rows.map((r) => r.ffeDeprec),
      depOfficeTiValues: tableData.rows.map((r) => r.officeTiAmort),
      depRetailTiValues: tableData.rows.map((r) => r.retailTiAmort),
      depOfficeLeasingCommValues: tableData.rows.map(
        (r) => r.officeLeasingCommAmort
      ),
      depRetailLeasingCommValues: tableData.rows.map(
        (r) => r.retailLeasingCommAmort
      ),
      depTotalValues: tableData.rows.map((r) => r.totalDeprecAmort),
      wcArValues: tableData.rows.map((r) => r.ar),
      wcApValues: tableData.rows.map((r) => r.ap),
      wcNetValues: tableData.rows.map((r) => r.netWc),
    };
    const store = useFinModelStore.getState();
    store.updateOfficeHoldSnapshot(merged, "operational");
    const officeDepreciation = buildOfficeDepreciationFromSnapshot(
      merged,
      yearRows,
      {
        constructionCost: constructionBase,
        ffe: ffeBase,
        officeTi: capitalBases.officeTiCapital,
        retailTi: capitalBases.retailTiCapital,
        officeLeasingComm: capitalBases.officeLeasingCommCapital,
        retailLeasingComm: capitalBases.retailLeasingCommCapital,
      }
    );
    if (officeDepreciation) {
      store.updateProjectInfo({ officeDepreciation }, "operational");
    }
  }, [
    constructionLife,
    ffeLife,
    ffeRenovationPctYear6,
    officeTiLife,
    retailTiLife,
    officeLeasingCommLife,
    retailLeasingCommLife,
    capitalBases,
    constructionBase,
    ffeBase,
    arMonths,
    apMonths,
    overrides,
    tableData,
  ]);

  useEffect(() => {
    const timer = setTimeout(persistSnapshot, 200);
    return () => clearTimeout(timer);
  }, [persistSnapshot]);

  useEffect(() => {
    if (Object.keys(overrides).length > 0) return;
    if (snap?.constructionLife != null) return;
    setConstructionLife(aiConstructionLife ?? resolved.constructionLife);
    setFfeLife(aiFfeLife ?? resolved.ffeLife);
    setFfeRenovationPctYear6(
      aiFfeRenovationPct ?? resolved.ffeRenovationPctYear6
    );
    setOfficeTiLife(aiOfficeTiLife ?? resolved.officeTiLife);
    setRetailTiLife(aiRetailTiLife ?? resolved.retailTiLife);
    setOfficeLeasingCommLife(
      aiLeasingCommLife ?? resolved.officeLeasingCommLife
    );
    setRetailLeasingCommLife(
      aiLeasingCommLife ?? resolved.retailLeasingCommLife
    );
    setArMonths(aiArMonths ?? resolved.arMonths);
    setApMonths(aiApMonths ?? resolved.apMonths);
  }, [
    overrides,
    snap?.constructionLife,
    resolved.constructionLife,
    resolved.ffeLife,
    resolved.ffeRenovationPctYear6,
    resolved.officeTiLife,
    resolved.retailTiLife,
    resolved.officeLeasingCommLife,
    resolved.retailLeasingCommLife,
    resolved.arMonths,
    resolved.apMonths,
    aiConstructionLife,
    aiFfeLife,
    aiFfeRenovationPct,
    aiOfficeTiLife,
    aiRetailTiLife,
    aiLeasingCommLife,
    aiArMonths,
    aiApMonths,
  ]);

  // Apply AI when it arrives (unless that field overridden)
  useEffect(() => {
    if (!aiC2) return;
    if (!overrides.constructionLife && aiConstructionLife != null) {
      setConstructionLife(aiConstructionLife);
    }
    if (!overrides.ffeLife && aiFfeLife != null) setFfeLife(aiFfeLife);
    if (!overrides.ffeRenovationPctYear6 && aiFfeRenovationPct != null) {
      setFfeRenovationPctYear6(aiFfeRenovationPct);
    }
    if (!overrides.officeTiLife && aiOfficeTiLife != null) {
      setOfficeTiLife(aiOfficeTiLife);
    }
    if (!overrides.retailTiLife && aiRetailTiLife != null) {
      setRetailTiLife(aiRetailTiLife);
    }
    if (!overrides.officeLeasingCommLife && aiLeasingCommLife != null) {
      setOfficeLeasingCommLife(aiLeasingCommLife);
    }
    if (!overrides.retailLeasingCommLife && aiLeasingCommLife != null) {
      setRetailLeasingCommLife(aiLeasingCommLife);
    }
    if (!overrides.arMonths && aiArMonths != null) setArMonths(aiArMonths);
    if (!overrides.apMonths && aiApMonths != null) setApMonths(aiApMonths);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    aiC2,
    aiConstructionLife,
    aiFfeLife,
    aiFfeRenovationPct,
    aiOfficeTiLife,
    aiRetailTiLife,
    aiLeasingCommLife,
    aiArMonths,
    aiApMonths,
  ]);

  const handleResetDeprec = () => {
    setConstructionLife(aiConstructionLife ?? resolved.constructionLife);
    setFfeLife(aiFfeLife ?? resolved.ffeLife);
    setFfeRenovationPctYear6(
      aiFfeRenovationPct ?? resolved.ffeRenovationPctYear6
    );
    setOverrides((prev) => {
      const next = { ...prev };
      delete next.depreciations;
      delete next.constructionLife;
      delete next.ffeLife;
      delete next.ffeRenovationPctYear6;
      return next;
    });
  };

  const handleResetTiComm = () => {
    setOfficeTiLife(aiOfficeTiLife ?? resolved.officeTiLife);
    setRetailTiLife(aiRetailTiLife ?? resolved.retailTiLife);
    setOfficeLeasingCommLife(
      aiLeasingCommLife ?? resolved.officeLeasingCommLife
    );
    setRetailLeasingCommLife(
      aiLeasingCommLife ?? resolved.retailLeasingCommLife
    );
    setOverrides((prev) => {
      const next = { ...prev };
      delete next.tiComm;
      delete next.officeTiLife;
      delete next.retailTiLife;
      delete next.officeLeasingCommLife;
      delete next.retailLeasingCommLife;
      return next;
    });
  };

  const handleResetWc = () => {
    setArMonths(aiArMonths ?? resolved.arMonths);
    setApMonths(aiApMonths ?? resolved.apMonths);
    setOverrides((prev) => {
      const next = { ...prev };
      delete next.wc;
      delete next.arMonths;
      delete next.apMonths;
      return next;
    });
  };

  const handleResetAll = () => {
    handleResetDeprec();
    handleResetTiComm();
    handleResetWc();
    setOverrides({});
    setManualYearValues({});
  };

  const handleFieldChange = (section: string, field: LifeFieldKey, value: number) => {
    const setters: Record<LifeFieldKey, (v: number) => void> = {
      constructionLife: setConstructionLife,
      ffeLife: setFfeLife,
      ffeRenovationPctYear6: setFfeRenovationPctYear6,
      officeTiLife: setOfficeTiLife,
      retailTiLife: setRetailTiLife,
      officeLeasingCommLife: setOfficeLeasingCommLife,
      retailLeasingCommLife: setRetailLeasingCommLife,
      arMonths: setArMonths,
      apMonths: setApMonths,
    };
    setters[field](value);
    // Field-specific override only (not section-wide)
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

  const fmtBase = (v: number) => `${v.toLocaleString()} ${currencyCode}`;

  const segmentLabel = (projectInfo?.officeSegment || "prime_tower").replace(
    /_/g,
    " "
  );
  const positioningLabel = (
    projectInfo?.officePositioning || "grade_a"
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-400">Construction Cost</p>
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
            <p className="text-xs text-slate-400">Office TI Allowance</p>
            <p className="mt-1 font-mono text-lg text-emerald-400">
              {fmtBase(capitalBases.officeTiCapital)}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              {cashOutflows.officeTiAllowance != null
                ? "From Component 1."
                : `${resolved.officeTiPsf} ${currencyCode}/sqft × office GLA.`}
            </p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-400">Retail TI Allowance</p>
            <p className="mt-1 font-mono text-lg text-emerald-400">
              {fmtBase(capitalBases.retailTiCapital)}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              {retailGla > 0
                ? cashOutflows.retailTiAllowance != null
                  ? "From Component 1."
                  : `${resolved.retailTiPsf} ${currencyCode}/sqft × retail GLA.`
                : "No retail GLA in Step 1."}
            </p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-400">Office Leasing Commissions</p>
            <p className="mt-1 font-mono text-lg text-emerald-400">
              {fmtBase(capitalBases.officeLeasingCommCapital)}
            </p>
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-400">Retail Leasing Commissions</p>
            <p className="mt-1 font-mono text-lg text-emerald-400">
              {fmtBase(capitalBases.retailLeasingCommCapital)}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 border-b border-slate-700 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-slate-500">BENCHMARK</span>
            <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
              <span className="text-xs text-slate-300">
                Office + Retail • {segmentLabel} • {positioningLabel} •{" "}
                {projectInfo?.country || "UAE"}
              </span>
            </div>
            {Object.values(overrides).some(Boolean) && (
              <div className="rounded-full border border-amber-600/50 bg-amber-900/30 px-3 py-1">
                <span className="text-xs text-amber-400">Manual overrides</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.values(overrides).some(Boolean) && (
              <button
                type="button"
                onClick={handleResetAll}
                className="text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
              >
                Reset to benchmark
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Useful Life &amp; Working Capital Assumptions
          </h3>
          <div className="flex flex-wrap gap-3 text-xs">
            <button
              type="button"
              onClick={handleResetDeprec}
              className={`font-medium transition-colors ${
                overrides.constructionLife ||
                overrides.ffeLife ||
                overrides.ffeRenovationPctYear6
                  ? "text-emerald-400 hover:text-emerald-300"
                  : "cursor-default text-slate-500"
              }`}
              disabled={
                !overrides.constructionLife &&
                !overrides.ffeLife &&
                !overrides.ffeRenovationPctYear6
              }
            >
              Reset deprec
            </button>
            <button
              type="button"
              onClick={handleResetTiComm}
              className={`font-medium transition-colors ${
                overrides.officeTiLife ||
                overrides.retailTiLife ||
                overrides.officeLeasingCommLife ||
                overrides.retailLeasingCommLife
                  ? "text-emerald-400 hover:text-emerald-300"
                  : "cursor-default text-slate-500"
              }`}
              disabled={
                !overrides.officeTiLife &&
                !overrides.retailTiLife &&
                !overrides.officeLeasingCommLife &&
                !overrides.retailLeasingCommLife
              }
            >
              Reset TI/comm
            </button>
            <button
              type="button"
              onClick={handleResetWc}
              className={`font-medium transition-colors ${
                overrides.arMonths || overrides.apMonths
                  ? "text-emerald-400 hover:text-emerald-300"
                  : "cursor-default text-slate-500"
              }`}
              disabled={!overrides.arMonths && !overrides.apMonths}
            >
              Reset WC
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.constructionLife}
              value={constructionLife}
              onChange={(val) =>
                handleFieldChange(
                  "depreciations",
                  "constructionLife",
                  Number(val)
                )
              }
              type="number"
              isAiGenerated={
                aiConstructionLife != null && !overrides.constructionLife
              }
              isManualOverride={!!overrides.constructionLife}
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.ffeLife}
              value={ffeLife}
              onChange={(val) =>
                handleFieldChange("depreciations", "ffeLife", Number(val))
              }
              type="number"
              isAiGenerated={aiFfeLife != null && !overrides.ffeLife}
              isManualOverride={!!overrides.ffeLife}
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.ffeRenovationPctYear6}
              value={ffeRenovationPctYear6}
              onChange={(val) =>
                handleFieldChange(
                  "depreciations",
                  "ffeRenovationPctYear6",
                  Number(val)
                )
              }
              type="percentage"
              isAiGenerated={
                aiFfeRenovationPct != null && !overrides.ffeRenovationPctYear6
              }
              isManualOverride={!!overrides.ffeRenovationPctYear6}
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.officeTiLife}
              value={officeTiLife}
              onChange={(val) =>
                handleFieldChange("tiComm", "officeTiLife", Number(val))
              }
              type="number"
              isAiGenerated={aiOfficeTiLife != null && !overrides.officeTiLife}
              isManualOverride={!!overrides.officeTiLife}
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.retailTiLife}
              value={retailTiLife}
              onChange={(val) =>
                handleFieldChange("tiComm", "retailTiLife", Number(val))
              }
              type="number"
              isAiGenerated={aiRetailTiLife != null && !overrides.retailTiLife}
              isManualOverride={!!overrides.retailTiLife}
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.officeLeasingCommLife}
              value={officeLeasingCommLife}
              onChange={(val) =>
                handleFieldChange("tiComm", "officeLeasingCommLife", Number(val))
              }
              type="number"
              isAiGenerated={
                aiLeasingCommLife != null && !overrides.officeLeasingCommLife
              }
              isManualOverride={!!overrides.officeLeasingCommLife}
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.retailLeasingCommLife}
              value={retailLeasingCommLife}
              onChange={(val) =>
                handleFieldChange("tiComm", "retailLeasingCommLife", Number(val))
              }
              type="number"
              isAiGenerated={
                aiLeasingCommLife != null && !overrides.retailLeasingCommLife
              }
              isManualOverride={!!overrides.retailLeasingCommLife}
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.arMonths}
              value={arMonths}
              onChange={(val) =>
                handleFieldChange("wc", "arMonths", Number(val))
              }
              type="number"
              step={0.5}
              isAiGenerated={aiArMonths != null && !overrides.arMonths}
              isManualOverride={!!overrides.arMonths}
            />
          </div>
          <div>
            <AiInput
              label={LIFE_FIELD_LABELS.apMonths}
              value={apMonths}
              onChange={(val) =>
                handleFieldChange("wc", "apMonths", Number(val))
              }
              type="number"
              step={0.5}
              isAiGenerated={aiApMonths != null && !overrides.apMonths}
              isManualOverride={!!overrides.apMonths}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR DEPRECIATION, AMORTIZATION &amp; WC TABLE ({currencyCode} M)
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
                <th className="border-r border-slate-700 px-2 py-3">FFE Deprec</th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Office TI
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Retail TI
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Off. Leas. Comm
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Ret. Leas. Comm
                </th>
                <th className="border-r border-slate-700 px-2 py-3 text-right">
                  Total D&amp;A
                </th>
                <th className="border-r border-slate-700 px-2 py-3">A/R</th>
                <th className="border-r border-slate-700 px-2 py-3">A/P</th>
                <th className="px-2 py-3 text-right">Net WC</th>
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row) => (
                <tr
                  key={row.year}
                  className={`border-b border-slate-800 transition ${row.isOverridden ? "bg-amber-900/10" : "hover:bg-slate-800/50"}`}
                >
                  <td className="border-r border-slate-700 px-2 py-3 font-medium text-white">
                    Y{row.year}
                  </td>
                  {DA_STREAMS.map((stream) => (
                    <td
                      key={stream}
                      className="border-r border-slate-700 px-2 py-3"
                    >
                      <input
                        type="number"
                        step={0.01}
                        value={(row[stream] / 1_000_000).toFixed(2)}
                        onChange={(e) =>
                          handleCellOverride(
                            row.year,
                            stream,
                            parseFloat(e.target.value) * 1_000_000
                          )
                        }
                        className={`w-16 rounded bg-slate-800 p-1 text-right ${manualYearValues[row.year]?.[stream] ? "border border-amber-500" : "border border-transparent"}`}
                      />
                    </td>
                  ))}
                  <td className="border-r border-slate-700 px-2 py-3 text-right font-mono text-emerald-400">
                    {(row.totalDeprecAmort / 1_000_000).toFixed(2)}
                  </td>
                  {(["ar", "ap"] as const).map((stream) => (
                    <td
                      key={stream}
                      className="border-r border-slate-700 px-2 py-3"
                    >
                      <input
                        type="number"
                        step={0.01}
                        value={(row[stream] / 1_000_000).toFixed(2)}
                        onChange={(e) =>
                          handleCellOverride(
                            row.year,
                            stream,
                            parseFloat(e.target.value) * 1_000_000
                          )
                        }
                        className={`w-16 rounded bg-slate-800 p-1 text-right ${manualYearValues[row.year]?.[stream] ? "border border-amber-500" : "border border-transparent"}`}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-3 text-right font-mono text-emerald-400">
                    {(row.netWc / 1_000_000).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800 font-bold text-white">
                <td className="border-r border-slate-700 px-2 py-3">
                  10-Year Total
                </td>
                <td colSpan={6} className="px-2 py-3 text-right text-slate-500">
                  D&amp;A: {(tableData.totals.total / 1_000_000).toFixed(2)}M
                </td>
                <td className="border-r border-slate-700 px-2 py-3 text-right text-emerald-400">
                  {(tableData.totals.total / 1_000_000).toFixed(2)}
                </td>
                <td colSpan={2} />
                <td className="px-2 py-3 text-right text-emerald-400">
                  {(tableData.totals.netWc / 1_000_000).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <p className="text-sm text-slate-300">
          <span className="font-medium text-amber-400">Note:</span> Working
          capital change (used in cash flow): Year 1 change = Net WC Year 1 − 0;
          Year 2+ change = Net WC Year t − Net WC Year t−1.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Total Depreciation &amp; Amortization by Year (AED M)
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
