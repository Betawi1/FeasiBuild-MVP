import {
  incentiveFeeFromCircularEbitda,
  type HotelExpensePctKey,
} from "@/config/hotel-expense-profiles";
import {
  annualConstructionDepreciation,
  annualFfeDepreciation,
  type HotelDepreciationFieldKey,
} from "@/config/hotel-depreciation-profiles";
import {
  HOTEL_REVENUE_PCT_KEYS,
  HOTEL_REVENUE_PROFILES,
  pctsFromRevenueProfile,
  type HotelRevenuePctKey,
} from "@/config/hotel-revenue-profiles";
import {
  HOTEL_DIRECT_COST_PROFILES,
  pctsFromDirectCostProfile,
  type HotelDirectCostPctKey,
} from "@/config/hotel-direct-cost-profiles";
import {
  HOTEL_EXPENSE_PROFILES,
  pctsFromExpenseProfile,
} from "@/config/hotel-expense-profiles";
import {
  HOTEL_DEPRECIATION_PROFILES,
  valuesFromDepreciationProfile,
} from "@/config/hotel-depreciation-profiles";
import {
  computeRoomRevenueSeries,
  OPERATIONAL_ROOM_REVENUE_YEARS,
} from "@/lib/operational-cash-inflows-chart";

/** Persisted wizard inputs for operational hotel hold (Steps 1–5). */
export type OperationalHotelHoldSnapshot = {
  numberOfRooms: number;
  adrValues: number[];
  occupancyValues: number[];
  revPcts: Record<string, number>;
  directCostPcts: Record<string, number>;
  expensePcts: Record<string, number>;
  depFieldValues: Record<string, number>;
};

/** Persisted wizard inputs for operational retail hold (Steps 1–2). */
export type OperationalRetailHoldSnapshot = {
  glaSqft: number;
  rentEscalationPct: number;
  baseRentPerSqftValues: number[];
  occupancyValues: number[];
  /** GLA × leased % (sqft leased per year). */
  effectiveLeasedValues: number[];
  /** Annual base rent revenue per year. */
  revenueValues: number[];
  /** Average rent-free period (months) — profile benchmark. */
  freeRentMonths?: number;

  /** Step 2 — percentage rent */
  avgTenantSalesPsf?: number;
  salesGrowthPct?: number;
  percentageRentRate?: number;
  breakpointType?: "natural" | "fixed";
  breakpointMultiple?: number;
  fixedBreakpointPsf?: number;
  percentageRentValues?: number[];
  percentageRentOverrides?: boolean[];

  /** Step 2 — CAM / tax recoveries (annual totals in local currency) */
  camExpensesAed?: number;
  propertyTaxAed?: number;
  insuranceAed?: number;
  camExpensesPerSqft?: number;
  propertyTaxPerSqft?: number;
  insurancePerSqft?: number;
  recoveryRate?: number;
  camRecoveryValues?: number[];
  camRecoveryOverrides?: boolean[];

  /** Step 2 — parking */
  parkingSpaces?: number;
  parkingRevenuePerSpaceDay?: number;
  parkingUtilization?: number;
  operatingDays?: number;
  parkingRevenueValues?: number[];
  parkingOverrides?: boolean[];

  /** Step 2 — advertising / kiosks */
  advertisingIncomeYear1?: number;
  advertisingGrowthPct?: number;
  advertisingValues?: number[];
  advertisingOverrides?: boolean[];

  /** Step 2 — combined other mall income per year */
  otherIncomeTotalValues?: number[];

  /** Step 3 — operating expenses inputs */
  camFixedBase?: number;
  camVariableRate?: number;
  propertyTaxAnnual?: number;
  insuranceAnnual?: number;
  marketingPctOfRevenue?: number;
  gAndAAnnual?: number;
  mgmtFeePctOfRevenue?: number;
  renovationYear1?: number;
  renovationYear2?: number;
  renovationYears3to10?: number;

  /** Step 3 — annual opex series */
  opexCamValues?: number[];
  opexPropertyTaxValues?: number[];
  opexInsuranceValues?: number[];
  opexMarketingValues?: number[];
  opexGaValues?: number[];
  opexMgmtFeeValues?: number[];
  opexRenovationValues?: number[];
  opexTotalValues?: number[];

  /** Step 4 — depreciation & working capital */
  constructionLife?: number;
  ffeLife?: number;
  ffeRenovationPctYear6?: number;
  tiLife?: number;
  leasingCommLife?: number;
  tiCapital?: number;
  leasingCommCapital?: number;
  arMonths?: number;
  apMonths?: number;
  depConstructionValues?: number[];
  depFfeValues?: number[];
  depTiValues?: number[];
  depLeasingCommValues?: number[];
  depTotalValues?: number[];
  wcArValues?: number[];
  wcApValues?: number[];
  wcNetValues?: number[];
};

