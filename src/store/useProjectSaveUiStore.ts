import { create } from "zustand";
import type { BuildProjectSaveInput } from "@/lib/project-save";

export type ProjectSaveUiStatus =
  | "idle"
  | "saved_locally"
  | "syncing"
  | "synced"
  | "failed";

type ProjectSaveUiState = {
  saveStatus: ProjectSaveUiStatus;
  lastInput: BuildProjectSaveInput | null;
  syncInFlight: boolean;
  /** Project ids that already showed the first auto-save toast this session. */
  autoSaveToastShown: Record<string, true>;
  setSaveStatus: (status: ProjectSaveUiStatus) => void;
  setLastInput: (input: BuildProjectSaveInput | null) => void;
  setSyncInFlight: (inFlight: boolean) => void;
  markAutoSaveToastShown: (projectId: string) => void;
};

export const useProjectSaveUiStore = create<ProjectSaveUiState>((set) => ({
  saveStatus: "idle",
  lastInput: null,
  syncInFlight: false,
  autoSaveToastShown: {},
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setLastInput: (lastInput) => set({ lastInput }),
  setSyncInFlight: (syncInFlight) => set({ syncInFlight }),
  markAutoSaveToastShown: (projectId) =>
    set((s) => ({
      autoSaveToastShown: { ...s.autoSaveToastShown, [projectId]: true },
    })),
}));
