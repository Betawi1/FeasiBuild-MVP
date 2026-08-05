import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import type {
  FeasibilityProjectBundle,
  ImplicationsData,
  OfficeOperationalExpensesData,
  OfficeOperationalPnLData,
  OfficeOperationalRevenuesData,
  RetailCompetitiveLandscapeData,
  RetailMarketMetricsData,
  RetailMarketOverviewData,
  RetailMarketSummaryData,
  RetailSupplyPipelineData,
  RetailTenantProfileData,
  RiskFactorsData,
  SuccessFactorsData,
  WarehouseDevelopmentAssumptionsData,
} from "@/types/feasibility";
import { getWarehouseContext } from "@/lib/feasibility/warehouse-context";
import {
  resolveWarehouseCapexBases,
  resolveWarehousePnlSeries,
} from "@/lib/warehouse-pnl-series";
import useFinModelStore from "@/store/useFinModelStore";

const PNL_YEARS = OPERATIONAL_ROOM_REVENUE_YEARS;

function padYearSeries(source: number[] | undefined): number[] {
  return Array.from({ length: PNL_YEARS }, (_, i) => source?.[i] ?? 0);
}

export type {
  WarehouseCostBreakdownRow,
  WarehouseDevelopmentAssumptionsData,
} from "@/types/feasibility";

export function buildWarehouseMarketOverviewData(
  bundle: FeasibilityProjectBundle
): RetailMarketOverviewData {
  const ctx = getWarehouseContext(bundle);
  return {
    demandDrivers: [
      `E-commerce and 3PL absorption in ${ctx.city}`,
      `Nearshoring / supply-chain resilience for ${ctx.country}`,
      `Flight-to-quality toward ${ctx.qualityGrade.toLowerCase()} industrial specs`,
      `Limited modern ${ctx.warehouseSubType.toLowerCase()} supply in catchment`,
    ],
    catchmentHighlights: [
      `${ctx.city} logistics corridor and highway connectivity`,
      `Proximity to consumption centers and ports/air cargo where relevant`,
      `Occupier mix skewed to fulfillment, distribution, and light manufacturing`,
    ],
  };
}

export function buildWarehouseMarketMetricsData(
  bundle: FeasibilityProjectBundle
): RetailMarketMetricsData {
  const ctx = getWarehouseContext(bundle);
  const chartData = ["2019", "2020", "2021", "2022", "2023", "2024E", "2025E"].map(
    (year, i) => ({
      year,
      footfall: Math.round(8 + i * 0.6),
      salesPsf: Math.round(ctx.baseRentYear1 * 0.92 + i * 0.35),
      occupancy: Math.round(
        Math.min(96, ctx.stabilizedOccupancy - 8 + i * 1.1)
      ),
    })
  );
  return {
    chartData,
    footfallCagr: "4.2%",
    salesPsfCagr: "3.0%",
    occupancyLatest: `${chartData.at(-2)?.occupancy ?? ctx.stabilizedOccupancy}%`,
  };
}

export function buildWarehouseSupplyPipelineData(
  bundle: FeasibilityProjectBundle
): RetailSupplyPipelineData {
  const ctx = getWarehouseContext(bundle);
  const existing = Math.max(Math.round(ctx.warehouseBua * 40), 1);
  const chartData = [
    { year: "2021", existingGla: existing * 0.93, pipelineGla: existing * 0.05 },
    { year: "2022", existingGla: existing * 0.95, pipelineGla: existing * 0.06 },
    { year: "2023", existingGla: existing * 0.97, pipelineGla: existing * 0.07 },
    { year: "2024E", existingGla: existing, pipelineGla: existing * 0.08 },
    { year: "2025E", existingGla: existing * 1.03, pipelineGla: existing * 0.06 },
    { year: "2026E", existingGla: existing * 1.05, pipelineGla: existing * 0.05 },
  ];
  return {
    chartData,
    existingStockSqft: existing,
    pipelineSqft: Math.round(existing * 0.08),
    subjectSharePct:
      existing > 0
        ? `${((ctx.warehouseBua / existing) * 100).toFixed(1)}%`
        : "—",
  };
}

