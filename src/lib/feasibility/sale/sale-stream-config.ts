export interface SaleStreamConfig {
  assetLabel: string;
  unitMetric: string;
  areaMetric: string;
  marketSlideTitles: {
    overview: string;
    supplyDemand: string;
    pricing: string;
    velocity: string;
    competition: string;
  };
  projectMetricsTable: {
    rows: string[];
  };
}

export const SALE_CONFIG: Record<string, SaleStreamConfig> = {
  "Residential-Landed": {
    assetLabel: "Landed Housing Estate",
    unitMetric: "Units",
    areaMetric: "Land Area (sqft)",
    marketSlideTitles: {
      overview: "Landed Housing Market Overview",
      supplyDemand: "Landed Housing Supply-Demand & Drivers",
      pricing: "Landed Freehold Market Pricing Benchmarking",
      velocity: "Sales Velocity, Absorption Trends & Target Buyer Profile",
      competition: "Competition Analysis - Landed Developments",
    },
    projectMetricsTable: {
      rows: [
        "Saleable BUA (sqft)",
        "Total BUA (sqft)",
        "Construction Period (months)",
        "Total Development Cost (TDC)",
        "Development Cost per Saleable BUA",
      ],
    },
  },
  "Residential-High-Rise": {
    assetLabel: "High-Rise Residential Tower",
    unitMetric: "Units",
    areaMetric: "BUA (sqft)",
    marketSlideTitles: {
      overview: "High-Rise Residential Market Overview",
      supplyDemand: "High-Rise Supply-Demand & Drivers",
      pricing: "High-Rise Freehold Market Pricing Benchmarking",
      velocity: "Sales Velocity, Absorption Trends & Target Buyer Profile",
      competition: "Competition Analysis - High-Rise Developments",
    },
    projectMetricsTable: {
      rows: [
        "Saleable BUA (sqft)",
        "Total BUA (sqft)",
        "Construction Period (months)",
        "Total Development Cost (TDC)",
        "Development Cost per Saleable BUA",
      ],
    },
  },
  "Commercial-Landed": {
    assetLabel: "Commercial Shop Lots",
    unitMetric: "Units",
    areaMetric: "Land Area (sqft)",
    marketSlideTitles: {
      overview: "Commercial Landed Market Overview",
      supplyDemand: "Shop Lots Supply-Demand & Drivers",
      pricing: "Shop Lots Market Pricing Benchmarking",
      velocity: "Sales Velocity, Absorption Trends & Target Buyer Profile",
      competition: "Competition Analysis - Shop Lot Developments",
    },
    projectMetricsTable: {
      rows: [
        "Saleable BUA (sqft)",
        "Total BUA (sqft)",
        "Construction Period (months)",
        "Total Development Cost (TDC)",
        "Development Cost per Saleable BUA",
      ],
    },
  },
  "Commercial-Strata-Office": {
    assetLabel: "Strata Office Tower",
    unitMetric: "Strata Units",
    areaMetric: "NLA (sqft)",
    marketSlideTitles: {
      overview: "Strata Office Market Overview",
      supplyDemand: "Strata Office Supply-Demand & Drivers",
      pricing: "Strata Office Market Pricing Benchmarking",
      velocity: "Sales Velocity, Absorption Trends & Target Buyer Profile",
      competition: "Competition Analysis - Strata Office Developments",
    },
    projectMetricsTable: {
      rows: [
        "Saleable NLA (sqft)",
        "Total NLA (sqft)",
        "Construction Period (months)",
        "Total Development Cost (TDC)",
        "Development Cost per Saleable NLA",
      ],
    },
  },
};

const SUBTYPE_TO_CONFIG_KEY: Record<string, keyof typeof SALE_CONFIG> = {
  residential_landed: "Residential-Landed",
  residential_high_rise: "Residential-High-Rise",
  commercial_landed: "Commercial-Landed",
  commercial_strata_office: "Commercial-Strata-Office",
  "residential-landed": "Residential-Landed",
  "residential-hi-rise": "Residential-High-Rise",
  "commercial-landed": "Commercial-Landed",
  "commercial-strata-office": "Commercial-Strata-Office",
};

export function resolveSaleConfigKey(
  buildingSubType?: string | null
): keyof typeof SALE_CONFIG {
  if (!buildingSubType) return "Residential-High-Rise";
  const normalized = buildingSubType.toLowerCase().replace(/\s+/g, "_");
  return (
    SUBTYPE_TO_CONFIG_KEY[normalized] ??
    SUBTYPE_TO_CONFIG_KEY[buildingSubType] ??
    "Residential-High-Rise"
  );
}

export function getSaleStreamConfig(
  buildingSubType?: string | null
): SaleStreamConfig {
  return SALE_CONFIG[resolveSaleConfigKey(buildingSubType)];
}
