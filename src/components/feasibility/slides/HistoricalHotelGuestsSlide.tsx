"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { HistoricalGuestsData } from "@/types/feasibility";
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

type HistoricalGuestsDataWithBullets = HistoricalGuestsData & {
  summaryBullets?: string[];
};

interface Props extends SlideEditingProps {
  data: HistoricalGuestsData;
  country: string;
  city: string;
}

export default function HistoricalHotelGuestsSlide({
  data,
  country,
  city,
  isEditing = false,
  onDataChange,
}: Props) {
  const extended = data as HistoricalGuestsDataWithBullets;
  const first = data.yearlyData[0];
  const last = data.yearlyData[data.yearlyData.length - 1];

  const defaultBullets = [
    `Hotel guests in ${city} increased from ${first?.totalGuests}M in ${first?.year} to ${last?.totalGuests}M in ${last?.year}; despite the increase, the average length of stay remained about ${last?.avgLengthOfStay} days`,
    `Between ${first?.year} and ${last?.year}, the total number of guests that stayed in five and four star hotels grew at a CAGR of ${data.cagrGuests}`,
    `In ${last?.year}, five and four star hotels hosted almost 60% of the total hotel guests in ${city}`,
  ];

  const displayBullets = extended.summaryBullets ?? defaultBullets;

  const updateBullet = (index: number, text: string) => {
    const bullets = [...displayBullets];
    bullets[index] = text;
    onDataChange?.({ ...data, summaryBullets: bullets } as HistoricalGuestsDataWithBullets);
  };

  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle={`Historical figures of hotel guests in ${city}`}
        className="mb-4"
      />

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-hidden">
        <div className="space-y-3 min-h-0 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0">
            <h3 className="text-xs font-semibold text-slate-700 mb-1">
              Number of hotel guests &amp; guest nights, {country}
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" fontSize={9} />
                <YAxis fontSize={9} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "9px" }} />
                <Bar dataKey="totalGuests" fill="#4c1d95" name="Total Guests (M)" />
                <Bar dataKey="guestNights" fill="#92400e" name="Guest Nights (M)" />
              </BarChart>
            </ResponsiveContainer>
            {isEditing ? (
              <div className="flex justify-center gap-2 mt-1 text-[10px]">
                <input
                  value={data.cagrGuests}
                  onChange={(e) =>
                    onDataChange?.({ ...data, cagrGuests: e.target.value })
                  }
                  className="p-1 border border-emerald-500/50 rounded text-emerald-600 font-semibold"
                  placeholder="CAGR Guests"
                />
                <input
                  value={data.cagrGuestNights}
                  onChange={(e) =>
                    onDataChange?.({ ...data, cagrGuestNights: e.target.value })
                  }
                  className="p-1 border border-emerald-500/50 rounded text-emerald-600 font-semibold"
                  placeholder="CAGR Guest Nights"
                />
              </div>
            ) : (
              <div className="flex justify-center gap-4 mt-1 text-[10px]">
                <span className="text-emerald-600 font-semibold">
                  CAGR Guests: {data.cagrGuests}
                </span>
                <span className="text-emerald-600 font-semibold">
                  CAGR Guest Nights: {data.cagrGuestNights}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0">
            <h3 className="text-xs font-semibold text-slate-700 mb-1">
              Composition by hotel class
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.compositionByClass}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" fontSize={9} />
                <YAxis fontSize={9} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "9px" }} />
                <Bar dataKey="fiveStar" stackId="a" fill="#4c1d95" name="5-Star" />
                <Bar dataKey="fourStar" stackId="a" fill="#92400e" name="4-Star" />
                <Bar dataKey="threeStar" stackId="a" fill="#166534" name="3-Star" />
                <Bar dataKey="others" stackId="a" fill="#1e3a8a" name="Others" />
              </BarChart>
            </ResponsiveContainer>
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
