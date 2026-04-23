/**
 * Equity waterfall: allocate monthly cash between preference and common
 * (preference return and capital first, common residual).
 */

export interface WaterfallParams {
  /** Per month: negative = capital called from investors */
  monthlyEquityInjections: number[];
  /** Per month: positive = cash available to distribute to equity */
  monthlyDistributions: number[];
  /** Target preference principal (tranche cap) */
  preferenceAmount: number;
  /** Annual coupon / return, e.g. 0.08 = 8% p.a. */
  preferenceReturnRate: number;
  /** When true, redemption at fair value (not yet differentiated from par). */
  redemptionAtFairValue: boolean;
  /** Project horizon in months (for documentation; periods follow array lengths). */
  holdPeriodMonths: number;
  /** Project-level equity multiple hurdle to start promote (default 1.5). */
  promoteHurdleMultiple?: number;
  /** Fraction of excess profit to sponsor (default 0.2 = 20%). */
  promoteCarryRate?: number;
}

export interface WaterfallCashFlows {
  preferenceCashFlows: number[];
  commonCashFlows: number[];
  preferenceTotalDistributed: number;
  commonTotalDistributed: number;
  totalPreferenceInvested: number;
  totalCommonInvested: number;
  preferenceMultiple: number;
  commonMultiple: number;
  /** Sponsor carry on profits above hurdle (illustrative). */
  sponsorPromote: number;
  /** Hurdle multiple applied for this run. */
  promoteHurdleMultiple: number;
  /** Carry rate applied for this run. */
  promoteCarryRate: number;
}

export function allocateWaterfallCashFlows(
  params: WaterfallParams
): WaterfallCashFlows {
  const {
    monthlyEquityInjections,
    monthlyDistributions,
    preferenceAmount,
    preferenceReturnRate,
    redemptionAtFairValue,
    holdPeriodMonths,
    promoteHurdleMultiple = 1.5,
    promoteCarryRate = 0.2,
  } = params;

  const monthlyPrefRate = preferenceReturnRate / 12;

  const numPeriods = Math.max(
    monthlyEquityInjections.length,
    monthlyDistributions.length,
    holdPeriodMonths > 0 ? holdPeriodMonths : 0
  );

  const preferenceCashFlows: number[] = new Array(numPeriods).fill(0);
  const commonCashFlows: number[] = new Array(numPeriods).fill(0);

  let preferencePrincipalOutstanding = 0;
  let unpaidPreferenceAccrual = 0;

  const EPS = 1e-6;

  for (let t = 0; t < numPeriods; t++) {
    const equityInjection = monthlyEquityInjections[t] ?? 0;
    const availableDistribution = monthlyDistributions[t] ?? 0;

    if (equityInjection < 0) {
      const totalInjection = Math.abs(equityInjection);
      const prefRoom = Math.max(0, preferenceAmount - preferencePrincipalOutstanding);
      const toPreference = Math.min(totalInjection, prefRoom);
      const toCommon = totalInjection - toPreference;

      preferenceCashFlows[t] -= toPreference;
      commonCashFlows[t] -= toCommon;
      preferencePrincipalOutstanding += toPreference;
    }

    let remainingCash = availableDistribution;

    if (preferencePrincipalOutstanding > EPS) {
      unpaidPreferenceAccrual +=
        preferencePrincipalOutstanding * monthlyPrefRate;
    }

    if (remainingCash > EPS) {
      const payAccrual = Math.min(remainingCash, unpaidPreferenceAccrual);
      preferenceCashFlows[t] += payAccrual;
      remainingCash -= payAccrual;
      unpaidPreferenceAccrual -= payAccrual;
    }

    if (
      remainingCash > EPS &&
      unpaidPreferenceAccrual <= EPS &&
      preferencePrincipalOutstanding > EPS
    ) {
      const returnPrefCapital = Math.min(
        remainingCash,
        preferencePrincipalOutstanding
      );
      preferenceCashFlows[t] += returnPrefCapital;
      preferencePrincipalOutstanding -= returnPrefCapital;
      remainingCash -= returnPrefCapital;
    }

    if (remainingCash > EPS) {
      commonCashFlows[t] += remainingCash;
      remainingCash = 0;
    }

    void redemptionAtFairValue;
  }

  const totalPreferenceInvested = Math.abs(
    preferenceCashFlows.filter((cf) => cf < 0).reduce((sum, cf) => sum + cf, 0)
  );
  const totalCommonInvested = Math.abs(
    commonCashFlows.filter((cf) => cf < 0).reduce((sum, cf) => sum + cf, 0)
  );
  const totalPreferenceDistributed = preferenceCashFlows
    .filter((cf) => cf > 0)
    .reduce((sum, cf) => sum + cf, 0);
  const totalCommonDistributed = commonCashFlows
    .filter((cf) => cf > 0)
    .reduce((sum, cf) => sum + cf, 0);

  const sponsorPromote = 0;

  return {
    preferenceCashFlows,
    commonCashFlows,
    preferenceTotalDistributed: totalPreferenceDistributed,
    commonTotalDistributed: totalCommonDistributed,
    totalPreferenceInvested,
    totalCommonInvested,
    preferenceMultiple:
      totalPreferenceInvested > 0
        ? totalPreferenceDistributed / totalPreferenceInvested
        : 0,
    commonMultiple:
      totalCommonInvested > 0
        ? totalCommonDistributed / totalCommonInvested
        : 0,
    sponsorPromote,
    promoteHurdleMultiple,
    promoteCarryRate,
  };
}
