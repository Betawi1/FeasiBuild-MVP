"use client";

import {
  getCachedContent,
  setCachedContent,
} from "@/lib/cache-service";
import {
  COMMENTARY_NO_QUOTES_CONSTRAINT,
  parseAIParagraphs,
  stripThinkingAndPromptArtifacts,
  validateSlideContent,
} from "@/lib/feasibility/clean-ai-content";

export {
  cleanAIContent,
  clearContentCache,
  COMMENTARY_NO_QUOTES_CONSTRAINT,
  stripThinkingAndPromptArtifacts,
  validateSlideContent,
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

/** Centralized Puter model config for feasibility study commentary / charts. */
export const AI_MODEL_CONFIG = {
  FEASIBILITY_STUDY: "qwen/qwen3.7-plus",
  FALLBACK: "qwen/qwen3.7-plus",
  TEMPERATURE: 0.6,
  MAX_TOKENS: 6000,
  /** REQUIRED for Qwen 3.7 Plus on Puter */
  STREAM: true as boolean,
} as const;

if (typeof window !== "undefined") {
  console.log("[AI Service] Configuration:", {
    model: AI_MODEL_CONFIG.FEASIBILITY_STUDY,
    temperature: AI_MODEL_CONFIG.TEMPERATURE,
    maxTokens: AI_MODEL_CONFIG.MAX_TOKENS,
    stream: AI_MODEL_CONFIG.STREAM,
  });
}

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
  "thinking process:",
  "analyze the request:",
  "critical requirements:",
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
    message?: { content?: string | Array<{ text?: string }> };
    text?: string;
    content?: string;
  };
  const content = r.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => part.text ?? "").join("");
  }
  return r.text ?? r.content ?? "";
}

function extractStreamChunkText(chunk: unknown): string {
  if (typeof chunk === "string") return chunk;
  if (!chunk || typeof chunk !== "object") return "";

  const c = chunk as {
    value?: string;
    text?: string;
    content?: string;
    message?: { content?: string | Array<{ text?: string }> };
    choices?: Array<{ delta?: { content?: string }; text?: string }>;
  };

  // Never accumulate reasoning/thinking tokens into slide content
  if (typeof c.choices?.[0]?.delta?.content === "string") {
    return c.choices[0].delta.content;
  }
  if (typeof c.value === "string") return c.value;
  if (typeof c.text === "string") return c.text;
  if (typeof c.content === "string") return c.content;
  if (typeof c.message?.content === "string") return c.message.content;
  if (Array.isArray(c.message?.content)) {
    return c.message.content.map((part) => part.text ?? "").join("");
  }
  return "";
}

/** Accumulate Puter streaming (or non-streaming fallback) into a single string. */
async function handleStreamingResponse(response: unknown): Promise<string> {
  if (
    response &&
    typeof response === "object" &&
    Symbol.asyncIterator in response
  ) {
    let fullContent = "";
    for await (const chunk of response as AsyncIterable<unknown>) {
      fullContent += extractStreamChunkText(chunk);
    }
    return fullContent;
  }

  if (typeof response === "string") return response;
  return extractChatText(response);
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
  // strip + parseAIParagraphs already produce cleaned bullets — do not re-run cleanAIContent here
  const stripped = stripThinkingAndPromptArtifacts(raw);
  const bullets = parseAIParagraphs(stripped).map(truncateBullet);
  let result = bullets.slice(0, MAX_BULLETS);

  let totalWords = result.reduce((sum, b) => sum + wordCount(b), 0);
  while (totalWords > MAX_TOTAL_WORDS && result.length > 1) {
    result.pop();
    totalWords = result.reduce((sum, b) => sum + wordCount(b), 0);
  }

  return result;
}

