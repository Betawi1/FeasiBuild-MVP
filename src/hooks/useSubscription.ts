"use client";

import { useUser } from "@clerk/nextjs";
import { getCustomerTier, hasWhiteLabelAccess } from "@/lib/entitlements";
import {
  effectiveCredits,
  expiryDateFromPurchase,
  isUnlimitedActive,
} from "@/lib/validity";

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

  const packPurchasedAt =
    typeof sub?.packPurchasedAt === "string" ? sub.packPurchasedAt : null;
  const unlimitedPurchasedAt =
    typeof sub?.unlimitedPurchasedAt === "string"
      ? sub.unlimitedPurchasedAt
      : null;
  const rawCredits =
    typeof sub?.reportCredits === "number" ? sub.reportCredits : 0;

  const unlimitedActive =
    isUnlimitedActive({
      unlimited: !!sub?.unlimited,
      unlimitedPurchasedAt,
    }) || fallbackTier === "advisory";

  const lifetime =
    !!sub?.lifetime || fallbackTier === "pro" || fallbackTier === "advisory";

  return {
    plan,
    lifetime,
    whiteLabel: hasWhiteLabelAccess(email, sub),
    isPro: lifetime || unlimitedActive,
    hasUnlimitedReports: unlimitedActive,
    reportCredits: effectiveCredits({
      reportCredits: rawCredits,
      packPurchasedAt,
    }),
    packExpiresAt: expiryDateFromPurchase(packPurchasedAt),
    unlimitedExpiresAt: expiryDateFromPurchase(unlimitedPurchasedAt),
    isLoading: !isLoaded,
  };
}
