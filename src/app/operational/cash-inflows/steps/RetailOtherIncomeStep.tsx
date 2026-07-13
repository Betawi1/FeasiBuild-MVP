"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  defaultParkingSpaces,
  getRetailOtherIncomeBenchmark,
} from "@/lib/benchmarks/retail-other-income";
import { getRetailRevenueBenchmark } from "@/lib/benchmarks/retail-revenue";
import useFinModelStore from "@/store/useFinModelStore";
import { AiInput } from "@/components/ui/AiInput";
import type { OperationalRetailHoldSnapshot } from "@/lib/operational-pnl";

export type RetailOtherIncomeStepErrors = Record<string, string>;

export function getOperationalRetailHoldSnapshot():
  | OperationalRetailHoldSnapshot
  | undefined {
  return useFinModelStore.getState().operational?.retailHoldSnapshot;
}

export function validateRetailOtherIncomeStep(
  snap: OperationalRetailHoldSnapshot | undefined
): RetailOtherIncomeStepErrors {
  const next: RetailOtherIncomeStepErrors = {};
  const gla = snap?.glaSqft ?? 0;
  if (!Number.isFinite(gla) || gla <= 0) {
    next.glaSqft =
      "Complete Step 1 (GLA) before configuring other mall income.";
  }
  const sales = snap?.avgTenantSalesPsf ?? 0;
  if (!Number.isFinite(sales) || sales <= 0) {
    next.avgTenantSalesPsf =
      "Year 1 tenant sales ($/sqft) must be greater than 0.";
  }
  const spaces = snap?.parkingSpaces ?? 0;
  if (!Number.isFinite(spaces) || spaces <= 0) {
    next.parkingSpaces = "Parking spaces must be greater than 0.";
  }
  return next;
}

type TableRow = {
  year: number;
  percentageRent: number;
  recoveries: number;
  parking: number;
  advertising: number;
  total: number;
  isOverridden: boolean;
};

