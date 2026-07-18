import type { SaleFeasibilityBundle } from "@/types/feasibility";
import { fmtSaleMoney } from "@/lib/feasibility/sale/sale-context";
import type { SaleStreamConfig } from "@/lib/feasibility/sale/sale-stream-config";
import type { SaleCommentarySection } from "@/lib/feasibility/sale/generate-sale-commentary";

function projectBlock(bundle: SaleFeasibilityBundle, config: SaleStreamConfig): string {
  const m = bundle.saleMetrics;
  const subMarket = bundle.location.subMarket?.trim() || bundle.location.city;
  return `
PROJECT:
- Asset: ${config.assetLabel}
- Location: ${bundle.location.city}, ${bundle.location.country}
- Sub-Market: ${subMarket}
- Currency: ${bundle.currency}
- Saleable BUA: ${m.saleableArea.toLocaleString()} sqft
- Avg PSF: ${m.avgPricePsf} ${bundle.currency}
- TDC: ${fmtSaleMoney(bundle.component4.tdc, bundle.currency, true)}
- GDV: ${fmtSaleMoney(bundle.component4.gdv, bundle.currency, true)}
- Project IRR: ${bundle.component4.projectIRR}%
- Equity Multiple: ${bundle.component4.equityMultiple.toFixed(2)}x
- Construction: ${m.constructionMonths} months

CRITICAL: ALWAYS reference ${subMarket} when discussing location, competition, or market dynamics. DO NOT include thinking process or prompt instructions in output.
`.trim();
}

const MARKET_SECTION_PROMPTS: Partial<
  Record<SaleCommentarySection, (bundle: SaleFeasibilityBundle, config: SaleStreamConfig) => string>
