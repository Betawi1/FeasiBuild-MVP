"use client";

/**
 * Operational-stream-only AI market analysis charts (Historical & Projected Market Metrics).
 * Intentionally self-contained — does NOT import from src/lib/feasibility/sale/.
 */

import type { SlideChart } from "@/types/feasibility";
import { aiProvider } from "@/lib/ai-service";
import { getCachedContent, setCachedContent } from "@/lib/cache-service";

export type OperationalAssetType =
  | "hotel"
  | "retail"
  | "office"
  | "btr"
  | "warehouse"
  | "datacentre";

export type OperationalMarketChartType =
  | "bar"
  | "line"
  | "dual-axis-line-column"
  | "dual-axis-line";

export interface OperationalMarketChartConfig {
  assetType: OperationalAssetType;
  chart1Title: string;
  chart1Type: OperationalMarketChartType;
  chart1Metrics: string[];
  chart2Title: string;
  chart2Type: OperationalMarketChartType;
  chart2Metrics: string[];
  commentaryTopics: string[];
}

export interface OperationalMarketChartResult {
  chart1: SlideChart;
  chart2: SlideChart;
  commentary: string[];
}

export interface OperationalMarketLocation {
  city: string;
  country: string;
}

export interface OperationalMarketProjectContext {
  assetType: string;
  city: string;
  country: string;
  currency?: string;
  segment?: string;
  positioning?: string;
  /** Subject GLA / BUA (sqft) for share-of-stock context */
  gla?: number;
  bua?: number;
  /** Subject unit count (BTR) or capacity MW (datacentre) when known */
  subjectSize?: number;
}

function antiPlaceholderRules(city: string, country: string): string {
  return `
CRITICAL INSTRUCTIONS:
1. DO NOT use generic phrases like "Charts and visualizations are included" or "data unavailable"
2. DO NOT use placeholder text, lorem ipsum, or mention API keys
3. MUST include SPECIFIC numeric data points for ${city}, ${country} (or closest published market)
4. MUST use realistic jurisdiction-specific levels (not copy-paste UAE figures for Malaysia/Australia/etc.)
5. MUST generate 5–6 detailed commentary bullets with unique, location-specific content
6. Years MUST cover 2019 through 2026E with continuous series (no missing years)
7. Return ONLY valid JSON — no markdown fences, no commentary outside JSON
`.trim();
}

/** Slide IDs that host Historical & Projected Market Metrics per asset. */
export const OPERATIONAL_MARKET_METRICS_SLIDE_IDS: Record<
  OperationalAssetType,
  string[]
> = {
  retail: ["mall-market-metrics"],
  office: ["office-market-metrics"],
  btr: ["btr-market-metrics"],
  warehouse: ["warehouse-market-metrics"],
  datacentre: ["datacentre-market-metrics", "warehouse-market-metrics"],
  hotel: ["hotel-market-metrics"],
};

export const OPERATIONAL_MARKET_CHART_CONFIGS: Record<
  OperationalAssetType,
  OperationalMarketChartConfig
> = {
  retail: {
    assetType: "retail",
    chart1Title: "Footfall Index",
    chart1Type: "bar",
    chart1Metrics: ["footfall"],
    chart2Title: "Tenant Sales PSF & Occupancy %",
    chart2Type: "dual-axis-line",
    chart2Metrics: ["salesPsf", "occupancy"],
    commentaryTopics: [
      "Footfall CAGR",
      "Occupancy %",
      "Retail / mall catchment context",
      "Tenant sales productivity",
      "Tourism and discretionary spend drivers",
    ],
  },
  office: {
    assetType: "office",
    chart1Title: "Office Vacancy Rate % & Net Absorption (sqft)",
    chart1Type: "dual-axis-line-column",
    chart1Metrics: ["vacancy", "netAbsorption"],
    chart2Title: "Rental Growth / Rent PSF Trend",
    chart2Type: "line",
    chart2Metrics: ["rentPsf"],
    commentaryTopics: [
      "Submarket vacancy vs CBD average",
      "Net absorption trends",
      "Grade A rent PSF trajectory",
      "Flight-to-quality / hybrid work impact",
      "Pipeline and leasing velocity",
    ],
  },
  btr: {
    assetType: "btr",
    chart1Title: "Rental Growth % & Population Growth %",
    chart1Type: "dual-axis-line",
    chart1Metrics: ["rentalGrowth", "populationGrowth"],
    chart2Title: "Rent-to-Income Ratio (%)",
    chart2Type: "line",
    chart2Metrics: ["rentToIncome"],
    commentaryTopics: [
      "Catchment demographics (age, income, household size)",
      "Rental growth vs population growth",
      "Rent-to-income affordability",
      "BTR demand drivers",
      "Household formation and migration",
    ],
  },
  warehouse: {
    assetType: "warehouse",
    chart1Title: "Warehouse Rent PSF & Vacancy %",
    chart1Type: "dual-axis-line-column",
    chart1Metrics: ["rentPsf", "vacancy"],
    chart2Title: "E-Commerce Sales Growth % & Logistics Demand (sqft)",
    chart2Type: "dual-axis-line-column",
    chart2Metrics: ["ecommerceGrowth", "logisticsDemand"],
    commentaryTopics: [
      "Submarket industrial vacancy vs city average",
      "E-commerce and 3PL demand drivers",
      "Grade A warehouse rent PSF",
      "Logistics land / power constraints",
      "Last-mile vs big-box absorption",
    ],
  },
  datacentre: {
    assetType: "datacentre",
    chart1Title: "Power Capacity (MW) & PUE",
    chart1Type: "dual-axis-line-column",
    chart1Metrics: ["powerMw", "pue"],
    chart2Title: "Lease Rate ($/kW/month) & Utilization %",
    chart2Type: "dual-axis-line-column",
    chart2Metrics: ["leaseRateKw", "utilization"],
    commentaryTopics: [
      "DC demand drivers (AI, cloud, hyperscale)",
      "Power availability and grid wait times",
      "PUE and sustainability trajectory",
      "Lease rate ($/kW/month) and utilization",
      "Latency / connectivity catchment",
    ],
  },
  hotel: {
    assetType: "hotel",
    chart1Title: "ADR & Occupancy %",
    chart1Type: "dual-axis-line",
    chart1Metrics: ["adr", "occupancy"],
    chart2Title: "International Arrivals (millions)",
    chart2Type: "bar",
    chart2Metrics: ["arrivals"],
    commentaryTopics: [
      "ADR and occupancy recovery",
      "International arrivals trend",
      "Source-market mix",
      "Competitive set RevPAR",
      "Tourism policy and air connectivity",
    ],
  },
};

