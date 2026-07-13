"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchParamsBoundary from "@/components/SearchParamsBoundary";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DscrYearlyColumnChart } from "@/app/development-finance/DscrYearlyColumnChart";
import { FundingGapAreaChart } from "@/app/development-finance/FundingGapAreaChart";
import { buildCashFlowArray } from "@/lib/irr-calculations";
import { computeReimbursementMilestones } from "@/lib/milestone-drawdown";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import { computeOperationalHotelHoldPnl } from "@/lib/operational-pnl";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import useFinModelStore, {
  buildCashOutflowProfile,
  calculateOperationsStartMonth,
  getOperationalYearMonthRange,
  OPERATIONAL_PERIOD_YEARS,
  PRE_OPERATION_BUFFER_MONTHS,
  type MonthlyFundingStack,
} from "@/store/useFinModelStore";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";

// Base rate mapping by currency (auto-filled for floating rate)
const BASE_RATES: Record<
  string,
  { name: string; tenor: string; source: string; rate: number }
> = {
  USD: {
    name: "SOFR",
    tenor: "Overnight",
    source: "Federal Reserve",
    rate: 5.33,
  },
  EUR: {
    name: "€STR",
    tenor: "Overnight",
    source: "ECB",
    rate: 3.75,
  },
  GBP: {
    name: "SONIA",
    tenor: "Overnight",
    source: "Bank of England",
    rate: 5.25,
  },
  AED: {
    name: "EIBOR",
    tenor: "6M",
    source: "UAE Central Bank",
    rate: 5.4,
  },
  SAR: {
    name: "SAIBOR",
    tenor: "6M",
    source: "Saudi Central Bank",
    rate: 5.45,
  },
  MYR: {
    name: "KLIBOR",
    tenor: "3M",
    source: "Bank Negara Malaysia",
    rate: 3.25,
  },
  USD_ISLAMIC: {
    name: "SOFR (Islamic)",
    tenor: "Overnight",
    source: "AAOIFI",
    rate: 5.33,
  },
  AED_ISLAMIC: {
    name: "EIBOR Islamic Window",
    tenor: "6M",
    source: "UAE Central Bank",
    rate: 5.4,
  },
  SAR_ISLAMIC: {
    name: "SAIBOR Islamic",
    tenor: "6M",
    source: "Saudi Central Bank",
    rate: 5.45,
  },
  MYR_ISLAMIC: {
    name: "KLIBOR Islamic",
    tenor: "3M",
    source: "Bank Negara Malaysia",
    rate: 3.25,
  },
};

const stepLabels = [
  "Project Summary",
  "Debt Facility",
  "Land as Equity",
  "Drawdown Structure",
  "Interest & IDC",
  "Loan Repayment Terms",
  "Debt Covenants & Exit Strategy",
];

/** Step 6 senior schedule (Y4–Y13). Legacy persisted values map via normalizeSeniorLoanType. */
type SeniorLoanType =
  | "bullet"
  | "equal-principal"
  | "equal-payment"
  | "custom";

/** Maps legacy `equal` / `declining` to current `equal-principal` / `equal-payment`. */
function normalizeSeniorLoanType(raw: string | undefined): SeniorLoanType {
  if (raw === "declining" || raw === "equal-payment") return "equal-payment";
  if (raw === "equal" || raw === "equal-principal") return "equal-principal";
  if (raw === "bullet") return "bullet";
  if (raw === "custom") return "custom";
  return "equal-payment";
}

type DebtType = "conventional" | "islamic";

function resolveBaseRateKey(
  currency: string | undefined,
  debtType: DebtType
): string {
  const c = (currency || "AED").toUpperCase().trim();
  if (debtType === "islamic") {
    const islamic = `${c}_ISLAMIC`;
    if (BASE_RATES[islamic]) return islamic;
  }
  if (BASE_RATES[c]) return c;
  return "AED";
}
type RateType = "fixed" | "floating";
type IdcTreatment = "capitalized" | "current" | "hybrid";
type AmortizationStyle = "interest_only" | "straight_line" | "mortgage" | "bullet";
type LandFinancingType = "equity" | "land_loan";
type PrefReturnType = "fixed_dividend" | "target_profit";
type ExitMethod = "sale" | "refinance";

type RepaymentStructureKind =
  | "fully-amortizing"
  | "interest-only"
  | "bullet";

// Generate simplified cumulative cash flow data for chart (M0-M30)
const generateFundingGapChartData = (
  cumulativeNCF: number[] = [],
  constructionPeriod: number = 30
) => {
  const dataPoints: Array<{ month: number; value: number }> = [];
  const step = Math.max(1, Math.floor(constructionPeriod / 6)); // 6 points for M0, M5, M10, M15, M20, M25, M30

  for (let m = 0; m <= constructionPeriod; m += step) {
    const value = cumulativeNCF[m] || 0;
    dataPoints.push({ month: m, value });
  }

  // Ensure end point is included
  if (!dataPoints.some((d) => d.month === constructionPeriod)) {
    dataPoints.push({
      month: constructionPeriod,
      value: cumulativeNCF[constructionPeriod] || 0,
    });
  }

  return dataPoints;
};

type FormData = {
  // Step 1: Debt Type
  debtType: DebtType;

  // Step 2: Debt Sizing
  loanToCostPercent: number;
  maxLtvPercent: number;

  // Debt Tenor
  constructionPeriodMonths: number;
  amortizationYears: number;
  hasBalloon: boolean;
  balloonPercent: number;

  // Step 4: Interest / Profit Rate
  rateType: RateType;
  baseRateName: string;
  baseRatePercent: number;
  marginPercent: number;
  fixedOrProfitRatePercent: number;

  // Step 5: Interest During Construction
  idcTreatment: IdcTreatment;
  idcCapitalizedSharePercent: number;

  // Amortization Schedule
  amortizationStyle: AmortizationStyle;

  // Repayment structure (Step 6)
  repaymentStructure: RepaymentStructureKind;
  interestOnlyPeriodYears: number;

  // Land Financing
  landFinancingType: LandFinancingType;
  landLoanAmount: number;
  landLoanRatePercent: number;
  landLoanTenorYears: number;

  // Step 8: Preference Shares
  hasPreferenceShares: boolean;
  prefAmount: number;
  prefReturnType: PrefReturnType;
  prefReturnPercent: number;
  prefRedeemAtFairValue: boolean;

  // Exit / Refinancing (Step 9)
  holdPeriodYears: number;
  exitMethod: ExitMethod;
  terminalCapRatePercent: number;
  /** Disposal / transaction costs as % of gross exit value */
  salesCostPercent: number;
};

type Errors = Record<string, string>;

