import type {
  DemandChartData,
  FeasibilitySlide,
  OutlookMetric,
  TravelTourismDemandData,
  TravelTourismOutlookData,
} from "@/types/feasibility";

type TourismPoint = { year: string; arrivals: number };

/** Country-specific T&T demand scaling (USD millions, WTTC-inspired profiles). */
const TT_PROFILE: Record<
  string,
  {
    baseMultiplier: number;
    consumptionShare: number;
    capitalShare: number;
    govtShare: number;
    exportShare: number;
    nominalCagr: number;
    realGrowth: number;
    outlook: Omit<OutlookMetric, "name">[];
  }
> = {
  UAE: {
    baseMultiplier: 6200,
    consumptionShare: 0.58,
    capitalShare: 0.22,
    govtShare: 0.12,
    exportShare: 0.08,
    nominalCagr: 13.4,
    realGrowth: 5.0,
    outlook: [
      {
        shortTermGrowth: 8.9,
        shortTermDescription:
          "Expo legacy, airline capacity expansion, and visa reforms sustain inbound leisure and business travel through 2025.",
        longTermGrowth: 5.2,
      },
      {
        shortTermGrowth: 6.4,
        shortTermDescription:
          "Hospitality, aviation, and retail hiring accelerate as new hotel keys and attractions enter operation.",
        longTermGrowth: 4.1,
      },
      {
        shortTermGrowth: 11.2,
        shortTermDescription:
          "International visitor spend rebounds with high-yield source markets and extended average length of stay.",
        longTermGrowth: 6.8,
      },
      {
        shortTermGrowth: 7.5,
        shortTermDescription:
          "Domestic tourism and resident discretionary travel support personal T&T consumption alongside inbound demand.",
        longTermGrowth: 4.6,
      },
      {
        shortTermGrowth: 9.1,
        shortTermDescription:
          "Pipeline hotel, mixed-use, and entertainment projects drive capital formation across gateway emirates.",
        longTermGrowth: 5.5,
      },
      {
        shortTermGrowth: 5.8,
        shortTermDescription:
          "Public-sector tourism promotion, infrastructure, and event hosting budgets remain elevated post-recovery.",
        longTermGrowth: 3.9,
      },
    ],
  },
  Oman: {
    baseMultiplier: 1850,
    consumptionShare: 0.54,
    capitalShare: 0.26,
    govtShare: 0.14,
    exportShare: 0.06,
    nominalCagr: 9.8,
    realGrowth: 4.2,
    outlook: [
      {
        shortTermGrowth: 5.6,
        shortTermDescription:
          "Vision 2040 tourism diversification and new air routes lift GDP contribution from travel segments.",
        longTermGrowth: 4.4,
      },
      {
        shortTermGrowth: 4.8,
        shortTermDescription:
          "Resort openings and airport expansion support direct and indirect employment in coastal destinations.",
        longTermGrowth: 3.6,
      },
      {
        shortTermGrowth: 7.2,
        shortTermDescription:
          "Heritage, nature, and cruise tourism expand visitor export receipts beyond Muscat gateway markets.",
        longTermGrowth: 5.1,
      },
      {
        shortTermGrowth: 5.1,
        shortTermDescription:
          "Domestic getaways and GCC cross-border travel underpin personal T&T outlays.",
        longTermGrowth: 3.8,
      },
      {
        shortTermGrowth: 8.4,
        shortTermDescription:
          "Integrated tourism complexes and hospitality assets under development attract private capital.",
        longTermGrowth: 4.9,
      },
      {
        shortTermGrowth: 4.3,
        shortTermDescription:
          "Government continues destination marketing and infrastructure co-investment under national tourism strategy.",
        longTermGrowth: 3.2,
      },
    ],
  },
};

const OUTLOOK_METRIC_NAMES = [
  "GDP",
  "Employment",
  "Visitor Exports",
  "Personal T&T",
  "Capital Investment",
  "Government Expenditure",
] as const;

function resolveProfile(country: string) {
  const key = Object.keys(TT_PROFILE).find((k) =>
    country.toLowerCase().includes(k.toLowerCase())
  );
  return key ? TT_PROFILE[key]! : TT_PROFILE.UAE;
}

