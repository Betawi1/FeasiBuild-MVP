"use client";

/**
 * Operational hotel-only AI market charts.
 * Intentionally self-contained — does NOT import from src/lib/feasibility/sale/.
 */

import type {
  AnnualRevenuesData,
  DemandChartData,
  FeasibilitySlide,
  HistoricalGuestsData,
  LengthOfStayData,
  SlideChart,
  SlideTable,
  TravelTourismDemandData,
} from "@/types/feasibility";
import { aiProvider } from "@/lib/ai-service";
import { getCachedContent, setCachedContent } from "@/lib/cache-service";

export type HospitalityChartType =
  | "tt-demand"
  | "arrivals-historical"
  | "arrivals-projected"
  | "adr-occupancy"
  | "revenues-by-class"
  | "supply-pipeline"
  | "historical-guests"
  | "length-of-stay";

export interface HospitalityChartConfig {
  chartType: HospitalityChartType;
  slideId: string;
  title: string;
  years: string[];
  commentaryCount: number;
  commentaryTopics: string[];
}

export interface HospitalityLocation {
  city: string;
  country: string;
}

export interface HospitalityProjectContext {
  assetType?: string;
  city: string;
  country: string;
  currency?: string;
  segment?: string;
  positioning?: string;
  keys?: number;
  adrYear1?: number;
  adrStabilized?: number;
  occupancyYear1?: number;
  occupancyStabilized?: number;
}

export interface HospitalityChartResult {
  charts: SlideChart[];
  commentary: string[];
  tables?: SlideTable[];
  footerMetrics?: Record<string, string>;
  /** Specialized slide payloads for dedicated UI components */
  travelTourismDemandData?: TravelTourismDemandData;
  annualRevenuesData?: AnnualRevenuesData & { summaryBullets?: string[] };
  historicalGuestsData?: HistoricalGuestsData & { summaryBullets?: string[] };
  lengthOfStayData?: LengthOfStayData & { summaryBullets?: string[] };
}

const ANTI_PLACEHOLDER = (
  city: string,
  country: string,
  bulletCount: number
) => `
CRITICAL INSTRUCTIONS:
1. DO NOT use generic phrases like "Charts and visualizations are included" or "data unavailable"
2. DO NOT use placeholder text, lorem ipsum, or mention API keys
3. MUST include SPECIFIC numeric data for ${city}, ${country} (or closest published market)
4. MUST be jurisdiction-specific (UAE → Dubai/Abu Dhabi; Malaysia → KL/Penang; Australia → Sydney/Melbourne; Oman → Muscat; KSA → Riyadh/Jeddah)
5. MUST generate EXACTLY ${bulletCount} detailed commentary bullets with unique, location-specific content
6. Return ONLY valid JSON — no markdown fences, no commentary outside JSON
`.trim();

const TT_DEMAND_COLORS = ["#4c1d95", "#92400e", "#166534", "#1e40af"];
const ARRIVALS_HIST_COLOR = ["#6366f1"];
const ARRIVALS_PROJ_COLOR = ["#8b5cf6"];
const ADR_COLOR = ["#10b981"];
const OCC_COLOR = ["#3b82f6"];
const CLASS_STACK_COLORS = ["#4c1d95", "#92400e", "#166534", "#1e3a8a"];
const SUPPLY_COLOR = ["#0d9488"];
const GUESTS_GROUP_COLORS = ["#4c1d95", "#92400e"];
const LOS_YEAR_COLORS = ["#4c1d95", "#92400e", "#166534"];

export const HOSPITALITY_CHART_CONFIGS: Record<
  HospitalityChartType,
  HospitalityChartConfig
