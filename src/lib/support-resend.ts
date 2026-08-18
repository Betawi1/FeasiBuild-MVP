const LOG_PREFIX = "[Support Email]";
const RESEND_TIMEOUT_MS = 10_000;
const SUPPORT_FROM = "FeasiBuild Support <owner@feasibuild.app>";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type ReceivedEmail = {
  id: string;
  from: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  text: string;
  messageId: string;
};

export type SendSupportEmailInput = {
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string;
};

async function resendFetch(
  url: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; json: unknown; bodyText: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });
    const bodyText = await res.text().catch(() => "");
    let json: unknown = null;
    if (bodyText) {
      try {
        json = JSON.parse(bodyText) as unknown;
      } catch {
        json = null;
      }
    }
    return { ok: res.ok, status: res.status, json, bodyText };
  } finally {
    clearTimeout(timeoutId);
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFromField(
  from: unknown,
  headerFrom?: unknown
): { name: string; email: string } | null {
  const candidates: string[] = [];
  if (typeof headerFrom === "string" && headerFrom.trim()) {
    candidates.push(headerFrom.trim());
  }
  if (typeof from === "string" && from.trim()) {
    candidates.push(from.trim());
  }
  if (isRecord(from)) {
    if (typeof from.email === "string") {
      const name = typeof from.name === "string" ? from.name.trim() : "";
      const email = from.email.trim();
      if (email) return { name: name || "Customer", email };
    }
  }

  for (const raw of candidates) {
    const angled = raw.match(/^(.*?)\s*<([^>]+)>$/);
    if (angled) {
      const name = (angled[1] ?? "").replace(/["']/g, "").trim();
      const email = (angled[2] ?? "").trim();
      if (email) return { name: name || "Customer", email };
    }
    if (raw.includes("@")) {
      return { name: "Customer", email: raw.replace(/^mailto:/i, "").trim() };
    }
  }
  return null;
}

function unwrapEmailPayload(json: unknown): Record<string, unknown> | null {
  if (!isRecord(json)) return null;
  if (isRecord(json.data) && (json.data.from != null || json.data.subject != null)) {
    return json.data;
  }
  return json;
}

export function extractWebhookEmailId(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const data = isRecord(payload.data) ? payload.data : payload;
  if (typeof data.email_id === "string" && data.email_id.trim()) {
    return data.email_id.trim();
  }
  if (typeof data.id === "string" && data.id.trim()) {
    return data.id.trim();
  }
  return null;
}

export function isEmailReceivedEvent(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  if (typeof payload.type === "string") {
    return payload.type === "email.received";
  }
  return extractWebhookEmailId(payload) != null;
}

export async function fetchReceivedEmail(id: string): Promise<ReceivedEmail> {
  // Resend's retrieve path is `/emails/receiving/:id`. Also try `/emails/received/:id`.
  const paths = ["receiving", "received"] as const;
  let lastError = "Received email fetch failed";

  for (const path of paths) {
    const result = await resendFetch(
      `https://api.resend.com/emails/${path}/${encodeURIComponent(id)}`,
      { method: "GET" }
    );
    if (!result.ok) {
      lastError = `Resend ${path} GET failed: ${result.status} ${result.bodyText.slice(0, 200)}`;
      if (result.status === 404) continue;
      throw new Error(lastError);
    }

    const email = unwrapEmailPayload(result.json);
    if (!email) {
      lastError = "Resend returned an empty received-email payload";
      continue;
    }

    const headers = isRecord(email.headers) ? email.headers : {};
    const rawFrom =
      (typeof headers.from === "string" && headers.from.trim()) ||
      (typeof email.from === "string" && email.from.trim()) ||
      (isRecord(email.from) && typeof email.from.email === "string"
        ? typeof email.from.name === "string" && email.from.name.trim()
          ? `${email.from.name.trim()} <${email.from.email.trim()}>`
          : email.from.email.trim()
        : "");
    const parsedFrom = parseFromField(email.from, headers.from);
    if (!parsedFrom && !rawFrom) {
      throw new Error("Received email is missing a From address");
    }

    const subject = typeof email.subject === "string" ? email.subject : "";
    const textRaw = typeof email.text === "string" ? email.text.trim() : "";
    const htmlRaw = typeof email.html === "string" ? email.html : "";
    const text = textRaw || (htmlRaw ? htmlToText(htmlRaw) : "");
    const messageId =
      (typeof email.message_id === "string" && email.message_id) ||
      (typeof headers["message-id"] === "string" && headers["message-id"]) ||
      (typeof headers["Message-ID"] === "string" && headers["Message-ID"]) ||
      "";

    return {
      id: typeof email.id === "string" ? email.id : id,
      from: rawFrom || parsedFrom?.email || "",
      fromEmail: parsedFrom?.email ?? rawFrom,
      fromName: parsedFrom?.name ?? "Customer",
      subject,
      text,
      messageId,
    };
  }

  throw new Error(lastError);
}

export async function sendSupportEmail(
  input: SendSupportEmailInput
): Promise<void> {
  const payload: Record<string, unknown> = {
    from: SUPPORT_FROM,
    to: [input.to],
    subject: input.subject,
    text: input.text,
  };
  if (input.inReplyTo) {
    payload.headers = {
      "In-Reply-To": input.inReplyTo,
      References: input.inReplyTo,
    };
  }

  const result = await resendFetch("https://api.resend.com/emails", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!result.ok) {
    console.error(
      `${LOG_PREFIX} send failed:`,
      result.status,
      result.bodyText.slice(0, 200)
    );
    throw new Error(`Resend send failed: ${result.status}`);
  }
}
