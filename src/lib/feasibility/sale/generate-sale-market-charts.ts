import { fetchQwenJson } from "@/lib/feasibility/qwen-commentary";
import type {
  ChartDataPoint,
  FeasibilitySlide,
  SaleFeasibilityBundle,
  SlideChart,
} from "@/types/feasibility";
import {
  buildSaleMarketCharts,
  getSaleMarketChartsForSection,
  type SaleMarketChartsInput,
} from "@/lib/feasibility/sale/build-sale-market-data";

export type SaleMarketChartSection =
  | "overview"
  | "supplyDemand"
  | "pricing"
  | "velocity"
  | "competition";

function resolveCurrency(country: string): string {
  const c = country.toLowerCase();
  if (c.includes("malaysia")) return "MYR";
  if (c.includes("australia")) return "AUD";
  if (c.includes("oman")) return "OMR";
  if (c.includes("saudi")) return "SAR";
  return "AED";
}

function transactionBenchmark(country: string): string {
  const c = country.toLowerCase();
  if (c.includes("malaysia")) return "Malaysia had ~125B MYR transactions in 2024";
  if (c.includes("australia")) return "Australia had ~850B AUD transactions in 2024";
  if (c.includes("uae") || c.includes("emirates")) {
    return "UAE had ~520B AED transactions in 2024";
  }
  return "Use realistic transaction values for the local market";
}

function supplyContext(country: string): string {
  const c = country.toLowerCase();
  if (c.includes("malaysia")) return "moderate supply growth";
  if (c.includes("australia")) return "constrained supply in prime corridors";
  return "strong pipeline delivery in gateway cities";
}

function defaultSubjectRate(country: string): number {
  const c = country.toLowerCase();
  if (c.includes("malaysia")) return 60;
  if (c.includes("australia")) return 58;
  return 65;
}

