"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { RiskFactorsData } from "@/types/feasibility";
import {
  cleanDisplayText,
  splitEffectSentences,
} from "@/lib/feasibility/clean-ai-content";

interface Props {
  data: RiskFactorsData;
  city: string;
}

function EffectList({ effect, color }: { effect: string; color: "red" | "emerald" }) {
  const dot = color === "red" ? "text-red-500" : "text-emerald-500";
  const sentences = splitEffectSentences(effect);
  return (
    <ul className="space-y-0 text-[10px] text-slate-800 leading-snug">
      {sentences.map((e, j) => (
        <li key={j} className="flex items-start">
          <span className={`${dot} mr-1 shrink-0`}>•</span>
          <span>
            {cleanDisplayText(e)}
            {!e.endsWith(".") ? "." : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function KeyRiskFactorsSlide({ data }: Props) {
  return (
    <SlideContainer>
      <SlideHeader
        title="Key success and risk factors"
        subtitle="Potential risk factors and their mitigations"
        className="!mb-2"
      />

      <div className="flex-1 min-h-0 overflow-hidden space-y-1">
        <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-slate-800">
          <h3>Potential risks</h3>
          <h3>Possible effects on the Project</h3>
          <h3>Mitigating factors</h3>
        </div>

        <div className="space-y-1">
          <div className="bg-slate-800 text-white p-1 rounded text-[10px] font-bold">
            Market threats
          </div>
          {data.marketThreats.map((item, i) => (
            <div key={i} className="grid grid-cols-3 gap-1 text-[10px]">
              <div className="bg-slate-100 p-1 rounded border-l-4 border-slate-800 leading-snug text-slate-900 font-medium">
                {cleanDisplayText(item.risk)}
              </div>
              <div className="bg-slate-50 p-1 rounded border border-slate-300">
                <EffectList effect={item.effect} color="red" />
              </div>
              <div className="bg-white p-1 rounded border border-slate-300">
                <ul className="space-y-0 text-[10px] text-slate-800 leading-snug">
                  {item.mitigatingFactors.map((factor, j) => (
                    <li key={j} className="flex items-start">
                      <span className="text-emerald-500 mr-1 shrink-0">•</span>
                      <span>{cleanDisplayText(factor)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <div className="bg-slate-800 text-white p-1 rounded text-[10px] font-bold">
            Project&apos;s possible weaknesses
          </div>
          {data.projectWeaknesses.map((item, i) => (
            <div key={i} className="grid grid-cols-3 gap-1 text-[10px]">
              <div className="bg-slate-100 p-1 rounded border-l-4 border-slate-800 leading-snug text-slate-900 font-medium">
                {cleanDisplayText(item.weakness)}
              </div>
              <div className="bg-slate-50 p-1 rounded border border-slate-300">
                <EffectList effect={item.effect} color="red" />
              </div>
              <div className="bg-white p-1 rounded border border-slate-300">
                <ul className="space-y-0 text-[10px] text-slate-800 leading-snug">
                  {item.mitigatingFactors.map((factor, j) => (
                    <li key={j} className="flex items-start">
                      <span className="text-emerald-500 mr-1 shrink-0">•</span>
                      <span>{cleanDisplayText(factor)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[9px] text-slate-500 mt-1 shrink-0">
        Source: QWEN AI Market Research, {new Date().getFullYear()}
      </p>
    </SlideContainer>
  );
}
