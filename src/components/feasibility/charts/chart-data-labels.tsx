"use client";

import { LabelList } from "recharts";
import type { ReactNode } from "react";

export const CHART_MARGIN_WITH_LABELS = {
  top: 28,
  right: 12,
  left: 4,
  bottom: 4,
} as const;

export interface FormatChartNumberOptions {
  decimals?: number;
  compact?: boolean;
  suffix?: string;
  prefix?: string;
}

/** Format chart values for on-chart data labels (K/M compact or fixed decimals). */
export function formatChartNumber(
  value: unknown,
  options: FormatChartNumberOptions = {}
): string {
  const {
    decimals = 1,
    compact = true,
    suffix = "",
    prefix = "",
  } = options;

  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";

  let body: string;
  if (compact && Math.abs(n) >= 1_000_000) {
    body = `${(n / 1_000_000).toFixed(1)}M`;
  } else if (compact && Math.abs(n) >= 1_000) {
    body = `${(n / 1_000).toFixed(0)}K`;
  } else if (decimals <= 0) {
    body = String(Math.round(n));
  } else {
    const fixed = n.toFixed(decimals);
    body = fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }

  return `${prefix}${body}${suffix}`;
}

type LabelListFormatter = (value: number) => string;

interface VerticalLabelProps {
  fontSize?: number;
  fill?: string;
  formatter?: LabelListFormatter;
}

/**
 * Value labels above non-stacked vertical bars.
 * LabelList without dataKey uses the parent Bar series value.
 */
export function BarValueLabelList({
  fontSize = 10,
  fill = "#1e293b",
  formatter,
}: VerticalLabelProps = {}): ReactNode {
  return (
    <LabelList
      position="top"
      offset={4}
      fill={fill}
      fontSize={fontSize}
      fontWeight={600}
      formatter={(value: unknown) => {
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(n)) return "";
        return formatter ? formatter(n) : formatChartNumber(n);
      }}
    />
  );
}

/** Value labels on line chart points. */
export function LineValueLabelList({
  fontSize = 9,
  fill = "#1e293b",
  formatter,
}: VerticalLabelProps = {}): ReactNode {
  return (
    <LabelList
      position="top"
      offset={6}
      fill={fill}
      fontSize={fontSize}
      fontWeight={600}
      formatter={(value: unknown) => {
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(n)) return "";
        return formatter ? formatter(n) : formatChartNumber(n, { decimals: 1 });
      }}
    />
  );
}

interface HorizontalLabelProps {
  fontSize?: number;
  fill?: string;
  formatter?: LabelListFormatter;
}

/** Value labels on horizontal bars (outside end of bar). */
export function HorizontalBarValueLabelList({
  fontSize = 9,
  fill = "#1e293b",
  formatter,
}: HorizontalLabelProps = {}): ReactNode {
  return (
    <LabelList
      position="right"
      offset={4}
      fill={fill}
      fontSize={fontSize}
      fontWeight={600}
      formatter={(value: unknown) => {
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(n)) return "";
        return formatter ? formatter(n) : formatChartNumber(n);
      }}
    />
  );
}
