import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import type {
  DataCentreCompetitiveAnalysisData,
  DataCentreDevelopmentAssumptionsData,
  DataCentreOperationalAssumptionsData,
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
} from "@/types/feasibility";
import {
  formatDataCentreSegmentLabel,
  formatDataCentreTierLabel,
  getDataCentreContext,
} from "@/lib/feasibility/data-centre-context";
import { resolveDataCentrePnlSeries } from "@/lib/data-centre-pnl-series";
import { resolveDataCentreCapEx } from "@/app/operational/cash-outflows/steps/DataCentreConstructionCostsStep";
import useFinModelStore from "@/store/useFinModelStore";

const PNL_YEARS = OPERATIONAL_ROOM_REVENUE_YEARS;

function padYearSeries(source: number[] | undefined): number[] {
  return Array.from({ length: PNL_YEARS }, (_, i) => source?.[i] ?? 0);
}

export type {
  DataCentreDevelopmentAssumptionsData,
  DataCentreCompetitiveAnalysisData,
  DataCentreOperationalAssumptionsData,
} from "@/types/feasibility";

export function buildDataCentreMarketOverviewData(
  bundle: FeasibilityProjectBundle
): RetailMarketOverviewData {
  const ctx = getDataCentreContext(bundle);
  return {
    demandDrivers: [
      `AI / cloud / hyperscale IT load growth in ${ctx.city}`,
      `Digital economy and enterprise digitalization across ${ctx.country}`,
      `Latency-sensitive workloads requiring regional ${ctx.segment.toLowerCase()} capacity`,
      `Limited certified ${ctx.tierLevel} capacity with resilient power and fiber`,
    ],
    catchmentHighlights: [
      `${ctx.city} power availability and grid interconnection corridor`,
      `Fiber diversity and proximity to major network hubs`,
      `Occupier mix skewed to cloud, content, fintech, and enterprise colo`,
    ],
  };
}

export function buildDataCentreMarketMetricsData(
  bundle: FeasibilityProjectBundle
): RetailMarketMetricsData {
  const ctx = getDataCentreContext(bundle);
  const chartData = ["2019", "2020", "2021", "2022", "2023", "2024E", "2025E"].map(
    (year, i) => ({
      year,
      // Reused retail chart keys: footfall→utilization, salesPsf→$/kW, occupancy→util %
      footfall: Math.round(62 + i * 2.4),
      salesPsf: Math.round(ctx.leaseRatePerKwMonth * 0.9 + i * 4),
      occupancy: Math.round(Math.min(96, ctx.occupancyRate - 10 + i * 1.5)),
    })
  );
  return {
    chartData,
    footfallCagr: "5.8%",
    salesPsfCagr: "3.5%",
    occupancyLatest: `${chartData.at(-2)?.occupancy ?? ctx.occupancyRate}%`,
  };
}

export function buildDataCentreSupplyPipelineData(
  bundle: FeasibilityProjectBundle
): RetailSupplyPipelineData {
  const ctx = getDataCentreContext(bundle);
  const existingMw = Math.max(Math.round(ctx.itLoadMw * 18), 20);
  const chartData = [
    { year: "2021", existingGla: existingMw * 0.82, pipelineGla: existingMw * 0.08 },
    { year: "2022", existingGla: existingMw * 0.88, pipelineGla: existingMw * 0.1 },
    { year: "2023", existingGla: existingMw * 0.94, pipelineGla: existingMw * 0.12 },
    { year: "2024E", existingGla: existingMw, pipelineGla: existingMw * 0.15 },
    { year: "2025E", existingGla: existingMw * 1.08, pipelineGla: existingMw * 0.12 },
    { year: "2026E", existingGla: existingMw * 1.15, pipelineGla: existingMw * 0.1 },
  ];
  return {
    chartData,
    existingStockSqft: existingMw,
    pipelineSqft: Math.round(existingMw * 0.15),
    subjectSharePct:
      existingMw > 0
        ? `${((ctx.itLoadMw / existingMw) * 100).toFixed(1)}%`
        : "—",
  };
}

