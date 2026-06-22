import { buildFinancingEnginePreview } from "@/app/sale/preview/financing/financing-cash-flow-engine-bridge";
import {
  buildSaleCashflowDetailProfile,
  saleDetailToCashflowProfileShape,
} from "@/lib/sale-cash-preview-profile";
import type { FinancingConfig } from "@/lib/sale-financing-engine";
import type { MonthlyRow as EngineMonthlyRow } from "@/lib/financing-engine/generate-cash-flow";
import useFinModelStore from "@/store/useFinModelStore";
import { formatDrawdownLabel } from "@/lib/feasibility/build-term-loan-data";
import type {
  SaleDevelopmentCostsData,
  SaleDevelopmentScheduleData,
  SaleEscrowWithdrawalData,
  SaleFeasibilityBundle,
  SaleIrrMetricsData,
  SalePostFinancingCashFlowData,
  SalePostFinancingMonthlyRow,
  SaleProjectCashFlowData,
  SaleRevolvingCreditData,
  SaleSalesAssumptionsData,
  SaleSalesSummaryTableData,
  SaleSalesUptakeChartData,
  ScenarioAnalysisResultsData,
  ScenarioComparisonData,
} from "@/types/feasibility";
import { getSaleStreamConfig } from "@/lib/feasibility/sale/sale-stream-config";

function resolveSaleEffectiveInterestRate(
  bundle: SaleFeasibilityBundle
): number {
  const f = bundle.financing;
  return f.rateType === "floating"
    ? (f.baseRatePercent || 0) + (f.marginPercent || 0)
    : f.fixedOrProfitRatePercent || 7;
}

function resolveSaleDebtFacilityAmount(bundle: SaleFeasibilityBundle): number {
  const f = bundle.financing;
  const tdc = bundle.cashOutflows.tdc || 0;
  const gdv = bundle.component4.gdv || tdc * 1.2;
  const debtFromLTC = tdc * ((f.loanToCostPercent || 65) / 100);
  const debtFromLTV = gdv * ((f.maxLtvPercent || 60) / 100);
  const approvedDebtAmount = Math.min(debtFromLTC, debtFromLTV);
  return (
    (f.approvedCreditFacility && f.approvedCreditFacility > 0
      ? f.approvedCreditFacility
      : f.debtFacilityAmount && f.debtFacilityAmount > 0
        ? f.debtFacilityAmount
        : approvedDebtAmount) ?? 0
  );
}

function getSaleFinancingEngineRows(
  bundle: SaleFeasibilityBundle
): EngineMonthlyRow[] {
  try {
    const projectInfo = useFinModelStore.getState().sale.projectInfo;
    const { cashOutflows, cashInflows, financing } = bundle;
    const constructionPeriod = cashOutflows.constructionPeriod || 30;
    const detail = buildSaleCashflowDetailProfile(cashOutflows, projectInfo);
    const financingConfig = (financing as { config?: FinancingConfig }).config;
    const preview = buildFinancingEnginePreview({
      projectInfo,
      cashOutflows,
      financing,
      financingConfig,
      outflowProfile: saleDetailToCashflowProfileShape(detail),
      constructionCostSchedule: detail.construction,
      constructionPeriod,
      monthlyInflowSchedule: cashInflows.monthlyInflowSchedule || [],
      finStream: "sale",
      effectiveInterestRatePercent: resolveSaleEffectiveInterestRate(bundle),
      debtFacilityAmount: resolveSaleDebtFacilityAmount(bundle),
      landEquityValue: financing.landEquityValue ?? cashOutflows.landCost ?? 0,
      cashEquityRequired: financing.cashEquityRequired ?? 0,
    });
    return preview.rows ?? [];
  } catch {
    return [];
  }
}

function mapEngineRowToPostFinancing(row: EngineMonthlyRow): SalePostFinancingMonthlyRow {
  return {
    month: row.month,
    escrowReleases: row.escrowReleases || 0,
    progressWithdrawals: row.progressWithdrawal || 0,
    totalOutflows: row.totalOutflowsInclLand || 0,
    netCashFlow: row.ncf || 0,
    loanDrawdown: row.constLoanDrawdown || 0,
    interestPayment: Math.abs(row.constLoanInterest || 0),
    loanRepayment: Math.abs(row.constLoanRepayment || 0),
    commitmentFee: Math.abs(row.constLoanCommitmentFee || 0),
    prefDrawdown: row.prefDrawdown || 0,
    prefDividend: Math.abs(row.prefDividend || 0),
    prefRepayment: Math.abs(row.prefRepayment || 0),
    landInjection: row.capitalLand || 0,
    cashInjection: row.capitalCash || 0,
    ncfAfterLoanEquity: row.ncfAfterFinancing || 0,
  };
}

