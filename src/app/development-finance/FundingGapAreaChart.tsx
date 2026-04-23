"use client";

import dynamic from "next/dynamic";

import type { FundingGapChartPoint } from "./FundingGapAreaChartImpl";

/**
 * Recharts must not run on the server with the App Router — load the whole chart
 * client-side in one dynamic boundary (`ssr: false`).
 *
 * (Per-component `dynamic()` on each primitive often fails to compose correctly.)
 */
const FundingGapAreaChartImpl = dynamic(
  () =>
    import("./FundingGapAreaChartImpl").then((mod) => mod.FundingGapAreaChartImpl),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-80 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 text-sm text-slate-500">
        Loading chart…
      </div>
    ),
  }
);

export type { FundingGapChartPoint };

type FundingGapAreaChartProps = {
  data: FundingGapChartPoint[];
  peakFundingMonth: number;
  formatCurrency: (value: number) => string;
};

export function FundingGapAreaChart(props: FundingGapAreaChartProps) {
  return <FundingGapAreaChartImpl {...props} />;
}
