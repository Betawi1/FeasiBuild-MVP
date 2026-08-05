"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BenchmarkHeader from "@/components/BenchmarkHeader";
import { AiInput } from "@/components/ui/AiInput";
import {
  extractWarehouseAiStep4,
  getWarehouseAiC2,
} from "@/lib/warehouse-ai-c2";
import useFinModelStore, {
  type WarehouseDepreciation,
} from "@/store/useFinModelStore";
import { generateWarehouse10YearProjection } from "./c2s1-primary-revenue-warehouse";
import { generateWarehouseOpexProjection } from "./c2s3-operating-expenses-warehouse";

function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

type DeprecRow = {
  year: number;
  buildingDeprec: number;
  siteDeprec: number;
  ffeDeprec: number;
  totalDA: number;
  ar: number;
  ap: number;
  netWc: number;
  ffeReserve: number;
};

export function generateWarehouseDepreciationProjection(params: {
  buildingCost: number;
  siteImprovementsCost: number;
  ffeCost: number;
  buildingLife: number;
  siteLife: number;
  ffeLife: number;
  ffeReservePct: number;
  arDays: number;
  apDays: number;
  revenueByYear: number[];
  opexByYear: number[];
}): DeprecRow[] {
  const buildingAnnual =
    params.buildingLife > 0 ? params.buildingCost / params.buildingLife : 0;
  const siteAnnual =
    params.siteLife > 0 ? params.siteImprovementsCost / params.siteLife : 0;
  const ffeAnnual =
    params.ffeLife > 0 ? params.ffeCost / params.ffeLife : 0;

  const rows: DeprecRow[] = [];
  for (let y = 1; y <= 10; y++) {
    const buildingDeprec = y <= params.buildingLife ? buildingAnnual : 0;
    const siteDeprec = y <= params.siteLife ? siteAnnual : 0;
    const ffeDeprec = y <= params.ffeLife ? ffeAnnual : 0;
    const totalDA = buildingDeprec + siteDeprec + ffeDeprec;
    const revenueY = params.revenueByYear[y - 1] ?? 0;
    const opexY = params.opexByYear[y - 1] ?? 0;
    const ar = revenueY * (params.arDays / 365);
    const ap = opexY * (params.apDays / 365);
    const netWc = ar - ap;
    const ffeReserve = revenueY * (params.ffeReservePct / 100);

    rows.push({
      year: y,
      buildingDeprec,
      siteDeprec,
      ffeDeprec,
      totalDA,
      ar,
      ap,
      netWc,
      ffeReserve,
    });
  }
  return rows;
}

export type WarehouseDepreciationStepErrors = Record<string, string>;

export function validateWarehouseDepreciationStep(
  dep?: WarehouseDepreciation
): WarehouseDepreciationStepErrors {
  const next: WarehouseDepreciationStepErrors = {};
  if (!dep) {
    next.buildingUsefulLifeYears = "Set useful life assumptions.";
    return next;
  }
  if (
    !Number.isFinite(dep.buildingUsefulLifeYears) ||
    dep.buildingUsefulLifeYears <= 0
  ) {
    next.buildingUsefulLifeYears = "Building useful life must be greater than 0.";
  }
  if (
    !Number.isFinite(dep.siteUsefulLifeYears) ||
    dep.siteUsefulLifeYears <= 0
  ) {
    next.siteUsefulLifeYears =
      "Site improvements useful life must be greater than 0.";
  }
  if (!Number.isFinite(dep.ffeUsefulLifeYears) || dep.ffeUsefulLifeYears <= 0) {
    next.ffeUsefulLifeYears = "FF&E useful life must be greater than 0.";
  }
  if (
    !Number.isFinite(dep.arDays) ||
    dep.arDays < 0 ||
    dep.arDays > 365
  ) {
    next.arDays = "A/R days must be between 0 and 365.";
  }
  if (
    !Number.isFinite(dep.apDays) ||
    dep.apDays < 0 ||
    dep.apDays > 365
  ) {
    next.apDays = "A/P days must be between 0 and 365.";
  }
  return next;
}