export function buildSaleDevelopmentCostsData(
  bundle: SaleFeasibilityBundle
): SaleDevelopmentCostsData {
  const co = bundle.cashOutflows;
  const c = bundle.currency;
  const projectInfo = useFinModelStore.getState().sale.projectInfo;
  const detail = buildSaleCashflowDetailProfile(co, projectInfo);

  const buildingAmt = (co.buildingBUA || 0) * (co.buildingRate || 0);
  const parkingAmt = (co.parkingBUA || 0) * (co.parkingRate || 0);
  const basementAmt = (co.basementBUA || 0) * (co.basementRate || 0);
  const bc = projectInfo.buildingConfig;
  const landedSaleable =
    (bc.landedUnits ?? 0) * (bc.landedLandAreaPerUnit ?? 0);
  const landedLandArea =
    landedSaleable > 0 ? landedSaleable / 0.7 : co.landArea || 0;
  const isLanded = projectInfo.buildingSubType?.includes("landed");
  const infraArea = isLanded ? landedLandArea : co.landArea || 0;
  const infraRate = co.infrastructureRate ?? 0;
  const infraAmt = infraArea * infraRate;

  const subtotalBeforeContingency =
    buildingAmt + parkingAmt + basementAmt + infraAmt;
  const contingencyPct = co.contingencyPercent || 0;
  const contingencyAmt =
    subtotalBeforeContingency * (contingencyPct / 100);
  const totalConstruction =
    co.constructionCost || subtotalBeforeContingency + contingencyAmt;
  const softAmt = co.softCostsTotal ?? co.softCosts ?? 0;
  const powcAmt = co.powcTotal ?? co.powc ?? 0;

  const stageSpans: number[] = [];
  let cursor = 0;
  for (const stage of detail.stages) {
    cursor += stage.monthSpan;
    stageSpans.push(cursor);
  }
  const months = bundle.saleMetrics.constructionMonths;
  const stages =
    detail.stages.length > 0
      ? detail.stages.map((s, i) => {
          const end = stageSpans[i] ?? months;
          const start = i === 0 ? 0 : (stageSpans[i - 1] ?? 0);
          return {
            name: s.name,
            period: `M${start}–M${end}`,
          };
        })
      : Array.from({ length: 4 }, (_, i) => {
          const perStage = Math.max(1, Math.round(months / 4));
          const start = i * perStage;
          const end = Math.min(months, (i + 1) * perStage);
          return { name: `Stage ${i + 1}`, period: `M${start}–M${end}` };
        });

  return {
    currency: c,
    constructionCosts: {
      building: {
        bua: co.buildingBUA || 0,
        rate: co.buildingRate || 0,
        amount: buildingAmt,
      },
      parking: {
        bua: co.parkingBUA || 0,
        rate: co.parkingRate || 0,
        amount: parkingAmt,
      },
      basement: {
        bua: co.basementBUA || 0,
        rate: co.basementRate || 0,
        amount: basementAmt,
      },
      infrastructure: {
        area: infraArea,
        rate: infraRate,
        amount: infraAmt,
      },
      contingency: {
        percentage: contingencyPct,
        amount: contingencyAmt,
      },
      softCosts: {
        percentage: co.softCostPercent || 0,
        amount: softAmt,
      },
      powc: {
        percentage: co.powcPercent || 0,
        amount: powcAmt,
      },
      landCosts: {
        area: co.landArea || 0,
        rate: co.landRate || 0,
        amount: co.landCost || 0,
      },
      totalDevelopmentCost: co.tdc || 0,
    },
    constructionPeriod: {
      totalMonths: months,
      stages,
    },
  };
}

export function buildSaleDevelopmentScheduleData(
  bundle: SaleFeasibilityBundle
): SaleDevelopmentScheduleData {
  const co = bundle.cashOutflows;
  const projectInfo = useFinModelStore.getState().sale.projectInfo;
  const detail = buildSaleCashflowDetailProfile(co, projectInfo);

  const monthlyOutflows = detail.months.map((month, i) => ({
    month,
    landCost: i === 0 ? detail.landCost : 0,
    constructionCost: detail.construction[i] ?? 0,
    softCosts: detail.softCostsTotal[i] ?? 0,
    powc: detail.powcTotal[i] ?? 0,
    total: detail.monthlyTotal[i] ?? 0,
    cumulative: detail.cumulative[i] ?? 0,
  }));

  return {
    currency: bundle.currency,
    monthlyOutflows,
    constructionMonths: bundle.saleMetrics.constructionMonths,
  };
}

