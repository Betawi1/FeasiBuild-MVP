import type { FeasibilitySlide } from "@/types/feasibility";
import {
  buildAntiTemplateRetryPrompt,
  type ContentQualityOptions,
  validateContentQuality,
} from "@/lib/feasibility/commentary-quality";
import { fetchQwenParagraphs } from "@/lib/feasibility/qwen-commentary";

export interface SlideAiSection {
  slideId: string;
  buildPrompt: () => string;
  quality?: ContentQualityOptions;
  /** For retry prompts */
  assetType?: string;
  city?: string;
}

/** Enrich slide paragraphs via Qwen with validation and anti-template retry. */
export async function enrichSlidesWithAi(
  slides: FeasibilitySlide[],
  sections: SlideAiSection[]
): Promise<FeasibilitySlide[]> {
  const enriched = [...slides];

  for (const { slideId, buildPrompt, quality, assetType, city } of sections) {
    const idx = enriched.findIndex((s) => s.id === slideId);
    if (idx < 0) continue;

    const minParagraphs = quality?.minParagraphs ?? 5;
    let aiParagraphs = await fetchQwenParagraphs(buildPrompt(), {
      minParagraphs,
      maxTokens: 3000,
    });

    if (
      quality &&
      aiParagraphs &&
      !validateContentQuality(aiParagraphs, quality)
    ) {
      const retryPrompt = buildAntiTemplateRetryPrompt(
        quality.country,
        city ?? quality.country,
        quality.section,
        assetType ?? "real estate"
      );
      const retry = await fetchQwenParagraphs(retryPrompt, {
        minParagraphs: minParagraphs + 1,
        maxTokens: 3500,
      });
      if (retry && validateContentQuality(retry, quality)) {
        aiParagraphs = retry;
      } else if (retry?.length) {
        aiParagraphs = retry;
      }
    }

    if (aiParagraphs?.length) {
      enriched[idx] = { ...enriched[idx]!, paragraphs: aiParagraphs };
    }
  }

  return enriched;
}
