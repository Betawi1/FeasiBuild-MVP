import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { HotelOperatingType } from "@/config/hotel-cost-profiles";
import { allocatePowcMonthlyFromStep13 } from "@/lib/cash-outflow-powc-timing";
import { allocateFfeMonthly } from "@/lib/cash-outflow-ffe-timing";
import type { OperationalHotelHoldSnapshot } from "@/lib/operational-pnl";
import type { ProjectMetrics } from "./financingStore";

// ===== Timeline Constants =====
export const PRE_OPERATION_BUFFER_MONTHS = 6; // Training, commissioning, staff hiring
export const OPERATIONAL_PERIOD_YEARS = 10; // Fixed 10-year operating period
export const OPERATIONAL_PERIOD_MONTHS = OPERATIONAL_PERIOD_YEARS * 12; // 120 months

/**
 * Calculate total project timeline in months
 * @param constructionPeriod - User-input construction period (e.g., 36, 40)
 * @returns Total months from M0 to end of operations
 */
export const calculateTotalTimelineMonths = (constructionPeriod: number): number => {
  const constructionMonths = constructionPeriod + 1; // Includes M0
  const preOpMonths = PRE_OPERATION_BUFFER_MONTHS;
  const operationalMonths = OPERATIONAL_PERIOD_MONTHS;
  return constructionMonths + preOpMonths + operationalMonths;
};

/**
 * Calculate when operations start (first month of Operating Y1)
 * @param constructionPeriod - User-input construction period
 * @returns Month index when operations begin
 */
export const calculateOperationsStartMonth = (constructionPeriod: number): number => {
  const constructionMonths = constructionPeriod + 1; // M0 to M{constructionPeriod}
  return constructionMonths + PRE_OPERATION_BUFFER_MONTHS; // M{constructionPeriod+7}
};

/**
 * Map Operational Year (1-10) to month range
 * @param operationalYear - 1 to 10
 * @param constructionPeriod - User-input construction period
 * @returns { startMonth: number, endMonth: number }
 */
export const getOperationalYearMonthRange = (
  operationalYear: number,
  constructionPeriod: number
): { startMonth: number; endMonth: number } => {
  const operationsStart = calculateOperationsStartMonth(constructionPeriod);
  const startMonth = operationsStart + (operationalYear - 1) * 12;
  const endMonth = startMonth + 11;
  return { startMonth, endMonth };
};

/**
 * Map month index to phase and operational year
 * @param month - Month index (0, 1, 2, ...)
 * @param constructionPeriod - User-input construction period
 * @returns { phase: 'construction' | 'preOperation' | 'operations', operationalYear: number | null }
 */