export function buildSaleSalesUptakeChartData(
  bundle: SaleFeasibilityBundle
): SaleSalesUptakeChartData {
  const ci = bundle.cashInflows;
  const bulkShare = (ci.bulkSales?.bulkSalesSharePercent ?? 0) / 100;

  return {
    currency: bundle.currency,
    monthlyCashInflows: (ci.monthlyInflowSchedule || []).map((p) => ({
      month: p.month,
      unitSales: p.amount * (1 - bulkShare),
      bulkSales: p.amount * bulkShare,
      total: p.amount,
    })),
  };
}

export function buildSaleSalesSummaryTableData(
  bundle: SaleFeasibilityBundle
): SaleSalesSummaryTableData {
  const ci = bundle.cashInflows;
  const m = bundle.saleMetrics;
  const gross = ci.grossSales || 0;
  const net = ci.netProceeds || 0;
  const bm = ci.buyerMix;
  const pp = ci.paymentPlans;

  const brokerCommission = gross * ((bm?.brokerCommissionPercent ?? 0) / 100);
  const vat = gross * ((bm?.vatPercent ?? 0) / 100);
  const escrowFees = gross * ((bm?.escrowFeePercent ?? 0) / 100);
  const salesDiscounts = gross * ((bm?.salesDiscountPercent ?? 0) / 100);
  const defaults = gross * ((ci.defaultRate ?? 0) / 100);
  const bulkSalesDiscount =
    gross *
    ((ci.bulkSales?.bulkSalesSharePercent ?? 0) / 100) *
    ((ci.bulkSales?.bulkSalesDiscountPercent ?? 0) / 100);
  const totalDeductions = gross - net;

  return {
    currency: bundle.currency,
    grossSales: gross,
    totalDeductions,
    netProceeds: net,
    brokerCommission,
    vat,
    escrowFees,
    salesDiscounts,
    defaults,
    bulkSalesDiscount,
    saleableBUARatio: ci.saleableBUARatio || 86,
    averagePrice: m.avgPricePsf,
    buyerMix: `${bm?.cashBuyerPercent ?? 50}% cash / ${bm?.mortgageBuyerPercent ?? 50}% mortgage`,
    launchOffset: ci.launchTiming?.launchMonthOffset ?? 6,
    defaultRate: ci.defaultRate ?? 2,
    cashPlan: `${pp?.cashDownPaymentPercent ?? 0}% down / ${pp?.cashDuringConstructionPercent ?? 0}% during / ${pp?.cashOnHandoverPercent ?? 0}% handover`,
    mortgage: `${pp?.mortgageDownPaymentPercent ?? 0}% down @ ${pp?.mortgageLtvPercent ?? 0}% LTV`,
    deductions: `${bm?.brokerCommissionPercent ?? 0}% broker + ${bm?.vatPercent ?? 0}% VAT + ${bm?.escrowFeePercent ?? 0}% escrow`,
    defaultBulk: `${ci.defaultRate ?? 0}% default / ${ci.bulkSales?.bulkSalesSharePercent ?? 0}% bulk`,
  };
}

/** @deprecated Use buildSaleSalesUptakeChartData + buildSaleSalesSummaryTableData */
export function buildSaleSalesAssumptionsData(
  bundle: SaleFeasibilityBundle
): SaleSalesAssumptionsData {
  const chart = buildSaleSalesUptakeChartData(bundle);
  const summary = buildSaleSalesSummaryTableData(bundle);

  return {
    currency: bundle.currency,
    monthlyInflows: chart.monthlyCashInflows.map((p) => ({
      month: p.month,
      amount: p.total,
    })),
    grossToNet: [
      { label: "Gross Sales", amount: summary.grossSales },
      { label: "Total Deductions", amount: summary.totalDeductions },
      { label: "Net Proceeds", amount: summary.netProceeds },
    ],
    assumptions: [
      { label: "Saleable BUA Ratio", value: `${summary.saleableBUARatio}%` },
      {
        label: "Average Price",
        value: `${summary.averagePrice} ${bundle.currency}/sqft`,
      },
      { label: "Buyer Mix", value: summary.buyerMix },
      { label: "Launch Offset", value: `M${summary.launchOffset}` },
      { label: "Default Rate", value: `${summary.defaultRate}%` },
    ],
  };
}

