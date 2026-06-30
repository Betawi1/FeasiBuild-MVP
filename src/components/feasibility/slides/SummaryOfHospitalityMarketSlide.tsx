"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { HospitalitySummaryData } from "@/types/feasibility";

type SummaryDataWithTitles = HospitalitySummaryData & { categoryTitles?: string[] };

interface Props extends SlideEditingProps {
  data: HospitalitySummaryData;
  city: string;
}

const DEFAULT_TITLES = [
  "Tourism and Hospitality overview",
  "Guest profile and preferences",
  "Historical supply",
  "Historical demand",
  "Growth potential",
];

const CATEGORY_KEYS: (keyof HospitalitySummaryData)[] = [
  "tourismOverview",
  "guestProfile",
  "historicalSupply",
  "historicalDemand",
  "growthPotential",
];

export default function SummaryOfHospitalityMarketSlide({
  data,
  isEditing = false,
  onDataChange,
}: Props) {
  const extended = data as SummaryDataWithTitles;
  const titles = extended.categoryTitles ?? DEFAULT_TITLES;

  const updateTitle = (index: number, text: string) => {
    const nextTitles = [...titles];
    nextTitles[index] = text;
    onDataChange?.({ ...data, categoryTitles: nextTitles } as SummaryDataWithTitles);
  };

  const updateItem = (
    key: keyof HospitalitySummaryData,
    itemIndex: number,
    text: string
  ) => {
    const items = data[key] as string[];
    onDataChange?.({
      ...data,
      [key]: items.map((item, i) => (i === itemIndex ? text : item)),
    });
  };

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
          {CATEGORY_KEYS.map((key, i) => (
            <div key={key} className="flex gap-3">
              <div className="w-1/3 bg-slate-800 text-white p-2 rounded-lg text-[10px] font-semibold flex items-center shrink-0">
                {isEditing ? (
                  <input
                    value={titles[i] ?? DEFAULT_TITLES[i]}
                    onChange={(e) => updateTitle(i, e.target.value)}
                    className="w-full p-1 bg-slate-700 border border-emerald-500/50 rounded text-[10px] text-white"
                  />
                ) : (
                  titles[i] ?? DEFAULT_TITLES[i]
                )}
              </div>
              <div className="flex-1 min-w-0">
                <ul className="space-y-0.5 text-sm text-slate-700">
                  {(data[key] as string[]).map((item, j) => (
                    <li key={j} className="flex items-start">
                      <span className="text-emerald-500 mr-1 font-bold shrink-0">•</span>
                      <EditableTextBlock
                        text={item}
                        isEditing={isEditing}
                        onChange={(text) => updateItem(key, j, text)}
                        className="leading-snug flex-1"
                      />
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
