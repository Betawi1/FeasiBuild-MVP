"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { RetailSupplyPipelineData } from "@/types/feasibility";
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

interface Props extends SlideEditingProps {
  data: RetailSupplyPipelineData;
  paragraphs?: string[];
  city: string;
}

export default function RetailSupplyPipelineSlide({
  data,
  paragraphs = [],
  city,
  isEditing = false,
  onParagraphChange,
}: Props) {
  const chartData = data.chartData.map((d) => ({
    ...d,
    existingM: Math.round(d.existingGla / 1_000_000),
    pipelineM: Math.round(d.pipelineGla / 1_000_000),
  }));

  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle="Current & Projected Supply Pipeline"
        className="mb-4"
      />
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
        <div className="min-h-0 flex flex-col">
          <h3 className="text-xs font-semibold text-slate-700 mb-1 shrink-0">
            Retail GLA stock & pipeline — {city} (m sqft)
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" fontSize={9} />
                <YAxis fontSize={9} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "9px" }} />
                <Bar dataKey="existingM" stackId="a" fill="#0d9488" name="Existing" />
                <Bar dataKey="pipelineM" stackId="a" fill="#8b5cf6" name="Pipeline" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-3 overflow-y-auto">
          <EditableSlideParagraphs
            paragraphs={paragraphs}
            isEditing={isEditing}
            onParagraphChange={onParagraphChange}
          />
          <table className="feasibility-table w-full text-xs border border-slate-300 mt-2">
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2">Existing stock (sqft)</td>
                <td className="border border-slate-300 p-2 text-right font-mono">
                  {data.existingStockSqft.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2">Pipeline (sqft)</td>
                <td className="border border-slate-300 p-2 text-right font-mono">
                  {data.pipelineSqft.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2">Subject share of stock</td>
                <td className="border border-slate-300 p-2 text-right font-mono">
                  {data.subjectSharePct}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SlideContainer>
  );
}
