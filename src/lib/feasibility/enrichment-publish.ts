"use client";

import {
  getEnrichmentAttempts,
  logEnrichmentDiagnostics,
} from "@/lib/feasibility/enrichment-ladder";
import { useFeasibilityStore } from "@/store/useFeasibilityStore";
import type { FeasibilitySlide } from "@/types/feasibility";

export type SettledAiStatus = "ok" | "fallback" | "failed";

export function publishBaseDeck(
  slides: FeasibilitySlide[],
  aiSlideIds: string[]
): void {
  const store = useFeasibilityStore.getState();
  store.setSlides(slides);
  store.beginAiSections(aiSlideIds, "replace");
}

export function publishEnrichmentSlide(
  slide: FeasibilitySlide,
  status: SettledAiStatus
): void {
  const attempts = getEnrichmentAttempts(slide.id);
  const store = useFeasibilityStore.getState();
  store.patchSlide(slide.id, slide);
  store.setAiSectionStatus(slide.id, status, attempts);
}

export function logStoreEnrichmentDiagnostics(): void {
  const sections = useFeasibilityStore.getState().aiSections;
  logEnrichmentDiagnostics(sections);
}
