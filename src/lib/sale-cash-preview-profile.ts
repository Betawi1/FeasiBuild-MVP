/**
 * Sale-stream cash outflow preview: stage-based construction + Step 13 soft/POWC sub-lines.
 * No FFE. POWC authority timing differs from `allocatePowcSubMonthlyFromStep13` (M0/M1 early).
 */

import type { CashInflows, CashOutflows, ProjectInfo } from "@/store/useFinModelStore";
import type { CashOutflowProfile, CashOutflowStageHeader } from "@/store/useFinModelStore";
import {
  generateWarehousePhasingSCurve,
  type WarehousePhasing,
  type WarehouseSubType,
} from "@/store/useFinModelStore";
import type { PowcAllocationFractions } from "@/lib/cash-outflow-default-allocations";
import { allocateFfeMonthly } from "@/lib/cash-outflow-ffe-timing";

import { allocatePowcSubMonthlyFromStep13 } from "@/lib/cash-outflow-powc-timing";
import {
  RECOMMENDATIONS,
  interpolateSCurveProfile,
  HIRISE_RESIDENTIAL_18M,
  HIRISE_RESIDENTIAL_36M,
  LANDED_G2_ESTATE_24M,
  type ConstructionSCurveProfile,
} from "@/app/sale/data/recommendations";

export type MonthlySeries = number[];

export type SalePreviewLine = {
  key: string;
  label: string;
  /** True for soft/POWC component rows — indent in UI */
  indent?: boolean;
  monthly: MonthlySeries;
  total: number;
};

export type SaleWarehouseMonthlyCosts = {
  buildingShell: MonthlySeries;
  siteYard: MonthlySeries;
  loadingAccess: MonthlySeries;
  specialisedSystems: MonthlySeries;
  commonInfra: MonthlySeries;
  contingency: MonthlySeries;
  ffe: MonthlySeries;
  /** Included in Construction Cost (total); shown as its own preview row. */
  professionalFees: MonthlySeries;
};

export type SaleWarehouseCostTotals = {
  buildingShell: number;
  siteYard: number;
  loadingAccess: number;
  specialisedSystems: number;
  commonInfra: number;
  contingency: number;
  ffe: number;
  professionalFees: number;
  /** Hard CapEx + contingency + land (excludes FFE — shown as its own row). */
  totalConstruction: number;
};

export type SaleCashflowDetailProfile = {
  months: number[];
  stages: CashOutflowStageHeader[];
  landCost: number;
  /** Total construction (incl. contingency) — same sum as sum of component monthlies */
  construction: MonthlySeries;
  constructionComponents: SalePreviewLine[];
  softCostsTotal: MonthlySeries;
  softCostLines: SalePreviewLine[];
  powcTotal: MonthlySeries;
  powcLines: SalePreviewLine[];
  /** Land M0 + construction + soft + POWC (no FFE) */
  monthlyTotal: MonthlySeries;
  cumulative: MonthlySeries;
  warehouseMonthlyCosts: SaleWarehouseMonthlyCosts;
  warehouseTotals: SaleWarehouseCostTotals;
};

function emptyWarehouseMonthlyCosts(len: number): SaleWarehouseMonthlyCosts {
  const zeros = () => Array.from({ length: len }, () => 0);
  return {
    buildingShell: zeros(),
    siteYard: zeros(),
    loadingAccess: zeros(),
    specialisedSystems: zeros(),
    commonInfra: zeros(),
    contingency: zeros(),
    ffe: zeros(),
    professionalFees: zeros(),
  };
}

function emptyWarehouseTotals(): SaleWarehouseCostTotals {
  return {
    buildingShell: 0,
    siteYard: 0,
    loadingAccess: 0,
    specialisedSystems: 0,
    commonInfra: 0,
    contingency: 0,
    ffe: 0,
    professionalFees: 0,
    totalConstruction: 0,
  };
}

function sumArr(a: number[]): number {
  return a.reduce((s, v) => s + (v || 0), 0);
}

function normalizeToTarget(arr: number[], target: number): number[] {
  if (arr.length === 0) return arr;
  const cur = sumArr(arr);
  const diff = target - cur;
  if (Math.abs(diff) < 1e-6) return arr;
  const next = [...arr];
  next[next.length - 1] = (next[next.length - 1] ?? 0) + diff;
  return next;
}

