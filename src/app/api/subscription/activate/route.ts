import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSubscriptionDetails } from "@/lib/paypal";
import { getSubMeta, setSubMeta } from "@/lib/subscription-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { subscriptionId } = (await req.json()) as { subscriptionId?: string };
  if (!subscriptionId) {
    return NextResponse.json(
      { error: "Missing subscriptionId" },
      { status: 400 }
    );
  }

  const sub = (await getSubscriptionDetails(subscriptionId)) as {
    custom_id?: string;
    status?: string;
    id?: string;
  };
  if (sub.custom_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const meta = await getSubMeta(userId);
  meta.plan = "advisory";
  meta.advisoryStatus = sub.status === "ACTIVE" ? "active" : "cancelled";
  meta.paypalSubscriptionId = sub.id;
  await setSubMeta(userId, meta);

  return NextResponse.json({ success: true });
}
