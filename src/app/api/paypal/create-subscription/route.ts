import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getPayPalAccessToken,
  baseUrl,
  findApproveUrl,
  PAYPAL_RETURN_URL,
  PAYPAL_CANCEL_URL,
} from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const planId = process.env.NEXT_PUBLIC_PAYPAL_ADVISORY_PLAN_ID;
  if (!planId) {
    return NextResponse.json(
      { error: "Advisory plan is not configured" },
      { status: 500 }
    );
  }

  const token = await getPayPalAccessToken();
  const res = await fetch(`${baseUrl()}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: userId,
      application_context: {
        return_url: PAYPAL_RETURN_URL,
        cancel_url: PAYPAL_CANCEL_URL,
        brand_name: "FeasiBuild",
        user_action: "CONTINUE",
      },
    }),
  });
  const sub = (await res.json()) as {
    id?: string;
    links?: unknown;
  };
  const approveUrl = findApproveUrl(sub.links);
  if (!sub.id || !approveUrl) {
    return NextResponse.json(
      { error: "Subscription creation failed", details: sub },
      { status: 502 }
    );
  }
  return NextResponse.json({ subscriptionId: sub.id, approveUrl });
}
