import useFinModelStore, {
  calculateOperationsStartMonth,
  type Financing,
} from "@/store/useFinModelStore";
import type {
  FeasibilityProjectBundle,
  TermLoanFinancingData,
} from "@/types/feasibility";

export function formatDrawdownLabel(financing: Financing): string {
  if (financing.drawdownActiveTab === "scurve") {
    return "S-curve construction drawdown";
  }
  if (financing.drawdownActiveTab === "custom") {
    return "Custom monthly drawdown";
  }
  if (financing.drawdownActiveTab === "quarterly") {
    return "Quarterly drawdown schedule";
  }
  if (financing.drawdownModel === "milestone-30-70") {
    return "Milestone-linked (30% / 70%)";
  }
  if (financing.drawdownModel === "equity-first-gap-fill") {
    return "Equity-first gap fill";
  }
  if (financing.drawdownModel === "scurve") {
    return "S-curve construction drawdown";
  }
  return financing.drawdownModel ?? "As per financing wizard";
}

function formatIdcTreatment(treatment: string): string {
  if (treatment === "capitalized" || treatment === "capitalize") {
    return "Capitalized into loan balance";
  }
  if (treatment === "current") return "Paid current (expensed)";
  if (treatment === "hybrid") return "Hybrid (split capitalize / current)";
  return treatment;
}

function formatLoanType(financing: Financing): string {
  return (
    financing.repaymentStructure?.replace(/-/g, " ") ??
    financing.loanType?.replace(/-/g, " ") ??
    financing.amortizationStyle?.replace(/_/g, " ") ??
    "Equal payment"
  );
}

/** Component 4 Step 2: min(LTC, LTV) approved senior facility. */
export function resolveApprovedDebtAmount(
  financing: Financing,
  tdc: number,
  gdv: number
): number {
  const fromStore =
    Number(financing.approvedCreditFacility ?? 0) ||
    Number(financing.debtFacilityAmount ?? 0) ||
    Number(financing.totalDebt ?? 0);

  if (fromStore > 0) return fromStore;

  const debtFromLtc = tdc * (Number(financing.loanToCostPercent || 65) / 100);
  const debtFromLtv = gdv * (Number(financing.maxLtvPercent || 60) / 100);
  const approved = Math.min(debtFromLtc, debtFromLtv);
  return Number.isFinite(approved) ? approved : 0;
}

/** Component 4 Step 7: construction + pre-op + amortization display string. */
export function formatTotalLoanTenorDisplay(
  constructionPeriod: number,
  operationalYears = 10
): string {
  const monthsToOperationsStart = calculateOperationsStartMonth(constructionPeriod);
  const totalTenorMonths = monthsToOperationsStart + operationalYears * 12;
  return `${totalTenorMonths} months (≈ ${(totalTenorMonths / 12).toFixed(1)} years)`;
}

export function buildTermLoanFinancingData(
  bundle: FeasibilityProjectBundle,
  financing: Financing
): TermLoanFinancingData {
  const c4 = bundle.component4;
  const approvedDebt = resolveApprovedDebtAmount(
    financing,
    bundle.aggregate.tdc || c4.tdc || 0,
    bundle.aggregate.gdv || c4.gdv || 0
  );

  const interestRate =
    financing.fixedOrProfitRatePercent ||
    financing.marginPercent + financing.baseRatePercent ||
    financing.interestRate ||
    c4.interestRate ||
    0;

  const totalLoanTenor = formatTotalLoanTenorDisplay(
    bundle.component1.constructionPeriod,
    bundle.component2.operationalYears || 10
  );

  return {
    title: "Financial Analysis",
    subtitle: "Term Loan Financing",
    currency: bundle.currency,
    approvedDebt,
    drawdownType: formatDrawdownLabel(financing),
    idcTreatment: formatIdcTreatment(financing.idcTreatment),
    idcAmount: financing.idcAmount ?? c4.idcAmount ?? 0,
    loanAtCompletion: financing.loanAtCompletion ?? c4.loanAtCompletion ?? approvedDebt,
    loanType: formatLoanType(financing),
    interestRate,
    totalLoanTenor,
  };
}

export function buildTermLoanFinancingFromBundle(
  bundle: FeasibilityProjectBundle
): TermLoanFinancingData {
  const financing = useFinModelStore.getState().operational.financing;
  return buildTermLoanFinancingData(bundle, financing);
}

export function isTermLoanFinancingData(
  data: unknown
): data is TermLoanFinancingData {
  if (!data || typeof data !== "object") return false;
  const record = data as TermLoanFinancingData;
  return (
    typeof record.approvedDebt === "number" &&
    typeof record.currency === "string" &&
    typeof record.totalLoanTenor === "string"
  );
}
