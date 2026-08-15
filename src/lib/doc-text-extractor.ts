/**
 * Strip MDX / Markdown / TSX documentation down to LLM-readable text.
 *
 * HOW STEP SECTIONS ARE AUTHORED (verified against src/app/docs/):
 * Docs are TSX pages, not Markdown/MDX. Operational and Sale C1–C4 steps are
 * JSX <h3> headings, e.g.
 *   <h3 className="text-xl font-semibold text-emerald-400 mb-2">
 *     Step 3: Operational Asset Type
 *   </h3>
 * Operational C5 uses the same pattern with "Tab N:" instead of "Step N:".
 * There is no MDX <StepHeading number={3} /> component and no bold-only
 * `**Step 3:**` authoring. After extractDocText(), those headings become:
 *   ### Step 3: Operational Asset Type
 *
 * extractStepSection requires the colon after the number so prose like
 * "Step 4 now captures…" is not treated as a heading.
 */

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");
}

function stripTagsKeepText(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function convertSemanticTags(html: string): string {
  let text = html;

  text = text.replace(/<br\s*\/?>/gi, "\n");

  text = text.replace(
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi,
    (_, inner: string) => `\n# ${stripTagsKeepText(inner).trim()}\n`
  );
  text = text.replace(
    /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi,
    (_, inner: string) => `\n## ${stripTagsKeepText(inner).trim()}\n`
  );
  text = text.replace(
    /<h3\b[^>]*>([\s\S]*?)<\/h3>/gi,
    (_, inner: string) => `\n### ${stripTagsKeepText(inner).trim()}\n`
  );
  text = text.replace(
    /<h4\b[^>]*>([\s\S]*?)<\/h4>/gi,
    (_, inner: string) => `\n#### ${stripTagsKeepText(inner).trim()}\n`
  );

  text = text.replace(
    /<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (_, _tag: string, inner: string) => `**${stripTagsKeepText(inner).trim()}**`
  );
  text = text.replace(
    /<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (_, _tag: string, inner: string) => `*${stripTagsKeepText(inner).trim()}*`
  );

  text = text.replace(
    /<li\b[^>]*>([\s\S]*?)<\/li>/gi,
    (_, inner: string) => `- ${stripTagsKeepText(inner).trim()}\n`
  );

  text = text.replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href: string, inner: string) =>
      `[${stripTagsKeepText(inner).trim()}](${href})`
  );

  text = text.replace(
    /<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (_, _tag: string, inner: string) => `${stripTagsKeepText(inner).trim()} | `
  );

  text = text.replace(
    /<\/(p|div|section|article|header|tr|table|thead|tbody|ul|ol)>/gi,
    "\n"
  );

  return text;
}

export function extractDocText(rawContent: string): string {
  let text = rawContent.replace(/^\uFEFF/, "");

  text = text.replace(/^---[\s\S]*?---\s*/, "");
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  text = text.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  text = text.replace(/^["']use client["'];?\s*$/gm, "");
  text = text.replace(/^import\s[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "");
  text = text.replace(/^import\s+["'][^"']+["'];?\s*$/gm, "");
  text = text.replace(/^export\s+\{[^}]+\}.*$/gm, "");
  text = text.replace(
    /^export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{/gm,
    ""
  );
  text = text.replace(/^export\s+default\s+/gm, "");
  text = text.replace(
    /^export\s+(const|let|var|async function|function|class|type|interface)\s+/gm,
    ""
  );

  text = text.replace(/```[\s\S]*?```/g, "\n[Code block removed]\n");
  text = text.replace(/`{3,}[\s\S]*?`{3,}/g, "\n[Code block removed]\n");

  text = text.replace(/\breturn\s*\(/g, "");
  text = text.replace(/^\s*\)\s*;?\s*$/gm, "");

  text = text.replace(/\{\s*["']\s*["']\s*\}/g, " ");
  text = text.replace(/\{\s*["']([^"']*)["']\s*\}/g, "$1");

  text = convertSemanticTags(text);
  text = text.replace(/<[^>]+>/g, "");
  text = decodeEntities(text);

  text = text.replace(/\{/g, "");
  text = text.replace(/\}/g, "");
  text = text.replace(/className=["'][^"']*["']/g, "");

  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .map((line) => line.replace(/^- •\s*/, "- "))
    .filter((line, index, lines) => !(line === "" && lines[index - 1] === ""))
    .join("\n")
    .replace(/\n(?:\)\s*;?|\}+)\s*$/g, "")
    .trim();

  return text;
}

export type StepSectionMatch = {
  number: number;
  index: number;
};

/**
 * Match Step/Tab headings in cleaned Markdown OR raw TSX/HTML.
 * Convention is "Step N: <Title>" / "Tab N: <Title>". The colon is required so
 * body copy such as "Step 4 now captures…" does not start a new section.
 * Covers: `### Step 3:`, `<h3 ...>Step 3:`, `**Step 3:**`, and indented JSX.
 */
const STEP_HEADING_RE =
  /(?:^|\n)[ \t]*(?:#{1,6}[ \t]+)?(?:<\/?h[1-6][^>]*>[ \t]*)?(?:\*\*)?Step[ \t]+(\d+)\s*:/gi;

const TAB_HEADING_RE =
  /(?:^|\n)[ \t]*(?:#{1,6}[ \t]+)?(?:<\/?h[1-6][^>]*>[ \t]*)?(?:\*\*)?Tab[ \t]+(\d+)\s*:/gi;

export function findStepSectionMatches(text: string): StepSectionMatch[] {
  if (!text) return [];
  const matches: StepSectionMatch[] = [];
  const seen = new Set<string>();

  const collect = (re: RegExp) => {
    const copy = new RegExp(re.source, re.flags);
    let match: RegExpExecArray | null = copy.exec(text);
    while (match) {
      const number = Number(match[1]);
      const index = match.index + (match[0].startsWith("\n") ? 1 : 0);
      const key = `${index}:${number}`;
      if (!seen.has(key) && Number.isFinite(number) && number >= 1) {
        seen.add(key);
        matches.push({ number, index });
      }
      match = copy.exec(text);
    }
  };

  collect(STEP_HEADING_RE);
  collect(TAB_HEADING_RE);
  matches.sort((a, b) => a.index - b.index);
  return matches;
}

/**
 * Slice documentation to a single wizard step (or C5 tab) section.
 * Returns "" when no matching heading exists so the caller can fall back.
 */
export function extractStepSection(
  cleanText: string,
  stepNumber: number
): string {
  const n = Math.trunc(Number(stepNumber));
  if (!Number.isFinite(n) || n < 1 || typeof cleanText !== "string") {
    return "";
  }
  if (!cleanText.trim()) return "";

  const matches = findStepSectionMatches(cleanText);
  const start = matches.find((item) => item.number === n);
  if (!start) return "";

  // End at the next heading with a different Step/Tab number so a same-number
  // false positive (if any remain) cannot truncate the real section.
  const next = matches.find(
    (item) => item.index > start.index && item.number !== start.number
  );
  const end = next ? next.index : cleanText.length;
  return cleanText.slice(start.index, end).trim();
}
