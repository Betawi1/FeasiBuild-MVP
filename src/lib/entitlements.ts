/**
 * Customer entitlements.
 * PayPal/Clerk publicMetadata.subscription is the source of truth for paid
 * plans. The email allowlist remains as a founder/support fallback.
 */

export type CustomerTier = "explorer" | "pro" | "advisory";

export interface SubscriptionLike {
  plan?: string;
  lifetime?: boolean;
  advisoryStatus?: string;
  whiteLabel?: boolean;
}

const TIER_ALLOWLIST = new Map<string, CustomerTier>([
  ["pro@example.com", "pro"],
  ["rashdan.ibrahim@icloud.com", "pro"],
  ["advisory@example.com", "advisory"],
  ["rashdan.ibrahim@gmail.com", "advisory"],
]);

function tierFromSubscription(
  subscription?: SubscriptionLike | null
): CustomerTier | null {
  if (!subscription) return null;
  if (
    subscription.plan === "advisory" &&
    subscription.advisoryStatus === "active"
  ) {
    return "advisory";
  }
  if (subscription.lifetime || subscription.plan === "professional") {
    return "pro";
  }
  return null;
}

export function getCustomerTier(
  email: string,
  subscription?: SubscriptionLike | null
): CustomerTier {
  const fromSub = tierFromSubscription(subscription);
  if (fromSub) return fromSub;
  const key = email.trim().toLowerCase();
  if (!key) return "explorer";
  return TIER_ALLOWLIST.get(key) ?? "explorer";
}

const PRO_LOGO_PACK_ALLOWLIST: string[] = [
  // Professional users who purchased the 100-Pack (logo branding).
  // e.g. "consultant@firm.com",
];

/** Advisory = always; Professional (`pro`) = only with 100-Pack; Explorer = never. */
export function hasWhiteLabelAccess(
  email: string | null | undefined,
  subscription?: SubscriptionLike | null
): boolean {
  if (subscription?.whiteLabel) return true;
  if (
    subscription?.plan === "advisory" &&
    subscription.advisoryStatus === "active"
  ) {
    return true;
  }
  const normalized = (email ?? "").trim().toLowerCase();
  const tier = getCustomerTier(normalized, subscription);
  if (tier === "advisory") return true;
  if (tier === "pro") {
    return PRO_LOGO_PACK_ALLOWLIST.includes(normalized);
  }
  return false;
}