export const getMonthPhaseInfo = (
  month: number,
  constructionPeriod: number
): {
  phase: "construction" | "preOperation" | "operations";
  operationalYear: number | null;
} => {
  const constructionEndMonth = constructionPeriod; // M{constructionPeriod}
  const operationsStartMonth = calculateOperationsStartMonth(constructionPeriod);

  if (month <= constructionEndMonth) {
    return { phase: "construction", operationalYear: null };
  } else if (month < operationsStartMonth) {
    return { phase: "preOperation", operationalYear: null };
  } else {
    const operationalYear = Math.floor((month - operationsStartMonth) / 12) + 1;
    return { phase: "operations", operationalYear: operationalYear <= 10 ? operationalYear : null };
  }
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BuildingConfig = {
  basements: number;
  podiumFloors: number;
  towerFloors: number;
  hasRetailComponent: boolean;
  retailPercentage: number;
  /** Sale stream (landed sub-types): unit-based configuration. */
  landedUnits?: number;
  landedLandAreaPerUnit?: number;
  landedBUAPerUnit?: number;
};

export type ProjectInfo = {
  country: string;
  city: string;
  currency: "AED" | "USD" | "MYR" | "OMR" | "SAR" | "KWD" | "QAR" | "BHD" | "GBP";
  buildingType: "residential" | "office" | "retail" | "hotel";
  /** Sale stream sub-type (more specific than `buildingType`). */
  buildingSubType?:
    | "residential_landed"
    | "residential_high_rise"
    | "commercial_landed"
    | "commercial_strata_office";
  hotelStarRating: string;
  /** Operational / hold hotel: budget | boutique | business | resort (empty when unset). */
  hotelOperatingType?: HotelOperatingType | "";
  buildingConfig: BuildingConfig;
};

export type StageAllocation = {
  stage1Label: string;
  stage1Percent: number;
  stage2Label: string;
  stage2Percent: number;
  stage3Label: string;
  stage3Percent: number;
};

export type PowcAllocation = {
  siteEstablishment: number;
  overhead: number;
  authorityFees: number;
};

export type SoftCostAllocation = {
  architect: number;
  projectManagement: number;
  engineering: number;
  geotechnical: number;
  otherFees: number;
};

export type CashOutflows = {
  // Raw inputs (wizard steps 2–13)
  buildingBUA: number;
  buildingRate: number;
  parkingBUA: number;
  parkingRate: number;
  basementBUA: number;
  basementRate: number;
  /** Sale stream (landed): infrastructure rate per sqft of total land area. */
  infrastructureRate?: number;
  contingencyPercent: number;
  softCostPercent: number;
  powcPercent: number;
  ffePercent: number;
  landArea: number;
  landRate: number;
  constructionPeriod: number; // months
  stageAllocation: StageAllocation;
  powcStartMonth: number;
  powcDurationMonths: number;
  powcAllocation: PowcAllocation;
  softCostAllocation: SoftCostAllocation;
  // Derived (filled on Generate Model)
  baseConstructionCost?: number;
  landCost: number;
  constructionCost: number;
  softCosts: number;
  powc: number;
  ffe: number;
  softCostsTotal?: number;
  powcTotal?: number;
  tdc: number;
  /** Last hotel benchmark profile applied on operational SC/POWC/FFE step. */
  operationalHotelProfileKey?: string;
  /** User overrode auto % from hotel profile (operational stream). */
  operationalHotelScManual?: boolean;
  operationalHotelPowcManual?: boolean;
  operationalHotelFfeManual?: boolean;
};

export type PaymentPlans = {
  cashDownPaymentPercent: number;
  cashOnHandoverPercent: number;
  cashDuringConstructionPercent: number;
  mortgageDownPaymentPercent: number;
  mortgageLtvPercent: number;
  mortgageTenorYears: number;
  mortgageRatePercent: number;
};

export type BuyerMix = {
  cashBuyerPercent: number;
  mortgageBuyerPercent: number;
  brokerCommissionPercent: number;
  vatPercent: number;
  escrowFeePercent: number;
  salesDiscountPercent: number;
};

export type SalesUptake = {
  mode: "preset" | "manual";
  preset: string;
  manualCsv: string;
};

export type BulkSales = {
  bulkSalesSharePercent: number;
  bulkSalesDiscountPercent: number;
};

export type LaunchTiming = {
  launchMonthOffset: number;
  preLaunchSalesPercent: number;
};

export type CashInflows = {
  saleableBUARatio: number;
  salesPrice: number; // e.g. per sqft
  paymentPlans: PaymentPlans;
  salesUptake: SalesUptake;
  buyerMix: BuyerMix;
  defaultRate: number;
  bulkSales: BulkSales;
  launchTiming: LaunchTiming;
  /**
   * Development escrow treatment inputs (Component 2, Step 5)
   * - buyerDownPayment: portion routed 100% direct to developer (not escrowed)
   * - downPaymentMonths: months (M0-indexed) when the down payment is received
   */
  buyerDownPayment?: number;
  downPaymentMonths?: number[];
  // Derived (filled on Generate Model)
  grossSales: number;
  netProceeds: number;
  monthlyInflowSchedule: MonthlyCashFlowPoint[];
};

export type MonthlyCashFlowPoint = {
  month: number;
  amount: number;
};

/** Project IRR (Component 3) exit inputs — not financing; terminal value uses `saleCapRate`. */
export type ProjectIRRExitAssumptions = {
  exitStrategy: "sale" | "refinance" | "hold";
  exitYear: number;
  /** Exit / terminal cap rate (%) for Project IRR terminal value only. */
  saleCapRate: number;
  /** Selling costs (% of sale); placeholder for future net proceeds logic. */
  sellingCosts: number;
};

export type ProjectIRR = {
  unleveredIRR: number | null;
  unleveredMultiple: number | null;
  unleveredPayback: number | null; // months
  peakFunding: number;
  monthlyCashFlows: MonthlyCashFlowPoint[];
  /** Blended equity KPIs from `/preview/financing` — see `ProjectMetrics` in `financingStore.ts`. */
  projectMetrics: ProjectMetrics | null;
  /** Cumulative NCF post-financing by month (M0…), from `/preview/financing` Row J — preference dividend logic. */
  cumulativeNcfPostFinancingByMonth?: number[];
  /** Equity injection by month (M0…), from `/preview/financing` Row G — Component 5 must read this directly. */
  equityInjectionByMonth?: number[];
  /**
   * Full `/preview/financing` monthly rows (source of truth for equityInjection + NCF).
   * This is intentionally denormalized to unblock Component 5 preview table rendering.
   */
  monthlyData?: Array<{
    month: number;
    equityInjection: number;
    ncfPostFinancing: number;
    cumulativeNcfPostFinancing: number;
    /** From `/preview/financing` Row E (negative when repaid). Used to gate common distributions. */
    principalRepayment?: number;
  }>;
  /**
   * Exit cap rate (%) for Project IRR terminal value (Component 3).
   * Edited on `/operational/project-irr`; NPV preview reads this value.
   */
  exitCapRate: number;
  /** Exit assumptions for Component 3 (Project IRR); separate from `financing`. */
  exitAssumptions: ProjectIRRExitAssumptions;
};

export type LandFinancing = {
  type: "equity" | "land_loan";
  landLoanAmount: number;
  landLoanRatePercent: number;
  landLoanTenorYears: number;
};

export type PreferenceShares = {
  hasPreferenceShares: boolean;
  amount: number;
  returnType: string;
  returnPercent: number;
  /** Bullet principal repayment tenor (months); model caps to project cash-flow horizon. */
  tenorMonths: number;
  redeemAtFairValue: boolean;
};

/** Default redeemable preference tenor (months); matches first dense monthly grid in `/preview/financing` (`monthlyMax` 36). */
export const DEFAULT_PREFERENCE_TENOR_MONTHS = 36;

export type Financing = {
  debtType: "conventional" | "islamic";
  // Legacy aggregate fields (kept for backward compatibility)
  ltc: number; // loan-to-cost % (legacy)
  ltv: number; // max LTV % (legacy)
  interestRate: number; // or profit rate (legacy)
  // Detailed financing inputs (mirror the wizard in Component 4)
  loanToCostPercent: number;
  maxLtvPercent: number;
  constructionPeriodMonths: number;
  amortizationYears: number;
  hasBalloon: boolean;
  balloonPercent: number;
  rateType: "fixed" | "floating";
  baseRateName: string;
  baseRatePercent: number;
  marginPercent: number;
  fixedOrProfitRatePercent: number;
  /** Paid current = cash interest each construction month; hybrid = split per `idcCapitalizedSharePercent`. */
  idcTreatment: "capitalized" | "current" | "hybrid";
  /** % of IDC capitalized when `idcTreatment === "hybrid"` (0–100). */
  idcCapitalizedSharePercent: number;
  amortizationStyle: "interest_only" | "straight_line" | "mortgage" | "bullet";
  /** Post–construction repayment profile (Component 4 Step 6) */
  repaymentStructure: "fully-amortizing" | "interest-only" | "bullet";
  interestOnlyPeriodYears: number; // 0–5 (years of IO before amortization, where applicable)
  landFinancing: LandFinancing;
  preferenceShares: PreferenceShares;
  holdPeriodYears: number;
  exitMethod: string;
  terminalCapRatePercent: number;
  // Derived outputs
  totalDebt: number;
  monthlyDebtService: { month: number; service: number }[];
  idcAmount: number;
  dscrProfile: { month: number; dscr: number; atRisk: boolean }[];

  // -------------------------------------------------------------------------
  // Dynamic funding model outputs (Component 4 - Step 8/DSCR basis)
  // -------------------------------------------------------------------------
  monthlyFundingStack?: MonthlyFundingStack[];
  peakEquityRequired?: number;
  totalInterestPaid?: number;
  totalCommitmentFeePaid?: number;
  loanAtCompletion?: number;

  // Dynamic funding model inputs / knobs (defaults set in store)
  debtFacilityAmount?: number; // Maximum facility (cap binding: LTC/LTV)
  commitmentFeeRate?: number; // % p.a. on undrawn portion
  equityFirstDraw?: boolean;
  salesReduceEquity?: boolean;
  salesReduceDebt?: boolean;
  /** % of monthly sales inflows applied to debt repayment (post-construction), default 100 */
  debtRepaymentPriority?: number;
  /** When true, preview uses 30/70 milestone reimbursement (vs equity-first draw). */
  reimbursementModel?: boolean;
  /** Explicit drawdown methodology (Step 4); kept in sync with `reimbursementModel`. */
  drawdownModel?: "milestone-30-70" | "equity-first-gap-fill";
  /** First construction milestone (e.g. 0.3 = 30% complete). */
  firstDrawdownProgress?: number;
  /** Month index (M0-based) of first construction draw milestone after land. */
  firstDrawdownMonth?: number;
  /** Months between subsequent draw milestones (optional). */
  drawdownInterval?: number;

  /** Hybrid milestone drawdown: % of TDC thresholds (e.g. 30, 60, 90, 100). */
  milestoneThresholds?: number[];
  /** Minimum months between certified draw events (after land). */
  certificationInterval?: number;
  /** When true, milestone months are derived from S-curve + interval; else use `overrideMilestoneMonths`. */
  autoCalculateMilestoneMonths?: boolean;
  /** Manual M0-based months (e.g. [0,10,18,25,30]) when auto is off. */
  overrideMilestoneMonths?: number[];

  // -------------------------------------------------------------------------
  // Component 4 - Step 4 drawdown tabs (UI-level, persisted)
  // -------------------------------------------------------------------------
  drawdownActiveTab?: "quarterly" | "scurve" | "custom";
  drawdownQuarterly?: { firstMonth: number; lastMonth: number };
  drawdownScurve?: {
    autoCalculate: boolean;
    milestones: { id: number; name: string; month: number; percentage: number }[];
  };
  /** Monthly drawdown % of total (M0..M{constructionPeriod}); sums to ~100 when used. */
  monthlyDrawdowns?: number[];

  // -------------------------------------------------------------------------
  // Component 4 - Step 6 loan repayment terms (UI-level, persisted)
  // -------------------------------------------------------------------------
  /** `equal` / `declining` are legacy; normalize via normalizeSeniorLoanType in UI. */
  loanType?:
    | "bullet"
    | "equal-principal"
    | "equal-payment"
    | "custom"
    | "equal"
    | "declining";
  gracePeriodYears?: number;
  gracePeriodStartYear?: number; // e.g. 4 = Y4
  prepaymentLockoutYears?: number;
  prepaymentPenalty?: number[]; // step-down %
  yieldMaintenance?: boolean;
  /** Optional: custom annual principal schedule for Y4–Y13 (10 values). */
  customAnnualPrincipal?: number[];
  /** Optional: % of loan principal repaid each year Y4–Y13 (10 values, sum ≈ 100). */
  customPercentages?: number[];
  /** Senior loan annual schedule Y4–Y13 (aligned with Step 6 amortization preview). */
  amortizationSchedule?: Array<{
    spreadsheetYear: number;
    debtService: number;
    interest: number;
    principal: number;
    startBal: number;
    endBal: number;
  }>;

  // -------------------------------------------------------------------------
  // Component 4 - Step 7 debt covenants & exit strategy (UI-level, persisted)
  // -------------------------------------------------------------------------
  /** Minimum DSCR covenant (×), typically 1.2–2.0. */
  dscrTarget?: number;
  dscrFrequency?: "annual" | "semi-annual" | "quarterly";
  /** Equity cure permitted under covenant package. */
  cureProvisions?: boolean;
  /** Senior / whole-loan max LTV covenant (%). */
  maxLtvRatio?: number;
  /** Minimum all-in debt yield covenant (%). */
  minDebtYield?: number;
  exitStrategy?: "refinance" | "sale" | "hold";
  /** Operating year label Y4–Y13 for planned exit / refi. */
  exitYear?: number;
  refinanceLtc?: number;
  refinanceRate?: number;
  saleCapRate?: number;
  saleCosts?: number;

  // -------------------------------------------------------------------------
  // Component 4 - Land financing (Step 2 UI)
  // -------------------------------------------------------------------------
  landPaymentMethod?: "equity" | "land-loan" | "integrated";
  landEquityPercent?: number;
  landRefinanceIntoMain?: boolean;
  landLoanLtc?: number;
  landLoanRate?: number;
  landAsCollateral?: boolean;
};

export type MonthlyFundingStack = {
  month: number;
  cumulativeCosts: number;
  cumulativeSales: number;

  debtDrawThisMonth: number;
  cumulativeDebtDrawn: number;

  equityThisMonth: number;
  cumulativeEquity: number;

  // Interest is tracked on the outstanding drawn balance (including capitalized portion).
  // For cashflow previews, `interestPaid` is the non-capitalized portion.
  interestCost: number; // accrued interest
  interestPaid?: number; // cash interest paid (non-capitalized)
  interestCapitalized?: number; // capitalized portion

  commitmentFee: number; // cash fee on undrawn facility
  totalFinancingCost: number;

  // fundingGap should be ~0 after equity/debt allocations.
  fundingGap: number;
};

export type EquityReturns = {
  leveredIRR: number | null;
  equityMultiple: number | null;
  paybackPeriod: number | null; // months
  waterfall: string[]; // conceptual steps
  dscrProfile: { month: number; dscr: number }[];
};

export type ScenarioMetrics = {
  unleveredIrr: number;
  unleveredPaybackMonths: number;
  leveredEquityIrr: number;
  leveredPaybackMonths: number;
  peakEquityRequired: number;
  minDscr: number;
};

export type SelectedDrivers = {
  salesPrice: -1 | 0 | 1;
  constructionCost: -1 | 0 | 1;
  constructionDuration: -1 | 0 | 1;
  takeUpRate: -1 | 0 | 1;
};

export type ScenarioAnalysis = {
  baseCase: ScenarioMetrics;
  downside: ScenarioMetrics;
  upside: ScenarioMetrics;
  selectedDrivers: SelectedDrivers;
};

export type ScenarioDriver =
  | "salesPrice"
  | "constructionCost"
  | "constructionDuration"
  | "takeUpRate";
export type ScenarioShock = -1 | 0 | 1;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const defaultBuildingConfig: BuildingConfig = {
  basements: 0,
  podiumFloors: 0,
  towerFloors: 10,
  hasRetailComponent: false,
  retailPercentage: 0,
  landedUnits: 0,
  landedLandAreaPerUnit: 0,
  landedBUAPerUnit: 0,
};

const defaultStageAllocation: StageAllocation = {
  stage1Label: "M0 + Enabling",
  stage1Percent: 20,
  stage2Label: "Sub-Structure",
  stage2Percent: 30,
  stage3Label: "Super + Finishes",
  stage3Percent: 50,
};

const defaultProjectInfo: ProjectInfo = {
  country: "",
  city: "",
  currency: "AED",
  buildingType: "residential",
  buildingSubType: "residential_landed",
  hotelStarRating: "",
  hotelOperatingType: "",
  buildingConfig: defaultBuildingConfig,
};

const defaultCashOutflows: CashOutflows = {
  buildingBUA: 20000,
  buildingRate: 400,
  parkingBUA: 5000,
  parkingRate: 150,
  basementBUA: 8000,
  basementRate: 250,
  infrastructureRate: 0,
  contingencyPercent: 7.5,
  softCostPercent: 12,
  powcPercent: 4,
  ffePercent: 10,
  landArea: 50000,
  landRate: 80,
  constructionPeriod: 30,
  stageAllocation: defaultStageAllocation,
  powcStartMonth: 10,
  powcDurationMonths: 12,
  powcAllocation: {
    siteEstablishment: 40,
    overhead: 12,
    authorityFees: 48,
  },
  softCostAllocation: {
    architect: 30,
    projectManagement: 20,
    engineering: 30,
    geotechnical: 10,
    otherFees: 10,
  },
  baseConstructionCost: 0,
  landCost: 0,
  constructionCost: 0,
  softCosts: 0,
  powc: 0,
  ffe: 0,
  softCostsTotal: 0,
  powcTotal: 0,
  tdc: 0,
  operationalHotelProfileKey: undefined,
  operationalHotelScManual: false,
  operationalHotelPowcManual: false,
  operationalHotelFfeManual: false,
};

const defaultCashInflows: CashInflows = {
  saleableBUARatio: 80,
  salesPrice: 1200,
  paymentPlans: {
    cashDownPaymentPercent: 20,
    cashOnHandoverPercent: 40,
    cashDuringConstructionPercent: 40,
    mortgageDownPaymentPercent: 20,
    mortgageLtvPercent: 80,
    mortgageTenorYears: 20,
    mortgageRatePercent: 5,
  },
  salesUptake: { mode: "preset", preset: "even", manualCsv: "" },
  buyerMix: {
    cashBuyerPercent: 40,
    mortgageBuyerPercent: 60,
    brokerCommissionPercent: 2,
    vatPercent: 5,
    escrowFeePercent: 1,
    salesDiscountPercent: 3,
  },
  defaultRate: 2,
  bulkSales: { bulkSalesSharePercent: 10, bulkSalesDiscountPercent: 10 },
  launchTiming: { launchMonthOffset: 6, preLaunchSalesPercent: 10 },
  grossSales: 0,
  netProceeds: 0,
  monthlyInflowSchedule: [],
};

/** Default Project IRR exit inputs; safe fallback when persisted state omits `exitAssumptions`. */
export const defaultExitAssumptions: ProjectIRRExitAssumptions = {
  exitStrategy: "hold",
  exitYear: 13,
  saleCapRate: 7.0,
  sellingCosts: 3.0,
};

const defaultProjectIRR: ProjectIRR = {
  unleveredIRR: null,
  unleveredMultiple: null,
  unleveredPayback: null,
  peakFunding: 0,
  monthlyCashFlows: [],
  projectMetrics: null,
  exitCapRate: 7.0,
  exitAssumptions: { ...defaultExitAssumptions },
};

const defaultFinancing: Financing = {
  debtType: "conventional",
  ltc: 60,
  ltv: 60,
  interestRate: 6,
  loanToCostPercent: 60,
  maxLtvPercent: 60,
  constructionPeriodMonths: 30,
  amortizationYears: 10,
  hasBalloon: false,
  balloonPercent: 0,
  rateType: "fixed",
  baseRateName: "SOFR",
  baseRatePercent: 3,
  marginPercent: 2,
  fixedOrProfitRatePercent: 6,
  idcTreatment: "capitalized",
  idcCapitalizedSharePercent: 100,
  amortizationStyle: "interest_only",
  repaymentStructure: "fully-amortizing",
  interestOnlyPeriodYears: 0,
  landFinancing: {
    type: "equity",
    landLoanAmount: 0,
    landLoanRatePercent: 6,
    landLoanTenorYears: 5,
  },
  preferenceShares: {
    hasPreferenceShares: false,
    amount: 0,
    returnType: "fixed_dividend",
    returnPercent: 10,
    tenorMonths: DEFAULT_PREFERENCE_TENOR_MONTHS,
    redeemAtFairValue: false,
  },
  holdPeriodYears: 10,
  exitMethod: "sale",
  terminalCapRatePercent: 7.5,
  totalDebt: 0,
  monthlyDebtService: [],
  idcAmount: 0,
  dscrProfile: [],

  // Dynamic funding defaults
  monthlyFundingStack: [],
  peakEquityRequired: 0,
  totalInterestPaid: 0,
  totalCommitmentFeePaid: 0,
  loanAtCompletion: 0,
  debtFacilityAmount: 0,
  commitmentFeeRate: 1.0,
  equityFirstDraw: true,
  salesReduceEquity: true,
  salesReduceDebt: false,
  debtRepaymentPriority: 100,
  reimbursementModel: true,
  drawdownModel: "milestone-30-70",
  firstDrawdownProgress: 0.3,
  firstDrawdownMonth: 10,
  drawdownInterval: 8,
  milestoneThresholds: [30, 60, 90, 100],
  certificationInterval: 3,
  autoCalculateMilestoneMonths: true,
  overrideMilestoneMonths: undefined,

  // Step 4 drawdown tabs (UI-level)
  drawdownActiveTab: "scurve",
  drawdownQuarterly: { firstMonth: 0, lastMonth: 33 },
  drawdownScurve: { autoCalculate: true, milestones: [] },
  monthlyDrawdowns: undefined,

  // Step 6 loan repayment terms
  loanType: "equal-payment",
  gracePeriodYears: 2,
  gracePeriodStartYear: 4,
  prepaymentLockoutYears: 3,
  prepaymentPenalty: [5, 4, 3, 2, 1],
  yieldMaintenance: false,
  customAnnualPrincipal: undefined,
  customPercentages: undefined,
  amortizationSchedule: undefined,

  dscrTarget: 1.4,
  dscrFrequency: "annual",
  cureProvisions: false,
  maxLtvRatio: 70,
  minDebtYield: 8,
  exitStrategy: "hold",
  exitYear: 13,
  refinanceLtc: 60,
  refinanceRate: 5,
  saleCapRate: 7,
  saleCosts: 3,

  landPaymentMethod: "integrated",
  landEquityPercent: 40,
  landRefinanceIntoMain: true,
  landLoanLtc: 60,
  landLoanRate: 8,
  landAsCollateral: false,
};

const defaultEquityReturns: EquityReturns = {
  leveredIRR: null,
  equityMultiple: null,
  paybackPeriod: null,
  waterfall: [],
  dscrProfile: [],
};

const defaultScenarioMetrics: ScenarioMetrics = {
  unleveredIrr: 14.2,
  unleveredPaybackMonths: 42,
  leveredEquityIrr: 18.5,
  leveredPaybackMonths: 48,
  peakEquityRequired: 12_000_000,
  minDscr: 1.35,
};

const defaultSelectedDrivers: SelectedDrivers = {
  salesPrice: 0,
  constructionCost: 0,
  constructionDuration: 0,
  takeUpRate: 0,
};

const defaultScenarioAnalysis: ScenarioAnalysis = {
  baseCase: defaultScenarioMetrics,
  downside: { ...defaultScenarioMetrics, leveredEquityIrr: 8.5, unleveredIrr: 9.2 },
  upside: { ...defaultScenarioMetrics, leveredEquityIrr: 28.5, unleveredIrr: 19.1 },
  selectedDrivers: defaultSelectedDrivers,
};

// ---------------------------------------------------------------------------
// Store type
// ---------------------------------------------------------------------------

/** Per-stream Component 1 + project identity (isolated between sale and operational). */
export type FinModelStreamSlice = {
  projectInfo: ProjectInfo;
  cashOutflows: CashOutflows;
  /** Component 2 operational hotel hold wizard (Steps 1–5); synced from `/operational/cash-inflows`. */
  hotelHoldSnapshot?: OperationalHotelHoldSnapshot;
};

export type FinModelState = {
  /**
   * Selected stream for the current session. When set, the user should stay in
   * that stream (sale vs operational) unless they reset.
   */
  assetType: "sale" | "operational" | null;
  /** Sale stream: project + cash outflow wizard data (independent from operational). */
  sale: FinModelStreamSlice;
  /** Operational stream: project + cash outflow wizard data (independent from sale). */
  operational: FinModelStreamSlice;
  cashInflows: CashInflows;
  projectIRR: ProjectIRR;
  financing: Financing;
  equityReturns: EquityReturns;
  scenarioAnalysis: ScenarioAnalysis;
};

export type FinModelStreamKey = "sale" | "operational";

export function resolveFinModelStreamKey(
  explicit: FinModelStreamKey | undefined,
  assetType: "sale" | "operational" | null
): FinModelStreamKey {
  if (explicit === "sale" || explicit === "operational") return explicit;
  if (assetType === "sale" || assetType === "operational") return assetType;
  return "sale";
}

export type FinModelActions = {
  /** Locks the selected stream for the current session (no-op if already set to a different stream). */
  setAssetType: (assetType: "sale" | "operational") => void;
  /** Clears stream lock (e.g. on `/` so the user can pick Sale vs Operational again). */
  resetAssetType: () => void;
  updateProjectInfo: (
    data: Partial<ProjectInfo>,
    stream?: FinModelStreamKey
  ) => void;
  updateCashOutflows: (
    data: Partial<CashOutflows>,
    stream?: FinModelStreamKey
  ) => void;
  updateHotelHoldSnapshot: (
    data: OperationalHotelHoldSnapshot,
    stream?: FinModelStreamKey
  ) => void;
  updateCashInflows: (data: Partial<CashInflows>) => void;
  calculateProjectIRR: () => void;
  updateProjectIRR: (data: Partial<ProjectIRR>) => void;
  updateExitAssumptions: (
    assumptions: Partial<ProjectIRRExitAssumptions>
  ) => void;
  updateExitCapRate: (rate: number) => void;
  updateFinancing: (data: Partial<Financing>) => void;
  calculateEquityReturns: () => void;
  updateEquityReturns: (data: Partial<EquityReturns>) => void;
  runScenarioAnalysis: (driver: ScenarioDriver, shock: ScenarioShock) => void;
  resetAll: () => void;
};

export type FinModelStore = FinModelState & FinModelActions;

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

function cloneDefaultStreamSlice(): FinModelStreamSlice {
  return {
    projectInfo: structuredClone(defaultProjectInfo),
    cashOutflows: structuredClone(defaultCashOutflows),
  };
}

const initialState: FinModelState = {
  assetType: null,
  sale: cloneDefaultStreamSlice(),
  operational: cloneDefaultStreamSlice(),
  cashInflows: defaultCashInflows,
  projectIRR: defaultProjectIRR,
  financing: defaultFinancing,
  equityReturns: defaultEquityReturns,
  scenarioAnalysis: defaultScenarioAnalysis,
};

function applyScenarioShocks(
  base: ScenarioMetrics,
  drivers: SelectedDrivers
): ScenarioMetrics {
  let irrDelta = 0;
  let paybackDelta = 0;
  let peakDelta = 0;
  let dscrDelta = 0;

  const salesImpact = 3.2;
  const costImpact = 2.8;
  const durationImpact = 1.5;
  const takeUpImpact = 2.5;

  if (drivers.salesPrice === -1) {
    irrDelta -= salesImpact;
    paybackDelta += 6;
    peakDelta += 0.15 * base.peakEquityRequired;
    dscrDelta -= 0.12;
  } else if (drivers.salesPrice === 1) {
    irrDelta += salesImpact;
    paybackDelta -= 5;
    peakDelta -= 0.1 * base.peakEquityRequired;
    dscrDelta += 0.1;
  }

  if (drivers.constructionCost === 1) {
    irrDelta -= costImpact;
    paybackDelta += 4;
    peakDelta += 0.18 * base.peakEquityRequired;
    dscrDelta -= 0.1;
  } else if (drivers.constructionCost === -1) {
    irrDelta += costImpact;
    paybackDelta -= 3;
    peakDelta -= 0.12 * base.peakEquityRequired;
    dscrDelta += 0.08;
  }

  if (drivers.constructionDuration === 1) {
    irrDelta -= durationImpact;
    paybackDelta += 8;
    peakDelta += 0.08 * base.peakEquityRequired;
    dscrDelta -= 0.05;
  } else if (drivers.constructionDuration === -1) {
    irrDelta += durationImpact;
    paybackDelta -= 2;
    peakDelta -= 0.05 * base.peakEquityRequired;
    dscrDelta += 0.03;
  }

  if (drivers.takeUpRate === -1) {
    irrDelta -= takeUpImpact;
    paybackDelta += 7;
    peakDelta += 0.07 * base.peakEquityRequired;
    dscrDelta -= 0.09;
  } else if (drivers.takeUpRate === 1) {
    irrDelta += takeUpImpact;
    paybackDelta -= 6;
    peakDelta -= 0.06 * base.peakEquityRequired;
    dscrDelta += 0.08;
  }

  return {
    unleveredIrr: Math.max(2, Math.min(30, base.unleveredIrr + irrDelta * 0.7)),
    unleveredPaybackMonths: Math.max(24, base.unleveredPaybackMonths + paybackDelta),
    leveredEquityIrr: Math.max(2, Math.min(35, base.leveredEquityIrr + irrDelta)),
    leveredPaybackMonths: Math.max(30, base.leveredPaybackMonths + paybackDelta),
    peakEquityRequired: Math.max(1_000_000, base.peakEquityRequired + peakDelta),
    minDscr: Math.max(0.5, Math.min(2.5, base.minDscr + dscrDelta)),
  };
}

const useFinModelStore = create<FinModelStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAssetType: (assetType) => {
        set((state) => {
          if (state.assetType && state.assetType !== assetType) return state;
          if (state.assetType === assetType) return state;
          return { ...state, assetType };
        });
      },

      resetAssetType: () => {
        set((state) => ({ ...state, assetType: null }));
      },

      updateProjectInfo: (data, streamArg) => {
        set((state) => {
          const key = resolveFinModelStreamKey(streamArg, state.assetType);
          const slice = state[key];
          return {
            [key]: {
              ...slice,
              projectInfo: { ...slice.projectInfo, ...data },
            },
          } as Partial<FinModelState>;
        });
      },

      updateCashOutflows: (data, streamArg) => {
        set((state) => {
          const key = resolveFinModelStreamKey(streamArg, state.assetType);
          const prev = state[key].cashOutflows;
          const cashOutflows: CashOutflows = {
            ...prev,
            ...data,
            ...(data.stageAllocation && {
              stageAllocation: {
                ...prev.stageAllocation,
                ...data.stageAllocation,
              },
            }),
            ...(data.powcAllocation && {
              powcAllocation: {
                ...prev.powcAllocation,
                ...data.powcAllocation,
              },
            }),
            ...(data.softCostAllocation && {
              softCostAllocation: {
                ...prev.softCostAllocation,
                ...data.softCostAllocation,
              },
            }),
          };
          const syncConstructionToFinancing =
            typeof data.constructionPeriod === "number" &&
            Number.isFinite(data.constructionPeriod) &&
            data.constructionPeriod > 0;
          return {
            [key]: {
              ...state[key],
              cashOutflows,
            },
            ...(syncConstructionToFinancing && {
              financing: {
                ...state.financing,
                constructionPeriodMonths: data.constructionPeriod!,
              },
            }),
          } as Partial<FinModelState>;
        });
      },

      updateHotelHoldSnapshot: (data, streamArg) => {
        set((state) => {
          const key = resolveFinModelStreamKey(streamArg, state.assetType);
          return {
            [key]: {
              ...state[key],
              hotelHoldSnapshot: data,
            },
          } as Partial<FinModelState>;
        });
      },

      updateCashInflows: (data) => {
        set((state) => ({
          cashInflows: {
            ...state.cashInflows,
            ...data,
            ...(data.paymentPlans && {
              paymentPlans: {
                ...state.cashInflows.paymentPlans,
                ...data.paymentPlans,
              },
            }),
            ...(data.buyerMix && {
              buyerMix: { ...state.cashInflows.buyerMix, ...data.buyerMix },
            }),
            ...(data.salesUptake && {
              salesUptake: {
                ...state.cashInflows.salesUptake,
                ...data.salesUptake,
              },
            }),
            ...(data.bulkSales && {
              bulkSales: { ...state.cashInflows.bulkSales, ...data.bulkSales },
            }),
            ...(data.launchTiming && {
              launchTiming: {
                ...state.cashInflows.launchTiming,
                ...data.launchTiming,
              },
            }),
          },
        }));
      },

      calculateProjectIRR: () => {
        const st = get();
        const key = resolveFinModelStreamKey(undefined, st.assetType);
        const { cashOutflows } = st[key];
        const { cashInflows } = st;
        const months = cashOutflows.constructionPeriod + 60;
        const flows: MonthlyCashFlowPoint[] = [];
        for (let m = 0; m < months; m++) {
          let amount = 0;
          if (m < cashOutflows.constructionPeriod) {
            amount = -(cashOutflows.tdc / cashOutflows.constructionPeriod);
          } else if (m < cashOutflows.constructionPeriod + 36) {
            const revenue =
              (cashInflows.saleableBUARatio / 100) *
              20000 *
              cashInflows.salesPrice *
              0.01;
            amount = revenue / 36;
          }
          flows.push({ month: m, amount });
        }
        let peakFunding = 0;
        let cum = 0;
        for (const cf of flows) {
          cum += cf.amount;
          if (cum < peakFunding) peakFunding = cum;
        }
        set((state) => ({
          projectIRR: {
            ...state.projectIRR,
            exitCapRate: state.projectIRR.exitCapRate ?? 7.0,
            exitAssumptions:
              state.projectIRR.exitAssumptions ?? { ...defaultExitAssumptions },
            unleveredIRR: 14.2,
            unleveredMultiple: 1.85,
            unleveredPayback: 42,
            peakFunding: Math.abs(peakFunding),
            monthlyCashFlows: flows,
          },
        }));
      },

      updateProjectIRR: (data) => {
        set((state) => ({
          projectIRR: {
            ...state.projectIRR,
            ...data,
          },
        }));
      },

      updateExitAssumptions: (assumptions) => {
        set((state) => ({
          projectIRR: {
            ...state.projectIRR,
            exitAssumptions: {
              ...defaultExitAssumptions,
              ...(state.projectIRR.exitAssumptions ?? {}),
              ...assumptions,
            },
          },
        }));
      },

      updateExitCapRate: (rate) => {
        set((state) => ({
          projectIRR: {
            ...state.projectIRR,
            exitCapRate: Number.isFinite(rate) ? rate : 7.0,
          },
        }));
      },

      updateFinancing: (data) => {
        set((state) => ({
          financing: {
            ...state.financing,
            ...data,
            ...(data.landFinancing && {
              landFinancing: {
                ...state.financing.landFinancing,
                ...data.landFinancing,
              },
            }),
            ...(data.preferenceShares && {
              preferenceShares: {
                ...state.financing.preferenceShares,
                ...data.preferenceShares,
              },
            }),
          },
        }));
      },

      calculateEquityReturns: () => {
        const { projectIRR, financing } = get();
        set((state) => ({
          equityReturns: {
            ...state.equityReturns,
            leveredIRR: projectIRR.unleveredIRR != null ? 18.5 : null,
            equityMultiple: 2.1,
            paybackPeriod: 48,
            waterfall: [
              "Operating cash flows from project.",
              "Debt service paid first.",
              "Preference dividends and redemption.",
              "Residual to common equity.",
            ],
            dscrProfile: Array.from({ length: 24 }, (_, i) => ({
              month: i + 1,
              dscr: 1.35 - i * 0.01,
            })),
          },
        }));
      },

      updateEquityReturns: (data) => {
        set((state) => ({
          equityReturns: {
            ...state.equityReturns,
            ...data,
          },
        }));
      },

      runScenarioAnalysis: (driver, shock) => {
        const current = get().scenarioAnalysis.selectedDrivers;
        if (current[driver] === shock) return;
        set((state) => {
          const nextDrivers: SelectedDrivers = {
            ...state.scenarioAnalysis.selectedDrivers,
            [driver]: shock,
          };
          const base = state.scenarioAnalysis.baseCase;
          const downside = applyScenarioShocks(base, {
            salesPrice: -1,
            constructionCost: 1,
            constructionDuration: 1,
            takeUpRate: -1,
          });
          const upside = applyScenarioShocks(base, {
            salesPrice: 1,
            constructionCost: -1,
            constructionDuration: -1,
            takeUpRate: 1,
          });
          return {
            scenarioAnalysis: {
              ...state.scenarioAnalysis,
              selectedDrivers: nextDrivers,
              baseCase: base,
              downside,
              upside,
            },
          };
        });
      },

      resetAll: () => {
        set(initialState);
      },
    }),
    {
      name: "finmodel-storage",
      version: 6,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState as never;
        }
        const ps = persistedState as {
          state?: {
            financing?: { landFinancing?: { type?: string } };
            projectIRR?: ProjectIRR & {
              financingPreviewEquity?: ProjectMetrics | null;
            };
            assetType?: "sale" | "operational" | null;
          };
        };
        let next = persistedState as Record<string, unknown>;
        const lf = ps.state?.financing?.landFinancing;
        if (lf?.type === "vendor_finance" && ps.state?.financing) {
          next = {
            ...next,
            state: {
              ...ps.state,
              financing: {
                ...ps.state.financing,
                landFinancing: {
                  ...lf,
                  type: "equity",
                },
              },
            },
          };
        }
        let st = (next as typeof ps).state;
        if (st?.projectIRR) {
          const irr = st.projectIRR;
          const legacy = irr.financingPreviewEquity;
          const mergedMetrics: ProjectMetrics | null =
            irr.projectMetrics ??
            legacy ??
            null;
          const {
            financingPreviewEquity: _drop,
            ...irrRest
          } = irr as ProjectIRR & {
            financingPreviewEquity?: ProjectMetrics | null;
          };
          next = {
            ...next,
            state: {
              ...st,
              projectIRR: {
                ...irrRest,
                projectMetrics: mergedMetrics,
              },
            },
          };
          st = (next as typeof ps).state;
        }
        if (st?.projectIRR && st.projectIRR.projectMetrics === undefined) {
          next = {
            ...next,
            state: {
              ...st,
              projectIRR: {
                ...st.projectIRR,
                projectMetrics: null,
              },
            },
          };
          st = (next as typeof ps).state;
        }
        if (st?.projectIRR && st.projectIRR.exitAssumptions === undefined) {
          next = {
            ...next,
            state: {
              ...st,
              projectIRR: {
                ...st.projectIRR,
                exitAssumptions: { ...defaultExitAssumptions },
              },
            },
          };
          st = (next as typeof ps).state;
        }
        if (st?.projectIRR && (st.projectIRR as ProjectIRR).exitCapRate === undefined) {
          const irr = st.projectIRR as ProjectIRR;
          const fromLegacySaleCap =
            typeof irr.exitAssumptions?.saleCapRate === "number" &&
            irr.exitAssumptions.saleCapRate > 0
              ? irr.exitAssumptions.saleCapRate
              : 7.0;
          next = {
            ...next,
            state: {
              ...st,
              projectIRR: {
                ...irr,
                exitCapRate: fromLegacySaleCap,
              },
            },
          };
          st = (next as typeof ps).state;
        }
        if (st && (st as Record<string, unknown>).assetType === undefined) {
          next = {
            ...next,
            state: {
              ...st,
              assetType: null,
            },
          };
          st = (next as typeof ps).state;
        }
        // Legacy mistaken default (60 mo) vs financing preview dense grid default (36 mo).
        const stFin = (next as { state?: FinModelState }).state;
        const fin = stFin?.financing;
        if (
          stFin &&
          fin?.preferenceShares &&
          fin.preferenceShares.tenorMonths === 60
        ) {
          next = {
            ...next,
            state: {
              ...stFin,
              financing: {
                ...fin,
                preferenceShares: {
                  ...fin.preferenceShares,
                  tenorMonths: DEFAULT_PREFERENCE_TENOR_MONTHS,
                },
              },
            },
          };
        }

        const stFinal = (next as { state?: Record<string, unknown> }).state;
        if (
          stFinal &&
          stFinal.cashOutflows !== undefined &&
          (stFinal as { sale?: unknown }).sale === undefined
        ) {
          const legacy = stFinal as {
            projectInfo?: ProjectInfo;
            cashOutflows: CashOutflows;
          };
          const {
            projectInfo: legacyPi,
            cashOutflows: legacyCo,
            ...restLegacy
          } = legacy;
          next = {
            ...next,
            state: {
              ...restLegacy,
              sale: {
                projectInfo: legacyPi ?? structuredClone(defaultProjectInfo),
                cashOutflows: legacyCo,
              },
              operational: cloneDefaultStreamSlice(),
            },
          };
        }

        // Ensure persisted cashOutflows always include newly added fields (e.g. `ffe`)
        // by merging with `defaultCashOutflows` (including nested allocation objects).
        const mergedState = (next as { state?: Record<string, any> }).state;
        if (mergedState) {
          const mergeCashOutflows = (co: any): CashOutflows => {
            const prev = (co ?? {}) as Partial<CashOutflows>;
            return {
              ...structuredClone(defaultCashOutflows),
              ...prev,
              stageAllocation: {
                ...structuredClone(defaultStageAllocation),
                ...(prev.stageAllocation ?? {}),
              },
              powcAllocation: {
                ...structuredClone(defaultCashOutflows.powcAllocation),
                ...(prev.powcAllocation ?? {}),
              },
              softCostAllocation: {
                ...structuredClone(defaultCashOutflows.softCostAllocation),
                ...(prev.softCostAllocation ?? {}),
              },
            };
          };

          if (mergedState.sale?.cashOutflows) {
            mergedState.sale.cashOutflows = mergeCashOutflows(
              mergedState.sale.cashOutflows
            );
          }
          if (mergedState.operational?.cashOutflows) {
            mergedState.operational.cashOutflows = mergeCashOutflows(
              mergedState.operational.cashOutflows
            );
          }
        }

        return next as never;
      },
      partialize: (state) => ({
        assetType: state.assetType,
        sale: state.sale,
        operational: state.operational,
        cashInflows: state.cashInflows,
        projectIRR: state.projectIRR,
        financing: state.financing,
        equityReturns: state.equityReturns,
        scenarioAnalysis: state.scenarioAnalysis,
      }),
    }
  )
);