export function buildDataCentreCompetitiveLandscapeData(
  bundle: FeasibilityProjectBundle
): RetailCompetitiveLandscapeData {
  const ctx = getDataCentreContext(bundle);
  const c = ctx.currency;
  const rate = ctx.leaseRatePerKwMonth;
  const occ = ctx.occupancyRate;

  return {
    benchmarkMalls: [
      {
        name: `${ctx.city} Hyperscale Campus A`,
        gla: `${Math.max(ctx.itLoadMw * 1.6, 5).toFixed(1)} MW`,
        occupancy: `${Math.min(98, occ + 3)}%`,
        baseRent: `${c} ${(rate * 1.08).toFixed(0)}/kW/mo`,
        positioning: `${ctx.tierLevel} Wholesale`,
      },
      {
        name: `${ctx.city} Colo Facility B`,
        gla: `${Math.max(ctx.itLoadMw * 0.7, 2).toFixed(1)} MW`,
        occupancy: `${Math.max(70, occ - 6)}%`,
        baseRent: `${c} ${(rate * 0.92).toFixed(0)}/kW/mo`,
        positioning: "Tier II/III Colo",
      },
      {
        name: `${ctx.city} Edge Node C`,
        gla: `${Math.max(ctx.itLoadMw * 0.35, 1).toFixed(1)} MW`,
        occupancy: `${Math.min(95, occ + 1)}%`,
        baseRent: `${c} ${(rate * 1.15).toFixed(0)}/kW/mo`,
        positioning: "Edge / Latency",
      },
      {
        name: "Subject Asset",
        gla: `${ctx.itLoadMw.toFixed(1)} MW`,
        occupancy: `${occ}%`,
        baseRent: `${c} ${rate}/kW/mo`,
        positioning: `${ctx.tierLevel} ${ctx.segment}`,
      },
    ],
    avgOccupancy: `${occ}%`,
    avgBaseRent: `${c} ${rate}/kW/mo`,
  };
}

export function buildDataCentreCompetitiveAnalysisData(
  bundle: FeasibilityProjectBundle
): DataCentreCompetitiveAnalysisData {
  const ctx = getDataCentreContext(bundle);
  const rate = ctx.leaseRatePerKwMonth || 120;
  return {
    currency: ctx.currency,
    subjectPricePerKw: rate,
    subjectPUE: ctx.pue,
    competitorPricing: [
      { name: `${ctx.city} Campus A`, pricePerKw: Math.round(rate * 1.08) },
      { name: `${ctx.city} Colo B`, pricePerKw: Math.round(rate * 0.92) },
      { name: `${ctx.city} Edge C`, pricePerKw: Math.round(rate * 1.15) },
      { name: "Subject", pricePerKw: Math.round(rate) },
    ],
    competitorPUE: [
      { name: `${ctx.city} Campus A`, pue: Math.round(ctx.pue * 1.05 * 100) / 100 },
      { name: `${ctx.city} Colo B`, pue: Math.round(ctx.pue * 1.12 * 100) / 100 },
      { name: `${ctx.city} Edge C`, pue: Math.round(ctx.pue * 0.98 * 100) / 100 },
      { name: "Subject", pue: ctx.pue },
    ],
    latencyToHubs: [
      { hub: "Singapore", latencyMs: ctx.country.toLowerCase().includes("sing") ? 2 : 18 },
      { hub: "Kuala Lumpur", latencyMs: ctx.country.toLowerCase().includes("malay") ? 3 : 22 },
      { hub: "Hong Kong", latencyMs: 45 },
      { hub: "Tokyo", latencyMs: 70 },
    ],
  };
}

