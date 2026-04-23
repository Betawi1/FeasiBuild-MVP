"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useFinModelStore, {
  buildCashOutflowProfile,
  calculateOperationsStartMonth,
  calculateTotalTimelineMonths,
  getMonthPhaseInfo,
  getOperationalYearMonthRange,
  OPERATIONAL_PERIOD_YEARS,
  PRE_OPERATION_BUFFER_MONTHS,
} from "@/store/useFinModelStore";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import { exportToCSV } from "@/lib/downloads/exportToCSV";
import { exportToExcel } from "@/lib/downloads/exportToExcel";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import { computeOperationalHotelHoldPnl } from "@/lib/operational-pnl";
import {
  calculateCapitalMetrics,
  calculateIRRYearly,
  calculateNPVYearly,
} from "@/lib/operational-irr-calculator";

const YEAR_COUNT = 13;
/** Terminal inflow in Y13 (0-based index 12); NOI/EBITDA taken from the same exit year for terminal value. */
const TERMINAL_VALUE_COL_INDEX = 12;
const STABILIZED_NOI_COL_INDEX = 12;

function padToYearCount(values: number[], count: number = YEAR_COUNT): number[] {
  const out = values.slice();
  while (out.length < count) out.push(0);
  return out.slice(0, count);
}

/** Solve annual IRR (decimal, e.g. 0.1158) from a monthly cash-flow series using NPV=0 with exponent t/12. */
function solveAnnualIrrFromMonthlyCashFlows(cashFlows: number[]): {
  irrAnnual: number | null;
  npvAtIrr: number;
  iterations: number;
} {
  if (cashFlows.length < 2) return { irrAnnual: null, npvAtIrr: 0, iterations: 0 };
  const hasNeg = cashFlows.some((c) => c < 0);
  const hasPos = cashFlows.some((c) => c > 0);
  if (!hasNeg || !hasPos) return { irrAnnual: null, npvAtIrr: 0, iterations: 0 };

  const npv = (rate: number): number => {
    if (rate <= -0.999999) return Number.POSITIVE_INFINITY;
    let s = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      s += cashFlows[t]! / Math.pow(1 + rate, t / 12);
    }
    return s;
  };

  const dNpv = (rate: number): number => {
    if (rate <= -0.999999) return Number.NaN;
    let s = 0;
    for (let t = 1; t < cashFlows.length; t++) {
      const cf = cashFlows[t]!;
      if (cf === 0) continue;
      const exp = t / 12;
      s -= exp * cf / Math.pow(1 + rate, exp + 1);
    }
    return s;
  };

  const scale = Math.max(1, cashFlows.reduce((a, b) => a + Math.abs(b), 0));
  const absTol = Math.max(1e-10 * scale, 1000); // require NPV within ~1k currency units

  const tryNewton = (initial: number): { r: number | null; iters: number } => {
    let r = initial;
    for (let i = 0; i < 120; i++) {
      const v = npv(r);
      if (!Number.isFinite(v)) return { r: null, iters: i };
      if (Math.abs(v) < absTol) return { r, iters: i + 1 };
      const dv = dNpv(r);
      if (!Number.isFinite(dv) || Math.abs(dv) < 1e-18) return { r: null, iters: i };
      const next = r - v / dv;
      if (!Number.isFinite(next) || next <= -0.999999 || Math.abs(next) > 50) return { r: null, iters: i };
      if (Math.abs(next - r) < 1e-14) {
        const v2 = npv(next);
        return Math.abs(v2) < absTol ? { r: next, iters: i + 1 } : { r: null, iters: i + 1 };
      }
      r = next;
    }
    return { r: Math.abs(npv(r)) < absTol ? r : null, iters: 120 };
  };

  for (const guess of [0.05, 0.08, 0.1, 0.12, 0.15, 0.2, 0.03, 0.01]) {
    const out = tryNewton(guess);
    if (out.r != null) return { irrAnnual: out.r, npvAtIrr: npv(out.r), iterations: out.iters };
  }

  // Bisection fallback: find bracket.
  let lo = -0.9;
  let hi = 0.8;
  let vLo = npv(lo);
  let vHi = npv(hi);
  let expand = 0;
  while (vLo * vHi > 0 && hi < 50 && expand < 200) {
    hi = hi * 1.15 + 0.02;
    vHi = npv(hi);
    expand++;
  }
  if (!Number.isFinite(vLo) || !Number.isFinite(vHi) || vLo * vHi > 0) {
    return { irrAnnual: null, npvAtIrr: npv(0.1), iterations: 0 };
  }
  let mid = 0;
  let iters = 0;
  for (let i = 0; i < 200; i++) {
    mid = (lo + hi) / 2;
    const vm = npv(mid);
    iters = i + 1;
    if (Math.abs(vm) < absTol) break;
    if (vLo * vm <= 0) {
      hi = mid;
      vHi = vm;
    } else {
      lo = mid;
      vLo = vm;
    }
    if (hi - lo < 1e-14) break;
  }
  return { irrAnnual: mid, npvAtIrr: npv(mid), iterations: iters };
}

/** Shift operational series into Y4–Y13 (prepend 3 slots; keep first 10 P&L years). */
function shiftBy3(data: number[]): number[] {
  return [0, 0, 0, ...data.slice(0, 10)];
}

/**
 * Bucket Component 1 monthly totals into spreadsheet Y1–Y3 (IRR engine); Y4–Y13 unused (0).
 * Y1 = M0–M12, Y2 = M13–M24, Y3 = M25–M{constructionPeriod} (remainder after M24).
 * Returns negative amounts (cash outflows) for the NPV table.
 */
function totalDevelopmentCostsYearlyFromMonthlyTotal(
  monthlyTotal: number[],
  constructionPeriod: number
): number[] {
  const last = Math.max(0, constructionPeriod);
  const len = last + 1;
  const padded = Array.from({ length: len }, (_, m) => monthlyTotal[m] ?? 0);
  const sumSeg = (start: number, end: number) =>
    start > end || start >= len
      ? 0
      : padded
          .slice(start, Math.min(end + 1, len))
          .reduce((a, b) => a + b, 0);
  const y1 = -sumSeg(0, Math.min(12, last));
  const y2 = last >= 13 ? -sumSeg(13, Math.min(24, last)) : 0;
  const y3 = last >= 25 ? -sumSeg(25, last) : 0;
  return [
    y1,
    y2,
    y3,
    ...Array.from({ length: YEAR_COUNT - 3 }, () => 0),
  ];
}

type NpvTimelineColumn = {
  key: string;
  phase: "development" | "preOperating" | "operations";
  month: number;
  label: string;
  /** Spreadsheet year index Y1=0 … Y13=12 when phase is operations; else null. */
  spreadsheetYearIndex: number | null;
};

