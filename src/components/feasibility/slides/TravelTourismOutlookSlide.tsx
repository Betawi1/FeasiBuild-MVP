"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { TravelTourismOutlookData } from "@/types/feasibility";
import { ArrowDown, ArrowUp } from "lucide-react";

interface Props {
  data: TravelTourismOutlookData;
  country: string;
}

export default function TravelTourismOutlookSlide({ data, country }: Props) {
  return (
    <SlideContainer>
      <SlideHeader
        title="Industry / Market Analysis"
        subtitle="Travel and Tourism outlook"
        className="mb-4"
      />
      <p className="text-sm text-emerald-600 font-semibold mb-4 leading-relaxed shrink-0">
        {data.mainTakeaway}
      </p>

      <div className="flex-1 grid grid-cols-6 gap-2 min-h-0 overflow-hidden">
        {data.metrics.map((metric, i) => {
          const isPositive = metric.shortTermGrowth >= 0;
          return (
            <div
              key={i}
              className="bg-[#001f54] text-white rounded-lg p-2 flex flex-col justify-between min-h-0 overflow-hidden"
            >
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-center mb-2 text-blue-200 leading-tight">
                  {metric.name}
                </h4>
                <div className="flex flex-col items-center mb-2">
                  {isPositive ? (
                    <ArrowUp className="w-5 h-5 text-emerald-400 mb-0.5" />
                  ) : (
                    <ArrowDown className="w-5 h-5 text-red-400 mb-0.5" />
                  )}
                  <span
                    className={`text-lg font-bold ${
                      isPositive ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {metric.shortTermGrowth}%
                  </span>
                </div>
                <p className="text-[9px] text-blue-100 text-center leading-tight min-h-[36px]">
                  {metric.shortTermDescription}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-blue-800 text-center shrink-0">
                <p className="text-[9px] text-blue-300 mb-0.5">Outlook (10-yr CAGR)</p>
                <p className="text-base font-bold text-white">{metric.longTermGrowth}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </SlideContainer>
  );
}
