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
import BenchmarkHeader from "@/components/BenchmarkHeader";
import {
  estimatedUnitsFromGla,
} from "@/lib/benchmarks/residential-other-income";
import { resolveResidentialOpexBenchmark } from "@/lib/benchmarks/residential-opex";
import {
  defaultOperationalResidentialHoldSnapshot,
  type OperationalResidentialHoldSnapshot,
} from "@/lib/operational-pnl";
import useFinModelStore from "@/store/useFinModelStore";
import type { ResidentialOpexConfig } from "@/store/useFinModelStore";

export function getOperationalResidentialHoldSnapshot():
  | OperationalResidentialHoldSnapshot
  | undefined {
  return useFinModelStore.getState().operational?.residentialHoldSnapshot;
}

export type ResidentialOpexStepErrors = Record<string, string>;

export function buildResidentialOpexFromSnapshot(
  snap: OperationalResidentialHoldSnapshot | undefined
): ResidentialOpexConfig | undefined {
  if (snap == null) return undefined;
  if (
    snap.mgmtFeePctOfEgi == null &&
    !snap.opexTotalValues?.length
  ) {
    return undefined;
  }

  const gla = snap.residentialGlaSqft ?? 0;
  const avgUnitSqft = snap.avgUnitSqft ?? 800;
  const estimatedTotalUnits = estimatedUnitsFromGla(gla, avgUnitSqft);

  const projection: ResidentialOpexConfig["projection"] = Array.from(
    { length: 10 },
    (_, i) => ({
      year: i + 1,
      mgmtFee: snap.opexMgmtFeeValues?.[i] ?? 0,
      maintenance: snap.opexMaintenanceValues?.[i] ?? 0,
      utilities: snap.opexUtilitiesValues?.[i] ?? 0,
      tax: snap.opexPropertyTaxValues?.[i] ?? 0,
      insurance: snap.opexInsuranceValues?.[i] ?? 0,
      marketing: snap.opexMarketingValues?.[i] ?? 0,
      gAndA: snap.opexGaValues?.[i] ?? 0,
      capex: snap.opexCapexValues?.[i] ?? 0,
      total: snap.opexTotalValues?.[i] ?? 0,
    })
  );

  return {
    mgmtFeePctOfEgi: snap.mgmtFeePctOfEgi ?? 0,
    maintenancePerUnitAnnual: snap.maintenancePerUnitAnnual ?? 0,
    utilitiesFixedAnnual: snap.utilitiesFixedAnnual ?? 0,
    propertyTaxAnnual: snap.propertyTaxAnnual ?? 0,
    insuranceAnnual: snap.insuranceAnnual ?? 0,
    marketingPctOfEgi: snap.marketingPctOfEgi ?? 0,
    gAndAAnnual: snap.gAndAAnnual ?? 0,
    capexPerUnitAnnual: snap.capexPerUnitAnnual ?? 0,
    estimatedTotalUnits,
    projection,
  };
}

export function validateResidentialOpexStep(
  snap: OperationalResidentialHoldSnapshot | undefined
): ResidentialOpexStepErrors {
  const next: ResidentialOpexStepErrors = {};
  const gla = snap?.residentialGlaSqft ?? 0;
  if (!Number.isFinite(gla) || gla <= 0) {
    next.residentialGla =
      "Complete Steps 1–2 before operating expenses.";
  }
  const netRent = snap?.residentialRentValues?.[0] ?? 0;
  const otherIncome = snap?.otherIncomeTotalValues?.[0] ?? 0;
  const egi = netRent + otherIncome;
  if (!Number.isFinite(egi) || egi <= 0) {
    next.egi =
      "Year 1 EGI must be greater than 0 (configure Steps 1–2).";
  }
  return next;
}

type OpexRow = {
  year: number;
  mgmtFee: number;
  maintenance: number;
  utilities: number;
  tax: number;
  insurance: number;
  marketing: number;
  gAndA: number;
  capex: number;
  total: number;
  isOverridden: boolean;
  egi: number;
};

type TableStream =
  | "mgmtFee"
  | "maintenance"
  | "utilities"
  | "tax"
  | "insurance"
  | "marketing"
  | "gAndA"
  | "capex";

const TABLE_STREAMS: TableStream[] = [
  "mgmtFee",
  "maintenance",
  "utilities",
  "tax",
  "insurance",
  "marketing",
  "gAndA",
  "capex",
];

