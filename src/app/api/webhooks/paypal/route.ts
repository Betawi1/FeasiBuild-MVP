import { NextResponse } from "next/server";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { ONE_TIME_PRODUCTS, type ProductKey } from "@/lib/pricing";
import {
  getSubMeta,
  grantOneTimeProduct,
  hasProcessedId,
  pushProcessedIds,
  setSubMeta,
} from "@/lib/subscription-metadata";

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

function extractCustomId(resource: unknown): string | null {
  if (!isRecord(resource)) return null;
  const customId = resource.custom_id;
  if (typeof customId !== "string" || !customId) return null;
  return customId;
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
  const resource = isRecord(event.resource) ? event.resource : {};
  const customId = extractCustomId(resource);

  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const captureId = typeof resource.id === "string" ? resource.id : "";
    if (!customId || !customId.includes("|") || !captureId) {
      console.warn(`${LOG_PREFIX} capture missing custom_id or id`);
      return NextResponse.json({ received: true, skipped: "no_custom_id" });
    }
    const [userId, productKey] = customId.split("|");
    if (!ONE_TIME_PRODUCTS[productKey as ProductKey]) {
      return NextResponse.json({ received: true, skipped: "unknown_product" });
    }
    try {
      const meta = await getSubMeta(userId);
      if (hasProcessedId(meta, captureId)) {
        return NextResponse.json({ received: true, skipped: "already_granted" });
      }
      grantOneTimeProduct(meta, productKey as ProductKey);
      pushProcessedIds(meta, [captureId]);
      await setSubMeta(userId, meta);
      console.log(`${LOG_PREFIX} capture granted`, userId, productKey, captureId);
    } catch (err) {
      console.error(`${LOG_PREFIX} capture grant failed`, userId, err);
      return NextResponse.json({ error: "User update failed" }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  }

  if (
    eventType !== "BILLING.SUBSCRIPTION.ACTIVATED" &&
    !CANCEL_EVENTS.has(eventType)
  ) {
    console.log(`${LOG_PREFIX} unhandled event`, eventType);
    return NextResponse.json({ received: true });
  }

  const userId = customId && !customId.includes("|") ? customId : customId?.split("|")[0];
  if (!userId) {
    console.warn(`${LOG_PREFIX} missing custom_id`, eventType);
    return NextResponse.json({ received: true, skipped: "no_custom_id" });
  }

  const subscriptionId =
    typeof resource.id === "string" ? resource.id : undefined;

  try {
    const meta = await getSubMeta(userId);

    if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
      if (
        meta.paypalSubscriptionId === subscriptionId &&
        meta.advisoryStatus === "active"
      ) {
        return NextResponse.json({ received: true, skipped: "already_active" });
      }
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
