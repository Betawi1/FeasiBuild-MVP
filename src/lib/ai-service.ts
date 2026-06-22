"use client";

import {
  getCachedContent,
  setCachedContent,
} from "@/lib/cache-service";
import {
  cleanAIContent,
  COMMENTARY_NO_QUOTES_CONSTRAINT,
  parseAIParagraphs,
} from "@/lib/feasibility/clean-ai-content";

export {
  cleanAIContent,
  COMMENTARY_NO_QUOTES_CONSTRAINT,
} from "@/lib/feasibility/clean-ai-content";

export interface AIGenerateOptions {
  cacheKey?: string;
  forceRegenerate?: boolean;
  section?: string;
}

export interface AIProvider {
  generateCommentary(
    prompt: string,
    options?: string | AIGenerateOptions
  ): Promise<string[]>;
  generateChartData(
    prompt: string,
    options?: string | AIGenerateOptions
  ): Promise<unknown>;
  isAvailable(): boolean;
}

const PUTER_MODEL = "qwen/qwen3.6-flash";
const MAX_BULLETS = 6;
const MAX_WORDS_PER_BULLET = 30;
const MAX_TOTAL_WORDS = 150;
const MAX_RETRIES = 2;

export const COMMENTARY_LENGTH_CONSTRAINT = `
CRITICAL LENGTH CONSTRAINTS:
- Generate EXACTLY 5-6 bullet points (no more, no less)
- Each bullet point must be 1-2 sentences maximum (20-30 words per bullet)
- Total content must not exceed 150 words
- Content must fit within a 16:9 slide with charts/tables
- Be concise and impactful, not verbose
- DO NOT wrap bullet points in quotation marks — use plain text only
`.trim();

export const COMMENTARY_FORMAT_CONSTRAINT = COMMENTARY_NO_QUOTES_CONSTRAINT;

const PLACEHOLDER_PHRASES = [
  "charts and visualizations are included",
  "placeholder",
  "tbd",
  "to be determined",
  "insert here",
  "example text",
  "configure feasibility_ai_url",
  "generated dynamically via ai",
];

const WTDC_TEMPLATE_PHRASES = [
  "travel & tourism demand in",
  "capital investment into hospitality",
  "government expenditure on destination promotion",
  "non-visitor exports",
  "positioned for above-gdp growth",
  "remains a primary growth driver",
];

/** Slides known to cache old WTDC/STR template text — always bypass cache. */
export const STUBBORN_SLIDE_IDS = [
  "op-market-overview",
  "op-market-outlook",
  "op-market-revenues",
  "op-market-guests",
  "op-market-los",
  "op-market-tourism",
  "op-market-supply",
  "hosp-demand",
  "hosp-outlook",
  "hosp-revenues",
  "hosp-guests",
  "hosp-length-of-stay",
  "hosp-arrivals-historical",
  "hosp-arrivals-projected",
  "hosp-supply",
];

export function isStubbornSlideKey(key: string): boolean {
  return STUBBORN_SLIDE_IDS.some((id) => key.includes(id));
}

const PLACEHOLDER_WARNING =
  "⚠️ [WARNING: Content may contain placeholder text. Please regenerate or edit manually.]";

function resolveOptions(
  options?: string | AIGenerateOptions
): AIGenerateOptions {
  if (typeof options === "string") {
    return { section: options };
  }
  return options ?? {};
}

function extractChatText(response: unknown): string {
  if (typeof response === "string") return response;
  if (!response || typeof response !== "object") return "";
  const r = response as {
    message?: { content?: string };
    text?: string;
    content?: string;
  };
  return r.message?.content ?? r.text ?? r.content ?? "";
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function truncateBullet(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= MAX_WORDS_PER_BULLET) return text.trim();
  return `${words.slice(0, MAX_WORDS_PER_BULLET).join(" ")}…`;
}