> = {
  "tt-demand": {
    chartType: "tt-demand",
    slideId: "hosp-demand",
    title: "Travel & Tourism Demand",
    years: ["2020", "2021", "2022", "2023", "2024", "2025E"],
    commentaryCount: 5,
    commentaryTopics: [
      "Total T&T demand value (USD millions)",
      "Consumption share of demand",
      "Capital investment drivers",
      "Government expenditure / support",
      "CAGR vs real GDP growth",
    ],
  },
  "arrivals-historical": {
    chartType: "arrivals-historical",
    slideId: "hosp-arrivals-historical",
    title: "Historical Tourist Arrivals",
    years: ["2019", "2020", "2021", "2022", "2023", "2024"],
    commentaryCount: 5,
    commentaryTopics: [
      "Recovery from 2020 trough",
      "Aviation capacity expansion",
      "Visa reforms",
      "Specific events / exhibitions (local calendar)",
      "Impact on mid-scale / business hotel demand",
    ],
  },
  "arrivals-projected": {
    chartType: "arrivals-projected",
    slideId: "hosp-arrivals-projected",
    title: "Projected Tourist Arrivals",
    years: ["2025E", "2026E"],
    commentaryCount: 5,
    commentaryTopics: [
      "Government visitor targets / economic agenda",
      "Infrastructure expansion (airports, tourism nodes)",
      "Exhibition / MICE calendar",
      "Airline seat capacity outlook",
      "Absorption of new hotel supply",
    ],
  },
  "adr-occupancy": {
    chartType: "adr-occupancy",
    slideId: "adr-occupancy",
    title: "ADR & Occupancy — Competitive Set",
    years: ["2019", "2020", "2021", "2022", "2023", "2024"],
    commentaryCount: 5,
    commentaryTopics: [
      "Current market ADR / occupancy performance",
      "Subject positioning vs competitive set / submarket",
      "Stabilized ADR target rationale",
      "Stabilized occupancy target rationale",
      "Premium or discount vs market comps",
    ],
  },
  "revenues-by-class": {
    chartType: "revenues-by-class",
    slideId: "hosp-revenues",
    title: "Annual Revenues of Hotels by Class",
    years: ["2019", "2020", "2021", "2022", "2023", "2024E"],
    commentaryCount: 4,
    commentaryTopics: [
      "Revenue composition across hotel classes",
      "Five-star and four-star share of total revenue",
      "Growth comparison vs three-star / others",
      "Drivers (ADR, room inventory, F&B / other revenue)",
    ],
  },
  "supply-pipeline": {
    chartType: "supply-pipeline",
    slideId: "hosp-supply",
    title: "Hotel Supply Pipeline",
    years: ["2019", "2020", "2021", "2022", "2023", "2024", "2025E", "2026E"],
    commentaryCount: 5,
    commentaryTopics: [
      "Total hotel key stock",
      "Pipeline delivery 2024–2026",
      "Subject project share of stock",
      "Net absorption for positioning class",
      "Supply / oversupply risks",
    ],
  },
  "historical-guests": {
    chartType: "historical-guests",
    slideId: "hosp-guests",
    title: "Historical Figures of Hotel Guests",
    years: ["2018", "2019", "2020", "2021", "2022", "2023", "2024E"],
    commentaryCount: 3,
    commentaryTopics: [
      "Guest growth over the period",
      "Length of stay stability",
      "Five/four-star share of guests",
    ],
  },
  "length-of-stay": {
    chartType: "length-of-stay",
    slideId: "hosp-length-of-stay",
    title: "Average Length of Stay",
    years: ["Year 1", "Year 2", "Year 3"],
    commentaryCount: 4,
    commentaryTopics: [
      "Overall average length of stay",
      "Longest-stay source regions",
      "Five-star length-of-stay growth",
      "Four-star length-of-stay decline",
    ],
  },
};

/** Map slide ID → chart type for enrichment (all 8 hotel market chart slides). */
export const HOSPITALITY_SLIDE_CHART_TYPE: Record<string, HospitalityChartType> =
  {
    "hosp-demand": "tt-demand",
    "hosp-arrivals-historical": "arrivals-historical",
    "hosp-arrivals-projected": "arrivals-projected",
    "adr-occupancy": "adr-occupancy",
    "hosp-revenues": "revenues-by-class",
    "hosp-supply": "supply-pipeline",
    "hosp-guests": "historical-guests",
    "hosp-length-of-stay": "length-of-stay",
  };

export function buildHospitalityChartCacheKey(
  chartType: HospitalityChartType,
  location: HospitalityLocation
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
  return `hospitality_chart_${chartType}_${country || "unknown"}_${city || "unknown"}`;
}

function ctxBlock(
  location: HospitalityLocation,
  projectContext: HospitalityProjectContext
): string {
  const { city, country } = location;
  return `
PROJECT CONTEXT:
- Asset: ${projectContext.assetType ?? "Hotel"}
- City / Country: ${city}, ${country}
- Segment / positioning: ${projectContext.segment ?? "n/a"} / ${projectContext.positioning ?? "n/a"}
- Keys: ${projectContext.keys ?? "n/a"}
- Currency: ${projectContext.currency ?? "local"}
- Subject Year-1 ADR / Occ: ${projectContext.adrYear1 ?? "n/a"} / ${projectContext.occupancyYear1 ?? "n/a"}
- Subject stabilized ADR / Occ: ${projectContext.adrStabilized ?? "n/a"} / ${projectContext.occupancyStabilized ?? "n/a"}
`.trim();
}

