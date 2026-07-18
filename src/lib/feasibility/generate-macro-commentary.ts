import type { MacroSection } from "@/lib/feasibility/macro-data";
import {
  buildAntiTemplateRetryPrompt,
  validateContentQuality,
} from "@/lib/feasibility/commentary-quality";
import { fetchQwenParagraphs } from "@/lib/feasibility/qwen-commentary";

export interface MacroCommentaryContext {
  city?: string;
  country: string;
  subMarket?: string;
  assetType?: string;
  projectIRR?: number | string;
  equityMultiple?: number | string;
  constructionMonths?: number | string;
  currency?: string;
}

function locationLabel(country: string, city: string, subMarket?: string): string {
  return subMarket && subMarket !== city
    ? `${subMarket}, ${city}, ${country}`
    : `${city}, ${country}`;
}

function gdpPrompt(
  country: string,
  city: string,
  assetType: string,
  subMarket?: string
): string {
  const where = locationLabel(country, city, subMarket);
  return `
You are a senior macroeconomic analyst specializing in ${country}'s economy. Generate COMPREHENSIVE, UNIQUE commentary about ${country}'s GDP and economic performance.

CONTEXT: ${assetType} feasibility study in ${where}
${subMarket ? `SUB-MARKET: ${subMarket} — reference this micro-market when linking macro trends to local real estate demand.` : ""}

SPECIFIC REQUIREMENTS:
1. Provide ACTUAL current GDP figure for ${country} (in USD billions) — use knowledge up to 2026
2. Calculate REAL 5-year CAGR based on ${country}'s actual economic performance
3. Identify SPECIFIC sectors driving growth in ${country} (name actual industries, not generic "services")
4. Reference ACTUAL government policies, initiatives, or transformation programs in ${country}
5. Mention SPECIFIC infrastructure projects or investments (with dollar amounts if possible)
6. Discuss ${country}'s economic diversification efforts with concrete examples
7. Connect to real estate: How does ${country}'s economic performance specifically support ${assetType} demand in ${where}?

CRITICAL:
- DO NOT use generic phrases like "resilient growth" without quantification
- DO NOT repeat the same structure used for other countries
- DO mention ${country}-specific institutions, policies, or economic characteristics
- Include at least ONE specific statistic or fact unique to ${country}
- DO NOT include thinking process, analysis steps, or prompt instructions in output
- Minimum 6 detailed bullet points (200+ words total)

Return JSON: { "paragraphs": string[] }

Generate UNIQUE, SPECIFIC content for ${country}${subMarket ? ` with relevance to ${subMarket}` : ""}.
`.trim();
}

function inflationPrompt(
  country: string,
  city: string,
  assetType: string,
  subMarket?: string
): string {
  const where = locationLabel(country, city, subMarket);
  return `
You are a monetary policy expert analyzing inflation in ${country}. Generate DETAILED, UNIQUE commentary.

CONTEXT: ${assetType} in ${where}

SPECIFIC REQUIREMENTS:
1. State ACTUAL current inflation rate for ${country} (2024 data from your knowledge)
2. Name ${country}'s central bank and its inflation target
3. Discuss ACTUAL monetary policy stance (current policy rate if known)
4. Identify SPECIFIC drivers of inflation in ${country}
5. Reference ${country}-specific factors (currency peg, exchange rate regime, commodity dependence, subsidies)
6. Discuss impact on ${assetType} in ${where} with SPECIFIC numbers (rental escalation, construction cost inflation)
7. Mention wage growth trends in ${country} with actual percentages

CRITICAL:
- DO NOT use identical sentence structures across countries
- DO mention ${country}'s unique inflation dynamics
- DO NOT include thinking process, analysis steps, or prompt instructions in output
- Minimum 6 detailed bullet points (200+ words total)

Return JSON: { "paragraphs": string[] }

Generate UNIQUE content reflecting ${country}'s actual inflation dynamics for ${where} ${assetType}.
`.trim();
}

function populationPrompt(
  country: string,
  city: string,
  assetType: string,
  subMarket?: string
): string {
  const where = locationLabel(country, city, subMarket);
  return `
You are a demographic analyst specializing in ${country}. Generate COMPREHENSIVE, UNIQUE population analysis.

CONTEXT: ${assetType} in ${where}

SPECIFIC REQUIREMENTS:
1. Provide ACTUAL current population of ${country} (2024 estimate)
2. State actual annual growth rate and key drivers (natural increase, migration)
3. Mention ${country}'s urbanization rate and name SPECIFIC cities driving growth
4. Discuss household formation trends with ACTUAL numbers for ${city}${subMarket ? ` and catchment dynamics for ${subMarket}` : ""}
5. Reference ${country}-specific demographic characteristics and visa/migration programs BY NAME
6. Identify employment growth sectors SPECIFIC to ${city}
7. Connect to ${assetType} demand with specific buyer/tenant profiles${subMarket ? ` relevant to ${subMarket}` : ""}

CRITICAL:
- DO NOT use generic "expatriate inflows" without naming actual visa programs
- DO mention ${country}-specific initiatives (e.g. MM2H, Golden Visa, skilled migration)
- DO NOT include thinking process, analysis steps, or prompt instructions in output
- Minimum 6 detailed bullet points (200+ words total)

Return JSON: { "paragraphs": string[] }

Generate UNIQUE demographic analysis for ${country} relevant to ${where} ${assetType}.
`.trim();
}

