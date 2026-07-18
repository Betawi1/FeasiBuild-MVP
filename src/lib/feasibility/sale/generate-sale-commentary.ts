import type { SaleFeasibilityBundle } from "@/types/feasibility";
import { INSTITUTIONAL_COMMENTARY_REQUIREMENTS } from "@/lib/feasibility/commentary-prompt-utils";
import {
  buildMacroCommentaryPrompt,
  generateMacroCommentaryFallback,
  type MacroCommentaryContext,
} from "@/lib/feasibility/generate-macro-commentary";
import { buildSaleMarketCommentaryPrompt } from "@/lib/feasibility/generate-sale-market-commentary-prompts";
import { fmtSaleMoney } from "@/lib/feasibility/sale/sale-context";
import {
  getSaleStreamConfig,
  type SaleStreamConfig,
} from "@/lib/feasibility/sale/sale-stream-config";

export type SaleCommentarySection =
  | "Executive Summary"
  | "Project Overview"
  | "Macro - GDP"
  | "Macro - Inflation"
  | "Macro - Population"
  | "Macro - Macro Summary"
  | "Market - overview"
  | "Market - supplyDemand"
  | "Market - pricing"
  | "Market - velocity"
  | "Market - competition"
  | "Market Summary"
  | "Market Implications"
  | "Success Factors"
  | "Risk Factors"
  | "Development Assumptions"
  | "Development Schedule"
  | "Sales Assumptions"
  | "Project Cash Flow"
  | "Revolving Credit Facility"
  | "Escrow Configuration"
  | "Post-Financing Cash Flows"
  | "IRR Metrics"
  | "Scenario Comparison"
  | "Scenario Results";

export function buildSaleCommentaryPrompt(
  section: SaleCommentarySection,
  bundle: SaleFeasibilityBundle,
  config: SaleStreamConfig
): string {
  const m = bundle.saleMetrics;
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
    const ctx: MacroCommentaryContext = {
      city: bundle.location.city,
      country: bundle.location.country,
      subMarket: bundle.location.subMarket,
      assetType: config.assetLabel,
      projectIRR: bundle.component4.projectIRR,
      constructionMonths: m.constructionMonths,
      currency: bundle.currency,
    };
    return buildMacroCommentaryPrompt(bundle.location.country, macroSection, ctx);
  }

  const marketPrompt = buildSaleMarketCommentaryPrompt(section, bundle, config);
  if (marketPrompt) return marketPrompt;

  return `
You are a senior real estate development analyst with 20+ years experience. Generate COMPREHENSIVE, DETAILED, INSTITUTIONAL-GRADE commentary for a ${config.assetLabel} feasibility study (Sale Stream).

PROJECT SPECIFICS:
- Asset Type: ${config.assetLabel}
- Location: ${bundle.location.city}, ${bundle.location.country}
- Currency: ${bundle.currency}
- Total BUA: ${m.totalArea.toLocaleString()} sqft
- Saleable BUA: ${m.saleableArea.toLocaleString()} sqft
- Average Selling Price: ${m.avgPricePsf} ${bundle.currency}/sqft
- Construction Period: ${m.constructionMonths} months
- TDC: ${fmtSaleMoney(bundle.component4.tdc, bundle.currency, true)}
- GDV: ${fmtSaleMoney(bundle.component4.gdv, bundle.currency, true)}
- Unlevered Project IRR: ${bundle.component4.projectIRR}%
- Equity Multiple: ${bundle.component4.equityMultiple.toFixed(2)}x
- Payback: Month ${m.paybackMonth}

SECTION: ${section}

${INSTITUTIONAL_COMMENTARY_REQUIREMENTS}

Use development/sales terminology (GDV, sales velocity, absorption rate, take-up rate, launch momentum, escrow, gross-to-net reconciliation, buyer profile, cash-on-cash returns).

EXAMPLE OF ACCEPTABLE BULLET POINT:
"Transaction volumes in ${bundle.location.city}'s ${config.assetLabel} sector reached significant year-over-year growth driven by visa liberalization and infrastructure investment. This exceeds the 10-year historical average, indicating sustained institutional and high-net-worth investor appetite for well-located assets in primary catchments."
`.trim();
}

