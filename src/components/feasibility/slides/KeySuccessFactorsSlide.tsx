"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SuccessFactorsData } from "@/types/feasibility";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import {
  cleanDisplayText,
  splitEffectSentences,
} from "@/lib/feasibility/clean-ai-content";

interface Props extends SlideEditingProps {
  data: SuccessFactorsData;
  projectName: string;
}

function EffectList({ effect }: { effect: string }) {
  const sentences = splitEffectSentences(effect);
  return (
    <ul className="space-y-0 text-[10px] text-slate-800 leading-snug">
      {sentences.map((e, j) => (
        <li key={j} className="flex items-start">
          <span className="text-emerald-500 mr-1 shrink-0">•</span>
          <span>
            {cleanDisplayText(e)}
            {!e.endsWith(".") ? "." : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function KeySuccessFactorsSlide({
  data,
  isEditing = false,
  onDataChange,
}: Props) {
  const updateOpportunity = (
    index: number,
    patch: Partial<SuccessFactorsData["marketOpportunities"][number]>
  ) => {
    onDataChange?.({
      ...data,
      marketOpportunities: data.marketOpportunities.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateStrength = (
    index: number,
    patch: Partial<SuccessFactorsData["projectStrengths"][number]>
  ) => {
    onDataChange?.({
      ...data,
      projectStrengths: data.projectStrengths.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateOutcome = (index: number, text: string) => {
    onDataChange?.({
      ...data,
      mainOutcomes: data.mainOutcomes.map((o, i) => (i === index ? text : o)),
    });
  };

  return (
    <SlideContainer>
      <SlideHeader
        title="Key success and risk factors"
        subtitle="Potential success factors and their impact on the project"
        className="!mb-2"
      />

      <div className="flex-1 grid grid-cols-3 gap-2 min-h-0 overflow-hidden">
        <div className="col-span-2 min-h-0 overflow-hidden space-y-1">
          <div className="grid grid-cols-2 gap-2 mb-0.5">
            <h3 className="text-xs font-bold text-slate-800">
              Potential success factors
            </h3>
            <h3 className="text-xs font-bold text-slate-800">
              Possible effects on the Project
            </h3>
          </div>

          <div className="space-y-1">
            <div className="bg-slate-800 text-white p-1 rounded text-[10px] font-bold">
              Market opportunities
            </div>
            {data.marketOpportunities.map((item, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-slate-100 p-1 rounded border-l-4 border-slate-800 leading-snug text-slate-900 font-medium">
                  {isEditing ? (
                    <textarea
                      value={item.factor}
                      onChange={(e) =>
                        updateOpportunity(i, { factor: e.target.value })
                      }
                      className="w-full p-1 bg-white border border-emerald-500/50 rounded resize-y min-h-[40px] text-[10px]"
                    />
                  ) : (
                    cleanDisplayText(item.factor)
                  )}
                </div>
                <div className="bg-slate-50 p-1 rounded border border-slate-300">
                  {isEditing ? (
                    <textarea
                      value={item.effect}
                      onChange={(e) =>
                        updateOpportunity(i, { effect: e.target.value })
                      }
                      className="w-full p-1 bg-white border border-emerald-500/50 rounded resize-y min-h-[40px] text-[10px]"
                    />
                  ) : (
                    <EffectList effect={item.effect} />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <div className="bg-slate-800 text-white p-1 rounded text-[10px] font-bold">
              Project&apos;s strengths
            </div>
            {data.projectStrengths.map((item, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-slate-100 p-1 rounded border-l-4 border-slate-800 leading-snug text-slate-900 font-medium">
                  {isEditing ? (
                    <textarea
                      value={item.strength}
                      onChange={(e) =>
                        updateStrength(i, { strength: e.target.value })
                      }
                      className="w-full p-1 bg-white border border-emerald-500/50 rounded resize-y min-h-[40px] text-[10px]"
                    />
                  ) : (
                    cleanDisplayText(item.strength)
                  )}
                </div>
                <div className="bg-slate-50 p-1 rounded border border-slate-300">
                  {isEditing ? (
                    <textarea
                      value={item.effect}
                      onChange={(e) =>
                        updateStrength(i, { effect: e.target.value })
                      }
                      className="w-full p-1 bg-white border border-emerald-500/50 rounded resize-y min-h-[40px] text-[10px]"
                    />
                  ) : (
                    <EffectList effect={item.effect} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center min-h-0">
          <div className="bg-slate-800 text-white p-2 rounded-lg">
            <h4 className="text-[10px] font-bold mb-1 text-center">
              Main outcomes for the project
            </h4>
            <ul className="space-y-1 text-[10px]">
              {data.mainOutcomes.map((outcome, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-emerald-400 mr-2 font-bold shrink-0">
                    ✓
                  </span>
                  <EditableTextBlock
                    text={cleanDisplayText(outcome)}
                    isEditing={isEditing}
                    onChange={(text) => updateOutcome(i, text)}
                    className="text-emerald-100 leading-snug flex-1"
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