export const defaultOperationalRetailHoldSnapshot: OperationalRetailHoldSnapshot =
  {
    glaSqft: 0,
    rentEscalationPct: 0,
    baseRentPerSqftValues: [],
    occupancyValues: [],
    effectiveLeasedValues: [],
    revenueValues: [],
  };

/** Component 2 operational office hold — Step 1 (office + podium retail rent). */
export type OperationalOfficeHoldSnapshot = {
  officeGlaSqft: number;
  officeRentPsfYear1: number;
  officeRentEscalationPct: number;
  officeLeasedOpeningPct: number;
  officeLeasedTargetPct: number;
  officeLeaseUpYears: number;
  officeFreeRentMonths: number;
  officeLeasedPctValues: number[];
  officeRentValues: number[];

  retailGlaSqft: number;
  retailRentPsfYear1: number;
  retailRentEscalationPct: number;
  retailLeasedOpeningPct: number;
  retailLeasedTargetPct: number;
  retailLeaseUpYears: number;
  retailFreeRentMonths: number;
  retailLeasedPctValues: number[];
  retailMinRentValues: number[];

  includePercentageRent: boolean;
  retailSalesPsfYear1: number;
  retailSalesGrowthPct: number;
  percentageRentRate: number;
  breakpointType: "natural" | "fixed";
  breakpointMultiple: number;
  fixedBreakpointPsf: number;
  percentageRentValues: number[];
  totalBaseRentValues: number[];

  /** Per-input manual override flags (benchmark fields). */
  fieldOverrides?: Record<string, boolean>;
  /** Per-year manual overrides for table cells (year → stream → value). */
  manualYearValues?: Record<number, Record<string, number>>;

  /** Step 2 — parking */
  totalParkingSpaces?: number;
  officeReservedSpaces?: number;
  monthlyPassPrice?: number;
  officePassOccupancy?: number;
  retailHourlyRate?: number;
  retailAvgDailyHours?: number;
  retailAvailableSpaces?: number;
  retailUtilization?: number;
  parkingOperatingDays?: number;
  parkingIncomeValues?: number[];

  /** Step 2 — CAM / tax recoveries (annual totals) */
  camExpensesAed?: number;
  propertyTaxAed?: number;
  insuranceAed?: number;
  recoveryRate?: number;
  camRecoveryValues?: number[];

  /** Step 2 — advertising */
  advertisingIncomeYear1?: number;
  advertisingGrowthPct?: number;
  advertisingValues?: number[];

  /** Step 2 — combined other income per year */
  otherIncomeTotalValues?: number[];

  /** Step 2 — section override flags */
  otherIncomeSectionOverrides?: Record<string, boolean>;
  otherIncomeManualYearValues?: Record<number, Record<string, number>>;

  /** Step 3 — operating expenses inputs */
  camFixedBase?: number;
  camVariableRate?: number;
  propertyTaxAnnual?: number;
  insuranceAnnual?: number;
  marketingPctOfRevenue?: number;
  gAndAAnnual?: number;
  mgmtFeePctOfRevenue?: number;
  renovationYear1?: number;
  renovationYear2?: number;
  renovationYears3to10?: number;
  opexSectionOverrides?: Record<string, boolean>;

  /** Step 3 — annual opex series */
  opexCamValues?: number[];
  opexPropertyTaxValues?: number[];
  opexInsuranceValues?: number[];
  opexMarketingValues?: number[];
  opexGaValues?: number[];
  opexMgmtFeeValues?: number[];
  opexRenovationValues?: number[];
  opexTotalValues?: number[];

  /** Step 4 — capital bases (optional overrides) */
  officeTiCapital?: number;
  retailTiCapital?: number;
  officeLeasingCommCapital?: number;
  retailLeasingCommCapital?: number;

  /** Step 4 — useful lives & WC */
  constructionLife?: number;
  ffeLife?: number;
  ffeRenovationPctYear6?: number;
  officeTiLife?: number;
  retailTiLife?: number;
  officeLeasingCommLife?: number;
  retailLeasingCommLife?: number;
  arMonths?: number;
  apMonths?: number;
  depSectionOverrides?: Record<string, boolean>;

  /** Step 4 — annual series */
  depConstructionValues?: number[];
  depFfeValues?: number[];
  depOfficeTiValues?: number[];
  depRetailTiValues?: number[];
  depOfficeLeasingCommValues?: number[];
  depRetailLeasingCommValues?: number[];
  depTotalValues?: number[];
  wcArValues?: number[];
  wcApValues?: number[];
  wcNetValues?: number[];
};

