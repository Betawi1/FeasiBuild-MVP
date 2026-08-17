"use client";

import { useCallback, useState } from "react";
import {
  buildUserPrompt,
  getSystemPrompt,
  normalizeAiResearchData,
  type AiResearchOptions,
  type AiResearchResult,
} from "@/lib/constants/aiPrompts";
import { extractJsonFromClaudeResponse } from "@/lib/extract-json-from-claude";
import { sendOpsAlert } from "@/lib/ops-monitor";
import { getPreferredModel } from "@/lib/puter-kv-preferences";
import { isClaudeModel } from "@/lib/puter-models";

export type { AiResearchOptions, AiResearchResult } from "@/lib/constants/aiPrompts";

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
    type?: string;
    value?: string;
    text?: string;
    content?: string;
    reasoning?: string;
    message?: { content?: string | Array<{ text?: string }> };
    choices?: Array<{ delta?: { content?: string }; text?: string }>;
  };

  const chunkType = typeof c.type === "string" ? c.type.toLowerCase() : "";
  // Reasoning / CoT must not be mixed into the JSON parse buffer
  if (
    chunkType === "reasoning" ||
    chunkType === "usage" ||
    chunkType === "compaction" ||
    chunkType === "tool_use" ||
    chunkType === "extra_content"
  ) {
    return "";
  }

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

function extractReasoningChunkText(chunk: unknown): string {
  if (!chunk || typeof chunk !== "object") return "";
  const c = chunk as { type?: string; reasoning?: string; text?: string };
  const chunkType = typeof c.type === "string" ? c.type.toLowerCase() : "";
  if (chunkType !== "reasoning") return "";
  if (typeof c.reasoning === "string") return c.reasoning;
  if (typeof c.text === "string") return c.text;
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
    let reasoningOnly = "";
    for await (const chunk of response as AsyncIterable<unknown>) {
      reasoningOnly += extractReasoningChunkText(chunk);
      fullResponse += extractStreamChunkText(chunk);
    }
    if (reasoningOnly.trim()) {
      console.log("🧠 AI Reasoning:\n", reasoningOnly.trim());
    }
    // If the provider streamed only CoT, keep it so the extractor can still try
    return fullResponse.trim() ? fullResponse : reasoningOnly;
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

function parseResearchJson(rawText: string): AiResearchResult {
  const parsed = extractJsonFromClaudeResponse(rawText);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI response JSON was not an object");
  }
  return parsed as AiResearchResult;
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

        const model = await getPreferredModel();
        const claude = isClaudeModel(model);
        const systemPrompt = getSystemPrompt(options.assetType, model);
        const userPrompt = buildUserPrompt(options);

        const chatOptions = {
          model,
          stream: true, // REQUIRED for Qwen 3.7 Plus
          temperature: 0.1,
          max_tokens: claude ? 12000 : 8000,
          ...(claude
            ? { response_format: { type: "json_object" as const } }
            : {}),
        };

        console.log("🚀 Sending payload to AI (stream)...", model);
        let response = await puter.ai.chat(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          chatOptions
        );

        let rawText = await accumulateChatResponse(response);
        console.log("🔍 Complete AI Response:", rawText);

        const reasoningMatch = rawText.match(
          /<reasoning>([\s\S]*?)<\/reasoning>/i
        );
        if (reasoningMatch?.[1]) {
          console.log("🧠 AI Reasoning:\n", reasoningMatch[1].trim());
        }

        if (!rawText.trim()) {
          throw new Error("Empty response from AI research");
        }

        let parsedRaw: AiResearchResult;
        try {
          parsedRaw = parseResearchJson(rawText);
          console.log("✅ Successfully parsed AI data:", parsedRaw);
        } catch (parseError) {
          console.warn(
            "⚠️ Streamed response was not parseable JSON — retrying without stream",
            parseError
          );
          response = await puter.ai.chat(
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            { ...chatOptions, stream: false }
          );
          rawText = await accumulateChatResponse(response);
          console.log("🔍 Non-stream retry response:", rawText);
          try {
            parsedRaw = parseResearchJson(rawText);
            console.log("✅ Successfully parsed AI data (retry):", parsedRaw);
          } catch (retryError) {
            console.error("❌ JSON Parse Error:", retryError);
            console.error("Raw Response:", rawText);
            throw new Error(
              "Failed to parse AI response. Please try again or check console for details."
            );
          }
        }

        // Data-centre AI payload uses a specialised schema (especially for Phase 1 basics).
        // `normalizeAiResearchData` rebuilds `c1_development` and can drop those fields.
        // For `operational-data-centre`, keep the raw parsed JSON and rely on `sanitizeAiData`.
        const aiData = options.assetType === "operational-data-centre"
          ? parsedRaw
          : normalizeAiResearchData(parsedRaw);

        const parsedData = sanitizeAiData(
          aiData,
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

        void sendOpsAlert(err instanceof Error ? err : String(errorMessage), {
          source: "AI Research C1/C2",
          assetType: options.assetType,
        });

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
