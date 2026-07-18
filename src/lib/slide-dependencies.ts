import type { SaleFeasibilityBundle } from "@/types/feasibility";
import type { FeasibilityProjectBundle } from "@/types/feasibility";
import { generateDataHash } from "@/lib/cache-service";

function roundForHash(value: number, precision = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function stableComponent1(component1: FeasibilityProjectBundle["component1"]) {
  return {
    rooms: component1.rooms,
    bua: roundForHash(component1.bua, 0),
    constructionPeriod: component1.constructionPeriod,
    landCost: roundForHash(component1.landCost, 0),
    constructionCost: roundForHash(component1.constructionCost, 0),
    softCosts: roundForHash(component1.softCosts, 0),
    ffe: roundForHash(component1.ffe, 0),
    powc: roundForHash(component1.powc, 0),
    buildingRate: roundForHash(component1.buildingRate),
    parkingRate: roundForHash(component1.parkingRate),
    basementRate: roundForHash(component1.basementRate),
    buildingBUA: roundForHash(component1.buildingBUA, 0),
    parkingBUA: roundForHash(component1.parkingBUA, 0),
  };
}

function stableComponent2(component2: FeasibilityProjectBundle["component2"]) {
  return {
    adrYear1: roundForHash(component2.adrYear1),
    adrStabilized: roundForHash(component2.adrStabilized),
    occupancyYear1: roundForHash(component2.occupancyYear1, 4),
    occupancyStabilized: roundForHash(component2.occupancyStabilized, 4),
    adrInflation: roundForHash(component2.adrInflation, 4),
    operationalYears: component2.operationalYears,
  };
}

function stableComponent4(component4: FeasibilityProjectBundle["component4"]) {
  return {
    tdc: roundForHash(component4.tdc, 0),
    gdv: roundForHash(component4.gdv, 0),
    projectIRR: roundForHash(component4.projectIRR, 2),
    equityIRR: roundForHash(component4.equityIRR, 2),
    equityMultiple: roundForHash(component4.equityMultiple, 2),
    paybackPeriod: roundForHash(component4.paybackPeriod, 1),
    approvedDebt: roundForHash(component4.approvedDebt, 0),
    drawdownType: component4.drawdownType,
    idcTreatment: component4.idcTreatment,
    loanAtCompletion: roundForHash(component4.loanAtCompletion, 0),
    loanType: component4.loanType,
    interestRate: roundForHash(component4.interestRate, 4),
    totalTenor: component4.totalTenor,
    idcAmount: roundForHash(component4.idcAmount, 0),
  };
}

function stableSaleMetrics(bundle: SaleFeasibilityBundle) {
  const sm = bundle.saleMetrics;
  return {
    totalUnits: sm.totalUnits,
    totalArea: roundForHash(sm.totalArea, 0),
    saleableArea: roundForHash(sm.saleableArea, 0),
    avgPricePsf: roundForHash(sm.avgPricePsf),
    grossSales: roundForHash(sm.grossSales, 0),
    netProceeds: roundForHash(sm.netProceeds, 0),
    paybackMonth: sm.paybackMonth,
    constructionMonths: sm.constructionMonths,
    escrowJurisdiction: sm.escrowJurisdiction,
  };
}

function stableSaleCashInflows(bundle: SaleFeasibilityBundle) {
  const ci = bundle.cashInflows;
  return {
    grossSales: roundForHash(ci.grossSales || 0, 0),
    netProceeds: roundForHash(ci.netProceeds || 0, 0),
    salesPrice: roundForHash(ci.salesPrice || 0),
    saleableBUARatio: roundForHash(ci.saleableBUARatio || 0, 2),
  };
}

function stableFinancing(bundle: SaleFeasibilityBundle) {
  const f = bundle.financing;
  return {
    approvedCreditFacility: roundForHash(
      f.approvedCreditFacility ?? f.debtFacilityAmount ?? 0,
      0
    ),
    loanAtCompletion: roundForHash(f.loanAtCompletion ?? 0, 0),
    drawdownModel: f.drawdownModel,
    idcTreatment: f.idcTreatment,
    repaymentStructure: f.repaymentStructure,
    interestRate: roundForHash(
      f.fixedOrProfitRatePercent || f.interestRate || 0,
      4
    ),
    amortizationYears: f.amortizationYears,
    escrowMode: f.escrowConfig?.withdrawalMode,
  };
}

function normStr(value: string | undefined): string {
  return (value ?? "").trim();
}

/**
 * Core operational inputs for cache hashing — primitives only.
 * Excludes calculated totals (TDC/GDV/IRR), cash-flow arrays, timestamps.
 */
export function buildOperationalStableInputs(
  bundle: FeasibilityProjectBundle
): Record<string, string | number> {
  const c1 = bundle.component1;
  const c2 = bundle.component2;
  const c4 = bundle.component4;
  const city = normStr(bundle.location.city);
  const country = normStr(bundle.location.country);
  const subMarket = normStr(bundle.location.subMarket ?? "");
  const lat = bundle.location.coordinates?.lat;
  const lng = bundle.location.coordinates?.lng;

  return {
    city,
    country,
    subMarket,
    lat: lat != null && Number.isFinite(lat) ? roundForHash(lat, 5) : "",
    lng: lng != null && Number.isFinite(lng) ? roundForHash(lng, 5) : "",
    location: `${city},${country},${subMarket}`,
    assetType: normStr(bundle.assetType),
    segment: normStr(bundle.segment),
    currency: normStr(bundle.currency),
    rooms: c1.rooms,
    bua: roundForHash(c1.bua, 0),
    constructionPeriod: c1.constructionPeriod,
    landCost: roundForHash(c1.landCost, 0),
    constructionCost: roundForHash(c1.constructionCost, 0),
    softCosts: roundForHash(c1.softCosts, 0),
    ffe: roundForHash(c1.ffe, 0),
    powc: roundForHash(c1.powc, 0),
    buildingRate: roundForHash(c1.buildingRate, 0),
    parkingRate: roundForHash(c1.parkingRate, 0),
    basementRate: roundForHash(c1.basementRate, 0),
    buildingBUA: roundForHash(c1.buildingBUA, 0),
    parkingBUA: roundForHash(c1.parkingBUA, 0),
    adrYear1: roundForHash(c2.adrYear1, 0),
    adrStabilized: roundForHash(c2.adrStabilized, 0),
    occupancyYear1: roundForHash(c2.occupancyYear1, 2),
    occupancyStabilized: roundForHash(c2.occupancyStabilized, 2),
    operationalYears: c2.operationalYears,
    starRating: normStr(bundle.aggregate?.starRating),
    approvedDebt: roundForHash(c4.approvedDebt, 0),
    drawdownType: normStr(c4.drawdownType),
    idcTreatment: normStr(c4.idcTreatment),
    loanAtCompletion: roundForHash(c4.loanAtCompletion, 0),
    loanType: normStr(c4.loanType),
    interestRate: roundForHash(c4.interestRate, 4),
    totalTenor: normStr(c4.totalTenor),
    idcAmount: roundForHash(c4.idcAmount, 0),
  };
}

export type ComponentHashKey =
  | "projectInfo"
  | "marketData"
  | "component1Data"
  | "component2Data"
  | "component4Data"
  | "component6Data";

export type SlideDependencySection =
  | "macro"
  | "market"
  | "executive-summary"
  | "project"
  | "financial-assumptions"
  | "development-schedule"
  | "sales-assumptions"
  | "cash-flow"
  | "financing"
  | "scenario";

/** Which component hashes affect each slide section (Layer 2 invalidation). */
export const SLIDE_DEPENDENCIES: Record<
  SlideDependencySection,
  ComponentHashKey[]
> = {
  macro: ["projectInfo", "marketData"],
  market: ["projectInfo", "marketData", "component2Data"],
  "executive-summary": ["component1Data", "component2Data", "component4Data"],
  project: ["projectInfo", "component1Data", "component2Data"],
  "financial-assumptions": ["component1Data"],
  "development-schedule": ["component1Data", "component2Data"],
  "sales-assumptions": ["component2Data"],
  "cash-flow": ["component1Data", "component2Data", "component4Data"],
  financing: ["component4Data", "component6Data"],
  scenario: ["component1Data", "component2Data", "component4Data", "component6Data"],
};

/** Map sale slide IDs to dependency sections for cache invalidation. */
export const SALE_SLIDE_DEPENDENCY_SECTION: Record<string, SlideDependencySection> =
  {
    "exec-1": "executive-summary",
    "project-location": "project",
    "sale-project-overview": "project",
    "macro-1": "macro",
    "macro-2": "macro",
    "macro-3": "macro",
    "macro-4": "macro",
    "sale-market-overview": "market",
    "sale-market-supplyDemand": "market",
    "sale-market-pricing": "market",
    "sale-market-velocity": "market",
    "sale-market-competition": "market",
    "sale-market-summary": "market",
    "sale-implications": "market",
    "sale-success-factors": "market",
    "sale-risk-factors": "market",
    "sale-dev-assumptions": "financial-assumptions",
    "sale-development-schedule": "development-schedule",
    "sale-sales-uptake-chart": "sales-assumptions",
    "sale-sales-summary-table": "sales-assumptions",
    "sale-project-cash-flow": "cash-flow",
    "sale-rcf": "financing",
    "sale-escrow": "financing",
    "sale-post-financing": "cash-flow",
    "sale-irr-metrics": "cash-flow",
    "sale-scenario-comparison": "scenario",
    "sale-scenario-results": "scenario",
  };

export function buildSaleBundleHashes(
  bundle: SaleFeasibilityBundle
): Record<ComponentHashKey, string> {
  return {
    projectInfo: generateDataHash({
      city: bundle.location.city,
      country: bundle.location.country,
      subMarket: bundle.location.subMarket,
      coordinates: bundle.location.coordinates,
      currency: bundle.currency,
      buildingSubType: bundle.buildingSubType,
      buildingType: bundle.buildingType,
    }),
    marketData: generateDataHash({
      location: bundle.location,
      assetType: bundle.assetType,
      segment: bundle.segment,
    }),
    component1Data: generateDataHash(stableComponent1(bundle.component1)),
    component2Data: generateDataHash({
      component2: stableComponent2(bundle.component2),
      saleMetrics: stableSaleMetrics(bundle),
      cashInflows: stableSaleCashInflows(bundle),
    }),
    component4Data: generateDataHash(stableComponent4(bundle.component4)),
    component6Data: generateDataHash(stableFinancing(bundle)),
  };
}

export function buildOperationalBundleHashes(
  bundle: FeasibilityProjectBundle
): Record<ComponentHashKey, string> {
  const stable = buildOperationalStableInputs(bundle);
  console.log("[Cache Debug] Operational stable inputs:", stable);

  // CRITICAL: Only hash stable, user-controlled inputs.
  // Do NOT include TDC/GDV/IRR (calculated; float between loads) or timestamps/IDs.
  const projectInfo = {
    city: stable.city,
    country: stable.country,
    subMarket: stable.subMarket,
    lat: stable.lat,
    lng: stable.lng,
    currency: stable.currency,
    assetType: stable.assetType,
    segment: stable.segment,
  };

  const marketData = {
    city: stable.city,
    country: stable.country,
    assetType: stable.assetType,
    segment: stable.segment,
    starRating: stable.starRating,
    adrYear1: stable.adrYear1,
    adrStabilized: stable.adrStabilized,
    occupancyYear1: stable.occupancyYear1,
    occupancyStabilized: stable.occupancyStabilized,
  };

  const component1Data = {
    rooms: stable.rooms,
    bua: stable.bua,
    constructionPeriod: stable.constructionPeriod,
    landCost: stable.landCost,
    constructionCost: stable.constructionCost,
    softCosts: stable.softCosts,
    ffe: stable.ffe,
    powc: stable.powc,
    buildingRate: stable.buildingRate,
    parkingRate: stable.parkingRate,
    basementRate: stable.basementRate,
    buildingBUA: stable.buildingBUA,
    parkingBUA: stable.parkingBUA,
  };

  const component2Data = {
    adrYear1: stable.adrYear1,
    adrStabilized: stable.adrStabilized,
    occupancyYear1: stable.occupancyYear1,
    occupancyStabilized: stable.occupancyStabilized,
    operationalYears: stable.operationalYears,
  };

  const financingData = {
    approvedDebt: stable.approvedDebt,
    drawdownType: stable.drawdownType,
    idcTreatment: stable.idcTreatment,
    loanAtCompletion: stable.loanAtCompletion,
    loanType: stable.loanType,
    interestRate: stable.interestRate,
    totalTenor: stable.totalTenor,
    idcAmount: stable.idcAmount,
  };

  const hashes = {
    projectInfo: generateDataHash(projectInfo, "operational.projectInfo"),
    marketData: generateDataHash(marketData, "operational.marketData"),
    component1Data: generateDataHash(component1Data, "operational.component1"),
    component2Data: generateDataHash(component2Data, "operational.component2"),
    component4Data: generateDataHash(financingData, "operational.component4"),
    component6Data: generateDataHash(financingData, "operational.component6"),
  };

  console.log("[Cache Debug] Operational component hashes:", hashes);
  return hashes;
}

/** Deep-compare two hash maps (order-independent via JSON of sorted keys). */
export function hashesAreEqual(
  a: Record<string, string>,
  b: Record<string, string>
): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i]!;
    if (key !== keysB[i] || a[key] !== b[key]) return false;
  }
  return true;
}

