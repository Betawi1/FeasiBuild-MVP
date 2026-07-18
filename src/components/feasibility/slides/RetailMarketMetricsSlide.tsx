"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { RetailMarketMetricsData } from "@/types/feasibility";
import {
  BarValueLabelList,
  CHART_MARGIN_WITH_LABELS,
  LineValueLabelList,
  formatChartNumber,
} from "@/components/feasibility/charts/chart-data-labels";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props extends SlideEditingProps {
  data: RetailMarketMetricsData;
  paragraphs?: string[];
  city: string;
}

export default function RetailMarketMetricsSlide({
  data,
  paragraphs = [],
  city,
  isEditing = false,
  onParagraphChange,
}: Props) {
  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle="Historical & Projected Market Metrics"
        className="mb-4"
      />
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
        <div className="min-h-0 flex flex-col">
          <h3 className="text-xs font-semibold text-slate-700 mb-1 shrink-0">
            Footfall index — {city} malls
          </h3>
          <div className="flex-1 min-h-0 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData} margin={CHART_MARGIN_WITH_LABELS}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" fontSize={9} />
                <YAxis fontSize={9} />
                <Tooltip />
                <Bar dataKey="footfall" fill="#4c1d95" name="Footfall (m)">
                  <BarValueLabelList
                    fill="#4c1d95"
                    fontSize={10}
                    formatter={(v) =>
                      formatChartNumber(v, { decimals: 0, compact: false })
                    }
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-1 text-[10px] text-emerald-600 shrink-0">
            <span>Footfall CAGR: {data.footfallCagr}</span>
            <span>Occupancy: {data.occupancyLatest}</span>
          </div>
        </div>
        <div className="min-h-0 flex flex-col">
          <h3 className="text-xs font-semibold text-slate-700 mb-1 shrink-0">
            Tenant sales PSF trend
          </h3>
          <div className="flex-1 min-h-0 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData} margin={CHART_MARGIN_WITH_LABELS}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" fontSize={9} />
                <YAxis fontSize={9} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "9px" }} />
                <Line
                  type="monotone"
                  dataKey="salesPsf"
                  stroke="#0d9488"
                  name="Sales PSF"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                >
                  <LineValueLabelList
                    fill="#0f766e"
                    fontSize={10}
                    formatter={(v) =>
                      formatChartNumber(v, { decimals: 0, compact: false })
                    }
                  />
                </Line>
                {/* Occupancy labels omitted — scale is too small vs Sales PSF */}
                <Line
                  type="monotone"
                  dataKey="occupancy"
                  stroke="#3b82f6"
                  name="Occupancy %"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-emerald-600 mt-1 shrink-0">
            Sales PSF CAGR: {data.salesPsfCagr}
          </p>
          <div className="mt-2 overflow-y-auto">
            <EditableSlideParagraphs
              paragraphs={paragraphs.slice(0, 2)}
              isEditing={isEditing}
              onParagraphChange={onParagraphChange}
              itemClassName="text-xs text-slate-700 leading-relaxed"
            />
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}
