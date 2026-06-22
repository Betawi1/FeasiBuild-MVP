import {
  runOperationalScenarioEngines,
  type OperationalScenarioSnapshot,
} from "@/app/operational/engine/buildOperationalScenarioEngines";
import {
  formatShockDisplay,
  getFactorLabel,
  normalizeAssetType,
  presetShocksForAsset,
} from "@/app/operational/scenario-analysis/config/shockFactors";
import { generateScenarioAnalysisCommentary } from "@/lib/feasibility/generate-scenario-commentary";
import {
  resolveLeveredEquityIrrPctFromFinModelStore,
  resolveUnleveredProjectIrrPct,
} from "@/lib/scenario-irr-calculation";
import useFinModelStore from "@/store/useFinModelStore";
import type {
  FeasibilityProjectBundle,
  ScenarioAnalysisCase,
  ScenarioAnalysisKeyAssumptions,
  ScenarioAnalysisResultsData,
} from "@/types/feasibility";

type ScenarioMetrics = {
  unleveredIrr: number;
  leveredEquityIrr: number;
  leveredPaybackMonths: number;
  equityMultiple: number;
};

function paybackYears(months: number | null | undefined): number {
  if (months == null || !Number.isFinite(months) || months < 0) return 0;
  return Math.round((months / 12) * 10) / 10;
}

function scenarioMetricsFromEngine(
  run: ReturnType<typeof runOperationalScenarioEngines> | null,
  unleveredIrr: number,
  leveredPaybackFallback: number
): ScenarioMetrics {
  if (!run) {
    return {
      unleveredIrr,
      leveredEquityIrr: 0,
      leveredPaybackMonths: leveredPaybackFallback,
      equityMultiple: 0,
    };
  }

  const m = run.metrics;
  return {
    unleveredIrr,
    leveredEquityIrr: m.equityIrrPct,
    leveredPaybackMonths:
      m.equityPaybackMonth != null && m.equityPaybackMonth >= 0
        ? m.equityPaybackMonth
        : leveredPaybackFallback,
    equityMultiple:
      m.equityMultipleFromCF ?? m.equityMultiple ?? 0,
  };
}

function estimateNpv(
  tdc: number,
  gdv: number,
  projectIrr: number,
  baseProjectIrr: number
): number {
  const margin = gdv - tdc;
  if (!Number.isFinite(margin)) return 0;
  if (baseProjectIrr <= 0) return Math.round(margin);
  return Math.round(margin * (projectIrr / baseProjectIrr));
}

function assumptionLabels(assetType: string): {
  revenue: string;
  occupancy: string;
} {
  const key = normalizeAssetType(assetType);
  switch (key) {
    case "retail":
      return { revenue: "Base Rent (psf)", occupancy: "Occupancy Rate" };
    case "office":
      return { revenue: "Base Rent (psf)", occupancy: "Vacancy / Occupancy" };
    case "residential":
      return {
        revenue: "Monthly Rent (psf)",
        occupancy: "Absorption / Occupancy",
      };
    default:
      return { revenue: "Revenue / ADR Growth", occupancy: "Stabilized Occupancy" };
  }
}

function formatRevenueAssumption(
  assetType: string,
  preset: "base" | "downside" | "upside",
  shocks: Record<string, number>,
  bundle: FeasibilityProjectBundle
): string {
  const key = normalizeAssetType(assetType);
  if (preset === "base") {
    if (key === "hotel") return `${bundle.component2.adrInflation}% p.a.`;
    return "Underwriting base case";
  }

  if (key === "hotel") {
    const v = shocks.adr ?? 0;
    return `${v >= 0 ? "+" : ""}${v}% vs base`;
  }
  if (key === "retail" || key === "office") {
    const v = shocks.base_rent_psf ?? 0;
    return `${v >= 0 ? "+" : ""}${v}% vs base`;
  }
  const v = shocks.monthly_rent_psf ?? shocks.rent_escalation ?? 0;
  return `${v >= 0 ? "+" : ""}${v}% vs base`;
}

function buildKeyAssumptions(
  assetType: string,
  preset: "base" | "downside" | "upside",
  bundle: FeasibilityProjectBundle
): ScenarioAnalysisKeyAssumptions {
  const shocks = presetShocksForAsset(assetType, preset);
  const labels = assumptionLabels(assetType);
  const financing = useFinModelStore.getState().operational.financing;
  const baseCap = Number(financing.saleCapRate ?? 7);

  const occupancy =
    preset === "base"
      ? `${bundle.component2.occupancyStabilized}%`
      : `${(shocks.occupancy ?? 0) >= 0 ? "+" : ""}${shocks.occupancy ?? 0}pp vs base`;

  const constructionCost =
    preset === "base"
      ? "Base budget (0%)"
      : `${(shocks.construction_cost ?? 0) >= 0 ? "+" : ""}${shocks.construction_cost ?? 0}%`;

  const capBps = shocks.exit_cap_rate ?? 0;
  const exitCapRate =
    preset === "base"
      ? `${baseCap}%`
      : `${(baseCap + capBps / 100).toFixed(2)}% (${capBps >= 0 ? "+" : ""}${capBps} bps)`;

  return {
    revenueDriver: formatRevenueAssumption(assetType, preset, shocks, bundle),
    occupancyDriver: occupancy,
    constructionCostVariance: constructionCost,
    exitCapRate,
    labels,
  };
}

