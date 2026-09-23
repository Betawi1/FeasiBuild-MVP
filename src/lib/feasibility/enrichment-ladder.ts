/** Per-attempt ceiling. A timeout counts as an empty stream and advances the ladder. */
export const ENRICHMENT_ATTEMPT_TIMEOUT_MS = 75_000;

const FALLBACK_FLAG = "__aiFallback";

export type EnrichmentAttempt = 1 | 2 | 3;

export interface LadderStep {
  attempt: EnrichmentAttempt;
  stream: boolean;
  prompt: string;
}

export interface LadderResult {
  ok: boolean;
  text: string;
  attempts: number;
}

const attemptsBySlide = new Map<string, number>();
const warnedSlideKeys = new Set<string>();

export function resetEnrichmentDiagnostics(): void {
  attemptsBySlide.clear();
  warnedSlideKeys.clear();
}

export function recordEnrichmentAttempts(slideKey: string, attempts: number): void {
  const prev = attemptsBySlide.get(slideKey);
  attemptsBySlide.set(
    slideKey,
    prev == null ? attempts : Math.max(prev, attempts)
  );
}

export function getEnrichmentAttempts(slideKey: string): number {
  return attemptsBySlide.get(slideKey) ?? 0;
}

/** At most one chart-skip warning per slide key for the current run. */
export function warnChartSkippedOnce(slideKey: string): void {
  if (warnedSlideKeys.has(slideKey)) return;
  warnedSlideKeys.add(slideKey);
  console.warn("[generateChartData] chart JSON unavailable — skipping chart.");
}

export function logEnrichmentDiagnostics(
  statuses: Record<string, { status: string; attempts: number }>
): void {
  if (process.env.NODE_ENV === "production") return;
  const lines = Object.keys(statuses)
    .sort()
    .map((key) => {
      const row = statuses[key]!;
      return `${key} -> ${row.status} -> ${row.attempts}`;
    });
  console.info(`[Enrichment]\n${lines.join("\n")}`);
}

/**
 * Dev-only. `window.__FEASIBUILD_FORCE_EMPTY_STREAM_ATTEMPTS = 1` makes attempt 1
 * look empty so the ladder must recover. `3` fails every attempt.
 */
export function forcedEmptyAttempt(attempt: number): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const flag = (
    globalThis as { __FEASIBUILD_FORCE_EMPTY_STREAM_ATTEMPTS?: unknown }
  ).__FEASIBUILD_FORCE_EMPTY_STREAM_ATTEMPTS;
  return typeof flag === "number" && flag >= attempt;
}

export function asFallbackCommentary(paragraphs: string[]): string[] {
  const copy = paragraphs.slice();
  Object.defineProperty(copy, FALLBACK_FLAG, {
    value: true,
    enumerable: false,
  });
  return copy;
}

export function isAiFallbackCommentary(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  if ((value as unknown as Record<string, unknown>)[FALLBACK_FLAG] === true) {
    return true;
  }
  return value.some(
    (line) =>
      typeof line === "string" &&
      (/content generation failed/i.test(line) ||
        /content may contain placeholder/i.test(line))
  );
}

function chartHasData(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const data = (value as { data?: unknown }).data;
  return Array.isArray(data) && data.length > 0;
}

/** True when extracted chart JSON has a non-empty series. Partial shells are rejected. */
export function chartPayloadUsable(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== "object") return false;

  if (Array.isArray(parsed)) {
    return parsed.length > 0 && parsed.every(chartHasData);
  }

  const record = parsed as Record<string, unknown>;
  if (Array.isArray(record.charts)) {
    return record.charts.length > 0 && record.charts.every(chartHasData);
  }

  const named = ["chart", "chart1", "chart2", "pieChart"]
    .filter((key) => key in record)
    .map((key) => record[key]);
  if (named.length > 0) return named.every(chartHasData);
  if ("data" in record) return chartHasData(record);
  return false;
}

export function isPersistableEnrichmentContent(content: unknown): boolean {
  if (content == null) return false;
  if (isAiFallbackCommentary(content)) return false;
  if (Array.isArray(content) && content.length === 0) return false;
  if (
    Array.isArray(content) &&
    content.every((item) => typeof item === "string")
  ) {
    return true;
  }
  return chartPayloadUsable(content);
}

/** Dev assert plus a boolean gate. Null and fallback payloads must not be stored. */
export function guardEnrichmentCacheWrite(
  cacheKey: string,
  content: unknown
): boolean {
  const ok = isPersistableEnrichmentContent(content);
  if (!ok && process.env.NODE_ENV !== "production") {
    console.assert(
      false,
      `[Cache] refused non-success enrichment write for ${cacheKey}`
    );
  }
  return ok;
}

export function buildCompactChartPrompt(prompt: string): string {
  const marker = prompt.search(/Return ONLY|\{/);
  const body =
    marker > 0 ? prompt.slice(marker) : prompt.slice(Math.max(0, prompt.length - 2500));
  return [
    "Respond with compact raw JSON only.",
    "Do NOT wrap the JSON in quotation marks.",
    "Do NOT use markdown fences.",
    "Keep the reply under 3,500 tokens.",
    "The response must start with { or [.",
    body,
  ].join("\n");
}

export function buildCondensedCommentaryPrompt(prompt: string): string {
  const brief = prompt.length > 2200 ? `${prompt.slice(0, 2200)}\n…` : prompt;
  return [
    "Write exactly 5 concise bullet points, one per line.",
    "Plain text only. No JSON, no markdown, no quotation marks, no Source lines.",
    "Use specific figures for the location and project in the brief.",
    brief,
  ].join("\n\n");
}

export async function withAttemptTimeout<T>(
  task: Promise<T>,
  timeoutMs = ENRICHMENT_ATTEMPT_TIMEOUT_MS
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("ENRICHMENT_TIMEOUT"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isEnrichmentTimeout(error: unknown): boolean {
  return error instanceof Error && error.message === "ENRICHMENT_TIMEOUT";
}

/**
 * Attempt 1 streams. Attempt 2 repeats the same prompt without streaming.
 * Attempt 3 uses the compact prompt without streaming.
 * `accept` rejects empty text and chart JSON that extracts to null or a partial shell.
 */
export async function runAttemptLadder(args: {
  prompt: string;
  compactPrompt: string;
  call: (step: LadderStep) => Promise<string>;
  accept: (text: string) => boolean;
}): Promise<LadderResult> {
  const steps: LadderStep[] = [
    { attempt: 1, stream: true, prompt: args.prompt },
    { attempt: 2, stream: false, prompt: args.prompt },
    { attempt: 3, stream: false, prompt: args.compactPrompt },
  ];

  let last = "";
  for (const step of steps) {
    let text = "";
    try {
      text = (await args.call(step)) ?? "";
    } catch {
      text = "";
    }
    last = text;
    if (text.trim() && args.accept(text)) {
      return { ok: true, text, attempts: step.attempt };
    }
  }

  return { ok: false, text: last, attempts: 3 };
}
