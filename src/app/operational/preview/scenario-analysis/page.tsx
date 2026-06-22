"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useFinModelStore, {
  buildCashOutflowProfile,
  getOperationalYearMonthRange,
  PRE_OPERATION_BUFFER_MONTHS,
} from "@/store/useFinModelStore";
import useScenarioStore from "@/store/useScenarioStore";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import { exportToCSV } from "@/lib/downloads/exportToCSV";
import { exportToExcel } from "@/lib/downloads/exportToExcel";
import { MetricWithTooltip } from "@/components/scenario/MetricWithTooltip";
import type { CustomShockDriver } from "@/types/scenario";
import { computeOperationalHotelHoldPnl } from "@/lib/operational-pnl";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";
import {
  type OperationalScenarioSnapshot,
  runOperationalScenarioEngines,
} from "@/app/operational/engine/buildOperationalScenarioEngines";
import {
  FACTOR_ID_TO_STORE_KEY,
  formatShockDisplay,
  getFactorLabel,
  normalizeAssetType,
  shocksToOperationalInput,
} from "@/app/operational/scenario-analysis/config/shockFactors";
import {
  resolveComponent4EquityHeadlines,
  resolvePeakFundingGap,
  resolveUnleveredProjectIrrPct,
} from "@/lib/scenario-irr-calculation";

type ShockKey =
  | "adr"
  | "occupancy"
  | "constructionCost"
  | "constructionDuration"
  | "interestRate"
  | "operatingExpenses"
  | "exitCapRate"
  | "ffeReserve";

type ProjectLevelMetrics = {
  unleveredIRR: number;
  unleveredPaybackMonths: number;
  peakEquity: number;
  unleveredEquityMultiple: number;
  totalDebt: number; // facility / cap
  minDSCR: number;
};

type EquityLevelMetrics = {
  leveredIRR: number;
  leveredPaybackMonths: number;
  peakEquity: number;
  leveredEquityMultiple: number;
  totalDebt: number; // actual drawn
  minDSCR: number;
};

function multipliers(shocks: Partial<Record<ShockKey, number>>) {
  const s = (v: number | undefined) => v ?? 0;
  const adrMultiplier = 1 + s(shocks.adr) / 100;
  // Proxy: each +1pp occupancy ≈ +1.5% revenue, each -1pp ≈ -1.5%
  const occMultiplier = 1 + (s(shocks.occupancy) * 1.5) / 100;
  const constructionCostMultiplier = 1 + s(shocks.constructionCost) / 100;
  const durationMultiplier =
    1 + (s(shocks.constructionDuration) * 10) / (12 * 100);
  const operatingExpenseMultiplier = 1 + s(shocks.operatingExpenses) / 100;
  const ffeReserveMultiplier = 1 + (s(shocks.ffeReserve) * 0.75) / 100;
  const interestMultiplier = 1 + (s(shocks.interestRate) * 6) / (300 * 100);
  const exitCapMultiplier = 1 + (s(shocks.exitCapRate) * 8) / (150 * 100);
  const netMultiplier =
    (adrMultiplier * occMultiplier) /
    Math.max(
      0.01,
      constructionCostMultiplier *
        durationMultiplier *
        operatingExpenseMultiplier *
        ffeReserveMultiplier *
        interestMultiplier *
        exitCapMultiplier
    );
  const debtMultiplier =
    constructionCostMultiplier / Math.max(0.01, adrMultiplier * occMultiplier);
  return {
    adrMultiplier,
    occMultiplier,
    constructionCostMultiplier,
    durationMultiplier,
    operatingExpenseMultiplier,
    ffeReserveMultiplier,
    interestMultiplier,
    exitCapMultiplier,
    netMultiplier,
    debtMultiplier,
  };
}

function shockUnitLabel(unit: CustomShockDriver["unit"]): string {
  if (unit === "currency") return " AED";
  if (unit === "months") return " mo";
  if (unit === "bps") return " bps";
  if (unit === "pp") return " pp";
  if (unit === "%rev") return "% rev";
  return "%";
}