export function buildDataCentreTenantProfileData(
  bundle: FeasibilityProjectBundle
): RetailTenantProfileData {
  const ctx = getDataCentreContext(bundle);
  const isEdge = ctx.segment.toLowerCase().includes("edge");
  return {
    tenantMix: isEdge
      ? [
          { category: "CDN / Content Edge", sharePct: 30 },
          { category: "Enterprise Branch / Latency", sharePct: 25 },
          { category: "Telco / 5G Core", sharePct: 20 },
          { category: "Fintech / Trading", sharePct: 15 },
          { category: "Other", sharePct: 10 },
        ]
      : [
          { category: "Cloud / Hyperscale", sharePct: 35 },
          { category: "Enterprise Colocation", sharePct: 25 },
          { category: "Content / Media", sharePct: 18 },
          { category: "Fintech / Banking", sharePct: 12 },
          { category: "Other", sharePct: 10 },
        ],
    catchmentRadius: `${ctx.city} digital corridor (power + fiber catchment)`,
    primaryDemographics: [
      `Tenants requiring ${ctx.tierLevel} resilience and dual-path fiber`,
      "Contracts typically power + space leases with ancillary cross-connects",
      "Credit-quality cloud and enterprise anchors with multi-year WALE",
    ],
    waleYears: 7,
  };
}

export function buildDataCentreMarketSummaryData(
  bundle: FeasibilityProjectBundle
): RetailMarketSummaryData {
  const ctx = getDataCentreContext(bundle);
  return {
    marketOverview: [
      `Digital economy growth supports ${ctx.tierLevel.toLowerCase()} ${ctx.segment.toLowerCase()} capacity in ${ctx.city}.`,
      `Power availability and fiber diversity remain the primary site-selection filters.`,
    ],
    supplyDemand: [
      `Underwriting at ${ctx.currency} ${ctx.leaseRatePerKwMonth}/kW/month aligns with competitive ${ctx.segment.toLowerCase()} stock.`,
      `Stabilized utilization of ${ctx.occupancyRate}% is achievable under base-case absorption.`,
    ],
    competitivePosition: [
      `${ctx.tierLevel} certification and PUE of ${ctx.pue} differentiate versus older facilities.`,
      `IT load of ${ctx.itLoadMw.toFixed(1)} MW positions the subject within institutional capacity bands.`,
    ],
    investmentThesis: [
      `Pre-leasing power blocks and grid interconnection are critical path items.`,
      `Project IRR of ${ctx.projectIRR}% frames the investment case.`,
    ],
  };
}

export function buildDataCentreImplicationsData(
  bundle: FeasibilityProjectBundle
): ImplicationsData {
  const ctx = getDataCentreContext(bundle);
  return {
    hospitalityImplications: [
      {
        number: 1,
        title: "Power & grid",
        description: `Grid capacity and interconnection timing underpin delivery of ${ctx.itLoadMw.toFixed(1)} MW IT load.`,
      },
      {
        number: 2,
        title: "Fiber & latency",
        description: "Diverse fiber paths and hub latency support enterprise and cloud demand.",
      },
      {
        number: 3,
        title: "Pricing",
        description: `Lease rate of ${ctx.currency} ${ctx.leaseRatePerKwMonth}/kW/month aligns with ${ctx.tierLevel} benchmarks.`,
      },
      {
        number: 4,
        title: "Efficiency",
        description: `Design PUE of ${ctx.pue} supports operating cost competitiveness and ESG positioning.`,
      },
      {
        number: 5,
        title: "Absorption",
        description: `Stabilized utilization of ${ctx.occupancyRate}% is consistent with regional colo/edge demand.`,
      },
    ],
    keyTakeaways: [
      `Investment case delivers ${ctx.projectIRR}% project IRR.`,
      `${ctx.itLoadMw.toFixed(1)} MW IT load underwrites institutional digital infrastructure demand.`,
    ],
  };
}

export function buildDataCentreSuccessFactorsData(
  bundle: FeasibilityProjectBundle
): SuccessFactorsData {
  const ctx = getDataCentreContext(bundle);
  return {
    marketOpportunities: [
      {
        factor: "AI / cloud / digital economy demand",
        effect: `Supports absorption toward ${ctx.occupancyRate}% utilization in ${ctx.city}`,
      },
      {
        factor: "Constrained certified capacity",
        effect: "Supports lease rates and pre-leasing velocity for Tier-certified stock",
      },
    ],
    projectStrengths: [
      {
        strength: "Power and fiber site attributes",
        effect: `Supports ${ctx.tierLevel} ${ctx.segment.toLowerCase()} positioning in ${ctx.city}`,
      },
      {
        strength: `Design PUE ${ctx.pue}`,
        effect: "Competitive OpEx and ESG credentials versus older facilities",
      },
    ],
    mainOutcomes: [
      "Institutional-grade data centre with diversified power + space + ancillary income",
      `Target project IRR ${ctx.projectIRR}%`,
    ],
  };
}

