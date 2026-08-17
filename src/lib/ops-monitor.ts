import { DEFAULT_MODEL } from "@/lib/puter-models";

const OPS_SYSTEM_PROMPT =
  "You are an expert DevOps assistant. Summarize the following application error into a 2-sentence plain-English alert. Include the likely cause and a 1-sentence suggested fix. Do not use markdown formatting.";

const DISCORD_EMBED_COLOR = 15158332;
const DISCORD_DESCRIPTION_MAX = 4096;
const DISCORD_FIELD_VALUE_MAX = 1024;
const RAW_ERROR_MAX = 800;
const DISCORD_FETCH_TIMEOUT_MS = 3000;
const PUTER_WAIT_MS = 3000;
const DEDUPE_WINDOW_MS = 60_000;
const SERVER_AI_SUMMARY = "AI summary unavailable (server context)";

const LOG_PREFIX = "[Ops Monitor]";

/** In-memory de-dupe: `${source}:${first 120 chars of message}` → last sent timestamp. */
const recentAlerts = new Map<string, number>();

/**
 * Fire-and-forget ops alert. Safe to call from catch blocks — never throws.
 * Callers must use `void sendOpsAlert(...)` so the alert never blocks the UI.
 */
export async function sendOpsAlert(
  error: Error | string,
  context?: Record<string, unknown>
): Promise<void> {
  try {
    const webhookUrl = process.env.DISCORD_OPS_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn(
        `${LOG_PREFIX} DISCORD_OPS_WEBHOOK_URL is not set; skipping alert.`
      );
      return;
    }

    const { message, stack } = normalizeError(error);
    if (isDuplicateAlert(message, context)) {
      return;
    }

    const rawSnippet = truncate(stack || message, RAW_ERROR_MAX);

    let aiSummary: string;
    if (typeof window === "undefined" || !window.puter) {
      aiSummary = SERVER_AI_SUMMARY;
    } else {
      try {
        aiSummary = await summarizeWithPuter(message, stack, context);
      } catch (aiError) {
        console.error(`${LOG_PREFIX} Puter AI summarization failed:`, aiError);
        aiSummary = fallbackSummary(message);
      }
    }

    await postDiscordAlert(webhookUrl, aiSummary, context, rawSnippet);
  } catch (monitorError) {
    console.error(`${LOG_PREFIX} Failed to send ops alert:`, monitorError);
  }
}

function isDuplicateAlert(
  message: string,
  context?: Record<string, unknown>
): boolean {
  const source =
    typeof context?.source === "string" && context.source
      ? context.source
      : "unknown";
  const key = `${source}:${message.slice(0, 120)}`;
  const now = Date.now();
  const lastSent = recentAlerts.get(key);
  if (lastSent != null && now - lastSent < DEDUPE_WINDOW_MS) {
    return true;
  }
  recentAlerts.set(key, now);
  for (const [k, ts] of recentAlerts) {
    if (now - ts >= DEDUPE_WINDOW_MS) {
      recentAlerts.delete(k);
    }
  }
  return false;
}

function normalizeError(error: Error | string): {
  message: string;
  stack: string;
} {
  if (typeof error === "string") {
    return { message: error, stack: error };
  }
  return {
    message: error.message || "Unknown error",
    stack: error.stack || error.message || "Unknown error",
  };
}

function fallbackSummary(message: string): string {
  const clipped = truncate(message.replace(/\s+/g, " ").trim(), 280);
  return `Application error: ${clipped} Likely cause is an unhandled runtime failure. Suggested fix: inspect the raw error snippet and recent deploy, then add a guard or retry around the failing path.`;
}

async function summarizeWithPuter(
  message: string,
  stack: string,
  context?: Record<string, unknown>
): Promise<string> {
  const puter = await waitForPuter(PUTER_WAIT_MS);
  if (!puter?.ai?.chat) {
    throw new Error("Puter.js is not available");
  }

  const userPrompt = [
    `Error message: ${message}`,
    `Stack trace:\n${stack}`,
    `Context:\n${safeStringify(context ?? {})}`,
  ].join("\n\n");

  const response = await puter.ai.chat(
    [
      { role: "system", content: OPS_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    {
      model: DEFAULT_MODEL,
      stream: false,
      temperature: 0.2,
      max_tokens: 256,
    }
  );

  const text = (await resolveChatText(response)).trim();
  if (!text) {
    throw new Error("Empty Puter response");
  }
  return stripMarkdown(text);
}

async function waitForPuter(
  timeoutMs: number
): Promise<typeof window.puter | undefined> {
  if (typeof window === "undefined") return undefined;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.puter?.ai?.chat) return window.puter;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return window.puter?.ai?.chat ? window.puter : undefined;
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

async function resolveChatText(response: unknown): Promise<string> {
  if (
    response &&
    typeof response === "object" &&
    Symbol.asyncIterator in response
  ) {
    let full = "";
    for await (const chunk of response as AsyncIterable<unknown>) {
      full += extractChatText(chunk);
    }
    return full;
  }
  return extractChatText(response);
}

async function postDiscordAlert(
  webhookUrl: string,
  aiSummary: string,
  context: Record<string, unknown> | undefined,
  rawSnippet: string
): Promise<void> {
  const contextJson = safeStringify(context ?? {});
  const description = truncate(
    `**AI Summary:**\n${aiSummary}\n\n**Context:**\n${contextJson}`,
    DISCORD_DESCRIPTION_MAX
  );

  const fieldValue = truncate(
    `\`\`\`${sanitizeCodeFence(rawSnippet || "(no stack)")}\`\`\``,
    DISCORD_FIELD_VALUE_MAX
  );

  const payload = {
    embeds: [
      {
        title: "🚨 FeasiBuild Ops Alert",
        description,
        color: DISCORD_EMBED_COLOR,
        timestamp: new Date().toISOString(),
        fields: [
          {
            name: "Raw Error Snippet",
            value: fieldValue,
            inline: false,
          },
        ],
      },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DISCORD_FETCH_TIMEOUT_MS
  );

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `${LOG_PREFIX} Discord webhook failed:`,
        res.status,
        truncate(body, 200)
      );
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "{}";
  } catch {
    return "[unserializable context]";
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  if (max <= 1) return "…";
  return `${text.slice(0, max - 1)}…`;
}

function sanitizeCodeFence(text: string): string {
  return text.replace(/```/g, "'''");
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_#>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
