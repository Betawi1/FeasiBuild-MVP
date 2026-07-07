"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getRetailOpexBenchmark } from "@/lib/benchmarks/retail-opex";
import useFinModelStore from "@/store/useFinModelStore";
import type { RetailOpexConfig } from "@/store/useFinModelStore";
import type { OperationalRetailHoldSnapshot } from "@/lib/operational-pnl";
import { totalOperationalBua } from "@/lib/operational-pnl";

export type RetailOpexStepErrors = Record<string, string>;

export function getOperationalRetailHoldSnapshot():
  | OperationalRetailHoldSnapshot
  | undefined {
  return useFinModelStore.getState().operational?.retailHoldSnapshot;
}

/** Build `projectInfo.retailOpex` payload from persisted hold snapshot. */
export function buildRetailOpexFromSnapshot(
  snap: OperationalRetailHoldSnapshot | undefined
): RetailOpexConfig | undefined {
  if (snap == null) return undefined;
  if (
    snap.camFixedBaseRate == null &&
    snap.camFixedBase == null &&
    !snap.opexTotalValues?.length
  ) {
    return undefined;
  }

  const projection: RetailOpexConfig["projection"] = Array.from(
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

  return {
    cam: {
      fixedBaseRate: snap.camFixedBaseRate ?? 0,
      variableRate: snap.camVariableRate ?? 0,
    },
    property: {
      taxPctOfGrossRent: snap.propertyTaxPctOfGrossRent ?? 0,
      insurancePctOfGrossRent: snap.insurancePctOfGrossRent ?? 0,
    },
    marketing: {
      pctOfRevenue: snap.marketingPctOfRevenue ?? 0,
      gAndAPctOfRevenue: snap.gAndAPctOfRevenue ?? 0,
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

export function validateRetailOpexStep(
  snap: OperationalRetailHoldSnapshot | undefined
): RetailOpexStepErrors {
  const next: RetailOpexStepErrors = {};
  const gla = snap?.glaSqft ?? 0;
  if (!Number.isFinite(gla) || gla <= 0) {
    next.glaSqft = "Complete Steps 1–2 before operating expenses.";
  }
  const rev =
    (snap?.revenueValues?.[0] ?? 0) + (snap?.otherIncomeTotalValues?.[0] ?? 0);
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
  recoverableExpenses: number;
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

type TableStream = (typeof TABLE_STREAMS)[number];

function roundPct2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function effectiveLeasedPctForYear(
  yearIndex0: number,
  gla: number,
  step1: OperationalRetailHoldSnapshot | undefined
): number {
  const occ = step1?.occupancyValues?.[yearIndex0];
  if (occ != null && Number.isFinite(occ)) return occ;
  const effSqft = step1?.effectiveLeasedValues?.[yearIndex0];
  if (effSqft != null && gla > 0) return (effSqft / gla) * 100;
  const y1Occ = step1?.occupancyValues?.[0];
  if (y1Occ != null && Number.isFinite(y1Occ)) return y1Occ;
  return 95;
}

export default function RetailOpexStep() {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const step1Data = useFinModelStore((s) => s.operational.retailHoldSnapshot);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const currencyCode = projectInfo.currency || "AED";

  const totalBua = totalOperationalBua(cashOutflows);

  const benchmark = useMemo(
    () =>
      getRetailOpexBenchmark(
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

  const gla = step1Data?.glaSqft || 500_000;
  const minRentValues = step1Data?.revenueValues || Array(10).fill(0);
  const otherIncomeValues =
    step1Data?.otherIncomeTotalValues || Array(10).fill(0);

  const resolveCamFixedBaseRate = () => {
    if (step1Data?.camFixedBaseRate != null && step1Data.camFixedBaseRate > 0) {
      return step1Data.camFixedBaseRate;
    }
    if (step1Data?.camFixedBase != null && totalBua > 0) {
      return step1Data.camFixedBase / totalBua;
    }
    return benchmark?.camFixedBaseRate ?? 2;
  };

  const resolvePropertyTaxPct = () => {
    if (
      step1Data?.propertyTaxPctOfGrossRent != null &&
      step1Data.propertyTaxPctOfGrossRent > 0
    ) {
      return roundPct2(step1Data.propertyTaxPctOfGrossRent);
    }
    const grossY1 = minRentValues[0] ?? 0;
    if (step1Data?.propertyTaxAnnual != null && grossY1 > 0) {
      return roundPct2((step1Data.propertyTaxAnnual / grossY1) * 100);
    }
    return roundPct2(benchmark?.propertyTaxPctOfGrossRent ?? 0.8);
  };

  const resolveInsurancePct = () => {
    if (
      step1Data?.insurancePctOfGrossRent != null &&
      step1Data.insurancePctOfGrossRent > 0
    ) {
      return roundPct2(step1Data.insurancePctOfGrossRent);
    }
    const grossY1 = minRentValues[0] ?? 0;
    if (step1Data?.insuranceAnnual != null && grossY1 > 0) {
      return roundPct2((step1Data.insuranceAnnual / grossY1) * 100);
    }
    return roundPct2(benchmark?.insurancePctOfGrossRent ?? 0.16);
  };

  const resolveGAndAPct = () => {
    if (step1Data?.gAndAPctOfRevenue != null && step1Data.gAndAPctOfRevenue > 0) {
      return roundPct2(step1Data.gAndAPctOfRevenue);
    }
    const totalY1 = (minRentValues[0] ?? 0) + (otherIncomeValues[0] ?? 0);
    if (step1Data?.gAndAAnnual != null && totalY1 > 0) {
      return roundPct2((step1Data.gAndAAnnual / totalY1) * 100);
    }
    return roundPct2(benchmark?.gAndAPctOfRevenue ?? 0.43);
  };

  const [camFixedBaseRate, setCamFixedBaseRate] = useState(() =>
    resolveCamFixedBaseRate()
  );
  const [camVariableRate, setCamVariableRate] = useState(
    step1Data?.camVariableRate ?? benchmark?.camVariableRate ?? 12
  );
  const [propertyTaxPct, setPropertyTaxPct] = useState(() =>
    resolvePropertyTaxPct()
  );
  const [insurancePct, setInsurancePct] = useState(() => resolveInsurancePct());
  const [marketingPct, setMarketingPct] = useState(
    step1Data?.marketingPctOfRevenue ?? benchmark?.marketingPctOfRevenue ?? 1.8
  );
  const [gAndAPct, setGAndAPct] = useState(() => resolveGAndAPct());
  const [mgmtFeePct, setMgmtFeePct] = useState(
    step1Data?.mgmtFeePctOfRevenue ?? benchmark?.mgmtFeePctOfRevenue ?? 2.8
  );
  const [renovationYear1, setRenovationYear1] = useState(
    step1Data?.renovationYear1 ?? benchmark?.renovationYear1 ?? 1.2
  );
  const [renovationYear2, setRenovationYear2] = useState(
    step1Data?.renovationYear2 ?? benchmark?.renovationYear2 ?? 2.0
  );
  const [renovationYears3to10, setRenovationYears3to10] = useState(
    step1Data?.renovationYears3to10 ?? benchmark?.renovationYears3to10 ?? 3.0
  );

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Record<string, number>>
  >({});

  const recoveryRate = step1Data?.recoveryRate ?? 95;

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
      const minRent = minRentValues[i] || 0;
      const otherIncome = otherIncomeValues[i] || 0;
      const totalRevenue = minRent + otherIncome;
      const grossRentalRevenue = minRent;

      const leasedGla =
        step1Data?.effectiveLeasedValues?.[i] ??
        gla * (effectiveLeasedPctForYear(i, gla, step1Data) / 100);
      const camFixedTotal = camFixedBaseRate * totalBua;
      const camVariableTotal = camVariableRate * leasedGla;
      const camTotal = camFixedTotal + camVariableTotal;

      const taxAmount = grossRentalRevenue * (propertyTaxPct / 100);
      const insuranceAmount = grossRentalRevenue * (insurancePct / 100);
      const marketingAmount = totalRevenue * (marketingPct / 100);
      const gAndAAmount = totalRevenue * (gAndAPct / 100);
      const mgmtFeeAmount = totalRevenue * (mgmtFeePct / 100);

      let renovationPct = renovationYears3to10;
      if (t === 1) renovationPct = renovationYear1;
      else if (t === 2) renovationPct = renovationYear2;
      const renovationAmount = totalRevenue * (renovationPct / 100);

      const opexTotal =
        camTotal +
        taxAmount +
        insuranceAmount +
        marketingAmount +
        gAndAAmount +
        mgmtFeeAmount +
        renovationAmount;

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
        recoverableExpenses: camTotal + taxAmount + insuranceAmount,
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
    gla,
    totalBua,
    step1Data,
    minRentValues,
    otherIncomeValues,
    camFixedBaseRate,
    camVariableRate,
    propertyTaxPct,
    insurancePct,
    marketingPct,
    gAndAPct,
    mgmtFeePct,
    renovationYear1,
    renovationYear2,
    renovationYears3to10,
    manualYearValues,
  ]);

  const recoverableInsight = useMemo(() => {
    const year1Row = tableData.rows[0];
    if (!year1Row) return null;

    const recoverableExpenses = year1Row.recoverableExpenses;
    const recoveryIncome = recoverableExpenses * (recoveryRate / 100);
    const netRecoverable = recoverableExpenses - recoveryIncome;

    return { recoverableExpenses, recoveryIncome, netRecoverable };
  }, [tableData.rows, recoveryRate]);

  const persistSnapshot = useCallback(() => {
    const prev = getOperationalRetailHoldSnapshot();
    const merged: OperationalRetailHoldSnapshot = {
      ...prev,
      glaSqft: prev?.glaSqft ?? gla,
      rentEscalationPct: prev?.rentEscalationPct ?? 0,
      baseRentPerSqftValues: prev?.baseRentPerSqftValues ?? [],
      occupancyValues: prev?.occupancyValues ?? [],
      effectiveLeasedValues: prev?.effectiveLeasedValues ?? [],
      revenueValues: prev?.revenueValues ?? minRentValues,
      camFixedBaseRate,
      camVariableRate,
      propertyTaxPctOfGrossRent: propertyTaxPct,
      insurancePctOfGrossRent: insurancePct,
      marketingPctOfRevenue: marketingPct,
      gAndAPctOfRevenue: gAndAPct,
      mgmtFeePctOfRevenue: mgmtFeePct,
      renovationYear1,
      renovationYear2,
      renovationYears3to10,
      opexCamValues: tableData.rows.map((r) => r.cam),
      opexPropertyTaxValues: tableData.rows.map((r) => r.tax),
      opexInsuranceValues: tableData.rows.map((r) => r.insurance),
      opexMarketingValues: tableData.rows.map((r) => r.marketing),
      opexGaValues: tableData.rows.map((r) => r.gAndA),
      opexMgmtFeeValues: tableData.rows.map((r) => r.mgmtFee),
      opexRenovationValues: tableData.rows.map((r) => r.renovation),
      opexTotalValues: tableData.rows.map((r) => r.total),
    };
    const store = useFinModelStore.getState();
    store.updateRetailHoldSnapshot(merged, "operational");
    const retailOpex = buildRetailOpexFromSnapshot(merged);
    if (retailOpex) {
      store.updateProjectInfo({ retailOpex }, "operational");
    }
  }, [
    gla,
    minRentValues,
    camFixedBaseRate,
    camVariableRate,
    propertyTaxPct,
    insurancePct,
    marketingPct,
    gAndAPct,
    mgmtFeePct,
    renovationYear1,
    renovationYear2,
    renovationYears3to10,
    tableData.rows,
  ]);

  useEffect(() => {
    const timer = setTimeout(persistSnapshot, 200);
    return () => clearTimeout(timer);
  }, [persistSnapshot]);

  useEffect(() => {
    if (!benchmark || Object.keys(overrides).length > 0) return;
    if (step1Data?.camFixedBaseRate != null || step1Data?.camFixedBase != null) {
      return;
    }
    setCamFixedBaseRate(benchmark.camFixedBaseRate);
    setCamVariableRate(benchmark.camVariableRate);
    setPropertyTaxPct(roundPct2(benchmark.propertyTaxPctOfGrossRent));
    setInsurancePct(roundPct2(benchmark.insurancePctOfGrossRent));
    setMarketingPct(benchmark.marketingPctOfRevenue);
    setGAndAPct(roundPct2(benchmark.gAndAPctOfRevenue));
    setMgmtFeePct(benchmark.mgmtFeePctOfRevenue);
    setRenovationYear1(benchmark.renovationYear1);
    setRenovationYear2(benchmark.renovationYear2);
    setRenovationYears3to10(benchmark.renovationYears3to10);
  }, [benchmark, overrides, step1Data?.camFixedBaseRate, step1Data?.camFixedBase]);

  const handleResetAll = () => {
    if (!benchmark) return;
    setCamFixedBaseRate(benchmark.camFixedBaseRate);
    setCamVariableRate(benchmark.camVariableRate);
    setPropertyTaxPct(roundPct2(benchmark.propertyTaxPctOfGrossRent));
    setInsurancePct(roundPct2(benchmark.insurancePctOfGrossRent));
    setMarketingPct(benchmark.marketingPctOfRevenue);
    setGAndAPct(roundPct2(benchmark.gAndAPctOfRevenue));
    setMgmtFeePct(benchmark.mgmtFeePctOfRevenue);
    setRenovationYear1(benchmark.renovationYear1);
    setRenovationYear2(benchmark.renovationYear2);
    setRenovationYears3to10(benchmark.renovationYears3to10);
    setOverrides({});
    setManualYearValues({});
  };

  const handleFieldChange = (field: string, value: number) => {
    const pctFields2dp = new Set(["propertyTaxPct", "insurancePct", "gAndAPct"]);
    const normalized = pctFields2dp.has(field) ? roundPct2(value) : value;

    const setters: Record<string, (v: number) => void> = {
      camFixedBaseRate: setCamFixedBaseRate,
      camVariableRate: setCamVariableRate,
      propertyTaxPct: setPropertyTaxPct,
      insurancePct: setInsurancePct,
      marketingPct: setMarketingPct,
      gAndAPct: setGAndAPct,
      mgmtFeePct: setMgmtFeePct,
      renovationYear1: setRenovationYear1,
      renovationYear2: setRenovationYear2,
      renovationYears3to10: setRenovationYears3to10,
    };

    if (setters[field]) {
      setters[field](normalized);
      setOverrides((prev) => ({ ...prev, [field]: true }));
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

  const getRowStreamValue = (row: OpexRow, stream: TableStream): number =>
    row[stream];

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 3 — Operating Expenses
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Configure mall operating expenses.
          <span className="ml-1 text-amber-500">Amber borders</span> indicate
          manual overrides.
        </p>
      </div>

      {benchmark && (
        <div className="mb-6 border-b border-slate-700 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500">
                BENCHMARK
              </span>
              <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
                <span className="text-xs text-slate-300">
                  Retail •{" "}
                  {projectInfo?.retailSegment?.replace(/_/g, " ")} •{" "}
                  {projectInfo?.retailPositioning?.replace(/_/g, " ")} •{" "}
                  {projectInfo?.country}
                </span>
              </div>
              {Object.values(overrides).some((v) => v) && (
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
              Use profile defaults
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          A. CAM (Common Area Maintenance)
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              CAM – Fixed Base Rate ({currencyCode}/psf of BUA/year)
            </label>
            <input
              type="number"
              step={0.01}
              value={camFixedBaseRate}
              onChange={(e) =>
                handleFieldChange("camFixedBaseRate", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.camFixedBaseRate ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Annual fixed CAM = rate × total BUA (
              {totalBua.toLocaleString()} sqft from Component 1)
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              CAM – Variable Rate ({currencyCode}/psf of leased GLA)
            </label>
            <input
              type="number"
              value={camVariableRate}
              onChange={(e) =>
                handleFieldChange("camVariableRate", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.camVariableRate ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Multiplied by leased GLA (from Step 1)
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          <strong>Note:</strong> Total CAM = (Fixed rate × Total BUA) + (Variable
          rate × Leased GLA)
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          B. Property Tax &amp; Insurance
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Property Tax (% of Gross Rental Revenue)
            </label>
            <input
              type="number"
              step={0.01}
              min={0}
              max={100}
              placeholder="e.g., 5"
              value={propertyTaxPct}
              onChange={(e) =>
                handleFieldChange("propertyTaxPct", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.propertyTaxPct ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
            <p className="mt-1 text-sm text-slate-500">
              Applied to Step 1 base rent revenue each year
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Insurance (% of Gross Rental Revenue)
            </label>
            <input
              type="number"
              step={0.01}
              min={0}
              max={100}
              placeholder="e.g., 1.5"
              value={insurancePct}
              onChange={(e) =>
                handleFieldChange("insurancePct", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.insurancePct ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
            <p className="mt-1 text-sm text-slate-500">
              Applied to Step 1 base rent revenue each year
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          C. Marketing &amp; G&amp;A
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Marketing (% of Total Revenue)
            </label>
            <input
              type="number"
              step={0.1}
              value={marketingPct}
              onChange={(e) =>
                handleFieldChange("marketingPct", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.marketingPct ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              % of (Min Rent + Other Income) from Steps 1 &amp; 2
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              G&amp;A (% of Total Revenue)
            </label>
            <input
              type="number"
              step={0.01}
              min={0}
              max={100}
              placeholder="e.g., 1"
              value={gAndAPct}
              onChange={(e) => handleFieldChange("gAndAPct", Number(e.target.value))}
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.gAndAPct ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              % of (Base Rent + Other Income) from Steps 1 &amp; 2
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          D. Management Fee
        </h3>
        <div className="max-w-xs">
          <label className="mb-1 block text-xs text-slate-400">
            Base Management Fee (% of Total Revenue)
          </label>
          <input
            type="number"
            step={0.1}
            value={mgmtFeePct}
            onChange={(e) =>
              handleFieldChange("mgmtFeePct", Number(e.target.value))
            }
            className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.mgmtFeePct ? "border-2 border-amber-500" : "border border-slate-600"}`}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          E. Renovation / Capex Provision
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Year 1 (% of Revenue)
            </label>
            <input
              type="number"
              step={0.1}
              value={renovationYear1}
              onChange={(e) =>
                handleFieldChange("renovationYear1", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.renovationYear1 ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Year 2 (% of Revenue)
            </label>
            <input
              type="number"
              step={0.1}
              value={renovationYear2}
              onChange={(e) =>
                handleFieldChange("renovationYear2", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.renovationYear2 ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Years 3–10 (% of Revenue)
            </label>
            <input
              type="number"
              step={0.1}
              value={renovationYears3to10}
              onChange={(e) =>
                handleFieldChange(
                  "renovationYears3to10",
                  Number(e.target.value)
                )
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.renovationYears3to10 ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          You can override any year&apos;s amount directly in the table below.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-3">Year</th>
              <th className="px-3 py-3">CAM ({currencyCode})</th>
              <th className="px-3 py-3">Tax ({currencyCode})</th>
              <th className="px-3 py-3">Insurance ({currencyCode})</th>
              <th className="px-3 py-3">Marketing ({currencyCode})</th>
              <th className="px-3 py-3">G&amp;A ({currencyCode})</th>
              <th className="px-3 py-3">Mgmt Fee ({currencyCode})</th>
              <th className="px-3 py-3">Renovation ({currencyCode})</th>
              <th className="px-3 py-3 text-right">
                Total Opex ({currencyCode})
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row) => (
              <tr
                key={row.year}
                className={`border-b border-slate-800 transition ${row.isOverridden ? "bg-amber-900/10" : "hover:bg-slate-800/50"}`}
              >
                <td className="px-3 py-3 font-medium text-white">Y{row.year}</td>
                {TABLE_STREAMS.map((stream) => (
                  <td key={stream} className="px-3 py-3">
                    <input
                      type="number"
                      value={(getRowStreamValue(row, stream) / 1000).toFixed(0)}
                      onChange={(e) =>
                        handleCellOverride(
                          row.year,
                          stream,
                          parseFloat(e.target.value) * 1000
                        )
                      }
                      className={`w-24 rounded bg-slate-800 p-1 text-right ${manualYearValues[row.year]?.[stream] ? "border border-amber-500" : "border border-transparent"}`}
                    />
                  </td>
                ))}
                <td className="px-3 py-3 text-right font-mono text-emerald-400">
                  {(row.total / 1000).toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-800 font-bold text-white">
              <td className="px-3 py-3">10-Year Total</td>
              <td className="px-3 py-3 text-right">
                {(tableData.totals.cam / 1000).toLocaleString()}
              </td>
              <td className="px-3 py-3 text-right">
                {(tableData.totals.tax / 1000).toLocaleString()}
              </td>
              <td className="px-3 py-3 text-right">
                {(tableData.totals.insurance / 1000).toLocaleString()}
              </td>
              <td className="px-3 py-3 text-right">
                {(tableData.totals.marketing / 1000).toLocaleString()}
              </td>
              <td className="px-3 py-3 text-right">
                {(tableData.totals.gAndA / 1000).toLocaleString()}
              </td>
              <td className="px-3 py-3 text-right">
                {(tableData.totals.mgmtFee / 1000).toLocaleString()}
              </td>
              <td className="px-3 py-3 text-right">
                {(tableData.totals.renovation / 1000).toLocaleString()}
              </td>
              <td className="px-3 py-3 text-right text-emerald-400">
                {(tableData.totals.total / 1000).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {recoverableInsight && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-sm text-slate-300">
            <span className="font-medium">
              Recoverable expenses (CAM + Property tax + Insurance):
            </span>{" "}
            <span className="text-emerald-400">
              Year 1 = {recoverableInsight.recoverableExpenses.toLocaleString()}{" "}
              {currencyCode}
            </span>{" "}
            |{" "}
            <span className="font-medium">
              Recovery income (from Step 2, {recoveryRate}% rate):
            </span>{" "}
            <span className="text-emerald-400">
              {recoverableInsight.recoveryIncome.toLocaleString()} {currencyCode}
            </span>{" "}
            |{" "}
            <span className="font-medium">
              Net recoverable expense after recovery:
            </span>{" "}
            <span className="text-amber-400">
              {recoverableInsight.netRecoverable.toLocaleString()} {currencyCode}
            </span>
          </p>
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          TOTAL OPERATING EXPENSES BY YEAR — STACKED ({currencyCode} M)
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
              <Legend wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }} />
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
