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
import { resolveDataCentreCapEx } from "@/app/operational/cash-outflows/steps/DataCentreConstructionCostsStep";
import useFinModelStore, {
  calculateDataCentreDepreciation,
  type DataCentreDepreciation,
} from "@/store/useFinModelStore";
import { generateDataCentre10YearProjection } from "./c2s1-primary-revenue-data-centre";
import { generateDataCentreOpExProjection } from "./c2s3-operating-expenses-data-centre";

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
  meDeprec: number;
  itDeprec: number;
  ffeReserve: number;
  totalDA: number;
  ar: number;
  ap: number;
  netWc: number;
};

export function generateDataCentreDepreciationProjection(params: {
  buildingCost: number;
  meCost: number;
  itHardwareCost: number;
  includeIT: boolean;
  buildingLife: number;
  meLife: number;
  itLife: number;
  ffeReservePct: number;
  arDays: number;
  apDays: number;
  revenueByYear: number[];
  opexByYear: number[];
}): DeprecRow[] {
  const buildingAnnual =
    params.buildingLife > 0 ? params.buildingCost / params.buildingLife : 0;
  const meAnnual = params.meLife > 0 ? params.meCost / params.meLife : 0;
  const itAnnual =
    params.includeIT && params.itLife > 0
      ? params.itHardwareCost / params.itLife
      : 0;

  const rows: DeprecRow[] = [];
  for (let y = 1; y <= 10; y++) {
    const buildingDeprec = y <= params.buildingLife ? buildingAnnual : 0;
    const meDeprec = y <= params.meLife ? meAnnual : 0;
    const itDeprec =
      params.includeIT && y <= params.itLife ? itAnnual : 0;
    const revenueY = params.revenueByYear[y - 1] ?? 0;
    const opexY = params.opexByYear[y - 1] ?? 0;
    const ffeReserve = revenueY * (params.ffeReservePct / 100);
    const totalDA = buildingDeprec + meDeprec + itDeprec + ffeReserve;
    const ar = revenueY * (params.arDays / 365);
    const ap = opexY * (params.apDays / 365);

    rows.push({
      year: y,
      buildingDeprec,
      meDeprec,
      itDeprec,
      ffeReserve,
      totalDA,
      ar,
      ap,
      netWc: ar - ap,
    });
  }
  return rows;
}

export type DataCentreDepreciationStepErrors = Record<string, string>;

export function validateDataCentreDepreciationStep(
  dep?: DataCentreDepreciation
): DataCentreDepreciationStepErrors {
  const next: DataCentreDepreciationStepErrors = {};
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
  if (!Number.isFinite(dep.meUsefulLifeYears) || dep.meUsefulLifeYears <= 0) {
    next.meUsefulLifeYears = "M&E useful life must be greater than 0.";
  }
  if (
    dep.itHardwareProvidedByOperator &&
    (!Number.isFinite(dep.itHardwareUsefulLifeYears) ||
      dep.itHardwareUsefulLifeYears <= 0)
  ) {
    next.itHardwareUsefulLifeYears =
      "IT Hardware useful life must be greater than 0.";
  }
  if (
    !Number.isFinite(dep.ffeReservePercent) ||
    dep.ffeReservePercent < 0 ||
    dep.ffeReservePercent > 100
  ) {
    next.ffeReservePercent = "FF&E Reserve % must be between 0 and 100.";
  }
  if (!Number.isFinite(dep.arDays) || dep.arDays < 0 || dep.arDays > 365) {
    next.arDays = "A/R days must be between 0 and 365.";
  }
  if (!Number.isFinite(dep.apDays) || dep.apDays < 0 || dep.apDays > 365) {
    next.apDays = "A/P days must be between 0 and 365.";
  }
  return next;
}

type Props = {
  fieldError?: (name: string) => string | undefined;
  onGeneratePnl?: () => void;
};

