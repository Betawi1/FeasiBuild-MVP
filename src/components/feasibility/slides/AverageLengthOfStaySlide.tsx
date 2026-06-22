"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
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

interface Props {
  data: LengthOfStayData;
  country: string;
  city: string;
}

export default function AverageLengthOfStaySlide({ data, country, city }: Props) {
  const europe = data.byRegion.find((r) => r.region === "Europe");
  const africa = data.byRegion.find((r) => r.region === "Africa");
  const fiveStar = data.byHotelClass.find((c) => c.hotelClass === "Five-star");
  const fourStar = data.byHotelClass.find((c) => c.hotelClass === "Four-star");

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
            <div className="flex flex-wrap justify-center gap-2 mt-1 text-[10px]">
              {data.byHotelClass.map((item, i) => (
                <span key={i} className="text-emerald-600 font-semibold">
                  {item.hotelClass}: {item.cagr}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center min-h-0 overflow-hidden">
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2 font-bold shrink-0">•</span>
              <span>
                The average length of stay in all {city} hotels was{" "}
                {data.overallAverage2006} days in the latest observation year
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2 font-bold shrink-0">•</span>
              <span>
                European and African guests stayed the longest in {city} hotels
                with an average of {europe?.year2006} and {africa?.year2006} days,
                respectively
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2 font-bold shrink-0">•</span>
              <span>
                The average length of stay in five-star hotels grew from{" "}
                {fiveStar?.year2004} days to {fiveStar?.year2006} days over the
                observation period
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2 font-bold shrink-0">•</span>
              <span>
                Four-star hotels witnessed a decline in average length of stay from{" "}
                {fourStar?.year2004} days to {fourStar?.year2006} days, a change of{" "}
                {fourStar?.cagr} (CAGR)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </SlideContainer>
  );
}
