import { normalizeRetailCountry } from "@/lib/benchmarks/retail-construction-costs";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";

export interface RetailOtherIncomeBenchmark {
  country: string;
  segment: string;
  positioning: string;

  avgTenantSalesPsf: number;
  salesGrowthPct: number;
  percentageRentRate: number;
  breakpointType: "natural" | "fixed";
  breakpointMultiple: number;

  camExpensesPerSqft: number;
  propertyTaxPerSqft: number;
  insurancePerSqft: number;
  recoveryRate: number;

  parkingRevenuePerSpaceDay: number;
  parkingUtilization: number;
  operatingDays: number;

  advertisingIncomeYear1: number;
  advertisingGrowthPct: number;
}

export const RETAIL_OTHER_INCOME_BENCHMARKS: RetailOtherIncomeBenchmark[] = [
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "luxury",
    avgTenantSalesPsf: 4500,
    salesGrowthPct: 3.5,
    percentageRentRate: 6,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 45,
    propertyTaxPerSqft: 30,
    insurancePerSqft: 4,
    recoveryRate: 96,
    parkingRevenuePerSpaceDay: 15,
    parkingUtilization: 75,
    operatingDays: 365,
    advertisingIncomeYear1: 750000,
    advertisingGrowthPct: 2.5,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "upscale",
    avgTenantSalesPsf: 3500,
    salesGrowthPct: 3.0,
    percentageRentRate: 5,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 40,
    propertyTaxPerSqft: 25,
    insurancePerSqft: 3,
    recoveryRate: 95,
    parkingRevenuePerSpaceDay: 12,
    parkingUtilization: 70,
    operatingDays: 365,
    advertisingIncomeYear1: 500000,
    advertisingGrowthPct: 2.0,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "mid_market",
    avgTenantSalesPsf: 2500,
    salesGrowthPct: 3.0,
    percentageRentRate: 5,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 35,
    propertyTaxPerSqft: 20,
    insurancePerSqft: 3,
    recoveryRate: 94,
    parkingRevenuePerSpaceDay: 10,
    parkingUtilization: 65,
    operatingDays: 365,
    advertisingIncomeYear1: 350000,
    advertisingGrowthPct: 2.0,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "value",
    avgTenantSalesPsf: 1800,
    salesGrowthPct: 2.5,
    percentageRentRate: 4,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 30,
    propertyTaxPerSqft: 18,
    insurancePerSqft: 2,
    recoveryRate: 92,
    parkingRevenuePerSpaceDay: 8,
    parkingUtilization: 60,
    operatingDays: 365,
    advertisingIncomeYear1: 200000,
    advertisingGrowthPct: 1.5,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "luxury",
    avgTenantSalesPsf: 3800,
    salesGrowthPct: 3.5,
    percentageRentRate: 6,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 40,
    propertyTaxPerSqft: 25,
    insurancePerSqft: 3,
    recoveryRate: 95,
    parkingRevenuePerSpaceDay: 12,
    parkingUtilization: 70,
    operatingDays: 365,
    advertisingIncomeYear1: 600000,
    advertisingGrowthPct: 2.5,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "upscale",
    avgTenantSalesPsf: 3000,
    salesGrowthPct: 3.0,
    percentageRentRate: 5,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 35,
    propertyTaxPerSqft: 20,
    insurancePerSqft: 3,
    recoveryRate: 94,
    parkingRevenuePerSpaceDay: 10,
    parkingUtilization: 65,
    operatingDays: 365,
    advertisingIncomeYear1: 400000,
    advertisingGrowthPct: 2.0,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "mid_market",
    avgTenantSalesPsf: 2200,
    salesGrowthPct: 3.0,
    percentageRentRate: 5,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 30,
    propertyTaxPerSqft: 18,
    insurancePerSqft: 2,
    recoveryRate: 93,
    parkingRevenuePerSpaceDay: 8,
    parkingUtilization: 60,
    operatingDays: 365,
    advertisingIncomeYear1: 300000,
    advertisingGrowthPct: 2.0,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "luxury",
    avgTenantSalesPsf: 3200,
    salesGrowthPct: 3.0,
    percentageRentRate: 5,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 35,
    propertyTaxPerSqft: 20,
    insurancePerSqft: 3,
    recoveryRate: 94,
    parkingRevenuePerSpaceDay: 8,
    parkingUtilization: 65,
    operatingDays: 365,
    advertisingIncomeYear1: 400000,
    advertisingGrowthPct: 2.0,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "upscale",
    avgTenantSalesPsf: 2500,
    salesGrowthPct: 3.0,
    percentageRentRate: 5,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 30,
    propertyTaxPerSqft: 18,
    insurancePerSqft: 2,
    recoveryRate: 93,
    parkingRevenuePerSpaceDay: 7,
    parkingUtilization: 60,
    operatingDays: 365,
    advertisingIncomeYear1: 300000,
    advertisingGrowthPct: 2.0,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "mid_market",
    avgTenantSalesPsf: 1800,
    salesGrowthPct: 2.5,
    percentageRentRate: 4,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 25,
    propertyTaxPerSqft: 15,
    insurancePerSqft: 2,
    recoveryRate: 92,
    parkingRevenuePerSpaceDay: 6,
    parkingUtilization: 55,
    operatingDays: 365,
    advertisingIncomeYear1: 200000,
    advertisingGrowthPct: 1.5,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "luxury",
    avgTenantSalesPsf: 5500,
    salesGrowthPct: 2.5,
    percentageRentRate: 6,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 55,
    propertyTaxPerSqft: 40,
    insurancePerSqft: 5,
    recoveryRate: 97,
    parkingRevenuePerSpaceDay: 18,
    parkingUtilization: 80,
    operatingDays: 365,
    advertisingIncomeYear1: 900000,
    advertisingGrowthPct: 2.0,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "upscale",
    avgTenantSalesPsf: 4200,
    salesGrowthPct: 2.5,
    percentageRentRate: 5,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 48,
    propertyTaxPerSqft: 35,
    insurancePerSqft: 4,
    recoveryRate: 96,
    parkingRevenuePerSpaceDay: 15,
    parkingUtilization: 75,
    operatingDays: 365,
    advertisingIncomeYear1: 650000,
    advertisingGrowthPct: 2.0,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "mid_market",
    avgTenantSalesPsf: 3200,
    salesGrowthPct: 2.5,
    percentageRentRate: 5,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 42,
    propertyTaxPerSqft: 30,
    insurancePerSqft: 4,
    recoveryRate: 95,
    parkingRevenuePerSpaceDay: 12,
    parkingUtilization: 70,
    operatingDays: 365,
    advertisingIncomeYear1: 450000,
    advertisingGrowthPct: 1.5,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "luxury",
    avgTenantSalesPsf: 2800,
    salesGrowthPct: 4.0,
    percentageRentRate: 5,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 30,
    propertyTaxPerSqft: 15,
    insurancePerSqft: 2,
    recoveryRate: 90,
    parkingRevenuePerSpaceDay: 6,
    parkingUtilization: 60,
    operatingDays: 365,
    advertisingIncomeYear1: 300000,
    advertisingGrowthPct: 3.0,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "upscale",
    avgTenantSalesPsf: 2200,
    salesGrowthPct: 3.5,
    percentageRentRate: 5,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 25,
    propertyTaxPerSqft: 12,
    insurancePerSqft: 2,
    recoveryRate: 88,
    parkingRevenuePerSpaceDay: 5,
    parkingUtilization: 55,
    operatingDays: 365,
    advertisingIncomeYear1: 220000,
    advertisingGrowthPct: 2.5,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "mid_market",
    avgTenantSalesPsf: 1600,
    salesGrowthPct: 3.5,
    percentageRentRate: 4,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 20,
    propertyTaxPerSqft: 10,
    insurancePerSqft: 2,
    recoveryRate: 85,
    parkingRevenuePerSpaceDay: 4,
    parkingUtilization: 50,
    operatingDays: 365,
    advertisingIncomeYear1: 150000,
    advertisingGrowthPct: 2.0,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "luxury",
    avgTenantSalesPsf: 3500,
    salesGrowthPct: 3.5,
    percentageRentRate: 5,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 35,
    propertyTaxPerSqft: 20,
    insurancePerSqft: 3,
    recoveryRate: 92,
    parkingRevenuePerSpaceDay: 8,
    parkingUtilization: 65,
    operatingDays: 365,
    advertisingIncomeYear1: 450000,
    advertisingGrowthPct: 2.5,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "upscale",
    avgTenantSalesPsf: 2800,
    salesGrowthPct: 3.0,
    percentageRentRate: 5,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 30,
    propertyTaxPerSqft: 18,
    insurancePerSqft: 2,
    recoveryRate: 90,
    parkingRevenuePerSpaceDay: 7,
    parkingUtilization: 60,
    operatingDays: 365,
    advertisingIncomeYear1: 350000,
    advertisingGrowthPct: 2.0,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "mid_market",
    avgTenantSalesPsf: 2000,
    salesGrowthPct: 3.0,
    percentageRentRate: 4,
    breakpointType: "natural",
    breakpointMultiple: 1.0,
    camExpensesPerSqft: 25,
    propertyTaxPerSqft: 15,
    insurancePerSqft: 2,
    recoveryRate: 88,
    parkingRevenuePerSpaceDay: 6,
    parkingUtilization: 55,
    operatingDays: 365,
    advertisingIncomeYear1: 250000,
    advertisingGrowthPct: 2.0,
  },
];