export function hasPlaceholderContent(paragraphs: string[]): boolean {
  const fullText = paragraphs.join(" ").toLowerCase();
  return (
    paragraphs.length < 3 ||
    PLACEHOLDER_PHRASES.some((phrase) => fullText.includes(phrase)) ||
    WTDC_TEMPLATE_PHRASES.some((phrase) => fullText.includes(phrase))
  );
}

function withPlaceholderWarning(paragraphs: string[]): string[] {
  if (paragraphs.some((p) => p.includes(PLACEHOLDER_WARNING))) {
    return paragraphs;
  }
  return [...paragraphs, "", PLACEHOLDER_WARNING];
}

function parseParagraphs(raw: string): string[] {
  const bullets = parseAIParagraphs(raw).map(truncateBullet);
  let result = cleanAIContent(bullets).slice(0, MAX_BULLETS);

  let totalWords = result.reduce((sum, b) => sum + wordCount(b), 0);
  while (totalWords > MAX_TOTAL_WORDS && result.length > 1) {
    result.pop();
    totalWords = result.reduce((sum, b) => sum + wordCount(b), 0);
  }

  return result;
}

function buildRetryPrompt(originalPrompt: string): string {
  return `
CRITICAL: Previous attempt generated placeholder, WTDC template, or insufficient content.

You MUST generate UNIQUE, SPECIFIC content with:
- Real data points, percentages, and metrics
- Actual project/hotel names from the location
- Specific districts and competitor hotels (e.g. Business Bay, DIFC for Dubai)
- NO WTDC/STR template phrases like "Travel & Tourism Demand in [Country] reached approximately"
- NO generic phrases like "charts and visualizations"
- NO placeholder text

Generate 5-6 detailed bullet points with location-specific facts.

Original prompt:
${originalPrompt}
`.trim();
}

async function waitForPuter(timeoutMs = 15000): Promise<typeof window.puter> {
  if (typeof window === "undefined") return undefined;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.puter?.ai?.chat) return window.puter;
    await new Promise((r) => setTimeout(r, 100));
  }
  return undefined;
}

async function chatWithPuter(
  puter: NonNullable<typeof window.puter>,
  prompt: string
): Promise<string> {
  const response = await puter.ai.chat(prompt, { model: PUTER_MODEL });

  const content = extractChatText(response);
  if (!content || content.trim().length === 0) {
    console.error("[AI Service] Invalid response from Puter AI:", response);
    throw new Error("Invalid response from Puter AI");
  }

  return content;
}

class PuterAIProvider implements AIProvider {
  isAvailable(): boolean {
    return typeof window !== "undefined" && !!window.puter?.ai?.chat;
  }

  async generateCommentary(
    prompt: string,
    options?: string | AIGenerateOptions
  ): Promise<string[]> {
    return this.generateCommentaryWithRetry(prompt, resolveOptions(options), 0);
  }

