import { logAuditChange } from "@/lib/audit-utils";
import { humanizeFieldId } from "@/lib/operational-audit-fields";
import type { AuditEntry } from "@/store/useAuditStore";

export const SALE_CASH_OUTFLOWS_COMPONENT = "Sale Component 1";

export function saleCashOutflowAuditRoute(uiStep: number): string {
  return `/sale/cash-outflows?step=${uiStep}`;
}

export type SaleAuditFieldMeta = {
  label: string;
  uiStep: number;
  type: AuditEntry["type"];
};

/** 1-based wizard step titles for Sale Component 1 */
export const SALE_CASH_OUTFLOW_STEP_NAMES: Record<number, string> = {
  1: "Project Location",
  2: "Currency",
  3: "Building Type",
  4: "Market Segmentation",
  5: "Building Configuration",
  6: "Construction Costs",
  7: "Contingency",
  8: "SC & POWC",
  9: "Land Costs",
  11: "Schedule",
};

export const SALE_CASH_OUTFLOW_AUDIT_FIELDS: Record<string, SaleAuditFieldMeta> = {
  country: { label: "Country", uiStep: 1, type: "select" },
  city: { label: "City", uiStep: 1, type: "select" },
  currency: { label: "Project Currency", uiStep: 2, type: "select" },
  buildingSubType: { label: "Building Type", uiStep: 3, type: "select" },
  salesMarketPositioning: {
    label: "Market Positioning",
    uiStep: 4,
    type: "select",
  },
  salesFinishingStandard: {
    label: "Finishing Standard",
    uiStep: 4,
    type: "select",
  },
  basements: { label: "Basements (No. of levels)", uiStep: 5, type: "input" },
  podiumFloors: { label: "Podium / Parking Floors", uiStep: 5, type: "input" },
  towerFloors: { label: "Tower Floors", uiStep: 5, type: "input" },
  landedUnits: { label: "Number of Units", uiStep: 5, type: "input" },
  landedLandAreaPerUnit: {
    label: "Land Area per Unit (sqft)",
    uiStep: 5,
    type: "input",
  },
  landedBUAPerUnit: { label: "BUA per Unit (sqft)", uiStep: 5, type: "input" },
  hasRetailComponent: {
    label: "Retail / Mixed-use Component",
    uiStep: 5,
    type: "toggle",
  },
  retailPercentage: {
    label: "Retail BUA as % of Ground/Podium",
    uiStep: 5,
    type: "input",
  },
  buildingBUA: { label: "Building BUA (sqft)", uiStep: 6, type: "input" },
  buildingRate: { label: "Building Rate", uiStep: 6, type: "input" },
  parkingBUA: { label: "Parking BUA (sqft)", uiStep: 6, type: "input" },
  parkingRate: { label: "Parking Rate", uiStep: 6, type: "input" },
  basementBUA: { label: "Basement BUA (sqft)", uiStep: 6, type: "input" },
  basementRate: { label: "Basement Rate", uiStep: 6, type: "input" },
  infrastructureRate: {
    label: "Infrastructure Rate (per sqft)",
    uiStep: 6,
    type: "input",
  },
  contingencyPercent: { label: "Contingency (% of CC)", uiStep: 7, type: "input" },
  softCostPercent: { label: "Soft Costs % (SC)", uiStep: 8, type: "input" },
  powcPercent: { label: "POWC %", uiStep: 8, type: "input" },
  landArea: { label: "Land Area (sqft)", uiStep: 9, type: "input" },
  landRate: { label: "Land Rate (per sqft)", uiStep: 9, type: "input" },
  constructionPeriod: {
    label: "Construction Period (months)",
    uiStep: 11,
    type: "input",
  },
};

/** Step 12 construction stage labels/percentages — excluded from audit */
export const SALE_CASH_OUTFLOW_STAGE_ALLOCATION_FIELDS = new Set([
  "stage1Label",
  "stage1Percent",
  "stage2Label",
  "stage2Percent",
  "stage3Label",
  "stage3Percent",
  "stage4Label",
  "stage4Percent",
]);

const BUILDING_SUB_TYPE_LABELS: Record<string, string> = {
  residential_landed: "Residential - Landed",
  residential_high_rise: "Residential - High-Rise",
  commercial_landed: "Commercial - Landed",
  commercial_strata_office: "Commercial - Strata Office",
};

