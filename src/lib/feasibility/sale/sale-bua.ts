/**
 * Sale-stream BUA single source of truth.
 *
 * Component 1 configuration is the only stored Total / Saleable BUA:
 * high-rise `salesHighRiseTotalBUA` + `salesHighRiseSaleableRatio`,
 * landed units × BUA/unit + `salesLandedSaleableRatio`,
 * warehouse template BUA at 100% saleable.
 *
 * `saleableBua` is always derived (rounded). C2 and the feasibility bundle
 * must not keep an independent vintage.
 */

export const SALE_BUA_CACHE_EPOCH = "c1-sale-bua-v1";

export type SaleBuaSource = "ai" | "override" | "default";

export type SaleBuaFigures = {
  totalBuildingBua: number;
  saleableBuaRatio: number;
  saleableBua: number;
};

export type SaleBuaProjectInfo = {
  buildingSubType?: string;
  salesHighRiseTotalBUA?: number;
  salesHighRiseSaleableRatio?: number;
  salesLandedNumUnits?: number;
  salesLandedBUAperUnit?: number;
  salesLandedSaleableRatio?: number;
  salesWarehouseConfigType?: string;
  salesWarehouseSingle?: { bua?: number };
  salesWarehousePark?: { numberOfUnits?: number };
};

export type SaleBuaFieldSources = Record<string, SaleBuaSource | undefined>;

export type SaleBuaCashOutflows = {
  buildingBUA: number;
  constructionPeriod?: number;
  fieldSources?: SaleBuaFieldSources;
};

export type SaleRevenueBuyerMix = {
  brokerCommissionPercent: number;
  vatPercent: number;
  escrowFeePercent: number;
  salesDiscountPercent: number;
};

export type SaleRevenueCashInflows = {
  saleableBUARatio: number;
  salesPrice: number;
  grossSales: number;
  netProceeds: number;
  monthlyInflowSchedule: { month: number; amount: number }[];
  fieldSources?: SaleBuaFieldSources;
  buyerMix: SaleRevenueBuyerMix;
  defaultRate: number;
  bulkSales: {
    bulkSalesSharePercent: number;
    bulkSalesDiscountPercent: number;
  };
  salesUptake: {
    mode: "preset" | "manual";
    preset: string;
    manualCsv: string;
  };
  launchTiming: {
    preLaunchSalesPercent: number;
  };
};

export type SaleRevenueSchedule = {
  grossSales: number;
  netProceeds: number;
  monthlyInflowSchedule: { month: number; amount: number }[];
};

const C1_BUA_INPUT_KEYS = [
  "buildingSubType",
  "salesHighRiseTotalBUA",
  "salesHighRiseSaleableRatio",
  "salesLandedNumUnits",
  "salesLandedBUAperUnit",
  "salesLandedSaleableRatio",
  "salesWarehouseConfigType",
  "salesWarehouseSingle",
  "salesWarehousePark",
] as const;

/** AI research must not write BUA. Area changes only through C1 fields. */
export const SALE_BUA_AI_BLOCKLIST = [
  "buildingBUA",
  "parkingBUA",
  "basementBUA",
  "saleableBUARatio",
  "salesHighRiseTotalBUA",
  "salesHighRiseSaleableRatio",
  "salesLandedBUAperUnit",
  "salesLandedSaleableRatio",
] as const;

export function isSaleLandedProduct(buildingSubType?: string): boolean {
  return Boolean(buildingSubType?.includes("landed"));
}

export function isSaleWarehouseProduct(buildingSubType?: string): boolean {
  return buildingSubType === "commercial_strata_warehouse";
}

export function saleC1BuaInputTouched(
  patch: object | null | undefined
): boolean {
  if (!patch) return false;
  return C1_BUA_INPUT_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(patch, key)
  );
}

export function omitSaleBuaAiFields<T extends Record<string, unknown>>(
  patch: T
): T {
  const next = { ...patch };
  for (const key of SALE_BUA_AI_BLOCKLIST) {
    delete next[key];
  }
  return next;
}

function warehouseTotalBua(projectInfo: SaleBuaProjectInfo): number {
  const config = projectInfo.salesWarehouseConfigType;
  const perUnit = projectInfo.salesWarehouseSingle?.bua || 0;
  if (config === "industrial-park") {
    return (projectInfo.salesWarehousePark?.numberOfUnits || 0) * perUnit;
  }
  return perUnit;
}

