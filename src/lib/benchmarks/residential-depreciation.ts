import { normalizeResidentialCountry } from "@/lib/benchmarks/residential-construction-costs";
import {
  annualConstructionDepreciationRetail,
  annualFfeDepreciationRetail,
} from "@/lib/benchmarks/retail-depreciation";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";

export interface ResidentialDepreciationBenchmark {
  country: string;
  segment: string;
  positioning: string;
  constructionLife: number;
  ffeLife: number;
  ffeRenovationPctYear6: number;
  arMonths: number;
  apMonths: number;
}

const BASE: ResidentialDepreciationBenchmark = {
  country: "UAE",
  segment: "high_rise",
  positioning: "grade_a",
  constructionLife: 30,
  ffeLife: 7,
  ffeRenovationPctYear6: 40,
  arMonths: 1,
  apMonths: 1,
};

const SEGMENT_SCALE: Record<string, Partial<ResidentialDepreciationBenchmark>> = {
  high_rise: { constructionLife: 30, ffeLife: 7 },
  mid_rise: { constructionLife: 28, ffeLife: 6 },
  townhome: { constructionLife: 25, ffeLife: 5, ffeRenovationPctYear6: 35 },
  compact: { constructionLife: 25, ffeLife: 5, ffeRenovationPctYear6: 30 },
};

const POSITIONING_SCALE: Record<string, Partial<ResidentialDepreciationBenchmark>> = {
  luxury: {
    constructionLife: 35,
    ffeLife: 8,
    ffeRenovationPctYear6: 50,
    arMonths: 1.5,
    apMonths: 1.5,
  },
  grade_a: {},
  grade_b: {
    constructionLife: 28,
    ffeLife: 6,
    ffeRenovationPctYear6: 35,
  },
  grade_c: {
    constructionLife: 25,
    ffeLife: 5,
    ffeRenovationPctYear6: 25,
    arMonths: 0.5,
    apMonths: 0.5,
  },
};

export function resolveResidentialDepreciationBenchmark(
  country: string,
  segment: string,
  positioning: string
): ResidentialDepreciationBenchmark {
  const c = normalizeResidentialCountry(country || "UAE");
  const seg = segment || "high_rise";
  const pos = positioning || "grade_a";

  return {
    ...BASE,
    ...(SEGMENT_SCALE[seg] ?? {}),
    ...(POSITIONING_SCALE[pos] ?? {}),
    country: c,
    segment: seg,
    positioning: pos,
  };
}

export function getResidentialDepreciationBenchmark(
  country: string,
  segment: string,
  positioning: string
): ResidentialDepreciationBenchmark {
  return resolveResidentialDepreciationBenchmark(country, segment, positioning);
}

export type ResidentialDepreciationSeriesInput = {
  constructionCost: number;
  initialFfe: number;
  constructionLife: number;
  ffeLife: number;
  ffeRenovationPctYear6: number;
  arMonths: number;
  apMonths: number;
  totalRevenueByYear: number[];
  opexByYear: number[];
};

export type ResidentialDepreciationYearRow = {
  year: number;
  constructionDep: number;
  ffeDep: number;
  totalDep: number;
  ar: number;
  ap: number;
  netWc: number;
  changeInWc: number;
  totalRevenue: number;
};

export function computeResidentialDepreciationSeries(
  input: ResidentialDepreciationSeriesInput,
  years = OPERATIONAL_ROOM_REVENUE_YEARS
): ResidentialDepreciationYearRow[] {
  const conAnnual = annualConstructionDepreciationRetail(
    input.constructionCost,
    input.constructionLife
  );

  let prevNetWc = 0;

  return Array.from({ length: years }, (_, i) => {
    const rev = input.totalRevenueByYear[i] ?? 0;
    const opex = input.opexByYear[i] ?? 0;
    const ffeDep = annualFfeDepreciationRetail(
      i,
      input.initialFfe,
      input.ffeLife,
      input.ffeRenovationPctYear6
    );
    const totalDep = conAnnual + ffeDep;
    const ar = (input.arMonths / 12) * rev;
    const ap = (input.apMonths / 12) * opex;
    const netWc = ar - ap;
    const changeInWc = netWc - prevNetWc;
    prevNetWc = netWc;

    return {
      year: i + 1,
      constructionDep: Math.round(conAnnual),
      ffeDep: Math.round(ffeDep),
      totalDep: Math.round(totalDep),
      ar: Math.round(ar),
      ap: Math.round(ap),
      netWc: Math.round(netWc),
      changeInWc: Math.round(changeInWc),
      totalRevenue: rev,
    };
  });
}
