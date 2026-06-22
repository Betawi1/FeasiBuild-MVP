import type {
  FeasibilitySlide,
  SaleFeasibilityBundle,
  SlideChart,
  TitleSlideData,
} from "@/types/feasibility";
import { buildMacroSlides } from "@/lib/feasibility/generate-market-slides";
import {
  generateSaleCommentaryFallback,
  type SaleCommentarySection,
} from "@/lib/feasibility/sale/generate-sale-commentary";
import { fmtSaleMoney } from "@/lib/feasibility/sale/sale-context";
import {
  getSaleStreamConfig,
  type SaleStreamConfig,
} from "@/lib/feasibility/sale/sale-stream-config";
import {
  buildSaleDevelopmentCostsData,
  buildSaleDevelopmentScheduleData,
  buildSaleEscrowWithdrawalData,
  buildSaleIrrMetricsData,
  buildSalePostFinancingCashFlowData,
  buildSaleProjectCashFlowData,
  buildSaleRevolvingCreditData,
  buildSaleSalesSummaryTableData,
  buildSaleSalesUptakeChartData,
  buildSaleScenarioComparisonData,
  buildSaleScenarioResultsData,
} from "@/lib/feasibility/sale/build-sale-financial-data";
import { resolveImplicationsSubtitle } from "@/lib/feasibility/implications-utils";
import {
  buildSaleImplicationsData,
  buildSaleRiskFactorsData,
  buildSaleSuccessFactorsData,
} from "@/lib/feasibility/sale/build-sale-market-data";
import { cleanAIContent } from "@/lib/feasibility/clean-ai-content";
import {
  createPromptForSection,
} from "@/lib/feasibility/sale/create-sale-puter-prompts";

function commentary(
  bundle: SaleFeasibilityBundle,
  section: SaleCommentarySection
): string[] {
  return cleanAIContent(generateSaleCommentaryFallback(section, bundle));
}

/** Client-side Puter.js commentary for sale stream slides. */
export async function generateSaleCommentary(
  section: SaleCommentarySection,
  bundle: SaleFeasibilityBundle,
  options?: { cacheKey?: string; forceRegenerate?: boolean }
): Promise<string[]> {
  const config = getSaleStreamConfig(bundle.buildingSubType);
  const { aiProvider, COMMENTARY_LENGTH_CONSTRAINT, COMMENTARY_FORMAT_CONSTRAINT } =
    await import("@/lib/ai-service");
  const prompt = `${createPromptForSection(section, bundle, config)}\n\n${COMMENTARY_LENGTH_CONSTRAINT}\n\n${COMMENTARY_FORMAT_CONSTRAINT}`;

  const raw = await aiProvider.generateCommentary(prompt, {
    cacheKey: options?.cacheKey,
    forceRegenerate: options?.forceRegenerate,
    section,
  });
  return cleanAIContent(raw);
}

function tallChart(chart: SlideChart): SlideChart {
  return { ...chart, height: "flex-1", width: "w-full" };
}

function withTallCharts(slide: FeasibilitySlide): FeasibilitySlide {
  if (!slide.charts?.length) return slide;
  return { ...slide, charts: slide.charts.map(tallChart) };
}

function generateSaleTitleSlide(bundle: SaleFeasibilityBundle): FeasibilitySlide {
  const profile = bundle.titleProfile;
  const titleData: TitleSlideData = {
    assetType: profile?.assetType ?? getSaleStreamConfig(bundle.buildingSubType).assetLabel,
    segment: bundle.segment,
    starRating: profile?.starRating ?? "—",
    businessType: profile?.businessType,
    country: bundle.location.country,
    city: bundle.location.city,
    isSaleStream: true,
    saleAssetLabel: profile?.saleAssetLabel ?? getSaleStreamConfig(bundle.buildingSubType).assetLabel,
  };
  return {
    id: "title-slide",
    section: "title",
    title: "Title Slide",
    subtitle: "",
    paragraphs: [],
    data: titleData,
  };
}

