import {
  incentiveFeeFromCircularEbitda,
  type HotelExpensePctKey,
} from "@/config/hotel-expense-profiles";
import {
  annualConstructionDepreciation,
  annualFfeDepreciation,
  type HotelDepreciationFieldKey,
} from "@/config/hotel-depreciation-profiles";
import {
  HOTEL_REVENUE_PCT_KEYS,
  HOTEL_REVENUE_PROFILES,
  pctsFromRevenueProfile,
  type HotelRevenuePctKey,
} from "@/config/hotel-revenue-profiles";
import {
  HOTEL_DIRECT_COST_PROFILES,
  pctsFromDirectCostProfile,
  type HotelDirectCostPctKey,
} from "@/config/hotel-direct-cost-profiles";
import {
  HOTEL_EXPENSE_PROFILES,
  pctsFromExpenseProfile,
} from "@/config/hotel-expense-profiles";
import {
  HOTEL_DEPRECIATION_PROFILES,
  valuesFromDepreciationProfile,
} from "@/config/hotel-depreciation-profiles";
import {
  computeRoomRevenueSeries,
  OPERATIONAL_ROOM_REVENUE_YEARS,
} from "@/lib/operational-cash-inflows-chart";

/** Persisted wizard inputs for operational hotel hold (Steps 1–5). */
export type OperationalHotelHoldSnapshot = {
  numberOfRooms: number;
  adrValues: number[];
  occupancyValues: number[];
  revPcts: Record<string, number>;
  directCostPcts: Record<string, number>;
  expensePcts: Record<string, number>;
  depFieldValues: Record<string, number>;
};

export type OperationalPnlComputed = {
  revenueByStream: {
    rooms: number[];
    food: number[];
    beverage: number[];
    roomService: number[];
    telecom: number[];
    spaHealth: number[];
    rentalOther: number[];
  };
  totalHotelRevenue: number[];
  directCostsByYear: {
    roomsPayroll: number[];
    roomsOther: number[];
    foodCostOfSale: number[];
    beverageCostOfSale: number[];
    fbPayroll: number[];
    fbOther: number[];
    telecomCost: number[];
    healthLeisureCost: number[];
    otherDeptsCost: number[];
  };
  totalDirectCosts: number[];
  ga: number[];
  marketingSales: number[];
  propertyOpsMaintenance: number[];
  utilities: number[];
  baseManagementFee: number[];
  incentiveFee: number[];
  renovationProvision: number[];
  undistributedFour: number[];
  fixedThree: number[];
  totalExpenses: number[];
  ebitda: number[];
  depreciationConstruction: number[];
  depreciationFfe: number[];
  depreciationTotal: number[];
  ebit: number[];
  netIncome: number[];
};

function coerceRevPcts(r: Record<string, number>): Record<HotelRevenuePctKey, number> {
  return {
    ...pctsFromRevenueProfile(HOTEL_REVENUE_PROFILES.default),
    ...r,
  } as Record<HotelRevenuePctKey, number>;
}

function coerceDirectPcts(
  r: Record<string, number>
): Record<HotelDirectCostPctKey, number> {
  return {
    ...pctsFromDirectCostProfile(HOTEL_DIRECT_COST_PROFILES.default),
    ...r,
  } as Record<HotelDirectCostPctKey, number>;
}

function coerceExpensePcts(r: Record<string, number>): Record<HotelExpensePctKey, number> {
  return {
    ...pctsFromExpenseProfile(HOTEL_EXPENSE_PROFILES.default),
    ...r,
  } as Record<HotelExpensePctKey, number>;
}

function coerceDepFields(
  r: Record<string, number>
): Record<HotelDepreciationFieldKey, number> {
  return {
    ...valuesFromDepreciationProfile(HOTEL_DEPRECIATION_PROFILES.default),
    ...r,
  } as Record<HotelDepreciationFieldKey, number>;
}

