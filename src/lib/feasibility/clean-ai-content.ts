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

/** Aggressively strip quotes and JSON fragments from a single paragraph. */
export function aggressiveCleanParagraph(text: string): string {
  let cleaned = removeJsonArtifacts(text).trim();
  if (!cleaned) return "";

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

  cleaned = cleaned.replace(/(\d+\.?\d*%?)\s*,\s*/g, "$1, ");
  cleaned = cleaned.replace(/(\d+\.?\d*\s*million)\s*\.\s*/gi, "$1. ");
  cleaned = cleaned.replace(/\s+\./g, ".");
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  cleaned = cleaned.replace(/,\s*$/, ".");

  return cleaned.trim();
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
    const p = aggressiveCleanParagraph(raw);
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

  return fixed.map((p) => aggressiveCleanParagraph(p)).filter((p) => p.length > 10);
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
  const content = removeJsonArtifacts(raw);
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
 * Clean AI-generated content by removing quotation marks and formatting issues.
 */
export function cleanAIContent(content: string[]): string[] {
  return fixSentenceBreakages(
    content
      .map((paragraph) => {
        if (!paragraph || typeof paragraph !== "string") return "";
        return aggressiveCleanParagraph(paragraph);
      })
      .filter((p) => p.length > 0)
  );
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
