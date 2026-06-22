"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { ImplicationsData } from "@/types/feasibility";

interface Props {
  data: ImplicationsData;
  city: string;
  subtitle?: string;
}

export default function ImplicationsOnProjectSlide({
  data,
  subtitle = "Market Analysis",
}: Props) {
  return (
    <SlideContainer>
      <SlideHeader
        title="Implications of the market findings on the Project"
        subtitle={subtitle}
        className="mb-4"
      />

      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0 overflow-hidden">
        <div className="col-span-2 bg-slate-100 p-3 rounded-lg min-h-0 overflow-hidden">
          <h3 className="text-xs font-bold mb-2 text-center bg-slate-800 text-white p-1.5 rounded">
            {subtitle}
          </h3>
          <ol className="space-y-1.5 text-sm text-slate-700">
            {data.hospitalityImplications.map((item, i) => (
              <li key={i} className="flex items-start">
                <span className="font-bold text-slate-800 mr-2 shrink-0">
                  {item.number}.
                </span>
                <span className="leading-snug">
                  <strong className="text-slate-800">{item.title}:</strong>{" "}
                  {item.description}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col justify-center min-h-0">
          <div className="bg-emerald-50 border-2 border-emerald-500 p-3 rounded-lg">
            <ul className="space-y-2 text-sm text-emerald-800">
              {data.keyTakeaways.map((takeaway, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-emerald-500 mr-2 font-bold shrink-0">✓</span>
                  <span className="leading-snug">{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}
