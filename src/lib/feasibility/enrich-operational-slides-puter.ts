"use client";

import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import {
  generateBTRSlidesWithPuter,
  BTR_AI_SLIDE_SECTIONS,
} from "@/lib/feasibility/generate-btr-report";
import {
  generateHotelSlidesWithPuter,
  HOTEL_AI_SLIDE_SECTIONS,
} from "@/lib/feasibility/generate-hotel-report";
import {
  generateShoppingMallSlidesWithPuter,
  MALL_AI_SLIDE_SECTIONS,
} from "@/lib/feasibility/generate-shopping-mall-report";
import {
  generateOfficeSlidesWithPuter,
  OFFICE_AI_SLIDE_SECTIONS,
} from "@/lib/feasibility/generate-office-report";
import {
  generateWarehouseSlidesWithPuter,
  WAREHOUSE_AI_SLIDE_SECTIONS,
} from "@/lib/feasibility/generate-warehouse-report";
import {
  generateDataCentreSlidesWithPuter,
  DATACENTRE_AI_SLIDE_SECTIONS,
} from "@/lib/feasibility/generate-data-centre-report";
import {
  buildOperationalMacroChartCacheKey,
  generateOperationalMacroChartData,
  OPERATIONAL_MACRO_SLIDE_CHART_TYPE,
} from "@/lib/feasibility/operational-macro-chart";
import {
  buildOperationalMarketChartCacheKey,
  buildOperationalSupplyPipelineCacheKey,
  buildOperationalTenantProfileCacheKey,
  generateOperationalMarketChartData,
  generateOperationalSupplyPipelineData,
  generateOperationalTenantProfileData,
  mapEnrichAssetToMarketChartType,
  OPERATIONAL_MARKET_METRICS_SLIDE_IDS,
  OPERATIONAL_SUPPLY_PIPELINE_SLIDE_IDS,
  OPERATIONAL_TENANT_PROFILE_SLIDE_IDS,
  type OperationalAssetType as OperationalMarketAssetType,
} from "@/lib/feasibility/operational-market-charts";
import {
  enrichHospitalityMarketCharts,
  HOSPITALITY_SLIDE_CHART_TYPE,
} from "@/lib/feasibility/hospitality-market-charts";
import { mapInEnrichmentOrder } from "@/lib/feasibility/enrichment-pool";
import { resetEnrichmentDiagnostics } from "@/lib/feasibility/enrichment-ladder";
import {
  logStoreEnrichmentDiagnostics,
  publishBaseDeck,
  publishEnrichmentSlide,
} from "@/lib/feasibility/enrichment-publish";
import type { CommentaryQuality } from "@/lib/feasibility/operational-slide-cache";
import { useFeasibilityStore } from "@/store/useFeasibilityStore";
import { sendOpsAlert } from "@/lib/ops-monitor";
import {
  resolveOperationalAssetType,
  type OperationalAssetType,
} from "@/lib/feasibility/operational-asset-class";

export { resolveOperationalAssetType, type OperationalAssetType };

export interface EnrichOperationalSlidesOptions {
  oldHashes?: Record<string, string>;
  forceRegenerate?: boolean;
  assetType: OperationalAssetType;
  /** Re-run only these slide ids. Does not clear cache or rebuild the deck. */
  onlySlideIds?: string[];
  /** Deck is in memory and the page can leave the full-screen loader. */
  onDeckReady?: () => void;
}

export interface EnrichOperationalSlidesResult {
  slides: FeasibilitySlide[];
  hashes: Record<string, string>;
}

export {
  HOTEL_AI_SLIDE_SECTIONS,
  MALL_AI_SLIDE_SECTIONS,
  OFFICE_AI_SLIDE_SECTIONS,
  BTR_AI_SLIDE_SECTIONS,
  WAREHOUSE_AI_SLIDE_SECTIONS,
  DATACENTRE_AI_SLIDE_SECTIONS,
};

/**
 * After asset commentary enrichment, overwrite macro-1/2/3 chart series with
 * Puter AI data when available. On null/failure, keep static buildMacroSlides charts.
 */