const DEFAULT_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#6366f1"];

function toSlideChartType(
  t: OperationalMarketChartType
): SlideChart["type"] {
  if (t === "bar") return "bar";
  return "line";
}

function leftRightAxes(
  metrics: string[],
  chartType: OperationalMarketChartType
): { left: string[]; right: string[] } | undefined {
  if (!chartType.startsWith("dual-axis") || metrics.length < 2) return undefined;
  return { left: [metrics[0]!], right: metrics.slice(1) };
}

/**
 * Map enrich-router asset keys (mall/warehouse/…) onto market-chart asset types.
 */
export function mapEnrichAssetToMarketChartType(
  enrichAssetType: string
): OperationalAssetType {
  const t = enrichAssetType.toLowerCase();
  if (t === "mall" || t === "retail" || t.includes("shopping")) return "retail";
  if (t === "office") return "office";
  if (t === "btr" || t.includes("residential")) return "btr";
  if (t === "warehouse" || t.includes("industrial")) return "warehouse";
  if (
    t === "datacentre" ||
    t === "data_centre" ||
    t === "data-centre" ||
    t === "datacenter" ||
    t.includes("data centre") ||
    t.includes("data center")
  ) {
    return "datacentre";
  }
  if (t === "hotel") return "hotel";
  return "hotel";
}

export function buildOperationalMarketChartCacheKey(
  assetType: OperationalAssetType,
  location: OperationalMarketLocation
): string {
  const country = location.country
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const city = location.city
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `operational_market_${assetType}_${country || "unknown"}_${city || "unknown"}`;
}

export function buildOperationalMarketChartPrompt(
  config: OperationalMarketChartConfig,
  location: OperationalMarketLocation,
  projectContext: OperationalMarketProjectContext
): string {
  const { city, country } = location;
  const anti = antiPlaceholderRules(city, country);

  const chart1Keys = config.chart1Metrics.join(", ");
  const chart2Keys = config.chart2Metrics.join(", ");

  return `
You are a senior real estate market analyst preparing the "Industry / Market Analysis — Historical & Projected Market Metrics" section for an operational feasibility study.

PROJECT CONTEXT:
- Asset type: ${projectContext.assetType} (${config.assetType})
- City: ${city}
- Country: ${country}
- Segment / positioning: ${projectContext.segment ?? "n/a"} / ${projectContext.positioning ?? "n/a"}
- Currency: ${projectContext.currency ?? "local"}

Generate REALISTIC, jurisdiction-specific time-series data for BOTH charts below.
Years: "2019","2020","2021","2022","2023","2024","2025E","2026E".

CHART 1 — ${config.chart1Title}
- Intended chart type: ${config.chart1Type}
- Metrics (JSON keys): ${chart1Keys}
${
  config.chart1Type.startsWith("dual-axis")
    ? `- Dual-axis: left = ${config.chart1Metrics[0]}, right = ${config.chart1Metrics.slice(1).join(", ")}`
    : ""
}

CHART 2 — ${config.chart2Title}
- Intended chart type: ${config.chart2Type}
- Metrics (JSON keys): ${chart2Keys}
${
  config.chart2Type.startsWith("dual-axis")
    ? `- Dual-axis: left = ${config.chart2Metrics[0]}, right = ${config.chart2Metrics.slice(1).join(", ")}`
    : ""
}

COMMENTARY TOPICS (cover these; 5–6 bullets, each 20–35 words):
${config.commentaryTopics.map((t) => `- ${t}`).join("\n")}

${anti}

Return ONLY this JSON shape (replace NUMBER with realistic figures; use the exact metric keys above):
{
  "chart1": {
    "title": "${config.chart1Title}",
    "type": "${toSlideChartType(config.chart1Type)}",
    "xKey": "year",
    "yKeys": [${config.chart1Metrics.map((m) => `"${m}"`).join(", ")}],
    "data": [
      {"year": "2019", ${config.chart1Metrics.map((m) => `"${m}": NUMBER`).join(", ")}},
      {"year": "2020", ${config.chart1Metrics.map((m) => `"${m}": NUMBER`).join(", ")}},
      {"year": "2021", ${config.chart1Metrics.map((m) => `"${m}": NUMBER`).join(", ")}},
      {"year": "2022", ${config.chart1Metrics.map((m) => `"${m}": NUMBER`).join(", ")}},
      {"year": "2023", ${config.chart1Metrics.map((m) => `"${m}": NUMBER`).join(", ")}},
      {"year": "2024", ${config.chart1Metrics.map((m) => `"${m}": NUMBER`).join(", ")}},
      {"year": "2025E", ${config.chart1Metrics.map((m) => `"${m}": NUMBER`).join(", ")}},
      {"year": "2026E", ${config.chart1Metrics.map((m) => `"${m}": NUMBER`).join(", ")}}
    ]
  },
  "chart2": {
    "title": "${config.chart2Title}",
    "type": "${toSlideChartType(config.chart2Type)}",
    "xKey": "year",
    "yKeys": [${config.chart2Metrics.map((m) => `"${m}"`).join(", ")}],
    "data": [
      {"year": "2019", ${config.chart2Metrics.map((m) => `"${m}": NUMBER`).join(", ")}},
      ... through 2026E
    ]
  },
  "commentary": [
    "bullet point 1",
    "bullet point 2",
    "bullet point 3",
    "bullet point 4",
    "bullet point 5",
    "bullet point 6"
  ]
}
`.trim();
}

