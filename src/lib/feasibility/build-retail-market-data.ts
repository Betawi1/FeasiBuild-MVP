import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import type {
  FeasibilityProjectBundle,
  ImplicationsData,
  MallDevelopmentAssumptionsData,
  MallOperationalExpensesData,
  MallOperationalPnLData,
  MallOperationalRevenuesData,
  RetailCompetitiveLandscapeData,
  RetailMarketMetricsData,
  RetailMarketOverviewData,
  RetailMarketSummaryData,
  RetailSupplyPipelineData,
  RetailTenantProfileData,
  RiskFactorsData,
  SuccessFactorsData,
} from "@/types/feasibility";
import { fmtMallMoney, getMallContext } from "@/lib/feasibility/mall-context";
import { buildOperationalCostBreakdown } from "@/lib/feasibility/build-operational-cost-breakdown";

export function buildRetailMarketOverviewData(
  bundle: FeasibilityProjectBundle
): RetailMarketOverviewData {
  const ctx = getMallContext(bundle);
  return {
    demandDrivers: [
      `Population and household income growth in ${ctx.city} primary catchment`,
      `Tourism and visitor spending supporting mall footfall`,
      `Limited quality ${ctx.positioning} mall supply in immediate trade area`,
      `Experiential retail, F&B, and entertainment demand`,
    ],
    catchmentHighlights: [
      `${ctx.city} metropolitan catchment with strong discretionary spending`,
      `15–20 km primary trade area with mid-to-high income households`,
      `Connectivity via major arterials and public transport nodes`,
    ],
  };
}

export function buildRetailMarketMetricsData(
  bundle: FeasibilityProjectBundle
): RetailMarketMetricsData {
  const ctx = getMallContext(bundle);
  const years = ["2019", "2020", "2021", "2022", "2023", "2024E", "2025E"];
  const chartData = years.map((year, i) => ({
    year,
    footfall: Math.round(18 + i * 1.2 + (i > 1 ? 2 : -4)),
    salesPsf: Math.round(2200 + i * 80),
    occupancy: Math.round(88 + i * 0.8),
  }));

  return {
    chartData,
    footfallCagr: "4.2%",
    salesPsfCagr: "3.8%",
    occupancyLatest: `${chartData.at(-2)?.occupancy ?? ctx.stabilizedOccupancy}%`,
  };
}

export function buildRetailSupplyPipelineData(
  bundle: FeasibilityProjectBundle
): RetailSupplyPipelineData {
  const ctx = getMallContext(bundle);
  const existing = Math.round(ctx.gla * 12);
  const chartData = [
    { year: "2021", existingGla: existing * 0.92, pipelineGla: existing * 0.03 },
    { year: "2022", existingGla: existing * 0.94, pipelineGla: existing * 0.04 },
    { year: "2023", existingGla: existing * 0.96, pipelineGla: existing * 0.05 },
    { year: "2024E", existingGla: existing * 0.98, pipelineGla: existing * 0.06 },
    { year: "2025E", existingGla: existing, pipelineGla: existing * 0.07 },
    { year: "2026E", existingGla: existing * 1.02, pipelineGla: existing * 0.05 },
  ];
  const pipeline = Math.round(existing * 0.07);
  const share =
    existing > 0 ? ((ctx.gla / existing) * 100).toFixed(1) : "—";

  return {
    chartData,
    existingStockSqft: existing,
    pipelineSqft: pipeline,
    subjectSharePct: `${share}%`,
  };
}

