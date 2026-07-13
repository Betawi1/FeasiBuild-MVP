"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BenchmarkHeader from "@/components/BenchmarkHeader";
import {
  getResidentialBenchmark,
  getResidentialBenchmarkProfileKey,
} from "@/lib/benchmarks/residential-construction-costs";
import {
  computeResidentialRevenueRows,
  type ResidentialRevenueInputs,
} from "@/lib/residential-revenue-calculations";
import {
  defaultOperationalResidentialHoldSnapshot,
  snapFinite,
  snapPositive,
  type OperationalResidentialHoldSnapshot,
} from "@/lib/operational-pnl";
import useFinModelStore from "@/store/useFinModelStore";

const inputBase =
  "w-full rounded bg-slate-900 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

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

/** Avoid SSR/client mismatch on computed table cells (server renders before store hydrates). */
function formatMillions(amount: number, ready: boolean): string {
  return ready ? (amount / 1_000_000).toFixed(2) : "0.00";
}

function formatMillionsPreScaled(millions: number, ready: boolean): string {
  return ready ? millions.toFixed(2) : "0.00";
}

export function getOperationalResidentialHoldSnapshot():
  | OperationalResidentialHoldSnapshot
  | undefined {
  return useFinModelStore.getState().operational?.residentialHoldSnapshot;
}

export type ResidentialRevenueStepErrors = Record<string, string>;

export function validateResidentialRevenueStep(
  snap: OperationalResidentialHoldSnapshot | undefined
): ResidentialRevenueStepErrors {
  const next: ResidentialRevenueStepErrors = {};
  if (!snap) {
    next.residentialGla = "Residential GLA must be greater than 0 sqft.";
    return next;
  }
  if (!Number.isFinite(snap.residentialGlaSqft) || snap.residentialGlaSqft <= 0) {
    next.residentialGla = "Residential GLA must be greater than 0 sqft.";
  }
  if (
    !Number.isFinite(snap.residentialRentPsfYear1) ||
    snap.residentialRentPsfYear1 <= 0
  ) {
    next.residentialRentPsf =
      "Year 1 blended residential rent ($/sqft) must be greater than 0.";
  }
  const pctChecks: Array<{
    key: keyof ResidentialRevenueStepErrors;
    val: number;
    label: string;
  }> = [
    {
      key: "residentialLeasedOpening",
      val: snap.residentialLeasedOpeningPct,
      label: "Residential opening leased %",
    },
    {
      key: "residentialLeasedTarget",
      val: snap.residentialLeasedTargetPct,
      label: "Residential target leased %",
    },
    {
      key: "residentialVacancyRate",
      val: snap.residentialVacancyRatePct,
      label: "Vacancy rate",
    },
    {
      key: "residentialBadDebtRate",
      val: snap.residentialBadDebtRatePct,
      label: "Bad debt rate",
    },
  ];
  for (const { key, val, label } of pctChecks) {
    if (!Number.isFinite(val) || val < 0 || val > 100) {
      next[key] = `${label} must be between 0% and 100%.`;
    }
  }
  if (
    snap.retailGlaSqft > 0 &&
    (!Number.isFinite(snap.retailRentPsfYear1) || snap.retailRentPsfYear1 <= 0)
  ) {
    next.retailRentPsf = "Year 1 retail rent ($/sqft) must be greater than 0.";
  }
  return next;
}

type ResidentialRevenueStepProps = {
  fieldError: (name: string) => string | undefined;
  defaultResidentialGlaSqft?: number;
  defaultRetailGlaSqft?: number;
  onRegisterPersist?: (persist: (() => void) | null) => void;
};

const DEFAULT_RETAIL_RENT_PSF = 300;
const DEFAULT_RETAIL_OPENING = 50;
const DEFAULT_RETAIL_TARGET = 95;
const DEFAULT_RETAIL_LEASE_UP = 1.5;
const DEFAULT_RETAIL_FREE_RENT = 3;
const DEFAULT_VACANCY = 5;
const DEFAULT_BAD_DEBT = 2;