type Props = {
  fieldError?: (name: string) => string | undefined;
  onGeneratePnl?: () => void;
};

export default function C2S4DepreciationWarehouse({
  fieldError,
  onGeneratePnl,
}: Props = {}) {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const warehouseRevenue = useFinModelStore(
    (s) => s.operational.cashInflows?.warehouseRevenue
  );
  const warehouseOpEx = useFinModelStore(
    (s) => s.operational.cashInflows?.warehouseOpEx
  );
  const storedDep = useFinModelStore(
    (s) => s.operational.cashInflows?.warehouseDepreciation
  );
  const updateCashInflows = useFinModelStore((s) => s.updateCashInflows);
  const currencyCode = projectInfo.currency || "USD";

  const costs = cashOutflows.warehouseCosts;
  const buildingCost = costs?.buildingShellCost || 0;
  const siteImprovementsCost =
    (costs?.siteYardWorksCost || 0) +
    (costs?.loadingAccessCost || 0) +
    (isParkCommonInfra(cashOutflows.developmentType)
      ? costs?.commonInfrastructureCost || 0
      : 0);
  const ffeCost = cashOutflows.ffe || 0;

  const benchBuildingLife = 40;
  const benchSiteLife = 20;
  const benchFfeLife = 10;
  const benchFfeReserve = 1.5;
  const benchArDays = 30;
  const benchApDays = 30;

  const aiStep4 = useMemo(
    () => extractWarehouseAiStep4(getWarehouseAiC2(cashOutflows?.aiResearchData)),
    [cashOutflows?.aiResearchData]
  );

  const aiBuildingLife = aiStep4.building_useful_life_years;
  const aiSiteLife = aiStep4.site_improvements_useful_life_years;
  const aiFfeLife = aiStep4.ffe_useful_life_years;
  const aiFfeReserve = aiStep4.ffe_reserve_pct_revenue;
  const aiArDays = aiStep4.accounts_receivable_days;
  const aiApDays = aiStep4.accounts_payable_days;

  const [buildingLife, setBuildingLife] = useState(
    storedDep?.buildingUsefulLifeYears ??
      aiBuildingLife ??
      benchBuildingLife
  );
  const [siteLife, setSiteLife] = useState(
    storedDep?.siteUsefulLifeYears ?? aiSiteLife ?? benchSiteLife
  );
  const [ffeLife, setFfeLife] = useState(
    storedDep?.ffeUsefulLifeYears ?? aiFfeLife ?? benchFfeLife
  );
  const [ffeReservePct, setFfeReservePct] = useState(
    storedDep?.ffeReservePctOfRevenue ??
      aiFfeReserve ??
      benchFfeReserve
  );
  const [arDays, setArDays] = useState(
    storedDep?.arDays ?? aiArDays ?? benchArDays
  );
  const [apDays, setApDays] = useState(
    storedDep?.apDays ?? aiApDays ?? benchApDays
  );
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const revenueByYear = useMemo(() => {
    const rev = warehouseRevenue;
    if (!rev) {
      return Array(10).fill(0) as number[];
    }
    return generateWarehouse10YearProjection({
      totalGfa: rev.totalGfa || 0,
      occupancyRate: rev.occupancyRate || 0,
      ratePerSqftYear: rev.ratePerSqftYear || 0,
      rentEscalationPct: rev.rentEscalationPct ?? 3,
      leaseUpYears: rev.leaseUpYears ?? 2,
      freeRentMonths: rev.freeRentMonths ?? 0,
      yardArea: rev.yardArea || 0,
      yardRate: rev.yardRate || 0,
      parkingSpacesCars: rev.parkingSpacesCars || 0,
      parkingRateCars: rev.parkingRateCars || 0,
      parkingSpacesTrailers: rev.parkingSpacesTrailers || 0,
      parkingRateTrailers: rev.parkingRateTrailers || 0,
    }).map((r) => r.totalRevenue);
  }, [warehouseRevenue]);

  const opexByYear = useMemo(() => {
    if (!warehouseOpEx) {
      return Array(10).fill(0) as number[];
    }
    return generateWarehouseOpexProjection({
      annualPropertyTax: warehouseOpEx.annualPropertyTax || 0,
      annualInsurance: warehouseOpEx.annualInsurance || 0,
      annualMaintenance: warehouseOpEx.annualMaintenance || 0,
      annualLandscaping: warehouseOpEx.annualLandscaping || 0,
      annualUtilities: warehouseOpEx.annualUtilities || 0,
      annualSecurity: warehouseOpEx.annualSecurity || 0,
      managementFeeRate: warehouseOpEx.managementFeeRate || 0,
      gAndARate: warehouseOpEx.gAndARate || 0,
      revenueByYear,
      expenseEscalationPct: warehouseRevenue?.rentEscalationPct ?? 0,
    }).rows.map((r) => r.total);
  }, [warehouseOpEx, revenueByYear, warehouseRevenue?.rentEscalationPct]);

  const tableRows = useMemo(
    () =>
      generateWarehouseDepreciationProjection({
        buildingCost,
        siteImprovementsCost,
        ffeCost,
        buildingLife,
        siteLife,
        ffeLife,
        ffeReservePct,
        arDays,
        apDays,
        revenueByYear,
        opexByYear,
      }),
    [
      buildingCost,
      siteImprovementsCost,
      ffeCost,
      buildingLife,
      siteLife,
      ffeLife,
      ffeReservePct,
      arDays,
      apDays,
      revenueByYear,
      opexByYear,
    ]
  );

  const persist = useCallback(
    (partial?: Partial<WarehouseDepreciation>) => {
      const next: WarehouseDepreciation = {
        buildingUsefulLifeYears:
          partial?.buildingUsefulLifeYears ?? buildingLife,
        siteUsefulLifeYears: partial?.siteUsefulLifeYears ?? siteLife,
        ffeUsefulLifeYears: partial?.ffeUsefulLifeYears ?? ffeLife,
        ffeReservePctOfRevenue:
          partial?.ffeReservePctOfRevenue ?? ffeReservePct,
        arDays: partial?.arDays ?? arDays,
        apDays: partial?.apDays ?? apDays,
        buildingCostBase: buildingCost,
        siteImprovementsCostBase: siteImprovementsCost,
        ffeCostBase: ffeCost,
      };
      updateCashInflows({ warehouseDepreciation: next }, "operational");
    },
    [
      buildingLife,
      siteLife,
      ffeLife,
      ffeReservePct,
      arDays,
      apDays,
      buildingCost,
      siteImprovementsCost,
      ffeCost,
      updateCashInflows,
    ]
  );

  useEffect(() => {
    persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingCost, siteImprovementsCost, ffeCost]);

  // Apply AI when research lands over empty/bench defaults
  useEffect(() => {
    const patch: Partial<WarehouseDepreciation> = {};
    const canApply = (stored: number | undefined, bench: number) =>
      stored == null || stored === bench;

    if (
      aiBuildingLife != null &&
      !overrides.buildingUsefulLifeYears &&
      canApply(storedDep?.buildingUsefulLifeYears, benchBuildingLife)
    ) {
      setBuildingLife(aiBuildingLife);
      patch.buildingUsefulLifeYears = aiBuildingLife;
    }
    if (
      aiSiteLife != null &&
      !overrides.siteUsefulLifeYears &&
      canApply(storedDep?.siteUsefulLifeYears, benchSiteLife)
    ) {
      setSiteLife(aiSiteLife);
      patch.siteUsefulLifeYears = aiSiteLife;
    }
    if (
      aiFfeLife != null &&
      !overrides.ffeUsefulLifeYears &&
      canApply(storedDep?.ffeUsefulLifeYears, benchFfeLife)
    ) {
      setFfeLife(aiFfeLife);
      patch.ffeUsefulLifeYears = aiFfeLife;
    }
    if (
      aiFfeReserve != null &&
      !overrides.ffeReservePctOfRevenue &&
      canApply(storedDep?.ffeReservePctOfRevenue, benchFfeReserve)
    ) {
      setFfeReservePct(aiFfeReserve);
      patch.ffeReservePctOfRevenue = aiFfeReserve;
    }
    if (
      aiArDays != null &&
      !overrides.arDays &&
      canApply(storedDep?.arDays, benchArDays)
    ) {
      setArDays(aiArDays);
      patch.arDays = aiArDays;
    }
    if (
      aiApDays != null &&
      !overrides.apDays &&
      canApply(storedDep?.apDays, benchApDays)
    ) {
      setApDays(aiApDays);
      patch.apDays = aiApDays;
    }
    if (Object.keys(patch).length > 0) {
      persist(patch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    aiBuildingLife,
    aiSiteLife,
    aiFfeLife,
    aiFfeReserve,
    aiArDays,
    aiApDays,
  ]);

  const handleFieldChange = useCallback(
    (field: string, value: number) => {
      const setters: Record<string, (v: number) => void> = {
        buildingUsefulLifeYears: setBuildingLife,
        siteUsefulLifeYears: setSiteLife,
        ffeUsefulLifeYears: setFfeLife,
        ffeReservePctOfRevenue: setFfeReservePct,
        arDays: setArDays,
        apDays: setApDays,
      };
      setters[field]?.(value);
      setOverrides((prev) => ({ ...prev, [field]: true }));
      persist({ [field]: value } as Partial<WarehouseDepreciation>);
    },
    [persist]
  );

  const handleResetDeprec = () => {
    const b = aiBuildingLife ?? benchBuildingLife;
    const s = aiSiteLife ?? benchSiteLife;
    const f = aiFfeLife ?? benchFfeLife;
    const r = aiFfeReserve ?? benchFfeReserve;
    setBuildingLife(b);
    setSiteLife(s);
    setFfeLife(f);
    setFfeReservePct(r);
    setOverrides((prev) => ({
      ...prev,
      buildingUsefulLifeYears: false,
      siteUsefulLifeYears: false,
      ffeUsefulLifeYears: false,
      ffeReservePctOfRevenue: false,
    }));
    persist({
      buildingUsefulLifeYears: b,
      siteUsefulLifeYears: s,
      ffeUsefulLifeYears: f,
      ffeReservePctOfRevenue: r,
    });
  };

  const handleResetWc = () => {
    const ar = aiArDays ?? benchArDays;
    const ap = aiApDays ?? benchApDays;
    setArDays(ar);
    setApDays(ap);
    setOverrides((prev) => ({
      ...prev,
      arDays: false,
      apDays: false,
    }));
    persist({ arDays: ar, apDays: ap });
  };

  const handleResetAll = () => {
    handleResetDeprec();
    handleResetWc();
    setOverrides({});
  };

  const chartData = useMemo(
    () =>
      tableRows.map((row) => ({
        year: `Y${row.year}`,
        "Total D&A": row.totalDA / 1_000_000,
        "Building": row.buildingDeprec / 1_000_000,
        "Site": row.siteDeprec / 1_000_000,
        "FF&E": row.ffeDeprec / 1_000_000,
      })),
    [tableRows]
  );

  const hasManualOverride = Object.values(overrides).some(Boolean);
  const deprecOverride =
    !!overrides.buildingUsefulLifeYears ||
    !!overrides.siteUsefulLifeYears ||
    !!overrides.ffeUsefulLifeYears ||
    !!overrides.ffeReservePctOfRevenue;
  const wcOverride = !!overrides.arDays || !!overrides.apDays;

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 4 — Depreciation, Amortization &amp; Working Capital
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Straight-line depreciation on building, site improvements, and FF&amp;E,
          plus working capital from A/R and A/P days.{" "}
          <span className="text-amber-500">Amber borders</span> indicate manual
          overrides.
        </p>
      </div>

      <BenchmarkHeader
        assetType="warehouse"
        country={projectInfo.country || "UAE"}
        segment={cashOutflows.warehouseSubType}
        positioning={cashOutflows.qualityGrade}
        onUseDefaults={handleResetAll}
        isManualOverride={hasManualOverride}
        resetButtonLabel="Reset to benchmark"
      />

      {/* Bases */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Depreciation &amp; Amortization Bases (from Component 1)
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="mb-1 text-xs text-slate-400">
              Construction Cost (Building &amp; Shell)
            </div>
            <div className="font-mono text-lg font-bold text-emerald-400">
              {money(buildingCost, currencyCode)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="mb-1 text-xs text-slate-400">
              Site Improvements Cost (Yard + Loading
              {isParkCommonInfra(cashOutflows.developmentType)
                ? " + Common Infra"
                : ""}
              )
            </div>
            <div className="font-mono text-lg font-bold text-emerald-400">
              {money(siteImprovementsCost, currencyCode)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="mb-1 text-xs text-slate-400">FF&amp;E Cost</div>
            <div className="font-mono text-lg font-bold text-emerald-400">
              {money(ffeCost, currencyCode)}
            </div>
          </div>
        </div>
      </div>

      {/* Assumptions */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Useful Life, Reserve &amp; Working Capital Assumptions
          </h3>
          <div className="flex flex-wrap gap-3 text-xs">
            <button
              type="button"
              onClick={handleResetDeprec}
              className={`font-medium transition-colors ${
                deprecOverride
                  ? "text-emerald-400 hover:text-emerald-300"
                  : "cursor-default text-slate-500"
              }`}
              disabled={!deprecOverride}
            >
              Reset depreciations
            </button>
            <button
              type="button"
              onClick={handleResetWc}
              className={`font-medium transition-colors ${
                wcOverride
                  ? "text-emerald-400 hover:text-emerald-300"
                  : "cursor-default text-slate-500"
              }`}
              disabled={!wcOverride}
            >
              Reset WC
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <AiInput
              label="Building Useful Life (years)"
              value={buildingLife}
              onChange={(val) =>
                handleFieldChange(
                  "buildingUsefulLifeYears",
                  Number(val) || 0
                )
              }
              type="number"
              step={1}
              min={1}
              isAiGenerated={
                aiBuildingLife != null && !overrides.buildingUsefulLifeYears
              }
              isManualOverride={!!overrides.buildingUsefulLifeYears}
            />
            {fieldError?.("buildingUsefulLifeYears") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("buildingUsefulLifeYears")}
              </p>
            ) : null}
          </div>
          <div>
            <AiInput
              label="Site Improvements Life (years)"
              value={siteLife}
              onChange={(val) =>
                handleFieldChange("siteUsefulLifeYears", Number(val) || 0)
              }
              type="number"
              step={1}
              min={1}
              isAiGenerated={
                aiSiteLife != null && !overrides.siteUsefulLifeYears
              }
              isManualOverride={!!overrides.siteUsefulLifeYears}
            />
            {fieldError?.("siteUsefulLifeYears") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("siteUsefulLifeYears")}
              </p>
            ) : null}
          </div>
          <div>
            <AiInput
              label="FF&E Useful Life (years)"
              value={ffeLife}
              onChange={(val) =>
                handleFieldChange("ffeUsefulLifeYears", Number(val) || 0)
              }
              type="number"
              step={1}
              min={1}
              isAiGenerated={
                aiFfeLife != null && !overrides.ffeUsefulLifeYears
              }
              isManualOverride={!!overrides.ffeUsefulLifeYears}
            />
            {fieldError?.("ffeUsefulLifeYears") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("ffeUsefulLifeYears")}
              </p>
            ) : null}
          </div>
          <div>
            <AiInput
              label="FF&E Reserve (% of Revenue)"
              value={ffeReservePct}
              onChange={(val) =>
                handleFieldChange("ffeReservePctOfRevenue", Number(val) || 0)
              }
              type="percentage"
              step={0.1}
              min={0}
              isAiGenerated={
                aiFfeReserve != null && !overrides.ffeReservePctOfRevenue
              }
              isManualOverride={!!overrides.ffeReservePctOfRevenue}
            />
          </div>
          <div>
            <AiInput
              label="Accounts Receivable (days)"
              value={arDays}
              onChange={(val) =>
                handleFieldChange("arDays", Number(val) || 0)
              }
              type="number"
              step={1}
              min={0}
              max={365}
              isAiGenerated={aiArDays != null && !overrides.arDays}
              isManualOverride={!!overrides.arDays}
            />
            {fieldError?.("arDays") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("arDays")}
              </p>
            ) : null}
          </div>
          <div>
            <AiInput
              label="Accounts Payable (days)"
              value={apDays}
              onChange={(val) =>
                handleFieldChange("apDays", Number(val) || 0)
              }
              type="number"
              step={1}
              min={0}
              max={365}
              isAiGenerated={aiApDays != null && !overrides.apDays}
              isManualOverride={!!overrides.apDays}
            />
            {fieldError?.("apDays") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("apDays")}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* 10-Year Table */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR DEPRECIATION &amp; WORKING CAPITAL ({currencyCode} M)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-3">Year</th>
                <th className="px-3 py-3">Building Deprec</th>
                <th className="px-3 py-3">Site Deprec</th>
                <th className="px-3 py-3">FF&amp;E Deprec</th>
                <th className="px-3 py-3">Total D&amp;A</th>
                <th className="px-3 py-3">A/R</th>
                <th className="px-3 py-3">A/P</th>
                <th className="px-3 py-3 text-right">Net WC</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr
                  key={row.year}
                  className="border-b border-slate-800 transition hover:bg-slate-800/50"
                >
                  <td className="px-3 py-3 font-medium text-white">
                    Y{row.year}
                  </td>
                  <td className="px-3 py-3 font-mono text-teal-400">
                    {(row.buildingDeprec / 1_000_000).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 font-mono text-teal-400">
                    {(row.siteDeprec / 1_000_000).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 font-mono text-teal-400">
                    {(row.ffeDeprec / 1_000_000).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 font-mono font-semibold text-emerald-400">
                    {(row.totalDA / 1_000_000).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-300">
                    {(row.ar / 1_000_000).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-300">
                    {(row.ap / 1_000_000).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-emerald-400">
                    {(row.netWc / 1_000_000).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800 font-bold text-white">
                <td className="px-3 py-3">10-Year Total</td>
                <td className="px-3 py-3 text-right text-emerald-400">
                  {(
                    tableRows.reduce((s, r) => s + r.buildingDeprec, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
                <td className="px-3 py-3 text-right text-emerald-400">
                  {(
                    tableRows.reduce((s, r) => s + r.siteDeprec, 0) / 1_000_000
                  ).toFixed(2)}
                </td>
                <td className="px-3 py-3 text-right text-emerald-400">
                  {(
                    tableRows.reduce((s, r) => s + r.ffeDeprec, 0) / 1_000_000
                  ).toFixed(2)}
                </td>
                <td className="px-3 py-3 text-right text-emerald-400">
                  {(
                    tableRows.reduce((s, r) => s + r.totalDA, 0) / 1_000_000
                  ).toFixed(2)}
                </td>
                <td className="px-3 py-3" colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 p-3 text-xs text-amber-200">
        <span className="font-bold text-amber-400">Note:</span> Working capital
        change (used in cash flow): Year 1 change = Net WC Year 1 − 0; Year 2+
        change = Net WC Year t − Net WC Year t−1.
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Total Depreciation &amp; Amortization by Year ({currencyCode} M)
        </h3>
        <div className="h-64 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
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
                <Line
                  type="monotone"
                  dataKey="Total D&A"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#10b981" }}
                />
                <Line
                  type="monotone"
                  dataKey="FF&E"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          Flat while all assets depreciate; drops after FF&amp;E life (
          {ffeLife} yrs) and again after site life ({siteLife} yrs) if within
          the 10-year window.
        </p>
      </div>

      {onGeneratePnl ? (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onGeneratePnl}
            className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-colors hover:bg-emerald-500"
          >
            Generate P&amp;L →
          </button>
        </div>
      ) : null}
    </div>
  );
}

function isParkCommonInfra(
  developmentType: string | undefined
): boolean {
  return developmentType === "INDUSTRIAL_PARK";
}
