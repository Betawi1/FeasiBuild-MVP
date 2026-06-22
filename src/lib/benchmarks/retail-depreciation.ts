import { normalizeRetailCountry } from "@/lib/benchmarks/retail-construction-costs";
import { FFE_RENOVATION_START_YEAR_INDEX } from "@/config/hotel-depreciation-profiles";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";

export interface RetailDepreciationBenchmark {
  country: string;
  segment: string;
  positioning: string;

  constructionLife: number;
  ffeLife: number;
  ffeRenovationPctYear6: number;
  tiLife: number;
  leasingCommLife: number;

  /** % of Component 1 construction cost — tenant improvement pool. */
  tiPctOfConstruction: number;
  /** % of Component 1 construction cost — leasing commission pool. */
  leasingCommPctOfConstruction: number;

  arMonths: number;
  apMonths: number;
}

export const RETAIL_DEPRECIATION_BENCHMARKS: RetailDepreciationBenchmark[] = [
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "luxury",
    constructionLife: 30,
    ffeLife: 7,
    ffeRenovationPctYear6: 60,
    tiLife: 10,
    leasingCommLife: 5,
    tiPctOfConstruction: 15,
    leasingCommPctOfConstruction: 6,
    arMonths: 1.5,
    apMonths: 1.0,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "upscale",
    constructionLife: 25,
    ffeLife: 7,
    ffeRenovationPctYear6: 50,
    tiLife: 10,
    leasingCommLife: 5,
    tiPctOfConstruction: 13,
    leasingCommPctOfConstruction: 5,
    arMonths: 1.0,
    apMonths: 1.0,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "mid_market",
    constructionLife: 25,
    ffeLife: 6,
    ffeRenovationPctYear6: 40,
    tiLife: 8,
    leasingCommLife: 5,
    tiPctOfConstruction: 12,
    leasingCommPctOfConstruction: 4,
    arMonths: 1.0,
    apMonths: 1.0,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "value",
    constructionLife: 20,
    ffeLife: 5,
    ffeRenovationPctYear6: 30,
    tiLife: 7,
    leasingCommLife: 4,
    tiPctOfConstruction: 10,
    leasingCommPctOfConstruction: 3,
    arMonths: 0.5,
    apMonths: 1.0,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "luxury",
    constructionLife: 30,
    ffeLife: 7,
    ffeRenovationPctYear6: 55,
    tiLife: 10,
    leasingCommLife: 5,
    tiPctOfConstruction: 14,
    leasingCommPctOfConstruction: 5.5,
    arMonths: 1.2,
    apMonths: 1.0,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "upscale",
    constructionLife: 25,
    ffeLife: 7,
    ffeRenovationPctYear6: 45,
    tiLife: 10,
    leasingCommLife: 5,
    tiPctOfConstruction: 12,
    leasingCommPctOfConstruction: 4.5,
    arMonths: 1.0,
    apMonths: 1.0,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "mid_market",
    constructionLife: 25,
    ffeLife: 6,
    ffeRenovationPctYear6: 35,
    tiLife: 8,
    leasingCommLife: 5,
    tiPctOfConstruction: 11,
    leasingCommPctOfConstruction: 4,
    arMonths: 0.8,
    apMonths: 1.0,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "luxury",
    constructionLife: 30,
    ffeLife: 7,
    ffeRenovationPctYear6: 50,
    tiLife: 10,
    leasingCommLife: 5,
    tiPctOfConstruction: 13,
    leasingCommPctOfConstruction: 5,
    arMonths: 1.0,
    apMonths: 1.0,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "upscale",
    constructionLife: 25,
    ffeLife: 7,
    ffeRenovationPctYear6: 45,
    tiLife: 10,
    leasingCommLife: 5,
    tiPctOfConstruction: 12,
    leasingCommPctOfConstruction: 4,
    arMonths: 1.0,
    apMonths: 1.0,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "mid_market",
    constructionLife: 25,
    ffeLife: 6,
    ffeRenovationPctYear6: 40,
    tiLife: 8,
    leasingCommLife: 5,
    tiPctOfConstruction: 10,
    leasingCommPctOfConstruction: 3.5,
    arMonths: 0.8,
    apMonths: 1.0,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "luxury",
    constructionLife: 40,
    ffeLife: 8,
    ffeRenovationPctYear6: 60,
    tiLife: 12,
    leasingCommLife: 6,
    tiPctOfConstruction: 16,
    leasingCommPctOfConstruction: 6,
    arMonths: 1.5,
    apMonths: 1.2,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "upscale",
    constructionLife: 35,
    ffeLife: 8,
    ffeRenovationPctYear6: 50,
    tiLife: 10,
    leasingCommLife: 5,
    tiPctOfConstruction: 14,
    leasingCommPctOfConstruction: 5,
    arMonths: 1.2,
    apMonths: 1.0,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "mid_market",
    constructionLife: 30,
    ffeLife: 7,
    ffeRenovationPctYear6: 45,
    tiLife: 10,
    leasingCommLife: 5,
    tiPctOfConstruction: 12,
    leasingCommPctOfConstruction: 4,
    arMonths: 1.0,
    apMonths: 1.0,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "luxury",
    constructionLife: 25,
    ffeLife: 6,
    ffeRenovationPctYear6: 50,
    tiLife: 8,
    leasingCommLife: 5,
    tiPctOfConstruction: 12,
    leasingCommPctOfConstruction: 4.5,
    arMonths: 1.0,
    apMonths: 1.0,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "upscale",
    constructionLife: 25,
    ffeLife: 6,
    ffeRenovationPctYear6: 45,
    tiLife: 8,
    leasingCommLife: 5,
    tiPctOfConstruction: 11,
    leasingCommPctOfConstruction: 4,
    arMonths: 0.8,
    apMonths: 1.0,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "mid_market",
    constructionLife: 20,
    ffeLife: 5,
    ffeRenovationPctYear6: 40,
    tiLife: 7,
    leasingCommLife: 4,
    tiPctOfConstruction: 10,
    leasingCommPctOfConstruction: 3.5,
    arMonths: 0.5,
    apMonths: 1.0,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "luxury",
    constructionLife: 30,
    ffeLife: 7,
    ffeRenovationPctYear6: 55,
    tiLife: 10,
    leasingCommLife: 5,
    tiPctOfConstruction: 13,
    leasingCommPctOfConstruction: 5,
    arMonths: 1.2,
    apMonths: 1.0,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "upscale",
    constructionLife: 25,
    ffeLife: 7,
    ffeRenovationPctYear6: 50,
    tiLife: 10,
    leasingCommLife: 5,
    tiPctOfConstruction: 12,
    leasingCommPctOfConstruction: 4.5,
    arMonths: 1.0,
    apMonths: 1.0,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "mid_market",
    constructionLife: 25,
    ffeLife: 6,
    ffeRenovationPctYear6: 45,
    tiLife: 8,
    leasingCommLife: 5,
    tiPctOfConstruction: 11,
    leasingCommPctOfConstruction: 4,
    arMonths: 0.8,
    apMonths: 1.0,
  },
];