/** Spread `total` by monthly % weights (array sums to ~100). Length = period + 1 (incl. M0). */
function allocateByPhasingPct(
  total: number,
  pcts: number[] | undefined,
  monthCount: number
): number[] {
  const out = new Array(monthCount).fill(0);
  if (total <= 0 || monthCount <= 0) return out;
  if (!pcts || pcts.length === 0) {
    return allocateEqualAcrossConstructionMonths(total, monthCount - 1);
  }
  for (let m = 0; m < monthCount; m++) {
    out[m] = total * ((pcts[m] || 0) / 100);
  }
  return normalizeToTarget(out, total);
}

/** Equal across M1…M{period}; M0 = 0. */
function allocateEqualAcrossConstructionMonths(
  total: number,
  period: number
): number[] {
  const monthCount = Math.max(0, period) + 1;
  const out = new Array(monthCount).fill(0);
  if (total <= 0 || period <= 0) return out;
  const each = total / period;
  for (let m = 1; m <= period; m++) out[m] = each;
  return normalizeToTarget(out, total);
}

function toOpsWarehouseSubType(
  subType?: string | null
): WarehouseSubType {
  const map: Record<string, WarehouseSubType> = {
    "bulk-distribution": "BULK_DISTRIBUTION",
    "last-mile-urban": "LAST_MILE_URBAN",
    "multi-storey": "MULTI_STOREY",
    "cold-storage": "COLD_STORAGE",
    "light-manufacturing": "LIGHT_MANUFACTURING",
    BULK_DISTRIBUTION: "BULK_DISTRIBUTION",
    LAST_MILE_URBAN: "LAST_MILE_URBAN",
    MULTI_STOREY: "MULTI_STOREY",
    COLD_STORAGE: "COLD_STORAGE",
    LIGHT_MANUFACTURING: "LIGHT_MANUFACTURING",
  };
  return (subType && map[subType]) || "BULK_DISTRIBUTION";
}

function buildSaleWarehouseCapExBreakdown(
  cashOutflows: CashOutflows,
  projectInfo: ProjectInfo,
  constructionPeriod: number,
  totalMonths: number
): {
  warehouseMonthlyCosts: SaleWarehouseMonthlyCosts;
  warehouseTotals: SaleWarehouseCostTotals;
} {
  if (
    projectInfo.buildingSubType !== "commercial_strata_warehouse" ||
    totalMonths <= 0
  ) {
    return {
      warehouseMonthlyCosts: emptyWarehouseMonthlyCosts(totalMonths),
      warehouseTotals: emptyWarehouseTotals(),
    };
  }

  const isPark =
    projectInfo.salesWarehouseConfigType === "industrial-park";
  const costs = cashOutflows.warehouseCosts;

  const buildingShell =
    costs?.buildingShellCost ??
    (cashOutflows.warehouseBuildingRate ?? 0) *
      (cashOutflows.buildingBUA || 0);
  const siteYard =
    costs?.siteYardWorksCost ??
    (cashOutflows.warehouseSiteYardRate ?? 0) *
      (cashOutflows.landArea || 0);
  const loadingAccess =
    costs?.loadingAccessCost ?? cashOutflows.warehouseLoadingAccessCost ?? 0;
  const specialisedSystems =
    costs?.specialisedSystemsCost ??
    cashOutflows.warehouseSpecialisedSystemsCost ??
    0;
  const commonInfra = isPark
    ? costs?.commonInfrastructureCost ??
      cashOutflows.warehouseCommonInfraCost ??
      0
    : 0;
  const professionalFees = costs?.professionalFees ?? 0;

  const hardBase =
    buildingShell +
    siteYard +
    loadingAccess +
    specialisedSystems +
    commonInfra +
    professionalFees;

  const contingency =
    cashOutflows.baseConstructionCost != null &&
    (cashOutflows.constructionCost || 0) > 0
      ? Math.max(
          0,
          (cashOutflows.constructionCost || 0) -
            (cashOutflows.baseConstructionCost || hardBase)
        )
      : hardBase * ((cashOutflows.contingencyPercent || 0) / 100);

  const constructionWithContingency =
    cashOutflows.constructionCost || hardBase + contingency;

  const ffe =
    cashOutflows.ffe && cashOutflows.ffe > 0
      ? cashOutflows.ffe
      : constructionWithContingency * ((cashOutflows.ffePercent || 0) / 100);

  const phasing: WarehousePhasing =
    cashOutflows.warehousePhasing ||
    generateWarehousePhasingSCurve(
      constructionPeriod,
      toOpsWarehouseSubType(projectInfo.salesWarehouseSubType)
    );

  const buildingShellMonthly = allocateByPhasingPct(
    buildingShell,
    phasing.buildingShell,
    totalMonths
  );
  const siteYardMonthly = allocateByPhasingPct(
    siteYard,
    phasing.siteYardWorks,
    totalMonths
  );
  const loadingAccessMonthly = allocateByPhasingPct(
    loadingAccess,
    phasing.loadingAccess,
    totalMonths
  );
  const specialisedSystemsMonthly = allocateByPhasingPct(
    specialisedSystems,
    phasing.specialisedSystems,
    totalMonths
  );
  const commonInfraMonthly = allocateByPhasingPct(
    commonInfra,
    phasing.buildingShell,
    totalMonths
  );
  const professionalFeesMonthly = allocateEqualAcrossConstructionMonths(
    professionalFees,
    constructionPeriod
  );
  const contingencyMonthly = allocateEqualAcrossConstructionMonths(
    contingency,
    constructionPeriod
  );

  const hardMonthly = Array.from({ length: totalMonths }, (_, m) =>
    (buildingShellMonthly[m] || 0) +
    (siteYardMonthly[m] || 0) +
    (loadingAccessMonthly[m] || 0) +
    (specialisedSystemsMonthly[m] || 0) +
    (commonInfraMonthly[m] || 0) +
    (professionalFeesMonthly[m] || 0)
  );

  const ffeMonthly = allocateFfeMonthly(ffe, hardMonthly);

  const totalConstruction =
    hardBase + contingency + (cashOutflows.landCost || 0);

  return {
    warehouseMonthlyCosts: {
      buildingShell: buildingShellMonthly,
      siteYard: siteYardMonthly,
      loadingAccess: loadingAccessMonthly,
      specialisedSystems: specialisedSystemsMonthly,
      commonInfra: commonInfraMonthly,
      contingency: contingencyMonthly,
      ffe: ffeMonthly,
      professionalFees: professionalFeesMonthly,
    },
    warehouseTotals: {
      buildingShell,
      siteYard,
      loadingAccess,
      specialisedSystems,
      commonInfra,
      contingency,
      ffe,
      professionalFees,
      totalConstruction,
    },
  };
}