function normalizeOneChart(
  raw: unknown,
  fallbackTitle: string,
  fallbackMetrics: string[],
  chartType: OperationalMarketChartType
): SlideChart | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<SlideChart> & {
    yAxes?: { left?: string[]; right?: string[] };
  };
  if (!c.data || !Array.isArray(c.data) || c.data.length === 0) return null;

  const yKeys =
    c.yKeys && c.yKeys.length > 0 ? c.yKeys : fallbackMetrics;
  if (!yKeys.length) return null;

  const yAxes =
    c.yAxes?.left && c.yAxes?.right
      ? { left: c.yAxes.left, right: c.yAxes.right }
      : leftRightAxes(yKeys, chartType);

  return {
    type: c.type === "bar" || c.type === "line" ? c.type : toSlideChartType(chartType),
    title: typeof c.title === "string" && c.title.trim() ? c.title : fallbackTitle,
    data: c.data,
    xKey: c.xKey ?? "year",
    yKeys,
    colors: c.colors ?? DEFAULT_COLORS.slice(0, yKeys.length),
    height: c.height ?? "flex-1",
    width: c.width ?? "w-full",
    ...(yAxes ? { yAxes } : {}),
  };
}

export function normalizeOperationalMarketCharts(
  raw: unknown,
  config?: OperationalMarketChartConfig
): OperationalMarketChartResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as {
    chart1?: unknown;
    chart2?: unknown;
    commentary?: unknown;
  };

  const cfg =
    config ??
    OPERATIONAL_MARKET_CHART_CONFIGS.retail;

  const chart1 = normalizeOneChart(
    obj.chart1,
    cfg.chart1Title,
    cfg.chart1Metrics,
    cfg.chart1Type
  );
  const chart2 = normalizeOneChart(
    obj.chart2,
    cfg.chart2Title,
    cfg.chart2Metrics,
    cfg.chart2Type
  );
  if (!chart1 || !chart2) return null;

  const commentary = Array.isArray(obj.commentary)
    ? obj.commentary
        .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
        .map((b) => b.trim())
    : [];

  if (commentary.length < 3) return null;

  return { chart1, chart2, commentary };
}

/**
 * Generate AI market metrics charts for the Operational stream.
 * Returns null on failure so callers keep static builder charts.
 */
export async function generateOperationalMarketChartData(
  assetType: OperationalAssetType,
  location: OperationalMarketLocation,
  projectContext: OperationalMarketProjectContext,
  cacheKey: string,
  forceRegenerate: boolean
): Promise<OperationalMarketChartResult | null> {
  const config = OPERATIONAL_MARKET_CHART_CONFIGS[assetType];
  if (!config) return null;

  const normalizedCacheKey = `${cacheKey}_normalized`;

  if (!forceRegenerate) {
    const cached = await getCachedContent(normalizedCacheKey);
    const fromCache = normalizeOperationalMarketCharts(cached, config);
    if (fromCache) return fromCache;
  }

  const prompt = buildOperationalMarketChartPrompt(
    config,
    location,
    projectContext
  );

  const result = await aiProvider.generateChartData(prompt, {
    cacheKey,
    forceRegenerate,
  });

  const normalized = normalizeOperationalMarketCharts(result, config);
  if (!normalized) return null;

  await setCachedContent(normalizedCacheKey, normalized);
  return normalized;
}

// ---------------------------------------------------------------------------
// Supply Pipeline (Current & Projected Supply Pipeline)
// ---------------------------------------------------------------------------

export interface OperationalSupplyPipelineConfig {
  assetType: OperationalAssetType;
  chartTitle: string;
  unit: string;
  existingStockLabel: string;
  pipelineLabel: string;
  commentaryTopics: string[];
}

export interface OperationalSupplyPipelineSummary {
  existingStock: number;
  pipeline: number;
  subjectShareOfStock: number;
  unit: string;
}

export interface OperationalSupplyPipelineResult {
  chart: SlideChart;
  commentary: string[];
  summaryTable?: OperationalSupplyPipelineSummary;
}

/** Slide IDs that host Current & Projected Supply Pipeline per asset. */
export const OPERATIONAL_SUPPLY_PIPELINE_SLIDE_IDS: Record<
  OperationalAssetType,
  string[]
> = {
  retail: ["mall-supply-pipeline"],
  office: ["office-supply-pipeline"],
  btr: ["btr-supply-pipeline"],
  warehouse: ["warehouse-supply-pipeline"],
  datacentre: ["datacentre-supply-pipeline", "warehouse-supply-pipeline"],
  hotel: ["hotel-supply-pipeline"],
};

