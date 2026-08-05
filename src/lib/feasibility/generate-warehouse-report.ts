import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { buildMacroSlides } from "@/lib/feasibility/generate-market-slides";
import { generateTitleSlide } from "@/lib/feasibility/generate-title-slide";
import { generateProjectLocationSlide } from "@/lib/feasibility/generate-project-location-slide";
import { generateFinancialSlides } from "@/lib/feasibility/generate-financial-slides";
import {
  generateWarehouseCommentaryFallback,
  buildWarehouseCommentaryPrompt,
  type WarehouseCommentarySection,
} from "@/lib/feasibility/generate-warehouse-commentary";
import {
  fmtWarehouseMoney,
  getWarehouseContext,
} from "@/lib/feasibility/warehouse-context";
import {
  buildWarehouseCompetitiveLandscapeData,
  buildWarehouseDevelopmentAssumptionsData,
  buildWarehouseImplicationsData,
  buildWarehouseMarketMetricsData,
  buildWarehouseMarketOverviewData,
  buildWarehouseMarketSummaryData,
  buildWarehouseOperationalExpensesData,
  buildWarehouseOperationalPnlData,
  buildWarehouseOperationalRevenuesData,
  buildWarehouseRiskFactorsData,
  buildWarehouseSuccessFactorsData,
  buildWarehouseSupplyPipelineData,
  buildWarehouseTenantProfileData,
} from "@/lib/feasibility/build-warehouse-market-data";
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

