"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BenchmarkHeader from "@/components/BenchmarkHeader";
import {
  getOfficeBenchmark,
  getOfficeBenchmarkProfileKey,
} from "@/lib/benchmarks/office-construction-costs";
import { compoundRentForYearIndex } from "@/lib/benchmarks/retail-revenue";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import {
  snapFinite,
  snapPositive,
  type OperationalOfficeHoldSnapshot,
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

export function getOperationalOfficeHoldSnapshot():
  | OperationalOfficeHoldSnapshot
  | undefined {
  return useFinModelStore.getState().operational?.officeHoldSnapshot;
}

export type OfficeRevenueStepErrors = Record<string, string>;

export type OfficeRevenueInputs = {
  officeGla: number;
  officeRentPsf: number;
  officeEscalation: number;
  officeLeasedOpening: number;
  officeLeasedTarget: number;
  officeLeaseUpYears: number;
  officeFreeRentMonths: number;
  retailGla: number;
  retailRentPsf: number;
  retailEscalation: number;
  retailLeasedOpening: number;
  retailLeasedTarget: number;
  retailLeaseUpYears: number;
  retailFreeRentMonths: number;
  includePercentageRent: boolean;
  retailSalesPsf: number;
  retailSalesGrowth: number;
  percentageRentRate: number;
  breakpointType: "natural" | "fixed";
  breakpointMultiple: number;
  fixedBreakpointPsf: number;
  manualYearValues: Record<number, Record<string, number>>;
};

export type OfficeRevenueRow = {
  year: number;
  officeRentPsfYear: number;
  officeEffectiveLeasedPct: number;
  officeRent: number;
  retailRentPsfYear: number;
  retailEffectiveLeasedPct: number;
  retailMinRent: number;
  percentageRent: number;
  totalBaseRent: number;
  /** Nominal leased % before free-rent adjustment (lease-up curve). */
  officeLeasedPct: number;
  retailLeasedPct: number;
  isOverridden: boolean;
  officeRentM: number;
  retailMinRentM: number;
  percentageRentM: number;
};

export function leasedPctForYear(
  year: number,
  opening: number,
  target: number,
  leaseUpYears: number
): number {
  if (year === 1) return opening;
  if (year <= leaseUpYears) {
    const progress = (year - 1) / leaseUpYears;
    return opening + (target - opening) * progress;
  }
  return target;
}

export function computeOfficeRevenueRows(
  inputs: OfficeRevenueInputs
): OfficeRevenueRow[] {
  let officeCurrentRent = inputs.officeRentPsf;
  let retailCurrentRent = inputs.retailRentPsf;
  let retailCurrentSales = inputs.retailSalesPsf;
  const rows: OfficeRevenueRow[] = [];

  for (let t = 1; t <= OPERATIONAL_ROOM_REVENUE_YEARS; t++) {
    if (t > 1) {
      officeCurrentRent = compoundRentForYearIndex(
        inputs.officeRentPsf,
        inputs.officeEscalation,
        t - 1
      );
      retailCurrentRent = compoundRentForYearIndex(
        inputs.retailRentPsf,
        inputs.retailEscalation,
        t - 1
      );
      retailCurrentSales = compoundRentForYearIndex(
        inputs.retailSalesPsf,
        inputs.retailSalesGrowth,
        t - 1
      );
    }

    const officeLeased = leasedPctForYear(
      t,
      inputs.officeLeasedOpening,
      inputs.officeLeasedTarget,
      inputs.officeLeaseUpYears
    );
    // Effective leased %: Year 1 applies free rent (Leased % × (1 − months/12))
    let officeEffective = officeLeased;
    if (t === 1) {
      officeEffective =
        officeLeased * (1 - inputs.officeFreeRentMonths / 12);
    }

    const officeRevenue =
      inputs.officeGla * officeCurrentRent * (officeEffective / 100);

    const retailLeased = leasedPctForYear(
      t,
      inputs.retailLeasedOpening,
      inputs.retailLeasedTarget,
      inputs.retailLeaseUpYears
    );
    let retailEffective = retailLeased;
    if (t === 1) {
      retailEffective =
        retailLeased * (1 - inputs.retailFreeRentMonths / 12);
    }
    const retailMinRent =
      inputs.retailGla * retailCurrentRent * (retailEffective / 100);

    let percentageRent = 0;
    if (inputs.includePercentageRent && inputs.retailGla > 0) {
      const totalSales = inputs.retailGla * retailCurrentSales;
      const breakpointSales =
        inputs.breakpointType === "natural"
          ? retailCurrentRent * inputs.breakpointMultiple * inputs.retailGla
          : inputs.fixedBreakpointPsf * inputs.retailGla;
      const excessSales = Math.max(0, totalSales - breakpointSales);
      percentageRent = excessSales * (inputs.percentageRentRate / 100);
    }

    const manual = inputs.manualYearValues[t] ?? {};
    const officeRent = manual.officeRent ?? officeRevenue;
    const retailMin = manual.retailMinRent ?? retailMinRent;
    const pctRent = manual.percentageRent ?? percentageRent;
    const totalBaseRent =
      manual.totalBaseRent ?? officeRent + retailMin + pctRent;

    rows.push({
      year: t,
      officeRentPsfYear: officeCurrentRent,
      officeEffectiveLeasedPct: officeEffective,
      officeRent,
      retailRentPsfYear: retailCurrentRent,
      retailEffectiveLeasedPct: retailEffective,
      retailMinRent: retailMin,
      percentageRent: pctRent,
      totalBaseRent,
      officeLeasedPct: officeLeased,
      retailLeasedPct: retailLeased,
      isOverridden: Object.keys(manual).length > 0,
      officeRentM: officeRent / 1_000_000,
      retailMinRentM: retailMin / 1_000_000,
      percentageRentM: pctRent / 1_000_000,
    });
  }

  return rows;
}

export function validateOfficeRevenueStep(
  snap: OperationalOfficeHoldSnapshot | undefined
): OfficeRevenueStepErrors {
  const next: OfficeRevenueStepErrors = {};
  if (!snap) {
    next.officeGla = "Office GLA must be greater than 0 sqft.";
    return next;
  }
  if (!Number.isFinite(snap.officeGlaSqft) || snap.officeGlaSqft <= 0) {
    next.officeGla = "Office GLA must be greater than 0 sqft.";
  }
  if (!Number.isFinite(snap.officeRentPsfYear1) || snap.officeRentPsfYear1 <= 0) {
    next.officeRentPsf = "Year 1 office rent ($/sqft) must be greater than 0.";
  }
  const occFields: Array<{
    key: keyof OfficeRevenueStepErrors;
    val: number;
    label: string;
  }> = [
    {
      key: "officeLeasedOpening",
      val: snap.officeLeasedOpeningPct,
      label: "Office opening leased %",
    },
    {
      key: "officeLeasedTarget",
      val: snap.officeLeasedTargetPct,
      label: "Office target leased %",
    },
    {
      key: "retailLeasedOpening",
      val: snap.retailLeasedOpeningPct,
      label: "Retail opening leased %",
    },
    {
      key: "retailLeasedTarget",
      val: snap.retailLeasedTargetPct,
      label: "Retail target leased %",
    },
  ];
  for (const { key, val, label } of occFields) {
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

type OfficeRevenueStepProps = {
  fieldError: (name: string) => string | undefined;
  defaultOfficeGlaSqft?: number;
  defaultRetailGlaSqft?: number;
  onRegisterPersist?: (persist: (() => void) | null) => void;
};

const DEFAULT_RETAIL_RENT_PSF = 300;
const DEFAULT_RETAIL_OPENING = 50;
const DEFAULT_RETAIL_TARGET = 95;
const DEFAULT_RETAIL_LEASE_UP = 1.5;
const DEFAULT_RETAIL_FREE_RENT = 3;

export default function OfficeRevenueStep({
  fieldError,
  defaultOfficeGlaSqft = 200_000,
  defaultRetailGlaSqft = 50_000,
  onRegisterPersist,
}: OfficeRevenueStepProps) {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const currencyCode = projectInfo.currency || "AED";
  const updateOfficeHoldSnapshot = useFinModelStore(
    (s) => s.updateOfficeHoldSnapshot
  );

  const coworkingDelivery =
    projectInfo.officeSegment === "co_working"
      ? projectInfo.officeCoworkingDelivery
      : undefined;

  const benchmark = useMemo(
    () =>
      getOfficeBenchmark(
        projectInfo.country || "UAE",
        projectInfo.officeSegment || "prime_tower",
        projectInfo.officePositioning || "grade_a",
        coworkingDelivery
      ),
    [
      projectInfo.country,
      projectInfo.officeSegment,
      projectInfo.officePositioning,
      coworkingDelivery,
    ]
  );

  const profileKey = useMemo(() => {
    if (!projectInfo.officeSegment || !projectInfo.officePositioning) return null;
    return getOfficeBenchmarkProfileKey(
      projectInfo.country || "UAE",
      projectInfo.officeSegment,
      projectInfo.officePositioning,
      coworkingDelivery
    );
  }, [
    projectInfo.country,
    projectInfo.officeSegment,
    projectInfo.officePositioning,
    coworkingDelivery,
  ]);

  const profileKeyPrevRef = useRef<string | null>(null);
  const snap = getOperationalOfficeHoldSnapshot();

  const [officeGla, setOfficeGla] = useState(() => {
    if (projectInfo.officeGLA) return projectInfo.officeGLA;
    return snapPositive(snap?.officeGlaSqft, defaultOfficeGlaSqft);
  });
  const [retailGla, setRetailGla] = useState(
    () => snapPositive(snap?.retailGlaSqft, defaultRetailGlaSqft)
  );

  const [officeRentPsf, setOfficeRentPsf] = useState(
    () =>
      snapPositive(snap?.officeRentPsfYear1, benchmark?.baseRentPsf ?? 180)
  );
  const [officeEscalation, setOfficeEscalation] = useState(
    () =>
      snapFinite(snap?.officeRentEscalationPct, benchmark?.rentEscalation ?? 3)
  );
  const [officeLeasedOpening, setOfficeLeasedOpening] = useState(
    () =>
      snapFinite(
        snap?.officeLeasedOpeningPct,
        benchmark?.openingOccupancy ?? 30
      )
  );
  const [officeLeasedTarget, setOfficeLeasedTarget] = useState(
    () =>
      snapFinite(
        snap?.officeLeasedTargetPct,
        benchmark?.stabilizedOccupancy ?? 90
      )
  );
  const [officeLeaseUpYears, setOfficeLeaseUpYears] = useState(
    () => snapFinite(snap?.officeLeaseUpYears, benchmark?.leaseUpYears ?? 2.5)
  );
  const [officeFreeRentMonths, setOfficeFreeRentMonths] = useState(
    () => snapFinite(snap?.officeFreeRentMonths, 6)
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
    if (projectInfo.officeGLA) {
      setOfficeGla(projectInfo.officeGLA);
    }
  }, [projectInfo.officeGLA]);

  useEffect(() => {
    if (projectInfo.officeGLA) return;
    if (defaultOfficeGlaSqft > 0 && officeGla <= 0) {
      setOfficeGla(defaultOfficeGlaSqft);
    }
  }, [defaultOfficeGlaSqft, officeGla, projectInfo.officeGLA]);

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
    if (!profileChanged && (snap?.officeRentPsfYear1 ?? 0) > 0) return;

    setOverrides({});
    setManualYearValues({});
    setOfficeRentPsf(benchmark.baseRentPsf);
    setOfficeEscalation(benchmark.rentEscalation);
    setOfficeLeasedOpening(benchmark.openingOccupancy);
    setOfficeLeasedTarget(benchmark.stabilizedOccupancy);
    setOfficeLeaseUpYears(benchmark.leaseUpYears);
  }, [benchmark, profileKey, snap?.officeRentPsfYear1]);

  const tableRows = useMemo(
    () =>
      computeOfficeRevenueRows({
        officeGla,
        officeRentPsf,
        officeEscalation,
        officeLeasedOpening,
        officeLeasedTarget,
        officeLeaseUpYears,
        officeFreeRentMonths,
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
      officeGla,
      officeRentPsf,
      officeEscalation,
      officeLeasedOpening,
      officeLeasedTarget,
      officeLeaseUpYears,
      officeFreeRentMonths,
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

  const persistSnapshot = useCallback(() => {
    const prev = getOperationalOfficeHoldSnapshot();
    updateOfficeHoldSnapshot(
      {
        ...prev,
        officeGlaSqft: officeGla,
        officeRentPsfYear1: officeRentPsf,
        officeRentEscalationPct: officeEscalation,
        officeLeasedOpeningPct: officeLeasedOpening,
        officeLeasedTargetPct: officeLeasedTarget,
        officeLeaseUpYears: officeLeaseUpYears,
        officeFreeRentMonths: officeFreeRentMonths,
        officeLeasedPctValues: tableRows.map((r) => r.officeLeasedPct),
        officeRentValues: tableRows.map((r) => r.officeRent),
        retailGlaSqft: retailGla,
        retailRentPsfYear1: retailRentPsf,
        retailRentEscalationPct: retailEscalation,
        retailLeasedOpeningPct: retailLeasedOpening,
        retailLeasedTargetPct: retailLeasedTarget,
        retailLeaseUpYears: retailLeaseUpYears,
        retailFreeRentMonths: retailFreeRentMonths,
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
    officeGla,
    officeRentPsf,
    officeEscalation,
    officeLeasedOpening,
    officeLeasedTarget,
    officeLeaseUpYears,
    officeFreeRentMonths,
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
    updateOfficeHoldSnapshot,
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

  const handleResetAll = useCallback(() => {
    if (!benchmark) return;
    setOverrides({});
    setManualYearValues({});
    setOfficeRentPsf(benchmark.baseRentPsf);
    setOfficeEscalation(benchmark.rentEscalation);
    setOfficeLeasedOpening(benchmark.openingOccupancy);
    setOfficeLeasedTarget(benchmark.stabilizedOccupancy);
    setOfficeLeaseUpYears(benchmark.leaseUpYears);
  }, [benchmark]);

  const handleFieldChange = useCallback((field: string, value: number) => {
    const setters: Record<string, (v: number) => void> = {
      officeGla: setOfficeGla,
      officeRentPsf: setOfficeRentPsf,
      officeEscalation: setOfficeEscalation,
      officeLeasedOpening: setOfficeLeasedOpening,
      officeLeasedTarget: setOfficeLeasedTarget,
      officeLeaseUpYears: setOfficeLeaseUpYears,
      officeFreeRentMonths: setOfficeFreeRentMonths,
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
    if (setters[field]) {
      setters[field](value);
      setOverrides((prev) => ({ ...prev, [field]: true }));
    }
  }, []);

  const handleCellOverride = useCallback(
    (year: number, stream: string, valueM: number) => {
      setManualYearValues((prev) => ({
        ...prev,
        [year]: { ...prev[year], [stream]: valueM * 1_000_000 },
      }));
    },
    []
  );

  const chartData = useMemo(
    () =>
      tableRows.map((row) => ({
        year: `Y${row.year}`,
        "Office Rent": row.officeRentM,
        "Retail Min Rent": row.retailMinRentM,
        "Retail % Rent": row.percentageRentM,
      })),
    [tableRows]
  );

  const leaseUpChartData = useMemo(
    () =>
      tableRows.map((row) => ({
        year: `Y${row.year}`,
        "Office Leased %": row.officeEffectiveLeasedPct,
        "Retail Leased %": row.retailEffectiveLeasedPct,
      })),
    [tableRows]
  );

  const officeY1EffectiveLeased = useMemo(
    () => officeLeasedOpening * (1 - officeFreeRentMonths / 12),
    [officeLeasedOpening, officeFreeRentMonths]
  );
  const retailY1EffectiveLeased = useMemo(
    () => retailLeasedOpening * (1 - retailFreeRentMonths / 12),
    [retailLeasedOpening, retailFreeRentMonths]
  );

  const hasManualOverride =
    Object.values(overrides).some(Boolean) ||
    Object.keys(manualYearValues).length > 0;

  const officeBenchmarkReady =
    !!projectInfo.officeSegment && !!projectInfo.officePositioning && !!benchmark;

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 1 — Office &amp; Retail Rent, Lease-Up
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Configure base rent and lease-up for the office tower and ground-floor
          retail.{" "}
          <span className="text-amber-500">Amber borders</span> indicate manual
          overrides.
        </p>
      </div>

      {officeBenchmarkReady ? (
        <BenchmarkHeader
          assetType="office"
          country={projectInfo.country}
          segment={projectInfo.officeSegment}
          positioning={projectInfo.officePositioning}
          coworkingDelivery={coworkingDelivery}
          onUseDefaults={handleResetAll}
          isManualOverride={hasManualOverride}
        />
      ) : null}

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Inputs – Office Portion
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Gross Leasable Area (GLA) (sqft)
            </label>
            <input
              type="number"
              value={projectInfo.officeGLA || 0}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
              title="Locked: Defined in Component 1 Step 5 Building Configuration"
            />
            <p className="mt-1 text-xs text-amber-400">
              🔒 Locked: To change, go back to Component 1 Step 5
            </p>
            {fieldError("officeGla") && (
              <p className="mt-1 text-sm text-red-400">{fieldError("officeGla")}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Average Office Rent psf – Year 1 ({currencyCode})
            </label>
            <input
              type="number"
              value={officeRentPsf}
              onChange={(e) =>
                handleFieldChange("officeRentPsf", Number(e.target.value) || 0)
              }
              className={overrideFieldClass(!!overrides.officeRentPsf)}
            />
            {fieldError("officeRentPsf") && (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("officeRentPsf")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Rent Escalation (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={officeEscalation}
              onChange={(e) =>
                handleFieldChange("officeEscalation", Number(e.target.value) || 0)
              }
              className={overrideFieldClass(!!overrides.officeEscalation)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Leased % at Opening (Office)
            </label>
            <input
              type="number"
              value={officeLeasedOpening}
              onChange={(e) =>
                handleFieldChange(
                  "officeLeasedOpening",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.officeLeasedOpening)}
            />
            {fieldError("officeLeasedOpening") && (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("officeLeasedOpening")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Target Leased % (Office)
            </label>
            <input
              type="number"
              value={officeLeasedTarget}
              onChange={(e) =>
                handleFieldChange(
                  "officeLeasedTarget",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.officeLeasedTarget)}
            />
            {fieldError("officeLeasedTarget") && (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("officeLeasedTarget")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Lease-Up Period (Years – Office)
            </label>
            <input
              type="number"
              step="0.5"
              value={officeLeaseUpYears}
              onChange={(e) =>
                handleFieldChange(
                  "officeLeaseUpYears",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.officeLeaseUpYears)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Average Free Rent (Months – Office)
            </label>
            <input
              type="number"
              value={officeFreeRentMonths}
              onChange={(e) =>
                handleFieldChange(
                  "officeFreeRentMonths",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(!!overrides.officeFreeRentMonths)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Inputs – Retail Portion (Ground Floor to G+2)
        </h3>
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
              Average Retail Rent psf – Year 1 ({currencyCode})
            </label>
            <input
              type="number"
              value={retailRentPsf}
              onChange={(e) =>
                handleFieldChange("retailRentPsf", Number(e.target.value) || 0)
              }
              className={overrideFieldClass(!!overrides.retailRentPsf)}
            />
            {fieldError("retailRentPsf") && (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("retailRentPsf")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Rent Escalation (%)
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
              Leased % at Opening (Retail)
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
            {fieldError("retailLeasedOpening") && (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("retailLeasedOpening")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Target Leased % (Retail)
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
            {fieldError("retailLeasedTarget") && (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("retailLeasedTarget")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Lease-Up Period (Years – Retail)
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
              Average Free Rent (Months – Retail)
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
          <span className="font-medium text-white">Include Percentage Rent?</span>
        </label>

        {includePercentageRent && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Average Retail Sales psf ({currencyCode})
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
                Annual Sales Growth (%)
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
                Percentage Rent Rate (%)
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
                Breakpoint Type
              </label>
              <select
                value={breakpointType}
                onChange={(e) =>
                  setBreakpointType(e.target.value as "natural" | "fixed")
                }
                className={`${inputBase} border border-slate-600`}
              >
                <option value="natural">Natural (Rent × Multiple)</option>
                <option value="fixed">Fixed Sales Threshold</option>
              </select>
            </div>
            {breakpointType === "natural" ? (
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Breakpoint Multiple
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
                  Fixed Breakpoint (psf)
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
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR TABLE – MINIMUM RENT + PERCENTAGE RENT
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800 text-[10px] uppercase text-slate-400">
              <tr>
                <th
                  className="border-r border-slate-700 px-2 py-3"
                  rowSpan={2}
                >
                  Year
                </th>
                <th
                  colSpan={3}
                  className="border-r border-slate-700 px-2 py-3 text-center text-emerald-400"
                >
                  OFFICE
                </th>
                <th
                  colSpan={includePercentageRent ? 4 : 3}
                  className="border-r border-slate-700 px-2 py-3 text-center text-blue-400"
                >
                  RETAIL
                </th>
                <th className="border-l border-slate-700 px-2 py-3 text-center" rowSpan={2}>
                  Total Base Rent
                  <br />
                  ({currencyCode} M)
                  <br />
                  <span className="text-slate-500 normal-case">(auto)</span>
                </th>
              </tr>
              <tr>
                <th className="border-r border-slate-700 px-2 py-2">
                  Rent psf
                  <br />({currencyCode})
                  <br />
                  <span className="text-amber-400 normal-case">amber</span>
                </th>
                <th className="border-r border-slate-700 px-2 py-2">
                  Leased %
                  <br />
                  (eff)*
                  <br />
                  <span className="text-amber-400 normal-case">amber</span>
                </th>
                <th className="border-r border-slate-700 px-2 py-2">
                  Rent
                  <br />({currencyCode} M)
                  <br />
                  <span className="text-slate-500 normal-case">(auto)</span>
                </th>
                <th className="border-r border-slate-700 px-2 py-2">
                  Rent psf
                  <br />({currencyCode})
                  <br />
                  <span className="text-amber-400 normal-case">amber</span>
                </th>
                <th className="border-r border-slate-700 px-2 py-2">
                  Leased %
                  <br />
                  (eff)*
                  <br />
                  <span className="text-amber-400 normal-case">amber</span>
                </th>
                <th className="border-r border-slate-700 px-2 py-2">
                  Min Rent
                  <br />({currencyCode} M)
                  <br />
                  <span className="text-slate-500 normal-case">(auto)</span>
                </th>
                {includePercentageRent ? (
                  <th className="border-r border-slate-700 px-2 py-2">
                    % Rent
                    <br />({currencyCode} M)
                    <br />
                    <span className="text-slate-500 normal-case">(auto)</span>
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
                    className={`border-b border-slate-800 transition ${
                      row.isOverridden
                        ? "bg-amber-900/10"
                        : "hover:bg-slate-800/50"
                    }`}
                  >
                    <td className="border-r border-slate-700 px-2 py-3 font-medium text-white">
                      {row.year}
                    </td>

                    <td className="border-r border-slate-700 px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        value={row.officeRentPsfYear.toFixed(1)}
                        onChange={(e) => {
                          const parsed = parseFloat(e.target.value) || 0;
                          const newBase =
                            parsed /
                            Math.pow(1 + officeEscalation / 100, idx);
                          handleFieldChange("officeRentPsf", newBase);
                        }}
                        className={`w-16 rounded bg-slate-800 p-1 text-right ${
                          overrides.officeRentPsf
                            ? "border border-amber-500"
                            : "border border-transparent"
                        }`}
                      />
                    </td>

                    <td className="border-r border-slate-700 px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        value={row.officeEffectiveLeasedPct.toFixed(1)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (row.year === 1) {
                            const denom = 1 - officeFreeRentMonths / 12;
                            handleFieldChange(
                              "officeLeasedOpening",
                              denom > 0 ? val / denom : val
                            );
                          } else {
                            handleFieldChange("officeLeasedTarget", val);
                          }
                        }}
                        className={`w-16 rounded bg-slate-800 p-1 text-right ${
                          overrides.officeLeasedOpening ||
                          overrides.officeLeasedTarget
                            ? "border border-amber-500"
                            : "border border-transparent"
                        }`}
                      />
                    </td>

                    <td className="border-r border-slate-700 px-2 py-3 text-right font-mono text-emerald-400">
                      {(row.officeRent / 1_000_000).toFixed(2)}
                    </td>

                    <td className="border-r border-slate-700 px-2 py-3">
                      <input
                        type="number"
                        step="0.1"
                        value={row.retailRentPsfYear.toFixed(1)}
                        onChange={(e) => {
                          const parsed = parseFloat(e.target.value) || 0;
                          const newBase =
                            parsed /
                            Math.pow(1 + retailEscalation / 100, idx);
                          handleFieldChange("retailRentPsf", newBase);
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
                        value={row.retailEffectiveLeasedPct.toFixed(1)}
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
                      {(row.retailMinRent / 1_000_000).toFixed(2)}
                    </td>

                    {includePercentageRent ? (
                      <td className="border-r border-slate-700 px-2 py-3 text-right font-mono text-amber-400">
                        <input
                          type="number"
                          step="0.01"
                          value={(row.percentageRent / 1_000_000).toFixed(2)}
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
                      </td>
                    ) : null}

                    <td className="border-l border-slate-700 px-2 py-3 text-right font-mono font-semibold text-emerald-400">
                      {(row.totalBaseRent / 1_000_000).toFixed(2)}
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-slate-800 font-bold text-white">
                <td className="border-r border-slate-700 px-2 py-3">
                  10-Year Total
                </td>
                <td colSpan={2} className="border-r border-slate-700 px-2 py-3" />
                <td className="border-r border-slate-700 px-2 py-3 text-right text-emerald-400">
                  {(
                    tableRows.reduce((sum, r) => sum + r.officeRent, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
                <td colSpan={2} className="border-r border-slate-700 px-2 py-3" />
                <td className="border-r border-slate-700 px-2 py-3 text-right text-blue-400">
                  {(
                    tableRows.reduce((sum, r) => sum + r.retailMinRent, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
                {includePercentageRent ? (
                  <td className="border-r border-slate-700 px-2 py-3 text-right text-amber-400">
                    {(
                      tableRows.reduce((sum, r) => sum + r.percentageRent, 0) /
                      1_000_000
                    ).toFixed(2)}
                  </td>
                ) : null}
                <td className="border-l border-slate-700 px-2 py-3 text-right text-emerald-400">
                  {(
                    tableRows.reduce((sum, r) => sum + r.totalBaseRent, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-700 bg-slate-800/50 p-3 text-[10px] text-slate-400">
          <p>
            * Effective leased % after free rent adjustment (Year 1 only).
          </p>
          <p>
            ** Formula: effective = Leased % × (1 − free_rent_months/12). Office:{" "}
            {officeLeasedOpening.toFixed(1)}% × (1 − {officeFreeRentMonths}/12) ={" "}
            {officeY1EffectiveLeased.toFixed(1)}%. Retail:{" "}
            {retailLeasedOpening.toFixed(1)}% × (1 − {retailFreeRentMonths}/12) ={" "}
            {retailY1EffectiveLeased.toFixed(1)}%.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">
            TOTAL BASE RENT BY YEAR ({currencyCode} M)
          </h3>
          <div className="h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
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
                    formatter={(val) => `${Number(val ?? 0).toFixed(2)}M`}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
                  <Bar dataKey="Office Rent" stackId="a" fill="#10b981" />
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

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">
            LEASE-UP CURVE (%)
          </h3>
          <div className="h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={leaseUpChartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
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
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                    formatter={(val) => `${Number(val ?? 0).toFixed(1)}%`}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
                  <Line
                    type="monotone"
                    dataKey="Office Leased %"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Retail Leased %"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
