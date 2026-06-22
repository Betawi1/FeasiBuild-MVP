import type {
  ImplicationsData,
  RiskFactorsData,
  SaleFeasibilityBundle,
  SlideChart,
  SuccessFactorsData,
} from "@/types/feasibility";
import { getSaleStreamConfig } from "@/lib/feasibility/sale/sale-stream-config";

export interface SaleMarketChartsInput {
  projectInfo?: {
    city?: string;
    country?: string;
    buildingType?: string;
    currency?: string;
  };
  marketData?: Record<string, string | number | undefined>;
  component1Data?: {
    buildingType?: string;
    contingency?: string;
    amenities?: string;
    totalBUA?: number;
  };
  component2Data?: {
    avgPricePSF?: number;
    saleableBUA?: number;
  };
}

export interface SaleMarketChartsBundle {
  supplyDemand: SlideChart;
  pricing: SlideChart;
  velocity: SlideChart;
  historicalTrends: SlideChart;
}

function bundleToMarketInput(bundle: SaleFeasibilityBundle): SaleMarketChartsInput {
  return {
    projectInfo: {
      city: bundle.location.city,
      country: bundle.location.country,
      buildingType: bundle.buildingType,
      currency: bundle.currency,
    },
    marketData: {},
    component1Data: {
      buildingType: bundle.buildingType,
      contingency: `${bundle.cashOutflows.contingencyPercent ?? 7.5}%`,
      amenities: "Modern amenities, efficient layouts, and quality finishes",
      totalBUA: bundle.saleMetrics.totalArea,
    },
    component2Data: {
      avgPricePSF: bundle.saleMetrics.avgPricePsf,
      saleableBUA: bundle.saleMetrics.saleableArea,
    },
  };
}

function marketScale(country?: string): number {
  const c = (country ?? "").toLowerCase();
  if (c.includes("malaysia")) return 0.55;
  if (c.includes("oman")) return 0.25;
  if (c.includes("australia")) return 0.7;
  if (c.includes("saudi")) return 0.85;
  return 1;
}

/** Build sale market chart set for supply/demand, pricing, velocity, and price trends. */
export function buildSaleMarketCharts(
  data: SaleMarketChartsInput
): SaleMarketChartsBundle {
  const avgPrice = data.component2Data?.avgPricePSF || 1500;
  const city = data.projectInfo?.city ?? "Dubai";
  const country = data.projectInfo?.country ?? "UAE";
  const scale = marketScale(country);
  const baseSupply = Math.round(12500 * scale);
  const baseAbsorption = Math.round(11200 * scale);

  const supplyDemand: SlideChart = {
    title: `Supply Pipeline & Absorption Trends — ${city}`,
    type: "bar",
    data: [
      { year: "2021", supply: baseSupply, absorption: baseAbsorption },
      { year: "2022", supply: Math.round(baseSupply * 1.14), absorption: Math.round(baseAbsorption * 1.17) },
      { year: "2023", supply: Math.round(baseSupply * 1.26), absorption: Math.round(baseAbsorption * 1.29) },
      { year: "2024E", supply: Math.round(baseSupply * 1.38), absorption: Math.round(baseAbsorption * 1.41) },
      { year: "2025E", supply: Math.round(baseSupply * 1.48), absorption: Math.round(baseAbsorption * 1.53) },
      { year: "2026E", supply: Math.round(baseSupply * 1.54), absorption: Math.round(baseAbsorption * 1.61) },
    ],
    xKey: "year",
    yKeys: ["supply", "absorption"],
    colors: ["#94a3b8", "#10b981"],
  };

  const pricing: SlideChart = {
    title: `Competitive Pricing Benchmarking (PSF) — ${city}`,
    type: "bar",
    data: [
      { project: `${city} Comp A`, price: Math.round(avgPrice * 0.9), psf: Math.round(avgPrice * 0.9) },
      { project: `${city} Comp B`, price: Math.round(avgPrice * 0.95), psf: Math.round(avgPrice * 0.95) },
      { project: `${city} Comp C`, price: Math.round(avgPrice * 0.98), psf: Math.round(avgPrice * 0.98) },
      {
        project: "Subject Project",
        price: avgPrice,
        psf: avgPrice,
        isSubject: 1,
      },
      { project: `${city} Comp D`, price: Math.round(avgPrice * 1.05), psf: Math.round(avgPrice * 1.05) },
    ],
    xKey: "project",
    yKeys: ["psf"],
    colors: ["#6366f1"],
  };

  const velocity: SlideChart = {
    title: `Sales Absorption Rate by Project — ${city}`,
    type: "bar",
    data: [
      { project: `${city} Phase 1`, rate: 65, months: 18 },
      { project: `${city} Central Residences`, rate: 72, months: 15 },
      { project: `${city} District Tower`, rate: 58, months: 22 },
      { project: "Subject Project", rate: 60, months: 20, isSubject: 1 },
      { project: `${city} Waterfront`, rate: 45, months: 28 },
    ],
    xKey: "project",
    yKeys: ["rate"],
    colors: ["#059669"],
  };

  const priceBase = Math.round(avgPrice * 0.78);
  const historicalTrends: SlideChart = {
    title: `Historical Price Trends (PSF) — ${city}`,
    type: "line",
    data: [
      { year: "2019", price: priceBase },
      { year: "2020", price: Math.round(priceBase * 1.03) },
      { year: "2021", price: Math.round(priceBase * 1.09) },
      { year: "2022", price: Math.round(priceBase * 1.15) },
      { year: "2023", price: Math.round(priceBase * 1.22) },
      { year: "2024", price: Math.round(priceBase * 1.28) },
      { year: "2025E", price: Math.round(avgPrice * 1.05) },
      { year: "2026E", price: Math.round(avgPrice * 1.1) },
    ],
    xKey: "year",
    yKeys: ["price"],
    colors: ["#3b82f6"],
  };

  return { supplyDemand, pricing, velocity, historicalTrends };
}

