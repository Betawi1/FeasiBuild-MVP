import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { generateFullFeasibilitySlides } from "@/lib/feasibility/generate-full-report";
import {
  buildMacroCommentaryPrompt,
  type MacroCommentaryContext,
} from "@/lib/feasibility/generate-macro-commentary";
import {
  buildOperationalBundleHashes,
  buildOperationalCommentaryCacheKey,
} from "@/lib/slide-dependencies";
import {
  enrichOperationalSlidesWithCache,
  type OperationalSlideCacheOptions,
  type OperationalSlideCacheResult,
} from "@/lib/feasibility/operational-slide-cache";

export type HotelCommentarySection =
  | "Macro - GDP"
  | "Macro - Inflation"
  | "Macro - Population"
  | "Macro - Macro Summary"
  | "Market - Travel Tourism Demand"
  | "Market - Travel Tourism Outlook"
  | "Market - Historical Arrivals"
  | "Market - Projected Arrivals"
  | "Market - ADR Occupancy"
  | "Market - Annual Revenues"
  | "Market - Supply Pipeline"
  | "Market - Historical Guests"
  | "Market - Length of Stay"
  | "Market - Competition"
  | "Market - Hospitality Summary"
  | "Market - Implications"
  | "Market - Success Factors"
  | "Market - Risk Factors";

const MACRO_SECTION_MAP: Record<
  Extract<
    HotelCommentarySection,
    | "Macro - GDP"
    | "Macro - Inflation"
    | "Macro - Population"
    | "Macro - Macro Summary"
  >,
  "GDP" | "Inflation" | "Population" | "Macro Summary"
> = {
  "Macro - GDP": "GDP",
  "Macro - Inflation": "Inflation",
  "Macro - Population": "Population",
  "Macro - Macro Summary": "Macro Summary",
};

const HOTEL_ANTI_PLACEHOLDER = `
CRITICAL REQUIREMENTS — READ CAREFULLY:
1. DO NOT use phrases like "Charts and visualizations are included in the interactive version"
2. DO NOT use generic statements — be SPECIFIC to the city, country, and sub-market
3. MUST include actual numbers, percentages, and market metrics
4. MUST reference real hotels or developments in the city and sub-market
5. Generate 5-6 detailed bullet points with location-specific facts
6. NO placeholder text, TBD, or template language
7. DO NOT wrap bullet points in quotation marks — write plain text only
8. ALWAYS reference the specific sub-market when discussing location, competition, or market dynamics
9. DO NOT include thinking process, analysis steps, or prompt instructions in output
10. For risk and success factors, provide DETAILED analysis — never generic labels like "Market threat"
`.trim();

export const HOTEL_WTDC_STRICT_CONSTRAINT = `
CRITICAL: DO NOT use generic WTDC or STR template phrases such as:
- "Travel & Tourism Demand in [Country] reached approximately..."
- "Capital investment into hospitality... remains a primary growth driver"
- "Government expenditure on destination promotion..."
- "Non-visitor exports... add diversification"
- "positioned for above-GDP growth over the next decade"

INSTEAD, generate UNIQUE content specific to the city's hotel market — mention specific districts (e.g. Business Bay, DIFC, DWTC for Dubai), named competitor hotels, and local economic initiatives (e.g. Dubai D33 Agenda).
`.trim();

