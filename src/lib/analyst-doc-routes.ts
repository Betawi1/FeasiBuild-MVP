/**
 * Maps wizard step IDs to live documentation files under `src/app/docs/`.
 *
 * FeasiBuild docs are currently TSX pages (not per-step MDX). Individual C1–C6
 * inner steps therefore point at the parent Component page.
 */

export type AnalystStream = "operational" | "sale";
export type AnalystComponentId = "C1" | "C2" | "C3" | "C4" | "C5" | "C6";

export interface AnalystContextApiResponse {
  success: boolean;
  content: string;
  stepId: string;
  stepNumber: number | null;
  sectionFound: boolean;
}

export interface AnalystQuickAction {
  id: string;
  label: string;
  prompt: string;
}

const OPS_C1 =
  "src/app/docs/operational-stream/component-1-cash-outflows/page.tsx";
const OPS_C2 =
  "src/app/docs/operational-stream/component-2-cash-inflows/page.tsx";
const OPS_C3 = "src/app/docs/operational-stream/project-irr/page.tsx";
const OPS_C4 =
  "src/app/docs/operational-stream/component-4-financing/page.tsx";
const OPS_C5 =
  "src/app/docs/operational-stream/component-5-equity-returns/page.tsx";
const OPS_C6 =
  "src/app/docs/operational-stream/component-6-scenario-analysis/page.tsx";
const OPS_OVERVIEW = "src/app/docs/operational-stream/page.tsx";

const SALE_C1 = "src/app/docs/sale-stream/component-1-cash-outflows/page.tsx";
const SALE_C2 = "src/app/docs/sale-stream/component-2-sales-revenue/page.tsx";
const SALE_C3 = "src/app/docs/sale-stream/component-3-project-irr/page.tsx";
const SALE_C4 = "src/app/docs/sale-stream/component-4-financing/page.tsx";
const SALE_C5 = "src/app/docs/sale-stream/component-5-levered-irr/page.tsx";
const SALE_C6 =
  "src/app/docs/sale-stream/component-6-scenario-analysis/page.tsx";
const SALE_OVERVIEW = "src/app/docs/sale-stream/page.tsx";

const AI_RESEARCH = "src/app/docs/ai-research-automation/page.tsx";
const GETTING_STARTED = "src/app/docs/getting-started/page.tsx";

function expandComponentSteps(
  prefix: string,
  file: string,
  maxSteps: number
): Record<string, string> {
  const map: Record<string, string> = { [prefix]: file };
  for (let step = 1; step <= maxSteps; step += 1) {
    map[`${prefix}-s${step}`] = file;
  }
  return map;
}

export const DOC_ROUTE_MAP: Record<string, string> = {
  ...expandComponentSteps("operational-c1", OPS_C1, 13),
  ...expandComponentSteps("operational-c2", OPS_C2, 5),
  ...expandComponentSteps("operational-c3", OPS_C3, 3),
  ...expandComponentSteps("operational-c4", OPS_C4, 8),
  ...expandComponentSteps("operational-c5", OPS_C5, 4),
  ...expandComponentSteps("operational-c6", OPS_C6, 4),
  operational: OPS_OVERVIEW,

  "operational-c1-location": OPS_C1,
  "operational-c1-currency": OPS_C1,
  "operational-c1-asset-type": OPS_C1,
  "operational-c1-segmentation": OPS_C1,
  "operational-c1-building-config": OPS_C1,
  "operational-c1-construction-costs": OPS_C1,
  "operational-c1-contingency": OPS_C1,
  "operational-c1-soft-costs": OPS_C1,
  "operational-c1-land": OPS_C1,
  "operational-c1-construction-period": OPS_C1,
  "operational-c1-phasing": OPS_C1,
  "operational-c1-review": OPS_C1,

  ...expandComponentSteps("sale-c1", SALE_C1, 13),
  ...expandComponentSteps("sale-c2", SALE_C2, 8),
  ...expandComponentSteps("sale-c3", SALE_C3, 3),
  ...expandComponentSteps("sale-c4", SALE_C4, 8),
  ...expandComponentSteps("sale-c5", SALE_C5, 4),
  ...expandComponentSteps("sale-c6", SALE_C6, 4),
  sale: SALE_OVERVIEW,

  "sale-c1-location": SALE_C1,
  "sale-c1-currency": SALE_C1,
  "sale-c1-building-type": SALE_C1,
  "sale-c1-segmentation": SALE_C1,
  "sale-c1-building-config": SALE_C1,
  "sale-c1-construction-costs": SALE_C1,
  "sale-c1-contingency": SALE_C1,
  "sale-c1-soft-costs": SALE_C1,
  "sale-c1-land": SALE_C1,

  "ai-research": AI_RESEARCH,
  "getting-started": GETTING_STARTED,
};

