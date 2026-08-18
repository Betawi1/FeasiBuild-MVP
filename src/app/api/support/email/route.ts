import { NextResponse } from "next/server";
import { SUPPORT_TELEGRAM_URL } from "@/lib/constants/support";
import { getCustomerTier } from "@/lib/entitlements";
import { sendOpsAlert } from "@/lib/ops-monitor";
import {
  extractWebhookEmailId,
  fetchReceivedEmail,
  isEmailReceivedEvent,
  sendSupportEmail,
  type ReceivedEmail,
} from "@/lib/support-resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[Support Email]";
const PUTER_API_URL = "https://api.puter.com/drivers/call";
const PUTER_TIMEOUT_MS = 60_000;
const PUTER_DRAFT_MODEL = "gpt-4o-mini";
const TELEGRAM_TIMEOUT_MS = 3000;
const TELEGRAM_MAX_CHARS = 4096;
const MAX_SEEN_EMAILS = 100;

const DRAFT_FALLBACK = "AI drafting unavailable — reply manually.";

const DRAFT_SYSTEM_PROMPT =
  "You are the FeasiBuild Support Team. Draft a professional, concise (max 4 sentences) reply to this paying customer using your knowledge of the 6-step wizard (C1-C6), AI research, both streams, and PDF reporting.";

const seenEmailIds = new Set<string>();
const seenEmailOrder: string[] = [];

function ok(): NextResponse {
  return new NextResponse("OK", { status: 200 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractEmailFromHeader(fromHeader: string): string {
  const trimmed = fromHeader.trim();
  const angled = trimmed.match(/<([^>]+)>/);
  const raw = angled?.[1] ?? trimmed.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return raw.trim().toLowerCase();
}

function rememberEmail(id: string): boolean {
  if (seenEmailIds.has(id)) return true;
  seenEmailIds.add(id);
  seenEmailOrder.push(id);
  if (seenEmailOrder.length > MAX_SEEN_EMAILS) {
    const oldest = seenEmailOrder.shift();
    if (oldest !== undefined) seenEmailIds.delete(oldest);
  }
  return false;
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
    const choiceMessage = isRecord(choices[0].message)
      ? choices[0].message
      : choices[0];
    if (typeof choiceMessage.content === "string") return choiceMessage.content;
  }

  return "";
}

async function draftWithPuter(email: ReceivedEmail): Promise<string | null> {
  const token = process.env.PUTER_AUTH_TOKEN ?? process.env.PUTER_API_KEY;
  if (!token) {
    console.error(`${LOG_PREFIX} PUTER_AUTH_TOKEN is not set`);
    return null;
  }

  const userPrompt = [
    `From: ${email.fromName} <${email.fromEmail}>`,
    `Subject: ${email.subject}`,
    "",
    email.text || "(no text body)",
  ].join("\n");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PUTER_TIMEOUT_MS);
  const startedAt = Date.now();

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
          model: PUTER_DRAFT_MODEL,
          stream: false,
          temperature: 0.3,
          max_tokens: 400,
          messages: [
            { role: "system", content: DRAFT_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`${LOG_PREFIX} Puter draft failed:`, res.status, body.slice(0, 200));
      return null;
    }

    const json: unknown = await res.json();
    if (isRecord(json) && json.success === false) return null;
    const text = extractPuterChatText(json).trim();
    return text || null;
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined;
    console.error(`${LOG_PREFIX} Puter draft error:`, message);
    return null;
  } finally {
    clearTimeout(timeoutId);
    console.log(`Puter draft took ${Date.now() - startedAt}ms`);
  }
}

function buildFounderDraftMessage(
  email: ReceivedEmail,
  draft: string
): string {
  const messageId = email.messageId || email.id;
  const body = [
    "📧 PRIORITY EMAIL — DRAFT",
    `From: ${email.fromName} <${email.fromEmail}>`,
    `Subject: ${email.subject}`,
    `Message-Id: ${messageId}`,
    "---DRAFT---",
    draft,
    "---END---",
    'Reply to this message with "/send" to approve as-is, or reply with your edited text to send the edited version, or "/reject" to discard.',
  ].join("\n");

  if (body.length <= TELEGRAM_MAX_CHARS) return body;

  const overhead = body.length - draft.length;
  const maxDraft = Math.max(40, TELEGRAM_MAX_CHARS - overhead - 1);
  return [
    "📧 PRIORITY EMAIL — DRAFT",
    `From: ${email.fromName} <${email.fromEmail}>`,
    `Subject: ${email.subject}`,
    `Message-Id: ${messageId}`,
    "---DRAFT---",
    `${draft.slice(0, maxDraft)}…`,
    "---END---",
    'Reply to this message with "/send" to approve as-is, or reply with your edited text to send the edited version, or "/reject" to discard.',
  ].join("\n");
}

async function sendTelegramToFounder(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const founderId = process.env.FOUNDER_TELEGRAM_ID;
  if (!token || !founderId) {
    console.error(`${LOG_PREFIX} TELEGRAM_BOT_TOKEN or FOUNDER_TELEGRAM_ID is not set`);
    await sendOpsAlert("Missing Telegram env for priority email draft", {
      source: "Support Email Telegram Send",
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
        body: JSON.stringify({ chat_id: founderId, text }),
        signal: controller.signal,
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`${LOG_PREFIX} Telegram send failed:`, res.status, body.slice(0, 200));
      await sendOpsAlert(`Telegram sendMessage failed: ${res.status}`, {
        source: "Support Email Telegram Send",
        status: res.status,
      });
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Telegram send error:`, error);
    await sendOpsAlert(error instanceof Error ? error : String(error), {
      source: "Support Email Telegram Send",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleExplorer(email: ReceivedEmail): Promise<void> {
  await sendSupportEmail({
    to: email.fromEmail,
    subject: `Re: ${email.subject}`,
    text: `Thanks for reaching out! Priority email support is reserved for Professional and Advisory members. For instant 24/7 help, use our free AI Support Concierge on Telegram: ${SUPPORT_TELEGRAM_URL}.`,
  });
}

async function handlePayingCustomer(email: ReceivedEmail): Promise<void> {
  const drafted = await draftWithPuter(email);
  const draft = drafted ?? DRAFT_FALLBACK;
  if (!drafted) {
    await sendOpsAlert("Puter AI drafting unavailable for priority email", {
      source: "Support Email Puter AI",
      from: email.fromEmail,
    });
  }
  await sendTelegramToFounder(buildFounderDraftMessage(email, draft));
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload: unknown = await request.json();
    if (!isEmailReceivedEvent(payload)) return ok();

    const emailId = extractWebhookEmailId(payload);
    if (!emailId) return ok();
    if (rememberEmail(emailId)) return ok();

    const email = await fetchReceivedEmail(emailId);
    console.log("Raw From field:", email.from);
    const extractedEmail = extractEmailFromHeader(email.from);
    console.log("Extracted email:", extractedEmail);
    const tier = getCustomerTier(extractedEmail);
    console.log("Tier returned:", tier);
    console.log(`Customer ${extractedEmail} classified as ${tier}`);

    const customer: ReceivedEmail = { ...email, fromEmail: extractedEmail };

    if (tier === "explorer") {
      await handleExplorer(customer);
      return ok();
    }

    await handlePayingCustomer(customer);
    return ok();
  } catch (error) {
    console.error(`${LOG_PREFIX} Webhook handler error:`, error);
    await sendOpsAlert(error instanceof Error ? error : String(error), {
      source: "Support Email Webhook",
    });
    return ok();
  }
}
