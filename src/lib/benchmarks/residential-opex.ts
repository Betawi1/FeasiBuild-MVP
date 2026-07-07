import {
  getResidentialBenchmark,
  normalizeResidentialCountry,
} from "@/lib/benchmarks/residential-construction-costs";
import { estimatedUnitsFromGla } from "@/lib/benchmarks/residential-other-income";

const BENCHMARK_REF_GLA = 200_000;
const BENCHMARK_REF_RETAIL_GLA = 30_000;
const BENCHMARK_REF_TOTAL_GLA = BENCHMARK_REF_GLA + BENCHMARK_REF_RETAIL_GLA;
const BENCHMARK_REF_BUA = 450_000;
const BENCHMARK_REF_UNITS = 250;
const BENCHMARK_REF_GROSS_RENT = BENCHMARK_REF_GLA * 45 * 0.85;
const BENCHMARK_REF_BLENDED_LEASED_PCT = 70;

const roundPct2 = (v: number) => Math.round(v * 100) / 100;

function benchmarkUtilitiesBase(): number {
  const commonArea = BENCHMARK_REF_BUA - BENCHMARK_REF_TOTAL_GLA;
  const vacantGla =
    BENCHMARK_REF_TOTAL_GLA * (1 - BENCHMARK_REF_BLENDED_LEASED_PCT / 100);
  return commonArea + vacantGla;
}

export interface ResidentialOpexBenchmark {
  country: string;
  segment: string;
  positioning: string;

  mgmtFeePctOfEgi: number;
  maintenancePctOfResidentialGla: number;
  utilitiesPctOfCommonVacantGla: number;
  propertyTaxPctOfGrossRent: number;
  insurancePctOfGrossRent: number;
  marketingPctOfEgi: number;
  gAndAPctOfGrossRent: number;
  capexReservePctOfTotalGla: number;
}

type LegacyResidentialOpexBenchmark = {
  country: string;
  segment: string;
  positioning: string;
  mgmtFeePctOfEgi: number;
  maintenancePerUnitAnnual: number;
  utilitiesFixedAnnual: number;
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  marketingPctOfEgi: number;
  gAndAAnnual: number;
  capexPerUnitAnnual: number;
};

function convertLegacyResidentialOpexBenchmark(
  legacy: LegacyResidentialOpexBenchmark
): ResidentialOpexBenchmark {
  const maintenanceTotal = legacy.maintenancePerUnitAnnual * BENCHMARK_REF_UNITS;
  const capexTotal = legacy.capexPerUnitAnnual * BENCHMARK_REF_UNITS;
  const utilitiesBase = benchmarkUtilitiesBase();

  return {
    country: legacy.country,
    segment: legacy.segment,
    positioning: legacy.positioning,
    mgmtFeePctOfEgi: legacy.mgmtFeePctOfEgi,
    maintenancePctOfResidentialGla: roundPct2(
      (maintenanceTotal / BENCHMARK_REF_GLA) * 100
    ),
    utilitiesPctOfCommonVacantGla: roundPct2(
      (legacy.utilitiesFixedAnnual / utilitiesBase) * 100
    ),
    propertyTaxPctOfGrossRent: roundPct2(
      (legacy.propertyTaxAnnual / BENCHMARK_REF_GROSS_RENT) * 100
    ),
    insurancePctOfGrossRent: roundPct2(
      (legacy.insuranceAnnual / BENCHMARK_REF_GROSS_RENT) * 100
    ),
    marketingPctOfEgi: legacy.marketingPctOfEgi,
    gAndAPctOfGrossRent: roundPct2(
      (legacy.gAndAAnnual / BENCHMARK_REF_GROSS_RENT) * 100
    ),
    capexReservePctOfTotalGla: roundPct2(
      (capexTotal / BENCHMARK_REF_TOTAL_GLA) * 100
    ),
  };
}

const LEGACY_BASE: LegacyResidentialOpexBenchmark = {
  country: "UAE",
  segment: "high_rise",
  positioning: "grade_a",
  mgmtFeePctOfEgi: 4,
  maintenancePerUnitAnnual: 1500,
  utilitiesFixedAnnual: 200_000,
  propertyTaxAnnual: 500_000,
  insuranceAnnual: 80_000,
  marketingPctOfEgi: 1,
  gAndAAnnual: 100_000,
  capexPerUnitAnnual: 1000,
};

