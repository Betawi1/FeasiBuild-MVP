import type { HotelOperatingType } from "@/config/hotel-cost-profiles";
import { inferHotelProfileRegion } from "@/config/hotel-cost-profiles";

export type RevenueProfile = {
  rooms: number;
  food: number;
  beverage: number;
  roomService: number;
  telecom: number;
  spaHealth: number;
  rentalOther: number;
  source: string;
  regions: string[];
};

export const HOTEL_REVENUE_PROFILES: Record<string, RevenueProfile> = {
  "business-5-dubai": {
    rooms: 64.0,
    food: 20.4,
    beverage: 8.1,
    roomService: 1.0,
    telecom: 1.0,
    spaHealth: 4.5,
    rentalOther: 1.0,
    source: "HVS Dubai Hotel Benchmarking Survey 2024",
    regions: ["dubai", "uae", "gcc"],
  },
  "business-4-dubai": {
    rooms: 66.0,
    food: 19.0,
    beverage: 7.5,
    roomService: 1.0,
    telecom: 1.0,
    spaHealth: 4.5,
    rentalOther: 1.0,
    source: "JLL Middle East Hotel Operations Report 2024",
    regions: ["dubai", "uae", "gcc"],
  },
  "business-3-dubai": {
    rooms: 70.0,
    food: 16.0,
    beverage: 6.5,
    roomService: 0.5,
    telecom: 1.0,
    spaHealth: 5.0,
    rentalOther: 1.0,
    source: "STR GCC Midscale Hotel Benchmarks",
    regions: ["dubai", "uae", "gcc"],
  },
  "resort-5-dubai": {
    rooms: 58.0,
    food: 22.0,
    beverage: 10.0,
    roomService: 1.5,
    telecom: 0.5,
    spaHealth: 7.0,
    rentalOther: 1.0,
    source: "HVS Resort Operations Survey — GCC",
    regions: ["dubai", "uae", "gcc"],
  },
  "resort-4-dubai": {
    rooms: 60.0,
    food: 21.0,
    beverage: 9.0,
    roomService: 1.0,
    telecom: 0.5,
    spaHealth: 7.5,
    rentalOther: 1.0,
    source: "JLL Middle East Leisure Hospitality Report",
    regions: ["dubai", "uae", "gcc"],
  },
  "boutique-4-dubai": {
    rooms: 68.0,
    food: 18.0,
    beverage: 7.0,
    roomService: 1.0,
    telecom: 1.0,
    spaHealth: 4.0,
    rentalOther: 1.0,
    source: "CBRE Boutique Hotel Trends — MENA",
    regions: ["dubai", "uae", "gcc"],
  },
  "boutique-3-dubai": {
    rooms: 72.0,
    food: 15.0,
    beverage: 6.0,
    roomService: 0.5,
    telecom: 1.0,
    spaHealth: 4.5,
    rentalOther: 1.0,
    source: "STR Boutique Segment — GCC",
    regions: ["dubai", "uae", "gcc"],
  },
  "budget-1-dubai": {
    rooms: 85.0,
    food: 8.0,
    beverage: 3.0,
    roomService: 0.0,
    telecom: 1.0,
    spaHealth: 2.0,
    rentalOther: 1.0,
    source: "HVS Economy Hotel Benchmarks — MENA",
    regions: ["dubai", "uae", "gcc"],
  },

  "business-5-malaysia": {
    rooms: 65.0,
    food: 19.0,
    beverage: 7.5,
    roomService: 1.0,
    telecom: 1.0,
    spaHealth: 5.5,
    rentalOther: 1.0,
    source: "JLL Malaysia Hotel Operations Report 2024",
    regions: ["malaysia", "kl", "penang"],
  },
  "business-4-malaysia": {
    rooms: 67.0,
    food: 18.0,
    beverage: 7.0,
    roomService: 1.0,
    telecom: 1.0,
    spaHealth: 5.0,
    rentalOther: 1.0,
    source: "CBRE Malaysia Hospitality Report 2024",
    regions: ["malaysia", "kl", "penang"],
  },
  "business-3-malaysia": {
    rooms: 71.0,
    food: 15.5,
    beverage: 6.0,
    roomService: 0.5,
    telecom: 1.0,
    spaHealth: 5.0,
    rentalOther: 1.0,
    source: "STR Malaysia Midscale Benchmarks",
    regions: ["malaysia", "kl", "penang"],
  },
  "resort-5-malaysia": {
    rooms: 56.0,
    food: 23.0,
    beverage: 11.0,
    roomService: 1.5,
    telecom: 0.5,
    spaHealth: 7.0,
    rentalOther: 1.0,
    source: "HVS Asia Pacific Resort Survey",
    regions: ["malaysia", "langkawi", "kotakinabalu"],
  },
  "resort-4-malaysia": {
    rooms: 59.0,
    food: 22.0,
    beverage: 10.0,
    roomService: 1.0,
    telecom: 0.5,
    spaHealth: 6.5,
    rentalOther: 1.0,
    source: "JLL Malaysia Leisure Report",
    regions: ["malaysia", "langkawi", "kotakinabalu"],
  },
  "boutique-4-malaysia": {
    rooms: 69.0,
    food: 17.0,
    beverage: 6.5,
    roomService: 1.0,
    telecom: 1.0,
    spaHealth: 4.5,
    rentalOther: 1.0,
    source: "CBRE Boutique Trends — SEA",
    regions: ["malaysia", "kl", "penang"],
  },
  "boutique-3-malaysia": {
    rooms: 73.0,
    food: 14.5,
    beverage: 5.5,
    roomService: 0.5,
    telecom: 1.0,
    spaHealth: 4.5,
    rentalOther: 1.0,
    source: "STR Boutique — Malaysia",
    regions: ["malaysia", "kl", "penang"],
  },
  "budget-1-malaysia": {
    rooms: 86.0,
    food: 7.5,
    beverage: 2.5,
    roomService: 0.0,
    telecom: 1.0,
    spaHealth: 2.0,
    rentalOther: 1.0,
    source: "HVS Economy Benchmarks — SEA",
    regions: ["malaysia", "kl", "jb"],
  },

  "business-5-australia": {
    rooms: 68.0,
    food: 17.0,
    beverage: 7.0,
    roomService: 1.0,
    telecom: 1.0,
    spaHealth: 5.0,
    rentalOther: 1.0,
    source: "HVS Australia Hotel Benchmarking 2024",
    regions: ["australia", "sydney", "melbourne"],
  },
  "business-4-australia": {
    rooms: 70.0,
    food: 16.0,
    beverage: 6.5,
    roomService: 1.0,
    telecom: 1.0,
    spaHealth: 4.5,
    rentalOther: 1.0,
    source: "JLL Australia Hospitality Report 2024",
    regions: ["australia", "sydney", "melbourne"],
  },
  "business-3-australia": {
    rooms: 73.0,
    food: 14.0,
    beverage: 5.5,
    roomService: 0.5,
    telecom: 1.0,
    spaHealth: 5.0,
    rentalOther: 1.0,
    source: "STR Australia Midscale Benchmarks",
    regions: ["australia", "brisbane", "perth"],
  },
  "resort-5-australia": {
    rooms: 54.0,
    food: 24.0,
    beverage: 12.0,
    roomService: 1.5,
    telecom: 0.5,
    spaHealth: 7.0,
    rentalOther: 1.0,
    source: "HVS Resort Survey — APAC",
    regions: ["australia", "goldcoast", "cairns"],
  },
  "resort-4-australia": {
    rooms: 57.0,
    food: 23.0,
    beverage: 11.0,
    roomService: 1.0,
    telecom: 0.5,
    spaHealth: 6.5,
    rentalOther: 1.0,
    source: "JLL Australia Leisure Report",
    regions: ["australia", "goldcoast", "cairns"],
  },
  "boutique-4-australia": {
    rooms: 70.0,
    food: 16.0,
    beverage: 6.0,
    roomService: 1.0,
    telecom: 1.0,
    spaHealth: 5.0,
    rentalOther: 1.0,
    source: "CBRE Boutique Trends — Australia",
    regions: ["australia", "sydney", "melbourne"],
  },
  "boutique-3-australia": {
    rooms: 74.0,
    food: 13.5,
    beverage: 5.0,
    roomService: 0.5,
    telecom: 1.0,
    spaHealth: 5.0,
    rentalOther: 1.0,
    source: "STR Boutique — Australia",
    regions: ["australia", "sydney", "melbourne"],
  },
  "budget-1-australia": {
    rooms: 87.0,
    food: 7.0,
    beverage: 2.0,
    roomService: 0.0,
    telecom: 1.0,
    spaHealth: 2.0,
    rentalOther: 1.0,
    source: "HVS Economy Benchmarks — ANZ",
    regions: ["australia", "sydney", "melbourne"],
  },

  "business-5-china": {
    rooms: 62.0,
    food: 21.0,
    beverage: 9.0,
    roomService: 1.5,
    telecom: 1.0,
    spaHealth: 4.5,
    rentalOther: 1.0,
    source: "HVS China Hotel Benchmarking 2024",
    regions: ["china", "shanghai", "beijing", "hk"],
  },
  "business-4-china": {
    rooms: 64.0,
    food: 20.0,
    beverage: 8.5,
    roomService: 1.0,
    telecom: 1.0,
    spaHealth: 4.5,
    rentalOther: 1.0,
    source: "JLL China Hospitality Report 2024",
    regions: ["china", "shanghai", "beijing", "hk"],
  },
  "business-3-china": {
    rooms: 68.0,
    food: 17.5,
    beverage: 7.0,
    roomService: 0.5,
    telecom: 1.0,
    spaHealth: 5.0,
    rentalOther: 1.0,
    source: "STR China Midscale Benchmarks",
    regions: ["china", "guangzhou", "shenzhen"],
  },
  "resort-5-china": {
    rooms: 55.0,
    food: 23.0,
    beverage: 11.5,
    roomService: 2.0,
    telecom: 0.5,
    spaHealth: 7.0,
    rentalOther: 1.0,
    source: "HVS Resort Survey — Greater China",
    regions: ["china", "sanya", "hangzhou", "hk"],
  },
  "resort-4-china": {
    rooms: 58.0,
    food: 22.0,
    beverage: 10.5,
    roomService: 1.5,
    telecom: 0.5,
    spaHealth: 6.5,
    rentalOther: 1.0,
    source: "JLL China Leisure Report",
    regions: ["china", "sanya", "hangzhou", "hk"],
  },
  "boutique-4-china": {
    rooms: 67.0,
    food: 18.5,
    beverage: 7.0,
    roomService: 1.0,
    telecom: 1.0,
    spaHealth: 4.5,
    rentalOther: 1.0,
    source: "CBRE Boutique Trends — Greater China",
    regions: ["china", "shanghai", "beijing", "hk"],
  },
  "boutique-3-china": {
    rooms: 71.0,
    food: 15.5,
    beverage: 6.0,
    roomService: 0.5,
    telecom: 1.0,
    spaHealth: 5.0,
    rentalOther: 1.0,
    source: "STR Boutique — China",
    regions: ["china", "shanghai", "beijing", "hk"],
  },
  "budget-1-china": {
    rooms: 84.0,
    food: 8.5,
    beverage: 3.0,
    roomService: 0.0,
    telecom: 1.0,
    spaHealth: 2.5,
    rentalOther: 1.0,
    source: "HVS Economy Benchmarks — China",
    regions: ["china", "tier2", "tier3"],
  },

  default: {
    rooms: 64.0,
    food: 20.4,
    beverage: 8.1,
    roomService: 1.0,
    telecom: 1.0,
    spaHealth: 4.5,
    rentalOther: 1.0,
    source: "Industry baseline — please validate with local data",
    regions: ["global"],
  },
};

