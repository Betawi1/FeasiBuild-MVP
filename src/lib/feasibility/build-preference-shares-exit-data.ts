import useFinModelStore, { type Financing } from "@/store/useFinModelStore";
import type {
  FeasibilityProjectBundle,
  PreferenceSharesExitStrategyData,
} from "@/types/feasibility";
import { resolveApprovedDebtAmount } from "@/lib/feasibility/build-term-loan-data";
import { buildBTROperationalPnlData } from "@/lib/feasibility/build-btr-market-data";
import { buildOfficeOperationalPnlData } from "@/lib/feasibility/build-office-market-data";
import { buildMallOperationalPnlData } from "@/lib/feasibility/build-retail-market-data";

type SeniorLoanType = "equal-payment" | "equal-principal" | "bullet" | "custom";

const DEFAULT_DSCR_BY_YEAR: { year: string; dscr: number }[] = [
  { year: "Year 1", dscr: 1.15 },
  { year: "Year 2", dscr: 1.25 },
  { year: "Year 3", dscr: 1.35 },
  { year: "Year 4", dscr: 1.42 },
  { year: "Year 5", dscr: 1.48 },
  { year: "Year 6", dscr: 1.52 },
  { year: "Year 7", dscr: 1.55 },
  { year: "Year 8", dscr: 1.58 },
  { year: "Year 9", dscr: 1.6 },
  { year: "Year 10", dscr: 1.62 },
];

const DEFAULT_DEBT_COVENANTS = [
  "Minimum DSCR of 1.20x during operating period",
  "Maximum LTC of 65% at completion",
  "No additional debt permitted without lender consent",
];

function normalizeSeniorLoanType(raw: string | undefined): SeniorLoanType {
  if (raw === "declining" || raw === "equal-payment") return "equal-payment";
  if (raw === "equal" || raw === "equal-principal") return "equal-principal";
  if (raw === "bullet") return "bullet";
  if (raw === "custom") return "custom";
  return "equal-payment";
}

function resolveSeniorLoanType(financing: Financing): SeniorLoanType {
  if (financing.repaymentStructure === "bullet") return "bullet";
  if (financing.loanType) return normalizeSeniorLoanType(financing.loanType);
  if (financing.repaymentStructure === "fully-amortizing") return "equal-payment";
  return "equal-payment";
}

function resolveInterestRate(financing: Financing, fallback = 0): number {
  return (
    financing.fixedOrProfitRatePercent ||
    financing.marginPercent + financing.baseRatePercent ||
    financing.interestRate ||
    fallback
  );
}

function buildLoanRepaymentSchedule(
  financing: Financing,
  loanAtCompletion: number,
  interestRate: number,
  years = 10
): { debtService: number }[] {
  if (financing.amortizationSchedule?.length === years) {
    return financing.amortizationSchedule.map((row) => ({
      debtService: row.debtService,
    }));
  }

  const loan0 = Math.max(0, loanAtCompletion);
  const r = Math.max(0, interestRate) / 100;
  const grace = Math.max(
    0,
    Math.round(
      Number(financing.gracePeriodYears ?? financing.interestOnlyPeriodYears) || 0
    )
  );
  const nAmortYears = Math.max(1, years - grace);
  const loanType = resolveSeniorLoanType(financing);

  const customPrincipal =
    financing.customAnnualPrincipal?.length === years
      ? financing.customAnnualPrincipal
      : financing.customPercentages?.length === years
        ? financing.customPercentages.map((pct) => (loan0 * pct) / 100)
        : [];

  let levelAnnualPayment = 0;
  if (loanType === "equal-payment" && loan0 > 0 && nAmortYears > 0) {
    if (r > 1e-12) {
      const factor = Math.pow(1 + r, nAmortYears);
      levelAnnualPayment = (loan0 * r * factor) / (factor - 1);
    } else {
      levelAnnualPayment = loan0 / nAmortYears;
    }
  }

  let bal = loan0;
  return Array.from({ length: years }, (_, idx) => {
    const startBal = bal;
    const inGrace = idx < grace;
    const interest = startBal * r;
    let principal = 0;

    if (!inGrace) {
      if (loanType === "bullet") {
        principal = idx === years - 1 ? startBal : 0;
      } else if (loanType === "equal-principal") {
        const amortK = idx - grace;
        principal = amortK === nAmortYears - 1 ? startBal : loan0 / nAmortYears;
      } else if (loanType === "equal-payment") {
        principal = Math.min(startBal, Math.max(0, levelAnnualPayment - interest));
      } else {
        principal = customPrincipal[idx] ?? 0;
      }
    }

    principal = Math.min(startBal, Math.max(0, principal));
    const debtService = interest + principal;
    bal = Math.max(0, startBal - principal);
    return { debtService };
  });
}

