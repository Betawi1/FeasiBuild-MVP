"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { CompetitionData } from "@/types/feasibility";

interface Props {
  data: CompetitionData;
  city: string;
}

function isLuxuryCity(city: string): boolean {
  const c = city.toLowerCase();
  return c.includes("dubai") || c.includes("abu dhabi");
}

export default function CompetitionAnalysisSlide({ data, city }: Props) {
  const tier = isLuxuryCity(city) ? "luxury" : "comparable";

  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle={`Competition analysis - Benchmark ${tier} hotels`}
        className="mb-4"
      />
      <p className="text-sm text-emerald-600 mb-4 leading-relaxed shrink-0">
        In order to benchmark the facilities and performance of the hotel
        component of the Project, the following hotels were chosen as a sample
        of comparable {tier} hotels in {city}
      </p>

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
                  {hotel.name}
                </td>
                <td className="border border-slate-300 p-2">{hotel.rating}</td>
                <td className="border border-slate-300 p-2 text-[10px] leading-snug">
                  {hotel.description}
                </td>
                <td className="border border-slate-300 p-2">{hotel.numberOfRooms}</td>
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
