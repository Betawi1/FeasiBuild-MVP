import { calculateOperationalLeveredModel } from "@/app/operational/engine/c4.levered.engine";
import { buildOperationalLeveredEngineArgs } from "@/app/operational/engine/buildOperationalScenarioEngines";
import { buildOperationalFinancingEquityWaterfall } from "@/lib/operational-financing-equity-waterfall";
import {
  aggregateMonthlyToYearly,
  type AnnualCashFlowPoint,
} from "@/lib/feasibility/utils";
import useFinModelStore, {
  getOperationalYearMonthRange,
} from "@/store/useFinModelStore";
import type {
  FeasibilityProjectBundle,
  PostFinancingCashFlowData,
} from "@/types/feasibility";

function toThousands(n: number): number {
  return Math.round(n / 1000);
}

function aggregateSeries(monthly: number[]): AnnualCashFlowPoint[] {
  if (monthly.length === 0) return [];
  return aggregateMonthlyToYearly(monthly.map(toThousands));
}

function operationalFyeCashOut(
  opYearIndex0: number,
  hotelPnl: {
    totalExpenses?: number[];
  } | null,
  changeInWorkingCapitalYearly: number[],
  ffeRenovationOps: number
): number {
  const opex = hotelPnl?.totalExpenses?.[opYearIndex0] ?? 0;
  const wc = Math.abs(changeInWorkingCapitalYearly[opYearIndex0] ?? 0);
  const ffe = opYearIndex0 === 5 ? ffeRenovationOps : 0;
  return opex + wc + ffe;
}

function buildHybridPreFinancingSeries(
  engineArgs: ReturnType<typeof buildOperationalLeveredEngineArgs>,
  horizon: number
): {
  totalInflow: number[];
  totalOutflow: number[];
  ncfPreFinancing: number[];
} {
  const {
    constructionPeriod,
    operationsStartMonth,
    outflowProfile,
    hotelPnl,
    changeInWorkingCapitalYearly,
    ffeRenovationOps,
    exitYear,
    exitProceeds,
  } = engineArgs;

  const totalInflow: number[] = [];
  const totalOutflow: number[] = [];

  for (let m = 0; m < horizon; m++) {
    let inflow = 0;
    let outflow = 0;

    if (m <= constructionPeriod) {
      outflow = Number(outflowProfile.monthlyTotal?.[m] ?? 0);
    } else if (m >= operationsStartMonth) {
      const opYi = Math.floor((m - operationsStartMonth) / 12);
      if (opYi >= 0 && opYi < 10) {
        const endM = getOperationalYearMonthRange(
          opYi + 1,
          constructionPeriod
        ).endMonth;
        if (m === endM) {
          const rev = hotelPnl?.totalHotelRevenue?.[opYi] ?? 0;
          const spreadsheetYear = opYi + 4;
          const proc = spreadsheetYear === exitYear ? exitProceeds : 0;
          inflow = rev + proc;
          outflow = operationalFyeCashOut(
            opYi,
            hotelPnl,
            changeInWorkingCapitalYearly,
            ffeRenovationOps
          );
        }
      }
    }

    totalInflow.push(inflow);
    totalOutflow.push(outflow);
  }

  const ncfPreFinancing = totalInflow.map((inf, i) => inf - totalOutflow[i]);
  return { totalInflow, totalOutflow, ncfPreFinancing };
}

function rowAtMonth<T extends { month: number }>(
  monthlyData: T[],
  m: number
): T | undefined {
  const byIndex = monthlyData[m];
  if (byIndex && byIndex.month === m) return byIndex;
  return monthlyData.find((d) => d.month === m);
}

