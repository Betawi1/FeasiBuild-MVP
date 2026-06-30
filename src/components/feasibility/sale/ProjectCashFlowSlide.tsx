"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { SaleProjectCashFlowData } from "@/types/feasibility";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props extends SlideEditingProps {
  data: SaleProjectCashFlowData;
  paragraphs?: string[];
}

export default function ProjectCashFlowSlide({
  data,
  paragraphs = [],
  isEditing = false,
  onParagraphChange,
}: Props) {
  const chartData = data.netCashFlow.map((ncf, i) => ({
    month: `M${i}`,
    netCashFlow: Math.round(ncf / 1000),
    cumulative: Math.round((data.cumulativeCashFlow[i] ?? 0) / 1000),
  }));

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Project Cash Flow Analysis"
        className="mb-4"
      />
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <EditableSlideParagraphs
          paragraphs={paragraphs}
          isEditing={isEditing}
          onParagraphChange={onParagraphChange}
          className="shrink-0"
          itemClassName="text-sm text-slate-700 leading-relaxed"
        />
        <div className="flex gap-4 shrink-0 text-xs">
          <span className="rounded bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-700 font-semibold">
            Project IRR: {data.projectIRR}%
          </span>
          <span className="rounded bg-slate-100 border border-slate-300 px-3 py-2 text-slate-900 font-semibold">
            Equity Multiple: {data.equityMultiple.toFixed(2)}x
          </span>
          <span className="rounded bg-blue-50 border border-blue-200 px-3 py-2 text-blue-700 font-semibold">
            Payback: M{data.paybackMonth}
          </span>
        </div>
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 8 }} interval={Math.ceil(chartData.length / 12)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <ReferenceLine x={`M${data.paybackMonth}`} stroke="#dc2626" strokeDasharray="4 4" label="Payback" />
              <Line type="monotone" dataKey="netCashFlow" stroke="#2563eb" dot={false} name={`Net CF (${data.currency} '000)`} />
              <Line type="monotone" dataKey="cumulative" stroke="#059669" dot={false} name={`Cumulative (${data.currency} '000)`} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SlideContainer>
  );
}