function sectionIdsFor(
  assetType: OperationalAssetType
): Array<{ slideId: string }> {
  switch (assetType) {
    case "mall":
      return MALL_AI_SLIDE_SECTIONS;
    case "office":
      return OFFICE_AI_SLIDE_SECTIONS;
    case "btr":
      return BTR_AI_SLIDE_SECTIONS;
    case "warehouse":
      return WAREHOUSE_AI_SLIDE_SECTIONS;
    case "datacentre":
      return DATACENTRE_AI_SLIDE_SECTIONS;
    default:
      return HOTEL_AI_SLIDE_SECTIONS;
  }
}

function chartIdsWeWillRun(
  assetType: OperationalAssetType,
  slides: FeasibilitySlide[]
): string[] {
  const present = new Set(slides.map((s) => s.id));
  const ids: string[] = [];
  for (const id of Object.keys(OPERATIONAL_MACRO_SLIDE_CHART_TYPE)) {
    if (present.has(id)) ids.push(id);
  }
  if (assetType === "hotel") {
    for (const id of Object.keys(HOSPITALITY_SLIDE_CHART_TYPE)) {
      if (present.has(id)) ids.push(id);
    }
  }
  const marketAsset = mapEnrichAssetToMarketChartType(assetType);
  for (const group of [
    OPERATIONAL_MARKET_METRICS_SLIDE_IDS[marketAsset] ?? [],
    OPERATIONAL_SUPPLY_PIPELINE_SLIDE_IDS[marketAsset] ?? [],
    OPERATIONAL_TENANT_PROFILE_SLIDE_IDS[marketAsset] ?? [],
  ]) {
    const id = firstPresentSlideId(slides, group);
    if (id) ids.push(id);
  }
  return ids;
}

function firstPresentSlideId(
  slides: FeasibilitySlide[],
  candidates: string[]
): string | undefined {
  return slides.find((s) => candidates.includes(s.id))?.id;
}

function operationalAiSlideIds(
  assetType: OperationalAssetType,
  slides: FeasibilitySlide[]
): string[] {
  const present = new Set(slides.map((s) => s.id));
  const ids = new Set<string>();
  for (const { slideId } of sectionIdsFor(assetType)) {
    if (present.has(slideId)) ids.add(slideId);
  }
  for (const id of Object.keys(OPERATIONAL_MACRO_SLIDE_CHART_TYPE)) {
    if (present.has(id)) ids.add(id);
  }
  if (assetType === "hotel") {
    for (const id of Object.keys(HOSPITALITY_SLIDE_CHART_TYPE)) {
      if (present.has(id)) ids.add(id);
    }
  }
  const marketAsset = mapEnrichAssetToMarketChartType(assetType);
  for (const group of [
    OPERATIONAL_MARKET_METRICS_SLIDE_IDS[marketAsset] ?? [],
    OPERATIONAL_SUPPLY_PIPELINE_SLIDE_IDS[marketAsset] ?? [],
    OPERATIONAL_TENANT_PROFILE_SLIDE_IDS[marketAsset] ?? [],
  ]) {
    const id = firstPresentSlideId(slides, group);
    if (id) ids.add(id);
  }
  return [...ids];
}

async function enrichOperationalMacroCharts(
  slides: FeasibilitySlide[],
  country: string,
  forceRegenerate: boolean,
  options?: {
    onlySlideIds?: string[];
    onSlide?: (slide: FeasibilitySlide, ok: boolean) => void;
  }
): Promise<FeasibilitySlide[]> {
  const enriched = [...slides];
  const only = options?.onlySlideIds?.length
    ? new Set(options.onlySlideIds)
    : null;

  await mapInEnrichmentOrder(
    Object.entries(OPERATIONAL_MACRO_SLIDE_CHART_TYPE),
    async ([slideId, macroType]) => {
      if (only && !only.has(slideId)) return;
      const idx = enriched.findIndex((s) => s.id === slideId);
      if (idx < 0) return;

      const cacheKey = buildOperationalMacroChartCacheKey(country, macroType);
      try {
        const chart = await generateOperationalMacroChartData(
          macroType,
          country,
          cacheKey,
          forceRegenerate || Boolean(only?.has(slideId)),
          slideId
        );
        if (!chart) {
          options?.onSlide?.(enriched[idx]!, false);
          return;
        }
        enriched[idx] = {
          ...enriched[idx]!,
          charts: [chart],
        };
        options?.onSlide?.(enriched[idx]!, true);
      } catch {
        options?.onSlide?.(enriched[idx]!, false);
      }
    }
  );

  return enriched;
}