export function buildDataCentreRiskFactorsData(
  _bundle: FeasibilityProjectBundle
): RiskFactorsData {
  return {
    marketThreats: [
      {
        risk: "Power grid constraints / interconnection delays",
        effect: "Could defer IT load energization and delay revenue ramp",
        mitigatingFactors: [
          "Early utility engagement and phased capacity",
          "On-site generation / UPS contingency planning",
        ],
      },
      {
        risk: "Water scarcity / cooling constraints",
        effect: "May raise OpEx or restrict density for air-cooled designs",
        mitigatingFactors: [
          "Efficient cooling design and water reuse",
          "Liquid / hybrid cooling options where justified",
        ],
      },
      {
        risk: "Technology obsolescence",
        effect: "Higher refresh CapEx if rack density and cooling specs lag market",
        mitigatingFactors: [
          "Modular white space design",
          "Flexible power density envelopes",
        ],
      },
    ],
    projectWeaknesses: [
      {
        weakness: "Construction cost inflation (M&E / IT hardware)",
        effect: "May erode development margin if not contractually managed",
        mitigatingFactors: [
          "Fixed-price packages where available",
          "Contingency within TDC",
        ],
      },
    ],
  };
}

export function buildDataCentreDevelopmentAssumptionsData(
  bundle: FeasibilityProjectBundle
): DataCentreDevelopmentAssumptionsData {
  const ctx = getDataCentreContext(bundle);
  const slice = useFinModelStore.getState().operational;
  const projectInfo = slice.projectInfo;
  const cashOutflows = slice.cashOutflows;
  const capex = resolveDataCentreCapEx(projectInfo);

  const itLoadMw = capex.itLoadMw || ctx.itLoadMw || 1;
  const softCosts =
    cashOutflows.softCostsTotal ??
    cashOutflows.softCosts ??
    ctx.softCosts ??
    0;
  const powc = cashOutflows.powcTotal ?? cashOutflows.powc ?? ctx.powc ?? 0;
  const ffe = cashOutflows.ffe || ctx.ffe || 0;
  const landCost =
    cashOutflows.landCost ||
    (cashOutflows.landArea || 0) * (cashOutflows.landRate || 0) ||
    ctx.landCost;

  const categories: Array<{ name: string; cost: number }> = [
    { name: "Building & Shell", cost: capex.buildingCost },
    { name: "M&E Electrical Infrastructure", cost: capex.meElectrical },
    { name: "M&E Cooling Infrastructure", cost: capex.meCooling },
    ...(capex.itHardwareCost > 0
      ? [{ name: "IT Hardware", cost: capex.itHardwareCost }]
      : []),
    { name: "Professional Fees", cost: capex.professionalFees },
    { name: "Contingency", cost: capex.contingency },
    { name: "Soft Costs", cost: softCosts },
    { name: "POWC", cost: powc },
    { name: "FF&E", cost: ffe },
    { name: "Land Cost", cost: landCost },
  ];

  const totalAllInCost = categories.reduce((s, c) => s + c.cost, 0);
  const totalAllInCostPerMw =
    itLoadMw > 0 ? totalAllInCost / itLoadMw : 0;

  return {
    currency: ctx.currency,
    itLoadMw,
    whiteSpaceSqft: ctx.whiteSpaceSqft,
    totalAllInCost: Math.round(totalAllInCost),
    totalAllInCostPerMw,
    tierLevel: formatDataCentreTierLabel(ctx.tierLevel),
    pue: ctx.pue,
    breakdown: categories.map((cat) => ({
      component: cat.name,
      totalCost: Math.round(cat.cost),
      costPerMw: itLoadMw > 0 ? cat.cost / itLoadMw : 0,
      percentage: totalAllInCost > 0 ? (cat.cost / totalAllInCost) * 100 : 0,
    })),
  };
}

