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
const SKIP_AI_SUMMARY_SOURCES = new Set([
  "Support Bot Escalation",
  "Support Bot Feature Request",
]);

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
    const aiSummary = await resolveAiSummary(message, stack, context);

    await postDiscordAlert(webhookUrl, aiSummary, context, rawSnippet);
  } catch (monitorError) {
    console.error(`${LOG_PREFIX} Failed to send ops alert:`, monitorError);
  }
}

function isSupportBotAlert(context?: Record<string, unknown>): boolean {
  return (
    typeof context?.source === "string" && SKIP_AI_SUMMARY_SOURCES.has(context.source)
  );
}

async function resolveAiSummary(
  message: string,
  stack: string,
  context?: Record<string, unknown>
): Promise<string | null> {
  if (isSupportBotAlert(context)) return null;
  if (typeof window === "undefined" || !window.puter) return SERVER_AI_SUMMARY;

  try {
    return await summarizeWithPuter(message, stack, context);
  } catch (aiError) {
    console.error(`${LOG_PREFIX} Puter AI summarization failed:`, aiError);
    return fallbackSummary(message);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatContextValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return safeStringify(value);
}

function contextLabel(key: string): string {
  if (key === "source") return "Source";
  if (key === "intent") return "Intent";
  if (key === "chatId") return "Chat ID";
  return key;
}

function formatUserContext(userContext: unknown): string[] {
  const lines: string[] = [];

  if (typeof userContext === "string" && userContext.trim()) {
    lines.push(userContext.trim());
    return lines;
  }
  if (!isRecord(userContext)) return lines;

  if (typeof userContext.markdown === "string" && userContext.markdown.trim()) {
    lines.push(userContext.markdown.trim());
    return lines.filter((line) => !line.includes("tg://"));
  }

  const name =
    typeof userContext.first_name === "string" && userContext.first_name.trim()
      ? userContext.first_name.trim()
      : "Telegram user";
  const id = userContext.id ?? "unknown";
  lines.push(`User: ${name} (ID: ${id})`);

  const username =
    typeof userContext.username === "string"
      ? userContext.username.trim().replace(/^@/, "")
      : "";
  const httpsLink =
    typeof userContext.link === "string" && userContext.link.startsWith("https://t.me/")
      ? userContext.link
      : username
        ? `https://t.me/${username}`
        : null;

  if (username && httpsLink) {
    lines.push(`[Open @${username}](${httpsLink})`);
  } else {
    lines.push(
      `No public username — reply via bot: /reply ${id} <your message>`
    );
  }

  return lines;
}

function formatContextForDiscord(context?: Record<string, unknown>): string {
  if (!context || Object.keys(context).length === 0) return "{}";

  const lines: string[] = [];
  for (const [key, value] of Object.entries(context)) {
    if (key === "user_context") continue;
    if (value == null || value === "") continue;
    lines.push(`**${contextLabel(key)}:** ${formatContextValue(value)}`);
  }

  return lines.length > 0 ? lines.join("\n") : "{}";
}

async function postDiscordAlert(
  webhookUrl: string,
  aiSummary: string | null,
  context: Record<string, unknown> | undefined,
  rawSnippet: string
): Promise<void> {
  const userLines = formatUserContext(context?.user_context);
  const contextBlock = formatContextForDiscord(context);
  const description = truncate(
    [
      ...(userLines.length > 0 ? [userLines.join("\n"), ""] : []),
      ...(aiSummary ? [`**AI Summary:**\n${aiSummary}`, ""] : []),
      `**Context:**\n${contextBlock}`,
    ].join("\n"),
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
