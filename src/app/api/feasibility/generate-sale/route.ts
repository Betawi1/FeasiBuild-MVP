import { NextResponse } from "next/server";
import type { FeasibilitySlide } from "@/types/feasibility";
import type { SaleFeasibilityBundle } from "@/types/feasibility";
import { buildMarketResearchCache } from "@/lib/feasibility/generate-market-slides";
import { ensureTitleSlideFirst } from "@/lib/feasibility/generate-title-slide";
import { generateSaleSlides } from "@/lib/feasibility/sale/generate-sale-report";
import { resolveQualityMeta } from "@/lib/feasibility/build-ai-section-meta";
import { enrichStructuredSlideData } from "@/lib/feasibility/enrich-structured-slide-data";
import { enrichSlidesWithAi } from "@/lib/feasibility/enrich-slides-with-ai";
import {
  buildSaleCommentaryPrompt,
  type SaleCommentarySection,
} from "@/lib/feasibility/sale/generate-sale-commentary";
import { enrichSaleMarketCharts } from "@/lib/feasibility/sale/generate-sale-market-charts";
import { getSaleStreamConfig } from "@/lib/feasibility/sale/sale-stream-config";

const AI_SECTIONS: Array<{ slideId: string; section: SaleCommentarySection }> = [
  { slideId: "macro-1", section: "Macro - GDP" },
  { slideId: "macro-2", section: "Macro - Inflation" },
  { slideId: "macro-3", section: "Macro - Population" },
  { slideId: "macro-4", section: "Macro - Macro Summary" },
  { slideId: "sale-market-overview", section: "Market - overview" },
  { slideId: "sale-market-supplyDemand", section: "Market - supplyDemand" },
  { slideId: "sale-market-pricing", section: "Market - pricing" },
  { slideId: "sale-market-velocity", section: "Market - velocity" },
  { slideId: "sale-market-competition", section: "Market - competition" },
  { slideId: "sale-market-summary", section: "Market Summary" },
  { slideId: "sale-implications", section: "Market Implications" },
  { slideId: "sale-success-factors", section: "Success Factors" },
  { slideId: "sale-risk-factors", section: "Risk Factors" },
  { slideId: "sale-sales-uptake-chart", section: "Sales Assumptions" },
  { slideId: "sale-rcf", section: "Revolving Credit Facility" },
];

function isValidSaleBundle(data: unknown): data is SaleFeasibilityBundle {
  if (!data || typeof data !== "object") return false;
  const d = data as SaleFeasibilityBundle;
  return d.stream === "sale" && d.component4 != null && typeof d.component4.tdc === "number";
}

async function enrichSaleSlidesWithAi(
  slides: FeasibilitySlide[],
  bundle: SaleFeasibilityBundle
): Promise<FeasibilitySlide[]> {
  const config = getSaleStreamConfig(bundle.buildingSubType);
  const { city, country } = bundle.location;
  return enrichSlidesWithAi(
    slides,
    AI_SECTIONS.map(({ slideId, section }) => ({
      slideId,
      buildPrompt: () => buildSaleCommentaryPrompt(section, bundle, config),
      quality: resolveQualityMeta(section, country, city),
      city,
      assetType: config.assetLabel,
    }))
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { projectData?: unknown };
    const { projectData } = body;

    if (!isValidSaleBundle(projectData)) {
      return NextResponse.json(
        { error: "Invalid sale projectData payload" },
        { status: 400 }
      );
    }

    const config = getSaleStreamConfig(projectData.buildingSubType);
    const baseSlides = generateSaleSlides(projectData);
    const withCommentary = await enrichSaleSlidesWithAi(baseSlides, projectData);
    const withCharts = await enrichSaleMarketCharts(
      withCommentary,
      projectData,
      config.assetLabel
    );
    const withStructured = enrichStructuredSlideData(withCharts);
    const slides = ensureTitleSlideFirst(projectData, withStructured);
    const marketResearch = buildMarketResearchCache(projectData.aggregate);

    return NextResponse.json({
      slides,
      marketResearch,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
