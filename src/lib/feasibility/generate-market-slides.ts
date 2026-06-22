import type {
  AggregatedProjectData,
  ChartDataPoint,
  FeasibilitySlide,
} from "@/types/feasibility";
import { buildHospitalityMarketSlides } from "@/lib/feasibility/build-hospitality-market-slides";
import { resolveCountryMacro } from "@/lib/feasibility/macro-data";

type CountryMacro = {
  gdp: ChartDataPoint[];
  inflation: ChartDataPoint[];
  population: ChartDataPoint[];
  tourismGrowth: ChartDataPoint[];
  hotelSupply: ChartDataPoint[];
  compAdr: ChartDataPoint[];
};

function toLegacyMacro(country: string): CountryMacro {
  const profile = resolveCountryMacro(country);
  return {
    gdp: profile.gdp.series,
    inflation: profile.inflation.series,
    population: profile.population.series,
    tourismGrowth: profile.tourismGrowth ?? [],
    hotelSupply: profile.hotelSupply ?? [],
    compAdr: profile.compAdr ?? [],
  };
}

function fmtMoney(amount: number, currency: string, compact = false): string {
  if (!Number.isFinite(amount)) return `${currency} 0`;
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}

function pct(n: number): string {
  return `${Math.round(n * 10) / 10}%`;
}

function gdpCagr(series: ChartDataPoint[]): number {
  const vals = series
    .filter((p) => typeof p.value === "number" && !String(p.year).includes("E"))
    .map((p) => p.value as number);
  if (vals.length < 2) return 4.2;
  const first = vals[0]!;
  const last = vals[vals.length - 1]!;
  const years = vals.length - 1;
  return Math.round((Math.pow(last / Math.max(0.1, first), 1 / years) - 1) * 1000) / 10;
}

function latestInflation(series: ChartDataPoint[]): number {
  const last = series.filter((p) => !String(p.year).includes("E")).at(-1);
  return typeof last?.rate === "number" ? last.rate : 2.1;
}

export function buildMacroSlides(project: AggregatedProjectData): FeasibilitySlide[] {
  const { location } = project;
  const macro = toLegacyMacro(location.country);
  const profile = resolveCountryMacro(location.country);
  const cagr = gdpCagr(macro.gdp);
  const inflationNow = latestInflation(macro.inflation);
  const popLatest = profile.population.current;
  const tourismLatest = macro.tourismGrowth.at(-2)?.arrivals ?? 15;
  const supplyLatest = macro.hotelSupply.at(-2)?.keys ?? 130000;

  return [
    {
      id: "macro-1",
      section: "market",
      title: `Macroeconomic and demographic overview — ${location.country}`,
      subtitle: "GDP",
      paragraphs: [],
      charts: [
        {
          type: "bar",
          title: "GDP Growth Trend & Projection (%)",
          data: macro.gdp,
          xKey: "year",
          yKeys: ["value"],
          colors: ["#10b981"],
        },
      ],
    },
    {
      id: "macro-2",
      section: "market",
      title: `Macroeconomic and demographic overview — ${location.country}`,
      subtitle: "Inflation Rate",
      paragraphs: [],
      charts: [
        {
          type: "line",
          title: "Inflation Rate Trend & Projection (%)",
          data: macro.inflation,
          xKey: "year",
          yKeys: ["rate"],
          colors: ["#f59e0b"],
        },
      ],
    },
    {
      id: "macro-3",
      section: "market",
      title: `Macroeconomic and demographic overview — ${location.country}`,
      subtitle: "Population",
      paragraphs: [],
      charts: [
        {
          type: "line",
          title: "Population (millions)",
          data: macro.population,
          xKey: "year",
          yKeys: ["population"],
          colors: ["#3b82f6"],
        },
      ],
    },
    {
      id: "macro-4",
      section: "market",
      layout: "full-width",
      title: `Macroeconomic and demographic overview — ${location.country}`,
      subtitle: "Macro Summary",
      paragraphs: [],
      bulletPoints: [
        `GDP CAGR (5Y): ${cagr}%`,
        `Latest inflation: ${inflationNow}%`,
        `Population: ${popLatest}m`,
        `International arrivals: ${tourismLatest}m (market)`,
        `Hotel stock: ${Number(supplyLatest).toLocaleString()} keys`,
      ],
    },
  ];
}