function formatToken(value: string): string {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** e.g. "5-Star Business Hotel" from BENCHMARK star rating + operating type */
export function buildHotelBenchmarkTitleLabel(
  starRating: string | undefined,
  businessType: string | undefined
): string {
  const starNum = (starRating ?? "5").replace(/[^\d.]/g, "").trim() || "5";
  const business = formatToken(businessType?.replace(/_/g, " ") || "Business");
  return `${starNum}-Star ${business} Hotel`;
}

function hotelContext(bundle: FeasibilityProjectBundle) {
  const agg = bundle.aggregate;
  const { city, country } = bundle.location;
  const subMarket =
    bundle.location.subMarket?.trim() ||
    agg.location.subMarket?.trim() ||
    city;
  const starRating = agg.starRating?.trim() || agg.positioning?.trim() || "5-Star";
  const businessType = agg.segment?.trim() || "Business";
  const assetType = agg.assetType || "Hotel";
  const landCost = bundle.component1.landCost || 0;
  const bua = bundle.component1.bua || agg.bua || 0;
  const landRatePsf =
    bua > 0 && landCost > 0 ? Math.round(landCost / bua) : undefined;

  return {
    city,
    country,
    subMarket,
    landRatePsf,
    starRating,
    businessType,
    assetType,
    keys: agg.keys,
    bua: agg.bua,
    currency: bundle.currency,
    adrYear1: bundle.component2.adrYear1,
    adrYear3: bundle.component2.adrStabilized,
    occYear1: bundle.component2.occupancyYear1,
    occYear3: bundle.component2.occupancyStabilized,
    tdc: agg.tdc,
    gdv: agg.gdv,
    projectIrr: agg.projectIrr,
    constructionMonths: agg.constructionPeriod,
  };
}

/** Build Puter prompt for hotel market / macro commentary sections. */
export function buildHotelCommentaryPrompt(
  section: HotelCommentarySection,
  bundle: FeasibilityProjectBundle
): string {
  const ctx = hotelContext(bundle);
  const {
    city,
    country,
    subMarket,
    landRatePsf,
    starRating,
    businessType,
    assetType,
    keys,
    currency,
    adrYear1,
    adrYear3,
    occYear1,
    occYear3,
    tdc,
    gdv,
    projectIrr,
  } = ctx;

  const landRateLabel =
    landRatePsf != null
      ? `${currency} ${landRatePsf.toLocaleString()} per sqft (based on allowable GFA)`
      : "market rate";

  const macroSection = MACRO_SECTION_MAP[section as keyof typeof MACRO_SECTION_MAP];
  if (macroSection) {
    const macroCtx: MacroCommentaryContext = {
      city,
      country,
      subMarket,
      assetType: `${businessType} ${assetType}`,
      projectIRR: projectIrr,
      constructionMonths: ctx.constructionMonths,
      currency,
    };
    return buildMacroCommentaryPrompt(country, macroSection, macroCtx);
  }

  const projectBlock = `
PROJECT CONTEXT:
- Asset: ${starRating} ${businessType} ${assetType}
- Location: ${city}, ${country}
- Sub-Market: ${subMarket}
- Land Rate: ${landRateLabel}
- Keys: ${keys.toLocaleString()}
- ADR (Y1 / Stabilized): ${currency} ${adrYear1} / ${currency} ${adrYear3}
- Occupancy (Y1 / Stabilized): ${occYear1}% / ${occYear3}%
- TDC: ${currency} ${Math.round(tdc).toLocaleString()}
- GDV: ${currency} ${Math.round(gdv).toLocaleString()}
- Project IRR: ${projectIrr}%
`.trim();

  const marketPrompts: Record<string, string> = {
    "Market - Travel Tourism Demand": `
You are a senior hospitality analyst. Generate DETAILED travel & tourism demand analysis for a ${starRating} ${businessType} Hotel in ${city}, ${country}.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

SPECIFIC CONTENT TO INCLUDE:
• Travel & tourism GDP contribution and personal consumption in ${country}
• International visitor arrivals and growth rate for ${country}
• Business travel, MICE, and leisure demand drivers in ${city}
• Capital investment into hospitality and attractions
• Government tourism promotion spend and policy support
• Impact on ${keys}-key ${starRating} hotel demand

EXAMPLE:
"• Dubai's hospitality market recorded 17.15 million international overnight visitors in 2023, with hotel occupancy averaging 78% and ADR of AED 650 for 5-star properties."

Generate UNIQUE content for ${city}. DO NOT copy generic templates.
`.trim(),

    "Market - Travel Tourism Outlook": `
Analyze travel & tourism outlook for ${city}, ${country} affecting a ${starRating} ${businessType} Hotel.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

Include short-term and long-term growth forecasts, employment creation, visitor exports, and capital investment trends with percentages.
`.trim(),

    "Market - Historical Arrivals": `
Analyze historical international tourist arrivals to ${country} and ${city}.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

Include actual arrival volumes (millions), recovery from 2020, visa reforms, aviation capacity, and event-driven demand with specific years and numbers.
`.trim(),

    "Market - Projected Arrivals": `
Analyze projected international tourist arrivals to ${country} through 2026E.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

Include forward arrival growth rates, airline seat capacity, event calendars, and implications for ${starRating} hotel absorption in ${city}.
`.trim(),

    "Market - ADR Occupancy": `
Analyze ADR and occupancy trends for the ${starRating} competitive set in ${city}, ${country}.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

Include market ADR, occupancy %, RevPAR trends, subject stabilized profile at ${currency} ${adrYear3} / ${occYear3}%, and Year 1 ramp assumptions.
`.trim(),

    "Market - Annual Revenues": `
Analyze annual hotel revenues by class for ${city}, ${country}.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

Include revenue mix by hotel class, ${starRating} segment performance, and subject revenue positioning for ${keys} keys.
`.trim(),

    "Market - Supply Pipeline": `
Analyze hotel supply pipeline in ${city}, ${country}.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

Include total hotel room stock, pipeline delivery 2024–2026, net absorption, and subject ${keys}-key share of market stock.
`.trim(),

    "Market - Historical Guests": `
Analyze historical hotel guest volumes in ${city}, ${country}.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

Include guest night trends, source market mix, and demand segmentation for ${starRating} properties.
`.trim(),

    "Market - Length of Stay": `
Analyze average length of stay (ALOS) trends in ${city}, ${country}.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

Include ALOS by segment (business vs leisure), regional comparisons, and impact on ${keys}-key hotel revenue management.
`.trim(),

    "Market - Competition": `
Analyze competition for a ${starRating} ${businessType} Hotel in ${subMarket}, ${city}, ${country}.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

MUST name at least 3-5 specific competing hotels in or near ${subMarket} with room counts, positioning, and ADR/occupancy benchmarks.
`.trim(),

    "Market - Hospitality Summary": `
Synthesize hospitality market findings for ${subMarket}, ${city}, ${country}.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

Include key market metrics, demand/supply balance, investment outlook, and GDV/TDC validation for the ${keys}-key subject hotel in ${subMarket}.
`.trim(),

    "Market - Implications": `
Analyze market implications for this ${keys}-key ${starRating} ${businessType} Hotel in ${subMarket}, ${city}.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

Connect ${subMarket} market conditions to GDV of ${currency} ${Math.round(gdv).toLocaleString()}, ADR/occupancy underwriting, and ${projectIrr}% project IRR achievability.
`.trim(),

    "Market - Success Factors": `
Identify success factors for a ${starRating} ${businessType} hotel in ${subMarket}, ${city}, ${country}.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

OUTPUT FORMAT — one bullet per line, use this structure:
Opportunity Title: detailed effect with quantified metrics for ${subMarket}.
Project Strength Title: detailed effect with quantified metrics.

Generate 5-6 bullets covering market opportunities AND project strengths.
DO NOT use generic labels like "Market opportunity" or "Project strength".
Provide SPECIFIC factors relevant to a ${starRating} hotel in ${subMarket}.
`.trim(),

    "Market - Risk Factors": `
Identify risk factors for a ${starRating} ${businessType} hotel in ${subMarket}, ${city}, ${country}.

${projectBlock}

${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}

OUTPUT FORMAT — one bullet per line, use this structure:
Specific Threat Title: detailed effect with data/metrics. Mitigation: concrete action.
Project Weakness Title: quantified impact in ${subMarket}. Mitigation: actionable solution.

Generate 5-6 bullets covering market threats AND project weaknesses.
DO NOT use generic labels like "Market threat", "External risk", or "Project weakness".
Provide SPECIFIC factors relevant to a ${starRating} hotel in ${subMarket}, ${city}.
`.trim(),
  };

  return (
    marketPrompts[section] ??
    `${projectBlock}\n\n${HOTEL_ANTI_PLACEHOLDER}

${HOTEL_WTDC_STRICT_CONSTRAINT}\n\nGenerate 5-6 bullet points for ${section}.`
  );
}

/** Sync hotel deck (paragraphs filled via Puter in enrich-operational-slides-puter). */
export function generateHotelSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  return generateFullFeasibilitySlides(bundle);
}

