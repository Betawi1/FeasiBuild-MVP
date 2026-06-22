"use client";

import { useCallback, useMemo } from "react";
import useFinModelStore from "@/store/useFinModelStore";
import { ShockSlider } from "@/components/scenario/ShockSlider";
import {
  COMMON_FACTOR_IDS,
  formatShockValue,
  getAllFactorsForAsset,
  initialShocksForAsset,
  normalizeAssetType,
  presetShocksForAsset,
  shockFactorSliderUnit,
  type ShockFactor,
} from "../config/shockFactors";

export type AdjustShockValuesProps = {
  assetType: string;
  shocks: Record<string, number>;
  onShockChange: (id: string, value: number) => void;
  onResetAll: () => void;
  baseUnleveredIrr: number;
  baseLeveredIrr: number;
  /** Optional slot for custom drivers (rendered below asset-specific factors). */
  children?: React.ReactNode;
};

function irrImpactFactorForFactor(factor: ShockFactor): number {
  switch (factor.id) {
    case "adr":
    case "base_rent_psf":
    case "monthly_rent_psf":
      return 0.25;
    case "occupancy":
    case "cam_recovery":
      return 0.2;
    case "percentage_rent":
    case "rent_escalation":
    case "absorption_speed":
      return 0.15;
    case "construction_cost":
    case "ti_allowance":
      return -0.18;
    case "construction_duration":
      return -0.12;
    case "interest_rate":
      return -0.01;
    case "operating_expenses":
    case "leasing_commissions":
      return -0.1;
    case "exit_cap_rate":
      return -0.015;
    case "ffe_reserve":
      return -0.08;
    default:
      return factor.impactLogic === "revenue"
        ? 0.2
        : factor.impactLogic === "cost"
          ? -0.15
          : 0.1;
  }
}

function ShockCard({
  factor,
  value,
  onChange,
  formatValue,
  baseUnleveredIrr,
  baseLeveredIrr,
}: {
  factor: ShockFactor;
  value: number;
  onChange: (id: string, val: number) => void;
  formatValue: (f: ShockFactor, v: number) => string;
  baseUnleveredIrr: number;
  baseLeveredIrr: number;
}) {
  const impactFactor = irrImpactFactorForFactor(factor);
  const estimatedIrrDelta = (value * impactFactor).toFixed(2);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:border-slate-600">
      <ShockSlider
        embedded
        showDriverTitle
        driverName={factor.label}
        driverId={factor.id}
        currentValue={value}
        minValue={factor.minShock}
        maxValue={factor.maxShock}
        step={factor.step}
        unit={shockFactorSliderUnit(factor)}
        baseIrr={baseUnleveredIrr}
        baseLeveredIrr={baseLeveredIrr}
        irrImpactFactor={impactFactor}
        onValueChange={onChange}
        onReset={(id) => onChange(id, factor.defaultValue)}
      />
      <div className="mt-3 border-t border-slate-700/50 pt-3 text-xs text-slate-400">
        <div className="flex justify-between">
          <span>Est. impact on Equity IRR:</span>
          <span
            className={
              Number(estimatedIrrDelta) > 0
                ? "text-emerald-400"
                : Number(estimatedIrrDelta) < 0
                  ? "text-rose-400"
                  : "text-slate-500"
            }
          >
            {Number(estimatedIrrDelta) === 0
              ? "—"
              : `${Number(estimatedIrrDelta) > 0 ? "+" : ""}${estimatedIrrDelta}pp`}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          Range: {formatValue(factor, factor.minShock)} →{" "}
          {formatValue(factor, factor.maxShock)}
        </p>
      </div>
    </div>
  );
}

export default function AdjustShockValues({
  assetType,
  shocks,
  onShockChange,
  onResetAll,
  baseUnleveredIrr,
  baseLeveredIrr,
  children,
}: AdjustShockValuesProps) {
  const normalizedAsset = normalizeAssetType(assetType);
  const updateScenarioShocks = useFinModelStore((s) => s.updateScenarioShocks);
  const setScenarioShocks = useFinModelStore((s) => s.setScenarioShocks);

  const factors = useMemo(
    () => getAllFactorsForAsset(normalizedAsset),
    [normalizedAsset]
  );

  const handleShockChange = useCallback(
    (factorId: string, value: number) => {
      updateScenarioShocks({ ...shocks, [factorId]: value }, "operational");
      onShockChange(factorId, value);
    },
    [shocks, updateScenarioShocks, onShockChange]
  );

  const handleResetAll = useCallback(() => {
    setScenarioShocks(presetShocksForAsset(normalizedAsset, "base"), "operational");
    onResetAll();
  }, [normalizedAsset, setScenarioShocks, onResetAll]);

  const commonFactors = factors.filter((f) => COMMON_FACTOR_IDS.has(f.id));
  const assetFactors = factors.filter((f) => !COMMON_FACTOR_IDS.has(f.id));

  const assetLabel =
    normalizedAsset.charAt(0).toUpperCase() + normalizedAsset.slice(1);

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Adjust Shock Values</h2>
          <p className="mt-1 text-sm text-slate-400">
            Base Case = current assumptions. Adjust sliders to simulate
            upside/downside scenarios for {assetLabel}.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetAll}
          className="shrink-0 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-600"
        >
          Reset All to Base
        </button>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Common Factors
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {commonFactors.map((factor) => (
            <ShockCard
              key={factor.id}
              factor={factor}
              value={shocks[factor.id] ?? factor.defaultValue}
              onChange={handleShockChange}
              formatValue={formatShockValue}
              baseUnleveredIrr={baseUnleveredIrr}
              baseLeveredIrr={baseLeveredIrr}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {assetLabel}-Specific Factors
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {assetFactors.map((factor) => (
            <ShockCard
              key={factor.id}
              factor={factor}
              value={shocks[factor.id] ?? factor.defaultValue}
              onChange={handleShockChange}
              formatValue={formatShockValue}
              baseUnleveredIrr={baseUnleveredIrr}
              baseLeveredIrr={baseLeveredIrr}
            />
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}

