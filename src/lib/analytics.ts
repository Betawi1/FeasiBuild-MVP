import { track } from "@vercel/analytics";

/**
 * Thin, strictly-typed wrappers around Vercel Web Analytics `track`.
 *
 * Keeping call sites behind these helpers means event names and payload
 * shapes stay consistent, and lets us swap the underlying provider without
 * touching component code.
 */

/**
 * Fired when a visitor clicks a call-to-action.
 *
 * @param location - Where on the page the CTA lives, e.g. `"hero"` or `"footer"`.
 */
export function trackCtaClick(location: string): void {
  track("cta_click", { location });
}

/**
 * Fired when a visitor submits the email-capture form.
 */
export function trackVaultSubmit(): void {
  track("vault_submit");
}

/**
 * Fired when a visitor begins the signup flow.
 */
export function trackSignupStart(): void {
  track("signup_start");
}