/** Stable hash from core project inputs (location, asset, physical + financing inputs). */
export function buildStableProjectHash(
  bundle: FeasibilityProjectBundle
): string {
  const stableInputs = buildOperationalStableInputs(bundle);
  console.log("[Cache Debug] Hashing these inputs:", stableInputs);
  return generateDataHash(stableInputs, "operational.project");
}

/** Map operational slide IDs to dependency sections. */
export const OPERATIONAL_SLIDE_DEPENDENCY_SECTION: Record<
  string,
  SlideDependencySection
> = {
  "exec-1": "executive-summary",
  "project-location": "project",
  "mall-project-overview": "project",
  "office-project-overview": "project",
  "btr-project-overview": "project",
  "macro-1": "macro",
  "macro-2": "macro",
  "macro-3": "macro",
  "macro-4": "macro",
  "mall-market-overview": "market",
  "mall-market-metrics": "market",
  "mall-supply-pipeline": "market",
  "mall-competitive-landscape": "market",
  "mall-tenant-profile": "market",
  "mall-market-summary": "market",
  "mall-implications": "market",
  "mall-success-factors": "market",
  "mall-risk-factors": "market",
  "office-market-overview": "market",
  "office-market-metrics": "market",
  "office-supply-pipeline": "market",
  "office-competitive-landscape": "market",
  "office-tenant-profile": "market",
  "office-market-summary": "market",
  "office-implications": "market",
  "office-success-factors": "market",
  "office-risk-factors": "market",
  "btr-market-overview": "market",
  "btr-market-metrics": "market",
  "btr-supply-pipeline": "market",
  "btr-competitive-landscape": "market",
  "btr-tenant-profile": "market",
  "btr-market-summary": "market",
  "btr-implications": "market",
  "btr-success-factors": "market",
  "btr-risk-factors": "market",
  "mall-dev-assumptions": "financial-assumptions",
  "office-dev-assumptions": "financial-assumptions",
  "btr-dev-assumptions": "financial-assumptions",
  "mall-operational-revenues": "sales-assumptions",
  "mall-operational-expenses": "sales-assumptions",
  "office-operational-revenues": "sales-assumptions",
  "office-operational-expenses": "sales-assumptions",
  "btr-operational-revenues": "sales-assumptions",
  "btr-operational-expenses": "sales-assumptions",
  "btr-operational-assumptions": "sales-assumptions",
  "hosp-demand": "market",
  "hosp-outlook": "market",
  "hosp-arrivals-historical": "market",
  "hosp-arrivals-projected": "market",
  "adr-occupancy": "market",
  "hosp-revenues": "market",
  "hosp-supply": "market",
  "hosp-guests": "market",
  "hosp-length-of-stay": "market",
  "hosp-competition-1": "market",
  "hosp-summary": "market",
  "hosp-implications": "market",
  "hosp-success-factors": "market",
  "hosp-risk-factors": "market",
  "fin-dev-assumptions": "financial-assumptions",
  "fin-dev-schedule": "development-schedule",
  "fin-term-loan": "financing",
  "operational-revenues": "sales-assumptions",
  "operational-expenses": "sales-assumptions",
  "operational-pnl": "sales-assumptions",
  "operational-cash-flow": "cash-flow",
  "pref-shares-exit-strategy": "financing",
  "post-financing-cash-flow": "cash-flow",
  "irr-and-financing-metrics": "cash-flow",
  "scenario-comparison": "scenario",
  "scenario-analysis-results": "scenario",
};