// ---------------------------------------------------------------------------
// Cash outflow preview helpers
// ---------------------------------------------------------------------------

export type CashOutflowStageHeader = {
  name: string;
  monthSpan: number;
};

export type CashOutflowProfile = {
  months: number[];
  construction: number[];
  /** FFE monthly timing (M0..M{constructionPeriod}). */
  ffe: number[];
  softCosts: number[];
  powc: number[];
  monthlyTotal: number[];
  cumulative: number[];
  stages: CashOutflowStageHeader[];
};

// Single continuous S-curve over the entire construction period (M1..M{totalMonths})
function allocateContinuousSCurve(totalCost: number, totalMonths: number): number[] {
  const allocation = Array(totalMonths + 1).fill(0); // index 0 = M0
  if (totalCost <= 0 || totalMonths <= 0) return allocation;

  for (let m = 1; m <= totalMonths; m++) {
    const progress = m / totalMonths;
    const sCurveValue = 1 / (1 + Math.exp(-12 * (progress - 0.5)));

    const prevProgress = (m - 1) / totalMonths;
    const prevSCurveValue = 1 / (1 + Math.exp(-12 * (prevProgress - 0.5)));

    const monthShare = Math.max(0, sCurveValue - prevSCurveValue);
    allocation[m] = totalCost * monthShare;
  }

  return allocation;
}