const COMPONENT_FILE_BY_PREFIX: Record<string, string> = {
  "operational-c1": OPS_C1,
  "operational-c2": OPS_C2,
  "operational-c3": OPS_C3,
  "operational-c4": OPS_C4,
  "operational-c5": OPS_C5,
  "operational-c6": OPS_C6,
  "sale-c1": SALE_C1,
  "sale-c2": SALE_C2,
  "sale-c3": SALE_C3,
  "sale-c4": SALE_C4,
  "sale-c5": SALE_C5,
  "sale-c6": SALE_C6,
};

export function getDocPath(stepId: string): string | null {
  const key = stepId.trim().toLowerCase();
  if (!key) return null;
  if (DOC_ROUTE_MAP[key]) return DOC_ROUTE_MAP[key];

  const componentPrefix = key.match(/^(operational|sale)-c[1-6]/);
  if (componentPrefix) {
    const file = COMPONENT_FILE_BY_PREFIX[componentPrefix[0]];
    if (file) return file;
  }

  const parts = key.split("-");
  while (parts.length > 1) {
    parts.pop();
    const candidate = parts.join("-");
    if (DOC_ROUTE_MAP[candidate]) return DOC_ROUTE_MAP[candidate];
  }
  return null;
}

const WIZARD_SEGMENT_TO_COMPONENT: Record<string, AnalystComponentId> = {
  "cash-outflows": "C1",
  "cash-inflows": "C2",
  "project-irr": "C3",
  financing: "C4",
  "equity-returns": "C5",
  "scenario-analysis": "C6",
  pnl: "C2",
  "pre-financing": "C3",
};

const HIDDEN_PATH_PATTERNS: RegExp[] = [
  /\/feasibility-study\/?$/,
  /^\/operational\/?$/,
  /^\/sale\/?$/,
  /\/investments(\/|$)/,
  /\/test\/?$/,
];

const VISIBLE_PATH_PATTERNS: RegExp[] = [
  /\/(cash-outflows|cash-inflows|project-irr|financing|equity-returns|scenario-analysis)(\/|$)/,
  /\/preview\//,
];

export function isAnalystVisiblePath(pathname: string): boolean {
  if (HIDDEN_PATH_PATTERNS.some((re) => re.test(pathname))) return false;
  return VISIBLE_PATH_PATTERNS.some((re) => re.test(pathname));
}

export function parseWizardStepParam(stepParam: string | null): number | null {
  if (!stepParam) return null;
  const parsed = Number(stepParam);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.floor(parsed);
}

const EQUITY_TAB_ORDER = ["summary", "multiple", "payback", "waterfall"] as const;

/** Map C5 `?tab=` values (summary/multiple/payback/waterfall) to 1-based Tab N. */
export function parseEquityTabParam(tabParam: string | null): number | null {
  if (!tabParam) return null;
  const key = tabParam.trim().toLowerCase();
  const index = (EQUITY_TAB_ORDER as readonly string[]).indexOf(key);
  return index >= 0 ? index + 1 : null;
}

export function pathnamesMatch(a: string, b: string): boolean {
  const norm = (value: string) =>
    value.length > 1 ? value.replace(/\/+$/, "") : value;
  return norm(a) === norm(b);
}

export function resolveStreamFromPath(pathname: string): AnalystStream | null {
  if (pathname === "/sale" || pathname.startsWith("/sale/")) return "sale";
  if (pathname === "/operational" || pathname.startsWith("/operational/")) {
    return "operational";
  }
  return null;
}

export function resolveComponentFromPath(
  pathname: string
): AnalystComponentId | null {
  const parts = pathname.split("/").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const mapped = WIZARD_SEGMENT_TO_COMPONENT[parts[i]];
    if (mapped) return mapped;
  }
  return null;
}

export function resolveAnalystStepId(params: {
  pathname: string;
  stepParam: string | null;
}): string {
  const stream = resolveStreamFromPath(params.pathname) ?? "operational";
  const component = resolveComponentFromPath(params.pathname);
  if (!component) return stream;

  const prefix = `${stream}-${component.toLowerCase()}`;
  const isPreview = params.pathname.includes("/preview/");
  const inner = parseWizardStepParam(params.stepParam);
  if (inner && !isPreview) return `${prefix}-s${inner}`;
  return prefix;
}

