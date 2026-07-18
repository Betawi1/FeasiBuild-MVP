/** Build detailed Qwen prompt for operational asset market sections (mall, office, BTR). */
export function buildOperationalMarketPrompt(
  section: string,
  assetLabel: string,
  city: string,
  country: string,
  currency: string,
  metrics: Record<string, string | number>,
  options?: { subMarket?: string }
): string | null {
  const isMarket =
    section.startsWith("Market -") ||
    section === "Market Implications" ||
    section === "Success Factors" ||
    section === "Risk Factors";

  if (!isMarket) return null;

  const subMarket = options?.subMarket?.trim() || city;
  const metricsBlock = Object.entries(metrics)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const tableFormat =
    section === "Success Factors"
      ? `
OUTPUT FORMAT — one bullet per line:
Opportunity/Strength Title: detailed effect with quantified metrics for ${subMarket}.
DO NOT use generic labels like "Market opportunity" or "Project strength".
`
      : section === "Risk Factors"
        ? `
OUTPUT FORMAT — one bullet per line:
Specific Threat/Weakness Title: detailed effect with data. Mitigation: concrete action.
DO NOT use generic labels like "Market threat", "External risk", or "Project weakness".
`
        : "";

  return `
You are a senior real estate analyst. Generate COMPREHENSIVE, UNIQUE ${section} commentary for a ${assetLabel} feasibility study.

LOCATION: ${city}, ${country}
SUB-MARKET: ${subMarket}
CURRENCY: ${currency}

PROJECT METRICS:
${metricsBlock}

REQUIREMENTS:
1. ALWAYS reference the specific sub-market (${subMarket}) when discussing location, competition, or market dynamics
2. Reference ACTUAL market data for ${country}, ${city}, and ${subMarket} (transaction volumes, rents, vacancy, yields)
3. Name SPECIFIC comparable assets, malls, buildings, or developments in or near ${subMarket}
4. Discuss ${country}-specific regulations, policies, and market institutions BY NAME
5. Provide quantified metrics — no generic ranges copied across countries
6. DO NOT include thinking process, analysis steps, or prompt instructions in output
7. Minimum 6 detailed bullet points (250+ words total)
${tableFormat}
Return JSON: { "paragraphs": string[] }

DO NOT use templated language. Content must be UNIQUE to ${subMarket}, ${city}, ${country}.
`.trim();
}
