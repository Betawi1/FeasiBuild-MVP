import type { FeasibilityProjectBundle } from "@/types/feasibility";

export interface WarehouseContext {
  city: string;
  country: string;
  currency: string;
  subMarket?: string;
  warehouseSubType: string;
  qualityGrade: string;
  warehouseBua: number;
  landArea: number;
  numberOfUnits: number;
  baseRentYear1: number;
  yardRateYear1: number;
  leaseUpYears: number;
  openingOccupancy: number;
  stabilizedOccupancy: number;
  rentEscalation: number;
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
  ffe: number;
}

export function getWarehouseContext(
  bundle: FeasibilityProjectBundle
): WarehouseContext {
  const wm = bundle.warehouseMetrics;
  const c1 = bundle.component1;
  const c4 = bundle.component4;

  return {
    city: bundle.location.city,
    country: bundle.location.country,
    currency: bundle.currency,
    subMarket: bundle.location.subMarket,
    warehouseSubType: wm?.warehouseSubType ?? "Bulk Distribution",
    qualityGrade: wm?.qualityGrade ?? "Grade A",
    warehouseBua: wm?.warehouseBua ?? c1.bua ?? 0,
    landArea: wm?.landArea ?? 0,
    numberOfUnits: wm?.numberOfUnits ?? 1,
    baseRentYear1: wm?.baseRentYear1 ?? 0,
    yardRateYear1: wm?.yardRateYear1 ?? 0,
    leaseUpYears: wm?.leaseUpYears ?? 2,
    openingOccupancy: wm?.openingOccupancy ?? 60,
    stabilizedOccupancy: wm?.stabilizedOccupancy ?? 90,
    rentEscalation: wm?.rentEscalation ?? 3,
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
    ffe: c1.ffe,
  };
}

export function fmtWarehouseMoney(
  amount: number,
  currency: string,
  compact = false
): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}