/** AI-enriched slide sections for hotel operational stream. */
export const HOTEL_AI_SLIDE_SECTIONS: Array<{
  slideId: string;
  section: HotelCommentarySection;
}> = [
  { slideId: "macro-1", section: "Macro - GDP" },
  { slideId: "macro-2", section: "Macro - Inflation" },
  { slideId: "macro-3", section: "Macro - Population" },
  { slideId: "macro-4", section: "Macro - Macro Summary" },
  { slideId: "hosp-demand", section: "Market - Travel Tourism Demand" },
  { slideId: "hosp-outlook", section: "Market - Travel Tourism Outlook" },
  { slideId: "hosp-arrivals-historical", section: "Market - Historical Arrivals" },
  { slideId: "hosp-arrivals-projected", section: "Market - Projected Arrivals" },
  { slideId: "adr-occupancy", section: "Market - ADR Occupancy" },
  { slideId: "hosp-revenues", section: "Market - Annual Revenues" },
  { slideId: "hosp-supply", section: "Market - Supply Pipeline" },
  { slideId: "hosp-guests", section: "Market - Historical Guests" },
  { slideId: "hosp-length-of-stay", section: "Market - Length of Stay" },
  { slideId: "hosp-competition-1", section: "Market - Competition" },
  { slideId: "hosp-summary", section: "Market - Hospitality Summary" },
  { slideId: "hosp-implications", section: "Market - Implications" },
  { slideId: "hosp-success-factors", section: "Market - Success Factors" },
  { slideId: "hosp-risk-factors", section: "Market - Risk Factors" },
];

