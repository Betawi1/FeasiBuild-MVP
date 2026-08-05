import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { buildMacroSlides } from "@/lib/feasibility/generate-market-slides";
import { generateTitleSlide } from "@/lib/feasibility/generate-title-slide";
import { generateProjectLocationSlide } from "@/lib/feasibility/generate-project-location-slide";
import { generateFinancialSlides } from "@/lib/feasibility/generate-financial-slides";
import {
  generateDataCentreCommentaryFallback,
  buildDataCentreCommentaryPrompt,
  assertDataCentreBundle,
  type DataCentreCommentarySection,
} from "@/lib/feasibility/generate-data-centre-commentary";
import {
  fmtDataCentreMoney,
  formatDataCentreSegmentLabel,
  formatDataCentreTierLabel,
  getDataCentreContext,
} from "@/lib/feasibility/data-centre-context";
import {
  buildDataCentreCompetitiveAnalysisData,
  buildDataCentreCompetitiveLandscapeData,
  buildDataCentreDevelopmentAssumptionsData,
  buildDataCentreImplicationsData,
  buildDataCentreMarketMetricsData,
  buildDataCentreMarketOverviewData,
  buildDataCentreMarketSummaryData,
  buildDataCentreOperationalAssumptionsData,
  buildDataCentreOperationalExpensesData,
  buildDataCentreOperationalPnlData,
  buildDataCentreOperationalRevenuesData,
  buildDataCentreRiskFactorsData,
  buildDataCentreSuccessFactorsData,
  buildDataCentreSupplyPipelineData,
  buildDataCentreTenantProfileData,
} from "@/lib/feasibility/build-data-centre-market-data";
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

/** e.g. "Tier III Colocation Data Centre" from BENCHMARK DC profile */
export function buildDataCentreBenchmarkTitleLabel(
  tierLevel?: string,
  segment?: string
): string {
  const tier = formatDataCentreTierLabel(tierLevel);
  const seg = formatDataCentreSegmentLabel(segment);
  return `${tier} ${seg} Data Centre`;
}

function commentary(
  bundle: FeasibilityProjectBundle,
  section: DataCentreCommentarySection
): string[] {
  return cleanAIContent(generateDataCentreCommentaryFallback(section, bundle));
}

/** AI-enriched slide sections for data centre operational stream. */
export const DATACENTRE_AI_SLIDE_SECTIONS: Array<{
  slideId: string;
  section: DataCentreCommentarySection;
}> = [
  { slideId: "exec-1", section: "Executive Summary" },
  { slideId: "datacentre-project-overview", section: "Project Overview" },
  { slideId: "macro-1", section: "Macro - GDP" },
  { slideId: "macro-2", section: "Macro - Inflation" },
  { slideId: "macro-3", section: "Macro - Population" },
  { slideId: "macro-4", section: "Macro - Macro Summary" },
  {
    slideId: "datacentre-market-overview",
    section: "Market - Data Centre Market Overview & Demand Drivers",
  },
  {
    slideId: "datacentre-market-metrics",
    section:
      "Market - Historical & Projected Market Metrics (Power, Pricing, Utilization)",
  },
  {
    slideId: "datacentre-supply-pipeline",
    section: "Market - Current & Projected Supply Pipeline",
  },
  {
    slideId: "datacentre-competitive-landscape",
    section: "Market - Competitive Landscape & Benchmarking",
  },
  {
    slideId: "datacentre-competitive-analysis",
    section: "Market - Competitive Analysis (Pricing, PUE & Latency)",
  },
  {
    slideId: "datacentre-tenant-profile",
    section: "Market - Target Tenant & Catchment Profile",
  },
  {
    slideId: "datacentre-market-summary",
    section: "Market - Market Summary & Project Implications",
  },
  { slideId: "datacentre-implications", section: "Market Implications" },
  { slideId: "datacentre-success-factors", section: "Success Factors" },
  { slideId: "datacentre-risk-factors", section: "Risk Factors" },
  {
    slideId: "datacentre-dev-assumptions",
    section: "Development Assumptions",
  },
  {
    slideId: "datacentre-operational-assumptions",
    section: "Operational Revenues",
  },
  {
    slideId: "datacentre-operational-revenues",
    section: "Operational Revenues",
  },
  {
    slideId: "datacentre-operational-expenses",
    section: "Operational Expenses",
  },
];

