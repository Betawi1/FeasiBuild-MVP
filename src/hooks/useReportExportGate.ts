"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getCustomerTier } from "@/lib/entitlements";
import {
  evaluateExport,
  getUsedReportExports,
  recordExport,
} from "@/lib/report-entitlements";
import useFinModelStore from "@/store/useFinModelStore";

export function useReportExportGate(projectId: string | null) {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const tier = getCustomerTier(email);
  const [usedExports, setUsedExports] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let on = true;
    getUsedReportExports(user.id).then((n) => {
      if (on) setUsedExports(n);
    });
    return () => {
      on = false;
    };
  }, [user?.id]);

  const downloadLabel =
    tier !== "explorer"
      ? "Download PDF"
      : usedExports === 0
        ? "Download PDF (Free · Watermarked)"
        : "Upgrade to Export";

  async function allowOrPrompt(): Promise<boolean> {
    const decision = await evaluateExport(tier, projectId, user?.id);
    if (!decision.allowed) {
      setShowUpgrade(true);
      return false;
    }
    return true;
  }

  async function recordSuccessfulExport(
    projectIdOverride?: string | null
  ): Promise<void> {
    const id =
      projectIdOverride?.trim() ||
      projectId ||
      useFinModelStore.getState().activeProjectId;
    await recordExport(tier, id, user?.id);
    if (tier === "explorer") {
      setUsedExports(await getUsedReportExports(user?.id));
      setShowUpgrade(true);
    }
  }

  return {
    tier,
    usedExports,
    showUpgrade,
    setShowUpgrade,
    downloadLabel,
    allowOrPrompt,
    recordSuccessfulExport,
  };
}
