"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { MallOperationalRevenuesData } from "@/types/feasibility";

interface Props {
  data: MallOperationalRevenuesData;
  paragraphs?: string[];
}

export default function MallOperationalRevenuesSlide({
  data,
  paragraphs = [],
}: Props) {
  const c = data.currency;

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Operational Assumptions - Revenues"
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
            GLA: {data.gla.toLocaleString()} sqft · Base rent Y1: {c}{" "}
            {data.baseRentYear1}/sqft · Stabilized occupancy:{" "}
            {data.stabilizedOccupancy}%
          </p>
        </div>
        <div className="overflow-y-auto">
          <table className="feasibility-table w-full text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 p-2 text-left">Revenue Source</th>
                <th className="border border-slate-300 p-2 text-right">Amount ({c})</th>
                <th className="border border-slate-300 p-2 text-right">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.source}>
                  <td className="border border-slate-300 p-2">{row.source}</td>
                  <td className="border border-slate-300 p-2 text-right font-mono">
                    {row.amount.toLocaleString()}
                  </td>
                  <td className="border border-slate-300 p-2 text-right">
                    {row.sharePct}%
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-slate-50">
                <td className="border border-slate-300 p-2">Total Revenue</td>
                <td className="border border-slate-300 p-2 text-right font-mono">
                  {data.totalRevenue.toLocaleString()}
                </td>
                <td className="border border-slate-300 p-2 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SlideContainer>
  );
}
