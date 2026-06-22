/** Build detailed Qwen prompt for operational asset market sections (mall, office, BTR). */
export function buildOperationalMarketPrompt(
  section: string,
  assetLabel: string,
  city: string,
  country: string,
  currency: string,
  metrics: Record<string, string | number>
): string | null {
  const isMarket =
    section.startsWith("Market -") ||
    section === "Market Implications" ||
    section === "Success Factors" ||
    section === "Risk Factors";

  if (!isMarket) return null;

  const metricsBlock = Object.entries(metrics)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  return `
You are a senior real estate analyst. Generate COMPREHENSIVE, UNIQUE ${section} commentary for a ${assetLabel} feasibility study.

LOCATION: ${city}, ${country}
CURRENCY: ${currency}

PROJECT METRICS:
${metricsBlock}

REQUIREMENTS:
1. Reference ACTUAL market data for ${country} and ${city} (transaction volumes, rents, vacancy, yields)
2. Name SPECIFIC comparable assets, malls, buildings, or developments in ${city}
3. Discuss ${country}-specific regulations, policies, and market institutions BY NAME
4. Include infrastructure, demographic, and employment drivers UNIQUE to ${country}
5. Provide quantified metrics — no generic ranges copied across countries
6. Minimum 6 detailed bullet points (250+ words total)

Return JSON: { "paragraphs": string[] }

DO NOT use templated language. Content must be UNIQUE to ${country} and could not apply to another country.
`.trim();
}
