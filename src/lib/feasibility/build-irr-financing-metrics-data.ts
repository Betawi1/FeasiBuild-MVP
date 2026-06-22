import { calculateOperationalLeveredModel } from "@/app/operational/engine/c4.levered.engine";
import { buildOperationalLeveredEngineArgs } from "@/app/operational/engine/buildOperationalScenarioEngines";
import { generateIrrFinancingMetricsCommentary } from "@/lib/feasibility/generate-financial-commentary";
import useFinModelStore from "@/store/useFinModelStore";
import type {
  FeasibilityProjectBundle,
  IrrAndFinancingMetricsData,
} from "@/types/feasibility";

function computeMinDscrFromEngine(): number {
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
  const dscrVals = (c4.monthlyData ?? [])
    .map((row: { dscr?: number | null }) => row.dscr)
    .filter((d): d is number => typeof d === "number" && d > 0);

  if (dscrVals.length > 0) {
    return Math.round(Math.min(...dscrVals) * 100) / 100;
  }

  const covenantTarget = slice.financing.dscrTarget ?? 1.2;
  return Math.round(covenantTarget * 100) / 100;
}

function resolveMinDscr(bundle: FeasibilityProjectBundle): number {
  const fromPrefSlide = bundle.preferenceSharesExitStrategy?.dscrByYear;
  if (fromPrefSlide?.length) {
    const vals = fromPrefSlide.map((row) => row.dscr).filter((d) => d > 0);
    if (vals.length > 0) {
      return Math.round(Math.min(...vals) * 100) / 100;
    }
  }
  return computeMinDscrFromEngine();
}

export function buildIrrAndFinancingMetricsData(
  bundle: FeasibilityProjectBundle
): IrrAndFinancingMetricsData {
  const c4 = bundle.component4;
  const projectIrr = c4.projectIRR ?? bundle.aggregate.projectIrr ?? 0;
  const equityIrr = c4.equityIRR ?? bundle.aggregate.equityIrr ?? 0;
  const equityMultiple = c4.equityMultiple ?? 0;
  const paybackPeriod = c4.paybackPeriod ?? bundle.aggregate.paybackYears ?? 0;
  const minDscr = resolveMinDscr(bundle);
  const tdc = c4.tdc ?? bundle.aggregate.tdc ?? 0;
  const loanAtCompletion = c4.loanAtCompletion ?? c4.approvedDebt ?? 0;

  const metrics = {
    projectIrr,
    equityIrr,
    equityMultiple,
    paybackPeriod,
    minDscr,
  };

  return {
    currency: bundle.currency,
    projectIrr,
    equityIrr,
    equityMultiple,
    paybackPeriod,
    minDscr,
    tdc,
    loanAtCompletion,
    commentary: generateIrrFinancingMetricsCommentary(metrics),
  };
}

export function buildIrrAndFinancingMetricsFromBundle(
  bundle: FeasibilityProjectBundle
): IrrAndFinancingMetricsData {
  return buildIrrAndFinancingMetricsData(bundle);
}

export function isIrrAndFinancingMetricsData(
  data: unknown
): data is IrrAndFinancingMetricsData {
  if (!data || typeof data !== "object") return false;
  const record = data as IrrAndFinancingMetricsData;
  return (
    typeof record.currency === "string" &&
    typeof record.projectIrr === "number" &&
    typeof record.commentary === "string"
  );
}

/** Prompt for Qwen AI commentary (used by `/api/feasibility/generate-financials`). */
export function buildIrrFinancingMetricsAiPrompt(
  project: FeasibilityProjectBundle,
  metrics: {
    projectIrr: number;
    equityIrr: number;
    equityMultiple: number;
    paybackPeriod: number;
    minDscr: number;
  }
): string {
  const loc = `${project.location.city}, ${project.location.country}`;
  return `
You are a senior real estate financial analyst. Write a professional, 1-paragraph commentary for a feasibility study slide titled "IRR and Key Financing Metrics".

PROJECT: ${project.assetType} (${project.segment}) in ${loc}
CURRENCY: ${project.currency}

USE THESE EXACT METRICS:
- Unlevered Project IRR: ${metrics.projectIrr}%
- Levered Equity IRR: ${metrics.equityIrr}%
- Equity Multiple: ${metrics.equityMultiple}x
- Payback Period: ${metrics.paybackPeriod} years
- Minimum DSCR: ${metrics.minDscr}x
- TDC: ${project.component4.tdc} ${project.currency}
- Loan at Completion: ${project.component4.loanAtCompletion} ${project.currency}

RULES:
1. NO PLACEHOLDERS. Use the exact numbers provided.
2. Highlight the leverage effect (the spread between Project IRR and Equity IRR).
3. Comment on the debt service safety margin based on the Min DSCR (e.g., if > 1.25x, it's healthy; if < 1.20x, it's tight).
4. Keep it strictly to 3-4 sentences. Institutional tone.

OUTPUT: JSON { "commentary": string }
`;
}
