"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  BaseCaseMetrics,
  CustomShockDriver,
  ScenarioMetrics,
  ScenarioState,
  ShockDriverConfig,
  ShockDriverType,
} from "@/types/scenario";

type ScenarioActions = {
  setDefaultDrivers: (drivers: ShockDriverConfig[]) => void;
  setDefaultDriverShock: (id: ShockDriverType, shockValue: number) => void;
  setDefaultDriverBaseValue: (id: ShockDriverType, baseValue: number) => void;

  addCustomDriver: (driver?: Partial<CustomShockDriver>) => void;
  updateCustomDriver: (id: string, patch: Partial<CustomShockDriver>) => void;
  removeCustomDriver: (id: string) => void;
  clearCustomDrivers: () => void;

  setBaseCaseMetrics: (m: BaseCaseMetrics | null) => void;
  setScenarioMetrics: (m: ScenarioMetrics | null) => void;

  setIsRecalculating: (v: boolean) => void;
  markCalculatedNow: () => void;

  resetScenario: () => void;
};

export type ScenarioStore = ScenarioState & ScenarioActions;

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function makeId(): string {
  try {
    // Browser + modern runtimes
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `sc_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

const DEFAULT_DRIVERS: ShockDriverConfig[] = [
  {
    id: "adr",
    name: "ADR (Average Daily Rate)",
    baseValue: 0,
    shockValue: 0,
    minShock: -15,
    maxShock: 15,
    step: 1,
    unit: "%",
    impactType: "revenue",
  },
  {
    id: "occupancy",
    name: "Occupancy Rate",
    baseValue: 0,
    shockValue: 0,
    minShock: -10,
    maxShock: 10,
    step: 1,
    unit: "pp",
    impactType: "revenue",
  },
  {
    id: "constructionCost",
    name: "Construction Cost",
    baseValue: 0,
    shockValue: 0,
    minShock: -20,
    maxShock: 20,
    step: 1,
    unit: "%",
    impactType: "cost",
  },
  {
    id: "constructionDuration",
    name: "Construction Duration",
    baseValue: 0,
    shockValue: 0,
    minShock: -12,
    maxShock: 12,
    step: 1,
    unit: "months",
    impactType: "timeline",
  },
  {
    id: "interestRate",
    name: "Interest Rate",
    baseValue: 0,
    shockValue: 0,
    minShock: -100,
    maxShock: 300,
    step: 25,
    unit: "bps",
    impactType: "cost",
  },
  {
    id: "operatingExpenses",
    name: "Operating Expenses",
    baseValue: 0,
    shockValue: 0,
    minShock: -5,
    maxShock: 25,
    step: 1,
    unit: "%",
    impactType: "cost",
  },
  {
    id: "exitCapRate",
    name: "Exit Cap Rate",
    baseValue: 0,
    shockValue: 0,
    minShock: -50,
    maxShock: 150,
    step: 25,
    unit: "bps",
    impactType: "exit",
  },
  {
    id: "ffeReserve",
    name: "FF&E Reserve",
    baseValue: 0,
    shockValue: 0,
    minShock: 0,
    maxShock: 3,
    step: 0.25,
    unit: "%rev",
    impactType: "cost",
  },
];

const SCENARIO_STORE_VERSION = 2;

const INITIAL_STATE: ScenarioState = {
  defaultDrivers: DEFAULT_DRIVERS,
  customDrivers: [],
  baseCaseMetrics: null,
  scenarioMetrics: null,
  isRecalculating: false,
  lastCalculationAt: null,
};

const useScenarioStore = create<ScenarioStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setDefaultDrivers: (drivers) => {
        set({ defaultDrivers: drivers });
      },
      setDefaultDriverShock: (id, shockValue) => {
        const prev = get().defaultDrivers;
        set({
          defaultDrivers: prev.map((d) =>
            d.id === id
              ? { ...d, shockValue: clamp(shockValue, d.minShock, d.maxShock) }
              : d
          ),
        });
      },
      setDefaultDriverBaseValue: (id, baseValue) => {
        const prev = get().defaultDrivers;
        set({
          defaultDrivers: prev.map((d) =>
            d.id === id ? { ...d, baseValue } : d
          ),
        });
      },

      addCustomDriver: (driver) => {
        const prev = get().customDrivers;
        if (prev.length >= 3) return;

        const next: CustomShockDriver = {
          id: makeId(),
          name: driver?.name ?? `Custom driver ${prev.length + 1}`,
          baseValue: driver?.baseValue ?? 0,
          shockValue: driver?.shockValue ?? 0,
          minShock: driver?.minShock ?? -25,
          maxShock: driver?.maxShock ?? 25,
          step: driver?.step ?? 5,
          unit: driver?.unit ?? "%",
          impactType: driver?.impactType ?? "custom",
          impactTarget: driver?.impactTarget,
          customFormula: driver?.customFormula,
        };

        set({ customDrivers: [...prev, next] });
      },
      updateCustomDriver: (id, patch) => {
        const prev = get().customDrivers;
        set({
          customDrivers: prev.map((d) => {
            if (d.id !== id) return d;
            const next = { ...d, ...patch };
            next.shockValue = clamp(next.shockValue, next.minShock, next.maxShock);
            return next;
          }),
        });
      },
      removeCustomDriver: (id) => {
        set({ customDrivers: get().customDrivers.filter((d) => d.id !== id) });
      },
      clearCustomDrivers: () => {
        set({ customDrivers: [] });
      },

      setBaseCaseMetrics: (m) => set({ baseCaseMetrics: m }),
      setScenarioMetrics: (m) => set({ scenarioMetrics: m }),

      setIsRecalculating: (v) => set({ isRecalculating: v }),
      markCalculatedNow: () => set({ lastCalculationAt: Date.now() }),

      resetScenario: () => {
        set({ ...INITIAL_STATE });
      },
    }),
    {
      name: "scenario-store-v1",
      storage: createJSONStorage(() => localStorage),
      version: SCENARIO_STORE_VERSION,
      migrate: (persisted: any, version) => {
        // Upgrade legacy 4-driver config to the 8 hotel drivers.
        if (!persisted || typeof persisted !== "object") return persisted as any;

        const prevDrivers: ShockDriverConfig[] = Array.isArray(persisted.defaultDrivers)
          ? persisted.defaultDrivers
          : [];
        const prevShock = (id: string) =>
          prevDrivers.find((d) => d.id === id)?.shockValue ?? 0;

        if (version >= SCENARIO_STORE_VERSION) {
          // Still ensure we have all drivers (covers partial/hand-edited persisted states).
          const prevById = new Map<string, ShockDriverConfig>(
            prevDrivers.map((d) => [d.id, d])
          );
          const merged = DEFAULT_DRIVERS.map((d) =>
            prevById.has(d.id) ? { ...d, ...prevById.get(d.id)! } : d
          );
          return { ...persisted, defaultDrivers: merged } as any;
        }

        // Legacy IDs: salesPrice, constructionCost, duration, occupancy
        const migrated: ShockDriverConfig[] = DEFAULT_DRIVERS.map((d) => {
          if (d.id === "adr") return { ...d, shockValue: prevShock("salesPrice") };
          if (d.id === "constructionCost")
            return { ...d, shockValue: prevShock("constructionCost") };
          if (d.id === "constructionDuration")
            return { ...d, shockValue: prevShock("duration") };
          if (d.id === "occupancy") return { ...d, shockValue: prevShock("occupancy") };
          return d;
        });

        return { ...persisted, defaultDrivers: migrated } as any;
      },
      partialize: (s) => ({
        defaultDrivers: s.defaultDrivers,
        customDrivers: s.customDrivers,
        baseCaseMetrics: s.baseCaseMetrics,
        scenarioMetrics: s.scenarioMetrics,
        isRecalculating: s.isRecalculating,
        lastCalculationAt: s.lastCalculationAt,
      }),
    }
  )
);

export default useScenarioStore;

