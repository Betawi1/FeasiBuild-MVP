"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { AiInput } from "@/components/ui/AiInput";
import {
  extractWarehouseAiStep2,
  extractWarehouseAiStep3,
  getWarehouseAiC2,
} from "@/lib/warehouse-ai-c2";
import useFinModelStore, {
  calculateWarehouseOpEx,
  calculateWarehouseOtherIncome,
  warehouseCamExpensePool,
  type WarehouseOtherIncome,
  type WarehouseOpEx,
} from "@/store/useFinModelStore";
import { generateWarehouse10YearProjection } from "./c2s1-primary-revenue-warehouse";

const inputBase =
  "w-full rounded bg-slate-900 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

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

type OtherIncomeRow = {
  year: number;
  cam: number;
  tax: number;
  insurance: number;
  advertising: number;
  total: number;
  isOverridden: boolean;
};

export function generateWarehouseOtherIncomeProjection(params: {
  /** @deprecated CAM uses OpEx pool; kept optional for callers mid-migration */
  totalRevenueByYear?: number[];
  totalCamExpensesY1: number;
  camRecoveryPct: number;
  estimatedPropertyTaxY1: number;
  taxRecoveryPct: number;
  estimatedInsuranceY1: number;
  insuranceRecoveryPct: number;
  rentEscalationPct: number;
  signageRevenue: number;
  signageEscalationPct?: number;
  manualYearValues?: Record<number, Partial<OtherIncomeRow>>;
}): { rows: OtherIncomeRow[]; totals: Record<string, number> } {
  const rows: OtherIncomeRow[] = [];
  let totalCam = 0;
  let totalTax = 0;
  let totalIns = 0;
  let totalAdv = 0;
  const signageEsc = params.signageEscalationPct ?? 0;

  for (let y = 1; y <= 10; y++) {
    const manual = params.manualYearValues?.[y] ?? {};
    const factor = Math.pow(1 + params.rentEscalationPct / 100, y - 1);
    const camBaseY = params.totalCamExpensesY1 * factor;
    const taxBaseY = params.estimatedPropertyTaxY1 * factor;
    const insBaseY = params.estimatedInsuranceY1 * factor;

    const cam = manual.cam ?? camBaseY * (params.camRecoveryPct / 100);
    const tax = manual.tax ?? taxBaseY * (params.taxRecoveryPct / 100);
    const insurance =
      manual.insurance ?? insBaseY * (params.insuranceRecoveryPct / 100);
    const advertising =
      manual.advertising ??
      params.signageRevenue * Math.pow(1 + signageEsc / 100, y - 1);
    const total = manual.total ?? cam + tax + insurance + advertising;

    totalCam += cam;
    totalTax += tax;
    totalIns += insurance;
    totalAdv += advertising;

    rows.push({
      year: y,
      cam,
      tax,
      insurance,
      advertising,
      total,
      isOverridden: Object.keys(manual).length > 0,
    });
  }

  return {
    rows,
    totals: {
      cam: totalCam,
      tax: totalTax,
      insurance: totalIns,
      advertising: totalAdv,
      total: totalCam + totalTax + totalIns + totalAdv,
    },
  };
}

export type WarehouseOtherIncomeStepErrors = Record<string, string>;

export function validateWarehouseOtherIncomeStep(
  otherIncome: WarehouseOtherIncome | undefined,
  totalAnnualRevenue?: number
): WarehouseOtherIncomeStepErrors {
  const next: WarehouseOtherIncomeStepErrors = {};
  if (!Number.isFinite(totalAnnualRevenue) || (totalAnnualRevenue ?? 0) <= 0) {
    next.totalAnnualRevenue =
      "Complete Step 1 (Primary Revenue) before configuring other income.";
  }
  if (
    !Number.isFinite(otherIncome?.camRecoveryPct ?? NaN) ||
    (otherIncome?.camRecoveryPct ?? 0) < 0 ||
    (otherIncome?.camRecoveryPct ?? 0) > 100
  ) {
    next.camRecoveryPct = "CAM % must be between 0% and 100%.";
  }
  if (
    !Number.isFinite(otherIncome?.taxRecoveryPct ?? NaN) ||
    (otherIncome?.taxRecoveryPct ?? 0) < 0 ||
    (otherIncome?.taxRecoveryPct ?? 0) > 100
  ) {
    next.taxRecoveryPct = "Tax recovery % must be between 0% and 100%.";
  }
  if (
    !Number.isFinite(otherIncome?.insuranceRecoveryPct ?? NaN) ||
    (otherIncome?.insuranceRecoveryPct ?? 0) < 0 ||
    (otherIncome?.insuranceRecoveryPct ?? 0) > 100
  ) {
    next.insuranceRecoveryPct =
      "Insurance recovery % must be between 0% and 100%.";
  }
  return next;
}

