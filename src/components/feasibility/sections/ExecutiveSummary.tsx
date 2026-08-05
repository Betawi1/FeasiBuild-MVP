"use client";

import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import {
  AiContentWarningBanner,
  aiParagraphClassName,
} from "@/components/feasibility/AiContentWarning";
import { cleanParagraphsForDisplay } from "@/lib/feasibility/clean-ai-content";
import { generateDataCentreCommentaryFallback } from "@/lib/feasibility/generate-data-centre-commentary";
import EditableTextBlock from "../EditableTextBlock";
import SlideContainer from "../SlideContainer";
import SlideHeader from "../SlideHeader";

interface Props {
  slide: FeasibilitySlide;
  projectData: FeasibilityProjectBundle;
  isEditing?: boolean;
  onParagraphChange?: (index: number, text: string) => void;
}

function pct(n: number): string {
  return `${Math.round(n * 10) / 10}%`;
}

function isDataCentreProject(projectData: FeasibilityProjectBundle): boolean {
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

/** Detect stale warehouse / BTR commentary cached onto shared exec-1 slide. */
function looksLikeWrongAssetCommentary(paragraphs: string[]): boolean {
  const joined = paragraphs.join(" ").toLowerCase();
  return (
    joined.includes("bulk distribution") ||
    joined.includes("warehouse") ||
    joined.includes("cross-dock") ||
    joined.includes("3pl") ||
    joined.includes("logistics park") ||
    joined.includes("industrial park") ||
    joined.includes("residential") ||
    joined.includes("btr tower") ||
    joined.includes("build-to-rent") ||
    joined.includes("lease-up from") ||
    /grade\s*a\s+\w+\s+warehouse/.test(joined)
  );
}

function fallbackMetricsTable(
  projectData: FeasibilityProjectBundle
): NonNullable<FeasibilitySlide["tables"]>[number] {
  const c4 = projectData.component4;
  const c = projectData.currency;
  const dm = projectData.dataCentreMetrics;

  if (isDataCentreProject(projectData)) {
    const itLoadMw = dm?.itLoadMw ?? 0;
    const costPerMw = itLoadMw > 0 ? c4.tdc / itLoadMw : 0;
    return {
      title: "Key Financial Metrics",
      headers: ["Metric", "Value"],
      rows: [
        [
          "Total Development Cost (TDC)",
          `${c4.tdc.toLocaleString("en-US")} ${c}`,
        ],
        [
          "Cost per MW",
          `${Math.round(costPerMw).toLocaleString("en-US")} ${c}`,
        ],
        ["IT Load Capacity", `${itLoadMw.toFixed(1)} MW`],
        ["Design PUE", String(dm?.pue ?? "—")],
        ["Tier Level", dm?.tierLevel ?? "Tier III"],
        [
          "Gross Development Value (GDV)",
          `${c4.gdv.toLocaleString("en-US")} ${c}`,
        ],
        ["Unlevered Project IRR", pct(c4.projectIRR)],
        ["Levered Equity IRR", pct(c4.equityIRR)],
        ["Equity Multiple", `${c4.equityMultiple.toFixed(2)}x`],
        ["Payback Period", `${c4.paybackPeriod} years`],
      ],
    };
  }

  return {
    title: "Key Financial Metrics",
    headers: ["Metric", "Value"],
    rows: [
      ["Total Development Cost (TDC)", `${c4.tdc.toLocaleString("en-US")} ${c}`],
      ["Gross Development Value (GDV)", `${c4.gdv.toLocaleString("en-US")} ${c}`],
      ["Unlevered Project IRR", pct(c4.projectIRR)],
      ["Levered Equity IRR", pct(c4.equityIRR)],
      ["Equity Multiple", `${c4.equityMultiple.toFixed(2)}x`],
      ["Payback Period", `${c4.paybackPeriod} years`],
    ],
  };
}

export default function ExecutiveSummary({
  slide,
  projectData,
  isEditing = false,
  onParagraphChange,
}: Props) {
  const isSplit = slide.layout === "split";
  const metricsTable = slide.tables?.[0] ?? fallbackMetricsTable(projectData);

  // Replace stale warehouse/BTR paragraphs on Data Centre decks
  const isDc = isDataCentreProject(projectData);
  const paragraphs =
    isDc && looksLikeWrongAssetCommentary(slide.paragraphs)
      ? generateDataCentreCommentaryFallback("Executive Summary", projectData)
      : slide.paragraphs;

  const isDense = paragraphs.length >= 4;
  const displayParagraphs = cleanParagraphsForDisplay(paragraphs);

  return (
    <SlideContainer>
      <SlideHeader title={slide.title} subtitle={slide.subtitle} />

      <div
        className={`flex-1 min-h-0 overflow-hidden ${
          isSplit
            ? "grid grid-cols-[3fr_2fr] gap-8"
            : "grid grid-cols-2 gap-8"
        }`}
      >
        <div
          className={`min-h-0 overflow-hidden ${
            isDense ? "space-y-2" : "space-y-3"
          }`}
        >
          <AiContentWarningBanner paragraphs={paragraphs} />
          {displayParagraphs.map((p, i) => (
            <EditableTextBlock
              key={i}
              text={p}
              isEditing={isEditing && !!onParagraphChange}
              onChange={(text) => onParagraphChange?.(i, text)}
              className={aiParagraphClassName(p)}
            />
          ))}
          {slide.bulletPoints?.map((bp, i) => (
            <p key={i} className="text-sm text-slate-700">
              • {bp}
            </p>
          ))}
        </div>

        <div
          className={`bg-slate-50 rounded-lg border border-slate-200 min-h-0 overflow-hidden flex flex-col ${
            isDense ? "p-4" : "p-5"
          }`}
        >
          <h3
            className={`font-bold text-slate-800 shrink-0 ${
              isDense ? "text-sm mb-2" : "text-base mb-3"
            }`}
          >
            {metricsTable.title}
          </h3>

          {metricsTable.footer ? (
            <p
              className={`text-slate-600 shrink-0 ${
                isDense
                  ? "text-[11px] leading-snug mb-2"
                  : "text-xs leading-relaxed mb-3"
              }`}
            >
              {metricsTable.footer}
            </p>
          ) : null}

          <table className="feasibility-table w-full text-[11px] text-slate-900 border-collapse">
            <thead>
              <tr className="bg-slate-100">
                {metricsTable.headers.map((h, j) => (
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
              {metricsTable.rows.map((row, j) => (
                <tr key={j}>
                  {row.map((cell, k) => (
                    <td
                      key={k}
                      className={`border border-slate-300 px-2 py-1 text-slate-900 ${
                        k === 0
                          ? "font-medium"
                          : "text-right font-mono font-semibold"
                      } ${
                        k === 1 && (row[0]?.includes("IRR") ?? false)
                          ? "text-emerald-600"
                          : ""
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SlideContainer>
  );
}
