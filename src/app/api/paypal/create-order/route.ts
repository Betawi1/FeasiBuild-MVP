import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPayPalAccessToken, baseUrl } from "@/lib/paypal";
import { ONE_TIME_PRODUCTS, type ProductKey } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { productKey } = (await req.json()) as { productKey?: string };
  const product = ONE_TIME_PRODUCTS[productKey as ProductKey];
  if (!product) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }

  const token = await getPayPalAccessToken();
  const res = await fetch(`${baseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: product.amount },
          description: product.label,
          custom_id: `${userId}|${productKey}`,
        },
      ],
    }),
  });
  const order = (await res.json()) as { id?: string };
  if (!order.id) {
    return NextResponse.json(
      { error: "Order creation failed", details: order },
      { status: 502 }
    );
  }
  return NextResponse.json({ orderID: order.id });
}