export function buildWarehouseCompetitiveLandscapeData(
  bundle: FeasibilityProjectBundle
): RetailCompetitiveLandscapeData {
  const ctx = getWarehouseContext(bundle);
  const c = ctx.currency;
  const rent = ctx.baseRentYear1;
  const occ = ctx.stabilizedOccupancy;

  return {
    // Field name is legacy ("malls") but UI renders any competitive set rows.
    benchmarkMalls: [
      {
        name: `${ctx.city} Logistics Park A`,
        gla: `${Math.round(ctx.warehouseBua * 1.4).toLocaleString()} sqft`,
        occupancy: `${Math.min(98, occ + 2)}%`,
        baseRent: `${c} ${(rent * 1.05).toFixed(1)}/sqft`,
        positioning: `${ctx.qualityGrade} Industrial`,
      },
      {
        name: `${ctx.city} Industrial Estate B`,
        gla: `${Math.round(ctx.warehouseBua * 0.9).toLocaleString()} sqft`,
        occupancy: `${Math.max(70, occ - 5)}%`,
        baseRent: `${c} ${(rent * 0.92).toFixed(1)}/sqft`,
        positioning: "Grade B Industrial",
      },
      {
        name: `${ctx.city} Fulfillment Hub C`,
        gla: `${Math.round(ctx.warehouseBua * 1.15).toLocaleString()} sqft`,
        occupancy: `${Math.min(96, occ + 1)}%`,
        baseRent: `${c} ${(rent * 1.02).toFixed(1)}/sqft`,
        positioning: `${ctx.qualityGrade} Logistics`,
      },
      {
        name: "Subject Asset",
        gla: `${ctx.warehouseBua.toLocaleString()} sqft`,
        occupancy: `${occ}%`,
        baseRent: `${c} ${rent}/sqft`,
        positioning: `${ctx.qualityGrade} ${ctx.warehouseSubType}`,
      },
    ],
    avgOccupancy: `${occ}%`,
    avgBaseRent: `${c} ${rent}/sqft`,
  };
}

export function buildWarehouseTenantProfileData(
  bundle: FeasibilityProjectBundle
): RetailTenantProfileData {
  const ctx = getWarehouseContext(bundle);
  return {
    tenantMix: [
      { category: "3PL / Contract Logistics", sharePct: 35 },
      { category: "E-commerce Fulfillment", sharePct: 25 },
      {
        category: ctx.warehouseSubType.toLowerCase().includes("cold")
          ? "Cold-chain / Food Distribution"
          : "Regional Distribution",
        sharePct: 20,
      },
      { category: "Light Manufacturing", sharePct: 12 },
      { category: "Other Industrial", sharePct: 8 },
    ],
    catchmentRadius: `${ctx.city} logistics corridor (highway-served)`,
    primaryDemographics: [
      `Occupiers prioritizing ${ctx.qualityGrade.toLowerCase()} clear height and dock capacity`,
      "Lease structures typically NNN with CAM recoveries",
      "Credit tenants seeking multi-year WALE",
    ],
    waleYears: 5,
  };
}

export function buildWarehouseMarketSummaryData(
  bundle: FeasibilityProjectBundle
): RetailMarketSummaryData {
  const ctx = getWarehouseContext(bundle);
  return {
    marketOverview: [
      `Structural logistics demand supports ${ctx.qualityGrade.toLowerCase()} ${ctx.warehouseSubType.toLowerCase()} product in ${ctx.city}.`,
      `Modern industrial stock remains preferred versus older sheds.`,
    ],
    supplyDemand: [
      `Underwriting rent of ${ctx.currency} ${ctx.baseRentYear1}/sqft is consistent with competitive modern stock.`,
      `Lease-up to ${ctx.stabilizedOccupancy}% over ${ctx.leaseUpYears} years is achievable under base case absorption.`,
    ],
    competitivePosition: [
      `${ctx.qualityGrade} specifications differentiate the subject versus older stock.`,
      `Yard depth and parking provision support 3PL and fulfillment operations.`,
    ],
    investmentThesis: [
      `Pre-leasing and specification delivery are critical path items.`,
      `Project IRR of ${ctx.projectIRR}% frames the investment case.`,
    ],
  };
}

