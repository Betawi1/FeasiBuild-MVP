"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { RetailTenantProfileData } from "@/types/feasibility";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#4c1d95", "#0d9488", "#f59e0b", "#3b82f6", "#ef4444", "#6366f1"];

interface Props {
  data: RetailTenantProfileData;
  paragraphs?: string[];
  city: string;
}

export default function RetailTenantProfileSlide({
  data,
  paragraphs = [],
  city,
}: Props) {
  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle="Target Tenant & Catchment Profile"
        className="mb-4"
      />
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
        <div className="min-h-0 flex flex-col">
          <h3 className="text-xs font-semibold text-slate-700 mb-1 shrink-0">
            Target tenant mix (% of GLA)
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.tenantMix}
                  dataKey="sharePct"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  label={(props) => {
                    const entry = props as { category?: string; sharePct?: number };
                    return `${String(entry.category ?? "").split(" ")[0]} ${entry.sharePct ?? 0}%`;
                  }}
                  labelLine={false}
                  fontSize={9}
                >
                  {data.tenantMix.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-emerald-600 mt-1 shrink-0">
            Target WALE: {data.waleYears} years · Catchment: {data.catchmentRadius}
          </p>
        </div>
        <div className="space-y-3 overflow-y-auto">
          <h3 className="text-xs font-semibold text-slate-700">
            Catchment demographics — {city}
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            {data.primaryDemographics.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-slate-700 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </div>
    </SlideContainer>
  );
}
