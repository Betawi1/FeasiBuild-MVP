import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { buildMacroSlides } from "@/lib/feasibility/generate-market-slides";
import { generateTitleSlide } from "@/lib/feasibility/generate-title-slide";
import { generateFinancialSlides } from "@/lib/feasibility/generate-financial-slides";
import {
  generateMallCommentaryFallback,
  buildMallCommentaryPrompt,
  type MallCommentarySection,
} from "@/lib/feasibility/generate-mall-commentary";
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
import { fmtMallMoney, getMallContext } from "@/lib/feasibility/mall-context";
import {
  buildMallDevelopmentAssumptionsData,
  buildMallImplicationsData,
  buildMallOperationalExpensesData,
  buildMallOperationalPnlData,
  buildMallOperationalRevenuesData,
  buildMallRiskFactorsData,
  buildMallSuccessFactorsData,
  buildRetailCompetitiveLandscapeData,
  buildRetailMarketMetricsData,
  buildRetailMarketOverviewData,
  buildRetailMarketSummaryData,
  buildRetailSupplyPipelineData,
  buildRetailTenantProfileData,
} from "@/lib/feasibility/build-retail-market-data";

function formatMallToken(value?: string): string {
  if (!value?.trim()) return "";
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatMallPositioningLabel(positioning?: string): string {
  const map: Record<string, string> = {
    luxury: "Luxury",
    upscale: "Upscale",
    mid_market: "Mid-Market",
    value: "Value",
  };
  const key = (positioning ?? "mid_market").toLowerCase();
  return map[key] ?? (formatMallToken(positioning) || "Mid-Market");
}

function formatMallSegmentFullLabel(segment?: string): string {
  const raw = (segment ?? "regional_mall").replace(/_/g, " ").trim();
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** e.g. "Upscale Regional Mall Shopping Mall" from BENCHMARK retail profile */
export function buildMallBenchmarkTitleLabel(
  retailSegment?: string,
  retailPositioning?: string
): string {
  const mallGrade = formatMallPositioningLabel(retailPositioning);
  const mallType = formatMallSegmentFullLabel(retailSegment);
  return `${mallGrade} ${mallType} Shopping Mall`;
}

function commentary(
  bundle: FeasibilityProjectBundle,
  section: MallCommentarySection
): string[] {
  return cleanAIContent(generateMallCommentaryFallback(section, bundle));
}

/** AI-enriched slide sections for shopping mall operational stream. */
export const MALL_AI_SLIDE_SECTIONS: Array<{
  slideId: string;
  section: MallCommentarySection;
}> = [
  { slideId: "exec-1", section: "Executive Summary" },
  { slideId: "mall-project-overview", section: "Project Overview" },
  { slideId: "macro-1", section: "Macro - GDP" },
  { slideId: "macro-2", section: "Macro - Inflation" },
  { slideId: "macro-3", section: "Macro - Population" },
  { slideId: "macro-4", section: "Macro - Macro Summary" },
  {
    slideId: "mall-market-overview",
    section: "Market - Retail Market Overview & Demand Drivers",
  },
  {
    slideId: "mall-market-metrics",
    section: "Market - Historical & Projected Market Metrics",
  },
  {
    slideId: "mall-supply-pipeline",
    section: "Market - Current & Projected Supply Pipeline",
  },
  {
    slideId: "mall-competitive-landscape",
    section: "Market - Competitive Landscape & Benchmarking",
  },
  {
    slideId: "mall-tenant-profile",
    section: "Market - Target Tenant & Catchment Profile",
  },
  {
    slideId: "mall-market-summary",
    section: "Market - Market Summary & Project Implications",
  },
  { slideId: "mall-implications", section: "Market Implications" },
  { slideId: "mall-success-factors", section: "Success Factors" },
  { slideId: "mall-risk-factors", section: "Risk Factors" },
  { slideId: "mall-dev-assumptions", section: "Development Assumptions" },
  { slideId: "mall-operational-revenues", section: "Operational Revenues" },
  { slideId: "mall-operational-expenses", section: "Operational Expenses" },
];

/** Client-side Puter.js commentary (dynamic import keeps this file server-safe). */
export async function generateMallCommentary(
  section: MallCommentarySection,
  bundle: FeasibilityProjectBundle,
  options?: {
    cacheKey?: string;
    forceRegenerate?: boolean;
    slideId?: string;
  }
): Promise<string[]> {
  const { aiProvider, COMMENTARY_LENGTH_CONSTRAINT, COMMENTARY_FORMAT_CONSTRAINT } =
    await import("@/lib/ai-service");
  const prompt = `${buildMallCommentaryPrompt(section, bundle)}\n\n${COMMENTARY_LENGTH_CONSTRAINT}\n\n${COMMENTARY_FORMAT_CONSTRAINT}`;

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

/** Generate mall deck with localStorage-cached Puter AI commentary. */
export async function generateShoppingMallSlidesWithPuter(
  bundle: FeasibilityProjectBundle,
  options: OperationalSlideCacheOptions = {}
): Promise<OperationalSlideCacheResult> {
  const baseSlides = generateShoppingMallSlides(bundle);
  return enrichOperationalSlidesWithCache(
    baseSlides,
    bundle,
    MALL_AI_SLIDE_SECTIONS,
    (section, b, opts) =>
      generateMallCommentary(section as MallCommentarySection, b, {
        cacheKey: opts.cacheKey,
        forceRegenerate: opts.forceRegenerate,
      }),
    options
  );
}

function generateMallExecutiveSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  const ctx = getMallContext(bundle);
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
            ["Total Development Cost (TDC)", fmtMallMoney(c4.tdc, c, true)],
            ["Gross Development Value (GDV)", fmtMallMoney(c4.gdv, c, true)],
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

function generateMallProjectSlide(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide {
  const ctx = getMallContext(bundle);
  const c = ctx.currency;

  return {
    id: "mall-project-overview",
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
          ["Asset Type", `Shopping Mall (${ctx.mallType})`],
          ["Total GLA (sqft)", ctx.gla.toLocaleString()],
          ["Construction Period (months)", String(ctx.constructionPeriod)],
          ["Mall Type / Positioning", ctx.mallType],
          ["Total Development Cost (TDC)", fmtMallMoney(ctx.tdc, c, true)],
          [
            "Development Cost per sqft GLA",
            `${c} ${ctx.gla > 0 ? Math.round(ctx.tdc / ctx.gla).toLocaleString() : "—"}`,
          ],
        ],
      },
    ],
  };
}

function generateMallMarketSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  const agg = bundle.aggregate;
  const macroSlides = buildMacroSlides(agg).map((slide) => {
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

  const marketTitle = "Industry / Market Analysis";

  return [
    ...macroSlides,
    {
      id: "mall-market-overview",
      section: "market",
      title: marketTitle,
      subtitle: "Retail Market Overview & Demand Drivers",
      paragraphs: commentary(bundle, "Market - Retail Market Overview & Demand Drivers"),
      data: buildRetailMarketOverviewData(bundle),
    },
    {
      id: "mall-market-metrics",
      section: "market",
      title: marketTitle,
      subtitle: "Historical & Projected Market Metrics",
      paragraphs: commentary(bundle, "Market - Historical & Projected Market Metrics"),
      data: buildRetailMarketMetricsData(bundle),
    },
    {
      id: "mall-supply-pipeline",
      section: "market",
      title: marketTitle,
      subtitle: "Current & Projected Supply Pipeline",
      paragraphs: commentary(bundle, "Market - Current & Projected Supply Pipeline"),
      data: buildRetailSupplyPipelineData(bundle),
    },
    {
      id: "mall-competitive-landscape",
      section: "market",
      title: marketTitle,
      subtitle: "Competitive Landscape & Benchmarking",
      paragraphs: commentary(bundle, "Market - Competitive Landscape & Benchmarking"),
      data: buildRetailCompetitiveLandscapeData(bundle),
    },
    {
      id: "mall-tenant-profile",
      section: "market",
      title: marketTitle,
      subtitle: "Target Tenant & Catchment Profile",
      paragraphs: commentary(bundle, "Market - Target Tenant & Catchment Profile"),
      data: buildRetailTenantProfileData(bundle),
    },
    {
      id: "mall-market-summary",
      section: "market",
      title: "Summary of retail market",
      subtitle: "Key findings",
      paragraphs: commentary(bundle, "Market - Market Summary & Project Implications"),
      data: buildRetailMarketSummaryData(bundle),
    },
    {
      id: "mall-implications",
      section: "market",
      title: "Implications of the market findings on the Project",
      subtitle: "Retail",
      paragraphs: commentary(bundle, "Market Implications"),
      data: buildMallImplicationsData(bundle),
    },
    {
      id: "mall-success-factors",
      section: "market",
      title: "Key Success and Risk Factors",
      subtitle: "Potential Success Factors and Their Impact",
      paragraphs: commentary(bundle, "Success Factors"),
      data: buildMallSuccessFactorsData(bundle),
    },
    {
      id: "mall-risk-factors",
      section: "market",
      title: "Key Success and Risk Factors",
      subtitle: "Potential Risk Factors and Their Mitigations",
      paragraphs: commentary(bundle, "Risk Factors"),
      data: buildMallRiskFactorsData(bundle),
    },
  ];
}

function generateMallFinancialSlides(
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
      id: "mall-dev-assumptions",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Development Assumptions — General Mall Assumptions",
      paragraphs: commentary(bundle, "Development Assumptions"),
      data: buildMallDevelopmentAssumptionsData(bundle),
    },
    schedule
      ? {
          ...schedule,
          subtitle: "Mall Development Schedule",
          paragraphs: commentary(bundle, "Development Schedule"),
        }
      : {
          id: "fin-dev-schedule",
          section: "financial",
          title: "Financial Analysis",
          subtitle: "Mall Development Schedule",
          paragraphs: commentary(bundle, "Development Schedule"),
        },
    {
      id: "mall-operational-revenues",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Assumptions - Revenues",
      paragraphs: commentary(bundle, "Operational Revenues"),
      data: buildMallOperationalRevenuesData(bundle),
    },
    {
      id: "mall-operational-expenses",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Assumptions - Expenses",
      paragraphs: commentary(bundle, "Operational Expenses"),
      data: buildMallOperationalExpensesData(bundle),
    },
    {
      id: "mall-operational-pnl",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Profit & Loss",
      paragraphs: [],
      data: buildMallOperationalPnlData(bundle),
    },
    ...tail.map((slide) => ({
      ...slide,
      title: slide.title === "Financial Feasibility Study" ? "Financial Analysis" : slide.title,
    })),
  ];
}

/** Full 33-slide shopping mall deck: Title → Executive → Project → Macro → Retail Market → Financial. */
export function generateShoppingMallSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  return [
    generateTitleSlide(bundle),
    ...generateMallExecutiveSlides(bundle),
    generateMallProjectSlide(bundle),
    ...generateMallMarketSlides(bundle),
    ...generateMallFinancialSlides(bundle),
  ];
}

export default generateShoppingMallSlides;
