import type { PowcAllocationFractions } from "@/lib/cash-outflow-default-allocations";

export type PowcSubMonthly = {
  site: number[];
  overhead: number[];
  authority: number[];
};

/**
 * Same timing as aggregate POWC, but returns Site / Overhead / Authority buckets separately.
 * Each array length = constructionPeriod + 1 (M0..Mn); M0 = 0 for all three.
 */
export function allocatePowcSubMonthlyFromStep13(
  powcTotal: number,
  constructionPeriod: number,
  allocation: PowcAllocationFractions
): PowcSubMonthly {
  const totalMonths = Math.max(0, constructionPeriod) + 1;
  const site = Array.from({ length: totalMonths }, () => 0);
  const overhead = Array.from({ length: totalMonths }, () => 0);
  const authority = Array.from({ length: totalMonths }, () => 0);

  if (powcTotal <= 0 || constructionPeriod <= 0) {
    return { site, overhead, authority };
  }

  const siteAmount =
    powcTotal * (Math.max(0, allocation.siteEstablishment) / 100);
  const overheadAmount =
    powcTotal * (Math.max(0, allocation.overhead) / 100);
  const authorityAmount =
    powcTotal * (Math.max(0, allocation.authorityFees) / 100);

  // Site establishment: 40% M1, 30% M2, 30% M3 (M0 and M4+ = 0). If n < 3,
  // normalize weights over M1..Mmin(3,n) so the full site bucket is allocated.
  if (siteAmount > 0) {
    const rawWeights = [0.4, 0.3, 0.3];
    const k = Math.min(3, constructionPeriod);
    if (k > 0) {
      const slice = rawWeights.slice(0, k);
      const sumW = slice.reduce((a, b) => a + b, 0);
      if (sumW > 0) {
        for (let i = 0; i < k; i++) {
          const m = i + 1;
          site[m] += siteAmount * (slice[i]! / sumW);
        }
      }
    }
  }

  if (overheadAmount > 0) {
    const per = overheadAmount / constructionPeriod;
    for (let m = 1; m <= constructionPeriod; m++) overhead[m] += per;
  }

  if (authorityAmount > 0) {
    const authEarly = authorityAmount * 0.5;
    const authLate = authorityAmount * 0.5;
    const earlySpan = Math.min(2, constructionPeriod);
    if (earlySpan > 0) {
      const perEarly = authEarly / earlySpan;
      for (let m = 1; m <= earlySpan; m++) authority[m] += perEarly;
    }
    const lateSpan = Math.min(3, constructionPeriod);
    if (lateSpan > 0) {
      const startLate = Math.max(1, constructionPeriod - lateSpan + 1);
      const lateCount = constructionPeriod - startLate + 1;
      const perLate = authLate / lateCount;
      for (let m = startLate; m <= constructionPeriod; m++) {
        authority[m] += perLate;
      }
    }
  }

  return { site, overhead, authority };
}

/**
 * POWC monthly curve (Step 13 timing): uses user % for Site / Overhead / Authority,
 * then applies fixed timing rules:
 * - Site: 40% M1, 30% M2, 30% M3 (M0, M4+ = 0); if n < 3, weights normalized over M1..Mn
 * - Overhead: even across all construction months M1..Mn
 * - Authority: 50% in first min(2, n) months, 50% over last min(3, n) months
 *
 * `constructionPeriod` = n (M1..Mn). Returns array length n+1; index 0 = M0 (always 0 here).
 */
export function allocatePowcMonthlyFromStep13(
  powcTotal: number,
  constructionPeriod: number,
  allocation: PowcAllocationFractions
): number[] {
  const { site, overhead, authority } = allocatePowcSubMonthlyFromStep13(
    powcTotal,
    constructionPeriod,
    allocation
  );
  return site.map((v, i) => v + overhead[i] + authority[i]);
}

/** Human-readable Step 13 POWC timing (for UI / Excel). */
export const POWC_STEP13_TIMING_NOTES =
  "Site: 40% M1, 30% M2, 30% M3 (M0 and M4+ zero); if fewer than 3 construction months, those shares are normalized over M1..Mn. Overhead: even across M1–Mn. Authority: 50% in first 2 months, 50% over last 3 months.";

/** Soft costs aggregate timing (M0 pre-construction + early design curve). */
export const SOFT_COSTS_TIMING_NOTES =
  "Soft costs (total): 50% at M0, 30% at M1, 20% at M2 (pre-construction + early design). Sub-lines show Step 13 % of total soft for reference only.";
