import { generateWarehouse10YearProjection } from "@/app/operational/cash-inflows/components/c2s1-primary-revenue-warehouse";
import { generateWarehouseOtherIncomeProjection } from "@/app/operational/cash-inflows/components/c2s2-other-income-warehouse";
import { generateWarehouseOpexProjection } from "@/app/operational/cash-inflows/components/c2s3-operating-expenses-warehouse";
import { generateWarehouseDepreciationProjection } from "@/app/operational/cash-inflows/components/c2s4-depreciation-warehouse";
import type {
  CashOutflows,
  WarehouseDepreciation,
  WarehouseOpEx,
  WarehouseOtherIncome,
  WarehouseRevenue,
} from "@/store/useFinModelStore";
import { warehouseCamExpensePool } from "@/store/useFinModelStore";

export type WarehousePnlSeries = {
  baseRent: number[];
  yard: number[];
  parking: number[];
  camTax: number[];
  advertising: number[];
  totalRevenue: number[];
  propertyTax: number[];
  insurance: number[];
  maintenance: number[];
  landscaping: number[];
  utilities: number[];
  security: number[];
  mgmtFee: number[];
  gAndA: number[];
  totalExpenses: number[];
  ebitda: number[];
  buildingDep: number[];
  siteDep: number[];
  ffeDep: number[];
  totalDa: number[];
  ebit: number[];
  netIncome: number[];
  changeInWorkingCapital: number[];
  arDays: number;
  apDays: number;
};

/** True when all 4 warehouse Component 2 steps have been saved. */
export function isWarehouseComponent2Complete(cashInflows?: {
  warehouseRevenue?: WarehouseRevenue;
  warehouseOtherIncome?: WarehouseOtherIncome;
  warehouseOpEx?: WarehouseOpEx;
  warehouseDepreciation?: WarehouseDepreciation;
} | null): boolean {
  const rev = cashInflows?.warehouseRevenue;
  const other = cashInflows?.warehouseOtherIncome;
  const opex = cashInflows?.warehouseOpEx;
  const dep = cashInflows?.warehouseDepreciation;

  return (
    (rev?.totalGfa ?? 0) > 0 &&
    (rev?.occupancyRate ?? 0) > 0 &&
    (rev?.ratePerSqftYear ?? 0) > 0 &&
    other?.camRecoveryPct !== undefined &&
    opex?.propertyTaxRate !== undefined &&
    (dep?.buildingUsefulLifeYears ?? 0) > 0
  );
}

export function resolveWarehouseCapexBases(cashOutflows: Pick<
  CashOutflows,
  "warehouseCosts" | "ffe" | "developmentType"
>): {
  buildingCost: number;
  siteImprovementsCost: number;
  ffeCost: number;
} {
  const costs = cashOutflows.warehouseCosts;
  const buildingCost = costs?.buildingShellCost || 0;
  const siteImprovementsCost =
    (costs?.siteYardWorksCost || 0) +
    (costs?.loadingAccessCost || 0) +
    (cashOutflows.developmentType === "INDUSTRIAL_PARK"
      ? costs?.commonInfrastructureCost || 0
      : 0);
  return {
    buildingCost,
    siteImprovementsCost,
    ffeCost: cashOutflows.ffe || 0,
  };
}

