"use client";

import {
  ENRICHMENT_ATTEMPT_TIMEOUT_MS,
  forcedEmptyAttempt,
  isEnrichmentTimeout,
  recordEnrichmentAttempts,
  runAttemptLadder,
  withAttemptTimeout,
  type LadderResult,
  type LadderStep,
} from "@/lib/feasibility/enrichment-ladder";
import {
  noteEnrichmentAttempt,
  notePuterCall,
} from "@/lib/feasibility/enrichment-memory";
import { runInEnrichmentPool } from "@/lib/feasibility/enrichment-pool";
import {
  closePuterStream,
  extractPuterMessageContent,
  waitForPuter,
} from "@/lib/puter-chat";
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

type StreamSession = {
  signal: AbortSignal;
  abort: () => void;
  bindCloser: (close: () => Promise<void>) => void;
  close: () => Promise<void>;
};

const activeSessions = new Set<StreamSession>();

function createStreamSession(): StreamSession {
  const abortController = new AbortController();
  let closer: (() => Promise<void>) | null = null;
  let closed = false;
  const session: StreamSession = {
    signal: abortController.signal,
    abort: () => abortController.abort(),
    bindCloser: (close) => {
      closer = close;
    },
    close: async () => {
      abortController.abort();
      if (closed) return;
      closed = true;
      try {
        await closer?.();
      } catch {
        /* stream already released */
      }
    },
  };
  return session;
}

/** Close any attempt streams still open at the end of a run. */
export async function releaseActivePuterStream(): Promise<void> {
  const sessions = [...activeSessions];
  activeSessions.clear();
  await Promise.all(sessions.map((session) => session.close()));
}

async function callModel(
  model: string,
  step: LadderStep,
  args: EnrichmentPuterChatArgs,
  session: StreamSession
): Promise<string> {
  const puter = await waitForPuter();
  if (!puter?.ai?.chat || session.signal.aborted) return "";

  notePuterCall();
  const response = await puter.ai.chat(step.prompt, {
    model,
    stream: step.stream,
    temperature: args.temperature,
    max_tokens: args.maxTokens,
    ...(args.jsonMode
      ? { response_format: { type: "json_object" as const } }
      : {}),
  });

  if (session.signal.aborted) {
    await closePuterStream(response);
    return "";
  }

  return extractPuterMessageContent(response, undefined, {
    signal: session.signal,
    bindCloser: session.bindCloser,
  });
}

/**
 * One model invocation. The previous attempt's stream is released before this
 * one opens, and this stream is closed on success, error, and timeout.
 */
async function runModelOnce(
  model: string,
  step: LadderStep,
  args: EnrichmentPuterChatArgs
): Promise<string> {
  const session = createStreamSession();
  activeSessions.add(session);
  try {
    const text = await withAttemptTimeout(
      callModel(model, step, args, session),
      ENRICHMENT_ATTEMPT_TIMEOUT_MS,
      () => session.abort()
    );
    return text.trim() ? text : "";
  } finally {
    await session.close();
    activeSessions.delete(session);
  }
}

async function callAttempt(
  step: LadderStep,
  args: EnrichmentPuterChatArgs
): Promise<string> {
  noteEnrichmentAttempt(step.attempt);
  if (forcedEmptyAttempt(step.attempt)) return "";

  const selected = resolvePuterModelId(await getPreferredModel());
  try {
    return await runModelOnce(selected, step, args);
  } catch (error) {
    if (isEnrichmentTimeout(error) || isQwenModel(selected)) return "";
    try {
      return await runModelOnce(FALLBACK_MODEL_ID, step, args);
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
