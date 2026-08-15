"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { publishActiveWizardStep } from "@/lib/active-wizard-step";

/** Publish the 1-based wizard UI step so the AI Analyst can slice docs. */
export function useReportWizardStep(uiStep: number): void {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    publishActiveWizardStep(pathname, uiStep);
  }, [pathname, uiStep]);

  // Clear only on unmount / pathname change — not on every inner-step update.
  useEffect(() => {
    return () => {
      publishActiveWizardStep(pathname, null);
    };
  }, [pathname]);
}
