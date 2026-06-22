import {
  getOfficeBenchmark,
  normalizeOfficeCountry,
  resolveOfficeBenchmark,
  type OfficeCoworkingDelivery,
} from "@/lib/benchmarks/office-construction-costs";
import {
  annualConstructionDepreciationRetail,
  annualFfeDepreciationRetail,
  annualStraightLineAmortization,
} from "@/lib/benchmarks/retail-depreciation";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";

export interface OfficeDepreciationBenchmark {
  country: string;
  segment: string;
  positioning: string;

  constructionLife: number;
  ffeLife: number;
  ffeRenovationPctYear6: number;

  officeTiLife: number;
  retailTiLife: number;
  officeLeasingCommLife: number;
  retailLeasingCommLife: number;

  /** Office TI $/sqft when Component 1 does not store a split. */
  officeTiPsf: number;
  /** Retail podium TI $/sqft. */
  retailTiPsf: number;
  /** Office leasing commissions as % of construction cost. */
  officeLeasingCommPctOfConstruction: number;
  /** Retail leasing commissions as % of construction cost. */
  retailLeasingCommPctOfConstruction: number;

  arMonths: number;
  apMonths: number;
}

/** Dubai CBD hybrid (prime tower / Grade A) — Step 4 defaults. */
export const DEFAULT_OFFICE_DEPRECIATION_BENCHMARK: OfficeDepreciationBenchmark =
  {
    country: "UAE",
    segment: "prime_tower",
    positioning: "grade_a",
    constructionLife: 25,
    ffeLife: 7,
    ffeRenovationPctYear6: 50,
    officeTiLife: 10,
    retailTiLife: 8,
    officeLeasingCommLife: 5,
    retailLeasingCommLife: 4,
    officeTiPsf: 60,
    retailTiPsf: 100,
    officeLeasingCommPctOfConstruction: 1.53,
    retailLeasingCommPctOfConstruction: 0.77,
    arMonths: 1,
    apMonths: 1,
  };

export function resolveOfficeDepreciationBenchmark(
  country: string,
  segment: string,
  positioning: string,
  coworkingDelivery?: OfficeCoworkingDelivery
): OfficeDepreciationBenchmark {
  const construction = resolveOfficeBenchmark(
    country,
    segment,
    positioning,
    coworkingDelivery
  );
  const base = DEFAULT_OFFICE_DEPRECIATION_BENCHMARK;
  return {
    country: normalizeOfficeCountry(country || "UAE"),
    segment: segment || "prime_tower",
    positioning: positioning || "grade_a",
    constructionLife: construction.constructionLife ?? base.constructionLife,
    ffeLife: construction.ffeLife ?? base.ffeLife,
    ffeRenovationPctYear6:
      construction.ffeRenovationPctYear6 ?? base.ffeRenovationPctYear6,
    officeTiLife: construction.tiLife ?? base.officeTiLife,
    retailTiLife: base.retailTiLife,
    officeLeasingCommLife:
      construction.leasingCommLife ?? base.officeLeasingCommLife,
    retailLeasingCommLife: base.retailLeasingCommLife,
    officeTiPsf: construction.tiAllowancePsf ?? base.officeTiPsf,
    retailTiPsf: Math.round(
      (construction.tiAllowancePsf ?? base.officeTiPsf) * 1.67
    ),
    officeLeasingCommPctOfConstruction: base.officeLeasingCommPctOfConstruction,
    retailLeasingCommPctOfConstruction:
      base.retailLeasingCommPctOfConstruction,
    arMonths: construction.arMonths ?? base.arMonths,
    apMonths: construction.apMonths ?? base.apMonths,
  };
}

export function getOfficeDepreciationBenchmark(
  country: string,
  segment: string,
  positioning: string,
  coworkingDelivery?: OfficeCoworkingDelivery
): OfficeDepreciationBenchmark | null {
  const c = normalizeOfficeCountry(country);
  const seg = (segment || "").trim();
  const pos = (positioning || "").trim();
  if (!seg || !pos) return null;
  if (!getOfficeBenchmark(country, segment, positioning, coworkingDelivery)) {
    return null;
  }
  return resolveOfficeDepreciationBenchmark(
    c,
    seg,
    pos,
    coworkingDelivery
  );
}

