"use client";

import type { EscrowConfigFormFields, EscrowConfigUpdateField } from "./types";

type UaeEscrowConfigProps = {
  formData: Pick<EscrowConfigFormFields, "certificationIntervalMonths" | "retentionPercent">;
  updateField: EscrowConfigUpdateField;
  isLocked: boolean;
};

export default function UaeEscrowConfig({
  formData,
  updateField,
  isLocked,
}: UaeEscrowConfigProps) {
  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-4 text-lg font-semibold text-white">
          UAE/SA Certification Interval Configuration
        </h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Certification Interval (Months)
            </label>
            <select
              value={formData.certificationIntervalMonths}
              onChange={(e) =>
                updateField(
                  "certificationIntervalMonths",
                  parseInt(e.target.value, 10) as 3 | 6
                )
              }
              disabled={isLocked}
              className={inputClass}
            >
              <option value={3}>Every 3 Months</option>
              <option value={6}>Every 6 Months</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Progress withdrawals occur at each certification milestone
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Retention Percentage
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={formData.retentionPercent}
              onChange={(e) =>
                updateField(
                  "retentionPercent",
                  Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                )
              }
              disabled={isLocked}
              className={inputClass}
            />
            <p className="mt-2 text-xs text-slate-500">Held until project completion</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700">
          <p className="mb-1 text-xs text-slate-400">Release timing (illustrative)</p>
          <p className="text-sm font-medium text-white">12 months post completion</p>
        </div>
      </div>
    </div>
  );
}