export type HotelRevenuePctKey =
  | "rooms"
  | "food"
  | "beverage"
  | "roomService"
  | "telecom"
  | "spaHealth"
  | "rentalOther";

export const HOTEL_REVENUE_PCT_KEYS: HotelRevenuePctKey[] = [
  "rooms",
  "food",
  "beverage",
  "roomService",
  "telecom",
  "spaHealth",
  "rentalOther",
];

export function pctsFromRevenueProfile(p: RevenueProfile): Record<HotelRevenuePctKey, number> {
  return {
    rooms: p.rooms,
    food: p.food,
    beverage: p.beverage,
    roomService: p.roomService,
    telecom: p.telecom,
    spaHealth: p.spaHealth,
    rentalOther: p.rentalOther,
  };
}

export function sumRevenuePcts(p: Record<HotelRevenuePctKey, number>): number {
  return HOTEL_REVENUE_PCT_KEYS.reduce((s, k) => s + (p[k] ?? 0), 0);
}

/**
 * Resolve benchmark mix from operating segment + stars + location
 * (same region buckets as development cost profiles).
 */
export function resolveHotelRevenueProfile(
  hotelType: HotelOperatingType,
  starRating: number,
  country: string,
  city: string
): { key: string; profile: RevenueProfile } {
  const region = inferHotelProfileRegion(country, city);
  const key = `${hotelType}-${starRating}-${region}`;
  const profile = HOTEL_REVENUE_PROFILES[key];
  if (profile) return { key, profile };
  return { key: "default", profile: HOTEL_REVENUE_PROFILES.default };
}

/** @deprecated Prefer `resolveHotelRevenueProfile` with country/city */
export function getRevenueProfileKey(
  hotelType: HotelOperatingType,
  starRating: number,
  region: "dubai" | "malaysia" | "australia" | "china" = "dubai"
): string {
  const key = `${hotelType}-${starRating}-${region}`;
  return HOTEL_REVENUE_PROFILES[key] ? key : "default";
}
