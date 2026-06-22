import type { ChartDataPoint } from "@/types/feasibility";

export type MacroSection = "GDP" | "Inflation" | "Population" | "Macro Summary";

export interface CountryMacroProfile {
  gdp: {
    current: number; // USD billions
    cagr5y: number;
    forecast: number;
    series: ChartDataPoint[];
  };
  inflation: {
    current: number;
    target: number;
    series: ChartDataPoint[];
  };
  population: {
    current: number; // millions
    growthRate: number;
    urbanizationPct: number;
    series: ChartDataPoint[];
  };
  tourismGrowth?: ChartDataPoint[];
  hotelSupply?: ChartDataPoint[];
  compAdr?: ChartDataPoint[];
}

function inflationSeries(current: number, target: number): ChartDataPoint[] {
  return [
    { year: "2019", rate: 2.0 },
    { year: "2020", rate: -1.2 },
    { year: "2021", rate: 2.5 },
    { year: "2022", rate: 3.8 },
    { year: "2023", rate: 2.8 },
    { year: "2024", rate: current },
    { year: "2025E", rate: target },
    { year: "2026E", rate: target },
  ];
}

function populationSeries(current: number): ChartDataPoint[] {
  const years = ["2019", "2020", "2021", "2022", "2023", "2024", "2025E", "2026E"];
  const factors = [0.94, 0.95, 0.97, 0.98, 0.99, 1.0, 1.01, 1.02];
  return years.map((year, i) => ({
    year,
    population: Math.round(current * factors[i]! * 10) / 10,
  }));
}

