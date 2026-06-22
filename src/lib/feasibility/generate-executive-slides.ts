import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";

function fmtMoney(amount: number, currency: string, compact = false): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}

function pct(n: number): string {
  return `${Math.round(n * 10) / 10}%`;
}

export function generateExecutiveSlides(
  project: FeasibilityProjectBundle
): FeasibilitySlide[] {
  const agg = project.aggregate;
  const c4 = project.component4;
  const c2 = project.component2;
  const c = project.currency;
  const loc = project.location;

  const feasible =
    c4.projectIRR > 12 && c4.equityIRR > 15
      ? "supports a proceed recommendation subject to confirmatory legal and technical diligence"
      : c4.projectIRR > 10
        ? "warrants further optimization of ADR, occupancy, and capital structure before final investment approval"
        : "requires material repricing of operating or capital assumptions to meet institutional return hurdles";

  const tdcFmt = fmtMoney(c4.tdc, c, true);
  const gdvFmt = fmtMoney(c4.gdv, c, true);

  return [
    {
      id: "exec-1",
      section: "executive",
      layout: "split",
      title: "Executive Summary",
      subtitle: "Financial Feasibility - Key Metrics",
      paragraphs: [
        `This feasibility study evaluates a ${agg.positioning} ${project.segment} hotel in ${loc.city}, ${loc.country}, comprising ${agg.keys.toLocaleString()} keys and ${agg.bua.toLocaleString()} sqft BUA over a ${agg.constructionPeriod}-month delivery program.`,
        `Market review indicates supportive macro and hospitality fundamentals in ${loc.country}, with stabilized operations underwritten at ${fmtMoney(c2.adrStabilized, c)} ADR and ${pct(c2.occupancyStabilized)} occupancy.`,
        `Unlevered project IRR of ${pct(c4.projectIRR)} and levered equity IRR of ${pct(c4.equityIRR)} (${c4.equityMultiple.toFixed(2)}x equity multiple, ${c4.paybackPeriod}-year payback) ${feasible}.`,
        `Senior facilities of ${fmtMoney(c4.approvedDebt, c, true)} are structured with ${c4.idcTreatment.toLowerCase()} IDC treatment, resulting in a loan at completion of ${fmtMoney(c4.loanAtCompletion, c, true)}.`,
        `The study recommends alignment of equity pacing with the ${project.component1.constructionPeriod}-month construction S-curve and monitoring of RevPAR against the competitive set through stabilization.`,
      ],
      tables: [
        {
          title: "Key Financial Metrics",
          headers: ["Metric", "Value"],
          rows: [
            ["Total Development Cost (TDC)", tdcFmt],
            ["Gross Development Value (GDV)", gdvFmt],
            ["Unlevered Project IRR", pct(c4.projectIRR)],
            ["Levered Equity IRR", pct(c4.equityIRR)],
            ["Equity Multiple", `${c4.equityMultiple.toFixed(2)}x`],
            ["Payback Period", `${c4.paybackPeriod} years`],
          ],
          footer: `Total development cost is ${tdcFmt} against a gross development value of ${gdvFmt}, implying a ${pct(agg.netProfitMargin)} net margin on GDV before financing frictions.`,
        },
      ],
    },
  ];
}
