"use client";

import { Lightbulb } from "lucide-react";
import type { FC, ReactNode } from "react";

export interface AiHintBoxProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export const AiHintBox: FC<AiHintBoxProps> = ({
  title = "AI Recommendation",
  children,
  className = "",
}) => {
  return (
    <div
      className={`
      p-4 rounded-lg border border-blue-500/30 bg-blue-500/10
      ${className}
    `}
    >
      <div className="flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-400 mb-1">{title}</h4>
          <div className="text-sm text-slate-300">{children}</div>
        </div>
      </div>
    </div>
  );
};