function macroSummaryPrompt(
  country: string,
  city: string,
  assetType: string,
  ctx: MacroCommentaryContext
): string {
  const irr = ctx.projectIRR ?? "TBD";
  const months = ctx.constructionMonths ?? "TBD";
  const em = ctx.equityMultiple ?? "TBD";
  const where = locationLabel(country, city, ctx.subMarket);

  return `
You are a chief investment officer synthesizing macroeconomic data for ${country}. Provide COMPREHENSIVE investment assessment.

CONTEXT: ${assetType} in ${where}
Project IRR: ${irr}%, Equity Multiple: ${em}x, Construction: ${months} months

SPECIFIC REQUIREMENTS:
1. Synthesize GDP, inflation, population data with ACTUAL numbers for ${country}
2. Reference ${country}'s real estate market specifics (transaction volumes, price trends, regulatory environment)${ctx.subMarket ? `, especially ${ctx.subMarket}` : ""}
3. Identify TOP 3 opportunities and TOP 3 risks SPECIFIC to ${where}
4. Mention ${country}-specific catalysts (infrastructure projects, policy changes, events)
5. Provide overall assessment with clear recommendation (FAVOURABLE / NEUTRAL / CAUTIOUS)
6. Connect to project metrics above

CRITICAL:
- DO NOT use identical opportunity/risk categories across countries
- DO mention ${country}-specific factors with names and numbers
- DO NOT include thinking process, analysis steps, or prompt instructions in output
- Minimum 6 detailed bullet points (250+ words total)

Return JSON: { "paragraphs": string[] }

Generate UNIQUE, actionable synthesis for ${where} ${assetType}.
`.trim();
}

export function buildMacroCommentaryPrompt(
  country: string,
  section: MacroSection,
  ctx: MacroCommentaryContext
): string {
  const city = ctx.city ?? "the primary market";
  const assetType = ctx.assetType ?? "real estate";
  const subMarket = ctx.subMarket;

  switch (section) {
    case "GDP":
      return gdpPrompt(country, city, assetType, subMarket);
    case "Inflation":
      return inflationPrompt(country, city, assetType, subMarket);
    case "Population":
      return populationPrompt(country, city, assetType, subMarket);
    case "Macro Summary":
      return macroSummaryPrompt(country, city, assetType, ctx);
    default:
      return `Generate macro commentary for ${section} in ${country}. Return JSON: { "paragraphs": string[] }`;
  }
}

/** Generate country-specific macro commentary via Qwen with validation and retry. */
export async function generateMacroCommentary(
  country: string,
  section: MacroSection,
  ctx: MacroCommentaryContext
): Promise<string[]> {
  const prompt = buildMacroCommentaryPrompt(country, section, ctx);
  const city = ctx.city ?? country;
  const assetType = ctx.assetType ?? "real estate";

  const first = await fetchQwenParagraphs(prompt, {
    minParagraphs: 6,
    maxTokens: 3000,
  });

  if (first && validateContentQuality(first, { country, section })) {
    return first;
  }

  const retryPrompt = buildAntiTemplateRetryPrompt(
    country,
    city,
    section,
    assetType
  );
  const retry = await fetchQwenParagraphs(retryPrompt, {
    minParagraphs: 7,
    maxTokens: 3500,
  });

  if (retry && validateContentQuality(retry, { country, section })) {
    return retry;
  }

  if (retry?.length) return retry;
  if (first?.length) return first;

  return generateMacroCommentaryFallback(country, section, ctx);
}

/** Minimal fallback when AI is unavailable — avoids cross-country template phrases. */
export function generateMacroCommentaryFallback(
  country: string,
  section: MacroSection,
  ctx: MacroCommentaryContext
): string[] {
  const city = ctx.city ?? "the market";
  const asset = ctx.assetType ?? "real estate";

  return [
    `[${section}] Macroeconomic analysis for ${country} — ${asset} in ${city}. AI-generated commentary unavailable; configure FEASIBILITY_AI_URL and FEASIBILITY_AI_API_KEY for country-specific institutional content.`,
    `Project context: unlevered IRR ${ctx.projectIRR ?? "TBD"}%, construction period ${ctx.constructionMonths ?? "TBD"} months, currency ${ctx.currency ?? "local"}.`,
    `Regenerate this feasibility study with AI enabled to populate ${country}-specific GDP, inflation, population, and policy data.`,
  ];
}