/** Site/overhead from shared Step 13 rules; authority uses Sale preview timing (M0/M1 + last 3). */
export function allocateSalePowcMonthlyFromStep13(
  powcTotal: number,
  constructionPeriod: number,
  allocation: PowcAllocationFractions
): number[] {
  const totalMonths = Math.max(0, constructionPeriod) + 1;
  const base = allocatePowcSubMonthlyFromStep13(
    powcTotal,
    constructionPeriod,
    allocation
  );
  const combined = base.site.map((v, i) => v + base.overhead[i] + base.authority[i]);
  const authorityAmount =
    powcTotal * (Math.max(0, allocation.authorityFees) / 100);
  if (authorityAmount <= 0 || constructionPeriod <= 0) {
    return combined;
  }

  // Remove old authority curve, insert Sale rule
  for (let i = 0; i < combined.length; i++) {
    combined[i] = base.site[i] + base.overhead[i];
  }

  const early = authorityAmount * 0.5;
  const late = authorityAmount * 0.5;
  combined[0] += early / 2;
  combined[1] += early / 2;

  const n = constructionPeriod;
  const startLate = Math.max(1, n - Math.min(3, n) + 1);
  const lateCount = n - startLate + 1;
  if (lateCount > 0) {
    const perLate = late / lateCount;
    for (let m = startLate; m <= n; m++) {
      combined[m] += perLate;
    }
  }

  return combined;
}

/**
 * Soft costs total: 50% M0, 30% M1, 20% M2 (same weights per sub-line amount).
 */
export function allocateSoftCostsAggregateMonthly(
  softTotal: number,
  constructionPeriod: number,
  totalMonths: number
): number[] {
  const arr = Array.from({ length: totalMonths }, () => 0);
  if (softTotal <= 0) return arr;
  arr[0] += softTotal * 0.5;
  if (constructionPeriod > 1) arr[1] += softTotal * 0.3;
  if (constructionPeriod > 2) arr[2] += softTotal * 0.2;
  return arr;
}

function allocateLineSoftMonthly(
  lineAmount: number,
  constructionPeriod: number,
  totalMonths: number
): number[] {
  return allocateSoftCostsAggregateMonthly(
    lineAmount,
    constructionPeriod,
    totalMonths
  );
}

/**
 * Construction cash: uniform within each Step 12 stage window (same boundaries as `buildCashOutflowProfile` headers).
 */
