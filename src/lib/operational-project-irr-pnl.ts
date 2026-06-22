import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import {
  computeOperationalHotelHoldPnl,
  type OperationalHotelHoldSnapshot,
  type OperationalOfficeHoldSnapshot,
  type OperationalResidentialHoldSnapshot,
  type OperationalRetailHoldSnapshot,
} from "@/lib/operational-pnl";
import type {
  OfficeDepreciationConfig,
  OfficeOpexConfig,
  ResidentialDepreciationConfig,
  ResidentialOpexConfig,
  RetailDepreciationConfig,
  RetailOpexConfig,
} from "@/store/useFinModelStore";

const YEARS = OPERATIONAL_ROOM_REVENUE_YEARS;

export type OperationalProjectIrrPnl = {
  totalRevenue: number[];
  totalExpenses: number[];
  netIncome: number[];
  depreciationTotal: number[];
  changeInWorkingCapital: number[];
  arMonths: number;
  apMonths: number;
  ffeRenovationPctYear6: number;
};

function yearValues(source: number[] | undefined): number[] {
  return Array.from({ length: YEARS }, (_, i) => source?.[i] ?? 0);
}

function hasYearlySeries(values: number[] | undefined): boolean {
  return (values?.length ?? 0) > 0 && values!.some((v) => v !== 0);
}

function hasFullProjection<T>(rows: T[] | undefined): rows is T[] {
  return (rows?.length ?? 0) >= YEARS;
}

/** Δ net working capital from year-end net WC levels (matches depreciation step). */
function wcChangeFromNetWcLevels(netWc: number[]): number[] {
  const levels = yearValues(netWc);
  return levels.map((w, i) => w - (i > 0 ? levels[i - 1]! : 0));
}

function wcChangeFromDepProjection(
  projection: Array<{ netWc: number }> | undefined
): number[] | undefined {
  if (!hasFullProjection(projection)) return undefined;
  return wcChangeFromNetWcLevels(projection.map((r) => r.netWc));
}

function workingCapitalChangeSeries(
  totalRevenue: number[],
  totalExpenses: number[],
  arMonths: number,
  apMonths: number,
  options?: {
    wcChangeFromSnapshot?: number[];
    depProjection?: Array<{ netWc: number }>;
    wcNetLevels?: number[];
  }
): number[] {
  const fromDep = wcChangeFromDepProjection(options?.depProjection);
  if (fromDep) return fromDep;

  if (options?.wcChangeFromSnapshot?.length) {
    return yearValues(options.wcChangeFromSnapshot);
  }

  if (options?.wcNetLevels?.length) {
    return wcChangeFromNetWcLevels(options.wcNetLevels);
  }

  const nwcLevels = totalRevenue.map(
    (rev, i) => (arMonths / 12) * rev - (apMonths / 12) * (totalExpenses[i] ?? 0)
  );
  return nwcLevels.map((w, i) => w - (i > 0 ? nwcLevels[i - 1]! : 0));
}

function buildNetIncome(
  totalRevenue: number[],
  totalExpenses: number[],
  depreciationTotal: number[]
): number[] {
  return totalRevenue.map(
    (rev, i) => rev - (totalExpenses[i] ?? 0) - (depreciationTotal[i] ?? 0)
  );
}

export function computeHotelProjectIrrPnl(
  snapshot: OperationalHotelHoldSnapshot | undefined,
  constructionCost: number,
  ffeCost: number
): OperationalProjectIrrPnl | null {
  if (!snapshot) return null;
  const pnl = computeOperationalHotelHoldPnl(
    snapshot,
    constructionCost,
    ffeCost
  );
  const dep = snapshot.depFieldValues ?? {};
  const arMonths = Number(dep.accountsReceivableMonths) || 0;
  const apMonths = Number(dep.accountsPayableMonths) || 0;
  const totalRevenue = yearValues(pnl.totalHotelRevenue);
  const totalExpenses = yearValues(pnl.totalExpenses);
  return {
    totalRevenue,
    totalExpenses,
    netIncome: yearValues(pnl.netIncome),
    depreciationTotal: yearValues(pnl.depreciationTotal),
    changeInWorkingCapital: workingCapitalChangeSeries(
      totalRevenue,
      totalExpenses,
      arMonths,
      apMonths
    ),
    arMonths,
    apMonths,
    ffeRenovationPctYear6: Number(dep.ffeRenovationRate) || 50,
  };
}

