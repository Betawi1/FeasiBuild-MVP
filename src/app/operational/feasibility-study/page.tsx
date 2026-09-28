"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useFeasibilityStore } from "@/store/useFeasibilityStore";
import { getFeasibilityProjectBundle } from "@/lib/feasibility/data-aggregator";
import {
  buildOperationalStableInputs,
  buildStableProjectHash,
} from "@/lib/slide-dependencies";
import { exportToPDF } from "@/lib/pdf-export";
import type { FeasibilityProjectBundle } from "@/types/feasibility";
import FeasibilitySlideView from "@/components/feasibility/FeasibilitySlideView";
import CustomSlideView from "@/components/feasibility/CustomSlideView";
import {
  CustomPageAddButton,
  CustomPageInsertDivider,
  CustomPagesUpsellPill,
} from "@/components/feasibility/CustomDeckChrome";
import {
  customMoveFlags,
  replaceCustomSlide,
  useCustomDeck,
} from "@/components/feasibility/useCustomDeck";
import { SlideErrorBoundary } from "@/components/feasibility/SlideErrorBoundary";
import UpgradeModal from "@/components/ui/UpgradeModal";
import { useReportExportGate } from "@/hooks/useReportExportGate";
import { SlideCaptureProvider } from "@/components/feasibility/SlideContainer";
import { generateOperationalSlidesWithPuter } from "@/lib/feasibility/enrich-operational-slides-puter";
import AiEnrichmentStatus, {
  useAiEnrichmentUi,
} from "@/components/feasibility/AiEnrichmentStatus";
import {
  buildRegenerateFeasibilityConfirmMessage,
  resolveOperationalAssetType,
} from "@/lib/feasibility/operational-asset-class";
import {
  clearAllCaches,
  clearStoredHashes,
  getStoredHashes,
  OPERATIONAL_HASHES_STORAGE_KEY,
  setStoredHashes,
} from "@/lib/cache-service";
import { checkPuterStatusAndLog } from "@/lib/puter-auth";
import {
  ensureCustomSlidesLoaded,
  markFeasibilityStudyCompleted,
} from "@/lib/project-save";
import { customSlideDisplayTitle } from "@/lib/feasibility/custom-slides";
import { ensureProjectAutoSaved } from "@/hooks/useOptimisticProjectSave";
import { useToast } from "@/components/ui/Toast";
import useFinModelStore from "@/store/useFinModelStore";
import type { FeasibilitySlide } from "@/types/feasibility";

const btnOutline =
  "rounded-lg border border-slate-600 bg-transparent px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none";
const btnPrimary =
  "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none";

const SECTION_LABEL: Record<FeasibilitySlide["section"], string> = {
  title: "Title",
  executive: "A",
  project: "B",
  market: "C",
  financial: "D",
};

function storedBuildingType(): string {
  return useFinModelStore.getState().operational.projectInfo.buildingType;
}

function feasibilityEndpoint(buildingType: string): string {
  switch (resolveOperationalAssetType(buildingType)) {
    case "office":
      return "/api/feasibility/generate-office";
    case "mall":
      return "/api/feasibility/generate-mall";
    case "btr":
      return "/api/feasibility/generate-btr";
    default:
      // Hotel, warehouse, and data centre use the market generator as Puter fallback.
      return "/api/feasibility/generate-market";
  }
}

function feasibilityStudyTitle(buildingType: string): string {
  switch (resolveOperationalAssetType(buildingType)) {
    case "datacentre":
      return "Data Centre Feasibility Study";
    case "office":
      return "Office & Retail Feasibility Study";
    case "mall":
      return "Shopping Mall Feasibility Study";
    case "btr":
      return "Residential BTR Feasibility Study";
    case "warehouse":
      return "Warehouse & Industrial Feasibility Study";
    default:
      return "Hotel Feasibility Study";
  }
}

