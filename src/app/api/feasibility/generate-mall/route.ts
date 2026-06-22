import { NextResponse } from "next/server";
import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { buildMarketResearchCache } from "@/lib/feasibility/generate-market-slides";
import { ensureTitleSlideFirst } from "@/lib/feasibility/generate-title-slide";
import { generateShoppingMallSlides } from "@/lib/feasibility/generate-shopping-mall-report";
import { resolveQualityMeta } from "@/lib/feasibility/build-ai-section-meta";
import { enrichStructuredSlideData } from "@/lib/feasibility/enrich-structured-slide-data";
import { enrichSlidesWithAi } from "@/lib/feasibility/enrich-slides-with-ai";
import { getMallContext } from "@/lib/feasibility/mall-context";
import {
  buildMallCommentaryPrompt,
  type MallCommentarySection,
} from "@/lib/feasibility/generate-mall-commentary";

const AI_SECTIONS: Array<{ slideId: string; section: MallCommentarySection }> = [
  { slideId: "exec-1", section: "Executive Summary" },
  { slideId: "mall-project-overview", section: "Project Overview" },
  { slideId: "macro-1", section: "Macro - GDP" },
  { slideId: "macro-2", section: "Macro - Inflation" },
  { slideId: "macro-3", section: "Macro - Population" },
  { slideId: "macro-4", section: "Macro - Macro Summary" },
  { slideId: "mall-market-overview", section: "Market - Retail Market Overview & Demand Drivers" },
  { slideId: "mall-market-metrics", section: "Market - Historical & Projected Market Metrics" },
  { slideId: "mall-supply-pipeline", section: "Market - Current & Projected Supply Pipeline" },
  { slideId: "mall-competitive-landscape", section: "Market - Competitive Landscape & Benchmarking" },
  { slideId: "mall-tenant-profile", section: "Market - Target Tenant & Catchment Profile" },
  { slideId: "mall-market-summary", section: "Market - Market Summary & Project Implications" },
  { slideId: "mall-implications", section: "Market Implications" },
  { slideId: "mall-success-factors", section: "Success Factors" },
  { slideId: "mall-risk-factors", section: "Risk Factors" },
  { slideId: "mall-dev-assumptions", section: "Development Assumptions" },
  { slideId: "mall-operational-revenues", section: "Operational Revenues" },
  { slideId: "mall-operational-expenses", section: "Operational Expenses" },
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

async function enrichMallSlidesWithAi(
  slides: FeasibilitySlide[],
  bundle: FeasibilityProjectBundle
): Promise<FeasibilitySlide[]> {
  const ctx = getMallContext(bundle);
  return enrichSlidesWithAi(
    slides,
    AI_SECTIONS.map(({ slideId, section }) => ({
      slideId,
      buildPrompt: () => buildMallCommentaryPrompt(section, bundle),
      quality: resolveQualityMeta(section, ctx.country, ctx.city),
      city: ctx.city,
      assetType: `Shopping Mall (${ctx.mallType})`,
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

    const baseSlides = generateShoppingMallSlides(projectData);
    const slides = ensureTitleSlideFirst(
      projectData,
      enrichStructuredSlideData(
        await enrichMallSlidesWithAi(baseSlides, projectData)
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
