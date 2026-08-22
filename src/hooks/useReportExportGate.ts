"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getCustomerTier } from "@/lib/entitlements";
import { useSubscription } from "@/hooks/useSubscription";
import {
  evaluateExport,
  getUsedReportExports,
  recordExport,
} from "@/lib/report-entitlements";
import useFinModelStore from "@/store/useFinModelStore";

export function useReportExportGate(projectId: string | null) {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const {
    isPro,
    hasUnlimitedReports,
    lifetime,
    advisoryActive,
    reportCredits,
    isLoading,
  } = useSubscription();
  const sub = (
    user?.publicMetadata as { subscription?: Record<string, unknown> } | undefined
  )?.subscription;
  const tier = getCustomerTier(email, sub);
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

  const downloadLabel = !isPro
    ? usedExports === 0
      ? "Download PDF (Free · Watermarked)"
      : "Upgrade to Export"
    : hasUnlimitedReports
      ? "Download PDF"
      : reportCredits <= 0
        ? "Buy Credits to Export"
        : "Download PDF";

  async function allowOrPrompt(): Promise<boolean> {
    if (isLoading) return false;

    if (!isPro) {
      const decision = await evaluateExport("explorer", projectId, user?.id);
      if (!decision.allowed) {
        setShowUpgrade(true);
        return false;
      }
      return true;
    }

    if (hasUnlimitedReports) return true;

    const decision = await evaluateExport("pro", projectId, user?.id);
    if (decision.allowed && !decision.consumesReport) {
      return true;
    }

    const res = await fetch("/api/subscription/consume-credit", {
      method: "POST",
    });
    const data = (await res.json()) as {
      allowed?: boolean;
      reason?: string;
    };
    if (data.allowed) {
      await user?.reload();
      return true;
    }
    setShowUpgrade(true);
    return false;
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
    lifetime,
    advisoryActive,
    reportCredits,
  };
}
