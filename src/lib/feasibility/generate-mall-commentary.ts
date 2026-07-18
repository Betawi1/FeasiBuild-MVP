import type { FeasibilityProjectBundle } from "@/types/feasibility";
import { INSTITUTIONAL_COMMENTARY_REQUIREMENTS } from "@/lib/feasibility/commentary-prompt-utils";
import {
  buildMacroCommentaryPrompt,
  generateMacroCommentaryFallback,
  type MacroCommentaryContext,
} from "@/lib/feasibility/generate-macro-commentary";
import { buildOperationalMarketPrompt } from "@/lib/feasibility/generate-operational-market-prompts";
import { fmtMallMoney, getMallContext, type MallContext } from "@/lib/feasibility/mall-context";

export type MallCommentarySection =
  | "Executive Summary"
  | "Project Overview"
  | "Macro - GDP"
  | "Macro - Inflation"
  | "Macro - Population"
  | "Macro - Macro Summary"
  | "Market - Retail Market Overview & Demand Drivers"
  | "Market - Historical & Projected Market Metrics"
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

export function buildMallCommentaryPrompt(
  section: MallCommentarySection,
  bundle: FeasibilityProjectBundle
): string {
  const ctx = getMallContext(bundle);
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
      assetType: `Shopping Mall (${ctx.mallType})`,
      projectIRR: ctx.projectIRR,
      constructionMonths: ctx.constructionPeriod,
      currency: ctx.currency,
    };
    return buildMacroCommentaryPrompt(ctx.country, macroSection, macroCtx);
  }

  const marketPrompt = buildOperationalMarketPrompt(
    section,
    `Shopping Mall (${ctx.mallType})`,
    ctx.city,
    ctx.country,
    ctx.currency,
    {
      GLA: `${ctx.gla.toLocaleString()} sqft`,
      "Base Rent Y1": `${ctx.baseRentYear1} ${ctx.currency}/sqft`,
      "Stabilized Occupancy": `${ctx.stabilizedOccupancy}%`,
      TDC: fmtMallMoney(ctx.tdc, ctx.currency, true),
      "Project IRR": `${ctx.projectIRR}%`,
    },
    { subMarket: bundle.location.subMarket }
  );
  if (marketPrompt) return marketPrompt;

  return `
You are a senior real estate analyst with 20+ years experience. Generate COMPREHENSIVE, DETAILED, INSTITUTIONAL-GRADE commentary for a shopping mall feasibility study.

PROJECT DETAILS:
- Asset Type: Shopping Mall (${ctx.mallType})
- Location: ${ctx.city}, ${ctx.country}
- GLA: ${ctx.gla.toLocaleString()} sqft
- Base Rent Year 1: ${ctx.baseRentYear1} ${ctx.currency}/sqft
- Stabilized Occupancy: ${ctx.stabilizedOccupancy}%
- Lease-up Period: ${ctx.leaseUpPeriod} years
- TDC: ${fmtMallMoney(ctx.tdc, ctx.currency, true)}
- Project IRR: ${ctx.projectIRR}%
- Equity IRR: ${ctx.equityIRR}%

SECTION: ${section}

${INSTITUTIONAL_COMMENTARY_REQUIREMENTS}

Use retail-specific terminology (GLA, base rent, CAM recoveries, WALE, tenant mix, footfall, catchment demographics).
`.trim();
}

function baseRentRevenue(ctx: MallContext): number {
  return ctx.gla * ctx.baseRentYear1 * (ctx.stabilizedOccupancy / 100);
}

