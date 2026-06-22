export interface RetailConstructionBenchmark {
  country: string;
  segment: string;
  positioning: string;
  buildingRate: number;
  parkingRate: number;
  basementRate: number;
  softCostsPercent: number;
  powcPercent: number;
  ffePercent: number;
  landRate: number;
}

/** Wizard `projectInfo.country` values mapped to benchmark keys. */
export function normalizeRetailCountry(country: string): string {
  const c = (country || "").trim();
  if (c === "United Arab Emirates" || c === "UAE") return "UAE";
  if (c === "Saudi Arabia" || c === "KSA") return "Saudi Arabia";
  return c;
}

export const RETAIL_BENCHMARKS: RetailConstructionBenchmark[] = [
  // ============================================
  // UAE (All Segments & Positionings)
  // ============================================

  // UAE - Regional Mall
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "luxury",
    buildingRate: 650,
    parkingRate: 325,
    basementRate: 715,
    softCostsPercent: 11,
    powcPercent: 6,
    ffePercent: 20,
    landRate: 2500,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "upscale",
    buildingRate: 550,
    parkingRate: 275,
    basementRate: 605,
    softCostsPercent: 10,
    powcPercent: 5.5,
    ffePercent: 15,
    landRate: 2000,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "mid_market",
    buildingRate: 450,
    parkingRate: 225,
    basementRate: 495,
    softCostsPercent: 9,
    powcPercent: 5,
    ffePercent: 10,
    landRate: 1500,
  },
  {
    country: "UAE",
    segment: "regional_mall",
    positioning: "value",
    buildingRate: 375,
    parkingRate: 188,
    basementRate: 413,
    softCostsPercent: 8,
    powcPercent: 4.5,
    ffePercent: 7,
    landRate: 1000,
  },

  // UAE - Lifestyle Center
  {
    country: "UAE",
    segment: "lifestyle_center",
    positioning: "luxury",
    buildingRate: 700,
    parkingRate: 350,
    basementRate: 770,
    softCostsPercent: 12,
    powcPercent: 6.5,
    ffePercent: 22,
    landRate: 3000,
  },
  {
    country: "UAE",
    segment: "lifestyle_center",
    positioning: "upscale",
    buildingRate: 600,
    parkingRate: 300,
    basementRate: 660,
    softCostsPercent: 11,
    powcPercent: 6,
    ffePercent: 16,
    landRate: 2500,
  },
  {
    country: "UAE",
    segment: "lifestyle_center",
    positioning: "mid_market",
    buildingRate: 500,
    parkingRate: 250,
    basementRate: 550,
    softCostsPercent: 10,
    powcPercent: 5.5,
    ffePercent: 11,
    landRate: 2000,
  },

  // UAE - Community Center
  {
    country: "UAE",
    segment: "community_center",
    positioning: "upscale",
    buildingRate: 475,
    parkingRate: 238,
    basementRate: 523,
    softCostsPercent: 9,
    powcPercent: 5,
    ffePercent: 10,
    landRate: 1500,
  },
  {
    country: "UAE",
    segment: "community_center",
    positioning: "mid_market",
    buildingRate: 400,
    parkingRate: 200,
    basementRate: 440,
    softCostsPercent: 8,
    powcPercent: 4.5,
    ffePercent: 8,
    landRate: 1200,
  },
  {
    country: "UAE",
    segment: "community_center",
    positioning: "value",
    buildingRate: 325,
    parkingRate: 163,
    basementRate: 358,
    softCostsPercent: 7,
    powcPercent: 4,
    ffePercent: 5,
    landRate: 800,
  },

  // UAE - Outlet Center
  {
    country: "UAE",
    segment: "outlet_center",
    positioning: "mid_market",
    buildingRate: 375,
    parkingRate: 188,
    basementRate: 413,
    softCostsPercent: 7.5,
    powcPercent: 4.5,
    ffePercent: 7,
    landRate: 1000,
  },
  {
    country: "UAE",
    segment: "outlet_center",
    positioning: "value",
    buildingRate: 350,
    parkingRate: 175,
    basementRate: 385,
    softCostsPercent: 7,
    powcPercent: 4,
    ffePercent: 6,
    landRate: 800,
  },

  // ============================================
  // Saudi Arabia (All Segments & Positionings)
  // ============================================

  // Saudi Arabia - Regional Mall
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "luxury",
    buildingRate: 550,
    parkingRate: 275,
    basementRate: 605,
    softCostsPercent: 10.5,
    powcPercent: 5.5,
    ffePercent: 18,
    landRate: 2000,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "upscale",
    buildingRate: 475,
    parkingRate: 238,
    basementRate: 523,
    softCostsPercent: 9.5,
    powcPercent: 5,
    ffePercent: 13,
    landRate: 1600,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "mid_market",
    buildingRate: 400,
    parkingRate: 200,
    basementRate: 440,
    softCostsPercent: 8.5,
    powcPercent: 4.5,
    ffePercent: 9,
    landRate: 1200,
  },
  {
    country: "Saudi Arabia",
    segment: "regional_mall",
    positioning: "value",
    buildingRate: 325,
    parkingRate: 163,
    basementRate: 358,
    softCostsPercent: 7.5,
    powcPercent: 4,
    ffePercent: 6,
    landRate: 800,
  },

  // Saudi Arabia - Lifestyle Center
  {
    country: "Saudi Arabia",
    segment: "lifestyle_center",
    positioning: "luxury",
    buildingRate: 600,
    parkingRate: 300,
    basementRate: 660,
    softCostsPercent: 11,
    powcPercent: 6,
    ffePercent: 20,
    landRate: 2500,
  },
  {
    country: "Saudi Arabia",
    segment: "lifestyle_center",
    positioning: "upscale",
    buildingRate: 525,
    parkingRate: 263,
    basementRate: 578,
    softCostsPercent: 10,
    powcPercent: 5.5,
    ffePercent: 15,
    landRate: 2000,
  },
  {
    country: "Saudi Arabia",
    segment: "lifestyle_center",
    positioning: "mid_market",
    buildingRate: 450,
    parkingRate: 225,
    basementRate: 495,
    softCostsPercent: 9,
    powcPercent: 5,
    ffePercent: 10,
    landRate: 1500,
  },

  // Saudi Arabia - Community Center
  {
    country: "Saudi Arabia",
    segment: "community_center",
    positioning: "upscale",
    buildingRate: 425,
    parkingRate: 213,
    basementRate: 468,
    softCostsPercent: 8.5,
    powcPercent: 4.5,
    ffePercent: 9,
    landRate: 1200,
  },
  {
    country: "Saudi Arabia",
    segment: "community_center",
    positioning: "mid_market",
    buildingRate: 375,
    parkingRate: 188,
    basementRate: 413,
    softCostsPercent: 8,
    powcPercent: 4.5,
    ffePercent: 7,
    landRate: 1000,
  },
  {
    country: "Saudi Arabia",
    segment: "community_center",
    positioning: "value",
    buildingRate: 300,
    parkingRate: 150,
    basementRate: 330,
    softCostsPercent: 7,
    powcPercent: 4,
    ffePercent: 5,
    landRate: 700,
  },

  // Saudi Arabia - Outlet Center
  {
    country: "Saudi Arabia",
    segment: "outlet_center",
    positioning: "mid_market",
    buildingRate: 350,
    parkingRate: 175,
    basementRate: 385,
    softCostsPercent: 7.5,
    powcPercent: 4.5,
    ffePercent: 7,
    landRate: 900,
  },
  {
    country: "Saudi Arabia",
    segment: "outlet_center",
    positioning: "value",
    buildingRate: 300,
    parkingRate: 150,
    basementRate: 330,
    softCostsPercent: 7,
    powcPercent: 4,
    ffePercent: 5,
    landRate: 650,
  },

  // ============================================
  // Malaysia (All Segments & Positionings)
  // ============================================

  // Malaysia - Regional Mall
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "luxury",
    buildingRate: 550,
    parkingRate: 275,
    basementRate: 605,
    softCostsPercent: 10,
    powcPercent: 5.5,
    ffePercent: 17,
    landRate: 800,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "upscale",
    buildingRate: 475,
    parkingRate: 238,
    basementRate: 523,
    softCostsPercent: 9,
    powcPercent: 5,
    ffePercent: 12,
    landRate: 650,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "mid_market",
    buildingRate: 400,
    parkingRate: 200,
    basementRate: 440,
    softCostsPercent: 8,
    powcPercent: 4.5,
    ffePercent: 8,
    landRate: 500,
  },
  {
    country: "Malaysia",
    segment: "regional_mall",
    positioning: "value",
    buildingRate: 325,
    parkingRate: 163,
    basementRate: 358,
    softCostsPercent: 7,
    powcPercent: 4,
    ffePercent: 5,
    landRate: 350,
  },

  // Malaysia - Lifestyle Center
  {
    country: "Malaysia",
    segment: "lifestyle_center",
    positioning: "luxury",
    buildingRate: 600,
    parkingRate: 300,
    basementRate: 660,
    softCostsPercent: 11,
    powcPercent: 6,
    ffePercent: 19,
    landRate: 1000,
  },
  {
    country: "Malaysia",
    segment: "lifestyle_center",
    positioning: "upscale",
    buildingRate: 525,
    parkingRate: 263,
    basementRate: 578,
    softCostsPercent: 10,
    powcPercent: 5.5,
    ffePercent: 14,
    landRate: 800,
  },
  {
    country: "Malaysia",
    segment: "lifestyle_center",
    positioning: "mid_market",
    buildingRate: 450,
    parkingRate: 225,
    basementRate: 495,
    softCostsPercent: 9,
    powcPercent: 5,
    ffePercent: 9,
    landRate: 600,
  },

  // Malaysia - Community Center
  {
    country: "Malaysia",
    segment: "community_center",
    positioning: "upscale",
    buildingRate: 425,
    parkingRate: 213,
    basementRate: 468,
    softCostsPercent: 8.5,
    powcPercent: 4.5,
    ffePercent: 8,
    landRate: 500,
  },
  {
    country: "Malaysia",
    segment: "community_center",
    positioning: "mid_market",
    buildingRate: 375,
    parkingRate: 188,
    basementRate: 413,
    softCostsPercent: 8,
    powcPercent: 4.5,
    ffePercent: 6,
    landRate: 400,
  },
  {
    country: "Malaysia",
    segment: "community_center",
    positioning: "value",
    buildingRate: 300,
    parkingRate: 150,
    basementRate: 330,
    softCostsPercent: 7,
    powcPercent: 4,
    ffePercent: 4,
    landRate: 300,
  },

  // Malaysia - Outlet Center
  {
    country: "Malaysia",
    segment: "outlet_center",
    positioning: "mid_market",
    buildingRate: 350,
    parkingRate: 175,
    basementRate: 385,
    softCostsPercent: 7.5,
    powcPercent: 4.5,
    ffePercent: 6,
    landRate: 400,
  },
  {
    country: "Malaysia",
    segment: "outlet_center",
    positioning: "value",
    buildingRate: 300,
    parkingRate: 150,
    basementRate: 330,
    softCostsPercent: 7,
    powcPercent: 4,
    ffePercent: 5,
    landRate: 300,
  },

  // ============================================
  // Australia (All Segments & Positionings)
  // Rates converted from AUD/sqm to AUD/sqft (÷ 10.764)
  // ============================================

  // Australia - Regional Mall
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "luxury",
    buildingRate: 418,
    parkingRate: 209,
    basementRate: 460,
    softCostsPercent: 11,
    powcPercent: 6,
    ffePercent: 19,
    landRate: 325,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "upscale",
    buildingRate: 353,
    parkingRate: 177,
    basementRate: 388,
    softCostsPercent: 10,
    powcPercent: 5.5,
    ffePercent: 14,
    landRate: 260,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "mid_market",
    buildingRate: 297,
    parkingRate: 149,
    basementRate: 327,
    softCostsPercent: 9,
    powcPercent: 5,
    ffePercent: 9,
    landRate: 205,
  },
  {
    country: "Australia",
    segment: "regional_mall",
    positioning: "value",
    buildingRate: 242,
    parkingRate: 121,
    basementRate: 266,
    softCostsPercent: 8,
    powcPercent: 4.5,
    ffePercent: 6,
    landRate: 150,
  },

  // Australia - Lifestyle Center
  {
    country: "Australia",
    segment: "lifestyle_center",
    positioning: "luxury",
    buildingRate: 464,
    parkingRate: 232,
    basementRate: 511,
    softCostsPercent: 12,
    powcPercent: 6.5,
    ffePercent: 21,
    landRate: 370,
  },
  {
    country: "Australia",
    segment: "lifestyle_center",
    positioning: "upscale",
    buildingRate: 399,
    parkingRate: 200,
    basementRate: 439,
    softCostsPercent: 11,
    powcPercent: 6,
    ffePercent: 16,
    landRate: 300,
  },
  {
    country: "Australia",
    segment: "lifestyle_center",
    positioning: "mid_market",
    buildingRate: 344,
    parkingRate: 172,
    basementRate: 378,
    softCostsPercent: 10,
    powcPercent: 5.5,
    ffePercent: 11,
    landRate: 240,
  },

  // Australia - Community Center
  {
    country: "Australia",
    segment: "community_center",
    positioning: "upscale",
    buildingRate: 330,
    parkingRate: 165,
    basementRate: 363,
    softCostsPercent: 9.5,
    powcPercent: 5,
    ffePercent: 9,
    landRate: 220,
  },
  {
    country: "Australia",
    segment: "community_center",
    positioning: "mid_market",
    buildingRate: 288,
    parkingRate: 144,
    basementRate: 317,
    softCostsPercent: 9,
    powcPercent: 5,
    ffePercent: 7,
    landRate: 175,
  },
  {
    country: "Australia",
    segment: "community_center",
    positioning: "value",
    buildingRate: 232,
    parkingRate: 116,
    basementRate: 255,
    softCostsPercent: 8,
    powcPercent: 4.5,
    ffePercent: 5,
    landRate: 130,
  },

  // Australia - Outlet Center
  {
    country: "Australia",
    segment: "outlet_center",
    positioning: "mid_market",
    buildingRate: 269,
    parkingRate: 135,
    basementRate: 296,
    softCostsPercent: 8.5,
    powcPercent: 5,
    ffePercent: 7,
    landRate: 165,
  },
  {
    country: "Australia",
    segment: "outlet_center",
    positioning: "value",
    buildingRate: 232,
    parkingRate: 116,
    basementRate: 255,
    softCostsPercent: 8,
    powcPercent: 4.5,
    ffePercent: 5,
    landRate: 120,
  },

  // ============================================
  // Vietnam (All Segments & Positionings)
  // ============================================

  // Vietnam - Regional Mall
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "luxury",
    buildingRate: 500,
    parkingRate: 250,
    basementRate: 550,
    softCostsPercent: 9.5,
    powcPercent: 5,
    ffePercent: 16,
    landRate: 1500,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "upscale",
    buildingRate: 425,
    parkingRate: 213,
    basementRate: 468,
    softCostsPercent: 8.5,
    powcPercent: 4.5,
    ffePercent: 11,
    landRate: 1200,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "mid_market",
    buildingRate: 350,
    parkingRate: 175,
    basementRate: 385,
    softCostsPercent: 7.5,
    powcPercent: 4,
    ffePercent: 7,
    landRate: 900,
  },
  {
    country: "Vietnam",
    segment: "regional_mall",
    positioning: "value",
    buildingRate: 275,
    parkingRate: 138,
    basementRate: 303,
    softCostsPercent: 6.5,
    powcPercent: 3.5,
    ffePercent: 5,
    landRate: 600,
  },

  // Vietnam - Lifestyle Center
  {
    country: "Vietnam",
    segment: "lifestyle_center",
    positioning: "luxury",
    buildingRate: 550,
    parkingRate: 275,
    basementRate: 605,
    softCostsPercent: 10.5,
    powcPercent: 5.5,
    ffePercent: 18,
    landRate: 1800,
  },
  {
    country: "Vietnam",
    segment: "lifestyle_center",
    positioning: "upscale",
    buildingRate: 475,
    parkingRate: 238,
    basementRate: 523,
    softCostsPercent: 9.5,
    powcPercent: 5,
    ffePercent: 13,
    landRate: 1400,
  },
  {
    country: "Vietnam",
    segment: "lifestyle_center",
    positioning: "mid_market",
    buildingRate: 400,
    parkingRate: 200,
    basementRate: 440,
    softCostsPercent: 8.5,
    powcPercent: 4.5,
    ffePercent: 8,
    landRate: 1100,
  },

  // Vietnam - Community Center
  {
    country: "Vietnam",
    segment: "community_center",
    positioning: "upscale",
    buildingRate: 375,
    parkingRate: 188,
    basementRate: 413,
    softCostsPercent: 8,
    powcPercent: 4.5,
    ffePercent: 7,
    landRate: 900,
  },
  {
    country: "Vietnam",
    segment: "community_center",
    positioning: "mid_market",
    buildingRate: 325,
    parkingRate: 163,
    basementRate: 358,
    softCostsPercent: 7.5,
    powcPercent: 4,
    ffePercent: 6,
    landRate: 700,
  },
  {
    country: "Vietnam",
    segment: "community_center",
    positioning: "value",
    buildingRate: 250,
    parkingRate: 125,
    basementRate: 275,
    softCostsPercent: 6.5,
    powcPercent: 3.5,
    ffePercent: 4,
    landRate: 500,
  },

  // Vietnam - Outlet Center
  {
    country: "Vietnam",
    segment: "outlet_center",
    positioning: "mid_market",
    buildingRate: 300,
    parkingRate: 150,
    basementRate: 330,
    softCostsPercent: 7,
    powcPercent: 4,
    ffePercent: 6,
    landRate: 650,
  },
  {
    country: "Vietnam",
    segment: "outlet_center",
    positioning: "value",
    buildingRate: 250,
    parkingRate: 125,
    basementRate: 275,
    softCostsPercent: 6.5,
    powcPercent: 3.5,
    ffePercent: 4,
    landRate: 450,
  },

  // ============================================
  // Thailand (All Segments & Positionings)
  // Rates converted from THB/sqm to THB/sqft (÷ 10.764)
  // ============================================

  // Thailand - Regional Mall
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "luxury",
    buildingRate: 5110,
    parkingRate: 2555,
    basementRate: 5621,
    softCostsPercent: 10,
    powcPercent: 5.5,
    ffePercent: 17,
    landRate: 1856,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "upscale",
    buildingRate: 4366,
    parkingRate: 2183,
    basementRate: 4803,
    softCostsPercent: 9,
    powcPercent: 5,
    ffePercent: 12,
    landRate: 1486,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "mid_market",
    buildingRate: 3716,
    parkingRate: 1858,
    basementRate: 4088,
    softCostsPercent: 8,
    powcPercent: 4.5,
    ffePercent: 8,
    landRate: 1115,
  },
  {
    country: "Thailand",
    segment: "regional_mall",
    positioning: "value",
    buildingRate: 2973,
    parkingRate: 1487,
    basementRate: 3270,
    softCostsPercent: 7,
    powcPercent: 4,
    ffePercent: 5,
    landRate: 744,
  },

  // Thailand - Lifestyle Center
  {
    country: "Thailand",
    segment: "lifestyle_center",
    positioning: "luxury",
    buildingRate: 5574,
    parkingRate: 2787,
    basementRate: 6131,
    softCostsPercent: 11,
    powcPercent: 6,
    ffePercent: 19,
    landRate: 2137,
  },
  {
    country: "Thailand",
    segment: "lifestyle_center",
    positioning: "upscale",
    buildingRate: 4830,
    parkingRate: 2415,
    basementRate: 5313,
    softCostsPercent: 10,
    powcPercent: 5.5,
    ffePercent: 14,
    landRate: 1767,
  },
  {
    country: "Thailand",
    segment: "lifestyle_center",
    positioning: "mid_market",
    buildingRate: 4180,
    parkingRate: 2090,
    basementRate: 4598,
    softCostsPercent: 9,
    powcPercent: 5,
    ffePercent: 9,
    landRate: 1396,
  },

  // Thailand - Community Center
  {
    country: "Thailand",
    segment: "community_center",
    positioning: "upscale",
    buildingRate: 3902,
    parkingRate: 1951,
    basementRate: 4292,
    softCostsPercent: 8.5,
    powcPercent: 4.5,
    ffePercent: 8,
    landRate: 1208,
  },
  {
    country: "Thailand",
    segment: "community_center",
    positioning: "mid_market",
    buildingRate: 3437,
    parkingRate: 1719,
    basementRate: 3781,
    softCostsPercent: 8,
    powcPercent: 4.5,
    ffePercent: 7,
    landRate: 930,
  },
  {
    country: "Thailand",
    segment: "community_center",
    positioning: "value",
    buildingRate: 2787,
    parkingRate: 1394,
    basementRate: 3066,
    softCostsPercent: 7,
    powcPercent: 4,
    ffePercent: 5,
    landRate: 651,
  },

  // Thailand - Outlet Center
  {
    country: "Thailand",
    segment: "outlet_center",
    positioning: "mid_market",
    buildingRate: 3251,
    parkingRate: 1626,
    basementRate: 3576,
    softCostsPercent: 7.5,
    powcPercent: 4.5,
    ffePercent: 7,
    landRate: 837,
  },
  {
    country: "Thailand",
    segment: "outlet_center",
    positioning: "value",
    buildingRate: 2787,
    parkingRate: 1394,
    basementRate: 3066,
    softCostsPercent: 7,
    powcPercent: 4,
    ffePercent: 5,
    landRate: 558,
  },
];