export function allocateConstructionCostByStages(
  totalCost: number,
  constructionPeriod: number,
  s1Pct: number,
  s2Pct: number,
  s3Pct: number
): number[] {
  const totalMonths = constructionPeriod + 1;
  const out = Array.from({ length: totalMonths }, () => 0);
  if (totalCost <= 0 || constructionPeriod <= 0) return out;

  const n = constructionPeriod;
  const stage1EndCount = Math.max(
    0,
    Math.round(n * (s1Pct / 100))
  );
  const stage2EndCount = Math.max(
    stage1EndCount,
    Math.round(n * ((s1Pct + s2Pct) / 100))
  );

  const sp1 = stage1EndCount;
  const sp2 = stage2EndCount - stage1EndCount;
  const sp3 = n - stage2EndCount;

  const wSum = (s1Pct + s2Pct + s3Pct) || 100;
  const c1 = totalCost * (s1Pct / wSum);
  const c2 = totalCost * (s2Pct / wSum);
  const c3 = totalCost * (s3Pct / wSum);

  const spread = (lo: number, hi: number, cost: number) => {
    if (cost <= 0 || hi < lo) return;
    const len = hi - lo + 1;
    for (let m = lo; m <= hi; m++) out[m] += cost / len;
  };

  let cursor = 1;
  let bucket2 = c2;
  let bucket3 = c3;

  if (sp1 > 0) {
    spread(cursor, cursor + sp1 - 1, c1);
    cursor += sp1;
  } else {
    bucket2 += c1;
  }

  if (sp2 > 0) {
    spread(cursor, cursor + sp2 - 1, bucket2);
    cursor += sp2;
  } else {
    bucket3 += bucket2;
  }

  if (sp3 > 0) {
    spread(cursor, n, bucket3);
  }

  return normalizeToTarget(out, totalCost);
}

/**
 * Convert AI/user stage cost shares into a full ConstructionSCurveProfile.
 * Monthly cash uses an industry S-curve shape (bell); stageDistribution keeps AI stages.
 */
function convertStageAllocationToProfile(
  stage1Pct: number,
  stage2Pct: number,
  stage3Pct: number,
  stage4Pct: number,
  constructionPeriod: number
): ConstructionSCurveProfile {
  const total = stage1Pct + stage2Pct + stage3Pct + stage4Pct || 100;
  const s1 = (stage1Pct / total) * 100;
  const s2 = (stage2Pct / total) * 100;
  const s3 = (stage3Pct / total) * 100;
  const s4 = (stage4Pct / total) * 100;

  // Approximate peak month (middle of stage 2)
  const stage1Months = Math.round(constructionPeriod * (s1 / 100));
  const stage2Months = Math.round(constructionPeriod * (s2 / 100));
  const peakMonth = Math.max(
    1,
    stage1Months + Math.floor(stage2Months / 2)
  );

  // Bell-curve monthly shape from industry templates (not flat stage-uniform spread)
  const baseTemplate =
    constructionPeriod <= 24 ? HIRISE_RESIDENTIAL_18M : HIRISE_RESIDENTIAL_36M;
  const monthlyPercentages = interpolateSCurveProfile(
    baseTemplate,
    constructionPeriod
  );

  return {
    monthlyPercentages,
    stageDistribution: {
      stage1Percent: s1,
      stage2Percent: s2,
      stage3Percent: s3,
      stage4Percent: s4,
    },
    peakMonth,
    typicalDuration: constructionPeriod,
  };
}

