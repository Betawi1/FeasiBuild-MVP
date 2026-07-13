"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { FC } from "react";

export interface AiGuardrailBoxProps {
  title?: string;
  message: string;
  severity?: "warning" | "error";
  onAcknowledge?: () => void;
  showAcknowledgeButton?: boolean;
  className?: string;
}

export const AiGuardrailBox: FC<AiGuardrailBoxProps> = ({
  title,
  message,
  severity = "warning",
  onAcknowledge,
  showAcknowledgeButton = false,
  className = "",
}) => {
  const isWarning = severity === "warning";

  const bgColor = isWarning ? "bg-amber-500/10" : "bg-red-500/10";
  const borderColor = isWarning ? "border-amber-500/30" : "border-red-500/30";
  const iconColor = isWarning ? "text-amber-400" : "text-red-400";
  const titleColor = isWarning ? "text-amber-400" : "text-red-400";
  const Icon = isWarning ? AlertTriangle : ShieldAlert;

  return (
    <div
      className={`
      p-4 rounded-lg border ${borderColor} ${bgColor}
      ${className}
    `}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          {title && (
            <h4 className={`text-sm font-semibold ${titleColor} mb-1`}>
              {title}
            </h4>
          )}
          <p className="text-sm text-slate-300 mb-3">{message}</p>
          {showAcknowledgeButton && onAcknowledge && (
            <button
              type="button"
              onClick={onAcknowledge}
              className={`
                px-3 py-1.5 text-xs font-medium rounded
                ${
                  isWarning
                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                    : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                }
                transition-colors
              `}
            >
              I Understand - Proceed Anyway
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