export function buildDataCentreOperationalRevenuesData(
  bundle: FeasibilityProjectBundle
): OfficeOperationalRevenuesData {
  const ctx = getDataCentreContext(bundle);
  const slice = useFinModelStore.getState().operational;
  const rev = slice.cashInflows?.dataCentreRevenue;
  const other = slice.cashInflows?.dataCentreOtherIncome;

  const power = rev?.annualPowerRevenue ?? 0;
  const space = rev?.annualSpaceRevenue ?? 0;
  const crossConnect = other?.annualCrossConnect ?? 0;
  const meteredPower = other?.annualMeteredPower ?? 0;
  const maintenanceMarkup = other?.annualMaintenanceMarkup ?? 0;
  const installation = other?.annualInstallation ?? 0;
  const total =
    power + space + crossConnect + meteredPower + maintenanceMarkup + installation;

  const row = (source: string, amount: number) => ({
    source,
    amount: Math.round(amount),
    sharePct: total > 0 ? Math.round((amount / total) * 100) : 0,
  });

  return {
    currency: ctx.currency,
    officeGla: ctx.whiteSpaceSqft,
    retailGla: 0,
    rows: [
      row("Power Lease Revenue", power),
      row("Space Lease Revenue", space),
      row("Cross-Connect Income", crossConnect),
      row("Metered Power Pass-Through", meteredPower),
      row("Maintenance Markup", maintenanceMarkup),
      row("Installation / Setup Fees", installation),
    ],
    totalRevenue: Math.round(total),
  };
}

export function buildDataCentreOperationalExpensesData(
  bundle: FeasibilityProjectBundle
): OfficeOperationalExpensesData {
  const ctx = getDataCentreContext(bundle);
  const opEx =
    useFinModelStore.getState().operational.cashInflows?.dataCentreOpEx;
  const rev = buildDataCentreOperationalRevenuesData(bundle).totalRevenue;

  const power = opEx?.annualPowerCost ?? 0;
  const maintenance = opEx?.annualMaintenance ?? 0;
  const labor = opEx?.annualLabor ?? 0;
  const insurance = opEx?.annualInsurance ?? 0;
  const propertyTax = opEx?.annualPropertyTax ?? 0;
  const security = opEx?.annualSecurity ?? 0;
  const water = opEx?.annualWaterUtilities ?? 0;
  const gAndA = opEx?.annualGAndA ?? 0;
  const mgmt = opEx?.annualMgmtFee ?? 0;
  const total =
    power +
    maintenance +
    labor +
    insurance +
    propertyTax +
    security +
    water +
    gAndA +
    mgmt;

  const row = (category: string, amount: number) => ({
    category,
    amount: Math.round(amount),
    shareOfRevenuePct: rev > 0 ? Math.round((amount / rev) * 1000) / 10 : 0,
  });

  return {
    currency: ctx.currency,
    rows: [
      row("Power Cost", power),
      row("Maintenance / Cooling Support", maintenance),
      row("Labor", labor),
      row("Insurance", insurance),
      row("Property Tax", propertyTax),
      row("Security", security),
      row("Water / Utilities", water),
      row("G&A", gAndA),
      row("Management Fee", mgmt),
    ],
    totalOpex: Math.round(total),
    totalRevenue: rev,
  };
}

export function buildDataCentreOperationalAssumptionsData(
  bundle: FeasibilityProjectBundle
): DataCentreOperationalAssumptionsData {
  const ctx = getDataCentreContext(bundle);
  const revenues = buildDataCentreOperationalRevenuesData(bundle);
  const expenses = buildDataCentreOperationalExpensesData(bundle);
  return {
    currency: ctx.currency,
    itLoadMw: ctx.itLoadMw,
    whiteSpaceSqft: ctx.whiteSpaceSqft,
    revenueRows: revenues.rows,
    totalRevenue: revenues.totalRevenue,
    opexRows: expenses.rows,
    totalOpex: expenses.totalOpex,
  };
}

