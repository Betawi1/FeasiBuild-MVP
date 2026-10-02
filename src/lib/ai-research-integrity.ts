/**
 * Sale/ops research integrity.
 * Parsed AI numbers are stored verbatim. The old USD sanity floors are
 * warning thresholds only — they must never replace a payload value.
 */

export const BELOW_BENCHMARK_FRACTION = 0.35;

/**
 * Former silent floors, in USD per sqft (percent fields are already local).
 * `sanitizeAiData` used to do displayed = clamp(ai, floor × FX, ceiling).
 * Kept here so a value more than 35% under that floor can be flagged.
 */
export const USD_SANITY_FLOORS = {
  building_rate_psf: 50,
  parking_rate_psf: 20,
  basement_rate_psf: 20,
  infrastructure_rate_psf: 0,
  land_rate_psf: 1,
  avg_sales_price_psf: 50,
  sc_percentage: 1,
  powc_percentage: 1,
} as const;

const FX_RATE_KEYS = [
  "building_rate_psf",
  "parking_rate_psf",
  "basement_rate_psf",
  "infrastructure_rate_psf",
  "land_rate_psf",
  "avg_sales_price_psf",
] as const;

/** C1 rows a non-warehouse sale project can show. */
export const SALE_STANDARD_RATE_KEYS = [
  "building_rate_psf",
  "parking_rate_psf",
  "basement_rate_psf",
  "infrastructure_rate_psf",
] as const;

/** C1 rows a sale warehouse project can show. */
export const SALE_WAREHOUSE_RATE_KEYS = [
  "building_rate_psf",
  "parking_rate_psf",
  "basement_rate_psf",
  "site_yard_rate_psf",
  "dock_door_cost_per_unit",
  "dock_door_cost",
  "drive_in_door_cost_per_unit",
  "drive_in_door_cost",
  "car_parking_cost_per_space",
  "car_parking_rate_per_stall",
  "trailer_parking_cost_per_space",
  "trailer_parking_rate_per_stall",
  "infrastructure_rate_psf",
  "common_infrastructure_rate_psf",
  "racking_shelving_cost_per_unit",
  "refrigeration_cost_per_unit",
  "automation_conveyors_cost_per_unit",
  "professional_fees_percent",
] as const;

type ResearchShape = {
  fx_rate_to_usd?: number;
  c1_development?: {
    construction_rates?: Record<string, unknown>;
    land_rate_psf?: number;
    soft_costs?: {
      sc_percentage?: number;
      powc_percentage?: number;
    };
  };
  c2_sales?: {
    avg_sales_price_psf?: number;
  };
};

/** Parse a JSON string once or twice. Objects pass through. Not the S5 salvage. */
export function coerceAiResearchPayload(raw: unknown): unknown {
  let current = raw;
  for (let i = 0; i < 2; i++) {
    if (typeof current !== "string") return current;
    const trimmed = current.trim();
    if (!trimmed) return current;
    try {
      current = JSON.parse(trimmed) as unknown;
    } catch {
      return current;
    }
  }
  return current;
}

/**
 * Warning copy only. `benchmark` is the old floor, not a value to write.
 * Zero is reported on its own so a present 0 is not described as a percentage.
 */
export function guardrailMessage(
  value: number,
  benchmark: number
): string | undefined {
  if (!Number.isFinite(value) || !Number.isFinite(benchmark) || benchmark <= 0) {
    return undefined;
  }
  if (value === 0) return "zero rate - review";
  if (value >= benchmark * (1 - BELOW_BENCHMARK_FRACTION)) return undefined;
  const pct = Math.round((1 - value / benchmark) * 100);
  return `${pct}% below benchmark - review`;
}

function localPerUsd(fx: number | undefined, currency: string): number | undefined {
  if ((currency || "USD").toUpperCase() === "USD") return 1;
  if (typeof fx === "number" && Number.isFinite(fx) && fx > 0) return fx;
  return undefined;
}

function flagIfBelow(
  flags: Record<string, string>,
  field: string,
  value: unknown,
  benchmark: number
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  const message = guardrailMessage(value, benchmark);
  if (message) flags[field] = message;
}

/** Non-mutating. Does not read or write form state. */
export function collectGuardrailFlags(
  data: ResearchShape,
  currency: string
): Record<string, string> {
  const flags: Record<string, string> = {};
  const fx = localPerUsd(data.fx_rate_to_usd, currency);
  const rates = data.c1_development?.construction_rates;
  if (fx != null) {
    for (const key of FX_RATE_KEYS) {
      const benchmark = USD_SANITY_FLOORS[key] * fx;
      const value =
        key === "land_rate_psf"
          ? data.c1_development?.land_rate_psf
          : key === "avg_sales_price_psf"
            ? data.c2_sales?.avg_sales_price_psf
            : rates?.[key];
      flagIfBelow(flags, key, value, benchmark);
    }
  }
  flagIfBelow(
    flags,
    "sc_percentage",
    data.c1_development?.soft_costs?.sc_percentage,
    USD_SANITY_FLOORS.sc_percentage
  );
  flagIfBelow(
    flags,
    "powc_percentage",
    data.c1_development?.soft_costs?.powc_percentage,
    USD_SANITY_FLOORS.powc_percentage
  );
  return flags;
}

export function annotateResearchGuardrails<T extends object>(
  data: T,
  currency: string
): T & { guardrailFlags?: Record<string, string> } {
  const flags = collectGuardrailFlags(data as ResearchShape, currency);
  if (Object.keys(flags).length === 0) return data;
  return { ...data, guardrailFlags: flags };
}

/** Rate keys present on the payload that no C1 row accepts. */
export function unmatchedConstructionRateKeys(
  rates: Record<string, unknown> | undefined,
  mappedKeys: readonly string[]
): string[] {
  if (!rates) return [];
  const known = new Set<string>(mappedKeys);
  return Object.entries(rates)
    .filter(([key, value]) => {
      if (known.has(key)) return false;
      return typeof value === "number" && Number.isFinite(value);
    })
    .map(([key]) => key);
}
