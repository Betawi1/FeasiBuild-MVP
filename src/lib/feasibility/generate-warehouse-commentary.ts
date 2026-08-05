import type { FeasibilityProjectBundle } from "@/types/feasibility";
import { INSTITUTIONAL_COMMENTARY_REQUIREMENTS } from "@/lib/feasibility/commentary-prompt-utils";
import {
  buildMacroCommentaryPrompt,
  generateMacroCommentaryFallback,
  type MacroCommentaryContext,
} from "@/lib/feasibility/generate-macro-commentary";
import { buildOperationalMarketPrompt } from "@/lib/feasibility/generate-operational-market-prompts";
import {
  fmtWarehouseMoney,
  getWarehouseContext,
} from "@/lib/feasibility/warehouse-context";

export type WarehouseCommentarySection =
  | "Executive Summary"
  | "Project Overview"
  | "Macro - GDP"
  | "Macro - Inflation"
  | "Macro - Population"
  | "Macro - Macro Summary"
  | "Market - Warehouse & Industrial Market Overview & Demand Drivers"
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

function warehouseAssetLabel(ctx: ReturnType<typeof getWarehouseContext>): string {
  const base = `${ctx.qualityGrade} ${ctx.warehouseSubType} Warehouse`;
  return ctx.numberOfUnits > 1
    ? `${base} (Industrial Park · ${ctx.numberOfUnits} units)`
    : base;
}

export function buildWarehouseCommentaryPrompt(
  section: WarehouseCommentarySection,
  bundle: FeasibilityProjectBundle
): string {
  const ctx = getWarehouseContext(bundle);
  const assetLabel = warehouseAssetLabel(ctx);

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
      subMarket: ctx.subMarket,
      assetType: assetLabel,
      projectIRR: ctx.projectIRR,
      constructionMonths: ctx.constructionPeriod,
      currency: ctx.currency,
    };
    return buildMacroCommentaryPrompt(ctx.country, macroSection, macroCtx);
  }

  const marketPrompt = buildOperationalMarketPrompt(
    section,
    assetLabel,
    ctx.city,
    ctx.country,
    ctx.currency,
    {
      "Warehouse BUA": `${ctx.warehouseBua.toLocaleString()} sqft`,
      "Base Rent Y1": `${ctx.baseRentYear1} ${ctx.currency}/sqft`,
      "Land Area": `${ctx.landArea.toLocaleString()} sqft`,
      TDC: fmtWarehouseMoney(ctx.tdc, ctx.currency, true),
      "Project IRR": `${ctx.projectIRR}%`,
    },
    { subMarket: ctx.subMarket }
  );
  if (marketPrompt) return marketPrompt;

  return `
You are a senior real estate analyst with 20+ years experience in industrial and logistics real estate. Generate COMPREHENSIVE, DETAILED, INSTITUTIONAL-GRADE commentary for a Warehouse/Industrial feasibility study.

PROJECT DETAILS:
- Asset Type: ${assetLabel}
- Location: ${ctx.city}, ${ctx.country}${ctx.subMarket ? ` (${ctx.subMarket})` : ""}
- Currency: ${ctx.currency}
- Total Warehouse BUA: ${ctx.warehouseBua.toLocaleString()} sqft
- Total Land Area: ${ctx.landArea.toLocaleString()} sqft
- Year 1 Base Rent: ${ctx.currency} ${ctx.baseRentYear1}/sqft/year
- Yard Rate Y1: ${ctx.currency} ${ctx.yardRateYear1}/sqft/year
- Stabilized Occupancy: ${ctx.stabilizedOccupancy}% over ${ctx.leaseUpYears} years lease-up (opening ${ctx.openingOccupancy}%)
- TDC: ${fmtWarehouseMoney(ctx.tdc, ctx.currency, true)}
- Project IRR: ${ctx.projectIRR}%

SECTION: ${section}

${INSTITUTIONAL_COMMENTARY_REQUIREMENTS}

Use industrial/logistics terminology (e.g., 3PL, e-commerce fulfillment, clear height, dock-to-trailer ratio, cross-docking, last-mile delivery, cold chain, ESG compliance, flight-to-quality in logistics).
`.trim();
}

