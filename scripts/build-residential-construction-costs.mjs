#!/usr/bin/env node
/**
 * Generates src/lib/benchmarks/residential-construction-costs.ts
 * Run: node scripts/build-residential-construction-costs.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(
  __dirname,
  "../src/lib/benchmarks/residential-construction-costs.ts"
);

/**
 * Compact row:
 * [segment, positioning, furnishing, isServiced,
 *  buildingRate, parkingRate, basementRate, softCosts%, powc%, ffe%, landRate,
 *  blendedRentPsf, rentEsc%, openOcc%, stabOcc%, leaseUpYears,
 *  constructionLife, ffeLife, arMonths, apMonths]
 */
const UAE_RAW = [
  // HIGH-RISE — Luxury
  ["high_rise", "luxury", "unfurnished", 0, 550, 300, 650, 12, 6, 5, 3500, 160, 4, 40, 96, 2.5, 40, 8, 1.5, 1],
  ["high_rise", "luxury", "semi_furnished", 0, 550, 300, 650, 12, 6, 10, 3500, 185, 4, 40, 96, 2.5, 40, 6, 1.5, 1],
  ["high_rise", "luxury", "fully_furnished", 0, 550, 300, 650, 12, 6, 18, 3500, 210, 4, 40, 96, 2.5, 40, 5, 1.5, 1],
  ["high_rise", "luxury", "fully_furnished", 1, 550, 300, 650, 12, 6, 22, 3500, 260, 4.5, 35, 92, 2, 40, 4, 1, 1],
  ["high_rise", "luxury", "unfurnished", 1, 550, 300, 650, 12, 6, 8, 3500, 190, 4, 38, 94, 2.5, 40, 7, 1.5, 1],
  // HIGH-RISE — Grade A
  ["high_rise", "grade_a", "unfurnished", 0, 475, 260, 575, 11.5, 5.5, 4.5, 2800, 125, 3.5, 45, 94, 2, 35, 8, 1.5, 1],
  ["high_rise", "grade_a", "semi_furnished", 0, 475, 260, 575, 11.5, 5.5, 9, 2800, 145, 3.5, 45, 94, 2, 35, 6, 1.5, 1],
  ["high_rise", "grade_a", "fully_furnished", 0, 475, 260, 575, 11.5, 5.5, 16, 2800, 165, 3.5, 45, 94, 2, 35, 5, 1.5, 1],
  ["high_rise", "grade_a", "fully_furnished", 1, 475, 260, 575, 11.5, 5.5, 20, 2800, 200, 4, 40, 90, 1.5, 35, 4, 1, 1],
  ["high_rise", "grade_a", "unfurnished", 1, 475, 260, 575, 11.5, 5.5, 7, 2800, 145, 3.5, 42, 92, 2, 35, 7, 1.5, 1],
  // HIGH-RISE — Grade B
  ["high_rise", "grade_b", "unfurnished", 0, 400, 220, 500, 11, 5, 4, 2200, 95, 3, 50, 92, 2, 35, 8, 1.5, 1],
  ["high_rise", "grade_b", "semi_furnished", 0, 400, 220, 500, 11, 5, 8, 2200, 110, 3, 50, 92, 2, 35, 6, 1.5, 1],
  ["high_rise", "grade_b", "fully_furnished", 0, 400, 220, 500, 11, 5, 14, 2200, 125, 3, 50, 92, 2, 35, 5, 1.5, 1],
  // HIGH-RISE — Grade C
  ["high_rise", "grade_c", "unfurnished", 0, 340, 185, 425, 10.5, 4.5, 3.5, 1700, 72, 2.5, 55, 90, 1.5, 30, 8, 1, 1],
  ["high_rise", "grade_c", "semi_furnished", 0, 340, 185, 425, 10.5, 4.5, 7, 1700, 85, 2.5, 55, 90, 1.5, 30, 6, 1, 1],
  ["high_rise", "grade_c", "fully_furnished", 0, 340, 185, 425, 10.5, 4.5, 12, 1700, 98, 2.5, 55, 90, 1.5, 30, 5, 1, 1],
  // MID-RISE — Luxury
  ["mid_rise", "luxury", "unfurnished", 0, 450, 250, 550, 11.5, 5.5, 5, 2800, 135, 3.5, 45, 95, 2, 35, 8, 1.5, 1],
  ["mid_rise", "luxury", "semi_furnished", 0, 450, 250, 550, 11.5, 5.5, 10, 2800, 155, 3.5, 45, 95, 2, 35, 6, 1.5, 1],
  ["mid_rise", "luxury", "fully_furnished", 0, 450, 250, 550, 11.5, 5.5, 17, 2800, 175, 3.5, 45, 95, 2, 35, 5, 1.5, 1],
  ["mid_rise", "luxury", "fully_furnished", 1, 450, 250, 550, 11.5, 5.5, 21, 2800, 220, 4, 40, 91, 1.5, 35, 4, 1, 1],
  // MID-RISE — Grade A
  ["mid_rise", "grade_a", "unfurnished", 0, 380, 210, 480, 11, 5, 4.5, 2200, 105, 3, 50, 93, 1.5, 30, 8, 1.5, 1],
  ["mid_rise", "grade_a", "semi_furnished", 0, 380, 210, 480, 11, 5, 9, 2200, 122, 3, 50, 93, 1.5, 30, 6, 1.5, 1],
  ["mid_rise", "grade_a", "fully_furnished", 0, 380, 210, 480, 11, 5, 15, 2200, 140, 3, 50, 93, 1.5, 30, 5, 1.5, 1],
  ["mid_rise", "grade_a", "fully_furnished", 1, 380, 210, 480, 11, 5, 19, 2200, 175, 3.5, 45, 89, 1.5, 30, 4, 1, 1],
  // MID-RISE — Grade B
  ["mid_rise", "grade_b", "unfurnished", 0, 320, 180, 420, 10.5, 5, 4, 1700, 82, 2.5, 55, 91, 1.5, 30, 8, 1, 1],
  ["mid_rise", "grade_b", "semi_furnished", 0, 320, 180, 420, 10.5, 5, 8, 1700, 95, 2.5, 55, 91, 1.5, 30, 6, 1, 1],
  ["mid_rise", "grade_b", "fully_furnished", 0, 320, 180, 420, 10.5, 5, 13, 1700, 108, 2.5, 55, 91, 1.5, 30, 5, 1, 1],
  // MID-RISE — Grade C
  ["mid_rise", "grade_c", "unfurnished", 0, 275, 155, 375, 10, 4.5, 3.5, 1300, 64, 2.5, 60, 89, 1, 25, 8, 1, 1],
  ["mid_rise", "grade_c", "semi_furnished", 0, 275, 155, 375, 10, 4.5, 7, 1300, 75, 2.5, 60, 89, 1, 25, 6, 1, 1],
  ["mid_rise", "grade_c", "fully_furnished", 0, 275, 155, 375, 10, 4.5, 12, 1300, 86, 2.5, 60, 89, 1, 25, 5, 1, 1],
  // TOWNHOME — Luxury
  ["townhome", "luxury", "unfurnished", 0, 400, 220, 0, 11, 5, 5, 2500, 120, 3.5, 50, 97, 1.5, 35, 8, 1.5, 1],
  ["townhome", "luxury", "semi_furnished", 0, 400, 220, 0, 11, 5, 10, 2500, 138, 3.5, 50, 97, 1.5, 35, 6, 1.5, 1],
  ["townhome", "luxury", "fully_furnished", 0, 400, 220, 0, 11, 5, 16, 2500, 156, 3.5, 50, 97, 1.5, 35, 5, 1.5, 1],
  // TOWNHOME — Grade A
  ["townhome", "grade_a", "unfurnished", 0, 340, 190, 0, 10.5, 5, 4.5, 2000, 95, 3, 55, 95, 1.5, 30, 8, 1.5, 1],
  ["townhome", "grade_a", "semi_furnished", 0, 340, 190, 0, 10.5, 5, 9, 2000, 110, 3, 55, 95, 1.5, 30, 6, 1.5, 1],
  ["townhome", "grade_a", "fully_furnished", 0, 340, 190, 0, 10.5, 5, 14, 2000, 125, 3, 55, 95, 1.5, 30, 5, 1.5, 1],
  // TOWNHOME — Grade B
  ["townhome", "grade_b", "unfurnished", 0, 290, 165, 0, 10, 4.5, 4, 1500, 75, 2.5, 60, 93, 1, 30, 8, 1, 1],
  ["townhome", "grade_b", "semi_furnished", 0, 290, 165, 0, 10, 4.5, 8, 1500, 87, 2.5, 60, 93, 1, 30, 6, 1, 1],
  ["townhome", "grade_b", "fully_furnished", 0, 290, 165, 0, 10, 4.5, 13, 1500, 99, 2.5, 60, 93, 1, 30, 5, 1, 1],
  // TOWNHOME — Grade C
  ["townhome", "grade_c", "unfurnished", 0, 250, 140, 0, 9.5, 4.5, 3.5, 1100, 58, 2.5, 65, 91, 1, 25, 8, 1, 1],
  ["townhome", "grade_c", "semi_furnished", 0, 250, 140, 0, 9.5, 4.5, 7, 1100, 68, 2.5, 65, 91, 1, 25, 6, 1, 1],
  ["townhome", "grade_c", "fully_furnished", 0, 250, 140, 0, 9.5, 4.5, 12, 1100, 78, 2.5, 65, 91, 1, 25, 5, 1, 1],
  // COMPACT — Grade A/B/C only
  ["compact", "grade_a", "unfurnished", 0, 360, 200, 450, 11, 5, 4, 2000, 90, 3, 55, 94, 1.5, 30, 8, 1, 1],
  ["compact", "grade_a", "semi_furnished", 0, 360, 200, 450, 11, 5, 8, 2000, 105, 3, 55, 94, 1.5, 30, 6, 1, 1],
  ["compact", "grade_a", "fully_furnished", 0, 360, 200, 450, 11, 5, 14, 2000, 120, 3, 55, 94, 1.5, 30, 5, 1, 1],
  ["compact", "grade_b", "unfurnished", 0, 310, 175, 400, 10.5, 4.5, 3.5, 1500, 70, 2.5, 60, 92, 1, 30, 8, 1, 1],
  ["compact", "grade_b", "semi_furnished", 0, 310, 175, 400, 10.5, 4.5, 7, 1500, 82, 2.5, 60, 92, 1, 30, 6, 1, 1],
  ["compact", "grade_b", "fully_furnished", 0, 310, 175, 400, 10.5, 4.5, 12, 1500, 94, 2.5, 60, 92, 1, 30, 5, 1, 1],
  ["compact", "grade_c", "unfurnished", 0, 265, 150, 350, 10, 4.5, 3, 1100, 54, 2.5, 65, 90, 1, 25, 8, 1, 1],
  ["compact", "grade_c", "semi_furnished", 0, 265, 150, 350, 10, 4.5, 6.5, 1100, 64, 2.5, 65, 90, 1, 25, 6, 1, 1],
  ["compact", "grade_c", "fully_furnished", 0, 265, 150, 350, 10, 4.5, 11, 1100, 74, 2.5, 65, 90, 1, 25, 5, 1, 1],
];