/**
 * Replace Historical & Projected Market Metrics charts + commentary with
 * asset-specific AI research. On failure, keep static builder charts/data.
 */
async function enrichOperationalMarketCharts(
  slides: FeasibilitySlide[],
  enrichAssetType: OperationalAssetType,
  location: { city: string; country: string },
  projectContext: {
    assetType: string;
    city: string;
    country: string;
    currency?: string;
    segment?: string;
    positioning?: string;
  },
  forceRegenerate: boolean
): Promise<FeasibilitySlide[]> {
  const marketAssetType: OperationalMarketAssetType =
    mapEnrichAssetToMarketChartType(enrichAssetType);

  const candidateIds = OPERATIONAL_MARKET_METRICS_SLIDE_IDS[marketAssetType] ?? [];
  const idx = slides.findIndex((s) => candidateIds.includes(s.id));
  if (idx < 0) return slides;

  const cacheKey = buildOperationalMarketChartCacheKey(marketAssetType, location);
  const slideId = slides[idx]!.id;
  let result: Awaited<ReturnType<typeof generateOperationalMarketChartData>> = null;
  try {
    result = await generateOperationalMarketChartData(
      marketAssetType,
      location,
      projectContext,
      cacheKey,
      forceRegenerate,
      slideId
    );
  } catch {
    return slides;
  }

  // Fallback: keep existing static charts / RetailMarketMetricsData
  if (!result) return slides;

  const enriched = [...slides];
  const prev = enriched[idx]!;
  enriched[idx] = {
    ...prev,
    charts: [result.chart1, result.chart2],
    paragraphs: result.commentary,
    bulletPoints: result.commentary,
  };
  return enriched;
}

function formatSupplySummaryValue(
  value: number,
  unit: string,
  kind: "stock" | "pipeline" | "share"
): string {
  if (kind === "share") {
    return `${Math.round(value * 10) / 10}%`;
  }
  if (unit === "m sqft" || unit === "MW") {
    return `${(Math.round(value * 100) / 100).toLocaleString()} ${unit}`;
  }
  return `${Math.round(value).toLocaleString()} ${unit}`;
}

/**
 * Replace Current & Projected Supply Pipeline chart + commentary with
 * asset-specific AI research. On failure, keep static builder charts/data.
 */
async function enrichOperationalSupplyPipeline(
  slides: FeasibilitySlide[],
  enrichAssetType: OperationalAssetType,
  location: { city: string; country: string },
  projectContext: {
    assetType: string;
    city: string;
    country: string;
    currency?: string;
    segment?: string;
    positioning?: string;
    gla?: number;
    bua?: number;
    subjectSize?: number;
  },
  forceRegenerate: boolean
): Promise<FeasibilitySlide[]> {
  const marketAssetType: OperationalMarketAssetType =
    mapEnrichAssetToMarketChartType(enrichAssetType);

  const candidateIds =
    OPERATIONAL_SUPPLY_PIPELINE_SLIDE_IDS[marketAssetType] ?? [];
  const idx = slides.findIndex((s) => candidateIds.includes(s.id));
  if (idx < 0) return slides;

  const cacheKey = buildOperationalSupplyPipelineCacheKey(
    marketAssetType,
    location
  );
  const slideId = slides[idx]!.id;
  let result: Awaited<
    ReturnType<typeof generateOperationalSupplyPipelineData>
  > = null;
  try {
    result = await generateOperationalSupplyPipelineData(
      marketAssetType,
      location,
      projectContext,
      cacheKey,
      forceRegenerate,
      slideId
    );
  } catch {
    return slides;
  }

  // Fallback: keep existing static RetailSupplyPipelineData charts
  if (!result) return slides;

  const summary = result.summaryTable;
  const unit = summary?.unit ?? "m sqft";
  const summaryRows = summary
    ? [
        {
          label: `Existing stock (${unit})`,
          value: formatSupplySummaryValue(summary.existingStock, unit, "stock"),
        },
        {
          label: `Pipeline (${unit})`,
          value: formatSupplySummaryValue(summary.pipeline, unit, "pipeline"),
        },
        {
          label: "Subject share of stock",
          value: formatSupplySummaryValue(
            summary.subjectShareOfStock,
            unit,
            "share"
          ),
        },
      ]
    : undefined;

  const enriched = [...slides];
  const prev = enriched[idx]!;
  enriched[idx] = {
    ...prev,
    charts: [result.chart],
    paragraphs: result.commentary,
    bulletPoints: result.commentary,
    ...(summaryRows
      ? {
          summaryTable: { rows: summaryRows },
          tables: [
            {
              title: "Supply Summary",
              headers: ["Metric", "Value"],
              rows: summaryRows.map((r) => [r.label, String(r.value)]),
            },
            ...(prev.tables ?? []).filter((t) => t.title !== "Supply Summary"),
          ],
        }
      : {}),
  };
  return enriched;
}