export function computeRetailProjectIrrPnl(
  snap: OperationalRetailHoldSnapshot | undefined,
  retailOpex: RetailOpexConfig | undefined,
  retailDepreciation: RetailDepreciationConfig | undefined
): OperationalProjectIrrPnl | null {
  if (!snap?.revenueValues?.length) return null;

  const baseRent = yearValues(snap.revenueValues);
  const percentageRent = yearValues(snap.percentageRentValues);
  const recoveries = yearValues(snap.camRecoveryValues);
  const parking = yearValues(snap.parkingRevenueValues);
  const advertising = yearValues(snap.advertisingValues);
  const totalRevenue = baseRent.map(
    (v, i) =>
      v + percentageRent[i] + recoveries[i] + parking[i] + advertising[i]
  );

  const totalExpenses = hasYearlySeries(snap.opexTotalValues)
    ? yearValues(snap.opexTotalValues)
    : hasFullProjection(retailOpex?.projection)
      ? retailOpex.projection.map((r) => r.total)
      : yearValues(
          Array.from({ length: YEARS }, (_, i) =>
            (snap.opexCamValues?.[i] ?? 0) +
            (snap.opexPropertyTaxValues?.[i] ?? 0) +
            (snap.opexInsuranceValues?.[i] ?? 0) +
            (snap.opexMarketingValues?.[i] ?? 0) +
            (snap.opexGaValues?.[i] ?? 0) +
            (snap.opexMgmtFeeValues?.[i] ?? 0) +
            (snap.opexRenovationValues?.[i] ?? 0)
          )
        );

  const depreciationTotal = hasYearlySeries(snap.depTotalValues)
    ? yearValues(snap.depTotalValues)
    : hasFullProjection(retailDepreciation?.projection)
      ? retailDepreciation.projection.map((r) => r.totalDep)
      : yearValues(
          Array.from({ length: YEARS }, (_, i) =>
            (snap.depConstructionValues?.[i] ?? 0) +
            (snap.depFfeValues?.[i] ?? 0) +
            (snap.depTiValues?.[i] ?? 0) +
            (snap.depLeasingCommValues?.[i] ?? 0)
          )
        );

  const netIncome = buildNetIncome(
    totalRevenue,
    totalExpenses,
    depreciationTotal
  );

  const arMonths = snap.arMonths ?? retailDepreciation?.arMonths ?? 1;
  const apMonths = snap.apMonths ?? retailDepreciation?.apMonths ?? 1;

  return {
    totalRevenue,
    totalExpenses,
    netIncome,
    depreciationTotal,
    changeInWorkingCapital: workingCapitalChangeSeries(
      totalRevenue,
      totalExpenses,
      arMonths,
      apMonths,
      {
        depProjection: retailDepreciation?.projection,
        wcNetLevels: snap.wcNetValues,
      }
    ),
    arMonths,
    apMonths,
    ffeRenovationPctYear6:
      snap.ffeRenovationPctYear6 ??
      retailDepreciation?.ffeRenovationPctYear6 ??
      40,
  };
}

