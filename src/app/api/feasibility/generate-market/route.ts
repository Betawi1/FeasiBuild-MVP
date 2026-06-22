import { NextResponse } from "next/server";
import type {
  AggregatedProjectData,
  FeasibilityProjectBundle,
  FeasibilitySlide,
} from "@/types/feasibility";
import { resolveQualityMeta } from "@/lib/feasibility/build-ai-section-meta";
import { enrichStructuredSlideData } from "@/lib/feasibility/enrich-structured-slide-data";
import { enrichSlidesWithAi } from "@/lib/feasibility/enrich-slides-with-ai";
import {
  buildMacroCommentaryPrompt,
  type MacroCommentaryContext,
} from "@/lib/feasibility/generate-macro-commentary";
import { buildMarketResearchCache } from "@/lib/feasibility/generate-market-slides";
import { generateFullFeasibilitySlides } from "@/lib/feasibility/generate-full-report";
import { ensureTitleSlideFirst } from "@/lib/feasibility/generate-title-slide";

function normalizeMarketSlideTitle(title: string | undefined): string | undefined {
  if (!title) return title;
  if (title.includes("Hospitality market review")) {
    return "Industry / Market Analysis";
  }
  if (/Industry\s*\/?\s*Market Analysis\s*[-—]?\s*Hospitality/i.test(title)) {
    return "Industry / Market Analysis";
  }
  return title;
}

function buildQwenPrompt(bundle: FeasibilityProjectBundle): string {
  const { city, country } = bundle.location;
  return `
You are a senior real estate analyst. Generate a hotel feasibility study JSON for ${city}, ${country}.
Financial model: ${JSON.stringify(bundle)}.
CRITICAL: NO PLACEHOLDERS. Return ONLY { "slides": FeasibilitySlide[] } with sections executive, project, market, financial.

For the "Travel & Tourism Demand" slide (ID: hosp-demand), include a "data" object with:
- chartData: Array of { year: string, consumption: number, capitalInvestment: number, governmentExpenditure: number, nonVisitorExports: number } for the last 5 historical years and 1 projected year for ${country}.
- cagr: string (e.g., "13.4%")
- realGrowth: string (e.g., "5.0%")
- bulletPoints: Array of 4-5 professional bullet points analyzing T&T demand components for ${country} and ${city}.
Set title to "Industry / Market Analysis", subtitle to "Travel and Tourism demand", section to "market", paragraphs to [].

For the "Travel & Tourism Outlook" slide (ID: hosp-outlook), include a "data" object with:
- mainTakeaway: A single strong sentence summarizing the T&T outlook for ${country}.
- metrics: EXACTLY 6 objects with names: "GDP", "Employment", "Visitor Exports", "Personal T&T", "Capital Investment", "Government Expenditure".
  Each metric: { name, shortTermGrowth: number, shortTermDescription: string, longTermGrowth: number }.
Set title to "Industry / Market Analysis", subtitle to "Travel and Tourism outlook", section to "market", paragraphs to [].

For the "Historical Hotel Guests" slide (ID: hosp-guests), include a "data" object with:
- yearlyData: Array of { year: string, totalGuests: number (millions), guestNights: number (millions), avgLengthOfStay: number } for 6-7 years
- compositionByClass: Array of { year: string, fiveStar: number, fourStar: number, threeStar: number, others: number } (thousands)
- cagrGuests: string, cagrGuestNights: string
Set subtitle to "Historical figures of hotel guests in ${city}".

For the "Average Length of Stay" slide (ID: hosp-length-of-stay), include a "data" object with:
- byRegion: Array of { region: string, year2004: number, year2005: number, year2006: number, cagr: string }
- byHotelClass: Array of { hotelClass: string, year2004: number, year2005: number, year2006: number, cagr: string }
- overallAverage2006: number

For the "Annual Revenues by Class" slide (ID: hosp-revenues), include a "data" object with:
- yearlyData: Array of { year: string, fiveStar: number, fourStar: number, threeStar: number, others: number, total: number } (local currency thousands)
- cagrByClass: { fiveStar: string, fourStar: string, threeStar: string, others: string }

For "Competition Analysis — Benchmark Hotels" slide (ID: hosp-competition-1 ONLY, do NOT generate hosp-competition-2), include a "data" object with:
- benchmarkHotels: Array of 4-6 { name, rating, description, numberOfRooms } for comparable luxury hotels in ${city}
Do NOT generate a separate performance/charts slide.

Order hospitality slides: hosp-demand, hosp-outlook, hosp-arrivals-historical, hosp-arrivals-projected, adr-occupancy, hosp-revenues, hosp-supply, hosp-guests, hosp-length-of-stay, hosp-competition-1, hosp-summary, hosp-implications, hosp-success-factors, hosp-risk-factors. Do NOT generate hosp-projections.

Include an "ADR & Occupancy — Competitive Set" slide (ID: adr-occupancy) with:
- title: "Industry / Market Analysis", subtitle: "ADR & Occupancy — Competitive Set", section: "market"
- paragraphs: 2 strings comparing market ADR/occupancy vs subject stabilized ADR/occupancy for ${city}
- charts: two line charts — "Market ADR Index" and "Market Occupancy (%)" with 2019-2024E yearly data from realistic ${country} market research

For "Summary of Hospitality Market" (ID: hosp-summary), include a "data" object with:
- tourismOverview: 3 strings, guestProfile: 2 strings, historicalSupply: 2 strings, historicalDemand: 2 strings, growthPotential: 3 strings

For "Implications on Project" (ID: hosp-implications), include a "data" object with:
- hospitalityImplications: 8 { number, title, description }, keyTakeaways: 3 strings

For "Key Success Factors" (ID: hosp-success-factors), include a "data" object with:
- marketOpportunities: 3 { factor, effect }, projectStrengths: 4 { strength, effect }, mainOutcomes: 2 strings

For "Key Risk Factors" (ID: hosp-risk-factors), include a "data" object with:
- marketThreats: 3 { risk, effect, mitigatingFactors: string[3] }, projectWeaknesses: 4 { weakness, effect, mitigatingFactors: string[3] }

Ensure all data is realistic for ${country} and ${city}. DO NOT USE PLACEHOLDERS.
`;
}

