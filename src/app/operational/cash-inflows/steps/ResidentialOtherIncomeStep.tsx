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
  parkingSpacesFromBua,
  resolveResidentialOtherIncomeBenchmark,
} from "@/lib/benchmarks/residential-other-income";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import {
  defaultOperationalResidentialHoldSnapshot,
  type OperationalResidentialHoldSnapshot,
} from "@/lib/operational-pnl";
import useFinModelStore from "@/store/useFinModelStore";

const inputBase =
  "w-full rounded bg-slate-900 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

function overrideFieldClass(overridden: boolean): string {
  return overridden
    ? `${inputBase} border-2 border-amber-500/70`
    : `${inputBase} border border-slate-600`;
}

function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function getOperationalResidentialHoldSnapshot():
  | OperationalResidentialHoldSnapshot
  | undefined {
  return useFinModelStore.getState().operational?.residentialHoldSnapshot;
}

export type ResidentialOtherIncomeStepErrors = Record<string, string>;

export type ResidentialOtherIncomeRow = {
  year: number;
  parking: number;
  amenity: number;
  utility: number;
  other: number;
  total: number;
  leasedPct: number;
  isOverridden: boolean;
  parkingM: number;
  amenityM: number;
  utilityM: number;
  otherM: number;
};

export function validateResidentialOtherIncomeStep(
  snap: OperationalResidentialHoldSnapshot | undefined
): ResidentialOtherIncomeStepErrors {
  const next: ResidentialOtherIncomeStepErrors = {};
  const gla = snap?.residentialGlaSqft ?? 0;
  if (!Number.isFinite(gla) || gla <= 0) {
    next.residentialGla =
      "Complete Step 1 (residential GLA) before configuring other income.";
  }
  const spaces = snap?.totalParkingSpaces ?? 0;
  if (!Number.isFinite(spaces) || spaces <= 0) {
    next.totalParkingSpaces =
      "Parking spaces must be greater than 0 (check Component 1 parking/basement BUA).";
  }
  const units = estimatedUnitsFromGla(
    gla,
    snap?.avgUnitSqft ?? 800
  );
  if (!Number.isFinite(units) || units <= 0) {
    next.avgUnitSqft = "Estimated unit count must be greater than 0.";
  }
  return next;
}

export function computeResidentialOtherIncomeRows(params: {
  totalParkingSpaces: number;
  estimatedUnits: number;
  parkingFeePerMonth: number;
  parkingUptakePct: number;
  amenityFeePerUnitMonth: number;
  amenityUptakePct: number;
  utilityRecoveryPerUnitMonth: number;
  utilityUptakePct: number;
  otherFeesPerUnitAnnual: number;
  otherFeesUptakePct: number;
  leasedPctByYear: number[];
  manualYearValues: Record<number, Record<string, number>>;
}): {
  rows: ResidentialOtherIncomeRow[];
  totals: Record<string, number>;
} {
  const rows: ResidentialOtherIncomeRow[] = [];
  let totalParking = 0;
  let totalAmenity = 0;
  let totalUtility = 0;
  let totalOther = 0;

  for (let t = 1; t <= OPERATIONAL_ROOM_REVENUE_YEARS; t++) {
    const leasedPct =
      params.leasedPctByYear[t - 1] ??
      params.leasedPctByYear[params.leasedPctByYear.length - 1] ??
      90;
    const leasedFactor = leasedPct / 100;

    const parkingIncome =
      params.totalParkingSpaces *
      params.parkingFeePerMonth *
      12 *
      (params.parkingUptakePct / 100) *
      leasedFactor;

    const amenityIncome =
      params.estimatedUnits *
      params.amenityFeePerUnitMonth *
      12 *
      (params.amenityUptakePct / 100) *
      leasedFactor;

    const utilityIncome =
      params.estimatedUnits *
      params.utilityRecoveryPerUnitMonth *
      12 *
      (params.utilityUptakePct / 100) *
      leasedFactor;

    const otherIncome =
      params.estimatedUnits *
      params.otherFeesPerUnitAnnual *
      (params.otherFeesUptakePct / 100) *
      leasedFactor;

    totalParking += parkingIncome;
    totalAmenity += amenityIncome;
    totalUtility += utilityIncome;
    totalOther += otherIncome;

    const manual = params.manualYearValues[t] ?? {};
    const parking = manual.parking ?? parkingIncome;
    const amenity = manual.amenity ?? amenityIncome;
    const utility = manual.utility ?? utilityIncome;
    const other = manual.other ?? otherIncome;
    const total = manual.total ?? parking + amenity + utility + other;

    rows.push({
      year: t,
      parking,
      amenity,
      utility,
      other,
      total,
      leasedPct,
      isOverridden: Object.keys(manual).length > 0,
      parkingM: parking / 1_000_000,
      amenityM: amenity / 1_000_000,
      utilityM: utility / 1_000_000,
      otherM: other / 1_000_000,
    });
  }

  return {
    rows,
    totals: {
      parking: totalParking,
      amenity: totalAmenity,
      utility: totalUtility,
      other: totalOther,
      total: totalParking + totalAmenity + totalUtility + totalOther,
    },
  };
}

