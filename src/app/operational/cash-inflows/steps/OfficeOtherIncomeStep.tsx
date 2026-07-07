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
import {
  defaultRecoveriesFromGla,
  defaultRecoveryPctsFromGla,
  resolveOfficeOtherIncomeBenchmark,
} from "@/lib/benchmarks/office-other-income";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import {
  defaultOperationalOfficeHoldSnapshot,
  roundPct2,
  roundRate2,
  type OperationalOfficeHoldSnapshot,
} from "@/lib/operational-pnl";
import useFinModelStore from "@/store/useFinModelStore";
import { getOperationalOfficeHoldSnapshot } from "./OfficeRevenueStep";

const inputBase =
  "w-full rounded bg-slate-900 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

function overrideFieldClass(overridden: boolean): string {
  return overridden
    ? `${inputBase} border-2 border-amber-500/70`
    : `${inputBase} border border-slate-600`;
}

function readOnlyFieldClass(): string {
  return `${inputBase} cursor-not-allowed border border-slate-700 bg-slate-800/80 text-slate-400`;
}

function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export type OfficeOtherIncomeStepErrors = Record<string, string>;

export function validateOfficeOtherIncomeStep(
  snap: OperationalOfficeHoldSnapshot | undefined
): OfficeOtherIncomeStepErrors {
  const next: OfficeOtherIncomeStepErrors = {};
  const officeGla = snap?.officeGlaSqft ?? 0;
  if (!Number.isFinite(officeGla) || officeGla <= 0) {
    next.officeGla =
      "Complete Step 1 (office GLA) before configuring other income.";
  }
  const spaces = snap?.totalParkingSpaces ?? 0;
  if (!Number.isFinite(spaces) || spaces <= 0) {
    next.totalParkingSpaces = "Total parking spaces must be greater than 0.";
  }
  const reserved = snap?.officeReservedSpaces ?? 0;
  if (reserved > spaces) {
    next.officeReservedSpaces =
      "Office reserved spaces cannot exceed total parking spaces.";
  }
  const rate = snap?.recoveryRate ?? 0;
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    next.recoveryRate = "Recovery rate must be between 0% and 100%.";
  }
  return next;
}

export type OfficeOtherIncomeRow = {
  year: number;
  parking: number;
  recoveries: number;
  advertising: number;
  total: number;
  isOverridden: boolean;
};

export function computeOfficeOtherIncomeRows(params: {
  officeReservedSpaces: number;
  monthlyPassPrice: number;
  officePassOccupancy: number;
  retailAvailableSpaces: number;
  retailHourlyRate: number;
  retailAvgDailyHours: number;
  retailUtilization: number;
  operatingDays: number;
  camExpenses: number;
  grossRentByYear: number[];
  propertyTaxPct: number;
  insurancePct: number;
  recoveryRate: number;
  advertisingRatePerSqft: number;
  totalGla: number;
  manualYearValues: Record<number, Record<string, number>>;
}): { rows: OfficeOtherIncomeRow[]; totals: Record<string, number> } {
  const rows: OfficeOtherIncomeRow[] = [];
  let totalParking = 0;
  let totalRecoveries = 0;
  let totalAdvertising = 0;

  for (let t = 1; t <= OPERATIONAL_ROOM_REVENUE_YEARS; t++) {
    const officeParkingAnnual =
      params.officeReservedSpaces *
      params.monthlyPassPrice *
      12 *
      (params.officePassOccupancy / 100);

    const retailParkingAnnual =
      params.retailAvailableSpaces *
      params.retailHourlyRate *
      params.retailAvgDailyHours *
      params.operatingDays *
      (params.retailUtilization / 100);

    const parkingIncome = officeParkingAnnual + retailParkingAnnual;

    const grossRent = params.grossRentByYear[t - 1] ?? 0;
    const propertyTaxAmount = grossRent * (params.propertyTaxPct / 100);
    const insuranceAmount = grossRent * (params.insurancePct / 100);
    const totalRecoverable =
      params.camExpenses + propertyTaxAmount + insuranceAmount;
    const recoveryIncome = totalRecoverable * (params.recoveryRate / 100);

    const advertisingIncome =
      params.advertisingRatePerSqft * params.totalGla;

    const totalOther = parkingIncome + recoveryIncome + advertisingIncome;

    totalParking += parkingIncome;
    totalRecoveries += recoveryIncome;
    totalAdvertising += advertisingIncome;

    const manual = params.manualYearValues[t] ?? {};
    const parking = manual.parking ?? parkingIncome;
    const recoveries = manual.recoveries ?? recoveryIncome;
    const advertising = manual.advertising ?? advertisingIncome;
    const total = manual.total ?? parking + recoveries + advertising;

    rows.push({
      year: t,
      parking,
      recoveries,
      advertising,
      total,
      isOverridden: Object.keys(manual).length > 0,
    });
  }

  return {
    rows,
    totals: {
      parking: totalParking,
      recoveries: totalRecoveries,
      advertising: totalAdvertising,
      total: totalParking + totalRecoveries + totalAdvertising,
    },
  };
}

