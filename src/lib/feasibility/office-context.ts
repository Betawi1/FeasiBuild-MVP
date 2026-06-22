import type { FeasibilityProjectBundle } from "@/types/feasibility";
import type { OperationalOfficeHoldSnapshot } from "@/lib/operational-pnl";

export interface OfficeContext {
  city: string;
  country: string;
  currency: string;
  officeGla: number;
  retailGla: number;
  officeRentYear1: number;
  retailRentYear1: number;
  officeRentEscalation: number;
  retailRentEscalation: number;
  officeLeaseUpYear1: number;
  retailLeaseUpYear1: number;
  officeStabilizedOccupancy: number;
  retailStabilizedOccupancy: number;
  officeLeaseUpPeriod: number;
  retailLeaseUpPeriod: number;
  constructionPeriod: number;
  tdc: number;
  gdv: number;
  projectIRR: number;
  equityIRR: number;
  equityMultiple: number;
  paybackPeriod: number;
  landCost: number;
  constructionCost: number;
  softCosts: number;
  powc: number;
  ffeBase: number;
  officeTI: number;
  retailTI: number;
  officeLeasingComm: number;
  retailLeasingComm: number;
  snap: OperationalOfficeHoldSnapshot | undefined;
}

export function getOfficeContext(bundle: FeasibilityProjectBundle): OfficeContext {
  const snap = bundle.officeHoldSnapshot;
  const c1 = bundle.component1;
  const c4 = bundle.component4;

  const officeGla = snap?.officeGlaSqft ?? c1.bua ?? 127_188;
  const retailGla = snap?.retailGlaSqft ?? 29_442;
  const officeRentYear1 = snap?.officeRentPsfYear1 ?? 120;
  const retailRentYear1 = snap?.retailRentPsfYear1 ?? 200;
  const officeLeaseUpYear1 =
    snap?.officeLeasedPctValues?.[0] ?? snap?.officeLeasedOpeningPct ?? 60;
  const retailLeaseUpYear1 =
    snap?.retailLeasedPctValues?.[0] ?? snap?.retailLeasedOpeningPct ?? 50;
  const officeStabilized =
    snap?.officeLeasedPctValues?.[2] ??
    snap?.officeLeasedTargetPct ??
    bundle.component2.occupancyStabilized ??
    90;
  const retailStabilized =
    snap?.retailLeasedPctValues?.[2] ??
    snap?.retailLeasedTargetPct ??
    100;

  return {
    city: bundle.location.city,
    country: bundle.location.country,
    currency: bundle.currency,
    officeGla,
    retailGla,
    officeRentYear1,
    retailRentYear1,
    officeRentEscalation: snap?.officeRentEscalationPct ?? 3,
    retailRentEscalation: snap?.retailRentEscalationPct ?? 3,
    officeLeaseUpYear1,
    retailLeaseUpYear1,
    officeStabilizedOccupancy: officeStabilized,
    retailStabilizedOccupancy: retailStabilized,
    officeLeaseUpPeriod: snap?.officeLeaseUpYears ?? 3,
    retailLeaseUpPeriod: snap?.retailLeaseUpYears ?? 2,
    constructionPeriod: c1.constructionPeriod,
    tdc: c4.tdc,
    gdv: c4.gdv,
    projectIRR: c4.projectIRR,
    equityIRR: c4.equityIRR,
    equityMultiple: c4.equityMultiple,
    paybackPeriod: c4.paybackPeriod,
    landCost: c1.landCost,
    constructionCost: c1.constructionCost,
    softCosts: c1.softCosts,
    powc: c1.powc,
    ffeBase: c1.ffe,
    officeTI: snap?.officeTiCapital ?? 0,
    retailTI: snap?.retailTiCapital ?? 0,
    officeLeasingComm: snap?.officeLeasingCommCapital ?? 0,
    retailLeasingComm: snap?.retailLeasingCommCapital ?? 0,
    snap,
  };
}

export function fmtOfficeMoney(
  amount: number,
  currency: string,
  compact = false
): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}
