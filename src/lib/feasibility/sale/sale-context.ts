import useFinModelStore, {
  type CashInflows,
  type CashOutflows,
  type Financing,
  type ProjectInfo,
} from "@/store/useFinModelStore";
import { buildSaleCashflowDetailProfile } from "@/lib/sale-cash-preview-profile";
import { solveAnnualIRR, type CashFlowPoint } from "@/lib/irr-calculations";
import {
  resolveComponent4EquityHeadlines,
  resolveLeveredEquityIrrPctFromFinModelStore,
  resolveUnleveredProjectIrrPct,
} from "@/lib/scenario-irr-calculation";
import { formatDrawdownLabel } from "@/lib/feasibility/build-term-loan-data";
import { getSaleStreamConfig } from "@/lib/feasibility/sale/sale-stream-config";
import type { SaleFeasibilityBundle } from "@/types/feasibility";

function formatToken(id?: string): string {
  if (!id?.trim()) return "";
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function resolveSaleTitleProfile(
  projectInfo: ProjectInfo,
  config: ReturnType<typeof getSaleStreamConfig>
) {
  const starRaw = projectInfo.hotelStarRating?.trim();
  const starRating = starRaw ? `${starRaw}-Star` : undefined;
  const businessType = formatToken(projectInfo.hotelOperatingType) || undefined;
  const assetType = config.assetLabel;
  const titleParts = [starRating, businessType, assetType].filter(Boolean);
  return {
    assetType,
    starRating: starRating ?? "—",
    businessType,
    saleAssetLabel: titleParts.join(" ") || assetType,
  };
}

function totalBua(co: CashOutflows): number {
  return (co.buildingBUA || 0) + (co.parkingBUA || 0) + (co.basementBUA || 0);
}

function saleableArea(co: CashOutflows, ci: CashInflows): number {
  const bua = totalBua(co);
  return Math.round(bua * ((ci.saleableBUARatio || 86) / 100));
}

function escrowJurisdictionLabel(
  projectInfo: ProjectInfo,
  financing: Financing
): string {
  const mode = financing.escrowConfig?.withdrawalMode;
  if (mode === "malaysia") return "Malaysia";
  if (mode === "australia") return "Australia";
  if (mode === "uae") return "UAE";
  const cc = (projectInfo.countryCode ?? projectInfo.country ?? "").toUpperCase();
  if (cc === "MY" || cc.includes("MALAYSIA")) return "Malaysia";
  if (cc === "AU" || cc.includes("AUSTRALIA")) return "Australia";
  if (cc === "UAE" || cc.includes("EMIRATES")) return "UAE";
  return "UAE";
}

export function getSaleFeasibilityBundle(): SaleFeasibilityBundle {
  const slice = useFinModelStore.getState().sale;
  const { projectInfo, cashOutflows, cashInflows, financing, projectIRR, financingMetrics } =
    slice;

  const component4Headlines = resolveComponent4EquityHeadlines({
    financingMetrics,
    projectIRR,
  });

  const tdc = cashOutflows.tdc || 0;
  const gdv = cashInflows.grossSales || financingMetrics?.netExitProceeds || tdc * 1.2;
  const config = getSaleStreamConfig(projectInfo.buildingSubType);
  const detail = buildSaleCashflowDetailProfile(cashOutflows, projectInfo);
  const constructionMonths = cashOutflows.constructionPeriod || 30;
  const postCompletionBuffer = 6;

  const inflowByMonth = new Map<number, number>();
  for (const p of cashInflows.monthlyInflowSchedule || []) {
    inflowByMonth.set(p.month, (inflowByMonth.get(p.month) ?? 0) + (p.amount || 0));
  }

  const irrHorizon = constructionMonths + postCompletionBuffer;
  const irrFlows: CashFlowPoint[] = [];
  for (let m = 0; m <= irrHorizon; m++) {
    irrFlows.push({
      month: m,
      amount: (inflowByMonth.get(m) ?? 0) - (detail.monthlyTotal[m] ?? 0),
    });
  }
  const solvedUnlevered = solveAnnualIRR(irrFlows, 1e-7, 100);
  const computedUnleveredPct =
    solvedUnlevered.annualIRR != null ? solvedUnlevered.annualIRR * 100 : null;
  const projectIRRPercent =
    computedUnleveredPct ??
    resolveUnleveredProjectIrrPct(projectIRR, useFinModelStore.getState().projectIRR) ??
    0;
  const equityIRRPercent =
    resolveLeveredEquityIrrPctFromFinModelStore({ financingMetrics, projectIRR }) ??
    component4Headlines.leveredIrrPct ??
    0;
  const horizon = constructionMonths + postCompletionBuffer;
  const netCashFlow: number[] = [];
  const cumulativeCashFlow: number[] = [];
  let cumulative = 0;
  for (let m = 0; m <= horizon; m++) {
    const net = irrFlows[m]?.amount ?? 0;
    cumulative += net;
    netCashFlow.push(net);
    cumulativeCashFlow.push(cumulative);
  }

  const paybackMonth =
    financingMetrics?.equityPayback ??
    netCashFlow.findIndex((_, i) => cumulativeCashFlow[i]! >= 0);

  const city = projectInfo.city?.trim() || "Dubai";
  const country = projectInfo.country?.trim() || "UAE";
  const currency = projectInfo.currency || "AED";
  const totalUnits = projectInfo.buildingConfig?.landedUnits ?? 0;

  return {
    stream: "sale",
    location: { city, country },
    assetType: config.assetLabel,
    segment: projectInfo.buildingSubType ?? "sale",
    currency,
    buildingSubType: projectInfo.buildingSubType,
    buildingType: projectInfo.buildingType,
    saleConfigKey: config.assetLabel,
    component1: {
      rooms: 0,
      bua: totalBua(cashOutflows),
      constructionPeriod: constructionMonths,
      landCost: cashOutflows.landCost || 0,
      constructionCost: cashOutflows.constructionCost || 0,
      softCosts: cashOutflows.softCostsTotal ?? cashOutflows.softCosts ?? 0,
      ffe: 0,
      powc: cashOutflows.powcTotal ?? cashOutflows.powc ?? 0,
      buildingRate: cashOutflows.buildingRate || 0,
      parkingRate: cashOutflows.parkingRate || 0,
      basementRate: cashOutflows.basementRate || 0,
      buildingBUA: cashOutflows.buildingBUA || 0,
      parkingBUA: cashOutflows.parkingBUA || 0,
    },
    component2: {
      adrYear1: 0,
      adrStabilized: 0,
      occupancyYear1: 0,
      occupancyStabilized: 0,
      adrInflation: 0,
      operationalYears: 10,
    },
    component4: {
      tdc,
      gdv,
      projectIRR: Math.round(projectIRRPercent * 100) / 100,
      equityIRR: Math.round(equityIRRPercent * 100) / 100,
      equityMultiple: Math.round((component4Headlines.equityMultiple || 0) * 100) / 100,
      paybackPeriod: paybackMonth >= 0 ? Math.round((paybackMonth / 12) * 10) / 10 : 0,
      monthlyCashFlow: netCashFlow,
      approvedDebt: financing.approvedCreditFacility ?? financing.debtFacilityAmount ?? 0,
      drawdownType: financing.drawdownModel ?? "equity-first-gap-fill",
      idcTreatment: financing.idcTreatment,
      loanAtCompletion: financing.loanAtCompletion ?? 0,
      loanType: financing.repaymentStructure ?? "fully-amortizing",
      interestRate: financing.fixedOrProfitRatePercent || financing.interestRate || 0,
      totalTenor: `${financing.amortizationYears || 0} years`,
      idcAmount: financing.idcAmount ?? 0,
    },
    aggregate: {
      location: { city, country },
      assetType: config.assetLabel,
      segment: projectInfo.buildingSubType ?? "sale",
      positioning: config.assetLabel,
      starRating: "—",
      currency,
      keys: totalUnits,
      bua: totalBua(cashOutflows),
      constructionPeriod: constructionMonths,
      tdc,
      gdv,
      projectIrr: Math.round(projectIRRPercent * 100) / 100,
      equityIrr: Math.round(equityIRRPercent * 100) / 100,
      equityMultiple: Math.round((component4Headlines.equityMultiple || 0) * 100) / 100,
      paybackYears: paybackMonth >= 0 ? Math.round((paybackMonth / 12) * 10) / 10 : 0,
      netProfitMargin: gdv > 0 ? Math.round(((gdv - tdc) / gdv) * 1000) / 10 : 0,
      adrYear1: 0,
      adrYear3: 0,
      occYear1: 0,
      occYear3: 0,
      revenueByYear: [],
      ebitdaByYear: [],
      netIncomeByYear: [],
    },
    saleMetrics: {
      totalUnits,
      totalArea: totalBua(cashOutflows),
      saleableArea: saleableArea(cashOutflows, cashInflows),
      avgPricePsf: cashInflows.salesPrice || 0,
      grossSales: cashInflows.grossSales || 0,
      netProceeds: cashInflows.netProceeds || 0,
      paybackMonth: paybackMonth >= 0 ? paybackMonth : 0,
      netCashFlow,
      cumulativeCashFlow,
      monthlyOutflows: detail.monthlyTotal,
      monthlyInflows: Array.from({ length: horizon + 1 }, (_, m) => inflowByMonth.get(m) ?? 0),
      constructionMonths,
      escrowJurisdiction: escrowJurisdictionLabel(projectInfo, financing),
    },
    cashOutflows,
    cashInflows,
    financing,
    projectIRR,
    financingMetrics,
    titleProfile: resolveSaleTitleProfile(projectInfo, config),
  };
}

export { resolveSaleTitleProfile };

export function fmtSaleMoney(
  amount: number,
  currency: string,
  compact = false
): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}
