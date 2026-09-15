import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[Vault Lead]";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid() {
  return NextResponse.json({ ok: false }, { status: 400 });
}

function ok() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return invalid();
  }

  if (!isRecord(payload)) return invalid();

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const hp = typeof payload.hp === "string" ? payload.hp : "";

  if (!name || name.length > 100 || !EMAIL_RE.test(email)) {
    return invalid();
  }

  if (hp.trim() !== "") {
    return ok();
  }

  const ts = new Date().toISOString();

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "FeasiBuild Vault <vault@feasibuild.app>",
      to: process.env.VAULT_NOTIFY_EMAIL || "owner@feasibuild.app",
      replyTo: email,
      subject: `New Vault lead: ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Timestamp (UTC): ${ts}`,
        "Source: feasibuild.app/vault",
      ].join("\n"),
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Resend failed:`, error);
  }

  const sheetUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (sheetUrl) {
    try {
      const res = await fetch(sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, ts }),
      });
      if (!res.ok) {
        throw new Error(`Sheet webhook ${res.status}`);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Sheet webhook failed:`, error);
    }
  }

  return ok();
}
