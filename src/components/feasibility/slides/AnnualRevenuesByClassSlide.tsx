"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { AnnualRevenuesData } from "@/types/feasibility";
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
  data: AnnualRevenuesData;
  country: string;
  city: string;
}

export default function AnnualRevenuesByClassSlide({ data, city }: Props) {
  const first = data.yearlyData[0];
  const last = data.yearlyData[data.yearlyData.length - 1];
  const lastTotal = last?.total ?? 1;
  const fiveShare = Math.round(((last?.fiveStar ?? 0) / lastTotal) * 100);
  const fourShare = Math.round(((last?.fourStar ?? 0) / lastTotal) * 100);

  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle="Annual revenues of hotels by class"
        className="mb-4"
      />

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
        <div className="min-h-0 overflow-hidden flex flex-col">
          <h3 className="text-xs font-semibold text-slate-700 mb-1 shrink-0">
            Annual revenues of {city} hotels by hotel class (AED 000)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.yearlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" fontSize={9} />
              <YAxis fontSize={9} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "9px" }} />
              <Bar dataKey="fiveStar" stackId="a" fill="#4c1d95" name="Five-star" />
              <Bar dataKey="fourStar" stackId="a" fill="#92400e" name="Four-star" />
              <Bar dataKey="threeStar" stackId="a" fill="#166534" name="Three-star" />
              <Bar dataKey="others" stackId="a" fill="#1e3a8a" name="Others" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1 text-[10px] shrink-0">
            <span className="text-emerald-600 font-semibold">
              Five-star CAGR: {data.cagrByClass.fiveStar}
            </span>
            <span className="text-emerald-600 font-semibold">
              Four-star CAGR: {data.cagrByClass.fourStar}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-center min-h-0 overflow-hidden">
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2 font-bold shrink-0">•</span>
              <span>
                The annual hotel revenue is the sum of lodging revenue and other
                revenue; other revenues include revenues from restaurants, night
                clubs, hotel shops, spas, etc.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2 font-bold shrink-0">•</span>
              <span>
                In {last?.year}, five and four-star hotels accounted for {fiveShare}%
                and {fourShare}% of the total hotel revenues
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2 font-bold shrink-0">•</span>
              <span>
                Between {first?.year} and {last?.year}, revenue growth of four and
                five-star hotels exceeded by far that of three-star hotels
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2 font-bold shrink-0">•</span>
              <span>
                This trend can be explained by the increasingly high room rates and
                the substantially larger quantity of available rooms in four and
                five-star hotels
              </span>
            </li>
          </ul>
        </div>
      </div>
    </SlideContainer>
  );
}
