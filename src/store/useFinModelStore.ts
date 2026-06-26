import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useAuditStore } from "@/store/useAuditStore";
import useScenarioStore from "@/store/useScenarioStore";
import type { ProjectSaveData } from "@/types/project";
import type { HotelOperatingType } from "@/config/hotel-cost-profiles";
import { allocatePowcMonthlyFromStep13 } from "@/lib/cash-outflow-powc-timing";
import { allocateFfeMonthly } from "@/lib/cash-outflow-ffe-timing";
import { buildSaleCashflowDetailProfile } from "@/lib/sale-cash-preview-profile";
import { solveAnnualIRRPreferred } from "@/lib/irr-calculations";
import {
  calculateSaleFinancing,
  type FinancingConfig,
  type FinancingResult,
} from "@/lib/sale-financing-engine";
import type { OperationalHotelHoldSnapshot } from "@/lib/operational-pnl";
import {
  defaultOperationalOfficeHoldSnapshot,
  defaultOperationalResidentialHoldSnapshot,
  defaultOperationalRetailHoldSnapshot,
  type OperationalOfficeHoldSnapshot,
  type OperationalResidentialHoldSnapshot,
  type OperationalRetailHoldSnapshot,
} from "@/lib/operational-pnl";
import type { FinancingMetrics, ProjectMetrics } from "./financingStore";
import { buildRecommendationQuery } from "../app/sale/utils/db-mapping";
import {
  getRecommendations,
  interpolateSCurveProfile,
  LANDED_G2_ESTATE_24M,
  HIRISE_RESIDENTIAL_36M,
  type ConstructionSCurveProfile,
  type SaleRecommendationBuildingType,
} from "../app/sale/data/recommendations";

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
  /** ISO-style country code (e.g. AE) — used by Sale wizard country/currency UX. */
  countryCode?: string;
  city: string;
  currency:
    | "AED"
    | "USD"
    | "MYR"
    | "OMR"
    | "SAR"
    | "KWD"
    | "QAR"
    | "BHD"
    | "GBP"
    | "VND"
    | "THB"
    | "AUD";
  buildingType: "residential" | "office" | "retail" | "hotel";
  /** Active model stream — set in Component 1 (sale vs operational). */
  stream?: "sale" | "operational";
  /** Business model for engine routing (e.g. DEV_FOR_SALE, HOLD, HOTEL). */
  businessModel?: string;
  /** Alias used by financing engine router (e.g. RESIDENTIAL, COMMERCIAL). */
  projectType?: string;
  /** Sale stream sub-type (more specific than `buildingType`). */
  buildingSubType?:
    | "residential_landed"
    | "residential_high_rise"
    | "commercial_landed"
    | "commercial_strata_office";
  hotelStarRating: string;
  /** Operational / hold hotel: budget | boutique | business | resort (empty when unset). */
  hotelOperatingType?: HotelOperatingType | "";
  /** Operational retail (Step 5): mall format archetype. */
  retailSegment?:
    | "regional_mall"
    | "lifestyle_center"
    | "community_center"
    | "outlet_center"
    | "";
  /** Operational retail (Step 5): market positioning tier. */
  retailPositioning?: "luxury" | "upscale" | "mid_market" | "value" | "";
  /** Operational office (Step 5): format archetype. */
  officeSegment?:
    | "prime_tower"
    | "business_park"
    | "secondary"
    | "co_working"
    | "";
  /** Operational office (Step 5): market positioning tier. */
  officePositioning?: "premium" | "grade_a" | "grade_b" | "grade_c" | "";
  /** Co-working only: landlord fit-out vs operator master lease. */
  officeCoworkingDelivery?: "developer" | "operator";
  /** Operational residential (Step 5): format archetype. */
  residentialSegment?:
    | "high_rise"
    | "mid_rise"
    | "townhome"
    | "compact"
    | "";
  /** Operational residential (Step 5): market positioning tier. */
  residentialPositioning?: "luxury" | "grade_a" | "grade_b" | "grade_c" | "";
  /** Operational residential: furnishing level for construction / FFE benchmarks. */
  residentialFurnishingLevel?:
    | "unfurnished"
    | "semi_furnished"
    | "fully_furnished";
  /** Serviced apartment overlay (high/mid-rise + luxury/grade A only). */
  residentialIsServicedApartment?: boolean;
  /** Operational retail Component 2 Step 3 — operating expenses summary. */
  retailOpex?: RetailOpexConfig;
  /** Operational residential Component 2 Step 3 — operating expenses summary. */
  residentialOpex?: ResidentialOpexConfig;
  /** Operational residential Component 2 Step 4 — depreciation & WC summary. */
  residentialDepreciation?: ResidentialDepreciationConfig;
  /**
   * Operational office Component 2 Step 3 — operating expenses.
   * `camTotal` / `propertyTax` / `insurance` (Year 1) sync Step 2 CAM recoveries when set.
   */
  officeOpex?: OfficeOpexConfig;
  /** Operational retail Component 2 Step 4 — depreciation & WC summary. */
  retailDepreciation?: RetailDepreciationConfig;
  /** Operational office Component 2 Step 4 — depreciation & WC summary. */
  officeDepreciation?: OfficeDepreciationConfig;
  buildingConfig: BuildingConfig;
};

export type RetailDepreciationConfig = {
  constructionLife: number;
  ffeLife: number;
  ffeRenovationPctYear6: number;
  tiLife: number;
  leasingCommLife: number;
  tiCapital: number;
  leasingCommCapital: number;
  arMonths: number;
  apMonths: number;
  projection: Array<{
    year: number;
    constructionDep: number;
    ffeDep: number;
    tiAmort: number;
    leasingCommAmort: number;
    totalDep: number;
    ar: number;
    ap: number;
    netWc: number;
  }>;
};