export const DEFAULT_RETAIL_DEPRECIATION_BENCHMARK: RetailDepreciationBenchmark =
  RETAIL_DEPRECIATION_BENCHMARKS.find(
    (b) =>
      b.country === "UAE" &&
      b.segment === "regional_mall" &&
      b.positioning === "mid_market"
  )!;

export function getRetailDepreciationBenchmark(
  country: string,
  segment: string,
  positioning: string
): RetailDepreciationBenchmark | null {
  const c = normalizeRetailCountry(country);
  const seg = (segment || "").trim();
  const pos = (positioning || "").trim();
  if (!seg || !pos) return null;
  return (
    RETAIL_DEPRECIATION_BENCHMARKS.find(
      (b) => b.country === c && b.segment === seg && b.positioning === pos
    ) ?? null
  );
}

export function resolveRetailDepreciationBenchmark(
  country: string,
  segment: string,
  positioning: string
): RetailDepreciationBenchmark {
  const exact = getRetailDepreciationBenchmark(country, segment, positioning);
  if (exact) return exact;

  const c = normalizeRetailCountry(country || "UAE");
  const seg = (segment || "regional_mall").trim();
  const pos = (positioning || "mid_market").trim();

  const sameSegment = RETAIL_DEPRECIATION_BENCHMARKS.filter(
    (b) => b.country === c && b.segment === seg
  );
  if (sameSegment.length) {
    return (
      sameSegment.find((b) => b.positioning === pos) ??
      sameSegment.find((b) => b.positioning === "mid_market") ??
      sameSegment[0]!
    );
  }

  const sameCountry = RETAIL_DEPRECIATION_BENCHMARKS.filter(
    (b) => b.country === c
  );
  if (sameCountry.length) {
    return (
      sameCountry.find((b) => b.positioning === pos) ??
      sameCountry.find((b) => b.positioning === "mid_market") ??
      sameCountry[0]!
    );
  }

  return {
    ...DEFAULT_RETAIL_DEPRECIATION_BENCHMARK,
    country: c,
    segment: seg,
    positioning: pos,
  };
}