export function getOperationalSlideDependencySection(
  slideId: string
): SlideDependencySection {
  return OPERATIONAL_SLIDE_DEPENDENCY_SECTION[slideId] ?? "market";
}

export function getSlideDependencySection(
  slideId: string
): SlideDependencySection {
  return SALE_SLIDE_DEPENDENCY_SECTION[slideId] ?? "market";
}

export function buildCommentaryCacheKey(
  slideId: string,
  hashes: Record<string, string>,
  depSection?: SlideDependencySection,
  prefix = "sale"
): string {
  const section =
    depSection ??
    (prefix === "op"
      ? getOperationalSlideDependencySection(slideId)
      : getSlideDependencySection(slideId));
  const deps = SLIDE_DEPENDENCIES[section];
  const hashPart = deps.map((d) => hashes[d] ?? "0").join("_");
  return `${prefix}_${slideId}_${hashPart}`;
}

export function buildOperationalCommentaryCacheKey(
  slideId: string,
  hashes: Record<string, string>
): string {
  return buildCommentaryCacheKey(
    slideId,
    hashes,
    getOperationalSlideDependencySection(slideId),
    "op"
  );
}

/** Layer 2: true when any dependency hash changed since last generation. */
const loggedDependencyChanges = new Set<string>();

export function shouldRegenerateSlide(
  slideSection: SlideDependencySection,
  oldHashes: Record<string, string>,
  newHashes: Record<string, string>
): boolean {
  const dependencies = SLIDE_DEPENDENCIES[slideSection];
  const hasBaseline = dependencies.some(
    (dep) => oldHashes[dep] != null && oldHashes[dep] !== ""
  );
  if (!hasBaseline) {
    return false;
  }

  for (const dep of dependencies) {
    if (oldHashes[dep] !== newHashes[dep]) {
      const logKey = `${slideSection}:${dep}:${oldHashes[dep] ?? "∅"}→${newHashes[dep] ?? "∅"}`;
      if (!loggedDependencyChanges.has(logKey)) {
        loggedDependencyChanges.add(logKey);
        console.log(
          `[Cache] Dependency changed for ${slideSection}: ${dep} (${oldHashes[dep] ?? "∅"} → ${newHashes[dep] ?? "∅"})`
        );
      }
      return true;
    }
  }
  return false;
}

/** Clear dedupe set for dependency-change logs (call at start of a generation run). */
export function resetDependencyChangeLog(): void {
  loggedDependencyChanges.clear();
}
