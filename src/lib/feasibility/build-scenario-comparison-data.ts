import {
  runOperationalScenarioEngines,
  type OperationalScenarioSnapshot,
} from "@/app/operational/engine/buildOperationalScenarioEngines";
import {
  formatShockDisplay,
  getAllFactorsForAsset,
  getFactorLabel,
  normalizeAssetType,
  presetShocksForAsset,
  shocksToOperationalInput,
} from "@/app/operational/scenario-analysis/config/shockFactors";
import {
  resolveLeveredEquityIrrPctFromFinModelStore,
  resolveUnleveredProjectIrrPct,
} from "@/lib/scenario-irr-calculation";
import useFinModelStore from "@/store/useFinModelStore";
import type {
  FeasibilityProjectBundle,
  ScenarioComparisonData,
  ScenarioComparisonMetricRow,
} from "@/types/feasibility";

type ScenarioMetrics = {
  unleveredIrr: number;
  unleveredPaybackMonths: number;
  leveredEquityIrr: number;
  leveredPaybackMonths: number;
  peakEquityRequired: number;
  minDscr: number;
};

type ShocksInput = Partial<{
  adr: number;
  occupancy: number;
  constructionCost: number;
  constructionDuration: number;
  interestRate: number;
  operatingExpenses: number;
  exitCapRate: number;
  ffeReserve: number;
}>;

const DEFAULT_HOTEL_DOWNSIDE_SHOCKS = [
  "Construction Cost (+15%)",
  "Construction Duration (+6 months)",
  "Interest Rate (+200 bps)",
  "ADR (-12%)",
  "Occupancy (-8pp)",
  "Operating Expenses (+15%)",
  "Exit Cap Rate (+100 bps)",
  "FF&E Reserve (+2%)",
];

function paybackYears(months: number | null | undefined): number {
  if (months == null || !Number.isFinite(months) || months < 0) return 0;
  return Math.round((months / 12) * 10) / 10;
}

function applyShocks(base: ScenarioMetrics, shocks: ShocksInput): ScenarioMetrics {
  if (Object.values(shocks).every((v) => v === 0 || v === undefined)) {
    return { ...base };
  }

  const s = (v: number | undefined) => v ?? 0;
  const adrMultiplier = 1 + s(shocks.adr) / 100;
  const occMultiplier = 1 + (s(shocks.occupancy) * 1.5) / 100;
  const constructionCostMultiplier = 1 + s(shocks.constructionCost) / 100;
  const operatingExpenseMultiplier = 1 + s(shocks.operatingExpenses) / 100;
  const ffeReserveMultiplier = 1 + (s(shocks.ffeReserve) * 0.75) / 100;
  const durationMultiplier =
    1 + (s(shocks.constructionDuration) * 10) / (12 * 100);
  const interestMultiplier = 1 + (s(shocks.interestRate) * 6) / (300 * 100);
  const exitCapMultiplier = 1 + (s(shocks.exitCapRate) * 8) / (150 * 100);

  const netMultiplier =
    (adrMultiplier * occMultiplier) /
    (constructionCostMultiplier *
      operatingExpenseMultiplier *
      ffeReserveMultiplier *
      durationMultiplier *
      interestMultiplier *
      exitCapMultiplier);

  return {
    ...base,
    unleveredIrr: Math.max(0, Math.min(100, base.unleveredIrr * netMultiplier)),
    leveredEquityIrr: Math.max(
      0,
      Math.min(150, base.leveredEquityIrr * netMultiplier * 1.05)
    ),
    unleveredPaybackMonths: Math.max(
      6,
      Math.round(base.unleveredPaybackMonths / netMultiplier)
    ),
    leveredPaybackMonths: Math.max(
      6,
      Math.round(base.leveredPaybackMonths / (netMultiplier * 1.05))
    ),
    peakEquityRequired: base.peakEquityRequired * constructionCostMultiplier,
    minDscr: Math.max(0.5, Math.min(2.5, base.minDscr * adrMultiplier)),
  };
}

