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
import {
  annotateResearchGuardrails,
  coerceAiResearchPayload,
} from "@/lib/ai-research-integrity";

export type { AiResearchOptions, AiResearchResult } from "@/lib/constants/aiPrompts";

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

        const parsedRaw = coerceAiResearchPayload(result.json);
        if (!parsedRaw || typeof parsedRaw !== "object") {
          throw new Error("AI response JSON was not an object");
        }
        console.log("✅ Successfully parsed AI data:", parsedRaw);

        const aiData =
          options.assetType === "operational-data-centre"
            ? (parsedRaw as AiResearchResult)
            : normalizeAiResearchData(parsedRaw);

        const parsedData = annotateResearchGuardrails(
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
