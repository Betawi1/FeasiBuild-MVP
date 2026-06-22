// /app/sale/data/recommendations.ts — Sale stream market defaults for construction, soft costs, land

export interface CityLandRates {
  [cityName: string]: {
    ratePerSqft: number;
    typicalPlotSize: number;
  };
}

export type ConstructionSCurveProfile = {
  monthlyPercentages: number[]; // M1..Mn percentages (sum to 100)
  stageDistribution: {
    stage1Percent: number; // Enabling
    stage2Percent: number; // Sub-Structure
    stage3Percent: number; // Super Structure
    stage4Percent: number; // Finishes
  };
  peakMonth: number; // Month of peak spending
  typicalDuration: number; // Typical project duration in months
};

export const HIRISE_RESIDENTIAL_18M: ConstructionSCurveProfile = {
  monthlyPercentages: [
    1.85, 4.2, 3.32, 3.04, 2.8, 2.59, 2.59, 2.71, 4.25, 4.04, 3.92, 5.24,
    9.23, 12.29, 9.98, 10.09, 9.01, 6.16,
  ],
  stageDistribution: {
    stage1Percent: 9,
    stage2Percent: 14,
    stage3Percent: 39,
    stage4Percent: 35,
  },
  peakMonth: 14,
  typicalDuration: 18,
};

export const HIRISE_RESIDENTIAL_36M: ConstructionSCurveProfile = {
  monthlyPercentages: [
    0.7, 1.0, 1.3, 1.5, 1.2, 1.1, 1.5, 1.6, 1.7, 1.8, 1.7, 1.6, 1.5, 1.3,
    2.1, 2.3, 2.7, 3.2, 3.8, 4.4, 5.1, 5.7, 5.4, 4.9, 4.4, 3.8, 3.2, 2.7,
    3.5, 3.8, 4.0, 4.3, 3.9, 3.4, 2.7, 1.7,
  ],
  stageDistribution: {
    stage1Percent: 8,
    stage2Percent: 15,
    stage3Percent: 45,
    stage4Percent: 32,
  },
  peakMonth: 24,
  typicalDuration: 36,
};

export const LANDED_G2_ESTATE_24M: ConstructionSCurveProfile = {
  monthlyPercentages: [
    2.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 7.0, 6.5, 6.0, 5.5, 5.0,
    4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.0, 0.5, 0.3, 0.2,
  ],
  stageDistribution: {
    stage1Percent: 11,
    stage2Percent: 10,
    stage3Percent: 44,
    stage4Percent: 35,
  },
  peakMonth: 9,
  typicalDuration: 24,
};

export const COMMERCIAL_STRATA_30M: ConstructionSCurveProfile = {
  monthlyPercentages: [
    1.2, 2.0, 2.0, 1.8, 2.5, 3.0, 3.2, 3.3, 3.2, 2.8, 3.5, 4.0, 4.5, 5.0,
    5.5, 6.0, 6.2, 6.0, 5.5, 5.0, 4.5, 4.0, 3.5, 3.0, 3.5, 4.0, 4.5, 3.5,
    2.5, 1.5,
  ],
  stageDistribution: {
    stage1Percent: 7,
    stage2Percent: 18,
    stage3Percent: 48,
    stage4Percent: 27,
  },
  peakMonth: 18,
  typicalDuration: 30,
};

const normalizePercentagesTo100 = (values: number[]): number[] => {
  const sum = values.reduce((a, b) => a + b, 0) || 1;
  const scaled = values.map((v) => (v / sum) * 100);
  // Plug last value so sum is exactly 100 (avoid float drift)
  const scaledSum = scaled.reduce((a, b) => a + b, 0);
  scaled[scaled.length - 1] = (scaled[scaled.length - 1] || 0) + (100 - scaledSum);
  return scaled;
};

/**
 * Commercial Landed (Terrace Shop-Offices) - G+4 Max
 * - Duration: 18 Months
 * - Peak: Month 9 (normalized peak; raw 6.5%)
 * - Characteristics: Fast structure, simpler office finishes, heavy retail ground floor.
 */
export const COMMERCIAL_LANDED_G4_18M: ConstructionSCurveProfile = {
  monthlyPercentages: normalizePercentagesTo100([
    // Stage 1: Enabling (raw sum 8.5)
    2.0, 3.5, 3.0,
    // Stage 2: Sub-Structure (raw sum 8.5)
    4.0, 4.5,
    // Stage 3: Super Structure (raw sum 29.0) - PEAK at raw M9 = 6.5
    5.0, 5.5, 6.0, 6.5, 6.0,
    // Stage 4: Finishes & MEP (raw sum 29.0)
    5.5, 5.0, 4.5, 4.0, 3.5, 3.0, 2.0, 1.5,
  ]),
  stageDistribution: {
    stage1Percent: 9,
    stage2Percent: 16,
    stage3Percent: 40,
    stage4Percent: 35,
  },
  peakMonth: 9,
  typicalDuration: 18,
};

