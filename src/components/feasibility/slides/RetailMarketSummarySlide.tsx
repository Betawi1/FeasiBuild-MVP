"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { RetailMarketSummaryData } from "@/types/feasibility";

interface Props {
  data: RetailMarketSummaryData;
  city: string;
}

export default function RetailMarketSummarySlide({ data, city }: Props) {
  const sections = [
    { title: "Market overview", items: data.marketOverview },
    { title: "Supply & demand", items: data.supplyDemand },
    { title: "Competitive position", items: data.competitivePosition },
    { title: "Investment thesis", items: data.investmentThesis },
  ];

  return (
    <SlideContainer>
      <SlideHeader
        title="Summary of retail market"
        subtitle="Key findings"
        className="mb-4"
      />
      <p className="text-sm text-emerald-600 mb-4 shrink-0">
        Retail market summary for {city}
      </p>
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 overflow-hidden">
        {sections.map((section) => (
          <div key={section.title} className="overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-800 mb-2 border-b border-slate-300 pb-1">
              {section.title}
            </h3>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start text-xs text-slate-700">
                  <span className="text-emerald-500 mr-2 font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SlideContainer>
  );
}
