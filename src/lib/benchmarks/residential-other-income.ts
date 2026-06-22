import {
  getResidentialBenchmark,
  normalizeResidentialCountry,
} from "@/lib/benchmarks/residential-construction-costs";

export const SQFT_PER_PARKING_SPACE = 350;
export const DEFAULT_AVG_UNIT_SQFT = 800;

export interface ResidentialOtherIncomeBenchmark {
  country: string;
  segment: string;
  positioning: string;

  avgUnitSqft: number;
  parkingFeePerMonth: number;
  parkingUptakePct: number;
  amenityFeePerUnitMonth: number;
  amenityUptakePct: number;
  utilityRecoveryPerUnitMonth: number;
  utilityUptakePct: number;
  otherFeesPerUnitAnnual: number;
  otherFeesUptakePct: number;
}

const BASE: ResidentialOtherIncomeBenchmark = {
  country: "UAE",
  segment: "high_rise",
  positioning: "grade_a",
  avgUnitSqft: 800,
  parkingFeePerMonth: 300,
  parkingUptakePct: 80,
  amenityFeePerUnitMonth: 150,
  amenityUptakePct: 90,
  utilityRecoveryPerUnitMonth: 100,
  utilityUptakePct: 70,
  otherFeesPerUnitAnnual: 200,
  otherFeesUptakePct: 30,
};

const SEGMENT_SCALE: Record<string, Partial<ResidentialOtherIncomeBenchmark>> = {
  high_rise: {
    avgUnitSqft: 750,
    parkingFeePerMonth: 350,
    amenityFeePerUnitMonth: 175,
  },
  mid_rise: {
    avgUnitSqft: 850,
    parkingFeePerMonth: 275,
    amenityFeePerUnitMonth: 140,
  },
  townhome: {
    avgUnitSqft: 1200,
    parkingFeePerMonth: 200,
    parkingUptakePct: 95,
    amenityFeePerUnitMonth: 120,
    amenityUptakePct: 85,
  },
  compact: {
    avgUnitSqft: 550,
    parkingFeePerMonth: 250,
    amenityFeePerUnitMonth: 100,
    utilityRecoveryPerUnitMonth: 85,
    otherFeesPerUnitAnnual: 150,
  },
};

const POSITIONING_SCALE: Record<string, Partial<ResidentialOtherIncomeBenchmark>> = {
  luxury: {
    parkingFeePerMonth: 450,
    amenityFeePerUnitMonth: 250,
    utilityRecoveryPerUnitMonth: 130,
    otherFeesPerUnitAnnual: 350,
    otherFeesUptakePct: 40,
  },
  grade_a: {},
  grade_b: {
    parkingFeePerMonth: 250,
    amenityFeePerUnitMonth: 120,
    utilityRecoveryPerUnitMonth: 85,
    otherFeesPerUnitAnnual: 175,
  },
  grade_c: {
    parkingFeePerMonth: 175,
    amenityFeePerUnitMonth: 75,
    utilityRecoveryPerUnitMonth: 60,
    otherFeesPerUnitAnnual: 100,
    otherFeesUptakePct: 20,
    parkingUptakePct: 65,
    amenityUptakePct: 75,
  },
};

export function parkingSpacesFromBua(
  parkingBua: number,
  basementBua: number
): number {
  const total = Math.max(0, parkingBua) + Math.max(0, basementBua);
  return total > 0 ? Math.max(1, Math.round(total / SQFT_PER_PARKING_SPACE)) : 0;
}

export function estimatedUnitsFromGla(
  residentialGlaSqft: number,
  avgUnitSqft: number
): number {
  const avg = avgUnitSqft > 0 ? avgUnitSqft : DEFAULT_AVG_UNIT_SQFT;
  const gla = Math.max(0, residentialGlaSqft);
  return gla > 0 ? Math.max(1, Math.round(gla / avg)) : 0;
}

export function resolveResidentialOtherIncomeBenchmark(
  country: string,
  segment: string,
  positioning: string,
  furnishingLevel?: string,
  isServicedApartment?: boolean
): ResidentialOtherIncomeBenchmark {
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

  let bench: ResidentialOtherIncomeBenchmark = {
    ...BASE,
    ...(SEGMENT_SCALE[seg] ?? {}),
    ...(POSITIONING_SCALE[pos] ?? {}),
    country: c,
    segment: seg,
    positioning: pos,
  };

  if (isServicedApartment) {
    bench = {
      ...bench,
      amenityFeePerUnitMonth: Math.round(bench.amenityFeePerUnitMonth * 1.15),
      utilityRecoveryPerUnitMonth: Math.round(
        bench.utilityRecoveryPerUnitMonth * 1.1
      ),
    };
  }

  if (construction?.blendedRentPsf) {
    const rentFactor = construction.blendedRentPsf / 160;
    bench.parkingFeePerMonth = Math.round(bench.parkingFeePerMonth * rentFactor);
    bench.amenityFeePerUnitMonth = Math.round(
      bench.amenityFeePerUnitMonth * rentFactor
    );
  }

  return bench;
}