export function buildRetailCompetitiveLandscapeData(
  bundle: FeasibilityProjectBundle
): RetailCompetitiveLandscapeData {
  const ctx = getMallContext(bundle);
  const c = ctx.currency;
  const malls =
    ctx.city.toLowerCase().includes("dubai")
      ? [
          {
            name: "The Dubai Mall",
            gla: "3,770,000 sqft",
            occupancy: "96%",
            baseRent: `${c} 420/sqft`,
            positioning: "Super-regional luxury",
          },
          {
            name: "Mall of the Emirates",
            gla: "2,400,000 sqft",
            occupancy: "94%",
            baseRent: `${c} 380/sqft`,
            positioning: "Super-regional upscale",
          },
          {
            name: "City Centre Mirdif",
            gla: "1,900,000 sqft",
            occupancy: "93%",
            baseRent: `${c} 290/sqft`,
            positioning: "Regional mid-market",
          },
          {
            name: "Ibn Battuta Mall",
            gla: "1,400,000 sqft",
            occupancy: "91%",
            baseRent: `${c} 240/sqft`,
            positioning: "Regional value",
          },
        ]
      : [
          {
            name: `${ctx.city} Central Mall`,
            gla: "1,200,000 sqft",
            occupancy: "92%",
            baseRent: `${c} 280/sqft`,
            positioning: "Regional",
          },
          {
            name: `${ctx.city} Gardens Retail`,
            gla: "850,000 sqft",
            occupancy: "90%",
            baseRent: `${c} 240/sqft`,
            positioning: "Community",
          },
          {
            name: `${ctx.city} Promenade`,
            gla: "620,000 sqft",
            occupancy: "89%",
            baseRent: `${c} 220/sqft`,
            positioning: "Lifestyle",
          },
        ];

  return {
    benchmarkMalls: malls,
    avgOccupancy: "92%",
    avgBaseRent: `${c} ${Math.round(ctx.baseRentYear1 * 1.05)}/sqft`,
  };
}

export function buildRetailTenantProfileData(
  bundle: FeasibilityProjectBundle
): RetailTenantProfileData {
  const ctx = getMallContext(bundle);
  return {
    tenantMix: [
      { category: "Fashion & Apparel", sharePct: 32 },
      { category: "F&B", sharePct: 22 },
      { category: "Entertainment", sharePct: 12 },
      { category: "Home & Lifestyle", sharePct: 14 },
      { category: "Services & Convenience", sharePct: 12 },
      { category: "Anchors / Department", sharePct: 8 },
    ],
    catchmentRadius: "15–20 km primary catchment",
    primaryDemographics: [
      `Mid-to-high income households in ${ctx.city}`,
      "Families and young professionals",
      "Regional tourists and weekend visitors",
    ],
    waleYears: 5.2,
  };
}

export function buildRetailMarketSummaryData(
  bundle: FeasibilityProjectBundle
): RetailMarketSummaryData {
  const ctx = getMallContext(bundle);
  return {
    marketOverview: [
      `${ctx.city} retail market demonstrates resilient footfall and tenant sales growth supported by population and tourism drivers.`,
      `${ctx.positioning} mall product remains undersupplied in the immediate catchment relative to demand.`,
    ],
    supplyDemand: [
      `Measured pipeline delivery over 2024–2026; net absorption positive for quality assets.`,
      `Subject ${ctx.gla.toLocaleString()} sqft GLA requires ${ctx.stabilizedOccupancy}% stabilized occupancy.`,
    ],
    competitivePosition: [
      `Benchmark malls operate at 90%+ occupancy with base rents supporting subject underwriting.`,
      `Differentiation via tenant mix, parking, and experiential programming.`,
    ],
    investmentThesis: [
      `Project IRR of ${ctx.projectIRR}% achievable with disciplined lease-up execution.`,
      `Equity returns of ${ctx.equityIRR}% supported by ${ctx.equityMultiple.toFixed(2)}x multiple at exit.`,
    ],
  };
}

export function buildMallDevelopmentAssumptionsData(
  bundle: FeasibilityProjectBundle
): MallDevelopmentAssumptionsData {
  const ctx = getMallContext(bundle);
  return {
    currency: ctx.currency,
    gla: ctx.gla,
    landCost: ctx.landCost,
    constructionCost: ctx.constructionCost,
    tiAllowance: ctx.tiAllowance,
    leasingCommissions: ctx.leasingCommissions,
    softCosts: ctx.softCosts,
    powc: ctx.powc,
    tdc: ctx.tdc,
    costPerSqft: ctx.gla > 0 ? Math.round(ctx.tdc / ctx.gla) : 0,
    costBreakdown: buildOperationalCostBreakdown(bundle),
  };
}