function pickTemplateForSale(
  projectInfo: any,
  constructionPeriod: number,
  cashOutflows?: CashOutflows
): ConstructionSCurveProfile {
  // 1. PRIMARY: Build profile dynamically from AI-researched stage allocations
  const sa = cashOutflows?.stageAllocation;
  if (sa && sa.stage1Percent != null && sa.stage2Percent != null) {
    console.log(
      "✅ [Preview Profile] Using AI-researched construction stages."
    );
    return convertStageAllocationToProfile(
      sa.stage1Percent,
      sa.stage2Percent,
      sa.stage3Percent || 0,
      sa.stage4Percent || 0,
      constructionPeriod
    );
  }

  // 2. FALLBACK: Hardcoded template lookup
  if (!projectInfo) return HIRISE_RESIDENTIAL_36M;

  const { buildingSubType, countryCode, buildingConfig } = projectInfo;
  const towerFloors = buildingConfig?.towerFloors || 10;

  // Map subType to DB key
  const bt = buildingSubType?.replace("_", "-") || "residential-landed";

  // Find country
  const countryRec = RECOMMENDATIONS[countryCode || "AE"];
  if (!countryRec) return HIRISE_RESIDENTIAL_36M;

  const buildingTypeRec =
    countryRec.buildingTypes[bt as keyof typeof countryRec.buildingTypes];

  if (!buildingTypeRec) {
    if (bt.includes("landed")) return LANDED_G2_ESTATE_24M;
    return constructionPeriod <= 24
      ? HIRISE_RESIDENTIAL_18M
      : HIRISE_RESIDENTIAL_36M;
  }

  // If it's a record of ranges (Hi-Rise/Strata) - USE towerFloors NUMBER for lookup
  if ("G+5-G+8" in (buildingTypeRec as any)) {
    const ranges = buildingTypeRec as any;

    let template: ConstructionSCurveProfile =
      (towerFloors <= 8
        ? ranges["G+5-G+8"]?.sCurveProfile
        : towerFloors <= 16
          ? ranges["G+9-G+16"]?.sCurveProfile
          : towerFloors <= 24
            ? ranges["G+17-G+24"]?.sCurveProfile
            : towerFloors <= 32
              ? ranges["G+25-G+32"]?.sCurveProfile
              : towerFloors <= 50
                ? ranges["G+33-G+50"]?.sCurveProfile
                : ranges["G+51+"]?.sCurveProfile) || HIRISE_RESIDENTIAL_36M;

    // 🔥 Ensure long construction periods don't use 18M template (peak M14)
    if (
      bt.includes("hi-rise") &&
      constructionPeriod >= 30 &&
      template.typicalDuration <= 24
    ) {
      template = HIRISE_RESIDENTIAL_36M;
    }

    console.log("🎯 [Template Selected]:", {
      buildingSubType,
      towerFloors,
      constructionPeriod,
      selectedPeakMonth: template?.peakMonth,
      selectedDuration: template?.typicalDuration,
    });

    return template;
  }

  // Direct profile (Landed)
  const template =
    (buildingTypeRec as any).sCurveProfile || LANDED_G2_ESTATE_24M;
  console.log("🎯 [Template Selected]:", {
    buildingSubType,
    towerFloors,
    constructionPeriod,
    selectedPeakMonth: template?.peakMonth,
    selectedDuration: template?.typicalDuration,
  });
  return template;
}

function buildStageHeaders(
  constructionPeriod: number,
  sa: CashOutflows["stageAllocation"]
): CashOutflowStageHeader[] {
  const n = constructionPeriod;
  const s1 = sa.stage1Percent || 0;
  const s2 = sa.stage2Percent || 0;
  const s3 = sa.stage3Percent || 0;
  const s4 = sa.stage4Percent || 0;

  const stage1EndCount = Math.max(0, Math.round(n * (s1 / 100)));
  const stage2EndCount = Math.max(
    stage1EndCount,
    Math.round(n * ((s1 + s2) / 100))
  );
  const stage3EndCount = Math.max(
    stage2EndCount,
    Math.round(n * ((s1 + s2 + s3) / 100))
  );

  const rawStages: CashOutflowStageHeader[] = [
    {
      name: sa.stage1Label || "Stage 1",
      monthSpan: stage1EndCount,
    },
    {
      name: sa.stage2Label || "Stage 2",
      monthSpan: stage2EndCount - stage1EndCount,
    },
    {
      name: sa.stage3Label || "Stage 3",
      monthSpan: stage3EndCount - stage2EndCount,
    },
    {
      name: sa.stage4Label || "Stage 4",
      monthSpan: constructionPeriod - stage3EndCount,
    },
  ];

  return rawStages.filter((s) => s.monthSpan > 0);
}