export function resolveWarehousePnlSeries(params: {
  warehouseRevenue?: WarehouseRevenue;
  warehouseOtherIncome?: WarehouseOtherIncome;
  warehouseOpEx?: WarehouseOpEx;
  warehouseDepreciation?: WarehouseDepreciation;
  buildingCost: number;
  siteImprovementsCost: number;
  ffeCost: number;
}): WarehousePnlSeries | null {
  const rev = params.warehouseRevenue;
  if (!rev || !(rev.totalAnnualRevenue > 0 || rev.totalGfa > 0)) {
    return null;
  }

  const revenueRows = generateWarehouse10YearProjection({
    totalGfa: rev.totalGfa || 0,
    occupancyRate: rev.occupancyRate || 0,
    ratePerSqftYear: rev.ratePerSqftYear || 0,
    rentEscalationPct: rev.rentEscalationPct ?? 3,
    leaseUpYears: rev.leaseUpYears ?? 2,
    freeRentMonths: rev.freeRentMonths ?? 0,
    yardArea: rev.yardArea || 0,
    yardRate: rev.yardRate || 0,
    parkingSpacesCars: rev.parkingSpacesCars || 0,
    parkingRateCars: rev.parkingRateCars || 0,
    parkingSpacesTrailers: rev.parkingSpacesTrailers || 0,
    parkingRateTrailers: rev.parkingRateTrailers || 0,
  });

  const baseRent = revenueRows.map((r) => r.grossRent);
  const yard = revenueRows.map((r) => r.yardRevenue);
  const parking = revenueRows.map((r) => r.parkingRevenue);
  const primaryRevenueByYear = revenueRows.map((r) => r.totalRevenue);

  const other = params.warehouseOtherIncome;
  const camPool = warehouseCamExpensePool(params.warehouseOpEx);
  const otherRows = generateWarehouseOtherIncomeProjection({
    totalCamExpensesY1: camPool,
    camRecoveryPct: other?.camRecoveryPct ?? 80,
    estimatedPropertyTaxY1: params.warehouseOpEx?.annualPropertyTax ?? 0,
    taxRecoveryPct: other?.taxRecoveryPct ?? 100,
    estimatedInsuranceY1: params.warehouseOpEx?.annualInsurance ?? 0,
    insuranceRecoveryPct: other?.insuranceRecoveryPct ?? 100,
    rentEscalationPct: rev.rentEscalationPct ?? 3,
    signageRevenue: other?.signageRevenue ?? 0,
    signageEscalationPct: 0,
  }).rows;

  const camTax = otherRows.map((r) => r.cam + r.tax + r.insurance);
  const advertising = otherRows.map((r) => r.advertising);

  const totalRevenue = primaryRevenueByYear.map(
    (v, i) => v + camTax[i] + advertising[i]
  );

  const opEx = params.warehouseOpEx;
  const opexRows = generateWarehouseOpexProjection({
    annualPropertyTax: opEx?.annualPropertyTax ?? 0,
    annualInsurance: opEx?.annualInsurance ?? 0,
    annualMaintenance: opEx?.annualMaintenance ?? 0,
    annualLandscaping: opEx?.annualLandscaping ?? 0,
    annualUtilities: opEx?.annualUtilities ?? 0,
    annualSecurity: opEx?.annualSecurity ?? 0,
    managementFeeRate: opEx?.managementFeeRate ?? 0,
    gAndARate: opEx?.gAndARate ?? 0,
    // Match Step 3: mgmt fee & G&A apply to primary revenue only
    // (Base Rent + Yard + Parking), not TOTAL REVENUE with CAM/signage.
    revenueByYear: primaryRevenueByYear,
    expenseEscalationPct: rev.rentEscalationPct ?? 0,
  }).rows;

  const propertyTax = opexRows.map((r) => r.propertyTax);
  const insurance = opexRows.map((r) => r.insurance);
  const maintenance = opexRows.map((r) => r.maintenance);
  const landscaping = opexRows.map((r) => r.landscaping);
  const utilities = opexRows.map((r) => r.utilities);
  const security = opexRows.map((r) => r.security);
  const mgmtFee = opexRows.map((r) => r.mgmtFee);
  const gAndA = opexRows.map((r) => r.gAndA);
  const totalExpenses = opexRows.map((r) => r.total);

  const ebitda = totalRevenue.map((v, i) => v - totalExpenses[i]);

  const dep = params.warehouseDepreciation;
  const arDays = dep?.arDays ?? 30;
  const apDays = dep?.apDays ?? 30;
  const depRows = generateWarehouseDepreciationProjection({
    buildingCost: params.buildingCost,
    siteImprovementsCost: params.siteImprovementsCost,
    ffeCost: params.ffeCost,
    buildingLife: dep?.buildingUsefulLifeYears ?? 40,
    siteLife: dep?.siteUsefulLifeYears ?? 20,
    ffeLife: dep?.ffeUsefulLifeYears ?? 10,
    ffeReservePct: dep?.ffeReservePctOfRevenue ?? 0,
    arDays,
    apDays,
    revenueByYear: totalRevenue,
    opexByYear: totalExpenses,
  });

  const buildingDep = depRows.map((r) => r.buildingDeprec);
  const siteDep = depRows.map((r) => r.siteDeprec);
  const ffeDep = depRows.map((r) => r.ffeDeprec);
  const totalDa = depRows.map((r) => r.totalDA);
  const netWcLevels = depRows.map((r) => r.netWc);
  const changeInWorkingCapital = netWcLevels.map(
    (w, i) => w - (i > 0 ? netWcLevels[i - 1]! : 0)
  );

  const ebit = ebitda.map((v, i) => v - totalDa[i]);
  const netIncome = ebit;

  return {
    baseRent,
    yard,
    parking,
    camTax,
    advertising,
    totalRevenue,
    propertyTax,
    insurance,
    maintenance,
    landscaping,
    utilities,
    security,
    mgmtFee,
    gAndA,
    totalExpenses,
    ebitda,
    buildingDep,
    siteDep,
    ffeDep,
    totalDa,
    ebit,
    netIncome,
    changeInWorkingCapital,
    arDays,
    apDays,
  };
}
