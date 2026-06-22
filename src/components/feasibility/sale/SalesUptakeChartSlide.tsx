"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { SaleSalesUptakeChartData } from "@/types/feasibility";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  data: SaleSalesUptakeChartData;
  paragraphs?: string[];
}

export default function SalesUptakeChartSlide({
  data,
  paragraphs = [],
}: Props) {
  const chartData = data.monthlyCashInflows.map((p) => ({
    month: `M${p.month}`,
    unitSales: Math.round(p.unitSales / 1000),
    bulkSales: Math.round(p.bulkSales / 1000),
  }));

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Sales & Revenues Assumption"
        className="mb-4"
      />

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
        <div className="space-y-2 overflow-y-auto">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-slate-700 leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        <div className="flex flex-col min-h-0">
          <h3 className="text-xs font-bold text-slate-800 mb-2 shrink-0">
            Sales Uptake &amp; Mix Schedule ({data.currency} &apos;000)
          </h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={10} interval="preserveStartEnd" />
                <YAxis fontSize={10} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar
                  dataKey="unitSales"
                  fill="#10b981"
                  name="Unit Sales"
                  stackId="a"
                />
                <Bar
                  dataKey="bulkSales"
                  fill="#3b82f6"
                  name="Bulk Sales"
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}
