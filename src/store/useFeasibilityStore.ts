import { create } from "zustand";
import { normalizeCustomSlides } from "@/lib/feasibility/custom-slides";
import type {
  CustomSlide,
  FeasibilityReport,
  FeasibilitySlide,
  FeasibilitySlideData,
} from "@/types/feasibility";

export type AiSectionStatus = "pending" | "ok" | "fallback" | "failed";

export interface AiSectionState {
  status: AiSectionStatus;
  attempts: number;
}

interface FeasibilityStore {
  slides: FeasibilitySlide[];
  /**
   * User-authored deck pages. AI regenerate / enrich / cache paths must not
   * read, rewrite, or clear this slice. `setSlides` leaves it untouched.
   */
  customSlides: CustomSlide[];
  /** Project id the in-memory custom pages belong to. Null until claimed. */
  customSlidesOwnerId: string | null;
  report: FeasibilityReport | null;
  marketResearchCache: Record<string, unknown> | null;
  isEditing: boolean;
  /** Per-slide enrichment status for the run in progress. Render source is this store, not KV. */
  aiSections: Record<string, AiSectionState>;
  aiBannerDismissed: boolean;
  setSlides: (slides: FeasibilitySlide[]) => void;
  setCustomSlides: (slides: CustomSlide[], ownerId?: string | null) => void;
  updateCustomSlide: (
    id: string,
    updater: (slide: CustomSlide) => CustomSlide
  ) => void;
  clearCustomSlides: () => void;
  setReport: (report: FeasibilityReport) => void;
  patchSlide: (slideId: string, slide: FeasibilitySlide) => void;
  updateSlideParagraph: (slideId: string, index: number, newText: string) => void;
  updateSlideData: (slideId: string, data: FeasibilitySlideData) => void;
  setMarketResearchCache: (data: Record<string, unknown> | null) => void;
  toggleEditing: () => void;
  beginAiSections: (slideIds: string[], mode: "replace" | "merge") => void;
  setAiSectionStatus: (
    slideId: string,
    status: Exclude<AiSectionStatus, "pending">,
    attempts: number
  ) => void;
  dismissAiBanner: () => void;
  resetAiSections: () => void;
}

export const useFeasibilityStore = create<FeasibilityStore>((set) => ({
  slides: [],
  customSlides: [],
  customSlidesOwnerId: null,
  report: null,
  marketResearchCache: null,
  isEditing: false,
  aiSections: {},
  aiBannerDismissed: false,
  setSlides: (slides) =>
    set({
      slides,
      report: { slides, generatedAt: new Date().toISOString() },
    }),
  setCustomSlides: (slides, ownerId) =>
    set((state) => ({
      customSlides: normalizeCustomSlides(slides),
      customSlidesOwnerId:
        ownerId !== undefined ? ownerId : state.customSlidesOwnerId,
    })),
  updateCustomSlide: (id, updater) =>
    set((state) => ({
      customSlides: state.customSlides.map((slide) =>
        slide.id === id ? updater(slide) : slide
      ),
    })),
  clearCustomSlides: () =>
    set({ customSlides: [], customSlidesOwnerId: null }),
  setReport: (report) => set({ report, slides: report.slides }),
  patchSlide: (slideId, slide) =>
    set((state) => {
      if (!state.slides.some((s) => s.id === slideId)) return state;
      const slides = state.slides.map((s) => (s.id === slideId ? slide : s));
      return {
        slides,
        report: state.report
          ? { ...state.report, slides }
          : { slides, generatedAt: new Date().toISOString() },
      };
    }),
  updateSlideParagraph: (slideId, index, newText) =>
    set((state) => ({
      slides: state.slides.map((s) => {
        if (s.id !== slideId) return s;
        const paragraphs = [...s.paragraphs];
        paragraphs[index] = newText;
        return { ...s, paragraphs };
      }),
    })),
  updateSlideData: (slideId, data) =>
    set((state) => ({
      slides: state.slides.map((s) =>
        s.id === slideId ? { ...s, data } : s
      ),
    })),
  setMarketResearchCache: (data) => set({ marketResearchCache: data }),
  toggleEditing: () => set((state) => ({ isEditing: !state.isEditing })),
  beginAiSections: (slideIds, mode) =>
    set((state) => {
      const next: Record<string, AiSectionState> =
        mode === "replace" ? {} : { ...state.aiSections };
      for (const id of slideIds) {
        next[id] = { status: "pending", attempts: 0 };
      }
      return { aiSections: next, aiBannerDismissed: false };
    }),
  setAiSectionStatus: (slideId, status, attempts) =>
    set((state) => ({
      aiSections: {
        ...state.aiSections,
        [slideId]: { status, attempts },
      },
    })),
  dismissAiBanner: () => set({ aiBannerDismissed: true }),
  resetAiSections: () => set({ aiSections: {}, aiBannerDismissed: false }),
}));
