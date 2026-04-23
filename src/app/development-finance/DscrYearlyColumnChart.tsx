"use client";

import dynamic from "next/dynamic";

import type { DscrYearlyPoint } from "./DscrYearlyColumnChartImpl";

const DscrYearlyColumnChartImpl = dynamic(
  () =>
    import("./DscrYearlyColumnChartImpl").then(
      (mod) => mod.DscrYearlyColumnChartImpl
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 text-sm text-slate-500">
        Loading chart…
      </div>
    ),
  }
);

export type { DscrYearlyPoint };

type Props = {
  data: DscrYearlyPoint[];
  covenantThreshold?: number;
};

export function DscrYearlyColumnChart(props: Props) {
  return <DscrYearlyColumnChartImpl {...props} />;
}
