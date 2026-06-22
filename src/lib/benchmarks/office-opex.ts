import {
  normalizeOfficeCountry,
  type OfficePositioning,
  type OfficeSegment,
} from "@/lib/benchmarks/office-construction-costs";

export interface OfficeOpexBenchmark {
  country: string;
  segment: string;
  positioning: string;

  camFixedBase: number;
  camVariableRate: number;

  propertyTaxAnnual: number;
  insuranceAnnual: number;

  marketingPctOfRevenue: number;
  gAndAAnnual: number;

  mgmtFeePctOfRevenue: number;

  renovationYear1: number;
  renovationYear2: number;
  renovationYears3to10: number;
}

/** Dubai CBD hybrid (prime tower / Grade A) — default office opex profile. */
export const DEFAULT_OFFICE_OPEX_BENCHMARK: OfficeOpexBenchmark = {
  country: "UAE",
  segment: "prime_tower",
  positioning: "grade_a",
  camFixedBase: 800_000,
  camVariableRate: 12,
  propertyTaxAnnual: 800_000,
  insuranceAnnual: 150_000,
  marketingPctOfRevenue: 1.5,
  gAndAAnnual: 400_000,
  mgmtFeePctOfRevenue: 3.0,
  renovationYear1: 1.0,
  renovationYear2: 2.0,
  renovationYears3to10: 3.0,
};

export const OFFICE_OPEX_BENCHMARKS: OfficeOpexBenchmark[] = [
  DEFAULT_OFFICE_OPEX_BENCHMARK,
  {
    country: "UAE",
    segment: "prime_tower",
    positioning: "premium",
    camFixedBase: 950_000,
    camVariableRate: 14,
    propertyTaxAnnual: 950_000,
    insuranceAnnual: 180_000,
    marketingPctOfRevenue: 1.8,
    gAndAAnnual: 500_000,
    mgmtFeePctOfRevenue: 3.5,
    renovationYear1: 1.2,
    renovationYear2: 2.5,
    renovationYears3to10: 3.5,
  },
  {
    country: "UAE",
    segment: "prime_tower",
    positioning: "grade_b",
    camFixedBase: 650_000,
    camVariableRate: 10,
    propertyTaxAnnual: 600_000,
    insuranceAnnual: 120_000,
    marketingPctOfRevenue: 1.3,
    gAndAAnnual: 350_000,
    mgmtFeePctOfRevenue: 2.8,
    renovationYear1: 0.8,
    renovationYear2: 1.8,
    renovationYears3to10: 2.8,
  },
  {
    country: "UAE",
    segment: "business_park",
    positioning: "grade_a",
    camFixedBase: 700_000,
    camVariableRate: 10,
    propertyTaxAnnual: 650_000,
    insuranceAnnual: 130_000,
    marketingPctOfRevenue: 1.4,
    gAndAAnnual: 380_000,
    mgmtFeePctOfRevenue: 2.9,
    renovationYear1: 1.0,
    renovationYear2: 2.0,
    renovationYears3to10: 3.0,
  },
  {
    country: "UAE",
    segment: "secondary",
    positioning: "grade_b",
    camFixedBase: 500_000,
    camVariableRate: 8,
    propertyTaxAnnual: 450_000,
    insuranceAnnual: 90_000,
    marketingPctOfRevenue: 1.2,
    gAndAAnnual: 300_000,
    mgmtFeePctOfRevenue: 2.5,
    renovationYear1: 0.8,
    renovationYear2: 1.5,
    renovationYears3to10: 2.5,
  },
  {
    country: "UAE",
    segment: "co_working",
    positioning: "grade_a",
    camFixedBase: 550_000,
    camVariableRate: 9,
    propertyTaxAnnual: 500_000,
    insuranceAnnual: 100_000,
    marketingPctOfRevenue: 2.0,
    gAndAAnnual: 350_000,
    mgmtFeePctOfRevenue: 4.0,
    renovationYear1: 1.5,
    renovationYear2: 2.5,
    renovationYears3to10: 3.5,
  },
];

export function getOfficeOpexBenchmark(
  country: string,
  segment: string,
  positioning: string
): OfficeOpexBenchmark | null {
  const c = normalizeOfficeCountry(country);
  const seg = (segment || "").trim();
  const pos = (positioning || "").trim();
  if (!seg || !pos) return null;
  return (
    OFFICE_OPEX_BENCHMARKS.find(
      (b) => b.country === c && b.segment === seg && b.positioning === pos
    ) ?? null
  );
}

export function resolveOfficeOpexBenchmark(
  country: string,
  segment: string,
  positioning: string
): OfficeOpexBenchmark {
  const exact = getOfficeOpexBenchmark(country, segment, positioning);
  if (exact) return exact;

  const c = normalizeOfficeCountry(country || "UAE");
  const seg = (segment || "prime_tower").trim() as OfficeSegment;
  const pos = (positioning || "grade_a").trim() as OfficePositioning;

  const sameSegment = OFFICE_OPEX_BENCHMARKS.filter(
    (b) => b.country === c && b.segment === seg
  );
  if (sameSegment.length) {
    return (
      sameSegment.find((b) => b.positioning === pos) ??
      sameSegment.find((b) => b.positioning === "grade_a") ??
      sameSegment[0]!
    );
  }

  const sameCountry = OFFICE_OPEX_BENCHMARKS.filter((b) => b.country === c);
  if (sameCountry.length) {
    return (
      sameCountry.find((b) => b.positioning === pos) ??
      sameCountry[0]!
    );
  }

  return {
    ...DEFAULT_OFFICE_OPEX_BENCHMARK,
    country: c,
    segment: seg,
    positioning: pos,
  };
}
