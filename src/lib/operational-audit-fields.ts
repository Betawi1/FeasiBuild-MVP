import { logAuditChange } from "@/lib/audit-utils";
import type { AuditEntry } from "@/store/useAuditStore";

export const CASH_OUTFLOWS_COMPONENT = "Component 1: Cash Outflows";
export const CASH_INFLOWS_COMPONENT = "Component 2";
export const FINANCING_COMPONENT = "Component 4: Financing";

export function cashInflowAuditRoute(uiStep: number): string {
  return `/operational/cash-inflows?step=${uiStep}`;
}

export type AuditFieldMeta = {
  label: string;
  /** 1-based wizard step for deep link */
  uiStep: number;
  type: AuditEntry["type"];
};

export function cashOutflowAuditRoute(uiStep: number): string {
  return `/operational/cash-outflows?step=${uiStep}`;
}

/** 1-based wizard step titles for Component 1 audit entries */
export const CASH_OUTFLOW_STEP_NAMES: Record<number, string> = {
  3: "Asset Type",
  4: "Structure",
  5: "Segmentation",
  6: "Construction Costs",
  7: "Contingency",
  8: "SC & POWC",
  9: "Land Costs",
  11: "Schedule",
};

export function financingAuditRoute(uiStep: number): string {
  return `/operational/financing?step=${uiStep}`;
}

/** 1-based wizard step titles for Component 4 audit entries */
export const FINANCING_STEP_NAMES: Record<number, string> = {
  2: "Debt Sizing",
  3: "Land as Equity",
  4: "Preference Shares",
  5: "Drawdown Structure",
  6: "Interest Rate & IDC",
  7: "Loan Repayment Terms",
  8: "Covenants & Exit Strategy",
};

/** Steps 1–4 (UI) field metadata for Component 1 cash outflows */
export const CASH_OUTFLOW_AUDIT_FIELDS: Record<string, AuditFieldMeta> = {
  country: { label: "Country", uiStep: 1, type: "select" },
  city: { label: "City", uiStep: 1, type: "select" },
  currency: { label: "Project Currency", uiStep: 2, type: "select" },
  buildingType: { label: "Operational Asset Type", uiStep: 3, type: "select" },
  hotelOperatingType: { label: "Operating Segment", uiStep: 5, type: "select" },
  hotelStarRating: { label: "Market Positioning", uiStep: 5, type: "select" },
  retailSegment: { label: "Operating Segment", uiStep: 5, type: "select" },
  retailPositioning: { label: "Market Positioning", uiStep: 5, type: "select" },
  officeSegment: { label: "Operating Segment", uiStep: 5, type: "select" },
  officePositioning: { label: "Market Positioning", uiStep: 5, type: "select" },
  residentialSegment: { label: "Operating Segment", uiStep: 5, type: "select" },
  residentialPositioning: { label: "Market Positioning", uiStep: 5, type: "select" },
  buildingBUA: { label: "Building BUA (sqft)", uiStep: 6, type: "input" },
  buildingRate: { label: "Building Rate", uiStep: 6, type: "input" },
  parkingBUA: { label: "Parking BUA (sqft)", uiStep: 6, type: "input" },
  parkingRate: { label: "Parking Rate", uiStep: 6, type: "input" },
  basementBUA: { label: "Basement BUA (sqft)", uiStep: 6, type: "input" },
  basementRate: { label: "Basement Rate", uiStep: 6, type: "input" },
  contingencyPercent: { label: "Contingency (% of CC)", uiStep: 7, type: "input" },
  softCostPercent: { label: "Soft Costs % (SC)", uiStep: 8, type: "input" },
  powcPercent: { label: "POWC %", uiStep: 8, type: "input" },
  ffePercent: { label: "FFE % of CC", uiStep: 8, type: "input" },
  basements: { label: "Basements", uiStep: 4, type: "input" },
  podiumFloors: { label: "Podium / Parking Floors", uiStep: 4, type: "input" },
  towerFloors: { label: "Building Floors", uiStep: 4, type: "input" },
  hasRetailComponent: { label: "Retail Component", uiStep: 4, type: "toggle" },
  retailPercentage: { label: "Retail Percentage", uiStep: 4, type: "input" },
  landArea: { label: "Land Area (sqft)", uiStep: 9, type: "input" },
  landRate: { label: "Land Rate (per sqft)", uiStep: 9, type: "input" },
  constructionPeriod: {
    label: "Construction Period (Months)",
    uiStep: 11,
    type: "input",
  },
};