export function buildWarehouseImplicationsData(
  bundle: FeasibilityProjectBundle
): ImplicationsData {
  const ctx = getWarehouseContext(bundle);
  return {
    hospitalityImplications: [
      {
        number: 1,
        title: "Logistics demand",
        description: `Structural demand supports lease-up to ${ctx.stabilizedOccupancy}% stabilized occupancy.`,
      },
      {
        number: 2,
        title: "Flight-to-quality",
        description: `${ctx.qualityGrade} product differentiates versus older industrial stock.`,
      },
      {
        number: 3,
        title: "Rent positioning",
        description: `Base rent of ${ctx.currency} ${ctx.baseRentYear1}/sqft aligns with modern logistics benchmarks.`,
      },
      {
        number: 4,
        title: "Ancillary income",
        description: "Yard and parking income diversify cash flow beyond base rent.",
      },
      {
        number: 5,
        title: "Supply discipline",
        description: "Measured new supply supports rent escalation assumptions in the model.",
      },
    ],
    keyTakeaways: [
      `Investment case delivers ${ctx.projectIRR}% project IRR.`,
      `${ctx.warehouseBua.toLocaleString()} sqft BUA underwrites institutional logistics demand.`,
    ],
  };
}

export function buildWarehouseSuccessFactorsData(
  bundle: FeasibilityProjectBundle
): SuccessFactorsData {
  const ctx = getWarehouseContext(bundle);
  return {
    marketOpportunities: [
      {
        factor: "Structural e-commerce / 3PL demand",
        effect: `Supports absorption toward ${ctx.stabilizedOccupancy}% occupancy in ${ctx.city}`,
      },
      {
        factor: "Limited modern industrial supply",
        effect: "Supports rent growth and pre-leasing velocity",
      },
    ],
    projectStrengths: [
      {
        strength: "Strategic logistics location",
        effect: `Highway connectivity into ${ctx.city} supports tenant attraction`,
      },
      {
        strength: `${ctx.qualityGrade} building specifications`,
        effect:
          "Clear height, docks, and ESG features drive flight-to-quality leasing",
      },
    ],
    mainOutcomes: [
      "Institutional-grade logistics asset with diversified income",
      `Target project IRR ${ctx.projectIRR}%`,
    ],
  };
}

export function buildWarehouseRiskFactorsData(
  _bundle: FeasibilityProjectBundle
): RiskFactorsData {
  return {
    marketThreats: [
      {
        risk: "Logistics market slowdown",
        effect: "Could extend lease-up and compress rents",
        mitigatingFactors: [
          "Flexible lease-up phasing",
          "Early pre-leasing focus",
        ],
      },
      {
        risk: "Tenant concentration (e-commerce / 3PL)",
        effect: "Cyclical absorption risk if sector demand softens",
        mitigatingFactors: [
          "Diversified tenant mix",
          "Credit underwriting standards",
        ],
      },
    ],
    projectWeaknesses: [
      {
        weakness: "Construction cost inflation",
        effect: "May erode development margin if not contractually managed",
        mitigatingFactors: [
          "Fixed-price contracts",
          "Contingency within TDC",
        ],
      },
    ],
  };
}

