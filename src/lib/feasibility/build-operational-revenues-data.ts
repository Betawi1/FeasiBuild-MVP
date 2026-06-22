import {
  HOTEL_REVENUE_PCT_KEYS,
  pctsFromRevenueProfile,
  resolveHotelRevenueProfile,
  type HotelRevenuePctKey,
} from "@/config/hotel-revenue-profiles";
import {
  buildDefaultAdrSeries,
  OPERATIONAL_ROOM_REVENUE_YEARS,
} from "@/lib/operational-cash-inflows-chart";
import type { OperationalHotelHoldSnapshot } from "@/lib/operational-pnl";
import type {
  FeasibilityProjectBundle,
  OperationalRevenuesData,
} from "@/types/feasibility";
import type { ProjectInfo } from "@/store/useFinModelStore";

const NON_ROOM_REVENUE_KEYS: HotelRevenuePctKey[] = [
  "food",
  "beverage",
  "roomService",
  "telecom",
  "spaHealth",
  "rentalOther",
];

const REVENUE_CATEGORY_LABELS: Record<HotelRevenuePctKey, string> = {
  rooms: "Rooms",
  food: "Food",
  beverage: "Beverage",
  roomService: "Room Service",
  telecom: "Telecommunications",
  spaHealth: "Spa, Health and Leisure",
  rentalOther: "Rental and Other Income",
};

const DEFAULT_REV_PCTS: Record<HotelRevenuePctKey, number> = {
  rooms: 64.0,
  food: 20.4,
  beverage: 8.1,
  roomService: 1.0,
  telecom: 1.0,
  spaHealth: 4.5,
  rentalOther: 1.0,
};

function padYearSeries(
  values: number[] | undefined,
  fallback: number[],
  years = OPERATIONAL_ROOM_REVENUE_YEARS
): number[] {
  if (!values?.length) return fallback.slice(0, years);
  const out = [...values];
  while (out.length < years) {
    out.push(out[out.length - 1] ?? 0);
  }
  return out.slice(0, years);
}

/** Compound ADR from Year 1 base and annual inflation (%). */
export function generateADRSeries(
  adrYear1: number,
  adrInflation: number,
  years = OPERATIONAL_ROOM_REVENUE_YEARS
): number[] {
  return buildDefaultAdrSeries(adrYear1, adrInflation, years);
}

/** Ramp occupancy to stabilized level by stabilization year, then hold flat. */
export function generateOccupancySeries(
  occupancyYear1: number,
  occupancyStabilized: number,
  stabilizationYear: number,
  years = OPERATIONAL_ROOM_REVENUE_YEARS
): number[] {
  const stabYear = Math.max(1, Math.min(stabilizationYear, years));
  const stabIdx = stabYear - 1;
  return Array.from({ length: years }, (_, i) => {
    if (i >= stabIdx) {
      return Math.round(occupancyStabilized * 10) / 10;
    }
    if (stabIdx === 0) {
      return Math.round(occupancyStabilized * 10) / 10;
    }
    const t = i / stabIdx;
    const v = occupancyYear1 + (occupancyStabilized - occupancyYear1) * t;
    return Math.round(v * 10) / 10;
  });
}

function resolveRevPcts(
  snapshot: OperationalHotelHoldSnapshot | null | undefined,
  projectInfo?: Pick<
    ProjectInfo,
    "hotelOperatingType" | "hotelStarRating" | "country" | "city"
  >
): Record<HotelRevenuePctKey, number> {
  if (snapshot?.revPcts && Object.keys(snapshot.revPcts).length > 0) {
    return { ...DEFAULT_REV_PCTS, ...snapshot.revPcts } as Record<
      HotelRevenuePctKey,
      number
    >;
  }

  const star = Number(projectInfo?.hotelStarRating);
  const hotelType = (projectInfo?.hotelOperatingType || "business") as
    | "business"
    | "resort";
  if (
    projectInfo?.country &&
    projectInfo?.city &&
    Number.isFinite(star) &&
    star > 0
  ) {
    const profile = resolveHotelRevenueProfile(
      hotelType,
      star,
      projectInfo.country,
      projectInfo.city
    );
    if (profile) return pctsFromRevenueProfile(profile.profile);
  }

  return { ...DEFAULT_REV_PCTS };
}

