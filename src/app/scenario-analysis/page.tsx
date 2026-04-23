"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useFinModelStore from "@/store/useFinModelStore";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import {
  CustomDriverModal,
  type CustomDriverData,
} from "@/components/scenario/CustomDriverModal";
import { ShockSlider } from "@/components/scenario/ShockSlider";
import { MetricWithTooltip } from "@/components/scenario/MetricWithTooltip";
import useScenarioStore from "@/store/useScenarioStore";
import type { CustomShockDriver } from "@/types/scenario";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";

type ScenarioPreset = "base" | "downside" | "upside";

type ShockKey =
  | "adr"
  | "occupancy"
  | "constructionCost"
  | "constructionDuration"
  | "interestRate"
  | "operatingExpenses"
  | "exitCapRate"
  | "ffeReserve";

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

type ShocksInput = Partial<Record<ShockKey, number>>;

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

export default function ScenarioAnalysisPage() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const cashInflows = useFinModelStore((s) => s.cashInflows);
  const projectIRR = useFinModelStore((s) => s.projectIRR);
  const financing = useFinModelStore((s) => s.financing);
  const equityReturns = useFinModelStore((s) => s.equityReturns);

  const customDrivers = useScenarioStore((s) => s.customDrivers);
  const addCustomDriver = useScenarioStore((s) => s.addCustomDriver);
  const updateCustomDriver = useScenarioStore((s) => s.updateCustomDriver);
  const removeCustomDriver = useScenarioStore((s) => s.removeCustomDriver);
  const setDefaultDriverShock = useScenarioStore((s) => s.setDefaultDriverShock);

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

  useEffect(() => {
    const store = useFinModelStore.getState();
    console.log("📖 [Component 6] Reading from store:", {
      baseCase: store.scenarioAnalysis.baseCase,
      selectedDrivers: store.scenarioAnalysis.selectedDrivers,
    });
  }, []);

  const [preset, setPreset] = useState<ScenarioPreset>("base");
  const [driverShocks, setDriverShocks] = useState<Record<ShockKey, number>>(() => {
    const ds = useScenarioStore.getState().defaultDrivers;
    const g = (id: string) => ds.find((d) => d.id === id)?.shockValue ?? 0;
    return {
      adr: g("adr"),
      occupancy: g("occupancy"),
      constructionCost: g("constructionCost"),
      constructionDuration: g("constructionDuration"),
      interestRate: g("interestRate"),
      operatingExpenses: g("operatingExpenses"),
      exitCapRate: g("exitCapRate"),
      ffeReserve: g("ffeReserve"),
    };
  });

  // Hydrate from persisted scenario store when revisiting the page.
  useEffect(() => {
    const ds = useScenarioStore.getState().defaultDrivers;
    const g = (id: string) => ds.find((d) => d.id === id)?.shockValue ?? 0;
    setDriverShocks({
      adr: g("adr"),
      occupancy: g("occupancy"),
      constructionCost: g("constructionCost"),
      constructionDuration: g("constructionDuration"),
      interestRate: g("interestRate"),
      operatingExpenses: g("operatingExpenses"),
      exitCapRate: g("exitCapRate"),
      ffeReserve: g("ffeReserve"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep scenario preview in sync with slider values (persisted via useScenarioStore)
  useEffect(() => {
    setDefaultDriverShock("adr", driverShocks.adr);
    setDefaultDriverShock("occupancy", driverShocks.occupancy);
    setDefaultDriverShock("constructionCost", driverShocks.constructionCost);
    setDefaultDriverShock("constructionDuration", driverShocks.constructionDuration);
    setDefaultDriverShock("interestRate", driverShocks.interestRate);
    setDefaultDriverShock("operatingExpenses", driverShocks.operatingExpenses);
    setDefaultDriverShock("exitCapRate", driverShocks.exitCapRate);
    setDefaultDriverShock("ffeReserve", driverShocks.ffeReserve);
  }, [driverShocks, setDefaultDriverShock]);

  const baseMetrics: ScenarioMetrics = useMemo(
    () => ({
      unleveredIrr:
        toPct(projectIRR.unleveredIRR) ??
        toPct(projectIRR.projectMetrics?.unleveredIRR) ??
        BASE_METRICS.unleveredIrr,
      unleveredPaybackMonths: projectIRR.unleveredPayback ?? BASE_METRICS.unleveredPaybackMonths,
      leveredEquityIrr: equityReturns.leveredIRR ?? BASE_METRICS.leveredEquityIrr,
      leveredPaybackMonths: equityReturns.paybackPeriod ?? BASE_METRICS.leveredPaybackMonths,
      peakEquityRequired: projectIRR.peakFunding ?? BASE_METRICS.peakEquityRequired,
      minDscr:
        financing.dscrProfile?.length > 0
          ? (() => {
              const vals = financing.dscrProfile!.map((d) => d.dscr).filter((d) => d > 0);
              return vals.length > 0 ? Math.min(...vals) : 1.25;
            })()
          : 1.25,
    }),
    [projectIRR, equityReturns, financing]
  );

  const applyPreset = (p: ScenarioPreset) => {
    setPreset(p);
    if (p === "base") {
      setDriverShocks({
        adr: 0,
        occupancy: 0,
        constructionCost: 0,
        constructionDuration: 0,
        interestRate: 0,
        operatingExpenses: 0,
        exitCapRate: 0,
        ffeReserve: 0,
      });
    } else if (p === "downside") {
      // Hotel downside (one-touch preset)
      setDriverShocks({
        adr: -12,
        occupancy: -8,
        constructionCost: 15,
        constructionDuration: 6,
        interestRate: 200,
        operatingExpenses: 15,
        exitCapRate: 100,
        ffeReserve: 2,
      });
    } else {
      // Hotel upside (one-touch preset)
      setDriverShocks({
        adr: 10,
        occupancy: 8,
        constructionCost: -10,
        constructionDuration: -6,
        interestRate: -100,
        operatingExpenses: -5,
        exitCapRate: -50,
        ffeReserve: 0,
      });
    }
  };

  const downsideMetrics = useMemo(
    () =>
      applyShocks(baseMetrics, {
        adr: -12,
        occupancy: -8,
        constructionCost: 15,
        constructionDuration: 6,
        interestRate: 200,
        operatingExpenses: 15,
        exitCapRate: 100,
        ffeReserve: 2,
      }),
    [baseMetrics]
  );
  const upsideMetrics = useMemo(
    () =>
      applyShocks(baseMetrics, {
        adr: 10,
        occupancy: 8,
        constructionCost: -10,
        constructionDuration: -6,
        interestRate: -100,
        operatingExpenses: -5,
        exitCapRate: -50,
        ffeReserve: 0,
      }),
    [baseMetrics]
  );

  const currentMetrics = useMemo(() => {
    const hasShocks = Object.values(driverShocks).some((v) => v !== 0);
    return hasShocks ? applyShocks(baseMetrics, driverShocks) : { ...baseMetrics };
  }, [baseMetrics, driverShocks]);

  useEffect(() => {
    console.log("🔄 [Component 6] Recalculating scenarios with drivers:", {
      defaultDriverShocks: driverShocks,
      customDriverShocks: customDrivers.map((d) => ({
        id: d.id,
        name: d.name,
        shockValue: d.shockValue,
      })),
    });
  }, [driverShocks, customDrivers]);

  useEffect(() => {
    console.log("🧮 [Component 6] Scenario results:", {
      base: baseMetrics,
      current: currentMetrics,
      downside: downsideMetrics,
      upside: upsideMetrics,
      customDriverShocks: customDrivers.map((d) => ({
        id: d.id,
        name: d.name,
        shockValue: d.shockValue,
      })),
    });
  }, [baseMetrics, currentMetrics, downsideMetrics, upsideMetrics, customDrivers]);

  useEffect(() => {
    console.log("🔍 [Component 6] Base vs Current comparison:", {
      baseIRR: baseMetrics.unleveredIrr,
      currentIRR: currentMetrics.unleveredIrr,
      defaultShocks: driverShocks,
      customShocks: customDrivers.map((d) => ({
        id: d.id,
        name: d.name,
        shockValue: d.shockValue,
      })),
      shouldMatchDefaults: Object.values(driverShocks).every((v) => v === 0),
      shouldMatchCustoms: customDrivers.every((d) => d.shockValue === 0),
    });
  }, [baseMetrics, currentMetrics, driverShocks, customDrivers]);

  useEffect(() => {
    console.log("🧪 [Component 6] Shock test:", {
      driver: "adr",
      shock: driverShocks.adr,
      multiplier: 1 + (driverShocks.adr ?? 0) / 100,
      baseIRR: baseMetrics.unleveredIrr,
      currentIRR: currentMetrics.unleveredIrr,
      direction:
        (driverShocks.adr ?? 0) > 0 ? "should increase" : "should decrease",
    });
  }, [baseMetrics.unleveredIrr, currentMetrics.unleveredIrr, driverShocks.adr]);

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
    console.log("Download Spreadsheet — Scenario Analysis (placeholder)");
    alert("Spreadsheet generation will create a formula-driven Google Sheet with scenario tables.");
  };

  const onValueChange = useCallback((driverId: string, value: number) => {
    setDriverShocks((prev) => ({ ...prev, [driverId as ShockKey]: value }));
  }, []);

  const onReset = useCallback((driverId: string) => {
    setDriverShocks((prev) => ({ ...prev, [driverId as ShockKey]: 0 }));
  }, []);

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
            Base Case = current assumptions. Downside/ Upside = one-touch hotel shocks across ADR, occupancy, development, financing, operations, and exit.
          </p>
        </div>

        {/* Key drivers with sliders */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {/* Global Reset All Button */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">
              Adjust Shock Values
            </h2>
            <button
              type="button"
              onClick={() => {
                setDriverShocks({
                  adr: 0,
                  occupancy: 0,
                  constructionCost: 0,
                  constructionDuration: 0,
                  interestRate: 0,
                  operatingExpenses: 0,
                  exitCapRate: 0,
                  ffeReserve: 0,
                });
                useScenarioStore.getState().customDrivers.forEach((d) => {
                  updateCustomDriver(d.id, { shockValue: 0 });
                });
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-800 hover:text-white transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reset All to Base
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: "adr", label: "ADR (Average Daily Rate)", min: -15, max: 15, step: 1, unit: "%" as const },
              { key: "occupancy", label: "Occupancy Rate", min: -10, max: 10, step: 1, unit: "pp" as const },
              { key: "constructionCost", label: "Construction Cost", min: -20, max: 20, step: 1, unit: "%" as const },
              { key: "constructionDuration", label: "Construction Duration", min: -12, max: 12, step: 1, unit: "months" as const },
              { key: "interestRate", label: "Interest Rate", min: -100, max: 300, step: 25, unit: "bps" as const },
              { key: "operatingExpenses", label: "Operating Expenses", min: -5, max: 25, step: 1, unit: "%" as const },
              { key: "exitCapRate", label: "Exit Cap Rate", min: -50, max: 150, step: 25, unit: "bps" as const },
              { key: "ffeReserve", label: "FF&E Reserve", min: 0, max: 3, step: 0.25, unit: "%rev" as const },
            ].map(({ key, label, min, max, step, unit }) => {
              const value = driverShocks[key as ShockKey] ?? 0;
              return (
                <ShockSlider
                  key={key}
                  driverName={label}
                  driverId={key}
                  currentValue={value}
                  minValue={min}
                  maxValue={max}
                  step={step}
                  unit={unit}
                  baseIrr={baseMetrics.unleveredIrr}
                  baseLeveredIrr={baseMetrics.leveredEquityIrr}
                  onValueChange={onValueChange}
                  onReset={onReset}
                />
              );
            })}
          </div>

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
        </div>

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
        previousRoute={withStreamPrefix(streamPrefix, "/preview/equity-returns")}
        nextRoute={withStreamPrefix(streamPrefix, "/preview/scenario-analysis")}
        showDownload={false}
        nextLabel="Generate Model →"
      />
    </div>
  );
}
