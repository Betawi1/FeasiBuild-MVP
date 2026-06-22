import type { FeasibilityProjectBundle } from "@/types/feasibility";
import { INSTITUTIONAL_COMMENTARY_REQUIREMENTS } from "@/lib/feasibility/commentary-prompt-utils";
import {
  buildMacroCommentaryPrompt,
  generateMacroCommentaryFallback,
  type MacroCommentaryContext,
} from "@/lib/feasibility/generate-macro-commentary";
import { buildOperationalMarketPrompt } from "@/lib/feasibility/generate-operational-market-prompts";
import { fmtBTRMoney, getBTRContext } from "@/lib/feasibility/btr-context";

export type BTRCommentarySection =
  | "Executive Summary"
  | "Project Overview"
  | "Macro - GDP"
  | "Macro - Inflation"
  | "Macro - Population"
  | "Macro - Macro Summary"
  | "Market - Residential Rental Market Overview & Demand Drivers"
  | "Market - Historical & Projected Market Metrics (Rents, Vacancy, Yields)"
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

export function buildBTRCommentaryPrompt(
  section: BTRCommentarySection,
  bundle: FeasibilityProjectBundle
): string {
  const ctx = getBTRContext(bundle);
  const macroSection =
    section === "Macro - GDP"
      ? "GDP"
      : section === "Macro - Inflation"
        ? "Inflation"
        : section === "Macro - Population"
          ? "Population"
          : section === "Macro - Macro Summary"
            ? "Macro Summary"
            : null;

  if (macroSection) {
    const macroCtx: MacroCommentaryContext = {
      city: ctx.city,
      country: ctx.country,
      assetType: "Residential High-Rise BTR (Grade B)",
      projectIRR: ctx.projectIRR,
      constructionMonths: ctx.constructionPeriod,
      currency: ctx.currency,
    };
    return buildMacroCommentaryPrompt(ctx.country, macroSection, macroCtx);
  }

  const marketPrompt = buildOperationalMarketPrompt(
    section,
    "Residential High-Rise BTR (Grade B)",
    ctx.city,
    ctx.country,
    ctx.currency,
    {
      "Residential GLA": `${ctx.residentialGla.toLocaleString()} sqft`,
      "Rent Y1": `${ctx.residentialRentYear1} ${ctx.currency}/sqft`,
      "Stabilized Occupancy": `${ctx.residentialStabilizedOccupancy}%`,
      TDC: fmtBTRMoney(ctx.tdc, ctx.currency, true),
      "Project IRR": `${ctx.projectIRR}%`,
    }
  );
  if (marketPrompt) return marketPrompt;

  return `
You are a senior real estate analyst with 20+ years experience. Generate COMPREHENSIVE, DETAILED, INSTITUTIONAL-GRADE commentary for a Residential BTR (Build-to-Rent) feasibility study.

PROJECT DETAILS:
- Asset Type: Residential High-Rise BTR (Grade B)
- Location: ${ctx.city}, ${ctx.country}
- Currency: ${ctx.currency}
- Residential GLA: ${ctx.residentialGla.toLocaleString()} sqft at ${ctx.residentialRentYear1} ${ctx.currency}/sqft
- Retail GLA (ground floor): ${ctx.retailGla.toLocaleString()} sqft
- Stabilized Occupancy: ${ctx.residentialStabilizedOccupancy}%
- Lease-up Period: ${ctx.residentialLeaseUpMonths} months
- Bad Debt Provision: ${ctx.badDebtPct}%
- TDC: ${fmtBTRMoney(ctx.tdc, ctx.currency, true)}
- Project IRR: ${ctx.projectIRR}%

SECTION: ${section}

${INSTITUTIONAL_COMMENTARY_REQUIREMENTS}

Use BTR terminology (units, lease-up velocity, tenant retention, capex reserve, gross lease, ancillary income, amenity fees, utility recoveries).
`.trim();
}

