import type { HotelOperatingType } from "@/config/hotel-cost-profiles";
import { inferHotelProfileRegion } from "@/config/hotel-cost-profiles";

export type ExpenseProfile = {
  gaExpenses: number;
  marketingSales: number;
  propertyOpsMaintenance: number;
  utilities: number;
  baseManagementFee: number;
  incentiveFee: number;
  renovationProvisionY1: number;
  renovationProvisionY2: number;
  renovationProvisionY3to10: number;
  source: string;
  regions: string[];
};

export const HOTEL_EXPENSE_PROFILES: Record<string, ExpenseProfile> = {
  "business-5-dubai": {
    gaExpenses: 7.0,
    marketingSales: 3.0,
    propertyOpsMaintenance: 4.0,
    utilities: 4.0,
    baseManagementFee: 2.0,
    incentiveFee: 8.0,
    renovationProvisionY1: 1.0,
    renovationProvisionY2: 2.0,
    renovationProvisionY3to10: 3.0,
    source: "HVS Dubai Hotel Operations Benchmarking 2024",
    regions: ["dubai", "uae", "gcc"],
  },
  "business-4-dubai": {
    gaExpenses: 7.5,
    marketingSales: 3.5,
    propertyOpsMaintenance: 4.5,
    utilities: 4.5,
    baseManagementFee: 2.5,
    incentiveFee: 9.0,
    renovationProvisionY1: 1.0,
    renovationProvisionY2: 2.0,
    renovationProvisionY3to10: 3.0,
    source: "JLL Middle East Hotel Operations Report 2024",
    regions: ["dubai", "uae", "gcc"],
  },
  "business-3-dubai": {
    gaExpenses: 8.0,
    marketingSales: 4.0,
    propertyOpsMaintenance: 5.0,
    utilities: 5.0,
    baseManagementFee: 3.0,
    incentiveFee: 10.0,
    renovationProvisionY1: 1.0,
    renovationProvisionY2: 2.0,
    renovationProvisionY3to10: 3.0,
    source: "STR GCC Midscale Hotel Benchmarks",
    regions: ["dubai", "uae", "gcc"],
  },
  "resort-5-dubai": {
    gaExpenses: 6.5,
    marketingSales: 4.0,
    propertyOpsMaintenance: 5.0,
    utilities: 4.5,
    baseManagementFee: 2.0,
    incentiveFee: 10.0,
    renovationProvisionY1: 2.0,
    renovationProvisionY2: 3.0,
    renovationProvisionY3to10: 4.0,
    source: "HVS Resort Operations Survey — GCC",
    regions: ["dubai", "uae", "gcc"],
  },
  "resort-4-dubai": {
    gaExpenses: 7.0,
    marketingSales: 4.5,
    propertyOpsMaintenance: 5.5,
    utilities: 5.0,
    baseManagementFee: 2.5,
    incentiveFee: 11.0,
    renovationProvisionY1: 2.0,
    renovationProvisionY2: 3.0,
    renovationProvisionY3to10: 4.0,
    source: "JLL Middle East Leisure Hospitality Report",
    regions: ["dubai", "uae", "gcc"],
  },
  "boutique-4-dubai": {
    gaExpenses: 7.5,
    marketingSales: 3.5,
    propertyOpsMaintenance: 4.0,
    utilities: 4.0,
    baseManagementFee: 2.5,
    incentiveFee: 9.0,
    renovationProvisionY1: 1.5,
    renovationProvisionY2: 2.5,
    renovationProvisionY3to10: 3.5,
    source: "CBRE Boutique Hotel Trends — MENA",
    regions: ["dubai", "uae", "gcc"],
  },
  "boutique-3-dubai": {
    gaExpenses: 8.0,
    marketingSales: 4.0,
    propertyOpsMaintenance: 4.5,
    utilities: 4.5,
    baseManagementFee: 3.0,
    incentiveFee: 10.0,
    renovationProvisionY1: 1.5,
    renovationProvisionY2: 2.5,
    renovationProvisionY3to10: 3.5,
    source: "STR Boutique Segment — GCC",
    regions: ["dubai", "uae", "gcc"],
  },
  "budget-1-dubai": {
    gaExpenses: 9.0,
    marketingSales: 2.5,
    propertyOpsMaintenance: 5.5,
    utilities: 6.0,
    baseManagementFee: 3.5,
    incentiveFee: 0,
    renovationProvisionY1: 0.5,
    renovationProvisionY2: 1.0,
    renovationProvisionY3to10: 2.0,
    source: "HVS Economy Hotel Benchmarks — MENA",
    regions: ["dubai", "uae", "gcc"],
  },

  "business-5-malaysia": {
    gaExpenses: 7.0,
    marketingSales: 3.0,
    propertyOpsMaintenance: 4.0,
    utilities: 4.0,
    baseManagementFee: 2.0,
    incentiveFee: 8.0,
    renovationProvisionY1: 1.0,
    renovationProvisionY2: 2.0,
    renovationProvisionY3to10: 3.0,
    source: "JLL Malaysia Hotel Operations Report 2024",
    regions: ["malaysia", "kl", "penang"],
  },
  "business-4-malaysia": {
    gaExpenses: 7.5,
    marketingSales: 3.5,
    propertyOpsMaintenance: 4.5,
    utilities: 4.5,
    baseManagementFee: 2.5,
    incentiveFee: 9.0,
    renovationProvisionY1: 1.0,
    renovationProvisionY2: 2.0,
    renovationProvisionY3to10: 3.0,
    source: "CBRE Malaysia Hospitality Report 2024",
    regions: ["malaysia", "kl", "penang"],
  },
  "business-3-malaysia": {
    gaExpenses: 8.0,
    marketingSales: 4.0,
    propertyOpsMaintenance: 5.0,
    utilities: 5.0,
    baseManagementFee: 3.0,
    incentiveFee: 10.0,
    renovationProvisionY1: 1.0,
    renovationProvisionY2: 2.0,
    renovationProvisionY3to10: 3.0,
    source: "STR Malaysia Midscale Benchmarks",
    regions: ["malaysia", "kl", "penang"],
  },
  "resort-5-malaysia": {
    gaExpenses: 6.5,
    marketingSales: 4.0,
    propertyOpsMaintenance: 5.0,
    utilities: 4.5,
    baseManagementFee: 2.0,
    incentiveFee: 10.0,
    renovationProvisionY1: 2.0,
    renovationProvisionY2: 3.0,
    renovationProvisionY3to10: 4.0,
    source: "HVS Asia Pacific Resort Survey",
    regions: ["malaysia", "langkawi", "kotakinabalu"],
  },
  "resort-4-malaysia": {
    gaExpenses: 7.0,
    marketingSales: 4.5,
    propertyOpsMaintenance: 5.5,
    utilities: 5.0,
    baseManagementFee: 2.5,
    incentiveFee: 11.0,
    renovationProvisionY1: 2.0,
    renovationProvisionY2: 3.0,
    renovationProvisionY3to10: 4.0,
    source: "JLL Malaysia Leisure Report",
    regions: ["malaysia", "langkawi", "kotakinabalu"],
  },
  "boutique-4-malaysia": {
    gaExpenses: 7.5,
    marketingSales: 3.5,
    propertyOpsMaintenance: 4.0,
    utilities: 4.0,
    baseManagementFee: 2.5,
    incentiveFee: 9.0,
    renovationProvisionY1: 1.5,
    renovationProvisionY2: 2.5,
    renovationProvisionY3to10: 3.5,
    source: "CBRE Boutique Trends — SEA",
    regions: ["malaysia", "kl", "penang"],
  },
  "boutique-3-malaysia": {
    gaExpenses: 8.0,
    marketingSales: 4.0,
    propertyOpsMaintenance: 4.5,
    utilities: 4.5,
    baseManagementFee: 3.0,
    incentiveFee: 10.0,
    renovationProvisionY1: 1.5,
    renovationProvisionY2: 2.5,
    renovationProvisionY3to10: 3.5,
    source: "STR Boutique — Malaysia",
    regions: ["malaysia", "kl", "penang"],
  },
  "budget-1-malaysia": {
    gaExpenses: 9.0,
    marketingSales: 2.5,
    propertyOpsMaintenance: 5.5,
    utilities: 6.0,
    baseManagementFee: 3.5,
    incentiveFee: 0,
    renovationProvisionY1: 0.5,
    renovationProvisionY2: 1.0,
    renovationProvisionY3to10: 2.0,
    source: "HVS Economy Benchmarks — SEA",
    regions: ["malaysia", "kl", "jb"],
  },

  "business-5-australia": {
    gaExpenses: 6.5,
    marketingSales: 3.0,
    propertyOpsMaintenance: 3.5,
    utilities: 3.5,
    baseManagementFee: 2.0,
    incentiveFee: 8.0,
    renovationProvisionY1: 1.0,
    renovationProvisionY2: 2.0,
    renovationProvisionY3to10: 3.0,
    source: "HVS Australia Hotel Benchmarking 2024",
    regions: ["australia", "sydney", "melbourne"],
  },
  "business-4-australia": {
    gaExpenses: 7.0,
    marketingSales: 3.5,
    propertyOpsMaintenance: 4.0,
    utilities: 4.0,
    baseManagementFee: 2.5,
    incentiveFee: 9.0,
    renovationProvisionY1: 1.0,
    renovationProvisionY2: 2.0,
    renovationProvisionY3to10: 3.0,
    source: "JLL Australia Hospitality Report 2024",
    regions: ["australia", "sydney", "melbourne"],
  },
  "business-3-australia": {
    gaExpenses: 7.5,
    marketingSales: 4.0,
    propertyOpsMaintenance: 4.5,
    utilities: 4.5,
    baseManagementFee: 3.0,
    incentiveFee: 10.0,
    renovationProvisionY1: 1.0,
    renovationProvisionY2: 2.0,
    renovationProvisionY3to10: 3.0,
    source: "STR Australia Midscale Benchmarks",
    regions: ["australia", "brisbane", "perth"],
  },
  "resort-5-australia": {
    gaExpenses: 6.0,
    marketingSales: 4.0,
    propertyOpsMaintenance: 4.5,
    utilities: 4.0,
    baseManagementFee: 2.0,
    incentiveFee: 10.0,
    renovationProvisionY1: 2.0,
    renovationProvisionY2: 3.0,
    renovationProvisionY3to10: 4.0,
    source: "HVS Resort Survey — APAC",
    regions: ["australia", "goldcoast", "cairns"],
  },
  "resort-4-australia": {
    gaExpenses: 6.5,
    marketingSales: 4.5,
    propertyOpsMaintenance: 5.0,
    utilities: 4.5,
    baseManagementFee: 2.5,
    incentiveFee: 11.0,
    renovationProvisionY1: 2.0,
    renovationProvisionY2: 3.0,
    renovationProvisionY3to10: 4.0,
    source: "JLL Australia Leisure Report",
    regions: ["australia", "goldcoast", "cairns"],
  },
  "boutique-4-australia": {
    gaExpenses: 7.0,
    marketingSales: 3.5,
    propertyOpsMaintenance: 3.5,
    utilities: 3.5,
    baseManagementFee: 2.5,
    incentiveFee: 9.0,
    renovationProvisionY1: 1.5,
    renovationProvisionY2: 2.5,
    renovationProvisionY3to10: 3.5,
    source: "CBRE Boutique Trends — Australia",
    regions: ["australia", "sydney", "melbourne"],
  },
  "boutique-3-australia": {
    gaExpenses: 7.5,
    marketingSales: 4.0,
    propertyOpsMaintenance: 4.0,
    utilities: 4.0,
    baseManagementFee: 3.0,
    incentiveFee: 10.0,
    renovationProvisionY1: 1.5,
    renovationProvisionY2: 2.5,
    renovationProvisionY3to10: 3.5,
    source: "STR Boutique — Australia",
    regions: ["australia", "sydney", "melbourne"],
  },
  "budget-1-australia": {
    gaExpenses: 8.5,
    marketingSales: 2.5,
    propertyOpsMaintenance: 5.0,
    utilities: 5.5,
    baseManagementFee: 3.5,
    incentiveFee: 0,
    renovationProvisionY1: 0.5,
    renovationProvisionY2: 1.0,
    renovationProvisionY3to10: 2.0,
    source: "HVS Economy Benchmarks — ANZ",
    regions: ["australia", "sydney", "melbourne"],
  },

  "business-5-china": {
    gaExpenses: 6.0,
    marketingSales: 3.0,
    propertyOpsMaintenance: 3.5,
    utilities: 3.5,
    baseManagementFee: 2.0,
    incentiveFee: 8.0,
    renovationProvisionY1: 1.0,
    renovationProvisionY2: 2.0,
    renovationProvisionY3to10: 3.0,
    source: "HVS China Hotel Operations Benchmarking 2024",
    regions: ["china", "shanghai", "beijing", "hk"],
  },
  "business-4-china": {
    gaExpenses: 6.5,
    marketingSales: 3.5,
    propertyOpsMaintenance: 4.0,
    utilities: 4.0,
    baseManagementFee: 2.5,
    incentiveFee: 9.0,
    renovationProvisionY1: 1.0,
    renovationProvisionY2: 2.0,
    renovationProvisionY3to10: 3.0,
    source: "JLL China Hospitality Report 2024",
    regions: ["china", "shanghai", "beijing", "hk"],
  },
  "business-3-china": {
    gaExpenses: 7.0,
    marketingSales: 4.0,
    propertyOpsMaintenance: 4.5,
    utilities: 4.5,
    baseManagementFee: 3.0,
    incentiveFee: 10.0,
    renovationProvisionY1: 1.0,
    renovationProvisionY2: 2.0,
    renovationProvisionY3to10: 3.0,
    source: "STR China Midscale Benchmarks",
    regions: ["china", "guangzhou", "shenzhen"],
  },
  "resort-5-china": {
    gaExpenses: 5.5,
    marketingSales: 4.0,
    propertyOpsMaintenance: 4.5,
    utilities: 4.0,
    baseManagementFee: 2.0,
    incentiveFee: 10.0,
    renovationProvisionY1: 2.0,
    renovationProvisionY2: 3.0,
    renovationProvisionY3to10: 4.0,
    source: "HVS Resort Survey — Greater China",
    regions: ["china", "sanya", "hangzhou", "hk"],
  },
  "resort-4-china": {
    gaExpenses: 6.0,
    marketingSales: 4.5,
    propertyOpsMaintenance: 5.0,
    utilities: 4.5,
    baseManagementFee: 2.5,
    incentiveFee: 11.0,
    renovationProvisionY1: 2.0,
    renovationProvisionY2: 3.0,
    renovationProvisionY3to10: 4.0,
    source: "JLL China Leisure Report",
    regions: ["china", "sanya", "hangzhou", "hk"],
  },
  "boutique-4-china": {
    gaExpenses: 6.5,
    marketingSales: 3.5,
    propertyOpsMaintenance: 3.5,
    utilities: 3.5,
    baseManagementFee: 2.5,
    incentiveFee: 9.0,
    renovationProvisionY1: 1.5,
    renovationProvisionY2: 2.5,
    renovationProvisionY3to10: 3.5,
    source: "CBRE Boutique Trends — Greater China",
    regions: ["china", "shanghai", "beijing", "hk"],
  },
  "boutique-3-china": {
    gaExpenses: 7.0,
    marketingSales: 4.0,
    propertyOpsMaintenance: 4.0,
    utilities: 4.0,
    baseManagementFee: 3.0,
    incentiveFee: 10.0,
    renovationProvisionY1: 1.5,
    renovationProvisionY2: 2.5,
    renovationProvisionY3to10: 3.5,
    source: "STR Boutique — China",
    regions: ["china", "shanghai", "beijing", "hk"],
  },
  "budget-1-china": {
    gaExpenses: 8.0,
    marketingSales: 2.5,
    propertyOpsMaintenance: 5.0,
    utilities: 5.5,
    baseManagementFee: 3.5,
    incentiveFee: 0,
    renovationProvisionY1: 0.5,
    renovationProvisionY2: 1.0,
    renovationProvisionY3to10: 2.0,
    source: "HVS Economy Benchmarks — China",
    regions: ["china", "tier2", "tier3"],
  },

  default: {
    gaExpenses: 7.0,
    marketingSales: 3.0,
    propertyOpsMaintenance: 4.0,
    utilities: 4.0,
    baseManagementFee: 2.0,
    incentiveFee: 8.0,
    renovationProvisionY1: 1.0,
    renovationProvisionY2: 2.0,
    renovationProvisionY3to10: 3.0,
    source: "Industry baseline — please validate with local data",
    regions: ["global"],
  },
};

