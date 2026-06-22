import {
  getOfficeBenchmark,
  normalizeOfficeCountry,
  type OfficeCoworkingDelivery,
} from "@/lib/benchmarks/office-construction-costs";

export interface OfficeOtherIncomeBenchmark {
  country: string;
  segment: string;
  positioning: string;

  totalParkingSpaces: number;
  officeReservedSpaces: number;
  monthlyPassPrice: number;
  officePassOccupancy: number;
  retailHourlyRate: number;
  retailAvgDailyHours: number;
  retailUtilization: number;
  operatingDays: number;

  camExpensesPerSqft: number;
  propertyTaxPerSqft: number;
  insurancePerSqft: number;
  recoveryRate: number;

  advertisingIncomeYear1: number;
  advertisingGrowthPct: number;
}

const DEFAULT_OFFICE_OTHER_INCOME: OfficeOtherIncomeBenchmark = {
  country: "UAE",
  segment: "prime_tower",
  positioning: "grade_a",
  totalParkingSpaces: 800,
  officeReservedSpaces: 500,
  monthlyPassPrice: 500,
  officePassOccupancy: 90,
  retailHourlyRate: 5,
  retailAvgDailyHours: 4,
  retailUtilization: 60,
  operatingDays: 365,
  camExpensesPerSqft: 7,
  propertyTaxPerSqft: 3.2,
  insurancePerSqft: 0.6,
  recoveryRate: 95,
  advertisingIncomeYear1: 200_000,
  advertisingGrowthPct: 2,
};

/** Segment-scaled defaults (office hold — parking & recoveries). */
const SEGMENT_SCALE: Record<string, Partial<OfficeOtherIncomeBenchmark>> = {
  prime_tower: {
    monthlyPassPrice: 550,
    retailHourlyRate: 6,
    advertisingIncomeYear1: 280_000,
    camExpensesPerSqft: 8,
  },
  business_park: {
    totalParkingSpaces: 1200,
    officeReservedSpaces: 700,
    monthlyPassPrice: 400,
    retailHourlyRate: 4,
    advertisingIncomeYear1: 150_000,
  },
  secondary: {
    monthlyPassPrice: 350,
    retailHourlyRate: 3.5,
    advertisingIncomeYear1: 120_000,
    recoveryRate: 92,
  },
  co_working: {
    officeReservedSpaces: 200,
    monthlyPassPrice: 450,
    officePassOccupancy: 85,
    advertisingIncomeYear1: 180_000,
  },
};

export function getOfficeOtherIncomeBenchmark(
  country: string,
  segment: string,
  positioning: string,
  coworkingDelivery?: OfficeCoworkingDelivery
): OfficeOtherIncomeBenchmark | null {
  const office = getOfficeBenchmark(
    country,
    segment,
    positioning,
    segment === "co_working" ? coworkingDelivery : undefined
  );
  if (!office) return null;

  const c = normalizeOfficeCountry(country);
  const scale = SEGMENT_SCALE[segment] ?? {};
  return {
    ...DEFAULT_OFFICE_OTHER_INCOME,
    ...scale,
    country: c,
    segment,
    positioning,
  };
}

export function resolveOfficeOtherIncomeBenchmark(
  country: string,
  segment: string,
  positioning: string,
  coworkingDelivery?: OfficeCoworkingDelivery,
  totalGlaSqft = 0
): OfficeOtherIncomeBenchmark {
  const exact = getOfficeOtherIncomeBenchmark(
    country,
    segment,
    positioning,
    coworkingDelivery
  );
  const b = exact ?? { ...DEFAULT_OFFICE_OTHER_INCOME, country, segment, positioning };
  if (totalGlaSqft > 0 && !exact) {
    return b;
  }
  return b;
}

export function defaultRecoveriesFromGla(
  benchmark: OfficeOtherIncomeBenchmark,
  totalGlaSqft: number
): { camTotal: number; propertyTax: number; insurance: number } {
  const gla = Math.max(totalGlaSqft, 1);
  return {
    camTotal: Math.round(benchmark.camExpensesPerSqft * gla),
    propertyTax: Math.round(benchmark.propertyTaxPerSqft * gla),
    insurance: Math.round(benchmark.insurancePerSqft * gla),
  };
}
