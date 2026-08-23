import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSubMeta, setSubMeta } from "@/lib/subscription-metadata";
import { effectiveCredits, isUnlimitedActive } from "@/lib/validity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const meta = await getSubMeta(userId);

  if (isUnlimitedActive(meta)) {
    return NextResponse.json({ allowed: true, unlimited: true });
  }

  if (effectiveCredits(meta) > 0) {
    meta.reportCredits -= 1;
    await setSubMeta(userId, meta);
    return NextResponse.json({
      allowed: true,
      remaining: effectiveCredits(meta),
    });
  }

  if (!meta.lifetime) {
    return NextResponse.json({
      allowed: false,
      reason: "professional_required",
    });
  }

  return NextResponse.json({ allowed: false, reason: "no_credits" });
}