/** Component 2 operational residential hold — Step 1 (residential + podium retail rent). */
export type OperationalResidentialHoldSnapshot = {
  residentialGlaSqft: number;
  residentialRentPsfYear1: number;
  residentialRentEscalationPct: number;
  residentialLeasedOpeningPct: number;
  residentialLeasedTargetPct: number;
  residentialLeaseUpMonths: number;
  residentialVacancyRatePct: number;
  residentialBadDebtRatePct: number;
  residentialLeasedPctValues: number[];
  residentialEffectiveOccupancyValues: number[];
  residentialRentValues: number[];

  retailGlaSqft: number;
  retailRentPsfYear1: number;
  retailRentEscalationPct: number;
  retailLeasedOpeningPct: number;
  retailLeasedTargetPct: number;
  retailLeaseUpYears: number;
  retailFreeRentMonths: number;
  retailLeasedPctValues: number[];
  retailMinRentValues: number[];

  includePercentageRent: boolean;
  retailSalesPsfYear1: number;
  retailSalesGrowthPct: number;
  percentageRentRate: number;
  breakpointType: "natural" | "fixed";
  breakpointMultiple: number;
  fixedBreakpointPsf: number;
  percentageRentValues: number[];
  totalBaseRentValues: number[];

  fieldOverrides?: Record<string, boolean>;
  manualYearValues?: Record<number, Record<string, number>>;

  /** Step 2 — other income inputs */
  totalParkingSpaces?: number;
  parkingFeePerMonth?: number;
  parkingUptakePct?: number;
  amenityFeePerUnitMonth?: number;
  amenityUptakePct?: number;
  utilityRecoveryPerUnitMonth?: number;
  utilityUptakePct?: number;
  otherFeesPerUnitAnnual?: number;
  otherFeesUptakePct?: number;
  avgUnitSqft?: number;
  parkingIncomeValues?: number[];
  amenityIncomeValues?: number[];
  utilityIncomeValues?: number[];
  otherFeesIncomeValues?: number[];
  otherIncomeTotalValues?: number[];
  otherIncomeSectionOverrides?: Record<string, boolean>;
  otherIncomeManualYearValues?: Record<number, Record<string, number>>;

  /** Step 3 — operating expenses (gross lease, no CAM recoveries) */
  mgmtFeePctOfEgi?: number;
  maintenancePerUnitAnnual?: number;
  utilitiesFixedAnnual?: number;
  propertyTaxAnnual?: number;
  insuranceAnnual?: number;
  marketingPctOfEgi?: number;
  gAndAAnnual?: number;
  capexPerUnitAnnual?: number;
  estimatedTotalUnits?: number;
  opexMgmtFeeValues?: number[];
  opexMaintenanceValues?: number[];
  opexUtilitiesValues?: number[];
  opexPropertyTaxValues?: number[];
  opexInsuranceValues?: number[];
  opexMarketingValues?: number[];
  opexGaValues?: number[];
  opexCapexValues?: number[];
  opexTotalValues?: number[];
  opexSectionOverrides?: Record<string, boolean>;
  opexManualYearValues?: Record<number, Record<string, number>>;

  /** Step 4 — useful lives & working capital */
  constructionLife?: number;
  ffeLife?: number;
  ffeRenovationPctYear6?: number;
  arMonths?: number;
  apMonths?: number;
  depSectionOverrides?: Record<string, boolean>;
  depManualYearValues?: Record<number, Record<string, number>>;

  /** Step 4 — annual series */
  depConstructionValues?: number[];
  depFfeValues?: number[];
  depTotalValues?: number[];
  wcArValues?: number[];
  wcApValues?: number[];
  wcNetValues?: number[];
  wcChangeValues?: number[];
};

