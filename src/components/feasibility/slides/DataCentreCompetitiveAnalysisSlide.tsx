"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { DataCentreCompetitiveAnalysisData } from "@/types/feasibility";
import {
  BarValueLabelList,
  CHART_MARGIN_WITH_LABELS,
  DATACENTRE_CHART_LABELS,
  formatChartNumber,
} from "@/components/feasibility/charts/chart-data-labels";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props extends SlideEditingProps {
  data: DataCentreCompetitiveAnalysisData;
  paragraphs?: string[];
  city: string;
}

/** Competitor $/kW, PUE, and latency — reuses SimpleBarChart (Recharts Bar) pattern. */
export default function DataCentreCompetitiveAnalysisSlide({
  data,
  paragraphs = [],
  city,
  isEditing = false,
  onParagraphChange,
}: Props) {
  const c = data.currency;

  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle={`Competitive Analysis — ${city}`}
        className="mb-3"
      />
      <div className="flex flex-1 min-h-0 flex-col gap-2">
        {(paragraphs.length > 0 || isEditing) && (
          <div className="max-h-[100px] shrink-0 overflow-y-auto">
            <EditableSlideParagraphs
              paragraphs={paragraphs}
              isEditing={isEditing}
              onParagraphChange={onParagraphChange}
              itemClassName="text-xs text-slate-700 leading-tight"
            />
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
          <div className="flex min-h-0 flex-col">
            <h3 className="mb-1 shrink-0 text-[10px] font-semibold text-slate-700">
              {DATACENTRE_CHART_LABELS.competitorPricingKw.replace(
                "MYR",
                c
              )}
            </h3>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.competitorPricing}
                  margin={CHART_MARGIN_WITH_LABELS}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={8} interval={0} angle={-20} textAnchor="end" height={48} />
                  <YAxis fontSize={8} />
                  <Tooltip />
                  <Bar dataKey="pricePerKw" fill="#0d9488" radius={[2, 2, 0, 0]}>
                    <BarValueLabelList
                      fill="#1e293b"
                      fontSize={9}
                      formatter={(v) => formatChartNumber(v, { compact: false, decimals: 0 })}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <h3 className="mb-1 shrink-0 text-[10px] font-semibold text-slate-700">
              {DATACENTRE_CHART_LABELS.competitorPue}
            </h3>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.competitorPUE}
                  margin={CHART_MARGIN_WITH_LABELS}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={8} interval={0} angle={-20} textAnchor="end" height={48} />
                  <YAxis fontSize={8} domain={[1, "auto"]} />
                  <Tooltip />
                  <Bar dataKey="pue" fill="#6366f1" radius={[2, 2, 0, 0]}>
                    <BarValueLabelList
                      fill="#1e293b"
                      fontSize={9}
                      formatter={(v) => v.toFixed(2)}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <h3 className="mb-1 shrink-0 text-[10px] font-semibold text-slate-700">
              {DATACENTRE_CHART_LABELS.latencyToHubs}
            </h3>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.latencyToHubs}
                  margin={CHART_MARGIN_WITH_LABELS}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hub" fontSize={8} />
                  <YAxis fontSize={8} />
                  <Tooltip />
                  <Bar dataKey="latencyMs" fill="#f59e0b" radius={[2, 2, 0, 0]}>
                    <BarValueLabelList
                      fill="#1e293b"
                      fontSize={9}
                      formatter={(v) => `${v}`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}
