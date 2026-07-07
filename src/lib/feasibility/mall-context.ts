import type { FeasibilityProjectBundle } from "@/types/feasibility";
import type { OperationalRetailHoldSnapshot } from "@/lib/operational-pnl";
import { totalOperationalBua } from "@/lib/operational-pnl";

export interface MallContext {
  city: string;
  country: string;
  currency: string;
  mallType: string;
  positioning: string;
  gla: number;
  baseRentYear1: number;
  rentEscalation: number;
  leaseUpYear1: number;
  stabilizedOccupancy: number;
  leaseUpPeriod: number;
  percentageRentRate: number;
  avgTenantSales: number;
  parkingSpaces: number;
  parkingRevenue: number;
  parkingUtilization: number;
  camFixed: number;
  camVariable: number;
  recoveryRate: number;
  propertyTax: number;
  insurance: number;
  marketingPercentage: number;
  gAndA: number;
  managementFeePercentage: number;
  otherIncome: number;
  tiAllowance: number;
  leasingCommissions: number;
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
  snap: OperationalRetailHoldSnapshot | undefined;
}

function formatMallType(segment?: string, positioning?: string): string {
  const seg = (segment ?? "regional_mall").replace(/_/g, " ");
  const pos = (positioning ?? "mid_market").replace(/_/g, " ");
  return `${seg} — ${pos}`;
}

export function getMallContext(bundle: FeasibilityProjectBundle): MallContext {
  const snap = bundle.retailHoldSnapshot;
  const c1 = bundle.component1;
  const c4 = bundle.component4;
  const gla = snap?.glaSqft ?? c1.bua ?? 180_000;
  const totalBua = totalOperationalBua(c1) || c1.bua || 0;
  const baseRentYear1 = snap?.baseRentPerSqftValues?.[0] ?? 250;
  const grossRentYear1 =
    snap?.revenueValues?.[0] ?? gla * baseRentYear1 * ((snap?.occupancyValues?.[0] ?? 55) / 100);
  const totalRevYear1 =
    grossRentYear1 + (snap?.otherIncomeTotalValues?.[0] ?? 0);
  const leasedGlaYear1 =
    snap?.effectiveLeasedValues?.[0] ??
    gla * ((snap?.occupancyValues?.[0] ?? 55) / 100);

  const camFixedRate =
    snap?.camFixedBaseRate ??
    (snap?.camFixedBase != null && totalBua > 0
      ? snap.camFixedBase / totalBua
      : 2);
  const propertyTaxPct =
    snap?.propertyTaxPctOfGrossRent ??
    (snap?.propertyTaxAnnual != null && grossRentYear1 > 0
      ? (snap.propertyTaxAnnual / grossRentYear1) * 100
      : 0.8);
  const insurancePct =
    snap?.insurancePctOfGrossRent ??
    (snap?.insuranceAnnual != null && grossRentYear1 > 0
      ? (snap.insuranceAnnual / grossRentYear1) * 100
      : 0.16);
  const gAndAPct =
    snap?.gAndAPctOfRevenue ??
    (snap?.gAndAAnnual != null && totalRevYear1 > 0
      ? (snap.gAndAAnnual / totalRevYear1) * 100
      : 0.43);
  const advertisingRate =
    snap?.advertisingRatePerSqft ??
    (snap?.advertisingIncomeYear1 != null && gla > 0
      ? snap.advertisingIncomeYear1 / gla
      : 0.875);

  const camFixed = camFixedRate * totalBua;
  const propertyTax = grossRentYear1 * (propertyTaxPct / 100);
  const insurance = grossRentYear1 * (insurancePct / 100);
  const gAndA = totalRevYear1 * (gAndAPct / 100);
  const otherIncome = advertisingRate * gla;
  const stabilizedOccupancy =
    snap?.occupancyValues?.[2] ??
    snap?.occupancyValues?.at(-1) ??
    bundle.component2.occupancyStabilized ??
    92;
  const leaseUpYear1 = snap?.occupancyValues?.[0] ?? bundle.component2.occupancyYear1 ?? 55;

  return {
    city: bundle.location.city,
    country: bundle.location.country,
    currency: bundle.currency,
    mallType: formatMallType(bundle.retailSegment, bundle.retailPositioning),
    positioning: (bundle.retailPositioning ?? "mid_market").replace(/_/g, " "),
    gla,
    baseRentYear1,
    rentEscalation: snap?.rentEscalationPct ?? 3,
    leaseUpYear1,
    stabilizedOccupancy,
    leaseUpPeriod: 3,
    percentageRentRate: snap?.percentageRentRate ?? 5,
    avgTenantSales: snap?.avgTenantSalesPsf ?? 2500,
    parkingSpaces: snap?.parkingSpaces ?? 1200,
    parkingRevenue: snap?.parkingRevenuePerSpaceDay ?? 15,
    parkingUtilization: snap?.parkingUtilization ?? 65,
    camFixed,
    camVariable: snap?.camVariableRate ?? 12,
    recoveryRate: snap?.recoveryRate ?? 95,
    propertyTax,
    insurance,
    marketingPercentage: snap?.marketingPctOfRevenue ?? 1.8,
    gAndA,
    managementFeePercentage: snap?.mgmtFeePctOfRevenue ?? 2.8,
    otherIncome,
    tiAllowance: snap?.tiCapital ?? 26_300_000,
    leasingCommissions: snap?.leasingCommCapital ?? 8_800_000,
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
    snap,
  };
}

export function fmtMallMoney(amount: number, currency: string, compact = false): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}
