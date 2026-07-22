"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchParamsBoundary from "@/components/SearchParamsBoundary";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import { BenchmarkBanner } from "@/components/BenchmarkBanner";
import useFinModelStore from "@/store/useFinModelStore";
import { FundingGapAreaChart } from "@/app/development-finance/FundingGapAreaChart";
import { buildCashFlowArray } from "@/lib/irr-calculations";
import { useStreamPrefix, withStreamPrefix } from "@/lib/stream-path";
import {
  auditSaleFinancingField,
  logSaleFinancing,
} from "@/lib/sale-audit-fields";
import type { FinancingConfig } from "@/lib/sale-financing-engine";
import type { PreferenceShares, ProjectInfo } from "@/store/useFinModelStore";
import AustraliaEscrowConfig from "./escrow-config/AustraliaEscrowConfig";
import MalaysiaEscrowConfig from "./escrow-config/MalaysiaEscrowConfig";
import UaeEscrowConfig from "./escrow-config/UaeEscrowConfig";
import type {
  EscrowConfigUpdateField,
  EscrowCountryBucket,
  EscrowWithdrawalMode,
  MalaysiaPropertyType,
} from "./escrow-config/types";

/** Sample cumulative NCF for Funding Gap chart (matches commercial wizard) */
const generateFundingGapChartData = (
  cumulativeNCF: number[] = [],
  constructionPeriod: number = 30
) => {
  const dataPoints: Array<{ month: number; value: number }> = [];
  const step = Math.max(1, Math.floor(constructionPeriod / 6));

  for (let m = 0; m <= constructionPeriod; m += step) {
    const value = cumulativeNCF[m] || 0;
    dataPoints.push({ month: m, value });
  }

  if (!dataPoints.some((d) => d.month === constructionPeriod)) {
    dataPoints.push({
      month: constructionPeriod,
      value: cumulativeNCF[constructionPeriod] || 0,
    });
  }

  return dataPoints;
};

// --- Jurisdiction (Sale residential escrow / land equity presets) ---
export type JurisdictionId =
  | "UAE"
  | "KSA"
  | "Malaysia"
  | "Australia"
  | "Vietnam"
  | "Thailand"
  | "Other";

export const JURISDICTION_RULES: Record<
  JurisdictionId,
  {
    landEquityMin: number;
    retentionBasis: "GDV" | "GDC";
    retentionPct: number;
    retentionReleaseMonths: number;
    depositRate: number;
    badge: string;
    covenantLtcMax: number;
  }
> = {
  UAE: {
    landEquityMin: 100,
    retentionBasis: "GDV",
    retentionPct: 5,
    retentionReleaseMonths: 12,
    depositRate: 3.9,
    badge: "UAE — RERA",
    covenantLtcMax: 75,
  },
  KSA: {
    landEquityMin: 100,
    retentionBasis: "GDV",
    retentionPct: 5,
    retentionReleaseMonths: 12,
    depositRate: 4.0,
    badge: "KSA — SFDA",
    covenantLtcMax: 75,
  },
  Malaysia: {
    landEquityMin: 3,
    retentionBasis: "GDV",
    retentionPct: 5,
    retentionReleaseMonths: 18,
    depositRate: 3.0,
    badge: "Malaysia — GDV escrow",
    covenantLtcMax: 80,
  },
  Australia: {
    landEquityMin: 35,
    retentionBasis: "GDC",
    retentionPct: 5,
    retentionReleaseMonths: 12,
    depositRate: 0.5,
    badge: "Australia — state regimes",
    covenantLtcMax: 65,
  },
  Vietnam: {
    landEquityMin: 15,
    retentionBasis: "GDC",
    retentionPct: 5,
    retentionReleaseMonths: 24,
    depositRate: 4.5,
    badge: "Vietnam — escrow",
    covenantLtcMax: 70,
  },
  Thailand: {
    landEquityMin: 0,
    retentionBasis: "GDC",
    retentionPct: 5,
    retentionReleaseMonths: 12,
    depositRate: 2.5,
    badge: "Thailand — escrow",
    covenantLtcMax: 75,
  },
  Other: {
    landEquityMin: 0, // Allows variable land equity
    retentionBasis: "GDV",
    retentionPct: 0,
    retentionReleaseMonths: 0,
    depositRate: 0,
    badge: "Other / No Specific Escrow Rules",
    covenantLtcMax: 75,
  },
};

/**
 * All-or-nothing land equity: only when the developer owns 100% of land as equity does any land
 * count—then banks typically credit 70% of land value toward the equity requirement.
 */
const LAND_EQUITY_HAIRCUT = 0.7;

/** Max land loan typically 70% of land → at least 30% land equity unless jurisdiction locks to 100%. */
const LAND_EQUITY_SLIDER_MIN = 30;

const FEE_SUGGESTIONS: Record<
  JurisdictionId,
  {
    commitment: string;
    landArrangement: string;
    landLegal: string;
    escrowSetup: string;
    escrowMgmt: string;
  }
> = {
  UAE: {
    commitment: "0.5% p.a. typical for GCC development facilities",
    landArrangement: "1.0% of loan amount standard",
    landLegal: "0.25% bundled valuation/legal fee",
    escrowSetup: "AED 5,000–10,000 one-time setup",
    escrowMgmt: "0.05–0.1% p.a. on average balance",
  },
  KSA: {
    commitment: "0.5% p.a. under Wafi program standards",
    landArrangement: "1.0% arrangement fee typical",
    landLegal: "0.25% documentation/valuation",
    escrowSetup: "SAR 2,500–5,000 setup",
    escrowMgmt: "0.05% p.a. management",
  },
  Malaysia: {
    commitment: "0.375% p.a. common for HDA projects",
    landArrangement: "0.5% processing fee standard",
    landLegal: "RM 500–1,000 fixed legal/valuation",
    escrowSetup: "RM 500–1,500 setup fee",
    escrowMgmt: "RM 10–50/month admin",
  },
  Australia: {
    commitment: "0.375% p.a. on undrawn balance",
    landArrangement: "0.75% application fee typical",
    landLegal: "AUD 1,000–2,000 valuation/legal",
    escrowSetup: "AUD 0–500 (often waived)",
    escrowMgmt: "0.02% p.a. trust account",
  },
  Vietnam: {
    commitment: "0.5% p.a. standard development rate",
    landArrangement: "1.0% processing fee",
    landLegal: "0.2% documentation/valuation",
    escrowSetup: "VND 5–15 million setup",
    escrowMgmt: "0.05–0.1% p.a. on balance",
  },
  Thailand: {
    commitment: "0.5% p.a. typical RCF rate",
    landArrangement: "0.75% arrangement fee",
    landLegal: "0.15% legal/valuation bundle",
    escrowSetup: "THB 5,000–15,000 setup",
    escrowMgmt: "0.03–0.08% p.a. management",
  },
  Other: {
    commitment: "0.5% p.a. typical development facility rate",
    landArrangement: "0.75–1.0% arrangement fee typical",
    landLegal: "0.15–0.25% legal/valuation bundle",
    escrowSetup: "Varies by jurisdiction — often waived if no escrow",
    escrowMgmt: "N/A when no escrow account",
  },
};

const STEP_LABELS = [
  "Project Summary",
  "Debt Sizing (LTC & LTV)",
  "Land Ownership & Equity",
  "Preference Shares",
  "Escrow Configuration",
  "Drawdown Structure",
  "Interest, IDC & Escrow Income",
  "Sales & Escrow Recycling",
] as const;

type DrawdownModeUi = "ltc-proportional" | "equity-first";

export type PrefSharesReturnType = "fixed-dividend" | "islamic-profit";

export type LandLoanInterestTreatment =
  | "capitalize"
  | "paid-current-quarterly"
  | "paid-current-semiannual";

type LandLoanInterestSchedule = {
  totalInterest: number;
  finalBalance: number;
  payments: Array<{ month: number; amount: number }>;
};

function computeLandLoanInterestSchedule(
  landLoanAmount: number,
  annualRatePercent: number,
  treatment: LandLoanInterestTreatment,
  tenorMonths: number
): LandLoanInterestSchedule {
  const annualRate = annualRatePercent / 100;
  if (landLoanAmount <= 0 || tenorMonths <= 0 || !annualRatePercent) {
    return { totalInterest: 0, finalBalance: landLoanAmount, payments: [] };
  }

  if (treatment === "capitalize") {
    const totalInterest = landLoanAmount * annualRate * (tenorMonths / 12);
    return {
      totalInterest,
      finalBalance: landLoanAmount + totalInterest,
      payments: [],
    };
  }

  const paymentFrequency = treatment === "paid-current-quarterly" ? 3 : 6;
  const numPayments = Math.floor(tenorMonths / paymentFrequency);
  const interestPerPayment = landLoanAmount * annualRate * (paymentFrequency / 12);
  const payments = Array.from({ length: numPayments }, (_, i) => ({
    month: (i + 1) * paymentFrequency,
    amount: interestPerPayment,
  }));

  return {
    totalInterest: interestPerPayment * numPayments,
    finalBalance: landLoanAmount,
    payments,
  };
}

