import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { buildMacroSlides } from "@/lib/feasibility/generate-market-slides";
import { generateTitleSlide } from "@/lib/feasibility/generate-title-slide";
import { generateFinancialSlides } from "@/lib/feasibility/generate-financial-slides";
import {
  generateBTRCommentaryFallback,
  buildBTRCommentaryPrompt,
  type BTRCommentarySection,
} from "@/lib/feasibility/generate-btr-commentary";
import { fmtBTRMoney, getBTRContext } from "@/lib/feasibility/btr-context";
import {
  buildBTRCompetitiveLandscapeData,
  buildBTRDevelopmentAssumptionsData,
  buildBTRImplicationsData,
  buildBTRMarketMetricsData,
  buildBTRMarketOverviewData,
  buildBTRMarketSummaryData,
  buildBTROperationalAssumptionsData,
  buildBTROperationalExpensesData,
  buildBTROperationalPnlData,
  buildBTROperationalRevenuesData,
  buildBTRRiskFactorsData,
  buildBTRSuccessFactorsData,
  buildBTRSupplyPipelineData,
  buildBTRTenantProfileData,
} from "@/lib/feasibility/build-btr-market-data";
import { buildPreferenceSharesExitStrategyFromBundle } from "@/lib/feasibility/build-preference-shares-exit-data";
import {
  formatBTRGradeLabel,
  formatBTRSegmentLabel,
} from "@/lib/feasibility/btr-context";
import { cleanAIContent } from "@/lib/feasibility/clean-ai-content";
import {
  buildOperationalBundleHashes,
  buildOperationalCommentaryCacheKey,
} from "@/lib/slide-dependencies";
import {
  enrichOperationalSlidesWithCache,
  type OperationalSlideCacheOptions,
  type OperationalSlideCacheResult,
} from "@/lib/feasibility/operational-slide-cache";

/** e.g. "Grade B Residential High-Rise BTR Tower" from BENCHMARK residential profile */
export function buildBTRBenchmarkTitleLabel(
  residentialPositioning?: string,
  residentialSegment?: string
): string {
  const grade = formatBTRGradeLabel(residentialPositioning);
  const segment = formatBTRSegmentLabel(residentialSegment);
  return `${grade} Residential ${segment} BTR Tower`;
}

function commentary(
  bundle: FeasibilityProjectBundle,
  section: BTRCommentarySection
): string[] {
  return cleanAIContent(generateBTRCommentaryFallback(section, bundle));
}

/** AI-enriched slide sections for BTR operational stream. */
export const BTR_AI_SLIDE_SECTIONS: Array<{
  slideId: string;
  section: BTRCommentarySection;
}> = [
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

/** Client-side Puter.js commentary (dynamic import keeps this file server-safe). */
export async function generateBTRCommentary(
  section: BTRCommentarySection,
  bundle: FeasibilityProjectBundle,
  options?: {
    cacheKey?: string;
    forceRegenerate?: boolean;
    slideId?: string;
  }
): Promise<string[]> {
  const { aiProvider, COMMENTARY_LENGTH_CONSTRAINT, COMMENTARY_FORMAT_CONSTRAINT } =
    await import("@/lib/ai-service");
  const prompt = `${buildBTRCommentaryPrompt(section, bundle)}\n\n${COMMENTARY_LENGTH_CONSTRAINT}\n\n${COMMENTARY_FORMAT_CONSTRAINT}`;

  const hashes = buildOperationalBundleHashes(bundle);
  const cacheKey =
    options?.cacheKey ??
    (options?.slideId
      ? buildOperationalCommentaryCacheKey(options.slideId, hashes)
      : undefined);

  try {
    const raw = await aiProvider.generateCommentary(prompt, {
      cacheKey,
      forceRegenerate: options?.forceRegenerate,
      section,
    });
    return cleanAIContent(raw);
  } catch (error) {
    console.error(`Failed to generate commentary for ${section}:`, error);
    return [`Content generation failed for ${section}. Please try again.`];
  }
}

/** Generate BTR deck with localStorage-cached Puter AI commentary. */
export async function generateBTRSlidesWithPuter(
  bundle: FeasibilityProjectBundle,
  options: OperationalSlideCacheOptions = {}
): Promise<OperationalSlideCacheResult> {
  const baseSlides = generateBTRSlides(bundle);
  return enrichOperationalSlidesWithCache(
    baseSlides,
    bundle,
    BTR_AI_SLIDE_SECTIONS,
    (section, b, opts) =>
      generateBTRCommentary(section as BTRCommentarySection, b, {
        cacheKey: opts.cacheKey,
        forceRegenerate: opts.forceRegenerate,
      }),
    options
  );
}

function generateBTRExecutiveSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  const ctx = getBTRContext(bundle);
  const c4 = bundle.component4;
  const c = ctx.currency;

  return [
    {
      id: "exec-1",
      section: "executive",
      layout: "split",
      title: "Executive Summary",
      subtitle: "Financial Feasibility - Key Metrics",
      paragraphs: commentary(bundle, "Executive Summary"),
      tables: [
        {
          title: "Key Financial Metrics",
          headers: ["Metric", "Value"],
          rows: [
            ["Total Development Cost (TDC)", fmtBTRMoney(c4.tdc, c, true)],
            ["Gross Development Value (GDV)", fmtBTRMoney(c4.gdv, c, true)],
            ["Unlevered Project IRR", `${c4.projectIRR}%`],
            ["Levered Equity IRR", `${c4.equityIRR}%`],
            ["Equity Multiple", `${c4.equityMultiple.toFixed(2)}x`],
            ["Payback Period", `${c4.paybackPeriod} years`],
          ],
        },
      ],
    },
  ];
}

