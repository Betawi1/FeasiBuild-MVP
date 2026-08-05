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
import { AiInput } from "@/components/ui/AiInput";
import useFinModelStore, {
  calculateDataCentreRevenue,
  type DataCentreRevenue,
} from "@/store/useFinModelStore";

const readOnlyClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-slate-200";

function formatMoney(n: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatNumber(n: number): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export type DataCentreProjectionRow = {
  year: number;
  occupancyPct: number;
  ratePerKw: number;
  powerRevenue: number;
  ratePerSqft: number;
  spaceRevenue: number;
  totalRevenue: number;
  isOverridden?: boolean;
};

export type DataCentreRevenueYearOverride = Partial<{
  occupancyPct: number;
  ratePerKw: number;
  ratePerSqft: number;
}>;

/**
 * 10-year DC revenue: Year 1 at 50% of stabilized occupancy (lease-up),
 * then stabilized. Rates escalate annually on both power and space.
 * Optional per-year overrides recalculate derived revenues automatically.
 */
export function generateDataCentre10YearProjection(params: {
  itLoadKw: number;
  whiteSpaceArea: number;
  occupancyRate: number;
  ratePerKwMonth: number;
  ratePerSqftMonth: number;
  annualEscalationPct: number;
  manualYearValues?: Record<number, DataCentreRevenueYearOverride>;
}): DataCentreProjectionRow[] {
  const stabilizedOccupancy = (params.occupancyRate || 0) / 100;
  const escalation = (params.annualEscalationPct || 0) / 100;
  const rows: DataCentreProjectionRow[] = [];

  for (let i = 1; i <= 10; i++) {
    const manual = params.manualYearValues?.[i] ?? {};
    const defaultOccupancy =
      (i === 1 ? stabilizedOccupancy * 0.5 : stabilizedOccupancy) * 100;
    const occupancyPct = manual.occupancyPct ?? defaultOccupancy;
    const occupancy = occupancyPct / 100;

    const ratePerKw =
      manual.ratePerKw ??
      (params.ratePerKwMonth || 0) * Math.pow(1 + escalation, i - 1);
    const ratePerSqft =
      manual.ratePerSqft ??
      (params.ratePerSqftMonth || 0) * Math.pow(1 + escalation, i - 1);

    const powerRevenue =
      (params.itLoadKw || 0) * occupancy * ratePerKw * 12;
    const spaceRevenue =
      (params.whiteSpaceArea || 0) * occupancy * ratePerSqft * 12;

    rows.push({
      year: i,
      occupancyPct,
      ratePerKw,
      powerRevenue,
      ratePerSqft,
      spaceRevenue,
      totalRevenue: powerRevenue + spaceRevenue,
      isOverridden: Object.keys(manual).length > 0,
    });
  }
  return rows;
}

export type DataCentreRevenueStepErrors = Record<string, string>;

export function validateDataCentreRevenueStep(
  revenue: DataCentreRevenue | undefined
): DataCentreRevenueStepErrors {
  const next: DataCentreRevenueStepErrors = {};
  if (!revenue || !Number.isFinite(revenue.itLoadKw) || revenue.itLoadKw <= 0) {
    next.dcITLoad =
      "IT Load must be greater than 0. Complete Component 1 Data Centre building config.";
  }
  if (
    !Number.isFinite(revenue?.ratePerKwMonth ?? NaN) ||
    (revenue?.ratePerKwMonth ?? 0) <= 0
  ) {
    next.dcRatePerKw = "Rate per kW/month is required.";
  }
  if (
    !Number.isFinite(revenue?.occupancyRate ?? NaN) ||
    (revenue?.occupancyRate ?? 0) <= 0 ||
    (revenue?.occupancyRate ?? 0) > 100
  ) {
    next.dcOccupancy = "Occupancy Rate is required (0–100%).";
  }
  if (
    !Number.isFinite(revenue?.ratePerSqftMonth ?? NaN) ||
    (revenue?.ratePerSqftMonth ?? 0) <= 0
  ) {
    next.dcRatePerSqft = "Rate per sqft/month is required.";
  }
  if (
    !Number.isFinite(revenue?.whiteSpaceArea ?? NaN) ||
    (revenue?.whiteSpaceArea ?? 0) <= 0
  ) {
    next.dcWhiteSpace =
      "White Space Area must be greater than 0. Complete Component 1 Step 5.";
  }
  return next;
}

type Props = {
  fieldError?: (name: string) => string | undefined;
};

export default function C2S1PrimaryRevenueDataCentre({
  fieldError,
}: Props = {}) {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const stored = useFinModelStore(
    (s) => s.operational.cashInflows?.dataCentreRevenue
  );
  const updateCashInflows = useFinModelStore((s) => s.updateCashInflows);
  const currency = projectInfo.currency || "USD";

  // Auto-populated from C1S5
  const dcITLoadKw = (projectInfo.dataCentreITLoadCapacity || 0) * 1000;
  const dcWhiteSpaceArea = projectInfo.dataCentreWhiteSpaceArea || 0;
  const dcTotalBuildingGFA = projectInfo.dataCentreTotalBuildingGFA || 0;

  const aiLeaseRate = projectInfo.dataCentreLeaseRatePerKwMonth;
  const aiLeaseRateSqft = projectInfo.dataCentreLeaseRatePerSqftMonth;

  const ratePerKwMonth = stored?.ratePerKwMonth ?? aiLeaseRate ?? 0;
  const annualEscalationPct = stored?.annualEscalationPct ?? 3;
  const occupancyRate = stored?.occupancyRate ?? 95;
  const ratePerSqftMonth =
    stored?.ratePerSqftMonth ?? aiLeaseRateSqft ?? 0;

  const revenue = useMemo(
    () =>
      calculateDataCentreRevenue({
        itLoadKw: dcITLoadKw,
        ratePerKwMonth,
        annualEscalationPct,
        totalBuildingGFA: dcTotalBuildingGFA,
        whiteSpaceArea: dcWhiteSpaceArea,
        occupancyRate,
        ratePerSqftMonth,
      }),
    [
      dcITLoadKw,
      ratePerKwMonth,
      annualEscalationPct,
      dcTotalBuildingGFA,
      dcWhiteSpaceArea,
      occupancyRate,
      ratePerSqftMonth,
    ]
  );

  const [manualYearValues, setManualYearValues] = useState<
    Record<number, DataCentreRevenueYearOverride>
  >(() => stored?.manualYearValues ?? {});
  const manualYearValuesRef = useRef(manualYearValues);
  manualYearValuesRef.current = manualYearValues;

  const persist = useCallback(
    (partial: Partial<DataCentreRevenue>) => {
      const next = calculateDataCentreRevenue({
        itLoadKw: dcITLoadKw,
        ratePerKwMonth: partial.ratePerKwMonth ?? ratePerKwMonth,
        annualEscalationPct:
          partial.annualEscalationPct ?? annualEscalationPct,
        totalBuildingGFA: dcTotalBuildingGFA,
        whiteSpaceArea: dcWhiteSpaceArea,
        occupancyRate: partial.occupancyRate ?? occupancyRate,
        ratePerSqftMonth: partial.ratePerSqftMonth ?? ratePerSqftMonth,
      });
      updateCashInflows(
        {
          dataCentreRevenue: {
            ...next,
            manualYearValues:
              partial.manualYearValues ?? manualYearValuesRef.current,
          },
        },
        "operational"
      );
    },
    [
      dcITLoadKw,
      ratePerKwMonth,
      annualEscalationPct,
      dcTotalBuildingGFA,
      dcWhiteSpaceArea,
      occupancyRate,
      ratePerSqftMonth,
      updateCashInflows,
    ]
  );

  const handleYearOverride = useCallback(
    (
      year: number,
      field: keyof DataCentreRevenueYearOverride,
      value: number
    ) => {
      setManualYearValues((prev) => ({
        ...prev,
        [year]: { ...prev[year], [field]: value },
      }));
    },
    []
  );

  // Persist year overrides after local state commits (never inside setState/render)
  useEffect(() => {
    const base = calculateDataCentreRevenue({
      itLoadKw: dcITLoadKw,
      ratePerKwMonth,
      annualEscalationPct,
      totalBuildingGFA: dcTotalBuildingGFA,
      whiteSpaceArea: dcWhiteSpaceArea,
      occupancyRate,
      ratePerSqftMonth,
    });
    const current =
      useFinModelStore.getState().operational.cashInflows?.dataCentreRevenue;
    if (
      JSON.stringify(current?.manualYearValues ?? {}) ===
      JSON.stringify(manualYearValues)
    ) {
      return;
    }
    updateCashInflows(
      { dataCentreRevenue: { ...base, manualYearValues } },
      "operational"
    );
  }, [
    manualYearValues,
    dcITLoadKw,
    ratePerKwMonth,
    annualEscalationPct,
    dcTotalBuildingGFA,
    dcWhiteSpaceArea,
    occupancyRate,
    ratePerSqftMonth,
    updateCashInflows,
  ]);

  useEffect(() => {
    persist({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dcITLoadKw, dcWhiteSpaceArea, dcTotalBuildingGFA]);

  useEffect(() => {
    if (
      aiLeaseRate != null &&
      aiLeaseRate > 0 &&
      (stored?.ratePerKwMonth == null || stored.ratePerKwMonth <= 0)
    ) {
      persist({ ratePerKwMonth: aiLeaseRate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiLeaseRate]);

  useEffect(() => {
    if (
      aiLeaseRateSqft != null &&
      aiLeaseRateSqft > 0 &&
      (stored?.ratePerSqftMonth == null || stored.ratePerSqftMonth <= 0)
    ) {
      persist({ ratePerSqftMonth: aiLeaseRateSqft });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiLeaseRateSqft]);

  const dc10YearData = useMemo(
    () =>
      generateDataCentre10YearProjection({
        itLoadKw: dcITLoadKw,
        whiteSpaceArea: dcWhiteSpaceArea,
        occupancyRate,
        ratePerKwMonth,
        ratePerSqftMonth,
        annualEscalationPct,
        manualYearValues,
      }),
    [
      dcITLoadKw,
      dcWhiteSpaceArea,
      occupancyRate,
      ratePerKwMonth,
      ratePerSqftMonth,
      annualEscalationPct,
      manualYearValues,
    ]
  );

  const chartData = useMemo(
    () =>
      dc10YearData.map((row) => ({
        year: `Y${row.year}`,
        "Power Revenue": row.powerRevenue / 1_000_000,
        "Space Revenue": row.spaceRevenue / 1_000_000,
      })),
    [dc10YearData]
  );

  const leaseUpChartData = useMemo(
    () =>
      dc10YearData.map((row) => ({
        year: `Y${row.year}`,
        "Occupancy %": row.occupancyPct,
      })),
    [dc10YearData]
  );

  const err = (key: string) => fieldError?.(key);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-xl font-semibold text-white">
          Step 1 — Data Centre Primary Revenue
        </h2>
        <p className="text-sm text-slate-400">
          Power capacity and white-space revenue. IT load, GFA, and white space
          are locked from Component 1 building configuration.
        </p>
      </div>

      {/* Section 1: Power Capacity Revenue */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Power Capacity Revenue
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Total IT Load (kW)
            </label>
            <input
              type="text"
              readOnly
              value={formatNumber(dcITLoadKw)}
              className={readOnlyClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              From C1:{" "}
              {(projectInfo.dataCentreITLoadCapacity || 0).toLocaleString()} MW
              × 1,000
            </p>
            {err("dcITLoad") && (
              <p className="mt-1 text-sm text-red-400">{err("dcITLoad")}</p>
            )}
          </div>

          <div>
            <AiInput
              label={`Rate per kW / month (${currency})`}
              type="number"
              value={ratePerKwMonth}
              onChange={(v) => persist({ ratePerKwMonth: Number(v) || 0 })}
              isAiGenerated={
                !!aiLeaseRate &&
                Math.abs(ratePerKwMonth - (aiLeaseRate || 0)) < 0.01
              }
              helperText="Wholesale colo lease rate"
            />
            {err("dcRatePerKw") && (
              <p className="mt-1 text-sm text-red-400">{err("dcRatePerKw")}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Monthly Power Revenue
            </label>
            <div className={readOnlyClass}>
              {formatMoney(revenue.monthlyPowerRevenue, currency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              IT Load (kW) × Rate per kW/month
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Annual Power Revenue
            </label>
            <div className={readOnlyClass}>
              {formatMoney(revenue.annualPowerRevenue, currency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Monthly × 12</p>
          </div>

          <div>
            <AiInput
              label="Annual Escalation (%)"
              type="percentage"
              value={annualEscalationPct}
              onChange={(v) =>
                persist({ annualEscalationPct: Number(v) || 0 })
              }
              helperText="Applied to power and space rates from Year 2"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Space Revenue */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Space Revenue
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Total Building GFA (sqft)
            </label>
            <input
              type="text"
              readOnly
              value={formatNumber(dcTotalBuildingGFA)}
              className={readOnlyClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              White Space Area (sqft)
            </label>
            <input
              type="text"
              readOnly
              value={formatNumber(dcWhiteSpaceArea)}
              className={readOnlyClass}
            />
            {err("dcWhiteSpace") && (
              <p className="mt-1 text-sm text-red-400">{err("dcWhiteSpace")}</p>
            )}
          </div>

          <div>
            <AiInput
              label="Occupancy Rate (%)"
              type="percentage"
              value={occupancyRate}
              onChange={(v) => persist({ occupancyRate: Number(v) || 0 })}
              helperText="Stabilized white-space occupancy"
            />
            {err("dcOccupancy") && (
              <p className="mt-1 text-sm text-red-400">{err("dcOccupancy")}</p>
            )}
          </div>

          <div>
            <AiInput
              label={`Rate per sqft / month — White Space (${currency})`}
              type="number"
              value={ratePerSqftMonth}
              onChange={(v) => persist({ ratePerSqftMonth: Number(v) || 0 })}
              helperText="White-space rental rate"
            />
            {err("dcRatePerSqft") && (
              <p className="mt-1 text-sm text-red-400">{err("dcRatePerSqft")}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Monthly Space Revenue
            </label>
            <div className={readOnlyClass}>
              {formatMoney(revenue.monthlySpaceRevenue, currency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              White Space × Occupancy × Rate per sqft/month
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Annual Space Revenue
            </label>
            <div className={readOnlyClass}>
              {formatMoney(revenue.annualSpaceRevenue, currency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Monthly × 12</p>
          </div>
        </div>
      </div>

      {/* Section 3: Total Revenue */}
      <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-6">
        <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-emerald-400/90">
          Total Revenue
        </h3>
        <p className="text-sm text-slate-400">Total Annual Revenue (Year 1)</p>
        <p className="mt-2 text-3xl font-bold text-emerald-400">
          {formatMoney(revenue.totalAnnualRevenue, currency)}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Annual Power Revenue + Annual Space Revenue (stabilized inputs; see
          10-year table for lease-up Year 1)
        </p>
      </div>

      {/* 10-Year Table */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR TABLE – DATA CENTRE REVENUE
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="border-r border-slate-700 px-2 py-3">Year</th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Occupancy %
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Rate / kW
                  <br />({currency})
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Power Rev
                  <br />({currency} M)
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Rate / sqft
                  <br />({currency})
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Space Rev
                  <br />({currency} M)
                </th>
                <th className="px-2 py-3">
                  Total Revenue
                  <br />({currency} M)
                </th>
              </tr>
            </thead>
            <tbody>
              {dc10YearData.map((row) => (
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
                      value={row.occupancyPct.toFixed(1)}
                      onChange={(e) =>
                        handleYearOverride(
                          row.year,
                          "occupancyPct",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={`w-16 rounded bg-slate-800 p-1 text-right ${
                        manualYearValues[row.year]?.occupancyPct != null
                          ? "border border-amber-500"
                          : "border border-transparent"
                      }`}
                    />
                  </td>
                  <td className="border-r border-slate-700 px-2 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={row.ratePerKw.toFixed(2)}
                      onChange={(e) =>
                        handleYearOverride(
                          row.year,
                          "ratePerKw",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={`w-20 rounded bg-slate-800 p-1 text-right ${
                        manualYearValues[row.year]?.ratePerKw != null
                          ? "border border-amber-500"
                          : "border border-transparent"
                      }`}
                    />
                  </td>
                  <td className="border-r border-slate-700 px-2 py-3 text-right font-mono text-emerald-400">
                    {(row.powerRevenue / 1_000_000).toFixed(2)}
                  </td>
                  <td className="border-r border-slate-700 px-2 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={row.ratePerSqft.toFixed(2)}
                      onChange={(e) =>
                        handleYearOverride(
                          row.year,
                          "ratePerSqft",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={`w-20 rounded bg-slate-800 p-1 text-right ${
                        manualYearValues[row.year]?.ratePerSqft != null
                          ? "border border-amber-500"
                          : "border border-transparent"
                      }`}
                    />
                  </td>
                  <td className="border-r border-slate-700 px-2 py-3 text-right font-mono text-teal-400">
                    {(row.spaceRevenue / 1_000_000).toFixed(2)}
                  </td>
                  <td className="px-2 py-3 text-right font-mono font-semibold text-emerald-400">
                    {(row.totalRevenue / 1_000_000).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800 font-bold text-white">
                <td className="border-r border-slate-700 px-2 py-3">
                  10-Year Total
                </td>
                <td
                  colSpan={2}
                  className="border-r border-slate-700 px-2 py-3"
                />
                <td className="border-r border-slate-700 px-2 py-3 text-right text-emerald-400">
                  {(
                    dc10YearData.reduce((s, r) => s + r.powerRevenue, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
                <td className="border-r border-slate-700 px-2 py-3" />
                <td className="border-r border-slate-700 px-2 py-3 text-right text-teal-400">
                  {(
                    dc10YearData.reduce((s, r) => s + r.spaceRevenue, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
                <td className="px-2 py-3 text-right text-emerald-400">
                  {(
                    dc10YearData.reduce((s, r) => s + r.totalRevenue, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-700 bg-slate-800/50 p-3 text-[10px] text-slate-400">
          <p>
            * Occupancy ramps in Year 1 (50% of stabilized), then full
            stabilized occupancy. Power and space both apply occupancy.
          </p>
          <p>
            ** Rates escalate annually at {annualEscalationPct.toFixed(1)}%: Year
            N rate = Year 1 rate × (1 + escalation%)^(N−1).
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">
            TOTAL REVENUE BY YEAR ({currency} M)
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
                    formatter={(val) => `${Number(val ?? 0).toFixed(2)}M`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
                  />
                  <Bar dataKey="Power Revenue" stackId="a" fill="#10b981" />
                  <Bar dataKey="Space Revenue" stackId="a" fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">
            OCCUPANCY / LEASE-UP CURVE (%)
          </h3>
          <div className="h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={leaseUpChartData}
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
                  <Legend
                    wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Occupancy %"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={{ fill: "#34d399", r: 3 }}
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
