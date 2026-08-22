import { NextResponse } from "next/server";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { getSubMeta, setSubMeta } from "@/lib/subscription-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[PayPal Webhook]";

const CANCEL_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractUserId(resource: unknown): string | null {
  if (!isRecord(resource)) return null;
  const customId = resource.custom_id;
  if (typeof customId !== "string" || !customId) return null;
  return customId.includes("|") ? customId.split("|")[0] : customId;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const valid = await verifyPayPalWebhook(req.headers, rawBody);
  if (!valid) {
    console.warn(`${LOG_PREFIX} invalid signature`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event_type?: string; resource?: unknown };
  try {
    event = JSON.parse(rawBody) as { event_type?: string; resource?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event_type ?? "";

  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    console.log(
      `${LOG_PREFIX} PAYMENT.CAPTURE.COMPLETED ignored (granted by capture-order)`,
      isRecord(event.resource) ? event.resource.id : undefined
    );
    return NextResponse.json({ received: true, ignored: true });
  }

  if (
    eventType !== "BILLING.SUBSCRIPTION.ACTIVATED" &&
    !CANCEL_EVENTS.has(eventType)
  ) {
    console.log(`${LOG_PREFIX} unhandled event`, eventType);
    return NextResponse.json({ received: true });
  }

  const userId = extractUserId(event.resource);
  if (!userId) {
    console.warn(`${LOG_PREFIX} missing custom_id`, eventType);
    return NextResponse.json({ received: true, skipped: "no_custom_id" });
  }

  const resource = isRecord(event.resource) ? event.resource : {};
  const subscriptionId =
    typeof resource.id === "string" ? resource.id : undefined;

  try {
    const meta = await getSubMeta(userId);

    if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
      meta.plan = "advisory";
      meta.advisoryStatus = "active";
      if (subscriptionId) meta.paypalSubscriptionId = subscriptionId;
    } else {
      meta.advisoryStatus = "cancelled";
      meta.plan = meta.lifetime ? "professional" : "explorer";
    }

    await setSubMeta(userId, meta);
    console.log(`${LOG_PREFIX} applied`, eventType, userId, meta.plan);
  } catch (err) {
    console.error(`${LOG_PREFIX} failed to update user`, userId, err);
    return NextResponse.json({ error: "User update failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