export function buildSaleProjectCashFlowData(
  bundle: SaleFeasibilityBundle
): SaleProjectCashFlowData {
  return {
    currency: bundle.currency,
    netCashFlow: bundle.saleMetrics.netCashFlow,
    cumulativeCashFlow: bundle.saleMetrics.cumulativeCashFlow,
    paybackMonth: bundle.saleMetrics.paybackMonth,
    projectIRR: bundle.component4.projectIRR,
    equityMultiple: bundle.component4.equityMultiple,
  };
}

export function buildSaleRevolvingCreditData(
  bundle: SaleFeasibilityBundle
): SaleRevolvingCreditData {
  const f = bundle.financing;
  const engineRows = getSaleFinancingEngineRows(bundle);
  const totalConstructionLoanAmount = engineRows.reduce(
    (sum, r) => sum + (r.constLoanDrawdown || 0),
    0
  );
  const constructionMonths = bundle.saleMetrics.constructionMonths;
  const loanTenorMonths = constructionMonths + 1;

  return {
    currency: bundle.currency,
    approvedCreditFacility:
      f.approvedCreditFacility ?? f.debtFacilityAmount ?? bundle.component4.approvedDebt,
    totalConstructionLoanAmount:
      totalConstructionLoanAmount > 0
        ? totalConstructionLoanAmount
        : f.loanAtCompletion ?? bundle.component4.loanAtCompletion,
    loanDrawdown: formatDrawdownLabel(f),
    idcTreatment: f.idcTreatment,
    capitalizedIDC: f.idcAmount ?? 0,
    loanAtCompletion: f.loanAtCompletion ?? bundle.component4.loanAtCompletion,
    interestRate: resolveSaleEffectiveInterestRate(bundle),
    loanTenorMonths,
  };
}

export function buildSaleEscrowWithdrawalData(
  bundle: SaleFeasibilityBundle
): SaleEscrowWithdrawalData {
  const f = bundle.financing;
  const ec = f.escrowConfig;
  const jurisdiction = bundle.saleMetrics.escrowJurisdiction;
  const c = bundle.currency;

  const malaysiaSchedule = [
    { stage: "Stage 1", milestone: "SPA Signing", withdrawalPercent: "10%", sCurveTrigger: "Monthly" },
    { stage: "2a", milestone: "Foundation Works", withdrawalPercent: "10%", sCurveTrigger: "≥ 15%" },
    { stage: "2b", milestone: "RC Framework", withdrawalPercent: "15%", sCurveTrigger: "≥ 30%" },
    { stage: "2c", milestone: "Walls & Frames", withdrawalPercent: "10%", sCurveTrigger: "≥ 45%" },
    { stage: "2d", milestone: "M&E Rough-ins", withdrawalPercent: "10%", sCurveTrigger: "≥ 60%" },
    { stage: "2e", milestone: "Plastering", withdrawalPercent: "10%", sCurveTrigger: "≥ 75%" },
    { stage: "2f/2g", milestone: "Sewerage & Drains", withdrawalPercent: "10%", sCurveTrigger: "≥ 90%" },
    { stage: "4", milestone: "Completion", withdrawalPercent: "2.5%", sCurveTrigger: "100%" },
    { stage: "5", milestone: "Retention", withdrawalPercent: "5%", sCurveTrigger: "Post-VP" },
  ];

  return {
    currency: c,
    jurisdiction,
    uaeConfig: {
      certificationInterval: `${ec?.uaeSa?.certificationInterval ?? 3} months`,
      retentionPercentage: ec?.uaeSa?.retentionPercentage ?? 5,
      releaseTiming: "Practical completion + defect liability",
      illustrativeRetention: fmtPct(ec?.uaeSa?.retentionPercentage ?? 5, bundle.component4.gdv),
      setupFee: f.escrowSetupFee ?? 0,
      managementFee: f.escrowManagementFeePct ?? 0,
    },
    malaysiaConfig: {
      hdaDeposit: `${ec?.malaysia?.hdaDepositPct ?? f.hdaDepositPct ?? 3}% of construction costs`,
      propertyType: ec?.malaysia?.propertyType ?? "HIGH_RISE",
      withdrawalSchedule: malaysiaSchedule,
      retentionRelease: {
        firstRelease: `VP + ${ec?.malaysia?.retentionFirstReleaseMonths ?? 8} months`,
        finalRelease: `VP + ${ec?.malaysia?.retentionFinalReleaseMonths ?? 24} months`,
      },
      illustrativeRetention: fmtPct(5, bundle.component4.gdv),
      releaseTiming: "Schedule H milestones",
      setupFee: f.escrowSetupFee ?? 0,
      managementFee: f.escrowManagementFeePct ?? 0,
    },
    australiaConfig: {
      purchaseDeposit: ec?.australia?.depositPct ?? 10,
      balancePayment: ec?.australia?.balancePct ?? 90,
      illustrativeRetention: fmtPct(5, bundle.component4.gdv),
      releaseTiming: "Settlement / completion",
      setupFee: f.escrowSetupFee ?? 0,
      managementFee: f.escrowManagementFeePct ?? 0,
    },
  };
}