export type RetailOpexProjectionRow = {
  year: number;
  cam: number;
  tax: number;
  insurance: number;
  marketing: number;
  gAndA: number;
  mgmtFee: number;
  renovation: number;
  total: number;
};

export type RetailOpexConfig = {
  cam: { fixedBase: number; variableRate: number };
  property: { tax: number; insurance: number };
  marketing: { pctOfRevenue: number; gAndA: number };
  management: { feePct: number };
  renovation: { year1: number; year2: number; years3to10: number };
  projection: RetailOpexProjectionRow[];
};

export type ResidentialOpexProjectionRow = {
  year: number;
  mgmtFee: number;
  maintenance: number;
  utilities: number;
  tax: number;
  insurance: number;
  marketing: number;
  gAndA: number;
  capex: number;
  total: number;
  egi?: number;
};

export type ResidentialOpexConfig = {
  mgmtFeePctOfEgi: number;
  maintenancePerUnitAnnual: number;
  utilitiesFixedAnnual: number;
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  marketingPctOfEgi: number;
  gAndAAnnual: number;
  capexPerUnitAnnual: number;
  estimatedTotalUnits: number;
  projection: ResidentialOpexProjectionRow[];
};

export type ResidentialDepreciationProjectionRow = {
  year: number;
  constructionDep: number;
  ffeDep: number;
  totalDep: number;
  ar: number;
  ap: number;
  netWc: number;
  changeInWc: number;
  totalRevenue?: number;
};

export type ResidentialDepreciationConfig = {
  usefulLives: {
    construction: number;
    ffe: number;
    ffeRenovationPctYear6: number;
  };
  workingCapital: { arMonths: number; apMonths: number };
  projection: ResidentialDepreciationProjectionRow[];
};

export type OfficeOpexProjectionRow = RetailOpexProjectionRow;

export type OfficeDepreciationProjectionRow = {
  year: number;
  constructionDep: number;
  ffeDep: number;
  officeTiAmort: number;
  retailTiAmort: number;
  officeLeasingCommAmort: number;
  retailLeasingCommAmort: number;
  totalDep: number;
  ar: number;
  ap: number;
  netWc: number;
};

export type OfficeDepreciationConfig = {
  usefulLives: {
    construction: number;
    ffe: number;
    officeTi: number;
    retailTi: number;
    officeLeasingComm: number;
    retailLeasingComm: number;
  };
  ffeRenovationPctYear6: number;
  workingCapital: { arMonths: number; apMonths: number };
  bases: {
    constructionCost: number;
    ffe: number;
    officeTi: number;
    retailTi: number;
    officeLeasingComm: number;
    retailLeasingComm: number;
  };
  projection: OfficeDepreciationProjectionRow[];
};

export type OfficeOpexConfig = {
  /** Year 1 CAM total — syncs Step 2 recoveries when set */
  camTotal: number;
  propertyTax: number;
  insurance: number;
  cam: { fixedBase: number; variableRate: number };
  property: { tax: number; insurance: number };
  marketing: { pctOfRevenue: number; gAndA: number };
  management: { feePct: number };
  renovation: { year1: number; year2: number; years3to10: number };
  projection: OfficeOpexProjectionRow[];
};

export type StageAllocation = {
  stage1Label: string;
  stage1Percent: number;
  stage2Label: string;
  stage2Percent: number;
  stage3Label: string;
  stage3Percent: number;
  stage4Label: string;
  stage4Percent: number;
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
  /** Retail mall: tenant improvement allowance (Component 1). */
  tiAllowance?: number;
  /** Retail mall: capitalized leasing commissions (Component 1). */
  leasingCommissions?: number;
  /** Office hold: office tenant improvement allowance (Component 1). */
  officeTiAllowance?: number;
  /** Office hold: retail podium TI allowance (Component 1). */
  retailTiAllowance?: number;
  /** Office hold: office leasing commissions capitalized (Component 1). */
  officeLeasingCommissions?: number;
  /** Office hold: retail leasing commissions capitalized (Component 1). */
  retailLeasingCommissions?: number;
  softCostsTotal?: number;
  powcTotal?: number;
  tdc: number;
  /** Last hotel benchmark profile applied on operational SC/POWC/FFE step. */
  operationalHotelProfileKey?: string;
  /** User overrode auto % from hotel profile (operational stream). */
  operationalHotelScManual?: boolean;
  operationalHotelPowcManual?: boolean;
  operationalHotelFfeManual?: boolean;
  /** Last retail benchmark profile applied (country:segment:positioning). */
  operationalRetailProfileKey?: string;
  operationalRetailBuildingRateManual?: boolean;
  operationalRetailParkingRateManual?: boolean;
  operationalRetailBasementRateManual?: boolean;
  operationalRetailScManual?: boolean;
  operationalRetailPowcManual?: boolean;
  operationalRetailFfeManual?: boolean;
  operationalRetailLandRateManual?: boolean;
  /** Last office benchmark profile applied (country:segment:positioning:delivery). */
  operationalOfficeProfileKey?: string;
  operationalOfficeBuildingRateManual?: boolean;
  operationalOfficeParkingRateManual?: boolean;
  operationalOfficeBasementRateManual?: boolean;
  operationalOfficeScManual?: boolean;
  operationalOfficePowcManual?: boolean;
  operationalOfficeFfeManual?: boolean;
  operationalOfficeLandRateManual?: boolean;
  /** Last residential benchmark profile applied (country:segment:positioning:furnishing). */
  operationalResidentialProfileKey?: string;
  operationalResidentialBuildingRateManual?: boolean;
  operationalResidentialParkingRateManual?: boolean;
  operationalResidentialBasementRateManual?: boolean;
  operationalResidentialScManual?: boolean;
  operationalResidentialPowcManual?: boolean;
  operationalResidentialFfeManual?: boolean;
  operationalResidentialLandRateManual?: boolean;
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
  /**
   * Sum of operating cash flow (Y4–Y13) from Project IRR P&L:
   * net income + depreciation − Δ working capital. Set by project-irr / financing wizards.
   */
  operatingTotalNetCashFlows?: number;
};

