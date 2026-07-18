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
  estimatedUnitsFromGla,
} from "@/lib/benchmarks/residential-other-income";
import { resolveResidentialOpexBenchmark } from "@/lib/benchmarks/residential-opex";
import { normalizeAiResearchData } from "@/lib/constants/aiPrompts";
import {
  blendedResidentialLeasedPct,
  utilitiesBaseSqft,
} from "@/lib/residential-revenue-calculations";
import {
  defaultOperationalResidentialHoldSnapshot,
  roundPct2,
  totalOperationalBua,
  type OperationalResidentialHoldSnapshot,
} from "@/lib/operational-pnl";
import useFinModelStore from "@/store/useFinModelStore";
import type { ResidentialOpexConfig } from "@/store/useFinModelStore";

const AI_EPS = 0.01;
function differsFromAi(current: number, ai?: number | null): boolean {
  return (
    ai != null && Number.isFinite(ai) && Math.abs(current - ai) > AI_EPS
  );
}

export function getOperationalResidentialHoldSnapshot():
  | OperationalResidentialHoldSnapshot
  | undefined {
  return useFinModelStore.getState().operational?.residentialHoldSnapshot;
}

export type ResidentialOpexStepErrors = Record<string, string>;

export function buildResidentialOpexFromSnapshot(
  snap: OperationalResidentialHoldSnapshot | undefined
): ResidentialOpexConfig | undefined {
  if (snap == null) return undefined;
  if (
    snap.mgmtFeePctOfEgi == null &&
    !snap.opexTotalValues?.length
  ) {
    return undefined;
  }

  const gla = snap.residentialGlaSqft ?? 0;
  const avgUnitSqft = snap.avgUnitSqft ?? 800;
  const estimatedTotalUnits = estimatedUnitsFromGla(gla, avgUnitSqft);

  const projection: ResidentialOpexConfig["projection"] = Array.from(
    { length: 10 },
    (_, i) => ({
      year: i + 1,
      mgmtFee: snap.opexMgmtFeeValues?.[i] ?? 0,
      maintenance: snap.opexMaintenanceValues?.[i] ?? 0,
      utilities: snap.opexUtilitiesValues?.[i] ?? 0,
      tax: snap.opexPropertyTaxValues?.[i] ?? 0,
      insurance: snap.opexInsuranceValues?.[i] ?? 0,
      marketing: snap.opexMarketingValues?.[i] ?? 0,
      gAndA: snap.opexGaValues?.[i] ?? 0,
      capex: snap.opexCapexValues?.[i] ?? 0,
      total: snap.opexTotalValues?.[i] ?? 0,
    })
  );

  return {
    mgmtFeePctOfEgi: snap.mgmtFeePctOfEgi ?? 0,
    maintenancePctOfResidentialGla: snap.maintenancePctOfResidentialGla ?? 0,
    utilitiesPctOfCommonVacantGla: snap.utilitiesPctOfCommonVacantGla ?? 0,
    propertyTaxPctOfGrossRent: snap.propertyTaxPctOfGrossRent ?? 0,
    insurancePctOfGrossRent: snap.insurancePctOfGrossRent ?? 0,
    marketingPctOfEgi: snap.marketingPctOfEgi ?? 0,
    gAndAPctOfGrossRent: snap.gAndAPctOfGrossRent ?? 0,
    capexReservePctOfTotalGla: snap.capexReservePctOfTotalGla ?? 0,
    estimatedTotalUnits,
    projection,
  };
}

export function validateResidentialOpexStep(
  snap: OperationalResidentialHoldSnapshot | undefined
): ResidentialOpexStepErrors {
  const next: ResidentialOpexStepErrors = {};
  const gla = snap?.residentialGlaSqft ?? 0;
  if (!Number.isFinite(gla) || gla <= 0) {
    next.residentialGla =
      "Complete Steps 1–2 before operating expenses.";
  }
  const netRent = snap?.residentialRentValues?.[0] ?? 0;
  const otherIncome = snap?.otherIncomeTotalValues?.[0] ?? 0;
  const egi = netRent + otherIncome;
  if (!Number.isFinite(egi) || egi <= 0) {
    next.egi =
      "Year 1 EGI must be greater than 0 (configure Steps 1–2).";
  }
  return next;
}

