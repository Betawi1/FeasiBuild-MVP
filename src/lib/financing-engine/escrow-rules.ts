/**
 * Sale-stream escrow withdrawal rules are mechanisms, not countries.
 * Location only pre-selects a default; the selected rule drives engine, horizon, and slides.
 */

export type EscrowRuleId =
  | "ten_ninety"
  | "staged"
  | "progress"
  | "closed_loop_escrow"
  | "project_guarantee_account"
  | "proportionate_escrow"
  | "none";

export const ESCROW_RULE_IDS: readonly EscrowRuleId[] = [
  "ten_ninety",
  "progress",
  "staged",
  "closed_loop_escrow",
  "project_guarantee_account",
  "proportionate_escrow",
  "none",
] as const;

export const ESCROW_RULE_DISPLAY_NAME: Record<EscrowRuleId, string> = {
  ten_ninety: "10/90 Rule",
  staged: "Staged Escrow Rule",
  progress: "Progress Drawdown Rule",
  closed_loop_escrow: "Closed-Loop Escrow Rule",
  project_guarantee_account: "Project Guarantee Account Rule",
  proportionate_escrow: "Proportionate Escrow Rule",
  none: "No Escrow Rules",
};

export const ESCROW_RULE_CONFIG_TITLE: Record<EscrowRuleId, string> = {
  ten_ninety: "10/90 Rule Configuration",
  staged: "Staged Escrow Rule Configuration",
  progress: "Progress Drawdown Rule Configuration",
  closed_loop_escrow: "Closed-Loop Escrow Rule Configuration",
  project_guarantee_account: "Project Guarantee Account Rule Configuration",
  proportionate_escrow: "Proportionate Escrow Rule Configuration",
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
  /** Default only. The live horizon is CP + guarantee retention months (minimum 12). */
  project_guarantee_account: 12,
  /** Designated-account split. Horizon is CP+6, same tail as no-escrow. */
  proportionate_escrow: 6,
  none: 6,
};

/** Project guarantee account defaults (Abu Dhabi ADREC/DMT completion-account regime). */
export const GUARANTEE_DEFAULT_THRESHOLD_PCT = 20;
export const GUARANTEE_DEFAULT_PROFIT_MILESTONE_PCT = 60;
export const GUARANTEE_DEFAULT_RETENTION_PCT = 5;
export const GUARANTEE_DEFAULT_RETENTION_MONTHS = 12;

/** What the defect-retention percent is applied to. */
export type GuaranteeRetentionBasis = "construction_cost" | "escrow_proceeds";

/**
 * Abu Dhabi holds a fixed percent of C1 construction cost.
 * Every other location holds a percent of cumulative escrow proceeds.
 * A stored basis always wins.
 */
export function resolveGuaranteeRetentionBasis(
  stored: string | null | undefined,
  location?: {
    country?: string | null;
    countryCode?: string | null;
    city?: string | null;
  }
): GuaranteeRetentionBasis {
  if (stored === "construction_cost" || stored === "escrow_proceeds") return stored;
  if (
    isUaeLocation(location?.country, location?.countryCode) &&
    isAbuDhabiCity(location?.city)
  ) {
    return "construction_cost";
  }
  return "escrow_proceeds";
}

/** Retention tail cannot sit inside the construction period. UI and engine share this floor. */
export function resolveGuaranteeRetentionMonths(
  raw: number | null | undefined
): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return GUARANTEE_DEFAULT_RETENTION_MONTHS;
  return Math.max(GUARANTEE_DEFAULT_RETENTION_MONTHS, Math.round(n));
}

/** Designated-account share of each buyer payment. Locked at this value for India. */
export const PROPORTIONATE_DEFAULT_SPLIT_PCT = 70;

export type ProportionateCertFrequency = "monthly" | "quarterly";

/**
 * Local-regime deck note only. Never used as a rule name or wizard label.
 * Shown only when the project location's default is this rule.
 */
export const PROPORTIONATE_LOCAL_REGIME_NOTE =
  "State regulatory authorities (MahaRERA-style enforcement intensity)";

