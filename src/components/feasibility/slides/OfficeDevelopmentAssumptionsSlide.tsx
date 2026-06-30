"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { OfficeDevelopmentAssumptionsData } from "@/types/feasibility";
import OperationalDevelopmentCostTables from "./OperationalDevelopmentCostTables";
import { cleanParagraphsForDisplay } from "@/lib/feasibility/clean-ai-content";

interface Props extends SlideEditingProps {
  data: OfficeDevelopmentAssumptionsData;
  paragraphs?: string[];
}

function fmt(amount: number, currency: string): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

export default function OfficeDevelopmentAssumptionsSlide({
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
        subtitle="Development Assumptions — General Mixed-Use Assumptions"
        className="mb-3"
      />
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {(displayParagraphs.length > 0 || isEditing) && (
          <div className="bg-blue-50 border-l-4 border-blue-500 px-3 py-2 rounded">
            <EditableSlideParagraphs
              paragraphs={displayParagraphs}
              isEditing={isEditing}
              onParagraphChange={onParagraphChange}
              className="space-y-1"
              itemClassName="text-xs text-slate-800 leading-tight"
            />
          </div>
        )}
        <OperationalDevelopmentCostTables costBreakdown={data.costBreakdown} />
        <table className="w-full text-xs border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-300 p-2 text-left">
                Capitalized Leasing / TI
              </th>
              <th className="border border-slate-300 p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Office TI Allowance", data.officeTI],
              ["Retail TI Allowance", data.retailTI],
              ["Office Leasing Commissions", data.officeLeasingComm],
              ["Retail Leasing Commissions", data.retailLeasingComm],
              ["FFE Base", data.ffeBase],
            ].map(([label, amount]) => (
              <tr key={String(label)}>
                <td className="border border-slate-300 p-2 font-medium">{label}</td>
                <td className="border border-slate-300 p-2 text-right font-semibold">
                  {fmt(Number(amount), c)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SlideContainer>
  );
}