function scenarioMetricsFromEngine(
  run: ReturnType<typeof runOperationalScenarioEngines> | null,
  unleveredIrr: number,
  unleveredPaybackMonths: number,
  leveredPaybackFallback: number
): ScenarioMetrics {
  if (!run) {
    return {
      unleveredIrr,
      unleveredPaybackMonths,
      leveredEquityIrr: 0,
      leveredPaybackMonths: leveredPaybackFallback,
      peakEquityRequired: 0,
      minDscr: 1.25,
    };
  }

  const m = run.metrics;
  const pb =
    m.equityPaybackMonth != null && m.equityPaybackMonth >= 0
      ? m.equityPaybackMonth
      : leveredPaybackFallback;

  return {
    unleveredIrr,
    unleveredPaybackMonths,
    leveredEquityIrr: m.equityIrrPct,
    leveredPaybackMonths: pb,
    peakEquityRequired: m.peakEquityInjected,
    minDscr: m.minDscr,
  };
}

function buildScenarioSnapshot(): {
  snapshot: OperationalScenarioSnapshot;
  assetType: string;
} {
  const state = useFinModelStore.getState();
  const slice = state.operational;
  const assetType = normalizeAssetType(slice.projectInfo?.buildingType);

  return {
    assetType,
    snapshot: {
      cashInflows: state.cashInflows,
      cashOutflows: slice.cashOutflows,
      financing: slice.financing,
      projectInfo: slice.projectInfo,
      hotelHoldSnapshot: slice.hotelHoldSnapshot,
    },
  };
}

function buildDownsideShockLabels(assetType: string): string[] {
  const downside = presetShocksForAsset(assetType, "downside");
  const labels = Object.entries(downside)
    .filter(([, value]) => value !== 0)
    .map(([factorId, value]) => {
      const label = getFactorLabel(factorId);
      const formatted = formatShockDisplay(factorId, value);
      return `${label} (${formatted})`;
    });

  return labels.length > 0 ? labels : DEFAULT_HOTEL_DOWNSIDE_SHOCKS;
}

function buildTornadoData(
  baseMetrics: ScenarioMetrics,
  assetType: string
): ScenarioComparisonData["tornadoData"] {
  const baseIrr = baseMetrics.unleveredIrr;

  return getAllFactorsForAsset(assetType).map((factor) => {
    const lowShocks = { [factor.id]: factor.minShock };
    const highShocks = { [factor.id]: factor.maxShock };
    const lowIrr = applyShocks(
      baseMetrics,
      shocksToOperationalInput(lowShocks, assetType)
    ).unleveredIrr;
    const highIrr = applyShocks(
      baseMetrics,
      shocksToOperationalInput(highShocks, assetType)
    ).unleveredIrr;

    return {
      factor: factor.label,
      low: Math.round((lowIrr - baseIrr) * 10) / 10,
      high: Math.round((highIrr - baseIrr) * 10) / 10,
    };
  });
}

function scenarioCaseMetrics(
  metrics: ScenarioMetrics
): {
  projectIrr: number;
  equityIrr: number;
  equityMultiple: number;
  payback: number;
} {
  return {
    projectIrr: Math.round(metrics.unleveredIrr * 10) / 10,
    equityIrr: Math.round(metrics.leveredEquityIrr * 10) / 10,
    equityMultiple: 0,
    payback: paybackYears(metrics.leveredPaybackMonths),
  };
}

