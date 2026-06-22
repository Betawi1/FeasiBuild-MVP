"use client";

import type { EscrowConfigFormFields, EscrowConfigUpdateField } from "./types";

type AustraliaEscrowConfigProps = {
  formData: Pick<EscrowConfigFormFields, "auDepositPct" | "auBalancePct">;
  updateField: EscrowConfigUpdateField;
  isLocked: boolean;
};

export default function AustraliaEscrowConfig({
  formData,
  updateField,
  isLocked,
}: AustraliaEscrowConfigProps) {
  const inputClass =
    "w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-center text-sm text-white disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Australia — 10/90 Withdrawal Rule
        </h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Purchase Deposit
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={formData.auDepositPct}
                onChange={(e) =>
                  updateField("auDepositPct", parseFloat(e.target.value) || 0)
                }
                disabled={isLocked}
                className={inputClass}
              />
              <span className="text-slate-400">% of Sales Proceeds</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Typically 10% (deposit) held until units are delivered. For Australian projects
              the minimum deposit is 10% of the purchase price.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Balance Payment
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={formData.auBalancePct}
                onChange={(e) =>
                  updateField("auBalancePct", parseFloat(e.target.value) || 0)
                }
                disabled={isLocked}
                className={`${inputClass} text-emerald-400`}
              />
              <span className="text-slate-400">% of Sales Proceeds</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Balance of the sales price are paid when project is completed. For Australian
              projects this is 90% of the sales price.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