export const defaultOperationalResidentialHoldSnapshot: OperationalResidentialHoldSnapshot =
  {
    residentialGlaSqft: 0,
    residentialRentPsfYear1: 0,
    residentialRentEscalationPct: 0,
    residentialLeasedOpeningPct: 0,
    residentialLeasedTargetPct: 0,
    residentialLeaseUpMonths: 10,
    residentialVacancyRatePct: 5,
    residentialBadDebtRatePct: 2,
    residentialLeasedPctValues: [],
    residentialEffectiveOccupancyValues: [],
    residentialRentValues: [],
    retailGlaSqft: 0,
    retailRentPsfYear1: 0,
    retailRentEscalationPct: 0,
    retailLeasedOpeningPct: 0,
    retailLeasedTargetPct: 0,
    retailLeaseUpYears: 1.5,
    retailFreeRentMonths: 3,
    retailLeasedPctValues: [],
    retailMinRentValues: [],
    includePercentageRent: false,
    retailSalesPsfYear1: 0,
    retailSalesGrowthPct: 0,
    percentageRentRate: 0,
    breakpointType: "natural",
    breakpointMultiple: 1,
    fixedBreakpointPsf: 0,
    percentageRentValues: [],
    totalBaseRentValues: [],
    totalParkingSpaces: 0,
    parkingFeePerMonth: 0,
    parkingUptakePct: 80,
    amenityFeePerUnitMonth: 0,
    amenityUptakePct: 90,
    utilityRecoveryPerUnitMonth: 0,
    utilityUptakePct: 70,
    otherFeesPerUnitAnnual: 0,
    otherFeesUptakePct: 30,
    avgUnitSqft: 800,
    parkingIncomeValues: [],
    amenityIncomeValues: [],
    utilityIncomeValues: [],
    otherFeesIncomeValues: [],
    otherIncomeTotalValues: [],
    mgmtFeePctOfEgi: 4,
    maintenancePerUnitAnnual: 1500,
    utilitiesFixedAnnual: 200_000,
    propertyTaxAnnual: 500_000,
    insuranceAnnual: 80_000,
    marketingPctOfEgi: 1,
    gAndAAnnual: 100_000,
    capexPerUnitAnnual: 1000,
    estimatedTotalUnits: 0,
    opexMgmtFeeValues: [],
    opexMaintenanceValues: [],
    opexUtilitiesValues: [],
    opexPropertyTaxValues: [],
    opexInsuranceValues: [],
    opexMarketingValues: [],
    opexGaValues: [],
    opexCapexValues: [],
    opexTotalValues: [],
    constructionLife: 30,
    ffeLife: 7,
    ffeRenovationPctYear6: 40,
    arMonths: 1,
    apMonths: 1,
    depConstructionValues: [],
    depFfeValues: [],
    depTotalValues: [],
    wcArValues: [],
    wcApValues: [],
    wcNetValues: [],
    wcChangeValues: [],
  };

export const defaultOperationalOfficeHoldSnapshot: OperationalOfficeHoldSnapshot =
  {
    officeGlaSqft: 0,
    officeRentPsfYear1: 0,
    officeRentEscalationPct: 0,
    officeLeasedOpeningPct: 0,
    officeLeasedTargetPct: 0,
    officeLeaseUpYears: 2.5,
    officeFreeRentMonths: 6,
    officeLeasedPctValues: [],
    officeRentValues: [],
    retailGlaSqft: 0,
    retailRentPsfYear1: 0,
    retailRentEscalationPct: 0,
    retailLeasedOpeningPct: 0,
    retailLeasedTargetPct: 0,
    retailLeaseUpYears: 1.5,
    retailFreeRentMonths: 3,
    retailLeasedPctValues: [],
    retailMinRentValues: [],
    includePercentageRent: false,
    retailSalesPsfYear1: 0,
    retailSalesGrowthPct: 0,
    percentageRentRate: 0,
    breakpointType: "natural",
    breakpointMultiple: 1,
    fixedBreakpointPsf: 0,
    percentageRentValues: [],
    totalBaseRentValues: [],
  };

