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
import { AiInput } from "@/components/ui/AiInput";
import { normalizeAiResearchData } from "@/lib/constants/aiPrompts";
import useFinModelStore, { type ProjectInfo } from "@/store/useFinModelStore";
import {
  buildDefaultBaseRentSeries,
  buildLeaseUpOccupancySeries,
  compoundRentForYearIndex,
  getRetailRevenueBenchmark,
  resolveRetailRevenueBenchmark,
} from "@/lib/benchmarks/retail-revenue";
import {
  baseRentRevenueToChartData,
  computeBaseRentRevenueSeries,
  OPERATIONAL_ROOM_REVENUE_YEARS,
  type RoomRevenueChartRow,
} from "@/lib/operational-cash-inflows-chart";
import type { OperationalRetailHoldSnapshot } from "@/lib/operational-pnl";
import { padOperationalYearSeries } from "./HotelRevenueStep";

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

export function getOperationalRetailHoldSnapshot():
  | OperationalRetailHoldSnapshot
  | undefined {
  return useFinModelStore.getState().operational?.retailHoldSnapshot;
}

export type RetailRevenueStepErrors = Record<string, string>;

export function validateRetailRevenueStep(
  snap: OperationalRetailHoldSnapshot | undefined
): RetailRevenueStepErrors {
  const next: RetailRevenueStepErrors = {};
  const glaSqft = snap?.glaSqft ?? 0;
  const rentValues = snap?.baseRentPerSqftValues ?? [];
  const occupancyValues = snap?.occupancyValues ?? [];
  const rentYear1 = rentValues[0] ?? 0;
  const occupancyYear1 = occupancyValues[0] ?? 0;

  if (!Number.isFinite(glaSqft) || glaSqft <= 0) {
    next.glaSqft = "GLA must be greater than 0 sqft.";
  }
  if (!Number.isFinite(rentYear1) || rentYear1 <= 0) {
    next.rentYear1 = "Year 1 base rent ($/sqft) must be greater than 0.";
  }
  if (
    !Number.isFinite(occupancyYear1) ||
    occupancyYear1 < 0 ||
    occupancyYear1 > 100
  ) {
    next.occupancyYear1 = "Year 1 leased occupancy must be between 0% and 100%.";
  }
  for (let i = 0; i < OPERATIONAL_ROOM_REVENUE_YEARS; i++) {
    const o = occupancyValues[i];
    if (!Number.isFinite(o) || o < 0 || o > 100) {
      next[`occ_${i}`] = `Year ${i + 1} leased % must be 0–100%.`;
    }
    const r = rentValues[i];
    if (!Number.isFinite(r) || r <= 0) {
      next[`rent_${i}`] = `Year ${i + 1} base rent must be greater than 0.`;
    }
  }
  return next;
}

/** Base rent revenue from persisted retail hold snapshot (for downstream steps). */
export function useRetailBaseRentFromStore(
  projectInfo: ProjectInfo,
  defaultGlaSqft = 0
) {
  const snap = useFinModelStore((s) => s.operational?.retailHoldSnapshot);
  return useMemo(() => {
    const bench = resolveRetailRevenueBenchmark(
      projectInfo.country || "",
      projectInfo.retailSegment || "",
      projectInfo.retailPositioning || ""
    );
    const glaSqft = snap?.glaSqft ?? defaultGlaSqft;
    const rentValues = padOperationalYearSeries(
      snap?.baseRentPerSqftValues,
      buildDefaultBaseRentSeries(bench.baseRentPsf, bench.rentEscalation)
    );
    const occupancyValues = padOperationalYearSeries(
      snap?.occupancyValues,
      buildLeaseUpOccupancySeries(
        bench.openingOccupancy,
        bench.stabilizedOccupancy,
        bench.leaseUpYears
      )
    );
    const baseRentRevenue = computeBaseRentRevenueSeries(
      glaSqft,
      rentValues,
      occupancyValues
    );
    const tenYearBaseRentTotal = baseRentRevenue.reduce((s, v) => s + (v || 0), 0);
    return {
      glaSqft,
      baseRentPerSqftValues: rentValues,
      occupancyValues,
      baseRentRevenue,
      tenYearBaseRentTotal,
    };
  }, [snap, projectInfo, defaultGlaSqft]);
}

function BaseRentBarChart({
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
        Enter GLA, base rent, and lease-up to see projected base rent revenue.
      </div>
    );
  }

  const maxR = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="h-80 w-full rounded-lg border border-slate-700/80 bg-slate-900/40 p-2">
      <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Projected base rent revenue by year ({currencyCode})
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

