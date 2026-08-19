import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendOpsAlert } from "@/lib/ops-monitor";
import { DEFAULT_MODEL } from "@/lib/puter-models";
import {
  describeSupportStartPayload,
  isValidStartPayload,
} from "@/lib/constants/support";
import { sendSupportEmail } from "@/lib/support-resend";

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

type TelegramUserContext = {
  username: string | null;
  first_name: string;
  id: ChatId;
  link: string | null;
  markdown: string;
};

const REPLY_USAGE = "/reply <chat_id> <message>";
const REPLY_UNAUTHORIZED = "Not authorized.";
const MISSING_DRAFT_REPLY_HINT =
  "To approve or reject a draft: first long-press the draft message and choose Reply (or click the reply arrow on desktop), then send /send, your edited text, or /reject.";

const seenUpdateIds = new Set<number>();
const seenUpdateOrder: number[] = [];
const cameFromByChatId = new Map<string, string>();

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

function parseStartCommand(
  text: string
): { isStart: true; payload: string | null } | null {
  const match = text.match(
    /^\/start(?:@[\w_]+)?(?:\s+([A-Za-z0-9_-]+))?\s*$/
  );
  if (!match) return null;
  const raw = match[1] ?? "";
  const payload = raw && isValidStartPayload(raw) ? raw : null;
  return { isStart: true, payload };
}

function rememberCameFrom(chatId: ChatId, readable: string): void {
  cameFromByChatId.set(String(chatId), readable);
}

function getCameFrom(chatId: ChatId): string | undefined {
  return cameFromByChatId.get(String(chatId));
}

function isFounderReviewCommand(text: string): boolean {
  const command = text.trim();
  return command === "/reject" || command === "/send" || command.startsWith("/send");
}

function isReplyCommand(text: string): boolean {
  return text === "/reply" || text.startsWith("/reply ");
}

function isFounder(fromId: unknown): boolean {
  const founderId = process.env.FOUNDER_TELEGRAM_ID;
  if (!founderId) return false;
  return String(fromId) === founderId;
}

function parseReplyCommand(
  text: string
): { chatId: string; message: string } | null {
  const match = text.match(/^\/reply\s+(-?\d+)\s+([\s\S]+)$/);
  if (!match) return null;
  const chatId = match[1];
  const message = match[2]?.trim() ?? "";
  if (!chatId || !message) return null;
  return { chatId, message };
}

type PriorityEmailDraft = {
  name: string;
  email: string;
  subject: string;
  messageId: string;
  draft: string;
};

function parsePriorityEmailDraft(text: string): PriorityEmailDraft | null {
  if (!text.includes("---DRAFT---")) return null;

  const fromMatch = text.match(/^From:\s*(.*?)\s*<([^>\s]+)>\s*$/m);
  const subjectMatch = text.match(/^Subject:\s*(.+)$/m);
  const idMatch = text.match(/^Message-Id:\s*(.*)$/m);
  const draftMatch = text.match(/---DRAFT---\s*([\s\S]*?)\s*---END---/);
  if (!fromMatch?.[2] || !subjectMatch?.[1] || !draftMatch) return null;

  return {
    name: fromMatch[1].trim() || "Customer",
    email: fromMatch[2].trim(),
    subject: subjectMatch[1].trim(),
    messageId: idMatch?.[1]?.trim() ?? "",
    draft: draftMatch[1].trim(),
  };
}

function asId(value: unknown): ChatId | null {
  if (typeof value === "number" || typeof value === "string") return value;
  return null;
}

