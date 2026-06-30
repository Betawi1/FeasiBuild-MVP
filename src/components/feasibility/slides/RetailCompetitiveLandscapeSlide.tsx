"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { RetailCompetitiveLandscapeData } from "@/types/feasibility";

interface Props extends SlideEditingProps {
  data: RetailCompetitiveLandscapeData;
  paragraphs?: string[];
  city: string;
}

export default function RetailCompetitiveLandscapeSlide({
  data,
  paragraphs = [],
  city,
  isEditing = false,
  onParagraphChange,
  onDataChange,
}: Props) {
  const updateMall = (
    index: number,
    patch: Partial<RetailCompetitiveLandscapeData["benchmarkMalls"][number]>
  ) => {
    onDataChange?.({
      ...data,
      benchmarkMalls: data.benchmarkMalls.map((m, i) =>
        i === index ? { ...m, ...patch } : m
      ),
    });
  };

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
            {data.benchmarkMalls.map((mall, i) => (
              <tr key={mall.name}>
                <td className="border border-slate-300 p-2 font-medium">
                  {isEditing ? (
                    <input
                      value={mall.name}
                      onChange={(e) => updateMall(i, { name: e.target.value })}
                      className="w-full p-1 bg-white border border-emerald-500/50 rounded text-xs"
                    />
                  ) : (
                    mall.name
                  )}
                </td>
                <td className="border border-slate-300 p-2">
                  {isEditing ? (
                    <input
                      value={mall.gla}
                      onChange={(e) => updateMall(i, { gla: e.target.value })}
                      className="w-full p-1 bg-white border border-emerald-500/50 rounded text-xs"
                    />
                  ) : (
                    mall.gla
                  )}
                </td>
                <td className="border border-slate-300 p-2">
                  {isEditing ? (
                    <input
                      value={mall.occupancy}
                      onChange={(e) => updateMall(i, { occupancy: e.target.value })}
                      className="w-full p-1 bg-white border border-emerald-500/50 rounded text-xs"
                    />
                  ) : (
                    mall.occupancy
                  )}
                </td>
                <td className="border border-slate-300 p-2">
                  {isEditing ? (
                    <input
                      value={mall.baseRent}
                      onChange={(e) => updateMall(i, { baseRent: e.target.value })}
                      className="w-full p-1 bg-white border border-emerald-500/50 rounded text-xs"
                    />
                  ) : (
                    mall.baseRent
                  )}
                </td>
                <td className="border border-slate-300 p-2">
                  {isEditing ? (
                    <input
                      value={mall.positioning}
                      onChange={(e) => updateMall(i, { positioning: e.target.value })}
                      className="w-full p-1 bg-white border border-emerald-500/50 rounded text-xs"
                    />
                  ) : (
                    mall.positioning
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex gap-6 text-xs text-emerald-600 shrink-0">
          <span>Avg occupancy: {data.avgOccupancy}</span>
          <span>Avg base rent: {data.avgBaseRent}</span>
        </div>
        <div className="mt-2 overflow-y-auto">
          <EditableSlideParagraphs
            paragraphs={paragraphs.slice(0, 2)}
            isEditing={isEditing}
            onParagraphChange={onParagraphChange}
            itemClassName="text-xs text-slate-700 leading-relaxed"
          />
        </div>
      </div>
    </SlideContainer>
  );
}
