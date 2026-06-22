import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { buildMacroSlides } from "@/lib/feasibility/generate-market-slides";
import { generateTitleSlide } from "@/lib/feasibility/generate-title-slide";
import { generateFinancialSlides } from "@/lib/feasibility/generate-financial-slides";
import {
  generateOfficeCommentaryFallback,
  buildOfficeCommentaryPrompt,
  type OfficeCommentarySection,
} from "@/lib/feasibility/generate-office-commentary";
import { fmtOfficeMoney, getOfficeContext } from "@/lib/feasibility/office-context";
import {
  buildOfficeCompetitiveLandscapeData,
  buildOfficeDevelopmentAssumptionsData,
  buildOfficeImplicationsData,
  buildOfficeMarketMetricsData,
  buildOfficeMarketOverviewData,
  buildOfficeMarketSummaryData,
  buildOfficeOperationalExpensesData,
  buildOfficeOperationalPnlData,
  buildOfficeOperationalRevenuesData,
  buildOfficeRiskFactorsData,
  buildOfficeSuccessFactorsData,
  buildOfficeSupplyPipelineData,
  buildOfficeTenantProfileData,
} from "@/lib/feasibility/build-office-market-data";
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

function formatOfficePositioningLabel(positioning?: string): string {
  const map: Record<string, string> = {
    premium: "Premium",
    grade_a: "Grade A",
    grade_b: "Grade B",
    grade_c: "Grade C",
  };
  const key = (positioning ?? "grade_a").toLowerCase();
  if (map[key]) return map[key];
  return positioning
    ? positioning
        .split(/[\s_]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : "Grade A";
}

function formatOfficeSegmentLabel(segment?: string): string {
  if (!segment?.trim()) return "High-Rise Tower";
  return segment
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** e.g. "Grade A Prime Tower Office & Retail Tower" from BENCHMARK office profile */
export function buildOfficeBenchmarkTitleLabel(
  officePositioning?: string,
  officeSegment?: string
): string {
  const grade = formatOfficePositioningLabel(officePositioning);
  const type = formatOfficeSegmentLabel(officeSegment);
  return `${grade} ${type} Office & Retail Tower`;
}

function commentary(
  bundle: FeasibilityProjectBundle,
  section: OfficeCommentarySection
): string[] {
  return cleanAIContent(generateOfficeCommentaryFallback(section, bundle));
}

/** AI-enriched slide sections for office operational stream. */
export const OFFICE_AI_SLIDE_SECTIONS: Array<{
  slideId: string;
  section: OfficeCommentarySection;
}> = [
  { slideId: "exec-1", section: "Executive Summary" },
  { slideId: "office-project-overview", section: "Project Overview" },
  { slideId: "macro-1", section: "Macro - GDP" },
  { slideId: "macro-2", section: "Macro - Inflation" },
  { slideId: "macro-3", section: "Macro - Population" },
  { slideId: "macro-4", section: "Macro - Macro Summary" },
  {
    slideId: "office-market-overview",
    section: "Market - Office & Retail Market Overview & Demand Drivers",
  },
  {
    slideId: "office-market-metrics",
    section: "Market - Historical & Projected Market Metrics (Rents, Vacancy, Yields)",
  },
  {
    slideId: "office-supply-pipeline",
    section: "Market - Current & Projected Supply Pipeline",
  },
  {
    slideId: "office-competitive-landscape",
    section: "Market - Competitive Landscape & Benchmarking",
  },
  {
    slideId: "office-tenant-profile",
    section: "Market - Target Tenant & Catchment Profile",
  },
  {
    slideId: "office-market-summary",
    section: "Market - Market Summary & Project Implications",
  },
  { slideId: "office-implications", section: "Market Implications" },
  { slideId: "office-success-factors", section: "Success Factors" },
  { slideId: "office-risk-factors", section: "Risk Factors" },
  { slideId: "office-dev-assumptions", section: "Development Assumptions" },
  { slideId: "office-operational-revenues", section: "Operational Revenues" },
  { slideId: "office-operational-expenses", section: "Operational Expenses" },
];

/** Client-side Puter.js commentary (dynamic import keeps this file server-safe). */
export async function generateOfficeCommentary(
  section: OfficeCommentarySection,
  bundle: FeasibilityProjectBundle,
  options?: {
    cacheKey?: string;
    forceRegenerate?: boolean;
    slideId?: string;
  }
): Promise<string[]> {
  const { aiProvider, COMMENTARY_LENGTH_CONSTRAINT, COMMENTARY_FORMAT_CONSTRAINT } =
    await import("@/lib/ai-service");
  const prompt = `${buildOfficeCommentaryPrompt(section, bundle)}\n\n${COMMENTARY_LENGTH_CONSTRAINT}\n\n${COMMENTARY_FORMAT_CONSTRAINT}`;

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

/** Generate office deck with localStorage-cached Puter AI commentary. */
export async function generateOfficeSlidesWithPuter(
  bundle: FeasibilityProjectBundle,
  options: OperationalSlideCacheOptions = {}
): Promise<OperationalSlideCacheResult> {
  const baseSlides = generateOfficeSlides(bundle);
  return enrichOperationalSlidesWithCache(
    baseSlides,
    bundle,
    OFFICE_AI_SLIDE_SECTIONS,
    (section, b, opts) =>
      generateOfficeCommentary(section as OfficeCommentarySection, b, {
        cacheKey: opts.cacheKey,
        forceRegenerate: opts.forceRegenerate,
      }),
    options
  );
}

function generateOfficeExecutiveSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  const ctx = getOfficeContext(bundle);
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
            ["Total Development Cost (TDC)", fmtOfficeMoney(c4.tdc, c, true)],
            ["Gross Development Value (GDV)", fmtOfficeMoney(c4.gdv, c, true)],
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

function generateOfficeProjectSlide(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide {
  const ctx = getOfficeContext(bundle);
  const c = ctx.currency;

  return {
    id: "office-project-overview",
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
          ["Asset Type", "Prime Office + Retail Mixed-Use"],
          ["Total Office GLA (sqft)", ctx.officeGla.toLocaleString()],
          ["Total Retail GLA (sqft)", ctx.retailGla.toLocaleString()],
          ["Construction Period (months)", String(ctx.constructionPeriod)],
          ["Total Development Cost (TDC)", fmtOfficeMoney(ctx.tdc, c, true)],
        ],
      },
    ],
  };
}

function generateOfficeMarketSlides(
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

  const marketTitle = "Industry / Market Analysis - Office & Retail";

  return [
    ...macroSlides,
    {
      id: "office-market-overview",
      section: "market",
      title: marketTitle,
      subtitle: "Office & Retail Market Overview & Demand Drivers",
      paragraphs: commentary(bundle, "Market - Office & Retail Market Overview & Demand Drivers"),
      data: buildOfficeMarketOverviewData(bundle),
    },
    {
      id: "office-market-metrics",
      section: "market",
      title: marketTitle,
      subtitle: "Historical & Projected Market Metrics (Rents, Vacancy, Yields)",
      paragraphs: commentary(bundle, "Market - Historical & Projected Market Metrics (Rents, Vacancy, Yields)"),
      data: buildOfficeMarketMetricsData(bundle),
    },
    {
      id: "office-supply-pipeline",
      section: "market",
      title: marketTitle,
      subtitle: "Current & Projected Supply Pipeline",
      paragraphs: commentary(bundle, "Market - Current & Projected Supply Pipeline"),
      data: buildOfficeSupplyPipelineData(bundle),
    },
    {
      id: "office-competitive-landscape",
      section: "market",
      title: marketTitle,
      subtitle: "Competitive Landscape & Benchmarking",
      paragraphs: commentary(bundle, "Market - Competitive Landscape & Benchmarking"),
      data: buildOfficeCompetitiveLandscapeData(bundle),
    },
    {
      id: "office-tenant-profile",
      section: "market",
      title: marketTitle,
      subtitle: "Target Tenant & Catchment Profile",
      paragraphs: commentary(bundle, "Market - Target Tenant & Catchment Profile"),
      data: buildOfficeTenantProfileData(bundle),
    },
    {
      id: "office-market-summary",
      section: "market",
      title: "Summary of office & retail market",
      subtitle: "Key findings",
      paragraphs: commentary(bundle, "Market - Market Summary & Project Implications"),
      data: buildOfficeMarketSummaryData(bundle),
    },
    {
      id: "office-implications",
      section: "market",
      title: "Implications of the market findings on the Project",
      subtitle: "Mixed-Use",
      paragraphs: commentary(bundle, "Market Implications"),
      data: buildOfficeImplicationsData(bundle),
    },
    {
      id: "office-success-factors",
      section: "market",
      title: "Key Success and Risk Factors",
      subtitle: "Potential Success Factors and Their Impact",
      paragraphs: commentary(bundle, "Success Factors"),
      data: buildOfficeSuccessFactorsData(bundle),
    },
    {
      id: "office-risk-factors",
      section: "market",
      title: "Key Success and Risk Factors",
      subtitle: "Potential Risk Factors and Their Mitigations",
      paragraphs: commentary(bundle, "Risk Factors"),
      data: buildOfficeRiskFactorsData(bundle),
    },
  ];
}

function generateOfficeFinancialSlides(
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
      id: "office-dev-assumptions",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Development Assumptions — General Mixed-Use Assumptions",
      paragraphs: commentary(bundle, "Development Assumptions"),
      data: buildOfficeDevelopmentAssumptionsData(bundle),
    },
    schedule
      ? {
          ...schedule,
          subtitle: "Mixed-Use Development Schedule",
          paragraphs: commentary(bundle, "Development Schedule"),
        }
      : {
          id: "fin-dev-schedule",
          section: "financial",
          title: "Financial Analysis",
          subtitle: "Mixed-Use Development Schedule",
          paragraphs: commentary(bundle, "Development Schedule"),
        },
    {
      id: "office-operational-revenues",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Assumptions - Revenues",
      paragraphs: commentary(bundle, "Operational Revenues"),
      data: buildOfficeOperationalRevenuesData(bundle),
    },
    {
      id: "office-operational-expenses",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Assumptions - Expenses",
      paragraphs: commentary(bundle, "Operational Expenses"),
      data: buildOfficeOperationalExpensesData(bundle),
    },
    {
      id: "office-operational-pnl",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Operational Profit & Loss",
      paragraphs: [],
      data: buildOfficeOperationalPnlData(bundle),
    },
    ...tail.map((slide) => ({
      ...slide,
      title: slide.title === "Financial Feasibility Study" ? "Financial Analysis" : slide.title,
    })),
  ];
}

/** Full office + retail mixed-use feasibility deck. */
export function generateOfficeSlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  return [
    generateTitleSlide(bundle),
    ...generateOfficeExecutiveSlides(bundle),
    generateOfficeProjectSlide(bundle),
    ...generateOfficeMarketSlides(bundle),
    ...generateOfficeFinancialSlides(bundle),
  ];
}

export default generateOfficeSlides;
