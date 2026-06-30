"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { RetailMarketOverviewData } from "@/types/feasibility";

interface Props extends SlideEditingProps {
  data: RetailMarketOverviewData;
  paragraphs?: string[];
  city: string;
}

export default function RetailMarketOverviewSlide({
  data,
  paragraphs = [],
  city,
  isEditing = false,
  onParagraphChange,
  onDataChange,
}: Props) {
  const updateArrayItem = (
    field: "demandDrivers" | "catchmentHighlights",
    index: number,
    text: string
  ) => {
    onDataChange?.({
      ...data,
      [field]: data[field].map((item, i) => (i === index ? text : item)),
    });
  };

  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle="Retail Market Overview & Demand Drivers"
        className="mb-4"
      />
      <div className="flex-1 grid grid-cols-2 gap-8 min-h-0 overflow-hidden">
        <div className="space-y-3 overflow-y-auto">
          <EditableSlideParagraphs
            paragraphs={paragraphs}
            isEditing={isEditing}
            onParagraphChange={onParagraphChange}
          />
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-700 mb-2">
              Demand drivers — {city}
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              {data.demandDrivers.map((d, i) => (
                <li key={i}>
                  <EditableTextBlock
                    text={d}
                    isEditing={isEditing}
                    onChange={(text) => updateArrayItem("demandDrivers", i, text)}
                    className="text-sm text-slate-700"
                  />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-700 mb-2">
              Catchment highlights
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              {data.catchmentHighlights.map((h, i) => (
                <li key={i}>
                  <EditableTextBlock
                    text={h}
                    isEditing={isEditing}
                    onChange={(text) => updateArrayItem("catchmentHighlights", i, text)}
                    className="text-sm text-slate-700"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}