export type HotelExpensePctKey = keyof Omit<
  ExpenseProfile,
  "source" | "regions"
>;

export const HOTEL_EXPENSE_PCT_KEYS: HotelExpensePctKey[] = [
  "gaExpenses",
  "marketingSales",
  "propertyOpsMaintenance",
  "utilities",
  "baseManagementFee",
  "incentiveFee",
  "renovationProvisionY1",
  "renovationProvisionY2",
  "renovationProvisionY3to10",
];

export const TOTAL_EXPENSE_STACK_KEYS = [
  "expDirect",
  "expGA",
  "expMarketing",
  "expProperty",
  "expUtilities",
  "expBaseMgmt",
  "expIncentive",
  "expRenovation",
] as const;

export type TotalExpenseStackKey = (typeof TOTAL_EXPENSE_STACK_KEYS)[number];

export const TOTAL_EXPENSE_STACK_LABELS: Record<TotalExpenseStackKey, string> =
  {
    expDirect: "Direct costs",
    expGA: "G&A",
    expMarketing: "Marketing & sales",
    expProperty: "Property ops & maintenance",
    expUtilities: "Utilities",
    expBaseMgmt: "Base management fee",
    expIncentive: "Incentive fee",
    expRenovation: "Renovation provision",
  };

export const TOTAL_EXPENSE_STACK_COLORS: Record<TotalExpenseStackKey, string> =
  {
    expDirect: "#047857",
    expGA: "#6366f1",
    expMarketing: "#8b5cf6",
    expProperty: "#a78bfa",
    expUtilities: "#c4b5fd",
    expBaseMgmt: "#f59e0b",
    expIncentive: "#f97316",
    expRenovation: "#fb923c",
  };

