"use client";

import { useUser } from "@clerk/nextjs";
import { getCustomerTier, hasWhiteLabelAccess } from "@/lib/entitlements";
import { effectiveCredits, isUnlimitedActive } from "@/lib/validity";

export function useSubscription() {
  const { user, isLoaded } = useUser();
  const sub = (user?.publicMetadata as { subscription?: Record<string, unknown> } | undefined)
    ?.subscription;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const fallbackTier = getCustomerTier(email, sub);

  const plan =
    (sub?.plan as "explorer" | "professional" | "advisory" | undefined) ??
    (fallbackTier === "advisory"
      ? "advisory"
      : fallbackTier === "pro"
        ? "professional"
        : "explorer");
  const lifetime =
    !!sub?.lifetime || fallbackTier === "pro" || fallbackTier === "advisory";
  const unlimitedActive =
    isUnlimitedActive({
      unlimited: !!sub?.unlimited,
      unlimitedPurchasedAt:
        typeof sub?.unlimitedPurchasedAt === "string"
          ? sub.unlimitedPurchasedAt
          : null,
    }) || fallbackTier === "advisory";
  const reportCredits = effectiveCredits({
    reportCredits:
      typeof sub?.reportCredits === "number" ? sub.reportCredits : 0,
    packPurchasedAt:
      typeof sub?.packPurchasedAt === "string" ? sub.packPurchasedAt : null,
  });

  return {
    plan,
    lifetime,
    whiteLabel: hasWhiteLabelAccess(email, sub),
    isPro: lifetime || unlimitedActive,
    hasUnlimitedReports: unlimitedActive,
    reportCredits,
    isLoading: !isLoaded,
  };
}
