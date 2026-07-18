"use client";

import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { getCachedContent } from "@/lib/cache-service";
import { hasPlaceholderContent } from "@/lib/ai-service";
import { enrichStructuredSlideData } from "@/lib/feasibility/enrich-structured-slide-data";
import {
  buildOperationalBundleHashes,
  buildOperationalCommentaryCacheKey,
  getOperationalSlideDependencySection,
  hashesAreEqual,
  resetDependencyChangeLog,
  shouldRegenerateSlide,
} from "@/lib/slide-dependencies";

export interface OperationalSlideCacheOptions {
  forceRegenerate?: boolean;
  oldHashes?: Record<string, string>;
}

export interface OperationalSlideCacheResult {
  slides: FeasibilitySlide[];
  hashes: Record<string, string>;
}

type CommentaryGenerator = (
  section: string,
  bundle: FeasibilityProjectBundle,
  options: { cacheKey: string; forceRegenerate: boolean }
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
  const { forceRegenerate = false, oldHashes = {} } = options;
  resetDependencyChangeLog();
  const hashes = buildOperationalBundleHashes(bundle);
  const enriched = [...slides];

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

    const depSection = getOperationalSlideDependencySection(slideId);
    const cacheKey = buildOperationalCommentaryCacheKey(slideId, hashes);
    const inputsChanged =
      !inputsUnchanged &&
      shouldRegenerateSlide(depSection, oldHashes, hashes);
    const skipCache = forceRegenerate || inputsChanged;

    if (!skipCache) {
      const cached = await getCachedContent<string[]>(cacheKey);
      if (cached?.length) {
        // Cached commentary is stored already-cleaned by generateCommentary
        if (!hasPlaceholderContent(cached)) {
          console.log(`[Operational Cache HIT] ${slideId} (${cacheKey})`);
          enriched[idx] = {
            ...enriched[idx]!,
            paragraphs: cached,
          };
          continue;
        }
        console.log(
          `[Operational Cache] Stale/placeholder content, regenerating: ${slideId} (${cacheKey})`
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
    });
    enriched[idx] = {
      ...enriched[idx]!,
      paragraphs,
    };
  }

  return {
    slides: enrichStructuredSlideData(enriched),
    hashes,
  };
}
