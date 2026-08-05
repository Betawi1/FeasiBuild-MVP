import { generateDataCentre10YearProjection } from "@/app/operational/cash-inflows/components/c2s1-primary-revenue-data-centre";
import { generateDataCentreOtherIncomeProjection } from "@/app/operational/cash-inflows/components/c2s2-other-income-data-centre";
import { generateDataCentreOpExProjection } from "@/app/operational/cash-inflows/components/c2s3-operating-expenses-data-centre";
import { generateDataCentreDepreciationProjection } from "@/app/operational/cash-inflows/components/c2s4-depreciation-data-centre";
import { resolveDataCentreCapEx } from "@/app/operational/cash-outflows/steps/DataCentreConstructionCostsStep";
import type {
  DataCentreDepreciation,
  DataCentreOpEx,
  DataCentreOtherIncome,
  DataCentreRevenue,
  ProjectInfo,
} from "@/store/useFinModelStore";

export type DataCentrePnlSeries = {
  powerRevenue: number[];
  spaceRevenue: number[];
  totalPrimaryRevenue: number[];
  crossConnect: number[];
  meteredPower: number[];
  maintenanceMarkup: number[];
  installation: number[];
  totalOtherIncome: number[];
  totalRevenue: number[];
  powerCost: number[];
  maintenance: number[];
  labor: number[];
  insurance: number[];
  propertyTax: number[];
  security: number[];
  waterUtilities: number[];
  gAndA: number[];
  mgmtFee: number[];
  totalOpEx: number[];
  ebitda: number[];
  buildingDep: number[];
  meDep: number[];
  itDep: number[];
  ffeReserve: number[];
  totalDa: number[];
  ebit: number[];
  netIncome: number[];
  changeInWorkingCapital: number[];
  includeIT: boolean;
  arDays: number;
  apDays: number;
};

/** True when Data Centre Component 2 Steps 1–4 have meaningful saved inputs. */
export function isDataCentreComponent2Complete(cashInflows?: {
  dataCentreRevenue?: DataCentreRevenue;
  dataCentreOtherIncome?: DataCentreOtherIncome;
  dataCentreOpEx?: DataCentreOpEx;
  dataCentreDepreciation?: DataCentreDepreciation;
} | null): boolean {
  const rev = cashInflows?.dataCentreRevenue;
  const opex = cashInflows?.dataCentreOpEx;
  const dep = cashInflows?.dataCentreDepreciation;

  return (
    (rev?.itLoadKw ?? 0) > 0 &&
    (rev?.ratePerKwMonth ?? 0) > 0 &&
    (opex?.totalAnnualOpEx ?? 0) > 0 &&
    (dep?.buildingUsefulLifeYears ?? 0) > 0
  );
}

