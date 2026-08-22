import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { capturePayPalOrder, getOrderDetails } from "@/lib/paypal";
import { ONE_TIME_PRODUCTS, type ProductKey } from "@/lib/pricing";
import {
  getSubMeta,
  markOrderGranted,
  setSubMeta,
  wasOrderGranted,
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

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { orderID } = (await req.json()) as { orderID?: string };
  if (!orderID) {
    return NextResponse.json({ error: "Missing orderID" }, { status: 400 });
  }

  if (await wasOrderGranted(userId, orderID)) {
    const meta = await getSubMeta(userId);
    return NextResponse.json({ success: true, meta });
  }

  const captured = await capturePayPalOrder(orderID);
  let order = captured as unknown;
  if (orderStatus(order) !== "COMPLETED") {
    order = await getOrderDetails(orderID);
  }
  if (orderStatus(order) !== "COMPLETED") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
  }

  const customId = purchaseCustomId(order);
  const [ownerId, productKey] = customId.split("|");
  if (ownerId !== userId) {
    return NextResponse.json(
      { error: "Order does not belong to user" },
      { status: 403 }
    );
  }

  const product = ONE_TIME_PRODUCTS[productKey as ProductKey];
  if (!product) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }

  const meta = await getSubMeta(userId);
  if (productKey === "professional") {
    meta.lifetime = true;
    if (meta.plan !== "advisory") meta.plan = "professional";
  } else {
    meta.reportCredits += product.credits;
    if (product.whiteLabel) meta.whiteLabel = true;
  }
  await setSubMeta(userId, meta);
  await markOrderGranted(userId, orderID);

  return NextResponse.json({ success: true, meta });
}
