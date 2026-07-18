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
import { resolveOfficeOpexBenchmark } from "@/lib/benchmarks/office-opex";
import { normalizeAiResearchData } from "@/lib/constants/aiPrompts";
import type { OperationalOfficeHoldSnapshot } from "@/lib/operational-pnl";
import {
  roundPct2,
  roundRate2,
  totalOperationalBua,
} from "@/lib/operational-pnl";
import useFinModelStore from "@/store/useFinModelStore";
import type { OfficeOpexConfig } from "@/store/useFinModelStore";
import { AiInput } from "@/components/ui/AiInput";
import {
  getOperationalOfficeHoldSnapshot,
  leasedPctForYear,
} from "./OfficeRevenueStep";

export type OfficeOpexStepErrors = Record<string, string>;

export function buildOfficeOpexFromSnapshot(
  snap: OperationalOfficeHoldSnapshot | undefined
): OfficeOpexConfig | undefined {
  if (snap == null) return undefined;
  if (
    snap.camFixedBaseRate == null &&
    snap.camFixedBase == null &&
    !snap.opexTotalValues?.length
  ) {
    return undefined;
  }

  const projection: OfficeOpexConfig["projection"] = Array.from(
    { length: 10 },
    (_, i) => ({
      year: i + 1,
      cam: snap.opexCamValues?.[i] ?? 0,
      tax: snap.opexPropertyTaxValues?.[i] ?? 0,
      insurance: snap.opexInsuranceValues?.[i] ?? 0,
      marketing: snap.opexMarketingValues?.[i] ?? 0,
      gAndA: snap.opexGaValues?.[i] ?? 0,
      mgmtFee: snap.opexMgmtFeeValues?.[i] ?? 0,
      renovation: snap.opexRenovationValues?.[i] ?? 0,
      total: snap.opexTotalValues?.[i] ?? 0,
    })
  );

  const year1 = projection[0];
  return {
    camTotal: year1?.cam ?? 0,
    propertyTax: year1?.tax ?? 0,
    insurance: year1?.insurance ?? 0,
    cam: {
      fixedBaseRate: snap.camFixedBaseRate ?? 0,
      variableRate: snap.camVariableRate ?? 0,
    },
    property: {
      taxPctOfGrossRent: snap.propertyTaxPctOfGrossRent ?? 0,
      insurancePctOfGrossRent: snap.insurancePctOfGrossRent ?? 0,
    },
    marketing: {
      pctOfRevenue: snap.marketingPctOfRevenue ?? 0,
      gAndAPctOfRevenue: snap.gAndAPctOfRevenue ?? 0,
    },
    management: { feePct: snap.mgmtFeePctOfRevenue ?? 0 },
    renovation: {
      year1: snap.renovationYear1 ?? 0,
      year2: snap.renovationYear2 ?? 0,
      years3to10: snap.renovationYears3to10 ?? 0,
    },
    projection,
  };
}

export function validateOfficeOpexStep(
  snap: OperationalOfficeHoldSnapshot | undefined
): OfficeOpexStepErrors {
  const next: OfficeOpexStepErrors = {};
  const officeGla = snap?.officeGlaSqft ?? 0;
  if (!Number.isFinite(officeGla) || officeGla <= 0) {
    next.officeGla = "Complete Step 1 (office GLA) before operating expenses.";
  }
  const rev =
    (snap?.totalBaseRentValues?.[0] ?? 0) +
    (snap?.otherIncomeTotalValues?.[0] ?? 0);
  if (!Number.isFinite(rev) || rev <= 0) {
    next.totalRevenue =
      "Total Year 1 revenue must be greater than 0 (configure Steps 1–2).";
  }
  return next;
}

type OpexRow = {
  year: number;
  cam: number;
  tax: number;
  insurance: number;
  marketing: number;
  gAndA: number;
  mgmtFee: number;
  renovation: number;
  total: number;
  isOverridden: boolean;
  blendedLeasedPct: number;
  totalRevenue: number;
};

const TABLE_STREAMS = [
  "cam",
  "tax",
  "insurance",
  "marketing",
  "gAndA",
  "mgmtFee",
  "renovation",
] as const;