export const OPERATIONAL_SUPPLY_PIPELINE_CONFIGS: Record<
  OperationalAssetType,
  OperationalSupplyPipelineConfig
> = {
  retail: {
    assetType: "retail",
    chartTitle: "Retail GLA Stock & Pipeline",
    unit: "m sqft",
    existingStockLabel: "Existing stock",
    pipelineLabel: "Pipeline",
    commentaryTopics: [
      "Current market stock levels (million sqft)",
      "Pipeline delivery schedule 2024E–2026E",
      "Impact on vacancy and absorption",
      "Subject project's market share of stock",
      "Regulatory / planning constraints",
      "Competitive dynamics among regional malls",
    ],
  },
  office: {
    assetType: "office",
    chartTitle: "Office Stock & Pipeline",
    unit: "m sqft",
    existingStockLabel: "Existing stock",
    pipelineLabel: "Pipeline",
    commentaryTopics: [
      "Current Grade A/B office stock levels",
      "Pipeline delivery schedule 2024E–2026E",
      "Impact on vacancy and net absorption",
      "Subject project's share of stock",
      "Planning / zoning constraints",
      "CBD vs fringe competitive dynamics",
    ],
  },
  btr: {
    assetType: "btr",
    chartTitle: "Residential Stock & Pipeline",
    unit: "units",
    existingStockLabel: "Existing stock",
    pipelineLabel: "Pipeline",
    commentaryTopics: [
      "Current institutional / BTR rental stock (units)",
      "Pipeline delivery schedule 2024E–2026E",
      "Impact on vacancy and lease-up absorption",
      "Subject project's share of stock",
      "Planning / affordable housing constraints",
      "Competition from build-to-sell and other BTR",
    ],
  },
  warehouse: {
    assetType: "warehouse",
    chartTitle: "Industrial Stock & Pipeline",
    unit: "m sqft",
    existingStockLabel: "Existing stock",
    pipelineLabel: "Pipeline",
    commentaryTopics: [
      "Current industrial / warehouse stock levels",
      "Pipeline delivery schedule 2024E–2026E",
      "Impact on vacancy and logistics absorption",
      "Subject project's share of stock",
      "Land / power / access constraints",
      "E-commerce and 3PL competitive dynamics",
    ],
  },
  datacentre: {
    assetType: "datacentre",
    chartTitle: "Data Centre Capacity & Pipeline",
    unit: "MW",
    existingStockLabel: "Existing capacity",
    pipelineLabel: "Pipeline",
    commentaryTopics: [
      "Current commissioned DC capacity (MW)",
      "Pipeline delivery schedule 2024E–2026E",
      "Impact on utilization and lease-up",
      "Subject project's share of capacity",
      "Power availability and grid wait times",
      "Hyperscale / AI competitive dynamics",
    ],
  },
  hotel: {
    assetType: "hotel",
    chartTitle: "Hotel Key Stock & Pipeline",
    unit: "keys",
    existingStockLabel: "Existing stock",
    pipelineLabel: "Pipeline",
    commentaryTopics: [
      "Current branded hotel key stock",
      "Pipeline delivery schedule 2024E–2026E",
      "Impact on occupancy and ADR",
      "Subject project's share of keys",
      "Tourism / licensing constraints",
      "Competitive set dynamics",
    ],
  },
};

const SUPPLY_PIPELINE_COLORS = ["#10b981", "#8b5cf6"];

export function buildOperationalSupplyPipelineCacheKey(
  assetType: OperationalAssetType,
  location: OperationalMarketLocation
): string {
  const country = location.country
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const city = location.city
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `operational_supply_pipeline_${assetType}_${country || "unknown"}_${city || "unknown"}`;
}

export function buildOperationalSupplyPipelinePrompt(
  config: OperationalSupplyPipelineConfig,
  location: OperationalMarketLocation,
  projectContext?: OperationalMarketProjectContext
): string {
  const { city, country } = location;
  const anti = antiPlaceholderRules(city, country).replace(
    "Years MUST cover 2019 through 2026E",
    "Years MUST cover 2021 through 2026E"
  );

  const subjectHint =
    projectContext?.gla || projectContext?.bua || projectContext?.subjectSize
      ? `
SUBJECT PROJECT (for share-of-stock calculation):
- Asset: ${projectContext.assetType}
- GLA sqft: ${projectContext.gla ?? "n/a"}
- BUA sqft: ${projectContext.bua ?? "n/a"}
- Subject size (${config.unit}): ${projectContext.subjectSize ?? "n/a"}
Compute subjectShareOfStock as subject size ÷ existing stock × 100 (percentage).
`
      : `
If subject size is unknown, estimate a realistic mid-market subject share (0.5%–5%) and state the assumption implicitly via the number.
`;

  return `
You are a senior real estate market analyst preparing the "Current & Projected Supply Pipeline" slide for an operational feasibility study.

LOCATION: ${city}, ${country}
ASSET TYPE: ${config.assetType}
CHART: ${config.chartTitle}
UNIT: ${config.unit} (all numeric series MUST be in this unit)

${subjectHint}

Generate a STACKED BAR chart with two series:
- "existing" = ${config.existingStockLabel} (${config.unit})
- "pipeline" = ${config.pipelineLabel} (${config.unit})

Years (exact labels): "2021","2022","2023","2024","2025E","2026E"

Guidance:
- Existing stock: show historical growth 2021–2023 and current 2024 baseline; modest growth into 2025E–2026E as pipeline delivers
- Pipeline: smaller than existing; rising toward 2024–2025E then may taper by 2026E as projects complete into stock
- Use realistic magnitudes for ${city}, ${country} (jurisdiction-specific — do NOT paste UAE figures for other countries)

COMMENTARY (5–6 bullets, 20–35 words each) covering:
${config.commentaryTopics.map((t) => `- ${t}`).join("\n")}

${anti}

Return ONLY this JSON:
{
  "chart": {
    "title": "${config.chartTitle} — ${city} (${config.unit})",
    "type": "bar",
    "xKey": "year",
    "yKeys": ["existing", "pipeline"],
    "data": [
      {"year": "2021", "existing": NUMBER, "pipeline": NUMBER},
      {"year": "2022", "existing": NUMBER, "pipeline": NUMBER},
      {"year": "2023", "existing": NUMBER, "pipeline": NUMBER},
      {"year": "2024", "existing": NUMBER, "pipeline": NUMBER},
      {"year": "2025E", "existing": NUMBER, "pipeline": NUMBER},
      {"year": "2026E", "existing": NUMBER, "pipeline": NUMBER}
    ]
  },
  "commentary": [
    "bullet point 1",
    "bullet point 2",
    "bullet point 3",
    "bullet point 4",
    "bullet point 5",
    "bullet point 6"
  ],
  "summaryTable": {
    "existingStock": NUMBER,
    "pipeline": NUMBER,
    "subjectShareOfStock": NUMBER
  }
}
`.trim();
}

