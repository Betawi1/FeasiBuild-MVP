"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { OfficeOperationalRevenuesData } from "@/types/feasibility";

interface Props extends SlideEditingProps {
  data: OfficeOperationalRevenuesData;
  paragraphs?: string[];
}

export default function OfficeOperationalRevenuesSlide({
  data,
  paragraphs = [],
  isEditing = false,
  onParagraphChange,
}: Props) {
  const c = data.currency;
  return (
    <SlideContainer>
      <SlideHeader title="Financial Analysis" subtitle="Operational Assumptions - Revenues" className="mb-4" />
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
        <div className="space-y-2 overflow-y-auto">
          <EditableSlideParagraphs
            paragraphs={paragraphs}
            isEditing={isEditing}
            onParagraphChange={onParagraphChange}
            itemClassName="text-sm text-slate-700 leading-relaxed"
          />
          <p className="text-xs text-slate-500">
            Office: {data.officeGla.toLocaleString()} sqft · Retail: {data.retailGla.toLocaleString()} sqft
          </p>
        </div>
        <div className="overflow-y-auto">
          <table className="feasibility-table w-full text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 p-2 text-left">Revenue Source</th>
                <th className="border border-slate-300 p-2 text-right">Amount ({c})</th>
                <th className="border border-slate-300 p-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.source}>
                  <td className="border border-slate-300 p-2">{row.source}</td>
                  <td className="border border-slate-300 p-2 text-right font-mono">{row.amount.toLocaleString()}</td>
                  <td className="border border-slate-300 p-2 text-right">{row.sharePct}%</td>
                </tr>
              ))}
              <tr className="font-bold bg-slate-50">
                <td className="border border-slate-300 p-2">Total Revenue</td>
                <td className="border border-slate-300 p-2 text-right font-mono">{data.totalRevenue.toLocaleString()}</td>
                <td className="border border-slate-300 p-2 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SlideContainer>
  );
}