export type OfficeDepreciationBases = {
  constructionCost: number;
  initialFfe: number;
  officeTiCapital: number;
  retailTiCapital: number;
  officeLeasingCommCapital: number;
  retailLeasingCommCapital: number;
};

export function resolveOfficeDepreciationBases(
  bases: {
    constructionCost: number;
    initialFfe: number;
    officeGlaSqft: number;
    retailGlaSqft: number;
    officeTiCapital?: number;
    retailTiCapital?: number;
    officeLeasingCommCapital?: number;
    retailLeasingCommCapital?: number;
  },
  benchmark: OfficeDepreciationBenchmark
): OfficeDepreciationBases {
  const constructionCost = Math.max(0, bases.constructionCost);
  const officeGla = Math.max(0, bases.officeGlaSqft);
  const retailGla = Math.max(0, bases.retailGlaSqft);

  const officeTiCapital =
    bases.officeTiCapital ??
    Math.round(officeGla * benchmark.officeTiPsf);
  const retailTiCapital =
    bases.retailTiCapital ??
    (retailGla > 0 ? Math.round(retailGla * benchmark.retailTiPsf) : 0);

  const officeLeasingCommCapital =
    bases.officeLeasingCommCapital ??
    Math.round(
      constructionCost *
        (benchmark.officeLeasingCommPctOfConstruction / 100)
    );
  const retailLeasingCommCapital =
    bases.retailLeasingCommCapital ??
    (retailGla > 0
      ? Math.round(
          constructionCost *
            (benchmark.retailLeasingCommPctOfConstruction / 100)
        )
      : 0);

  return {
    constructionCost,
    initialFfe: Math.max(0, bases.initialFfe),
    officeTiCapital,
    retailTiCapital,
    officeLeasingCommCapital,
    retailLeasingCommCapital,
  };
}

export type OfficeDepreciationSeriesInput = {
  constructionCost: number;
  initialFfe: number;
  constructionLife: number;
  ffeLife: number;
  ffeRenovationPctYear6: number;
  officeTiCapital: number;
  retailTiCapital: number;
  officeTiLife: number;
  retailTiLife: number;
  officeLeasingCommCapital: number;
  retailLeasingCommCapital: number;
  officeLeasingCommLife: number;
  retailLeasingCommLife: number;
  arMonths: number;
  apMonths: number;
  totalRevenueByYear: number[];
  opexByYear: number[];
};

export type OfficeDepreciationYearRow = {
  year: number;
  constructionDep: number;
  ffeDep: number;
  officeTiAmort: number;
  retailTiAmort: number;
  officeLeasingCommAmort: number;
  retailLeasingCommAmort: number;
  totalDep: number;
  ar: number;
  ap: number;
  netWc: number;
  totalRevenue: number;
};

export function computeOfficeDepreciationSeries(
  input: OfficeDepreciationSeriesInput,
  years = OPERATIONAL_ROOM_REVENUE_YEARS
): OfficeDepreciationYearRow[] {
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
    const officeTiAmort = annualStraightLineAmortization(
      i,
      input.officeTiCapital,
      input.officeTiLife,
      0
    );
    const retailTiAmort = annualStraightLineAmortization(
      i,
      input.retailTiCapital,
      input.retailTiLife,
      0
    );
    const officeLeasingCommAmort = annualStraightLineAmortization(
      i,
      input.officeLeasingCommCapital,
      input.officeLeasingCommLife,
      0
    );
    const retailLeasingCommAmort = annualStraightLineAmortization(
      i,
      input.retailLeasingCommCapital,
      input.retailLeasingCommLife,
      0
    );
    const totalDep =
      conAnnual +
      ffeDep +
      officeTiAmort +
      retailTiAmort +
      officeLeasingCommAmort +
      retailLeasingCommAmort;
    const ar = (input.arMonths / 12) * rev;
    const ap = (input.apMonths / 12) * opex;

    return {
      year: i + 1,
      constructionDep: Math.round(conAnnual),
      ffeDep: Math.round(ffeDep),
      officeTiAmort: Math.round(officeTiAmort),
      retailTiAmort: Math.round(retailTiAmort),
      officeLeasingCommAmort: Math.round(officeLeasingCommAmort),
      retailLeasingCommAmort: Math.round(retailLeasingCommAmort),
      totalDep: Math.round(totalDep),
      ar: Math.round(ar),
      ap: Math.round(ap),
      netWc: Math.round(ar - ap),
      totalRevenue: rev,
    };
  });
}
