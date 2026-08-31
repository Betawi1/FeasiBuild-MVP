"use client";

import { useCallback, useState } from "react";
import {
  buildUserPrompt,
  getSystemPrompt,
  normalizeAiResearchData,
  type AiResearchOptions,
  type AiResearchResult,
} from "@/lib/constants/aiPrompts";
import { sendOpsAlert } from "@/lib/ops-monitor";
import {
  chatWithPuterFallback,
  waitForPuter,
} from "@/lib/puter-chat";
import { getPreferredModel } from "@/lib/puter-kv-preferences";
import { isClaudeModel } from "@/lib/puter-models";

export type { AiResearchOptions, AiResearchResult } from "@/lib/constants/aiPrompts";

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

  const researchedFx =
    typeof data.fx_rate_to_usd === "number" &&
    Number.isFinite(data.fx_rate_to_usd) &&
    data.fx_rate_to_usd > 0
      ? data.fx_rate_to_usd
      : 1.0;
  const fxRate = currency === "USD" ? 1.0 : researchedFx;
  data.fx_rate_to_usd = fxRate;
  console.log(`💱 Applied FX Rate (1 USD = ${fxRate} ${currency})`);

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
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const performResearch = useCallback(
    async (options: AiResearchOptions): Promise<AiResearchResult | null> => {
      setIsLoading(true);
      setError(null);
      setFallbackNotice(null);

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

        console.log("🚀 Sending payload to AI...", model);
        const result = await chatWithPuterFallback(
          puter,
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          {
            jsonMode: true,
            requireJson: true,
            temperature: 0.1,
            maxTokens: claude ? 12000 : 8000,
          }
        );

        console.log("🔍 Complete AI Response:", result.text);
        if (result.fallbackNotice) {
          setFallbackNotice(result.fallbackNotice);
        }

        const parsedRaw = result.json as AiResearchResult;
        if (!parsedRaw || typeof parsedRaw !== "object") {
          throw new Error("AI response JSON was not an object");
        }
        console.log("✅ Successfully parsed AI data:", parsedRaw);

        const aiData =
          options.assetType === "operational-data-centre"
            ? parsedRaw
            : normalizeAiResearchData(parsedRaw);

        const parsedData = sanitizeAiData(
          aiData,
          options.location.currency || "USD"
        );
        console.log("🎉 Successfully normalized AI data:", parsedData);
        setIsLoading(false);
        return parsedData;
      } catch (err: unknown) {
        console.error("❌ AI Research Failed:");
        console.error("Raw Error Object:", err);

        const errorMessage =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : err && typeof err === "object" && "error" in err
              ? String((err as { error?: unknown }).error)
              : String(err);
        console.error("Extracted Error Message:", errorMessage);

        void sendOpsAlert(err instanceof Error ? err : String(errorMessage), {
          source: "AI Research C1/C2",
          assetType: options.assetType,
        });

        setError(
          typeof errorMessage === "string" && errorMessage
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
    setFallbackNotice(null);
    setIsLoading(false);
  }, []);

  return {
    performResearch,
    isLoading,
    error,
    fallbackNotice,
    reset,
  };
};