function resolveAnnualLandDebtService(financing: Financing): number {
  const land = financing.landFinancing;
  if (!land || land.type !== "land_loan") return 0;

  const principal = land.landLoanAmount;
  const years = Math.max(1, land.landLoanTenorYears);
  const monthlyRate = land.landLoanRatePercent / 100 / 12;
  const n = years * 12;
  if (principal <= 0 || n <= 0) return 0;

  const monthlyPayment =
    monthlyRate === 0
      ? principal / n
      : (principal * (monthlyRate * Math.pow(1 + monthlyRate, n))) /
        (Math.pow(1 + monthlyRate, n) - 1);

  return monthlyPayment * 12;
}

function buildDebtCovenants(financing: Financing): string[] {
  const covenants: string[] = [];
  const dscr = financing.dscrTarget ?? 1.2;
  const ltc = financing.loanToCostPercent ?? 65;

  covenants.push(
    `Minimum DSCR of ${dscr.toFixed(2)}x during operating period`
  );
  covenants.push(`Maximum LTC of ${ltc}% at completion`);

  if (financing.maxLtvRatio) {
    covenants.push(`Maximum LTV of ${financing.maxLtvRatio}%`);
  }
  if (financing.minDebtYield) {
    covenants.push(`Minimum debt yield of ${financing.minDebtYield}%`);
  }
  if (financing.cureProvisions) {
    covenants.push("Equity cure permitted under covenant package");
  }
  covenants.push("No additional debt permitted without lender consent");

  return covenants.length > 0 ? covenants : DEFAULT_DEBT_COVENANTS;
}