function buildDirectCostAmounts(
  revenueRow: Record<string, number>,
  p: Record<HotelDirectCostPctKey, number>
): {
  roomsPayroll: number;
  roomsOther: number;
  foodCostOfSale: number;
  beverageCostOfSale: number;
  fbPayroll: number;
  fbOther: number;
  telecomCost: number;
  healthLeisureCost: number;
  otherDeptsCost: number;
  totalDirect: number;
} {
  const roomRev = Number(revenueRow.rooms) || 0;
  const foodRev = Number(revenueRow.food) || 0;
  const beverageRev = Number(revenueRow.beverage) || 0;
  const roomServiceRev = Number(revenueRow.roomService) || 0;
  const telecomRev = Number(revenueRow.telecom) || 0;
  const spaRev = Number(revenueRow.spaHealth) || 0;
  const rentalOtherRev = Number(revenueRow.rentalOther) || 0;
  const fbTotal = foodRev + beverageRev + roomServiceRev;

  const roomsPayroll = roomRev * (p.roomsPayroll / 100);
  const roomsOther = roomRev * (p.roomsOther / 100);
  const foodCostOfSale = foodRev * (p.foodCostOfSale / 100);
  const beverageCostOfSale = beverageRev * (p.beverageCostOfSale / 100);
  const fbPayroll = fbTotal * (p.fbPayroll / 100);
  const fbOther = fbTotal * (p.fbOther / 100);
  const telecomCost = telecomRev * (p.telecomCost / 100);
  const healthLeisureCost = spaRev * (p.healthLeisureCost / 100);
  const otherDeptsCost = rentalOtherRev * (p.otherDeptsCost / 100);

  const totalDirect =
    roomsPayroll +
    roomsOther +
    foodCostOfSale +
    beverageCostOfSale +
    fbPayroll +
    fbOther +
    telecomCost +
    healthLeisureCost +
    otherDeptsCost;

  return {
    roomsPayroll,
    roomsOther,
    foodCostOfSale,
    beverageCostOfSale,
    fbPayroll,
    fbOther,
    telecomCost,
    healthLeisureCost,
    otherDeptsCost,
    totalDirect,
  };
}

function expenseLinesForYear(
  yearIndex: number,
  totalRev: number,
  roomRev: number,
  directTotal: number,
  p: Record<HotelExpensePctKey, number>
): {
  ga: number;
  marketingSales: number;
  propertyOpsMaintenance: number;
  utilities: number;
  baseManagementFee: number;
  incentiveFee: number;
  renovationProvision: number;
  undistributedFour: number;
  fixedThree: number;
  total: number;
} {
  const ga = totalRev * (p.gaExpenses / 100);
  const marketingSales = totalRev * (p.marketingSales / 100);
  const propertyOpsMaintenance = totalRev * (p.propertyOpsMaintenance / 100);
  const utilities = totalRev * (p.utilities / 100);
  const undistributedFour = ga + marketingSales + propertyOpsMaintenance + utilities;

  const baseManagementFee = roomRev * (p.baseManagementFee / 100);
  const renoPct =
    yearIndex === 0
      ? p.renovationProvisionY1
      : yearIndex === 1
        ? p.renovationProvisionY2
        : p.renovationProvisionY3to10;
  const renovationProvision = totalRev * (renoPct / 100);

  const ebitdaBeforeIncentive =
    totalRev - directTotal - undistributedFour - baseManagementFee - renovationProvision;
  const incentiveFee = incentiveFeeFromCircularEbitda(
    ebitdaBeforeIncentive,
    p.incentiveFee
  );
  const fixedThree = baseManagementFee + incentiveFee + renovationProvision;
  const total = directTotal + undistributedFour + fixedThree;

  return {
    ga,
    marketingSales,
    propertyOpsMaintenance,
    utilities,
    baseManagementFee,
    incentiveFee,
    renovationProvision,
    undistributedFour,
    fixedThree,
    total,
  };
}

/**
 * 10-year operating P&L from persisted Steps 1–5 snapshot + Component 1 capex (construction + FFE).
 */