export function interpolateSCurveProfile(
  template: ConstructionSCurveProfile,
  targetMonths: number
): number[] {
  const templateMonths = template.monthlyPercentages.length;
  if (targetMonths <= 0) return [];

  // Exact match: still enforce sum == 100%
  if (targetMonths === templateMonths) {
    const sum = template.monthlyPercentages.reduce((a, b) => a + b, 0) || 1;
    if (Math.abs(sum - 100) <= 0.01) return [...template.monthlyPercentages];
    const normalized = template.monthlyPercentages.map((p) => (p / sum) * 100);
    const finalSum = normalized.reduce((a, b) => a + b, 0);
    if (Math.abs(finalSum - 100) > 0.001) {
      normalized[normalized.length - 1] += 100 - finalSum;
    }
    return normalized;
  }

  // Linear interpolation
  const result: number[] = [];
  for (let m = 1; m <= targetMonths; m++) {
    const templateIndex = ((m - 1) / targetMonths) * templateMonths;
    const lower = Math.floor(templateIndex);
    const upper = Math.min(templateMonths - 1, lower + 1);
    const fraction = templateIndex - lower;

    const lowerVal = template.monthlyPercentages[lower] || 0;
    const upperVal = template.monthlyPercentages[upper] || 0;
    result.push(lowerVal + (upperVal - lowerVal) * fraction);
  }

  // 🔥 Normalize to EXACTLY 100%
  const rawSum = result.reduce((a, b) => a + b, 0) || 1;
  const normalized = result.map((p) => (p / rawSum) * 100);

  // Final plug (avoid float drift)
  const normalizedSum = normalized.reduce((a, b) => a + b, 0);
  if (Math.abs(normalizedSum - 100) > 0.001) {
    normalized[normalized.length - 1] += 100 - normalizedSum;
  }

  console.log("📊 [interpolateSCurveProfile]:", {
    templateMonths,
    targetMonths,
    rawSum: rawSum.toFixed(4),
    normalizedSum: normalized.reduce((a, b) => a + b, 0).toFixed(4),
  });

  return normalized;
}

export interface BuildingRecommendations {
  constructionCosts: {
    buildingRate: number;
    parkingRate: number;
    basementRate: number;
    infrastructureRate: number;
  };
  softCosts: {
    scPercent: number;
    powcPercent: number;
    ffePercent: number;
  };
  landRates: {
    default: { ratePerSqft: number; typicalPlotSize: number };
    byCity?: CityLandRates;
  };
  constructionStages: {
    labels: { stage1: string; stage2: string; stage3: string; stage4: string };
    allocation: {
      stage1Percent: number;
      stage2Percent: number;
      stage3Percent: number;
      stage4Percent: number;
    };
  };
  sCurveProfile: ConstructionSCurveProfile;
}

export interface CountryRecommendations {
  currency: string;
  buildingTypes: {
    "residential-landed": BuildingRecommendations;
    "commercial-landed": BuildingRecommendations;
    "residential-hi-rise": Record<string, BuildingRecommendations>;
    "commercial-strata-office": Record<string, BuildingRecommendations>;
  };
}

export type SaleRecommendationBuildingType =
  | "residential-landed"
  | "commercial-landed"
  | "residential-hi-rise"
  | "commercial-strata-office";

/** Shared 4-stage labels / % (market shape is in sCurveProfile). */
const SALE_DEFAULT_STAGES: BuildingRecommendations["constructionStages"] = {
  labels: {
    stage1: "Enabling",
    stage2: "Sub-Structure",
    stage3: "Super Structure",
    stage4: "Finishes",
  },
  allocation: {
    stage1Percent: 10,
    stage2Percent: 20,
    stage3Percent: 40,
    stage4Percent: 30,
  },
};

function hiRiseScurveForRange(rangeKey: string): ConstructionSCurveProfile {
  return rangeKey === "G+5-G+8" || rangeKey === "G+9-G+16"
    ? HIRISE_RESIDENTIAL_18M
    : HIRISE_RESIDENTIAL_36M;
}

/** Returns a fresh BuildingRecommendations row (unique cost objects per country). */
function brLanded(
  constructionCosts: BuildingRecommendations["constructionCosts"],
  softCosts: BuildingRecommendations["softCosts"],
  land: { ratePerSqft: number; typicalPlotSize: number },
  sCurveProfile: ConstructionSCurveProfile
): BuildingRecommendations {
  return {
    constructionCosts: { ...constructionCosts },
    softCosts: { ...softCosts },
    landRates: { default: { ...land } },
    constructionStages: SALE_DEFAULT_STAGES,
    sCurveProfile,
  };
}

function brHiRise(
  rangeKey: string,
  constructionCosts: BuildingRecommendations["constructionCosts"],
  softCosts: BuildingRecommendations["softCosts"],
  land: { ratePerSqft: number; typicalPlotSize: number }
): BuildingRecommendations {
  return {
    constructionCosts: { ...constructionCosts },
    softCosts: { ...softCosts },
    landRates: { default: { ...land } },
    constructionStages: SALE_DEFAULT_STAGES,
    sCurveProfile: hiRiseScurveForRange(rangeKey),
  };
}