export function isIndiaLocation(
  country?: string | null,
  countryCode?: string | null
): boolean {
  if (normCode(countryCode) === "IN") return true;
  const c = normCountry(country);
  if (!c || c.includes("indonesia") || c.includes("indiana")) return false;
  return /\bindia\b/.test(c);
}

/** India locks the split at 70. Every other location keeps the stored percent (default 70). */
export function resolveProportionateEscrowPercent(
  stored: number | null | undefined,
  location?: { country?: string | null; countryCode?: string | null }
): number {
  if (isIndiaLocation(location?.country, location?.countryCode)) {
    return PROPORTIONATE_DEFAULT_SPLIT_PCT;
  }
  const n = Number(stored);
  if (!Number.isFinite(n)) return PROPORTIONATE_DEFAULT_SPLIT_PCT;
  return Math.min(100, Math.max(0, n));
}

export function resolveProportionateCertFrequency(
  stored: string | null | undefined
): ProportionateCertFrequency {
  return stored === "quarterly" ? "quarterly" : "monthly";
}

/** India locks the construction-lender sweep on. Others default on and may turn it off. */
export function resolveProportionateSweepEnabled(
  stored: boolean | null | undefined,
  location?: { country?: string | null; countryCode?: string | null }
): boolean {
  if (isIndiaLocation(location?.country, location?.countryCode)) return true;
  if (typeof stored === "boolean") return stored;
  return true;
}

/**
 * Jurisdiction deposit yield in percent points (7 = 7% p.a.).
 * Applied only when a saved project has no `escrowDepositRatePercent`.
 */
export function defaultEscrowDepositRatePercent(location?: {
  country?: string | null;
  countryCode?: string | null;
}): number {
  const code = location?.countryCode?.toUpperCase() ?? "";
  const country = (location?.country ?? "").toLowerCase();
  if (code === "AE" || country.includes("uae") || country.includes("emirates")) return 3.9;
  if (code === "SA" || country.includes("saudi") || country.includes("ksa")) return 4;
  if (code === "MY" || country.includes("malaysia")) return 3;
  if (code === "AU" || country.includes("australia")) return 0.5;
  if (code === "VN" || country.includes("viet")) return 4.5;
  if (code === "TH" || country.includes("thai")) return 2.5;
  return 0;
}

export function resolveProportionateInterestPermitted(
  stored: boolean | null | undefined
): boolean {
  return stored !== false;
}

export type ProportionateEscrowFields = {
  proportionateEscrowPercent: number;
  proportionateCertFrequency: ProportionateCertFrequency;
  proportionateSweepEnabled: boolean;
  proportionateConstructionInterestPermitted: boolean;
};

type ProportionateEscrowStored = {
  proportionateEscrowPercent?: number | null;
  proportionateCertFrequency?: string | null;
  proportionateSweepEnabled?: boolean | null;
  proportionateConstructionInterestPermitted?: boolean | null;
};

/**
 * Project load / save only. A missing key receives its default.
 * A key that is already set is copied through unchanged.
 */
export function fillUndefinedProportionateEscrow<T extends ProportionateEscrowStored>(
  escrow: T | undefined
): T & ProportionateEscrowFields {
  const src = (escrow ?? {}) as T;
  const frequency = src.proportionateCertFrequency;
  const percent = Number(src.proportionateEscrowPercent);
  return {
    ...src,
    proportionateCertFrequency:
      frequency === "quarterly" || frequency === "monthly" ? frequency : "monthly",
    proportionateEscrowPercent: Number.isFinite(percent)
      ? Math.min(100, Math.max(0, percent))
      : PROPORTIONATE_DEFAULT_SPLIT_PCT,
    proportionateSweepEnabled:
      typeof src.proportionateSweepEnabled === "boolean"
        ? src.proportionateSweepEnabled
        : true,
    proportionateConstructionInterestPermitted:
      typeof src.proportionateConstructionInterestPermitted === "boolean"
        ? src.proportionateConstructionInterestPermitted
        : true,
  };
}

/**
 * Persist path. A defined store value wins over a form fallback.
 * Dev-warns when a fallback would have replaced that stored value.
 */