const SEGMENT_SCALE: Record<string, Partial<LegacyResidentialOpexBenchmark>> = {
  high_rise: {
    utilitiesFixedAnnual: 220_000,
    maintenancePerUnitAnnual: 1600,
  },
  mid_rise: {
    utilitiesFixedAnnual: 160_000,
    maintenancePerUnitAnnual: 1300,
    mgmtFeePctOfEgi: 3.5,
  },
  townhome: {
    utilitiesFixedAnnual: 120_000,
    maintenancePerUnitAnnual: 1100,
    capexPerUnitAnnual: 850,
    marketingPctOfEgi: 0.8,
  },
  compact: {
    utilitiesFixedAnnual: 140_000,
    maintenancePerUnitAnnual: 900,
    mgmtFeePctOfEgi: 3,
    gAndAAnnual: 75_000,
  },
};

const POSITIONING_SCALE: Record<
  string,
  Partial<LegacyResidentialOpexBenchmark>
> = {
  luxury: {
    mgmtFeePctOfEgi: 4.5,
    maintenancePerUnitAnnual: 2000,
    utilitiesFixedAnnual: 280_000,
    propertyTaxAnnual: 750_000,
    insuranceAnnual: 120_000,
    marketingPctOfEgi: 1.5,
    gAndAAnnual: 150_000,
    capexPerUnitAnnual: 1400,
  },
  grade_a: {},
  grade_b: {
    mgmtFeePctOfEgi: 3.5,
    maintenancePerUnitAnnual: 1200,
    propertyTaxAnnual: 400_000,
    insuranceAnnual: 65_000,
    gAndAAnnual: 85_000,
  },
  grade_c: {
    mgmtFeePctOfEgi: 3,
    maintenancePerUnitAnnual: 900,
    utilitiesFixedAnnual: 120_000,
    propertyTaxAnnual: 280_000,
    insuranceAnnual: 50_000,
    marketingPctOfEgi: 0.6,
    gAndAAnnual: 60_000,
    capexPerUnitAnnual: 700,
  },
};

export function resolveResidentialOpexBenchmark(
  country: string,
  segment: string,
  positioning: string,
  residentialGlaSqft: number,
  furnishingLevel?: string,
  isServicedApartment?: boolean
): ResidentialOpexBenchmark {
  const c = normalizeResidentialCountry(country || "UAE");
  const seg = segment || "high_rise";
  const pos = positioning || "grade_a";

  const construction = getResidentialBenchmark(
    c,
    seg,
    pos,
    furnishingLevel || "unfurnished",
    isServicedApartment
  );

  const legacy: LegacyResidentialOpexBenchmark = {
    ...LEGACY_BASE,
    ...(SEGMENT_SCALE[seg] ?? {}),
    ...(POSITIONING_SCALE[pos] ?? {}),
    country: c,
    segment: seg,
    positioning: pos,
  };

  const gla = Math.max(0, residentialGlaSqft);
  const units = estimatedUnitsFromGla(gla, 800);

  if (gla > 0) {
    legacy.utilitiesFixedAnnual = Math.round(
      legacy.utilitiesFixedAnnual * (gla / BENCHMARK_REF_GLA)
    );
    legacy.propertyTaxAnnual = Math.round(
      (construction?.landRate ?? 3500) * gla * 0.012
    );
    legacy.gAndAAnnual = Math.round(
      legacy.gAndAAnnual * (units / BENCHMARK_REF_UNITS)
    );
  }

  let bench = convertLegacyResidentialOpexBenchmark(legacy);

  if (isServicedApartment) {
    bench.mgmtFeePctOfEgi = Math.min(6, bench.mgmtFeePctOfEgi + 0.5);
    bench.maintenancePctOfResidentialGla = roundPct2(
      bench.maintenancePctOfResidentialGla * 1.15
    );
  }

  return bench;
}

export function getResidentialOpexBenchmark(
  country: string,
  segment: string,
  positioning: string,
  residentialGlaSqft: number,
  furnishingLevel?: string,
  isServicedApartment?: boolean
): ResidentialOpexBenchmark {
  return resolveResidentialOpexBenchmark(
    country,
    segment,
    positioning,
    residentialGlaSqft,
    furnishingLevel,
    isServicedApartment
  );
}