export function buildCashOutflowProfile(cashOutflows: CashOutflows): CashOutflowProfile {
  const constructionPeriod = cashOutflows.constructionPeriod || 0;

  if (constructionPeriod <= 0) {
    return {
      months: [],
      construction: [],
      ffe: [],
      softCosts: [],
      powc: [],
      monthlyTotal: [],
      cumulative: [],
      stages: [],
    };
  }

  // M0 (pre-construction) + M1..M{constructionPeriod} (construction months)
  const totalMonths = constructionPeriod + 1;
  const months = [0, ...Array.from({ length: constructionPeriod }, (_, i) => i + 1)];
  // cashOutflows.constructionCost is already the final value (including contingency)
  const constructionFinal = cashOutflows.constructionCost || 0;
  const construction = allocateContinuousSCurve(constructionFinal, constructionPeriod);
  const ffeTotal = cashOutflows.ffe || 0;
  const ffeMonthly = allocateFfeMonthly(ffeTotal, construction);
  const softCostsMonthly = Array(totalMonths).fill(0);
  const powcMonthly = Array(totalMonths).fill(0);
  const monthlyTotal = Array(totalMonths).fill(0);
  const cumulative = Array(totalMonths).fill(0);

  const { stageAllocation, landCost } = cashOutflows;

  const softCostsTotal = cashOutflows.softCosts || 0;
  const powcTotal = cashOutflows.powc || 0;

  const s1Percent = stageAllocation.stage1Percent || 0;
  const s2Percent = stageAllocation.stage2Percent || 0;
  const s3Percent = stageAllocation.stage3Percent || 0;

  // Construction stages only apply to M1..M{constructionPeriod}
  const stage1EndCount = Math.max(0, Math.round(constructionPeriod * (s1Percent / 100)));
  const stage2EndCount = Math.max(
    stage1EndCount,
    Math.round(constructionPeriod * ((s1Percent + s2Percent) / 100))
  );

  const stage1Months = Math.max(stage1EndCount, 1);
  const stage2Months = Math.max(stage2EndCount - stage1EndCount, 1);
  const stage1EndIndex = 1 + stage1EndCount; // exclusive
  const stage2EndIndex = 1 + stage2EndCount; // exclusive

  if (softCostsTotal > 0) {
    softCostsMonthly[0] = softCostsTotal * 0.5;
    if (constructionPeriod > 1) softCostsMonthly[1] = softCostsTotal * 0.3;
    if (constructionPeriod > 2) softCostsMonthly[2] = softCostsTotal * 0.2;
  }

  const powcByStep13 = allocatePowcMonthlyFromStep13(
    powcTotal,
    constructionPeriod,
    cashOutflows.powcAllocation
  );
  for (let m = 0; m < totalMonths; m++) {
    powcMonthly[m] += powcByStep13[m] ?? 0;
  }

  // Build monthly totals: construction + FFE + soft costs + POWC (+ land at M0)
  for (let m = 0; m < totalMonths; m++) {
    monthlyTotal[m] =
      construction[m] + (ffeMonthly[m] ?? 0) + softCostsMonthly[m] + powcMonthly[m];
    if (m === 0) {
      monthlyTotal[m] += landCost;
    }
  }

  // Cumulative running sum
  let cum = 0;
  for (let m = 0; m < totalMonths; m++) {
    cum += monthlyTotal[m];
    cumulative[m] = cum;
  }

  // Nudge final month to exactly match TDC to absorb rounding drift
  const tdcFromStore = cashOutflows.tdc || 0;
  const currentFinal = cumulative[cumulative.length - 1] ?? 0;
  const diff = tdcFromStore - currentFinal;

  // Only adjust if difference is material (> 1 currency unit)
  if (Math.abs(diff) > 1 && totalMonths > 0) {
    monthlyTotal[monthlyTotal.length - 1] += diff;
    cumulative[cumulative.length - 1] = tdcFromStore;
  }

  // Debug: verify monthly totals and cumulative vs TDC
  try {
    const sumOfMonthlyTotals = monthlyTotal.reduce((sum, val) => sum + val, 0);
    // eslint-disable-next-line no-console
    console.log("=== [Preview] CASH FLOW DEBUG ===", {
      landCost,
      constructionFinal,
      ffeTotal,
      softCostsTotal,
      powcTotal,
      tdcFromStore,
      sumOfMonthlyTotals,
      finalCumulative: cumulative[cumulative.length - 1] ?? 0,
      rawFinalBeforeAdjustment: currentFinal,
      adjustmentApplied: Math.abs(diff) > 1,
      diff,
      matchTdc:
        Math.abs((cumulative[cumulative.length - 1] ?? 0) - tdcFromStore) <
        Math.max(1, tdcFromStore * 0.0001),
    });
  } catch {
    // ignore logging failures
  }

  const rawStages: CashOutflowStageHeader[] = [
    {
      name: stageAllocation.stage1Label || "Enabling",
      monthSpan: stage1EndCount,
    },
    {
      name: stageAllocation.stage2Label || "Sub-Structure",
      monthSpan: stage2EndCount - stage1EndCount,
    },
    {
      name: stageAllocation.stage3Label || "Super + Finishes",
      monthSpan: constructionPeriod - stage2EndCount,
    },
  ];

  const stages = rawStages.filter((s) => s.monthSpan > 0);

  return {
    months,
    construction,
    ffe: ffeMonthly,
    softCosts: softCostsMonthly,
    powc: powcMonthly,
    monthlyTotal,
    cumulative,
    stages,
  };
}

export default useFinModelStore;
