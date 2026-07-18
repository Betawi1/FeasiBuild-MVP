"use client";

import type { FeasibilitySlide, SlideChart } from "@/types/feasibility";
import type { SaleFeasibilityBundle } from "@/types/feasibility";
import { getCachedContent, setCachedContent } from "@/lib/cache-service";
import { aiProvider } from "@/lib/ai-service";
import { enrichStructuredSlideData } from "@/lib/feasibility/enrich-structured-slide-data";
import {
  createMacroChartPrompt,
} from "@/lib/feasibility/sale/create-sale-puter-prompts";
import { generateSaleCommentary } from "@/lib/feasibility/sale/generate-sale-report";
import type { SaleCommentarySection } from "@/lib/feasibility/sale/generate-sale-commentary";
import {
  generateSaleMarketChartDataWithPuter,
  SALE_MARKET_CHART_SLIDES,
  type SaleMarketChartSection,
} from "@/lib/feasibility/sale/generate-sale-market-charts";
import {
  getSaleStreamConfig,
  type SaleStreamConfig,
} from "@/lib/feasibility/sale/sale-stream-config";
import {
  buildCommentaryCacheKey,
  buildSaleBundleHashes,
  getSlideDependencySection,
  resetDependencyChangeLog,
  shouldRegenerateSlide,
  type SlideDependencySection,
} from "@/lib/slide-dependencies";

/** Slides that use templated OLD content — skip Puter AI enrichment (slides 22–33) */
const OLD_CONTENT_SLIDE_IDS = new Set([
  "exec-1",
  "sale-project-overview",
  "sale-dev-assumptions",
  "sale-development-schedule",
  "sale-sales-uptake-chart",
  "sale-sales-summary-table",
  "sale-project-cash-flow",
  "sale-rcf",
  "sale-escrow",
  "sale-post-financing",
  "sale-irr-metrics",
  "sale-scenario-comparison",
  "sale-scenario-results",
]);

const SLIDE_SECTIONS: Array<{
  slideId: string;
  section: SaleCommentarySection;
}> = [
  { slideId: "exec-1", section: "Executive Summary" },
  { slideId: "sale-project-overview", section: "Project Overview" },
  { slideId: "macro-1", section: "Macro - GDP" },
  { slideId: "macro-2", section: "Macro - Inflation" },
  { slideId: "macro-3", section: "Macro - Population" },
  { slideId: "macro-4", section: "Macro - Macro Summary" },
  { slideId: "sale-market-overview", section: "Market - overview" },
  { slideId: "sale-market-supplyDemand", section: "Market - supplyDemand" },
  { slideId: "sale-market-pricing", section: "Market - pricing" },
  { slideId: "sale-market-velocity", section: "Market - velocity" },
  { slideId: "sale-market-competition", section: "Market - competition" },
  { slideId: "sale-market-summary", section: "Market Summary" },
  { slideId: "sale-implications", section: "Market Implications" },
  { slideId: "sale-success-factors", section: "Success Factors" },
  { slideId: "sale-risk-factors", section: "Risk Factors" },
  { slideId: "sale-dev-assumptions", section: "Development Assumptions" },
  { slideId: "sale-development-schedule", section: "Development Schedule" },
  { slideId: "sale-sales-uptake-chart", section: "Sales Assumptions" },
  { slideId: "sale-sales-summary-table", section: "Sales Assumptions" },
  { slideId: "sale-project-cash-flow", section: "Project Cash Flow" },
  { slideId: "sale-rcf", section: "Revolving Credit Facility" },
  { slideId: "sale-escrow", section: "Escrow Configuration" },
  { slideId: "sale-post-financing", section: "Post-Financing Cash Flows" },
  { slideId: "sale-irr-metrics", section: "IRR Metrics" },
  { slideId: "sale-scenario-comparison", section: "Scenario Comparison" },
  { slideId: "sale-scenario-results", section: "Scenario Results" },
];

const MACRO_SLIDE_CHART_TYPE: Record<string, string> = {
  "macro-1": "GDP",
  "macro-2": "Inflation",
  "macro-3": "Population",
};

const MARKET_CHART_SLIDE_IDS = new Set(
  SALE_MARKET_CHART_SLIDES.map((s) => s.slideId)
);

export interface EnrichSaleSlidesOptions {
  oldHashes?: Record<string, string>;
  forceRegenerate?: boolean;
}

