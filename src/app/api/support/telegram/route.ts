import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendOpsAlert } from "@/lib/ops-monitor";
import { DEFAULT_MODEL } from "@/lib/puter-models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[Support Bot]";
const TELEGRAM_TIMEOUT_MS = 3000;
const PUTER_TIMEOUT_MS = 20_000;
const MAX_SEEN_UPDATES = 100;
const PUTER_API_URL = "https://api.puter.com/drivers/call";

const START_REPLY =
  "Welcome to FeasiBuild Support! I'm the FeasiBuild assistant. Ask me anything about using the platform — e.g. 'How do I export my feasibility study to PDF?'";

const ESCALATION_REPLY =
  "Thanks for flagging this — I've escalated it to the founder and you'll hear back shortly.";

const FEATURE_REPLY =
  "Great suggestion — I've logged it for the product roadmap. Thank you!";

const PARSE_FAIL_REPLY =
  "I'm having a little trouble understanding that. Could you rephrase, or describe what you were trying to do in the app?";

const TRIAGE_SYSTEM_PROMPT =
  'You are the FeasiBuild Support Bot for a real estate development financial modeling platform. Classify the user\'s message into exactly one intent: BUG, BILLING, FEATURE, or FAQ. If intent is FAQ, write a helpful plain-text answer of at most 3 sentences using your knowledge of the app (6-step wizard components C1-C6, AI research benchmarks, PDF export, currency selection, asset types, Operational vs Sale streams). Reply ONLY with JSON in this exact shape: { "intent": "BUG" | "BILLING" | "FEATURE" | "FAQ", "reply": "..." }';

const INTENTS = ["BUG", "BILLING", "FEATURE", "FAQ"] as const;
type Intent = (typeof INTENTS)[number];

type TriageResult = {
  intent: Intent;
  reply: string;
};

type ChatId = number | string;

const seenUpdateIds = new Set<number>();
const seenUpdateOrder: number[] = [];

function ok(): NextResponse {
  return new NextResponse("OK", { status: 200 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function webhookSecretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isAuthorizedWebhook(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true;

  const provided =
    request.headers.get("x-telegram-bot-api-secret-header") ??
    request.headers.get("x-telegram-bot-api-secret-token") ??
    "";

  return webhookSecretMatches(provided, expected);
}

function rememberUpdate(updateId: number): boolean {
  if (seenUpdateIds.has(updateId)) return true;
  seenUpdateIds.add(updateId);
  seenUpdateOrder.push(updateId);
  if (seenUpdateOrder.length > MAX_SEEN_UPDATES) {
    const oldest = seenUpdateOrder.shift();
    if (oldest !== undefined) seenUpdateIds.delete(oldest);
  }
  return false;
}

function isStartCommand(text: string): boolean {
  return text === "/start" || /^\/start(?:@[\w_]+)?$/.test(text);
}

function isIntent(value: unknown): value is Intent {
  return typeof value === "string" && (INTENTS as readonly string[]).includes(value);
}

function extractFirstBalancedObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseTriageJson(raw: string): TriageResult | null {
  const balanced = extractFirstBalancedObject(raw);
  const candidate = balanced ?? raw.trim();
  if (!candidate) return null;

  try {
    const parsed: unknown = JSON.parse(candidate);
    if (!isRecord(parsed)) return null;
    if (!isIntent(parsed.intent) || typeof parsed.reply !== "string") return null;
    return { intent: parsed.intent, reply: parsed.reply };
  } catch {
    return null;
  }
}

function extractPuterChatText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (!isRecord(payload)) return "";

  const result = isRecord(payload.result) ? payload.result : payload;
  const message = isRecord(result.message) ? result.message : result;
  const content = message.content ?? result.content ?? result.text ?? payload.text;

  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (isRecord(part) && typeof part.text === "string") return part.text;
        return "";
      })
      .join("");
  }

  const choices = payload.choices;
  if (Array.isArray(choices) && isRecord(choices[0])) {
    const choiceMessage = isRecord(choices[0].message) ? choices[0].message : choices[0];
    if (typeof choiceMessage.content === "string") return choiceMessage.content;
  }

  return "";
}

