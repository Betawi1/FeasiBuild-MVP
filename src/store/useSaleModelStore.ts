"use client";

import useFinModelStore from "./useFinModelStore";
import type {
  CashInflows,
  CashOutflows,
  ProjectInfo,
} from "./useFinModelStore";
import { buildRecommendationQuery } from "@/app/sale/utils/db-mapping";
import {
  getRecommendations,
  interpolateSCurveProfile,
  HIRISE_RESIDENTIAL_18M,
  HIRISE_RESIDENTIAL_36M,
  LANDED_G2_ESTATE_24M,
  type ConstructionSCurveProfile,
  type SaleRecommendationBuildingType,
} from "@/app/sale/data/recommendations";
import { allocatePowcMonthlyFromStep13 } from "@/lib/cash-outflow-powc-timing";

const SALE_STREAM = "sale" as const;

export function updateSaleProjectInfo(data: Partial<ProjectInfo>) {
  useFinModelStore.getState().updateProjectInfo(data, SALE_STREAM);
}

export function updateSaleCashOutflows(data: Partial<CashOutflows>) {
  useFinModelStore.getState().updateCashOutflows(data, SALE_STREAM);
}

export function updateSaleCashInflows(data: Partial<CashInflows>) {
  useFinModelStore.getState().updateCashInflows(data, SALE_STREAM);
}

export function readSaleCashOutflows(): CashOutflows {
  return useFinModelStore.getState().sale.cashOutflows;
}

export function readSaleCashInflows(): CashInflows {
  return useFinModelStore.getState().sale.cashInflows;
}

export type SaleModelStoreApi = {
  projectInfo: ProjectInfo;
  cashOutflows: CashOutflows;
  cashInflows: CashInflows;
  updateProjectInfo: typeof updateSaleProjectInfo;
  updateCashOutflows: typeof updateSaleCashOutflows;
  updateCashInflows: typeof updateSaleCashInflows;
  readSaleCashOutflows: typeof readSaleCashOutflows;
  readSaleCashInflows: typeof readSaleCashInflows;
};

export default function useSaleModelStore<TResult>(
  selector: (api: SaleModelStoreApi) => TResult,
): TResult {
  return useFinModelStore((root) =>
    selector({
      projectInfo: root.sale.projectInfo,
      cashOutflows: root.sale.cashOutflows,
      cashInflows: root.sale.cashInflows,
      updateProjectInfo: updateSaleProjectInfo,
      updateCashOutflows: updateSaleCashOutflows,
      updateCashInflows: updateSaleCashInflows,
      readSaleCashOutflows,
      readSaleCashInflows,
    }),
  );
}

export type { CashInflows, CashOutflows, ProjectInfo };

export type CashOutflowStageHeader = {
  name: string;
  monthSpan: number;
};

export type SaleCashOutflowProfile = {
  months: number[];
  construction: number[];
  softCosts: number[];
  powc: number[];
  monthlyTotal: number[];
  cumulative: number[];
  stages: CashOutflowStageHeader[];
};

function buildProfileFromStageAllocation(
  sa: CashOutflows["stageAllocation"],
  constructionPeriod: number
): ConstructionSCurveProfile {
  const stage1Pct = sa.stage1Percent ?? 0;
  const stage2Pct = sa.stage2Percent ?? 0;
  const stage3Pct = sa.stage3Percent ?? 0;
  const stage4Pct = sa.stage4Percent ?? 0;

  const total = stage1Pct + stage2Pct + stage3Pct + stage4Pct || 100;
  const s1 = (stage1Pct / total) * 100;
  const s2 = (stage2Pct / total) * 100;
  const s3 = (stage3Pct / total) * 100;
  const s4 = (stage4Pct / total) * 100;

  const stage1Months = Math.round(constructionPeriod * (s1 / 100));
  const stage2Months = Math.round(constructionPeriod * (s2 / 100));
  const peakMonth = Math.max(
    1,
    stage1Months + Math.floor(stage2Months / 2)
  );

  // Bell-curve monthly shape (uniform stage spread is always ~flat)
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
  projectInfo: ProjectInfo,
  constructionPeriod: number,
  cashOutflows: CashOutflows
): ConstructionSCurveProfile {
  // 1. PRIMARY: Build profile dynamically from AI-researched stage allocations
  const sa = cashOutflows.stageAllocation;
  if (sa && sa.stage1Percent != null && sa.stage2Percent != null) {
    console.log("✅ PickTemplate: Using AI-researched construction stages.");
    return buildProfileFromStageAllocation(sa, constructionPeriod);
  }

  // 2. FALLBACK: If AI stages are missing, try the hardcoded recommendation database
  const params = buildRecommendationQuery(
    projectInfo.countryCode,
    projectInfo.buildingSubType,
    projectInfo.buildingConfig?.towerFloors
  );

  if (params) {
    const bt = params.buildingTypeDB as SaleRecommendationBuildingType;
    const floorsOrRange =
      bt === "residential-hi-rise" || bt === "commercial-strata-office"
        ? params.heightRange ?? projectInfo.buildingConfig?.towerFloors
        : undefined;

    const rec = getRecommendations(
      params.countryCode,
      bt,
      floorsOrRange as never
    );
    if (rec?.sCurveProfile) {
      console.log(
        "✅ PickTemplate: Found fallback match in hardcoded recommendations."
      );
      return rec.sCurveProfile;
    }
  }

  // 3. FINAL FALLBACK: Safe defaults based on building type
  console.warn(
    "⚠️ PickTemplate: No AI stages or recommendations found. Using safe default."
  );
  if (projectInfo.buildingSubType?.toLowerCase().includes("landed")) {
    return LANDED_G2_ESTATE_24M;
  }

  return HIRISE_RESIDENTIAL_36M;
}

