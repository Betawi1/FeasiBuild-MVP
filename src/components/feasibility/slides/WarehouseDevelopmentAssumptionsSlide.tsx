"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { WarehouseDevelopmentAssumptionsData } from "@/types/feasibility";
import { cleanParagraphsForDisplay } from "@/lib/feasibility/clean-ai-content";

interface Props extends SlideEditingProps {
  data: WarehouseDevelopmentAssumptionsData;
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

function formatPerSqft(amount: number, currency: string): string {
  try {
    return `${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount)} / sqft`;
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en-US")} / sqft`;
  }
}

export default function WarehouseDevelopmentAssumptionsSlide({
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
        subtitle="Development Assumptions — Warehouse / Logistics"
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
          {data.isIndustrialPark ? "Industrial Park" : "Single Warehouse"}
          {" · "}
          GFA {data.totalGfa.toLocaleString("en-US")} sqft
          {" · "}
          Cost per sqft Breakdown
        </p>

        <div className="min-h-0 flex-1 overflow-hidden">
          <table className="feasibility-table w-full border-collapse border border-slate-300 text-[11px] leading-tight text-slate-900">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 px-2 py-1 text-left">Component</th>
                <th className="border border-slate-300 px-2 py-1 text-right">Total Cost</th>
                <th className="border border-slate-300 px-2 py-1 text-right">Cost per sqft</th>
                <th className="border border-slate-300 px-2 py-1 text-right">% of Total</th>
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
                    {formatPerSqft(row.costPerSqft, c)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right">
                    {row.percentage.toFixed(0)}%
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold text-slate-900">
                <td className="border border-slate-300 px-2 py-1">Total All-In Cost</td>
                <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                  {formatCurrency(data.totalAllInCost, c)}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                  {formatPerSqft(data.totalAllInCostPerSqft, c)}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SlideContainer>
  );
}