export async function generateHotelCommentary(
  section: HotelCommentarySection,
  bundle: FeasibilityProjectBundle,
  options?: {
    cacheKey?: string;
    forceRegenerate?: boolean;
    slideId?: string;
  }
): Promise<string[]> {
  const prompt = buildHotelCommentaryPrompt(section, bundle);
  const { aiProvider } = await import("@/lib/ai-service");

  const hashes = buildOperationalBundleHashes(bundle);
  const cacheKey =
    options?.cacheKey ??
    (options?.slideId
      ? buildOperationalCommentaryCacheKey(options.slideId, hashes)
      : undefined);

  const raw = await aiProvider.generateCommentary(prompt, {
    cacheKey,
    forceRegenerate: options?.forceRegenerate,
    section,
  });
  // generateCommentary already returns cleaned paragraphs
  return raw;
}

/** Generate hotel deck with localStorage-cached Puter AI commentary. */
export async function generateHotelSlidesWithPuter(
  bundle: FeasibilityProjectBundle,
  options: OperationalSlideCacheOptions = {}
): Promise<OperationalSlideCacheResult> {
  const baseSlides = generateHotelSlides(bundle);
  return enrichOperationalSlidesWithCache(
    baseSlides,
    bundle,
    HOTEL_AI_SLIDE_SECTIONS,
    (section, b, opts) =>
      generateHotelCommentary(section as HotelCommentarySection, b, {
        cacheKey: opts.cacheKey,
        forceRegenerate: opts.forceRegenerate,
      }),
    options
  );
}

export default generateHotelSlides;