/**
 * Replace Target Tenant & Catchment Profile with asset-specific AI research.
 * On failure, keep static RetailTenantProfileData builders.
 */
async function enrichOperationalTenantProfile(
  slides: FeasibilitySlide[],
  enrichAssetType: OperationalAssetType,
  location: { city: string; country: string },
  projectContext: {
    assetType: string;
    city: string;
    country: string;
    currency?: string;
    segment?: string;
    positioning?: string;
    gla?: number;
    bua?: number;
    subjectSize?: number;
    keys?: number;
  },
  forceRegenerate: boolean
): Promise<FeasibilitySlide[]> {
  const marketAssetType: OperationalMarketAssetType =
    mapEnrichAssetToMarketChartType(enrichAssetType);

  const candidateIds =
    OPERATIONAL_TENANT_PROFILE_SLIDE_IDS[marketAssetType] ?? [];
  const idx = slides.findIndex((s) => candidateIds.includes(s.id));
  if (idx < 0) return slides;

  const cacheKey = buildOperationalTenantProfileCacheKey(
    marketAssetType,
    location
  );
  const slideId = slides[idx]!.id;
  let result: Awaited<
    ReturnType<typeof generateOperationalTenantProfileData>
  > = null;
  try {
    result = await generateOperationalTenantProfileData(
      marketAssetType,
      location,
      projectContext,
      cacheKey,
      forceRegenerate,
      slideId
    );
  } catch {
    return slides;
  }

  if (!result) return slides;

  const waleLine = `Target WALE: ${result.targetWALE.min} – ${result.targetWALE.max} years · Catchment: ${result.catchmentRadius}`;

  const enriched = [...slides];
  const prev = enriched[idx]!;
  enriched[idx] = {
    ...prev,
    charts: [result.pieChart],
    paragraphs: result.commentary,
    bulletPoints: [waleLine, ...result.catchmentDemographics],
    data: result.tenantProfileData,
  };

  return enriched;
}

/**
 * Client-side: enrich operational slides with Puter.js AI commentary,
 * then AI-researched macro / market metrics / supply / tenant profile charts.
 * Delegates commentary to asset-specific generators that use localStorage caching.
 */
export async function enrichOperationalSlidesWithPuter(
  bundle: FeasibilityProjectBundle,
  options: EnrichOperationalSlidesOptions
): Promise<EnrichOperationalSlidesResult> {
  try {
    return await enrichOperationalSlidesWithPuterImpl(bundle, options);
  } catch (error) {
    void sendOpsAlert(error instanceof Error ? error : String(error), {
      source: "Feasibility Enrichment",
      assetType: options.assetType,
    });
    throw error;
  }
}

function settleChartSlide(
  slide: FeasibilitySlide,
  ok: boolean,
  commentaryQuality: Map<string, CommentaryQuality>,
  combineCommentary: boolean
): void {
  if (!ok) {
    publishEnrichmentSlide(slide, "failed");
    return;
  }
  if (!combineCommentary) {
    publishEnrichmentSlide(slide, "ok");
    return;
  }
  const quality = commentaryQuality.get(slide.id) ?? "ok";
  publishEnrichmentSlide(slide, quality === "fallback" ? "fallback" : "ok");
}

