export function paypalVisible(): boolean {
  if (process.env.NEXT_PUBLIC_PAYPAL_MODE === "live") return true;
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h.endsWith(".vercel.app");
}
