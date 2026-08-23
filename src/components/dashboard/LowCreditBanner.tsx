"use client";

import { useEffect, useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { LOW_CREDIT_THRESHOLD } from "@/lib/validity";
import UpgradeModal from "@/components/ui/UpgradeModal";

const DISMISS_KEY_PREFIX = "feasibuild-low-credit-banner";

export default function LowCreditBanner() {
  const { reportCredits, hasUnlimitedReports, isLoading } = useSubscription();
  const [dismissed, setDismissed] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const shouldShow =
    !isLoading &&
    !hasUnlimitedReports &&
    reportCredits > 0 &&
    reportCredits <= LOW_CREDIT_THRESHOLD;

  useEffect(() => {
    if (!shouldShow) {
      setDismissed(true);
      return;
    }
    try {
      setDismissed(
        sessionStorage.getItem(`${DISMISS_KEY_PREFIX}:${reportCredits}`) === "1"
      );
    } catch {
      setDismissed(false);
    }
  }, [shouldShow, reportCredits]);

  if (!shouldShow || dismissed) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(`${DISMISS_KEY_PREFIX}:${reportCredits}`, "1");
    } catch {
      /* ignore quota / private mode */
    }
    setDismissed(true);
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300 sm:flex-row sm:items-center sm:justify-between">
        <p>
          ⚡ Only {reportCredits} credit{reportCredits > 1 ? "s" : ""} left. Use
          them up to unlock your next pack — or go Unlimited and never count
          credits again.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            View Unlimited Pack
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-2 py-1 text-amber-400 hover:bg-amber-500/20 hover:text-amber-200"
            aria-label="Dismiss low credit alert"
          >
            ✕
          </button>
        </div>
      </div>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
