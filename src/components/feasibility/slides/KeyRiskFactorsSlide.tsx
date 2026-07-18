"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { RiskFactorsData } from "@/types/feasibility";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import {
  cleanDisplayText,
  splitEffectSentences,
} from "@/lib/feasibility/clean-ai-content";

interface Props extends SlideEditingProps {
  data: RiskFactorsData;
  city: string;
}

const COL_GRID =
  "grid grid-cols-[minmax(0,25%)_minmax(0,45%)_minmax(0,30%)] gap-3";

function EffectList({ effect, color }: { effect: string; color: "red" | "emerald" }) {
  const dot = color === "red" ? "text-red-500" : "text-emerald-500";
  const sentences = splitEffectSentences(effect);
  return (
    <ul className="space-y-1 text-sm text-slate-700 leading-snug">
      {sentences.map((e, j) => (
        <li key={j} className="flex items-start">
          <span className={`${dot} mr-1.5 shrink-0`}>•</span>
          <span>
            {cleanDisplayText(e)}
            {!e.endsWith(".") ? "." : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function KeyRiskFactorsSlide({
  data,
  isEditing = false,
  onDataChange,
}: Props) {
  const updateThreat = (
    index: number,
    patch: Partial<RiskFactorsData["marketThreats"][number]>
  ) => {
    onDataChange?.({
      ...data,
      marketThreats: data.marketThreats.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateMitigation = (
    section: "marketThreats" | "projectWeaknesses",
    itemIndex: number,
    factorIndex: number,
    text: string
  ) => {
    const list = data[section];
    onDataChange?.({
      ...data,
      [section]: list.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              mitigatingFactors: item.mitigatingFactors.map((f, j) =>
                j === factorIndex ? text : f
              ),
            }
          : item
      ),
    });
  };

  const updateWeakness = (
    index: number,
    patch: Partial<RiskFactorsData["projectWeaknesses"][number]>
  ) => {
    onDataChange?.({
      ...data,
      projectWeaknesses: data.projectWeaknesses.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    });
  };

  return (
    <SlideContainer>
      <SlideHeader
        title="Key success and risk factors"
        subtitle="Potential risk factors and their mitigations"
        className="mb-4"
      />

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        <div className={`${COL_GRID} text-sm font-bold text-slate-800`}>
          <h3>Potential risks</h3>
          <h3>Possible effects on the Project</h3>
          <h3>Mitigating factors</h3>
        </div>

        <div className="space-y-2">
          <div className="bg-slate-800 text-white px-2 py-1.5 rounded text-xs font-bold">
            Market threats
          </div>
          {data.marketThreats.map((item, i) => (
            <div key={i} className={`${COL_GRID} text-sm`}>
              <div className="bg-slate-100 p-2 rounded border-l-4 border-slate-800 leading-snug text-slate-800 font-medium">
                {isEditing ? (
                  <textarea
                    value={item.risk}
                    onChange={(e) => updateThreat(i, { risk: e.target.value })}
                    className="w-full p-1.5 bg-white border border-emerald-500/50 rounded resize-y min-h-[48px] text-sm"
                  />
                ) : (
                  cleanDisplayText(item.risk)
                )}
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-300">
                {isEditing ? (
                  <textarea
                    value={item.effect}
                    onChange={(e) => updateThreat(i, { effect: e.target.value })}
                    className="w-full p-1.5 bg-white border border-emerald-500/50 rounded resize-y min-h-[48px] text-sm"
                  />
                ) : (
                  <EffectList effect={item.effect} color="red" />
                )}
              </div>
              <div className="bg-white p-2 rounded border border-slate-300">
                <ul className="space-y-1 text-sm text-slate-700 leading-snug">
                  {item.mitigatingFactors.map((factor, j) => (
                    <li key={j} className="flex items-start">
                      <span className="text-emerald-500 mr-1.5 shrink-0">•</span>
                      {isEditing ? (
                        <textarea
                          value={factor}
                          onChange={(e) =>
                            updateMitigation(
                              "marketThreats",
                              i,
                              j,
                              e.target.value
                            )
                          }
                          className="w-full p-1.5 bg-white border border-emerald-500/50 rounded resize-y min-h-[40px] text-sm"
                        />
                      ) : (
                        <span>{cleanDisplayText(factor)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="bg-slate-800 text-white px-2 py-1.5 rounded text-xs font-bold">
            Project&apos;s possible weaknesses
          </div>
          {data.projectWeaknesses.map((item, i) => (
            <div key={i} className={`${COL_GRID} text-sm`}>
              <div className="bg-slate-100 p-2 rounded border-l-4 border-slate-800 leading-snug text-slate-800 font-medium">
                {isEditing ? (
                  <textarea
                    value={item.weakness}
                    onChange={(e) =>
                      updateWeakness(i, { weakness: e.target.value })
                    }
                    className="w-full p-1.5 bg-white border border-emerald-500/50 rounded resize-y min-h-[48px] text-sm"
                  />
                ) : (
                  cleanDisplayText(item.weakness)
                )}
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-300">
                {isEditing ? (
                  <textarea
                    value={item.effect}
                    onChange={(e) =>
                      updateWeakness(i, { effect: e.target.value })
                    }
                    className="w-full p-1.5 bg-white border border-emerald-500/50 rounded resize-y min-h-[48px] text-sm"
                  />
                ) : (
                  <EffectList effect={item.effect} color="red" />
                )}
              </div>
              <div className="bg-white p-2 rounded border border-slate-300">
                <ul className="space-y-1 text-sm text-slate-700 leading-snug">
                  {item.mitigatingFactors.map((factor, j) => (
                    <li key={j} className="flex items-start">
                      <span className="text-emerald-500 mr-1.5 shrink-0">•</span>
                      {isEditing ? (
                        <textarea
                          value={factor}
                          onChange={(e) =>
                            updateMitigation(
                              "projectWeaknesses",
                              i,
                              j,
                              e.target.value
                            )
                          }
                          className="w-full p-1.5 bg-white border border-emerald-500/50 rounded resize-y min-h-[40px] text-sm"
                        />
                      ) : (
                        <span>{cleanDisplayText(factor)}</span>
                      )}
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
