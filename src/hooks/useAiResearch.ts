"use client";

import { useCallback, useState } from "react";
import {
  buildUserPrompt,
  getSystemPrompt,
  normalizeAiResearchData,
  type AiResearchOptions,
  type AiResearchResult,
} from "@/lib/constants/aiPrompts";

export type { AiResearchOptions, AiResearchResult } from "@/lib/constants/aiPrompts";

const AI_RESEARCH_MODEL = "qwen/qwen3.7-plus";

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
    reasoning?: string;
    message?: { content?: string | Array<{ text?: string }> };
  };

  if (typeof c.value === "string") return c.value;
  if (typeof c.text === "string") return c.text;
  if (typeof c.content === "string") return c.content;
  if (typeof c.reasoning === "string") return c.reasoning;
  if (typeof c.message?.content === "string") return c.message.content;
  if (Array.isArray(c.message?.content)) {
    return c.message.content.map((part) => part.text ?? "").join("");
  }
  return "";
}

/** Accumulate Puter streaming or non-streaming chat responses into one string. */
async function accumulateChatResponse(response: unknown): Promise<string> {
  if (
    response &&
    typeof response === "object" &&
    Symbol.asyncIterator in response
  ) {
    let fullResponse = "";
    for await (const chunk of response as AsyncIterable<unknown>) {
      fullResponse += extractStreamChunkText(chunk);
    }
    return fullResponse;
  }

  if (typeof response === "string") return response;
  return extractChatText(response);
}

async function waitForPuter(timeoutMs = 15000): Promise<typeof window.puter> {
  if (typeof window === "undefined") return undefined;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.puter?.ai?.chat) return window.puter;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return undefined;
}

function tryParseAiJson(candidate: string): AiResearchResult | null {
  try {
    return JSON.parse(candidate) as AiResearchResult;
  } catch {
    return null;
  }
}

/** Extract JSON from markdown fences or outermost `{...}` braces. */
function extractFromMarkdownOrBraces(text: string): AiResearchResult | null {
  const jsonFence = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonFence?.[1]) {
    const parsed = tryParseAiJson(jsonFence[1].trim());
    if (parsed) {
      console.log("✅ Extracted JSON from ```json fence");
      return parsed;
    }
  }

  const fence = text.match(/```\s*([\s\S]*?)\s*```/);
  if (fence?.[1]) {
    const inner = fence[1].trim();
    if (inner.startsWith("{") || inner.startsWith("[")) {
      const parsed = tryParseAiJson(inner);
      if (parsed) {
        console.log("✅ Extracted JSON from generic markdown fence");
        return parsed;
      }
    }
  }

  // Strip fence markers (handles leftover prose outside fences poorly, so try last)
  const withoutMarkdown = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  const strippedMd = tryParseAiJson(withoutMarkdown);
  if (strippedMd) return strippedMd;

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.substring(firstBrace, lastBrace + 1);
    const parsed = tryParseAiJson(candidate);
    if (parsed) {
      console.log("✅ Extracted JSON via brace bounds (length:", candidate.length, ")");
      return parsed;
    }
  }

  return null;
}

/**
 * Robust JSON extraction for AI responses that may include:
 * - markdown code fences (```json ... ```)
 * - <reasoning>...</reasoning> blocks
 * - prose before/after the JSON object
 */
function extractJsonFromResponse(text: string): AiResearchResult {
  console.log("🔍 Raw AI Response Length:", text.length);
  console.log("🔍 First 500 chars:", text.substring(0, 500));

  // Strategy 1: Try parsing the entire text first
  const direct = tryParseAiJson(text.trim());
  if (direct) return direct;
  console.log("⚠️ Direct parse failed, trying extraction strategies...");

  // Strategy 2: Prefer content after </reasoning>
  const afterReasoningParts = text.split(/<\/reasoning>/i);
  if (afterReasoningParts.length > 1) {
    const jsonPart = afterReasoningParts.slice(1).join("</reasoning>").trim();
    const parsed =
      tryParseAiJson(jsonPart) ?? extractFromMarkdownOrBraces(jsonPart);
    if (parsed) {
      console.log("✅ Parsed JSON after </reasoning>");
      return parsed;
    }
    console.log("⚠️ Post-reasoning parse failed");
  }

  // Strategy 3: Strip reasoning tags, then markdown/braces
  const withoutReasoning = text
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim();
  const stripped =
    tryParseAiJson(withoutReasoning) ??
    extractFromMarkdownOrBraces(withoutReasoning);
  if (stripped) return stripped;

  // Strategy 4: Markdown / brace extraction on full raw text
  const fromFull = extractFromMarkdownOrBraces(text);
  if (fromFull) return fromFull;

  throw new Error(
    `Unable to parse JSON from AI response. Raw response preview: ${text.substring(0, 1000)}...`
  );
}