export default function ResidentialOtherIncomeStep() {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const step1 = useFinModelStore((s) => s.operational.residentialHoldSnapshot);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const currencyCode = projectInfo.currency || "AED";
  const updateResidentialHoldSnapshot = useFinModelStore(
    (s) => s.updateResidentialHoldSnapshot
  );

  const incomeBenchmark = useMemo(
    () =>
      resolveResidentialOtherIncomeBenchmark(
        projectInfo.country || "UAE",
        projectInfo.residentialSegment || "high_rise",
        projectInfo.residentialPositioning || "grade_a",
        projectInfo.residentialFurnishingLevel,
        projectInfo.residentialIsServicedApartment
      ),
    [
      projectInfo.country,
      projectInfo.residentialSegment,
      projectInfo.residentialPositioning,
      projectInfo.residentialFurnishingLevel,
      projectInfo.residentialIsServicedApartment,
    ]
  );

  const defaultSpaces = parkingSpacesFromBua(
    cashOutflows.parkingBUA ?? 0,
    cashOutflows.basementBUA ?? 0
  );

  const residentialGla = step1?.residentialGlaSqft ?? 0;
  const avgUnitSqft =
    step1?.avgUnitSqft ?? incomeBenchmark.avgUnitSqft ?? 800;
  const estimatedUnits = estimatedUnitsFromGla(residentialGla, avgUnitSqft);

  const [totalParkingSpaces, setTotalParkingSpaces] = useState(
    () => step1?.totalParkingSpaces ?? defaultSpaces
  );
  const [parkingFeePerMonth, setParkingFeePerMonth] = useState(
    () => step1?.parkingFeePerMonth ?? incomeBenchmark.parkingFeePerMonth
  );
  const [parkingUptake, setParkingUptake] = useState(
    () => step1?.parkingUptakePct ?? incomeBenchmark.parkingUptakePct
  );

  const [amenityFeePerUnit, setAmenityFeePerUnit] = useState(
    () => step1?.amenityFeePerUnitMonth ?? incomeBenchmark.amenityFeePerUnitMonth
  );
  const [amenityUptake, setAmenityUptake] = useState(
    () => step1?.amenityUptakePct ?? incomeBenchmark.amenityUptakePct
  );

  const [utilityRecoveryPerUnit, setUtilityRecoveryPerUnit] = useState(
    () =>
      step1?.utilityRecoveryPerUnitMonth ??
      incomeBenchmark.utilityRecoveryPerUnitMonth
  );
  const [utilityUptake, setUtilityUptake] = useState(
    () => step1?.utilityUptakePct ?? incomeBenchmark.utilityUptakePct
  );

  const [otherFeesPerUnit, setOtherFeesPerUnit] = useState(
    () => step1?.otherFeesPerUnitAnnual ?? incomeBenchmark.otherFeesPerUnitAnnual
  );
  const [otherFeesUptake, setOtherFeesUptake] = useState(
    () => step1?.otherFeesUptakePct ?? incomeBenchmark.otherFeesUptakePct
  );

  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    () => step1?.otherIncomeSectionOverrides ?? {}
  );
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Record<string, number>>
  >(() => step1?.otherIncomeManualYearValues ?? {});

  useEffect(() => {
    if (defaultSpaces > 0 && totalParkingSpaces <= 0) {
      setTotalParkingSpaces(defaultSpaces);
    }
  }, [defaultSpaces, totalParkingSpaces]);

  const leasedPctByYear = useMemo(() => {
    const fromStep1 = step1?.residentialEffectiveOccupancyValues;
    if (fromStep1?.length) {
      return fromStep1.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS);
    }
    const fallback = step1?.residentialLeasedTargetPct ?? 90;
    return Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(fallback);
  }, [step1?.residentialEffectiveOccupancyValues, step1?.residentialLeasedTargetPct]);

  const tableData = useMemo(
    () =>
      computeResidentialOtherIncomeRows({
        totalParkingSpaces,
        estimatedUnits,
        parkingFeePerMonth,
        parkingUptakePct: parkingUptake,
        amenityFeePerUnitMonth: amenityFeePerUnit,
        amenityUptakePct: amenityUptake,
        utilityRecoveryPerUnitMonth: utilityRecoveryPerUnit,
        utilityUptakePct: utilityUptake,
        otherFeesPerUnitAnnual: otherFeesPerUnit,
        otherFeesUptakePct: otherFeesUptake,
        leasedPctByYear,
        manualYearValues,
      }),
    [
      totalParkingSpaces,
      estimatedUnits,
      parkingFeePerMonth,
      parkingUptake,
      amenityFeePerUnit,
      amenityUptake,
      utilityRecoveryPerUnit,
      utilityUptake,
      otherFeesPerUnit,
      otherFeesUptake,
      leasedPctByYear,
      manualYearValues,
    ]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const prev = getOperationalResidentialHoldSnapshot();
      updateResidentialHoldSnapshot(
        {
          ...defaultOperationalResidentialHoldSnapshot,
          ...prev,
          totalParkingSpaces,
          parkingFeePerMonth,
          parkingUptakePct: parkingUptake,
          amenityFeePerUnitMonth: amenityFeePerUnit,
          amenityUptakePct: amenityUptake,
          utilityRecoveryPerUnitMonth: utilityRecoveryPerUnit,
          utilityUptakePct: utilityUptake,
          otherFeesPerUnitAnnual: otherFeesPerUnit,
          otherFeesUptakePct: otherFeesUptake,
          avgUnitSqft,
          parkingIncomeValues: tableData.rows.map((r) => r.parking),
          amenityIncomeValues: tableData.rows.map((r) => r.amenity),
          utilityIncomeValues: tableData.rows.map((r) => r.utility),
          otherFeesIncomeValues: tableData.rows.map((r) => r.other),
          otherIncomeTotalValues: tableData.rows.map((r) => r.total),
          otherIncomeSectionOverrides: overrides,
          otherIncomeManualYearValues: manualYearValues,
        },
        "operational"
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [
    totalParkingSpaces,
    parkingFeePerMonth,
    parkingUptake,
    amenityFeePerUnit,
    amenityUptake,
    utilityRecoveryPerUnit,
    utilityUptake,
    otherFeesPerUnit,
    otherFeesUptake,
    avgUnitSqft,
    overrides,
    manualYearValues,
    tableData.rows,
    updateResidentialHoldSnapshot,
  ]);

  const handleResetAll = useCallback(() => {
    setOverrides({});
    setManualYearValues({});
    setTotalParkingSpaces(defaultSpaces);
    setParkingFeePerMonth(incomeBenchmark.parkingFeePerMonth);
    setParkingUptake(incomeBenchmark.parkingUptakePct);
    setAmenityFeePerUnit(incomeBenchmark.amenityFeePerUnitMonth);
    setAmenityUptake(incomeBenchmark.amenityUptakePct);
    setUtilityRecoveryPerUnit(incomeBenchmark.utilityRecoveryPerUnitMonth);
    setUtilityUptake(incomeBenchmark.utilityUptakePct);
    setOtherFeesPerUnit(incomeBenchmark.otherFeesPerUnitAnnual);
    setOtherFeesUptake(incomeBenchmark.otherFeesUptakePct);
  }, [defaultSpaces, incomeBenchmark]);

  const handleFieldChange = useCallback(
    (section: string, field: string, value: number) => {
      const setters: Record<string, (v: number) => void> = {
        parkingFeePerMonth: setParkingFeePerMonth,
        parkingUptake: setParkingUptake,
        amenityFeePerUnit: setAmenityFeePerUnit,
        amenityUptake: setAmenityUptake,
        utilityRecoveryPerUnit: setUtilityRecoveryPerUnit,
        utilityUptake: setUtilityUptake,
        otherFeesPerUnit: setOtherFeesPerUnit,
        otherFeesUptake: setOtherFeesUptake,
      };
      const setter = setters[field];
      if (!setter) return;
      setter(value);
      setOverrides((prev) => ({ ...prev, [section]: true, [field]: true }));
    },
    []
  );

  const handleCellOverride = useCallback(
    (year: number, stream: string, value: number) => {
      setManualYearValues((prev) => ({
        ...prev,
        [year]: { ...prev[year], [stream]: value },
      }));
    },
    []
  );

  const chartData = useMemo(
    () =>
      tableData.rows.map((row) => ({
        year: `Y${row.year}`,
        Parking: row.parkingM,
        "Amenity Fees": row.amenityM,
        "Utility Recoveries": row.utilityM,
        "Other Fees": row.otherM,
      })),
    [tableData.rows]
  );

  const hasManualOverride =
    Object.values(overrides).some(Boolean) ||
    Object.keys(manualYearValues).length > 0;

  const benchmarkReady =
    !!projectInfo.residentialSegment?.trim() &&
    !!projectInfo.residentialPositioning?.trim();

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 2 — Other Income
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Parking, amenity fees, utility recoveries, and other fees scale with
          effective leased % from Step 1.{" "}
          <span className="text-amber-500">Amber borders</span> indicate manual
          overrides.
        </p>
      </div>

      {benchmarkReady ? (
        <BenchmarkHeader
          assetType="residential"
          country={projectInfo.country}
          segment={projectInfo.residentialSegment}
          positioning={projectInfo.residentialPositioning}
          furnishingLevel={projectInfo.residentialFurnishingLevel}
          isServicedApartment={projectInfo.residentialIsServicedApartment}
          onUseDefaults={handleResetAll}
          isManualOverride={hasManualOverride}
        />
      ) : null}

      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm text-slate-300">
        <p>
          <strong>Parking spaces:</strong>{" "}
          {totalParkingSpaces.toLocaleString()} &nbsp;
          <span className="text-slate-500">
            (Parking BUA {cashOutflows.parkingBUA?.toLocaleString() ?? 0} + Basement{" "}
            {cashOutflows.basementBUA?.toLocaleString() ?? 0}) ÷ 350 sqft/space
          </span>
        </p>
        <p className="mt-1">
          <strong>Estimated units:</strong> {estimatedUnits.toLocaleString()}{" "}
          <span className="text-slate-500">
            (Residential GLA {residentialGla.toLocaleString()} ÷ {avgUnitSqft} sqft/unit)
          </span>
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">Parking income</h3>
          <button
            type="button"
            onClick={() => {
              setParkingFeePerMonth(incomeBenchmark.parkingFeePerMonth);
              setParkingUptake(incomeBenchmark.parkingUptakePct);
              setOverrides((p) => ({ ...p, parking: false }));
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Reset parking
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Monthly parking fee per space ({currencyCode})
            </label>
            <input
              type="number"
              value={parkingFeePerMonth}
              onChange={(e) =>
                handleFieldChange(
                  "parking",
                  "parkingFeePerMonth",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.parking)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Parking uptake (% of units renting a space)
            </label>
            <input
              type="number"
              value={parkingUptake}
              onChange={(e) =>
                handleFieldChange(
                  "parking",
                  "parkingUptake",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.parking)}
            />
          </div>
          <div className="flex items-end text-xs text-slate-500">
            Annual = spaces × fee × 12 × uptake × leased %
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Amenity fees (gym, pool, lounge)
          </h3>
          <button
            type="button"
            onClick={() => {
              setAmenityFeePerUnit(incomeBenchmark.amenityFeePerUnitMonth);
              setAmenityUptake(incomeBenchmark.amenityUptakePct);
              setOverrides((p) => ({ ...p, amenity: false }));
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Reset amenity
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Monthly amenity fee per unit ({currencyCode})
            </label>
            <input
              type="number"
              value={amenityFeePerUnit}
              onChange={(e) =>
                handleFieldChange(
                  "amenity",
                  "amenityFeePerUnit",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.amenity)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Amenity uptake (% of tenants paying)
            </label>
            <input
              type="number"
              value={amenityUptake}
              onChange={(e) =>
                handleFieldChange(
                  "amenity",
                  "amenityUptake",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.amenity)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Utility recoveries (sub-metering)
          </h3>
          <button
            type="button"
            onClick={() => {
              setUtilityRecoveryPerUnit(
                incomeBenchmark.utilityRecoveryPerUnitMonth
              );
              setUtilityUptake(incomeBenchmark.utilityUptakePct);
              setOverrides((p) => ({ ...p, utility: false }));
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Reset utilities
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Monthly utility recovery per unit ({currencyCode})
            </label>
            <input
              type="number"
              value={utilityRecoveryPerUnit}
              onChange={(e) =>
                handleFieldChange(
                  "utility",
                  "utilityRecoveryPerUnit",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.utility)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Utility uptake (% of units with sub-meter)
            </label>
            <input
              type="number"
              value={utilityUptake}
              onChange={(e) =>
                handleFieldChange(
                  "utility",
                  "utilityUptake",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.utility)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Other fees (storage, pet, etc.)
          </h3>
          <button
            type="button"
            onClick={() => {
              setOtherFeesPerUnit(incomeBenchmark.otherFeesPerUnitAnnual);
              setOtherFeesUptake(incomeBenchmark.otherFeesUptakePct);
              setOverrides((p) => ({ ...p, other: false }));
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Reset other
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual other fees per unit ({currencyCode})
            </label>
            <input
              type="number"
              value={otherFeesPerUnit}
              onChange={(e) =>
                handleFieldChange(
                  "other",
                  "otherFeesPerUnit",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.other)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Other fee uptake (% of units)
            </label>
            <input
              type="number"
              value={otherFeesUptake}
              onChange={(e) =>
                handleFieldChange(
                  "other",
                  "otherFeesUptake",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.other)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR TABLE — OTHER INCOME ({currencyCode} M)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Leased % (eff)</th>
                <th className="px-4 py-3">Parking</th>
                <th className="px-4 py-3">Amenity</th>
                <th className="px-4 py-3">Utility</th>
                <th className="px-4 py-3">Other</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row) => (
                <tr
                  key={row.year}
                  className={`border-b border-slate-800 ${
                    row.isOverridden
                      ? "bg-amber-900/10"
                      : "hover:bg-slate-800/50"
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-white">
                    Y{row.year}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {row.leasedPct.toFixed(1)}%
                  </td>
                  {(["parking", "amenity", "utility", "other"] as const).map(
                    (stream) => (
                      <td key={stream} className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={(row[stream] / 1_000_000).toFixed(2)}
                          onChange={(e) =>
                            handleCellOverride(
                              row.year,
                              stream,
                              (parseFloat(e.target.value) || 0) * 1_000_000
                            )
                          }
                          className={`w-24 rounded bg-slate-800 p-1 text-right ${
                            manualYearValues[row.year]?.[stream]
                              ? "border border-amber-500"
                              : "border border-transparent"
                          }`}
                        />
                      </td>
                    )
                  )}
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                    {(row.total / 1_000_000).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800 font-bold text-white">
                <td className="px-4 py-3">10-Year total</td>
                <td />
                <td className="px-4 py-3 text-right text-emerald-400">
                  {(tableData.totals.parking / 1_000_000).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {(tableData.totals.amenity / 1_000_000).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {(tableData.totals.utility / 1_000_000).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {(tableData.totals.other / 1_000_000).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {(tableData.totals.total / 1_000_000).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Other income composition (stacked, {currencyCode} M)
        </h3>
        <div className="h-64 w-full">
          {mounted ? (
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
                  formatter={(val) =>
                    `${Number(val ?? 0).toFixed(2)}M`
                  }
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
                />
                <Bar dataKey="Parking" stackId="a" fill="#10b981" />
                <Bar dataKey="Amenity Fees" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Utility Recoveries" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="Other Fees" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-400">
        <p>
          <strong>Note:</strong> All streams multiply by effective leased % from
          Step 1 (after vacancy and bad debt). Parking spaces derive from Component
          1 parking + basement BUA ÷ 350 sqft per space.
        </p>
      </div>
    </div>
  );
}