function looksLikeWrongAssetAiOutput(paragraphs: string[]): boolean {
  const joined = paragraphs.join(" ").toLowerCase();
  return (
    joined.includes("bulk distribution") ||
    joined.includes("warehouse") ||
    joined.includes("cross-dock") ||
    joined.includes("3pl") ||
    joined.includes("logistics park") ||
    joined.includes("industrial park") ||
    joined.includes("residential unit") ||
    joined.includes("btr tower") ||
    joined.includes("build-to-rent") ||
    joined.includes("shopping mall") ||
    joined.includes("hotel adr") ||
    /grade\s*a\s+\w+\s+warehouse/.test(joined)
  );
}

/** Client-side Puter.js commentary (dynamic import keeps this file server-safe). */
export async function generateDataCentreCommentary(
  section: DataCentreCommentarySection,
  bundle: FeasibilityProjectBundle,
  options?: {
    cacheKey?: string;
    forceRegenerate?: boolean;
    slideId?: string;
  }
): Promise<string[]> {
  assertDataCentreBundle(bundle, `generateCommentary:${section}`);

  const { aiProvider, COMMENTARY_LENGTH_CONSTRAINT, COMMENTARY_FORMAT_CONSTRAINT } =
    await import("@/lib/ai-service");
  const prompt = `${buildDataCentreCommentaryPrompt(section, bundle)}\n\n${COMMENTARY_LENGTH_CONSTRAINT}\n\n${COMMENTARY_FORMAT_CONSTRAINT}`;

  const hashes = buildOperationalBundleHashes(bundle);
  const cacheKey =
    options?.cacheKey ??
    (options?.slideId
      ? buildOperationalCommentaryCacheKey(
          options.slideId,
          hashes,
          bundle.buildingType || "data_centre"
        )
      : undefined);

  try {
    const raw = await aiProvider.generateCommentary(prompt, {
      cacheKey,
      forceRegenerate: options?.forceRegenerate,
      section,
    });
    if (looksLikeWrongAssetAiOutput(raw)) {
      console.warn(
        `[Data Centre Feasibility] Rejecting wrong-asset AI output for ${section}; using DC fallback`
      );
      return cleanAIContent(
        generateDataCentreCommentaryFallback(section, bundle)
      );
    }
    // Keep chart / assumption slides presentation-length
    if (
      section === "Operational Revenues" ||
      section === "Operational Expenses" ||
      section === "Market - Competitive Analysis (Pricing, PUE & Latency)"
    ) {
      return cleanAIContent(raw)
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, section === "Market - Competitive Analysis (Pricing, PUE & Latency)" ? 2 : 3);
    }
    return raw;
  } catch (error) {
    console.error(`Failed to generate commentary for ${section}:`, error);
    return cleanAIContent(
      generateDataCentreCommentaryFallback(section, bundle)
    );
  }
}

/** Generate data centre deck with localStorage-cached Puter AI commentary. */
export async function generateDataCentreSlidesWithPuter(
  bundle: FeasibilityProjectBundle,
  options: OperationalSlideCacheOptions = {}
): Promise<OperationalSlideCacheResult> {
  assertDataCentreBundle(bundle, "generateDataCentreSlidesWithPuter");
  const baseSlides = generateDataCentreSlides(bundle);
  return enrichOperationalSlidesWithCache(
    baseSlides,
    bundle,
    DATACENTRE_AI_SLIDE_SECTIONS,
    (section, b, opts) =>
      generateDataCentreCommentary(section as DataCentreCommentarySection, b, {
        cacheKey: opts.cacheKey,
        forceRegenerate: opts.forceRegenerate,
      }),
    options
  );
}

function generateDataCentreExecutiveSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  const ctx = getDataCentreContext(bundle);
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
            ["Total Development Cost (TDC)", fmtDataCentreMoney(c4.tdc, c, true)],
            [
              "Cost per MW",
              fmtDataCentreMoney(ctx.costPerMw, c, true),
            ],
            ["IT Load Capacity", `${ctx.itLoadMw.toFixed(1)} MW`],
            ["Design PUE", String(ctx.pue)],
            ["Tier Level", formatDataCentreTierLabel(ctx.tierLevel)],
            [
              "Gross Development Value (GDV)",
              fmtDataCentreMoney(c4.gdv, c, true),
            ],
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

function generateDataCentreProjectSlide(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide {
  const ctx = getDataCentreContext(bundle);
  const c = ctx.currency;
  const assetLabel = buildDataCentreBenchmarkTitleLabel(
    ctx.tierLevel,
    ctx.segment
  );

  return {
    id: "datacentre-project-overview",
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
          ["Asset Type", assetLabel],
          ["IT Load Capacity", `${ctx.itLoadMw.toFixed(1)} MW`],
          ["White Space (sqft)", ctx.whiteSpaceSqft.toLocaleString()],
          ["Total Building GFA (sqft)", ctx.totalBuildingGfa.toLocaleString()],
          ["Design PUE", String(ctx.pue)],
          ["Tier Level", formatDataCentreTierLabel(ctx.tierLevel)],
          ["Construction Period (months)", String(ctx.constructionPeriod)],
          ["Total Development Cost (TDC)", fmtDataCentreMoney(ctx.tdc, c, true)],
          ["Cost per MW", fmtDataCentreMoney(ctx.costPerMw, c, true)],
        ],
      },
    ],
  };
}

function generateDataCentreMarketSlides(
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
      return {
        ...slide,
        paragraphs: commentary(bundle, "Macro - Macro Summary"),
      };
    }
    return slide;
  });

  const marketTitle = "Industry / Market Analysis - Data Centre";

  return [
    ...macroSlides,
    {
      id: "datacentre-market-overview",
      section: "market",
      title: marketTitle,
      subtitle: "Data Centre Market Overview & Demand Drivers",
      paragraphs: commentary(
        bundle,
        "Market - Data Centre Market Overview & Demand Drivers"
      ),
      data: buildDataCentreMarketOverviewData(bundle),
    },
    {
      id: "datacentre-market-metrics",
      section: "market",
      title: marketTitle,
      subtitle:
        "Historical & Projected Market Metrics (Power, Pricing, Utilization)",
      paragraphs: commentary(
        bundle,
        "Market - Historical & Projected Market Metrics (Power, Pricing, Utilization)"
      ),
      data: buildDataCentreMarketMetricsData(bundle),
    },
    {
      id: "datacentre-supply-pipeline",
      section: "market",
      title: marketTitle,
      subtitle: "Current & Projected Supply Pipeline (MW)",
      paragraphs: commentary(
        bundle,
        "Market - Current & Projected Supply Pipeline"
      ),
      data: buildDataCentreSupplyPipelineData(bundle),
    },
    {
      id: "datacentre-competitive-analysis",
      section: "market",
      title: marketTitle,
      subtitle: "Competitive Analysis — Pricing, PUE & Latency",
      paragraphs: commentary(
        bundle,
        "Market - Competitive Analysis (Pricing, PUE & Latency)"
      ),
      data: buildDataCentreCompetitiveAnalysisData(bundle),
    },
    {
      id: "datacentre-competitive-landscape",
      section: "market",
      title: marketTitle,
      subtitle: "Competitive Landscape & Benchmarking",
      paragraphs: commentary(
        bundle,
        "Market - Competitive Landscape & Benchmarking"
      ),
      data: buildDataCentreCompetitiveLandscapeData(bundle),
    },
    {
      id: "datacentre-tenant-profile",
      section: "market",
      title: marketTitle,
      subtitle: "Target Tenant & Catchment Profile",
      paragraphs: commentary(
        bundle,
        "Market - Target Tenant & Catchment Profile"
      ),
      data: buildDataCentreTenantProfileData(bundle),
    },
    {
      id: "datacentre-market-summary",
      section: "market",
      title: "Summary of data centre market",
      subtitle: "Key findings",
      paragraphs: commentary(
        bundle,
        "Market - Market Summary & Project Implications"
      ),
      data: buildDataCentreMarketSummaryData(bundle),
    },
    {
      id: "datacentre-implications",
      section: "market",
      title: "Implications of the market findings on the Project",
      subtitle: "Data Centre",
      paragraphs: commentary(bundle, "Market Implications"),
      data: buildDataCentreImplicationsData(bundle),
    },
    {
      id: "datacentre-success-factors",
      section: "market",
      title: "Key Success and Risk Factors",
      subtitle: "Potential Success Factors and Their Impact",
      paragraphs: commentary(bundle, "Success Factors"),
      data: buildDataCentreSuccessFactorsData(bundle),
    },
    {
      id: "datacentre-risk-factors",
      section: "market",
      title: "Key Success and Risk Factors",
      subtitle: "Potential Risk Factors and Their Mitigations",
      paragraphs: commentary(bundle, "Risk Factors"),
      data: buildDataCentreRiskFactorsData(bundle),
    },
  ];
}