function extractTelegramUser(
  message: Record<string, unknown>,
  fallbackChatId: ChatId
): TelegramUserContext {
  const from = isRecord(message.from) ? message.from : undefined;
  const id = asId(from?.id) ?? fallbackChatId;
  const rawUsername =
    from && typeof from.username === "string" ? from.username.trim().replace(/^@/, "") : "";
  const username = rawUsername.length > 0 ? rawUsername : null;
  const first_name =
    from && typeof from.first_name === "string" && from.first_name.trim()
      ? from.first_name.trim()
      : "Telegram user";

  const link = username ? `https://t.me/${username}` : null;
  const markdown = username
    ? `User: ${first_name} (ID: ${id})\n[Open @${username}](https://t.me/${username})`
    : `User: ${first_name} (ID: ${id})\nNo public username — reply via bot: /reply ${id} <your message>`;

  return { username, first_name, id, link, markdown };
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

async function editTelegramMessage(
  chatId: ChatId,
  messageId: ChatId,
  text: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error(`${LOG_PREFIX} TELEGRAM_BOT_TOKEN is not set`);
    await sendOpsAlert("TELEGRAM_BOT_TOKEN is not set", {
      source: "Support Bot Telegram Edit",
      chatId,
    });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/editMessageText`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
        }),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `${LOG_PREFIX} Telegram editMessageText failed:`,
        res.status,
        body.slice(0, 200)
      );
      await sendOpsAlert(`Telegram editMessageText failed: ${res.status}`, {
        source: "Support Bot Telegram Edit",
        chatId,
        status: res.status,
      });
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Telegram editMessageText error:`, error);
    await sendOpsAlert(error instanceof Error ? error : String(error), {
      source: "Support Bot Telegram Edit",
      chatId,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handlePriorityEmailReview(
  message: Record<string, unknown>,
  chatId: ChatId,
  text: string
): Promise<boolean> {
  const from = isRecord(message.from) ? message.from : undefined;
  if (!isFounder(from?.id)) return false;

  const replyTo = isRecord(message.reply_to_message)
    ? message.reply_to_message
    : undefined;
  const replyText =
    replyTo && typeof replyTo.text === "string" ? replyTo.text : "";
  if (!replyText.includes("---DRAFT---")) {
    if (isFounderReviewCommand(text)) {
      await sendTelegram(chatId, MISSING_DRAFT_REPLY_HINT);
      return true;
    }
    return false;
  }

  const parsed = parsePriorityEmailDraft(replyText);
  const draftMessageId = replyTo ? asId(replyTo.message_id) : null;

  if (!parsed) {
    await sendTelegram(
      chatId,
      "Could not parse that draft. Reply again with /send, /reject, or your edited text."
    );
    return true;
  }

  const command = text.trim();
  if (command === "/reject") {
    if (draftMessageId != null) {
      await editTelegramMessage(chatId, draftMessageId, "❌ Rejected.");
    }
    return true;
  }

  const body = command === "/send" ? parsed.draft : text;
  if (!body.trim()) {
    await sendTelegram(chatId, "Draft is empty — nothing to send.");
    return true;
  }

  try {
    await sendSupportEmail({
      to: parsed.email,
      subject: `Re: ${parsed.subject}`,
      text: body,
      inReplyTo: parsed.messageId || undefined,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Priority email send failed:`, error);
    await sendOpsAlert(error instanceof Error ? error : String(error), {
      source: "Support Bot Priority Email Send",
      chatId,
      customer: parsed.email,
    });
    await sendTelegram(chatId, "Failed to send the email. Please try again.");
    return true;
  }

  if (draftMessageId != null) {
    await editTelegramMessage(
      chatId,
      draftMessageId,
      `✅ SENT to ${parsed.email}`
    );
  }
  return true;
}

async function routeTriage(
  chatId: ChatId,
  userText: string,
  triage: TriageResult | null,
  userContext: TelegramUserContext
): Promise<void> {
  if (!triage) {
    await sendTelegram(chatId, PARSE_FAIL_REPLY);
    return;
  }

  const cameFrom = getCameFrom(chatId);
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
        user_context: userContext,
        ...(cameFrom ? { came_from: cameFrom } : {}),
      });
      return;
    case "FEATURE":
      await sendTelegram(chatId, FEATURE_REPLY);
      await sendOpsAlert(userText, {
        source: "Support Bot Feature Request",
        intent: triage.intent,
        chatId,
        user_context: userContext,
        ...(cameFrom ? { came_from: cameFrom } : {}),
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
    const chatId = asId(chat?.id);
    if (chatId == null) return ok();

    const userContext = extractTelegramUser(message, chatId);

    const text = message.text;
    if (await handlePriorityEmailReview(message, chatId, text)) {
      return ok();
    }

    const start = parseStartCommand(text);
    if (start) {
      let reply = START_REPLY;
      if (start.payload) {
        const readable = describeSupportStartPayload(start.payload);
        rememberCameFrom(chatId, readable);
        reply = `${START_REPLY}\n\nI see you're coming from ${readable} — how can I help?`;
      }
      await sendTelegram(chatId, reply);
      return ok();
    }

    if (isReplyCommand(text)) {
      const from = isRecord(message.from) ? message.from : undefined;
      if (!isFounder(from?.id)) {
        await sendTelegram(chatId, REPLY_UNAUTHORIZED);
        return ok();
      }
      const parsed = parseReplyCommand(text);
      if (!parsed) {
        await sendTelegram(chatId, REPLY_USAGE);
        return ok();
      }
      await sendTelegram(parsed.chatId, parsed.message);
      await sendTelegram(chatId, `Sent ✅ to chat ${parsed.chatId}`);
      return ok();
    }

    const triage = await triageWithPuter(text);
    await routeTriage(chatId, text, triage, userContext);
    return ok();
  } catch (error) {
    console.error(`${LOG_PREFIX} Webhook handler error:`, error);
    await sendOpsAlert(error instanceof Error ? error : String(error), {
      source: "Support Bot Webhook",
    });
    return ok();
  }
}