export function normalizeOperationalSupplyPipeline(
  raw: unknown,
  config?: OperationalSupplyPipelineConfig
): OperationalSupplyPipelineResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as {
    chart?: unknown;
    commentary?: unknown;
    summaryTable?: unknown;
  };

  const cfg = config ?? OPERATIONAL_SUPPLY_PIPELINE_CONFIGS.retail;
  if (!obj.chart || typeof obj.chart !== "object") return null;

  const c = obj.chart as Partial<SlideChart>;
  if (!c.data || !Array.isArray(c.data) || c.data.length === 0) return null;

  const yKeys =
    c.yKeys && c.yKeys.length >= 2 ? c.yKeys : ["existing", "pipeline"];

  const chart: SlideChart = {
    type: "bar",
    title:
      typeof c.title === "string" && c.title.trim()
        ? c.title
        : `${cfg.chartTitle} (${cfg.unit})`,
    data: c.data,
    xKey: c.xKey ?? "year",
    yKeys,
    colors: c.colors ?? SUPPLY_PIPELINE_COLORS,
    stacked: true,
    height: c.height ?? "flex-1",
    width: c.width ?? "w-full",
  };

  const commentary = Array.isArray(obj.commentary)
    ? obj.commentary
        .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
        .map((b) => b.trim())
    : [];
  if (commentary.length < 3) return null;

  let summaryTable: OperationalSupplyPipelineSummary | undefined;
  if (obj.summaryTable && typeof obj.summaryTable === "object") {
    const s = obj.summaryTable as Record<string, unknown>;
    const existingStock = Number(s.existingStock);
    const pipeline = Number(s.pipeline);
    const subjectShareOfStock = Number(s.subjectShareOfStock);
    if (
      Number.isFinite(existingStock) &&
      Number.isFinite(pipeline) &&
      Number.isFinite(subjectShareOfStock)
    ) {
      summaryTable = {
        existingStock,
        pipeline,
        subjectShareOfStock,
        unit: cfg.unit,
      };
    }
  }

  // Derive summary from latest chart row if AI omitted summaryTable
  if (!summaryTable) {
    const last = chart.data[chart.data.length - 1] as Record<
      string,
      string | number | undefined
    >;
    const existing = Number(last?.existing);
    const pipeline = Number(last?.pipeline);
    if (Number.isFinite(existing) && Number.isFinite(pipeline)) {
      summaryTable = {
        existingStock: existing,
        pipeline,
        subjectShareOfStock: 0,
        unit: cfg.unit,
      };
    }
  }

  return { chart, commentary, summaryTable };
}

/**
 * Generate AI supply pipeline chart for the Operational stream.
 * Returns null on failure so callers keep static builder charts.
 */
export async function generateOperationalSupplyPipelineData(
  assetType: OperationalAssetType,
  location: OperationalMarketLocation,
  projectContext: OperationalMarketProjectContext,
  cacheKey: string,
  forceRegenerate: boolean
): Promise<OperationalSupplyPipelineResult | null> {
  const config = OPERATIONAL_SUPPLY_PIPELINE_CONFIGS[assetType];
  if (!config) return null;

  const normalizedCacheKey = `${cacheKey}_normalized`;

  if (!forceRegenerate) {
    const cached = await getCachedContent(normalizedCacheKey);
    const fromCache = normalizeOperationalSupplyPipeline(cached, config);
    if (fromCache) return fromCache;
  }

  const prompt = buildOperationalSupplyPipelinePrompt(
    config,
    location,
    projectContext
  );

  const result = await aiProvider.generateChartData(prompt, {
    cacheKey,
    forceRegenerate,
  });

  const normalized = normalizeOperationalSupplyPipeline(result, config);
  if (!normalized) return null;

  await setCachedContent(normalizedCacheKey, normalized);
  return normalized;
}

// ---------------------------------------------------------------------------
// Target Tenant & Catchment Profile
// ---------------------------------------------------------------------------

