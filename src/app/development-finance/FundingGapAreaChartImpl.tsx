"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type FundingGapChartPoint = {
  month: number;
  monthLabel: string;
  gap: number;
};

type Props = {
  data: FundingGapChartPoint[];
  peakFundingMonth: number;
  formatCurrency: (value: number) => string;
};

export function FundingGapAreaChartImpl({
  data,
  peakFundingMonth,
  formatCurrency,
}: Props) {
  const peakLabel = `M${peakFundingMonth}`;

  if (!data.length) {
    return (
      <div className="mt-0 flex h-80 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 px-4 text-center text-sm text-slate-500">
        No cash flow data yet. Complete Components 1–3 to see the funding gap.
      </div>
    );
  }

  return (
    <div className="mt-0">
      <div className="h-80 w-full rounded-lg border border-slate-700 bg-slate-900/40 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, "auto"]}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              tickFormatter={(v) =>
                new Intl.NumberFormat("en-US", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(Number(v))
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#e2e8f0" }}
              formatter={(value) => [
                formatCurrency(
                  typeof value === "number"
                    ? value
                    : Number(value ?? 0)
                ),
                "Gap",
              ]}
              labelFormatter={(label) => String(label)}
            />
            <ReferenceLine
              x={peakLabel}
              stroke="#94a3b8"
              strokeDasharray="4 4"
            />
            <Area
              type="monotone"
              dataKey="gap"
              name="Funding gap"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.35}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
