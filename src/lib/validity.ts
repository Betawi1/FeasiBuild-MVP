export const PACK_VALIDITY_MONTHS = 12;
export const LOW_CREDIT_THRESHOLD = 2;

export function expiryDateFromPurchase(
  purchasedAt: string | null | undefined
): Date | null {
  if (!purchasedAt) return null;
  const start = new Date(purchasedAt);
  if (Number.isNaN(start.getTime())) return null;
  const expiry = new Date(start);
  expiry.setMonth(expiry.getMonth() + PACK_VALIDITY_MONTHS);
  return expiry;
}

export function isWithinValidity(purchasedAt: string | null | undefined): boolean {
  const expiry = expiryDateFromPurchase(purchasedAt);
  if (!expiry) return false;
  return new Date() < expiry;
}

export function effectiveCredits(meta: {
  reportCredits: number;
  packPurchasedAt?: string | null;
}): number {
  return isWithinValidity(meta.packPurchasedAt) ? meta.reportCredits : 0;
}

export function isUnlimitedActive(meta: {
  unlimited?: boolean;
  unlimitedPurchasedAt?: string | null;
}): boolean {
  return !!meta.unlimited && isWithinValidity(meta.unlimitedPurchasedAt);
}