function generateBTRProjectSlide(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide {
  const ctx = getBTRContext(bundle);
  const c = ctx.currency;

  return {
    id: "btr-project-overview",
    section: "project",
    title: "Project Analysis",
    subtitle: "Overview — The Project",
    paragraphs: commentary(bundle, "Project Overview"),
    tables: [
      {
        title: "Key Project Metrics",
        headers: ["Parameter", "Value"],
        rows: [
          ["Location", `${ctx.city}, ${ctx.country}`],
          ["Asset Type", "Residential High-Rise BTR (Grade B)"],
          ["Total Residential GLA (sqft)", ctx.residentialGla.toLocaleString()],
          ["Total Retail GLA (sqft)", ctx.retailGla.toLocaleString()],
          ["Construction Period (months)", String(ctx.constructionPeriod)],
          ["Total Development Cost (TDC)", fmtBTRMoney(ctx.tdc, c, true)],
        ],
      },
    ],
  };
}

function generateBTRMarketSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  const macroSlides = buildMacroSlides(bundle.aggregate).map((slide) => {
    if (slide.id === "macro-1") {
      return { ...slide, paragraphs: commentary(bundle, "Macro - GDP") };
    }
    if (slide.id === "macro-2") {
      return { ...slide, paragraphs: commentary(bundle, "Macro - Inflation") };
    }
    if (slide.id === "macro-3") {
      return { ...slide, paragraphs: commentary(bundle, "Macro - Population") };
    }
    if (slide.id === "macro-4") {
      return { ...slide, paragraphs: commentary(bundle, "Macro - Macro Summary") };
    }
    return slide;
  });

  const marketTitle = "Industry / Market Analysis - Residential BTR";

  return [
    ...macroSlides,
    {
      id: "btr-market-overview",
      section: "market",
      title: marketTitle,
      subtitle: "Residential Rental Market Overview & Demand Drivers",
      paragraphs: commentary(
        bundle,
        "Market - Residential Rental Market Overview & Demand Drivers"
      ),
      data: buildBTRMarketOverviewData(bundle),
    },
    {
      id: "btr-market-metrics",
      section: "market",
      title: marketTitle,
      subtitle: "Historical & Projected Market Metrics (Rents, Vacancy, Yields)",
      paragraphs: commentary(
        bundle,
        "Market - Historical & Projected Market Metrics (Rents, Vacancy, Yields)"
      ),
      data: buildBTRMarketMetricsData(bundle),
    },
    {
      id: "btr-supply-pipeline",
      section: "market",
      title: marketTitle,
      subtitle: "Current & Projected Supply Pipeline",
      paragraphs: commentary(
        bundle,
        "Market - Current & Projected Supply Pipeline"
      ),
      data: buildBTRSupplyPipelineData(bundle),
    },
    {
      id: "btr-competitive-landscape",
      section: "market",
      title: marketTitle,
      subtitle: "Competitive Landscape & Benchmarking",
      paragraphs: commentary(
        bundle,
        "Market - Competitive Landscape & Benchmarking"
      ),
      data: buildBTRCompetitiveLandscapeData(bundle),
    },
    {
      id: "btr-tenant-profile",
      section: "market",
      title: marketTitle,
      subtitle: "Target Tenant & Catchment Profile",
      paragraphs: commentary(
        bundle,
        "Market - Target Tenant & Catchment Profile"
      ),
      data: buildBTRTenantProfileData(bundle),
    },
    {
      id: "btr-market-summary",
      section: "market",
      title: "Summary of residential BTR market",
      subtitle: "Key findings",
      paragraphs: commentary(
        bundle,
        "Market - Market Summary & Project Implications"
      ),
      data: buildBTRMarketSummaryData(bundle),
    },
    {
      id: "btr-implications",
      section: "market",
      title: "Implications of the market findings on the Project",
      subtitle: "BTR",
      paragraphs: commentary(bundle, "Market Implications"),
      data: buildBTRImplicationsData(bundle),
    },
    {
      id: "btr-success-factors",
      section: "market",
      title: "Key Success and Risk Factors",
      subtitle: "Potential Success Factors and Their Impact",
      paragraphs: commentary(bundle, "Success Factors"),
      data: buildBTRSuccessFactorsData(bundle),
    },
    {
      id: "btr-risk-factors",
      section: "market",
      title: "Key Success and Risk Factors",
      subtitle: "Potential Risk Factors and Their Mitigations",
      paragraphs: commentary(bundle, "Risk Factors"),
      data: buildBTRRiskFactorsData(bundle),
    },
  ];
}

function generateBTRFinancialSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  const financial = generateFinancialSlides(bundle);
  const schedule = financial.find((s) => s.id === "fin-dev-schedule");
  const tail = financial.filter((s) =>
    [
      "operational-cash-flow",
      "fin-term-loan",
      "pref-shares-exit-strategy",
      "post-financing-cash-flow",
      "irr-and-financing-metrics",
      "scenario-comparison",
      "scenario-analysis-results",
    ].includes(s.id)
  );

  return [
    {
      id: "btr-dev-assumptions",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Development Assumptions — General BTR Assumptions",
      paragraphs: commentary(bundle, "Development Assumptions"),
      data: buildBTRDevelopmentAssumptionsData(bundle),
    },
    schedule
      ? {
          ...schedule,
          subtitle: "BTR Development Schedule",
          paragraphs: commentary(bundle, "Development Schedule"),
        }
      : {
          id: "fin-dev-schedule",
          section: "financial",
          title: "Financial Analysis",
          subtitle: "BTR Development Schedule",
          paragraphs: commentary(bundle, "Development Schedule"),
        },
    {
      id: "btr-operational-revenues",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Assumptions - Revenues",
      paragraphs: commentary(bundle, "Operational Revenues"),
      data: buildBTROperationalRevenuesData(bundle),
    },
    {
      id: "btr-operational-expenses",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Assumptions - Expenses",
      paragraphs: commentary(bundle, "Operational Expenses"),
      data: buildBTROperationalExpensesData(bundle),
    },
    {
      id: "btr-operational-pnl",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Profit & Loss",
      paragraphs: [],
      data: buildBTROperationalPnlData(bundle),
    },
    ...tail.map((slide) => {
      const title =
        slide.title === "Financial Feasibility Study"
          ? "Financial Analysis"
          : slide.title;

      if (slide.id === "pref-shares-exit-strategy") {
        return {
          ...slide,
          title,
          data: buildPreferenceSharesExitStrategyFromBundle(bundle),
        };
      }

      return { ...slide, title };
    }),
  ];
}

/** Full residential BTR feasibility deck. */
export function generateBTRSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  return [
    generateTitleSlide(bundle),
    ...generateBTRExecutiveSlides(bundle),
    generateBTRProjectSlide(bundle),
    ...generateBTRMarketSlides(bundle),
    ...generateBTRFinancialSlides(bundle),
  ];
}

export default generateBTRSlides;
