"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import type { TitleSlideData } from "@/types/feasibility";

interface Props {
  data: TitleSlideData;
}

export default function TitleSlide({ data }: Props) {
  const fullTitle = data.isSaleStream
    ? `Financial Feasibility Study for the Development of a ${data.saleAssetLabel || data.assetType} in ${data.city}, ${data.country}`
    : data.benchmarkTitleLabel
      ? `Financial Feasibility Study for the Development of a ${data.benchmarkTitleLabel} in ${data.city}, ${data.country}`
    : data.isResidentialBTR
    ? `Financial Feasibility Study for the Development of a ${data.btrGradeLabel || "Grade B"} Residential ${data.btrSegmentLabel || "High-Rise"} BTR Tower in ${data.city}, ${data.country}`
    : data.isOfficeMixedUse
    ? `Financial Feasibility Study for the Development of a Prime Office & Retail Tower in ${data.city}, ${data.country}`
    : data.isShoppingMall
      ? `Financial Feasibility Study for the Development of a ${data.mallTypeLabel || "Regional"} Shopping Mall in ${data.city}, ${data.country}`
      : `Financial Feasibility Study for the Development of a ${data.starRating} ${data.segment} ${data.assetType} in ${data.city}, ${data.country}`;

  return (
    <SlideContainer className="[&>div]:p-0">
      <div className="relative w-full h-full flex flex-col justify-center items-center text-center px-12 py-12">
        <h1 className="text-4xl font-bold text-slate-900 leading-tight mb-8">
          {fullTitle}
        </h1>

        <div className="w-32 h-1 bg-blue-600 mb-8" />

        <div className="space-y-2">
          <p className="text-xl text-slate-600 font-medium">
            Prepared by FeasiBuild AI
          </p>
          <p className="text-lg text-slate-500">{new Date().getFullYear()}</p>
        </div>

        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-xs text-slate-400 italic">
            Confidential & Proprietary — For Internal Use Only
          </p>
        </div>
      </div>
    </SlideContainer>
  );
}
