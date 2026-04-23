'use client';

import React from 'react';

interface ShockSliderProps {
  driverName: string;
  driverId: string;
  currentValue: number;
  minValue: number;
  maxValue: number;
  step: number;
  unit: "%" | "months" | "currency" | "bps" | "pp" | "%rev";
  baseIrr: number; // Unlevered IRR
  baseLeveredIrr: number; // Levered IRR
  onValueChange: (driverId: string, value: number) => void;
  onReset: (driverId: string) => void;
  /** Optional pp IRR per 1 unit of shock (for custom drivers). */
  irrImpactFactor?: number;
  /** When false, title is omitted (e.g. parent renders the name + remove). Default: true */
  showDriverTitle?: boolean;
  /** When true, no outer card chrome (parent provides border/padding). */
  embedded?: boolean;
}

export const ShockSlider: React.FC<ShockSliderProps> = ({
  driverName,
  driverId,
  currentValue,
  minValue,
  maxValue,
  step,
  unit,
  baseIrr = 0, // DEFAULT VALUE
  baseLeveredIrr = 0, // DEFAULT VALUE (FIXES TypeError)
  onValueChange,
  onReset,
  irrImpactFactor,
  showDriverTitle = true,
  embedded = false,
}) => {
  // Calculate color based on value
  const getSliderColor = () => {
    if (currentValue > 0) return 'accent-emerald-500';
    if (currentValue < 0) return 'accent-red-500';
    return 'accent-slate-400';
  };

  // Calculate estimated IRR impact (simplified - will be replaced with real calc)
  const calculateIrrImpact = () => {
    // Rough estimate: 1% shock ≈ 0.3-0.5pp IRR change (varies by driver)
    const impactFactor =
      irrImpactFactor ??
      (driverId === "adr"
        ? 0.25
        : driverId === "occupancy"
          ? 0.2
          : driverId === "constructionCost"
            ? -0.18
            : driverId === "constructionDuration"
              ? -0.12
              : driverId === "interestRate"
                ? -0.01 // per bps
                : driverId === "operatingExpenses"
                  ? -0.1
                  : driverId === "exitCapRate"
                    ? -0.015 // per bps
                    : driverId === "ffeReserve"
                      ? -0.35 // per % of revenue
                      : 0.35);
    return (currentValue * impactFactor).toFixed(2);
  };

  const irrImpact = calculateIrrImpact();
  const projectedIrr = baseIrr + parseFloat(irrImpact);
  const leveredIrrImpact = (parseFloat(irrImpact) * 1.05).toFixed(2);
  const projectedLeveredIrr = baseLeveredIrr + parseFloat(leveredIrrImpact);
  const baseIrrLabel = baseIrr ? baseIrr.toFixed(2) : "0.00";
  const baseLeveredIrrLabel = baseLeveredIrr ? baseLeveredIrr.toFixed(2) : "0.00";

  const midScale = minValue + (maxValue - minValue) / 2;
  const formatScaleTick = (n: number) =>
    Number.isInteger(step) && Math.abs(n - Math.round(n)) < 1e-9
      ? String(Math.round(n))
      : n.toFixed(2);

  const unitLabel = (u: ShockSliderProps["unit"]) => {
    if (u === "currency") return " AED";
    if (u === "%rev") return "% rev";
    return u;
  };

  return (
    <div
      className={
        embedded
          ? "space-y-4"
          : "space-y-4 rounded-xl border border-slate-700 bg-slate-900/50 p-5"
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        {showDriverTitle ? (
          <h3 className="text-sm font-semibold text-slate-200">{driverName}</h3>
        ) : (
          <span className="min-w-0 flex-1" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => onReset(driverId)}
          className="flex shrink-0 items-center gap-1 text-xs text-slate-400 transition-colors hover:text-emerald-400"
          title="Reset to base (0%)"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>
      </div>

      {/* Slider */}
      <div className="space-y-3">
        <input
          type="range"
          min={minValue}
          max={maxValue}
          step={step}
          value={currentValue}
          onChange={(e) =>
            onValueChange(driverId, Number.parseFloat(e.target.value) || 0)
          }
          className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer ${getSliderColor()}`}
        />
        
        {/* Scale markers */}
        <div className="flex justify-between text-xs text-slate-500">
          <span>
            {formatScaleTick(minValue)}
            {unitLabel(unit)}
          </span>
          <span>
            {formatScaleTick(midScale)}
            {unitLabel(unit)}
          </span>
          <span>
            {formatScaleTick(maxValue)}
            {unitLabel(unit)}
          </span>
        </div>
      </div>

      {/* Current value display */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700">
        <div>
          <p className="text-xs text-slate-400">Current shock</p>
          <p className={`text-lg font-bold ${
            currentValue > 0 ? 'text-emerald-400' : 
            currentValue < 0 ? 'text-red-400' : 'text-slate-400'
          }`}>
            {unit === "currency" ? (
              <>
                {currentValue >= 0 ? "+" : ""}
                {currentValue.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}{" "}
                AED
              </>
            ) : (
              <>
                {currentValue > 0 ? "+" : ""}
                {currentValue}
                {unitLabel(unit)}
              </>
            )}
          </p>
        </div>
        
        {/* Live impact preview */}
        <div className="text-right">
          <p className="text-xs text-slate-400">Impact on Unlevered IRR</p>
          <p className="text-sm text-slate-300">
          {baseIrrLabel}% → 
            <span className={`font-semibold ${
              projectedIrr > baseIrr ? 'text-emerald-400' : 
              projectedIrr < baseIrr ? 'text-red-400' : 'text-slate-300'
            }`}>
              {' '}{projectedIrr.toFixed(2)}%
            </span>
            <span className={`text-xs ml-1 ${
              parseFloat(irrImpact) > 0 ? 'text-emerald-400' : 
              parseFloat(irrImpact) < 0 ? 'text-red-400' : 'text-slate-500'
            }`}>
              ({parseFloat(irrImpact) > 0 ? '+' : ''}{irrImpact}pp)
            </span>
          </p>
        <p className="mt-1 text-sm text-slate-300">
          <span className="text-xs text-slate-400">Impact on Levered IRR</span>
          <span className="ml-2">
            {baseLeveredIrrLabel}% →{" "}
            <span
              className={`font-semibold ${
                projectedLeveredIrr > baseLeveredIrr
                  ? "text-emerald-400"
                  : projectedLeveredIrr < baseLeveredIrr
                    ? "text-red-400"
                    : "text-slate-300"
              }`}
            >
              {projectedLeveredIrr.toFixed(2)}%
            </span>
            <span
              className={`ml-1 text-xs ${
                parseFloat(leveredIrrImpact) > 0
                  ? "text-emerald-400"
                  : parseFloat(leveredIrrImpact) < 0
                    ? "text-red-400"
                    : "text-slate-500"
              }`}
            >
              ({parseFloat(leveredIrrImpact) > 0 ? "+" : ""}
              {leveredIrrImpact}pp)
            </span>
          </span>
        </p>
        </div>
      </div>
    </div>
  );
};