export function getSaleMarketChartsForSection(
  sectionId: string,
  charts: SaleMarketChartsBundle
): SlideChart[] | undefined {
  switch (sectionId) {
    case "supplyDemand":
      return [charts.supplyDemand, charts.historicalTrends];
    case "pricing":
      return [charts.pricing];
    case "velocity":
      return [charts.velocity];
    case "overview":
      return [
        {
          type: "line",
          title: "Transaction Volume Index (2019=100)",
          data: [
            { year: "2019", volume: 100 },
            { year: "2020", volume: 72 },
            { year: "2021", volume: 85 },
            { year: "2022", volume: 91 },
            { year: "2023", volume: 88 },
            { year: "2024", volume: 94 },
            { year: "2025E", volume: 98 },
          ],
          xKey: "year",
          yKeys: ["volume"],
          colors: ["#0ea5e9"],
        },
      ];
    case "competition":
      return [
        {
          type: "bar",
          title: "Competing Pipeline (units)",
          data: [
            { quarter: "Q1", units: 180 },
            { quarter: "Q2", units: 220 },
            { quarter: "Q3", units: 195 },
            { quarter: "Q4", units: 160 },
          ],
          xKey: "quarter",
          yKeys: ["units"],
          colors: ["#f59e0b"],
        },
      ];
    default:
      return undefined;
  }
}

/** Convenience: build charts directly from feasibility bundle. */
export function buildSaleMarketChartsFromBundle(
  bundle: SaleFeasibilityBundle
): SaleMarketChartsBundle {
  return buildSaleMarketCharts(bundleToMarketInput(bundle));
}

export function buildSaleImplicationsData(
  data: SaleMarketChartsInput | SaleFeasibilityBundle
): ImplicationsData {
  const input =
    "saleMetrics" in data ? bundleToMarketInput(data) : data;
  const { projectInfo, component1Data, component2Data } = input;
  const city = projectInfo?.city ?? "Dubai";
  const currency = projectInfo?.currency ?? "AED";
  const avgPsf = component2Data?.avgPricePSF ?? 1500;
  const buildingType =
    component1Data?.buildingType ?? projectInfo?.buildingType ?? "residential";

  return {
    hospitalityImplications: [
      {
        number: 1,
        title: "Market implications",
        description: `AI-generated ${projectInfo?.country ?? "country"}-specific implications for ${buildingType} in ${city} at ${currency} ${avgPsf}/sqft will populate on report generation.`,
      },
    ],
    keyTakeaways: [
      `Regenerate feasibility study with AI enabled for ${projectInfo?.country ?? "local"} market analysis.`,
    ],
  };
}

export function buildSaleRiskFactorsData(
  data: SaleMarketChartsInput | SaleFeasibilityBundle
): RiskFactorsData {
  const input =
    "saleMetrics" in data ? bundleToMarketInput(data) : data;
  const { component1Data } = input;

  return {
    marketThreats: [
      {
        risk: "Market risks",
        effect: "AI-generated country-specific risk analysis will populate on report generation.",
        mitigatingFactors: ["Phased launch strategy", "Differentiated product mix"],
      },
    ],
    projectWeaknesses: [
      {
        weakness: "Project risks",
        effect: `Contingency ${component1Data?.contingency ?? "per model"} — detailed risk narrative generated via AI.`,
        mitigatingFactors: ["Contingency reserve", "Fixed-price contracts"],
      },
    ],
  };
}

export function buildSaleSuccessFactorsData(
  data: SaleMarketChartsInput | SaleFeasibilityBundle
): SuccessFactorsData {
  const input =
    "saleMetrics" in data ? bundleToMarketInput(data) : data;
  const { projectInfo, component1Data, component2Data } = input;
  const city = projectInfo?.city ?? "Dubai";
  const currency = projectInfo?.currency ?? "AED";
  const avgPsf = component2Data?.avgPricePSF ?? 1500;

  return {
    marketOpportunities: [
      {
        factor: "Market opportunities",
        effect: `AI-generated success factors for ${city} at ${currency} ${avgPsf}/sqft will populate on report generation.`,
      },
    ],
    projectStrengths: [
      {
        strength: "Project strengths",
        effect: component1Data?.amenities ?? "Product differentiation per development assumptions.",
      },
    ],
    mainOutcomes: [
      `Regenerate feasibility study with AI enabled for ${projectInfo?.country ?? "local"} success factor analysis.`,
    ],
  };
}