export function annualConstructionDepreciationRetail(
  constructionCost: number,
  usefulLifeYears: number
): number {
  const L = Math.max(1, usefulLifeYears);
  if (constructionCost <= 0) return 0;
  return constructionCost / L;
}

/** FFE pool + Year-6 renovation tranche (same logic as hotel). */
export function annualFfeDepreciationRetail(
  yearIndex0: number,
  initialFfe: number,
  ffeUsefulLife: number,
  ffeRenovationPctYear6: number
): number {
  const life = Math.max(1, ffeUsefulLife);
  let dep = 0;
  if (yearIndex0 < life && initialFfe > 0) {
    dep += initialFfe / life;
  }
  const renovationSpend =
    initialFfe > 0 ? initialFfe * (ffeRenovationPctYear6 / 100) : 0;
  if (
    renovationSpend > 0 &&
    yearIndex0 >= FFE_RENOVATION_START_YEAR_INDEX &&
    yearIndex0 < FFE_RENOVATION_START_YEAR_INDEX + life
  ) {
    dep += renovationSpend / life;
  }
  return dep;
}

export function annualStraightLineAmortization(
  yearIndex0: number,
  capitalBase: number,
  lifeYears: number,
  startYearIndex0 = 0
): number {
  const life = Math.max(1, lifeYears);
  if (capitalBase <= 0) return 0;
  if (yearIndex0 < startYearIndex0 || yearIndex0 >= startYearIndex0 + life) {
    return 0;
  }
  return capitalBase / life;
}

export type RetailDepreciationSeriesInput = {
  constructionCost: number;
  initialFfe: number;
  constructionLife: number;
  ffeLife: number;
  ffeRenovationPctYear6: number;
  tiCapital: number;
  tiLife: number;
  leasingCommCapital: number;
  leasingCommLife: number;
  arMonths: number;
  apMonths: number;
  totalRevenueByYear: number[];
  opexByYear: number[];
};

export type RetailDepreciationYearRow = {
  year: number;
  constructionDep: number;
  ffeDep: number;
  tiAmort: number;
  leasingCommAmort: number;
  totalDep: number;
  ar: number;
  ap: number;
  netWc: number;
  totalRevenue: number;
};

export function computeRetailDepreciationSeries(
  input: RetailDepreciationSeriesInput,
  years = OPERATIONAL_ROOM_REVENUE_YEARS
): RetailDepreciationYearRow[] {
  const conAnnual = annualConstructionDepreciationRetail(
    input.constructionCost,
    input.constructionLife
  );

  return Array.from({ length: years }, (_, i) => {
    const rev = input.totalRevenueByYear[i] ?? 0;
    const opex = input.opexByYear[i] ?? 0;
    const ffeDep = annualFfeDepreciationRetail(
      i,
      input.initialFfe,
      input.ffeLife,
      input.ffeRenovationPctYear6
    );
    const tiAmort = annualStraightLineAmortization(
      i,
      input.tiCapital,
      input.tiLife,
      0
    );
    const leasingCommAmort = annualStraightLineAmortization(
      i,
      input.leasingCommCapital,
      input.leasingCommLife,
      0
    );
    const totalDep = conAnnual + ffeDep + tiAmort + leasingCommAmort;
    const ar = (input.arMonths / 12) * rev;
    const ap = (input.apMonths / 12) * opex;

    return {
      year: i + 1,
      constructionDep: Math.round(conAnnual),
      ffeDep: Math.round(ffeDep),
      tiAmort: Math.round(tiAmort),
      leasingCommAmort: Math.round(leasingCommAmort),
      totalDep: Math.round(totalDep),
      ar: Math.round(ar),
      ap: Math.round(ap),
      netWc: Math.round(ar - ap),
      totalRevenue: rev,
    };
  });
}
