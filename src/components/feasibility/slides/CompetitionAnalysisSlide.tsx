"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { CompetitionData } from "@/types/feasibility";

interface Props extends SlideEditingProps {
  data: CompetitionData;
  city: string;
  paragraphs?: string[];
}

function isLuxuryCity(city: string): boolean {
  const c = city.toLowerCase();
  return c.includes("dubai") || c.includes("abu dhabi");
}

export default function CompetitionAnalysisSlide({
  data,
  city,
  paragraphs = [],
  isEditing = false,
  onParagraphChange,
  onDataChange,
}: Props) {
  const tier = isLuxuryCity(city) ? "luxury" : "comparable";
  const defaultIntro = `In order to benchmark the facilities and performance of the hotel component of the Project, the following hotels were chosen as a sample of comparable ${tier} hotels in ${city}`;
  const intro = paragraphs[0] ?? defaultIntro;

  const updateHotel = (
    index: number,
    patch: Partial<CompetitionData["benchmarkHotels"][number]>
  ) => {
    onDataChange?.({
      ...data,
      benchmarkHotels: data.benchmarkHotels.map((h, i) =>
        i === index ? { ...h, ...patch } : h
      ),
    });
  };

  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle={`Competition analysis - Benchmark ${tier} hotels`}
        className="mb-4"
      />
      <EditableTextBlock
        text={intro}
        isEditing={isEditing}
        onChange={(text) => onParagraphChange?.(0, text)}
        className="text-sm text-emerald-600 mb-4 leading-relaxed shrink-0"
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        <table className="feasibility-table w-full text-xs text-slate-900 border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-300 p-2 text-left">Hotel</th>
              <th className="border border-slate-300 p-2 text-left">Rating</th>
              <th className="border border-slate-300 p-2 text-left">Description</th>
              <th className="border border-slate-300 p-2 text-left">Number of rooms</th>
            </tr>
          </thead>
          <tbody>
            {data.benchmarkHotels.map((hotel, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                <td className="border border-slate-300 p-2 font-semibold">
                  {isEditing ? (
                    <input
                      value={hotel.name}
                      onChange={(e) => updateHotel(i, { name: e.target.value })}
                      className="w-full p-1 bg-white border border-emerald-500/50 rounded text-xs"
                    />
                  ) : (
                    hotel.name
                  )}
                </td>
                <td className="border border-slate-300 p-2">
                  {isEditing ? (
                    <input
                      value={hotel.rating}
                      onChange={(e) => updateHotel(i, { rating: e.target.value })}
                      className="w-full p-1 bg-white border border-emerald-500/50 rounded text-xs"
                    />
                  ) : (
                    hotel.rating
                  )}
                </td>
                <td className="border border-slate-300 p-2 text-[10px] leading-snug">
                  {isEditing ? (
                    <textarea
                      value={hotel.description}
                      onChange={(e) =>
                        updateHotel(i, { description: e.target.value })
                      }
                      className="w-full p-1 bg-white border border-emerald-500/50 rounded resize-y min-h-[40px] text-[10px]"
                    />
                  ) : (
                    hotel.description
                  )}
                </td>
                <td className="border border-slate-300 p-2">
                  {isEditing ? (
                    <input
                      value={hotel.numberOfRooms}
                      onChange={(e) =>
                        updateHotel(i, { numberOfRooms: e.target.value })
                      }
                      className="w-full p-1 bg-white border border-emerald-500/50 rounded text-xs"
                    />
                  ) : (
                    hotel.numberOfRooms
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-slate-500 mt-2">
          Source: QWEN AI Market Research, {new Date().getFullYear()}
        </p>
      </div>
    </SlideContainer>
  );
}
