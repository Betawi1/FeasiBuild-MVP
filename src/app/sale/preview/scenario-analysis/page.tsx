"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useFinModelStore from "@/store/useFinModelStore";
import useScenarioStore from "@/store/useScenarioStore";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import { exportToCSV } from "@/lib/downloads/exportToCSV";
import { exportToExcel } from "@/lib/downloads/exportToExcel";
import { MetricWithTooltip } from "@/components/scenario/MetricWithTooltip";
import type { CustomShockDriver } from "@/types/scenario";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";
import {
  applySaleShocksToSnapshot,
  runSaleScenarioEngines,
  runSaleScenarioWithShocks,
  type SaleScenarioSnapshot,
} from "@/app/sale/engine/buildSaleScenarioEngines";
import type { MonthlyCashFlowPoint } from "@/store/useFinModelStore";
import {
  SALE_DEFAULT_DRIVERS,
  isSaleDriverSet,
  shocksFromDefaultDrivers,
} from "@/app/sale/scenario/saleScenarioDrivers";
import { solveAnnualIRR } from "@/lib/irr-calculations";
import { buildSaleCashflowDetailProfile } from "@/lib/sale-cash-preview-profile";

function toPct(maybePctOrDecimal: number | null | undefined): number | null {
  if (maybePctOrDecimal == null || !Number.isFinite(maybePctOrDecimal)) return null;
  if (Math.abs(maybePctOrDecimal) > 0 && Math.abs(maybePctOrDecimal) <= 1.5) {
    return maybePctOrDecimal * 100;
  }
  return maybePctOrDecimal;
}

function firstValidIrrPct(
  ...candidates: (number | null | undefined)[]
): number | null {
  for (const raw of candidates) {
    const pct = toPct(raw);
    if (pct != null && Number.isFinite(pct)) return pct;
  }
  return null;
}

type ProjectLevelMetrics = {
  unleveredIRR: number;
  unleveredPaybackMonths: number;
  peakEquity: number;
  unleveredEquityMultiple: number;
  totalDebt: number;
  loanRepaymentMonth: number | null;
};

type EquityLevelMetrics = {
  leveredIRR: number;
  leveredPaybackMonths: number;
  peakEquity: number;
  leveredEquityMultiple: number;
  totalDebt: number;
  loanRepaymentMonth: number | null;
};

function saleEngineToProjectMetrics(
  run: ReturnType<typeof runSaleScenarioEngines> | null,
  fallback: ProjectLevelMetrics
): ProjectLevelMetrics {
  if (!run) return fallback;
  const m = run.metrics;
  return {
    unleveredIRR: m.unleveredIrrPct,
    unleveredPaybackMonths:
      m.unleveredPaybackMonths >= 0
        ? m.unleveredPaybackMonths
        : fallback.unleveredPaybackMonths,
    peakEquity: m.peakEquityInjected,
    unleveredEquityMultiple: fallback.unleveredEquityMultiple,
    totalDebt: fallback.totalDebt,
    loanRepaymentMonth: m.loanRepaymentMonth,
  };
}

function saleEngineToEquityMetrics(
  run: ReturnType<typeof runSaleScenarioEngines> | null,
  fallback: EquityLevelMetrics
): EquityLevelMetrics {
  if (!run) return fallback;
  const m = run.metrics;
  return {
    leveredIRR: m.equityIrrPct,
    leveredPaybackMonths:
      m.equityPaybackMonth != null && m.equityPaybackMonth >= 0
        ? m.equityPaybackMonth
        : fallback.leveredPaybackMonths,
    peakEquity: m.peakEquityInjected,
    leveredEquityMultiple: m.equityMultiple,
    totalDebt: fallback.totalDebt,
    loanRepaymentMonth: m.loanRepaymentMonth,
  };
}

function scheduleSalesAtMonth(
  schedule: MonthlyCashFlowPoint[] | undefined,
  month: number
): number {
  return (schedule ?? []).reduce((sum, p) => {
    if (Math.round(Number(p.month) || 0) !== month) return sum;
    return sum + (Number(p.amount) || 0);
  }, 0);
}

