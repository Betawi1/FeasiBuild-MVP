"use client";

import { useUser } from "@clerk/nextjs";
import { getCustomerTier, hasWhiteLabelAccess } from "@/lib/entitlements";

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
  const unlimited =
    !!sub?.unlimited || fallbackTier === "advisory" || plan === "advisory";
  const lifetime =
    !!sub?.lifetime || unlimited || fallbackTier === "pro";

  return {
    plan,
    lifetime,
    unlimited,
    hasUnlimitedReports: unlimited,
    isPro: lifetime || unlimited,
    reportCredits: typeof sub?.reportCredits === "number" ? sub.reportCredits : 0,
    whiteLabel: hasWhiteLabelAccess(email, sub),
    isLoading: !isLoaded,
  };
}