export function buildPostFinancingCashFlowData(
  bundle: FeasibilityProjectBundle
): PostFinancingCashFlowData {
  const state = useFinModelStore.getState();
  const slice = state.operational;
  const engineArgs = buildOperationalLeveredEngineArgs(
    {
      cashInflows: state.cashInflows,
      cashOutflows: slice.cashOutflows,
      financing: slice.financing,
      projectInfo: slice.projectInfo,
      hotelHoldSnapshot: slice.hotelHoldSnapshot,
    },
    {
      isClient: typeof window !== "undefined",
      isDataReady: true,
    }
  );

  const c4 = calculateOperationalLeveredModel(engineArgs);
  const monthlyData = c4.monthlyData ?? [];
  const horizon =
    monthlyData.length > 0
      ? monthlyData[monthlyData.length - 1]!.month + 1
      : engineArgs.totalHoldPeriodMonths + 1;

  const preFin = buildHybridPreFinancingSeries(engineArgs, horizon);
  const financing = slice.financing;
  const operationsStartMonth = engineArgs.operationsStartMonth;

  const interestPayment = (m: number) =>
    rowAtMonth(monthlyData, m)?.interestPayment ?? 0;
  const principalRepayment = (m: number) =>
    m < operationsStartMonth
      ? 0
      : rowAtMonth(monthlyData, m)?.principalRepayment ?? 0;
  const loanDrawdown = (m: number) =>
    rowAtMonth(monthlyData, m)?.loanDrawdown ?? 0;

  const pref = financing.preferenceShares;
  const prefEnabled = Boolean(
    pref?.hasPreferenceShares && (pref.amount ?? 0) > 0
  );
  const isLandEquity = (financing.landEquityPercent ?? 40) >= 100;
  const landAtM0 = isLandEquity
    ? financing.landEquityValue ?? slice.cashOutflows.landCost ?? 0
    : 0;

  const waterfall = buildOperationalFinancingEquityWaterfall({
    lastMonth: horizon - 1,
    isLandEquity,
    landEquityAtM0: landAtM0,
    ncfPreFinancing: (m) => preFin.ncfPreFinancing[m] ?? 0,
    loanDrawdown,
    interestPayment,
    principalRepayment,
    preference: {
      enabled: prefEnabled,
      amount: pref?.amount ?? 0,
      returnPercent: pref?.returnPercent ?? 0,
      cumulativeLoanBalanceAtMonth: (m) =>
        rowAtMonth(monthlyData, m)?.cumulativeLoanBalance ?? 0,
    },
  });

  const waterfallByMonth = new Map(
    waterfall.map((row) => [row.month, row] as const)
  );

  const monthlyLoanDrawdown = Array.from({ length: horizon }, (_, m) =>
    loanDrawdown(m)
  );
  const monthlyInterestPayment = Array.from({ length: horizon }, (_, m) =>
    interestPayment(m)
  );
  const monthlyPrincipalRepayment = Array.from({ length: horizon }, (_, m) =>
    principalRepayment(m)
  );
  const monthlyPrefDrawdown = Array.from(
    { length: horizon },
    (_, m) => waterfallByMonth.get(m)?.prefDrawdown ?? 0
  );
  const monthlyPrefDividend = Array.from(
    { length: horizon },
    (_, m) => waterfallByMonth.get(m)?.prefDividend ?? 0
  );
  const monthlyPrefRepayment = Array.from(
    { length: horizon },
    (_, m) => waterfallByMonth.get(m)?.prefRepayment ?? 0
  );
  const monthlyEquityInjection = Array.from({ length: horizon }, (_, m) => {
    const w = waterfallByMonth.get(m);
    return (
      (w?.landEquityInjection ?? 0) + (w?.cashEquityInjection ?? 0)
    );
  });
  const monthlyNcfPostFinancing = Array.from({ length: horizon }, (_, m) => {
    const w = waterfallByMonth.get(m);
    if (w) return w.monthlyNcfPostFinancing;
    const pre = preFin.ncfPreFinancing[m] ?? 0;
    return (
      pre +
      loanDrawdown(m) +
      interestPayment(m) +
      principalRepayment(m) +
      (waterfallByMonth.get(m)?.prefDrawdown ?? 0) +
      (waterfallByMonth.get(m)?.prefDividend ?? 0) +
      (waterfallByMonth.get(m)?.prefRepayment ?? 0) +
      monthlyEquityInjection[m]
    );
  });

  return {
    currency: bundle.currency,
    totalInflow: aggregateSeries(preFin.totalInflow),
    totalOutflow: aggregateSeries(preFin.totalOutflow),
    ncfPreFinancing: aggregateSeries(preFin.ncfPreFinancing),
    loanDrawdown: aggregateSeries(monthlyLoanDrawdown),
    interestPayment: aggregateSeries(monthlyInterestPayment),
    principalRepayment: aggregateSeries(monthlyPrincipalRepayment),
    prefDrawdown: aggregateSeries(monthlyPrefDrawdown),
    prefDividend: aggregateSeries(monthlyPrefDividend),
    prefRepayment: aggregateSeries(monthlyPrefRepayment),
    equityInjection: aggregateSeries(monthlyEquityInjection),
    ncfPostFinancing: aggregateSeries(monthlyNcfPostFinancing),
  };
}

export function buildPostFinancingCashFlowFromBundle(
  bundle: FeasibilityProjectBundle
): PostFinancingCashFlowData {
  return buildPostFinancingCashFlowData(bundle);
}

export function isPostFinancingCashFlowData(
  data: unknown
): data is PostFinancingCashFlowData {
  if (!data || typeof data !== "object") return false;
  const record = data as PostFinancingCashFlowData;
  return (
    typeof record.currency === "string" &&
    Array.isArray(record.totalInflow) &&
    Array.isArray(record.ncfPostFinancing)
  );
}