function brStrata(
  constructionCosts: BuildingRecommendations["constructionCosts"],
  softCosts: BuildingRecommendations["softCosts"],
  land: { ratePerSqft: number; typicalPlotSize: number }
): BuildingRecommendations {
  return {
    constructionCosts: { ...constructionCosts },
    softCosts: { ...softCosts },
    landRates: { default: { ...land } },
    constructionStages: SALE_DEFAULT_STAGES,
    sCurveProfile: COMMERCIAL_STRATA_30M,
  };
}

export const RECOMMENDATIONS: Record<string, CountryRecommendations> = {
  AE: {
    currency: "AED",
    buildingTypes: {
      "residential-landed": brLanded(
        {
          buildingRate: 300,
          parkingRate: 220,
          basementRate: 380,
          infrastructureRate: 80,
        },
        { scPercent: 18, powcPercent: 5, ffePercent: 8 },
        { ratePerSqft: 450, typicalPlotSize: 5000 },
        LANDED_G2_ESTATE_24M
      ),
      "commercial-landed": brLanded(
        {
          buildingRate: 380,
          parkingRate: 250,
          basementRate: 420,
          infrastructureRate: 100,
        },
        { scPercent: 20, powcPercent: 6, ffePercent: 10 },
        { ratePerSqft: 550, typicalPlotSize: 8000 },
        COMMERCIAL_LANDED_G4_18M
      ),
      "residential-hi-rise": {
        "G+5-G+8": brHiRise(
          "G+5-G+8",
          { buildingRate: 380, parkingRate: 240, basementRate: 400, infrastructureRate: 0 },
          { scPercent: 18, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 500, typicalPlotSize: 15000 }
        ),
        "G+9-G+16": brHiRise(
          "G+9-G+16",
          { buildingRate: 400, parkingRate: 250, basementRate: 420, infrastructureRate: 0 },
          { scPercent: 19, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 600, typicalPlotSize: 20000 }
        ),
        "G+17-G+24": brHiRise(
          "G+17-G+24",
          { buildingRate: 420, parkingRate: 260, basementRate: 440, infrastructureRate: 0 },
          { scPercent: 20, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 700, typicalPlotSize: 25000 }
        ),
        "G+25-G+32": brHiRise(
          "G+25-G+32",
          { buildingRate: 440, parkingRate: 270, basementRate: 460, infrastructureRate: 0 },
          { scPercent: 21, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 800, typicalPlotSize: 30000 }
        ),
        "G+33-G+50": brHiRise(
          "G+33-G+50",
          { buildingRate: 460, parkingRate: 280, basementRate: 480, infrastructureRate: 0 },
          { scPercent: 22, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 900, typicalPlotSize: 35000 }
        ),
        "G+51+": brHiRise(
          "G+51+",
          { buildingRate: 480, parkingRate: 290, basementRate: 500, infrastructureRate: 0 },
          { scPercent: 23, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 1000, typicalPlotSize: 40000 }
        ),
      },
      "commercial-strata-office": {
        "G+5-G+8": brStrata(
          { buildingRate: 320, parkingRate: 230, basementRate: 390, infrastructureRate: 0 },
          { scPercent: 16, powcPercent: 5, ffePercent: 5 },
          { ratePerSqft: 600, typicalPlotSize: 15000 }
        ),
        "G+9-G+16": brStrata(
          { buildingRate: 340, parkingRate: 240, basementRate: 410, infrastructureRate: 0 },
          { scPercent: 17, powcPercent: 5, ffePercent: 5 },
          { ratePerSqft: 700, typicalPlotSize: 20000 }
        ),
        "G+17-G+24": brStrata(
          { buildingRate: 360, parkingRate: 250, basementRate: 430, infrastructureRate: 0 },
          { scPercent: 18, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 800, typicalPlotSize: 25000 }
        ),
        "G+25-G+32": brStrata(
          { buildingRate: 380, parkingRate: 260, basementRate: 450, infrastructureRate: 0 },
          { scPercent: 19, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 900, typicalPlotSize: 30000 }
        ),
        "G+33-G+50": brStrata(
          { buildingRate: 400, parkingRate: 270, basementRate: 470, infrastructureRate: 0 },
          { scPercent: 20, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 1000, typicalPlotSize: 35000 }
        ),
        "G+51+": brStrata(
          { buildingRate: 420, parkingRate: 280, basementRate: 490, infrastructureRate: 0 },
          { scPercent: 21, powcPercent: 7, ffePercent: 5 },
          { ratePerSqft: 1100, typicalPlotSize: 40000 }
        ),
      },
    },
  },
  SA: {
    currency: "SAR",
    buildingTypes: {
      "residential-landed": brLanded(
        {
          buildingRate: 200,
          parkingRate: 160,
          basementRate: 280,
          infrastructureRate: 60,
        },
        { scPercent: 18, powcPercent: 5, ffePercent: 8 },
        { ratePerSqft: 350, typicalPlotSize: 5000 },
        LANDED_G2_ESTATE_24M
      ),
      "commercial-landed": brLanded(
        {
          buildingRate: 280,
          parkingRate: 190,
          basementRate: 320,
          infrastructureRate: 80,
        },
        { scPercent: 20, powcPercent: 6, ffePercent: 10 },
        { ratePerSqft: 450, typicalPlotSize: 8000 },
        COMMERCIAL_LANDED_G4_18M
      ),
      "residential-hi-rise": {
        "G+5-G+8": brHiRise(
          "G+5-G+8",
          { buildingRate: 280, parkingRate: 180, basementRate: 300, infrastructureRate: 0 },
          { scPercent: 18, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 400, typicalPlotSize: 15000 }
        ),
        "G+9-G+16": brHiRise(
          "G+9-G+16",
          { buildingRate: 300, parkingRate: 190, basementRate: 320, infrastructureRate: 0 },
          { scPercent: 19, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 500, typicalPlotSize: 20000 }
        ),
        "G+17-G+24": brHiRise(
          "G+17-G+24",
          { buildingRate: 320, parkingRate: 200, basementRate: 340, infrastructureRate: 0 },
          { scPercent: 20, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 600, typicalPlotSize: 25000 }
        ),
        "G+25-G+32": brHiRise(
          "G+25-G+32",
          { buildingRate: 340, parkingRate: 210, basementRate: 360, infrastructureRate: 0 },
          { scPercent: 21, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 700, typicalPlotSize: 30000 }
        ),
        "G+33-G+50": brHiRise(
          "G+33-G+50",
          { buildingRate: 360, parkingRate: 220, basementRate: 380, infrastructureRate: 0 },
          { scPercent: 22, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 800, typicalPlotSize: 35000 }
        ),
        "G+51+": brHiRise(
          "G+51+",
          { buildingRate: 380, parkingRate: 230, basementRate: 400, infrastructureRate: 0 },
          { scPercent: 23, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 900, typicalPlotSize: 40000 }
        ),
      },
      "commercial-strata-office": {
        "G+5-G+8": brStrata(
          { buildingRate: 240, parkingRate: 170, basementRate: 290, infrastructureRate: 0 },
          { scPercent: 16, powcPercent: 5, ffePercent: 5 },
          { ratePerSqft: 500, typicalPlotSize: 15000 }
        ),
        "G+9-G+16": brStrata(
          { buildingRate: 260, parkingRate: 180, basementRate: 310, infrastructureRate: 0 },
          { scPercent: 17, powcPercent: 5, ffePercent: 5 },
          { ratePerSqft: 600, typicalPlotSize: 20000 }
        ),
        "G+17-G+24": brStrata(
          { buildingRate: 280, parkingRate: 190, basementRate: 330, infrastructureRate: 0 },
          { scPercent: 18, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 700, typicalPlotSize: 25000 }
        ),
        "G+25-G+32": brStrata(
          { buildingRate: 300, parkingRate: 200, basementRate: 350, infrastructureRate: 0 },
          { scPercent: 19, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 800, typicalPlotSize: 30000 }
        ),
        "G+33-G+50": brStrata(
          { buildingRate: 320, parkingRate: 210, basementRate: 370, infrastructureRate: 0 },
          { scPercent: 20, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 900, typicalPlotSize: 35000 }
        ),
        "G+51+": brStrata(
          { buildingRate: 340, parkingRate: 220, basementRate: 390, infrastructureRate: 0 },
          { scPercent: 21, powcPercent: 7, ffePercent: 5 },
          { ratePerSqft: 1000, typicalPlotSize: 40000 }
        ),
      },
    },
  },
  MY: {
    currency: "MYR",
    buildingTypes: {
      "residential-landed": brLanded(
        {
          buildingRate: 180,
          parkingRate: 130,
          basementRate: 250,
          infrastructureRate: 50,
        },
        { scPercent: 18, powcPercent: 5, ffePercent: 8 },
        { ratePerSqft: 280, typicalPlotSize: 5000 },
        LANDED_G2_ESTATE_24M
      ),
      "commercial-landed": brLanded(
        {
          buildingRate: 250,
          parkingRate: 160,
          basementRate: 290,
          infrastructureRate: 70,
        },
        { scPercent: 20, powcPercent: 6, ffePercent: 10 },
        { ratePerSqft: 380, typicalPlotSize: 8000 },
        COMMERCIAL_LANDED_G4_18M
      ),
      "residential-hi-rise": {
        "G+5-G+8": brHiRise(
          "G+5-G+8",
          { buildingRate: 230, parkingRate: 140, basementRate: 260, infrastructureRate: 0 },
          { scPercent: 18, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 320, typicalPlotSize: 15000 }
        ),
        "G+9-G+16": brHiRise(
          "G+9-G+16",
          { buildingRate: 260, parkingRate: 150, basementRate: 280, infrastructureRate: 0 },
          { scPercent: 19, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 400, typicalPlotSize: 20000 }
        ),
        "G+17-G+24": brHiRise(
          "G+17-G+24",
          { buildingRate: 290, parkingRate: 160, basementRate: 300, infrastructureRate: 0 },
          { scPercent: 20, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 480, typicalPlotSize: 25000 }
        ),
        "G+25-G+32": brHiRise(
          "G+25-G+32",
          { buildingRate: 320, parkingRate: 170, basementRate: 320, infrastructureRate: 0 },
          { scPercent: 21, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 560, typicalPlotSize: 30000 }
        ),
        "G+33-G+50": brHiRise(
          "G+33-G+50",
          { buildingRate: 350, parkingRate: 180, basementRate: 340, infrastructureRate: 0 },
          { scPercent: 22, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 640, typicalPlotSize: 35000 }
        ),
        "G+51+": brHiRise(
          "G+51+",
          { buildingRate: 380, parkingRate: 190, basementRate: 360, infrastructureRate: 0 },
          { scPercent: 23, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 720, typicalPlotSize: 40000 }
        ),
      },
      "commercial-strata-office": {
        "G+5-G+8": brStrata(
          { buildingRate: 200, parkingRate: 135, basementRate: 255, infrastructureRate: 0 },
          { scPercent: 16, powcPercent: 5, ffePercent: 5 },
          { ratePerSqft: 400, typicalPlotSize: 15000 }
        ),
        "G+9-G+16": brStrata(
          { buildingRate: 230, parkingRate: 145, basementRate: 275, infrastructureRate: 0 },
          { scPercent: 17, powcPercent: 5, ffePercent: 5 },
          { ratePerSqft: 480, typicalPlotSize: 20000 }
        ),
        "G+17-G+24": brStrata(
          { buildingRate: 260, parkingRate: 155, basementRate: 295, infrastructureRate: 0 },
          { scPercent: 18, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 560, typicalPlotSize: 25000 }
        ),
        "G+25-G+32": brStrata(
          { buildingRate: 290, parkingRate: 165, basementRate: 315, infrastructureRate: 0 },
          { scPercent: 19, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 640, typicalPlotSize: 30000 }
        ),
        "G+33-G+50": brStrata(
          { buildingRate: 320, parkingRate: 175, basementRate: 335, infrastructureRate: 0 },
          { scPercent: 20, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 720, typicalPlotSize: 35000 }
        ),
        "G+51+": brStrata(
          { buildingRate: 350, parkingRate: 185, basementRate: 355, infrastructureRate: 0 },
          { scPercent: 21, powcPercent: 7, ffePercent: 5 },
          { ratePerSqft: 800, typicalPlotSize: 40000 }
        ),
      },
    },
  },
  VN: {
    currency: "VND",
    buildingTypes: {
      "residential-landed": brLanded(
        {
          buildingRate: 500000,
          parkingRate: 350000,
          basementRate: 650000,
          infrastructureRate: 150000,
        },
        { scPercent: 18, powcPercent: 5, ffePercent: 8 },
        { ratePerSqft: 800000, typicalPlotSize: 5000 },
        LANDED_G2_ESTATE_24M
      ),
      "commercial-landed": brLanded(
        {
          buildingRate: 650000,
          parkingRate: 450000,
          basementRate: 800000,
          infrastructureRate: 200000,
        },
        { scPercent: 20, powcPercent: 6, ffePercent: 10 },
        { ratePerSqft: 1100000, typicalPlotSize: 8000 },
        COMMERCIAL_LANDED_G4_18M
      ),
      "residential-hi-rise": {
        "G+5-G+8": brHiRise(
          "G+5-G+8",
          {
            buildingRate: 600000,
            parkingRate: 400000,
            basementRate: 700000,
            infrastructureRate: 0,
          },
          { scPercent: 18, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 900000, typicalPlotSize: 15000 }
        ),
        "G+9-G+16": brHiRise(
          "G+9-G+16",
          {
            buildingRate: 680000,
            parkingRate: 450000,
            basementRate: 780000,
            infrastructureRate: 0,
          },
          { scPercent: 19, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 1100000, typicalPlotSize: 20000 }
        ),
        "G+17-G+24": brHiRise(
          "G+17-G+24",
          {
            buildingRate: 760000,
            parkingRate: 500000,
            basementRate: 860000,
            infrastructureRate: 0,
          },
          { scPercent: 20, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 1300000, typicalPlotSize: 25000 }
        ),
        "G+25-G+32": brHiRise(
          "G+25-G+32",
          {
            buildingRate: 840000,
            parkingRate: 550000,
            basementRate: 940000,
            infrastructureRate: 0,
          },
          { scPercent: 21, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 1500000, typicalPlotSize: 30000 }
        ),
        "G+33-G+50": brHiRise(
          "G+33-G+50",
          {
            buildingRate: 920000,
            parkingRate: 600000,
            basementRate: 1020000,
            infrastructureRate: 0,
          },
          { scPercent: 22, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 1700000, typicalPlotSize: 35000 }
        ),
        "G+51+": brHiRise(
          "G+51+",
          {
            buildingRate: 1000000,
            parkingRate: 650000,
            basementRate: 1100000,
            infrastructureRate: 0,
          },
          { scPercent: 23, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 1900000, typicalPlotSize: 40000 }
        ),
      },
      "commercial-strata-office": {
        "G+5-G+8": brStrata(
          {
            buildingRate: 520000,
            parkingRate: 380000,
            basementRate: 680000,
            infrastructureRate: 0,
          },
          { scPercent: 16, powcPercent: 5, ffePercent: 5 },
          { ratePerSqft: 1000000, typicalPlotSize: 15000 }
        ),
        "G+9-G+16": brStrata(
          {
            buildingRate: 600000,
            parkingRate: 430000,
            basementRate: 760000,
            infrastructureRate: 0,
          },
          { scPercent: 17, powcPercent: 5, ffePercent: 5 },
          { ratePerSqft: 1200000, typicalPlotSize: 20000 }
        ),
        "G+17-G+24": brStrata(
          {
            buildingRate: 680000,
            parkingRate: 480000,
            basementRate: 840000,
            infrastructureRate: 0,
          },
          { scPercent: 18, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 1400000, typicalPlotSize: 25000 }
        ),
        "G+25-G+32": brStrata(
          {
            buildingRate: 760000,
            parkingRate: 530000,
            basementRate: 920000,
            infrastructureRate: 0,
          },
          { scPercent: 19, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 1600000, typicalPlotSize: 30000 }
        ),
        "G+33-G+50": brStrata(
          {
            buildingRate: 840000,
            parkingRate: 580000,
            basementRate: 1000000,
            infrastructureRate: 0,
          },
          { scPercent: 20, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 1800000, typicalPlotSize: 35000 }
        ),
        "G+51+": brStrata(
          {
            buildingRate: 920000,
            parkingRate: 630000,
            basementRate: 1080000,
            infrastructureRate: 0,
          },
          { scPercent: 21, powcPercent: 7, ffePercent: 5 },
          { ratePerSqft: 2000000, typicalPlotSize: 40000 }
        ),
      },
    },
  },
  TH: {
    currency: "THB",
    buildingTypes: {
      "residential-landed": brLanded(
        {
          buildingRate: 2200,
          parkingRate: 1600,
          basementRate: 3000,
          infrastructureRate: 600,
        },
        { scPercent: 18, powcPercent: 5, ffePercent: 8 },
        { ratePerSqft: 3500, typicalPlotSize: 5000 },
        LANDED_G2_ESTATE_24M
      ),
      "commercial-landed": brLanded(
        {
          buildingRate: 2900,
          parkingRate: 2000,
          basementRate: 3600,
          infrastructureRate: 800,
        },
        { scPercent: 20, powcPercent: 6, ffePercent: 10 },
        { ratePerSqft: 4800, typicalPlotSize: 8000 },
        COMMERCIAL_LANDED_G4_18M
      ),
      "residential-hi-rise": {
        "G+5-G+8": brHiRise(
          "G+5-G+8",
          { buildingRate: 2700, parkingRate: 1800, basementRate: 3200, infrastructureRate: 0 },
          { scPercent: 18, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 4000, typicalPlotSize: 15000 }
        ),
        "G+9-G+16": brHiRise(
          "G+9-G+16",
          { buildingRate: 3000, parkingRate: 1950, basementRate: 3450, infrastructureRate: 0 },
          { scPercent: 19, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 4800, typicalPlotSize: 20000 }
        ),
        "G+17-G+24": brHiRise(
          "G+17-G+24",
          { buildingRate: 3300, parkingRate: 2100, basementRate: 3700, infrastructureRate: 0 },
          { scPercent: 20, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 5600, typicalPlotSize: 25000 }
        ),
        "G+25-G+32": brHiRise(
          "G+25-G+32",
          { buildingRate: 3600, parkingRate: 2250, basementRate: 3950, infrastructureRate: 0 },
          { scPercent: 21, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 6400, typicalPlotSize: 30000 }
        ),
        "G+33-G+50": brHiRise(
          "G+33-G+50",
          { buildingRate: 3900, parkingRate: 2400, basementRate: 4200, infrastructureRate: 0 },
          { scPercent: 22, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 7200, typicalPlotSize: 35000 }
        ),
        "G+51+": brHiRise(
          "G+51+",
          { buildingRate: 4200, parkingRate: 2550, basementRate: 4450, infrastructureRate: 0 },
          { scPercent: 23, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 8000, typicalPlotSize: 40000 }
        ),
      },
      "commercial-strata-office": {
        "G+5-G+8": brStrata(
          { buildingRate: 2350, parkingRate: 1700, basementRate: 3100, infrastructureRate: 0 },
          { scPercent: 16, powcPercent: 5, ffePercent: 5 },
          { ratePerSqft: 4500, typicalPlotSize: 15000 }
        ),
        "G+9-G+16": brStrata(
          { buildingRate: 2650, parkingRate: 1850, basementRate: 3350, infrastructureRate: 0 },
          { scPercent: 17, powcPercent: 5, ffePercent: 5 },
          { ratePerSqft: 5300, typicalPlotSize: 20000 }
        ),
        "G+17-G+24": brStrata(
          { buildingRate: 2950, parkingRate: 2000, basementRate: 3600, infrastructureRate: 0 },
          { scPercent: 18, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 6100, typicalPlotSize: 25000 }
        ),
        "G+25-G+32": brStrata(
          { buildingRate: 3250, parkingRate: 2150, basementRate: 3850, infrastructureRate: 0 },
          { scPercent: 19, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 6900, typicalPlotSize: 30000 }
        ),
        "G+33-G+50": brStrata(
          { buildingRate: 3550, parkingRate: 2300, basementRate: 4100, infrastructureRate: 0 },
          { scPercent: 20, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 7700, typicalPlotSize: 35000 }
        ),
        "G+51+": brStrata(
          { buildingRate: 3850, parkingRate: 2450, basementRate: 4350, infrastructureRate: 0 },
          { scPercent: 21, powcPercent: 7, ffePercent: 5 },
          { ratePerSqft: 8500, typicalPlotSize: 40000 }
        ),
      },
    },
  },
  AU: {
    currency: "AUD",
    buildingTypes: {
      "residential-landed": brLanded(
        {
          buildingRate: 320,
          parkingRate: 240,
          basementRate: 420,
          infrastructureRate: 90,
        },
        { scPercent: 18, powcPercent: 5, ffePercent: 8 },
        { ratePerSqft: 500, typicalPlotSize: 5000 },
        LANDED_G2_ESTATE_24M
      ),
      "commercial-landed": brLanded(
        {
          buildingRate: 420,
          parkingRate: 300,
          basementRate: 520,
          infrastructureRate: 120,
        },
        { scPercent: 20, powcPercent: 6, ffePercent: 10 },
        { ratePerSqft: 700, typicalPlotSize: 8000 },
        COMMERCIAL_LANDED_G4_18M
      ),
      "residential-hi-rise": {
        "G+5-G+8": brHiRise(
          "G+5-G+8",
          { buildingRate: 400, parkingRate: 280, basementRate: 460, infrastructureRate: 0 },
          { scPercent: 18, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 600, typicalPlotSize: 15000 }
        ),
        "G+9-G+16": brHiRise(
          "G+9-G+16",
          { buildingRate: 450, parkingRate: 310, basementRate: 510, infrastructureRate: 0 },
          { scPercent: 19, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 750, typicalPlotSize: 20000 }
        ),
        "G+17-G+24": brHiRise(
          "G+17-G+24",
          { buildingRate: 500, parkingRate: 340, basementRate: 560, infrastructureRate: 0 },
          { scPercent: 20, powcPercent: 5, ffePercent: 10 },
          { ratePerSqft: 900, typicalPlotSize: 25000 }
        ),
        "G+25-G+32": brHiRise(
          "G+25-G+32",
          { buildingRate: 550, parkingRate: 370, basementRate: 610, infrastructureRate: 0 },
          { scPercent: 21, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 1050, typicalPlotSize: 30000 }
        ),
        "G+33-G+50": brHiRise(
          "G+33-G+50",
          { buildingRate: 600, parkingRate: 400, basementRate: 660, infrastructureRate: 0 },
          { scPercent: 22, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 1200, typicalPlotSize: 35000 }
        ),
        "G+51+": brHiRise(
          "G+51+",
          { buildingRate: 650, parkingRate: 430, basementRate: 710, infrastructureRate: 0 },
          { scPercent: 23, powcPercent: 6, ffePercent: 10 },
          { ratePerSqft: 1350, typicalPlotSize: 40000 }
        ),
      },
      "commercial-strata-office": {
        "G+5-G+8": brStrata(
          { buildingRate: 350, parkingRate: 260, basementRate: 440, infrastructureRate: 0 },
          { scPercent: 16, powcPercent: 5, ffePercent: 5 },
          { ratePerSqft: 700, typicalPlotSize: 15000 }
        ),
        "G+9-G+16": brStrata(
          { buildingRate: 400, parkingRate: 290, basementRate: 490, infrastructureRate: 0 },
          { scPercent: 17, powcPercent: 5, ffePercent: 5 },
          { ratePerSqft: 850, typicalPlotSize: 20000 }
        ),
        "G+17-G+24": brStrata(
          { buildingRate: 450, parkingRate: 320, basementRate: 540, infrastructureRate: 0 },
          { scPercent: 18, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 1000, typicalPlotSize: 25000 }
        ),
        "G+25-G+32": brStrata(
          { buildingRate: 500, parkingRate: 350, basementRate: 590, infrastructureRate: 0 },
          { scPercent: 19, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 1150, typicalPlotSize: 30000 }
        ),
        "G+33-G+50": brStrata(
          { buildingRate: 550, parkingRate: 380, basementRate: 640, infrastructureRate: 0 },
          { scPercent: 20, powcPercent: 6, ffePercent: 5 },
          { ratePerSqft: 1300, typicalPlotSize: 35000 }
        ),
        "G+51+": brStrata(
          { buildingRate: 600, parkingRate: 410, basementRate: 690, infrastructureRate: 0 },
          { scPercent: 21, powcPercent: 7, ffePercent: 5 },
          { ratePerSqft: 1450, typicalPlotSize: 40000 }
        ),
      },
    },
  },
};

