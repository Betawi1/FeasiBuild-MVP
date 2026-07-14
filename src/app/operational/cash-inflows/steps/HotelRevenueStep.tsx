"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useFinModelStore, { type ProjectInfo } from "@/store/useFinModelStore";
import { AiInput } from "@/components/ui/AiInput";
import {
  buildDefaultAdrSeries,
  compoundAdrForYearIndex,
  computeRoomRevenueSeries,
  DUBAI_BUSINESS_HOTEL_DEFAULT_OCCUPANCY,
  OPERATIONAL_ROOM_REVENUE_YEARS,
  roomRevenueToChartData,
  type RoomRevenueChartRow,
} from "@/lib/operational-cash-inflows-chart";
import type { OperationalHotelHoldSnapshot } from "@/lib/operational-pnl";
import { useAuditLog } from "@/hooks/useAuditLog";
import { logBenchmarkValues, logResetToBenchmark } from "@/lib/audit-batch";
import { logAuditChange } from "@/lib/audit-utils";
import {
  CASH_INFLOWS_COMPONENT,
  cashInflowAuditRoute,
} from "@/lib/operational-audit-fields";

const HOTEL_STEP1_TITLE = "Step 1: Room Revenues";
const HOTEL_STEP1_ROUTE = cashInflowAuditRoute(1);

type OperationalBenchmarkDefaults = {
  adrYear1: number;
  occupancyYear1: number;
  occupancyIncrementPa: number;
};

const PROFILE_DEFAULTS: Record<
  string,
  { adrBenchmark: number; occupancyBenchmark: number; regionBucket: string }
> = {
  "United Arab Emirates:Dubai:Business:5": {
    adrBenchmark: 650,
    occupancyBenchmark: 75,
    regionBucket: "dubai",
  },
  "United Arab Emirates:Dubai:Resort:5": {
    adrBenchmark: 950,
    occupancyBenchmark: 68,
    regionBucket: "dubai",
  },
  "United Arab Emirates:Abu Dhabi:Business:5": {
    adrBenchmark: 600,
    occupancyBenchmark: 70,
    regionBucket: "abudhabi",
  },
  "United Arab Emirates:Abu Dhabi:Resort:5": {
    adrBenchmark: 800,
    occupancyBenchmark: 65,
    regionBucket: "abudhabi",
  },
};

const OPERATIONAL_BENCHMARK_DEFAULTS: Record<string, OperationalBenchmarkDefaults> =
  {
    "United Arab Emirates:Dubai:Business:5": {
      adrYear1: 650,
      occupancyYear1: 75,
      occupancyIncrementPa: 1,
    },
    "United Arab Emirates:Dubai:Business:4": {
      adrYear1: 450,
      occupancyYear1: 72,
      occupancyIncrementPa: 1,
    },
    "United Arab Emirates:Dubai:Resort:5": {
      adrYear1: 950,
      occupancyYear1: 68,
      occupancyIncrementPa: 0.5,
    },
    "United Arab Emirates:Dubai:Resort:4": {
      adrYear1: 700,
      occupancyYear1: 65,
      occupancyIncrementPa: 0.5,
    },
    "United Arab Emirates:Abu Dhabi:Business:5": {
      adrYear1: 600,
      occupancyYear1: 70,
      occupancyIncrementPa: 1,
    },
    "United Arab Emirates:Abu Dhabi:Business:4": {
      adrYear1: 400,
      occupancyYear1: 68,
      occupancyIncrementPa: 1,
    },
    "United Arab Emirates:Abu Dhabi:Resort:5": {
      adrYear1: 800,
      occupancyYear1: 65,
      occupancyIncrementPa: 0.5,
    },
    "United Arab Emirates:Abu Dhabi:Resort:4": {
      adrYear1: 550,
      occupancyYear1: 62,
      occupancyIncrementPa: 0.5,
    },
  };

function benchmarkKeyFromProject(pi: ProjectInfo): string | null {
  const country = (pi.country || "").trim();
  const city = (pi.city || "").trim();
  const seg = (pi.hotelOperatingType || "").trim();
  const star = Number(pi.hotelStarRating);
  if (!country || !city || !seg || !Number.isFinite(star) || star <= 0) return null;
  const segTitle = seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
  return `${country}:${city}:${segTitle}:${Math.round(star)}`;
}

