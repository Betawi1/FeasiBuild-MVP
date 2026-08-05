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
  extractWarehouseAiStep3,
  getWarehouseAiC2,
} from "@/lib/warehouse-ai-c2";
import useFinModelStore, {
  calculateWarehouseOpEx,
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

type OpexRow = {
  year: number;
  propertyTax: number;
  insurance: number;
  maintenance: number;
  landscaping: number;
  utilities: number;
  security: number;
  mgmtFee: number;
  gAndA: number;
  total: number;
  isOverridden: boolean;
};

const TABLE_STREAMS = [
  "propertyTax",
  "insurance",
  "maintenance",
  "landscaping",
  "utilities",
  "security",
  "mgmtFee",
  "gAndA",
] as const;

export function generateWarehouseOpexProjection(params: {
  annualPropertyTax: number;
  annualInsurance: number;
  annualMaintenance: number;
  annualLandscaping?: number;
  annualUtilities: number;
  annualSecurity: number;
  managementFeeRate: number;
  gAndARate: number;
  revenueByYear: number[];
  expenseEscalationPct?: number;
  manualYearValues?: Record<number, Partial<OpexRow>>;
}): { rows: OpexRow[]; totals: Record<string, number> } {
  const rows: OpexRow[] = [];
  const totals: Record<string, number> = {
    propertyTax: 0,
    insurance: 0,
    maintenance: 0,
    landscaping: 0,
    utilities: 0,
    security: 0,
    mgmtFee: 0,
    gAndA: 0,
    total: 0,
  };
  const esc = params.expenseEscalationPct ?? 0;
  const annualLandscaping = params.annualLandscaping ?? 0;

  for (let y = 1; y <= 10; y++) {
    const manual = params.manualYearValues?.[y] ?? {};
    const factor = Math.pow(1 + esc / 100, y - 1);
    const revenueY = params.revenueByYear[y - 1] ?? 0;

    const propertyTax =
      manual.propertyTax ?? params.annualPropertyTax * factor;
    const insurance = manual.insurance ?? params.annualInsurance * factor;
    const maintenance =
      manual.maintenance ?? params.annualMaintenance * factor;
    const landscaping =
      manual.landscaping ?? annualLandscaping * factor;
    const utilities = manual.utilities ?? params.annualUtilities * factor;
    const security = manual.security ?? params.annualSecurity * factor;
    const mgmtFee =
      manual.mgmtFee ?? revenueY * (params.managementFeeRate / 100);
    const gAndA = manual.gAndA ?? revenueY * (params.gAndARate / 100);
    const total =
      manual.total ??
      propertyTax +
        insurance +
        maintenance +
        landscaping +
        utilities +
        security +
        mgmtFee +
        gAndA;

    rows.push({
      year: y,
      propertyTax,
      insurance,
      maintenance,
      landscaping,
      utilities,
      security,
      mgmtFee,
      gAndA,
      total,
      isOverridden: Object.keys(manual).length > 0,
    });

    totals.propertyTax += propertyTax;
    totals.insurance += insurance;
    totals.maintenance += maintenance;
    totals.landscaping += landscaping;
    totals.utilities += utilities;
    totals.security += security;
    totals.mgmtFee += mgmtFee;
    totals.gAndA += gAndA;
    totals.total += total;
  }

  return { rows, totals };
}

export type WarehouseOpexStepErrors = Record<string, string>;

export function validateWarehouseOpexStep(
  opEx: WarehouseOpEx | undefined,
  totalAnnualRevenue?: number
): WarehouseOpexStepErrors {
  const next: WarehouseOpexStepErrors = {};
  if (!Number.isFinite(totalAnnualRevenue) || (totalAnnualRevenue ?? 0) <= 0) {
    next.totalAnnualRevenue =
      "Complete Step 1 (Primary Revenue) before operating expenses.";
  }
  if (!opEx || !Number.isFinite(opEx.totalCapEx) || opEx.totalCapEx <= 0) {
    next.totalCapEx =
      "Total CapEx must be greater than 0. Complete Component 1 cash outflows.";
  }
  return next;
}

type Props = {
  fieldError?: (name: string) => string | undefined;
};

export default function C2S3OperatingExpensesWarehouse({
  fieldError,
}: Props = {}) {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const warehouseRevenue = useFinModelStore(
    (s) => s.operational.cashInflows?.warehouseRevenue
  );
  const storedOpEx = useFinModelStore(
    (s) => s.operational.cashInflows?.warehouseOpEx
  );
  const updateCashInflows = useFinModelStore((s) => s.updateCashInflows);
  const currencyCode = projectInfo.currency || "USD";

  const isPark = cashOutflows.developmentType === "INDUSTRIAL_PARK";
  const costs = cashOutflows.warehouseCosts;

  const totalCapEx = cashOutflows.tdc || cashOutflows.constructionCost || 0;
  const totalBuildingCost = (() => {
    const fromWarehouseCosts =
      (costs?.buildingShellCost || 0) +
      (costs?.siteYardWorksCost || 0) +
      (costs?.loadingAccessCost || 0) +
      (costs?.specialisedSystemsCost || 0) +
      (costs?.commonInfrastructureCost || 0) +
      (costs?.professionalFees || 0);
    return fromWarehouseCosts > 0
      ? fromWarehouseCosts
      : cashOutflows.constructionCost || 0;
  })();

  const totalGfa = useMemo(() => {
    if (warehouseRevenue?.totalGfa) return warehouseRevenue.totalGfa;
    if (isPark) {
      return (
        cashOutflows.industrialParkConfig?.warehouseMix.reduce(
          (s, w) => s + (w.size || 0),
          0
        ) || 0
      );
    }
    return cashOutflows.warehouseConfig?.totalBua || 0;
  }, [
    warehouseRevenue?.totalGfa,
    isPark,
    cashOutflows.industrialParkConfig?.warehouseMix,
    cashOutflows.warehouseConfig?.totalBua,
  ]);

  const totalAnnualRevenue = warehouseRevenue?.totalAnnualRevenue || 0;

  const numberOfUnits = isPark
    ? Math.max(1, cashOutflows.industrialParkConfig?.numberOfWarehouses || 1)
    : 1;
  const commonArea = useMemo(() => {
    const parkCommon =
      cashOutflows.industrialParkConfig?.commonInfrastructureArea || 0;
    if (isPark && parkCommon > 0) return parkCommon;
    const unitYard = cashOutflows.warehouseConfig?.yardArea || 0;
    if (unitYard > 0) return unitYard * numberOfUnits;
    const unitLand = cashOutflows.warehouseConfig?.totalLandArea || 0;
    return unitLand > 0 ? unitLand * numberOfUnits * 0.15 : 0;
  }, [
    isPark,
    cashOutflows.industrialParkConfig?.commonInfrastructureArea,
    cashOutflows.warehouseConfig?.yardArea,
    cashOutflows.warehouseConfig?.totalLandArea,
    numberOfUnits,
  ]);

  const benchPropertyTaxRate = 1.0;
  const benchInsuranceRate = 0.4;
  const benchMaintenanceRate = 1.5;
  const benchLandscapingRate = isPark ? 0.35 : 0.3;
  const benchUtilityRate = isPark ? 0.45 : 0.5;
  const benchSecurity = isPark ? 150_000 : 50_000;
  const benchMgmtFee = 3;
  const benchGnA = 2;

  const aiStep3 = useMemo(
    () => extractWarehouseAiStep3(getWarehouseAiC2(cashOutflows?.aiResearchData)),
    [cashOutflows?.aiResearchData]
  );

  const aiPropertyTax = aiStep3.property_tax_pct_of_capex;
  const aiInsurance = aiStep3.insurance_pct_of_capex;
  const aiMaintenance = aiStep3.maintenance_pct_of_building_cost;
  const aiLandscaping = aiStep3.landscaping_rate_psf;
  const aiUtility = aiStep3.utilities_rate_psf;
  const aiSecurity = aiStep3.security_annual_cost;
  const aiMgmtFee = aiStep3.management_fee_pct_revenue;
  const aiGnA = aiStep3.g_and_a_pct_revenue;

  const [propertyTaxRate, setPropertyTaxRate] = useState(
    storedOpEx?.propertyTaxRate ?? aiPropertyTax ?? benchPropertyTaxRate
  );
  const [insuranceRate, setInsuranceRate] = useState(
    storedOpEx?.insuranceRate ?? aiInsurance ?? benchInsuranceRate
  );
  const [maintenanceRate, setMaintenanceRate] = useState(
    storedOpEx?.maintenanceRate ?? aiMaintenance ?? benchMaintenanceRate
  );
  const [landscapingRate, setLandscapingRate] = useState(
    storedOpEx?.landscapingRate ?? aiLandscaping ?? benchLandscapingRate
  );
  const [utilityRate, setUtilityRate] = useState(
    storedOpEx?.utilityRate ?? aiUtility ?? benchUtilityRate
  );
  const [annualSecurity, setAnnualSecurity] = useState(
    storedOpEx?.annualSecurity ?? aiSecurity ?? benchSecurity
  );
  const [managementFeeRate, setManagementFeeRate] = useState(
    storedOpEx?.managementFeeRate ?? aiMgmtFee ?? benchMgmtFee
  );
  const [gAndARate, setGAndARate] = useState(
    storedOpEx?.gAndARate ?? aiGnA ?? benchGnA
  );

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Partial<OpexRow>>
  >({});

  const computed = useMemo(
    () =>
      calculateWarehouseOpEx(
        {
          totalCapEx,
          propertyTaxRate,
          annualPropertyTax: 0,
          insuranceRate,
          annualInsurance: 0,
          totalBuildingCost,
          maintenanceRate,
          annualMaintenance: 0,
          commonAreaSqft: commonArea,
          landscapingRate,
          annualLandscaping: 0,
          totalGfa,
          utilityRate,
          annualUtilities: 0,
          annualSecurity,
          managementFeeRate,
          annualManagementFee: 0,
          gAndARate,
          annualGAndA: 0,
          totalAnnualOpEx: 0,
          opExAsPctOfRevenue: 0,
        },
        totalAnnualRevenue
      ),
    [
      totalCapEx,
      propertyTaxRate,
      insuranceRate,
      totalBuildingCost,
      maintenanceRate,
      commonArea,
      landscapingRate,
      totalGfa,
      utilityRate,
      annualSecurity,
      managementFeeRate,
      gAndARate,
      totalAnnualRevenue,
    ]
  );

  const revenueByYear = useMemo(() => {
    const rev = warehouseRevenue;
    if (!rev) return Array(10).fill(totalAnnualRevenue) as number[];
    return generateWarehouse10YearProjection({
      totalGfa: rev.totalGfa || totalGfa,
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
  }, [warehouseRevenue, totalGfa, totalAnnualRevenue]);

  const tableData = useMemo(
    () =>
      generateWarehouseOpexProjection({
        annualPropertyTax: computed.annualPropertyTax,
        annualInsurance: computed.annualInsurance,
        annualMaintenance: computed.annualMaintenance,
        annualLandscaping: computed.annualLandscaping,
        annualUtilities: computed.annualUtilities,
        annualSecurity: computed.annualSecurity,
        managementFeeRate,
        gAndARate,
        revenueByYear,
        expenseEscalationPct: warehouseRevenue?.rentEscalationPct ?? 0,
        manualYearValues,
      }),
    [
      computed,
      managementFeeRate,
      gAndARate,
      revenueByYear,
      warehouseRevenue?.rentEscalationPct,
      manualYearValues,
    ]
  );

  const persist = useCallback(
    (partial?: Partial<WarehouseOpEx>) => {
      const next = calculateWarehouseOpEx(
        {
          totalCapEx,
          propertyTaxRate:
            partial?.propertyTaxRate ?? propertyTaxRate,
          annualPropertyTax: 0,
          insuranceRate: partial?.insuranceRate ?? insuranceRate,
          annualInsurance: 0,
          totalBuildingCost,
          maintenanceRate:
            partial?.maintenanceRate ?? maintenanceRate,
          annualMaintenance: 0,
          commonAreaSqft: partial?.commonAreaSqft ?? commonArea,
          landscapingRate: partial?.landscapingRate ?? landscapingRate,
          annualLandscaping: 0,
          totalGfa,
          utilityRate: partial?.utilityRate ?? utilityRate,
          annualUtilities: 0,
          annualSecurity: partial?.annualSecurity ?? annualSecurity,
          managementFeeRate:
            partial?.managementFeeRate ?? managementFeeRate,
          annualManagementFee: 0,
          gAndARate: partial?.gAndARate ?? gAndARate,
          annualGAndA: 0,
          totalAnnualOpEx: 0,
          opExAsPctOfRevenue: 0,
        },
        totalAnnualRevenue
      );
      updateCashInflows({ warehouseOpEx: next }, "operational");
    },
    [
      totalCapEx,
      propertyTaxRate,
      insuranceRate,
      totalBuildingCost,
      maintenanceRate,
      commonArea,
      landscapingRate,
      totalGfa,
      utilityRate,
      annualSecurity,
      managementFeeRate,
      gAndARate,
      totalAnnualRevenue,
      updateCashInflows,
    ]
  );

  useEffect(() => {
    persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCapEx, totalBuildingCost, totalGfa, commonArea, totalAnnualRevenue]);

  // Apply AI when research lands over empty/bench defaults
  useEffect(() => {
    const patch: Partial<WarehouseOpEx> = {};
    const canApply = (stored: number | undefined, bench: number) =>
      stored == null || stored === bench;

    if (
      aiPropertyTax != null &&
      !overrides.propertyTaxRate &&
      canApply(storedOpEx?.propertyTaxRate, benchPropertyTaxRate)
    ) {
      setPropertyTaxRate(aiPropertyTax);
      patch.propertyTaxRate = aiPropertyTax;
    }
    if (
      aiInsurance != null &&
      !overrides.insuranceRate &&
      canApply(storedOpEx?.insuranceRate, benchInsuranceRate)
    ) {
      setInsuranceRate(aiInsurance);
      patch.insuranceRate = aiInsurance;
    }
    if (
      aiMaintenance != null &&
      !overrides.maintenanceRate &&
      canApply(storedOpEx?.maintenanceRate, benchMaintenanceRate)
    ) {
      setMaintenanceRate(aiMaintenance);
      patch.maintenanceRate = aiMaintenance;
    }
    if (
      aiLandscaping != null &&
      !overrides.landscapingRate &&
      canApply(storedOpEx?.landscapingRate, benchLandscapingRate)
    ) {
      setLandscapingRate(aiLandscaping);
      patch.landscapingRate = aiLandscaping;
    }
    if (
      aiUtility != null &&
      !overrides.utilityRate &&
      canApply(storedOpEx?.utilityRate, benchUtilityRate)
    ) {
      setUtilityRate(aiUtility);
      patch.utilityRate = aiUtility;
    }
    if (
      aiSecurity != null &&
      !overrides.annualSecurity &&
      canApply(storedOpEx?.annualSecurity, benchSecurity)
    ) {
      setAnnualSecurity(aiSecurity);
      patch.annualSecurity = aiSecurity;
    }
    if (
      aiMgmtFee != null &&
      !overrides.managementFeeRate &&
      canApply(storedOpEx?.managementFeeRate, benchMgmtFee)
    ) {
      setManagementFeeRate(aiMgmtFee);
      patch.managementFeeRate = aiMgmtFee;
    }
    if (
      aiGnA != null &&
      !overrides.gAndARate &&
      canApply(storedOpEx?.gAndARate, benchGnA)
    ) {
      setGAndARate(aiGnA);
      patch.gAndARate = aiGnA;
    }
    if (Object.keys(patch).length > 0) {
      persist(patch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    aiPropertyTax,
    aiInsurance,
    aiMaintenance,
    aiLandscaping,
    aiUtility,
    aiSecurity,
    aiMgmtFee,
    aiGnA,
  ]);

  const handleFieldChange = useCallback(
    (field: string, value: number) => {
      const setters: Record<string, (v: number) => void> = {
        propertyTaxRate: setPropertyTaxRate,
        insuranceRate: setInsuranceRate,
        maintenanceRate: setMaintenanceRate,
        landscapingRate: setLandscapingRate,
        utilityRate: setUtilityRate,
        annualSecurity: setAnnualSecurity,
        managementFeeRate: setManagementFeeRate,
        gAndARate: setGAndARate,
      };
      setters[field]?.(value);
      setOverrides((prev) => ({ ...prev, [field]: true }));
      persist({ [field]: value } as Partial<WarehouseOpEx>);
    },
    [persist]
  );

  const clearStreamOverrides = (stream: keyof OpexRow) => {
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

  const handleResetPropertyTax = () => {
    const v = aiPropertyTax ?? benchPropertyTaxRate;
    setPropertyTaxRate(v);
    setOverrides((p) => ({ ...p, propertyTaxRate: false }));
    clearStreamOverrides("propertyTax");
    persist({ propertyTaxRate: v });
  };
  const handleResetInsurance = () => {
    const v = aiInsurance ?? benchInsuranceRate;
    setInsuranceRate(v);
    setOverrides((p) => ({ ...p, insuranceRate: false }));
    clearStreamOverrides("insurance");
    persist({ insuranceRate: v });
  };
  const handleResetMaintenance = () => {
    const v = aiMaintenance ?? benchMaintenanceRate;
    setMaintenanceRate(v);
    setOverrides((p) => ({ ...p, maintenanceRate: false }));
    clearStreamOverrides("maintenance");
    persist({ maintenanceRate: v });
  };
  const handleResetLandscaping = () => {
    const v = aiLandscaping ?? benchLandscapingRate;
    setLandscapingRate(v);
    setOverrides((p) => ({ ...p, landscapingRate: false }));
    clearStreamOverrides("landscaping");
    persist({ landscapingRate: v });
  };
  const handleResetUtilities = () => {
    const v = aiUtility ?? benchUtilityRate;
    setUtilityRate(v);
    setOverrides((p) => ({ ...p, utilityRate: false }));
    clearStreamOverrides("utilities");
    persist({ utilityRate: v });
  };
  const handleResetSecurity = () => {
    const v = aiSecurity ?? benchSecurity;
    setAnnualSecurity(v);
    setOverrides((p) => ({ ...p, annualSecurity: false }));
    clearStreamOverrides("security");
    persist({ annualSecurity: v });
  };
  const handleResetManagement = () => {
    const v = aiMgmtFee ?? benchMgmtFee;
    setManagementFeeRate(v);
    setOverrides((p) => ({ ...p, managementFeeRate: false }));
    clearStreamOverrides("mgmtFee");
    persist({ managementFeeRate: v });
  };
  const handleResetGnA = () => {
    const v = aiGnA ?? benchGnA;
    setGAndARate(v);
    setOverrides((p) => ({ ...p, gAndARate: false }));
    clearStreamOverrides("gAndA");
    persist({ gAndARate: v });
  };

  const handleResetAll = () => {
    handleResetPropertyTax();
    handleResetInsurance();
    handleResetMaintenance();
    handleResetLandscaping();
    handleResetUtilities();
    handleResetSecurity();
    handleResetManagement();
    handleResetGnA();
    setOverrides({});
    setManualYearValues({});
  };

  const handleCellOverride = (
    year: number,
    stream: (typeof TABLE_STREAMS)[number],
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
        "Property Tax": row.propertyTax / 1_000_000,
        Insurance: row.insurance / 1_000_000,
        Maintenance: row.maintenance / 1_000_000,
        Landscaping: row.landscaping / 1_000_000,
        Utilities: row.utilities / 1_000_000,
        Security: row.security / 1_000_000,
        "Mgmt Fee": row.mgmtFee / 1_000_000,
        "G&A": row.gAndA / 1_000_000,
      })),
    [tableData.rows]
  );

  const hasManualOverride =
    Object.values(overrides).some(Boolean) ||
    Object.keys(manualYearValues).length > 0;

  const sectionResetClass = (on: boolean) =>
    on
      ? "text-emerald-400 hover:text-emerald-300"
      : "cursor-default text-slate-500";

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 3 — Operating Expenses
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Expenses include property tax, insurance, maintenance, utilities,
          security, management fee, and G&amp;A.{" "}
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

      {/* Property Taxes */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">Property Taxes</h3>
          <button
            type="button"
            onClick={handleResetPropertyTax}
            className={`text-xs font-medium transition-colors ${sectionResetClass(!!overrides.propertyTaxRate)}`}
            disabled={!overrides.propertyTaxRate}
          >
            Reset property tax
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Total CapEx
            </label>
            <input
              type="text"
              value={money(totalCapEx, currencyCode)}
              readOnly
              className="w-full cursor-not-allowed rounded bg-slate-900 p-2 text-slate-400 border border-slate-700"
            />
            <p className="mt-1 text-[10px] text-slate-500">Auto-populated</p>
            {fieldError?.("totalCapEx") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("totalCapEx")}
              </p>
            ) : null}
          </div>
          <div>
            <AiInput
              label="Property Tax Rate (% of CapEx)"
              value={propertyTaxRate}
              onChange={(val) =>
                handleFieldChange("propertyTaxRate", Number(val) || 0)
              }
              type="percentage"
              step={0.1}
              min={0}
              isAiGenerated={
                aiPropertyTax != null && !overrides.propertyTaxRate
              }
              isManualOverride={!!overrides.propertyTaxRate}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Property Tax
            </label>
            <input
              type="text"
              value={money(computed.annualPropertyTax, currencyCode)}
              readOnly
              className={`${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 font-semibold text-emerald-400`}
            />
          </div>
        </div>
      </div>

      {/* Insurance */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">Insurance</h3>
          <button
            type="button"
            onClick={handleResetInsurance}
            className={`text-xs font-medium transition-colors ${sectionResetClass(!!overrides.insuranceRate)}`}
            disabled={!overrides.insuranceRate}
          >
            Reset insurance
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Total CapEx
            </label>
            <input
              type="text"
              value={money(totalCapEx, currencyCode)}
              readOnly
              className="w-full cursor-not-allowed rounded bg-slate-900 p-2 text-slate-400 border border-slate-700"
            />
          </div>
          <div>
            <AiInput
              label="Insurance Rate (% of CapEx)"
              value={insuranceRate}
              onChange={(val) =>
                handleFieldChange("insuranceRate", Number(val) || 0)
              }
              type="percentage"
              step={0.1}
              min={0}
              isAiGenerated={
                aiInsurance != null && !overrides.insuranceRate
              }
              isManualOverride={!!overrides.insuranceRate}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Insurance
            </label>
            <input
              type="text"
              value={money(computed.annualInsurance, currencyCode)}
              readOnly
              className={`${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 font-semibold text-emerald-400`}
            />
          </div>
        </div>
      </div>

      {/* Maintenance */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Maintenance &amp; Repairs
          </h3>
          <button
            type="button"
            onClick={handleResetMaintenance}
            className={`text-xs font-medium transition-colors ${sectionResetClass(!!overrides.maintenanceRate)}`}
            disabled={!overrides.maintenanceRate}
          >
            Reset maintenance
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Total Building Cost
            </label>
            <input
              type="text"
              value={money(totalBuildingCost, currencyCode)}
              readOnly
              className="w-full cursor-not-allowed rounded bg-slate-900 p-2 text-slate-400 border border-slate-700"
            />
          </div>
          <div>
            <AiInput
              label="Maintenance Rate (% of Building)"
              value={maintenanceRate}
              onChange={(val) =>
                handleFieldChange("maintenanceRate", Number(val) || 0)
              }
              type="percentage"
              step={0.1}
              min={0}
              isAiGenerated={
                aiMaintenance != null && !overrides.maintenanceRate
              }
              isManualOverride={!!overrides.maintenanceRate}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Maintenance
            </label>
            <input
              type="text"
              value={money(computed.annualMaintenance, currencyCode)}
              readOnly
              className={`${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 font-semibold text-emerald-400`}
            />
          </div>
        </div>
      </div>

      {/* Landscaping */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Landscaping (Common Area)
          </h3>
          <button
            type="button"
            onClick={handleResetLandscaping}
            className={`text-xs font-medium transition-colors ${sectionResetClass(!!overrides.landscapingRate)}`}
            disabled={!overrides.landscapingRate}
          >
            Reset landscaping
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Common Area (sqft)
            </label>
            <input
              type="text"
              value={`${commonArea.toLocaleString()} sqft`}
              readOnly
              className="w-full cursor-not-allowed rounded bg-slate-900 p-2 text-slate-400 border border-slate-700"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Auto-populated from Step 5
            </p>
          </div>
          <div>
            <AiInput
              label={`Landscaping Rate (${currencyCode} / sqft / year)`}
              value={landscapingRate}
              onChange={(val) =>
                handleFieldChange("landscapingRate", Number(val) || 0)
              }
              type="number"
              step={0.01}
              min={0}
              isAiGenerated={
                aiLandscaping != null && !overrides.landscapingRate
              }
              isManualOverride={!!overrides.landscapingRate}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Landscaping
            </label>
            <input
              type="text"
              value={money(computed.annualLandscaping, currencyCode)}
              readOnly
              className={`${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 font-semibold text-emerald-400`}
            />
          </div>
        </div>
      </div>

      {/* Utilities */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Utilities (Common Area)
          </h3>
          <button
            type="button"
            onClick={handleResetUtilities}
            className={`text-xs font-medium transition-colors ${sectionResetClass(!!overrides.utilityRate)}`}
            disabled={!overrides.utilityRate}
          >
            Reset utilities
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Total GFA</label>
            <input
              type="text"
              value={`${totalGfa.toLocaleString()} sqft`}
              readOnly
              className="w-full cursor-not-allowed rounded bg-slate-900 p-2 text-slate-400 border border-slate-700"
            />
          </div>
          <div>
            <AiInput
              label={`Utility Rate (${currencyCode} / sqft / year)`}
              value={utilityRate}
              onChange={(val) =>
                handleFieldChange("utilityRate", Number(val) || 0)
              }
              type="number"
              step={0.01}
              min={0}
              isAiGenerated={
                aiUtility != null && !overrides.utilityRate
              }
              isManualOverride={!!overrides.utilityRate}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Utilities
            </label>
            <input
              type="text"
              value={money(computed.annualUtilities, currencyCode)}
              readOnly
              className={`${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 font-semibold text-emerald-400`}
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">Security</h3>
          <button
            type="button"
            onClick={handleResetSecurity}
            className={`text-xs font-medium transition-colors ${sectionResetClass(!!overrides.annualSecurity)}`}
            disabled={!overrides.annualSecurity}
          >
            Reset security
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <AiInput
              label={`Annual Security Cost (${currencyCode})`}
              value={annualSecurity}
              onChange={(val) =>
                handleFieldChange("annualSecurity", Number(val) || 0)
              }
              type="number"
              step={1000}
              min={0}
              isAiGenerated={
                aiSecurity != null && !overrides.annualSecurity
              }
              isManualOverride={!!overrides.annualSecurity}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Security
            </label>
            <input
              type="text"
              value={money(computed.annualSecurity, currencyCode)}
              readOnly
              className={`${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 font-semibold text-emerald-400`}
            />
          </div>
        </div>
      </div>

      {/* Management Fee */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">Management Fee</h3>
          <button
            type="button"
            onClick={handleResetManagement}
            className={`text-xs font-medium transition-colors ${sectionResetClass(!!overrides.managementFeeRate)}`}
            disabled={!overrides.managementFeeRate}
          >
            Reset management fee
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Total Annual Revenue
            </label>
            <input
              type="text"
              value={money(totalAnnualRevenue, currencyCode)}
              readOnly
              className="w-full cursor-not-allowed rounded bg-slate-900 p-2 text-slate-400 border border-slate-700"
            />
            {fieldError?.("totalAnnualRevenue") ? (
              <p className="mt-1 text-sm text-red-400">
                {fieldError("totalAnnualRevenue")}
              </p>
            ) : null}
          </div>
          <div>
            <AiInput
              label="Management Fee (% of Revenue)"
              value={managementFeeRate}
              onChange={(val) =>
                handleFieldChange("managementFeeRate", Number(val) || 0)
              }
              type="percentage"
              step={0.1}
              min={0}
              isAiGenerated={
                aiMgmtFee != null && !overrides.managementFeeRate
              }
              isManualOverride={!!overrides.managementFeeRate}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual Management Fee
            </label>
            <input
              type="text"
              value={money(computed.annualManagementFee, currencyCode)}
              readOnly
              className={`${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 font-semibold text-emerald-400`}
            />
          </div>
        </div>
      </div>

      {/* G&A */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">G&amp;A</h3>
          <button
            type="button"
            onClick={handleResetGnA}
            className={`text-xs font-medium transition-colors ${sectionResetClass(!!overrides.gAndARate)}`}
            disabled={!overrides.gAndARate}
          >
            Reset G&amp;A
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Total Annual Revenue
            </label>
            <input
              type="text"
              value={money(totalAnnualRevenue, currencyCode)}
              readOnly
              className="w-full cursor-not-allowed rounded bg-slate-900 p-2 text-slate-400 border border-slate-700"
            />
          </div>
          <div>
            <AiInput
              label="G&A (% of Revenue)"
              value={gAndARate}
              onChange={(val) =>
                handleFieldChange("gAndARate", Number(val) || 0)
              }
              type="percentage"
              step={0.1}
              min={0}
              isAiGenerated={
                aiGnA != null && !overrides.gAndARate
              }
              isManualOverride={!!overrides.gAndARate}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Annual G&amp;A
            </label>
            <input
              type="text"
              value={money(computed.annualGAndA, currencyCode)}
              readOnly
              className={`${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 font-semibold text-emerald-400`}
            />
          </div>
        </div>
      </div>

      {/* Total OpEx Summary */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/10 p-6">
        <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-emerald-400">
          Total Operating Expenses
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="mb-1 text-sm text-slate-400">Total Annual OpEx</div>
            <div className="font-mono text-3xl font-bold text-emerald-400">
              {money(computed.totalAnnualOpEx, currencyCode)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm text-slate-400">
              OpEx as % of Revenue
            </div>
            <div className="font-mono text-2xl font-bold text-emerald-400">
              {computed.opExAsPctOfRevenue.toFixed(1)}%
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isPark
                ? "Industrial parks typically run higher OpEx ratios"
                : "Typical single-warehouse OpEx ratio"}
            </p>
          </div>
        </div>
      </div>

      {/* 10-Year Table */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR EXPENSES TABLE ({currencyCode} M)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-3">Year</th>
                <th className="px-3 py-3">Prop Tax (M)</th>
                <th className="px-3 py-3">Insurance (M)</th>
                <th className="px-3 py-3">Maint. (M)</th>
                <th className="px-3 py-3">Landscap. (M)</th>
                <th className="px-3 py-3">Utilities (M)</th>
                <th className="px-3 py-3">Security (M)</th>
                <th className="px-3 py-3">Mgmt Fee (M)</th>
                <th className="px-3 py-3">G&amp;A (M)</th>
                <th className="px-3 py-3 text-right">Total Opex (M)</th>
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
                  <td className="px-3 py-3 font-medium text-white">
                    Y{row.year}
                  </td>
                  {TABLE_STREAMS.map((stream) => (
                    <td key={stream} className="px-3 py-3">
                      <input
                        type="number"
                        step={0.01}
                        value={(row[stream] / 1_000_000).toFixed(2)}
                        onChange={(e) =>
                          handleCellOverride(
                            row.year,
                            stream,
                            (parseFloat(e.target.value) || 0) * 1_000_000
                          )
                        }
                        className={`w-20 rounded bg-slate-800 p-1 text-right ${
                          manualYearValues[row.year]?.[stream] != null
                            ? "border border-amber-500"
                            : "border border-transparent"
                        }`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-400">
                    {(row.total / 1_000_000).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800 font-bold text-white">
                <td className="px-3 py-3">10-Year Total</td>
                {TABLE_STREAMS.map((stream) => (
                  <td
                    key={stream}
                    className="px-3 py-3 text-right text-emerald-400"
                  >
                    {(tableData.totals[stream] / 1_000_000).toFixed(2)}
                  </td>
                ))}
                <td className="px-3 py-3 text-right text-emerald-400">
                  {(tableData.totals.total / 1_000_000).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-700 bg-slate-800/50 p-3 text-[10px] text-slate-400">
          <p>
            * CapEx-based items escalate with Step 1 rent escalation when set.
            Mgmt fee and G&amp;A track Step 1 total revenue by year.
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Total Operating Expenses by Year (Stacked)
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
                <Bar dataKey="Property Tax" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Insurance" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="Maintenance" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Landscaping" stackId="a" fill="#84cc16" />
                <Bar dataKey="Utilities" stackId="a" fill="#14b8a6" />
                <Bar dataKey="Security" stackId="a" fill="#ef4444" />
                <Bar dataKey="Mgmt Fee" stackId="a" fill="#10b981" />
                <Bar dataKey="G&A" stackId="a" fill="#64748b" />
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