export function generateWarehouseCommentaryFallback(
  section: WarehouseCommentarySection,
  bundle: FeasibilityProjectBundle
): string[] {
  const ctx = getWarehouseContext(bundle);
  const tdcFmt = fmtWarehouseMoney(ctx.tdc, ctx.currency, true);
  const assetLabel = warehouseAssetLabel(ctx);
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
        `This feasibility study evaluates a ${ctx.qualityGrade.toLowerCase()} ${ctx.warehouseSubType.toLowerCase()} warehouse development in ${ctx.city}, ${ctx.country}, comprising ${ctx.warehouseBua.toLocaleString()} sqft of BUA on ${ctx.landArea.toLocaleString()} sqft of land over a ${ctx.constructionPeriod}-month delivery program.`,
        `Underwriting assumes lease-up from ${ctx.openingOccupancy.toFixed(0)}% to ${ctx.stabilizedOccupancy}% over ${ctx.leaseUpYears} years, supported by strong regional logistics demand.`,
        `Unlevered project IRR of ${ctx.projectIRR}% and levered equity IRR of ${ctx.equityIRR}% (${ctx.equityMultiple.toFixed(2)}x equity multiple) frame the investment case in ${ctx.currency}.`,
      ];
    case "Project Overview":
      return [
        `The proposed ${ctx.warehouseSubType.toLowerCase()} facility is strategically located to serve ${ctx.city}'s growing logistics and supply chain demands.`,
        `At ${ctx.currency} ${ctx.baseRentYear1}/sqft/year, the pricing reflects ${ctx.country} benchmark positioning for ${ctx.qualityGrade} industrial product.`,
        `Total development cost of ${tdcFmt} equates to ${fmtWarehouseMoney(ctx.tdc / Math.max(ctx.warehouseBua, 1), ctx.currency)}/sqft on ${ctx.warehouseBua.toLocaleString()} sqft BUA.`,
      ];
    case "Macro - GDP":
      return generateMacroCommentaryFallback(ctx.country, "GDP", macroCtx);
    case "Macro - Inflation":
      return generateMacroCommentaryFallback(ctx.country, "Inflation", macroCtx);
    case "Macro - Population":
      return generateMacroCommentaryFallback(ctx.country, "Population", macroCtx);
    case "Macro - Macro Summary":
      return generateMacroCommentaryFallback(
        ctx.country,
        "Macro Summary",
        macroCtx
      );
    case "Market - Warehouse & Industrial Market Overview & Demand Drivers":
      return [
        `E-commerce growth and supply chain nearshoring continue to drive structural demand for modern logistics space in ${ctx.city}.`,
        `Occupiers increasingly prioritize ${ctx.qualityGrade.toLowerCase()} specifications, including higher clear heights, ample dock doors, and ESG-compliant features.`,
        `Limited new supply of institutional-grade warehouses supports the rent growth assumptions embedded in the financial model.`,
      ];
    case "Market - Historical & Projected Market Metrics (Rents, Vacancy, Yields)":
      return [
        `Industrial rents in ${ctx.city} have tracked logistics absorption, with vacancy compressing for modern ${ctx.qualityGrade.toLowerCase()} stock.`,
        `Subject underwriting at ${ctx.currency} ${ctx.baseRentYear1}/sqft/year aligns with competitive ${ctx.warehouseSubType.toLowerCase()} benchmarks.`,
        `Cap rate and yield assumptions reflect institutional pricing for stabilized logistics income in ${ctx.country}.`,
      ];
    case "Market - Current & Projected Supply Pipeline":
      return [
        `Measured industrial pipeline delivery over the next 24–36 months remains concentrated in established logistics corridors serving ${ctx.city}.`,
        `The subject's ${ctx.warehouseBua.toLocaleString()} sqft BUA must achieve stabilization per Component 2 lease-up assumptions.`,
        `Supply risk is mitigated by ${ctx.qualityGrade.toLowerCase()} specification differentiation versus older stock.`,
      ];
    case "Market - Competitive Landscape & Benchmarking":
      return [
        `Primary competition comprises modern warehouses and industrial parks within ${ctx.city}'s logistics catchment.`,
        `Benchmark assets achieve occupancy above ${ctx.stabilizedOccupancy}% with clear-height and dock-door specs matching institutional standards.`,
        `Differentiation rests on location, yard depth, parking provision, and ESG credentials.`,
      ];
    case "Market - Target Tenant & Catchment Profile":
      return [
        `Target tenants include 3PLs, e-commerce fulfillment operators, and manufacturers seeking modern logistics space.`,
        `Catchment benefits from highway connectivity and proximity to consumption centers in ${ctx.city}.`,
        `${ctx.warehouseSubType} product suits operators requiring efficient dock-to-trailer ratios and scalable floor plates.`,
      ];
    case "Market - Market Summary & Project Implications":
      return [
        `Market fundamentals support a ${ctx.qualityGrade.toLowerCase()} ${ctx.warehouseSubType.toLowerCase()} facility at the proposed location with achievable lease-up assumptions.`,
        `Pre-leasing and specification delivery are critical path items ahead of practical completion.`,
        `Investment case delivers ${ctx.projectIRR}% project IRR with diversified base rent and ancillary income streams.`,
      ];
    case "Market Implications":
      return [
        `Strong logistics demand supports the project's lease-up curve to ${ctx.stabilizedOccupancy}% stabilized occupancy.`,
        `Ancillary yard and parking income diversifies cash flow beyond base rent.`,
        `Supply pipeline risk is manageable with differentiated ${ctx.qualityGrade.toLowerCase()} industrial positioning.`,
      ];
    case "Success Factors":
      return [
        `Strategic logistics location with highway connectivity supports tenant attraction.`,
        `${ctx.qualityGrade} building specifications (clear height, docks, ESG) drive flight-to-quality demand.`,
        `Institutional asset management preserves occupancy and rent growth through cycles.`,
      ];
    case "Risk Factors":
      return [
        `Logistics market slowdown could extend lease-up and compress rents.`,
        `Construction cost inflation may erode development margin if not contractually managed.`,
        `Tenant concentration in e-commerce or 3PL sectors introduces cyclical absorption risk.`,
      ];
    case "Development Assumptions":
      return [
        `Total development cost of ${tdcFmt} includes land, construction, soft costs, POWC, and FF&E.`,
        `Stabilized base rent of ${ctx.currency} ${ctx.baseRentYear1}/sqft and yard rate of ${ctx.currency} ${ctx.yardRateYear1}/sqft anchor income projections.`,
        `Lease-up from ${ctx.openingOccupancy.toFixed(0)}% to ${ctx.stabilizedOccupancy}% over ${ctx.leaseUpYears} years drives early-year revenue.`,
      ];
    case "Development Schedule":
      return [
        `Development schedule allocates ${tdcFmt} across land, construction, and pre-opening over ${ctx.constructionPeriod} months.`,
        `Building shell and site works are sequenced to enable early tenant fit-out where pre-leased.`,
        `Equity and debt draws follow milestone completion per financing wizard assumptions.`,
      ];
    case "Operational Revenues":
      return [
        `Revenue comprises base rent, yard/hardstand income, parking, and CAM / tax / insurance recoveries.`,
        `Year 1 income reflects ${ctx.openingOccupancy.toFixed(0)}% leased on ${ctx.warehouseBua.toLocaleString()} sqft BUA, ramping to ${ctx.stabilizedOccupancy}% stabilized occupancy.`,
        `Ancillary income from yard space and parking provides meaningful diversification to the base rental stream.`,
      ];
    case "Operational Expenses":
      return [
        `Operating expenses include property tax, insurance, maintenance, landscaping, utilities, security, and management fees.`,
        `CAM recoveries on controllable opex offset landlord exposure, with a recovery rate aligned with local market practice.`,
      ];
    default:
      return [
        `Analysis for ${section} reflects live model inputs for the ${ctx.city} ${ctx.warehouseSubType.toLowerCase()} facility.`,
        `The ${ctx.warehouseBua.toLocaleString()} sqft BUA and ${ctx.landArea.toLocaleString()} sqft land area drive the underwriting.`,
      ];
  }
}
