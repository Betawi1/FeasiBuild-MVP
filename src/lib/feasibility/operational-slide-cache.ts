"use client";

import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { getCachedContent } from "@/lib/cache-service";
import { hasPlaceholderContent } from "@/lib/ai-service";
import { isAiFallbackCommentary } from "@/lib/feasibility/enrichment-ladder";
import { enrichStructuredSlideData } from "@/lib/feasibility/enrich-structured-slide-data";
import {
  buildOperationalBundleHashes,
  buildOperationalCommentaryCacheKey,
  getOperationalSlideDependencySection,
  hashesAreEqual,
  resetDependencyChangeLog,
  shouldRegenerateSlide,
} from "@/lib/slide-dependencies";
import { resolveOperationalAssetType } from "@/lib/feasibility/operational-asset-class";

export type CommentaryQuality = "ok" | "fallback";

export interface OperationalSlideCacheOptions {
  forceRegenerate?: boolean;
  oldHashes?: Record<string, string>;
  /** When set, only these slide ids call the model. Other slides stay as provided. */
  onlySlideIds?: string[];
  /** Retry / in-memory deck. Skips rebuilding static slides. */
  baseSlides?: FeasibilitySlide[];
  /** Fired once with the pre-model deck so the UI can paint before Puter returns. */
  onDeckReady?: (slides: FeasibilitySlide[]) => void;
  onCommentary?: (slide: FeasibilitySlide, quality: CommentaryQuality) => void;
}

export interface OperationalSlideCacheResult {
  slides: FeasibilitySlide[];
  hashes: Record<string, string>;
}

type CommentaryGenerator = (
  section: string,
  bundle: FeasibilityProjectBundle,
  options: { cacheKey: string; forceRegenerate: boolean; slideId: string }
) => Promise<string[]>;

/**
 * Enrich slides with Puter commentary using two-layer caching:
 * Layer 1 — KV/localStorage keyed by slide + dependency hashes (via ai-service)
 * Layer 2 — skip regeneration entirely when component hashes are unchanged
 */
export async function enrichOperationalSlidesWithCache(
  slides: FeasibilitySlide[],
  bundle: FeasibilityProjectBundle,
  sections: Array<{ slideId: string; section: string }>,
  generateCommentary: CommentaryGenerator,
  options: OperationalSlideCacheOptions = {}
): Promise<OperationalSlideCacheResult> {
  const { forceRegenerate = false, oldHashes = {}, onlySlideIds, onDeckReady, onCommentary } =
    options;
  const only = onlySlideIds?.length ? new Set(onlySlideIds) : null;
  resetDependencyChangeLog();
  const hashes = buildOperationalBundleHashes(bundle);
  const enriched = [...slides];
  onDeckReady?.(enriched);

  const inputsUnchanged =
    Object.keys(oldHashes).length > 0 && hashesAreEqual(oldHashes, hashes);

  if (!forceRegenerate && inputsUnchanged) {
    console.log(
      "[Cache] ✓ Inputs unchanged - using cached feasibility commentary where available"
    );
  } else if (forceRegenerate) {
    console.log("[Cache] Force regenerate requested");
  } else if (Object.keys(oldHashes).length > 0) {
    console.log(
      "[Cache] Inputs changed vs stored hashes - selective regeneration by dependency"
    );
  } else {
    console.log(
      "[Cache] No previous hash baseline - will use per-slide cache keys if present"
    );
  }

  for (const { slideId, section } of sections) {
    const idx = enriched.findIndex((s) => s.id === slideId);
    if (idx < 0) continue;
    if (only && !only.has(slideId)) continue;

    const depSection = getOperationalSlideDependencySection(slideId);
    const cacheKey = buildOperationalCommentaryCacheKey(
      slideId,
      hashes,
      bundle.buildingType || bundle.assetType
    );
    const inputsChanged =
      !inputsUnchanged &&
      shouldRegenerateSlide(depSection, oldHashes, hashes);
    const targeted = only?.has(slideId) ?? false;
    const skipCache = forceRegenerate || inputsChanged || targeted;

    if (!skipCache) {
      const cached = await getCachedContent<string[]>(cacheKey);
      if (cached?.length) {
        // Reject cross-asset cache pollution (e.g. warehouse exec-1 on DC deck)
        const isDc =
          resolveOperationalAssetType(bundle.buildingType ?? "") ===
          "datacentre";
        const joined = cached.join(" ").toLowerCase();
        const wrongAssetForDc =
          isDc &&
          (joined.includes("bulk distribution") ||
            joined.includes("warehouse") ||
            joined.includes("cross-dock") ||
            joined.includes("3pl") ||
            joined.includes("residential") ||
            joined.includes("btr tower"));

        if (
          !hasPlaceholderContent(cached) &&
          !wrongAssetForDc &&
          !isAiFallbackCommentary(cached)
        ) {
          console.log(`[Operational Cache HIT] ${slideId} (${cacheKey})`);
          const slide = {
            ...enriched[idx]!,
            paragraphs: cached,
          };
          enriched[idx] = slide;
          onCommentary?.(slide, "ok");
          continue;
        }
        console.log(
          `[Operational Cache] Stale/wrong-asset content, regenerating: ${slideId} (${cacheKey})`
        );
      } else {
        console.log(`[Operational Cache MISS] ${slideId} (${cacheKey})`);
      }
    } else if (forceRegenerate) {
      console.log(`[Operational Cache] Force regenerate: ${slideId}`);
    } else if (inputsChanged) {
      console.log(
        `[Operational Cache] Dependency inputs changed, regenerating: ${slideId} (${cacheKey})`
      );
    }

    const paragraphs = await generateCommentary(section, bundle, {
      cacheKey,
      forceRegenerate: skipCache,
      slideId,
    });
    const slide = {
      ...enriched[idx]!,
      paragraphs,
    };
    enriched[idx] = slide;
    onCommentary?.(
      slide,
      isAiFallbackCommentary(paragraphs) ? "fallback" : "ok"
    );
  }

  return {
    slides: enrichStructuredSlideData(enriched),
    hashes,
  };
}
