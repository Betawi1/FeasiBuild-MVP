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
    <ul className="space-y-1 text-sm text-slate-700 leading-snug">
      {sentences.map((e, j) => (
        <li key={j} className="flex items-start">
          <span className="text-emerald-500 mr-1.5 shrink-0">•</span>
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
        className="mb-4"
      />

      <div className="flex-1 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 min-h-0 overflow-hidden">
        <div className="min-h-0 overflow-y-auto space-y-2 pr-1">
          <div className="grid grid-cols-[minmax(0,40%)_minmax(0,60%)] gap-3 mb-1">
            <h3 className="text-sm font-bold text-slate-800">
              Potential success factors
            </h3>
            <h3 className="text-sm font-bold text-slate-800">
              Possible effects on the Project
            </h3>
          </div>

          <div className="space-y-2">
            <div className="bg-slate-800 text-white px-2 py-1.5 rounded text-xs font-bold">
              Market opportunities
            </div>
            {data.marketOpportunities.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-[minmax(0,40%)_minmax(0,60%)] gap-3 text-sm"
              >
                <div className="bg-slate-100 p-2 rounded border-l-4 border-slate-800 leading-snug text-slate-800 font-medium">
                  {isEditing ? (
                    <textarea
                      value={item.factor}
                      onChange={(e) =>
                        updateOpportunity(i, { factor: e.target.value })
                      }
                      className="w-full p-1.5 bg-white border border-emerald-500/50 rounded resize-y min-h-[48px] text-sm"
                    />
                  ) : (
                    cleanDisplayText(item.factor)
                  )}
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-300">
                  {isEditing ? (
                    <textarea
                      value={item.effect}
                      onChange={(e) =>
                        updateOpportunity(i, { effect: e.target.value })
                      }
                      className="w-full p-1.5 bg-white border border-emerald-500/50 rounded resize-y min-h-[48px] text-sm"
                    />
                  ) : (
                    <EffectList effect={item.effect} />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="bg-slate-800 text-white px-2 py-1.5 rounded text-xs font-bold">
              Project&apos;s strengths
            </div>
            {data.projectStrengths.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-[minmax(0,40%)_minmax(0,60%)] gap-3 text-sm"
              >
                <div className="bg-slate-100 p-2 rounded border-l-4 border-slate-800 leading-snug text-slate-800 font-medium">
                  {isEditing ? (
                    <textarea
                      value={item.strength}
                      onChange={(e) =>
                        updateStrength(i, { strength: e.target.value })
                      }
                      className="w-full p-1.5 bg-white border border-emerald-500/50 rounded resize-y min-h-[48px] text-sm"
                    />
                  ) : (
                    cleanDisplayText(item.strength)
                  )}
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-300">
                  {isEditing ? (
                    <textarea
                      value={item.effect}
                      onChange={(e) =>
                        updateStrength(i, { effect: e.target.value })
                      }
                      className="w-full p-1.5 bg-white border border-emerald-500/50 rounded resize-y min-h-[48px] text-sm"
                    />
                  ) : (
                    <EffectList effect={item.effect} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center min-h-0 overflow-hidden">
          <div className="bg-slate-800 text-white p-3 rounded-lg overflow-hidden max-h-full">
            <h4 className="text-xs font-bold mb-2 text-center">
              Main outcomes for the project
            </h4>
            <ul className="space-y-2 text-sm">
              {data.mainOutcomes.map((outcome, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <EditableTextBlock
                    text={cleanDisplayText(outcome)}
                    isEditing={isEditing}
                    onChange={(text) => updateOutcome(i, text)}
                    className="text-emerald-100 leading-snug flex-1 text-sm"
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
