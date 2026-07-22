"use client";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchParamsBoundary from "@/components/SearchParamsBoundary";
import useFinModelStore, {
  buildCashOutflowProfile,
  calculateOperationsStartMonth,
  getOperationalYearMonthRange,
  OPERATIONAL_PERIOD_YEARS,
  PRE_OPERATION_BUFFER_MONTHS,
  type Financing,
} from "@/store/useFinModelStore";
import type { FinancingConfig } from "@/lib/sale-financing-engine";
import { buildSaleCashflowDetailProfile } from "@/lib/sale-cash-preview-profile";
import {
  buildFinancingEnginePreview,
  financingEngineTimelineLastMonth,
  financingEngineTimelineMonthCount,
  isCommercialFinancingModel,
  isResidentialSaleProject,
  mapEngineRowsToAustralia,
  mapEngineRowsToMalaysia,
  mapEngineRowsToUae,
  resolveFinancingEngineJurisdiction,
} from "./financing-cash-flow-engine-bridge";
import { CashFlowTableAustralia } from "./components/cash-flow-table-australia";
import { CashFlowTableMalaysia } from "./components/cash-flow-table-malaysia";
import { CashFlowTableUaeSa } from "./components/cash-flow-table-uae-sa";
import { computeReimbursementMilestones } from "@/lib/milestone-drawdown";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import { exportToCSV } from "@/lib/downloads/exportToCSV";
import { exportToExcel } from "@/lib/downloads/exportToExcel";
import { buildFinancingCashFlowExportRows } from "@/app/sale/preview/financing/build-financing-cash-flow-export";
import { computeOperationalHotelHoldPnl } from "@/lib/operational-pnl";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";
import {
  annualIrrPercentFromMonthlySeries,
  equityMultipleFromSeries,
  monthlyIrrFromSeries,
  paybackMonthCrossingFromNegative,
} from "@/lib/equity-irr";
import type { MonthlyRow } from "@/lib/financing-engine/generate-cash-flow";
import type { ProjectMetrics } from "@/store/financingStore";
import type { ProjectIRR } from "@/store/useFinModelStore";

/** Aligns with Component 4 Step 6 / `normalizeSeniorLoanType` in `src/app/financing/page.tsx`. */
type PreviewSeniorLoanType =
  | "bullet"
  | "equal-principal"
  | "equal-payment"
  | "custom";

function normalizeSeniorLoanType(
  raw: string | undefined
): PreviewSeniorLoanType {
  if (raw === "declining" || raw === "equal-payment") return "equal-payment";
  if (raw === "equal" || raw === "equal-principal") return "equal-principal";
  if (raw === "bullet") return "bullet";
  if (raw === "custom") return "custom";
  return "equal-payment";
}

/** Column spec matching `/operational/preview/project-irr` `npvColumns` (monthly dev/pre-op + FYE). */
export type FinancingPreviewIrrColumn =
  | { kind: "month"; k: string; month: number; phase: "development" | "preOp" }
  | {
      kind: "fye";
      k: string;
      oy: number;
      startMonth: number;
      endMonth: number;
      spreadsheetYear: number;
    };

export function buildFinancingPreviewIrrColumns(
  constructionPeriod: number
): FinancingPreviewIrrColumn[] {
  const cp = Math.max(0, constructionPeriod);
  const cols: FinancingPreviewIrrColumn[] = [];
  for (let m = 0; m <= cp; m++) {
    cols.push({ kind: "month", k: `dev-M${m}`, month: m, phase: "development" });
  }
  const devMonthCount = cp + 1;
  for (let i = 0; i < PRE_OPERATION_BUFFER_MONTHS; i++) {
    const m = devMonthCount + i;
    cols.push({ kind: "month", k: `pre-M${m}`, month: m, phase: "preOp" });
  }
  for (let oy = 1; oy <= OPERATIONAL_PERIOD_YEARS; oy++) {
    const { startMonth, endMonth } = getOperationalYearMonthRange(oy, cp);
    cols.push({
      kind: "fye",
      k: `opY${oy}-M${endMonth}`,
      oy,
      startMonth,
      endMonth,
      spreadsheetYear: 3 + oy,
    });
  }
  return cols;
}

/** Persist Component 4 KPIs from financing-engine rows (same math as `financialMetrics`). */
function buildProjectIrrUpdateFromEngineRows(
  rows: MonthlyRow[],
  options: {
    unleveredIRR?: number;
    preferenceCalculation?: ProjectMetrics["preferenceCalculation"];
  }
): Partial<ProjectIRR> {
  const sumRow = (key: keyof MonthlyRow) =>
    rows.reduce((total, month) => total + (Number(month[key]) || 0), 0);

  const totalEquityAmount =
    sumRow("capitalLand") + sumRow("capitalCash");

  const equityCashFlows = rows.map(
    (m) => m.equityCashFlow ?? m.irrCashFlow ?? 0
  );
  const totalEquityInvestedFromFlows = equityCashFlows
    .filter((v) => v < 0)
    .reduce((a, b) => a + Math.abs(b), 0);
  const totalDistributions = equityCashFlows
    .filter((v) => v > 0)
    .reduce((a, b) => a + b, 0);
  const equityMultiple =
    totalEquityInvestedFromFlows > 0
      ? totalDistributions / totalEquityInvestedFromFlows
      : 0;

  let equityPaybackMonth = -1;
  let cumulativeDist = 0;
  for (let i = 0; i < equityCashFlows.length; i++) {
    if (equityCashFlows[i] > 0) cumulativeDist += equityCashFlows[i];
    if (
      cumulativeDist >= totalEquityInvestedFromFlows &&
      totalEquityInvestedFromFlows > 0
    ) {
      equityPaybackMonth = i;
      break;
    }
  }

  const leveredEquityIRR =
    annualIrrPercentFromMonthlySeries(equityCashFlows) ?? 0;

  const peakEquityInjected = rows.reduce(
    (peak, r) => Math.max(peak, r.cumulativeCapital ?? 0),
    0
  );

  const totalEquityInvested =
    totalEquityAmount > 0 ? totalEquityAmount : totalEquityInvestedFromFlows;

  return {
    projectMetrics: {
      leveredEquityIRR,
      equityMultiple,
      equityPaybackMonth,
      peakEquityInjected,
      totalEquityInvested,
      totalDistributions,
      equityCashFlows,
      peakFunding: peakEquityInjected,
      ...(options.unleveredIRR != null
        ? { unleveredIRR: options.unleveredIRR }
        : {}),
      ...(options.preferenceCalculation != null
        ? { preferenceCalculation: options.preferenceCalculation }
        : {}),
    },
    cumulativeNcfPostFinancingByMonth: rows.map((r) => r.cumulativeNcf ?? 0),
    equityInjectionByMonth: rows.map(
      (r) => (r.capitalLand ?? 0) + (r.capitalCash ?? 0)
    ),
    monthlyData: rows.map((r) => ({
      month: r.month,
      equityInjection: (r.capitalLand ?? 0) + (r.capitalCash ?? 0),
      ncfPostFinancing: r.ncfAfterFinancing ?? 0,
      cumulativeNcfPostFinancing: r.cumulativeNcf ?? 0,
      principalRepayment: -(r.constLoanRepayment ?? 0),
    })),
  };
}

export type FinancingPreviewPageProps = {
  /** Match `/operational/preview/project-irr` column layout (M0…M{n}, pre-op buffer, FYE M columns). */
  useProjectIrrColumnLayout?: boolean;
};

