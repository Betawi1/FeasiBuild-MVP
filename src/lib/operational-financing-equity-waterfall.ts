/**
 * Month-by-month financing equity waterfall for operational preview.
 * Ensures cumulative NCF (post-equity) never stays below zero after cash gap-fill.
 */

export type OperationalFinancingWaterfallMonth = {
  month: number;
  prefDrawdown: number;
  prefDividend: number;
  prefRepayment: number;
  landEquityInjection: number;
  cashEquityInjection: number;
  equityInjection: number;
  cumulativeEquityInjected: number;
  /** End-of-month cumulative NCF after land + cash equity (≥ 0). */
  cumulativeNcfPostFinancing: number;
  /** Monthly NCF post = pre-fin + debt + pref + land + cash for this month. */
  monthlyNcfPostFinancing: number;
};

export type PreferenceWaterfallConfig = {
  enabled: boolean;
  amount: number;
  /** Annual return as percent points (e.g. 12 = 12% p.a.). */
  returnPercent: number;
  cumulativeLoanBalanceAtMonth: (month: number) => number;
};

export type BuildOperationalFinancingWaterfallParams = {
  lastMonth: number;
  isLandEquity: boolean;
  landEquityAtM0: number;
  ncfPreFinancing: (month: number) => number;
  loanDrawdown: (month: number) => number;
  interestPayment: (month: number) => number;
  principalRepayment: (month: number) => number;
  preference?: PreferenceWaterfallConfig;
  gapEpsilon?: number;
};

/**
 * Running-balance waterfall:
 * 1. Add pre-fin NCF + loan + interest + principal
 * 2. Add preference drawdown (M0), semi-annual dividends, principal at senior payoff
 * 3. Add land equity at M0 (if enabled)
 * 4. If balance < 0, inject cash equity to restore balance to 0
 */
export function buildOperationalFinancingEquityWaterfall(
  params: BuildOperationalFinancingWaterfallParams
): OperationalFinancingWaterfallMonth[] {
  const {
    lastMonth,
    isLandEquity,
    landEquityAtM0,
    ncfPreFinancing,
    loanDrawdown,
    interestPayment,
    principalRepayment,
    preference,
    gapEpsilon = 1e-6,
  } = params;

  if (lastMonth < 0) return [];

  const prefEnabled = Boolean(preference?.enabled && (preference?.amount ?? 0) > 0);
  const prefAmount = prefEnabled ? Math.max(0, preference!.amount) : 0;
  const prefAnnualRate = prefEnabled ? (preference!.returnPercent ?? 0) / 100 : 0;
  const semiAnnualCoupon = prefAmount * (prefAnnualRate / 2);

  const rows: OperationalFinancingWaterfallMonth[] = [];
  let runningBalance = 0;
  let cumulativeEquity = 0;
  let hasPaidPrefRepayment = false;

  for (let m = 0; m <= lastMonth; m++) {
    const preFin = ncfPreFinancing(m) || 0;
    const loan = loanDrawdown(m) || 0;
    const interest = interestPayment(m) || 0;
    const principal = principalRepayment(m) || 0;

    let prefDrawdown = 0;
    let prefDividend = 0;
    let prefRepayment = 0;

    if (prefEnabled) {
      if (m === 0) {
        prefDrawdown = prefAmount;
      }
      if (m > 0 && (m + 1) % 6 === 0) {
        prefDividend = -semiAnnualCoupon;
      }
      if (!hasPaidPrefRepayment) {
        const loanBal = preference!.cumulativeLoanBalanceAtMonth(m) ?? 0;
        const prevLoanBal =
          m > 0 ? preference!.cumulativeLoanBalanceAtMonth(m - 1) ?? 0 : loanBal;
        if (m > 0 && prevLoanBal > gapEpsilon && loanBal <= gapEpsilon) {
          prefRepayment = -prefAmount;
          hasPaidPrefRepayment = true;
        }
      }
    }

    runningBalance +=
      preFin + loan + interest + principal + prefDrawdown + prefDividend + prefRepayment;

    let landEquityInjection = 0;
    if (m === 0 && isLandEquity) {
      landEquityInjection = Math.max(0, landEquityAtM0);
      runningBalance += landEquityInjection;
    }

    let cashEquityInjection = 0;
    if (runningBalance < -gapEpsilon) {
      cashEquityInjection = Math.abs(runningBalance);
      runningBalance = 0;
    }

    const equityInjection = landEquityInjection + cashEquityInjection;
    cumulativeEquity += equityInjection;

    const monthlyNcfPostFinancing =
      preFin +
      loan +
      interest +
      principal +
      prefDrawdown +
      prefDividend +
      prefRepayment +
      landEquityInjection +
      cashEquityInjection;

    rows.push({
      month: m,
      prefDrawdown,
      prefDividend,
      prefRepayment,
      landEquityInjection,
      cashEquityInjection,
      equityInjection,
      cumulativeEquityInjected: cumulativeEquity,
      cumulativeNcfPostFinancing: runningBalance,
      monthlyNcfPostFinancing,
    });
  }

  return rows;
}