export function computeOfficeProjectIrrPnl(
  snap: OperationalOfficeHoldSnapshot | undefined,
  officeOpex: OfficeOpexConfig | undefined,
  officeDepreciation: OfficeDepreciationConfig | undefined
): OperationalProjectIrrPnl | null {
  if (!snap?.totalBaseRentValues?.length && !snap?.officeRentValues?.length) {
    return null;
  }

  const officeRent = yearValues(snap.officeRentValues);
  const retailMinRent = yearValues(snap.retailMinRentValues);
  const recoveries = yearValues(snap.camRecoveryValues);
  const parking = yearValues(snap.parkingIncomeValues);
  const advertising = yearValues(snap.advertisingValues);
  const totalRevenue = officeRent.map(
    (v, i) =>
      v + retailMinRent[i] + recoveries[i] + parking[i] + advertising[i]
  );

  const totalExpenses = hasYearlySeries(snap.opexTotalValues)
    ? yearValues(snap.opexTotalValues)
    : hasFullProjection(officeOpex?.projection)
      ? officeOpex.projection.map((r) => r.total)
      : yearValues(
          Array.from({ length: YEARS }, (_, i) =>
            (snap.opexCamValues?.[i] ?? 0) +
            (snap.opexPropertyTaxValues?.[i] ?? 0) +
            (snap.opexInsuranceValues?.[i] ?? 0) +
            (snap.opexMarketingValues?.[i] ?? 0) +
            (snap.opexGaValues?.[i] ?? 0) +
            (snap.opexMgmtFeeValues?.[i] ?? 0) +
            (snap.opexRenovationValues?.[i] ?? 0)
          )
        );

  const depreciationTotal = hasYearlySeries(snap.depTotalValues)
    ? yearValues(snap.depTotalValues)
    : hasFullProjection(officeDepreciation?.projection)
      ? officeDepreciation.projection.map((r) => r.totalDep)
      : yearValues(
          Array.from({ length: YEARS }, (_, i) =>
            (snap.depConstructionValues?.[i] ?? 0) +
            (snap.depFfeValues?.[i] ?? 0) +
            (snap.depOfficeTiValues?.[i] ?? 0) +
            (snap.depRetailTiValues?.[i] ?? 0) +
            (snap.depOfficeLeasingCommValues?.[i] ?? 0) +
            (snap.depRetailLeasingCommValues?.[i] ?? 0)
          )
        );

  const netIncome = buildNetIncome(
    totalRevenue,
    totalExpenses,
    depreciationTotal
  );

  const arMonths =
    snap.arMonths ?? officeDepreciation?.workingCapital?.arMonths ?? 1;
  const apMonths =
    snap.apMonths ?? officeDepreciation?.workingCapital?.apMonths ?? 1;

  return {
    totalRevenue,
    totalExpenses,
    netIncome,
    depreciationTotal,
    changeInWorkingCapital: workingCapitalChangeSeries(
      totalRevenue,
      totalExpenses,
      arMonths,
      apMonths,
      {
        depProjection: officeDepreciation?.projection,
        wcNetLevels: snap.wcNetValues,
      }
    ),
    arMonths,
    apMonths,
    ffeRenovationPctYear6:
      snap.ffeRenovationPctYear6 ??
      officeDepreciation?.ffeRenovationPctYear6 ??
      40,
  };
}

export function computeResidentialProjectIrrPnl(
  snap: OperationalResidentialHoldSnapshot | undefined,
  residentialOpex: ResidentialOpexConfig | undefined,
  residentialDepreciation: ResidentialDepreciationConfig | undefined
): OperationalProjectIrrPnl | null {
  if (
    !snap?.residentialRentValues?.length &&
    !snap?.totalBaseRentValues?.length
  ) {
    return null;
  }

  const residentialRent = yearValues(snap.residentialRentValues);
  const retailMinRent = yearValues(snap.retailMinRentValues);
  const parking = yearValues(snap.parkingIncomeValues);
  const amenity = yearValues(snap.amenityIncomeValues);
  const utility = yearValues(snap.utilityIncomeValues);
  const other = yearValues(snap.otherFeesIncomeValues);
  const totalRevenue = residentialRent.map(
    (v, i) =>
      v + retailMinRent[i] + parking[i] + amenity[i] + utility[i] + other[i]
  );

  const totalExpenses = hasYearlySeries(snap.opexTotalValues)
    ? yearValues(snap.opexTotalValues)
    : hasFullProjection(residentialOpex?.projection)
      ? residentialOpex.projection.map((r) => r.total)
      : yearValues(snap.opexTotalValues);

  const depreciationTotal = hasYearlySeries(snap.depTotalValues)
    ? yearValues(snap.depTotalValues)
    : hasFullProjection(residentialDepreciation?.projection)
      ? residentialDepreciation.projection.map((r) => r.totalDep)
      : yearValues(
          Array.from({ length: YEARS }, (_, i) =>
            (snap.depConstructionValues?.[i] ?? 0) +
            (snap.depFfeValues?.[i] ?? 0)
          )
        );

  const netIncome = buildNetIncome(
    totalRevenue,
    totalExpenses,
    depreciationTotal
  );

  const arMonths =
    snap.arMonths ?? residentialDepreciation?.workingCapital?.arMonths ?? 1;
  const apMonths =
    snap.apMonths ?? residentialDepreciation?.workingCapital?.apMonths ?? 1;

  return {
    totalRevenue,
    totalExpenses,
    netIncome,
    depreciationTotal,
    changeInWorkingCapital: workingCapitalChangeSeries(
      totalRevenue,
      totalExpenses,
      arMonths,
      apMonths,
      {
        depProjection: residentialDepreciation?.projection,
        wcChangeFromSnapshot: snap.wcChangeValues,
        wcNetLevels: snap.wcNetValues,
      }
    ),
    arMonths,
    apMonths,
    ffeRenovationPctYear6:
      snap.ffeRenovationPctYear6 ??
      residentialDepreciation?.usefulLives?.ffeRenovationPctYear6 ??
      40,
  };
}

