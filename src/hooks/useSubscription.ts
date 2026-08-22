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
  const lifetime =
    !!sub?.lifetime || fallbackTier === "pro" || fallbackTier === "advisory";
  const advisoryActive =
    (plan === "advisory" && sub?.advisoryStatus === "active") ||
    fallbackTier === "advisory";

  return {
    plan,
    lifetime,
    advisoryActive,
    isPro: lifetime || advisoryActive,
    hasUnlimitedReports: advisoryActive,
    reportCredits: typeof sub?.reportCredits === "number" ? sub.reportCredits : 0,
    whiteLabel: hasWhiteLabelAccess(email, sub),
    isLoading: !isLoaded,
  };
}