export default function OperationalPreviewProjectIRRPage() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const snapshot = useFinModelStore((s) => s[finStream].hotelHoldSnapshot);
  const cashInflows = useFinModelStore((s) => s.cashInflows);
  const exitCapRateStored = useFinModelStore((s) => s.projectIRR.exitCapRate);
  const updateProjectIRR = useFinModelStore((s) => s.updateProjectIRR);
  const ffeInvestment = cashOutflows.ffe || 0;
  const constructionPeriod = Math.max(0, cashOutflows.constructionPeriod || 0);

  const outflowProfile = useMemo(
    () => buildCashOutflowProfile(cashOutflows),
    [cashOutflows]
  );

  const npvColumns = useMemo((): NpvTimelineColumn[] => {
    const n = constructionPeriod;
    const devMonthCount = n + 1;
    const cols: NpvTimelineColumn[] = [];
    for (let m = 0; m < devMonthCount; m++) {
      cols.push({
        key: `dev-M${m}`,
        phase: "development",
        month: m,
        label: `M${m}`,
        spreadsheetYearIndex: null,
      });
    }
    for (let i = 0; i < PRE_OPERATION_BUFFER_MONTHS; i++) {
      const m = devMonthCount + i;
      cols.push({
        key: `preop-M${m}`,
        phase: "preOperating",
        month: m,
        label: `M${m}`,
        spreadsheetYearIndex: null,
      });
    }
    for (let oy = 1; oy <= OPERATIONAL_PERIOD_YEARS; oy++) {
      const { endMonth } = getOperationalYearMonthRange(oy, n);
      cols.push({
        key: `opY${oy}-M${endMonth}`,
        phase: "operations",
        month: endMonth,
        label: `M${endMonth}`,
        spreadsheetYearIndex: 2 + oy,
      });
    }
    return cols;
  }, [constructionPeriod]);

  const devMonthCount = constructionPeriod + 1;
  const tableDataColumnCount = npvColumns.length;
  const TABLE_COL_SPAN = tableDataColumnCount + 2;

  const pnl = useMemo(() => {
    if (!snapshot) return null;
    return computeOperationalHotelHoldPnl(
      snapshot,
      cashOutflows.constructionCost || 0,
      cashOutflows.ffe || 0
    );
  }, [snapshot, cashOutflows.constructionCost, cashOutflows.ffe]);

  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement | null>(null);

  // FORCED CORRECT: Unlevered Metrics from direct store totals.
  // This bypasses any monthly-series scope/aggregation issues.
  const unleveredMetrics = useMemo(() => {
    const capitalInvested =
      cashOutflows.tdc ||
      (cashOutflows.landCost || 0) +
        (cashOutflows.constructionCost || 0) +
        (cashOutflows.softCosts || 0) +
        (cashOutflows.powc || 0);

    const totalReturns = cashInflows.netProceeds || 0;
    const equityMultiple =
      capitalInvested > 0 ? totalReturns / capitalInvested : 0;
    const netSurplus = totalReturns - capitalInvested;

    return { capitalInvested, totalReturns, equityMultiple, netSurplus };
  }, [
    cashOutflows.tdc,
    cashOutflows.landCost,
    cashOutflows.constructionCost,
    cashOutflows.softCosts,
    cashOutflows.powc,
    cashInflows.netProceeds,
  ]);

  const npvTableYearly = useMemo(() => {
    const nYears = OPERATIONAL_ROOM_REVENUE_YEARS;
    const outflowProfile = buildCashOutflowProfile(cashOutflows);
    const cp = Math.max(0, cashOutflows.constructionPeriod || 0);
    const totalDevelopmentCostsYearly = totalDevelopmentCostsYearlyFromMonthlyTotal(
      outflowProfile.monthlyTotal,
      cp
    );
    const monthlyTotal = outflowProfile.monthlyTotal;

    let netIncomeYearly: number[];
    let depreciationYearly: number[];
    let changeInWorkingCapitalYearly: number[];

    if (pnl && snapshot) {
      const arM = Number(snapshot.depFieldValues?.accountsReceivableMonths) || 0;
      const apM = Number(snapshot.depFieldValues?.accountsPayableMonths) || 0;
      const nwcLevels = Array.from({ length: nYears }, (_, i) => {
        const rev = pnl.totalHotelRevenue[i] ?? 0;
        const opex = pnl.totalExpenses[i] ?? 0;
        return (arM / 12) * rev - (apM / 12) * opex;
      });
      const changeInWC = nwcLevels.map(
        (w, i) => w - (i > 0 ? nwcLevels[i - 1]! : 0)
      );
      netIncomeYearly = padToYearCount(pnl.netIncome.slice(0, nYears));
      depreciationYearly = padToYearCount(pnl.depreciationTotal.slice(0, nYears));
      changeInWorkingCapitalYearly = padToYearCount(changeInWC);
    } else {
      const z = padToYearCount([]);
      netIncomeYearly = z;
      depreciationYearly = z;
      changeInWorkingCapitalYearly = z;
    }

    const netIncomeShifted = shiftBy3(netIncomeYearly);
    const depreciationShifted = shiftBy3(depreciationYearly);
    const changeInWCShifted = shiftBy3(changeInWorkingCapitalYearly);

    const ffeRenovationShifted = Array.from({ length: YEAR_COUNT }, () => 0);
    ffeRenovationShifted[8] = -ffeInvestment * 0.5;

    const exitCapRate =
      exitCapRateStored != null && exitCapRateStored > 0
        ? exitCapRateStored
        : 7;
    const stabilizedNOI =
      (netIncomeShifted[STABILIZED_NOI_COL_INDEX] ?? 0) +
      (depreciationShifted[STABILIZED_NOI_COL_INDEX] ?? 0);
    const terminalValueRaw =
      exitCapRate > 0 ? stabilizedNOI / (exitCapRate / 100) : 0;
    const terminalValue = Math.round(terminalValueRaw);
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("=== Project IRR Terminal Value Debug ===");
      // eslint-disable-next-line no-console
      console.log(`  Exit cap rate: ${exitCapRate.toFixed(2)}%`);
      // eslint-disable-next-line no-console
      console.log(
        `  NOI basis (EBITDA proxy) index ${STABILIZED_NOI_COL_INDEX} (Year ${
          STABILIZED_NOI_COL_INDEX + 1
        }): ${(stabilizedNOI / 1000).toFixed(2)}K`
      );
      // eslint-disable-next-line no-console
      console.log(`  Terminal value: ${(terminalValue / 1000).toFixed(2)}K`);
    }
    const terminalValueYearly = Array.from({ length: YEAR_COUNT }, () => 0);
    terminalValueYearly[TERMINAL_VALUE_COL_INDEX] = terminalValue;

    const netCashFlowsYearly = netIncomeShifted.map((ni, i) => {
      const operating = ni + depreciationShifted[i]! - changeInWCShifted[i]!;
      return (
        operating +
        ffeRenovationShifted[i]! +
        totalDevelopmentCostsYearly[i]! +
        terminalValueYearly[i]!
      );
    });

    const { irr: yearlyIrrSolved, iterations: yearlyIrrIterations } =
      calculateIRRYearly(netCashFlowsYearly);
    const discountRateForTable = Number.isFinite(yearlyIrrSolved)
      ? yearlyIrrSolved
      : 0;

    const discountFactorsYearly = Array.from({ length: YEAR_COUNT }, (_, y) =>
      1 / Math.pow(1 + discountRateForTable, y + 1)
    );

    const discountedCashFlowsYearly = netCashFlowsYearly.map(
      (cf, y) => cf * discountFactorsYearly[y]!
    );

    let run = 0;
    const cumulativeNPVsYearly = discountedCashFlowsYearly.map((dcf) => {
      run += dcf;
      return run;
    });

    return {
      netIncomeShifted,
      depreciationShifted,
      changeInWCShifted,
      ffeRenovationShifted,
      totalDevelopmentCostsYearly,
      monthlyTotal,
      terminalValueYearly,
      netCashFlowsYearly,
      yearlyIrrAnnual: yearlyIrrSolved,
      yearlyIrrIterations,
      discountFactorsYearly,
      discountedCashFlowsYearly,
      cumulativeNPVsYearly,
    };
  }, [pnl, snapshot, ffeInvestment, cashOutflows, exitCapRateStored]);

  const {
    netIncomeShifted,
    depreciationShifted,
    changeInWCShifted,
    ffeRenovationShifted,
    totalDevelopmentCostsYearly,
    monthlyTotal,
    terminalValueYearly,
    netCashFlowsYearly,
    yearlyIrrAnnual,
    yearlyIrrIterations,
    discountFactorsYearly,
    discountedCashFlowsYearly,
    cumulativeNPVsYearly,
  } = npvTableYearly;

  const yearlyIrrVerification = useMemo(() => {
    const npvAt10 = calculateNPVYearly(netCashFlowsYearly, 0.1);
    const { totalOutflows, totalInflows, equityMultiple } =
      calculateCapitalMetrics(netCashFlowsYearly);
    return {
      irrAnnual: yearlyIrrAnnual,
      iterations: yearlyIrrIterations,
      npvAt10,
      totalOutflows,
      totalInflows,
      equityMultiple,
    };
  }, [
    netCashFlowsYearly,
    yearlyIrrAnnual,
    yearlyIrrIterations,
  ]);

  /** Monthly NCF + cumulative for charts (aligned with Net Cash Flow table row). */
  const monthlyCharts = useMemo(() => {
    const cp = constructionPeriod;
    const totalM = calculateTotalTimelineMonths(cp);
    const mt = monthlyTotal;
    const nc = netCashFlowsYearly;
    const points: {
      month: number;
      amount: number;
      phase: "construction" | "preOperation" | "operations";
    }[] = [];

    for (let m = 0; m < totalM; m++) {
      const info = getMonthPhaseInfo(m, cp);
      if (info.phase === "construction") {
        points.push({
          month: m,
          amount: -(mt[m] ?? 0),
          phase: "construction",
        });
      } else if (info.phase === "preOperation") {
        points.push({ month: m, amount: 0, phase: "preOperation" });
      } else {
        const oy = info.operationalYear;
        let amt = 0;
        if (oy != null && oy >= 1 && oy <= OPERATIONAL_PERIOD_YEARS) {
          const { endMonth } = getOperationalYearMonthRange(oy, cp);
          if (m === endMonth) {
            const syIdx = 2 + oy;
            amt = nc[syIdx] ?? 0;
          }
        }
        points.push({ month: m, amount: amt, phase: "operations" });
      }
    }

    let cum = 0;
    const cumulative = points.map((p) => {
      cum += p.amount;
      return { month: p.month, cumulative: cum };
    });

    let paybackMonth: number | null = null;
    for (const row of cumulative) {
      if (row.cumulative >= 0) {
        paybackMonth = row.month;
        break;
      }
    }

    const maxAbsNcf = Math.max(
      1e3,
      ...points.map((p) => Math.abs(p.amount))
    );
    const maxAbsCum = Math.max(
      1e3,
      ...cumulative.map((c) => Math.abs(c.cumulative))
    );

    return {
      points,
      cumulative,
      paybackMonth,
      totalMonths: totalM,
      maxAbsNcf,
      maxAbsCum,
    };
  }, [monthlyTotal, netCashFlowsYearly, constructionPeriod]);

  const monthlyIrrVerification = useMemo(() => {
    const totalMonths = calculateTotalTimelineMonths(constructionPeriod);
    const pointsByMonth = new Map<number, number>();
    for (const p of monthlyCharts.points) pointsByMonth.set(p.month, p.amount);
    const series: number[] = Array.from(
      { length: totalMonths },
      (_, m) => pointsByMonth.get(m) ?? 0
    );
    return solveAnnualIrrFromMonthlyCashFlows(series);
  }, [constructionPeriod, monthlyCharts.points]);

  const sumDisplayedYears = (arr: number[]) =>
    arr.slice(3).reduce((a, b) => a + b, 0);

  const sumDevelopmentCostYears = (arr: number[]) =>
    arr.slice(0, 3).reduce((a, b) => a + b, 0);

  const operatingActivitiesTotal = sumDisplayedYears(netIncomeShifted) +
    sumDisplayedYears(depreciationShifted) -
    sumDisplayedYears(changeInWCShifted);

  const netCashFlowYearlySum = sumDisplayedYears(netCashFlowsYearly);
  const discountedCashFlowYearlySum = discountedCashFlowsYearly.reduce(
    (a, b) => a + b,
    0
  );
  const cumulativeNPVYearlyEnd = cumulativeNPVsYearly[YEAR_COUNT - 1] ?? 0;

  /** Month-level discount factors / DCF / cumulative NPV for *all* timeline months (M0..). */
  const monthlyDiscounting = useMemo(() => {
    const totalMonths = calculateTotalTimelineMonths(constructionPeriod);
    const pointsByMonth = new Map<number, number>();
    for (const p of monthlyCharts.points) {
      pointsByMonth.set(p.month, p.amount);
    }

    const annual =
      monthlyIrrVerification.irrAnnual != null && Number.isFinite(monthlyIrrVerification.irrAnnual)
        ? monthlyIrrVerification.irrAnnual
        : 0;
    const monthlyRate =
      annual > -0.999999 ? Math.pow(1 + annual, 1 / 12) - 1 : 0;

    const discountFactorAtMonth = (m: number) =>
      1 / Math.pow(1 + monthlyRate, m);

    const discountedByMonth: number[] = new Array(totalMonths).fill(0);
    const cumulativeByMonth: number[] = new Array(totalMonths).fill(0);
    let run = 0;
    for (let m = 0; m < totalMonths; m++) {
      const cf = pointsByMonth.get(m) ?? 0;
      const dcf = cf * discountFactorAtMonth(m);
      discountedByMonth[m] = dcf;
      run += dcf;
      cumulativeByMonth[m] = run;
    }

    return {
      annual,
      monthlyRate,
      discountFactorAtMonth,
      discountedByMonth,
      cumulativeByMonth,
    };
  }, [constructionPeriod, monthlyCharts.points, monthlyIrrVerification.irrAnnual]);

  // Persist operational preview IRR to shared store so Component 6 can read the same base-case metric.
  useEffect(() => {
    const irrAnnual = monthlyIrrVerification.irrAnnual;
    if (irrAnnual == null || !Number.isFinite(irrAnnual)) return;
    const irrPct = irrAnnual * 100;
    updateProjectIRR({ unleveredIRR: irrPct });
  }, [monthlyIrrVerification.irrAnnual, updateProjectIRR]);

  const exportRows = useMemo(() => {
    const header = ["Line Item", ...npvColumns.map((c) => c.label), "TOTAL"];
    const roundK = (v: number) => Math.round(v / 1000);
    const cellK = (v: number) => {
      const k = roundK(v);
      return k === 0 ? null : k;
    };
    const sumK = (arr: number[]) => {
      const k = roundK(arr.reduce((a, b) => a + b, 0));
      return k === 0 ? null : k;
    };

    const operatingCashRow = netIncomeShifted.map(
      (ni, i) => ni + depreciationShifted[i]! - changeInWCShifted[i]!
    );

    const mapYearlyToTimeline = (values: number[]) =>
      npvColumns.map((col) =>
        col.phase === "operations" && col.spreadsheetYearIndex !== null
          ? cellK(values[col.spreadsheetYearIndex] ?? 0)
          : null
      );

    const tv = terminalValueYearly[TERMINAL_VALUE_COL_INDEX] ?? 0;
    const tvK = roundK(tv);
    const terminalValueExportRow: (string | number | null)[] = [
      "Terminal Value",
      ...npvColumns.map((col) =>
        col.phase === "operations" &&
        col.spreadsheetYearIndex === TERMINAL_VALUE_COL_INDEX
          ? tvK === 0
            ? null
            : tvK
          : null
      ),
      tvK === 0 ? null : tvK,
    ];

    const devCostsTotalK = roundK(
      totalDevelopmentCostsYearly[0]! +
        totalDevelopmentCostsYearly[1]! +
        totalDevelopmentCostsYearly[2]!
    );
    const totalDevCostsRow: (string | number | null)[] = [
      "Total Development Costs",
      ...npvColumns.map((col) => {
        if (col.phase !== "development") return null;
        const raw = monthlyTotal[col.month] ?? 0;
        return cellK(-raw);
      }),
      devCostsTotalK === 0 ? null : devCostsTotalK,
    ];

    const ffeY9k = roundK(-ffeInvestment * 0.5);
    const ffeRenovRow: (string | number | null)[] = [
      "FFE Renovation",
      ...npvColumns.map((col) =>
        col.phase === "operations" && col.spreadsheetYearIndex === 8
          ? ffeY9k === 0
            ? null
            : ffeY9k
          : null
      ),
      ffeY9k === 0 ? null : ffeY9k,
    ];

    const spanNull = Array(tableDataColumnCount + 1).fill(null);

    const summaryRows: (string | number | null)[][] = [
      [],
      ["Metric", "Value"],
      [
        "Unlevered IRR yearly (annual %)",
        Number.isFinite(yearlyIrrVerification.irrAnnual)
          ? Number((yearlyIrrVerification.irrAnnual * 100).toFixed(4))
          : null,
      ],
      [
        "Yearly discount rate = IRR (annual %)",
        Number.isFinite(yearlyIrrVerification.irrAnnual)
          ? Number((yearlyIrrVerification.irrAnnual * 100).toFixed(4))
          : null,
      ],
      ["Iterations to converge (yearly IRR)", yearlyIrrVerification.iterations],
      [
        "Capital invested — sum negative yearly CF ('000)",
        roundK(yearlyIrrVerification.totalOutflows),
      ],
      [
        "Total returns — sum positive yearly CF ('000)",
        roundK(yearlyIrrVerification.totalInflows),
      ],
      [
        "Unlevered equity multiple (yearly CF)",
        yearlyIrrVerification.equityMultiple > 0
          ? Number(yearlyIrrVerification.equityMultiple.toFixed(4))
          : null,
      ],
      [
        "Σ discounted CF NPV @ 10% yearly ('000)",
        roundK(yearlyIrrVerification.npvAt10),
      ],
      [
        "Cumulative NPV end Y13 (yearly table @ yearly IRR discount) ('000)",
        roundK(cumulativeNPVYearlyEnd),
      ],
    ];

    const netCashFlowExport = npvColumns.map((col) => {
      if (col.phase === "development") {
        const raw = monthlyTotal[col.month] ?? 0;
        return cellK(-raw);
      }
      if (col.phase === "preOperating") return null;
      if (col.phase === "operations" && col.spreadsheetYearIndex !== null) {
        return cellK(netCashFlowsYearly[col.spreadsheetYearIndex] ?? 0);
      }
      return null;
    });

    return [
      header,
      ["Cash Flows from Operating Activities", ...spanNull],
      ["Net Income", ...mapYearlyToTimeline(netIncomeShifted), sumK(netIncomeShifted)],
      [
        "+ Depreciation",
        ...mapYearlyToTimeline(depreciationShifted),
        sumK(depreciationShifted),
      ],
      [
        "- Change in Working Capital",
        ...mapYearlyToTimeline(changeInWCShifted),
        sumK(changeInWCShifted),
      ],
      [
        "= Net Cash Flow from Operating Activities",
        ...mapYearlyToTimeline(operatingCashRow),
        null,
      ],
      terminalValueExportRow,
      [],
      ["Cash Flows from Development Activities", ...spanNull],
      totalDevCostsRow,
      ffeRenovRow,
      [],
      [
        "Net Cash Flow",
        ...netCashFlowExport,
        roundK(netCashFlowYearlySum) === 0 ? null : roundK(netCashFlowYearlySum),
      ],
      [
        "Discount Factor",
        ...npvColumns.map((col) =>
          col.phase === "operations" && col.spreadsheetYearIndex !== null
            ? Number(
                discountFactorsYearly[col.spreadsheetYearIndex]!.toFixed(4)
              )
            : null
        ),
        null,
      ],
      [
        "Discounted Cash Flow",
        ...npvColumns.map((col) =>
          col.phase === "operations" && col.spreadsheetYearIndex !== null
            ? cellK(
                discountedCashFlowsYearly[col.spreadsheetYearIndex] ?? 0
              )
            : null
        ),
        roundK(discountedCashFlowYearlySum) === 0
          ? null
          : roundK(discountedCashFlowYearlySum),
      ],
      [
        "Cumulative NPV",
        ...npvColumns.map((col) =>
          col.phase === "operations" && col.spreadsheetYearIndex !== null
            ? cellK(cumulativeNPVsYearly[col.spreadsheetYearIndex] ?? 0)
            : null
        ),
        roundK(cumulativeNPVYearlyEnd) === 0
          ? null
          : roundK(cumulativeNPVYearlyEnd),
      ],
      ...summaryRows,
    ];
  }, [
    npvColumns,
    tableDataColumnCount,
    terminalValueYearly,
    totalDevelopmentCostsYearly,
    monthlyTotal,
    netIncomeShifted,
    depreciationShifted,
    changeInWCShifted,
    netCashFlowsYearly,
    discountFactorsYearly,
    discountedCashFlowsYearly,
    cumulativeNPVsYearly,
    netCashFlowYearlySum,
    discountedCashFlowYearlySum,
    cumulativeNPVYearlyEnd,
    ffeInvestment,
    yearlyIrrVerification,
  ]);

  const currency = projectInfo.currency || "AED";

  const formatNumber = (value: number) => {
    if (value === 0 || value === -0) return "-";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
      Math.round(value / 1000)
    );
  };
  const fmt = formatNumber;
  /** Y1–Y3 development columns: show em dash when value is zero (shifted operational rows). */
  const fmtOpsCol = (val: number, colIdx: number) =>
    colIdx < 3 && val === 0 ? "—" : fmt(val);

  /** Terminal value only in Y13 (index 12); TOTAL mirrors Y13. */
  const fmtTerminalCol = (val: number, colIdx: number) =>
    colIdx !== TERMINAL_VALUE_COL_INDEX || val === 0 ? "—" : fmt(val);

  const colTimelineBorder = (idx: number) => {
    const col = npvColumns[idx]!;
    const prev = idx > 0 ? npvColumns[idx - 1]! : null;
    if (col.phase === "preOperating" && prev?.phase !== "preOperating")
      return "border-l-2 border-amber-400/60";
    if (col.phase === "operations" && prev?.phase !== "operations")
      return "border-l-2 border-emerald-500/50";
    return "";
  };

  const thTimeline =
    "border-b border-slate-700 py-2 px-2 text-right text-[11px] font-semibold text-slate-300 min-w-[52px] whitespace-nowrap";
  const tdTimeline =
    "py-3 px-2 text-right font-mono text-slate-300 min-w-[52px] text-xs";

  const formatThousandsOneDecimal = (value: number) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 1000);

  const fileBase = `project-irr_${projectInfo.city || "project"}_${currency}`;

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
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-white">
            Project IRR Preview — Cash Flow &amp; NPV (monthly timeline)
          </h1>
          <p className="text-sm text-slate-400">
            Timeline: development M0–M{constructionPeriod} (
            {devMonthCount} months), then a {PRE_OPERATION_BUFFER_MONTHS}-month
            pre-operating buffer (training, commissioning, staff hiring) through
            M{calculateOperationsStartMonth(constructionPeriod) - 1}, then
            operations from M{calculateOperationsStartMonth(constructionPeriod)} (
            {OPERATIONAL_PERIOD_YEARS} years). Full horizon M0–M
            {calculateTotalTimelineMonths(constructionPeriod) - 1} in {currency}{" "}
            &apos;000. The IRR engine still solves on the same 13 yearly buckets
            (Y1–Y13), but discount factors / discounted CF / cumulative NPV are
            now shown for every month column (including development M0–M
            {constructionPeriod}). Orange and green column rules separate
            development, pre-operating, and operations.
          </p>
        </div>

        {/* IRR Calculation Verification — compact */}
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">
            IRR Calculation Verification
          </h3>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-400">Project IRR</p>
              <p className="font-mono text-emerald-400">
                {monthlyIrrVerification.irrAnnual != null
                  ? `${(monthlyIrrVerification.irrAnnual * 100).toFixed(2)}%`
                  : "N/A"}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                NPV@IRR ≈ {(monthlyIrrVerification.npvAtIrr / 1000).toFixed(1)}k
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Equity Multiple</p>
              <p className="font-mono text-emerald-400">
                {yearlyIrrVerification.equityMultiple > 0
                  ? `${yearlyIrrVerification.equityMultiple.toFixed(2)}x`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Payback</p>
              <p className="font-mono text-emerald-400">
                {monthlyCharts.paybackMonth != null
                  ? `M${monthlyCharts.paybackMonth}`
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Net Cash Flow + Cumulative — monthly timeline charts */}
        <div className="mb-6 space-y-6">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h3 className="mb-1 text-lg font-semibold text-white">
              Net Cash Flow (Monthly Timeline)
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              M0–M{monthlyCharts.totalMonths - 1}; phase bands: development,
              pre-operating, operations (year-end NCF on operating columns).
            </p>
            <div className="rounded-lg bg-slate-900/50 p-4">
              <svg viewBox="0 0 720 220" className="h-auto w-full">
                {(() => {
                  const svgW = 720;
                  const left = 66;
                  const right = 16;
                  const top = 18;
                  const bottom = 190;
                  const innerW = svgW - left - right;
                  const innerH = bottom - top;
                  const xMax = Math.max(1, monthlyCharts.totalMonths - 1);
                  const xAt = (m: number) => left + (m / xMax) * innerW;
                  const cp = constructionPeriod;
                  const devEnd = cp;
                  const opsStart = calculateOperationsStartMonth(cp);
                  const preOpEnd = opsStart - 1;
                  const maxK = monthlyCharts.maxAbsNcf / 1000;
                  const yAt = (vK: number) => {
                    const clamped = Math.max(-maxK, Math.min(maxK, vK));
                    const t = (maxK - clamped) / (2 * maxK);
                    return top + t * innerH;
                  };
                  const zeroY = yAt(0);
                  const band = (x1: number, x2: number, fill: string) => (
                    <rect
                      key={`${x1}-${x2}-${fill}`}
                      x={xAt(x1)}
                      y={top}
                      width={Math.max(0, xAt(x2) - xAt(x1))}
                      height={innerH}
                      fill={fill}
                    />
                  );
                  const tickMonths = (() => {
                    const step = xMax <= 72 ? 6 : 12;
                    const ticks: number[] = [];
                    for (let m = 0; m <= xMax; m += step) ticks.push(m);
                    if (ticks[ticks.length - 1] !== xMax) ticks.push(xMax);
                    return ticks;
                  })();
                  const slotW = innerW / Math.max(1, monthlyCharts.points.length);
                  const barW = Math.max(1, slotW * 0.85);
                  return (
                    <>
                      {band(0, devEnd + 1, "rgba(148,163,184,0.14)")}
                      {preOpEnd >= devEnd + 1
                        ? band(devEnd + 1, preOpEnd + 1, "rgba(245,158,11,0.18)")
                        : null}
                      {band(opsStart, xMax + 1, "rgba(16,185,129,0.10)")}
                      <line
                        x1={left}
                        y1={top}
                        x2={left}
                        y2={bottom}
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                      <line
                        x1={left}
                        y1={bottom}
                        x2={left + innerW}
                        y2={bottom}
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                      <line
                        x1={left}
                        y1={zeroY}
                        x2={left + innerW}
                        y2={zeroY}
                        stroke="#64748b"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      {[-maxK, -maxK / 2, 0, maxK / 2, maxK].map((v, i) => (
                        <text
                          key={`yncf-${i}`}
                          x={left - 10}
                          y={yAt(v) + 4}
                          textAnchor="end"
                          fontSize="11"
                          fill={v === 0 ? "#94a3b8" : "#cbd5e1"}
                        >
                          {Math.round(v).toLocaleString("en-US")}
                        </text>
                      ))}
                      {monthlyCharts.points.map((p, i) => {
                        const vK = p.amount / 1000;
                        const x = left + i * slotW + (slotW - barW) / 2;
                        const y = yAt(vK);
                        const h = Math.max(1, Math.abs(zeroY - y));
                        const isPos = vK >= 0;
                        return (
                          <rect
                            key={`ncf-${p.month}`}
                            x={x}
                            y={isPos ? y : zeroY}
                            width={barW}
                            height={h}
                            fill={isPos ? "#10b981" : "#f87171"}
                            opacity={0.85}
                            rx={1}
                          />
                        );
                      })}
                      {tickMonths.map((m) => (
                        <g key={`xncf-${m}`}>
                          <line
                            x1={xAt(m)}
                            y1={bottom}
                            x2={xAt(m)}
                            y2={bottom + 6}
                            stroke="#64748b"
                            strokeWidth="1"
                          />
                          <text
                            x={xAt(m)}
                            y={bottom + 20}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#cbd5e1"
                          >
                            {`M${m}`}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
              <p className="mt-2 text-center text-xs text-slate-500">
                Values in {currency} &apos;000
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h3 className="mb-1 text-lg font-semibold text-white">
              Cumulative Cash Flow &amp; Payback (Monthly Timeline)
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              Cumulative sum of the monthly series above; payback is the first
              month with cumulative ≥ 0.
            </p>
            <div className="rounded-lg bg-slate-900/50 p-4">
              <svg viewBox="0 0 720 220" className="h-auto w-full">
                {(() => {
                  const svgW = 720;
                  const left = 66;
                  const right = 16;
                  const top = 18;
                  const bottom = 190;
                  const innerW = svgW - left - right;
                  const innerH = bottom - top;
                  const xMax = Math.max(1, monthlyCharts.totalMonths - 1);
                  const xAt = (m: number) => left + (m / xMax) * innerW;
                  const cp = constructionPeriod;
                  const devEnd = cp;
                  const opsStart = calculateOperationsStartMonth(cp);
                  const preOpEnd = opsStart - 1;
                  const maxK = monthlyCharts.maxAbsCum / 1000;
                  const yAt = (vK: number) => {
                    const clamped = Math.max(-maxK, Math.min(maxK, vK));
                    const t = (maxK - clamped) / (2 * maxK);
                    return top + t * innerH;
                  };
                  const zeroY = yAt(0);
                  const band = (x1: number, x2: number, fill: string) => (
                    <rect
                      key={`c-${x1}-${x2}`}
                      x={xAt(x1)}
                      y={top}
                      width={Math.max(0, xAt(x2) - xAt(x1))}
                      height={innerH}
                      fill={fill}
                    />
                  );
                  const pts = monthlyCharts.cumulative.map((row) => ({
                    x: xAt(row.month),
                    y: yAt(row.cumulative / 1000),
                  }));
                  const pathD =
                    pts.length < 2
                      ? ""
                      : pts.reduce((d, p, i) => {
                          return i === 0
                            ? `M ${p.x} ${p.y}`
                            : `${d} L ${p.x} ${p.y}`;
                        }, "");
                  const tickMonths = (() => {
                    const step = xMax <= 72 ? 6 : 12;
                    const ticks: number[] = [];
                    for (let m = 0; m <= xMax; m += step) ticks.push(m);
                    if (ticks[ticks.length - 1] !== xMax) ticks.push(xMax);
                    return ticks;
                  })();
                  const paybackM = monthlyCharts.paybackMonth;
                  const paybackX =
                    paybackM != null ? xAt(paybackM) : null;
                  return (
                    <>
                      {band(0, devEnd + 1, "rgba(148,163,184,0.14)")}
                      {preOpEnd >= devEnd + 1
                        ? band(devEnd + 1, preOpEnd + 1, "rgba(245,158,11,0.18)")
                        : null}
                      {band(opsStart, xMax + 1, "rgba(16,185,129,0.10)")}
                      <line
                        x1={left}
                        y1={top}
                        x2={left}
                        y2={bottom}
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                      <line
                        x1={left}
                        y1={bottom}
                        x2={left + innerW}
                        y2={bottom}
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                      <line
                        x1={left}
                        y1={zeroY}
                        x2={left + innerW}
                        y2={zeroY}
                        stroke="#64748b"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      {[-maxK, -maxK / 2, 0, maxK / 2, maxK].map((v, i) => (
                        <text
                          key={`ycum-${i}`}
                          x={left - 10}
                          y={yAt(v) + 4}
                          textAnchor="end"
                          fontSize="11"
                          fill={v === 0 ? "#94a3b8" : "#cbd5e1"}
                        >
                          {Math.round(v).toLocaleString("en-US")}
                        </text>
                      ))}
                      {pathD ? (
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                        />
                      ) : null}
                      {paybackX != null ? (
                        <>
                          <line
                            x1={paybackX}
                            y1={top}
                            x2={paybackX}
                            y2={bottom}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                          <text
                            x={Math.min(paybackX + 8, left + innerW - 120)}
                            y={Math.max(top + 14, zeroY - 8)}
                            fill="#34d399"
                            fontSize="12"
                            fontWeight="700"
                          >
                            {`Payback: M${paybackM}`}
                          </text>
                        </>
                      ) : null}
                      {tickMonths.map((m) => (
                        <g key={`xcum-${m}`}>
                          <line
                            x1={xAt(m)}
                            y1={bottom}
                            x2={xAt(m)}
                            y2={bottom + 6}
                            stroke="#64748b"
                            strokeWidth="1"
                          />
                          <text
                            x={xAt(m)}
                            y={bottom + 20}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#cbd5e1"
                          >
                            {`M${m}`}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
              <p className="mt-2 text-center text-xs text-slate-500">
                Values in {currency} &apos;000
              </p>
            </div>
          </div>
        </div>

        {/* Cash Flow + NPV Table — monthly development / pre-op / ops year-end */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6 overflow-x-auto">
          <h2 className="text-lg font-semibold text-white mb-4">
            NPV Table (Discount Factor Method)
          </h2>

          <div className="mb-4 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
            Pre-Operating buffer:{" "}
            <span className="font-mono">
              M{constructionPeriod + 1}–M
              {calculateOperationsStartMonth(constructionPeriod) - 1}
            </span>{" "}
            ({PRE_OPERATION_BUFFER_MONTHS} months) for training, commissioning,
            and staff hiring.
          </div>

          <table
            className="w-full text-sm"
            style={{ minWidth: `${200 + tableDataColumnCount * 54}px` }}
          >
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[180px] border-b border-slate-700 bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-300">
                  Line Item
                </th>
                {npvColumns.map((col, idx) => (
                  <th
                    key={col.key}
                    className={`${thTimeline} border-b border-slate-700 bg-slate-800 ${colTimelineBorder(idx)}`}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="border-b border-slate-700 bg-slate-800 px-3 py-3 text-right text-sm font-semibold text-slate-300 min-w-[88px]">
                  TOTAL
                </th>
              </tr>
              <tr>
                <th className="sticky left-0 z-10 min-w-[180px] border-b border-slate-700 bg-slate-800 px-4 py-2" />
                <th
                  colSpan={devMonthCount}
                  className="border-b border-slate-700 bg-slate-800 py-2 px-2 text-center text-xs font-semibold text-slate-400 shadow-[inset_-1px_0_0_0_rgb(71_85_105)]"
                >
                  Development
                </th>
                <th
                  colSpan={PRE_OPERATION_BUFFER_MONTHS}
                  className="border-b border-slate-700 bg-slate-800 py-2 px-2 text-center text-xs font-semibold text-amber-400/90 shadow-[inset_-1px_0_0_0_rgb(71_85_105)]"
                >
                  Pre-Operating
                </th>
                <th
                  colSpan={OPERATIONAL_PERIOD_YEARS}
                  className="border-b border-slate-700 bg-slate-800 py-2 px-2 text-center text-xs font-semibold text-emerald-400/90"
                >
                  Operations (year-end month)
                </th>
                <th className="border-b border-slate-700 bg-slate-800 px-3 py-2 min-w-[88px]" />
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-700/50">
              <tr className="bg-slate-800/80">
                <td
                  colSpan={TABLE_COL_SPAN}
                  className="py-2 px-4 font-semibold text-emerald-400 sticky left-0 bg-slate-800/80 z-10"
                >
                  Cash Flows from Operating Activities
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 text-slate-300 sticky left-0 bg-slate-800/50 z-10">
                  Net Income
                </td>
                {npvColumns.map((col, idx) => (
                  <td
                    key={col.key}
                    className={`${tdTimeline} ${colTimelineBorder(idx)}`}
                  >
                    {col.phase === "operations" &&
                    col.spreadsheetYearIndex !== null
                      ? fmtOpsCol(
                          netIncomeShifted[col.spreadsheetYearIndex] ?? 0,
                          col.spreadsheetYearIndex
                        )
                      : "—"}
                  </td>
                ))}
                <td className="py-3 px-3 text-right font-mono font-semibold text-slate-300">
                  {fmt(sumDisplayedYears(netIncomeShifted))}
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 text-slate-300 sticky left-0 bg-slate-800/50 z-10">
                  + Depreciation
                </td>
                {npvColumns.map((col, idx) => (
                  <td
                    key={col.key}
                    className={`${tdTimeline} ${colTimelineBorder(idx)}`}
                  >
                    {col.phase === "operations" &&
                    col.spreadsheetYearIndex !== null
                      ? fmtOpsCol(
                          depreciationShifted[col.spreadsheetYearIndex] ?? 0,
                          col.spreadsheetYearIndex
                        )
                      : "—"}
                  </td>
                ))}
                <td className="py-3 px-3 text-right font-mono font-semibold text-slate-300">
                  {fmt(sumDisplayedYears(depreciationShifted))}
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 text-slate-300 sticky left-0 bg-slate-800/50 z-10">
                  - Change in Working Capital
                </td>
                {npvColumns.map((col, idx) => (
                  <td
                    key={col.key}
                    className={`${tdTimeline} ${colTimelineBorder(idx)}`}
                  >
                    {col.phase === "operations" &&
                    col.spreadsheetYearIndex !== null
                      ? fmtOpsCol(
                          changeInWCShifted[col.spreadsheetYearIndex] ?? 0,
                          col.spreadsheetYearIndex
                        )
                      : "—"}
                  </td>
                ))}
                <td className="py-3 px-3 text-right font-mono font-semibold text-slate-300">
                  {fmt(sumDisplayedYears(changeInWCShifted))}
                </td>
              </tr>

              <tr className="bg-slate-800/40 font-semibold">
                <td className="py-3 px-4 text-slate-300 sticky left-0 bg-slate-800/40 z-10">
                  = Net Cash Flow from Operating Activities
                </td>
                {npvColumns.map((col, idx) => {
                  const i = col.spreadsheetYearIndex;
                  const sub =
                    i !== null
                      ? (netIncomeShifted[i] ?? 0) +
                        (depreciationShifted[i] ?? 0) -
                        (changeInWCShifted[i] ?? 0)
                      : 0;
                  return (
                    <td
                      key={col.key}
                      className={`${tdTimeline} font-semibold text-emerald-400 ${colTimelineBorder(idx)}`}
                    >
                      {col.phase === "operations" && i !== null
                        ? fmtOpsCol(sub, i)
                        : "—"}
                    </td>
                  );
                })}
                <td className="py-3 px-3 text-right font-mono text-emerald-400">
                  {fmt(operatingActivitiesTotal)}
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 text-slate-300 pl-6 sticky left-0 bg-slate-800/50 z-10">
                  Terminal Value
                </td>
                {npvColumns.map((col, idx) => {
                  const i = col.spreadsheetYearIndex;
                  const val =
                    i !== null ? terminalValueYearly[i] ?? 0 : 0;
                  return (
                    <td
                      key={col.key}
                      className={`${tdTimeline} ${
                        i === TERMINAL_VALUE_COL_INDEX && val !== 0
                          ? "text-emerald-400"
                          : "text-slate-500"
                      } ${colTimelineBorder(idx)}`}
                    >
                      {i !== null
                        ? fmtTerminalCol(val, i)
                        : "—"}
                    </td>
                  );
                })}
                <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-400">
                  {fmtTerminalCol(
                    terminalValueYearly[TERMINAL_VALUE_COL_INDEX] ?? 0,
                    TERMINAL_VALUE_COL_INDEX
                  )}
                </td>
              </tr>

              <tr>
                <td colSpan={TABLE_COL_SPAN} className="py-1"></td>
              </tr>

              <tr className="bg-slate-800/80">
                <td
                  colSpan={TABLE_COL_SPAN}
                  className="py-2 px-4 font-semibold text-rose-400 sticky left-0 bg-slate-800/80 z-10"
                >
                  Cash Flows from Development Activities
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 text-slate-300 pl-6 sticky left-0 bg-slate-800/50 z-10">
                  Total Development Costs
                </td>
                {npvColumns.map((col, idx) => {
                  if (col.phase !== "development") {
                    return (
                      <td
                        key={col.key}
                        className={`${tdTimeline} text-slate-500 ${colTimelineBorder(idx)}`}
                      >
                        —
                      </td>
                    );
                  }
                  const raw = monthlyTotal[col.month] ?? 0;
                  const neg = -raw;
                  return (
                    <td
                      key={col.key}
                      className={`${tdTimeline} ${colTimelineBorder(idx)} ${
                        neg < 0 ? "text-rose-400" : "text-slate-300"
                      }`}
                    >
                      {fmt(neg)}
                    </td>
                  );
                })}
                <td className="py-3 px-3 text-right font-mono font-semibold text-rose-400">
                  {fmt(sumDevelopmentCostYears(totalDevelopmentCostsYearly))}
                </td>
              </tr>

              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 text-slate-300 pl-6 sticky left-0 bg-slate-800/50 z-10">
                  FFE Renovation
                </td>
                {npvColumns.map((col, idx) => (
                  <td
                    key={col.key}
                    className={`${tdTimeline} ${colTimelineBorder(idx)} ${
                      col.phase === "operations" &&
                      col.spreadsheetYearIndex === 8
                        ? "text-rose-400"
                        : "text-slate-500"
                    }`}
                  >
                    {col.phase === "operations" &&
                    col.spreadsheetYearIndex === 8
                      ? fmt(ffeRenovationShifted[8] ?? 0)
                      : "—"}
                  </td>
                ))}
                <td className="py-3 px-3 text-right font-mono font-semibold text-rose-400">
                  {fmt(sumDisplayedYears(ffeRenovationShifted))}
                </td>
              </tr>

              <tr>
                <td colSpan={TABLE_COL_SPAN} className="py-1"></td>
              </tr>

              <tr className="bg-emerald-500/10 border-t-2 border-emerald-500/30 font-bold">
                <td className="py-4 px-4 text-emerald-400 sticky left-0 bg-emerald-500/10 z-10">
                  Net Cash Flow
                </td>
                {npvColumns.map((col, idx) => {
                  if (col.phase === "development") {
                    const raw = monthlyTotal[col.month] ?? 0;
                    const v = -raw;
                    return (
                      <td
                        key={col.key}
                        className={`py-4 px-2 text-right font-mono text-base ${colTimelineBorder(idx)} ${
                          v >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {fmt(v)}
                      </td>
                    );
                  }
                  if (col.phase === "preOperating") {
                    return (
                      <td
                        key={col.key}
                        className={`py-4 px-2 text-right font-mono text-base text-slate-500 ${colTimelineBorder(idx)}`}
                      >
                        —
                      </td>
                    );
                  }
                  const yi = col.spreadsheetYearIndex;
                  const val = yi !== null ? netCashFlowsYearly[yi] ?? 0 : 0;
                  return (
                    <td
                      key={col.key}
                      className={`py-4 px-2 text-right font-mono text-base ${colTimelineBorder(idx)} ${
                        val >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {yi !== null ? fmtOpsCol(val, yi) : "—"}
                    </td>
                  );
                })}
                <td className="py-4 px-3 text-right font-mono text-base text-emerald-400">
                  {fmt(netCashFlowYearlySum)}
                </td>
              </tr>

              <tr>
                <td colSpan={TABLE_COL_SPAN} className="py-1"></td>
              </tr>

              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 text-slate-300 sticky left-0 bg-slate-800/50 z-10">
                  Discount Factor
                </td>
                {npvColumns.map((col, idx) => {
                  return (
                    <td
                      key={col.key}
                      className={`${tdTimeline} text-slate-400 ${colTimelineBorder(idx)}`}
                    >
                      {Number.isFinite(monthlyDiscounting.monthlyRate)
                        ? monthlyDiscounting
                            .discountFactorAtMonth(col.month)
                            .toFixed(4)
                        : "—"}
                    </td>
                  );
                })}
                <td className="py-3 px-3 text-slate-500">—</td>
              </tr>

              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 text-slate-300 sticky left-0 bg-slate-800/50 z-10">
                  Discounted Cash Flow
                </td>
                {npvColumns.map((col, idx) => {
                  const dcf = monthlyDiscounting.discountedByMonth[col.month] ?? 0;
                  return (
                    <td
                      key={col.key}
                      className={`${tdTimeline} ${colTimelineBorder(idx)} ${
                        dcf >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {fmt(dcf)}
                    </td>
                  );
                })}
                <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-400">
                  {fmt(
                    (monthlyDiscounting.discountedByMonth ?? []).reduce(
                      (a, b) => a + b,
                      0
                    )
                  )}
                </td>
              </tr>

              <tr className="bg-indigo-500/10 border-t-2 border-indigo-500/30 font-bold">
                <td className="py-4 px-4 text-indigo-400 sticky left-0 bg-indigo-500/10 z-10">
                  Cumulative NPV
                </td>
                {npvColumns.map((col, idx) => {
                  const npv = monthlyDiscounting.cumulativeByMonth[col.month] ?? 0;
                  return (
                    <td
                      key={col.key}
                      className={`py-4 px-2 text-right font-mono text-base ${colTimelineBorder(idx)} ${
                        npv >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {fmt(npv)}
                    </td>
                  );
                })}
                <td className="py-4 px-3 text-right font-mono text-base text-emerald-400">
                  {fmt(
                    monthlyDiscounting.cumulativeByMonth[
                      monthlyDiscounting.cumulativeByMonth.length - 1
                    ] ?? 0
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mt-4 text-xs text-slate-500">
            Operating lines use Component 2 hotel-hold P&amp;L ({OPERATIONAL_PERIOD_YEARS}{" "}
            years), shown on operations columns at the last month of each
            operating year (same yearly amounts as spreadsheet Y4–Y13). Total
            development costs use the Component 1 &quot;Monthly Total&quot; row from
            cash outflows (M0–M{constructionPeriod}). Pre-operating (
            {PRE_OPERATION_BUFFER_MONTHS} months) is a scheduling buffer before
            M{calculateOperationsStartMonth(constructionPeriod)}. Terminal value
            (spreadsheet Y13) uses stabilized NOI from Op year 9 (Y12: net income +
            depreciation) ÷ exit cap from{" "}
            <code className="text-slate-400">projectIRR.exitCapRate</code>{" "}
            (Component 3 only; not financing), default 7%. FFE renovation is 50%
            of FFE in spreadsheet Y9. Discount
            factors and cumulative NPV use the yearly unlevered IRR; end value at
            last operations column: {formatNumber(cumulativeNPVYearlyEnd)} &apos;000.
            {!snapshot ? (
              <span className="block mt-1 text-amber-500/90">
                Complete the operational hotel-hold wizard to populate P&amp;L
                drivers (net income, depreciation, working capital).
              </span>
            ) : null}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-500/60" />
              Construction / Development
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500/35" />
              Pre-Operating ({PRE_OPERATION_BUFFER_MONTHS}M buffer)
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/20" />
              Operations (year-end months)
            </div>
          </div>
        </div>

        {downloadOpen ? (
          <div
            ref={downloadRef}
            className="fixed bottom-24 left-4 right-4 z-50 rounded-xl border border-slate-700 bg-slate-800/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md md:left-1/2 md:right-auto md:w-[320px] md:-translate-x-1/2"
          >
            <p className="mb-2 text-xs font-medium text-slate-300">
              Download project IRR preview as…
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  exportToExcel({
                    filename: fileBase,
                    sheetName: "Project IRR (NPV)",
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
          previousRoute={withStreamPrefix(streamPrefix, "/project-irr")}
          nextRoute={withStreamPrefix(streamPrefix, "/financing?step=1")}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
}
