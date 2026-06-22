import type { AggregatedProjectData, ChartDataPoint, FeasibilitySlide } from "@/types/feasibility";
import { buildTravelTourismSlides } from "@/lib/feasibility/generate-travel-tourism-data";
import {
  buildHospCompetition1Slide,
  buildHospGuestsSlide,
  buildHospImplicationsSlide,
  buildHospLengthOfStaySlide,
  buildHospRevenuesSlide,
  buildHospRiskFactorsSlide,
  buildHospSuccessFactorsSlide,
  buildHospSummarySlide,
} from "@/lib/feasibility/generate-hospitality-extended-data";

type HospitalityMacro = {
  tourismGrowth: ChartDataPoint[];
  hotelSupply: ChartDataPoint[];
  compAdr: ChartDataPoint[];
};

type HospitalitySlideContext = {
  macro: HospitalityMacro;
  currency: string;
  tourismLatest: number;
  supplyLatest: number;
  compAdrLatest: number;
  compOccLatest: number;
  fmtMoney: (amount: number, currency: string, compact?: boolean) => string;
  pct: (n: number) => string;
};

export function buildHospitalityMarketSlides(
  project: AggregatedProjectData,
  ctx: HospitalitySlideContext
): FeasibilitySlide[] {
  const { location } = project;
  const { macro, currency: c, tourismLatest, supplyLatest, compAdrLatest, compOccLatest, fmtMoney, pct } = ctx;

  const tourismSeries = macro.tourismGrowth
    .filter((p) => typeof p.arrivals === "number")
    .map((p) => ({ year: String(p.year), arrivals: p.arrivals as number }));

  const historicalArrivals = macro.tourismGrowth.filter(
    (p) => !String(p.year).includes("E")
  );
  const projectedArrivals = macro.tourismGrowth.filter((p) =>
    String(p.year).includes("E")
  );

  const travelTourismSlides = buildTravelTourismSlides(
    location.country,
    location.city,
    tourismSeries
  );

  const adrOccupancySlide: FeasibilitySlide = {
    id: "adr-occupancy",
    section: "market",
    title: "Industry / Market Analysis",
    subtitle: "ADR & Occupancy — Competitive Set",
    paragraphs: [
      `The competitive set in ${location.city} achieved market ADR of approximately ${fmtMoney(compAdrLatest, c)} with ${pct(compOccLatest)} occupancy in the latest year, versus the subject stabilized profile of ${fmtMoney(project.adrYear3, c)} ADR at ${pct(project.occYear3)} occupancy.`,
      `Year 1 underwriting at ${fmtMoney(project.adrYear1, c)} / ${pct(project.occYear1)} reflects ramp-up; RevPAR parity with the comp set is targeted by Year 3.`,
    ],
    charts: [
      {
        type: "line",
        title: "Market ADR Index",
        data: macro.compAdr,
        xKey: "year",
        yKeys: ["adr"],
        colors: ["#10b981"],
      },
      {
        type: "line",
        title: "Market Occupancy (%)",
        data: macro.compAdr,
        xKey: "year",
        yKeys: ["occupancy"],
        colors: ["#3b82f6"],
      },
    ],
  };

  const supplySlide: FeasibilitySlide = {
    id: "hosp-supply",
    section: "market",
    title: "Industry / Market Analysis",
    subtitle: "Hotel Supply Pipeline",
    paragraphs: [
      `Existing competitive stock in ${location.country} totals approximately ${Number(supplyLatest).toLocaleString()} keys, with measured pipeline delivery over 2024–2026. Net absorption in ${location.city} has remained positive for ${project.positioning} assets.`,
      `The subject ${project.keys}-key development represents incremental supply that must achieve ${pct(project.occYear3)} stabilized occupancy to align with market absorption curves.`,
    ],
    charts: [
      {
        type: "bar",
        title: "Hotel Keys Stock",
        data: macro.hotelSupply.map((p) => ({
          ...p,
          keys: Math.round((p.keys as number) / 1000),
        })),
        xKey: "year",
        yKeys: ["keys"],
        colors: ["#0d9488"],
      },
    ],
    tables: [
      {
        title: "Supply Context",
        headers: ["Indicator", "Value"],
        rows: [
          ["Market stock (keys)", Number(supplyLatest).toLocaleString()],
          ["Subject keys", project.keys.toLocaleString()],
          [
            "Share of stock",
            project.keys > 0 ? pct((project.keys / supplyLatest) * 100) : "—",
          ],
        ],
        footer: "Subject share based on market stock estimate.",
      },
    ],
  };

  const arrivalsHistoricalSlide: FeasibilitySlide = {
    id: "hosp-arrivals-historical",
    section: "market",
    title: "Industry / Market Analysis",
    subtitle: "Historical tourist arrivals",
    paragraphs: [
      `International visitor arrivals to ${location.country} reached ${tourismLatest} million in the latest observed year, with ${location.city} capturing a disproportionate share of luxury and upper-upscale room nights.`,
      `Historical arrival trends reflect recovery from the 2020 trough, with sustained growth driven by aviation capacity, events, and visa reforms.`,
    ],
    charts: [
      {
        type: "bar",
        title: "Historical International Arrivals (millions)",
        data: historicalArrivals,
        xKey: "year",
        yKeys: ["arrivals"],
        colors: ["#6366f1"],
      },
    ],
  };

  const arrivalsProjectedSlide: FeasibilitySlide = {
    id: "hosp-arrivals-projected",
    section: "market",
    title: "Industry / Market Analysis",
    subtitle: "Projected number of tourist arrivals",
    paragraphs: [
      `Forward projections indicate continued expansion of international arrivals to ${location.country}, supporting incremental hotel demand in ${location.city} through the outer forecast horizon.`,
      `Event calendars, airline seat capacity, and visa liberalization continue to drive shoulder-season demand, benefiting ${project.positioning} hotels with MICE and leisure mix.`,
    ],
    charts: [
      {
        type: "bar",
        title: "Projected International Arrivals (millions)",
        data: projectedArrivals,
        xKey: "year",
        yKeys: ["arrivals"],
        colors: ["#8b5cf6"],
      },
    ],
  };

  return [
    ...travelTourismSlides,
    arrivalsHistoricalSlide,
    arrivalsProjectedSlide,
    adrOccupancySlide,
    buildHospRevenuesSlide(project),
    supplySlide,
    buildHospGuestsSlide(project),
    buildHospLengthOfStaySlide(project),
    buildHospCompetition1Slide(project),
    buildHospSummarySlide(project),
    buildHospImplicationsSlide(project),
    buildHospSuccessFactorsSlide(project),
    buildHospRiskFactorsSlide(project),
  ];
}
