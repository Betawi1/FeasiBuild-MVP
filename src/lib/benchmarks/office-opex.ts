import {
  normalizeOfficeCountry,
  type OfficePositioning,
  type OfficeSegment,
} from "@/lib/benchmarks/office-construction-costs";

const BENCHMARK_REF_BUA = 500_000;
const BENCHMARK_REF_GLA = 250_000;
const BENCHMARK_REF_GROSS_RENT = BENCHMARK_REF_GLA * 100 * 0.85;
const BENCHMARK_REF_TOTAL_REVENUE = BENCHMARK_REF_GROSS_RENT * 1.2;

export interface OfficeOpexBenchmark {
  country: string;
  segment: string;
  positioning: string;

  camFixedBaseRate: number;
  camVariableRate: number;
  propertyTaxPctOfGrossRent: number;
  insurancePctOfGrossRent: number;
  marketingPctOfRevenue: number;
  gAndAPctOfRevenue: number;
  mgmtFeePctOfRevenue: number;
  renovationYear1: number;
  renovationYear2: number;
  renovationYears3to10: number;
}

type LegacyOfficeOpexBenchmark = {
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
};

function convertLegacyOfficeOpexBenchmark(
  legacy: LegacyOfficeOpexBenchmark
): OfficeOpexBenchmark {
  const roundPct2 = (v: number) => Math.round(v * 100) / 100;
  return {
    country: legacy.country,
    segment: legacy.segment,
    positioning: legacy.positioning,
    camFixedBaseRate: legacy.camFixedBase / BENCHMARK_REF_BUA,
    camVariableRate: legacy.camVariableRate,
    propertyTaxPctOfGrossRent: roundPct2(
      (legacy.propertyTaxAnnual / BENCHMARK_REF_GROSS_RENT) * 100
    ),
    insurancePctOfGrossRent: roundPct2(
      (legacy.insuranceAnnual / BENCHMARK_REF_GROSS_RENT) * 100
    ),
    marketingPctOfRevenue: legacy.marketingPctOfRevenue,
    gAndAPctOfRevenue: roundPct2(
      (legacy.gAndAAnnual / BENCHMARK_REF_TOTAL_REVENUE) * 100
    ),
    mgmtFeePctOfRevenue: legacy.mgmtFeePctOfRevenue,
    renovationYear1: legacy.renovationYear1,
    renovationYear2: legacy.renovationYear2,
    renovationYears3to10: legacy.renovationYears3to10,
  };
}

const LEGACY_OFFICE_OPEX_BENCHMARKS: LegacyOfficeOpexBenchmark[] = [
  {
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
  },
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

export const OFFICE_OPEX_BENCHMARKS: OfficeOpexBenchmark[] =
  LEGACY_OFFICE_OPEX_BENCHMARKS.map(convertLegacyOfficeOpexBenchmark);

export const DEFAULT_OFFICE_OPEX_BENCHMARK: OfficeOpexBenchmark =
  OFFICE_OPEX_BENCHMARKS.find(
    (b) =>
      b.country === "UAE" &&
      b.segment === "prime_tower" &&
      b.positioning === "grade_a"
  )!;

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
      sameCountry.find((b) => b.positioning === pos) ?? sameCountry[0]!
    );
  }

  return {
    ...DEFAULT_OFFICE_OPEX_BENCHMARK,
    country: c,
    segment: seg,
    positioning: pos,
  };
}