export function computeOperationalHotelHoldPnl(
  snapshot: OperationalHotelHoldSnapshot,
  constructionCost: number,
  ffeCost: number
): OperationalPnlComputed {
  const revPcts = coerceRevPcts(snapshot.revPcts);
  const directPcts = coerceDirectPcts(snapshot.directCostPcts);
  const expensePcts = coerceExpensePcts(snapshot.expensePcts);
  const depFields = coerceDepFields(snapshot.depFieldValues);

  const adr = snapshot.adrValues.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS);
  const occ = snapshot.occupancyValues.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS);
  while (adr.length < OPERATIONAL_ROOM_REVENUE_YEARS) adr.push(0);
  while (occ.length < OPERATIONAL_ROOM_REVENUE_YEARS) occ.push(0);

  const roomRevenue = computeRoomRevenueSeries(
    snapshot.numberOfRooms,
    adr,
    occ
  );

  const rShare = revPcts.rooms / 100;
  const revenueRows = roomRevenue.map((rr, i) => {
    const total = rShare > 0 ? rr / rShare : 0;
    const row: Record<string, number> = { rooms: rr };
    for (const k of HOTEL_REVENUE_PCT_KEYS) {
      if (k === "rooms") continue;
      row[k] = total * (revPcts[k] / 100);
    }
    return row;
  });

  const totalHotelRevenue = revenueRows.map((row) =>
    HOTEL_REVENUE_PCT_KEYS.reduce((s, k) => s + (Number(row[k]) || 0), 0)
  );

  const zeros = () => Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(0);
  const directCostsByYear = {
    roomsPayroll: zeros(),
    roomsOther: zeros(),
    foodCostOfSale: zeros(),
    beverageCostOfSale: zeros(),
    fbPayroll: zeros(),
    fbOther: zeros(),
    telecomCost: zeros(),
    healthLeisureCost: zeros(),
    otherDeptsCost: zeros(),
  };
  const totalDirectCosts = zeros();
  const ga = zeros();
  const marketingSales = zeros();
  const propertyOpsMaintenance = zeros();
  const utilities = zeros();
  const baseManagementFee = zeros();
  const incentiveFee = zeros();
  const renovationProvision = zeros();
  const undistributedFour = zeros();
  const fixedThree = zeros();
  const totalExpenses = zeros();
  const ebitda = zeros();
  const depreciationConstruction = zeros();
  const depreciationFfe = zeros();
  const depreciationTotal = zeros();
  const ebit = zeros();
  const netIncome = zeros();

  const cc = Math.max(0, constructionCost);
  const ffe = Math.max(0, ffeCost);
  const conAnnual = annualConstructionDepreciation(
    cc,
    depFields.constructionUsefulLife
  );

  for (let i = 0; i < OPERATIONAL_ROOM_REVENUE_YEARS; i++) {
    const row = revenueRows[i] ?? {};
    const d = buildDirectCostAmounts(row, directPcts);
    directCostsByYear.roomsPayroll[i] = d.roomsPayroll;
    directCostsByYear.roomsOther[i] = d.roomsOther;
    directCostsByYear.foodCostOfSale[i] = d.foodCostOfSale;
    directCostsByYear.beverageCostOfSale[i] = d.beverageCostOfSale;
    directCostsByYear.fbPayroll[i] = d.fbPayroll;
    directCostsByYear.fbOther[i] = d.fbOther;
    directCostsByYear.telecomCost[i] = d.telecomCost;
    directCostsByYear.healthLeisureCost[i] = d.healthLeisureCost;
    directCostsByYear.otherDeptsCost[i] = d.otherDeptsCost;
    totalDirectCosts[i] = d.totalDirect;

    const T = totalHotelRevenue[i] ?? 0;
    const Rr = Number(row.rooms) || 0;
    const ex = expenseLinesForYear(i, T, Rr, d.totalDirect, expensePcts);
    ga[i] = ex.ga;
    marketingSales[i] = ex.marketingSales;
    propertyOpsMaintenance[i] = ex.propertyOpsMaintenance;
    utilities[i] = ex.utilities;
    baseManagementFee[i] = ex.baseManagementFee;
    incentiveFee[i] = ex.incentiveFee;
    renovationProvision[i] = ex.renovationProvision;
    undistributedFour[i] = ex.undistributedFour;
    fixedThree[i] = ex.fixedThree;
    totalExpenses[i] = ex.total;
    ebitda[i] = T - ex.total;

    const ffeDep = annualFfeDepreciation(
      i,
      ffe,
      depFields.ffeUsefulLife,
      depFields.ffeRenovationRate
    );
    depreciationConstruction[i] = conAnnual;
    depreciationFfe[i] = ffeDep;
    depreciationTotal[i] = conAnnual + ffeDep;
    ebit[i] = ebitda[i] - depreciationTotal[i];
    netIncome[i] = ebit[i];
  }

  return {
    revenueByStream: {
      rooms: revenueRows.map((r) => r.rooms || 0),
      food: revenueRows.map((r) => r.food || 0),
      beverage: revenueRows.map((r) => r.beverage || 0),
      roomService: revenueRows.map((r) => r.roomService || 0),
      telecom: revenueRows.map((r) => r.telecom || 0),
      spaHealth: revenueRows.map((r) => r.spaHealth || 0),
      rentalOther: revenueRows.map((r) => r.rentalOther || 0),
    },
    totalHotelRevenue,
    directCostsByYear,
    totalDirectCosts,
    ga,
    marketingSales,
    propertyOpsMaintenance,
    utilities,
    baseManagementFee,
    incentiveFee,
    renovationProvision,
    undistributedFour,
    fixedThree,
    totalExpenses,
    ebitda,
    depreciationConstruction,
    depreciationFfe,
    depreciationTotal,
    ebit,
    netIncome,
  };
}

