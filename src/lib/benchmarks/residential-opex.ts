import {
  getResidentialBenchmark,
  normalizeResidentialCountry,
} from "@/lib/benchmarks/residential-construction-costs";
import { estimatedUnitsFromGla } from "@/lib/benchmarks/residential-other-income";

export interface ResidentialOpexBenchmark {
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
}

const BASE: ResidentialOpexBenchmark = {
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

const SEGMENT_SCALE: Record<string, Partial<ResidentialOpexBenchmark>> = {
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

const POSITIONING_SCALE: Record<string, Partial<ResidentialOpexBenchmark>> = {
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

  let bench: ResidentialOpexBenchmark = {
    ...BASE,
    ...(SEGMENT_SCALE[seg] ?? {}),
    ...(POSITIONING_SCALE[pos] ?? {}),
    country: c,
    segment: seg,
    positioning: pos,
  };

  const units = estimatedUnitsFromGla(residentialGlaSqft, 800);
  const gla = Math.max(0, residentialGlaSqft);

  if (gla > 0) {
    bench.utilitiesFixedAnnual = Math.round(
      bench.utilitiesFixedAnnual * (gla / 200_000)
    );
    bench.propertyTaxAnnual = Math.round(
      (construction?.landRate ?? 3500) * gla * 0.012
    );
    bench.gAndAAnnual = Math.round(bench.gAndAAnnual * (units / 250));
  }

  if (isServicedApartment) {
    bench.mgmtFeePctOfEgi = Math.min(6, bench.mgmtFeePctOfEgi + 0.5);
    bench.maintenancePerUnitAnnual = Math.round(
      bench.maintenancePerUnitAnnual * 1.15
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
