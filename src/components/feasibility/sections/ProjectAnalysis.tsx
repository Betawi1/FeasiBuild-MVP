"use client";

import type {
  FeasibilityProjectBundle,
  FeasibilitySlide,
} from "@/types/feasibility";
import {
  AiContentWarningBanner,
  aiParagraphClassName,
} from "@/components/feasibility/AiContentWarning";
import { cleanParagraphsForDisplay } from "@/lib/feasibility/clean-ai-content";
import { generateDataCentreCommentaryFallback } from "@/lib/feasibility/generate-data-centre-commentary";
import EditableSlideParagraphs from "../EditableSlideParagraphs";
import SlideContainer from "../SlideContainer";
import SlideHeader from "../SlideHeader";

interface Props {
  slide: FeasibilitySlide;
  projectData?: FeasibilityProjectBundle;
  isEditing?: boolean;
  onParagraphChange?: (index: number, text: string) => void;
}

function isDataCentreProject(projectData?: FeasibilityProjectBundle): boolean {
  if (!projectData) return false;
  const bt = (projectData.buildingType ?? "").toLowerCase();
  const at = (projectData.assetType ?? "").toLowerCase();
  return (
    bt.includes("data_centre") ||
    bt.includes("datacentre") ||
    bt.includes("data centre") ||
    at.includes("data centre") ||
    at.includes("data_centre") ||
    at.includes("datacentre") ||
    (projectData.dataCentreMetrics?.itLoadMw ?? 0) > 0
  );
}

function looksLikeWrongAssetCommentary(paragraphs: string[]): boolean {
  const joined = paragraphs.join(" ").toLowerCase();
  return (
    joined.includes("bulk distribution") ||
    joined.includes("warehouse") ||
    joined.includes("cross-dock") ||
    joined.includes("3pl") ||
    joined.includes("logistics") ||
    joined.includes("residential") ||
    joined.includes("btr tower") ||
    joined.includes("lease-up from")
  );
}

export default function ProjectAnalysis({
  slide,
  projectData,
  isEditing = false,
  onParagraphChange,
}: Props) {
  const isDc = isDataCentreProject(projectData);
  const paragraphs =
    isDc &&
    (slide.id === "datacentre-project-overview" ||
      slide.section === "project") &&
    looksLikeWrongAssetCommentary(slide.paragraphs)
      ? generateDataCentreCommentaryFallback("Project Overview", projectData!)
      : slide.paragraphs;

  const isDense =
    paragraphs.length >= 4 || (slide.tables?.[0]?.rows.length ?? 0) > 6;
  const displayParagraphs = cleanParagraphsForDisplay(paragraphs);

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
          <AiContentWarningBanner paragraphs={paragraphs} />
          <EditableSlideParagraphs
            paragraphs={displayParagraphs}
            isEditing={isEditing && !!onParagraphChange}
            onParagraphChange={onParagraphChange}
            itemClassName={aiParagraphClassName(displayParagraphs[0] ?? "")}
          />
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
                            k === 0
                              ? "font-medium"
                              : "text-right font-mono"
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </div>
      </div>
    </SlideContainer>
  );
}