/** Step 12 construction stage labels/percentages — intentionally excluded from audit */
export const CASH_OUTFLOW_STAGE_ALLOCATION_FIELDS = new Set([
  "stage1Label",
  "stage1Percent",
  "stage2Label",
  "stage2Percent",
  "stage3Label",
  "stage3Percent",
  "stage4Label",
  "stage4Percent",
]);

/** Steps 1–4 (UI) field metadata for Component 4 financing */
export const FINANCING_AUDIT_FIELDS: Record<string, AuditFieldMeta> = {
  debtType: { label: "Debt Type", uiStep: 2, type: "select" },
  loanToCostPercent: { label: "Loan-to-Cost (LTC) %", uiStep: 2, type: "input" },
  maxLtvPercent: { label: "Loan-to-Value (LTV) %", uiStep: 2, type: "input" },
  approvedDebtAmount: {
    label: "Approved Debt Amount",
    uiStep: 2,
    type: "calculated",
  },
  landAsEquity: { label: "Treat land as 100% equity", uiStep: 3, type: "toggle" },
  landEquityPercent: { label: "Land Equity Percent", uiStep: 3, type: "input" },
  landEquityCoverage: {
    label: "Land Equity Coverage",
    uiStep: 3,
    type: "calculated",
  },
  prefSharesEnabled: {
    label: "Enable preference shares",
    uiStep: 4,
    type: "toggle",
  },
  prefSharesAllocationPercent: {
    label: "Allocation %",
    uiStep: 4,
    type: "input",
  },
  prefSharesAmount: {
    label: "Preference Amount",
    uiStep: 4,
    type: "calculated",
  },
  prefSharesReturnPct: { label: "Target Return %", uiStep: 4, type: "input" },
  prefSharesReturnType: { label: "Preference Return Type", uiStep: 4, type: "select" },
  drawdownMethod: { label: "Loan Drawdown Method", uiStep: 5, type: "select" },
  rateType: { label: "Interest Rate Type", uiStep: 6, type: "select" },
  interestRate: { label: "Interest Rate (%)", uiStep: 6, type: "input" },
  idcTreatment: { label: "IDC Treatment", uiStep: 6, type: "select" },
  loanAtCompletion: { label: "Loan at Completion", uiStep: 6, type: "calculated" },
  loanType: { label: "Loan Type", uiStep: 7, type: "select" },
  gracePeriodYears: {
    label: "Interest-Only Grace Period (Years)",
    uiStep: 7,
    type: "input",
  },
  dscrTarget: { label: "Minimum DSCR", uiStep: 8, type: "input" },
  maxLtvRatio: { label: "Max LTV Covenant", uiStep: 8, type: "input" },
  dscrFrequency: { label: "DSCR Test Frequency", uiStep: 8, type: "select" },
  minDebtYield: { label: "Minimum Debt Yield", uiStep: 8, type: "input" },
  exitStrategy: { label: "Exit Strategy", uiStep: 8, type: "select" },
  refinanceLtc: { label: "Refinance LTC %", uiStep: 8, type: "input" },
  refinanceRate: { label: "Refinance Rate %", uiStep: 8, type: "input" },
  exitYear: { label: "Exit Timing", uiStep: 8, type: "input" },
  saleCapRate: { label: "Exit Cap Rate (%)", uiStep: 8, type: "input" },
};

