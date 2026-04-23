import type { HotelOperatingType } from "@/config/hotel-cost-profiles";
import { inferHotelProfileRegion } from "@/config/hotel-cost-profiles";

export type DepreciationProfile = {
  constructionUsefulLife: number;
  ffeUsefulLife: number;
  ffeRenovationRate: number;
  accountsReceivableMonths: number;
  accountsPayableMonths: number;
  source: string;
  regions: string[];
};

export const HOTEL_DEPRECIATION_PROFILES: Record<string, DepreciationProfile> =
  {
    "business-5-dubai": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 5,
      ffeRenovationRate: 50.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "HVS Dubai Hotel Accounting Standards 2024",
      regions: ["dubai", "uae", "gcc"],
    },
    "business-4-dubai": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 5,
      ffeRenovationRate: 50.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "JLL Middle East Hotel Finance Report 2024",
      regions: ["dubai", "uae", "gcc"],
    },
    "business-3-dubai": {
      constructionUsefulLife: 25,
      ffeUsefulLife: 5,
      ffeRenovationRate: 45.0,
      accountsReceivableMonths: 1.5,
      accountsPayableMonths: 1,
      source: "STR GCC Midscale Hotel Benchmarks",
      regions: ["dubai", "uae", "gcc"],
    },
    "resort-5-dubai": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 4,
      ffeRenovationRate: 60.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "HVS Resort Accounting Survey — GCC",
      regions: ["dubai", "uae", "gcc"],
    },
    "resort-4-dubai": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 5,
      ffeRenovationRate: 55.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "JLL Middle East Leisure Hospitality Report",
      regions: ["dubai", "uae", "gcc"],
    },
    "boutique-4-dubai": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 5,
      ffeRenovationRate: 50.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "CBRE Boutique Hotel Trends — MENA",
      regions: ["dubai", "uae", "gcc"],
    },
    "boutique-3-dubai": {
      constructionUsefulLife: 25,
      ffeUsefulLife: 5,
      ffeRenovationRate: 45.0,
      accountsReceivableMonths: 1.5,
      accountsPayableMonths: 1,
      source: "STR Boutique Segment — GCC",
      regions: ["dubai", "uae", "gcc"],
    },
    "budget-1-dubai": {
      constructionUsefulLife: 30,
      ffeUsefulLife: 6,
      ffeRenovationRate: 35.0,
      accountsReceivableMonths: 0.5,
      accountsPayableMonths: 1.5,
      source: "HVS Economy Hotel Benchmarks — MENA",
      regions: ["dubai", "uae", "gcc"],
    },

    "business-5-malaysia": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 5,
      ffeRenovationRate: 50.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "JLL Malaysia Hotel Accounting Guide 2024",
      regions: ["malaysia", "kl", "penang"],
    },
    "business-4-malaysia": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 5,
      ffeRenovationRate: 50.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "CBRE Malaysia Hospitality Report 2024",
      regions: ["malaysia", "kl", "penang"],
    },
    "business-3-malaysia": {
      constructionUsefulLife: 25,
      ffeUsefulLife: 5,
      ffeRenovationRate: 45.0,
      accountsReceivableMonths: 1.5,
      accountsPayableMonths: 1,
      source: "STR Malaysia Midscale Benchmarks",
      regions: ["malaysia", "kl", "penang"],
    },
    "resort-5-malaysia": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 4,
      ffeRenovationRate: 60.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "HVS Asia Pacific Resort Survey",
      regions: ["malaysia", "langkawi", "kotakinabalu"],
    },
    "resort-4-malaysia": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 5,
      ffeRenovationRate: 55.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "JLL Malaysia Leisure Report",
      regions: ["malaysia", "langkawi", "kotakinabalu"],
    },
    "boutique-4-malaysia": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 5,
      ffeRenovationRate: 50.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "CBRE Boutique Trends — SEA",
      regions: ["malaysia", "kl", "penang"],
    },
    "boutique-3-malaysia": {
      constructionUsefulLife: 25,
      ffeUsefulLife: 5,
      ffeRenovationRate: 45.0,
      accountsReceivableMonths: 1.5,
      accountsPayableMonths: 1,
      source: "STR Boutique — Malaysia",
      regions: ["malaysia", "kl", "penang"],
    },
    "budget-1-malaysia": {
      constructionUsefulLife: 30,
      ffeUsefulLife: 6,
      ffeRenovationRate: 35.0,
      accountsReceivableMonths: 0.5,
      accountsPayableMonths: 1.5,
      source: "HVS Economy Benchmarks — SEA",
      regions: ["malaysia", "kl", "jb"],
    },

    "business-5-australia": {
      constructionUsefulLife: 25,
      ffeUsefulLife: 5,
      ffeRenovationRate: 50.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "HVS Australia Hotel Accounting Standards 2024",
      regions: ["australia", "sydney", "melbourne"],
    },
    "business-4-australia": {
      constructionUsefulLife: 25,
      ffeUsefulLife: 5,
      ffeRenovationRate: 50.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "JLL Australia Hospitality Report 2024",
      regions: ["australia", "sydney", "melbourne"],
    },
    "business-3-australia": {
      constructionUsefulLife: 30,
      ffeUsefulLife: 6,
      ffeRenovationRate: 45.0,
      accountsReceivableMonths: 1.5,
      accountsPayableMonths: 1,
      source: "STR Australia Midscale Benchmarks",
      regions: ["australia", "brisbane", "perth"],
    },
    "resort-5-australia": {
      constructionUsefulLife: 25,
      ffeUsefulLife: 4,
      ffeRenovationRate: 60.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "HVS Resort Survey — APAC",
      regions: ["australia", "goldcoast", "cairns"],
    },
    "resort-4-australia": {
      constructionUsefulLife: 25,
      ffeUsefulLife: 5,
      ffeRenovationRate: 55.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "JLL Australia Leisure Report",
      regions: ["australia", "goldcoast", "cairns"],
    },
    "boutique-4-australia": {
      constructionUsefulLife: 25,
      ffeUsefulLife: 5,
      ffeRenovationRate: 50.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "CBRE Boutique Trends — Australia",
      regions: ["australia", "sydney", "melbourne"],
    },
    "boutique-3-australia": {
      constructionUsefulLife: 30,
      ffeUsefulLife: 6,
      ffeRenovationRate: 45.0,
      accountsReceivableMonths: 1.5,
      accountsPayableMonths: 1,
      source: "STR Boutique — Australia",
      regions: ["australia", "sydney", "melbourne"],
    },
    "budget-1-australia": {
      constructionUsefulLife: 35,
      ffeUsefulLife: 7,
      ffeRenovationRate: 35.0,
      accountsReceivableMonths: 0.5,
      accountsPayableMonths: 1.5,
      source: "HVS Economy Benchmarks — ANZ",
      regions: ["australia", "sydney", "melbourne"],
    },

    "business-5-china": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 5,
      ffeRenovationRate: 50.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "HVS China Hotel Accounting Standards 2024",
      regions: ["china", "shanghai", "beijing", "hk"],
    },
    "business-4-china": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 5,
      ffeRenovationRate: 50.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "JLL China Hospitality Report 2024",
      regions: ["china", "shanghai", "beijing", "hk"],
    },
    "business-3-china": {
      constructionUsefulLife: 25,
      ffeUsefulLife: 5,
      ffeRenovationRate: 45.0,
      accountsReceivableMonths: 1.5,
      accountsPayableMonths: 1,
      source: "STR China Midscale Benchmarks",
      regions: ["china", "guangzhou", "shenzhen"],
    },
    "resort-5-china": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 4,
      ffeRenovationRate: 60.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "HVS Resort Survey — Greater China",
      regions: ["china", "sanya", "hangzhou", "hk"],
    },
    "resort-4-china": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 5,
      ffeRenovationRate: 55.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "JLL China Leisure Report",
      regions: ["china", "sanya", "hangzhou", "hk"],
    },
    "boutique-4-china": {
      constructionUsefulLife: 20,
      ffeUsefulLife: 5,
      ffeRenovationRate: 50.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "CBRE Boutique Trends — Greater China",
      regions: ["china", "shanghai", "beijing", "hk"],
    },
    "boutique-3-china": {
      constructionUsefulLife: 25,
      ffeUsefulLife: 5,
      ffeRenovationRate: 45.0,
      accountsReceivableMonths: 1.5,
      accountsPayableMonths: 1,
      source: "STR Boutique — China",
      regions: ["china", "shanghai", "beijing", "hk"],
    },
    "budget-1-china": {
      constructionUsefulLife: 30,
      ffeUsefulLife: 6,
      ffeRenovationRate: 35.0,
      accountsReceivableMonths: 0.5,
      accountsPayableMonths: 1.5,
      source: "HVS Economy Benchmarks — China",
      regions: ["china", "tier2", "tier3"],
    },

    default: {
      constructionUsefulLife: 20,
      ffeUsefulLife: 5,
      ffeRenovationRate: 50.0,
      accountsReceivableMonths: 1,
      accountsPayableMonths: 1,
      source: "Industry baseline — please validate with local data",
      regions: ["global"],
    },
  };

