import type { ShockDriverType } from "@/types/scenario";

export interface ShockFactor {
  id: string;
  label: string;
  unit: "percentage" | "percentage_points" | "bps" | "months";
  minShock: number;
  maxShock: number;
  defaultValue: number;
  step: number;
  impactLogic: "revenue" | "cost" | "both";
  color: string;
}

export const COMMON_FACTORS: ShockFactor[] = [
  {
    id: "construction_cost",
    label: "Construction Cost",
    unit: "percentage",
    minShock: -20,
    maxShock: 30,
    defaultValue: 0,
    step: 1,
    impactLogic: "cost",
    color: "bg-rose-500",
  },
  {
    id: "operating_expenses",
    label: "Operating Expenses",
    unit: "percentage",
    minShock: -10,
    maxShock: 25,
    defaultValue: 0,
    step: 1,
    impactLogic: "cost",
    color: "bg-rose-500",
  },
  {
    id: "exit_cap_rate",
    label: "Exit Cap Rate",
    unit: "bps",
    minShock: -50,
    maxShock: 150,
    defaultValue: 0,
    step: 10,
    impactLogic: "cost",
    color: "bg-rose-500",
  },
  {
    id: "interest_rate",
    label: "Interest Rate",
    unit: "bps",
    minShock: -100,
    maxShock: 300,
    defaultValue: 0,
    step: 25,
    impactLogic: "cost",
    color: "bg-rose-500",
  },
];

