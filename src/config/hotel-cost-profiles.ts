export type HotelProfile = {
  /** Construction cost incl. contingency as share of DC (SC + POWC + FFE + CC%). */
  cc: number;
  /** FFE as share of DC. */
  ffe: number;
  /** Soft costs as share of DC. */
  sc: number;
  /** POWC as share of DC. */
  powc: number;
  source: string;
  regions: string[];
};

export type HotelOperatingType = "budget" | "boutique" | "business" | "resort";

export const HOTEL_COST_PROFILES: Record<string, HotelProfile> = {
  "business-5-dubai": {
    cc: 0.69,
    ffe: 0.18,
    sc: 0.08,
    powc: 0.05,
    source: "HVS Dubai Hotel Development Cost Survey 2024",
    regions: ["dubai", "uae", "gcc"],
  },
  "business-4-dubai": {
    cc: 0.71,
    ffe: 0.16,
    sc: 0.08,
    powc: 0.05,
    source: "JLL Middle East Hotel Development Report 2024",
    regions: ["dubai", "uae", "gcc"],
  },
  "business-3-dubai": {
    cc: 0.74,
    ffe: 0.13,
    sc: 0.08,
    powc: 0.05,
    source: "STR GCC Midscale Hotel Benchmarks",
    regions: ["dubai", "uae", "gcc"],
  },
  "resort-5-dubai": {
    cc: 0.64,
    ffe: 0.23,
    sc: 0.08,
    powc: 0.05,
    source: "HVS Resort Development Cost Survey — GCC",
    regions: ["dubai", "uae", "gcc"],
  },
  "resort-4-dubai": {
    cc: 0.66,
    ffe: 0.21,
    sc: 0.08,
    powc: 0.05,
    source: "JLL Middle East Leisure Hospitality Report",
    regions: ["dubai", "uae", "gcc"],
  },
  "boutique-4-dubai": {
    cc: 0.67,
    ffe: 0.2,
    sc: 0.08,
    powc: 0.05,
    source: "CBRE Boutique Hotel Development Trends — MENA",
    regions: ["dubai", "uae", "gcc"],
  },
  "boutique-3-dubai": {
    cc: 0.7,
    ffe: 0.17,
    sc: 0.08,
    powc: 0.05,
    source: "STR Boutique Segment Analysis — GCC",
    regions: ["dubai", "uae", "gcc"],
  },
  "budget-1-dubai": {
    cc: 0.79,
    ffe: 0.07,
    sc: 0.09,
    powc: 0.05,
    source: "HVS Economy Hotel Cost Benchmarks — MENA",
    regions: ["dubai", "uae", "gcc"],
  },

  "business-5-malaysia": {
    cc: 0.7,
    ffe: 0.17,
    sc: 0.08,
    powc: 0.05,
    source: "JLL Malaysia Hotel Development Cost Guide 2024",
    regions: ["malaysia", "kl", "penang"],
  },
  "business-4-malaysia": {
    cc: 0.72,
    ffe: 0.15,
    sc: 0.08,
    powc: 0.05,
    source: "CBRE Malaysia Hospitality Report 2024",
    regions: ["malaysia", "kl", "penang"],
  },
  "business-3-malaysia": {
    cc: 0.75,
    ffe: 0.12,
    sc: 0.08,
    powc: 0.05,
    source: "STR Malaysia Midscale Hotel Benchmarks",
    regions: ["malaysia", "kl", "penang"],
  },
  "resort-5-malaysia": {
    cc: 0.66,
    ffe: 0.21,
    sc: 0.08,
    powc: 0.05,
    source: "HVS Asia Pacific Resort Development Survey",
    regions: ["malaysia", "langkawi", "kotakinabalu"],
  },
  "resort-4-malaysia": {
    cc: 0.68,
    ffe: 0.19,
    sc: 0.08,
    powc: 0.05,
    source: "JLL Malaysia Leisure Hospitality Report",
    regions: ["malaysia", "langkawi", "kotakinabalu"],
  },
  "boutique-4-malaysia": {
    cc: 0.69,
    ffe: 0.18,
    sc: 0.08,
    powc: 0.05,
    source: "CBRE Boutique Hotel Trends — Southeast Asia",
    regions: ["malaysia", "kl", "penang"],
  },
  "boutique-3-malaysia": {
    cc: 0.72,
    ffe: 0.15,
    sc: 0.08,
    powc: 0.05,
    source: "STR Boutique Segment — Malaysia",
    regions: ["malaysia", "kl", "penang"],
  },
  "budget-1-malaysia": {
    cc: 0.8,
    ffe: 0.06,
    sc: 0.09,
    powc: 0.05,
    source: "HVS Economy Hotel Cost Benchmarks — SEA",
    regions: ["malaysia", "kl", "jb"],
  },

  "business-5-australia": {
    cc: 0.68,
    ffe: 0.19,
    sc: 0.08,
    powc: 0.05,
    source: "HVS Australia Hotel Development Cost Survey 2024",
    regions: ["australia", "sydney", "melbourne"],
  },
  "business-4-australia": {
    cc: 0.7,
    ffe: 0.17,
    sc: 0.08,
    powc: 0.05,
    source: "JLL Australia Hospitality Report 2024",
    regions: ["australia", "sydney", "melbourne"],
  },
  "business-3-australia": {
    cc: 0.73,
    ffe: 0.14,
    sc: 0.08,
    powc: 0.05,
    source: "STR Australia Midscale Hotel Benchmarks",
    regions: ["australia", "brisbane", "perth"],
  },
  "resort-5-australia": {
    cc: 0.63,
    ffe: 0.24,
    sc: 0.08,
    powc: 0.05,
    source: "HVS Resort Development Cost Survey — APAC",
    regions: ["australia", "goldcoast", "cairns"],
  },
  "resort-4-australia": {
    cc: 0.65,
    ffe: 0.22,
    sc: 0.08,
    powc: 0.05,
    source: "JLL Australia Leisure Hospitality Report",
    regions: ["australia", "goldcoast", "cairns"],
  },
  "boutique-4-australia": {
    cc: 0.67,
    ffe: 0.2,
    sc: 0.08,
    powc: 0.05,
    source: "CBRE Boutique Hotel Trends — Australia",
    regions: ["australia", "sydney", "melbourne"],
  },
  "boutique-3-australia": {
    cc: 0.71,
    ffe: 0.16,
    sc: 0.08,
    powc: 0.05,
    source: "STR Boutique Segment — Australia",
    regions: ["australia", "sydney", "melbourne"],
  },
  "budget-1-australia": {
    cc: 0.77,
    ffe: 0.09,
    sc: 0.09,
    powc: 0.05,
    source: "HVS Economy Hotel Cost Benchmarks — ANZ",
    regions: ["australia", "sydney", "melbourne"],
  },

  "business-5-china": {
    cc: 0.67,
    ffe: 0.2,
    sc: 0.08,
    powc: 0.05,
    source: "HVS China Hotel Development Cost Survey 2024",
    regions: ["china", "shanghai", "beijing", "hk"],
  },
  "business-4-china": {
    cc: 0.69,
    ffe: 0.18,
    sc: 0.08,
    powc: 0.05,
    source: "JLL China Hospitality Report 2024",
    regions: ["china", "shanghai", "beijing", "hk"],
  },
  "business-3-china": {
    cc: 0.72,
    ffe: 0.15,
    sc: 0.08,
    powc: 0.05,
    source: "STR China Midscale Hotel Benchmarks",
    regions: ["china", "guangzhou", "shenzhen"],
  },
  "resort-5-china": {
    cc: 0.62,
    ffe: 0.25,
    sc: 0.08,
    powc: 0.05,
    source: "HVS Resort Development Cost Survey — Greater China",
    regions: ["china", "sanya", "hangzhou", "hk"],
  },
  "resort-4-china": {
    cc: 0.64,
    ffe: 0.23,
    sc: 0.08,
    powc: 0.05,
    source: "JLL China Leisure Hospitality Report",
    regions: ["china", "sanya", "hangzhou", "hk"],
  },
  "boutique-4-china": {
    cc: 0.66,
    ffe: 0.21,
    sc: 0.08,
    powc: 0.05,
    source: "CBRE Boutique Hotel Trends — Greater China",
    regions: ["china", "shanghai", "beijing", "hk"],
  },
  "boutique-3-china": {
    cc: 0.7,
    ffe: 0.17,
    sc: 0.08,
    powc: 0.05,
    source: "STR Boutique Segment — China",
    regions: ["china", "shanghai", "beijing", "hk"],
  },
  "budget-1-china": {
    cc: 0.76,
    ffe: 0.1,
    sc: 0.09,
    powc: 0.05,
    source: "HVS Economy Hotel Cost Benchmarks — China",
    regions: ["china", "tier2", "tier3"],
  },

  default: {
    cc: 0.69,
    ffe: 0.18,
    sc: 0.08,
    powc: 0.05,
    source: "Industry baseline — please validate with local data",
    regions: ["global"],
  },
};

