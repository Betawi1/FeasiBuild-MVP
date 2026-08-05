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
import { AiInput } from "@/components/ui/AiInput";
import useFinModelStore, {
  calculateDataCentreOtherIncome,
  type DataCentreOtherIncome,
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

export type DataCentreOtherIncomeProjectionRow = {
  year: number;
  crossConnect: number;
  meteredPower: number;
  maintenanceMarkup: number;
  installation: number;
  total: number;
  isOverridden?: boolean;
};

export type DataCentreOtherIncomeYearOverride = Partial<{
  crossConnect: number;
  meteredPower: number;
  maintenanceMarkup: number;
  installation: number;
}>;

export function generateDataCentreOtherIncomeProjection(params: {
  annualCrossConnect: number;
  annualMeteredPower: number;
  annualMaintenanceMarkup: number;
  annualInstallation: number;
  annualEscalationPct: number;
  manualYearValues?: Record<number, DataCentreOtherIncomeYearOverride>;
}): DataCentreOtherIncomeProjectionRow[] {
  const escalation = (params.annualEscalationPct || 0) / 100;
  const rows: DataCentreOtherIncomeProjectionRow[] = [];

  for (let i = 1; i <= 10; i++) {
    const manual = params.manualYearValues?.[i] ?? {};
    const factor = Math.pow(1 + escalation, i - 1);
    const crossConnect =
      manual.crossConnect ?? params.annualCrossConnect * factor;
    const meteredPower =
      manual.meteredPower ?? params.annualMeteredPower * factor;
    const maintenanceMarkup =
      manual.maintenanceMarkup ?? params.annualMaintenanceMarkup * factor;
    // Installation / setup fees assumed Year-1 only (flat, not escalated)
    const installation =
      manual.installation ??
      (i === 1 ? params.annualInstallation : 0);
    rows.push({
      year: i,
      crossConnect,
      meteredPower,
      maintenanceMarkup,
      installation,
      total: crossConnect + meteredPower + maintenanceMarkup + installation,
      isOverridden: Object.keys(manual).length > 0,
    });
  }
  return rows;
}

export type DataCentreOtherIncomeStepErrors = Record<string, string>;

export function validateDataCentreOtherIncomeStep(
  otherIncome: DataCentreOtherIncome | undefined,
  primaryRevenue?: number
): DataCentreOtherIncomeStepErrors {
  const next: DataCentreOtherIncomeStepErrors = {};
  if (!Number.isFinite(primaryRevenue) || (primaryRevenue ?? 0) <= 0) {
    next.dcPrimaryRevenue =
      "Complete Step 1 (Primary Revenue) before configuring other income.";
  }
  if (
    !Number.isFinite(otherIncome?.crossConnectRatePerRackMonth ?? NaN) ||
    (otherIncome?.crossConnectRatePerRackMonth ?? 0) < 0
  ) {
    next.dcCrossConnectRate = "Cross-connect rate cannot be negative.";
  }
  if (
    !Number.isFinite(otherIncome?.powerPassThroughRatePerKwh ?? NaN) ||
    (otherIncome?.powerPassThroughRatePerKwh ?? 0) < 0
  ) {
    next.dcPowerPassThrough = "Power pass-through rate cannot be negative.";
  }
  if (
    !Number.isFinite(otherIncome?.powerUtilisationPct ?? NaN) ||
    (otherIncome?.powerUtilisationPct ?? 0) < 0 ||
    (otherIncome?.powerUtilisationPct ?? 0) > 100
  ) {
    next.dcPowerUtilisation = "Utilisation must be between 0% and 100%.";
  }
  if (
    !Number.isFinite(otherIncome?.maintenanceMarkupPercent ?? NaN) ||
    (otherIncome?.maintenanceMarkupPercent ?? 0) < 0
  ) {
    next.dcMaintenanceMarkup = "Maintenance markup cannot be negative.";
  }
  if (
    !Number.isFinite(otherIncome?.newRacksYear1 ?? NaN) ||
    (otherIncome?.newRacksYear1 ?? 0) < 0
  ) {
    next.dcNewRacks = "New racks cannot be negative.";
  }
  if (
    !Number.isFinite(otherIncome?.setupFeePerRack ?? NaN) ||
    (otherIncome?.setupFeePerRack ?? 0) < 0
  ) {
    next.dcSetupFee = "Setup fee cannot be negative.";
  }
  return next;
}

type Props = {
  fieldError?: (name: string) => string | undefined;
};

export default function C2S2OtherIncomeDataCentre({ fieldError }: Props = {}) {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const stored = useFinModelStore(
    (s) => s.operational.cashInflows?.dataCentreOtherIncome
  );
  const opExMaintenance = useFinModelStore(
    (s) => s.operational.cashInflows?.dataCentreOpEx?.annualMaintenance
  );
  const primaryRevenue = useFinModelStore(
    (s) => s.operational.cashInflows?.dataCentreRevenue
  );
  const updateCashInflows = useFinModelStore((s) => s.updateCashInflows);
  const currency = projectInfo.currency || "USD";

  const dcNumberOfRacks = projectInfo.dataCentreNumberOfRacks || 0;
  const dcITLoadKw = (projectInfo.dataCentreITLoadCapacity || 0) * 1000;
  const dcMaintenanceCost =
    opExMaintenance ??
    cashOutflows.dcMaintenanceCost ??
    stored?.maintenanceCostBase ??
    0;

  const defaultEscalation = primaryRevenue?.annualEscalationPct ?? 3;

  const crossConnectRate =
    stored?.crossConnectRatePerRackMonth ?? 75;
  const powerPassThroughRate =
    stored?.powerPassThroughRatePerKwh ?? 0.12;
  const powerUtilisation = stored?.powerUtilisationPct ?? 70;
  const maintenanceMarkupPercent =
    stored?.maintenanceMarkupPercent ?? 15;
  const newRacksYear1 = stored?.newRacksYear1 ?? 0;
  const setupFeePerRack = stored?.setupFeePerRack ?? 500;
  const annualEscalationPct =
    stored?.annualEscalationPct ?? defaultEscalation;

  const computed = useMemo(
    () =>
      calculateDataCentreOtherIncome({
        numberOfRacks: dcNumberOfRacks,
        crossConnectRatePerRackMonth: crossConnectRate,
        itLoadKw: dcITLoadKw,
        powerPassThroughRatePerKwh: powerPassThroughRate,
        powerUtilisationPct: powerUtilisation,
        maintenanceCostBase: dcMaintenanceCost,
        maintenanceMarkupPercent,
        newRacksYear1,
        setupFeePerRack,
        annualEscalationPct,
      }),
    [
      dcNumberOfRacks,
      crossConnectRate,
      dcITLoadKw,
      powerPassThroughRate,
      powerUtilisation,
      dcMaintenanceCost,
      maintenanceMarkupPercent,
      newRacksYear1,
      setupFeePerRack,
      annualEscalationPct,
    ]
  );

  const [manualYearValues, setManualYearValues] = useState<
    Record<number, DataCentreOtherIncomeYearOverride>
  >(() => stored?.manualYearValues ?? {});
  const manualYearValuesRef = useRef(manualYearValues);
  manualYearValuesRef.current = manualYearValues;

  const persist = useCallback(
    (partial: Partial<DataCentreOtherIncome>) => {
      const next = calculateDataCentreOtherIncome({
        numberOfRacks: dcNumberOfRacks,
        crossConnectRatePerRackMonth:
          partial.crossConnectRatePerRackMonth ?? crossConnectRate,
        itLoadKw: dcITLoadKw,
        powerPassThroughRatePerKwh:
          partial.powerPassThroughRatePerKwh ?? powerPassThroughRate,
        powerUtilisationPct:
          partial.powerUtilisationPct ?? powerUtilisation,
        maintenanceCostBase:
          partial.maintenanceCostBase ?? dcMaintenanceCost,
        maintenanceMarkupPercent:
          partial.maintenanceMarkupPercent ?? maintenanceMarkupPercent,
        newRacksYear1: partial.newRacksYear1 ?? newRacksYear1,
        setupFeePerRack: partial.setupFeePerRack ?? setupFeePerRack,
        annualEscalationPct:
          partial.annualEscalationPct ?? annualEscalationPct,
      });
      updateCashInflows(
        {
          dataCentreOtherIncome: {
            ...next,
            manualYearValues:
              partial.manualYearValues ?? manualYearValuesRef.current,
          },
        },
        "operational"
      );
    },
    [
      dcNumberOfRacks,
      crossConnectRate,
      dcITLoadKw,
      powerPassThroughRate,
      powerUtilisation,
      dcMaintenanceCost,
      maintenanceMarkupPercent,
      newRacksYear1,
      setupFeePerRack,
      annualEscalationPct,
      updateCashInflows,
    ]
  );

  const handleYearOverride = useCallback(
    (
      year: number,
      field: keyof DataCentreOtherIncomeYearOverride,
      absoluteValue: number
    ) => {
      setManualYearValues((prev) => ({
        ...prev,
        [year]: { ...prev[year], [field]: absoluteValue },
      }));
    },
    []
  );

  // Persist year overrides after local state commits (never inside setState/render)
  useEffect(() => {
    const base = calculateDataCentreOtherIncome({
      numberOfRacks: dcNumberOfRacks,
      crossConnectRatePerRackMonth: crossConnectRate,
      itLoadKw: dcITLoadKw,
      powerPassThroughRatePerKwh: powerPassThroughRate,
      powerUtilisationPct: powerUtilisation,
      maintenanceCostBase: dcMaintenanceCost,
      maintenanceMarkupPercent,
      newRacksYear1,
      setupFeePerRack,
      annualEscalationPct,
    });
    const current =
      useFinModelStore.getState().operational.cashInflows
        ?.dataCentreOtherIncome;
    if (
      JSON.stringify(current?.manualYearValues ?? {}) ===
      JSON.stringify(manualYearValues)
    ) {
      return;
    }
    updateCashInflows(
      { dataCentreOtherIncome: { ...base, manualYearValues } },
      "operational"
    );
  }, [
    manualYearValues,
    dcNumberOfRacks,
    crossConnectRate,
    dcITLoadKw,
    powerPassThroughRate,
    powerUtilisation,
    dcMaintenanceCost,
    maintenanceMarkupPercent,
    newRacksYear1,
    setupFeePerRack,
    annualEscalationPct,
    updateCashInflows,
  ]);

  useEffect(() => {
    persist({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dcNumberOfRacks, dcITLoadKw, dcMaintenanceCost]);

  const projection = useMemo(
    () =>
      generateDataCentreOtherIncomeProjection({
        annualCrossConnect: computed.annualCrossConnect,
        annualMeteredPower: computed.annualMeteredPower,
        annualMaintenanceMarkup: computed.annualMaintenanceMarkup,
        annualInstallation: computed.annualInstallation,
        annualEscalationPct,
        manualYearValues,
      }),
    [computed, annualEscalationPct, manualYearValues]
  );

  const chartData = useMemo(
    () =>
      projection.map((row) => ({
        year: `Y${row.year}`,
        "Cross-Connect": row.crossConnect / 1_000_000,
        "Metered Power": row.meteredPower / 1_000_000,
        "Maint. Markup": row.maintenanceMarkup / 1_000_000,
        Installation: row.installation / 1_000_000,
      })),
    [projection]
  );

  const err = (key: string) => fieldError?.(key);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-xl font-semibold text-white">
          Step 2 — Data Centre Other Income
        </h2>
        <p className="text-sm text-slate-400">
          Cross-connect, metered power pass-through, maintenance markup, and
          installation / setup fees. Rack count and IT load are locked from
          Component 1.
        </p>
        {err("dcPrimaryRevenue") && (
          <p className="mt-2 text-sm text-red-400">{err("dcPrimaryRevenue")}</p>
        )}
      </div>

      {/* 1. Cross-Connect */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Cross-Connect Fees
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Number of Racks
            </label>
            <input
              type="text"
              readOnly
              value={formatNumber(dcNumberOfRacks)}
              className={readOnlyClass}
            />
            <p className="mt-1 text-xs text-slate-500">From C1 Step 5</p>
          </div>
          <div>
            <AiInput
              label={`Cross-Connect Rate (${currency} / rack / month)`}
              type="number"
              value={crossConnectRate}
              onChange={(v) =>
                persist({
                  crossConnectRatePerRackMonth: Number(v) || 0,
                })
              }
            />
            {err("dcCrossConnectRate") && (
              <p className="mt-1 text-sm text-red-400">
                {err("dcCrossConnectRate")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Annual Cross-Connect Revenue
            </label>
            <div className={readOnlyClass}>
              {formatMoney(computed.annualCrossConnect, currency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Racks × Rate × 12
            </p>
          </div>
        </div>
      </div>

      {/* 2. Metered Power */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Metered Power (Pass-Through)
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          </div>
          <div>
            <AiInput
              label={`Power Pass-Through (${currency} / kWh)`}
              type="number"
              value={powerPassThroughRate}
              onChange={(v) =>
                persist({
                  powerPassThroughRatePerKwh: Number(v) || 0,
                })
              }
            />
            {err("dcPowerPassThrough") && (
              <p className="mt-1 text-sm text-red-400">
                {err("dcPowerPassThrough")}
              </p>
            )}
          </div>
          <div>
            <AiInput
              label="Utilisation (%)"
              type="percentage"
              value={powerUtilisation}
              onChange={(v) =>
                persist({ powerUtilisationPct: Number(v) || 0 })
              }
            />
            {err("dcPowerUtilisation") && (
              <p className="mt-1 text-sm text-red-400">
                {err("dcPowerUtilisation")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Annual Metered Power Revenue
            </label>
            <div className={readOnlyClass}>
              {formatMoney(computed.annualMeteredPower, currency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              kW × Utilisation × 8,760 × $/kWh
            </p>
          </div>
        </div>
      </div>

      {/* 3. Maintenance Markup */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Maintenance Markup
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Maintenance Cost (from OpEx)
            </label>
            <input
              type="text"
              readOnly
              value={formatMoney(dcMaintenanceCost, currency)}
              className={readOnlyClass}
            />
            <p className="mt-1 text-xs text-amber-400/90">
              {dcMaintenanceCost > 0
                ? "Synced from OpEx / store"
                : "Placeholder 0 until C2S3 OpEx is configured"}
            </p>
          </div>
          <div>
            <AiInput
              label="Markup (%)"
              type="percentage"
              value={maintenanceMarkupPercent}
              onChange={(v) =>
                persist({
                  maintenanceMarkupPercent: Number(v) || 0,
                })
              }
            />
            {err("dcMaintenanceMarkup") && (
              <p className="mt-1 text-sm text-red-400">
                {err("dcMaintenanceMarkup")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Annual Maintenance Markup Revenue
            </label>
            <div className={readOnlyClass}>
              {formatMoney(computed.annualMaintenanceMarkup, currency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Maintenance Cost × Markup %
            </p>
          </div>
        </div>
      </div>

      {/* 4. Installation */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Installation / Setup Fees
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <AiInput
              label="Number of New Racks (Year 1)"
              type="number"
              value={newRacksYear1}
              onChange={(v) =>
                persist({ newRacksYear1: Number(v) || 0 })
              }
            />
            {err("dcNewRacks") && (
              <p className="mt-1 text-sm text-red-400">{err("dcNewRacks")}</p>
            )}
          </div>
          <div>
            <AiInput
              label={`Setup Fee (${currency} / rack)`}
              type="number"
              value={setupFeePerRack}
              onChange={(v) =>
                persist({ setupFeePerRack: Number(v) || 0 })
              }
            />
            {err("dcSetupFee") && (
              <p className="mt-1 text-sm text-red-400">{err("dcSetupFee")}</p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Annual Installation Revenue
            </label>
            <div className={readOnlyClass}>
              {formatMoney(computed.annualInstallation, currency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              New Racks × Setup Fee (Year 1 only in projection)
            </p>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-6">
        <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-emerald-400/90">
          Total Other Income
        </h3>
        <p className="text-sm text-slate-400">
          Total Annual Other Income (Year 1)
        </p>
        <p className="mt-2 text-3xl font-bold text-emerald-400">
          {formatMoney(computed.totalOtherIncome, currency)}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Cross-Connect + Metered Power + Maint. Markup + Installation
        </p>
      </div>

      {/* 10-Year Table */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR TABLE – OTHER INCOME ({currency} M)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="border-r border-slate-700 px-2 py-3">Year</th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Cross-Connect
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Metered Power
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Maint. Markup
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Installation
                </th>
                <th className="px-2 py-3">Total Other Income</th>
              </tr>
            </thead>
            <tbody>
              {projection.map((row) => {
                const streams = [
                  {
                    key: "crossConnect" as const,
                    value: row.crossConnect,
                    color: "text-blue-400",
                  },
                  {
                    key: "meteredPower" as const,
                    value: row.meteredPower,
                    color: "text-emerald-400",
                  },
                  {
                    key: "maintenanceMarkup" as const,
                    value: row.maintenanceMarkup,
                    color: "text-amber-400",
                  },
                  {
                    key: "installation" as const,
                    value: row.installation,
                    color: "text-violet-400",
                  },
                ];
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
                      Y{row.year}
                    </td>
                    {streams.map(({ key, value }) => (
                      <td
                        key={key}
                        className="border-r border-slate-700 px-2 py-3"
                      >
                        <input
                          type="number"
                          step="0.01"
                          value={(value / 1_000_000).toFixed(2)}
                          onChange={(e) =>
                            handleYearOverride(
                              row.year,
                              key,
                              (parseFloat(e.target.value) || 0) * 1_000_000
                            )
                          }
                          className={`w-24 rounded bg-slate-800 p-1 text-right ${
                            manualYearValues[row.year]?.[key] != null
                              ? "border border-amber-500"
                              : "border border-transparent"
                          }`}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-3 text-right font-mono font-semibold text-emerald-400">
                      {(row.total / 1_000_000).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-800 font-bold text-white">
                <td className="border-r border-slate-700 px-2 py-3">
                  10-Year Total
                </td>
                <td className="border-r border-slate-700 px-2 py-3 text-right text-blue-400">
                  {(
                    projection.reduce((s, r) => s + r.crossConnect, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
                <td className="border-r border-slate-700 px-2 py-3 text-right text-emerald-400">
                  {(
                    projection.reduce((s, r) => s + r.meteredPower, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
                <td className="border-r border-slate-700 px-2 py-3 text-right text-amber-400">
                  {(
                    projection.reduce((s, r) => s + r.maintenanceMarkup, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
                <td className="border-r border-slate-700 px-2 py-3 text-right text-violet-400">
                  {(
                    projection.reduce((s, r) => s + r.installation, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
                <td className="px-2 py-3 text-right text-emerald-400">
                  {(
                    projection.reduce((s, r) => s + r.total, 0) / 1_000_000
                  ).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-700 bg-slate-800/50 p-3 text-[10px] text-slate-400">
          <p>
            * Cross-connect, metered power, and maintenance markup escalate at{" "}
            {annualEscalationPct.toFixed(1)}% per year. Installation fees are
            Year 1 only.
          </p>
        </div>
      </div>

      {/* Stacked chart */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Other Income Composition (Stacked) — {currency} M
        </h3>
        <div className="h-72 w-full">
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
                <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
                <Bar dataKey="Cross-Connect" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Metered Power" stackId="a" fill="#10b981" />
                <Bar dataKey="Maint. Markup" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Installation" stackId="a" fill="#8b5cf6" />
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