const POSITIONING_FALLBACK_ORDER = [
  "luxury",
  "upscale",
  "mid_market",
  "value",
] as const;

function findExact(
  country: string,
  segment: string,
  positioning: string
): RetailConstructionBenchmark | undefined {
  const normCountry = normalizeRetailCountry(country);
  return RETAIL_BENCHMARKS.find(
    (b) =>
      b.country === normCountry &&
      b.segment === segment &&
      b.positioning === positioning
  );
}

export function getRetailBenchmarkProfileKey(
  country: string,
  segment: string,
  positioning: string
): string | null {
  if (!country?.trim() || !segment?.trim() || !positioning?.trim()) return null;
  return `${normalizeRetailCountry(country)}:${segment}:${positioning}`;
}

export function getRetailBenchmark(
  country: string,
  segment: string,
  positioning: string
): RetailConstructionBenchmark | null {
  if (!country?.trim() || !segment?.trim() || !positioning?.trim()) return null;

  const exact = findExact(country, segment, positioning);
  if (exact) return exact;

  const normCountry = normalizeRetailCountry(country);
  const sameSegment = RETAIL_BENCHMARKS.filter(
    (b) => b.country === normCountry && b.segment === segment
  );
  if (sameSegment.length > 0) {
    const idx = POSITIONING_FALLBACK_ORDER.indexOf(
      positioning as (typeof POSITIONING_FALLBACK_ORDER)[number]
    );
    if (idx >= 0) {
      for (let i = idx; i < POSITIONING_FALLBACK_ORDER.length; i++) {
        const match = sameSegment.find(
          (b) => b.positioning === POSITIONING_FALLBACK_ORDER[i]
        );
        if (match) return match;
      }
      for (let i = idx - 1; i >= 0; i--) {
        const match = sameSegment.find(
          (b) => b.positioning === POSITIONING_FALLBACK_ORDER[i]
        );
        if (match) return match;
      }
    }
    return sameSegment[0] ?? null;
  }

  return (
    findExact(normCountry, "regional_mall", "mid_market") ??
    findExact("UAE", "regional_mall", "mid_market") ??
    null
  );
}

export function formatRetailBenchmarkLabel(
  country: string,
  segment: string,
  positioning: string
): string {
  const fmt = (id: string) =>
    id
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  const displayCountry =
    normalizeRetailCountry(country) === "UAE"
      ? "UAE"
      : country || "—";
  return `Retail · ${fmt(segment)} · ${fmt(positioning)} · ${displayCountry}`;
}