/** Maps tower floor count to hi-rise bucket (e.g. 18 → G+17-G+24). */
export function getHeightRangeKey(floors: number): string {
  const n = Math.max(0, Math.floor(floors));
  if (n <= 8) return "G+5-G+8";
  if (n <= 16) return "G+9-G+16";
  if (n <= 24) return "G+17-G+24";
  if (n <= 32) return "G+25-G+32";
  if (n <= 50) return "G+33-G+50";
  return "G+51+";
}

export function getRecommendations(
  countryCode: string,
  buildingType: SaleRecommendationBuildingType,
  floorsOrRange?: number | string
): BuildingRecommendations | null {
  const country = RECOMMENDATIONS[countryCode];
  if (!country) {
    console.error(`[getRecommendations] Country not found: ${countryCode}`);
    return null;
  }

  if (buildingType === "residential-landed" || buildingType === "commercial-landed") {
    const landed = country.buildingTypes[buildingType];
    if (!landed) {
      console.error(`[getRecommendations] Building type not found: ${buildingType}`);
      return null;
    }
    return landed;
  }

  const buildingRec = country.buildingTypes[buildingType];
  if (!buildingRec) {
    console.error(`[getRecommendations] Building type not found: ${buildingType}`);
    return null;
  }

  const bucket = buildingRec as Record<string, BuildingRecommendations>;

  if (typeof floorsOrRange === "string") {
    const rangeRec = bucket[floorsOrRange];
    if (!rangeRec) {
      console.error(
        `[getRecommendations] Height range not found: ${floorsOrRange} (${buildingType})`
      );
      console.log("[getRecommendations] Available ranges:", Object.keys(bucket));
    }
    return rangeRec ?? null;
  }

  if (typeof floorsOrRange === "number") {
    const rangeKey = getHeightRangeKey(floorsOrRange);
    const rangeRec = bucket[rangeKey];
    if (!rangeRec) {
      console.error(
        `[getRecommendations] Height range not found: ${rangeKey} (${buildingType})`
      );
      console.log("[getRecommendations] Available ranges:", Object.keys(bucket));
    }
    return rangeRec ?? null;
  }

  console.error(
    `[getRecommendations] Missing floors or height range for bucketed type: ${buildingType}`
  );
  return null;
}

