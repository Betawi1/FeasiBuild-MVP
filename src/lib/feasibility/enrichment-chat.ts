"use client";

import {
  forcedEmptyAttempt,
  isEnrichmentTimeout,
  recordEnrichmentAttempts,
  runAttemptLadder,
  withAttemptTimeout,
  type LadderResult,
  type LadderStep,
} from "@/lib/feasibility/enrichment-ladder";
import { runInEnrichmentPool } from "@/lib/feasibility/enrichment-pool";
import { extractPuterMessageContent, waitForPuter } from "@/lib/puter-chat";
import { getPreferredModel } from "@/lib/puter-kv-preferences";
import {
  FALLBACK_MODEL_ID,
  isQwenModel,
  resolvePuterModelId,
} from "@/lib/puter-models";

export interface EnrichmentPuterChatArgs {
  slideKey: string;
  prompt: string;
  compactPrompt: string;
  accept: (text: string) => boolean;
  temperature: number;
  maxTokens: number;
  jsonMode?: boolean;
}

async function callModel(
  model: string,
  step: LadderStep,
  args: EnrichmentPuterChatArgs
): Promise<string> {
  const puter = await waitForPuter();
  if (!puter?.ai?.chat) return "";

  const response = await puter.ai.chat(step.prompt, {
    model,
    stream: step.stream,
    temperature: args.temperature,
    max_tokens: args.maxTokens,
    ...(args.jsonMode
      ? { response_format: { type: "json_object" as const } }
      : {}),
  });
  return extractPuterMessageContent(response);
}

async function callAttempt(
  step: LadderStep,
  args: EnrichmentPuterChatArgs
): Promise<string> {
  if (forcedEmptyAttempt(step.attempt)) return "";

  const selected = resolvePuterModelId(await getPreferredModel());
  try {
    const text = await withAttemptTimeout(callModel(selected, step, args));
    return text.trim() ? text : "";
  } catch (error) {
    if (isEnrichmentTimeout(error) || isQwenModel(selected)) return "";
    try {
      const text = await withAttemptTimeout(
        callModel(FALLBACK_MODEL_ID, step, args)
      );
      return text.trim() ? text : "";
    } catch {
      return "";
    }
  }
}

/** One pool slot covers the whole 3-attempt ladder for a single slide call. */
export async function enrichmentPuterChat(
  args: EnrichmentPuterChatArgs
): Promise<LadderResult> {
  const result = await runInEnrichmentPool(() =>
    runAttemptLadder({
      prompt: args.prompt,
      compactPrompt: args.compactPrompt,
      accept: args.accept,
      call: (step) => callAttempt(step, args),
    })
  );
  recordEnrichmentAttempts(args.slideKey, result.attempts);
  return result;
}