export type LandLoanInterestTreatment =
  | "capitalize"
  | "paid-current-quarterly"
  | "paid-current-semiannual";

export type LandFinancing = {
  type: "equity" | "land_loan";
  landLoanAmount: number;
  landLoanRatePercent: number;
  landLoanTenorYears: number;
  /** Bullet maturity in months (defaults to construction + 6 when omitted). */
  landLoanTenorMonths?: number;
  landLoanInterestTreatment?: LandLoanInterestTreatment;
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

/** Escrow withdrawal settings (Component 4 Step 5 — jurisdiction-specific). */
export type FinancingEscrowConfig = {
  withdrawalMode?: "malaysia" | "uae" | "australia";
  malaysia?: {
    propertyType: "HIGH_RISE" | "LANDED";
    retentionFirstReleaseMonths: number;
    retentionFinalReleaseMonths: number;
    /** HDA deposit as % of total construction costs (percent points, e.g. 3 = 3%). */
    hdaDepositPct?: number;
    hdaDepositEnabled?: boolean;
  };
  uaeSa?: {
    certificationInterval: 3 | 6;
    retentionPercentage: number;
  };
  australia?: {
    depositPct: number;
    balancePct: number;
    /** @deprecated Use depositPct */
    retentionPct?: number;
    /** @deprecated Use balancePct */
    releasePct?: number;
  };
};

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
  /** Land loan arrangement fee as decimal (e.g. 0.01 = 1%). */
  landLoanArrangementFeePct?: number;
  /** Land loan legal/valuation fee as decimal (e.g. 0.0025 = 0.25%). */
  landLoanValuationFeePct?: number;
  /** Mezzanine / preference shares (Component 4 Step 4). Engine reads via `financing-cash-flow-engine-bridge`. */
  preferenceShares: PreferenceShares;
  /** Escrow withdrawal method & jurisdiction params (Component 4 Step 5). */
  escrowConfig?: FinancingEscrowConfig;
  /** Commercial sale: simplified NCF, no escrow/trust, CP+6 preview tenor. */
  financingModel?: "commercial" | "residential";
  escrowSetupFee?: number;
  escrowManagementFeePct?: number;
  /** Malaysia HDA deposit % of construction costs (percent points). */
  hdaDepositPct?: number;
  hdaDepositEnabled?: boolean;
  holdPeriodYears: number;
  exitMethod: string;
  terminalCapRatePercent: number;
  // Derived outputs
  totalDebt: number;
  monthlyDebtService: { month: number; service: number }[];
  idcAmount: number;
  dscrProfile: { month: number; dscr: number; atRisk: boolean }[];

  /**
   * Operational preview convenience: dense monthly rows (M0..M{horizon})
   * stored in spreadsheet units ('000). This is derived from preview calculations
   * so other previews (e.g. equity returns) can read it reliably.
   */
  monthlyData?: Array<{
    month: number;
    equityInjection?: number; // '000 (includes gap-fill equity)
    equityCureDeposit?: number; // '000 (DSRA deposits / equity cure)
    cumulativeNCFPostFin?: number; // '000
  }>;

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
  /** Step 2 approved RCF / senior facility (explicit persist; preferred over recomputed LTC/LTV min). */
  approvedCreditFacility?: number;
  commitmentFeeRate?: number; // % p.a. on undrawn portion
  /** Annual commitment fee, percent points (e.g. 0.5 = 0.5% p.a.); mirrors wizard Step 2 / `config.commitmentFeePct`. */
  commitmentFeePct?: number;
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
  /** Legacy mirror of "100% land equity"; engine uses `landEquityPercent === 100` only — keep cleared when toggle OFF */
  landAsEquity?: boolean;
  landRefinanceIntoMain?: boolean;
  landLoanLtc?: number;
  landLoanRate?: number;
  landAsCollateral?: boolean;

  /** Step 3 (residential wizard): land equity value for engine — 70% haircut when 100% land equity, else land × %. */
  landEquityValue?: number;
  /** Step 3 (residential wizard): cash equity after land counted toward TDC. */
  cashEquityRequired?: number;
  /** Step 4 preference shares: % of cash equity residual allocated to pref tranche. */
  prefSharesAllocationPct?: number;

  /** Sale financing engine inputs (Component 4 sale stream). */
  config?: FinancingConfig;
  /** Sale financing engine outputs from `calculateSaleFinancing`. */
  result?: FinancingResult | null;
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
  stage1Label: "Enabling",
  stage1Percent: 10,
  stage2Label: "Sub-Structure",
  stage2Percent: 20,
  stage3Label: "Super Structure",
  stage3Percent: 40,
  stage4Label: "Finishes",
  stage4Percent: 30,
};