export default function PreviewScenarioAnalysisPage() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement | null>(null);

  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashInflows = useFinModelStore((s) => s[finStream].cashInflows);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const snapshot = useFinModelStore((s) => s[finStream].hotelHoldSnapshot);
  const projectIRR = useFinModelStore((s) => s[finStream].projectIRR);
  const rootProjectIRR = useFinModelStore((s) => s.projectIRR);
  const financing = useFinModelStore((s) => s[finStream].financing);
  const equityReturns = useFinModelStore((s) => s[finStream].equityReturns);
  const financingMetrics = useFinModelStore((s) => s[finStream].financingMetrics);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const operationalEngineSnapshot: OperationalScenarioSnapshot = useMemo(
    () => ({
      cashInflows,
      cashOutflows,
      financing,
      projectInfo,
      hotelHoldSnapshot: snapshot,
    }),
    [cashInflows, cashOutflows, financing, projectInfo, snapshot]
  );

  const baseOperationalEngine = useMemo(() => {
    if (!isClient || finStream !== "operational") return null;
    return runOperationalScenarioEngines(operationalEngineSnapshot, "base", {
      isClient: true,
      isDataReady: true,
    });
  }, [isClient, finStream, operationalEngineSnapshot]);

  const defaultDrivers = useScenarioStore((s) => s.defaultDrivers);
  const customDrivers = useScenarioStore((s) => s.customDrivers);
  const setDefaultDriverShock = useScenarioStore((s) => s.setDefaultDriverShock);
  const updateCustomDriver = useScenarioStore((s) => s.updateCustomDriver);

  const storedScenarioShocks = useFinModelStore(
    (s) => s[finStream].scenarioShocks ?? {}
  );
  const updateScenarioShocks = useFinModelStore((s) => s.updateScenarioShocks);
  const setScenarioShocks = useFinModelStore((s) => s.setScenarioShocks);
  const resetScenarioShocks = useFinModelStore((s) => s.resetScenarioShocks);

  const buildingType = normalizeAssetType(projectInfo.buildingType);

  useEffect(() => {
    if (finStream !== "operational") return;
    const current = useFinModelStore.getState().operational.scenarioShocks ?? {};
    if (Object.keys(current).length > 0) return;
    const patch: Record<string, number> = {};
    Object.entries(FACTOR_ID_TO_STORE_KEY).forEach(([factorId, storeId]) => {
      const v = defaultDrivers.find((d) => d.id === storeId)?.shockValue ?? 0;
      if (Math.abs(v) > 1e-9) patch[factorId] = v;
    });
    if (Object.keys(patch).length > 0) {
      updateScenarioShocks(patch, "operational");
    }
  }, [defaultDrivers, finStream, updateScenarioShocks]);

  const currency = projectInfo.currency || "AED";

  /** Same horizon / column cadence as `/preview/financing` and `/preview/equity-returns`. */
  const POST_COMPLETION_BUFFER_MONTHS = 6;
  const stabilizationMonths = POST_COMPLETION_BUFFER_MONTHS;
  // Component 1: `cashOutflows.constructionPeriod`. Component 4:
  // `financing.constructionPeriodMonths`. Use max so a stale 30 in one slice does
  // not shrink the grid (e.g. M36 vs M38 when the other path has 32).
  const constructionPeriod =
    Math.max(
      cashOutflows.constructionPeriod ?? 0,
      financing.constructionPeriodMonths ?? 0
    ) || 30;
  /** Last month index for construction + stabilization (e.g. 32 + 6 → M38). */
  const totalMonthlyPeriod = constructionPeriod + stabilizationMonths;
  const stabilizationEndMonth = totalMonthlyPeriod;

  const holdPeriodYears = financing.holdPeriodYears || 10;
  const repaymentHorizonMonths = Math.round(holdPeriodYears * 12);
  const totalHoldPeriodMonths = Math.max(
    constructionPeriod + 90,
    stabilizationEndMonth + repaymentHorizonMonths
  );

  // Dense monthly: M0…M{totalMonthlyPeriod}; annual: M{totalMonthlyPeriod+12}, +12… within hold
  const previewColumnMonths = useMemo(() => {
    const lastDetailedMonth = Math.min(
      totalHoldPeriodMonths,
      stabilizationEndMonth
    );
    const out: number[] = [];
    for (let m = 0; m <= lastDetailedMonth; m++) {
      out.push(m);
    }
    for (let k = 1; ; k++) {
      const y = lastDetailedMonth + 12 * k;
      if (y > totalHoldPeriodMonths) break;
      out.push(y);
    }
    if (
      totalHoldPeriodMonths > lastDetailedMonth &&
      !out.includes(totalHoldPeriodMonths)
    ) {
      out.push(totalHoldPeriodMonths);
    }
    return Array.from(new Set(out)).sort((a, b) => a - b);
  }, [stabilizationEndMonth, totalHoldPeriodMonths]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const yearlyFromFormula = Array.from({ length: holdPeriodYears }, (_, idx) =>
      totalMonthlyPeriod + (idx + 1) * 12
    );
    console.log("=== Scenario Analysis preview: column calculation (dev) ===");
    console.log("Store: cashOutflows.constructionPeriod", cashOutflows.constructionPeriod);
    console.log(
      "Store: financing.constructionPeriodMonths",
      financing.constructionPeriodMonths
    );
    console.log("Resolved construction months:", constructionPeriod);
    console.log("Stabilization months:", stabilizationMonths);
    console.log("totalMonthlyPeriod (last dense month index):", totalMonthlyPeriod);
    console.log("hold / repayment years (Step 7):", holdPeriodYears);
    console.log("totalHoldPeriodMonths:", totalHoldPeriodMonths);
    console.log(
      "Yearly checkpoints (formula totalMonthlyPeriod + 12, +24, …):",
      yearlyFromFormula
    );
    console.log("previewColumnMonths:", previewColumnMonths);
  }, [
    cashOutflows.constructionPeriod,
    financing.constructionPeriodMonths,
    constructionPeriod,
    stabilizationMonths,
    totalMonthlyPeriod,
    holdPeriodYears,
    totalHoldPeriodMonths,
    previewColumnMonths,
  ]);

  const lastDetailedMonthForHeader = Math.min(
    totalHoldPeriodMonths,
    stabilizationEndMonth
  );
  const monthlyColumnCount = previewColumnMonths.filter(
    (m) => m <= lastDetailedMonthForHeader
  ).length;
  const yearlyColumnCount = Math.max(0, previewColumnMonths.length - monthlyColumnCount);

  const legacyScenarioShocks = useMemo(
    () => shocksToOperationalInput(storedScenarioShocks, buildingType),
    [storedScenarioShocks, buildingType]
  );

  const minDSCR = useMemo(() => {
    return financing.dscrProfile && financing.dscrProfile.length > 0
      ? (() => {
          const vals = financing.dscrProfile.map((d) => d.dscr).filter((d) => d > 0);
          return vals.length > 0 ? Math.min(...vals) : 1.25;
        })()
      : 1.25;
  }, [financing.dscrProfile]);

  const facilityDebt = useMemo(() => {
    const d = financing.totalDebt || financing.debtFacilityAmount || 0;
    return d > 0 ? d : 50_000_000;
  }, [financing.totalDebt, financing.debtFacilityAmount]);

  const engineTotalLoanDrawdown = useMemo(
    () => baseOperationalEngine?.metrics.totalLoanDrawdown ?? 0,
    [baseOperationalEngine?.metrics.totalLoanDrawdown]
  );

  const component4Headlines = useMemo(
    () =>
      resolveComponent4EquityHeadlines({
        financingMetrics,
        projectIRR,
        fallbackLoanDrawdown: engineTotalLoanDrawdown,
        fallbackEquityMultiple:
          baseOperationalEngine?.metrics.equityMultipleFromCF ??
          baseOperationalEngine?.metrics.equityMultiple ??
          0,
        fallbackTotalEquity:
          baseOperationalEngine?.metrics.peakEquityInjected ?? 0,
      }),
    [
      financingMetrics,
      projectIRR,
      engineTotalLoanDrawdown,
      baseOperationalEngine?.metrics.equityMultiple,
      baseOperationalEngine?.metrics.peakEquityInjected,
    ]
  );

  const peakFundingGap = useMemo(
    () =>
      resolvePeakFundingGap({
        financingMetrics,
        cashOutflows,
        cashInflows,
        constructionPeriod,
        postCompletionBufferMonths: stabilizationMonths,
      }),
    [
      financingMetrics,
      cashOutflows,
      cashInflows,
      constructionPeriod,
      stabilizationMonths,
    ]
  );

  const unleveredProjectIrrPct = useMemo(
    () => resolveUnleveredProjectIrrPct(projectIRR, rootProjectIRR),
    [projectIRR, rootProjectIRR]
  );

  // Base metrics: unlevered from Component 3; peak funding gap from Component 4 Step 1.
  const projectBaseMetrics: ProjectLevelMetrics = useMemo(() => {
    const base: ProjectLevelMetrics = {
      unleveredIRR: unleveredProjectIrrPct ?? 14.2,
      unleveredPaybackMonths: projectIRR.unleveredPayback ?? 42,
      peakEquity: peakFundingGap,
      unleveredEquityMultiple: projectIRR.unleveredMultiple ?? 1.2,
      totalDebt: facilityDebt,
      minDSCR,
    };
    if (baseOperationalEngine) {
      return { ...base, minDSCR: baseOperationalEngine.metrics.minDscr };
    }
    return base;
  }, [
    unleveredProjectIrrPct,
    projectIRR.unleveredPayback,
    projectIRR.unleveredMultiple,
    peakFundingGap,
    facilityDebt,
    minDSCR,
    baseOperationalEngine,
  ]);

  const equityBaseMetrics: EquityLevelMetrics = useMemo(() => {
    const pay =
      financingMetrics?.equityPayback ??
      projectIRR.projectMetrics?.equityPaybackMonth ??
      baseOperationalEngine?.metrics.equityPaybackMonth;
    const leveredPaybackMonths =
      pay != null && pay >= 0
        ? pay
        : equityReturns.paybackPeriod ?? 48;

    return {
      leveredIRR:
        component4Headlines.leveredIrrPct ??
        baseOperationalEngine?.metrics.equityIrrPct ??
        equityReturns.leveredIRR ??
        18.5,
      leveredPaybackMonths,
      peakEquity: component4Headlines.totalEquity,
      leveredEquityMultiple: component4Headlines.equityMultiple,
      totalDebt: component4Headlines.totalLoanDrawdown,
      minDSCR: baseOperationalEngine?.metrics.minDscr ?? minDSCR,
    };
  }, [
    component4Headlines,
    financingMetrics?.equityPayback,
    projectIRR.projectMetrics?.equityPaybackMonth,
    baseOperationalEngine,
    equityReturns.leveredIRR,
    equityReturns.paybackPeriod,
    minDSCR,
  ]);

  const hasDefaultShock = useMemo(
    () => Object.values(storedScenarioShocks).some((v) => v !== 0),
    [storedScenarioShocks]
  );
  const hasCustomShock = useMemo(
    () => customDrivers.some((d) => d.shockValue !== 0),
    [customDrivers]
  );

  const m = useMemo(() => multipliers(legacyScenarioShocks), [legacyScenarioShocks]);

  const projectCurrentMetrics: ProjectLevelMetrics = useMemo(() => {
    if (!hasDefaultShock) return { ...projectBaseMetrics };
    return {
      ...projectBaseMetrics,
      unleveredIRR: Math.max(0, Math.min(100, projectBaseMetrics.unleveredIRR * m.netMultiplier)),
      unleveredPaybackMonths: Math.max(6, Math.round(projectBaseMetrics.unleveredPaybackMonths / m.netMultiplier)),
      peakEquity: Math.max(0, projectBaseMetrics.peakEquity * m.constructionCostMultiplier),
      unleveredEquityMultiple: Math.max(0.5, projectBaseMetrics.unleveredEquityMultiple * m.netMultiplier),
      totalDebt: Math.max(0, projectBaseMetrics.totalDebt * m.debtMultiplier),
      minDSCR: Math.max(0.5, Math.min(3.0, projectBaseMetrics.minDSCR * m.adrMultiplier)),
    };
  }, [hasDefaultShock, projectBaseMetrics, m]);

  const equityCurrentMetrics: EquityLevelMetrics = useMemo(() => {
    if (!hasDefaultShock) return { ...equityBaseMetrics };
    return {
      ...equityBaseMetrics,
      leveredIRR: Math.max(0, Math.min(150, equityBaseMetrics.leveredIRR * m.netMultiplier * 1.05)),
      leveredPaybackMonths: Math.max(6, Math.round(equityBaseMetrics.leveredPaybackMonths / (m.netMultiplier * 1.05))),
      peakEquity: Math.max(0, equityBaseMetrics.peakEquity * m.constructionCostMultiplier),
      leveredEquityMultiple: Math.max(0.5, equityBaseMetrics.leveredEquityMultiple * m.netMultiplier),
      totalDebt: Math.max(0, equityBaseMetrics.totalDebt * m.debtMultiplier),
      minDSCR: Math.max(0.5, Math.min(3.0, equityBaseMetrics.minDSCR * m.adrMultiplier)),
    };
  }, [hasDefaultShock, equityBaseMetrics, m]);

  const projectMetricsDelta = useMemo(() => {
    const pct = (cur: number, bas: number) => (bas !== 0 ? ((cur - bas) / bas) * 100 : 0);
    return {
      unleveredIRR: projectCurrentMetrics.unleveredIRR - projectBaseMetrics.unleveredIRR,
      peakEquity: projectCurrentMetrics.peakEquity - projectBaseMetrics.peakEquity,
      peakEquityPercent: pct(projectCurrentMetrics.peakEquity, projectBaseMetrics.peakEquity),
      totalDebt: projectCurrentMetrics.totalDebt - projectBaseMetrics.totalDebt,
      totalDebtPercent: pct(projectCurrentMetrics.totalDebt, projectBaseMetrics.totalDebt),
      unleveredEquityMultiple: projectCurrentMetrics.unleveredEquityMultiple - projectBaseMetrics.unleveredEquityMultiple,
      minDSCR: projectCurrentMetrics.minDSCR - projectBaseMetrics.minDSCR,
    };
  }, [projectCurrentMetrics, projectBaseMetrics]);

  const equityMetricsDelta = useMemo(() => {
    const pct = (cur: number, bas: number) => (bas !== 0 ? ((cur - bas) / bas) * 100 : 0);
    return {
      leveredIRR: equityCurrentMetrics.leveredIRR - equityBaseMetrics.leveredIRR,
      peakEquity: equityCurrentMetrics.peakEquity - equityBaseMetrics.peakEquity,
      peakEquityPercent: pct(equityCurrentMetrics.peakEquity, equityBaseMetrics.peakEquity),
      totalDebt: equityCurrentMetrics.totalDebt - equityBaseMetrics.totalDebt,
      totalDebtPercent: pct(equityCurrentMetrics.totalDebt, equityBaseMetrics.totalDebt),
      leveredEquityMultiple: equityCurrentMetrics.leveredEquityMultiple - equityBaseMetrics.leveredEquityMultiple,
      minDSCR: equityCurrentMetrics.minDSCR - equityBaseMetrics.minDSCR,
    };
  }, [equityCurrentMetrics, equityBaseMetrics]);

  const allShocksAreZero =
    !hasDefaultShock && !hasCustomShock;

  const scenarioCashMult = useMemo(() => m.netMultiplier, [m.netMultiplier]);

  const outflowProfile = useMemo(
    () => buildCashOutflowProfile(cashOutflows),
    [cashOutflows]
  );

  const hotelPnl = useMemo(() => {
    if (!snapshot) return null;
    return computeOperationalHotelHoldPnl(
      snapshot,
      cashOutflows.constructionCost || 0,
      cashOutflows.ffe || 0
    );
  }, [snapshot, cashOutflows.constructionCost, cashOutflows.ffe]);

  const displayedCashFlowColumns = useMemo(() => {
    // Prefer operational hotel cash flows when snapshot is present (operational preview),
    // otherwise fall back to development inflow schedule (development stream).
    const byMonth = new Map<number, number>();

    if (hotelPnl?.ebitda?.length) {
      // Development / construction cash flows (negative) — M0..M{constructionPeriod}.
      // Construction Cost shock must move these months.
      const devMonths = Math.max(0, constructionPeriod);
      for (let m0 = 0; m0 <= devMonths; m0++) {
        const baseOut = outflowProfile.monthlyTotal?.[m0] ?? 0;
        if (baseOut !== 0) {
          byMonth.set(m0, (byMonth.get(m0) ?? 0) - Math.max(0, baseOut));
        }
      }

      // Operating cash flows at operational FYE months (EBITDA proxy).
      for (let oy = 1; oy <= 10; oy++) {
        const endMonth = getOperationalYearMonthRange(oy, constructionPeriod).endMonth;
        const idx = oy - 1; // exitIdx mapping: Y4..Y13 -> 0..9
        const noi = hotelPnl.ebitda[idx] ?? 0;
        byMonth.set(endMonth, (byMonth.get(endMonth) ?? 0) + noi);
      }

      // Terminal value at exit (sale cap rate) — added at final FYE (typically M166).
      const exitYear = Math.max(4, Math.min(13, Math.round(Number(financing.exitYear ?? 13) || 13)));
      const exitIdx = exitYear - 4; // 0..9
      const exitOy = Math.min(10, Math.max(1, exitYear - 3));
      const exitMonth = getOperationalYearMonthRange(exitOy, constructionPeriod).endMonth;
      const capPct = Math.max(0.0001, Number(financing.saleCapRate ?? 7) || 7);
      const exitNoi = hotelPnl.ebitda?.[exitIdx] ?? 0;
      const terminalValue = capPct > 0 ? exitNoi / (capPct / 100) : 0;
      byMonth.set(exitMonth, (byMonth.get(exitMonth) ?? 0) + terminalValue);
    } else {
      const schedule = cashInflows.monthlyInflowSchedule ?? [];
      for (const p of schedule) {
        byMonth.set(p.month, (byMonth.get(p.month) ?? 0) + (p.amount ?? 0));
      }
    }

    return previewColumnMonths.map((mo) => {
      const base = byMonth.get(mo) ?? 0;
      let scenario = base;
      if (hasDefaultShock) {
        // Apply construction cost shock ONLY to development months (M0..construction end).
        // Apply net multiplier to operating/sale cash flows.
        if (mo <= constructionPeriod) {
          scenario = base * (m.constructionCostMultiplier ?? 1);
        } else {
          scenario = base * scenarioCashMult;
        }
      }
      return {
        month: mo,
        base,
        scenario,
        delta: scenario - base,
      };
    });
  }, [
    previewColumnMonths,
    scenarioCashMult,
    hasDefaultShock,
    hotelPnl?.ebitda,
    snapshot,
    cashInflows.monthlyInflowSchedule,
    financing.exitYear,
    financing.saleCapRate,
    constructionPeriod,
    outflowProfile.monthlyTotal,
    m.constructionCostMultiplier,
  ]);

  const exportRows = useMemo((): (string | number | null)[][] => {
    const k = (v: number) => Math.round(v / 1000);
    const rows: (string | number | null)[][] = [
      ["Scenario Analysis Preview"],
      [
        "Project",
        [projectInfo.city, projectInfo.country].filter(Boolean).join(", ") ||
          "—",
      ],
      ["Currency", currency],
      ["Scenario cash-flow multiplier (net)", scenarioCashMult],
      ["All shocks at base case", allShocksAreZero ? "Yes" : "No"],
      [],
      ["Default shocks"],
      ...Object.entries(storedScenarioShocks)
        .filter(([, v]) => Math.abs(v) > 1e-9)
        .map(([id, v]) => [getFactorLabel(id), formatShockDisplay(id, v)]),
      [],
      ["Custom drivers"],
      ...customDrivers.map((d) => [
        d.name,
        d.shockValue,
        d.unit,
      ]),
      ...(customDrivers.length === 0 ? [["—", null, null]] : []),
      [],
      ["Monthly cash flows (operating / sales)"],
      [
        "Month",
        `Base (${currency} '000)`,
        `Scenario (${currency} '000)`,
        `Delta (${currency} '000)`,
      ],
      [
        "Visible month columns (matches Financing preview)",
        previewColumnMonths.join(", "),
      ],
      ...displayedCashFlowColumns.map((r) => [
        `M${r.month}`,
        k(r.base),
        k(r.scenario),
        k(r.delta),
      ]),
      [],
      ["Project level (unlevered) — base vs scenario"],
      ["Metric", "Base", "Scenario"],
      [
        "Unlevered IRR (%)",
        Number(projectBaseMetrics.unleveredIRR.toFixed(4)),
        Number(projectCurrentMetrics.unleveredIRR.toFixed(4)),
      ],
      [
        "Unlevered payback (months)",
        projectBaseMetrics.unleveredPaybackMonths,
        projectCurrentMetrics.unleveredPaybackMonths,
      ],
      [
        "Unlevered equity multiple (x)",
        Number(projectBaseMetrics.unleveredEquityMultiple.toFixed(4)),
        Number(projectCurrentMetrics.unleveredEquityMultiple.toFixed(4)),
      ],
      ["Peak equity proxy", projectBaseMetrics.peakEquity, projectCurrentMetrics.peakEquity],
      [
        "Total debt facility (cap)",
        projectBaseMetrics.totalDebt,
        projectCurrentMetrics.totalDebt,
      ],
      [
        "Min DSCR (x)",
        Number(projectBaseMetrics.minDSCR.toFixed(4)),
        Number(projectCurrentMetrics.minDSCR.toFixed(4)),
      ],
      [],
      ["Equity level (levered) — base vs scenario"],
      ["Metric", "Base", "Scenario"],
      [
        "Levered IRR (%)",
        Number(equityBaseMetrics.leveredIRR.toFixed(4)),
        Number(equityCurrentMetrics.leveredIRR.toFixed(4)),
      ],
      [
        "Levered payback (months)",
        equityBaseMetrics.leveredPaybackMonths,
        equityCurrentMetrics.leveredPaybackMonths,
      ],
      [
        "Levered equity multiple (x)",
        Number(equityBaseMetrics.leveredEquityMultiple.toFixed(4)),
        Number(equityCurrentMetrics.leveredEquityMultiple.toFixed(4)),
      ],
      [
        "Peak equity (levered)",
        equityBaseMetrics.peakEquity,
        equityCurrentMetrics.peakEquity,
      ],
      [
        "Total debt drawn",
        equityBaseMetrics.totalDebt,
        equityCurrentMetrics.totalDebt,
      ],
      [
        "Min DSCR (x)",
        Number(equityBaseMetrics.minDSCR.toFixed(4)),
        Number(equityCurrentMetrics.minDSCR.toFixed(4)),
      ],
    ];
    return rows;
  }, [
    projectInfo.city,
    projectInfo.country,
    currency,
    scenarioCashMult,
    allShocksAreZero,
    storedScenarioShocks,
    customDrivers,
    previewColumnMonths,
    displayedCashFlowColumns,
    projectBaseMetrics,
    projectCurrentMetrics,
    equityBaseMetrics,
    equityCurrentMetrics,
  ]);

  const fileBase = `scenario-analysis_${projectInfo.city || "project"}_${currency}`;

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

  const handleDownloadMenu = () => {
    setDownloadOpen((v) => !v);
  };

  const fmtM = (n: number) =>
    `${currency} ${(n / 1_000_000).toFixed(2)}M`;

  const activeShocks = useMemo(() => {
    const defaults = Object.entries(storedScenarioShocks)
      .filter(([, value]) => Math.abs(value) > 1e-9)
      .map(([id, value]) => ({
        kind: "default" as const,
        id,
        name: getFactorLabel(id),
        value,
        display: formatShockDisplay(id, value),
      }));
    const customs = customDrivers
      .filter((d) => Math.abs(d.shockValue ?? 0) > 1e-9)
      .map((d) => ({
        kind: "custom" as const,
        id: d.id,
        name: d.name,
        value: d.shockValue,
        display: `${d.shockValue > 0 ? "+" : ""}${
          typeof d.shockValue === "number" && Number.isFinite(d.shockValue)
            ? d.shockValue.toFixed(2)
            : "0.00"
        }${shockUnitLabel(d.unit)}`,
      }));
    return [...defaults, ...customs];
  }, [customDrivers, storedScenarioShocks]);

  const resetShock = useCallback(
    (shock: (typeof activeShocks)[number]) => {
      if (shock.kind === "default") {
        updateScenarioShocks({ [shock.id]: 0 }, finStream);
        const storeId = FACTOR_ID_TO_STORE_KEY[shock.id];
        if (storeId) setDefaultDriverShock(storeId, 0);
      } else {
        updateCustomDriver(shock.id, { shockValue: 0 });
      }
    },
    [
      finStream,
      setDefaultDriverShock,
      updateCustomDriver,
      updateScenarioShocks,
    ]
  );

  const resetAllShocks = useCallback(() => {
    resetScenarioShocks(finStream);
    setScenarioShocks({}, finStream);
    Object.values(FACTOR_ID_TO_STORE_KEY).forEach((storeId) => {
      if (storeId) setDefaultDriverShock(storeId, 0);
    });
    customDrivers.forEach((d) => updateCustomDriver(d.id, { shockValue: 0 }));
  }, [
    customDrivers,
    finStream,
    resetScenarioShocks,
    setScenarioShocks,
    setDefaultDriverShock,
    updateCustomDriver,
  ]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 pb-32">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-white">
            Preview: Scenario Analysis
          </h1>
          <p className="text-sm text-slate-400">
            Summary of active shocks from Component 6 and projected metrics vs
            base case. Cash flows use the same sensitivity multiplier as the
            scenario IRR model (placeholder).
          </p>
        </header>

        {/* Scenario Summary Card */}
        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            🎯 Scenario Summary
          </h2>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg bg-slate-800/50 p-4">
              <h3 className="mb-3 text-sm font-medium text-slate-300">
                Active Shocks ({activeShocks.length})
              </h3>
              {activeShocks.length === 0 ? (
                <p className="text-sm italic text-slate-500">
                  No active shocks (all at base case)
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {activeShocks.map((shock) => (
                      <div
                        key={`${shock.kind}-${shock.id}`}
                        className={`rounded-lg border px-3 py-2 ${
                          shock.value > 0
                            ? "border-emerald-500/30 bg-emerald-500/10"
                            : "border-rose-500/30 bg-rose-500/10"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-xs font-medium text-slate-300">
                            {shock.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => resetShock(shock)}
                            className="shrink-0 text-[10px] text-slate-500 hover:text-white"
                            title="Reset shock"
                          >
                            ✕ Reset
                          </button>
                        </div>
                        <div
                          className={`mt-1 text-sm font-semibold ${
                            shock.value > 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {shock.display}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={resetAllShocks}
                    className="mt-3 text-xs text-slate-400 hover:text-white"
                  >
                    🔄 Reset All to Base Case
                  </button>
                </>
              )}
            </div>

            <div className="rounded-lg bg-slate-800/50 p-4">
              <h3 className="mb-3 text-sm font-medium text-slate-300">
                Impact vs Base Case
              </h3>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs font-medium text-slate-300">Project Base</p>
                  <div className="grid grid-cols-1 gap-3">
                    <MetricWithTooltip
                      label="Unlevered Project IRR"
                      value={`${projectCurrentMetrics.unleveredIRR.toFixed(2)}%`}
                      delta={`${projectMetricsDelta.unleveredIRR >= 0 ? "+" : ""}${projectMetricsDelta.unleveredIRR.toFixed(2)}pp vs base`}
                      deltaColor={projectMetricsDelta.unleveredIRR >= 0 ? "positive" : "negative"}
                      sourceComponent="Component 3 — /preview/project-irr"
                      sourceDescription="Unlevered project IRR from Project IRR preview (monthly NCF series)."
                    />
                    <MetricWithTooltip
                      label="Unlevered Equity Multiple"
                      value={`${projectCurrentMetrics.unleveredEquityMultiple.toFixed(2)}x`}
                      delta={`${projectMetricsDelta.unleveredEquityMultiple >= 0 ? "+" : ""}${projectMetricsDelta.unleveredEquityMultiple.toFixed(2)}x vs base`}
                      deltaColor={projectMetricsDelta.unleveredEquityMultiple >= 0 ? "positive" : "negative"}
                      sourceComponent="Component 3 — /project-irr"
                      sourceDescription="Unlevered multiple (base from Component 3 where available)."
                    />
                    <MetricWithTooltip
                      label="Peak Funding Gap"
                      value={fmtM(projectCurrentMetrics.peakEquity)}
                      delta={`${projectMetricsDelta.peakEquityPercent >= 0 ? "+" : ""}${projectMetricsDelta.peakEquityPercent.toFixed(1)}% vs base`}
                      deltaColor={projectMetricsDelta.peakEquity <= 0 ? "positive" : "negative"}
                      sourceComponent="Component 4 — Step 1"
                      sourceDescription="Maximum cumulative funding shortfall before financing (Component 4 Step 1)."
                    />
                    <MetricWithTooltip
                      label="Total Debt (facility cap)"
                      value={fmtM(projectCurrentMetrics.totalDebt)}
                      delta={`${projectMetricsDelta.totalDebtPercent >= 0 ? "+" : ""}${projectMetricsDelta.totalDebtPercent.toFixed(1)}% vs base`}
                      deltaColor={projectMetricsDelta.totalDebt <= 0 ? "positive" : "negative"}
                      sourceComponent="Component 4 — /financing"
                      sourceDescription="Facility / approved cap (LTC/LTV binding)."
                    />
                    <MetricWithTooltip
                      label="Min DSCR"
                      value={`${projectCurrentMetrics.minDSCR.toFixed(2)}x`}
                      delta={`${projectMetricsDelta.minDSCR >= 0 ? "+" : ""}${projectMetricsDelta.minDSCR.toFixed(2)}x vs base`}
                      deltaColor={projectMetricsDelta.minDSCR >= 0 ? "positive" : "negative"}
                      sourceComponent="Component 4 — /financing"
                      sourceDescription="DSCR basis from financing model (shared)."
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-xs font-medium text-slate-300">Equity Base</p>
                  <div className="grid grid-cols-1 gap-3">
                    <MetricWithTooltip
                      label="Levered IRR"
                      value={`${equityCurrentMetrics.leveredIRR.toFixed(2)}%`}
                      delta={`${equityMetricsDelta.leveredIRR >= 0 ? "+" : ""}${equityMetricsDelta.leveredIRR.toFixed(2)}pp vs base`}
                      deltaColor={equityMetricsDelta.leveredIRR >= 0 ? "positive" : "negative"}
                      sourceComponent="Component 4 — /preview/financing"
                      sourceDescription="Levered equity IRR from Component 4 financing preview."
                    />
                    <MetricWithTooltip
                      label="Levered Equity Multiple"
                      value={`${equityCurrentMetrics.leveredEquityMultiple.toFixed(2)}x`}
                      delta={`${equityMetricsDelta.leveredEquityMultiple >= 0 ? "+" : ""}${equityMetricsDelta.leveredEquityMultiple.toFixed(2)}x vs base`}
                      deltaColor={equityMetricsDelta.leveredEquityMultiple >= 0 ? "positive" : "negative"}
                      sourceComponent="Component 4 — /preview/financing"
                      sourceDescription="Levered equity multiple (CF-sign series) from Component 4."
                    />
                    <MetricWithTooltip
                      label="Total Equity"
                      value={fmtM(equityCurrentMetrics.peakEquity)}
                      delta={`${equityMetricsDelta.peakEquityPercent >= 0 ? "+" : ""}${equityMetricsDelta.peakEquityPercent.toFixed(1)}% vs base`}
                      deltaColor={equityMetricsDelta.peakEquity <= 0 ? "positive" : "negative"}
                      sourceComponent="Component 4 — /preview/financing"
                      sourceDescription="Total equity invested (land + cash) from Component 4."
                    />
                    <MetricWithTooltip
                      label="Total Debt (drawn)"
                      value={fmtM(equityCurrentMetrics.totalDebt)}
                      delta={`${equityMetricsDelta.totalDebtPercent >= 0 ? "+" : ""}${equityMetricsDelta.totalDebtPercent.toFixed(1)}% vs base`}
                      deltaColor={equityMetricsDelta.totalDebt <= 0 ? "positive" : "negative"}
                      sourceComponent="Component 4 — /financing"
                      sourceDescription="Total loan drawdown from Component 4 financing model."
                    />
                    <MetricWithTooltip
                      label="Min DSCR"
                      value={`${equityCurrentMetrics.minDSCR.toFixed(2)}x`}
                      delta={`${equityMetricsDelta.minDSCR >= 0 ? "+" : ""}${equityMetricsDelta.minDSCR.toFixed(2)}x vs base`}
                      deltaColor={equityMetricsDelta.minDSCR >= 0 ? "positive" : "negative"}
                      sourceComponent="Component 4 — /financing"
                      sourceDescription="Same DSCR basis as financing (shared)."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cash flows — same column pattern as Financing / Equity previews */}
        <div className="mb-8 overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Operating / Sales Cash Flows ({currency} &apos;000)
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Columns match Component 4: monthly through M{stabilizationEndMonth}{" "}
            (construction + 6-month stabilization), then annual checkpoints
            (M{stabilizationEndMonth + 12}, +12, …) to M{totalHoldPeriodMonths}{" "}
            (Step 7 hold). Base = Component 2 schedule; scenario = base ×
            sensitivity multiplier when default shocks are active.
          </p>
          <table className="w-full min-w-max text-sm text-slate-200">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/80">
                <th
                  scope="col"
                  className="sticky left-0 z-20 min-w-[140px] border-b border-r border-slate-700 bg-slate-800 py-2 pr-3 pl-0 text-left text-xs font-medium text-slate-400"
                />
                {yearlyColumnCount > 0 ? (
                  <>
                    <th
                      scope="colgroup"
                      colSpan={monthlyColumnCount}
                      className="border-b border-slate-700 px-2 py-2 text-center text-xs font-medium text-emerald-400"
                    >
                      Construction + stabilization (monthly)
                    </th>
                    <th
                      scope="colgroup"
                      colSpan={yearlyColumnCount}
                      className="border-b border-l-2 border-slate-600 px-2 py-2 text-center text-xs font-medium text-amber-300/90"
                    >
                      Hold / repayment (yearly)
                    </th>
                  </>
                ) : (
                  <th
                    scope="colgroup"
                    colSpan={previewColumnMonths.length}
                    className="border-b border-slate-700 px-2 py-2 text-center text-xs font-medium text-emerald-400"
                  >
                    Cash inflows (monthly)
                  </th>
                )}
              </tr>
              <tr className="border-b border-slate-700 text-left">
                <th
                  scope="col"
                  className="sticky left-0 z-20 min-w-[140px] border-b border-r border-slate-700 bg-slate-800 py-2 pr-3 text-left text-xs font-medium text-slate-400"
                >
                  Line
                </th>
                {previewColumnMonths.map((mo) => (
                  <th
                    key={mo}
                    scope="col"
                    className="min-w-[72px] border-b border-r border-slate-700/60 px-2 py-2 text-center text-xs font-medium text-slate-300"
                  >
                    M{mo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800/80">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-slate-700 bg-slate-900/90 py-2 pr-3 text-left text-xs font-medium text-slate-300"
                >
                  Base
                </th>
                {displayedCashFlowColumns.map((r) => (
                  <td
                    key={`b-${r.month}`}
                    className="border-r border-slate-800/80 px-2 py-1.5 text-right tabular-nums"
                  >
                    {(r.base / 1000).toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-800/80">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-slate-700 bg-slate-900/90 py-2 pr-3 text-left text-xs font-medium text-slate-300"
                >
                  Scenario
                </th>
                {displayedCashFlowColumns.map((r) => (
                  <td
                    key={`s-${r.month}`}
                    className="border-r border-slate-800/80 px-2 py-1.5 text-right tabular-nums text-emerald-200/90"
                  >
                    {(r.scenario / 1000).toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-800/80">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-slate-700 bg-slate-900/90 py-2 pr-3 text-left text-xs font-medium text-slate-300"
                >
                  Δ
                </th>
                {displayedCashFlowColumns.map((r) => (
                  <td
                    key={`d-${r.month}`}
                    className={`border-r border-slate-800/80 px-2 py-1.5 text-right tabular-nums ${
                      r.delta >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {(r.delta / 1000).toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Key Metrics Card */}
        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Key Metrics</h2>

          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-200">
              Project Level (Unlevered)
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricWithTooltip
                label="Unlevered Project IRR"
                scenarioValue={`${projectCurrentMetrics.unleveredIRR.toFixed(2)}%`}
                baseValue={`${projectBaseMetrics.unleveredIRR.toFixed(2)}%`}
                isBaseCase={allShocksAreZero}
                isPositive={projectMetricsDelta.unleveredIRR >= 0}
                sourceComponent="Component 3 — /project-irr"
                sourceDescription="Unlevered project IRR (base from Component 3)."
              />
              <MetricWithTooltip
                label="Unlevered Payback"
                scenarioValue={`${projectCurrentMetrics.unleveredPaybackMonths} mo`}
                baseValue={`${projectBaseMetrics.unleveredPaybackMonths} mo`}
                isBaseCase={allShocksAreZero}
                isPositive={projectCurrentMetrics.unleveredPaybackMonths <= projectBaseMetrics.unleveredPaybackMonths}
                sourceComponent="Component 3 — /project-irr"
                sourceDescription="Unlevered payback (months) from Component 3."
              />
              <MetricWithTooltip
                label="Unlevered Equity Multiple"
                scenarioValue={`${projectCurrentMetrics.unleveredEquityMultiple.toFixed(2)}x`}
                baseValue={`${projectBaseMetrics.unleveredEquityMultiple.toFixed(2)}x`}
                isBaseCase={allShocksAreZero}
                isPositive={projectMetricsDelta.unleveredEquityMultiple >= 0}
                sourceComponent="Component 3 — /project-irr"
                sourceDescription="Unlevered multiple from Component 3 where available."
              />
              <MetricWithTooltip
                label="Peak Funding Gap"
                scenarioValue={fmtM(projectCurrentMetrics.peakEquity)}
                baseValue={fmtM(projectBaseMetrics.peakEquity)}
                isBaseCase={allShocksAreZero}
                isPositive={projectMetricsDelta.peakEquity <= 0}
                sourceComponent="Component 4 — Step 1"
                sourceDescription="Peak funding gap from Component 4 Step 1 (max cumulative shortfall)."
              />
              <MetricWithTooltip
                label="Total Debt (facility cap)"
                scenarioValue={fmtM(projectCurrentMetrics.totalDebt)}
                baseValue={fmtM(projectBaseMetrics.totalDebt)}
                isBaseCase={allShocksAreZero}
                isPositive={projectMetricsDelta.totalDebt <= 0}
                sourceComponent="Component 4 — /financing"
                sourceDescription="Facility / cap sized in Component 4."
              />
              <MetricWithTooltip
                label="Min DSCR"
                scenarioValue={`${projectCurrentMetrics.minDSCR.toFixed(2)}x`}
                baseValue={`${projectBaseMetrics.minDSCR.toFixed(2)}x`}
                isBaseCase={allShocksAreZero}
                isPositive={projectMetricsDelta.minDSCR >= 0}
                sourceComponent="Component 4 — /financing"
                sourceDescription="Minimum DSCR from financing DSCR profile."
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-200">
              Equity Level (Levered)
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricWithTooltip
                label="Levered IRR"
                scenarioValue={`${equityCurrentMetrics.leveredIRR.toFixed(2)}%`}
                baseValue={`${equityBaseMetrics.leveredIRR.toFixed(2)}%`}
                isBaseCase={allShocksAreZero}
                isPositive={equityMetricsDelta.leveredIRR >= 0}
                sourceComponent="Component 4 — /preview/financing"
                sourceDescription="Levered equity IRR from Component 4 financing preview."
              />
              <MetricWithTooltip
                label="Levered Payback"
                scenarioValue={`${equityCurrentMetrics.leveredPaybackMonths} mo`}
                baseValue={`${equityBaseMetrics.leveredPaybackMonths} mo`}
                isBaseCase={allShocksAreZero}
                isPositive={equityCurrentMetrics.leveredPaybackMonths <= equityBaseMetrics.leveredPaybackMonths}
                sourceComponent="Component 5 — /equity-returns"
                sourceDescription="Levered payback period from Component 5."
              />
              <MetricWithTooltip
                label="Levered Equity Multiple"
                scenarioValue={`${equityCurrentMetrics.leveredEquityMultiple.toFixed(2)}x`}
                baseValue={`${equityBaseMetrics.leveredEquityMultiple.toFixed(2)}x`}
                isBaseCase={allShocksAreZero}
                isPositive={equityMetricsDelta.leveredEquityMultiple >= 0}
                sourceComponent="Component 4 — /preview/financing"
                sourceDescription="Levered equity multiple from Component 4."
              />
              <MetricWithTooltip
                label="Total Equity"
                scenarioValue={fmtM(equityCurrentMetrics.peakEquity)}
                baseValue={fmtM(equityBaseMetrics.peakEquity)}
                isBaseCase={allShocksAreZero}
                isPositive={equityMetricsDelta.peakEquity <= 0}
                sourceComponent="Component 4 — /preview/financing"
                sourceDescription="Total equity invested (land + cash) from Component 4."
              />
              <MetricWithTooltip
                label="Total Debt (drawn)"
                scenarioValue={fmtM(equityCurrentMetrics.totalDebt)}
                baseValue={fmtM(equityBaseMetrics.totalDebt)}
                isBaseCase={allShocksAreZero}
                isPositive={equityMetricsDelta.totalDebt <= 0}
                sourceComponent="Component 4 — /financing"
                sourceDescription="Total loan drawdown from Component 4."
              />
              <MetricWithTooltip
                label="Min DSCR"
                scenarioValue={`${equityCurrentMetrics.minDSCR.toFixed(2)}x`}
                baseValue={`${equityBaseMetrics.minDSCR.toFixed(2)}x`}
                isBaseCase={allShocksAreZero}
                isPositive={equityMetricsDelta.minDSCR >= 0}
                sourceComponent="Component 4 — /financing"
                sourceDescription="Minimum DSCR from Component 4 DSCR profile."
              />
            </div>
          </div>
        </div>

      </div>

      {downloadOpen ? (
        <div
          ref={downloadRef}
          className="fixed bottom-24 left-4 right-4 z-50 rounded-xl border border-slate-700 bg-slate-800/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md md:left-1/2 md:right-auto md:w-[320px] md:-translate-x-1/2"
        >
          <p className="mb-2 text-xs font-medium text-slate-300">
            Download scenario analysis preview as…
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                exportToExcel({
                  filename: fileBase,
                  sheetName: "Scenario Analysis",
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
        previousRoute={withStreamPrefix(streamPrefix, "/scenario-analysis")}
        onDownload={handleDownloadMenu}
        showNext={false}
        restartRoute={withStreamPrefix(streamPrefix, "/cash-outflows")}
        restartLabel="Restart"
        showFeasibilityStudy
        feasibilityStudyLabel="Feasibility Study"
        feasibilityStudyRoute={withStreamPrefix(streamPrefix, "/feasibility-study")}
      />
    </div>
  );
}
