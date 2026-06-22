"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useFinModelStore from "@/store/useFinModelStore";
import BenchmarkProfile from "@/components/BenchmarkProfile";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import AdjustShockValues from "./steps/AdjustShockValues";
import {
  FACTOR_ID_TO_STORE_KEY,
  getAllFactorsForAsset,
  initialShocksForAsset,
  presetShocksForAsset,
  shocksToOperationalInput,
  normalizeAssetType,
} from "./config/shockFactors";
import {
  CustomDriverModal,
  type CustomDriverData,
} from "@/components/scenario/CustomDriverModal";
import { ShockSlider } from "@/components/scenario/ShockSlider";
import { MetricWithTooltip } from "@/components/scenario/MetricWithTooltip";
import useScenarioStore from "@/store/useScenarioStore";
import type { CustomShockDriver } from "@/types/scenario";
import { useStreamPrefix, withStreamPrefix } from "@/lib/stream-path";
import {
  applyDriverShocksToOperationalSnapshot,
  type OperationalScenarioSnapshot,
  runOperationalScenarioEngines,
} from "@/app/operational/engine/buildOperationalScenarioEngines";
import {
  buildLeveredEquityCashFlowsFromProjectIrr,
  leveredEquityIrrPctFromCashFlows,
  logComponent6IrrDebug,
  resolveLeveredEquityIrrPctFromFinModelStore,
} from "@/lib/scenario-irr-calculation";

type ScenarioPreset = "base" | "downside" | "upside";

type ScenarioMetrics = {
  unleveredIrr: number;
  unleveredPaybackMonths: number;
  leveredEquityIrr: number;
  leveredPaybackMonths: number;
  peakEquityRequired: number;
  minDscr: number;
};

// Placeholder base case (from Components 1–5)
const BASE_METRICS: ScenarioMetrics = {
  unleveredIrr: 14.2,
  unleveredPaybackMonths: 42,
  leveredEquityIrr: 18.5,
  leveredPaybackMonths: 48,
  peakEquityRequired: 12_000_000,
  minDscr: 1.35,
};

function toPct(maybePctOrDecimal: number | null | undefined): number | null {
  if (maybePctOrDecimal == null || !Number.isFinite(maybePctOrDecimal)) return null;
  // If the value looks like a decimal IRR (0.1145), convert to percent.
  if (Math.abs(maybePctOrDecimal) > 0 && Math.abs(maybePctOrDecimal) <= 1.5) {
    return maybePctOrDecimal * 100;
  }
  return maybePctOrDecimal;
}

// Approximate impact of each driver on levered IRR (percentage points) when moved from low to high
const DRIVER_IRR_IMPACT: Record<string, number> = {
  adr: 2.2,
  occupancy: 1.6,
  constructionCost: -2.8,
  constructionDuration: -1.2,
  interestRate: -1.4,
  operatingExpenses: -1.0,
  exitCapRate: -1.8,
  ffeReserve: -0.8,
};

type ShocksInput = Partial<{
  adr: number;
  occupancy: number;
  constructionCost: number;
  constructionDuration: number;
  interestRate: number;
  operatingExpenses: number;
  exitCapRate: number;
  ffeReserve: number;
}>;

function irrFactorForImpactType(t: CustomShockDriver["impactType"]): number {
  switch (t) {
    case "revenue":
      return 0.35;
    case "cost":
      return -0.3;
    case "timeline":
      return -0.2;
    case "custom":
      return 0.25;
    default:
      return 0.3;
  }
}

