"use client";

import {
  MILESTONE_DEFAULT_COMPLETION_RETENTION_PCT,
  MILESTONE_DEFAULT_DLP_MONTHS,
  MILESTONE_DEFAULT_DLP_RETENTION_PCT,
  isSaudiLocation,
  resolveMilestoneCertFrequency,
  resolveMilestoneCompletionRetentionPercent,
  resolveMilestoneDlpForm,
  resolveMilestoneDlpRetentionMonths,
  resolveMilestoneDlpRetentionPercent,
  resolveMilestonePermitLandAndFinancing,
  resolveMilestoneSweepEnabled,
  type MilestoneCertFrequency,
  type MilestoneDlpForm,
} from "@/lib/financing-engine/escrow-rules";
import useFinModelStore from "@/store/useFinModelStore";

type MilestoneRetentionEscrowConfigProps = {
  /** Total C1 hard construction cost, the DLP basis. */
  constructionCost: number;
  formatAmount: (amount: number) => string;
  onCompletionRetentionPercent: (value: number) => void;
  onDlpRetentionPercent: (value: number) => void;
  onDlpRetentionMonths: (value: number) => void;
  onDlpForm: (value: MilestoneDlpForm) => void;
  onPermitLandAndFinancing: (value: boolean) => void;
  onSweepEnabled: (value: boolean) => void;
};

function clampPercent(raw: number, fallback: number): number {
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(100, Math.max(0, raw));
}