async function enrichOperationalSlidesWithPuterImpl(
  bundle: FeasibilityProjectBundle,
  options: EnrichOperationalSlidesOptions
): Promise<EnrichOperationalSlidesResult> {
  const {
    forceRegenerate = false,
    assetType,
    oldHashes = {},
    onlySlideIds,
    onDeckReady,
  } = options;
  resetEnrichmentDiagnostics();
  const retrying = Boolean(onlySlideIds?.length);
  const commentaryQuality = new Map<string, CommentaryQuality>();
  const deferredCharts = new Set<string>();
  const cacheOpts = {
    forceRegenerate,
    oldHashes,
    onlySlideIds,
    baseSlides: retrying ? useFeasibilityStore.getState().slides : undefined,
    onDeckReady: (base: FeasibilitySlide[]) => {
      deferredCharts.clear();
      for (const id of chartIdsWeWillRun(assetType, base)) {
        deferredCharts.add(id);
      }
      if (retrying) {
        useFeasibilityStore.getState().beginAiSections(onlySlideIds!, "merge");
      } else {
        publishBaseDeck(base, operationalAiSlideIds(assetType, base));
      }
      onDeckReady?.();
    },
    onCommentary: (slide: FeasibilitySlide, quality: CommentaryQuality) => {
      commentaryQuality.set(slide.id, quality);
      if (deferredCharts.has(slide.id)) {
        useFeasibilityStore.getState().patchSlide(slide.id, slide);
        return;
      }
      publishEnrichmentSlide(slide, quality);
    },
  };

  const runSingleChart = async (
    candidateIds: string[],
    run: (force: boolean) => Promise<FeasibilitySlide[]>,
    current: FeasibilitySlide[]
  ): Promise<FeasibilitySlide[]> => {
    const targeted = candidateIds.filter((id) => {
      if (!current.some((s) => s.id === id)) return false;
      if (onlySlideIds?.length && !onlySlideIds.includes(id)) return false;
      return true;
    });
    if (targeted.length === 0) return current;
    const attempted = current.find((s) => targeted.includes(s.id));
    const next = await run(
      forceRegenerate || Boolean(onlySlideIds?.some((id) => targeted.includes(id)))
    );
    if (attempted) {
      const updated = next.find((s) => s.id === attempted.id) ?? attempted;
      settleChartSlide(updated, next !== current, commentaryQuality, false);
    }
    return next;
  };

  let result: EnrichOperationalSlidesResult;
  switch (assetType) {
    case "mall":
      result = await generateShoppingMallSlidesWithPuter(bundle, cacheOpts);
      break;
    case "office":
      result = await generateOfficeSlidesWithPuter(bundle, cacheOpts);
      break;
    case "btr":
      result = await generateBTRSlidesWithPuter(bundle, cacheOpts);
      break;
    case "warehouse":
      console.log("[Feasibility Router] generateWarehouseSlidesWithPuter");
      result = await generateWarehouseSlidesWithPuter(bundle, cacheOpts);
      break;
    case "datacentre":
      console.log("[Feasibility Router] generateDataCentreSlidesWithPuter");
      if (
        resolveOperationalAssetType(bundle.buildingType ?? "") !== "datacentre"
      ) {
        console.error(
          "ERROR: Feasibility study generator received wrong asset type:",
          bundle.buildingType
        );
      }
      result = await generateDataCentreSlidesWithPuter(bundle, cacheOpts);
      break;
    case "hotel":
      console.log("[Feasibility Router] generateHotelSlidesWithPuter");
      result = await generateHotelSlidesWithPuter(bundle, cacheOpts);
      break;
    default:
      console.log("[Feasibility Router] generateHotelSlidesWithPuter (default)");
      result = await generateHotelSlidesWithPuter(bundle, cacheOpts);
      break;
  }

  const country = bundle.location?.country || "Unknown";
  const city = bundle.location?.city || "Unknown";
  const gla = bundle.component1?.bua;
  const bua = bundle.aggregate?.bua ?? bundle.component1?.bua;
  const keys = bundle.component1?.rooms;

  const projectContext = {
    // Prefer resolved enrich router key (datacentre|warehouse|…) over display labels
    assetType: assetType || bundle.assetType,
    city,
    country,
    currency: bundle.currency,
    segment: bundle.segment,
    positioning: bundle.aggregate?.positioning,
    gla,
    bua,
    keys,
    subjectSize:
      assetType === "btr"
        ? keys
        : assetType === "datacentre"
          ? bundle.dataCentreMetrics?.itLoadMw
          : gla
            ? Math.round((gla / 1_000_000) * 100) / 100
            : undefined,
    adrYear1: bundle.component2?.adrYear1,
    adrStabilized: bundle.component2?.adrStabilized,
    occupancyYear1: bundle.component2?.occupancyYear1,
    occupancyStabilized: bundle.component2?.occupancyStabilized,
  };

  const chartOptions = { onlySlideIds };

  let slides = await enrichOperationalMacroCharts(
    result.slides,
    country,
    forceRegenerate,
    {
      ...chartOptions,
      onSlide: (slide, ok) =>
        settleChartSlide(slide, ok, commentaryQuality, true),
    }
  );

  if (assetType === "hotel") {
    slides = await enrichHospitalityMarketCharts(
      slides,
      { city, country },
      projectContext,
      forceRegenerate,
      {
        ...chartOptions,
        onSlide: (slide, ok) =>
          settleChartSlide(slide, ok, commentaryQuality, false),
      }
    );
  }

  const marketAsset = mapEnrichAssetToMarketChartType(assetType);
  slides = await runSingleChart(
    OPERATIONAL_MARKET_METRICS_SLIDE_IDS[marketAsset] ?? [],
    (force) =>
      enrichOperationalMarketCharts(
        slides,
        assetType,
        { city, country },
        projectContext,
        force
      ),
    slides
  );

  slides = await runSingleChart(
    OPERATIONAL_SUPPLY_PIPELINE_SLIDE_IDS[marketAsset] ?? [],
    (force) =>
      enrichOperationalSupplyPipeline(
        slides,
        assetType,
        { city, country },
        projectContext,
        force
      ),
    slides
  );

  slides = await runSingleChart(
    OPERATIONAL_TENANT_PROFILE_SLIDE_IDS[marketAsset] ?? [],
    (force) =>
      enrichOperationalTenantProfile(
        slides,
        assetType,
        { city, country },
        projectContext,
        force
      ),
    slides
  );

  logStoreEnrichmentDiagnostics();
  return { ...result, slides };
}