async function tryQwenMarketSlides(
  prompt: string
): Promise<FeasibilitySlide[] | null> {
  const url = process.env.FEASIBILITY_AI_URL;
  const apiKey = process.env.FEASIBILITY_AI_API_KEY;
  if (!url || !apiKey) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.FEASIBILITY_AI_MODEL ?? "qwen-plus",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as { slides?: unknown };
    if (!Array.isArray(parsed.slides)) return null;
    return parsed.slides as FeasibilitySlide[];
  } catch {
    return null;
  }
}

function isValidBundle(data: unknown): data is FeasibilityProjectBundle {
  if (!data || typeof data !== "object") return false;
  const d = data as FeasibilityProjectBundle;
  return (
    d.component4 != null &&
    typeof d.component4.tdc === "number" &&
    d.aggregate != null
  );
}

function isValidAggregate(data: unknown): data is AggregatedProjectData {
  if (!data || typeof data !== "object") return false;
  const d = data as AggregatedProjectData;
  return (
    typeof d.tdc === "number" &&
    d.location != null &&
    typeof d.location.city === "string"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { projectData?: unknown };
    const { projectData } = body;

    let bundle: FeasibilityProjectBundle | null = null;
    if (isValidBundle(projectData)) {
      bundle = projectData;
    } else if (isValidAggregate(projectData)) {
      bundle = {
        location: projectData.location,
        assetType: projectData.assetType,
        segment: projectData.segment,
        currency: projectData.currency,
        component1: {
          rooms: projectData.keys,
          bua: projectData.bua,
          constructionPeriod: projectData.constructionPeriod,
          landCost: 0,
          constructionCost: 0,
          softCosts: 0,
          ffe: 0,
          powc: 0,
          buildingRate: 0,
          parkingRate: 0,
          basementRate: 0,
          buildingBUA: 0,
          parkingBUA: 0,
        },
        component2: {
          adrYear1: projectData.adrYear1,
          adrStabilized: projectData.adrYear3,
          occupancyYear1: projectData.occYear1,
          occupancyStabilized: projectData.occYear3,
          adrInflation: 4,
          operationalYears: 10,
        },
        component4: {
          tdc: projectData.tdc,
          gdv: projectData.gdv,
          projectIRR: projectData.projectIrr,
          equityIRR: projectData.equityIrr,
          equityMultiple: projectData.equityMultiple,
          paybackPeriod: projectData.paybackYears,
          monthlyCashFlow: [],
          approvedDebt: 0,
          drawdownType: "—",
          idcTreatment: "—",
          loanAtCompletion: 0,
          loanType: "—",
          interestRate: 0,
          totalTenor: "—",
          idcAmount: 0,
        },
        aggregate: projectData,
      };
    }

    if (!bundle) {
      return NextResponse.json(
        { error: "Invalid projectData payload" },
        { status: 400 }
      );
    }

    const qwenPrompt = buildQwenPrompt(bundle);

    const aiSlides = await tryQwenMarketSlides(qwenPrompt);
    let rawSlides = aiSlides ?? generateFullFeasibilitySlides(bundle);

    if (!aiSlides) {
      const macroCtx: MacroCommentaryContext = {
        city: bundle.location.city,
        country: bundle.location.country,
        assetType: `${bundle.aggregate.segment} ${bundle.aggregate.assetType}`,
        projectIRR: bundle.aggregate.projectIrr,
        constructionMonths: bundle.aggregate.constructionPeriod,
        currency: bundle.aggregate.currency,
      };
      const { city, country } = bundle.location;
      const assetType = `${bundle.aggregate.segment} ${bundle.aggregate.assetType}`;
      rawSlides = await enrichSlidesWithAi(rawSlides, [
        {
          slideId: "macro-1",
          buildPrompt: () =>
            buildMacroCommentaryPrompt(country, "GDP", macroCtx),
          quality: resolveQualityMeta("Macro - GDP", country, city),
          city,
          assetType,
        },
        {
          slideId: "macro-2",
          buildPrompt: () =>
            buildMacroCommentaryPrompt(country, "Inflation", macroCtx),
          quality: resolveQualityMeta("Macro - Inflation", country, city),
          city,
          assetType,
        },
        {
          slideId: "macro-3",
          buildPrompt: () =>
            buildMacroCommentaryPrompt(country, "Population", macroCtx),
          quality: resolveQualityMeta("Macro - Population", country, city),
          city,
          assetType,
        },
        {
          slideId: "macro-4",
          buildPrompt: () =>
            buildMacroCommentaryPrompt(country, "Macro Summary", macroCtx),
          quality: resolveQualityMeta("Macro - Macro Summary", country, city),
          city,
          assetType,
        },
      ]);
    }
    const slides = ensureTitleSlideFirst(
      bundle,
      enrichStructuredSlideData(
        rawSlides
        .filter((slide) => slide.id !== "hosp-projections")
        .map((slide) => {
          const title =
            normalizeMarketSlideTitle(slide.title) ?? slide.title ?? "Industry / Market Analysis";
          if (slide.id === "hosp-competition-1") {
            return {
              ...slide,
              title,
              subtitle: slide.subtitle?.startsWith("Competition analysis")
                ? slide.subtitle
                : `Competition analysis - ${slide.subtitle ?? "Benchmark hotels"}`,
            };
          }
          return title !== slide.title ? { ...slide, title } : slide;
        })
      )
    );
    const marketResearch = buildMarketResearchCache(bundle.aggregate);

    return NextResponse.json({
      slides,
      marketResearch,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
