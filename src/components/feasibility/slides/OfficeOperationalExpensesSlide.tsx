"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { OfficeOperationalExpensesData } from "@/types/feasibility";

interface Props {
  data: OfficeOperationalExpensesData;
  paragraphs?: string[];
}

export default function OfficeOperationalExpensesSlide({
  data,
  paragraphs = [],
}: Props) {
  const c = data.currency;
  return (
    <SlideContainer>
      <SlideHeader title="Financial Analysis" subtitle="Operational Assumptions - Expenses" className="mb-4" />
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
        <div className="space-y-2 overflow-y-auto">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-slate-700 leading-relaxed">{p}</p>
          ))}
        </div>
        <div className="overflow-y-auto">
          <table className="feasibility-table w-full text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 p-2 text-left">Expense Category</th>
                <th className="border border-slate-300 p-2 text-right">Amount ({c})</th>
                <th className="border border-slate-300 p-2 text-right">% of Rev</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.category}>
                  <td className="border border-slate-300 p-2">{row.category}</td>
                  <td className="border border-slate-300 p-2 text-right font-mono">{row.amount.toLocaleString()}</td>
                  <td className="border border-slate-300 p-2 text-right">{row.shareOfRevenuePct}%</td>
                </tr>
              ))}
              <tr className="font-bold bg-slate-50">
                <td className="border border-slate-300 p-2">Total OpEx</td>
                <td className="border border-slate-300 p-2 text-right font-mono">{data.totalOpex.toLocaleString()}</td>
                <td className="border border-slate-300 p-2 text-right">
                  {data.totalRevenue > 0
                    ? `${Math.round((data.totalOpex / data.totalRevenue) * 1000) / 10}%`
                    : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SlideContainer>
  );
}