type RetailRevenueStepProps = {
  fieldError: (name: string) => string | undefined;
  /** Default GLA from Component 1 building BUA when unset. */
  defaultGlaSqft?: number;
};

export default function RetailRevenueStep({
  fieldError,
  defaultGlaSqft = 0,
}: RetailRevenueStepProps) {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational?.cashOutflows);

  // Extract AI research data for retail
  const aiC2 = useMemo(() => {
    const raw = cashOutflows?.aiResearchData;
    if (!raw) return undefined;
    const hasNested =
      !!raw.c2_operational?.step1_base_rent ||
      !!raw.c2_operational?.step2_other_income ||
      !!raw.c1_development?.construction_rates;
    if (!hasNested) {
      return (normalizeAiResearchData(raw) as any)?.c2_operational;
    }
    return raw.c2_operational;
  }, [cashOutflows?.aiResearchData]);

  // AI returns flat structure - check both nested and flat keys
  const aiBaseRent =
    aiC2?.step1_base_rent?.base_rent_year_1_psf ??
    aiC2?.baseRent0Rate ??
    aiC2?.baseRentRate ??
    aiC2?.base_rent_year_1_psf;

  const aiRentEscalation =
    aiC2?.step1_base_rent?.rent_escalation_pct ??
    aiC2?.rentEscalation ??
    aiC2?.rent_escalation_pct;

  const hasPhase2Ai = !!cashOutflows?.aiResearchData?.c2_operational;

  const currencyCode = projectInfo.currency || "AED";

  const revenueBenchmark = useMemo(
    () =>
      getRetailRevenueBenchmark(
        projectInfo.country || "UAE",
        projectInfo.retailSegment || "regional_mall",
        projectInfo.retailPositioning || "mid_market"
      ),
    [
      projectInfo.country,
      projectInfo.retailSegment,
      projectInfo.retailPositioning,
    ]
  );

  const resolvedBenchmark = useMemo(
    () =>
      resolveRetailRevenueBenchmark(
        projectInfo.country || "UAE",
        projectInfo.retailSegment || "regional_mall",
        projectInfo.retailPositioning || "mid_market"
      ),
    [
      projectInfo.country,
      projectInfo.retailSegment,
      projectInfo.retailPositioning,
    ]
  );

  const retailBenchmarkReady =
    !!projectInfo.retailSegment && !!projectInfo.retailPositioning;

  const profileKey = useMemo(
    () =>
      retailBenchmarkReady
        ? `${projectInfo.country}:${projectInfo.retailSegment}:${projectInfo.retailPositioning}`
        : null,
    [
      retailBenchmarkReady,
      projectInfo.country,
      projectInfo.retailSegment,
      projectInfo.retailPositioning,
    ]
  );
  const profileKeyPrevRef = useRef<string | null>(null);

  const [glaSqft, setGlaSqft] = useState(() => {
    const snap = getOperationalRetailHoldSnapshot();
    if (projectInfo.retailGLA) return projectInfo.retailGLA;
    if (snap?.glaSqft != null && snap.glaSqft > 0) return snap.glaSqft;
    return defaultGlaSqft > 0 ? defaultGlaSqft : 250_000;
  });

  useEffect(() => {
    if (projectInfo.retailGLA) {
      setGlaSqft(projectInfo.retailGLA);
    }
  }, [projectInfo.retailGLA]);

  useEffect(() => {
    if (projectInfo.retailGLA) return;
    if (defaultGlaSqft > 0 && glaSqft <= 0) {
      setGlaSqft(defaultGlaSqft);
    }
  }, [defaultGlaSqft, glaSqft, projectInfo.retailGLA]);

  const rentYear1ManualRef = useRef(false);
  const occupancyYear1ManualRef = useRef(false);
  const escalationManualRef = useRef(false);

  const [rentYear1, setRentYear1] = useState(() => {
    const snap = getOperationalRetailHoldSnapshot();
    if (snap?.baseRentPerSqftValues?.[0] != null) {
      return snap.baseRentPerSqftValues[0];
    }
    if (aiBaseRent) return aiBaseRent;
    return resolvedBenchmark.baseRentPsf;
  });

  const [rentEscalationPct, setRentEscalationPct] = useState(() => {
    const snap = getOperationalRetailHoldSnapshot();
    if (snap?.rentEscalationPct != null) return snap.rentEscalationPct;
    if (aiRentEscalation) return aiRentEscalation;
    return resolvedBenchmark.rentEscalation;
  });

  const [freeRentMonths, setFreeRentMonths] = useState(() => {
    const snap = getOperationalRetailHoldSnapshot();
    if (snap?.freeRentMonths != null) return snap.freeRentMonths;
    return resolvedBenchmark.freeRentMonths;
  });

  const [baseRentPerSqftValues, setBaseRentPerSqftValues] = useState<number[]>(
    () => {
      const snap = getOperationalRetailHoldSnapshot();
      const formula = buildDefaultBaseRentSeries(rentYear1, rentEscalationPct);
      return padOperationalYearSeries(snap?.baseRentPerSqftValues, formula);
    }
  );

  // Update state when AI data arrives (Phase 2 research)
  useEffect(() => {
    if (!aiBaseRent || rentYear1ManualRef.current) return;
    const snap = getOperationalRetailHoldSnapshot();
    if (snap?.baseRentPerSqftValues?.[0] != null) return;
    setRentYear1(aiBaseRent);
    setBaseRentPerSqftValues(
      buildDefaultBaseRentSeries(aiBaseRent, rentEscalationPct)
    );
  }, [aiBaseRent, rentEscalationPct]);

  useEffect(() => {
    if (!aiRentEscalation || escalationManualRef.current) return;
    const snap = getOperationalRetailHoldSnapshot();
    if (snap?.rentEscalationPct != null) return;
    setRentEscalationPct(aiRentEscalation);
    setBaseRentPerSqftValues(
      buildDefaultBaseRentSeries(rentYear1, aiRentEscalation)
    );
  }, [aiRentEscalation, rentYear1]);

  const [occupancyYear1, setOccupancyYear1] = useState(() => {
    const snap = getOperationalRetailHoldSnapshot();
    if (snap?.occupancyValues?.[0] != null) return snap.occupancyValues[0];
    return resolvedBenchmark.openingOccupancy;
  });

  const [stabilizedOccupancy, setStabilizedOccupancy] = useState(
    resolvedBenchmark.stabilizedOccupancy
  );
  const [leaseUpYears, setLeaseUpYears] = useState(
    resolvedBenchmark.leaseUpYears
  );

  const [occupancyValues, setOccupancyValues] = useState<number[]>(() => {
    const snap = getOperationalRetailHoldSnapshot();
    const ramp = buildLeaseUpOccupancySeries(
      occupancyYear1,
      stabilizedOccupancy,
      leaseUpYears
    );
    return padOperationalYearSeries(snap?.occupancyValues, ramp);
  });

  const [rentOverrides, setRentOverrides] = useState<boolean[]>(() => {
    const snap = getOperationalRetailHoldSnapshot();
    if (!snap?.baseRentPerSqftValues?.length) {
      return Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false);
    }
    const formula = buildDefaultBaseRentSeries(rentYear1, rentEscalationPct);
    return Array.from({ length: OPERATIONAL_ROOM_REVENUE_YEARS }, (_, i) => {
      if (i === 0) return false;
      const s = snap.baseRentPerSqftValues?.[i];
      if (s == null) return false;
      return Math.abs(Number(s) - Number(formula[i] ?? 0)) > 0.05;
    });
  });

  const [occupancyOverrides, setOccupancyOverrides] = useState<boolean[]>(() => {
    const snap = getOperationalRetailHoldSnapshot();
    if (!snap?.occupancyValues?.length) {
      return Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false);
    }
    const ramp = buildLeaseUpOccupancySeries(
      occupancyYear1,
      stabilizedOccupancy,
      leaseUpYears
    );
    return Array.from({ length: OPERATIONAL_ROOM_REVENUE_YEARS }, (_, i) => {
      if (i === 0) return false;
      const s = snap.occupancyValues?.[i];
      if (s == null) return false;
      return Math.abs(Number(s) - Number(ramp[i] ?? 0)) > 0.05;
    });
  });

  const [baseRentRevenue, setBaseRentRevenue] = useState<number[]>(() =>
    Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(0)
  );

  useEffect(() => {
    const snap = getOperationalRetailHoldSnapshot();
    const hasPersisted =
      !!snap?.baseRentPerSqftValues?.length || !!snap?.occupancyValues?.length;
    const profileChanged =
      profileKey != null &&
      profileKeyPrevRef.current != null &&
      profileKeyPrevRef.current !== profileKey;
    profileKeyPrevRef.current = profileKey;

    if (hasPersisted && !profileChanged) return;

    const b = resolvedBenchmark;
    rentYear1ManualRef.current = false;
    occupancyYear1ManualRef.current = false;
    escalationManualRef.current = false;
    setRentOverrides(Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false));
    setOccupancyOverrides(Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false));
    setRentYear1(b.baseRentPsf);
    setRentEscalationPct(b.rentEscalation);
    setOccupancyYear1(b.openingOccupancy);
    setStabilizedOccupancy(b.stabilizedOccupancy);
    setLeaseUpYears(b.leaseUpYears);
    setFreeRentMonths(b.freeRentMonths);
    setBaseRentPerSqftValues(
      buildDefaultBaseRentSeries(b.baseRentPsf, b.rentEscalation)
    );
    setOccupancyValues(
      buildLeaseUpOccupancySeries(
        b.openingOccupancy,
        b.stabilizedOccupancy,
        b.leaseUpYears
      )
    );
  }, [resolvedBenchmark, profileKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const occ = occupancyValues.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS);
      const revenue = baseRentRevenue.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS);
      const prev = getOperationalRetailHoldSnapshot();
      useFinModelStore.getState().updateRetailHoldSnapshot(
        {
          ...prev,
          glaSqft,
          rentEscalationPct,
          baseRentPerSqftValues: baseRentPerSqftValues.slice(
            0,
            OPERATIONAL_ROOM_REVENUE_YEARS
          ),
          occupancyValues: occ,
          effectiveLeasedValues: occ.map((pct) =>
            Math.round((glaSqft * pct) / 100)
          ),
          revenueValues: revenue,
          freeRentMonths,
        },
        "operational"
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [
    glaSqft,
    rentEscalationPct,
    baseRentPerSqftValues,
    occupancyValues,
    baseRentRevenue,
    freeRentMonths,
  ]);

  useEffect(() => {
    setBaseRentPerSqftValues((prev) => {
      const next = [...prev];
      next[0] = rentYear1;
      for (let i = 0; i < OPERATIONAL_ROOM_REVENUE_YEARS; i++) {
        if (i !== 0 && !rentOverrides[i]) {
          next[i] = compoundRentForYearIndex(
            rentYear1,
            rentEscalationPct,
            i
          );
        }
      }
      while (next.length < OPERATIONAL_ROOM_REVENUE_YEARS) {
        next.push(
          compoundRentForYearIndex(
            rentYear1,
            rentEscalationPct,
            next.length
          )
        );
      }
      return next.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS);
    });
  }, [rentYear1, rentEscalationPct, rentOverrides]);

  useEffect(() => {
    setOccupancyValues((prev) => {
      const ramp = buildLeaseUpOccupancySeries(
        occupancyYear1,
        stabilizedOccupancy,
        leaseUpYears
      );
      const next = [...prev];
      for (let i = 0; i < OPERATIONAL_ROOM_REVENUE_YEARS; i++) {
        if (occupancyOverrides[i]) continue;
        next[i] = ramp[i] ?? next[i];
      }
      next[0] = occupancyYear1;
      return next;
    });
  }, [
    occupancyYear1,
    stabilizedOccupancy,
    leaseUpYears,
    occupancyOverrides,
  ]);

  useEffect(() => {
    setBaseRentRevenue(
      computeBaseRentRevenueSeries(
        glaSqft,
        baseRentPerSqftValues,
        occupancyValues
      )
    );
  }, [glaSqft, baseRentPerSqftValues, occupancyValues]);

  const chartData = useMemo(
    () => baseRentRevenueToChartData(baseRentRevenue),
    [baseRentRevenue]
  );

  const tenYearBaseRentTotal = useMemo(
    () => baseRentRevenue.reduce((s, v) => s + (v || 0), 0),
    [baseRentRevenue]
  );

  const hasAnyOverride = useMemo(
    () => rentOverrides.some(Boolean) || occupancyOverrides.some(Boolean),
    [rentOverrides, occupancyOverrides]
  );

  const resetRentToAiBenchmark = useCallback(() => {
    const newRentYear1 = aiBaseRent ?? resolvedBenchmark.baseRentPsf;
    const newRentEscalation =
      aiRentEscalation ?? resolvedBenchmark.rentEscalation;

    rentYear1ManualRef.current = false;
    escalationManualRef.current = false;

    setRentYear1(newRentYear1);
    setRentEscalationPct(newRentEscalation);
    setRentOverrides(Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false));
    setBaseRentPerSqftValues(
      buildDefaultBaseRentSeries(newRentYear1, newRentEscalation)
    );
  }, [aiBaseRent, aiRentEscalation, resolvedBenchmark]);

  const resetRentToFormula = useCallback(() => {
    const b = revenueBenchmark ?? resolvedBenchmark;
    rentYear1ManualRef.current = false;
    escalationManualRef.current = false;
    setRentOverrides(Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false));
    setRentYear1(b.baseRentPsf);
    setRentEscalationPct(b.rentEscalation);
    setBaseRentPerSqftValues(
      buildDefaultBaseRentSeries(b.baseRentPsf, b.rentEscalation)
    );
  }, [revenueBenchmark, resolvedBenchmark]);

  const resetLeaseUpToDefaults = useCallback(() => {
    if (!revenueBenchmark) return;
    occupancyYear1ManualRef.current = false;
    setOccupancyOverrides(Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false));
    const b = revenueBenchmark;
    setOccupancyYear1(b.openingOccupancy);
    setStabilizedOccupancy(b.stabilizedOccupancy);
    setLeaseUpYears(b.leaseUpYears);
    setFreeRentMonths(b.freeRentMonths);
    setOccupancyValues(
      buildLeaseUpOccupancySeries(
        b.openingOccupancy,
        b.stabilizedOccupancy,
        b.leaseUpYears
      )
    );
  }, [revenueBenchmark]);

  const applyProfileDefaults = useCallback(() => {
    const b = resolvedBenchmark;
    rentYear1ManualRef.current = false;
    occupancyYear1ManualRef.current = false;
    escalationManualRef.current = false;
    setRentOverrides(Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false));
    setOccupancyOverrides(Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false));
    setRentYear1(b.baseRentPsf);
    setRentEscalationPct(b.rentEscalation);
    setOccupancyYear1(b.openingOccupancy);
    setStabilizedOccupancy(b.stabilizedOccupancy);
    setLeaseUpYears(b.leaseUpYears);
    setFreeRentMonths(b.freeRentMonths);
    setBaseRentPerSqftValues(
      buildDefaultBaseRentSeries(b.baseRentPsf, b.rentEscalation)
    );
    setOccupancyValues(
      buildLeaseUpOccupancySeries(
        b.openingOccupancy,
        b.stabilizedOccupancy,
        b.leaseUpYears
      )
    );
  }, [resolvedBenchmark]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-xl font-semibold text-white">
          Step 1 — Base Rent &amp; Lease-Up
        </h2>
        {retailBenchmarkReady ? (
          <div className="mb-6 border-b border-slate-700 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  BENCHMARK
                </span>
                <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
                  <span className="text-xs text-slate-300">
                    Retail ·{" "}
                    {(projectInfo.retailSegment || "—")
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}{" "}
                    ·{" "}
                    {(projectInfo.retailPositioning || "—")
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}{" "}
                    ·{" "}
                    {projectInfo.country === "United Arab Emirates"
                      ? "UAE"
                      : projectInfo.country || "—"}
                  </span>
                </div>
                {hasAnyOverride && (
                  <div className="rounded-full border border-amber-600/50 bg-amber-900/30 px-3 py-1">
                    <span className="text-xs text-amber-400">Manual overrides</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={resetRentToAiBenchmark}
                className="text-xs font-medium text-emerald-400 underline-offset-2 hover:text-emerald-300 hover:underline"
              >
                Reset to benchmark
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-400/90">
            Complete Component 1 Step 4 (retail segment &amp; positioning) for
            benchmark suggestions.
          </p>
        )}
        <p className="mt-2 text-sm text-slate-400">
          Model contracted base rent on GLA with a lease-up ramp to stabilized
          occupancy. Rent escalation rolls forward Years 2–10 unless you override
          a cell (<span className="text-amber-400/90">amber border</span>).
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Gross Leasable Area (GLA) (sqft)
          </label>
          <input
            type="number"
            value={projectInfo.retailGLA || 0}
            readOnly
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
            title="Locked: Defined in Component 1 Step 5 Building Configuration"
          />
          <p className="mt-1 text-xs text-amber-400">
            🔒 Locked: To change, go back to Component 1 Step 5
          </p>
          {fieldError("glaSqft") && (
            <p className="mt-1 text-sm text-red-400">{fieldError("glaSqft")}</p>
          )}
        </div>

        <div>
          <AiInput
            label={`Base rent Year 1 (${currencyCode}/sqft p.a.)`}
            value={rentYear1 || aiBaseRent || resolvedBenchmark.baseRentPsf || 0}
            onChange={(val) => {
              rentYear1ManualRef.current = true;
              setRentYear1(Math.max(0, Number(val) || 0));
            }}
            type="number"
            step={0.01}
            min={0}
            isAiGenerated={hasPhase2Ai && !!aiBaseRent && !rentYear1ManualRef.current}
            isManualOverride={rentYear1ManualRef.current}
          />
          {fieldError("rentYear1") && (
            <p className="mt-1 text-sm text-red-400">{fieldError("rentYear1")}</p>
          )}
        </div>

        <div>
          <AiInput
            label="Rent escalation (annual %)"
            value={rentEscalationPct || aiRentEscalation || resolvedBenchmark.rentEscalation || 0}
            onChange={(val) => {
              escalationManualRef.current = true;
              setRentEscalationPct(Number(val) || 0);
            }}
            type="percentage"
            step={0.1}
            min={0}
            isAiGenerated={
              hasPhase2Ai && !!aiRentEscalation && !escalationManualRef.current
            }
            isManualOverride={escalationManualRef.current}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Leased occupancy Year 1 (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={occupancyYear1}
            onChange={(e) => {
              occupancyYear1ManualRef.current = true;
              const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
              setOccupancyOverrides((o) => {
                const n = [...o];
                n[0] = false;
                return n;
              });
              setOccupancyYear1(v);
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
            Stabilized leased occupancy (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={stabilizedOccupancy}
            onChange={(e) =>
              setStabilizedOccupancy(
                Math.min(100, Math.max(0, Number(e.target.value) || 0))
              )
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Lease-up period (years)
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={leaseUpYears}
            onChange={(e) =>
              setLeaseUpYears(
                Math.min(10, Math.max(1, Math.round(Number(e.target.value) || 1)))
              )
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Linear ramp from Year 1 to stabilized over this horizon.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={resetRentToFormula}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Reset rent to formula
        </button>
        <button
          type="button"
          onClick={resetLeaseUpToDefaults}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Reset lease-up to defaults
        </button>
        <p className="text-xs text-slate-500">
          Base rent Year <i>t</i> = Year 1 × (1 + escalation%)
          <sup>t − 1</sup>; revenue = GLA × rent × leased %
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80 text-left text-slate-400">
              <th className="px-3 py-3 font-medium">Year</th>
              <th className="px-3 py-3 font-medium">
                Base rent ({currencyCode}/sqft){" "}
                <span className="block text-[10px] font-normal normal-case text-slate-500">
                  amber = override
                </span>
              </th>
              <th className="px-3 py-3 font-medium">
                Leased %{" "}
                <span className="block text-[10px] font-normal normal-case text-slate-500">
                  amber = override
                </span>
              </th>
              <th className="px-3 py-3 font-medium text-right">
                Base rent revenue ({currencyCode})
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
                    value={baseRentPerSqftValues[i] ?? ""}
                    suppressHydrationWarning
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      rentYear1ManualRef.current = true;
                      setRentOverrides((o) => {
                        const n = [...o];
                        n[i] = i === 0 ? false : true;
                        return n;
                      });
                      setBaseRentPerSqftValues((prev) => {
                        const n = [...prev];
                        n[i] = v;
                        return n;
                      });
                      if (i === 0) setRentYear1(v);
                    }}
                    className={`w-full min-w-[100px] ${overrideFieldClass(rentOverrides[i])}`}
                  />
                  {fieldError(`rent_${i}`) && (
                    <p className="text-xs text-red-400">
                      {fieldError(`rent_${i}`)}
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
                  }).format(baseRentRevenue[i] ?? 0)}
                </td>
                <td className="px-3 py-2 text-center text-xs text-slate-500">
                  <span
                    className={
                      rentOverrides[i] ? "text-amber-400/90" : "text-slate-500"
                    }
                    suppressHydrationWarning
                  >
                    {rentOverrides[i] ? "Rent override" : "Rent auto"}
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
                      ? "Lease override"
                      : i === 0
                        ? "From Y1"
                        : "Lease-up"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-600 bg-slate-800/60 text-sm font-semibold text-white">
              <td className="px-3 py-3" colSpan={3}>
                10-year total (base rent revenue)
              </td>
              <td className="px-3 py-3 text-right font-mono text-emerald-400">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: currencyCode,
                  maximumFractionDigits: 0,
                }).format(tenYearBaseRentTotal)}
              </td>
              <td className="px-3 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      <BaseRentBarChart data={chartData} currencyCode={currencyCode} />
    </div>
  );
}
