"use client";

import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { getCachedContent } from "@/lib/cache-service";
import { hasPlaceholderContent } from "@/lib/ai-service";
import { cleanAIContent } from "@/lib/feasibility/clean-ai-content";
import { enrichStructuredSlideData } from "@/lib/feasibility/enrich-structured-slide-data";
import {
  buildOperationalBundleHashes,
  buildOperationalCommentaryCacheKey,
  getOperationalSlideDependencySection,
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
 * Enrich slides with Puter commentary using two-layer localStorage caching:
 * Layer 1 — localStorage keyed by slide + dependency hashes (via ai-service)
 * Layer 2 — cache keys change automatically when component hashes change
 */
export async function enrichOperationalSlidesWithCache(
  slides: FeasibilitySlide[],
  bundle: FeasibilityProjectBundle,
  sections: Array<{ slideId: string; section: string }>,
  generateCommentary: CommentaryGenerator,
  options: OperationalSlideCacheOptions = {}
): Promise<OperationalSlideCacheResult> {
  const { forceRegenerate = false, oldHashes = {} } = options;
  const hashes = buildOperationalBundleHashes(bundle);
  const enriched = [...slides];

  for (const { slideId, section } of sections) {
    const idx = enriched.findIndex((s) => s.id === slideId);
    if (idx < 0) continue;

    const depSection = getOperationalSlideDependencySection(slideId);
    const cacheKey = buildOperationalCommentaryCacheKey(slideId, hashes);
    const inputsChanged = shouldRegenerateSlide(depSection, oldHashes, hashes);
    const skipCache = forceRegenerate || inputsChanged;

    if (!skipCache) {
      const cached = await getCachedContent<string[]>(cacheKey);
      if (cached?.length) {
        const paragraphs = cleanAIContent(cached);
        if (!hasPlaceholderContent(paragraphs)) {
          console.log(`[Operational Cache HIT] ${slideId} (${cacheKey})`);
          enriched[idx] = {
            ...enriched[idx]!,
            paragraphs,
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
        `[Operational Cache] Inputs changed, regenerating: ${slideId} (${cacheKey})`
      );
    }

    const paragraphs = await generateCommentary(section, bundle, {
      cacheKey,
      forceRegenerate: skipCache,
    });
    enriched[idx] = {
      ...enriched[idx]!,
      paragraphs: cleanAIContent(paragraphs),
    };
  }

  return {
    slides: enrichStructuredSlideData(enriched),
    hashes,
  };
}
