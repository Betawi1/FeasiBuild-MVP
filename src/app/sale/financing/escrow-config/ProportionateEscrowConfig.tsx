"use client";

import {
  PROPORTIONATE_DEFAULT_SPLIT_PCT,
  resolveProportionateCertFrequency,
  resolveProportionateEscrowPercent,
  resolveProportionateInterestPermitted,
  resolveProportionateSweepEnabled,
  type ProportionateCertFrequency,
} from "@/lib/financing-engine/escrow-rules";
import useFinModelStore from "@/store/useFinModelStore";

type ProportionateEscrowConfigProps = {
  /** Location overlay: the split cannot be edited. */
  splitLocked: boolean;
  /** Location overlay: the construction-lender sweep cannot be turned off. */
  sweepLocked: boolean;
  onSplitPercent: (value: number) => void;
  onCertFrequency: (value: ProportionateCertFrequency) => void;
  onSweepEnabled: (value: boolean) => void;
  onInterestPermitted: (value: boolean) => void;
};

function clampPercent(raw: number): number {
  if (!Number.isFinite(raw)) return PROPORTIONATE_DEFAULT_SPLIT_PCT;
  return Math.min(100, Math.max(0, raw));
}

export default function ProportionateEscrowConfig({
  splitLocked,
  sweepLocked,
  onSplitPercent,
  onCertFrequency,
  onSweepEnabled,
  onInterestPermitted,
}: ProportionateEscrowConfigProps) {
  const escrowConfig = useFinModelStore((s) => s.sale.financing.escrowConfig);
  const updateFinancing = useFinModelStore((s) => s.updateFinancing);
  const country = useFinModelStore((s) => s.sale.projectInfo.country);
  const countryCode = useFinModelStore((s) => s.sale.projectInfo.countryCode);
  const location = { country, countryCode };

  const certFrequency = resolveProportionateCertFrequency(
    escrowConfig?.proportionateCertFrequency
  );
  const split = clampPercent(
    resolveProportionateEscrowPercent(escrowConfig?.proportionateEscrowPercent, location)
  );
  const sweepEnabled = resolveProportionateSweepEnabled(
    escrowConfig?.proportionateSweepEnabled,
    location
  );
  const interestPermitted = resolveProportionateInterestPermitted(
    escrowConfig?.proportionateConstructionInterestPermitted
  );
  const free = Math.round((100 - split) * 10) / 10;
  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white";
  const certLabel = certFrequency === "quarterly" ? "quarterly" : "monthly";

  const writeEscrow = (
    partial: {
      proportionateEscrowPercent?: number;
      proportionateCertFrequency?: ProportionateCertFrequency;
      proportionateSweepEnabled?: boolean;
      proportionateConstructionInterestPermitted?: boolean;
    }
  ) => {
    const current = useFinModelStore.getState().sale.financing.escrowConfig;
    updateFinancing(
      {
        escrowConfig: {
          ...current,
          ...partial,
        },
      },
      "sale"
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-3 text-lg font-semibold text-white">
          Proportionate Escrow Rule Configuration
        </h3>
        <p className="text-sm text-slate-300">
          A fixed share of every buyer payment is locked in a designated account. Withdrawals
          are certified in proportion to construction completion and paid the following month.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Designated-account split %
          </label>
          {splitLocked ? (
            <p className="text-sm text-slate-300">
              {PROPORTIONATE_DEFAULT_SPLIT_PCT}%
              <span className="mt-1 block text-xs text-slate-500">
                Statutory split fixed at 70% for this location
              </span>
            </p>
          ) : (
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={split}
              onChange={(e) => {
                const value = clampPercent(parseFloat(e.target.value));
                writeEscrow({ proportionateEscrowPercent: value });
                onSplitPercent(value);
              }}
              className={inputClass}
            />
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Certification frequency
          </label>
          <select
            value={certFrequency}
            onChange={(e) => {
              const value = e.target.value === "quarterly" ? "quarterly" : "monthly";
              writeEscrow({ proportionateCertFrequency: value });
              onCertFrequency(value);
            }}
            className={inputClass}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            {certFrequency === "quarterly"
              ? "Quarterly certification falls in months 2, 5, 8, and so on. The withdrawal is paid the following month."
              : "Monthly certification runs every month. The withdrawal is paid the following month."}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sweepLocked ? (
          <p className="text-xs text-slate-500">Lender sweep mandatory for this location</p>
        ) : (
          <label className="flex items-center gap-3 rounded border border-slate-700 bg-slate-900/50 p-3">
            <input
              type="checkbox"
              checked={sweepEnabled}
              onChange={(e) => {
                writeEscrow({ proportionateSweepEnabled: e.target.checked });
                onSweepEnabled(e.target.checked);
              }}
              className="text-emerald-500"
            />
            <span className="text-sm text-slate-200">
              Sweep the construction lender before the developer withdrawal
            </span>
          </label>
        )}

        <label className="flex items-center gap-3 rounded border border-slate-700 bg-slate-900/50 p-3">
          <input
            type="checkbox"
            checked={interestPermitted}
            onChange={(e) => {
              writeEscrow({
                proportionateConstructionInterestPermitted: e.target.checked,
              });
              onInterestPermitted(e.target.checked);
            }}
            className="text-emerald-500"
          />
          <span className="text-sm text-slate-200">
            Construction-loan interest paid in cash counts toward the withdrawal entitlement
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-300">
            {split}% of every buyer payment enters the designated account; {free}% is immediate
            developer free cash.
          </p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-300">
            Withdrawals = certified completion % × total permitted project cost, capped by the
            account balance. Certified {certLabel}.
          </p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-300">
            Permitted: construction, land principal, site preliminaries (POWC),
            construction-related consultants, construction finance payments. Never: marketing,
            brokerage, land finance costs, head-office admin — those are paid from the {free}%
            free cash.
          </p>
        </div>
      </div>
    </div>
  );
}
