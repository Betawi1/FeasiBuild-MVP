import { NextResponse } from "next/server";
import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { buildMarketResearchCache } from "@/lib/feasibility/generate-market-slides";
import { ensureTitleSlideFirst } from "@/lib/feasibility/generate-title-slide";
import { generateBTRSlides } from "@/lib/feasibility/generate-btr-report";
import { resolveQualityMeta } from "@/lib/feasibility/build-ai-section-meta";
import { enrichStructuredSlideData } from "@/lib/feasibility/enrich-structured-slide-data";
import { enrichSlidesWithAi } from "@/lib/feasibility/enrich-slides-with-ai";
import { getBTRContext } from "@/lib/feasibility/btr-context";
import {
  buildBTRCommentaryPrompt,
  type BTRCommentarySection,
} from "@/lib/feasibility/generate-btr-commentary";

const AI_SECTIONS: Array<{ slideId: string; section: BTRCommentarySection }> = [
  { slideId: "exec-1", section: "Executive Summary" },
  { slideId: "btr-project-overview", section: "Project Overview" },
  { slideId: "macro-1", section: "Macro - GDP" },
  { slideId: "macro-2", section: "Macro - Inflation" },
  { slideId: "macro-3", section: "Macro - Population" },
  { slideId: "macro-4", section: "Macro - Macro Summary" },
  {
    slideId: "btr-market-overview",
    section: "Market - Residential Rental Market Overview & Demand Drivers",
  },
  {
    slideId: "btr-market-metrics",
    section: "Market - Historical & Projected Market Metrics (Rents, Vacancy, Yields)",
  },
  {
    slideId: "btr-supply-pipeline",
    section: "Market - Current & Projected Supply Pipeline",
  },
  {
    slideId: "btr-competitive-landscape",
    section: "Market - Competitive Landscape & Benchmarking",
  },
  {
    slideId: "btr-tenant-profile",
    section: "Market - Target Tenant & Catchment Profile",
  },
  {
    slideId: "btr-market-summary",
    section: "Market - Market Summary & Project Implications",
  },
  { slideId: "btr-implications", section: "Market Implications" },
  { slideId: "btr-success-factors", section: "Success Factors" },
  { slideId: "btr-risk-factors", section: "Risk Factors" },
  { slideId: "btr-dev-assumptions", section: "Development Assumptions" },
  { slideId: "btr-operational-revenues", section: "Operational Revenues" },
  { slideId: "btr-operational-expenses", section: "Operational Expenses" },
];

function isValidBundle(data: unknown): data is FeasibilityProjectBundle {
  if (!data || typeof data !== "object") return false;
  const d = data as FeasibilityProjectBundle;
  return (
    d.component4 != null &&
    typeof d.component4.tdc === "number" &&
    d.aggregate != null
  );
}

async function enrichBTRSlidesWithAi(
  slides: FeasibilitySlide[],
  bundle: FeasibilityProjectBundle
): Promise<FeasibilitySlide[]> {
  const ctx = getBTRContext(bundle);
  return enrichSlidesWithAi(
    slides,
    AI_SECTIONS.map(({ slideId, section }) => ({
      slideId,
      buildPrompt: () => buildBTRCommentaryPrompt(section, bundle),
      quality: resolveQualityMeta(section, ctx.country, ctx.city),
      city: ctx.city,
      assetType: "Residential High-Rise BTR (Grade B)",
    }))
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { projectData?: unknown };
    const { projectData } = body;

    if (!isValidBundle(projectData)) {
      return NextResponse.json(
        { error: "Invalid projectData payload" },
        { status: 400 }
      );
    }

    const baseSlides = generateBTRSlides(projectData);
    const slides = ensureTitleSlideFirst(
      projectData,
      enrichStructuredSlideData(
        await enrichBTRSlidesWithAi(baseSlides, projectData)
      )
    );
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