export function generateMarketSlides(
  project: AggregatedProjectData
): FeasibilitySlide[] {
  const { location } = project;
  const macro = toLegacyMacro(location.country);
  const c = project.currency;
  const tdcFmt = fmtMoney(project.tdc, c, true);
  const gdvFmt = fmtMoney(project.gdv, c, true);
  const tourismLatest = Number(macro.tourismGrowth.at(-2)?.arrivals ?? 15);
  const supplyLatest = Number(macro.hotelSupply.at(-2)?.keys ?? 130000);
  const compAdrLatest = Number(macro.compAdr.at(-1)?.adr ?? project.adrYear3);
  const compOccLatest = Number(macro.compAdr.at(-1)?.occupancy ?? project.occYear3);

  const hospitalitySlides = buildHospitalityMarketSlides(project, {
    macro,
    currency: c,
    tourismLatest,
    supplyLatest,
    compAdrLatest,
    compOccLatest,
    fmtMoney,
    pct,
  });

  const sqftPerKey =
    project.keys > 0 ? Math.round(project.bua / project.keys) : 0;
  const costPerKey = fmtMoney(
    project.tdc / Math.max(project.keys, 1),
    c
  );

  return [
    {
      id: "proj-1",
      section: "project",
      title: "Project Analysis",
      subtitle: "Overview — The Project",
      paragraphs: [
        `The proposed ${project.segment} ${project.assetType} is strategically located in ${location.city}, ${location.country}. The development comprises ${project.keys.toLocaleString()} keys and a total Built-Up Area (BUA) of ${project.bua.toLocaleString()} sqft, delivered over a ${project.constructionPeriod}-month construction horizon.`,
        `Demand generators for this location include strong corporate presence, proximity to international transport nodes, and growing tourism infrastructure. The development concept aligns with ${project.positioning} positioning, targeting business travelers, leisure tourists, and MICE segments as core target markets.`,
        `Primary competition comprises existing ${project.positioning} hotels within the immediate catchment of ${location.city}, competing on location, brand affiliation, and F&B programming. The subject asset differentiates through scale, service level, and operating efficiencies captured in the financial model.`,
        `Implied development intensity is ${sqftPerKey} sqft per key, consistent with ${project.positioning} hospitality product standards in ${location.city}. Operating concept emphasizes ${project.segment} with base-year ADR of ${fmtMoney(project.adrYear1, c)} and ${pct(project.occYear1)} occupancy, reflecting a pre-stabilization ramp to ${fmtMoney(project.adrYear3, c)} ADR at ${pct(project.occYear3)} occupancy by Year 3.`,
        `Capital expenditure totals ${tdcFmt}, inclusive of hard costs, soft costs, FF&E, and pre-opening captured in the financial model. Development cost equates to ${costPerKey} per key.`,
      ],
      tables: [
        {
          title: "Key Project Metrics",
          headers: ["Parameter", "Value"],
          rows: [
            ["Location", `${location.city}, ${location.country}`],
            ["Asset Type", `${project.segment} ${project.assetType}`],
            ["Total Keys", project.keys.toLocaleString()],
            ["Total BUA (sqft)", project.bua.toLocaleString()],
            ["Construction Period (months)", String(project.constructionPeriod)],
            ["Star / Positioning", project.positioning],
            ["Total Development Cost (TDC)", tdcFmt],
            ["Development Cost per Key", costPerKey],
          ],
        },
      ],
    },
    ...buildMacroSlides(project),
    ...hospitalitySlides,
  ];
}

export function buildMarketResearchCache(
  project: AggregatedProjectData
): Record<string, unknown> {
  const macro = toLegacyMacro(project.location.country);
  return {
    location: project.location,
    assetType: project.assetType,
    segment: project.segment,
    macro,
    generatedAt: new Date().toISOString(),
  };
}