function buildChartData(
  tourismSeries: TourismPoint[],
  profile: (typeof TT_PROFILE)[string]
): DemandChartData[] {
  const historical = tourismSeries.filter((p) => !String(p.year).includes("E"));
  const projected = tourismSeries.find((p) => String(p.year).includes("E"));
  const slice = historical.slice(-5);
  const years: TourismPoint[] = projected ? [...slice, projected] : slice;

  const baseArrivals = years[0]?.arrivals ?? 1;
  return years.map((point) => {
    const scale = point.arrivals / baseArrivals;
    const total = profile.baseMultiplier * scale;
    return {
      year: String(point.year),
      consumption: Math.round(total * profile.consumptionShare),
      capitalInvestment: Math.round(total * profile.capitalShare),
      governmentExpenditure: Math.round(total * profile.govtShare),
      nonVisitorExports: Math.round(total * profile.exportShare),
    };
  });
}

function buildDemandBullets(
  country: string,
  city: string,
  chartData: DemandChartData[],
  profile: (typeof TT_PROFILE)[string]
): string[] {
  const latest = chartData.at(-1)!;
  const total =
    latest.consumption +
    latest.capitalInvestment +
    latest.governmentExpenditure +
    latest.nonVisitorExports;
  const consumptionPct = Math.round((latest.consumption / total) * 100);
  return [
    `Travel and tourism demand in ${country} reached approximately USD ${total.toLocaleString("en-US")} million in ${latest.year}, with visitor consumption representing ${consumptionPct}% of total T&T demand.`,
    `Capital investment into hospitality, attractions, and transport infrastructure remains a primary growth driver for ${city} and comparable gateway markets.`,
    `Government expenditure on destination promotion, visa facilitation, and event hosting supports sustained inbound demand recovery.`,
    `Non-visitor exports—including business travel services and domestic supplier linkages—add diversification to the T&T demand stack.`,
    `Nominal T&T demand expanded at a ${profile.nominalCagr}% CAGR over the observation window, outpacing real GDP growth of ${profile.realGrowth}%.`,
  ];
}

export function generateTravelTourismDemandData(
  country: string,
  city: string,
  tourismSeries: TourismPoint[]
): TravelTourismDemandData {
  const profile = resolveProfile(country);
  const series =
    tourismSeries.length > 0
      ? tourismSeries
      : [
          { year: "2019", arrivals: profile.baseMultiplier / 350 },
          { year: "2020", arrivals: profile.baseMultiplier / 900 },
          { year: "2021", arrivals: profile.baseMultiplier / 700 },
          { year: "2022", arrivals: profile.baseMultiplier / 400 },
          { year: "2023", arrivals: profile.baseMultiplier / 360 },
          { year: "2024E", arrivals: profile.baseMultiplier / 335 },
        ];
  const chartData = buildChartData(series, profile);
  return {
    chartData,
    cagr: `${profile.nominalCagr}%`,
    realGrowth: `${profile.realGrowth}%`,
    bulletPoints: buildDemandBullets(country, city, chartData, profile),
  };
}

export function generateTravelTourismOutlookData(
  country: string,
  city: string
): TravelTourismOutlookData {
  const profile = resolveProfile(country);
  const metrics: OutlookMetric[] = OUTLOOK_METRIC_NAMES.map((name, i) => ({
    name,
    ...profile.outlook[i]!,
  }));

  return {
    metrics,
    mainTakeaway: `${country}'s travel and tourism sector is positioned for above-GDP growth over the next decade, with ${city} benefiting from sustained visitor exports, capital investment, and employment gains through 2035.`,
  };
}

export function buildTravelTourismSlides(
  country: string,
  city: string,
  tourismSeries: TourismPoint[]
): FeasibilitySlide[] {
  const demandData = generateTravelTourismDemandData(
    country,
    city,
    tourismSeries
  );
  const outlookData = generateTravelTourismOutlookData(country, city);

  return [
    {
      id: "hosp-demand",
      section: "market",
      title: "Industry / Market Analysis",
      subtitle: "Travel and Tourism demand",
      paragraphs: [],
      data: demandData,
    },
    {
      id: "hosp-outlook",
      section: "market",
      title: "Industry / Market Analysis",
      subtitle: "Travel and Tourism outlook",
      paragraphs: [],
      data: outlookData,
    },
  ];
}

export function isTravelTourismDemandData(
  data: unknown
): data is TravelTourismDemandData {
  if (!data || typeof data !== "object") return false;
  const d = data as TravelTourismDemandData;
  return (
    Array.isArray(d.chartData) &&
    Array.isArray(d.bulletPoints) &&
    typeof d.cagr === "string"
  );
}

export function isTravelTourismOutlookData(
  data: unknown
): data is TravelTourismOutlookData {
  if (!data || typeof data !== "object") return false;
  const d = data as TravelTourismOutlookData;
  return (
    Array.isArray(d.metrics) &&
    d.metrics.length === 6 &&
    typeof d.mainTakeaway === "string"
  );
}