function roundPct2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export default function RetailOtherIncomeStep() {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const aiC2 = cashOutflows?.aiResearchData?.c2_operational;
  const aiOtherIncome = aiC2?.step2_other_income;
  const aiCamExpenses = aiC2?.step3_operating_expenses?.cam_fixed_base_annual;
  const step1Data = useFinModelStore((s) => s.operational.retailHoldSnapshot);
  const currencyCode = projectInfo.currency || "AED";

  const incomeBenchmark = useMemo(
    () =>
      getRetailOtherIncomeBenchmark(
        projectInfo?.country || "UAE",
        projectInfo?.retailSegment || "regional_mall",
        projectInfo?.retailPositioning || "mid_market"
      ),
    [
      projectInfo?.country,
      projectInfo?.retailSegment,
      projectInfo?.retailPositioning,
    ]
  );

  const revenueBenchmark = useMemo(
    () =>
      getRetailRevenueBenchmark(
        projectInfo?.country || "UAE",
        projectInfo?.retailSegment || "regional_mall",
        projectInfo?.retailPositioning || "mid_market"
      ),
    [
      projectInfo?.country,
      projectInfo?.retailSegment,
      projectInfo?.retailPositioning,
    ]
  );

  const baseRentPsfYear1 =
    step1Data?.baseRentPerSqftValues?.[0] ??
    revenueBenchmark?.baseRentPsf ??
    200;
  const gla = step1Data?.glaSqft || 500_000;
  const rentEscalation = step1Data?.rentEscalationPct ?? revenueBenchmark?.rentEscalation ?? 3;

  const defaultCamTotal = (incomeBenchmark?.camExpensesPerSqft ?? 35) * gla;
  const grossRentYear1 =
    step1Data?.revenueValues?.[0] ??
    gla *
      baseRentPsfYear1 *
      ((step1Data?.occupancyValues?.[0] ?? 95) / 100);
  const defaultPropertyTaxPct =
    grossRentYear1 > 0
      ? roundPct2(
          (((incomeBenchmark?.propertyTaxPerSqft ?? 20) * gla) /
            grossRentYear1) *
            100
        )
      : 5;
  const defaultInsurancePct =
    grossRentYear1 > 0
      ? roundPct2(
          (((incomeBenchmark?.insurancePerSqft ?? 3) * gla) / grossRentYear1) *
            100
        )
      : 1.5;
  const defaultSpaces = defaultParkingSpaces(
    cashOutflows?.parkingBUA ?? 0,
    gla
  );

  const [avgTenantSalesPsf, setAvgTenantSalesPsf] = useState(
    step1Data?.avgTenantSalesPsf ?? incomeBenchmark?.avgTenantSalesPsf ?? 3000
  );
  const [salesGrowthPct, setSalesGrowthPct] = useState(
    step1Data?.salesGrowthPct ?? incomeBenchmark?.salesGrowthPct ?? 3.0
  );
  const [percentageRentRate, setPercentageRentRate] = useState(
    step1Data?.percentageRentRate ?? incomeBenchmark?.percentageRentRate ?? 5
  );
  const [breakpointType, setBreakpointType] = useState<"natural" | "fixed">(
    step1Data?.breakpointType ?? incomeBenchmark?.breakpointType ?? "natural"
  );
  const [breakpointMultiple, setBreakpointMultiple] = useState(
    step1Data?.breakpointMultiple ?? incomeBenchmark?.breakpointMultiple ?? 1.0
  );
  const [fixedBreakpointPsf, setFixedBreakpointPsf] = useState(
    step1Data?.fixedBreakpointPsf ?? 500
  );

  const [camExpenses, setCamExpenses] = useState(() => {
    if (step1Data?.camExpensesAed != null) return step1Data.camExpensesAed;
    if (aiCamExpenses != null) return aiCamExpenses;
    return defaultCamTotal;
  });
  const [propertyTaxPct, setPropertyTaxPct] = useState(() => {
    if (
      step1Data?.propertyTaxPctOfGrossRent != null &&
      step1Data.propertyTaxPctOfGrossRent > 0
    ) {
      return roundPct2(step1Data.propertyTaxPctOfGrossRent);
    }
    if (step1Data?.propertyTaxAed != null && grossRentYear1 > 0) {
      return roundPct2((step1Data.propertyTaxAed / grossRentYear1) * 100);
    }
    return defaultPropertyTaxPct;
  });
  const [insurancePct, setInsurancePct] = useState(() => {
    if (
      step1Data?.insurancePctOfGrossRent != null &&
      step1Data.insurancePctOfGrossRent > 0
    ) {
      return roundPct2(step1Data.insurancePctOfGrossRent);
    }
    if (step1Data?.insuranceAed != null && grossRentYear1 > 0) {
      return roundPct2((step1Data.insuranceAed / grossRentYear1) * 100);
    }
    return defaultInsurancePct;
  });
  const [recoveryRate, setRecoveryRate] = useState(
    step1Data?.recoveryRate ?? incomeBenchmark?.recoveryRate ?? 95
  );

  const [parkingSpaces, setParkingSpaces] = useState(
    step1Data?.parkingSpaces ?? defaultSpaces
  );
  const [parkingRevenuePerDay, setParkingRevenuePerDay] = useState(
    step1Data?.parkingRevenuePerSpaceDay ??
      incomeBenchmark?.parkingRevenuePerSpaceDay ??
      10
  );
  const [parkingUtilization, setParkingUtilization] = useState(
    step1Data?.parkingUtilization ?? incomeBenchmark?.parkingUtilization ?? 70
  );
  const [operatingDays, setOperatingDays] = useState(
    step1Data?.operatingDays ?? incomeBenchmark?.operatingDays ?? 365
  );

  const [advertisingRatePerSqft, setAdvertisingRatePerSqft] = useState(() => {
    if (
      step1Data?.advertisingRatePerSqft != null &&
      step1Data.advertisingRatePerSqft > 0
    ) {
      return step1Data.advertisingRatePerSqft;
    }
    if (step1Data?.advertisingIncomeYear1 != null && gla > 0) {
      return step1Data.advertisingIncomeYear1 / gla;
    }
    return incomeBenchmark?.advertisingRatePerSqft ?? 0.875;
  });

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Record<string, number>>
  >({});

  useEffect(() => {
    if (!aiCamExpenses || overrides.camExpenses) return;
    const snap = getOperationalRetailHoldSnapshot();
    if (snap?.camExpensesAed != null) return;
    setCamExpenses(aiCamExpenses);
  }, [aiCamExpenses, overrides.camExpenses]);

  const leasedPctForYear = useCallback(
    (yearIndex0: number) => {
      const occ = step1Data?.occupancyValues?.[yearIndex0];
      if (occ != null && Number.isFinite(occ)) return occ / 100;
      const y1 = step1Data?.occupancyValues?.[0];
      if (y1 != null && Number.isFinite(y1)) return y1 / 100;
      return 0.95;
    },
    [step1Data?.occupancyValues]
  );

  const baseRentForYear = useCallback(
    (year1Based: number) => {
      const rentPsf =
        baseRentPsfYear1 *
        Math.pow(1 + rentEscalation / 100, year1Based - 1);
      return gla * rentPsf * leasedPctForYear(year1Based - 1);
    },
    [baseRentPsfYear1, gla, rentEscalation, leasedPctForYear]
  );

  const revenueValues = step1Data?.revenueValues ?? [];

  const tableData = useMemo(() => {
    const rows: TableRow[] = [];
    let totalPercentageRent = 0;
    let totalRecoveries = 0;
    let totalParking = 0;
    let totalAdvertising = 0;

    for (let t = 1; t <= 10; t++) {
      const salesPsf =
        avgTenantSalesPsf * Math.pow(1 + salesGrowthPct / 100, t - 1);
      const totalSales = gla * salesPsf;

      let breakpointSales = 0;
      if (breakpointType === "natural") {
        const rentPsfYearT =
          baseRentPsfYear1 * Math.pow(1 + rentEscalation / 100, t - 1);
        breakpointSales = rentPsfYearT * breakpointMultiple * gla;
      } else {
        breakpointSales = fixedBreakpointPsf * gla;
      }

      const excessSales = Math.max(0, totalSales - breakpointSales);
      const percentageRent = excessSales * (percentageRentRate / 100);

      const grossRent = revenueValues[t - 1] ?? baseRentForYear(t);
      const propertyTaxAmount = grossRent * (propertyTaxPct / 100);
      const insuranceAmount = grossRent * (insurancePct / 100);
      const totalRecoverableExpenses =
        camExpenses + propertyTaxAmount + insuranceAmount;
      const recoveryIncome = totalRecoverableExpenses * (recoveryRate / 100);

      const parkingIncome =
        parkingSpaces *
        parkingRevenuePerDay *
        (parkingUtilization / 100) *
        operatingDays;

      const advertisingIncome = advertisingRatePerSqft * gla;

      const totalOther =
        percentageRent + recoveryIncome + parkingIncome + advertisingIncome;

      const manual = manualYearValues[t] || {};

      const row: TableRow = {
        year: t,
        percentageRent: manual.percentageRent ?? percentageRent,
        recoveries: manual.recoveries ?? recoveryIncome,
        parking: manual.parking ?? parkingIncome,
        advertising: manual.advertising ?? advertisingIncome,
        total:
          manual.total ??
          (manual.percentageRent ?? percentageRent) +
            (manual.recoveries ?? recoveryIncome) +
            (manual.parking ?? parkingIncome) +
            (manual.advertising ?? advertisingIncome),
        isOverridden: Object.keys(manual).length > 0,
      };

      if (manual.total == null) {
        row.total =
          row.percentageRent +
          row.recoveries +
          row.parking +
          row.advertising;
      }

      totalPercentageRent += row.percentageRent;
      totalRecoveries += row.recoveries;
      totalParking += row.parking;
      totalAdvertising += row.advertising;

      rows.push(row);
    }

    return {
      rows,
      totals: {
        percentageRent: totalPercentageRent,
        recoveries: totalRecoveries,
        parking: totalParking,
        advertising: totalAdvertising,
        total:
          totalPercentageRent +
          totalRecoveries +
          totalParking +
          totalAdvertising,
      },
    };
  }, [
    gla,
    baseRentPsfYear1,
    rentEscalation,
    avgTenantSalesPsf,
    salesGrowthPct,
    percentageRentRate,
    breakpointType,
    breakpointMultiple,
    fixedBreakpointPsf,
    camExpenses,
    propertyTaxPct,
    insurancePct,
    recoveryRate,
    revenueValues,
    baseRentForYear,
    parkingSpaces,
    parkingRevenuePerDay,
    parkingUtilization,
    operatingDays,
    advertisingRatePerSqft,
    manualYearValues,
  ]);

  const summaryMetrics = useMemo(() => {
    const metrics: Record<number, number> = {};
    for (const t of [1, 5, 10]) {
      const row = tableData.rows.find((r) => r.year === t);
      if (row) {
        const baseRentYearT = baseRentForYear(t);
        metrics[t] =
          baseRentYearT > 0 ? (row.total / baseRentYearT) * 100 : 0;
      }
    }
    return metrics;
  }, [tableData.rows, baseRentForYear]);

  const persistSnapshot = useCallback(() => {
    const prev = getOperationalRetailHoldSnapshot();
    useFinModelStore.getState().updateRetailHoldSnapshot(
      {
        ...prev,
        glaSqft: gla,
        rentEscalationPct: rentEscalation,
        baseRentPerSqftValues: prev?.baseRentPerSqftValues ?? [
          baseRentPsfYear1,
        ],
        occupancyValues: prev?.occupancyValues ?? [],
        effectiveLeasedValues: prev?.effectiveLeasedValues ?? [],
        revenueValues: prev?.revenueValues ?? [],
        avgTenantSalesPsf,
        salesGrowthPct,
        percentageRentRate,
        breakpointType,
        breakpointMultiple,
        fixedBreakpointPsf,
        camExpensesAed: camExpenses,
        propertyTaxPctOfGrossRent: propertyTaxPct,
        insurancePctOfGrossRent: insurancePct,
        propertyTaxAed:
          (revenueValues[0] ?? grossRentYear1) * (propertyTaxPct / 100),
        insuranceAed:
          (revenueValues[0] ?? grossRentYear1) * (insurancePct / 100),
        camExpensesPerSqft: gla > 0 ? camExpenses / gla : 0,
        propertyTaxPerSqft:
          gla > 0
            ? ((revenueValues[0] ?? grossRentYear1) * (propertyTaxPct / 100)) /
              gla
            : 0,
        insurancePerSqft:
          gla > 0
            ? ((revenueValues[0] ?? grossRentYear1) * (insurancePct / 100)) /
              gla
            : 0,
        recoveryRate,
        parkingSpaces,
        parkingRevenuePerSpaceDay: parkingRevenuePerDay,
        parkingUtilization,
        operatingDays,
        advertisingRatePerSqft,
        percentageRentValues: tableData.rows.map((r) => r.percentageRent),
        camRecoveryValues: tableData.rows.map((r) => r.recoveries),
        parkingRevenueValues: tableData.rows.map((r) => r.parking),
        advertisingValues: tableData.rows.map((r) => r.advertising),
        otherIncomeTotalValues: tableData.rows.map((r) => r.total),
      },
      "operational"
    );
  }, [
    gla,
    rentEscalation,
    baseRentPsfYear1,
    avgTenantSalesPsf,
    salesGrowthPct,
    percentageRentRate,
    breakpointType,
    breakpointMultiple,
    fixedBreakpointPsf,
    camExpenses,
    propertyTaxPct,
    insurancePct,
    recoveryRate,
    revenueValues,
    grossRentYear1,
    parkingSpaces,
    parkingRevenuePerDay,
    parkingUtilization,
    operatingDays,
    advertisingRatePerSqft,
    tableData.rows,
  ]);

  useEffect(() => {
    const timer = setTimeout(persistSnapshot, 200);
    return () => clearTimeout(timer);
  }, [persistSnapshot]);

  useEffect(() => {
    if (!incomeBenchmark || Object.keys(overrides).length > 0) return;
    const profileKey = `${projectInfo.country}:${projectInfo.retailSegment}:${projectInfo.retailPositioning}`;
    const hasStep2 = step1Data?.avgTenantSalesPsf != null;
    if (hasStep2) return;

    setAvgTenantSalesPsf(incomeBenchmark.avgTenantSalesPsf);
    setSalesGrowthPct(incomeBenchmark.salesGrowthPct);
    setPercentageRentRate(incomeBenchmark.percentageRentRate);
    setBreakpointType(incomeBenchmark.breakpointType);
    setBreakpointMultiple(incomeBenchmark.breakpointMultiple);
    setCamExpenses(incomeBenchmark.camExpensesPerSqft * gla);
    setPropertyTaxPct(defaultPropertyTaxPct);
    setInsurancePct(defaultInsurancePct);
    setRecoveryRate(incomeBenchmark.recoveryRate);
    setParkingRevenuePerDay(incomeBenchmark.parkingRevenuePerSpaceDay);
    setParkingUtilization(incomeBenchmark.parkingUtilization);
    setOperatingDays(incomeBenchmark.operatingDays);
    setAdvertisingRatePerSqft(incomeBenchmark.advertisingRatePerSqft);
    void profileKey;
  }, [incomeBenchmark, gla, overrides, projectInfo, step1Data?.avgTenantSalesPsf]);

  const handleResetAll = () => {
    if (aiOtherIncome) {
      setAvgTenantSalesPsf(
        aiOtherIncome.avg_tenant_sales_psf ?? incomeBenchmark?.avgTenantSalesPsf ?? 3000
      );
      setSalesGrowthPct(
        aiOtherIncome.sales_growth_pct ?? incomeBenchmark?.salesGrowthPct ?? 3.0
      );
      setPercentageRentRate(
        aiOtherIncome.percentage_rent_rate_pct ??
          incomeBenchmark?.percentageRentRate ??
          5
      );
      setBreakpointType(
        (aiOtherIncome.breakpoint_type ??
          incomeBenchmark?.breakpointType ??
          "natural") as "natural" | "fixed"
      );
      setBreakpointMultiple(
        aiOtherIncome.breakpoint_multiple ?? incomeBenchmark?.breakpointMultiple ?? 1.0
      );
      setCamExpenses(aiOtherIncome.cam_expenses ?? defaultCamTotal);
      setPropertyTaxPct(
        roundPct2(aiOtherIncome.property_tax_pct_of_revenue ?? defaultPropertyTaxPct)
      );
      setInsurancePct(
        roundPct2(aiOtherIncome.insurance_pct_of_revenue ?? defaultInsurancePct)
      );
      setRecoveryRate(aiOtherIncome.recovery_rate_pct ?? incomeBenchmark?.recoveryRate ?? 95);
      setParkingRevenuePerDay(
        aiOtherIncome.parking_revenue_per_space_day ??
          incomeBenchmark?.parkingRevenuePerSpaceDay ??
          10
      );
      setParkingUtilization(
        aiOtherIncome.parking_utilization ?? incomeBenchmark?.parkingUtilization ?? 70
      );
      setOperatingDays(aiOtherIncome.operating_days ?? incomeBenchmark?.operatingDays ?? 365);
      setAdvertisingRatePerSqft(
        aiOtherIncome.advertising_kiosks_events_psf ??
          incomeBenchmark?.advertisingRatePerSqft ??
          0.875
      );
    } else if (incomeBenchmark) {
      setAvgTenantSalesPsf(incomeBenchmark.avgTenantSalesPsf);
      setSalesGrowthPct(incomeBenchmark.salesGrowthPct);
      setPercentageRentRate(incomeBenchmark.percentageRentRate);
      setBreakpointType(incomeBenchmark.breakpointType || "natural");
      setBreakpointMultiple(incomeBenchmark.breakpointMultiple || 1.0);
      setCamExpenses(incomeBenchmark.camExpensesPerSqft * gla);
      setPropertyTaxPct(defaultPropertyTaxPct);
      setInsurancePct(defaultInsurancePct);
      setRecoveryRate(incomeBenchmark.recoveryRate || 95);
      setParkingRevenuePerDay(incomeBenchmark.parkingRevenuePerSpaceDay || 10);
      setParkingUtilization(incomeBenchmark.parkingUtilization || 70);
      setOperatingDays(incomeBenchmark.operatingDays || 365);
      setAdvertisingRatePerSqft(incomeBenchmark.advertisingRatePerSqft || 0.875);
    }
    setParkingSpaces(defaultSpaces);
    setOverrides({});
    setManualYearValues({});
  };

  const handleFieldChange = (field: string, value: number) => {
    const pctFields = new Set(["propertyTaxPct", "insurancePct"]);
    const normalized = pctFields.has(field) ? roundPct2(value) : value;

    const setters: Record<string, (v: number) => void> = {
      avgTenantSalesPsf: setAvgTenantSalesPsf,
      salesGrowthPct: setSalesGrowthPct,
      percentageRentRate: setPercentageRentRate,
      breakpointMultiple: setBreakpointMultiple,
      fixedBreakpointPsf: setFixedBreakpointPsf,
      camExpenses: setCamExpenses,
      propertyTaxPct: setPropertyTaxPct,
      insurancePct: setInsurancePct,
      recoveryRate: setRecoveryRate,
      parkingRevenuePerDay: setParkingRevenuePerDay,
      parkingUtilization: setParkingUtilization,
      advertisingRatePerSqft: setAdvertisingRatePerSqft,
    };

    if (setters[field]) {
      setters[field](normalized);
      setOverrides((prev) => ({ ...prev, [field]: true }));
    }
  };

  const handleCellOverride = (year: number, stream: string, value: number) => {
    setManualYearValues((prev) => ({
      ...prev,
      [year]: { ...prev[year], [stream]: value },
    }));
  };

  const chartData = tableData.rows.map((row) => ({
    year: `Y${row.year}`,
    "Percentage Rent": row.percentageRent / 1_000_000,
    "CAM/Tax Recoveries": row.recoveries / 1_000_000,
    Parking: row.parking / 1_000_000,
    Advertising: row.advertising / 1_000_000,
  }));

  const segmentLabel = (projectInfo?.retailSegment || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const positioningLabel = (projectInfo?.retailPositioning || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 2 — Other Mall Income
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Configure additional revenue streams beyond base rent.
          <span className="ml-1 text-amber-500">Amber borders</span> indicate
          manual overrides.
        </p>
      </div>

      {incomeBenchmark && (
        <div className="mb-6 border-b border-slate-700 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500">
                BENCHMARK
              </span>
              <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
                <span className="text-xs text-slate-300">
                  Retail • {segmentLabel || "—"} • {positioningLabel || "—"} •{" "}
                  {projectInfo?.country || "—"}
                </span>
              </div>
              {Object.values(overrides).some((v) => v) && (
                <div className="rounded-full border border-amber-600/50 bg-amber-900/30 px-3 py-1">
                  <span className="text-xs text-amber-400">Manual overrides</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleResetAll}
              className="text-xs text-emerald-400 transition hover:text-emerald-300"
            >
              Reset to benchmark
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          1. Percentage Rent (Overage)
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <AiInput
              label={`Avg Tenant Sales psf – Year 1 (${currencyCode})`}
              value={avgTenantSalesPsf || aiOtherIncome?.avg_tenant_sales_psf || 0}
              onChange={(val) =>
                handleFieldChange("avgTenantSalesPsf", Number(val))
              }
              type="number"
              isAiGenerated={
                !!aiOtherIncome?.avg_tenant_sales_psf && !overrides.avgTenantSalesPsf
              }
              isManualOverride={!!overrides.avgTenantSalesPsf}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Sales Growth (%)
            </label>
            <input
              type="number"
              value={salesGrowthPct}
              onChange={(e) =>
                handleFieldChange("salesGrowthPct", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.salesGrowthPct ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
          </div>
          <div>
            <AiInput
              label="Percentage Rent Rate (%)"
              value={percentageRentRate || aiOtherIncome?.percentage_rent_rate_pct || 0}
              onChange={(val) =>
                handleFieldChange("percentageRentRate", Number(val))
              }
              type="number"
              isAiGenerated={
                !!aiOtherIncome?.percentage_rent_rate_pct &&
                !overrides.percentageRentRate
              }
              isManualOverride={!!overrides.percentageRentRate}
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
              className="w-full rounded border border-slate-600 bg-slate-900 p-2 text-white"
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
                step={0.1}
                value={breakpointMultiple}
                onChange={(e) =>
                  handleFieldChange("breakpointMultiple", Number(e.target.value))
                }
                className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.breakpointMultiple ? "border-2 border-amber-500" : "border border-slate-600"}`}
              />
              <p className="mt-1 text-[10px] text-slate-500">
                Example: Rent 250 × 1.0 = 250 psf breakpoint
              </p>
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
                  handleFieldChange("fixedBreakpointPsf", Number(e.target.value))
                }
                className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.fixedBreakpointPsf ? "border-2 border-amber-500" : "border border-slate-600"}`}
              />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          2. CAM &amp; Tax Recoveries
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <AiInput
              label={`CAM Expenses (${currencyCode})`}
              value={camExpenses}
              onChange={(val) => handleFieldChange("camExpenses", Number(val))}
              type="number"
              isAiGenerated={!!aiCamExpenses && !overrides.camExpenses}
              isManualOverride={!!overrides.camExpenses}
            />
          </div>
          <div>
            <AiInput
              label="Property Tax (% of Gross Rental Revenue)"
              value={propertyTaxPct || aiOtherIncome?.property_tax_pct_of_revenue || 0}
              onChange={(val) => handleFieldChange("propertyTaxPct", Number(val))}
              type="percentage"
              step={0.01}
              min={0}
              max={100}
              isAiGenerated={
                !!aiOtherIncome?.property_tax_pct_of_revenue && !overrides.propertyTaxPct
              }
              isManualOverride={!!overrides.propertyTaxPct}
              helperText="Applied to Step 1 base rent revenue each year"
            />
          </div>
          <div>
            <AiInput
              label="Insurance (% of Gross Rental Revenue)"
              value={insurancePct || aiOtherIncome?.insurance_pct_of_revenue || 0}
              onChange={(val) => handleFieldChange("insurancePct", Number(val))}
              type="percentage"
              step={0.01}
              min={0}
              max={100}
              isAiGenerated={
                !!aiOtherIncome?.insurance_pct_of_revenue && !overrides.insurancePct
              }
              isManualOverride={!!overrides.insurancePct}
              helperText="Applied to Step 1 base rent revenue each year"
            />
          </div>
          <div>
            <AiInput
              label="Recovery Rate (%)"
              value={recoveryRate || aiOtherIncome?.recovery_rate_pct || 0}
              onChange={(val) => handleFieldChange("recoveryRate", Number(val))}
              type="number"
              isAiGenerated={
                !!aiOtherIncome?.recovery_rate_pct && !overrides.recoveryRate
              }
              isManualOverride={!!overrides.recoveryRate}
              helperText="% billed to tenants (vacancy/caps adjusted)"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          3. Parking Income
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Number of Spaces
            </label>
            <input
              type="number"
              value={parkingSpaces}
              onChange={(e) => setParkingSpaces(Number(e.target.value))}
              className="w-full rounded border border-slate-600 bg-slate-900 p-2 text-white"
            />
          </div>
          <div>
            <AiInput
              label={`Revenue/Space/Day (${currencyCode})`}
              value={
                parkingRevenuePerDay ||
                aiOtherIncome?.parking_revenue_per_space_day ||
                0
              }
              onChange={(val) =>
                handleFieldChange("parkingRevenuePerDay", Number(val))
              }
              type="number"
              isAiGenerated={
                !!aiOtherIncome?.parking_revenue_per_space_day &&
                !overrides.parkingRevenuePerDay
              }
              isManualOverride={!!overrides.parkingRevenuePerDay}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Utilization (%)
            </label>
            <input
              type="number"
              value={parkingUtilization}
              onChange={(e) =>
                handleFieldChange("parkingUtilization", Number(e.target.value))
              }
              className={`w-full rounded bg-slate-900 p-2 text-white ${overrides.parkingUtilization ? "border-2 border-amber-500" : "border border-slate-600"}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Operating Days/Year
            </label>
            <input
              type="number"
              value={operatingDays}
              onChange={(e) => setOperatingDays(Number(e.target.value))}
              className="w-full rounded border border-slate-600 bg-slate-900 p-2 text-white"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          4. Advertising, Kiosks, Events
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <AiInput
              label={`Advertising/Kiosks/Events Rate (${currencyCode} per sqft GLA/year)`}
              value={
                advertisingRatePerSqft ||
                aiOtherIncome?.advertising_kiosks_events_psf ||
                0
              }
              onChange={(val) =>
                handleFieldChange("advertisingRatePerSqft", Number(val))
              }
              type="number"
              step={0.01}
              isAiGenerated={
                !!aiOtherIncome?.advertising_kiosks_events_psf &&
                !overrides.advertisingRatePerSqft
              }
              isManualOverride={!!overrides.advertisingRatePerSqft}
              helperText={`Annual income = rate × total GLA (${gla.toLocaleString()} sqft)`}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">% Rent ({currencyCode} M)</th>
              <th className="px-4 py-3">
                CAM/Tax Recoveries ({currencyCode} M)
              </th>
              <th className="px-4 py-3">Parking ({currencyCode} M)</th>
              <th className="px-4 py-3">Advertising ({currencyCode} M)</th>
              <th className="px-4 py-3 text-right">
                Total Other ({currencyCode} M)
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row) => (
              <tr
                key={row.year}
                className={`border-b border-slate-800 transition ${row.isOverridden ? "bg-amber-900/10" : "hover:bg-slate-800/50"}`}
              >
                <td className="px-4 py-3 font-medium text-white">Y{row.year}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step={0.01}
                    value={(row.percentageRent / 1_000_000).toFixed(2)}
                    onChange={(e) =>
                      handleCellOverride(
                        row.year,
                        "percentageRent",
                        parseFloat(e.target.value) * 1_000_000
                      )
                    }
                    className={`w-20 rounded bg-slate-800 p-1 text-right ${manualYearValues[row.year]?.percentageRent ? "border border-amber-500" : "border border-transparent"}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step={0.01}
                    value={(row.recoveries / 1_000_000).toFixed(2)}
                    onChange={(e) =>
                      handleCellOverride(
                        row.year,
                        "recoveries",
                        parseFloat(e.target.value) * 1_000_000
                      )
                    }
                    className={`w-20 rounded bg-slate-800 p-1 text-right ${manualYearValues[row.year]?.recoveries ? "border border-amber-500" : "border border-transparent"}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step={0.01}
                    value={(row.parking / 1_000_000).toFixed(2)}
                    onChange={(e) =>
                      handleCellOverride(
                        row.year,
                        "parking",
                        parseFloat(e.target.value) * 1_000_000
                      )
                    }
                    className={`w-20 rounded bg-slate-800 p-1 text-right ${manualYearValues[row.year]?.parking ? "border border-amber-500" : "border border-transparent"}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step={0.01}
                    value={(row.advertising / 1_000_000).toFixed(2)}
                    onChange={(e) =>
                      handleCellOverride(
                        row.year,
                        "advertising",
                        parseFloat(e.target.value) * 1_000_000
                      )
                    }
                    className={`w-20 rounded bg-slate-800 p-1 text-right ${manualYearValues[row.year]?.advertising ? "border border-amber-500" : "border border-transparent"}`}
                  />
                </td>
                <td className="px-4 py-3 text-right font-mono text-emerald-400">
                  {(row.total / 1_000_000).toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-800 font-bold text-white">
              <td className="px-4 py-3">10-Year Total</td>
              <td className="px-4 py-3 text-right">
                {(tableData.totals.percentageRent / 1_000_000).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right">
                {(tableData.totals.recoveries / 1_000_000).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right">
                {(tableData.totals.parking / 1_000_000).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right">
                {(tableData.totals.advertising / 1_000_000).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right text-emerald-400">
                {(tableData.totals.total / 1_000_000).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <p className="text-sm text-slate-300">
          <span className="font-medium">
            Total Other Income as % of Base Rent:
          </span>{" "}
          <span className="text-emerald-400">
            Year 1 = {summaryMetrics[1]?.toFixed(1) ?? "—"}%
          </span>{" "}
          |{" "}
          <span className="text-emerald-400">
            Year 5 = {summaryMetrics[5]?.toFixed(1) ?? "—"}%
          </span>{" "}
          |{" "}
          <span className="text-emerald-400">
            Year 10 = {summaryMetrics[10]?.toFixed(1) ?? "—"}%
          </span>
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          OTHER MALL INCOME COMPOSITION ({currencyCode} M)
        </h3>
        <div className="h-64 w-full">
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
              <Bar dataKey="Percentage Rent" stackId="a" fill="#10b981" />
              <Bar dataKey="CAM/Tax Recoveries" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Parking" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="Advertising" stackId="a" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