export const DEFAULT_RETAIL_OTHER_INCOME_BENCHMARK: RetailOtherIncomeBenchmark =
  RETAIL_OTHER_INCOME_BENCHMARKS.find(
    (b) =>
      b.country === "UAE" &&
      b.segment === "regional_mall" &&
      b.positioning === "mid_market"
  )!;

export function getRetailOtherIncomeBenchmark(
  country: string,
  segment: string,
  positioning: string
): RetailOtherIncomeBenchmark | null {
  const c = normalizeRetailCountry(country);
  const seg = (segment || "").trim();
  const pos = (positioning || "").trim();
  if (!seg || !pos) return null;
  return (
    RETAIL_OTHER_INCOME_BENCHMARKS.find(
      (b) => b.country === c && b.segment === seg && b.positioning === pos
    ) ?? null
  );
}

export function resolveRetailOtherIncomeBenchmark(
  country: string,
  segment: string,
  positioning: string
): RetailOtherIncomeBenchmark {
  const exact = getRetailOtherIncomeBenchmark(country, segment, positioning);
  if (exact) return exact;

  const c = normalizeRetailCountry(country || "UAE");
  const seg = (segment || "regional_mall").trim();
  const pos = (positioning || "mid_market").trim();

  const sameSegment = RETAIL_OTHER_INCOME_BENCHMARKS.filter(
    (b) => b.country === c && b.segment === seg
  );
  if (sameSegment.length) {
    return (
      sameSegment.find((b) => b.positioning === pos) ??
      sameSegment.find((b) => b.positioning === "mid_market") ??
      sameSegment[0]!
    );
  }

  const sameCountry = RETAIL_OTHER_INCOME_BENCHMARKS.filter(
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
    ...DEFAULT_RETAIL_OTHER_INCOME_BENCHMARK,
    country: c,
    segment: seg,
    positioning: pos,
  };
}