export function humanizeFieldId(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

const BUILDING_TYPE_LABELS: Record<string, string> = {
  hotel: "Hotel",
  retail: "Retail",
  office: "Office",
  residential: "Residential",
};

const HOTEL_OPERATING_TYPE_LABELS: Record<string, string> = {
  business: "Business Hotel",
  resort: "Luxury Resort",
  boutique: "Boutique Hotel",
  budget: "Budget / Economy",
};

const RETAIL_SEGMENT_LABELS: Record<string, string> = {
  regional_mall: "Regional Mall",
  lifestyle_center: "Lifestyle Center",
  community_center: "Neighborhood Center",
  outlet_center: "Outlet Center",
};

const RETAIL_POSITIONING_LABELS: Record<string, string> = {
  luxury: "Luxury",
  upscale: "Upscale",
  mid_market: "Mid Market",
  value: "Economy",
};

const OFFICE_SEGMENT_LABELS: Record<string, string> = {
  prime_tower: "Prime / Grade A Tower",
  business_park: "Business Park / Campus",
  secondary: "Secondary / Grade B",
  co_working: "Co-Working / Flexible",
};

const OFFICE_POSITIONING_LABELS: Record<string, string> = {
  premium: "Premium / Trophy",
  grade_a: "Grade A / Institutional",
  grade_b: "Grade B / Core",
  grade_c: "Grade C / Value",
};

const RESIDENTIAL_SEGMENT_LABELS: Record<string, string> = {
  high_rise: "High-Rise Tower",
  mid_rise: "Mid-Rise / Garden Style",
  townhome: "Townhome / Low-Rise",
  compact: "Compact Units",
};

const RESIDENTIAL_POSITIONING_LABELS: Record<string, string> = {
  luxury: "Luxury",
  grade_a: "Grade A",
  grade_b: "Grade B",
  grade_c: "Grade C",
};

/** Human-readable audit display for Component 1 select values */
export function formatCashOutflowAuditDisplay(
  field: string,
  value: string | number | boolean
): string | number | boolean {
  if (typeof value === "boolean" || typeof value === "number") return value;
  const raw = String(value);
  switch (field) {
    case "buildingType":
      return BUILDING_TYPE_LABELS[raw] ?? humanizeFieldId(raw);
    case "hotelOperatingType":
      return HOTEL_OPERATING_TYPE_LABELS[raw] ?? humanizeFieldId(raw);
    case "hotelStarRating": {
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? `${n} Star` : raw;
    }
    case "retailSegment":
      return RETAIL_SEGMENT_LABELS[raw] ?? humanizeFieldId(raw);
    case "retailPositioning":
      return RETAIL_POSITIONING_LABELS[raw] ?? humanizeFieldId(raw);
    case "officeSegment":
      return OFFICE_SEGMENT_LABELS[raw] ?? humanizeFieldId(raw);
    case "officePositioning":
      return OFFICE_POSITIONING_LABELS[raw] ?? humanizeFieldId(raw);
    case "residentialSegment":
      return RESIDENTIAL_SEGMENT_LABELS[raw] ?? humanizeFieldId(raw);
    case "residentialPositioning":
      return RESIDENTIAL_POSITIONING_LABELS[raw] ?? humanizeFieldId(raw);
    default:
      return raw;
  }
}

/** Imperative audit log for Component 1 cash outflows (steps & child components). */
export function logOperationalCashOutflow(
  field: string,
  value: string | number | boolean,
  uiStepOverride?: number
): void {
  const meta = CASH_OUTFLOW_AUDIT_FIELDS[field];
  const uiStep = uiStepOverride ?? meta?.uiStep ?? 1;
  const stepTitle =
    CASH_OUTFLOW_STEP_NAMES[uiStep] ?? meta?.label ?? `Step ${uiStep}`;
  const displayValue = formatCashOutflowAuditDisplay(field, value);
  logAuditChange({
    id: `operational.cashOutflows.${field}`,
    label: meta?.label ?? humanizeFieldId(field),
    value: displayValue,
    component: CASH_OUTFLOWS_COMPONENT,
    step: `Step ${uiStep}: ${stepTitle}`,
    route: cashOutflowAuditRoute(uiStep),
    type:
      meta?.type ??
      (typeof value === "boolean"
        ? "toggle"
        : typeof value === "string"
          ? "select"
          : "input"),
  });
}