export function buildSaleCashflowDetailProfile(
  cashOutflows: CashOutflows,
  projectInfo: ProjectInfo
): SaleCashflowDetailProfile {
  const constructionPeriod = cashOutflows.constructionPeriod || 0;
  if (constructionPeriod <= 0) {
    return {
      months: [],
      stages: [],
      landCost: 0,
      construction: [],
      constructionComponents: [],
      softCostsTotal: [],
      softCostLines: [],
      powcTotal: [],
      powcLines: [],
      monthlyTotal: [],
      cumulative: [],
      warehouseMonthlyCosts: emptyWarehouseMonthlyCosts(0),
      warehouseTotals: emptyWarehouseTotals(),
    };
  }

  const months = [
    0,
    ...Array.from({ length: constructionPeriod }, (_, i) => i + 1),
  ];
  const totalMonths = months.length;
  const stages = buildStageHeaders(
    constructionPeriod,
    cashOutflows.stageAllocation
  );

  const constructionFinal = cashOutflows.constructionCost || 0;
  // --- CONSTRUCTION COST S-CURVE CALCULATION ---
  const templateProfile = pickTemplateForSale(
    projectInfo,
    constructionPeriod,
    cashOutflows
  );
  const monthlyPercentages = interpolateSCurveProfile(
    templateProfile,
    constructionPeriod
  );

  const pctSum = monthlyPercentages.reduce((a, b) => a + b, 0);
  console.log("📊 [S-Curve Percentages]:", {
    length: monthlyPercentages.length,
    sum: pctSum.toFixed(4),
    shouldBe: 100,
    first5: monthlyPercentages.slice(0, 5),
    last5: monthlyPercentages.slice(-5),
  });

  // Calculate monthly values
  const construction: number[] = [0]; // M0 = 0
  let runningTotal = 0;

  for (let m = 1; m <= constructionPeriod; m++) {
    const pct = monthlyPercentages[m - 1] || 0;
    const monthlyValue = constructionFinal * (pct / 100);
    construction.push(monthlyValue);
    runningTotal += monthlyValue;

    // 🔍 DEBUG: Log first 3 months to verify distribution
    if (m <= 3) {
      console.log(`🔍 [Month ${m}]:`, {
        percentage: pct,
        constructionFinal,
        calculatedValue: monthlyValue,
        formula: `${constructionFinal} × (${pct} / 100) = ${monthlyValue}`,
      });
    }
  }

  // 🔍 DEBUG: Verify if values are flat or varied
  const firstValue = construction[1] || 0;
  const isFlat = construction
    .slice(1, constructionPeriod + 1)
    .every((v) => Math.abs(v - firstValue) < 1);
  console.log("🔍 [Construction Distribution Check]:", {
    constructionFinal,
    firstValue,
    isFlat,
    sampleValues: construction.slice(1, 6),
    shouldBeVaried: !isFlat,
  });

  // 🔍 DEBUG: Log first 5 months of construction distribution
  console.log("🔍 [Construction Distribution Debug]:", {
    constructionFinal,
    first5Months: construction.slice(0, 6).map((v, i) => ({
      month: `M${i}`,
      percentage: monthlyPercentages[i - 1] || 0,
      calculatedValue: v,
    })),
    sumBeforePlug: runningTotal,
  });

  // AGGRESSIVE PLUG: Force exact match
  const diff = constructionFinal - runningTotal;
  console.log("🔧 [Construction Plug]:", {
    targetTotal: constructionFinal,
    currentSum: runningTotal,
    difference: diff,
    lastMonthBefore: construction[construction.length - 1],
  });

  // Add difference to last month
  construction[construction.length - 1] += diff;

  // VERIFY final sum
  const finalSum = construction.reduce((a, b) => a + b, 0);
  console.log("✅ [Construction Total]:", {
    finalSum,
    matches: Math.abs(finalSum - constructionFinal) < 1,
  });

  console.log("✅ [Preview Profile] S-Curve Applied:", {
    peakMonth: templateProfile.peakMonth,
    constructionPeriod,
    profileLength: monthlyPercentages.length,
  });

  const landCost = cashOutflows.landCost || 0;
  const softTotal = cashOutflows.softCosts || 0;
  const powcTotalAmt = cashOutflows.powc || 0;

  const po = cashOutflows.powcAllocation;
  const powcMonthly = allocateSalePowcMonthlyFromStep13(
    powcTotalAmt,
    constructionPeriod,
    po
  );

  const softMonthly = allocateSoftCostsAggregateMonthly(
    softTotal,
    constructionPeriod,
    totalMonths
  );

  const sc = cashOutflows.softCostAllocation;
  const pct = (p: number) => Math.max(0, p) / 100;

  const softLines: SalePreviewLine[] = [
    {
      key: "architect",
      label: "Main Architect",
      indent: true,
      monthly: allocateLineSoftMonthly(
        softTotal * pct(sc.architect),
        constructionPeriod,
        totalMonths
      ),
      total: softTotal * pct(sc.architect),
    },
    {
      key: "pm",
      label: "Project Management",
      indent: true,
      monthly: allocateLineSoftMonthly(
        softTotal * pct(sc.projectManagement),
        constructionPeriod,
        totalMonths
      ),
      total: softTotal * pct(sc.projectManagement),
    },
    {
      key: "eng",
      label: "Engineering Consultant",
      indent: true,
      monthly: allocateLineSoftMonthly(
        softTotal * pct(sc.engineering),
        constructionPeriod,
        totalMonths
      ),
      total: softTotal * pct(sc.engineering),
    },
    {
      key: "geo",
      label: "Geotechnical Consultant",
      indent: true,
      monthly: allocateLineSoftMonthly(
        softTotal * pct(sc.geotechnical),
        constructionPeriod,
        totalMonths
      ),
      total: softTotal * pct(sc.geotechnical),
    },
    {
      key: "other",
      label: "Other Fees",
      indent: true,
      monthly: allocateLineSoftMonthly(
        softTotal * pct(sc.otherFees),
        constructionPeriod,
        totalMonths
      ),
      total: softTotal * pct(sc.otherFees),
    },
  ];

  // Nudge soft sub-lines so they sum to softMonthly each month (rounding)
  for (let mi = 0; mi < totalMonths; mi++) {
    const sumSub = softLines.reduce((s, L) => s + (L.monthly[mi] || 0), 0);
    const diff = softMonthly[mi] - sumSub;
    if (Math.abs(diff) > 1e-6 && softLines.length > 0) {
      const last = softLines[softLines.length - 1]!;
      last.monthly[mi] = (last.monthly[mi] || 0) + diff;
    }
  }

  const siteAmt = powcTotalAmt * pct(po.siteEstablishment);
  const ohAmt = powcTotalAmt * pct(po.overhead);
  const authAmt = powcTotalAmt * pct(po.authorityFees);

  const siteCurve = allocatePowcSubMonthlyFromStep13(
    powcTotalAmt,
    constructionPeriod,
    {
      ...po,
      overhead: 0,
      authorityFees: 0,
    }
  ).site;
  const ohCurve = allocatePowcSubMonthlyFromStep13(
    powcTotalAmt,
    constructionPeriod,
    {
      ...po,
      siteEstablishment: 0,
      authorityFees: 0,
    }
  ).overhead;
  const authCurve = allocateSalePowcMonthlyFromStep13(authAmt, constructionPeriod, {
    siteEstablishment: 0,
    overhead: 0,
    authorityFees: 100,
  });

  const powcChildLines: SalePreviewLine[] = [
    {
      key: "site",
      label: "Site Establishment",
      indent: true,
      monthly: siteCurve,
      total: siteAmt,
    },
    {
      key: "overhead",
      label: "Overhead Costs",
      indent: true,
      monthly: ohCurve,
      total: ohAmt,
    },
    {
      key: "authority",
      label: "Authority Fees",
      indent: true,
      monthly: authCurve,
      total: authAmt,
    },
  ];

  for (const line of powcChildLines) {
    const s = sumArr(line.monthly);
    const d = line.total - s;
    if (Math.abs(d) > 1 && line.monthly.length > 0) {
      const L = line.monthly.length - 1;
      line.monthly[L] = (line.monthly[L] || 0) + d;
    }
  }

  const monthlyTotal = Array.from({ length: totalMonths }, () => 0);
  for (let m = 0; m < totalMonths; m++) {
    monthlyTotal[m] =
      construction[m] +
      softMonthly[m] +
      powcMonthly[m] +
      (m === 0 ? landCost : 0);
  }

  const tdcFromStore = cashOutflows.tdc || 0;
  const currentFinal = sumArr(monthlyTotal);
  const diffTdc = tdcFromStore - currentFinal;
  if (Math.abs(diffTdc) > 1 && totalMonths > 0) {
    monthlyTotal[totalMonths - 1] += diffTdc;
  }

  const cumulative = Array.from({ length: totalMonths }, () => 0);
  let cum = 0;
  for (let m = 0; m < totalMonths; m++) {
    cum += monthlyTotal[m];
    cumulative[m] = cum;
  }

  // Construction component $ (pre-contingency splits proportional to CC monthly)
  const bc = projectInfo.buildingConfig;
  const buildingAmt = cashOutflows.buildingBUA * cashOutflows.buildingRate;
  const parkingAmt = cashOutflows.parkingBUA * cashOutflows.parkingRate;
  const basementAmt = cashOutflows.basementBUA * cashOutflows.basementRate;
  const landedSaleable =
    (bc.landedUnits ?? 0) * (bc.landedLandAreaPerUnit ?? 0);
  const landedLandArea =
    landedSaleable > 0 ? landedSaleable / 0.7 : 0;
  const isLanded = projectInfo.buildingSubType?.includes("landed");
  const infraAmt = isLanded
    ? (cashOutflows.infrastructureRate ?? 0) * landedLandArea
    : 0;

  const compSum =
    buildingAmt + parkingAmt + basementAmt + (isLanded ? infraAmt : 0);
  const constructionComponents: SalePreviewLine[] = [];

  const addComp = (label: string, key: string, amt: number) => {
    if (key === "infra" && !isLanded) return;
    if (amt <= 0 && key !== "infra") return;
    const share = compSum > 0 ? amt / compSum : 0;
    const monthly = construction.map((v) => v * share);
    constructionComponents.push({
      key,
      label,
      indent: true,
      monthly: normalizeToTarget(monthly, constructionFinal * share),
      total: constructionFinal * share,
    });
  };

  addComp("Building Rate", "building", buildingAmt);
  addComp("Parking Rate", "parking", parkingAmt);
  addComp("Basement Rate", "basement", basementAmt);
  if (isLanded) {
    addComp("Infrastructure Rate", "infra", infraAmt);
  }

  // Normalize component monthlies to construction row where rounding differs
  for (let mi = 0; mi < totalMonths; mi++) {
    const rowSum = constructionComponents.reduce(
      (s, r) => s + (r.monthly[mi] || 0),
      0
    );
    const d = construction[mi] - rowSum;
    if (Math.abs(d) > 1e-4 && constructionComponents.length > 0) {
      const last = constructionComponents[constructionComponents.length - 1]!;
      last.monthly[mi] = (last.monthly[mi] || 0) + d;
    }
  }

  const warehouseBreakdown = buildSaleWarehouseCapExBreakdown(
    cashOutflows,
    projectInfo,
    constructionPeriod,
    totalMonths
  );

  return {
    months,
    stages,
    landCost,
    construction,
    constructionComponents,
    softCostsTotal: softMonthly,
    softCostLines: softLines,
    powcTotal: powcMonthly,
    powcLines: powcChildLines,
    monthlyTotal,
    cumulative,
    warehouseMonthlyCosts: warehouseBreakdown.warehouseMonthlyCosts,
    warehouseTotals: warehouseBreakdown.warehouseTotals,
  };
}