export function buildWarehouseDevelopmentAssumptionsData(
  bundle: FeasibilityProjectBundle
): WarehouseDevelopmentAssumptionsData {
  const ctx = getWarehouseContext(bundle);
  const cashOutflows = useFinModelStore.getState().operational.cashOutflows;
  const warehouseConfig = cashOutflows.warehouseConfig;
  const industrialParkConfig = cashOutflows.industrialParkConfig;
  const warehouseCosts = cashOutflows.warehouseCosts;
  const isPark = cashOutflows.developmentType === "INDUSTRIAL_PARK";
  const units = Math.max(1, industrialParkConfig?.numberOfWarehouses || 1);

  const totalGfa =
    (isPark
      ? (warehouseConfig?.totalBua || 0) * units ||
        industrialParkConfig?.warehouseMix.reduce(
          (s, w) => s + (w.size || 0),
          0
        ) ||
        0
      : warehouseConfig?.totalBua || 0) || ctx.warehouseBua;

  const buildingCost = warehouseCosts?.buildingShellCost || 0;
  const siteYardCost = warehouseCosts?.siteYardWorksCost || 0;
  const commonInfraCost = isPark
    ? warehouseCosts?.commonInfrastructureCost || 0
    : 0;
  const loadingCost = warehouseCosts?.loadingAccessCost || 0;
  const specialisedCost = warehouseCosts?.specialisedSystemsCost || 0;
  const profFees = warehouseCosts?.professionalFees || 0;

  const warehouseBaseCC =
    buildingCost +
    siteYardCost +
    commonInfraCost +
    loadingCost +
    specialisedCost +
    profFees;

  const contingencyPct = cashOutflows.contingencyPercent || 0;
  const contingency =
    warehouseBaseCC > 0
      ? warehouseBaseCC * (contingencyPct / 100)
      : 0;
  const ccWithContingency = warehouseBaseCC + contingency;

  // Match cash-outflows Step 13: SC / POWC / FFE as % of CC including contingency
  const softCosts =
    ccWithContingency * ((cashOutflows.softCostPercent || 0) / 100);
  const powc = ccWithContingency * ((cashOutflows.powcPercent || 0) / 100);
  const ffe = ccWithContingency * ((cashOutflows.ffePercent || 0) / 100);
  const landCost =
    cashOutflows.landCost ||
    (cashOutflows.landArea || 0) * (cashOutflows.landRate || 0) ||
    ctx.landCost;

  const categories: Array<{ name: string; cost: number }> = [
    { name: "Building & Shell", cost: buildingCost },
    { name: "Site & Yard Works", cost: siteYardCost },
    ...(isPark
      ? [{ name: "Common Infrastructure", cost: commonInfraCost }]
      : []),
    { name: "Loading & Access", cost: loadingCost },
    { name: "Specialised Systems", cost: specialisedCost },
    { name: "Professional Fees", cost: profFees },
    { name: "Soft Costs", cost: softCosts || 0 },
    { name: "POWC", cost: powc || 0 },
    { name: "FF&E", cost: ffe || 0 },
    { name: "Contingency", cost: contingency || 0 },
    { name: "Land Cost", cost: landCost || 0 },
  ];

  const totalAllInCost = categories.reduce((s, c) => s + c.cost, 0);
  const totalAllInCostPerSqft =
    totalGfa > 0 ? totalAllInCost / totalGfa : 0;

  const breakdown = categories.map((cat) => ({
    component: cat.name,
    totalCost: Math.round(cat.cost),
    costPerSqft: totalGfa > 0 ? cat.cost / totalGfa : 0,
    percentage: totalAllInCost > 0 ? (cat.cost / totalAllInCost) * 100 : 0,
  }));

  return {
    currency: ctx.currency,
    totalGfa,
    totalAllInCost: Math.round(totalAllInCost),
    totalAllInCostPerSqft,
    isIndustrialPark: isPark,
    breakdown,
  };
}

export function buildWarehouseOperationalRevenuesData(
  bundle: FeasibilityProjectBundle
): OfficeOperationalRevenuesData {
  const ctx = getWarehouseContext(bundle);
  const slice = useFinModelStore.getState().operational;
  const wr = slice.cashInflows?.warehouseRevenue;
  const wo = slice.cashInflows?.warehouseOtherIncome;

  const baseRent = wr?.annualGrossRent ?? 0;
  const yard = wr?.annualYardRevenue ?? 0;
  const parking =
    (wr?.annualParkingRevenueCars ?? 0) +
    (wr?.annualParkingRevenueTrailers ?? 0);
  const recoveries =
    (wo?.annualCamRevenue ?? 0) +
    (wo?.annualTaxRecovery ?? 0) +
    (wo?.annualInsuranceRecovery ?? 0);
  const signage = wo?.signageRevenue ?? 0;
  const total = baseRent + yard + parking + recoveries + signage;

  const row = (source: string, amount: number) => ({
    source,
    amount: Math.round(amount),
    sharePct: total > 0 ? Math.round((amount / total) * 100) : 0,
  });

  return {
    currency: ctx.currency,
    officeGla: ctx.warehouseBua,
    retailGla: 0,
    rows: [
      row("Base Rent", baseRent),
      row("Yard / Hardstand", yard),
      row("Parking", parking),
      row("CAM / Tax / Insurance Recoveries", recoveries),
      row("Advertising / Signage", signage),
    ],
    totalRevenue: Math.round(total),
  };
}

export function buildWarehouseOperationalExpensesData(
  bundle: FeasibilityProjectBundle
): OfficeOperationalExpensesData {
  const ctx = getWarehouseContext(bundle);
  const opEx =
    useFinModelStore.getState().operational.cashInflows?.warehouseOpEx;
  const rev = buildWarehouseOperationalRevenuesData(bundle).totalRevenue;

  const propertyTax = opEx?.annualPropertyTax ?? 0;
  const insurance = opEx?.annualInsurance ?? 0;
  const maintenance = opEx?.annualMaintenance ?? 0;
  const landscaping = opEx?.annualLandscaping ?? 0;
  const utilities = opEx?.annualUtilities ?? 0;
  const security = opEx?.annualSecurity ?? 0;
  const mgmt = opEx?.annualManagementFee ?? 0;
  const gAndA = opEx?.annualGAndA ?? 0;
  const total =
    propertyTax +
    insurance +
    maintenance +
    landscaping +
    utilities +
    security +
    mgmt +
    gAndA;

  const row = (category: string, amount: number) => ({
    category,
    amount: Math.round(amount),
    shareOfRevenuePct: rev > 0 ? Math.round((amount / rev) * 1000) / 10 : 0,
  });

  return {
    currency: ctx.currency,
    rows: [
      row("Property Tax", propertyTax),
      row("Insurance", insurance),
      row("Maintenance", maintenance),
      row("Landscaping", landscaping),
      row("Utilities", utilities),
      row("Security", security),
      row("Management Fee", mgmt),
      row("G&A", gAndA),
    ],
    totalOpex: Math.round(total),
    totalRevenue: rev,
  };
}

