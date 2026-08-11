/**
 * Extracts parseable JSON from Claude (and other) verbose responses.
 * Handles markdown fences, <reasoning> blocks, and prose around the object.
 */

function tryParseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Remove <reasoning>...</reasoning> (and unclosed trailing reasoning). */
export function stripReasoningBlocks(rawText: string): string {
  return rawText
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/<reasoning>[\s\S]*$/gi, "")
    .trim();
}

function extractFencedJson(rawText: string): string[] {
  const matches = rawText.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);
  return [...matches].map((match) => match[1].trim()).filter(Boolean);
}

/**
 * Extract a balanced `{...}` or `[...]` starting at `start`,
 * respecting JSON string escapes.
 */
function extractBalanced(text: string, start: number): string | null {
  const open = text[start];
  const close = open === "{" ? "}" : open === "[" ? "]" : null;
  if (!close) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function extractBalancedCandidates(text: string): string[] {
  const candidates: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{" && text[i] !== "[") continue;
    const extracted = extractBalanced(text, i);
    if (extracted) {
      candidates.push(extracted);
      i += extracted.length - 1;
    }
  }
  return candidates;
}

function scoreJsonCandidate(value: unknown): number {
  if (value == null) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value !== "object") return 1;
  const obj = value as Record<string, unknown>;
  let score = Object.keys(obj).length;
  if ("c1_development" in obj) score += 50;
  if ("fx_rate_to_usd" in obj) score += 10;
  if ("c2_operational" in obj || "c2_sales" in obj) score += 10;
  return score;
}

function firstParsable(
  candidates: string[]
): { value: unknown; source: string } | undefined {
  let best: { value: unknown; source: string; score: number } | undefined;
  for (const source of candidates) {
    const value = tryParseJson(source);
    if (value === undefined) continue;
    const score = scoreJsonCandidate(value);
    if (!best || score > best.score) {
      best = { value, source, score };
    }
  }
  return best;
}

/**
 * Extracts pure JSON from Claude's verbose markdown / reasoning responses.
 * Also works for Qwen/GPT/DeepSeek when they wrap JSON in fences or CoT tags.
 */
export function extractJsonFromClaudeResponse(rawText: string): unknown {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error("Claude returned an empty response.");
  }

  const direct = tryParseJson(trimmed);
  if (direct !== undefined) return direct;

  const withoutReasoning = stripReasoningBlocks(trimmed);
  const strippedDirect = tryParseJson(withoutReasoning);
  if (strippedDirect !== undefined) return strippedDirect;

  const fenced = [
    ...extractFencedJson(withoutReasoning),
    ...extractFencedJson(trimmed),
  ];
  const fromFence = firstParsable(fenced);
  if (fromFence) return fromFence.value;

  const balanced = [
    ...extractBalancedCandidates(withoutReasoning),
    ...extractBalancedCandidates(trimmed),
  ];
  const fromBalanced = firstParsable(balanced);
  if (fromBalanced) return fromBalanced.value;

  // Last resort: first `{` … last `}` (legacy fallback)
  const braceStart = withoutReasoning.indexOf("{");
  const braceEnd = withoutReasoning.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    const sliced = withoutReasoning.slice(braceStart, braceEnd + 1);
    const parsed = tryParseJson(sliced);
    if (parsed !== undefined) return parsed;
  }

  console.error("All JSON extraction strategies failed");
  console.error("Raw response preview:", trimmed.substring(0, 500));
  throw new Error(
    `Claude returned non-JSON content. Raw response: ${trimmed.substring(0, 200)}...`
  );
}