/** Default parking spaces from parking BUA (~350 sqft/space) or GLA heuristic. */
export function defaultParkingSpaces(
  parkingBUA: number,
  glaSqft: number
): number {
  if (parkingBUA > 0) return Math.max(1, Math.round(parkingBUA / 350));
  if (glaSqft > 0) return Math.max(1, Math.round(glaSqft / 800));
  return 500;
}

export function buildTenantSalesPsfSeries(
  salesYear1: number,
  growthPct: number,
  years = OPERATIONAL_ROOM_REVENUE_YEARS
): number[] {
  return Array.from({ length: years }, (_, i) => {
    const v = salesYear1 * Math.pow(1 + growthPct / 100, i);
    return Math.round(v);
  });
}

export function buildAdvertisingIncomeSeries(
  year1: number,
  growthPct: number,
  years = OPERATIONAL_ROOM_REVENUE_YEARS
): number[] {
  return Array.from({ length: years }, (_, i) => {
    const v = year1 * Math.pow(1 + growthPct / 100, i);
    return Math.round(v);
  });
}

export type RetailOtherIncomeSeriesInput = {
  glaSqft: number;
  leasedPercents: number[];
  baseRentPerSqftValues: number[];
  avgTenantSalesPsf: number;
  salesGrowthPct: number;
  percentageRentRate: number;
  breakpointType: "natural" | "fixed";
  breakpointMultiple: number;
  camExpensesPerSqft: number;
  propertyTaxPerSqft: number;
  insurancePerSqft: number;
  recoveryRate: number;
  parkingSpaces: number;
  parkingRevenuePerSpaceDay: number;
  parkingUtilization: number;
  operatingDays: number;
  advertisingIncomeYear1: number;
  advertisingGrowthPct: number;
};