export interface TenantMixCategory {
  name: string;
  percentage: number;
  description: string;
}

export interface OperationalTenantProfileConfig {
  assetType: OperationalAssetType;
  unitType: "GLA" | "Units" | "Capacity";
  targetWaleRange: { min: number; max: number };
  catchmentRadius: string;
  tenantCategories: TenantMixCategory[];
  catchmentDemographicTopics: string[];
}

export interface OperationalTenantProfileResult {
  pieChart: SlideChart;
  catchmentDemographics: string[];
  commentary: string[];
  targetWALE: { min: number; max: number };
  catchmentRadius: string;
  /** Compatible payload for RetailTenantProfileSlide */
  tenantProfileData: {
    tenantMix: Array<{ category: string; sharePct: number }>;
    catchmentRadius: string;
    primaryDemographics: string[];
    waleYears: number;
    waleMin?: number;
    waleMax?: number;
    unitLabel?: string;
  };
}

const TENANT_PIE_COLORS = [
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#06b6d4",
];

/** Slide IDs that host Target Tenant & Catchment Profile per asset. */
export const OPERATIONAL_TENANT_PROFILE_SLIDE_IDS: Record<
  OperationalAssetType,
  string[]
> = {
  retail: ["mall-tenant-profile"],
  office: ["office-tenant-profile"],
  btr: ["btr-tenant-profile"],
  warehouse: ["warehouse-tenant-profile"],
  datacentre: ["datacentre-tenant-profile", "warehouse-tenant-profile"],
  hotel: ["hotel-tenant-profile"],
};

export const OPERATIONAL_TENANT_PROFILE_CONFIGS: Record<
  OperationalAssetType,
  OperationalTenantProfileConfig
> = {
  retail: {
    assetType: "retail",
    unitType: "GLA",
    targetWaleRange: { min: 3.0, max: 5.0 },
    catchmentRadius: "5 – 10 km urban catchment",
    tenantCategories: [
      {
        name: "Anchors (Supermarket/Dept)",
        percentage: 35,
        description: "Anchor supermarket and department store GLA",
      },
      {
        name: "F&B / Restaurant",
        percentage: 25,
        description: "Food court, restaurants, cafés",
      },
      {
        name: "Fashion / Apparel",
        percentage: 20,
        description: "Fashion, apparel, and accessories",
      },
      {
        name: "Entertainment / Leisure",
        percentage: 10,
        description: "Cinema, leisure, and experiential uses",
      },
      {
        name: "Specialty / Services",
        percentage: 10,
        description: "Specialty retail and personal services",
      },
    ],
    catchmentDemographicTopics: [
      "Population density",
      "Household income",
      "Age distribution",
      "Spending patterns",
      "Traffic counts",
    ],
  },
  office: {
    assetType: "office",
    unitType: "GLA",
    targetWaleRange: { min: 3.0, max: 5.0 },
    catchmentRadius: "5 – 10 km urban catchment",
    tenantCategories: [
      {
        name: "Corporate / Large",
        percentage: 30,
        description: "Large corporate HQ and regional offices",
      },
      {
        name: "SME / Mid-Size",
        percentage: 25,
        description: "Mid-market professional services SMEs",
      },
      {
        name: "Tech / Digital",
        percentage: 20,
        description: "Technology and digital economy tenants",
      },
      {
        name: "Government / Institutional",
        percentage: 15,
        description: "Government and institutional occupiers",
      },
      {
        name: "Flexible / Co-Working",
        percentage: 10,
        description: "Flexible workspace and co-working operators",
      },
    ],
    catchmentDemographicTopics: [
      "Workforce size",
      "Industry mix",
      "Transport connectivity",
      "Amenities",
      "Daytime population",
    ],
  },
  btr: {
    assetType: "btr",
    unitType: "Units",
    targetWaleRange: { min: 1.0, max: 2.0 },
    catchmentRadius: "5 km urban catchment",
    tenantCategories: [
      {
        name: "Young Professionals",
        percentage: 35,
        description: "Ages ~25–35 dual-income professionals",
      },
      {
        name: "Families",
        percentage: 25,
        description: "Small families seeking quality rental stock",
      },
      {
        name: "Corporate / Expatriates",
        percentage: 18,
        description: "Corporate housing and expatriate households",
      },
      {
        name: "Students",
        percentage: 12,
        description: "Graduate / university-adjacent renters",
      },
      {
        name: "Seniors / Empty Nesters",
        percentage: 10,
        description: "Downsizing seniors and empty nesters",
      },
    ],
    catchmentDemographicTopics: [
      "Ages 25–40 share",
      "Household income",
      "Transit connectivity",
      "Employment hubs",
      "Household formation",
    ],
  },
  warehouse: {
    assetType: "warehouse",
    unitType: "GLA",
    targetWaleRange: { min: 3.0, max: 5.0 },
    catchmentRadius: "10 – 20 km industrial catchment",
    tenantCategories: [
      {
        name: "Logistics / 3PL",
        percentage: 40,
        description: "Third-party logistics and warehousing operators",
      },
      {
        name: "E-Commerce / Fulfilment",
        percentage: 25,
        description: "E-commerce fulfilment and last-mile hubs",
      },
      {
        name: "Manufacturing / Light",
        percentage: 20,
        description: "Light manufacturing and assembly",
      },
      {
        name: "Wholesale / Distribution",
        percentage: 10,
        description: "Wholesale distribution centres",
      },
      {
        name: "Cold Storage / Specialised",
        percentage: 5,
        description: "Cold storage and specialised industrial",
      },
    ],
    catchmentDemographicTopics: [
      "Transport proximity",
      "Logistics workforce",
      "Industrial zoning",
      "Utilities capacity",
      "Labor market",
    ],
  },
  datacentre: {
    assetType: "datacentre",
    unitType: "Capacity",
    targetWaleRange: { min: 5.0, max: 10.0 },
    catchmentRadius: "Power grid & fibre catchment",
    tenantCategories: [
      {
        name: "Cloud Providers (Hyperscalers)",
        percentage: 40,
        description: "Hyperscale cloud capacity commitments",
      },
      {
        name: "AI / GPU Providers",
        percentage: 25,
        description: "AI training / inference GPU clusters",
      },
      {
        name: "Enterprise / Corporate",
        percentage: 20,
        description: "Enterprise private cloud and hybrid IT",
      },
      {
        name: "Colocation / Retail",
        percentage: 10,
        description: "Retail colocation and interconnection",
      },
      {
        name: "Government / Institutional",
        percentage: 5,
        description: "Government and institutional workloads",
      },
    ],
    catchmentDemographicTopics: [
      "Power availability",
      "Fibre connectivity",
      "Flood / seismic risk",
      "Proximity to fibre backbones",
      "Tax incentives",
    ],
  },
  hotel: {
    assetType: "hotel",
    unitType: "Units",
    targetWaleRange: { min: 0, max: 0 },
    catchmentRadius: "City / airport demand catchment",
    tenantCategories: [
      {
        name: "Corporate Transient",
        percentage: 35,
        description: "Business transient demand",
      },
      {
        name: "Leisure Transient",
        percentage: 30,
        description: "Leisure and tourism demand",
      },
      {
        name: "MICE / Groups",
        percentage: 20,
        description: "Meetings, incentives, conferences, exhibitions",
      },
      {
        name: "Airline / Crew",
        percentage: 10,
        description: "Airline crew and contracted rooms",
      },
      {
        name: "Long-Stay / Extended",
        percentage: 5,
        description: "Extended-stay and project housing",
      },
    ],
    catchmentDemographicTopics: [
      "International arrivals",
      "Corporate demand generators",
      "Tourism attractions",
      "Air connectivity",
      "Competitive set ADR",
    ],
  },
};

