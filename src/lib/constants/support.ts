/** Public Telegram deep-link for the FeasiBuild Support bot. */
export const SUPPORT_TELEGRAM_URL = "https://t.me/FeasiBuild_Support_Bot";

const START_PAYLOAD_RE = /^[A-Za-z0-9_-]+$/;
const WIZARD_PAYLOAD_RE = /^(ops|sale)-C([1-6])(?:-S(\d+))?$/;

/**
 * Build a Telegram bot URL. When `context` is a valid start payload
 * (A–Z, a–z, 0–9, `_`, `-`), append `?start=<encoded context>`.
 */
export function buildSupportLink(context?: string): string {
  const payload = context?.trim() ?? "";
  if (!payload || !START_PAYLOAD_RE.test(payload)) {
    return SUPPORT_TELEGRAM_URL;
  }
  return `${SUPPORT_TELEGRAM_URL}?start=${encodeURIComponent(payload)}`;
}

/**
 * Compact wizard location for Telegram `start` payloads, e.g. `ops-C1-S6`.
 */
export function buildWizardSupportContext(
  stream?: string | null,
  component?: string | null,
  step?: number | null
): string {
  const streamKey =
    stream === "sale" ? "sale" : stream === "operational" ? "ops" : null;
  if (!streamKey) return "";

  const componentMatch =
    typeof component === "string" ? component.toUpperCase().match(/^C([1-6])$/) : null;
  if (!componentMatch) return streamKey;

  const componentToken = `C${componentMatch[1]}`;
  if (step == null || !Number.isInteger(step) || step < 1) {
    return `${streamKey}-${componentToken}`;
  }
  return `${streamKey}-${componentToken}-S${step}`;
}

/** Map a `/start` payload to a short human-readable location. */
export function describeSupportStartPayload(payload: string): string {
  if (payload === "landing") return "the landing page";

  const match = payload.match(WIZARD_PAYLOAD_RE);
  if (!match) return payload;

  const stream = match[1] === "ops" ? "Operational" : "Sale";
  const parts = [stream, `Component ${match[2]}`];
  if (match[3]) parts.push(`Step ${match[3]}`);
  return parts.join(" · ");
}

export function isValidStartPayload(payload: string): boolean {
  return START_PAYLOAD_RE.test(payload);
}