export function formatSaleCashOutflowAuditDisplay(
  field: string,
  value: string | number | boolean
): string | number | boolean {
  if (typeof value === "boolean" || typeof value === "number") return value;
  const raw = String(value);
  if (field === "buildingSubType") {
    return BUILDING_SUB_TYPE_LABELS[raw] ?? humanizeFieldId(raw);
  }
  return raw;
}

/** Imperative audit log for Sale Component 1 cash outflows. */
export function logSaleCashOutflow(
  field: string,
  value: string | number | boolean,
  uiStepOverride?: number
): void {
  const meta = SALE_CASH_OUTFLOW_AUDIT_FIELDS[field];
  const uiStep = uiStepOverride ?? meta?.uiStep ?? 1;
  const stepTitle =
    SALE_CASH_OUTFLOW_STEP_NAMES[uiStep] ?? meta?.label ?? `Step ${uiStep}`;
  const displayValue = formatSaleCashOutflowAuditDisplay(field, value);
  logAuditChange({
    id: `sale.cashOutflows.${field}`,
    label: meta?.label ?? humanizeFieldId(field),
    value: displayValue,
    component: SALE_CASH_OUTFLOWS_COMPONENT,
    step: `Step ${uiStep}: ${stepTitle}`,
    route: saleCashOutflowAuditRoute(uiStep),
    type:
      meta?.type ??
      (typeof value === "boolean"
        ? "toggle"
        : typeof value === "string"
          ? "select"
          : "input"),
    stream: "sale",
  });
}

// --- Sale Component 2: Cash Inflows ---

export const SALE_CASH_INFLOWS_COMPONENT = "Sale Component 2";

export function saleCashInflowAuditRoute(uiStep: number): string {
  return `/sale/cash-inflows?step=${uiStep}`;
}

/** 1-based wizard step titles for Sale Component 2 */
export const SALE_CASH_INFLOW_STEP_NAMES: Record<number, string> = {
  1: "Saleable BUA",
  2: "Average Sales Price",
  3: "Cash Buyers",
  4: "Mortgage Buyers",
  5: "Sales Uptake",
  6: "Buyer Mix & Deductions",
  7: "Defaults & Bulk Sales",
  8: "Launch Timing",
};

export const SALE_CASH_INFLOW_AUDIT_FIELDS: Record<string, SaleAuditFieldMeta> = {
  saleableBUARatio: {
    label: "Saleable BUA Ratio (%)",
    uiStep: 1,
    type: "input",
  },
  salesPrice: { label: "Average Sales Price (per sqft)", uiStep: 2, type: "input" },
  cashDownPaymentPercent: {
    label: "Cash Buyer Down Payment (%)",
    uiStep: 3,
    type: "input",
  },
  cashDuringConstructionPercent: {
    label: "Cash Buyer During Construction (%)",
    uiStep: 3,
    type: "input",
  },
  cashOnHandoverPercent: {
    label: "Cash Buyer On Handover (%)",
    uiStep: 3,
    type: "input",
  },
  buyerDownPayment: {
    label: "Mortgage Down Payment Amount",
    uiStep: 4,
    type: "input",
  },
  downPaymentMonths: {
    label: "Down Payment Received Over (Months)",
    uiStep: 4,
    type: "input",
  },
  mortgageDownPaymentPercent: {
    label: "Buyer Down Payment (%)",
    uiStep: 4,
    type: "input",
  },
  mortgageTenorYears: { label: "Mortgage Tenor (years)", uiStep: 4, type: "input" },
  mortgageLtvPercent: { label: "LTV (%)", uiStep: 4, type: "input" },
  mortgageRatePercent: { label: "Mortgage Rate (%)", uiStep: 4, type: "input" },
  salesUptakeMode: { label: "Sales Uptake Method", uiStep: 5, type: "select" },
  salesUptakePreset: { label: "Preset Sales Curve", uiStep: 5, type: "select" },
  cashBuyerPercent: { label: "Cash Buyers Mix (%)", uiStep: 6, type: "input" },
  mortgageBuyerPercent: { label: "Mortgage Buyers Mix (%)", uiStep: 6, type: "input" },
  brokerCommissionPercent: {
    label: "Agent Commission (%)",
    uiStep: 6,
    type: "input",
  },
  vatPercent: { label: "VAT on Sales (%)", uiStep: 6, type: "input" },
  escrowFeePercent: { label: "Escrow Fees (%)", uiStep: 6, type: "input" },
  salesDiscountPercent: {
    label: "Average Sales Discount (%)",
    uiStep: 6,
    type: "input",
  },
  defaultRate: { label: "Default Rate (%)", uiStep: 7, type: "input" },
  bulkSalesSharePercent: { label: "Bulk Sales Share (%)", uiStep: 7, type: "input" },
  bulkSalesDiscountPercent: {
    label: "Bulk Sales Discount (%)",
    uiStep: 7,
    type: "input",
  },
  launchMonthOffset: {
    label: "Sales Launch Offset (months)",
    uiStep: 8,
    type: "input",
  },
  preLaunchSalesPercent: { label: "Pre-launch Sales (%)", uiStep: 8, type: "input" },
};