export function buildOperationalTenantProfileCacheKey(
  assetType: OperationalAssetType,
  location: OperationalMarketLocation
): string {
  const country = location.country
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const city = location.city
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `operational_tenant_profile_${assetType}_${country || "unknown"}_${city || "unknown"}`;
}

export function buildOperationalTenantProfilePrompt(
  config: OperationalTenantProfileConfig,
  location: OperationalMarketLocation,
  projectContext?: OperationalMarketProjectContext & { keys?: number }
): string {
  const { city, country } = location;
  const anti = antiPlaceholderRules(city, country);

  const categoryGuide = config.tenantCategories
    .map(
      (c) =>
        `- ${c.name}: target ~${c.percentage}% of ${config.unitType} (${c.description})`
    )
    .join("\n");

  return `
You are a senior real estate leasing / market analyst preparing the "Target Tenant & Catchment Profile" slide for an operational feasibility study.

LOCATION: ${city}, ${country}
ASSET TYPE: ${config.assetType}
MIX UNIT: % of ${config.unitType}
DEFAULT TARGET WALE: ${config.targetWaleRange.min} – ${config.targetWaleRange.max} years
DEFAULT CATCHMENT: ${config.catchmentRadius}

PROJECT CONTEXT:
- Asset label: ${projectContext?.assetType ?? config.assetType}
- GLA / BUA (sqft): ${projectContext?.gla ?? projectContext?.bua ?? "n/a"}
- Keys / units: ${projectContext?.keys ?? projectContext?.subjectSize ?? "n/a"}
- Segment / positioning: ${projectContext?.segment ?? "n/a"} / ${projectContext?.positioning ?? "n/a"}

TARGET TENANT CATEGORIES (adjust percentages realistically for ${city}; must sum to ~100):
${categoryGuide}

CATCHMENT DEMOGRAPHIC TOPICS (location-specific bullets for ${city}, ${country}):
${config.catchmentDemographicTopics.map((t) => `- ${t}`).join("\n")}

Generate:
1) Pie chart tenant mix (% of ${config.unitType}) — realistic for ${city}
2) 5–6 catchment demographic bullets (specific numbers / local context — NOT generic)
3) 5–6 commentary bullets connecting tenant strategy to local market conditions, comps, rents, demand drivers, and project underwriting (occupancy / lease-up)

${anti}

Return ONLY this JSON:
{
  "tenantMixPieChart": {
    "title": "Target tenant mix (% of ${config.unitType})",
    "type": "pie",
    "data": [
      {"category": "Category Name", "percentage": NUMBER, "color": "#8b5cf6"},
      {"category": "Category Name", "percentage": NUMBER, "color": "#10b981"},
      {"category": "Category Name", "percentage": NUMBER, "color": "#f59e0b"},
      {"category": "Category Name", "percentage": NUMBER, "color": "#3b82f6"},
      {"category": "Category Name", "percentage": NUMBER, "color": "#ef4444"}
    ]
  },
  "catchmentDemographics": [
    "Demographic bullet 1 with local specificity",
    "Demographic bullet 2",
    "Demographic bullet 3",
    "Demographic bullet 4",
    "Demographic bullet 5"
  ],
  "commentary": [
    "Market context bullet 1",
    "Market context bullet 2",
    "Market context bullet 3",
    "Market context bullet 4",
    "Market context bullet 5"
  ],
  "targetWALE": { "min": ${config.targetWaleRange.min}, "max": ${config.targetWaleRange.max} },
  "catchmentRadius": "${config.catchmentRadius}"
}
`.trim();
}