export default function ResidentialRevenueStep({
  fieldError,
  defaultResidentialGlaSqft = 200_000,
  defaultRetailGlaSqft = 50_000,
  onRegisterPersist,
}: ResidentialRevenueStepProps) {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const currencyCode = projectInfo.currency || "AED";
  const updateResidentialHoldSnapshot = useFinModelStore(
    (s) => s.updateResidentialHoldSnapshot
  );

  const benchmark = useMemo(
    () =>
      getResidentialBenchmark(
        projectInfo.country || "UAE",
        projectInfo.residentialSegment || "high_rise",
        projectInfo.residentialPositioning || "grade_a",
        projectInfo.residentialFurnishingLevel || "unfurnished",
        projectInfo.residentialIsServicedApartment || false
      ),
    [
      projectInfo.country,
      projectInfo.residentialSegment,
      projectInfo.residentialPositioning,
      projectInfo.residentialFurnishingLevel,
      projectInfo.residentialIsServicedApartment,
    ]
  );

  const profileKey = useMemo(() => {
    if (!projectInfo.residentialSegment || !projectInfo.residentialPositioning) {
      return null;
    }
    return getResidentialBenchmarkProfileKey(
      projectInfo.country || "UAE",
      projectInfo.residentialSegment,
      projectInfo.residentialPositioning,
      projectInfo.residentialFurnishingLevel || "unfurnished",
      projectInfo.residentialIsServicedApartment || false
    );
  }, [
    projectInfo.country,
    projectInfo.residentialSegment,
    projectInfo.residentialPositioning,
    projectInfo.residentialFurnishingLevel,
    projectInfo.residentialIsServicedApartment,
  ]);

  const profileKeyPrevRef = useRef<string | null>(null);
  const snap = getOperationalResidentialHoldSnapshot();

  const defaultLeaseUpMonths = Math.round((benchmark?.leaseUpYears ?? 2.5) * 12);

  const [residentialGla, setResidentialGla] = useState(() => {
    if (projectInfo.residentialGLA) return projectInfo.residentialGLA;
    return snapPositive(snap?.residentialGlaSqft, defaultResidentialGlaSqft);
  });
  const [retailGla, setRetailGla] = useState(
    () => snapPositive(snap?.retailGlaSqft, defaultRetailGlaSqft)
  );

  const [residentialRentPsf, setResidentialRentPsf] = useState(
    () =>
      snapPositive(snap?.residentialRentPsfYear1, benchmark?.blendedRentPsf ?? 180)
  );
  const [residentialEscalation, setResidentialEscalation] = useState(
    () =>
      snapFinite(
        snap?.residentialRentEscalationPct,
        benchmark?.rentEscalation ?? 3
      )
  );
  const [residentialLeasedOpening, setResidentialLeasedOpening] = useState(
    () =>
      snapFinite(
        snap?.residentialLeasedOpeningPct,
        benchmark?.openingOccupancy ?? 30
      )
  );
  const [residentialLeasedTarget, setResidentialLeasedTarget] = useState(
    () =>
      snapFinite(
        snap?.residentialLeasedTargetPct,
        benchmark?.stabilizedOccupancy ?? 90
      )
  );
  const [residentialLeaseUpMonths, setResidentialLeaseUpMonths] = useState(
    () =>
      snapFinite(
        snap?.residentialLeaseUpMonths,
        defaultLeaseUpMonths
      )
  );
  const [residentialVacancyRate, setResidentialVacancyRate] = useState(
    () => snapFinite(snap?.residentialVacancyRatePct, DEFAULT_VACANCY)
  );
  const [residentialBadDebtRate, setResidentialBadDebtRate] = useState(
    () => snapFinite(snap?.residentialBadDebtRatePct, DEFAULT_BAD_DEBT)
  );

  const [retailRentPsf, setRetailRentPsf] = useState(
    () => snapPositive(snap?.retailRentPsfYear1, DEFAULT_RETAIL_RENT_PSF)
  );
  const [retailEscalation, setRetailEscalation] = useState(
    () => snapFinite(snap?.retailRentEscalationPct, 3)
  );
  const [retailLeasedOpening, setRetailLeasedOpening] = useState(
    () => snapFinite(snap?.retailLeasedOpeningPct, DEFAULT_RETAIL_OPENING)
  );
  const [retailLeasedTarget, setRetailLeasedTarget] = useState(
    () => snapFinite(snap?.retailLeasedTargetPct, DEFAULT_RETAIL_TARGET)
  );
  const [retailLeaseUpYears, setRetailLeaseUpYears] = useState(
    () => snapFinite(snap?.retailLeaseUpYears, DEFAULT_RETAIL_LEASE_UP)
  );
  const [retailFreeRentMonths, setRetailFreeRentMonths] = useState(
    () => snapFinite(snap?.retailFreeRentMonths, DEFAULT_RETAIL_FREE_RENT)
  );

  const [includePercentageRent, setIncludePercentageRent] = useState(
    () => snap?.includePercentageRent ?? false
  );
  const [retailSalesPsf, setRetailSalesPsf] = useState(
    () => snapPositive(snap?.retailSalesPsfYear1, 4000)
  );
  const [retailSalesGrowth, setRetailSalesGrowth] = useState(
    () => snapFinite(snap?.retailSalesGrowthPct, 3)
  );
  const [percentageRentRate, setPercentageRentRate] = useState(
    () => snapPositive(snap?.percentageRentRate, 5)
  );
  const [breakpointType, setBreakpointType] = useState<"natural" | "fixed">(
    () => snap?.breakpointType ?? "natural"
  );
  const [breakpointMultiple, setBreakpointMultiple] = useState(
    () => snapFinite(snap?.breakpointMultiple, 1)
  );
  const [fixedBreakpointPsf, setFixedBreakpointPsf] = useState(
    () => snapPositive(snap?.fixedBreakpointPsf, 500)
  );

  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    () => snap?.fieldOverrides ?? {}
  );
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Record<string, number>>
  >(() => snap?.manualYearValues ?? {});

  useEffect(() => {
    if (projectInfo.residentialGLA) {
      setResidentialGla(projectInfo.residentialGLA);
    }
  }, [projectInfo.residentialGLA]);

  useEffect(() => {
    if (projectInfo.residentialGLA) return;
    if (defaultResidentialGlaSqft > 0 && residentialGla <= 0) {
      setResidentialGla(defaultResidentialGlaSqft);
    }
  }, [defaultResidentialGlaSqft, residentialGla, projectInfo.residentialGLA]);

  useEffect(() => {
    if (defaultRetailGlaSqft > 0 && retailGla <= 0) {
      setRetailGla(defaultRetailGlaSqft);
    }
  }, [defaultRetailGlaSqft, retailGla]);

  useEffect(() => {
    if (!benchmark || !profileKey) return;
    const profileChanged =
      profileKeyPrevRef.current != null &&
      profileKeyPrevRef.current !== profileKey;
    profileKeyPrevRef.current = profileKey;
    if (!profileChanged && (snap?.residentialRentPsfYear1 ?? 0) > 0) return;

    setOverrides({});
    setManualYearValues({});
    setResidentialRentPsf(benchmark.blendedRentPsf);
    setResidentialEscalation(benchmark.rentEscalation);
    setResidentialLeasedOpening(benchmark.openingOccupancy);
    setResidentialLeasedTarget(benchmark.stabilizedOccupancy);
    setResidentialLeaseUpMonths(Math.round(benchmark.leaseUpYears * 12));
  }, [benchmark, profileKey, snap?.residentialRentPsfYear1]);

  const revenueInputs: ResidentialRevenueInputs = useMemo(
    () => ({
      residentialGla,
      residentialRentPsf,
      residentialEscalation,
      residentialLeasedOpening,
      residentialLeasedTarget,
      residentialLeaseUpMonths,
      residentialVacancyRate,
      residentialBadDebtRate,
      retailGla,
      retailRentPsf,
      retailEscalation,
      retailLeasedOpening,
      retailLeasedTarget,
      retailLeaseUpYears,
      retailFreeRentMonths,
      includePercentageRent,
      retailSalesPsf,
      retailSalesGrowth,
      percentageRentRate,
      breakpointType,
      breakpointMultiple,
      fixedBreakpointPsf,
      manualYearValues,
    }),
    [
      residentialGla,
      residentialRentPsf,
      residentialEscalation,
      residentialLeasedOpening,
      residentialLeasedTarget,
      residentialLeaseUpMonths,
      residentialVacancyRate,
      residentialBadDebtRate,
      retailGla,
      retailRentPsf,
      retailEscalation,
      retailLeasedOpening,
      retailLeasedTarget,
      retailLeaseUpYears,
      retailFreeRentMonths,
      includePercentageRent,
      retailSalesPsf,
      retailSalesGrowth,
      percentageRentRate,
      breakpointType,
      breakpointMultiple,
      fixedBreakpointPsf,
      manualYearValues,
    ]
  );

  const tableRows = useMemo(
    () => computeResidentialRevenueRows(revenueInputs),
    [revenueInputs]
  );

  const persistSnapshot = useCallback(() => {
    const prev = getOperationalResidentialHoldSnapshot();
    updateResidentialHoldSnapshot(
      {
        ...defaultOperationalResidentialHoldSnapshot,
        ...prev,
        residentialGlaSqft: residentialGla,
        residentialRentPsfYear1: residentialRentPsf,
        residentialRentEscalationPct: residentialEscalation,
        residentialLeasedOpeningPct: residentialLeasedOpening,
        residentialLeasedTargetPct: residentialLeasedTarget,
        residentialLeaseUpMonths,
        residentialVacancyRatePct: residentialVacancyRate,
        residentialBadDebtRatePct: residentialBadDebtRate,
        residentialLeasedPctValues: tableRows.map((r) => r.residentialLeasedPct),
        residentialEffectiveOccupancyValues: tableRows.map(
          (r) => r.residentialEffectiveOccupancy
        ),
        residentialRentValues: tableRows.map((r) => r.residentialRevenue),
        retailGlaSqft: retailGla,
        retailRentPsfYear1: retailRentPsf,
        retailRentEscalationPct: retailEscalation,
        retailLeasedOpeningPct: retailLeasedOpening,
        retailLeasedTargetPct: retailLeasedTarget,
        retailLeaseUpYears,
        retailFreeRentMonths,
        retailLeasedPctValues: tableRows.map((r) => r.retailLeasedPct),
        retailMinRentValues: tableRows.map((r) => r.retailMinRent),
        includePercentageRent,
        retailSalesPsfYear1: retailSalesPsf,
        retailSalesGrowthPct: retailSalesGrowth,
        percentageRentRate,
        breakpointType,
        breakpointMultiple,
        fixedBreakpointPsf,
        percentageRentValues: tableRows.map((r) => r.percentageRent),
        totalBaseRentValues: tableRows.map((r) => r.totalBaseRent),
        fieldOverrides: overrides,
        manualYearValues,
      },
      "operational"
    );
  }, [
    residentialGla,
    residentialRentPsf,
    residentialEscalation,
    residentialLeasedOpening,
    residentialLeasedTarget,
    residentialLeaseUpMonths,
    residentialVacancyRate,
    residentialBadDebtRate,
    retailGla,
    retailRentPsf,
    retailEscalation,
    retailLeasedOpening,
    retailLeasedTarget,
    retailLeaseUpYears,
    retailFreeRentMonths,
    includePercentageRent,
    retailSalesPsf,
    retailSalesGrowth,
    percentageRentRate,
    breakpointType,
    breakpointMultiple,
    fixedBreakpointPsf,
    overrides,
    manualYearValues,
    tableRows,
    updateResidentialHoldSnapshot,
  ]);

  useEffect(() => {
    const timer = setTimeout(persistSnapshot, 300);
    return () => clearTimeout(timer);
  }, [persistSnapshot]);

  useEffect(() => {
    if (!onRegisterPersist) return;
    onRegisterPersist(persistSnapshot);
    return () => onRegisterPersist(null);
  }, [onRegisterPersist, persistSnapshot]);

  const handleResetResidential = useCallback(() => {
    if (!benchmark) return;
    setOverrides((prev) => ({ ...prev, residential: false }));
    setResidentialRentPsf(benchmark.blendedRentPsf);
    setResidentialEscalation(benchmark.rentEscalation);
    setResidentialLeasedOpening(benchmark.openingOccupancy);
    setResidentialLeasedTarget(benchmark.stabilizedOccupancy);
    setResidentialLeaseUpMonths(Math.round(benchmark.leaseUpYears * 12));
    setResidentialVacancyRate(DEFAULT_VACANCY);
    setResidentialBadDebtRate(DEFAULT_BAD_DEBT);
  }, [benchmark]);

  const handleResetRetail = useCallback(() => {
    setOverrides((prev) => ({ ...prev, retail: false }));
    setRetailRentPsf(DEFAULT_RETAIL_RENT_PSF);
    setRetailEscalation(3);
    setRetailLeasedOpening(DEFAULT_RETAIL_OPENING);
    setRetailLeasedTarget(DEFAULT_RETAIL_TARGET);
    setRetailLeaseUpYears(DEFAULT_RETAIL_LEASE_UP);
    setRetailFreeRentMonths(DEFAULT_RETAIL_FREE_RENT);
  }, []);

  const handleResetPercentageRent = useCallback(() => {
    setOverrides((prev) => ({ ...prev, percentageRent: false }));
    setRetailSalesPsf(4000);
    setRetailSalesGrowth(3);
    setPercentageRentRate(5);
    setBreakpointType("natural");
    setBreakpointMultiple(1);
    setFixedBreakpointPsf(500);
  }, []);

  const handleResetAll = useCallback(() => {
    setOverrides({});
    setManualYearValues({});
    handleResetResidential();
    handleResetRetail();
    handleResetPercentageRent();
  }, [handleResetResidential, handleResetRetail, handleResetPercentageRent]);

  const handleFieldChange = useCallback((field: string, value: number) => {
    const setters: Record<string, (v: number) => void> = {
      residentialGla: setResidentialGla,
      residentialRentPsf: setResidentialRentPsf,
      residentialEscalation: setResidentialEscalation,
      residentialLeasedOpening: setResidentialLeasedOpening,
      residentialLeasedTarget: setResidentialLeasedTarget,
      residentialLeaseUpMonths: setResidentialLeaseUpMonths,
      residentialVacancyRate: setResidentialVacancyRate,
      residentialBadDebtRate: setResidentialBadDebtRate,
      retailGla: setRetailGla,
      retailRentPsf: setRetailRentPsf,
      retailEscalation: setRetailEscalation,
      retailLeasedOpening: setRetailLeasedOpening,
      retailLeasedTarget: setRetailLeasedTarget,
      retailLeaseUpYears: setRetailLeaseUpYears,
      retailFreeRentMonths: setRetailFreeRentMonths,
      retailSalesPsf: setRetailSalesPsf,
      retailSalesGrowth: setRetailSalesGrowth,
      percentageRentRate: setPercentageRentRate,
      breakpointMultiple: setBreakpointMultiple,
      fixedBreakpointPsf: setFixedBreakpointPsf,
    };
    const setter = setters[field];
    if (!setter) return;
    setter(value);
    const section =
      field.startsWith("residential") && field !== "residentialGla"
        ? "residential"
        : field.startsWith("retail") && !field.includes("Sales")
        ? "retail"
        : "percentageRent";
    setOverrides((prev) => ({ ...prev, [section]: true, [field]: true }));
  }, []);

  const handleCellOverride = useCallback(
    (year: number, stream: string, value: number) => {
      setManualYearValues((prev) => ({
        ...prev,
        [year]: { ...prev[year], [stream]: value },
      }));
    },
    []
  );

  const chartData = useMemo(
    () =>
      tableRows.map((row) => ({
        year: `Y${row.year}`,
        "Residential Rent": row.residentialRevenueM,
        "Retail Min Rent": row.retailMinRentM,
        "Retail % Rent": row.percentageRentM,
      })),
    [tableRows]
  );

  const hasManualOverride =
    Object.values(overrides).some(Boolean) ||
    Object.keys(manualYearValues).length > 0;

  const residentialBenchmarkReady =
    !!projectInfo.residentialSegment &&
    !!projectInfo.residentialPositioning &&
    !!benchmark;

  const retailY1EffectiveLeased = useMemo(
    () => retailLeasedOpening * (1 - retailFreeRentMonths / 12),
    [retailLeasedOpening, retailFreeRentMonths]
  );

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 1 — Residential Lease/Rent Income
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Configure base rent and lease-up for residential units and optional
          ground-floor retail.{" "}
          <span className="text-amber-500">Amber borders</span> indicate manual
          overrides.
        </p>
      </div>

      {residentialBenchmarkReady ? (
        <BenchmarkHeader
          assetType="residential"
          country={projectInfo.country}
          segment={projectInfo.residentialSegment}
          positioning={projectInfo.residentialPositioning}
          furnishingLevel={projectInfo.residentialFurnishingLevel}
          isServicedApartment={projectInfo.residentialIsServicedApartment}
          onUseDefaults={handleResetAll}
          isManualOverride={hasManualOverride}
        />
      ) : null}

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">Residential portion</h3>
          <button
            type="button"
            onClick={handleResetResidential}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Reset residential
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Residential GLA (sqft)
            </label>
            <input
              type="number"
              value={projectInfo.residentialGLA || 0}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
              title="Locked: Defined in Component 1 Step 4 Building Configuration"
            />
            <p className="mt-1 text-xs text-amber-400">
              🔒 Locked: To change, go back to Component 1 Step 4
            </p>
            {fieldError("residentialGla") && (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("residentialGla")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Avg blended residential rent psf – Year 1 ({currencyCode})
            </label>
            <input
              type="number"
              value={residentialRentPsf}
              onChange={(e) =>
                handleFieldChange(
                  "residentialRentPsf",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(
                !!overrides.residential || !!overrides.residentialRentPsf
              )}
            />
            {fieldError("residentialRentPsf") && (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("residentialRentPsf")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual residential rent escalation (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={residentialEscalation}
              onChange={(e) =>
                handleFieldChange(
                  "residentialEscalation",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.residentialEscalation)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Leased % at opening
            </label>
            <input
              type="number"
              value={residentialLeasedOpening}
              onChange={(e) =>
                handleFieldChange(
                  "residentialLeasedOpening",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.residentialLeasedOpening)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Target leased % (stabilized)
            </label>
            <input
              type="number"
              value={residentialLeasedTarget}
              onChange={(e) =>
                handleFieldChange(
                  "residentialLeasedTarget",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.residentialLeasedTarget)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Residential lease-up period (months)
            </label>
            <input
              type="number"
              value={residentialLeaseUpMonths}
              onChange={(e) =>
                handleFieldChange(
                  "residentialLeaseUpMonths",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.residentialLeaseUpMonths)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Average vacancy rate after stabilization (%)
            </label>
            <input
              type="number"
              value={residentialVacancyRate}
              onChange={(e) =>
                handleFieldChange(
                  "residentialVacancyRate",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.residentialVacancyRate)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Bad debt / rent loss (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={residentialBadDebtRate}
              onChange={(e) =>
                handleFieldChange(
                  "residentialBadDebtRate",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.residentialBadDebtRate)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Retail portion (ground floor, optionally G+1)
          </h3>
          <button
            type="button"
            onClick={handleResetRetail}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Reset retail
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-slate-400">
              Retail GLA (sq ft)
            </label>
            <input
              type="number"
              value={retailGla}
              onChange={(e) =>
                handleFieldChange("retailGla", Number(e.target.value) || 0)
              }
              className={overrideFieldClass(false)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Average retail rent psf – Year 1 ({currencyCode})
            </label>
            <input
              type="number"
              value={retailRentPsf}
              onChange={(e) =>
                handleFieldChange("retailRentPsf", Number(e.target.value) || 0)
              }
              className={overrideFieldClass(!!overrides.retailRentPsf)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual retail rent escalation (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={retailEscalation}
              onChange={(e) =>
                handleFieldChange("retailEscalation", Number(e.target.value) || 0)
              }
              className={overrideFieldClass(!!overrides.retailEscalation)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Leased % at opening (retail)
            </label>
            <input
              type="number"
              value={retailLeasedOpening}
              onChange={(e) =>
                handleFieldChange(
                  "retailLeasedOpening",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.retailLeasedOpening)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Target leased % (retail – stabilized)
            </label>
            <input
              type="number"
              value={retailLeasedTarget}
              onChange={(e) =>
                handleFieldChange(
                  "retailLeasedTarget",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.retailLeasedTarget)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Retail lease-up period (years)
            </label>
            <input
              type="number"
              step="0.5"
              value={retailLeaseUpYears}
              onChange={(e) =>
                handleFieldChange(
                  "retailLeaseUpYears",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.retailLeaseUpYears)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Average free rent (months – retail)
            </label>
            <input
              type="number"
              value={retailFreeRentMonths}
              onChange={(e) =>
                handleFieldChange(
                  "retailFreeRentMonths",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.retailFreeRentMonths)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <label className="mb-4 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={includePercentageRent}
            onChange={(e) => setIncludePercentageRent(e.target.checked)}
            className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-emerald-500"
          />
          <span className="font-medium text-white">
            Include percentage rent for retail?
          </span>
        </label>
        {includePercentageRent && (
          <div className="mt-4">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={handleResetPercentageRent}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                Reset % rent
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Avg retail sales psf – Year 1 ({currencyCode})
                </label>
                <input
                  type="number"
                  value={retailSalesPsf}
                  onChange={(e) =>
                    handleFieldChange("retailSalesPsf", Number(e.target.value) || 0)
                  }
                  className={overrideFieldClass(!!overrides.retailSalesPsf)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Annual sales growth (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={retailSalesGrowth}
                  onChange={(e) =>
                    handleFieldChange(
                      "retailSalesGrowth",
                      Number(e.target.value) || 0
                    )
                  }
                  className={overrideFieldClass(!!overrides.retailSalesGrowth)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Percentage rent rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={percentageRentRate}
                  onChange={(e) =>
                    handleFieldChange(
                      "percentageRentRate",
                      Number(e.target.value) || 0
                    )
                  }
                  className={overrideFieldClass(!!overrides.percentageRentRate)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Breakpoint type
                </label>
                <select
                  value={breakpointType}
                  onChange={(e) =>
                    setBreakpointType(e.target.value as "natural" | "fixed")
                  }
                  className={`${inputBase} border border-slate-600`}
                >
                  <option value="natural">Natural (rent × multiple)</option>
                  <option value="fixed">Fixed sales threshold</option>
                </select>
              </div>
              {breakpointType === "natural" ? (
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Breakpoint multiple
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={breakpointMultiple}
                    onChange={(e) =>
                      handleFieldChange(
                        "breakpointMultiple",
                        Number(e.target.value) || 0
                      )
                    }
                    className={overrideFieldClass(!!overrides.breakpointMultiple)}
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Fixed breakpoint (psf)
                  </label>
                  <input
                    type="number"
                    value={fixedBreakpointPsf}
                    onChange={(e) =>
                      handleFieldChange(
                        "fixedBreakpointPsf",
                        Number(e.target.value) || 0
                      )
                    }
                    className={overrideFieldClass(!!overrides.fixedBreakpointPsf)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR TABLE – MINIMUM RENT + PERCENTAGE RENT
          </h3>
        </div>
        {mounted ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300" suppressHydrationWarning>
            <thead className="bg-slate-800 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="border-r border-slate-700 px-2 py-3" rowSpan={2}>
                  Year
                </th>
                <th
                  colSpan={3}
                  className="border-r border-slate-700 px-2 py-3 text-center text-emerald-400"
                >
                  Residential
                </th>
                <th
                  colSpan={includePercentageRent ? 4 : 3}
                  className="border-r border-slate-700 px-2 py-3 text-center text-blue-400"
                >
                  Retail
                </th>
                <th
                  className="border-l border-slate-700 px-2 py-3 text-center"
                  rowSpan={2}
                >
                  Total base rent
                  <br />({currencyCode} M)
                </th>
              </tr>
              <tr>
                <th className="border-r border-slate-700 px-2 py-2">
                  Rent psf
                </th>
                <th className="border-r border-slate-700 px-2 py-2">
                  Leased %
                </th>
                <th className="border-r border-slate-700 px-2 py-2">
                  Rent (M)
                </th>
                <th className="border-r border-slate-700 px-2 py-2">
                  Rent psf
                </th>
                <th className="border-r border-slate-700 px-2 py-2">
                  Leased % (eff)*
                </th>
                <th className="border-r border-slate-700 px-2 py-2">
                  Min rent (M)
                </th>
                {includePercentageRent ? (
                  <th className="border-r border-slate-700 px-2 py-2">
                    % rent (M)
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const idx = row.year - 1;
                return (
                  <tr
                    key={row.year}
                    className={`border-b border-slate-800 ${
                      row.isOverridden ? "bg-amber-900/10" : "hover:bg-slate-800/50"
                    }`}
                  >
                    <td className="border-r border-slate-700 px-2 py-3 font-medium text-white">
                      {row.year}
                    </td>
                    <td className="border-r border-slate-700 px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        value={row.residentialRentPsfYear.toFixed(1)}
                        onChange={(e) => {
                          const parsed = parseFloat(e.target.value) || 0;
                          handleFieldChange(
                            "residentialRentPsf",
                            parsed /
                              Math.pow(1 + residentialEscalation / 100, idx)
                          );
                        }}
                        className={`w-16 rounded bg-slate-800 p-1 text-right ${
                          overrides.residentialRentPsf
                            ? "border border-amber-500"
                            : "border border-transparent"
                        }`}
                      />
                    </td>
                    <td className="border-r border-slate-700 px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        value={row.residentialLeasedPct.toFixed(1)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (row.year === 1) {
                            handleFieldChange("residentialLeasedOpening", val);
                          } else {
                            handleFieldChange("residentialLeasedTarget", val);
                          }
                        }}
                        className={`w-16 rounded bg-slate-800 p-1 text-right ${
                          overrides.residentialLeasedOpening ||
                          overrides.residentialLeasedTarget
                            ? "border border-amber-500"
                            : "border border-transparent"
                        }`}
                      />
                    </td>
                    <td className="border-r border-slate-700 px-2 py-3 text-right font-mono text-emerald-400">
                      {formatMillionsPreScaled(row.residentialRevenueM, mounted)}
                    </td>
                    <td className="border-r border-slate-700 px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        value={row.retailRentPsfYear.toFixed(1)}
                        onChange={(e) => {
                          const parsed = parseFloat(e.target.value) || 0;
                          handleFieldChange(
                            "retailRentPsf",
                            parsed / Math.pow(1 + retailEscalation / 100, idx)
                          );
                        }}
                        className={`w-16 rounded bg-slate-800 p-1 text-right ${
                          overrides.retailRentPsf
                            ? "border border-amber-500"
                            : "border border-transparent"
                        }`}
                      />
                    </td>
                    <td className="border-r border-slate-700 px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        value={row.retailEffectiveLeased.toFixed(1)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (row.year === 1) {
                            const denom = 1 - retailFreeRentMonths / 12;
                            handleFieldChange(
                              "retailLeasedOpening",
                              denom > 0 ? val / denom : val
                            );
                          } else {
                            handleFieldChange("retailLeasedTarget", val);
                          }
                        }}
                        className={`w-16 rounded bg-slate-800 p-1 text-right ${
                          overrides.retailLeasedOpening ||
                          overrides.retailLeasedTarget
                            ? "border border-amber-500"
                            : "border border-transparent"
                        }`}
                      />
                    </td>
                    <td className="border-r border-slate-700 px-2 py-3 text-right font-mono text-blue-400">
                      {formatMillionsPreScaled(row.retailMinRentM, mounted)}
                    </td>
                    {includePercentageRent ? (
                      <td className="border-r border-slate-700 px-2 py-3 text-right font-mono text-amber-400">
                        {mounted ? (
                          <input
                            type="number"
                            step="0.01"
                            value={row.percentageRentM.toFixed(2)}
                            onChange={(e) =>
                              handleCellOverride(
                                row.year,
                                "percentageRent",
                                (parseFloat(e.target.value) || 0) * 1_000_000
                              )
                            }
                            className={`w-16 rounded bg-slate-800 p-1 text-right ${
                              manualYearValues[row.year]?.percentageRent
                                ? "border border-amber-500"
                                : "border border-transparent"
                            }`}
                          />
                        ) : (
                          <span className="text-slate-600">0.00</span>
                        )}
                      </td>
                    ) : null}
                    <td className="border-l border-slate-700 px-2 py-3 text-right font-mono font-semibold text-emerald-400">
                      {formatMillions(row.totalBaseRent, mounted)}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-800 font-bold text-white">
                <td className="border-r border-slate-700 px-2 py-3">
                  10-Year total
                </td>
                <td colSpan={2} className="border-r border-slate-700" />
                <td className="border-r border-slate-700 px-2 py-3 text-right text-emerald-400">
                  {formatMillions(
                    tableRows.reduce((s, r) => s + r.residentialRevenue, 0),
                    mounted
                  )}
                </td>
                <td colSpan={2} className="border-r border-slate-700" />
                <td className="border-r border-slate-700 px-2 py-3 text-right text-blue-400">
                  {formatMillions(
                    tableRows.reduce((s, r) => s + r.retailMinRent, 0),
                    mounted
                  )}
                </td>
                {includePercentageRent ? (
                  <td className="border-r border-slate-700 px-2 py-3 text-right text-amber-400">
                    {mounted
                      ? formatMillions(
                          tableRows.reduce((s, r) => s + r.percentageRent, 0),
                          mounted
                        )
                      : "—"}
                  </td>
                ) : null}
                <td className="border-l border-slate-700 px-2 py-3 text-right text-emerald-400">
                  {formatMillions(
                    tableRows.reduce((s, r) => s + r.totalBaseRent, 0),
                    mounted
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        ) : (
          <div className="overflow-x-auto p-8 text-center text-sm text-slate-500">
            Loading projections…
          </div>
        )}
        <div className="border-t border-slate-700 bg-slate-800/50 p-3 text-[10px] text-slate-400">
          <p>
            * Retail effective leased % after free rent in Year 1:{" "}
            {mounted ? `${retailLeasedOpening.toFixed(1)}%` : "—"} × (1 −{" "}
            {mounted ? retailFreeRentMonths : "—"}/12) ={" "}
            {mounted ? `${retailY1EffectiveLeased.toFixed(1)}%` : "—"}.
          </p>
          <p className="mt-1">
            * Residential revenue includes vacancy (
            {mounted ? residentialVacancyRate : "—"}%) and bad debt (
            {mounted ? residentialBadDebtRate : "—"}%) allowances.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Total base rent by year ({currencyCode} M)
        </h3>
        <div className="h-64 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                  formatter={(val) =>
                    `${Number(val ?? 0).toFixed(2)}M`
                  }
                />
                <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
                <Bar dataKey="Residential Rent" stackId="a" fill="#10b981" />
                <Bar dataKey="Retail Min Rent" stackId="a" fill="#3b82f6" />
                {includePercentageRent && (
                  <Bar dataKey="Retail % Rent" stackId="a" fill="#f59e0b" />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
      </div>
    </div>
  );
}
