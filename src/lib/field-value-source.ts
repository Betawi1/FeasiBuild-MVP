/** How a wizard input got its current number. */
export type FieldValueSource = "ai" | "override" | "default";

const NESTED_ALLOCATION_SOURCE_KEYS: Record<string, string[]> = {
  stageAllocation: [
    "stage1Percent",
    "stage2Percent",
    "stage3Percent",
    "stage4Percent",
  ],
  powcAllocation: [
    "powcSiteEstablishment",
    "powcOverhead",
    "powcAuthorityFees",
  ],
  softCostAllocation: [
    "scArchitect",
    "scPM",
    "scEngineering",
    "scGeotech",
    "scOther",
  ],
};

export function overriddenSourceKeys(
  sources?: Record<string, FieldValueSource>
): string[] {
  return Object.entries(sources ?? {})
    .filter(([, s]) => s === "override")
    .map(([k]) => k);
}

export function tagFieldSources(
  current: Record<string, FieldValueSource> | undefined,
  keys: string[],
  source: FieldValueSource,
  overriddenKeys?: Iterable<string>
): Record<string, FieldValueSource> {
  const blocked = new Set(overriddenKeys ?? []);
  const next: Record<string, FieldValueSource> = { ...(current ?? {}) };
  for (const key of keys) {
    if (blocked.has(key) || next[key] === "override") continue;
    next[key] = source;
  }
  return next;
}

/**
 * Apply parsed puter.ai.chat research onto model state.
 * Never goes through a user onChange handler: skipped keys stay as override.
 */
export function applyAIValues<T extends Record<string, unknown>>(
  values: Partial<T>,
  options?: {
    currentSources?: Record<string, FieldValueSource>;
    overriddenKeys?: Iterable<string>;
  }
): { values: Partial<T>; fieldSources: Record<string, FieldValueSource> } {
  const overridden = new Set(options?.overriddenKeys ?? []);
  const fieldSources: Record<string, FieldValueSource> = {
    ...(options?.currentSources ?? {}),
  };
  const next: Partial<T> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    if (overridden.has(key) || fieldSources[key] === "override") continue;
    (next as Record<string, unknown>)[key] = value;
    fieldSources[key] = "ai";
    const nested = NESTED_ALLOCATION_SOURCE_KEYS[key];
    if (nested) {
      for (const nestedKey of nested) {
        if (overridden.has(nestedKey) || fieldSources[nestedKey] === "override") {
          continue;
        }
        fieldSources[nestedKey] = "ai";
      }
    }
  }

  return { values: next, fieldSources };
}

export function aiInputSourceProps(
  source: FieldValueSource | undefined,
  hasAiValue: boolean
): { isAiGenerated: boolean; isManualOverride: boolean } {
  if (source === "override") {
    return { isAiGenerated: false, isManualOverride: true };
  }
  if (source === "ai" || (source !== "default" && hasAiValue)) {
    return { isAiGenerated: true, isManualOverride: false };
  }
  return { isAiGenerated: false, isManualOverride: false };
}