export function buildHospitalityChartPrompt(
  chartType: string,
  location: HospitalityLocation,
  projectContext: HospitalityProjectContext
): string {
  const typed = chartType as HospitalityChartType;
  const config = HOSPITALITY_CHART_CONFIGS[typed];
  if (!config) {
    return `Generate hospitality market chart JSON for ${chartType} in ${location.city}, ${location.country}.`;
  }

  const { city, country } = location;
  const anti = ANTI_PLACEHOLDER(city, country, config.commentaryCount);
  const ctx = ctxBlock(location, projectContext);
  const topics = config.commentaryTopics.map((t) => `- ${t}`).join("\n");
  const currency = projectContext.currency || "local currency";

  if (typed === "tt-demand") {
    return `
You are a senior hospitality / tourism economist preparing the Travel & Tourism Demand slide.
${ctx}
Generate a STACKED BAR chart of T&T demand components in USD millions for ${country} (${city} gateway focus).
Years (exact): ${config.years.map((y) => `"${y}"`).join(", ")}
Series keys: consumption, capitalInvestment, governmentExpenditure, nonVisitorExports
COMMENTARY (exactly ${config.commentaryCount} bullets) covering:
${topics}
${anti}
Return ONLY this JSON:
{
  "charts": [{
    "title": "Travel & Tourism Demand in ${country} (USD millions)",
    "type": "bar",
    "stacked": true,
    "xKey": "year",
    "yKeys": ["consumption", "capitalInvestment", "governmentExpenditure", "nonVisitorExports"],
    "data": [
      {"year": "2020", "consumption": NUMBER, "capitalInvestment": NUMBER, "governmentExpenditure": NUMBER, "nonVisitorExports": NUMBER}
    ]
  }],
  "commentary": ["b1","b2","b3","b4","b5"],
  "cagr": "X.X%",
  "realGrowth": "X.X%"
}
`.trim();
  }

  if (typed === "arrivals-historical") {
    return `
You are a senior tourism market analyst preparing Historical Tourist Arrivals for ${city}, ${country}.
${ctx}
Generate a BAR chart of international arrivals (millions).
Years (exact): ${config.years.map((y) => `"${y}"`).join(", ")}
Metric key: arrivals
COMMENTARY (exactly ${config.commentaryCount} bullets) covering:
${topics}
${anti}
Return ONLY this JSON:
{
  "charts": [{
    "title": "Historical International Arrivals (millions)",
    "type": "bar",
    "xKey": "year",
    "yKeys": ["arrivals"],
    "data": [{"year": "2019", "arrivals": NUMBER}]
  }],
  "commentary": ["b1","b2","b3","b4","b5"]
}
`.trim();
  }

  if (typed === "arrivals-projected") {
    return `
You are a senior tourism market analyst preparing Projected Tourist Arrivals for ${city}, ${country}.
${ctx}
Generate a BAR chart of projected international arrivals (millions).
Years (exact): ${config.years.map((y) => `"${y}"`).join(", ")}
Metric key: arrivals
COMMENTARY (exactly ${config.commentaryCount} bullets) covering:
${topics}
${anti}
Return ONLY this JSON:
{
  "charts": [{
    "title": "Projected International Arrivals (millions)",
    "type": "bar",
    "xKey": "year",
    "yKeys": ["arrivals"],
    "data": [{"year": "2025E", "arrivals": NUMBER}, {"year": "2026E", "arrivals": NUMBER}]
  }],
  "commentary": ["b1","b2","b3","b4","b5"]
}
`.trim();
  }

  if (typed === "adr-occupancy") {
    return `
You are a senior hotel market analyst preparing ADR & Occupancy — Competitive Set for ${city}, ${country}.
${ctx}
Generate TWO LINE charts for the competitive set (2019–2024):
1) Market ADR Index — yKey "adr"
2) Market Occupancy % — yKey "occupancy"
Years (exact): ${config.years.map((y) => `"${y}"`).join(", ")}
COMMENTARY (exactly ${config.commentaryCount} bullets) covering:
${topics}
${anti}
Return ONLY this JSON:
{
  "charts": [
    {"title": "Market ADR Index", "type": "line", "xKey": "year", "yKeys": ["adr"], "data": [{"year": "2019", "adr": NUMBER}]},
    {"title": "Market Occupancy (%)", "type": "line", "xKey": "year", "yKeys": ["occupancy"], "data": [{"year": "2019", "occupancy": NUMBER}]}
  ],
  "commentary": ["b1","b2","b3","b4","b5"]
}
`.trim();
  }

  if (typed === "revenues-by-class") {
    return `
You are a senior hotel market analyst preparing Annual Revenues of Hotels by Class for ${city}, ${country}.
${ctx}
Generate a STACKED BAR chart of hotel revenues by class in ${currency} 000s.
Years (exact): ${config.years.map((y) => `"${y}"`).join(", ")}
Series keys: fiveStar, fourStar, threeStar, others
Also provide CAGR footer metrics for fiveStar and fourStar (and optionally threeStar/others).
COMMENTARY (exactly ${config.commentaryCount} bullets) covering:
${topics}
${anti}
Return ONLY this JSON:
{
  "charts": [{
    "title": "Annual revenues of ${city} hotels by hotel class (${currency} 000)",
    "type": "bar",
    "stacked": true,
    "xKey": "year",
    "yKeys": ["fiveStar", "fourStar", "threeStar", "others"],
    "data": [
      {"year": "2019", "fiveStar": NUMBER, "fourStar": NUMBER, "threeStar": NUMBER, "others": NUMBER}
    ]
  }],
  "commentary": ["b1","b2","b3","b4"],
  "footerMetrics": {
    "fiveStarCagr": "X.X%",
    "fourStarCagr": "X.X%",
    "threeStarCagr": "X.X%",
    "othersCagr": "X.X%"
  }
}
`.trim();
  }

  if (typed === "supply-pipeline") {
    return `
You are a senior hotel supply analyst preparing Hotel Supply Pipeline for ${city}, ${country}.
${ctx}
Generate a BAR chart of hotel key stock in THOUSANDS (e.g. 120 = 120,000 keys).
Years (exact): ${config.years.map((y) => `"${y}"`).join(", ")}
Metric key: keys
Also provide a Supply Context summary:
- marketStockKeys (absolute keys, not thousands)
- subjectKeys (use project keys if provided: ${projectContext.keys ?? "estimate"})
- subjectSharePct (percentage)
COMMENTARY (exactly ${config.commentaryCount} bullets) covering:
${topics}
${anti}
Return ONLY this JSON:
{
  "charts": [{
    "title": "Hotel Keys Stock (thousands)",
    "type": "bar",
    "xKey": "year",
    "yKeys": ["keys"],
    "data": [{"year": "2019", "keys": NUMBER}]
  }],
  "commentary": ["b1","b2","b3","b4","b5"],
  "supplyContext": {
    "marketStockKeys": NUMBER,
    "subjectKeys": NUMBER,
    "subjectSharePct": NUMBER
  }
}
`.trim();
  }

  if (typed === "historical-guests") {
    return `
You are a senior hotel demand analyst preparing Historical Hotel Guests for ${city}, ${country}.
${ctx}
Generate TWO charts:
1) GROUPED BAR — years ${config.years.map((y) => `"${y}"`).join(", ")}
   Metrics: totalGuests (millions), guestNights (millions). Also include avgLengthOfStay (days) per year for the data payload.
2) STACKED BAR — years "2021","2022","2023","2024E"
   Metrics (thousands of guests): fiveStar, fourStar, threeStar, others
Also provide footerMetrics: cagrGuests, cagrGuestNights.
COMMENTARY (exactly ${config.commentaryCount} bullets) covering:
${topics}
${anti}
Return ONLY this JSON:
{
  "charts": [
    {
      "title": "Number of hotel guests & guest nights, ${country}",
      "type": "bar",
      "xKey": "year",
      "yKeys": ["totalGuests", "guestNights"],
      "data": [{"year": "2018", "totalGuests": NUMBER, "guestNights": NUMBER, "avgLengthOfStay": NUMBER}]
    },
    {
      "title": "Hotel guests by class (thousands)",
      "type": "bar",
      "stacked": true,
      "xKey": "year",
      "yKeys": ["fiveStar", "fourStar", "threeStar", "others"],
      "data": [{"year": "2021", "fiveStar": NUMBER, "fourStar": NUMBER, "threeStar": NUMBER, "others": NUMBER}]
    }
  ],
  "commentary": ["b1","b2","b3"],
  "footerMetrics": { "cagrGuests": "X.X%", "cagrGuestNights": "X.X%" }
}
`.trim();
  }

  // length-of-stay
  return `
You are a senior hotel market analyst preparing Average Length of Stay for ${city}, ${country}.
${ctx}
Generate TWO GROUPED BAR charts (average days):
1) By region — xKey "region" with categories: Europe, Africa, Asia, Americas, GCC
   Metrics: year1, year2, year3 (three consecutive recent observation years)
2) By hotel class — xKey "hotelClass" with categories: Five-star, Four-star, Three-star, Others
   Metrics: year1, year2, year3
Also provide per-class CAGR strings and overallAverage (latest year average days).
COMMENTARY (exactly ${config.commentaryCount} bullets) covering:
${topics}
${anti}
Return ONLY this JSON:
{
  "charts": [
    {
      "title": "Average length of stay by region, ${country}",
      "type": "bar",
      "xKey": "region",
      "yKeys": ["year1", "year2", "year3"],
      "data": [{"region": "Europe", "year1": NUMBER, "year2": NUMBER, "year3": NUMBER, "cagr": "X.X%"}]
    },
    {
      "title": "Average length of stay by hotel class, ${country}",
      "type": "bar",
      "xKey": "hotelClass",
      "yKeys": ["year1", "year2", "year3"],
      "data": [{"hotelClass": "Five-star", "year1": NUMBER, "year2": NUMBER, "year3": NUMBER, "cagr": "X.X%"}]
    }
  ],
  "commentary": ["b1","b2","b3","b4"],
  "overallAverage": NUMBER,
  "footerMetrics": {
    "fiveStarCagr": "X.X%",
    "fourStarCagr": "X.X%",
    "threeStarCagr": "X.X%",
    "othersCagr": "X.X%"
  }
}
`.trim();
}

