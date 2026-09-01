export interface PuterModel {
  id: string;
  name: string;
  description: string;
  recommendedFor: string;
  tier: "recommended" | "premium" | "fast";
  whyThisModel: string;
}

/** Working Puter Qwen id (fallback when Claude / GPT fail). */
export const QWEN_MODEL_ID = "qwen/qwen3.7-plus";
export const FALLBACK_MODEL_ID = QWEN_MODEL_ID;

export const PUTER_MODELS: PuterModel[] = [
  {
    id: QWEN_MODEL_ID,
    name: "Qwen 3.7 Plus (Default)",
    description: "Excellent balance of speed, cost, and JSON reliability.",
    recommendedFor: "General feasibility studies & market research",
    tier: "recommended",
    whyThisModel:
      "Optimized for structured financial data extraction with consistent JSON output. Best all-rounder for FeasiBuild.",
  },
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6 (Premium Analysis)",
    description:
      "Most reliable for complex market analysis and risk assessment.",
    recommendedFor: "High-value projects requiring detailed narratives",
    tier: "premium",
    whyThisModel:
      "Claude Sonnet 4.6 (not the newer v5) is specifically chosen for its proven track record with financial modeling. It prioritizes accuracy and structured output over creative reasoning.",
  },
  {
    id: "openai/gpt-4o-2024-08-06",
    name: "GPT-4o (August 2024 - Fast & Reliable)",
    description: "Rapid processing with excellent structured data capabilities.",
    recommendedFor: "Quick iterations and multi-project workflows",
    tier: "fast",
    whyThisModel:
      "This stable GPT-4o version (not the newer 'o1' reasoning models) is optimized for speed and JSON reliability. Avoids the verbosity of reasoning models that can break financial data parsers.",
  },
];

export const DEFAULT_MODEL = PUTER_MODELS[0].id;

/** Older KV / docs ids → catalog ids. Retired vendors map to Qwen. */
const LEGACY_MODEL_ALIASES: Record<string, string> = {
  "qwen/qwen-plus": QWEN_MODEL_ID,
  "qwen-plus": QWEN_MODEL_ID,
  "qwen/qwen-2.5-plus": QWEN_MODEL_ID,
  "anthropic/claude-sonnet-4.6": "anthropic/claude-sonnet-4-6",
  "claude-sonnet-4-6": "anthropic/claude-sonnet-4-6",
  "openai/gpt-4o": "openai/gpt-4o-2024-08-06",
  "gpt-4o-2024-08-06": "openai/gpt-4o-2024-08-06",
};

export function isKnownPuterModel(id: string): boolean {
  return PUTER_MODELS.some((model) => model.id === id);
}

export function resolvePuterModelId(id: unknown): string {
  if (typeof id !== "string" || !id.trim()) return DEFAULT_MODEL;
  const trimmed = id.trim();
  const aliased = LEGACY_MODEL_ALIASES[trimmed];
  if (aliased) return isKnownPuterModel(aliased) ? aliased : DEFAULT_MODEL;
  if (isKnownPuterModel(trimmed)) return trimmed;
  return DEFAULT_MODEL;
}

export function getPuterModel(id: string): PuterModel | undefined {
  return PUTER_MODELS.find((model) => model.id === resolvePuterModelId(id));
}

export function isClaudeModel(id: string): boolean {
  return /claude/i.test(id);
}

export function isQwenModel(id: string): boolean {
  return /qwen/i.test(id);
}

export function getModelFamilyLabel(id: string): string {
  const resolved = resolvePuterModelId(id);
  if (/claude/i.test(resolved)) return "Claude";
  if (/openai|gpt/i.test(resolved)) return "GPT";
  if (/qwen/i.test(resolved)) return "Qwen";
  return getPuterModel(resolved)?.name ?? resolved;
}

export function buildQwenFallbackNotice(selectedModelId: string): string {
  return `«${getModelFamilyLabel(selectedModelId)}» unavailable — used Qwen for this research`;
}

/** Preferred-model lookup lives in `puter-kv-preferences`; re-exported for catalog callers. */
export { getPreferredModel } from "./puter-kv-preferences";
