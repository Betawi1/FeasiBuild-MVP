import type { FeasibilityProjectBundle } from "@/types/feasibility";
import { INSTITUTIONAL_COMMENTARY_REQUIREMENTS } from "@/lib/feasibility/commentary-prompt-utils";
import {
  buildMacroCommentaryPrompt,
  generateMacroCommentaryFallback,
  type MacroCommentaryContext,
} from "@/lib/feasibility/generate-macro-commentary";
import { buildOperationalMarketPrompt } from "@/lib/feasibility/generate-operational-market-prompts";
import { fmtOfficeMoney, getOfficeContext } from "@/lib/feasibility/office-context";

export type OfficeCommentarySection =
  | "Executive Summary"
  | "Project Overview"
  | "Macro - GDP"
  | "Macro - Inflation"
  | "Macro - Population"
  | "Macro - Macro Summary"
  | "Market - Office & Retail Market Overview & Demand Drivers"
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

export function buildOfficeCommentaryPrompt(
  section: OfficeCommentarySection,
  bundle: FeasibilityProjectBundle
): string {
  const ctx = getOfficeContext(bundle);
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
      subMarket: bundle.location.subMarket,
      assetType: "Prime Office + Retail Mixed-Use Tower",
      projectIRR: ctx.projectIRR,
      constructionMonths: ctx.constructionPeriod,
      currency: ctx.currency,
    };
    return buildMacroCommentaryPrompt(ctx.country, macroSection, macroCtx);
  }

  const marketPrompt = buildOperationalMarketPrompt(
    section,
    "Prime Office + Retail Mixed-Use Tower",
    ctx.city,
    ctx.country,
    ctx.currency,
    {
      "Office GLA": `${ctx.officeGla.toLocaleString()} sqft`,
      "Office Rent Y1": `${ctx.officeRentYear1} ${ctx.currency}/sqft`,
      "Retail GLA": `${ctx.retailGla.toLocaleString()} sqft`,
      TDC: fmtOfficeMoney(ctx.tdc, ctx.currency, true),
      "Project IRR": `${ctx.projectIRR}%`,
    },
    { subMarket: bundle.location.subMarket }
  );
  if (marketPrompt) return marketPrompt;

  return `
You are a senior real estate analyst with 20+ years experience. Generate COMPREHENSIVE, DETAILED, INSTITUTIONAL-GRADE commentary for an Office + Retail Mixed-Use feasibility study.

PROJECT DETAILS:
- Asset Type: Prime Office + Retail Mixed-Use Tower
- Location: ${ctx.city}, ${ctx.country}
- Currency: ${ctx.currency}
- Office GLA: ${ctx.officeGla.toLocaleString()} sqft at ${ctx.officeRentYear1} ${ctx.currency}/sqft
- Retail GLA: ${ctx.retailGla.toLocaleString()} sqft at ${ctx.retailRentYear1} ${ctx.currency}/sqft
- Stabilized Occupancy: Office ${ctx.officeStabilizedOccupancy}%, Retail ${ctx.retailStabilizedOccupancy}%
- TDC: ${fmtOfficeMoney(ctx.tdc, ctx.currency, true)}
- Project IRR: ${ctx.projectIRR}%

SECTION: ${section}

${INSTITUTIONAL_COMMENTARY_REQUIREMENTS}

Use mixed-use terminology (NLA, GFA, WALE, tenant retention, flight-to-quality, ground-floor retail activation, blended lease-up).
`.trim();
}

