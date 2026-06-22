/** Escrow withdrawal method selected in Component 4 Step 5. */
export type EscrowWithdrawalMode = "malaysia" | "uae" | "australia";

export type MalaysiaPropertyType = "HIGH_RISE" | "LANDED";

/** Fields used by Malaysia / UAE escrow config sub-panels. */
export type EscrowConfigFormFields = {
  escrowWithdrawalMode: EscrowWithdrawalMode;
  malaysiaPropertyType: MalaysiaPropertyType;
  certificationIntervalMonths: number;
  retentionFirstReleaseMonths: number;
  retentionFinalReleaseMonths: number;
  retentionPercent: number;
  auDepositPct: number;
  auBalancePct: number;
};

export type EscrowConfigUpdateField = <K extends keyof EscrowConfigFormFields>(
  field: K,
  value: EscrowConfigFormFields[K]
) => void;

/** Country bucket for escrow tab visibility (Component 4 Step 5). */
export type EscrowCountryBucket = "MY" | "UAE" | "SA" | "AU" | "VN" | "TH";
