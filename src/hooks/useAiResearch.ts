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

const AI_RESEARCH_MODEL = "qwen/qwen3.6-flash";

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

async function waitForPuter(timeoutMs = 15000): Promise<typeof window.puter> {
  if (typeof window === "undefined") return undefined;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.puter?.ai?.chat) return window.puter;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return undefined;
}

/** Extract JSON from raw AI text (markdown fences, reasoning blocks, or brace fallback). */
function extractJsonString(rawText: string): string {
  // Strip chain-of-thought reasoning blocks before JSON extraction
  let cleaned = rawText.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "").trim();

  const jsonMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch?.[1]) {
    console.log("✅ Extracted JSON from markdown block.");
    return jsonMatch[1].trim();
  }

  // Generic ``` ... ``` fence without json language tag
  const fenceMatch = cleaned.match(/```\s*([\s\S]*?)\s*```/);
  if (fenceMatch?.[1]) {
    const inner = fenceMatch[1].trim();
    if (inner.startsWith("{") || inner.startsWith("[")) {
      console.log("✅ Extracted JSON from generic markdown fence.");
      return inner;
    }
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    console.log("✅ Extracted JSON using brace fallback.");
    return cleaned.substring(firstBrace, lastBrace + 1).trim();
  }

  return cleaned.trim();
}

function parseJsonResponse(raw: string): AiResearchResult {
  const jsonString = extractJsonString(raw);
  return JSON.parse(jsonString) as AiResearchResult;
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

        console.log("🚀 Sending payload to AI...");
        const response = await puter.ai.chat(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          {
            model: AI_RESEARCH_MODEL,
            temperature: 0.1, // CRITICAL: Locks creativity for financial accuracy
          }
        );

        // Puter returns a chat object; extract the message string
        const rawText = extractChatText(response);
        console.log("🔍 RAW AI RESPONSE:", rawText);

        const reasoningMatch = rawText.match(/<reasoning>([\s\S]*?)<\/reasoning>/i);
        if (reasoningMatch?.[1]) {
          console.log("🧠 AI Reasoning:\n", reasoningMatch[1].trim());
        }

        if (!rawText.trim()) {
          throw new Error("Empty response from AI research");
        }

        const parsedData = sanitizeAiData(
          normalizeAiResearchData(parseJsonResponse(rawText)),
          options.location.currency || "USD"
        );
        console.log("🎉 Successfully parsed AI data:", parsedData);
        setIsLoading(false);
        return parsedData;
      } catch (err) {
        console.error("❌ AI Research Error Details:");
        console.error(
          "Error Message:",
          err instanceof Error ? err.message : err
        );
        console.error("Stack Trace:", err instanceof Error ? err.stack : "");
        setError(
          err instanceof Error
            ? err.message
            : "An unknown error occurred during AI research."
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
