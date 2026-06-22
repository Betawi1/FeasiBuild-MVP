import { getOperationalYearMonthRange } from "@/store/useFinModelStore";
import {
  annualIrrPercentFromMonthlySeries,
  equityMultipleFromSeries,
  paybackMonthCrossingFromNegative,
} from "@/lib/equity-irr";

export type OperationalLeveredModelInputs = {
  cashInflows: any;
  cashOutflows: any;
  financing: any;
  projectInfo: any;
};

/**
 * Extended runtime inputs required to reproduce `/operational/preview/financing` exactly.
 * These are derived in the preview page today; passing them through keeps the math identical.
 */
export type OperationalLeveredModelRuntime = {
  finStream: "operational" | "sale";
  isClient: boolean;
  isDataReady: boolean;

  hotelHoldSnapshot: any | null;

  /** Mirrors preview page locals used by the monthly engine. */
  constructionPeriod: number;
  operationsStartMonth: number;
  totalHoldPeriodMonths: number;
  holdPeriodYears: number;

  amortizationPeriod: number;

  monthlyInterestRate: number;
  debtFacilityAmount: number;
  totalLandCost: number;
  totalCosts: number;

  /** Already-resolved schedule inputs */
  monthlyDrawdowns: number[];
  amortizationSchedule: Array<{
    interest?: number;
    principal?: number;
    endBal?: number;
    startBal?: number;
  }>;

  outflowProfile: {
    softCosts: number[];
    powc: number[];
    ffe?: number[];
    monthlyTotal: number[];
    construction?: number[];
  };

  constructionCostSchedule: number[];

  /** Preview-only operational hotel P&L + WC deltas */
  hotelPnl: any | null;
  changeInWorkingCapitalYearly: number[];
  ffeRenovationOps: number;

  /** Derived preview constants */
  bulkShare: number;
  inflowScheduleMap: Map<number, number>;

  idcCapitalizedShare: number;

  /** Exit inputs */
  exitYear: number; // spreadsheet Y4..Y13
  exitStrategy: "sale" | "refinance" | "hold";
  exitProceeds: number;

  /** If monthly engine returns empty, peak equity fallback (preview parity). */
  dynamicPeakEquityRequired: number;
};

/** Component 4 Step 3 — land vs residual cash equity (store or derived from TDC − debt). */
function resolveStep3EquitySplit(
  financingModel: {
    landEquityPercent?: number;
    landEquityValue?: number;
    cashEquityRequired?: number;
    debtFacilityAmount?: number;
  },
  cashOutflows: { landCost?: number; tdc?: number },
  debtFacilityAmount: number,
  totalCosts: number
): {
  landEquity: number;
  cashEquity: number;
  isLand100: boolean;
  totalEquityRequirement: number;
} {
  const landCost = Number(cashOutflows?.landCost) || 0;
  const tdc = Number(cashOutflows?.tdc) || totalCosts;
  const debt =
    Number(financingModel?.debtFacilityAmount) || debtFacilityAmount || 0;
  const totalEquityRequirement = Math.max(0, tdc - debt);
  const isLand100 = Number(financingModel?.landEquityPercent) === 100;
  const landEquity =
    Number(financingModel?.landEquityValue) ||
    (isLand100 ? Math.min(landCost, totalEquityRequirement) : 0);
  const cashEquity =
    Number(financingModel?.cashEquityRequired) ||
    Math.max(0, totalEquityRequirement - landEquity);
  return { landEquity, cashEquity, isLand100, totalEquityRequirement };
}

function normalizeSeniorLoanType(
  raw: string | undefined
): "bullet" | "equal-principal" | "equal-payment" | "custom" {
  if (raw === "declining" || raw === "equal-payment") return "equal-payment";
  if (raw === "equal" || raw === "equal-principal") return "equal-principal";
  if (raw === "bullet") return "bullet";
  if (raw === "custom") return "custom";
  return "equal-payment";
}

