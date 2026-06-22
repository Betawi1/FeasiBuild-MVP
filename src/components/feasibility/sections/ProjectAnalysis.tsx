"use client";

import type { FeasibilitySlide } from "@/types/feasibility";
import {
  AiContentWarningBanner,
  aiParagraphClassName,
} from "@/components/feasibility/AiContentWarning";
import { cleanParagraphsForDisplay } from "@/lib/feasibility/clean-ai-content";
import SlideContainer from "../SlideContainer";
import SlideHeader from "../SlideHeader";

interface Props {
  slide: FeasibilitySlide;
  isEditing?: boolean;
  onParagraphChange?: (index: number, text: string) => void;
}

export default function ProjectAnalysis({
  slide,
  isEditing = false,
  onParagraphChange,
}: Props) {
  const isDense =
    slide.paragraphs.length >= 4 ||
    (slide.tables?.[0]?.rows.length ?? 0) > 6;
  const displayParagraphs = cleanParagraphsForDisplay(slide.paragraphs);

  return (
    <SlideContainer>
      <SlideHeader title={slide.title} subtitle={slide.subtitle} />

      <div
        className={`flex-1 grid grid-cols-2 min-h-0 overflow-hidden ${
          isDense ? "gap-8" : "gap-12"
        }`}
      >
        <div
          className={`min-h-0 overflow-hidden ${
            isDense ? "space-y-2.5" : "space-y-4"
          }`}
        >
          <AiContentWarningBanner paragraphs={slide.paragraphs} />
          {displayParagraphs.map((p, i) =>
            isEditing && onParagraphChange ? (
              <textarea
                key={i}
                value={p}
                onChange={(e) => onParagraphChange(i, e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-sm text-slate-700 h-20 resize-y"
              />
            ) : (
              <p key={i} className={aiParagraphClassName(p)}>
                {p}
              </p>
            )
          )}
        </div>

        <div
          className={`bg-slate-50 rounded-lg border border-slate-200 min-h-0 overflow-hidden flex flex-col ${
            isDense ? "p-4" : "p-6"
          }`}
        >
          {slide.tables?.[0] ? (
            <>
              <h3
                className={`font-semibold text-slate-800 shrink-0 ${
                  isDense ? "text-sm mb-2" : "text-lg mb-4"
                }`}
              >
                {slide.tables[0].title}
              </h3>
              <table className="feasibility-table w-full text-[11px] text-slate-900 border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    {slide.tables[0].headers.map((h, j) => (
                      <th
                        key={j}
                        className="border border-slate-300 px-2 py-1 text-left font-bold text-slate-900"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slide.tables[0].rows.map((row, j) => (
                    <tr key={j}>
                      {row.map((cell, k) => (
                        <td
                          key={k}
                          className={`border border-slate-300 px-2 py-1 text-slate-900 ${
                            k === 0 ? "font-medium" : ""
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {slide.tables[0].footer ? (
                <p className="text-[10px] text-slate-500 mt-2 shrink-0">
                  {slide.tables[0].footer}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <h3
                className={`font-semibold text-slate-800 ${
                  isDense ? "text-sm mb-2" : "text-lg mb-4"
                }`}
              >
                Key Project Metrics
              </h3>
              <ul className={isDense ? "space-y-1.5" : "space-y-3"}>
                {slide.bulletPoints?.map((point, i) => (
                  <li
                    key={i}
                    className={`flex items-start text-slate-700 ${
                      isDense ? "text-xs" : "text-sm"
                    }`}
                  >
                    <span className="text-emerald-500 mr-2 shrink-0">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </SlideContainer>
  );
}