function roundSaleable(total: number, ratioPct: number): number {
  return Math.round(total * (ratioPct / 100));
}

/** C1 configuration only. Ignores C2 / cash-outflow copies. */
export function deriveC1SaleBua(projectInfo: SaleBuaProjectInfo): SaleBuaFigures {
  if (isSaleWarehouseProduct(projectInfo.buildingSubType)) {
    const totalBuildingBua = warehouseTotalBua(projectInfo);
    return {
      totalBuildingBua,
      saleableBuaRatio: 100,
      saleableBua: totalBuildingBua,
    };
  }
  if (isSaleLandedProduct(projectInfo.buildingSubType)) {
    const totalBuildingBua =
      (projectInfo.salesLandedNumUnits || 0) *
      (projectInfo.salesLandedBUAperUnit || 0);
    const saleableBuaRatio = projectInfo.salesLandedSaleableRatio || 0;
    return {
      totalBuildingBua,
      saleableBuaRatio,
      saleableBua: roundSaleable(totalBuildingBua, saleableBuaRatio),
    };
  }
  const totalBuildingBua = projectInfo.salesHighRiseTotalBUA || 0;
  const saleableBuaRatio = projectInfo.salesHighRiseSaleableRatio || 0;
  return {
    totalBuildingBua,
    saleableBuaRatio,
    saleableBua: roundSaleable(totalBuildingBua, saleableBuaRatio),
  };
}

/** C2 Step 1 / ASP panel. Same figures as C1 — no stored copy. */
export function selectSalePanelBua(
  projectInfo: SaleBuaProjectInfo
): SaleBuaFigures {
  return deriveC1SaleBua(projectInfo);
}

function sourceIsOverride(
  sources: SaleBuaFieldSources | undefined,
  key: string
): boolean {
  return sources?.[key] === "override";
}

/**
 * Building area used for construction-cost math.
 * Follows C1 unless the user explicitly overrode `buildingBUA`.
 */
export function saleCostBuildingBua(
  projectInfo: SaleBuaProjectInfo,
  cashOutflows: Pick<SaleBuaCashOutflows, "buildingBUA" | "fieldSources">
): number {
  if (sourceIsOverride(cashOutflows.fieldSources, "buildingBUA")) {
    return cashOutflows.buildingBUA || 0;
  }
  const canonical = deriveC1SaleBua(projectInfo).totalBuildingBua;
  return canonical > 0 ? canonical : cashOutflows.buildingBUA || 0;
}

/**
 * Uptake / mix / revenue schedule. GDV (grossSales) is saleableBua × ASP.
 * Same weighting as Component 2 "Generate Model".
 */