export const ASSET_SPECIFIC_FACTORS: Record<string, ShockFactor[]> = {
  hotel: [
    {
      id: "adr",
      label: "ADR (Average Daily Rate)",
      unit: "percentage",
      minShock: -15,
      maxShock: 15,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "occupancy",
      label: "Occupancy Rate",
      unit: "percentage_points",
      minShock: -10,
      maxShock: 10,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "ffe_reserve",
      label: "FF&E Reserve %",
      unit: "percentage",
      minShock: -25,
      maxShock: 50,
      defaultValue: 0,
      step: 5,
      impactLogic: "cost",
      color: "bg-rose-500",
    },
    {
      id: "construction_duration",
      label: "Construction Duration",
      unit: "months",
      minShock: -12,
      maxShock: 12,
      defaultValue: 0,
      step: 1,
      impactLogic: "both",
      color: "bg-blue-500",
    },
  ],
  retail: [
    {
      id: "base_rent_psf",
      label: "Base Rent psf",
      unit: "percentage",
      minShock: -15,
      maxShock: 15,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "occupancy",
      label: "Occupancy Rate",
      unit: "percentage_points",
      minShock: -10,
      maxShock: 10,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "percentage_rent",
      label: "Percentage Rent (Overage)",
      unit: "percentage",
      minShock: -50,
      maxShock: 50,
      defaultValue: 0,
      step: 5,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "cam_recovery",
      label: "CAM Recovery Rate",
      unit: "percentage_points",
      minShock: -10,
      maxShock: 10,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
  ],
  office: [
    {
      id: "base_rent_psf",
      label: "Base Rent psf",
      unit: "percentage",
      minShock: -20,
      maxShock: 20,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "occupancy",
      label: "Occupancy Rate",
      unit: "percentage_points",
      minShock: -15,
      maxShock: 15,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "ti_allowance",
      label: "TI Allowance psf",
      unit: "percentage",
      minShock: -30,
      maxShock: 50,
      defaultValue: 0,
      step: 5,
      impactLogic: "cost",
      color: "bg-rose-500",
    },
    {
      id: "leasing_commissions",
      label: "Leasing Commissions",
      unit: "percentage",
      minShock: -50,
      maxShock: 100,
      defaultValue: 0,
      step: 10,
      impactLogic: "cost",
      color: "bg-rose-500",
    },
  ],
  residential: [
    {
      id: "monthly_rent_psf",
      label: "Monthly Rent psf",
      unit: "percentage",
      minShock: -15,
      maxShock: 15,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "occupancy",
      label: "Occupancy Rate",
      unit: "percentage_points",
      minShock: -10,
      maxShock: 10,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "rent_escalation",
      label: "Rent Escalation Rate",
      unit: "percentage",
      minShock: -50,
      maxShock: 100,
      defaultValue: 0,
      step: 5,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "absorption_speed",
      label: "Lease-up / Absorption Speed",
      unit: "percentage",
      minShock: -50,
      maxShock: 50,
      defaultValue: 0,
      step: 10,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
  ],
  warehouse: [
    {
      id: "base_rent_psf",
      label: "Base Rent psf",
      unit: "percentage",
      minShock: -15,
      maxShock: 15,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "occupancy",
      label: "Occupancy Rate",
      unit: "percentage_points",
      minShock: -10,
      maxShock: 10,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "rent_escalation",
      label: "Rent Escalation",
      unit: "percentage",
      minShock: -50,
      maxShock: 50,
      defaultValue: 0,
      step: 5,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "lease_up_period",
      label: "Lease-up Period",
      unit: "months",
      minShock: -6,
      maxShock: 6,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
  ],
  data_centre: [
    {
      id: "power_lease_rate",
      label: "Power Lease Rate per kW / month",
      unit: "percentage",
      minShock: -15,
      maxShock: 15,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "white_space_rent",
      label: "White Space Rent psf / month",
      unit: "percentage",
      minShock: -15,
      maxShock: 15,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "utilization",
      label: "Utilization / Occupancy",
      unit: "percentage_points",
      minShock: -10,
      maxShock: 10,
      defaultValue: 0,
      step: 1,
      impactLogic: "revenue",
      color: "bg-emerald-500",
    },
    {
      id: "pue",
      label: "PUE",
      unit: "percentage",
      minShock: -10,
      maxShock: 10,
      defaultValue: 0,
      step: 1,
      impactLogic: "cost",
      color: "bg-rose-500",
    },
  ],
};

/** Display labels for C6 copy (subtitle / presets). Unmapped types are not listed. */
export const ASSET_DISPLAY_LABELS: Record<string, string> = {
  hotel: "Hotel",
  retail: "Retail",
  office: "Office",
  residential: "Residential",
  warehouse: "Warehouse / Industrial",
  data_centre: "Data Centre",
};

/** Section header stem; CSS uppercase yields e.g. WAREHOUSE-SPECIFIC FACTORS. */
export const ASSET_SECTION_LABELS: Record<string, string> = {
  hotel: "Hotel",
  retail: "Retail",
  office: "Office",
  residential: "Residential",
  warehouse: "Warehouse",
  data_centre: "Data Centre",
};

const ASSET_TYPE_ALIASES: Record<string, string> = {
  datacentre: "data_centre",
  "data-centre": "data_centre",
  data_center: "data_centre",
  industrial: "warehouse",
  btr: "residential",
  build_to_rent: "residential",
};

function humanizeAssetType(assetType: string): string {
  return assetType
    .split(/[_-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const COMMON_FACTOR_IDS = new Set(COMMON_FACTORS.map((f) => f.id));

/** Maps config factor ids to persisted scenario store driver ids (hotel / shared / warehouse / DC). */
export const FACTOR_ID_TO_STORE_KEY: Partial<Record<string, ShockDriverType>> = {
  construction_cost: "constructionCost",
  operating_expenses: "operatingExpenses",
  exit_cap_rate: "exitCapRate",
  interest_rate: "interestRate",
  adr: "adr",
  occupancy: "occupancy",
  ffe_reserve: "ffeReserve",
  construction_duration: "constructionDuration",
  lease_up_period: "leaseUpPeriod",
  power_lease_rate: "powerLeaseRate",
  white_space_rent: "whiteSpaceRent",
  utilization: "utilization",
  pue: "pue",
};

/**
 * Canonical buildingType key. Explicit map only — never silently defaults to hotel.
 * Unknown / empty types stay as-is so callers can show Common Factors only.
 */
export function normalizeAssetType(buildingType?: string): string {
  const t = (buildingType || "").toLowerCase().trim();
  if (!t) return "";
  return ASSET_TYPE_ALIASES[t] ?? t;
}

export function getAssetSpecificFactors(assetType: string): ShockFactor[] {
  const key = normalizeAssetType(assetType);
  return ASSET_SPECIFIC_FACTORS[key] ?? [];
}

export function getAllFactorsForAsset(assetType: string): ShockFactor[] {
  return [...COMMON_FACTORS, ...getAssetSpecificFactors(assetType)];
}

export function getAssetDisplayLabel(assetType: string): string {
  const key = normalizeAssetType(assetType);
  if (ASSET_DISPLAY_LABELS[key]) return ASSET_DISPLAY_LABELS[key];
  return key ? humanizeAssetType(key) : "this asset";
}

export function getAssetSectionLabel(assetType: string): string {
  const key = normalizeAssetType(assetType);
  if (ASSET_SECTION_LABELS[key]) return ASSET_SECTION_LABELS[key];
  return key ? humanizeAssetType(key) : "";
}

export function shockFactorSliderUnit(
  factor: ShockFactor
): "%" | "months" | "bps" | "pp" {
  if (factor.unit === "bps") return "bps";
  if (factor.unit === "months") return "months";
  if (factor.unit === "percentage_points") return "pp";
  return "%";
}

export function formatShockValue(factor: ShockFactor, val: number): string {
  if (factor.unit === "bps") return `${val} bps`;
  if (factor.unit === "percentage_points") return `${val}pp`;
  if (factor.unit === "months") return `${val} months`;
  return `${val}%`;
}

const ALL_FACTORS_LIST: ShockFactor[] = [
  ...COMMON_FACTORS,
  ...Object.values(ASSET_SPECIFIC_FACTORS).flat(),
];

const FACTOR_BY_ID = new Map(ALL_FACTORS_LIST.map((f) => [f.id, f]));

export function getFactorById(factorId: string): ShockFactor | undefined {
  return FACTOR_BY_ID.get(factorId);
}

export function getFactorLabel(factorId: string): string {
  return getFactorById(factorId)?.label ?? factorId.replace(/_/g, " ");
}

export function formatShockDisplay(factorId: string, value: number): string {
  const factor = getFactorById(factorId);
  if (!factor) {
    return `${value > 0 ? "+" : ""}${value}`;
  }
  const formatted = formatShockValue(factor, value);
  return value > 0 && !formatted.startsWith("+") ? `+${formatted}` : formatted;
}

export function initialShocksForAsset(assetType: string): Record<string, number> {
  const initial: Record<string, number> = {};
  getAllFactorsForAsset(assetType).forEach((f) => {
    initial[f.id] = f.defaultValue;
  });
  return initial;
}

/** Bridge config-id shocks to legacy `applyShocks` input (hotel-centric engine). */
export function shocksToOperationalInput(
  shocks: Record<string, number>,
  assetType: string
): {
  adr?: number;
  occupancy?: number;
  constructionCost?: number;
  constructionDuration?: number;
  interestRate?: number;
  operatingExpenses?: number;
  exitCapRate?: number;
  ffeReserve?: number;
} {
  const t = normalizeAssetType(assetType);
  const s = (id: string) => shocks[id] ?? 0;

  let adr = 0;
  let occupancy = s("occupancy");
  if (t === "hotel") {
    adr = s("adr");
  } else if (t === "retail") {
    adr =
      s("base_rent_psf") * 0.6 +
      s("percentage_rent") * 0.25 +
      s("cam_recovery") * 0.15;
  } else if (t === "office") {
    adr = s("base_rent_psf") * 0.85 + s("occupancy") * 0.15;
  } else if (t === "residential") {
    adr =
      s("monthly_rent_psf") * 0.5 +
      s("rent_escalation") * 0.25 +
      s("absorption_speed") * 0.25;
  } else if (t === "warehouse") {
    adr = s("base_rent_psf") * 0.7 + s("rent_escalation") * 0.3;
  } else if (t === "data_centre") {
    adr = s("power_lease_rate") * 0.55 + s("white_space_rent") * 0.45;
    occupancy = s("utilization");
  }

  let operatingExpenses = s("operating_expenses");
  if (t === "office") {
    operatingExpenses += s("ti_allowance") * 0.5 + s("leasing_commissions") * 0.3;
  } else if (t === "data_centre") {
    operatingExpenses += s("pue");
  }

  return {
    adr,
    occupancy,
    constructionCost: s("construction_cost"),
    constructionDuration: s("construction_duration"),
    interestRate: s("interest_rate"),
    operatingExpenses,
    exitCapRate: s("exit_cap_rate"),
    ffeReserve: s("ffe_reserve"),
  };
}

export const PRESET_SHOCKS: Record<
  string,
  Record<"base" | "downside" | "upside", Record<string, number>>
> = {
  hotel: {
    base: {},
    downside: {
      adr: -12,
      occupancy: -8,
      construction_cost: 15,
      construction_duration: 6,
      interest_rate: 200,
      operating_expenses: 15,
      exit_cap_rate: 100,
      ffe_reserve: 2,
    },
    upside: {
      adr: 10,
      occupancy: 8,
      construction_cost: -10,
      construction_duration: -6,
      interest_rate: -100,
      operating_expenses: -5,
      exit_cap_rate: -50,
      ffe_reserve: 0,
    },
  },
  retail: {
    base: {},
    downside: {
      base_rent_psf: -10,
      occupancy: -8,
      percentage_rent: -20,
      cam_recovery: -5,
      construction_cost: 12,
      operating_expenses: 12,
      exit_cap_rate: 75,
      interest_rate: 150,
    },
    upside: {
      base_rent_psf: 8,
      occupancy: 6,
      percentage_rent: 15,
      cam_recovery: 4,
      construction_cost: -8,
      operating_expenses: -5,
      exit_cap_rate: -40,
      interest_rate: -75,
    },
  },
  office: {
    base: {},
    downside: {
      base_rent_psf: -12,
      occupancy: -10,
      ti_allowance: 20,
      leasing_commissions: 25,
      construction_cost: 15,
      operating_expenses: 10,
      exit_cap_rate: 100,
      interest_rate: 200,
    },
    upside: {
      base_rent_psf: 10,
      occupancy: 8,
      ti_allowance: -15,
      leasing_commissions: -20,
      construction_cost: -8,
      operating_expenses: -5,
      exit_cap_rate: -50,
      interest_rate: -100,
    },
  },
  residential: {
    base: {},
    downside: {
      monthly_rent_psf: -10,
      occupancy: -8,
      rent_escalation: -25,
      absorption_speed: -20,
      construction_cost: 12,
      operating_expenses: 10,
      exit_cap_rate: 75,
      interest_rate: 150,
    },
    upside: {
      monthly_rent_psf: 8,
      occupancy: 6,
      rent_escalation: 15,
      absorption_speed: 15,
      construction_cost: -8,
      operating_expenses: -5,
      exit_cap_rate: -40,
      interest_rate: -75,
    },
  },
  warehouse: {
    base: {},
    downside: {
      base_rent_psf: -10,
      occupancy: -8,
      rent_escalation: -25,
      lease_up_period: 3,
      construction_cost: 12,
      operating_expenses: 10,
      exit_cap_rate: 75,
      interest_rate: 150,
    },
    upside: {
      base_rent_psf: 8,
      occupancy: 6,
      rent_escalation: 15,
      lease_up_period: -3,
      construction_cost: -8,
      operating_expenses: -5,
      exit_cap_rate: -40,
      interest_rate: -75,
    },
  },
  data_centre: {
    base: {},
    downside: {
      power_lease_rate: -10,
      white_space_rent: -10,
      utilization: -8,
      pue: 8,
      construction_cost: 12,
      operating_expenses: 10,
      exit_cap_rate: 75,
      interest_rate: 150,
    },
    upside: {
      power_lease_rate: 8,
      white_space_rent: 8,
      utilization: 6,
      pue: -5,
      construction_cost: -8,
      operating_expenses: -5,
      exit_cap_rate: -40,
      interest_rate: -75,
    },
  },
};

export function presetShocksForAsset(
  assetType: string,
  preset: "base" | "downside" | "upside"
): Record<string, number> {
  const key = normalizeAssetType(assetType);
  const factors = getAllFactorsForAsset(key);
  const presetMap = PRESET_SHOCKS[key]?.[preset] ?? {};
  const out: Record<string, number> = {};
  factors.forEach((f) => {
    out[f.id] = presetMap[f.id] ?? f.defaultValue;
  });
  return out;
}