export default function MilestoneRetentionEscrowConfig({
  constructionCost,
  formatAmount,
  onCompletionRetentionPercent,
  onDlpRetentionPercent,
  onDlpRetentionMonths,
  onDlpForm,
  onPermitLandAndFinancing,
  onSweepEnabled,
}: MilestoneRetentionEscrowConfigProps) {
  const escrowConfig = useFinModelStore((s) => s.sale.financing.escrowConfig);
  const updateFinancing = useFinModelStore((s) => s.updateFinancing);
  const country = useFinModelStore((s) => s.sale.projectInfo.country);
  const countryCode = useFinModelStore((s) => s.sale.projectInfo.countryCode);
  const location = { country, countryCode };
  const ksaOverlay = isSaudiLocation(country, countryCode);

  const certFrequency = resolveMilestoneCertFrequency(escrowConfig?.milestoneCertFrequency);
  const completionRetentionPercent = resolveMilestoneCompletionRetentionPercent(
    escrowConfig?.milestoneCompletionRetentionPercent,
    location
  );
  const completionRetentionLocked = ksaOverlay;
  const dlpRetentionPercent = resolveMilestoneDlpRetentionPercent(
    escrowConfig?.milestoneDlpRetentionPercent
  );
  const dlpRetentionMonths = resolveMilestoneDlpRetentionMonths(
    escrowConfig?.milestoneDlpRetentionMonths
  );
  const dlpForm = resolveMilestoneDlpForm(escrowConfig?.milestoneDlpForm);
  const permitLandAndFinancing = resolveMilestonePermitLandAndFinancing(
    escrowConfig?.milestonePermitLandAndFinancing
  );
  const sweepEnabled = resolveMilestoneSweepEnabled(
    escrowConfig?.milestoneSweepEnabled,
    location
  );
  const sweepLocked = ksaOverlay;

  const writeEscrow = (partial: {
    milestoneCertFrequency?: MilestoneCertFrequency;
    milestoneCompletionRetentionPercent?: number;
    milestoneDlpRetentionPercent?: number;
    milestoneDlpRetentionMonths?: number;
    milestoneDlpForm?: MilestoneDlpForm;
    milestonePermitLandAndFinancing?: boolean;
    milestoneSweepEnabled?: boolean;
  }) => {
    const current = useFinModelStore.getState().sale.financing.escrowConfig;
    updateFinancing({ escrowConfig: { ...current, ...partial } }, "sale");
  };

  const dlpTarget = (dlpRetentionPercent / 100) * Math.max(0, constructionCost);
  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-3 text-lg font-semibold text-white">
          Milestone & Retention Escrow Rule Configuration
        </h3>
        <p className="text-sm text-slate-300">
          Buyer proceeds are lodged in full. Certified project costs withdraw the following month.
          Until physical completion the account keeps a floor against cumulative collections. After
          completion a share of construction cost is held for the defect-liability period, unless a
          bank guarantee replaces that cash.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Certification frequency
          </label>
          <select
            value={certFrequency}
            onChange={(e) => {
              const value = e.target.value === "quarterly" ? "quarterly" : "monthly";
              writeEscrow({ milestoneCertFrequency: value });
            }}
            className={inputClass}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            {certFrequency === "quarterly"
              ? "Certification and withdrawal evaluation occurs at months 2, 5, 8, and so on (every 3 months), with payment the following month."
              : "Certification and withdrawal evaluation occurs every month."}
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Completion retention %
            {completionRetentionLocked ? " (locked)" : ""}
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={completionRetentionPercent}
            disabled={completionRetentionLocked}
            onChange={(e) => {
              const value = clampPercent(
                parseFloat(e.target.value),
                MILESTONE_DEFAULT_COMPLETION_RETENTION_PCT
              );
              writeEscrow({ milestoneCompletionRetentionPercent: value });
              onCompletionRetentionPercent(value);
            }}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            Default {MILESTONE_DEFAULT_COMPLETION_RETENTION_PCT}% of cumulative buyer collections,
            held until 100% physical completion.
            {completionRetentionLocked
              ? " Locked at 20% for this location."
              : " Editable for this location."}
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            DLP retention %
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={dlpRetentionPercent}
            onChange={(e) => {
              const value = clampPercent(
                parseFloat(e.target.value),
                MILESTONE_DEFAULT_DLP_RETENTION_PCT
              );
              writeEscrow({ milestoneDlpRetentionPercent: value });
              onDlpRetentionPercent(value);
            }}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            Default {MILESTONE_DEFAULT_DLP_RETENTION_PCT}% of total construction cost, retained at
            completion.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            DLP retention months
          </label>
          <input
            type="number"
            min={MILESTONE_DEFAULT_DLP_MONTHS}
            step={1}
            value={dlpRetentionMonths}
            onChange={(e) => {
              const next = parseInt(e.target.value, 10);
              const value = Number.isFinite(next)
                ? Math.max(MILESTONE_DEFAULT_DLP_MONTHS, next)
                : MILESTONE_DEFAULT_DLP_MONTHS;
              writeEscrow({ milestoneDlpRetentionMonths: value });
              onDlpRetentionMonths(value);
            }}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            Minimum {MILESTONE_DEFAULT_DLP_MONTHS}. Horizon and the cash release are completion plus
            this many months.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            DLP form
          </label>
          <select
            value={dlpForm}
            onChange={(e) => {
              const value = e.target.value === "bank_guarantee" ? "bank_guarantee" : "cash";
              writeEscrow({ milestoneDlpForm: value });
              onDlpForm(value);
            }}
            className={inputClass}
          >
            <option value="cash">Cash retained in escrow</option>
            <option value="bank_guarantee">Bank guarantee (no cash retained)</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            A bank guarantee replaces the cash hold. The release at the end of the DLP is then zero.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          DLP hold
        </p>
        <p className="mt-2 text-lg font-semibold text-white">
          {dlpForm === "bank_guarantee" ? "Bank guarantee" : formatAmount(dlpTarget)}
        </p>
        <p className="mt-1 text-sm text-slate-300">
          {dlpRetentionPercent}% × total construction cost ({formatAmount(constructionCost)})
          {dlpForm === "bank_guarantee"
            ? ". No cash is retained; the obligation is secured by a bank guarantee."
            : `, held for ${dlpRetentionMonths} months after completion.`}
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
        <input
          type="checkbox"
          checked={permitLandAndFinancing}
          onChange={(e) => {
            writeEscrow({ milestonePermitLandAndFinancing: e.target.checked });
            onPermitLandAndFinancing(e.target.checked);
          }}
          className="mt-1 text-emerald-500"
        />
        <span>
          <span className="block text-sm font-medium text-slate-200">
            Land value and financing repayments are permitted uses
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            When on, the land cost row and financing repayment rows join the certified entitlement.
            Marketing and brokerage stay excluded.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
        <input
          type="checkbox"
          checked={sweepEnabled}
          disabled={sweepLocked}
          onChange={(e) => {
            writeEscrow({ milestoneSweepEnabled: e.target.checked });
            onSweepEnabled(e.target.checked);
          }}
          className="mt-1 text-emerald-500 disabled:cursor-not-allowed"
        />
        <span>
          <span className="block text-sm font-medium text-slate-200">
            Sweep the construction lender first
            {sweepLocked ? " (locked)" : ""}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            When on, each withdrawal repays the construction facility before the developer receives
            the surplus. Land loans are never swept.
            {sweepLocked ? " Locked on for this location." : ""}
          </span>
        </span>
      </label>

      <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          The 20% Floor
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Until the project reaches 100% physical completion, the escrow account balance must never
          fall below 20% of cumulative buyer collections. Withdrawals are capped to maintain this
          floor.
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          The 5% DLP Hold
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Upon completion, 5% of the total construction cost is retained in the escrow account for
          12 months (or replaced by a bank guarantee).
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Permitted Uses
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Construction, site preliminaries, consultants, land value payments, and financing
          repayments are permitted. Marketing and brokerage are excluded.
        </p>
      </div>

      {ksaOverlay ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          Land is 100% equity while this rule is selected; the Step 3 land term loan is suspended.
        </p>
      ) : null}
    </div>
  );
}
