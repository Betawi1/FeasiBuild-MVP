"use client";

import { useEffect, useMemo } from "react";
import { useToast } from "@/components/ui/Toast";
import { useSubscription } from "@/hooks/useSubscription";
import {
  CUSTOM_PAGE_ANCHOR_TOAST,
  CUSTOM_PAGE_LIMIT,
  CUSTOM_PAGE_LIMIT_TOAST,
  appendCustomPage,
  deleteCustomPage,
  insertCustomPageAfter,
  mergeDeck,
  moveCustomPage,
  releaseOrphanedAnchors,
  type DeckEntry,
} from "@/lib/feasibility/custom-slides";
import { useFeasibilityStore } from "@/store/useFeasibilityStore";
import type { CustomSlide, FeasibilitySlide } from "@/types/feasibility";

const toastedOrphanIds = new Set<string>();

export function useCustomDeck(generated: FeasibilitySlide[]) {
  const customSlides = useFeasibilityStore((state) => state.customSlides);
  const setCustomSlides = useFeasibilityStore((state) => state.setCustomSlides);
  const updateCustomSlide = useFeasibilityStore(
    (state) => state.updateCustomSlide
  );
  const { showToast } = useToast();
  const { whiteLabel, isLoading } = useSubscription();
  const entitlementReady = !isLoading;
  const canInsert = entitlementReady && whiteLabel;

  const merged = useMemo(
    () => mergeDeck(generated, customSlides),
    [generated, customSlides]
  );

  const orphanKey = merged.orphanIds.join("|");

  useEffect(() => {
    if (!orphanKey) return;
    const ids = orphanKey.split("|");
    const current = useFeasibilityStore.getState().customSlides;
    const stillOrphaned = current.some(
      (slide) => ids.includes(slide.id) && slide.insertAfter !== "end"
    );
    if (!stillOrphaned) return;
    const unseen = ids.filter((id) => !toastedOrphanIds.has(id));
    for (const id of unseen) toastedOrphanIds.add(id);
    setCustomSlides(releaseOrphanedAnchors(current, ids));
    if (unseen.length > 0) {
      showToast({ variant: "info", title: CUSTOM_PAGE_ANCHOR_TOAST });
    }
  }, [orphanKey, setCustomSlides, showToast]);

  const blocked = () => {
    if (canInsert && customSlides.length < CUSTOM_PAGE_LIMIT) return false;
    if (customSlides.length >= CUSTOM_PAGE_LIMIT) {
      showToast({ variant: "info", title: CUSTOM_PAGE_LIMIT_TOAST });
    }
    return true;
  };

  return {
    entries: merged.entries,
    entitlementReady,
    canInsert,
    updateCustomSlide,
    insertAfter(index: number, setIndex: (index: number) => void) {
      if (!canInsert || blocked()) return;
      const next = insertCustomPageAfter(generated, customSlides, index);
      setCustomSlides(next.customSlides);
      setIndex(next.index);
    },
    addAtEnd(setIndex: (index: number) => void) {
      if (!canInsert || blocked()) return;
      const next = appendCustomPage(generated, customSlides);
      setCustomSlides(next.customSlides);
      setIndex(next.index);
    },
    move(
      id: string,
      direction: "up" | "down",
      setIndex: (index: number) => void
    ) {
      const next = moveCustomPage(generated, customSlides, id, direction);
      if (!next) return;
      setCustomSlides(next.customSlides);
      setIndex(next.index);
    },
    remove(id: string, index: number, setIndex: (index: number) => void) {
      const next = deleteCustomPage(generated, customSlides, id, index);
      setCustomSlides(next.customSlides);
      setIndex(next.index);
    },
  };
}

export function customMoveFlags(entries: DeckEntry[], id: string) {
  const index = entries.findIndex(
    (entry) => entry.kind === "custom" && entry.id === id
  );
  const titleAt = entries.findIndex(
    (entry) =>
      entry.kind === "generated" &&
      (entry.generated?.section === "title" || entry.id === "title-slide")
  );
  const blockedByTitle = titleAt >= 0 && index - 1 <= titleAt;
  return {
    canMoveUp: index > 0 && !blockedByTitle,
    canMoveDown: index >= 0 && index < entries.length - 1,
  };
}

export function replaceCustomSlide(
  updateCustomSlide: (
    id: string,
    updater: (slide: CustomSlide) => CustomSlide
  ) => void,
  slide: CustomSlide
) {
  updateCustomSlide(slide.id, () => slide);
}