async function triageWithPuter(userText: string): Promise<TriageResult | null> {
  const token = process.env.PUTER_AUTH_TOKEN ?? process.env.PUTER_API_KEY;
  if (!token) {
    console.error(`${LOG_PREFIX} PUTER_AUTH_TOKEN is not set`);
    await sendOpsAlert("PUTER_AUTH_TOKEN is not set", {
      source: "Support Bot Puter AI",
    });
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PUTER_TIMEOUT_MS);

  try {
    const res = await fetch(PUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        interface: "puter-chat-completion",
        method: "complete",
        args: {
          model: DEFAULT_MODEL,
          stream: false,
          temperature: 0.2,
          max_tokens: 512,
          messages: [
            { role: "system", content: TRIAGE_SYSTEM_PROMPT },
            { role: "user", content: userText },
          ],
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`${LOG_PREFIX} Puter AI failed:`, res.status, body.slice(0, 200));
      await sendOpsAlert(`Puter AI failed: ${res.status}`, {
        source: "Support Bot Puter AI",
        status: res.status,
      });
      return null;
    }

    const json: unknown = await res.json();
    if (isRecord(json) && json.success === false) {
      console.error(`${LOG_PREFIX} Puter AI returned success=false`);
      await sendOpsAlert("Puter AI returned success=false", {
        source: "Support Bot Puter AI",
      });
      return null;
    }

    const raw = extractPuterChatText(json).trim();
    if (!raw) {
      console.error(`${LOG_PREFIX} Empty Puter AI response`);
      return null;
    }

    return parseTriageJson(raw);
  } catch (error) {
    console.error(`${LOG_PREFIX} Puter AI error:`, error);
    await sendOpsAlert(error instanceof Error ? error : String(error), {
      source: "Support Bot Puter AI",
    });
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function sendTelegram(chatId: ChatId, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error(`${LOG_PREFIX} TELEGRAM_BOT_TOKEN is not set`);
    await sendOpsAlert("TELEGRAM_BOT_TOKEN is not set", {
      source: "Support Bot Telegram Send",
      chatId,
    });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `${LOG_PREFIX} Telegram sendMessage failed:`,
        res.status,
        body.slice(0, 200)
      );
      await sendOpsAlert(`Telegram sendMessage failed: ${res.status}`, {
        source: "Support Bot Telegram Send",
        chatId,
        status: res.status,
      });
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Telegram sendMessage error:`, error);
    await sendOpsAlert(error instanceof Error ? error : String(error), {
      source: "Support Bot Telegram Send",
      chatId,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function routeTriage(
  chatId: ChatId,
  userText: string,
  triage: TriageResult | null
): Promise<void> {
  if (!triage) {
    await sendTelegram(chatId, PARSE_FAIL_REPLY);
    return;
  }

  switch (triage.intent) {
    case "FAQ":
      await sendTelegram(chatId, triage.reply.trim() || PARSE_FAIL_REPLY);
      return;
    case "BUG":
    case "BILLING":
      await sendTelegram(chatId, ESCALATION_REPLY);
      await sendOpsAlert(userText, {
        source: "Support Bot Escalation",
        intent: triage.intent,
        chatId,
      });
      return;
    case "FEATURE":
      await sendTelegram(chatId, FEATURE_REPLY);
      await sendOpsAlert(userText, {
        source: "Support Bot Feature Request",
        intent: triage.intent,
        chatId,
      });
      return;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    if (!isAuthorizedWebhook(request)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body: unknown = await request.json();
    if (!isRecord(body)) return ok();

    if (typeof body.update_id === "number" && rememberUpdate(body.update_id)) {
      return ok();
    }

    const message = isRecord(body.message) ? body.message : undefined;
    if (!message || typeof message.text !== "string" || message.text.length === 0) {
      return ok();
    }

    const chat = isRecord(message.chat) ? message.chat : undefined;
    const chatId =
      chat && (typeof chat.id === "number" || typeof chat.id === "string")
        ? chat.id
        : null;
    if (chatId == null) return ok();

    const text = message.text;
    if (isStartCommand(text)) {
      await sendTelegram(chatId, START_REPLY);
      return ok();
    }

    const triage = await triageWithPuter(text);
    await routeTriage(chatId, text, triage);
    return ok();
  } catch (error) {
    console.error(`${LOG_PREFIX} Webhook handler error:`, error);
    await sendOpsAlert(error instanceof Error ? error : String(error), {
      source: "Support Bot Webhook",
    });
    return ok();
  }
}