export function buildWarehouseOperationalPnlData(
  bundle: FeasibilityProjectBundle
): OfficeOperationalPnLData {
  const slice = useFinModelStore.getState().operational;
  const bases = resolveWarehouseCapexBases(slice.cashOutflows);
  const series = resolveWarehousePnlSeries({
    warehouseRevenue: slice.cashInflows?.warehouseRevenue,
    warehouseOtherIncome: slice.cashInflows?.warehouseOtherIncome,
    warehouseOpEx: slice.cashInflows?.warehouseOpEx,
    warehouseDepreciation: slice.cashInflows?.warehouseDepreciation,
    ...bases,
  });

  const zeros = () => padYearSeries([]);
  const baseRent = padYearSeries(series?.baseRent);
  const yard = padYearSeries(series?.yard);
  const parking = padYearSeries(series?.parking);
  const camTax = padYearSeries(series?.camTax);
  const advertising = padYearSeries(series?.advertising);
  const totalRevenue = padYearSeries(series?.totalRevenue);

  const propertyTax = padYearSeries(series?.propertyTax);
  const insurance = padYearSeries(series?.insurance);
  const maintenance = padYearSeries(series?.maintenance);
  const landscaping = padYearSeries(series?.landscaping);
  const utilities = padYearSeries(series?.utilities);
  const security = padYearSeries(series?.security);
  const managementFee = padYearSeries(series?.mgmtFee);
  const gAndA = padYearSeries(series?.gAndA);
  const totalExpenses = padYearSeries(series?.totalExpenses);

  const ebitda = padYearSeries(series?.ebitda);
  const depreciationTotal = padYearSeries(series?.totalDa);
  const ebit = padYearSeries(series?.ebit);
  const netIncome = padYearSeries(series?.netIncome);

  return {
    currency: bundle.currency,
    years: Array.from({ length: PNL_YEARS }, (_, i) => `Y${i + 1}`),
    revenues: {
      officeRent: baseRent.map((v, i) => v + yard[i]!),
      retailMinRent: zeros(),
      camRecoveries: camTax,
      parkingIncome: parking,
      advertisingIncome: advertising,
      totalRevenue,
    },
    operatingExpenses: {
      cam: zeros(),
      propertyTax,
      insurance,
      marketing: zeros(),
      gAndA,
      managementFee,
      renovationProvision: maintenance.map(
        (v, i) => v + landscaping[i]! + utilities[i]! + security[i]!
      ),
      totalExpenses,
    },
    ebitda,
    depreciationTotal,
    ebit,
    netIncome,
    yoyGrowth: totalRevenue.map((r, i) => {
      if (i === 0 || !totalRevenue[i - 1]) return "—";
      const pct = ((r / totalRevenue[i - 1]! - 1) * 100).toFixed(1);
      return `${pct}%`;
    }),
  };
}

export function isWarehouseDevelopmentAssumptionsData(
  d: unknown
): d is WarehouseDevelopmentAssumptionsData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as WarehouseDevelopmentAssumptionsData).breakdown) &&
    typeof (d as WarehouseDevelopmentAssumptionsData).totalAllInCost ===
      "number"
  );
}

export function isWarehouseOperationalRevenuesData(
  d: unknown
): d is OfficeOperationalRevenuesData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as OfficeOperationalRevenuesData).rows)
  );
}

export function isWarehouseOperationalExpensesData(
  d: unknown
): d is OfficeOperationalExpensesData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as OfficeOperationalExpensesData).rows)
  );
}

export function isWarehouseOperationalPnLData(
  d: unknown
): d is OfficeOperationalPnLData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as OfficeOperationalPnLData).years) &&
    typeof (d as OfficeOperationalPnLData).revenues === "object"
  );
}
