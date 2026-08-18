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