export function buildSaleRevenueSchedule(
  cashInflows: SaleRevenueCashInflows,
  constructionPeriod: number | undefined,
  saleableBua: number
): SaleRevenueSchedule {
  const grossSales = saleableBua * (cashInflows.salesPrice || 0);
  const deductionsPercent =
    (cashInflows.buyerMix?.brokerCommissionPercent || 0) +
    (cashInflows.buyerMix?.vatPercent || 0) +
    (cashInflows.buyerMix?.escrowFeePercent || 0) +
    (cashInflows.buyerMix?.salesDiscountPercent || 0) +
    (cashInflows.defaultRate || 0) +
    ((cashInflows.bulkSales?.bulkSalesSharePercent || 0) *
      (cashInflows.bulkSales?.bulkSalesDiscountPercent || 0)) /
      100;
  const netProceeds = grossSales * (1 - Math.max(0, deductionsPercent) / 100);

  const period = constructionPeriod || 30;
  const postCompletionBufferMonths = 6;
  const months = Math.max(1, period + postCompletionBufferMonths);
  const weights: number[] = [];
  if (cashInflows.salesUptake?.mode === "manual") {
    const parts = (cashInflows.salesUptake.manualCsv || "")
      .split(",")
      .map((p) => Number(p.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0);
    const sum = parts.reduce((s, n) => s + n, 0) || 1;
    for (let i = 0; i < months; i++) {
      const idx = i < parts.length ? i : Math.max(0, parts.length - 1);
      weights.push((parts[idx] ?? 0) / sum);
    }
  } else {
    for (let i = 0; i < months; i++) {
      let w = 1;
      if (cashInflows.salesUptake?.preset === "front_loaded") {
        w = months - i;
      } else if (cashInflows.salesUptake?.preset === "back_loaded") {
        w = i + 1;
      }
      weights.push(w);
    }
    const sum = weights.reduce((s, n) => s + n, 0) || 1;
    for (let i = 0; i < months; i++) {
      weights[i] = (weights[i] ?? 0) / sum;
    }
  }

  const preLaunchPct = Math.max(
    0,
    Math.min(100, cashInflows.launchTiming?.preLaunchSalesPercent || 0)
  );
  const preLaunchAmount = netProceeds * (preLaunchPct / 100);
  const remainingProceeds = Math.max(0, netProceeds - preLaunchAmount);
  return {
    grossSales,
    netProceeds,
    monthlyInflowSchedule: [
      { month: 0, amount: preLaunchAmount },
      ...weights.map((w, i) => ({
        month: i + 1,
        amount: remainingProceeds * w,
      })),
    ],
  };
}

export type SaleBuaReconcileResult<
  P extends SaleBuaProjectInfo,
  O extends SaleBuaCashOutflows,
  I extends SaleRevenueCashInflows,
> = {
  projectInfo: P;
  cashOutflows: O;
  cashInflows: I;
  bua: SaleBuaFigures;
  changed: boolean;
};

function hasGeneratedSchedule(cashInflows: SaleRevenueCashInflows): boolean {
  return (
    (cashInflows.monthlyInflowSchedule?.length ?? 0) > 0 ||
    (cashInflows.grossSales || 0) > 0
  );
}

/**
 * On project open, stale C2 copies (source ai/default/missing) are replaced
 * by C1. A copy tagged `override` is kept and, for high-rise, written back
 * onto C1 so every reader still sees one figure.
 *
 * Pass `c1Authoritative` when the user just edited C1: that edit wins over
 * an older override tag, and the schedule is recomputed immediately.
 */
export function reconcileSaleBuaState<
  P extends SaleBuaProjectInfo,
  O extends SaleBuaCashOutflows,
  I extends SaleRevenueCashInflows,
>(
  projectInfo: P,
  cashOutflows: O,
  cashInflows: I,
  options?: { c1Authoritative?: boolean }
): SaleBuaReconcileResult<P, O, I> {
  let nextInfo = projectInfo;
  let nextOut = cashOutflows;
  let nextIn = cashInflows;

  const patchInfo = (partial: Partial<SaleBuaProjectInfo>) => {
    nextInfo = { ...nextInfo, ...partial };
  };
  const patchOut = (partial: Partial<SaleBuaCashOutflows>) => {
    nextOut = { ...nextOut, ...partial } as O;
  };
  const patchIn = (partial: Partial<SaleRevenueCashInflows>) => {
    nextIn = { ...nextIn, ...partial } as I;
  };

  const highRise =
    !isSaleLandedProduct(nextInfo.buildingSubType) &&
    !isSaleWarehouseProduct(nextInfo.buildingSubType);
  const landed = isSaleLandedProduct(nextInfo.buildingSubType);
  const buildingOverride = sourceIsOverride(
    nextOut.fieldSources,
    "buildingBUA"
  );
  const ratioOverride = sourceIsOverride(
    nextIn.fieldSources,
    "saleableBUARatio"
  );

  if (!options?.c1Authoritative) {
    if (buildingOverride && (nextOut.buildingBUA || 0) > 0 && highRise) {
      if ((nextInfo.salesHighRiseTotalBUA || 0) !== nextOut.buildingBUA) {
        patchInfo({ salesHighRiseTotalBUA: nextOut.buildingBUA });
      }
    }
    if (ratioOverride && highRise) {
      if ((nextInfo.salesHighRiseSaleableRatio || 0) !== nextIn.saleableBUARatio) {
        patchInfo({ salesHighRiseSaleableRatio: nextIn.saleableBUARatio });
      }
    }
    if (ratioOverride && landed) {
      if ((nextInfo.salesLandedSaleableRatio || 0) !== nextIn.saleableBUARatio) {
        patchInfo({ salesLandedSaleableRatio: nextIn.saleableBUARatio });
      }
    }
  }

  const bua = deriveC1SaleBua(nextInfo);
  const mirrorFromC1 = bua.totalBuildingBua > 0;

  if (mirrorFromC1 && (options?.c1Authoritative || !buildingOverride)) {
    if ((nextOut.buildingBUA || 0) !== bua.totalBuildingBua) {
      patchOut({ buildingBUA: bua.totalBuildingBua });
    }
  }
  if (mirrorFromC1 && (options?.c1Authoritative || !ratioOverride)) {
    if ((nextIn.saleableBUARatio || 0) !== bua.saleableBuaRatio) {
      patchIn({ saleableBUARatio: bua.saleableBuaRatio });
    }
  }

  const resolved = deriveC1SaleBua(nextInfo);
  if (hasGeneratedSchedule(nextIn) && resolved.totalBuildingBua > 0) {
    const revenue = buildSaleRevenueSchedule(
      nextIn,
      nextOut.constructionPeriod,
      resolved.saleableBua
    );
    const grossDrifted =
      Math.abs((nextIn.grossSales || 0) - revenue.grossSales) > 0.5;
    const netDrifted =
      Math.abs((nextIn.netProceeds || 0) - revenue.netProceeds) > 0.5;
    const scheduleDrifted = !schedulesClose(
      nextIn.monthlyInflowSchedule,
      revenue.monthlyInflowSchedule
    );
    if (grossDrifted || netDrifted || scheduleDrifted) {
      patchIn({
        grossSales: revenue.grossSales,
        netProceeds: revenue.netProceeds,
        monthlyInflowSchedule: revenue.monthlyInflowSchedule,
      });
    }
  }

  const changed =
    nextInfo !== projectInfo || nextOut !== cashOutflows || nextIn !== cashInflows;
  return {
    projectInfo: nextInfo,
    cashOutflows: nextOut,
    cashInflows: nextIn,
    bua: deriveC1SaleBua(nextInfo),
    changed,
  };
}

function schedulesClose(
  a: { month: number; amount: number }[] | undefined,
  b: { month: number; amount: number }[]
): boolean {
  const left = a ?? [];
  if (left.length !== b.length) return false;
  for (let i = 0; i < left.length; i++) {
    if ((left[i]?.month ?? -1) !== (b[i]?.month ?? -2)) return false;
    if (Math.abs((left[i]?.amount || 0) - (b[i]?.amount || 0)) > 0.5) return false;
  }
  return true;
}

/**
 * Inflow series for previews and Excel. When C1 has a total and a schedule
 * was already generated, rebuild it so GDV stays saleable × ASP.
 */
export function resolveSaleInflowSchedule(
  projectInfo: SaleBuaProjectInfo,
  cashOutflows: Pick<SaleBuaCashOutflows, "constructionPeriod">,
  cashInflows: SaleRevenueCashInflows
): { month: number; amount: number }[] {
  const bua = deriveC1SaleBua(projectInfo);
  if (bua.totalBuildingBua <= 0 || !hasGeneratedSchedule(cashInflows)) {
    return cashInflows.monthlyInflowSchedule || [];
  }
  return buildSaleRevenueSchedule(
    cashInflows,
    cashOutflows.constructionPeriod,
    bua.saleableBua
  ).monthlyInflowSchedule;
}

export function assertSaleBuaSingleSource(input: {
  c1Total: number;
  c2Total: number;
  reportTotal: number;
  c1Saleable: number;
  c2Saleable: number;
  reportSaleable: number;
}): void {
  if (process.env.NODE_ENV === "production") return;
  const totalOk =
    input.c1Total === input.c2Total && input.c1Total === input.reportTotal;
  const saleableOk =
    input.c1Saleable === input.c2Saleable &&
    input.c1Saleable === input.reportSaleable;
  if (totalOk && saleableOk) return;
  throw new Error(
    `Sale BUA single-source mismatch: totalBua C1=${input.c1Total} C2=${input.c2Total} report=${input.reportTotal}; saleableBua C1=${input.c1Saleable} C2=${input.c2Saleable} report=${input.reportSaleable}`
  );
}

export function assertSaleGdvIdentity(
  totalBuildingBua: number,
  saleableBua: number,
  asp: number,
  gdv: number
): void {
  if (process.env.NODE_ENV === "production") return;
  if (totalBuildingBua <= 0) return;
  const expected = saleableBua * asp;
  if (gdv !== expected) {
    throw new Error(
      `Sale GDV mismatch: gdv=${gdv} saleableBua*ASP=${expected} (saleableBua=${saleableBua}, ASP=${asp})`
    );
  }
}
