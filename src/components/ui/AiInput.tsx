"use client";

import { useCallback, useEffect, useRef, useState, type FC } from "react";
import { useFocusedNumericString } from "@/hooks/useFocusedNumericString";
import type { FieldValueSource } from "@/lib/field-value-source";

export interface AiInputProps {
  label: string;
  value: number | string;
  onChange: (value: number | string) => void;
  placeholder?: string;
  helperText?: string;
  type?: "number" | "text" | "percentage";
  step?: number;
  min?: number;
  max?: number;
  /** True if AI researched, false if fixed default */
  isAiGenerated?: boolean;
  /** Persisted store/local flag — survives remount; cleared by Reset to benchmark */
  isManualOverride?: boolean;
  /**
   * Explicit source tag. When set, drives the badge:
   * ai = blue AI, override = orange (user typed), default = grey.
   */
  source?: FieldValueSource;
  /**
   * Explicit AI / jurisdiction baseline used for reset.
   * Prefer this over the live `value` so remounts after an override still reset correctly.
   */
  benchmarkValue?: number | string;
  /** Fired on the first keystroke so the parent can persist the override flag. */
  onManualOverride?: () => void;
  /** Fired when the user clicks Reset to benchmark inside this control. */
  onResetOverride?: () => void;
  disabled?: boolean;
  className?: string;
}

function toFiniteNumber(v: number | string | undefined): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export const AiInput: FC<AiInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  type = "number",
  min,
  max,
  isAiGenerated = true,
  isManualOverride = false,
  source,
  benchmarkValue,
  onManualOverride,
  onResetOverride,
  disabled = false,
  className = "",
}) => {
  const isNumeric = type === "number" || type === "percentage";
  const numericValue = toFiniteNumber(value);

  const hasBenchmark =
    benchmarkValue != null &&
    benchmarkValue !== "" &&
    !(typeof benchmarkValue === "number" && !Number.isFinite(benchmarkValue));

  const [originalValue, setOriginalValue] = useState<number | string>(
    hasBenchmark ? benchmarkValue : value
  );
  const [hasEdited, setHasEdited] = useState(
    isManualOverride || source === "override"
  );
  const prevManualRef = useRef(isManualOverride || source === "override");

  const commitNumber = useCallback(
    (n: number) => {
      onChange(n);
    },
    [onChange]
  );

  const draft = useFocusedNumericString(numericValue, commitNumber);

  const persistedOverride = isManualOverride || source === "override";

  // Parent persisted override (e.g. after remount). Clear only when parent resets.
  useEffect(() => {
    if (persistedOverride) setHasEdited(true);
    else if (prevManualRef.current && !persistedOverride) setHasEdited(false);
    prevManualRef.current = persistedOverride;
  }, [persistedOverride]);

  // Parent-driven updates (AI apply / reset) refresh the reset baseline.
  // Do not treat those updates as a user override.
  useEffect(() => {
    if (hasEdited || persistedOverride) return;
    setOriginalValue(hasBenchmark ? benchmarkValue! : value);
  }, [
    value,
    benchmarkValue,
    hasBenchmark,
    hasEdited,
    persistedOverride,
  ]);

  const baseline = hasBenchmark ? benchmarkValue! : originalValue;

  // Orange only when the user typed, or the parent persisted an override flag.
  // AI-applied values that differ from the jurisdiction default stay blue.
  const isOverride = hasEdited || persistedOverride;
  const showAi =
    !isOverride && (source === "ai" || (source !== "default" && isAiGenerated));

  const getBorderColorClass = () => {
    if (isOverride) {
      return "border-amber-500 focus:ring-amber-500";
    }
    if (showAi) {
      return "border-blue-500 focus:ring-blue-500";
    }
    return "border-slate-600 focus:ring-slate-500";
  };

  const getBadgeConfig = () => {
    if (isOverride) {
      return {
        text: "Override",
        bgColor: "bg-amber-500/20",
        textColor: "text-amber-400",
      };
    }
    if (showAi) {
      return {
        text: "AI",
        bgColor: "bg-blue-500/20",
        textColor: "text-blue-400",
      };
    }
    return {
      text: "Default",
      bgColor: "bg-slate-500/20",
      textColor: "text-slate-400",
    };
  };

  const badgeConfig = getBadgeConfig();
  const borderColorClass = getBorderColorClass();

  const markEdited = () => {
    setHasEdited(true);
    onManualOverride?.();
  };

  const handleReset = () => {
    setHasEdited(false);
    if (onResetOverride) {
      onResetOverride();
      return;
    }
    onChange(toFiniteNumber(baseline));
  };

  const displayValue = isNumeric ? draft.display : value;

  const resolvedHelperText = isOverride
    ? "Manually overridden — edit to change"
    : helperText;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${badgeConfig.bgColor} ${badgeConfig.textColor}`}
        >
          {badgeConfig.text}
        </span>
      </div>

      <div className="relative">
        <input
          type={isNumeric ? "text" : type}
          inputMode={isNumeric ? "decimal" : undefined}
          autoComplete="off"
          min={min}
          max={max}
          value={displayValue}
          onFocus={isNumeric ? draft.onFocus : undefined}
          onChange={(e) => {
            markEdited();
            if (isNumeric) {
              draft.onChangeText(e.target.value);
              return;
            }
            onChange(e.target.value);
          }}
          onBlur={isNumeric ? draft.onBlur : undefined}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={label}
          className={`
            w-full px-3 py-2 bg-slate-800/50 border-2 rounded-lg
            text-slate-100 placeholder-slate-500
            focus:outline-none focus:ring-2 transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${type === "percentage" ? "pr-8" : ""}
            ${borderColorClass}
          `}
        />
        {type === "percentage" && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            %
          </span>
        )}
      </div>

      {resolvedHelperText && (
        <p className="text-xs text-slate-500">{resolvedHelperText}</p>
      )}

      {isOverride && (hasBenchmark || originalValue !== "") && (
        <span
          role="button"
          tabIndex={0}
          onClick={handleReset}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleReset();
            }
          }}
          className="mt-1 block cursor-pointer text-xs text-emerald-400 hover:underline hover:text-emerald-300"
        >
          Reset to benchmark
        </span>
      )}
    </div>
  );
};
