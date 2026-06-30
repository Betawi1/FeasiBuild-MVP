"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { TravelTourismDemandData } from "@/types/feasibility";
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
  data: TravelTourismDemandData;
  country: string;
}

export default function TravelTourismDemandSlide({
  data,
  country,
  isEditing = false,
  onDataChange,
}: Props) {
  const updateBullet = (index: number, text: string) => {
    onDataChange?.({
      ...data,
      bulletPoints: data.bulletPoints.map((p, i) => (i === index ? text : p)),
    });
  };

  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle="Travel and Tourism demand"
      />

      <div className="flex-1 grid grid-cols-2 gap-8 min-h-0 overflow-hidden">
        <div className="flex flex-col min-h-0 overflow-hidden">
          <h3 className="text-sm font-semibold text-slate-700 mb-2 shrink-0">
            Travel &amp; Tourism Demand in {country}
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.chartData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" fontSize={10} />
                <YAxis fontSize={10} tickFormatter={(v) => `${v}`} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar
                  dataKey="consumption"
                  stackId="a"
                  fill="#4c1d95"
                  name="T&T Consumption"
                />
                <Bar
                  dataKey="capitalInvestment"
                  stackId="a"
                  fill="#92400e"
                  name="Capital Investment"
                />
                <Bar
                  dataKey="governmentExpenditure"
                  stackId="a"
                  fill="#166534"
                  name="Govt Expenditures"
                />
                <Bar
                  dataKey="nonVisitorExports"
                  stackId="a"
                  fill="#1e3a8a"
                  name="Non-Visitor Exports"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {isEditing ? (
            <div className="flex gap-2 mt-2 shrink-0">
              <input
                value={data.cagr}
                onChange={(e) =>
                  onDataChange?.({ ...data, cagr: e.target.value })
                }
                className="flex-1 p-1 text-xs border border-emerald-500/50 rounded"
                placeholder="CAGR"
              />
              <input
                value={data.realGrowth}
                onChange={(e) =>
                  onDataChange?.({ ...data, realGrowth: e.target.value })
                }
                className="flex-1 p-1 text-xs border border-emerald-500/50 rounded"
                placeholder="Real Growth"
              />
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-2 text-center shrink-0">
              CAGR: {data.cagr} | Real Growth: {data.realGrowth}
            </p>
          )}
        </div>

        <div className="flex flex-col justify-center min-h-0 overflow-hidden">
          <ul className="space-y-3">
            {data.bulletPoints.map((point, i) => (
              <li key={i} className="flex items-start text-sm text-slate-700">
                <span className="text-emerald-500 mr-2 font-bold shrink-0">•</span>
                <EditableTextBlock
                  text={point}
                  isEditing={isEditing}
                  onChange={(text) => updateBullet(i, text)}
                  className="leading-snug flex-1"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SlideContainer>
  );
}