function asCommentary(raw: unknown, minCount = 3): string[] | null {
  if (!Array.isArray(raw)) return null;
  const bullets = raw
    .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
    .map((b) => b.trim());
  return bullets.length >= minCount ? bullets : null;
}

function asFooterMetrics(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = `${v}%`;
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeOneChart(
  raw: unknown,
  defaults: {
    title: string;
    type: SlideChart["type"];
    yKeys: string[];
    colors: string[];
    stacked?: boolean;
    xKey?: string;
  }
): SlideChart | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<SlideChart>;
  if (!c.data || !Array.isArray(c.data) || c.data.length === 0) return null;
  const yKeys =
    c.yKeys && c.yKeys.length > 0 ? c.yKeys : defaults.yKeys;
  return {
    type:
      c.type === "bar" || c.type === "line" || c.type === "pie" || c.type === "area"
        ? c.type
        : defaults.type,
    title:
      typeof c.title === "string" && c.title.trim()
        ? c.title
        : defaults.title,
    data: c.data,
    xKey: c.xKey ?? defaults.xKey ?? "year",
    yKeys,
    colors: c.colors ?? defaults.colors,
    stacked: c.stacked ?? defaults.stacked,
    height: c.height ?? "flex-1",
    width: c.width ?? "w-full",
  };
}