function generateDataCentreFinancialSlides(
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
      id: "datacentre-dev-assumptions",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Development Assumptions",
      paragraphs: commentary(bundle, "Development Assumptions"),
      data: buildDataCentreDevelopmentAssumptionsData(bundle),
    },
    schedule
      ? {
          ...schedule,
          subtitle: "Development Schedule",
          paragraphs: commentary(bundle, "Development Schedule"),
        }
      : {
          id: "fin-dev-schedule",
          section: "financial",
          title: "Financial Analysis",
          subtitle: "Development Schedule",
          paragraphs: commentary(bundle, "Development Schedule"),
        },
    {
      id: "datacentre-operational-assumptions",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Assumptions — Revenue Mix & OpEx",
      paragraphs: commentary(bundle, "Operational Revenues"),
      data: buildDataCentreOperationalAssumptionsData(bundle),
    },
    {
      id: "datacentre-operational-revenues",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Assumptions - Revenues",
      paragraphs: commentary(bundle, "Operational Revenues"),
      data: buildDataCentreOperationalRevenuesData(bundle),
    },
    {
      id: "datacentre-operational-expenses",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Assumptions - Expenses",
      paragraphs: commentary(bundle, "Operational Expenses"),
      data: buildDataCentreOperationalExpensesData(bundle),
    },
    {
      id: "datacentre-operational-pnl",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Profit & Loss",
      paragraphs: [],
      data: buildDataCentreOperationalPnlData(bundle),
    },
    ...tail.map((slide) => ({
      ...slide,
      title:
        slide.title === "Financial Feasibility Study"
          ? "Financial Analysis"
          : slide.title,
    })),
  ];
}

/** Full data centre feasibility deck. */
export function generateDataCentreSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  assertDataCentreBundle(bundle, "generateDataCentreSlides");
  return [
    generateTitleSlide(bundle),
    ...generateDataCentreExecutiveSlides(bundle),
    generateProjectLocationSlide(bundle),
    generateDataCentreProjectSlide(bundle),
    ...generateDataCentreMarketSlides(bundle),
    ...generateDataCentreFinancialSlides(bundle),
  ];
}

/** Alias matching other asset report entry points. */
export const generateDataCentreReport = generateDataCentreSlides;

export default generateDataCentreSlides;