function buildRetryPrompt(originalPrompt: string): string {
  return `
CRITICAL: Previous attempt generated placeholder, thinking-process leakage, or insufficient content.

You MUST generate UNIQUE, SPECIFIC content with:
- Real data points, percentages, and metrics
- Actual project/hotel names from the location and sub-market
- Specific districts and competitor hotels (e.g. Business Bay, DIFC for Dubai)
- NO thinking process, analysis steps, or prompt instruction echo
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
  console.log(
    "[AI Service] Generating with model:",
    AI_MODEL_CONFIG.FEASIBILITY_STUDY,
    "(stream:",
    AI_MODEL_CONFIG.STREAM,
    ")"
  );

  try {
    const response = await puter.ai.chat(prompt, {
      model: AI_MODEL_CONFIG.FEASIBILITY_STUDY,
      stream: AI_MODEL_CONFIG.STREAM, // REQUIRED for Qwen 3.7 Plus
      temperature: AI_MODEL_CONFIG.TEMPERATURE,
      max_tokens: AI_MODEL_CONFIG.MAX_TOKENS,
    });

    const content = await handleStreamingResponse(response);
    console.log("[AI Service] Generated content length:", content.length);

    if (!content || content.trim().length === 0) {
      console.error("[AI Service] Invalid/empty streaming response:", response);
      throw new Error("Invalid response from Puter AI");
    }

    console.log(
      "[AI Service] Response received from model:",
      AI_MODEL_CONFIG.FEASIBILITY_STUDY
    );

    return content;
  } catch (error: unknown) {
    console.error("[AI Service] Streaming error:", error);
    const err = error as { message?: string; error?: unknown; response?: { data?: unknown } };
    if (err?.response?.data) {
      console.error("[AI Service] API Error Details:", err.response.data);
    }
    const message =
      err?.message ||
      (typeof err?.error === "string" ? err.error : undefined) ||
      (error instanceof Error ? error.message : JSON.stringify(error));
    throw new Error(
      typeof message === "string" ? message : "Unknown streaming error"
    );
  }
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
    // Stubborn slides should still HIT cache; only force when explicitly requested or retrying.
    const skipCache = forceRegenerate || retryCount > 0;

    try {
      console.log(
        `[AI Service] Starting commentary generation for: ${shortLogKey}${retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : ""}`
      );

      if (isStubborn && skipCache && retryCount === 0) {
        console.log(
          `[AI Service] Force regenerating stubborn slide (cache bypassed): ${logKey}`
        );
      }

      if (cacheKey && !skipCache) {
        console.log(`[AI Service] Checking cache for: ${cacheKey}`);
        const cached = await getCachedContent<string[]>(cacheKey);
        if (cached?.length) {
          const hasJsonArtifacts = cached.some(
            (p) =>
              /^\s*[\[{]/.test(p) ||
              /paragraphs?\s*:/i.test(p) ||
              /["'],?\s*$/.test(p)
          );
          // Cached commentary is stored already-cleaned; only re-parse when artifacts remain
          const paragraphs = hasJsonArtifacts
            ? parseAIParagraphs(cached.join("\n"))
            : cached;

          if (!hasPlaceholderContent(paragraphs)) {
            console.log(`[AI Service] ✅ Cache HIT: ${cacheKey}`);
            return paragraphs;
          }

          console.log(
            `[AI Service] Cached content stale/placeholder, regenerating: ${cacheKey}`
          );
        } else {
          console.log(`[AI Service] ❌ Cache MISS: ${cacheKey}`);
        }
      }

      console.log(`[AI Service] Calling AI for: ${logKey}`);

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

      // parseParagraphs already strips + cleans — do not wrap with cleanAIContent again
      const paragraphs = parseParagraphs(content);
      console.log(
        `[AI Service] Generated ${paragraphs.length} paragraphs for: ${logKey}`
      );

      const validation = validateSlideContent(paragraphs.join("\n"));
      if (!validation.isValid) {
        console.warn(
          `[Feasibility Study] Content issues for ${logKey}:`,
          validation.issues
        );
      }

      if (hasPlaceholderContent(paragraphs) || !validation.isValid) {
        console.warn(
          `[AI Service] ⚠️ Placeholder, leakage, or insufficient content detected for: ${logKey}`
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
        await setCachedContent(cacheKey, paragraphs);
      }

      return paragraphs;
    } catch (error: unknown) {
      console.error(`[AI Service] Streaming error:`, error);
      const err = error as { message?: string; response?: { data?: unknown } };
      if (err?.response?.data) {
        console.error("[AI Service] API Error Details:", err.response.data);
      }
      const message =
        error instanceof Error
          ? error.message
          : typeof err?.message === "string"
            ? err.message
            : "Unknown error";
      return [`Content generation failed: ${message}`];
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