function findOperationalBenchmark(
  pi: ProjectInfo
): OperationalBenchmarkDefaults | null {
  const raw = benchmarkKeyFromProject(pi);
  if (!raw) return null;
  const exact = OPERATIONAL_BENCHMARK_DEFAULTS[raw];
  if (exact) return exact;
  const norm = raw.replace(/\s+/g, " ").trim().toLowerCase();
  for (const k of Object.keys(OPERATIONAL_BENCHMARK_DEFAULTS)) {
    if (k.replace(/\s+/g, " ").trim().toLowerCase() === norm) {
      return OPERATIONAL_BENCHMARK_DEFAULTS[k]!;
    }
  }
  return null;
}

function capitalizeFirst(str: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function normalizeProfileKey(key: string): string {
  return key.replace(/\s+/g, " ").trim().toLowerCase();
}

function getProfileDefaults(profileKey: string) {
  const exact = PROFILE_DEFAULTS[profileKey];
  if (exact) return exact;
  const norm = normalizeProfileKey(profileKey);
  for (const k of Object.keys(PROFILE_DEFAULTS)) {
    if (normalizeProfileKey(k) === norm) return PROFILE_DEFAULTS[k]!;
  }
  return undefined;
}

export function getOperationalHotelHoldSnapshot():
  | OperationalHotelHoldSnapshot
  | undefined {
  return useFinModelStore.getState().operational?.hotelHoldSnapshot;
}

export function padOperationalYearSeries(
  values: number[] | undefined,
  fallback: readonly number[]
): number[] {
  if (!values?.length) return [...fallback];
  const out = [...values];
  while (out.length < OPERATIONAL_ROOM_REVENUE_YEARS) {
    out.push(out[out.length - 1] ?? 0);
  }
  return out.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS);
}

export type HotelRevenueStepErrors = Record<string, string>;

export function validateHotelRevenueStep(
  snap: OperationalHotelHoldSnapshot | undefined
): HotelRevenueStepErrors {
  const next: HotelRevenueStepErrors = {};
  const numberOfRooms = snap?.numberOfRooms ?? 0;
  const adrValues = snap?.adrValues ?? [];
  const occupancyValues = snap?.occupancyValues ?? [];
  const adrYear1 = adrValues[0] ?? 0;
  const occupancyYear1 = occupancyValues[0] ?? 0;

  if (!Number.isFinite(numberOfRooms) || numberOfRooms <= 0) {
    next.numberOfRooms = "Number of rooms must be greater than 0.";
  }
  if (!Number.isFinite(adrYear1) || adrYear1 <= 0) {
    next.adrYear1 = "Year 1 ADR must be greater than 0.";
  }
  if (
    !Number.isFinite(occupancyYear1) ||
    occupancyYear1 < 0 ||
    occupancyYear1 > 100
  ) {
    next.occupancyYear1 = "Year 1 occupancy must be between 0% and 100%.";
  }
  for (let i = 0; i < OPERATIONAL_ROOM_REVENUE_YEARS; i++) {
    const o = occupancyValues[i];
    if (!Number.isFinite(o) || o < 0 || o > 100) {
      next[`occ_${i}`] = `Year ${i + 1} occupancy must be 0–100%.`;
    }
    const a = adrValues[i];
    if (!Number.isFinite(a) || a <= 0) {
      next[`adr_${i}`] = `Year ${i + 1} ADR must be greater than 0.`;
    }
  }
  return next;
}

/** Room revenue series from persisted hotel hold snapshot (for Steps 2+). */
export function useHotelRoomRevenueFromStore(projectInfo: ProjectInfo) {
  const snap = useFinModelStore((s) => s.operational?.hotelHoldSnapshot);
  return useMemo(() => {
    const def = findOperationalBenchmark(projectInfo);
    const adrY1 = def?.adrYear1 ?? 1050;
    const occY1 = def?.occupancyYear1 ?? 68;
    const occInc = def?.occupancyIncrementPa ?? 0;
    const numberOfRooms = snap?.numberOfRooms ?? 300;
    const adrValues = padOperationalYearSeries(
      snap?.adrValues,
      buildDefaultAdrSeries(adrY1, 4)
    );
    const occupancyValues = padOperationalYearSeries(
      snap?.occupancyValues,
      Array.from({ length: OPERATIONAL_ROOM_REVENUE_YEARS }, (_, i) =>
        Math.min(100, Math.max(0, occY1 + occInc * i))
      )
    );
    const roomRevenue = computeRoomRevenueSeries(
      numberOfRooms,
      adrValues,
      occupancyValues
    );
    const tenYearRoomRevenueTotal = roomRevenue.reduce((s, v) => s + (v || 0), 0);
    return {
      numberOfRooms,
      adrValues,
      occupancyValues,
      roomRevenue,
      tenYearRoomRevenueTotal,
    };
  }, [snap, projectInfo]);
}