export function formatAssetLabel(
  stream: AnalystStream | null,
  buildingType?: string,
  buildingSubType?: string
): string {
  if (stream === "sale") {
    return buildingSubType?.trim() || buildingType?.trim() || "sale";
  }
  return buildingType?.trim() || stream || "unspecified";
}

/** Sale C2 steps that render AI-researched figures on screen (1-based). */
export const SALE_C2_AI_BENCHMARK_STEPS = [2, 6, 8] as const;

export function stepDisplaysAiBenchmarks(params: {
  component: AnalystComponentId | null;
  innerStep: number | null;
  stream: AnalystStream | null;
  isPreview?: boolean;
}): boolean {
  if (params.isPreview) return false;
  const step = params.innerStep;
  if (step == null || step < 1) return false;
  if (params.component === "C1") return step >= 6;
  if (params.component === "C2") {
    if (params.stream === "sale") {
      return (SALE_C2_AI_BENCHMARK_STEPS as readonly number[]).includes(step);
    }
    return true;
  }
  return false;
}

export function getAnalystQuickActions(
  component: AnalystComponentId | null,
  options?: {
    innerStep?: number | null;
    stream?: AnalystStream | null;
    isPreview?: boolean;
    hasResearchSnapshot?: boolean;
  }
): AnalystQuickAction[] {
  const actions: AnalystQuickAction[] = [
    {
      id: "explain-step",
      label: "Explain this step",
      prompt:
        "Explain what this FeasiBuild step is for, which inputs matter, and how they feed the cash-flow engine. Be concise.",
    },
    {
      id: "what-to-enter",
      label: "What should I enter here?",
      prompt:
        "What should a user enter on this step? Distinguish required inputs from AI directional baselines, and say which fields are typically overridden with QS or market data.",
    },
  ];

  const showRateChip =
    (component === "C1" || component === "C2") &&
    options?.hasResearchSnapshot === true &&
    stepDisplaysAiBenchmarks({
      component,
      innerStep: options.innerStep ?? null,
      stream: options.stream ?? null,
      isPreview: options.isPreview,
    });

  if (showRateChip) {
    actions.push({
      id: "ai-rate",
      label: "Why did the AI suggest this rate?",
      prompt:
        "Explain the reasoning behind the AI-suggested benchmarks currently shown for this step, including any hints or guardrails the research provided.",
    });
  } else if (component === "C1" || component === "C2") {
    const wherePrompt =
      component === "C1"
        ? "AI-researched figures begin at Step 6 (Construction Costs) and continue through the remaining C1 steps. Steps 1–5 are driven by the user's own inputs. Explain where the AI benchmarks appear and what to enter on this step."
        : options?.stream === "sale"
          ? "On Sale Component 2, AI-researched figures appear on Step 2 (Sales Price), Step 6 (Buyer Mix & Deductions), and Step 8 (Sales Launch Timing). Other C2 steps are user inputs. Explain where the AI benchmarks appear."
          : "On Operational Component 2, AI-researched benchmarks appear across the revenue, other-income, opex, and depreciation steps. Explain where the AI benchmarks appear on this component.";
    actions.push({
      id: "where-benchmarks",
      label: "Where do the AI benchmarks appear?",
      prompt: wherePrompt,
    });
  }

  if (component === "C4") {
    actions.push({
      id: "gap-fill",
      label: "Explain the equity gap-fill rule",
      prompt:
        "Explain the Equity Gap-Fill rule (cumulative post-financing NCF never below 0) and the 1-month offset for interest/escrow.",
    });
  } else if (component === "C3") {
    actions.push({
      id: "project-irr",
      label: "How is Project IRR calculated?",
      prompt:
        "Explain unlevered Project IRR in this stream and how it differs from levered Equity IRR in Component 5.",
    });
  } else if (component === "C5") {
    actions.push({
      id: "equity-irr",
      label: "How is levered Equity IRR derived?",
      prompt:
        "Explain how levered Equity IRR is derived from post-financing cash flows. This page is read-only — changes belong in Component 4.",
    });
  } else if (component === "C6") {
    actions.push({
      id: "scenarios",
      label: "What do these scenario shocks change?",
      prompt:
        "Explain how Component 6 shocks re-run C1–C5 engines for this stream.",
    });
  }

  return actions.slice(0, 3);
}
