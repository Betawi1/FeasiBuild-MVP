import { normalizeRetailCountry } from "@/lib/benchmarks/retail-construction-costs";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";

/** Reference sizes for converting legacy lump-sum benchmarks to rates/percentages. */
const BENCHMARK_REF_BUA = 500_000;
const BENCHMARK_REF_GLA = 400_000;
const BENCHMARK_REF_GROSS_RENT =
  BENCHMARK_REF_GLA * 200 * 0.92;
const BENCHMARK_REF_TOTAL_REVENUE = BENCHMARK_REF_GROSS_RENT * 1.25;

export interface RetailOpexBenchmark {
  country: string;
  segment: string;
  positioning: string;

  /** Local currency per psf of total BUA per year */
  camFixedBaseRate: number;
  /** Local currency per psf of leased GLA per year */
  camVariableRate: number;

  /** % of gross rental revenue (Step 1 base rent) */
  propertyTaxPctOfGrossRent: number;
  /** % of gross rental revenue (Step 1 base rent) */
  insurancePctOfGrossRent: number;

  marketingPctOfRevenue: number;
  /** % of total revenue (base rent + other income) */
  gAndAPctOfRevenue: number;

  mgmtFeePctOfRevenue: number;

  renovationYear1: number;
  renovationYear2: number;
  renovationYears3to10: number;
}

