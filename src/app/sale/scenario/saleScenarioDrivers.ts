import type { ShockDriverConfig, ShockDriverType } from "@/types/scenario";

/** Sale Component 6 — eight default shock drivers (no escrow / hotel ops drivers). */
export const saleScenarioDrivers = [
  {
    id: "salesPrice",
    label: "Sales Price / GDV",
    unit: "%",
    range: { min: -20, max: 10, step: 1 },
    default: 0,
    description: "Impact on Average Selling Price",
  },
  {
    id: "salesVelocity",
    label: "Sales Velocity",
    unit: "%",
    range: { min: -50, max: 20, step: 5 },
    default: 0,
    description: "Impact on Absorption Rate (Speed of Sales)",
  },
  {
    id: "preSales",
    label: "Pre-Sales Achievement",
    unit: "%",
    range: { min: -50, max: 20, step: 5 },
    default: 0,
    description: "Impact on Pre-sales volume at Launch",
  },
  {
    id: "constructionCost",
    label: "Construction Cost",
    unit: "%",
    range: { min: -5, max: 25, step: 1 },
    default: 0,
    description: "Impact on Hard Construction Costs",
  },
  {
    id: "softCosts",
    label: "Soft Costs + POWC",
    unit: "%",
    range: { min: -5, max: 20, step: 1 },
    default: 0,
    description: "Impact on Soft Costs & Professional Fees",
  },
  {
    id: "constructionDuration",
    label: "Construction Duration",
    unit: "months",
    range: { min: -3, max: 12, step: 1 },
    default: 0,
    description: "Delay or acceleration of construction period",
  },
  {
    id: "ltcReduction",
    label: "LTC Reduction",
    unit: "%",
    range: { min: 0, max: 20, step: 1 },
    default: 0,
    description: "Reduction in Loan-to-Cost Ratio (Higher Equity Req)",
  },
  {
    id: "interestRate",
    label: "Interest Rate",
    unit: "bps",
    range: { min: 0, max: 300, step: 10 },
    default: 0,
    description: "Increase in Financing Interest Rate",
  },
] as const;

export type SaleShockKey = (typeof saleScenarioDrivers)[number]["id"];

const IMPACT_BY_ID: Record<SaleShockKey, ShockDriverConfig["impactType"]> = {
  salesPrice: "revenue",
  salesVelocity: "revenue",
  preSales: "revenue",
  constructionCost: "cost",
  softCosts: "cost",
  constructionDuration: "timeline",
  ltcReduction: "cost",
  interestRate: "cost",
};

export const SALE_DEFAULT_DRIVERS: ShockDriverConfig[] = saleScenarioDrivers.map(
  (d) => ({
    id: d.id as ShockDriverType,
    name: d.label,
    baseValue: d.default,
    shockValue: 0,
    minShock: d.range.min,
    maxShock: d.range.max,
    step: d.range.step,
    unit:
      d.unit === "months"
        ? "months"
        : d.unit === "bps"
          ? "bps"
          : "%",
    impactType: IMPACT_BY_ID[d.id],
  })
);

/** Slider row config for the Component 6 UI grid. */
export const SALE_SCENARIO_SLIDERS = saleScenarioDrivers.map((d) => ({
  key: d.id as SaleShockKey,
  label: d.label,
  description: d.description,
  min: d.range.min,
  max: d.range.max,
  step: d.range.step,
  unit:
    d.unit === "months"
      ? ("months" as const)
      : d.unit === "bps"
        ? ("bps" as const)
        : ("%" as const),
}));

/** Rough IRR sensitivity per 1 unit of shock (for slider preview). */
export function saleDriverIrrImpactFactor(id: SaleShockKey): number {
  switch (id) {
    case "interestRate":
      return -0.01;
    case "constructionDuration":
      return -0.12;
    case "salesPrice":
    case "salesVelocity":
    case "preSales":
      return 0.35;
    case "constructionCost":
    case "softCosts":
    case "ltcReduction":
      return -0.3;
    default:
      return 0.35;
  }
}

export const SALE_DRIVER_IRR_IMPACT: Record<SaleShockKey, number> = {
  salesPrice: 2.4,
  salesVelocity: 1.8,
  preSales: 1.2,
  constructionCost: -2.8,
  softCosts: -1.4,
  constructionDuration: -1.1,
  ltcReduction: -0.9,
  interestRate: -1.5,
};

/** True only when all eight sale drivers are present (not operational overlap). */
export function isSaleDriverSet(drivers: ShockDriverConfig[]): boolean {
  const ids = new Set(drivers.map((d) => d.id));
  return saleScenarioDrivers.every((s) => ids.has(s.id));
}

export function saleDriversWithShocks(
  shocks: Record<SaleShockKey, number>
): ShockDriverConfig[] {
  return SALE_DEFAULT_DRIVERS.map((d) => ({
    ...d,
    shockValue: shocks[d.id as SaleShockKey] ?? 0,
  }));
}

export function shocksFromDefaultDrivers(
  defaultDrivers: ShockDriverConfig[]
): Record<SaleShockKey, number> {
  const g = (id: SaleShockKey) =>
    defaultDrivers.find((d) => d.id === id)?.shockValue ?? 0;
  return {
    salesPrice: g("salesPrice"),
    salesVelocity: g("salesVelocity"),
    preSales: g("preSales"),
    constructionCost: g("constructionCost"),
    softCosts: g("softCosts"),
    constructionDuration: g("constructionDuration"),
    ltcReduction: g("ltcReduction"),
    interestRate: g("interestRate"),
  };
}