function toTravelTourismDemandData(
  chart: SlideChart,
  commentary: string[],
  raw: Record<string, unknown>
): TravelTourismDemandData | undefined {
  const chartData: DemandChartData[] = [];
  for (const row of chart.data) {
    const r = row as Record<string, string | number | undefined>;
    const year = String(r.year ?? "");
    const consumption = Number(r.consumption);
    const capitalInvestment = Number(r.capitalInvestment);
    const governmentExpenditure = Number(r.governmentExpenditure);
    const nonVisitorExports = Number(r.nonVisitorExports);
    if (
      !year ||
      !Number.isFinite(consumption) ||
      !Number.isFinite(capitalInvestment) ||
      !Number.isFinite(governmentExpenditure) ||
      !Number.isFinite(nonVisitorExports)
    ) {
      continue;
    }
    chartData.push({
      year,
      consumption,
      capitalInvestment,
      governmentExpenditure,
      nonVisitorExports,
    });
  }
  if (chartData.length < 3) return undefined;
  return {
    chartData,
    cagr: typeof raw.cagr === "string" && raw.cagr.trim() ? raw.cagr.trim() : "—",
    realGrowth:
      typeof raw.realGrowth === "string" && raw.realGrowth.trim()
        ? raw.realGrowth.trim()
        : "—",
    bulletPoints: commentary.slice(0, 6),
  };
}

function toAnnualRevenuesData(
  chart: SlideChart,
  commentary: string[],
  footer?: Record<string, string>
): (AnnualRevenuesData & { summaryBullets?: string[] }) | undefined {
  const yearlyData: AnnualRevenuesData["yearlyData"] = [];
  for (const row of chart.data) {
    const r = row as Record<string, string | number | undefined>;
    const year = String(r.year ?? "");
    const fiveStar = Number(r.fiveStar);
    const fourStar = Number(r.fourStar);
    const threeStar = Number(r.threeStar);
    const others = Number(r.others);
    if (
      !year ||
      ![fiveStar, fourStar, threeStar, others].every(Number.isFinite)
    ) {
      continue;
    }
    yearlyData.push({
      year,
      fiveStar,
      fourStar,
      threeStar,
      others,
      total: fiveStar + fourStar + threeStar + others,
    });
  }
  if (yearlyData.length < 3) return undefined;
  return {
    yearlyData,
    cagrByClass: {
      fiveStar: footer?.fiveStarCagr ?? "—",
      fourStar: footer?.fourStarCagr ?? "—",
      threeStar: footer?.threeStarCagr ?? "—",
      others: footer?.othersCagr ?? "—",
    },
    summaryBullets: commentary,
  };
}

function toHistoricalGuestsData(
  charts: SlideChart[],
  commentary: string[],
  footer?: Record<string, string>
): (HistoricalGuestsData & { summaryBullets?: string[] }) | undefined {
  const guestsChart = charts[0];
  const classChart = charts[1];
  if (!guestsChart || !classChart) return undefined;

  const yearlyData: HistoricalGuestsData["yearlyData"] = [];
  for (const row of guestsChart.data) {
    const r = row as Record<string, string | number | undefined>;
    const year = String(r.year ?? "");
    const totalGuests = Number(r.totalGuests);
    const guestNights = Number(r.guestNights);
    const avgLengthOfStay = Number(
      r.avgLengthOfStay ??
        (Number.isFinite(totalGuests) &&
        totalGuests > 0 &&
        Number.isFinite(guestNights)
          ? guestNights / totalGuests
          : NaN)
    );
    if (
      !year ||
      !Number.isFinite(totalGuests) ||
      !Number.isFinite(guestNights)
    ) {
      continue;
    }
    yearlyData.push({
      year,
      totalGuests,
      guestNights,
      avgLengthOfStay: Number.isFinite(avgLengthOfStay)
        ? Math.round(avgLengthOfStay * 10) / 10
        : 0,
    });
  }

  const compositionByClass: HistoricalGuestsData["compositionByClass"] = [];
  for (const row of classChart.data) {
    const r = row as Record<string, string | number | undefined>;
    const year = String(r.year ?? "");
    const fiveStar = Number(r.fiveStar);
    const fourStar = Number(r.fourStar);
    const threeStar = Number(r.threeStar);
    const others = Number(r.others);
    if (
      !year ||
      ![fiveStar, fourStar, threeStar, others].every(Number.isFinite)
    ) {
      continue;
    }
    compositionByClass.push({ year, fiveStar, fourStar, threeStar, others });
  }

  if (yearlyData.length < 3 || compositionByClass.length < 2) return undefined;

  return {
    yearlyData,
    compositionByClass,
    cagrGuests: footer?.cagrGuests ?? "—",
    cagrGuestNights: footer?.cagrGuestNights ?? "—",
    summaryBullets: commentary,
  };
}