/** First operational year index (0 = Year 1) when FFE renovation capex is capitalized. */
export const FFE_RENOVATION_START_YEAR_INDEX = 5;

export type HotelDepreciationFieldKey = keyof Omit<
  DepreciationProfile,
  "source" | "regions"
>;

export const HOTEL_DEPRECIATION_FIELD_KEYS: HotelDepreciationFieldKey[] = [
  "constructionUsefulLife",
  "ffeUsefulLife",
  "ffeRenovationRate",
  "accountsReceivableMonths",
  "accountsPayableMonths",
];

export function valuesFromDepreciationProfile(
  p: DepreciationProfile
): Record<HotelDepreciationFieldKey, number> {
  return {
    constructionUsefulLife: p.constructionUsefulLife,
    ffeUsefulLife: p.ffeUsefulLife,
    ffeRenovationRate: p.ffeRenovationRate,
    accountsReceivableMonths: p.accountsReceivableMonths,
    accountsPayableMonths: p.accountsPayableMonths,
  };
}

/** Straight-line construction depreciation (annual). */
export function annualConstructionDepreciation(
  constructionCost: number,
  usefulLifeYears: number
): number {
  const L = Math.max(1, usefulLifeYears);
  if (constructionCost <= 0) return 0;
  return constructionCost / L;
}