export function buildMallOperationalRevenuesData(
  bundle: FeasibilityProjectBundle
): MallOperationalRevenuesData {
  const ctx = getMallContext(bundle);
  const baseRent = ctx.gla * ctx.baseRentYear1 * (ctx.stabilizedOccupancy / 100);
  const pctRent =
    ctx.gla * ctx.avgTenantSales * (ctx.percentageRentRate / 100);
  const cam =
    ctx.camFixed +
    ctx.gla * ctx.camVariable * (ctx.stabilizedOccupancy / 100) * (ctx.recoveryRate / 100);
  const parking =
    ctx.parkingSpaces *
    ctx.parkingRevenue *
    (ctx.parkingUtilization / 100) *
    365;
  const other = ctx.otherIncome;
  const total = baseRent + pctRent + cam + parking + other;

  const row = (source: string, amount: number) => ({
    source,
    amount: Math.round(amount),
    sharePct: total > 0 ? Math.round((amount / total) * 100) : 0,
  });

  return {
    currency: ctx.currency,
    gla: ctx.gla,
    baseRentYear1: ctx.baseRentYear1,
    stabilizedOccupancy: ctx.stabilizedOccupancy,
    rows: [
      row("Base Rent", baseRent),
      row("Percentage Rent (Overage)", pctRent),
      row("CAM Recoveries", cam),
      row("Parking Income", parking),
      row("Advertising / Kiosks / Events", other),
    ],
    totalRevenue: Math.round(total),
  };
}

export function buildMallOperationalExpensesData(
  bundle: FeasibilityProjectBundle
): MallOperationalExpensesData {
  const ctx = getMallContext(bundle);
  const rev = buildMallOperationalRevenuesData(bundle).totalRevenue;
  const marketing = rev * (ctx.marketingPercentage / 100);
  const mgmt = rev * (ctx.managementFeePercentage / 100);
  const camVar = ctx.gla * ctx.camVariable;
  const total =
    ctx.camFixed + camVar + ctx.propertyTax + ctx.insurance + marketing + ctx.gAndA + mgmt;

  const row = (category: string, amount: number) => ({
    category,
    amount: Math.round(amount),
    shareOfRevenuePct: rev > 0 ? Math.round((amount / rev) * 1000) / 10 : 0,
  });

  return {
    currency: ctx.currency,
    rows: [
      row("CAM (Fixed)", ctx.camFixed),
      row("CAM (Variable)", camVar),
      row("Property Tax", ctx.propertyTax),
      row("Insurance", ctx.insurance),
      row("Marketing & Promotions", marketing),
      row("G&A", ctx.gAndA),
      row("Management Fee", mgmt),
    ],
    totalOpex: Math.round(total),
    totalRevenue: rev,
  };
}

export function buildMallImplicationsData(
  bundle: FeasibilityProjectBundle
): ImplicationsData {
  const ctx = getMallContext(bundle);
  return {
    hospitalityImplications: [
      {
        number: 1,
        title: "Catchment demand",
        description: `${ctx.city} catchment income growth supports lease-up from ${ctx.leaseUpYear1}% to ${ctx.stabilizedOccupancy}% occupancy.`,
      },
      {
        number: 2,
        title: "Tenant mix",
        description:
          "Fashion, F&B, and entertainment weighting aligns with experiential retail preferences and cross-shopping behavior.",
      },
      {
        number: 3,
        title: "Base rent positioning",
        description: `Year 1 base rent of ${ctx.currency} ${ctx.baseRentYear1}/sqft sits within the competitive set for ${ctx.positioning} malls.`,
      },
      {
        number: 4,
        title: "CAM recoveries",
        description: `${ctx.recoveryRate}% recovery rate on controllable opex supports net operating income conversion.`,
      },
      {
        number: 5,
        title: "Supply pipeline",
        description: `Incremental ${ctx.gla.toLocaleString()} sqft GLA must achieve pre-leasing milestones ahead of competing openings.`,
      },
      {
        number: 6,
        title: "Parking yield",
        description: `${ctx.parkingSpaces.toLocaleString()} spaces at ${ctx.parkingUtilization}% utilization supplement core rental income.`,
      },
      {
        number: 7,
        title: "WALE profile",
        description:
          "Target WALE above five years supports income visibility and refinancing optionality.",
      },
      {
        number: 8,
        title: "Investment case",
        description: `Project IRR of ${ctx.projectIRR}% is achievable if the mall captures fair share of catchment retail spending growth.`,
      },
    ],
    keyTakeaways: [
      `Market fundamentals in ${ctx.city} support a ${ctx.positioning} mall of ${ctx.gla.toLocaleString()} sqft GLA.`,
      "Competitive benchmarking confirms achievable occupancy and base rent targets.",
      "Success depends on leasing velocity, tenant mix, and disciplined opex management.",
    ],
  };
}