function capitalizeExitType(value: string | undefined): string {
  if (!value) return "Hold";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function isResidentialBundle(bundle: FeasibilityProjectBundle): boolean {
  const bt = (bundle.buildingType ?? "").toLowerCase();
  const at = (bundle.assetType || bundle.aggregate.assetType || "").toLowerCase();
  return (
    bt === "residential" ||
    at.includes("residential") ||
    at.includes("btr") ||
    (bundle.residentialHoldSnapshot?.residentialGlaSqft ?? 0) > 0
  );
}

function resolveEbitdaForDscr(bundle: FeasibilityProjectBundle): number[] {
  const buildingType = (bundle.buildingType ?? "").toLowerCase();

  if (buildingType === "office") {
    return buildOfficeOperationalPnlData(bundle).ebitda;
  }
  if (buildingType === "retail") {
    return buildMallOperationalPnlData(bundle).ebitda;
  }
  if (buildingType === "residential") {
    return buildBTROperationalPnlData(bundle).ebitda;
  }
  if (buildingType === "hotel") {
    return bundle.operationalPnl?.ebitda ?? [];
  }

  if ((bundle.officeHoldSnapshot?.officeGlaSqft ?? 0) > 0) {
    return buildOfficeOperationalPnlData(bundle).ebitda;
  }
  if ((bundle.retailHoldSnapshot?.glaSqft ?? 0) > 0) {
    return buildMallOperationalPnlData(bundle).ebitda;
  }
  if (isResidentialBundle(bundle)) {
    return buildBTROperationalPnlData(bundle).ebitda;
  }

  return bundle.operationalPnl?.ebitda ?? [];
}

function resolveSavedDscrSchedule(
  bundle: FeasibilityProjectBundle,
  financing: Financing
): { year: string; dscr: number }[] | null {
  const bundleFinancing = (bundle as { financing?: Financing }).financing;
  const savedSchedule =
    financing.dscrSchedule ?? bundleFinancing?.dscrSchedule;

  if (!savedSchedule || !Array.isArray(savedSchedule) || savedSchedule.length === 0) {
    return null;
  }

  return savedSchedule.map((row) => ({
    year: row.year,
    dscr: row.adjustedDSCR ?? row.dscr ?? 0,
  }));
}

function buildDscrByYear(
  bundle: FeasibilityProjectBundle,
  financing: Financing,
  ebitdaOverride?: number[]
): { year: string; dscr: number }[] {
  const operationalYears = bundle.component2?.operationalYears || 10;

  const savedSchedule = resolveSavedDscrSchedule(bundle, financing);
  if (savedSchedule) {
    const hasValidDscr = savedSchedule.some((row) => row.dscr > 0);
    return hasValidDscr
      ? savedSchedule.slice(0, operationalYears)
      : DEFAULT_DSCR_BY_YEAR.slice(0, operationalYears);
  }
  const ebitda = ebitdaOverride ?? resolveEbitdaForDscr(bundle);
  const tdc = bundle.aggregate?.tdc || bundle.component4?.tdc || 0;
  const gdv = bundle.aggregate?.gdv || bundle.component4?.gdv || 0;
  const loanAtCompletion =
    financing.loanAtCompletion ??
    bundle.component4.loanAtCompletion ??
    resolveApprovedDebtAmount(financing, tdc, gdv);

  if (!ebitda || ebitda.length === 0 || loanAtCompletion <= 0) {
    return DEFAULT_DSCR_BY_YEAR.slice(0, operationalYears);
  }

  const interestRate = resolveInterestRate(
    financing,
    bundle.component4.interestRate ?? 0
  );
  const schedule = buildLoanRepaymentSchedule(
    financing,
    loanAtCompletion,
    interestRate,
    operationalYears
  );
  const annualLand = resolveAnnualLandDebtService(financing);

  const pref = financing.preferenceShares;
  const annualPreferred =
    pref?.hasPreferenceShares && pref.amount > 0
      ? pref.amount * (pref.returnPercent / 100)
      : 0;

  const rows = Array.from({ length: operationalYears }, (_, i) => {
    const noi = ebitda[i] ?? 0;
    const adjustedNoi = Math.max(0, noi - annualPreferred);
    const debtService = (schedule[i]?.debtService ?? 0) + annualLand;
    const dscr = debtService > 0 ? adjustedNoi / debtService : 0;
    return {
      year: `Year ${i + 1}`,
      dscr: Math.round(dscr * 100) / 100,
    };
  });

  const hasValidDscr = rows.some((row) => row.dscr > 0);
  return hasValidDscr ? rows : DEFAULT_DSCR_BY_YEAR.slice(0, operationalYears);
}

export function buildPreferenceSharesExitStrategyData(
  bundle: FeasibilityProjectBundle,
  financing: Financing,
  ebitdaOverride?: number[]
): PreferenceSharesExitStrategyData {
  const pref = financing.preferenceShares;
  const exitYear = financing.exitYear ?? 13;
  const operatingYear = Math.max(1, exitYear - 3);
  const projectIrr = useFinModelStore.getState().operational.projectIRR;

  return {
    currency: bundle.currency,
    minDscrTarget: financing.dscrTarget ?? 1.2,
    preferenceShares: {
      isIssuing: pref?.hasPreferenceShares ?? false,
      amount: pref?.amount ?? 0,
      returnRate: pref?.returnPercent ?? 0,
    },
    debtCovenants: buildDebtCovenants(financing),
    dscrByYear: buildDscrByYear(bundle, financing, ebitdaOverride),
    exitStrategy: {
      type: capitalizeExitType(financing.exitStrategy),
      timing: `Year ${operatingYear}`,
      refinanceLTC: financing.refinanceLtc ?? 60,
      refinanceRate: financing.refinanceRate ?? 7.5,
      exitCapRate:
        financing.saleCapRate ??
        projectIrr.exitAssumptions?.saleCapRate ??
        6.5,
      saleCosts: financing.saleCosts ?? 3.0,
    },
  };
}

export function buildPreferenceSharesExitStrategyFromBundle(
  bundle: FeasibilityProjectBundle,
  ebitdaOverride?: number[]
): PreferenceSharesExitStrategyData {
  const financing = useFinModelStore.getState().operational.financing;
  return buildPreferenceSharesExitStrategyData(bundle, financing, ebitdaOverride);
}

export function isPreferenceSharesExitStrategyData(
  data: unknown
): data is PreferenceSharesExitStrategyData {
  if (!data || typeof data !== "object") return false;
  const record = data as PreferenceSharesExitStrategyData;
  return (
    typeof record.currency === "string" &&
    record.preferenceShares != null &&
    Array.isArray(record.debtCovenants) &&
    Array.isArray(record.dscrByYear) &&
    record.exitStrategy != null
  );
}
