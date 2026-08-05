"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { RetailSupplyPipelineData } from "@/types/feasibility";
import {
  BarValueLabelList,
  CHART_MARGIN_WITH_LABELS,
  DATACENTRE_CHART_LABELS,
} from "@/components/feasibility/charts/chart-data-labels";
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

/**
 * Supply pipeline in MW — reuses stacked BarChart pattern from retail supply slide.
 * existingGla / pipelineGla fields hold MW values for data centre.
 */
export default function DataCentreSupplyDemandSlide({
  data,
  paragraphs = [],
  city,
  isEditing = false,
  onParagraphChange,
}: Props) {
  const chartData = data.chartData.map((d) => ({
    ...d,
    existingMw: Math.round(d.existingGla * 100) / 100,
    pipelineMw: Math.round(d.pipelineGla * 100) / 100,
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
            {DATACENTRE_CHART_LABELS.supplyPipelineMw} — {city}
          </h3>
          <div className="flex-1 min-h-0 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={CHART_MARGIN_WITH_LABELS}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" fontSize={9} />
                <YAxis fontSize={9} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "9px" }} />
                <Bar
                  dataKey="existingMw"
                  fill="#0d9488"
                  name="Existing (MW)"
                  radius={[2, 2, 0, 0]}
                >
                  <BarValueLabelList
                    fill="#1e293b"
                    fontSize={10}
                    formatter={(v) => v.toFixed(1)}
                  />
                </Bar>
                <Bar
                  dataKey="pipelineMw"
                  fill="#8b5cf6"
                  name="Pipeline (MW)"
                  radius={[2, 2, 0, 0]}
                >
                  <BarValueLabelList
                    fill="#1e293b"
                    fontSize={10}
                    formatter={(v) => v.toFixed(1)}
                  />
                </Bar>
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
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
            <p>
              <span className="font-semibold">Existing stock:</span>{" "}
              {data.existingStockSqft.toLocaleString()} MW
            </p>
            <p>
              <span className="font-semibold">Near-term pipeline:</span>{" "}
              {data.pipelineSqft.toLocaleString()} MW
            </p>
            <p>
              <span className="font-semibold">Subject share:</span>{" "}
              {data.subjectSharePct}
            </p>
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}
