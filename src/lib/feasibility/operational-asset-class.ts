/**
 * Single source of truth for operational feasibility asset-class routing.
 * Stored `projectInfo.buildingType` always wins; display labels are hints only
 * when buildingType is empty/unknown. Never default to Data Centre.
 */

export type OperationalAssetType =
  | "hotel"
  | "mall"
  | "office"
  | "btr"
  | "warehouse"
  | "datacentre";

export type FeasibilityAssetClassLabel =
  | "Hotel"
  | "Data Centre"
  | "Residential"
  | "Office"
  | "Warehouse"
  | "Retail";

const EXACT_BUILDING_TYPE: Record<string, OperationalAssetType> = {
  hotel: "hotel",
  hospitality: "hotel",
  office: "office",
  retail: "mall",
  mall: "mall",
  residential: "btr",
  btr: "btr",
  warehouse: "warehouse",
  industrial: "warehouse",
  data_centre: "datacentre",
  datacentre: "datacentre",
  "data-centre": "datacentre",
  datacenter: "datacentre",
  "data centre": "datacentre",
  "data center": "datacentre",
};

const CLASS_LABEL: Record<OperationalAssetType, FeasibilityAssetClassLabel> = {
  hotel: "Hotel",
  datacentre: "Data Centre",
  btr: "Residential",
  office: "Office",
  warehouse: "Warehouse",
  mall: "Retail",
};

/** Parentheticals for the regenerate-confirm dialog — mapping is exhaustive. */
const CLASS_DESCRIPTORS: Record<OperationalAssetType, string> = {
  hotel: "(ADR, RevPAR, occupancy, seasonality)",
  datacentre: "(IT load, PUE, Tier, $/kW)",
  btr: "(unit mix, price/sqft, absorption)",
  office: "(rents, vacancy, absorption)",
  warehouse: "(rent/sqft, e-commerce absorption, clear height)",
  mall: "(footfall, rents, tenant mix)",
};

function normalize(value: string | undefined | null): string {
  return (value ?? "").toLowerCase().trim();
}

function matchExact(normalized: string): OperationalAssetType | null {
  if (!normalized) return null;
  return EXACT_BUILDING_TYPE[normalized] ?? null;
}

/** Substring match — only used when no exact stored buildingType is known. */
function matchIncludes(normalized: string): OperationalAssetType | null {
  if (!normalized) return null;
  if (
    normalized.includes("data_centre") ||
    normalized.includes("datacentre") ||
    normalized.includes("data centre") ||
    normalized.includes("data-centre") ||
    normalized.includes("datacenter") ||
    normalized.includes("data center")
  ) {
    return "datacentre";
  }
  if (normalized.includes("hotel") || normalized.includes("hospitality")) {
    return "hotel";
  }
  if (normalized.includes("office")) return "office";
  if (
    normalized.includes("retail") ||
    normalized.includes("mall") ||
    normalized.includes("shopping")
  ) {
    return "mall";
  }
  if (
    normalized.includes("warehouse") ||
    normalized.includes("industrial") ||
    normalized.includes("logistics")
  ) {
    return "warehouse";
  }
  if (normalized.includes("residential") || normalized.includes("btr")) {
    return "btr";
  }
  return null;
}

/**
 * Resolve class without applying the hotel default. Returns null when unknown
 * so UI copy can omit the class name and parenthetical.
 */
export function tryResolveOperationalAssetType(
  buildingType: string,
  assetTypeHint?: string
): OperationalAssetType | null {
  const bt = normalize(buildingType);
  const at = normalize(assetTypeHint);

  const fromBt = matchExact(bt) ?? matchIncludes(bt);
  if (fromBt) return fromBt;

  // Display labels / aggregate.assetType are hints only when buildingType is unset.
  return matchExact(at) ?? matchIncludes(at);
}

/**
 * Route Puter generators from stored buildingType. Unknown → hotel (not datacentre).
 * A leftover "Data Centre" assetType string must not override hotel/office/etc.
 */
export function resolveOperationalAssetType(
  buildingType: string,
  assetTypeHint?: string
): OperationalAssetType {
  const resolved = tryResolveOperationalAssetType(buildingType, assetTypeHint);
  if (resolved) {
    console.log("[Feasibility AssetType] resolved", {
      buildingType,
      assetType: assetTypeHint,
      route: resolved,
    });
    return resolved;
  }
  console.warn("[Feasibility AssetType] unresolved — defaulting to hotel", {
    buildingType,
    assetType: assetTypeHint,
  });
  return "hotel";
}

export function operationalAssetClassLabel(
  kind: OperationalAssetType
): FeasibilityAssetClassLabel {
  return CLASS_LABEL[kind];
}

export function buildRegenerateFeasibilityConfirmMessage(
  buildingType: string,
  assetTypeHint?: string
): string {
  const resolved = tryResolveOperationalAssetType(buildingType, assetTypeHint);
  if (!resolved) {
    return (
      "Regenerate feasibility from scratch?\n\n" +
      "This clears the AI cache and force-regenerates every slide with class-specific prompts.\n\n" +
      "This may take 30–60 seconds."
    );
  }
  const name = CLASS_LABEL[resolved];
  const descriptors = CLASS_DESCRIPTORS[resolved];
  return (
    `Regenerate ${name} feasibility from scratch?\n\n` +
    `This clears the AI cache and force-regenerates every slide with ${name}–specific prompts ${descriptors}.\n\n` +
    "This may take 30–60 seconds."
  );
}
