"use client";

import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

export type ReactiveChartHeight = "h-56" | "h-64" | "h-72";

interface ReactiveChartProps {
  /** Chart series. Empty/missing data reserves height and skips mount. */
  data: unknown[] | undefined | null;
  height?: ReactiveChartHeight;
  className?: string;
  /** Recharts chart element (BarChart / LineChart / PieChart). */
  children: ReactElement;
}

/**
 * Data-reactive Recharts host.
 * Charts that mount before AI series arrive stay blank; remounting on data
 * arrival (and a fixed-height box) makes first generation paint immediately.
 */
export default function ReactiveChart({
  data,
  height = "h-64",
  className = "",
  children,
}: ReactiveChartProps) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div className={`w-full shrink-0 ${height} ${className}`}>
      {hasData ? (
        <ResponsiveContainer
          key={JSON.stringify(data)}
          width="100%"
          height="100%"
        >
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
