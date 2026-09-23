/**
 * Sale-stream escrow withdrawal rules are mechanisms, not countries.
 * Location only pre-selects a default; the selected rule drives engine, horizon, and slides.
 */

export type EscrowRuleId =
  | "ten_ninety"
  | "staged"
  | "progress"
  | "closed_loop_escrow"
  | "none";

export const ESCROW_RULE_IDS: readonly EscrowRuleId[] = [
  "ten_ninety",
  "progress",
  "staged",
  "closed_loop_escrow",
  "none",
] as const;

export const ESCROW_RULE_DISPLAY_NAME: Record<EscrowRuleId, string> = {
  ten_ninety: "10/90 Rule",
  staged: "Staged Escrow Rule",
  progress: "Progress Drawdown Rule",
  closed_loop_escrow: "Closed-Loop Escrow Rule",
  none: "No Escrow Rules",
};

export const ESCROW_RULE_CONFIG_TITLE: Record<EscrowRuleId, string> = {
  ten_ninety: "10/90 Rule Configuration",
  staged: "Staged Escrow Rule Configuration",
  progress: "Progress Drawdown Rule Configuration",
  closed_loop_escrow: "Closed-Loop Escrow Rule Configuration",
  none: "No Escrow Rules",
};

/**
 * Floor on the post-construction tail. Closed-loop's modeled horizon is
 * max(CP+24, last shifted sales month + 1) — see resolveSaleHorizonLastMonth.
 */
export const ESCROW_RULE_HORIZON_OFFSET: Record<EscrowRuleId, number> = {
  ten_ninety: 12,
  staged: 12,
  progress: 24,
  closed_loop_escrow: 24,
  none: 6,
};

/** Percent of building works held back from the contractor until CP+24. */
export const CLOSED_LOOP_CONTRACTOR_RETENTION_PCT = 3;

/** China overlay only: cumulative construction loan ≤ this share of TDC. */
export const CLOSED_LOOP_CHINA_MAX_LOAN_OF_TDC = 0.7;

/** Default cumulative S-curve % before off-plan sales may start. */
export const CLOSED_LOOP_DEFAULT_TOPPING_OUT_PCT = 50;

/**
 * Closed-loop topping-out toggle.
 * An explicit `toppingOutEnabled` always wins. Legacy China models with no flag
 * stay on (stored percent, or 50). Legacy models everywhere else stay off so a
 * saved schedule is not shifted just by opening it.
 */
export function resolveClosedLoopToppingOut(opts: {
  toppingOutEnabled?: boolean | null;
  toppingOutPercent?: number | null;
  /** Legacy store field. Used when `toppingOutPercent` is absent. */
  toppingOutPct?: number | null;
  china?: boolean;
}): { enabled: boolean; percent: number } {
  const raw = opts.toppingOutPercent ?? opts.toppingOutPct;
  const n = Number(raw);
  const percent = Number.isFinite(n)
    ? Math.min(100, Math.max(0, n))
    : CLOSED_LOOP_DEFAULT_TOPPING_OUT_PCT;
  const enabled =
    typeof opts.toppingOutEnabled === "boolean"
      ? opts.toppingOutEnabled
      : Boolean(opts.china);
  return { enabled, percent };
}

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

export function isChinaLocation(
  country?: string | null,
  countryCode?: string | null
): boolean {
  const code = normCode(countryCode);
  const c = normCountry(country);
  return code === "CN" || c === "china" || c === "prc" || c.includes("people's republic of china");
}

/** Sale subtypes that take the closed-loop default in China. Other classes stay on `none`. */
export function isClosedLoopResidentialAsset(opts: {
  buildingSubType?: string | null;
}): boolean {
  const sub = (opts.buildingSubType ?? "").toLowerCase().replace(/[\s-]/g, "_");
  return (
    sub === "residential_landed" ||
    sub === "residential_high_rise" ||
    sub === "residential_hi_rise"
  );
}

/**
 * Sale C4 Step 3 land-equity slider: locked at 100% only for UAE + Dubai.
 * KSA, other emirates, and every other country stay unlocked (30–100%).
 * Escrow rule selection must never drive this lock.
 */
export function isLandEquitySliderLocked(opts: {
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
}): boolean {
  return isUaeLocation(opts.country, opts.countryCode) && isDubaiCity(opts.city);
}

/**
 * Sale Component 1 product: commercial-landed / strata office / warehouse vs residential.
 * Used only for pre-select defaults (Malaysia commercial → none) and HDA eligibility.
 */
export function isCommercialSaleAsset(opts: {
  buildingType?: string | null;
  buildingSubType?: string | null;
}): boolean {
  const sub = (opts.buildingSubType ?? "").toLowerCase();
  if (sub.startsWith("residential_") || sub.includes("residential")) return false;
  if (sub.startsWith("commercial_") || sub.includes("commercial")) return true;
  const bt = (opts.buildingType ?? "").toLowerCase();
  return bt.length > 0 && bt !== "residential";
}

/**
 * Location + asset class pre-select a default only. Never hard-link a country to a rule
 * in the engine. All four tabs remain selectable everywhere.
 *
 * Dubai/UAE → staged (all asset classes); Australia → 10/90 (all asset classes);
 * Malaysia → progress (residential) / none (commercial);
 * China → closed-loop (residential landed / high-rise only);
 * all other locations → none.
 */
export function defaultEscrowRuleForLocation(opts: {
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  buildingType?: string | null;
  buildingSubType?: string | null;
}): EscrowRuleId {
  if (isAustraliaLocation(opts.country, opts.countryCode)) return "ten_ninety";
  if (isMalaysiaLocation(opts.country, opts.countryCode)) {
    return isCommercialSaleAsset(opts) ? "none" : "progress";
  }
  if (isUaeLocation(opts.country, opts.countryCode) && isDubaiCity(opts.city)) {
    return "staged";
  }
  if (
    isChinaLocation(opts.country, opts.countryCode) &&
    isClosedLoopResidentialAsset(opts)
  ) {
    return "closed_loop_escrow";
  }
  return "none";
}

/**
 * Sale-stream escrow resolution: stored user selection wins; otherwise location +
 * asset-class default. Commercial projects from the retired no-escrow wizard did not
 * confirm a rule — ignore leftover auto-persisted modes until the unified wizard saves.
 */
export function resolveSaleProjectEscrowRule(opts: {
  withdrawalMode?: string | null;
  confirmedByWizard?: boolean;
  jurisdiction?: string | null;
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  buildingType?: string | null;
  buildingSubType?: string | null;
}): EscrowRuleId {
  const raw = opts.withdrawalMode;
  const hasStored = raw != null && String(raw).trim() !== "";
  const commercial = isCommercialSaleAsset(opts);
  const honorStored = hasStored && (!commercial || opts.confirmedByWizard);
  if (honorStored) return normalizeEscrowRuleId(raw);
  return defaultEscrowRuleForLocation(opts);
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
  if (
    v === "closed_loop_escrow" ||
    v === "closed_loop" ||
    v === "closedloop"
  ) {
    return "closed_loop_escrow";
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
