"use client";

/**
 * Operational-stream-only AI macro chart generation (GDP, Inflation, Population).
 * Intentionally self-contained — does NOT import from src/lib/feasibility/sale/.
 */

import type { SlideChart } from "@/types/feasibility";
import { aiProvider } from "@/lib/ai-service";
import { getCachedContent, setCachedContent } from "@/lib/cache-service";

/** Same prompt definitions as Sale's create-sale-puter-prompts.ts (copied, not shared). */
export const MACRO_CHART_PROMPTS: Record<string, (country: string) => string> = {
  GDP: (country) =>
    `Generate GDP growth data for ${country} as JSON:
{
  "title": "GDP Growth Trend & Projection (%)",
  "type": "line",
  "xKey": "year",
  "yKeys": ["value"],
  "data": [
    {"year": "2019", "value": NUMBER},
    {"year": "2020", "value": NUMBER},
    {"year": "2021", "value": NUMBER},
    {"year": "2022", "value": NUMBER},
    {"year": "2023", "value": NUMBER},
    {"year": "2024", "value": NUMBER},
    {"year": "2025E", "value": NUMBER},
    {"year": "2026E", "value": NUMBER}
  ]
}
Use realistic data for ${country}.`,

  Inflation: (country) =>
    `Generate inflation data for ${country} as JSON:
{
  "title": "Inflation Rate Trend & Projection (%)",
  "type": "line",
  "xKey": "year",
  "yKeys": ["rate"],
  "data": [
    {"year": "2019", "rate": NUMBER},
    ... through 2026E
  ]
}`,

  Population: (country) =>
    `Generate population data for ${country} as JSON:
{
  "title": "Population (millions)",
  "type": "line",
  "xKey": "year",
  "yKeys": ["population"],
  "data": [
    {"year": "2019", "population": NUMBER},
    ... through 2026E
  ]
}`,
};

const DEFAULT_Y_KEYS: Record<string, string[]> = {
  GDP: ["value"],
  Inflation: ["rate"],
  Population: ["population"],
};

const DEFAULT_COLORS: Record<string, string[]> = {
  GDP: ["#10b981"],
  Inflation: ["#f59e0b"],
  Population: ["#3b82f6"],
};

export const OPERATIONAL_MACRO_SLIDE_CHART_TYPE: Record<string, string> = {
  "macro-1": "GDP",
  "macro-2": "Inflation",
  "macro-3": "Population",
};

export function createOperationalMacroChartPrompt(
  macroType: string,
  country: string
): string | null {
  const builder = MACRO_CHART_PROMPTS[macroType];
  return builder ? builder(country) : null;
}

/** Cache key: operational_macro_{normalizedCountry}_{macroType} */
export function buildOperationalMacroChartCacheKey(
  country: string,
  macroType: string
): string {
  const normalizedCountry = country
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `operational_macro_${normalizedCountry || "unknown"}_${macroType}`;
}

export function normalizeOperationalMacroChart(
  raw: unknown,
  macroType?: string
): SlideChart | null {
  if (!raw || typeof raw !== "object") return null;
  const chart = raw as Partial<SlideChart>;
  if (!chart.data || !Array.isArray(chart.data) || chart.data.length === 0) {
    return null;
  }

  const yKeys =
    chart.yKeys && chart.yKeys.length > 0
      ? chart.yKeys
      : (macroType && DEFAULT_Y_KEYS[macroType]) || ["value"];

  return {
    type: chart.type === "bar" || chart.type === "line" ? chart.type : "line",
    title: chart.title ?? (macroType ? `${macroType} Trend` : "Chart"),
    data: chart.data,
    xKey: chart.xKey ?? "year",
    yKeys,
    colors: chart.colors ?? (macroType ? DEFAULT_COLORS[macroType] : undefined),
    height: chart.height ?? "flex-1",
    width: chart.width ?? "w-full",
  };
}

/**
 * Generate AI macro chart data for the Operational stream.
 * Returns null on failure so callers can keep static buildMacroSlides charts.
 */
export async function generateOperationalMacroChartData(
  macroType: string,
  country: string,
  cacheKey: string,
  forceRegenerate: boolean
): Promise<SlideChart | null> {
  const prompt = createOperationalMacroChartPrompt(macroType, country);
  if (!prompt) return null;

  const normalizedCacheKey = `${cacheKey}_normalized`;

  if (!forceRegenerate) {
    const cachedNormalized = await getCachedContent(normalizedCacheKey);
    const fromNormalized = normalizeOperationalMacroChart(
      cachedNormalized,
      macroType
    );
    if (fromNormalized) return fromNormalized;
  }

  const result = await aiProvider.generateChartData(prompt, {
    cacheKey,
    forceRegenerate,
  });

  const chart = normalizeOperationalMacroChart(result, macroType);
  if (!chart) return null;

  await setCachedContent(normalizedCacheKey, chart);
  return chart;
}
