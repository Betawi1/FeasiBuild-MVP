'use client';

import React from 'react';

interface MetricWithTooltipProps {
  label: string;
  /** NEW: Current scenario value (used for Key Metrics side-by-side). */
  scenarioValue?: string;
  /** NEW: Base case value (used for Key Metrics side-by-side). */
  baseValue?: string;
  /** NEW: True when all shocks = 0 (show base only). */
  isBaseCase?: boolean;
  /** NEW: Determines scenario value color. */
  isPositive?: boolean;
  /** Legacy single-value mode (still used in a few places). */
  value?: string;
  sourceComponent: string;
  sourceDescription: string;
  delta?: string;
  deltaColor?: 'positive' | 'negative' | 'neutral';
}

export const MetricWithTooltip: React.FC<MetricWithTooltipProps> = ({
  label,
  scenarioValue,
  baseValue,
  isBaseCase = false,
  isPositive,
  value,
  sourceComponent,
  sourceDescription,
  delta,
  deltaColor = 'neutral',
}) => {
  const isDualValue =
    scenarioValue != null && baseValue != null;
  const scenarioColor =
    isPositive === true
      ? 'text-emerald-400'
      : isPositive === false
        ? 'text-red-400'
        : 'text-white';
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 relative group">
      {/* Label with Tooltip */}
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs text-slate-400">{label}</p>

        {/* Info Icon */}
        <div className="relative">
          <svg
            className="w-3.5 h-3.5 text-slate-500 cursor-help"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 border border-slate-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
            <p className="font-medium text-slate-300 mb-1">{sourceComponent}</p>
            <p className="text-slate-400">{sourceDescription}</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
          </div>
        </div>
      </div>

      {/* Value */}
      {isDualValue ? (
        <p className="text-lg font-bold">
          {isBaseCase ? (
            <span className="text-white">{baseValue}</span>
          ) : (
            <>
              <span className={scenarioColor}>{scenarioValue}</span>
              <span className="text-slate-500"> vs {baseValue}</span>
            </>
          )}
        </p>
      ) : (
        <p
          className={`text-lg font-bold ${
            deltaColor === 'positive'
              ? 'text-emerald-400'
              : deltaColor === 'negative'
                ? 'text-red-400'
                : 'text-white'
          }`}
        >
          {value}
        </p>
      )}

      {/* Delta (if provided) */}
      {delta && (
        <p
          className={`text-xs mt-1 ${
            deltaColor === 'positive'
              ? 'text-emerald-500'
              : deltaColor === 'negative'
                ? 'text-red-500'
                : 'text-slate-500'
          }`}
        >
          {delta}
        </p>
      )}
    </div>
  );
};

