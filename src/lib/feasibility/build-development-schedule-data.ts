import {
  DEFAULT_POWC_ALLOCATION,
  DEFAULT_SOFT_COST_ALLOCATION,
} from "@/lib/cash-outflow-default-allocations";
import { allocatePowcSubMonthlyFromStep13 } from "@/lib/cash-outflow-powc-timing";
import { allocateSoftCostSubMonthly } from "@/lib/operational-cash-outflows-excel";
import type { DevelopmentScheduleData } from "@/types/feasibility";
import type { FeasibilityProjectBundle } from "@/types/feasibility";
import {
  aggregateMonthlyToYearly,
  type AnnualCashFlowPoint,
} from "@/lib/feasibility/utils";
import {
  buildCashOutflowProfile,
  type CashOutflows,
  type ProjectInfo,
} from "@/store/useFinModelStore";

function toThousands(n: number): number {
  return Math.round(n / 1000);
}

function yearlyThousands(monthly: number[]): AnnualCashFlowPoint[] {
  return aggregateMonthlyToYearly(monthly).map((y) => ({
    year: y.year,
    value: toThousands(y.value),
  }));
}

function landMonthlySeries(length: number, landCost: number): number[] {
  const arr = Array(Math.max(length, 1)).fill(0);
  arr[0] = landCost;
  return arr;
}

function buildSoftBreakdown(
  softTotal: number,
  softMonthly: number[],
  cashOutflows: CashOutflows
): DevelopmentScheduleData["softCosts"] {
  const sc = cashOutflows.softCostAllocation ?? {
    ...DEFAULT_SOFT_COST_ALLOCATION,
  };
  const sub = allocateSoftCostSubMonthly(softMonthly, softTotal, sc);

  const lines: {
    item: string;
    value: number;
    monthly: number[];
  }[] = [
    {
      item: "Main Architect",
      value: (softTotal * sc.architect) / 100,
      monthly: sub.architect,
    },
    {
      item: "Project Management",
      value: (softTotal * sc.projectManagement) / 100,
      monthly: sub.projectManagement,
    },
    {
      item: "Engineering Consultant",
      value: (softTotal * sc.engineering) / 100,
      monthly: sub.engineering,
    },
    {
      item: "Geotechnical Consultant",
      value: (softTotal * sc.geotechnical) / 100,
      monthly: sub.geotechnical,
    },
    {
      item: "Other Fees",
      value: (softTotal * sc.otherFees) / 100,
      monthly: sub.otherFees,
    },
  ];

  return {
    breakdown: lines.map((line) => ({
      item: line.item,
      value: toThousands(line.value),
      yearly: yearlyThousands(line.monthly),
    })),
    total: toThousands(softTotal),
    yearlyCashFlow: yearlyThousands(softMonthly),
  };
}

function buildPowcBreakdown(
  powcTotal: number,
  powcMonthly: number[],
  constructionPeriod: number,
  cashOutflows: CashOutflows
): DevelopmentScheduleData["powc"] {
  const po = cashOutflows.powcAllocation ?? { ...DEFAULT_POWC_ALLOCATION };
  const sub = allocatePowcSubMonthlyFromStep13(
    powcTotal,
    constructionPeriod,
    po
  );

  const lines: {
    item: string;
    value: number;
    monthly: number[];
  }[] = [
    {
      item: "Site Establishment",
      value: (powcTotal * po.siteEstablishment) / 100,
      monthly: sub.site,
    },
    {
      item: "Overhead",
      value: (powcTotal * po.overhead) / 100,
      monthly: sub.overhead,
    },
    {
      item: "Authority Fees",
      value: (powcTotal * po.authorityFees) / 100,
      monthly: sub.authority,
    },
  ];

  return {
    breakdown: lines.map((line) => ({
      item: line.item,
      value: toThousands(line.value),
      yearly: yearlyThousands(line.monthly),
    })),
    total: toThousands(powcTotal),
    yearlyCashFlow: yearlyThousands(powcMonthly),
  };
}

