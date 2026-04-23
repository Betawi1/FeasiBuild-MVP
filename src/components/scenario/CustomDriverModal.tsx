"use client";

import React, { useState } from "react";

export interface CustomDriverData {
  id: string;
  name: string;
  baseValue: number;
  shockValue: number;
  minShock: number;
  maxShock: number;
  step: number;
  unit: "%" | "months" | "currency" | "bps" | "pp" | "%rev";
  impactType: "revenue" | "cost" | "timeline" | "custom";
}

interface CustomDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDriver: (driver: CustomDriverData) => boolean;
  existingCustomDriversCount: number;
}

export const CustomDriverModal: React.FC<CustomDriverModalProps> = ({
  isOpen,
  onClose,
  onAddDriver,
  existingCustomDriversCount,
}) => {
  const [formData, setFormData] = useState<CustomDriverData>({
    id: "",
    name: "",
    baseValue: 0,
    shockValue: 0,
    minShock: -25,
    maxShock: 25,
    step: 5,
    unit: "%",
    impactType: "revenue",
  });

  const [error, setError] = useState<string | null>(null);

  const hotelTemplates: Array<Pick<
    CustomDriverData,
    "name" | "baseValue" | "minShock" | "maxShock" | "step" | "unit" | "impactType"
  >> = [
    {
      name: "Property Tax Increase",
      baseValue: 0,
      minShock: 0,
      maxShock: 50,
      step: 5,
      unit: "%",
      impactType: "cost",
    },
    {
      name: "Management Fee Increase",
      baseValue: 0,
      minShock: 0,
      maxShock: 1,
      step: 0.1,
      unit: "pp",
      impactType: "cost",
    },
    {
      name: "Stabilization Period",
      baseValue: 24,
      minShock: 0,
      maxShock: 24,
      step: 1,
      unit: "months",
      impactType: "timeline",
    },
    {
      name: "F&B Revenue Decline",
      baseValue: 0,
      minShock: -25,
      maxShock: 0,
      step: 5,
      unit: "%",
      impactType: "revenue",
    },
    {
      name: "Soft Costs Overrun",
      baseValue: 0,
      minShock: 0,
      maxShock: 30,
      step: 5,
      unit: "%",
      impactType: "cost",
    },
    {
      name: "Insurance Cost Increase",
      baseValue: 0,
      minShock: 0,
      maxShock: 50,
      step: 5,
      unit: "%",
      impactType: "cost",
    },
  ];

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      setError("Driver name is required");
      return;
    }

    if (formData.minShock >= formData.maxShock) {
      setError("Min shock must be less than max shock");
      return;
    }

    const driverWithId: CustomDriverData = {
      ...formData,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    };

    const success = onAddDriver(driverWithId);

    if (success) {
      setFormData({
        id: "",
        name: "",
        baseValue: 0,
        shockValue: 0,
        minShock: -25,
        maxShock: 25,
        step: 5,
        unit: "%",
        impactType: "revenue",
      });
      setError(null);
      onClose();
    } else {
      setError("Maximum 3 custom drivers allowed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white">
            🎛️ Define Custom Shock Driver
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
            <p className="text-xs font-medium text-slate-300">
              Hotel templates (optional)
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Click to prefill a common hotel driver, then tweak ranges as needed.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {hotelTemplates.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      name: t.name,
                      baseValue: t.baseValue,
                      minShock: t.minShock,
                      maxShock: t.maxShock,
                      step: t.step,
                      unit: t.unit,
                      impactType: t.impactType,
                    }))
                  }
                  className="rounded-full border border-slate-600 bg-slate-900/40 px-3 py-1 text-xs text-slate-300 hover:border-slate-500 hover:bg-slate-900/60"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Driver Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder='e.g., "Marketing Spend", "Permit Delay"'
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Base Value</label>
            <input
              type="number"
              value={formData.baseValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  baseValue: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="0"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Min Shock</label>
              <input
                type="number"
                value={formData.minShock}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minShock: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Max Shock</label>
              <input
                type="number"
                value={formData.maxShock}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxShock: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Unit</label>
            <select
              value={formData.unit}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  unit: e.target.value as CustomDriverData["unit"],
                })
              }
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="%">Percentage (%)</option>
              <option value="pp">Percentage points (pp)</option>
              <option value="bps">Basis points (bps)</option>
              <option value="%rev">% of revenue</option>
              <option value="months">Months</option>
              <option value="currency">Currency (AED)</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Impact Logic</label>
            <div className="space-y-2">
              {(
                [
                  {
                    value: "revenue" as const,
                    label: "Affects Revenue (multiply inflows)",
                    icon: "💚",
                  },
                  {
                    value: "cost" as const,
                    label: "Affects Costs (multiply outflows)",
                    icon: "❤️",
                  },
                  {
                    value: "timeline" as const,
                    label: "Affects Timeline (shift cash flows)",
                    icon: "📅",
                  },
                  {
                    value: "custom" as const,
                    label: "Custom formula (Advanced)",
                    icon: "⚙️",
                  },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                    formData.impactType === option.value
                      ? "border-emerald-500 bg-emerald-500/20"
                      : "border-slate-600 bg-slate-800 hover:border-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="impactType"
                    value={option.value}
                    checked={formData.impactType === option.value}
                    onChange={() =>
                      setFormData({ ...formData, impactType: option.value })
                    }
                    className="h-4 w-4 text-emerald-500"
                  />
                  <span className="text-sm text-slate-300">
                    {option.icon} {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {existingCustomDriversCount >= 3 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/20 p-3 text-sm text-amber-200">
              ⚠️ Maximum 3 custom drivers allowed
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/20 p-3 text-sm text-red-200">
              ❌ {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-700 p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-6 py-2.5 text-sm text-slate-300 transition-all hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={existingCustomDriversCount >= 3}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✅ Add Driver
          </button>
        </div>
      </div>
    </div>
  );
};
