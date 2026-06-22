import {
  getRetailBenchmark,
  normalizeRetailCountry,
  type RetailConstructionBenchmark,
} from "@/lib/benchmarks/retail-construction-costs";

export type { RetailConstructionBenchmark };

export { normalizeRetailCountry, getRetailBenchmark };

/** Land rate benchmark (local currency per sqft) for retail hold projects. */
export function getRetailLandRate(
  country: string,
  segment: string,
  positioning: string
): number | null {
  const benchmark = getRetailBenchmark(country, segment, positioning);
  return benchmark?.landRate ?? null;
}
