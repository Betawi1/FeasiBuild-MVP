import { NextResponse } from "next/server";
import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { buildMarketResearchCache } from "@/lib/feasibility/generate-market-slides";
import { ensureTitleSlideFirst } from "@/lib/feasibility/generate-title-slide";
import { generateOfficeSlides } from "@/lib/feasibility/generate-office-report";
import { resolveQualityMeta } from "@/lib/feasibility/build-ai-section-meta";
import { enrichStructuredSlideData } from "@/lib/feasibility/enrich-structured-slide-data";
import { enrichSlidesWithAi } from "@/lib/feasibility/enrich-slides-with-ai";
import { getOfficeContext } from "@/lib/feasibility/office-context";
import {
  buildOfficeCommentaryPrompt,
  type OfficeCommentarySection,
} from "@/lib/feasibility/generate-office-commentary";

const AI_SECTIONS: Array<{ slideId: string; section: OfficeCommentarySection }> = [
  { slideId: "exec-1", section: "Executive Summary" },
  { slideId: "office-project-overview", section: "Project Overview" },
  { slideId: "macro-1", section: "Macro - GDP" },
  { slideId: "macro-2", section: "Macro - Inflation" },
  { slideId: "macro-3", section: "Macro - Population" },
  { slideId: "macro-4", section: "Macro - Macro Summary" },
  { slideId: "office-market-overview", section: "Market - Office & Retail Market Overview & Demand Drivers" },
  { slideId: "office-market-metrics", section: "Market - Historical & Projected Market Metrics (Rents, Vacancy, Yields)" },
  { slideId: "office-supply-pipeline", section: "Market - Current & Projected Supply Pipeline" },
  { slideId: "office-competitive-landscape", section: "Market - Competitive Landscape & Benchmarking" },
  { slideId: "office-tenant-profile", section: "Market - Target Tenant & Catchment Profile" },
  { slideId: "office-market-summary", section: "Market - Market Summary & Project Implications" },
  { slideId: "office-implications", section: "Market Implications" },
  { slideId: "office-success-factors", section: "Success Factors" },
  { slideId: "office-risk-factors", section: "Risk Factors" },
  { slideId: "office-dev-assumptions", section: "Development Assumptions" },
  { slideId: "office-operational-revenues", section: "Operational Revenues" },
  { slideId: "office-operational-expenses", section: "Operational Expenses" },
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

async function enrichOfficeSlidesWithAi(
  slides: FeasibilitySlide[],
  bundle: FeasibilityProjectBundle
): Promise<FeasibilitySlide[]> {
  const ctx = getOfficeContext(bundle);
  return enrichSlidesWithAi(
    slides,
    AI_SECTIONS.map(({ slideId, section }) => ({
      slideId,
      buildPrompt: () => buildOfficeCommentaryPrompt(section, bundle),
      quality: resolveQualityMeta(section, ctx.country, ctx.city),
      city: ctx.city,
      assetType: "Prime Office + Retail Mixed-Use Tower",
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

    const baseSlides = generateOfficeSlides(projectData);
    const slides = ensureTitleSlideFirst(
      projectData,
      enrichStructuredSlideData(
        await enrichOfficeSlidesWithAi(baseSlides, projectData)
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
