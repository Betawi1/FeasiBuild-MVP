import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import {
  computeOperationalHotelHoldPnl,
  type OperationalPnlComputed,
} from "@/lib/operational-pnl";
import type { OperationalHotelHoldSnapshot } from "@/lib/operational-pnl";
import type {
  FeasibilityProjectBundle,
  OperationalPnLData,
} from "@/types/feasibility";

function sumByYear(...series: number[][]): number[] {
  const len = Math.max(...series.map((s) => s.length), 0);
  return Array.from({ length: len }, (_, i) =>
    series.reduce((acc, s) => acc + (s[i] ?? 0), 0)
  );
}

function toThousandsSeries(values: number[]): number[] {
  return values.map((v) => Math.round(v / 1000));
}

function emptyYears(): string[] {
  return Array.from(
    { length: OPERATIONAL_ROOM_REVENUE_YEARS },
    (_, i) => `Year ${i + 1}`
  );
}

function emptySeries(): number[] {
  return Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(0);
}

function displayAssetType(assetType: string): string {
  const t = assetType.toLowerCase();
  if (t.includes("retail") || t.includes("mall")) return "Shopping Mall";
  if (t.includes("office")) return "Office";
  if (t.includes("residential") || t.includes("btr")) return "Residential BTR";
  if (t.includes("hotel")) return "Hotel";
  return assetType;
}

function mapPnlToSlideData(
  pnl: OperationalPnlComputed,
  currency: string,
  assetType: string
): OperationalPnLData {
  const rev = pnl.revenueByStream;
  const dc = pnl.directCostsByYear;

  const roomRevenues = rev.rooms;
  const fAndBRevenues = sumByYear(rev.food, rev.beverage, rev.roomService);
  const otherRevenues = sumByYear(rev.telecom, rev.spaHealth, rev.rentalOther);

  const roomsDepartment = sumByYear(dc.roomsPayroll, dc.roomsOther);
  const fAndBDepartment = sumByYear(
    dc.foodCostOfSale,
    dc.beverageCostOfSale,
    dc.fbPayroll,
    dc.fbOther
  );
  const otherDepartments = sumByYear(
    dc.telecomCost,
    dc.healthLeisureCost,
    dc.otherDeptsCost
  );

  const managementFees = sumByYear(pnl.baseManagementFee, pnl.incentiveFee);
  const totalUndistributedExpenses = sumByYear(
    pnl.ga,
    pnl.marketingSales,
    pnl.propertyOpsMaintenance,
    pnl.utilities,
    managementFees,
    pnl.renovationProvision
  );

  return {
    title: "Financial Analysis",
    subtitle: "Operational Profit & Loss",
    currency,
    assetType: displayAssetType(assetType),
    years: emptyYears(),
    revenues: {
      roomRevenues: toThousandsSeries(roomRevenues),
      fAndBRevenues: toThousandsSeries(fAndBRevenues),
      otherRevenues: toThousandsSeries(otherRevenues),
      totalGrossRevenues: toThousandsSeries(pnl.totalHotelRevenue),
    },
    directCosts: {
      roomsDepartment: toThousandsSeries(roomsDepartment),
      fAndBDepartment: toThousandsSeries(fAndBDepartment),
      otherDepartments: toThousandsSeries(otherDepartments),
      totalDirectCosts: toThousandsSeries(pnl.totalDirectCosts),
    },
    undistributedExpenses: {
      gAndA: toThousandsSeries(pnl.ga),
      marketingAndSales: toThousandsSeries(pnl.marketingSales),
      propertyOpsAndMaintenance: toThousandsSeries(pnl.propertyOpsMaintenance),
      utilities: toThousandsSeries(pnl.utilities),
      managementFees: toThousandsSeries(managementFees),
      totalUndistributedExpenses: toThousandsSeries(totalUndistributedExpenses),
    },
    ebitda: toThousandsSeries(pnl.ebitda),
    depreciation: toThousandsSeries(pnl.depreciationTotal),
    ebit: toThousandsSeries(pnl.ebit),
    netIncome: toThousandsSeries(pnl.netIncome),
  };
}

function emptyPnlData(currency: string, assetType: string): OperationalPnLData {
  const z = emptySeries();
  return {
    title: "Financial Analysis",
    subtitle: "Operational Profit & Loss",
    currency,
    assetType: displayAssetType(assetType),
    years: emptyYears(),
    revenues: {
      roomRevenues: [...z],
      fAndBRevenues: [...z],
      otherRevenues: [...z],
      totalGrossRevenues: [...z],
    },
    directCosts: {
      roomsDepartment: [...z],
      fAndBDepartment: [...z],
      otherDepartments: [...z],
      totalDirectCosts: [...z],
    },
    undistributedExpenses: {
      gAndA: [...z],
      marketingAndSales: [...z],
      propertyOpsAndMaintenance: [...z],
      utilities: [...z],
      managementFees: [...z],
      totalUndistributedExpenses: [...z],
    },
    ebitda: [...z],
    depreciation: [...z],
    ebit: [...z],
    netIncome: [...z],
  };
}

export function buildOperationalPnlData(
  bundle: FeasibilityProjectBundle,
  hotelHoldSnapshot?: OperationalHotelHoldSnapshot | null,
  constructionCost = 0,
  ffeCost = 0
): OperationalPnLData {
  const currency = bundle.currency;
  const assetType = bundle.assetType;
  if (!hotelHoldSnapshot) {
    return emptyPnlData(currency, assetType);
  }

  const pnl = computeOperationalHotelHoldPnl(
    hotelHoldSnapshot,
    constructionCost,
    ffeCost
  );
  return mapPnlToSlideData(pnl, currency, assetType);
}

export function buildOperationalPnlFromBundle(
  bundle: FeasibilityProjectBundle
): OperationalPnLData {
  const rev = bundle.aggregate.revenueByYear ?? [];
  const ebitda = bundle.aggregate.ebitdaByYear ?? [];
  const netIncome = bundle.aggregate.netIncomeByYear ?? [];
  const z = emptySeries();

  if (!rev.length) {
    return emptyPnlData(bundle.currency, bundle.assetType);
  }

  const toK = (arr: number[]) => arr.map((v) => Math.round(v / 1000));

  return {
    title: "Financial Analysis",
    subtitle: "Operational Profit & Loss",
    currency: bundle.currency,
    assetType: displayAssetType(bundle.assetType),
    years: emptyYears(),
    revenues: {
      roomRevenues: toK(rev),
      fAndBRevenues: [...z],
      otherRevenues: [...z],
      totalGrossRevenues: toK(rev),
    },
    directCosts: {
      roomsDepartment: [...z],
      fAndBDepartment: [...z],
      otherDepartments: [...z],
      totalDirectCosts: [...z],
    },
    undistributedExpenses: {
      gAndA: [...z],
      marketingAndSales: [...z],
      propertyOpsAndMaintenance: [...z],
      utilities: [...z],
      managementFees: [...z],
      totalUndistributedExpenses: [...z],
    },
    ebitda: toK(ebitda.length ? ebitda : z),
    depreciation: [...z],
    ebit: toK(netIncome.length ? netIncome : z),
    netIncome: toK(netIncome.length ? netIncome : z),
  };
}

export function isOperationalPnLData(data: unknown): data is OperationalPnLData {
  return (
    !!data &&
    typeof data === "object" &&
    "revenues" in data &&
    "ebitda" in data
  );
}
