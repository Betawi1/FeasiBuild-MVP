export interface PuterModel {
  id: string;
  name: string;
  description: string;
  recommendedFor: string;
  tier: "recommended" | "premium" | "fast" | "budget";
  whyThisModel: string;
}

export const PUTER_MODELS: PuterModel[] = [
  {
    id: "qwen/qwen3.7-plus",
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
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2 (Cost-Effective)",
    description: "Powerful open-weight model with strong financial reasoning.",
    recommendedFor: "Budget-conscious users who need quality output",
    tier: "budget",
    whyThisModel:
      "DeepSeek V3.2 offers GPT-4 level performance at a fraction of the cost. Excellent for users running multiple feasibility studies while maintaining high JSON accuracy.",
  },
];

export const DEFAULT_MODEL = PUTER_MODELS[0].id;

export function isKnownPuterModel(id: string): boolean {
  return PUTER_MODELS.some((model) => model.id === id);
}

export function getPuterModel(id: string): PuterModel | undefined {
  return PUTER_MODELS.find((model) => model.id === id);
}

export function isClaudeModel(id: string): boolean {
  return /claude/i.test(id);
}
