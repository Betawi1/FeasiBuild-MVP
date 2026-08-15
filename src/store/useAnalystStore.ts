import { create } from "zustand";

export type AnalystRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: AnalystRole;
  content: string;
}

const EMPTY_CHAT = {
  messages: [] as ChatMessage[],
  isLoading: false,
};

export interface AnalystState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  contextKey: string | null;
  generation: number;
  /** Live wizard UI step telemetry for the Analyst (not a model input). */
  wizardPathname: string | null;
  wizardUiStep: number | null;
}

export interface AnalystActions {
  toggleDrawer: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  addMessage: (message: Omit<ChatMessage, "id"> & { id?: string }) => void;
  appendToLastAssistant: (delta: string) => void;
  replaceLastAssistant: (content: string) => void;
  clearChat: () => void;
  resetForContext: (key: string) => void;
  setLoading: (isLoading: boolean) => void;
  setWizardUiStep: (pathname: string, uiStep: number | null) => void;
}

export type AnalystStore = AnalystState & AnalystActions;

function normalizeWizardPathname(pathname: string): string {
  if (!pathname) return "";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function createMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useAnalystStore = create<AnalystStore>((set) => ({
  isOpen: false,
  messages: [],
  isLoading: false,
  contextKey: null,
  generation: 0,
  wizardPathname: null,
  wizardUiStep: null,

  toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: message.id ?? createMessageId(),
          role: message.role,
          content: message.content,
        },
      ],
    })),

  appendToLastAssistant: (delta) =>
    set((state) => {
      if (!delta) return state;
      const messages = state.messages;
      if (messages.length === 0) return state;
      const lastIndex = messages.length - 1;
      const last = messages[lastIndex];
      if (last.role !== "assistant") return state;
      const next = messages.slice();
      next[lastIndex] = { ...last, content: last.content + delta };
      return { messages: next };
    }),

  replaceLastAssistant: (content) =>
    set((state) => {
      const messages = state.messages;
      if (messages.length === 0) return state;
      const lastIndex = messages.length - 1;
      const last = messages[lastIndex];
      if (last.role !== "assistant") return state;
      const next = messages.slice();
      next[lastIndex] = { ...last, content };
      return { messages: next };
    }),

  clearChat: () => set({ ...EMPTY_CHAT }),
  resetForContext: (key) =>
    set((state) => ({
      ...EMPTY_CHAT,
      generation: state.generation + 1,
      contextKey: key,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setWizardUiStep: (pathname, uiStep) =>
    set((state) => {
      const normalized = normalizeWizardPathname(pathname);
      if (uiStep != null && Number.isFinite(uiStep) && uiStep >= 1) {
        const nextStep = Math.floor(uiStep);
        if (
          state.wizardPathname === normalized &&
          state.wizardUiStep === nextStep
        ) {
          return state;
        }
        return { wizardPathname: normalized, wizardUiStep: nextStep };
      }
      if (state.wizardPathname === normalized) {
        return { wizardPathname: null, wizardUiStep: null };
      }
      return state;
    }),
}));

export default useAnalystStore;