export async function generateOperationalSlidesWithPuter(
  bundle: FeasibilityProjectBundle,
  buildingType: string,
  options: Omit<EnrichOperationalSlidesOptions, "assetType"> = {}
): Promise<EnrichOperationalSlidesResult> {
  // Stored projectInfo.buildingType is the only source of truth. Do not fall
  // back to aggregate.assetType — that is a display label and leftover
  // "Data Centre" strings must not override hotel / office / etc.
  const resolvedBuildingType = (buildingType || bundle.buildingType || "").trim();
  const assetHint = resolvedBuildingType
    ? undefined
    : bundle.assetType || bundle.aggregate?.assetType;

  console.log("[Feasibility AssetType] detect inputs", {
    pageBuildingType: buildingType,
    bundleBuildingType: bundle.buildingType,
    bundleAssetType: bundle.assetType,
    aggregateAssetType: bundle.aggregate?.assetType,
    resolvedBuildingType,
    assetHint,
    dataCentreMetrics: bundle.dataCentreMetrics
      ? {
          itLoadMw: bundle.dataCentreMetrics.itLoadMw,
          tier: bundle.dataCentreMetrics.tierLevel,
          segment: bundle.dataCentreMetrics.segment,
        }
      : null,
    hasWarehouseMetrics: !!bundle.warehouseMetrics,
    hasResidentialSnapshot: !!bundle.residentialHoldSnapshot,
  });

  const assetType = resolveOperationalAssetType(
    resolvedBuildingType,
    assetHint
  );

  console.log(
    `[Feasibility AssetType] projectInfo.buildingType=${JSON.stringify(resolvedBuildingType)} → route=${assetType}`
  );

  return enrichOperationalSlidesWithPuter(bundle, {
    ...options,
    assetType,
  });
}
