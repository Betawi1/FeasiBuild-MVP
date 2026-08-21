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
          10/90 Rule Configuration
        </h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Purchase Deposit %
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                placeholder="10"
                value={formData.auDepositPct}
                onChange={(e) => {
                  const deposit = parseFloat(e.target.value) || 0;
                  updateField("auDepositPct", deposit);
                  updateField("auBalancePct", Math.max(0, Math.min(100, 100 - deposit)));
                }}
                disabled={isLocked}
                className={inputClass}
              />
              <span className="text-slate-400">% of Sales Proceeds</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Deposit held in trust during construction. Default is 10; deposit and balance must
              sum to 100.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Balance Payment %
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                placeholder="90"
                value={formData.auBalancePct}
                onChange={(e) => {
                  const balance = parseFloat(e.target.value) || 0;
                  updateField("auBalancePct", balance);
                  updateField("auDepositPct", Math.max(0, Math.min(100, 100 - balance)));
                }}
                disabled={isLocked}
                className={`${inputClass} text-emerald-400`}
              />
              <span className="text-slate-400">% of Sales Proceeds</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Balance paid at completion / settlement. Default is 90.
            </p>
          </div>
        </div>
        {Math.abs((formData.auDepositPct || 0) + (formData.auBalancePct || 0) - 100) > 0.01 && (
          <p className="mt-3 text-xs text-amber-400">
            Purchase Deposit % and Balance Payment % must sum to 100.
          </p>
        )}
      </div>
    </div>
  );
}