function toLengthOfStayData(
  charts: SlideChart[],
  commentary: string[],
  raw: Record<string, unknown>,
  footer?: Record<string, string>
): (LengthOfStayData & { summaryBullets?: string[] }) | undefined {
  const regionChart = charts[0];
  const classChart = charts[1];
  if (!regionChart || !classChart) return undefined;

  const pickYears = (r: Record<string, string | number | undefined>) => {
    const y1 = Number(r.year1 ?? r.year2004);
    const y2 = Number(r.year2 ?? r.year2005);
    const y3 = Number(r.year3 ?? r.year2006);
    return { y1, y2, y3 };
  };

  const byRegion: LengthOfStayData["byRegion"] = [];
  for (const row of regionChart.data) {
    const r = row as Record<string, string | number | undefined>;
    const region = String(r.region ?? "").trim();
    const { y1, y2, y3 } = pickYears(r);
    if (!region || ![y1, y2, y3].every(Number.isFinite)) continue;
    byRegion.push({
      region,
      year2004: y1,
      year2005: y2,
      year2006: y3,
      cagr: typeof r.cagr === "string" ? r.cagr : "—",
    });
  }

  const byHotelClass: LengthOfStayData["byHotelClass"] = [];
  for (const row of classChart.data) {
    const r = row as Record<string, string | number | undefined>;
    const hotelClass = String(r.hotelClass ?? r.class ?? "").trim();
    const { y1, y2, y3 } = pickYears(r);
    if (!hotelClass || ![y1, y2, y3].every(Number.isFinite)) continue;

    let cagr = typeof r.cagr === "string" ? r.cagr : "—";
    const lower = hotelClass.toLowerCase();
    if (lower.includes("five") && footer?.fiveStarCagr) cagr = footer.fiveStarCagr;
    if (lower.includes("four") && footer?.fourStarCagr) cagr = footer.fourStarCagr;
    if (lower.includes("three") && footer?.threeStarCagr) cagr = footer.threeStarCagr;
    if (lower.includes("other") && footer?.othersCagr) cagr = footer.othersCagr;

    byHotelClass.push({
      hotelClass,
      year2004: y1,
      year2005: y2,
      year2006: y3,
      cagr,
    });
  }

  if (byRegion.length < 3 || byHotelClass.length < 3) return undefined;

  const overallAverage2006 = Number(
    raw.overallAverage ??
      byRegion.reduce((s, r) => s + r.year2006, 0) / byRegion.length
  );

  // Remap chart yKeys to UI field names for MarketReview fallback if needed
  const regionChartUi: SlideChart = {
    ...regionChart,
    yKeys: ["year2004", "year2005", "year2006"],
    data: byRegion.map((r) => ({
      region: r.region,
      year2004: r.year2004,
      year2005: r.year2005,
      year2006: r.year2006,
    })),
    colors: LOS_YEAR_COLORS,
  };
  const classChartUi: SlideChart = {
    ...classChart,
    xKey: "hotelClass",
    yKeys: ["year2004", "year2005", "year2006"],
    data: byHotelClass.map((r) => ({
      hotelClass: r.hotelClass,
      year2004: r.year2004,
      year2005: r.year2005,
      year2006: r.year2006,
    })),
    colors: LOS_YEAR_COLORS,
  };
  void regionChartUi;
  void classChartUi;

  return {
    byRegion,
    byHotelClass,
    overallAverage2006: Number.isFinite(overallAverage2006)
      ? Math.round(overallAverage2006 * 10) / 10
      : 0,
    summaryBullets: commentary,
  };
}

function toSupplyTables(
  raw: Record<string, unknown>,
  projectKeys?: number
): SlideTable[] | undefined {
  const ctx =
    raw.supplyContext && typeof raw.supplyContext === "object"
      ? (raw.supplyContext as Record<string, unknown>)
      : null;
  if (!ctx) return undefined;

  const marketStockKeys = Number(ctx.marketStockKeys);
  const subjectKeys = Number(ctx.subjectKeys ?? projectKeys);
  let subjectSharePct = Number(ctx.subjectSharePct);
  if (
    !Number.isFinite(subjectSharePct) &&
    Number.isFinite(marketStockKeys) &&
    marketStockKeys > 0 &&
    Number.isFinite(subjectKeys)
  ) {
    subjectSharePct = (subjectKeys / marketStockKeys) * 100;
  }

  if (!Number.isFinite(marketStockKeys)) return undefined;

  return [
    {
      title: "Supply Context",
      headers: ["Indicator", "Value"],
      rows: [
        ["Market stock (keys)", Math.round(marketStockKeys).toLocaleString()],
        [
          "Subject keys",
          Number.isFinite(subjectKeys)
            ? Math.round(subjectKeys).toLocaleString()
            : "—",
        ],
        [
          "Share of stock",
          Number.isFinite(subjectSharePct)
            ? `${Math.round(subjectSharePct * 10) / 10}%`
            : "—",
        ],
      ],
      footer: "Subject share based on market stock estimate.",
    },
  ];
}