export function buildPnlExportRows(
  pnl: OperationalPnlComputed,
  currencyCode: string
): (string | number)[][] {
  const fmt = (n: number) => Math.round(n);
  const Y = (fn: (i: number) => number) =>
    Array.from({ length: OPERATIONAL_ROOM_REVENUE_YEARS }, (_, i) => fmt(fn(i)));

  return [
    [`Operating P&L — ${currencyCode}`, ...Array(10).fill("")],
    ["", ...Array(10).fill("")],
    ["", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9", "Y10"],
    ["REVENUE", ...Array(10).fill("")],
    ["Room revenue", ...Y((i) => pnl.revenueByStream.rooms[i] ?? 0)],
    ["Food revenue", ...Y((i) => pnl.revenueByStream.food[i] ?? 0)],
    ["Beverage revenue", ...Y((i) => pnl.revenueByStream.beverage[i] ?? 0)],
    ["Room service", ...Y((i) => pnl.revenueByStream.roomService[i] ?? 0)],
    ["Telecom", ...Y((i) => pnl.revenueByStream.telecom[i] ?? 0)],
    ["Spa & health", ...Y((i) => pnl.revenueByStream.spaHealth[i] ?? 0)],
    ["Rental & other", ...Y((i) => pnl.revenueByStream.rentalOther[i] ?? 0)],
    ["TOTAL REVENUE", ...Y((i) => pnl.totalHotelRevenue[i] ?? 0)],
    ["", ...Array(10).fill("")],
    ["EXPENSES", ...Array(10).fill("")],
    ["Rooms — payroll", ...Y((i) => pnl.directCostsByYear.roomsPayroll[i] ?? 0)],
    ["Rooms — other", ...Y((i) => pnl.directCostsByYear.roomsOther[i] ?? 0)],
    [
      "Food — COS",
      ...Y((i) => pnl.directCostsByYear.foodCostOfSale[i] ?? 0),
    ],
    [
      "Beverage — COS",
      ...Y((i) => pnl.directCostsByYear.beverageCostOfSale[i] ?? 0),
    ],
    ["F&B — payroll", ...Y((i) => pnl.directCostsByYear.fbPayroll[i] ?? 0)],
    ["F&B — other", ...Y((i) => pnl.directCostsByYear.fbOther[i] ?? 0)],
    ["Telecom", ...Y((i) => pnl.directCostsByYear.telecomCost[i] ?? 0)],
    ["Spa & health", ...Y((i) => pnl.directCostsByYear.healthLeisureCost[i] ?? 0)],
    [
      "Rental & other depts.",
      ...Y((i) => pnl.directCostsByYear.otherDeptsCost[i] ?? 0),
    ],
    ["Sub-total direct", ...Y((i) => pnl.totalDirectCosts[i] ?? 0)],
    ["G&A", ...Y((i) => pnl.ga[i] ?? 0)],
    ["Marketing & sales", ...Y((i) => pnl.marketingSales[i] ?? 0)],
    [
      "Property ops & maintenance",
      ...Y((i) => pnl.propertyOpsMaintenance[i] ?? 0),
    ],
    ["Utilities", ...Y((i) => pnl.utilities[i] ?? 0)],
    ["Base management fee", ...Y((i) => pnl.baseManagementFee[i] ?? 0)],
    ["Incentive fee", ...Y((i) => pnl.incentiveFee[i] ?? 0)],
    ["Renovation provision", ...Y((i) => pnl.renovationProvision[i] ?? 0)],
    ["TOTAL EXPENSES", ...Y((i) => pnl.totalExpenses[i] ?? 0)],
    ["", ...Array(10).fill("")],
    ["EBITDA", ...Y((i) => pnl.ebitda[i] ?? 0)],
    ["Depreciation — construction", ...Y((i) => pnl.depreciationConstruction[i] ?? 0)],
    ["Depreciation — FFE", ...Y((i) => pnl.depreciationFfe[i] ?? 0)],
    ["EBIT", ...Y((i) => pnl.ebit[i] ?? 0)],
    ["Net income (preview)", ...Y((i) => pnl.netIncome[i] ?? 0)],
  ];
}
