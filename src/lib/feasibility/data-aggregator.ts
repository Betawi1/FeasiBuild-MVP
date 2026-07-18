import useFinModelStore from "@/store/useFinModelStore";
import { computeOperationalHotelHoldPnl } from "@/lib/operational-pnl";
import { generateReportData } from "@/lib/feasibility/generate-report";
import {
  resolveComponent4EquityHeadlines,
  resolveLeveredEquityIrrPctFromFinModelStore,
  resolveUnleveredProjectIrrPct,
} from "@/lib/scenario-irr-calculation";
import { buildDevelopmentScheduleData } from "@/lib/feasibility/build-development-schedule-data";
import { buildOperationalRevenuesData } from "@/lib/feasibility/build-operational-revenues-data";
import { buildOperationalExpensesData } from "@/lib/feasibility/build-operational-expenses-data";
import { buildOperationalPnlData } from "@/lib/feasibility/build-operational-pnl-data";
import {
  buildOperationalCashFlowData,
  type OperationalCashFlowContext,
} from "@/lib/feasibility/build-operational-cash-flow-data";
import {
  buildTermLoanFinancingData,
  formatDrawdownLabel,
  formatTotalLoanTenorDisplay,
  resolveApprovedDebtAmount,
} from "@/lib/feasibility/build-term-loan-data";
import { buildPreferenceSharesExitStrategyData } from "@/lib/feasibility/build-preference-shares-exit-data";
import { buildPostFinancingCashFlowData } from "@/lib/feasibility/build-post-financing-cash-flow-data";
import { buildIrrAndFinancingMetricsData } from "@/lib/feasibility/build-irr-financing-metrics-data";
import { buildScenarioComparisonData } from "@/lib/feasibility/build-scenario-comparison-data";
import { buildScenarioAnalysisResultsData } from "@/lib/feasibility/build-scenario-analysis-results-data";
import type {
  AggregatedProjectData,
  DevelopmentScheduleData,
  FeasibilityProjectBundle,
  OperationalRevenuesData,
  OperationalExpensesData,
  OperationalPnLData,
  OperationalCashFlowData,
  TermLoanFinancingData,
  PreferenceSharesExitStrategyData,
  PostFinancingCashFlowData,
  IrrAndFinancingMetricsData,
  ScenarioComparisonData,
  ScenarioAnalysisResultsData,
} from "@/types/feasibility";
import type { HotelFeasibilityProjectData } from "@/lib/feasibility/hotel-feasibility-types";

export function aggregatedToHotelPayload(
  data: AggregatedProjectData
): HotelFeasibilityProjectData {
  return {
    location: `${data.location.city}, ${data.location.country}`,
    city: data.location.city,
    country: data.location.country,
    currency: data.currency,
    assetType: data.assetType,
    starRating: data.starRating,
    hotelOperatingType: data.segment,
    rooms: data.keys,
    totalBUA: data.bua,
    constructionMonths: data.constructionPeriod,
    tdc: data.tdc,
    gdv: data.gdv,
    projectIRR: data.projectIrr,
    equityIRR: data.equityIrr,
    equityMultiple: data.equityMultiple,
    paybackYears: data.paybackYears,
    netProfitMargin: data.netProfitMargin,
    stabilizedAdr: data.adrYear3,
    stabilizedOccupancyPct: data.occYear3,
    year1Adr: data.adrYear1,
    year3Adr: data.adrYear3,
    year1OccupancyPct: data.occYear1,
    year3OccupancyPct: data.occYear3,
    revenueByYear: data.revenueByYear,
    ebitdaByYear: data.ebitdaByYear,
    netIncomeByYear: data.netIncomeByYear,
  };
}

function totalBua(cashOutflows: {
  buildingBUA: number;
  parkingBUA: number;
  basementBUA: number;
}): number {
  return (
    (cashOutflows.buildingBUA || 0) +
    (cashOutflows.parkingBUA || 0) +
    (cashOutflows.basementBUA || 0)
  );
}

function paybackYears(
  financingPaybackMonth: number | undefined,
  equityPaybackMonths: number | null | undefined
): number {
  const months =
    financingPaybackMonth ??
    (equityPaybackMonths != null && equityPaybackMonths > 0
      ? equityPaybackMonths
      : null);
  if (months == null || !Number.isFinite(months)) return 0;
  return Math.round((months / 12) * 10) / 10;
}