export type RetailOtherIncomeSeries = {
  percentageRent: number[];
  camRecovery: number[];
  parking: number[];
  advertising: number[];
  total: number[];
};

export function computeRetailOtherIncomeSeries(
  input: RetailOtherIncomeSeriesInput,
  years = OPERATIONAL_ROOM_REVENUE_YEARS
): RetailOtherIncomeSeries {
  const salesPsf = buildTenantSalesPsfSeries(
    input.avgTenantSalesPsf,
    input.salesGrowthPct,
    years
  );
  const advertising = buildAdvertisingIncomeSeries(
    input.advertisingIncomeYear1,
    input.advertisingGrowthPct,
    years
  );

  const camPerSqft =
    input.camExpensesPerSqft +
    input.propertyTaxPerSqft +
    input.insurancePerSqft;
  const annualCam =
    camPerSqft * input.glaSqft * (input.recoveryRate / 100);

  const annualParking =
    input.parkingSpaces *
    input.parkingRevenuePerSpaceDay *
    (input.parkingUtilization / 100) *
    input.operatingDays;

  const percentageRent: number[] = [];
  const camRecovery: number[] = [];
  const parking: number[] = [];

  for (let i = 0; i < years; i++) {
    const leasedPct = input.leasedPercents[i] ?? 0;
    const leasedSqft = input.glaSqft * (leasedPct / 100);
    const baseRentPsf = input.baseRentPerSqftValues[i] ?? 0;
    const sales = salesPsf[i] ?? 0;

    let breakpointPsf = 0;
    if (input.breakpointType === "natural") {
      breakpointPsf =
        input.percentageRentRate > 0
          ? (baseRentPsf / (input.percentageRentRate / 100)) *
            input.breakpointMultiple
          : 0;
    } else {
      breakpointPsf = input.avgTenantSalesPsf * input.breakpointMultiple;
    }

    const excessPsf = Math.max(0, sales - breakpointPsf);
    percentageRent.push(
      Math.round(excessPsf * leasedSqft * (input.percentageRentRate / 100))
    );
    camRecovery.push(Math.round(annualCam));
    parking.push(Math.round(annualParking));
  }

  const total = percentageRent.map(
    (_, i) =>
      (percentageRent[i] ?? 0) +
      (camRecovery[i] ?? 0) +
      (parking[i] ?? 0) +
      (advertising[i] ?? 0)
  );

  return { percentageRent, camRecovery, parking, advertising, total };
}

export function applyYearSeriesOverrides(
  formula: number[],
  overrides: number[] | undefined,
  overrideFlags: boolean[] | undefined
): number[] {
  const n = formula.length;
  return Array.from({ length: n }, (_, i) => {
    if (overrideFlags?.[i] && overrides?.[i] != null) {
      return overrides[i]!;
    }
    return formula[i] ?? 0;
  });
}
