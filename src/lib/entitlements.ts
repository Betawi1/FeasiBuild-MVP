import { isUnlimitedActive, isWithinValidity } from "./validity";

export type CustomerTier = "explorer" | "pro" | "advisory";

export interface SubscriptionLike {
  plan?: string;
  lifetime?: boolean;
  unlimited?: boolean;
  unlimitedPurchasedAt?: string | null;
  packPurchasedAt?: string | null;
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
  if (isUnlimitedActive(subscription)) {
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

/** Professional with a 100-Pack that is still inside its 12-month window. */
function hasActiveHundredPack(
  subscription?: SubscriptionLike | null
): boolean {
  if (!subscription) return false;
  if (isUnlimitedActive(subscription)) return false;
  if (tierFromSubscription(subscription) !== "pro") return false;
  return (
    subscription.whiteLabel === true &&
    isWithinValidity(subscription.packPurchasedAt)
  );
}

/**
 * Advisory always (active Unlimited Pack, or getCustomerTier === "advisory").
 * Professional only with an active 100-Pack (or the logo-pack allowlist).
 * Explorer never. Expired Unlimited and expired 100-Packs are false —
 * a leftover `whiteLabel` flag does not extend access past expiry.
 * Custom pages and white-label are this one check.
 */
function resolvePackAccess(
  email: string | null | undefined,
  subscription?: SubscriptionLike | null
): boolean {
  if (subscription && isUnlimitedActive(subscription)) return true;
  if (hasActiveHundredPack(subscription)) return true;
  const normalized = (email ?? "").trim().toLowerCase();
  const tier = getCustomerTier(normalized, subscription);
  if (tier === "advisory") return true;
  if (tier === "pro") {
    return PRO_LOGO_PACK_ALLOWLIST.includes(normalized);
  }
  return false;
}

export const hasCustomPagesAccess = resolvePackAccess;
export const hasWhiteLabelAccess = resolvePackAccess;

/** Dev-only. The upsell pill must never render for advisory or an active 100-Pack. */
export function reportCustomPagesPillRegression(
  email: string,
  subscription?: SubscriptionLike | null
): void {
  if (process.env.NODE_ENV === "production") return;
  if (
    getCustomerTier(email, subscription) === "advisory" ||
    hasActiveHundredPack(subscription)
  ) {
    console.warn(
      "[custom-pages] Upsell pill rendered while the customer is entitled (advisory tier or an active 100-Pack)."
    );
  }
}
