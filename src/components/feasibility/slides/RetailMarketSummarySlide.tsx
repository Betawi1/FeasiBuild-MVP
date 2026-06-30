"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { RetailMarketSummaryData } from "@/types/feasibility";

interface Props extends SlideEditingProps {
  data: RetailMarketSummaryData;
  city: string;
}

const SECTIONS: { title: string; key: keyof RetailMarketSummaryData }[] = [
  { title: "Market overview", key: "marketOverview" },
  { title: "Supply & demand", key: "supplyDemand" },
  { title: "Competitive position", key: "competitivePosition" },
  { title: "Investment thesis", key: "investmentThesis" },
];

export default function RetailMarketSummarySlide({
  data,
  city,
  isEditing = false,
  onDataChange,
}: Props) {
  const updateItem = (
    key: keyof RetailMarketSummaryData,
    index: number,
    text: string
  ) => {
    const items = data[key] as string[];
    onDataChange?.({
      ...data,
      [key]: items.map((item, i) => (i === index ? text : item)),
    });
  };

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
        {SECTIONS.map((section) => (
          <div key={section.key} className="overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-800 mb-2 border-b border-slate-300 pb-1">
              {section.title}
            </h3>
            <ul className="space-y-2">
              {(data[section.key] as string[]).map((item, i) => (
                <li key={i} className="flex items-start text-xs text-slate-700">
                  <span className="text-emerald-500 mr-2 font-bold shrink-0">•</span>
                  <EditableTextBlock
                    text={item}
                    isEditing={isEditing}
                    onChange={(text) => updateItem(section.key, i, text)}
                    className="flex-1"
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SlideContainer>
  );
}
