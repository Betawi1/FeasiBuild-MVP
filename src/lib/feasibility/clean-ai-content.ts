/** Remove JSON wrapper artifacts from AI responses. */
export function removeJsonArtifacts(content: string): string {
  let cleaned = content.trim();
  cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  cleaned = cleaned.replace(/^\s*\{\s*["']?paragraphs?["']?\s*:\s*\[/i, "");
  cleaned = cleaned.replace(/\]\s*\}\s*$/i, "");
  cleaned = cleaned.replace(/^\s*\[\s*/, "");
  cleaned = cleaned.replace(/\s*\]\s*$/, "");
  return cleaned.trim();
}

const MAX_CLEAN_CACHE = 800;
const stripCache = new Map<string, string>();
const paragraphCache = new Map<string, string>();
const arrayCleanCache = new Map<string, string[]>();

function cacheGet<T>(cache: Map<string, T>, key: string): T | undefined {
  const hit = cache.get(key);
  if (hit === undefined) return undefined;
  // Refresh LRU order
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

function cacheSet<T>(cache: Map<string, T>, key: string, value: T): T {
  if (cache.size >= MAX_CLEAN_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
}

/** Clear in-memory cleanAIContent / strip caches (e.g. after force regenerate). */
export function clearContentCache(): void {
  stripCache.clear();
  paragraphCache.clear();
  arrayCleanCache.clear();
  if (typeof console !== "undefined") {
    console.log("[AI Service] Content clean cache cleared");
  }
}

/**
 * Aggressively strip thinking-process blocks, prompt echo, and placeholder
 * warnings from raw AI output before paragraph parsing.
 */
export function stripThinkingAndPromptArtifacts(content: string): string {
  if (!content) return "";

  const cached = cacheGet(stripCache, content);
  if (cached !== undefined) return cached;

  let cleaned = content;

  // XML-style / markdown reasoning blocks (Qwen chain-of-thought)
  cleaned = cleaned.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/```(?:reasoning|thinking)[\s\S]*?```/gi, "");

  // Labeled thinking / prompt-instruction sections
  cleaned = cleaned.replace(/Thinking Process:[\s\S]*?(?=\n\n|\*\*|##|$)/gi, "");
  cleaned = cleaned.replace(/\*\*Analyze the Request:\*\*[\s\S]*?(?=\n\n|\*\*|##|$)/gi, "");
  cleaned = cleaned.replace(/\*\*Project Details:\*\*[\s\S]*?(?=\n\n|\*\*|##|$)/gi, "");
  cleaned = cleaned.replace(/\*\*Critical Requirements:\*\*[\s\S]*?(?=\n\n|\*\*|##|$)/gi, "");
  cleaned = cleaned.replace(/\*\*Role:\*\*[\s\S]*?(?=\n\n|\*\*|##|$)/gi, "");
  cleaned = cleaned.replace(/\*\*Context:\*\*[\s\S]*?(?=\n\n|\*\*|##|$)/gi, "");
  cleaned = cleaned.replace(/\*\*Requirements:\*\*[\s\S]*?(?=\n\n|\*\*|##|$)/gi, "");
  cleaned = cleaned.replace(/\*\*Constraints.*Rules:\*\*[\s\S]*?(?=\n\n|\*\*|##|$)/gi, "");
  cleaned = cleaned.replace(
    /(?:^|\n)\s*(?:Analyze the Request|Project Details|Critical Requirements|Role|Context|Requirements|Constraints)\s*:[\s\S]*?(?=\n\n|\*\*|##|$)/gi,
    "\n"
  );

  // Placeholder / UI warnings that should never appear in slides
  cleaned = cleaned.replace(/\[?WARNING:?[^\n]*placeholder[^\n]*\]?/gi, "");
  cleaned = cleaned.replace(/Some content may need refinement[^\n]*Regenerate[^\n]*/gi, "");
  cleaned = cleaned.replace(/⚠️\s*\[WARNING:[^\]]*\]/gi, "");

  // Markdown noise common in leaked prompt echo
  cleaned = cleaned.replace(/#{4,}/g, "");
  cleaned = cleaned.replace(/^\s*-\s*\*\*/gm, "- ");

  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.trim();

  return cacheSet(stripCache, content, cleaned);
}

/** Validate slide copy for thinking leakage, placeholders, and generic table labels. */
export function validateSlideContent(content: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (!content?.trim()) {
    return { isValid: false, issues: ["Empty content"] };
  }

  if (
    /Thinking Process:/i.test(content) ||
    /\*\*Analyze the Request:\*\*/i.test(content) ||
    /Analyze the Request:/i.test(content) ||
    /<reasoning>/i.test(content)
  ) {
    issues.push("Contains thinking process or prompt instructions");
  }

  if (
    /\bWARNING\b/i.test(content) ||
    /\bplaceholder\b/i.test(content) ||
    /charts and visualizations are included/i.test(content)
  ) {
    issues.push("Contains placeholder text or warnings");
  }

  if (
    /\bMarket threat\b/i.test(content) ||
    /\bExternal risk\b/i.test(content) ||
    /\bProject weakness\b/i.test(content)
  ) {
    if (!/\bSpecific\b/i.test(content) && content.length < 80) {
      issues.push("Table contains generic labels instead of specific analysis");
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/** Aggressively strip quotes and JSON fragments from a single paragraph. */
export function aggressiveCleanParagraph(text: string): string {
  if (!text) return "";

  const cached = cacheGet(paragraphCache, text);
  if (cached !== undefined) return cached;

  let cleaned = stripThinkingAndPromptArtifacts(removeJsonArtifacts(text)).trim();
  if (!cleaned) return cacheSet(paragraphCache, text, "");

  cleaned = cleaned.replace(/\\"/g, "").replace(/\\'/g, "").replace(/\\`/g, "");

  for (let i = 0; i < 3; i++) {
    cleaned = cleaned.replace(/^["'`]+/, "").replace(/["'`]+$/, "").trim();
    if (
      cleaned.length > 2 &&
      ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'")))
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }
  }

  cleaned = cleaned.replace(/["'],?\s*$/g, "");
  cleaned = cleaned.replace(/^["']\s*/, "");
  cleaned = cleaned.replace(/\s*["']$/g, "");
  cleaned = cleaned.replace(/^\{.*?\}\s*/, "");
  cleaned = cleaned.replace(/\s*\{.*?\}$/, "");

  // Soften leftover bold markers without destroying prose
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*\*/g, "");

  cleaned = cleaned.replace(/(\d+\.?\d*%?)\s*,\s*/g, "$1, ");
  cleaned = cleaned.replace(/(\d+\.?\d*\s*million)\s*\.\s*/gi, "$1. ");
  cleaned = cleaned.replace(/\s+\./g, ".");
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  cleaned = cleaned.replace(/,\s*$/, ".");

  return cacheSet(paragraphCache, text, cleaned.trim());
}

/** Remove wrapping quotation marks from AI-generated text. */
export function stripWrappingQuotes(text: string): string {
  return aggressiveCleanParagraph(text);
}

/** Join paragraphs that were split mid-sentence (e.g. at percentages). */
export function fixSentenceBreakages(paragraphs: string[]): string[] {
  const fixed: string[] = [];
  let current = "";

  for (const raw of paragraphs) {
    // Input is expected to already be aggressively cleaned by callers.
    const p = raw?.trim() ?? "";
    if (!p) continue;

    const endsWithBreak =
      /[,;]\s*$/.test(p) ||
      (p.endsWith(".") && p.length < 50) ||
      /\d+\s*$/.test(p) ||
      /%\s*,?\s*$/.test(p);

    if (endsWithBreak && current) {
      current += ` ${p}`;
    } else if (endsWithBreak) {
      current = p;
    } else {
      if (current) fixed.push(current);
      current = p;
    }
  }

  if (current) fixed.push(current);

  return fixed.filter((p) => p.length > 10);
}

function parseJsonParagraphArray(content: string): string[] | null {
  const trimmed = removeJsonArtifacts(content);
  const attempts = [
    trimmed,
    `[${trimmed.replace(/,\s*$/, "")}]`,
    trimmed.startsWith("{") ? trimmed : `{ "paragraphs": [${trimmed}] }`,
  ];

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.paragraphs)
          ? parsed.paragraphs
          : null;
      if (!items?.length) continue;
      return items
        .map((item: unknown) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>;
            return String(obj.text ?? obj.paragraph ?? obj.content ?? "");
          }
          return String(item);
        })
        .filter((s: string) => s.trim().length > 0);
    } catch {
      // try next shape
    }
  }
  return null;
}

/** Parse raw AI text into clean paragraph bullets. */
export function parseAIParagraphs(raw: string): string[] {
  const content = stripThinkingAndPromptArtifacts(removeJsonArtifacts(raw));
  const jsonParagraphs = parseJsonParagraphArray(content);

  let paragraphs: string[] = jsonParagraphs ?? content
    .split("\n")
    .map((line) => aggressiveCleanParagraph(line.replace(/^[-•*\d.]+\s*/, "")))
    .filter((line) => line.length > 15 && !line.startsWith("{") && !line.startsWith("}"));

  if (paragraphs.length < 3) {
    paragraphs = content
      .split(/(?<!\d)\.\s+/)
      .map((s) => aggressiveCleanParagraph(s))
      .filter((s) => s.length > 20);
  }

  if (paragraphs.length === 0 && content.trim()) {
    paragraphs = [aggressiveCleanParagraph(content)];
  }

  return fixSentenceBreakages(paragraphs);
}

/**
 * Clean AI-generated content by removing quotation marks, thinking leakage,
 * and formatting issues. Memoized — identical inputs reuse prior results.
 */
export function cleanAIContent(content: string[]): string[] {
  if (!content?.length) return [];

  const cacheKey = content.join("\u0001");
  const cached = cacheGet(arrayCleanCache, cacheKey);
  if (cached !== undefined) return cached;

  const cleaned = fixSentenceBreakages(
    content
      .map((paragraph) => {
        if (!paragraph || typeof paragraph !== "string") return "";
        return aggressiveCleanParagraph(paragraph);
      })
      .filter((p) => p.length > 0)
  );

  return cacheSet(arrayCleanCache, cacheKey, cleaned);
}

/** Clean text for display in slide UI (tables, bullets, outcomes). */
export function cleanDisplayText(text: string): string {
  return aggressiveCleanParagraph(text);
}

export const COMMENTARY_NO_QUOTES_CONSTRAINT = `
CRITICAL FORMATTING RULES:
1. DO NOT wrap paragraphs or bullet points in quotation marks
2. DO NOT return JSON — no { "paragraphs": [ ... ] } wrappers
3. Write plain text only — one bullet per line, no leading or trailing quotes
4. Each bullet point should be plain prose, not quoted speech
5. DO NOT include thinking process, analysis steps, or prompt instructions in output

CORRECT: The market demonstrates strong fundamentals with 15% annual growth.
INCORRECT: "The market demonstrates strong fundamentals with 15% annual growth."
`.trim();

/** Clean paragraphs before rendering in slide UI. */
export function cleanParagraphsForDisplay(
  paragraphs: string[] | undefined
): string[] {
  return cleanAIContent(paragraphs ?? []);
}

/** Split effect text into sentences without breaking decimal numbers. */
export function splitEffectSentences(effect: string): string[] {
  const cleaned = cleanDisplayText(effect);
  if (!cleaned) return [];
  const parts = cleaned
    .split(/(?<!\d)\.\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [cleaned];
}
