import type { FeasibilityProjectBundle } from "@/types/feasibility";
import { INSTITUTIONAL_COMMENTARY_REQUIREMENTS } from "@/lib/feasibility/commentary-prompt-utils";
import {
  generateMacroCommentaryFallback,
  type MacroCommentaryContext,
} from "@/lib/feasibility/generate-macro-commentary";
import {
  fmtDataCentreMoney,
  formatDataCentreSegmentLabel,
  formatDataCentreTierLabel,
  getDataCentreContext,
} from "@/lib/feasibility/data-centre-context";

export type DataCentreCommentarySection =
  | "Executive Summary"
  | "Project Overview"
  | "Macro - GDP"
  | "Macro - Inflation"
  | "Macro - Population"
  | "Macro - Macro Summary"
  | "Market - Data Centre Market Overview & Demand Drivers"
  | "Market - Historical & Projected Market Metrics (Power, Pricing, Utilization)"
  | "Market - Current & Projected Supply Pipeline"
  | "Market - Competitive Landscape & Benchmarking"
  | "Market - Target Tenant & Catchment Profile"
  | "Market - Market Summary & Project Implications"
  | "Market Implications"
  | "Success Factors"
  | "Risk Factors"
  | "Development Assumptions"
  | "Development Schedule"
  | "Operational Revenues"
  | "Operational Expenses";

const DC_FORBIDDEN = `
ASSET-TYPE HARD CONSTRAINTS (CRITICAL — VIOLATION = INVALID OUTPUT):
- This is a DATA CENTRE / digital infrastructure feasibility study ONLY.
- DO NOT mention residential units, BTR, apartments, lease-up of homes, or build-to-rent.
- DO NOT mention warehouses, bulk distribution, logistics parks, 3PL, cross-docking, clear height, dock doors, or industrial sheds.
- DO NOT mention retail malls, shopping centres, GLA footfall, or shopper catchment.
- DO NOT mention hotels, ADR, RevPAR, or guest rooms.
- Use ONLY data-centre terminology: IT load (MW/kW), white space, PUE, Tier II/III/IV, colo/hyperscale/edge, power + space leases ($/kW/month), cross-connects, fiber diversity, latency, grid interconnection, cooling, rack density.
`.trim();

function dataCentreAssetLabel(
  ctx: ReturnType<typeof getDataCentreContext>
): string {
  return `${formatDataCentreTierLabel(ctx.tierLevel)} ${formatDataCentreSegmentLabel(ctx.segment)} Data Centre`;
}

function projectBlock(
  ctx: ReturnType<typeof getDataCentreContext>,
  assetLabel: string
): string {
  return `
PROJECT DETAILS (use these numbers):
- Asset Type: ${assetLabel}
- Location: ${ctx.city}, ${ctx.country}${ctx.subMarket ? ` (${ctx.subMarket})` : ""}
- Currency: ${ctx.currency}
- IT Load Capacity: ${ctx.itLoadMw.toFixed(1)} MW (${ctx.itLoadKw.toLocaleString()} kW)
- White Space: ${ctx.whiteSpaceSqft.toLocaleString()} sqft
- Design PUE: ${ctx.pue}
- Tier Level: ${formatDataCentreTierLabel(ctx.tierLevel)}
- Positioning: ${ctx.positioning}
- Segment: ${ctx.segment}
- Power Lease Rate: ${ctx.currency} ${ctx.leaseRatePerKwMonth}/kW/month
- Space Lease Rate: ${ctx.currency} ${ctx.leaseRatePerSqftMonth}/sqft/month
- Stabilized Utilization: ${ctx.occupancyRate}%
- TDC: ${fmtDataCentreMoney(ctx.tdc, ctx.currency, true)}
- Cost per MW: ${fmtDataCentreMoney(ctx.costPerMw, ctx.currency, true)}
- Project IRR: ${ctx.projectIRR}%
- Equity IRR: ${ctx.equityIRR}%
- Equity Multiple: ${ctx.equityMultiple.toFixed(2)}x
- Construction Period: ${ctx.constructionPeriod} months
`.trim();
}

function wrapPrompt(body: string): string {
  return `${body}

${DC_FORBIDDEN}

${INSTITUTIONAL_COMMENTARY_REQUIREMENTS}

Return JSON: { "paragraphs": string[] }
`.trim();
}

