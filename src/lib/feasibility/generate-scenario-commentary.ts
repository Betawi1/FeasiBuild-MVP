import { normalizeAssetType } from "@/app/operational/scenario-analysis/config/shockFactors";
import type { ScenarioAnalysisCase } from "@/types/feasibility";

export type ScenarioCommentaryInput = {
  assetType: string;
  location: { city: string; country: string };
  currency: string;
  scenarios: ScenarioAnalysisCase[];
};

function findCase(
  scenarios: ScenarioAnalysisCase[],
  name: string
): ScenarioAnalysisCase | undefined {
  return scenarios.find((s) => s.name === name);
}

function assetContext(assetType: string): {
  revenuePhrase: string;
  driverPhrase: string;
} {
  const key = normalizeAssetType(assetType);
  switch (key) {
    case "retail":
      return {
        revenuePhrase: "leasing velocity and rental rates",
        driverPhrase: "tenant retention and footfall",
      };
    case "office":
      return {
        revenuePhrase: "rental rates and lease expiries",
        driverPhrase: "vacancy and tenant demand",
      };
    case "residential":
      return {
        revenuePhrase: "rental yields and absorption",
        driverPhrase: "occupancy and rent growth",
      };
    default:
      return {
        revenuePhrase: "pricing and occupancy",
        driverPhrase: "demand and operating performance",
      };
  }
}

export function buildScenarioCommentaryAiPrompt(
  input: ScenarioCommentaryInput
): string {
  const baseCase =
    findCase(input.scenarios, "Base Case") ?? input.scenarios[1] ?? input.scenarios[0];
  const downsideCase =
    findCase(input.scenarios, "Downside Case") ?? input.scenarios[0];
  const upsideCase =
    findCase(input.scenarios, "Upside Case") ??
    input.scenarios[input.scenarios.length - 1];

  const irrVariance = upsideCase.projectIRR - downsideCase.projectIRR;
  const multipleVariance = upsideCase.equityMultiple - downsideCase.equityMultiple;
  const isResilient = downsideCase.projectIRR > 8;
  const isHighlySensitive = irrVariance > 10;
  const { revenuePhrase, driverPhrase } = assetContext(input.assetType);

  const fmtM = (n: number) =>
    `${input.currency} ${(n / 1_000_000).toFixed(1)}M`;

  return `
You are a senior real estate financial analyst. Write a professional, 1-paragraph commentary for a feasibility study slide titled "Scenario Analysis Results".

ASSET TYPE: ${input.assetType}
LOCATION: ${input.location.city}, ${input.location.country}
CURRENCY: ${input.currency}

SCENARIO DATA:
- Base Case: Project IRR ${baseCase.projectIRR}%, Equity IRR ${baseCase.equityIRR}%, NPV ${fmtM(baseCase.npv)}, Payback ${baseCase.paybackPeriod} years, Multiple ${baseCase.equityMultiple}x
- Downside Case: Project IRR ${downsideCase.projectIRR}%, Equity IRR ${downsideCase.equityIRR}%, NPV ${fmtM(downsideCase.npv)}, Payback ${downsideCase.paybackPeriod} years, Multiple ${downsideCase.equityMultiple}x
- Upside Case: Project IRR ${upsideCase.projectIRR}%, Equity IRR ${upsideCase.equityIRR}%, NPV ${fmtM(upsideCase.npv)}, Payback ${upsideCase.paybackPeriod} years, Multiple ${upsideCase.equityMultiple}x

ANALYSIS:
- IRR Variance (Upside - Downside): ${irrVariance.toFixed(1)} percentage points
- Equity Multiple Variance: ${multipleVariance.toFixed(2)}x
- Project Resilience: ${isResilient ? "Resilient (Downside IRR > 8%)" : "Vulnerable (Downside IRR ≤ 8%)"}
- Sensitivity: ${isHighlySensitive ? "Highly sensitive to market conditions" : "Moderately sensitive"}

Use asset-appropriate terminology (${revenuePhrase}; key drivers: ${driverPhrase}).

CRITICAL RULES:
1. NO PLACEHOLDERS. Use the exact numbers provided.
2. Adapt terminology to the asset type — do NOT use hotel-only terms unless asset is a hotel.
3. Reference ${input.location.country} market context where relevant.
4. Comment on resilience and sensitivity based on the variance metrics.
5. Keep it strictly to 4-5 sentences. Institutional tone.

OUTPUT: JSON { "commentary": string }
`;
}

/** Rule-based fallback when AI is unavailable. */
export function generateScenarioAnalysisCommentary(
  input: ScenarioCommentaryInput
): string {
  const baseCase =
    findCase(input.scenarios, "Base Case") ?? input.scenarios[1] ?? input.scenarios[0];
  const downsideCase =
    findCase(input.scenarios, "Downside Case") ?? input.scenarios[0];
  const upsideCase =
    findCase(input.scenarios, "Upside Case") ??
    input.scenarios[input.scenarios.length - 1];

  const irrVariance = upsideCase.projectIRR - downsideCase.projectIRR;
  const isResilient = downsideCase.projectIRR > 8;
  const isHighlySensitive = irrVariance > 10;
  const { revenuePhrase, driverPhrase } = assetContext(input.assetType);
  const loc = `${input.location.city}, ${input.location.country}`;

  const resilienceText = isResilient
    ? "demonstrates solid resilience under stress"
    : "shows moderate vulnerability under adverse conditions";

  const sensitivityText = isHighlySensitive
    ? "high sensitivity to market conditions, warranting proactive risk mitigation"
    : "moderate sensitivity, suggesting the base case can absorb reasonable market fluctuation";

  const downsideText =
    downsideCase.projectIRR > 8
      ? `maintains viability in the Downside case at a ${downsideCase.projectIRR.toFixed(1)}% Project IRR`
      : `faces headwinds in the Downside case with a ${downsideCase.projectIRR.toFixed(1)}% Project IRR, below typical institutional thresholds`;

  return `The scenario analysis for this ${input.assetType.toLowerCase()} asset in ${loc} ${resilienceText} across Base, Downside, and Upside cases. The Base Case delivers a ${baseCase.projectIRR.toFixed(1)}% Project IRR and ${baseCase.equityMultiple.toFixed(2)}x equity multiple, underpinned by ${revenuePhrase} and ${driverPhrase} assumptions aligned with the ${input.location.country} market. Under stress, the project ${downsideText}, while the Upside case reaches ${upsideCase.projectIRR.toFixed(1)}% Project IRR. The ${irrVariance.toFixed(1)} percentage-point spread between Upside and Downside scenarios indicates ${sensitivityText}. Overall, the risk-adjusted return profile ${isResilient ? "supports institutional underwriting subject to ongoing monitoring of key drivers" : "requires close tracking of market and cost assumptions to protect projected returns"}.`;
}
