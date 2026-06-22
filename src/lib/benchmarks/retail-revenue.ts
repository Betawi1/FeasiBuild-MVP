import { normalizeRetailCountry } from "@/lib/benchmarks/retail-construction-costs";

export interface RetailRevenueBenchmark {
  country: string;
  segment: string;
  positioning: string;
  /** Base rent (local currency / sqft p.a., Year 1). */
  baseRentPsf: number;
  /** Annual rent escalation (%). */
  rentEscalation: number;
  /** % leased at opening (Year 1). */
  openingOccupancy: number;
  /** % leased at stabilization. */
  stabilizedOccupancy: number;
  /** Years to reach stabilized occupancy. */
  leaseUpYears: number;
  /** Average rent-free period (months). */
  freeRentMonths: number;
}

export const RETAIL_REVENUE_BENCHMARKS: RetailRevenueBenchmark[] = [
  // UAE
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "luxury",
    baseRentPsf: 350,
    rentEscalation: 3.5,
    openingOccupancy: 45,
    stabilizedOccupancy: 96,
    leaseUpYears: 3,
    freeRentMonths: 4,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "upscale",
    baseRentPsf: 275,
    rentEscalation: 3.0,
    openingOccupancy: 50,
    stabilizedOccupancy: 95,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "mid_market",
    baseRentPsf: 200,
    rentEscalation: 3.0,
    openingOccupancy: 55,
    stabilizedOccupancy: 94,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "value",
    baseRentPsf: 150,
    rentEscalation: 2.5,
    openingOccupancy: 60,
    stabilizedOccupancy: 92,
    leaseUpYears: 2,
    freeRentMonths: 2,
  },
  {
    country: "UAE",
    segment: "lifestyle_center",
    positioning: "luxury",
    baseRentPsf: 400,
    rentEscalation: 4.0,
    openingOccupancy: 40,
    stabilizedOccupancy: 95,
    leaseUpYears: 3,
    freeRentMonths: 5,
  },
  {
    country: "UAE",
    segment: "lifestyle_center",
    positioning: "upscale",
    baseRentPsf: 325,
    rentEscalation: 3.5,
    openingOccupancy: 45,
    stabilizedOccupancy: 94,
    leaseUpYears: 2,
    freeRentMonths: 4,
  },
  {
    country: "UAE",
    segment: "lifestyle_center",
    positioning: "mid_market",
    baseRentPsf: 250,
    rentEscalation: 3.0,
    openingOccupancy: 50,
    stabilizedOccupancy: 93,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "UAE",
    segment: "community_center",
    positioning: "upscale",
    baseRentPsf: 225,
    rentEscalation: 3.0,
    openingOccupancy: 60,
    stabilizedOccupancy: 95,
    leaseUpYears: 1,
    freeRentMonths: 2,
  },
  {
    country: "UAE",
    segment: "community_center",
    positioning: "mid_market",
    baseRentPsf: 175,
    rentEscalation: 2.5,
    openingOccupancy: 65,
    stabilizedOccupancy: 94,
    leaseUpYears: 1,
    freeRentMonths: 2,
  },
  {
    country: "UAE",
    segment: "community_center",
    positioning: "value",
    baseRentPsf: 125,
    rentEscalation: 2.5,
    openingOccupancy: 70,
    stabilizedOccupancy: 93,
    leaseUpYears: 1,
    freeRentMonths: 1,
  },
  {
    country: "UAE",
    segment: "outlet_center",
    positioning: "mid_market",
    baseRentPsf: 150,
    rentEscalation: 2.5,
    openingOccupancy: 55,
    stabilizedOccupancy: 92,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "UAE",
    segment: "outlet_center",
    positioning: "value",
    baseRentPsf: 100,
    rentEscalation: 2.0,
    openingOccupancy: 60,
    stabilizedOccupancy: 90,
    leaseUpYears: 2,
    freeRentMonths: 2,
  },
  // Saudi Arabia
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "luxury",
    baseRentPsf: 300,
    rentEscalation: 3.5,
    openingOccupancy: 45,
    stabilizedOccupancy: 95,
    leaseUpYears: 3,
    freeRentMonths: 4,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "upscale",
    baseRentPsf: 240,
    rentEscalation: 3.0,
    openingOccupancy: 50,
    stabilizedOccupancy: 94,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "mid_market",
    baseRentPsf: 175,
    rentEscalation: 3.0,
    openingOccupancy: 55,
    stabilizedOccupancy: 93,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "value",
    baseRentPsf: 125,
    rentEscalation: 2.5,
    openingOccupancy: 60,
    stabilizedOccupancy: 91,
    leaseUpYears: 2,
    freeRentMonths: 2,
  },
  {
    country: "Saudi Arabia",
    segment: "lifestyle_center",
    positioning: "luxury",
    baseRentPsf: 350,
    rentEscalation: 3.5,
    openingOccupancy: 40,
    stabilizedOccupancy: 94,
    leaseUpYears: 3,
    freeRentMonths: 4,
  },
  {
    country: "Saudi Arabia",
    segment: "lifestyle_center",
    positioning: "upscale",
    baseRentPsf: 275,
    rentEscalation: 3.0,
    openingOccupancy: 45,
    stabilizedOccupancy: 93,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Saudi Arabia",
    segment: "lifestyle_center",
    positioning: "mid_market",
    baseRentPsf: 210,
    rentEscalation: 3.0,
    openingOccupancy: 50,
    stabilizedOccupancy: 92,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  // Malaysia
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "luxury",
    baseRentPsf: 280,
    rentEscalation: 3.0,
    openingOccupancy: 50,
    stabilizedOccupancy: 95,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "upscale",
    baseRentPsf: 220,
    rentEscalation: 3.0,
    openingOccupancy: 55,
    stabilizedOccupancy: 94,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "mid_market",
    baseRentPsf: 160,
    rentEscalation: 2.5,
    openingOccupancy: 60,
    stabilizedOccupancy: 93,
    leaseUpYears: 2,
    freeRentMonths: 2,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "value",
    baseRentPsf: 110,
    rentEscalation: 2.5,
    openingOccupancy: 65,
    stabilizedOccupancy: 91,
    leaseUpYears: 1,
    freeRentMonths: 2,
  },
  {
    country: "Malaysia",
    segment: "lifestyle_center",
    positioning: "luxury",
    baseRentPsf: 320,
    rentEscalation: 3.5,
    openingOccupancy: 45,
    stabilizedOccupancy: 94,
    leaseUpYears: 3,
    freeRentMonths: 4,
  },
  {
    country: "Malaysia",
    segment: "lifestyle_center",
    positioning: "upscale",
    baseRentPsf: 250,
    rentEscalation: 3.0,
    openingOccupancy: 50,
    stabilizedOccupancy: 93,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Malaysia",
    segment: "lifestyle_center",
    positioning: "mid_market",
    baseRentPsf: 190,
    rentEscalation: 3.0,
    openingOccupancy: 55,
    stabilizedOccupancy: 92,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  // Australia
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "luxury",
    baseRentPsf: 450,
    rentEscalation: 3.0,
    openingOccupancy: 50,
    stabilizedOccupancy: 96,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "upscale",
    baseRentPsf: 375,
    rentEscalation: 2.5,
    openingOccupancy: 55,
    stabilizedOccupancy: 95,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "mid_market",
    baseRentPsf: 300,
    rentEscalation: 2.5,
    openingOccupancy: 60,
    stabilizedOccupancy: 94,
    leaseUpYears: 2,
    freeRentMonths: 2,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "value",
    baseRentPsf: 225,
    rentEscalation: 2.0,
    openingOccupancy: 65,
    stabilizedOccupancy: 92,
    leaseUpYears: 1,
    freeRentMonths: 2,
  },
  {
    country: "Australia",
    segment: "lifestyle_center",
    positioning: "luxury",
    baseRentPsf: 500,
    rentEscalation: 3.5,
    openingOccupancy: 45,
    stabilizedOccupancy: 95,
    leaseUpYears: 3,
    freeRentMonths: 4,
  },
  {
    country: "Australia",
    segment: "lifestyle_center",
    positioning: "upscale",
    baseRentPsf: 425,
    rentEscalation: 3.0,
    openingOccupancy: 50,
    stabilizedOccupancy: 94,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Australia",
    segment: "lifestyle_center",
    positioning: "mid_market",
    baseRentPsf: 350,
    rentEscalation: 2.5,
    openingOccupancy: 55,
    stabilizedOccupancy: 93,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  // Vietnam
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "luxury",
    baseRentPsf: 250,
    rentEscalation: 3.5,
    openingOccupancy: 50,
    stabilizedOccupancy: 94,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "upscale",
    baseRentPsf: 190,
    rentEscalation: 3.0,
    openingOccupancy: 55,
    stabilizedOccupancy: 93,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "mid_market",
    baseRentPsf: 140,
    rentEscalation: 3.0,
    openingOccupancy: 60,
    stabilizedOccupancy: 92,
    leaseUpYears: 2,
    freeRentMonths: 2,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "value",
    baseRentPsf: 95,
    rentEscalation: 2.5,
    openingOccupancy: 65,
    stabilizedOccupancy: 90,
    leaseUpYears: 1,
    freeRentMonths: 2,
  },
  {
    country: "Vietnam",
    segment: "lifestyle_center",
    positioning: "luxury",
    baseRentPsf: 290,
    rentEscalation: 3.5,
    openingOccupancy: 45,
    stabilizedOccupancy: 93,
    leaseUpYears: 3,
    freeRentMonths: 4,
  },
  {
    country: "Vietnam",
    segment: "lifestyle_center",
    positioning: "upscale",
    baseRentPsf: 220,
    rentEscalation: 3.0,
    openingOccupancy: 50,
    stabilizedOccupancy: 92,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Vietnam",
    segment: "lifestyle_center",
    positioning: "mid_market",
    baseRentPsf: 165,
    rentEscalation: 3.0,
    openingOccupancy: 55,
    stabilizedOccupancy: 91,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  // Thailand
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "luxury",
    baseRentPsf: 320,
    rentEscalation: 3.0,
    openingOccupancy: 50,
    stabilizedOccupancy: 95,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "upscale",
    baseRentPsf: 250,
    rentEscalation: 3.0,
    openingOccupancy: 55,
    stabilizedOccupancy: 94,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "mid_market",
    baseRentPsf: 180,
    rentEscalation: 2.5,
    openingOccupancy: 60,
    stabilizedOccupancy: 93,
    leaseUpYears: 2,
    freeRentMonths: 2,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "value",
    baseRentPsf: 120,
    rentEscalation: 2.5,
    openingOccupancy: 65,
    stabilizedOccupancy: 91,
    leaseUpYears: 1,
    freeRentMonths: 2,
  },
  {
    country: "Thailand",
    segment: "lifestyle_center",
    positioning: "luxury",
    baseRentPsf: 370,
    rentEscalation: 3.5,
    openingOccupancy: 45,
    stabilizedOccupancy: 94,
    leaseUpYears: 3,
    freeRentMonths: 4,
  },
  {
    country: "Thailand",
    segment: "lifestyle_center",
    positioning: "upscale",
    baseRentPsf: 290,
    rentEscalation: 3.0,
    openingOccupancy: 50,
    stabilizedOccupancy: 93,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
  {
    country: "Thailand",
    segment: "lifestyle_center",
    positioning: "mid_market",
    baseRentPsf: 220,
    rentEscalation: 3.0,
    openingOccupancy: 55,
    stabilizedOccupancy: 92,
    leaseUpYears: 2,
    freeRentMonths: 3,
  },
];