function fmtPct(pct: number, base: number): string {
  return `${Math.round(base * (pct / 100)).toLocaleString()}`;
}

export function buildSalePostFinancingCashFlowData(
  bundle: SaleFeasibilityBundle
): SalePostFinancingCashFlowData {
  const engineRows = getSaleFinancingEngineRows(bundle);
  const monthlyCashFlows =
    engineRows.length > 0
      ? engineRows.map(mapEngineRowToPostFinancing)
      : bundle.saleMetrics.netCashFlow.map((ncf, month) => ({
          month,
          escrowReleases: bundle.saleMetrics.monthlyInflows[month] ?? 0,
          progressWithdrawals: 0,
          totalOutflows: bundle.saleMetrics.monthlyOutflows[month] ?? 0,
          netCashFlow: ncf,
          loanDrawdown: 0,
          interestPayment: 0,
          loanRepayment: 0,
          commitmentFee: 0,
          prefDrawdown: 0,
          prefDividend: 0,
          prefRepayment: 0,
          landInjection: month === 0 ? bundle.cashOutflows.landCost ?? 0 : 0,
          cashInjection: 0,
          ncfAfterLoanEquity: ncf,
        }));

  return {
    currency: bundle.currency,
    monthlyCashFlows,
    constructionMonths: bundle.saleMetrics.constructionMonths,
  };
}

export function buildSaleIrrMetricsData(
  bundle: SaleFeasibilityBundle
): SaleIrrMetricsData {
  const minDscr =
    bundle.financing.dscrProfile?.length
      ? Math.min(
          ...bundle.financing.dscrProfile
            .map((d) => d.dscr)
            .filter((v) => v > 0)
        )
      : 0;

  return {
    currency: bundle.currency,
    projectIRR: bundle.component4.projectIRR,
    equityIRR: bundle.component4.equityIRR,
    equityMultiple: bundle.component4.equityMultiple,
    paybackMonth: bundle.saleMetrics.paybackMonth,
    minDSCR: Math.round(minDscr * 100) / 100,
    tdc: bundle.component4.tdc,
    loanAtCompletion: bundle.component4.loanAtCompletion,
  };
}

export function buildSaleScenarioComparisonData(
  bundle: SaleFeasibilityBundle
): ScenarioComparisonData {
  const base = bundle.component4;
  const pbYears = Math.round((bundle.saleMetrics.paybackMonth / 12) * 10) / 10;
  return {
    shocks: [
      "Sales Price (-10%)",
      "Sales Velocity (-20%)",
      "Construction Cost (+15%)",
      "Construction Duration (+6 months)",
      "Interest Rate (+200 bps)",
    ],
    comparison: [
      {
        metric: "Unlevered IRR",
        base: base.projectIRR,
        downside: Math.round(base.projectIRR * 0.75 * 10) / 10,
        upside: Math.round(base.projectIRR * 1.15 * 10) / 10,
        format: "percent",
      },
      {
        metric: "Levered Equity IRR",
        base: base.equityIRR,
        downside: Math.round(base.equityIRR * 0.7 * 10) / 10,
        upside: Math.round(base.equityIRR * 1.2 * 10) / 10,
        format: "percent",
      },
      {
        metric: "Equity Multiple",
        base: base.equityMultiple,
        downside: Math.round(base.equityMultiple * 0.85 * 100) / 100,
        upside: Math.round(base.equityMultiple * 1.1 * 100) / 100,
        format: "multiple",
      },
      {
        metric: "Payback Period",
        base: pbYears,
        downside: Math.round((pbYears + 0.5) * 10) / 10,
        upside: Math.max(0, Math.round((pbYears - 0.25) * 10) / 10),
        format: "years",
      },
    ],
    tornadoData: [
      { factor: "Sales Price", low: base.projectIRR * 0.8, high: base.projectIRR * 1.12 },
      { factor: "Sales Velocity", low: base.projectIRR * 0.85, high: base.projectIRR * 1.08 },
      { factor: "Construction Cost", low: base.projectIRR * 1.05, high: base.projectIRR * 0.78 },
      { factor: "Interest Rate", low: base.projectIRR * 1.02, high: base.projectIRR * 0.88 },
    ],
  };
}