/**
 * EBITDA before incentive: total revenue − direct costs − undistributed
 * (4 lines) − base management − renovation. Incentive = r/(1+r) × max(0, E₀)
 * when the fee is defined as r% of net EBITDA (after deducting the fee).
 */
export function incentiveFeeFromCircularEbitda(
  ebitdaBeforeIncentive: number,
  incentiveFeePercent: number
): number {
  if (ebitdaBeforeIncentive <= 0 || incentiveFeePercent <= 0) return 0;
  const r = incentiveFeePercent / 100;
  return (r / (1 + r)) * ebitdaBeforeIncentive;
}

export function renovationProvisionPercentForYear(
  yearIndex0: number,
  p: Pick<
    ExpenseProfile,
    "renovationProvisionY1" | "renovationProvisionY2" | "renovationProvisionY3to10"
  >
): number {
  if (yearIndex0 === 0) return p.renovationProvisionY1;
  if (yearIndex0 === 1) return p.renovationProvisionY2;
  return p.renovationProvisionY3to10;
}

export function pctsFromExpenseProfile(
  p: ExpenseProfile
): Record<HotelExpensePctKey, number> {
  return {
    gaExpenses: p.gaExpenses,
    marketingSales: p.marketingSales,
    propertyOpsMaintenance: p.propertyOpsMaintenance,
    utilities: p.utilities,
    baseManagementFee: p.baseManagementFee,
    incentiveFee: p.incentiveFee,
    renovationProvisionY1: p.renovationProvisionY1,
    renovationProvisionY2: p.renovationProvisionY2,
    renovationProvisionY3to10: p.renovationProvisionY3to10,
  };
}

export function resolveHotelExpenseProfile(
  hotelType: HotelOperatingType,
  starRating: number,
  country: string,
  city: string
): { key: string; profile: ExpenseProfile } {
  const region = inferHotelProfileRegion(country, city);
  const key = `${hotelType}-${starRating}-${region}`;
  const profile = HOTEL_EXPENSE_PROFILES[key];
  if (profile) return { key, profile };
  return { key: "default", profile: HOTEL_EXPENSE_PROFILES.default };
}

export function getExpenseProfileKey(
  hotelType: HotelOperatingType,
  starRating: number,
  region: "dubai" | "malaysia" | "australia" | "china" = "dubai"
): string {
  const key = `${hotelType}-${starRating}-${region}`;
  return HOTEL_EXPENSE_PROFILES[key] ? key : "default";
}