export const DEFAULT_RETAIL_REVENUE_BENCHMARK: RetailRevenueBenchmark =
  RETAIL_REVENUE_BENCHMARKS.find(
    (b) =>
      b.country === "UAE" &&
      b.segment === "regional_mall" &&
      b.positioning === "mid_market"
  )!;

/** Exact triple match only (wizard `projectInfo.country` is normalized internally). */
export function getRetailRevenueBenchmark(
  country: string,
  segment: string,
  positioning: string
): RetailRevenueBenchmark | null {
  const c = normalizeRetailCountry(country);
  const seg = (segment || "").trim();
  const pos = (positioning || "").trim();
  if (!seg || !pos) return null;
  return (
    RETAIL_REVENUE_BENCHMARKS.find(
      (b) => b.country === c && b.segment === seg && b.positioning === pos
    ) ?? null
  );
}

/** Profile lookup with segment/country fallbacks (Component 1 pattern). */
export function resolveRetailRevenueBenchmark(
  country: string,
  segment: string,
  positioning: string
): RetailRevenueBenchmark {
  const exact = getRetailRevenueBenchmark(country, segment, positioning);
  if (exact) return exact;

  const c = normalizeRetailCountry(country || "UAE");
  const seg = (segment || "regional_mall").trim();
  const pos = (positioning || "mid_market").trim();

  const sameSegment = RETAIL_REVENUE_BENCHMARKS.filter(
    (b) => b.country === c && b.segment === seg
  );
  if (sameSegment.length) {
    return (
      sameSegment.find((b) => b.positioning === pos) ??
      sameSegment.find((b) => b.positioning === "mid_market") ??
      sameSegment[0]!
    );
  }

  const sameCountry = RETAIL_REVENUE_BENCHMARKS.filter((b) => b.country === c);
  if (sameCountry.length) {
    return (
      sameCountry.find((b) => b.positioning === pos) ??
      sameCountry.find((b) => b.positioning === "mid_market") ??
      sameCountry[0]!
    );
  }

  return { ...DEFAULT_RETAIL_REVENUE_BENCHMARK, country: c, segment: seg, positioning: pos };
}

export function buildDefaultBaseRentSeries(
  rentYear1: number,
  escalationPct: number,
  years = 10
): number[] {
  return Array.from({ length: years }, (_, i) =>
    compoundRentForYearIndex(rentYear1, escalationPct, i)
  );
}

export function compoundRentForYearIndex(
  rentYear1: number,
  escalationPercent: number,
  yearIndex0: number
): number {
  const v = rentYear1 * Math.pow(1 + escalationPercent / 100, yearIndex0);
  return Math.round(v * 100) / 100;
}

/** Linear lease-up ramp then hold at stabilized occupancy. */
export function buildLeaseUpOccupancySeries(
  occupancyYear1: number,
  stabilized: number,
  leaseUpYears: number,
  years = 10
): number[] {
  const y1 = Math.min(100, Math.max(0, occupancyYear1));
  const stab = Math.min(100, Math.max(y1, stabilized));
  const rampYears = Math.max(1, Math.round(leaseUpYears));
  return Array.from({ length: years }, (_, i) => {
    if (i === 0) return y1;
    if (i >= rampYears) return stab;
    const t = i / rampYears;
    const v = y1 + (stab - y1) * t;
    return Math.round(v * 10) / 10;
  });
}