export function generateMallCommentaryFallback(
  section: MallCommentarySection,
  bundle: FeasibilityProjectBundle
): string[] {
  const ctx = getMallContext(bundle);
  const tdcFmt = fmtMallMoney(ctx.tdc, ctx.currency, true);
  const baseRev = baseRentRevenue(ctx);

  switch (section) {
    case "Executive Summary":
      return [
        `This feasibility study evaluates a ${ctx.mallType} shopping mall in ${ctx.city}, ${ctx.country}, comprising ${ctx.gla.toLocaleString()} sqft GLA delivered over a ${ctx.constructionPeriod}-month construction program.`,
        `Market review indicates supportive retail fundamentals with stabilized occupancy underwritten at ${ctx.stabilizedOccupancy}% and Year 1 base rent of ${ctx.currency} ${ctx.baseRentYear1}/sqft.`,
        `Unlevered project IRR of ${ctx.projectIRR}% and levered equity IRR of ${ctx.equityIRR}% (${ctx.equityMultiple.toFixed(2)}x equity multiple, ${ctx.paybackPeriod}-year payback) frame the investment case.`,
        `The study recommends alignment of equity pacing with the development S-curve and monitoring of leased occupancy and sales productivity against the competitive set through stabilization.`,
      ];
    case "Macro - GDP":
      return generateMacroCommentaryFallback(ctx.country, "GDP", {
        city: ctx.city,
        country: ctx.country,
        assetType: `Shopping Mall (${ctx.mallType})`,
        projectIRR: ctx.projectIRR,
        constructionMonths: ctx.constructionPeriod,
        currency: ctx.currency,
      });
    case "Macro - Inflation":
      return generateMacroCommentaryFallback(ctx.country, "Inflation", {
        city: ctx.city,
        country: ctx.country,
        assetType: `Shopping Mall (${ctx.mallType})`,
        projectIRR: ctx.projectIRR,
        constructionMonths: ctx.constructionPeriod,
        currency: ctx.currency,
      });
    case "Macro - Population":
      return generateMacroCommentaryFallback(ctx.country, "Population", {
        city: ctx.city,
        country: ctx.country,
        assetType: `Shopping Mall (${ctx.mallType})`,
        projectIRR: ctx.projectIRR,
        constructionMonths: ctx.constructionPeriod,
        currency: ctx.currency,
      });
    case "Macro - Macro Summary":
      return generateMacroCommentaryFallback(ctx.country, "Macro Summary", {
        city: ctx.city,
        country: ctx.country,
        assetType: `Shopping Mall (${ctx.mallType})`,
        projectIRR: ctx.projectIRR,
        constructionMonths: ctx.constructionPeriod,
        currency: ctx.currency,
      });
    case "Project Overview":
      return [
        `The proposed ${ctx.mallType} mall is strategically located in ${ctx.city}, targeting a catchment of affluent households and regional visitors with strong discretionary spending power.`,
        `The ${ctx.gla.toLocaleString()} sqft GLA development is positioned as ${ctx.positioning} retail, with a diversified tenant mix spanning fashion, F&B, entertainment, and convenience anchors.`,
        `Total development cost of ${tdcFmt} equates to ${fmtMallMoney(ctx.tdc / Math.max(ctx.gla, 1), ctx.currency)}/sqft GLA, consistent with regional mall delivery benchmarks in ${ctx.country}.`,
        `Lease-up is modeled from ${ctx.leaseUpYear1}% Year 1 occupancy to ${ctx.stabilizedOccupancy}% stabilized occupancy over ${ctx.leaseUpPeriod} years, supporting base rent revenue of ${fmtMallMoney(baseRev, ctx.currency, true)} at stabilization.`,
      ];
    case "Market - Retail Market Overview & Demand Drivers":
      return [
        `${ctx.city}'s retail market benefits from population growth, tourism inflows, and expanding suburban communities within a 15–20 km primary catchment.`,
        `Demand drivers include rising household income, experiential retail preferences, and limited quality ${ctx.positioning} mall supply in the immediate trade area.`,
        `The subject site captures freeway visibility and public transport connectivity, supporting sustained footfall and tenant sales productivity.`,
        `E-commerce penetration remains a structural theme; the project's F&B, entertainment, and service-led tenant mix mitigates pure discretionary apparel exposure.`,
      ];
    case "Market - Historical & Projected Market Metrics":
      return [
        `Market footfall and tenant sales per sqft in ${ctx.city} have recovered post-2020, with regional malls reporting mid-single-digit annual sales growth.`,
        `Occupancy across the competitive set has stabilized above 90% for quality malls, with base rents trending upward on renewal cycles.`,
        `Forward projections assume continued sales PSF expansion of 3–4% annually, supporting percentage rent upside for the subject asset.`,
        `The subject's underwritten base rent of ${ctx.currency} ${ctx.baseRentYear1}/sqft sits within the competitive range for ${ctx.positioning} product.`,
      ];
    case "Market - Current & Projected Supply Pipeline":
      return [
        `Existing retail stock in ${ctx.city} is concentrated in established super-regional and community malls, with measured pipeline delivery over the next 24–36 months.`,
        `Net absorption has remained positive for well-located ${ctx.positioning} assets, though landlords compete on tenant incentives and fit-out contributions.`,
        `The subject's ${ctx.gla.toLocaleString()} sqft GLA represents incremental supply that must achieve ${ctx.stabilizedOccupancy}% leased occupancy to align with market absorption.`,
        `Pre-leasing and anchor commitments will be critical to defend market share against competing openings in adjacent districts.`,
      ];
    case "Market - Competitive Landscape & Benchmarking":
      return [
        `Primary competition comprises established regional malls within a 10–15 km radius, competing on tenant mix, parking provision, and experiential offerings.`,
        `Benchmark assets operate at occupancy levels consistent with the subject's stabilized underwriting, with base rents reflecting ${ctx.positioning} positioning.`,
        `Differentiation rests on modern GLA efficiency, parking ratio, and curated F&B and entertainment programming aligned with catchment demographics.`,
        `The competitive set supports achievable rent and occupancy assumptions embedded in Component 2 of the financial model.`,
      ];
    case "Market - Target Tenant & Catchment Profile":
      return [
        `The target tenant profile emphasizes international fashion, family dining, entertainment, and convenience anchors to drive cross-shopping frequency.`,
        `Catchment demographics skew toward mid-to-high income households with strong appetite for branded retail and dining experiences.`,
        `A weighted average lease expiry (WALE) target above five years supports income visibility and lender covenant comfort.`,
        `Percentage rent structures at ${ctx.percentageRentRate}% over a natural breakpoint capture upside from tenant sales outperformance.`,
      ];
    case "Market - Market Summary & Project Implications":
      return [
        `Market fundamentals in ${ctx.city} support a ${ctx.positioning} mall at the proposed location with achievable lease-up and rent growth assumptions.`,
        `Supply pipeline risk is manageable provided pre-leasing milestones are met ahead of practical completion.`,
        `Competitive benchmarking confirms occupancy and base rent targets within institutional underwriting norms.`,
        `Success depends on leasing velocity, tenant mix curation, and disciplined CAM and opex management through stabilization.`,
      ];
    case "Market Implications":
      return [
        `Strong catchment income growth supports the project's lease-up curve and tenant sales assumptions.`,
        `Competitive supply requires proactive leasing and differentiated experiential retail programming.`,
        `Macro stability in ${ctx.country} underpins investor confidence in long-duration retail income streams.`,
      ];
    case "Success Factors":
      return [
        `Prime location with high visibility and accessibility supports footfall generation and anchor tenant interest.`,
        `Efficient GLA layout and parking provision improve tenant sales productivity and rent sustainability.`,
        `Experienced asset management and marketing programs drive occupancy and CAM recovery performance.`,
      ];
    case "Risk Factors":
      return [
        `Economic slowdown could compress tenant sales and lengthen lease-up timelines.`,
        `Competing mall openings may pressure rents and increase tenant incentive packages.`,
        `Rising construction and fit-out costs require disciplined procurement and contingency management.`,
      ];
    case "Development Assumptions":
      return [
        `Total development cost of ${tdcFmt} comprises land, hard costs, tenant improvements, leasing commissions, soft costs, and pre-opening capital.`,
        `Construction cost intensity of ${fmtMallMoney(ctx.constructionCost, ctx.currency, true)} reflects ${ctx.gla.toLocaleString()} sqft GLA delivery over ${ctx.constructionPeriod} months.`,
        `TI allowance of ${fmtMallMoney(ctx.tiAllowance, ctx.currency, true)} and leasing commissions of ${fmtMallMoney(ctx.leasingCommissions, ctx.currency, true)} are embedded to support tenant fit-out and leasing velocity.`,
        `Stabilized base rent revenue of ${fmtMallMoney(baseRev, ctx.currency, true)} underpins the ${ctx.projectIRR}% unlevered project IRR in the model.`,
      ];
    case "Development Schedule":
      return [
        `The development schedule allocates ${tdcFmt} across land acquisition, construction, soft costs, TI, leasing commissions, and pre-opening over the ${ctx.constructionPeriod}-month program.`,
        `Construction draws follow an S-curve consistent with regional mall delivery, with peak funding in structural and fit-out phases.`,
        `Equity and debt pacing align with milestone completion to minimize IDC and optimize lender covenant compliance.`,
      ];
    case "Operational Revenues":
      return [
        `Revenue comprises base rent, percentage rent, CAM recoveries, parking income, and ancillary income streams modeled from Component 2.`,
        `Year 1 stabilized base rent at ${ctx.currency} ${ctx.baseRentYear1}/sqft on ${ctx.stabilizedOccupancy}% leased GLA drives the income stack.`,
        `Parking revenue from ${ctx.parkingSpaces.toLocaleString()} spaces at ${ctx.parkingUtilization}% utilization supplements core rental income.`,
        `Other income including advertising, kiosks, and events provides incremental yield enhancement at ${fmtMallMoney(ctx.otherIncome, ctx.currency, true)} in Year 1.`,
      ];
    case "Operational Expenses":
      return [
        `Operating expenses include CAM (fixed and variable), property tax, insurance, marketing, G&A, and management fees per Component 2 assumptions.`,
        `CAM recoveries at ${ctx.recoveryRate}% recovery rate offset the majority of controllable operating costs passed through to tenants.`,
        `Marketing spend at ${ctx.marketingPercentage}% of revenue supports tenant sales growth and footfall generation.`,
        `Management fee at ${ctx.managementFeePercentage}% of revenue reflects institutional third-party asset management for a mall of this scale.`,
      ];
    default:
      return [
        `Analysis for ${section} reflects live model inputs for the ${ctx.gla.toLocaleString()} sqft ${ctx.mallType} mall in ${ctx.city}.`,
        `Stabilized occupancy of ${ctx.stabilizedOccupancy}% and base rent of ${ctx.currency} ${ctx.baseRentYear1}/sqft anchor the underwriting.`,
      ];
  }
}