function buildScenarioCase(
  name: string,
  metrics: ScenarioMetrics,
  bundle: FeasibilityProjectBundle,
  assetType: string,
  preset: "base" | "downside" | "upside",
  baseProjectIrr: number
): ScenarioAnalysisCase {
  return {
    name,
    projectIRR: Math.round(metrics.unleveredIrr * 10) / 10,
    equityIRR: Math.round(metrics.leveredEquityIrr * 10) / 10,
    npv: estimateNpv(
      bundle.aggregate.tdc,
      bundle.aggregate.gdv,
      metrics.unleveredIrr,
      baseProjectIrr
    ),
    paybackPeriod: paybackYears(metrics.leveredPaybackMonths),
    equityMultiple: Math.round(metrics.equityMultiple * 100) / 100,
    keyAssumptions: buildKeyAssumptions(assetType, preset, bundle),
  };
}

function buildSnapshot(): {
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

export function buildScenarioAnalysisResultsData(
  bundle: FeasibilityProjectBundle
): ScenarioAnalysisResultsData {
  const { snapshot, assetType } = buildSnapshot();
  const slice = useFinModelStore.getState().operational;
  const rootProjectIRR = useFinModelStore.getState().projectIRR;

  const engineOpts = {
    isClient: typeof window !== "undefined",
    isDataReady: true,
  };

  const baseRun = runOperationalScenarioEngines(snapshot, "base", engineOpts);
  const downsideRun = runOperationalScenarioEngines(snapshot, "downside", engineOpts);
  const upsideRun = runOperationalScenarioEngines(snapshot, "upside", engineOpts);

  const baseUnleveredIrr =
    resolveUnleveredProjectIrrPct(slice.projectIRR, rootProjectIRR) ?? 0;
  const leveredPaybackFallback =
    slice.equityReturns?.paybackPeriod ??
    slice.financingMetrics?.equityPayback ??
    0;

  const baseMetrics = scenarioMetricsFromEngine(
    baseRun,
    baseUnleveredIrr,
    leveredPaybackFallback
  );
  const downsideMetrics = scenarioMetricsFromEngine(
    downsideRun,
    baseUnleveredIrr * 0.9,
    leveredPaybackFallback
  );
  const upsideMetrics = scenarioMetricsFromEngine(
    upsideRun,
    baseUnleveredIrr * 1.1,
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

  const displayAssetType = bundle.assetType || bundle.segment || "Asset";

  const scenarios: ScenarioAnalysisCase[] = [
    buildScenarioCase(
      "Downside Case",
      downsideMetrics,
      bundle,
      assetType,
      "downside",
      baseMetrics.unleveredIrr
    ),
    buildScenarioCase(
      "Base Case",
      baseMetrics,
      bundle,
      assetType,
      "base",
      baseMetrics.unleveredIrr
    ),
    buildScenarioCase(
      "Upside Case",
      upsideMetrics,
      bundle,
      assetType,
      "upside",
      baseMetrics.unleveredIrr
    ),
  ];

  const data: ScenarioAnalysisResultsData = {
    assetType: displayAssetType,
    currency: bundle.currency,
    location: bundle.location,
    scenarios,
    fallbackCommentary: generateScenarioAnalysisCommentary({
      assetType: displayAssetType,
      location: bundle.location,
      currency: bundle.currency,
      scenarios,
    }),
  };

  return data;
}

export function buildScenarioAnalysisResultsFromBundle(
  bundle: FeasibilityProjectBundle
): ScenarioAnalysisResultsData {
  return buildScenarioAnalysisResultsData(bundle);
}

export function isScenarioAnalysisResultsData(
  data: unknown
): data is ScenarioAnalysisResultsData {
  if (!data || typeof data !== "object") return false;
  const record = data as ScenarioAnalysisResultsData;
  return (
    typeof record.assetType === "string" &&
    Array.isArray(record.scenarios) &&
    record.location != null
  );
}

/** Human-readable shock summary for debugging / optional display. */
export function formatScenarioShockSummary(assetType: string): string[] {
  const downside = presetShocksForAsset(assetType, "downside");
  return Object.entries(downside)
    .filter(([, value]) => value !== 0)
    .map(([factorId, value]) => {
      const label = getFactorLabel(factorId);
      const formatted = formatShockDisplay(factorId, value);
      return `${label} (${formatted})`;
    });
}
