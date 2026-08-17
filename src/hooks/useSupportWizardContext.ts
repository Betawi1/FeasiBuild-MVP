"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  parseEquityTabParam,
  parseWizardStepParam,
  pathnamesMatch,
  resolveComponentFromPath,
  resolveStreamFromPath,
} from "@/lib/analyst-doc-routes";
import { buildWizardSupportContext } from "@/lib/constants/support";
import { useAnalystStore } from "@/store/useAnalystStore";
import useFinModelStore from "@/store/useFinModelStore";

/** Compact Telegram start payload for the current wizard location (e.g. `ops-C1-S6`). */
export function useSupportWizardContext(): string {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const stepParam = searchParams?.get("step") ?? null;
  const tabParam = searchParams?.get("tab") ?? null;
  const wizardPathname = useAnalystStore((s) => s.wizardPathname);
  const wizardUiStep = useAnalystStore((s) => s.wizardUiStep);
  const sessionAssetType = useFinModelStore((s) => s.assetType);

  return useMemo(() => {
    const stream = resolveStreamFromPath(pathname) ?? sessionAssetType;
    const component = resolveComponentFromPath(pathname);

    const liveStep =
      wizardUiStep != null &&
      wizardPathname != null &&
      pathnamesMatch(wizardPathname, pathname)
        ? wizardUiStep
        : null;
    const innerStep =
      liveStep ??
      parseWizardStepParam(stepParam) ??
      parseEquityTabParam(tabParam);

    return buildWizardSupportContext(stream, component, innerStep);
  }, [
    pathname,
    sessionAssetType,
    stepParam,
    tabParam,
    wizardPathname,
    wizardUiStep,
  ]);
}