export function buildDevelopmentScheduleData(
  bundle: FeasibilityProjectBundle,
  cashOutflows: CashOutflows,
  projectInfo: ProjectInfo
): DevelopmentScheduleData {
  const profile = buildCashOutflowProfile(cashOutflows, projectInfo);
  const c = bundle.currency;
  const monthsLen = profile.months.length || cashOutflows.constructionPeriod + 1 || 1;

  const landCost = cashOutflows.landCost || 0;
  const landMonthly = landMonthlySeries(monthsLen, landCost);

  const constructionTotal = cashOutflows.constructionCost || 0;
  const ffeTotal = cashOutflows.ffe || 0;
  const softTotal = cashOutflows.softCosts || 0;
  const powcTotal = cashOutflows.powc || 0;

  const softCosts = buildSoftBreakdown(
    softTotal,
    profile.softCosts,
    cashOutflows
  );
  const powc = buildPowcBreakdown(
    powcTotal,
    profile.powc,
    cashOutflows.constructionPeriod || 0,
    cashOutflows
  );

  const totalMonthly = profile.monthlyTotal.length
    ? profile.monthlyTotal
    : landMonthly.map(
        (l, i) =>
          l +
          (profile.construction[i] ?? 0) +
          (profile.ffe[i] ?? 0) +
          (profile.softCosts[i] ?? 0) +
          (profile.powc[i] ?? 0)
      );

  const totalDevelopmentCost = cashOutflows.tdc || bundle.component4.tdc || 0;
  const yearlyHeaders = yearlyThousands(totalMonthly).map((y) => y.year);

  return {
    currency: c,
    yearlyHeaders,
    landAcquisition: {
      total: toThousands(landCost),
      yearlyCashFlow: yearlyThousands(landMonthly),
    },
    construction: {
      total: toThousands(constructionTotal),
      yearlyCashFlow: yearlyThousands(profile.construction),
    },
    ffe: {
      total: toThousands(ffeTotal),
      yearlyCashFlow: yearlyThousands(profile.ffe),
    },
    softCosts,
    powc,
    totalDevelopmentCost: toThousands(totalDevelopmentCost),
    totalYearlyCashFlow: yearlyThousands(totalMonthly),
  };
}

/** Fallback when full store context is unavailable (e.g. API-only aggregate). */
export function buildDevelopmentScheduleFromBundle(
  bundle: FeasibilityProjectBundle
): DevelopmentScheduleData {
  const c1 = bundle.component1;
  const cashOutflows: CashOutflows = {
    landCost: c1.landCost,
    constructionCost: c1.constructionCost,
    softCosts: c1.softCosts,
    ffe: c1.ffe,
    powc: c1.powc,
    tdc: bundle.component4.tdc,
    constructionPeriod: c1.constructionPeriod,
    contingencyPercent: 10,
    buildingBUA: c1.buildingBUA,
    parkingBUA: c1.parkingBUA,
    basementBUA: 0,
    buildingRate: c1.buildingRate,
    parkingRate: c1.parkingRate,
    basementRate: c1.basementRate,
    landArea: 0,
    landRate: 0,
    softCostPercent: 0,
    powcPercent: 0,
    ffePercent: 0,
    stageAllocation: {
      stage1Label: "Stage 1",
      stage1Percent: 25,
      stage2Label: "Stage 2",
      stage2Percent: 25,
      stage3Label: "Stage 3",
      stage3Percent: 25,
      stage4Label: "Stage 4",
      stage4Percent: 25,
    },
    powcStartMonth: 0,
    powcDurationMonths: 0,
    powcAllocation: { ...DEFAULT_POWC_ALLOCATION },
    softCostAllocation: { ...DEFAULT_SOFT_COST_ALLOCATION },
  };
  const projectInfo = {
    currency: bundle.currency as ProjectInfo["currency"],
    country: bundle.location.country,
    city: bundle.location.city,
    buildingType: "hotel" as const,
    hotelStarRating: "",
  } satisfies Pick<
    ProjectInfo,
    "currency" | "country" | "city" | "buildingType" | "hotelStarRating"
  >;
  return buildDevelopmentScheduleData(
    bundle,
    cashOutflows,
    projectInfo as ProjectInfo
  );
}

export function isDevelopmentScheduleData(
  data: unknown
): data is DevelopmentScheduleData {
  return (
    !!data &&
    typeof data === "object" &&
    "landAcquisition" in data &&
    "totalYearlyCashFlow" in data
  );
}