/**
 * Extracts operational hotel model inputs from Components 1–4/6 (Zustand).
 */
export function getProjectData(): AggregatedProjectData {
  const state = useFinModelStore.getState();
  const slice = state.operational;
  const rootProjectIRR = state.projectIRR;
  const { projectInfo, cashOutflows, cashInflows, projectIRR, financingMetrics, hotelHoldSnapshot } =
    slice;

  const component4 = resolveComponent4EquityHeadlines({
    financingMetrics,
    projectIRR,
  });

  const projectIrr =
    resolveUnleveredProjectIrrPct(projectIRR, rootProjectIRR) ?? 0;
  const equityIrr =
    resolveLeveredEquityIrrPctFromFinModelStore({
      financingMetrics,
      projectIRR,
    }) ??
    component4.leveredIrrPct ??
    0;

  const tdc = cashOutflows.tdc || 0;
  const gdv =
    cashInflows.grossSales ||
    financingMetrics?.netExitProceeds ||
    (tdc > 0 ? tdc * 1.2 : 0);

  const netProfitMargin =
    gdv > 0 ? Math.round(((gdv - tdc) / gdv) * 1000) / 10 : 0;

  const adr = hotelHoldSnapshot?.adrValues ?? [];
  const occ = hotelHoldSnapshot?.occupancyValues ?? [];
  const adrYear1 = Number(adr[0]) || 0;
  const adrYear3 = Number(adr[2]) || Number(adr[adr.length - 1]) || adrYear1;
  const occYear1 = Number(occ[0]) || 0;
  const occYear3 = Number(occ[2]) || Number(occ[occ.length - 1]) || occYear1;

  const pnl =
    hotelHoldSnapshot != null
      ? computeOperationalHotelHoldPnl(
          hotelHoldSnapshot,
          cashOutflows.constructionCost || 0,
          cashOutflows.ffe || 0
        )
      : null;

  const report = generateReportData("operational");
  const star = projectInfo.hotelStarRating?.trim();
  const positioning = star ? `${star}-star` : "upper-upscale";
  const segment =
    projectInfo.hotelOperatingType?.replace(/_/g, " ") ||
    projectInfo.businessModel ||
    "full-service hotel";

  return {
    location: {
      country: projectInfo.country?.trim() || "—",
      city: projectInfo.city?.trim() || "—",
      subMarket: projectInfo.subMarket?.trim() || undefined,
      coordinates: projectInfo.coordinates ?? null,
    },
    assetType: report.projectInfo.assetType || "Hotel",
    segment: String(segment),
    positioning,
    keys: hotelHoldSnapshot?.numberOfRooms ?? 0,
    bua: totalBua(cashOutflows),
    constructionPeriod: cashOutflows.constructionPeriod || 0,
    currency: projectInfo.currency || "AED",
    starRating: star || "—",
    adrYear1,
    occYear1: occYear1,
    adrYear3,
    occYear3,
    tdc,
    gdv,
    projectIrr: Math.round(projectIrr * 100) / 100,
    equityIrr: Math.round(equityIrr * 100) / 100,
    equityMultiple: Math.round((component4.equityMultiple || 0) * 100) / 100,
    paybackYears: paybackYears(
      financingMetrics?.equityPayback,
      slice.equityReturns.paybackPeriod
    ),
    netProfitMargin,
    revenueByYear: [...(pnl?.totalHotelRevenue ?? [])],
    ebitdaByYear: [...(pnl?.ebitda ?? [])],
    netIncomeByYear: [...(pnl?.netIncome ?? [])],
  };
}

function extractMonthlyNcf(
  monthlyData: Array<{ ncfPostFinancing?: number }> | undefined,
  cumulativeByMonth: number[] | undefined,
  monthlyCashFlows: Array<{ amount: number }> | undefined
): number[] {
  if (monthlyData?.length) {
    return monthlyData.map((d) => Number(d.ncfPostFinancing ?? 0));
  }
  if (cumulativeByMonth?.length) {
    return cumulativeByMonth.map((cum, i) => cum - (cumulativeByMonth[i - 1] ?? 0));
  }
  if (monthlyCashFlows?.length) {
    return monthlyCashFlows.map((p) => Number(p.amount ?? 0));
  }
  return [];
}