type OpexRow = {
  year: number;
  mgmtFee: number;
  maintenance: number;
  utilities: number;
  tax: number;
  insurance: number;
  marketing: number;
  gAndA: number;
  capex: number;
  total: number;
  isOverridden: boolean;
  egi: number;
};

type TableStream =
  | "mgmtFee"
  | "maintenance"
  | "utilities"
  | "tax"
  | "insurance"
  | "marketing"
  | "gAndA"
  | "capex";

const TABLE_STREAMS: TableStream[] = [
  "mgmtFee",
  "maintenance",
  "utilities",
  "tax",
  "insurance",
  "marketing",
  "gAndA",
  "capex",
];

const inputBase =
  "w-full rounded bg-slate-900 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

function overrideFieldClass(overridden: boolean): string {
  return overridden
    ? `${inputBase} border-2 border-amber-500/70`
    : `${inputBase} border border-slate-600`;
}

export default function ResidentialOpexStep() {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const residentialHoldSnapshot = useFinModelStore(
    (s) => s.operational.residentialHoldSnapshot
  );
  const stepData = residentialHoldSnapshot;
  const residentialGla = stepData?.residentialGlaSqft ?? 200_000;
  const retailGla = stepData?.retailGlaSqft ?? 0;
  const totalGla = residentialGla + retailGla;
  const totalBua = totalOperationalBua(cashOutflows);
  const avgUnitSqft = stepData?.avgUnitSqft ?? 800;
  const estimatedTotalUnits = estimatedUnitsFromGla(
    residentialGla,
    avgUnitSqft
  );

  const netRentValues = stepData?.residentialRentValues ?? [];
  const otherIncomeValues = stepData?.otherIncomeTotalValues ?? [];
  const grossRentValues = stepData?.totalBaseRentValues ?? netRentValues;

  const aiC2 = useMemo(() => {
    const raw = cashOutflows?.aiResearchData;
    if (!raw) return undefined;
    const hasNested =
      !!raw.c2_operational?.step3_operating_expenses ||
      !!raw.c2_operational?.operating_expenses_btr ||
      !!raw.c1_development?.construction_rates;
    if (!hasNested) {
      return (normalizeAiResearchData(raw) as { c2_operational?: typeof raw.c2_operational })
        ?.c2_operational;
    }
    return raw.c2_operational;
  }, [cashOutflows?.aiResearchData]);

  const aiStep3 = aiC2?.step3_operating_expenses;
  const aiBtrOpex = aiC2?.operating_expenses_btr;
  const aiMgmtFee =
    aiStep3?.management_fee_pct_revenue ??
    aiC2?.operating_expenses?.management_fee_pct_revenue;
  const aiMaintenancePct =
    aiStep3?.maintenance_pct_of_residential_gla ??
    aiBtrOpex?.maintenance_pct_of_residential_gla;
  const aiUtilitiesPct =
    aiStep3?.utilities_pct_of_common_vacant_gla ??
    aiBtrOpex?.utilities_pct_of_common_vacant_gla;
  const aiPropertyTaxPct =
    aiStep3?.property_tax_pct_of_revenue ??
    aiBtrOpex?.property_tax_pct_of_revenue;
  const aiInsurancePct =
    aiStep3?.insurance_pct_of_revenue ?? aiBtrOpex?.insurance_pct_of_revenue;
  const aiMarketingPct =
    aiStep3?.marketing_pct_of_EGI ??
    aiStep3?.marketing_pct_revenue ??
    aiBtrOpex?.marketing_pct_of_EGI;
  const aiGAndAPct =
    aiStep3?.g_and_a_pct_of_revenue ??
    aiStep3?.g_and_a_pct_revenue ??
    aiBtrOpex?.g_and_a_pct_of_revenue;
  const aiCapexReservePct =
    aiStep3?.capex_reserve_pct_of_gla ?? aiBtrOpex?.capex_reserve_pct_of_gla;

  const benchmark = useMemo(() => {
    if (
      !projectInfo?.country ||
      !projectInfo?.residentialSegment ||
      !projectInfo?.residentialPositioning
    ) {
      return null;
    }
    return resolveResidentialOpexBenchmark(
      projectInfo.country,
      projectInfo.residentialSegment,
      projectInfo.residentialPositioning,
      residentialGla,
      projectInfo.residentialFurnishingLevel,
      projectInfo.residentialIsServicedApartment
    );
  }, [
    projectInfo?.country,
    projectInfo?.residentialSegment,
    projectInfo?.residentialPositioning,
    projectInfo?.residentialFurnishingLevel,
    projectInfo?.residentialIsServicedApartment,
    residentialGla,
  ]);

  const resolveMaintenancePct = () => {
    if (
      stepData?.maintenancePctOfResidentialGla != null &&
      stepData.maintenancePctOfResidentialGla > 0
    ) {
      return roundPct2(stepData.maintenancePctOfResidentialGla);
    }
    if (
      stepData?.maintenancePerUnitAnnual != null &&
      residentialGla > 0 &&
      estimatedTotalUnits > 0
    ) {
      const total =
        stepData.maintenancePerUnitAnnual * estimatedTotalUnits;
      return roundPct2((total / residentialGla) * 100);
    }
    return roundPct2(benchmark?.maintenancePctOfResidentialGla ?? 2.5);
  };

  const resolveUtilitiesPct = () => {
    if (
      stepData?.utilitiesPctOfCommonVacantGla != null &&
      stepData.utilitiesPctOfCommonVacantGla > 0
    ) {
      return roundPct2(stepData.utilitiesPctOfCommonVacantGla);
    }
    const blendedY1 = blendedResidentialLeasedPct(
      1,
      residentialGla,
      retailGla,
      stepData
    );
    const utilBase = utilitiesBaseSqft(totalBua, totalGla, blendedY1);
    let legacyTotal = 0;
    if (
      stepData?.utilitiesPerUnitAnnual != null &&
      estimatedTotalUnits > 0
    ) {
      legacyTotal = stepData.utilitiesPerUnitAnnual * estimatedTotalUnits;
    } else if (stepData?.utilitiesFixedAnnual != null) {
      legacyTotal = stepData.utilitiesFixedAnnual;
    }
    if (legacyTotal > 0 && utilBase > 0) {
      return roundPct2((legacyTotal / utilBase) * 100);
    }
    return roundPct2(benchmark?.utilitiesPctOfCommonVacantGla ?? 15);
  };

  const resolveGAndAPct = () => {
    if (
      stepData?.gAndAPctOfGrossRent != null &&
      stepData.gAndAPctOfGrossRent > 0
    ) {
      return roundPct2(stepData.gAndAPctOfGrossRent);
    }
    const grossY1 = grossRentValues[0] ?? 0;
    if (stepData?.gAndAAnnual != null && grossY1 > 0) {
      return roundPct2((stepData.gAndAAnnual / grossY1) * 100);
    }
    return roundPct2(benchmark?.gAndAPctOfGrossRent ?? 3);
  };

  const resolveCapexReservePct = () => {
    if (
      stepData?.capexReservePctOfTotalGla != null &&
      stepData.capexReservePctOfTotalGla > 0
    ) {
      return roundPct2(stepData.capexReservePctOfTotalGla);
    }
    if (
      stepData?.capexPerUnitAnnual != null &&
      totalGla > 0 &&
      estimatedTotalUnits > 0
    ) {
      const total = stepData.capexPerUnitAnnual * estimatedTotalUnits;
      return roundPct2((total / totalGla) * 100);
    }
    return roundPct2(benchmark?.capexReservePctOfTotalGla ?? 5);
  };

  const resolvePropertyTaxPct = () => {
    if (
      stepData?.propertyTaxPctOfGrossRent != null &&
      stepData.propertyTaxPctOfGrossRent > 0
    ) {
      return roundPct2(stepData.propertyTaxPctOfGrossRent);
    }
    const grossY1 = grossRentValues[0] ?? 0;
    if (stepData?.propertyTaxAnnual != null && grossY1 > 0) {
      return roundPct2((stepData.propertyTaxAnnual / grossY1) * 100);
    }
    return roundPct2(benchmark?.propertyTaxPctOfGrossRent ?? 5);
  };

  const resolveInsurancePct = () => {
    if (
      stepData?.insurancePctOfGrossRent != null &&
      stepData.insurancePctOfGrossRent > 0
    ) {
      return roundPct2(stepData.insurancePctOfGrossRent);
    }
    const grossY1 = grossRentValues[0] ?? 0;
    if (stepData?.insuranceAnnual != null && grossY1 > 0) {
      return roundPct2((stepData.insuranceAnnual / grossY1) * 100);
    }
    return roundPct2(benchmark?.insurancePctOfGrossRent ?? 1);
  };

  const [mgmtFeePct, setMgmtFeePct] = useState(
    stepData?.mgmtFeePctOfEgi ?? benchmark?.mgmtFeePctOfEgi ?? 4
  );
  const [maintenancePct, setMaintenancePct] = useState(() =>
    resolveMaintenancePct()
  );
  const [utilitiesPct, setUtilitiesPct] = useState(() => resolveUtilitiesPct());
  const [propertyTaxPct, setPropertyTaxPct] = useState(() =>
    resolvePropertyTaxPct()
  );
  const [insurancePct, setInsurancePct] = useState(() =>
    resolveInsurancePct()
  );
  const [marketingPct, setMarketingPct] = useState(
    stepData?.marketingPctOfEgi ?? benchmark?.marketingPctOfEgi ?? 1
  );
  const [gAndAPct, setGAndAPct] = useState(() => resolveGAndAPct());
  const [capexReservePct, setCapexReservePct] = useState(() =>
    resolveCapexReservePct()
  );

  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    stepData?.opexSectionOverrides ?? {}
  );
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Record<string, number>>
  >(stepData?.opexManualYearValues ?? {});

  useEffect(() => {
    if (!aiC2) return;
    if (!overrides.mgmtFeePct && aiMgmtFee != null) setMgmtFeePct(aiMgmtFee);
    if (!overrides.maintenancePct && aiMaintenancePct != null) {
      setMaintenancePct(roundPct2(aiMaintenancePct));
    }
    if (!overrides.utilitiesPct && aiUtilitiesPct != null) {
      setUtilitiesPct(roundPct2(aiUtilitiesPct));
    }
    if (!overrides.propertyTaxPct && aiPropertyTaxPct != null) {
      setPropertyTaxPct(roundPct2(aiPropertyTaxPct));
    }
    if (!overrides.insurancePct && aiInsurancePct != null) {
      setInsurancePct(roundPct2(aiInsurancePct));
    }
    if (!overrides.marketingPct && aiMarketingPct != null) {
      setMarketingPct(aiMarketingPct);
    }
    if (!overrides.gAndAPct && aiGAndAPct != null) {
      setGAndAPct(roundPct2(aiGAndAPct));
    }
    if (!overrides.capexReservePct && aiCapexReservePct != null) {
      setCapexReservePct(roundPct2(aiCapexReservePct));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-apply when AI payload changes
  }, [
    aiC2,
    aiMgmtFee,
    aiMaintenancePct,
    aiUtilitiesPct,
    aiPropertyTaxPct,
    aiInsurancePct,
    aiMarketingPct,
    aiGAndAPct,
    aiCapexReservePct,
  ]);

  const tableData = useMemo(() => {
    const rows: OpexRow[] = [];
    let totalMgmt = 0;
    let totalMaint = 0;
    let totalUtil = 0;
    let totalTax = 0;
    let totalIns = 0;
    let totalMkt = 0;
    let totalGa = 0;
    let totalCapex = 0;
    let totalOpex = 0;

    for (let t = 1; t <= 10; t++) {
      const i = t - 1;
      const netRent = netRentValues[i] ?? 0;
      const otherIncome = otherIncomeValues[i] ?? 0;
      const egi = netRent + otherIncome;

      const mgmtFee = egi * (mgmtFeePct / 100);
      const maintenance = (maintenancePct / 100) * residentialGla;
      const blendedLeased = blendedResidentialLeasedPct(
        t,
        residentialGla,
        retailGla,
        stepData
      );
      const utilBase = utilitiesBaseSqft(totalBua, totalGla, blendedLeased);
      const utilities = (utilitiesPct / 100) * utilBase;
      const grossRentalRevenue = grossRentValues[i] ?? 0;
      const tax = grossRentalRevenue * (propertyTaxPct / 100);
      const ins = grossRentalRevenue * (insurancePct / 100);
      const marketing = egi * (marketingPct / 100);
      const ga = grossRentalRevenue * (gAndAPct / 100);
      const capex = (capexReservePct / 100) * totalGla;

      const opexTotal =
        mgmtFee +
        maintenance +
        utilities +
        tax +
        ins +
        marketing +
        ga +
        capex;

      const manual = manualYearValues[t] || {};

      const row: OpexRow = {
        year: t,
        mgmtFee: manual.mgmtFee ?? mgmtFee,
        maintenance: manual.maintenance ?? maintenance,
        utilities: manual.utilities ?? utilities,
        tax: manual.tax ?? tax,
        insurance: manual.insurance ?? ins,
        marketing: manual.marketing ?? marketing,
        gAndA: manual.gAndA ?? ga,
        capex: manual.capex ?? capex,
        total: 0,
        isOverridden: Object.keys(manual).length > 0,
        egi,
      };
      row.total =
        manual.total ??
        row.mgmtFee +
          row.maintenance +
          row.utilities +
          row.tax +
          row.insurance +
          row.marketing +
          row.gAndA +
          row.capex;

      totalMgmt += row.mgmtFee;
      totalMaint += row.maintenance;
      totalUtil += row.utilities;
      totalTax += row.tax;
      totalIns += row.insurance;
      totalMkt += row.marketing;
      totalGa += row.gAndA;
      totalCapex += row.capex;
      totalOpex += row.total;

      rows.push(row);
    }

    return {
      rows,
      totals: {
        mgmtFee: totalMgmt,
        maintenance: totalMaint,
        utilities: totalUtil,
        tax: totalTax,
        insurance: totalIns,
        marketing: totalMkt,
        gAndA: totalGa,
        capex: totalCapex,
        total: totalOpex,
      },
    };
  }, [
    residentialGla,
    retailGla,
    totalGla,
    totalBua,
    stepData,
    netRentValues,
    grossRentValues,
    otherIncomeValues,
    mgmtFeePct,
    maintenancePct,
    utilitiesPct,
    propertyTaxPct,
    insurancePct,
    marketingPct,
    gAndAPct,
    capexReservePct,
    manualYearValues,
  ]);

  const persistSnapshot = useCallback(() => {
    const prev = getOperationalResidentialHoldSnapshot();
    const merged: OperationalResidentialHoldSnapshot = {
      ...defaultOperationalResidentialHoldSnapshot,
      ...prev,
      residentialGlaSqft: prev?.residentialGlaSqft ?? residentialGla,
      mgmtFeePctOfEgi: mgmtFeePct,
      maintenancePctOfResidentialGla: maintenancePct,
      utilitiesPctOfCommonVacantGla: utilitiesPct,
      propertyTaxPctOfGrossRent: propertyTaxPct,
      insurancePctOfGrossRent: insurancePct,
      marketingPctOfEgi: marketingPct,
      gAndAPctOfGrossRent: gAndAPct,
      capexReservePctOfTotalGla: capexReservePct,
      estimatedTotalUnits,
      opexMgmtFeeValues: tableData.rows.map((r) => r.mgmtFee),
      opexMaintenanceValues: tableData.rows.map((r) => r.maintenance),
      opexUtilitiesValues: tableData.rows.map((r) => r.utilities),
      opexPropertyTaxValues: tableData.rows.map((r) => r.tax),
      opexInsuranceValues: tableData.rows.map((r) => r.insurance),
      opexMarketingValues: tableData.rows.map((r) => r.marketing),
      opexGaValues: tableData.rows.map((r) => r.gAndA),
      opexCapexValues: tableData.rows.map((r) => r.capex),
      opexTotalValues: tableData.rows.map((r) => r.total),
      opexSectionOverrides: overrides,
      opexManualYearValues: manualYearValues,
    };
    const store = useFinModelStore.getState();
    store.updateResidentialHoldSnapshot(merged, "operational");
    const residentialOpex = buildResidentialOpexFromSnapshot(merged);
    if (residentialOpex) {
      store.updateProjectInfo({ residentialOpex }, "operational");
    }
  }, [
    residentialGla,
    mgmtFeePct,
    maintenancePct,
    utilitiesPct,
    propertyTaxPct,
    insurancePct,
    marketingPct,
    gAndAPct,
    capexReservePct,
    estimatedTotalUnits,
    tableData.rows,
    overrides,
    manualYearValues,
  ]);

  useEffect(() => {
    const timer = setTimeout(persistSnapshot, 200);
    return () => clearTimeout(timer);
  }, [persistSnapshot]);

  useEffect(() => {
    if (!benchmark || Object.keys(overrides).length > 0) return;
    if (stepData?.mgmtFeePctOfEgi != null) return;
    setMgmtFeePct(benchmark.mgmtFeePctOfEgi);
    setMaintenancePct(roundPct2(benchmark.maintenancePctOfResidentialGla));
    setUtilitiesPct(roundPct2(benchmark.utilitiesPctOfCommonVacantGla));
    setPropertyTaxPct(roundPct2(benchmark.propertyTaxPctOfGrossRent));
    setInsurancePct(roundPct2(benchmark.insurancePctOfGrossRent));
    setMarketingPct(benchmark.marketingPctOfEgi);
    setGAndAPct(roundPct2(benchmark.gAndAPctOfGrossRent));
    setCapexReservePct(roundPct2(benchmark.capexReservePctOfTotalGla));
  }, [benchmark, overrides, stepData?.mgmtFeePctOfEgi]);

  const handleResetAll = () => {
    if (!benchmark) return;
    setMgmtFeePct(aiMgmtFee ?? benchmark.mgmtFeePctOfEgi);
    setMaintenancePct(
      roundPct2(aiMaintenancePct ?? benchmark.maintenancePctOfResidentialGla)
    );
    setUtilitiesPct(
      roundPct2(aiUtilitiesPct ?? benchmark.utilitiesPctOfCommonVacantGla)
    );
    setPropertyTaxPct(
      roundPct2(aiPropertyTaxPct ?? benchmark.propertyTaxPctOfGrossRent)
    );
    setInsurancePct(
      roundPct2(aiInsurancePct ?? benchmark.insurancePctOfGrossRent)
    );
    setMarketingPct(aiMarketingPct ?? benchmark.marketingPctOfEgi);
    setGAndAPct(roundPct2(aiGAndAPct ?? benchmark.gAndAPctOfGrossRent));
    setCapexReservePct(
      roundPct2(aiCapexReservePct ?? benchmark.capexReservePctOfTotalGla)
    );
    setOverrides({});
    setManualYearValues({});
  };

  const handleFieldChange = (field: string, value: number) => {
    const pctFields = new Set([
      "maintenancePct",
      "utilitiesPct",
      "propertyTaxPct",
      "insurancePct",
      "gAndAPct",
      "capexReservePct",
    ]);
    const normalized = pctFields.has(field) ? roundPct2(value) : value;

    const setters: Record<string, (v: number) => void> = {
      mgmtFeePct: setMgmtFeePct,
      maintenancePct: setMaintenancePct,
      utilitiesPct: setUtilitiesPct,
      propertyTaxPct: setPropertyTaxPct,
      insurancePct: setInsurancePct,
      marketingPct: setMarketingPct,
      gAndAPct: setGAndAPct,
      capexReservePct: setCapexReservePct,
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
    "Mgmt Fee": row.mgmtFee / 1_000_000,
    Maintenance: row.maintenance / 1_000_000,
    Utilities: row.utilities / 1_000_000,
    "Prop Tax": row.tax / 1_000_000,
    Insurance: row.insurance / 1_000_000,
    Marketing: row.marketing / 1_000_000,
    "G&A": row.gAndA / 1_000_000,
    Capex: row.capex / 1_000_000,
  }));

  const currencyCode = projectInfo?.currency ?? "AED";

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 3 — Operating Expenses
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Expenses are primarily fixed or per-unit (gross lease — no CAM
          recoveries).
          <span className="ml-1 text-amber-500">Amber borders</span> indicate
          manual overrides.
        </p>
      </div>

      {benchmark && projectInfo && (
        <BenchmarkHeader
          assetType="residential"
          country={projectInfo.country}
          segment={projectInfo.residentialSegment}
          positioning={projectInfo.residentialPositioning}
          furnishingLevel={projectInfo.residentialFurnishingLevel}
          isServicedApartment={projectInfo.residentialIsServicedApartment}
          isManualOverride={Object.values(overrides).some(Boolean)}
          onUseDefaults={handleResetAll}
        />
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Property Management
        </h3>
        <div className="max-w-xs">
          <AiInput
            label="Property Management Fee (% of EGI)"
            value={mgmtFeePct}
            onChange={(val) => handleFieldChange("mgmtFeePct", Number(val))}
            type="percentage"
            step={0.1}
            isAiGenerated={aiMgmtFee != null && !overrides.mgmtFeePct}
            isManualOverride={
              !!overrides.mgmtFeePct || differsFromAi(mgmtFeePct, aiMgmtFee)
            }
            helperText="EGI = Net Rent (Step 1) + Other Income (Step 2)"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Maintenance &amp; Repairs
        </h3>
        <div className="max-w-md">
          <AiInput
            label="Maintenance & Repairs (% of Residential GLA/year)"
            value={maintenancePct}
            onChange={(val) =>
              handleFieldChange("maintenancePct", Number(val))
            }
            type="percentage"
            step={0.01}
            min={0}
            max={100}
            isAiGenerated={
              aiMaintenancePct != null && !overrides.maintenancePct
            }
            isManualOverride={
              !!overrides.maintenancePct ||
              differsFromAi(maintenancePct, aiMaintenancePct)
            }
            helperText={`Applied to Residential GLA from Step 1 (${residentialGla.toLocaleString()} sqft)`}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Utilities (Common Areas + Vacant Units)
        </h3>
        <div className="max-w-md">
          <AiInput
            label="Utilities (% of Common Area + Vacant GLA/year)"
            value={utilitiesPct}
            onChange={(val) => handleFieldChange("utilitiesPct", Number(val))}
            type="percentage"
            step={0.01}
            min={0}
            max={100}
            isAiGenerated={aiUtilitiesPct != null && !overrides.utilitiesPct}
            isManualOverride={
              !!overrides.utilitiesPct ||
              differsFromAi(utilitiesPct, aiUtilitiesPct)
            }
            helperText={`Applied to: ((BUA - GLA) + (GLA × (100% - Leased %))) — includes retail area and vacant units. BUA: ${totalBua.toLocaleString()} sqft, Total GLA: ${totalGla.toLocaleString()} sqft.`}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Property Tax &amp; Insurance
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <AiInput
              label="Property Tax (% of Gross Rental Revenue)"
              value={propertyTaxPct}
              onChange={(val) =>
                handleFieldChange("propertyTaxPct", Number(val))
              }
              type="percentage"
              step={0.01}
              min={0}
              max={100}
              isAiGenerated={
                aiPropertyTaxPct != null && !overrides.propertyTaxPct
              }
              isManualOverride={
                !!overrides.propertyTaxPct ||
                differsFromAi(propertyTaxPct, aiPropertyTaxPct)
              }
              helperText="Applied to Step 1 residential + retail rent revenue each year"
            />
          </div>
          <div>
            <AiInput
              label="Insurance (% of Gross Rental Revenue)"
              value={insurancePct}
              onChange={(val) =>
                handleFieldChange("insurancePct", Number(val))
              }
              type="percentage"
              step={0.01}
              min={0}
              max={100}
              isAiGenerated={
                aiInsurancePct != null && !overrides.insurancePct
              }
              isManualOverride={
                !!overrides.insurancePct ||
                differsFromAi(insurancePct, aiInsurancePct)
              }
              helperText="Applied to Step 1 residential + retail rent revenue each year"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Marketing &amp; Leasing
        </h3>
        <div className="max-w-xs">
          <AiInput
            label="Marketing (% of EGI)"
            value={marketingPct}
            onChange={(val) => handleFieldChange("marketingPct", Number(val))}
            type="percentage"
            step={0.1}
            isAiGenerated={aiMarketingPct != null && !overrides.marketingPct}
            isManualOverride={
              !!overrides.marketingPct ||
              differsFromAi(marketingPct, aiMarketingPct)
            }
            helperText="Advertising, leasing staff, tenant acquisition"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          G&amp;A (General &amp; Administrative)
        </h3>
        <div className="max-w-md">
          <AiInput
            label="G&A (% of Annual Gross Rental Revenue)"
            value={gAndAPct}
            onChange={(val) => handleFieldChange("gAndAPct", Number(val))}
            type="percentage"
            step={0.01}
            min={0}
            max={100}
            isAiGenerated={aiGAndAPct != null && !overrides.gAndAPct}
            isManualOverride={
              !!overrides.gAndAPct || differsFromAi(gAndAPct, aiGAndAPct)
            }
            helperText="Applied to Step 1 residential + retail rent revenue each year"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Renovation / Capex Reserve
        </h3>
        <div className="max-w-md">
          <AiInput
            label="Renovation / Capex Reserve (% of Total GLA/year)"
            value={capexReservePct}
            onChange={(val) =>
              handleFieldChange("capexReservePct", Number(val))
            }
            type="percentage"
            step={0.01}
            min={0}
            max={100}
            isAiGenerated={
              aiCapexReservePct != null && !overrides.capexReservePct
            }
            isManualOverride={
              !!overrides.capexReservePct ||
              differsFromAi(capexReservePct, aiCapexReservePct)
            }
            helperText={`Applied to Total GLA (Residential + Retail) from Step 1 — for unit turnover, appliance replacement (${totalGla.toLocaleString()} sqft)`}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-white">
            10-YEAR EXPENSES TABLE ({currencyCode} M)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="border-r border-slate-700 px-2 py-3">Year</th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Mgmt Fee
                  <br />
                  ({mgmtFeePct}% EGI)
                  <br />
                  ({currencyCode} M)
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Maint
                  <br />
                  ({currencyCode} M)
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Utilities
                  <br />
                  ({utilitiesPct}% base)
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Prop Tax
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Insurance
                </th>
                <th className="border-r border-slate-700 px-2 py-3">
                  Marketing
                  <br />
                  ({marketingPct}% EGI)
                </th>
                <th className="border-r border-slate-700 px-2 py-3">G&amp;A</th>
                <th className="border-r border-slate-700 px-2 py-3">Capex</th>
                <th className="px-2 py-3 text-right">Total Opex</th>
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
                  <td className="border-r border-slate-700 px-2 py-3 font-medium text-white">
                    Y{row.year}
                  </td>
                  {TABLE_STREAMS.map((stream) => (
                    <td
                      key={stream}
                      className="border-r border-slate-700 px-2 py-3"
                    >
                      <input
                        type="number"
                        step="0.01"
                        value={(row[stream] / 1_000_000).toFixed(2)}
                        onChange={(e) =>
                          handleCellOverride(
                            row.year,
                            stream,
                            parseFloat(e.target.value) * 1_000_000
                          )
                        }
                        className={`w-20 rounded bg-slate-800 p-1 text-right ${
                          manualYearValues[row.year]?.[stream]
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
              ))}

              <tr className="bg-slate-800 font-bold text-white">
                <td className="border-r border-slate-700 px-2 py-3">
                  10-Year Total
                </td>
                {TABLE_STREAMS.map((stream) => (
                  <td
                    key={stream}
                    className="border-r border-slate-700 px-2 py-3 text-right text-emerald-400"
                  >
                    {(tableData.totals[stream] / 1_000_000).toFixed(2)}
                  </td>
                ))}
                <td className="px-2 py-3 text-right text-emerald-400">
                  {(tableData.totals.total / 1_000_000).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-700 bg-slate-800/50 p-3 text-[10px] text-slate-400">
          <p>
            <strong>Note:</strong> Maintenance scales with residential GLA;
            utilities scale with common area + vacant GLA (varies by leased % each
            year); G&amp;A scales with gross rent; capex reserve scales with total
            GLA ({totalGla.toLocaleString()} sqft).
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Total Operating Expenses by Year (Stacked)
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
                formatter={(val) => `${Number(val ?? 0).toFixed(2)}M`}
              />
              <Legend
                wrapperStyle={{ fontSize: "9px", color: "#94a3b8" }}
              />
              <Bar dataKey="Mgmt Fee" stackId="a" fill="#10b981" />
              <Bar dataKey="Maintenance" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Utilities" stackId="a" fill="#6366f1" />
              <Bar dataKey="Prop Tax" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="Insurance" stackId="a" fill="#a78bfa" />
              <Bar dataKey="Marketing" stackId="a" fill="#f59e0b" />
              <Bar dataKey="G&A" stackId="a" fill="#f97316" />
              <Bar dataKey="Capex" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