const inputBase =
  "rounded bg-slate-900 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

function overrideFieldClass(overridden: boolean): string {
  return overridden
    ? `${inputBase} border-2 border-amber-500/70`
    : `${inputBase} border border-slate-600`;
}

function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function RoomRevenueBarChart({
  data,
  currencyCode,
}: {
  data: RoomRevenueChartRow[];
  currencyCode: string;
}) {
  const mounted = useClientMounted();
  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    []
  );

  if (!data.length) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 text-sm text-slate-500">
        Enter rooms, ADR, and occupancy to see projected room revenue.
      </div>
    );
  }

  const maxR = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="h-80 w-full rounded-lg border border-slate-700/80 bg-slate-900/40 p-2">
      <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Projected room revenue by year ({currencyCode})
      </p>
      {mounted ? (
        <ResponsiveContainer width="100%" height="90%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              tickFormatter={(v) => fmt.format(Number(v))}
              width={48}
              domain={[0, maxR * 1.08]}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const raw = payload[0].value;
                const v = typeof raw === "number" ? raw : Number(raw ?? 0);
                return (
                  <div className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs shadow-lg">
                    <p className="mb-1 text-slate-400">{String(label)}</p>
                    <p className="font-semibold text-emerald-400">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: currencyCode,
                        maximumFractionDigits: 0,
                      }).format(v)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[90%] w-full" />
      )}
    </div>
  );
}

type HotelRevenueStepProps = {
  fieldError: (name: string) => string | undefined;
};