function monthlySalesAtMonth(
  schedule: MonthlyCashFlowPoint[] | undefined,
  rows: { month: number; salesProceeds?: number }[],
  month: number
): number {
  const fromEngine = rows.find((r) => r.month === month)?.salesProceeds ?? 0;
  const fromSchedule = scheduleSalesAtMonth(schedule, month);
  return fromEngine || fromSchedule;
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
  const projectIRR = useFinModelStore((s) => s[finStream].projectIRR);
  const saleMetrics = projectIRR?.projectMetrics;
  const financing = useFinModelStore((s) => s[finStream].financing);
  const equityReturns = useFinModelStore((s) => s[finStream].equityReturns);

  const setDefaultDrivers = useScenarioStore((s) => s.setDefaultDrivers);

  /** Same pipeline as `/sale/preview/project-irr` — avoids stale ~23% in store. */
  const previewUnleveredIrrPct = useMemo(() => {
    if (finStream !== "sale") return null;
    const cp = Math.max(
      cashOutflows.constructionPeriod ?? 0,
      financing.constructionPeriodMonths ?? 0
    ) || 30;
    const totalMonths = cp + 6;
    const detail = buildSaleCashflowDetailProfile(cashOutflows, projectInfo);
    const inflowByMonth = new Map<number, number>();
    for (const p of cashInflows.monthlyInflowSchedule || []) {
      inflowByMonth.set(
        p.month,
        (inflowByMonth.get(p.month) || 0) + (p.amount || 0)
      );
    }
    const flows = [];
    for (let m = 0; m <= totalMonths; m++) {
      flows.push({
        month: m,
        amount:
          (inflowByMonth.get(m) || 0) - (Number(detail.monthlyTotal[m]) || 0),
      });
    }
    const solved = solveAnnualIRR(flows, 1e-7, 100);
    return solved.annualIRR != null ? solved.annualIRR * 100 : null;
  }, [
    finStream,
    cashOutflows,
    cashInflows.monthlyInflowSchedule,
    financing.constructionPeriodMonths,
    projectInfo,
  ]);

  const baseUnleveredIRR =
    previewUnleveredIrrPct ??
    firstValidIrrPct(
      projectIRR?.unleveredIRR,
      saleMetrics?.unleveredIRR
    ) ??
    14.2;

  const baseLeveredIRR =
    firstValidIrrPct(saleMetrics?.leveredEquityIRR) ?? 18.5;

  const basePeakEquity =
    saleMetrics?.peakEquityInjected ??
    saleMetrics?.totalEquityInvested ??
    projectIRR.peakFunding ??
    0;

  const baseLoanRepayment =
    saleMetrics?.equityPaybackMonth != null && saleMetrics.equityPaybackMonth >= 0
      ? saleMetrics.equityPaybackMonth
      : null;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("📊 Scenario Preview Base Metrics:", {
      unleveredIRR: baseUnleveredIRR,
      leveredIRR: baseLeveredIRR,
      peakEquity: basePeakEquity,
      loanRepayment: baseLoanRepayment,
      previewUnleveredIrrPct,
      storeUnlevered: projectIRR?.unleveredIRR,
      storeLevered: saleMetrics?.leveredEquityIRR,
      fullProjectIRR: projectIRR,
    });
  }, [
    baseUnleveredIRR,
    baseLeveredIRR,
    basePeakEquity,
    baseLoanRepayment,
    previewUnleveredIrrPct,
    projectIRR,
    saleMetrics?.leveredEquityIRR,
  ]);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (finStream !== "sale") return;
    const drivers = useScenarioStore.getState().defaultDrivers;
    if (!isSaleDriverSet(drivers)) {
      setDefaultDrivers(SALE_DEFAULT_DRIVERS);
    }
  }, [finStream, setDefaultDrivers]);

  const saleScenarioSnapshot: SaleScenarioSnapshot = useMemo(
    () => ({
      cashInflows,
      cashOutflows,
      financing,
      projectInfo,
    }),
    [cashInflows, cashOutflows, financing, projectInfo]
  );

  const saleEngineOpts = useMemo(
    () => ({
      unleveredIrrPct: baseUnleveredIRR,
      unleveredPaybackMonths: projectIRR.unleveredPayback ?? 42,
    }),
    [baseUnleveredIRR, projectIRR.unleveredPayback]
  );

  const defaultDrivers = useScenarioStore((s) => s.defaultDrivers);
  const customDrivers = useScenarioStore((s) => s.customDrivers);
  const setDefaultDriverShock = useScenarioStore((s) => s.setDefaultDriverShock);
  const updateCustomDriver = useScenarioStore((s) => s.updateCustomDriver);

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

  const scenarioShocks = useMemo(
    () => shocksFromDefaultDrivers(defaultDrivers),
    [defaultDrivers]
  );

  const facilityDebt = useMemo(() => {
    const d = financing.totalDebt || financing.debtFacilityAmount || 0;
    return d > 0 ? d : 50_000_000;
  }, [financing.totalDebt, financing.debtFacilityAmount]);

  const actualDebtDrawn = useMemo(() => {
    const stack = financing.monthlyFundingStack || [];
    if (stack.length === 0) return 0;
    const last = stack[stack.length - 1];
    return Math.max(0, last?.cumulativeDebtDrawn ?? 0);
  }, [financing.monthlyFundingStack]);

  const baseSaleEngine = useMemo(() => {
    if (!isClient || finStream !== "sale") return null;
    return runSaleScenarioEngines(saleScenarioSnapshot, saleEngineOpts);
  }, [isClient, finStream, saleScenarioSnapshot, saleEngineOpts]);

  const projectBaseMetrics: ProjectLevelMetrics = useMemo(() => {
    const fallback: ProjectLevelMetrics = {
      unleveredIRR: baseUnleveredIRR,
      unleveredPaybackMonths: projectIRR.unleveredPayback ?? 42,
      peakEquity: basePeakEquity,
      unleveredEquityMultiple: projectIRR.unleveredMultiple ?? 1.2,
      totalDebt: facilityDebt,
      loanRepaymentMonth: baseLoanRepayment,
    };
    const fromEngine = saleEngineToProjectMetrics(baseSaleEngine, fallback);
    return { ...fromEngine, unleveredIRR: baseUnleveredIRR };
  }, [
    baseSaleEngine,
    baseUnleveredIRR,
    basePeakEquity,
    baseLoanRepayment,
    projectIRR.unleveredPayback,
    projectIRR.unleveredMultiple,
    facilityDebt,
  ]);

  const equityBaseMetrics: EquityLevelMetrics = useMemo(() => {
    const fallback: EquityLevelMetrics = {
      leveredIRR: baseLeveredIRR,
      leveredPaybackMonths:
        baseLoanRepayment ?? equityReturns.paybackPeriod ?? 48,
      peakEquity: basePeakEquity,
      leveredEquityMultiple:
        saleMetrics?.equityMultiple ?? equityReturns.equityMultiple ?? 1.5,
      totalDebt: actualDebtDrawn || facilityDebt,
      loanRepaymentMonth: baseLoanRepayment,
    };
    const fromEngine = saleEngineToEquityMetrics(baseSaleEngine, fallback);
    return {
      ...fromEngine,
      leveredIRR: baseLeveredIRR,
      peakEquity: basePeakEquity,
    };
  }, [
    baseSaleEngine,
    baseLeveredIRR,
    basePeakEquity,
    baseLoanRepayment,
    saleMetrics?.equityMultiple,
    equityReturns.paybackPeriod,
    equityReturns.equityMultiple,
    actualDebtDrawn,
    facilityDebt,
  ]);

  const hasDefaultShock = useMemo(
    () => Object.values(scenarioShocks).some((v) => v !== 0),
    [scenarioShocks]
  );
  const hasCustomShock = useMemo(
    () => customDrivers.some((d) => d.shockValue !== 0),
    [customDrivers]
  );

  const shockedSnapshot = useMemo(() => {
    if (!isClient || finStream !== "sale" || !hasDefaultShock) return null;
    return applySaleShocksToSnapshot(saleScenarioSnapshot, scenarioShocks);
  }, [isClient, finStream, hasDefaultShock, saleScenarioSnapshot, scenarioShocks]);

  const shockedSaleEngine = useMemo(() => {
    if (!isClient || finStream !== "sale" || !hasDefaultShock) return null;
    return runSaleScenarioWithShocks(
      saleScenarioSnapshot,
      scenarioShocks,
      saleEngineOpts
    );
  }, [
    isClient,
    finStream,
    hasDefaultShock,
    saleScenarioSnapshot,
    scenarioShocks,
    saleEngineOpts,
  ]);

  const projectCurrentMetrics: ProjectLevelMetrics = useMemo(() => {
    if (!hasDefaultShock) return { ...projectBaseMetrics };
    return saleEngineToProjectMetrics(shockedSaleEngine, projectBaseMetrics);
  }, [hasDefaultShock, projectBaseMetrics, shockedSaleEngine]);

  const equityCurrentMetrics: EquityLevelMetrics = useMemo(() => {
    if (!hasDefaultShock) return { ...equityBaseMetrics };
    return saleEngineToEquityMetrics(shockedSaleEngine, equityBaseMetrics);
  }, [hasDefaultShock, equityBaseMetrics, shockedSaleEngine]);

  const projectMetricsDelta = useMemo(() => {
    const pct = (cur: number, bas: number) => (bas !== 0 ? ((cur - bas) / bas) * 100 : 0);
    return {
      unleveredIRR: projectCurrentMetrics.unleveredIRR - projectBaseMetrics.unleveredIRR,
      peakEquity: projectCurrentMetrics.peakEquity - projectBaseMetrics.peakEquity,
      peakEquityPercent: pct(projectCurrentMetrics.peakEquity, projectBaseMetrics.peakEquity),
      totalDebt: projectCurrentMetrics.totalDebt - projectBaseMetrics.totalDebt,
      totalDebtPercent: pct(projectCurrentMetrics.totalDebt, projectBaseMetrics.totalDebt),
      unleveredEquityMultiple: projectCurrentMetrics.unleveredEquityMultiple - projectBaseMetrics.unleveredEquityMultiple,
      loanRepaymentMonth:
        (projectCurrentMetrics.loanRepaymentMonth ?? -1) -
        (projectBaseMetrics.loanRepaymentMonth ?? -1),
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
      loanRepaymentMonth:
        (equityCurrentMetrics.loanRepaymentMonth ?? -1) -
        (equityBaseMetrics.loanRepaymentMonth ?? -1),
    };
  }, [equityCurrentMetrics, equityBaseMetrics]);

  const allShocksAreZero =
    !hasDefaultShock && !hasCustomShock;

  const formatLoanRepayment = (month: number | null) =>
    month == null || month < 0 ? "—" : `M${month}`;

  const displayedCashFlowColumns = useMemo(() => {
    const baseSchedule = saleScenarioSnapshot.cashInflows.monthlyInflowSchedule;
    const scenSchedule =
      shockedSnapshot?.cashInflows.monthlyInflowSchedule ?? baseSchedule;
    const baseRows = baseSaleEngine?.rows ?? [];
    const scenRows = shockedSaleEngine?.rows ?? [];
    const baseMonthly = baseSaleEngine?.metrics.monthlySalesProceeds;
    const scenMonthly = shockedSaleEngine?.metrics.monthlySalesProceeds;

    return previewColumnMonths.map((mo) => {
      const base =
        baseMonthly != null && mo < baseMonthly.length
          ? baseMonthly[mo]
          : monthlySalesAtMonth(baseSchedule, baseRows, mo);
      const scenario = hasDefaultShock
        ? scenMonthly != null && mo < scenMonthly.length
          ? scenMonthly[mo]
          : monthlySalesAtMonth(scenSchedule, scenRows, mo)
        : base;
      return {
        month: mo,
        base,
        scenario,
        delta: scenario - base,
      };
    });
  }, [
    previewColumnMonths,
    saleScenarioSnapshot.cashInflows.monthlyInflowSchedule,
    shockedSnapshot?.cashInflows.monthlyInflowSchedule,
    baseSaleEngine?.metrics.monthlySalesProceeds,
    baseSaleEngine?.rows,
    shockedSaleEngine?.metrics.monthlySalesProceeds,
    shockedSaleEngine?.rows,
    hasDefaultShock,
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
      ["Financing engine recalc", hasDefaultShock ? "Yes" : "No"],
      ["All shocks at base case", allShocksAreZero ? "Yes" : "No"],
      [],
      ["Default shocks (% or months)"],
      ["Sales price / GDV", scenarioShocks.salesPrice],
      ["Sales velocity", scenarioShocks.salesVelocity],
      ["Pre-sales", scenarioShocks.preSales],
      ["Construction cost", scenarioShocks.constructionCost],
      ["Soft costs + POWC", scenarioShocks.softCosts],
      ["Construction duration", scenarioShocks.constructionDuration],
      ["LTC reduction", scenarioShocks.ltcReduction],
      ["Interest rate (bps)", scenarioShocks.interestRate],
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
        "Loan repayment (month)",
        formatLoanRepayment(projectBaseMetrics.loanRepaymentMonth),
        formatLoanRepayment(projectCurrentMetrics.loanRepaymentMonth),
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
        "Loan repayment (month)",
        formatLoanRepayment(equityBaseMetrics.loanRepaymentMonth),
        formatLoanRepayment(equityCurrentMetrics.loanRepaymentMonth),
      ],
    ];
    return rows;
  }, [
    projectInfo.city,
    projectInfo.country,
    currency,
    hasDefaultShock,
    allShocksAreZero,
    scenarioShocks,
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
    const defaults = defaultDrivers
      .filter((d) => Math.abs(d.shockValue ?? 0) > 1e-9)
      .map((d) => ({
        kind: "default" as const,
        id: d.id,
        name: d.name,
        value: d.shockValue,
        unit: d.unit,
      }));
    const customs = customDrivers
      .filter((d) => Math.abs(d.shockValue ?? 0) > 1e-9)
      .map((d) => ({
        kind: "custom" as const,
        id: d.id,
        name: d.name,
        value: d.shockValue,
        unit: d.unit,
      }));
    return [...defaults, ...customs];
  }, [customDrivers, defaultDrivers]);

  const resetShock = useMemo(() => {
    return (shock: (typeof activeShocks)[number]) => {
      if (shock.kind === "default") {
        setDefaultDriverShock(shock.id, 0);
      } else {
        updateCustomDriver(shock.id, { shockValue: 0 });
      }
    };
  }, [activeShocks, setDefaultDriverShock, updateCustomDriver]);

  const resetAllShocks = useMemo(() => {
    return () => {
      defaultDrivers.forEach((d) => setDefaultDriverShock(d.id, 0));
      customDrivers.forEach((d) => updateCustomDriver(d.id, { shockValue: 0 }));
    };
  }, [customDrivers, defaultDrivers, setDefaultDriverShock, updateCustomDriver]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 pb-32">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-white">
            Preview: Scenario Analysis
          </h1>
          <p className="text-sm text-slate-400">
            Summary of active shocks from Component 6 and projected metrics vs
            base case. Metrics are recalculated through the sale financing engine
            (Component 4 cash-flow model).
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
                          {shock.value > 0 ? "+" : ""}
                          {typeof shock.value === "number" && Number.isFinite(shock.value)
                            ? shock.value.toFixed(2)
                            : "0.00"}
                          {shockUnitLabel(shock.unit as any)}
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
                      sourceComponent="Component 3 — /project-irr"
                      sourceDescription="Unlevered project economics (base from Component 3)."
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
                      label="Peak Equity (proxy)"
                      value={fmtM(projectCurrentMetrics.peakEquity)}
                      delta={`${projectMetricsDelta.peakEquityPercent >= 0 ? "+" : ""}${projectMetricsDelta.peakEquityPercent.toFixed(1)}% vs base`}
                      deltaColor={projectMetricsDelta.peakEquity <= 0 ? "positive" : "negative"}
                      sourceComponent="Component 3 — /project-irr"
                      sourceDescription="Peak funding requirement (used as project-level peak equity proxy)."
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
                      label="Loan Repayment"
                      value={formatLoanRepayment(projectCurrentMetrics.loanRepaymentMonth)}
                      delta={
                        projectMetricsDelta.loanRepaymentMonth === 0
                          ? "Same as base"
                          : `${projectMetricsDelta.loanRepaymentMonth > 0 ? "+" : ""}${projectMetricsDelta.loanRepaymentMonth} mo vs base`
                      }
                      deltaColor={
                        projectMetricsDelta.loanRepaymentMonth <= 0
                          ? "positive"
                          : "negative"
                      }
                      sourceComponent="Component 4 — /financing"
                      sourceDescription="Month when senior construction RCF is fully repaid."
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
                      sourceComponent="Component 5 — /equity-returns"
                      sourceDescription="Levered equity metrics (base from Component 5)."
                    />
                    <MetricWithTooltip
                      label="Levered Equity Multiple"
                      value={`${equityCurrentMetrics.leveredEquityMultiple.toFixed(2)}x`}
                      delta={`${equityMetricsDelta.leveredEquityMultiple >= 0 ? "+" : ""}${equityMetricsDelta.leveredEquityMultiple.toFixed(2)}x vs base`}
                      deltaColor={equityMetricsDelta.leveredEquityMultiple >= 0 ? "positive" : "negative"}
                      sourceComponent="Component 5 — /equity-returns"
                      sourceDescription="Levered equity multiple (base from Component 5)."
                    />
                    <MetricWithTooltip
                      label="Peak Equity (levered)"
                      value={fmtM(equityCurrentMetrics.peakEquity)}
                      delta={`${equityMetricsDelta.peakEquityPercent >= 0 ? "+" : ""}${equityMetricsDelta.peakEquityPercent.toFixed(1)}% vs base`}
                      deltaColor={equityMetricsDelta.peakEquity <= 0 ? "positive" : "negative"}
                      sourceComponent="Component 4 — /financing"
                      sourceDescription="Peak equity required from Component 4 funding stack."
                    />
                    <MetricWithTooltip
                      label="Total Debt (drawn)"
                      value={fmtM(equityCurrentMetrics.totalDebt)}
                      delta={`${equityMetricsDelta.totalDebtPercent >= 0 ? "+" : ""}${equityMetricsDelta.totalDebtPercent.toFixed(1)}% vs base`}
                      deltaColor={equityMetricsDelta.totalDebt <= 0 ? "positive" : "negative"}
                      sourceComponent="Component 4 — /financing"
                      sourceDescription="Actual debt drawn (from monthly funding stack)."
                    />
                    <MetricWithTooltip
                      label="Loan Repayment"
                      value={formatLoanRepayment(equityCurrentMetrics.loanRepaymentMonth)}
                      delta={
                        equityMetricsDelta.loanRepaymentMonth === 0
                          ? "Same as base"
                          : `${equityMetricsDelta.loanRepaymentMonth > 0 ? "+" : ""}${equityMetricsDelta.loanRepaymentMonth} mo vs base`
                      }
                      deltaColor={
                        equityMetricsDelta.loanRepaymentMonth <= 0
                          ? "positive"
                          : "negative"
                      }
                      sourceComponent="Component 4 — /financing"
                      sourceDescription="Month when senior construction RCF is fully repaid."
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
            Sales Cash Flows ({currency} &apos;000)
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Columns match Component 4: monthly through M{stabilizationEndMonth}{" "}
            (construction + 6-month stabilization), then annual checkpoints
            (M{stabilizationEndMonth + 12}, +12, …) to M{totalHoldPeriodMonths}{" "}
            (Step 7 hold).             Base vs scenario monthly sales proceeds from the financing engine
            (after applying Component 6 shocks to inflows, costs, and facility).
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
                label="Peak Equity (proxy)"
                scenarioValue={fmtM(projectCurrentMetrics.peakEquity)}
                baseValue={fmtM(projectBaseMetrics.peakEquity)}
                isBaseCase={allShocksAreZero}
                isPositive={projectMetricsDelta.peakEquity <= 0}
                sourceComponent="Component 3 — /project-irr"
                sourceDescription="Peak funding requirement used as a proxy for project-level peak equity."
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
                label="Loan Repayment"
                scenarioValue={formatLoanRepayment(projectCurrentMetrics.loanRepaymentMonth)}
                baseValue={formatLoanRepayment(projectBaseMetrics.loanRepaymentMonth)}
                isBaseCase={allShocksAreZero}
                isPositive={projectMetricsDelta.loanRepaymentMonth <= 0}
                sourceComponent="Component 4 — /financing"
                sourceDescription="Month when senior construction RCF is fully repaid."
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
                sourceComponent="Component 5 — /equity-returns"
                sourceDescription="Levered equity IRR from Component 5."
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
                sourceComponent="Component 5 — /equity-returns"
                sourceDescription="Levered equity multiple from Component 5."
              />
              <MetricWithTooltip
                label="Peak Equity (levered)"
                scenarioValue={fmtM(equityCurrentMetrics.peakEquity)}
                baseValue={fmtM(equityBaseMetrics.peakEquity)}
                isBaseCase={allShocksAreZero}
                isPositive={equityMetricsDelta.peakEquity <= 0}
                sourceComponent="Component 4 — /financing"
                sourceDescription="Peak equity required from Component 4."
              />
              <MetricWithTooltip
                label="Total Debt (drawn)"
                scenarioValue={fmtM(equityCurrentMetrics.totalDebt)}
                baseValue={fmtM(equityBaseMetrics.totalDebt)}
                isBaseCase={allShocksAreZero}
                isPositive={equityMetricsDelta.totalDebt <= 0}
                sourceComponent="Component 4 — /financing"
                sourceDescription="Actual debt drawn from funding stack (Component 4)."
              />
              <MetricWithTooltip
                label="Loan Repayment"
                scenarioValue={formatLoanRepayment(equityCurrentMetrics.loanRepaymentMonth)}
                baseValue={formatLoanRepayment(equityBaseMetrics.loanRepaymentMonth)}
                isBaseCase={allShocksAreZero}
                isPositive={equityMetricsDelta.loanRepaymentMonth <= 0}
                sourceComponent="Component 4 — /financing"
                sourceDescription="Month when senior construction RCF is fully repaid."
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
