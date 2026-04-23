/** Step 13 defaults — POWC split of total POWC (must sum to 100%). */
export const DEFAULT_POWC_ALLOCATION = {
  siteEstablishment: 40,
  overhead: 12,
  authorityFees: 48,
} as const;

/** Step 13 defaults — soft cost split of total soft costs (must sum to 100%). */
export const DEFAULT_SOFT_COST_ALLOCATION = {
  architect: 30,
  projectManagement: 20,
  engineering: 30,
  geotechnical: 10,
  otherFees: 10,
} as const;

export type PowcAllocationFractions = {
  siteEstablishment: number;
  overhead: number;
  authorityFees: number;
};
