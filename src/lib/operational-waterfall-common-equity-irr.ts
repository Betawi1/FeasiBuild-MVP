/**
 * Waterfall-aligned common equity IRR (annual %) — matches Component 5 preview / wizard
 * (`commonAnnualIrr` / `waterfall.commonIRR`×100), not the C5 linker-only series.
 */

import {
  buildCommonEquityTableRows,
  computeCommonDistributionByMonth,
  getMonthlyDataValueFromStore,
  type MonthlyDataField,
} from "@/lib/common-equity-net-series";
import { annualIrrPercentFromMonthlyNetEquityFlows } from "@/lib/net-equity-flow-irr";
import {
  buildSimplifiedPreferenceWaterfall,
  calculatePreferenceAdjustments,
} from "@/lib/preference-simple";
import { allocateWaterfallCashFlows } from "@/lib/waterfall";
import {
  DEFAULT_PREFERENCE_TENOR_MONTHS,
  PRE_OPERATION_BUFFER_MONTHS,
} from "@/store/useFinModelStore";

type MonthlyRow = {
  month?: number;
  equityInjection?: number;
  cumulativeNcfPostFinancing?: number;
};

export function waterfallCommonAnnualIrrPctFromOperationalMonthlyData(params: {
  monthlyData: MonthlyRow[];
  financing: {
    preferenceShares?: {
      hasPreferenceShares?: boolean;
      amount?: number;
      returnPercent?: number;
      tenorMonths?: number;
    };
  };
  constructionPeriod: number;
  /** Same `stabilizationEndMonth` passed to `calculateEquityReturns` (Component 5 linker). */
  stabilizationEndMonth: number;
  operationalFyeMonths: number[];
  horizonMonths: number;
}): number | null {
  const {
    monthlyData,
    financing,
    constructionPeriod,
    stabilizationEndMonth,
    operationalFyeMonths,
    horizonMonths,
  } = params;

  const H = Math.max(0, Math.round(horizonMonths));
  if (!monthlyData?.length || H <= 0) return null;

  const ps = financing.preferenceShares ?? {};
  const hasPreference = !!(ps.hasPreferenceShares && Number(ps.amount) > 0);
  const prefPrincipal = hasPreference ? Number(ps.amount) || 0 : 0;
  const prefRate = hasPreference ? Number(ps.returnPercent) / 100 : 0;
  const resolvedTenorMonths =
    Number(ps.tenorMonths) || DEFAULT_PREFERENCE_TENOR_MONTHS;

  const monthlyEquityInjectionsRaw: number[] = new Array(H).fill(0);
  const cumNcf: number[] = new Array(H).fill(0);
  for (const row of monthlyData) {
    const m = Number(row.month);
    if (m >= 0 && m < H) {
      monthlyEquityInjectionsRaw[m] = Math.max(
        0,
        Number(row.equityInjection) || 0
      );
      cumNcf[m] = Number(row.cumulativeNcfPostFinancing) || 0;
    }
  }

  const monthlyDistributionsRaw: number[] = new Array(H).fill(0);
  for (let m = 0; m < H; m++) {
    const c = cumNcf[m] ?? 0;
    const prev = m > 0 ? cumNcf[m - 1] ?? 0 : 0;
    monthlyDistributionsRaw[m] = Math.max(0, c - prev);
  }

  const prefEndConstructionMonth = constructionPeriod + PRE_OPERATION_BUFFER_MONTHS;

  const waterfallCashFlows = hasPreference
    ? buildSimplifiedPreferenceWaterfall(
        monthlyEquityInjectionsRaw,
        monthlyDistributionsRaw,
        prefPrincipal,
        prefRate,
        resolvedTenorMonths,
        operationalFyeMonths,
        prefEndConstructionMonth
      )
    : allocateWaterfallCashFlows({
        monthlyEquityInjections: monthlyEquityInjectionsRaw.map((v) =>
          -Math.max(0, v)
        ),
        monthlyDistributions: monthlyDistributionsRaw,
        preferenceAmount: 0,
        preferenceReturnRate: 0,
        redemptionAtFairValue: false,
        holdPeriodMonths: H,
      });

  const getMonthlyDataValue = (month: number, field: MonthlyDataField) =>
    getMonthlyDataValueFromStore(monthlyData as any[], month, field);

  const commonDistributionByMonth = computeCommonDistributionByMonth({
    horizonMonths: H,
    hasPreference,
    prefPrincipal,
    prefRate,
    resolvedTenorMonths,
    getMonthlyDataValue,
    monthlyDataForLoanDetection: monthlyData as any[],
  });

  let extraCommonDrawByMonth: number[] | undefined;
  if (
    hasPreference &&
    prefPrincipal > 0 &&
    monthlyEquityInjectionsRaw.length > 0
  ) {
    const adj = calculatePreferenceAdjustments(
      monthlyEquityInjectionsRaw,
      prefPrincipal,
      prefRate,
      resolvedTenorMonths,
      operationalFyeMonths,
      stabilizationEndMonth
    );
    if (adj.preferenceDividendsPaid?.length)
      extraCommonDrawByMonth = adj.preferenceDividendsPaid;
  }

  const rows = buildCommonEquityTableRows({
    horizonMonths: H,
    waterfall: waterfallCashFlows,
    commonDistributionByMonth,
    extraCommonDrawByMonth,
  });
  const netFlows = rows.map((r) => r.netEquityCF);
  if (!netFlows.length) return null;
  return annualIrrPercentFromMonthlyNetEquityFlows(netFlows);
}