export type BuildingTypeForProjectIrr =
  | "hotel"
  | "retail"
  | "office"
  | "residential"
  | string
  | undefined;

export function computeOperationalProjectIrrPnl(
  buildingType: BuildingTypeForProjectIrr,
  ctx: {
    hotelSnapshot?: OperationalHotelHoldSnapshot;
    retailSnapshot?: OperationalRetailHoldSnapshot;
    officeSnapshot?: OperationalOfficeHoldSnapshot;
    residentialSnapshot?: OperationalResidentialHoldSnapshot;
    retailOpex?: RetailOpexConfig;
    retailDepreciation?: RetailDepreciationConfig;
    officeOpex?: OfficeOpexConfig;
    officeDepreciation?: OfficeDepreciationConfig;
    residentialOpex?: ResidentialOpexConfig;
    residentialDepreciation?: ResidentialDepreciationConfig;
    constructionCost: number;
    ffe: number;
  }
): OperationalProjectIrrPnl | null {
  switch (buildingType) {
    case "hotel":
      return computeHotelProjectIrrPnl(
        ctx.hotelSnapshot,
        ctx.constructionCost,
        ctx.ffe
      );
    case "retail":
      return computeRetailProjectIrrPnl(
        ctx.retailSnapshot,
        ctx.retailOpex,
        ctx.retailDepreciation
      );
    case "office":
      return computeOfficeProjectIrrPnl(
        ctx.officeSnapshot,
        ctx.officeOpex,
        ctx.officeDepreciation
      );
    case "residential":
      return computeResidentialProjectIrrPnl(
        ctx.residentialSnapshot,
        ctx.residentialOpex,
        ctx.residentialDepreciation
      );
    default:
      return null;
  }
}

export const OPERATIONAL_ASSET_LABELS: Record<string, string> = {
  hotel: "Hotel",
  retail: "Retail",
  office: "Office",
  residential: "Residential",
};

/** Spreadsheet Y4–Y13 columns (prepend Y1–Y3 development slots). */
function shiftOperationalPnlToSpreadsheetYears(data: number[]): number[] {
  return [0, 0, 0, ...data.slice(0, 10)];
}

/**
 * Total "= Net Cash Flow from Operating Activities" on `/operational/preview/project-irr`
 * (sum of operating-year columns Y4–Y13: net income + depreciation − Δ working capital).
 */
export function computeOperatingTotalNetCashFlows(
  pnl: OperationalProjectIrrPnl | null | undefined
): number {
  if (!pnl) return 0;

  const pad = (vals: number[]) => yearValues(vals);
  const netIncomeShifted = shiftOperationalPnlToSpreadsheetYears(pad(pnl.netIncome));
  const depreciationShifted = shiftOperationalPnlToSpreadsheetYears(
    pad(pnl.depreciationTotal)
  );
  const changeInWCShifted = shiftOperationalPnlToSpreadsheetYears(
    pad(pnl.changeInWorkingCapital)
  );

  const sumOperatingYears = (arr: number[]) =>
    arr.slice(3).reduce((a, b) => a + b, 0);

  return (
    sumOperatingYears(netIncomeShifted) +
    sumOperatingYears(depreciationShifted) -
    sumOperatingYears(changeInWCShifted)
  );
}
