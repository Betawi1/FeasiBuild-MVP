"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type {
  ScenarioComparisonData,
  ScenarioComparisonMetricRow,
} from "@/types/feasibility";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: ScenarioComparisonData;
}

function formatCell(row: ScenarioComparisonMetricRow, value: number): string {
  if (row.format === "percent") return `${value.toFixed(1)}%`;
  if (row.format === "multiple") return `${value.toFixed(2)}x`;
  return `${value.toFixed(1)} yrs`;
}

export default function ScenarioComparisonSlide({ data }: Props) {
  const sortedTornadoData = [...data.tornadoData].sort(
    (a, b) => b.high - b.low - (a.high - a.low)
  );

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Scenario Comparison & IRR Sensitivity"
      />

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="bg-slate-50 border border-slate-200 rounded p-4 overflow-y-auto min-h-0">
          <h3 className="text-sm font-bold text-slate-800 mb-3">
            Scenario Shocks
          </h3>
          <ol className="list-decimal pl-4 space-y-2 text-sm text-slate-700">
            {data.shocks.map((shock, i) => (
              <li key={i} className="leading-tight">
                {shock}
              </li>
            ))}
          </ol>
        </div>

        <div className="col-span-2 bg-slate-50 border border-slate-200 rounded p-4 flex flex-col min-h-0">
          <h3 className="text-sm font-bold text-slate-800 mb-2 text-center shrink-0">
            IRR Sensitivity by Driver
          </h3>
          <div className="w-full min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={sortedTornadoData}
                margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  label={{
                    value: "IRR Impact (%)",
                    position: "bottom",
                    offset: -5,
                    fontSize: 10,
                  }}
                />
                <YAxis
                  dataKey="factor"
                  type="category"
                  tick={{ fontSize: 10 }}
                  width={100}
                />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <ReferenceLine x={0} stroke="#666" />
                <Bar
                  dataKey="low"
                  fill="#ef4444"
                  name="Downside Impact"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="high"
                  fill="#10b981"
                  name="Upside Impact"
                  radius={[4, 0, 0, 4]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 text-center shrink-0">
            Chart shows the impact of individual variable shocks on Project IRR
            relative to Base Case.
          </p>
        </div>
      </div>

      <div className="mt-4 shrink-0">
        <h3 className="text-sm font-bold text-slate-800 mb-2">
          Scenario Comparison
        </h3>
        <table className="feasibility-table w-full text-xs text-slate-900 border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-300 p-2 text-left">Metric</th>
              <th className="border border-slate-300 p-2 text-right">
                Downside Case
              </th>
              <th className="border border-slate-300 p-2 text-right bg-slate-700">
                Base Case
              </th>
              <th className="border border-slate-300 p-2 text-right">
                Upside Case
              </th>
            </tr>
          </thead>
          <tbody>
            {data.comparison.map((row, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
              >
                <td className="border border-slate-300 p-2 font-medium">
                  {row.metric}
                </td>
                <td className="border border-slate-300 p-2 text-right text-red-600">
                  {formatCell(row, row.downside)}
                </td>
                <td className="border border-slate-300 p-2 text-right font-bold bg-slate-100">
                  {formatCell(row, row.base)}
                </td>
                <td className="border border-slate-300 p-2 text-right text-emerald-600">
                  {formatCell(row, row.upside)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SlideContainer>
  );
}