export function buildSaleMarketChartPrompt(
  sectionKey: SaleMarketChartSection,
  country: string,
  city: string,
  assetType: string,
  avgPricePSF: number
): string {
  const currency = resolveCurrency(country);
  const txBenchmark = transactionBenchmark(country);
  const supplyCtx = supplyContext(country);
  const subjectRate = defaultSubjectRate(country);

  const sectionPrompt =
    sectionKey === "overview"
      ? `
Generate a bar chart showing Real Estate Transaction Volume & Value for ${country}:
- Years: 2019-2024E
- Volume: realistic transaction counts for ${assetType}
- Value: in billions ${currency}
- Show recovery trend post-2020
- ${txBenchmark}

Return format:
{
  "charts": [{
    "title": "Real Estate Transaction Volume & Value — ${city}",
    "type": "bar",
    "xKey": "year",
    "yKeys": ["volume", "value"],
    "data": [
      {"year": "2019", "volume": NUMBER, "value": NUMBER},
      ...
    ]
  }]
}`
      : sectionKey === "supplyDemand"
        ? `
Generate TWO charts for ${assetType} supply-demand in ${city}:

Chart 1: Supply Pipeline & Absorption Trends (2019-2026E)
- Show annual supply additions and absorption in units (thousands)
- Reflect ${supplyCtx}

Chart 2: Historical Price Trends (PSF)
- Years: 2019-2026E
- Starting price around ${Math.round(avgPricePSF * 0.75)} in 2019
- Ending price around ${Math.round(avgPricePSF * 1.15)} in 2026E

Return format:
{
  "charts": [
    {
      "title": "Supply Pipeline & Absorption Trends — ${city}",
      "type": "bar",
      "xKey": "year",
      "yKeys": ["supply", "absorption"],
      "data": [{"year": "2019", "supply": NUMBER, "absorption": NUMBER}, ...]
    },
    {
      "title": "Historical Price Trends (PSF) — ${city}",
      "type": "line",
      "xKey": "year",
      "yKeys": ["price"],
      "data": [{"year": "2019", "price": NUMBER}, ...]
    }
  ]
}`
        : sectionKey === "pricing"
          ? `
Generate competitive pricing benchmarking chart for ${city}:
- 4-5 comparable projects with realistic names
- Price per sqft from ${Math.round(avgPricePSF * 0.85)} to ${Math.round(avgPricePSF * 1.1)}
- Include "Subject Project" at ${avgPricePSF}

Return format:
{
  "charts": [{
    "title": "Competitive Pricing Benchmarking (PSF) — ${city}",
    "type": "bar",
    "xKey": "project",
    "yKeys": ["psf"],
    "data": [
      {"project": "Competitor Name", "psf": NUMBER},
      {"project": "Subject Project", "psf": ${avgPricePSF}, "isSubject": 1},
      ...
    ]
  }]
}`
          : sectionKey === "velocity"
            ? `
Generate sales absorption rate chart for ${city}:
- 4-5 projects with realistic names
- Absorption rates between 45-75% in first 12 months
- Include "Subject Project" at ${subjectRate}%
- Include months to sellout (15-28 months)

Return format:
{
  "charts": [{
    "title": "Sales Absorption Rate by Project — ${city}",
    "type": "bar",
    "xKey": "project",
    "yKeys": ["rate"],
    "data": [
      {"project": "Project Name", "rate": NUMBER, "months": NUMBER},
      ...
    ]
  }]
}`
            : `
Generate competitive benchmarking chart for ${city}:
- Compare 3-4 competitor projects vs Subject Project
- Metrics: pipeline units (Q1-Q4 delivery), competitive score 50-95
- Use grouped bar chart by quarter

Return format:
{
  "charts": [{
    "title": "Competing Pipeline Delivery — ${city}",
    "type": "bar",
    "xKey": "quarter",
    "yKeys": ["units"],
    "data": [
      {"quarter": "Q1", "units": NUMBER},
      {"quarter": "Q2", "units": NUMBER},
      ...
    ]
  }]
}`;

  return `
You are a real estate data analyst. Generate REALISTIC chart data for ${sectionKey} analysis in ${city}, ${country}.

ASSET TYPE: ${assetType}
AVERAGE PRICE: ${avgPricePSF} ${currency}/sqft

Generate chart data reflecting actual market conditions in ${country}. Use knowledge up to 2026.

${sectionPrompt}

CRITICAL:
- Use REALISTIC numbers for ${country}
- Numbers must be internally consistent
- Show appropriate trends (recovery post-2020, growth trajectory)
- NO placeholder values like 0, 999, or 12345
- Every chart must include type, title, xKey, yKeys, and data array
- Chart type must be "bar", "line", or "pie" only

Generate data that would pass institutional due diligence.
`.trim();
}

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#6366f1", "#059669", "#94a3b8"];

function inferYKeys(data: ChartDataPoint[], xKey: string): string[] {
  if (data.length === 0) return ["value"];
  const sample = data[0]!;
  return Object.keys(sample).filter(
    (k) =>
      k !== xKey &&
      k !== "isSubject" &&
      typeof sample[k] === "number"
  );
}

function normalizeChart(raw: Partial<SlideChart>): SlideChart | null {
  if (!raw.title || !Array.isArray(raw.data) || raw.data.length === 0) {
    return null;
  }

  const type =
    raw.type === "line" || raw.type === "bar" || raw.type === "pie" || raw.type === "area"
      ? raw.type
      : "bar";

  const xKey =
    raw.xKey ??
    (raw.data[0]?.year != null
      ? "year"
      : raw.data[0]?.project != null
        ? "project"
        : raw.data[0]?.quarter != null
          ? "quarter"
          : "label");

  const yKeys =
    raw.yKeys && raw.yKeys.length > 0 ? raw.yKeys : inferYKeys(raw.data, xKey);

  if (yKeys.length === 0) return null;

  return {
    type,
    title: raw.title,
    data: raw.data,
    xKey,
    yKeys,
    colors: raw.colors ?? CHART_COLORS.slice(0, yKeys.length),
  };
}

function normalizeCharts(rawCharts: unknown): SlideChart[] {
  if (!Array.isArray(rawCharts)) return [];
  return rawCharts
    .map((c) => normalizeChart(c as Partial<SlideChart>))
    .filter((c): c is SlideChart => c != null);
}