/** Map project location to profile region bucket (profile key suffix). */
export function inferHotelProfileRegion(
  country: string,
  city: string
): "dubai" | "malaysia" | "australia" | "china" {
  const t = `${country} ${city}`.toLowerCase();
  if (
    /malaysia|kuala|penang|johor|langkawi|kotakinabalu|jb\b/.test(t)
  ) {
    return "malaysia";
  }
  if (
    /australia|sydney|melbourne|brisbane|perth|gold|coast|cairns|adelaide/.test(
      t
    )
  ) {
    return "australia";
  }
  if (
    /china|hong kong|\bhk\b|shanghai|beijing|guangzhou|shenzhen|sanya|hangzhou|tier/.test(
      t
    )
  ) {
    return "china";
  }
  // GCC / Middle East / unmapped → Dubai-named benchmark set
  return "dubai";
}

export function resolveHotelProfile(
  hotelType: HotelOperatingType,
  starRating: number,
  country: string,
  city: string
): { key: string; profile: HotelProfile } {
  const region = inferHotelProfileRegion(country, city);
  const key = `${hotelType}-${starRating}-${region}`;
  const profile = HOTEL_COST_PROFILES[key];
  if (profile) return { key, profile };
  return { key: "default", profile: HOTEL_COST_PROFILES.default };
}

export function isValidHotelCombo(
  hotelType: string,
  starRating: number
): { valid: boolean; message?: string } {
  const rules: Record<string, number[]> = {
    budget: [1],
    boutique: [3, 4],
    business: [3, 4, 5],
    resort: [4, 5],
  };
  const validRatings = rules[hotelType] ?? [];
  if (!validRatings.includes(starRating)) {
    const label =
      hotelType.charAt(0).toUpperCase() + hotelType.slice(1).toLowerCase();
    return {
      valid: false,
      message: `${label} hotels in this model use ${validRatings.join("/")}-star selections only.`,
    };
  }
  return { valid: true };
}

/** Format profile for tooltips (percentages as % of DC). */
export function formatHotelProfileTooltip(
  profileKey: string,
  profile: HotelProfile
): string {
  const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
  return [
    `Profile: ${profileKey}`,
    `CC (incl. contingency) ${pct(profile.cc)} of DC`,
    `FFE ${pct(profile.ffe)} · SC ${pct(profile.sc)} · POWC ${pct(profile.powc)} of DC`,
    `Source: ${profile.source}`,
  ].join("\n");
}
