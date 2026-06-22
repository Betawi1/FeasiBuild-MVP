import { create } from "zustand";

export type AuditEntry = {
  id: string; // unique ID (ideally stable field path)
  label: string;
  value: string | number | boolean;
  component: string;
  step: string;
  route: string; // deep link (e.g., "/operational/cash-outflows?step=9")
  timestamp: Date;
  type: "input" | "select" | "toggle" | "calculated";
  stream: "operational" | "sale";
};

interface AuditStore {
  entries: Record<string, AuditEntry>;
  /** When true, `addEntry` also logs to the console in development. */
  debugEnabled: boolean;
  setDebugEnabled: (enabled: boolean) => void;
  addEntry: (entry: Omit<AuditEntry, "timestamp">) => void;
  clearLog: () => void;
}

export const useAuditStore = create<AuditStore>((set, get) => ({
  entries: {},
  debugEnabled: process.env.NODE_ENV === "development",
  setDebugEnabled: (enabled) => set({ debugEnabled: enabled }),
  addEntry: (entry) => {
    set((state) => ({
      entries: {
        ...state.entries,
        [entry.id]: { ...entry, timestamp: new Date() },
      },
    }));

    const shouldLog =
      get().debugEnabled && process.env.NODE_ENV === "development";
    if (shouldLog) {
      // eslint-disable-next-line no-console
      console.log(`[AUDIT] ${entry.label} = ${String(entry.value)}`, {
        id: entry.id,
        component: entry.component,
        step: entry.step,
        route: entry.route,
        type: entry.type,
        stream: entry.stream,
      });
    }
  },
  clearLog: () => set({ entries: {} }),
}));