export function generateSaleCommentaryFallback(
  section: SaleCommentarySection,
  bundle: SaleFeasibilityBundle
): string[] {
  const config = getSaleStreamConfig(bundle.buildingSubType);
  const m = bundle.saleMetrics;
  const c = bundle.currency;
  const tdcFmt = fmtSaleMoney(bundle.component4.tdc, c, true);
  const gdvFmt = fmtSaleMoney(bundle.component4.gdv, c, true);

  switch (section) {
    case "Executive Summary":
      return [
        `This feasibility study evaluates a ${config.assetLabel.toLowerCase()} in ${bundle.location.city}, ${bundle.location.country}, with ${m.saleableArea.toLocaleString()} sqft saleable BUA over a ${m.constructionMonths}-month construction program.`,
        `Underwriting reflects gross development value of ${gdvFmt} against total development cost of ${tdcFmt}, delivering an unlevered project IRR of ${bundle.component4.projectIRR}% and equity multiple of ${bundle.component4.equityMultiple.toFixed(2)}x.`,
        `Net proceeds after deductions of ${fmtSaleMoney(m.netProceeds, c, true)} support institutional return thresholds with payback at month ${m.paybackMonth}.`,
        `Average selling price of ${c} ${m.avgPricePsf}/sqft positions the project within the competitive freehold/strata band for ${bundle.location.city}.`,
        `Sales velocity and launch timing assumptions align with ${bundle.location.country} market absorption benchmarks for ${config.assetLabel.toLowerCase()} product.`,
        `Escrow-regulated buyer collections under ${m.escrowJurisdiction} rules mitigate counterparty risk while funding construction milestones.`,
      ];
    case "Project Overview":
      return [
        `The proposed ${config.assetLabel.toLowerCase()} is positioned in ${bundle.location.city} targeting end-user and investor buyers at ${c} ${m.avgPricePsf}/sqft average selling price.`,
        `Saleable BUA of ${m.saleableArea.toLocaleString()} sqft on total BUA of ${m.totalArea.toLocaleString()} sqft underpins GDV of ${gdvFmt}.`,
        `Development cost of ${tdcFmt} equates to ${c} ${Math.round(bundle.component4.tdc / Math.max(m.saleableArea, 1)).toLocaleString()} per saleable sqft.`,
        `Construction phasing sequences land acquisition, vertical build, and sales launch to optimize cash-on-cash returns.`,
        `Unlevered project IRR of ${bundle.component4.projectIRR}% reflects the net cash flow profile from Component 3 project IRR analysis.`,
      ];
    case "Macro - GDP":
      return generateMacroCommentaryFallback(bundle.location.country, "GDP", {
        city: bundle.location.city,
        country: bundle.location.country,
        assetType: config.assetLabel,
        projectIRR: bundle.component4.projectIRR,
        constructionMonths: m.constructionMonths,
        currency: c,
      });
    case "Macro - Inflation":
      return generateMacroCommentaryFallback(bundle.location.country, "Inflation", {
        city: bundle.location.city,
        country: bundle.location.country,
        assetType: config.assetLabel,
        projectIRR: bundle.component4.projectIRR,
        constructionMonths: m.constructionMonths,
        currency: c,
      });
    case "Macro - Population":
      return generateMacroCommentaryFallback(bundle.location.country, "Population", {
        city: bundle.location.city,
        country: bundle.location.country,
        assetType: config.assetLabel,
        projectIRR: bundle.component4.projectIRR,
        constructionMonths: m.constructionMonths,
        currency: c,
      });
    case "Macro - Macro Summary":
      return generateMacroCommentaryFallback(
        bundle.location.country,
        "Macro Summary",
        {
          city: bundle.location.city,
          country: bundle.location.country,
          assetType: config.assetLabel,
          projectIRR: bundle.component4.projectIRR,
          constructionMonths: m.constructionMonths,
          currency: c,
        }
      );
    case "Market - overview":
    case "Market - supplyDemand":
    case "Market - pricing":
    case "Market - velocity":
    case "Market - competition":
    case "Market Summary":
    case "Market Implications":
    case "Success Factors":
    case "Risk Factors":
      return [
        `${bundle.location.city}'s ${config.assetLabel.toLowerCase()} market shows active transaction momentum with institutional and end-user demand supporting ${gdvFmt} gross development value.`,
        `Comparable developments in ${bundle.location.city} trade between ${c} ${Math.round(m.avgPricePsf * 0.9).toLocaleString()}–${c} ${Math.round(m.avgPricePsf * 1.1).toLocaleString()}/sqft, positioning the subject at ${c} ${m.avgPricePsf}/sqft.`,
        `Supply pipeline in ${bundle.location.country} remains measured relative to absorption, with ${m.saleableArea.toLocaleString()} sqft saleable area aligned to prevailing take-up rates.`,
        `Regulatory frameworks in ${bundle.location.country} — including escrow collection rules — support phased buyer payments through the ${m.constructionMonths}-month construction program.`,
        `Market fundamentals underpin the ${bundle.component4.projectIRR}% unlevered IRR, subject to launch timing and competitive pricing discipline.`,
      ];
    case "Development Assumptions":
      return [
        `TDC comprises land, construction, soft costs, and POWC per Component 1 assumptions.`,
        `Construction period of ${m.constructionMonths} months sequences vertical build and infrastructure.`,
        `Contingency provisions protect against hard cost escalation.`,
      ];
    case "Development Schedule":
      return [
        `Development cash outflows peak during main construction phase before sales inflows accelerate.`,
        `Monthly outflows convert to yearly profile for feasibility presentation.`,
        `Land acquisition at M0 anchors equity funding requirement.`,
      ];
    case "Sales Assumptions":
      return [
        `Average selling price of ${c} ${m.avgPricePsf}/sqft on ${m.saleableArea.toLocaleString()} sqft saleable area drives gross sales.`,
        `Buyer mix and payment plan assumptions shape monthly cash inflow profile.`,
        `Gross-to-net deductions include commission, VAT, escrow fees, discounts, and defaults.`,
      ];
    case "Project Cash Flow":
      return [
        `Unlevered net cash flow turns positive at month ${m.paybackMonth}, supporting ${bundle.component4.projectIRR}% project IRR.`,
        `Cumulative cash flow profile reflects construction outflow trough followed by sales recovery.`,
        `Peak negative cumulative position defines equity funding requirement.`,
      ];
    case "Revolving Credit Facility":
      return [
        `Approved RCF of ${fmtSaleMoney(bundle.financing.approvedCreditFacility ?? bundle.component4.approvedDebt, c, true)} bridges construction funding gap.`,
        `IDC treatment of ${bundle.financing.idcTreatment} affects capitalized interest at completion.`,
        `Loan at completion of ${fmtSaleMoney(bundle.component4.loanAtCompletion, c, true)} at ${bundle.component4.interestRate}% supports post-CP debt service.`,
      ];
    case "Escrow Configuration":
      return [
        `${m.escrowJurisdiction} escrow rules govern buyer payment collection and developer withdrawal timing.`,
        `Progress-linked withdrawals align developer cash access with construction certification.`,
        `Retention provisions protect buyers until handover and defect liability periods.`,
      ];
    case "Post-Financing Cash Flows":
      return [
        `Post-financing cash flows reflect debt drawdown, IDC, and equity injections through construction.`,
        `Sales inflows net of escrow releases fund debt repayment and equity distributions.`,
        `Yearly aggregation highlights path to positive levered cumulative NCF.`,
      ];
    case "IRR Metrics":
      return [
        `Unlevered project IRR of ${bundle.component4.projectIRR}% and levered equity IRR of ${bundle.component4.equityIRR}% frame return expectations.`,
        `Equity multiple of ${bundle.component4.equityMultiple.toFixed(2)}x with payback at month ${m.paybackMonth} supports institutional underwriting.`,
        `TDC of ${tdcFmt} against GDV of ${gdvFmt} delivers development margin consistent with ${config.assetLabel.toLowerCase()} benchmarks.`,
      ];
    case "Scenario Comparison":
      return [
        `Base, downside, and upside scenarios stress sales price, velocity, and construction cost assumptions.`,
        `IRR sensitivity highlights sales price and construction duration as primary return drivers.`,
        `Downside case preserves positive equity returns under moderate stress.`,
      ];
    case "Scenario Results":
      return [
        `Scenario analysis confirms resilience of returns under combined downside shocks.`,
        `Sales velocity and construction cost shocks have the largest impact on levered equity IRR.`,
        `Mitigants include phased launch, cost contingency, and flexible RCF sizing.`,
      ];
    default:
      return [
        `Sale-stream feasibility analysis for ${config.assetLabel} in ${bundle.location.city}, ${bundle.location.country}.`,
      ];
  }
}
