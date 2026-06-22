/**
 * Financing-related types. Application state lives in `useFinModelStore` (Zustand).
 * `/preview/financing` writes blended equity KPIs to `projectIRR.projectMetrics`
 * (Component 5 reads the same shape).
 */

/** Saved from Component 5 (`/equity-returns`) for `/preview/equity-returns` when NCF series is missing locally. */
export type PreferenceCalculationSnapshot = {
  /** Annual dividend amount (paid at operational FYE months). */
  quarterlyDividendDue: number;
  dividendsPaid: number[];
  principalRepaid: number;
  error: string | null;
  totalDividendsPaid: number;
  tenorMonths: number;
};

/** Headline KPIs synced from `/preview/financing` for Component 5 equity returns summary. */
export type FinancingMetrics = {
  totalEquityAmount: number;
  /** Terminal cumulative NCF post-financing (includes operating + exit). */
  netExitProceeds: number;
  equityMultiple: number;
  equityPayback: number;
  /** Annualized equity IRR as decimal (e.g. 0.125 = 12.5%). */
  equityIRR: number;
  preferenceSharesAmount: number;
  cashEquityTotal?: number;
  landEquityTotal?: number;
  /** Sum of loan drawdowns (Component 4 "Total Loan Drawdown"). */
  totalLoanDrawdown?: number;
  /** Peak funding gap from Component 4 Step 1 (max cumulative shortfall before financing). */
  peakFundingGap?: number;
};

/** Metrics computed in `/preview/financing` (XIRR on equity investor CF, etc.). */
export type ProjectMetrics = {
  leveredEquityIRR: number;
  equityMultiple: number;
  equityPaybackMonth: number;
  peakEquityInjected: number;
  totalEquityInvested: number;
  totalDistributions: number;
  /**
   * Net cash flow to equity per month (negative = injection, positive = distribution).
   * Same series as Component 4 preview "Cash flows (equity)" (`irrCashFlow`).
   */
  equityCashFlows?: number[];
  /** Optional legacy / alias */
  unleveredIRR?: number;
  /** Alias for `peakEquityInjected` where older code expects `peakFunding` */
  peakFunding?: number;
  /** Preference dividend engine output — merged from Component 5; preserved when financing preview refreshes KPIs. */
  preferenceCalculation?: PreferenceCalculationSnapshot | null;
};

/**
 * Slice of project IRR state that Component 5 and the financing preview share.
 * (Full `ProjectIRR` is defined in `useFinModelStore`.)
 */
export type ProjectIRRMetricsSlice = {
  projectMetrics: ProjectMetrics | null;
};
