import type { FeasibilityProjectBundle } from "@/types/feasibility";

export interface DataCentreContext {
  city: string;
  country: string;
  currency: string;
  subMarket?: string;
  segment: string;
  tierLevel: string;
  positioning: string;
  itLoadMw: number;
  itLoadKw: number;
  whiteSpaceSqft: number;
  totalBuildingGfa: number;
  landArea: number;
  pue: number;
  leaseRatePerKwMonth: number;
  leaseRatePerSqftMonth: number;
  occupancyRate: number;
  annualEscalationPct: number;
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
  costPerMw: number;
}

/** Structured DC feasibility payload for market charts and slide data. */
export interface DataCentreFeasibilityData {
  projectMetrics: {
    itLoadMW: number;
    whiteSpaceSqft: number;
    tierLevel: string;
    pue: number;
    costPerMW: number;
  };
  marketData: {
    supplyPipelineMW: Array<{
      year: number;
      existing: number;
      pipeline: number;
    }>;
    competitorPricing: Array<{ name: string; pricePerKw: number }>;
    competitorPUE: Array<{ name: string; pue: number }>;
    latencyToHubs: Array<{ hub: string; latencyMs: number }>;
    electricityPricing: Array<{ year: number; pricePerKwh: number }>;
  };
}

export function getDataCentreContext(
  bundle: FeasibilityProjectBundle
): DataCentreContext {
  const dm = bundle.dataCentreMetrics;
  const c1 = bundle.component1;
  const c4 = bundle.component4;
  const itLoadMw = dm?.itLoadMw ?? 0;
  const tdc = c4.tdc;

  return {
    city: bundle.location.city,
    country: bundle.location.country,
    currency: bundle.currency,
    subMarket: bundle.location.subMarket,
    segment: dm?.segment ?? "Colocation",
    tierLevel: dm?.tierLevel ?? "Tier III",
    positioning: dm?.positioning ?? "Premium",
    itLoadMw,
    itLoadKw: dm?.itLoadKw ?? itLoadMw * 1000,
    whiteSpaceSqft: dm?.whiteSpaceSqft ?? 0,
    totalBuildingGfa: dm?.totalBuildingGfa ?? c1.bua ?? 0,
    landArea: dm?.landArea ?? 0,
    pue: dm?.pue ?? 1.4,
    leaseRatePerKwMonth: dm?.leaseRatePerKwMonth ?? 0,
    leaseRatePerSqftMonth: dm?.leaseRatePerSqftMonth ?? 0,
    occupancyRate: dm?.occupancyRate ?? 85,
    annualEscalationPct: dm?.annualEscalationPct ?? 3,
    constructionPeriod: dm?.constructionPeriod ?? c1.constructionPeriod,
    tdc,
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
    costPerMw: itLoadMw > 0 ? tdc / itLoadMw : 0,
  };
}

export function fmtDataCentreMoney(
  amount: number,
  currency: string,
  compact = false
): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}

export function formatDataCentreTierLabel(tier?: string): string {
  const raw = (tier || "tier-iii").replace(/_/g, " ").trim();
  return raw
    .replace(/tier[- ]?/i, "Tier ")
    .replace(/\b(ii|iii|iv|ii+|i+)\b/gi, (m) => m.toUpperCase())
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Tier\s+/i, "Tier ");
}

export function formatDataCentreSegmentLabel(segment?: string): string {
  const raw = (segment || "colocation").replace(/_/g, " ").trim();
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}
