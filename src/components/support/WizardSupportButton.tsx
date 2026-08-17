"use client";

import { LifeBuoy } from "lucide-react";
import { buildSupportLink } from "@/lib/constants/support";
import { useSupportWizardContext } from "@/hooks/useSupportWizardContext";

export default function WizardSupportButton() {
  const context = useSupportWizardContext();
  const href = buildSupportLink(context || undefined);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-lg bg-slate-700 p-2 text-slate-200 transition-colors hover:bg-slate-600 hover:text-emerald-400"
      aria-label="Talk to a human on Telegram"
      title="Talk to a human on Telegram"
    >
      <LifeBuoy className="h-4 w-4" aria-hidden />
    </a>
  );
}