type FormData = {
  debtType: "conventional" | "islamic";
  loanToCostPercent: number;
  maxLtvPercent: number;
  rcfCommitmentFeePercent: number;
  landLoanArrangementFeePercent: number;
  landLoanLegalValuationFeePercent: number;
  escrowSetupFee: number;
  escrowManagementFeePercent: number;
  landEquityPercent: number;
  landLoanRatePercent: number;
  landLoanInterestTreatment: LandLoanInterestTreatment;
  certificationIntervalMonths: number;
  escrowWithdrawalMode: EscrowWithdrawalMode;
  malaysiaPropertyType: MalaysiaPropertyType;
  retentionFirstReleaseMonths: number;
  retentionFinalReleaseMonths: number;
  retentionPercent: number;
  auDepositPct: number;
  auBalancePct: number;
  milestoneThresholdPct: number;
  drawdownMode: DrawdownModeUi;
  interestRateType: "fixed" | "floating";
  interestRate: number;
  idcTreatment: "capitalize" | "current" | "hybrid";
  escrowDepositRate: number;
  salesReduceEquity: boolean;
  prefSharesEnabled: boolean;
  prefSharesAllocationPercent: number;
  prefSharesReturnPct: number;
  prefSharesReturnType: PrefSharesReturnType;
};

function resolveJurisdiction(projectInfo: ProjectInfo): JurisdictionId {
  const code = projectInfo.countryCode?.toUpperCase() ?? "";
  const c = projectInfo.country?.toLowerCase() ?? "";
  if (code === "AE" || c.includes("uae") || c.includes("emirates")) return "UAE";
  if (code === "SA" || c.includes("saudi") || c.includes("ksa")) return "KSA";
  if (code === "MY" || c.includes("malaysia")) return "Malaysia";
  if (code === "AU" || c.includes("australia")) return "Australia";
  if (code === "VN" || c.includes("viet")) return "Vietnam";
  if (code === "TH" || c.includes("thai")) return "Thailand";
  return "Other";
}

function resolveEscrowCountry(
  projectInfo: ProjectInfo,
  jurisdiction: JurisdictionId
): EscrowCountryBucket {
  const code = projectInfo.countryCode?.toUpperCase() ?? "";
  if (code === "MY" || jurisdiction === "Malaysia") return "MY";
  if (code === "SA" || jurisdiction === "KSA") return "SA";
  if (code === "AE" || jurisdiction === "UAE") return "UAE";
  if (code === "AU" || jurisdiction === "Australia") return "AU";
  if (code === "VN" || jurisdiction === "Vietnam") return "VN";
  if (code === "TH" || jurisdiction === "Thailand") return "TH";
  return "OTHER";
}

function resolveMalaysiaPropertyType(projectInfo: ProjectInfo): MalaysiaPropertyType {
  const sub = projectInfo.buildingSubType ?? "";
  if (sub.includes("landed")) return "LANDED";
  return "HIGH_RISE";
}

function defaultEscrowWithdrawalMode(country: EscrowCountryBucket): EscrowWithdrawalMode {
  if (country === "AU") return "australia";
  if (country === "UAE" || country === "SA") return "uae";
  if (country === "MY") return "malaysia";
  // For flexible countries (TH, VN, OTHER), default to "none" to let user choose
  return "none";
}

function jurisdictionToEscrowCountry(jurisdiction: JurisdictionId): EscrowCountryBucket {
  if (jurisdiction === "Malaysia") return "MY";
  if (jurisdiction === "KSA") return "SA";
  if (jurisdiction === "UAE") return "UAE";
  if (jurisdiction === "Australia") return "AU";
  if (jurisdiction === "Vietnam") return "VN";
  if (jurisdiction === "Thailand") return "TH";
  return "OTHER";
}

function escrowCountryLabel(country: EscrowCountryBucket): string {
  if (country === "AU") return "Australian";
  if (country === "VN") return "Vietnamese";
  if (country === "TH") return "Thai";
  if (country === "OTHER") return "Other";
  return country;
}

function configToForm(cfg: FinancingConfig, jurisdiction: JurisdictionId): Partial<FormData> {
  const jurisdictionMin = JURISDICTION_RULES[jurisdiction].landEquityMin;
  const drawdownMode: DrawdownModeUi =
    cfg.drawdownMode === "gap-fill" ? "equity-first" : "ltc-proportional";
  return {
    loanToCostPercent: cfg.loanToCostPercent,
    maxLtvPercent: cfg.maxLtvPercent,
    rcfCommitmentFeePercent: cfg.commitmentFeePct,
    landEquityPercent:
      jurisdictionMin >= 100
        ? 100
        : Math.max(
            LAND_EQUITY_SLIDER_MIN,
            jurisdictionMin,
            cfg.landEquityPct ?? jurisdictionMin
          ),
    certificationIntervalMonths: cfg.certificationIntervalMonths,
    escrowWithdrawalMode: defaultEscrowWithdrawalMode(
      jurisdictionToEscrowCountry(jurisdiction)
    ),
    auDepositPct: 10,
    auBalancePct: 90,
    malaysiaPropertyType: "HIGH_RISE",
    retentionFirstReleaseMonths: 8,
    retentionFinalReleaseMonths: 24,
    retentionPercent: JURISDICTION_RULES[jurisdiction].retentionPct,
    milestoneThresholdPct: cfg.milestoneThresholdPct,
    drawdownMode,
    interestRateType: cfg.rateType,
    interestRate:
      cfg.rateType === "floating"
        ? (cfg.baseRatePercent || 0) + (cfg.marginPercent || 0)
        : cfg.fixedOrProfitRatePercent || cfg.interestRatePct,
    idcTreatment: cfg.idcTreatment,
    escrowDepositRate: JURISDICTION_RULES[jurisdiction].depositRate,
    salesReduceEquity: jurisdiction === "Malaysia",
  };
}

function computeCashEquityRequired(params: {
  tdc: number;
  landCost: number;
  gdv: number;
  loanToCostPercent: number;
  maxLtvPercent: number;
  landEquityPercent: number;
}): number {
  const {
    tdc,
    landCost,
    gdv,
    loanToCostPercent,
    maxLtvPercent,
    landEquityPercent,
  } = params;
  const debtLtc = tdc * (loanToCostPercent / 100);
  const debtLtv = gdv * (maxLtvPercent / 100);
  const approvedDebt = Math.min(debtLtc, debtLtv);
  const totalEquityRequired = Math.max(0, tdc - approvedDebt);
  const landEquityCounted =
    landEquityPercent === 100 ? landCost * LAND_EQUITY_HAIRCUT : 0;
  return Math.max(0, totalEquityRequired - landEquityCounted);
}

/** Map `financing.preferenceShares` (Zustand) → wizard Step 4 fields. */
function preferenceSharesToForm(
  pref: PreferenceShares | undefined,
  cashEquityRequired: number
): Pick<
  FormData,
  | "prefSharesEnabled"
  | "prefSharesAllocationPercent"
  | "prefSharesReturnPct"
  | "prefSharesReturnType"
> {
  const returnType: PrefSharesReturnType =
    pref?.returnType === "islamic_profit" || pref?.returnType === "islamic-profit"
      ? "islamic-profit"
      : "fixed-dividend";
  const returnPct = pref?.returnPercent ?? 0;

  if (!pref?.hasPreferenceShares) {
    return {
      prefSharesEnabled: false,
      prefSharesAllocationPercent: 0,
      prefSharesReturnPct: returnPct,
      prefSharesReturnType: returnType,
    };
  }

  const amount = Math.max(0, pref.amount ?? 0);
  const allocationPct =
    cashEquityRequired > 1e-6
      ? Math.min(100, (amount / cashEquityRequired) * 100)
      : 0;

  return {
    prefSharesEnabled: true,
    prefSharesAllocationPercent: allocationPct,
    prefSharesReturnPct: returnPct,
    prefSharesReturnType: returnType,
  };
}

function formDrawdownToEngine(mode: DrawdownModeUi): FinancingConfig["drawdownMode"] {
  return mode === "equity-first" ? "gap-fill" : "30/70";
}

function parseWizardStepFromUrl(
  raw: string | null,
  maxIndex: number
): number {
  if (!raw) return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  // URL uses 1-based step (1–N); internal state is 0–(N-1)
  return Math.min(maxIndex, Math.max(0, Math.round(parsed) - 1));
}

function ResidentialFinancingWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const streamPrefix = useStreamPrefix();

  const sale = useFinModelStore((s) => s.sale);
  const financing = useFinModelStore((s) => s.sale.financing);
  const updateFinancingConfig = useFinModelStore((s) => s.updateFinancingConfig);
  const updateFinancing = useFinModelStore((s) => s.updateFinancing);
  const calculateFinancing = useFinModelStore((s) => s.calculateFinancing);

  const projectInfo = sale.projectInfo;
  const cashOutflows = sale.cashOutflows;
  const cashInflows = sale.cashInflows;
  const projectIRR = sale.projectIRR;

  const jurisdiction = resolveJurisdiction(projectInfo);
  const escrowCountry = useMemo(
    () => resolveEscrowCountry(projectInfo, jurisdiction),
    [projectInfo, jurisdiction]
  );
  const showAustraliaTab = escrowCountry === "AU";
  const showMalaysiaTab = escrowCountry === "MY";
  const showUaeTab = escrowCountry === "UAE" || escrowCountry === "SA";
  const showFlexibleTabs = escrowCountry === "VN" || escrowCountry === "TH";
  const showAllTabs = showFlexibleTabs || jurisdiction === "Other";
  const rules = JURISDICTION_RULES[jurisdiction];
  const feeSuggestions = FEE_SUGGESTIONS[jurisdiction];
  const feeSuggestionRegionLabel =
    projectInfo.country?.trim() || jurisdiction;

  const maxStepIndex = STEP_LABELS.length - 1;
  const financingStepVisitLogged = useRef<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState(() =>
    parseWizardStepFromUrl(searchParams.get("step"), maxStepIndex)
  );

  useEffect(() => {
    const step = searchParams.get("step");
    if (step) {
      setCurrentStep(parseWizardStepFromUrl(step, maxStepIndex));
    }
  }, [searchParams, maxStepIndex]);

  const goToStep = useCallback(
    (stepIndex: number) => {
      const clamped = Math.min(maxStepIndex, Math.max(0, stepIndex));
      setCurrentStep(clamped);
      router.push(
        withStreamPrefix(streamPrefix, `/financing?step=${clamped + 1}`)
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [maxStepIndex, router, streamPrefix]
  );

  const financingConfig = (financing as { config?: FinancingConfig }).config;

  const initialLandEquity =
    rules.landEquityMin >= 100
      ? 100
      : Math.max(
          LAND_EQUITY_SLIDER_MIN,
          rules.landEquityMin,
          financingConfig?.landEquityPct ?? rules.landEquityMin
        );

  const [formData, setFormData] = useState<FormData>(() => {
    const loanToCostPercent = financingConfig?.loanToCostPercent ?? 65;
    const maxLtvPercent = financingConfig?.maxLtvPercent ?? 65;
    const tdcInit = cashOutflows.tdc || 0;
    const landCostInit = cashOutflows.landCost || 0;
    const gdvInit = cashInflows.grossSales || tdcInit * 1.2;
    const cashEquityInit = computeCashEquityRequired({
      tdc: tdcInit,
      landCost: landCostInit,
      gdv: gdvInit,
      loanToCostPercent,
      maxLtvPercent,
      landEquityPercent: initialLandEquity,
    });
    const prefFromStore = preferenceSharesToForm(
      financing.preferenceShares,
      cashEquityInit
    );
    const escrowCountryInit = resolveEscrowCountry(projectInfo, jurisdiction);
    const storedEscrow = financing.escrowConfig;

    return {
      debtType: financing.debtType ?? "conventional",
      loanToCostPercent,
      maxLtvPercent,
      rcfCommitmentFeePercent: financingConfig?.commitmentFeePct ?? 0.5,
      landLoanArrangementFeePercent: 1.0,
      landLoanLegalValuationFeePercent: 0.25,
      escrowSetupFee: financing.escrowSetupFee ?? 5000,
      escrowManagementFeePercent:
        (financing.escrowManagementFeePct ?? 0.0005) * 100,
      landEquityPercent: initialLandEquity,
      landLoanRatePercent: 6.5,
      landLoanInterestTreatment: "capitalize",
      escrowWithdrawalMode:
        storedEscrow?.withdrawalMode ??
        defaultEscrowWithdrawalMode(escrowCountryInit),
      malaysiaPropertyType:
        storedEscrow?.malaysia?.propertyType ??
        resolveMalaysiaPropertyType(projectInfo),
      retentionFirstReleaseMonths:
        storedEscrow?.malaysia?.retentionFirstReleaseMonths ?? 8,
      retentionFinalReleaseMonths:
        storedEscrow?.malaysia?.retentionFinalReleaseMonths ?? 24,
      retentionPercent:
        storedEscrow?.uaeSa?.retentionPercentage ?? rules.retentionPct,
      auDepositPct:
        storedEscrow?.australia?.depositPct ??
        storedEscrow?.australia?.retentionPct ??
        10,
      auBalancePct:
        storedEscrow?.australia?.balancePct ??
        storedEscrow?.australia?.releasePct ??
        90,
      certificationIntervalMonths:
        storedEscrow?.uaeSa?.certificationInterval ??
        financingConfig?.certificationIntervalMonths ??
        3,
      milestoneThresholdPct: financingConfig?.milestoneThresholdPct ?? 30,
      drawdownMode:
        financingConfig?.drawdownMode === "gap-fill" ? "equity-first" : "ltc-proportional",
      interestRateType: financingConfig?.rateType ?? "fixed",
      interestRate:
        financingConfig?.rateType === "floating"
          ? (financingConfig.baseRatePercent || 0) +
            (financingConfig.marginPercent || 0)
          : financingConfig?.fixedOrProfitRatePercent ||
            financingConfig?.interestRatePct ||
            6.0,
      idcTreatment: financingConfig?.idcTreatment ?? "capitalize",
      escrowDepositRate: rules.depositRate,
      salesReduceEquity: jurisdiction === "Malaysia",
      ...prefFromStore,
    };
  });

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("💾 [Wizard Step 5 State]:", {
        certificationIntervalMonths: formData.certificationIntervalMonths,
        allFinancingKeys: Object.keys(formData).filter(
          (k) => k.includes("cert") || k.includes("interval")
        ),
      });
    }
  }, [formData.certificationIntervalMonths]);

  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // CRITICAL: Ensure withdrawal mode is saved to the store immediately
    if (field === "escrowWithdrawalMode") {
      updateFinancing(
        {
          escrowConfig: {
            ...(financing.escrowConfig ?? {}),
            withdrawalMode: value as EscrowWithdrawalMode,
          },
        },
        "sale"
      );
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      auditSaleFinancingField(field as string, value);
    }
  }, [updateFinancing, financing.escrowConfig]);

  const updateEscrowField: EscrowConfigUpdateField = useCallback(
    (field, value) => {
      updateField(field as keyof FormData, value as FormData[keyof FormData]);
    },
    [updateField]
  );

  // Log current values on first visit to audited financing steps (UI steps 2–7)
  useEffect(() => {
    const uiStep = currentStep + 1;

    if (uiStep === 2 && !financingStepVisitLogged.current.has(2)) {
      financingStepVisitLogged.current.add(2);
      logSaleFinancing("debtType", formData.debtType, 2);
      logSaleFinancing("loanToCostPercent", formData.loanToCostPercent, 2);
      logSaleFinancing("maxLtvPercent", formData.maxLtvPercent, 2);
    }

    if (uiStep === 3 && !financingStepVisitLogged.current.has(3)) {
      financingStepVisitLogged.current.add(3);
      logSaleFinancing("landEquityPercent", formData.landEquityPercent, 3);
    }

    if (uiStep === 4 && !financingStepVisitLogged.current.has(4)) {
      financingStepVisitLogged.current.add(4);
      logSaleFinancing("prefSharesEnabled", formData.prefSharesEnabled, 4);
      if (formData.prefSharesEnabled) {
        logSaleFinancing(
          "prefSharesAllocationPercent",
          formData.prefSharesAllocationPercent,
          4
        );
        logSaleFinancing("prefSharesReturnPct", formData.prefSharesReturnPct, 4);
        logSaleFinancing("prefSharesReturnType", formData.prefSharesReturnType, 4);
      }
    }

    if (uiStep === 5 && !financingStepVisitLogged.current.has(5)) {
      financingStepVisitLogged.current.add(5);
      logSaleFinancing(
        "certificationIntervalMonths",
        formData.certificationIntervalMonths,
        5
      );
      logSaleFinancing("retentionPercent", formData.retentionPercent, 5);
      logSaleFinancing(
        "retentionFinalReleaseMonths",
        formData.retentionFinalReleaseMonths,
        5
      );
      logSaleFinancing("escrowSetupFee", formData.escrowSetupFee, 5);
      logSaleFinancing(
        "escrowManagementFeePercent",
        formData.escrowManagementFeePercent,
        5
      );
    }

    if (uiStep === 6 && !financingStepVisitLogged.current.has(6)) {
      financingStepVisitLogged.current.add(6);
      logSaleFinancing("drawdownMode", formData.drawdownMode, 6);
      if (formData.drawdownMode === "ltc-proportional") {
        logSaleFinancing("milestoneThresholdPct", formData.milestoneThresholdPct, 6);
      }
    }

    if (uiStep === 7 && !financingStepVisitLogged.current.has(7)) {
      financingStepVisitLogged.current.add(7);
      logSaleFinancing("interestRateType", formData.interestRateType, 7);
      logSaleFinancing("interestRate", formData.interestRate, 7);
      logSaleFinancing("idcTreatment", formData.idcTreatment, 7);
      logSaleFinancing("escrowDepositRate", formData.escrowDepositRate, 7);
    }
  }, [
    currentStep,
    formData.certificationIntervalMonths,
    formData.debtType,
    formData.drawdownMode,
    formData.escrowDepositRate,
    formData.escrowManagementFeePercent,
    formData.escrowSetupFee,
    formData.idcTreatment,
    formData.interestRate,
    formData.interestRateType,
    formData.landEquityPercent,
    formData.loanToCostPercent,
    formData.maxLtvPercent,
    formData.milestoneThresholdPct,
    formData.prefSharesAllocationPercent,
    formData.prefSharesEnabled,
    formData.prefSharesReturnPct,
    formData.prefSharesReturnType,
    formData.retentionFinalReleaseMonths,
    formData.retentionPercent,
  ]);

  useEffect(() => {
    const propertyType = resolveMalaysiaPropertyType(projectInfo);
    setFormData((prev) =>
      prev.malaysiaPropertyType === propertyType
        ? prev
        : { ...prev, malaysiaPropertyType: propertyType }
    );
  }, [projectInfo.buildingSubType]);

  useEffect(() => {
    if (!showAustraliaTab) return;
    setFormData((prev) =>
      prev.escrowWithdrawalMode === "australia"
        ? prev
        : { ...prev, escrowWithdrawalMode: "australia" }
    );
  }, [showAustraliaTab]);

  useEffect(() => {
    if (!financingConfig) return;
    const minEq = rules.landEquityMin;
    const landEq =
      minEq >= 100
        ? 100
        : Math.max(
            LAND_EQUITY_SLIDER_MIN,
            minEq,
            financingConfig.landEquityPct ?? minEq
          );
    setFormData((prev) => ({
      ...prev,
      ...configToForm(financingConfig, jurisdiction),
      landEquityPercent: landEq,
    }));
    // eslint-disable-next-line react-hooks/exhaust-deps -- hydrate once when store config appears
  }, [financingConfig?.loanToCostPercent, financingConfig?.drawdownMode]);

  const constructionPeriod = cashOutflows.constructionPeriod || 30;
  const constructionPeriodForFlows = constructionPeriod;
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

    return {
      peakFunding,
      peakFundingMonth,
      cumulativeNCF,
    };
  }, [
    cashInflows,
    cashOutflows,
    constructionPeriodForFlows,
    projectIRR.peakFunding,
  ]);

  const currency = projectInfo.currency || "AED";
  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value),
    [currency]
  );

  const tdc = cashOutflows.tdc || 0;
  const landCost = cashOutflows.landCost || 0;
  const gdv = cashInflows.grossSales || tdc * 1.2;
  const grossDevelopmentValue = gdv;

  const debtLtcFromForm = tdc * (formData.loanToCostPercent / 100);
  const debtLtvFromForm = grossDevelopmentValue * (formData.maxLtvPercent / 100);
  const approvedDebtAmount = Math.min(debtLtcFromForm, debtLtvFromForm);
  const bindingConstraint: "LTC" | "LTV" =
    debtLtcFromForm < debtLtvFromForm
      ? "LTC"
      : debtLtvFromForm < debtLtcFromForm
        ? "LTV"
        : "LTC";
  const totalEquityRequired = Math.max(0, tdc - approvedDebtAmount);

  const landEquityCounted =
    formData.landEquityPercent === 100 ? landCost * LAND_EQUITY_HAIRCUT : 0;
  const cashEquityRequired = Math.max(0, totalEquityRequired - landEquityCounted);

  // Re-hydrate preference shares when store or cash-equity base changes (e.g. return from preview).
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...preferenceSharesToForm(financing.preferenceShares, cashEquityRequired),
    }));
  }, [
    financing.preferenceShares?.hasPreferenceShares,
    financing.preferenceShares?.amount,
    financing.preferenceShares?.returnPercent,
    financing.preferenceShares?.returnType,
    cashEquityRequired,
  ]);

  const prefSharesAmount = formData.prefSharesEnabled
    ? cashEquityRequired * (formData.prefSharesAllocationPercent / 100)
    : 0;
  // Lock at 100% if country is UAE/KSA OR if UAE/KSA escrow model is selected
  const isLandEquityLocked =
    rules.landEquityMin >= 100 || formData.escrowWithdrawalMode === "uae";

  const landLoanAmount = Math.max(0, landCost * (1 - formData.landEquityPercent / 100));
  const australiaLandLoanCap = landCost * 0.65;
  const australiaEquityShortfall =
    jurisdiction === "Australia" && landLoanAmount > australiaLandLoanCap
      ? landLoanAmount - australiaLandLoanCap
      : 0;

  const gdcExclLand = Math.max(0, tdc - landCost);

  const retentionBaseAmount =
    rules.retentionBasis === "GDV" ? gdv : tdc;
  const retentionAmount = retentionBaseAmount * (rules.retentionPct / 100);

  const constructionTotal = cashOutflows.constructionCost || 0;
  const sCurvePctAtMilestone = useMemo(() => {
    if (constructionPeriod <= 0 || constructionTotal <= 0) return 0;
    let cum = 0;
    const raw = (cashOutflows as { construction?: number[] }).construction;
    for (let m = 1; m <= constructionPeriod; m++) {
      cum += raw?.[m] || 0;
      const pct = (cum / constructionTotal) * 100;
      if (pct >= formData.milestoneThresholdPct) return pct;
    }
    return 100;
  }, [
    cashOutflows,
    constructionPeriod,
    constructionTotal,
    formData.milestoneThresholdPct,
  ]);

  const drawdownCapIllustrative =
    (sCurvePctAtMilestone / 100) * Math.max(0, gdcExclLand);

  const estimatedScurveMonth = useMemo(() => {
    if (constructionPeriod <= 0 || constructionTotal <= 0) return constructionPeriod;
    let cum = 0;
    const raw = (cashOutflows as { construction?: number[] }).construction;
    for (let m = 1; m <= constructionPeriod; m++) {
      cum += raw?.[m] || 0;
      const pct = (cum / constructionTotal) * 100;
      if (pct >= formData.milestoneThresholdPct) return m;
    }
    return constructionPeriod;
  }, [cashOutflows, constructionPeriod, constructionTotal, formData.milestoneThresholdPct]);

  const certMonth =
    Math.ceil(estimatedScurveMonth / formData.certificationIntervalMonths) *
    formData.certificationIntervalMonths;
  const effectiveDrawMonth = Math.max(estimatedScurveMonth, certMonth);

  const landTenorMonths = constructionPeriod + 6;

  const landLoanInterestSchedule = useMemo(
    () =>
      computeLandLoanInterestSchedule(
        landLoanAmount,
        formData.landLoanRatePercent,
        formData.landLoanInterestTreatment,
        constructionPeriodForFlows + 6
      ),
    [
      landLoanAmount,
      formData.landLoanRatePercent,
      formData.landLoanInterestTreatment,
      constructionPeriodForFlows,
    ]
  );

  const persistToStore = useCallback(() => {
    const tdcVal = cashOutflows.tdc || 0;
    const lc = cashOutflows.landCost || 0;
    const gdvVal = cashInflows.grossSales || tdcVal * 1.2;
    const debtLtc = tdcVal * (formData.loanToCostPercent / 100);
    const debtLtv = gdvVal * (formData.maxLtvPercent / 100);
    const approvedDebt = Math.min(debtLtc, debtLtv);
    const totalEquityRequired = Math.max(0, tdcVal - approvedDebt);
    const landEquityCounted =
      formData.landEquityPercent === 100 ? lc * LAND_EQUITY_HAIRCUT : 0;
    const cashEquityRequired = Math.max(0, totalEquityRequired - landEquityCounted);
    const landEquityValue =
      formData.landEquityPercent >= 100
        ? lc
        : lc * (formData.landEquityPercent / 100);

    const drawdownMode = formDrawdownToEngine(formData.drawdownMode);
    const ratePartial: Partial<FinancingConfig> =
      formData.interestRateType === "fixed"
        ? {
            rateType: "fixed",
            fixedOrProfitRatePercent: formData.interestRate,
            interestRatePct: formData.interestRate,
          }
        : {
            rateType: "floating",
            baseRatePercent: 3,
            marginPercent: Math.max(0, formData.interestRate - 3),
            interestRatePct: formData.interestRate,
          };

    updateFinancingConfig({
      loanToCostPercent: formData.loanToCostPercent,
      maxLtvPercent: formData.maxLtvPercent,
      commitmentFeePct: formData.rcfCommitmentFeePercent,
      landEquityPct: formData.landEquityPercent,
      isLandIntegrated: true,
      drawdownMode,
      milestoneThresholdPct: formData.milestoneThresholdPct,
      certificationIntervalMonths: formData.certificationIntervalMonths,
      idcTreatment: formData.idcTreatment,
      ...ratePartial,
      salesRecyclingMode: "immediate",
      escrowReleaseTrigger: "handover",
      financingModel: "residential",
    });

    const commitmentFeePct = formData.rcfCommitmentFeePercent ?? 0.5;

    const constructionPeriodMonths = cashOutflows.constructionPeriod || 30;
    const prefReturnTypeStore: PreferenceShares["returnType"] =
      formData.prefSharesReturnType === "islamic-profit"
        ? "islamic_profit"
        : "fixed_dividend";
    const prefAmountForStore = formData.prefSharesEnabled
      ? Math.max(0, cashEquityRequired * (formData.prefSharesAllocationPercent / 100))
      : 0;

    updateFinancing(
      {
        debtType: formData.debtType,
        loanToCostPercent: formData.loanToCostPercent,
        maxLtvPercent: formData.maxLtvPercent,
        ltc: formData.loanToCostPercent,
        ltv: formData.maxLtvPercent,
        salesReduceEquity: formData.salesReduceEquity,
        financingModel: "residential",
        landFinancing: {
          type: formData.landEquityPercent >= 100 ? "equity" : "land_loan",
          landLoanAmount: landLoanAmount,
          landLoanRatePercent: formData.landLoanRatePercent,
          landLoanTenorYears: Math.max(1, Math.ceil(landTenorMonths / 12)),
          landLoanTenorMonths: landTenorMonths,
          landLoanInterestTreatment: formData.landLoanInterestTreatment,
        },
        landLoanArrangementFeePct: formData.landLoanArrangementFeePercent / 100,
        landLoanValuationFeePct: formData.landLoanLegalValuationFeePercent / 100,
        landEquityPercent: formData.landEquityPercent,
        landEquityValue,
        cashEquityRequired,
        // Step 2: persist binding facility + fee so preview engine does not fall back to stale LTC/LTV-only caps
        approvedCreditFacility: approvedDebt,
        debtFacilityAmount: approvedDebt,
        commitmentFeePct,
        commitmentFeeRate: commitmentFeePct,
        // Step 4: preference shares / mezzanine (engine reads `financing.preferenceShares` via bridge)
        preferenceShares: {
          hasPreferenceShares: formData.prefSharesEnabled,
          amount: prefAmountForStore,
          returnPercent: formData.prefSharesReturnPct ?? 0,
          returnType: prefReturnTypeStore,
          tenorMonths: constructionPeriodMonths + 6,
          redeemAtFairValue: false,
        },
        hdaDepositPct:
          financing.hdaDepositPct ??
          financing.escrowConfig?.malaysia?.hdaDepositPct ??
          3,
        escrowConfig: {
          withdrawalMode: formData.escrowWithdrawalMode,
          malaysia: {
            propertyType: formData.malaysiaPropertyType,
            retentionFirstReleaseMonths: formData.retentionFirstReleaseMonths,
            retentionFinalReleaseMonths: formData.retentionFinalReleaseMonths,
            hdaDepositPct:
              financing.hdaDepositPct ??
              financing.escrowConfig?.malaysia?.hdaDepositPct ??
              3,
          },
          uaeSa: {
            certificationInterval:
              formData.certificationIntervalMonths === 6 ? 6 : 3,
            retentionPercentage: formData.retentionPercent,
          },
          australia: {
            depositPct: formData.auDepositPct,
            balancePct: formData.auBalancePct,
          },
        },
        escrowSetupFee: formData.escrowSetupFee,
        escrowManagementFeePct: formData.escrowManagementFeePercent / 100,
      },
      "sale"
    );
  }, [
    formData,
    landLoanAmount,
    landTenorMonths,
    cashOutflows.tdc,
    cashOutflows.landCost,
    cashInflows.grossSales,
    updateFinancing,
    updateFinancingConfig,
  ]);

  const handlePrevious = useCallback(() => {
    if (currentStep === 0) {
      router.push(withStreamPrefix(streamPrefix, "/preview/project-irr"));
      return;
    }
    goToStep(currentStep - 1);
  }, [currentStep, goToStep, router, streamPrefix]);

  const handleNext = useCallback(() => {
    persistToStore();
    if (currentStep >= maxStepIndex) {
      calculateFinancing();
      router.push(withStreamPrefix(streamPrefix, "/preview/financing"));
      return;
    }
    goToStep(currentStep + 1);
  }, [
    calculateFinancing,
    currentStep,
    goToStep,
    maxStepIndex,
    persistToStore,
    router,
    streamPrefix,
  ]);

  const salesReduceDisabled =
    jurisdiction !== "Malaysia" || rules.retentionBasis !== "GDV";

  return (
    <div className="min-h-screen bg-slate-950 pb-32 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <h1 className="text-2xl font-bold text-white">
            Component 4: Residential Financing (Sale)
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Land term loan + construction RCF • Escrow rules by jurisdiction
          </p>
          <div className="mt-3 flex justify-between text-sm text-slate-400">
            <span>
              Step {currentStep + 1} of {STEP_LABELS.length}: {STEP_LABELS[currentStep]}
            </span>
            <span>
              {Math.round(((currentStep + 1) / STEP_LABELS.length) * 100)}% complete
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / STEP_LABELS.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="space-y-8 rounded-xl border border-slate-800 bg-slate-900 p-8">
          <div className="mb-6">
            <BenchmarkBanner />
          </div>
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-lg font-semibold text-white">
                  📋 Project Summary
                </h2>
                <p className="text-sm text-slate-400">
                  Review inputs from Components 1-3 before configuring financing.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-white">
                    Development Costs (Component 2)
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Land Costs:</span>
                      <span className="font-medium text-white">
                        {formatCurrency(cashOutflows.landCost || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Construction Costs:</span>
                      <span className="font-medium text-white">
                        {formatCurrency(cashOutflows.constructionCost || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">FFE Costs:</span>
                      <span className="font-medium text-white">
                        {formatCurrency(cashOutflows.ffe || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Soft Costs:</span>
                      <span className="font-medium text-white">
                        {formatCurrency(cashOutflows.softCosts || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">POWC:</span>
                      <span className="font-medium text-white">
                        {formatCurrency(cashOutflows.powc || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-700 pt-2">
                      <span className="font-semibold text-slate-300">
                        Total Development Costs (TDC):
                      </span>
                      <span className="font-bold text-emerald-400">
                        {formatCurrency(tdc)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-white">
                    Project Metrics
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Net Sales Proceeds:</span>
                      <span className="font-medium text-white">
                        {formatCurrency(cashInflows.netProceeds || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Construction Period:</span>
                      <span className="font-medium text-white">
                        {constructionPeriodForFlows} months
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sales Start Month:</span>
                      <span className="font-medium text-white">
                        {(() => {
                          const offset =
                            cashInflows.launchTiming?.launchMonthOffset ?? 0;
                          return offset > 0 ? `-M${offset}` : `M0`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-700 pt-2">
                      <span className="font-semibold text-slate-300">Net Surplus:</span>
                      <span className="font-bold text-emerald-400">
                        {formatCurrency((cashInflows.netProceeds || 0) - tdc)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">
                  📊 Funding Gap Visualization - Preliminary
                </h3>
                {(() => {
                  const tdcSafe = tdc || 0;
                  const assumedLtc = 0.65;
                  const maxDebt = tdcSafe * assumedLtc;
                  const minEquity = Math.max(0, tdcSafe - maxDebt);
                  return (
                    <>
                      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-lg bg-slate-900/50 p-3">
                          <p className="text-xs text-slate-400">Peak Funding Gap</p>
                          <p className="text-lg font-semibold text-amber-400">
                            {formatCurrency(fundingRequirement.peakFunding || 0)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-900/50 p-3">
                          <p className="text-xs text-slate-400">
                            Max Debt Capacity (65% LTC)
                          </p>
                          <p className="text-lg font-semibold text-blue-400">
                            {formatCurrency(maxDebt)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-900/50 p-3">
                          <p className="text-xs text-slate-400">
                            Min Equity Required (35%)
                          </p>
                          <p className="text-lg font-semibold text-emerald-400">
                            {formatCurrency(minEquity)}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-700 pt-4">
                        <p className="mb-2 text-xs text-slate-400">
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
                          formatCurrency={formatCurrency}
                        />
                      </div>

                      <div className="border-t border-slate-700 pt-4">
                        <p className="mb-2 text-xs text-slate-400">
                          Capital Stack Visualization
                        </p>
                        <div className="relative flex h-16 overflow-hidden rounded-lg bg-slate-700">
                          <div
                            className="flex h-full items-center bg-blue-600 px-3 transition-all duration-500"
                            style={{ width: "65%" }}
                          >
                            <span className="whitespace-nowrap text-xs font-medium text-white">
                              Debt: 65%
                            </span>
                          </div>
                          <div
                            className="flex h-full items-center bg-amber-600 px-3 transition-all duration-500"
                            style={{ width: "35%" }}
                          >
                            <span className="whitespace-nowrap text-xs font-medium text-white">
                              Equity: 35%
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-4 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded bg-blue-600" />
                            <span className="text-slate-400">Debt (65% LTC)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded bg-amber-600" />
                            <span className="text-slate-400">Equity (35%)</span>
                          </div>
                        </div>
                        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-emerald-400">
                              Peak Equity Required (Dynamic):
                            </span>
                            <span className="text-sm font-semibold text-emerald-400">
                              {formatCurrency(
                                Math.max(
                                  fundingRequirement.peakFunding || 0,
                                  cashEquityRequired
                                )
                              )}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            ℹ️ Uses the larger of the cumulative construction shortfall (pre
                            drawdowns) and residual cash equity from senior debt sizing on{" "}
                            <span className="text-slate-400">full TDC</span> plus the equity
                            breakdown (land counts only at 100% land equity, then 70% of land value;
                            below 100% land equity, no land credit). Actual needs may differ with sales
                            recycling and land loan configuration.
                          </p>
                        </div>
                        <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                          <p className="text-xs text-blue-300">
                            <strong>Note:</strong> LTC is calculated on full TDC (including 100%
                            land). In the equity breakdown, land counts only when land equity is 100%
                            (then 70% of land value); otherwise counted land is zero and residual
                            equity is cash—this haircut does not alter the LTC denominator.
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Debt type</h3>
              <p className="mb-4 text-sm text-slate-400">
                Conventional (interest-based) or Islamic (profit-based) terminology for the rest of
                this component.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => updateField("debtType", "conventional")}
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
                  onClick={() => updateField("debtType", "islamic")}
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
            </div>

            <div className="mb-6">
              <h2 className="mb-2 text-xl font-semibold text-white">
                Credit facility sizing — LTC &amp; LTV
              </h2>
              <p className="text-sm text-slate-400">
                Define your loan-to-cost and loan-to-value ratios
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-6">
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">
                    Calculated Credit Facility Amount
                  </h3>

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
                        updateField("loanToCostPercent", Number(e.target.value) || 0)
                      }
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-emerald-500"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

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
                        updateField("maxLtvPercent", Number(e.target.value) || 0)
                      }
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-emerald-500"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                    <div className="mb-4 border-b border-slate-700 pb-4">
                      <p className="mb-2 text-xs text-slate-400">
                        Based on LTC ({formData.loanToCostPercent}% of TDC):
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">TDC (full, including land):</span>
                          <span className="text-white">{formatCurrency(tdc)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">LTC:</span>
                          <span className="text-white">{formData.loanToCostPercent}%</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-700/50 pt-1">
                          <span className="text-slate-400">Credit Facility from LTC:</span>
                          <span className="font-semibold text-emerald-400">
                            {formatCurrency(debtLtcFromForm)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 border-b border-slate-700 pb-4">
                      <p className="mb-2 text-xs text-slate-400">
                        Based on LTV ({formData.maxLtvPercent}% of Stabilized Value):
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Stabilized Value:</span>
                          <span className="text-white">
                            {formatCurrency(grossDevelopmentValue)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">LTV:</span>
                          <span className="text-white">{formData.maxLtvPercent}%</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-700/50 pt-1">
                          <span className="text-slate-400">Credit Facility from LTV:</span>
                          <span className="font-semibold text-emerald-400">
                            {formatCurrency(debtLtvFromForm)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">
                          Approved Credit Facility Amount:
                        </span>
                        <span className="text-xl font-bold text-emerald-400">
                          {formatCurrency(approvedDebtAmount)}
                        </span>
                      </div>
                      <div
                        className={`flex items-center gap-2 text-xs ${
                          bindingConstraint === "LTC" ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        <span aria-hidden>✅</span>
                        <span>Limited by {bindingConstraint} — the binding constraint</span>
                      </div>
                    </div>

                    <p className="mt-4 border-t border-slate-700 pt-4 text-xs text-slate-500">
                      ℹ️ Lenders use the LOWER of LTC or LTV calculations to size loans.
                    </p>

                    <div className="mt-4 border-t border-slate-700 pt-4">
                      <label className="mb-1 block text-xs font-medium text-slate-300">
                        RCF commitment fee (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        step={0.05}
                        value={formData.rcfCommitmentFeePercent}
                        onChange={(e) =>
                          updateField(
                            "rcfCommitmentFeePercent",
                            Math.max(0, Math.min(5, parseFloat(e.target.value) || 0))
                          )
                        }
                        className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                      <p className="mt-2 text-xs italic text-slate-500">
                        Suggestion for {feeSuggestionRegionLabel}: {feeSuggestions.commitment}.
                        Charged on undrawn balance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-white">🏗️ Land as Equity</h2>
              <p className="text-sm text-slate-400">
                Configure land as equity contribution to the development financing.
              </p>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Land Cost (Component 1):</span>
                <span className="font-medium text-white">
                  {formatCurrency(cashOutflows.landCost || 0)}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="mb-4 text-lg font-medium text-white">
                Land Equity Contribution (%)
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">
                    {isLandEquityLocked ? "Land Equity (Locked)" : "Land Equity"}
                  </span>
                  <span className="text-lg font-bold text-emerald-400">
                    {formData.landEquityPercent}%
                  </span>
                </div>

                <input
                  type="range"
                  min={isLandEquityLocked ? 100 : LAND_EQUITY_SLIDER_MIN}
                  max={100}
                  step={5}
                  value={formData.landEquityPercent}
                  onChange={(e) =>
                    !isLandEquityLocked &&
                    updateField("landEquityPercent", Number(e.target.value))
                  }
                  disabled={isLandEquityLocked}
                  className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-emerald-500 ${
                    isLandEquityLocked ? "cursor-not-allowed opacity-50" : ""
                  }`}
                />

                <div className="flex justify-between text-xs text-slate-500">
                  <span>{isLandEquityLocked ? "100% (Required)" : "30% (Min)"}</span>
                  <span>100% (Full Equity)</span>
                </div>

                {((["UAE", "KSA", "Saudi Arabia"].includes(projectInfo.country) ||
                  jurisdiction === "UAE" ||
                  jurisdiction === "KSA") && (
                  <p className="mt-2 text-xs text-amber-400">
                    Under the {projectInfo.country || jurisdiction} rules developer must own 100% of
                    the land equity.
                  </p>
                ))}
              </div>

              {formData.landEquityPercent < 100 && !isLandEquityLocked && (
                <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                  <h4 className="mb-2 font-semibold text-amber-400">Land Term Loan Required</h4>
                  <p className="text-sm text-slate-300">
                    Principal (drawn at M0): {formatCurrency(landLoanAmount)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Bullet repayment: full principal at maturity (see tenor below).
                  </p>
                  <label className="mt-3 block text-sm">
                    <span className="text-slate-400">Land loan rate % (annual)</span>
                    <input
                      type="number"
                      step={0.1}
                      value={formData.landLoanRatePercent}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          landLoanRatePercent: Number(e.target.value),
                        }))
                      }
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                    />
                  </label>

                  <div className="mb-4 mt-4">
                    <label className="mb-3 block text-sm font-medium text-slate-300">
                      Interest payment on land loan
                    </label>
                    <div className="space-y-3">
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3 hover:border-slate-600">
                        <input
                          type="radio"
                          name="landLoanInterest"
                          checked={formData.landLoanInterestTreatment === "capitalize"}
                          onChange={() => updateField("landLoanInterestTreatment", "capitalize")}
                          className="mt-1 text-emerald-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">Capitalize</p>
                          <p className="text-xs text-slate-400">
                            Interest accrues to the loan balance—no cash interest during the tenor.
                            Bullet repayment of principal plus capitalized interest at M
                            {constructionPeriodForFlows + 6}.
                          </p>
                        </div>
                      </label>

                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3 hover:border-slate-600">
                        <input
                          type="radio"
                          name="landLoanInterest"
                          checked={
                            formData.landLoanInterestTreatment === "paid-current-quarterly"
                          }
                          onChange={() =>
                            updateField("landLoanInterestTreatment", "paid-current-quarterly")
                          }
                          className="mt-1 text-emerald-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            Paid current (quarterly)
                          </p>
                          <p className="text-xs text-slate-400">
                            Interest paid every 3 months from developer cash (increases peak equity
                            requirement vs capitalize).
                          </p>
                        </div>
                      </label>

                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3 hover:border-slate-600">
                        <input
                          type="radio"
                          name="landLoanInterest"
                          checked={
                            formData.landLoanInterestTreatment === "paid-current-semiannual"
                          }
                          onChange={() =>
                            updateField("landLoanInterestTreatment", "paid-current-semiannual")
                          }
                          className="mt-1 text-emerald-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            Paid current (semi-annual)
                          </p>
                          <p className="text-xs text-slate-400">
                            Interest paid every 6 months from developer cash (increases peak equity
                            requirement vs capitalize).
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="mb-2 text-sm text-slate-300">Loan tenor (bullet repayment)</p>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                      <p className="font-medium text-white">
                        {constructionPeriodForFlows + 6} months
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Construction period ({constructionPeriodForFlows} months) + 6 months
                        post-completion. Full principal repayment at maturity.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4 border-t border-slate-700/50 pt-4">
                    <p className="text-xs font-medium text-slate-300">Land term loan fees</p>

                    <div>
                      <label className="mb-1 block text-xs text-slate-400">
                        Arrangement / processing fee (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        step={0.05}
                        value={formData.landLoanArrangementFeePercent}
                        onChange={(e) =>
                          updateField(
                            "landLoanArrangementFeePercent",
                            Math.max(0, Math.min(5, parseFloat(e.target.value) || 0))
                          )
                        }
                        className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                      <p className="mt-1 text-xs text-slate-500">{feeSuggestions.landArrangement}</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-400">
                        Legal &amp; valuation fee (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        step={0.05}
                        value={formData.landLoanLegalValuationFeePercent}
                        onChange={(e) =>
                          updateField(
                            "landLoanLegalValuationFeePercent",
                            Math.max(0, Math.min(5, parseFloat(e.target.value) || 0))
                          )
                        }
                        className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                      <p className="mt-1 text-xs text-slate-500">{feeSuggestions.landLegal}</p>
                    </div>
                  </div>

                  {(() => {
                    const { totalInterest, payments, finalBalance } = landLoanInterestSchedule;
                    const firstPay = payments[0]?.amount ?? 0;

                    if (formData.landLoanInterestTreatment !== "capitalize") {
                      const frequency =
                        formData.landLoanInterestTreatment === "paid-current-quarterly"
                          ? "quarterly"
                          : "semi-annual";
                      return (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                          <p className="text-xs text-amber-300">
                            <strong>Equity impact:</strong>{" "}
                            {payments.length > 0 ? (
                              <>
                                {payments.length} interest payment
                                {payments.length === 1 ? "" : "s"} of approximately{" "}
                                {formatCurrency(firstPay)} ({frequency}) from developer cash—increases
                                peak equity vs capitalized interest. Schedule total (illustrative):{" "}
                                {formatCurrency(totalInterest)}.
                              </>
                            ) : (
                              <>
                                No full interest period fits the current tenor; illustrative total
                                interest: {formatCurrency(totalInterest)}.
                              </>
                            )}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                        <p className="text-xs text-blue-300">
                          <strong>Capitalized interest (illustrative):</strong>{" "}
                          {formatCurrency(totalInterest)} accrues to the loan balance. Bullet
                          repayment at M{constructionPeriodForFlows + 6}:{" "}
                          {formatCurrency(finalBalance)} (principal + accrued interest).
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <h3 className="mb-3 text-lg font-medium text-white">Equity sources breakdown</h3>
              <p className="mb-4 text-xs text-slate-400">
                Total equity requirement (TDC − senior debt). Land value only counts toward equity if
                you own 100% of the land as equity (70% of land value credited after bank haircut).
              </p>

              {formData.landEquityPercent === 100 ? (
                <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <p className="text-xs text-emerald-300">
                    100% land ownership:{" "}
                    <span className="font-semibold">
                      {formatCurrency(landCost * LAND_EQUITY_HAIRCUT)}
                    </span>{" "}
                    (70% of land value) counts toward the equity requirement. Remaining land value is
                    not credited; fund via cash or other sources.
                  </p>
                </div>
              ) : (
                <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs text-amber-300">
                    Land equity below 100%: land value cannot be counted toward required equity under
                    this rule—you must satisfy the residual with cash (and any land loan / other
                    sources per your facility).
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-700/80 pb-2">
                  <span className="text-slate-400">Total equity requirement</span>
                  <span className="font-medium text-white">
                    {formatCurrency(totalEquityRequired)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-700/80 pb-2">
                  <span className="text-slate-400">
                    Land (counted as equity
                    {formData.landEquityPercent === 100 ? ", 70% haircut" : ""})
                  </span>
                  <span
                    className={`font-medium ${
                      landEquityCounted > 0 ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {formatCurrency(landEquityCounted)}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-400">Cash equity (required)</span>
                  <span className="font-medium text-amber-300">
                    {formatCurrency(cashEquityRequired)}
                  </span>
                </div>
              </div>
            </div>

            {jurisdiction === "Australia" ? (
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-sm">
                <p className="font-medium text-white">Australia land loan cap (65% of land)</p>
                <p className="mt-1 text-slate-400">
                  Max loan: {formatCurrency(australiaLandLoanCap)} • Shortfall:{" "}
                  <span
                    className={
                      australiaEquityShortfall > 0 ? "text-red-400" : "text-emerald-400"
                    }
                  >
                    {formatCurrency(australiaEquityShortfall)}
                  </span>
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Step 3 — Preference shares */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-white">Preference shares</h2>
              <p className="text-sm text-slate-400">
                Optional tranche with a fixed return or Islamic target profit. Configure after land
                and senior sizing; amounts reference cash equity required from the stack above.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.prefSharesEnabled ?? false}
                onClick={() =>
                  updateField("prefSharesEnabled", !formData.prefSharesEnabled)
                }
                className={`relative h-6 w-12 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                  formData.prefSharesEnabled ? "bg-emerald-500" : "bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                    formData.prefSharesEnabled ? "left-7" : "left-1"
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-white">
                Enable preference shares / mezzanine equity
              </span>
            </div>

            {formData.prefSharesEnabled ? (
              <div className="space-y-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                  <p className="mb-1 text-xs text-slate-400">
                    Reference: cash equity required (from TDC − debt and land equity rules)
                  </p>
                  <p className="text-xl font-bold text-white">{formatCurrency(cashEquityRequired)}</p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Allocation (% of cash equity)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={formData.prefSharesAllocationPercent ?? 0}
                      onChange={(e) =>
                        updateField("prefSharesAllocationPercent", Number(e.target.value))
                      }
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-emerald-500"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Preference amount ({currency})
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatCurrency(prefSharesAmount)}
                      className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 font-mono text-white opacity-70"
                      aria-readonly
                    />
                    <p className="mt-1 text-xs text-slate-500">Auto-calculated from allocation %</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Target return (% p.a.)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={25}
                      step={0.25}
                      value={formData.prefSharesReturnPct ?? 0}
                      onChange={(e) =>
                        updateField(
                          "prefSharesReturnPct",
                          Math.max(0, Math.min(25, parseFloat(e.target.value) || 0))
                        )
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Return type</label>
                    <select
                      value={formData.prefSharesReturnType ?? "fixed-dividend"}
                      onChange={(e) =>
                        updateField(
                          "prefSharesReturnType",
                          e.target.value as PrefSharesReturnType
                        )
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    >
                      <option value="fixed-dividend">Fixed dividend (% p.a.)</option>
                      <option value="islamic-profit">Islamic profit rate</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                  <div>
                    <p className="text-sm font-medium text-white">Preference shares tenor</p>
                    <p className="text-xs text-slate-400">
                      Subordinate to senior debt. Repaid after bank facility payoff at handover
                      (illustrative).
                    </p>
                  </div>
                  <span className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300">
                    System-determined
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Step 5 — Escrow withdrawal (wizard index 4) */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">
              Step 5: Escrow Withdrawal Configuration
            </h2>

            <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <span className="font-semibold text-emerald-400">{rules.badge}</span>
              <span className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300">
                Jurisdiction
              </span>
            </div>

            {(showAustraliaTab || showAllTabs || showMalaysiaTab || showUaeTab) && (
              <div className="flex flex-wrap border-b border-slate-700 gap-1">
                {showAustraliaTab && (
                  <button
                    type="button"
                    className="cursor-default border-b-2 border-emerald-400 px-4 py-2 text-sm font-medium text-emerald-400"
                  >
                    Australia (10/90 Rule)
                    <span className="ml-2 text-xs text-slate-500">(Locked)</span>
                  </button>
                )}
                {showAllTabs && !showAustraliaTab && (
                  <button
                    type="button"
                    onClick={() => updateField("escrowWithdrawalMode", "australia")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      formData.escrowWithdrawalMode === "australia"
                        ? "border-b-2 border-emerald-400 text-emerald-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Australia (10/90 Rule)
                  </button>
                )}
                {(showMalaysiaTab || showAllTabs) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (showAllTabs) updateField("escrowWithdrawalMode", "malaysia");
                    }}
                    disabled={!showAllTabs}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      formData.escrowWithdrawalMode === "malaysia"
                        ? "border-b-2 border-emerald-400 text-emerald-400"
                        : "text-slate-400"
                    } ${!showAllTabs ? "cursor-default" : "hover:text-slate-200"}`}
                  >
                    Malaysia HDA Progress Withdrawals
                    {escrowCountry === "MY" && (
                      <span className="ml-2 text-xs text-slate-500">(Locked)</span>
                    )}
                  </button>
                )}
                {(showUaeTab || showAllTabs) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (showAllTabs) updateField("escrowWithdrawalMode", "uae");
                    }}
                    disabled={!showAllTabs}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      formData.escrowWithdrawalMode === "uae"
                        ? "border-b-2 border-emerald-400 text-emerald-400"
                        : "text-slate-400"
                    } ${!showAllTabs ? "cursor-default" : "hover:text-slate-200"}`}
                  >
                    UAE/SA Certification Intervals
                    {(escrowCountry === "UAE" || escrowCountry === "SA") && (
                      <span className="ml-2 text-xs text-slate-500">(Locked)</span>
                    )}
                  </button>
                )}
                {showAllTabs && (
                  <button
                    type="button"
                    onClick={() => updateField("escrowWithdrawalMode", "none")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      formData.escrowWithdrawalMode === "none"
                        ? "border-b-2 border-emerald-400 text-emerald-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    No Escrow Rules
                  </button>
                )}
              </div>
            )}

            {showFlexibleTabs && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-400">
                      Select Your Escrow Withdrawal Method
                    </h4>
                    <p className="mt-1 text-sm text-slate-300">
                      For {escrowCountryLabel(escrowCountry)} projects, you can choose either
                      approach:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-400">
                      <li>
                        • <strong className="text-slate-300">Malaysia HDA:</strong> Progress-based
                        withdrawals tied to construction milestones
                      </li>
                      <li>
                        • <strong className="text-slate-300">UAE/SA Certification:</strong>{" "}
                        Time-based withdrawals at certification intervals
                      </li>
                    </ul>
                    <p className="mt-2 text-xs text-slate-500">
                      Tip: Select the method that best matches your local regulatory requirements or
                      lender preferences.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {showAustraliaTab && (
                <AustraliaEscrowConfig
                  formData={formData}
                  updateField={updateEscrowField}
                  isLocked={false}
                />
              )}

              {!showAustraliaTab &&
                formData.escrowWithdrawalMode === "australia" &&
                showAllTabs && (
                  <AustraliaEscrowConfig
                    formData={formData}
                    updateField={updateEscrowField}
                    isLocked={false}
                  />
                )}

              {!showAustraliaTab &&
                (formData.escrowWithdrawalMode === "malaysia" || showMalaysiaTab) && (
                  <MalaysiaEscrowConfig formData={formData} />
                )}

              {!showAustraliaTab &&
                (formData.escrowWithdrawalMode === "uae" || showUaeTab) && (
                  <UaeEscrowConfig
                    formData={formData}
                    updateField={updateEscrowField}
                    isLocked={!showAllTabs}
                  />
                )}

              {formData.escrowWithdrawalMode === "none" && (
                <div className="space-y-4 rounded-lg bg-slate-800/80 p-6 ring-1 ring-slate-700">
                  <p className="text-sm text-slate-300">
                    Sales proceeds sweep directly to debt service and equity distribution. No
                    escrow or trust accounts apply — standard commercial waterfall rules apply.
                  </p>
                  <label className="flex items-center gap-3 rounded border border-slate-700 bg-slate-900/50 p-3">
                    <input
                      type="checkbox"
                      checked={formData.salesReduceEquity}
                      onChange={(e) => updateField("salesReduceEquity", e.target.checked)}
                      className="text-emerald-500"
                    />
                    <span>Sales reduce equity need (optional)</span>
                  </label>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700">
                <p className="text-xs text-slate-400">Illustrative retention (jurisdiction)</p>
                <p className="font-semibold text-white">
                  {formData.escrowWithdrawalMode === "none" ? (
                    <>No escrow retention</>
                  ) : showAustraliaTab ? (
                    <>
                      {formData.auDepositPct}% purchase deposit in trust • 5% GDV retention for
                      12 months post completion
                    </>
                  ) : (
                    <>
                      {rules.retentionPct}% of {rules.retentionBasis} •{" "}
                      {formatCurrency(retentionAmount)}
                    </>
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700">
                <p className="text-xs text-slate-400">Release timing (illustrative)</p>
                <p className="font-semibold text-white">
                  {formData.escrowWithdrawalMode === "none"
                    ? "N/A — no escrow release schedule"
                    : showMalaysiaTab ||
                        (showFlexibleTabs && formData.escrowWithdrawalMode === "malaysia")
                      ? "24 months post completion"
                      : "12 months post completion"}
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="text-lg font-semibold text-white">Escrow account fees</h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Setup fee (flat amount, {currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={formData.escrowSetupFee}
                    onChange={(e) =>
                      updateField("escrowSetupFee", Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  />
                  <p className="mt-1 text-xs text-slate-500">{feeSuggestions.escrowSetup}</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Management fee (% p.a.)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={formData.escrowManagementFeePercent}
                    onChange={(e) =>
                      updateField(
                        "escrowManagementFeePercent",
                        Math.max(0, Math.min(1, parseFloat(e.target.value) || 0))
                      )
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  />
                  <p className="mt-1 text-xs text-slate-500">{feeSuggestions.escrowMgmt}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5 — Drawdown */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Drawdown Structure</h2>
            <div className="space-y-4 rounded-lg bg-slate-800/80 p-6 ring-1 ring-slate-700">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => updateField("drawdownMode", "ltc-proportional")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    formData.drawdownMode === "ltc-proportional"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                  }`}
                >
                  LTC-Proportional Milestone
                </button>
                <button
                  type="button"
                  onClick={() => updateField("drawdownMode", "equity-first")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    formData.drawdownMode === "equity-first"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                  }`}
                >
                  Equity-First Gap-Fill
                </button>
              </div>

              {formData.drawdownMode === "ltc-proportional" ? (
                <div className="space-y-3 rounded border border-slate-700 bg-slate-900/60 p-4">
                  <label className="block">
                    <span className="text-sm text-slate-400">Progress threshold (%)</span>
                    <input
                      type="number"
                      value={formData.milestoneThresholdPct}
                      onChange={(e) =>
                        updateField(
                          "milestoneThresholdPct",
                          Number(e.target.value) || 0
                        )
                      }
                      className="mt-1 w-32 rounded border border-slate-700 bg-slate-900 px-3 py-2"
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    Drawdown occurs at MAX(S-curve month, certification month). S-curve cumulative
                    must reach {formData.milestoneThresholdPct}% TDC before the milestone window.
                  </p>
                  <div className="grid gap-2 text-xs text-slate-400 md:grid-cols-3">
                    <div className="rounded bg-slate-800 p-2">
                      S-curve month ≈ M{estimatedScurveMonth}
                    </div>
                    <div className="rounded bg-slate-800 p-2">
                      Cert boundary → M{certMonth}
                    </div>
                    <div className="rounded bg-slate-800 p-2 font-medium text-amber-400">
                      Effective → M{effectiveDrawMonth}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Drawdown cap (illustrative): S-curve % at threshold × (GDC − Land) ≈{" "}
                    <span className="text-slate-200">{formatCurrency(drawdownCapIllustrative)}</span>{" "}
                    (using ~{sCurvePctAtMilestone.toFixed(1)}% S-curve at first crossing).
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Equity funds shortfalls first; RCF fills the residual gap each period (engine
                  gap-fill mode).
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 6 — Interest / IDC */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">
              Interest, IDC &amp; Escrow Income
            </h2>
            <div className="space-y-4 rounded-lg bg-slate-800/80 p-6 ring-1 ring-slate-700">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => updateField("interestRateType", "fixed")}
                  className={`rounded-lg px-4 py-2 text-sm ${
                    formData.interestRateType === "fixed"
                      ? "bg-emerald-600"
                      : "bg-slate-700"
                  }`}
                >
                  Fixed
                </button>
                <button
                  type="button"
                  onClick={() => updateField("interestRateType", "floating")}
                  className={`rounded-lg px-4 py-2 text-sm ${
                    formData.interestRateType === "floating"
                      ? "bg-emerald-600"
                      : "bg-slate-700"
                  }`}
                >
                  Floating
                </button>
              </div>
              <label className="block">
                <span className="text-sm text-slate-400">
                  {formData.interestRateType === "fixed" ? "All-in rate %" : "All-in floating %"}
                </span>
                <input
                  type="number"
                  step={0.05}
                  value={formData.interestRate}
                  onChange={(e) =>
                    updateField("interestRate", Number(e.target.value) || 0)
                  }
                  className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm text-slate-400">IDC treatment (construction RCF)</span>
                <select
                  value={formData.idcTreatment}
                  onChange={(e) =>
                    updateField(
                      "idcTreatment",
                      e.target.value as FormData["idcTreatment"]
                    )
                  }
                  className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                >
                  <option value="capitalize">Capitalize</option>
                  <option value="current">Pay current</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-slate-400">
                  Escrow deposit rate % (default by jurisdiction)
                </span>
                <input
                  type="number"
                  step={0.1}
                  value={formData.escrowDepositRate}
                  onChange={(e) =>
                    updateField("escrowDepositRate", Number(e.target.value) || 0)
                  }
                  className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Interest accrues and is released pro-rata with principal (model note).
                </p>
              </label>
            </div>
          </div>
        )}

        {/* Step 7 — Sales */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Sales &amp; Escrow Recycling</h2>
            <div className="space-y-4 rounded-lg bg-slate-800/80 p-6 ring-1 ring-slate-700">
              <p className="text-sm text-slate-300">
                Under construction cost-based release (UAE/KSA), surplus escrow receipts
                automatically reduce drawn RCF during the development phase.
              </p>
              <label
                className={`flex items-center gap-3 rounded border p-3 ${
                  salesReduceDisabled
                    ? "cursor-not-allowed border-slate-800 opacity-50"
                    : "border-slate-700 bg-slate-900/50"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={salesReduceDisabled}
                  checked={formData.salesReduceEquity}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, salesReduceEquity: e.target.checked }))
                  }
                  className="text-emerald-500"
                />
                <span>Sales reduce equity need (Malaysia / GDV-based)</span>
              </label>
              {salesReduceDisabled ? (
                <p className="text-xs text-slate-500">
                  Enabled when jurisdiction is Malaysia (GDV-based release models).
                </p>
              ) : null}
            </div>
          </div>
        )}

        </div>
      </main>

      <PreviewFloatingBar
        showDownload={false}
        onPreviousClick={handlePrevious}
        onNextClick={handleNext}
        nextDisabled={false}
        nextLabel={
          currentStep >= STEP_LABELS.length - 1 ? "Generate Model →" : "Next →"
        }
      />
    </div>
  );
}

export default function ResidentialFinancingWizard() {
  return (
    <SearchParamsBoundary>
      <ResidentialFinancingWizardContent />
    </SearchParamsBoundary>
  );
}
