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
import { resolveDataCentreCapEx } from "@/app/operational/cash-outflows/steps/DataCentreConstructionCostsStep";
import useFinModelStore, {
  calculateDataCentreOpEx,
  type DataCentreOpEx,
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

function formatNumber(n: number, digits = 0): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 ? Math.min(digits, 2) : 0,
  });
}

function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export type DataCentreOpExProjectionRow = {
  year: number;
  power: number;
  maintenance: number;
  labor: number;
  insurance: number;
  tax: number;
  security: number;
  utilities: number;
  mgmtFee: number;
  gAndA: number;
  total: number;
  isOverridden?: boolean;
};

export type DataCentreOpExYearOverride = Partial<{
  power: number;
  maintenance: number;
  labor: number;
  insurance: number;
  tax: number;
  security: number;
  utilities: number;
  mgmtFee: number;
  gAndA: number;
}>;

export function generateDataCentreOpExProjection(params: {
  annualPowerCost: number;
  annualMaintenance: number;
  annualLabor: number;
  annualInsurance: number;
  annualPropertyTax: number;
  annualSecurity: number;
  annualWaterUtilities: number;
  annualMgmtFee: number;
  annualGAndA: number;
  annualEscalationPct: number;
  inflationPct: number;
  manualYearValues?: Record<number, DataCentreOpExYearOverride>;
}): DataCentreOpExProjectionRow[] {
  const rentEsc = (params.annualEscalationPct || 0) / 100;
  const inflation = (params.inflationPct || 0) / 100;
  const rows: DataCentreOpExProjectionRow[] = [];

  for (let i = 1; i <= 10; i++) {
    const manual = params.manualYearValues?.[i] ?? {};
    const rentFactor = Math.pow(1 + rentEsc, i - 1);
    const infFactor = Math.pow(1 + inflation, i - 1);
    const power = manual.power ?? params.annualPowerCost * rentFactor;
    const maintenance =
      manual.maintenance ?? params.annualMaintenance * rentFactor;
    const labor = manual.labor ?? params.annualLabor * infFactor;
    const insurance =
      manual.insurance ?? params.annualInsurance * rentFactor;
    const tax = manual.tax ?? params.annualPropertyTax * rentFactor;
    const security = manual.security ?? params.annualSecurity * infFactor;
    const utilities =
      manual.utilities ?? params.annualWaterUtilities * infFactor;
    const mgmtFee = manual.mgmtFee ?? params.annualMgmtFee * rentFactor;
    const gAndA = manual.gAndA ?? params.annualGAndA * rentFactor;
    rows.push({
      year: i,
      power,
      maintenance,
      labor,
      insurance,
      tax,
      security,
      utilities,
      mgmtFee,
      gAndA,
      total:
        power +
        maintenance +
        labor +
        insurance +
        tax +
        security +
        utilities +
        mgmtFee +
        gAndA,
      isOverridden: Object.keys(manual).length > 0,
    });
  }
  return rows;
}

export type DataCentreOpExStepErrors = Record<string, string>;

