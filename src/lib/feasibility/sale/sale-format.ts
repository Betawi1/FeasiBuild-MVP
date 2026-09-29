export function fmtSaleMoney(
  amount: number,
  currency: string,
  compact = false
): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}
