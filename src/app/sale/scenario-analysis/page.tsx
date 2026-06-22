"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SearchParamsBoundary from "@/components/SearchParamsBoundary";
import useFinModelStore from "@/store/useFinModelStore";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import {
  CustomDriverModal,
  type CustomDriverData,
} from "@/components/scenario/CustomDriverModal";
import { ShockSlider } from "@/components/scenario/ShockSlider";
import { MetricWithTooltip } from "@/components/scenario/MetricWithTooltip";
import useScenarioStore from "@/store/useScenarioStore";
import type { CustomShockDriver } from "@/types/scenario";
import { useStreamPrefix, withStreamPrefix } from "@/lib/stream-path";
import {
  applySaleScenarioPreset,
  runSaleScenarioEngines,
  runSaleScenarioWithShocks,
  type SaleScenarioSnapshot,
} from "@/app/sale/engine/buildSaleScenarioEngines";
import { solveAnnualIRR } from "@/lib/irr-calculations";
import { buildSaleCashflowDetailProfile } from "@/lib/sale-cash-preview-profile";
import {
  SALE_DEFAULT_DRIVERS,
  SALE_DRIVER_IRR_IMPACT,
  SALE_SCENARIO_SLIDERS,
  isSaleDriverSet,
  saleDriverIrrImpactFactor,
  saleDriversWithShocks,
  shocksFromDefaultDrivers,
  type SaleShockKey,
} from "@/app/sale/scenario/saleScenarioDrivers";

type ScenarioPreset = "base" | "downside" | "upside";

type ScenarioMetrics = {
  unleveredIrr: number;
  unleveredPaybackMonths: number;
  leveredEquityIrr: number;
  leveredPaybackMonths: number;
  peakEquityRequired: number;
  loanRepaymentMonth: number | null;
};

const BASE_METRICS: ScenarioMetrics = {
  unleveredIrr: 14.2,
  unleveredPaybackMonths: 42,
  leveredEquityIrr: 18.5,
  leveredPaybackMonths: 48,
  peakEquityRequired: 12_000_000,
  loanRepaymentMonth: null,
};

const ZERO_DRIVER_SHOCKS: Record<SaleShockKey, number> = Object.fromEntries(
  SALE_SCENARIO_SLIDERS.map(({ key }) => [key, 0])
) as Record<SaleShockKey, number>;

const PRESET_DRIVER_SHOCKS: Record<
  Exclude<ScenarioPreset, "base">,
  Record<SaleShockKey, number>
> = {
  downside: {
    salesPrice: -10,
    salesVelocity: -25,
    preSales: -30,
    constructionCost: 15,
    softCosts: 10,
    constructionDuration: 6,
    ltcReduction: 8,
    interestRate: 150,
  },
  upside: {
    salesPrice: 8,
    salesVelocity: 15,
    preSales: 20,
    constructionCost: -8,
    softCosts: -5,
    constructionDuration: -3,
    ltcReduction: 0,
    interestRate: 0,
  },
};

function shocksFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): Record<SaleShockKey, number> {
  const out = { ...ZERO_DRIVER_SHOCKS };
  for (const { key } of SALE_SCENARIO_SLIDERS) {
    const raw = searchParams.get(key);
    if (raw == null || raw === "") continue;
    const n = parseFloat(raw);
    if (Number.isFinite(n)) out[key] = n;
  }
  return out;
}

function urlHasDriverShocks(searchParams: Pick<URLSearchParams, "get">): boolean {
  return SALE_SCENARIO_SLIDERS.some(({ key }) => {
    const raw = searchParams.get(key);
    if (raw == null || raw === "") return false;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n !== 0;
  });
}

function presetFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): ScenarioPreset {
  const p = searchParams.get("preset");
  return p === "downside" || p === "upside" ? p : "base";
}

function buildShockQueryString(
  shocks: Record<SaleShockKey, number>,
  activePreset: ScenarioPreset,
  existing?: Pick<URLSearchParams, "toString" | "get" | "set" | "delete">
): string {
  const params = new URLSearchParams(existing?.toString() ?? "");
  for (const { key } of SALE_SCENARIO_SLIDERS) {
    const value = shocks[key] ?? 0;
    if (value !== 0 && Number.isFinite(value)) {
      params.set(key, String(value));
    } else {
      params.delete(key);
    }
  }
  if (activePreset === "downside" || activePreset === "upside") {
    params.set("preset", activePreset);
  } else {
    params.delete("preset");
  }
  return params.toString();
}

