"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { DataCentreCompetitiveAnalysisData } from "@/types/feasibility";
import {
  BarValueLabelList,
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

const MAX_BULLETS = 3;

const CHART_MARGIN = {
  top: 22,
  right: 8,
  left: -4,
  bottom: 8,
} as const;

/** Competitor $/kW, PUE, and latency — 2+1 layout to avoid 16:9 overflow. */
export default function DataCentreCompetitiveAnalysisSlide({
  data,
  paragraphs = [],
  city,
  isEditing = false,
  onParagraphChange,
}: Props) {
  const c = data.currency;
  const bullets = paragraphs.slice(0, MAX_BULLETS);
  const showCommentary = bullets.length > 0 || isEditing;
  const editItems = isEditing && bullets.length === 0 ? [""] : bullets;

  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle={`Competitive Analysis — ${city}`}
        className="mb-2"
      />
      <div className="flex min-h-0 w-full max-w-full flex-1 flex-col gap-2 overflow-hidden">
        {showCommentary && (
          <ul className="shrink-0 list-disc space-y-1 pl-4 text-xs leading-tight text-slate-700">
            {editItems.map((point, idx) => (
              <li key={idx} className="marker:text-slate-500">
                <EditableTextBlock
                  text={point}
                  isEditing={isEditing}
                  onChange={(text) => onParagraphChange?.(idx, text)}
                  className="text-xs leading-tight text-slate-700"
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1 flex min-h-0 w-full max-w-full flex-1 flex-col gap-3 overflow-hidden">
          {/* Top row: Pricing + PUE */}
          <div className="grid min-h-0 flex-[1.15] grid-cols-2 gap-4 overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
              <h3 className="mb-1 shrink-0 text-[10px] font-semibold text-slate-700">
                {DATACENTRE_CHART_LABELS.competitorPricingKw.replace("MYR", c)}
              </h3>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.competitorPricing}
                    margin={CHART_MARGIN}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      fontSize={9}
                      tick={{ fontSize: 9 }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={52}
                    />
                    <YAxis fontSize={9} tick={{ fontSize: 9 }} width={36} />
                    <Tooltip />
                    <Bar dataKey="pricePerKw" fill="#0d9488" radius={[2, 2, 0, 0]}>
                      <BarValueLabelList
                        fill="#1e293b"
                        fontSize={9}
                        formatter={(v) =>
                          formatChartNumber(v, { compact: false, decimals: 0 })
                        }
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
              <h3 className="mb-1 shrink-0 text-[10px] font-semibold text-slate-700">
                {DATACENTRE_CHART_LABELS.competitorPue}
              </h3>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.competitorPUE} margin={CHART_MARGIN}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      fontSize={9}
                      tick={{ fontSize: 9 }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={52}
                    />
                    <YAxis
                      fontSize={9}
                      tick={{ fontSize: 9 }}
                      domain={[1, "auto"]}
                      width={36}
                    />
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
          </div>

          {/* Bottom row: Latency (centered, constrained width) */}
          <div className="flex min-h-0 flex-1 justify-center overflow-hidden">
            <div className="flex h-full w-full max-w-[70%] min-w-0 flex-col overflow-hidden">
              <h3 className="mb-1 shrink-0 text-center text-[10px] font-semibold text-slate-700">
                {DATACENTRE_CHART_LABELS.latencyToHubs}
              </h3>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.latencyToHubs} margin={CHART_MARGIN}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hub"
                      fontSize={9}
                      tick={{ fontSize: 9 }}
                    />
                    <YAxis fontSize={9} tick={{ fontSize: 9 }} width={36} />
                    <Tooltip />
                    <Bar
                      dataKey="latencyMs"
                      fill="#f59e0b"
                      radius={[2, 2, 0, 0]}
                    >
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
      </div>
    </SlideContainer>
  );
}