export function readProportionateEscrowForPersist(
  stored: ProportionateEscrowStored | undefined,
  fallback: ProportionateEscrowFields
): ProportionateEscrowFields {
  const frequency =
    stored?.proportionateCertFrequency === "quarterly" ||
    stored?.proportionateCertFrequency === "monthly"
      ? stored.proportionateCertFrequency
      : undefined;
  const percent = Number(stored?.proportionateEscrowPercent);
  const storedPercent = Number.isFinite(percent) ? percent : undefined;
  const storedSweep =
    typeof stored?.proportionateSweepEnabled === "boolean"
      ? stored.proportionateSweepEnabled
      : undefined;
  const storedInterest =
    typeof stored?.proportionateConstructionInterestPermitted === "boolean"
      ? stored.proportionateConstructionInterestPermitted
      : undefined;

  if (process.env.NODE_ENV !== "production") {
    const clashes: Array<[string, unknown, unknown]> = [
      ["proportionateCertFrequency", frequency, fallback.proportionateCertFrequency],
      ["proportionateEscrowPercent", storedPercent, fallback.proportionateEscrowPercent],
      ["proportionateSweepEnabled", storedSweep, fallback.proportionateSweepEnabled],
      [
        "proportionateConstructionInterestPermitted",
        storedInterest,
        fallback.proportionateConstructionInterestPermitted,
      ],
    ];
    for (const [key, defined, incoming] of clashes) {
      if (defined !== undefined && defined !== incoming) {
        console.warn(
          `[escrow] refused to overwrite stored ${key}=${String(defined)} with ${String(incoming)}`
        );
      }
    }
  }

  return {
    proportionateCertFrequency: frequency ?? fallback.proportionateCertFrequency,
    proportionateEscrowPercent: storedPercent ?? fallback.proportionateEscrowPercent,
    proportionateSweepEnabled: storedSweep ?? fallback.proportionateSweepEnabled,
    proportionateConstructionInterestPermitted:
      storedInterest ?? fallback.proportionateConstructionInterestPermitted,
  };
}

/**
 * Deck note for the designated-account rule. Undefined unless this location's
 * default is the rule — Others projects never receive it.
 */
export function proportionateLocalRegimeNote(opts: {
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  buildingType?: string | null;
  buildingSubType?: string | null;
}): string | undefined {
  if (defaultEscrowRuleForLocation(opts) !== "proportionate_escrow") return undefined;
  return PROPORTIONATE_LOCAL_REGIME_NOTE;
}

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

export function isAbuDhabiCity(city?: string | null): boolean {
  const c = (city ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return c.includes("abu dhabi") || c.includes("abudhabi");
}

/**
 * Sale feasibility escrow slide.
 * Residential subtypes always render it. Commercial and warehouse decks render it
 * when the selected rule is the project guarantee account or proportionate escrow.
 */
export function shouldRenderSaleEscrowSlide(
  buildingSubType: string | null | undefined,
  rule: EscrowRuleId
): boolean {
  if ((buildingSubType ?? "").toLowerCase().includes("residential")) return true;
  return rule === "project_guarantee_account" || rule === "proportionate_escrow";
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
 * in the engine. All seven tabs remain selectable everywhere.
 *
 * Dubai → staged (all asset classes); Abu Dhabi → project guarantee account (all asset classes);
 * Australia → 10/90 (all asset classes);
 * Malaysia → progress (residential) / none (commercial);
 * China → closed-loop (residential landed / high-rise only);
 * India → proportionate escrow (all sale asset classes);
 * other emirates and all other locations → none.
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
  if (isUaeLocation(opts.country, opts.countryCode) && isAbuDhabiCity(opts.city)) {
    return "project_guarantee_account";
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
  if (isIndiaLocation(opts.country, opts.countryCode)) return "proportionate_escrow";
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
  if (
    v === "project_guarantee_account" ||
    v === "project_guarantee" ||
    v === "guarantee_account"
  ) {
    return "project_guarantee_account";
  }
  if (v === "proportionate_escrow" || v === "proportionate") {
    return "proportionate_escrow";
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