export function blendedEffectiveLeasedPct(
  year: number,
  officeGla: number,
  retailGla: number,
  snap: OperationalOfficeHoldSnapshot | undefined
): number {
  const totalGla = officeGla + retailGla;
  if (totalGla <= 0) return 0;

  const officeLeased = leasedPctForYear(
    year,
    snap?.officeLeasedOpeningPct ?? 30,
    snap?.officeLeasedTargetPct ?? 90,
    snap?.officeLeaseUpYears ?? 2.5
  );
  let officeEff = officeLeased;
  if (year === 1) {
    officeEff =
      officeLeased * (1 - (snap?.officeFreeRentMonths ?? 6) / 12);
  }

  const retailLeased = leasedPctForYear(
    year,
    snap?.retailLeasedOpeningPct ?? 50,
    snap?.retailLeasedTargetPct ?? 95,
    snap?.retailLeaseUpYears ?? 1.5
  );
  let retailEff = retailLeased;
  if (year === 1) {
    retailEff =
      retailLeased * (1 - (snap?.retailFreeRentMonths ?? 3) / 12);
  }

  return (officeGla * officeEff + retailGla * retailEff) / totalGla;
}

export default function OfficeOpexStep() {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const step1 = useFinModelStore((s) => s.operational.officeHoldSnapshot);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const currencyCode = projectInfo.currency || "AED";
  const totalBua = totalOperationalBua(cashOutflows);

  const aiC2 = useMemo(() => {
    const raw = cashOutflows?.aiResearchData;
    if (!raw) return undefined;
    const hasNested =
      !!raw.c2_operational?.step3_operating_expenses ||
      !!raw.c2_operational?.step1_base_rent;
    if (!hasNested) {
      return (
        normalizeAiResearchData(raw) as {
          c2_operational?: typeof raw.c2_operational;
        }
      )?.c2_operational;
    }
    return raw.c2_operational;
  }, [cashOutflows?.aiResearchData]);

  const aiStep3 = aiC2?.step3_operating_expenses;
  const aiCamFixedAnnual = aiStep3?.cam_fixed_base_annual;
  const aiCamVariableRate = aiStep3?.cam_variable_rate_psf;
  const aiPropertyTaxPctOpex = aiStep3?.property_tax_pct_of_revenue;
  const aiInsurancePctOpex = aiStep3?.insurance_pct_of_revenue;
  const aiMarketingPct = aiStep3?.marketing_pct_revenue;
  const aiGAPct = aiStep3?.g_and_a_pct_revenue;
  const aiManagementFeePct = aiStep3?.management_fee_pct_revenue;
  const aiRenovationYear1 = aiStep3?.renovation_provision?.year_1_pct;
  const aiRenovationYear2 = aiStep3?.renovation_provision?.year_2_pct;
  const aiRenovationYear3to10 = aiStep3?.renovation_provision?.years_3_10_pct;
  const aiCamFixedBaseRate =
    aiCamFixedAnnual != null && totalBua > 0
      ? roundRate2(aiCamFixedAnnual / totalBua)
      : undefined;

  const benchmark = useMemo(
    () =>
      resolveOfficeOpexBenchmark(
        projectInfo?.country || "UAE",
        projectInfo?.officeSegment || "prime_tower",
        projectInfo?.officePositioning || "grade_a"
      ),
    [
      projectInfo?.country,
      projectInfo?.officeSegment,
      projectInfo?.officePositioning,
    ]
  );

  const officeGla = step1?.officeGlaSqft ?? 200_000;
  const retailGla = step1?.retailGlaSqft ?? 50_000;
  const totalGla = officeGla + retailGla;

  const baseRentValues = step1?.totalBaseRentValues ?? Array(10).fill(0);
  const otherIncomeValues =
    step1?.otherIncomeTotalValues ?? Array(10).fill(0);

  const resolveCamFixedBaseRate = () => {
    if (step1?.camFixedBaseRate != null && step1.camFixedBaseRate > 0) {
      return roundRate2(step1.camFixedBaseRate);
    }
    if (step1?.camFixedBase != null && totalBua > 0) {
      return roundRate2(step1.camFixedBase / totalBua);
    }
    return roundRate2(benchmark.camFixedBaseRate);
  };

  const resolvePropertyTaxPct = () => {
    if (
      step1?.propertyTaxPctOfGrossRent != null &&
      step1.propertyTaxPctOfGrossRent > 0
    ) {
      return roundPct2(step1.propertyTaxPctOfGrossRent);
    }
    const grossY1 = baseRentValues[0] ?? 0;
    if (step1?.propertyTaxAnnual != null && grossY1 > 0) {
      return roundPct2((step1.propertyTaxAnnual / grossY1) * 100);
    }
    return roundPct2(benchmark.propertyTaxPctOfGrossRent);
  };

  const resolveInsurancePct = () => {
    if (
      step1?.insurancePctOfGrossRent != null &&
      step1.insurancePctOfGrossRent > 0
    ) {
      return roundPct2(step1.insurancePctOfGrossRent);
    }
    const grossY1 = baseRentValues[0] ?? 0;
    if (step1?.insuranceAnnual != null && grossY1 > 0) {
      return roundPct2((step1.insuranceAnnual / grossY1) * 100);
    }
    return roundPct2(benchmark.insurancePctOfGrossRent);
  };

  const resolveGAndAPct = () => {
    if (step1?.gAndAPctOfRevenue != null && step1.gAndAPctOfRevenue > 0) {
      return roundPct2(step1.gAndAPctOfRevenue);
    }
    const totalY1 = (baseRentValues[0] ?? 0) + (otherIncomeValues[0] ?? 0);
    if (step1?.gAndAAnnual != null && totalY1 > 0) {
      return roundPct2((step1.gAndAAnnual / totalY1) * 100);
    }
    return roundPct2(benchmark.gAndAPctOfRevenue);
  };

  const [camFixedBaseRate, setCamFixedBaseRate] = useState(() =>
    resolveCamFixedBaseRate()
  );
  const [camVariableRate, setCamVariableRate] = useState(
    step1?.camVariableRate ?? benchmark.camVariableRate
  );
  const [propertyTaxPct, setPropertyTaxPct] = useState(() =>
    resolvePropertyTaxPct()
  );
  const [insurancePct, setInsurancePct] = useState(() =>
    resolveInsurancePct()
  );
  const [marketingPct, setMarketingPct] = useState(
    step1?.marketingPctOfRevenue ?? benchmark.marketingPctOfRevenue
  );
  const [gAndAPct, setGAndAPct] = useState(() => resolveGAndAPct());
  const [mgmtFeePct, setMgmtFeePct] = useState(
    step1?.mgmtFeePctOfRevenue ?? benchmark.mgmtFeePctOfRevenue
  );
  const [renovationYear1, setRenovationYear1] = useState(
    step1?.renovationYear1 ?? benchmark.renovationYear1
  );
  const [renovationYear2, setRenovationYear2] = useState(
    step1?.renovationYear2 ?? benchmark.renovationYear2
  );
  const [renovationYears3to10, setRenovationYears3to10] = useState(
    step1?.renovationYears3to10 ?? benchmark.renovationYears3to10
  );

  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    () => step1?.opexSectionOverrides ?? {}
  );
  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Record<string, number>>
  >({});

  const tableData = useMemo(() => {
    const rows: OpexRow[] = [];
    let totalCam = 0;
    let totalTax = 0;
    let totalInsurance = 0;
    let totalMarketing = 0;
    let totalGAndA = 0;
    let totalMgmtFee = 0;
    let totalRenovation = 0;
    let totalOpex = 0;

    for (let t = 1; t <= 10; t++) {
      const i = t - 1;
      const baseRent = baseRentValues[i] || 0;
      const otherIncome = otherIncomeValues[i] || 0;
      const totalRevenue = baseRent + otherIncome;

      const blendedLeasedPct = blendedEffectiveLeasedPct(
        t,
        officeGla,
        retailGla,
        step1
      );
      const leasedGla = totalGla * (blendedLeasedPct / 100);
      const camFixedTotal = camFixedBaseRate * totalBua;
      const camVariableTotal = camVariableRate * leasedGla;
      const camTotal = camFixedTotal + camVariableTotal;

      const grossRentalRevenue = baseRent;
      const taxAmount = grossRentalRevenue * (propertyTaxPct / 100);
      const insuranceAmount = grossRentalRevenue * (insurancePct / 100);
      const marketingAmount = totalRevenue * (marketingPct / 100);
      const gAndAAmount = totalRevenue * (gAndAPct / 100);
      const mgmtFeeAmount = totalRevenue * (mgmtFeePct / 100);

      let renovationPct = renovationYears3to10;
      if (t === 1) renovationPct = renovationYear1;
      else if (t === 2) renovationPct = renovationYear2;
      const renovationAmount = totalRevenue * (renovationPct / 100);

      const manual = manualYearValues[t] || {};

      const row: OpexRow = {
        year: t,
        cam: manual.cam ?? camTotal,
        tax: manual.tax ?? taxAmount,
        insurance: manual.insurance ?? insuranceAmount,
        marketing: manual.marketing ?? marketingAmount,
        gAndA: manual.gAndA ?? gAndAAmount,
        mgmtFee: manual.mgmtFee ?? mgmtFeeAmount,
        renovation: manual.renovation ?? renovationAmount,
        total: 0,
        isOverridden: Object.keys(manual).length > 0,
        blendedLeasedPct,
        totalRevenue,
      };
      row.total =
        manual.total ??
        row.cam +
          row.tax +
          row.insurance +
          row.marketing +
          row.gAndA +
          row.mgmtFee +
          row.renovation;

      totalCam += row.cam;
      totalTax += row.tax;
      totalInsurance += row.insurance;
      totalMarketing += row.marketing;
      totalGAndA += row.gAndA;
      totalMgmtFee += row.mgmtFee;
      totalRenovation += row.renovation;
      totalOpex += row.total;

      rows.push(row);
    }

    return {
      rows,
      totals: {
        cam: totalCam,
        tax: totalTax,
        insurance: totalInsurance,
        marketing: totalMarketing,
        gAndA: totalGAndA,
        mgmtFee: totalMgmtFee,
        renovation: totalRenovation,
        total: totalOpex,
      },
    };
  }, [
    officeGla,
    retailGla,
    totalBua,
    totalGla,
    step1,
    baseRentValues,
    otherIncomeValues,
    camFixedBaseRate,
    camVariableRate,
    propertyTaxPct,
    insurancePct,
    marketingPct,
    gAndAPct,
    mgmtFeePct,
    renovationYear1,
    renovationYear2,
    renovationYears3to10,
    manualYearValues,
  ]);

  const persistSnapshot = useCallback(() => {
    const prev = getOperationalOfficeHoldSnapshot();
    if (!prev) return;
    const merged: OperationalOfficeHoldSnapshot = {
      ...prev,
      officeGlaSqft: prev?.officeGlaSqft ?? officeGla,
      retailGlaSqft: prev?.retailGlaSqft ?? retailGla,
      totalBaseRentValues: prev?.totalBaseRentValues ?? baseRentValues,
      otherIncomeTotalValues:
        prev?.otherIncomeTotalValues ?? otherIncomeValues,
      camFixedBaseRate,
      camVariableRate,
      propertyTaxPctOfGrossRent: propertyTaxPct,
      insurancePctOfGrossRent: insurancePct,
      marketingPctOfRevenue: marketingPct,
      gAndAPctOfRevenue: gAndAPct,
      mgmtFeePctOfRevenue: mgmtFeePct,
      renovationYear1,
      renovationYear2,
      renovationYears3to10,
      opexSectionOverrides: overrides,
      opexCamValues: tableData.rows.map((r) => r.cam),
      opexPropertyTaxValues: tableData.rows.map((r) => r.tax),
      opexInsuranceValues: tableData.rows.map((r) => r.insurance),
      opexMarketingValues: tableData.rows.map((r) => r.marketing),
      opexGaValues: tableData.rows.map((r) => r.gAndA),
      opexMgmtFeeValues: tableData.rows.map((r) => r.mgmtFee),
      opexRenovationValues: tableData.rows.map((r) => r.renovation),
      opexTotalValues: tableData.rows.map((r) => r.total),
      camExpensesAed: tableData.rows[0]?.cam,
      propertyTaxAed: tableData.rows[0]?.tax,
      insuranceAed: tableData.rows[0]?.insurance,
    };
    const store = useFinModelStore.getState();
    store.updateOfficeHoldSnapshot(merged, "operational");
    const officeOpex = buildOfficeOpexFromSnapshot(merged);
    if (officeOpex) {
      store.updateProjectInfo({ officeOpex }, "operational");
    }
  }, [
    officeGla,
    retailGla,
    totalBua,
    baseRentValues,
    otherIncomeValues,
    camFixedBaseRate,
    camVariableRate,
    propertyTaxPct,
    insurancePct,
    marketingPct,
    gAndAPct,
    mgmtFeePct,
    renovationYear1,
    renovationYear2,
    renovationYears3to10,
    overrides,
    tableData.rows,
  ]);

  useEffect(() => {
    const timer = setTimeout(persistSnapshot, 200);
    return () => clearTimeout(timer);
  }, [persistSnapshot]);

  useEffect(() => {
    if (!benchmark || Object.keys(overrides).length > 0) return;
    if (step1?.camFixedBaseRate != null || step1?.camFixedBase != null) return;
    setCamFixedBaseRate(
      aiCamFixedBaseRate ?? roundRate2(benchmark.camFixedBaseRate)
    );
    setCamVariableRate(aiCamVariableRate ?? benchmark.camVariableRate);
    setPropertyTaxPct(
      roundPct2(
        aiPropertyTaxPctOpex ?? benchmark.propertyTaxPctOfGrossRent
      )
    );
    setInsurancePct(
      roundPct2(aiInsurancePctOpex ?? benchmark.insurancePctOfGrossRent)
    );
    setMarketingPct(aiMarketingPct ?? benchmark.marketingPctOfRevenue);
    setGAndAPct(roundPct2(aiGAPct ?? benchmark.gAndAPctOfRevenue));
    setMgmtFeePct(aiManagementFeePct ?? benchmark.mgmtFeePctOfRevenue);
    setRenovationYear1(aiRenovationYear1 ?? benchmark.renovationYear1);
    setRenovationYear2(aiRenovationYear2 ?? benchmark.renovationYear2);
    setRenovationYears3to10(
      aiRenovationYear3to10 ?? benchmark.renovationYears3to10
    );
  }, [
    benchmark,
    overrides,
    step1?.camFixedBaseRate,
    step1?.camFixedBase,
    aiCamFixedBaseRate,
    aiCamVariableRate,
    aiPropertyTaxPctOpex,
    aiInsurancePctOpex,
    aiMarketingPct,
    aiGAPct,
    aiManagementFeePct,
    aiRenovationYear1,
    aiRenovationYear2,
    aiRenovationYear3to10,
  ]);

  // Apply AI when it arrives (unless that field overridden)
  useEffect(() => {
    if (!aiC2) return;
    if (!overrides.camFixedBaseRate && aiCamFixedBaseRate != null) {
      setCamFixedBaseRate(aiCamFixedBaseRate);
    }
    if (!overrides.camVariableRate && aiCamVariableRate != null) {
      setCamVariableRate(aiCamVariableRate);
    }
    if (!overrides.propertyTaxPct && aiPropertyTaxPctOpex != null) {
      setPropertyTaxPct(roundPct2(aiPropertyTaxPctOpex));
    }
    if (!overrides.insurancePct && aiInsurancePctOpex != null) {
      setInsurancePct(roundPct2(aiInsurancePctOpex));
    }
    if (!overrides.marketingPct && aiMarketingPct != null) {
      setMarketingPct(aiMarketingPct);
    }
    if (!overrides.gAndAPct && aiGAPct != null) {
      setGAndAPct(roundPct2(aiGAPct));
    }
    if (!overrides.mgmtFeePct && aiManagementFeePct != null) {
      setMgmtFeePct(aiManagementFeePct);
    }
    if (!overrides.renovationYear1 && aiRenovationYear1 != null) {
      setRenovationYear1(aiRenovationYear1);
    }
    if (!overrides.renovationYear2 && aiRenovationYear2 != null) {
      setRenovationYear2(aiRenovationYear2);
    }
    if (!overrides.renovationYears3to10 && aiRenovationYear3to10 != null) {
      setRenovationYears3to10(aiRenovationYear3to10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    aiC2,
    aiCamFixedBaseRate,
    aiCamVariableRate,
    aiPropertyTaxPctOpex,
    aiInsurancePctOpex,
    aiMarketingPct,
    aiGAPct,
    aiManagementFeePct,
    aiRenovationYear1,
    aiRenovationYear2,
    aiRenovationYear3to10,
  ]);

  const handleResetSection = (section: string) => {
    if (section === "cam") {
      setCamFixedBaseRate(
        aiCamFixedBaseRate ?? roundRate2(benchmark.camFixedBaseRate)
      );
      setCamVariableRate(aiCamVariableRate ?? benchmark.camVariableRate);
      setOverrides((prev) => {
        const next = { ...prev };
        delete next.cam;
        delete next.camFixedBaseRate;
        delete next.camVariableRate;
        return next;
      });
    } else if (section === "propIns") {
      setPropertyTaxPct(
        roundPct2(
          aiPropertyTaxPctOpex ?? benchmark.propertyTaxPctOfGrossRent
        )
      );
      setInsurancePct(
        roundPct2(aiInsurancePctOpex ?? benchmark.insurancePctOfGrossRent)
      );
      setOverrides((prev) => {
        const next = { ...prev };
        delete next.propIns;
        delete next.propertyTaxPct;
        delete next.insurancePct;
        return next;
      });
    } else if (section === "mktGa") {
      setMarketingPct(aiMarketingPct ?? benchmark.marketingPctOfRevenue);
      setGAndAPct(roundPct2(aiGAPct ?? benchmark.gAndAPctOfRevenue));
      setOverrides((prev) => {
        const next = { ...prev };
        delete next.mktGa;
        delete next.marketingPct;
        delete next.gAndAPct;
        return next;
      });
    } else if (section === "mgmt") {
      setMgmtFeePct(aiManagementFeePct ?? benchmark.mgmtFeePctOfRevenue);
      setOverrides((prev) => {
        const next = { ...prev };
        delete next.mgmt;
        delete next.mgmtFeePct;
        return next;
      });
    } else if (section === "ren") {
      setRenovationYear1(aiRenovationYear1 ?? benchmark.renovationYear1);
      setRenovationYear2(aiRenovationYear2 ?? benchmark.renovationYear2);
      setRenovationYears3to10(
        aiRenovationYear3to10 ?? benchmark.renovationYears3to10
      );
      setOverrides((prev) => {
        const next = { ...prev };
        delete next.ren;
        delete next.renovationYear1;
        delete next.renovationYear2;
        delete next.renovationYears3to10;
        return next;
      });
    }
  };

  const handleResetAll = () => {
    setCamFixedBaseRate(
      aiCamFixedBaseRate ?? roundRate2(benchmark.camFixedBaseRate)
    );
    setCamVariableRate(aiCamVariableRate ?? benchmark.camVariableRate);
    setPropertyTaxPct(
      roundPct2(aiPropertyTaxPctOpex ?? benchmark.propertyTaxPctOfGrossRent)
    );
    setInsurancePct(
      roundPct2(aiInsurancePctOpex ?? benchmark.insurancePctOfGrossRent)
    );
    setMarketingPct(aiMarketingPct ?? benchmark.marketingPctOfRevenue);
    setGAndAPct(roundPct2(aiGAPct ?? benchmark.gAndAPctOfRevenue));
    setMgmtFeePct(aiManagementFeePct ?? benchmark.mgmtFeePctOfRevenue);
    setRenovationYear1(aiRenovationYear1 ?? benchmark.renovationYear1);
    setRenovationYear2(aiRenovationYear2 ?? benchmark.renovationYear2);
    setRenovationYears3to10(
      aiRenovationYear3to10 ?? benchmark.renovationYears3to10
    );
    setOverrides({});
    setManualYearValues({});
  };

  const handleFieldChange = (section: string, field: string, value: number) => {
    const pctFields = new Set(["propertyTaxPct", "insurancePct", "gAndAPct"]);
    const rateFields = new Set(["camFixedBaseRate"]);
    const normalized = pctFields.has(field)
      ? roundPct2(value)
      : rateFields.has(field)
        ? roundRate2(value)
        : value;

    const setters: Record<string, (v: number) => void> = {
      camFixedBaseRate: setCamFixedBaseRate,
      camVariableRate: setCamVariableRate,
      propertyTaxPct: setPropertyTaxPct,
      insurancePct: setInsurancePct,
      marketingPct: setMarketingPct,
      gAndAPct: setGAndAPct,
      mgmtFeePct: setMgmtFeePct,
      renovationYear1: setRenovationYear1,
      renovationYear2: setRenovationYear2,
      renovationYears3to10: setRenovationYears3to10,
    };

    if (setters[field]) {
      setters[field](normalized);
      // Field-specific override only (not section-wide)
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
    CAM: row.cam / 1_000_000,
    "Property Tax": row.tax / 1_000_000,
    Insurance: row.insurance / 1_000_000,
    Marketing: row.marketing / 1_000_000,
    "G&A": row.gAndA / 1_000_000,
    "Mgmt Fee": row.mgmtFee / 1_000_000,
    Renovation: row.renovation / 1_000_000,
  }));

  const segmentLabel =
    projectInfo?.officeSegment?.replace(/_/g, " ") ?? "prime tower";
  const positioningLabel =
    projectInfo?.officePositioning?.replace(/_/g, " ") ?? "grade a";

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 3 — Operating Expenses
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Expenses include CAM, property tax, insurance, marketing, G&amp;A,
          management fee, and renovation.
          <span className="ml-1 text-amber-500">Amber borders</span> indicate
          manual overrides.
        </p>
      </div>

      <div className="mb-6 border-b border-slate-700 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-slate-500">BENCHMARK</span>
            <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
              <span className="text-xs text-slate-300">
                Office + Retail • {segmentLabel} • {positioningLabel} •{" "}
                {projectInfo?.country || "UAE"}
              </span>
            </div>
            {Object.values(overrides).some((v) => v) && (
              <div className="rounded-full border border-amber-600/50 bg-amber-900/30 px-3 py-1">
                <span className="text-xs text-amber-400">Manual overrides</span>
              </div>
            )}
          </div>
          {Object.values(overrides).some((v) => v) && (
            <button
              type="button"
              onClick={handleResetAll}
              className="text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
            >
              Reset to benchmark
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            CAM (Common Area Maintenance)
          </h3>
          <button
            type="button"
            onClick={() => handleResetSection("cam")}
            className={`text-xs font-medium transition-colors ${
              overrides.camFixedBaseRate || overrides.camVariableRate
                ? "text-emerald-400 hover:text-emerald-300"
                : "cursor-default text-slate-500"
            }`}
            disabled={!overrides.camFixedBaseRate && !overrides.camVariableRate}
          >
            Reset CAM
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <AiInput
              label={`CAM – Fixed Base Rate (${currencyCode}/psf of BUA/year)`}
              value={camFixedBaseRate}
              onChange={(val) =>
                handleFieldChange("cam", "camFixedBaseRate", Number(val))
              }
              type="number"
              step={0.01}
              min={0}
              isAiGenerated={
                aiCamFixedBaseRate != null && !overrides.camFixedBaseRate
              }
              isManualOverride={!!overrides.camFixedBaseRate}
            />
            <p className="mt-1 text-sm text-slate-500">
              Annual fixed CAM = Rate × Total BUA (
              {totalBua.toLocaleString()} sqft from Component 1)
            </p>
          </div>
          <div>
            <AiInput
              label={`CAM – Variable rate (${currencyCode}/psf × blended leased %)`}
              value={camVariableRate}
              onChange={(val) =>
                handleFieldChange("cam", "camVariableRate", Number(val))
              }
              type="number"
              isAiGenerated={
                aiCamVariableRate != null && !overrides.camVariableRate
              }
              isManualOverride={!!overrides.camVariableRate}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              × (Office + Retail GLA × blended effective leased %)
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Blended leased % weights office and retail GLA from Step 1 (including
          free-rent in Year 1). Total GLA: {totalGla.toLocaleString()} sqft.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Property Tax &amp; Insurance
          </h3>
          <button
            type="button"
            onClick={() => handleResetSection("propIns")}
            className={`text-xs font-medium transition-colors ${
              overrides.propertyTaxPct || overrides.insurancePct
                ? "text-emerald-400 hover:text-emerald-300"
                : "cursor-default text-slate-500"
            }`}
            disabled={!overrides.propertyTaxPct && !overrides.insurancePct}
          >
            Reset prop/ins
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <AiInput
              label="Property Tax (% of Gross Rental Revenue)"
              value={propertyTaxPct}
              onChange={(val) =>
                handleFieldChange("propIns", "propertyTaxPct", Number(val))
              }
              type="percentage"
              step={0.01}
              min={0}
              max={100}
              isAiGenerated={
                aiPropertyTaxPctOpex != null && !overrides.propertyTaxPct
              }
              isManualOverride={!!overrides.propertyTaxPct}
            />
            <p className="mt-1 text-sm text-slate-500">
              Applied to Step 1 office + retail rent revenue each year
            </p>
          </div>
          <div>
            <AiInput
              label="Insurance (% of Gross Rental Revenue)"
              value={insurancePct}
              onChange={(val) =>
                handleFieldChange("propIns", "insurancePct", Number(val))
              }
              type="percentage"
              step={0.01}
              min={0}
              max={100}
              isAiGenerated={
                aiInsurancePctOpex != null && !overrides.insurancePct
              }
              isManualOverride={!!overrides.insurancePct}
            />
            <p className="mt-1 text-sm text-slate-500">
              Applied to Step 1 office + retail rent revenue each year
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Marketing &amp; G&amp;A
          </h3>
          <button
            type="button"
            onClick={() => handleResetSection("mktGa")}
            className={`text-xs font-medium transition-colors ${
              overrides.marketingPct || overrides.gAndAPct
                ? "text-emerald-400 hover:text-emerald-300"
                : "cursor-default text-slate-500"
            }`}
            disabled={!overrides.marketingPct && !overrides.gAndAPct}
          >
            Reset marketing/G&amp;A
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <AiInput
              label="Marketing (% of total revenue)"
              value={marketingPct}
              onChange={(val) =>
                handleFieldChange("mktGa", "marketingPct", Number(val))
              }
              type="percentage"
              step={0.1}
              isAiGenerated={aiMarketingPct != null && !overrides.marketingPct}
              isManualOverride={!!overrides.marketingPct}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Total revenue = Step 1 base rent + Step 2 other income
            </p>
          </div>
          <div>
            <AiInput
              label="G&A (% of Total Revenue)"
              value={gAndAPct}
              onChange={(val) =>
                handleFieldChange("mktGa", "gAndAPct", Number(val))
              }
              type="percentage"
              step={0.01}
              min={0}
              max={100}
              isAiGenerated={aiGAPct != null && !overrides.gAndAPct}
              isManualOverride={!!overrides.gAndAPct}
            />
            <p className="mt-1 text-sm text-slate-500">
              Total revenue = Step 1 base rent + Step 2 other income
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">Management Fee</h3>
          <button
            type="button"
            onClick={() => handleResetSection("mgmt")}
            className={`text-xs font-medium transition-colors ${
              overrides.mgmtFeePct
                ? "text-emerald-400 hover:text-emerald-300"
                : "cursor-default text-slate-500"
            }`}
            disabled={!overrides.mgmtFeePct}
          >
            Reset mgmt fee
          </button>
        </div>
        <div className="max-w-xs">
          <AiInput
            label="Base management fee (% of total revenue)"
            value={mgmtFeePct}
            onChange={(val) =>
              handleFieldChange("mgmt", "mgmtFeePct", Number(val))
            }
            type="percentage"
            step={0.1}
            isAiGenerated={aiManagementFeePct != null && !overrides.mgmtFeePct}
            isManualOverride={!!overrides.mgmtFeePct}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">
            Renovation / Capex Provision
          </h3>
          <button
            type="button"
            onClick={() => handleResetSection("ren")}
            className={`text-xs font-medium transition-colors ${
              overrides.renovationYear1 ||
              overrides.renovationYear2 ||
              overrides.renovationYears3to10
                ? "text-emerald-400 hover:text-emerald-300"
                : "cursor-default text-slate-500"
            }`}
            disabled={
              !overrides.renovationYear1 &&
              !overrides.renovationYear2 &&
              !overrides.renovationYears3to10
            }
          >
            Reset renovation
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <AiInput
              label="Year 1 (% of EGI)"
              value={renovationYear1}
              onChange={(val) =>
                handleFieldChange("ren", "renovationYear1", Number(val))
              }
              type="percentage"
              step={0.1}
              isAiGenerated={
                aiRenovationYear1 != null && !overrides.renovationYear1
              }
              isManualOverride={!!overrides.renovationYear1}
            />
          </div>
          <div>
            <AiInput
              label="Year 2 (% of EGI)"
              value={renovationYear2}
              onChange={(val) =>
                handleFieldChange("ren", "renovationYear2", Number(val))
              }
              type="percentage"
              step={0.1}
              isAiGenerated={
                aiRenovationYear2 != null && !overrides.renovationYear2
              }
              isManualOverride={!!overrides.renovationYear2}
            />
          </div>
          <div>
            <AiInput
              label="Years 3–10 (% of EGI)"
              value={renovationYears3to10}
              onChange={(val) =>
                handleFieldChange("ren", "renovationYears3to10", Number(val))
              }
              type="percentage"
              step={0.1}
              isAiGenerated={
                aiRenovationYear3to10 != null && !overrides.renovationYears3to10
              }
              isManualOverride={!!overrides.renovationYears3to10}
            />
          </div>
        </div>
      </div>

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
                <th className="px-3 py-3">Blended %</th>
                <th className="px-3 py-3">CAM (M)</th>
                <th className="px-3 py-3">Prop Tax (M)</th>
                <th className="px-3 py-3">Insurance (M)</th>
                <th className="px-3 py-3">Marketing (M)</th>
                <th className="px-3 py-3">G&amp;A (M)</th>
                <th className="px-3 py-3">Mgmt Fee (M)</th>
                <th className="px-3 py-3">Renovation (M)</th>
                <th className="px-3 py-3 text-right">Total Opex (M)</th>
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row) => (
                <tr
                  key={row.year}
                  className={`border-b border-slate-800 transition ${row.isOverridden ? "bg-amber-900/10" : "hover:bg-slate-800/50"}`}
                >
                  <td className="px-3 py-3 font-medium text-white">
                    Y{row.year}
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    {row.blendedLeasedPct.toFixed(1)}%
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
                            parseFloat(e.target.value) * 1_000_000
                          )
                        }
                        className={`w-20 rounded bg-slate-800 p-1 text-right ${manualYearValues[row.year]?.[stream] ? "border border-amber-500" : "border border-transparent"}`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-400">
                    {(row.total / 1_000_000).toFixed(2)}
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-800 font-bold text-white">
                <td className="px-3 py-3" colSpan={2}>
                  10-Year Total
                </td>
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
                wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }}
              />
              <Bar dataKey="CAM" stackId="a" fill="#10b981" />
              <Bar dataKey="Property Tax" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Insurance" stackId="a" fill="#6366f1" />
              <Bar dataKey="Marketing" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="G&A" stackId="a" fill="#a78bfa" />
              <Bar dataKey="Mgmt Fee" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Renovation" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
