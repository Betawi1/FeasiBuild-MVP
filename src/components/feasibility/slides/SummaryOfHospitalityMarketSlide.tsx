"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { HospitalitySummaryData } from "@/types/feasibility";

interface Props {
  data: HospitalitySummaryData;
  city: string;
}

export default function SummaryOfHospitalityMarketSlide({ data }: Props) {
  const categories = [
    { title: "Tourism and Hospitality overview", items: data.tourismOverview },
    { title: "Guest profile and preferences", items: data.guestProfile },
    { title: "Historical supply", items: data.historicalSupply },
    { title: "Historical demand", items: data.historicalDemand },
    { title: "Growth potential", items: data.growthPotential },
  ];

  return (
    <SlideContainer>
      <SlideHeader
        title="Summary of hospitality market"
        subtitle="Key findings"
        className="mb-4"
      />

      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        <div className="w-1/5 flex flex-col justify-center shrink-0">
          <div className="bg-slate-800 text-white p-3 rounded-lg text-center font-bold text-xs">
            Hospitality market
          </div>
        </div>

        <div className="flex-1 space-y-2 min-h-0 overflow-hidden">
          {categories.map((category, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-1/3 bg-slate-800 text-white p-2 rounded-lg text-[10px] font-semibold flex items-center shrink-0">
                {category.title}
              </div>
              <div className="flex-1 min-w-0">
                <ul className="space-y-0.5 text-sm text-slate-700">
                  {category.items.map((item, j) => (
                    <li key={j} className="flex items-start">
                      <span className="text-emerald-500 mr-1 font-bold shrink-0">•</span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mt-2 shrink-0">
        Source: QWEN AI Market Research, {new Date().getFullYear()}
      </p>
    </SlideContainer>
  );
}