export interface EnrichSaleSlidesResult {
  slides: FeasibilitySlide[];
  hashes: Record<string, string>;
}

function withTallChart(chart: SlideChart): SlideChart {
  return {
    ...chart,
    height: chart.height ?? "flex-1",
    width: chart.width ?? "w-full",
  };
}

function slideNeedsRegeneration(
  slideId: string,
  oldHashes: Record<string, string>,
  newHashes: Record<string, string>,
  forceRegenerate: boolean
): boolean {
  if (forceRegenerate) return true;
  const depSection = getSlideDependencySection(slideId);
  return shouldRegenerateSlide(depSection, oldHashes, newHashes);
}

async function generateSaleCommentaryForSlide(
  section: SaleCommentarySection,
  bundle: SaleFeasibilityBundle,
  config: SaleStreamConfig,
  cacheKey: string,
  forceRegenerate: boolean
): Promise<string[]> {
  return generateSaleCommentary(section, bundle, {
    cacheKey,
    forceRegenerate,
  });
}

async function generateMacroChartData(
  macroType: string,
  country: string,
  cacheKey: string,
  forceRegenerate: boolean
): Promise<SlideChart | null> {
  const prompt = createMacroChartPrompt(macroType, country);
  if (!prompt) return null;

  const result = await aiProvider.generateChartData(prompt, {
    cacheKey,
    forceRegenerate,
  });
  if (!result || typeof result !== "object") return null;

  const chart = result as Partial<SlideChart>;
  if (!chart.data || !Array.isArray(chart.data)) return null;

  return withTallChart({
    type: chart.type === "bar" || chart.type === "line" ? chart.type : "line",
    title: chart.title ?? `${macroType} Trend`,
    data: chart.data,
    xKey: chart.xKey ?? "year",
    yKeys: chart.yKeys ?? ["value"],
    colors: chart.colors,
  });
}

function normalizeCachedChart(raw: unknown): SlideChart | null {
  if (!raw || typeof raw !== "object") return null;
  const chart = raw as Partial<SlideChart>;
  if (!chart.data || !Array.isArray(chart.data)) return null;
  return withTallChart({
    type: chart.type === "bar" || chart.type === "line" ? chart.type : "line",
    title: chart.title ?? "Chart",
    data: chart.data,
    xKey: chart.xKey ?? "year",
    yKeys: chart.yKeys ?? ["value"],
    colors: chart.colors,
  });
}

async function loadCachedSlideContent(
  cacheKey: string
): Promise<{ paragraphs?: string[]; charts?: SlideChart[] } | null> {
  const paragraphs = await getCachedContent<string[]>(cacheKey);
  const chartsCache = await getCachedContent<SlideChart[]>(`${cacheKey}_charts`);
  const macroChart = normalizeCachedChart(
    await getCachedContent(`${cacheKey}_chart`)
  );

  if (!paragraphs?.length && !chartsCache?.length && !macroChart) {
    return null;
  }

  const charts: SlideChart[] = [];
  if (macroChart) charts.push(macroChart);
  if (chartsCache?.length) charts.push(...chartsCache.map(withTallChart));

  return {
    paragraphs: paragraphs ?? undefined,
    charts: charts.length > 0 ? charts : undefined,
  };
}

/**
 * Client-side: enrich sale slides with Puter.js AI commentary and charts.
 * Layer 1: localStorage cache by content hash (via ai-service).
 * Layer 2: skip slides whose component dependencies are unchanged.
 */
