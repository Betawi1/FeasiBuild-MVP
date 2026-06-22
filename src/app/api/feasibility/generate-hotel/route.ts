import { NextResponse } from "next/server";
import {
  buildMarketResearchCache,
  generateMarketSlides,
} from "@/lib/feasibility/generate-market-slides";
import type { AggregatedProjectData } from "@/types/feasibility";
import type { HotelFeasibilityProjectData } from "@/lib/feasibility/hotel-feasibility-types";

function hotelToAggregated(h: HotelFeasibilityProjectData): AggregatedProjectData {
  return {
    location: { city: h.city, country: h.country },
    assetType: h.assetType,
    segment: h.hotelOperatingType,
    positioning: h.starRating ? `${h.starRating}-star` : "upper-upscale",
    keys: h.rooms,
    bua: h.totalBUA,
    constructionPeriod: h.constructionMonths,
    currency: h.currency,
    starRating: h.starRating,
    adrYear1: h.year1Adr,
    occYear1: h.year1OccupancyPct,
    adrYear3: h.year3Adr,
    occYear3: h.year3OccupancyPct,
    tdc: h.tdc,
    gdv: h.gdv,
    projectIrr: h.projectIRR,
    equityIrr: h.equityIRR,
    equityMultiple: h.equityMultiple,
    paybackYears: h.paybackYears,
    netProfitMargin: h.netProfitMargin,
    revenueByYear: h.revenueByYear,
    ebitdaByYear: h.ebitdaByYear,
    netIncomeByYear: h.netIncomeByYear,
  };
}

function isValidHotelPayload(data: unknown): data is HotelFeasibilityProjectData {
  if (!data || typeof data !== "object") return false;
  const d = data as HotelFeasibilityProjectData;
  return typeof d.tdc === "number" && typeof d.location === "string";
}

/** Legacy alias — prefer `/api/feasibility/generate-market`. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectData?: HotelFeasibilityProjectData | AggregatedProjectData;
    };

    const projectData =
      body.projectData &&
      "location" in body.projectData &&
      typeof body.projectData.location === "object"
        ? (body.projectData as AggregatedProjectData)
        : isValidHotelPayload(body.projectData)
          ? hotelToAggregated(body.projectData)
          : null;

    if (!projectData) {
      return NextResponse.json({ error: "Invalid projectData" }, { status: 400 });
    }

    const slides = generateMarketSlides(projectData);
    return NextResponse.json({
      slides,
      marketResearch: buildMarketResearchCache(projectData),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