function generateSaleExecutiveSlides(
  bundle: SaleFeasibilityBundle,
  config: SaleStreamConfig
): FeasibilitySlide[] {
  const c = bundle.currency;
  const c4 = bundle.component4;
  const m = bundle.saleMetrics;

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
            ["Total Development Cost (TDC)", fmtSaleMoney(c4.tdc, c, true)],
            ["Gross Development Value (GDV)", fmtSaleMoney(c4.gdv, c, true)],
            ["Net Proceeds (after deductions)", fmtSaleMoney(m.netProceeds, c, true)],
            ["Unlevered Project IRR", `${c4.projectIRR}%`],
            ["Equity Multiple", `${c4.equityMultiple.toFixed(2)}x`],
            ["Payback Period", `M${m.paybackMonth}`],
          ],
        },
      ],
    },
  ];
}

function generateSaleProjectSlide(
  bundle: SaleFeasibilityBundle,
  config: SaleStreamConfig
): FeasibilitySlide {
  const c = bundle.currency;
  const m = bundle.saleMetrics;
  const saleableLabel = config.areaMetric.includes("NLA")
    ? "Saleable NLA (sqft)"
    : "Saleable BUA (sqft)";
  const costPerSaleable =
    m.saleableArea > 0
      ? `${c} ${Math.round(bundle.component4.tdc / m.saleableArea).toLocaleString()}`
      : "—";

  return {
    id: "sale-project-overview",
    section: "project",
    title: "Project Analysis",
    subtitle: "Overview — The Project",
    paragraphs: commentary(bundle, "Project Overview"),
    tables: [
      {
        title: "Key Project Metrics",
        headers: ["Parameter", "Value"],
        rows: [
          ["Location", `${bundle.location.city}, ${bundle.location.country}`],
          ["Asset Type", config.assetLabel],
          [saleableLabel, m.saleableArea.toLocaleString()],
          ["Total BUA (sqft)", m.totalArea.toLocaleString()],
          ["Construction Period (months)", String(m.constructionMonths)],
          ["Total Development Cost (TDC)", fmtSaleMoney(bundle.component4.tdc, c, true)],
          ["Development Cost per Saleable BUA", costPerSaleable],
        ],
      },
    ],
  };
}

function generateSaleMarketSlides(
  bundle: SaleFeasibilityBundle,
  config: SaleStreamConfig
): FeasibilitySlide[] {
  const macroSlides = buildMacroSlides(bundle.aggregate).map((slide) => {
    const base = withTallCharts(slide);
    if (slide.id === "macro-1") {
      return { ...base, paragraphs: commentary(bundle, "Macro - GDP") };
    }
    if (slide.id === "macro-2") {
      return { ...base, paragraphs: commentary(bundle, "Macro - Inflation") };
    }
    if (slide.id === "macro-3") {
      return { ...base, paragraphs: commentary(bundle, "Macro - Population") };
    }
    if (slide.id === "macro-4") {
      return {
        ...base,
        layout: "full-width" as const,
        paragraphs: commentary(bundle, "Macro - Macro Summary"),
      };
    }
    return base;
  });

  const marketSections: Array<{
    key: SaleCommentarySection;
    id: string;
    title: string;
  }> = [
    { key: "Market - overview", id: "overview", title: config.marketSlideTitles.overview },
    { key: "Market - supplyDemand", id: "supplyDemand", title: config.marketSlideTitles.supplyDemand },
    { key: "Market - pricing", id: "pricing", title: config.marketSlideTitles.pricing },
    { key: "Market - velocity", id: "velocity", title: config.marketSlideTitles.velocity },
    { key: "Market - competition", id: "competition", title: config.marketSlideTitles.competition },
  ];

  return [
    ...macroSlides,
    ...marketSections.map((s) => ({
      id: `sale-market-${s.id}`,
      section: "market" as const,
      title: "Industry / Market Analysis",
      subtitle: s.title,
      paragraphs: commentary(bundle, s.key),
      // Charts populated dynamically via Qwen in /api/feasibility/generate-sale
    })),
    {
      id: "sale-market-summary",
      section: "market",
      layout: "full-width",
      title: "Summary of Real Estate Market",
      subtitle: "Key Findings",
      paragraphs: commentary(bundle, "Market Summary"),
    },
    {
      id: "sale-implications",
      section: "market",
      title: "Implications of the Market Findings on the Project",
      subtitle: resolveImplicationsSubtitle(config.assetLabel),
      paragraphs: commentary(bundle, "Market Implications"),
      data: buildSaleImplicationsData(bundle),
    },
    {
      id: "sale-success-factors",
      section: "market",
      title: "Key Success and Risk Factors",
      subtitle: "Potential Success Factors and Their Impact",
      paragraphs: commentary(bundle, "Success Factors"),
      data: buildSaleSuccessFactorsData(bundle),
    },
    {
      id: "sale-risk-factors",
      section: "market",
      title: "Key Success and Risk Factors",
      subtitle: "Potential Risk Factors and Their Mitigations",
      paragraphs: commentary(bundle, "Risk Factors"),
      data: buildSaleRiskFactorsData(bundle),
    },
  ];
}