export function normalizeHospitalityCharts(
  raw: unknown,
  chartType: string
): HospitalityChartResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const typed = chartType as HospitalityChartType;
  const config = HOSPITALITY_CHART_CONFIGS[typed];
  const minBullets = Math.min(3, config?.commentaryCount ?? 3);
  const commentary = asCommentary(obj.commentary, minBullets);
  if (!commentary) return null;

  const chartsRaw = Array.isArray(obj.charts)
    ? obj.charts
    : obj.chart
      ? [obj.chart]
      : [];
  const footerMetrics = asFooterMetrics(obj.footerMetrics);

  if (typed === "tt-demand") {
    const chart = normalizeOneChart(chartsRaw[0], {
      title: "Travel & Tourism Demand (USD millions)",
      type: "bar",
      yKeys: [
        "consumption",
        "capitalInvestment",
        "governmentExpenditure",
        "nonVisitorExports",
      ],
      colors: TT_DEMAND_COLORS,
      stacked: true,
    });
    if (!chart) return null;
    return {
      charts: [chart],
      commentary,
      travelTourismDemandData: toTravelTourismDemandData(chart, commentary, obj),
    };
  }

  if (typed === "arrivals-historical") {
    const chart = normalizeOneChart(chartsRaw[0], {
      title: "Historical International Arrivals (millions)",
      type: "bar",
      yKeys: ["arrivals"],
      colors: ARRIVALS_HIST_COLOR,
    });
    if (!chart) return null;
    return { charts: [chart], commentary };
  }

  if (typed === "arrivals-projected") {
    const chart = normalizeOneChart(chartsRaw[0], {
      title: "Projected International Arrivals (millions)",
      type: "bar",
      yKeys: ["arrivals"],
      colors: ARRIVALS_PROJ_COLOR,
    });
    if (!chart) return null;
    return { charts: [chart], commentary };
  }

  if (typed === "adr-occupancy") {
    let adrChart = normalizeOneChart(chartsRaw[0], {
      title: "Market ADR Index",
      type: "line",
      yKeys: ["adr"],
      colors: ADR_COLOR,
    });
    let occChart = normalizeOneChart(chartsRaw[1], {
      title: "Market Occupancy (%)",
      type: "line",
      yKeys: ["occupancy"],
      colors: OCC_COLOR,
    });

    if ((!adrChart || !occChart) && chartsRaw[0] && typeof chartsRaw[0] === "object") {
      const combined = chartsRaw[0] as Partial<SlideChart>;
      if (combined.data && Array.isArray(combined.data)) {
        adrChart = {
          type: "line",
          title: "Market ADR Index",
          data: combined.data,
          xKey: "year",
          yKeys: ["adr"],
          colors: ADR_COLOR,
          height: "flex-1",
          width: "w-full",
        };
        occChart = {
          type: "line",
          title: "Market Occupancy (%)",
          data: combined.data,
          xKey: "year",
          yKeys: ["occupancy"],
          colors: OCC_COLOR,
          height: "flex-1",
          width: "w-full",
        };
      }
    }

    if (!adrChart || !occChart) return null;
    return { charts: [adrChart, occChart], commentary };
  }

  if (typed === "revenues-by-class") {
    const chart = normalizeOneChart(chartsRaw[0], {
      title: "Annual revenues of hotels by hotel class",
      type: "bar",
      yKeys: ["fiveStar", "fourStar", "threeStar", "others"],
      colors: CLASS_STACK_COLORS,
      stacked: true,
    });
    if (!chart) return null;
    const annualRevenuesData = toAnnualRevenuesData(
      chart,
      commentary,
      footerMetrics
    );
    if (!annualRevenuesData) return null;
    return {
      charts: [chart],
      commentary,
      footerMetrics,
      annualRevenuesData,
    };
  }

  if (typed === "supply-pipeline") {
    const chart = normalizeOneChart(chartsRaw[0], {
      title: "Hotel Keys Stock (thousands)",
      type: "bar",
      yKeys: ["keys"],
      colors: SUPPLY_COLOR,
    });
    if (!chart) return null;
    return {
      charts: [chart],
      commentary,
      tables: toSupplyTables(obj),
    };
  }

  if (typed === "historical-guests") {
    const guestsChart = normalizeOneChart(chartsRaw[0], {
      title: "Number of hotel guests & guest nights",
      type: "bar",
      yKeys: ["totalGuests", "guestNights"],
      colors: GUESTS_GROUP_COLORS,
      stacked: false,
    });
    const classChart = normalizeOneChart(chartsRaw[1], {
      title: "Hotel guests by class (thousands)",
      type: "bar",
      yKeys: ["fiveStar", "fourStar", "threeStar", "others"],
      colors: CLASS_STACK_COLORS,
      stacked: true,
    });
    if (!guestsChart || !classChart) return null;
    const historicalGuestsData = toHistoricalGuestsData(
      [guestsChart, classChart],
      commentary,
      footerMetrics
    );
    if (!historicalGuestsData) return null;
    return {
      charts: [guestsChart, classChart],
      commentary,
      footerMetrics,
      historicalGuestsData,
    };
  }

  if (typed === "length-of-stay") {
    const regionChart = normalizeOneChart(chartsRaw[0], {
      title: "Average length of stay by region",
      type: "bar",
      xKey: "region",
      yKeys: ["year1", "year2", "year3"],
      colors: LOS_YEAR_COLORS,
    });
    const classChart = normalizeOneChart(chartsRaw[1], {
      title: "Average length of stay by hotel class",
      type: "bar",
      xKey: "hotelClass",
      yKeys: ["year1", "year2", "year3"],
      colors: LOS_YEAR_COLORS,
    });
    if (!regionChart || !classChart) return null;

    const lengthOfStayData = toLengthOfStayData(
      [regionChart, classChart],
      commentary,
      obj,
      footerMetrics
    );
    if (!lengthOfStayData) return null;

    // Charts remapped to year2004/5/6 for any MarketReview fallback
    const charts: SlideChart[] = [
      {
        ...regionChart,
        yKeys: ["year2004", "year2005", "year2006"],
        data: lengthOfStayData.byRegion.map((r) => ({
          region: r.region,
          year2004: r.year2004,
          year2005: r.year2005,
          year2006: r.year2006,
        })),
      },
      {
        ...classChart,
        xKey: "hotelClass",
        yKeys: ["year2004", "year2005", "year2006"],
        data: lengthOfStayData.byHotelClass.map((r) => ({
          hotelClass: r.hotelClass,
          year2004: r.year2004,
          year2005: r.year2005,
          year2006: r.year2006,
        })),
      },
    ];

    return {
      charts,
      commentary,
      footerMetrics,
      lengthOfStayData,
    };
  }

  return null;
}

