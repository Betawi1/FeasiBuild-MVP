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
import { AiInput } from "@/components/ui/AiInput";
import {
  estimatedUnitsFromGla,
  parkingSpacesFromBua,
  resolveResidentialOtherIncomeBenchmark,
} from "@/lib/benchmarks/residential-other-income";
import { normalizeAiResearchData } from "@/lib/constants/aiPrompts";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import {
  defaultOperationalResidentialHoldSnapshot,
  type OperationalResidentialHoldSnapshot,
} from "@/lib/operational-pnl";
import useFinModelStore from "@/store/useFinModelStore";

const AI_EPS = 0.01;
function differsFromAi(current: number, ai?: number | null): boolean {
  return (
    ai != null && Number.isFinite(ai) && Math.abs(current - ai) > AI_EPS
  );
}

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

  const aiC2 = useMemo(() => {
    const raw = cashOutflows?.aiResearchData;
    if (!raw) return undefined;
    const hasNested =
      !!raw.c2_operational?.step2_other_income ||
      !!raw.c2_operational?.other_income_btr ||
      !!raw.c1_development?.construction_rates;
    if (!hasNested) {
      return (normalizeAiResearchData(raw) as { c2_operational?: typeof raw.c2_operational })
        ?.c2_operational;
    }
    return raw.c2_operational;
  }, [cashOutflows?.aiResearchData]);

  const aiStep2 = aiC2?.step2_other_income;
  const aiBtrIncome = aiC2?.other_income_btr;
  const aiParkingFee =
    aiStep2?.parking_fee_per_space ?? aiBtrIncome?.parking_fee_per_space;
  const aiParkingUptake =
    aiStep2?.parking_uptake_pct ?? aiBtrIncome?.parking_uptake_pct;
  const aiAmenityFee =
    aiStep2?.amenity_fee_per_unit ?? aiBtrIncome?.amenity_fee_per_unit;
  const aiAmenityUptake =
    aiStep2?.amenity_uptake_pct ?? aiBtrIncome?.amenity_uptake_pct;
  const aiUtilityFee =
    aiStep2?.utility_recovery_per_unit ??
    aiBtrIncome?.utility_recovery_per_unit;
  const aiUtilityUptake =
    aiStep2?.utility_uptake_pct ?? aiBtrIncome?.utility_uptake_pct;
  const aiOtherFee =
    aiStep2?.other_fee_per_unit ?? aiBtrIncome?.other_fee_per_unit;
  const aiOtherUptake =
    aiStep2?.other_fee_uptake_pct ?? aiBtrIncome?.other_fee_uptake_pct;

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
    if (!aiC2) return;
    if (!overrides.parking && !overrides.parkingFeePerMonth && aiParkingFee != null) {
      setParkingFeePerMonth(aiParkingFee);
    }
    if (!overrides.parking && !overrides.parkingUptake && aiParkingUptake != null) {
      setParkingUptake(aiParkingUptake);
    }
    if (!overrides.amenity && !overrides.amenityFeePerUnit && aiAmenityFee != null) {
      setAmenityFeePerUnit(aiAmenityFee);
    }
    if (!overrides.amenity && !overrides.amenityUptake && aiAmenityUptake != null) {
      setAmenityUptake(aiAmenityUptake);
    }
    if (
      !overrides.utility &&
      !overrides.utilityRecoveryPerUnit &&
      aiUtilityFee != null
    ) {
      setUtilityRecoveryPerUnit(aiUtilityFee);
    }
    if (!overrides.utility && !overrides.utilityUptake && aiUtilityUptake != null) {
      setUtilityUptake(aiUtilityUptake);
    }
    if (!overrides.other && !overrides.otherFeesPerUnit && aiOtherFee != null) {
      setOtherFeesPerUnit(aiOtherFee);
    }
    if (!overrides.other && !overrides.otherFeesUptake && aiOtherUptake != null) {
      setOtherFeesUptake(aiOtherUptake);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-apply when AI payload changes
  }, [
    aiC2,
    aiParkingFee,
    aiParkingUptake,
    aiAmenityFee,
    aiAmenityUptake,
    aiUtilityFee,
    aiUtilityUptake,
    aiOtherFee,
    aiOtherUptake,
  ]);

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
    setParkingFeePerMonth(aiParkingFee ?? incomeBenchmark.parkingFeePerMonth);
    setParkingUptake(aiParkingUptake ?? incomeBenchmark.parkingUptakePct);
    setAmenityFeePerUnit(
      aiAmenityFee ?? incomeBenchmark.amenityFeePerUnitMonth
    );
    setAmenityUptake(aiAmenityUptake ?? incomeBenchmark.amenityUptakePct);
    setUtilityRecoveryPerUnit(
      aiUtilityFee ?? incomeBenchmark.utilityRecoveryPerUnitMonth
    );
    setUtilityUptake(aiUtilityUptake ?? incomeBenchmark.utilityUptakePct);
    setOtherFeesPerUnit(
      aiOtherFee ?? incomeBenchmark.otherFeesPerUnitAnnual
    );
    setOtherFeesUptake(aiOtherUptake ?? incomeBenchmark.otherFeesUptakePct);
  }, [
    defaultSpaces,
    incomeBenchmark,
    aiParkingFee,
    aiParkingUptake,
    aiAmenityFee,
    aiAmenityUptake,
    aiUtilityFee,
    aiUtilityUptake,
    aiOtherFee,
    aiOtherUptake,
  ]);

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
              setParkingFeePerMonth(
                aiParkingFee ?? incomeBenchmark.parkingFeePerMonth
              );
              setParkingUptake(
                aiParkingUptake ?? incomeBenchmark.parkingUptakePct
              );
              setOverrides((p) => ({
                ...p,
                parking: false,
                parkingFeePerMonth: false,
                parkingUptake: false,
              }));
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Reset parking
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <AiInput
              label={`Monthly parking fee per space (${currencyCode})`}
              value={parkingFeePerMonth}
              onChange={(val) =>
                handleFieldChange(
                  "parking",
                  "parkingFeePerMonth",
                  Number(val) || 0
                )
              }
              type="number"
              isAiGenerated={
                aiParkingFee != null &&
                !overrides.parking &&
                !overrides.parkingFeePerMonth
              }
              isManualOverride={
                !!(overrides.parking || overrides.parkingFeePerMonth) ||
                differsFromAi(parkingFeePerMonth, aiParkingFee)
              }
            />
          </div>
          <div>
            <AiInput
              label="Parking uptake (% of units renting a space)"
              value={parkingUptake}
              onChange={(val) =>
                handleFieldChange("parking", "parkingUptake", Number(val) || 0)
              }
              type="percentage"
              isAiGenerated={
                aiParkingUptake != null &&
                !overrides.parking &&
                !overrides.parkingUptake
              }
              isManualOverride={
                !!(overrides.parking || overrides.parkingUptake) ||
                differsFromAi(parkingUptake, aiParkingUptake)
              }
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
              setAmenityFeePerUnit(
                aiAmenityFee ?? incomeBenchmark.amenityFeePerUnitMonth
              );
              setAmenityUptake(
                aiAmenityUptake ?? incomeBenchmark.amenityUptakePct
              );
              setOverrides((p) => ({
                ...p,
                amenity: false,
                amenityFeePerUnit: false,
                amenityUptake: false,
              }));
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Reset amenity
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <AiInput
              label={`Monthly amenity fee per unit (${currencyCode})`}
              value={amenityFeePerUnit}
              onChange={(val) =>
                handleFieldChange(
                  "amenity",
                  "amenityFeePerUnit",
                  Number(val) || 0
                )
              }
              type="number"
              isAiGenerated={
                aiAmenityFee != null &&
                !overrides.amenity &&
                !overrides.amenityFeePerUnit
              }
              isManualOverride={
                !!(overrides.amenity || overrides.amenityFeePerUnit) ||
                differsFromAi(amenityFeePerUnit, aiAmenityFee)
              }
            />
          </div>
          <div>
            <AiInput
              label="Amenity uptake (% of tenants paying)"
              value={amenityUptake}
              onChange={(val) =>
                handleFieldChange("amenity", "amenityUptake", Number(val) || 0)
              }
              type="percentage"
              isAiGenerated={
                aiAmenityUptake != null &&
                !overrides.amenity &&
                !overrides.amenityUptake
              }
              isManualOverride={
                !!(overrides.amenity || overrides.amenityUptake) ||
                differsFromAi(amenityUptake, aiAmenityUptake)
              }
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
                aiUtilityFee ?? incomeBenchmark.utilityRecoveryPerUnitMonth
              );
              setUtilityUptake(
                aiUtilityUptake ?? incomeBenchmark.utilityUptakePct
              );
              setOverrides((p) => ({
                ...p,
                utility: false,
                utilityRecoveryPerUnit: false,
                utilityUptake: false,
              }));
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Reset utilities
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <AiInput
              label={`Monthly utility recovery per unit (${currencyCode})`}
              value={utilityRecoveryPerUnit}
              onChange={(val) =>
                handleFieldChange(
                  "utility",
                  "utilityRecoveryPerUnit",
                  Number(val) || 0
                )
              }
              type="number"
              isAiGenerated={
                aiUtilityFee != null &&
                !overrides.utility &&
                !overrides.utilityRecoveryPerUnit
              }
              isManualOverride={
                !!(overrides.utility || overrides.utilityRecoveryPerUnit) ||
                differsFromAi(utilityRecoveryPerUnit, aiUtilityFee)
              }
            />
          </div>
          <div>
            <AiInput
              label="Utility uptake (% of units with sub-meter)"
              value={utilityUptake}
              onChange={(val) =>
                handleFieldChange("utility", "utilityUptake", Number(val) || 0)
              }
              type="percentage"
              isAiGenerated={
                aiUtilityUptake != null &&
                !overrides.utility &&
                !overrides.utilityUptake
              }
              isManualOverride={
                !!(overrides.utility || overrides.utilityUptake) ||
                differsFromAi(utilityUptake, aiUtilityUptake)
              }
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
              setOtherFeesPerUnit(
                aiOtherFee ?? incomeBenchmark.otherFeesPerUnitAnnual
              );
              setOtherFeesUptake(
                aiOtherUptake ?? incomeBenchmark.otherFeesUptakePct
              );
              setOverrides((p) => ({
                ...p,
                other: false,
                otherFeesPerUnit: false,
                otherFeesUptake: false,
              }));
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Reset other
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <AiInput
              label={`Annual other fees per unit (${currencyCode})`}
              value={otherFeesPerUnit}
              onChange={(val) =>
                handleFieldChange("other", "otherFeesPerUnit", Number(val) || 0)
              }
              type="number"
              isAiGenerated={
                aiOtherFee != null &&
                !overrides.other &&
                !overrides.otherFeesPerUnit
              }
              isManualOverride={
                !!(overrides.other || overrides.otherFeesPerUnit) ||
                differsFromAi(otherFeesPerUnit, aiOtherFee)
              }
            />
          </div>
          <div>
            <AiInput
              label="Other fee uptake (% of units)"
              value={otherFeesUptake}
              onChange={(val) =>
                handleFieldChange("other", "otherFeesUptake", Number(val) || 0)
              }
              type="percentage"
              isAiGenerated={
                aiOtherUptake != null &&
                !overrides.other &&
                !overrides.otherFeesUptake
              }
              isManualOverride={
                !!(overrides.other || overrides.otherFeesUptake) ||
                differsFromAi(otherFeesUptake, aiOtherUptake)
              }
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
