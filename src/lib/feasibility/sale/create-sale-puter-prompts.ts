import type { SaleFeasibilityBundle } from "@/types/feasibility";
import { fmtSaleMoney } from "@/lib/feasibility/sale/sale-context";
import type { SaleStreamConfig } from "@/lib/feasibility/sale/sale-stream-config";
import type { SaleCommentarySection } from "@/lib/feasibility/sale/generate-sale-commentary";

const ANTI_PLACEHOLDER_RULES = `
CRITICAL INSTRUCTIONS:
1. DO NOT use generic phrases like "Charts and visualizations are included"
2. DO NOT use placeholder text or mention API keys
3. MUST include SPECIFIC data points, percentages, and market metrics
4. MUST reference actual comparable projects or developments in the target city
5. MUST discuss country-specific market dynamics with numbers
6. Generate 5 detailed bullet points with unique, location-specific content
`.trim();

/** Build Puter.ai prompt for a sale feasibility commentary section. */
export function createPromptForSection(
  section: SaleCommentarySection | string,
  bundle: SaleFeasibilityBundle,
  config: SaleStreamConfig
): string {
  const m = bundle.saleMetrics;
  const { city, country } = bundle.location;
  const baseContext = `
You are a senior real estate analyst creating a feasibility study for:
- Asset Type: ${config.assetLabel}
- Location: ${city}, ${country}
- Currency: ${bundle.currency}
- Total BUA: ${m.totalArea.toLocaleString()} sqft
- Saleable BUA: ${m.saleableArea.toLocaleString()} sqft
- Average Price: ${m.avgPricePsf} ${bundle.currency}/sqft
- Construction Period: ${m.constructionMonths} months
- TDC: ${fmtSaleMoney(bundle.component4.tdc, bundle.currency, true)}
- GDV: ${fmtSaleMoney(bundle.component4.gdv, bundle.currency, true)}
- Project IRR: ${bundle.component4.projectIRR}%
- Equity Multiple: ${bundle.component4.equityMultiple.toFixed(2)}x
`.trim();

  const sectionPrompts: Record<string, string> = {
    "Macro - GDP": `
${baseContext}

Generate EXACTLY 5 concise bullet points (20-30 words each) about ${bundle.location.country}'s GDP and economic performance.

Include:
- Current GDP value in USD billions
- 5-year CAGR and growth trends
- Key economic sectors driving growth (name specific industries)
- Government policies and infrastructure investments
- Impact on real estate demand for ${config.assetLabel} in ${bundle.location.city}
- Specific statistics unique to ${bundle.location.country}

Be specific and data-driven. NO generic statements.
`.trim(),

    "Macro - Inflation": `
${baseContext}

Generate EXACTLY 5 concise bullet points (20-30 words each) about inflation in ${bundle.location.country}.

Include:
- Current inflation rate and central bank target (name the central bank)
- Monetary policy stance and policy rate
- Impact on construction costs and operating expenses
- Wage growth trends with percentages
- Effect on ${config.assetLabel} pricing and affordability in ${bundle.location.city}

Use specific percentages and real data for ${bundle.location.country}.
`.trim(),

    "Macro - Population": `
${baseContext}

Generate EXACTLY 5 concise bullet points (20-30 words each) about demographics in ${bundle.location.country}.

Include:
- Current population and growth rate
- Urbanization percentage
- Key cities driving growth
- Household formation trends for ${bundle.location.city}
- Employment growth in relevant sectors
- Migration patterns and visa programs BY NAME

Connect to demand for ${config.assetLabel} in ${bundle.location.city}.
`.trim(),

    "Macro - Macro Summary": `
${baseContext}

Provide a comprehensive synthesis of macroeconomic indicators for ${bundle.location.country}.

Include:
- Summary of GDP, inflation, and population trends with actual numbers
- Real estate market transaction volumes for ${bundle.location.country}
- TOP 3 opportunities for ${config.assetLabel} development
- TOP 3 risks to monitor
- Overall investment assessment (FAVOURABLE / NEUTRAL / CAUTIOUS)
- Connection to project IRR of ${bundle.component4.projectIRR}%

Be specific to ${bundle.location.country} — no generic advice.
`.trim(),

    "Market - overview": `
${baseContext}

Generate DETAILED market overview for ${config.assetLabel} in ${city}, ${country}.

${ANTI_PLACEHOLDER_RULES}

SPECIFIC REQUIREMENTS:
- Transaction volumes and values with numbers in ${bundle.currency}
- Name 3-4 actual comparable projects in ${city}
- Buyer/investor profiles and regulatory environment in ${country}
- Infrastructure projects affecting the market
- Current pricing benchmarks and market sentiment indicators
- Subject scale: ${m.saleableArea.toLocaleString()} sqft saleable at ${m.avgPricePsf} ${bundle.currency}/sqft

Example structure:
"• ${city}'s ${config.assetLabel} market recorded [SPECIFIC METRIC] in 2024..."
"• Notable comparable properties include [ACTUAL PROJECT NAMES]..."
`.trim(),

    "Market - supplyDemand": `
${baseContext}

Analyze supply-demand for ${config.assetLabel} in ${city}, ${country}.

${ANTI_PLACEHOLDER_RULES}

SPECIFIC REQUIREMENTS:
- Pipeline supply with unit/sqft counts and delivery timelines
- Historical absorption rates with percentages
- Demand drivers (employment, migration, household formation)
- Competitive supply coming online in ${city}
- Subject saleable area of ${m.saleableArea.toLocaleString()} sqft in market context
`.trim(),

    "Market - pricing": `
${baseContext}

Analyze pricing benchmarks for ${config.assetLabel} in ${city}, ${country}.

${ANTI_PLACEHOLDER_RULES}

SPECIFIC REQUIREMENTS:
- Current average PSF (subject: ${m.avgPricePsf} ${bundle.currency})
- Price ranges across submarkets in ${city}
- Historical price appreciation with percentages
- Competitive project pricing from named developments
- Premium/discount factors and gross-to-net deductions in ${country}
`.trim(),

    "Market - velocity": `
${baseContext}

Analyze sales velocity and absorption in ${city}, ${country}.

${ANTI_PLACEHOLDER_RULES}

SPECIFIC REQUIREMENTS:
- Average absorption rates for comparable projects (%)
- Months-to-sellout benchmarks and pre-sales performance
- Cash vs mortgage buyer mix in ${country}
- Sales velocity by unit type and launch timing
`.trim(),

    "Market - competition": `
${baseContext}

Analyze the competitive landscape in ${city}, ${country}.

${ANTI_PLACEHOLDER_RULES}

SPECIFIC REQUIREMENTS:
- Name 4-5 direct competing projects with PSF and velocity data
- Competitive advantages/disadvantages vs subject at ${m.avgPricePsf} ${bundle.currency}/sqft
- Developer track records and marketing norms in ${country}
- Market share capture strategy for this project
`.trim(),

    "Market Summary": `
${baseContext}

Synthesize market findings for ${config.assetLabel} in ${city}, ${country}.

${ANTI_PLACEHOLDER_RULES}

SPECIFIC REQUIREMENTS:
- Key market findings with quantified data
- GDV validation against market comparables (${fmtSaleMoney(bundle.component4.gdv, bundle.currency, true)})
- Supply-demand balance assessment
- Regulatory/escrow environment in ${country}
- Investment recommendation for institutional committee
`.trim(),

    "Market Implications": `
${baseContext}

Analyze how market conditions affect this ${config.assetLabel} project in ${city}, ${country}.

${ANTI_PLACEHOLDER_RULES}

SPECIFIC REQUIREMENTS:
- How market supports/challenges GDV of ${fmtSaleMoney(bundle.component4.gdv, bundle.currency, true)}
- Competitive pricing vs margin (TDC ${fmtSaleMoney(bundle.component4.tdc, bundle.currency, true)})
- Escrow/collection timing in ${country}
- Pre-sales momentum requirements and actionable recommendations
`.trim(),

    "Success Factors": `
${baseContext}

Identify success factors for ${config.assetLabel} in ${city}, ${country}.

${ANTI_PLACEHOLDER_RULES}

SPECIFIC REQUIREMENTS:
- Location-specific advantages in ${city}
- Pricing positioning at ${bundle.currency} ${m.avgPricePsf}/sqft
- Pre-sales and launch strategy
- Product differentiation and ${country}-specific regulatory advantages
`.trim(),

    "Risk Factors": `
${baseContext}

Identify risk factors for ${config.assetLabel} in ${city}, ${country}.

${ANTI_PLACEHOLDER_RULES}

SPECIFIC REQUIREMENTS:
- Market saturation and pipeline risks in ${city}
- Interest rate / affordability sensitivity in ${country}
- Construction cost escalation and regulatory change risks
- Sales velocity downside scenarios with mitigations
`.trim(),

    "Sales Assumptions": `
${baseContext}

Analyze sales assumptions for ${config.assetLabel} in ${city}, ${country}.

${ANTI_PLACEHOLDER_RULES}

SPECIFIC REQUIREMENTS:
- Average selling price of ${m.avgPricePsf} ${bundle.currency}/sqft on ${m.saleableArea.toLocaleString()} sqft
- Buyer mix and payment plan assumptions
- Gross-to-net deductions typical in ${country}
- Phased launch and absorption profile
`.trim(),
  };

  return (
    sectionPrompts[section] ??
    `${baseContext}\n\n${ANTI_PLACEHOLDER_RULES}\n\nGenerate EXACTLY 5 bullet points for ${section} for a ${config.assetLabel} in ${city}, ${country}.`
  );
}

const MACRO_CHART_PROMPTS: Record<string, (country: string) => string> = {
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

export function createMacroChartPrompt(
  macroType: string,
  country: string
): string | null {
  const builder = MACRO_CHART_PROMPTS[macroType];
  return builder ? builder(country) : null;
}