/** True when bundle is clearly a data centre project. */
export function assertDataCentreBundle(
  bundle: FeasibilityProjectBundle,
  context: string
): void {
  const bt = (bundle.buildingType ?? "").toLowerCase();
  const at = (bundle.assetType ?? "").toLowerCase();
  const hasDcMetrics = (bundle.dataCentreMetrics?.itLoadMw ?? 0) > 0;
  const isDc =
    bt.includes("data_centre") ||
    bt.includes("datacentre") ||
    bt.includes("data centre") ||
    bt.includes("datacenter") ||
    at.includes("data centre") ||
    at.includes("data_centre") ||
    at.includes("datacentre") ||
    at.includes("datacenter") ||
    hasDcMetrics;

  if (!isDc) {
    console.error(
      `[Data Centre Feasibility] ERROR: ${context} received wrong asset type.`,
      {
        buildingType: bundle.buildingType,
        assetType: bundle.assetType,
        hasDcMetrics,
      }
    );
  } else {
    console.log(`[Data Centre Feasibility] ✓ asset type OK for ${context}`, {
      buildingType: bundle.buildingType,
      assetType: bundle.assetType,
      itLoadMw: bundle.dataCentreMetrics?.itLoadMw,
    });
  }
}

export function buildDataCentreCommentaryPrompt(
  section: DataCentreCommentarySection,
  bundle: FeasibilityProjectBundle
): string {
  assertDataCentreBundle(bundle, `prompt:${section}`);
  const ctx = getDataCentreContext(bundle);
  const assetLabel = dataCentreAssetLabel(ctx);
  const loc = `${ctx.city}, ${ctx.country}`;
  const details = projectBlock(ctx, assetLabel);
  const tier = formatDataCentreTierLabel(ctx.tierLevel);

  const sectionPrompts: Record<DataCentreCommentarySection, string> = {
    "Executive Summary": `
Generate an EXECUTIVE SUMMARY for a Data Centre project in ${loc}.
${details}

Focus on: IT Load Capacity (MW), White Space area, Tier Level (${tier}), PUE (${ctx.pue}),
power capacity leasing rates (${ctx.currency}/kW/month), space leases, cost per MW, and digital economy drivers.
Write 3–4 concise institutional paragraphs.
DO NOT mention residential units, warehouses, retail, or hotels.`,

    "Project Overview": `
Analyze this Data Centre project in ${loc}.
${details}

Key metrics to highlight: ${ctx.itLoadMw.toFixed(1)} MW IT capacity,
${ctx.whiteSpaceSqft.toLocaleString()} sqft white space, ${tier},
PUE of ${ctx.pue}.
Discuss proximity to fiber nodes, power substations, and connectivity infrastructure.
DO NOT mention residential units, warehouses, or retail space.`,

    "Macro - GDP": `
Write macroeconomic GDP analysis for ${loc} for a DATA CENTRE feasibility study.
${details}

Focus on:
- Digital economy growth and cloud / AI adoption rates
- Technology sector expansion and data generation trends
- Government digital initiatives (e.g. MyDIGITAL, Smart Nation, national broadband, AI strategies)
- How GDP / tech FDI supports data centre IT load demand
DO NOT focus on general logistics, warehousing, or residential demand.`,

    "Macro - Inflation": `
Write inflation / cost analysis for ${loc} relevant to DATA CENTRE development and operations.
${details}

Cover: electricity tariff trends, construction/M&E cost inflation, cooling and labor costs,
and implications for ${ctx.currency}/kW/month lease escalation.
DO NOT discuss warehouse rents, residential asking prices, or retail sales inflation as primary themes.`,

    "Macro - Population": `
Write population / labor / digital demand commentary for ${loc} for a DATA CENTRE study.
${details}

Focus on: digital workforce, enterprise density, cloud/AI talent pools, and urbanization driving
data generation — not residential housing absorption.
DO NOT discuss residential unit demand, warehouse labor for 3PL, or retail catchment demographics.`,

    "Macro - Macro Summary": `
Summarize macro implications for a Data Centre in ${loc}.
${details}

Tie GDP, inflation, and digital policy to IT load absorption, power availability, and colo pricing.
DO NOT summarize logistics, warehouse, or residential real estate outlooks.`,

    "Market - Data Centre Market Overview & Demand Drivers": `
Analyze the Data Centre market in ${loc}:
${details}

Cover:
- Digital economy growth, cloud adoption, AI/hyperscale and enterprise colo demand
- Power availability and fiber connectivity infrastructure
- Government digital initiatives supporting DC investment
DO NOT analyze warehouse supply, retail absorption, or residential pricing.`,

    "Market - Historical & Projected Market Metrics (Power, Pricing, Utilization)": `
Analyze Data Centre market metrics in ${loc}:
${details}

Cover:
- Pricing per kW/month for power capacity (and space $/sqft where relevant)
- Utilization / absorption trends
- PUE benchmarks and Tier level offerings
- Electricity pricing and renewable energy availability
DO NOT analyze warehouse rents PSF, retail sales PSF, or residential asking rents.`,

    "Market - Current & Projected Supply Pipeline": `
Analyze the Data Centre supply pipeline in ${loc}:
${details}

Cover: total installed capacity (MW), committed/pipeline MW, absorption rates, and subject share
(${ctx.itLoadMw.toFixed(1)} MW). Name known campuses/operators where possible.
DO NOT discuss warehouse GLA pipeline or residential unit completions.`,

    "Market - Competitive Landscape & Benchmarking": `
Competitive analysis for Data Centres in ${loc}:
${details}

Benchmark vs Equinix, GDS, Telco/hyperscale campuses, and local operators on:
- Pricing per kW/month, PUE, Tier level, IT load (MW)
- Fiber connectivity and latency to major hubs (Singapore, KL, Hong Kong, Tokyo)
DO NOT benchmark warehouses, industrial parks, malls, or residential towers.`,

    "Market - Target Tenant & Catchment Profile": `
Describe the target tenant profile for a ${assetLabel} in ${loc}.
${details}

Cover: cloud/hyperscale, enterprise colo, content/CDN, fintech, telco — contract structures
(power + space + cross-connects), WALE, and fiber/power catchment.
DO NOT describe 3PL, e-commerce fulfillment, shoppers, or residential tenants.`,

    "Market - Market Summary & Project Implications": `
Summarize Data Centre market findings for ${loc} and implications for the subject ${assetLabel}.
${details}

Emphasize power, fiber, PUE, Tier, and ${ctx.currency}/kW pricing — not logistics or residential.`,

    "Market Implications": `
Implications of Data Centre market findings on the Project in ${loc}.
${details}

Cover grid interconnection, pre-leasing MW blocks, PUE OpEx competitiveness, and utilization ramp.
DO NOT discuss warehouse lease-up or residential absorption.`,

    "Success Factors": `
Key success factors for a Data Centre in ${loc}.
${details}

OUTPUT — one bullet per line:
Factor Title: quantified effect for this DC (power, fiber, Tier, PUE, pre-leasing).
DO NOT use warehouse, residential, or retail success factors.`,

    "Risk Factors": `
Key risk factors for a Data Centre in ${loc}.
${details}

Focus on: power grid constraints, interconnection delays, water scarcity / cooling,
technology obsolescence (rack density / liquid cooling), and construction M&E inflation.
OUTPUT — one bullet per line:
Risk Title: effect. Mitigation: action.
DO NOT list logistics market slowdown, e-commerce tenant concentration, or residential vacancy risks.`,

    "Development Assumptions": `
Explain development cost assumptions for this Data Centre.
${details}

Cover Building & Shell vs M&E electrical/cooling, IT hardware (if operator-provided), fees,
contingency, and cost per MW (~${fmtDataCentreMoney(ctx.costPerMw, ctx.currency, true)}/MW).
DO NOT describe warehouse shell, yard works, or residential FF&E packages as primary cost themes.`,

    "Development Schedule": `
Explain the ${ctx.constructionPeriod}-month Data Centre development schedule in ${loc}.
${details}

Critical path: utility interconnection, M&E commissioning, white-space readiness.
DO NOT describe warehouse shell sequencing or residential tower floor cycles.`,

    "Operational Revenues": `
Generate a BRIEF commentary (max 3 bullet points, ~15 words each) for Data Centre operational assumptions on a presentation slide.
${details}

Focus only on: (1) revenue mix — power / space / ancillary, (2) utilization & PUE efficiency, (3) OpEx cost drivers (power-led).
Keep it concise for a 16:9 slide. DO NOT write long paragraphs.
Return JSON: { "paragraphs": string[] } with at most 3 short strings.`,

    "Operational Expenses": `
Generate a BRIEF commentary (max 3 bullet points, ~15 words each) for Data Centre OpEx on a presentation slide.
${details}

Focus on: power cost (PUE-driven), maintenance/cooling, and management/G&A share of revenue.
Keep it concise. DO NOT write long paragraphs.
Return JSON: { "paragraphs": string[] } with at most 3 short strings.`,
  };

  return wrapPrompt(sectionPrompts[section]);
}

