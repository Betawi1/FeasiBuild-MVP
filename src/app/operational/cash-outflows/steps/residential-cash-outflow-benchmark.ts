"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  getResidentialBenchmark,
  getResidentialBenchmarkProfileKey,
  type ResidentialConstructionBenchmark,
} from "@/lib/benchmarks/residential-construction-costs";
import { logOperationalCashOutflow } from "@/lib/operational-audit-fields";
import useFinModelStore, {
  type CashOutflows,
  type ProjectInfo,
} from "@/store/useFinModelStore";

export const RESIDENTIAL_BENCHMARK_EPS = 0.01;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Optional AI research rates — preferred over static MVP table when present. */
export type ResidentialAiBenchmarkRates = {
  buildingRate?: number;
  parkingRate?: number;
  basementRate?: number;
  softCostsPercent?: number;
  powcPercent?: number;
  ffePercent?: number;
  landRate?: number;
};

export type ResidentialCcRateOverrides = {
  building: boolean;
  parking: boolean;
  basement: boolean;
  any: boolean;
};

function pickRate(
  ai: number | undefined,
  fallback: number
): number {
  return ai != null && Number.isFinite(ai) && ai > 0 ? ai : fallback;
}

export function useResidentialCashOutflowBenchmark(
  projectInfo: ProjectInfo,
  cashOutflows: CashOutflows,
  updateCashOutflows: (data: Partial<CashOutflows>) => void,
  enabled: boolean,
  aiRates?: ResidentialAiBenchmarkRates | null
) {
  const profilePrevKeyRef = useRef<string | null>(null);

  const staticBenchmark = useMemo(() => {
    if (!enabled) return null;
    if (
      !projectInfo.residentialSegment?.trim() ||
      !projectInfo.residentialPositioning?.trim()
    ) {
      return null;
    }
    return getResidentialBenchmark(
      projectInfo.country,
      projectInfo.residentialSegment,
      projectInfo.residentialPositioning,
      projectInfo.residentialFurnishingLevel || "unfurnished",
      projectInfo.residentialIsServicedApartment || false
    );
  }, [
    enabled,
    projectInfo.country,
    projectInfo.residentialSegment,
    projectInfo.residentialPositioning,
    projectInfo.residentialFurnishingLevel,
    projectInfo.residentialIsServicedApartment,
  ]);

  /** Effective benchmark: AI research rates when available, else static MVP table. */
  const benchmark = useMemo((): ResidentialConstructionBenchmark | null => {
    if (!staticBenchmark) return null;
    return {
      ...staticBenchmark,
      buildingRate: pickRate(aiRates?.buildingRate, staticBenchmark.buildingRate),
      parkingRate: pickRate(aiRates?.parkingRate, staticBenchmark.parkingRate),
      basementRate: pickRate(aiRates?.basementRate, staticBenchmark.basementRate),
      softCostsPercent: pickRate(
        aiRates?.softCostsPercent,
        staticBenchmark.softCostsPercent
      ),
      powcPercent: pickRate(aiRates?.powcPercent, staticBenchmark.powcPercent),
      ffePercent: pickRate(aiRates?.ffePercent, staticBenchmark.ffePercent),
      landRate: pickRate(aiRates?.landRate, staticBenchmark.landRate),
    };
  }, [staticBenchmark, aiRates]);

  const profileKey = useMemo(() => {
    if (!enabled) return null;
    if (
      !projectInfo.residentialSegment?.trim() ||
      !projectInfo.residentialPositioning?.trim()
    ) {
      return null;
    }
    return getResidentialBenchmarkProfileKey(
      projectInfo.country,
      projectInfo.residentialSegment,
      projectInfo.residentialPositioning,
      projectInfo.residentialFurnishingLevel || "unfurnished",
      projectInfo.residentialIsServicedApartment || false
    );
  }, [
    enabled,
    projectInfo.country,
    projectInfo.residentialSegment,
    projectInfo.residentialPositioning,
    projectInfo.residentialFurnishingLevel,
    projectInfo.residentialIsServicedApartment,
  ]);

  const benchmarkReady =
    enabled &&
    !!projectInfo.residentialSegment?.trim() &&
    !!projectInfo.residentialPositioning?.trim() &&
    !!benchmark;

  const ccRateOverrides = useMemo((): ResidentialCcRateOverrides => {
    if (!benchmark || !enabled) {
      return { building: false, parking: false, basement: false, any: false };
    }
    const differs = (current: number, b: number) =>
      Math.abs(current - b) > RESIDENTIAL_BENCHMARK_EPS;
    const building = differs(
      cashOutflows.buildingRate,
      benchmark.buildingRate
    );
    const parking = differs(cashOutflows.parkingRate, benchmark.parkingRate);
    const basement = differs(
      cashOutflows.basementRate,
      benchmark.basementRate
    );
    return {
      building,
      parking,
      basement,
      any: building || parking || basement,
    };
  }, [
    benchmark,
    enabled,
    cashOutflows.buildingRate,
    cashOutflows.parkingRate,
    cashOutflows.basementRate,
  ]);

  const hasManualOverride =
    enabled &&
    !!(
      cashOutflows.operationalResidentialBuildingRateManual ||
      cashOutflows.operationalResidentialParkingRateManual ||
      cashOutflows.operationalResidentialBasementRateManual ||
      cashOutflows.operationalResidentialScManual ||
      cashOutflows.operationalResidentialPowcManual ||
      cashOutflows.operationalResidentialFfeManual ||
      cashOutflows.operationalResidentialLandRateManual
    );

  const resetProfileDefaults = useCallback(() => {
    if (!benchmark || !profileKey) return;

    console.log("[Benchmark Reset] Residential AI rates:", aiRates);
    console.log("[Benchmark Reset] Effective construction rates:", {
      buildingRate: benchmark.buildingRate,
      parkingRate: benchmark.parkingRate,
      basementRate: benchmark.basementRate,
      softCostsPercent: benchmark.softCostsPercent,
      powcPercent: benchmark.powcPercent,
      ffePercent: benchmark.ffePercent,
      landRate: benchmark.landRate,
      source: aiRates?.buildingRate ? "ai" : "static_mvp",
    });

    updateCashOutflows({
      operationalResidentialProfileKey: profileKey,
      operationalResidentialBuildingRateManual: false,
      operationalResidentialParkingRateManual: false,
      operationalResidentialBasementRateManual: false,
      operationalResidentialScManual: false,
      operationalResidentialPowcManual: false,
      operationalResidentialFfeManual: false,
      operationalResidentialLandRateManual: false,
      buildingRate: benchmark.buildingRate,
      parkingRate: benchmark.parkingRate,
      basementRate: benchmark.basementRate,
      softCostPercent: round2(benchmark.softCostsPercent),
      powcPercent: round2(benchmark.powcPercent),
      ffePercent: round2(benchmark.ffePercent),
      landRate: benchmark.landRate,
    });
    profilePrevKeyRef.current = profileKey;
  }, [benchmark, profileKey, aiRates, updateCashOutflows]);

  const handleCcRateChange = useCallback(
    (
      field: "buildingRate" | "parkingRate" | "basementRate",
      manualFlag:
        | "operationalResidentialBuildingRateManual"
        | "operationalResidentialParkingRateManual"
        | "operationalResidentialBasementRateManual",
      value: number,
      benchmarkValue: number
    ) => {
      const hasChanged =
        Math.abs(value - benchmarkValue) > RESIDENTIAL_BENCHMARK_EPS;
      updateCashOutflows({
        [field]: value,
        [manualFlag]: hasChanged,
      });
      logOperationalCashOutflow(field, value, 6);
    },
    [updateCashOutflows]
  );

  const rateFieldClass = (manual?: boolean) =>
    `w-full px-3 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      manual
        ? "border-2 border-amber-500/70 bg-amber-900/10"
        : "border border-slate-700 bg-slate-800"
    }`;

  const percentFieldClass = (manual?: boolean) =>
    `w-full rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      manual
        ? "border-2 border-amber-500/70 bg-amber-900/10"
        : "border border-slate-700 bg-slate-800"
    }`;

  useEffect(() => {
    if (!enabled || !benchmark || !profileKey) return;

    const st = useFinModelStore.getState().operational?.cashOutflows;
    const keyChanged =
      profilePrevKeyRef.current !== null &&
      profilePrevKeyRef.current !== profileKey;
    profilePrevKeyRef.current = profileKey;

    const patch: Partial<CashOutflows> = {
      operationalResidentialProfileKey: profileKey,
    };

    if (keyChanged) {
      patch.operationalResidentialBuildingRateManual = false;
      patch.operationalResidentialParkingRateManual = false;
      patch.operationalResidentialBasementRateManual = false;
      patch.operationalResidentialScManual = false;
      patch.operationalResidentialPowcManual = false;
      patch.operationalResidentialFfeManual = false;
      patch.operationalResidentialLandRateManual = false;
      patch.buildingRate = benchmark.buildingRate;
      patch.parkingRate = benchmark.parkingRate;
      patch.basementRate = benchmark.basementRate;
      patch.softCostPercent = round2(benchmark.softCostsPercent);
      patch.powcPercent = round2(benchmark.powcPercent);
      patch.ffePercent = round2(benchmark.ffePercent);
      patch.landRate = benchmark.landRate;
      updateCashOutflows(patch);
      return;
    }

    if (!st?.operationalResidentialBuildingRateManual)
      patch.buildingRate = benchmark.buildingRate;
    if (!st?.operationalResidentialParkingRateManual)
      patch.parkingRate = benchmark.parkingRate;
    if (!st?.operationalResidentialBasementRateManual)
      patch.basementRate = benchmark.basementRate;
    if (!st?.operationalResidentialScManual)
      patch.softCostPercent = round2(benchmark.softCostsPercent);
    if (!st?.operationalResidentialPowcManual)
      patch.powcPercent = round2(benchmark.powcPercent);
    if (!st?.operationalResidentialFfeManual)
      patch.ffePercent = round2(benchmark.ffePercent);
    if (!st?.operationalResidentialLandRateManual)
      patch.landRate = benchmark.landRate;

    const numDiff = (next: number | undefined, cur: number) =>
      next !== undefined && Math.abs(next - cur) > 0.004;

    if (
      numDiff(patch.buildingRate, st?.buildingRate ?? 0) ||
      numDiff(patch.parkingRate, st?.parkingRate ?? 0) ||
      numDiff(patch.basementRate, st?.basementRate ?? 0) ||
      numDiff(patch.softCostPercent, st?.softCostPercent ?? 0) ||
      numDiff(patch.powcPercent, st?.powcPercent ?? 0) ||
      numDiff(patch.ffePercent, st?.ffePercent ?? 0) ||
      numDiff(patch.landRate, st?.landRate ?? 0) ||
      patch.operationalResidentialProfileKey !==
        st?.operationalResidentialProfileKey
    ) {
      updateCashOutflows(patch);
    }
  }, [
    enabled,
    benchmark,
    profileKey,
    projectInfo.country,
    projectInfo.residentialSegment,
    projectInfo.residentialPositioning,
    projectInfo.residentialFurnishingLevel,
    projectInfo.residentialIsServicedApartment,
    updateCashOutflows,
  ]);

  return {
    benchmark,
    staticBenchmark,
    benchmarkReady,
    profileKey,
    ccRateOverrides,
    hasManualOverride,
    resetProfileDefaults,
    handleCcRateChange,
    rateFieldClass,
    percentFieldClass,
  };
}
