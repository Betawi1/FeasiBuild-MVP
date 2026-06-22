"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { BTROperationalAssumptionsData } from "@/types/feasibility";

interface Props {
  data: BTROperationalAssumptionsData;
  paragraphs?: string[];
}

function fmt(amount: number, currency: string): string {
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

export default function BTROperationalAssumptionsSlide({
  data,
  paragraphs = [],
}: Props) {
  const c = data.currency;

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Operational Assumptions - Revenues & Expenses"
        className="mb-4"
      />
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
        <div className="space-y-2 overflow-y-auto">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-slate-700 leading-relaxed">
              {p}
            </p>
          ))}
          <p className="text-xs text-slate-500">
            Residential GLA: {data.residentialGla.toLocaleString()} sqft · Retail
            GLA: {data.retailGla.toLocaleString()} sqft
          </p>
        </div>
        <div className="overflow-y-auto">
          <table className="feasibility-table w-full text-xs border border-slate-300">
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
                <tr
                  key={row.category}
                  className={
                    row.category.includes("Total") ? "font-bold bg-slate-50" : ""
                  }
                >
                  <td className="border border-slate-300 p-2">{row.category}</td>
                  <td className="border border-slate-300 p-2 text-right font-mono">
                    {fmt(row.amount, c)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SlideContainer>
  );
}