export type OperationalPnlComputed = {
  revenueByStream: {
    rooms: number[];
    food: number[];
    beverage: number[];
    roomService: number[];
    telecom: number[];
    spaHealth: number[];
    rentalOther: number[];
  };
  totalHotelRevenue: number[];
  directCostsByYear: {
    roomsPayroll: number[];
    roomsOther: number[];
    foodCostOfSale: number[];
    beverageCostOfSale: number[];
    fbPayroll: number[];
    fbOther: number[];
    telecomCost: number[];
    healthLeisureCost: number[];
    otherDeptsCost: number[];
  };
  totalDirectCosts: number[];
  ga: number[];
  marketingSales: number[];
  propertyOpsMaintenance: number[];
  utilities: number[];
  baseManagementFee: number[];
  incentiveFee: number[];
  renovationProvision: number[];
  undistributedFour: number[];
  fixedThree: number[];
  totalExpenses: number[];
  ebitda: number[];
  depreciationConstruction: number[];
  depreciationFfe: number[];
  depreciationTotal: number[];
  ebit: number[];
  netIncome: number[];
};

function coerceRevPcts(r: Record<string, number>): Record<HotelRevenuePctKey, number> {
  return {
    ...pctsFromRevenueProfile(HOTEL_REVENUE_PROFILES.default),
    ...r,
  } as Record<HotelRevenuePctKey, number>;
}

function coerceDirectPcts(
  r: Record<string, number>
): Record<HotelDirectCostPctKey, number> {
  return {
    ...pctsFromDirectCostProfile(HOTEL_DIRECT_COST_PROFILES.default),
    ...r,
  } as Record<HotelDirectCostPctKey, number>;
}

function coerceExpensePcts(r: Record<string, number>): Record<HotelExpensePctKey, number> {
  return {
    ...pctsFromExpenseProfile(HOTEL_EXPENSE_PROFILES.default),
    ...r,
  } as Record<HotelExpensePctKey, number>;
}

function coerceDepFields(
  r: Record<string, number>
): Record<HotelDepreciationFieldKey, number> {
  return {
    ...valuesFromDepreciationProfile(HOTEL_DEPRECIATION_PROFILES.default),
    ...r,
  } as Record<HotelDepreciationFieldKey, number>;
}

function buildDirectCostAmounts(
  revenueRow: Record<string, number>,
  p: Record<HotelDirectCostPctKey, number>
): {
  roomsPayroll: number;
  roomsOther: number;
  foodCostOfSale: number;
  beverageCostOfSale: number;
  fbPayroll: number;
  fbOther: number;
  telecomCost: number;
  healthLeisureCost: number;
  otherDeptsCost: number;
  totalDirect: number;
} {
  const roomRev = Number(revenueRow.rooms) || 0;
  const foodRev = Number(revenueRow.food) || 0;
  const beverageRev = Number(revenueRow.beverage) || 0;
  const roomServiceRev = Number(revenueRow.roomService) || 0;
  const telecomRev = Number(revenueRow.telecom) || 0;
  const spaRev = Number(revenueRow.spaHealth) || 0;
  const rentalOtherRev = Number(revenueRow.rentalOther) || 0;
  const fbTotal = foodRev + beverageRev + roomServiceRev;

  const roomsPayroll = roomRev * (p.roomsPayroll / 100);
  const roomsOther = roomRev * (p.roomsOther / 100);
  const foodCostOfSale = foodRev * (p.foodCostOfSale / 100);
  const beverageCostOfSale = beverageRev * (p.beverageCostOfSale / 100);
  const fbPayroll = fbTotal * (p.fbPayroll / 100);
  const fbOther = fbTotal * (p.fbOther / 100);
  const telecomCost = telecomRev * (p.telecomCost / 100);
  const healthLeisureCost = spaRev * (p.healthLeisureCost / 100);
  const otherDeptsCost = rentalOtherRev * (p.otherDeptsCost / 100);

  const totalDirect =
    roomsPayroll +
    roomsOther +
    foodCostOfSale +
    beverageCostOfSale +
    fbPayroll +
    fbOther +
    telecomCost +
    healthLeisureCost +
    otherDeptsCost;

  return {
    roomsPayroll,
    roomsOther,
    foodCostOfSale,
    beverageCostOfSale,
    fbPayroll,
    fbOther,
    telecomCost,
    healthLeisureCost,
    otherDeptsCost,
    totalDirect,
  };
}

