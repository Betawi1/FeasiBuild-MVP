"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { BTROperationalExpensesData } from "@/types/feasibility";
import { cleanParagraphsForDisplay } from "@/lib/feasibility/clean-ai-content";

interface Props extends SlideEditingProps {
  data: BTROperationalExpensesData;
  paragraphs?: string[];
}

function fmtNum(num: number): string {
  return Math.round(num).toLocaleString();
}

export default function BTROperationalExpensesSlide({
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
        subtitle="Operational Assumptions - Expenses"
        className="mb-4"
      />
      <div className="flex-1 min-h-0 overflow-hidden space-y-3">
        {(displayParagraphs.length > 0 || isEditing) && (
          <div className="bg-blue-50 border-l-4 border-blue-500 px-3 py-2 rounded max-h-24 overflow-y-auto">
            <EditableSlideParagraphs
              paragraphs={displayParagraphs}
              isEditing={isEditing}
              onParagraphChange={onParagraphChange}
              className="space-y-1"
              itemClassName="text-xs text-slate-800 leading-tight"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-6 min-h-0 flex-1">
          <div className="overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Expense Assumptions</h3>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-300 p-2 text-left">Expense Item</th>
                  <th className="border border-slate-300 p-2 text-right">Value</th>
                  <th className="border border-slate-300 p-2 text-left">Basis</th>
                </tr>
              </thead>
              <tbody>
                {data.assumptions.map((row) => (
                  <tr key={row.item}>
                    <td className="border border-slate-300 p-2 text-black">{row.item}</td>
                    <td className="border border-slate-300 p-2 text-right text-black">
                      {row.value}
                    </td>
                    <td className="border border-slate-300 p-2 text-black text-xs">
                      {row.basis}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Calculated Annual Totals (Year 1)
            </h3>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-300 p-2 text-left">Expense Item</th>
                  <th className="border border-slate-300 p-2 text-right">
                    Annual Amount ({c})
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.annualTotals.map((row) => (
                  <tr
                    key={row.item}
                    className={
                      row.item.includes("Total") ? "font-bold bg-emerald-100" : ""
                    }
                  >
                    <td className="border border-slate-300 p-2 text-black">{row.item}</td>
                    <td className="border border-slate-300 p-2 text-right text-black">
                      {typeof row.amount === "number"
                        ? fmtNum(row.amount)
                        : row.amount}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold bg-slate-50">
                  <td className="border border-slate-300 p-2 text-black">Total Units</td>
                  <td className="border border-slate-300 p-2 text-right text-black">
                    {data.totalUnits}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="mt-3 bg-slate-50 border-l-4 border-slate-500 p-2 rounded">
              <p className="text-[10px] text-slate-700">
                <strong>Note:</strong> Maintenance and Capex Reserve apply to all{" "}
                {data.totalUnits} units regardless of vacancy (gross lease structure).
              </p>
            </div>
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}