/** Country scaling vs UAE (market research anchors). */
const COUNTRY_SCALE = {
  UAE: {
    build: 1,
    land: 1,
    rent: 1,
    ffe: 1,
    softPowc: 1,
  },
  "Saudi Arabia": {
    build: 0.864,
    land: 0.8,
    rent: 0.84,
    ffe: 1,
    softPowc: 0.98,
  },
  Malaysia: {
    build: 0.69,
    land: 0.45,
    rent: 0.62,
    ffe: 0.95,
    softPowc: 0.95,
  },
  Australia: {
    build: 7.64,
    land: 5.14,
    rent: 5.5,
    ffe: 1,
    softPowc: 1.04,
  },
  Vietnam: {
    build: 0.76,
    land: 0.55,
    rent: 0.58,
    ffe: 0.92,
    softPowc: 0.94,
  },
  Thailand: {
    build: 0.945,
    land: 0.68,
    rent: 0.72,
    ffe: 0.98,
    softPowc: 0.97,
  },
};

const COUNTRIES = [
  "UAE",
  "Saudi Arabia",
  "Malaysia",
  "Australia",
  "Vietnam",
  "Thailand",
];

function round(n, d = 0) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function scaleRow(country, row) {
  const s = COUNTRY_SCALE[country];
  const [
    segment,
    positioning,
    furnishing,
    isServiced,
    buildingRate,
    parkingRate,
    basementRate,
    softCostsPercent,
    powcPercent,
    ffePercent,
    landRate,
    blendedRentPsf,
    rentEscalation,
    openingOccupancy,
    stabilizedOccupancy,
    leaseUpYears,
    constructionLife,
    ffeLife,
    arMonths,
    apMonths,
  ] = row;

  const basement =
    segment === "townhome" ? 0 : round(basementRate * s.build);

  return {
    country,
    segment,
    positioning,
    furnishingLevel: furnishing,
    ...(isServiced ? { isServicedApartment: true } : {}),
    buildingRate: round(buildingRate * s.build),
    parkingRate: round(parkingRate * s.build),
    basementRate: basement,
    softCostsPercent: round(softCostsPercent * s.softPowc, 1),
    powcPercent: round(powcPercent * s.softPowc, 1),
    ffePercent: round(ffePercent * s.ffe, 1),
    landRate: round(landRate * s.land),
    blendedRentPsf: round(blendedRentPsf * s.rent),
    rentEscalation,
    openingOccupancy,
    stabilizedOccupancy,
    leaseUpYears,
    constructionLife,
    ffeLife,
    arMonths,
    apMonths,
  };
}

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : String(n);
}