function FinancingPreviewPageContent({
  useProjectIrrColumnLayout = false,
}: FinancingPreviewPageProps = {}) {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const router = useRouter();
  const searchParams = useSearchParams();
  const wizardParam = searchParams.get("wizard");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement | null>(null);

  // Load stores
  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const hotelHoldSnapshot = useFinModelStore((s) => s[finStream].hotelHoldSnapshot);
  const cashInflows = useFinModelStore((s) => s[finStream].cashInflows);
  const financing = useFinModelStore((s) => s[finStream].financing);
  const updateProjectIRR = useFinModelStore((s) => s.updateProjectIRR);
  const unleveredIRRFromStore = useFinModelStore(
    (s) => s[finStream].projectIRR.unleveredIRR
  );

  // Buyer down payment (Component 2, Step 5) - 100% direct to developer.
  const downPaymentMonths =
    cashInflows.downPaymentMonths && cashInflows.downPaymentMonths.length > 0
      ? cashInflows.downPaymentMonths
      : [0, 1, 2];
  const downPaymentMonthsCount = Math.max(1, downPaymentMonths.length);

  const overallDownPaymentPctOfNetSales =
    ((cashInflows.buyerMix.cashBuyerPercent ?? 0) / 100) *
      ((cashInflows.paymentPlans.cashDownPaymentPercent ?? 0) / 100) +
    ((cashInflows.buyerMix.mortgageBuyerPercent ?? 0) / 100) *
      ((cashInflows.paymentPlans.mortgageDownPaymentPercent ?? 0) / 100);

  const buyerDownPaymentStore = cashInflows.buyerDownPayment;
  const totalNetSalesForPreview = cashInflows.netProceeds || 0;
  const buyerDownPayment =
    Number.isFinite(buyerDownPaymentStore) && (buyerDownPaymentStore ?? 0) > 0
      ? Number(buyerDownPaymentStore ?? 0)
      : totalNetSalesForPreview * overallDownPaymentPctOfNetSales;

  // Land equity treatment (from wizard Step 2)
  const landEquityPercent = financing.landEquityPercent ?? 40;
  const landEquityAmount =
    (cashOutflows.landCost || 0) * (landEquityPercent / 100);
  const landRefinanceAmount =
    (cashOutflows.landCost || 0) * (1 - landEquityPercent / 100);
  const totalLandCost = cashOutflows.landCost || 0;

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("🔍 Land Financing Settings:");
    // eslint-disable-next-line no-console
    console.log("  landPaymentMethod:", financing.landPaymentMethod);
    // eslint-disable-next-line no-console
    console.log("  landLoanLtc:", financing.landLoanLtc);
    // eslint-disable-next-line no-console
    console.log("  landLoanRate:", financing.landLoanRate);
    // eslint-disable-next-line no-console
    console.log("  landAsCollateral:", financing.landAsCollateral);
    // eslint-disable-next-line no-console
    console.log("  Land Cost:", cashOutflows.landCost);
  }, [
    financing.landPaymentMethod,
    financing.landLoanLtc,
    financing.landLoanRate,
    financing.landAsCollateral,
    cashOutflows.landCost,
  ]);
  
  // Extract key values
  const totalCosts = cashOutflows.tdc || 
    (cashOutflows.landCost || 0) + 
    (cashOutflows.constructionCost || 0) + 
    (cashOutflows.softCosts || 0) + 
    (cashOutflows.powc || 0);
    
  const grossDevelopmentValue =
    cashInflows.grossSales ||
    (cashInflows.monthlyInflowSchedule?.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    ) || 0);
  const constructionPeriod =
    cashOutflows.constructionPeriod ??
    financing.constructionPeriodMonths ??
    30;
  const holdPeriodYears = financing.holdPeriodYears || 10;
  /** Last month of pre-op buffer (M41–M46 for 40M); operations begin next month — see `calculateOperationsStartMonth`. */
  const stabilizationEndMonth = calculateOperationsStartMonth(constructionPeriod) - 1;
  /** First month of hotel Operating Year 1 (same as Project IRR `npvColumns`). */
  const operationsStartMonth = calculateOperationsStartMonth(constructionPeriod);
  const repaymentHorizonMonths = Math.round(holdPeriodYears * 12);
  // Hold/repayment length (Step 7) runs after stabilization; keep legacy floor (c + 90) for short holds.
  const totalHoldPeriodMonths = Math.max(
    constructionPeriod + 90,
    stabilizationEndMonth + repaymentHorizonMonths
  );

  // Debt calculations
  const debtFromLTC = totalCosts * ((financing.loanToCostPercent || 65) / 100);
  const debtFromLTV = grossDevelopmentValue * ((financing.maxLtvPercent || 60) / 100);
  const approvedDebtAmount = Math.min(debtFromLTC, debtFromLTV);
  // Treat `0` as unset. Prefer Step 2 persisted facility, then legacy `debtFacilityAmount`, then recompute.
  const debtFacilityAmount =
    financing.approvedCreditFacility && financing.approvedCreditFacility > 0
      ? financing.approvedCreditFacility
      : financing.debtFacilityAmount && financing.debtFacilityAmount > 0
        ? financing.debtFacilityAmount
        : approvedDebtAmount;
  
  const effectiveInterestRate =
    financing.rateType === "floating"
      ? (financing.baseRatePercent || 0) + (financing.marginPercent || 0)
      : financing.fixedOrProfitRatePercent || 8;
    
  const amortizationPeriod = financing.amortizationYears || 7;
  const monthlyInterestRate = effectiveInterestRate / 100 / 12;
  
  // Loan at completion: prefer store's dynamic result (computed in Component 4 wizard),
  // otherwise fall back to the legacy approximation.
  // Union from wizard; default store was often stale before form→store sync on Step 5.
  const rawIdc = financing.idcTreatment;
  const idcTreatment: "capitalized" | "current" | "hybrid" =
    rawIdc === "current" ||
    rawIdc === "capitalized" ||
    rawIdc === "hybrid"
      ? rawIdc
      : "capitalized";
  const idcCapitalizedShare =
    idcTreatment === "current"
      ? 0
      : idcTreatment === "capitalized"
        ? 1
        : (financing.idcCapitalizedSharePercent ?? 100) / 100;

  // Legacy fallback if dynamic stack can't produce a value (should be rare).
  const averageDebtDrawdown = approvedDebtAmount * 0.5;
  const totalIDCApprox =
    averageDebtDrawdown * monthlyInterestRate * constructionPeriod;
  const idcAmountCapitalizedApprox = totalIDCApprox * idcCapitalizedShare;

  const loanAtCompletionLegacy =
    financing.loanAtCompletion ?? (debtFacilityAmount + idcAmountCapitalizedApprox);

  const repaymentStructure = financing.repaymentStructure || "fully-amortizing";
  const interestOnlyPeriodYears = financing.interestOnlyPeriodYears || 0;

  const outflowProfile = useMemo(
    () => buildCashOutflowProfile(cashOutflows),
    [cashOutflows]
  );

  // Same `detail` object as Component 2/3 previews (`buildSaleCashflowDetailProfile`).
  const detail = useMemo(
    () => buildSaleCashflowDetailProfile(cashOutflows, projectInfo),
    [cashOutflows, projectInfo]
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("📐 [Financing Detail Check]:", {
      constructionLength: detail.construction.length,
      powcLength: detail.powcTotal.length,
      construction_M0: detail.construction[0],
      powc_M0: detail.powcTotal[0],
      matchesUI:
        detail.construction[0] === 1119675 && detail.powcTotal[0] === 900384,
    });
  }, [detail]);

  /** Engine equity: persisted from Component 4 Step 3 (`financing.landEquityValue` / `financing.cashEquityRequired`). */
  const financingEngineEquityInputs = useMemo(() => {
    const lc = cashOutflows.landCost || 0;
    const pct = financing.landEquityPercent ?? 100;
    const landEquityValue =
      pct >= 100
        ? lc
        : financing.landEquityValue ?? lc * (pct / 100);
    const cashEquityRequired = financing.cashEquityRequired ?? 0;
    return { landEquityValue, cashEquityRequired };
  }, [cashOutflows.landCost, financing]);

  /** Single source of truth for construction-month total cash cost out (M0..M{constructionPeriod}); from `buildCashOutflowProfile`. */
  const calculateTotalOutflow = useMemo(
    () => outflowProfile.monthlyTotal,
    [outflowProfile.monthlyTotal]
  );

  // Construction cost schedule aligned to month index (M0 = 0, M1..Mn align to index 1..n)
  // If the store ever provides a precomputed schedule, prefer it; otherwise fall back to
  // the exact same schedule used by `/preview/cash-outflows` (via `buildCashOutflowProfile`).
  const constructionCostSchedule = useMemo(() => {
    const schedule = Array(totalHoldPeriodMonths + 1).fill(0);
    const scheduleMaybe = (cashOutflows as any)?.constructionSchedule;

    if (Array.isArray(scheduleMaybe)) {
      for (const entry of scheduleMaybe) {
        const month = Number(entry?.month ?? entry?.m ?? 0);
        const amount = Number(entry?.amount ?? entry?.value ?? 0);
        if (Number.isFinite(month) && month >= 0 && month < schedule.length) {
          schedule[month] += Number.isFinite(amount) ? amount : 0;
        }
      }
    } else {
      // Fallback: aligned array from `buildCashOutflowProfile`
      for (let m = 0; m < schedule.length; m++) {
        schedule[m] = outflowProfile.construction?.[m] || 0;
      }
    }

    // Reconcile construction schedule to exact total (same intent as cash-outflows preview).
    const expected = cashOutflows.constructionCost || 0;
    const actual = schedule.reduce((sum, v) => sum + (v || 0), 0);
    const diff = expected - actual;
    const lastConstructionMonth = Math.min(constructionPeriod, schedule.length - 1);
    if (Math.abs(diff) > 1 && lastConstructionMonth >= 0) {
      schedule[lastConstructionMonth] += diff;
    }

    return schedule;
  }, [cashOutflows, outflowProfile.construction, totalHoldPeriodMonths]);

  // Component 2 already generates the monthly inflow schedule for the sale timing.
  // For this preview we split each month's total inflow into "unit" vs "bulk"
  // using the bulk share percentage (so the table can show both lines).
  const bulkShare = (cashInflows.bulkSales?.bulkSalesSharePercent ?? 0) / 100;
  const inflowScheduleMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of cashInflows.monthlyInflowSchedule || []) {
      const prev = map.get(p.month) || 0;
      map.set(p.month, prev + (p.amount || 0));
    }
    return map;
  }, [cashInflows.monthlyInflowSchedule]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("🔍 inflowScheduleMap size:", inflowScheduleMap.size);
    // eslint-disable-next-line no-console
    console.log(
      "🔍 First 10 months sales:",
      Array.from({ length: 10 }, (_, i) => `M${i}: ${((inflowScheduleMap.get(i) || 0) / 1000)}k`).join(
        ", "
      )
    );
    // eslint-disable-next-line no-console
    console.log(
      "🔍 cashInflows.monthlyInflowSchedule:",
      cashInflows.monthlyInflowSchedule?.slice(0, 5)
    );
  }, [inflowScheduleMap, cashInflows.monthlyInflowSchedule]);

  // ============================================================================
  // DYNAMIC FUNDING STACK CALCULATION (single source of truth)
  // ============================================================================
  const dynamicFundingStack = useMemo(() => {
    const stack: any[] = [];

    const maxDebtFacility = debtFacilityAmount;
    const commitmentFeeRateMonthly =
      ((financing.commitmentFeeRate ?? 1.0) / 100) / 12;
    const monthlyRate = monthlyInterestRate;

    const equityFirstDraw = financing.equityFirstDraw ?? true;
    const salesReduceEquity = financing.salesReduceEquity ?? true;
    const reimbursementModel = financing.reimbursementModel ?? true;
    const salesReduceDebt = financing.salesReduceDebt ?? false;

    const costSchedule = outflowProfile.monthlyTotal || [];
    const softCostSchedule = outflowProfile.softCosts || [];
    const powcSchedule = outflowProfile.powc || [];
    /** 30/70 eligible costs: CC + SC + POWC by month (excludes land — not in these series). */
    const sumCcScPowcInclusive = (fromM: number, toM: number) => {
      let total = 0;
      for (let mo = fromM; mo <= toM; mo++) {
        total +=
          (constructionCostSchedule[mo] || 0) +
          (softCostSchedule[mo] || 0) +
          (powcSchedule[mo] || 0);
      }
      return total;
    };
    // ✅ Transform monthly inflow schedule into a month-indexed sales array
    // (the source is `[{ month, amount }, ...]`, but recycling math expects `[amountByMonth]`).
    const monthlyInflowSchedule = cashInflows?.monthlyInflowSchedule || [];
    const salesByMonth = Array(totalHoldPeriodMonths + 1).fill(0);
    monthlyInflowSchedule.forEach((item: { month: number; amount: number }) => {
      if (
        item.month >= 0 &&
        item.month <= totalHoldPeriodMonths
      ) {
        salesByMonth[item.month] = item.amount || 0;
      }
    });
    // eslint-disable-next-line no-console
    console.log("🔍 Sales Data Transformation:");
    // eslint-disable-next-line no-console
    console.log("  monthlyInflowSchedule length:", monthlyInflowSchedule.length);
    // eslint-disable-next-line no-console
    console.log("  salesByMonth length:", salesByMonth.length);
    // eslint-disable-next-line no-console
    console.log("  salesByMonth[M20-M30]:", salesByMonth.slice(20, 31));
    // eslint-disable-next-line no-console
    console.log(
      "  Total Sales M0-M30:",
      salesByMonth.slice(0, 31).reduce((s, v) => s + v, 0)
    );

    const tdc = cashOutflows.tdc || totalCosts;
    const landCost = cashOutflows.landCost || 0;
    const maxEquityBase = Math.max(0, tdc - maxDebtFacility);

    /** Step 4 quarterly anchors (matches Component 4 `quarterlyPreview`). */
    const quarterlyScheduleMonths: number[] = [];
    if (financing.drawdownActiveTab === "quarterly") {
      const first = Math.max(
        0,
        Math.min(
          constructionPeriod,
          Math.round(Number(financing.drawdownQuarterly?.firstMonth ?? 0))
        )
      );
      const last = Math.max(
        0,
        Math.min(
          constructionPeriod,
          Math.round(
            Number(financing.drawdownQuarterly?.lastMonth ?? constructionPeriod)
          )
        )
      );
      if (first <= last) {
        for (let mm = first; mm <= last; mm += 3) {
          quarterlyScheduleMonths.push(mm);
        }
        if (
          quarterlyScheduleMonths.length > 0 &&
          quarterlyScheduleMonths[quarterlyScheduleMonths.length - 1] !== last
        ) {
          quarterlyScheduleMonths.push(last);
        }
      }
    }

    /** Operational preview: equal split of senior facility on quarterly months — no 30/70 reimbursement math. */
    const useOperationalSimpleQuarterly =
      finStream === "operational" &&
      financing.drawdownActiveTab === "quarterly" &&
      quarterlyScheduleMonths.length > 0;

    if (useOperationalSimpleQuarterly) {
      const drawSet = new Set(quarterlyScheduleMonths);
      const seniorFacility = Math.max(0, maxDebtFacility);
      const perDraw = seniorFacility / quarterlyScheduleMonths.length;

      let cumDebtDrawn = 0;
      let cumLandLoanDrawn = 0;
      let cumCapitalizedIDC = 0;
      let cumEquityBase = 0;
      let cumExtraEquity = 0;
      let cumInterestCostConstruction = 0;
      let cumInterestPaidConstruction = 0;
      let cumCommitmentFeePaid = 0;
      let cumBaseCosts = 0;
      let cumSales = 0;

      for (let m = 0; m <= totalHoldPeriodMonths; m++) {
        const landInSchedule = m === 0 ? totalLandCost : 0;
        const baseCostThisMonth = (costSchedule[m] || 0) - landInSchedule;
        const salesThisMonth = salesByMonth[m] || 0;
        cumBaseCosts += baseCostThisMonth;
        cumSales += salesThisMonth;

        const landLoanDrawThisMonth = m === 0 ? landRefinanceAmount : 0;
        const landEquityThisMonth = m === 0 ? landEquityAmount : 0;
        cumLandLoanDrawn += landLoanDrawThisMonth;
        cumEquityBase += landEquityThisMonth;

        const isConstructionMonth = m <= constructionPeriod;

        let debtDrawThisMonth = 0;
        if (isConstructionMonth && drawSet.has(m)) {
          const headroom = Math.max(0, seniorFacility - cumDebtDrawn);
          debtDrawThisMonth = Math.min(perDraw, headroom);
        }
        cumDebtDrawn += debtDrawThisMonth;

        const outstanding = cumDebtDrawn + cumLandLoanDrawn + cumCapitalizedIDC;
        const interestCost = isConstructionMonth ? outstanding * monthlyRate : 0;
        const interestCapitalized = interestCost * idcCapitalizedShare;
        const interestPaid = interestCost - interestCapitalized;
        cumInterestCostConstruction += interestCost;
        cumCapitalizedIDC += interestCapitalized;
        cumInterestPaidConstruction += interestPaid;

        const undrawnFacility = Math.max(0, seniorFacility - cumDebtDrawn);
        const commitmentFee = isConstructionMonth
          ? undrawnFacility * commitmentFeeRateMonthly
          : 0;
        cumCommitmentFeePaid += commitmentFee;

        const cumulativeCosts =
          cumBaseCosts + cumInterestPaidConstruction + cumCommitmentFeePaid;
        const rawFundingGap =
          cumulativeCosts -
          cumSales -
          (cumDebtDrawn + cumLandLoanDrawn + cumEquityBase + cumExtraEquity);
        const equityExtraThisMonth = rawFundingGap > 0 ? rawFundingGap : 0;
        cumExtraEquity += equityExtraThisMonth;

        const equityOutflowThisMonth = equityExtraThisMonth;

        stack.push({
          month: m,
          reimbursementMilestoneLabel: drawSet.has(m)
            ? `Quarterly M${m}`
            : undefined,
          cumulativeCosts,
          cumulativeSales: cumSales,
          debtDrawThisMonth: debtDrawThisMonth + landLoanDrawThisMonth,
          cumulativeDebtDrawn: cumDebtDrawn + cumLandLoanDrawn,
          landLoanDrawThisMonth,
          cumulativeLandLoanDrawn: cumLandLoanDrawn,
          landEquityThisMonth,
          equityThisMonth: equityOutflowThisMonth,
          equityOutflowThisMonth,
          cumulativeEquity: cumEquityBase + cumExtraEquity,
          interestCost,
          interestPaid,
          interestCapitalized,
          commitmentFee,
          totalFinancingCost: interestCost + commitmentFee,
          fundingGap: Math.max(0, rawFundingGap - equityExtraThisMonth),
        });
      }

      const peakEquityRequired = stack.reduce(
        (max, d) => Math.max(max, d.cumulativeEquity),
        0
      );
      const loanAtCompletion = cumDebtDrawn + cumLandLoanDrawn + cumCapitalizedIDC;

      return {
        stack,
        peakEquityRequired,
        totalInterestPaid: cumInterestCostConstruction,
        totalCommitmentFeePaid: cumCommitmentFeePaid,
        loanAtCompletion,
      };
    }

    /** Operational preview: Step 4 S-curve or custom % schedule — matches wizard `monthlyDrawdowns` (sums to 100%). */
    const pctScheduleRaw = financing.monthlyDrawdowns ?? [];
    const useOperationalScheduledPct =
      finStream === "operational" &&
      (financing.drawdownActiveTab === "scurve" ||
        financing.drawdownActiveTab === "custom") &&
      pctScheduleRaw.length > 0;

    if (useOperationalScheduledPct) {
      const seniorFacility = Math.max(0, maxDebtFacility);

      let cumDebtDrawn = 0;
      let cumLandLoanDrawn = 0;
      let cumCapitalizedIDC = 0;
      let cumEquityBase = 0;
      let cumExtraEquity = 0;
      let cumInterestCostConstruction = 0;
      let cumInterestPaidConstruction = 0;
      let cumCommitmentFeePaid = 0;
      let cumBaseCosts = 0;
      let cumSales = 0;

      for (let m = 0; m <= totalHoldPeriodMonths; m++) {
        const landInSchedule = m === 0 ? totalLandCost : 0;
        const baseCostThisMonth = (costSchedule[m] || 0) - landInSchedule;
        const salesThisMonth = salesByMonth[m] || 0;
        cumBaseCosts += baseCostThisMonth;
        cumSales += salesThisMonth;

        const landLoanDrawThisMonth = m === 0 ? landRefinanceAmount : 0;
        const landEquityThisMonth = m === 0 ? landEquityAmount : 0;
        cumLandLoanDrawn += landLoanDrawThisMonth;
        cumEquityBase += landEquityThisMonth;

        const isConstructionMonth = m <= constructionPeriod;

        const pctThis =
          m < pctScheduleRaw.length
            ? Math.max(0, Number(pctScheduleRaw[m]) || 0)
            : 0;
        let debtDrawThisMonth = 0;
        if (isConstructionMonth && pctThis > 0) {
          const targetDraw = seniorFacility * (pctThis / 100);
          const headroom = Math.max(0, seniorFacility - cumDebtDrawn);
          debtDrawThisMonth = Math.min(targetDraw, headroom);
        }
        cumDebtDrawn += debtDrawThisMonth;

        const outstanding = cumDebtDrawn + cumLandLoanDrawn + cumCapitalizedIDC;
        const interestCost = isConstructionMonth ? outstanding * monthlyRate : 0;
        const interestCapitalized = interestCost * idcCapitalizedShare;
        const interestPaid = interestCost - interestCapitalized;
        cumInterestCostConstruction += interestCost;
        cumCapitalizedIDC += interestCapitalized;
        cumInterestPaidConstruction += interestPaid;

        const undrawnFacility = Math.max(0, seniorFacility - cumDebtDrawn);
        const commitmentFee = isConstructionMonth
          ? undrawnFacility * commitmentFeeRateMonthly
          : 0;
        cumCommitmentFeePaid += commitmentFee;

        const cumulativeCosts =
          cumBaseCosts + cumInterestPaidConstruction + cumCommitmentFeePaid;
        const rawFundingGap =
          cumulativeCosts -
          cumSales -
          (cumDebtDrawn + cumLandLoanDrawn + cumEquityBase + cumExtraEquity);
        const equityExtraThisMonth = rawFundingGap > 0 ? rawFundingGap : 0;
        cumExtraEquity += equityExtraThisMonth;

        const equityOutflowThisMonth = equityExtraThisMonth;

        const schedLabel =
          financing.drawdownActiveTab === "scurve"
            ? `S-Curve M${m}`
            : `Custom M${m}`;

        stack.push({
          month: m,
          reimbursementMilestoneLabel:
            isConstructionMonth && pctThis > 0 ? schedLabel : undefined,
          cumulativeCosts,
          cumulativeSales: cumSales,
          debtDrawThisMonth: debtDrawThisMonth + landLoanDrawThisMonth,
          cumulativeDebtDrawn: cumDebtDrawn + cumLandLoanDrawn,
          landLoanDrawThisMonth,
          cumulativeLandLoanDrawn: cumLandLoanDrawn,
          landEquityThisMonth,
          equityThisMonth: equityOutflowThisMonth,
          equityOutflowThisMonth,
          cumulativeEquity: cumEquityBase + cumExtraEquity,
          interestCost,
          interestPaid,
          interestCapitalized,
          commitmentFee,
          totalFinancingCost: interestCost + commitmentFee,
          fundingGap: Math.max(0, rawFundingGap - equityExtraThisMonth),
        });
      }

      const peakEquityRequired = stack.reduce(
        (max, d) => Math.max(max, d.cumulativeEquity),
        0
      );
      const loanAtCompletion = cumDebtDrawn + cumLandLoanDrawn + cumCapitalizedIDC;

      return {
        stack,
        peakEquityRequired,
        totalInterestPaid: cumInterestCostConstruction,
        totalCommitmentFeePaid: cumCommitmentFeePaid,
        loanAtCompletion,
      };
    }

    // Hybrid milestone months: S-curve from monthly costs + certification interval (or manual override)
    const milestoneComputed = computeReimbursementMilestones({
      autoCalculateMilestoneMonths:
        financing.autoCalculateMilestoneMonths ?? true,
      milestoneThresholds: financing.milestoneThresholds ?? [30, 60, 90, 100],
      certificationInterval: financing.certificationInterval ?? 3,
      overrideMilestoneMonths: financing.overrideMilestoneMonths ?? null,
      costSchedule,
      totalLandCost,
      landCost,
      constructionPeriod,
      tdc,
    });
    let reimbursementMilestones = milestoneComputed.milestones;

    /** Sale stream: quarterly months replace hybrid milestones (30/70 still applies to draws). */
    if (quarterlyScheduleMonths.length > 0 && finStream !== "operational") {
      reimbursementMilestones = quarterlyScheduleMonths.map((month) => ({
        month,
        label: `Quarterly M${month}`,
        thresholdPct: null,
      }));
    }

    const reimbursementMilestoneMonths = new Set(
      reimbursementMilestones.map((x) => x.month)
    );
    // Default S-curve milestones: no debt draw at M0. Quarterly schedule includes M0 when Step 4 says so.
    const reimbursementDrawdownMonths =
      quarterlyScheduleMonths.length > 0
        ? new Set(quarterlyScheduleMonths)
        : new Set(
            reimbursementMilestones
              .filter((x) => x.month !== 0)
              .map((x) => x.month)
          );

    // Canonical drawdown methodology (must match sales recycling + 30/70 milestone logic).
    const drawdownModelEffective =
      financing.drawdownModel ??
      (reimbursementModel ? "milestone-30-70" : "equity-first-gap-fill");
    const isMilestone3070Model = drawdownModelEffective === "milestone-30-70";

    // ============================================
    // FULL FACILITY SIZE (committed line for 30/70 revolving — commitment fee base)
    // ============================================
    const totalConstructionCosts =
      (cashOutflows.constructionCost || 0) +
      (cashOutflows.softCosts || 0) +
      (cashOutflows.powc || 0);
    const landRefinancePortion =
      (cashOutflows.landCost || 0) *
      (1 - (financing.landEquityPercent ?? 100) / 100);
    const fullFacilitySize = totalConstructionCosts * 0.7 + landRefinancePortion;

    /* eslint-disable no-console */
    console.log("🏦 Full Facility Size Calculation:");
    console.log("  totalConstructionCosts (CC+SC+POWC):", totalConstructionCosts);
    console.log("  70% of construction bucket:", totalConstructionCosts * 0.7);
    console.log("  landRefinancePortion:", landRefinancePortion);
    console.log("  fullFacilitySize:", fullFacilitySize);
    /* eslint-enable no-console */

    let cumBaseCosts = 0;
    let cumSales = 0;
    let cumDebtDrawn = 0;
    let cumCapitalizedIDC = 0;
    let cumEquityBase = 0;
    let cumExtraEquity = 0;
    let cumInterestPaidConstruction = 0;
    let cumInterestCostConstruction = 0;
    let cumCommitmentFeePaid = 0;
    let peakBaseNetNeed = 0;
    let cumLandLoanDrawn = 0;
    // Reimbursement sales treatment (unit sales only):
    // - Buyer down payment: 100% direct to developer (never escrowed)
    // - Remaining sales proceeds: 20% direct developer / 80% escrow,
    //   escrow released only on milestone months
    let cumDeveloperDeposit = 0;
    let cumEscrowHeld = 0;
    let cumEscrowReleased = 0;

    // Track base costs + sales since the last reimbursement milestone drawdown.
    // Used to apply the `salesReduceEquity` toggle in the 30/70 milestone model.
    let lastMilestoneMonth = 0;
    let costsSinceLastMilestone = 0;
    let salesSinceLastMilestone = 0;

    for (let m = 0; m <= totalHoldPeriodMonths; m++) {
      // DEBUG: Trace milestone detection (construction months only — full loop is 0..totalHoldPeriodMonths)
      if (m <= constructionPeriod) {
        /* eslint-disable no-console */
        console.log("🔍 Loop Month M" + m + ":");
        console.log("  financing.drawdownModel:", financing.drawdownModel);
        console.log("  reimbursementModel:", reimbursementModel);

        const milestone = reimbursementMilestones?.find((ml) => ml.month === m);
        console.log(
          "  milestone found:",
          milestone
            ? "YES (month=" + milestone.month + ")"
            : "NO"
        );

        // User trace: optional triggerDrawdown (not on ReimbursementMilestone type — defaults to allow)
        const triggerDrawdownOk =
          (milestone as { triggerDrawdown?: boolean } | undefined)
            ?.triggerDrawdown !== false;
        const isMilestoneMonth =
          !!milestone &&
          triggerDrawdownOk &&
          reimbursementModel &&
          m > 0;
        console.log("  isMilestoneMonth (milestone+trigger):", isMilestoneMonth);

        // Actual equity/draw logic uses reimbursementDrawdownMonths (excludes M0)
        const isDrawdownMonth = reimbursementDrawdownMonths.has(m);
        console.log("  reimbursementDrawdownMonths.has(m):", isDrawdownMonth);

        if (isMilestoneMonth && isDrawdownMonth) {
          console.log("  ✅✅✅ MILESTONE DRAWDOWN at M" + m);
        }
        /* eslint-enable no-console */
      }

      // Remove land from schedule and fund it explicitly at M0 based on slider split.
      const landInSchedule = m === 0 ? totalLandCost : 0;
      const baseCostThisMonth = (costSchedule[m] || 0) - landInSchedule;
      const salesThisMonth = salesByMonth[m] || 0;

      cumBaseCosts += baseCostThisMonth;
      cumSales += salesThisMonth;

      // Only accumulate between milestone drawdowns.
      // Include the current month so the milestone draw can account for
      // sales/costs from (lastMilestoneMonth+1 .. m).
      if (m > lastMilestoneMonth) {
        costsSinceLastMilestone += baseCostThisMonth;
        salesSinceLastMilestone += salesThisMonth;
      }

      // Split unit sales for deposit/escrow treatment.
      // bulkShare is defined outside dynamicFundingStack and represents the portion
      // of monthly inflow that is "bulk" (not part of unit escrow logic).
      const unitSalesThisMonth = salesThisMonth * (1 - bulkShare);

      if (reimbursementModel) {
        const downPaymentThisMonthRaw = downPaymentMonths.includes(m)
          ? buyerDownPayment / downPaymentMonthsCount
          : 0;
        const downPaymentThisMonth = Math.min(
          unitSalesThisMonth,
          Math.max(0, downPaymentThisMonthRaw)
        );

        const remainingUnitSalesThisMonth = Math.max(
          0,
          unitSalesThisMonth - downPaymentThisMonth
        );

        const developerDeposit =
          downPaymentThisMonth + remainingUnitSalesThisMonth * 0.2;
        const escrowThisMonth = remainingUnitSalesThisMonth * 0.8;

        cumDeveloperDeposit += developerDeposit;
        cumEscrowHeld += escrowThisMonth;

        // Release escrow only at drawdown milestone months (M0 is display-only).
        if (reimbursementDrawdownMonths.has(m)) {
          cumEscrowReleased += cumEscrowHeld;
          cumEscrowHeld = 0;
        }
      }

      // Land is funded at M0.
      // - Equity-first model: apply landEquityPercent split at M0 (debt refinance also at M0).
      // - 30/70 milestone reimbursement model: NO debt draw at M0; land is paid by equity
      //   and reimbursed via milestone drawdowns later.
      const landLoanDrawThisMonth =
        m === 0 && !reimbursementModel ? landRefinanceAmount : 0;
      const landEquityThisMonth =
        m === 0 && reimbursementModel ? totalLandCost : m === 0 ? landEquityAmount : 0;
      cumLandLoanDrawn += landLoanDrawThisMonth;
      cumEquityBase += landEquityThisMonth;

      const cumTotalProjectCost = landCost + cumBaseCosts;

      const shouldDebug =
        m < 6 || salesThisMonth > 0 || m === constructionPeriod;
      if (shouldDebug) {
        // eslint-disable-next-line no-console
        console.log("🔍 [dynamicFundingStack] month:", m, {
          salesThisMonth,
          cumSales,
          cumBaseCosts,
          cumTotalProjectCost,
          reimbursementModel,
        });
      }

      let debtDrawThisMonth = 0;
      let equityBaseThisMonth = 0;
      /** When 30/70 sales recycling runs, equity outflow must tie to this (not targetEquity − cumEquity alone). */
      let segmentMilestoneEquity: {
        baseEquityOutflow: number;
        equityReduction: number;
      } | null = null;

      if (reimbursementModel) {
        const isMilestoneDraw = reimbursementDrawdownMonths.has(m);
        const firstProgressMilestoneMonth =
          quarterlyScheduleMonths.length > 0
            ? quarterlyScheduleMonths[0]!
            : financing.firstDrawdownMonth ??
              reimbursementMilestones.find((x) => x.month > 0)?.month ??
              10;
        const isFirstProgressMilestone = m === firstProgressMilestoneMonth;
        const landEquityPct = financing.landEquityPercent ?? 40;
        const landRefinanceAtFirstMilestone =
          (cashOutflows.landCost || 0) * ((100 - landEquityPct) / 100);
        const priorTotalDebt = cumDebtDrawn + cumLandLoanDrawn;

        if (isMilestone3070Model && isMilestoneDraw) {
          // AUTOMATIC 30/70 reimbursement: eligible = CC + SC + POWC (by month), not land.
          // Land is reimbursed separately via landRefinanceThisDraw. Do NOT use costSchedule (includes land at M0).
          const eligibleCostsSinceLastMilestone = isFirstProgressMilestone
            ? sumCcScPowcInclusive(0, m)
            : sumCcScPowcInclusive(lastMilestoneMonth + 1, m);

          const bankReimbursement = eligibleCostsSinceLastMilestone * 0.7;
          const developerShare = eligibleCostsSinceLastMilestone * 0.3;

          const landRefinanceThisDraw =
            isFirstProgressMilestone && landEquityPct < 100
              ? landRefinanceAtFirstMilestone
              : 0;

          const grossMilestoneDebt = bankReimbursement + landRefinanceThisDraw;
          // Milestone 30/70: reimbursement draw is automatic (70% + land refi). Do not net it down
          // with escrow release — that was zeroing netMilestoneDebt when sales/escrow were large.
          const escrowToDebtOnDraw = 0;
          const netMilestoneDebt = grossMilestoneDebt;
          const headroom = Math.max(0, maxDebtFacility - priorTotalDebt);

          const actualDrawdown = Math.min(netMilestoneDebt, headroom);
          debtDrawThisMonth = actualDrawdown;
          cumDebtDrawn += debtDrawThisMonth;

          if (m === 10 && isMilestone3070Model) {
            /* eslint-disable no-console */
            console.log("🔐 M10 Assignment Lock:");
            console.log("  grossMilestoneDebt:", grossMilestoneDebt);
            console.log("  netMilestoneDebt (after escrow):", netMilestoneDebt);
            console.log("  maxDebtFacility:", maxDebtFacility);
            console.log("  priorTotalDebt:", priorTotalDebt);
            console.log("  headroom:", headroom);
            console.log("  actualDrawdown:", actualDrawdown);
            console.log("  debtDrawThisMonth (after assignment):", debtDrawThisMonth);
            console.log("  cumDebtDrawn (after +=):", cumDebtDrawn);
            if (netMilestoneDebt > 1000 && debtDrawThisMonth === 0) {
              console.error(
                "🚨 CRITICAL: netMilestoneDebt > 0 but debtDrawThisMonth = 0 (facility headroom exhausted or cap)."
              );
            }
            /* eslint-enable no-console */
          }

          // Sales recycling: sum Component 2 inflows in-window (fixes unit/escrow-only accumulator = 0).
          let salesForRecycling = 0;
          for (const i of monthlyInflowSchedule) {
            const mo = i.month;
            if (mo < 0 || mo > m) continue;
            if (!isFirstProgressMilestone && mo <= lastMilestoneMonth) continue;
            salesForRecycling += i.amount || 0;
          }

          const equityReduction =
            financing.salesReduceEquity && salesForRecycling > 0
              ? Math.min(salesForRecycling, developerShare)
              : 0;
          equityBaseThisMonth = Math.max(0, developerShare - equityReduction);
          segmentMilestoneEquity = {
            baseEquityOutflow: developerShare,
            equityReduction,
          };

          cumEquityBase += equityBaseThisMonth;
          lastMilestoneMonth = m;
          costsSinceLastMilestone = 0;
          salesSinceLastMilestone = 0;

          /* eslint-disable no-console */
          console.log("🚨 30/70 MILESTONE at M" + m + " (CC+SC+POWC, land separate):", {
            isFirstProgressMilestone,
            lastMilestoneMonth,
            eligibleCostsSinceLastMilestone,
            source: "constructionCostSchedule + softCosts + powc",
            bankReimbursement,
            developerShare,
            landRefinanceThisDraw,
            grossMilestoneDebt,
            escrowToDebtOnDraw,
            netMilestoneDebt,
            headroom,
            actualDrawdown,
            debtDrawThisMonth,
            equityBaseThisMonth,
            salesReduceEquity: financing.salesReduceEquity,
            salesForRecycling,
          });
          /* eslint-enable no-console */
        } else if (isMilestone3070Model && !isMilestoneDraw) {
          debtDrawThisMonth = 0;
          equityBaseThisMonth = 0;
        } else {
          // Legacy: reimbursement without explicit milestone-30-70 — LTC-style cumulative targets.
          const grossDebtCumulativeBeforeEscrow = Math.min(
            maxDebtFacility,
            0.7 * (cumTotalProjectCost - landCost) +
              (m >= firstProgressMilestoneMonth ? landRefinanceAtFirstMilestone : 0)
          );

          if (isFirstProgressMilestone) {
            // eslint-disable-next-line no-console
            console.log("🔍 M10 Land Refinance Calculation:", {
              m,
              firstProgressMilestoneMonth,
              landEquityPercent: landEquityPct,
              landRefinancePercent: 100 - landEquityPct,
              landCost: cashOutflows.landCost || 0,
              landRefinanceAmount: landRefinanceAtFirstMilestone,
            });
          }

          const escrowToDebt =
            salesReduceDebt
              ? Math.min(cumEscrowReleased, grossDebtCumulativeBeforeEscrow)
              : 0;

          const targetDebtCumulative =
            grossDebtCumulativeBeforeEscrow - escrowToDebt;

          const grossEquityCumulative =
            m === 0
              ? cumTotalProjectCost
              : totalLandCost + 0.3 * (cumTotalProjectCost - landCost);

          const escrowRemainderToEquity = salesReduceDebt
            ? Math.max(0, cumEscrowReleased - escrowToDebt)
            : cumEscrowReleased;

          const targetEquityCumulative = Math.max(
            0,
            grossEquityCumulative - cumDeveloperDeposit - escrowRemainderToEquity
          );

          debtDrawThisMonth = isMilestoneDraw
            ? Math.max(0, targetDebtCumulative - priorTotalDebt)
            : 0;
          if (isMilestoneDraw) {
            cumDebtDrawn += debtDrawThisMonth;
          }

          equityBaseThisMonth = isMilestoneDraw
            ? Math.max(0, targetEquityCumulative - cumEquityBase)
            : 0;
          if (isMilestoneDraw) {
            cumEquityBase += equityBaseThisMonth;
            lastMilestoneMonth = m;
            costsSinceLastMilestone = 0;
            salesSinceLastMilestone = 0;
          }
        }

        // Only used for internal peak tracking (not returned directly).
        const netNeedBase = Math.max(0, cumTotalProjectCost - cumEscrowReleased);
        peakBaseNetNeed = Math.max(peakBaseNetNeed, netNeedBase);

        if (shouldDebug && !isMilestone3070Model) {
          const grossDebtCumulativeBeforeEscrow = Math.min(
            maxDebtFacility,
            0.7 * (cumTotalProjectCost - landCost) +
              (m >= firstProgressMilestoneMonth ? landRefinanceAtFirstMilestone : 0)
          );
          const escrowToDebt =
            salesReduceDebt
              ? Math.min(cumEscrowReleased, grossDebtCumulativeBeforeEscrow)
              : 0;
          const targetDebtCumulative =
            grossDebtCumulativeBeforeEscrow - escrowToDebt;
          const grossEquityCumulative =
            m === 0
              ? cumTotalProjectCost
              : totalLandCost + 0.3 * (cumTotalProjectCost - landCost);
          const escrowRemainderToEquity = salesReduceDebt
            ? Math.max(0, cumEscrowReleased - escrowToDebt)
            : cumEscrowReleased;
          const targetEquityCumulative = Math.max(
            0,
            grossEquityCumulative - cumDeveloperDeposit - escrowRemainderToEquity
          );
          // eslint-disable-next-line no-console
          console.log("🔍 [30/70] targetDebt/totalDebt/equity:", {
            targetDebtCumulative,
            debtDrawThisMonth,
            targetEquityCumulative,
            cumEquityBase,
          });
        }
      } else {
        // Net funding need after applying sales (equity recycling) and land refinance proceeds.
        const netNeedBase = Math.max(
          0,
          cumBaseCosts -
            (salesReduceEquity ? cumSales : 0) -
            cumLandLoanDrawn
        );

        const grossNeedBase = Math.max(0, cumBaseCosts - cumLandLoanDrawn);
        peakBaseNetNeed = Math.max(peakBaseNetNeed, netNeedBase);

        if (shouldDebug) {
          // eslint-disable-next-line no-console
          console.log("🔍 [dynamicFundingStack] netNeedBase / peak:", {
            netNeedBase,
            peakBaseNetNeed,
            salesReduceEquity,
            maxDebtFacility,
            maxEquityBase,
          });
        }

        let desiredDebtCumulative = 0;
        if (equityFirstDraw) {
          const effectiveMaxEquityBase = Math.max(
            0,
            maxEquityBase - (salesReduceEquity ? cumSales : 0)
          );
          desiredDebtCumulative = Math.min(
            maxDebtFacility,
            Math.max(0, netNeedBase - effectiveMaxEquityBase)
          );
        } else {
          desiredDebtCumulative = Math.min(maxDebtFacility, netNeedBase);
        }
        desiredDebtCumulative = Math.max(0, desiredDebtCumulative);

        debtDrawThisMonth = Math.max(
          0,
          desiredDebtCumulative - cumDebtDrawn
        );
        cumDebtDrawn += debtDrawThisMonth;

        const desiredEquityBaseCumulative = Math.max(
          0,
          netNeedBase - desiredDebtCumulative
        );
        equityBaseThisMonth = Math.max(
          0,
          desiredEquityBaseCumulative - cumEquityBase
        );
        cumEquityBase += equityBaseThisMonth;
      }

      // Interest accrued on actual outstanding (including refinanced land + capitalized IDC).
      const outstanding = cumDebtDrawn + cumLandLoanDrawn + cumCapitalizedIDC;
      const isConstructionMonth = m <= constructionPeriod;
      const interestCost = isConstructionMonth ? outstanding * monthlyRate : 0;
      const interestCapitalized = interestCost * idcCapitalizedShare;
      const interestPaid = interestCost - interestCapitalized;

      cumInterestCostConstruction += interestCost;
      cumCapitalizedIDC += interestCapitalized;
      cumInterestPaidConstruction += interestPaid;

      // Commitment fee: 30/70 revolving — undrawn vs full committed facility (70% CC+SC+POWC + land refi);
      // other models — undrawn vs approved facility (senior draws only, legacy).
      const cumulativeDrawdowns = cumDebtDrawn + cumLandLoanDrawn;
      const undrawnFacility = isMilestone3070Model
        ? Math.max(0, fullFacilitySize - cumulativeDrawdowns)
        : Math.max(0, maxDebtFacility - cumDebtDrawn);
      const commitmentFee = isConstructionMonth
        ? undrawnFacility * commitmentFeeRateMonthly
        : 0;
      cumCommitmentFeePaid += commitmentFee;

      // Total cash costs that must be funded: base costs + cash interest (if any) + commitment fee.
      const cumulativeCosts =
        cumBaseCosts + cumInterestPaidConstruction + cumCommitmentFeePaid;
      const cumulativeSalesForDisplay = reimbursementModel
        ? cumDeveloperDeposit + cumEscrowReleased
        : cumSales;

      // For the milestone-triggered reimbursement model, the 20%/80% sales treatment
      // is already baked into the cumulative draw targets above, so don't net it
      // again when computing funding gap / equity top-ups.
      const cumulativeSalesForGap = reimbursementModel ? 0 : cumulativeSalesForDisplay;

      // If base draw sizing didn't cover fees/interest, allow extra equity to fill the gap.
      const rawFundingGap =
        cumulativeCosts -
        cumulativeSalesForGap -
        (cumDebtDrawn + cumLandLoanDrawn + cumEquityBase + cumExtraEquity);
      const allowEquityExtra =
        !reimbursementModel || reimbursementMilestoneMonths.has(m);
      const equityExtraThisMonth =
        rawFundingGap > 0 && allowEquityExtra ? rawFundingGap : 0;
      cumExtraEquity += equityExtraThisMonth;

      const reimbursementMilestoneLabel =
        reimbursementModel ? reimbursementMilestones.find((x) => x.month === m)?.label : undefined;

      // Milestone 30/70: never derive row equity from bare equityBaseThisMonth when segment math applies —
      // use baseEquityOutflow − equityReduction (+ gap) so it matches recycling / segment caps.
      const netEquityFromBaseOutflow =
        segmentMilestoneEquity !== null
          ? Math.max(
              0,
              segmentMilestoneEquity.baseEquityOutflow -
                segmentMilestoneEquity.equityReduction
            )
          : null;

      const equityOutflowThisMonth =
        netEquityFromBaseOutflow !== null
          ? netEquityFromBaseOutflow + equityExtraThisMonth
          : equityBaseThisMonth + equityExtraThisMonth;

      stack.push({
        month: m,
        reimbursementMilestoneLabel,
        cumulativeCosts,
        cumulativeSales: cumulativeSalesForDisplay,
        debtDrawThisMonth: debtDrawThisMonth + landLoanDrawThisMonth,
        cumulativeDebtDrawn: cumDebtDrawn + cumLandLoanDrawn,
        landLoanDrawThisMonth,
        cumulativeLandLoanDrawn: cumLandLoanDrawn,
        landEquityThisMonth,
        equityThisMonth: equityOutflowThisMonth,
        /** Milestone 30/70 + recycling: ties to baseEquityOutflow − equityReduction (+ gap equity). */
        equityOutflowThisMonth,
        cumulativeEquity: cumEquityBase + cumExtraEquity,
        interestCost,
        interestPaid,
        interestCapitalized,
        commitmentFee,
        totalFinancingCost: interestCost + commitmentFee,
        fundingGap: Math.max(
          0,
          rawFundingGap - equityExtraThisMonth
        ),
      });
    }

    const peakEquityRequired = stack.reduce(
      (max, d) => Math.max(max, d.cumulativeEquity),
      0
    );

    const loanAtCompletion = cumDebtDrawn + cumLandLoanDrawn + cumCapitalizedIDC;
    const totalInterestPaid = cumInterestCostConstruction;
    const totalCommitmentFeePaid = cumCommitmentFeePaid;

    return {
      stack,
      peakEquityRequired,
      totalInterestPaid,
      totalCommitmentFeePaid,
      loanAtCompletion,
    };
  }, [
    finStream,
    debtFacilityAmount,
    financing.commitmentFeeRate,
    financing.equityFirstDraw,
    financing.salesReduceEquity,
    financing.salesReduceDebt,
    financing.reimbursementModel,
    financing.drawdownModel,
    financing.drawdownActiveTab,
    financing.drawdownQuarterly,
    financing.monthlyDrawdowns,
    financing.firstDrawdownMonth,
    financing.landEquityPercent,
    financing.milestoneThresholds,
    financing.certificationInterval,
    financing.autoCalculateMilestoneMonths,
    financing.overrideMilestoneMonths,
    monthlyInterestRate,
    constructionPeriod,
    totalHoldPeriodMonths,
    outflowProfile.monthlyTotal,
    outflowProfile.softCosts,
    outflowProfile.powc,
    inflowScheduleMap,
    idcCapitalizedShare,
    financing.idcTreatment,
    financing.idcCapitalizedSharePercent,
    cashOutflows.tdc,
    cashOutflows.landCost,
    cashOutflows.constructionCost,
    cashOutflows.softCosts,
    cashOutflows.powc,
    totalCosts,
    totalLandCost,
    landEquityAmount,
    landRefinanceAmount,
    bulkShare,
    buyerDownPayment,
    downPaymentMonths,
    downPaymentMonthsCount,
    constructionCostSchedule,
  ]);

  // ============================================================================
  // 30/70 Reimbursement Deep Debug (milestones + debt draw reconciliation)
  // ============================================================================
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("🔍 30/70 Reimbursement Deep Debug:");

    const tdcValue = cashOutflows.tdc || totalCosts;
    const expectedBankShare = tdcValue * 0.7;
    const lastRow = dynamicFundingStack.stack?.[dynamicFundingStack.stack.length - 1];
    const actualTotalDebtDrawn = lastRow?.cumulativeDebtDrawn ?? 0;

    // eslint-disable-next-line no-console
    console.log("  TDC:", tdcValue);
    // eslint-disable-next-line no-console
    console.log("  Expected Bank Share (70%):", expectedBankShare);
    // eslint-disable-next-line no-console
    console.log("  Actual Total Debt Drawn:", actualTotalDebtDrawn);
    // eslint-disable-next-line no-console
    console.log("  Land Cost:", cashOutflows.landCost);
    // eslint-disable-next-line no-console
    console.log("  reimbursementModel:", financing.reimbursementModel);
    // eslint-disable-next-line no-console
    console.log("  landEquityPercent:", financing.landEquityPercent);

    const milestones = (dynamicFundingStack.stack || []).filter(
      (s: any) => s.reimbursementMilestoneLabel
    );
    // eslint-disable-next-line no-console
    console.log("  Milestone Breakdown:");
    milestones.forEach((m: any) => {
      // eslint-disable-next-line no-console
      console.log(`    ${m.reimbursementMilestoneLabel} (M${m.month}):`);
      // eslint-disable-next-line no-console
      console.log(
        `      Cumulative Costs: ${(m.cumulativeCosts / 1000).toFixed(0)}k`
      );
      // eslint-disable-next-line no-console
      console.log(
        `      Debt Draw This Month: ${(m.debtDrawThisMonth / 1000).toFixed(0)}k`
      );
      // eslint-disable-next-line no-console
      console.log(
        `      Cumulative Debt Drawn: ${(m.cumulativeDebtDrawn / 1000).toFixed(0)}k`
      );
      // eslint-disable-next-line no-console
      console.log(
        `      Equity This Month: ${(m.equityThisMonth / 1000).toFixed(0)}k`
      );
      // eslint-disable-next-line no-console
      console.log(
        `      Cumulative Equity: ${(m.cumulativeEquity / 1000).toFixed(0)}k`
      );
    });

    const costScheduleSum = constructionCostSchedule.reduce(
      (s, v) => s + (v || 0),
      0
    );
    // eslint-disable-next-line no-console
    console.log("  Construction Cost Schedule Sum:", costScheduleSum);
    // eslint-disable-next-line no-console
    console.log(
      "  Land + Construction:",
      (cashOutflows.landCost || 0) + costScheduleSum
    );
  }, [
    dynamicFundingStack,
    cashOutflows.tdc,
    cashOutflows.landCost,
    financing.reimbursementModel,
    financing.landEquityPercent,
    totalCosts,
    constructionCostSchedule,
  ]);

  const {
    stack: monthlyFundingStack,
    peakEquityRequired: dynamicPeakEquityRequired = 0,
    totalInterestPaid: dynamicTotalInterestPaid = 0,
    totalCommitmentFeePaid: dynamicTotalCommitmentFeePaid = 0,
    loanAtCompletion: dynamicLoanAtCompletion = 0,
  } = dynamicFundingStack;

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("🔍 debtFacilityAmount:", debtFacilityAmount);
    // eslint-disable-next-line no-console
    console.log("🔍 financing.salesReduceEquity:", financing.salesReduceEquity);
    // eslint-disable-next-line no-console
    console.log("🔍 financing.equityFirstDraw:", financing.equityFirstDraw);
    // eslint-disable-next-line no-console
    console.log(
      "🔍 maxEquityBase:",
      Math.max(0, (cashOutflows.tdc || 0) - debtFacilityAmount)
    );
  }, [
    debtFacilityAmount,
    financing.salesReduceEquity,
    financing.equityFirstDraw,
    cashOutflows.tdc,
  ]);

  // DEBUG LOGGING - Remove after verification
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("🔍 ========== DYNAMIC FUNDING RESULTS =============");
    // eslint-disable-next-line no-console
    console.log(
      "🔍 Peak Equity Required:",
      dynamicPeakEquityRequired
    );
    // eslint-disable-next-line no-console
    console.log(
      "🔍 Static Equity (TDC - Debt):",
      (cashOutflows.tdc || 0) - (debtFacilityAmount || 0)
    );
    // eslint-disable-next-line no-console
    console.log(
      "🔍 Equity Savings:",
      ((cashOutflows.tdc || 0) - (debtFacilityAmount || 0)) -
        dynamicPeakEquityRequired
    );
    // eslint-disable-next-line no-console
    console.log(
      "🔍 Total Interest Paid (Dynamic):",
      dynamicTotalInterestPaid
    );
    // eslint-disable-next-line no-console
    console.log(
      "🔍 Loan at Completion:",
      dynamicLoanAtCompletion || loanAtCompletionLegacy
    );
    // eslint-disable-next-line no-console
    console.log(
      "🔍 First 6 months:",
      monthlyFundingStack.slice(0, 6).map((s: any) => ({
        month: s.month,
        costs: (s.cumulativeCosts / 1000).toFixed(1) + "k",
        sales: (s.cumulativeSales / 1000).toFixed(1) + "k",
        debt: (s.debtDrawThisMonth / 1000).toFixed(1) + "k",
        equity: (s.equityThisMonth / 1000).toFixed(1) + "k",
      }))
    );
    // eslint-disable-next-line no-console
    console.log("🔍 =============================================");
  }, [
    dynamicFundingStack,
    monthlyFundingStack,
    cashOutflows.tdc,
    debtFacilityAmount,
    dynamicPeakEquityRequired,
    dynamicTotalInterestPaid,
    dynamicLoanAtCompletion,
    loanAtCompletionLegacy,
  ]);

  const fundingByMonth = useMemo(() => {
    return new Map<number, any>(monthlyFundingStack.map((d) => [d.month, d]));
  }, [monthlyFundingStack]);

  const loanAtCompletion = dynamicLoanAtCompletion || loanAtCompletionLegacy;
  
  // Operational hotel P&L (Y1–Y10). Used for the hybrid construction+operations cashflow view.
  const hotelPnl = useMemo(() => {
    if (!hotelHoldSnapshot) return null;
    return computeOperationalHotelHoldPnl(
      hotelHoldSnapshot,
      cashOutflows.constructionCost || 0,
      cashOutflows.ffe || 0
    );
  }, [hotelHoldSnapshot, cashOutflows.constructionCost, cashOutflows.ffe]);

  // Alias for debugging parity with operational pages
  const operationalInputs = hotelPnl as any;

  /** 50% of initial FFE; shown at M118 only (end of Operating Year 6 for 40M construction). */
  const ffeRenovationOps = Math.max(0, (cashOutflows.ffe || 0) * 0.5);
  const ffeRenovationFyeMonth = getOperationalYearMonthRange(6, constructionPeriod).endMonth;

  // Must be defined before `monthlyData` (used in operational outflow posting).
  const changeInWorkingCapitalYearly = useMemo(() => {
    const nYears = 10;
    if (!hotelPnl || !hotelHoldSnapshot) return Array.from({ length: nYears }, () => 0);
    const arM = Number(hotelHoldSnapshot.depFieldValues?.accountsReceivableMonths) || 0;
    const apM = Number(hotelHoldSnapshot.depFieldValues?.accountsPayableMonths) || 0;
    const nwcLevels = Array.from({ length: nYears }, (_, i) => {
      const rev = hotelPnl.totalHotelRevenue[i] ?? 0;
      const opex = hotelPnl.totalExpenses[i] ?? 0;
      return (arM / 12) * rev - (apM / 12) * opex;
    });
    return nwcLevels.map((w, i) => w - (i > 0 ? nwcLevels[i - 1]! : 0));
  }, [hotelPnl, hotelHoldSnapshot]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("=== Exit Proceeds Card Debug ===");
    // eslint-disable-next-line no-console
    console.log("Full financing object:", financing);
    // eslint-disable-next-line no-console
    console.log("financing.exitStrategy:", financing.exitStrategy);
    // eslint-disable-next-line no-console
    console.log("financing.exitYear:", financing.exitYear);
    // eslint-disable-next-line no-console
    console.log("financing.saleCapRate:", financing.saleCapRate);
    // eslint-disable-next-line no-console
    console.log("financing.saleCosts:", financing.saleCosts);
    // eslint-disable-next-line no-console
    console.log("financing.prepaymentLockoutYears:", financing.prepaymentLockoutYears);
    // eslint-disable-next-line no-console
    console.log("financing.prepaymentPenalty:", financing.prepaymentPenalty);
    // eslint-disable-next-line no-console
    console.log("financing.amortizationSchedule:", financing.amortizationSchedule);
    // eslint-disable-next-line no-console
    console.log("operationalInputs.ebitda:", operationalInputs?.ebitda);

    const hasExitStrategy = !!financing.exitStrategy;
    const isNotHold = financing.exitStrategy !== "hold";
    const hasExitYear = !!financing.exitYear;
    const hasAmortization = !!financing.amortizationSchedule?.length;

    // eslint-disable-next-line no-console
    console.log("Condition Checks:");
    // eslint-disable-next-line no-console
    console.log("  - Has Exit Strategy:", hasExitStrategy);
    // eslint-disable-next-line no-console
    console.log("  - Is Not Hold:", isNotHold);
    // eslint-disable-next-line no-console
    console.log("  - Has Exit Year:", hasExitYear);
    // eslint-disable-next-line no-console
    console.log("  - Has Amortization Schedule:", hasAmortization);
    // eslint-disable-next-line no-console
    console.log(
      "  - Card Should Show:",
      hasExitStrategy && isNotHold ? "✅ YES" : "❌ NO"
    );
  }, [financing, operationalInputs]);

  // ===== FFE S-Curve Distribution Calculation =====
  const calculateFFEMonthly = (
    totalFFE: number,
    constructionMonths: number = 36
  ): number[] => {
    // Based on actual data pattern from /operational/preview/cash-outflows:
    // M0=0, M1-M35=S-curve, M36=tail end
    const monthly: number[] = [];

    for (let m = 0; m <= constructionMonths; m++) {
      let factor = 0;

      if (m === 0) {
        factor = 0; // M0 = 0
      } else if (m <= 18) {
        // Ramp up (M1-M18): increasing S-curve
        const progress = m / 18;
        factor = 0.002 * Math.pow(progress, 1.3) * (m < 10 ? 0.5 : 1);
      } else if (m <= 35) {
        // Ramp down (M19-M35): decreasing S-curve
        const progress = (m - 18) / (35 - 18);
        factor = 0.082 * Math.pow(1 - progress, 1.5);
      } else {
        // M36: tail end
        factor = 0.006;
      }

      monthly.push(totalFFE * factor);
    }

    // Normalize to ensure sum = totalFFE
    const sum = monthly.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let m = 0; m <= constructionMonths; m++) {
        monthly[m] = (monthly[m]! / sum) * totalFFE;
      }
    }

    return monthly;
  };

  // ===== COMPREHENSIVE DEBUG LOGS — CASH OUTFLOWS DATA =====
  // eslint-disable-next-line no-console
  console.log("═══════════════════════════════════════════════════════════");
  // eslint-disable-next-line no-console
  console.log("=== CASH OUTFLOWS DATA DEBUG ===");
  // eslint-disable-next-line no-console
  console.log("═══════════════════════════════════════════════════════════");
  // eslint-disable-next-line no-console
  console.log("cashOutflows FULL OBJECT:", JSON.stringify(cashOutflows, null, 2));
  // eslint-disable-next-line no-console
  console.log("───────────────────────────────────────────────────────────");
  // eslint-disable-next-line no-console
  console.log("FFE Variable Search:");
  // eslint-disable-next-line no-console
  console.log("  cashOutflows.ffe:", (cashOutflows as any)?.ffe);
  // eslint-disable-next-line no-console
  console.log("  cashOutflows.ffeInvestment:", (cashOutflows as any)?.ffeInvestment);
  // eslint-disable-next-line no-console
  console.log("  cashOutflows.ffeCost:", (cashOutflows as any)?.ffeCost);
  // eslint-disable-next-line no-console
  console.log(
    "  cashOutflows.furnitureFixturesEquipment:",
    (cashOutflows as any)?.furnitureFixturesEquipment
  );
  // eslint-disable-next-line no-console
  console.log("  operationalInputs.ffe:", operationalInputs?.ffe);
  // eslint-disable-next-line no-console
  console.log("  operationalInputs.ffeInvestment:", operationalInputs?.ffeInvestment);
  // eslint-disable-next-line no-console
  console.log("───────────────────────────────────────────────────────────");
  // eslint-disable-next-line no-console
  console.log("Working Values (for comparison):");
  // eslint-disable-next-line no-console
  console.log("  cashOutflows.landCost:", (cashOutflows as any)?.landCost);
  // eslint-disable-next-line no-console
  console.log("  cashOutflows.ccWithContingency:", (cashOutflows as any)?.ccWithContingency);
  // eslint-disable-next-line no-console
  console.log("  cashOutflows.softCosts:", (cashOutflows as any)?.softCosts);
  // eslint-disable-next-line no-console
  console.log("  cashOutflows.powc:", (cashOutflows as any)?.powc);

  if (typeof window !== "undefined") {
    const store = localStorage.getItem("fin-model-storage");
    if (store) {
      try {
        const parsed = JSON.parse(store);
        // eslint-disable-next-line no-console
        console.log("───────────────────────────────────────────────────────────");
        // eslint-disable-next-line no-console
        console.log("LocalStorage Direct Read:");
        // eslint-disable-next-line no-console
        console.log("  operational.ffe:", parsed?.operational?.ffe);
        // eslint-disable-next-line no-console
        console.log("  operational.ffeInvestment:", parsed?.operational?.ffeInvestment);
        // eslint-disable-next-line no-console
        console.log("  cashOutflows.ffe:", parsed?.cashOutflows?.ffe);
        // eslint-disable-next-line no-console
        console.log("  cashOutflows.landCost:", parsed?.cashOutflows?.landCost);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log("LocalStorage parse failed:", e);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log("═══════════════════════════════════════════════════════════");

  // ===== FIND FFE MONTHLY DATA SOURCE =====
  // eslint-disable-next-line no-console
  console.log("═══════════════════════════════════════════════════════════");
  // eslint-disable-next-line no-console
  console.log("=== FFE MONTHLY DATA SEARCH ===");
  // eslint-disable-next-line no-console
  console.log("cashOutflows.ffeMonthly:", (cashOutflows as any)?.ffeMonthly);
  // eslint-disable-next-line no-console
  console.log("cashOutflows.ffeDistribution:", (cashOutflows as any)?.ffeDistribution);
  // eslint-disable-next-line no-console
  console.log("cashOutflows.ffeByMonth:", (cashOutflows as any)?.ffeByMonth);
  // eslint-disable-next-line no-console
  console.log("operationalInputs.ffeMonthly:", (operationalInputs as any)?.ffeMonthly);
  // eslint-disable-next-line no-console
  console.log("financing.ffeMonthly:", (financing as any)?.ffeMonthly);

  try {
    const co: any = cashOutflows as any;
    const possibleArrays = Object.keys(co || {}).filter((key) => {
      const val = co?.[key];
      return Array.isArray(val) && val.length === 37;
    });
    // eslint-disable-next-line no-console
    console.log("Arrays with 37 values in cashOutflows:", possibleArrays);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("FFE array scan failed:", e);
  }

  if (typeof window !== "undefined") {
    const store = localStorage.getItem("fin-model-storage");
    if (store) {
      try {
        const parsed = JSON.parse(store);
        // eslint-disable-next-line no-console
        console.log("LocalStorage FFE arrays:");
        // eslint-disable-next-line no-console
        console.log(
          "  operational.ffeMonthly:",
          parsed?.operational?.ffeMonthly?.length
        );
        // eslint-disable-next-line no-console
        console.log(
          "  cashOutflows.ffeMonthly:",
          parsed?.cashOutflows?.ffeMonthly?.length
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log("LocalStorage parse failed (FFE scan):", e);
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log("═══════════════════════════════════════════════════════════");

  // ===== FIND FFE MONTHLY DATA SOURCE (Match Cash-Outflows Page) =====
  // eslint-disable-next-line no-console
  console.log("═══════════════════════════════════════════════════════════");
  // eslint-disable-next-line no-console
  console.log("=== FFE DATA SOURCE INVESTIGATION ===");
  // eslint-disable-next-line no-console
  console.log(
    "cashOutflows.ffeMonthly:",
    (cashOutflows as any)?.ffeMonthly?.slice?.(0, 5)
  );
  // eslint-disable-next-line no-console
  console.log(
    "cashOutflows.ffeDistribution:",
    (cashOutflows as any)?.ffeDistribution?.slice?.(0, 5)
  );
  // eslint-disable-next-line no-console
  console.log(
    "cashOutflows.ffeByMonth:",
    (cashOutflows as any)?.ffeByMonth?.slice?.(0, 5)
  );
  // eslint-disable-next-line no-console
  console.log(
    "cashOutflows.ffeSchedule:",
    (cashOutflows as any)?.ffeSchedule?.slice?.(0, 5)
  );
  // eslint-disable-next-line no-console
  console.log(
    "cashOutflows.ffeCashFlow:",
    (cashOutflows as any)?.ffeCashFlow?.slice?.(0, 5)
  );

  // eslint-disable-next-line no-console
  console.log(
    "operationalInputs.ffeMonthly:",
    (operationalInputs as any)?.ffeMonthly?.slice?.(0, 5)
  );
  // eslint-disable-next-line no-console
  console.log(
    "operationalInputs.ffeDistribution:",
    (operationalInputs as any)?.ffeDistribution?.slice?.(0, 5)
  );

  // eslint-disable-next-line no-console
  console.log("financing.ffeMonthly:", (financing as any)?.ffeMonthly?.slice?.(0, 5));

  if (typeof window !== "undefined") {
    const store = localStorage.getItem("fin-model-storage");
    if (store) {
      try {
        const parsed: any = JSON.parse(store);
        // eslint-disable-next-line no-console
        console.log("LocalStorage Search:");
        // eslint-disable-next-line no-console
        console.log("  cashOutflows keys:", Object.keys(parsed?.cashOutflows || {}));
        // eslint-disable-next-line no-console
        console.log("  operational keys:", Object.keys(parsed?.operational || {}));

        const findArrays = (obj: any, path = "") => {
          if (!obj || typeof obj !== "object") return;
          for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (Array.isArray(val) && val.length >= 30 && val.length <= 40) {
              // eslint-disable-next-line no-console
              console.log(
                `  Array found at ${path}.${key}: length=${val.length}, first5=[${val
                  .slice(0, 5)
                  .join(", ")}]`
              );
            } else if (val && typeof val === "object") {
              findArrays(val, `${path}.${key}`);
            }
          }
        };
        findArrays(parsed, "root");
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log("LocalStorage parse failed (FFE investigation):", e);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log("═══════════════════════════════════════════════════════════");

  const exitYear = Math.max(
    4,
    Math.min(13, Math.round(Number(financing.exitYear ?? 13) || 13))
  );
  const exitStrategy = (financing.exitStrategy ?? "hold") as
    | "sale"
    | "refinance"
    | "hold";
  const saleCapRatePct = Math.max(0.0001, Number(financing.saleCapRate ?? 7) || 7);
  const saleCostsPct = Math.max(0, Number(financing.saleCosts ?? 3) || 0);
  const refinanceLtcPct = Math.max(
    0,
    Math.min(100, Number(financing.refinanceLtc ?? 60) || 60)
  );

  /** Exit proceeds breakdown (gross + penalty + net) at `exitYear` (embedded penalty; no separate row). */
  const exitBreakdown = useMemo(() => {
    const exitIdx = exitYear - 4; // maps Y4..Y13 -> 0..9
    const ebitda = hotelPnl?.ebitda?.[exitIdx] ?? 0;
    const terminalValue =
      saleCapRatePct > 0 ? ebitda / (saleCapRatePct / 100) : 0;

    const sellingCosts = exitStrategy === "sale" ? terminalValue * (saleCostsPct / 100) : 0;
    const grossProceeds =
      exitStrategy === "sale" || exitStrategy === "hold"
        ? Math.max(0, terminalValue - sellingCosts)
        : exitStrategy === "refinance"
          ? Math.max(0, terminalValue * (refinanceLtcPct / 100))
          : 0;

    const loanPayoff = financing.amortizationSchedule?.[exitIdx]?.endBal ?? 0;

    const lockoutYears = Math.max(
      0,
      Math.round(Number(financing.prepaymentLockoutYears ?? 0) || 0)
    );
    const penalties = [...(financing.prepaymentPenalty ?? [5, 4, 3, 2, 1])];
    while (penalties.length < 5) penalties.push(0);
    const rateIdx = Math.min(4, Math.max(0, exitIdx));
    const stepDownPct = Math.max(0, Number(penalties[rateIdx] ?? 0) || 0);
    const effectivePct =
      lockoutYears > 0 && exitIdx < lockoutYears
        ? Math.max(stepDownPct, Math.max(0, Number(penalties[0] ?? 0) || 0))
        : stepDownPct;
    const penalty = loanPayoff <= 0 ? 0 : (loanPayoff * effectivePct) / 100;

    const netProceeds = Math.max(0, grossProceeds - penalty);

    return {
      exitIdx,
      ebitda,
      terminalValue,
      sellingCosts,
      grossProceeds,
      loanPayoff,
      penalty,
      netProceeds,
    };
  }, [
    exitStrategy,
    exitYear,
    hotelPnl?.ebitda,
    refinanceLtcPct,
    saleCapRatePct,
    saleCostsPct,
    financing.amortizationSchedule,
    financing.prepaymentLockoutYears,
    financing.prepaymentPenalty,
  ]);

  const grossExitProceeds = exitBreakdown.grossProceeds;
  const exitPrepaymentPenalty = exitBreakdown.penalty;
  const exitProceeds = exitBreakdown.netProceeds;
  
  // Generate monthly cash flow data (post-financing, simplified for preview)
  const monthlyData = useMemo(() => {
    const data: Array<{
      month: number;
      unitSales: number;
      bulkSales: number;
      totalInflow: number;
      landCostOutflow: number;
      constructionCostOutflow: number;
      softCostsOutflow: number;
      powcOutflow: number;
      ffeOutflow: number;
      /** Cash IDC / pre-op interest paid current (positive); included in NCF Pre for construction & pre-op. */
      idcInterestOutflow: number;
      totalOutflowPreFinancing: number;
      /** Hard + op + cash IDC (same basis as NCF Pre = inflow − this, non-FYE path). */
      totalOutflowAll: number;
      /** Land + construction + soft + POWC + FFE (no IDC); matches displayed cost rows. */
      profileOutflow: number;
      ncfPreFinancing: number;
      loanDrawdown: number; // Row B (positive)
      cumulativeLoanBalance: number; // Row C (positive balance)
      interestPayment: number; // Row D (negative)
      principalRepayment: number; // Row E (negative)
      commitmentFeePayment: number; // Row F (negative)
      equityInjection: number; // Row G (positive)
      cumulativeEquityInjected: number; // Row H (positive balance)
      ncfPostFinancing: number; // Row I (+/-)
      cumulativeNcfPostFinancing: number; // Row J (+/-), should be >= 0 by construction
      equityInvestorCF: number; // Same as ncfPostFinancing when equity injection is not modeled
      dscr: number | null;
      loanBalance: number;
    }> = [];

    const scheduleRowCount = financing.amortizationSchedule?.length ?? 0;
    /** Post Step 6 annual interest/principal at operating FYE only (not 1/12 every month). */
    const useAnnualScheduleAtOperationalFye = scheduleRowCount > 0;
    const seniorAmortYears =
      scheduleRowCount > 0
        ? scheduleRowCount
        : finStream === "operational"
          ? 10
          : amortizationPeriod;
    const repaymentMonthsTotal = seniorAmortYears * 12;
    const ioMonths = Math.max(
      0,
      Math.round(
        (financing.gracePeriodYears ?? interestOnlyPeriodYears ?? 0) * 12
      )
    );
    // Repayment starts only when hotel operations begin (after construction + pre-op buffer).
    const repaymentStartMonth = operationsStartMonth;

    const r = monthlyInterestRate;

    const levelPayment = (principal: number, n: number) => {
      if (n <= 0 || principal <= 0) return 0;
      if (r === 0) return principal / n;
      return (
        (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1)
      );
    };

    const seniorLoanType = normalizeSeniorLoanType(financing.loanType);
    const preferSeniorStep6 =
      finStream === "operational" || scheduleRowCount > 0;
    const cappedIoForAmort = Math.min(
      ioMonths,
      Math.max(0, repaymentMonthsTotal - 1)
    );
    const amortMonthsAfterIo = Math.max(1, repaymentMonthsTotal - cappedIoForAmort);
    const L0ForSchedule = loanAtCompletion;
    const equalPrincipalMonthly =
      preferSeniorStep6 && seniorLoanType === "equal-principal"
        ? L0ForSchedule / amortMonthsAfterIo
        : 0;
    const equalPaymentMonthly =
      preferSeniorStep6 && seniorLoanType === "equal-payment"
        ? levelPayment(L0ForSchedule, amortMonthsAfterIo)
        : 0;

    // % of monthly sales inflows applied to debt repayment (post-construction)
    const debtRepaymentPriority = financing.debtRepaymentPriority ?? 100;

    // ============================================================================
    // DYNAMIC LOAN REPAYMENT: sales proceeds repay debt first (then scheduled fallback)
    // ============================================================================
    // Track outstanding loan balance month-by-month (driven by draws and repayments).
    // `cumulativeLoanBalance` is the source of truth for lagged IDC interest (interest at M{t} is on balance at end of M{t-1}).
    let loanBalance = 0;

    // Row C: cumulative loan balance (draws - repayments)
    let cumulativeLoanBalance = 0;
    /** Step 3 "Treat land as 100% equity" — matches main financing wizard (`landEquityPercent >= 100`). */
    const landAs100Equity = (financing.landEquityPercent ?? 40) >= 100;
    const landCostEquityM0 =
      Number((hotelPnl as { landCost?: number } | null | undefined)?.landCost) ||
      totalLandCost ||
      0;

    const loanAmountForDrawSchedule =
      Number((financing as { loanAmount?: number }).loanAmount) > 0
        ? Number((financing as { loanAmount?: number }).loanAmount)
        : debtFacilityAmount;

    for (let m = 0; m <= totalHoldPeriodMonths; m++) {
      const isConstruction = m <= constructionPeriod;
      const isRepaymentPeriod = m >= operationsStartMonth && m <= totalHoldPeriodMonths;
      // CASH INFLOWS
      // - Development / pre-op: Component 2 monthly schedule (sales-style inflows).
      // - HOLD: no development sales before operations (avoids phantom inflow vs hotel hold preview).
      // - Operations: post annual revenue at operating FYE months.
      // - Add net exit proceeds at the selected exit FYE month (or final FYE for hold).
      const exitStrategyEffective = financing.exitStrategy ?? "hold";
      const suppressDevSalesBeforeOps =
        exitStrategyEffective === "hold" && m < operationsStartMonth;
      const baseInflow = suppressDevSalesBeforeOps
        ? 0
        : inflowScheduleMap.get(m) || 0;
      const exitOy = Math.min(10, Math.max(1, exitYear - 3)); // Y4..Y13 -> OY1..OY10
      const exitFyeMonth = getOperationalYearMonthRange(exitOy, constructionPeriod).endMonth;

      // CASH OUTFLOWS (Pre-financing)
      // Land cost is always a full project outflow at M0.
      // Slider changes funding source split (equity vs refinanced debt), not the cost itself.
      const landCostOutflow = m === 0 ? totalLandCost : 0;
      const constructionCostOutflow =
        m <= constructionPeriod ? constructionCostSchedule[m] || 0 : 0;
      const softCostsOutflow =
        m <= constructionPeriod ? outflowProfile.softCosts[m] || 0 : 0;
      const powcOutflow =
        m <= constructionPeriod ? outflowProfile.powc[m] || 0 : 0;
      const ffeOutflow =
        m <= constructionPeriod ? outflowProfile.ffe?.[m] || 0 : 0;
      // Operating flows: annual totals posted at operating year-end months (to match the FYE columns).
      const opYearIndex0 =
        m >= operationsStartMonth
          ? Math.floor((m - operationsStartMonth) / 12)
          : -1;
      const isOpFyeMonth =
        opYearIndex0 >= 0 &&
        opYearIndex0 < 10 &&
        m === getOperationalYearMonthRange(opYearIndex0 + 1, constructionPeriod).endMonth;
      const operationalRevenue =
        isOpFyeMonth ? hotelPnl?.totalHotelRevenue?.[opYearIndex0] ?? 0 : 0;
      const operationalOutflow =
        isOpFyeMonth
          ? (hotelPnl?.totalExpenses?.[opYearIndex0] ?? 0) +
            Math.abs(changeInWorkingCapitalYearly[opYearIndex0] ?? 0) +
            (opYearIndex0 === 5 ? ffeRenovationOps : 0)
          : 0;

      const totalInflow =
        baseInflow +
        operationalRevenue +
        (m === exitFyeMonth ? exitProceeds : 0);
      const bulkSales = totalInflow * bulkShare;
      const unitSales = totalInflow - bulkSales;

      // Hard costs: use the same land + construction schedule + soft + POWC + FFE as the table rows.
      // Do NOT use `buildCashOutflowProfile` `monthlyTotal` alone — it uses the internal S-curve and
      // applies the full TDC reconciliation to the *last* profile month, which can balloon one month
      // and diverge from `constructionCostSchedule` / displayed components.
      const profileOutflow =
        landCostOutflow +
        constructionCostOutflow +
        softCostsOutflow +
        powcOutflow +
        ffeOutflow;
      const totalOutflowPreFinancing = profileOutflow;

      // Cash IDC / pre-op interest (paid current) is an operating cash outflow before financing;
      // include in NCF Pre so it matches hard costs + IDC. Avoid double-count in NCF Post bridge.
      const idcCashOutPreFinancing =
        isConstruction || (m < operationsStartMonth && cumulativeLoanBalance > 0)
          ? (isConstruction && m === 0
              ? 0
              : cumulativeLoanBalance *
                monthlyInterestRate *
                (1 - idcCapitalizedShare))
          : 0;
      const idcIncludedInNcfPre =
        isConstruction || (m < operationsStartMonth && cumulativeLoanBalance > 0);

      const totalOutflowAll =
        totalOutflowPreFinancing + operationalOutflow + idcCashOutPreFinancing;

      // NCF Pre (operating FYE): NOI only — Revenue − OpEx − |ΔWC| − FFE reno. Financing
      // (interest/principal) never belongs here; it flows only through `ncfBeforeEquityThisMonth`.
      // Development sales + exit on FYE are still in the cash bridge via `fyeNonOperatingPreFinInflows`.
      const fyeNonOperatingPreFinInflows =
        isOpFyeMonth && m >= operationsStartMonth
          ? baseInflow + (m === exitFyeMonth ? exitProceeds : 0)
          : 0;
      const ncfPreFinancing =
        isOpFyeMonth && m >= operationsStartMonth
          ? operationalRevenue - operationalOutflow
          : totalInflow - totalOutflowAll;

      // FINANCING CASH FLOWS (Debt service & draws)
      // Loan drawdown: Component 4 % schedule × facility (rollback — no stack / gap-fill coupling here).
      const pctThisMonth = Math.max(
        0,
        Number(financing.monthlyDrawdowns?.[m] ?? 0) || 0
      );
      const loanDrawdown = isConstruction
        ? (pctThisMonth / 100) * loanAmountForDrawSchedule
        : 0;

      // Option C: commitment fee is not modeled in operational preview.
      const commitmentFeePaid = 0;

      let interest = 0;
      let principal = 0;
      let debtServiceForDscr = 0;

      if (isConstruction) {
        // During construction: only cash IDC interest is serviced (principal = 0).
        // Same amount as `idcCashOutPreFinancing` (already in NCF Pre).
        interest = idcCashOutPreFinancing;
        principal = 0;
        debtServiceForDscr = interest; // DSCR basis during construction isn't used
      } else if (m < operationsStartMonth && loanBalance > 0) {
        // Pre-op buffer (after construction, before operations): interest-only cash service
        // depends on Step 5 IDC treatment. No principal amortization before operations.
        interest = idcCashOutPreFinancing;
        principal = 0;
        debtServiceForDscr = interest;
      } else if (
        useAnnualScheduleAtOperationalFye &&
        isRepaymentPeriod &&
        loanBalance > 0 &&
        !isOpFyeMonth
      ) {
        // Operations, non-FYE: annual debt service is booked on FYE rows from `amortizationSchedule`.
        interest = 0;
        principal = 0;
        debtServiceForDscr = 0;
      } else if (
        useAnnualScheduleAtOperationalFye &&
        isOpFyeMonth &&
        m >= operationsStartMonth &&
        loanBalance > 0 &&
        opYearIndex0 >= 0 &&
        opYearIndex0 < scheduleRowCount
      ) {
        const scheduleEntry = financing.amortizationSchedule![opYearIndex0];
        interest = Math.max(0, Number(scheduleEntry?.interest) || 0);
        principal = Math.min(
          loanBalance,
          Math.max(0, Number(scheduleEntry?.principal) || 0)
        );
        debtServiceForDscr = (interest + principal) / 12;
      } else if (isRepaymentPeriod && loanBalance > 0) {
        // Post-construction: sales proceeds repay debt first.
        // IMPORTANT: DSCR should be computed on *scheduled* debt service (lender basis),
        // not including voluntary prepayments from sales.
        const salesProceeds = totalInflow;
        const salesToDebt = salesProceeds * (debtRepaymentPriority / 100);

        interest = loanBalance * monthlyInterestRate;

        // Scheduled payment (DSCR basis) — Component 4 Step 6 `loanType` + grace (not legacy `repaymentStructure` alone).
        const t = m - repaymentStartMonth;
        const remainingMonths = Math.max(1, repaymentMonthsTotal - Math.max(0, t));

        let scheduledPrincipal = 0;
        if (preferSeniorStep6) {
          if (seniorLoanType === "bullet") {
            scheduledPrincipal =
              t >= 0 && t === repaymentMonthsTotal - 1 ? loanBalance : 0;
          } else if (seniorLoanType === "equal-principal") {
            if (t >= 0 && t >= ioMonths) {
              scheduledPrincipal = Math.min(
                loanBalance,
                Math.max(0, equalPrincipalMonthly)
              );
            }
          } else if (seniorLoanType === "equal-payment") {
            if (t >= 0 && t >= ioMonths) {
              scheduledPrincipal = Math.max(
                0,
                Math.min(loanBalance, equalPaymentMonthly - interest)
              );
            }
          } else if (
            seniorLoanType === "custom" &&
            (financing.amortizationSchedule?.length ?? 0) > 0
          ) {
            const sched = financing.amortizationSchedule!;
            if (t >= 0 && t >= ioMonths) {
              const yi = Math.floor((t - ioMonths) / 12);
              const row = yi >= 0 && yi < sched.length ? sched[yi] : undefined;
              const annualP = row?.principal ?? 0;
              scheduledPrincipal = Math.min(
                loanBalance,
                Math.max(0, annualP / 12)
              );
            }
          } else if (repaymentStructure === "bullet") {
            scheduledPrincipal =
              t >= 0 && t === repaymentMonthsTotal - 1 ? loanBalance : 0;
          } else if (repaymentStructure === "interest-only") {
            if (t >= Math.min(ioMonths, repaymentMonthsTotal)) {
              const amortMonthsAfterIO = Math.max(
                1,
                repaymentMonthsTotal - Math.min(ioMonths, repaymentMonthsTotal)
              );
              const payment = levelPayment(loanBalance, amortMonthsAfterIO);
              scheduledPrincipal = Math.max(
                0,
                Math.min(loanBalance, payment - interest)
              );
            }
          } else {
            const sched = levelPayment(loanBalance, remainingMonths);
            scheduledPrincipal = Math.max(0, Math.min(loanBalance, sched - interest));
          }
        } else if (repaymentStructure === "bullet") {
          scheduledPrincipal =
            t >= 0 && t === repaymentMonthsTotal - 1 ? loanBalance : 0;
        } else if (repaymentStructure === "interest-only") {
          if (t >= Math.min(ioMonths, repaymentMonthsTotal)) {
            const amortMonthsAfterIO = Math.max(
              1,
              repaymentMonthsTotal - Math.min(ioMonths, repaymentMonthsTotal)
            );
            const payment = levelPayment(loanBalance, amortMonthsAfterIO);
            scheduledPrincipal = Math.max(
              0,
              Math.min(loanBalance, payment - interest)
            );
          } else {
            scheduledPrincipal = 0;
          }
        } else {
          const sched = levelPayment(loanBalance, remainingMonths);
          scheduledPrincipal = Math.max(0, Math.min(loanBalance, sched - interest));
        }

        debtServiceForDscr = interest + scheduledPrincipal;

        // Actual repayment from sales: cover interest first, then scheduled principal,
        // then allow voluntary prepayment with any remaining sales allocated to debt.
        const availableAfterInterest = Math.max(0, salesToDebt - interest);
        const principalScheduledPaid = Math.min(scheduledPrincipal, availableAfterInterest);
        const availableAfterScheduled = Math.max(0, availableAfterInterest - principalScheduledPaid);
        const principalPrepay = Math.min(
          Math.max(0, loanBalance - principalScheduledPaid),
          availableAfterScheduled
        );

        principal = Math.min(loanBalance, principalScheduledPaid + principalPrepay);

        loanBalance = Math.max(0, loanBalance - principal);
      } else {
        debtServiceForDscr = 0;
      }

      // Rows D/E/F are signed (negative = cash outflow).
      const interestPayment = -interest;
      let principalRepayment = -principal;
      const commitmentFeePayment = 0;

      // G–H: Equity-second gap-fill (loan drawdown fixed above).
      // Shortfall basis = cumulative NCF **post** through M(m-1) + this month's pre-equity cash
      // (= Σ pre+loan+int+prin through m + Σ equity through m-1). Do NOT add equity twice.
      const ncfBeforeEquityThisMonth =
        ncfPreFinancing +
        fyeNonOperatingPreFinInflows +
        loanDrawdown +
        (idcIncludedInNcfPre ? 0 : interestPayment) +
        principalRepayment;

      const prevCumulativeNcfPostFromRow =
        m === 0 ? 0 : (data[m - 1]?.cumulativeNcfPostFinancing ?? 0);
      const prevCumulativeEquityInjected =
        m === 0 ? 0 : (data[m - 1]?.cumulativeEquityInjected ?? 0);

      const positionBeforeThisEquity =
        prevCumulativeNcfPostFromRow + ncfBeforeEquityThisMonth;
      const GAP_FILL_EPS = 1e-6;

      let equityInjection = 0;
      if (m === 0 && landAs100Equity) {
        equityInjection = landCostEquityM0;
      } else if (positionBeforeThisEquity < -GAP_FILL_EPS) {
        equityInjection = -positionBeforeThisEquity;
      }
      equityInjection = Math.max(0, equityInjection);

      const cumulativeEquityInjected =
        prevCumulativeEquityInjected + equityInjection;

      // I. NCF (Post-Financing) = Pre + Draw + Interest + Principal + Equity
      const ncfPostFinancing = ncfBeforeEquityThisMonth + equityInjection;

      const cumulativeNcfPostFinancing =
        prevCumulativeNcfPostFromRow + ncfPostFinancing;

      // Row C: cumulative loan balance (draws - repayments)
      cumulativeLoanBalance = Math.max(
        0,
        cumulativeLoanBalance + loanDrawdown + principalRepayment
      );
      loanBalance = cumulativeLoanBalance;

      const equityInvestorCF = ncfPostFinancing;

      // DSCR: hotel NOI (revenue − OpEx − |ΔWC|) / annual debt service — operating FYE only.
      const annualDebtServiceForDscr = debtServiceForDscr * 12;
      const noiAnnualForDscr =
        isOpFyeMonth &&
        m >= operationsStartMonth &&
        opYearIndex0 >= 0 &&
        opYearIndex0 < 10
          ? (hotelPnl?.totalHotelRevenue?.[opYearIndex0] ?? 0) -
            (hotelPnl?.totalExpenses?.[opYearIndex0] ?? 0) -
            Math.abs(changeInWorkingCapitalYearly[opYearIndex0] ?? 0)
          : 0;
      const dscr =
        isOpFyeMonth &&
        m >= operationsStartMonth &&
        opYearIndex0 >= 0 &&
        annualDebtServiceForDscr > 1e-6
          ? noiAnnualForDscr / annualDebtServiceForDscr
          : null;

      data.push({
        month: m,
        unitSales,
        bulkSales,
        totalInflow,
        landCostOutflow,
        constructionCostOutflow,
        softCostsOutflow,
        powcOutflow,
        ffeOutflow,
        idcInterestOutflow: idcCashOutPreFinancing,
        totalOutflowPreFinancing,
        totalOutflowAll,
        profileOutflow,
        ncfPreFinancing,
        loanDrawdown,
        cumulativeLoanBalance,
        interestPayment,
        principalRepayment,
        commitmentFeePayment,
        equityInjection,
        cumulativeEquityInjected,
        ncfPostFinancing,
        cumulativeNcfPostFinancing,
        equityInvestorCF,
        dscr: dscr != null ? Math.round(dscr * 100) / 100 : null,
        loanBalance,
      });
    }

    return data;
  }, [
    constructionPeriod,
    totalHoldPeriodMonths,
    loanAtCompletion,
    monthlyInterestRate,
    totalLandCost,
    constructionCostSchedule,
    outflowProfile.softCosts,
    outflowProfile.powc,
    operationsStartMonth,
    financing.exitStrategy,
    amortizationPeriod,
    repaymentStructure,
    interestOnlyPeriodYears,
    finStream,
    financing.loanType,
    financing.gracePeriodYears,
    financing.amortizationSchedule,
    financing.debtRepaymentPriority,
    financing.monthlyDrawdowns,
    (financing as { loanAmount?: number }).loanAmount,
    debtFacilityAmount,
    cashOutflows.landCost,
    cashOutflows.softCosts,
    inflowScheduleMap,
    bulkShare,
    hotelPnl,
    financing.landEquityPercent,
    idcCapitalizedShare,
    changeInWorkingCapitalYearly,
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("=== M40 NCF Pre Component Breakdown ===");

    const m40Data = monthlyData.find((d) => d.month === 40);
    const idc = m40Data?.idcInterestOutflow ?? 0;
    const hard = m40Data?.totalOutflowPreFinancing ?? 0;
    const inflow = m40Data?.totalInflow ?? 0;
    const ncfPre = m40Data?.ncfPreFinancing ?? 0;

    // eslint-disable-next-line no-console
    console.log("M40 Components:");
    // eslint-disable-next-line no-console
    console.log(`  landCostOutflow: ${((m40Data?.landCostOutflow ?? 0) / 1000).toFixed(1)}K`);
    // eslint-disable-next-line no-console
    console.log(
      `  constructionCostOutflow: ${((m40Data?.constructionCostOutflow ?? 0) / 1000).toFixed(1)}K`
    );
    // eslint-disable-next-line no-console
    console.log(`  softCostsOutflow: ${((m40Data?.softCostsOutflow ?? 0) / 1000).toFixed(1)}K`);
    // eslint-disable-next-line no-console
    console.log(`  powcOutflow: ${((m40Data?.powcOutflow ?? 0) / 1000).toFixed(1)}K`);
    // eslint-disable-next-line no-console
    console.log(`  ffeOutflow: ${((m40Data?.ffeOutflow ?? 0) / 1000).toFixed(1)}K`);
    // eslint-disable-next-line no-console
    console.log(`  idcInterestOutflow: ${(idc / 1000).toFixed(1)}K`);
    // eslint-disable-next-line no-console
    console.log(`  totalOutflowPreFinancing (hard costs): ${(hard / 1000).toFixed(1)}K`);
    // eslint-disable-next-line no-console
    console.log(
      `  totalOutflowAll (hard + IDC, TOTAL OUTFLOW row): ${((m40Data?.totalOutflowAll ?? 0) / 1000).toFixed(1)}K`
    );
    // eslint-disable-next-line no-console
    console.log(`  totalInflow: ${(inflow / 1000).toFixed(1)}K`);
    // eslint-disable-next-line no-console
    console.log(`  NCF Pre: ${(ncfPre / 1000).toFixed(1)}K`);
    // eslint-disable-next-line no-console
    console.log(`  NCF Post: ${((m40Data?.ncfPostFinancing ?? 0) / 1000).toFixed(1)}K`);

    // eslint-disable-next-line no-console
    console.log("\nIdentity check: NCF Pre ≈ inflow − hard − IDC");
    const expectedPre = inflow - hard - idc;
    // eslint-disable-next-line no-console
    console.log(
      `  expected NCF Pre: ${(expectedPre / 1000).toFixed(1)}K, actual: ${(ncfPre / 1000).toFixed(1)}K ${Math.abs(ncfPre - expectedPre) < 2 ? "✅" : "❌"}`
    );
    // eslint-disable-next-line no-console
    console.log(`  IDC included in NCF Pre (via outflow): ${idc > 0 ? "✅ YES" : "❌ NO"}`);
    const tout = m40Data?.totalOutflowAll ?? 0;
    // eslint-disable-next-line no-console
    console.log(
      `  NCF Pre vs totalOutflowAll: inflow − totalOutflowAll = ${((inflow - tout) / 1000).toFixed(1)}K, NCF Pre = ${(ncfPre / 1000).toFixed(1)}K ${Math.abs(ncfPre - (inflow - tout)) < 2 ? "✅" : "❌"}`
    );
  }, [monthlyData]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("=== TOTAL OUTFLOW vs NCF Pre (engine source investigation) ===");

    const testMonths = [39, 40, 46, 58, 70, 82];
    testMonths.forEach((month) => {
      const data = monthlyData.find((d) => d.month === month);
      const totalInflow = data?.totalInflow ?? 0;
      const ncfPre = data?.ncfPreFinancing ?? 0;
      const tout = data?.totalOutflowAll ?? 0;
      const identityOutflow = totalInflow - ncfPre;

      // eslint-disable-next-line no-console
      console.log(`M${month}:`);
      // eslint-disable-next-line no-console
      console.log(`  monthlyData.ncfPreFinancing: ${(ncfPre / 1000).toFixed(1)}K`);
      // eslint-disable-next-line no-console
      console.log(`  monthlyData.totalOutflowAll: ${(tout / 1000).toFixed(1)}K`);
      // eslint-disable-next-line no-console
      console.log(`  totalInflow: ${(totalInflow / 1000).toFixed(1)}K`);
      // eslint-disable-next-line no-console
      console.log(
        `  inflow − NCF Pre (= identity): ${(identityOutflow / 1000).toFixed(1)}K`
      );
      // eslint-disable-next-line no-console
      console.log(
        `  totalOutflowAll === inflow−NCF Pre: ${Math.abs(tout - identityOutflow) < 2 ? "✅" : "❌"}`
      );
      if (totalInflow === 0) {
        // eslint-disable-next-line no-console
        console.log(
          `  |NCF Pre| === totalOutflowAll: ${Math.abs(Math.abs(ncfPre) - tout) < 2 ? "✅" : "❌"}`
        );
      }
    });
  }, [monthlyData]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("=== Project Type Verification ===");
    // eslint-disable-next-line no-console
    console.log(`financing.exitStrategy: ${financing.exitStrategy ?? "(undefined → hold)"}`);
    // eslint-disable-next-line no-console
    console.log(
      `Is HOLD (dev sales suppressed before ops): ${(financing.exitStrategy ?? "hold") === "hold" ? "✅" : "❌"}`
    );
  }, [financing.exitStrategy]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("=== M39 totalOutflowAll Component Breakdown (HOLD Project) ===");

    const m39 = monthlyData.find((d) => d.month === 39);
    const prof = m39?.profileOutflow ?? 0;
    const idc = m39?.idcInterestOutflow ?? 0;
    const tout = m39?.totalOutflowAll ?? 0;
    const sumOfComponents = prof + idc;

    // eslint-disable-next-line no-console
    console.log("M39 Values in monthlyData:");
    // eslint-disable-next-line no-console
    console.log(`  totalInflow: ${((m39?.totalInflow ?? 0) / 1000).toFixed(1)}K (expect 0 for hold)`);
    // eslint-disable-next-line no-console
    console.log(`  totalOutflowAll: ${(tout / 1000).toFixed(1)}K`);
    // eslint-disable-next-line no-console
    console.log(`  ncfPreFinancing: ${((m39?.ncfPreFinancing ?? 0) / 1000).toFixed(1)}K`);
    // eslint-disable-next-line no-console
    console.log(`  profileOutflow (hard rows): ${(prof / 1000).toFixed(1)}K`);
    // eslint-disable-next-line no-console
    console.log(`  idcInterestOutflow: ${(idc / 1000).toFixed(1)}K`);
    // eslint-disable-next-line no-console
    console.log("\nDouble-Counting Check:");
    // eslint-disable-next-line no-console
    console.log(`  profileOutflow + idcInterest = ${(sumOfComponents / 1000).toFixed(1)}K`);
    // eslint-disable-next-line no-console
    console.log(
      `  Match totalOutflowAll: ${Math.abs(sumOfComponents - tout) < 1000 ? "✅" : "❌"}`
    );
  }, [monthlyData]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("=== NCF Pre-Financing Verification ===");

    const targets = [
      { month: 40, description: "M40 - End of Construction" },
      { month: 46, description: "M46 - End of Pre-Ops" },
      { month: 58, description: "M58 - First Operational FYE" },
      { month: 70, description: "M70 - Year 3 FYE" },
      { month: 82, description: "M82 - Year 4 FYE" },
    ];

    // eslint-disable-next-line no-console
    console.log("NCF Pre-Financing Check:");
    targets.forEach(({ month, description }) => {
      const row = monthlyData.find((d) => d.month === month);
      const ncfPre = row?.ncfPreFinancing ?? 0;
      const totalOutflowProfile = calculateTotalOutflow?.[month] ?? 0;
      const totalInflow = row?.totalInflow ?? 0;
      const rowPreFinOut = row?.totalOutflowPreFinancing ?? 0;
      const inConstructionWindow = month <= constructionPeriod;
      // eslint-disable-next-line no-console
      console.log(`${description}:`);
      // eslint-disable-next-line no-console
      console.log(`  NCF Pre: ${(ncfPre / 1000).toFixed(0)}K`);
      // eslint-disable-next-line no-console
      console.log(
        `  TOTAL OUTFLOW (profile monthlyTotal): ${(totalOutflowProfile / 1000).toFixed(0)}K`
      );
      if (inConstructionWindow) {
        // eslint-disable-next-line no-console
        console.log(
          `  Row pre-fin outflow === profile: ${rowPreFinOut === totalOutflowProfile ? "✅" : "❌"}`
        );
      }
      // eslint-disable-next-line no-console
      console.log(
        `  Match (NCF Pre = -Outflow, ignores inflows): ${ncfPre === -totalOutflowProfile ? "✅" : "❌"}`
      );
      const expectedNcfFromIdentity = totalInflow - rowPreFinOut;
      // Operational FYE still adds operating outflow not stored on row; compare only when no op outflow expected
      if (month < operationsStartMonth) {
        const idcRow = row?.idcInterestOutflow ?? 0;
        const expectedWithIdc = totalInflow - rowPreFinOut - idcRow;
        // eslint-disable-next-line no-console
        console.log(
          `  Match (NCF = inflow − hard − IDC): ${Math.abs(ncfPre - expectedWithIdc) < 2 ? "✅" : "❌"}`
        );
        // eslint-disable-next-line no-console
        console.log(
          `  (legacy inflow−hard only): ${Math.abs(ncfPre - expectedNcfFromIdentity) < 1 ? "✅" : "❌"}`
        );
      }
    });

    const m40 = monthlyData.find((d) => d.month === 40);
    const m58 = monthlyData.find((d) => d.month === 58);
    const out40 = calculateTotalOutflow?.[40] ?? 0;
    const ncf40Val = m40?.ncfPreFinancing ?? 0;
    const match40 = ncf40Val === -out40 ? "✅" : "❌";
    // eslint-disable-next-line no-console
    console.log(
      `Summary — M40: NCF Pre=${(ncf40Val / 1000).toFixed(0)}K, TOTAL OUTFLOW=${(out40 / 1000).toFixed(0)}K, Match(NCF=-Outflow)=${match40}`
    );
    // eslint-disable-next-line no-console
    console.log(
      `Summary — M58: NCF Pre=${((m58?.ncfPreFinancing ?? 0) / 1000).toFixed(0)}K`
    );
  }, [
    monthlyData,
    calculateTotalOutflow,
    constructionPeriod,
    operationsStartMonth,
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("=== Operational NCF Pre-Financing Fix Verification ===");

    const targets = [
      {
        month: 58,
        expectedNCFPreK: 47725,
        expectedInterestK: -27826,
        expectedPrincipalK: -30918,
      },
      {
        month: 70,
        expectedNCFPreK: 49450,
        expectedInterestK: -25044,
        expectedPrincipalK: -30918,
      },
      {
        month: 82,
        expectedNCFPreK: 51200,
        expectedInterestK: -22262,
        expectedPrincipalK: -30918,
      },
    ];

    // eslint-disable-next-line no-console
    console.log(
      "Operational NCF Pre Check (Pre row = NOI; interest/principal only in bridge to Post):"
    );
    targets.forEach(
      ({ month, expectedNCFPreK, expectedInterestK, expectedPrincipalK }) => {
        const row = monthlyData.find((d) => d.month === month);
        const ncfPre = row?.ncfPreFinancing ?? 0;
        const interest = row?.interestPayment ?? 0;
        const principal = row?.principalRepayment ?? 0;

        const ncfPreK = ncfPre / 1000;
        const interestK = interest / 1000;
        const principalK = principal / 1000;

        const ncfPreMatch = Math.abs(ncfPreK - expectedNCFPreK) < 500;
        const interestMatch = Math.abs(interestK - expectedInterestK) < 500;
        const principalMatch = Math.abs(principalK - expectedPrincipalK) < 500;

        // eslint-disable-next-line no-console
        console.log(`M${month}:`);
        // eslint-disable-next-line no-console
        console.log(
          `  NCF Pre: ${ncfPreK.toFixed(0)}K (expected ~${expectedNCFPreK}K) ${ncfPreMatch ? "✅" : "❌"}`
        );
        // eslint-disable-next-line no-console
        console.log(
          `  Interest: ${interestK.toFixed(0)}K (expected ~${expectedInterestK}K) ${interestMatch ? "✅" : "❌"}`
        );
        // eslint-disable-next-line no-console
        console.log(
          `  Principal: ${principalK.toFixed(0)}K (expected ~${expectedPrincipalK}K) ${principalMatch ? "✅" : "❌"}`
        );

        const ncfPostBeforeEquity = ncfPre + interest + principal;
        // eslint-disable-next-line no-console
        console.log(
          `  NCF Post (Before Equity, NOI + debt service only): ${(ncfPostBeforeEquity / 1000).toFixed(0)}K`
        );
      }
    );
  }, [monthlyData]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("=== Amortization Schedule Index Verification ===");

    const testMonths = [46, 58, 70, 82];
    testMonths.forEach((month) => {
      const opYearIndex = Math.floor((month - operationsStartMonth) / 12);
      const scheduleEntry = financing.amortizationSchedule?.[opYearIndex];

      // eslint-disable-next-line no-console
      console.log(`M${month}:`);
      // eslint-disable-next-line no-console
      console.log(`  opYearIndex: ${opYearIndex}`);
      // eslint-disable-next-line no-console
      console.log(`  spreadsheetYear: ${scheduleEntry?.spreadsheetYear}`);
      // eslint-disable-next-line no-console
      console.log(`  Interest (annual, raw): ${((scheduleEntry?.interest ?? 0) / 1000).toFixed(0)}K`);
      // eslint-disable-next-line no-console
      console.log(`  Principal (annual, raw): ${((scheduleEntry?.principal ?? 0) / 1000).toFixed(0)}K`);
    });
  }, [financing.amortizationSchedule, operationsStartMonth]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("=== Interest/Principal Fix Verification ===");

    const targets = [46, 58, 70, 82];

    targets.forEach((month) => {
      const row = monthlyData.find((d) => d.month === month);
      const opYearIndex = Math.floor((month - operationsStartMonth) / 12);
      const scheduleEntry = financing.amortizationSchedule?.[opYearIndex];

      // eslint-disable-next-line no-console
      console.log(`M${month} (opYearIndex ${opYearIndex}):`);
      // eslint-disable-next-line no-console
      console.log(
        `  Schedule Interest: ${((scheduleEntry?.interest ?? 0) / 1000).toFixed(0)}K`
      );
      // eslint-disable-next-line no-console
      console.log(
        `  Schedule Principal: ${((scheduleEntry?.principal ?? 0) / 1000).toFixed(0)}K`
      );
      // eslint-disable-next-line no-console
      console.log(`  data.interestPayment: ${((row?.interestPayment ?? 0) / 1000).toFixed(0)}K`);
      // eslint-disable-next-line no-console
      console.log(
        `  data.principalRepayment: ${((row?.principalRepayment ?? 0) / 1000).toFixed(0)}K`
      );
      const intMatch =
        Math.abs((row?.interestPayment ?? 0) + (scheduleEntry?.interest ?? 0)) < 100;
      const prinMatch =
        Math.abs((row?.principalRepayment ?? 0) + (scheduleEntry?.principal ?? 0)) < 100;
      // eslint-disable-next-line no-console
      console.log(`  Match Interest: ${intMatch ? "✅" : "❌"}`);
      // eslint-disable-next-line no-console
      console.log(`  Match Principal: ${prinMatch ? "✅" : "❌"}`);
    });
  }, [monthlyData, financing.amortizationSchedule, operationsStartMonth]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const landCostLog =
      Number((operationalInputs as { landCost?: number } | undefined)?.landCost) ||
      cashOutflows.landCost ||
      0;
    const landAs100 = (financing.landEquityPercent ?? 40) >= 100;
    const possibleLandKeys = [
      "landAsEquity",
      "landAs100Equity",
      "treatLandAsEquity",
      "landEquityToggle",
      "landCostAsEquity",
    ] as const;
    // eslint-disable-next-line no-console
    console.log("=== Equity-Second-Gap-Fill Verification ===");
    // eslint-disable-next-line no-console
    console.log("\n1. Land toggle (Step 3):");
    // eslint-disable-next-line no-console
    console.log("   financing keys (sample):", Object.keys(financing).slice(0, 25).join(", "), "…");
    let foundExtraLandKey: string | null = null;
    for (const k of possibleLandKeys) {
      if (k in financing) {
        foundExtraLandKey = k;
        // eslint-disable-next-line no-console
        console.log(`   ✅ financing.${k}:`, (financing as Record<string, unknown>)[k]);
      }
    }
    if (!foundExtraLandKey) {
      // eslint-disable-next-line no-console
      console.log(
        "   Using wizard rule: landEquityPercent >= 100 ⇒ land as equity ON; else gap-fill."
      );
    }
    // eslint-disable-next-line no-console
    console.log(`   Land as 100% equity (landEquityPercent): ${landAs100 ? "ON" : "OFF"}`);
    // eslint-disable-next-line no-console
    console.log(`   Land cost (Component 1 / fallback): ${(landCostLog / 1000).toFixed(0)}K`);

    const m0Loan = monthlyData.find((d) => d.month === 0)?.loanDrawdown ?? 0;
    const m3Loan = monthlyData.find((d) => d.month === 3)?.loanDrawdown ?? 0;
    const m58Loan = monthlyData.find((d) => d.month === 58)?.loanDrawdown ?? 0;
    // eslint-disable-next-line no-console
    console.log("\n2. Loan drawdown (read-only engine; should be stable):");
    // eslint-disable-next-line no-console
    console.log(
      `   M0=${(m0Loan / 1000).toFixed(0)}K, M3=${(m3Loan / 1000).toFixed(0)}K, M58=${(m58Loan / 1000).toFixed(0)}K`
    );
    // eslint-disable-next-line no-console
    console.log(
      `   Loan sanity (M0 raw < 50M, M58 draw = 0): ${
        m0Loan < 50_000_000 && m58Loan === 0 ? "✅ PASS" : "⚠️ CHECK"
      }`
    );

    // eslint-disable-next-line no-console
    console.log("\n3. Equity injection (engine) at key months:");
    [0, 1, 40, 46, 58, 70, 82].forEach((month) => {
      const row = monthlyData.find((d) => d.month === month);
      // eslint-disable-next-line no-console
      console.log(
        `   M${month}: equity=${((row?.equityInjection ?? 0) / 1000).toFixed(0)}K, cum equity=${((row?.cumulativeEquityInjected ?? 0) / 1000).toFixed(0)}K`
      );
    });

    const minCumNcf = Math.min(
      ...monthlyData.map((d) => d.cumulativeNcfPostFinancing ?? 0)
    );
    const allNonNeg = monthlyData.every(
      (d) => (d.cumulativeNcfPostFinancing ?? 0) >= -1e-6
    );
    // eslint-disable-next-line no-console
    console.log("\n4. Cumulative NCF post (engine):");
    // eslint-disable-next-line no-console
    console.log(`   All months ≥ 0: ${allNonNeg ? "✅ PASS" : "❌ FAIL"}`);
    // eslint-disable-next-line no-console
    console.log(`   Minimum cumulative NCF post: ${(minCumNcf / 1000).toFixed(2)}K`);

    const m46 = monthlyData.find((d) => d.month === 46);
    const m58 = monthlyData.find((d) => d.month === 58);
    if (m46 && m58) {
      const i46 = monthlyData.findIndex((d) => d.month === 46);
      const i58 = monthlyData.findIndex((d) => d.month === 58);
      const slice58 = monthlyData
        .slice(0, i58 + 1)
        .reduce((s, d) => s + (d.ncfPostFinancing ?? 0), 0);
      const engine58 = m58.cumulativeNcfPostFinancing ?? 0;
      // eslint-disable-next-line no-console
      console.log("\n5. Dense timeline M46→M58 (each month is one array row):");
      // eslint-disable-next-line no-console
      console.log(`   Index M46=${i46}, M58=${i58} (difference ${i58 - i46} month-rows)`);
      // eslint-disable-next-line no-console
      console.log(
        `   Slice(0..M58) vs engine cumulative: ${Math.abs(slice58 - engine58) < 1 ? "✅ PASS" : "❌ FAIL"}`
      );
    }
    // eslint-disable-next-line no-console
    console.log("\n6. Cumulative NCF post at FYE months:");
    [46, 58, 70, 82, 166].forEach((month) => {
      const row = monthlyData.find((d) => d.month === month);
      // eslint-disable-next-line no-console
      console.log(
        `   M${month}: ${((row?.cumulativeNcfPostFinancing ?? 0) / 1000).toFixed(2)}K`
      );
    });

    // eslint-disable-next-line no-console
    console.log("\n7. Gap-fill order (equity should be 0 when pre-equity position ≥ 0):");
    [58, 70, 82, 94, 106].forEach((month) => {
      const row = monthlyData.find((d) => d.month === month);
      const cum = row?.cumulativeNcfPostFinancing ?? 0;
      const eq = row?.equityInjection ?? 0;
      const mi = monthlyData.findIndex((d) => d.month === month);
      const prevPost =
        mi <= 0 ? 0 : (monthlyData[mi - 1]?.cumulativeNcfPostFinancing ?? 0);
      const comp = row
        ? (row.ncfPreFinancing ?? 0) +
          (row.loanDrawdown ?? 0) +
          (row.interestPayment ?? 0) +
          (row.principalRepayment ?? 0)
        : 0;
      const posBeforeEq = prevPost + comp;
      const ok =
        posBeforeEq >= -1e-3
          ? Math.abs(eq) < 1e-3
          : Math.abs(eq + posBeforeEq) < 1e-3;
      // eslint-disable-next-line no-console
      console.log(
        `   M${month}: posPreEq=${(posBeforeEq / 1000).toFixed(2)}K, cumPost=${(cum / 1000).toFixed(2)}K, eq=${(eq / 1000).toFixed(2)}K ${ok ? "✅" : "❌"}`
      );
    });
  }, [monthlyData, financing, operationalInputs, cashOutflows.landCost]);

  /** Peak funding from timeline (includes M0 land-as-equity + gap-fill through hold). */
  const peakEquityInjected = useMemo(
    () =>
      monthlyData.length > 0
        ? Math.max(
            0,
            ...monthlyData.map((d) => d.cumulativeEquityInjected ?? 0)
          )
        : dynamicPeakEquityRequired,
    [monthlyData, dynamicPeakEquityRequired]
  );

  const equityPostFinancingSeries = useMemo(
    () => monthlyData.map((d) => d.ncfPostFinancing),
    [monthlyData]
  );

  /**
   * Levered equity IRR — monthly series (user requirement for /operational/preview/financing):
   * - Negative CFs: all months with equity injections (−equityInjection).
   * - Positive CFs: ONLY at the exit / loan-repayment month (typically M166),
   *   using `cumulativeNcfPostFinancing` at that month.
   * - All intermediate months are 0 (no distributions before the loan is fully repaid).
   */
  const leveredEquityMonthlyCashFlows = useMemo(() => {
    const exitOy = Math.min(10, Math.max(1, exitYear - 3));
    const exitFyeMonth = getOperationalYearMonthRange(
      exitOy,
      constructionPeriod
    ).endMonth;
    const terminalMonth =
      exitStrategy === "hold" ? totalHoldPeriodMonths : exitFyeMonth;

    if (!monthlyData.length || terminalMonth < 0) return [];

    const rowByMonth = (m: number) =>
      monthlyData[m]?.month === m
        ? monthlyData[m]
        : monthlyData.find((d) => d.month === m);

    // Build monthly series (0..terminalMonth).
    const flows: number[] = new Array(terminalMonth + 1).fill(0);
    for (let m = 0; m <= terminalMonth; m++) {
      const row = rowByMonth(m);
      const eq = row?.equityInjection ?? 0;
      const cumPost = (row as any)?.cumulativeNcfPostFinancing ?? 0;
      if (eq > 0) {
        flows[m] = -eq;
      } else if (m === terminalMonth) {
        flows[m] = cumPost;
      } else {
        flows[m] = 0;
      }
    }

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("=== Levered Equity IRR Cash Flow Rules ===");
      // eslint-disable-next-line no-console
      console.log(`  Terminal / Exit month: M${terminalMonth}`);
      // eslint-disable-next-line no-console
      console.log(
        `  Positive CF months: ${flows
          .map((v, i) => ({ i, v }))
          .filter((x) => x.v > 0)
          .map((x) => `M${x.i}`)
          .join(", ") || "none"} (should be ONLY M${terminalMonth})`
      );
      // eslint-disable-next-line no-console
      console.log(
        `  Key months: M130=${((flows[130] ?? 0) / 1000).toFixed(0)}K, M142=${(
          (flows[142] ?? 0) / 1000
        ).toFixed(0)}K, M154=${((flows[154] ?? 0) / 1000).toFixed(0)}K, M${terminalMonth}=${(
          (flows[terminalMonth] ?? 0) / 1000
        ).toFixed(0)}K`
      );
    }

    return flows;
  }, [
    monthlyData,
    exitYear,
    constructionPeriod,
    exitStrategy,
    totalHoldPeriodMonths,
  ]);

  const equityIRRAnnualPct = useMemo(
    () =>
      annualIrrPercentFromMonthlySeries(leveredEquityMonthlyCashFlows) ?? 0,
    [leveredEquityMonthlyCashFlows]
  );
  const equityIRR = equityIRRAnnualPct / 100;

  const equityMultiple = useMemo(
    () => equityMultipleFromSeries(equityPostFinancingSeries) ?? 0,
    [equityPostFinancingSeries]
  );

  const equityPaybackMonth = useMemo(() => {
    const idx = paybackMonthCrossingFromNegative(leveredEquityMonthlyCashFlows);
    if (idx == null) return -1;
    return idx;
  }, [leveredEquityMonthlyCashFlows]);

  const totalEquityInvestedGross = useMemo(
    () =>
      monthlyData.reduce((s, d) => s + (d.equityInjection ?? 0), 0),
    [monthlyData]
  );

  const totalEquityReturned = useMemo(
    () =>
      monthlyData.reduce(
        (s, d) => s + Math.max(0, d.ncfPostFinancing ?? 0),
        0
      ),
    [monthlyData]
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const cashFlowValues = leveredEquityMonthlyCashFlows;
    let runCum = 0;
    const monthlyCashFlows = cashFlowValues.map((cf, m) => {
      runCum += cf;
      return { month: m, cashFlow: cf, cumulative: runCum };
    });
    const negSum = cashFlowValues
      .filter((x) => x < 0)
      .reduce((a, b) => a + b, 0);
    const posSum = cashFlowValues
      .filter((x) => x > 0)
      .reduce((a, b) => a + b, 0);
    const totalInvestment = Math.abs(negSum);
    const sanityMultiple =
      totalInvestment > 1e-6 ? posSum / totalInvestment : 0;

    // eslint-disable-next-line no-console
    console.log("=== IRR Cash Flow Verification ===");
    // eslint-disable-next-line no-console
    console.log("IRR series = NCF Post-Financing per month (includes gap-fill equity).");
    // eslint-disable-next-line no-console
    console.log("\nKey month cash flows:");
    const keyMonths = [
      0, 40, 46, 58, 70, 82, 94, 106, 118, 130, 142, 154, 166,
    ];
    keyMonths.forEach((m) => {
      if (m >= cashFlowValues.length) return;
      const data = monthlyData.find((d) => d.month === m);
      const cf = cashFlowValues[m] ?? 0;
      const cumulative = monthlyCashFlows[m]?.cumulative ?? 0;
      // eslint-disable-next-line no-console
      console.log(`  M${m}:`);
      // eslint-disable-next-line no-console
      console.log(`    NCF Post: ${((data?.ncfPostFinancing ?? 0) / 1000).toFixed(0)}K`);
      // eslint-disable-next-line no-console
      console.log(`    Equity injection: ${((data?.equityInjection ?? 0) / 1000).toFixed(0)}K`);
      // eslint-disable-next-line no-console
      console.log(`    IRR cash flow (same as NCF Post): ${(cf / 1000).toFixed(0)}K`);
      // eslint-disable-next-line no-console
      console.log(`    Cumulative: ${(cumulative / 1000).toFixed(0)}K`);
    });
    // eslint-disable-next-line no-console
    console.log("\nIRR calculation:");
    // eslint-disable-next-line no-console
    console.log(`  Total negative CF: ${(negSum / 1000).toFixed(0)}K`);
    // eslint-disable-next-line no-console
    console.log(`  Total positive CF: ${(posSum / 1000).toFixed(0)}K`);
    // eslint-disable-next-line no-console
    console.log(`  Calculated IRR: ${equityIRRAnnualPct.toFixed(2)}%`);
    // eslint-disable-next-line no-console
    console.log("  Expected IRR: ~10% - 20% (illustrative)");
    // eslint-disable-next-line no-console
    console.log("\nSanity check (sum pos / |sum neg|):");
    // eslint-disable-next-line no-console
    console.log(`  Multiple from CF signs: ${sanityMultiple.toFixed(2)}x`);
    // eslint-disable-next-line no-console
    console.log(`  Displayed equity multiple: ${equityMultiple.toFixed(2)}x`);
    // eslint-disable-next-line no-console
    console.log(
      `  Match: ${Math.abs(sanityMultiple - equityMultiple) < 1 ? "✅ close" : "⚠️ differs (multiple uses NCF post series)"}`
    );
    // eslint-disable-next-line no-console
    console.log(
      `\nPayback (cumulative crosses ≥0 after negative): ${equityPaybackMonth >= 0 ? `M${equityPaybackMonth}` : "—"}`
    );
  }, [
    leveredEquityMonthlyCashFlows,
    monthlyData,
    equityIRRAnnualPct,
    equityMultiple,
    equityPaybackMonth,
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const cashFlowValues = leveredEquityMonthlyCashFlows;
    const mIrr = monthlyIrrFromSeries(cashFlowValues);
    const validIRR = mIrr ?? 0;
    const negSum = cashFlowValues
      .filter((cf) => cf < 0)
      .reduce((a, b) => a + b, 0);
    const posSum = cashFlowValues
      .filter((cf) => cf > 0)
      .reduce((a, b) => a + b, 0);
    const totalInvestment = Math.abs(negSum);
    const totalReturn = posSum;
    const simpleIRR =
      totalInvestment > 1e-6 && holdPeriodYears > 0
        ? Math.pow(totalReturn / totalInvestment, 1 / holdPeriodYears) - 1
        : 0;
    // eslint-disable-next-line no-console
    console.log("=== Equity Cash Flow Array (Dynamic Exit) ===");
    const terminalIdx = Math.max(0, cashFlowValues.length - 1);
    // eslint-disable-next-line no-console
    console.log(`  Step 7 exit year (spreadsheet): Y${exitYear}`);
    // eslint-disable-next-line no-console
    console.log(`  Exit strategy: ${exitStrategy}`);
    // eslint-disable-next-line no-console
    console.log(
      `  IRR terminal month: M${terminalIdx} (hold → M${totalHoldPeriodMonths}; sale/refi → FYE for Y${exitYear})`
    );
    // eslint-disable-next-line no-console
    console.log(
      `  M0 ( −equity ): ${((cashFlowValues[0] ?? 0) / 1000).toFixed(0)}K, M${terminalIdx} (+cum NCF post): ${((cashFlowValues[terminalIdx] ?? 0) / 1000).toFixed(0)}K`
    );
    // eslint-disable-next-line no-console
    console.log("=== IRR Function Debug ===");
    // eslint-disable-next-line no-console
    console.log("Cash flow summary:");
    // eslint-disable-next-line no-console
    console.log(`  Array length: ${cashFlowValues.length}`);
    // eslint-disable-next-line no-console
    console.log(
      `  First 5 CF: ${cashFlowValues
        .slice(0, 5)
        .map((cf) => `${(cf / 1000).toFixed(0)}K`)
        .join(", ")}`
    );
    // eslint-disable-next-line no-console
    console.log(
      `  Last 5 CF: ${cashFlowValues
        .slice(-5)
        .map((cf) => `${(cf / 1000).toFixed(0)}K`)
        .join(", ")}`
    );
    // eslint-disable-next-line no-console
    console.log(`  Sum of negative: ${(negSum / 1000).toFixed(0)}K`);
    // eslint-disable-next-line no-console
    console.log(`  Sum of positive: ${(posSum / 1000).toFixed(0)}K`);
    // eslint-disable-next-line no-console
    console.log("\nIRR calculation (monthly rate → annual % in metrics):");
    // eslint-disable-next-line no-console
    console.log(`  Solved monthly IRR (decimal): ${validIRR.toFixed(6)}`);
    // eslint-disable-next-line no-console
    console.log(`  Annual IRR (display): ${equityIRRAnnualPct.toFixed(2)}%`);
    // eslint-disable-next-line no-console
    console.log(`  Is finite: ${Number.isFinite(validIRR)}`);
    // eslint-disable-next-line no-console
    console.log(
      `  Annual in 5%–50% band: ${equityIRRAnnualPct >= 5 && equityIRRAnnualPct <= 50 ? "✅" : "⚠️ check"}`
    );
    // eslint-disable-next-line no-console
    console.log("\nSimple IRR estimate (undiscounted timing):");
    // eslint-disable-next-line no-console
    console.log(
      `  (${(totalReturn / 1000).toFixed(0)}K / ${(totalInvestment / 1000).toFixed(0)}K)^(1/${holdPeriodYears}) − 1 = ${(simpleIRR * 100).toFixed(2)}%`
    );
    // eslint-disable-next-line no-console
    console.log(
      `  vs timed IRR (annual): ${Math.abs(equityIRRAnnualPct / 100 - simpleIRR) < 0.15 ? "✅ ballpark" : "⚠️ timing differs"}`
    );
  }, [
    leveredEquityMonthlyCashFlows,
    equityIRRAnnualPct,
    holdPeriodYears,
    exitYear,
    exitStrategy,
    totalHoldPeriodMonths,
  ]);

  // Format currency (full, with decimals)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: projectInfo.currency || 'AED',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Financing cash-flow engine: `buildFinancingEnginePreview` maps `detail` (same as Component 2/3) → `FinancingInputs`.
  // RCF sizing: engine reads `financing.approvedCreditFacility` / `debtFacilityAmount` via bridge; `debtFacilityAmount` below prefers those then LTC/LTV min.
  // Commitment fee: `financing.commitmentFeePct`, then `financingConfig.commitmentFeePct`, then `financing.commitmentFeeRate` (annual % points).
  // Preference shares: bridge maps `financing.preferenceShares` → engine pref fields (`hasPreferenceShares`, `amount`, `returnPercent` as % then ÷100 in bridge).
  // Certification interval is merged into `financingForEngine` / `config` (default 6).
  const financingEnginePreview = useMemo(() => {
    const financingConfig = (financing as Financing & { config?: FinancingConfig }).config;
    const projectData = financing as any;

    const getCertificationInterval = () => {
      const paths = [
        projectData.certificationIntervalMonths,
        projectData.config?.certificationIntervalMonths,
        projectData.certificationInterval,
        projectData.config?.certificationInterval,
        (financing as any)?.config?.certificationIntervalMonths,
      ];
      const found = paths.find((v) => typeof v === "number" && v > 0);
      const result = found || 6;

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("🔍 [Interval Resolution]:", {
          tried: paths,
          found: result,
          formData: projectData.certificationIntervalMonths,
          configData: projectData.config?.certificationIntervalMonths,
        });
      }

      return result;
    };

    const financingForEngine = {
      ...(financing as any),
      certificationInterval: getCertificationInterval(),
      config: {
        ...(financingConfig ?? {}),
        certificationIntervalMonths: getCertificationInterval(),
      },
    } as Financing;
    try {
      const hasDetailCosts = detail.months.length > 0;

      // --- DEBUG: Trace cost data into engine (must match Component 2/3 `detail` tables)
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("📊 [Engine Cost Source = detail]:", {
          hasDetailCosts,
          constructionLength: detail.construction.length,
          powcLength: detail.powcTotal.length,
          construction_M0: detail.construction[0],
          construction_M1: detail.construction[1],
          construction_M2: detail.construction[2],
          powc_M0: detail.powcTotal[0],
          powc_M1: detail.powcTotal[1],
          powc_M2: detail.powcTotal[2],
        });
      }

      const bundle = buildFinancingEnginePreview({
        projectInfo,
        cashOutflows,
        financing: financingForEngine,
        financingConfig,
        outflowProfile: {
          ...outflowProfile,
          ...(hasDetailCosts
            ? {
                construction: detail.construction,
                softCosts: detail.softCostsTotal,
                powc: detail.powcTotal,
                monthlyTotal: detail.monthlyTotal,
                cumulative: detail.cumulative,
              }
            : {}),
        },
        constructionCostSchedule,
        constructionPeriod,
        monthlyInflowSchedule: cashInflows.monthlyInflowSchedule ?? [],
        finStream,
        effectiveInterestRatePercent: effectiveInterestRate,
        debtFacilityAmount,
        landEquityValue: financingEngineEquityInputs.landEquityValue,
        cashEquityRequired: financingEngineEquityInputs.cashEquityRequired,
      });
      if (process.env.NODE_ENV === "development" && bundle) {
        const inp = bundle.inputs;
        const lastIdx = inp.constructionPeriodMonths + (inp.jurisdiction === "MALAYSIA" ? 24 : 12);
        // eslint-disable-next-line no-console
        console.log("📦 [Engine Inputs Being Sent]:", {
          landLoanEnabled: inp.landLoanEnabled,
          landLoanAmount: inp.landLoanAmount,
          landLoanRatePct: inp.landLoanRatePct,
          landLoanTenorMonths: inp.landLoanTenorMonths,
          landLoanInterestTreatment: inp.landLoanInterestTreatment,
          constructionLength: inp.monthlyCosts.construction.length,
          powcLength: inp.monthlyCosts.powc.length,
          construction_M0: inp.monthlyCosts.construction[0],
          construction_M1: inp.monthlyCosts.construction[1],
          construction_M2: inp.monthlyCosts.construction[2],
          powc_M0: inp.monthlyCosts.powc[0],
          powc_M1: inp.monthlyCosts.powc[1],
          powc_M2: inp.monthlyCosts.powc[2],
        });

        // eslint-disable-next-line no-console
        console.log("🔗 [Data Match Check]:", {
          constructionMatch:
            inp.monthlyCosts.construction[0] === detail.construction?.[0] &&
            inp.monthlyCosts.construction[1] === detail.construction?.[1],
          powcMatch:
            inp.monthlyCosts.powc[0] === detail.powcTotal?.[0] &&
            inp.monthlyCosts.powc[1] === detail.powcTotal?.[1],
        });

        // eslint-disable-next-line no-console
        console.log("🔍 Financing Engine Inputs Debug:", {
          jurisdiction: inp.jurisdiction,
          constructionPeriod: inp.constructionPeriodMonths,
          certificationIntervalMonths: inp.certificationIntervalMonths,
          expectedLastMonthIndex: lastIdx,
          salesArrayLength: inp.monthlySalesInflows?.length,
          firstSale: inp.monthlySalesInflows?.[0],
          lastSale:
            inp.monthlySalesInflows?.[
              Math.max(0, (inp.monthlySalesInflows?.length ?? 1) - 1)
            ],
        });
      }
      return bundle;
    } catch {
      return null;
    }
  }, [
    projectInfo,
    cashOutflows,
    financing,
    outflowProfile,
    detail,
    constructionCostSchedule,
    constructionPeriod,
    cashInflows.monthlyInflowSchedule,
    finStream,
    effectiveInterestRate,
    debtFacilityAmount,
    financingEngineEquityInputs,
  ]);

  // --- FINANCIAL METRICS CALCULATION (from financing engine monthly rows) ---
  const financialMetrics = useMemo(() => {
    const enginePreview = financingEnginePreview?.rows;
    if (!enginePreview || enginePreview.length === 0) return null;

    const sumRow = (key: keyof MonthlyRow) =>
      enginePreview.reduce(
        (total, month) => total + (Number(month[key]) || 0),
        0
      );

    const totalLandInjection = sumRow("capitalLand");
    const totalCashInjection = sumRow("capitalCash");
    const totalEquityAmount = totalLandInjection + totalCashInjection;

    const prefSharesAmount = sumRow("prefDrawdown");

    const totalLandLoanAmount = sumRow("landLoanDrawdown");
    const totalConstructionLoanAmount = sumRow("constLoanDrawdown");
    const totalLoanInterest = Math.abs(
      sumRow("constLoanInterest") + sumRow("landLoanInterest")
    );

    const equityCashFlows = enginePreview.map((m) => m.irrCashFlow || 0);
    const totalEquityInvested = equityCashFlows
      .filter((v) => v < 0)
      .reduce((a, b) => a + Math.abs(b), 0);
    const totalDistributions = equityCashFlows
      .filter((v) => v > 0)
      .reduce((a, b) => a + b, 0);
    const equityMultiple =
      totalEquityInvested > 0 ? totalDistributions / totalEquityInvested : 0;

    let paybackMonth: number | null = null;
    let cumulativeDist = 0;
    for (let i = 0; i < equityCashFlows.length; i++) {
      if (equityCashFlows[i] > 0) cumulativeDist += equityCashFlows[i];
      if (cumulativeDist >= totalEquityInvested && totalEquityInvested > 0) {
        paybackMonth = i;
        break;
      }
    }

    const equityIRRPercent =
      equityCashFlows.length > 1
        ? annualIrrPercentFromMonthlySeries(equityCashFlows) ?? 0
        : 0;
    const equityIRR = equityIRRPercent / 100;

    return {
      totalEquityAmount,
      totalCashInjection,
      prefSharesAmount,
      totalLandLoanAmount,
      totalConstructionLoanAmount,
      totalLoanInterest,
      equityMultiple,
      equityPaybackMonth: paybackMonth,
      equityIRR,
      minDSCR: null as number | null,
      avgDSCR: null as number | null,
    };
  }, [financingEnginePreview]);

  /** Write KPIs to `sale.projectIRR` / `operational.projectIRR` — sale uses engine rows, not legacy `monthlyData`. */
  const persistProjectMetricsToStore = useCallback(() => {
    const prevPm =
      useFinModelStore.getState()[finStream].projectIRR.projectMetrics;
    const preservePref = prevPm?.preferenceCalculation ?? undefined;
    const unlevered =
      unleveredIRRFromStore != null ? unleveredIRRFromStore : undefined;

    const engineRows = financingEnginePreview?.rows;
    if (finStream === "sale" && engineRows && engineRows.length > 0) {
      const patch = buildProjectIrrUpdateFromEngineRows(engineRows, {
        unleveredIRR: unlevered,
        preferenceCalculation: preservePref,
      });

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("🏗️ Engine calculated:", {
          equity: patch.projectMetrics?.totalEquityInvested,
          multiple: patch.projectMetrics?.equityMultiple,
          irr: patch.projectMetrics?.leveredEquityIRR,
        });
      }

      updateProjectIRR(patch, finStream);

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log(
          "✅ Store updated. New Equity:",
          useFinModelStore.getState()[finStream].projectIRR.projectMetrics
            ?.totalEquityInvested
        );
      }
      return;
    }

    const cumulativeNcfPostFinancingByMonth = monthlyData.map(
      (d) => d.cumulativeNcfPostFinancing
    );
    const equityInjectionByMonth = monthlyData.map((d) => d.equityInjection);
    const monthlyDataForStore = monthlyData.map((d) => ({
      month: d.month,
      equityInjection: d.equityInjection,
      ncfPostFinancing: d.ncfPostFinancing,
      cumulativeNcfPostFinancing: d.cumulativeNcfPostFinancing,
      principalRepayment: d.principalRepayment,
    }));
    const prev = useFinModelStore.getState()[finStream].projectIRR.monthlyData;
    const shouldReplaceMonthlyData =
      monthlyDataForStore.length > 0 &&
      (prev == null || monthlyDataForStore.length >= prev.length);

    updateProjectIRR(
      {
        projectMetrics: {
          leveredEquityIRR: equityIRR * 100,
          equityMultiple,
          equityPaybackMonth,
          peakEquityInjected,
          totalEquityInvested: totalEquityInvestedGross,
          totalDistributions: totalEquityReturned,
          peakFunding: peakEquityInjected,
          ...(unlevered != null ? { unleveredIRR: unlevered } : {}),
          ...(preservePref != null
            ? { preferenceCalculation: preservePref }
            : {}),
        },
        cumulativeNcfPostFinancingByMonth,
        equityInjectionByMonth,
        ...(shouldReplaceMonthlyData
          ? { monthlyData: monthlyDataForStore }
          : {}),
      },
      finStream
    );
  }, [
    finStream,
    financingEnginePreview?.rows,
    updateProjectIRR,
    monthlyData,
    equityIRR,
    equityMultiple,
    equityPaybackMonth,
    peakEquityInjected,
    totalEquityInvestedGross,
    totalEquityReturned,
    unleveredIRRFromStore,
  ]);

  useEffect(() => {
    persistProjectMetricsToStore();
  }, [persistProjectMetricsToStore]);

  const handleNextToEquityReturns = useCallback(() => {
    persistProjectMetricsToStore();
    router.push(withStreamPrefix(streamPrefix, "/equity-returns"));
  }, [persistProjectMetricsToStore, router, streamPrefix]);

  const isResidentialPreview = useMemo(
    () => isResidentialSaleProject(projectInfo),
    [projectInfo]
  );

  const isCommercialPreview = useMemo(
    () => isCommercialFinancingModel(projectInfo, financing, wizardParam),
    [projectInfo, financing, wizardParam]
  );

  const showEscrowSection = isResidentialPreview && !isCommercialPreview;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("🔍 Project Type Check:", {
      buildingType: projectInfo.buildingType,
      buildingSubType: projectInfo.buildingSubType,
      country: projectInfo.country,
      financingModel: financing.financingModel,
      wizardParam,
      isResidentialPreview,
      isCommercialPreview,
      showEscrowSection,
    });
  }, [
    projectInfo.buildingType,
    projectInfo.buildingSubType,
    projectInfo.country,
    financing.financingModel,
    wizardParam,
    isResidentialPreview,
    isCommercialPreview,
    showEscrowSection,
  ]);

  // Extract withdrawal mode to component scope for table routing
  const withdrawalMode =
    financing.escrowConfig?.withdrawalMode ??
    (financing as { escrowWithdrawalMode?: string }).escrowWithdrawalMode ??
    "none";

  const financingEngineGridMeta = useMemo(() => {
    const j = resolveFinancingEngineJurisdiction(projectInfo);

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("🔍 [Preview] Withdrawal mode from store:", {
        withdrawalMode,
        escrowConfig: financing.escrowConfig,
        escrowWithdrawalMode: (financing as { escrowWithdrawalMode?: string })
          .escrowWithdrawalMode,
      });
    }

    const timelineOpts = {
      commercial: isCommercialPreview,
      sale: true as const,
      constructionPeriodMonths: constructionPeriod,
      country: projectInfo.country,
      countryCode: projectInfo.countryCode,
      withdrawalMode,
      businessModel: projectInfo.businessModel ?? "DEV_FOR_SALE",
      projectType:
        projectInfo.projectType ??
        (isCommercialPreview ? "COMMERCIAL" : "RESIDENTIAL"),
    };
    return {
      lastMonth: financingEngineTimelineLastMonth(j, constructionPeriod, timelineOpts),
      monthCount: financingEngineTimelineMonthCount(j, constructionPeriod, timelineOpts),
    };
  }, [
    projectInfo,
    constructionPeriod,
    isCommercialPreview,
    withdrawalMode,
    financing.escrowConfig,
  ]);

  /**
   * Visible columns: every month through stabilization end, then annual checkpoints
   * every 12 months from that point (M50, M62, …) through the hold horizon.
   */
  // Dynamic construction months: M0..M{constructionPeriod}
  const constructionMonths = useMemo(
    () => Array.from({ length: constructionPeriod + 1 }, (_, m) => m),
    [constructionPeriod]
  );

  const irrFinancingColumns = useMemo(
    () => buildFinancingPreviewIrrColumns(constructionPeriod),
    [constructionPeriod]
  );

  /** Maps spreadsheet Y4–Y13 / hotel Y1–Y10 to month bands (FYE label = `endMonth`, same as Project IRR). */
  const operationalYearMonthMap = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const spreadsheetYear = 4 + i;
        const hotelYear = i + 1;
        const { startMonth, endMonth } = getOperationalYearMonthRange(
          i + 1,
          constructionPeriod
        );
        return {
          spreadsheetYear,
          hotelYear,
          startMonth,
          endMonth,
          label: `M${endMonth}`,
        };
      }),
    [constructionPeriod]
  );

  const exportRows = useMemo(() => {
    if (!financingEnginePreview?.rows?.length) {
      return [["No financing cash flow data available. Complete Component 4 inputs first."]];
    }
    return buildFinancingCashFlowExportRows({
      rows: financingEnginePreview.rows,
      jurisdiction: financingEnginePreview.jurisdiction,
      hideEscrowRows: !showEscrowSection,
      projectLabel: `Project: ${projectInfo.city || "—"}, ${projectInfo.country || "—"} • Currency: ${projectInfo.currency || "AED"}`,
    });
  }, [
    financingEnginePreview,
    showEscrowSection,
    projectInfo.city,
    projectInfo.country,
    projectInfo.currency,
  ]);

  const currencyCode = projectInfo.currency || "AED";
  const fileBase = `financing_${projectInfo.city || "project"}_${currencyCode}`;

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (!downloadOpen) return;
      const el = downloadRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setDownloadOpen(false);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [downloadOpen]);

  const handleDownload = () => {
    setDownloadOpen((v) => !v);
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 pb-32">
      <div className="mx-auto max-w-7xl text-white font-sans text-xs">
        {/* Header */}
      <div className="mb-6 pb-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-white mb-1">
          Financing Model Preview — Post-Financing Cash Flows
        </h1>
        <p className="text-slate-400">
          Project: {projectInfo.city}, {projectInfo.country} • Currency: {projectInfo.currency} • Financing
          cash-flow model: M0–M{financingEngineGridMeta.lastMonth} ({financingEngineGridMeta.monthCount} months)
        </p>
      </div>

      <div className="mt-2 mb-8">
        <h3 className="text-lg font-bold text-white mb-4">Monthly Cash Flow Projection</h3>
        {financingEnginePreview && financingEnginePreview.rows.length > 0 ? (
          <>
            {financingEnginePreview.inputs.jurisdiction === "UAE_SA" && (
              <CashFlowTableUaeSa
                data={mapEngineRowsToUae(financingEnginePreview.rows)}
                formatCurrency={formatCurrency}
                hideEscrowRows={!showEscrowSection}
              />
            )}
            {financingEnginePreview.inputs.jurisdiction === "MALAYSIA" && (
              <CashFlowTableMalaysia
                data={mapEngineRowsToMalaysia(financingEnginePreview.rows)}
                formatCurrency={formatCurrency}
                hideEscrowRows={!showEscrowSection}
              />
            )}
            {financingEnginePreview.inputs.jurisdiction === "AUSTRALIA" && (
              <CashFlowTableAustralia
                data={mapEngineRowsToAustralia(financingEnginePreview.rows)}
                formatCurrency={formatCurrency}
                hideEscrowRows={!showEscrowSection}
              />
            )}

            {/* Handle "OTHER" jurisdictions based on C4S5 selection */}
            {financingEnginePreview.inputs.jurisdiction === "OTHER" && (
              <>
                {withdrawalMode === "malaysia" && (
                  <CashFlowTableMalaysia
                    data={mapEngineRowsToMalaysia(financingEnginePreview.rows)}
                    formatCurrency={formatCurrency}
                    hideEscrowRows={false}
                  />
                )}
                {withdrawalMode === "australia" && (
                  <CashFlowTableAustralia
                    data={mapEngineRowsToAustralia(financingEnginePreview.rows)}
                    formatCurrency={formatCurrency}
                    hideEscrowRows={false}
                  />
                )}
                {/* For Non-Escrow (Commercial OR "Other" Residential selecting "none"), use UAE table with escrow rows hidden */}
                {(withdrawalMode === "none" || isCommercialPreview) && (
                  <CashFlowTableUaeSa
                    data={mapEngineRowsToUae(financingEnginePreview.rows)}
                    formatCurrency={formatCurrency}
                    hideEscrowRows={true}
                  />
                )}
                {/* Fallback for UAE/KSA selection in "Other" country */}
                {withdrawalMode === "uae" && (
                  <CashFlowTableUaeSa
                    data={mapEngineRowsToUae(financingEnginePreview.rows)}
                    formatCurrency={formatCurrency}
                    hideEscrowRows={false}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-slate-500 rounded-xl border border-slate-800 bg-slate-900/40">
            {financingEnginePreview === null
              ? "Unable to build financing cash flow preview from current inputs."
              : "Calculating financial model…"}
          </div>
        )}
      </div>

      {financialMetrics && (
        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Key Financing Metrics
          </h3>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            <div>
              <p className="text-xs text-slate-400">Total Equity Amount</p>
              <p className="text-base font-semibold text-emerald-400">
                {formatCurrency(financialMetrics.totalEquityAmount)}
              </p>
              <p className="text-[10px] text-slate-500">Land + Cash Injection</p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Total Cash Injection</p>
              <p className="text-base font-semibold text-white">
                {formatCurrency(financialMetrics.totalCashInjection)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Preference Shares</p>
              <p className="text-base font-semibold text-purple-400">
                {formatCurrency(financialMetrics.prefSharesAmount)}
              </p>
              <p className="text-[10px] text-slate-500">Pref. Drawdown</p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Total Land Loan Amount</p>
              <p className="text-base font-semibold text-blue-400">
                {formatCurrency(financialMetrics.totalLandLoanAmount)}
              </p>
              <p className="text-[10px] text-slate-500">Land Facility Drawdown</p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Total Construction Loan Amount</p>
              <p className="text-base font-semibold text-blue-400">
                {formatCurrency(financialMetrics.totalConstructionLoanAmount)}
              </p>
              <p className="text-[10px] text-slate-500">Construction Facility Drawdown</p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Total Loan Interest</p>
              <p className="text-base font-semibold text-amber-400">
                {formatCurrency(financialMetrics.totalLoanInterest)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Equity Multiple</p>
              <p className="text-base font-semibold text-white">
                {financialMetrics.equityMultiple.toFixed(2)}x
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Equity Payback</p>
              <p className="text-base font-semibold text-white">
                {financialMetrics.equityPaybackMonth !== null
                  ? `M${financialMetrics.equityPaybackMonth}`
                  : "—"}
              </p>
              <p className="text-[10px] text-slate-500">Month of full recovery</p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Equity IRR</p>
              <p className="text-base font-semibold text-emerald-400">
                {(financialMetrics.equityIRR * 100).toFixed(2)}%
              </p>
              <p className="text-[10px] text-slate-500">Annualized</p>
            </div>

            <div className="col-span-2 rounded-lg border border-slate-700/50 bg-slate-900/30 p-3 md:col-span-1">
              <p className="text-xs text-slate-400">DSCR Metrics</p>
              <p className="mt-1 text-xs text-slate-500">
                Skipped: Requires operational CFADS definition. Not applicable
                during construction/sales phase.
              </p>
            </div>
          </div>
        </div>
      )}

      {downloadOpen ? (
        <div
          ref={downloadRef}
          className="fixed bottom-24 left-4 right-4 z-50 rounded-xl border border-slate-700 bg-slate-800/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md md:left-1/2 md:right-auto md:w-[320px] md:-translate-x-1/2"
        >
          <p className="mb-2 text-xs font-medium text-slate-300">
            Download financing preview as…
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                exportToExcel({
                  filename: fileBase,
                  sheetName: "Post-Financing (000)",
                  rows: exportRows,
                });
                setDownloadOpen(false);
              }}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => {
                exportToCSV({
                  filename: fileBase,
                  rows: exportRows,
                });
                setDownloadOpen(false);
              }}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600"
            >
              CSV (.csv)
            </button>
          </div>
        </div>
      ) : null}

      <PreviewFloatingBar
        previousRoute={
          streamPrefix === "/sale"
            ? "/sale/financing?step=8"
            : withStreamPrefix(streamPrefix, "/financing?step=8")
        }
        onNextClick={handleNextToEquityReturns}
        onDownload={handleDownload}
        nextLabel="Next →"
      />
      </div>
    </div>
  );
}

export default function FinancingPreviewPage(
  props: FinancingPreviewPageProps = {}
) {
  return (
    <SearchParamsBoundary>
      <FinancingPreviewPageContent {...props} />
    </SearchParamsBoundary>
  );
}