export function resolveDataCentrePnlSeries(params: {
  projectInfo: ProjectInfo;
  dataCentreRevenue?: DataCentreRevenue;
  dataCentreOtherIncome?: DataCentreOtherIncome;
  dataCentreOpEx?: DataCentreOpEx;
  dataCentreDepreciation?: DataCentreDepreciation;
}): DataCentrePnlSeries | null {
  const rev = params.dataCentreRevenue;
  if (!rev || !(rev.totalAnnualRevenue > 0 || rev.itLoadKw > 0)) {
    return null;
  }

  const includeIT =
    params.projectInfo.dataCentreITHardwareProvidedByOperator === true;
  const capEx = resolveDataCentreCapEx(params.projectInfo);

  const revenueRows = generateDataCentre10YearProjection({
    itLoadKw: rev.itLoadKw || 0,
    whiteSpaceArea: rev.whiteSpaceArea || 0,
    occupancyRate: rev.occupancyRate || 0,
    ratePerKwMonth: rev.ratePerKwMonth || 0,
    ratePerSqftMonth: rev.ratePerSqftMonth || 0,
    annualEscalationPct: rev.annualEscalationPct ?? 3,
    manualYearValues: rev.manualYearValues,
  });

  const powerRevenue = revenueRows.map((r) => r.powerRevenue);
  const spaceRevenue = revenueRows.map((r) => r.spaceRevenue);
  const totalPrimaryRevenue = revenueRows.map((r) => r.totalRevenue);

  const other = params.dataCentreOtherIncome;
  const otherEscalation =
    other?.annualEscalationPct ?? rev.annualEscalationPct ?? 3;
  const otherRows = generateDataCentreOtherIncomeProjection({
    annualCrossConnect: other?.annualCrossConnect ?? 0,
    annualMeteredPower: other?.annualMeteredPower ?? 0,
    annualMaintenanceMarkup: other?.annualMaintenanceMarkup ?? 0,
    annualInstallation: other?.annualInstallation ?? 0,
    annualEscalationPct: otherEscalation,
    manualYearValues: other?.manualYearValues,
  });

  const crossConnect = otherRows.map((r) => r.crossConnect);
  const meteredPower = otherRows.map((r) => r.meteredPower);
  const maintenanceMarkup = otherRows.map((r) => r.maintenanceMarkup);
  const installation = otherRows.map((r) => r.installation);
  const totalOtherIncome = otherRows.map((r) => r.total);

  const totalRevenue = totalPrimaryRevenue.map(
    (v, i) => v + (totalOtherIncome[i] ?? 0)
  );

  const opEx = params.dataCentreOpEx;
  const opexRows = generateDataCentreOpExProjection({
    annualPowerCost: opEx?.annualPowerCost ?? 0,
    annualMaintenance: opEx?.annualMaintenance ?? 0,
    annualLabor: opEx?.annualLabor ?? 0,
    annualInsurance: opEx?.annualInsurance ?? 0,
    annualPropertyTax: opEx?.annualPropertyTax ?? 0,
    annualSecurity: opEx?.annualSecurity ?? 0,
    annualWaterUtilities: opEx?.annualWaterUtilities ?? 0,
    annualMgmtFee: opEx?.annualMgmtFee ?? 0,
    annualGAndA: opEx?.annualGAndA ?? 0,
    annualEscalationPct: opEx?.annualEscalationPct ?? 3,
    inflationPct: opEx?.inflationPct ?? 3,
    manualYearValues: opEx?.manualYearValues,
  });

  const powerCost = opexRows.map((r) => r.power);
  const maintenance = opexRows.map((r) => r.maintenance);
  const labor = opexRows.map((r) => r.labor);
  const insurance = opexRows.map((r) => r.insurance);
  const propertyTax = opexRows.map((r) => r.tax);
  const security = opexRows.map((r) => r.security);
  const waterUtilities = opexRows.map((r) => r.utilities);
  const gAndA = opexRows.map((r) => r.gAndA);
  const mgmtFee = opexRows.map((r) => r.mgmtFee);
  const totalOpEx = opexRows.map((r) => r.total);

  const ebitda = totalRevenue.map((v, i) => v - (totalOpEx[i] ?? 0));

  const dep = params.dataCentreDepreciation;
  const arDays = dep?.arDays ?? 30;
  const apDays = dep?.apDays ?? 30;
  const depRows = generateDataCentreDepreciationProjection({
    buildingCost: dep?.buildingCostBase ?? capEx.buildingCost,
    meCost: dep?.meCostBase ?? capEx.meCost,
    itHardwareCost: includeIT
      ? dep?.itHardwareCostBase ?? capEx.itHardwareCost
      : 0,
    includeIT,
    buildingLife: dep?.buildingUsefulLifeYears ?? 25,
    meLife: dep?.meUsefulLifeYears ?? 15,
    itLife: dep?.itHardwareUsefulLifeYears ?? 5,
    ffeReservePct: dep?.ffeReservePercent ?? 0,
    arDays,
    apDays,
    // FF&E reserve & A/R track primary + other revenue; A/P tracks OpEx
    revenueByYear: totalRevenue,
    opexByYear: totalOpEx,
  });

  const buildingDep = depRows.map((r) => r.buildingDeprec);
  const meDep = depRows.map((r) => r.meDeprec);
  const itDep = depRows.map((r) => r.itDeprec);
  const ffeReserve = depRows.map((r) => r.ffeReserve);
  const totalDa = depRows.map((r) => r.totalDA);
  const netWcLevels = depRows.map((r) => r.netWc);
  const changeInWorkingCapital = netWcLevels.map(
    (w, i) => w - (i > 0 ? netWcLevels[i - 1]! : 0)
  );

  const ebit = ebitda.map((v, i) => v - (totalDa[i] ?? 0));
  const netIncome = ebit;

  return {
    powerRevenue,
    spaceRevenue,
    totalPrimaryRevenue,
    crossConnect,
    meteredPower,
    maintenanceMarkup,
    installation,
    totalOtherIncome,
    totalRevenue,
    powerCost,
    maintenance,
    labor,
    insurance,
    propertyTax,
    security,
    waterUtilities,
    gAndA,
    mgmtFee,
    totalOpEx,
    ebitda,
    buildingDep,
    meDep,
    itDep,
    ffeReserve,
    totalDa,
    ebit,
    netIncome,
    changeInWorkingCapital,
    includeIT,
    arDays,
    apDays,
  };
}