function applyShocks(base: ScenarioMetrics, shocks: ShocksInput): ScenarioMetrics {
  if (Object.values(shocks).every((v) => v === 0 || v === undefined)) {
    return { ...base };
  }

  const s = (v: number | undefined) => v ?? 0;
  // Driver shock semantics (placeholder math, UI-first):
  // - adr: % change
  // - occupancy: absolute pp change (treated as a revenue scalar proxy)
  // - constructionCost/operatingExpenses/ffeReserve: cost scalars
  // - constructionDuration: timeline drag (months)
  // - interestRate/exitCapRate: bps drag proxies
  const adrMultiplier = 1 + s(shocks.adr) / 100;
  // Proxy: each +1pp occupancy ≈ +1.5% revenue, each -1pp ≈ -1.5%
  const occMultiplier = 1 + (s(shocks.occupancy) * 1.5) / 100;
  const constructionCostMultiplier = 1 + s(shocks.constructionCost) / 100;
  const operatingExpenseMultiplier = 1 + s(shocks.operatingExpenses) / 100;
  const ffeReserveMultiplier = 1 + (s(shocks.ffeReserve) * 0.75) / 100;

  // +12 months ≈ +10% drag (tunable)
  const durationMultiplier = 1 + (s(shocks.constructionDuration) * 10) / (12 * 100);
  // +300bps ≈ +6% drag
  const interestMultiplier = 1 + (s(shocks.interestRate) * 6) / (300 * 100);
  // +150bps cap expansion ≈ +8% drag
  const exitCapMultiplier = 1 + (s(shocks.exitCapRate) * 8) / (150 * 100);

  const netMultiplier =
    (adrMultiplier * occMultiplier) /
    (constructionCostMultiplier *
      operatingExpenseMultiplier *
      ffeReserveMultiplier *
      durationMultiplier *
      interestMultiplier *
      exitCapMultiplier);

  return {
    ...base,
    unleveredIrr: Math.max(0, Math.min(100, base.unleveredIrr * netMultiplier)),
    leveredEquityIrr: Math.max(
      0,
      Math.min(150, base.leveredEquityIrr * netMultiplier * 1.05)
    ),
    unleveredPaybackMonths: Math.max(
      6,
      Math.round(base.unleveredPaybackMonths / netMultiplier)
    ),
    leveredPaybackMonths: Math.max(
      6,
      Math.round(base.leveredPaybackMonths / (netMultiplier * 1.05))
    ),
    peakEquityRequired: base.peakEquityRequired * constructionCostMultiplier,
    minDscr: Math.max(0.5, Math.min(2.5, base.minDscr * adrMultiplier)),
  };
}

function scenarioMetricsFromEngine(
  run: ReturnType<typeof runOperationalScenarioEngines> | null,
  unleveredIrr: number,
  unleveredPaybackMonths: number,
  leveredPaybackFallback: number
): ScenarioMetrics {
  if (!run) {
    return {
      unleveredIrr,
      unleveredPaybackMonths,
      leveredEquityIrr: BASE_METRICS.leveredEquityIrr,
      leveredPaybackMonths: leveredPaybackFallback,
      peakEquityRequired: BASE_METRICS.peakEquityRequired,
      minDscr: BASE_METRICS.minDscr,
    };
  }
  const m = run.metrics;
  const pb =
    m.equityPaybackMonth != null && m.equityPaybackMonth >= 0
      ? m.equityPaybackMonth
      : leveredPaybackFallback;
  return {
    unleveredIrr,
    unleveredPaybackMonths,
    leveredEquityIrr: m.equityIrrPct,
    leveredPaybackMonths: pb,
    peakEquityRequired: m.peakEquityInjected,
    minDscr: m.minDscr,
  };
}