function buildRevenueDistribution(
  revPcts: Record<HotelRevenuePctKey, number>
): OperationalRevenuesData["revenueDistribution"] {
  const rows = NON_ROOM_REVENUE_KEYS.map((key) => ({
    category: REVENUE_CATEGORY_LABELS[key],
    percentage: Math.round((revPcts[key] ?? 0) * 10) / 10,
  }));

  const totalPct = Math.round(
    HOTEL_REVENUE_PCT_KEYS.reduce((s, k) => s + (revPcts[k] ?? 0), 0) * 10
  ) / 10;

  rows.push({
    category: "Total Hotel Revenues",
    percentage: totalPct,
  });

  return rows;
}

export function buildOperationalRevenuesData(
  bundle: FeasibilityProjectBundle,
  hotelHoldSnapshot?: OperationalHotelHoldSnapshot | null,
  projectInfo?: Pick<
    ProjectInfo,
    "hotelOperatingType" | "hotelStarRating" | "country" | "city"
  >
): OperationalRevenuesData {
  const c2 = bundle.component2;
  const c = bundle.currency;
  const years = Array.from(
    { length: OPERATIONAL_ROOM_REVENUE_YEARS },
    (_, i) => `Year ${i + 1}`
  );

  const adrFallback = generateADRSeries(c2.adrYear1, c2.adrInflation);
  const occFallback = generateOccupancySeries(
    c2.occupancyYear1,
    c2.occupancyStabilized,
    3
  );

  const adr = padYearSeries(hotelHoldSnapshot?.adrValues, adrFallback);
  const occupancy = padYearSeries(
    hotelHoldSnapshot?.occupancyValues,
    occFallback
  );

  const revPcts = resolveRevPcts(hotelHoldSnapshot, projectInfo);
  const revenueDistribution = buildRevenueDistribution(revPcts);

  const adrYear1Display = adr[0] ?? c2.adrYear1;
  const notes = [
    `The average daily rate (ADR) for the first year of operations is assumed to be ${c} ${adrYear1Display.toLocaleString("en-US", { maximumFractionDigits: 1 })} and to increase at an annual rate of ${c2.adrInflation}%. This forecasted ADR reflects market trends and the performance of the benchmark set.`,
    "The hotel revenue distribution is based on the operational mix defined in Component 2, Step 2.",
  ];

  return {
    title: "Financial Analysis",
    subtitle: "Operational Assumptions - Revenues",
    currency: c,
    roomRevenues: { years, adr, occupancy },
    revenueDistribution,
    notes,
  };
}

function inferHotelOperatingType(segment: string): "business" | "resort" {
  const s = segment.toLowerCase();
  return s.includes("resort") ? "resort" : "business";
}

export function buildOperationalRevenuesFromBundle(
  bundle: FeasibilityProjectBundle
): OperationalRevenuesData {
  const starRaw = bundle.aggregate.starRating.replace(/[^\d.]/g, "");
  const star = Number(starRaw);
  return buildOperationalRevenuesData(bundle, null, {
    hotelOperatingType: inferHotelOperatingType(bundle.aggregate.segment),
    hotelStarRating: Number.isFinite(star) && star > 0 ? String(star) : "5",
    country: bundle.location.country,
    city: bundle.location.city,
  });
}

export function isOperationalRevenuesData(
  data: unknown
): data is OperationalRevenuesData {
  return (
    !!data &&
    typeof data === "object" &&
    "roomRevenues" in data &&
    "revenueDistribution" in data
  );
}