function buildComparisonRows(
  downside: ScenarioMetrics,
  base: ScenarioMetrics,
  upside: ScenarioMetrics,
  downsideRun: ReturnType<typeof runOperationalScenarioEngines> | null,
  baseRun: ReturnType<typeof runOperationalScenarioEngines> | null,
  upsideRun: ReturnType<typeof runOperationalScenarioEngines> | null
): ScenarioComparisonMetricRow[] {
  const d = scenarioCaseMetrics(downside);
  const b = scenarioCaseMetrics(base);
  const u = scenarioCaseMetrics(upside);

  d.equityMultiple =
    Math.round((downsideRun?.metrics.equityMultipleFromCF ?? 0) * 100) / 100;
  b.equityMultiple =
    Math.round(
      (baseRun?.metrics.equityMultipleFromCF ??
        baseRun?.metrics.equityMultiple ??
        0) * 100
    ) / 100;
  u.equityMultiple =
    Math.round((upsideRun?.metrics.equityMultipleFromCF ?? 0) * 100) / 100;

  return [
    {
      metric: "Project IRR",
      downside: d.projectIrr,
      base: b.projectIrr,
      upside: u.projectIrr,
      format: "percent",
    },
    {
      metric: "Equity IRR",
      downside: d.equityIrr,
      base: b.equityIrr,
      upside: u.equityIrr,
      format: "percent",
    },
    {
      metric: "Equity Multiple",
      downside: d.equityMultiple,
      base: b.equityMultiple,
      upside: u.equityMultiple,
      format: "multiple",
    },
    {
      metric: "Payback Period",
      downside: d.payback,
      base: b.payback,
      upside: u.payback,
      format: "years",
    },
  ];
}

export function buildScenarioComparisonData(
  _bundle: FeasibilityProjectBundle
): ScenarioComparisonData {
  const { snapshot, assetType } = buildScenarioSnapshot();
  const slice = useFinModelStore.getState().operational;
  const rootProjectIRR = useFinModelStore.getState().projectIRR;

  const engineOpts = {
    isClient: typeof window !== "undefined",
    isDataReady: true,
  };

  const baseRun = runOperationalScenarioEngines(snapshot, "base", engineOpts);
  const upsideRun = runOperationalScenarioEngines(snapshot, "upside", engineOpts);
  const downsideRun = runOperationalScenarioEngines(snapshot, "downside", engineOpts);

  const baseUnleveredIrr =
    resolveUnleveredProjectIrrPct(slice.projectIRR, rootProjectIRR) ?? 0;
  const baseUnleveredPayback = slice.projectIRR?.unleveredPayback ?? 0;
  const leveredPaybackFallback =
    slice.equityReturns?.paybackPeriod ??
    slice.financingMetrics?.equityPayback ??
    0;

  const baseMetrics = scenarioMetricsFromEngine(
    baseRun,
    baseUnleveredIrr,
    baseUnleveredPayback,
    leveredPaybackFallback
  );
  const downsideMetrics = scenarioMetricsFromEngine(
    downsideRun,
    baseUnleveredIrr * 0.9,
    Math.max(6, Math.round(baseUnleveredPayback * 1.05)),
    leveredPaybackFallback
  );
  const upsideMetrics = scenarioMetricsFromEngine(
    upsideRun,
    baseUnleveredIrr * 1.1,
    Math.max(6, Math.round(baseUnleveredPayback * 0.95)),
    leveredPaybackFallback
  );

  if (baseMetrics.leveredEquityIrr <= 0) {
    const leveredFallback =
      resolveLeveredEquityIrrPctFromFinModelStore({
        financingMetrics: slice.financingMetrics,
        projectIRR: slice.projectIRR,
      }) ?? 0;
    baseMetrics.leveredEquityIrr = leveredFallback;
    if (downsideMetrics.leveredEquityIrr <= 0) {
      downsideMetrics.leveredEquityIrr = leveredFallback * 0.85;
    }
    if (upsideMetrics.leveredEquityIrr <= 0) {
      upsideMetrics.leveredEquityIrr = leveredFallback * 1.15;
    }
  }

  return {
    shocks: buildDownsideShockLabels(assetType),
    comparison: buildComparisonRows(
      downsideMetrics,
      baseMetrics,
      upsideMetrics,
      downsideRun,
      baseRun,
      upsideRun
    ),
    tornadoData: buildTornadoData(baseMetrics, assetType),
  };
}

export function buildScenarioComparisonFromBundle(
  bundle: FeasibilityProjectBundle
): ScenarioComparisonData {
  return buildScenarioComparisonData(bundle);
}

export function isScenarioComparisonData(
  data: unknown
): data is ScenarioComparisonData {
  if (!data || typeof data !== "object") return false;
  const record = data as ScenarioComparisonData;
  return (
    Array.isArray(record.shocks) &&
    Array.isArray(record.comparison) &&
    Array.isArray(record.tornadoData)
  );
}
