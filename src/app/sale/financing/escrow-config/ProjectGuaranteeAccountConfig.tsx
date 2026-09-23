"use client";

import {
  GUARANTEE_DEFAULT_PROFIT_MILESTONE_PCT,
  GUARANTEE_DEFAULT_RETENTION_MONTHS,
  GUARANTEE_DEFAULT_RETENTION_PCT,
  GUARANTEE_DEFAULT_THRESHOLD_PCT,
  type GuaranteeRetentionBasis,
} from "@/lib/financing-engine/escrow-rules";

type ProjectGuaranteeAccountConfigProps = {
  thresholdPercent: number;
  profitMilestonePercent: number;
  retentionPercent: number;
  retentionBasis: GuaranteeRetentionBasis;
  retentionMonths: number;
  interestPermitted: boolean;
  /** Total C1 hard construction cost. */
  constructionCost: number;
  /** Sales proceeds collected in the model (cumulative). */
  salesProceedsToDate: number;
  formatAmount: (amount: number) => string;
  /** Abu Dhabi location overlay. Others keep the land loan and see the sweep note instead. */
  abuDhabiOverlay: boolean;
  onThresholdPercent: (value: number) => void;
  onProfitMilestonePercent: (value: number) => void;
  onRetentionPercent: (value: number) => void;
  onRetentionBasis: (value: GuaranteeRetentionBasis) => void;
  onRetentionMonths: (value: number) => void;
  onInterestPermitted: (value: boolean) => void;
};

function clampPercent(raw: number, fallback: number): number {
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(100, Math.max(0, raw));
}

export default function ProjectGuaranteeAccountConfig({
  thresholdPercent,
  profitMilestonePercent,
  retentionPercent,
  retentionBasis,
  retentionMonths,
  interestPermitted,
  constructionCost,
  salesProceedsToDate,
  formatAmount,
  abuDhabiOverlay,
  onThresholdPercent,
  onProfitMilestonePercent,
  onRetentionPercent,
  onRetentionBasis,
  onRetentionMonths,
  onInterestPermitted,
}: ProjectGuaranteeAccountConfigProps) {
  const retentionBase =
    retentionBasis === "construction_cost" ? constructionCost : salesProceedsToDate;
  const retentionTarget = (retentionPercent / 100) * Math.max(0, retentionBase);
  const milestoneTooLow = profitMilestonePercent <= thresholdPercent;
  const milestoneTooHigh = profitMilestonePercent >= 100;
  const milestoneInvalid = milestoneTooLow || milestoneTooHigh;
  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-3 text-lg font-semibold text-white">
          Project Guarantee Account Rule Configuration
        </h3>
        <p className="text-sm text-slate-300">
          Buyer proceeds are held in a project guarantee account. Permitted project costs are
          reimbursed after the withdrawal threshold; profit surplus is released at two milestones,
          with the construction lender swept first.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Withdrawal threshold %
          </label>
          <input
            type="number"
            min={0}
            max={99}
            step={1}
            value={thresholdPercent}
            onChange={(e) =>
              onThresholdPercent(
                clampPercent(parseFloat(e.target.value), GUARANTEE_DEFAULT_THRESHOLD_PCT)
              )
            }
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            Default {GUARANTEE_DEFAULT_THRESHOLD_PCT}%. Reimbursements start the month after
            cumulative construction reaches this level.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Stage-1 profit milestone %
          </label>
          <input
            type="number"
            min={1}
            max={99}
            step={1}
            value={profitMilestonePercent}
            onChange={(e) =>
              onProfitMilestonePercent(
                clampPercent(
                  parseFloat(e.target.value),
                  GUARANTEE_DEFAULT_PROFIT_MILESTONE_PCT
                )
              )
            }
            className={`${inputClass} ${milestoneInvalid ? "border-amber-500" : ""}`}
          />
          <p className={`mt-1 text-xs ${milestoneInvalid ? "text-amber-400" : "text-slate-500"}`}>
            {milestoneInvalid
              ? "Must be greater than the withdrawal threshold and below 100%."
              : `Default ${GUARANTEE_DEFAULT_PROFIT_MILESTONE_PCT}%. Surplus above the cost-to-complete reserve and retention is released the following month.`}
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Defect retention %
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={retentionPercent}
            onChange={(e) =>
              onRetentionPercent(
                clampPercent(parseFloat(e.target.value), GUARANTEE_DEFAULT_RETENTION_PCT)
              )
            }
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            Default {GUARANTEE_DEFAULT_RETENTION_PCT}% of the retention basis, held until the
            retention release.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Retention months
          </label>
          <input
            type="number"
            min={GUARANTEE_DEFAULT_RETENTION_MONTHS}
            step={1}
            value={retentionMonths}
            onChange={(e) => {
              const next = parseInt(e.target.value, 10);
              onRetentionMonths(
                Number.isFinite(next)
                  ? Math.max(GUARANTEE_DEFAULT_RETENTION_MONTHS, next)
                  : GUARANTEE_DEFAULT_RETENTION_MONTHS
              );
            }}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            Minimum {GUARANTEE_DEFAULT_RETENTION_MONTHS}. Horizon and the Stage-3 release are
            completion plus this many months.
          </p>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Retention basis
        </label>
        <select
          value={retentionBasis}
          onChange={(e) =>
            onRetentionBasis(
              e.target.value === "construction_cost" ? "construction_cost" : "escrow_proceeds"
            )
          }
          className={inputClass}
        >
          <option value="construction_cost">Construction cost</option>
          <option value="escrow_proceeds">Escrow proceeds</option>
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Abu Dhabi defaults to construction cost. Other locations default to escrow proceeds.
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Retention target
        </p>
        <p className="mt-2 text-lg font-semibold text-white">{formatAmount(retentionTarget)}</p>
        <p className="mt-1 text-sm text-slate-300">
          {retentionPercent}% ×{" "}
          {retentionBasis === "construction_cost"
            ? "total C1 construction cost"
            : "cumulative sales to date"}{" "}
          ({formatAmount(retentionBase)})
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
        <input
          type="checkbox"
          checked={interestPermitted}
          onChange={(e) => onInterestPermitted(e.target.checked)}
          className="mt-1 text-emerald-500"
        />
        <span>
          <span className="block text-sm font-medium text-slate-200">
            Construction-loan interest is a permitted use
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            When on, cash interest on the construction facility can be reimbursed from the account.
            The lender cash sweep stays mandatory whenever that facility is outstanding.
          </span>
        </span>
      </label>

      <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Permitted uses
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Hard construction, POWC, soft costs (excluding Other Fees), FF&E, and construction
          finance payments when toggled. Never land, marketing/Other Fees, or sales commissions —
          those stay developer-funded.
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Release timing
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Reimbursements from the {thresholdPercent}% threshold +1 month — profit surplus at{" "}
          {profitMilestonePercent}% and 100% +1 month, lender sweeps first — post-completion
          collections top up the retention target before any developer release — {retentionPercent}%
          defect retention released {retentionMonths} months after handover.
        </p>
      </div>

      {abuDhabiOverlay ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          Land is 100% equity while this rule is selected; the Step 3 land term loan is suspended.
        </p>
      ) : (
        <p className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-300">
          Surplus sweeps to the construction lender first whenever a construction facility is
          outstanding; land loans are never swept.
        </p>
      )}
    </div>
  );
}