export function generateOfficeCommentaryFallback(
  section: OfficeCommentarySection,
  bundle: FeasibilityProjectBundle
): string[] {
  const ctx = getOfficeContext(bundle);
  const tdcFmt = fmtOfficeMoney(ctx.tdc, ctx.currency, true);
  const totalGla = ctx.officeGla + ctx.retailGla;

  switch (section) {
    case "Executive Summary":
      return [
        `This feasibility study evaluates a prime office and retail mixed-use tower in ${ctx.city}, ${ctx.country}, comprising ${ctx.officeGla.toLocaleString()} sqft office NLA and ${ctx.retailGla.toLocaleString()} sqft retail GLA over a ${ctx.constructionPeriod}-month delivery program.`,
        `Underwriting assumes office lease-up from ${ctx.officeLeaseUpYear1}% to ${ctx.officeStabilizedOccupancy}% over ${ctx.officeLeaseUpPeriod} years, and retail from ${ctx.retailLeaseUpYear1}% to ${ctx.retailStabilizedOccupancy}% over ${ctx.retailLeaseUpPeriod} years.`,
        `Unlevered project IRR of ${ctx.projectIRR}% and levered equity IRR of ${ctx.equityIRR}% (${ctx.equityMultiple.toFixed(2)}x equity multiple) frame the investment case in ${ctx.currency}.`,
        `Ground-floor retail activation supports office tenant amenity value while diversifying income across corporate and retail tenancy.`,
      ];
    case "Project Overview":
      return [
        `The proposed mixed-use tower is strategically located in ${ctx.city}'s prime commercial district, targeting flight-to-quality office occupiers and curated ground-floor retail.`,
        `Office component at ${ctx.currency} ${ctx.officeRentYear1}/sqft and retail podium at ${ctx.currency} ${ctx.retailRentYear1}/sqft reflect ${ctx.country} benchmark positioning for Grade A product.`,
        `Total development cost of ${tdcFmt} equates to ${fmtOfficeMoney(ctx.tdc / Math.max(totalGla, 1), ctx.currency)}/sqft on ${totalGla.toLocaleString()} sqft combined GLA.`,
        `Blended lease-up strategy sequences office pre-leasing ahead of retail fit-out to optimize cash flow through practical completion.`,
      ];
    case "Macro - GDP":
      return generateMacroCommentaryFallback(ctx.country, "GDP", {
        city: ctx.city,
        country: ctx.country,
        assetType: "Prime Office + Retail Mixed-Use Tower",
        projectIRR: ctx.projectIRR,
        constructionMonths: ctx.constructionPeriod,
        currency: ctx.currency,
      });
    case "Macro - Inflation":
      return generateMacroCommentaryFallback(ctx.country, "Inflation", {
        city: ctx.city,
        country: ctx.country,
        assetType: "Prime Office + Retail Mixed-Use Tower",
        projectIRR: ctx.projectIRR,
        constructionMonths: ctx.constructionPeriod,
        currency: ctx.currency,
      });
    case "Macro - Population":
      return generateMacroCommentaryFallback(ctx.country, "Population", {
        city: ctx.city,
        country: ctx.country,
        assetType: "Prime Office + Retail Mixed-Use Tower",
        projectIRR: ctx.projectIRR,
        constructionMonths: ctx.constructionPeriod,
        currency: ctx.currency,
      });
    case "Macro - Macro Summary":
      return generateMacroCommentaryFallback(ctx.country, "Macro Summary", {
        city: ctx.city,
        country: ctx.country,
        assetType: "Prime Office + Retail Mixed-Use Tower",
        projectIRR: ctx.projectIRR,
        constructionMonths: ctx.constructionPeriod,
        currency: ctx.currency,
      });
    case "Market - Office & Retail Market Overview & Demand Drivers":
      return [
        `Urban population and employment growth in ${ctx.city} expand the daytime worker population supporting office and retail footfall.`,
        `Household income growth in the metropolitan catchment supports premium retail tenancy at the podium level.`,
        `Demographic trends favor mixed-use assets combining workplace and convenience retail.`,
        `Corporate flight-to-quality drives demand for Grade A office with ESG credentials, modern amenities, and flexible floor plates in ${ctx.city}'s prime districts.`,
        `Ground-floor retail activation captures pedestrian traffic from office workers, supporting F&B and convenience tenancy at ${ctx.currency} ${ctx.retailRentYear1}/sqft.`,
        `Limited new prime office supply supports rent growth assumptions embedded in the financial model.`,
      ];
    case "Market - Historical & Projected Market Metrics (Rents, Vacancy, Yields)":
      return [
        `Prime office rents in ${ctx.city} have trended upward with vacancy compressing in the CBD submarket.`,
        `Retail podium rents benefit from high-visibility frontage and office-driven captive demand.`,
        `Cap rate assumptions reflect institutional pricing for stabilized mixed-use income in ${ctx.country}.`,
        `Subject underwriting at ${ctx.currency} ${ctx.officeRentYear1}/sqft office and ${ctx.currency} ${ctx.retailRentYear1}/sqft retail aligns with competitive benchmarks.`,
      ];
    case "Market - Current & Projected Supply Pipeline":
      return [
        `Measured office pipeline delivery over the next 24–36 months remains concentrated in established business districts.`,
        `Retail podium supply at this scale is limited within the immediate micro-market, supporting rent sustainability.`,
        `The subject's ${totalGla.toLocaleString()} sqft combined GLA must achieve blended stabilization per Component 2 assumptions.`,
      ];
    case "Market - Competitive Landscape & Benchmarking":
      return [
        `Primary competition comprises Grade A office towers and integrated mixed-use developments within ${ctx.city}.`,
        `Benchmark assets achieve office occupancy above 85% with retail podium activation driving ancillary income.`,
        `Differentiation rests on location, lobby experience, retail curation, and parking provision.`,
      ];
    case "Market - Target Tenant & Catchment Profile":
      return [
        `Target office tenants include multinational corporates, financial services, and technology firms seeking WALE above five years.`,
        `Retail podium targets F&B, convenience, and service retail serving the tower worker population.`,
        `Catchment demographics skew toward professional households with strong discretionary spending.`,
      ];
    case "Market - Market Summary & Project Implications":
      return [
        `Market fundamentals support a prime mixed-use tower at the proposed location with achievable lease-up assumptions.`,
        `Office pre-leasing and retail tenant curation are critical path items ahead of opening.`,
        `Investment case delivers ${ctx.projectIRR}% project IRR with diversified income streams.`,
      ];
    case "Market Implications":
      return [
        `Strong office demand supports the project's lease-up curve to ${ctx.officeStabilizedOccupancy}% stabilized occupancy.`,
        `Retail podium income diversifies cash flow and enhances the office tenant value proposition.`,
        `Supply pipeline risk is manageable with differentiated mixed-use positioning.`,
      ];
    case "Success Factors":
      return [
        `Prime CBD location with transit connectivity supports office tenant attraction.`,
        `Ground-floor retail activation drives footfall and ancillary revenue.`,
        `Institutional asset management preserves occupancy and rent growth through cycles.`,
      ];
    case "Risk Factors":
      return [
        `Office market slowdown could extend lease-up and compress rents.`,
        `Construction cost inflation may erode development margin if not contractually managed.`,
        `Retail tenancy concentration in F&B introduces operational volatility.`,
      ];
    case "Development Assumptions":
      return [
        `Total development cost of ${tdcFmt} includes land, construction, office and retail TI, leasing commissions, and soft costs.`,
        `Depreciation bases reflect construction, FF&E, separate office and retail TI, and leasing commission capitalization.`,
        `Stabilized office rent of ${ctx.currency} ${ctx.officeRentYear1}/sqft and retail min rent of ${ctx.currency} ${ctx.retailRentYear1}/sqft anchor income projections.`,
      ];
    case "Development Schedule":
      return [
        `Development schedule allocates ${tdcFmt} across land, construction, fit-out, and pre-opening over ${ctx.constructionPeriod} months.`,
        `Office fit-out and retail tenant delivery are sequenced post-structure completion.`,
        `Equity and debt draws follow milestone completion per financing wizard assumptions.`,
      ];
    case "Operational Revenues":
      return [
        `Revenue comprises office rent, retail minimum rent, CAM recoveries, parking, and advertising/signage income.`,
        `Year 1 office income reflects ${ctx.officeLeaseUpYear1}% leased on ${ctx.officeGla.toLocaleString()} sqft NLA.`,
        `Retail podium contributes from ${ctx.retailLeaseUpYear1}% initial occupancy ramping to ${ctx.retailStabilizedOccupancy}%.`,
      ];
    case "Operational Expenses":
      return [
        `Operating expenses include CAM, property tax, insurance, marketing, G&A, management fees, and renovation provisions.`,
        `Recoveries on controllable opex offset landlord exposure on pass-through items.`,
        `Management fee and marketing spend support tenant retention and asset positioning.`,
      ];
    default:
      return [
        `Analysis for ${section} reflects live model inputs for the ${ctx.city} mixed-use tower.`,
        `Office ${ctx.officeGla.toLocaleString()} sqft and retail ${ctx.retailGla.toLocaleString()} sqft GLA drive the underwriting.`,
      ];
  }
}
