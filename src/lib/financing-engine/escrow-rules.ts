/**
 * Sale-stream escrow withdrawal rules are mechanisms, not countries.
 * Location only pre-selects a default; the selected rule drives engine, horizon, and slides.
 */

export type EscrowRuleId = "ten_ninety" | "staged" | "progress" | "none";

export const ESCROW_RULE_IDS: readonly EscrowRuleId[] = [
  "ten_ninety",
  "progress",
  "staged",
  "none",
] as const;

export const ESCROW_RULE_DISPLAY_NAME: Record<EscrowRuleId, string> = {
  ten_ninety: "10/90 Rule",
  staged: "Staged Escrow Rule",
  progress: "Progress Drawdown Rule",
  none: "No Escrow Rules",
};

export const ESCROW_RULE_CONFIG_TITLE: Record<EscrowRuleId, string> = {
  ten_ninety: "10/90 Rule Configuration",
  staged: "Staged Escrow Rule Configuration",
  progress: "Progress Drawdown Rule Configuration",
  none: "No Escrow Rules",
};

/** Post-construction tail (months) after last construction month index. */
export const ESCROW_RULE_HORIZON_OFFSET: Record<EscrowRuleId, number> = {
  ten_ninety: 12,
  staged: 12,
  progress: 24,
  none: 6,
};

export function isDubaiCity(city?: string | null): boolean {
  return (city ?? "").trim().toLowerCase().includes("dubai");
}

function normCountry(country?: string | null): string {
  return (country ?? "").trim().toLowerCase();
}

function normCode(countryCode?: string | null): string {
  return (countryCode ?? "").trim().toUpperCase();
}

export function isAustraliaLocation(
  country?: string | null,
  countryCode?: string | null
): boolean {
  const code = normCode(countryCode);
  const c = normCountry(country);
  return code === "AU" || c.includes("australia");
}

export function isMalaysiaLocation(
  country?: string | null,
  countryCode?: string | null
): boolean {
  const code = normCode(countryCode);
  const c = normCountry(country);
  return code === "MY" || c.includes("malaysia");
}

export function isUaeLocation(
  country?: string | null,
  countryCode?: string | null
): boolean {
  const code = normCode(countryCode);
  const c = normCountry(country);
  return code === "AE" || c.includes("uae") || c.includes("emirates");
}

/**
 * Location pre-selects a default only. Never hard-link a country to a rule in the engine.
 * Australia → 10/90; Malaysia → Progress Drawdown; UAE + Dubai → Staged; all else → none.
 */
export function defaultEscrowRuleForLocation(opts: {
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
}): EscrowRuleId {
  if (isAustraliaLocation(opts.country, opts.countryCode)) return "ten_ninety";
  if (isMalaysiaLocation(opts.country, opts.countryCode)) return "progress";
  if (isUaeLocation(opts.country, opts.countryCode) && isDubaiCity(opts.city)) {
    return "staged";
  }
  return "none";
}

/**
 * Map stored tab / legacy mode strings to rule ids.
 * Empty / unknown → none (caller may apply jurisdiction backward-compat separately).
 */
export function normalizeEscrowRuleId(
  raw: string | undefined | null
): EscrowRuleId {
  if (raw == null) return "none";
  const v = String(raw).trim().toLowerCase().replace(/[-\s]/g, "_");
  if (!v) return "none";
  if (
    v === "ten_ninety" ||
    v === "australia" ||
    v === "10_90" ||
    v === "1090" ||
    v === "au"
  ) {
    return "ten_ninety";
  }
  if (v === "staged" || v === "uae" || v === "uae_sa") return "staged";
  if (v === "progress" || v === "malaysia" || v === "hda" || v === "my") {
    return "progress";
  }
  if (v === "none") return "none";
  return "none";
}

/**
 * Selected rule wins when a mode is stored (including legacy uae/malaysia/australia/none).
 * Unset mode: old engine jurisdiction enum maps UAE_SA→staged, MALAYSIA→progress,
 * AUSTRALIA→ten_ninety; OTHER / empty → none (CP+6).
 */
export function resolveEscrowRule(opts: {
  withdrawalMode?: string | null;
  jurisdiction?: string | null;
}): EscrowRuleId {
  const raw = opts.withdrawalMode;
  if (raw != null && String(raw).trim() !== "") {
    return normalizeEscrowRuleId(raw);
  }
  const j = (opts.jurisdiction ?? "").toUpperCase();
  if (j === "MALAYSIA") return "progress";
  if (j === "AUSTRALIA") return "ten_ninety";
  if (j === "UAE_SA") return "staged";
  return "none";
}
