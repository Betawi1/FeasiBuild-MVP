"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { resolveOfficeOpexBenchmark } from "@/lib/benchmarks/office-opex";
import type { OperationalOfficeHoldSnapshot } from "@/lib/operational-pnl";
import useFinModelStore from "@/store/useFinModelStore";
import type { OfficeOpexConfig } from "@/store/useFinModelStore";
import {
  getOperationalOfficeHoldSnapshot,
  leasedPctForYear,
} from "./OfficeRevenueStep";

export type OfficeOpexStepErrors = Record<string, string>;

export function buildOfficeOpexFromSnapshot(
  snap: OperationalOfficeHoldSnapshot | undefined
): OfficeOpexConfig | undefined {
  if (snap == null) return undefined;
  if (snap.camFixedBase == null && !snap.opexTotalValues?.length) {
    return undefined;
  }

  const projection: OfficeOpexConfig["projection"] = Array.from(
    { length: 10 },
    (_, i) => ({
      year: i + 1,
      cam: snap.opexCamValues?.[i] ?? 0,
      tax: snap.opexPropertyTaxValues?.[i] ?? 0,
      insurance: snap.opexInsuranceValues?.[i] ?? 0,
      marketing: snap.opexMarketingValues?.[i] ?? 0,
      gAndA: snap.opexGaValues?.[i] ?? 0,
      mgmtFee: snap.opexMgmtFeeValues?.[i] ?? 0,
      renovation: snap.opexRenovationValues?.[i] ?? 0,
      total: snap.opexTotalValues?.[i] ?? 0,
    })
  );

  const year1 = projection[0];
  return {
    camTotal: year1?.cam ?? 0,
    propertyTax: year1?.tax ?? snap.propertyTaxAnnual ?? 0,
    insurance: year1?.insurance ?? snap.insuranceAnnual ?? 0,
    cam: {
      fixedBase: snap.camFixedBase ?? 0,
      variableRate: snap.camVariableRate ?? 0,
    },
    property: {
      tax: snap.propertyTaxAnnual ?? 0,
      insurance: snap.insuranceAnnual ?? 0,
    },
    marketing: {
      pctOfRevenue: snap.marketingPctOfRevenue ?? 0,
      gAndA: snap.gAndAAnnual ?? 0,
    },
    management: { feePct: snap.mgmtFeePctOfRevenue ?? 0 },
    renovation: {
      year1: snap.renovationYear1 ?? 0,
      year2: snap.renovationYear2 ?? 0,
      years3to10: snap.renovationYears3to10 ?? 0,
    },
    projection,
  };
}

export function validateOfficeOpexStep(
  snap: OperationalOfficeHoldSnapshot | undefined
): OfficeOpexStepErrors {
  const next: OfficeOpexStepErrors = {};
  const officeGla = snap?.officeGlaSqft ?? 0;
  if (!Number.isFinite(officeGla) || officeGla <= 0) {
    next.officeGla = "Complete Step 1 (office GLA) before operating expenses.";
  }
  const rev =
    (snap?.totalBaseRentValues?.[0] ?? 0) +
    (snap?.otherIncomeTotalValues?.[0] ?? 0);
  if (!Number.isFinite(rev) || rev <= 0) {
    next.totalRevenue =
      "Total Year 1 revenue must be greater than 0 (configure Steps 1–2).";
  }
  return next;
}

type OpexRow = {
  year: number;
  cam: number;
  tax: number;
  insurance: number;
  marketing: number;
  gAndA: number;
  mgmtFee: number;
  renovation: number;
  total: number;
  isOverridden: boolean;
  blendedLeasedPct: number;
  totalRevenue: number;
};

const TABLE_STREAMS = [
  "cam",
  "tax",
  "insurance",
  "marketing",
  "gAndA",
  "mgmtFee",
  "renovation",
] as const;