export function generateDataCentreCommentaryFallback(
  section: DataCentreCommentarySection,
  bundle: FeasibilityProjectBundle
): string[] {
  const ctx = getDataCentreContext(bundle);
  const tdcFmt = fmtDataCentreMoney(ctx.tdc, ctx.currency, true);
  const assetLabel = dataCentreAssetLabel(ctx);
  const tier = formatDataCentreTierLabel(ctx.tierLevel);
  const macroCtx: MacroCommentaryContext = {
    city: ctx.city,
    country: ctx.country,
    subMarket: ctx.subMarket,
    assetType: assetLabel,
    projectIRR: ctx.projectIRR,
    constructionMonths: ctx.constructionPeriod,
    currency: ctx.currency,
  };

  switch (section) {
    case "Executive Summary":
      return [
        `This ${ctx.itLoadMw.toFixed(1)} MW ${tier} ${ctx.segment.toLowerCase()} data centre in ${ctx.city}, ${ctx.country} delivers ${fmtDataCentreMoney(ctx.gdv, ctx.currency, true)} GDV against ${tdcFmt} TDC over a ${ctx.constructionPeriod}-month delivery program.`,
        `The facility features ${ctx.whiteSpaceSqft.toLocaleString()} sqft of white space with a design PUE of ${ctx.pue}, positioning it as a ${ctx.positioning.toLowerCase()} ${ctx.segment.toLowerCase()} facility.`,
        `Power leasing at ${ctx.currency} ${ctx.leaseRatePerKwMonth}/kW/month and space leasing at ${ctx.currency} ${ctx.leaseRatePerSqftMonth}/sqft/month support ${ctx.occupancyRate}% stabilized utilization.`,
        `The project delivers ${ctx.projectIRR}% Project IRR and ${ctx.equityMultiple.toFixed(2)}x equity multiple with a ${ctx.paybackPeriod}-year payback (~${fmtDataCentreMoney(ctx.costPerMw, ctx.currency, true)}/MW all-in cost).`,
      ];
    case "Project Overview":
      return [
        `The proposed ${ctx.segment.toLowerCase()} facility is positioned to serve ${ctx.city}'s growing digital infrastructure demand with ${tier} resilience.`,
        `At ${ctx.currency} ${ctx.leaseRatePerKwMonth}/kW/month and design PUE of ${ctx.pue}, pricing and efficiency reflect institutional ${ctx.country} benchmarks.`,
        `Proximity to power interconnection capacity and diverse fiber routes underpins ${ctx.itLoadMw.toFixed(1)} MW IT load delivery on ${ctx.whiteSpaceSqft.toLocaleString()} sqft of white space.`,
        `Total development cost of ${tdcFmt} equates to ${fmtDataCentreMoney(ctx.costPerMw, ctx.currency, true)}/MW.`,
      ];
    case "Macro - GDP":
      return [
        ...generateMacroCommentaryFallback(ctx.country, "GDP", macroCtx),
        `Digital economy and cloud/AI demand in ${ctx.city} support absorption of institutional-grade data centre IT load rather than logistics or residential product.`,
      ];
    case "Macro - Inflation":
      return [
        ...generateMacroCommentaryFallback(ctx.country, "Inflation", macroCtx),
        `Electricity tariff and M&E cost inflation are the primary OpEx/CapEx sensitivities for ${tier} data centre underwriting in ${ctx.country}.`,
      ];
    case "Macro - Population":
      return [
        ...generateMacroCommentaryFallback(ctx.country, "Population", macroCtx),
        `Enterprise density and digital workforce growth in ${ctx.city} drive data generation and colo demand for the subject ${assetLabel}.`,
      ];
    case "Macro - Macro Summary":
      return [
        ...generateMacroCommentaryFallback(
          ctx.country,
          "Macro Summary",
          macroCtx
        ),
        `Macro conditions are evaluated through a data-centre lens: power availability, digital policy, and ${ctx.currency}/kW pricing — not warehouse or residential demand.`,
      ];
    case "Market - Data Centre Market Overview & Demand Drivers":
      return [
        `AI, cloud, and enterprise digitalization continue to drive structural demand for ${ctx.segment.toLowerCase()} IT load capacity in ${ctx.city}.`,
        `Power availability, fiber diversity, and latency to regional hubs remain the primary site-selection filters.`,
        `Limited new ${tier}-certified supply supports the utilization and lease-rate assumptions embedded in the financial model.`,
      ];
    case "Market - Historical & Projected Market Metrics (Power, Pricing, Utilization)":
      return [
        `Data centre lease rates in ${ctx.city} have tracked power-constrained absorption, with utilization compressing vacancy for modern ${tier} stock.`,
        `Subject underwriting at ${ctx.currency} ${ctx.leaseRatePerKwMonth}/kW/month aligns with competitive ${ctx.segment.toLowerCase()} benchmarks.`,
        `Design PUE of ${ctx.pue} is consistent with institutional efficiency expectations for new-build capacity.`,
      ];
    case "Market - Current & Projected Supply Pipeline":
      return [
        `Measured MW pipeline delivery over the next 24–36 months remains concentrated in power-served corridors around ${ctx.city}.`,
        `The subject's ${ctx.itLoadMw.toFixed(1)} MW IT load must achieve stabilization per Component 2 utilization assumptions.`,
        `Supply risk is mitigated by ${tier} certification and fiber/power differentiation versus older facilities.`,
      ];
    case "Market - Competitive Landscape & Benchmarking":
      return [
        `Primary competition comprises colo and wholesale campuses within ${ctx.city}'s digital catchment (including regional platforms such as Equinix / GDS-class operators where present).`,
        `Benchmark assets achieve utilization above ${ctx.occupancyRate}% with PUE and Tier specs matching institutional standards.`,
        `Differentiation rests on power density, latency, fiber diversity, and ESG / renewable credentials.`,
      ];
    case "Market - Target Tenant & Catchment Profile":
      return [
        `Target tenants include cloud providers, enterprise colo customers, content platforms, and fintech operators.`,
        `Catchment benefits from power interconnection capacity and proximity to fiber hubs serving ${ctx.city}.`,
        `${ctx.segment} product suits operators requiring resilient power + space leases with ancillary cross-connects.`,
      ];
    case "Market - Market Summary & Project Implications":
      return [
        `Market fundamentals support a ${tier} ${ctx.segment.toLowerCase()} facility at the proposed location with achievable utilization assumptions.`,
        `Pre-leasing power blocks and grid interconnection are critical path items ahead of practical completion.`,
        `Investment case delivers ${ctx.projectIRR}% project IRR with diversified power, space, and ancillary income streams.`,
      ];
    case "Market Implications":
      return [
        `Strong digital infrastructure demand supports the project's ramp to ${ctx.occupancyRate}% stabilized utilization.`,
        `Ancillary cross-connect and metered-power income diversify cash flow beyond primary power and space leases.`,
        `Supply and grid risk are manageable with differentiated ${tier} positioning and early utility engagement.`,
      ];
    case "Success Factors":
      return [
        `Strategic site attributes (power + fiber) support tenant attraction in ${ctx.city}.`,
        `${tier} certification and design PUE of ${ctx.pue} drive flight-to-quality demand.`,
        `Institutional asset management preserves utilization and lease growth through technology cycles.`,
      ];
    case "Risk Factors":
      return [
        `Power grid constraints or interconnection delays could defer IT load energization and revenue ramp.`,
        `Water scarcity and cooling constraints may raise OpEx if not designed for efficient / hybrid cooling.`,
        `Technology obsolescence (rack density, liquid cooling) introduces CapEx refresh risk over the hold period.`,
      ];
    case "Development Assumptions":
      return [
        `Total development cost of ${tdcFmt} includes building & shell, M&E infrastructure, soft costs, POWC, and land.`,
        `Stabilized lease rate of ${ctx.currency} ${ctx.leaseRatePerKwMonth}/kW/month and space rate of ${ctx.currency} ${ctx.leaseRatePerSqftMonth}/sqft/month anchor income projections.`,
        `Cost intensity of approximately ${fmtDataCentreMoney(ctx.costPerMw, ctx.currency, true)}/MW frames CapEx benchmarking versus regional peers.`,
      ];
    case "Development Schedule":
      return [
        `Development schedule allocates ${tdcFmt} across land, building, and M&E packages over ${ctx.constructionPeriod} months.`,
        `Critical path items include utility interconnection, M&E commissioning, and white-space readiness for early tenants.`,
        `Equity and debt draws follow milestone completion per financing wizard assumptions.`,
      ];
    case "Operational Revenues":
      return [
        `Revenue mix: power lease, space lease, and ancillary (cross-connects / setup).`,
        `${ctx.occupancyRate}% utilization on ${ctx.itLoadMw.toFixed(1)} MW IT load drives Year 1 income.`,
        `Design PUE ${ctx.pue} anchors power OpEx versus IT load.`,
      ];
    case "Operational Expenses":
      return [
        `OpEx is power-led (PUE ${ctx.pue}), plus maintenance, labor, and security.`,
        `Cooling / maintenance and management fees are secondary cost levers.`,
        `G&A and insurance scale with CapEx and revenue bases.`,
      ];
    default:
      return [
        `Analysis for ${section} reflects live model inputs for the ${ctx.city} ${ctx.segment.toLowerCase()} data centre.`,
        `The ${ctx.itLoadMw.toFixed(1)} MW IT load and ${ctx.whiteSpaceSqft.toLocaleString()} sqft white space drive the underwriting.`,
      ];
  }
}