const SALES_UPTAKE_MODE_LABELS: Record<string, string> = {
  preset: "Preset curve",
  manual: "Manual monthly profile",
};

const SALES_UPTAKE_PRESET_LABELS: Record<string, string> = {
  front_loaded: "Front-loaded (strong launch / early sales)",
  even: "Even over sales period",
  back_loaded: "Back-loaded (slower start, stronger finish)",
};

export function formatSaleCashInflowAuditDisplay(
  field: string,
  value: string | number | boolean
): string | number | boolean {
  if (typeof value === "boolean" || typeof value === "number") return value;
  const raw = String(value);
  if (field === "salesUptakeMode") {
    return SALES_UPTAKE_MODE_LABELS[raw] ?? humanizeFieldId(raw);
  }
  if (field === "salesUptakePreset") {
    return SALES_UPTAKE_PRESET_LABELS[raw] ?? humanizeFieldId(raw);
  }
  return raw;
}

/** Imperative audit log for Sale Component 2 cash inflows. */
export function logSaleCashInflow(
  field: string,
  value: string | number | boolean,
  uiStepOverride?: number
): void {
  const meta = SALE_CASH_INFLOW_AUDIT_FIELDS[field];
  const uiStep = uiStepOverride ?? meta?.uiStep ?? 1;
  const stepTitle =
    SALE_CASH_INFLOW_STEP_NAMES[uiStep] ?? meta?.label ?? `Step ${uiStep}`;
  const displayValue = formatSaleCashInflowAuditDisplay(field, value);
  logAuditChange({
    id: `sale.cashInflows.${field}`,
    label: meta?.label ?? humanizeFieldId(field),
    value: displayValue,
    component: SALE_CASH_INFLOWS_COMPONENT,
    step: `Step ${uiStep}: ${stepTitle}`,
    route: saleCashInflowAuditRoute(uiStep),
    type:
      meta?.type ??
      (typeof value === "boolean"
        ? "toggle"
        : typeof value === "string"
          ? "select"
          : "input"),
    stream: "sale",
  });
}

// --- Sale Component 4: Financing ---

export const SALE_FINANCING_COMPONENT = "Sale Component 4";

export function saleFinancingAuditRoute(uiStep: number): string {
  return `/sale/financing?step=${uiStep}`;
}

/** 1-based wizard step titles for Sale Component 4 (residential flow) */
export const SALE_FINANCING_STEP_NAMES: Record<number, string> = {
  2: "Debt Sizing",
  3: "Land as Equity",
  4: "Preference Shares",
  5: "Escrow",
  6: "Drawdown",
  7: "Interest & IDC",
};