function generateSaleFinancialSlides(
  bundle: SaleFeasibilityBundle
): FeasibilitySlide[] {
  return [
    {
      id: "sale-dev-assumptions",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Development Assumptions",
      paragraphs: commentary(bundle, "Development Assumptions"),
      data: buildSaleDevelopmentCostsData(bundle),
    },
    {
      id: "sale-development-schedule",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Development Schedule",
      paragraphs: commentary(bundle, "Development Schedule"),
      data: buildSaleDevelopmentScheduleData(bundle),
    },
    {
      id: "sale-sales-uptake-chart",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Sales & Revenues Assumption",
      paragraphs: commentary(bundle, "Sales Assumptions"),
      data: buildSaleSalesUptakeChartData(bundle),
    },
    {
      id: "sale-sales-summary-table",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Sales & Revenues Assumption",
      paragraphs: [],
      data: buildSaleSalesSummaryTableData(bundle),
    },
    {
      id: "sale-project-cash-flow",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Project Cash Flow Analysis",
      paragraphs: commentary(bundle, "Project Cash Flow"),
      data: buildSaleProjectCashFlowData(bundle),
    },
    {
      id: "sale-rcf",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Revolving Credit Facility",
      paragraphs: commentary(bundle, "Revolving Credit Facility"),
      data: buildSaleRevolvingCreditData(bundle),
    },
    {
      id: "sale-escrow",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Escrow Withdrawal Configuration",
      paragraphs: commentary(bundle, "Escrow Configuration"),
      data: buildSaleEscrowWithdrawalData(bundle),
    },
    {
      id: "sale-post-financing",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Post-Financing Cash Flows",
      paragraphs: commentary(bundle, "Post-Financing Cash Flows"),
      data: buildSalePostFinancingCashFlowData(bundle),
    },
    {
      id: "sale-irr-metrics",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "IRR and Key Financing Metrics",
      paragraphs: commentary(bundle, "IRR Metrics"),
      data: buildSaleIrrMetricsData(bundle),
    },
    {
      id: "sale-scenario-comparison",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Scenario Comparison & IRR Sensitivity",
      paragraphs: commentary(bundle, "Scenario Comparison"),
      data: buildSaleScenarioComparisonData(bundle),
    },
    {
      id: "sale-scenario-results",
      section: "financial",
      title: "Financial Analysis",
      subtitle: "Scenario Analysis Results",
      paragraphs: commentary(bundle, "Scenario Results"),
      data: buildSaleScenarioResultsData(bundle),
    },
  ];
}

/**
 * Sync base deck (fallback paragraphs). For AI-enriched output in the browser,
 * use `generateSaleSlidesWithPuter` from `./enrich-sale-slides-puter` (Puter.js).
 * Server API route uses Qwen via `/api/feasibility/generate-sale`.
 */
export function generateSaleSlides(bundle: SaleFeasibilityBundle): FeasibilitySlide[] {
  const config = getSaleStreamConfig(bundle.buildingSubType);
  return [
    generateSaleTitleSlide(bundle),
    ...generateSaleExecutiveSlides(bundle, config),
    generateSaleProjectSlide(bundle, config),
    ...generateSaleMarketSlides(bundle, config),
    ...generateSaleFinancialSlides(bundle),
  ];
}

export default generateSaleSlides;

/** Component hashes for Layer 2 cache invalidation (used by enrich-sale-slides-puter). */
export { buildSaleBundleHashes } from "@/lib/slide-dependencies";