function expenseLinesForYear(
  yearIndex: number,
  totalRev: number,
  roomRev: number,
  directTotal: number,
  p: Record<HotelExpensePctKey, number>
): {
  ga: number;
  marketingSales: number;
  propertyOpsMaintenance: number;
  utilities: number;
  baseManagementFee: number;
  incentiveFee: number;
  renovationProvision: number;
  undistributedFour: number;
  fixedThree: number;
  total: number;
} {
  const ga = totalRev * (p.gaExpenses / 100);
  const marketingSales = totalRev * (p.marketingSales / 100);
  const propertyOpsMaintenance = totalRev * (p.propertyOpsMaintenance / 100);
  const utilities = totalRev * (p.utilities / 100);
  const undistributedFour = ga + marketingSales + propertyOpsMaintenance + utilities;

  const baseManagementFee = roomRev * (p.baseManagementFee / 100);
  const renoPct =
    yearIndex === 0
      ? p.renovationProvisionY1
      : yearIndex === 1
        ? p.renovationProvisionY2
        : p.renovationProvisionY3to10;
  const renovationProvision = totalRev * (renoPct / 100);

  const ebitdaBeforeIncentive =
    totalRev - directTotal - undistributedFour - baseManagementFee - renovationProvision;
  const incentiveFee = incentiveFeeFromCircularEbitda(
    ebitdaBeforeIncentive,
    p.incentiveFee
  );
  const fixedThree = baseManagementFee + incentiveFee + renovationProvision;
  const total = directTotal + undistributedFour + fixedThree;

  return {
    ga,
    marketingSales,
    propertyOpsMaintenance,
    utilities,
    baseManagementFee,
    incentiveFee,
    renovationProvision,
    undistributedFour,
    fixedThree,
    total,
  };
}

/**
 * 10-year operating P&L from persisted Steps 1–5 snapshot + Component 1 capex (construction + FFE).
 */
