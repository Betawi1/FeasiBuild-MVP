"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { BTROperationalRevenuesData } from "@/types/feasibility";
import { cleanParagraphsForDisplay } from "@/lib/feasibility/clean-ai-content";

interface Props extends SlideEditingProps {
  data: BTROperationalRevenuesData;
  paragraphs?: string[];
}

function fmt(amount: number, currency: string): string {
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

export default function BTROperationalRevenuesSlide({
  data,
  paragraphs = [],
  isEditing = false,
  onParagraphChange,
}: Props) {
  const c = data.currency;
  const displayParagraphs = isEditing
    ? paragraphs
    : cleanParagraphsForDisplay(paragraphs);

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Operational Assumptions - Revenues"
        className="mb-4"
      />
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
        <div className="space-y-2 overflow-y-auto">
          <EditableSlideParagraphs
            paragraphs={displayParagraphs}
            isEditing={isEditing}
            onParagraphChange={onParagraphChange}
            itemClassName="text-sm text-slate-800 leading-relaxed"
          />
          <p className="text-xs text-slate-600">
            Residential GLA: {data.residentialGla.toLocaleString()} sqft · Retail
            GLA: {data.retailGla.toLocaleString()} sqft
          </p>
        </div>
        <div className="overflow-y-auto">
          <table className="w-full text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 p-2 text-left">Category</th>
                <th className="border border-slate-300 p-2 text-right">
                  Amount (Year 1)
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.category}>
                  <td className="border border-slate-300 p-2 text-black">
                    {row.category}
                  </td>
                  <td className="border border-slate-300 p-2 text-right font-mono text-black">
                    {fmt(row.amount, c)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-emerald-100">
                <td className="border border-slate-300 p-2 text-black">
                  Total Revenue (Year 1)
                </td>
                <td className="border border-slate-300 p-2 text-right font-mono text-black">
                  {fmt(data.totalRevenue, c)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SlideContainer>
  );
}
