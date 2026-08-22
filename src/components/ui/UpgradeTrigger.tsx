"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { paypalVisible } from "@/lib/paypal-gate";
import UpgradeModal from "@/components/ui/UpgradeModal";

export default function UpgradeTrigger() {
  const [open, setOpen] = useState(false);
  const { isPro, advisoryActive, isLoading } = useSubscription();

  if (isLoading) return null;
  if (advisoryActive) return null;
  if (!paypalVisible()) return null;

  const label = isPro ? "➕ Buy Report Credits" : "⚡ Upgrade to Pro";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
      >
        {label}
      </button>
      <UpgradeModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
