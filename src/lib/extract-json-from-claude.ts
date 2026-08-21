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

/** Unwrap double-serialized JSON: '"{ \"a\": 1 }"' → '{ "a": 1 }' */
function unwrapJsonString(text: string): string {
  let t = text.trim();
  for (let i = 0; i < 2; i++) {
    if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
      try {
        const inner = JSON.parse(t);
        if (typeof inner === "string") {
          t = inner.trim();
          continue;
        }
      } catch {
        /* not a valid JSON string literal — stop unwrapping */
      }
    }
    break;
  }
  return t;
}

/** If parse produced a JSON string, parse again (double-serialized payloads). */
function unwrapParsed(value: unknown): unknown | undefined {
  if (value === undefined) return undefined;
  let current = value;
  for (let i = 0; i < 2; i++) {
    if (typeof current !== "string") return current;
    const next = tryParseJson(current.trim());
    if (next === undefined) return current;
    current = next;
  }
  return current;
}

function tryParse(s: string): unknown | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Strip the outer quotes of a quoted payload and unescape it,
 *  even when the payload is truncated (no closing quote). */
function unescapeJsonStringBody(text: string): string {
  let t = text.trim();
  if (t.startsWith('"')) t = t.slice(1);
  if (t.endsWith('"') && !t.endsWith('\\"')) t = t.slice(0, -1);
  return t
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");
}

/** Close dangling strings/braces/brackets of a truncated payload. */
function repairTruncatedJson(text: string): string {
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (const ch of text) {
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if ((ch === "}" || ch === "]") && stack.length) stack.pop();
  }
  let out = text;
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "");
  while (stack.length) out += stack.pop();
  return out;
}

function firstBalancedSnippet(text: string): string | null {
  const brace = text.indexOf("{");
  const bracket = text.indexOf("[");
  let start = -1;
  if (brace === -1) start = bracket;
  else if (bracket === -1) start = brace;
  else start = Math.min(brace, bracket);
  if (start < 0) return null;
  return extractBalanced(text, start);
}

function asJsonObject(value: unknown): unknown | undefined {
  if (value && typeof value === "object") return value;
  return undefined;
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
    const value = unwrapParsed(tryParseJson(unwrapJsonString(source)));
    if (value === undefined || typeof value === "string") continue;
    const score = scoreJsonCandidate(value);
    if (!best || score > best.score) {
      best = { value, source, score };
    }
  }
  return best;
}

/**
 * Extracts pure JSON from model responses (Qwen / DeepSeek / Claude / GPT).
 * Also works when they wrap JSON in fences, CoT tags, or a quoted JSON string.
 */
export function extractJsonFromClaudeResponse(rawText: string): unknown {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error("Model returned an empty response.");
  }

  const withoutReasoning = unwrapJsonString(stripReasoningBlocks(trimmed));
  const unwrappedTrimmed = unwrapJsonString(trimmed);

  const direct = unwrapParsed(tryParseJson(unwrappedTrimmed));
  if (direct !== undefined && typeof direct !== "string") return direct;

  const strippedDirect = unwrapParsed(tryParseJson(withoutReasoning));
  if (strippedDirect !== undefined && typeof strippedDirect !== "string") {
    return strippedDirect;
  }

  const fenced = [
    ...extractFencedJson(withoutReasoning),
    ...extractFencedJson(unwrappedTrimmed),
  ];
  const fromFence = firstParsable(fenced);
  if (fromFence) return fromFence.value;

  const balanced = [
    ...extractBalancedCandidates(withoutReasoning),
    ...extractBalancedCandidates(unwrappedTrimmed),
  ];
  const fromBalanced = firstParsable(balanced);
  if (fromBalanced) return fromBalanced.value;

  // Last resort: first `{` … last `}` (legacy fallback)
  const braceStart = withoutReasoning.indexOf("{");
  const braceEnd = withoutReasoning.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    const sliced = unwrapJsonString(
      withoutReasoning.slice(braceStart, braceEnd + 1)
    );
    const parsed = unwrapParsed(tryParseJson(sliced));
    if (parsed !== undefined && typeof parsed !== "string") return parsed;
  }

  // S3: quoted-but-unparseable (incl. truncated) → unescape, balance, repair
  const quotedCandidates = [withoutReasoning, unwrappedTrimmed, trimmed];
  for (const trimmedNow of quotedCandidates) {
    if (!trimmedNow.startsWith('"')) continue;
    const body = unescapeJsonStringBody(trimmedNow);
    const balanced = firstBalancedSnippet(body);
    const parsed =
      (balanced && tryParse(balanced)) ||
      tryParse(repairTruncatedJson(balanced ?? body));
    const object = asJsonObject(unwrapParsed(parsed ?? undefined));
    if (object) return object;
  }

  // S4: repair truncation on the working text itself
  for (const trimmedNow of [withoutReasoning, unwrappedTrimmed]) {
    const repaired = asJsonObject(
      unwrapParsed(tryParse(repairTruncatedJson(trimmedNow)) ?? undefined)
    );
    if (repaired) return repaired;
  }

  console.error("All JSON extraction strategies failed");
  console.error("Raw response preview:", trimmed.substring(0, 500));
  throw new Error(
    `Model returned non-JSON content. Raw response: ${trimmed.substring(0, 200)}...`
  );
}