export function buildDataCentreOperationalPnlData(
  bundle: FeasibilityProjectBundle
): OfficeOperationalPnLData {
  const slice = useFinModelStore.getState().operational;
  const series = resolveDataCentrePnlSeries({
    projectInfo: slice.projectInfo,
    dataCentreRevenue: slice.cashInflows?.dataCentreRevenue,
    dataCentreOtherIncome: slice.cashInflows?.dataCentreOtherIncome,
    dataCentreOpEx: slice.cashInflows?.dataCentreOpEx,
    dataCentreDepreciation: slice.cashInflows?.dataCentreDepreciation,
  });

  const zeros = () => padYearSeries([]);
  const powerRevenue = padYearSeries(series?.powerRevenue);
  const spaceRevenue = padYearSeries(series?.spaceRevenue);
  const otherIncome = padYearSeries(series?.totalOtherIncome);
  const totalRevenue = padYearSeries(series?.totalRevenue);

  const powerCost = padYearSeries(series?.powerCost);
  const maintenance = padYearSeries(series?.maintenance);
  const labor = padYearSeries(series?.labor);
  const insurance = padYearSeries(series?.insurance);
  const propertyTax = padYearSeries(series?.propertyTax);
  const security = padYearSeries(series?.security);
  const water = padYearSeries(series?.waterUtilities);
  const gAndA = padYearSeries(series?.gAndA);
  const mgmtFee = padYearSeries(series?.mgmtFee);
  const totalExpenses = padYearSeries(series?.totalOpEx);

  const ebitda = padYearSeries(series?.ebitda);
  const depreciationTotal = padYearSeries(series?.totalDa);
  const ebit = padYearSeries(series?.ebit);
  const netIncome = padYearSeries(series?.netIncome);

  return {
    currency: bundle.currency,
    years: Array.from({ length: PNL_YEARS }, (_, i) => `Y${i + 1}`),
    revenues: {
      officeRent: powerRevenue.map((v, i) => v + spaceRevenue[i]!),
      retailMinRent: zeros(),
      camRecoveries: otherIncome,
      parkingIncome: zeros(),
      advertisingIncome: zeros(),
      totalRevenue,
    },
    operatingExpenses: {
      cam: powerCost,
      propertyTax,
      insurance,
      marketing: zeros(),
      gAndA,
      managementFee: mgmtFee,
      renovationProvision: maintenance.map(
        (v, i) => v + labor[i]! + security[i]! + water[i]!
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

export function isDataCentreDevelopmentAssumptionsData(
  d: unknown
): d is DataCentreDevelopmentAssumptionsData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as DataCentreDevelopmentAssumptionsData).breakdown) &&
    typeof (d as DataCentreDevelopmentAssumptionsData).totalAllInCost ===
      "number" &&
    typeof (d as DataCentreDevelopmentAssumptionsData).itLoadMw === "number"
  );
}

export function isDataCentreCompetitiveAnalysisData(
  d: unknown
): d is DataCentreCompetitiveAnalysisData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray(
      (d as DataCentreCompetitiveAnalysisData).competitorPricing
    ) &&
    Array.isArray((d as DataCentreCompetitiveAnalysisData).competitorPUE)
  );
}

export function isDataCentreOperationalAssumptionsData(
  d: unknown
): d is DataCentreOperationalAssumptionsData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray(
      (d as DataCentreOperationalAssumptionsData).revenueRows
    ) &&
    Array.isArray((d as DataCentreOperationalAssumptionsData).opexRows)
  );
}

export function isDataCentreOperationalRevenuesData(
  d: unknown
): d is OfficeOperationalRevenuesData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as OfficeOperationalRevenuesData).rows)
  );
}

export function isDataCentreOperationalExpensesData(
  d: unknown
): d is OfficeOperationalExpensesData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as OfficeOperationalExpensesData).rows)
  );
}

export function isDataCentreOperationalPnLData(
  d: unknown
): d is OfficeOperationalPnLData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as OfficeOperationalPnLData).years) &&
    typeof (d as OfficeOperationalPnLData).revenues === "object"
  );
}

/** Convenience export used by commentary prompts. */
export function dataCentreAssetLabel(bundle: FeasibilityProjectBundle): string {
  const ctx = getDataCentreContext(bundle);
  return `${formatDataCentreTierLabel(ctx.tierLevel)} ${formatDataCentreSegmentLabel(ctx.segment)} Data Centre`;
}
