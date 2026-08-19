/**
 * Customer support entitlements.
 * V1: hardcoded allowlist. Will later be replaced by PayPal webhook lookups.
 */

export type CustomerTier = "explorer" | "pro" | "advisory";

const TIER_ALLOWLIST = new Map<string, CustomerTier>([
  ["pro@example.com", "pro"],
  ["advisory@example.com", "advisory"],
  ["rashdan.ibrahim@gmail.com", "advisory"],
]);

export function getCustomerTier(email: string): CustomerTier {
  const key = email.trim().toLowerCase();
  if (!key) return "explorer";
  return TIER_ALLOWLIST.get(key) ?? "explorer";
}

const PRO_LOGO_PACK_ALLOWLIST: string[] = [
  // Professional users who purchased the 100-Pack (logo branding).
  // e.g. "consultant@firm.com",
];

/** Advisory = always; Professional (`pro`) = only with 100-Pack; Explorer = never. */
export function hasWhiteLabelAccess(email: string | null | undefined): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  const tier = getCustomerTier(normalized);
  if (tier === "advisory") return true;
  if (tier === "pro") {
    return PRO_LOGO_PACK_ALLOWLIST.includes(normalized);
  }
  return false;
}
