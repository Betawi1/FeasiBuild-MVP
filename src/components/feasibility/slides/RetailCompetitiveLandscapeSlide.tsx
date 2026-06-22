"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { RetailCompetitiveLandscapeData } from "@/types/feasibility";

interface Props {
  data: RetailCompetitiveLandscapeData;
  paragraphs?: string[];
  city: string;
}

export default function RetailCompetitiveLandscapeSlide({
  data,
  paragraphs = [],
  city,
}: Props) {
  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle="Competitive Landscape & Benchmarking"
        className="mb-4"
      />
      <p className="text-sm text-emerald-600 mb-3 shrink-0">
        Benchmark regional malls in {city} for GLA, occupancy, and base rent positioning.
      </p>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <table className="feasibility-table w-full text-xs text-slate-900 border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-300 p-2 text-left">Mall</th>
              <th className="border border-slate-300 p-2 text-left">GLA</th>
              <th className="border border-slate-300 p-2 text-left">Occupancy</th>
              <th className="border border-slate-300 p-2 text-left">Base Rent</th>
              <th className="border border-slate-300 p-2 text-left">Positioning</th>
            </tr>
          </thead>
          <tbody>
            {data.benchmarkMalls.map((mall) => (
              <tr key={mall.name}>
                <td className="border border-slate-300 p-2 font-medium">{mall.name}</td>
                <td className="border border-slate-300 p-2">{mall.gla}</td>
                <td className="border border-slate-300 p-2">{mall.occupancy}</td>
                <td className="border border-slate-300 p-2">{mall.baseRent}</td>
                <td className="border border-slate-300 p-2">{mall.positioning}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex gap-6 text-xs text-emerald-600 shrink-0">
          <span>Avg occupancy: {data.avgOccupancy}</span>
          <span>Avg base rent: {data.avgBaseRent}</span>
        </div>
        <div className="mt-2 space-y-1 overflow-y-auto">
          {paragraphs.slice(0, 2).map((p, i) => (
            <p key={i} className="text-xs text-slate-700 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </div>
    </SlideContainer>
  );
}