export function validateDataCentreOpExStep(
  opEx: DataCentreOpEx | undefined,
  primaryRevenue?: number
): DataCentreOpExStepErrors {
  const next: DataCentreOpExStepErrors = {};
  if (!Number.isFinite(primaryRevenue) || (primaryRevenue ?? 0) <= 0) {
    next.dcPrimaryRevenue =
      "Complete Step 1 (Primary Revenue) before configuring OpEx.";
  }
  if (
    !Number.isFinite(opEx?.electricityPricePerKwh ?? NaN) ||
    (opEx?.electricityPricePerKwh ?? 0) <= 0
  ) {
    next.dcElectricityPrice = "Electricity price ($/kWh) is required.";
  }
  if (
    !Number.isFinite(opEx?.maintenanceRatePct ?? NaN) ||
    (opEx?.maintenanceRatePct ?? 0) < 0
  ) {
    next.dcMaintenanceRate = "Maintenance rate cannot be negative.";
  }
  if (
    !Number.isFinite(opEx?.numberOfStaff ?? NaN) ||
    (opEx?.numberOfStaff ?? 0) < 0
  ) {
    next.dcNumberOfStaff = "Number of staff cannot be negative.";
  }
  if (
    !Number.isFinite(opEx?.averageSalary ?? NaN) ||
    (opEx?.averageSalary ?? 0) < 0
  ) {
    next.dcAverageSalary = "Average salary cannot be negative.";
  }
  if (
    !Number.isFinite(opEx?.insuranceRatePct ?? NaN) ||
    (opEx?.insuranceRatePct ?? 0) < 0
  ) {
    next.dcInsuranceRate = "Insurance rate cannot be negative.";
  }
  if (
    !Number.isFinite(opEx?.propertyTaxRatePct ?? NaN) ||
    (opEx?.propertyTaxRatePct ?? 0) < 0
  ) {
    next.dcPropertyTaxRate = "Property tax rate cannot be negative.";
  }
  if (
    !Number.isFinite(opEx?.gAndAPercent ?? NaN) ||
    (opEx?.gAndAPercent ?? 0) < 0 ||
    (opEx?.gAndAPercent ?? 0) > 100
  ) {
    next.dcGnAPercent = "G&A % must be between 0 and 100.";
  }
  if (
    !Number.isFinite(opEx?.mgmtFeePercent ?? NaN) ||
    (opEx?.mgmtFeePercent ?? 0) < 0 ||
    (opEx?.mgmtFeePercent ?? 0) > 100
  ) {
    next.dcMgmtFeePercent = "Management fee % must be between 0 and 100.";
  }
  return next;
}

type Props = {
  fieldError?: (name: string) => string | undefined;
};