/**
 * FFE: initial pool straight-line over `ffeUsefulLife` (Years 1–N).
 * From Year 6 onward, additional FFE = `ffeRenovationRate%` of initial FFE,
 * straight-line over the same useful life (Years 6–6+N−1).
 */
export function annualFfeDepreciation(
  yearIndex0: number,
  initialFfe: number,
  ffeUsefulLife: number,
  ffeRenovationRatePercent: number
): number {
  const life = Math.max(1, ffeUsefulLife);
  let dep = 0;
  if (yearIndex0 < life && initialFfe > 0) {
    dep += initialFfe / life;
  }
  const renovationSpend =
    initialFfe > 0 ? initialFfe * (ffeRenovationRatePercent / 100) : 0;
  if (
    renovationSpend > 0 &&
    yearIndex0 >= FFE_RENOVATION_START_YEAR_INDEX &&
    yearIndex0 < FFE_RENOVATION_START_YEAR_INDEX + life
  ) {
    dep += renovationSpend / life;
  }
  return dep;
}

export function resolveHotelDepreciationProfile(
  hotelType: HotelOperatingType,
  starRating: number,
  country: string,
  city: string
): { key: string; profile: DepreciationProfile } {
  const region = inferHotelProfileRegion(country, city);
  const key = `${hotelType}-${starRating}-${region}`;
  const profile = HOTEL_DEPRECIATION_PROFILES[key];
  if (profile) return { key, profile };
  return { key: "default", profile: HOTEL_DEPRECIATION_PROFILES.default };
}

export function getDepreciationProfileKey(
  hotelType: HotelOperatingType,
  starRating: number,
  region: "dubai" | "malaysia" | "australia" | "china" = "dubai"
): string {
  const key = `${hotelType}-${starRating}-${region}`;
  return HOTEL_DEPRECIATION_PROFILES[key] ? key : "default";
}