export function buildMallSuccessFactorsData(
  bundle: FeasibilityProjectBundle
): SuccessFactorsData {
  const ctx = getMallContext(bundle);
  return {
    marketOpportunities: [
      {
        factor: "Underserved catchment retail spend",
        effect: `Supports lease-up in ${ctx.city}. Enables rent growth on renewal. Reduces vacancy risk at opening.`,
      },
      {
        factor: "Tourism and visitor footfall",
        effect: "Broadens customer base. Supports F&B and entertainment tenants. Improves sales PSF.",
      },
      {
        factor: "Limited competing quality supply",
        effect: "Reduces direct rent competition. Supports anchor negotiations. Extends lease terms.",
      },
    ],
    projectStrengths: [
      {
        strength: `${ctx.gla.toLocaleString()} sqft efficient GLA with modern layout`,
        effect: "Improves tenant sales productivity. Supports premium base rent.",
      },
      {
        strength: `${ctx.positioning} positioning and curated tenant mix`,
        effect: "Attracts quality tenants. Supports footfall and dwell time.",
      },
      {
        strength: "Parking and accessibility",
        effect: "Enhances convenience. Supports family and weekend visitation.",
      },
      {
        strength: "Institutional asset management assumptions",
        effect: "Reduces opex leakage. Supports lender and equity confidence.",
      },
    ],
    mainOutcomes: [
      `The project is positioned to capture ${ctx.city} retail spending growth and achieve stabilized returns per Component 4.`,
      "Differentiated tenant mix and location mitigate direct competition from legacy supply.",
    ],
  };
}

export function buildMallRiskFactorsData(
  bundle: FeasibilityProjectBundle
): RiskFactorsData {
  const ctx = getMallContext(bundle);
  return {
    marketThreats: [
      {
        risk: "Economic slowdown reducing discretionary spending",
        effect: "Could compress tenant sales and extend lease-up. May increase tenant incentives.",
        mitigatingFactors: [
          "Diversified tenant mix",
          "Essential and convenience anchors",
          "Flexible lease structures",
        ],
      },
      {
        risk: "Competing mall supply",
        effect: "May pressure rents and occupancy in oversupplied sub-markets.",
        mitigatingFactors: [
          "Pre-leasing program",
          "Unique experiential offering",
          "Strong catchment location",
        ],
      },
      {
        risk: "E-commerce disruption",
        effect: "Could reduce apparel footprint demand over time.",
        mitigatingFactors: [
          "F&B and entertainment weighting",
          "Click-and-collect integration",
          "Experiential retail focus",
        ],
      },
    ],
    projectWeaknesses: [
      {
        weakness: "Lease-up execution risk in Year 1–2",
        effect: "May delay stabilization and equity returns.",
        mitigatingFactors: [
          "Anchor pre-commitments",
          "Experienced leasing team",
          "TI and commission budget",
        ],
      },
      {
        weakness: "Construction cost inflation",
        effect: "Could erode development margin if not managed.",
        mitigatingFactors: [
          "Fixed-price contracts where possible",
          "Contingency in TDC",
          "Phased procurement",
        ],
      },
      {
        weakness: "CAM recovery shortfalls",
        effect: "May compress NOI if recoveries lag opex growth.",
        mitigatingFactors: [
          "Triple-net lease structures",
          `${ctx.recoveryRate}% recovery assumption`,
          "Annual true-up mechanisms",
        ],
      },
      {
        weakness: "Interest rate sensitivity",
        effect: "Higher rates may reduce exit yields and equity IRR.",
        mitigatingFactors: [
          "Fixed-rate debt where available",
          "Conservative LTC",
          "Scenario stress testing",
        ],
      },
    ],
  };
}

export function isRetailMarketOverviewData(d: unknown): d is RetailMarketOverviewData {
  return !!d && typeof d === "object" && Array.isArray((d as RetailMarketOverviewData).demandDrivers);
}

export function isRetailMarketMetricsData(d: unknown): d is RetailMarketMetricsData {
  return !!d && typeof d === "object" && Array.isArray((d as RetailMarketMetricsData).chartData);
}

export function isRetailSupplyPipelineData(d: unknown): d is RetailSupplyPipelineData {
  return !!d && typeof d === "object" && typeof (d as RetailSupplyPipelineData).existingStockSqft === "number";
}

export function isRetailCompetitiveLandscapeData(d: unknown): d is RetailCompetitiveLandscapeData {
  return !!d && typeof d === "object" && Array.isArray((d as RetailCompetitiveLandscapeData).benchmarkMalls);
}