export const COUNTRY_MACRO_DATA: Record<string, CountryMacroProfile> = {
  "United Arab Emirates": {
    gdp: {
      current: 509,
      cagr5y: 4.2,
      forecast: 4.0,
      series: [
        { year: "2019", value: 1.7 },
        { year: "2020", value: -5.0 },
        { year: "2021", value: 3.4 },
        { year: "2022", value: 7.9 },
        { year: "2023", value: 3.6 },
        { year: "2024", value: 4.0 },
        { year: "2025E", value: 4.2 },
        { year: "2026E", value: 3.8 },
      ],
    },
    inflation: { current: 2.3, target: 2.0, series: inflationSeries(2.3, 2.0) },
    population: {
      current: 10.7,
      growthRate: 1.8,
      urbanizationPct: 87,
      series: populationSeries(10.7),
    },
    tourismGrowth: [
      { year: "2019", arrivals: 16.7 },
      { year: "2020", arrivals: 5.5 },
      { year: "2021", arrivals: 7.3 },
      { year: "2022", arrivals: 14.4 },
      { year: "2023", arrivals: 17.2 },
      { year: "2024", arrivals: 18.5 },
      { year: "2025E", arrivals: 19.8 },
      { year: "2026E", arrivals: 21.0 },
    ],
    hotelSupply: [
      { year: "2019", keys: 118000 },
      { year: "2020", keys: 121000 },
      { year: "2021", keys: 125000 },
      { year: "2022", keys: 132000 },
      { year: "2023", keys: 138000 },
      { year: "2024", keys: 143000 },
      { year: "2025E", keys: 148000 },
      { year: "2026E", keys: 152000 },
    ],
    compAdr: [
      { year: "2019", adr: 520, occupancy: 76 },
      { year: "2020", adr: 410, occupancy: 58 },
      { year: "2021", adr: 480, occupancy: 65 },
      { year: "2022", adr: 560, occupancy: 72 },
      { year: "2023", adr: 590, occupancy: 74 },
      { year: "2024", adr: 610, occupancy: 75 },
    ],
  },
  Malaysia: {
    gdp: {
      current: 430,
      cagr5y: 4.1,
      forecast: 4.5,
      series: [
        { year: "2019", value: 4.4 },
        { year: "2020", value: -5.5 },
        { year: "2021", value: 3.3 },
        { year: "2022", value: 8.7 },
        { year: "2023", value: 3.6 },
        { year: "2024", value: 4.2 },
        { year: "2025E", value: 4.5 },
        { year: "2026E", value: 4.3 },
      ],
    },
    inflation: { current: 2.5, target: 2.0, series: inflationSeries(2.5, 2.0) },
    population: {
      current: 34.2,
      growthRate: 1.1,
      urbanizationPct: 78,
      series: populationSeries(34.2),
    },
    tourismGrowth: [
      { year: "2019", arrivals: 26.1 },
      { year: "2020", arrivals: 4.3 },
      { year: "2021", arrivals: 0.1 },
      { year: "2022", arrivals: 10.1 },
      { year: "2023", arrivals: 20.1 },
      { year: "2024", arrivals: 25.0 },
      { year: "2025E", arrivals: 27.5 },
      { year: "2026E", arrivals: 29.0 },
    ],
    hotelSupply: [
      { year: "2019", keys: 285000 },
      { year: "2020", keys: 290000 },
      { year: "2021", keys: 288000 },
      { year: "2022", keys: 295000 },
      { year: "2023", keys: 302000 },
      { year: "2024", keys: 310000 },
      { year: "2025E", keys: 318000 },
      { year: "2026E", keys: 325000 },
    ],
    compAdr: [
      { year: "2019", adr: 280, occupancy: 68 },
      { year: "2020", adr: 195, occupancy: 42 },
      { year: "2021", adr: 210, occupancy: 48 },
      { year: "2022", adr: 265, occupancy: 62 },
      { year: "2023", adr: 290, occupancy: 66 },
      { year: "2024", adr: 305, occupancy: 68 },
    ],
  },
  Oman: {
    gdp: {
      current: 115,
      cagr5y: 2.8,
      forecast: 3.1,
      series: [
        { year: "2019", value: 0.9 },
        { year: "2020", value: -2.8 },
        { year: "2021", value: 3.0 },
        { year: "2022", value: 4.3 },
        { year: "2023", value: 1.2 },
        { year: "2024", value: 2.5 },
        { year: "2025E", value: 3.1 },
        { year: "2026E", value: 3.4 },
      ],
    },
    inflation: { current: 1.4, target: 1.6, series: inflationSeries(1.4, 1.6) },
    population: {
      current: 5.1,
      growthRate: 2.0,
      urbanizationPct: 87,
      series: populationSeries(5.1),
    },
    tourismGrowth: [
      { year: "2019", arrivals: 3.5 },
      { year: "2020", arrivals: 0.9 },
      { year: "2021", arrivals: 1.2 },
      { year: "2022", arrivals: 2.8 },
      { year: "2023", arrivals: 3.2 },
      { year: "2024", arrivals: 3.6 },
      { year: "2025E", arrivals: 4.0 },
      { year: "2026E", arrivals: 4.4 },
    ],
    hotelSupply: [
      { year: "2019", keys: 18500 },
      { year: "2020", keys: 19200 },
      { year: "2021", keys: 19800 },
      { year: "2022", keys: 20500 },
      { year: "2023", keys: 21200 },
      { year: "2024", keys: 22000 },
      { year: "2025E", keys: 22800 },
      { year: "2026E", keys: 23500 },
    ],
    compAdr: [
      { year: "2019", adr: 95, occupancy: 68 },
      { year: "2020", adr: 72, occupancy: 52 },
      { year: "2021", adr: 82, occupancy: 58 },
      { year: "2022", adr: 98, occupancy: 65 },
      { year: "2023", adr: 105, occupancy: 67 },
      { year: "2024", adr: 110, occupancy: 68 },
    ],
  },
  Australia: {
    gdp: {
      current: 1750,
      cagr5y: 2.4,
      forecast: 2.6,
      series: [
        { year: "2019", value: 1.9 },
        { year: "2020", value: -2.0 },
        { year: "2021", value: 5.4 },
        { year: "2022", value: 3.8 },
        { year: "2023", value: 2.1 },
        { year: "2024", value: 1.5 },
        { year: "2025E", value: 2.6 },
        { year: "2026E", value: 2.4 },
      ],
    },
    inflation: { current: 3.2, target: 2.5, series: inflationSeries(3.2, 2.5) },
    population: {
      current: 27.4,
      growthRate: 1.6,
      urbanizationPct: 86,
      series: populationSeries(27.4),
    },
    tourismGrowth: [
      { year: "2019", arrivals: 9.5 },
      { year: "2020", arrivals: 1.8 },
      { year: "2021", arrivals: 0.2 },
      { year: "2022", arrivals: 3.7 },
      { year: "2023", arrivals: 7.2 },
      { year: "2024", arrivals: 8.5 },
      { year: "2025E", arrivals: 9.2 },
      { year: "2026E", arrivals: 9.8 },
    ],
    hotelSupply: [
      { year: "2019", keys: 125000 },
      { year: "2020", keys: 128000 },
      { year: "2021", keys: 130000 },
      { year: "2022", keys: 133000 },
      { year: "2023", keys: 136000 },
      { year: "2024", keys: 139000 },
      { year: "2025E", keys: 142000 },
      { year: "2026E", keys: 145000 },
    ],
    compAdr: [
      { year: "2019", adr: 185, occupancy: 72 },
      { year: "2020", adr: 140, occupancy: 48 },
      { year: "2021", adr: 155, occupancy: 55 },
      { year: "2022", adr: 195, occupancy: 68 },
      { year: "2023", adr: 210, occupancy: 71 },
      { year: "2024", adr: 220, occupancy: 73 },
    ],
  },
  "Saudi Arabia": {
    gdp: {
      current: 1100,
      cagr5y: 3.8,
      forecast: 4.5,
      series: [
        { year: "2019", value: 0.3 },
        { year: "2020", value: -4.1 },
        { year: "2021", value: 3.2 },
        { year: "2022", value: 8.7 },
        { year: "2023", value: -0.8 },
        { year: "2024", value: 1.4 },
        { year: "2025E", value: 4.5 },
        { year: "2026E", value: 3.8 },
      ],
    },
    inflation: { current: 1.8, target: 2.0, series: inflationSeries(1.8, 2.0) },
    population: {
      current: 37.2,
      growthRate: 1.5,
      urbanizationPct: 84,
      series: populationSeries(37.2),
    },
    tourismGrowth: [
      { year: "2019", arrivals: 17.5 },
      { year: "2020", arrivals: 4.0 },
      { year: "2021", arrivals: 3.5 },
      { year: "2022", arrivals: 16.5 },
      { year: "2023", arrivals: 27.4 },
      { year: "2024", arrivals: 35.0 },
      { year: "2025E", arrivals: 40.0 },
      { year: "2026E", arrivals: 45.0 },
    ],
    hotelSupply: [
      { year: "2019", keys: 95000 },
      { year: "2020", keys: 98000 },
      { year: "2021", keys: 102000 },
      { year: "2022", keys: 115000 },
      { year: "2023", keys: 135000 },
      { year: "2024", keys: 155000 },
      { year: "2025E", keys: 175000 },
      { year: "2026E", keys: 195000 },
    ],
    compAdr: [
      { year: "2019", adr: 420, occupancy: 68 },
      { year: "2020", adr: 310, occupancy: 45 },
      { year: "2021", adr: 350, occupancy: 52 },
      { year: "2022", adr: 480, occupancy: 65 },
      { year: "2023", adr: 520, occupancy: 70 },
      { year: "2024", adr: 550, occupancy: 72 },
    ],
  },
};

const COUNTRY_ALIASES: Record<string, keyof typeof COUNTRY_MACRO_DATA> = {
  uae: "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
  dubai: "United Arab Emirates",
  abu: "United Arab Emirates",
  malaysia: "Malaysia",
  my: "Malaysia",
  oman: "Oman",
  australia: "Australia",
  au: "Australia",
  "saudi arabia": "Saudi Arabia",
  ksa: "Saudi Arabia",
  saudi: "Saudi Arabia",
};

export function resolveCountryMacro(country: string): CountryMacroProfile {
  const normalized = country.trim().toLowerCase();
  const aliasKey = COUNTRY_ALIASES[normalized];
  if (aliasKey && COUNTRY_MACRO_DATA[aliasKey]) {
    return COUNTRY_MACRO_DATA[aliasKey]!;
  }
  const direct = Object.keys(COUNTRY_MACRO_DATA).find((k) =>
    normalized.includes(k.toLowerCase()) || k.toLowerCase().includes(normalized)
  );
  return direct
    ? COUNTRY_MACRO_DATA[direct]!
    : COUNTRY_MACRO_DATA["United Arab Emirates"]!;
}