export default function C2S3OperatingExpensesDataCentre({
  fieldError,
}: Props = {}) {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const stored = useFinModelStore(
    (s) => s.operational.cashInflows?.dataCentreOpEx
  );
  const primaryRevenue = useFinModelStore(
    (s) => s.operational.cashInflows?.dataCentreRevenue
  );
  const updateCashInflows = useFinModelStore((s) => s.updateCashInflows);
  const updateCashOutflows = useFinModelStore((s) => s.updateCashOutflows);
  const currency = projectInfo.currency || "USD";

  const capEx = useMemo(
    () => resolveDataCentreCapEx(projectInfo),
    [projectInfo]
  );

  const dcITLoadKw = (projectInfo.dataCentreITLoadCapacity || 0) * 1000;
  const dcPUE = projectInfo.dataCentrePUE || 1.35;
  const dcMECost = capEx.meCost || 0;
  const dcTotalCapEx = capEx.totalCapEx || 0;
  const dcTotalAnnualRevenue = primaryRevenue?.totalAnnualRevenue || 0;
  const defaultEscalation = primaryRevenue?.annualEscalationPct ?? 3;

  const electricityPrice = stored?.electricityPricePerKwh ?? 0.12;
  const maintenanceRate = stored?.maintenanceRatePct ?? 3;
  const numberOfStaff = stored?.numberOfStaff ?? 12;
  const averageSalary = stored?.averageSalary ?? 60000;
  const insuranceRate = stored?.insuranceRatePct ?? 0.4;
  const propertyTaxRate = stored?.propertyTaxRatePct ?? 1.0;
  const annualSecurity = stored?.annualSecurity ?? 150000;
  const annualWaterUtilities = stored?.annualWaterUtilities ?? 50000;
  const gAndAPercent = stored?.gAndAPercent ?? 2;
  const mgmtFeePercent = stored?.mgmtFeePercent ?? 3;
  const annualEscalationPct =
    stored?.annualEscalationPct ?? defaultEscalation;
  const inflationPct = stored?.inflationPct ?? 3;

  const computed = useMemo(
    () =>
      calculateDataCentreOpEx({
        itLoadKw: dcITLoadKw,
        pue: dcPUE,
        electricityPricePerKwh: electricityPrice,
        meCostBase: dcMECost,
        maintenanceRatePct: maintenanceRate,
        numberOfStaff,
        averageSalary,
        totalCapExBase: dcTotalCapEx,
        insuranceRatePct: insuranceRate,
        propertyTaxRatePct: propertyTaxRate,
        annualSecurity,
        annualWaterUtilities,
        totalAnnualRevenueBase: dcTotalAnnualRevenue,
        gAndAPercent,
        mgmtFeePercent,
        annualEscalationPct,
        inflationPct,
      }),
    [
      dcITLoadKw,
      dcPUE,
      electricityPrice,
      dcMECost,
      maintenanceRate,
      numberOfStaff,
      averageSalary,
      dcTotalCapEx,
      insuranceRate,
      propertyTaxRate,
      annualSecurity,
      annualWaterUtilities,
      dcTotalAnnualRevenue,
      gAndAPercent,
      mgmtFeePercent,
      annualEscalationPct,
      inflationPct,
    ]
  );

  const [manualYearValues, setManualYearValues] = useState<
    Record<number, DataCentreOpExYearOverride>
  >(() => stored?.manualYearValues ?? {});
  const manualYearValuesRef = useRef(manualYearValues);
  manualYearValuesRef.current = manualYearValues;

  const persist = useCallback(
    (partial: Partial<DataCentreOpEx>) => {
      const next = calculateDataCentreOpEx({
        itLoadKw: dcITLoadKw,
        pue: dcPUE,
        electricityPricePerKwh:
          partial.electricityPricePerKwh ?? electricityPrice,
        meCostBase: dcMECost,
        maintenanceRatePct: partial.maintenanceRatePct ?? maintenanceRate,
        numberOfStaff: partial.numberOfStaff ?? numberOfStaff,
        averageSalary: partial.averageSalary ?? averageSalary,
        totalCapExBase: dcTotalCapEx,
        insuranceRatePct: partial.insuranceRatePct ?? insuranceRate,
        propertyTaxRatePct: partial.propertyTaxRatePct ?? propertyTaxRate,
        annualSecurity: partial.annualSecurity ?? annualSecurity,
        annualWaterUtilities:
          partial.annualWaterUtilities ?? annualWaterUtilities,
        totalAnnualRevenueBase: dcTotalAnnualRevenue,
        gAndAPercent: partial.gAndAPercent ?? gAndAPercent,
        mgmtFeePercent: partial.mgmtFeePercent ?? mgmtFeePercent,
        annualEscalationPct:
          partial.annualEscalationPct ?? annualEscalationPct,
        inflationPct: partial.inflationPct ?? inflationPct,
      });
      updateCashInflows(
        {
          dataCentreOpEx: {
            ...next,
            manualYearValues:
              partial.manualYearValues ?? manualYearValuesRef.current,
          },
        },
        "operational"
      );
      // Sync maintenance base for C2S2 markup revenue
      const prevOther =
        useFinModelStore.getState().operational.cashInflows
          ?.dataCentreOtherIncome;
      if (prevOther) {
        updateCashInflows(
          {
            dataCentreOtherIncome: {
              ...prevOther,
              maintenanceCostBase: next.annualMaintenance,
              annualMaintenanceMarkup:
                next.annualMaintenance *
                ((prevOther.maintenanceMarkupPercent || 0) / 100),
              totalOtherIncome:
                (prevOther.annualCrossConnect || 0) +
                (prevOther.annualMeteredPower || 0) +
                next.annualMaintenance *
                  ((prevOther.maintenanceMarkupPercent || 0) / 100) +
                (prevOther.annualInstallation || 0),
            },
          },
          "operational"
        );
      }
      updateCashOutflows(
        { dcMaintenanceCost: next.annualMaintenance },
        "operational"
      );
    },
    [
      dcITLoadKw,
      dcPUE,
      electricityPrice,
      dcMECost,
      maintenanceRate,
      numberOfStaff,
      averageSalary,
      dcTotalCapEx,
      insuranceRate,
      propertyTaxRate,
      annualSecurity,
      annualWaterUtilities,
      dcTotalAnnualRevenue,
      gAndAPercent,
      mgmtFeePercent,
      annualEscalationPct,
      inflationPct,
      updateCashInflows,
      updateCashOutflows,
    ]
  );

  const handleYearOverride = useCallback(
    (
      year: number,
      field: keyof DataCentreOpExYearOverride,
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
    const base = calculateDataCentreOpEx({
      itLoadKw: dcITLoadKw,
      pue: dcPUE,
      electricityPricePerKwh: electricityPrice,
      meCostBase: dcMECost,
      maintenanceRatePct: maintenanceRate,
      numberOfStaff,
      averageSalary,
      totalCapExBase: dcTotalCapEx,
      insuranceRatePct: insuranceRate,
      propertyTaxRatePct: propertyTaxRate,
      annualSecurity,
      annualWaterUtilities,
      totalAnnualRevenueBase: dcTotalAnnualRevenue,
      gAndAPercent,
      mgmtFeePercent,
      annualEscalationPct,
      inflationPct,
    });
    const current =
      useFinModelStore.getState().operational.cashInflows?.dataCentreOpEx;
    if (
      JSON.stringify(current?.manualYearValues ?? {}) ===
      JSON.stringify(manualYearValues)
    ) {
      return;
    }
    updateCashInflows(
      { dataCentreOpEx: { ...base, manualYearValues } },
      "operational"
    );
  }, [
    manualYearValues,
    dcITLoadKw,
    dcPUE,
    electricityPrice,
    dcMECost,
    maintenanceRate,
    numberOfStaff,
    averageSalary,
    dcTotalCapEx,
    insuranceRate,
    propertyTaxRate,
    annualSecurity,
    annualWaterUtilities,
    dcTotalAnnualRevenue,
    gAndAPercent,
    mgmtFeePercent,
    annualEscalationPct,
    inflationPct,
    updateCashInflows,
  ]);

  useEffect(() => {
    persist({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dcITLoadKw, dcPUE, dcMECost, dcTotalCapEx, dcTotalAnnualRevenue]);

  const projection = useMemo(
    () =>
      generateDataCentreOpExProjection({
        annualPowerCost: computed.annualPowerCost,
        annualMaintenance: computed.annualMaintenance,
        annualLabor: computed.annualLabor,
        annualInsurance: computed.annualInsurance,
        annualPropertyTax: computed.annualPropertyTax,
        annualSecurity: computed.annualSecurity,
        annualWaterUtilities: computed.annualWaterUtilities,
        annualMgmtFee: computed.annualMgmtFee,
        annualGAndA: computed.annualGAndA,
        annualEscalationPct,
        inflationPct,
        manualYearValues,
      }),
    [computed, annualEscalationPct, inflationPct, manualYearValues]
  );

  const chartData = useMemo(
    () =>
      projection.map((row) => ({
        year: `Y${row.year}`,
        Power: row.power / 1_000_000,
        Maint: row.maintenance / 1_000_000,
        Labor: row.labor / 1_000_000,
        Insur: row.insurance / 1_000_000,
        Tax: row.tax / 1_000_000,
        Security: row.security / 1_000_000,
        Utilities: row.utilities / 1_000_000,
        "Mgmt Fee": row.mgmtFee / 1_000_000,
        "G&A": row.gAndA / 1_000_000,
      })),
    [projection]
  );

  const err = (key: string) => fieldError?.(key);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-xl font-semibold text-white">
          Step 3 — Data Centre Operating Expenses
        </h2>
        <p className="text-sm text-slate-400">
          Power, maintenance, labor, insurance/tax, security/utilities, and
          G&amp;A / management fee. CapEx and M&amp;E bases come from Component
          1; revenue base from Step 1.
        </p>
        {err("dcPrimaryRevenue") && (
          <p className="mt-2 text-sm text-red-400">{err("dcPrimaryRevenue")}</p>
        )}
      </div>

      {/* Power */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Power Cost (Facility Load)
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              IT Load (kW)
            </label>
            <input
              type="text"
              readOnly
              value={formatNumber(dcITLoadKw)}
              className={readOnlyClass}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              PUE
            </label>
            <input
              type="text"
              readOnly
              value={formatNumber(dcPUE, 2)}
              className={readOnlyClass}
            />
          </div>
          <div>
            <AiInput
              label={`Electricity Price (${currency} / kWh)`}
              type="number"
              value={electricityPrice}
              onChange={(v) =>
                persist({ electricityPricePerKwh: Number(v) || 0 })
              }
            />
            {err("dcElectricityPrice") && (
              <p className="mt-1 text-sm text-red-400">
                {err("dcElectricityPrice")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Annual Power Cost
            </label>
            <div className={readOnlyClass}>
              {formatMoney(computed.annualPowerCost, currency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              kW × PUE × 8,760 × $/kWh
            </p>
          </div>
        </div>
      </div>

      {/* Maintenance */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Maintenance &amp; Repairs
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              M&amp;E CapEx Base
            </label>
            <input
              type="text"
              readOnly
              value={formatMoney(dcMECost, currency)}
              className={readOnlyClass}
            />
            <p className="mt-1 text-xs text-slate-500">From C1S6</p>
          </div>
          <div>
            <AiInput
              label="Maintenance Rate (% of M&E)"
              type="percentage"
              value={maintenanceRate}
              onChange={(v) =>
                persist({ maintenanceRatePct: Number(v) || 0 })
              }
            />
            {err("dcMaintenanceRate") && (
              <p className="mt-1 text-sm text-red-400">
                {err("dcMaintenanceRate")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Annual Maintenance
            </label>
            <div className={readOnlyClass}>
              {formatMoney(computed.annualMaintenance, currency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Synced to C2S2 for maintenance markup
            </p>
          </div>
        </div>
      </div>

      {/* Labor */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Labor &amp; Staffing
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <AiInput
              label="Number of Staff"
              type="number"
              value={numberOfStaff}
              onChange={(v) =>
                persist({ numberOfStaff: Number(v) || 0 })
              }
            />
            {err("dcNumberOfStaff") && (
              <p className="mt-1 text-sm text-red-400">
                {err("dcNumberOfStaff")}
              </p>
            )}
          </div>
          <div>
            <AiInput
              label={`Average Salary (${currency} / year)`}
              type="number"
              value={averageSalary}
              onChange={(v) =>
                persist({ averageSalary: Number(v) || 0 })
              }
            />
            {err("dcAverageSalary") && (
              <p className="mt-1 text-sm text-red-400">
                {err("dcAverageSalary")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Annual Labor Cost
            </label>
            <div className={readOnlyClass}>
              {formatMoney(computed.annualLabor, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Insurance & Tax */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Insurance &amp; Property Tax
        </h3>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Total CapEx Base
          </label>
          <input
            type="text"
            readOnly
            value={formatMoney(dcTotalCapEx, currency)}
            className={`${readOnlyClass} max-w-md`}
          />
          <p className="mt-1 text-xs text-slate-500">From C1S6 Total CapEx</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <AiInput
              label="Insurance Rate (% of CapEx)"
              type="percentage"
              value={insuranceRate}
              onChange={(v) =>
                persist({ insuranceRatePct: Number(v) || 0 })
              }
            />
            {err("dcInsuranceRate") && (
              <p className="mt-1 text-sm text-red-400">
                {err("dcInsuranceRate")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Annual Insurance
            </label>
            <div className={readOnlyClass}>
              {formatMoney(computed.annualInsurance, currency)}
            </div>
          </div>
          <div>
            <AiInput
              label="Property Tax Rate (% of CapEx)"
              type="percentage"
              value={propertyTaxRate}
              onChange={(v) =>
                persist({ propertyTaxRatePct: Number(v) || 0 })
              }
            />
            {err("dcPropertyTaxRate") && (
              <p className="mt-1 text-sm text-red-400">
                {err("dcPropertyTaxRate")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Annual Property Tax
            </label>
            <div className={readOnlyClass}>
              {formatMoney(computed.annualPropertyTax, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Security & Utilities */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Security &amp; Water / Utilities
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <AiInput
              label={`Annual Security Cost (${currency})`}
              type="number"
              value={annualSecurity}
              onChange={(v) =>
                persist({ annualSecurity: Number(v) || 0 })
              }
            />
          </div>
          <div>
            <AiInput
              label={`Annual Water / Utilities (${currency})`}
              type="number"
              value={annualWaterUtilities}
              onChange={(v) =>
                persist({ annualWaterUtilities: Number(v) || 0 })
              }
            />
          </div>
        </div>
      </div>

      {/* G&A & Mgmt */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          G&amp;A &amp; Management Fee
        </h3>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Total Annual Revenue (Year 1)
          </label>
          <input
            type="text"
            readOnly
            value={formatMoney(dcTotalAnnualRevenue, currency)}
            className={`${readOnlyClass} max-w-md`}
          />
          <p className="mt-1 text-xs text-slate-500">From C2S1 Primary Revenue</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <AiInput
              label="G&A (% of Revenue)"
              type="percentage"
              value={gAndAPercent}
              onChange={(v) => persist({ gAndAPercent: Number(v) || 0 })}
            />
            {err("dcGnAPercent") && (
              <p className="mt-1 text-sm text-red-400">{err("dcGnAPercent")}</p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Annual G&amp;A
            </label>
            <div className={readOnlyClass}>
              {formatMoney(computed.annualGAndA, currency)}
            </div>
          </div>
          <div>
            <AiInput
              label="Management Fee (% of Revenue)"
              type="percentage"
              value={mgmtFeePercent}
              onChange={(v) => persist({ mgmtFeePercent: Number(v) || 0 })}
            />
            {err("dcMgmtFeePercent") && (
              <p className="mt-1 text-sm text-red-400">
                {err("dcMgmtFeePercent")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Annual Management Fee
            </label>
            <div className={readOnlyClass}>
              {formatMoney(computed.annualMgmtFee, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-6">
        <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-emerald-400/90">
          Total Operating Expenses
        </h3>
        <p className="text-sm text-slate-400">Total Annual OpEx (Year 1)</p>
        <p className="mt-2 text-3xl font-bold text-emerald-400">
          {formatMoney(computed.totalAnnualOpEx, currency)}
        </p>
      </div>

      {/* 10-Year Table */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR EXPENSES TABLE ({currency} M)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="border-r border-slate-700 px-2 py-3">Year</th>
                <th className="border-r border-slate-700 px-2 py-3">Power</th>
                <th className="border-r border-slate-700 px-2 py-3">Maint</th>
                <th className="border-r border-slate-700 px-2 py-3">Labor</th>
                <th className="border-r border-slate-700 px-2 py-3">Insur</th>
                <th className="border-r border-slate-700 px-2 py-3">Tax</th>
                <th className="border-r border-slate-700 px-2 py-3">Security</th>
                <th className="border-r border-slate-700 px-2 py-3">Util</th>
                <th className="border-r border-slate-700 px-2 py-3">Mgmt Fee</th>
                <th className="border-r border-slate-700 px-2 py-3">G&amp;A</th>
                <th className="px-2 py-3">Total OpEx</th>
              </tr>
            </thead>
            <tbody>
              {projection.map((row) => {
                const streams: {
                  key: keyof DataCentreOpExYearOverride;
                  value: number;
                }[] = [
                  { key: "power", value: row.power },
                  { key: "maintenance", value: row.maintenance },
                  { key: "labor", value: row.labor },
                  { key: "insurance", value: row.insurance },
                  { key: "tax", value: row.tax },
                  { key: "security", value: row.security },
                  { key: "utilities", value: row.utilities },
                  { key: "mgmtFee", value: row.mgmtFee },
                  { key: "gAndA", value: row.gAndA },
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
                          className={`w-20 rounded bg-slate-800 p-1 text-right ${
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
                {(
                  [
                    "power",
                    "maintenance",
                    "labor",
                    "insurance",
                    "tax",
                    "security",
                    "utilities",
                    "mgmtFee",
                    "gAndA",
                    "total",
                  ] as const
                ).map((key) => (
                  <td
                    key={key}
                    className={`border-r border-slate-700 px-2 py-3 text-right last:border-r-0 ${
                      key === "total" ? "text-emerald-400" : ""
                    }`}
                  >
                    {(
                      projection.reduce((s, r) => s + r[key], 0) / 1_000_000
                    ).toFixed(2)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-700 bg-slate-800/50 p-3 text-[10px] text-slate-400">
          <p>
            * CapEx-/revenue-linked items (power, maint, insurance, tax, mgmt,
            G&amp;A) escalate at {annualEscalationPct.toFixed(1)}%. Labor,
            security, and utilities escalate at {inflationPct.toFixed(1)}%
            inflation.
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Total Operating Expenses by Year (Stacked) — {currency} M
        </h3>
        <div className="h-80 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
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
                <Legend wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }} />
                <Bar dataKey="Power" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Maint" stackId="a" fill="#10b981" />
                <Bar dataKey="Labor" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Insur" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="Tax" stackId="a" fill="#ef4444" />
                <Bar dataKey="Security" stackId="a" fill="#eab308" />
                <Bar dataKey="Utilities" stackId="a" fill="#64748b" />
                <Bar dataKey="Mgmt Fee" stackId="a" fill="#06b6d4" />
                <Bar dataKey="G&A" stackId="a" fill="#ec4899" />
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
