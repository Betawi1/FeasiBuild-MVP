"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { BTRDevelopmentAssumptionsData } from "@/types/feasibility";
import OperationalDevelopmentCostTables from "./OperationalDevelopmentCostTables";
import { cleanParagraphsForDisplay } from "@/lib/feasibility/clean-ai-content";

interface Props {
  data: BTRDevelopmentAssumptionsData;
  paragraphs?: string[];
}

export default function BTRDevelopmentAssumptionsSlide({
  data,
  paragraphs = [],
}: Props) {
  const displayParagraphs = cleanParagraphsForDisplay(paragraphs);

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Development Assumptions — General BTR Assumptions"
        className="mb-3"
      />
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {displayParagraphs.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 px-3 py-2 rounded">
            {displayParagraphs.map((p, i) => (
              <p key={i} className="text-xs text-slate-800 leading-tight mb-1 last:mb-0">
                {p}
              </p>
            ))}
          </div>
        )}
        <OperationalDevelopmentCostTables
          costBreakdown={data.costBreakdown}
          showDepreciation
          depreciationBases={{
            constructionCost: data.constructionCost,
            constructionLife: data.constructionLife,
            ffeBase: data.ffeBase,
            ffeLife: data.ffeLife,
          }}
        />
      </div>
    </SlideContainer>
  );
}
