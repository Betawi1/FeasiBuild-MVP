"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BenchmarkHeader from "@/components/BenchmarkHeader";
import { AiInput } from "@/components/ui/AiInput";
import {
  extractWarehouseAiStep1,
  getWarehouseAiC2,
} from "@/lib/warehouse-ai-c2";
import useFinModelStore, {
  calculateWarehouseRevenue,
  type WarehouseRevenue,
  type WarehouseSubType,
  type WarehouseQualityGrade,
} from "@/store/useFinModelStore";

const inputBase =
  "w-full rounded bg-slate-900 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

const WAREHOUSE_SUB_TYPE_LABELS: Record<WarehouseSubType, string> = {
  BULK_DISTRIBUTION: "Bulk / Distribution",
  LAST_MILE_URBAN: "Last-Mile / Urban",
  MULTI_STOREY: "Multi-Storey",
  COLD_STORAGE: "Cold Storage",
  LIGHT_MANUFACTURING: "Light Manufacturing / Workshop",
};

const QUALITY_GRADE_LABELS: Record<WarehouseQualityGrade, string> = {
  GRADE_A: "Grade A",
  GRADE_B: "Grade B",
};

function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

type ProjectionRow = {
  year: number;
  occupancy: number;
  rate: number;
  grossRent: number;
  yardRevenue: number;
  parkingRevenue: number;
  totalRevenue: number;
  isOverridden: boolean;
};

function occupancyForYear(
  year: number,
  targetOccupancy: number,
  leaseUpYears: number
): number {
  const period = Math.max(0.1, leaseUpYears);
  if (year <= period) {
    return targetOccupancy * (year / period);
  }
  return targetOccupancy;
}

export function generateWarehouse10YearProjection(params: {
  totalGfa: number;
  occupancyRate: number;
  ratePerSqftYear: number;
  rentEscalationPct: number;
  leaseUpYears: number;
  freeRentMonths: number;
  yardArea: number;
  yardRate: number;
  parkingSpacesCars: number;
  parkingRateCars: number;
  parkingSpacesTrailers: number;
  parkingRateTrailers: number;
  manualYearValues?: Record<number, Partial<ProjectionRow>>;
}): ProjectionRow[] {
  const rows: ProjectionRow[] = [];
  const parkingRevenue =
    (params.parkingSpacesCars * params.parkingRateCars +
      params.parkingSpacesTrailers * params.parkingRateTrailers) *
    12;
  const yardRevenue = params.yardArea * params.yardRate;

  for (let y = 1; y <= 10; y++) {
    const manual = params.manualYearValues?.[y] ?? {};
    let occupancy = occupancyForYear(
      y,
      params.occupancyRate,
      params.leaseUpYears
    );
    if (manual.occupancy != null) occupancy = manual.occupancy;

    let rate =
      params.ratePerSqftYear *
      Math.pow(1 + params.rentEscalationPct / 100, y - 1);
    if (manual.rate != null) rate = manual.rate;

    const freeRentFactor =
      y === 1 ? (12 - Math.min(12, Math.max(0, params.freeRentMonths))) / 12 : 1;

    const grossRent =
      manual.grossRent ??
      params.totalGfa * (occupancy / 100) * rate * freeRentFactor;
    const yard = manual.yardRevenue ?? yardRevenue;
    const parking = manual.parkingRevenue ?? parkingRevenue;
    const totalRevenue = manual.totalRevenue ?? grossRent + yard + parking;

    rows.push({
      year: y,
      occupancy,
      rate,
      grossRent,
      yardRevenue: yard,
      parkingRevenue: parking,
      totalRevenue,
      isOverridden: Object.keys(manual).length > 0,
    });
  }
  return rows;
}

function buildRevenuePayload(params: {
  totalGfa: number;
  yardArea: number;
  occupancyRate: number;
  ratePerSqftYear: number;
  rentEscalationPct: number;
  leaseUpYears: number;
  freeRentMonths: number;
  yardRate: number;
  parkingSpacesCars: number;
  parkingRateCars: number;
  parkingSpacesTrailers: number;
  parkingRateTrailers: number;
}): WarehouseRevenue {
  return calculateWarehouseRevenue({
    totalGfa: params.totalGfa,
    occupancyRate: params.occupancyRate,
    ratePerSqftYear: params.ratePerSqftYear,
    rentEscalationPct: params.rentEscalationPct,
    leaseUpYears: params.leaseUpYears,
    freeRentMonths: params.freeRentMonths,
    annualGrossRent: 0,
    yardArea: params.yardArea,
    yardRate: params.yardRate,
    annualYardRevenue: 0,
    parkingSpacesCars: params.parkingSpacesCars,
    parkingRateCars: params.parkingRateCars,
    annualParkingRevenueCars: 0,
    parkingSpacesTrailers: params.parkingSpacesTrailers,
    parkingRateTrailers: params.parkingRateTrailers,
    annualParkingRevenueTrailers: 0,
    totalAnnualRevenue: 0,
  });
}