function formatBenchmark(b, indent = "  ") {
  const lines = [
    `${indent}{`,
    `${indent}  country: ${JSON.stringify(b.country)},`,
    `${indent}  segment: ${JSON.stringify(b.segment)},`,
    `${indent}  positioning: ${JSON.stringify(b.positioning)},`,
    `${indent}  furnishingLevel: ${JSON.stringify(b.furnishingLevel)},`,
  ];
  if (b.isServicedApartment) {
    lines.push(`${indent}  isServicedApartment: true,`);
  }
  const fields = [
    "buildingRate",
    "parkingRate",
    "basementRate",
    "softCostsPercent",
    "powcPercent",
    "ffePercent",
    "landRate",
    "blendedRentPsf",
    "rentEscalation",
    "openingOccupancy",
    "stabilizedOccupancy",
    "leaseUpYears",
    "constructionLife",
    "ffeLife",
    "arMonths",
    "apMonths",
  ];
  for (const f of fields) {
    lines.push(`${indent}  ${f}: ${fmtNum(b[f])},`);
  }
  lines.push(`${indent}},`);
  return lines.join("\n");
}

const benchmarks = COUNTRIES.flatMap((country) =>
  UAE_RAW.map((row) => scaleRow(country, row))
);

const ts = `// AUTO-GENERATED by scripts/build-residential-construction-costs.mjs — do not edit by hand.

export type ResidentialSegment =
  | "high_rise"
  | "mid_rise"
  | "townhome"
  | "compact";

export type ResidentialPositioning =
  | "luxury"
  | "grade_a"
  | "grade_b"
  | "grade_c";

export type ResidentialFurnishingLevel =
  | "unfurnished"
  | "semi_furnished"
  | "fully_furnished";

export interface ResidentialConstructionBenchmark {
  country: string;
  segment: string;
  positioning: string;
  furnishingLevel: ResidentialFurnishingLevel;
  /** Serviced apartment overlay — high-rise / mid-rise luxury & grade A only */
  isServicedApartment?: boolean;

  buildingRate: number;
  parkingRate: number;
  basementRate: number;

  softCostsPercent: number;
  powcPercent: number;
  ffePercent: number;

  landRate: number;

  blendedRentPsf: number;
  rentEscalation: number;
  openingOccupancy: number;
  stabilizedOccupancy: number;
  leaseUpYears: number;

  constructionLife: number;
  ffeLife: number;
  arMonths: number;
  apMonths: number;
}

export function normalizeResidentialCountry(country: string): string {
  const c = (country || "").trim();
  if (c === "United Arab Emirates" || c === "UAE") return "UAE";
  if (c === "Saudi Arabia" || c === "KSA") return "Saudi Arabia";
  return c;
}

export const RESIDENTIAL_CONSTRUCTION_BENCHMARKS: ResidentialConstructionBenchmark[] = [
${benchmarks.map((b) => formatBenchmark(b)).join("\n")}
];

export const DEFAULT_RESIDENTIAL_CONSTRUCTION_BENCHMARK: ResidentialConstructionBenchmark =
  RESIDENTIAL_CONSTRUCTION_BENCHMARKS.find(
    (b) =>
      b.country === "UAE" &&
      b.segment === "high_rise" &&
      b.positioning === "grade_a" &&
      b.furnishingLevel === "unfurnished" &&
      !b.isServicedApartment
  )!;

export function getResidentialBenchmarkProfileKey(
  country: string,
  segment: string,
  positioning: string,
  furnishingLevel: string,
  isServicedApartment?: boolean
): string {
  const c = normalizeResidentialCountry(country);
  return [c, segment, positioning, furnishingLevel, isServicedApartment ? "serviced" : "standard"].join(
    ":"
  );
}

export function getResidentialBenchmark(
  country: string,
  segment: string,
  positioning: string,
  furnishingLevel: string,
  isServicedApartment?: boolean
): ResidentialConstructionBenchmark | null {
  const c = normalizeResidentialCountry(country);
  const pool = RESIDENTIAL_CONSTRUCTION_BENCHMARKS.filter(
    (b) =>
      b.country === c &&
      b.segment === segment &&
      b.positioning === positioning &&
      b.furnishingLevel === furnishingLevel
  );
  if (!pool.length) return null;

  if (isServicedApartment === true) {
    return pool.find((b) => b.isServicedApartment === true) ?? null;
  }
  if (isServicedApartment === false) {
    return pool.find((b) => !b.isServicedApartment) ?? null;
  }
  return pool.find((b) => !b.isServicedApartment) ?? pool[0] ?? null;
}

export function resolveResidentialBenchmark(
  country: string,
  segment: string,
  positioning: string,
  furnishingLevel: string,
  isServicedApartment?: boolean
): ResidentialConstructionBenchmark {
  const exact = getResidentialBenchmark(
    country,
    segment,
    positioning,
    furnishingLevel,
    isServicedApartment
  );
  if (exact) return exact;

  const c = normalizeResidentialCountry(country || "UAE");
  const seg = segment || "high_rise";
  const pos = positioning || "grade_a";
  const furn = furnishingLevel || "unfurnished";

  const sameCountry = RESIDENTIAL_CONSTRUCTION_BENCHMARKS.filter(
    (b) => b.country === c
  );
  if (sameCountry.length) {
    const matchSeg = sameCountry.filter((b) => b.segment === seg);
    const pool = matchSeg.length ? matchSeg : sameCountry;
    return (
      pool.find(
        (b) =>
          b.positioning === pos &&
          b.furnishingLevel === furn &&
          (isServicedApartment ? b.isServicedApartment : !b.isServicedApartment)
      ) ??
      pool.find((b) => b.positioning === pos) ??
      pool[0]!
    );
  }

  return { ...DEFAULT_RESIDENTIAL_CONSTRUCTION_BENCHMARK, country: c, segment: seg, positioning: pos, furnishingLevel: furn as ResidentialFurnishingLevel };
}
`;

fs.writeFileSync(OUT, ts, "utf8");
console.log(`Wrote ${benchmarks.length} benchmarks to ${OUT}`);