export function blendedEffectiveLeasedPct(
  year: number,
  officeGla: number,
  retailGla: number,
  snap: OperationalOfficeHoldSnapshot | undefined
): number {
  const totalGla = officeGla + retailGla;
  if (totalGla <= 0) return 0;

  const officeLeased = leasedPctForYear(
    year,
    snap?.officeLeasedOpeningPct ?? 30,
    snap?.officeLeasedTargetPct ?? 90,
    snap?.officeLeaseUpYears ?? 2.5
  );
  let officeEff = officeLeased;
  if (year === 1) {
    officeEff =
      officeLeased * (1 - (snap?.officeFreeRentMonths ?? 6) / 12);
  }

  const retailLeased = leasedPctForYear(
    year,
    snap?.retailLeasedOpeningPct ?? 50,
    snap?.retailLeasedTargetPct ?? 95,
    snap?.retailLeaseUpYears ?? 1.5
  );
  let retailEff = retailLeased;
  if (year === 1) {
    retailEff =
      retailLeased * (1 - (snap?.retailFreeRentMonths ?? 3) / 12);
  }

  return (officeGla * officeEff + retailGla * retailEff) / totalGla;
}

export default function OfficeOpexStep() {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const step1 = useFinModelStore((s) => s.operational.officeHoldSnapshot);
  const currencyCode = projectInfo.currency || "AED";

  const benchmark = useMemo(
    () =>
      resolveOfficeOpexBenchmark(
        projectInfo?.country || "UAE",
        projectInfo?.officeSegment || "prime_tower",
        projectInfo?.officePositioning || "grade_a"
      ),
    [
      projectInfo?.country,
      projectInfo?.officeSegment,
      projectInfo?.officePositioning,
    ]
  );

  const officeGla = step1?.officeGlaSqft ?? 200_000;
  const retailGla = step1?.retailGlaSqft ?? 50_000;
  const totalGla = officeGla + retailGla;

  const baseRentValues = step1?.totalBaseRentValues ?? Array(10).fill(0);
  const otherIncomeValues =
    step1?.otherIncomeTotalValues ?? Array(10).fill(0);

  const [camFixedBase, setCamFixedBase] = useState(
    step1?.camFixedBase ?? benchmark.camFixedBase
  );
  const [camVariableRate, setCamVariableRate] = useState(
    step1?.camVariableRate ?? benchmark.camVariableRate
  );
  const [propertyTax, setPropertyTax] = useState(
    step1?.propertyTaxAnnual ?? benchmark.propertyTaxAnnual
  );
  const [insurance, setInsurance] = useState(
    step1?.insuranceAnnual ?? benchmark.insuranceAnnual
  );
  const [marketingPct, setMarketingPct] = useState(
    step1?.marketingPctOfRevenue ?? benchmark.marketingPctOfRevenue
  );
  const [gAndA, setGAndA] = useState(
    step1?.gAndAAnnual ?? benchmark.gAndAAnnual
  );
  const [mgmtFeePct, setMgmtFeePct] = useState(
    step1?.mgmtFeePctOfRevenue ?? benchmark.mgmtFeePctOfRevenue
  );
  const [renovationYear1, setRenovationYear1] = useState(
    step1?.renovationYear1 ?? benchmark.renovationYear1
  );
  const [renovationYear2, setRenovationYear2] = useState(
    step1?.renovationYear2 ?? benchmark.renovationYear2
  );
  const [renovationYears3to10, setRenovationYears3to10] = useState(
    step1?.renovationYears3to10 ?? benchmark.renovationYears3to10
  );

  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    () => step1?.opexSectionOverrides ?? {}
  );
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Record<string, number>>
  >({});

  const tableData = useMemo(() => {
    const rows: OpexRow[] = [];
    let totalCam = 0;
    let totalTax = 0;
    let totalInsurance = 0;
    let totalMarketing = 0;
    let totalGAndA = 0;
    let totalMgmtFee = 0;
    let totalRenovation = 0;
    let totalOpex = 0;

    for (let t = 1; t <= 10; t++) {
      const i = t - 1;
      const baseRent = baseRentValues[i] || 0;
      const otherIncome = otherIncomeValues[i] || 0;
      const totalRevenue = baseRent + otherIncome;

      const blendedLeasedPct = blendedEffectiveLeasedPct(
        t,
        officeGla,
        retailGla,
        step1
      );
      const camVariable =
        camVariableRate * totalGla * (blendedLeasedPct / 100);
      const camTotal = camFixedBase + camVariable;

      const taxAmount = propertyTax;
      const insuranceAmount = insurance;
      const marketingAmount = totalRevenue * (marketingPct / 100);
      const gAndAAmount = gAndA;
      const mgmtFeeAmount = totalRevenue * (mgmtFeePct / 100);

      let renovationPct = renovationYears3to10;
      if (t === 1) renovationPct = renovationYear1;
      else if (t === 2) renovationPct = renovationYear2;
      const renovationAmount = totalRevenue * (renovationPct / 100);

      const manual = manualYearValues[t] || {};

      const row: OpexRow = {
        year: t,
        cam: manual.cam ?? camTotal,
        tax: manual.tax ?? taxAmount,
        insurance: manual.insurance ?? insuranceAmount,
        marketing: manual.marketing ?? marketingAmount,
        gAndA: manual.gAndA ?? gAndAAmount,
        mgmtFee: manual.mgmtFee ?? mgmtFeeAmount,
        renovation: manual.renovation ?? renovationAmount,
        total: 0,
        isOverridden: Object.keys(manual).length > 0,
        blendedLeasedPct,
        totalRevenue,
      };
      row.total =
        manual.total ??
        row.cam +
          row.tax +
          row.insurance +
          row.marketing +
          row.gAndA +
          row.mgmtFee +
          row.renovation;

      totalCam += row.cam;
      totalTax += row.tax;
      totalInsurance += row.insurance;
      totalMarketing += row.marketing;
      totalGAndA += row.gAndA;
      totalMgmtFee += row.mgmtFee;
      totalRenovation += row.renovation;
      totalOpex += row.total;

      rows.push(row);
    }

    return {
      rows,
      totals: {
        cam: totalCam,
        tax: totalTax,
        insurance: totalInsurance,
        marketing: totalMarketing,
        gAndA: totalGAndA,
        mgmtFee: totalMgmtFee,
        renovation: totalRenovation,
        total: totalOpex,
      },
    };
  }, [
    officeGla,
    retailGla,
    step1,
    baseRentValues,
    otherIncomeValues,
    camFixedBase,
    camVariableRate,
    propertyTax,
    insurance,
    marketingPct,
    gAndA,
    mgmtFeePct,
    renovationYear1,
    renovationYear2,
    renovationYears3to10,
    manualYearValues,
  ]);

  const persistSnapshot = useCallback(() => {
    const prev = getOperationalOfficeHoldSnapshot();
    if (!prev) return;
    const merged: OperationalOfficeHoldSnapshot = {
      ...prev,
      officeGlaSqft: prev?.officeGlaSqft ?? officeGla,
      retailGlaSqft: prev?.retailGlaSqft ?? retailGla,
      totalBaseRentValues: prev?.totalBaseRentValues ?? baseRentValues,
      otherIncomeTotalValues:
        prev?.otherIncomeTotalValues ?? otherIncomeValues,
      camFixedBase,
      camVariableRate,
      propertyTaxAnnual: propertyTax,
      insuranceAnnual: insurance,
      marketingPctOfRevenue: marketingPct,
      gAndAAnnual: gAndA,
      mgmtFeePctOfRevenue: mgmtFeePct,
      renovationYear1,
      renovationYear2,
      renovationYears3to10,
      opexSectionOverrides: overrides,
      opexCamValues: tableData.rows.map((r) => r.cam),
      opexPropertyTaxValues: tableData.rows.map((r) => r.tax),
      opexInsuranceValues: tableData.rows.map((r) => r.insurance),
      opexMarketingValues: tableData.rows.map((r) => r.marketing),
      opexGaValues: tableData.rows.map((r) => r.gAndA),
      opexMgmtFeeValues: tableData.rows.map((r) => r.mgmtFee),
      opexRenovationValues: tableData.rows.map((r) => r.renovation),
      opexTotalValues: tableData.rows.map((r) => r.total),
      camExpensesAed: tableData.rows[0]?.cam,
      propertyTaxAed: tableData.rows[0]?.tax,
      insuranceAed: tableData.rows[0]?.insurance,
    };
    const store = useFinModelStore.getState();
    store.updateOfficeHoldSnapshot(merged, "operational");
    const officeOpex = buildOfficeOpexFromSnapshot(merged);
    if (officeOpex) {
      store.updateProjectInfo({ officeOpex }, "operational");
    }
  }, [
    officeGla,
    retailGla,
    baseRentValues,
    otherIncomeValues,
    camFixedBase,
    camVariableRate,
    propertyTax,
    insurance,
    marketingPct,
    gAndA,
    mgmtFeePct,
    renovationYear1,
    renovationYear2,
    renovationYears3to10,
    overrides,
    tableData.rows,
  ]);

  useEffect(() => {
    const timer = setTimeout(persistSnapshot, 200);
    return () => clearTimeout(timer);
  }, [persistSnapshot]);

  useEffect(() => {
    if (!benchmark || Object.keys(overrides).length > 0) return;
    if (step1?.camFixedBase != null) return;
    setCamFixedBase(benchmark.camFixedBase);
    setCamVariableRate(benchmark.camVariableRate);
    setPropertyTax(benchmark.propertyTaxAnnual);
    setInsurance(benchmark.insuranceAnnual);
    setMarketingPct(benchmark.marketingPctOfRevenue);
    setGAndA(benchmark.gAndAAnnual);
    setMgmtFeePct(benchmark.mgmtFeePctOfRevenue);
    setRenovationYear1(benchmark.renovationYear1);
    setRenovationYear2(benchmark.renovationYear2);
    setRenovationYears3to10(benchmark.renovationYears3to10);
  }, [benchmark, overrides, step1?.camFixedBase]);

  const handleResetSection = (section: string) => {
    if (section === "cam") {
      setCamFixedBase(benchmark.camFixedBase);
      setCamVariableRate(benchmark.camVariableRate);
      setOverrides((prev) => ({ ...prev, cam: false }));
    } else if (section === "propIns") {
      setPropertyTax(benchmark.propertyTaxAnnual);
      setInsurance(benchmark.insuranceAnnual);
      setOverrides((prev) => ({ ...prev, propIns: false }));
    } else if (section === "mktGa") {
      setMarketingPct(benchmark.marketingPctOfRevenue);
      setGAndA(benchmark.gAndAAnnual);
      setOverrides((prev) => ({ ...prev, mktGa: false }));
    } else if (section === "mgmt") {
      setMgmtFeePct(benchmark.mgmtFeePctOfRevenue);
      setOverrides((prev) => ({ ...prev, mgmt: false }));
    } else if (section === "ren") {
      setRenovationYear1(benchmark.renovationYear1);
      setRenovationYear2(benchmark.renovationYear2);
      setRenovationYears3to10(benchmark.renovationYears3to10);
      setOverrides((prev) => ({ ...prev, ren: false }));
    }
  };

  const handleResetAll = () => {
    setCamFixedBase(benchmark.camFixedBase);
    setCamVariableRate(benchmark.camVariableRate);
    setPropertyTax(benchmark.propertyTaxAnnual);
    setInsurance(benchmark.insuranceAnnual);
    setMarketingPct(benchmark.marketingPctOfRevenue);
    setGAndA(benchmark.gAndAAnnual);
    setMgmtFeePct(benchmark.mgmtFeePctOfRevenue);
    setRenovationYear1(benchmark.renovationYear1);
    setRenovationYear2(benchmark.renovationYear2);
    setRenovationYears3to10(benchmark.renovationYears3to10);
    setOverrides({});
    setManualYearValues({});
  };

  const handleFieldChange = (section: string, field: string, value: number) => {
    const setters: Record<string, (v: number) => void> = {
      camFixedBase: setCamFixedBase,
      camVariableRate: setCamVariableRate,
      propertyTax: setPropertyTax,
      insurance: setInsurance,
      marketingPct: setMarketingPct,
      gAndA: setGAndA,
      mgmtFeePct: setMgmtFeePct,
      renovationYear1: setRenovationYear1,
      renovationYear2: setRenovationYear2,
      renovationYears3to10: setRenovationYears3to10,
    };

    if (setters[field]) {
      setters[field](value);
      setOverrides((prev) => ({ ...prev, [section]: true }));
    }
  };

  const handleCellOverride = (year: number, stream: string, value: number) => {
    setManualYearValues((prev) => ({
      ...prev,
      [year]: { ...prev[year], [stream]: value },
    }));
  };

  const chartData = tableData.rows.map((row) => ({
    year: `Y${row.year}`,
    CAM: row.cam / 1_000_000,
    "Property Tax": row.tax / 1_000_000,
    Insurance: row.insurance / 1_000_000,
    Marketing: row.marketing / 1_000_000,
    "G&A": row.gAndA / 1_000_000,
    "Mgmt Fee": row.mgmtFee / 1_000_000,
    Renovation: row.renovation / 1_000_000,
  }));

  const segmentLabel =
    projectInfo?.officeSegment?.replace(/_/g, " ") ?? "prime tower";
  const positioningLabel =
    projectInfo?.officePositioning?.replace(/_/g, " ") ?? "grade a";

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 3 — Operating Expenses
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Expenses include CAM, property tax, insurance, marketing, G&amp;A,
          management fee, and renovation.
          <span className="ml-1 text-amber-500">Amber borders</span> indicate
          manual overrides.
        </p>
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
            {Object.values(overrides).some((v) => v) && (
              <div className="rounded-full border border-amber-600/50 bg-amber-900/30 px-3 py-1">
                <span className="text-xs text-amber-400">Manual overrides</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleResetSection("cam")}
              className="text-emerald-400 transition hover:text-emerald-300"
            >
              Reset CAM
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => handleResetSection("propIns")}
              className="text-emerald-400 transition hover:text-emerald-300"
            >
              Reset prop/ins
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => handleResetSection("mktGa")}
              className="text-emerald-400 transition hover:text-emerald-300"
            >
              Reset marketing/G&amp;A
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => handleResetSection("mgmt")}
              className="text-emerald-400 transition hover:text-emerald-300"
            >
              Reset mgmt fee
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => handleResetSection("ren")}
              className="text-emerald-400 transition hover:text-emerald-300"
            >
              Reset renovation
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={handleResetAll}
              className="text-emerald-400 transition hover:text-emerald-300"
            >
              Reset all
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          CAM (Common Area Maintenance)
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              CAM – Fixed base ({currencyCode}/year)
            </label>
            <input
              type="number"
              value={camFixedBase}
              onChange={(e) =>
                handleFieldChange("cam", "camFixedBase", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.cam ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Does not change with lease-up
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              CAM – Variable rate ({currencyCode}/psf × blended leased %)
            </label>
            <input
              type="number"
              value={camVariableRate}
              onChange={(e) =>
                handleFieldChange(
                  "cam",
                  "camVariableRate",
                  Number(e.target.value)
                )
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.cam ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              × (Office + Retail GLA × blended effective leased %)
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Blended leased % weights office and retail GLA from Step 1 (including
          free-rent in Year 1). Total GLA: {totalGla.toLocaleString()} sqft.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Property &amp; Insurance
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Property tax ({currencyCode}/year)
            </label>
            <input
              type="number"
              value={propertyTax}
              onChange={(e) =>
                handleFieldChange("propIns", "propertyTax", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.propIns ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Insurance ({currencyCode}/year)
            </label>
            <input
              type="number"
              value={insurance}
              onChange={(e) =>
                handleFieldChange("propIns", "insurance", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.propIns ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Marketing &amp; G&amp;A
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Marketing (% of total revenue)
            </label>
            <input
              type="number"
              step={0.1}
              value={marketingPct}
              onChange={(e) =>
                handleFieldChange("mktGa", "marketingPct", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.mktGa ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Total revenue = Step 1 base rent + Step 2 other income
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              G&amp;A ({currencyCode}/year)
            </label>
            <input
              type="number"
              value={gAndA}
              onChange={(e) =>
                handleFieldChange("mktGa", "gAndA", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.mktGa ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Management Fee</h3>
        <div className="max-w-xs">
          <label className="mb-1 block text-xs text-slate-400">
            Base management fee (% of total revenue)
          </label>
          <input
            type="number"
            step={0.1}
            value={mgmtFeePct}
            onChange={(e) =>
              handleFieldChange("mgmt", "mgmtFeePct", Number(e.target.value))
            }
            className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.mgmt ? "border-2 border-amber-500" : "border border-slate-600"}`}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Renovation / Capex Provision
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Year 1 (% of EGI)
            </label>
            <input
              type="number"
              step={0.1}
              value={renovationYear1}
              onChange={(e) =>
                handleFieldChange("ren", "renovationYear1", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.ren ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Year 2 (% of EGI)
            </label>
            <input
              type="number"
              step={0.1}
              value={renovationYear2}
              onChange={(e) =>
                handleFieldChange("ren", "renovationYear2", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.ren ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Years 3–10 (% of EGI)
            </label>
            <input
              type="number"
              step={0.1}
              value={renovationYears3to10}
              onChange={(e) =>
                handleFieldChange(
                  "ren",
                  "renovationYears3to10",
                  Number(e.target.value)
                )
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.ren ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR EXPENSES TABLE ({currencyCode} M)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-3">Year</th>
                <th className="px-3 py-3">Blended %</th>
                <th className="px-3 py-3">CAM (M)</th>
                <th className="px-3 py-3">Prop Tax (M)</th>
                <th className="px-3 py-3">Insurance (M)</th>
                <th className="px-3 py-3">Marketing (M)</th>
                <th className="px-3 py-3">G&amp;A (M)</th>
                <th className="px-3 py-3">Mgmt Fee (M)</th>
                <th className="px-3 py-3">Renovation (M)</th>
                <th className="px-3 py-3 text-right">Total Opex (M)</th>
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row) => (
                <tr
                  key={row.year}
                  className={`border-b border-slate-800 transition ${row.isOverridden ? "bg-amber-900/10" : "hover:bg-slate-800/50"}`}
                >
                  <td className="px-3 py-3 font-medium text-white">
                    Y{row.year}
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    {row.blendedLeasedPct.toFixed(1)}%
                  </td>
                  {TABLE_STREAMS.map((stream) => (
                    <td key={stream} className="px-3 py-3">
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
                        className={`w-20 rounded bg-slate-800 p-1 text-right ${manualYearValues[row.year]?.[stream] ? "border border-amber-500" : "border border-transparent"}`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-400">
                    {(row.total / 1_000_000).toFixed(2)}
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-800 font-bold text-white">
                <td className="px-3 py-3" colSpan={2}>
                  10-Year Total
                </td>
                {TABLE_STREAMS.map((stream) => (
                  <td
                    key={stream}
                    className="px-3 py-3 text-right text-emerald-400"
                  >
                    {(tableData.totals[stream] / 1_000_000).toFixed(2)}
                  </td>
                ))}
                <td className="px-3 py-3 text-right text-emerald-400">
                  {(tableData.totals.total / 1_000_000).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Total Operating Expenses by Year (Stacked)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
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
              <Legend
                wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }}
              />
              <Bar dataKey="CAM" stackId="a" fill="#10b981" />
              <Bar dataKey="Property Tax" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Insurance" stackId="a" fill="#6366f1" />
              <Bar dataKey="Marketing" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="G&A" stackId="a" fill="#a78bfa" />
              <Bar dataKey="Mgmt Fee" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Renovation" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