function formatIdcTreatment(treatment: string): string {
  if (treatment === "capitalized" || treatment === "capitalize") {
    return "Capitalized into loan balance";
  }
  if (treatment === "current") return "Paid current (expensed)";
  if (treatment === "hybrid") return "Hybrid (split capitalize / current)";
  return treatment;
}

function formatLoanType(financing: {
  repaymentStructure?: string;
  loanType?: string;
  amortizationStyle?: string;
}): string {
  return (
    financing.repaymentStructure?.replace(/-/g, " ") ??
    financing.loanType?.replace(/-/g, " ") ??
    financing.amortizationStyle?.replace(/_/g, " ") ??
    "Equal payment"
  );
}

function adrInflationFromSeries(adr: number[]): number {
  if (adr.length >= 2 && adr[0] > 0) {
    const y2 = adr[1] ?? adr[0];
    return Math.round((y2 / adr[0] - 1) * 100 * 10) / 10;
  }
  return 4;
}

/** Full C1–C4 bundle for executive & financial section components. */
export function getFeasibilityProjectBundle(): FeasibilityProjectBundle {
  const aggregate = getProjectData();
  const slice = useFinModelStore.getState().operational;
  const { cashOutflows, projectIRR, financing } = slice;
  const adr = slice.hotelHoldSnapshot?.adrValues ?? [];

  const monthlyCashFlow = extractMonthlyNcf(
    projectIRR.monthlyData,
    projectIRR.cumulativeNcfPostFinancingByMonth,
    projectIRR.monthlyCashFlows
  );

  const approvedDebt = resolveApprovedDebtAmount(
    financing,
    aggregate.tdc,
    aggregate.gdv
  );

  const interestRate =
    financing.fixedOrProfitRatePercent ||
    financing.marginPercent + financing.baseRatePercent ||
    financing.interestRate ||
    0;

  const totalTenor = formatTotalLoanTenorDisplay(
    aggregate.constructionPeriod,
    10
  );

  const developmentSchedule: DevelopmentScheduleData =
    buildDevelopmentScheduleData(
      {
        location: aggregate.location,
        assetType: aggregate.assetType,
        segment: aggregate.segment,
        currency: aggregate.currency,
        component1: {
          rooms: aggregate.keys,
          bua: aggregate.bua,
          constructionPeriod: aggregate.constructionPeriod,
          landCost: cashOutflows.landCost || 0,
          constructionCost: cashOutflows.constructionCost || 0,
          softCosts:
            cashOutflows.softCostsTotal ?? cashOutflows.softCosts ?? 0,
          ffe: cashOutflows.ffe || 0,
          powc: cashOutflows.powcTotal ?? cashOutflows.powc ?? 0,
          buildingRate: cashOutflows.buildingRate || 0,
          parkingRate: cashOutflows.parkingRate || 0,
          basementRate: cashOutflows.basementRate || 0,
          buildingBUA: cashOutflows.buildingBUA || 0,
          parkingBUA: cashOutflows.parkingBUA || 0,
        },
        component2: {
          adrYear1: aggregate.adrYear1,
          adrStabilized: aggregate.adrYear3,
          occupancyYear1: aggregate.occYear1,
          occupancyStabilized: aggregate.occYear3,
          adrInflation: adrInflationFromSeries(adr.map(Number)),
          operationalYears: 10,
        },
        component4: {
          tdc: aggregate.tdc,
          gdv: aggregate.gdv,
          projectIRR: aggregate.projectIrr,
          equityIRR: aggregate.equityIrr,
          equityMultiple: aggregate.equityMultiple,
          paybackPeriod: aggregate.paybackYears,
          monthlyCashFlow,
          approvedDebt,
          drawdownType: formatDrawdownLabel(financing),
          idcTreatment: formatIdcTreatment(financing.idcTreatment),
          loanAtCompletion: financing.loanAtCompletion ?? approvedDebt,
          loanType: formatLoanType(financing),
          interestRate,
          totalTenor,
          idcAmount: financing.idcAmount ?? 0,
        },
        aggregate,
      },
      cashOutflows,
      slice.projectInfo
    );

  const bundleForRevenues: FeasibilityProjectBundle = {
    location: aggregate.location,
    assetType: aggregate.assetType,
    segment: aggregate.segment,
    currency: aggregate.currency,
    developmentSchedule,
    component1: {
      rooms: aggregate.keys,
      bua: aggregate.bua,
      constructionPeriod: aggregate.constructionPeriod,
      landCost: cashOutflows.landCost || 0,
      constructionCost: cashOutflows.constructionCost || 0,
      softCosts:
        cashOutflows.softCostsTotal ?? cashOutflows.softCosts ?? 0,
      ffe: cashOutflows.ffe || 0,
      powc: cashOutflows.powcTotal ?? cashOutflows.powc ?? 0,
      buildingRate: cashOutflows.buildingRate || 0,
      parkingRate: cashOutflows.parkingRate || 0,
      basementRate: cashOutflows.basementRate || 0,
      buildingBUA: cashOutflows.buildingBUA || 0,
      parkingBUA: cashOutflows.parkingBUA || 0,
    },
    component2: {
      adrYear1: aggregate.adrYear1,
      adrStabilized: aggregate.adrYear3,
      occupancyYear1: aggregate.occYear1,
      occupancyStabilized: aggregate.occYear3,
      adrInflation: adrInflationFromSeries(adr.map(Number)),
      operationalYears: 10,
    },
    component4: {
      tdc: aggregate.tdc,
      gdv: aggregate.gdv,
      projectIRR: aggregate.projectIrr,
      equityIRR: aggregate.equityIrr,
      equityMultiple: aggregate.equityMultiple,
      paybackPeriod: aggregate.paybackYears,
      monthlyCashFlow,
      approvedDebt,
      drawdownType: formatDrawdownLabel(financing),
      idcTreatment: formatIdcTreatment(financing.idcTreatment),
      loanAtCompletion: financing.loanAtCompletion ?? approvedDebt,
      loanType: formatLoanType(financing),
      interestRate,
      totalTenor,
      idcAmount: financing.idcAmount ?? 0,
    },
    aggregate,
  };

  const operationalRevenues: OperationalRevenuesData =
    buildOperationalRevenuesData(
      bundleForRevenues,
      slice.hotelHoldSnapshot,
      slice.projectInfo
    );

  const operationalExpenses: OperationalExpensesData =
    buildOperationalExpensesData(
      bundleForRevenues,
      slice.hotelHoldSnapshot,
      slice.projectInfo
    );

  const operationalPnl: OperationalPnLData = buildOperationalPnlData(
    bundleForRevenues,
    slice.hotelHoldSnapshot,
    cashOutflows.constructionCost || 0,
    cashOutflows.ffe || 0
  );

  const cashFlowCtx: OperationalCashFlowContext = {
    cashOutflows,
    buildingType: slice.projectInfo.buildingType,
    hotelSnapshot: slice.hotelHoldSnapshot,
    retailSnapshot: slice.retailHoldSnapshot,
    officeSnapshot: slice.officeHoldSnapshot,
    residentialSnapshot: slice.residentialHoldSnapshot,
    retailOpex: slice.projectInfo.retailOpex,
    retailDepreciation: slice.projectInfo.retailDepreciation,
    officeOpex: slice.projectInfo.officeOpex,
    officeDepreciation: slice.projectInfo.officeDepreciation,
    residentialOpex: slice.projectInfo.residentialOpex,
    residentialDepreciation: slice.projectInfo.residentialDepreciation,
    exitCapRate: projectIRR.exitCapRate,
    projectIRR: aggregate.projectIrr,
    equityMultiple: aggregate.equityMultiple,
    paybackPeriod: aggregate.paybackYears,
  };

  const operationalCashFlow: OperationalCashFlowData =
    buildOperationalCashFlowData(bundleForRevenues, cashFlowCtx);

  const termLoanFinancing: TermLoanFinancingData = buildTermLoanFinancingData(
    {
      ...bundleForRevenues,
      operationalCashFlow,
    },
    financing
  );

  const preferenceSharesExitStrategy: PreferenceSharesExitStrategyData =
    buildPreferenceSharesExitStrategyData(
      {
        ...bundleForRevenues,
        operationalPnl,
        operationalCashFlow,
        termLoanFinancing,
      },
      financing
    );

  const postFinancingCashFlow: PostFinancingCashFlowData =
    buildPostFinancingCashFlowData({
      ...bundleForRevenues,
      operationalPnl,
      operationalCashFlow,
      termLoanFinancing,
      preferenceSharesExitStrategy,
    });

  const irrAndFinancingMetrics: IrrAndFinancingMetricsData =
    buildIrrAndFinancingMetricsData({
      ...bundleForRevenues,
      operationalPnl,
      operationalCashFlow,
      termLoanFinancing,
      preferenceSharesExitStrategy,
      postFinancingCashFlow,
    });

  const scenarioComparison: ScenarioComparisonData =
    buildScenarioComparisonData({
      ...bundleForRevenues,
      operationalPnl,
      operationalCashFlow,
      termLoanFinancing,
      preferenceSharesExitStrategy,
      postFinancingCashFlow,
      irrAndFinancingMetrics,
    });

  const scenarioAnalysisResults: ScenarioAnalysisResultsData =
    buildScenarioAnalysisResultsData({
      ...bundleForRevenues,
      operationalPnl,
      operationalCashFlow,
      termLoanFinancing,
      preferenceSharesExitStrategy,
      postFinancingCashFlow,
      irrAndFinancingMetrics,
      scenarioComparison,
    });

  return {
    location: aggregate.location,
    assetType: aggregate.assetType,
    segment: aggregate.segment,
    currency: aggregate.currency,
    developmentSchedule,
    operationalRevenues,
    operationalExpenses,
    operationalPnl,
    operationalCashFlow,
    termLoanFinancing,
    preferenceSharesExitStrategy,
    postFinancingCashFlow,
    irrAndFinancingMetrics,
    scenarioComparison,
    scenarioAnalysisResults,
    component1: {
      rooms: aggregate.keys,
      bua: aggregate.bua,
      constructionPeriod: aggregate.constructionPeriod,
      landCost: cashOutflows.landCost || 0,
      constructionCost: cashOutflows.constructionCost || 0,
      softCosts:
        cashOutflows.softCostsTotal ?? cashOutflows.softCosts ?? 0,
      ffe: cashOutflows.ffe || 0,
      powc: cashOutflows.powcTotal ?? cashOutflows.powc ?? 0,
      buildingRate: cashOutflows.buildingRate || 0,
      parkingRate: cashOutflows.parkingRate || 0,
      basementRate: cashOutflows.basementRate || 0,
      buildingBUA: cashOutflows.buildingBUA || 0,
      parkingBUA: cashOutflows.parkingBUA || 0,
    },
    component2: {
      adrYear1: aggregate.adrYear1,
      adrStabilized: aggregate.adrYear3,
      occupancyYear1: aggregate.occYear1,
      occupancyStabilized: aggregate.occYear3,
      adrInflation: adrInflationFromSeries(adr.map(Number)),
      operationalYears: 10,
    },
    component4: {
      tdc: aggregate.tdc,
      gdv: aggregate.gdv,
      projectIRR: aggregate.projectIrr,
      equityIRR: aggregate.equityIrr,
      equityMultiple: aggregate.equityMultiple,
      paybackPeriod: aggregate.paybackYears,
      monthlyCashFlow,
      approvedDebt,
      drawdownType: formatDrawdownLabel(financing),
      idcTreatment: formatIdcTreatment(financing.idcTreatment),
      loanAtCompletion: financing.loanAtCompletion ?? approvedDebt,
      loanType: formatLoanType(financing),
      interestRate,
      totalTenor,
      idcAmount: financing.idcAmount ?? 0,
    },
    aggregate,
    retailHoldSnapshot: slice.retailHoldSnapshot,
    retailSegment: slice.projectInfo.retailSegment,
    retailPositioning: slice.projectInfo.retailPositioning,
    officeHoldSnapshot: slice.officeHoldSnapshot,
    officeSegment: slice.projectInfo.officeSegment,
    officePositioning: slice.projectInfo.officePositioning,
    residentialHoldSnapshot: slice.residentialHoldSnapshot,
    residentialOpex: slice.projectInfo.residentialOpex,
    residentialDepreciation: slice.projectInfo.residentialDepreciation,
    buildingType: slice.projectInfo.buildingType,
    residentialSegment: slice.projectInfo.residentialSegment,
    residentialPositioning: slice.projectInfo.residentialPositioning,
    residentialFurnishingLevel: slice.projectInfo.residentialFurnishingLevel,
  };
}