function formatActiveShockValue(value: number, unit: string): string {
  const sign = value > 0 ? "+" : "";
  if (unit === "bps") return `${sign}${value} bps`;
  if (unit === "months") return `${sign}${value} mo`;
  return `${sign}${value}%`;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

function toPct(maybePctOrDecimal: number | null | undefined): number | null {
  if (maybePctOrDecimal == null || !Number.isFinite(maybePctOrDecimal)) return null;
  // If the value looks like a decimal IRR (0.1145), convert to percent.
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

function irrFactorForImpactType(t: CustomShockDriver["impactType"]): number {
  switch (t) {
    case "revenue":
      return 0.35;
    case "cost":
      return -0.3;
    case "timeline":
      return -0.2;
    case "custom":
      return 0.25;
    default:
      return 0.3;
  }
}

function scenarioMetricsFromSaleEngine(
  run: ReturnType<typeof runSaleScenarioEngines> | null,
  unleveredIrr: number,
  unleveredPaybackMonths: number,
  leveredPaybackFallback: number
): ScenarioMetrics {
  if (!run) {
    return {
      unleveredIrr,
      unleveredPaybackMonths,
      leveredEquityIrr: BASE_METRICS.leveredEquityIrr,
      leveredPaybackMonths: leveredPaybackFallback,
      peakEquityRequired: BASE_METRICS.peakEquityRequired,
      loanRepaymentMonth: BASE_METRICS.loanRepaymentMonth,
    };
  }
  const m = run.metrics;
  const pb =
    m.equityPaybackMonth != null && m.equityPaybackMonth >= 0
      ? m.equityPaybackMonth
      : leveredPaybackFallback;
  return {
    unleveredIrr: m.unleveredIrrPct,
    unleveredPaybackMonths: m.unleveredPaybackMonths,
    leveredEquityIrr: m.equityIrrPct,
    leveredPaybackMonths: pb,
    peakEquityRequired: m.peakEquityInjected,
    loanRepaymentMonth: m.loanRepaymentMonth,
  };
}

function ScenarioAnalysisPageContent() {
  const streamPrefix = useStreamPrefix();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cashInflows = useFinModelStore((s) => s.sale?.cashInflows);
  const cashOutflows = useFinModelStore((s) => s.sale?.cashOutflows);
  const financing = useFinModelStore((s) => s.sale?.financing);
  const projectInfoSlice = useFinModelStore((s) => s.sale?.projectInfo);
  const rootProjectIRR = useFinModelStore((s) => s.projectIRR);
  const saleScenarioBaseCase = useFinModelStore(
    (s) => s.sale?.scenarioAnalysis?.baseCase
  );

  const setDefaultDrivers = useScenarioStore((s) => s.setDefaultDrivers);
  const defaultDrivers = useScenarioStore((s) => s.defaultDrivers);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const st = useFinModelStore.getState();
    // eslint-disable-next-line no-console
    console.log("🔍 COMPONENT 6 STORE INSPECTION:");
    // eslint-disable-next-line no-console
    console.log("Full store.projectIRR (root):", st.projectIRR);
    // eslint-disable-next-line no-console
    console.log("store.projectIRR.unleveredIRR:", st.projectIRR?.unleveredIRR);
    // eslint-disable-next-line no-console
    console.log("store.projectIRR.projectMetrics:", st.projectIRR?.projectMetrics);
    // eslint-disable-next-line no-console
    console.log("Full store.sale.projectIRR:", st.sale?.projectIRR);
    // eslint-disable-next-line no-console
    console.log("store.sale.projectIRR.unleveredIRR:", st.sale?.projectIRR?.unleveredIRR);
    // eslint-disable-next-line no-console
    console.log(
      "store.sale.projectIRR.projectMetrics:",
      st.sale?.projectIRR?.projectMetrics
    );
    // eslint-disable-next-line no-console
    console.log("store.sale.scenarioAnalysis.baseCase:", st.sale?.scenarioAnalysis?.baseCase);

    // eslint-disable-next-line no-console
    console.log("🎯 Looking for 23% (0.23 or 23):");
    // eslint-disable-next-line no-console
    console.log("- root projectIRR.unleveredIRR === 0.23:", st.projectIRR?.unleveredIRR === 0.23);
    // eslint-disable-next-line no-console
    console.log("- root projectIRR.unleveredIRR === 23:", st.projectIRR?.unleveredIRR === 23);
    // eslint-disable-next-line no-console
    console.log(
      "- sale projectIRR.unleveredIRR === 0.23:",
      st.sale?.projectIRR?.unleveredIRR === 0.23
    );
    // eslint-disable-next-line no-console
    console.log(
      "- sale projectIRR.unleveredIRR === 23:",
      st.sale?.projectIRR?.unleveredIRR === 23
    );
    // eslint-disable-next-line no-console
    console.log(
      "- sale projectMetrics.unleveredIRR === 0.23:",
      st.sale?.projectIRR?.projectMetrics?.unleveredIRR === 0.23
    );

    const component3IRR = st.sale?.projectIRR?.unleveredIRR ?? st.projectIRR?.unleveredIRR;
    // eslint-disable-next-line no-console
    console.log("✅ Component 3 Unlevered IRR in store (expect ~14.94%):", component3IRR);
  }, []);

  const baseInputs = useMemo(
    () => ({
      cashInflows: cashInflows ?? {},
      cashOutflows: cashOutflows ?? {},
      financing: financing ?? {},
      projectInfo: projectInfoSlice ?? {},
    }),
    [cashInflows, cashOutflows, financing, projectInfoSlice]
  );

  const saleProjectIRR = useFinModelStore((s) => s.sale?.projectIRR);
  const saleMetrics = saleProjectIRR?.projectMetrics;

  const projectInfo = baseInputs.projectInfo;

  /** Same pipeline as `/sale/preview/project-irr` when store unlevered IRR is missing. */
  const previewUnleveredIrrPct = useMemo(() => {
    const co = cashOutflows;
    const ci = cashInflows;
    if (!co || !ci) return null;
    const constructionPeriod = co.constructionPeriod || 30;
    const totalMonths = constructionPeriod + 6;
    const detail = buildSaleCashflowDetailProfile(co, projectInfo);
    const inflowByMonth = new Map<number, number>();
    for (const p of ci.monthlyInflowSchedule || []) {
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
  }, [cashOutflows, cashInflows, projectInfo]);

  const unleveredFromStore = firstValidIrrPct(
    saleProjectIRR?.unleveredIRR,
    saleMetrics?.unleveredIRR,
    rootProjectIRR?.unleveredIRR,
    rootProjectIRR?.projectMetrics?.unleveredIRR,
    saleScenarioBaseCase?.unleveredIrr
  );

  /** Prefer live preview pipeline (Component 3) — store may hold stale ~23% from `calculateProjectIRR`. */
  const unleveredProjectIRR =
    previewUnleveredIrrPct ??
    unleveredFromStore ??
    BASE_METRICS.unleveredIrr;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("📊 Extracted Unlevered IRR:", unleveredProjectIRR, `( ${unleveredProjectIRR.toFixed(2)}% )`, {
      source: previewUnleveredIrrPct != null ? "previewPipeline" : unleveredFromStore != null ? "store" : "BASE_METRICS",
      previewUnleveredIrrPct,
      unleveredFromStore,
      saleRaw: saleProjectIRR?.unleveredIRR,
      rootRaw: rootProjectIRR?.unleveredIRR,
    });
  }, [unleveredProjectIRR, previewUnleveredIrrPct, unleveredFromStore, saleProjectIRR?.unleveredIRR, rootProjectIRR?.unleveredIRR]);

  const leveredEquityIRR =
    toPct(saleMetrics?.leveredEquityIRR) ?? BASE_METRICS.leveredEquityIrr;

  const peakEquity =
    saleMetrics?.peakEquityInjected ??
    saleMetrics?.totalEquityInvested ??
    BASE_METRICS.peakEquityRequired;

  const storedEquityPaybackMonth =
    saleMetrics?.equityPaybackMonth != null && saleMetrics.equityPaybackMonth >= 0
      ? saleMetrics.equityPaybackMonth
      : null;

  useEffect(() => {
    const drivers = useScenarioStore.getState().defaultDrivers;
    if (!isSaleDriverSet(drivers)) {
      setDefaultDrivers(SALE_DEFAULT_DRIVERS);
    }
  }, [setDefaultDrivers]);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const customDrivers = useScenarioStore((s) => s.customDrivers);
  const addCustomDriver = useScenarioStore((s) => s.addCustomDriver);
  const updateCustomDriver = useScenarioStore((s) => s.updateCustomDriver);
  const removeCustomDriver = useScenarioStore((s) => s.removeCustomDriver);

  const [customFactorModalOpen, setCustomFactorModalOpen] = useState(false);

  const handleAddCustomDriver = useCallback(
    (data: CustomDriverData) => {
      if (useScenarioStore.getState().customDrivers.length >= 3) {
        return false;
      }
      addCustomDriver({
        name: data.name.trim(),
        baseValue: data.baseValue,
        shockValue: 0,
        minShock: data.minShock,
        maxShock: data.maxShock,
        step: data.step,
        unit: data.unit,
        impactType: data.impactType,
      });
      return true;
    },
    [addCustomDriver]
  );

  const handleRemoveCustomDriver = useCallback(
    (id: string) => {
      removeCustomDriver(id);
    },
    [removeCustomDriver]
  );

  const [preset, setPreset] = useState<ScenarioPreset>(() =>
    presetFromSearchParams(searchParams)
  );
  const [driverShocks, setDriverShocks] = useState<Record<SaleShockKey, number>>(
    () => shocksFromSearchParams(searchParams)
  );
  const didHydrateFromStore = useRef(false);
  const pendingUrlPush = useRef<string | null>(null);

  const shockUrlState = useMemo(
    () => ({ shocks: driverShocks, preset }),
    [driverShocks, preset]
  );
  const debouncedShockUrlState = useDebounce(shockUrlState, 300);

  const updateDriverShocks = useCallback(
    (
      updater:
        | Record<SaleShockKey, number>
        | ((prev: Record<SaleShockKey, number>) => Record<SaleShockKey, number>),
      nextPreset?: ScenarioPreset
    ) => {
      setDriverShocks((prev) =>
        typeof updater === "function" ? updater(prev) : updater
      );
      if (nextPreset !== undefined) setPreset(nextPreset);
    },
    []
  );

  // Hydrate state from URL on back/forward (skip updates we just pushed)
  useEffect(() => {
    const currentQs = searchParams.toString();
    if (pendingUrlPush.current !== null) {
      if (currentQs === pendingUrlPush.current) {
        pendingUrlPush.current = null;
      }
      return;
    }
    const fromUrl = shocksFromSearchParams(searchParams);
    const urlPreset = presetFromSearchParams(searchParams);
    const urlQs = buildShockQueryString(fromUrl, urlPreset);
    const stateQs = buildShockQueryString(driverShocks, preset);
    if (urlQs === stateQs) return;
    setDriverShocks(fromUrl);
    setPreset(urlPreset);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from URL only when searchParams change
  }, [searchParams]);

  // Push all 8 driver shocks to URL after render (debounced while sliding)
  useEffect(() => {
    const nextQs = buildShockQueryString(
      debouncedShockUrlState.shocks,
      debouncedShockUrlState.preset,
      searchParams
    );
    if (nextQs === searchParams.toString()) return;
    pendingUrlPush.current = nextQs;
    router.replace(nextQs ? `${pathname}?${nextQs}` : pathname, { scroll: false });
  }, [debouncedShockUrlState, pathname, router, searchParams]);

  useEffect(() => {
    if (didHydrateFromStore.current) return;
    didHydrateFromStore.current = true;
    if (urlHasDriverShocks(searchParams)) return;
    const fromStore = shocksFromDefaultDrivers(
      useScenarioStore.getState().defaultDrivers
    );
    if (!Object.values(fromStore).some((v) => v !== 0)) return;
    setDriverShocks(fromStore);
    setPreset("base");
  }, [searchParams]);

  // Keep scenario store aligned with all 8 sale drivers (preview Active Shocks reads this)
  useEffect(() => {
    setDefaultDrivers(saleDriversWithShocks(driverShocks));
  }, [driverShocks, setDefaultDrivers]);

  const activeShocks = useMemo(() => {
    return SALE_SCENARIO_SLIDERS.filter(({ key }) => {
      const value = driverShocks[key];
      return typeof value === "number" && Number.isFinite(value) && Math.abs(value) > 1e-9;
    }).map(({ key, label, unit }) => ({
      id: key,
      label,
      unit,
      value: driverShocks[key],
    }));
  }, [driverShocks]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("🔍 Shock State Debug:", {
      allShocks: driverShocks,
      activeShocks: Object.entries(driverShocks).filter(([, v]) => v !== 0),
      urlParams: Object.fromEntries(searchParams.entries()),
      storeDrivers: defaultDrivers.map((d) => ({ id: d.id, shockValue: d.shockValue })),
    });
  }, [driverShocks, searchParams, defaultDrivers]);

  const scenarioSnapshot: SaleScenarioSnapshot = useMemo(
    () => ({
      cashInflows: baseInputs.cashInflows,
      cashOutflows: baseInputs.cashOutflows,
      financing: baseInputs.financing,
      projectInfo: baseInputs.projectInfo,
    }),
    [baseInputs]
  );

  const engineOpts = useMemo(
    () => ({
      unleveredIrrPct: unleveredProjectIRR,
      unleveredPaybackMonths:
        saleProjectIRR?.unleveredPayback ?? BASE_METRICS.unleveredPaybackMonths,
    }),
    [unleveredProjectIRR, saleProjectIRR?.unleveredPayback]
  );

  const baseEngine = useMemo(
    () => (isClient ? runSaleScenarioEngines(scenarioSnapshot, engineOpts) : null),
    [isClient, scenarioSnapshot, engineOpts]
  );
  const upsideEngine = useMemo(
    () =>
      isClient
        ? runSaleScenarioEngines(applySaleScenarioPreset(scenarioSnapshot, "upside"), engineOpts)
        : null,
    [isClient, scenarioSnapshot, engineOpts]
  );
  const downsideEngine = useMemo(
    () =>
      isClient
        ? runSaleScenarioEngines(applySaleScenarioPreset(scenarioSnapshot, "downside"), engineOpts)
        : null,
    [isClient, scenarioSnapshot, engineOpts]
  );

  const baseUnleveredIrr = unleveredProjectIRR;
  const baseUnleveredPayback = engineOpts.unleveredPaybackMonths;
  const leveredPaybackFallback =
    storedEquityPaybackMonth ?? BASE_METRICS.leveredPaybackMonths;

  const baseMetrics: ScenarioMetrics = useMemo(() => {
    const fromEngine = scenarioMetricsFromSaleEngine(
      baseEngine,
      baseUnleveredIrr,
      baseUnleveredPayback,
      leveredPaybackFallback
    );
    return {
      unleveredIrr: unleveredProjectIRR,
      unleveredPaybackMonths: baseUnleveredPayback,
      leveredEquityIrr: leveredEquityIRR,
      leveredPaybackMonths:
        storedEquityPaybackMonth ?? fromEngine.leveredPaybackMonths,
      peakEquityRequired: peakEquity,
      loanRepaymentMonth:
        fromEngine.loanRepaymentMonth ?? BASE_METRICS.loanRepaymentMonth,
    };
  }, [
    baseEngine,
    baseUnleveredIrr,
    baseUnleveredPayback,
    leveredPaybackFallback,
    unleveredProjectIRR,
    leveredEquityIRR,
    peakEquity,
    storedEquityPaybackMonth,
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("📊 Component 6 Metrics Check:", {
      storeUnlevered: saleProjectIRR?.unleveredIRR,
      storeLevered: saleMetrics?.leveredEquityIRR,
      previewUnlevered: previewUnleveredIrrPct,
      extractedUnlevered: unleveredProjectIRR,
      extractedLevered: leveredEquityIRR,
      peakEquity,
    });
  }, [
    saleProjectIRR?.unleveredIRR,
    saleMetrics?.leveredEquityIRR,
    previewUnleveredIrrPct,
    unleveredProjectIRR,
    leveredEquityIRR,
    peakEquity,
  ]);

  const downsideMetrics = useMemo(
    () =>
      scenarioMetricsFromSaleEngine(
        downsideEngine,
        baseUnleveredIrr,
        baseUnleveredPayback,
        leveredPaybackFallback
      ),
    [downsideEngine, baseUnleveredIrr, baseUnleveredPayback, leveredPaybackFallback]
  );

  const upsideMetrics = useMemo(
    () =>
      scenarioMetricsFromSaleEngine(
        upsideEngine,
        baseUnleveredIrr,
        baseUnleveredPayback,
        leveredPaybackFallback
      ),
    [upsideEngine, baseUnleveredIrr, baseUnleveredPayback, leveredPaybackFallback]
  );

  const applyPreset = (p: ScenarioPreset) => {
    if (p === "base") {
      updateDriverShocks(shocksFromDefaultDrivers(SALE_DEFAULT_DRIVERS), "base");
    } else {
      updateDriverShocks(PRESET_DRIVER_SHOCKS[p], p);
    }
  };

  const handleResetAllToBase = useCallback(() => {
    updateDriverShocks(shocksFromDefaultDrivers(SALE_DEFAULT_DRIVERS), "base");
    useScenarioStore.getState().customDrivers.forEach((d) => {
      updateCustomDriver(d.id, { shockValue: 0 });
    });
  }, [updateCustomDriver, updateDriverShocks]);

  const currentMetrics = useMemo(() => {
    const hasShocks = Object.values(driverShocks).some((v) => v !== 0);
    if (!hasShocks || !isClient) return { ...baseMetrics };
    const run = runSaleScenarioWithShocks(
      scenarioSnapshot,
      driverShocks,
      engineOpts
    );
    return scenarioMetricsFromSaleEngine(
      run,
      unleveredProjectIRR,
      baseUnleveredPayback,
      leveredPaybackFallback
    );
  }, [
    baseMetrics,
    driverShocks,
    isClient,
    scenarioSnapshot,
    engineOpts,
    baseUnleveredIrr,
    baseUnleveredPayback,
    leveredPaybackFallback,
  ]);

  const tornadoData = useMemo(() => {
    const baseIrr = currentMetrics.leveredEquityIrr;
    const mk = (name: string, delta: number) => ({
      driver: name,
      lowIrr: baseIrr + Math.min(0, delta),
      highIrr: baseIrr + Math.max(0, delta),
    });
    return SALE_SCENARIO_SLIDERS.map((d) =>
      mk(d.label, SALE_DRIVER_IRR_IMPACT[d.key])
    );
  }, [currentMetrics.leveredEquityIrr]);

  const downsideWarning =
    downsideMetrics.leveredEquityIrr < 12
      ? "Warning: Downside Equity IRR is below 12%. Project may be unfinanceable in a stress case."
      : null;
  const upsideSuccess =
    upsideMetrics.leveredEquityIrr >= 25
      ? "Upside Equity IRR is 25% or higher. Project has strong upside potential."
      : null;

  const handleDownloadSpreadsheet = () => {
    alert("Spreadsheet generation will create a formula-driven Google Sheet with scenario tables.");
  };

  const onValueChange = useCallback(
    (driverId: string, value: number) => {
      updateDriverShocks(
        (prev) => ({ ...prev, [driverId as SaleShockKey]: value }),
        "base"
      );
    },
    [updateDriverShocks]
  );

  const onReset = useCallback(
    (driverId: string) => {
      updateDriverShocks((prev) => ({ ...prev, [driverId as SaleShockKey]: 0 }), "base");
    },
    [updateDriverShocks]
  );

  const formatCurrency = (n: number) =>
    (n / 1_000_000).toFixed(1) + "M";

  const formatLoanRepayment = (m: number | null) =>
    m == null || m < 0 ? "—" : `M${m}`;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 pb-32">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              FinModel App — Component 6
            </h1>
            <p className="text-slate-400">
              Scenario Analysis — stress-test key drivers from Components 1–5.
            </p>
          </div>
        </div>

        {/* Base case summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">
            Base Case Metric Sources (by component)
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Location: {projectInfo.city || "—"},{" "}
            {projectInfo.country || "—"} · Currency: {projectInfo.currency} ·
            Building type: {projectInfo.buildingType}.
            Base case metrics: unlevered IRR from Component 3 (Project IRR
            preview), levered equity IRR and peak equity from Component 4
            financing preview (`sale.projectIRR.projectMetrics`).
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <MetricWithTooltip
              label="Unlevered Project IRR"
              value={`${baseMetrics.unleveredIrr.toFixed(2)}%`}
              sourceComponent="Component 3 — /project-irr"
              sourceDescription="Calculated from Components 1–2 monthly cash flows (unlevered baseline)."
            />
            <MetricWithTooltip
              label="Levered Equity IRR"
              value={`${baseMetrics.leveredEquityIrr.toFixed(2)}%`}
              sourceComponent="Component 4 — /preview/financing"
              sourceDescription="Levered equity IRR from the sale financing engine (`projectMetrics.leveredEquityIRR`)."
            />
            <MetricWithTooltip
              label="Peak Equity"
              value={formatCurrency(baseMetrics.peakEquityRequired)}
              sourceComponent="Component 4 — /preview/financing"
              sourceDescription="Peak equity injected from financing engine (`projectMetrics.peakEquityInjected`)."
            />
            <MetricWithTooltip
              label="Loan Repayment"
              value={formatLoanRepayment(baseMetrics.loanRepaymentMonth)}
              sourceComponent="Component 4 — /financing"
              sourceDescription="Month when construction RCF is fully repaid (financing engine)."
            />
          </div>
        </div>

        {/* Scenario presets */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">
            Scenario Presets
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset("base")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                preset === "base"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600"
              }`}
            >
              Base Case
            </button>
            <button
              type="button"
              onClick={() => applyPreset("downside")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                preset === "downside"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600"
              }`}
            >
              Downside
            </button>
            <button
              type="button"
              onClick={() => applyPreset("upside")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                preset === "upside"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600"
              }`}
            >
              Upside
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Base Case = current assumptions. Downside / Upside = one-touch sale shocks across pricing, velocity, costs, duration, LTC, and rates.
          </p>
        </div>

        {/* Active shocks summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Active Shocks</h2>
          <p className="text-sm text-slate-400 mb-3">
            Active Shocks ({activeShocks.length})
          </p>
          {activeShocks.length === 0 ? (
            <p className="text-sm italic text-slate-500">
              No active shocks (all at base case)
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SALE_SCENARIO_SLIDERS.map(({ key, label, unit }) => {
                const value = driverShocks[key];
                if (
                  value === 0 ||
                  value === undefined ||
                  !Number.isFinite(value) ||
                  Math.abs(value) < 1e-9
                ) {
                  return null;
                }
                return (
                  <div
                    key={key}
                    className="rounded-lg border border-slate-700 bg-slate-800/50 p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">{label}</span>
                      <button
                        type="button"
                        onClick={() => onReset(key)}
                        className="text-[10px] text-slate-500 hover:text-white"
                      >
                        × Reset
                      </button>
                    </div>
                    <p
                      className={`mt-1 text-sm font-bold ${
                        value > 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {formatActiveShockValue(value, unit)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Key drivers with sliders */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {/* Global Reset All Button */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">
              Adjust Shock Values
            </h2>
            <button
              type="button"
              onClick={handleResetAllToBase}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-800 hover:text-white transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reset All to Base
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SALE_SCENARIO_SLIDERS.map(({ key, label, min, max, step, unit }) => {
              const value =
                typeof driverShocks[key] === "number" &&
                Number.isFinite(driverShocks[key])
                  ? driverShocks[key]
                  : 0;
              return (
                <ShockSlider
                  key={key}
                  driverName={label}
                  driverId={key}
                  currentValue={value}
                  minValue={min}
                  maxValue={max}
                  step={step}
                  unit={unit}
                  baseIrr={baseMetrics.unleveredIrr}
                  baseLeveredIrr={baseMetrics.leveredEquityIrr}
                  irrImpactFactor={saleDriverIrrImpactFactor(key)}
                  onValueChange={onValueChange}
                  onReset={onReset}
                />
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-6">
            <p className="text-sm text-slate-400">
              Custom factors ({customDrivers.length}/3)
            </p>
            <button
              type="button"
              onClick={() => setCustomFactorModalOpen(true)}
              disabled={customDrivers.length >= 3}
              className="rounded-lg border border-emerald-600/60 bg-emerald-600/15 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Add Custom Factor
            </button>
          </div>

          {/* Custom Drivers Section */}
          {customDrivers.length > 0 ? (
            <div className="mb-8 mt-6 border-t border-slate-800 pt-6">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Custom Drivers
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {customDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="relative rounded-xl border border-slate-700 bg-slate-900/50 p-5"
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomDriver(driver.id)}
                      className="absolute right-4 top-4 p-1 text-slate-500 transition-colors hover:text-red-400"
                      title="Remove driver"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>

                    <h3 className="mb-3 pr-10 text-sm font-semibold text-slate-200">
                      {driver.name}
                    </h3>

                    <ShockSlider
                      embedded
                      showDriverTitle={false}
                      driverName={driver.name}
                      driverId={driver.id}
                      currentValue={driver.shockValue}
                      minValue={driver.minShock}
                      maxValue={driver.maxShock}
                      step={driver.step}
                      unit={driver.unit}
                      baseIrr={baseMetrics.unleveredIrr}
                      baseLeveredIrr={baseMetrics.leveredEquityIrr}
                      irrImpactFactor={irrFactorForImpactType(driver.impactType)}
                      onValueChange={(id, value) =>
                        updateCustomDriver(id, { shockValue: value })
                      }
                      onReset={(id) => updateCustomDriver(id, { shockValue: 0 })}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <CustomDriverModal
          isOpen={customFactorModalOpen}
          onClose={() => setCustomFactorModalOpen(false)}
          onAddDriver={handleAddCustomDriver}
          existingCustomDriversCount={customDrivers.length}
        />

        {/* Side-by-side comparison table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 overflow-x-auto">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">
            Scenario Comparison
          </h2>
          <table className="min-w-full text-sm text-slate-200">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 pr-4 font-medium text-slate-400">METRIC</th>
                <th className="text-right py-2 px-3 font-medium text-slate-400">BASE</th>
                <th className="text-right py-2 px-3 font-medium text-slate-400">CURRENT</th>
                <th className="text-right py-2 px-3 font-medium text-slate-400">DOWNSIDE</th>
                <th className="text-right py-2 px-3 font-medium text-slate-400">UPSIDE</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">Unlevered Project IRR</td>
                <td className="text-right py-2 px-3 text-emerald-400">{baseMetrics.unleveredIrr.toFixed(2)}%</td>
                <td className="text-right py-2 px-3 text-slate-200">{currentMetrics.unleveredIrr.toFixed(2)}%</td>
                <td className="text-right py-2 px-3 text-rose-400">{downsideMetrics.unleveredIrr.toFixed(2)}%</td>
                <td className="text-right py-2 px-3 text-emerald-400">{upsideMetrics.unleveredIrr.toFixed(2)}%</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">Unlevered Payback (months)</td>
                <td className="text-right py-2 px-3">{baseMetrics.unleveredPaybackMonths}</td>
                <td className="text-right py-2 px-3">{currentMetrics.unleveredPaybackMonths}</td>
                <td className="text-right py-2 px-3">{downsideMetrics.unleveredPaybackMonths}</td>
                <td className="text-right py-2 px-3">{upsideMetrics.unleveredPaybackMonths}</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">Levered Equity IRR</td>
                <td className="text-right py-2 px-3 text-emerald-400">{baseMetrics.leveredEquityIrr.toFixed(2)}%</td>
                <td className="text-right py-2 px-3 text-slate-200">{currentMetrics.leveredEquityIrr.toFixed(2)}%</td>
                <td className="text-right py-2 px-3 text-rose-400">{downsideMetrics.leveredEquityIrr.toFixed(2)}%</td>
                <td className="text-right py-2 px-3 text-emerald-400">{upsideMetrics.leveredEquityIrr.toFixed(2)}%</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">Levered Payback (months)</td>
                <td className="text-right py-2 px-3">{baseMetrics.leveredPaybackMonths}</td>
                <td className="text-right py-2 px-3">{currentMetrics.leveredPaybackMonths}</td>
                <td className="text-right py-2 px-3">{downsideMetrics.leveredPaybackMonths}</td>
                <td className="text-right py-2 px-3">{upsideMetrics.leveredPaybackMonths}</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">Peak Equity Required</td>
                <td className="text-right py-2 px-3">{formatCurrency(baseMetrics.peakEquityRequired)}</td>
                <td className="text-right py-2 px-3">{formatCurrency(currentMetrics.peakEquityRequired)}</td>
                <td className="text-right py-2 px-3">{formatCurrency(downsideMetrics.peakEquityRequired)}</td>
                <td className="text-right py-2 px-3">{formatCurrency(upsideMetrics.peakEquityRequired)}</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">Loan Repayment (month)</td>
                <td className="text-right py-2 px-3">{formatLoanRepayment(baseMetrics.loanRepaymentMonth)}</td>
                <td className="text-right py-2 px-3">{formatLoanRepayment(currentMetrics.loanRepaymentMonth)}</td>
                <td className="text-right py-2 px-3">{formatLoanRepayment(downsideMetrics.loanRepaymentMonth)}</td>
                <td className="text-right py-2 px-3">{formatLoanRepayment(upsideMetrics.loanRepaymentMonth)}</td>
              </tr>
            </tbody>
          </table>
          {downsideWarning && (
            <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              {downsideWarning}
            </div>
          )}
          {upsideSuccess && (
            <div className="mt-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
              {upsideSuccess}
            </div>
          )}
        </div>

        {/* Tornado chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">
            IRR Sensitivity by Driver (Tornado Chart)
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Impact on Levered Equity IRR when each driver moves from low to high (one at a time).
          </p>
          {(() => {
            const irrMin = 10;
            const irrMax = 26;
            const scale = (irr: number) => ((irr - irrMin) / (irrMax - irrMin)) * 100;
            return (
              <div className="space-y-4 max-w-2xl">
                {tornadoData.map((row) => {
                  const minIrr = Math.min(row.lowIrr, row.highIrr);
                  const maxIrr = Math.max(row.lowIrr, row.highIrr);
                  const left = scale(minIrr);
                  const width = scale(maxIrr) - scale(minIrr);
                  const isPositive = row.highIrr > row.lowIrr;
                  return (
                    <div key={row.driver} className="flex items-center gap-4">
                      <p className="text-xs text-slate-400 w-48 shrink-0">{row.driver}</p>
                      <div className="flex-1 h-7 bg-slate-800 rounded overflow-hidden relative">
                        <div
                          className={`absolute top-0 h-full rounded ${isPositive ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{
                            left: `${Math.max(0, left)}%`,
                            width: `${Math.max(2, width)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 w-24 text-right shrink-0">
                        {minIrr.toFixed(2)}% – {maxIrr.toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
                <p className="text-[10px] text-slate-500">
                  Axis: Levered Equity IRR from {irrMin}% to {irrMax}%.
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      <PreviewFloatingBar
        previousRoute={withStreamPrefix(streamPrefix, "/equity-returns")}
        nextRoute={withStreamPrefix(streamPrefix, "/preview/scenario-analysis")}
        showDownload={false}
        nextLabel="Generate Model →"
      />
    </div>
  );
}

export default function ScenarioAnalysisPage() {
  return (
    <SearchParamsBoundary>
      <ScenarioAnalysisPageContent />
    </SearchParamsBoundary>
  );
}
