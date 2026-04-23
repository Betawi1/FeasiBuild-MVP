import type { WaterfallCashFlows } from "./waterfall";

/**
 * Simple preference model (Component 5):
 * - M0: preference funds principal → common equity injection is reduced by that amount.
 * - During the preference period: fixed dividends are funded by additional common injection.
 *   **Timing rule (updated)**: dividends are aggregated and paid **annually at operational FYE months**
 *   (e.g. M58, M70, ...), not quarterly.
 * - From project cash: common receives distributions only at/after the tenor month; at tenor,
 *   preference principal is repaid from NCF first, then residual to common.
 *
 * IMPORTANT: `originalEquityInjections` is read from `/preview/financing` monthly data
 * (via `financing.monthlyFundingStack`), and is **positive** (cash injected).
 */
export function calculatePreferenceAdjustments(
  originalEquityInjections: number[], // positive injections (e.g. 2,000,000)
  preferenceAmount: number,
  dividendRate: number,
  tenorMonths: number, // month index for bullet (M36 => 36)
  operationalFyeMonths: number[], // e.g. [58, 70, 82, ...]
  constructionAndPreOpEndMonth: number // e.g. 46 (constructionPeriod + preOpBuffer)
) {
  const numMonths = originalEquityInjections.length;
  const annualDividend = preferenceAmount * dividendRate;
  const quarterlyDividend = annualDividend / 4;

  const adjustedEquityInjections: number[] = new Array(numMonths).fill(0);
  const preferenceDraws: number[] = new Array(numMonths).fill(0);
  const preferenceDividendsPaid: number[] = new Array(numMonths).fill(0);

  // Copy originals first
  for (let m = 0; m < numMonths; m++) {
    adjustedEquityInjections[m] = originalEquityInjections[m] ?? 0;
  }

  // M0: Preference provides principal -> reduce common injection by that amount (if possible)
  if ((originalEquityInjections[0] ?? 0) >= preferenceAmount) {
    preferenceDraws[0] = preferenceAmount;
    adjustedEquityInjections[0] = (originalEquityInjections[0] ?? 0) - preferenceAmount;
  }

  const endConstructionMonth = Math.max(0, Math.round(constructionAndPreOpEndMonth || 0));

  // Construction + pre-ops: quarterly coupons (M3, M6, ... up to endConstructionMonth)
  for (let m = 3; m <= Math.min(tenorMonths, endConstructionMonth); m += 3) {
    if (m >= numMonths) break;
    adjustedEquityInjections[m] = (adjustedEquityInjections[m] ?? 0) + quarterlyDividend;
    preferenceDividendsPaid[m] = quarterlyDividend;
  }

  // Operations: annual coupons at operational FYE months (strictly after construction/pre-op end)
  for (const m of operationalFyeMonths) {
    if (m <= endConstructionMonth) continue;
    if (m <= 0) continue;
    if (m > tenorMonths) continue;
    if (m >= numMonths) continue;
    adjustedEquityInjections[m] = (adjustedEquityInjections[m] ?? 0) + annualDividend;
    preferenceDividendsPaid[m] = annualDividend;
  }

  // Safety: tenor/exit month can be an operational FYE (e.g. M166) and must still receive the annual coupon.
  // If it's already applied above, this is a no-op.
  const tenorIdx = Math.max(0, Math.round(tenorMonths || 0));
  if (
    tenorIdx > endConstructionMonth &&
    tenorIdx < numMonths &&
    operationalFyeMonths.includes(tenorIdx) &&
    (preferenceDividendsPaid[tenorIdx] ?? 0) <= 0
  ) {
    adjustedEquityInjections[tenorIdx] =
      (adjustedEquityInjections[tenorIdx] ?? 0) + annualDividend;
    preferenceDividendsPaid[tenorIdx] = annualDividend;
  }

  return {
    adjustedEquityInjections,
    preferenceDraws,
    preferenceDividendsPaid,
    principalRepaid: preferenceAmount,
    principalRepaymentMonth: tenorMonths,
    annualDividend,
    quarterlyDividend,
    constructionAndPreOpEndMonth: endConstructionMonth,
  };
}

export function buildSimplifiedPreferenceWaterfall(
  originalEquityInjections: number[], // positive injections
  monthlyDistributions: number[],
  preferenceAmount: number,
  dividendRate: number,
  tenorMonths: number,
  operationalFyeMonths: number[],
  constructionAndPreOpEndMonth: number
): WaterfallCashFlows {
  const adj = calculatePreferenceAdjustments(
    originalEquityInjections,
    preferenceAmount,
    dividendRate,
    tenorMonths,
    operationalFyeMonths,
    constructionAndPreOpEndMonth
  );

  const numMonths = Math.max(
    originalEquityInjections.length,
    monthlyDistributions.length
  );

  const preferenceCashFlows: number[] = new Array(numMonths).fill(0);
  const commonCashFlows: number[] = new Array(numMonths).fill(0);

  for (let m = 0; m < numMonths; m++) {
    // Equity injections are negative cash flows to investors.
    commonCashFlows[m] = -Math.max(0, adj.adjustedEquityInjections[m] ?? 0);

    if (m === 0) {
      preferenceCashFlows[m] -= preferenceAmount;
    }

    const coupon = adj.preferenceDividendsPaid[m] ?? 0;
    if (coupon > 0) {
      preferenceCashFlows[m] += coupon;
    }

    const dist = monthlyDistributions[m] ?? 0;

    if (m < tenorMonths) {
      // Project distributions do not go to common before tenor end.
    } else if (m === tenorMonths) {
      // Principal is deducted at tenor month (M{tenorMonths}) from cash available.
      preferenceCashFlows[m] += preferenceAmount;
      commonCashFlows[m] += Math.max(0, dist - preferenceAmount);
    } else {
      commonCashFlows[m] += dist;
    }
  }

  const totalPreferenceInvested = Math.abs(
    preferenceCashFlows
      .filter((cf) => cf < 0)
      .reduce((sum, cf) => sum + cf, 0)
  );
  const totalCommonInvested = Math.abs(
    commonCashFlows.filter((cf) => cf < 0).reduce((sum, cf) => sum + cf, 0)
  );
  const preferenceTotalDistributed = preferenceCashFlows
    .filter((cf) => cf > 0)
    .reduce((sum, cf) => sum + cf, 0);
  const commonTotalDistributed = commonCashFlows
    .filter((cf) => cf > 0)
    .reduce((sum, cf) => sum + cf, 0);

  return {
    preferenceCashFlows,
    commonCashFlows,
    preferenceTotalDistributed,
    commonTotalDistributed,
    totalPreferenceInvested,
    totalCommonInvested,
    preferenceMultiple:
      totalPreferenceInvested > 0
        ? preferenceTotalDistributed / totalPreferenceInvested
        : 0,
    commonMultiple:
      totalCommonInvested > 0
        ? commonTotalDistributed / totalCommonInvested
        : 0,
    sponsorPromote: 0,
    promoteHurdleMultiple: 1.5,
    promoteCarryRate: 0,
  };
}
