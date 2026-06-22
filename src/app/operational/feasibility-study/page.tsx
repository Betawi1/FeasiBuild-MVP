"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeasibilityStore } from "@/store/useFeasibilityStore";
import { getFeasibilityProjectBundle } from "@/lib/feasibility/data-aggregator";
import {
  buildOperationalStableInputs,
  buildStableProjectHash,
} from "@/lib/slide-dependencies";
import { exportToPDF } from "@/lib/pdf-export";
import type { FeasibilityProjectBundle } from "@/types/feasibility";
import FeasibilitySlideView from "@/components/feasibility/FeasibilitySlideView";
import { SlideErrorBoundary } from "@/components/feasibility/SlideErrorBoundary";
import { SlideCaptureProvider } from "@/components/feasibility/SlideContainer";
import { generateOperationalSlidesWithPuter } from "@/lib/feasibility/enrich-operational-slides-puter";
import {
  clearAllCaches,
  clearStoredHashes,
  getStoredHashes,
  OPERATIONAL_HASHES_STORAGE_KEY,
  setStoredHashes,
} from "@/lib/cache-service";
import { checkPuterStatusAndLog } from "@/lib/puter-auth";
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

function isOfficeBuildingType(buildingType: string, assetType?: string): boolean {
  const bt = buildingType.toLowerCase();
  const at = (assetType ?? "").toLowerCase();
  return bt === "office" || at.includes("office");
}

function isHotelBuildingType(buildingType: string, assetType?: string): boolean {
  const bt = buildingType.toLowerCase();
  const at = (assetType ?? "").toLowerCase();
  return bt === "hotel" || at.includes("hotel");
}

function isBTRBuildingType(buildingType: string, assetType?: string): boolean {
  if (isHotelBuildingType(buildingType, assetType)) return false;
  if (isOfficeBuildingType(buildingType, assetType)) return false;
  const bt = buildingType.toLowerCase();
  const at = (assetType ?? "").toLowerCase();
  return bt === "residential" || at.includes("residential") || at.includes("btr");
}

function isRetailBuildingType(buildingType: string, assetType?: string): boolean {
  if (isOfficeBuildingType(buildingType, assetType)) return false;
  if (isBTRBuildingType(buildingType, assetType)) return false;
  const bt = buildingType.toLowerCase();
  const at = (assetType ?? "").toLowerCase();
  return (
    bt === "retail" ||
    at.includes("retail") ||
    at.includes("mall") ||
    at.includes("shopping")
  );
}

function feasibilityEndpoint(
  buildingType: string,
  assetType?: string
): string {
  if (isOfficeBuildingType(buildingType, assetType)) {
    return "/api/feasibility/generate-office";
  }
  if (isRetailBuildingType(buildingType, assetType)) {
    return "/api/feasibility/generate-mall";
  }
  if (isBTRBuildingType(buildingType, assetType)) {
    return "/api/feasibility/generate-btr";
  }
  return "/api/feasibility/generate-market";
}

function feasibilityStudyTitle(buildingType: string, assetType?: string): string {
  if (isOfficeBuildingType(buildingType, assetType)) {
    return "Office & Retail Feasibility Study";
  }
  if (isRetailBuildingType(buildingType, assetType)) {
    return "Shopping Mall Feasibility Study";
  }
  if (isBTRBuildingType(buildingType, assetType)) {
    return "Residential BTR Feasibility Study";
  }
  return "Hotel Feasibility Study";
}