export default function HotelRevenueStep({ fieldError }: HotelRevenueStepProps) {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational?.cashOutflows);
  const aiC2 = cashOutflows?.aiResearchData?.c2_operational;
  const aiAdrYear1 = aiC2?.room_revenues?.adr_year_1;
  const aiAdrInflation = aiC2?.room_revenues?.adr_inflation_pct;
  const currencyCode = projectInfo.currency || "AED";
  const benchmarkLabel = `${projectInfo.hotelOperatingType || "resort"} · ${
    projectInfo.hotelStarRating || "5"
  } · ${(projectInfo.city || "dubai").toLowerCase()}`;
  const benchmarkDefaults = useMemo(
    () => findOperationalBenchmark(projectInfo),
    [projectInfo]
  );

  const profileAdrBenchmark = useMemo(() => {
    if (
      !projectInfo.country ||
      !projectInfo.city ||
      !projectInfo.hotelOperatingType ||
      !projectInfo.hotelStarRating
    ) {
      return 0;
    }
    const profileKey = `${projectInfo.country}:${projectInfo.city}:${capitalizeFirst(
      projectInfo.hotelOperatingType
    )}:${projectInfo.hotelStarRating}`;
    const defaults = getProfileDefaults(profileKey);
    return defaults?.adrBenchmark || 0;
  }, [
    projectInfo.country,
    projectInfo.city,
    projectInfo.hotelOperatingType,
    projectInfo.hotelStarRating,
  ]);

  const [numberOfRooms, setNumberOfRooms] = useState(
    () =>
      projectInfo.hotelTotalKeys ||
      getOperationalHotelHoldSnapshot()?.numberOfRooms ||
      300
  );

  useEffect(() => {
    if (projectInfo.hotelTotalKeys) {
      setNumberOfRooms(projectInfo.hotelTotalKeys);
    }
  }, [projectInfo.hotelTotalKeys]);

  const adrYear1ManualRef = useRef(false);
  const [adrYear1IsManual, setAdrYear1IsManual] = useState(() => {
    const snap = getOperationalHotelHoldSnapshot();
    if (snap?.adrValues?.[0] == null || aiAdrYear1 == null) return false;
    return Math.abs(Number(snap.adrValues[0]) - Number(aiAdrYear1)) > 0.5;
  });
  const [adrInflationIsManual, setAdrInflationIsManual] = useState(false);
  const occupancyYear1ManualRef = useRef(false);
  const occupancyIncManualRef = useRef(false);

  const [adrYear1, setAdrYear1] = useState(() => {
    const snap = getOperationalHotelHoldSnapshot();
    if (snap?.adrValues?.[0] != null) return snap.adrValues[0];
    if (aiAdrYear1) return aiAdrYear1;
    const def = findOperationalBenchmark(projectInfo);
    return def?.adrYear1 ?? 1050;
  });

  useEffect(() => {
    if (profileAdrBenchmark > 0 && adrYear1 === 0 && !adrYear1ManualRef.current) {
      setAdrYear1(profileAdrBenchmark);
    }
  }, [profileAdrBenchmark, adrYear1]);

  const [adrInflationRate, setAdrInflationRate] = useState(aiAdrInflation ?? 4);
  const [adrValues, setAdrValues] = useState<number[]>(() => {
    const snap = getOperationalHotelHoldSnapshot();
    const formula = buildDefaultAdrSeries(adrYear1, adrInflationRate);
    return padOperationalYearSeries(snap?.adrValues, formula);
  });

  const [occupancyYear1, setOccupancyYear1] = useState(() => {
    const snap = getOperationalHotelHoldSnapshot();
    if (snap?.occupancyValues?.[0] != null) return snap.occupancyValues[0];
    const def = findOperationalBenchmark(projectInfo);
    return def?.occupancyYear1 ?? 68;
  });
  const [occupancyIncrementPa, setOccupancyIncrementPa] = useState(() => {
    const snap = getOperationalHotelHoldSnapshot();
    if (snap?.occupancyValues?.length) return 0;
    const def = findOperationalBenchmark(projectInfo);
    return def?.occupancyIncrementPa ?? 0;
  });

  useEffect(() => {
    const snap = getOperationalHotelHoldSnapshot();
    if (snap?.adrValues?.length || snap?.occupancyValues?.length) return;
    if (!benchmarkDefaults) return;

    if (!adrYear1ManualRef.current) {
      setAdrYear1(benchmarkDefaults.adrYear1);
    }
    if (!occupancyYear1ManualRef.current) {
      setOccupancyYear1(benchmarkDefaults.occupancyYear1);
    }
    if (!occupancyIncManualRef.current) {
      setOccupancyIncrementPa(benchmarkDefaults.occupancyIncrementPa);
    }
  }, [benchmarkDefaults]);

  const [occupancyValues, setOccupancyValues] = useState<number[]>(() => {
    const snap = getOperationalHotelHoldSnapshot();
    const ramp = Array.from({ length: OPERATIONAL_ROOM_REVENUE_YEARS }, (_, i) =>
      Math.min(100, Math.max(0, occupancyYear1 + occupancyIncrementPa * i))
    );
    return padOperationalYearSeries(snap?.occupancyValues, ramp);
  });

  const [adrOverrides, setAdrOverrides] = useState<boolean[]>(() => {
    const snap = getOperationalHotelHoldSnapshot();
    if (!snap?.adrValues?.length) {
      return Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false);
    }
    const formula = buildDefaultAdrSeries(adrYear1, adrInflationRate);
    return Array.from({ length: OPERATIONAL_ROOM_REVENUE_YEARS }, (_, i) => {
      if (i === 0) return false;
      const s = snap.adrValues?.[i];
      if (s == null) return false;
      return Math.abs(Number(s) - Number(formula[i] ?? 0)) > 0.5;
    });
  });
  const [occupancyOverrides, setOccupancyOverrides] = useState<boolean[]>(() => {
    const snap = getOperationalHotelHoldSnapshot();
    if (!snap?.occupancyValues?.length) {
      return Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false);
    }
    const ramp = Array.from({ length: OPERATIONAL_ROOM_REVENUE_YEARS }, (_, i) =>
      Math.min(100, Math.max(0, occupancyYear1 + occupancyIncrementPa * i))
    );
    return Array.from({ length: OPERATIONAL_ROOM_REVENUE_YEARS }, (_, i) => {
      if (i === 0) return false;
      const s = snap.occupancyValues?.[i];
      if (s == null) return false;
      return Math.abs(Number(s) - Number(ramp[i] ?? 0)) > 0.05;
    });
  });

  const [roomRevenue, setRoomRevenue] = useState<number[]>(() =>
    Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(0)
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const st = useFinModelStore.getState().operational?.hotelHoldSnapshot;
      useFinModelStore.getState().updateHotelHoldSnapshot(
        {
          numberOfRooms,
          adrValues: adrValues.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS),
          occupancyValues: occupancyValues.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS),
          revPcts: st?.revPcts ?? {},
          directCostPcts: st?.directCostPcts ?? {},
          expensePcts: st?.expensePcts ?? {},
          depFieldValues: st?.depFieldValues ?? {},
        },
        "operational"
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [numberOfRooms, adrValues, occupancyValues]);

  useEffect(() => {
    setAdrValues((prev) => {
      const next = [...prev];
      next[0] = adrYear1;
      for (let i = 0; i < OPERATIONAL_ROOM_REVENUE_YEARS; i++) {
        if (i !== 0 && !adrOverrides[i]) {
          next[i] = compoundAdrForYearIndex(adrYear1, adrInflationRate, i);
        }
      }
      while (next.length < OPERATIONAL_ROOM_REVENUE_YEARS) {
        next.push(
          compoundAdrForYearIndex(adrYear1, adrInflationRate, next.length)
        );
      }
      return next.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS);
    });
  }, [adrYear1, adrInflationRate, adrOverrides]);

  useEffect(() => {
    setAdrOverrides((prev) => {
      if (!prev.length) return prev;
      if (prev[0] === false) return prev;
      const next = [...prev];
      next[0] = false;
      return next;
    });
  }, []);

  useEffect(() => {
    setOccupancyOverrides((prev) => {
      if (!prev.length) return prev;
      if (prev[0] === false) return prev;
      const next = [...prev];
      next[0] = false;
      return next;
    });
  }, []);

  useEffect(() => {
    setOccupancyValues((prev) => {
      const next = [...prev];
      next[0] = occupancyYear1;
      const inc = Number.isFinite(occupancyIncrementPa) ? occupancyIncrementPa : 0;
      for (let i = 1; i < OPERATIONAL_ROOM_REVENUE_YEARS; i++) {
        if (occupancyOverrides[i]) continue;
        const v = Math.min(100, Math.max(0, occupancyYear1 + inc * i));
        next[i] = v;
      }
      return next;
    });
  }, [occupancyYear1, occupancyIncrementPa, occupancyOverrides]);

  useEffect(() => {
    setRoomRevenue(
      computeRoomRevenueSeries(numberOfRooms, adrValues, occupancyValues)
    );
  }, [numberOfRooms, adrValues, occupancyValues]);

  const chartData = useMemo(
    () => roomRevenueToChartData(roomRevenue),
    [roomRevenue]
  );

  const tenYearRoomRevenueTotal = useMemo(
    () => roomRevenue.reduce((s, v) => s + (v || 0), 0),
    [roomRevenue]
  );

  const hasAnyOverride = useMemo(
    () => adrOverrides.some(Boolean) || occupancyOverrides.some(Boolean),
    [adrOverrides, occupancyOverrides]
  );

  const resetAdrToFormula = useCallback(() => {
    setAdrOverrides(Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false));
    setAdrValues(buildDefaultAdrSeries(adrYear1, adrInflationRate));
    if (aiAdrYear1 != null && Math.abs(Number(adrYear1) - Number(aiAdrYear1)) < 0.5) {
      adrYear1ManualRef.current = false;
      setAdrYear1IsManual(false);
    }
    if (
      aiAdrInflation != null &&
      Math.abs(Number(adrInflationRate) - Number(aiAdrInflation)) < 0.05
    ) {
      setAdrInflationIsManual(false);
    }
  }, [adrYear1, adrInflationRate, aiAdrYear1, aiAdrInflation]);

  const resetAdrToBenchmark = useCallback(() => {
    const benchmarkDef = findOperationalBenchmark(projectInfo);
    const newAdrYear1 = aiAdrYear1 ?? benchmarkDef?.adrYear1 ?? 1050;
    const newAdrInflation = aiAdrInflation ?? 4;
    setAdrYear1(newAdrYear1);
    setAdrInflationRate(newAdrInflation);
    // Clear manual overrides
    adrYear1ManualRef.current = false;
    setAdrYear1IsManual(false);
    setAdrInflationIsManual(false);
    logResetToBenchmark(
      CASH_INFLOWS_COMPONENT,
      HOTEL_STEP1_TITLE,
      HOTEL_STEP1_ROUTE,
      "ADR Year 1 (Benchmark)",
      newAdrYear1
    );
    logResetToBenchmark(
      CASH_INFLOWS_COMPONENT,
      HOTEL_STEP1_TITLE,
      HOTEL_STEP1_ROUTE,
      "ADR Inflation (Benchmark)",
      newAdrInflation
    );
  }, [projectInfo, aiAdrYear1, aiAdrInflation]);

  const resetOccupancyToDefaults = useCallback(() => {
    setOccupancyOverrides(Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false));
    const def = findOperationalBenchmark(projectInfo);
    const y1 =
      def?.occupancyYear1 ?? (DUBAI_BUSINESS_HOTEL_DEFAULT_OCCUPANCY[0] ?? 68);
    const inc = def?.occupancyIncrementPa ?? occupancyIncrementPa ?? 0;
    const ramp = Array.from({ length: OPERATIONAL_ROOM_REVENUE_YEARS }, (_, i) =>
      Math.min(100, Math.max(0, y1 + inc * i))
    );
    setOccupancyIncrementPa(inc);
    setOccupancyValues(ramp);
    setOccupancyYear1(y1);
    logResetToBenchmark(
      CASH_INFLOWS_COMPONENT,
      HOTEL_STEP1_TITLE,
      HOTEL_STEP1_ROUTE,
      "Occupancy Year 1 (%)",
      y1
    );
    logResetToBenchmark(
      CASH_INFLOWS_COMPONENT,
      HOTEL_STEP1_TITLE,
      HOTEL_STEP1_ROUTE,
      "Occupancy % increment p.a.",
      inc
    );
    ramp.forEach((v, i) => {
      logResetToBenchmark(
        CASH_INFLOWS_COMPONENT,
        HOTEL_STEP1_TITLE,
        HOTEL_STEP1_ROUTE,
        `Occupancy Year ${i + 1} (%)`,
        v
      );
    });
  }, [occupancyIncrementPa, projectInfo]);

  const logAdrYear1 = useAuditLog(
    "operational.cashInflows.step1.adrYear1",
    `ADR Year 1 (${currencyCode})`,
    CASH_INFLOWS_COMPONENT,
    HOTEL_STEP1_TITLE,
    HOTEL_STEP1_ROUTE
  );
  const logAdrInflation = useAuditLog(
    "operational.cashInflows.step1.adrInflation",
    "ADR inflation (annual %)",
    CASH_INFLOWS_COMPONENT,
    HOTEL_STEP1_TITLE,
    HOTEL_STEP1_ROUTE
  );
  const logOccupancyYear1 = useAuditLog(
    "operational.cashInflows.step1.occupancyYear1",
    "Occupancy Year 1 (%)",
    CASH_INFLOWS_COMPONENT,
    HOTEL_STEP1_TITLE,
    HOTEL_STEP1_ROUTE
  );
  const logOccupancyIncrement = useAuditLog(
    "operational.cashInflows.step1.occupancyIncrementPa",
    "Occupancy % increment p.a.",
    CASH_INFLOWS_COMPONENT,
    HOTEL_STEP1_TITLE,
    HOTEL_STEP1_ROUTE
  );

  const benchmarkLoggedRef = useRef(false);
  useEffect(() => {
    if (benchmarkLoggedRef.current) return;
    benchmarkLoggedRef.current = true;
    logBenchmarkValues(
      CASH_INFLOWS_COMPONENT,
      HOTEL_STEP1_TITLE,
      HOTEL_STEP1_ROUTE,
      {
        numberOfRooms: {
          label: "Number of rooms (keys)",
          value: numberOfRooms,
        },
        adrYear1: {
          label: `ADR Year 1 (${currencyCode})`,
          value: adrYear1,
        },
        adrInflation: {
          label: "ADR inflation (annual %)",
          value: adrInflationRate,
        },
        occupancyYear1: {
          label: "Occupancy Year 1 (%)",
          value: occupancyYear1,
        },
        occupancyIncrementPa: {
          label: "Occupancy % increment p.a.",
          value: occupancyIncrementPa,
        },
      }
    );
  }, [
    adrInflationRate,
    adrYear1,
    currencyCode,
    numberOfRooms,
    occupancyIncrementPa,
    occupancyYear1,
  ]);

  const resetAdrToFormulaWithAudit = useCallback(() => {
    const next = buildDefaultAdrSeries(adrYear1, adrInflationRate);
    resetAdrToFormula();
    logResetToBenchmark(
      CASH_INFLOWS_COMPONENT,
      HOTEL_STEP1_TITLE,
      HOTEL_STEP1_ROUTE,
      "ADR series (reset to formula)",
      adrYear1
    );
    next.forEach((v, i) => {
      logResetToBenchmark(
        CASH_INFLOWS_COMPONENT,
        HOTEL_STEP1_TITLE,
        HOTEL_STEP1_ROUTE,
        `ADR Year ${i + 1} (${currencyCode})`,
        v
      );
    });
  }, [adrInflationRate, adrYear1, currencyCode, resetAdrToFormula]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-xl font-semibold text-white">
          Step 1 — Room Revenues
        </h2>
        <div className="text-sm text-slate-400">
          BENCHMARK &nbsp;{" "}
          <span suppressHydrationWarning>
            {mounted ? benchmarkLabel : "—"}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Adjust ADR inflation to roll forward Years 2–10; edit any year to lock
          that cell to your value. Manual cells use the same{" "}
          <span className="text-amber-400/90">amber border</span> as Component 1
          Step 8.
        </p>
        {mounted && hasAnyOverride ? (
          <p className="mt-3" suppressHydrationWarning>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
              Manual overrides
            </span>
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Keys / Rooms */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Total Keys / Rooms
          </label>
          <input
            type="number"
            value={projectInfo.hotelTotalKeys || 0}
            readOnly
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
            title="Locked: Defined in Component 1 Step 5 Building Configuration"
          />
          <p className="mt-1 text-xs text-amber-400">
            🔒 Locked: To change, go back to Component 1 Step 5
          </p>
          {fieldError("numberOfRooms") && (
            <p className="mt-1 text-sm text-red-400">
              {fieldError("numberOfRooms")}
            </p>
          )}
        </div>

        <div>
          <AiInput
            label={`ADR Year 1 (${currencyCode})`}
            value={adrYear1}
            onChange={(val) => {
              adrYear1ManualRef.current = true;
              setAdrYear1IsManual(true);
              const v = Math.max(0, Number(val) || 0);
              setAdrYear1(v);
              logAdrYear1(v);
            }}
            type="number"
            step={0.01}
            min={0}
            isAiGenerated={!!aiAdrYear1 && !adrYear1IsManual}
            isManualOverride={adrYear1IsManual}
          />
          {fieldError("adrYear1") && (
            <p className="mt-1 text-sm text-red-400">{fieldError("adrYear1")}</p>
          )}
        </div>

        <div>
          <AiInput
            label="ADR inflation (annual %)"
            value={adrInflationRate}
            onChange={(val) => {
              setAdrInflationIsManual(true);
              const v = Number(val) || 0;
              setAdrInflationRate(v);
              logAdrInflation(v);
            }}
            type="percentage"
            step={0.1}
            min={0}
            isAiGenerated={!!aiAdrInflation && !adrInflationIsManual}
            isManualOverride={adrInflationIsManual}
          />
          {fieldError("adrInflation") && (
            <p className="mt-1 text-sm text-red-400">
              {fieldError("adrInflation")}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Occupancy Year 1 (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={occupancyYear1}
            onChange={(e) => {
              const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
              occupancyYear1ManualRef.current = true;
              setOccupancyOverrides((o) => {
                const n = [...o];
                n[0] = false;
                return n;
              });
              setOccupancyYear1(v);
              logOccupancyYear1(v);
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {fieldError("occupancyYear1") && (
            <p className="mt-1 text-sm text-red-400">
              {fieldError("occupancyYear1")}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Occupancy % increment p.a.
          </label>
          <input
            type="number"
            step={0.1}
            value={occupancyIncrementPa}
            onChange={(e) => {
              const v = Number(e.target.value) || 0;
              occupancyIncManualRef.current = true;
              setOccupancyIncrementPa(v);
              logOccupancyIncrement(v);
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Auto-fills Years 2–10 unless you override a specific year.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={resetAdrToFormulaWithAudit}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Reset ADR to formula
        </button>
        <button
          type="button"
          onClick={resetAdrToBenchmark}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Reset ADR to benchmark
        </button>
        <button
          type="button"
          onClick={resetOccupancyToDefaults}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Reset occupancy to defaults
        </button>
        <p className="text-xs text-slate-500">
          ADR formula: Year <i>t</i> = Year 1 ADR × (1 + inflation%)
          <sup>t − 1</sup>
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80 text-left text-slate-400">
              <th className="px-3 py-3 font-medium">Year</th>
              <th className="px-3 py-3 font-medium">
                ADR ({currencyCode}){" "}
                <span className="block text-[10px] font-normal normal-case text-slate-500">
                  amber = override
                </span>
              </th>
              <th className="px-3 py-3 font-medium">
                Occ %{" "}
                <span className="block text-[10px] font-normal normal-case text-slate-500">
                  amber = override
                </span>
              </th>
              <th className="px-3 py-3 font-medium text-right">
                Room revenue ({currencyCode})
              </th>
              <th className="px-3 py-3 font-medium text-center">Notes</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: OPERATIONAL_ROOM_REVENUE_YEARS }, (_, i) => (
              <tr
                key={i}
                className="border-b border-slate-800/80 text-slate-200"
              >
                <td className="px-3 py-2 font-medium text-slate-300">{i + 1}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={adrValues[i] ?? ""}
                    suppressHydrationWarning
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      adrYear1ManualRef.current = true;
                      setAdrOverrides((o) => {
                        const n = [...o];
                        n[i] = i === 0 ? false : true;
                        return n;
                      });
                      setAdrValues((prev) => {
                        const n = [...prev];
                        n[i] = v;
                        return n;
                      });
                      if (i === 0) setAdrYear1(v);
                      logAuditChange({
                        id: `operational.cashInflows.step1.adrYear${i + 1}`,
                        label: `ADR Year ${i + 1} (${currencyCode})`,
                        value: v,
                        component: CASH_INFLOWS_COMPONENT,
                        step: HOTEL_STEP1_TITLE,
                        route: HOTEL_STEP1_ROUTE,
                      });
                    }}
                    className={`w-full min-w-[100px] ${overrideFieldClass(adrOverrides[i])}`}
                  />
                  {fieldError(`adr_${i}`) && (
                    <p className="text-xs text-red-400">
                      {fieldError(`adr_${i}`)}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={occupancyValues[i] ?? ""}
                    suppressHydrationWarning
                    onChange={(e) => {
                      const v = Math.min(
                        100,
                        Math.max(0, Number(e.target.value) || 0)
                      );
                      occupancyYear1ManualRef.current = true;
                      setOccupancyOverrides((o) => {
                        const n = [...o];
                        n[i] = i === 0 ? false : true;
                        return n;
                      });
                      setOccupancyValues((prev) => {
                        const n = [...prev];
                        n[i] = v;
                        return n;
                      });
                      if (i === 0) setOccupancyYear1(v);
                      logAuditChange({
                        id: `operational.cashInflows.step1.occupancyYear${i + 1}`,
                        label: `Occupancy Year ${i + 1} (%)`,
                        value: v,
                        component: CASH_INFLOWS_COMPONENT,
                        step: HOTEL_STEP1_TITLE,
                        route: HOTEL_STEP1_ROUTE,
                      });
                    }}
                    className={`w-full min-w-[80px] ${overrideFieldClass(occupancyOverrides[i])}`}
                  />
                  {fieldError(`occ_${i}`) && (
                    <p className="text-xs text-red-400">
                      {fieldError(`occ_${i}`)}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono text-emerald-400/95">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: currencyCode,
                    maximumFractionDigits: 0,
                  }).format(roomRevenue[i] ?? 0)}
                </td>
                <td className="px-3 py-2 text-center text-xs text-slate-500">
                  <span
                    className={
                      adrOverrides[i] ? "text-amber-400/90" : "text-slate-500"
                    }
                    suppressHydrationWarning
                  >
                    {adrOverrides[i] ? "ADR override" : "ADR auto"}
                  </span>
                  <br />
                  <span
                    className={
                      occupancyOverrides[i]
                        ? "text-amber-400/90"
                        : "text-slate-500"
                    }
                    suppressHydrationWarning
                  >
                    {occupancyOverrides[i]
                      ? "Occ override"
                      : i === 0
                        ? "Occ from Y1"
                        : "Occ default"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-600 bg-slate-800/60 text-sm font-semibold text-white">
              <td className="px-3 py-3" colSpan={3}>
                10-year total (room revenue)
              </td>
              <td className="px-3 py-3 text-right font-mono text-emerald-400">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: currencyCode,
                  maximumFractionDigits: 0,
                }).format(tenYearRoomRevenueTotal)}
              </td>
              <td className="px-3 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      <RoomRevenueBarChart data={chartData} currencyCode={currencyCode} />
    </div>
  );
}
