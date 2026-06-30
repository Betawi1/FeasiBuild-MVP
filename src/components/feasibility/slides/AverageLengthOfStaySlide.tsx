"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { LengthOfStayData } from "@/types/feasibility";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type LengthOfStayDataWithBullets = LengthOfStayData & {
  summaryBullets?: string[];
};

interface Props extends SlideEditingProps {
  data: LengthOfStayData;
  country: string;
  city: string;
}

export default function AverageLengthOfStaySlide({
  data,
  country,
  city,
  isEditing = false,
  onDataChange,
}: Props) {
  const extended = data as LengthOfStayDataWithBullets;
  const europe = data.byRegion.find((r) => r.region === "Europe");
  const africa = data.byRegion.find((r) => r.region === "Africa");
  const fiveStar = data.byHotelClass.find((c) => c.hotelClass === "Five-star");
  const fourStar = data.byHotelClass.find((c) => c.hotelClass === "Four-star");

  const defaultBullets = [
    `The average length of stay in all ${city} hotels was ${data.overallAverage2006} days in the latest observation year`,
    `European and African guests stayed the longest in ${city} hotels with an average of ${europe?.year2006} and ${africa?.year2006} days, respectively`,
    `The average length of stay in five-star hotels grew from ${fiveStar?.year2004} days to ${fiveStar?.year2006} days over the observation period`,
    `Four-star hotels witnessed a decline in average length of stay from ${fourStar?.year2004} days to ${fourStar?.year2006} days, a change of ${fourStar?.cagr} (CAGR)`,
  ];

  const displayBullets = extended.summaryBullets ?? defaultBullets;

  const updateBullet = (index: number, text: string) => {
    const bullets = [...displayBullets];
    bullets[index] = text;
    onDataChange?.({
      ...data,
      summaryBullets: bullets,
    } as LengthOfStayDataWithBullets);
  };

  const updateHotelClassCagr = (index: number, cagr: string) => {
    onDataChange?.({
      ...data,
      byHotelClass: data.byHotelClass.map((item, i) =>
        i === index ? { ...item, cagr } : item
      ),
    });
  };

  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle="Average length of stay in hotels by region and by hotel class"
        className="mb-4"
      />

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
        <div className="space-y-3 min-h-0 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0">
            <h3 className="text-xs font-semibold text-slate-700 mb-1">
              Average length of stay by region, {country}
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.byRegion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" fontSize={9} />
                <YAxis fontSize={9} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "9px" }} />
                <Bar dataKey="year2004" fill="#4c1d95" name="Year 1" />
                <Bar dataKey="year2005" fill="#92400e" name="Year 2" />
                <Bar dataKey="year2006" fill="#166534" name="Year 3" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 min-h-0">
            <h3 className="text-xs font-semibold text-slate-700 mb-1">
              Average length of stay by hotel class
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.byHotelClass}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hotelClass" fontSize={9} />
                <YAxis fontSize={9} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "9px" }} />
                <Bar dataKey="year2004" fill="#4c1d95" name="Year 1" />
                <Bar dataKey="year2005" fill="#92400e" name="Year 2" />
                <Bar dataKey="year2006" fill="#166534" name="Year 3" />
              </BarChart>
            </ResponsiveContainer>
            {isEditing ? (
              <div className="flex flex-wrap justify-center gap-2 mt-1 text-[10px]">
                {data.byHotelClass.map((item, i) => (
                  <input
                    key={i}
                    value={`${item.hotelClass}: ${item.cagr}`}
                    onChange={(e) => {
                      const colon = e.target.value.indexOf(":");
                      const cagr =
                        colon >= 0
                          ? e.target.value.slice(colon + 1).trim()
                          : e.target.value;
                      updateHotelClassCagr(i, cagr);
                    }}
                    className="p-1 border border-emerald-500/50 rounded text-emerald-600 font-semibold min-w-[120px]"
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-2 mt-1 text-[10px]">
                {data.byHotelClass.map((item, i) => (
                  <span key={i} className="text-emerald-600 font-semibold">
                    {item.hotelClass}: {item.cagr}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center min-h-0 overflow-hidden">
          <ul className="space-y-2 text-sm text-slate-700">
            {displayBullets.map((bullet, i) => (
              <li key={i} className="flex items-start">
                <span className="text-emerald-500 mr-2 font-bold shrink-0">•</span>
                <EditableTextBlock
                  text={bullet}
                  isEditing={isEditing}
                  onChange={(text) => updateBullet(i, text)}
                  className="leading-snug flex-1"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SlideContainer>
  );
}