export function buildSaleCashOutflowProfile(
  cashOutflows: CashOutflows,
  projectInfo: ProjectInfo
): SaleCashOutflowProfile {
  const constructionPeriod = cashOutflows.constructionPeriod || 0;

  if (constructionPeriod <= 0) {
    return {
      months: [],
      construction: [],
      softCosts: [],
      powc: [],
      monthlyTotal: [],
      cumulative: [],
      stages: [],
    };
  }

  const totalMonths = constructionPeriod + 1;
  const months = [0, ...Array.from({ length: constructionPeriod }, (_, i) => i + 1)];

  const constructionFinal = cashOutflows.constructionCost || 0;
  // 🚀 FORCE S-Curve: Prefer AI-researched stage allocation for construction distribution
  const construction = (() => {
    const template = pickTemplateForSale(
      projectInfo,
      constructionPeriod,
      cashOutflows
    );

    const monthlyPercentages = interpolateSCurveProfile(
      template,
      constructionPeriod
    );
    const out = Array(constructionPeriod + 1).fill(0);
    for (let m = 1; m <= constructionPeriod; m++) {
      out[m] = constructionFinal * ((monthlyPercentages[m - 1] || 0) / 100);
    }

    const sum = out.reduce((s, v) => s + (v || 0), 0);
    const diff = constructionFinal - sum;
    if (Math.abs(diff) > 1) out[out.length - 1] += diff;

    console.log("✅ S-Curve Applied (AI Researched or Fallback):", {
      M1: out[1],
      M2: out[2],
      M3: out[3],
      IsFlat: out[1] === out[2],
    });
    return out;
  })();

  const softCostsMonthly = Array(totalMonths).fill(0);
  const softCostsTotal = cashOutflows.softCosts || 0;
  if (softCostsTotal > 0) {
    softCostsMonthly[0] = softCostsTotal * 0.5;
    if (constructionPeriod > 1) softCostsMonthly[1] = softCostsTotal * 0.3;
    if (constructionPeriod > 2) softCostsMonthly[2] = softCostsTotal * 0.2;
  }

  const powcMonthly = allocatePowcMonthlyFromStep13(
    cashOutflows.powc || 0,
    constructionPeriod,
    cashOutflows.powcAllocation
  );

  const monthlyTotal = Array(totalMonths).fill(0);
  for (let m = 0; m < totalMonths; m++) {
    monthlyTotal[m] =
      (construction[m] || 0) + (softCostsMonthly[m] || 0) + (powcMonthly[m] || 0);
    if (m === 0) monthlyTotal[m] += cashOutflows.landCost || 0;
  }

  const cumulative = Array(totalMonths).fill(0);
  let cum = 0;
  for (let m = 0; m < totalMonths; m++) {
    cum += monthlyTotal[m] || 0;
    cumulative[m] = cum;
  }

  const sa = cashOutflows.stageAllocation;
  const s1Pct = sa?.stage1Percent || 0;
  const s2Pct = sa?.stage2Percent || 0;
  const s3Pct = sa?.stage3Percent || 0;

  const stage1EndCount = Math.max(0, Math.round(constructionPeriod * (s1Pct / 100)));
  const stage2EndCount = Math.max(
    stage1EndCount,
    Math.round(constructionPeriod * ((s1Pct + s2Pct) / 100))
  );
  const stage3EndCount = Math.max(
    stage2EndCount,
    Math.round(constructionPeriod * ((s1Pct + s2Pct + s3Pct) / 100))
  );

  const stages: CashOutflowStageHeader[] = [
    { name: sa?.stage1Label || "Stage 1", monthSpan: stage1EndCount },
    { name: sa?.stage2Label || "Stage 2", monthSpan: stage2EndCount - stage1EndCount },
    { name: sa?.stage3Label || "Stage 3", monthSpan: stage3EndCount - stage2EndCount },
    {
      name: sa?.stage4Label || "Stage 4",
      monthSpan: constructionPeriod - stage3EndCount,
    },
  ].filter((s) => s.monthSpan > 0);

  return {
    months,
    construction,
    softCosts: softCostsMonthly,
    powc: powcMonthly,
    monthlyTotal,
    cumulative,
    stages,
  };
}
