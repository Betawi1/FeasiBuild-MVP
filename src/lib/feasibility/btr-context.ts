import type { FeasibilityProjectBundle } from "@/types/feasibility";
import type { OperationalResidentialHoldSnapshot } from "@/lib/operational-pnl";

export interface BTRContext {
  city: string;
  country: string;
  currency: string;
  residentialGla: number;
  retailGla: number;
  residentialRentYear1: number;
  residentialLeaseUpYear1: number;
  residentialStabilizedOccupancy: number;
  residentialLeaseUpMonths: number;
  badDebtPct: number;
  totalUnits: number;
  constructionPeriod: number;
  tdc: number;
  gdv: number;
  projectIRR: number;
  equityIRR: number;
  equityMultiple: number;
  paybackPeriod: number;
  constructionCost: number;
  ffeBase: number;
  constructionLife: number;
  ffeLife: number;
  snap: OperationalResidentialHoldSnapshot | undefined;
}

export function getBTRContext(bundle: FeasibilityProjectBundle): BTRContext {
  const snap = bundle.residentialHoldSnapshot;
  const c1 = bundle.component1;
  const c4 = bundle.component4;

  const residentialGla = snap?.residentialGlaSqft ?? c1.bua ?? 125_127;
  const retailGla = snap?.retailGlaSqft ?? 22_081;
  const residentialRentYear1 = snap?.residentialRentPsfYear1 ?? 59;
  const residentialLeaseUpYear1 =
    snap?.residentialLeasedPctValues?.[0] ??
    snap?.residentialLeasedOpeningPct ??
    50;
  const residentialStabilized =
    snap?.residentialLeasedPctValues?.at(-1) ??
    snap?.residentialLeasedTargetPct ??
    bundle.component2.occupancyStabilized ??
    92;

  return {
    city: bundle.location.city,
    country: bundle.location.country,
    currency: bundle.currency,
    residentialGla,
    retailGla,
    residentialRentYear1,
    residentialLeaseUpYear1,
    residentialStabilizedOccupancy: residentialStabilized,
    residentialLeaseUpMonths: snap?.residentialLeaseUpMonths ?? 24,
    badDebtPct: snap?.residentialBadDebtRatePct ?? 2,
    totalUnits: snap?.estimatedTotalUnits ?? 0,
    constructionPeriod: c1.constructionPeriod,
    tdc: c4.tdc,
    gdv: c4.gdv,
    projectIRR: c4.projectIRR,
    equityIRR: c4.equityIRR,
    equityMultiple: c4.equityMultiple,
    paybackPeriod: c4.paybackPeriod,
    constructionCost: c1.constructionCost,
    ffeBase: c1.ffe,
    constructionLife: snap?.constructionLife ?? 30,
    ffeLife: snap?.ffeLife ?? 7,
    snap,
  };
}

export function formatBTRGradeLabel(positioning?: string): string {
  const map: Record<string, string> = {
    grade_a: "Grade A",
    grade_b: "Grade B",
    grade_c: "Grade C",
    luxury: "Luxury",
  };
  const key = (positioning ?? "").toLowerCase();
  return map[key] ?? "Grade B";
}

export function formatBTRSegmentLabel(segment?: string): string {
  if (!segment?.trim()) return "High-Rise";
  return segment
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("-");
}

export function fmtBTRMoney(
  amount: number,
  currency: string,
  compact = false
): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}