export async function generateHospitalityChartData(
  chartType: string,
  location: HospitalityLocation,
  projectContext: HospitalityProjectContext,
  cacheKey: string,
  forceRegenerate: boolean
): Promise<HospitalityChartResult | null> {
  const typed = chartType as HospitalityChartType;
  if (!HOSPITALITY_CHART_CONFIGS[typed]) return null;

  const normalizedCacheKey = `${cacheKey}_normalized`;

  if (!forceRegenerate) {
    const cached = await getCachedContent(normalizedCacheKey);
    const fromCache = normalizeHospitalityCharts(cached, typed);
    if (fromCache) return fromCache;
  }

  const prompt = buildHospitalityChartPrompt(typed, location, projectContext);
  let result: unknown;
  try {
    result = await aiProvider.generateChartData(prompt, {
      cacheKey,
      forceRegenerate,
    });
  } catch (e) {
    console.warn(
      "[generateChartData] chart JSON unavailable — skipping chart.",
      e
    );
    return null;
  }
  if (!result) return null;

  const normalized = normalizeHospitalityCharts(result, typed);
  if (!normalized) return null;

  // Attach project keys into supply table if AI omitted subjectKeys
  if (typed === "supply-pipeline" && !normalized.tables?.length) {
    const withKeys = toSupplyTables(
      (result && typeof result === "object" ? result : {}) as Record<
        string,
        unknown
      >,
      projectContext.keys
    );
    if (withKeys) normalized.tables = withKeys;
  } else if (typed === "supply-pipeline" && normalized.tables?.length) {
    // Prefer project keys when available
    if (projectContext.keys && Number.isFinite(projectContext.keys)) {
      const table = normalized.tables[0]!;
      normalized.tables = [
        {
          ...table,
          rows: table.rows.map((row) =>
            row[0] === "Subject keys"
              ? [row[0], projectContext.keys!.toLocaleString()]
              : row
          ),
        },
      ];
    }
  }

  await setCachedContent(normalizedCacheKey, normalized);
  return normalized;
}

/**
 * Overwrite hotel market chart slides with AI data when available.
 * On failure, leave static slides from build-hospitality-market-slides /
 * generate-hospitality-extended-data intact.
 */
export async function enrichHospitalityMarketCharts(
  slides: FeasibilitySlide[],
  location: HospitalityLocation,
  projectContext: HospitalityProjectContext,
  forceRegenerate: boolean
): Promise<FeasibilitySlide[]> {
  const enriched = [...slides];

  await Promise.all(
    Object.entries(HOSPITALITY_SLIDE_CHART_TYPE).map(
      async ([slideId, chartType]) => {
        const idx = enriched.findIndex((s) => s.id === slideId);
        if (idx < 0) return;

        const cacheKey = buildHospitalityChartCacheKey(chartType, location);
        try {
          const result = await generateHospitalityChartData(
            chartType,
            location,
            projectContext,
            cacheKey,
            forceRegenerate
          );

          if (!result) return;

          const prev = enriched[idx]!;
          const dataPayload =
            result.travelTourismDemandData ??
            result.annualRevenuesData ??
            result.historicalGuestsData ??
            result.lengthOfStayData;

          enriched[idx] = {
            ...prev,
            charts: result.charts,
            paragraphs: result.commentary,
            bulletPoints: result.commentary,
            ...(result.tables ? { tables: result.tables } : {}),
            ...(dataPayload ? { data: dataPayload } : {}),
          };
        } catch (e) {
          console.warn(
            "[generateChartData] chart JSON unavailable — skipping chart.",
            e
          );
        }
      }
    )
  );

  return enriched;
}
