"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { BTRDevelopmentAssumptionsData } from "@/types/feasibility";
import OperationalDevelopmentCostTables from "./OperationalDevelopmentCostTables";
import { cleanParagraphsForDisplay } from "@/lib/feasibility/clean-ai-content";

interface Props extends SlideEditingProps {
  data: BTRDevelopmentAssumptionsData;
  paragraphs?: string[];
}

export default function BTRDevelopmentAssumptionsSlide({
  data,
  paragraphs = [],
  isEditing = false,
  onParagraphChange,
}: Props) {
  const displayParagraphs = isEditing
    ? paragraphs
    : cleanParagraphsForDisplay(paragraphs);

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Development Assumptions — General BTR Assumptions"
        className="mb-3"
      />
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {(displayParagraphs.length > 0 || isEditing) && (
          <div className="bg-blue-50 border-l-4 border-blue-500 px-3 py-2 rounded">
            <EditableSlideParagraphs
              paragraphs={displayParagraphs}
              isEditing={isEditing}
              onParagraphChange={onParagraphChange}
              className="space-y-1"
              itemClassName="text-xs text-slate-800 leading-tight"
            />
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