function buildFallbackCharts(
  sectionKey: SaleMarketChartSection,
  input: SaleMarketChartsInput
): SlideChart[] {
  const bundle = buildSaleMarketCharts(input);
  return getSaleMarketChartsForSection(sectionKey, bundle) ?? [];
}

/** Generate country-specific market charts via Puter.js (client), with deterministic fallback. */
export async function generateSaleMarketChartDataWithPuter(
  sectionKey: SaleMarketChartSection,
  country: string,
  city: string,
  assetType: string,
  avgPricePSF: number,
  generateChart: (
    prompt: string,
    cacheKey: string
  ) => Promise<unknown>,
  cacheKey: string,
  fallbackInput?: SaleMarketChartsInput
): Promise<SlideChart[]> {
  const prompt = buildSaleMarketChartPrompt(
    sectionKey,
    country,
    city,
    assetType,
    avgPricePSF
  );

  try {
    const result = await generateChart(prompt, cacheKey);
    const charts = normalizeCharts(
      result && typeof result === "object" && "charts" in (result as object)
        ? (result as { charts?: unknown }).charts
        : result
    );
    if (charts.length > 0) return charts;
  } catch (error) {
    console.error(
      `[Puter] Chart data generation failed for ${sectionKey}:`,
      error
    );
  }

  if (fallbackInput) {
    return buildFallbackCharts(sectionKey, fallbackInput);
  }

  return buildFallbackCharts(sectionKey, {
    projectInfo: { city, country, currency: resolveCurrency(country) },
    component2Data: { avgPricePSF },
  });
}

/** Generate country-specific market charts via Qwen, with deterministic fallback. */
export async function generateSaleMarketChartData(
  sectionKey: SaleMarketChartSection,
  country: string,
  city: string,
  assetType: string,
  avgPricePSF: number,
  fallbackInput?: SaleMarketChartsInput
): Promise<SlideChart[]> {
  const prompt = buildSaleMarketChartPrompt(
    sectionKey,
    country,
    city,
    assetType,
    avgPricePSF
  );

  const result = await fetchQwenJson<{ charts?: unknown }>(prompt, 2000);
  const charts = normalizeCharts(result?.charts);

  if (charts.length > 0) return charts;

  if (fallbackInput) {
    return buildFallbackCharts(sectionKey, fallbackInput);
  }

  return buildFallbackCharts(sectionKey, {
    projectInfo: { city, country, currency: resolveCurrency(country) },
    component2Data: { avgPricePSF },
  });
}

export const SALE_MARKET_CHART_SLIDES: Array<{
  slideId: string;
  sectionKey: SaleMarketChartSection;
}> = [
  { slideId: "sale-market-overview", sectionKey: "overview" },
  { slideId: "sale-market-supplyDemand", sectionKey: "supplyDemand" },
  { slideId: "sale-market-pricing", sectionKey: "pricing" },
  { slideId: "sale-market-velocity", sectionKey: "velocity" },
  { slideId: "sale-market-competition", sectionKey: "competition" },
];

/** Enrich sale market slides with Qwen-generated chart data. */
export async function enrichSaleMarketCharts(
  slides: FeasibilitySlide[],
  bundle: SaleFeasibilityBundle,
  assetLabel: string
): Promise<FeasibilitySlide[]> {
  const enriched = [...slides];
  const fallbackInput: SaleMarketChartsInput = {
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

  for (const { slideId, sectionKey } of SALE_MARKET_CHART_SLIDES) {
    const idx = enriched.findIndex((s) => s.id === slideId);
    if (idx < 0) continue;

    const charts = await generateSaleMarketChartData(
      sectionKey,
      bundle.location.country,
      bundle.location.city,
      assetLabel,
      bundle.saleMetrics.avgPricePsf,
      fallbackInput
    );

    if (charts.length > 0) {
      enriched[idx] = {
        ...enriched[idx]!,
        charts: charts.map((c) => ({
          ...c,
          height: c.height ?? "flex-1",
          width: c.width ?? "w-full",
        })),
      };
    }
  }

  return enriched;
}
