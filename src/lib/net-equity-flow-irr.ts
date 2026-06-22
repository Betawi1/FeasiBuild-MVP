import { annualIrrPercentFromMonthlySeries } from "@/lib/equity-irr";
import { solveAnnualIRRPreferred } from "@/lib/irr-calculations";

/** Annual IRR in percent from month-indexed net equity cash flows (waterfall table / C5 net row). */
export function annualIrrPercentFromMonthlyNetEquityFlows(
  netFlows: number[]
): number {
  if (!netFlows.length) return 0;
  const solved = solveAnnualIRRPreferred(
    netFlows.map((amount, month) => ({ month, amount })),
    {
      tolerance: 1000,
      maxIterations: 250,
      selection: "max",
      preferredAnnualIRR: 0.125,
    }
  );
  if (solved.annualIRR != null && Number.isFinite(solved.annualIRR)) {
    return solved.annualIRR * 100;
  }
  return annualIrrPercentFromMonthlySeries(netFlows) ?? 0;
}