> = {
  "Market - overview": (bundle, config) => `
Generate COMPREHENSIVE market overview for ${config.assetLabel} in ${bundle.location.city}, ${bundle.location.country}.

${projectBlock(bundle, config)}

REQUIREMENTS:
1. ACTUAL transaction volumes in ${bundle.location.city}'s ${config.assetLabel} market (with numbers in ${bundle.currency})
2. Name 3-4 SPECIFIC comparable projects or developments in ${bundle.location.city}
3. ACTUAL buyer/investor profiles (demographics, institutional players if known)
4. ${bundle.location.country}-specific regulatory frameworks (escrow, foreign ownership, visa links)
5. Infrastructure projects affecting the market (timelines, costs)
6. Pricing context with recent launches or transactions
7. Market sentiment indicators (absorption rates, days on market)

Return JSON: { "paragraphs": string[] } with minimum 6 bullets (250+ words).
DO NOT use generic templated language. Content must be UNIQUE to ${bundle.location.country} and ${bundle.location.city}.
`.trim(),

  "Market - supplyDemand": (bundle, config) => `
Analyze supply-demand for ${config.assetLabel} in ${bundle.location.city}, ${bundle.location.country}.

${projectBlock(bundle, config)}

REQUIREMENTS:
1. Pipeline supply with unit counts and delivery timelines in ${bundle.location.city}
2. Historical absorption rates with actual percentages
3. Net new supply as % of existing stock
4. Demand drivers with quantified metrics (employment, migration, household formation)
5. Subject saleable area (${bundle.saleMetrics.saleableArea.toLocaleString()} sqft) vs market absorption capacity
6. ${bundle.location.country}-specific demand catalysts

Return JSON: { "paragraphs": string[] } minimum 6 bullets. UNIQUE to ${bundle.location.country}.
`.trim(),

  "Market - pricing": (bundle, config) => `
Analyze pricing for ${config.assetLabel} in ${bundle.location.city}, ${bundle.location.country}.

${projectBlock(bundle, config)}

REQUIREMENTS:
1. Comparable PSF benchmarks from 3-5 named projects in ${bundle.location.city}
2. Subject pricing at ${bundle.currency} ${bundle.saleMetrics.avgPricePsf}/sqft vs competitive set
3. Historical PSF growth rates with actual percentages
4. Gross-to-net deductions typical in ${bundle.location.country}
5. Bulk/investor discount norms
6. Price escalation assumptions during construction

Return JSON: { "paragraphs": string[] } minimum 6 bullets. UNIQUE to ${bundle.location.country}.
`.trim(),

  "Market - velocity": (bundle, config) => `
Analyze sales velocity for ${config.assetLabel} in ${bundle.location.city}, ${bundle.location.country}.

${projectBlock(bundle, config)}

REQUIREMENTS:
1. Monthly absorption rates typical in ${bundle.location.city} for ${config.assetLabel}
2. Cash vs mortgage buyer mix with ${bundle.location.country} mortgage approval data
3. Phased launch strategy and pre-sales targets
4. Broker channel contribution percentages
5. Historical sell-through timelines for comparable schemes
6. Launch timing relative to construction milestones

Return JSON: { "paragraphs": string[] } minimum 6 bullets. UNIQUE to ${bundle.location.country}.
`.trim(),

  "Market - competition": (bundle, config) => `
Analyze competition for ${config.assetLabel} in ${bundle.location.city}, ${bundle.location.country}.

${projectBlock(bundle, config)}

REQUIREMENTS:
1. Name 4-6 competing developments in ${bundle.location.city} with PSF and velocity data
2. Product differentiation factors
3. Developer track record comparison
4. Competitive PSF range and subject positioning
5. Marketing spend norms in ${bundle.location.country}
6. Market share capture strategy

Return JSON: { "paragraphs": string[] } minimum 6 bullets. UNIQUE to ${bundle.location.country}.
`.trim(),

  "Market Summary": (bundle, config) => `
Synthesize market findings for ${config.assetLabel} in ${bundle.location.city}, ${bundle.location.country}.

${projectBlock(bundle, config)}

REQUIREMENTS:
1. Key market findings with quantified data
2. GDV validation against market comparables
3. Regulatory/escrow environment summary for ${bundle.location.country}
4. Supply-demand balance assessment
5. IRR achievability under base-case market assumptions
6. Investment recommendation for IC

Return JSON: { "paragraphs": string[] } minimum 6 bullets. UNIQUE to ${bundle.location.country}.
`.trim(),

  "Market Implications": (bundle, config) => `
Analyze market implications for this ${config.assetLabel} project in ${bundle.location.city}, ${bundle.location.country}.

${projectBlock(bundle, config)}

REQUIREMENTS:
1. How market conditions support or challenge GDV of ${fmtSaleMoney(bundle.component4.gdv, bundle.currency, true)}
2. Competitive pricing vs margin preservation (TDC ${fmtSaleMoney(bundle.component4.tdc, bundle.currency, true)})
3. Escrow/collection timing implications in ${bundle.location.country}
4. Interest rate sensitivity for buyers
5. Pre-sales momentum requirements
6. Actionable recommendations for development decision

Return JSON: { "paragraphs": string[] } minimum 6 bullets. UNIQUE to ${bundle.location.country}.
`.trim(),

  "Success Factors": (bundle, config) => `
Identify success factors for ${config.assetLabel} in ${bundle.location.city}, ${bundle.location.country}.

${projectBlock(bundle, config)}

REQUIREMENTS:
1. Location-specific advantages in ${bundle.location.city}
2. Pricing positioning at ${bundle.currency} ${bundle.saleMetrics.avgPricePsf}/sqft
3. Pre-sales and launch strategy
4. Product differentiation
5. ${bundle.location.country}-specific regulatory advantages
6. Quantified impact on absorption and returns

Return JSON: { "paragraphs": string[] } minimum 6 bullets. UNIQUE to ${bundle.location.country}.
`.trim(),

  "Risk Factors": (bundle, config) => `
Identify risk factors for ${config.assetLabel} in ${bundle.location.city}, ${bundle.location.country}.

${projectBlock(bundle, config)}

REQUIREMENTS:
1. Market saturation and pipeline risks in ${bundle.location.city}
2. Interest rate / mortgage affordability sensitivity in ${bundle.location.country}
3. Construction cost escalation risks
4. Regulatory changes specific to ${bundle.location.country}
5. Sales velocity downside scenarios
6. Mitigation strategies with quantified impact

Return JSON: { "paragraphs": string[] } minimum 6 bullets. UNIQUE to ${bundle.location.country}.
`.trim(),
};

export function buildSaleMarketCommentaryPrompt(
  section: SaleCommentarySection,
  bundle: SaleFeasibilityBundle,
  config: SaleStreamConfig
): string | null {
  const builder = MARKET_SECTION_PROMPTS[section];
  return builder ? builder(bundle, config) : null;
}
