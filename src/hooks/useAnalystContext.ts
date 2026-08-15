"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  formatAssetLabel,
  getAnalystQuickActions,
  isAnalystVisiblePath,
  parseEquityTabParam,
  parseWizardStepParam,
  pathnamesMatch,
  resolveAnalystStepId,
  resolveComponentFromPath,
  resolveStreamFromPath,
  stepDisplaysAiBenchmarks,
  type AnalystComponentId,
  type AnalystContextApiResponse,
  type AnalystQuickAction,
  type AnalystStream,
} from "@/lib/analyst-doc-routes";
import { buildCostSideGuardrailsSnapshot, buildResearchSnapshot } from "@/lib/analyst-research-snapshot";
import type { AiResearchResult } from "@/lib/constants/aiPrompts";
import { useAnalystStore } from "@/store/useAnalystStore";
import useFinModelStore from "@/store/useFinModelStore";

export interface AnalystContextValue {
  stepContext: string;
  streamType: string;
  assetType: string;
  isLoading: boolean;
  isVisible: boolean;
  stepId: string;
  component: AnalystComponentId | null;
  innerStep: number | null;
  isPreview: boolean;
  sectionFound: boolean;
  quickActions: AnalystQuickAction[];
  researchSnapshot: string;
  c1CostGuardrails: string;
}

