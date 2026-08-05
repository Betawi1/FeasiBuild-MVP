"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { DataCentreDevelopmentAssumptionsData } from "@/types/feasibility";
import { cleanParagraphsForDisplay } from "@/lib/feasibility/clean-ai-content";

interface Props extends SlideEditingProps {
  data: DataCentreDevelopmentAssumptionsData;
  paragraphs?: string[];
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
  }
}

function formatPerMw(amount: number, currency: string): string {
  try {
    return `${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount)} / MW`;
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en-US")} / MW`;
  }
}

export default function DataCentreDevelopmentAssumptionsSlide({
  data,
  paragraphs = [],
  isEditing = false,
  onParagraphChange,
}: Props) {
  const displayParagraphs = isEditing
    ? paragraphs
    : cleanParagraphsForDisplay(paragraphs);
  const c = data.currency;

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Development Assumptions — Data Centre"
        className="mb-3"
      />
      <div className="flex flex-1 min-h-0 flex-col gap-2">
        {(displayParagraphs.length > 0 || isEditing) && (
          <div className="max-h-[150px] shrink-0 overflow-y-auto rounded border-l-4 border-blue-500 bg-blue-50 px-3 py-2">
            <EditableSlideParagraphs
              paragraphs={displayParagraphs}
              isEditing={isEditing}
              onParagraphChange={onParagraphChange}
              className="space-y-1"
              itemClassName="text-xs text-slate-800 leading-tight"
            />
          </div>
        )}

        <p className="shrink-0 text-xs text-slate-500">
          {data.tierLevel}
          {" · "}
          PUE {data.pue}
          {" · "}
          {data.itLoadMw.toFixed(1)} MW IT load
          {" · "}
          White space {data.whiteSpaceSqft.toLocaleString("en-US")} sqft
          {" · "}
          Cost per MW breakdown
        </p>

        <div className="min-h-0 flex-1 overflow-hidden">
          <table className="feasibility-table w-full border-collapse border border-slate-300 text-[11px] leading-tight text-slate-900">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 px-2 py-1 text-left">
                  Component
                </th>
                <th className="border border-slate-300 px-2 py-1 text-right">
                  Total Cost
                </th>
                <th className="border border-slate-300 px-2 py-1 text-right">
                  Cost per MW
                </th>
                <th className="border border-slate-300 px-2 py-1 text-right">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.breakdown.map((row) => (
                <tr key={row.component} className="text-slate-900">
                  <td className="border border-slate-300 px-2 py-1 font-medium">
                    {row.component}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                    {formatCurrency(row.totalCost, c)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                    {formatPerMw(row.costPerMw, c)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right">
                    {row.percentage.toFixed(0)}%
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold text-slate-900">
                <td className="border border-slate-300 px-2 py-1">
                  Total All-In Cost
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                  {formatCurrency(data.totalAllInCost, c)}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                  {formatPerMw(data.totalAllInCostPerMw, c)}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right">
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SlideContainer>
  );
}