/** Bridge: legacy profile shape for code that expects `CashOutflowProfile` (ffe zeros). */
export function saleDetailToCashflowProfileShape(
  d: SaleCashflowDetailProfile
): Pick<
  CashOutflowProfile,
  | "months"
  | "construction"
  | "ffe"
  | "softCosts"
  | "powc"
  | "monthlyTotal"
  | "cumulative"
  | "stages"
> {
  const n = d.months.length;
  return {
    months: d.months,
    construction: d.construction,
    ffe: Array.from({ length: n }, () => 0),
    softCosts: d.softCostsTotal,
    powc: d.powcTotal,
    monthlyTotal: d.monthlyTotal,
    cumulative: d.cumulative,
    stages: d.stages,
  };
}

export type SalePreFinancingCashFlows = {
  months: number[];
  constructionPeriod: number;
  inflow: MonthlySeries;
  outflow: MonthlySeries;
  net: MonthlySeries;
  detail: SaleCashflowDetailProfile;
};

/**
 * Single source of truth for Components 1+2 pre-financing cash flows.
 * Used by `/preview/cash-inflows` and `/preview/project-irr` so NCF matches exactly.
 */
export function buildSalePreFinancingCashFlows(
  cashOutflows: CashOutflows,
  cashInflows: Pick<CashInflows, "monthlyInflowSchedule">,
  projectInfo: ProjectInfo,
  options?: { postCompletionBuffer?: number }
): SalePreFinancingCashFlows {
  const constructionPeriod = cashOutflows.constructionPeriod || 30;
  const postCompletionBuffer = options?.postCompletionBuffer ?? 6;
  const lastMonthIndex = constructionPeriod + postCompletionBuffer;
  const months = Array.from({ length: lastMonthIndex + 1 }, (_, i) => i);
  const detail = buildSaleCashflowDetailProfile(cashOutflows, projectInfo);
  const isWarehouse =
    projectInfo.buildingSubType === "commercial_strata_warehouse";

  const inflowByMonth = new Map<number, number>();
  for (const p of cashInflows.monthlyInflowSchedule || []) {
    inflowByMonth.set(
      p.month,
      (inflowByMonth.get(p.month) || 0) + (p.amount || 0)
    );
  }

  const inflow = months.map((m) => inflowByMonth.get(m) || 0);

  const outflow = months.map((m) => {
    if (m > constructionPeriod) return 0;
    if (isWarehouse) {
      const land = m === 0 ? cashOutflows.landCost || 0 : 0;
      const construction = detail.construction[m] || 0;
      const soft = detail.softCostsTotal[m] || 0;
      const powc = detail.powcTotal[m] || 0;
      const ffe = detail.warehouseMonthlyCosts?.ffe?.[m] || 0;
      return land + construction + soft + powc + ffe;
    }
    return detail.monthlyTotal[m] || 0;
  });

  const net = months.map((m) => (inflow[m] || 0) - (outflow[m] || 0));

  return {
    months,
    constructionPeriod,
    inflow,
    outflow,
    net,
    detail,
  };
}