  private async generateCommentaryWithRetry(
    prompt: string,
    options: AIGenerateOptions,
    retryCount: number
  ): Promise<string[]> {
    const { cacheKey, forceRegenerate, section } = options;
    const logKey = cacheKey ?? section ?? "unknown";
    const shortLogKey =
      logKey.length > 50 ? `${logKey.substring(0, 50)}...` : logKey;
    const isStubborn = cacheKey ? isStubbornSlideKey(cacheKey) : false;
    const skipCache = forceRegenerate || retryCount > 0;

    try {
      console.log(
        `[AI Service] Starting commentary generation for: ${shortLogKey}${retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : ""}`
      );

      if (isStubborn && retryCount === 0) {
        console.log(
          `[AI Service] Forcing regeneration for stubborn slide: ${logKey}`
        );
      }

      if (cacheKey && !skipCache) {
        const cached = await getCachedContent<string[]>(cacheKey);
        if (cached?.length) {
          const hasJsonArtifacts = cached.some(
            (p) =>
              /^\s*[\[{]/.test(p) ||
              /paragraphs?\s*:/i.test(p) ||
              /["'],?\s*$/.test(p)
          );
          const paragraphs = hasJsonArtifacts
            ? cleanAIContent(parseAIParagraphs(cached.join("\n")))
            : cleanAIContent(cached);

          if (!hasPlaceholderContent(paragraphs)) {
            console.log(`[AI Service] Cache HIT: ${cacheKey}`);
            return paragraphs;
          }

          console.log(
            `[AI Service] Cached content stale/placeholder, regenerating: ${cacheKey}`
          );
        }
      }

      console.log(`[AI Service] Cache miss, calling AI: ${logKey}`);

      const puter = await waitForPuter();
      if (!puter) {
        throw new Error(
          "Puter.js is not loaded. Ensure the script is in layout.tsx."
        );
      }

      const fullPrompt = `${prompt}\n\n${COMMENTARY_LENGTH_CONSTRAINT}\n\n${COMMENTARY_NO_QUOTES_CONSTRAINT}\n\nReturn EXACTLY 5 bullet points. One bullet per line. Plain text only — NO JSON, NO markdown code blocks, NO quotation marks.`;

      const content = await chatWithPuter(puter, fullPrompt);

      if (!content || content.trim().length === 0) {
        console.error(`[AI Service] Empty response for: ${logKey}`);
        throw new Error("Empty AI response");
      }

      const paragraphs = cleanAIContent(parseParagraphs(content));
      console.log(
        `[AI Service] Generated ${paragraphs.length} paragraphs for: ${logKey}`
      );

      if (hasPlaceholderContent(paragraphs)) {
        console.warn(
          `[AI Service] ⚠️ Placeholder or insufficient content detected for: ${logKey}`
        );
        console.warn(
          `[AI Service] Content preview: ${paragraphs[0]?.substring(0, 100)}...`
        );

        if (retryCount < MAX_RETRIES) {
          console.log(
            `[AI Service] Retry ${retryCount + 1}/${MAX_RETRIES} for: ${logKey}`
          );
          return this.generateCommentaryWithRetry(
            buildRetryPrompt(prompt),
            { ...options, forceRegenerate: true },
            retryCount + 1
          );
        }

        return withPlaceholderWarning(paragraphs);
      }

      if (cacheKey && paragraphs.length > 0) {
        await setCachedContent(cacheKey, cleanAIContent(paragraphs));
      }

      return cleanAIContent(paragraphs);
    } catch (error) {
      console.error(`[AI Service] ERROR:`, error);
      return [
        "[Content generation failed. Please try again or edit manually.]",
      ];
    }
  }

  async generateChartData(
    prompt: string,
    options?: string | AIGenerateOptions
  ): Promise<unknown> {
    const { cacheKey, forceRegenerate } = resolveOptions(options);
    const chartCacheKey = cacheKey ? `${cacheKey}_chart` : undefined;
    const logKey = chartCacheKey ?? cacheKey ?? "unknown";

    try {
      console.log(`[AI Service] Generating chart data for: ${logKey}`);

      if (chartCacheKey && !forceRegenerate) {
        const cached = await getCachedContent(chartCacheKey);
        if (cached) {
          console.log(`[AI Service] Chart cache HIT for: ${logKey}`);
          return cached;
        }
      }

      console.log(`[AI Service] Chart cache miss, calling AI: ${logKey}`);

      const puter = await waitForPuter();
      if (!puter) {
        throw new Error("Puter.js is not loaded");
      }

      const chartPrompt = `${prompt}\n\nReturn ONLY valid JSON. No markdown formatting.`;
      const content = await chatWithPuter(puter, chartPrompt);

      const jsonStr = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(jsonStr);
      console.log(`[AI Service] Chart data parsed for: ${logKey}`);

      if (chartCacheKey && parsed) {
        await setCachedContent(chartCacheKey, parsed);
      }

      return parsed;
    } catch (error) {
      console.error(`[AI Service] ERROR:`, error);
      return null;
    }
  }
}

export const aiProvider: AIProvider = new PuterAIProvider();