export default function FeasibilityStudyPage() {
  const router = useRouter();
  const { user } = useUser();
  const { showToast } = useToast();
  const activeProjectId = useFinModelStore((s) => s.activeProjectId);
  const buildingType = useFinModelStore(
    (s) => s.operational.projectInfo.buildingType
  );
  const {
    slides,
    setSlides,
    updateSlideParagraph,
    updateSlideData,
    isEditing,
    toggleEditing,
    setMarketResearchCache,
    resetAiSections,
  } = useFeasibilityStore();
  const deck = useCustomDeck(slides);
  const aiUi = useAiEnrichmentUi();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [customPagesUpgrade, setCustomPagesUpgrade] = useState(false);
  const [projectBundle, setProjectBundle] =
    useState<FeasibilityProjectBundle | null>(null);
  const {
    showUpgrade,
    setShowUpgrade,
    downloadLabel,
    allowOrPrompt,
    recordSuccessfulExport,
  } = useReportExportGate(activeProjectId);

  const generateReport = useCallback(async (options?: {
    force?: boolean;
    onlySlideIds?: string[];
  }) => {
    const forceRegenerate = options?.force ?? false;
    const onlySlideIds = options?.onlySlideIds;
    if (!onlySlideIds?.length) setLoading(true);
    setError(null);
    try {
      const activeId = useFinModelStore.getState().activeProjectId;
      if (activeId) {
        await ensureCustomSlidesLoaded(activeId, user?.id);
      }
      const projectData = getFeasibilityProjectBundle();
      setProjectBundle(projectData);

      const liveBuildingType = storedBuildingType();

      console.log("[Feasibility Study] generateReport", {
        buildingType: liveBuildingType,
        bundleBuildingType: projectData.buildingType,
        bundleAssetType: projectData.assetType,
        route: resolveOperationalAssetType(liveBuildingType),
        dataCentreMetricsPresent: !!projectData.dataCentreMetrics,
      });

      const stableInputs = buildOperationalStableInputs(projectData);
      console.log("[Cache Debug] Hashing these inputs:", stableInputs);
      const projectHash = buildStableProjectHash(projectData);
      console.log("[Cache Debug] Project hash:", projectHash);

      const oldHashes = await getStoredHashes(
        OPERATIONAL_HASHES_STORAGE_KEY,
        user?.id
      );
      console.log("[Cache Debug] Stored hashes:", oldHashes);

      let slidesResult: FeasibilitySlide[];
      let marketResearch: Record<string, unknown> | undefined;

      try {
        const result = await generateOperationalSlidesWithPuter(
          projectData,
          liveBuildingType,
          {
            forceRegenerate,
            oldHashes,
            onlySlideIds,
            onDeckReady: () => setLoading(false),
          }
        );
        slidesResult = result.slides;
        await setStoredHashes(
          OPERATIONAL_HASHES_STORAGE_KEY,
          result.hashes,
          user?.id
        );
        console.log("[Feasibility Study] generated slide IDs", {
          count: slidesResult.length,
          ids: slidesResult.slice(0, 12).map((s) => s.id),
          buildingType: liveBuildingType,
          route: resolveOperationalAssetType(liveBuildingType),
        });
      } catch (puterErr) {
        console.warn(
          "Puter.js generation failed, falling back to server API:",
          puterErr
        );
        const endpoint = feasibilityEndpoint(liveBuildingType);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectData }),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as {
          slides: FeasibilitySlide[];
          marketResearch?: Record<string, unknown>;
        };
        slidesResult = data.slides;
        marketResearch = data.marketResearch;
      }

      setSlides(slidesResult);
      if (marketResearch) {
        setMarketResearchCache(marketResearch);
      }
      if (!onlySlideIds?.length) setCurrentSlideIndex(0);

      if (slidesResult.length > 0) {
        void (async () => {
          const savedId = await ensureProjectAutoSaved({
            stream: "operational",
            clerkUserId: user?.id,
            email: user?.primaryEmailAddress?.emailAddress,
            subscription: (
              user?.publicMetadata as { subscription?: Record<string, unknown> }
            )?.subscription,
            showToast,
          });
          const projectId =
            savedId || useFinModelStore.getState().activeProjectId;
          if (user?.id && projectId) {
            void markFeasibilityStudyCompleted(
              user.id,
              projectId,
              new Date().toISOString()
            );
          }
        })();
      }
    } catch (e) {
      if (!onlySlideIds?.length) {
        setError(e instanceof Error ? e.message : "Failed to generate study");
        setSlides([]);
        resetAiSections();
      } else {
        const store = useFeasibilityStore.getState();
        for (const id of onlySlideIds) {
          const row = store.aiSections[id];
          if (row?.status === "pending") {
            store.setAiSectionStatus(id, "failed", row.attempts);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [buildingType, setSlides, setMarketResearchCache, resetAiSections, user?.id, user?.primaryEmailAddress?.emailAddress, showToast]);

  useEffect(() => {
    void checkPuterStatusAndLog();
  }, []);

  useEffect(() => {
    void generateReport();
  }, [generateReport]);

  useEffect(() => {
    const container = document.getElementById("slide-capture-container");
    if (container) {
      container.classList.remove("pdf-capturing");
      container.style.overflow = "";
      container.style.width = "";
      container.style.height = "";
      container.style.position = "";
      container.style.backgroundColor = "";
      container.style.flexShrink = "";
    }
    document.body.classList.remove("printing-pdf");
  }, []);

  useEffect(() => {
    if (deck.entries.length === 0) return;
    if (currentSlideIndex > deck.entries.length - 1) {
      setCurrentSlideIndex(deck.entries.length - 1);
    }
  }, [currentSlideIndex, deck.entries.length]);

  const handleBack = () => {
    router.push("/operational/preview/scenario-analysis");
  };

  const handleExportPDF = async () => {
    if (!(await allowOrPrompt())) return;

    const savedId = await ensureProjectAutoSaved({
      stream: "operational",
      clerkUserId: user?.id,
      email: user?.primaryEmailAddress?.emailAddress,
      subscription: (
        user?.publicMetadata as { subscription?: Record<string, unknown> }
      )?.subscription,
      showToast,
    });

    const originalIndex = currentSlideIndex;
    const bundle = projectBundle ?? getFeasibilityProjectBundle();
    const container = document.getElementById("slide-capture-container");
    const captureSlides = deck.entries.map((entry) => ({ id: entry.id }));

    setExportingPdf(true);
    setExportProgress(`Generating PDF... (0/${captureSlides.length})`);
    container?.classList.add("pdf-capturing");

    try {
      await exportToPDF({
        slides: captureSlides,
        getCurrentSlideIndex: () => currentSlideIndex,
        setCurrentSlideIndex: async (index: number) => {
          setCurrentSlideIndex(index);
        },
        onProgress: (current, total) => {
          setExportProgress(`Generating PDF... (${current}/${total})`);
        },
        projectInfo: bundle,
      });
      await recordSuccessfulExport(savedId);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert(
        `Failed to generate PDF: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      container?.classList.remove("pdf-capturing");
      setCurrentSlideIndex(originalIndex);
      setExportingPdf(false);
      setExportProgress("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-10">
        <p className="text-white text-lg animate-pulse">
          Generating feasibility study (Sections A–D)…
        </p>
        <p className="text-slate-400 text-sm mt-2">
          Market research · project analysis · financial outcomes
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 p-10">
        <p className="text-red-300">{error}</p>
        <button type="button" onClick={() => void generateReport()} className={btnPrimary}>
          Retry
        </button>
        <button type="button" onClick={handleBack} className={btnOutline}>
          ← Back to Scenarios
        </button>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 p-10 text-white">
        <p>No slides generated.</p>
        <button
          type="button"
          onClick={() => void generateReport({ force: true })}
          className={btnPrimary}
        >
          Regenerate
        </button>
      </div>
    );
  }

  const entry =
    deck.entries[Math.min(currentSlideIndex, Math.max(deck.entries.length - 1, 0))];
  if (!entry) return null;
  const currentGenerated = entry.kind === "generated" ? entry.generated! : null;
  const currentCustom = entry.kind === "custom" ? entry.custom! : null;
  const pagerTitle = currentGenerated
    ? currentGenerated.title
    : customSlideDisplayTitle(currentCustom!.title);
  const sectionKey = currentGenerated?.section;
  const bundle = projectBundle ?? getFeasibilityProjectBundle();
  const moveFlags = currentCustom
    ? customMoveFlags(deck.entries, currentCustom.id)
    : null;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="no-print sticky top-0 z-50 border-b border-slate-800 bg-slate-900/90 px-6 py-3 backdrop-blur">
        <div className="mx-auto max-w-[1280px]">
          <h1 className="text-2xl font-bold text-white">
            {feasibilityStudyTitle(buildingType)}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Part {sectionKey ? SECTION_LABEL[sectionKey] : "Custom"} ·{" "}
            {sectionKey ?? "custom"} — 16:9 presentation
            {buildingType !== "hotel" ? ` (model: ${buildingType})` : ""}
          </p>
          <AiEnrichmentStatus
            onRetry={(ids) => void generateReport({ onlySlideIds: ids })}
          />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-950 p-4">
        <SlideCaptureProvider
          captureId="slide-capture-container"
          slideKey={entry.id}
        >
          <SlideErrorBoundary
            key={entry.id}
            fallback={
              <div className="flex h-[720px] w-[1280px] items-center justify-center bg-white">
                <p className="text-red-600">Error rendering slide</p>
              </div>
            }
          >
            {currentGenerated ? (
              <FeasibilitySlideView
                key={`${currentGenerated.id}:${JSON.stringify(currentGenerated.charts ?? [])}`}
                slide={currentGenerated}
                projectData={bundle}
                isEditing={isEditing}
                slideIndex={currentSlideIndex}
                slideCount={deck.entries.length}
                onParagraphChange={(index, text) =>
                  updateSlideParagraph(currentGenerated.id, index, text)
                }
                onDataChange={(data) =>
                  updateSlideData(currentGenerated.id, data)
                }
              />
            ) : (
              <CustomSlideView
                slide={currentCustom!}
                isEditing={isEditing}
                slideIndex={currentSlideIndex}
                slideCount={deck.entries.length}
                canMoveUp={moveFlags?.canMoveUp ?? false}
                canMoveDown={moveFlags?.canMoveDown ?? false}
                onChange={(next) => replaceCustomSlide(deck.updateCustomSlide, next)}
                onMove={(direction) =>
                  deck.move(currentCustom!.id, direction, setCurrentSlideIndex)
                }
                onDelete={() =>
                  deck.remove(
                    currentCustom!.id,
                    currentSlideIndex,
                    setCurrentSlideIndex
                  )
                }
              />
            )}
          </SlideErrorBoundary>
        </SlideCaptureProvider>
      </div>

      {isEditing &&
      deck.entitlementReady &&
      deck.canInsert &&
      currentSlideIndex < deck.entries.length - 1 ? (
        <div className="no-print px-4 pb-2">
          <CustomPageInsertDivider
            onInsert={() =>
              deck.insertAfter(currentSlideIndex, setCurrentSlideIndex)
            }
          />
        </div>
      ) : null}

      <div className="no-print h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

      <div className="no-print flex flex-col items-center gap-4 px-6 py-6">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
            disabled={currentSlideIndex === 0}
            className={btnOutline}
          >
            ← Previous Slide
          </button>
          <span className="font-medium text-white">
            Slide {currentSlideIndex + 1} of {deck.entries.length} — {pagerTitle}
          </span>
          <button
            type="button"
            onClick={() =>
              setCurrentSlideIndex(
                Math.min(deck.entries.length - 1, currentSlideIndex + 1)
              )
            }
            disabled={currentSlideIndex >= deck.entries.length - 1}
            className={btnPrimary}
          >
            Next Slide →
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-700 pt-2">
          <button type="button" onClick={handleBack} className={btnOutline}>
            ← Back to Scenarios
          </button>
          <button
            type="button"
            onClick={() => void generateReport({ force: true })}
            className={btnOutline}
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={async () => {
              const bt = storedBuildingType();
              const isConfirmed = window.confirm(
                buildRegenerateFeasibilityConfirmMessage(bt)
              );

              if (!isConfirmed) return;

              console.log(
                "[Feasibility Study] Force regenerate — buildingType:",
                bt,
                "route:",
                resolveOperationalAssetType(bt)
              );

              await clearAllCaches(user?.id);
              await clearStoredHashes(OPERATIONAL_HASHES_STORAGE_KEY, user?.id);
              await generateReport({ force: true });
            }}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
          >
            Clear AI Cache & Regenerate
          </button>
          <button
            type="button"
            onClick={toggleEditing}
            className={
              isEditing
                ? "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                : btnOutline
            }
          >
            {isEditing ? "✓ Done Editing" : "✎ Edit Content"}
          </button>
          {isEditing && deck.entitlementReady && deck.canInsert ? (
            <CustomPageAddButton
              className={btnOutline}
              onAdd={() => deck.addAtEnd(setCurrentSlideIndex)}
            />
          ) : null}
          {isEditing && deck.entitlementReady && !deck.canInsert ? (
            <CustomPagesUpsellPill onClick={() => setCustomPagesUpgrade(true)} />
          ) : null}
          <div className="group relative">
            <button
              id="download-pdf-btn"
              type="button"
              onClick={() => void handleExportPDF()}
              disabled={exportingPdf || aiUi.exportBlocked}
              title={aiUi.exportBlocked ? "AI sections still completing" : undefined}
              className={`${btnPrimary} disabled:!pointer-events-auto`}
            >
              <span id="download-btn-text">
                {exportingPdf
                  ? exportProgress || "Generating PDF..."
                  : downloadLabel}
              </span>
            </button>
            <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-64 rounded bg-slate-800 p-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {aiUi.exportBlocked
                ? "AI sections still completing"
                : "Captures all slides with charts and tables as a single PDF file."}
            </div>
          </div>
        </div>
      </div>
      <UpgradeModal
        open={showUpgrade || customPagesUpgrade}
        focus={customPagesUpgrade ? "custom-pages" : undefined}
        onClose={() => {
          setShowUpgrade(false);
          setCustomPagesUpgrade(false);
        }}
      />
    </div>
  );
}