type Props = {
  fieldError?: (name: string) => string | undefined;
};

export default function C2S2OtherIncomeWarehouse({ fieldError }: Props = {}) {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const warehouseRevenue = useFinModelStore(
    (s) => s.operational.cashInflows?.warehouseRevenue
  );
  const warehouseOtherIncome = useFinModelStore(
    (s) => s.operational.cashInflows?.warehouseOtherIncome
  );
  const warehouseOpEx = useFinModelStore(
    (s) => s.operational.cashInflows?.warehouseOpEx
  );
  const updateCashInflows = useFinModelStore((s) => s.updateCashInflows);
  const currencyCode = projectInfo.currency || "USD";

  const isPark = cashOutflows.developmentType === "INDUSTRIAL_PARK";
  const benchCamPct = 80;
  const benchTaxPct = 100;
  const benchInsurancePct = 100;
  const benchSignage = isPark ? 30_000 : 10_000;

  const aiC2 = useMemo(
    () => getWarehouseAiC2(cashOutflows?.aiResearchData),
    [cashOutflows?.aiResearchData]
  );
  const aiStep2 = useMemo(() => extractWarehouseAiStep2(aiC2), [aiC2]);
  const aiStep3 = useMemo(() => extractWarehouseAiStep3(aiC2), [aiC2]);

  const aiCamPct = aiStep2.cam_recovery_pct;
  const aiTaxPct = aiStep2.property_tax_recovery_pct;
  const aiInsurancePct = aiStep2.insurance_recovery_pct;
  const aiSignage = aiStep2.signage_annual_revenue;

  /** Live OpEx snapshot — store when available, else AI/bench provisional. */
  const resolvedOpEx = useMemo((): WarehouseOpEx => {
    const totalCapEx = cashOutflows.tdc || cashOutflows.constructionCost || 0;
    const costs = cashOutflows.warehouseCosts;
    const totalBuildingCost =
      (costs?.buildingShellCost || 0) +
        (costs?.siteYardWorksCost || 0) +
        (costs?.loadingAccessCost || 0) +
        (costs?.specialisedSystemsCost || 0) +
        (costs?.commonInfrastructureCost || 0) +
        (costs?.professionalFees || 0) ||
      cashOutflows.constructionCost ||
      0;
    const units = isPark
      ? Math.max(1, cashOutflows.industrialParkConfig?.numberOfWarehouses || 1)
      : 1;
    const parkCommon =
      cashOutflows.industrialParkConfig?.commonInfrastructureArea || 0;
    const unitYard = cashOutflows.warehouseConfig?.yardArea || 0;
    const commonArea =
      isPark && parkCommon > 0
        ? parkCommon
        : unitYard > 0
          ? unitYard * units
          : (cashOutflows.warehouseConfig?.totalLandArea || 0) * units * 0.15;
    const totalGfa =
      warehouseRevenue?.totalGfa ||
      (isPark
        ? cashOutflows.industrialParkConfig?.warehouseMix.reduce(
            (s, w) => s + (w.size || 0),
            0
          ) || (cashOutflows.warehouseConfig?.totalBua || 0) * units
        : cashOutflows.warehouseConfig?.totalBua || 0);
    const totalAnnualRevenue = warehouseRevenue?.totalAnnualRevenue || 0;

    const provisional = calculateWarehouseOpEx(
      {
        totalCapEx,
        propertyTaxRate:
          warehouseOpEx?.propertyTaxRate ??
          aiStep3.property_tax_pct_of_capex ??
          1,
        annualPropertyTax: 0,
        insuranceRate:
          warehouseOpEx?.insuranceRate ??
          aiStep3.insurance_pct_of_capex ??
          0.4,
        annualInsurance: 0,
        totalBuildingCost,
        maintenanceRate:
          warehouseOpEx?.maintenanceRate ??
          aiStep3.maintenance_pct_of_building_cost ??
          1.5,
        annualMaintenance: 0,
        commonAreaSqft: warehouseOpEx?.commonAreaSqft ?? commonArea,
        landscapingRate:
          warehouseOpEx?.landscapingRate ??
          aiStep3.landscaping_rate_psf ??
          (isPark ? 0.35 : 0.3),
        annualLandscaping: 0,
        totalGfa,
        utilityRate:
          warehouseOpEx?.utilityRate ??
          aiStep3.utilities_rate_psf ??
          (isPark ? 0.45 : 0.5),
        annualUtilities: 0,
        annualSecurity:
          warehouseOpEx?.annualSecurity ??
          aiStep3.security_annual_cost ??
          (isPark ? 150_000 : 50_000),
        managementFeeRate:
          warehouseOpEx?.managementFeeRate ??
          aiStep3.management_fee_pct_revenue ??
          3,
        annualManagementFee: 0,
        gAndARate:
          warehouseOpEx?.gAndARate ?? aiStep3.g_and_a_pct_revenue ?? 2,
        annualGAndA: 0,
        totalAnnualOpEx: 0,
        opExAsPctOfRevenue: 0,
      },
      totalAnnualRevenue
    );

    // Prefer persisted annuals when Step 3 has already run
    if (warehouseCamExpensePool(warehouseOpEx) > 0) {
      return {
        ...provisional,
        ...warehouseOpEx,
        annualPropertyTax:
          warehouseOpEx?.annualPropertyTax ?? provisional.annualPropertyTax,
        annualInsurance:
          warehouseOpEx?.annualInsurance ?? provisional.annualInsurance,
        annualMaintenance:
          warehouseOpEx?.annualMaintenance ?? provisional.annualMaintenance,
        annualLandscaping:
          warehouseOpEx?.annualLandscaping ?? provisional.annualLandscaping,
        annualUtilities:
          warehouseOpEx?.annualUtilities ?? provisional.annualUtilities,
        annualSecurity:
          warehouseOpEx?.annualSecurity ?? provisional.annualSecurity,
        annualManagementFee:
          warehouseOpEx?.annualManagementFee ?? provisional.annualManagementFee,
      } as WarehouseOpEx;
    }
    return provisional;
  }, [
    cashOutflows,
    warehouseOpEx,
    warehouseRevenue,
    aiStep3,
    isPark,
  ]);

  const totalCamExpenses = warehouseCamExpensePool(resolvedOpEx);
  const estimatedPropertyTax = resolvedOpEx.annualPropertyTax || 0;
  const estimatedInsurance = resolvedOpEx.annualInsurance || 0;

  const [camRecoveryPct, setCamRecoveryPct] = useState(
    warehouseOtherIncome?.camRecoveryPct ?? aiCamPct ?? benchCamPct
  );
  const [taxRecoveryPct, setTaxRecoveryPct] = useState(
    warehouseOtherIncome?.taxRecoveryPct ?? aiTaxPct ?? benchTaxPct
  );
  const [insuranceRecoveryPct, setInsuranceRecoveryPct] = useState(
    warehouseOtherIncome?.insuranceRecoveryPct ??
      aiInsurancePct ??
      benchInsurancePct
  );
  const [signageRevenue, setSignageRevenue] = useState(
    warehouseOtherIncome?.signageRevenue ?? aiSignage ?? benchSignage
  );
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Partial<OtherIncomeRow>>
  >({});

  const rentEscalationPct = warehouseRevenue?.rentEscalationPct ?? 3;

  const step1Projection = useMemo(() => {
    const rev = warehouseRevenue;
    if (!rev) return [];
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
    });
  }, [warehouseRevenue]);

  const totalAnnualRevenue =
    warehouseRevenue?.totalAnnualRevenue ||
    step1Projection[0]?.totalRevenue ||
    0;

  const tableData = useMemo(
    () =>
      generateWarehouseOtherIncomeProjection({
        totalCamExpensesY1: totalCamExpenses,
        camRecoveryPct,
        estimatedPropertyTaxY1: estimatedPropertyTax,
        taxRecoveryPct,
        estimatedInsuranceY1: estimatedInsurance,
        insuranceRecoveryPct,
        rentEscalationPct,
        signageRevenue,
        signageEscalationPct: 0,
        manualYearValues,
      }),
    [
      totalCamExpenses,
      camRecoveryPct,
      estimatedPropertyTax,
      taxRecoveryPct,
      estimatedInsurance,
      insuranceRecoveryPct,
      rentEscalationPct,
      signageRevenue,
      manualYearValues,
    ]
  );

  const persist = useCallback(
    (
      partial?: Partial<{
        camRecoveryPct: number;
        taxRecoveryPct: number;
        insuranceRecoveryPct: number;
        signageRevenue: number;
      }>
    ) => {
      const cam = partial?.camRecoveryPct ?? camRecoveryPct;
      const taxPct = partial?.taxRecoveryPct ?? taxRecoveryPct;
      const insPct = partial?.insuranceRecoveryPct ?? insuranceRecoveryPct;
      const signage = partial?.signageRevenue ?? signageRevenue;
      const next = calculateWarehouseOtherIncome(
        {
          camRecoveryPct: cam,
          annualCamRevenue: 0,
          taxRecoveryPct: taxPct,
          annualTaxRecovery: 0,
          insuranceRecoveryPct: insPct,
          annualInsuranceRecovery: 0,
          signageRevenue: signage,
          totalOtherIncome: 0,
        },
        {
          totalCamExpenses,
          annualPropertyTax: estimatedPropertyTax,
          annualInsurance: estimatedInsurance,
        }
      );
      updateCashInflows({ warehouseOtherIncome: next }, "operational");
    },
    [
      camRecoveryPct,
      taxRecoveryPct,
      insuranceRecoveryPct,
      signageRevenue,
      totalCamExpenses,
      estimatedPropertyTax,
      estimatedInsurance,
      updateCashInflows,
    ]
  );

  useEffect(() => {
    persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCamExpenses, estimatedPropertyTax, estimatedInsurance]);

  useEffect(() => {
    const patch: {
      camRecoveryPct?: number;
      taxRecoveryPct?: number;
      insuranceRecoveryPct?: number;
      signageRevenue?: number;
    } = {};
    // Prefer AI whenever stored still has the old revenue-based CAM default (5%)
    const canApply = (stored: number | undefined, bench: number) =>
      stored == null || stored === bench;
    const canApplyCam = (stored: number | undefined) =>
      stored == null || stored === benchCamPct || stored === 5;

    if (
      aiCamPct != null &&
      !overrides.camRecoveryPct &&
      canApplyCam(warehouseOtherIncome?.camRecoveryPct)
    ) {
      setCamRecoveryPct(aiCamPct);
      patch.camRecoveryPct = aiCamPct;
    }
    if (
      aiTaxPct != null &&
      !overrides.taxRecoveryPct &&
      canApply(warehouseOtherIncome?.taxRecoveryPct, benchTaxPct)
    ) {
      setTaxRecoveryPct(aiTaxPct);
      patch.taxRecoveryPct = aiTaxPct;
    }
    if (
      aiInsurancePct != null &&
      !overrides.insuranceRecoveryPct &&
      canApply(warehouseOtherIncome?.insuranceRecoveryPct, benchInsurancePct)
    ) {
      setInsuranceRecoveryPct(aiInsurancePct);
      patch.insuranceRecoveryPct = aiInsurancePct;
    }
    if (
      aiSignage != null &&
      !overrides.signageRevenue &&
      canApply(warehouseOtherIncome?.signageRevenue, benchSignage)
    ) {
      setSignageRevenue(aiSignage);
      patch.signageRevenue = aiSignage;
    }
    if (Object.keys(patch).length > 0) {
      persist(patch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiCamPct, aiTaxPct, aiInsurancePct, aiSignage]);

  const handleFieldChange = useCallback(
    (field: string, value: number) => {
      if (field === "camRecoveryPct") setCamRecoveryPct(value);
      if (field === "taxRecoveryPct") setTaxRecoveryPct(value);
      if (field === "insuranceRecoveryPct") setInsuranceRecoveryPct(value);
      if (field === "signageRevenue") setSignageRevenue(value);
      setOverrides((prev) => ({ ...prev, [field]: true }));
      persist({ [field]: value } as never);
    },
    [persist]
  );

  const clearStream = (stream: keyof OtherIncomeRow) => {
    setManualYearValues((prev) => {
      const next = { ...prev };
      for (let y = 1; y <= 10; y++) {
        if (next[y]) {
          delete next[y][stream];
          if (Object.keys(next[y]).length === 0) delete next[y];
        }
      }
      return next;
    });
  };

  const handleResetCam = () => {
    const v = aiCamPct ?? benchCamPct;
    setCamRecoveryPct(v);
    setOverrides((prev) => ({ ...prev, camRecoveryPct: false }));
    clearStream("cam");
    persist({ camRecoveryPct: v });
  };

  const handleResetTax = () => {
    const v = aiTaxPct ?? benchTaxPct;
    setTaxRecoveryPct(v);
    setOverrides((prev) => ({ ...prev, taxRecoveryPct: false }));
    clearStream("tax");
    persist({ taxRecoveryPct: v });
  };

  const handleResetInsurance = () => {
    const v = aiInsurancePct ?? benchInsurancePct;
    setInsuranceRecoveryPct(v);
    setOverrides((prev) => ({ ...prev, insuranceRecoveryPct: false }));
    clearStream("insurance");
    persist({ insuranceRecoveryPct: v });
  };

  const handleResetSignage = () => {
    const v = aiSignage ?? benchSignage;
    setSignageRevenue(v);
    setOverrides((prev) => ({ ...prev, signageRevenue: false }));
    clearStream("advertising");
    persist({ signageRevenue: v });
  };

  const handleResetAll = () => {
    handleResetCam();
    handleResetTax();
    handleResetInsurance();
    handleResetSignage();
    setOverrides({});
    setManualYearValues({});
  };

  const handleCellOverride = (
    year: number,
    stream: "cam" | "tax" | "insurance" | "advertising",
    value: number
  ) => {
    setManualYearValues((prev) => ({
      ...prev,
      [year]: { ...prev[year], [stream]: value },
    }));
  };

  const chartData = useMemo(
    () =>
      tableData.rows.map((row) => ({
        year: `Y${row.year}`,
        "CAM Recoveries": row.cam / 1_000_000,
        "Tax Recoveries": row.tax / 1_000_000,
        "Insurance Recoveries": row.insurance / 1_000_000,
        Advertising: row.advertising / 1_000_000,
      })),
    [tableData.rows]
  );

  const annualCamRevenue = totalCamExpenses * (camRecoveryPct / 100);
  const annualTaxRecovery = estimatedPropertyTax * (taxRecoveryPct / 100);
  const annualInsuranceRecovery =
    estimatedInsurance * (insuranceRecoveryPct / 100);
  const totalOtherIncomeY1 =
    annualCamRevenue +
    annualTaxRecovery +
    annualInsuranceRecovery +
    signageRevenue;

  const hasManualOverride =
    Object.values(overrides).some(Boolean) ||
    Object.keys(manualYearValues).length > 0;

  const camOverride = !!overrides.camRecoveryPct;
  const taxOverride = !!overrides.taxRecoveryPct;
  const insuranceOverride = !!overrides.insuranceRecoveryPct;
  const signageOverride = !!overrides.signageRevenue;

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 2 — Other Income
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          CAM, property tax, and insurance recoveries sync from Step 3 OpEx.
          Adjust recovery rates below.{" "}
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

      <div className="rounded-lg border border-blue-500/30 bg-blue-900/15 p-4 text-xs text-blue-200">
        Values sync from Step 3. Adjust recovery rates below. If Step 3 has not
        been visited yet, provisional OpEx from AI / benchmarks is used.
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/30 p-4">
        <span className="text-sm text-slate-300">
          From Step 1 — Total Annual Revenue:
        </span>
        <span className="font-mono text-lg font-bold text-emerald-400">
          {money(totalAnnualRevenue, currencyCode)}
        </span>
      </div>

      {/* Card 1: CAM */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">1. CAM Recoveries</h3>
          <button
            type="button"
            onClick={handleResetCam}
            className={`text-xs font-medium transition-colors ${
              camOverride
                ? "text-emerald-400 hover:text-emerald-300"
                : "cursor-default text-slate-500"
            }`}
            disabled={!camOverride}
          >
            Reset CAM
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Total CAM Expenses (from Step 3)
            </label>
            <input
              type="text"
              readOnly
              value={money(totalCamExpenses, currencyCode)}
              className="w-full cursor-not-allowed rounded bg-slate-900 p-2 text-slate-400 border border-slate-700"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Maintenance + Landscaping + Utilities + Security + Management Fee
            </p>
          </div>
          <div>
            <AiInput
              label="CAM Recovery (%)"
              value={camRecoveryPct}
              onChange={(val) =>
                handleFieldChange("camRecoveryPct", Number(val) || 0)
              }
              type="percentage"
              step={0.1}
              min={0}
              max={100}
              helperText="% billed to tenants"
              isAiGenerated={aiCamPct != null && !overrides.camRecoveryPct}
              isManualOverride={!!overrides.camRecoveryPct}
            />
            {fieldError?.("camRecoveryPct") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("camRecoveryPct")}
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual CAM Revenue
            </label>
            <input
              type="text"
              readOnly
              value={money(annualCamRevenue, currencyCode)}
              className={`${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 font-semibold text-emerald-400`}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Total CAM Expenses × CAM Recovery %
            </p>
          </div>
        </div>
      </div>

      {/* Card 2: Tax */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">2. Tax Recoveries</h3>
          <button
            type="button"
            onClick={handleResetTax}
            className={`text-xs font-medium transition-colors ${
              taxOverride
                ? "text-emerald-400 hover:text-emerald-300"
                : "cursor-default text-slate-500"
            }`}
            disabled={!taxOverride}
          >
            Reset tax
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Estimated Property Tax (from Step 3)
            </label>
            <input
              type="text"
              readOnly
              value={money(estimatedPropertyTax, currencyCode)}
              className="w-full cursor-not-allowed rounded bg-slate-900 p-2 text-slate-400 border border-slate-700"
            />
          </div>
          <div>
            <AiInput
              label="Property Tax Recovery (%)"
              value={taxRecoveryPct}
              onChange={(val) =>
                handleFieldChange("taxRecoveryPct", Number(val) || 0)
              }
              type="percentage"
              step={0.1}
              min={0}
              max={100}
              isAiGenerated={aiTaxPct != null && !overrides.taxRecoveryPct}
              isManualOverride={!!overrides.taxRecoveryPct}
            />
            {fieldError?.("taxRecoveryPct") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("taxRecoveryPct")}
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Tax Recovery
            </label>
            <input
              type="text"
              readOnly
              value={money(annualTaxRecovery, currencyCode)}
              className={`${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 font-semibold text-emerald-400`}
            />
          </div>
        </div>
      </div>

      {/* Card 3: Insurance */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            3. Insurance Recoveries
          </h3>
          <button
            type="button"
            onClick={handleResetInsurance}
            className={`text-xs font-medium transition-colors ${
              insuranceOverride
                ? "text-emerald-400 hover:text-emerald-300"
                : "cursor-default text-slate-500"
            }`}
            disabled={!insuranceOverride}
          >
            Reset insurance
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Total Insurance (from Step 3)
            </label>
            <input
              type="text"
              readOnly
              value={money(estimatedInsurance, currencyCode)}
              className="w-full cursor-not-allowed rounded bg-slate-900 p-2 text-slate-400 border border-slate-700"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Auto-populated from OpEx
            </p>
          </div>
          <div>
            <AiInput
              label="Insurance Recovery (%)"
              value={insuranceRecoveryPct}
              onChange={(val) =>
                handleFieldChange("insuranceRecoveryPct", Number(val) || 0)
              }
              type="percentage"
              step={0.1}
              min={0}
              max={100}
              helperText="% billed to tenants"
              isAiGenerated={
                aiInsurancePct != null && !overrides.insuranceRecoveryPct
              }
              isManualOverride={!!overrides.insuranceRecoveryPct}
            />
            {fieldError?.("insuranceRecoveryPct") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("insuranceRecoveryPct")}
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Insurance Recovery
            </label>
            <input
              type="text"
              readOnly
              value={money(annualInsuranceRecovery, currencyCode)}
              className={`${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 font-semibold text-emerald-400`}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Total Insurance × Insurance Recovery %
            </p>
          </div>
        </div>
      </div>

      {/* Card 4: Signage */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            4. Advertising / Signage
          </h3>
          <button
            type="button"
            onClick={handleResetSignage}
            className={`text-xs font-medium transition-colors ${
              signageOverride
                ? "text-emerald-400 hover:text-emerald-300"
                : "cursor-default text-slate-500"
            }`}
            disabled={!signageOverride}
          >
            Reset advertising
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <AiInput
              label={`Signage Revenue — annual (${currencyCode})`}
              value={signageRevenue}
              onChange={(val) =>
                handleFieldChange("signageRevenue", Number(val) || 0)
              }
              type="number"
              step={100}
              min={0}
              isAiGenerated={aiSignage != null && !overrides.signageRevenue}
              isManualOverride={!!overrides.signageRevenue}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Signage Revenue
            </label>
            <input
              type="text"
              readOnly
              value={money(signageRevenue, currencyCode)}
              className={`${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 font-semibold text-emerald-400`}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/10 p-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
          Total Other Income
        </div>
        <div className="font-mono text-3xl font-bold text-emerald-400">
          {money(totalOtherIncomeY1, currencyCode)}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          CAM + Tax Recovery + Insurance Recovery + Signage
        </div>
        {fieldError?.("totalAnnualRevenue") ? (
          <p className="mt-2 text-sm text-red-400">
            {fieldError("totalAnnualRevenue")}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR TABLE – OTHER INCOME ({currencyCode} M)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">CAM Recoveries</th>
                <th className="px-4 py-3">Tax Recoveries</th>
                <th className="px-4 py-3">Insurance Recoveries</th>
                <th className="px-4 py-3">Advertising</th>
                <th className="px-4 py-3 text-right">Total Other Income</th>
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row) => (
                <tr
                  key={row.year}
                  className={`border-b border-slate-800 transition ${
                    row.isOverridden
                      ? "bg-amber-900/10"
                      : "hover:bg-slate-800/50"
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-white">
                    Y{row.year}
                  </td>
                  {(
                    [
                      ["cam", row.cam],
                      ["tax", row.tax],
                      ["insurance", row.insurance],
                      ["advertising", row.advertising],
                    ] as const
                  ).map(([stream, value]) => (
                    <td key={stream} className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={(value / 1_000_000).toFixed(2)}
                        onChange={(e) =>
                          handleCellOverride(
                            row.year,
                            stream,
                            (parseFloat(e.target.value) || 0) * 1_000_000
                          )
                        }
                        className={`w-24 rounded bg-slate-800 p-1 text-right ${
                          manualYearValues[row.year]?.[stream] != null
                            ? "border border-amber-500"
                            : "border border-transparent"
                        }`}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                    {(row.total / 1_000_000).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800 font-bold text-white">
                <td className="px-4 py-3">10-Year Total</td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {(tableData.totals.cam / 1_000_000).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {(tableData.totals.tax / 1_000_000).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {(tableData.totals.insurance / 1_000_000).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {(tableData.totals.advertising / 1_000_000).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {(tableData.totals.total / 1_000_000).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-700 bg-slate-800/50 p-3 text-[10px] text-slate-400">
          <p>
            * CAM = Step 3 CAM expense pool × recovery %. Tax / insurance bases
            escalate with rent escalation ({rentEscalationPct}%/yr). Signage
            held flat unless overridden.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Other Income Composition (Stacked)
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
                <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
                <Bar dataKey="CAM Recoveries" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Tax Recoveries" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Insurance Recoveries" stackId="a" fill="#a855f7" />
                <Bar dataKey="Advertising" stackId="a" fill="#10b981" />
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
