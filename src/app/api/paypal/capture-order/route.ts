import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { capturePayPalOrder, getOrderDetails } from "@/lib/paypal";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function purchaseCustomId(order: unknown): string {
  if (!isRecord(order)) return "";
  const units = order.purchase_units;
  if (!Array.isArray(units) || !isRecord(units[0])) return "";
  return typeof units[0].custom_id === "string" ? units[0].custom_id : "";
}

function orderStatus(order: unknown): string {
  return isRecord(order) && typeof order.status === "string"
    ? order.status
    : "";
}

function collectCaptureIds(order: unknown): string[] {
  if (!isRecord(order) || !Array.isArray(order.purchase_units)) return [];
  const unit = order.purchase_units[0];
  if (!isRecord(unit) || !isRecord(unit.payments)) return [];
  const captures = unit.payments.captures;
  if (!Array.isArray(captures)) return [];
  return captures
    .map((c) => (isRecord(c) && typeof c.id === "string" ? c.id : null))
    .filter((id): id is string => Boolean(id));
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { orderID } = (await req.json()) as { orderID?: string };
  if (!orderID) {
    return NextResponse.json({ error: "Missing orderID" }, { status: 400 });
  }

  const existing = await getSubMeta(userId);
  if (hasProcessedId(existing, orderID)) {
    return NextResponse.json({ success: true, meta: existing });
  }

  await capturePayPalOrder(orderID);
  const order = await getOrderDetails(orderID);
  if (orderStatus(order) !== "COMPLETED") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
  }

  const captureIds = collectCaptureIds(order);
  const meta = await getSubMeta(userId);
  if (
    hasProcessedId(meta, orderID) ||
    captureIds.some((id) => hasProcessedId(meta, id))
  ) {
    return NextResponse.json({ success: true, meta });
  }

  const customId = purchaseCustomId(order);
  const [ownerId, productKey] = customId.split("|");
  if (ownerId !== userId) {
    return NextResponse.json(
      { error: "Order does not belong to user" },
      { status: 403 }
    );
  }

  if (!ONE_TIME_PRODUCTS[productKey as ProductKey]) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }
  if (!grantOneTimeProduct(meta, productKey as ProductKey)) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }

  pushProcessedIds(meta, [orderID, ...captureIds]);
  await setSubMeta(userId, meta);

  return NextResponse.json({ success: true, meta });
}
