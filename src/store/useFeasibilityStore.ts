import { create } from "zustand";
import type {
  FeasibilityReport,
  FeasibilitySlide,
  FeasibilitySlideData,
} from "@/types/feasibility";

interface FeasibilityStore {
  slides: FeasibilitySlide[];
  report: FeasibilityReport | null;
  marketResearchCache: Record<string, unknown> | null;
  isEditing: boolean;
  setSlides: (slides: FeasibilitySlide[]) => void;
  setReport: (report: FeasibilityReport) => void;
  updateSlideParagraph: (slideId: string, index: number, newText: string) => void;
  updateSlideData: (slideId: string, data: FeasibilitySlideData) => void;
  setMarketResearchCache: (data: Record<string, unknown> | null) => void;
  toggleEditing: () => void;
}

export const useFeasibilityStore = create<FeasibilityStore>((set) => ({
  slides: [],
  report: null,
  marketResearchCache: null,
  isEditing: false,
  setSlides: (slides) =>
    set({
      slides,
      report: { slides, generatedAt: new Date().toISOString() },
    }),
  setReport: (report) => set({ report, slides: report.slides }),
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
}));