export async function enrichSaleSlidesWithPuter(
  slides: FeasibilitySlide[],
  bundle: SaleFeasibilityBundle,
  options: EnrichSaleSlidesOptions = {}
): Promise<EnrichSaleSlidesResult> {
  const { oldHashes = {}, forceRegenerate = false } = options;
  resetDependencyChangeLog();
  const config = getSaleStreamConfig(bundle.buildingSubType);
  const newHashes = buildSaleBundleHashes(bundle);
  const enriched = [...slides];

  for (const { slideId, section } of SLIDE_SECTIONS) {
    if (OLD_CONTENT_SLIDE_IDS.has(slideId)) continue;

    const idx = enriched.findIndex((s) => s.id === slideId);
    if (idx < 0) continue;

    const depSection = getSlideDependencySection(slideId);
    const cacheKey = buildCommentaryCacheKey(slideId, newHashes, depSection);
    const needsRegen = slideNeedsRegeneration(
      slideId,
      oldHashes,
      newHashes,
      forceRegenerate
    );

    if (!needsRegen) {
      const cached = await loadCachedSlideContent(cacheKey);
      if (cached?.paragraphs?.length) {
        console.log(`[Layer 2 Cache Hit] ${slideId} — dependencies unchanged`);
        enriched[idx] = {
          ...enriched[idx]!,
          paragraphs: cached.paragraphs,
          ...(cached.charts ? { charts: cached.charts } : {}),
        };
        continue;
      }
    }

    const paragraphs = await generateSaleCommentaryForSlide(
      section,
      bundle,
      config,
      cacheKey,
      forceRegenerate
    );
    enriched[idx] = { ...enriched[idx]!, paragraphs };

    const macroType = MACRO_SLIDE_CHART_TYPE[slideId];
    if (macroType) {
      const chart = await generateMacroChartData(
        macroType,
        bundle.location.country,
        cacheKey,
        forceRegenerate
      );
      if (chart) {
        enriched[idx] = { ...enriched[idx]!, charts: [chart] };
      }
    }
  }

  const marketNeedsRegen =
    forceRegenerate ||
    shouldRegenerateSlide("market", oldHashes, newHashes);

  let withMarketCharts: FeasibilitySlide[];

  if (!marketNeedsRegen) {
    withMarketCharts = await Promise.all(
      enriched.map(async (slide) => {
        if (!MARKET_CHART_SLIDE_IDS.has(slide.id)) return slide;
        const cacheKey = buildCommentaryCacheKey(
          slide.id,
          newHashes,
          "market" as SlideDependencySection
        );
        const cachedCharts = await getCachedContent<SlideChart[]>(
          `${cacheKey}_charts`
        );
        if (cachedCharts?.length) {
          console.log(`[Layer 2 Chart Cache Hit] ${slide.id}`);
          return {
            ...slide,
            charts: cachedCharts.map(withTallChart),
          };
        }
        return slide;
      })
    );
  } else {
    const fallbackInput = {
      projectInfo: {
        city: bundle.location.city,
        country: bundle.location.country,
        currency: bundle.currency,
        buildingType: bundle.buildingType,
      },
      component2Data: {
        avgPricePSF: bundle.saleMetrics.avgPricePsf,
        saleableBUA: bundle.saleMetrics.saleableArea,
      },
    };

    withMarketCharts = [...enriched];

    for (const { slideId, sectionKey } of SALE_MARKET_CHART_SLIDES) {
      const idx = withMarketCharts.findIndex((s) => s.id === slideId);
      if (idx < 0) continue;

      const cacheKey = buildCommentaryCacheKey(slideId, newHashes, "market");
      const charts = await generateSaleMarketChartDataWithPuter(
        sectionKey as SaleMarketChartSection,
        bundle.location.country,
        bundle.location.city,
        config.assetLabel,
        bundle.saleMetrics.avgPricePsf,
        (prompt, chartCacheKey) =>
          aiProvider.generateChartData(prompt, {
            cacheKey: chartCacheKey,
            forceRegenerate,
          }),
        cacheKey,
        fallbackInput
      );

      if (charts.length > 0) {
        withMarketCharts[idx] = {
          ...withMarketCharts[idx]!,
          charts: charts.map(withTallChart),
        };
        await setCachedContent(`${cacheKey}_charts`, charts);
      }
    }
  }

  const withTallCharts = withMarketCharts.map((slide) => {
    if (!slide.charts?.length) return slide;
    if (
      !MACRO_SLIDE_CHART_TYPE[slide.id] &&
      !MARKET_CHART_SLIDE_IDS.has(slide.id)
    ) {
      return slide;
    }
    return {
      ...slide,
      charts: slide.charts.map(withTallChart),
    };
  });

  return {
    slides: enrichStructuredSlideData(withTallCharts),
    hashes: newHashes,
  };
}

/** Generate full sale deck with Puter AI (base slides + enrichment). */
export async function generateSaleSlidesWithPuter(
  bundle: SaleFeasibilityBundle,
  options: EnrichSaleSlidesOptions = {}
): Promise<EnrichSaleSlidesResult> {
  const { generateSaleSlides } = await import(
    "@/lib/feasibility/sale/generate-sale-report"
  );
  const baseSlides = generateSaleSlides(bundle);
  return enrichSaleSlidesWithPuter(baseSlides, bundle, options);
}
