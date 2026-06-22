"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { OperationalRevenuesData } from "@/types/feasibility";

interface Props {
  data: OperationalRevenuesData;
  paragraphs?: string[];
}

export default function OperationalRevenuesSlide({ data, paragraphs = [] }: Props) {
  const { years, adr, occupancy } = data.roomRevenues;
  const notes = paragraphs.length > 0 ? paragraphs : data.notes;

  return (
    <SlideContainer className="[&>div]:p-6">
      <SlideHeader title={data.title} subtitle={data.subtitle} />

      <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
        <div className="shrink-0">
          <h3 className="text-xs font-bold text-slate-800 mb-1 bg-slate-100 px-2 py-1">
            Room Revenues
          </h3>
          <table className="feasibility-table w-full text-[10px] text-slate-900 border-collapse border border-slate-300 table-fixed">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 px-2 py-1 text-left w-[22%]">
                  Metric
                </th>
                {years.map((year) => (
                  <th
                    key={year}
                    className="border border-slate-300 px-2 py-1 text-right"
                  >
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-medium">
                  Average Daily Rate ({data.currency})
                </td>
                {adr.map((rate, i) => (
                  <td
                    key={i}
                    className="border border-slate-300 px-2 py-1 text-right font-mono"
                  >
                    {rate.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-medium">
                  Average Annual Occupancy Rate
                </td>
                {occupancy.map((occ, i) => (
                  <td
                    key={i}
                    className="border border-slate-300 px-2 py-1 text-right font-mono"
                  >
                    {occ}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
          <div className="min-h-0">
            <h3 className="text-xs font-bold text-slate-800 mb-1 bg-slate-100 px-2 py-1">
              F&amp;B and Other Sources of Revenues
            </h3>
            <table className="feasibility-table w-full text-[10px] text-slate-900 border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-300 px-2 py-1 text-left">
                    Category
                  </th>
                  <th className="border border-slate-300 px-2 py-1 text-right w-[28%]">
                    % of Total revenues
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.revenueDistribution.map((item, i) => (
                  <tr
                    key={i}
                    className={item.isTotal ? "bg-slate-100 font-bold" : ""}
                  >
                    <td className="border border-slate-300 px-2 py-1">
                      {item.category}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                      {item.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col justify-center min-h-0">
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 leading-relaxed">
              {notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
            <p className="mt-3 text-[9px] text-slate-400 italic">
              Source: Component 2 Operational Assumptions
            </p>
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}
