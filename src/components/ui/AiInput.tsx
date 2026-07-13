"use client";

import { useEffect, useState, type ChangeEvent, type FC } from "react";

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
  disabled?: boolean;
  className?: string;
}

export const AiInput: FC<AiInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  type = "number",
  step = 0.01,
  min,
  max,
  isAiGenerated = true,
  isManualOverride = false,
  disabled = false,
  className = "",
}) => {
  const [originalValue, setOriginalValue] = useState<number | string>(value);
  const [hasEdited, setHasEdited] = useState(isManualOverride);

  // Sync from persisted override flag (e.g. after remount or Reset to benchmark)
  useEffect(() => {
    if (isManualOverride) {
      setHasEdited(true);
    } else {
      setHasEdited(false);
      setOriginalValue(value);
    }
    // Only react to the override flag toggling / external reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManualOverride]);

  // Keep baseline in sync when value is pushed from outside (AI populate / reset)
  useEffect(() => {
    if (!isManualOverride && !hasEdited) {
      setOriginalValue(value);
    }
  }, [value, isManualOverride, hasEdited]);

  const isOverride =
    isManualOverride || (hasEdited && value !== originalValue);

  const getBorderColorClass = () => {
    if (isOverride) {
      return "border-amber-500 focus:ring-amber-500";
    }
    if (isAiGenerated) {
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
    if (isAiGenerated) {
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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let newValue: number | string = e.target.value;

    if (type === "number" || type === "percentage") {
      const parsed = parseFloat(e.target.value);
      newValue = Number.isNaN(parsed) ? "" : parsed;
    }

    setHasEdited(true);
    onChange(newValue);
  };

  const displayValue = type === "percentage" ? `${value}` : value;

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
          type={type === "percentage" ? "number" : type}
          step={step}
          min={min}
          max={max}
          value={displayValue}
          onChange={handleChange}
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

      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};