function composeStepContext(params: {
  stream: AnalystStream | null;
  component: AnalystComponentId | null;
  innerStep: number | null;
  assetLabel: string;
  isPreview: boolean;
  docText: string;
}): string {
  const location = [
    `Stream: ${params.stream ?? "unknown"}`,
    params.component ? `Component: ${params.component}` : null,
    params.innerStep ? `Inner wizard step: ${params.innerStep}` : null,
    params.isPreview ? "View: generated preview table (not an input step)" : null,
    `Asset: ${params.assetLabel}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `${location}\n\nLive documentation:\n${params.docText}`.trim();
}

/**
 * Resolves the current wizard step from the URL, the live wizard-step bridge,
 * and model stores, then fetches stripped documentation from `/api/analyst-context`.
 * Cached per stepId + stepNumber.
 */
export function useAnalystContext(): AnalystContextValue {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const stepParam = searchParams?.get("step") ?? null;
  const tabParam = searchParams?.get("tab") ?? null;
  const wizardPathname = useAnalystStore((s) => s.wizardPathname);
  const wizardUiStep = useAnalystStore((s) => s.wizardUiStep);

  const sessionAssetType = useFinModelStore((s) => s.assetType);
  const opsBuildingType = useFinModelStore(
    (s) => s.operational.projectInfo.buildingType
  );
  const saleBuildingType = useFinModelStore(
    (s) => s.sale.projectInfo.buildingType
  );
  const saleBuildingSubType = useFinModelStore(
    (s) => s.sale.projectInfo.buildingSubType
  );
  const opsResearch = useFinModelStore(
    (s) => s.operational.cashOutflows.aiResearchData
  );
  const saleResearch = useFinModelStore(
    (s) => s.sale.cashOutflows.aiResearchData
  );

  const stream = useMemo(() => {
    const fromPath = resolveStreamFromPath(pathname);
    if (fromPath) return fromPath;
    return sessionAssetType;
  }, [pathname, sessionAssetType]);

  const component = useMemo(
    () => resolveComponentFromPath(pathname),
    [pathname]
  );
  const innerStep = useMemo(() => {
    const liveStep =
      wizardUiStep != null &&
      wizardPathname != null &&
      pathnamesMatch(wizardPathname, pathname)
        ? wizardUiStep
        : null;
    // Live wizard telemetry wins over a stale `?step=` deep-link (C4 lands on
    // `/financing?step=1` from C3 preview and does not rewrite the URL on Next).
    if (liveStep) return liveStep;
    const fromUrl = parseWizardStepParam(stepParam);
    if (fromUrl) return fromUrl;
    const fromTab = parseEquityTabParam(tabParam);
    if (fromTab) return fromTab;
    return null;
  }, [stepParam, tabParam, wizardPathname, wizardUiStep, pathname]);
  const isPreview = pathname.includes("/preview/");
  const isVisible = isAnalystVisiblePath(pathname);

  const buildingType =
    stream === "sale" ? saleBuildingType : opsBuildingType;
  const buildingSubType = stream === "sale" ? saleBuildingSubType : undefined;
  const assetType = formatAssetLabel(stream, buildingType, buildingSubType);

  const stepId = useMemo(
    () =>
      resolveAnalystStepId({
        pathname,
        stepParam: innerStep != null ? String(innerStep) : stepParam,
      }),
    [pathname, stepParam, innerStep]
  );

  const cacheRef = useRef<Record<string, { content: string; sectionFound: boolean }>>(
    {}
  );
  const [docText, setDocText] = useState("");
  const [sectionFound, setSectionFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const cacheKey = `${stepId}::${innerStep ?? "full"}`;

  useEffect(() => {
    if (!isVisible || !stepId) {
      setDocText("");
      setSectionFound(false);
      setIsLoading(false);
      return;
    }

    const cached = cacheRef.current[cacheKey];
    if (cached) {
      setDocText(cached.content);
      setSectionFound(cached.sectionFound);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setDocText("");
    setSectionFound(false);
    setIsLoading(true);

    const params = new URLSearchParams({ stepId });
    if (innerStep != null && !isPreview) {
      params.set("stepNumber", String(innerStep));
    }
    const url = `/api/analyst-context?${params.toString()}`;
    void fetch(url)
      .then(async (response) => {
        const payload = (await response.json()) as AnalystContextApiResponse;
        const content =
          typeof payload.content === "string" && payload.content.trim()
            ? payload.content
            : "No documentation found for this step.";
        const found = payload.sectionFound === true;
        if (cancelled) return;
        cacheRef.current[cacheKey] = { content, sectionFound: found };
        setDocText(content);
        setSectionFound(found);
      })
      .catch(() => {
        if (cancelled) return;
        setDocText(
          "Documentation could not be loaded for this step. Answer from engine invariants only."
        );
        setSectionFound(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isVisible, stepId, cacheKey, innerStep, isPreview]);

  const stepContext = useMemo(
    () =>
      composeStepContext({
        stream,
        component,
        innerStep,
        assetLabel: assetType,
        isPreview,
        docText,
      }),
    [stream, component, innerStep, assetType, isPreview, docText]
  );

  const researchResult =
    stream === "sale" ? saleResearch : opsResearch;

  const fullSnapshot = useMemo(
    () =>
      buildResearchSnapshot(
        (researchResult ?? undefined) as AiResearchResult | undefined,
        component ?? "",
        assetType
      ),
    [researchResult, component, assetType]
  );

  const c1CostGuardrails = useMemo(
    () =>
      component === "C2"
        ? buildCostSideGuardrailsSnapshot(
            (researchResult ?? undefined) as AiResearchResult | undefined
          )
        : "",
    [component, researchResult]
  );

  const displaysBenchmarks = stepDisplaysAiBenchmarks({
    component,
    innerStep,
    stream,
    isPreview,
  });
  const researchSnapshot = displaysBenchmarks ? fullSnapshot : "";

  const quickActions = useMemo(
    () =>
      getAnalystQuickActions(component, {
        innerStep,
        stream,
        isPreview,
        hasResearchSnapshot: Boolean(fullSnapshot),
      }),
    [component, innerStep, stream, isPreview, fullSnapshot]
  );

  return {
    stepContext,
    streamType: stream ?? "",
    assetType,
    isLoading,
    isVisible,
    stepId,
    component,
    innerStep,
    isPreview,
    sectionFound,
    quickActions,
    researchSnapshot,
    c1CostGuardrails,
  };
}
