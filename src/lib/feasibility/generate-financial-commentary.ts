import type {
  FeasibilityProjectBundle,
  FinancialSlideType,
} from "@/types/feasibility";

function fmtM(amount: number, currency: string): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}

function drawdownPhrase(drawdownType: string): string {
  const lower = drawdownType.toLowerCase();
  if (lower.includes("quarterly")) return "quarterly drawdown schedule";
  if (lower.includes("milestone")) return "quarterly drawdown schedule";
  if (lower.includes("s-curve") || lower.includes("scurve")) {
    return "S-curve construction drawdown schedule";
  }
  if (lower.includes("equity-first")) return "equity-first gap fill schedule";
  return drawdownType.toLowerCase();
}

/** Rule-based institutional commentary (Qwen can override via API). */
export function generateFinancialCommentary(
  project: FeasibilityProjectBundle,
  slideType: FinancialSlideType
): string[] {
  const c = project.currency;
  const c1 = project.component1;
  const c2 = project.component2;
  const c4 = project.component4;
  const loc = `${project.location.city}, ${project.location.country}`;

  switch (slideType) {
    case "Development Assumptions": {
      const benchBuilding = c1.buildingRate > 0 ? c1.buildingRate * 0.95 : 0;
      const rateNote =
        c1.buildingRate >= benchBuilding
          ? "at or above"
          : "below";
      return [
        `The total development cost of ${fmtM(c4.tdc, c)} is structured over a ${c1.constructionPeriod}-month horizon in ${loc}. Land and construction represent the dominant uses of capital in the base schedule.`,
        `The assumed construction rate of ${c} ${c1.buildingRate.toLocaleString()}/sqft (${rateNote} a ${c} ${Math.round(benchBuilding).toLocaleString()}/sqft proxy benchmark for ${project.segment} hotels) drives hard-cost exposure on ${c1.buildingBUA.toLocaleString()} sqft of building BUA.`,
        `Stabilized operations target ${c2.occupancyStabilized}% occupancy and ${fmtM(c2.adrStabilized, c)} ADR, supporting an unlevered project IRR of ${c4.projectIRR}% in the financial model.`,
      ];
    }
    case "Hotel Development Schedule":
      return [
        `The Hotel Development Schedule allocates ${fmtM(c4.tdc, c)} across land acquisition, construction, soft costs, FF&E, and pre-opening (POWC), consistent with Component 1 cost build-up.`,
        `Construction cost of ${fmtM(c1.constructionCost, c)} reflects blended building, parking, and basement rates applied to the respective BUA components.`,
        `Total cost per key equates to ${fmtM(c4.tdc / Math.max(c1.rooms, 1), c)} on ${c1.rooms.toLocaleString()} keys — a key metric for lender covenant and equity return benchmarking.`,
      ];
    case "Cash Flow":
      return [
        `Annualized net cash flows are derived from monthly NCF post-financing (M0 onward), with stub periods rolled into the active year per institutional convention.`,
        `The model indicates a payback period of ${c4.paybackPeriod} years on peak equity, with cumulative NCF turning positive in the operating ramp.`,
        `Unlevered project IRR of ${c4.projectIRR}% and equity multiple of ${c4.equityMultiple.toFixed(2)}x frame the return profile before sensitivity on ADR and occupancy.`,
      ];
    case "Term Loan":
      return [
        `Senior construction financing of ${fmtM(c4.approvedDebt, c)} is structured with ${c4.idcTreatment} IDC treatment, drawn on a ${drawdownPhrase(c4.drawdownType)} at ${c4.interestRate}% all-in cost.`,
        `IDC treatment (${c4.idcTreatment}) results in capitalized interest of approximately ${fmtM(c4.idcAmount, c)}, bringing the loan at completion to ${fmtM(c4.loanAtCompletion, c)}.`,
        `Repayment follows a ${c4.loanType} structure over the ${c4.totalTenor} total tenor (including construction and pre-op periods), with DSCR monitored from first full operating year.`,
      ];
    case "Profit and Loss":
      return [
        `The 10-year operating P&L reflects hotel revenue ramp from Year 1 ADR of ${fmtM(c2.adrYear1, c)} to stabilized ${fmtM(c2.adrStabilized, c)}, with ADR escalation of ${c2.adrInflation}% per annum in the hold period.`,
        `EBITDA margin expands as occupancy approaches ${c2.occupancyStabilized}% and departmental cost ratios normalize against the ${project.segment} operating profile.`,
        `Net income after depreciation supports distributable cash flow to equity and debt service coverage tests in outer years.`,
      ];
    case "Operating Expenses":
      return [
        `Operating expense assumptions follow the Component 2 hotel hold wizard, with inflation on ADR of ${c2.adrInflation}% and a ${c2.operationalYears}-year operating period.`,
        `Management fees, departmental payroll, and property-level opex scale with revenue; renovation provisions are embedded per the benchmark profile.`,
        `Expense intensity should be stress-tested at +200 bps on payroll and utilities given ${project.location.country} inflation dynamics.`,
      ];
    case "Scenario Summary":
      return [
        `Base-case returns (${c4.projectIRR}% unlevered / ${c4.equityIRR}% levered) should be compared to downside ADR −10% and construction cost +10% scenarios in Component 6.`,
        `GDV of ${fmtM(c4.gdv, c)} against TDC of ${fmtM(c4.tdc, c)} implies a ${project.aggregate.netProfitMargin}% net development margin before financing costs.`,
        `Equity investors should underwrite to a minimum ${Math.max(12, c4.projectIRR - 2)}% unlevered IRR hurdle in ${loc}.`,
      ];
    default:
      return [
        `Financial metrics for the ${project.assetType} in ${loc} are sourced from Components 1–4 of the live model.`,
      ];
  }
}

export function generateIrrFinancingMetricsCommentary(metrics: {
  projectIrr: number;
  equityIrr: number;
  equityMultiple: number;
  paybackPeriod: number;
  minDscr: number;
}): string {
  const projectIrr = metrics.projectIrr.toFixed(1);
  const equityIrr = metrics.equityIrr.toFixed(1);
  const multiple = metrics.equityMultiple.toFixed(2);
  const payback = metrics.paybackPeriod;
  const minDscr = metrics.minDscr.toFixed(2);
  const spread = metrics.equityIrr - metrics.projectIrr;

  const leverageNote =
    spread > 0.5
      ? `Positive financial leverage adds ${spread.toFixed(1)} percentage points to equity returns relative to the unlevered asset yield.`
      : spread > 0
        ? `The capital structure provides a modest leverage uplift of ${spread.toFixed(1)} percentage points over the unlevered project return.`
        : spread < -0.25
          ? `Leverage currently dilutes returns by ${Math.abs(spread).toFixed(1)} percentage points versus the unlevered case, warranting review of debt sizing.`
          : `Leverage has a neutral effect on returns relative to the unlevered project IRR in the base case.`;

  const dscrNote =
    metrics.minDscr >= 1.25
      ? "Debt service coverage is healthy, comfortably above typical senior covenant floors."
      : metrics.minDscr >= 1.2
        ? "Debt service coverage meets conventional minimum thresholds but offers limited headroom under stress."
        : "Minimum DSCR is tight relative to standard lender requirements and should be monitored under downside scenarios.";

  return `The project delivers an unlevered Project IRR of ${projectIrr}%, which leverages to a ${equityIrr}% Equity IRR (${multiple}x equity multiple). ${leverageNote} ${dscrNote} With a minimum DSCR of ${minDscr}x and an equity payback period of ${payback} years, the financing structure supports institutional return expectations for stabilized hospitality assets.`;
}
