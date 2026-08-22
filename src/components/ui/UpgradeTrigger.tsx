"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { paypalVisible } from "@/lib/paypal-gate";
import UpgradeModal from "@/components/ui/UpgradeModal";

export default function UpgradeTrigger() {
  const [open, setOpen] = useState(false);
  const { isPro, isLoading } = useSubscription();

  console.log("[UpgradeTrigger]", {
    isPro,
    isLoading,
    visible: paypalVisible(),
  });

  if (isLoading || isPro || !paypalVisible()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
      >
        ⚡ Upgrade to Pro
      </button>
      <UpgradeModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
