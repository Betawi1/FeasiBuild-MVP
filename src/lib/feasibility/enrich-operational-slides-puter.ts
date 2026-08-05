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
import { enrichHospitalityMarketCharts } from "@/lib/feasibility/hospitality-market-charts";

export type OperationalAssetType =
  | "hotel"
  | "mall"
  | "office"
  | "btr"
  | "warehouse"
  | "datacentre";

export interface EnrichOperationalSlidesOptions {
  oldHashes?: Record<string, string>;
  forceRegenerate?: boolean;
  assetType: OperationalAssetType;
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

export function resolveOperationalAssetType(
  buildingType: string,
  assetType?: string
): OperationalAssetType {
  const bt = (buildingType ?? "").toLowerCase().trim();
  const at = (assetType ?? "").toLowerCase().trim();

  const isDataCentre =
    bt === "data_centre" ||
    bt === "datacentre" ||
    bt === "data-centre" ||
    bt === "datacenter" ||
    bt.includes("data_centre") ||
    bt.includes("datacentre") ||
    bt.includes("data centre") ||
    bt.includes("data-centre") ||
    bt.includes("datacenter") ||
    bt.includes("data center") ||
    at === "data_centre" ||
    at === "datacentre" ||
    at.includes("data_centre") ||
    at.includes("datacentre") ||
    at.includes("data centre") ||
    at.includes("data-centre") ||
    at.includes("datacenter") ||
    at.includes("data center");

  // Data Centre must win before residential/BTR/warehouse — leftover
  // residentialHoldSnapshot or prior assetType strings must not steal the route.
  if (isDataCentre) {
    console.log("[Feasibility AssetType] resolved → datacentre", {
      buildingType,
      assetType,
    });
    return "datacentre";
  }

  if (bt === "hotel" || at.includes("hotel")) {
    console.log("[Feasibility AssetType] resolved → hotel", {
      buildingType,
      assetType,
    });
    return "hotel";
  }
  if (bt === "office" || at.includes("office")) {
    console.log("[Feasibility AssetType] resolved → office", {
      buildingType,
      assetType,
    });
    return "office";
  }
  if (
    bt === "retail" ||
    at.includes("retail") ||
    at.includes("mall") ||
    at.includes("shopping")
  ) {
    console.log("[Feasibility AssetType] resolved → mall", {
      buildingType,
      assetType,
    });
    return "mall";
  }
  if (
    bt === "residential" ||
    (at.includes("residential") && !isDataCentre) ||
    (at.includes("btr") && !isDataCentre)
  ) {
    console.log("[Feasibility AssetType] resolved → btr", {
      buildingType,
      assetType,
    });
    return "btr";
  }
  if (
    bt.includes("warehouse") ||
    bt.includes("industrial") ||
    at.includes("warehouse") ||
    at.includes("industrial")
  ) {
    console.log("[Feasibility AssetType] resolved → warehouse", {
      buildingType,
      assetType,
    });
    return "warehouse";
  }
  console.warn(
    "[Feasibility AssetType] unresolved — defaulting to hotel",
    { buildingType, assetType }
  );
  return "hotel";
}

/**
 * After asset commentary enrichment, overwrite macro-1/2/3 chart series with
 * Puter AI data when available. On null/failure, keep static buildMacroSlides charts.
 */
async function enrichOperationalMacroCharts(
  slides: FeasibilitySlide[],
  country: string,
  forceRegenerate: boolean
): Promise<FeasibilitySlide[]> {
  const enriched = [...slides];

  await Promise.all(
    Object.entries(OPERATIONAL_MACRO_SLIDE_CHART_TYPE).map(
      async ([slideId, macroType]) => {
        const idx = enriched.findIndex((s) => s.id === slideId);
        if (idx < 0) return;

        const cacheKey = buildOperationalMacroChartCacheKey(country, macroType);
        const chart = await generateOperationalMacroChartData(
          macroType,
          country,
          cacheKey,
          forceRegenerate
        );

        // Fallback: keep original static charts from buildMacroSlides / macro-data.ts
        if (!chart) return;

        enriched[idx] = {
          ...enriched[idx]!,
          charts: [chart],
        };
      }
    )
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
  const result = await generateOperationalMarketChartData(
    marketAssetType,
    location,
    projectContext,
    cacheKey,
    forceRegenerate
  );

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
  const result = await generateOperationalSupplyPipelineData(
    marketAssetType,
    location,
    projectContext,
    cacheKey,
    forceRegenerate
  );

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
  const result = await generateOperationalTenantProfileData(
    marketAssetType,
    location,
    projectContext,
    cacheKey,
    forceRegenerate
  );

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
  const { forceRegenerate = false, assetType, oldHashes = {} } = options;
  const cacheOpts = { forceRegenerate, oldHashes };

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
        (bundle.buildingType ?? "").toLowerCase() !== "data_centre" &&
        !(bundle.dataCentreMetrics?.itLoadMw ?? 0)
      ) {
        console.error(
          "ERROR: Feasibility study generator received wrong asset type:",
          bundle.buildingType
        );
      }
      result = await generateDataCentreSlidesWithPuter(bundle, cacheOpts);
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

  let slides = await enrichOperationalMacroCharts(
    result.slides,
    country,
    forceRegenerate
  );

  if (assetType === "hotel") {
    slides = await enrichHospitalityMarketCharts(
      slides,
      { city, country },
      projectContext,
      forceRegenerate
    );
  }

  slides = await enrichOperationalMarketCharts(
    slides,
    assetType,
    { city, country },
    projectContext,
    forceRegenerate
  );

  slides = await enrichOperationalSupplyPipeline(
    slides,
    assetType,
    { city, country },
    projectContext,
    forceRegenerate
  );

  slides = await enrichOperationalTenantProfile(
    slides,
    assetType,
    { city, country },
    projectContext,
    forceRegenerate
  );

  return { ...result, slides };
}

export async function generateOperationalSlidesWithPuter(
  bundle: FeasibilityProjectBundle,
  buildingType: string,
  options: Omit<EnrichOperationalSlidesOptions, "assetType"> = {}
): Promise<EnrichOperationalSlidesResult> {
  // Prefer live model buildingType; fall back to bundle fields.
  const resolvedBuildingType =
    buildingType ||
    bundle.buildingType ||
    bundle.aggregate?.assetType ||
    "";
  const resolvedAssetHint =
    bundle.buildingType || bundle.assetType || bundle.aggregate?.assetType;

  console.log("[Feasibility AssetType] detect inputs", {
    pageBuildingType: buildingType,
    bundleBuildingType: bundle.buildingType,
    bundleAssetType: bundle.assetType,
    aggregateAssetType: bundle.aggregate?.assetType,
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
    resolvedAssetHint
  );

  console.log(
    `[Feasibility AssetType] projectInfo.buildingType=${JSON.stringify(buildingType)} → route=${assetType}`
  );

  return enrichOperationalSlidesWithPuter(bundle, {
    ...options,
    assetType,
  });
}