export default function C2S4DepreciationDataCentre({
  fieldError,
  onGeneratePnl,
}: Props = {}) {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const dataCentreRevenue = useFinModelStore(
    (s) => s.operational.cashInflows?.dataCentreRevenue
  );
  const dataCentreOpEx = useFinModelStore(
    (s) => s.operational.cashInflows?.dataCentreOpEx
  );
  const storedDep = useFinModelStore(
    (s) => s.operational.cashInflows?.dataCentreDepreciation
  );
  const updateCashInflows = useFinModelStore((s) => s.updateCashInflows);
  const currencyCode = projectInfo.currency || "USD";

  const isEdge = projectInfo.dataCentreSegment === "edge";
  const includeIT =
    projectInfo.dataCentreITHardwareProvidedByOperator === true;

  const capEx = useMemo(
    () => resolveDataCentreCapEx(projectInfo),
    [projectInfo]
  );
  const buildingCost = capEx.buildingCost;
  const meCost = capEx.meCost;
  const itHardwareCost = includeIT ? capEx.itHardwareCost : 0;

  const benchBuildingLife = 25;
  const benchMeLife = isEdge ? 12 : 15;
  const benchItLife = isEdge ? 4 : 5;
  const benchFfeReserve = 2.5;
  const benchArDays = isEdge ? 45 : 30;
  const benchApDays = 30;

  const [buildingLife, setBuildingLife] = useState(
    storedDep?.buildingUsefulLifeYears ?? benchBuildingLife
  );
  const [meLife, setMeLife] = useState(
    storedDep?.meUsefulLifeYears ?? benchMeLife
  );
  const [itLife, setItLife] = useState(
    storedDep?.itHardwareUsefulLifeYears ?? benchItLife
  );
  const [ffeReservePct, setFfeReservePct] = useState(
    storedDep?.ffeReservePercent ?? benchFfeReserve
  );
  const [arDays, setArDays] = useState(storedDep?.arDays ?? benchArDays);
  const [apDays, setApDays] = useState(storedDep?.apDays ?? benchApDays);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const totalAnnualRevenue = dataCentreRevenue?.totalAnnualRevenue || 0;
  const totalOpExY1 = dataCentreOpEx?.totalAnnualOpEx || 0;
  const rentEscalationPct = dataCentreRevenue?.annualEscalationPct ?? 3;
  const opExEscalationPct = dataCentreOpEx?.annualEscalationPct ?? 3;
  const inflationPct = dataCentreOpEx?.inflationPct ?? 3;

  const y1Calcs = useMemo(
    () =>
      calculateDataCentreDepreciation({
        buildingCostBase: buildingCost,
        meCostBase: meCost,
        itHardwareCostBase: itHardwareCost,
        itHardwareProvidedByOperator: includeIT,
        buildingUsefulLifeYears: buildingLife,
        meUsefulLifeYears: meLife,
        itHardwareUsefulLifeYears: itLife,
        totalAnnualRevenueBase: totalAnnualRevenue,
        ffeReservePercent: ffeReservePct,
        totalOpExBase: totalOpExY1,
        arDays,
        apDays,
        annualEscalationPct: rentEscalationPct,
        inflationPct,
      }),
    [
      buildingCost,
      meCost,
      itHardwareCost,
      includeIT,
      buildingLife,
      meLife,
      itLife,
      totalAnnualRevenue,
      ffeReservePct,
      totalOpExY1,
      arDays,
      apDays,
      rentEscalationPct,
      inflationPct,
    ]
  );

  const revenueByYear = useMemo(() => {
    const rev = dataCentreRevenue;
    if (!rev) return Array(10).fill(0) as number[];
    return generateDataCentre10YearProjection({
      itLoadKw: rev.itLoadKw || 0,
      whiteSpaceArea: rev.whiteSpaceArea || 0,
      occupancyRate: rev.occupancyRate || 0,
      ratePerKwMonth: rev.ratePerKwMonth || 0,
      ratePerSqftMonth: rev.ratePerSqftMonth || 0,
      annualEscalationPct: rev.annualEscalationPct ?? 3,
    }).map((r) => r.totalRevenue);
  }, [dataCentreRevenue]);

  const opexByYear = useMemo(() => {
    if (!dataCentreOpEx) return Array(10).fill(0) as number[];
    return generateDataCentreOpExProjection({
      annualPowerCost: dataCentreOpEx.annualPowerCost || 0,
      annualMaintenance: dataCentreOpEx.annualMaintenance || 0,
      annualLabor: dataCentreOpEx.annualLabor || 0,
      annualInsurance: dataCentreOpEx.annualInsurance || 0,
      annualPropertyTax: dataCentreOpEx.annualPropertyTax || 0,
      annualSecurity: dataCentreOpEx.annualSecurity || 0,
      annualWaterUtilities: dataCentreOpEx.annualWaterUtilities || 0,
      annualMgmtFee: dataCentreOpEx.annualMgmtFee || 0,
      annualGAndA: dataCentreOpEx.annualGAndA || 0,
      annualEscalationPct: opExEscalationPct,
      inflationPct,
    }).map((r) => r.total);
  }, [dataCentreOpEx, opExEscalationPct, inflationPct]);

  const tableRows = useMemo(
    () =>
      generateDataCentreDepreciationProjection({
        buildingCost,
        meCost,
        itHardwareCost,
        includeIT,
        buildingLife,
        meLife,
        itLife,
        ffeReservePct,
        arDays,
        apDays,
        revenueByYear,
        opexByYear,
      }),
    [
      buildingCost,
      meCost,
      itHardwareCost,
      includeIT,
      buildingLife,
      meLife,
      itLife,
      ffeReservePct,
      arDays,
      apDays,
      revenueByYear,
      opexByYear,
    ]
  );

  const persist = useCallback(
    (partial?: Partial<DataCentreDepreciation>) => {
      const next = calculateDataCentreDepreciation({
        buildingCostBase: buildingCost,
        meCostBase: meCost,
        itHardwareCostBase: itHardwareCost,
        itHardwareProvidedByOperator: includeIT,
        buildingUsefulLifeYears:
          partial?.buildingUsefulLifeYears ?? buildingLife,
        meUsefulLifeYears: partial?.meUsefulLifeYears ?? meLife,
        itHardwareUsefulLifeYears:
          partial?.itHardwareUsefulLifeYears ?? itLife,
        totalAnnualRevenueBase: totalAnnualRevenue,
        ffeReservePercent: partial?.ffeReservePercent ?? ffeReservePct,
        totalOpExBase: totalOpExY1,
        arDays: partial?.arDays ?? arDays,
        apDays: partial?.apDays ?? apDays,
        annualEscalationPct: rentEscalationPct,
        inflationPct,
      });
      updateCashInflows({ dataCentreDepreciation: next }, "operational");
    },
    [
      buildingCost,
      meCost,
      itHardwareCost,
      includeIT,
      buildingLife,
      meLife,
      itLife,
      totalAnnualRevenue,
      ffeReservePct,
      totalOpExY1,
      arDays,
      apDays,
      rentEscalationPct,
      inflationPct,
      updateCashInflows,
    ]
  );

  useEffect(() => {
    persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    buildingCost,
    meCost,
    itHardwareCost,
    includeIT,
    totalAnnualRevenue,
    totalOpExY1,
  ]);

  const handleFieldChange = useCallback(
    (field: string, value: number) => {
      const setters: Record<string, (v: number) => void> = {
        buildingUsefulLifeYears: setBuildingLife,
        meUsefulLifeYears: setMeLife,
        itHardwareUsefulLifeYears: setItLife,
        ffeReservePercent: setFfeReservePct,
        arDays: setArDays,
        apDays: setApDays,
      };
      setters[field]?.(value);
      setOverrides((prev) => ({ ...prev, [field]: true }));
      persist({ [field]: value } as Partial<DataCentreDepreciation>);
    },
    [persist]
  );

  const handleResetDeprec = () => {
    setBuildingLife(benchBuildingLife);
    setMeLife(benchMeLife);
    setItLife(benchItLife);
    setFfeReservePct(benchFfeReserve);
    setOverrides((prev) => ({
      ...prev,
      buildingUsefulLifeYears: false,
      meUsefulLifeYears: false,
      itHardwareUsefulLifeYears: false,
      ffeReservePercent: false,
    }));
    persist({
      buildingUsefulLifeYears: benchBuildingLife,
      meUsefulLifeYears: benchMeLife,
      itHardwareUsefulLifeYears: benchItLife,
      ffeReservePercent: benchFfeReserve,
    });
  };

  const handleResetWc = () => {
    setArDays(benchArDays);
    setApDays(benchApDays);
    setOverrides((prev) => ({
      ...prev,
      arDays: false,
      apDays: false,
    }));
    persist({ arDays: benchArDays, apDays: benchApDays });
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
        "FF&E Reserve": row.ffeReserve / 1_000_000,
      })),
    [tableRows]
  );

  const hasManualOverride = Object.values(overrides).some(Boolean);
  const deprecOverride =
    !!overrides.buildingUsefulLifeYears ||
    !!overrides.meUsefulLifeYears ||
    !!overrides.itHardwareUsefulLifeYears ||
    !!overrides.ffeReservePercent;
  const wcOverride = !!overrides.arDays || !!overrides.apDays;

  const segmentLabel =
    projectInfo.dataCentreSegment === "edge" ? "Edge" : "Colocation";

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 4 — Depreciation, Amortization &amp; Working Capital
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Straight-line depreciation on Building, M&amp;E
          {includeIT ? ", and IT Hardware" : ""}, plus FF&amp;E renovation
          reserve and working capital from A/R and A/P days.{" "}
          <span className="text-amber-500">Amber borders</span> indicate manual
          overrides.
        </p>
      </div>

      <BenchmarkHeader
        assetType="data_centre"
        country={projectInfo.country || "UAE"}
        segment={segmentLabel}
        positioning={projectInfo.dataCentrePositioning}
        onUseDefaults={handleResetAll}
        isManualOverride={hasManualOverride}
        resetButtonLabel="Reset to benchmark"
      />

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Depreciation Bases (from Component 1 CapEx)
        </h3>
        <div
          className={`grid grid-cols-1 gap-4 ${
            includeIT ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="mb-1 text-xs text-slate-400">Building Cost</div>
            <div className="font-mono text-lg font-bold text-emerald-400">
              {money(buildingCost, currencyCode)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="mb-1 text-xs text-slate-400">M&amp;E Cost</div>
            <div className="font-mono text-lg font-bold text-emerald-400">
              {money(meCost, currencyCode)}
            </div>
          </div>
          {includeIT ? (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <div className="mb-1 text-xs text-slate-400">IT Hardware Cost</div>
              <div className="font-mono text-lg font-bold text-emerald-400">
                {money(itHardwareCost, currencyCode)}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Useful Life &amp; FF&amp;E Reserve Assumptions
          </h3>
          <button
            type="button"
            onClick={handleResetDeprec}
            className={`text-xs font-medium transition-colors ${
              deprecOverride
                ? "text-emerald-400 hover:text-emerald-300"
                : "cursor-default text-slate-500"
            }`}
            disabled={!deprecOverride}
          >
            Reset depreciations
          </button>
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
              label="M&E Useful Life (years)"
              value={meLife}
              onChange={(val) =>
                handleFieldChange("meUsefulLifeYears", Number(val) || 0)
              }
              type="number"
              step={1}
              min={1}
              isManualOverride={!!overrides.meUsefulLifeYears}
            />
            {fieldError?.("meUsefulLifeYears") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("meUsefulLifeYears")}
              </p>
            ) : null}
          </div>
          {includeIT ? (
            <div>
              <AiInput
                label="IT Hardware Useful Life (years)"
                value={itLife}
                onChange={(val) =>
                  handleFieldChange(
                    "itHardwareUsefulLifeYears",
                    Number(val) || 0
                  )
                }
                type="number"
                step={1}
                min={1}
                isManualOverride={!!overrides.itHardwareUsefulLifeYears}
              />
              {fieldError?.("itHardwareUsefulLifeYears") ? (
                <p className="mt-1 text-sm text-red-400">
                  {fieldError("itHardwareUsefulLifeYears")}
                </p>
              ) : null}
            </div>
          ) : null}
          <div>
            <AiInput
              label="FF&E Reserve (% of Revenue)"
              value={ffeReservePct}
              onChange={(val) =>
                handleFieldChange("ffeReservePercent", Number(val) || 0)
              }
              type="percentage"
              step={0.1}
              min={0}
              isManualOverride={!!overrides.ffeReservePercent}
            />
            {fieldError?.("ffeReservePercent") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("ffeReservePercent")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="mb-1 text-xs text-slate-400">
              Annual Building Depreciation
            </div>
            <div className="font-mono text-base font-semibold text-teal-400">
              {money(y1Calcs.annualBuildingDeprec, currencyCode)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="mb-1 text-xs text-slate-400">
              Annual M&amp;E Depreciation
            </div>
            <div className="font-mono text-base font-semibold text-teal-400">
              {money(y1Calcs.annualMEDeprec, currencyCode)}
            </div>
          </div>
          {includeIT ? (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <div className="mb-1 text-xs text-slate-400">
                Annual IT Hardware Depreciation
              </div>
              <div className="font-mono text-base font-semibold text-teal-400">
                {money(y1Calcs.annualITHardwareDeprec, currencyCode)}
              </div>
            </div>
          ) : null}
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="mb-1 text-xs text-slate-400">
              Annual FF&amp;E Reserve
            </div>
            <div className="font-mono text-base font-semibold text-amber-400">
              {money(y1Calcs.annualFFEReserve, currencyCode)}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 p-4 md:col-span-2">
            <div className="mb-1 text-xs text-slate-400">
              Total Annual Depreciation &amp; Amortization
            </div>
            <div className="font-mono text-xl font-bold text-emerald-400">
              {money(y1Calcs.totalDA, currencyCode)}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">Working Capital</h3>
          <button
            type="button"
            onClick={handleResetWc}
            className={`text-xs font-medium transition-colors ${
              wcOverride
                ? "text-emerald-400 hover:text-emerald-300"
                : "cursor-default text-slate-500"
            }`}
            disabled={!wcOverride}
          >
            Reset WC
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="mb-1 text-xs text-slate-400">
              Total Annual Revenue (Auto)
            </div>
            <div className="font-mono text-base font-semibold text-slate-200">
              {money(totalAnnualRevenue, currencyCode)}
            </div>
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
              isManualOverride={!!overrides.arDays}
            />
            {fieldError?.("arDays") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("arDays")}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="mb-1 text-xs text-slate-400">Accounts Receivable</div>
            <div className="font-mono text-base font-semibold text-teal-400">
              {money(y1Calcs.accountsReceivable, currencyCode)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="mb-1 text-xs text-slate-400">
              Total Annual OpEx (Auto)
            </div>
            <div className="font-mono text-base font-semibold text-slate-200">
              {money(totalOpExY1, currencyCode)}
            </div>
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
              isManualOverride={!!overrides.apDays}
            />
            {fieldError?.("apDays") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("apDays")}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div className="mb-1 text-xs text-slate-400">Accounts Payable</div>
            <div className="font-mono text-base font-semibold text-teal-400">
              {money(y1Calcs.accountsPayable, currencyCode)}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 p-4 md:col-span-2 lg:col-span-3">
            <div className="mb-1 text-xs text-slate-400">Net Working Capital</div>
            <div className="font-mono text-2xl font-bold text-emerald-400">
              {money(y1Calcs.netWorkingCapital, currencyCode)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              A/R − A/P (Year 1 basis from C2S1 revenue and C2S3 OpEx)
            </p>
          </div>
        </div>
      </div>

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
                <th className="px-3 py-3">M&amp;E Deprec</th>
                <th className="px-3 py-3">IT Hardware Deprec</th>
                <th className="px-3 py-3">FF&amp;E Reserve</th>
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
                    {(row.meDeprec / 1_000_000).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 font-mono text-teal-400">
                    {(row.itDeprec / 1_000_000).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 font-mono text-amber-400">
                    {(row.ffeReserve / 1_000_000).toFixed(2)}
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
                <td className="px-3 py-3 font-mono text-emerald-400">
                  {(
                    tableRows.reduce((s, r) => s + r.buildingDeprec, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
                <td className="px-3 py-3 font-mono text-emerald-400">
                  {(
                    tableRows.reduce((s, r) => s + r.meDeprec, 0) / 1_000_000
                  ).toFixed(2)}
                </td>
                <td className="px-3 py-3 font-mono text-emerald-400">
                  {(
                    tableRows.reduce((s, r) => s + r.itDeprec, 0) / 1_000_000
                  ).toFixed(2)}
                </td>
                <td className="px-3 py-3 font-mono text-emerald-400">
                  {(
                    tableRows.reduce((s, r) => s + r.ffeReserve, 0) /
                    1_000_000
                  ).toFixed(2)}
                </td>
                <td className="px-3 py-3 font-mono text-emerald-400">
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
                  dataKey="FF&E Reserve"
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
          Asset depreciation is flat until useful life ends, then drops to 0.
          FF&amp;E reserve escalates with revenue
          {includeIT
            ? `; IT Hardware drops after ${itLife} yrs`
            : ""}
          {meLife <= 10 ? `; M&E drops after ${meLife} yrs` : ""}.
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