export default function OfficeOtherIncomeStep() {
  const mounted = useClientMounted();
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const step1 = useFinModelStore((s) => s.operational.officeHoldSnapshot);
  const storeCam = useFinModelStore(
    (s) => s.operational.projectInfo.officeOpex?.camTotal
  );
  const storeTaxPct = useFinModelStore(
    (s) => s.operational.projectInfo.officeOpex?.property?.taxPctOfGrossRent
  );
  const storeInsPct = useFinModelStore(
    (s) => s.operational.projectInfo.officeOpex?.property?.insurancePctOfGrossRent
  );
  const opexLocked =
    storeCam !== undefined ||
    storeTaxPct !== undefined ||
    storeInsPct !== undefined;
  const parkingSectionOverride = useFinModelStore(
    (s) =>
      !!s.operational.officeHoldSnapshot?.otherIncomeSectionOverrides?.parking
  );
  const recoveriesSectionOverride = useFinModelStore(
    (s) =>
      !!s.operational.officeHoldSnapshot?.otherIncomeSectionOverrides
        ?.recoveries
  );
  const advertisingSectionOverride = useFinModelStore(
    (s) =>
      !!s.operational.officeHoldSnapshot?.otherIncomeSectionOverrides
        ?.advertising
  );
  const updateOfficeHoldSnapshot = useFinModelStore(
    (s) => s.updateOfficeHoldSnapshot
  );
  const currencyCode = projectInfo.currency || "AED";

  const coworkingDelivery =
    projectInfo.officeSegment === "co_working"
      ? projectInfo.officeCoworkingDelivery
      : undefined;

  const totalGla =
    (step1?.officeGlaSqft ?? 0) + (step1?.retailGlaSqft ?? 0);

  const grossRentYear1 =
    step1?.totalBaseRentValues?.[0] ??
    (step1?.officeGlaSqft ?? 0) * (step1?.officeRentPsfYear1 ?? 0) * 0.85;
  const grossRentByYear = step1?.totalBaseRentValues ?? [];

  const incomeBenchmark = useMemo(
    () =>
      resolveOfficeOtherIncomeBenchmark(
        projectInfo.country || "UAE",
        projectInfo.officeSegment || "prime_tower",
        projectInfo.officePositioning || "grade_a",
        coworkingDelivery,
        totalGla
      ),
    [
      projectInfo.country,
      projectInfo.officeSegment,
      projectInfo.officePositioning,
      coworkingDelivery,
      totalGla,
    ]
  );

  const defaultRecoveries = useMemo(
    () => defaultRecoveryPctsFromGla(incomeBenchmark, totalGla, grossRentYear1),
    [incomeBenchmark, totalGla, grossRentYear1]
  );

  const snap = getOperationalOfficeHoldSnapshot();

  const [totalParkingSpaces, setTotalParkingSpaces] = useState(
    () => snap?.totalParkingSpaces ?? incomeBenchmark.totalParkingSpaces
  );
  const [officeReservedSpaces, setOfficeReservedSpaces] = useState(
    () => snap?.officeReservedSpaces ?? incomeBenchmark.officeReservedSpaces
  );
  const [monthlyPassPrice, setMonthlyPassPrice] = useState(
    () => snap?.monthlyPassPrice ?? incomeBenchmark.monthlyPassPrice
  );
  const [officePassOccupancy, setOfficePassOccupancy] = useState(
    () => snap?.officePassOccupancy ?? incomeBenchmark.officePassOccupancy
  );
  const [retailHourlyRate, setRetailHourlyRate] = useState(
    () => snap?.retailHourlyRate ?? incomeBenchmark.retailHourlyRate
  );
  const [retailAvgDailyHours, setRetailAvgDailyHours] = useState(
    () => snap?.retailAvgDailyHours ?? incomeBenchmark.retailAvgDailyHours
  );
  const [retailAvailableSpaces, setRetailAvailableSpaces] = useState(() => {
    if (snap?.retailAvailableSpaces != null) return snap.retailAvailableSpaces;
    return Math.max(
      0,
      incomeBenchmark.totalParkingSpaces - incomeBenchmark.officeReservedSpaces
    );
  });
  const [retailUtilization, setRetailUtilization] = useState(
    () => snap?.retailUtilization ?? incomeBenchmark.retailUtilization
  );
  const [operatingDays, setOperatingDays] = useState(
    () => snap?.parkingOperatingDays ?? incomeBenchmark.operatingDays
  );

  const [camExpenses, setCamExpenses] = useState(
    () =>
      storeCam ?? snap?.camExpensesAed ?? defaultRecoveries.camTotal
  );
  const [propertyTaxPct, setPropertyTaxPct] = useState(() => {
    if (storeTaxPct != null && storeTaxPct > 0) return roundPct2(storeTaxPct);
    if (snap?.propertyTaxPctOfGrossRent != null && snap.propertyTaxPctOfGrossRent > 0) {
      return roundPct2(snap.propertyTaxPctOfGrossRent);
    }
    if (snap?.propertyTaxAed != null && grossRentYear1 > 0) {
      return roundPct2((snap.propertyTaxAed / grossRentYear1) * 100);
    }
    return defaultRecoveries.propertyTaxPct;
  });
  const [insurancePct, setInsurancePct] = useState(() => {
    if (storeInsPct != null && storeInsPct > 0) return roundPct2(storeInsPct);
    if (snap?.insurancePctOfGrossRent != null && snap.insurancePctOfGrossRent > 0) {
      return roundPct2(snap.insurancePctOfGrossRent);
    }
    if (snap?.insuranceAed != null && grossRentYear1 > 0) {
      return roundPct2((snap.insuranceAed / grossRentYear1) * 100);
    }
    return defaultRecoveries.insurancePct;
  });
  const [recoveryRate, setRecoveryRate] = useState(
    () => snap?.recoveryRate ?? incomeBenchmark.recoveryRate
  );

  const [advertisingRatePerSqft, setAdvertisingRatePerSqft] = useState(() => {
    if (snap?.advertisingRatePerSqft != null && snap.advertisingRatePerSqft > 0) {
      return roundRate2(snap.advertisingRatePerSqft);
    }
    if (snap?.advertisingIncomeYear1 != null && totalGla > 0) {
      return roundRate2(snap.advertisingIncomeYear1 / totalGla);
    }
    return roundRate2(incomeBenchmark.advertisingRatePerSqft);
  });

  const [manualYearValues, setManualYearValues] = useState<
    Record<number, Record<string, number>>
  >(() => snap?.otherIncomeManualYearValues ?? {});

  useEffect(() => {
    if (recoveriesSectionOverride || storeCam === undefined) return;
    setCamExpenses((prev) => (prev !== storeCam ? storeCam : prev));
  }, [storeCam, recoveriesSectionOverride]);

  useEffect(() => {
    if (recoveriesSectionOverride || storeTaxPct === undefined) return;
    setPropertyTaxPct((prev) =>
      prev !== storeTaxPct ? roundPct2(storeTaxPct) : prev
    );
  }, [storeTaxPct, recoveriesSectionOverride]);

  useEffect(() => {
    if (recoveriesSectionOverride || storeInsPct === undefined) return;
    setInsurancePct((prev) =>
      prev !== storeInsPct ? roundPct2(storeInsPct) : prev
    );
  }, [storeInsPct, recoveriesSectionOverride]);

  const tableData = useMemo(
    () =>
      computeOfficeOtherIncomeRows({
        officeReservedSpaces,
        monthlyPassPrice,
        officePassOccupancy,
        retailAvailableSpaces,
        retailHourlyRate,
        retailAvgDailyHours,
        retailUtilization,
        operatingDays,
        camExpenses,
        grossRentByYear,
        propertyTaxPct,
        insurancePct,
        recoveryRate,
        advertisingRatePerSqft,
        totalGla,
        manualYearValues,
      }),
    [
      officeReservedSpaces,
      monthlyPassPrice,
      officePassOccupancy,
      retailAvailableSpaces,
      retailHourlyRate,
      retailAvgDailyHours,
      retailUtilization,
      operatingDays,
      camExpenses,
      grossRentByYear,
      propertyTaxPct,
      insurancePct,
      recoveryRate,
      advertisingRatePerSqft,
      totalGla,
      manualYearValues,
    ]
  );

  const persistSnapshot = useCallback(() => {
    const prev = getOperationalOfficeHoldSnapshot();
    const merged: OperationalOfficeHoldSnapshot = {
      ...defaultOperationalOfficeHoldSnapshot,
      ...prev,
      officeGlaSqft: prev?.officeGlaSqft ?? 0,
      retailGlaSqft: prev?.retailGlaSqft ?? 0,
      totalParkingSpaces,
      officeReservedSpaces,
      monthlyPassPrice,
      officePassOccupancy,
      retailHourlyRate,
      retailAvgDailyHours,
      retailAvailableSpaces,
      retailUtilization,
      parkingOperatingDays: operatingDays,
      camExpensesAed: camExpenses,
      propertyTaxPctOfGrossRent: propertyTaxPct,
      insurancePctOfGrossRent: insurancePct,
      propertyTaxAed: (grossRentByYear[0] ?? grossRentYear1) * (propertyTaxPct / 100),
      insuranceAed: (grossRentByYear[0] ?? grossRentYear1) * (insurancePct / 100),
      recoveryRate,
      advertisingRatePerSqft,
      parkingIncomeValues: tableData.rows.map((r) => r.parking),
      camRecoveryValues: tableData.rows.map((r) => r.recoveries),
      advertisingValues: tableData.rows.map((r) => r.advertising),
      otherIncomeTotalValues: tableData.rows.map((r) => r.total),
      otherIncomeSectionOverrides: prev?.otherIncomeSectionOverrides,
      otherIncomeManualYearValues: manualYearValues,
    };
    updateOfficeHoldSnapshot(merged, "operational");
  }, [
    totalParkingSpaces,
    officeReservedSpaces,
    monthlyPassPrice,
    officePassOccupancy,
    retailHourlyRate,
    retailAvgDailyHours,
    retailAvailableSpaces,
    retailUtilization,
    operatingDays,
    camExpenses,
    propertyTaxPct,
    insurancePct,
    recoveryRate,
    advertisingRatePerSqft,
    grossRentByYear,
    grossRentYear1,
    tableData.rows,
    manualYearValues,
    updateOfficeHoldSnapshot,
  ]);

  useEffect(() => {
    const timer = setTimeout(persistSnapshot, 300);
    return () => clearTimeout(timer);
  }, [persistSnapshot]);

  const setSectionOverride = (section: string, value: boolean) => {
    const prev = getOperationalOfficeHoldSnapshot();
    updateOfficeHoldSnapshot(
      {
        ...defaultOperationalOfficeHoldSnapshot,
        ...prev,
        officeGlaSqft: prev?.officeGlaSqft ?? 0,
        retailGlaSqft: prev?.retailGlaSqft ?? 0,
        otherIncomeSectionOverrides: {
          ...prev?.otherIncomeSectionOverrides,
          [section]: value,
        },
      },
      "operational"
    );
  };

  const handleFieldChange = (
    section: string,
    field: string,
    value: number
  ) => {
    const parkingSetters: Record<string, (v: number) => void> = {
      totalParkingSpaces: setTotalParkingSpaces,
      officeReservedSpaces: setOfficeReservedSpaces,
      monthlyPassPrice: setMonthlyPassPrice,
      officePassOccupancy: setOfficePassOccupancy,
      retailHourlyRate: setRetailHourlyRate,
      retailAvgDailyHours: setRetailAvgDailyHours,
      retailAvailableSpaces: setRetailAvailableSpaces,
      retailUtilization: setRetailUtilization,
      operatingDays: setOperatingDays,
    };
    const recoverySetters: Record<string, (v: number) => void> = {
      camExpenses: setCamExpenses,
      propertyTaxPct: setPropertyTaxPct,
      insurancePct: setInsurancePct,
      recoveryRate: setRecoveryRate,
    };
    const advertisingSetters: Record<string, (v: number) => void> = {
      advertisingRatePerSqft: setAdvertisingRatePerSqft,
    };

    const pctFields = new Set(["propertyTaxPct", "insurancePct"]);
    const rateFields = new Set(["advertisingRatePerSqft"]);
    const normalized = pctFields.has(field)
      ? roundPct2(value)
      : rateFields.has(field)
        ? roundRate2(value)
        : value;

    const map =
      section === "parking"
        ? parkingSetters
        : section === "recoveries"
          ? recoverySetters
          : advertisingSetters;

    if (map[field]) {
      map[field](normalized);
      setSectionOverride(section, true);
    }
  };

  const handleResetParking = () => {
    const b = incomeBenchmark;
    setTotalParkingSpaces(b.totalParkingSpaces);
    setOfficeReservedSpaces(b.officeReservedSpaces);
    setMonthlyPassPrice(b.monthlyPassPrice);
    setOfficePassOccupancy(b.officePassOccupancy);
    setRetailHourlyRate(b.retailHourlyRate);
    setRetailAvgDailyHours(b.retailAvgDailyHours);
    setRetailAvailableSpaces(
      Math.max(0, b.totalParkingSpaces - b.officeReservedSpaces)
    );
    setRetailUtilization(b.retailUtilization);
    setOperatingDays(b.operatingDays);
    setSectionOverride("parking", false);
    setManualYearValues((prev) => {
      const next = { ...prev };
      for (let y = 1; y <= OPERATIONAL_ROOM_REVENUE_YEARS; y++) {
        if (next[y]) {
          delete next[y].parking;
          if (Object.keys(next[y]).length === 0) delete next[y];
        }
      }
      return next;
    });
  };

  const handleResetRecoveries = () => {
    const d = defaultRecoveries;
    setCamExpenses(storeCam ?? d.camTotal);
    setPropertyTaxPct(storeTaxPct ?? d.propertyTaxPct);
    setInsurancePct(storeInsPct ?? d.insurancePct);
    setRecoveryRate(incomeBenchmark.recoveryRate);
    setSectionOverride("recoveries", false);
    setManualYearValues((prev) => {
      const next = { ...prev };
      for (let y = 1; y <= OPERATIONAL_ROOM_REVENUE_YEARS; y++) {
        if (next[y]) {
          delete next[y].recoveries;
          if (Object.keys(next[y]).length === 0) delete next[y];
        }
      }
      return next;
    });
  };

  const handleResetAdvertising = () => {
    setAdvertisingRatePerSqft(
      roundRate2(incomeBenchmark.advertisingRatePerSqft)
    );
    setSectionOverride("advertising", false);
    setManualYearValues((prev) => {
      const next = { ...prev };
      for (let y = 1; y <= OPERATIONAL_ROOM_REVENUE_YEARS; y++) {
        if (next[y]) {
          delete next[y].advertising;
          if (Object.keys(next[y]).length === 0) delete next[y];
        }
      }
      return next;
    });
  };

  const handleCellOverride = (year: number, stream: string, value: number) => {
    setManualYearValues((prev) => ({
      ...prev,
      [year]: { ...prev[year], [stream]: value },
    }));
  };

  const chartData = useMemo(
    () =>
      tableData.rows.map((row) => ({
        year: `Y${row.year}`,
        Parking: row.parking / 1_000_000,
        "CAM/Tax Recoveries": row.recoveries / 1_000_000,
        Advertising: row.advertising / 1_000_000,
      })),
    [tableData.rows]
  );

  const hasManualOverride =
    parkingSectionOverride ||
    recoveriesSectionOverride ||
    advertisingSectionOverride ||
    Object.keys(manualYearValues).length > 0;

  const parkingOverride = parkingSectionOverride;
  const recoveriesOverride = recoveriesSectionOverride;
  const advertisingOverride = advertisingSectionOverride;

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">Step 2 — Other Income</h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Parking (office passes + retail hourly), CAM/tax recoveries linked to
          Step 4 opex, and advertising/signage.{" "}
          <span className="text-amber-500">Amber borders</span> indicate manual
          overrides.
        </p>
      </div>

      <div className="mb-6 border-b border-slate-700 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-slate-500">BENCHMARK</span>
            <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
              <span className="text-xs text-slate-300">
                Office + Retail · {projectInfo.country || "UAE"} ·{" "}
                {(projectInfo.officeSegment || "prime_tower").replace(/_/g, " ")}
              </span>
            </div>
            {hasManualOverride && (
              <div className="rounded-full border border-amber-600/50 bg-amber-900/30 px-3 py-1">
                <span className="text-xs text-amber-400">Manual overrides</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={handleResetParking}
              className="text-emerald-400 transition hover:text-emerald-300"
            >
              Reset parking
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={handleResetRecoveries}
              className="text-emerald-400 transition hover:text-emerald-300"
            >
              Reset recoveries
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={handleResetAdvertising}
              className="text-emerald-400 transition hover:text-emerald-300"
            >
              Reset advertising
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Parking Income</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Total Parking Spaces
            </label>
            <input
              type="number"
              value={totalParkingSpaces}
              onChange={(e) =>
                handleFieldChange(
                  "parking",
                  "totalParkingSpaces",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(parkingOverride)}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Includes office &amp; retail
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Spaces Reserved for Office Tenants
            </label>
            <input
              type="number"
              value={officeReservedSpaces}
              onChange={(e) =>
                handleFieldChange(
                  "parking",
                  "officeReservedSpaces",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(parkingOverride)}
            />
            <p className="mt-1 text-[10px] text-slate-500">Monthly passes</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Monthly Pass Price per Space ({currencyCode})
            </label>
            <input
              type="number"
              value={monthlyPassPrice}
              onChange={(e) =>
                handleFieldChange(
                  "parking",
                  "monthlyPassPrice",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(parkingOverride)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Office Pass Occupancy (%)
            </label>
            <input
              type="number"
              value={officePassOccupancy}
              onChange={(e) =>
                handleFieldChange(
                  "parking",
                  "officePassOccupancy",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(parkingOverride)}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              % of reserved spaces leased
            </p>
          </div>

          <div className="col-span-full mt-2 border-t border-slate-700 pt-4">
            <p className="mb-3 text-xs font-medium text-slate-300">
              Retail Parking (Hourly)
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Retail Hourly Rate ({currencyCode}/hour)
            </label>
            <input
              type="number"
              step="0.5"
              value={retailHourlyRate}
              onChange={(e) =>
                handleFieldChange(
                  "parking",
                  "retailHourlyRate",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(parkingOverride)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Retail Avg Daily Hours Utilized per Space
            </label>
            <input
              type="number"
              step="0.5"
              value={retailAvgDailyHours}
              onChange={(e) =>
                handleFieldChange(
                  "parking",
                  "retailAvgDailyHours",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(parkingOverride)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Retail Spaces Available for Shoppers
            </label>
            <input
              type="number"
              value={retailAvailableSpaces}
              onChange={(e) =>
                handleFieldChange(
                  "parking",
                  "retailAvailableSpaces",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(parkingOverride)}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Typically total − office reserved ({Math.max(0, totalParkingSpaces - officeReservedSpaces)})
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Retail Utilization (%)
            </label>
            <input
              type="number"
              value={retailUtilization}
              onChange={(e) =>
                handleFieldChange(
                  "parking",
                  "retailUtilization",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(parkingOverride)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Operating Days per Year
            </label>
            <input
              type="number"
              value={operatingDays}
              onChange={(e) =>
                handleFieldChange(
                  "parking",
                  "operatingDays",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(parkingOverride)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          CAM &amp; Tax Recoveries (Linked to Step 4)
        </h3>
        {opexLocked ? (
          <p className="mb-4 text-xs text-slate-500">
            CAM, property tax, and insurance sync from Step 4 opex. Adjust recovery
            rate below.
          </p>
        ) : (
          <p className="mb-4 text-xs text-slate-500">
            Complete Step 4 to lock expense totals from opex, or edit benchmark
            defaults below.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              CAM Expenses ({currencyCode}) – from Step 4
            </label>
            <input
              type="number"
              value={camExpenses}
              readOnly={opexLocked}
              onChange={(e) =>
                handleFieldChange(
                  "recoveries",
                  "camExpenses",
                  Number(e.target.value) || 0
                )
              }
              className={
                opexLocked
                  ? readOnlyFieldClass()
                  : overrideFieldClass(recoveriesOverride)
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Property Tax (% of Gross Rental Revenue)
            </label>
            <input
              type="number"
              step={0.01}
              min={0}
              max={100}
              placeholder="e.g., 5"
              value={propertyTaxPct}
              readOnly={opexLocked}
              onChange={(e) =>
                handleFieldChange(
                  "recoveries",
                  "propertyTaxPct",
                  Number(e.target.value) || 0
                )
              }
              className={
                opexLocked
                  ? readOnlyFieldClass()
                  : overrideFieldClass(recoveriesOverride)
              }
            />
            <p className="mt-1 text-sm text-slate-500">
              Applied to Step 1 base rent revenue each year
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Insurance (% of Gross Rental Revenue)
            </label>
            <input
              type="number"
              step={0.01}
              min={0}
              max={100}
              placeholder="e.g., 1.5"
              value={insurancePct}
              readOnly={opexLocked}
              onChange={(e) =>
                handleFieldChange(
                  "recoveries",
                  "insurancePct",
                  Number(e.target.value) || 0
                )
              }
              className={
                opexLocked
                  ? readOnlyFieldClass()
                  : overrideFieldClass(recoveriesOverride)
              }
            />
            <p className="mt-1 text-sm text-slate-500">
              Applied to Step 1 base rent revenue each year
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Recovery Rate (%)
            </label>
            <input
              type="number"
              value={recoveryRate}
              onChange={(e) =>
                handleFieldChange(
                  "recoveries",
                  "recoveryRate",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(recoveriesOverride)}
            />
            <p className="mt-1 text-[10px] text-slate-500">% billed to tenants</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Advertising / Signage
        </h3>
        <div className="grid max-w-md grid-cols-1 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Advertising/Signage Rate ({currencyCode} per sqft GLA/year)
            </label>
            <input
              type="number"
              step={0.01}
              min={0}
              placeholder="e.g., 50"
              value={advertisingRatePerSqft}
              onChange={(e) =>
                handleFieldChange(
                  "advertising",
                  "advertisingRatePerSqft",
                  Number(e.target.value) || 0
                )
              }
              className={overrideFieldClass(advertisingOverride)}
            />
            <p className="mt-1 text-sm text-slate-500">
              Annual income = Rate × Total GLA ({totalGla.toLocaleString()} sqft)
            </p>
          </div>
        </div>
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
                <th className="px-4 py-3">Parking Income ({currencyCode} M)</th>
                <th className="px-4 py-3">
                  CAM/Tax Recoveries ({currencyCode} M)
                </th>
                <th className="px-4 py-3">Advertising ({currencyCode} M)</th>
                <th className="px-4 py-3 text-right">
                  Total Other Income ({currencyCode} M)
                </th>
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
                  {(["parking", "recoveries", "advertising"] as const).map(
                    (stream) => (
                      <td key={stream} className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={(row[stream] / 1_000_000).toFixed(2)}
                          onChange={(e) =>
                            handleCellOverride(
                              row.year,
                              stream,
                              (parseFloat(e.target.value) || 0) * 1_000_000
                            )
                          }
                          className={`w-24 rounded bg-slate-800 p-1 text-right ${
                            manualYearValues[row.year]?.[stream]
                              ? "border border-amber-500"
                              : "border border-transparent"
                          }`}
                        />
                      </td>
                    )
                  )}
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                    {(row.total / 1_000_000).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800 font-bold text-white">
                <td className="px-4 py-3">10-Year Total</td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {(tableData.totals.parking / 1_000_000).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {(tableData.totals.recoveries / 1_000_000).toFixed(2)}
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
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
                />
                <Bar dataKey="Parking" stackId="a" fill="#10b981" />
                <Bar dataKey="CAM/Tax Recoveries" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Advertising" stackId="a" fill="#f59e0b" />
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