function FinancingPageContent() {
  const router = useRouter();
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const searchParams = useSearchParams();
  const financing = useFinModelStore((s) => s.financing);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const cashInflows = useFinModelStore((s) => s.cashInflows);
  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const projectIRR = useFinModelStore((s) => s.projectIRR);
  const updateFinancing = useFinModelStore((s) => s.updateFinancing);
  const operationalSnapshot = useFinModelStore((s) => s.operational.hotelHoldSnapshot);

  const operationalPnl = useMemo(() => {
    if (finStream !== "operational") return null;
    if (!operationalSnapshot) return null;
    return computeOperationalHotelHoldPnl(
      operationalSnapshot,
      cashOutflows.constructionCost || 0,
      cashOutflows.ffe || 0
    );
  }, [
    finStream,
    operationalSnapshot,
    cashOutflows.constructionCost,
    cashOutflows.ffe,
  ]);

  const operatingTotalNetCashFlows = useMemo(() => {
    if (finStream !== "operational" || !operationalPnl || !operationalSnapshot) {
      return 0;
    }

    // Match Component 3 operating cash flow convention:
    // Net Cash Flow from Operating Activities = Net Income + Depreciation − Δ Working Capital
    const arM = Number(operationalSnapshot.depFieldValues?.accountsReceivableMonths) || 0;
    const apM = Number(operationalSnapshot.depFieldValues?.accountsPayableMonths) || 0;

    const nYears = OPERATIONAL_ROOM_REVENUE_YEARS;
    const nwcLevels = Array.from({ length: nYears }, (_, i) => {
      const rev = operationalPnl.totalHotelRevenue[i] ?? 0;
      const opex = operationalPnl.totalExpenses[i] ?? 0;
      return (arM / 12) * rev - (apM / 12) * opex;
    });
    const changeInWC = nwcLevels.map((w, i) => w - (i > 0 ? nwcLevels[i - 1]! : 0));

    const netIncome = operationalPnl.netIncome.slice(0, nYears);
    const depreciation = operationalPnl.depreciationTotal.slice(0, nYears);

    let sum = 0;
    for (let i = 0; i < nYears; i++) {
      sum += (netIncome[i] ?? 0) + (depreciation[i] ?? 0) - (changeInWC[i] ?? 0);
    }
    return sum;
  }, [finStream, operationalPnl, operationalSnapshot]);

  /** Shared NOI assumptions (Steps 4 & 5 DSCR illustrations) */
  const CAP_RATE = 0.06; // 6% cap rate (e.g. Dubai residential benchmark)
  const NOI_GROWTH_RATE = 0.03; // 3% annual NOI growth

  useEffect(() => {
    const store = useFinModelStore.getState();
    const co = store[finStream].cashOutflows;
    console.log("📖 [Component 4] Reading from store:", {
      tdc: co.tdc,
      constructionCost: co.constructionCost,
      peakFunding: store.projectIRR.peakFunding,
    });
  }, []);

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    debtType: "conventional",

    loanToCostPercent: 60,
    maxLtvPercent: 60,

    constructionPeriodMonths: 30, // would be auto‑filled from Component 1
    amortizationYears: 10,
    hasBalloon: false,
    balloonPercent: 0,

    rateType: "fixed",
    baseRateName: "SOFR",
    baseRatePercent: 3,
    marginPercent: 2,
    fixedOrProfitRatePercent: 6,

    idcTreatment: "capitalized",
    idcCapitalizedSharePercent: 100,

    amortizationStyle: "interest_only",

    repaymentStructure: "fully-amortizing",
    interestOnlyPeriodYears: 0,

    landFinancingType: "equity",
    landLoanAmount: 0,
    landLoanRatePercent: 6,
    landLoanTenorYears: 5,

    hasPreferenceShares: false,
    prefAmount: 0,
    prefReturnType: "fixed_dividend",
    prefReturnPercent: 10,
    prefRedeemAtFairValue: true,

    holdPeriodYears: 10,
    exitMethod: "sale",
    terminalCapRatePercent: 7.5,
    salesCostPercent: 3,
  });

  const [errors, setErrors] = useState<Errors>({});

  // Construction timeline (align with Component 3 helpers)
  const constructionPeriod = useMemo(() => {
    const cp = Math.max(0, cashOutflows.constructionPeriod || 0);
    // constructionEndMonth = operationsStart - preOpBuffer - 1 = cp
    return (
      calculateOperationsStartMonth(cp) - PRE_OPERATION_BUFFER_MONTHS - 1
    );
  }, [cashOutflows.constructionPeriod]);

  // Step 4: Drawdown Structure State (tabbed)
  const [activeTab, setActiveTab] = useState<
    "quarterly" | "scurve" | "custom"
  >((financing.drawdownActiveTab as "quarterly" | "scurve" | "custom") ?? "scurve");

  const [quarterlyData, setQuarterlyData] = useState(() => ({
    firstDrawMonth: financing.drawdownQuarterly?.firstMonth ?? 0,
    lastDrawMonth: financing.drawdownQuarterly?.lastMonth ?? constructionPeriod,
  }));

  const defaultMilestones = [
    { id: 1, name: "Land & Foundation", month: 3, percentage: 15 },
    { id: 2, name: "Substructure", month: 6, percentage: 20 },
    { id: 3, name: "Superstructure", month: 12, percentage: 25 },
    { id: 4, name: "Envelope & Cladding", month: 18, percentage: 15 },
    { id: 5, name: "MEP Installation", month: 24, percentage: 15 },
    { id: 6, name: "Interior Fit-Out", month: 30, percentage: 8 },
    { id: 7, name: "Commissioning & Handover", month: 36, percentage: 2 },
  ];

  const [scurveData, setScurveData] = useState(() => ({
    autoCalculate: financing.drawdownScurve?.autoCalculate ?? true,
    milestones:
      (financing.drawdownScurve?.milestones?.length
        ? financing.drawdownScurve.milestones
        : defaultMilestones) ?? defaultMilestones,
  }));

  const [customData, setCustomData] = useState(() => ({
    monthlyDrawdowns:
      financing.monthlyDrawdowns?.length
        ? financing.monthlyDrawdowns
        : Array(constructionPeriod + 1).fill(0),
    bulkInput: "",
  }));

  // Keep Step 4 schedules within construction period when CP changes.
  useEffect(() => {
    setQuarterlyData((p) => ({
      ...p,
      firstDrawMonth: Math.max(0, Math.min(constructionPeriod, Number(p.firstDrawMonth) || 0)),
      lastDrawMonth: Math.max(
        0,
        Math.min(constructionPeriod, Number(p.lastDrawMonth) || 0)
      ),
    }));
    setCustomData((p) => {
      const targetLen = constructionPeriod + 1;
      const prev = Array.isArray(p.monthlyDrawdowns) ? p.monthlyDrawdowns : [];
      if (prev.length === targetLen) return p;
      const next = prev.slice(0, targetLen);
      while (next.length < targetLen) next.push(0);
      return { ...p, monthlyDrawdowns: next };
    });
  }, [constructionPeriod]);

  const [confirmedTab, setConfirmedTab] = useState<
    "quarterly" | "scurve" | "custom" | null
  >(
    (financing.drawdownActiveTab as "quarterly" | "scurve" | "custom") ?? null
  );

  const [validationMessage, setValidationMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);

  // Step 6: Loan Repayment Terms State
  const [loanRepaymentData, setLoanRepaymentData] = useState(() => ({
    loanType: normalizeSeniorLoanType(financing.loanType),
    gracePeriodYears: financing.gracePeriodYears ?? 0,
    gracePeriodStartYear: financing.gracePeriodStartYear ?? 4, // Y4
    prepaymentLockoutYears: financing.prepaymentLockoutYears ?? 3,
    prepaymentPenalty: financing.prepaymentPenalty ?? [5, 4, 3, 2, 1], // Y4-Y8+ step-down
    yieldMaintenance: financing.yieldMaintenance ?? false,
  }));
  const [step6ValidationError, setStep6ValidationError] = useState<string | null>(null);

  /** One-time migration of persisted legacy loan type keys to canonical names. */
  useEffect(() => {
    const raw = financing.loanType;
    if (raw !== "equal" && raw !== "declining") return;
    const n = normalizeSeniorLoanType(raw);
    setLoanRepaymentData((p) => ({ ...p, loanType: n }));
    queueMicrotask(() => updateFinancing({ loanType: n }));
  }, [financing.loanType, updateFinancing]);

  // Custom Schedule: Percentage-based principal allocation (Y4–Y13)
  const [customPercentages, setCustomPercentages] = useState<number[]>(() => {
    const fromStore = financing.customPercentages;
    if (fromStore?.length === 10) {
      return fromStore.map((x) => (Number.isFinite(Number(x)) ? Number(x) : 0));
    }
    const principal = financing.customAnnualPrincipal;
    const loan0 = financing.loanAtCompletion;
    if (principal?.length === 10 && loan0 != null && loan0 > 0) {
      return principal.map((p) => (Math.max(0, Number(p) || 0) / loan0) * 100);
    }
    return Array.from({ length: 10 }, (_, i) => (i === 9 ? 100 : 0));
  });

  const customPercentagesTotal = customPercentages.reduce(
    (a, b) => a + (Number.isFinite(Number(b)) ? Number(b) : 0),
    0
  );
  const customPercentagesValid = Math.abs(customPercentagesTotal - 100) < 0.1;

  // Step 7: Debt Covenants & Exit Strategy
  const [step7Confirmed, setStep7Confirmed] = useState(false);
  const [debtCovenantsData, setDebtCovenantsData] = useState({
    dscrTarget: financing.dscrTarget ?? 1.4,
    dscrFrequency: (financing.dscrFrequency ?? "annual") as
      | "annual"
      | "semi-annual"
      | "quarterly",
    cureProvisions: financing.cureProvisions ?? false,
    maxLtvRatio: financing.maxLtvRatio ?? 70,
    minDebtYield: financing.minDebtYield ?? 8,
  });
  const [exitStrategyData, setExitStrategyData] = useState({
    exitStrategy: (financing.exitStrategy ?? "hold") as "refinance" | "sale" | "hold",
    exitYear: financing.exitYear ?? 13,
    refinanceLtc: financing.refinanceLtc ?? 60,
    refinanceRate: financing.refinanceRate ?? 5,
    saleCapRate: financing.saleCapRate ?? 7,
    saleCosts: financing.saleCosts ?? 3,
  });
  const [useExitCapOverride, setUseExitCapOverride] = useState(false);
  const [step7ValidationError, setStep7ValidationError] = useState<string | null>(null);
  const [step7ValidationMessage, setStep7ValidationMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const monthMax = constructionPeriod;

  const normalizeToMonthArray = (arr: number[], len: number): number[] => {
    const out = [...arr];
    while (out.length < len) out.push(0);
    return out.slice(0, len);
  };

  const sumPct = (arr: number[]) =>
    arr.reduce(
      (a, b) => a + (Number.isFinite(Number(b)) ? Number(b) : 0),
      0
    );

  const validateQuarterly = (): string | null => {
    const first = Math.round(Number(quarterlyData.firstDrawMonth) || 0);
    const last = Math.round(Number(quarterlyData.lastDrawMonth) || 0);
    if (first < 0 || last < 0 || first > monthMax || last > monthMax) {
      return `Months must be within 0–${monthMax}.`;
    }
    if (first > last) return "First draw month must be ≤ last draw month.";
    return null;
  };

  const validateScurve = (): string | null => {
    const ms = scurveData.milestones ?? [];
    if (!ms.length) return "Add at least one milestone.";
    const anyBadMonth = ms.some((m) => {
      const mm = Math.round(Number(m.month) || 0);
      return mm < 0 || mm > monthMax;
    });
    if (anyBadMonth) return `Milestone months must be within 0–${monthMax}.`;
    const anyBadPct = ms.some(
      (m) => !Number.isFinite(Number(m.percentage)) || Number(m.percentage) < 0
    );
    if (anyBadPct) return "Milestone percentages must be ≥ 0.";
    const sum = ms.reduce((a, b) => a + (Number(b.percentage) || 0), 0);
    if (sum < 99.5 || sum > 100.5) {
      return `Milestone percentages must sum to 100% (currently ${sum.toFixed(
        1
      )}%).`;
    }
    return null;
  };

  const validateCustom = (): string | null => {
    const arr = customData.monthlyDrawdowns ?? [];
    if (!arr.length) return "Enter monthly drawdowns.";
    if (arr.some((v) => (Number(v) || 0) < 0)) {
      return "Monthly drawdowns cannot be negative.";
    }
    const sum = sumPct(arr);
    if (sum < 99.5 || sum > 100.5) {
      return `Monthly drawdowns must sum to 100% (currently ${sum.toFixed(
        1
      )}%).`;
    }
    return null;
  };

  const quarterlyPreview = useMemo(() => {
    const first = Math.round(Number(quarterlyData.firstDrawMonth) || 0);
    const last = Math.round(Number(quarterlyData.lastDrawMonth) || 0);
    const months: number[] = [];
    if (first <= last) {
      for (let m = first; m <= last; m += 3) months.push(m);
      if (months.length && months[months.length - 1] !== last) months.push(last);
    }
    const n = Math.max(1, months.length);
    const pctEach = 100 / n;
    const rows = months.map((m) => ({ month: m, pct: pctEach }));
    const monthly = Array.from({ length: monthMax + 1 }, () => 0);
    for (const r of rows) monthly[r.month] += r.pct;
    return { rows, monthly, totalPct: sumPct(monthly) };
  }, [quarterlyData.firstDrawMonth, quarterlyData.lastDrawMonth, monthMax]);

  const scurveResolvedMilestones = useMemo(() => {
    const ms = scurveData.milestones ?? [];
    if (!scurveData.autoCalculate) return ms;
    if (!ms.length) return ms;
    const step = monthMax / (ms.length + 1);
    return ms.map((m, i) => ({
      ...m,
      month: Math.max(0, Math.min(monthMax, Math.round(step * (i + 1)))),
    }));
  }, [scurveData.autoCalculate, scurveData.milestones, monthMax]);

  const scurvePreview = useMemo(() => {
    const ms = scurveResolvedMilestones
      .slice()
      .sort((a, b) => (a.month ?? 0) - (b.month ?? 0));
    const monthly = Array.from({ length: monthMax + 1 }, () => 0);
    for (const m of ms) {
      const mm = Math.max(0, Math.min(monthMax, Math.round(Number(m.month) || 0)));
      monthly[mm] += Number(m.percentage) || 0;
    }
    return { milestones: ms, monthly, totalPct: sumPct(monthly) };
  }, [scurveResolvedMilestones, monthMax]);

  const customMonthly = useMemo(
    () => normalizeToMonthArray(customData.monthlyDrawdowns ?? [], monthMax + 1),
    [customData.monthlyDrawdowns, monthMax]
  );

  const toCumulativeSeries = (monthly: number[]) => {
    let run = 0;
    return monthly.map((pct, month) => {
      run += Number(pct) || 0;
      return { month, pct: Number(pct) || 0, cumulative: run };
    });
  };

  const quarterlyChart = useMemo(
    () => toCumulativeSeries(quarterlyPreview.monthly),
    [quarterlyPreview.monthly]
  );
  const scurveChart = useMemo(
    () => toCumulativeSeries(scurvePreview.monthly),
    [scurvePreview.monthly]
  );
  const customChart = useMemo(() => toCumulativeSeries(customMonthly), [customMonthly]);

  const saveStep4 = () => {
    const base = {
      drawdownActiveTab: activeTab as "quarterly" | "scurve" | "custom",
    };
    if (activeTab === "quarterly") {
      updateFinancing({
        ...base,
        drawdownQuarterly: {
          firstMonth: Math.round(Number(quarterlyData.firstDrawMonth) || 0),
          lastMonth: Math.round(Number(quarterlyData.lastDrawMonth) || 0),
        },
        monthlyDrawdowns: quarterlyPreview.monthly,
      });
      return;
    }
    if (activeTab === "scurve") {
      updateFinancing({
        ...base,
        drawdownScurve: {
          autoCalculate: scurveData.autoCalculate,
          milestones: scurveResolvedMilestones,
        },
        monthlyDrawdowns: scurvePreview.monthly,
      });
      return;
    }
    updateFinancing({
      ...base,
      monthlyDrawdowns: customMonthly,
    });
  };

  const validateStep6 = (): string | null => {
    const gpY = Math.max(
      0,
      Math.round(Number(loanRepaymentData.gracePeriodYears) || 0)
    );
    const lock = Math.max(0, Math.round(Number(loanRepaymentData.prepaymentLockoutYears) || 0));
    if (gpY > 5) {
      return "Interest-only grace (from Y4, before principal amortizes) must be between 0 and 5 years.";
    }
    if (lock > 10) return "Prepayment lockout cannot exceed 10 years.";
    const step6LoanType = normalizeSeniorLoanType(loanRepaymentData.loanType);
    if (
      !["bullet", "equal-principal", "equal-payment", "custom"].includes(
        step6LoanType
      )
    ) {
      return "Please select a valid loan type.";
    }
    const pen = loanRepaymentData.prepaymentPenalty ?? [];
    if (!Array.isArray(pen) || pen.length !== 5) {
      return "Prepayment penalty step-down must have exactly 5 values (Y4–Y8).";
    }
    if (pen.some((p) => !Number.isFinite(Number(p)) || Number(p) < 0)) {
      return "Each prepayment penalty rate must be a non-negative number.";
    }
    if (step6LoanType === "custom") {
      if (!Array.isArray(customPercentages) || customPercentages.length !== 10) {
        return "Custom schedule must have 10 percentage values (Y4–Y13).";
      }
      if (customPercentages.some((v) => !Number.isFinite(Number(v)) || Number(v) < 0)) {
        return "Custom percentages must be non-negative.";
      }
      const sum = customPercentages.reduce(
        (a, b) => a + (Number.isFinite(Number(b)) ? Number(b) : 0),
        0
      );
      if (Math.abs(sum - 100) >= 0.1) {
        return `Custom percentages must sum to 100% (±0.1%). Currently ${sum.toFixed(1)}%.`;
      }
    }
    return null;
  };

  const totalSteps = 7; // Component 4 has 7 steps max (indices 0–6)

  // Deep-link from preview (e.g. /development-finance?step=7 → last step)
  useEffect(() => {
    const raw = searchParams?.get("step");
    if (!raw) return;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;

    // URL uses 1-based step (1–7); internal state is 0–6
    const desired = Math.min(
      totalSteps - 1,
      Math.max(0, Math.round(parsed) - 1)
    );
    setCurrentStep(desired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFormData = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /** Sync form + Zustand store without calling `updateFinancing` inside `setState` updaters (avoids "Cannot update during render"). */
  const syncRepaymentStructure = (v: RepaymentStructureKind) => {
    setFormData((prev) => ({ ...prev, repaymentStructure: v }));
    queueMicrotask(() => {
      updateFinancing({ repaymentStructure: v });
    });
  };

  const syncInterestOnlyPeriodYears = (v: number) => {
    const n = Math.min(5, Math.max(0, Math.round(v)));
    setFormData((prev) => ({ ...prev, interestOnlyPeriodYears: n }));
    queueMicrotask(() => {
      updateFinancing({ interestOnlyPeriodYears: n });
    });
  };

  const syncLandFinancingType = (t: LandFinancingType) => {
    setFormData((prev) => {
      const next = { ...prev, landFinancingType: t };
      queueMicrotask(() => {
        updateFinancing({
          landFinancing: {
            type: next.landFinancingType,
            landLoanAmount: next.landLoanAmount,
            landLoanRatePercent: next.landLoanRatePercent,
            landLoanTenorYears: next.landLoanTenorYears,
          },
        });
      });
      return next;
    });
  };

  const syncLandLoanField = (
    field: "landLoanAmount" | "landLoanRatePercent" | "landLoanTenorYears",
    value: number
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      queueMicrotask(() => {
        updateFinancing({
          landFinancing: {
            type: next.landFinancingType,
            landLoanAmount: next.landLoanAmount,
            landLoanRatePercent: next.landLoanRatePercent,
            landLoanTenorYears: next.landLoanTenorYears,
          },
        });
      });
      return next;
    });
  };

  /** IDC treatment drives preview `/preview/financing` — must mirror into Zustand, not only local form state. */
  const syncIdcTreatment = (t: IdcTreatment) => {
    setFormData((prev) => ({ ...prev, idcTreatment: t }));
    queueMicrotask(() => {
      updateFinancing({ idcTreatment: t });
    });
  };

  const syncIdcCapitalizedSharePercent = (v: number) => {
    const n = Math.min(100, Math.max(0, Number(v) || 0));
    setFormData((prev) => ({ ...prev, idcCapitalizedSharePercent: n }));
    queueMicrotask(() => {
      updateFinancing({ idcCapitalizedSharePercent: n });
    });
  };

  /** Step 5: Interest / profit rate — persist to global `financing` (preview + persistence read store). */
  const flushStep5PricingToStore = (fd: FormData) => {
    const effectiveAllIn =
      fd.rateType === "fixed"
        ? fd.fixedOrProfitRatePercent
        : (fd.baseRatePercent ?? 0) + (fd.marginPercent ?? 0);
    queueMicrotask(() => {
      updateFinancing({
        rateType: fd.rateType,
        fixedOrProfitRatePercent: fd.fixedOrProfitRatePercent,
        baseRateName: fd.baseRateName,
        baseRatePercent: fd.baseRatePercent,
        marginPercent: fd.marginPercent,
        interestRate: effectiveAllIn,
      });
    });
  };

  const saveStep5 = () => {
    flushStep5PricingToStore(formData);
  };

  /** Updates local form state and mirrors Step 5 pricing into Zustand (same pattern as IDC). */
  const updateFormDataStep5Pricing = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      queueMicrotask(() => flushStep5PricingToStore(next));
      return next;
    });
  };

  // Hydrate IDC + Step 5 rate fields from store once (preview reads `financing`, not `formData`).
  useEffect(() => {
    const f = useFinModelStore.getState().financing;
    setFormData((prev) => ({
      ...prev,
      idcTreatment: f.idcTreatment ?? prev.idcTreatment,
      idcCapitalizedSharePercent:
        f.idcCapitalizedSharePercent ?? prev.idcCapitalizedSharePercent,
      rateType: f.rateType ?? prev.rateType,
      fixedOrProfitRatePercent:
        f.fixedOrProfitRatePercent ?? f.interestRate ?? prev.fixedOrProfitRatePercent,
      baseRateName: f.baseRateName ?? prev.baseRateName,
      baseRatePercent: f.baseRatePercent ?? prev.baseRatePercent,
      marginPercent: f.marginPercent ?? prev.marginPercent,
    }));
  }, []);

  // Auto-fill floating base rate name & benchmark % from project currency + debt type
  useEffect(() => {
    if (formData.rateType !== "floating") return;
    const key = resolveBaseRateKey(projectInfo.currency, formData.debtType);
    const entry = BASE_RATES[key] ?? BASE_RATES.AED;
    setFormData((prev) => {
      const next = {
        ...prev,
        baseRateName: entry.name,
        baseRatePercent: entry.rate,
      };
      queueMicrotask(() => flushStep5PricingToStore(next));
      return next;
    });
  }, [formData.rateType, formData.debtType, projectInfo.currency]);

  const validatePercentRange = (
    value: number,
    min: number,
    max: number,
    field: keyof FormData | string,
    label: string,
    newErrors: Errors
  ) => {
    if (value < min || value > max || Number.isNaN(value)) {
      newErrors[field] = `${label} must be between ${min}% and ${max}%.`;
    }
  };

  const validateStep7 = (): string | null => {
    const d = debtCovenantsData;
    const x = exitStrategyData;
    const dscr = Number(d.dscrTarget);
    if (!Number.isFinite(dscr) || dscr < 1.2 || dscr > 2.0) {
      return "DSCR covenant target must be between 1.2× and 2.0×.";
    }
    if (!["annual", "semi-annual", "quarterly"].includes(d.dscrFrequency)) {
      return "Select a DSCR test frequency.";
    }
    const maxLtv = Number(d.maxLtvRatio);
    if (!Number.isFinite(maxLtv) || maxLtv < 40 || maxLtv > 85) {
      return "Maximum LTV covenant must be between 40% and 85%.";
    }
    const minYld = Number(d.minDebtYield);
    if (!Number.isFinite(minYld) || minYld < 0 || minYld > 25) {
      return "Minimum debt yield must be between 0% and 25%.";
    }
    if (!["hold", "refinance", "sale"].includes(x.exitStrategy)) {
      return "Select an exit strategy.";
    }
    const ey = Math.round(Number(x.exitYear) || 0);
    if (ey < 4 || ey > 13) {
      return "Exit / refi year must be between Y4 and Y13.";
    }
    if (x.exitStrategy === "refinance") {
      const ltc = Number(x.refinanceLtc);
      const rate = Number(x.refinanceRate);
      if (!Number.isFinite(ltc) || ltc < 30 || ltc > 85) {
        return "Refinance LTC must be between 30% and 85%.";
      }
      if (!Number.isFinite(rate) || rate < 0 || rate > 25) {
        return "Refinance rate must be between 0% and 25%.";
      }
    }
    if (x.exitStrategy === "sale") {
      const cap = Number(x.saleCapRate);
      const costs = Number(x.saleCosts);
      if (!Number.isFinite(cap) || cap < 2 || cap > 20) {
        return "Exit cap rate must be between 2% and 20%.";
      }
      if (!Number.isFinite(costs) || costs < 0 || costs > 15) {
        return "Sale costs must be between 0% and 15%.";
      }
    }
    return null;
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Errors = {};

    // Step 0 — project summary (read-only): no required fields

    // Step 1 — debt facility: debt type + LTC/LTV
    if (step === 1) {
      if (!formData.debtType) {
        newErrors.debtType = "Please select a debt type.";
      }
      validatePercentRange(
        formData.loanToCostPercent,
        0,
        100,
        "loanToCostPercent",
        "LTC",
        newErrors
      );
      validatePercentRange(
        formData.maxLtvPercent,
        0,
        100,
        "maxLtvPercent",
        "Max LTV",
        newErrors
      );
    }

    // Step 2 — land as equity: optional

    // Step 3 — drawdown 30/70: optional
    if (step === 3) {
      // Only validate active tab.
      const nMonths = cashOutflows.constructionPeriod || 36;
      const inRange = (m: number) =>
        Number.isFinite(m) && m >= 0 && m <= nMonths;

      if (confirmedTab !== activeTab) {
        setValidationError("Please confirm your selected drawdown option to continue.");
        return false;
      }

      if (activeTab === "quarterly") {
        const err = validateQuarterly();
        if (err) {
          setValidationError(err);
          return false;
        }
      }

      if (activeTab === "scurve") {
        const err = validateScurve();
        if (err) {
          setValidationError(err);
          return false;
        }
      }

      if (activeTab === "custom") {
        const err = validateCustom();
        if (err) {
          setValidationError(err);
          return false;
        }
      }

      setValidationError(null);
    }

    // Step 4 — interest & IDC
    if (step === 4) {
      if (formData.rateType === "floating") {
        if (!formData.baseRateName.trim()) {
          newErrors.baseRateName = "Please specify the base rate name.";
        }
        if (formData.baseRatePercent < 0) {
          newErrors.baseRatePercent = "Base rate cannot be negative.";
        }
        if (formData.marginPercent < 0) {
          newErrors.marginPercent = "Margin cannot be negative.";
        }
      } else {
        if (formData.fixedOrProfitRatePercent <= 0) {
          newErrors.fixedOrProfitRatePercent =
            "Rate must be greater than 0% per annum.";
        }
      }
      if (formData.idcTreatment === "hybrid") {
        validatePercentRange(
          formData.idcCapitalizedSharePercent,
          0,
          100,
          "idcCapitalizedSharePercent",
          "Capitalized portion of IDC",
          newErrors
        );
      }
    }

    // Step 5 — escrow: optional
    // Step 5 — loan repayment terms
    if (step === 5) {
      const err = validateStep6();
      if (err) {
        setStep6ValidationError(err);
        return false;
      }
      setStep6ValidationError(null);
    }

    // Step 6 — debt covenants & exit (confirm required before View Preview)
    if (step === 6) {
      const err = validateStep7();
      if (err) {
        setStep7ValidationMessage(null);
        setStep7ValidationError(err);
        return false;
      }
      setStep7ValidationError(null);
      if (!step7Confirmed) {
        setStep7ValidationMessage(null);
        setStep7ValidationError(
          "Review the summary, then click Confirm to enable View Preview."
        );
        return false;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Debt sizing from store (TDC from Component 1) and LTC/LTV from form or store.
  // Prefer wizard `formData` so sliders (Step 2) update senior debt & equity before store sync.
  const tdc = cashOutflows.tdc || 0;
  const ltc = formData.loanToCostPercent ?? financing.loanToCostPercent ?? 65;
  const ltv = formData.maxLtvPercent ?? financing.maxLtvPercent ?? 60;
  const debtFromLTC = tdc * (ltc / 100);

  /** Operational Y9 (0-based index 8) — same stabilization year as project-irr (`STABILIZED_NOI_COL_INDEX` after `shiftBy3`). */
  const OPERATIONAL_STABILIZED_PNL_YEAR_INDEX = 8;

  /** Exit cap % for operational stabilized value (form → store → 7% default). */
  const operationalExitCapPercent =
    finStream === "operational"
      ? useExitCapOverride
        ? Math.max(0, Number(exitStrategyData.saleCapRate) || 0) || 7
        : projectIRR.exitCapRate ?? 7
      : formData.terminalCapRatePercent > 0
        ? formData.terminalCapRatePercent
        : financing.terminalCapRatePercent > 0
          ? financing.terminalCapRatePercent
          : 7;

  const operationalEbitdaY9 =
    operationalPnl?.ebitda?.[OPERATIONAL_STABILIZED_PNL_YEAR_INDEX] ?? 0;
  const operationalTotalRevenueY9 =
    operationalPnl?.totalHotelRevenue?.[OPERATIONAL_STABILIZED_PNL_YEAR_INDEX] ??
    0;

  const grossDevelopmentValue =
    finStream === "operational" && operationalPnl
      ? operationalExitCapPercent > 0
        ? operationalEbitdaY9 / (operationalExitCapPercent / 100)
        : tdc * 1.2
      : cashInflows.grossSales || tdc * 1.2;

  /** GDV for pro-forma NOI (same base as Step 5) */
  const proFormaGdvForNoi = grossDevelopmentValue || 0;
  const annualNoiForYear = (yearIndex1Based: number) =>
    proFormaGdvForNoi *
    CAP_RATE *
    Math.pow(1 + NOI_GROWTH_RATE, yearIndex1Based - 1);

  const debtFromLTV = grossDevelopmentValue * (ltv / 100);
  const totalDebt = Math.min(debtFromLTC, debtFromLTV);
  const equityRequired = Math.max(0, tdc - totalDebt);

  /** Step 2 sliders: live min(LTC, LTV) debt and which cap binds */
  const debtLtcFromForm = tdc * (formData.loanToCostPercent / 100);
  const debtLtvFromForm =
    grossDevelopmentValue * (formData.maxLtvPercent / 100);
  const approvedDebtAmount = Math.min(debtLtcFromForm, debtLtvFromForm);
  const bindingConstraint: "LTC" | "LTV" =
    debtLtcFromForm < debtLtvFromForm
      ? "LTC"
      : debtLtvFromForm < debtLtcFromForm
        ? "LTV"
        : "LTC";

  const constructionPeriodForFlows =
    cashOutflows.constructionPeriod || formData.constructionPeriodMonths || 30;
  /** Step 3: amortization 3–15 years (form + financing store fallback) */
  // Operational stream: Component 2 hotel operations are 10 years, so we
  // lock amortization to 10Y (120 months) even if persisted inputs differ.
  const amortizationYearsSlider =
    finStream === "operational"
      ? 10
      : Math.min(
          15,
          Math.max(
            3,
            formData.amortizationYears ||
              financing.amortizationYears ||
              10
          )
        );
  const amortizationFilledBars = Math.round(
    ((amortizationYearsSlider - 3) / (15 - 3)) * 13
  );

  /** Repayment structure (Step 6) — store + form */
  const repaymentStructure: RepaymentStructureKind =
    (financing.repaymentStructure as RepaymentStructureKind | undefined) ??
    formData.repaymentStructure;
  const interestOnlyPeriod = Math.min(
    5,
    Math.max(
      0,
      Math.round(
        financing.interestOnlyPeriodYears ??
          formData.interestOnlyPeriodYears ??
          0
      )
    )
  );

  const postCompletionBufferMonths = 6;

  const fundingRequirement = useMemo(() => {
    const flows = buildCashFlowArray(
      cashOutflows,
      cashInflows,
      constructionPeriodForFlows,
      postCompletionBufferMonths
    );

    let cumulative = 0;
    const cumulativeNCF: number[] = [];
    let minCumulative = 0;
    let peakFundingMonth = 0;

    for (const p of flows) {
      cumulative += p.amount;
      cumulativeNCF[p.month] = cumulative;
      if (cumulative < minCumulative) {
        minCumulative = cumulative;
        peakFundingMonth = p.month;
      }
    }

    const peakFromSeries = Math.abs(minCumulative);
    const peakFunding =
      projectIRR.peakFunding && projectIRR.peakFunding > 0
        ? projectIRR.peakFunding
        : peakFromSeries;

    cumulative = 0;
    let shortfallEndMonth = 0;
    for (const p of flows) {
      cumulative += p.amount;
      if (cumulative < 0) {
        shortfallEndMonth = p.month;
      }
    }

    const cumulativeGap = flows.reduce(
      (sum, p) => sum + (p.amount < 0 ? -p.amount : 0),
      0
    );

    cumulative = 0;
    const chartData = flows.map((p) => {
      cumulative += p.amount;
      return {
        month: p.month,
        monthLabel: `M${p.month}`,
        gap: cumulative < 0 ? -cumulative : 0,
      };
    });

    return {
      peakFunding,
      peakFundingMonth,
      shortfallEndMonth,
      cumulativeGap,
      chartData,
      cumulativeNCF,
    };
  }, [
    cashInflows,
    cashOutflows,
    constructionPeriodForFlows,
    postCompletionBufferMonths,
    projectIRR.peakFunding,
  ]);

  /** Step 4: explicit selector vs legacy `reimbursementModel` only */
  const drawdownModelSelected =
    financing.drawdownModel ??
    ((financing.reimbursementModel ?? true)
      ? "milestone-30-70"
      : "equity-first-gap-fill");

  const outflowProfileForMilestones = useMemo(
    () => buildCashOutflowProfile(cashOutflows),
    [cashOutflows]
  );

  const milestoneSchedulePreview = useMemo(
    () =>
      computeReimbursementMilestones({
        autoCalculateMilestoneMonths:
          financing.autoCalculateMilestoneMonths ?? true,
        milestoneThresholds: financing.milestoneThresholds ?? [30, 60, 90, 100],
        certificationInterval: financing.certificationInterval ?? 3,
        overrideMilestoneMonths: financing.overrideMilestoneMonths ?? null,
        costSchedule: outflowProfileForMilestones.monthlyTotal || [],
        totalLandCost: cashOutflows.landCost || 0,
        landCost: cashOutflows.landCost || 0,
        constructionPeriod: constructionPeriodForFlows,
        tdc,
      }),
    [
      financing.autoCalculateMilestoneMonths,
      financing.milestoneThresholds,
      financing.certificationInterval,
      financing.overrideMilestoneMonths,
      outflowProfileForMilestones,
      cashOutflows.landCost,
      constructionPeriodForFlows,
      tdc,
    ]
  );

  const formatProjectCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: projectInfo.currency || "AED",
      maximumFractionDigits: 0,
    }).format(value);
  const formatCurrency = formatProjectCurrency;

  const effectiveInterestRate =
    formData.rateType === "fixed"
      ? formData.fixedOrProfitRatePercent
      : formData.baseRatePercent + formData.marginPercent;

  const benchmarkEntry = useMemo(() => {
    const key = resolveBaseRateKey(projectInfo.currency, formData.debtType);
    return BASE_RATES[key] ?? BASE_RATES.AED;
  }, [projectInfo.currency, formData.debtType]);

  // IDC (Step 5) — illustrative draw, capitalization, loan at completion, P&I
  const constructionPeriodMonthsIdc = constructionPeriodForFlows;
  const averageDebtDrawdown = approvedDebtAmount * 0.5;
  const monthlyInterestRateIdc = effectiveInterestRate / 100 / 12;
  const totalIDC =
    averageDebtDrawdown *
    monthlyInterestRateIdc *
    constructionPeriodMonthsIdc;

  const idcAmountCapitalized =
    formData.idcTreatment === "current"
      ? 0
      : formData.idcTreatment === "capitalized"
        ? totalIDC
        : totalIDC * (formData.idcCapitalizedSharePercent / 100);

  const loanAtCompletion = approvedDebtAmount + idcAmountCapitalized;

  const principalFromCustomPercentages = useMemo(() => {
    const loan0 = Math.max(0, loanAtCompletion || 0);
    return customPercentages.map(
      (pct) =>
        loan0 *
        (Math.max(0, Number.isFinite(Number(pct)) ? Number(pct) : 0) / 100)
    );
  }, [loanAtCompletion, customPercentages]);

  /** Y4–Y13 senior debt service: bullet / equal-principal / annuity (equal-payment) / custom; grace = IO years from Y4. */
  const loanRepaymentScheduleY4Y13 = useMemo(() => {
    const years = Array.from({ length: 10 }, (_, i) => 4 + i);
    const loan0 = Math.max(0, loanAtCompletion || 0);
    const r = Math.max(0, effectiveInterestRate || 0) / 100;
    const grace = Math.max(0, Math.round(Number(loanRepaymentData.gracePeriodYears) || 0));
    const nAmortYears = Math.max(1, years.length - grace);
    const loanType = normalizeSeniorLoanType(loanRepaymentData.loanType);

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
    return years.map((spreadsheetYear, idx) => {
      const startBal = bal;
      const inGrace = idx < grace;
      const interest = startBal * r;
      let principal = 0;
      if (!inGrace) {
        if (loanType === "bullet") {
          principal = idx === years.length - 1 ? startBal : 0;
        } else if (loanType === "equal-principal") {
          const amortK = idx - grace;
          principal =
            amortK === nAmortYears - 1
              ? startBal
              : loan0 / nAmortYears;
        } else if (loanType === "equal-payment") {
          principal = Math.min(
            startBal,
            Math.max(0, levelAnnualPayment - interest)
          );
        } else {
          principal = principalFromCustomPercentages[idx] ?? 0;
        }
      }
      principal = Math.min(startBal, Math.max(0, principal));
      const debtService = interest + principal;
      const endBal = Math.max(0, startBal - principal);
      bal = endBal;
      return {
        spreadsheetYear,
        debtService,
        interest,
        principal,
        startBal,
        endBal,
      };
    });
  }, [
    loanAtCompletion,
    effectiveInterestRate,
    loanRepaymentData.gracePeriodYears,
    loanRepaymentData.loanType,
    principalFromCustomPercentages,
  ]);

  useEffect(() => {
    const sched = loanRepaymentScheduleY4Y13;
    // eslint-disable-next-line no-console
    console.log("=== Step 6 Amortization Schedule Debug ===");
    // eslint-disable-next-line no-console
    console.log("Loan Type:", loanRepaymentData.loanType);
    // eslint-disable-next-line no-console
    console.log("Amortization Schedule:", sched);
    // eslint-disable-next-line no-console
    console.log("Schedule Length:", sched?.length);
    // eslint-disable-next-line no-console
    console.log("Principal Values:", sched?.map((s) => s.principal));
    const lt = normalizeSeniorLoanType(loanRepaymentData.loanType);
    if (lt === "equal-principal" && sched?.length) {
      const grace = Math.max(
        0,
        Math.round(Number(loanRepaymentData.gracePeriodYears) || 0)
      );
      const principalValues = sched
        .filter((_, idx) => idx >= grace)
        .map((s) => s.principal);
      const firstP = principalValues[0] ?? 0;
      const allEqual =
        principalValues.length > 0 &&
        principalValues.every((p) => Math.abs(p - firstP) < 1);
      // eslint-disable-next-line no-console
      console.log("Equal Principal Check:", allEqual ? "✅ YES" : "❌ NO");
    }
  }, [
    loanRepaymentData.loanType,
    loanRepaymentData.gracePeriodYears,
    loanRepaymentScheduleY4Y13,
  ]);

  const saveStep6 = () => {
    const penRaw = [...(loanRepaymentData.prepaymentPenalty ?? [5, 4, 3, 2, 1])];
    while (penRaw.length < 5) penRaw.push(0);
    const prepaymentPenaltyNorm = penRaw.slice(0, 5);
    updateFinancing({
      loanType: normalizeSeniorLoanType(loanRepaymentData.loanType),
      gracePeriodYears: Math.max(0, Math.round(Number(loanRepaymentData.gracePeriodYears) || 0)),
      gracePeriodStartYear: 4,
      prepaymentLockoutYears: Math.max(0, Math.round(Number(loanRepaymentData.prepaymentLockoutYears) || 0)),
      prepaymentPenalty: prepaymentPenaltyNorm,
      yieldMaintenance: !!loanRepaymentData.yieldMaintenance,
      customPercentages:
        normalizeSeniorLoanType(loanRepaymentData.loanType) === "custom"
          ? [...customPercentages]
          : undefined,
      customAnnualPrincipal:
        normalizeSeniorLoanType(loanRepaymentData.loanType) === "custom"
          ? [...principalFromCustomPercentages]
          : undefined,
      amortizationSchedule: loanRepaymentScheduleY4Y13.map((row) => ({ ...row })),
    });
  };

  const saveStep7 = () => {
    updateFinancing({
      dscrTarget: debtCovenantsData.dscrTarget,
      dscrFrequency: debtCovenantsData.dscrFrequency,
      cureProvisions: debtCovenantsData.cureProvisions,
      maxLtvRatio: debtCovenantsData.maxLtvRatio,
      minDebtYield: debtCovenantsData.minDebtYield,
      exitStrategy: exitStrategyData.exitStrategy,
      exitYear: exitStrategyData.exitYear,
      refinanceLtc: exitStrategyData.refinanceLtc,
      refinanceRate: exitStrategyData.refinanceRate,
      saleCapRate: exitStrategyData.saleCapRate,
      saleCosts: exitStrategyData.saleCosts,
    });
  };

  const monthlyDebtServiceWithIDC = useMemo(() => {
    const loanAmount = loanAtCompletion;
    const annualRate = effectiveInterestRate / 100;
    const monthlyRate = annualRate / 12;
    const totalPayments = amortizationYearsSlider * 12;
    if (totalPayments <= 0 || loanAmount <= 0) return 0;
    if (monthlyRate === 0) return loanAmount / totalPayments;
    return (
      (loanAmount *
        (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1)
    );
  }, [loanAtCompletion, effectiveInterestRate, amortizationYearsSlider]);

  /** P&I if only approved debt (no capitalized IDC in balance) — for comparison */
  const monthlyDebtServiceApprovedOnly = useMemo(() => {
    const loanAmount = approvedDebtAmount;
    const annualRate = effectiveInterestRate / 100;
    const monthlyRate = annualRate / 12;
    const totalPayments = amortizationYearsSlider * 12;
    if (totalPayments <= 0 || loanAmount <= 0) return 0;
    if (monthlyRate === 0) return loanAmount / totalPayments;
    return (
      (loanAmount *
        (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1)
    );
  }, [approvedDebtAmount, effectiveInterestRate, amortizationYearsSlider]);

  const monthlyIDCPaymentCash =
    formData.idcTreatment === "capitalized"
      ? 0
      : formData.idcTreatment === "current"
        ? averageDebtDrawdown * monthlyInterestRateIdc
        : averageDebtDrawdown *
          monthlyInterestRateIdc *
          (1 - formData.idcCapitalizedSharePercent / 100);

  const dscrDataStep5 = useMemo(() => {
    const data: {
      year: string;
      dscr: number;
      noi: number;
      debtService: number;
    }[] = [];
    const annualDebtService = monthlyDebtServiceWithIDC * 12;

    if (finStream === "operational") {
      // Operational timeline labels: Operating Y1–Y10 shown at operating year-end months (same as Component 3).
      // NOI proxy for DSCR = Net Cash Flow from Operating Activities:
      //   Net Income + Depreciation − Δ Working Capital
      const snap = operationalSnapshot;
      const nYears = OPERATIONAL_PERIOD_YEARS;
      const netIncome = operationalPnl?.netIncome ?? Array(nYears).fill(0);
      const depreciation = operationalPnl?.depreciationTotal ?? Array(nYears).fill(0);

      const arM = Number(snap?.depFieldValues?.accountsReceivableMonths) || 0;
      const apM = Number(snap?.depFieldValues?.accountsPayableMonths) || 0;
      const nwcLevels = Array.from({ length: nYears }, (_, i) => {
        const rev = operationalPnl?.totalHotelRevenue?.[i] ?? 0;
        const opex = operationalPnl?.totalExpenses?.[i] ?? 0;
        return (arM / 12) * rev - (apM / 12) * opex;
      });
      const changeInWC = nwcLevels.map((w, i) => w - (i > 0 ? nwcLevels[i - 1]! : 0));

      for (let oy = 1; oy <= nYears; oy++) {
        const i = oy - 1;
        const noi =
          (netIncome[i] ?? 0) + (depreciation[i] ?? 0) - (changeInWC[i] ?? 0);
        const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
        const labelYear = 3 + oy; // Spreadsheet year alignment: Op Y1->Y4 … Op Y10->Y13
        data.push({
          year: `Y${labelYear}`,
          dscr: Math.round(dscr * 100) / 100,
          noi,
          debtService: annualDebtService,
        });
      }
    } else {
      for (let y = 1; y <= amortizationYearsSlider; y++) {
        const noi = annualNoiForYear(y);
        const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
        data.push({
          year: `Y${y}`,
          dscr: Math.round(dscr * 100) / 100,
          noi,
          debtService: annualDebtService,
        });
      }
    }
    return data;
  }, [
    finStream,
    operationalPnl,
    operationalSnapshot,
    proFormaGdvForNoi,
    monthlyDebtServiceWithIDC,
    amortizationYearsSlider,
  ]);

  const dscrOpYearEndMonths = useMemo(() => {
    if (finStream !== "operational") return [];
    const cp = Math.max(0, cashOutflows.constructionPeriod || 0);
    return Array.from({ length: OPERATIONAL_PERIOD_YEARS }, (_, i) => {
      const { endMonth } = getOperationalYearMonthRange(i + 1, cp);
      return endMonth;
    });
  }, [finStream, cashOutflows.constructionPeriod]);

  /** Operational Loan Preview: 10 FYE rows = spreadsheet Y4–Y13 / hotel OY1–OY10; IO grace = Step 6 years only (not construction/pre-op). */
  const loanPreviewRows = useMemo(() => {
    if (finStream !== "operational") return [];

    const cp = Math.max(0, cashOutflows.constructionPeriod || 0);
    const graceYears = Math.max(
      0,
      Math.min(5, Math.round(Number(loanRepaymentData.gracePeriodYears) || 0))
    );

    return Array.from({ length: OPERATIONAL_PERIOD_YEARS }, (_, i) => {
      const { endMonth } = getOperationalYearMonthRange(i + 1, cp);
      const sched = loanRepaymentScheduleY4Y13[i];
      return {
        fyeMonth: endMonth,
        startBal: sched?.startBal ?? 0,
        interest: sched?.interest ?? 0,
        principal: sched?.principal ?? 0,
        debtService: sched?.debtService ?? 0,
        endBal: sched?.endBal ?? 0,
        isGrace: i < graceYears,
      };
    });
  }, [
    finStream,
    cashOutflows.constructionPeriod,
    loanRepaymentScheduleY4Y13,
    loanRepaymentData.gracePeriodYears,
  ]);

  const minDSCRStep5 = useMemo(
    () =>
      dscrDataStep5.length > 0
        ? Math.min(...dscrDataStep5.map((d) => d.dscr))
        : 0,
    [dscrDataStep5]
  );

  const avgDSCRStep5 = useMemo(
    () =>
      dscrDataStep5.length > 0
        ? dscrDataStep5.reduce((sum, d) => sum + d.dscr, 0) /
          dscrDataStep5.length
        : 0,
    [dscrDataStep5]
  );

  const maxDSCRStep5 = useMemo(
    () =>
      dscrDataStep5.length > 0
        ? Math.max(...dscrDataStep5.map((d) => d.dscr))
        : 0,
    [dscrDataStep5]
  );

  // Repayment structure (Step 6) — dynamic debt service vs pro-forma NOI
  const monthlyDebtServiceStep6 = useMemo(() => {
    const loanAmount = loanAtCompletion;
    if (loanAmount <= 0) return 0;
    const annualRate = effectiveInterestRate / 100;
    const monthlyRate = annualRate / 12;
    const totalPayments = Math.max(1, amortizationYearsSlider * 12);
    const ioMonths = Math.min(
      interestOnlyPeriod * 12,
      Math.max(0, totalPayments - 1)
    );
    const amortizingPayments = Math.max(1, totalPayments - ioMonths);

    const levelPayment = (n: number) => {
      if (n <= 0) return 0;
      if (monthlyRate === 0) return loanAmount / n;
      return (
        (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n))) /
        (Math.pow(1 + monthlyRate, n) - 1)
      );
    };

    if (repaymentStructure === "bullet") {
      return loanAmount * monthlyRate;
    }
    if (repaymentStructure === "interest-only") {
      return levelPayment(amortizingPayments);
    }
    if (interestOnlyPeriod > 0) {
      return levelPayment(amortizingPayments);
    }
    return levelPayment(totalPayments);
  }, [
    loanAtCompletion,
    effectiveInterestRate,
    amortizationYearsSlider,
    interestOnlyPeriod,
    repaymentStructure,
  ]);

  const monthlyInterestOnly = useMemo(() => {
    const loanAmount = loanAtCompletion;
    if (loanAmount <= 0) return 0;
    const annualRate = effectiveInterestRate / 100;
    const monthlyRate = annualRate / 12;
    return loanAmount * monthlyRate;
  }, [loanAtCompletion, effectiveInterestRate]);

  const balloonPayment = useMemo(() => {
    if (repaymentStructure !== "bullet") return 0;
    return loanAtCompletion;
  }, [repaymentStructure, loanAtCompletion]);

  const dscrDataStep6 = useMemo(() => {
    const data: {
      year: string;
      dscr: number;
      noi: number;
      debtService: number;
    }[] = [];
    const annualDebtServiceBase = monthlyDebtServiceStep6 * 12;
    const annualInterestOnly = monthlyInterestOnly * 12;
    const years = amortizationYearsSlider;

    for (let y = 1; y <= years; y++) {
      const noi = annualNoiForYear(y);
      const debtService =
        repaymentStructure === "bullet"
          ? annualInterestOnly
          : y <= interestOnlyPeriod
            ? annualInterestOnly
            : annualDebtServiceBase;
      const dscr = debtService > 0 ? noi / debtService : 0;
      data.push({
        year: `Y${y}`,
        dscr: Math.round(dscr * 100) / 100,
        noi,
        debtService,
      });
    }

    return data;
  }, [
    amortizationYearsSlider,
    monthlyDebtServiceStep6,
    monthlyInterestOnly,
    interestOnlyPeriod,
    repaymentStructure,
    proFormaGdvForNoi,
    CAP_RATE,
    NOI_GROWTH_RATE,
  ]);

  const dscrStep6ChartData = useMemo(
    () =>
      dscrDataStep6.map((row, i) => ({
        label: row.year,
        yearIndex: i + 1,
        dscr: row.dscr,
      })),
    [dscrDataStep6]
  );

  const minDSCRStep6 = useMemo(
    () =>
      dscrDataStep6.length > 0
        ? Math.min(...dscrDataStep6.map((d) => d.dscr))
        : 0,
    [dscrDataStep6]
  );

  const avgDSCRStep6 = useMemo(
    () =>
      dscrDataStep6.length > 0
        ? dscrDataStep6.reduce((sum, d) => sum + d.dscr, 0) /
          dscrDataStep6.length
        : 0,
    [dscrDataStep6]
  );

  const maxDSCRStep6 = useMemo(
    () =>
      dscrDataStep6.length > 0
        ? Math.max(...dscrDataStep6.map((d) => d.dscr))
        : 0,
    [dscrDataStep6]
  );

  /** Land loan P&I (illustrative); equity = 0 for monthly DSCR */
  const monthlyLandDebtService = useMemo(() => {
    if (formData.landFinancingType !== "land_loan") return 0;
    const principal = formData.landLoanAmount;
    const years = Math.max(1, formData.landLoanTenorYears);
    const monthlyRate = formData.landLoanRatePercent / 100 / 12;
    const n = years * 12;
    if (principal <= 0 || n <= 0) return 0;
    if (monthlyRate === 0) return principal / n;
    return (
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, n))) /
      (Math.pow(1 + monthlyRate, n) - 1)
    );
  }, [
    formData.landFinancingType,
    formData.landLoanAmount,
    formData.landLoanRatePercent,
    formData.landLoanTenorYears,
  ]);

  const totalMonthlyDebtService =
    monthlyDebtServiceStep6 + monthlyLandDebtService;

  const totalDebtWithLand = useMemo(
    () =>
      approvedDebtAmount +
      (formData.landFinancingType === "land_loan"
        ? formData.landLoanAmount
        : 0),
    [
      approvedDebtAmount,
      formData.landFinancingType,
      formData.landLoanAmount,
    ]
  );

  const dscrDataStep7 = useMemo(() => {
    const annualLand = monthlyLandDebtService * 12;

    if (finStream === "operational") {
      const ebitdaYearly = operationalPnl?.ebitda ?? Array(10).fill(0);
      // Senior debt service: Step 6 amortization schedule (Y4–Y13); IO years still have interest.
      return Array.from({ length: 10 }, (_, i) => 4 + i).map((spreadsheetYear, i) => {
        const fyeMonth = dscrOpYearEndMonths[i];
        const year = fyeMonth != null ? `M${fyeMonth}` : `Y${spreadsheetYear}`;
        const noi = ebitdaYearly[i] ?? 0;
        const seniorAnnual = loanRepaymentScheduleY4Y13[i]?.debtService ?? 0;
        const totalAnnual = seniorAnnual + annualLand;
        const dscr = totalAnnual > 0 ? noi / totalAnnual : 0;
        return {
          year,
          dscr: Math.round(dscr * 100) / 100,
          noi,
          debtService: totalAnnual,
        };
      });
    }

    return dscrDataStep6.map((row) => {
      const totalAnnual = row.debtService + annualLand;
      const dscr = totalAnnual > 0 ? row.noi / totalAnnual : 0;
      return {
        year: row.year,
        dscr: Math.round(dscr * 100) / 100,
        noi: row.noi,
        debtService: totalAnnual,
      };
    });
  }, [
    finStream,
    operationalPnl,
    loanRepaymentScheduleY4Y13,
    dscrDataStep6,
    monthlyLandDebtService,
    dscrOpYearEndMonths,
  ]);

  const dscrStep7ChartData = useMemo(
    () =>
      dscrDataStep7.map((row, i) => ({
        label: row.year,
        yearIndex: i + 1,
        dscr: row.dscr,
      })),
    [dscrDataStep7]
  );

  const minDSCRStep7 = useMemo(
    () =>
      dscrDataStep7.length > 0
        ? Math.min(...dscrDataStep7.map((d) => d.dscr))
        : 0,
    [dscrDataStep7]
  );

  const avgDSCRStep7 = useMemo(
    () =>
      dscrDataStep7.length > 0
        ? dscrDataStep7.reduce((sum, d) => sum + d.dscr, 0) /
          dscrDataStep7.length
        : 0,
    [dscrDataStep7]
  );

  const maxDSCRStep7 = useMemo(
    () =>
      dscrDataStep7.length > 0
        ? Math.max(...dscrDataStep7.map((d) => d.dscr))
        : 0,
    [dscrDataStep7]
  );

  /** Step 8 — preference / mezz: preferred return as % p.a. on pref amount (non-amortizing) */
  const monthlyPreferredReturn = useMemo(() => {
    if (!formData.hasPreferenceShares || formData.prefAmount <= 0) return 0;
    const annualRate = (formData.prefReturnPercent || 0) / 100;
    return (formData.prefAmount * annualRate) / 12;
  }, [
    formData.hasPreferenceShares,
    formData.prefAmount,
    formData.prefReturnPercent,
  ]);

  const totalMonthlyObligation =
    totalMonthlyDebtService + monthlyPreferredReturn;

  /** DSCR after subtracting annual preferred return from NOI (same debt service as Step 7). */
  const dscrDataStep8 = useMemo(() => {
    const annualPreferred = monthlyPreferredReturn * 12;
    return dscrDataStep7.map((row) => {
      const adjustedNOI =
        formData.hasPreferenceShares && formData.prefAmount > 0
          ? Math.max(0, row.noi - annualPreferred)
          : row.noi;
      const adjustedDSCR =
        row.debtService > 0 ? adjustedNOI / row.debtService : 0;
      return {
        year: row.year,
        dscr: row.dscr,
        adjustedDSCR: Math.round(adjustedDSCR * 100) / 100,
        noi: row.noi,
        debtService: row.debtService,
        preferredReturnAnnual: annualPreferred,
      };
    });
  }, [
    dscrDataStep7,
    monthlyPreferredReturn,
    formData.hasPreferenceShares,
    formData.prefAmount,
  ]);

  const dscrStep8ChartData = useMemo(
    () =>
      dscrDataStep8.map((row, i) => ({
        label: row.year,
        yearIndex: i + 1,
        dscr: row.adjustedDSCR,
      })),
    [dscrDataStep8]
  );

  const minDSCRStep8 = useMemo(
    () =>
      dscrDataStep8.length > 0
        ? Math.min(...dscrDataStep8.map((d) => d.adjustedDSCR))
        : 0,
    [dscrDataStep8]
  );

  const avgDSCRStep8 = useMemo(
    () =>
      dscrDataStep8.length > 0
        ? dscrDataStep8.reduce((sum, d) => sum + d.adjustedDSCR, 0) /
          dscrDataStep8.length
        : 0,
    [dscrDataStep8]
  );

  const maxDSCRStep8 = useMemo(
    () =>
      dscrDataStep8.length > 0
        ? Math.max(...dscrDataStep8.map((d) => d.adjustedDSCR))
        : 0,
    [dscrDataStep8]
  );

  /** Y4–Y13 covenant pass/fail vs user DSCR target (NOI = P&amp;L EBITDA when operational). */
  const calculateDscrCovenantProjection = useMemo(() => {
    const dscrTarget = debtCovenantsData.dscrTarget;
    const projections = dscrDataStep8.map((row, i) => ({
      spreadsheetYear: 4 + i,
      yearLabel: row.year,
      noi: row.noi,
      debtService: row.debtService,
      dscr: row.adjustedDSCR,
      covenantPass: row.adjustedDSCR >= dscrTarget,
    }));
    const len = projections.length;
    const avgDscr =
      len > 0 ? projections.reduce((s, p) => s + p.dscr, 0) / len : 0;
    const minDscr = len > 0 ? Math.min(...projections.map((p) => p.dscr)) : 0;
    const passCount = projections.filter((p) => p.covenantPass).length;
    const failCount = len - passCount;

    // Debug logs: executes when memo recomputes (client-side).
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.log("=== [Component 4 Step 7] DSCR Debug ===");
      // eslint-disable-next-line no-console
      console.log("DSCR target:", dscrTarget);
      // eslint-disable-next-line no-console
      console.log("EBITDA (operational, Y4–Y13):", operationalPnl?.ebitda);
      // eslint-disable-next-line no-console
      console.log("Amortization schedule (Y4–Y13):", financing.amortizationSchedule);
      // eslint-disable-next-line no-console
      console.log("Sample projection Y4:", projections[0]);
      // eslint-disable-next-line no-console
      console.log(`Pass count: ${passCount} / ${len}`);
    }

    return { projections, avgDscr, minDscr, passCount, failCount };
  }, [
    dscrDataStep8,
    debtCovenantsData.dscrTarget,
    operationalPnl,
    financing.amortizationSchedule,
  ]);

  const remainingBalanceAtExitYear = useMemo(() => {
    const exitYear = Math.min(
      13,
      Math.max(4, Math.round(Number(exitStrategyData.exitYear) || 13))
    );
    const sched =
      financing.amortizationSchedule?.length === 10
        ? financing.amortizationSchedule
        : loanRepaymentScheduleY4Y13;
    const row = sched.find((r) => r.spreadsheetYear === exitYear);
    return { exitYear, endBal: row?.endBal ?? 0 };
  }, [
    exitStrategyData.exitYear,
    financing.amortizationSchedule,
    loanRepaymentScheduleY4Y13,
  ]);

  // Sale Development stream: removed hold period / exit assumptions block.
  // (Keep a placeholder to avoid breaking any remaining unreachable JSX.)
  const step9HoldExitMetrics: any = {};

  const handleNext = () => {
    const isValid = validateStep(currentStep);
    if (!isValid) return;

    if (currentStep === 3) {
      saveStep4();
    }

    if (currentStep === 4) {
      saveStep5();
    }

    if (currentStep === 5) {
      saveStep6();
    }

    if (currentStep === 6) {
      saveStep7();
    }

    if (currentStep === totalSteps - 1) {
      const constructionPeriodMonths = cashOutflows.constructionPeriod || formData.constructionPeriodMonths || 30;
      const amortizationYears = formData.amortizationYears || financing.amortizationYears || 7;
      const amortizationMonths = amortizationYears * 12;

      const debtFacilityAmount = totalDebt; // approved cap (LTC/LTV binding)
      const maxEquityBase = Math.max(0, tdc - debtFacilityAmount);

      const commitmentFeeRatePct = financing.commitmentFeeRate ?? 1.0;
      const commitmentFeeMonthlyRate = (commitmentFeeRatePct / 100) / 12;

      const equityFirstDraw = financing.equityFirstDraw ?? true;
      // NOTE: salesReduceDebt is intentionally not modeled as early principal payoff.
      const salesReduceEquity = financing.salesReduceEquity ?? true;
      void salesReduceEquity;

      // Dynamic IDC treatment: interest is accrued on the evolving outstanding drawn balance.
      const idcTreatment = formData.idcTreatment;
      const idcCapitalizedShare =
        idcTreatment === "capitalized"
          ? 1
          : idcTreatment === "current"
            ? 0
            : (formData.idcCapitalizedSharePercent || 100) / 100;

      const monthlyRate = effectiveInterestRate / 100 / 12;

      const outflowProfile = buildCashOutflowProfile(cashOutflows);
      const costSchedule = outflowProfile.monthlyTotal || [];

      const salesByMonth = new Map<number, number>();
      for (const p of cashInflows.monthlyInflowSchedule || []) {
        salesByMonth.set(p.month, (salesByMonth.get(p.month) || 0) + (p.amount || 0));
      }

      let cumBaseCosts = 0;
      let cumSales = 0;
      let cumDebtDrawn = 0;
      let cumCapitalizedIDC = 0;
      let cumEquityBase = 0;
      let cumExtraEquity = 0;
      let cumInterestPaidConstruction = 0;
      let cumCommitmentFeePaid = 0;
      let peakBaseNetNeed = 0;

      const monthlyFundingStack: MonthlyFundingStack[] = [];

      for (let m = 0; m <= constructionPeriodMonths; m++) {
        const baseCostThisMonth = costSchedule[m] || 0;
        const salesThisMonth = salesByMonth.get(m) || 0;

        cumBaseCosts += baseCostThisMonth;
        cumSales += salesThisMonth;

        // Base net need (used for equity recycling / draw decision).
        const netNeedBase = Math.max(
          0,
          cumBaseCosts - (salesReduceEquity ? cumSales : 0)
        );
        peakBaseNetNeed = Math.max(peakBaseNetNeed, netNeedBase);

        let desiredDebtCumulative = 0;
        if (equityFirstDraw) {
          desiredDebtCumulative = Math.min(
            debtFacilityAmount,
            Math.max(0, peakBaseNetNeed - maxEquityBase)
          );
        } else {
          desiredDebtCumulative = Math.min(debtFacilityAmount, peakBaseNetNeed);
        }
        desiredDebtCumulative = Math.max(0, desiredDebtCumulative);

        const debtDrawThisMonth = Math.max(0, desiredDebtCumulative - cumDebtDrawn);
        cumDebtDrawn += debtDrawThisMonth;

        const desiredEquityBaseCumulative = Math.max(0, peakBaseNetNeed - desiredDebtCumulative);
        const equityBaseThisMonth = Math.max(
          0,
          desiredEquityBaseCumulative - cumEquityBase
        );
        cumEquityBase += equityBaseThisMonth;

        // Accrue interest on actual outstanding drawn balance.
        const outstanding = cumDebtDrawn + cumCapitalizedIDC;
        const interestCost = outstanding * monthlyRate;
        const interestCapitalized = interestCost * idcCapitalizedShare;
        const interestPaid = interestCost - interestCapitalized;
        cumCapitalizedIDC += interestCapitalized;
        cumInterestPaidConstruction += interestPaid;

        // Commitment fee on undrawn facility portion.
        const undrawnFacility = Math.max(0, debtFacilityAmount - cumDebtDrawn);
        const commitmentFee = undrawnFacility * commitmentFeeMonthlyRate;
        cumCommitmentFeePaid += commitmentFee;

        // Cash uses include (construction costs + cash IDC if not capitalized + commitment fee).
        const cumulativeCosts =
          cumBaseCosts + cumInterestPaidConstruction + cumCommitmentFeePaid;
        const cumulativeSales = cumSales;

        const totalEquitySoFar = cumEquityBase + cumExtraEquity;
        const rawFundingGap =
          cumulativeCosts - cumulativeSales - (cumDebtDrawn + totalEquitySoFar);
        const equityExtraThisMonth = rawFundingGap > 0 ? rawFundingGap : 0;
        cumExtraEquity += equityExtraThisMonth;

        const fundingGap = Math.max(
          0,
          rawFundingGap - equityExtraThisMonth
        );

        monthlyFundingStack.push({
          month: m,
          cumulativeCosts,
          cumulativeSales,
          debtDrawThisMonth,
          cumulativeDebtDrawn: cumDebtDrawn,
          equityThisMonth: equityBaseThisMonth + equityExtraThisMonth,
          cumulativeEquity: cumEquityBase + cumExtraEquity,
          interestCost,
          interestPaid,
          interestCapitalized,
          commitmentFee,
          totalFinancingCost: interestCost + commitmentFee,
          fundingGap,
        });
      }

      const loanAtCompletion = cumDebtDrawn + cumCapitalizedIDC;
      const idcAmountCapitalized = cumCapitalizedIDC;

      const fundingByMonth = new Map(
        monthlyFundingStack.map((d) => [d.month, d])
      );

      const repaymentStructure = formData.repaymentStructure as RepaymentStructureKind;
      const ioMonths = Math.max(0, Math.round((formData.interestOnlyPeriodYears || 0) * 12));

      const levelPayment = (principal: number, n: number) => {
        if (n <= 0 || principal <= 0) return 0;
        if (monthlyRate === 0) return principal / n;
        return (
          (principal *
            (monthlyRate * Math.pow(1 + monthlyRate, n))) /
          (Math.pow(1 + monthlyRate, n) - 1)
        );
      };

      // Store debt service schedule (cash interest + principal), primarily for DSCR illustrations.
      const totalMonths = Math.min(240, constructionPeriodMonths + amortizationMonths);
      const repaymentStartMonth = constructionPeriodMonths + 1;
      let outstanding = loanAtCompletion;
      let monthlyDebtServiceWithPrincipal = 0;

      const monthlyDebtServiceArray: { month: number; service: number }[] = [];
      let totalInterestPaid = 0;

      const n = amortizationMonths;
      const fullPayment = levelPayment(loanAtCompletion, n);
      const amortMonthsAfterIO = Math.max(0, n - Math.min(ioMonths, n));
      const paymentAfterIO = levelPayment(loanAtCompletion, amortMonthsAfterIO);

      for (let m = 0; m < totalMonths; m++) {
        let service = 0;
        if (m < repaymentStartMonth) {
          // During construction, cash debt service is cash IDC interest only (principal is 0).
          service = fundingByMonth.get(m)?.interestPaid || 0;
          totalInterestPaid += service;
        } else {
          const t = m - repaymentStartMonth; // 0..n-1
          if (t >= 0 && t < n) {
            const interest = outstanding * monthlyRate;
            let principal = 0;

            if (repaymentStructure === "bullet") {
              principal = t === n - 1 ? outstanding : 0;
            } else if (repaymentStructure === "interest-only") {
              if (t < Math.min(ioMonths, n)) {
                principal = 0;
              } else {
                const interestAfterIO = outstanding * monthlyRate;
                const payment = paymentAfterIO;
                principal = Math.max(0, payment - interestAfterIO);
              }
            } else {
              // fully-amortizing
              const payment = fullPayment;
              principal = Math.max(0, payment - interest);
            }

            // Numerical safety: don't overpay principal.
            principal = Math.min(principal, outstanding);
            outstanding = Math.max(0, outstanding - principal);

            service = interest + principal;
            monthlyDebtServiceWithPrincipal = service;
            totalInterestPaid += interest;
          }
        }

        monthlyDebtServiceArray.push({ month: m, service });
      }

      const peakEquityRequired = monthlyFundingStack.reduce(
        (max, d) => Math.max(max, d.cumulativeEquity),
        0
      );

      updateFinancing({
        totalDebt: debtFacilityAmount,
        idcAmount: idcAmountCapitalized,
        loanAtCompletion,
        debtFacilityAmount,
        commitmentFeeRate: commitmentFeeRatePct,
        equityFirstDraw,
        salesReduceEquity: financing.salesReduceEquity ?? true,
        salesReduceDebt: financing.salesReduceDebt ?? false,
        idcTreatment: formData.idcTreatment,
        idcCapitalizedSharePercent: formData.idcCapitalizedSharePercent,
        rateType: formData.rateType,
        fixedOrProfitRatePercent: formData.fixedOrProfitRatePercent,
        baseRateName: formData.baseRateName,
        baseRatePercent: formData.baseRatePercent,
        marginPercent: formData.marginPercent,
        interestRate: effectiveInterestRate,

        peakEquityRequired,
        totalInterestPaid,
        totalCommitmentFeePaid: cumCommitmentFeePaid,

        monthlyFundingStack,
        monthlyDebtService: monthlyDebtServiceArray,
      });
      console.log("🧮 [Component 4] Debt calculation:", {
        tdc,
        ltc,
        debtFromLTC,
        debtFacilityAmount,
        idcAmountCapitalized,
        loanAtCompletion,
      });
      console.log("💾 [Component 4] Full financing slice:", {
        ...financing,
        totalDebt: debtFacilityAmount,
        idcAmount: idcAmountCapitalized,
        loanAtCompletion,
        peakEquityRequired,
        monthlyFundingStack,
      });
      router.push(withStreamPrefix(streamPrefix, "/preview/financing"));
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const fieldError = (name: keyof FormData | string) => errors[name];

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                FinModel App — Component 4
              </h1>
              <p className="text-slate-400">Development Financing</p>
            </div>
          </div>

          {/* Step Counter - REINSTATED above progress bar */}
          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete</span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2">
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Main wizard — full width (removed old 3-column grid that reserved space for DSCR) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-8">
              {/* Step 0: Project Summary — rearranged + funding gap layout */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-2">
                      📋 Project Summary
                    </h2>
                    <p className="text-sm text-slate-400">
                      Review inputs from Components 1-3 before configuring financing.
                    </p>
                  </div>

                  {/* Project Summary & Funding Requirement Cards (2 columns) */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Left Card: Development Costs */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-white mb-3">
                        Development Costs (Component 2)
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Land Costs:</span>
                          <span className="text-white font-medium">
                            {formatProjectCurrency(cashOutflows.landCost || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Construction Costs:</span>
                          <span className="text-white font-medium">
                            {formatProjectCurrency(cashOutflows.constructionCost || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">FFE Costs:</span>
                          <span className="text-white font-medium">
                            {formatProjectCurrency(cashOutflows.ffe || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Soft Costs:</span>
                          <span className="text-white font-medium">
                            {formatProjectCurrency(cashOutflows.softCosts || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">POWC:</span>
                          <span className="text-white font-medium">
                            {formatProjectCurrency(cashOutflows.powc || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-700">
                          <span className="text-slate-300 font-semibold">
                            Total Development Costs (TDC):
                          </span>
                          <span className="text-emerald-400 font-bold">
                            {formatProjectCurrency(tdc)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Card: Project Metrics */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-white mb-3">
                        Project Metrics
                      </h3>
                      <div className="space-y-2 text-sm">
                        {finStream === "operational" ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Construction Period:</span>
                              <span className="text-white font-medium">
                                {Math.max(0, cashOutflows.constructionPeriod || 0)} months
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Operating Period:</span>
                              <span className="text-white font-medium">10 years</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">
                                Operating Total Net Cash Flows:
                              </span>
                              <span className="text-white font-medium">
                                {formatProjectCurrency(operatingTotalNetCashFlows)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-700">
                              <span className="text-slate-300 font-semibold">Net Surplus:</span>
                              <span className="text-emerald-400 font-bold">
                                {formatProjectCurrency(operatingTotalNetCashFlows - tdc)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-400">
                                Gross Development Value (GDV):
                              </span>
                              <span className="text-white font-medium">
                                {formatProjectCurrency(grossDevelopmentValue)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Construction Period:</span>
                              <span className="text-white font-medium">
                                {constructionPeriodForFlows} months
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Sales Start Month:</span>
                              <span className="text-white font-medium">
                                M{cashInflows.launchTiming?.launchMonthOffset ?? 3}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-700">
                              <span className="text-slate-300 font-semibold">Net Surplus:</span>
                              <span className="text-emerald-400 font-bold">
                                {formatProjectCurrency(grossDevelopmentValue - tdc)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Funding Gap Visualization - Preliminary (Full Width - 1 Column) */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">
                      📊 Funding Gap Visualization - Preliminary
                    </h3>

                    {(() => {
                      const tdcSafe = tdc || 0;
                      const assumedLtc = 0.65;
                      const maxDebt = tdcSafe * assumedLtc;
                      const minEquity = Math.max(0, tdcSafe - maxDebt);

                      return (
                        <>
                          {/* Key Metrics Cards (3 columns) */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-slate-900/50 rounded-lg p-3">
                              <p className="text-xs text-slate-400">Peak Funding Gap</p>
                              <p className="text-lg font-semibold text-amber-400">
                                {formatProjectCurrency(fundingRequirement.peakFunding || 0)}
                              </p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3">
                              <p className="text-xs text-slate-400">
                                Max Debt Capacity (65% LTC)
                              </p>
                              <p className="text-lg font-semibold text-blue-400">
                                {formatProjectCurrency(maxDebt)}
                              </p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3">
                              <p className="text-xs text-slate-400">
                                Min Equity Required (35%)
                              </p>
                              <p className="text-lg font-semibold text-emerald-400">
                                {formatProjectCurrency(minEquity)}
                              </p>
                            </div>
                          </div>

                          {/* Cumulative Cash Flow During Construction (line/area) */}
                          <div className="border-t border-slate-700 pt-4">
                            <p className="text-xs text-slate-400 mb-2">
                              Cumulative Cash Flow During Construction
                            </p>
                            <FundingGapAreaChart
                              data={generateFundingGapChartData(
                                fundingRequirement.cumulativeNCF,
                                constructionPeriodForFlows
                              ).map((p) => ({
                                month: p.month,
                                monthLabel: `M${p.month}`,
                                gap: p.value < 0 ? -p.value : 0,
                              }))}
                              peakFundingMonth={fundingRequirement.peakFundingMonth}
                              formatCurrency={formatProjectCurrency}
                            />
                          </div>

                          {/* Visual Bar Graph (BELOW the metric cards) */}
                          <div className="border-t border-slate-700 pt-4">
                            <p className="text-xs text-slate-400 mb-2">
                              Capital Stack Visualization
                            </p>

                            {/* Stacked Bar */}
                            <div className="relative h-16 bg-slate-700 rounded-lg overflow-hidden flex">
                              {/* Debt Portion (Blue) */}
                              <div
                                className="h-full bg-blue-600 flex items-center px-3 transition-all duration-500"
                                style={{ width: "65%" }}
                              >
                                <span className="text-xs font-medium text-white whitespace-nowrap">
                                  Debt: 65%
                                </span>
                              </div>
                              {/* Equity Portion (Amber) */}
                              <div
                                className="h-full bg-amber-600 flex items-center px-3 transition-all duration-500"
                                style={{ width: "35%" }}
                              >
                                <span className="text-xs font-medium text-white whitespace-nowrap">
                                  Equity: 35%
                                </span>
                              </div>
                            </div>

                            {/* Legend */}
                            <div className="flex gap-4 mt-3 text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-600 rounded" />
                                <span className="text-slate-400">Debt (65% LTC)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-amber-600 rounded" />
                                <span className="text-slate-400">Equity (35%)</span>
                              </div>
                            </div>

                            {/* Dynamic Funding Gap Indicator */}
                            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-emerald-400">
                                  Peak Equity Required (Dynamic):
                                </span>
                                <span className="text-sm font-semibold text-emerald-400">
                                  {formatProjectCurrency(fundingRequirement.peakFunding || 0)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                ℹ️ This is the maximum cumulative cash shortfall during
                                construction before debt drawdowns. Actual equity
                                required may be lower due to sales recycling and land
                                financing settings.
                              </p>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Step 2: Debt facility (LTC/LTV) */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                    <h3 className="mb-4 text-lg font-semibold text-white">
                      Debt type
                    </h3>
                    <p className="mb-4 text-sm text-slate-400">
                      Conventional (interest-based) or Islamic (profit-based)
                      terminology for the rest of this component.
                    </p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => updateFormData("debtType", "conventional")}
                        className={`rounded-lg border p-4 text-left transition-colors ${
                          formData.debtType === "conventional"
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                            : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        <h4 className="mb-1 font-semibold">Conventional debt</h4>
                        <p className="text-xs text-slate-400">
                          Fixed or floating interest (e.g. benchmark + margin).
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFormData("debtType", "islamic")}
                        className={`rounded-lg border p-4 text-left transition-colors ${
                          formData.debtType === "islamic"
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                            : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        <h4 className="mb-1 font-semibold">Islamic financing</h4>
                        <p className="text-xs text-slate-400">
                          Murabaha / Ijara / Sukuk-style profit rate wording.
                        </p>
                      </button>
                    </div>
                    {fieldError("debtType") && (
                      <p className="mt-2 text-sm text-red-400">{fieldError("debtType")}</p>
                    )}
                  </div>

                  <div className="mb-6">
                    <h2 className="mb-2 text-xl font-semibold text-white">
                      Debt sizing — LTC &amp; LTV
                    </h2>
                    <p className="text-sm text-slate-400">
                      Define your loan-to-cost and loan-to-value ratios
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {/* Calculated debt capacity (sliders + card) */}
                    <div className="space-y-6">
                      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                        <h3 className="mb-4 text-lg font-semibold text-white">
                          Calculated Debt Capacity
                        </h3>

                        {/* LTC slider */}
                        <div className="mb-6">
                          <div className="mb-2 flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-300">
                              Loan-to-Cost Ratio (LTC)
                            </label>
                            <span className="text-lg font-bold text-emerald-400">
                              {formData.loanToCostPercent}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={formData.loanToCostPercent}
                            onChange={(e) =>
                              updateFormData(
                                "loanToCostPercent",
                                Number(e.target.value) || 0
                              )
                            }
                            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-emerald-500"
                          />
                          <div className="mt-1 flex justify-between text-xs text-slate-500">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                          </div>
                          {fieldError("loanToCostPercent") && (
                            <p className="mt-1 text-sm text-red-400">
                              {fieldError("loanToCostPercent")}
                            </p>
                          )}
                        </div>

                        {/* LTV slider */}
                        <div className="mb-6">
                          <div className="mb-2 flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-300">
                              Loan-to-Value Ratio (LTV)
                            </label>
                            <span className="text-lg font-bold text-emerald-400">
                              {formData.maxLtvPercent}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={formData.maxLtvPercent}
                            onChange={(e) =>
                              updateFormData(
                                "maxLtvPercent",
                                Number(e.target.value) || 0
                              )
                            }
                            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-emerald-500"
                          />
                          <div className="mt-1 flex justify-between text-xs text-slate-500">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                          </div>
                          {fieldError("maxLtvPercent") && (
                            <p className="mt-1 text-sm text-red-400">
                              {fieldError("maxLtvPercent")}
                            </p>
                          )}
                        </div>

                        {/* Calculated debt capacity card */}
                        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                          <div className="mb-4 border-b border-slate-700 pb-4">
                            <p className="mb-2 text-xs text-slate-400">
                              Based on LTC ({formData.loanToCostPercent}% of TDC):
                            </p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">TDC:</span>
                                <span className="text-white">
                                  {formatProjectCurrency(tdc)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">LTC:</span>
                                <span className="text-white">
                                  {formData.loanToCostPercent}%
                                </span>
                              </div>
                              <div className="flex justify-between border-t border-slate-700/50 pt-1">
                                <span className="text-slate-400">
                                  Debt from LTC:
                                </span>
                                <span className="font-semibold text-emerald-400">
                                  {formatProjectCurrency(debtLtcFromForm)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mb-4 border-b border-slate-700 pb-4">
                            <p className="mb-2 text-xs text-slate-400">
                              Based on LTV ({formData.maxLtvPercent}% of
                              Stabilized Value):
                            </p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">
                                  Stabilized Value:
                                </span>
                                <span className="text-white">
                                  {formatProjectCurrency(grossDevelopmentValue)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">LTV:</span>
                                <span className="text-white">
                                  {formData.maxLtvPercent}%
                                </span>
                              </div>
                              <div className="flex justify-between border-t border-slate-700/50 pt-1">
                                <span className="text-slate-400">
                                  Debt from LTV:
                                </span>
                                <span className="font-semibold text-emerald-400">
                                  {formatProjectCurrency(debtLtvFromForm)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-300">
                                Approved Debt Amount:
                              </span>
                              <span className="text-xl font-bold text-emerald-400">
                                {formatProjectCurrency(approvedDebtAmount)}
                              </span>
                            </div>
                            <div
                              className={`flex items-center gap-2 text-xs ${
                                bindingConstraint === "LTC"
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }`}
                            >
                              <span aria-hidden>✅</span>
                              <span>
                                Limited by {bindingConstraint} — the binding
                                constraint
                              </span>
                            </div>
                          </div>

                          <p className="mt-4 border-t border-slate-700 pt-4 text-xs text-slate-500">
                            ℹ️ Lenders use the LOWER of LTC or LTV calculations
                            to size loans.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {finStream === "operational" && operationalPnl && (
                    <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                      <h4 className="mb-3 text-sm font-medium text-slate-400">
                        Stabilized Value Calculation
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-500">
                            EBITDA Y9 (P&amp;L index {OPERATIONAL_STABILIZED_PNL_YEAR_INDEX}):
                          </p>
                          <p className="font-mono text-slate-300">
                            {formatProjectCurrency(operationalEbitdaY9)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Total hotel revenue Y9:</p>
                          <p className="font-mono text-slate-300">
                            {formatProjectCurrency(operationalTotalRevenueY9)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">
                            FF&amp;E reserve (4% of revenue Y9, illustrative):
                          </p>
                          <p className="font-mono text-slate-300">
                            {formatProjectCurrency(operationalTotalRevenueY9 * 0.04)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Ground rent:</p>
                          <p className="font-mono text-slate-300">Not modeled</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-500">Adjustments in this step:</p>
                          <p className="text-slate-300">
                            None — stabilized value uses P&amp;L EBITDA Y9 only (same
                            as net income + depreciation in this model), then divides
                            by exit cap.
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Stabilized NOI (input to cap):</p>
                          <p className="font-mono text-emerald-400">
                            {formatProjectCurrency(operationalEbitdaY9)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Exit cap rate:</p>
                          <p className="font-mono text-slate-300">
                            {operationalExitCapPercent.toFixed(1)}%
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-500">Stabilized value:</p>
                          <p className="font-mono text-slate-300">
                            {formatProjectCurrency(operationalEbitdaY9)} ÷{" "}
                            {operationalExitCapPercent.toFixed(1)}% ={" "}
                            {formatProjectCurrency(grossDevelopmentValue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Construction Loan Drawdown Structure */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <h2 className="mb-2 text-xl font-semibold text-white">
                      Construction Loan Drawdown Structure
                    </h2>
                    <p className="text-sm text-slate-400">
                      Choose a drawdown approach and configure its schedule. Only
                      the active tab is validated.
                    </p>
                  </div>

                  {/* Tabs */}
                  <div className="flex flex-wrap gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-2">
                    {(
                      [
                        { id: "quarterly", label: "Quarterly" },
                        { id: "scurve", label: "S-Curve (Hybrid Milestones)" },
                        { id: "custom", label: "Custom" },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(t.id);
                        }}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          activeTab === t.id
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-900/40 text-slate-300 hover:bg-slate-900/70"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {validationError && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                      {validationError}
                    </div>
                  )}
                  {validationMessage && (
                    <div
                      className={`rounded-lg p-3 text-sm ${
                        validationMessage.type === "success"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {validationMessage.text}
                    </div>
                  )}

                  {/* Quarterly */}
                  {activeTab === "quarterly" && (
                    <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                      <h3 className="text-lg font-semibold text-white">Quarterly</h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-slate-400">
                            First draw month (M0..M{constructionPeriod})
                          </label>
                          <input
                            type="number"
                            min={0}
                            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                            value={quarterlyData.firstDrawMonth}
                            onChange={(e) => {
                              const v = Math.max(0, Math.round(Number(e.target.value) || 0));
                              setQuarterlyData((p) => ({ ...p, firstDrawMonth: v }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-400">
                            Last draw month
                          </label>
                          <input
                            type="number"
                            min={0}
                            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                            value={quarterlyData.lastDrawMonth}
                            onChange={(e) => {
                              const v = Math.max(0, Math.round(Number(e.target.value) || 0));
                              setQuarterlyData((p) => ({ ...p, lastDrawMonth: v }));
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                            Preview table
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[320px] text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-700 text-slate-400">
                                  <th className="px-2 py-2 font-medium">Draw month</th>
                                  <th className="px-2 py-2 font-medium">% of total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700/80 text-slate-300">
                                {quarterlyPreview.rows.map((r, i) => (
                                  <tr key={`${r.month}-${i}`}>
                                    <td className="px-2 py-2 font-mono">M{r.month}</td>
                                    <td className="px-2 py-2 font-mono">
                                      {r.pct.toFixed(1)}%
                                    </td>
                                  </tr>
                                ))}
                                <tr className="border-t border-slate-700/80">
                                  <td className="px-2 py-2 text-slate-400">Total</td>
                                  <td className="px-2 py-2 font-mono text-white">
                                    {quarterlyPreview.totalPct.toFixed(1)}%
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                            Cumulative drawdown
                          </p>
                          <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={quarterlyChart}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} domain={[0, 100]} />
                                <Tooltip
                                  formatter={(v: any, name) =>
                                    name === "cumulative" ? [`${Number(v).toFixed(1)}%`, "Cumulative"] : [`${Number(v).toFixed(1)}%`, "Monthly"]
                                  }
                                  labelFormatter={(l) => `M${l}`}
                                />
                                <Area type="monotone" dataKey="cumulative" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                                <Line type="monotone" dataKey="pct" stroke="#38bdf8" dot={false} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Confirm Selection Button */}
                      <div className="flex justify-end border-t border-slate-700 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            const err = validateQuarterly();
                            if (err) {
                              setValidationError(err);
                              setValidationMessage({ type: "error", text: err });
                              return;
                            }
                            setConfirmedTab(activeTab);
                            saveStep4();
                            setValidationError(null);
                            setValidationMessage({
                              type: "success",
                              text: "Quarterly drawdown structure confirmed!",
                            });
                            setTimeout(() => setValidationMessage(null), 3000);
                          }}
                          className={`rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
                            confirmedTab === activeTab
                              ? "cursor-default bg-emerald-600 text-white"
                              : "bg-emerald-600 text-white hover:bg-emerald-500"
                          }`}
                          disabled={confirmedTab === activeTab}
                        >
                          {confirmedTab === activeTab ? "✓ Confirmed" : "Confirm This Option"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* S-curve */}
                  {activeTab === "scurve" && (
                    <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                      <h3 className="text-lg font-semibold text-white">
                        S-Curve (Hybrid Milestones)
                      </h3>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 p-4">
                        <input
                          type="checkbox"
                          checked={scurveData.autoCalculate}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setScurveData((p) => ({ ...p, autoCalculate: v }));
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            Auto-calculate milestone months (placeholder)
                          </p>
                          <p className="text-xs text-slate-500">
                            When enabled, milestone months may be derived from a cost S-curve in a future iteration.
                          </p>
                        </div>
                      </label>

                      <div className="overflow-x-auto rounded-lg border border-slate-700">
                        <table className="w-full min-w-[560px] text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-700 bg-slate-800/80 text-slate-400">
                              <th className="px-3 py-2 font-medium">Milestone</th>
                              <th className="px-3 py-2 font-medium">Month</th>
                              <th className="px-3 py-2 font-medium">% of total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/80 text-slate-300">
                            {scurveData.milestones.map((m, idx) => (
                              <tr key={m.id}>
                                <td className="px-3 py-2">{m.name}</td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min={0}
                                    className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-white"
                                    value={
                                      (scurveData.autoCalculate
                                        ? (scurveResolvedMilestones[idx]?.month ?? m.month)
                                        : m.month) as number
                                    }
                                    onChange={(e) => {
                                      const v = Math.max(0, Math.round(Number(e.target.value) || 0));
                                      const next = [...scurveData.milestones];
                                      next[idx] = { ...next[idx], month: v };
                                      setScurveData((p) => ({ ...p, milestones: next }));
                                    }}
                                    disabled={scurveData.autoCalculate}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-white"
                                    value={m.percentage}
                                    onChange={(e) => {
                                      const v = Number(e.target.value) || 0;
                                      const next = [...scurveData.milestones];
                                      next[idx] = { ...next[idx], percentage: v };
                                      setScurveData((p) => ({ ...p, milestones: next }));
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-slate-500">
                        Tip: ensure milestone percentages sum to 100%.
                      </p>

                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                            Milestone summary
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[360px] text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-700 text-slate-400">
                                  <th className="px-2 py-2 font-medium">Milestone</th>
                                  <th className="px-2 py-2 font-medium">Month</th>
                                  <th className="px-2 py-2 font-medium">% of total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700/80 text-slate-300">
                                {scurvePreview.milestones.map((m) => (
                                  <tr key={m.id}>
                                    <td className="px-2 py-2">{m.name}</td>
                                    <td className="px-2 py-2 font-mono">M{m.month}</td>
                                    <td className="px-2 py-2 font-mono">{Number(m.percentage).toFixed(1)}%</td>
                                  </tr>
                                ))}
                                <tr className="border-t border-slate-700/80">
                                  <td className="px-2 py-2 text-slate-400" colSpan={2}>
                                    Total
                                  </td>
                                  <td className="px-2 py-2 font-mono text-white">
                                    {scurvePreview.totalPct.toFixed(1)}%
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                            Cumulative drawdown
                          </p>
                          <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={scurveChart}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} domain={[0, 100]} />
                                <Tooltip
                                  formatter={(v: any, name) =>
                                    name === "cumulative"
                                      ? [`${Number(v).toFixed(1)}%`, "Cumulative"]
                                      : [`${Number(v).toFixed(1)}%`, "Monthly"]
                                  }
                                  labelFormatter={(l) => `M${l}`}
                                />
                                <Area type="monotone" dataKey="cumulative" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                                <Line type="monotone" dataKey="pct" stroke="#38bdf8" dot={false} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Confirm Selection Button */}
                      <div className="flex justify-end border-t border-slate-700 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            const err = validateScurve();
                            if (err) {
                              setValidationError(err);
                              setValidationMessage({ type: "error", text: err });
                              return;
                            }
                            setConfirmedTab(activeTab);
                            saveStep4();
                            setValidationError(null);
                            setValidationMessage({
                              type: "success",
                              text: "S-Curve drawdown structure confirmed!",
                            });
                            setTimeout(() => setValidationMessage(null), 3000);
                          }}
                          className={`rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
                            confirmedTab === activeTab
                              ? "cursor-default bg-emerald-600 text-white"
                              : "bg-emerald-600 text-white hover:bg-emerald-500"
                          }`}
                          disabled={confirmedTab === activeTab}
                        >
                          {confirmedTab === activeTab ? "✓ Confirmed" : "Confirm This Option"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Custom */}
                  {activeTab === "custom" && (
                    <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                      <h3 className="text-lg font-semibold text-white">Custom</h3>
                      <p className="text-xs text-slate-500">
                        Enter monthly drawdown percentages (M0..M{cashOutflows.constructionPeriod || 36}). Sum should equal 100%.
                      </p>

                      <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-4 md:grid-cols-2">
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                            Quick fill
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                              onClick={() => {
                                const len = monthMax + 1;
                                const each = 100 / len;
                                const next = Array.from({ length: len }, () => each);
                                setCustomData((p) => ({ ...p, monthlyDrawdowns: next }));
                              }}
                            >
                              Even
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                              onClick={() => {
                                const len = monthMax + 1;
                                // Linear front-load weights
                                const weights = Array.from({ length: len }, (_, i) => len - i);
                                const total = weights.reduce((a, b) => a + b, 0);
                                const next = weights.map((w) => (w / total) * 100);
                                setCustomData((p) => ({ ...p, monthlyDrawdowns: next }));
                              }}
                            >
                              Front-load
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                              onClick={() => {
                                const len = monthMax + 1;
                                const weights = Array.from({ length: len }, (_, i) => i + 1);
                                const total = weights.reduce((a, b) => a + b, 0);
                                const next = weights.map((w) => (w / total) * 100);
                                setCustomData((p) => ({ ...p, monthlyDrawdowns: next }));
                              }}
                            >
                              Back-load
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                              onClick={() => {
                                const next = Array.from({ length: monthMax + 1 }, () => 0);
                                setCustomData((p) => ({ ...p, monthlyDrawdowns: next }));
                              }}
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                            Bulk input
                          </p>
                          <textarea
                            className="h-24 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                            placeholder="Paste comma/space/newline-separated % values for M0..M36"
                            value={customData.bulkInput}
                            onChange={(e) =>
                              setCustomData((p) => ({ ...p, bulkInput: e.target.value }))
                            }
                          />
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                              onClick={() => {
                                const raw = customData.bulkInput.trim();
                                const parts = raw
                                  ? raw.split(/[\s,]+/).map((s) => Number(s.trim()))
                                  : [];
                                const next = normalizeToMonthArray(
                                  parts.filter((n) => Number.isFinite(n)),
                                  monthMax + 1
                                );
                                setCustomData((p) => ({ ...p, monthlyDrawdowns: next }));
                              }}
                            >
                              Apply
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                              onClick={() =>
                                setCustomData((p) => ({ ...p, bulkInput: "" }))
                              }
                            >
                              Clear input
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {customMonthly.map((v, i) => (
                          <label key={i} className="flex items-center justify-between gap-2 rounded border border-slate-700 bg-slate-900/40 px-3 py-2">
                            <span className="text-xs text-slate-400 font-mono">M{i}</span>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-white"
                              value={v}
                              onChange={(e) => {
                                const n = Number(e.target.value) || 0;
                                const next = [...customMonthly];
                                next[i] = n;
                                setCustomData((p) => ({ ...p, monthlyDrawdowns: next }));
                              }}
                            />
                            <span className="text-xs text-slate-500">%</span>
                          </label>
                        ))}
                      </div>
                      <div className="text-xs text-slate-400">
                        Total:{" "}
                        <span className="font-mono text-white">
                          {sumPct(customMonthly).toFixed(1)}%
                        </span>
                      </div>

                      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                          Cumulative drawdown
                        </p>
                        <div className="h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={customChart}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                              <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} domain={[0, 100]} />
                              <Tooltip
                                formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                                labelFormatter={(l) => `M${l}`}
                              />
                              <Line type="monotone" dataKey="cumulative" stroke="#10b981" dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Confirm Selection Button */}
                      <div className="flex justify-end border-t border-slate-700 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            const err = validateCustom();
                            if (err) {
                              setValidationError(err);
                              setValidationMessage({ type: "error", text: err });
                              return;
                            }
                            setConfirmedTab(activeTab);
                            saveStep4();
                            setValidationError(null);
                            setValidationMessage({
                              type: "success",
                              text: "Custom drawdown structure confirmed!",
                            });
                            setTimeout(() => setValidationMessage(null), 3000);
                          }}
                          className={`rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
                            confirmedTab === activeTab
                              ? "cursor-default bg-emerald-600 text-white"
                              : "bg-emerald-600 text-white hover:bg-emerald-500"
                          }`}
                          disabled={confirmedTab === activeTab}
                        >
                          {confirmedTab === activeTab ? "✓ Confirmed" : "Confirm This Option"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Land as Equity */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-2">🏗️ Land as Equity</h2>
                    <p className="text-sm text-slate-400">
                      Configure land as equity contribution to the development financing.
                    </p>
                  </div>

                  {/* Land Cost Display */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Land Cost (Component 1):</span>
                      <span className="text-white font-medium">{formatCurrency(cashOutflows.landCost || 0)}</span>
                    </div>
                  </div>

                  {/* Land as Equity Election */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-4">
                      Use Land Value as Equity
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(financing.landEquityPercent ?? 40) >= 100}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            updateFinancing(
                              {
                                landEquityPercent: isChecked ? 100 : 0,
                                landAsEquity: isChecked,
                              },
                              finStream
                            );
                          }}
                          className="mt-1 w-4 h-4 text-emerald-500 bg-slate-900 border-slate-600 rounded"
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            Treat land as 100% equity
                          </p>
                          <p className="text-xs text-slate-400">
                            Land value counts as equity (skin-in-the-game) instead of being
                            refinanced into the main facility.
                          </p>
                        </div>
                      </label>

                      {(() => {
                        const isOn = (financing.landEquityPercent ?? 40) >= 100;
                        const landCost = cashOutflows.landCost || 0;
                        const equityReq = Math.max(0, equityRequired);
                        const coveragePct =
                          equityReq > 0 ? Math.min(100, (landCost / equityReq) * 100) : 0;

                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-slate-900/50 rounded-lg p-3">
                                <p className="text-xs text-slate-400">
                                  Equity Requirement (TDC − Senior Debt)
                                </p>
                                <p className="text-lg font-semibold text-white">
                                  {formatCurrency(equityReq)}
                                </p>
                              </div>
                              <div className="bg-slate-900/50 rounded-lg p-3">
                                <p className="text-xs text-slate-400">
                                  Land Equity Coverage
                                </p>
                                <p className="text-lg font-semibold text-white">
                                  {isOn ? `${coveragePct.toFixed(0)}%` : "—"}
                                </p>
                              </div>
                            </div>

                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-emerald-500 h-2 rounded-full transition-all"
                                style={{ width: `${isOn ? coveragePct : 0}%` }}
                              />
                            </div>

                            {isOn ? (
                              <p className="text-xs text-slate-400">
                                ✓ Land value is counted as equity. This can reduce the cash equity
                                injection required during construction.
                              </p>
                            ) : (
                              <p className="text-xs text-slate-500">
                                Land will be refinanced into the main facility (subject to LTC/LTV).
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {(() => {
                    const landCostStep = cashOutflows.landCost || 0;
                    const equityReqStep = Math.max(0, equityRequired);
                    const landEquityOnStep =
                      (financing.landEquityPercent ?? 40) >= 100;
                    const landTowardEquity = landEquityOnStep
                      ? Math.min(landCostStep, equityReqStep)
                      : 0;
                    const cashEquityNeeded = Math.max(
                      0,
                      equityReqStep - landTowardEquity
                    );

                    return (
                      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                        <h3 className="mb-3 text-lg font-medium text-white">
                          Equity sources breakdown
                        </h3>
                        <p className="mb-4 text-xs text-slate-400">
                          Total equity requirement (TDC − senior debt) and how much
                          is met from land vs cash, based on your land-as-equity
                          toggle above.
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between border-b border-slate-700/80 pb-2">
                            <span className="text-slate-400">
                              Total equity requirement
                            </span>
                            <span className="font-medium text-white">
                              {formatCurrency(equityReqStep)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-700/80 pb-2">
                            <span className="text-slate-400">
                              Land (counted as equity)
                            </span>
                            <span className="font-medium text-emerald-400">
                              {formatCurrency(landTowardEquity)}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1">
                            <span className="text-slate-400">
                              Cash equity (residual)
                            </span>
                            <span className="font-medium text-amber-300">
                              {formatCurrency(cashEquityNeeded)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Step 5: Interest rate + IDC */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <h2 className="mb-2 text-xl font-semibold text-white">
                      {formData.debtType === "islamic" ? "Profit" : "Interest"}{" "}
                      Rate
                    </h2>
                    <p className="text-sm text-slate-400">
                      Define whether pricing is fixed or floating. For Islamic
                      facilities, this represents the profit rate applied to the
                      Murabaha / Ijara / Sukuk structure.
                    </p>
                  </div>

                  <div className="max-w-3xl space-y-4">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-4">
                        <button
                          type="button"
                          onClick={() => updateFormDataStep5Pricing("rateType", "fixed")}
                          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                            formData.rateType === "fixed"
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                              : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          Fixed{" "}
                          {formData.debtType === "islamic" ? "profit" : "rate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFormDataStep5Pricing("rateType", "floating")}
                          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                            formData.rateType === "floating"
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                              : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          Floating (
                          {formData.debtType === "islamic"
                            ? "benchmark + spread"
                            : "base + margin"}
                          )
                        </button>
                      </div>

                      {formData.rateType === "fixed" && (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            {formData.debtType === "islamic"
                              ? "Profit Rate (% p.a.)"
                              : "Interest Rate (% p.a.)"}
                          </label>
                          <input
                            type="number"
                            value={formData.fixedOrProfitRatePercent}
                            onChange={(e) =>
                              updateFormDataStep5Pricing(
                                "fixedOrProfitRatePercent",
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          {fieldError("fixedOrProfitRatePercent") && (
                            <p className="mt-1 text-sm text-red-400">
                              {fieldError("fixedOrProfitRatePercent")}
                            </p>
                          )}
                        </div>
                      )}

                      {formData.rateType === "floating" && (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">
                              Auto base rate (project currency)
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white">
                              {benchmarkEntry.name}{" "}
                              <span className="text-slate-400">
                                ({projectInfo.currency || "AED"})
                              </span>
                            </p>
                            <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-slate-300 sm:grid-cols-2">
                              <p>
                                <span className="text-slate-500">Tenor:</span>{" "}
                                {benchmarkEntry.tenor}
                              </p>
                              <p>
                                <span className="text-slate-500">Source:</span>{" "}
                                {benchmarkEntry.source}
                              </p>
                              <p className="sm:col-span-2">
                                <span className="text-slate-500">
                                  Benchmark:
                                </span>{" "}
                                <span className="font-semibold text-emerald-400">
                                  {benchmarkEntry.rate.toFixed(2)}% p.a.
                                </span>
                              </p>
                            </div>
                            <p className="mt-3 text-xs text-slate-500">
                              Base name and benchmark % sync when you choose
                              floating or when project currency / debt type
                              changes. You can still edit the fields below.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-300">
                                Base Rate Name
                              </label>
                              <input
                                type="text"
                                value={formData.baseRateName}
                                onChange={(e) =>
                                  updateFormDataStep5Pricing("baseRateName", e.target.value)
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                              {fieldError("baseRateName") && (
                                <p className="mt-1 text-sm text-red-400">
                                  {fieldError("baseRateName")}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-300">
                                Base Rate (% p.a.)
                              </label>
                              <input
                                type="number"
                                value={formData.baseRatePercent}
                                onChange={(e) =>
                                  updateFormDataStep5Pricing(
                                    "baseRatePercent",
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                              {fieldError("baseRatePercent") && (
                                <p className="mt-1 text-sm text-red-400">
                                  {fieldError("baseRatePercent")}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-300">
                                Margin (% p.a.)
                              </label>
                              <input
                                type="number"
                                value={formData.marginPercent}
                                onChange={(e) =>
                                  updateFormDataStep5Pricing(
                                    "marginPercent",
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                              {fieldError("marginPercent") && (
                                <p className="mt-1 text-sm text-red-400">
                                  {fieldError("marginPercent")}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-slate-400">
                            All-in{" "}
                            {formData.debtType === "islamic"
                              ? "profit"
                              : "interest"}{" "}
                            (illustrative):{" "}
                            <span className="font-semibold text-emerald-400">
                              {(
                                formData.baseRatePercent +
                                formData.marginPercent
                              ).toFixed(2)}
                              % p.a.
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-8">
                  <div className="mb-6">
                    <h2 className="mb-2 text-xl font-semibold text-white">
                      Interest / Profit During Construction (IDC)
                    </h2>
                    <p className="text-sm text-slate-400">
                      Choose whether IDC is capitalized into the loan balance,
                      paid current from equity, or split between the two.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => syncIdcTreatment("capitalized")}
                          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                            formData.idcTreatment === "capitalized"
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                              : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          Fully Capitalized
                        </button>
                        <button
                          type="button"
                          onClick={() => syncIdcTreatment("current")}
                          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                            formData.idcTreatment === "current"
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                              : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          Paid Current
                        </button>
                        <button
                          type="button"
                          onClick={() => syncIdcTreatment("hybrid")}
                          className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                            formData.idcTreatment === "hybrid"
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                              : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          Hybrid
                        </button>
                      </div>
                      {formData.idcTreatment === "hybrid" && (
                        <div className="max-w-sm">
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Capitalized Portion of IDC (%)
                          </label>
                          <input
                            type="number"
                            value={formData.idcCapitalizedSharePercent}
                            onChange={(e) =>
                              syncIdcCapitalizedSharePercent(
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          {fieldError("idcCapitalizedSharePercent") && (
                            <p className="mt-1 text-sm text-red-400">
                              {fieldError("idcCapitalizedSharePercent")}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-slate-500">
                        Capitalized IDC increases the loan balance at completion;
                        paid current IDC is funded from equity during
                        construction.
                      </p>

                      {/* IDC summary metrics */}
                      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                        <h3 className="mb-3 text-sm font-semibold text-white">
                          Illustrative IDC mechanics
                        </h3>
                        <dl className="space-y-2 text-sm">
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">Construction (months)</dt>
                            <dd className="text-white">
                              {constructionPeriodMonthsIdc}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">Avg. drawn balance</dt>
                            <dd className="text-white">
                              {formatProjectCurrency(averageDebtDrawdown)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">Total IDC (est.)</dt>
                            <dd className="text-white">
                              {formatProjectCurrency(totalIDC)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">IDC capitalized</dt>
                            <dd className="text-emerald-400">
                              {formatProjectCurrency(idcAmountCapitalized)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2 border-t border-slate-700 pt-2">
                            <dt className="font-medium text-slate-300">
                              Loan at completion
                            </dt>
                            <dd className="font-semibold text-white">
                              {formatProjectCurrency(loanAtCompletion)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-400">
                              Monthly IDC cash (during construction)
                            </dt>
                            <dd className="text-amber-300">
                              {formatProjectCurrency(monthlyIDCPaymentCash)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Comparison: with vs without IDC in balance */}
                      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/40">
                        <table className="w-full min-w-[320px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-700">
                              <th className="px-3 py-2 font-medium text-slate-400">
                                Metric
                              </th>
                              <th className="px-3 py-2 font-medium text-slate-300">
                                Approved debt only
                              </th>
                              <th className="px-3 py-2 font-medium text-emerald-400">
                                With IDC treatment
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/80">
                            <tr>
                              <td className="px-3 py-2 text-slate-400">
                                Loan balance
                              </td>
                              <td className="px-3 py-2 text-white">
                                {formatProjectCurrency(approvedDebtAmount)}
                              </td>
                              <td className="px-3 py-2 text-white">
                                {formatProjectCurrency(loanAtCompletion)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-slate-400">
                                Monthly P&amp;I (mortgage-style)
                              </td>
                              <td className="px-3 py-2 text-white">
                                {formatProjectCurrency(
                                  monthlyDebtServiceApprovedOnly
                                )}
                              </td>
                              <td className="px-3 py-2 text-emerald-400">
                                {formatProjectCurrency(
                                  monthlyDebtServiceWithIDC
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-slate-400">
                                Binding constraint
                              </td>
                              <td
                                className={`px-3 py-2 ${
                                  bindingConstraint === "LTC"
                                    ? "text-emerald-400"
                                    : "text-amber-400"
                                }`}
                              >
                                {bindingConstraint}
                              </td>
                              <td
                                className={`px-3 py-2 ${
                                  bindingConstraint === "LTC"
                                    ? "text-emerald-400"
                                    : "text-amber-400"
                                }`}
                              >
                                {bindingConstraint}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-white">
                          DSCR projection (post-stabilization, operations period)
                        </h3>
                        <p className="mb-3 text-xs text-slate-500">
                          NOI = 6% of GDV in Y1, then 3% annual growth. Debt
                          service uses monthly P&amp;I on loan at completion (
                          {formatProjectCurrency(loanAtCompletion)}).
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-slate-700">
                          <table className="w-full min-w-[480px] text-left text-sm">
                            <thead>
                              <tr className="border-b border-slate-700 bg-slate-800/50">
                                <th className="px-3 py-2 font-medium text-slate-400">
                                  Month
                                </th>
                                <th className="px-3 py-2 font-medium text-slate-400">
                                  NOI
                                </th>
                                <th className="px-3 py-2 font-medium text-slate-400">
                                  Annual debt service
                                </th>
                                <th className="px-3 py-2 font-medium text-slate-400">
                                  DSCR
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/80">
                              {dscrDataStep5.map((row, idx) => (
                                <tr key={row.year}>
                                  <td className="px-3 py-2 text-white">
                                    {finStream === "operational" &&
                                    dscrOpYearEndMonths[idx] != null
                                      ? `M${dscrOpYearEndMonths[idx]}`
                                      : row.year}
                                  </td>
                                  <td className="px-3 py-2 text-slate-300">
                                    {formatProjectCurrency(row.noi)}
                                  </td>
                                  <td className="px-3 py-2 text-slate-300">
                                    {formatProjectCurrency(row.debtService)}
                                  </td>
                                  <td
                                    className={`px-3 py-2 font-medium ${
                                      row.dscr >= 1.25
                                        ? "text-emerald-400"
                                        : "text-red-400"
                                    }`}
                                  >
                                    {row.dscr.toFixed(2)}x
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded border border-slate-700 bg-slate-800/30 p-2">
                            <p className="text-slate-500">Min</p>
                            <p className="font-semibold text-white">
                              {minDSCRStep5.toFixed(2)}x
                            </p>
                          </div>
                          <div className="rounded border border-slate-700 bg-slate-800/30 p-2">
                            <p className="text-slate-500">Avg</p>
                            <p className="font-semibold text-white">
                              {avgDSCRStep5.toFixed(2)}x
                            </p>
                          </div>
                          <div className="rounded border border-slate-700 bg-slate-800/30 p-2">
                            <p className="text-slate-500">Max</p>
                            <p className="font-semibold text-white">
                              {maxDSCRStep5.toFixed(2)}x
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              )}

              {/* Step 6 removed (Repayment Structure) for Sale Development stream */}

              {/* Step 6: Loan Repayment Terms */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <h2 className="mb-2 text-xl font-semibold text-white">
                      Loan Repayment Terms
                    </h2>
                    <p className="text-sm text-slate-400">
                      Define post-construction repayment profile, grace period,
                      and prepayment terms.
                    </p>
                  </div>

                  {step6ValidationError && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                      {step6ValidationError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* 1) Loan Type */}
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                      <h3 className="mb-3 text-lg font-semibold text-white">
                        Loan type
                      </h3>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {(
                          [
                            {
                              id: "equal-payment",
                              label: "Equal P+I Payment (Annuity)",
                            },
                            {
                              id: "equal-principal",
                              label: "Equal Principal Amortization",
                            },
                            {
                              id: "bullet",
                              label: "Bullet Payment (Interest-Only)",
                            },
                            { id: "custom", label: "Custom Schedule" },
                          ] as const
                        ).map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() =>
                              setLoanRepaymentData((p) => {
                                const next = { ...p, loanType: o.id };
                                queueMicrotask(() => {
                                  updateFinancing({ loanType: o.id });
                                });
                                return next;
                              })
                            }
                            className={`rounded-lg border p-4 text-left text-sm transition-colors ${
                              normalizeSeniorLoanType(loanRepaymentData.loanType) ===
                              o.id
                                ? "border-emerald-500 bg-emerald-500/15 text-white"
                                : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-600"
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        Used for the amortization preview below (illustrative).
                      </p>
                    </div>

                    {/* 2) Loan tenor structure (auto construction + fixed 6M pre-op) */}
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                      <h3 className="mb-3 text-lg font-semibold text-white">
                        Loan tenor structure
                      </h3>
                      <p className="mb-3 text-xs text-slate-500">
                        Construction and pre-op set when operations begin. Interest-only
                        grace on the senior loan is only the years you choose below
                        (first N operating / spreadsheet Y4+ years before principal).
                        Amortization is fixed at 10 years to match Component 2. IDC
                        treatment mirrors Step 5.
                      </p>

                      {(() => {
                        const cp = Math.max(0, cashOutflows.constructionPeriod || 0);
                        const preOp = PRE_OPERATION_BUFFER_MONTHS;
                        const monthsToOperationsStart = calculateOperationsStartMonth(cp);
                        // Operational stream: Component 2 hotel operations are 10 years,
                        // so we lock amortization to 10Y (120 months) for consistency.
                        const amortYears = 10;
                        const totalTenorMonths = monthsToOperationsStart + amortYears * 12;
                        const idcLabel =
                          formData.idcTreatment === "capitalized"
                            ? "Capitalized"
                            : formData.idcTreatment === "current"
                              ? "Paid current"
                              : `Hybrid (${formData.idcCapitalizedSharePercent}% cap.)`;

                        return (
                          <>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                  Construction period (auto)
                                </label>
                                <div className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white">
                                  {cp} months
                                </div>
                              </div>
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                  Pre-Op buffer (fixed)
                                </label>
                                <div
                                  className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white"
                                  title="Training, commissioning, and staff hiring buffer between construction completion and operations start."
                                >
                                  {preOp} months
                                </div>
                              </div>
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                  Interest-only grace (operating years)
                                  <span className="block text-[10px] font-normal text-slate-500">
                                    First N spreadsheet Y4–Y13 years before principal (0–5).
                                    Not construction or pre-op.
                                  </span>
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={5}
                                  className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white"
                                  value={Math.max(
                                    0,
                                    Math.min(
                                      5,
                                      Math.round(Number(loanRepaymentData.gracePeriodYears) || 0)
                                    )
                                  )}
                                  onChange={(e) => {
                                    const v = Math.max(
                                      0,
                                      Math.min(5, Math.round(Number(e.target.value) || 0))
                                    );
                                    setLoanRepaymentData((p) => ({
                                      ...p,
                                      gracePeriodYears: v,
                                    }));
                                    queueMicrotask(() =>
                                      updateFinancing({ gracePeriodYears: v })
                                    );
                                  }}
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                  Amortization Period
                                  <span className="block text-[10px] text-slate-500">
                                    Matches hotel operations period (Component 2)
                                  </span>
                                </label>
                                <div className="space-y-1">
                                  <div
                                    className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white flex items-center justify-between"
                                    title="Operational amortization matches Component 2 hotel operations (10-year operating period)."
                                  >
                                    <span>10 Years (120 months)</span>
                                    <span className="text-xs text-slate-500">Fixed</span>
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    User can refinance or sell early in Step 7 (Exit Strategy).
                                  </p>
                                </div>
                              </div>
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                  Total loan tenor (display)
                                </label>
                                <div className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white">
                                  {totalTenorMonths} months (≈{" "}
                                  {(totalTenorMonths / 12).toFixed(1)} years)
                                </div>
                              </div>
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                  IDC treatment (from Step 5)
                                </label>
                                <div className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white">
                                  {idcLabel}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 rounded-lg bg-slate-900/50 p-4">
                              <p className="mb-3 text-xs text-slate-400">
                                Timeline (for tenor)
                              </p>
                              <div className="relative flex h-12 overflow-hidden rounded-lg bg-slate-800">
                                <div
                                  className="flex h-full items-center justify-center border-r border-slate-700 bg-blue-500/30"
                                  style={{ width: "28%" }}
                                >
                                  <span className="whitespace-nowrap px-1 text-[10px] text-blue-400">
                                    Construction
                                  </span>
                                </div>
                                <div
                                  className="flex h-full items-center justify-center border-r border-slate-700 bg-amber-500/30"
                                  style={{ width: "12%" }}
                                >
                                  <span className="whitespace-nowrap px-1 text-[10px] text-amber-400">
                                    Pre-Op
                                  </span>
                                </div>
                                <div
                                  className="flex h-full items-center justify-center bg-emerald-500/30"
                                  style={{ width: "60%" }}
                                >
                                  <span className="whitespace-nowrap px-1 text-[10px] text-emerald-400">
                                    Amortization
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 flex justify-between px-1 text-[10px] text-slate-500">
                                <span>M0</span>
                                <span>M{cp}</span>
                                <span>M{monthsToOperationsStart - 1}</span>
                                <span>M{totalTenorMonths - 1}</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* 3) Prepayment Terms */}
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                      <h3 className="mb-3 text-lg font-semibold text-white">
                        Prepayment terms
                      </h3>
                      <p className="mb-4 rounded-lg border border-slate-700/80 bg-slate-900/40 p-3 text-xs text-slate-400">
                        These fields document how voluntary prepayment would be priced:
                        lockout blocks early payoff for a set period; the step-down schedule
                        is the contractual penalty curve (often % of prepaid principal) by
                        year through Y8; yield maintenance is an alternative economic make-whole
                        when checked. All are informational here and do not yet change modeled
                        cashflows.
                      </p>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Lockout (years)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white"
                        value={loanRepaymentData.prepaymentLockoutYears}
                        onChange={(e) => {
                          const lock = Math.max(0, Math.min(10, Math.round(Number(e.target.value) || 0)));
                          setLoanRepaymentData((p) => ({
                            ...p,
                            prepaymentLockoutYears: lock,
                          }));
                          queueMicrotask(() => {
                            updateFinancing({ prepaymentLockoutYears: lock });
                          });
                        }}
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Lockout is informational in this version (no cashflow impact yet).
                      </p>

                      <div className="mt-5">
                        <p className="mb-1 text-sm font-medium text-slate-300">
                          Prepayment penalty step-down (%)
                        </p>
                        <p className="mb-3 text-xs text-slate-500">
                          Contractual penalty rates by operating year (Y4–Y8). Values are
                          non-negative percentages (illustrative; Y9+ typically follows the
                          Y8 rate in facility terms).
                        </p>
                        <div className="grid grid-cols-5 gap-2">
                          {[0, 1, 2, 3, 4].map((i) => {
                            const pen = loanRepaymentData.prepaymentPenalty ?? [5, 4, 3, 2, 1];
                            const padded = [...pen];
                            while (padded.length < 5) padded.push(0);
                            return (
                              <div key={i}>
                                <label className="mb-1 block text-[10px] font-medium text-slate-500">
                                  Y{4 + i}
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white"
                                  value={padded[i] ?? 0}
                                  onChange={(e) => {
                                    const v = Math.max(0, parseFloat(e.target.value) || 0);
                                    const base = [
                                      ...(loanRepaymentData.prepaymentPenalty ?? [5, 4, 3, 2, 1]),
                                    ];
                                    while (base.length < 5) base.push(0);
                                    base[i] = v;
                                    const nextPenalty = base.slice(0, 5);
                                    setLoanRepaymentData((p) => ({
                                      ...p,
                                      prepaymentPenalty: nextPenalty,
                                    }));
                                    queueMicrotask(() => {
                                      updateFinancing({ prepaymentPenalty: nextPenalty });
                                    });
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 p-4">
                        <input
                          type="checkbox"
                          checked={loanRepaymentData.yieldMaintenance}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setLoanRepaymentData((p) => ({
                              ...p,
                              yieldMaintenance: checked,
                            }));
                            queueMicrotask(() => {
                              updateFinancing({ yieldMaintenance: checked });
                            });
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            Yield maintenance (toggle)
                          </p>
                          <p className="text-xs text-slate-500">
                            Illustrative flag only. Penalty schedule remains the
                            primary input here.
                          </p>
                        </div>
                      </label>
                    </div>

                    {normalizeSeniorLoanType(loanRepaymentData.loanType) ===
                      "custom" && (
                      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                        <h3 className="mb-3 text-lg font-semibold text-white">
                          Custom schedule (% of principal)
                        </h3>
                        <p className="mb-4 text-xs text-slate-500">
                          Enter the share of loan principal repaid at each financial year-end
                          (FYE). For the operational stream, FYEs align to operating year-end
                          months (M…), matching the Loan Preview table and Component 3.
                          Percentages must sum to 100% (±0.1%). Principal amounts update
                          from loan at completion × (% ÷ 100). Interest is on the opening
                          balance each year (illustrative).
                        </p>
                        <div
                          className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
                            customPercentagesValid
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                              : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                          }`}
                        >
                          Total:{" "}
                          <span className="font-mono font-semibold">
                            {customPercentagesTotal.toFixed(2)}%
                          </span>
                          {!customPercentagesValid && (
                            <span className="ml-2">
                              — must equal 100% (±0.1%)
                            </span>
                          )}
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-slate-700">
                          <table className="w-full min-w-[640px] text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-700 bg-slate-800/50 text-slate-400">
                                <th className="px-3 py-2 font-medium">FYE</th>
                                <th className="px-3 py-2 font-medium">% of principal</th>
                                <th className="px-3 py-2 font-medium">
                                  Principal (derived)
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/80">
                              {Array.from({ length: 10 }, (_, i) => 4 + i).map(
                                (y, i) => (
                                  <tr key={y}>
                                    <td className="px-3 py-2 font-mono text-white">
                                      {finStream === "operational"
                                        ? `M${dscrOpYearEndMonths[i] ?? 0}`
                                        : `Y${y}`}
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        className="w-full max-w-[120px] rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                                        value={customPercentages[i] ?? 0}
                                        onChange={(e) => {
                                          const raw = parseFloat(e.target.value);
                                          const nextPct = Number.isFinite(raw)
                                            ? Math.max(0, raw)
                                            : 0;
                                          setCustomPercentages((prev) => {
                                            const next = [...prev];
                                            next[i] = nextPct;
                                            return next;
                                          });
                                        }}
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-slate-300">
                                      {formatProjectCurrency(
                                        principalFromCustomPercentages[i] ?? 0
                                      )}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* 4) Loan Preview */}
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                      <h3 className="mb-3 text-lg font-semibold text-white">
                        Loan Preview
                      </h3>
                      <p className="mb-3 text-xs text-slate-500">
                        Ten FYE rows (hotel operating years 1–10, spreadsheet Y4–Y13). Interest-only
                        years are only those set in Interest-only grace above—not construction or pre-op.
                      </p>
                      <div className="mb-3 flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500/30" />
                          Grace (interest-only; principal = 0)
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-700/60" />
                          Amortization (principal + interest)
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-slate-700">
                        <table className="w-full min-w-[560px] text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-700 bg-slate-800/50 text-slate-400">
                              <th className="px-3 py-2 font-medium">FYE</th>
                              <th className="px-3 py-2 font-medium">Start bal.</th>
                              <th className="px-3 py-2 font-medium">Interest</th>
                              <th className="px-3 py-2 font-medium">Principal</th>
                              <th className="px-3 py-2 font-medium">Debt service</th>
                              <th className="px-3 py-2 font-medium">End bal.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/80">
                            {finStream === "operational"
                              ? loanPreviewRows.map((row) => (
                                  <tr
                                    key={`fye-${row.fyeMonth}`}
                                    className={row.isGrace ? "bg-amber-500/10" : undefined}
                                  >
                                    <td className="px-3 py-2 text-white font-mono">
                                      M{row.fyeMonth}
                                    </td>
                                    <td className="px-3 py-2 text-slate-300">
                                      {formatProjectCurrency(row.startBal)}
                                    </td>
                                    <td className="px-3 py-2 text-slate-300">
                                      {formatProjectCurrency(row.interest)}
                                    </td>
                                    <td className="px-3 py-2 text-slate-300">
                                      {formatProjectCurrency(row.principal)}
                                    </td>
                                    <td className="px-3 py-2 font-medium text-emerald-300">
                                      {formatProjectCurrency(row.debtService)}
                                    </td>
                                    <td className="px-3 py-2 text-slate-300">
                                      {formatProjectCurrency(row.endBal)}
                                    </td>
                                  </tr>
                                ))
                              : loanRepaymentScheduleY4Y13.map((row) => (
                                  <tr key={row.spreadsheetYear}>
                                    <td className="px-3 py-2 text-white">
                                      Y{row.spreadsheetYear}
                                    </td>
                                    <td className="px-3 py-2 text-slate-300">
                                      {formatProjectCurrency(row.startBal)}
                                    </td>
                                    <td className="px-3 py-2 text-slate-300">
                                      {formatProjectCurrency(row.interest)}
                                    </td>
                                    <td className="px-3 py-2 text-slate-300">
                                      {formatProjectCurrency(row.principal)}
                                    </td>
                                    <td className="px-3 py-2 font-medium text-emerald-300">
                                      {formatProjectCurrency(row.debtService)}
                                    </td>
                                    <td className="px-3 py-2 text-slate-300">
                                      {formatProjectCurrency(row.endBal)}
                                    </td>
                                  </tr>
                                ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 7 of 7: Debt Covenants & Exit Strategy (final step) */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <h2 className="mb-2 text-xl font-semibold text-white">
                      Debt Covenants &amp; Exit Strategy
                    </h2>
                    <p className="text-sm text-slate-400">
                      Set covenant thresholds and your planned exit, then review
                      illustrative debt service vs. NOI on the operating timeline
                      (Y4–Y13). Confirm when ready to open the financing preview.
                    </p>
                  </div>

                  {step7ValidationMessage && (
                    <div
                      className={`rounded-lg border px-4 py-3 text-sm ${
                        step7ValidationMessage.type === "success"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          : "border-red-500/40 bg-red-500/10 text-red-200"
                      }`}
                    >
                      {step7ValidationMessage.text}
                    </div>
                  )}
                  {step7ValidationError && !step7ValidationMessage && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                      {step7ValidationError}
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                    <h3 className="mb-2 text-lg font-semibold text-white">
                      1) Debt covenants
                    </h3>
                    <p className="mb-4 text-xs text-slate-500">
                      Typical senior tests (illustrative). Values persist to your
                      financing profile.
                    </p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Minimum DSCR (×)
                        </label>
                        <input
                          type="number"
                          min={1.2}
                          max={2}
                          step={0.05}
                          className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white"
                          value={debtCovenantsData.dscrTarget}
                          onChange={(e) => {
                            const v = Math.min(2, Math.max(1.2, parseFloat(e.target.value) || 1.4));
                            setStep7Confirmed(false);
                            setDebtCovenantsData((d) => ({ ...d, dscrTarget: v }));
                            queueMicrotask(() => updateFinancing({ dscrTarget: v }));
                          }}
                        />
                        <p className="mt-1 text-xs text-slate-500">Range 1.2×–2.0×</p>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          DSCR test frequency
                        </label>
                        <select
                          className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white"
                          value={debtCovenantsData.dscrFrequency}
                          onChange={(e) => {
                            const f = e.target.value as "annual" | "semi-annual" | "quarterly";
                            setStep7Confirmed(false);
                            setDebtCovenantsData((d) => ({ ...d, dscrFrequency: f }));
                            queueMicrotask(() => updateFinancing({ dscrFrequency: f }));
                          }}
                        >
                          <option value="annual">Annual</option>
                          <option value="semi-annual">Semi-annual</option>
                          <option value="quarterly">Quarterly</option>
                        </select>
                      </div>
                      {/* Equity cure checkbox hidden for now (keep store logic for future) */}
                      {/* <div className="md:col-span-2">
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 p-4">
                          <input
                            type="checkbox"
                            checked={debtCovenantsData.cureProvisions}
                            onChange={(e) => {
                              const c = e.target.checked;
                              setStep7Confirmed(false);
                              setDebtCovenantsData((d) => ({ ...d, cureProvisions: c }));
                              queueMicrotask(() => updateFinancing({ cureProvisions: c }));
                            }}
                            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-white">Equity cure permitted</p>
                            <p className="text-xs text-slate-500">
                              Lenders may allow an equity injection to cure a DSCR or LTV breach for a limited period.
                            </p>
                          </div>
                        </label>
                      </div> */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Max LTV covenant (%)
                        </label>
                        <input
                          type="number"
                          min={40}
                          max={85}
                          className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white"
                          value={debtCovenantsData.maxLtvRatio}
                          onChange={(e) => {
                            const v = Math.min(85, Math.max(40, Math.round(parseFloat(e.target.value) || 70)));
                            setStep7Confirmed(false);
                            setDebtCovenantsData((d) => ({ ...d, maxLtvRatio: v }));
                            queueMicrotask(() => updateFinancing({ maxLtvRatio: v }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Minimum debt yield (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={25}
                          step={0.1}
                          className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white"
                          value={debtCovenantsData.minDebtYield}
                          onChange={(e) => {
                            const v = Math.min(25, Math.max(0, parseFloat(e.target.value) || 0));
                            setStep7Confirmed(false);
                            setDebtCovenantsData((d) => ({ ...d, minDebtYield: v }));
                            queueMicrotask(() => updateFinancing({ minDebtYield: v }));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                    <h3 className="mb-2 text-lg font-semibold text-white">
                      2) Exit strategy
                    </h3>
                    <p className="mb-4 text-xs text-slate-500">
                      Planned resolution on the Y4–Y13 operating horizon (labels match
                      prior steps).
                    </p>
                    {finStream === "operational" ? (
                      <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                        {(() => {
                          const cp = Math.max(0, cashOutflows.constructionPeriod || 0);
                          const opsStart = calculateOperationsStartMonth(cp);
                          const preOpStart = cp + 1;
                          const preOpEnd = opsStart - 1;
                          const oy = Math.min(10, Math.max(1, exitStrategyData.exitYear - 3));
                          const { endMonth: exitMonth } = getOperationalYearMonthRange(oy, cp);
                          const { endMonth: totalEnd } = getOperationalYearMonthRange(
                            OPERATIONAL_PERIOD_YEARS,
                            cp
                          );
                          const pctAt = (m: number) =>
                            `${Math.max(
                              0,
                              Math.min(100, (m / Math.max(1, totalEnd)) * 100)
                            )}%`;
                          return (
                            <>
                              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                                Timeline (Construction | Pre-Op | Operations | Exit)
                              </p>
                              <div className="relative h-10 overflow-hidden rounded-lg bg-slate-800">
                                <div
                                  className="absolute inset-y-0 left-0 bg-slate-500/30"
                                  style={{ width: pctAt(cp) }}
                                />
                                <div
                                  className="absolute inset-y-0 bg-amber-500/25"
                                  style={{
                                    left: pctAt(preOpStart),
                                    width: `calc(${pctAt(preOpEnd + 1)} - ${pctAt(
                                      preOpStart
                                    )})`,
                                  }}
                                />
                                <div
                                  className="absolute inset-y-0 bg-emerald-500/15"
                                  style={{ left: pctAt(opsStart), right: 0 }}
                                />
                                <div
                                  className="absolute inset-y-0 w-[2px] bg-emerald-300"
                                  style={{ left: pctAt(exitMonth) }}
                                  title={`Exit at M${exitMonth}`}
                                />
                              </div>
                              <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                                <span>M0</span>
                                <span>M{cp}</span>
                                <span>M{preOpEnd}</span>
                                <span>M{exitMonth}</span>
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                Remaining senior balance at exit:{" "}
                                <span className="font-mono text-slate-200">
                                  {formatProjectCurrency(remainingBalanceAtExitYear.endBal)}
                                </span>
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    ) : null}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Strategy
                        </label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {(
                            [
                              { id: "hold" as const, label: "Hold" },
                              { id: "refinance" as const, label: "Refinance" },
                              { id: "sale" as const, label: "Sale" },
                            ] as const
                          ).map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => {
                                setStep7Confirmed(false);
                                setExitStrategyData((x) => ({ ...x, exitStrategy: o.id }));
                                queueMicrotask(() => updateFinancing({ exitStrategy: o.id }));
                              }}
                              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                                exitStrategyData.exitStrategy === o.id
                                  ? "border-emerald-500 bg-emerald-500/15 text-white"
                                  : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-600"
                              }`}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Exit / refi timing
                        </label>
                        <select
                          className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white"
                          value={exitStrategyData.exitYear}
                          onChange={(e) => {
                            const y = Math.min(13, Math.max(4, Math.round(Number(e.target.value) || 10)));
                            setStep7Confirmed(false);
                            setExitStrategyData((x) => ({ ...x, exitYear: y }));
                            queueMicrotask(() => updateFinancing({ exitYear: y }));
                          }}
                        >
                          {Array.from({ length: 10 }, (_, i) => 4 + i).map((y, i) => {
                            const m = dscrOpYearEndMonths[i];
                            return (
                              <option key={y} value={y}>
                                {m != null ? `M${m}` : `Y${y}`}
                              </option>
                            );
                          })}
                        </select>
                        {finStream === "operational" ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Selected:{" "}
                            <span className="font-mono text-slate-300">
                              Y{exitStrategyData.exitYear}
                            </span>{" "}
                            (Operating year {Math.max(1, exitStrategyData.exitYear - 3)} year-end month)
                          </p>
                        ) : null}
                      </div>
                      {exitStrategyData.exitStrategy === "refinance" && (
                        <>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                              Refinance LTC (%)
                            </label>
                            <input
                              type="number"
                              min={30}
                              max={85}
                              className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white"
                              value={exitStrategyData.refinanceLtc}
                              onChange={(e) => {
                                const v = Math.min(85, Math.max(30, Math.round(parseFloat(e.target.value) || 60)));
                                setStep7Confirmed(false);
                                setExitStrategyData((x) => ({ ...x, refinanceLtc: v }));
                                queueMicrotask(() => updateFinancing({ refinanceLtc: v }));
                              }}
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                              Refinance rate (% p.a.)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={25}
                              step={0.1}
                              className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white"
                              value={exitStrategyData.refinanceRate}
                              onChange={(e) => {
                                const v = Math.min(25, Math.max(0, parseFloat(e.target.value) || 0));
                                setStep7Confirmed(false);
                                setExitStrategyData((x) => ({ ...x, refinanceRate: v }));
                                queueMicrotask(() => updateFinancing({ refinanceRate: v }));
                              }}
                            />
                          </div>
                        </>
                      )}
                      {exitStrategyData.exitStrategy === "sale" && (
                        <>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                              Exit cap rate (%) (Component 3)
                            </label>
                            <div className="space-y-2">
                              <div className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white">
                                {(projectIRR.exitCapRate ?? 7).toFixed(1)}%
                              </div>
                              <label className="flex items-center gap-2 text-xs text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={useExitCapOverride}
                                  onChange={(e) => {
                                    setStep7Confirmed(false);
                                    setUseExitCapOverride(e.target.checked);
                                  }}
                                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                                />
                                Override for Component 4
                              </label>
                              {useExitCapOverride ? (
                                <input
                                  type="number"
                                  min={2}
                                  max={20}
                                  step={0.1}
                                  className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white"
                                  value={exitStrategyData.saleCapRate}
                                  onChange={(e) => {
                                    const v = Math.min(
                                      20,
                                      Math.max(2, parseFloat(e.target.value) || 7)
                                    );
                                    setStep7Confirmed(false);
                                    setExitStrategyData((x) => ({ ...x, saleCapRate: v }));
                                    queueMicrotask(() => updateFinancing({ saleCapRate: v }));
                                  }}
                                />
                              ) : null}
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                              Sale costs (% of gross)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={15}
                              step={0.1}
                              className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white"
                              value={exitStrategyData.saleCosts}
                              onChange={(e) => {
                                const v = Math.min(15, Math.max(0, parseFloat(e.target.value) || 0));
                                setStep7Confirmed(false);
                                setExitStrategyData((x) => ({ ...x, saleCosts: v }));
                                queueMicrotask(() => updateFinancing({ saleCosts: v }));
                              }}
                            />
                          </div>
                        </>
                      )}
                      {exitStrategyData.exitStrategy === "hold" && (
                        <p className="mt-4 rounded-lg border border-slate-700/80 bg-slate-900/40 p-3 text-xs text-slate-400">
                          <span className="font-medium text-slate-300">Hold summary:</span>{" "}
                          Senior facility amortization and covenant DSCRs are modeled
                          through{" "}
                          <span className="font-mono text-emerald-400">
                            {finStream === "operational" &&
                            dscrOpYearEndMonths[remainingBalanceAtExitYear.exitYear - 4] != null
                              ? `M${dscrOpYearEndMonths[remainingBalanceAtExitYear.exitYear - 4]}`
                              : `Y${remainingBalanceAtExitYear.exitYear}`}
                          </span>{" "}
                          (selected exit year), aligned with the P&amp;L (EBITDA) and Step 6
                          repayment preview. Remaining senior balance at exit:{" "}
                          <span className="font-mono text-white">
                            {formatProjectCurrency(remainingBalanceAtExitYear.endBal)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                    <h3 className="mb-2 text-lg font-semibold text-white">
                      3) Review &amp; confirm
                    </h3>
                    <p className="mb-4 text-xs text-slate-400">
                      Illustrative — senior + land debt service from prior steps (Y4–Y13
                      where applicable). If preference equity is enabled in Equity Returns,
                      preferred return reduces NOI for DSCR (not senior debt service).
                    </p>

                    <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                      <h4 className="mb-2 text-sm font-semibold text-white">
                        Covenant status (Y4–Y13)
                      </h4>
                      <p className="mb-3 text-xs text-slate-500">
                        NOI uses P&amp;L EBITDA (Component 2). Annual debt service follows
                        Step 6 senior amortization (grace, loan type, custom schedule)
                        {formData.landFinancingType === "land_loan"
                          ? " plus illustrative land loan P&amp;I."
                          : "."}
                      </p>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400">
                          Pass{" "}
                          <span className="font-mono text-emerald-400">
                            {calculateDscrCovenantProjection.passCount}
                          </span>
                          {" · "}
                          Fail{" "}
                          <span className="font-mono text-red-400">
                            {calculateDscrCovenantProjection.failCount}
                          </span>
                          <span className="text-slate-500">
                            {" "}
                            (target {debtCovenantsData.dscrTarget.toFixed(2)}×)
                          </span>
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
                        {calculateDscrCovenantProjection.projections.map((p) => (
                          <div
                            key={p.yearLabel}
                            className={`rounded border px-1 py-2 text-center text-[10px] font-mono leading-tight ${
                              p.covenantPass
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                                : "border-red-500/40 bg-red-500/10 text-red-300"
                            }`}
                          >
                            <div>{p.yearLabel}</div>
                            <div>{p.covenantPass ? "Pass" : "Fail"}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 border-t border-slate-700 pt-3">
                        <p className="mb-2 text-xs font-medium text-slate-300">
                          Validation checklist
                        </p>
                        <ul className="space-y-2 text-xs text-slate-400">
                          <li>
                            <span
                              className={`mr-2 inline-flex h-5 w-5 items-center justify-center rounded border text-[11px] font-bold ${
                                minDSCRStep8 >= debtCovenantsData.dscrTarget
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                  : "border-red-500/40 bg-red-500/10 text-red-300"
                              }`}
                            >
                              {minDSCRStep8 >= debtCovenantsData.dscrTarget ? "✓" : "✗"}
                            </span>
                            Minimum DSCR ({minDSCRStep8.toFixed(2)}×) ≥ covenant target (
                            {debtCovenantsData.dscrTarget.toFixed(2)}×)
                          </li>
                          <li>
                            <span
                              className={`mr-2 inline-flex h-5 w-5 items-center justify-center rounded border text-[11px] font-bold ${
                                calculateDscrCovenantProjection.failCount === 0
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                  : "border-red-500/40 bg-red-500/10 text-red-300"
                              }`}
                            >
                              {calculateDscrCovenantProjection.failCount === 0 ? "✓" : "✗"}
                            </span>
                            All years meet or exceed covenant target
                          </li>
                          <li>
                            <span
                              className={`mr-2 inline-flex h-5 w-5 items-center justify-center rounded border text-[11px] font-bold ${
                                finStream === "operational"
                                  ? operationalPnl
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                    : "border-red-500/40 bg-red-500/10 text-red-300"
                                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                              }`}
                            >
                              {finStream === "operational"
                                ? operationalPnl
                                  ? "✓"
                                  : "✗"
                                : "✓"}
                            </span>
                            {finStream === "operational"
                              ? "P&amp;L EBITDA (Component 2) loaded for NOI"
                              : "NOI from pro-forma cap-rate path (development stream)"}
                          </li>
                        </ul>
                      </div>
                    </div>

                    <h4 className="mb-3 text-base font-semibold text-white">
                      Monthly debt service &amp; DSCR snapshot
                    </h4>
                    <div className="space-y-3">
                          <div className="flex justify-between border-b border-slate-700 py-2">
                            <span className="text-slate-400">
                              Approved debt (construction)
                            </span>
                            <span className="font-medium text-white">
                              {formatProjectCurrency(approvedDebtAmount)}
                            </span>
                          </div>
                          {formData.landFinancingType === "land_loan" && (
                            <div className="flex justify-between border-b border-slate-700 py-2">
                              <span className="text-slate-400">Land loan</span>
                              <span className="font-medium text-amber-300">
                                {formatProjectCurrency(formData.landLoanAmount)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between border-b border-slate-700 py-2">
                            <span className="text-slate-400">Total debt</span>
                            <span className="font-semibold text-emerald-400">
                              {formatProjectCurrency(totalDebtWithLand)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-700 py-2">
                            <span className="text-slate-400">IDC treatment</span>
                            <span className="font-medium capitalize text-white">
                              {formData.idcTreatment === "capitalized"
                                ? "Fully capitalized"
                                : formData.idcTreatment === "current"
                                  ? "Paid current"
                                  : `Hybrid (${formData.idcCapitalizedSharePercent}% cap.)`}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-700 py-2">
                            <span className="text-slate-400">
                              Loan at completion
                            </span>
                            <span className="font-semibold text-emerald-400">
                              {formatProjectCurrency(loanAtCompletion)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-700 py-2">
                            <span className="text-slate-400">
                              Repayment structure
                            </span>
                            <span className="font-medium capitalize text-white">
                              {repaymentStructure.replace(/-/g, " ")}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-700 py-2">
                            <span className="text-slate-400">Interest rate</span>
                            <span className="font-semibold text-emerald-400">
                              {effectiveInterestRate.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-700 py-2">
                            <span className="text-slate-400">
                              Repayment period
                            </span>
                            <span className="font-medium text-white">
                              {amortizationYearsSlider} years
                            </span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="font-medium text-slate-300">
                              Total monthly debt service
                            </span>
                            <span className="text-lg font-bold text-emerald-400">
                              {formatProjectCurrency(totalMonthlyDebtService)}
                            </span>
                          </div>
                          {formData.hasPreferenceShares &&
                            formData.prefAmount > 0 && (
                              <>
                                <div className="flex justify-between border-b border-slate-700 py-2">
                                  <span className="text-slate-400">
                                    Monthly preferred return (est.)
                                  </span>
                                  <span className="font-medium text-amber-300">
                                    {formatProjectCurrency(
                                      monthlyPreferredReturn
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between py-2">
                                  <span className="font-medium text-slate-300">
                                    Total monthly obligation (DS + pref.)
                                  </span>
                                  <span className="text-lg font-bold text-emerald-400">
                                    {formatProjectCurrency(
                                      totalMonthlyObligation
                                    )}
                                  </span>
                                </div>
                              </>
                            )}
                        </div>

                        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                          <p className="text-xs text-slate-400">
                            NOI (pro-forma cap rate method)
                          </p>
                          <div className="mt-2 flex justify-between text-xs">
                            <span className="text-slate-500">Cap rate</span>
                            <span className="text-white">
                              {(CAP_RATE * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-1 flex justify-between text-xs">
                            <span className="text-slate-500">Annual growth</span>
                            <span className="text-white">
                              {(NOI_GROWTH_RATE * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between border-t border-slate-700 pt-2 text-xs">
                            <span className="text-slate-500">Year 1 NOI</span>
                            <span className="font-medium text-emerald-400">
                              {formatProjectCurrency(annualNoiForYear(1))}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                          <h4 className="mb-3 text-sm font-semibold text-white">
                            DSCR by year
                            {formData.hasPreferenceShares &&
                              formData.prefAmount > 0 && (
                                <span className="ml-2 font-normal text-slate-400">
                                  (NOI after preferred return)
                                </span>
                              )}
                          </h4>
                          <DscrYearlyColumnChart
                            data={dscrStep8ChartData}
                            covenantThreshold={debtCovenantsData.dscrTarget}
                          />
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded bg-slate-800/50 p-2">
                              <p className="text-slate-500">Min</p>
                              <p
                                className={`font-semibold ${
                                  minDSCRStep8 >= debtCovenantsData.dscrTarget
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                }`}
                              >
                                {minDSCRStep8.toFixed(2)}x
                              </p>
                            </div>
                            <div className="rounded bg-slate-800/50 p-2">
                              <p className="text-slate-500">Avg</p>
                              <p className="font-semibold text-white">
                                {avgDSCRStep8.toFixed(2)}x
                              </p>
                            </div>
                            <div className="rounded bg-slate-800/50 p-2">
                              <p className="text-slate-500">Max</p>
                              <p className="font-semibold text-emerald-400">
                                {maxDSCRStep8.toFixed(2)}x
                              </p>
                            </div>
                          </div>
                          <p
                            className={`mt-3 text-center text-xs ${
                              minDSCRStep8 >= debtCovenantsData.dscrTarget
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {minDSCRStep8 >= debtCovenantsData.dscrTarget
                              ? `All years at or above ${debtCovenantsData.dscrTarget.toFixed(2)}× covenant target`
                              : `Some years below ${debtCovenantsData.dscrTarget.toFixed(2)}× — review assumptions`}
                          </p>
                          <p className="mt-3 border-t border-slate-700 pt-3 text-xs text-slate-500">
                            {formData.hasPreferenceShares &&
                            formData.prefAmount > 0
                              ? "DSCR = (NOI − annual preferred return) ÷ annual debt service (senior + land). Preferred return is not included in debt service."
                              : `DSCR = NOI ÷ debt service. Chart reference line = your covenant target (${debtCovenantsData.dscrTarget.toFixed(2)}×).`}
                          </p>
                        </div>

                        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-700">
                          <table className="w-full min-w-[400px] text-left text-sm">
                            <thead>
                              <tr className="border-b border-slate-700 bg-slate-800/50">
                                <th className="px-3 py-2 font-medium text-slate-400">
                                  FYE
                                </th>
                                <th className="px-3 py-2 font-medium text-slate-400">
                                  NOI
                                </th>
                                <th className="px-3 py-2 font-medium text-slate-400">
                                  Annual DS
                                </th>
                                <th className="px-3 py-2 font-medium text-slate-400">
                                  DSCR
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/80">
                              {dscrDataStep8.map((row) => (
                                <tr key={row.year}>
                                  <td className="px-3 py-2 text-white">
                                    {row.year}
                                  </td>
                                  <td className="px-3 py-2 text-slate-300">
                                    {formatProjectCurrency(row.noi)}
                                  </td>
                                  <td className="px-3 py-2 text-slate-300">
                                    {formatProjectCurrency(row.debtService)}
                                  </td>
                                  <td
                                    className={`px-3 py-2 font-medium ${
                                      row.adjustedDSCR >= debtCovenantsData.dscrTarget
                                        ? "text-emerald-400"
                                        : "text-red-400"
                                    }`}
                                  >
                                    {row.adjustedDSCR.toFixed(2)}x
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                      <div className="mt-6 flex flex-col items-end gap-2 border-t border-slate-700 pt-4">
                        <p className="max-w-lg text-right text-xs text-slate-500">
                          Confirm saves covenant &amp; exit settings and enables View Preview.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const err = validateStep7();
                            if (err) {
                              setStep7ValidationError(err);
                              setStep7ValidationMessage({ type: "error", text: err });
                              return;
                            }
                            setStep7ValidationError(null);
                            saveStep7();
                            setStep7Confirmed(true);
                            setStep7ValidationMessage({
                              type: "success",
                              text: "Confirmed — you can open View Preview when ready.",
                            });
                            setTimeout(() => setStep7ValidationMessage(null), 4000);
                          }}
                          className={`rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
                            step7Confirmed
                              ? "cursor-default bg-emerald-600 text-white"
                              : "bg-emerald-600 text-white hover:bg-emerald-500"
                          }`}
                        >
                          {step7Confirmed ? "Confirmed ✓" : "Confirm debt covenants & exit"}
                        </button>
                      </div>

                      </div>
                </div>
              )}

              {/* Removed (Sale Development): hold period / exit assumptions */}
              {false && (
                <div className="space-y-8">
                  <div>
                    <h2 className="mb-2 text-xl font-semibold text-white">
                      Hold period &amp; exit assumptions
                    </h2>
                    <p className="mb-6 text-sm text-slate-400">
                      Define the hold horizon (5–20 years), exit cap rate, and
                      disposal costs. Illustrative exit value uses stabilized NOI
                      grown from the pro-forma cap-rate method (same as DSCR
                      steps) and applies your terminal cap. Below is a financing
                      summary for final review.
                    </p>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Hold period (years)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={20}
                          step={0.5}
                          value={formData.holdPeriodYears}
                          onChange={(e) =>
                            updateFormData(
                              "holdPeriodYears",
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          5–20 years (from project start)
                        </p>
                        {fieldError("holdPeriodYears") && (
                          <p className="mt-1 text-sm text-red-400">
                            {fieldError("holdPeriodYears")}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Exit method
                        </label>
                        <select
                          value={formData.exitMethod}
                          onChange={(e) =>
                            updateFormData(
                              "exitMethod",
                              e.target.value as ExitMethod
                            )
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="sale">Asset sale</option>
                          <option value="refinance">Refinancing</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Terminal / exit cap rate (%)
                        </label>
                        <input
                          type="number"
                          step={0.1}
                          value={formData.terminalCapRatePercent}
                          onChange={(e) =>
                            updateFormData(
                              "terminalCapRatePercent",
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {fieldError("terminalCapRatePercent") && (
                          <p className="mt-1 text-sm text-red-400">
                            {fieldError("terminalCapRatePercent")}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Sales / disposal cost (%)
                        </label>
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={100}
                          value={formData.salesCostPercent}
                          onChange={(e) =>
                            updateFormData(
                              "salesCostPercent",
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          % of gross exit value
                        </p>
                        {fieldError("salesCostPercent") && (
                          <p className="mt-1 text-sm text-red-400">
                            {fieldError("salesCostPercent")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                      <h3 className="mb-4 text-lg font-semibold text-white">
                        Hold timeline (illustrative)
                      </h3>
                      <dl className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-slate-700 py-2">
                          <dt className="text-slate-400">
                            Construction (from Component 1)
                          </dt>
                          <dd className="font-medium text-white">
                            {step9HoldExitMetrics.constructionPeriodMonths}{" "}
                            months
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 py-2">
                          <dt className="text-slate-400">
                            Total hold (calendar)
                          </dt>
                          <dd className="font-medium text-white">
                            {step9HoldExitMetrics.holdPeriodYears} yrs (
                            {step9HoldExitMetrics.totalHoldPeriodMonths} mo)
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 py-2">
                          <dt className="text-slate-400">
                            Operational hold (post-construction)
                          </dt>
                          <dd className="font-medium text-emerald-400">
                            {step9HoldExitMetrics.operationalHoldMonths} mo (~
                            {step9HoldExitMetrics.operationalHoldYears.toFixed(
                              1
                            )}{" "}
                            yrs)
                          </dd>
                        </div>
                        <div className="flex justify-between py-2">
                          <dt className="text-slate-400">Exit month (index)</dt>
                          <dd className="font-semibold text-white">
                            M{step9HoldExitMetrics.exitMonth}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                      <h3 className="mb-4 text-lg font-semibold text-white">
                        Exit valuation (illustrative)
                      </h3>
                      <p className="mb-4 text-xs text-slate-400">
                        Stabilized NOI = Year 1 NOI × (1 + growth)
                        <sup>{amortizationYearsSlider}</sup> using{" "}
                        {(NOI_GROWTH_RATE * 100).toFixed(1)}% p.a. growth over
                        the amortization period ({amortizationYearsSlider} yrs).
                        Exit value = stabilized NOI ÷ exit cap.
                      </p>
                      <dl className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-slate-700 py-2">
                          <dt className="text-slate-400">Year 1 NOI</dt>
                          <dd className="text-white">
                            {formatProjectCurrency(
                              step9HoldExitMetrics.initialNOI
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 py-2">
                          <dt className="text-slate-400">Stabilized NOI</dt>
                          <dd className="font-medium text-emerald-400">
                            {formatProjectCurrency(
                              step9HoldExitMetrics.stabilizedNOI
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 py-2">
                          <dt className="text-slate-400">Gross exit value</dt>
                          <dd className="font-medium text-white">
                            {formatProjectCurrency(
                              step9HoldExitMetrics.exitValue
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 py-2">
                          <dt className="text-slate-400">
                            Sales / disposal costs (
                            {step9HoldExitMetrics.salesCostPercent}%)
                          </dt>
                          <dd className="text-amber-300">
                            {formatProjectCurrency(
                              step9HoldExitMetrics.salesCosts
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between py-2">
                          <dt className="font-medium text-slate-300">
                            Net exit proceeds (illustrative)
                          </dt>
                          <dd className="text-lg font-bold text-emerald-400">
                            {formatProjectCurrency(
                              step9HoldExitMetrics.netExitProceeds
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-6">
                    <h3 className="mb-4 text-lg font-semibold text-white">
                      Financing summary (illustrative)
                    </h3>
                    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                      <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                        <p className="text-slate-300">
                          <span className="text-slate-400">TDC: </span>
                          {formatProjectCurrency(
                            step9HoldExitMetrics.financingSummary.tdc
                          )}
                        </p>
                        <p className="text-slate-300">
                          <span className="text-slate-400">
                            Debt sizing (LTC / LTV):{" "}
                          </span>
                          {step9HoldExitMetrics.financingSummary.debtSizing}
                        </p>
                        <p className="text-slate-300">
                          <span className="text-slate-400">
                            Total debt used (senior + land loan):{" "}
                          </span>
                          <span className="font-semibold text-emerald-400">
                            {formatProjectCurrency(
                              step9HoldExitMetrics.financingSummary.totalDebtUsed
                            )}
                          </span>
                        </p>
                        <p className="text-slate-300">
                          <span className="text-slate-400">
                            Equity requirement (TDC − senior − land loan):{" "}
                          </span>
                          {formatProjectCurrency(
                            step9HoldExitMetrics.financingSummary
                              .equityRequirement
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          (Equity vs. senior debt only:{" "}
                          {formatProjectCurrency(
                            step9HoldExitMetrics.financingSummary
                              .equityRequirementSeniorDebtOnly
                          )}
                          )
                        </p>
                      </div>
                      <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                        <p className="text-slate-300">
                          <span className="text-slate-400">
                            Min DSCR (Step 8 adjusted):{" "}
                          </span>
                          <span className="font-semibold text-emerald-400">
                            {Number.isFinite(
                              step9HoldExitMetrics.financingSummary.minDSCR
                            )
                              ? `${step9HoldExitMetrics.financingSummary.minDSCR.toFixed(2)}×`
                              : "N/A"}
                          </span>
                        </p>
                        <p className="text-slate-300">
                          <span className="text-slate-400">
                            Preference / mezz (amount):{" "}
                          </span>
                          {step9HoldExitMetrics.financingSummary
                            .preferenceSharesAmount != null
                            ? formatProjectCurrency(
                                step9HoldExitMetrics.financingSummary
                                  .preferenceSharesAmount
                              )
                            : "None"}
                        </p>
                        <p className="text-slate-300">
                          <span className="text-slate-400">
                            Repayment structure:{" "}
                          </span>
                          {
                            step9HoldExitMetrics.financingSummary
                              .amortizationStyle
                          }
                        </p>
                        <p className="text-slate-300">
                          <span className="text-slate-400">IDC treatment: </span>
                          {step9HoldExitMetrics.financingSummary.idcTreatment}
                        </p>
                        <p className="text-slate-300">
                          <span className="text-slate-400">
                            Exit / refinancing:{" "}
                          </span>
                          {
                            step9HoldExitMetrics.financingSummary
                              .exitRefinancing
                          }
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-slate-500">
                      Note: Final debt sizing, equity schedule, debt service and
                      DSCR will be computed using the detailed monthly cash flows
                      from Components 1–3 in the full model engine.
                    </p>
                  </div>
                </div>
              )}

        </div>
      </div>

      <PreviewFloatingBar
        showDownload={false}
        onPreviousClick={() => {
          if (currentStep === 0) {
            router.push(withStreamPrefix(streamPrefix, "/preview/project-irr"));
            return;
          }
          setCurrentStep((prev) => prev - 1);
          setErrors({});
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onNextClick={handleNext}
        nextDisabled={
          (currentStep === 3 && confirmedTab !== activeTab) ||
          (currentStep === totalSteps - 1 && !step7Confirmed)
        }
        nextLabel={
          currentStep === totalSteps - 1 ? "View Preview →" : "Next →"
        }
      />
    </div>
  );
}

export default function FinancingPage() {
  return (
    <SearchParamsBoundary>
      <FinancingPageContent />
    </SearchParamsBoundary>
  );
}
