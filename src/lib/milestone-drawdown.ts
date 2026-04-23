/**
 * Hybrid milestone drawdown: progress % thresholds + certification interval,
 * with months derived from the cumulative cost "S-curve" (monthly outflow schedule).
 */

export type ReimbursementMilestone = {
  month: number;
  label: string;
  thresholdPct: number | null;
};

export type ComputeReimbursementMilestonesResult = {
  milestones: ReimbursementMilestone[];
  /** Progress % of TDC at each milestone month (0–100) */
  progressAtMonth: number[];
  validationWarnings: string[];
};

function clampMonth(m: number, constructionPeriod: number) {
  return Math.max(0, Math.min(constructionPeriod, Math.round(m)));
}

/**
 * Cumulative total project cost through month m (land + construction costs from schedule).
 */
export function buildCumulativeTdcProgress(
  costSchedule: number[],
  totalLandCost: number,
  landCost: number,
  constructionPeriod: number,
  tdc: number
): { cumTotalByMonth: number[]; progressPctByMonth: number[] } {
  const cumTotalByMonth: number[] = [];
  let cumBase = 0;
  const maxM = Math.max(constructionPeriod, (costSchedule?.length ?? 1) - 1);
  for (let m = 0; m <= maxM; m++) {
    const landInSchedule = m === 0 ? totalLandCost : 0;
    const baseCostThisMonth = (costSchedule[m] || 0) - landInSchedule;
    cumBase += baseCostThisMonth;
    const cumTotal = landCost + cumBase;
    cumTotalByMonth[m] = cumTotal;
  }
  const denom = tdc > 0 ? tdc : 1;
  const progressPctByMonth = cumTotalByMonth.map((c) =>
    Math.min(100, Math.max(0, (c / denom) * 100))
  );
  return { cumTotalByMonth, progressPctByMonth };
}

export function computeReimbursementMilestones(options: {
  autoCalculateMilestoneMonths: boolean;
  milestoneThresholds: number[];
  certificationInterval: number;
  overrideMilestoneMonths?: number[] | null;
  costSchedule: number[];
  totalLandCost: number;
  landCost: number;
  constructionPeriod: number;
  tdc: number;
}): ComputeReimbursementMilestonesResult {
  const {
    autoCalculateMilestoneMonths,
    milestoneThresholds,
    certificationInterval,
    overrideMilestoneMonths,
    costSchedule,
    totalLandCost,
    landCost,
    constructionPeriod,
    tdc,
  } = options;

  const warnings: string[] = [];
  const interval = Math.max(0, Math.round(certificationInterval));

  const thresholds = [...milestoneThresholds]
    .map((t) => Number(t))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  const { progressPctByMonth } = buildCumulativeTdcProgress(
    costSchedule,
    totalLandCost,
    landCost,
    constructionPeriod,
    tdc
  );

  const findFirstMonthForProgressPct = (pct: number): number => {
    const target = Math.min(100, Math.max(0, pct));
    for (let m = 0; m <= constructionPeriod; m++) {
      const p = progressPctByMonth[m] ?? 0;
      if (p >= target - 1e-6) return m;
    }
    return constructionPeriod;
  };

  if (!autoCalculateMilestoneMonths) {
    const raw = overrideMilestoneMonths?.length
      ? [...overrideMilestoneMonths]
      : [0, 10, 18, 25, 30];
    const milestones: ReimbursementMilestone[] = [];
    const progressAtMonth: number[] = [];

    for (let i = 0; i < raw.length; i++) {
      const month = clampMonth(raw[i] ?? 0, constructionPeriod);
      if (i === 0) {
        milestones.push({
          month,
          label: "Land Purchase",
          thresholdPct: 0,
        });
      } else {
        const th = thresholds[i - 1];
        milestones.push({
          month,
          label:
            th != null && th >= 100
              ? "Completion"
              : `${Math.round(th ?? 0)}% Progress`,
          thresholdPct: th ?? null,
        });
      }
      progressAtMonth.push(progressPctByMonth[month] ?? 0);
      if (month > constructionPeriod) {
        warnings.push(`Milestone M${month} is after construction period M${constructionPeriod}.`);
      }
    }
    return { milestones, progressAtMonth, validationWarnings: warnings };
  }

  // Auto: land at M0, then each threshold from S-curve + certification spacing
  const milestones: ReimbursementMilestone[] = [];
  const progressAtMonth: number[] = [];

  milestones.push({
    month: 0,
    label: "Land Purchase",
    thresholdPct: 0,
  });
  progressAtMonth.push(progressPctByMonth[0] ?? 0);

  let prevMonth = 0;

  for (const th of thresholds) {
    if (th <= 0) continue;
    let rawM = findFirstMonthForProgressPct(th);
    if (interval > 0) {
      rawM = Math.max(rawM, prevMonth + interval);
    }
    const m = clampMonth(rawM, constructionPeriod);
    prevMonth = m;

    const label =
      th >= 100 ? "Completion" : `${Math.round(th)}% Progress`;
    milestones.push({
      month: m,
      label,
      thresholdPct: th,
    });
    progressAtMonth.push(progressPctByMonth[m] ?? 0);

    const actualPct = progressPctByMonth[m] ?? 0;
    if (actualPct + 0.05 < th) {
      warnings.push(
        `By M${m}, cumulative spend is ~${actualPct.toFixed(1)}% of TDC — target ${th}% may not be reached before end of construction.`
      );
    }
  }

  // De-duplicate same month (keep first label)
  const dedup: ReimbursementMilestone[] = [];
  let lastM = -1;
  for (const row of milestones) {
    if (row.month === lastM && dedup.length > 0) {
      warnings.push(
        `Milestone "${row.label}" maps to the same month as the previous milestone (M${row.month}).`
      );
      continue;
    }
    lastM = row.month;
    dedup.push(row);
  }

  return {
    milestones: dedup,
    progressAtMonth: dedup.map((d) => progressPctByMonth[d.month] ?? 0),
    validationWarnings: warnings,
  };
}
