"use client";

import type { CustomerTier } from "@/lib/entitlements";

interface Props {
  open: boolean;
  usedExports: number;
  tier: CustomerTier;
  onClose: () => void;
}

export default function ReportUpgradeModal({
  open,
  usedExports,
  tier,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-200">
        <h3 className="text-lg font-semibold text-white">
          {usedExports > 0 && tier === "explorer"
            ? "You've used your free report"
            : "Unlock clean, unlimited reports"}
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          The Free tier includes one watermarked feasibility report. Upgrade to
          Professional ($99 lifetime + pay-per-report) for clean unlimited
          reports — or Advisory for unlimited reports with your own logo.
        </p>
        <div className="mt-4 flex gap-3">
          <a
            href="/#pricing"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            See Pricing
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