export type WarehouseRevenueStepErrors = Record<string, string>;

export function validateWarehouseRevenueStep(
  revenue: WarehouseRevenue | undefined
): WarehouseRevenueStepErrors {
  const next: WarehouseRevenueStepErrors = {};
  if (!revenue || !Number.isFinite(revenue.totalGfa) || revenue.totalGfa <= 0) {
    next.totalGfa =
      "Total GFA must be greater than 0. Complete Component 1 warehouse building config.";
  }
  if (
    !Number.isFinite(revenue?.occupancyRate ?? NaN) ||
    (revenue?.occupancyRate ?? 0) < 0 ||
    (revenue?.occupancyRate ?? 0) > 100
  ) {
    next.occupancyRate = "Occupancy rate must be between 0% and 100%.";
  }
  if (
    !Number.isFinite(revenue?.ratePerSqftYear ?? NaN) ||
    (revenue?.ratePerSqftYear ?? 0) <= 0
  ) {
    next.ratePerSqftYear = "Rate per sqft/year must be greater than 0.";
  }
  return next;
}

type Props = {
  fieldError?: (name: string) => string | undefined;
};

export default function C2S1PrimaryRevenueWarehouse({ fieldError }: Props = {}) {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const storedRevenue = useFinModelStore(
    (s) => s.operational.cashInflows?.warehouseRevenue
  );
  const updateCashInflows = useFinModelStore((s) => s.updateCashInflows);
  const currencyCode = projectInfo.currency || "USD";

  const isPark = cashOutflows.developmentType === "INDUSTRIAL_PARK";
  const warehouseConfig = cashOutflows.warehouseConfig;
  const industrialParkConfig = cashOutflows.industrialParkConfig;
  const numberOfUnits = isPark
    ? Math.max(1, industrialParkConfig?.numberOfWarehouses || 1)
    : 1;

  const totalGfa = useMemo(() => {
    if (isPark) {
      const mixTotal =
        industrialParkConfig?.warehouseMix.reduce(
          (sum, w) => sum + (w.size || 0),
          0
        ) || 0;
      if (mixTotal > 0) return mixTotal;
      return (warehouseConfig?.totalBua || 0) * numberOfUnits;
    }
    return warehouseConfig?.totalBua || 0;
  }, [
    isPark,
    industrialParkConfig?.warehouseMix,
    warehouseConfig?.totalBua,
    numberOfUnits,
  ]);

  // Quantities locked from Component 1 Step 5 building config (scaled for parks)
  const yardAreaLocked = useMemo(() => {
    const unitYard = warehouseConfig?.yardArea || 0;
    if (unitYard > 0) return unitYard * numberOfUnits;
    const unitLand = warehouseConfig?.totalLandArea || 0;
    if (unitLand > 0) return unitLand * numberOfUnits * 0.3;
    return 0;
  }, [
    warehouseConfig?.yardArea,
    warehouseConfig?.totalLandArea,
    numberOfUnits,
  ]);

  const defaultParkingCars =
    (warehouseConfig?.parkingCars || 0) * numberOfUnits;
  const defaultParkingTrailers =
    (warehouseConfig?.parkingTrailers || 0) * numberOfUnits;

  const benchOccupancy = isPark ? 88 : 95;
  const benchRate = isPark ? 10 : 12;
  const benchYardRate = isPark ? 2.5 : 3;
  const benchEscalation = 3;
  const benchLeaseUp = 2;
  const benchFreeRent = 0;
  const benchParkingRateCars = 50;
  const benchParkingRateTrailers = 100;

  const aiStep1 = useMemo(
    () => extractWarehouseAiStep1(getWarehouseAiC2(cashOutflows?.aiResearchData)),
    [cashOutflows?.aiResearchData]
  );

  const aiOccupancy =
    aiStep1.stabilized_occupancy_pct ?? aiStep1.opening_occupancy_pct;
  const aiRate = aiStep1.base_rent_year_1_psf;
  const aiEscalation = aiStep1.rent_escalation_pct;
  const aiLeaseUp = aiStep1.lease_up_years;
  const aiFreeRent = aiStep1.free_rent_months;
  const aiYardRate = aiStep1.yard_rate_psf;
  const aiParkingRateCars = aiStep1.parking_car_rate_monthly;
  const aiParkingRateTrailers = aiStep1.parking_trailer_rate_monthly;

  const [occupancyRate, setOccupancyRate] = useState(
    storedRevenue?.occupancyRate ?? aiOccupancy ?? benchOccupancy
  );
  const [ratePerSqftYear, setRatePerSqftYear] = useState(
    storedRevenue?.ratePerSqftYear ?? aiRate ?? benchRate
  );
  const [rentEscalationPct, setRentEscalationPct] = useState(
    storedRevenue?.rentEscalationPct ?? aiEscalation ?? benchEscalation
  );
  const [leaseUpYears, setLeaseUpYears] = useState(
    storedRevenue?.leaseUpYears ?? aiLeaseUp ?? benchLeaseUp
  );
  const [freeRentMonths, setFreeRentMonths] = useState(
    storedRevenue?.freeRentMonths ?? aiFreeRent ?? benchFreeRent
  );
  const [yardRate, setYardRate] = useState(
    storedRevenue?.yardRate ?? aiYardRate ?? benchYardRate
  );
  const [parkingSpacesCars, setParkingSpacesCars] = useState(
    storedRevenue?.parkingSpacesCars ?? defaultParkingCars
  );
  const [parkingRateCars, setParkingRateCars] = useState(
    storedRevenue?.parkingRateCars ??
      aiParkingRateCars ??
      benchParkingRateCars
  );
  const [parkingSpacesTrailers, setParkingSpacesTrailers] = useState(
    storedRevenue?.parkingSpacesTrailers ?? defaultParkingTrailers
  );
  const [parkingRateTrailers, setParkingRateTrailers] = useState(
    storedRevenue?.parkingRateTrailers ??
      aiParkingRateTrailers ??
      benchParkingRateTrailers
  );

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Partial<ProjectionRow>>
  >({});

  const persist = useCallback(
    (partial?: Partial<{
      occupancyRate: number;
      ratePerSqftYear: number;
      rentEscalationPct: number;
      leaseUpYears: number;
      freeRentMonths: number;
      yardRate: number;
      parkingSpacesCars: number;
      parkingRateCars: number;
      parkingSpacesTrailers: number;
      parkingRateTrailers: number;
    }>) => {
      const next = buildRevenuePayload({
        totalGfa,
        yardArea: yardAreaLocked,
        occupancyRate: partial?.occupancyRate ?? occupancyRate,
        ratePerSqftYear: partial?.ratePerSqftYear ?? ratePerSqftYear,
        rentEscalationPct: partial?.rentEscalationPct ?? rentEscalationPct,
        leaseUpYears: partial?.leaseUpYears ?? leaseUpYears,
        freeRentMonths: partial?.freeRentMonths ?? freeRentMonths,
        yardRate: partial?.yardRate ?? yardRate,
        parkingSpacesCars: partial?.parkingSpacesCars ?? parkingSpacesCars,
        parkingRateCars: partial?.parkingRateCars ?? parkingRateCars,
        parkingSpacesTrailers:
          partial?.parkingSpacesTrailers ?? parkingSpacesTrailers,
        parkingRateTrailers:
          partial?.parkingRateTrailers ?? parkingRateTrailers,
      });
      updateCashInflows({ warehouseRevenue: next }, "operational");
    },
    [
      totalGfa,
      yardAreaLocked,
      occupancyRate,
      ratePerSqftYear,
      rentEscalationPct,
      leaseUpYears,
      freeRentMonths,
      yardRate,
      parkingSpacesCars,
      parkingRateCars,
      parkingSpacesTrailers,
      parkingRateTrailers,
      updateCashInflows,
    ]
  );

  // Keep locked GFA / yard synced + persist Year-1 totals
  useEffect(() => {
    persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalGfa, yardAreaLocked]);

  // Apply AI when research lands over empty/bench defaults (preserve user edits)
  useEffect(() => {
    const patch: {
      occupancyRate?: number;
      ratePerSqftYear?: number;
      rentEscalationPct?: number;
      leaseUpYears?: number;
      freeRentMonths?: number;
      yardRate?: number;
      parkingRateCars?: number;
      parkingRateTrailers?: number;
    } = {};
    const canApply = (stored: number | undefined, bench: number) =>
      stored == null || stored === bench;

    if (
      aiOccupancy != null &&
      !overrides.occupancyRate &&
      canApply(storedRevenue?.occupancyRate, benchOccupancy)
    ) {
      setOccupancyRate(aiOccupancy);
      patch.occupancyRate = aiOccupancy;
    }
    if (
      aiRate != null &&
      !overrides.ratePerSqftYear &&
      canApply(storedRevenue?.ratePerSqftYear, benchRate)
    ) {
      setRatePerSqftYear(aiRate);
      patch.ratePerSqftYear = aiRate;
    }
    if (
      aiEscalation != null &&
      !overrides.rentEscalationPct &&
      canApply(storedRevenue?.rentEscalationPct, benchEscalation)
    ) {
      setRentEscalationPct(aiEscalation);
      patch.rentEscalationPct = aiEscalation;
    }
    if (
      aiLeaseUp != null &&
      !overrides.leaseUpYears &&
      canApply(storedRevenue?.leaseUpYears, benchLeaseUp)
    ) {
      setLeaseUpYears(aiLeaseUp);
      patch.leaseUpYears = aiLeaseUp;
    }
    if (
      aiFreeRent != null &&
      !overrides.freeRentMonths &&
      canApply(storedRevenue?.freeRentMonths, benchFreeRent)
    ) {
      setFreeRentMonths(aiFreeRent);
      patch.freeRentMonths = aiFreeRent;
    }
    if (
      aiYardRate != null &&
      !overrides.yardRate &&
      canApply(storedRevenue?.yardRate, benchYardRate)
    ) {
      setYardRate(aiYardRate);
      patch.yardRate = aiYardRate;
    }
    if (
      aiParkingRateCars != null &&
      !overrides.parkingRateCars &&
      canApply(storedRevenue?.parkingRateCars, benchParkingRateCars)
    ) {
      setParkingRateCars(aiParkingRateCars);
      patch.parkingRateCars = aiParkingRateCars;
    }
    if (
      aiParkingRateTrailers != null &&
      !overrides.parkingRateTrailers &&
      canApply(storedRevenue?.parkingRateTrailers, benchParkingRateTrailers)
    ) {
      setParkingRateTrailers(aiParkingRateTrailers);
      patch.parkingRateTrailers = aiParkingRateTrailers;
    }
    if (Object.keys(patch).length > 0) {
      persist(patch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    aiOccupancy,
    aiRate,
    aiEscalation,
    aiLeaseUp,
    aiFreeRent,
    aiYardRate,
    aiParkingRateCars,
    aiParkingRateTrailers,
  ]);

  // Keep parking counts synced from Step 5 when not manually overridden
  useEffect(() => {
    if (!overrides.parkingSpacesCars) {
      setParkingSpacesCars(defaultParkingCars);
    }
    if (!overrides.parkingSpacesTrailers) {
      setParkingSpacesTrailers(defaultParkingTrailers);
    }
    if (!overrides.parkingSpacesCars || !overrides.parkingSpacesTrailers) {
      persist({
        parkingSpacesCars: overrides.parkingSpacesCars
          ? parkingSpacesCars
          : defaultParkingCars,
        parkingSpacesTrailers: overrides.parkingSpacesTrailers
          ? parkingSpacesTrailers
          : defaultParkingTrailers,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultParkingCars, defaultParkingTrailers]);

  const handleFieldChange = useCallback(
    (field: string, value: number) => {
      const setters: Record<string, (v: number) => void> = {
        occupancyRate: setOccupancyRate,
        ratePerSqftYear: setRatePerSqftYear,
        rentEscalationPct: setRentEscalationPct,
        leaseUpYears: setLeaseUpYears,
        freeRentMonths: setFreeRentMonths,
        yardRate: setYardRate,
        parkingSpacesCars: setParkingSpacesCars,
        parkingRateCars: setParkingRateCars,
        parkingSpacesTrailers: setParkingSpacesTrailers,
        parkingRateTrailers: setParkingRateTrailers,
      };
      setters[field]?.(value);
      setOverrides((prev) => ({ ...prev, [field]: true }));
      persist({ [field]: value } as never);
    },
    [persist]
  );

  const handleResetRental = useCallback(() => {
    const occ = aiOccupancy ?? benchOccupancy;
    const rate = aiRate ?? benchRate;
    const esc = aiEscalation ?? benchEscalation;
    const lease = aiLeaseUp ?? benchLeaseUp;
    const free = aiFreeRent ?? benchFreeRent;
    setOccupancyRate(occ);
    setRatePerSqftYear(rate);
    setRentEscalationPct(esc);
    setLeaseUpYears(lease);
    setFreeRentMonths(free);
    setOverrides((prev) => ({
      ...prev,
      occupancyRate: false,
      ratePerSqftYear: false,
      rentEscalationPct: false,
      leaseUpYears: false,
      freeRentMonths: false,
    }));
    setManualYearValues((prev) => {
      const next = { ...prev };
      for (const y of Object.keys(next)) {
        const key = Number(y);
        if (!next[key]) continue;
        const { occupancy: _o, rate: _r, grossRent: _g, ...rest } = next[key];
        next[key] = rest;
      }
      return next;
    });
    persist({
      occupancyRate: occ,
      ratePerSqftYear: rate,
      rentEscalationPct: esc,
      leaseUpYears: lease,
      freeRentMonths: free,
    });
  }, [
    aiOccupancy,
    aiRate,
    aiEscalation,
    aiLeaseUp,
    aiFreeRent,
    benchOccupancy,
    benchRate,
    benchEscalation,
    benchLeaseUp,
    benchFreeRent,
    persist,
  ]);

  const handleResetOther = useCallback(() => {
    const yr = aiYardRate ?? benchYardRate;
    const carRate = aiParkingRateCars ?? benchParkingRateCars;
    const trailerRate = aiParkingRateTrailers ?? benchParkingRateTrailers;
    setYardRate(yr);
    setParkingSpacesCars(defaultParkingCars);
    setParkingRateCars(carRate);
    setParkingSpacesTrailers(defaultParkingTrailers);
    setParkingRateTrailers(trailerRate);
    setOverrides((prev) => ({
      ...prev,
      yardRate: false,
      parkingSpacesCars: false,
      parkingRateCars: false,
      parkingSpacesTrailers: false,
      parkingRateTrailers: false,
    }));
    persist({
      yardRate: yr,
      parkingSpacesCars: defaultParkingCars,
      parkingRateCars: carRate,
      parkingSpacesTrailers: defaultParkingTrailers,
      parkingRateTrailers: trailerRate,
    });
  }, [
    aiYardRate,
    aiParkingRateCars,
    aiParkingRateTrailers,
    benchYardRate,
    benchParkingRateCars,
    benchParkingRateTrailers,
    defaultParkingCars,
    defaultParkingTrailers,
    persist,
  ]);

  const handleResetAll = useCallback(() => {
    handleResetRental();
    handleResetOther();
    setManualYearValues({});
    setOverrides({});
  }, [handleResetRental, handleResetOther]);

  const tableRows = useMemo(
    () =>
      generateWarehouse10YearProjection({
        totalGfa,
        occupancyRate,
        ratePerSqftYear,
        rentEscalationPct,
        leaseUpYears,
        freeRentMonths,
        yardArea: yardAreaLocked,
        yardRate,
        parkingSpacesCars,
        parkingRateCars,
        parkingSpacesTrailers,
        parkingRateTrailers,
        manualYearValues,
      }),
    [
      totalGfa,
      occupancyRate,
      ratePerSqftYear,
      rentEscalationPct,
      leaseUpYears,
      freeRentMonths,
      yardAreaLocked,
      yardRate,
      parkingSpacesCars,
      parkingRateCars,
      parkingSpacesTrailers,
      parkingRateTrailers,
      manualYearValues,
    ]
  );

  const chartData = useMemo(
    () =>
      tableRows.map((row) => ({
        year: `Y${row.year}`,
        "Gross Rent": row.grossRent / 1_000_000,
        "Yard Revenue": row.yardRevenue / 1_000_000,
        "Parking Revenue": row.parkingRevenue / 1_000_000,
      })),
    [tableRows]
  );

  const leaseUpChartData = useMemo(
    () =>
      tableRows.map((row) => ({
        year: `Y${row.year}`,
        "Occupancy %": row.occupancy,
      })),
    [tableRows]
  );

  const hasManualOverride =
    Object.values(overrides).some(Boolean) ||
    Object.keys(manualYearValues).length > 0;

  const rentalAiOverride =
    !!overrides.occupancyRate ||
    !!overrides.ratePerSqftYear ||
    !!overrides.rentEscalationPct ||
    !!overrides.leaseUpYears ||
    !!overrides.freeRentMonths;
  const otherAiOverride =
    !!overrides.yardRate ||
    !!overrides.parkingRateCars ||
    !!overrides.parkingRateTrailers ||
    !!overrides.parkingSpacesCars ||
    !!overrides.parkingSpacesTrailers;

  const warehouseSubType = cashOutflows.warehouseSubType;
  const qualityGrade = cashOutflows.qualityGrade;

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 1 — Warehouse / Industrial Rent, Lease-Up
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Configure base rent and lease-up for the warehouse/industrial facility.{" "}
          <span className="text-amber-500">Amber borders</span> indicate manual
          overrides.
        </p>
      </div>

      <BenchmarkHeader
        assetType="warehouse"
        country={projectInfo.country || "UAE"}
        segment={warehouseSubType}
        positioning={qualityGrade}
        onUseDefaults={handleResetAll}
        isManualOverride={hasManualOverride}
        resetButtonLabel="Reset to benchmark"
      />

      {/* Card 1: Rental Revenue */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Inputs – Rental Revenue
          </h3>
          <button
            type="button"
            onClick={handleResetRental}
            className={`text-xs font-medium transition-colors ${
              rentalAiOverride
                ? "text-emerald-400 hover:text-emerald-300"
                : "cursor-default text-slate-500"
            }`}
            disabled={!rentalAiOverride}
          >
            Reset rental
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Total GFA (sqft)
            </label>
            <input
              type="number"
              value={totalGfa}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
              title="Locked: Defined in Component 1 Step 5 Building Configuration"
            />
            <p className="mt-1 text-xs text-amber-400">
              🔒 Locked: To change, go back to Component 1 Step 5
            </p>
            {fieldError?.("totalGfa") ? (
              <p className="mt-1 text-sm text-red-400">{fieldError("totalGfa")}</p>
            ) : null}
          </div>

          <div>
            <AiInput
              label="Occupancy Rate (%) — Stabilized"
              value={occupancyRate}
              onChange={(val) =>
                handleFieldChange("occupancyRate", Number(val) || 0)
              }
              type="percentage"
              step={0.1}
              min={0}
              max={100}
              isAiGenerated={aiOccupancy != null && !overrides.occupancyRate}
              isManualOverride={!!overrides.occupancyRate}
            />
            {fieldError?.("occupancyRate") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("occupancyRate")}
              </p>
            ) : null}
          </div>

          <div>
            <AiInput
              label={`Rate per sqft / year (${currencyCode})`}
              value={ratePerSqftYear}
              onChange={(val) =>
                handleFieldChange("ratePerSqftYear", Number(val) || 0)
              }
              type="number"
              step={0.01}
              min={0}
              isAiGenerated={aiRate != null && !overrides.ratePerSqftYear}
              isManualOverride={!!overrides.ratePerSqftYear}
            />
            {fieldError?.("ratePerSqftYear") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("ratePerSqftYear")}
              </p>
            ) : null}
          </div>

          <div>
            <AiInput
              label="Annual Rent Escalation (%)"
              value={rentEscalationPct}
              onChange={(val) =>
                handleFieldChange("rentEscalationPct", Number(val) || 0)
              }
              type="percentage"
              step={0.1}
              min={0}
              isAiGenerated={
                aiEscalation != null && !overrides.rentEscalationPct
              }
              isManualOverride={!!overrides.rentEscalationPct}
            />
          </div>

          <div>
            <AiInput
              label="Lease-Up Period (Years)"
              value={leaseUpYears}
              onChange={(val) =>
                handleFieldChange("leaseUpYears", Number(val) || 0)
              }
              type="number"
              step={0.1}
              min={0.1}
              isAiGenerated={aiLeaseUp != null && !overrides.leaseUpYears}
              isManualOverride={!!overrides.leaseUpYears}
            />
          </div>

          <div>
            <AiInput
              label="Average Free Rent (Months)"
              value={freeRentMonths}
              onChange={(val) =>
                handleFieldChange("freeRentMonths", Number(val) || 0)
              }
              type="number"
              step={1}
              min={0}
              max={12}
              isAiGenerated={aiFreeRent != null && !overrides.freeRentMonths}
              isManualOverride={!!overrides.freeRentMonths}
            />
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-slate-700/80 bg-slate-900/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Annual Gross Rent (Year 1)
          </p>
          <p className="mt-1 font-mono text-xl font-semibold text-emerald-400">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: currencyCode,
              maximumFractionDigits: 0,
            }).format(tableRows[0]?.grossRent ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            GFA × Y1 occupancy (lease-up) × rate × free-rent factor
          </p>
        </div>
      </div>

      {/* Card 2: Other Rental Income */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Inputs – Other Rental Income
          </h3>
          <button
            type="button"
            onClick={handleResetOther}
            className={`text-xs font-medium transition-colors ${
              otherAiOverride
                ? "text-emerald-400 hover:text-emerald-300"
                : "cursor-default text-slate-500"
            }`}
            disabled={!otherAiOverride}
          >
            Reset other income
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Yard / Hardstand Area (sqft)
            </label>
            <input
              type="number"
              value={yardAreaLocked}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
            />
            <p className="mt-1 text-xs text-amber-400">
              🔒 Locked: To change, go back to Component 1 Step 5
            </p>
          </div>
          <div>
            <AiInput
              label={`Yard Rate (${currencyCode} / sqft / year)`}
              value={yardRate}
              onChange={(val) =>
                handleFieldChange("yardRate", Number(val) || 0)
              }
              type="number"
              step={0.01}
              min={0}
              isAiGenerated={aiYardRate != null && !overrides.yardRate}
              isManualOverride={!!overrides.yardRate}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Yard Revenue
            </label>
            <input
              type="text"
              readOnly
              value={new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: currencyCode,
                maximumFractionDigits: 0,
              }).format(yardAreaLocked * yardRate)}
              className={`${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 font-semibold text-emerald-400`}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
            <p className="mb-3 text-sm font-medium text-slate-300">
              Parking — Cars
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Spaces (from Step 5)
                </label>
                <input
                  type="number"
                  min={0}
                  value={parkingSpacesCars}
                  onChange={(e) =>
                    handleFieldChange(
                      "parkingSpacesCars",
                      Number(e.target.value) || 0
                    )
                  }
                  className={`${inputBase} border border-slate-600`}
                />
              </div>
              <div>
                <AiInput
                  label={`Rate / month (${currencyCode})`}
                  type="number"
                  min={0}
                  value={parkingRateCars}
                  onChange={(val) =>
                    handleFieldChange("parkingRateCars", Number(val) || 0)
                  }
                  isAiGenerated={
                    aiParkingRateCars != null && !overrides.parkingRateCars
                  }
                  isManualOverride={!!overrides.parkingRateCars}
                />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
            <p className="mb-3 text-sm font-medium text-slate-300">
              Parking — Trailers
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Spaces (from Step 5)
                </label>
                <input
                  type="number"
                  min={0}
                  value={parkingSpacesTrailers}
                  onChange={(e) =>
                    handleFieldChange(
                      "parkingSpacesTrailers",
                      Number(e.target.value) || 0
                    )
                  }
                  className={`${inputBase} border border-slate-600`}
                />
              </div>
              <div>
                <AiInput
                  label={`Rate / month (${currencyCode})`}
                  type="number"
                  min={0}
                  value={parkingRateTrailers}
                  onChange={(val) =>
                    handleFieldChange(
                      "parkingRateTrailers",
                      Number(val) || 0
                    )
                  }
                  isAiGenerated={
                    aiParkingRateTrailers != null &&
                    !overrides.parkingRateTrailers
                  }
                  isManualOverride={!!overrides.parkingRateTrailers}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 10-Year Table */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR TABLE – WAREHOUSE / INDUSTRIAL REVENUE
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="border-r border-slate-700 px-2 py-3">Year</th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Occupancy %
                  <br />
                  <span className="text-amber-400 normal-case">amber</span>
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Rate / sqft
                  <br />({currencyCode})
                  <br />
                  <span className="text-amber-400 normal-case">amber</span>
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Gross Rent
                  <br />({currencyCode} M)
                  <br />
                  <span className="text-slate-500 normal-case">(auto)</span>
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Yard Rev
                  <br />({currencyCode} M)
                  <br />
                  <span className="text-slate-500 normal-case">(auto)</span>
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Parking Rev
                  <br />({currencyCode} M)
                  <br />
                  <span className="text-slate-500 normal-case">(auto)</span>
                </th>
                <th className="px-2 py-3">
                  Total Revenue
                  <br />({currencyCode} M)
                  <br />
                  <span className="text-slate-500 normal-case">(auto)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr
                  key={row.year}
                  className={`border-b border-slate-800 transition ${
                    row.isOverridden
                      ? "bg-amber-900/10"
                      : "hover:bg-slate-800/50"
                  }`}
                >
                  <td className="border-r border-slate-700 px-2 py-3 font-medium text-white">
                    {row.year}
                  </td>
                  <td className="border-r border-slate-700 px-2 py-3">
                    <input
                      type="number"
                      step="0.1"
                      value={row.occupancy.toFixed(1)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setManualYearValues((prev) => ({
                          ...prev,
                          [row.year]: { ...prev[row.year], occupancy: val },
                        }));
                      }}
                      className={`w-16 rounded bg-slate-800 p-1 text-right ${
                        manualYearValues[row.year]?.occupancy != null
                          ? "border border-amber-500"
                          : "border border-transparent"
                      }`}
                    />
                  </td>
                  <td className="border-r border-slate-700 px-2 py-3">
                    <input
                      type="number"
                      step="0.1"
                      value={row.rate.toFixed(2)}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value) || 0;
                        if (row.year === 1) {
                          handleFieldChange("ratePerSqftYear", parsed);
                        } else {
                          setManualYearValues((prev) => ({
                            ...prev,
                            [row.year]: { ...prev[row.year], rate: parsed },
                          }));
                        }
                      }}
                      className={`w-16 rounded bg-slate-800 p-1 text-right ${
                        manualYearValues[row.year]?.rate != null ||
                        (row.year === 1 && overrides.ratePerSqftYear)
                          ? "border border-amber-500"
                          : "border border-transparent"
                      }`}
                    />
                  </td>
                  <td className="border-r border-slate-700 px-2 py-3 text-right font-mono text-emerald-400">
                    {(row.grossRent / 1_000_000).toFixed(2)}
                  </td>
                  <td className="border-r border-slate-700 px-2 py-3 text-right font-mono text-teal-400">
                    {(row.yardRevenue / 1_000_000).toFixed(2)}
                  </td>
                  <td className="border-r border-slate-700 px-2 py-3 text-right font-mono text-blue-400">
                    {(row.parkingRevenue / 1_000_000).toFixed(2)}
                  </td>
                  <td className="px-2 py-3 text-right font-mono font-semibold text-emerald-400">
                    {(row.totalRevenue / 1_000_000).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800 font-bold text-white">
                <td className="border-r border-slate-700 px-2 py-3">
                  10-Year Total
                </td>
                <td colSpan={2} className="border-r border-slate-700 px-2 py-3" />
                <td className="border-r border-slate-700 px-2 py-3 text-right text-emerald-400">
                  {(
                    tableRows.reduce((s, r) => s + r.grossRent, 0) / 1_000_000
                  ).toFixed(2)}
                </td>
                <td className="border-r border-slate-700 px-2 py-3 text-right text-teal-400">
                  {(
                    tableRows.reduce((s, r) => s + r.yardRevenue, 0) / 1_000_000
                  ).toFixed(2)}
                </td>
                <td className="border-r border-slate-700 px-2 py-3 text-right text-blue-400">
                  {(
                    tableRows.reduce((s, r) => s + r.parkingRevenue, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
                <td className="px-2 py-3 text-right text-emerald-400">
                  {(
                    tableRows.reduce((s, r) => s + r.totalRevenue, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-700 bg-slate-800/50 p-3 text-[10px] text-slate-400">
          <p>
            * Occupancy ramps linearly over the lease-up period to the
            stabilized occupancy rate. Year 1 applies free-rent factor: (12 −
            free rent months) / 12.
          </p>
          <p>
            ** Rate escalates annually: Year N rate = Year 1 rate × (1 +
            escalation%)^(N−1). Yard and parking assumed flat (no escalation).
          </p>
          {warehouseSubType || qualityGrade ? (
            <p className="mt-1 text-slate-500">
              Profile:{" "}
              {warehouseSubType
                ? WAREHOUSE_SUB_TYPE_LABELS[warehouseSubType] || warehouseSubType
                : "—"}{" "}
              ·{" "}
              {qualityGrade
                ? QUALITY_GRADE_LABELS[qualityGrade] || qualityGrade
                : "—"}
            </p>
          ) : null}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">
            TOTAL REVENUE BY YEAR ({currencyCode} M)
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
                    formatter={(val) => `${Number(val ?? 0).toFixed(2)}M`}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
                  <Bar dataKey="Gross Rent" stackId="a" fill="#10b981" />
                  <Bar dataKey="Yard Revenue" stackId="a" fill="#14b8a6" />
                  <Bar dataKey="Parking Revenue" stackId="a" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">
            OCCUPANCY / LEASE-UP CURVE (%)
          </h3>
          <div className="h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={leaseUpChartData}
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
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                    formatter={(val) => `${Number(val ?? 0).toFixed(1)}%`}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
                  <Line
                    type="monotone"
                    dataKey="Occupancy %"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