const inputBase =
  "w-full rounded bg-slate-900 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

function overrideFieldClass(overridden: boolean): string {
  return overridden
    ? `${inputBase} border-2 border-amber-500/70`
    : `${inputBase} border border-slate-600`;
}

export default function ResidentialOpexStep() {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const residentialHoldSnapshot = useFinModelStore(
    (s) => s.operational.residentialHoldSnapshot
  );
  const stepData = residentialHoldSnapshot;
  const residentialGla = stepData?.residentialGlaSqft ?? 200_000;
  const avgUnitSqft = stepData?.avgUnitSqft ?? 800;
  const estimatedTotalUnits = estimatedUnitsFromGla(
    residentialGla,
    avgUnitSqft
  );

  const netRentValues = stepData?.residentialRentValues ?? [];
  const otherIncomeValues = stepData?.otherIncomeTotalValues ?? [];

  const benchmark = useMemo(() => {
    if (
      !projectInfo?.country ||
      !projectInfo?.residentialSegment ||
      !projectInfo?.residentialPositioning
    ) {
      return null;
    }
    return resolveResidentialOpexBenchmark(
      projectInfo.country,
      projectInfo.residentialSegment,
      projectInfo.residentialPositioning,
      residentialGla,
      projectInfo.residentialFurnishingLevel,
      projectInfo.residentialIsServicedApartment
    );
  }, [
    projectInfo?.country,
    projectInfo?.residentialSegment,
    projectInfo?.residentialPositioning,
    projectInfo?.residentialFurnishingLevel,
    projectInfo?.residentialIsServicedApartment,
    residentialGla,
  ]);

  const [mgmtFeePct, setMgmtFeePct] = useState(
    stepData?.mgmtFeePctOfEgi ?? benchmark?.mgmtFeePctOfEgi ?? 4
  );
  const [maintenancePerUnit, setMaintenancePerUnit] = useState(
    stepData?.maintenancePerUnitAnnual ??
      benchmark?.maintenancePerUnitAnnual ??
      1500
  );
  const [utilitiesFixed, setUtilitiesFixed] = useState(
    stepData?.utilitiesFixedAnnual ?? benchmark?.utilitiesFixedAnnual ?? 200_000
  );
  const [propertyTax, setPropertyTax] = useState(
    stepData?.propertyTaxAnnual ?? benchmark?.propertyTaxAnnual ?? 500_000
  );
  const [insurance, setInsurance] = useState(
    stepData?.insuranceAnnual ?? benchmark?.insuranceAnnual ?? 80_000
  );
  const [marketingPct, setMarketingPct] = useState(
    stepData?.marketingPctOfEgi ?? benchmark?.marketingPctOfEgi ?? 1
  );
  const [gAndA, setGAndA] = useState(
    stepData?.gAndAAnnual ?? benchmark?.gAndAAnnual ?? 100_000
  );
  const [capexPerUnit, setCapexPerUnit] = useState(
    stepData?.capexPerUnitAnnual ?? benchmark?.capexPerUnitAnnual ?? 1000
  );

  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    stepData?.opexSectionOverrides ?? {}
  );
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Record<string, number>>
  >(stepData?.opexManualYearValues ?? {});

  const tableData = useMemo(() => {
    const rows: OpexRow[] = [];
    let totalMgmt = 0;
    let totalMaint = 0;
    let totalUtil = 0;
    let totalTax = 0;
    let totalIns = 0;
    let totalMkt = 0;
    let totalGa = 0;
    let totalCapex = 0;
    let totalOpex = 0;

    for (let t = 1; t <= 10; t++) {
      const i = t - 1;
      const netRent = netRentValues[i] ?? 0;
      const otherIncome = otherIncomeValues[i] ?? 0;
      const egi = netRent + otherIncome;

      const mgmtFee = egi * (mgmtFeePct / 100);
      const maintenance = estimatedTotalUnits * maintenancePerUnit;
      const utilities = utilitiesFixed;
      const tax = propertyTax;
      const ins = insurance;
      const marketing = egi * (marketingPct / 100);
      const ga = gAndA;
      const capex = estimatedTotalUnits * capexPerUnit;

      const opexTotal =
        mgmtFee +
        maintenance +
        utilities +
        tax +
        ins +
        marketing +
        ga +
        capex;

      const manual = manualYearValues[t] || {};

      const row: OpexRow = {
        year: t,
        mgmtFee: manual.mgmtFee ?? mgmtFee,
        maintenance: manual.maintenance ?? maintenance,
        utilities: manual.utilities ?? utilities,
        tax: manual.tax ?? tax,
        insurance: manual.insurance ?? ins,
        marketing: manual.marketing ?? marketing,
        gAndA: manual.gAndA ?? ga,
        capex: manual.capex ?? capex,
        total: 0,
        isOverridden: Object.keys(manual).length > 0,
        egi,
      };
      row.total =
        manual.total ??
        row.mgmtFee +
          row.maintenance +
          row.utilities +
          row.tax +
          row.insurance +
          row.marketing +
          row.gAndA +
          row.capex;

      totalMgmt += row.mgmtFee;
      totalMaint += row.maintenance;
      totalUtil += row.utilities;
      totalTax += row.tax;
      totalIns += row.insurance;
      totalMkt += row.marketing;
      totalGa += row.gAndA;
      totalCapex += row.capex;
      totalOpex += row.total;

      rows.push(row);
    }

    return {
      rows,
      totals: {
        mgmtFee: totalMgmt,
        maintenance: totalMaint,
        utilities: totalUtil,
        tax: totalTax,
        insurance: totalIns,
        marketing: totalMkt,
        gAndA: totalGa,
        capex: totalCapex,
        total: totalOpex,
      },
    };
  }, [
    estimatedTotalUnits,
    netRentValues,
    otherIncomeValues,
    mgmtFeePct,
    maintenancePerUnit,
    utilitiesFixed,
    propertyTax,
    insurance,
    marketingPct,
    gAndA,
    capexPerUnit,
    manualYearValues,
  ]);

  const persistSnapshot = useCallback(() => {
    const prev = getOperationalResidentialHoldSnapshot();
    const merged: OperationalResidentialHoldSnapshot = {
      ...defaultOperationalResidentialHoldSnapshot,
      ...prev,
      residentialGlaSqft: prev?.residentialGlaSqft ?? residentialGla,
      mgmtFeePctOfEgi: mgmtFeePct,
      maintenancePerUnitAnnual: maintenancePerUnit,
      utilitiesFixedAnnual: utilitiesFixed,
      propertyTaxAnnual: propertyTax,
      insuranceAnnual: insurance,
      marketingPctOfEgi: marketingPct,
      gAndAAnnual: gAndA,
      capexPerUnitAnnual: capexPerUnit,
      estimatedTotalUnits,
      opexMgmtFeeValues: tableData.rows.map((r) => r.mgmtFee),
      opexMaintenanceValues: tableData.rows.map((r) => r.maintenance),
      opexUtilitiesValues: tableData.rows.map((r) => r.utilities),
      opexPropertyTaxValues: tableData.rows.map((r) => r.tax),
      opexInsuranceValues: tableData.rows.map((r) => r.insurance),
      opexMarketingValues: tableData.rows.map((r) => r.marketing),
      opexGaValues: tableData.rows.map((r) => r.gAndA),
      opexCapexValues: tableData.rows.map((r) => r.capex),
      opexTotalValues: tableData.rows.map((r) => r.total),
      opexSectionOverrides: overrides,
      opexManualYearValues: manualYearValues,
    };
    const store = useFinModelStore.getState();
    store.updateResidentialHoldSnapshot(merged, "operational");
    const residentialOpex = buildResidentialOpexFromSnapshot(merged);
    if (residentialOpex) {
      store.updateProjectInfo({ residentialOpex }, "operational");
    }
  }, [
    residentialGla,
    mgmtFeePct,
    maintenancePerUnit,
    utilitiesFixed,
    propertyTax,
    insurance,
    marketingPct,
    gAndA,
    capexPerUnit,
    estimatedTotalUnits,
    tableData.rows,
    overrides,
    manualYearValues,
  ]);

  useEffect(() => {
    const timer = setTimeout(persistSnapshot, 200);
    return () => clearTimeout(timer);
  }, [persistSnapshot]);

  useEffect(() => {
    if (!benchmark || Object.keys(overrides).length > 0) return;
    if (stepData?.mgmtFeePctOfEgi != null) return;
    setMgmtFeePct(benchmark.mgmtFeePctOfEgi);
    setMaintenancePerUnit(benchmark.maintenancePerUnitAnnual);
    setUtilitiesFixed(benchmark.utilitiesFixedAnnual);
    setPropertyTax(benchmark.propertyTaxAnnual);
    setInsurance(benchmark.insuranceAnnual);
    setMarketingPct(benchmark.marketingPctOfEgi);
    setGAndA(benchmark.gAndAAnnual);
    setCapexPerUnit(benchmark.capexPerUnitAnnual);
  }, [benchmark, overrides, stepData?.mgmtFeePctOfEgi]);

  const handleResetAll = () => {
    if (!benchmark) return;
    setMgmtFeePct(benchmark.mgmtFeePctOfEgi);
    setMaintenancePerUnit(benchmark.maintenancePerUnitAnnual);
    setUtilitiesFixed(benchmark.utilitiesFixedAnnual);
    setPropertyTax(benchmark.propertyTaxAnnual);
    setInsurance(benchmark.insuranceAnnual);
    setMarketingPct(benchmark.marketingPctOfEgi);
    setGAndA(benchmark.gAndAAnnual);
    setCapexPerUnit(benchmark.capexPerUnitAnnual);
    setOverrides({});
    setManualYearValues({});
  };

  const handleFieldChange = (field: string, value: number) => {
    const setters: Record<string, (v: number) => void> = {
      mgmtFeePct: setMgmtFeePct,
      maintenancePerUnit: setMaintenancePerUnit,
      utilitiesFixed: setUtilitiesFixed,
      propertyTax: setPropertyTax,
      insurance: setInsurance,
      marketingPct: setMarketingPct,
      gAndA: setGAndA,
      capexPerUnit: setCapexPerUnit,
    };

    if (setters[field]) {
      setters[field](value);
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
    "Mgmt Fee": row.mgmtFee / 1_000_000,
    Maintenance: row.maintenance / 1_000_000,
    Utilities: row.utilities / 1_000_000,
    "Prop Tax": row.tax / 1_000_000,
    Insurance: row.insurance / 1_000_000,
    Marketing: row.marketing / 1_000_000,
    "G&A": row.gAndA / 1_000_000,
    Capex: row.capex / 1_000_000,
  }));

  const currencyCode = projectInfo?.currency ?? "AED";

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 3 — Operating Expenses
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Expenses are primarily fixed or per-unit (gross lease — no CAM
          recoveries).
          <span className="ml-1 text-amber-500">Amber borders</span> indicate
          manual overrides.
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
        <h3 className="mb-4 text-lg font-semibold text-white">
          Property Management
        </h3>
        <div className="max-w-xs">
          <label className="mb-1 block text-xs text-slate-400">
            Property Management Fee (% of EGI)
          </label>
          <input
            type="number"
            step="0.1"
            value={mgmtFeePct}
            onChange={(e) =>
              handleFieldChange("mgmtFeePct", Number(e.target.value))
            }
            className={overrideFieldClass(!!overrides.mgmtFeePct)}
          />
          <p className="mt-1 text-[10px] text-slate-500">
            EGI = Net Rent (Step 1) + Other Income (Step 2)
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Maintenance &amp; Repairs
        </h3>
        <div className="max-w-xs">
          <label className="mb-1 block text-xs text-slate-400">
            Annual Maintenance per Unit ({currencyCode})
          </label>
          <input
            type="number"
            value={maintenancePerUnit}
            onChange={(e) =>
              handleFieldChange("maintenancePerUnit", Number(e.target.value))
            }
            className={overrideFieldClass(!!overrides.maintenancePerUnit)}
          />
          <p className="mt-1 text-[10px] text-slate-500">
            Applied to TOTAL units ({estimatedTotalUnits.toLocaleString()}), not
            just leased — landlord pays for all units regardless of vacancy
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Utilities (Common Areas + Vacant Units)
        </h3>
        <div className="max-w-xs">
          <label className="mb-1 block text-xs text-slate-400">
            Annual Utilities ({currencyCode}/year)
          </label>
          <input
            type="number"
            value={utilitiesFixed}
            onChange={(e) =>
              handleFieldChange("utilitiesFixed", Number(e.target.value))
            }
            className={overrideFieldClass(!!overrides.utilitiesFixed)}
          />
          <p className="mt-1 text-[10px] text-slate-500">
            Fixed cost, not recovered from tenants
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Property Tax &amp; Insurance
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Property Tax ({currencyCode}/year)
            </label>
            <input
              type="number"
              value={propertyTax}
              onChange={(e) =>
                handleFieldChange("propertyTax", Number(e.target.value))
              }
              className={overrideFieldClass(!!overrides.propertyTax)}
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
                handleFieldChange("insurance", Number(e.target.value))
              }
              className={overrideFieldClass(!!overrides.insurance)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Marketing &amp; Leasing
        </h3>
        <div className="max-w-xs">
          <label className="mb-1 block text-xs text-slate-400">
            Marketing (% of EGI)
          </label>
          <input
            type="number"
            step="0.1"
            value={marketingPct}
            onChange={(e) =>
              handleFieldChange("marketingPct", Number(e.target.value))
            }
            className={overrideFieldClass(!!overrides.marketingPct)}
          />
          <p className="mt-1 text-[10px] text-slate-500">
            Advertising, leasing staff, tenant acquisition
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          G&amp;A (General &amp; Administrative)
        </h3>
        <div className="max-w-xs">
          <label className="mb-1 block text-xs text-slate-400">
            G&amp;A ({currencyCode}/year)
          </label>
          <input
            type="number"
            value={gAndA}
            onChange={(e) => handleFieldChange("gAndA", Number(e.target.value))}
            className={overrideFieldClass(!!overrides.gAndA)}
          />
          <p className="mt-1 text-[10px] text-slate-500">
            Accounting, legal, office expenses
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Renovation / Capex Reserve
        </h3>
        <div className="max-w-xs">
          <label className="mb-1 block text-xs text-slate-400">
            Annual Capex Reserve per Unit ({currencyCode})
          </label>
          <input
            type="number"
            value={capexPerUnit}
            onChange={(e) =>
              handleFieldChange("capexPerUnit", Number(e.target.value))
            }
            className={overrideFieldClass(!!overrides.capexPerUnit)}
          />
          <p className="mt-1 text-[10px] text-slate-500">
            For unit turnover, appliance replacement — applied to TOTAL units (
            {estimatedTotalUnits.toLocaleString()})
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR EXPENSES TABLE ({currencyCode} M)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="border-r border-slate-700 px-2 py-3">Year</th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Mgmt Fee
                  <br />
                  ({mgmtFeePct}% EGI)
                  <br />
                  ({currencyCode} M)
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Maint
                  <br />
                  ({currencyCode} M)
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Utilities
                  <br />
                  (fixed)
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Prop Tax
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Insurance
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Marketing
                  <br />
                  ({marketingPct}% EGI)
                </th>
                <th className="border-r border-slate-700 px-2 py-3">G&amp;A</th>
                <th className="border-r border-slate-700 px-2 py-3">Capex</th>
                <th className="px-2 py-3 text-right">Total Opex</th>
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
                  {TABLE_STREAMS.map((stream) => (
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
                  <td className="px-2 py-3 text-right font-mono font-semibold text-emerald-400">
                    {(row.total / 1_000_000).toFixed(2)}
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-800 font-bold text-white">
                <td className="border-r border-slate-700 px-2 py-3">
                  10-Year Total
                </td>
                {TABLE_STREAMS.map((stream) => (
                  <td
                    key={stream}
                    className="border-r border-slate-700 px-2 py-3 text-right text-emerald-400"
                  >
                    {(tableData.totals[stream] / 1_000_000).toFixed(2)}
                  </td>
                ))}
                <td className="px-2 py-3 text-right text-emerald-400">
                  {(tableData.totals.total / 1_000_000).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-700 bg-slate-800/50 p-3 text-[10px] text-slate-400">
          <p>
            <strong>Note:</strong> Maintenance &amp; Capex per unit are
            multiplied by total units ({estimatedTotalUnits.toLocaleString()}),
            not leased units — landlord pays for all units regardless of vacancy
            (common in residential).
          </p>
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
                wrapperStyle={{ fontSize: "9px", color: "#94a3b8" }}
              />
              <Bar dataKey="Mgmt Fee" stackId="a" fill="#10b981" />
              <Bar dataKey="Maintenance" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Utilities" stackId="a" fill="#6366f1" />
              <Bar dataKey="Prop Tax" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="Insurance" stackId="a" fill="#a78bfa" />
              <Bar dataKey="Marketing" stackId="a" fill="#f59e0b" />
              <Bar dataKey="G&A" stackId="a" fill="#f97316" />
              <Bar dataKey="Capex" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