function normalizeTenantMixRows(
  rawData: unknown,
  config: OperationalTenantProfileConfig
): Array<{ category: string; sharePct: number; color: string }> | null {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return config.tenantCategories.map((c, i) => ({
      category: c.name,
      sharePct: c.percentage,
      color: TENANT_PIE_COLORS[i % TENANT_PIE_COLORS.length]!,
    }));
  }

  const rows: Array<{ category: string; sharePct: number; color: string }> = [];
  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const category = String(r.category ?? r.name ?? "").trim();
    const sharePct = Number(r.percentage ?? r.sharePct ?? r.value);
    if (!category || !Number.isFinite(sharePct) || sharePct <= 0) continue;
    const color =
      typeof r.color === "string" && r.color.startsWith("#")
        ? r.color
        : TENANT_PIE_COLORS[i % TENANT_PIE_COLORS.length]!;
    rows.push({ category, sharePct: Math.round(sharePct * 10) / 10, color });
  }

  if (rows.length < 3) return null;

  const sum = rows.reduce((s, r) => s + r.sharePct, 0);
  if (sum > 0 && (sum < 90 || sum > 110)) {
    return rows.map((r) => ({
      ...r,
      sharePct: Math.round((r.sharePct / sum) * 1000) / 10,
    }));
  }
  return rows;
}

export function normalizeOperationalTenantProfile(
  raw: unknown,
  config?: OperationalTenantProfileConfig
): OperationalTenantProfileResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const cfg = config ?? OPERATIONAL_TENANT_PROFILE_CONFIGS.retail;

  const pieRaw =
    obj.tenantMixPieChart && typeof obj.tenantMixPieChart === "object"
      ? (obj.tenantMixPieChart as Record<string, unknown>)
      : obj.pieChart && typeof obj.pieChart === "object"
        ? (obj.pieChart as Record<string, unknown>)
        : null;

  const mixRows = normalizeTenantMixRows(pieRaw?.data ?? obj.tenantMix, cfg);
  if (!mixRows) return null;

  const catchmentDemographics = Array.isArray(obj.catchmentDemographics)
    ? obj.catchmentDemographics
        .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
        .map((b) => b.trim())
    : [];
  const commentary = Array.isArray(obj.commentary)
    ? obj.commentary
        .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
        .map((b) => b.trim())
    : [];

  if (catchmentDemographics.length < 3 || commentary.length < 3) return null;

  let min = cfg.targetWaleRange.min;
  let max = cfg.targetWaleRange.max;
  if (obj.targetWALE && typeof obj.targetWALE === "object") {
    const tw = obj.targetWALE as Record<string, unknown>;
    const a = Number(tw.min);
    const b = Number(tw.max);
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) {
      min = a;
      max = b;
    }
  }

  const catchmentRadius =
    typeof obj.catchmentRadius === "string" && obj.catchmentRadius.trim()
      ? obj.catchmentRadius.trim()
      : cfg.catchmentRadius;

  const colors = mixRows.map((r) => r.color);
  const pieChart: SlideChart = {
    type: "pie",
    title:
      typeof pieRaw?.title === "string" && pieRaw.title.trim()
        ? pieRaw.title
        : `Target tenant mix (% of ${cfg.unitType})`,
    data: mixRows.map((r) => ({
      category: r.category,
      percentage: r.sharePct,
      year: r.category,
      value: r.sharePct,
    })),
    xKey: "category",
    yKeys: ["percentage"],
    colors,
    height: "flex-1",
    width: "w-full",
  };

  const waleYears = Math.round(((min + max) / 2) * 10) / 10;

  return {
    pieChart,
    catchmentDemographics,
    commentary,
    targetWALE: { min, max },
    catchmentRadius,
    tenantProfileData: {
      tenantMix: mixRows.map((r) => ({
        category: r.category,
        sharePct: r.sharePct,
      })),
      catchmentRadius,
      primaryDemographics: catchmentDemographics,
      waleYears,
      waleMin: min,
      waleMax: max,
      unitLabel: cfg.unitType,
    },
  };
}

/**
 * Generate AI tenant & catchment profile for the Operational stream.
 * Returns null on failure so callers keep static builder data.
 */
export async function generateOperationalTenantProfileData(
  assetType: OperationalAssetType,
  location: OperationalMarketLocation,
  projectContext: OperationalMarketProjectContext & { keys?: number },
  cacheKey: string,
  forceRegenerate: boolean
): Promise<OperationalTenantProfileResult | null> {
  const config = OPERATIONAL_TENANT_PROFILE_CONFIGS[assetType];
  if (!config) return null;

  const normalizedCacheKey = `${cacheKey}_normalized`;

  if (!forceRegenerate) {
    const cached = await getCachedContent(normalizedCacheKey);
    const fromCache = normalizeOperationalTenantProfile(cached, config);
    if (fromCache) return fromCache;
  }

  const prompt = buildOperationalTenantProfilePrompt(
    config,
    location,
    projectContext
  );

  const result = await aiProvider.generateChartData(prompt, {
    cacheKey,
    forceRegenerate,
  });

  const normalized = normalizeOperationalTenantProfile(result, config);
  if (!normalized) return null;

  await setCachedContent(normalizedCacheKey, normalized);
  return normalized;
}
