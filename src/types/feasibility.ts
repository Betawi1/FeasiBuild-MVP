export interface ChartDataPoint {
  year?: string | number;
  [key: string]: string | number | undefined;
}

export interface SlideChart {
  type: "line" | "bar" | "pie" | "area";
  title: string;
  data: ChartDataPoint[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  /** Tailwind height class, e.g. flex-1 or h-64 */
  height?: string;
  /** Tailwind width class, e.g. w-full */
  width?: string;
}

export interface SlideTable {
  title: string;
  headers: string[];
  rows: string[][];
  footer?: string;
}

export interface DemandChartData {
  year: string;
  consumption: number;
  capitalInvestment: number;
  governmentExpenditure: number;
  nonVisitorExports: number;
}

export interface OutlookMetric {
  name: string;
  shortTermGrowth: number;
  shortTermDescription: string;
  longTermGrowth: number;
}

export interface TravelTourismDemandData {
  chartData: DemandChartData[];
  cagr: string;
  realGrowth: string;
  bulletPoints: string[];
}

export interface TravelTourismOutlookData {
  metrics: OutlookMetric[];
  mainTakeaway: string;
}

export interface HistoricalGuestsData {
  yearlyData: Array<{
    year: string;
    totalGuests: number;
    guestNights: number;
    avgLengthOfStay: number;
  }>;
  compositionByClass: Array<{
    year: string;
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    others: number;
  }>;
  cagrGuests: string;
  cagrGuestNights: string;
}

export interface LengthOfStayData {
  byRegion: Array<{
    region: string;
    year2004: number;
    year2005: number;
    year2006: number;
    cagr: string;
  }>;
  byHotelClass: Array<{
    hotelClass: string;
    year2004: number;
    year2005: number;
    year2006: number;
    cagr: string;
  }>;
  overallAverage2006: number;
}

export interface AnnualRevenuesData {
  yearlyData: Array<{
    year: string;
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    others: number;
    total: number;
  }>;
  cagrByClass: {
    fiveStar: string;
    fourStar: string;
    threeStar: string;
    others: string;
  };
}

export interface CompetitionData {
  benchmarkHotels: Array<{
    name: string;
    rating: string;
    description: string;
    numberOfRooms: string;
    adr?: number;
    occupancy?: number;
  }>;
  performanceData: Array<{
    month: string;
    occupancy: number;
    adr: number;
    revpar: number;
  }>;
  avgOccupancy: number;
  avgADR: number;
  avgRevPAR: number;
}

export interface HospitalitySummaryData {
  tourismOverview: string[];
  guestProfile: string[];
  historicalSupply: string[];
  historicalDemand: string[];
  growthPotential: string[];
}

export interface ImplicationsData {
  hospitalityImplications: Array<{
    number: number;
    title: string;
    description: string;
  }>;
  keyTakeaways: string[];
}

export interface SuccessFactorsData {
  marketOpportunities: Array<{
    factor: string;
    effect: string;
  }>;
  projectStrengths: Array<{
    strength: string;
    effect: string;
  }>;
  mainOutcomes: string[];
}

export interface RiskFactorsData {
  marketThreats: Array<{
    risk: string;
    effect: string;
    mitigatingFactors: string[];
  }>;
  projectWeaknesses: Array<{
    weakness: string;
    effect: string;
    mitigatingFactors: string[];
  }>;
}

export interface DevelopmentScheduleBreakdownItem {
  item: string;
  value: number;
  yearly: Array<{ year: string; value: number }>;
}

export interface DevelopmentScheduleCostSection {
  total: number;
  yearlyCashFlow: Array<{ year: string; value: number }>;
}

export interface OperationalRevenueDistributionRow {
  category: string;
  percentage: number;
  isTotal?: boolean;
}

export interface OperationalRevenuesData {
  title: string;
  subtitle: string;
  currency: string;
  roomRevenues: {
    years: string[];
    adr: number[];
    occupancy: number[];
  };
  revenueDistribution: OperationalRevenueDistributionRow[];
  notes: string[];
}

export interface OperationalExpenseRow {
  item: string;
  index: string;
  percentage: number;
}

export interface OperationalCashFlowYear {
  year: string;
  netIncome: number;
  depreciation: number;
  workingCapital: number;
  netOperatingCF: number;
  initialInvestment: number;
  netInvestingCF: number;
  freeCashFlow: number;
  equity: number;
  preSales: number;
  netFinancingCF: number;
  netCashFlow: number;
  cumulativeCash: number;
}

export interface OperationalCashFlowData {
  title: string;
  subtitle: string;
  currency: string;
  yearlyData: OperationalCashFlowYear[];
  terminalValue: number;
  metrics: {
    projectIRR: number;
    equityMultiple: number;
    paybackPeriod: number;
  };
}

export interface TermLoanFinancingData {
  title: string;
  subtitle: string;
  currency: string;
  approvedDebt: number;
  drawdownType: string;
  idcTreatment: string;
  idcAmount: number;
  loanAtCompletion: number;
  loanType: string;
  interestRate: number;
  totalLoanTenor: string;
}

export interface PreferenceSharesExitStrategyData {
  currency: string;
  minDscrTarget: number;
  preferenceShares: {
    isIssuing: boolean;
    amount: number;
    returnRate: number;
  };
  debtCovenants: string[];
  dscrByYear: { year: string; dscr: number }[];
  exitStrategy: {
    type: string;
    timing: string;
    refinanceLTC: number;
    refinanceRate: number;
    exitCapRate: number;
    saleCosts: number;
  };
}

export interface PostFinancingCashFlowData {
  currency: string;
  totalInflow: { year: string; value: number }[];
  totalOutflow: { year: string; value: number }[];
  ncfPreFinancing: { year: string; value: number }[];
  loanDrawdown: { year: string; value: number }[];
  interestPayment: { year: string; value: number }[];
  principalRepayment: { year: string; value: number }[];
  prefDrawdown: { year: string; value: number }[];
  prefDividend: { year: string; value: number }[];
  prefRepayment: { year: string; value: number }[];
  equityInjection: { year: string; value: number }[];
  ncfPostFinancing: { year: string; value: number }[];
}

export interface IrrAndFinancingMetricsData {
  currency: string;
  projectIrr: number;
  equityIrr: number;
  equityMultiple: number;
  paybackPeriod: number;
  minDscr: number;
  tdc: number;
  loanAtCompletion: number;
  commentary: string;
}

export interface ScenarioComparisonMetricRow {
  metric: string;
  downside: number;
  base: number;
  upside: number;
  format: "percent" | "multiple" | "years";
}

export interface ScenarioComparisonData {
  shocks: string[];
  comparison: ScenarioComparisonMetricRow[];
  tornadoData: {
    factor: string;
    low: number;
    high: number;
  }[];
}

export interface ScenarioAnalysisKeyAssumptions {
  revenueDriver: string;
  occupancyDriver: string;
  constructionCostVariance: string;
  exitCapRate: string;
  labels: {
    revenue: string;
    occupancy: string;
  };
}

export interface ScenarioAnalysisCase {
  name: string;
  projectIRR: number;
  equityIRR: number;
  npv: number;
  paybackPeriod: number;
  equityMultiple: number;
  keyAssumptions: ScenarioAnalysisKeyAssumptions;
}

export interface ScenarioAnalysisResultsData {
  assetType: string;
  currency: string;
  location: { city: string; country: string };
  scenarios: ScenarioAnalysisCase[];
  fallbackCommentary?: string;
}

export interface OperationalPnLData {
  title: string;
  subtitle: string;
  currency: string;
  assetType: string;
  years: string[];
  revenues: {
    roomRevenues: number[];
    fAndBRevenues: number[];
    otherRevenues: number[];
    totalGrossRevenues: number[];
  };
  directCosts: {
    roomsDepartment: number[];
    fAndBDepartment: number[];
    otherDepartments: number[];
    totalDirectCosts: number[];
  };
  undistributedExpenses: {
    gAndA: number[];
    marketingAndSales: number[];
    propertyOpsAndMaintenance: number[];
    utilities: number[];
    managementFees: number[];
    totalUndistributedExpenses: number[];
  };
  ebitda: number[];
  depreciation: number[];
  ebit: number[];
  netIncome: number[];
}

export interface OperationalExpensesData {
  title: string;
  subtitle: string;
  workingCapital: {
    accountsReceivable: number;
    accountsPayable: number;
  };
  depreciation: {
    construction: number;
    furnitureAndEquipment: number;
  };
  fixedExpenses: OperationalExpenseRow[];
  undistributedExpenses: OperationalExpenseRow[];
  directCosts: {
    rooms: OperationalExpenseRow[];
    fAndB: OperationalExpenseRow[];
    otherDepartments: OperationalExpenseRow[];
  };
}

export interface DevelopmentScheduleData {
  currency: string;
  yearlyHeaders: string[];
  landAcquisition: DevelopmentScheduleCostSection;
  construction: DevelopmentScheduleCostSection;
  ffe: DevelopmentScheduleCostSection;
  softCosts: {
    breakdown: DevelopmentScheduleBreakdownItem[];
    total: number;
    yearlyCashFlow: Array<{ year: string; value: number }>;
  };
  powc: {
    breakdown: DevelopmentScheduleBreakdownItem[];
    total: number;
    yearlyCashFlow: Array<{ year: string; value: number }>;
  };
  totalDevelopmentCost: number;
  totalYearlyCashFlow: Array<{ year: string; value: number }>;
}

export interface TitleSlideData {
  assetType: string;
  segment: string;
  starRating: string;
  country: string;
  city: string;
  /** When true, title uses mall format instead of hotel star/segment pattern */
  isShoppingMall?: boolean;
  /** e.g. "Regional" for regional_mall segment */
  mallTypeLabel?: string;
  /** When true, title uses office + retail mixed-use format */
  isOfficeMixedUse?: boolean;
  /** When true, title uses residential BTR tower format */
  isResidentialBTR?: boolean;
  /** e.g. "Grade B" from residential benchmark positioning */
  btrGradeLabel?: string;
  /** e.g. "High-Rise" from residential benchmark segment */
  btrSegmentLabel?: string;
  /** When true, title uses sale stream format */
  isSaleStream?: boolean;
  /** e.g. "Landed Housing Estate" */
  saleAssetLabel?: string;
  /** e.g. "Business" from hotel operating type benchmark */
  businessType?: string;
  /** Pre-formatted label e.g. "5-Star Business Hotel" from BENCHMARK profile */
  benchmarkTitleLabel?: string;
}

export interface BTROperationalPnLData {
  currency: string;
  years: string[];
  revenues: {
    residentialRent: number[];
    retailMinRent: number[];
    parking: number[];
    amenity: number[];
    utility: number[];
    other: number[];
    totalRevenue: number[];
  };
  operatingExpenses: {
    managementFee: number[];
    maintenance: number[];
    utilities: number[];
    propertyTax: number[];
    insurance: number[];
    marketing: number[];
    gAndA: number[];
    capexReserve: number[];
    totalExpenses: number[];
  };
  ebitda: number[];
  depreciationTotal: number[];
  ebit: number[];
  netIncome: number[];
  yoyGrowth: string[];
}

export interface BTRDevelopmentAssumptionsData {
  currency: string;
  residentialGla: number;
  retailGla: number;
  constructionCost: number;
  ffeBase: number;
  constructionLife: number;
  ffeLife: number;
  landCost: number;
  softCosts: number;
  powc: number;
  tdc: number;
  costBreakdown: import("@/lib/feasibility/build-operational-cost-breakdown").OperationalCostBreakdown;
}

export interface BTROperationalRevenuesData {
  currency: string;
  residentialGla: number;
  retailGla: number;
  rows: Array<{ category: string; amount: number }>;
  totalRevenue: number;
}

export interface BTROperationalExpensesData {
  currency: string;
  totalUnits: number;
  assumptions: Array<{ item: string; value: string; basis: string }>;
  annualTotals: Array<{ item: string; amount: number | string }>;
  totalOpexYear1: number;
}

export interface BTROperationalAssumptionsData {
  currency: string;
  residentialGla: number;
  retailGla: number;
  rows: Array<{ category: string; amount: number }>;
  totalRevenue: number;
  totalOpex: number;
}

export interface SaleConstructionCostLine {
  bua: number;
  rate: number;
  amount: number;
}

export interface SaleDevelopmentCostsData {
  currency: string;
  constructionCosts: {
    building: SaleConstructionCostLine;
    parking: SaleConstructionCostLine;
    basement: SaleConstructionCostLine;
    infrastructure: { area: number; rate: number; amount: number };
    contingency: { percentage: number; amount: number };
    softCosts: { percentage: number; amount: number };
    powc: { percentage: number; amount: number };
    landCosts: { area: number; rate: number; amount: number };
    totalDevelopmentCost: number;
  };
  constructionPeriod: {
    totalMonths: number;
    stages: Array<{ name: string; period: string }>;
  };
}

export interface SaleMonthlyOutflowRow {
  month: number;
  landCost: number;
  constructionCost: number;
  softCosts: number;
  powc: number;
  total: number;
  cumulative: number;
}

export interface SaleDevelopmentScheduleData {
  currency: string;
  monthlyOutflows: SaleMonthlyOutflowRow[];
  constructionMonths: number;
}

export interface SaleSalesUptakeChartData {
  currency: string;
  monthlyCashInflows: Array<{
    month: number;
    unitSales: number;
    bulkSales: number;
    total: number;
  }>;
}

export interface SaleSalesSummaryTableData {
  currency: string;
  grossSales: number;
  totalDeductions: number;
  netProceeds: number;
  brokerCommission: number;
  vat: number;
  escrowFees: number;
  salesDiscounts: number;
  defaults: number;
  bulkSalesDiscount: number;
  saleableBUARatio: number;
  averagePrice: number;
  buyerMix: string;
  launchOffset: number;
  defaultRate: number;
  cashPlan: string;
  mortgage: string;
  deductions: string;
  defaultBulk: string;
}

/** @deprecated Use SaleSalesUptakeChartData + SaleSalesSummaryTableData */
export interface SaleSalesAssumptionsData {
  currency: string;
  monthlyInflows: Array<{ month: number; amount: number }>;
  grossToNet: Array<{ label: string; amount: number }>;
  assumptions: Array<{ label: string; value: string }>;
}

export interface SaleProjectCashFlowData {
  currency: string;
  netCashFlow: number[];
  cumulativeCashFlow: number[];
  paybackMonth: number;
  projectIRR: number;
  equityMultiple: number;
}

export interface SaleRevolvingCreditData {
  currency: string;
  approvedCreditFacility: number;
  totalConstructionLoanAmount: number;
  loanDrawdown: string;
  idcTreatment: string;
  capitalizedIDC: number;
  loanAtCompletion: number;
  interestRate: number;
  loanTenorMonths: number;
}

export interface SalePostFinancingMonthlyRow {
  month: number;
  escrowReleases: number;
  progressWithdrawals: number;
  totalOutflows: number;
  netCashFlow: number;
  loanDrawdown: number;
  interestPayment: number;
  loanRepayment: number;
  commitmentFee: number;
  prefDrawdown: number;
  prefDividend: number;
  prefRepayment: number;
  landInjection: number;
  cashInjection: number;
  ncfAfterLoanEquity: number;
}

export interface SaleEscrowWithdrawalData {
  currency: string;
  jurisdiction: string;
  uaeConfig: Record<string, string | number>;
  malaysiaConfig: {
    hdaDeposit: string;
    propertyType: string;
    withdrawalSchedule: Array<{
      stage: string;
      milestone: string;
      withdrawalPercent: string;
      sCurveTrigger: string;
    }>;
    retentionRelease: { firstRelease: string; finalRelease: string };
    illustrativeRetention: string;
    releaseTiming: string;
    setupFee: number;
    managementFee: number;
  };
  australiaConfig: Record<string, string | number>;
}

export interface SalePostFinancingCashFlowData {
  currency: string;
  monthlyCashFlows: SalePostFinancingMonthlyRow[];
  constructionMonths: number;
}

export interface SaleIrrMetricsData {
  currency: string;
  projectIRR: number;
  equityIRR: number;
  equityMultiple: number;
  paybackMonth: number;
  minDSCR: number;
  tdc: number;
  loanAtCompletion: number;
}

export interface SaleFeasibilityBundle extends FeasibilityProjectBundle {
  stream: "sale";
  buildingSubType?: string;
  buildingType?: string;
  saleConfigKey?: string;
  saleMetrics: {
    totalUnits: number;
    totalArea: number;
    saleableArea: number;
    avgPricePsf: number;
    grossSales: number;
    netProceeds: number;
    paybackMonth: number;
    netCashFlow: number[];
    cumulativeCashFlow: number[];
    monthlyOutflows: number[];
    monthlyInflows: number[];
    constructionMonths: number;
    escrowJurisdiction: string;
  };
  cashOutflows: import("@/store/useFinModelStore").CashOutflows;
  cashInflows: import("@/store/useFinModelStore").CashInflows;
  financing: import("@/store/useFinModelStore").Financing;
  projectIRR: import("@/store/useFinModelStore").ProjectIRR;
  financingMetrics?: import("@/store/financingStore").FinancingMetrics | null;
  titleProfile?: {
    assetType: string;
    starRating: string;
    businessType?: string;
    saleAssetLabel: string;
  };
}

export interface OfficeOperationalPnLData {
  currency: string;
  years: string[];
  revenues: {
    officeRent: number[];
    retailMinRent: number[];
    camRecoveries: number[];
    parkingIncome: number[];
    advertisingIncome: number[];
    totalRevenue: number[];
  };
  operatingExpenses: {
    cam: number[];
    propertyTax: number[];
    insurance: number[];
    marketing: number[];
    gAndA: number[];
    managementFee: number[];
    renovationProvision: number[];
    totalExpenses: number[];
  };
  ebitda: number[];
  depreciationTotal: number[];
  ebit: number[];
  netIncome: number[];
  yoyGrowth: string[];
}

export interface OfficeDevelopmentAssumptionsData {
  currency: string;
  officeGla: number;
  retailGla: number;
  constructionCost: number;
  ffeBase: number;
  officeTI: number;
  retailTI: number;
  officeLeasingComm: number;
  retailLeasingComm: number;
  landCost: number;
  softCosts: number;
  powc: number;
  tdc: number;
  costBreakdown: import("@/lib/feasibility/build-operational-cost-breakdown").OperationalCostBreakdown;
}

export interface OfficeOperationalRevenuesData {
  currency: string;
  officeGla: number;
  retailGla: number;
  rows: Array<{ source: string; amount: number; sharePct: number }>;
  totalRevenue: number;
}

export interface OfficeOperationalExpensesData {
  currency: string;
  rows: Array<{ category: string; amount: number; shareOfRevenuePct: number }>;
  totalOpex: number;
  totalRevenue: number;
}

export interface MallOperationalPnLData {
  currency: string;
  years: string[];
  revenues: {
    baseRent: number[];
    percentageRent: number[];
    camRecoveries: number[];
    parkingIncome: number[];
    advertisingIncome: number[];
    totalRevenue: number[];
  };
  operatingExpenses: {
    cam: number[];
    propertyInsurance: number[];
    marketingGAndA: number[];
    managementFee: number[];
    renovationProvision: number[];
    totalExpenses: number[];
  };
  ebitda: number[];
  depreciation: {
    construction: number[];
    ffe: number[];
    ti: number[];
    leasingCommissions: number[];
    total: number[];
  };
  netOperatingIncome: number[];
}

export interface RetailMarketOverviewData {
  demandDrivers: string[];
  catchmentHighlights: string[];
}

export interface RetailMarketMetricsData {
  chartData: Array<{
    year: string;
    footfall: number;
    salesPsf: number;
    occupancy: number;
  }>;
  footfallCagr: string;
  salesPsfCagr: string;
  occupancyLatest: string;
}

export interface RetailSupplyPipelineData {
  chartData: Array<{ year: string; existingGla: number; pipelineGla: number }>;
  existingStockSqft: number;
  pipelineSqft: number;
  subjectSharePct: string;
}

export interface RetailCompetitiveLandscapeData {
  benchmarkMalls: Array<{
    name: string;
    gla: string;
    occupancy: string;
    baseRent: string;
    positioning: string;
  }>;
  avgOccupancy: string;
  avgBaseRent: string;
}

export interface RetailTenantProfileData {
  tenantMix: Array<{ category: string; sharePct: number }>;
  catchmentRadius: string;
  primaryDemographics: string[];
  waleYears: number;
}

export interface RetailMarketSummaryData {
  marketOverview: string[];
  supplyDemand: string[];
  competitivePosition: string[];
  investmentThesis: string[];
}

export interface MallDevelopmentAssumptionsData {
  currency: string;
  gla: number;
  landCost: number;
  constructionCost: number;
  tiAllowance: number;
  leasingCommissions: number;
  softCosts: number;
  powc: number;
  tdc: number;
  costPerSqft: number;
  costBreakdown: import("@/lib/feasibility/build-operational-cost-breakdown").OperationalCostBreakdown;
}

export interface MallOperationalRevenuesData {
  currency: string;
  gla: number;
  baseRentYear1: number;
  stabilizedOccupancy: number;
  rows: Array<{ source: string; amount: number; sharePct: number }>;
  totalRevenue: number;
}

export interface MallOperationalExpensesData {
  currency: string;
  rows: Array<{ category: string; amount: number; shareOfRevenuePct: number }>;
  totalOpex: number;
  totalRevenue: number;
}

export type FeasibilitySlideData =
  | TitleSlideData
  | TravelTourismDemandData
  | TravelTourismOutlookData
  | HistoricalGuestsData
  | LengthOfStayData
  | AnnualRevenuesData
  | CompetitionData
  | HospitalitySummaryData
  | ImplicationsData
  | SuccessFactorsData
  | RiskFactorsData
  | DevelopmentScheduleData
  | OperationalRevenuesData
  | OperationalExpensesData
  | OperationalPnLData
  | OperationalCashFlowData
  | TermLoanFinancingData
  | PreferenceSharesExitStrategyData
  | PostFinancingCashFlowData
  | IrrAndFinancingMetricsData
  | ScenarioComparisonData
  | ScenarioAnalysisResultsData
  | RetailMarketOverviewData
  | RetailMarketMetricsData
  | RetailSupplyPipelineData
  | RetailCompetitiveLandscapeData
  | RetailTenantProfileData
  | RetailMarketSummaryData
  | MallDevelopmentAssumptionsData
  | MallOperationalRevenuesData
  | MallOperationalExpensesData
  | MallOperationalPnLData
  | OfficeOperationalPnLData
  | OfficeDevelopmentAssumptionsData
  | OfficeOperationalRevenuesData
  | OfficeOperationalExpensesData
  | BTROperationalPnLData
  | BTRDevelopmentAssumptionsData
  | BTROperationalAssumptionsData
  | BTROperationalRevenuesData
  | BTROperationalExpensesData
  | SaleDevelopmentCostsData
  | SaleDevelopmentScheduleData
  | SaleSalesUptakeChartData
  | SaleSalesSummaryTableData
  | SaleSalesAssumptionsData
  | SaleProjectCashFlowData
  | SaleRevolvingCreditData
  | SaleEscrowWithdrawalData
  | SalePostFinancingCashFlowData
  | SaleIrrMetricsData;

export type FeasibilitySection =
  | "title"
  | "executive"
  | "project"
  | "market"
  | "financial";

export interface FeasibilitySlide {
  id: string;
  section: FeasibilitySection;
  title: string;
  subtitle: string;
  paragraphs: string[];
  bulletPoints?: string[];
  charts?: SlideChart[];
  tables?: SlideTable[];
  /** Presentation layout hint for 16:9 slide rendering */
  layout?: "split" | "default" | "full-width";
  /** Structured payload for specialized slide templates */
  data?: FeasibilitySlideData;
}

export interface FeasibilityReport {
  slides: FeasibilitySlide[];
  generatedAt: string;
}

/** Layer 1 payload — Components 1–4/6 via Zustand operational slice. */
export interface AggregatedProjectData {
  location: { country: string; city: string };
  assetType: string;
  segment: string;
  positioning: string;
  keys: number;
  bua: number;
  constructionPeriod: number;
  currency: string;
  starRating: string;
  adrYear1: number;
  occYear1: number;
  adrYear3: number;
  occYear3: number;
  tdc: number;
  gdv: number;
  projectIrr: number;
  equityIrr: number;
  equityMultiple: number;
  paybackYears: number;
  netProfitMargin: number;
  revenueByYear: number[];
  ebitdaByYear: number[];
  netIncomeByYear: number[];
}

/** Layer 1 bundle shaped for Section A & D components (Components 1–4). */
export interface FeasibilityProjectBundle {
  stream?: "operational" | "sale";
  location: { city: string; country: string };
  assetType: string;
  segment: string;
  currency: string;
  developmentSchedule?: DevelopmentScheduleData;
  operationalRevenues?: OperationalRevenuesData;
  operationalExpenses?: OperationalExpensesData;
  operationalPnl?: OperationalPnLData;
  operationalCashFlow?: OperationalCashFlowData;
  termLoanFinancing?: TermLoanFinancingData;
  preferenceSharesExitStrategy?: PreferenceSharesExitStrategyData;
  postFinancingCashFlow?: PostFinancingCashFlowData;
  irrAndFinancingMetrics?: IrrAndFinancingMetricsData;
  scenarioComparison?: ScenarioComparisonData;
  scenarioAnalysisResults?: ScenarioAnalysisResultsData;
  component1: {
    rooms: number;
    bua: number;
    constructionPeriod: number;
    landCost: number;
    constructionCost: number;
    softCosts: number;
    ffe: number;
    powc: number;
    buildingRate: number;
    parkingRate: number;
    basementRate: number;
    buildingBUA: number;
    parkingBUA: number;
  };
  component2: {
    adrYear1: number;
    adrStabilized: number;
    occupancyYear1: number;
    occupancyStabilized: number;
    adrInflation: number;
    operationalYears: number;
  };
  component4: {
    tdc: number;
    gdv: number;
    projectIRR: number;
    equityIRR: number;
    equityMultiple: number;
    paybackPeriod: number;
    monthlyCashFlow: number[];
    approvedDebt: number;
    drawdownType: string;
    idcTreatment: string;
    loanAtCompletion: number;
    loanType: string;
    interestRate: number;
    totalTenor: string;
    idcAmount: number;
  };
  /** Merged aggregate for market / exec copy */
  aggregate: AggregatedProjectData;
  /** Retail Component 2 snapshot (operational mall wizard) */
  retailHoldSnapshot?: import("@/lib/operational-pnl").OperationalRetailHoldSnapshot;
  retailSegment?: string;
  retailPositioning?: string;
  officeHoldSnapshot?: import("@/lib/operational-pnl").OperationalOfficeHoldSnapshot;
  officeSegment?: string;
  officePositioning?: string;
  residentialHoldSnapshot?: import("@/lib/operational-pnl").OperationalResidentialHoldSnapshot;
  residentialOpex?: import("@/store/useFinModelStore").ResidentialOpexConfig;
  residentialDepreciation?: import("@/store/useFinModelStore").ResidentialDepreciationConfig;
  buildingType?: string;
  residentialSegment?: string;
  residentialPositioning?: string;
  residentialFurnishingLevel?: string;
}

export type FinancialSlideType =
  | "Development Assumptions"
  | "Hotel Development Schedule"
  | "Cash Flow"
  | "Term Loan"
  | "Profit and Loss"
  | "Operating Expenses"
  | "Scenario Summary"
  | "IRR and Key Financing Metrics";