export function calculateOperationalLeveredModel(
  inputs: OperationalLeveredModelInputs & OperationalLeveredModelRuntime
): {
  monthlyData: any[];
  projectMetrics: any;
  leveredEquityMonthlyCashFlows: number[];
  equityPostFinancingSeries: number[];
} {
  const {
    cashOutflows,
    financing,
    cashInflows: _cashInflows,
    projectInfo: _projectInfo,
    ...rt
  } = inputs;

  const financingModel = financing;

  const __fin = financing as Record<string, unknown> | null | undefined;
  const __finKeys = __fin && typeof __fin === "object" ? Object.keys(__fin) : [];
  const __landKeys = __finKeys.filter((k) => k.toLowerCase().includes("land"));
  // eslint-disable-next-line no-console
  console.log("🔍 C4 ENGINE START - Input Audit:", {
    hasFinancing: !!financing,
    financingKeys: __finKeys,
    landRelatedKeys: __landKeys,
    landEquityPercent: __fin?.landEquityPercent,
    landAsEquity: __fin?.landAsEquity,
    landCost: (cashOutflows as { landCost?: number } | undefined)?.landCost,
    rawFinancing:
      process.env.NODE_ENV === "development" ? financing : "[omit prod]",
  });

  // ===========================================================================
  // IMPORTANT: The monthly cashflow engine below is copied verbatim from
  // `/app/operational/preview/financing/page.tsx` (monthlyData useMemo).
  // Only `useMemo`/React wiring was removed; formulas are unchanged.
  // ===========================================================================

  const monthlyData = (() => {
    const {
      isClient,
      isDataReady,
      constructionPeriod,
      totalHoldPeriodMonths,
      monthlyInterestRate,
      totalLandCost,
      constructionCostSchedule,
      outflowProfile,
      operationsStartMonth,
      amortizationPeriod,
      finStream,
      debtFacilityAmount,
      totalCosts,
      inflowScheduleMap,
      bulkShare,
      hotelPnl,
      idcCapitalizedShare,
      changeInWorkingCapitalYearly,
      monthlyDrawdowns,
      amortizationSchedule,
      exitYear,
      exitProceeds,
      ffeRenovationOps,
    } = rt;

    const loanAtCompletion = Number(financingModel?.loanAtCompletion ?? 0) || 0;
    const repaymentStructure =
      financingModel.repaymentStructure || "fully-amortizing";
    const interestOnlyPeriodYears = financingModel.interestOnlyPeriodYears || 0;

    if (!isClient || !isDataReady) return [];
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
      /** Land contributed as equity (non-cash at M0 when land-as-equity is on). */
      landEquityInjection: number;
      /** Cash equity injection (gap-fill and residual cash requirement). */
      cashEquityInjection: number;
      equityInjection: number; // Row G (positive) = land + cash
      cumulativeEquityInjected: number; // Row H (positive balance)
      ncfPostFinancing: number; // Row I (+/-)
      cumulativeNcfPostFinancing: number; // Row J: running cumulative NCF (post)
      equityInvestorCF: number; // Same as ncfPostFinancing when equity injection is not modeled
      dscr: number | null;
      loanBalance: number;
    }> = [];

    const scheduleRowCount = financingModel.amortizationSchedule?.length ?? 0;
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
        (financingModel.gracePeriodYears ?? interestOnlyPeriodYears ?? 0) * 12
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

    const seniorLoanType = normalizeSeniorLoanType(financingModel.loanType);
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
    const debtRepaymentPriority = financingModel.debtRepaymentPriority ?? 100;

    // ============================================================================
    // DYNAMIC LOAN REPAYMENT: sales proceeds repay debt first (then scheduled fallback)
    // ============================================================================
    // Track outstanding loan balance month-by-month (driven by draws and repayments).
    // `cumulativeLoanBalance` is the source of truth for lagged IDC interest (interest at M{t} is on balance at end of M{t-1}).
    let loanBalance = 0;

    // Row C: cumulative loan balance (draws - repayments)
    let cumulativeLoanBalance = 0;

    /** Running cumulative NCF (post-financing) after each month (strict hierarchy equity rules). */
    let cumulativeNcfPost = 0;

    for (let m = 0; m <= totalHoldPeriodMonths; m++) {
      const isConstruction = m <= constructionPeriod;
      const isRepaymentPeriod = m >= operationsStartMonth && m <= totalHoldPeriodMonths;
      // CASH INFLOWS
      // - Development / pre-op: Component 2 monthly schedule (sales-style inflows).
      // - HOLD: no development sales before operations (avoids phantom inflow vs hotel hold preview).
      // - Operations: post annual revenue at operating FYE months.
      // - Add net exit proceeds at the selected exit FYE month (or final FYE for hold).
      const exitStrategyEffective = financingModel.exitStrategy ?? "hold";
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

      // Cash IDC / pre-op interest (paid current) is a financing cash outflow (cash interest) that we
      // show on the Interest Payment row. It should NOT be subtracted inside NCF Pre.
      const idcCashOutPreFinancing =
        isConstruction || (m < operationsStartMonth && cumulativeLoanBalance > 0)
          ? (isConstruction && m === 0
              ? 0
              : cumulativeLoanBalance *
                monthlyInterestRate *
                (1 - idcCapitalizedShare))
          : 0;
      void idcCashOutPreFinancing;

      const totalOutflowAll =
        totalOutflowPreFinancing + operationalOutflow + idcCashOutPreFinancing;

      // NCF Pre (Pre-Financing) standard definition:
      // NCF Pre = Total Inflow − Hard Outflow (exclude financing items like interest/principal).
      const fyeNonOperatingPreFinInflows =
        isOpFyeMonth && m >= operationsStartMonth
          ? baseInflow + (m === exitFyeMonth ? exitProceeds : 0)
          : 0;
      void fyeNonOperatingPreFinInflows;

      const totalOutflow = totalOutflowPreFinancing + operationalOutflow;
      const ncfPreFinancing = totalInflow - totalOutflow;

      if (process.env.NODE_ENV === "development" && m === 1) {
        // eslint-disable-next-line no-console
        console.log(`✅ M${m} NCF Pre-Financing:`);
        // eslint-disable-next-line no-console
        console.log("   Total Inflow:", totalInflow / 1000, "('000s)");
        // eslint-disable-next-line no-console
        console.log("   Total Outflow:", totalOutflow / 1000, "('000s)");
        // eslint-disable-next-line no-console
        console.log(
          "   ncfPreFinancing:",
          ncfPreFinancing / 1000,
          "('000s)"
        );
      }

      if (process.env.NODE_ENV === "development" && m === exitFyeMonth) {
        // eslint-disable-next-line no-console
        console.log(`✅ M${m} NCF Pre-Financing (Exit Month):`);
        // eslint-disable-next-line no-console
        console.log(
          "   Operating Revenue:",
          operationalRevenue / 1000,
          "('000s)"
        );
        // eslint-disable-next-line no-console
        console.log("   Total Inflow:", totalInflow / 1000, "('000s)");
        // eslint-disable-next-line no-console
        console.log(
          "   Total Outflow:",
          totalOutflowAll / 1000,
          "('000s)"
        );
        // eslint-disable-next-line no-console
        console.log(
          "   NCF Pre-Financing:",
          ncfPreFinancing / 1000,
          "('000s)"
        );
      }

      // FINANCING CASH FLOWS (Debt service & draws)
      // Row B: Loan Drawdown — fixed input from `monthlyDrawdowns` (never synthesized or capped here).
      const loanDrawdown = isConstruction
        ? Number(monthlyDrawdowns[m] ?? 0) || 0
        : 0;

      // Option C: commitment fee is not modeled in operational preview.
      const commitmentFeePaid = 0;

      let interest = 0;
      let principal = 0;
      let debtServiceForDscr = 0;

      if (isConstruction) {
        // During construction: only cash IDC interest is serviced (principal = 0).
        // Same amount as `idcCashOutPreFinancing` (already in NCF Pre).
        // ✅ Capitalized IDC => no CASH interest payment during construction.
        interest = idcCapitalizedShare > 0 ? 0 : idcCashOutPreFinancing;
        principal = 0;
        debtServiceForDscr = interest; // DSCR basis during construction isn't used
      } else if (m < operationsStartMonth && loanBalance > 0) {
        // Pre-op buffer (after construction, before operations): interest-only cash service
        // No principal amortization before operations.
        // ✅ From loan completion onward (pre-ops), interest is paid in cash regardless of IDC treatment.
        // Use the completed loan balance as the base.
        const base = Number(financingModel.loanAtCompletion ?? 0) || loanBalance;
        interest = base * monthlyInterestRate;
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
        opYearIndex0 >= 0 &&
        opYearIndex0 < scheduleRowCount
      ) {
        const scheduleEntry = amortizationSchedule[opYearIndex0];
        interest = Math.max(0, Number(scheduleEntry?.interest) || 0);
        principal = Math.max(0, Number(scheduleEntry?.principal) || 0);
        debtServiceForDscr = (interest + principal) / 12;

        if (process.env.NODE_ENV === "development" && m === exitFyeMonth) {
          // eslint-disable-next-line no-console
          console.log("✅ Exit-year schedule applied:", {
            m,
            opYearIndex0,
            scheduleRowCount,
            interest: interest / 1000,
            principal: principal / 1000,
          });
        }
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
            (financingModel.amortizationSchedule?.length ?? 0) > 0
          ) {
            const sched = financingModel.amortizationSchedule!;
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

      const prevCumulativeEquityInjected =
        m === 0 ? 0 : (data[m - 1]?.cumulativeEquityInjected ?? 0);

      // Debt service (signed): interest + principal (+ fees). Same rows as the financing table.
      const debtService =
        interestPayment + principalRepayment + commitmentFeePayment;

      if (m === 0) {
        // eslint-disable-next-line no-console
        console.log("🔍 M0 EXECUTION:", {
          ncfPre: ncfPreFinancing,
          loanDrawdown,
          debtService,
          landCostAtM0: landCostOutflow,
          cashOutflowsLandCost: totalLandCost,
          allFinancingProps: financingModel,
        });
      }

      const monthlyNetBeforeEquity =
        ncfPreFinancing + loanDrawdown + debtService;

      const GAP_FILL_EPS = 1e-6;
      const prevCumulativeNcfPost = cumulativeNcfPost;

      const rawLandPct = financingModel.landEquityPercent;
      /** Single source of truth: only `landEquityPercent`; ignore legacy `landAsEquity` in branching. */
      const isLand100PctEquityToggleOn =
        Number(rawLandPct) === 100;

      let landEquityInjection = 0;
      let cashEquityInjection = 0;
      const step3Equity = resolveStep3EquitySplit(
        financingModel,
        cashOutflows,
        debtFacilityAmount,
        totalCosts
      );

      // Land equity at M0 only (Component 4 Step 3 — non-cash contribution).
      if (m === 0 && isLand100PctEquityToggleOn) {
        landEquityInjection =
          step3Equity.landEquity > 0
            ? step3Equity.landEquity
            : landCostOutflow;
      }

      // Waterfall: cumulative NCF (post-fin) before equity + this month's pre-equity flows.
      const preEquityCumulative =
        prevCumulativeNcfPost +
        ncfPreFinancing +
        loanDrawdown +
        debtService;
      const afterLandEquity = preEquityCumulative + landEquityInjection;

      // Cash equity gap-fill — inject only enough to restore cumulative balance to 0.
      if (afterLandEquity < -GAP_FILL_EPS) {
        cashEquityInjection = Math.abs(afterLandEquity);
      }

      if (process.env.NODE_ENV === "development" && (m < 6 || cashEquityInjection > GAP_FILL_EPS)) {
        // eslint-disable-next-line no-console
        console.log(`💧 Equity gap-fill M${m}:`, {
          preEquityCumulative,
          landEquityInjection,
          afterLandEquity,
          cashEquityInjection,
        });
      }
      landEquityInjection = Math.max(0, landEquityInjection);
      cashEquityInjection = Math.max(0, cashEquityInjection);
      const equityInjection = landEquityInjection + cashEquityInjection;

      const ncfPostFinancing =
        monthlyNetBeforeEquity + landEquityInjection + cashEquityInjection;

      // End-of-month cumulative balance after gap-fill (≥ 0 when cash equity applied).
      cumulativeNcfPost = afterLandEquity + cashEquityInjection;

      const cumulativeEquityInjected =
        prevCumulativeEquityInjected + equityInjection;

      const cumulativeNcfPostFinancing = cumulativeNcfPost;

      if (process.env.NODE_ENV === "development" && m === 0) {
        const landCostAmt = landCostOutflow;
        const expectedNcfPostLandRule =
          ncfPreFinancing +
          loanDrawdown +
          debtService +
          equityInjection;
        // eslint-disable-next-line no-console
        console.log("🔍 M0 Strict Check:", {
          toggle: isLand100PctEquityToggleOn,
          loanDrawdown,
          equityInjection,
          ncfPre: ncfPreFinancing,
          debtService,
          ncfPost: ncfPostFinancing,
          expectedNcfPost: expectedNcfPostLandRule,
          match:
            Math.abs(ncfPostFinancing - expectedNcfPostLandRule) < 1,
        });
      }

      if (
        process.env.NODE_ENV === "development" &&
        (m < 10 || equityInjection > GAP_FILL_EPS)
      ) {
        // eslint-disable-next-line no-console
        console.log(`Month ${m}:`, {
          monthlyNetBeforeEquity,
          prevCumulative: prevCumulativeNcfPost,
          interimCumBeforePlug:
            prevCumulativeNcfPost + monthlyNetBeforeEquity,
          equityInjection,
          ncfPost: ncfPostFinancing,
          newCumulative: cumulativeNcfPost,
        });
      }

      // Row C: Cumulative Loan
      // Guard SSR: server renders zeros, client renders real values (prevents hydration mismatch)
      if (!isClient) {
        cumulativeLoanBalance = 0;
      } else if (m <= constructionPeriod) {
        // ✅ Construction (M0..M{constructionPeriod}): Sum of fixed schedule drawdowns + IDC at end of construction
        let drawSum = 0;
        for (let i = 0; i <= m; i++) {
          drawSum += Number(monthlyDrawdowns[i] ?? 0) || 0;
        }
        cumulativeLoanBalance = drawSum;

        const isEndOfConstruction = m === constructionPeriod;
        if (isEndOfConstruction && idcCapitalizedShare > 0) {
          // Use loanAtCompletion directly (most reliable; includes capitalized IDC by definition)
          const loanAtCompletion0 = Number((financingModel as any)?.loanAtCompletion ?? 0);
          if (loanAtCompletion0 > 0) {
            cumulativeLoanBalance = loanAtCompletion0;
          } else {
            const idcAmount = Number((financingModel as any)?.idcAmount ?? 0);
            if (idcAmount > 0) cumulativeLoanBalance += idcAmount;
          }

          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.log(
              `✅ M${m}: Setting Cumulative Loan to loanAtCompletion:`,
              cumulativeLoanBalance / 1000,
              "('000s)"
            );
            // eslint-disable-next-line no-console
            console.log(
              "   Drawdowns sum:",
              monthlyDrawdowns.reduce((s, v) => s + (Number(v) || 0), 0) /
                1000,
              "('000s)"
            );
          }
        }
      } else if (m < operationsStartMonth) {
        // ✅ Pre-Ops (M{constructionPeriod+1}..M{operationsStartMonth-1}): stay at loanAtCompletion
        cumulativeLoanBalance = Number((financingModel as any)?.loanAtCompletion ?? 0) || 0;

        if (process.env.NODE_ENV === "development" && m === constructionPeriod + 1) {
          // eslint-disable-next-line no-console
          console.log(
            `✅ M${m} (Pre-Ops): Cumulative Loan = loanAtCompletion:`,
            cumulativeLoanBalance / 1000,
            "('000s)"
          );
        }
      } else {
        // ✅ Operations (M{ops}+): Read YEAR-END balance from amortization schedule.
        // Operational columns are FYE (annual), not monthly.
        const opYearIndex = Math.floor((m - operationsStartMonth) / 12);
        const scheduleEntry = amortizationSchedule?.[opYearIndex];

        if (scheduleEntry && scheduleEntry.endBal != null) {
          cumulativeLoanBalance = Number(scheduleEntry.endBal) || 0;
        } else {
          // Fallback: loanAtCompletion minus cumulative principal (full years)
          const loanAtCompletion0 = Number(financingModel.loanAtCompletion ?? 0) || 0;
          let principalRepaid = 0;
          for (
            let y = 0;
            y <= opYearIndex && y < (amortizationSchedule?.length ?? 0);
            y++
          ) {
            principalRepaid += Number(amortizationSchedule?.[y]?.principal ?? 0) || 0;
          }
          cumulativeLoanBalance = Math.max(0, loanAtCompletion0 - principalRepaid);
        }
      }

      // Keep engine balance aligned with displayed cumulative loan.
      loanBalance = Math.max(0, Number(cumulativeLoanBalance) || 0);

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
        landEquityInjection,
        cashEquityInjection,
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
  })();

  // ---- Metrics (copied from preview page downstream computations; formulas unchanged) ----
  const exitOy = Math.min(10, Math.max(1, inputs.exitYear - 3));
  const exitFyeMonth = getOperationalYearMonthRange(
    exitOy,
    inputs.constructionPeriod
  ).endMonth;
  const terminalMonth =
    inputs.exitStrategy === "hold" ? inputs.totalHoldPeriodMonths : exitFyeMonth;

  const leveredEquityMonthlyCashFlows = (() => {
    if (!monthlyData.length || terminalMonth < 0) return [];

    const rowByMonth = (m: number) =>
      monthlyData[m]?.month === m
        ? monthlyData[m]
        : monthlyData.find((d) => d.month === m);

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

    return flows;
  })();

  /** Sum(positive CF) ÷ |sum(negative CF)| on the same IRR / payback equity series — matches financing preview "Multiple from CF signs". */
  const equityMultipleFromCF =
    equityMultipleFromSeries(leveredEquityMonthlyCashFlows) ?? 0;

  const equityIRRAnnualPct =
    annualIrrPercentFromMonthlySeries(leveredEquityMonthlyCashFlows) ?? 0;
  const equityIRR = equityIRRAnnualPct / 100;

  const equityPostFinancingSeries = monthlyData.map((d) => d.ncfPostFinancing);
  const equityMultiple = equityMultipleFromSeries(equityPostFinancingSeries) ?? 0;

  const equityPaybackMonth = (() => {
    const idx = paybackMonthCrossingFromNegative(leveredEquityMonthlyCashFlows);
    if (idx == null) return -1;
    return idx;
  })();

  const totalEquityInvestedGross = monthlyData.reduce(
    (s, d) => s + (d.equityInjection ?? 0),
    0
  );

  const totalEquityReturned = monthlyData.reduce(
    (s, d) => s + Math.max(0, d.ncfPostFinancing ?? 0),
    0
  );

  const peakEquityInjected =
    monthlyData.length > 0
      ? Math.max(
          0,
          ...monthlyData.map((d) => d.cumulativeEquityInjected ?? 0)
        )
      : inputs.dynamicPeakEquityRequired;

  const projectMetrics = {
    leveredEquityIRR: equityIRR * 100,
    equityMultiple,
    equityMultipleFromCF,
    equityPaybackMonth,
    peakEquityInjected,
    totalEquityInvested: totalEquityInvestedGross,
    totalDistributions: totalEquityReturned,
    peakFunding: peakEquityInjected,
  };

  return { monthlyData, projectMetrics, leveredEquityMonthlyCashFlows, equityPostFinancingSeries };
}