export const SALE_FINANCING_AUDIT_FIELDS: Record<string, SaleAuditFieldMeta> = {
  debtType: { label: "Debt Type", uiStep: 2, type: "select" },
  loanToCostPercent: {
    label: "Loan-to-Cost Ratio (LTC) %",
    uiStep: 2,
    type: "input",
  },
  maxLtvPercent: { label: "Loan-to-Value Ratio (LTV) %", uiStep: 2, type: "input" },
  landEquityPercent: {
    label: "Land Equity Contribution (%)",
    uiStep: 3,
    type: "input",
  },
  prefSharesEnabled: {
    label: "Enable Preference Shares",
    uiStep: 4,
    type: "toggle",
  },
  prefSharesAllocationPercent: {
    label: "Allocation (% of cash equity)",
    uiStep: 4,
    type: "input",
  },
  prefSharesReturnPct: {
    label: "Target Return (% p.a.)",
    uiStep: 4,
    type: "input",
  },
  prefSharesReturnType: { label: "Return Type", uiStep: 4, type: "select" },
  certificationIntervalMonths: {
    label: "Certification Interval",
    uiStep: 5,
    type: "select",
  },
  retentionPercent: { label: "Retention Percentage (%)", uiStep: 5, type: "input" },
  retentionFinalReleaseMonths: {
    label: "Release Timing (months post completion)",
    uiStep: 5,
    type: "input",
  },
  escrowSetupFee: { label: "Escrow Setup Fee", uiStep: 5, type: "input" },
  escrowManagementFeePercent: {
    label: "Management Fee (% p.a.)",
    uiStep: 5,
    type: "input",
  },
  drawdownMode: { label: "Drawdown Structure", uiStep: 6, type: "select" },
  milestoneThresholdPct: {
    label: "Progress Threshold (%)",
    uiStep: 6,
    type: "input",
  },
  interestRateType: { label: "Interest Rate Type", uiStep: 7, type: "select" },
  interestRate: { label: "All-in Rate (%)", uiStep: 7, type: "input" },
  idcTreatment: { label: "IDC Treatment", uiStep: 7, type: "select" },
  escrowDepositRate: { label: "Escrow Deposit Rate (%)", uiStep: 7, type: "input" },
};

const DEBT_TYPE_LABELS: Record<string, string> = {
  conventional: "Conventional debt",
  islamic: "Islamic financing",
};

const DRAWDOWN_MODE_LABELS: Record<string, string> = {
  "ltc-proportional": "LTC-Proportional Milestone",
  "equity-first": "Equity-First Gap-Fill",
};

const INTEREST_RATE_TYPE_LABELS: Record<string, string> = {
  fixed: "Fixed",
  floating: "Floating",
};

const IDC_TREATMENT_LABELS: Record<string, string> = {
  capitalize: "Capitalize",
  current: "Pay current",
  hybrid: "Hybrid",
};

const PREF_RETURN_TYPE_LABELS: Record<string, string> = {
  "fixed-dividend": "Fixed dividend",
  "islamic-profit": "Islamic profit",
};

export function formatSaleFinancingAuditDisplay(
  field: string,
  value: string | number | boolean
): string | number | boolean {
  if (typeof value === "boolean" || typeof value === "number") {
    if (field === "certificationIntervalMonths" && typeof value === "number") {
      return value === 3 ? "Every 3 months" : value === 6 ? "Every 6 months" : value;
    }
    return value;
  }
  const raw = String(value);
  switch (field) {
    case "debtType":
      return DEBT_TYPE_LABELS[raw] ?? humanizeFieldId(raw);
    case "drawdownMode":
      return DRAWDOWN_MODE_LABELS[raw] ?? humanizeFieldId(raw);
    case "interestRateType":
      return INTEREST_RATE_TYPE_LABELS[raw] ?? humanizeFieldId(raw);
    case "idcTreatment":
      return IDC_TREATMENT_LABELS[raw] ?? humanizeFieldId(raw);
    case "prefSharesReturnType":
      return PREF_RETURN_TYPE_LABELS[raw] ?? humanizeFieldId(raw);
    default:
      return raw;
  }
}

/** Imperative audit log for Sale Component 4 financing. */
export function logSaleFinancing(
  field: string,
  value: string | number | boolean,
  uiStepOverride?: number
): void {
  const meta = SALE_FINANCING_AUDIT_FIELDS[field];
  const uiStep = uiStepOverride ?? meta?.uiStep ?? 2;
  const stepTitle =
    SALE_FINANCING_STEP_NAMES[uiStep] ?? meta?.label ?? `Step ${uiStep}`;
  const displayValue = formatSaleFinancingAuditDisplay(field, value);
  logAuditChange({
    id: `sale.financing.${field}`,
    label: meta?.label ?? humanizeFieldId(field),
    value: displayValue,
    component: SALE_FINANCING_COMPONENT,
    step: `Step ${uiStep}: ${stepTitle}`,
    route: saleFinancingAuditRoute(uiStep),
    type:
      meta?.type ??
      (typeof value === "boolean"
        ? "toggle"
        : typeof value === "string"
          ? "select"
          : "input"),
    stream: "sale",
  });
}

export function auditSaleFinancingField(
  field: string,
  value: string | number | boolean
): void {
  if (field in SALE_FINANCING_AUDIT_FIELDS) {
    logSaleFinancing(field, value);
  }
}
