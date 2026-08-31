import { extractJsonFromClaudeResponse } from "@/lib/extract-json-from-claude";
import { getPreferredModel } from "@/lib/puter-kv-preferences";
import {
  FALLBACK_MODEL_ID,
  buildQwenFallbackNotice,
  isClaudeModel,
  isQwenModel,
  resolvePuterModelId,
} from "@/lib/puter-models";

export type PuterChatPrompt =
  | string
  | Array<{
      role: "system" | "user" | "assistant" | "tool";
      content: string;
    }>;

export type PuterChatCallOptions = {
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
  /** Override dashboard selector. Still falls back to Qwen unless this is Qwen. */
  model?: string;
  /** Fired for stream tokens (analyst). */
  onToken?: (piece: string) => void;
  /** Called once if the selected model failed and Qwen is about to run. */
  onFallbackStart?: () => void;
  /** If true, empty-or-unparseable JSON triggers the Qwen fallback. */
  requireJson?: boolean;
};

export type PuterChatResult = {
  text: string;
  modelUsed: string;
  fallbackNotice: string | null;
  json?: unknown;
};

let lastFallbackNotice: string | null = null;

export function peekLastPuterFallbackNotice(): string | null {
  return lastFallbackNotice;
}

export function consumeLastPuterFallbackNotice(): string | null {
  const notice = lastFallbackNotice;
  lastFallbackNotice = null;
  return notice;
}

function rememberFallbackNotice(notice: string | null): void {
  lastFallbackNotice = notice;
}

function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("");
}

/**
 * Canonical Puter text extraction: `response.message.content`.
 * Streaming iterators are concatenated the same way per chunk.
 */
export async function extractPuterMessageContent(
  response: unknown,
  onToken?: (piece: string) => void
): Promise<string> {
  if (
    response &&
    typeof response === "object" &&
    Symbol.asyncIterator in response
  ) {
    let full = "";
    for await (const chunk of response as AsyncIterable<unknown>) {
      const piece = extractPuterMessageContentSync(chunk);
      if (!piece) continue;
      full += piece;
      onToken?.(piece);
    }
    return full;
  }

  return extractPuterMessageContentSync(response);
}

/** Non-async: `response.message.content` (string or text parts). */
export function extractPuterMessageContentSync(response: unknown): string {
  if (typeof response === "string") return response;
  if (!response || typeof response !== "object") return "";

  const r = response as {
    type?: string;
    message?: { content?: unknown } | string;
    text?: string;
    content?: unknown;
    value?: string;
    choices?: Array<{ delta?: { content?: string }; text?: string }>;
  };

  const chunkType = typeof r.type === "string" ? r.type.toLowerCase() : "";
  if (chunkType === "error") {
    const errMsg =
      (typeof r.message === "string" && r.message) ||
      r.text ||
      "Puter stream error";
    throw new Error(errMsg);
  }
  if (
    chunkType === "reasoning" ||
    chunkType === "usage" ||
    chunkType === "compaction" ||
    chunkType === "tool_use" ||
    chunkType === "extra_content"
  ) {
    return "";
  }

  if (typeof r.message === "object" && r.message?.content != null) {
    const fromMessage = contentToString(r.message.content);
    if (fromMessage) return fromMessage;
  }
  if (typeof r.message === "string" && r.message) return r.message;

  if (typeof r.choices?.[0]?.delta?.content === "string") {
    return r.choices[0].delta.content;
  }
  if (typeof r.choices?.[0]?.text === "string") {
    return r.choices[0].text;
  }

  const topContent = contentToString(r.content);
  if (topContent) return topContent;
  if (typeof r.text === "string") return r.text;
  if (typeof r.value === "string") return r.value;
  return "";
}

/**
 * Parse JSON from a model string: strip markdown fences, slice first `{` to last `}`.
 */
export function parseJsonFromPuterText(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Model returned an empty response.");
  }

  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const sliced = unfenced.slice(start, end + 1);
    try {
      return JSON.parse(sliced);
    } catch {
      /* salvage below */
    }
  }

  return extractJsonFromClaudeResponse(raw);
}

export async function waitForPuter(
  timeoutMs = 15000
): Promise<typeof window.puter> {
  if (typeof window === "undefined") return undefined;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.puter?.ai?.chat) return window.puter;
    await new Promise((r) => setTimeout(r, 100));
  }
  return window.puter?.ai?.chat ? window.puter : undefined;
}

async function generateWithModel(
  puter: NonNullable<typeof window.puter>,
  model: string,
  prompt: PuterChatPrompt,
  extras: PuterChatCallOptions
): Promise<string> {
  const preferStream = isQwenModel(model);
  const temperature = extras.temperature ?? (
    extras.jsonMode ? 0.1 : isClaudeModel(model) ? 0.3 : 0.6
  );
  const maxTokens = extras.maxTokens ?? 6000;

  const callOnce = async (stream: boolean): Promise<string> => {
    const response = await puter.ai.chat(prompt, {
      model,
      stream,
      temperature,
      max_tokens: maxTokens,
      ...(extras.jsonMode
        ? { response_format: { type: "json_object" as const } }
        : {}),
    });
    return extractPuterMessageContent(response, extras.onToken);
  };

  let text = await callOnce(preferStream);
  if (!text.trim()) {
    console.warn(
      `[Puter Chat] Empty response from ${model} (stream=${preferStream}) — retrying flipped stream`
    );
    text = await callOnce(!preferStream);
  }
  if (!text.trim()) {
    throw new Error(`Empty response from model ${model}`);
  }
  return text;
}

/**
 * Call the dashboard-selected model; on throw / empty / JSON parse failure,
 * retry with Qwen and return a user-facing notice.
 */
export async function chatWithPuterFallback(
  puter: NonNullable<typeof window.puter>,
  prompt: PuterChatPrompt,
  extras: PuterChatCallOptions = {}
): Promise<PuterChatResult> {
  const selected = resolvePuterModelId(
    extras.model ?? (await getPreferredModel())
  );

  const run = async (model: string): Promise<PuterChatResult> => {
    const text = await generateWithModel(puter, model, prompt, extras);
    if (!extras.requireJson) {
      return { text, modelUsed: model, fallbackNotice: null };
    }
    const json = parseJsonFromPuterText(text);
    return { text, modelUsed: model, fallbackNotice: null, json };
  };

  try {
    const result = await run(selected);
    rememberFallbackNotice(null);
    console.log("[Puter Chat] Response received from model:", selected);
    return result;
  } catch (firstError) {
    console.warn(
      `[Puter Chat] ${selected} failed — trying Qwen fallback`,
      firstError
    );
    if (isQwenModel(selected)) {
      rememberFallbackNotice(null);
      throw firstError;
    }

    extras.onFallbackStart?.();
    const fallback = await run(FALLBACK_MODEL_ID);
    const notice = buildQwenFallbackNotice(selected);
    rememberFallbackNotice(notice);
    console.warn("[Puter Chat]", notice);
    return { ...fallback, fallbackNotice: notice };
  }
}