/** Safety clamp to prevent UI-breaking hallucinations */
const clamp = (val: number, min: number, max: number) => {
  if (!Number.isFinite(val) || Number.isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
};

function sanitizeAiData(
  data: AiResearchResult,
  projectCurrency: string
): AiResearchResult {
  if (!data?.c1_development) return data;

  const currency = (projectCurrency || "USD").toUpperCase();
  console.log(`🛡️ Running AI Sanity Checks for Currency: ${currency}`);

  // CONDITIONAL FX LOGIC:
  // If user selected USD, force rate to 1. Otherwise, use the AI's researched rate.
  const researchedFx =
    typeof data.fx_rate_to_usd === "number" &&
    Number.isFinite(data.fx_rate_to_usd) &&
    data.fx_rate_to_usd > 0
      ? data.fx_rate_to_usd
      : 1.0;
  const fxRate = currency === "USD" ? 1.0 : researchedFx;
  data.fx_rate_to_usd = fxRate;
  console.log(`💱 Applied FX Rate (1 USD = ${fxRate} ${currency})`);

  // USD-based base clamps
  const USD_CLAMPS = {
    buildingRate: { min: 50, max: 5000 },
    parkingRate: { min: 20, max: 3000 },
    basementRate: { min: 20, max: 3000 },
    infrastructureRate: { min: 0, max: 1000 },
    landRate: { min: 1, max: 5000 },
    salesPrice: { min: 50, max: 10000 },
  };

  const toLocal = (usdVal: number) => usdVal * fxRate;

  const c1 = data.c1_development as Record<string, unknown>;
  const rates = c1.construction_rates as Record<string, number> | undefined;
  if (rates) {
    if (rates.building_rate_psf != null) {
      rates.building_rate_psf = clamp(
        rates.building_rate_psf,
        toLocal(USD_CLAMPS.buildingRate.min),
        toLocal(USD_CLAMPS.buildingRate.max)
      );
    }
    if (rates.parking_rate_psf != null) {
      rates.parking_rate_psf = clamp(
        rates.parking_rate_psf,
        toLocal(USD_CLAMPS.parkingRate.min),
        toLocal(USD_CLAMPS.parkingRate.max)
      );
    }
    if (rates.basement_rate_psf != null) {
      rates.basement_rate_psf = clamp(
        rates.basement_rate_psf,
        toLocal(USD_CLAMPS.basementRate.min),
        toLocal(USD_CLAMPS.basementRate.max)
      );
    }
    if (rates.infrastructure_rate_psf != null) {
      rates.infrastructure_rate_psf = clamp(
        rates.infrastructure_rate_psf,
        toLocal(USD_CLAMPS.infrastructureRate.min),
        toLocal(USD_CLAMPS.infrastructureRate.max)
      );
    }
  }

  if (typeof c1.land_rate_psf === "number") {
    c1.land_rate_psf = clamp(
      c1.land_rate_psf,
      toLocal(USD_CLAMPS.landRate.min),
      toLocal(USD_CLAMPS.landRate.max)
    );
  }

  const softCosts = c1.soft_costs as Record<string, number> | undefined;
  if (softCosts) {
    if (softCosts.sc_percentage != null) {
      softCosts.sc_percentage = clamp(softCosts.sc_percentage, 1, 30);
    }
    if (softCosts.powc_percentage != null) {
      softCosts.powc_percentage = clamp(softCosts.powc_percentage, 1, 20);
    }
  }

  const c2Sales = data.c2_sales as Record<string, number> | undefined;
  if (c2Sales && typeof c2Sales.avg_sales_price_psf === "number") {
    c2Sales.avg_sales_price_psf = clamp(
      c2Sales.avg_sales_price_psf,
      toLocal(USD_CLAMPS.salesPrice.min),
      toLocal(USD_CLAMPS.salesPrice.max)
    );
  }

  console.log("✅ Sanity Checks complete. Data is safe.");
  return data;
}

export const useAiResearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performResearch = useCallback(
    async (options: AiResearchOptions): Promise<AiResearchResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const puter = await waitForPuter();
        if (!puter?.ai?.chat) {
          throw new Error(
            "Puter.js is not loaded. Ensure the script is in layout.tsx."
          );
        }

        const systemPrompt = getSystemPrompt(options.assetType);
        const userPrompt = buildUserPrompt(options);

        console.log("🚀 Sending payload to AI (stream)...");
        const response = await puter.ai.chat(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          {
            model: AI_RESEARCH_MODEL,
            stream: true, // REQUIRED for Qwen 3.7 Plus
            temperature: 0.1, // CRITICAL: Locks creativity for financial accuracy
            max_tokens: 8000, // REQUIRED: reasoning block + full JSON output
          }
        );

        const rawText = await accumulateChatResponse(response);
        console.log("🔍 Complete AI Response:", rawText);

        const reasoningMatch = rawText.match(/<reasoning>([\s\S]*?)<\/reasoning>/i);
        if (reasoningMatch?.[1]) {
          console.log("🧠 AI Reasoning:\n", reasoningMatch[1].trim());
        }

        if (!rawText.trim()) {
          throw new Error("Empty response from AI research");
        }

        let parsedRaw: AiResearchResult;
        try {
          parsedRaw = extractJsonFromResponse(rawText);
          console.log("✅ Successfully parsed AI data:", parsedRaw);
        } catch (parseError) {
          console.error("❌ JSON Parse Error:", parseError);
          console.error("Raw Response:", rawText);
          throw new Error(
            "Failed to parse AI response. Please try again or check console for details."
          );
        }

        const parsedData = sanitizeAiData(
          normalizeAiResearchData(parsedRaw),
          options.location.currency || "USD"
        );
        console.log("🎉 Successfully normalized AI data:", parsedData);
        setIsLoading(false);
        return parsedData;
      } catch (err: any) {
        console.error("❌ AI Research Failed:");

        // Log the raw error object to see Puter's exact response
        console.error("Raw Error Object:", err);

        // Puter sometimes puts the error message in err.message or err.error
        const errorMessage = err?.message || err?.error || JSON.stringify(err);
        console.error("Extracted Error Message:", errorMessage);

        setError(
          typeof errorMessage === "string"
            ? errorMessage
            : "AI research failed. Check console for details."
        );
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    performResearch,
    isLoading,
    error,
    reset,
  };
};
