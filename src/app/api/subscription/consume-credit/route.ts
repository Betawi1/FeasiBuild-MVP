import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSubMeta, setSubMeta } from "@/lib/subscription-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const meta = await getSubMeta(userId);

  if (meta.plan === "advisory" && meta.advisoryStatus === "active") {
    return NextResponse.json({ allowed: true, unlimited: true });
  }
  if (!meta.lifetime) {
    return NextResponse.json({
      allowed: false,
      reason: "professional_required",
    });
  }
  if (meta.reportCredits <= 0) {
    return NextResponse.json({ allowed: false, reason: "no_credits" });
  }

  meta.reportCredits -= 1;
  await setSubMeta(userId, meta);
  return NextResponse.json({ allowed: true, remaining: meta.reportCredits });
}