export function buildSaleScenarioResultsData(
  bundle: SaleFeasibilityBundle
): ScenarioAnalysisResultsData {
  const c4 = bundle.component4;
  const config = getSaleStreamConfig(bundle.buildingSubType);
  const margin = c4.gdv - c4.tdc;
  const pbYears = Math.round((bundle.saleMetrics.paybackMonth / 12) * 10) / 10;
  const keyAssumptions = {
    revenueDriver: `Avg. selling price ${bundle.currency} ${bundle.saleMetrics.avgPricePsf}/sqft`,
    occupancyDriver: "Sales velocity / absorption rate",
    constructionCostVariance: "±15% hard cost stress",
    exitCapRate: "N/A (sale stream)",
    labels: {
      revenue: "Sales Price (psf)",
      occupancy: "Sales Velocity",
    },
  };
  const scenario = (
    name: string,
    irrMul: number,
    eqMul: number,
    emMul: number,
    npvMul: number
  ) => ({
    name,
    projectIRR: Math.round(c4.projectIRR * irrMul * 10) / 10,
    equityIRR: Math.round(c4.equityIRR * eqMul * 10) / 10,
    equityMultiple: Math.round(c4.equityMultiple * emMul * 100) / 100,
    npv: Math.round(margin * npvMul),
    paybackPeriod: Math.round(pbYears * (name === "Downside" ? 1.15 : name === "Upside" ? 0.9 : 1) * 10) / 10,
    keyAssumptions,
  });

  return {
    assetType: config.assetLabel,
    currency: bundle.currency,
    location: bundle.location,
    scenarios: [
      scenario("Base Case", 1, 1, 1, 0.85),
      scenario("Downside", 0.75, 0.7, 0.85, 0.55),
      scenario("Upside", 1.15, 1.2, 1.1, 1.05),
    ],
  };
}

export function isSaleDevelopmentCostsData(d: unknown): d is SaleDevelopmentCostsData {
  return (
    !!d &&
    typeof d === "object" &&
    typeof (d as SaleDevelopmentCostsData).constructionCosts === "object"
  );
}

export function isSaleDevelopmentScheduleData(d: unknown): d is SaleDevelopmentScheduleData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as SaleDevelopmentScheduleData).monthlyOutflows)
  );
}

export function isSaleSalesUptakeChartData(d: unknown): d is SaleSalesUptakeChartData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as SaleSalesUptakeChartData).monthlyCashInflows)
  );
}

export function isSaleSalesSummaryTableData(d: unknown): d is SaleSalesSummaryTableData {
  return (
    !!d &&
    typeof d === "object" &&
    typeof (d as SaleSalesSummaryTableData).grossSales === "number"
  );
}

export function isSaleSalesAssumptionsData(d: unknown): d is SaleSalesAssumptionsData {
  return !!d && typeof d === "object" && Array.isArray((d as SaleSalesAssumptionsData).grossToNet);
}

export function isSaleProjectCashFlowData(d: unknown): d is SaleProjectCashFlowData {
  return !!d && typeof d === "object" && Array.isArray((d as SaleProjectCashFlowData).netCashFlow);
}

export function isSaleRevolvingCreditData(d: unknown): d is SaleRevolvingCreditData {
  return !!d && typeof d === "object" && typeof (d as SaleRevolvingCreditData).approvedCreditFacility === "number";
}

export function isSaleEscrowWithdrawalData(d: unknown): d is SaleEscrowWithdrawalData {
  return !!d && typeof d === "object" && typeof (d as SaleEscrowWithdrawalData).jurisdiction === "string";
}

export function isSalePostFinancingCashFlowData(d: unknown): d is SalePostFinancingCashFlowData {
  return !!d && typeof d === "object" && Array.isArray((d as SalePostFinancingCashFlowData).monthlyCashFlows);
}

export function isSaleIrrMetricsData(d: unknown): d is SaleIrrMetricsData {
  return !!d && typeof d === "object" && typeof (d as SaleIrrMetricsData).projectIRR === "number";
}
