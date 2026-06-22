"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { SuccessFactorsData } from "@/types/feasibility";
import {
  cleanDisplayText,
  splitEffectSentences,
} from "@/lib/feasibility/clean-ai-content";

interface Props {
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

export default function KeySuccessFactorsSlide({ data }: Props) {
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
                  {cleanDisplayText(item.factor)}
                </div>
                <div className="bg-slate-50 p-1 rounded border border-slate-300">
                  <EffectList effect={item.effect} />
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
                  {cleanDisplayText(item.strength)}
                </div>
                <div className="bg-slate-50 p-1 rounded border border-slate-300">
                  <EffectList effect={item.effect} />
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
                  <span className="text-emerald-400 mr-2 font-bold shrink-0">✓</span>
                  <span className="text-emerald-100 leading-snug">
                    {cleanDisplayText(outcome)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}
