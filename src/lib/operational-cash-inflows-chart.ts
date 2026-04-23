/** 10-year operating horizon for hotel room revenue (Years 1–10). */
export const OPERATIONAL_ROOM_REVENUE_YEARS = 10;

/** Dubai business 4–5★ style default occupancy ramp (Y1 → Y10). */
export const DUBAI_BUSINESS_HOTEL_DEFAULT_OCCUPANCY: readonly number[] = [
  68, 70, 72, 72, 72, 72, 72, 72, 72, 72,
];

/** Default ADR series (Y1–Y10) — Dubai business 4–5★ benchmark row. */
export const DUBAI_BUSINESS_HOTEL_DEFAULT_ADR: readonly number[] = [
  1050.0, 1092.0, 1135.7, 1181.1, 1228.4, 1277.5, 1328.6, 1381.7, 1437.0,
  1494.5,
];

/**
 * ADR in year index `i` (0 = Year 1) with compound annual inflation from Year 1 ADR.
 * One decimal place matches benchmark table / Component 2 Step 1 defaults.
 */
export function compoundAdrForYearIndex(
  adrYear1: number,
  inflationPercent: number,
  yearIndex0: number
): number {
  const r = inflationPercent / 100;
  const v = adrYear1 * Math.pow(1 + r, yearIndex0);
  return Math.round(v * 10) / 10;
}

export function buildDefaultAdrSeries(
  adrYear1: number,
  inflationPercent: number,
  years = OPERATIONAL_ROOM_REVENUE_YEARS
): number[] {
  return Array.from({ length: years }, (_, i) =>
    compoundAdrForYearIndex(adrYear1, inflationPercent, i)
  );
}

/** Room nights sold × ADR = rooms × ADR × 365 × (occ/100). */
export function computeAnnualRoomRevenue(
  numberOfRooms: number,
  adr: number,
  occupancyPercent: number
): number {
  return numberOfRooms * adr * 365 * (occupancyPercent / 100);
}

export function computeRoomRevenueSeries(
  numberOfRooms: number,
  adrValues: number[],
  occupancyPercents: number[]
): number[] {
  const n = Math.min(
    adrValues.length,
    occupancyPercents.length,
    OPERATIONAL_ROOM_REVENUE_YEARS
  );
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      computeAnnualRoomRevenue(
        numberOfRooms,
        adrValues[i] ?? 0,
        occupancyPercents[i] ?? 0
      )
    );
  }
  return out;
}

export type RoomRevenueChartRow = {
  label: string;
  yearIndex: number;
  revenue: number;
};

export function roomRevenueToChartData(
  revenues: number[]
): RoomRevenueChartRow[] {
  return revenues.map((revenue, i) => ({
    label: `Y${i + 1}`,
    yearIndex: i + 1,
    revenue,
  }));
}