/** e.g. "Grade A Cold Storage Warehouse" from BENCHMARK warehouse profile */
export function buildWarehouseBenchmarkTitleLabel(
  qualityGrade?: string,
  warehouseSubType?: string
): string {
  const grade = (qualityGrade || "Grade A")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const sub = (warehouseSubType || "Bulk Distribution")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${grade} ${sub} Warehouse`;
}

function commentary(
  bundle: FeasibilityProjectBundle,
  section: WarehouseCommentarySection
): string[] {
  return cleanAIContent(generateWarehouseCommentaryFallback(section, bundle));
}

/** AI-enriched slide sections for warehouse / industrial operational stream. */
export const WAREHOUSE_AI_SLIDE_SECTIONS: Array<{
  slideId: string;
  section: WarehouseCommentarySection;
}> = [
  { slideId: "exec-1", section: "Executive Summary" },
  { slideId: "warehouse-project-overview", section: "Project Overview" },
  { slideId: "macro-1", section: "Macro - GDP" },
  { slideId: "macro-2", section: "Macro - Inflation" },
  { slideId: "macro-3", section: "Macro - Population" },
  { slideId: "macro-4", section: "Macro - Macro Summary" },
  {
    slideId: "warehouse-market-overview",
    section: "Market - Warehouse & Industrial Market Overview & Demand Drivers",
  },
  {
    slideId: "warehouse-market-metrics",
    section:
      "Market - Historical & Projected Market Metrics (Rents, Vacancy, Yields)",
  },
  {
    slideId: "warehouse-supply-pipeline",
    section: "Market - Current & Projected Supply Pipeline",
  },
  {
    slideId: "warehouse-competitive-landscape",
    section: "Market - Competitive Landscape & Benchmarking",
  },
  {
    slideId: "warehouse-tenant-profile",
    section: "Market - Target Tenant & Catchment Profile",
  },
  {
    slideId: "warehouse-market-summary",
    section: "Market - Market Summary & Project Implications",
  },
  { slideId: "warehouse-implications", section: "Market Implications" },
  { slideId: "warehouse-success-factors", section: "Success Factors" },
  { slideId: "warehouse-risk-factors", section: "Risk Factors" },
  { slideId: "warehouse-dev-assumptions", section: "Development Assumptions" },
  {
    slideId: "warehouse-operational-revenues",
    section: "Operational Revenues",
  },
  {
    slideId: "warehouse-operational-expenses",
    section: "Operational Expenses",
  },
];

/** Client-side Puter.js commentary (dynamic import keeps this file server-safe). */
export async function generateWarehouseCommentary(
  section: WarehouseCommentarySection,
  bundle: FeasibilityProjectBundle,
  options?: {
    cacheKey?: string;
    forceRegenerate?: boolean;
    slideId?: string;
  }
): Promise<string[]> {
  const { aiProvider, COMMENTARY_LENGTH_CONSTRAINT, COMMENTARY_FORMAT_CONSTRAINT } =
    await import("@/lib/ai-service");
  const prompt = `${buildWarehouseCommentaryPrompt(section, bundle)}\n\n${COMMENTARY_LENGTH_CONSTRAINT}\n\n${COMMENTARY_FORMAT_CONSTRAINT}`;

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
    return raw;
  } catch (error) {
    console.error(`Failed to generate commentary for ${section}:`, error);
    return [`Content generation failed for ${section}. Please try again.`];
  }
}

/** Generate warehouse deck with localStorage-cached Puter AI commentary. */
export async function generateWarehouseSlidesWithPuter(
  bundle: FeasibilityProjectBundle,
  options: OperationalSlideCacheOptions = {}
): Promise<OperationalSlideCacheResult> {
  const baseSlides = generateWarehouseSlides(bundle);
  return enrichOperationalSlidesWithCache(
    baseSlides,
    bundle,
    WAREHOUSE_AI_SLIDE_SECTIONS,
    (section, b, opts) =>
      generateWarehouseCommentary(section as WarehouseCommentarySection, b, {
        cacheKey: opts.cacheKey,
        forceRegenerate: opts.forceRegenerate,
      }),
    options
  );
}

function generateWarehouseExecutiveSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  const ctx = getWarehouseContext(bundle);
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
            ["Total Development Cost (TDC)", fmtWarehouseMoney(c4.tdc, c, true)],
            [
              "Gross Development Value (GDV)",
              fmtWarehouseMoney(c4.gdv, c, true),
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

function generateWarehouseProjectSlide(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide {
  const ctx = getWarehouseContext(bundle);
  const c = ctx.currency;
  const assetLabel = buildWarehouseBenchmarkTitleLabel(
    ctx.qualityGrade,
    ctx.warehouseSubType
  );

  return {
    id: "warehouse-project-overview",
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
          ["Total Warehouse BUA (sqft)", ctx.warehouseBua.toLocaleString()],
          ["Total Land Area (sqft)", ctx.landArea.toLocaleString()],
          [
            "Number of Units",
            ctx.numberOfUnits > 1
              ? `Industrial Park · ${ctx.numberOfUnits}`
              : "Single Warehouse",
          ],
          ["Construction Period (months)", String(ctx.constructionPeriod)],
          ["Total Development Cost (TDC)", fmtWarehouseMoney(ctx.tdc, c, true)],
        ],
      },
    ],
  };
}

function generateWarehouseMarketSlides(
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

  const marketTitle = "Industry / Market Analysis - Warehouse & Industrial";

  return [
    ...macroSlides,
    {
      id: "warehouse-market-overview",
      section: "market",
      title: marketTitle,
      subtitle: "Warehouse & Industrial Market Overview & Demand Drivers",
      paragraphs: commentary(
        bundle,
        "Market - Warehouse & Industrial Market Overview & Demand Drivers"
      ),
      data: buildWarehouseMarketOverviewData(bundle),
    },
    {
      id: "warehouse-market-metrics",
      section: "market",
      title: marketTitle,
      subtitle: "Historical & Projected Market Metrics (Rents, Vacancy, Yields)",
      paragraphs: commentary(
        bundle,
        "Market - Historical & Projected Market Metrics (Rents, Vacancy, Yields)"
      ),
      data: buildWarehouseMarketMetricsData(bundle),
    },
    {
      id: "warehouse-supply-pipeline",
      section: "market",
      title: marketTitle,
      subtitle: "Current & Projected Supply Pipeline",
      paragraphs: commentary(
        bundle,
        "Market - Current & Projected Supply Pipeline"
      ),
      data: buildWarehouseSupplyPipelineData(bundle),
    },
    {
      id: "warehouse-competitive-landscape",
      section: "market",
      title: marketTitle,
      subtitle: "Competitive Landscape & Benchmarking",
      paragraphs: commentary(
        bundle,
        "Market - Competitive Landscape & Benchmarking"
      ),
      data: buildWarehouseCompetitiveLandscapeData(bundle),
    },
    {
      id: "warehouse-tenant-profile",
      section: "market",
      title: marketTitle,
      subtitle: "Target Tenant & Catchment Profile",
      paragraphs: commentary(
        bundle,
        "Market - Target Tenant & Catchment Profile"
      ),
      data: buildWarehouseTenantProfileData(bundle),
    },
    {
      id: "warehouse-market-summary",
      section: "market",
      title: "Summary of warehouse & industrial market",
      subtitle: "Key findings",
      paragraphs: commentary(
        bundle,
        "Market - Market Summary & Project Implications"
      ),
      data: buildWarehouseMarketSummaryData(bundle),
    },
    {
      id: "warehouse-implications",
      section: "market",
      title: "Implications of the market findings on the Project",
      subtitle: "Warehouse / Industrial Park",
      paragraphs: commentary(bundle, "Market Implications"),
      data: buildWarehouseImplicationsData(bundle),
    },
    {
      id: "warehouse-success-factors",
      section: "market",
      title: "Key Success and Risk Factors",
      subtitle: "Potential Success Factors and Their Impact",
      paragraphs: commentary(bundle, "Success Factors"),
      data: buildWarehouseSuccessFactorsData(bundle),
    },
    {
      id: "warehouse-risk-factors",
      section: "market",
      title: "Key Success and Risk Factors",
      subtitle: "Potential Risk Factors and Their Mitigations",
      paragraphs: commentary(bundle, "Risk Factors"),
      data: buildWarehouseRiskFactorsData(bundle),
    },
  ];
}

function generateWarehouseFinancialSlides(
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
      id: "warehouse-dev-assumptions",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Development Assumptions",
      paragraphs: commentary(bundle, "Development Assumptions"),
      data: buildWarehouseDevelopmentAssumptionsData(bundle),
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
      id: "warehouse-operational-revenues",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Assumptions - Revenues",
      paragraphs: commentary(bundle, "Operational Revenues"),
      data: buildWarehouseOperationalRevenuesData(bundle),
    },
    {
      id: "warehouse-operational-expenses",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Assumptions - Expenses",
      paragraphs: commentary(bundle, "Operational Expenses"),
      data: buildWarehouseOperationalExpensesData(bundle),
    },
    {
      id: "warehouse-operational-pnl",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Profit & Loss",
      paragraphs: [],
      data: buildWarehouseOperationalPnlData(bundle),
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

/** Full warehouse / industrial feasibility deck. */
export function generateWarehouseSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  return [
    generateTitleSlide(bundle),
    ...generateWarehouseExecutiveSlides(bundle),
    generateProjectLocationSlide(bundle),
    generateWarehouseProjectSlide(bundle),
    ...generateWarehouseMarketSlides(bundle),
    ...generateWarehouseFinancialSlides(bundle),
  ];
}

export default generateWarehouseSlides;