export function getCityLandRate(
  countryCode: string,
  cityName: string,
  buildingType: SaleRecommendationBuildingType,
  floorsOrRange?: number | string
): { ratePerSqft: number; typicalPlotSize: number } | null {
  const rec = getRecommendations(countryCode, buildingType, floorsOrRange);
  if (!rec?.landRates) return null;
  const cityRate = rec.landRates.byCity?.[cityName];
  return cityRate ?? rec.landRates.default;
}

if (process.env.NODE_ENV === "development") {
  console.log("📊 [Sale Recommendations] Loaded", Object.keys(RECOMMENDATIONS).length, "countries");
  console.log("💱 [Country Rate Verification] residential-hi-rise G+9-G+16 buildingRate:", {
    UAE_G9G16:
      RECOMMENDATIONS.AE.buildingTypes["residential-hi-rise"]["G+9-G+16"].constructionCosts
        .buildingRate,
    SA_G9G16:
      RECOMMENDATIONS.SA.buildingTypes["residential-hi-rise"]["G+9-G+16"].constructionCosts
        .buildingRate,
    MY_G9G16:
      RECOMMENDATIONS.MY.buildingTypes["residential-hi-rise"]["G+9-G+16"].constructionCosts
        .buildingRate,
    VN_G9G16:
      RECOMMENDATIONS.VN.buildingTypes["residential-hi-rise"]["G+9-G+16"].constructionCosts
        .buildingRate,
    TH_G9G16:
      RECOMMENDATIONS.TH.buildingTypes["residential-hi-rise"]["G+9-G+16"].constructionCosts
        .buildingRate,
    AU_G9G16:
      RECOMMENDATIONS.AU.buildingTypes["residential-hi-rise"]["G+9-G+16"].constructionCosts
        .buildingRate,
  });
}

