import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SaleFeasibilityBundle } from "@/types/feasibility";
import { buildSaleBundleHashes } from "@/lib/slide-dependencies";
import {
  assertSaleBuaSingleSource,
  buildSaleRevenueSchedule,
  deriveC1SaleBua,
  omitSaleBuaAiFields,
  reconcileSaleBuaState,
  selectSalePanelBua,
  type SaleRevenueCashInflows,
} from "./sale-bua";

function inflows(partial: Partial<SaleRevenueCashInflows> = {}): SaleRevenueCashInflows {
  return {
    saleableBUARatio: 85,
    salesPrice: 500,
    grossSales: 0,
    netProceeds: 0,
    monthlyInflowSchedule: [],
    buyerMix: {
      brokerCommissionPercent: 2,
      vatPercent: 5,
      escrowFeePercent: 1,
      salesDiscountPercent: 3,
    },
    defaultRate: 2,
    bulkSales: { bulkSalesSharePercent: 10, bulkSalesDiscountPercent: 10 },
    salesUptake: { mode: "preset", preset: "even", manualCsv: "" },
    launchTiming: { preLaunchSalesPercent: 10 },
    ...partial,
  };
}

describe("sale BUA single source", () => {
  it("a) Kampung Baru: C1 140,000/119,000 drives panel, report, and GDV", () => {
    const projectInfo = {
      buildingSubType: "residential_high_rise",
      salesHighRiseTotalBUA: 140_000,
      salesHighRiseSaleableRatio: 85,
    };
    const staleOut = {
      buildingBUA: 160_000,
      parkingBUA: 64_000,
      basementBUA: 40_000,
      constructionPeriod: 30,
      fieldSources: { buildingBUA: "default" as const },
    };
    const staleIn = inflows({
      saleableBUARatio: 85,
      salesPrice: 800,
      grossSales: 136_000 * 800,
      netProceeds: 1,
      monthlyInflowSchedule: [{ month: 0, amount: 1 }],
      fieldSources: { saleableBUARatio: "ai" as const },
    });

    const c1 = deriveC1SaleBua(projectInfo);
    const panel = selectSalePanelBua(projectInfo);
    assert.equal(c1.totalBuildingBua, 140_000);
    assert.equal(c1.saleableBua, 119_000);
    assert.deepEqual(panel, c1);

    const legacyReportTotal =
      staleOut.buildingBUA + staleOut.parkingBUA + staleOut.basementBUA;
    assert.equal(legacyReportTotal, 264_000);
    assert.notEqual(c1.totalBuildingBua, legacyReportTotal);

    const reconciled = reconcileSaleBuaState(projectInfo, staleOut, staleIn);
    assert.equal(reconciled.cashOutflows.buildingBUA, 140_000);
    assert.equal(reconciled.bua.saleableBua, 119_000);
    assert.equal(reconciled.cashInflows.grossSales, 119_000 * 800);
    assert.equal(
      reconciled.cashInflows.grossSales,
      reconciled.bua.saleableBua * reconciled.cashInflows.salesPrice
    );

    const tdc = 59_500_000;
    const costPerSaleable = Math.round(tdc / reconciled.bua.saleableBua);
    assert.equal(costPerSaleable, Math.round(tdc / 119_000));
    assert.notEqual(costPerSaleable, Math.round(tdc / 136_000));
  });

  it("b) Seremban: report BUA equals C1 and GDV equals saleable × ASP", () => {
    const projectInfo = {
      buildingSubType: "commercial_strata_office",
      salesHighRiseTotalBUA: 220_000,
      salesHighRiseSaleableRatio: 80,
    };
    const c1 = deriveC1SaleBua(projectInfo);
    const panel = selectSalePanelBua(projectInfo);
    assert.equal(c1.totalBuildingBua, 220_000);
    assert.equal(c1.saleableBua, 176_000);
    assert.deepEqual(panel, c1);

    const asp = 650;
    const revenue = buildSaleRevenueSchedule(
      inflows({ salesPrice: asp, saleableBUARatio: 70 }),
      36,
      c1.saleableBua
    );
    assert.equal(revenue.grossSales, c1.saleableBua * asp);
    assertSaleBuaSingleSource({
      c1Total: c1.totalBuildingBua,
      c2Total: panel.totalBuildingBua,
      reportTotal: c1.totalBuildingBua,
      c1Saleable: c1.saleableBua,
      c2Saleable: panel.saleableBua,
      reportSaleable: c1.saleableBua,
    });
  });

  it("c) editing C1 total after C2 completion recomputes panel and revenue", () => {
    const baseInfo = {
      buildingSubType: "residential_high_rise",
      salesHighRiseTotalBUA: 140_000,
      salesHighRiseSaleableRatio: 85,
    };
    const generated = reconcileSaleBuaState(
      baseInfo,
      { buildingBUA: 140_000, constructionPeriod: 30, fieldSources: {} },
      inflows({
        salesPrice: 900,
        grossSales: 119_000 * 900,
        netProceeds: 1,
        monthlyInflowSchedule: [{ month: 0, amount: 1 }],
      })
    );
    assert.equal(generated.cashInflows.grossSales, 119_000 * 900);

    const edited = reconcileSaleBuaState(
      { ...baseInfo, salesHighRiseTotalBUA: 150_000 },
      generated.cashOutflows,
      generated.cashInflows,
      { c1Authoritative: true }
    );
    const panel = selectSalePanelBua(edited.projectInfo);
    assert.equal(panel.totalBuildingBua, 150_000);
    assert.equal(panel.saleableBua, Math.round(150_000 * 0.85));
    assert.equal(edited.cashOutflows.buildingBUA, 150_000);
    assert.equal(
      edited.cashInflows.grossSales,
      panel.saleableBua * edited.cashInflows.salesPrice
    );
    assert.ok((edited.cashInflows.monthlyInflowSchedule?.length ?? 0) > 1);
  });

  it("d) AI/default copies are replaced; override is kept; AI patches cannot write BUA", () => {
    const projectInfo = {
      buildingSubType: "residential_high_rise",
      salesHighRiseTotalBUA: 140_000,
      salesHighRiseSaleableRatio: 85,
    };
    const fromAi = reconcileSaleBuaState(
      projectInfo,
      {
        buildingBUA: 160_000,
        constructionPeriod: 30,
        fieldSources: { buildingBUA: "ai" },
      },
      inflows({
        saleableBUARatio: 90,
        fieldSources: { saleableBUARatio: "default" },
        grossSales: 1,
        monthlyInflowSchedule: [{ month: 0, amount: 1 }],
      })
    );
    assert.equal(fromAi.projectInfo.salesHighRiseTotalBUA, 140_000);
    assert.equal(fromAi.cashOutflows.buildingBUA, 140_000);
    assert.equal(fromAi.cashInflows.saleableBUARatio, 85);
    assert.equal(fromAi.bua.saleableBua, 119_000);

    const overridden = reconcileSaleBuaState(
      projectInfo,
      {
        buildingBUA: 155_000,
        constructionPeriod: 30,
        fieldSources: { buildingBUA: "override" },
      },
      inflows({
        saleableBUARatio: 90,
        fieldSources: { saleableBUARatio: "override" },
        grossSales: 1,
        monthlyInflowSchedule: [{ month: 0, amount: 1 }],
      })
    );
    assert.equal(overridden.projectInfo.salesHighRiseTotalBUA, 155_000);
    assert.equal(overridden.projectInfo.salesHighRiseSaleableRatio, 90);
    assert.equal(overridden.bua.totalBuildingBua, 155_000);
    assert.equal(overridden.bua.saleableBua, Math.round(155_000 * 0.9));
    assert.equal(selectSalePanelBua(overridden.projectInfo).totalBuildingBua, 155_000);

    const aiPatch = omitSaleBuaAiFields({
      buildingRate: 420,
      buildingBUA: 999_999,
      saleableBUARatio: 50,
      salesHighRiseTotalBUA: 999_999,
      salesPrice: 700,
    });
    assert.equal(aiPatch.buildingRate, 420);
    assert.equal(aiPatch.salesPrice, 700);
    assert.equal("buildingBUA" in aiPatch, false);
    assert.equal("saleableBUARatio" in aiPatch, false);
    assert.equal("salesHighRiseTotalBUA" in aiPatch, false);
  });

  it("throws in dev when C1, panel, and report BUA disagree", () => {
    assert.throws(
      () =>
        assertSaleBuaSingleSource({
          c1Total: 140_000,
          c2Total: 160_000,
          reportTotal: 264_000,
          c1Saleable: 119_000,
          c2Saleable: 136_000,
          reportSaleable: 224_400,
        }),
      /totalBua C1=140000 C2=160000 report=264000/
    );
  });

  it("sale slide cache keys change when BUA changes", () => {
    const base = {
      location: { city: "Kuala Lumpur", country: "Malaysia", coordinates: null },
      assetType: "Residential High-Rise",
      segment: "residential_high_rise",
      currency: "MYR",
      buildingSubType: "residential_high_rise",
      buildingType: "sale",
      component1: {
        rooms: 0,
        bua: 140_000,
        constructionPeriod: 30,
        landCost: 0,
        constructionCost: 0,
        softCosts: 0,
        ffe: 0,
        powc: 0,
        buildingRate: 0,
        parkingRate: 0,
        basementRate: 0,
        buildingBUA: 140_000,
        parkingBUA: 0,
      },
      component2: {
        adrYear1: 0,
        adrStabilized: 0,
        occupancyYear1: 0,
        occupancyStabilized: 0,
        adrInflation: 0,
        operationalYears: 0,
      },
      component4: {
        tdc: 1,
        gdv: 119_000 * 800,
        projectIRR: 0,
        equityIRR: 0,
        equityMultiple: 0,
        paybackPeriod: 0,
        monthlyCashFlow: [],
        approvedDebt: 0,
        drawdownType: "equity-first-gap-fill",
        loanType: "fully-amortizing",
        interestRate: 0,
        totalTenor: "0 years",
        idcAmount: 0,
        loanAtCompletion: 0,
      },
      saleMetrics: {
        totalUnits: 0,
        totalArea: 140_000,
        saleableArea: 119_000,
        avgPricePsf: 800,
        grossSales: 119_000 * 800,
        netProceeds: 0,
        paybackMonth: 0,
        netCashFlow: [],
        cumulativeCashFlow: [],
        monthlyOutflows: [],
        monthlyInflows: [],
        constructionMonths: 30,
        escrowJurisdiction: "Malaysia",
      },
      cashInflows: {
        grossSales: 119_000 * 800,
        netProceeds: 0,
        salesPrice: 800,
        saleableBUARatio: 85,
      },
      financing: {
        approvedCreditFacility: 0,
        loanAtCompletion: 0,
        interestRate: 0,
        amortizationYears: 0,
      },
    } as unknown as SaleFeasibilityBundle;

    const stale = {
      ...base,
      saleMetrics: {
        ...base.saleMetrics,
        totalArea: 264_000,
        saleableArea: 224_400,
      },
    } as SaleFeasibilityBundle;

    const fresh = buildSaleBundleHashes(base);
    const old = buildSaleBundleHashes(stale);
    assert.notEqual(fresh.component2Data, old.component2Data);
    assert.notEqual(fresh.projectInfo, old.projectInfo);
    assert.notEqual(fresh.component1Data, old.component1Data);
  });
});