const defaultProjectInfo: ProjectInfo = {
  country: "",
  countryCode: "",
  city: "",
  currency: "AED",
  buildingType: "residential",
  buildingSubType: "residential_landed",
  hotelStarRating: "",
  hotelOperatingType: "",
  retailSegment: "",
  retailPositioning: "",
  residentialSegment: "",
  residentialPositioning: "",
  residentialFurnishingLevel: "unfurnished",
  residentialIsServicedApartment: false,
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
  operationalRetailProfileKey: undefined,
  operationalRetailBuildingRateManual: false,
  operationalRetailParkingRateManual: false,
  operationalRetailBasementRateManual: false,
  operationalRetailScManual: false,
  operationalRetailPowcManual: false,
  operationalRetailFfeManual: false,
  operationalRetailLandRateManual: false,
  operationalOfficeProfileKey: undefined,
  operationalOfficeBuildingRateManual: false,
  operationalOfficeParkingRateManual: false,
  operationalOfficeBasementRateManual: false,
  operationalOfficeScManual: false,
  operationalOfficePowcManual: false,
  operationalOfficeFfeManual: false,
  operationalOfficeLandRateManual: false,
  operationalResidentialProfileKey: undefined,
  operationalResidentialBuildingRateManual: false,
  operationalResidentialParkingRateManual: false,
  operationalResidentialBasementRateManual: false,
  operationalResidentialScManual: false,
  operationalResidentialPowcManual: false,
  operationalResidentialFfeManual: false,
  operationalResidentialLandRateManual: false,
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

const DEFAULT_FINANCING_CONFIG: FinancingConfig = {
  loanToCostPercent: 60,
  maxLtvPercent: 60,

  rateType: "fixed",
  baseRateName: "SOFR",
  baseRatePercent: 3,
  marginPercent: 2,
  fixedOrProfitRatePercent: 6,

  landEquityPct: 20,
  isLandIntegrated: true,
  commitmentFeePct: 0.5,
  interestRatePct: 6.0,
  idcTreatment: "capitalize",
  idcCapitalizedSharePct: 100,
  drawdownMode: "30/70",
  milestoneThresholdPct: 30,
  certificationIntervalMonths: 3,
  salesRecyclingMode: "immediate",
  escrowReleaseTrigger: "handover",
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
  monthlyData: [],

  // Dynamic funding defaults
  monthlyFundingStack: [],
  peakEquityRequired: 0,
  totalInterestPaid: 0,
  totalCommitmentFeePaid: 0,
  loanAtCompletion: 0,
  debtFacilityAmount: 0,
  approvedCreditFacility: 0,
  commitmentFeeRate: 1.0,
  commitmentFeePct: 0.5,
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
  landAsEquity: false,
  landRefinanceIntoMain: true,
  landLoanLtc: 60,
  landLoanRate: 8,
  landAsCollateral: false,

  // Sale financing engine
  config: DEFAULT_FINANCING_CONFIG,
  result: null,
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
  /** Convenience alias for `projectInfo.buildingConfig` (stream-isolated). */
  buildingConfig: BuildingConfig;
  /**
   * Sale-stream isolated copies of the global slices.
   * Operational can adopt these later; for now, operational pages still use global slices.
   */
  cashInflows: CashInflows;
  projectIRR: ProjectIRR;
  financing: Financing;
  equityReturns: EquityReturns;
  scenarioAnalysis: ScenarioAnalysis;
  /** Component 2 operational hotel hold wizard (Steps 1–5); synced from `/operational/cash-inflows`. */
  hotelHoldSnapshot?: OperationalHotelHoldSnapshot;
  /** Component 2 operational retail hold wizard (Steps 1–2+); synced from `/operational/cash-inflows`. */
  retailHoldSnapshot?: OperationalRetailHoldSnapshot;
  /** Component 2 operational office hold wizard (Step 1+); synced from `/operational/cash-inflows`. */
  officeHoldSnapshot?: OperationalOfficeHoldSnapshot;
  /** Component 2 operational residential hold wizard (Step 1+); synced from `/operational/cash-inflows`. */
  residentialHoldSnapshot?: OperationalResidentialHoldSnapshot;
  /** Headline KPIs from `/preview/financing` (Component 5 summary). */
  financingMetrics?: FinancingMetrics | null;
  /** Component 6 dynamic shock values keyed by factor id (e.g. `base_rent_psf`). */
  scenarioShocks: Record<string, number>;
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
  /** Persisted cloud project id for the active study session (if any). */
  activeProjectId: string | null;
  activeProjectName: string | null;
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
  updateRetailHoldSnapshot: (
    data: OperationalRetailHoldSnapshot,
    stream?: FinModelStreamKey
  ) => void;
  updateOfficeHoldSnapshot: (
    data: OperationalOfficeHoldSnapshot,
    stream?: FinModelStreamKey
  ) => void;
  updateResidentialHoldSnapshot: (
    data: OperationalResidentialHoldSnapshot,
    stream?: FinModelStreamKey
  ) => void;
  updateCashInflows: (
    data: Partial<CashInflows>,
    stream?: FinModelStreamKey
  ) => void;
  calculateProjectIRR: (stream?: FinModelStreamKey) => void;
  /** Merge into global `projectIRR`, or into `sale` / `operational` slice when `stream` is set. */
  updateProjectIRR: (
    data: Partial<ProjectIRR>,
    stream?: FinModelStreamKey
  ) => void;
  updateExitAssumptions: (
    assumptions: Partial<ProjectIRRExitAssumptions>
  ) => void;
  updateExitCapRate: (rate: number) => void;
  updateFinancing: (data: Partial<Financing>, stream?: FinModelStreamKey) => void;
  updateFinancingMetrics: (
    data: Partial<FinancingMetrics>,
    stream?: FinModelStreamKey
  ) => void;
  updateFinancingConfig: (partial: Partial<FinancingConfig>) => void;
  calculateFinancing: () => void;
  calculateEquityReturns: () => void;
  /** Merges into global `equityReturns` and, when explicit, into `sale` / `operational` stream slice (via `resolveFinModelStreamKey`). */
  updateEquityReturns: (
    data: Partial<EquityReturns>,
    stream?: FinModelStreamKey
  ) => void;
  /** Merge shock values into the stream's `scenarioShocks` map. */
  updateScenarioShocks: (
    patch: Record<string, number>,
    stream?: FinModelStreamKey
  ) => void;
  /** Replace the stream's `scenarioShocks` map (e.g. reset all / asset switch). */
  setScenarioShocks: (
    shocks: Record<string, number>,
    stream?: FinModelStreamKey
  ) => void;
  /** Clear all scenario shocks for a stream. */
  resetScenarioShocks: (stream?: FinModelStreamKey) => void;
  runScenarioAnalysis: (driver: ScenarioDriver, shock: ScenarioShock) => void;
  resetAll: () => void;
  saveProject: (stream?: FinModelStreamKey) => void;
  /** Restore Zustand state from a Puter KV saved project payload. */
  hydrateProject: (savedData: ProjectSaveData) => void;
  /** Track the active saved project for update-in-place saves. */
  setActiveProject: (projectId: string | null, projectName?: string | null) => void;
  /** Reset the operational stream slice to defaults (new study). */
  resetOperational: () => void;
  /** Reset the sale stream slice to defaults (new study). */
  resetSale: () => void;
  resetProject: () => void;
};

export type FinModelStore = FinModelState & FinModelActions;

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

function cloneDefaultStreamSlice(): FinModelStreamSlice {
  return {
    projectInfo: structuredClone(defaultProjectInfo),
    cashOutflows: structuredClone(defaultCashOutflows),
    buildingConfig: structuredClone(defaultBuildingConfig),
    cashInflows: structuredClone(defaultCashInflows),
    projectIRR: structuredClone(defaultProjectIRR),
    financing: structuredClone(defaultFinancing),
    equityReturns: structuredClone(defaultEquityReturns),
    scenarioAnalysis: structuredClone(defaultScenarioAnalysis),
    retailHoldSnapshot: structuredClone(defaultOperationalRetailHoldSnapshot),
    officeHoldSnapshot: structuredClone(defaultOperationalOfficeHoldSnapshot),
    residentialHoldSnapshot: structuredClone(
      defaultOperationalResidentialHoldSnapshot
    ),
    financingMetrics: null,
    scenarioShocks: {},
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
  activeProjectId: null,
  activeProjectName: null,
};

function mergeCashInflowsPatch(
  prev: CashInflows,
  data: Partial<CashInflows>
): CashInflows {
  return {
    ...prev,
    ...data,
    ...(data.paymentPlans && {
      paymentPlans: {
        ...prev.paymentPlans,
        ...data.paymentPlans,
      },
    }),
    ...(data.buyerMix && {
      buyerMix: { ...prev.buyerMix, ...data.buyerMix },
    }),
    ...(data.salesUptake && {
      salesUptake: {
        ...prev.salesUptake,
        ...data.salesUptake,
      },
    }),
    ...(data.bulkSales && {
      bulkSales: { ...prev.bulkSales, ...data.bulkSales },
    }),
    ...(data.launchTiming && {
      launchTiming: {
        ...prev.launchTiming,
        ...data.launchTiming,
      },
    }),
  };
}

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
          const nextProjectInfo = { ...slice.projectInfo, ...data };
          return {
            [key]: {
              ...slice,
              projectInfo: nextProjectInfo,
              ...(data.buildingConfig && {
                buildingConfig: data.buildingConfig,
              }),
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

      updateRetailHoldSnapshot: (data, streamArg) => {
        set((state) => {
          const key = resolveFinModelStreamKey(streamArg, state.assetType);
          return {
            [key]: {
              ...state[key],
              retailHoldSnapshot: data,
            },
          } as Partial<FinModelState>;
        });
      },

      updateOfficeHoldSnapshot: (data, streamArg) => {
        set((state) => {
          const key = resolveFinModelStreamKey(streamArg, state.assetType);
          return {
            [key]: {
              ...state[key],
              officeHoldSnapshot: data,
            },
          } as Partial<FinModelState>;
        });
      },

      updateResidentialHoldSnapshot: (data, streamArg) => {
        set((state) => {
          const key = resolveFinModelStreamKey(streamArg, state.assetType);
          return {
            [key]: {
              ...state[key],
              residentialHoldSnapshot: data,
            },
          } as Partial<FinModelState>;
        });
      },

      updateCashInflows: (data, streamArg) => {
        set((state) => {
          if (streamArg === "sale" || streamArg === "operational") {
            const key = streamArg;
            return {
              [key]: {
                ...state[key],
                cashInflows: mergeCashInflowsPatch(state[key].cashInflows, data),
              },
            } as Partial<FinModelState>;
          }
          return {
            cashInflows: mergeCashInflowsPatch(state.cashInflows, data),
          };
        });
      },

      calculateProjectIRR: (streamArg) => {
        const st = get();
        const key = resolveFinModelStreamKey(streamArg, st.assetType);
        const slice = st[key];

        const cashOutflows = slice.cashOutflows;
        const cashInflows = slice.cashInflows;
        const constructionPeriod = cashOutflows.constructionPeriod || 0;
        const postCompletionBuffer = 6;
        const totalMonths = Math.max(0, constructionPeriod) + postCompletionBuffer;

        // Build monthly outflows using the same Sale preview detail engine (POWC timing, etc.)
        const outflowByMonth: number[] = Array(totalMonths + 1).fill(0);
        try {
          const detail = buildSaleCashflowDetailProfile(cashOutflows, slice.projectInfo);
          for (let m = 0; m <= Math.min(constructionPeriod, totalMonths); m++) {
            outflowByMonth[m] = detail.monthlyTotal[m] || 0;
          }
        } catch {
          // Fallback: land at M0; evenly spread remaining TDC across construction months (M1..Mcp).
          outflowByMonth[0] = cashOutflows.landCost || 0;
          if (constructionPeriod > 0) {
            const remainder =
              Math.max(
                0,
                (cashOutflows.tdc || 0) - (cashOutflows.landCost || 0)
              );
            const per = remainder / constructionPeriod;
            for (let m = 1; m <= Math.min(constructionPeriod, totalMonths); m++) {
              outflowByMonth[m] = per;
            }
          }
        }

        const inflowMap = new Map<number, number>();
        for (const p of cashInflows.monthlyInflowSchedule || []) {
          inflowMap.set(p.month, (inflowMap.get(p.month) || 0) + (p.amount || 0));
        }

        const flows: MonthlyCashFlowPoint[] = Array.from(
          { length: totalMonths + 1 },
          (_, m) => ({
            month: m,
            amount: (inflowMap.get(m) || 0) - (outflowByMonth[m] || 0),
          })
        );

        // Metrics
        let cum = 0;
        let peakFunding = 0;
        let payback: number | null = null;
        let totalPos = 0;
        let totalNegAbs = 0;
        for (const cf of flows) {
          cum += cf.amount;
          if (cum < peakFunding) peakFunding = cum;
          if (payback == null && cum >= 0) payback = cf.month;
          if (cf.amount > 0) totalPos += cf.amount;
          if (cf.amount < 0) totalNegAbs += Math.abs(cf.amount);
        }

        let annualIRR: number | null = null; // decimal (0.12 = 12%)
        try {
          const solved = solveAnnualIRRPreferred(flows, {
            preferredAnnualIRR: 0.15,
          });
          annualIRR = solved.annualIRR;
        } catch {
          annualIRR = null;
        }

        const nextProjectIRR: ProjectIRR = {
          ...slice.projectIRR,
          exitCapRate: slice.projectIRR.exitCapRate ?? 7.0,
          exitAssumptions:
            slice.projectIRR.exitAssumptions ?? { ...defaultExitAssumptions },
          // Store as percent for display consistency across pages.
          unleveredIRR: annualIRR != null ? annualIRR * 100 : null,
          unleveredMultiple: totalNegAbs > 0 ? totalPos / totalNegAbs : null,
          unleveredPayback: payback,
          peakFunding: Math.abs(peakFunding),
          monthlyCashFlows: flows,
        };

        set((state) => ({
          [key]: { ...state[key], projectIRR: nextProjectIRR },
        }) as Partial<FinModelState>);
      },

      updateProjectIRR: (data, streamArg) => {
        set((state) => {
          if (streamArg === "operational" || streamArg === "sale") {
            const slice = state[streamArg];
            return {
              [streamArg]: {
                ...slice,
                projectIRR: {
                  ...slice.projectIRR,
                  ...data,
                },
              },
            } as Partial<FinModelState>;
          }
          return {
            projectIRR: {
              ...state.projectIRR,
              ...data,
            },
          };
        });
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

      updateFinancing: (data, streamArg) => {
        set((state) => {
          const key = resolveFinModelStreamKey(streamArg, state.assetType);
          const prev = state[key].financing;
          const financing: Financing = {
            ...prev,
            ...data,
            ...(data.landFinancing && {
              landFinancing: {
                ...prev.landFinancing,
                ...data.landFinancing,
              },
            }),
            ...(data.preferenceShares && {
              preferenceShares: {
                ...prev.preferenceShares,
                ...data.preferenceShares,
              },
            }),
          };
          return {
            [key]: { ...state[key], financing },
          } as Partial<FinModelState>;
        });
      },

      updateFinancingMetrics: (data, streamArg) => {
        set((state) => {
          const key = resolveFinModelStreamKey(streamArg, state.assetType);
          const prev = state[key].financingMetrics ?? {};
          return {
            [key]: {
              ...state[key],
              financingMetrics: { ...prev, ...data },
            },
          } as Partial<FinModelState>;
        });
      },

      updateFinancingConfig: (partial) => {
        set((state) => ({
          sale: {
            ...state.sale,
            financing: {
              ...state.sale.financing,
              config: {
                ...(state.sale.financing.config ?? DEFAULT_FINANCING_CONFIG),
                ...partial,
              },
            },
          },
        }));
      },

      calculateFinancing: () => {
        set((state) => {
          const sale = state.sale;
          const cfg = sale.financing.config ?? DEFAULT_FINANCING_CONFIG;
          const effectiveInterestRatePct =
            cfg.rateType === "floating"
              ? (cfg.baseRatePercent || 0) + (cfg.marginPercent || 0)
              : cfg.fixedOrProfitRatePercent || cfg.interestRatePct || 0;
          const engineConfig: FinancingConfig = {
            ...cfg,
            interestRatePct: effectiveInterestRatePct,
          };
          const result = calculateSaleFinancing(
            sale.cashOutflows,
            sale.cashInflows,
            engineConfig,
            sale.cashOutflows.constructionPeriod || 36
          );
          return {
            sale: {
              ...sale,
              financing: { ...sale.financing, result },
            },
          } as Partial<FinModelState>;
        });
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

      updateEquityReturns: (data, stream) => {
        set((state) => {
          const key = resolveFinModelStreamKey(stream, state.assetType);
          const slicePatch =
            key === "operational" || key === "sale"
              ? ({
                  [key]: {
                    ...state[key],
                    equityReturns: {
                      ...state[key].equityReturns,
                      ...data,
                    },
                  },
                } as Partial<FinModelState>)
              : {};
          return {
            ...slicePatch,
            equityReturns: {
              ...state.equityReturns,
              ...data,
            },
          };
        });
      },

      updateScenarioShocks: (patch, streamArg) => {
        set((state) => {
          const key = resolveFinModelStreamKey(streamArg, state.assetType);
          return {
            [key]: {
              ...state[key],
              scenarioShocks: {
                ...(state[key].scenarioShocks ?? {}),
                ...patch,
              },
            },
          } as Partial<FinModelState>;
        });
      },

      setScenarioShocks: (shocks, streamArg) => {
        set((state) => {
          const key = resolveFinModelStreamKey(streamArg, state.assetType);
          return {
            [key]: {
              ...state[key],
              scenarioShocks: { ...shocks },
            },
          } as Partial<FinModelState>;
        });
      },

      resetScenarioShocks: (streamArg) => {
        set((state) => {
          const key = resolveFinModelStreamKey(streamArg, state.assetType);
          return {
            [key]: {
              ...state[key],
              scenarioShocks: {},
            },
          } as Partial<FinModelState>;
        });
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

      saveProject: (streamArg) => {
        const state = get();
        const key = resolveFinModelStreamKey(streamArg, state.assetType);
        const slice = state[key];

        const pi = slice.projectInfo;
        const buildingType = pi?.buildingType;
        const segment =
          buildingType === "office"
            ? pi.officeSegment
            : buildingType === "retail"
              ? pi.retailSegment
              : buildingType === "residential"
                ? pi.residentialSegment
                : "";
        const positioning =
          buildingType === "office"
            ? pi.officePositioning
            : buildingType === "retail"
              ? pi.retailPositioning
              : buildingType === "residential"
                ? pi.residentialPositioning
                : "";

        const parts = [
          key,
          buildingType,
          segment,
          positioning,
          pi?.country,
          pi?.city,
          new Date().toISOString().split("T")[0],
        ]
          .filter(Boolean)
          .map((p) => String(p));

        const fileName = parts
          .join("-")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .toLowerCase()
          .concat(".json");

        const payload = {
          version: 1,
          exportedAt: new Date().toISOString(),
          stream: key,
          state,
        };

        const dataStr = JSON.stringify(payload, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      },

      hydrateProject: (savedData) => {
        const stream = savedData.stream === "sale" ? "sale" : "operational";
        const collected = savedData.collectedState;

        set((state) => {
          const currentSlice = state[stream];
          const hydratedSlice: FinModelStreamSlice = {
            ...currentSlice,
            projectInfo: savedData.projectInfo,
            buildingConfig: savedData.projectInfo.buildingConfig,
            cashOutflows: savedData.cashOutflows,
            cashInflows: savedData.cashInflows,
            financing: savedData.financing,
            projectIRR: savedData.projectIRR,
            equityReturns:
              collected?.equityReturns ?? currentSlice.equityReturns,
            scenarioAnalysis:
              collected?.scenarioAnalysis ?? currentSlice.scenarioAnalysis,
            scenarioShocks:
              collected?.scenarioShocks ?? currentSlice.scenarioShocks ?? {},
            financingMetrics:
              collected?.financingMetrics ?? currentSlice.financingMetrics ?? null,
            hotelHoldSnapshot:
              collected?.hotelHoldSnapshot ?? currentSlice.hotelHoldSnapshot,
            retailHoldSnapshot:
              collected?.retailHoldSnapshot ?? currentSlice.retailHoldSnapshot,
            officeHoldSnapshot:
              collected?.officeHoldSnapshot ?? currentSlice.officeHoldSnapshot,
            residentialHoldSnapshot:
              collected?.residentialHoldSnapshot ??
              currentSlice.residentialHoldSnapshot,
          };

          return {
            assetType: stream,
            [stream]: hydratedSlice,
            cashInflows: savedData.cashInflows,
            projectIRR: savedData.projectIRR,
            financing: savedData.financing,
            equityReturns: collected?.equityReturns ?? state.equityReturns,
            scenarioAnalysis:
              collected?.scenarioAnalysis ?? state.scenarioAnalysis,
          } as Partial<FinModelState>;
        });

        if (collected?.scenarioStore) {
          useScenarioStore.setState({
            defaultDrivers: collected.scenarioStore.defaultDrivers,
            customDrivers: collected.scenarioStore.customDrivers,
            baseCaseMetrics: collected.scenarioStore.baseCaseMetrics,
            scenarioMetrics: collected.scenarioStore.scenarioMetrics,
            isRecalculating: collected.scenarioStore.isRecalculating,
            lastCalculationAt: collected.scenarioStore.lastCalculationAt,
          });
        }

        get().setActiveProject(
          savedData.projectId,
          savedData.projectName || null
        );
      },

      setActiveProject: (projectId, projectName = null) => {
        set({
          activeProjectId: projectId,
          activeProjectName: projectName ?? null,
        });
      },

      resetOperational: () => {
        set({
          assetType: "operational",
          operational: cloneDefaultStreamSlice(),
          activeProjectId: null,
          activeProjectName: null,
        });
      },

      resetSale: () => {
        set({
          assetType: "sale",
          sale: cloneDefaultStreamSlice(),
          activeProjectId: null,
          activeProjectName: null,
        });
      },

      resetProject: () => {
        if (
          typeof window !== "undefined" &&
          !window.confirm("Are you sure? This will wipe all current project data.")
        ) {
          return;
        }
        useAuditStore.getState().clearLog();
        try {
          // Clear persisted storage first, then reset in-memory.
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          (useFinModelStore as any).persist?.clearStorage?.();
        } catch {
          // ignore
        }
        set(initialState);
      },
    }),
    {
      name: "finmodel-storage",
      version: 8,
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

  // -------------------------------------------------------------------------
  // Sale stream financing engine (pure calc + cached result)
  // -------------------------------------------------------------------------
  config: FinancingConfig;
  result: FinancingResult | null;
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
            // Migrate 3-stage data to 4-stage
            const prevStageAllocation = (prev.stageAllocation ?? {}) as any;
            const stageAllocation3to4 =
              prevStageAllocation &&
              typeof prevStageAllocation === "object" &&
              !("stage4Percent" in prevStageAllocation);
            const migratedStageAllocation = stageAllocation3to4
              ? {
                  ...prevStageAllocation,
                  stage4Label: "Finishes",
                  stage4Percent: prevStageAllocation.stage3Percent ?? 0,
                  stage3Label: prevStageAllocation.stage2Label ?? "Super Structure",
                  stage3Percent: prevStageAllocation.stage2Percent ?? 0,
                  stage2Label: prevStageAllocation.stage1Label ?? "Sub-Structure",
                  stage2Percent: prevStageAllocation.stage1Percent ?? 0,
                  stage1Label: "Enabling Works",
                  stage1Percent: Math.round((prevStageAllocation.stage1Percent ?? 0) * 0.5),
                }
              : prevStageAllocation;
            return {
              ...structuredClone(defaultCashOutflows),
              ...prev,
              stageAllocation: {
                ...structuredClone(defaultStageAllocation),
                ...(migratedStageAllocation ?? {}),
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
          if (
            mergedState.operational &&
            mergedState.operational.scenarioShocks === undefined
          ) {
            mergedState.operational.scenarioShocks = {};
          }
          if (mergedState.sale && mergedState.sale.scenarioShocks === undefined) {
            mergedState.sale.scenarioShocks = {};
          }
          if (mergedState.activeProjectId === undefined) {
            mergedState.activeProjectId = null;
          }
          if (mergedState.activeProjectName === undefined) {
            mergedState.activeProjectName = null;
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

function pickTemplateForSale(
  projectInfo: ProjectInfo,
  constructionPeriod: number
): ConstructionSCurveProfile | null {
  const params = buildRecommendationQuery(
    projectInfo.countryCode,
    projectInfo.buildingSubType,
    projectInfo.buildingConfig.towerFloors
  );
  if (!params) return null;

  const bt = params.buildingTypeDB as SaleRecommendationBuildingType;
  const floorsForLookup =
    bt === "residential-hi-rise" || bt === "commercial-strata-office"
      ? projectInfo.buildingConfig.towerFloors
      : undefined;
  const rec = getRecommendations(params.countryCode, bt, floorsForLookup);
  if (rec?.sCurveProfile) return rec.sCurveProfile;

  // Backward compatibility: if not present in DB, select by building subtype.
  if (projectInfo.buildingSubType?.includes("landed")) return LANDED_G2_ESTATE_24M;
  return HIRISE_RESIDENTIAL_36M;
}

export function buildCashOutflowProfile(
  cashOutflows: CashOutflows,
  projectInfo?: ProjectInfo
): CashOutflowProfile {
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
  const construction = (() => {
    // Use professional market-based S-curve when project context is available.
    try {
      if (projectInfo) {
        const template = pickTemplateForSale(projectInfo, constructionPeriod);
        if (template) {
          const monthlyPercentages = interpolateSCurveProfile(
            template,
            constructionPeriod
          );
          if (monthlyPercentages.length === constructionPeriod) {
            const arr = Array(constructionPeriod + 1).fill(0);
            for (let m = 1; m <= constructionPeriod; m++) {
              arr[m] = constructionFinal * (monthlyPercentages[m - 1]! / 100);
            }
            // Plug last month for exact sum
            const sum = arr.reduce((s, v) => s + (v || 0), 0);
            const diff = constructionFinal - sum;
            if (Math.abs(diff) > 1e-6) arr[arr.length - 1] += diff;
            return arr;
          }
        }
      }
    } catch {
      // fall through to generic curve
    }
    return allocateContinuousSCurve(constructionFinal, constructionPeriod);
  })();
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
  const s4Percent = stageAllocation.stage4Percent || 0;

  // Construction stages only apply to M1..M{constructionPeriod}
  const stage1EndCount = Math.max(0, Math.round(constructionPeriod * (s1Percent / 100)));
  const stage2EndCount = Math.max(
    stage1EndCount,
    Math.round(constructionPeriod * ((s1Percent + s2Percent) / 100))
  );
  const stage3EndCount = Math.max(
    stage2EndCount,
    Math.round(constructionPeriod * ((s1Percent + s2Percent + s3Percent) / 100))
  );

  const stage1Months = Math.max(stage1EndCount, 1);
  const stage2Months = Math.max(stage2EndCount - stage1EndCount, 1);
  const stage1EndIndex = 1 + stage1EndCount; // exclusive
  const stage2EndIndex = 1 + stage2EndCount; // exclusive
  const stage3EndIndex = 1 + stage3EndCount; // exclusive

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
      name: stageAllocation.stage3Label || "Super Structure",
      monthSpan: stage3EndCount - stage2EndCount,
    },
    {
      name: stageAllocation.stage4Label || "Finishes",
      monthSpan: constructionPeriod - stage3EndCount,
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