type LegacyRetailOpexBenchmark = {
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

function convertLegacyOpexBenchmark(
  legacy: LegacyRetailOpexBenchmark
): RetailOpexBenchmark {
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

const LEGACY_RETAIL_OPEX_BENCHMARKS: LegacyRetailOpexBenchmark[] = [
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "luxury",
    camFixedBase: 1_500_000,
    camVariableRate: 18,
    propertyTaxAnnual: 1_000_000,
    insuranceAnnual: 200_000,
    marketingPctOfRevenue: 2.5,
    gAndAAnnual: 600_000,
    mgmtFeePctOfRevenue: 3.5,
    renovationYear1: 2.0,
    renovationYear2: 3.0,
    renovationYears3to10: 4.0,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "upscale",
    camFixedBase: 1_200_000,
    camVariableRate: 15,
    propertyTaxAnnual: 800_000,
    insuranceAnnual: 150_000,
    marketingPctOfRevenue: 2.0,
    gAndAAnnual: 500_000,
    mgmtFeePctOfRevenue: 3.0,
    renovationYear1: 1.5,
    renovationYear2: 2.5,
    renovationYears3to10: 3.5,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "mid_market",
    camFixedBase: 1_000_000,
    camVariableRate: 12,
    propertyTaxAnnual: 600_000,
    insuranceAnnual: 120_000,
    marketingPctOfRevenue: 1.8,
    gAndAAnnual: 400_000,
    mgmtFeePctOfRevenue: 2.8,
    renovationYear1: 1.2,
    renovationYear2: 2.0,
    renovationYears3to10: 3.0,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "value",
    camFixedBase: 800_000,
    camVariableRate: 10,
    propertyTaxAnnual: 450_000,
    insuranceAnnual: 100_000,
    marketingPctOfRevenue: 1.5,
    gAndAAnnual: 350_000,
    mgmtFeePctOfRevenue: 2.5,
    renovationYear1: 1.0,
    renovationYear2: 1.8,
    renovationYears3to10: 2.5,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "luxury",
    camFixedBase: 1_300_000,
    camVariableRate: 16,
    propertyTaxAnnual: 850_000,
    insuranceAnnual: 180_000,
    marketingPctOfRevenue: 2.3,
    gAndAAnnual: 550_000,
    mgmtFeePctOfRevenue: 3.2,
    renovationYear1: 1.8,
    renovationYear2: 2.8,
    renovationYears3to10: 3.8,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "upscale",
    camFixedBase: 1_100_000,
    camVariableRate: 14,
    propertyTaxAnnual: 700_000,
    insuranceAnnual: 140_000,
    marketingPctOfRevenue: 2.0,
    gAndAAnnual: 480_000,
    mgmtFeePctOfRevenue: 2.9,
    renovationYear1: 1.4,
    renovationYear2: 2.3,
    renovationYears3to10: 3.2,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "mid_market",
    camFixedBase: 900_000,
    camVariableRate: 11,
    propertyTaxAnnual: 550_000,
    insuranceAnnual: 110_000,
    marketingPctOfRevenue: 1.7,
    gAndAAnnual: 380_000,
    mgmtFeePctOfRevenue: 2.7,
    renovationYear1: 1.1,
    renovationYear2: 1.9,
    renovationYears3to10: 2.8,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "luxury",
    camFixedBase: 900_000,
    camVariableRate: 13,
    propertyTaxAnnual: 500_000,
    insuranceAnnual: 100_000,
    marketingPctOfRevenue: 2.0,
    gAndAAnnual: 400_000,
    mgmtFeePctOfRevenue: 3.0,
    renovationYear1: 1.5,
    renovationYear2: 2.3,
    renovationYears3to10: 3.2,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "upscale",
    camFixedBase: 750_000,
    camVariableRate: 11,
    propertyTaxAnnual: 400_000,
    insuranceAnnual: 85_000,
    marketingPctOfRevenue: 1.8,
    gAndAAnnual: 350_000,
    mgmtFeePctOfRevenue: 2.8,
    renovationYear1: 1.3,
    renovationYear2: 2.0,
    renovationYears3to10: 2.8,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "mid_market",
    camFixedBase: 600_000,
    camVariableRate: 9,
    propertyTaxAnnual: 320_000,
    insuranceAnnual: 70_000,
    marketingPctOfRevenue: 1.6,
    gAndAAnnual: 300_000,
    mgmtFeePctOfRevenue: 2.6,
    renovationYear1: 1.0,
    renovationYear2: 1.7,
    renovationYears3to10: 2.4,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "luxury",
    camFixedBase: 2_000_000,
    camVariableRate: 22,
    propertyTaxAnnual: 1_400_000,
    insuranceAnnual: 280_000,
    marketingPctOfRevenue: 2.5,
    gAndAAnnual: 750_000,
    mgmtFeePctOfRevenue: 3.5,
    renovationYear1: 2.2,
    renovationYear2: 3.2,
    renovationYears3to10: 4.2,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "upscale",
    camFixedBase: 1_700_000,
    camVariableRate: 19,
    propertyTaxAnnual: 1_100_000,
    insuranceAnnual: 220_000,
    marketingPctOfRevenue: 2.2,
    gAndAAnnual: 650_000,
    mgmtFeePctOfRevenue: 3.2,
    renovationYear1: 1.8,
    renovationYear2: 2.8,
    renovationYears3to10: 3.8,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "mid_market",
    camFixedBase: 1_400_000,
    camVariableRate: 16,
    propertyTaxAnnual: 900_000,
    insuranceAnnual: 180_000,
    marketingPctOfRevenue: 2.0,
    gAndAAnnual: 550_000,
    mgmtFeePctOfRevenue: 3.0,
    renovationYear1: 1.5,
    renovationYear2: 2.4,
    renovationYears3to10: 3.4,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "luxury",
    camFixedBase: 700_000,
    camVariableRate: 11,
    propertyTaxAnnual: 350_000,
    insuranceAnnual: 75_000,
    marketingPctOfRevenue: 2.2,
    gAndAAnnual: 320_000,
    mgmtFeePctOfRevenue: 3.0,
    renovationYear1: 1.6,
    renovationYear2: 2.4,
    renovationYears3to10: 3.4,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "upscale",
    camFixedBase: 580_000,
    camVariableRate: 9,
    propertyTaxAnnual: 280_000,
    insuranceAnnual: 60_000,
    marketingPctOfRevenue: 2.0,
    gAndAAnnual: 280_000,
    mgmtFeePctOfRevenue: 2.8,
    renovationYear1: 1.4,
    renovationYear2: 2.1,
    renovationYears3to10: 3.0,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "mid_market",
    camFixedBase: 450_000,
    camVariableRate: 7,
    propertyTaxAnnual: 220_000,
    insuranceAnnual: 50_000,
    marketingPctOfRevenue: 1.8,
    gAndAAnnual: 240_000,
    mgmtFeePctOfRevenue: 2.6,
    renovationYear1: 1.2,
    renovationYear2: 1.8,
    renovationYears3to10: 2.6,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "luxury",
    camFixedBase: 850_000,
    camVariableRate: 12,
    propertyTaxAnnual: 420_000,
    insuranceAnnual: 90_000,
    marketingPctOfRevenue: 2.3,
    gAndAAnnual: 380_000,
    mgmtFeePctOfRevenue: 3.1,
    renovationYear1: 1.7,
    renovationYear2: 2.5,
    renovationYears3to10: 3.5,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "upscale",
    camFixedBase: 700_000,
    camVariableRate: 10,
    propertyTaxAnnual: 340_000,
    insuranceAnnual: 72_000,
    marketingPctOfRevenue: 2.0,
    gAndAAnnual: 330_000,
    mgmtFeePctOfRevenue: 2.9,
    renovationYear1: 1.4,
    renovationYear2: 2.2,
    renovationYears3to10: 3.1,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "mid_market",
    camFixedBase: 550_000,
    camVariableRate: 8,
    propertyTaxAnnual: 270_000,
    insuranceAnnual: 58_000,
    marketingPctOfRevenue: 1.8,
    gAndAAnnual: 280_000,
    mgmtFeePctOfRevenue: 2.7,
    renovationYear1: 1.2,
    renovationYear2: 1.9,
    renovationYears3to10: 2.7,
  },
];

export const RETAIL_OPEX_BENCHMARKS: RetailOpexBenchmark[] =
  LEGACY_RETAIL_OPEX_BENCHMARKS.map(convertLegacyOpexBenchmark);

export const DEFAULT_RETAIL_OPEX_BENCHMARK: RetailOpexBenchmark =
  RETAIL_OPEX_BENCHMARKS.find(
    (b) =>
      b.country === "UAE" &&
      b.segment === "regional_mall" &&
      b.positioning === "mid_market"
  )!;

export function getRetailOpexBenchmark(
  country: string,
  segment: string,
  positioning: string
): RetailOpexBenchmark | null {
  const c = normalizeRetailCountry(country);
  const seg = (segment || "").trim();
  const pos = (positioning || "").trim();
  if (!seg || !pos) return null;
  return (
    RETAIL_OPEX_BENCHMARKS.find(
      (b) => b.country === c && b.segment === seg && b.positioning === pos
    ) ?? null
  );
}

export function resolveRetailOpexBenchmark(
  country: string,
  segment: string,
  positioning: string
): RetailOpexBenchmark {
  const exact = getRetailOpexBenchmark(country, segment, positioning);
  if (exact) return exact;

  const c = normalizeRetailCountry(country || "UAE");
  const seg = (segment || "regional_mall").trim();
  const pos = (positioning || "mid_market").trim();

  const sameSegment = RETAIL_OPEX_BENCHMARKS.filter(
    (b) => b.country === c && b.segment === seg
  );
  if (sameSegment.length) {
    return (
      sameSegment.find((b) => b.positioning === pos) ??
      sameSegment.find((b) => b.positioning === "mid_market") ??
      sameSegment[0]!
    );
  }

  const sameCountry = RETAIL_OPEX_BENCHMARKS.filter((b) => b.country === c);
  if (sameCountry.length) {
    return (
      sameCountry.find((b) => b.positioning === pos) ??
      sameCountry.find((b) => b.positioning === "mid_market") ??
      sameCountry[0]!
    );
  }

  return {
    ...DEFAULT_RETAIL_OPEX_BENCHMARK,
    country: c,
    segment: seg,
    positioning: pos,
  };
}

export type RetailOpexSeriesInput = {
  totalRevenueByYear: number[];
  grossRentalRevenueByYear: number[];
  leasedGlaByYear: number[];
  totalBua: number;
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
};

export type RetailOpexSeries = {
  cam: number[];
  propertyTax: number[];
  insurance: number[];
  marketing: number[];
  ga: number[];
  mgmtFee: number[];
  renovation: number[];
  total: number[];
};

export function renovationPctForYearIndex(
  yearIndex0: number,
  year1Pct: number,
  year2Pct: number,
  years3to10Pct: number
): number {
  if (yearIndex0 === 0) return year1Pct;
  if (yearIndex0 === 1) return year2Pct;
  return years3to10Pct;
}

export function computeRetailOpexSeries(
  input: RetailOpexSeriesInput,
  years = OPERATIONAL_ROOM_REVENUE_YEARS
): RetailOpexSeries {
  const cam: number[] = [];
  const propertyTax: number[] = [];
  const insurance: number[] = [];
  const marketing: number[] = [];
  const ga: number[] = [];
  const mgmtFee: number[] = [];
  const renovation: number[] = [];
  const total: number[] = [];

  const camFixedTotal = input.camFixedBaseRate * input.totalBua;

  for (let i = 0; i < years; i++) {
    const leasedGla = input.leasedGlaByYear[i] ?? 0;
    const revenue = input.totalRevenueByYear[i] ?? 0;
    const grossRent = input.grossRentalRevenueByYear[i] ?? 0;

    const camLine = Math.round(
      camFixedTotal + input.camVariableRate * leasedGla
    );
    const taxLine = Math.round(
      grossRent * (input.propertyTaxPctOfGrossRent / 100)
    );
    const insLine = Math.round(
      grossRent * (input.insurancePctOfGrossRent / 100)
    );
    const mktLine = Math.round(
      revenue * (input.marketingPctOfRevenue / 100)
    );
    const gaLine = Math.round(revenue * (input.gAndAPctOfRevenue / 100));
    const mgmtLine = Math.round(
      revenue * (input.mgmtFeePctOfRevenue / 100)
    );
    const renoPct = renovationPctForYearIndex(
      i,
      input.renovationYear1,
      input.renovationYear2,
      input.renovationYears3to10
    );
    const renoLine = Math.round(revenue * (renoPct / 100));

    cam.push(camLine);
    propertyTax.push(taxLine);
    insurance.push(insLine);
    marketing.push(mktLine);
    ga.push(gaLine);
    mgmtFee.push(mgmtLine);
    renovation.push(renoLine);
    total.push(
      camLine +
        taxLine +
        insLine +
        mktLine +
        gaLine +
        mgmtLine +
        renoLine
    );
  }

  return { cam, propertyTax, insurance, marketing, ga, mgmtFee, renovation, total };
}