export function generateBTRCommentaryFallback(
  section: BTRCommentarySection,
  bundle: FeasibilityProjectBundle
): string[] {
  const ctx = getBTRContext(bundle);
  const tdcFmt = fmtBTRMoney(ctx.tdc, ctx.currency, true);

  switch (section) {
    case "Executive Summary":
      return [
        `This feasibility study evaluates a residential high-rise BTR tower in ${ctx.city}, ${ctx.country}, comprising ${ctx.residentialGla.toLocaleString()} sqft of rental residential GLA and ${ctx.retailGla.toLocaleString()} sqft of ground-floor retail over a ${ctx.constructionPeriod}-month delivery program.`,
        `Underwriting assumes residential lease-up from ${ctx.residentialLeaseUpYear1}% to ${ctx.residentialStabilizedOccupancy}% over ${ctx.residentialLeaseUpMonths} months, with a ${ctx.badDebtPct}% bad debt provision on gross residential rent.`,
        `Unlevered project IRR of ${ctx.projectIRR}% and levered equity IRR of ${ctx.equityIRR}% (${ctx.equityMultiple.toFixed(2)}x equity multiple) frame the investment case in ${ctx.currency}.`,
        `Recurring residential rents, amenity fees, and utility recoveries support institutional BTR underwriting alongside a capex reserve for unit turnover and asset preservation.`,
      ];
    case "Project Overview":
      return [
        `The proposed BTR tower targets young professionals and urban households seeking institutional-quality rental product in ${ctx.city}.`,
        `Residential rents at ${ctx.currency} ${ctx.residentialRentYear1}/sqft reflect Grade B positioning with ground-floor retail activation supporting resident amenity and footfall.`,
        `Total development cost of ${tdcFmt} equates to ${fmtBTRMoney(ctx.tdc / Math.max(ctx.residentialGla + ctx.retailGla, 1), ctx.currency)}/sqft on combined GLA.`,
        `Gross lease structure with property management at 4% of EGI and unit-based maintenance and capex reserves aligns with Malaysian BTR operating norms.`,
      ];
    case "Macro - GDP":
      return generateMacroCommentaryFallback(ctx.country, "GDP", {
        city: ctx.city,
        country: ctx.country,
        assetType: "Residential High-Rise BTR (Grade B)",
        projectIRR: ctx.projectIRR,
        constructionMonths: ctx.constructionPeriod,
        currency: ctx.currency,
      });
    case "Macro - Inflation":
      return generateMacroCommentaryFallback(ctx.country, "Inflation", {
        city: ctx.city,
        country: ctx.country,
        assetType: "Residential High-Rise BTR (Grade B)",
        projectIRR: ctx.projectIRR,
        constructionMonths: ctx.constructionPeriod,
        currency: ctx.currency,
      });
    case "Macro - Population":
      return generateMacroCommentaryFallback(ctx.country, "Population", {
        city: ctx.city,
        country: ctx.country,
        assetType: "Residential High-Rise BTR (Grade B)",
        projectIRR: ctx.projectIRR,
        constructionMonths: ctx.constructionPeriod,
        currency: ctx.currency,
      });
    case "Macro - Macro Summary":
      return generateMacroCommentaryFallback(ctx.country, "Macro Summary", {
        city: ctx.city,
        country: ctx.country,
        assetType: "Residential High-Rise BTR (Grade B)",
        projectIRR: ctx.projectIRR,
        constructionMonths: ctx.constructionPeriod,
        currency: ctx.currency,
      });
    case "Market - Residential Rental Market Overview & Demand Drivers":
      return [
        `${ctx.city}'s residential rental market benefits from urban employment growth and limited institutional BTR supply.`,
        `Demand drivers include transit connectivity, co-living preferences, and corporate relocation packages.`,
        `Ground-floor retail and parking ancillary income diversify revenue beyond core residential rent.`,
      ];
    case "Market - Historical & Projected Market Metrics (Rents, Vacancy, Yields)":
      return [
        `Prime BTR rents in ${ctx.city} have shown resilient growth with vacancy compressing in well-located towers.`,
        `Net yields on stabilized BTR assets remain attractive relative to office and retail alternatives in ${ctx.country}.`,
        `Subject rent of ${ctx.currency} ${ctx.residentialRentYear1}/sqft sits within the competitive set for Grade B product.`,
      ];
    case "Market - Current & Projected Supply Pipeline":
      return [
        `Measured pipeline limits oversupply risk in the immediate micro-market over the lease-up window.`,
        `Subject adds ${ctx.residentialGla.toLocaleString()} sqft of institutional BTR stock to a supply-constrained submarket.`,
        `Delivery phasing aligns with projected absorption of new rental households.`,
      ];
    case "Market - Competitive Landscape & Benchmarking":
      return [
        `Competing BTR and multifamily towers in ${ctx.city} support rent and occupancy assumptions.`,
        `Institutional operators benchmark amenity packages, parking ratios, and management fee structures.`,
        `Subject differentiates through unit quality, retail podium, and professional asset management.`,
      ];
    case "Market - Target Tenant & Catchment Profile":
      return [
        `Target tenants include young professionals, expatriates, and small households within a 5 km catchment.`,
        `Amenity fees and utility recoveries align with resident willingness to pay for convenience and services.`,
        `Ground-floor retail serves residents and daytime population from surrounding employment nodes.`,
      ];
    case "Market - Market Summary & Project Implications":
      return [
        `Market fundamentals support lease-up from ${ctx.residentialLeaseUpYear1}% to ${ctx.residentialStabilizedOccupancy}% over ${ctx.residentialLeaseUpMonths} months.`,
        `BTR income stability and ancillary streams underpin ${ctx.projectIRR}% project IRR.`,
        `Institutional sponsorship and capex reserve discipline mitigate operational risk through the hold period.`,
      ];
    case "Market Implications":
      return [
        `Favourable rental demand supports the project's lease-up curve and rent escalation assumptions.`,
        `Limited institutional BTR supply protects pricing power at stabilization.`,
        `Ground-floor retail provides non-residential income diversification.`,
      ];
    case "Success Factors":
      return [
        `Professional property management and resident experience drive retention and minimize vacancy.`,
        `Efficient lease-up marketing and unit turn processes accelerate path to stabilization.`,
        `Ancillary income from parking, amenities, and utilities enhances EGI per unit.`,
      ];
    case "Risk Factors":
      return [
        `Lease-up velocity may lag if competing supply delivers concurrently.`,
        `Bad debt and collection risk require active credit screening and provisioning.`,
        `Rising operating costs must be managed through gross lease escalators and capex reserve funding.`,
      ];
    case "Development Assumptions":
      return [
        `Construction cost depreciated over ${ctx.constructionLife} years; FFE over ${ctx.ffeLife} years per Malaysian BTR accounting norms.`,
        `Construction base of ${fmtBTRMoney(ctx.constructionCost, ctx.currency)} and FFE of ${fmtBTRMoney(ctx.ffeBase, ctx.currency)} anchor D&A schedules.`,
        `Gross lease BTR model excludes CAM recoveries; opex absorbed at asset level.`,
      ];
    case "Development Schedule":
      return [
        `${ctx.constructionPeriod}-month construction program sequences civil works, fit-out, and pre-leasing ahead of practical completion.`,
        `Retail podium fit-out parallels residential tower delivery to optimize opening cash flow.`,
        `Phased unit handover supports staged lease-up over ${ctx.residentialLeaseUpMonths} months.`,
      ];
    case "Operational Revenues":
      return [
        `Year 1 residential rent reflects ${ctx.residentialLeaseUpYear1}% effective occupancy at ${ctx.currency} ${ctx.residentialRentYear1}/sqft.`,
        `Parking, amenity fees, and utility recoveries supplement core rental income across ${ctx.residentialGla.toLocaleString()} sqft residential GLA.`,
        `Retail min-rent from ${ctx.retailGla.toLocaleString()} sqft podium GLA provides diversified income stream.`,
      ];
    case "Operational Expenses":
      return [
        `OpEx includes 4% management fee on EGI, unit-based maintenance (${ctx.currency} 1,500/unit), and fixed utilities.`,
        `Property tax, insurance, marketing (1% EGI), G&A, and capex reserve (${ctx.currency} 1,000/unit) complete the expense stack.`,
        `Gross lease BTR model — landlord absorbs all operating costs with no CAM recoveries from tenants.`,
      ];
    default:
      return [
        `Residential BTR feasibility analysis for ${ctx.city}, ${ctx.country} in ${ctx.currency}.`,
      ];
  }
}