export function computeOperationalHotelHoldPnl(
  snapshot: OperationalHotelHoldSnapshot,
  constructionCost: number,
  ffeCost: number
): OperationalPnlComputed {
  const revPcts = coerceRevPcts(snapshot.revPcts);
  const directPcts = coerceDirectPcts(snapshot.directCostPcts);
  const expensePcts = coerceExpensePcts(snapshot.expensePcts);
  const depFields = coerceDepFields(snapshot.depFieldValues);

  const adrRaw = Array.isArray((snapshot as any)?.adrValues)
    ? ((snapshot as any).adrValues as unknown[])
    : [];
  const occRaw = Array.isArray((snapshot as any)?.occupancyValues)
    ? ((snapshot as any).occupancyValues as unknown[])
    : [];

  const adr = adrRaw
    .slice(0, OPERATIONAL_ROOM_REVENUE_YEARS)
    .map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0));
  const occ = occRaw
    .slice(0, OPERATIONAL_ROOM_REVENUE_YEARS)
    .map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0));
  while (adr.length < OPERATIONAL_ROOM_REVENUE_YEARS) adr.push(0);
  while (occ.length < OPERATIONAL_ROOM_REVENUE_YEARS) occ.push(0);

  const roomRevenue = computeRoomRevenueSeries(
    snapshot.numberOfRooms,
    adr,
    occ
  );

  const rShare = revPcts.rooms / 100;
  const revenueRows = roomRevenue.map((rr, i) => {
    const total = rShare > 0 ? rr / rShare : 0;
    const row: Record<string, number> = { rooms: rr };
    for (const k of HOTEL_REVENUE_PCT_KEYS) {
      if (k === "rooms") continue;
      row[k] = total * (revPcts[k] / 100);
    }
    return row;
  });

  const totalHotelRevenue = revenueRows.map((row) =>
    HOTEL_REVENUE_PCT_KEYS.reduce((s, k) => s + (Number(row[k]) || 0), 0)
  );

  const zeros = () => Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(0);
  const directCostsByYear = {
    roomsPayroll: zeros(),
    roomsOther: zeros(),
    foodCostOfSale: zeros(),
    beverageCostOfSale: zeros(),
    fbPayroll: zeros(),
    fbOther: zeros(),
    telecomCost: zeros(),
    healthLeisureCost: zeros(),
    otherDeptsCost: zeros(),
  };
  const totalDirectCosts = zeros();
  const ga = zeros();
  const marketingSales = zeros();
  const propertyOpsMaintenance = zeros();
  const utilities = zeros();
  const baseManagementFee = zeros();
  const incentiveFee = zeros();
  const renovationProvision = zeros();
  const undistributedFour = zeros();
  const fixedThree = zeros();
  const totalExpenses = zeros();
  const ebitda = zeros();
  const depreciationConstruction = zeros();
  const depreciationFfe = zeros();
  const depreciationTotal = zeros();
  const ebit = zeros();
  const netIncome = zeros();

  const cc = Math.max(0, constructionCost);
  const ffe = Math.max(0, ffeCost);
  const conAnnual = annualConstructionDepreciation(
    cc,
    depFields.constructionUsefulLife
  );

  for (let i = 0; i < OPERATIONAL_ROOM_REVENUE_YEARS; i++) {
    const row = revenueRows[i] ?? {};
    const d = buildDirectCostAmounts(row, directPcts);
    directCostsByYear.roomsPayroll[i] = d.roomsPayroll;
    directCostsByYear.roomsOther[i] = d.roomsOther;
    directCostsByYear.foodCostOfSale[i] = d.foodCostOfSale;
    directCostsByYear.beverageCostOfSale[i] = d.beverageCostOfSale;
    directCostsByYear.fbPayroll[i] = d.fbPayroll;
    directCostsByYear.fbOther[i] = d.fbOther;
    directCostsByYear.telecomCost[i] = d.telecomCost;
    directCostsByYear.healthLeisureCost[i] = d.healthLeisureCost;
    directCostsByYear.otherDeptsCost[i] = d.otherDeptsCost;
    totalDirectCosts[i] = d.totalDirect;

    const T = totalHotelRevenue[i] ?? 0;
    const Rr = Number(row.rooms) || 0;
    const ex = expenseLinesForYear(i, T, Rr, d.totalDirect, expensePcts);
    ga[i] = ex.ga;
    marketingSales[i] = ex.marketingSales;
    propertyOpsMaintenance[i] = ex.propertyOpsMaintenance;
    utilities[i] = ex.utilities;
    baseManagementFee[i] = ex.baseManagementFee;
    incentiveFee[i] = ex.incentiveFee;
    renovationProvision[i] = ex.renovationProvision;
    undistributedFour[i] = ex.undistributedFour;
    fixedThree[i] = ex.fixedThree;
    totalExpenses[i] = ex.total;
    ebitda[i] = T - ex.total;

    const ffeDep = annualFfeDepreciation(
      i,
      ffe,
      depFields.ffeUsefulLife,
      depFields.ffeRenovationRate
    );
    depreciationConstruction[i] = conAnnual;
    depreciationFfe[i] = ffeDep;
    depreciationTotal[i] = conAnnual + ffeDep;
    ebit[i] = ebitda[i] - depreciationTotal[i];
    netIncome[i] = ebit[i];
  }

  return {
    revenueByStream: {
      rooms: revenueRows.map((r) => r.rooms || 0),
      food: revenueRows.map((r) => r.food || 0),
      beverage: revenueRows.map((r) => r.beverage || 0),
      roomService: revenueRows.map((r) => r.roomService || 0),
      telecom: revenueRows.map((r) => r.telecom || 0),
      spaHealth: revenueRows.map((r) => r.spaHealth || 0),
      rentalOther: revenueRows.map((r) => r.rentalOther || 0),
    },
    totalHotelRevenue,
    directCostsByYear,
    totalDirectCosts,
    ga,
    marketingSales,
    propertyOpsMaintenance,
    utilities,
    baseManagementFee,
    incentiveFee,
    renovationProvision,
    undistributedFour,
    fixedThree,
    totalExpenses,
    ebitda,
    depreciationConstruction,
    depreciationFfe,
    depreciationTotal,
    ebit,
    netIncome,
  };
}