export default function ScenarioAnalysisPage() {
  const streamPrefix = useStreamPrefix();
  const cashInflows = useFinModelStore((s) => s.operational?.cashInflows);
  const cashOutflows = useFinModelStore((s) => s.operational?.cashOutflows);
  const financing = useFinModelStore((s) => s.operational?.financing);
  const projectInfoSlice = useFinModelStore((s) => s.operational?.projectInfo);

  const baseInputs = useMemo(
    () => ({
      cashInflows: cashInflows ?? {},
      cashOutflows: cashOutflows ?? {},
      financing: financing ?? {},
      projectInfo: projectInfoSlice ?? {},
    }),
    [cashInflows, cashOutflows, financing, projectInfoSlice]
  );

  const hotelHoldSnapshot = useFinModelStore(
    (s) => s.operational?.hotelHoldSnapshot ?? null
  );
  const opProjectIRR = useFinModelStore((s) => s.operational?.projectIRR);
  const opEquityReturns = useFinModelStore((s) => s.operational?.equityReturns);
  const financingMetrics = useFinModelStore((s) => s.operational?.financingMetrics);

  const projectInfo = baseInputs.projectInfo;
  const buildingType = normalizeAssetType(projectInfo.buildingType);
  const currentStep = 1;

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const customDrivers = useScenarioStore((s) => s.customDrivers);
  const addCustomDriver = useScenarioStore((s) => s.addCustomDriver);
  const updateCustomDriver = useScenarioStore((s) => s.updateCustomDriver);
  const removeCustomDriver = useScenarioStore((s) => s.removeCustomDriver);
  const setDefaultDriverShock = useScenarioStore((s) => s.setDefaultDriverShock);

  const storedScenarioShocks = useFinModelStore(
    (s) => s.operational.scenarioShocks ?? {}
  );
  const setScenarioShocks = useFinModelStore((s) => s.setScenarioShocks);

  const [customFactorModalOpen, setCustomFactorModalOpen] = useState(false);

  const handleAddCustomDriver = useCallback(
    (data: CustomDriverData) => {
      if (useScenarioStore.getState().customDrivers.length >= 3) {
        return false;
      }
      addCustomDriver({
        name: data.name.trim(),
        baseValue: data.baseValue,
        shockValue: 0,
        minShock: data.minShock,
        maxShock: data.maxShock,
        step: data.step,
        unit: data.unit,
        impactType: data.impactType,
      });
      return true;
    },
    [addCustomDriver]
  );

  const handleRemoveCustomDriver = useCallback(
    (id: string) => {
      removeCustomDriver(id);
    },
    [removeCustomDriver]
  );

  const [preset, setPreset] = useState<ScenarioPreset>("base");

  const driverShocks = useMemo(() => {
    const merged = initialShocksForAsset(buildingType);
    getAllFactorsForAsset(buildingType).forEach((factor) => {
      merged[factor.id] =
        storedScenarioShocks[factor.id] ?? merged[factor.id] ?? factor.defaultValue;
    });
    return merged;
  }, [buildingType, storedScenarioShocks]);

  useEffect(() => {
    if (!isClient) return;
    const current = useFinModelStore.getState().operational.scenarioShocks ?? {};
    if (Object.keys(current).length > 0) return;

    const initial = initialShocksForAsset(buildingType);
    const ds = useScenarioStore.getState().defaultDrivers;
    Object.entries(FACTOR_ID_TO_STORE_KEY).forEach(([factorId, storeId]) => {
      const v = ds.find((d) => d.id === storeId)?.shockValue;
      if (v != null && Number.isFinite(v) && v !== 0) {
        initial[factorId] = v;
      }
    });
    setScenarioShocks(initial, "operational");
  }, [isClient, buildingType, setScenarioShocks]);

  const scenarioSnapshot: OperationalScenarioSnapshot = useMemo(
    () => ({
      cashInflows: baseInputs.cashInflows,
      cashOutflows: baseInputs.cashOutflows,
      financing: baseInputs.financing,
      projectInfo: baseInputs.projectInfo,
      hotelHoldSnapshot,
    }),
    [baseInputs, hotelHoldSnapshot]
  );

  const engineOpts = useMemo(
    () => ({ isClient, isDataReady: isClient }),
    [isClient]
  );

  const baseEngine = useMemo(
    () =>
      isClient
        ? runOperationalScenarioEngines(scenarioSnapshot, "base", engineOpts)
        : null,
    [isClient, scenarioSnapshot, engineOpts]
  );
  const upsideEngine = useMemo(
    () =>
      isClient
        ? runOperationalScenarioEngines(scenarioSnapshot, "upside", engineOpts)
        : null,
    [isClient, scenarioSnapshot, engineOpts]
  );
  const downsideEngine = useMemo(
    () =>
      isClient
        ? runOperationalScenarioEngines(scenarioSnapshot, "downside", engineOpts)
        : null,
    [isClient, scenarioSnapshot, engineOpts]
  );

  const shockedSnapshot = useMemo(
    () =>
      applyDriverShocksToOperationalSnapshot(
        scenarioSnapshot,
        driverShocks,
        buildingType
      ),
    [scenarioSnapshot, driverShocks, buildingType]
  );

  const shockedEngine = useMemo(
    () =>
      isClient
        ? runOperationalScenarioEngines(shockedSnapshot, "base", engineOpts)
        : null,
    [isClient, shockedSnapshot, engineOpts]
  );

  const component4LeveredIrrPct = useMemo(
    () =>
      resolveLeveredEquityIrrPctFromFinModelStore({
        financingMetrics,
        projectIRR: opProjectIRR,
      }),
    [financingMetrics, opProjectIRR]
  );

  const baseUnleveredIrr =
    toPct(opProjectIRR?.unleveredIRR) ??
    toPct(opProjectIRR?.projectMetrics?.unleveredIRR) ??
    BASE_METRICS.unleveredIrr;
  const baseUnleveredPayback =
    opProjectIRR?.unleveredPayback ?? BASE_METRICS.unleveredPaybackMonths;
  const leveredPaybackFallback =
    opEquityReturns?.paybackPeriod ?? BASE_METRICS.leveredPaybackMonths;

  const baseMetrics: ScenarioMetrics = useMemo(() => {
    const fromEngine = scenarioMetricsFromEngine(
      baseEngine,
      baseUnleveredIrr,
      baseUnleveredPayback,
      leveredPaybackFallback
    );
    const levered =
      component4LeveredIrrPct != null && Number.isFinite(component4LeveredIrrPct)
        ? component4LeveredIrrPct
        : fromEngine.leveredEquityIrr;
    return { ...fromEngine, leveredEquityIrr: levered };
  }, [
    baseEngine,
    baseUnleveredIrr,
    baseUnleveredPayback,
    leveredPaybackFallback,
    component4LeveredIrrPct,
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const cashFlows = buildLeveredEquityCashFlowsFromProjectIrr(opProjectIRR);
    logComponent6IrrDebug({
      label: "Base (Component 4 series)",
      totalEquityInvested:
        financingMetrics?.totalEquityAmount ??
        opProjectIRR?.projectMetrics?.totalEquityInvested,
      netExitProceeds:
        financingMetrics?.netExitProceeds ??
        opProjectIRR?.projectMetrics?.totalDistributions,
      cashFlows,
      calculatedIrrPct:
        component4LeveredIrrPct ?? leveredEquityIrrPctFromCashFlows(cashFlows),
      expectedIrrPct:
        financingMetrics?.equityIRR != null
          ? financingMetrics.equityIRR * 100
          : opProjectIRR?.projectMetrics?.leveredEquityIRR,
    });
    // eslint-disable-next-line no-console
    console.log("🔍 Component 6 Base IRR sources:", {
      displayedPct: baseMetrics.leveredEquityIrr,
      financingMetricsEquityIRR:
        financingMetrics?.equityIRR != null
          ? financingMetrics.equityIRR * 100
          : null,
      projectMetricsLevered: opProjectIRR?.projectMetrics?.leveredEquityIRR ?? null,
      c4EnginePct: baseEngine?.metrics.equityIrrPct ?? null,
      equityReturnsWizardPct: opEquityReturns?.leveredIRR ?? null,
    });
  }, [
    baseMetrics.leveredEquityIrr,
    baseEngine?.metrics.equityIrrPct,
    component4LeveredIrrPct,
    financingMetrics,
    opProjectIRR,
    opEquityReturns?.leveredIRR,
  ]);

  const downsideMetrics = useMemo(
    () =>
      scenarioMetricsFromEngine(
        downsideEngine,
        baseUnleveredIrr * 0.9,
        Math.max(6, Math.round(baseUnleveredPayback * 1.05)),
        leveredPaybackFallback
      ),
    [downsideEngine, baseUnleveredIrr, baseUnleveredPayback, leveredPaybackFallback]
  );

  const upsideMetrics = useMemo(
    () =>
      scenarioMetricsFromEngine(
        upsideEngine,
        baseUnleveredIrr * 1.1,
        Math.max(6, Math.round(baseUnleveredPayback * 0.95)),
        leveredPaybackFallback
      ),
    [upsideEngine, baseUnleveredIrr, baseUnleveredPayback, leveredPaybackFallback]
  );

  const applyPreset = (p: ScenarioPreset) => {
    setPreset(p);
    const next = presetShocksForAsset(buildingType, p);
    setScenarioShocks(next, "operational");
    Object.entries(FACTOR_ID_TO_STORE_KEY).forEach(([factorId, storeId]) => {
      if (!storeId) return;
      setDefaultDriverShock(storeId, next[factorId] ?? 0);
    });
  };

  const currentMetrics = useMemo(() => {
    const hasShocks = Object.values(driverShocks).some((v) => v !== 0);
    if (!hasShocks) return { ...baseMetrics };
    const fromShockedEngine = scenarioMetricsFromEngine(
      shockedEngine,
      baseUnleveredIrr,
      baseUnleveredPayback,
      leveredPaybackFallback
    );
    return {
      ...fromShockedEngine,
      unleveredIrr: applyShocks(
        baseMetrics,
        shocksToOperationalInput(driverShocks, buildingType)
      ).unleveredIrr,
    };
  }, [
    baseMetrics,
    baseUnleveredIrr,
    baseUnleveredPayback,
    leveredPaybackFallback,
    driverShocks,
    buildingType,
    shockedEngine,
  ]);

  const tornadoData = useMemo(() => {
    const baseIrr = currentMetrics.leveredEquityIrr;
    const mk = (name: string, delta: number) => ({
      driver: name,
      lowIrr: baseIrr + Math.min(0, delta),
      highIrr: baseIrr + Math.max(0, delta),
    });
    return [
      mk("ADR (±15%)", DRIVER_IRR_IMPACT.adr),
      mk("Occupancy Rate (±10pp)", DRIVER_IRR_IMPACT.occupancy),
      mk("Construction Cost (±20%)", DRIVER_IRR_IMPACT.constructionCost),
      mk("Construction Duration (±12 mo)", DRIVER_IRR_IMPACT.constructionDuration),
      mk("Interest Rate (-100 to +300bps)", DRIVER_IRR_IMPACT.interestRate),
      mk("Operating Expenses (-5% to +25%)", DRIVER_IRR_IMPACT.operatingExpenses),
      mk("Exit Cap Rate (-50 to +150bps)", DRIVER_IRR_IMPACT.exitCapRate),
      mk("FF&E Reserve (0% to +3% rev)", DRIVER_IRR_IMPACT.ffeReserve),
    ];
  }, [currentMetrics.leveredEquityIrr]);

  const downsideWarning =
    downsideMetrics.leveredEquityIrr < 12
      ? "Warning: Downside Equity IRR is below 12%. Project may be unfinanceable in a stress case."
      : null;
  const upsideSuccess =
    upsideMetrics.leveredEquityIrr >= 25
      ? "Upside Equity IRR is 25% or higher. Project has strong upside potential."
      : null;

  const handleDownloadSpreadsheet = () => {
    alert("Spreadsheet generation will create a formula-driven Google Sheet with scenario tables.");
  };

  const onValueChange = useCallback(
    (driverId: string, value: number) => {
      setPreset("base");
      const storeId = FACTOR_ID_TO_STORE_KEY[driverId];
      if (storeId) setDefaultDriverShock(storeId, value);
    },
    [setDefaultDriverShock]
  );

  const handleResetAllShocks = useCallback(() => {
    const base = presetShocksForAsset(buildingType, "base");
    setScenarioShocks(base, "operational");
    setPreset("base");
    Object.entries(FACTOR_ID_TO_STORE_KEY).forEach(([, storeId]) => {
      if (storeId) setDefaultDriverShock(storeId, 0);
    });
    useScenarioStore.getState().customDrivers.forEach((d) => {
      updateCustomDriver(d.id, { shockValue: 0 });
    });
  }, [
    buildingType,
    setScenarioShocks,
    setDefaultDriverShock,
    updateCustomDriver,
  ]);

  const formatCurrency = (n: number) =>
    (n / 1_000_000).toFixed(1) + "M";

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 pb-32">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              FinModel App — Component 6
            </h1>
            <p className="text-slate-400">
              Scenario Analysis — stress-test key drivers from Components 1–5.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <BenchmarkProfile />
        </div>

        {/* Base case summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">
            Base Case Metric Sources (by component)
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Location: {projectInfo.city || "—"},{" "}
            {projectInfo.country || "—"} · Currency: {projectInfo.currency} ·
            Building type: {projectInfo.buildingType}.
            Base case metrics are sourced as follows: Unlevered project IRR &
            peak equity from Component 3, levered equity IRR from Component 5,
            and min DSCR from Component 4.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <MetricWithTooltip
              label="Unlevered Project IRR"
              value={`${baseMetrics.unleveredIrr.toFixed(2)}%`}
              sourceComponent="Component 3 — /project-irr"
              sourceDescription="Calculated from Components 1–2 monthly cash flows (unlevered baseline)."
            />
            <MetricWithTooltip
              label="Levered Equity IRR"
              value={`${baseMetrics.leveredEquityIrr.toFixed(2)}%`}
              sourceComponent="Component 5 — /equity-returns"
              sourceDescription="Levered equity IRR from the equity waterfall / net equity cash flows."
            />
            <MetricWithTooltip
              label="Peak Equity"
              value={formatCurrency(baseMetrics.peakEquityRequired)}
              sourceComponent="Component 3 — /project-irr"
              sourceDescription="Peak funding requirement (proxy for peak equity need in the placeholder model)."
            />
            <MetricWithTooltip
              label="Min DSCR"
              value={`${baseMetrics.minDscr.toFixed(2)}x`}
              sourceComponent="Component 4 — /financing"
              sourceDescription="Minimum DSCR from the financing repayment / DSCR profile."
            />
          </div>
        </div>

        {/* Scenario presets */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">
            Scenario Presets
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset("base")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                preset === "base"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600"
              }`}
            >
              Base Case
            </button>
            <button
              type="button"
              onClick={() => applyPreset("downside")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                preset === "downside"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600"
              }`}
            >
              Downside
            </button>
            <button
              type="button"
              onClick={() => applyPreset("upside")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                preset === "upside"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600"
              }`}
            >
              Upside
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Base Case = current assumptions. Downside/Upside = one-touch shocks for{" "}
            {buildingType} (common + asset-specific drivers).
          </p>
        </div>

        {currentStep === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <AdjustShockValues
            assetType={buildingType}
            shocks={driverShocks}
            onShockChange={onValueChange}
            onResetAll={handleResetAllShocks}
            baseUnleveredIrr={baseMetrics.unleveredIrr}
            baseLeveredIrr={baseMetrics.leveredEquityIrr}
          >
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-6">
            <p className="text-sm text-slate-400">
              Custom factors ({customDrivers.length}/3)
            </p>
            <button
              type="button"
              onClick={() => setCustomFactorModalOpen(true)}
              disabled={customDrivers.length >= 3}
              className="rounded-lg border border-emerald-600/60 bg-emerald-600/15 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Add Custom Factor
            </button>
          </div>

          {/* Custom Drivers Section */}
          {customDrivers.length > 0 ? (
            <div className="mb-8 mt-6 border-t border-slate-800 pt-6">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Custom Drivers
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {customDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="relative rounded-xl border border-slate-700 bg-slate-900/50 p-5"
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomDriver(driver.id)}
                      className="absolute right-4 top-4 p-1 text-slate-500 transition-colors hover:text-red-400"
                      title="Remove driver"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>

                    <h3 className="mb-3 pr-10 text-sm font-semibold text-slate-200">
                      {driver.name}
                    </h3>

                    <ShockSlider
                      embedded
                      showDriverTitle={false}
                      driverName={driver.name}
                      driverId={driver.id}
                      currentValue={driver.shockValue}
                      minValue={driver.minShock}
                      maxValue={driver.maxShock}
                      step={driver.step}
                      unit={driver.unit}
                      baseIrr={baseMetrics.unleveredIrr}
                      baseLeveredIrr={baseMetrics.leveredEquityIrr}
                      irrImpactFactor={irrFactorForImpactType(driver.impactType)}
                      onValueChange={(id, value) =>
                        updateCustomDriver(id, { shockValue: value })
                      }
                      onReset={(id) => updateCustomDriver(id, { shockValue: 0 })}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          </AdjustShockValues>
        </div>
        )}

        <CustomDriverModal
          isOpen={customFactorModalOpen}
          onClose={() => setCustomFactorModalOpen(false)}
          onAddDriver={handleAddCustomDriver}
          existingCustomDriversCount={customDrivers.length}
        />

        {/* Side-by-side comparison table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 overflow-x-auto">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">
            Scenario Comparison
          </h2>
          <table className="min-w-full text-sm text-slate-200">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 pr-4 font-medium text-slate-400">METRIC</th>
                <th className="text-right py-2 px-3 font-medium text-slate-400">BASE</th>
                <th className="text-right py-2 px-3 font-medium text-slate-400">CURRENT</th>
                <th className="text-right py-2 px-3 font-medium text-slate-400">DOWNSIDE</th>
                <th className="text-right py-2 px-3 font-medium text-slate-400">UPSIDE</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">Unlevered Project IRR</td>
                <td className="text-right py-2 px-3 text-emerald-400">{baseMetrics.unleveredIrr.toFixed(2)}%</td>
                <td className="text-right py-2 px-3 text-slate-200">{currentMetrics.unleveredIrr.toFixed(2)}%</td>
                <td className="text-right py-2 px-3 text-rose-400">{downsideMetrics.unleveredIrr.toFixed(2)}%</td>
                <td className="text-right py-2 px-3 text-emerald-400">{upsideMetrics.unleveredIrr.toFixed(2)}%</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">Unlevered Payback (months)</td>
                <td className="text-right py-2 px-3">{baseMetrics.unleveredPaybackMonths}</td>
                <td className="text-right py-2 px-3">{currentMetrics.unleveredPaybackMonths}</td>
                <td className="text-right py-2 px-3">{downsideMetrics.unleveredPaybackMonths}</td>
                <td className="text-right py-2 px-3">{upsideMetrics.unleveredPaybackMonths}</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">Levered Equity IRR</td>
                <td className="text-right py-2 px-3 text-emerald-400">{baseMetrics.leveredEquityIrr.toFixed(2)}%</td>
                <td className="text-right py-2 px-3 text-slate-200">{currentMetrics.leveredEquityIrr.toFixed(2)}%</td>
                <td className="text-right py-2 px-3 text-rose-400">{downsideMetrics.leveredEquityIrr.toFixed(2)}%</td>
                <td className="text-right py-2 px-3 text-emerald-400">{upsideMetrics.leveredEquityIrr.toFixed(2)}%</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">Levered Payback (months)</td>
                <td className="text-right py-2 px-3">{baseMetrics.leveredPaybackMonths}</td>
                <td className="text-right py-2 px-3">{currentMetrics.leveredPaybackMonths}</td>
                <td className="text-right py-2 px-3">{downsideMetrics.leveredPaybackMonths}</td>
                <td className="text-right py-2 px-3">{upsideMetrics.leveredPaybackMonths}</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">Peak Equity Required</td>
                <td className="text-right py-2 px-3">{formatCurrency(baseMetrics.peakEquityRequired)}</td>
                <td className="text-right py-2 px-3">{formatCurrency(currentMetrics.peakEquityRequired)}</td>
                <td className="text-right py-2 px-3">{formatCurrency(downsideMetrics.peakEquityRequired)}</td>
                <td className="text-right py-2 px-3">{formatCurrency(upsideMetrics.peakEquityRequired)}</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">Min DSCR</td>
                <td className="text-right py-2 px-3">{baseMetrics.minDscr.toFixed(2)}x</td>
                <td className="text-right py-2 px-3">{currentMetrics.minDscr.toFixed(2)}x</td>
                <td className="text-right py-2 px-3">{downsideMetrics.minDscr.toFixed(2)}x</td>
                <td className="text-right py-2 px-3">{upsideMetrics.minDscr.toFixed(2)}x</td>
              </tr>
            </tbody>
          </table>
          {downsideWarning && (
            <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              {downsideWarning}
            </div>
          )}
          {upsideSuccess && (
            <div className="mt-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
              {upsideSuccess}
            </div>
          )}
        </div>

        {/* Tornado chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">
            IRR Sensitivity by Driver (Tornado Chart)
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Impact on Levered Equity IRR when each driver moves from low to high (one at a time).
          </p>
          {(() => {
            const irrMin = 10;
            const irrMax = 26;
            const scale = (irr: number) => ((irr - irrMin) / (irrMax - irrMin)) * 100;
            return (
              <div className="space-y-4 max-w-2xl">
                {tornadoData.map((row) => {
                  const minIrr = Math.min(row.lowIrr, row.highIrr);
                  const maxIrr = Math.max(row.lowIrr, row.highIrr);
                  const left = scale(minIrr);
                  const width = scale(maxIrr) - scale(minIrr);
                  const isPositive = row.highIrr > row.lowIrr;
                  return (
                    <div key={row.driver} className="flex items-center gap-4">
                      <p className="text-xs text-slate-400 w-48 shrink-0">{row.driver}</p>
                      <div className="flex-1 h-7 bg-slate-800 rounded overflow-hidden relative">
                        <div
                          className={`absolute top-0 h-full rounded ${isPositive ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{
                            left: `${Math.max(0, left)}%`,
                            width: `${Math.max(2, width)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 w-24 text-right shrink-0">
                        {minIrr.toFixed(2)}% – {maxIrr.toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
                <p className="text-[10px] text-slate-500">
                  Axis: Levered Equity IRR from {irrMin}% to {irrMax}%.
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      <PreviewFloatingBar
        previousRoute={withStreamPrefix(streamPrefix, "/equity-returns")}
        nextRoute={withStreamPrefix(streamPrefix, "/preview/scenario-analysis")}
        showDownload={false}
        nextLabel="Generate Model →"
      />
    </div>
  );
}