export default function FeasibilityStudyPage() {
  const router = useRouter();
  const buildingType = useFinModelStore(
    (s) => s.operational.projectInfo.buildingType
  );
  const {
    slides,
    setSlides,
    updateSlideParagraph,
    isEditing,
    toggleEditing,
    setMarketResearchCache,
  } = useFeasibilityStore();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [projectBundle, setProjectBundle] =
    useState<FeasibilityProjectBundle | null>(null);

  const generateReport = useCallback(async (options?: { force?: boolean }) => {
    const forceRegenerate = options?.force ?? false;
    setLoading(true);
    setError(null);
    try {
      const projectData = getFeasibilityProjectBundle();
      setProjectBundle(projectData);

      const stableInputs = buildOperationalStableInputs(projectData);
      console.log("[Cache Debug] Hashing these inputs:", stableInputs);
      const projectHash = buildStableProjectHash(projectData);
      console.log("[Cache Debug] Project hash:", projectHash);

      const oldHashes = await getStoredHashes(OPERATIONAL_HASHES_STORAGE_KEY);
      console.log("[Cache Debug] Stored hashes:", oldHashes);

      let slidesResult: FeasibilitySlide[];
      let marketResearch: Record<string, unknown> | undefined;

      try {
        const result = await generateOperationalSlidesWithPuter(
          projectData,
          buildingType,
          { forceRegenerate, oldHashes }
        );
        slidesResult = result.slides;
        await setStoredHashes(OPERATIONAL_HASHES_STORAGE_KEY, result.hashes);
      } catch (puterErr) {
        console.warn(
          "Puter.js generation failed, falling back to server API:",
          puterErr
        );
        const endpoint = feasibilityEndpoint(
          buildingType,
          projectData.assetType
        );
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
      setCurrentSlideIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate study");
      setSlides([]);
    } finally {
      setLoading(false);
    }
  }, [buildingType, setSlides, setMarketResearchCache]);

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

  const handleBack = () => {
    router.push("/operational/preview/scenario-analysis");
  };

  const handleExportPDF = async () => {
    const originalIndex = currentSlideIndex;
    const bundle = projectBundle ?? getFeasibilityProjectBundle();
    const container = document.getElementById("slide-capture-container");

    setExportingPdf(true);
    setExportProgress(`Generating PDF... (0/${slides.length})`);
    container?.classList.add("pdf-capturing");

    try {
      await exportToPDF({
        slides,
        getCurrentSlideIndex: () => currentSlideIndex,
        setCurrentSlideIndex: async (index: number) => {
          setCurrentSlideIndex(index);
        },
        onProgress: (current, total) => {
          setExportProgress(`Generating PDF... (${current}/${total})`);
        },
        projectInfo: bundle,
      });
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

  const currentSlide = slides[currentSlideIndex]!;
  const bundle = projectBundle ?? getFeasibilityProjectBundle();

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="no-print sticky top-0 z-50 border-b border-slate-800 bg-slate-900/90 px-6 py-3 backdrop-blur">
        <div className="mx-auto max-w-[1280px]">
          <h1 className="text-2xl font-bold text-white">
            {feasibilityStudyTitle(buildingType, bundle.assetType)}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Part {SECTION_LABEL[currentSlide.section]} ·{" "}
            {currentSlide.section} — 16:9 presentation
            {buildingType !== "hotel" ? ` (model: ${buildingType})` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-950 p-4">
        <SlideCaptureProvider captureId="slide-capture-container">
          <SlideErrorBoundary
            key={currentSlide.id}
            fallback={
              <div className="flex h-[720px] w-[1280px] items-center justify-center bg-white">
                <p className="text-red-600">Error rendering slide</p>
              </div>
            }
          >
            <FeasibilitySlideView
              slide={currentSlide}
              projectData={bundle}
              isEditing={isEditing}
              onParagraphChange={(index, text) =>
                updateSlideParagraph(currentSlide.id, index, text)
              }
            />
          </SlideErrorBoundary>
        </SlideCaptureProvider>
      </div>

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
            Slide {currentSlideIndex + 1} of {slides.length} — {currentSlide.title}
          </span>
          <button
            type="button"
            onClick={() =>
              setCurrentSlideIndex(
                Math.min(slides.length - 1, currentSlideIndex + 1)
              )
            }
            disabled={currentSlideIndex >= slides.length - 1}
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
              const isConfirmed = window.confirm(
                "⚠️ Are you sure you want to clear the AI cache?\n\n" +
                  "This will delete all saved AI-generated content and force the system to regenerate every slide from scratch.\n\n" +
                  "This process may take 30-60 seconds."
              );

              if (isConfirmed) {
                await clearAllCaches();
                await clearStoredHashes(OPERATIONAL_HASHES_STORAGE_KEY);
                alert(
                  "Cloud Cache cleared! Next generation will call AI for all slides."
                );
                window.location.reload();
              }
            }}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
          >
            Clear AI Cache
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
          <div className="group relative">
            <button
              id="download-pdf-btn"
              type="button"
              onClick={() => void handleExportPDF()}
              disabled={exportingPdf}
              className={btnPrimary}
            >
              <span id="download-btn-text">
                {exportingPdf
                  ? exportProgress || "Generating PDF..."
                  : "Download PDF"}
              </span>
            </button>
            <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-64 rounded bg-slate-800 p-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              Captures all slides with charts and tables as a single PDF file.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