export function buildPnlExportRows(
  pnl: OperationalPnlComputed,
  currencyCode: string
): (string | number)[][] {
  const fmt = (n: number) => Math.round(n);
  const Y = (fn: (i: number) => number) =>
    Array.from({ length: OPERATIONAL_ROOM_REVENUE_YEARS }, (_, i) => fmt(fn(i)));

  return [
    [`Operating P&L — ${currencyCode}`, ...Array(10).fill("")],
    ["", ...Array(10).fill("")],
    ["", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9", "Y10"],
    ["REVENUE", ...Array(10).fill("")],
    ["Room revenue", ...Y((i) => pnl.revenueByStream.rooms[i] ?? 0)],
    ["Food revenue", ...Y((i) => pnl.revenueByStream.food[i] ?? 0)],
    ["Beverage revenue", ...Y((i) => pnl.revenueByStream.beverage[i] ?? 0)],
    ["Room service", ...Y((i) => pnl.revenueByStream.roomService[i] ?? 0)],
    ["Telecom", ...Y((i) => pnl.revenueByStream.telecom[i] ?? 0)],
    ["Spa & health", ...Y((i) => pnl.revenueByStream.spaHealth[i] ?? 0)],
    ["Rental & other", ...Y((i) => pnl.revenueByStream.rentalOther[i] ?? 0)],
    ["TOTAL REVENUE", ...Y((i) => pnl.totalHotelRevenue[i] ?? 0)],
    ["", ...Array(10).fill("")],
    ["EXPENSES", ...Array(10).fill("")],
    ["Rooms — payroll", ...Y((i) => pnl.directCostsByYear.roomsPayroll[i] ?? 0)],
    ["Rooms — other", ...Y((i) => pnl.directCostsByYear.roomsOther[i] ?? 0)],
    [
      "Food — COS",
      ...Y((i) => pnl.directCostsByYear.foodCostOfSale[i] ?? 0),
    ],
    [
      "Beverage — COS",
      ...Y((i) => pnl.directCostsByYear.beverageCostOfSale[i] ?? 0),
    ],
    ["F&B — payroll", ...Y((i) => pnl.directCostsByYear.fbPayroll[i] ?? 0)],
    ["F&B — other", ...Y((i) => pnl.directCostsByYear.fbOther[i] ?? 0)],
    ["Telecom", ...Y((i) => pnl.directCostsByYear.telecomCost[i] ?? 0)],
    ["Spa & health", ...Y((i) => pnl.directCostsByYear.healthLeisureCost[i] ?? 0)],
    [
      "Rental & other depts.",
      ...Y((i) => pnl.directCostsByYear.otherDeptsCost[i] ?? 0),
    ],
    ["Sub-total direct", ...Y((i) => pnl.totalDirectCosts[i] ?? 0)],
    ["G&A", ...Y((i) => pnl.ga[i] ?? 0)],
    ["Marketing & sales", ...Y((i) => pnl.marketingSales[i] ?? 0)],
    [
      "Property ops & maintenance",
      ...Y((i) => pnl.propertyOpsMaintenance[i] ?? 0),
    ],
    ["Utilities", ...Y((i) => pnl.utilities[i] ?? 0)],
    ["Base management fee", ...Y((i) => pnl.baseManagementFee[i] ?? 0)],
    ["Incentive fee", ...Y((i) => pnl.incentiveFee[i] ?? 0)],
    ["Renovation provision", ...Y((i) => pnl.renovationProvision[i] ?? 0)],
    ["TOTAL EXPENSES", ...Y((i) => pnl.totalExpenses[i] ?? 0)],
    ["", ...Array(10).fill("")],
    ["EBITDA", ...Y((i) => pnl.ebitda[i] ?? 0)],
    ["Depreciation — construction", ...Y((i) => pnl.depreciationConstruction[i] ?? 0)],
    ["Depreciation — FFE", ...Y((i) => pnl.depreciationFfe[i] ?? 0)],
    ["EBIT", ...Y((i) => pnl.ebit[i] ?? 0)],
    ["Net income (preview)", ...Y((i) => pnl.netIncome[i] ?? 0)],
  ];
}
