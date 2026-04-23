"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DscrYearlyPoint = {
  label: string;
  yearIndex: number;
  dscr: number;
};

const DEFAULT_COVENANT = 1.25;

type Props = {
  data: DscrYearlyPoint[];
  /** Covenant DSCR line (×); defaults to 1.25 when omitted. */
  covenantThreshold?: number;
};

export function DscrYearlyColumnChartImpl({
  data,
  covenantThreshold = DEFAULT_COVENANT,
}: Props) {
  if (!data.length) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 px-4 text-center text-sm text-slate-500">
        No DSCR data — adjust prior steps or debt service assumptions.
      </div>
    );
  }

  const maxDscr = Math.max(
    covenantThreshold * 1.05,
    ...data.map((d) => (Number.isFinite(d.dscr) ? d.dscr : 0))
  );
  const yMax = Math.min(8, Math.max(2, maxDscr * 1.15));

  return (
    <div className="h-72 w-full rounded-lg border border-slate-700/80 bg-slate-900/40 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <YAxis
            domain={[0, yMax]}
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickFormatter={(v) => `${Number(v).toFixed(1)}x`}
            width={44}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const raw = payload[0].value;
              const v =
                typeof raw === "number" ? raw : Number(raw ?? 0);
              const pass = v >= covenantThreshold;
              return (
                <div className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs shadow-lg">
                  <p className="mb-1 text-slate-400">{String(label)}</p>
                  <p
                    className="font-semibold"
                    style={{ color: pass ? "#34d399" : "#f87171" }}
                  >
                    {v.toFixed(2)}×{" "}
                    <span className="font-normal text-slate-400">
                      DSCR
                    </span>
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {pass
                      ? `≥ ${covenantThreshold.toFixed(2)}× covenant`
                      : `Below ${covenantThreshold.toFixed(2)}× covenant`}
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={covenantThreshold}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: `${covenantThreshold.toFixed(2)}× covenant`,
              position: "insideTopRight",
              fill: "#f59e0b",
              fontSize: 11,
            }}
          />
          <Bar dataKey="dscr" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((entry, index) => (
              <Cell
                key={`dscr-${entry.label}-${index}`}
                fill={
                  entry.dscr >= covenantThreshold
                    ? "#34d399"
                    : entry.dscr > 0
                      ? "#ef4444"
                      : "#475569"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