export function isRetailTenantProfileData(d: unknown): d is RetailTenantProfileData {
  return !!d && typeof d === "object" && Array.isArray((d as RetailTenantProfileData).tenantMix);
}

export function isRetailMarketSummaryData(d: unknown): d is RetailMarketSummaryData {
  return !!d && typeof d === "object" && Array.isArray((d as RetailMarketSummaryData).marketOverview);
}

export function isMallDevelopmentAssumptionsData(d: unknown): d is MallDevelopmentAssumptionsData {
  return !!d && typeof d === "object" && typeof (d as MallDevelopmentAssumptionsData).gla === "number";
}

export function isMallOperationalRevenuesData(d: unknown): d is MallOperationalRevenuesData {
  return !!d && typeof d === "object" && Array.isArray((d as MallOperationalRevenuesData).rows);
}

export function isMallOperationalExpensesData(d: unknown): d is MallOperationalExpensesData {
  return !!d && typeof d === "object" && Array.isArray((d as MallOperationalExpensesData).rows);
}

const PNL_YEARS = OPERATIONAL_ROOM_REVENUE_YEARS;

function padYearSeries(source: number[] | undefined): number[] {
  return Array.from({ length: PNL_YEARS }, (_, i) => source?.[i] ?? 0);
}

export function buildMallOperationalPnlData(
  bundle: FeasibilityProjectBundle
): MallOperationalPnLData {
  const snap = bundle.retailHoldSnapshot;
  const baseRent = padYearSeries(snap?.revenueValues);
  const percentageRent = padYearSeries(snap?.percentageRentValues);
  const camRecoveries = padYearSeries(snap?.camRecoveryValues);
  const parkingIncome = padYearSeries(snap?.parkingRevenueValues);
  const advertisingIncome = padYearSeries(snap?.advertisingValues);
  const totalRevenue = baseRent.map(
    (v, i) =>
      v +
      percentageRent[i]! +
      camRecoveries[i]! +
      parkingIncome[i]! +
      advertisingIncome[i]!
  );

  const cam = padYearSeries(snap?.opexCamValues);
  const propertyInsurance = padYearSeries(snap?.opexPropertyTaxValues).map(
    (v, i) => v + (snap?.opexInsuranceValues?.[i] ?? 0)
  );
  const marketingGAndA = padYearSeries(snap?.opexMarketingValues).map(
    (v, i) => v + (snap?.opexGaValues?.[i] ?? 0)
  );
  const managementFee = padYearSeries(snap?.opexMgmtFeeValues);
  const renovationProvision = padYearSeries(snap?.opexRenovationValues);
  const totalExpenses = padYearSeries(snap?.opexTotalValues).map((v, i) =>
    v > 0
      ? v
      : cam[i]! +
        propertyInsurance[i]! +
        marketingGAndA[i]! +
        managementFee[i]! +
        renovationProvision[i]!
  );

  const ebitda = totalRevenue.map((r, i) => r - totalExpenses[i]!);

  const construction = padYearSeries(snap?.depConstructionValues);
  const ffe = padYearSeries(snap?.depFfeValues);
  const ti = padYearSeries(snap?.depTiValues);
  const leasingCommissions = padYearSeries(snap?.depLeasingCommValues);
  const depTotal = padYearSeries(snap?.depTotalValues).map((v, i) =>
    v > 0 ? v : construction[i]! + ffe[i]! + ti[i]! + leasingCommissions[i]!
  );

  const netOperatingIncome = ebitda.map((e, i) => e - depTotal[i]!);

  return {
    currency: bundle.currency,
    years: Array.from({ length: PNL_YEARS }, (_, i) => `Year ${i + 1}`),
    revenues: {
      baseRent,
      percentageRent,
      camRecoveries,
      parkingIncome,
      advertisingIncome,
      totalRevenue,
    },
    operatingExpenses: {
      cam,
      propertyInsurance,
      marketingGAndA,
      managementFee,
      renovationProvision,
      totalExpenses,
    },
    ebitda,
    depreciation: {
      construction,
      ffe,
      ti,
      leasingCommissions,
      total: depTotal,
    },
    netOperatingIncome,
  };
}

export function isMallOperationalPnLData(d: unknown): d is MallOperationalPnLData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as MallOperationalPnLData).years) &&
    typeof (d as MallOperationalPnLData).revenues === "object"
  );
}
