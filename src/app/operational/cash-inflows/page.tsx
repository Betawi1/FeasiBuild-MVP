"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import {
  isValidHotelCombo,
  type HotelOperatingType,
} from "@/config/hotel-cost-profiles";
import {
  DIRECT_COST_STACK_COLORS,
  DIRECT_COST_STACK_KEYS,
  DIRECT_COST_STACK_LABELS,
  HOTEL_DIRECT_COST_PROFILES,
  HOTEL_DIRECT_COST_PCT_KEYS,
  pctsFromDirectCostProfile,
  resolveHotelDirectCostProfile,
  type DirectCostProfile,
  type DirectCostStackKey,
  type HotelDirectCostPctKey,
} from "@/config/hotel-direct-cost-profiles";
import {
  HOTEL_EXPENSE_PROFILES,
  HOTEL_EXPENSE_PCT_KEYS,
  incentiveFeeFromCircularEbitda,
  pctsFromExpenseProfile,
  resolveHotelExpenseProfile,
  TOTAL_EXPENSE_STACK_COLORS,
  TOTAL_EXPENSE_STACK_KEYS,
  TOTAL_EXPENSE_STACK_LABELS,
  type ExpenseProfile,
  type HotelExpensePctKey,
  type TotalExpenseStackKey,
} from "@/config/hotel-expense-profiles";
import {
  annualConstructionDepreciation,
  annualFfeDepreciation,
  HOTEL_DEPRECIATION_PROFILES,
  HOTEL_DEPRECIATION_FIELD_KEYS,
  valuesFromDepreciationProfile,
  resolveHotelDepreciationProfile,
  type DepreciationProfile,
  type HotelDepreciationFieldKey,
} from "@/config/hotel-depreciation-profiles";
import {
  HOTEL_REVENUE_PROFILES,
  HOTEL_REVENUE_PCT_KEYS,
  pctsFromRevenueProfile,
  resolveHotelRevenueProfile,
  sumRevenuePcts,
  type HotelRevenuePctKey,
  type RevenueProfile,
} from "@/config/hotel-revenue-profiles";
import useFinModelStore from "@/store/useFinModelStore";
import type { ProjectInfo } from "@/store/useFinModelStore";
import {
  buildDefaultAdrSeries,
  compoundAdrForYearIndex,
  computeRoomRevenueSeries,
  DUBAI_BUSINESS_HOTEL_DEFAULT_ADR,
  DUBAI_BUSINESS_HOTEL_DEFAULT_OCCUPANCY,
  OPERATIONAL_ROOM_REVENUE_YEARS,
  roomRevenueToChartData,
  type RoomRevenueChartRow,
} from "@/lib/operational-cash-inflows-chart";
import { useStreamPrefix, withStreamPrefix } from "@/lib/stream-path";
import type { OperationalHotelHoldSnapshot } from "@/lib/operational-pnl";

const TOTAL_STEPS = 5;

function getOperationalHotelHoldSnapshot():
  | OperationalHotelHoldSnapshot
  | undefined {
  return useFinModelStore.getState().operational.hotelHoldSnapshot;
}

function padOperationalYearSeries(
  values: number[] | undefined,
  fallback: readonly number[]
): number[] {
  if (!values?.length) return [...fallback];
  const out = [...values];
  while (out.length < OPERATIONAL_ROOM_REVENUE_YEARS) {
    out.push(out[out.length - 1] ?? 0);
  }
  return out.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS);
}

type Errors = Record<string, string>;

const inputBase =
  "rounded bg-slate-900 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";
function overrideFieldClass(overridden: boolean): string {
  return overridden
    ? `${inputBase} border-2 border-amber-500/70`
    : `${inputBase} border border-slate-600`;
}

function RoomRevenueBarChart({
  data,
  currencyCode,
}: {
  data: RoomRevenueChartRow[];
  currencyCode: string;
}) {
  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    []
  );

  if (!data.length) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 text-sm text-slate-500">
        Enter rooms, ADR, and occupancy to see projected room revenue.
      </div>
    );
  }

  const maxR = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="h-80 w-full rounded-lg border border-slate-700/80 bg-slate-900/40 p-2">
      <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Projected room revenue by year ({currencyCode})
      </p>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickFormatter={(v) => fmt.format(Number(v))}
            width={48}
            domain={[0, maxR * 1.08]}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const raw = payload[0].value;
              const v = typeof raw === "number" ? raw : Number(raw ?? 0);
              return (
                <div className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs shadow-lg">
                  <p className="mb-1 text-slate-400">{String(label)}</p>
                  <p className="font-semibold text-emerald-400">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: currencyCode,
                      maximumFractionDigits: 0,
                    }).format(v)}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const REVENUE_STACK_LABELS: Record<HotelRevenuePctKey, string> = {
  rooms: "Rooms",
  food: "Food",
  beverage: "Beverage",
  roomService: "Room service",
  telecom: "Telecom / other",
  spaHealth: "Spa & health",
  rentalOther: "Rental & other",
};

const REVENUE_STACK_COLORS: Record<HotelRevenuePctKey, string> = {
  rooms: "#059669",
  food: "#d97706",
  beverage: "#ea580c",
  roomService: "#f43f5e",
  telecom: "#64748b",
  spaHealth: "#9333ea",
  rentalOther: "#0891b2",
};

function emptyRevPctOverrides(): Record<HotelRevenuePctKey, boolean> {
  return {
    rooms: false,
    food: false,
    beverage: false,
    roomService: false,
    telecom: false,
    spaHealth: false,
    rentalOther: false,
  };
}

function resolveRevenueBenchmarkFromProject(pi: ProjectInfo): {
  key: string;
  profile: RevenueProfile;
} {
  const op = pi.hotelOperatingType;
  const star = Number(pi.hotelStarRating);
  if (
    pi.buildingType !== "hotel" ||
    !op ||
    !isValidHotelCombo(op, star).valid
  ) {
    return { key: "default", profile: HOTEL_REVENUE_PROFILES.default };
  }
  return resolveHotelRevenueProfile(
    op as HotelOperatingType,
    star,
    pi.country,
    pi.city
  );
}

const DIRECT_COST_INPUT_LABELS: Record<HotelDirectCostPctKey, string> = {
  roomsPayroll: "Rooms — payroll",
  roomsOther: "Rooms — other",
  foodCostOfSale: "Food — cost of sales",
  beverageCostOfSale: "Beverage — cost of sales",
  fbPayroll: "F&B — payroll",
  fbOther: "F&B — other",
  telecomCost: "Telecom",
  healthLeisureCost: "Spa & health",
  otherDeptsCost: "Rental & other depts.",
};

const DIRECT_COST_BASE_HELP: Record<HotelDirectCostPctKey, string> = {
  roomsPayroll: "% of room revenue",
  roomsOther: "% of room revenue",
  foodCostOfSale: "% of food revenue",
  beverageCostOfSale: "% of beverage revenue",
  fbPayroll: "% of F&B revenue (food + beverage + room service)",
  fbOther: "% of F&B revenue (food + beverage + room service)",
  telecomCost: "% of telecom revenue",
  healthLeisureCost: "% of spa & health revenue",
  otherDeptsCost: "% of rental & other revenue",
};

function emptyDirectCostPctOverrides(): Record<
  HotelDirectCostPctKey,
  boolean
> {
  return {
    roomsPayroll: false,
    roomsOther: false,
    foodCostOfSale: false,
    beverageCostOfSale: false,
    fbPayroll: false,
    fbOther: false,
    telecomCost: false,
    healthLeisureCost: false,
    otherDeptsCost: false,
  };
}

function resolveDirectCostBenchmarkFromProject(pi: ProjectInfo): {
  key: string;
  profile: DirectCostProfile;
} {
  const op = pi.hotelOperatingType;
  const star = Number(pi.hotelStarRating);
  if (
    pi.buildingType !== "hotel" ||
    !op ||
    !isValidHotelCombo(op, star).valid
  ) {
    return { key: "default", profile: HOTEL_DIRECT_COST_PROFILES.default };
  }
  return resolveHotelDirectCostProfile(
    op as HotelOperatingType,
    star,
    pi.country,
    pi.city
  );
}

function buildDirectCostStackRow(
  revenueRow: Record<string, string | number>,
  p: Record<HotelDirectCostPctKey, number>
): { chart: Record<string, string | number>; totalDirect: number } {
  const roomRev = Number(revenueRow.rooms) || 0;
  const foodRev = Number(revenueRow.food) || 0;
  const beverageRev = Number(revenueRow.beverage) || 0;
  const roomServiceRev = Number(revenueRow.roomService) || 0;
  const telecomRev = Number(revenueRow.telecom) || 0;
  const spaRev = Number(revenueRow.spaHealth) || 0;
  const rentalOtherRev = Number(revenueRow.rentalOther) || 0;
  const fbTotal = foodRev + beverageRev + roomServiceRev;

  const dcRoomsPayroll = roomRev * (p.roomsPayroll / 100);
  const dcRoomsOther = roomRev * (p.roomsOther / 100);
  const dcFoodCos = foodRev * (p.foodCostOfSale / 100);
  const dcBeverageCos = beverageRev * (p.beverageCostOfSale / 100);
  const dcFbPayroll = fbTotal * (p.fbPayroll / 100);
  const dcFbOther = fbTotal * (p.fbOther / 100);
  const dcTelecom = telecomRev * (p.telecomCost / 100);
  const dcHealthLeisure = spaRev * (p.healthLeisureCost / 100);
  const dcOtherDepts = rentalOtherRev * (p.otherDeptsCost / 100);

  const totalDirect =
    dcRoomsPayroll +
    dcRoomsOther +
    dcFoodCos +
    dcBeverageCos +
    dcFbPayroll +
    dcFbOther +
    dcTelecom +
    dcHealthLeisure +
    dcOtherDepts;

  return {
    chart: {
      label: revenueRow.label,
      yearIndex: revenueRow.yearIndex,
      dcRoomsPayroll,
      dcRoomsOther,
      dcFoodCos,
      dcBeverageCos,
      dcFbPayroll,
      dcFbOther,
      dcTelecom,
      dcHealthLeisure,
      dcOtherDepts,
    },
    totalDirect,
  };
}

const EXPENSE_INPUT_LABELS: Record<HotelExpensePctKey, string> = {
  gaExpenses: "G&A",
  marketingSales: "Marketing & sales",
  propertyOpsMaintenance: "Property operations & maintenance",
  utilities: "Utilities",
  baseManagementFee: "Base management fee",
  incentiveFee: "Incentive fee",
  renovationProvisionY1: "Renovation provision — Year 1",
  renovationProvisionY2: "Renovation provision — Year 2",
  renovationProvisionY3to10: "Renovation provision — Years 3–10",
};

const EXPENSE_BASE_HELP: Record<HotelExpensePctKey, string> = {
  gaExpenses: "% of total hotel revenue",
  marketingSales: "% of total hotel revenue",
  propertyOpsMaintenance: "% of total hotel revenue",
  utilities: "% of total hotel revenue",
  baseManagementFee: "% of room revenue",
  incentiveFee:
    "% of EBITDA (net of fee): fee = r ÷ (1 + r) × EBITDA before incentive",
  renovationProvisionY1: "% of total hotel revenue",
  renovationProvisionY2: "% of total hotel revenue",
  renovationProvisionY3to10: "% of total hotel revenue",
};

function emptyExpensePctOverrides(): Record<HotelExpensePctKey, boolean> {
  return {
    gaExpenses: false,
    marketingSales: false,
    propertyOpsMaintenance: false,
    utilities: false,
    baseManagementFee: false,
    incentiveFee: false,
    renovationProvisionY1: false,
    renovationProvisionY2: false,
    renovationProvisionY3to10: false,
  };
}

function resolveExpenseBenchmarkFromProject(pi: ProjectInfo): {
  key: string;
  profile: ExpenseProfile;
} {
  const op = pi.hotelOperatingType;
  const star = Number(pi.hotelStarRating);
  if (
    pi.buildingType !== "hotel" ||
    !op ||
    !isValidHotelCombo(op, star).valid
  ) {
    return { key: "default", profile: HOTEL_EXPENSE_PROFILES.default };
  }
  return resolveHotelExpenseProfile(
    op as HotelOperatingType,
    star,
    pi.country,
    pi.city
  );
}

const DEPRECIATION_FIELD_LABELS: Record<HotelDepreciationFieldKey, string> = {
  constructionUsefulLife: "Construction useful life",
  ffeUsefulLife: "FFE useful life",
  ffeRenovationRate: "FFE renovation (vs initial FFE)",
  accountsReceivableMonths: "Accounts receivable",
  accountsPayableMonths: "Accounts payable",
};

const DEPRECIATION_FIELD_HELP: Record<HotelDepreciationFieldKey, string> = {
  constructionUsefulLife: "Years — straight-line on Component 1 construction cost",
  ffeUsefulLife:
    "Years — straight-line on Component 1 FFE; renovation from Year 6",
  ffeRenovationRate: "% of initial FFE capitalized at Year 6, then amortized",
  accountsReceivableMonths: "Months of total hotel revenue (Step 2)",
  accountsPayableMonths: "Months of total operating expenses (Step 4)",
};

function emptyDepreciationFieldOverrides(): Record<
  HotelDepreciationFieldKey,
  boolean
> {
  return {
    constructionUsefulLife: false,
    ffeUsefulLife: false,
    ffeRenovationRate: false,
    accountsReceivableMonths: false,
    accountsPayableMonths: false,
  };
}

function resolveDepreciationBenchmarkFromProject(pi: ProjectInfo): {
  key: string;
  profile: DepreciationProfile;
} {
  const op = pi.hotelOperatingType;
  const star = Number(pi.hotelStarRating);
  if (
    pi.buildingType !== "hotel" ||
    !op ||
    !isValidHotelCombo(op, star).valid
  ) {
    return { key: "default", profile: HOTEL_DEPRECIATION_PROFILES.default };
  }
  return resolveHotelDepreciationProfile(
    op as HotelOperatingType,
    star,
    pi.country,
    pi.city
  );
}

function depreciationInputBounds(k: HotelDepreciationFieldKey): {
  min: number;
  max: number;
  step: number;
} {
  switch (k) {
    case "constructionUsefulLife":
      return { min: 1, max: 60, step: 1 };
    case "ffeUsefulLife":
      return { min: 1, max: 20, step: 1 };
    case "ffeRenovationRate":
      return { min: 0, max: 100, step: 0.1 };
    case "accountsReceivableMonths":
    case "accountsPayableMonths":
      return { min: 0, max: 12, step: 0.1 };
    default:
      return { min: 0, max: 100, step: 0.1 };
  }
}

function computeYearTotalExpenseBreakdown(
  yearIndex: number,
  totalRev: number,
  roomRev: number,
  directTotal: number,
  p: Record<HotelExpensePctKey, number>
): {
  direct: number;
  undistributed: number;
  fixed: number;
  total: number;
  chartRow: Record<string, string | number>;
} {
  const ga = totalRev * (p.gaExpenses / 100);
  const mkt = totalRev * (p.marketingSales / 100);
  const prop = totalRev * (p.propertyOpsMaintenance / 100);
  const util = totalRev * (p.utilities / 100);
  const undistributedTotal = ga + mkt + prop + util;
  const baseMgmt = roomRev * (p.baseManagementFee / 100);
  const renoPct =
    yearIndex === 0
      ? p.renovationProvisionY1
      : yearIndex === 1
        ? p.renovationProvisionY2
        : p.renovationProvisionY3to10;
  const renovation = totalRev * (renoPct / 100);
  const ebitdaBeforeIncentive =
    totalRev - directTotal - undistributedTotal - baseMgmt - renovation;
  const incentiveFee = incentiveFeeFromCircularEbitda(
    ebitdaBeforeIncentive,
    p.incentiveFee
  );
  const fixedTotal = baseMgmt + incentiveFee + renovation;
  const total = directTotal + undistributedTotal + fixedTotal;
  return {
    direct: directTotal,
    undistributed: undistributedTotal,
    fixed: fixedTotal,
    total,
    chartRow: {
      label: `Y${yearIndex + 1}`,
      yearIndex,
      expDirect: directTotal,
      expGA: ga,
      expMarketing: mkt,
      expProperty: prop,
      expUtilities: util,
      expBaseMgmt: baseMgmt,
      expIncentive: incentiveFee,
      expRenovation: renovation,
    },
  };
}

function HotelTotalRevenueStackedChart({
  data,
  currencyCode,
}: {
  data: Array<Record<string, string | number>>;
  currencyCode: string;
}) {
  const fmtCompact = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    []
  );

  const fmtMoney = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyCode]
  );

  if (!data.length) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 text-sm text-slate-500">
        Complete Step 1 to see total hotel revenue by stream.
      </div>
    );
  }

  const totals = data.map((row) =>
    HOTEL_REVENUE_PCT_KEYS.reduce(
      (s, k) => s + (Number(row[k]) || 0),
      0
    )
  );
  const maxT = Math.max(...totals, 1);

  return (
    <div className="h-96 w-full rounded-lg border border-slate-700/80 bg-slate-900/40 p-2">
      <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Total hotel revenue by year — stacked ({currencyCode})
      </p>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickFormatter={(v) => fmtCompact.format(Number(v))}
            width={48}
            domain={[0, maxT * 1.06]}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="max-w-xs rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs shadow-lg">
                  <p className="mb-2 font-medium text-slate-300">
                    {String(label)}
                  </p>
                  <ul className="space-y-1">
                    {payload
                      .filter((p) => p.name && p.value != null)
                      .map((p) => (
                        <li
                          key={String(p.dataKey)}
                          className="flex justify-between gap-4"
                        >
                          <span className="text-slate-400">{p.name}</span>
                          <span className="font-mono text-slate-100">
                            {fmtMoney.format(Number(p.value))}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => (
              <span className="text-slate-400">{value}</span>
            )}
          />
          {HOTEL_REVENUE_PCT_KEYS.map((k) => (
            <Bar
              key={k}
              dataKey={k}
              name={REVENUE_STACK_LABELS[k]}
              stackId="total"
              fill={REVENUE_STACK_COLORS[k]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DirectCostsStackedChart({
  data,
  currencyCode,
}: {
  data: Array<Record<string, string | number>>;
  currencyCode: string;
}) {
  const fmtCompact = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    []
  );

  const fmtMoney = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyCode]
  );

  if (!data.length) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 text-sm text-slate-500">
        Complete Steps 1–2 to see direct costs by stream.
      </div>
    );
  }

  const totals = data.map((row) =>
    DIRECT_COST_STACK_KEYS.reduce(
      (s, k) => s + (Number(row[k]) || 0),
      0
    )
  );
  const maxT = Math.max(...totals, 1);

  return (
    <div className="h-96 w-full rounded-lg border border-slate-700/80 bg-slate-900/40 p-2">
      <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Direct costs by year — stacked ({currencyCode})
      </p>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickFormatter={(v) => fmtCompact.format(Number(v))}
            width={48}
            domain={[0, maxT * 1.06]}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="max-w-xs rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs shadow-lg">
                  <p className="mb-2 font-medium text-slate-300">
                    {String(label)}
                  </p>
                  <ul className="space-y-1">
                    {payload
                      .filter((p) => p.name && p.value != null)
                      .map((p) => (
                        <li
                          key={String(p.dataKey)}
                          className="flex justify-between gap-4"
                        >
                          <span className="text-slate-400">{p.name}</span>
                          <span className="font-mono text-slate-100">
                            {fmtMoney.format(Number(p.value))}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => (
              <span className="text-slate-400">{value}</span>
            )}
          />
          {DIRECT_COST_STACK_KEYS.map((k: DirectCostStackKey) => (
            <Bar
              key={k}
              dataKey={k}
              name={DIRECT_COST_STACK_LABELS[k]}
              stackId="dc"
              fill={DIRECT_COST_STACK_COLORS[k]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TotalOperatingExpenseStackedChart({
  data,
  currencyCode,
}: {
  data: Array<Record<string, string | number>>;
  currencyCode: string;
}) {
  const fmtCompact = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    []
  );

  const fmtMoney = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyCode]
  );

  if (!data.length) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 text-sm text-slate-500">
        Complete Steps 1–3 to see total operating expenses by category.
      </div>
    );
  }

  const totals = data.map((row) =>
    TOTAL_EXPENSE_STACK_KEYS.reduce(
      (s, k) => s + (Number(row[k]) || 0),
      0
    )
  );
  const maxT = Math.max(...totals, 1);

  return (
    <div className="h-96 w-full rounded-lg border border-slate-700/80 bg-slate-900/40 p-2">
      <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Total operating expenses by year — stacked ({currencyCode})
      </p>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickFormatter={(v) => fmtCompact.format(Number(v))}
            width={48}
            domain={[0, maxT * 1.06]}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="max-w-xs rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs shadow-lg">
                  <p className="mb-2 font-medium text-slate-300">
                    {String(label)}
                  </p>
                  <ul className="space-y-1">
                    {payload
                      .filter((p) => p.name && p.value != null)
                      .map((p) => (
                        <li
                          key={String(p.dataKey)}
                          className="flex justify-between gap-4"
                        >
                          <span className="text-slate-400">{p.name}</span>
                          <span className="font-mono text-slate-100">
                            {fmtMoney.format(Number(p.value))}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => (
              <span className="text-slate-400">{value}</span>
            )}
          />
          {TOTAL_EXPENSE_STACK_KEYS.map((k: TotalExpenseStackKey) => (
            <Bar
              key={k}
              dataKey={k}
              name={TOTAL_EXPENSE_STACK_LABELS[k]}
              stackId="opex"
              fill={TOTAL_EXPENSE_STACK_COLORS[k]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function OperationalCashInflowsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const streamPrefix = useStreamPrefix();

  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const currencyCode = projectInfo.currency || "AED";

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});

  // Step 1: Hotel Room Revenue State (Dubai business 4–5★ benchmarks).
  // Initialize from persisted hotel hold snapshot so returning from preview keeps edits.
  const [numberOfRooms, setNumberOfRooms] = useState(
    () => getOperationalHotelHoldSnapshot()?.numberOfRooms ?? 300
  );

  const [adrYear1, setAdrYear1] = useState(
    () =>
      getOperationalHotelHoldSnapshot()?.adrValues?.[0] ?? 1050
  );
  const [adrInflationRate, setAdrInflationRate] = useState(4);
  const [adrValues, setAdrValues] = useState<number[]>(() =>
    padOperationalYearSeries(
      getOperationalHotelHoldSnapshot()?.adrValues,
      DUBAI_BUSINESS_HOTEL_DEFAULT_ADR
    )
  );

  const [occupancyYear1, setOccupancyYear1] = useState(
    () =>
      getOperationalHotelHoldSnapshot()?.occupancyValues?.[0] ?? 68
  );
  const [occupancyValues, setOccupancyValues] = useState<number[]>(() =>
    padOperationalYearSeries(
      getOperationalHotelHoldSnapshot()?.occupancyValues,
      DUBAI_BUSINESS_HOTEL_DEFAULT_OCCUPANCY
    )
  );

  const [adrOverrides, setAdrOverrides] = useState<boolean[]>(() => {
    const snap = getOperationalHotelHoldSnapshot();
    if (snap?.adrValues?.length)
      return Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(true);
    return Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false);
  });
  const [occupancyOverrides, setOccupancyOverrides] = useState<boolean[]>(
    () => {
      const snap = getOperationalHotelHoldSnapshot();
      if (snap?.occupancyValues?.length)
        return Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(true);
      return Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false);
    }
  );

  const [roomRevenue, setRoomRevenue] = useState<number[]>(() =>
    Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(0)
  );

  const [revenueProfileKey, setRevenueProfileKey] = useState("default");
  const [revenueProfileSource, setRevenueProfileSource] = useState(
    HOTEL_REVENUE_PROFILES.default.source
  );
  const [revPcts, setRevPcts] = useState<Record<HotelRevenuePctKey, number>>(
    () => {
      const snap = getOperationalHotelHoldSnapshot();
      const base = pctsFromRevenueProfile(HOTEL_REVENUE_PROFILES.default);
      if (snap?.revPcts && Object.keys(snap.revPcts).length > 0) {
        return { ...base, ...snap.revPcts } as Record<
          HotelRevenuePctKey,
          number
        >;
      }
      return base;
    }
  );
  const [revPctOverrides, setRevPctOverrides] = useState<
    Record<HotelRevenuePctKey, boolean>
  >(() => emptyRevPctOverrides());

  const [directCostProfileKey, setDirectCostProfileKey] = useState("default");
  const [directCostProfileSource, setDirectCostProfileSource] = useState(
    HOTEL_DIRECT_COST_PROFILES.default.source
  );
  const [directCostPcts, setDirectCostPcts] = useState<
    Record<HotelDirectCostPctKey, number>
  >(() => {
    const snap = getOperationalHotelHoldSnapshot();
    const base = pctsFromDirectCostProfile(HOTEL_DIRECT_COST_PROFILES.default);
    if (snap?.directCostPcts && Object.keys(snap.directCostPcts).length > 0) {
      return { ...base, ...snap.directCostPcts } as Record<
        HotelDirectCostPctKey,
        number
      >;
    }
    return base;
  });
  const [directCostPctOverrides, setDirectCostPctOverrides] = useState<
    Record<HotelDirectCostPctKey, boolean>
  >(() => emptyDirectCostPctOverrides());

  const [expenseProfileKey, setExpenseProfileKey] = useState("default");
  const [expenseProfileSource, setExpenseProfileSource] = useState(
    HOTEL_EXPENSE_PROFILES.default.source
  );
  const [expensePcts, setExpensePcts] = useState<
    Record<HotelExpensePctKey, number>
  >(() => {
    const snap = getOperationalHotelHoldSnapshot();
    const base = pctsFromExpenseProfile(HOTEL_EXPENSE_PROFILES.default);
    if (snap?.expensePcts && Object.keys(snap.expensePcts).length > 0) {
      return { ...base, ...snap.expensePcts } as Record<
        HotelExpensePctKey,
        number
      >;
    }
    return base;
  });
  const [expensePctOverrides, setExpensePctOverrides] = useState<
    Record<HotelExpensePctKey, boolean>
  >(() => emptyExpensePctOverrides());

  const [depreciationProfileKey, setDepreciationProfileKey] =
    useState("default");
  const [depreciationProfileSource, setDepreciationProfileSource] = useState(
    HOTEL_DEPRECIATION_PROFILES.default.source
  );
  const [depFieldValues, setDepFieldValues] = useState<
    Record<HotelDepreciationFieldKey, number>
  >(() => {
    const snap = getOperationalHotelHoldSnapshot();
    const base = valuesFromDepreciationProfile(
      HOTEL_DEPRECIATION_PROFILES.default
    );
    if (snap?.depFieldValues && Object.keys(snap.depFieldValues).length > 0) {
      return { ...base, ...snap.depFieldValues } as Record<
        HotelDepreciationFieldKey,
        number
      >;
    }
    return base;
  });
  const [depFieldOverrides, setDepFieldOverrides] = useState<
    Record<HotelDepreciationFieldKey, boolean>
  >(() => emptyDepreciationFieldOverrides());

  const hotelHoldSnapshotPayloadRef = useRef({
    numberOfRooms,
    adrValues,
    occupancyValues,
    revPcts,
    directCostPcts,
    expensePcts,
    depFieldValues,
  });
  hotelHoldSnapshotPayloadRef.current = {
    numberOfRooms,
    adrValues,
    occupancyValues,
    revPcts,
    directCostPcts,
    expensePcts,
    depFieldValues,
  };

  useEffect(() => {
    const snap = getOperationalHotelHoldSnapshot();
    if (snap?.revPcts && Object.keys(snap.revPcts).length > 0) return;
    const { key, profile } = resolveRevenueBenchmarkFromProject(projectInfo);
    setRevenueProfileKey(key);
    setRevenueProfileSource(profile.source);
    setRevPcts(pctsFromRevenueProfile(profile));
    setRevPctOverrides(emptyRevPctOverrides());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const snap = getOperationalHotelHoldSnapshot();
    if (snap?.directCostPcts && Object.keys(snap.directCostPcts).length > 0)
      return;
    const { key, profile } = resolveDirectCostBenchmarkFromProject(projectInfo);
    setDirectCostProfileKey(key);
    setDirectCostProfileSource(profile.source);
    setDirectCostPcts(pctsFromDirectCostProfile(profile));
    setDirectCostPctOverrides(emptyDirectCostPctOverrides());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const snap = getOperationalHotelHoldSnapshot();
    if (snap?.expensePcts && Object.keys(snap.expensePcts).length > 0) return;
    const { key, profile } = resolveExpenseBenchmarkFromProject(projectInfo);
    setExpenseProfileKey(key);
    setExpenseProfileSource(profile.source);
    setExpensePcts(pctsFromExpenseProfile(profile));
    setExpensePctOverrides(emptyExpensePctOverrides());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const snap = getOperationalHotelHoldSnapshot();
    if (snap?.depFieldValues && Object.keys(snap.depFieldValues).length > 0)
      return;
    const { key, profile } =
      resolveDepreciationBenchmarkFromProject(projectInfo);
    setDepreciationProfileKey(key);
    setDepreciationProfileSource(profile.source);
    setDepFieldValues(valuesFromDepreciationProfile(profile));
    setDepFieldOverrides(emptyDepreciationFieldOverrides());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const p = hotelHoldSnapshotPayloadRef.current;
      useFinModelStore.getState().updateHotelHoldSnapshot(
        {
          numberOfRooms: p.numberOfRooms,
          adrValues: p.adrValues.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS),
          occupancyValues: p.occupancyValues.slice(
            0,
            OPERATIONAL_ROOM_REVENUE_YEARS
          ),
          revPcts: { ...p.revPcts },
          directCostPcts: { ...p.directCostPcts },
          expensePcts: { ...p.expensePcts },
          depFieldValues: { ...p.depFieldValues },
        },
        "operational"
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [
    numberOfRooms,
    adrValues,
    occupancyValues,
    revPcts,
    directCostPcts,
    expensePcts,
    depFieldValues,
  ]);

  useEffect(() => {
    return () => {
      const p = hotelHoldSnapshotPayloadRef.current;
      useFinModelStore.getState().updateHotelHoldSnapshot(
        {
          numberOfRooms: p.numberOfRooms,
          adrValues: p.adrValues.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS),
          occupancyValues: p.occupancyValues.slice(
            0,
            OPERATIONAL_ROOM_REVENUE_YEARS
          ),
          revPcts: { ...p.revPcts },
          directCostPcts: { ...p.directCostPcts },
          expensePcts: { ...p.expensePcts },
          depFieldValues: { ...p.depFieldValues },
        },
        "operational"
      );
    };
  }, []);

  useEffect(() => {
    const raw = searchParams?.get("step");
    if (!raw) return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const desired = Math.min(
      TOTAL_STEPS - 1,
      Math.max(0, Math.round(parsed) - 1)
    );
    setCurrentStep(desired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill ADR from Year 1 + inflation where not manually overridden
  useEffect(() => {
    setAdrValues((prev) => {
      const next = [...prev];
      for (let i = 0; i < OPERATIONAL_ROOM_REVENUE_YEARS; i++) {
        if (!adrOverrides[i]) {
          next[i] = compoundAdrForYearIndex(
            adrYear1,
            adrInflationRate,
            i
          );
        }
      }
      while (next.length < OPERATIONAL_ROOM_REVENUE_YEARS) {
        next.push(
          compoundAdrForYearIndex(
            adrYear1,
            adrInflationRate,
            next.length
          )
        );
      }
      return next.slice(0, OPERATIONAL_ROOM_REVENUE_YEARS);
    });
  }, [adrYear1, adrInflationRate, adrOverrides]);

  // Sync Year 1 occupancy from headline input when not overridden
  useEffect(() => {
    if (occupancyOverrides[0]) return;
    setOccupancyValues((prev) => {
      const next = [...prev];
      next[0] = occupancyYear1;
      return next;
    });
  }, [occupancyYear1, occupancyOverrides]);

  useEffect(() => {
    setRoomRevenue(
      computeRoomRevenueSeries(numberOfRooms, adrValues, occupancyValues)
    );
  }, [numberOfRooms, adrValues, occupancyValues]);

  const chartData = useMemo(
    () => roomRevenueToChartData(roomRevenue),
    [roomRevenue]
  );

  const tenYearRoomRevenueTotal = useMemo(
    () => roomRevenue.reduce((s, v) => s + (v || 0), 0),
    [roomRevenue]
  );

  const hasAnyOverride = useMemo(
    () =>
      adrOverrides.some(Boolean) || occupancyOverrides.some(Boolean),
    [adrOverrides, occupancyOverrides]
  );

  const hasAnyRevPctOverride = useMemo(
    () => HOTEL_REVENUE_PCT_KEYS.some((k) => revPctOverrides[k]),
    [revPctOverrides]
  );

  const hasAnyDirectCostPctOverride = useMemo(
    () => HOTEL_DIRECT_COST_PCT_KEYS.some((k) => directCostPctOverrides[k]),
    [directCostPctOverrides]
  );

  const hasAnyExpensePctOverride = useMemo(
    () => HOTEL_EXPENSE_PCT_KEYS.some((k) => expensePctOverrides[k]),
    [expensePctOverrides]
  );

  const hasAnyDepreciationFieldOverride = useMemo(
    () => HOTEL_DEPRECIATION_FIELD_KEYS.some((k) => depFieldOverrides[k]),
    [depFieldOverrides]
  );

  const revenuePctSum = useMemo(() => sumRevenuePcts(revPcts), [revPcts]);

  const totalHotelRevenueStackedData = useMemo(() => {
    const rShare = revPcts.rooms / 100;
    return roomRevenue.map((rr, i) => {
      const total = rShare > 0 ? rr / rShare : 0;
      const row: Record<string, string | number> = {
        label: `Y${i + 1}`,
        yearIndex: i,
      };
      for (const k of HOTEL_REVENUE_PCT_KEYS) {
        if (k === "rooms") {
          row[k] = rr;
        } else {
          row[k] = total * (revPcts[k] / 100);
        }
      }
      return row;
    });
  }, [roomRevenue, revPcts]);

  const totalHotelRevenue = useMemo(
    () =>
      totalHotelRevenueStackedData.map((row) =>
        HOTEL_REVENUE_PCT_KEYS.reduce(
          (s, k) => s + (Number(row[k]) || 0),
          0
        )
      ),
    [totalHotelRevenueStackedData]
  );

  const revenueByStream = useMemo(
    () => ({
      rooms: totalHotelRevenueStackedData.map(
        (row) => Number(row.rooms) || 0
      ),
    }),
    [totalHotelRevenueStackedData]
  );

  const revenuePercentages = useMemo(
    () => ({ rooms: revPcts.rooms }),
    [revPcts.rooms]
  );

  const resetRevenuePctsToBenchmark = useCallback(() => {
    const { key, profile } = resolveRevenueBenchmarkFromProject(projectInfo);
    setRevenueProfileKey(key);
    setRevenueProfileSource(profile.source);
    setRevPcts(pctsFromRevenueProfile(profile));
    setRevPctOverrides(emptyRevPctOverrides());
  }, [projectInfo]);

  const directCostStackedData = useMemo(() => {
    return totalHotelRevenueStackedData.map((revRow) =>
      buildDirectCostStackRow(revRow, directCostPcts).chart
    );
  }, [totalHotelRevenueStackedData, directCostPcts]);

  const yearlyDirectCostTotals = useMemo(
    () =>
      totalHotelRevenueStackedData.map((revRow) =>
        buildDirectCostStackRow(revRow, directCostPcts).totalDirect
      ),
    [totalHotelRevenueStackedData, directCostPcts]
  );

  const resetDirectCostsToBenchmark = useCallback(() => {
    const { key, profile } = resolveDirectCostBenchmarkFromProject(projectInfo);
    setDirectCostProfileKey(key);
    setDirectCostProfileSource(profile.source);
    setDirectCostPcts(pctsFromDirectCostProfile(profile));
    setDirectCostPctOverrides(emptyDirectCostPctOverrides());
  }, [projectInfo]);

  const yearlyTotalExpenseBreakdown = useMemo(() => {
    return totalHotelRevenue.map((T, i) => {
      const roomRev = revenueByStream.rooms[i] ?? 0;
      const D = yearlyDirectCostTotals[i] ?? 0;
      return computeYearTotalExpenseBreakdown(
        i,
        T,
        roomRev,
        D,
        expensePcts
      );
    });
  }, [
    totalHotelRevenue,
    revenueByStream.rooms,
    yearlyDirectCostTotals,
    expensePcts,
  ]);

  const totalExpenseStackedData = useMemo(
    () => yearlyTotalExpenseBreakdown.map((r) => r.chartRow),
    [yearlyTotalExpenseBreakdown]
  );

  const resetExpensesToBenchmark = useCallback(() => {
    const { key, profile } = resolveExpenseBenchmarkFromProject(projectInfo);
    setExpenseProfileKey(key);
    setExpenseProfileSource(profile.source);
    setExpensePcts(pctsFromExpenseProfile(profile));
    setExpensePctOverrides(emptyExpensePctOverrides());
  }, [projectInfo]);

  const yearlyDepreciationWcRows = useMemo(() => {
    const cc = Math.max(0, cashOutflows.constructionCost || 0);
    const ffe = Math.max(0, cashOutflows.ffe || 0);
    const conAnnual = annualConstructionDepreciation(
      cc,
      depFieldValues.constructionUsefulLife
    );
    return totalHotelRevenue.map((rev, i) => {
      const opex = yearlyTotalExpenseBreakdown[i]?.total ?? 0;
      const ffeDep = annualFfeDepreciation(
        i,
        ffe,
        depFieldValues.ffeUsefulLife,
        depFieldValues.ffeRenovationRate
      );
      const ar = (depFieldValues.accountsReceivableMonths / 12) * rev;
      const ap = (depFieldValues.accountsPayableMonths / 12) * opex;
      return {
        label: `Y${i + 1}`,
        yearIndex: i,
        constructionDep: conAnnual,
        ffeDep,
        totalDep: conAnnual + ffeDep,
        ar,
        ap,
        netWc: ar - ap,
      };
    });
  }, [
    cashOutflows.constructionCost,
    cashOutflows.ffe,
    depFieldValues,
    totalHotelRevenue,
    yearlyTotalExpenseBreakdown,
  ]);

  const resetDepreciationToBenchmark = useCallback(() => {
    const { key, profile } =
      resolveDepreciationBenchmarkFromProject(projectInfo);
    setDepreciationProfileKey(key);
    setDepreciationProfileSource(profile.source);
    setDepFieldValues(valuesFromDepreciationProfile(profile));
    setDepFieldOverrides(emptyDepreciationFieldOverrides());
  }, [projectInfo]);

  const resetAdrToFormula = useCallback(() => {
    setAdrOverrides(Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false));
    setAdrValues(
      buildDefaultAdrSeries(adrYear1, adrInflationRate)
    );
  }, [adrYear1, adrInflationRate]);

  const resetOccupancyToDefaults = useCallback(() => {
    setOccupancyOverrides(Array(OPERATIONAL_ROOM_REVENUE_YEARS).fill(false));
    const ramp = [...DUBAI_BUSINESS_HOTEL_DEFAULT_OCCUPANCY];
    setOccupancyValues(ramp);
    setOccupancyYear1(ramp[0] ?? 68);
  }, []);

  const validateStep = (step: number): boolean => {
    const next: Errors = {};
    if (step === 0) {
      if (!Number.isFinite(numberOfRooms) || numberOfRooms <= 0) {
        next.numberOfRooms = "Number of rooms must be greater than 0.";
      }
      if (!Number.isFinite(adrYear1) || adrYear1 <= 0) {
        next.adrYear1 = "Year 1 ADR must be greater than 0.";
      }
      if (
        !Number.isFinite(adrInflationRate) ||
        adrInflationRate < 0 ||
        adrInflationRate > 25
      ) {
        next.adrInflation =
          "ADR inflation must be between 0% and 25% (typical annual uplift).";
      }
      if (
        !Number.isFinite(occupancyYear1) ||
        occupancyYear1 < 0 ||
        occupancyYear1 > 100
      ) {
        next.occupancyYear1 = "Year 1 occupancy must be between 0% and 100%.";
      }
      for (let i = 0; i < OPERATIONAL_ROOM_REVENUE_YEARS; i++) {
        const o = occupancyValues[i];
        if (!Number.isFinite(o) || o < 0 || o > 100) {
          next[`occ_${i}`] = `Year ${i + 1} occupancy must be 0–100%.`;
        }
        const a = adrValues[i];
        if (!Number.isFinite(a) || a <= 0) {
          next[`adr_${i}`] = `Year ${i + 1} ADR must be greater than 0.`;
        }
      }
    }
    if (step === 1) {
      if (!Number.isFinite(revPcts.rooms) || revPcts.rooms <= 0) {
        next.revPct_rooms =
          "Rooms % of total hotel revenue must be greater than 0.";
      }
      if (revPcts.rooms > 100) {
        next.revPct_rooms = "Rooms % cannot exceed 100%.";
      }
      for (const k of HOTEL_REVENUE_PCT_KEYS) {
        const v = revPcts[k];
        if (!Number.isFinite(v) || v < 0) {
          next[`revPct_${k}`] = `${REVENUE_STACK_LABELS[k]} % must be ≥ 0.`;
        }
        if (v > 100) {
          next[`revPct_${k}`] = `${REVENUE_STACK_LABELS[k]} % cannot exceed 100%.`;
        }
      }
      if (revenuePctSum < 99.5 || revenuePctSum > 100.5) {
        next.revPct_sum =
          `Revenue mix should sum to 100% (currently ${revenuePctSum.toFixed(1)}%). Adjust categories or reset to benchmark.`;
      }
    }
    if (step === 2) {
      for (const k of HOTEL_DIRECT_COST_PCT_KEYS) {
        const v = directCostPcts[k];
        if (!Number.isFinite(v) || v < 0) {
          next[`dcPct_${k}`] = `${DIRECT_COST_INPUT_LABELS[k]} % must be ≥ 0.`;
        }
        if (v > 100) {
          next[`dcPct_${k}`] = `${DIRECT_COST_INPUT_LABELS[k]} % cannot exceed 100%.`;
        }
      }
    }
    if (step === 3) {
      for (const k of HOTEL_EXPENSE_PCT_KEYS) {
        const v = expensePcts[k];
        if (!Number.isFinite(v) || v < 0) {
          next[`exPct_${k}`] = `${EXPENSE_INPUT_LABELS[k]} % must be ≥ 0.`;
        }
        if (v > 100) {
          next[`exPct_${k}`] = `${EXPENSE_INPUT_LABELS[k]} % cannot exceed 100%.`;
        }
      }
    }
    if (step === 4) {
      for (const k of HOTEL_DEPRECIATION_FIELD_KEYS) {
        const v = depFieldValues[k];
        const { min, max } = depreciationInputBounds(k);
        if (!Number.isFinite(v)) {
          next[`dep_${k}`] = `${DEPRECIATION_FIELD_LABELS[k]} must be a number.`;
        } else if (v < min || v > max) {
          next[`dep_${k}`] = `${DEPRECIATION_FIELD_LABELS[k]} must be between ${min} and ${max}.`;
        }
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === TOTAL_STEPS - 1) {
      router.push(withStreamPrefix(streamPrefix, "/preview/pnl"));
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    setErrors({});
  };

  const handleBack = () => {
    if (currentStep === 0) {
      router.push(withStreamPrefix(streamPrefix, "/preview/cash-outflows"));
    } else {
      setCurrentStep((s) => s - 1);
      setErrors({});
    }
  };

  const fieldError = (name: string) => errors[name];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 pb-32">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white">
            FinModel App — Component 2
          </h1>
          <p className="text-slate-400">Operating Financials</p>
        </div>

        <div className="mb-8">
          <div className="mb-2 flex justify-between text-sm text-slate-400">
            <span>
              Step {currentStep + 1} of {TOTAL_STEPS}
            </span>
            <span>
              {Math.round(((currentStep + 1) / TOTAL_STEPS) * 100)}% Complete
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-emerald-600 transition-all"
              style={{
                width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="space-y-8 rounded-xl border border-slate-800 bg-slate-900 p-8">
          {currentStep === 0 && (
            <div className="space-y-8">
              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">
                  Step 1 — Room Revenues
                </h2>
                <p className="text-sm text-slate-400">
                  Dubai business 4–5★ benchmarks as defaults. Adjust ADR
                  inflation to roll forward Years 2–10; edit any year to lock
                  that cell to your value. Manual cells use the same{" "}
                  <span className="text-amber-400/90">amber border</span> as
                  Component 1 Step 8.
                </p>
                {hasAnyOverride ? (
                  <p className="mt-3">
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                      Manual overrides
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Number of rooms (keys)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={numberOfRooms}
                    onChange={(e) =>
                      setNumberOfRooms(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("numberOfRooms") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("numberOfRooms")}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    ADR Year 1 ({currencyCode})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={adrYear1}
                    onChange={(e) =>
                      setAdrYear1(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("adrYear1") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("adrYear1")}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    ADR inflation (annual %)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={adrInflationRate}
                    onChange={(e) =>
                      setAdrInflationRate(Number(e.target.value) || 0)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("adrInflation") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("adrInflation")}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Occupancy Year 1 (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={occupancyYear1}
                    onChange={(e) => {
                      const v = Math.min(
                        100,
                        Math.max(0, Number(e.target.value) || 0)
                      );
                      setOccupancyOverrides((o) => {
                        const n = [...o];
                        n[0] = false;
                        return n;
                      });
                      setOccupancyYear1(v);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("occupancyYear1") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("occupancyYear1")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={resetAdrToFormula}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                >
                  Reset ADR to formula
                </button>
                <button
                  type="button"
                  onClick={resetOccupancyToDefaults}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                >
                  Reset occupancy to defaults
                </button>
                <p className="text-xs text-slate-500">
                  ADR formula: Year{" "}
                  <i>t</i> = Year 1 ADR × (1 + inflation%)
                  <sup>t − 1</sup>
                </p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/80 text-left text-slate-400">
                      <th className="px-3 py-3 font-medium">Year</th>
                      <th className="px-3 py-3 font-medium">
                        ADR ({currencyCode}){" "}
                        <span className="block text-[10px] font-normal normal-case text-slate-500">
                          amber = override
                        </span>
                      </th>
                      <th className="px-3 py-3 font-medium">
                        Occ %{" "}
                        <span className="block text-[10px] font-normal normal-case text-slate-500">
                          amber = override
                        </span>
                      </th>
                      <th className="px-3 py-3 font-medium text-right">
                        Room revenue ({currencyCode})
                      </th>
                      <th className="px-3 py-3 font-medium text-center">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: OPERATIONAL_ROOM_REVENUE_YEARS }, (_, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-800/80 text-slate-200"
                      >
                        <td className="px-3 py-2 font-medium text-slate-300">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={adrValues[i] ?? ""}
                            onChange={(e) => {
                              const v = Number(e.target.value) || 0;
                              setAdrOverrides((o) => {
                                const n = [...o];
                                n[i] = true;
                                return n;
                              });
                              setAdrValues((prev) => {
                                const n = [...prev];
                                n[i] = v;
                                return n;
                              });
                              if (i === 0) setAdrYear1(v);
                            }}
                            className={`w-full min-w-[100px] ${overrideFieldClass(adrOverrides[i])}`}
                          />
                          {fieldError(`adr_${i}`) && (
                            <p className="text-xs text-red-400">
                              {fieldError(`adr_${i}`)}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={occupancyValues[i] ?? ""}
                            onChange={(e) => {
                              const v = Math.min(
                                100,
                                Math.max(0, Number(e.target.value) || 0)
                              );
                              setOccupancyOverrides((o) => {
                                const n = [...o];
                                n[i] = true;
                                return n;
                              });
                              setOccupancyValues((prev) => {
                                const n = [...prev];
                                n[i] = v;
                                return n;
                              });
                              if (i === 0) setOccupancyYear1(v);
                            }}
                            className={`w-full min-w-[80px] ${overrideFieldClass(occupancyOverrides[i])}`}
                          />
                          {fieldError(`occ_${i}`) && (
                            <p className="text-xs text-red-400">
                              {fieldError(`occ_${i}`)}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-400/95">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: currencyCode,
                            maximumFractionDigits: 0,
                          }).format(roomRevenue[i] ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-slate-500">
                          {adrOverrides[i] ? (
                            <span className="text-amber-400/90">ADR override</span>
                          ) : (
                            "ADR auto"
                          )}
                          <br />
                          {occupancyOverrides[i] ? (
                            <span className="text-amber-400/90">Occ override</span>
                          ) : i === 0 ? (
                            "Occ from Y1"
                          ) : (
                            "Occ default"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-600 bg-slate-800/60 text-sm font-semibold text-white">
                      <td className="px-3 py-3" colSpan={3}>
                        10-year total (room revenue)
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-emerald-400">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: currencyCode,
                          maximumFractionDigits: 0,
                        }).format(tenYearRoomRevenueTotal)}
                      </td>
                      <td className="px-3 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <RoomRevenueBarChart data={chartData} currencyCode={currencyCode} />
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-8">
              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">
                  Step 2 — F&B and Other Sources of Revenues
                </h2>
                <p className="text-sm text-slate-400">
                  Room revenue from Step 1 drives total hotel revenue:{" "}
                  <span className="text-slate-300">
                    total = room revenue ÷ (rooms % ÷ 100)
                  </span>
                  . Other streams are total × each category %. Defaults follow
                  your hotel segment and location (same region logic as
                  development cost benchmarks). Manual % cells use the{" "}
                  <span className="text-amber-400/90">amber border</span>.
                </p>
                {hasAnyRevPctOverride ? (
                  <p className="mt-3">
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                      Manual overrides
                    </span>
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-slate-500">
                  Profile:{" "}
                  <span className="font-mono text-slate-400">
                    {revenueProfileKey}
                  </span>
                  <span className="mx-2 text-slate-600">·</span>
                  {revenueProfileSource}
                </p>
              </div>

              <div className="grid gap-4 rounded-lg border border-slate-700/80 bg-slate-800/30 p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    From Step 1 — Year 1 room revenue
                  </p>
                  <p className="mt-1 font-mono text-lg text-emerald-400/95">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: currencyCode,
                      maximumFractionDigits: 0,
                    }).format(roomRevenue[0] ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    From Step 1 — 10-year room revenue total
                  </p>
                  <p className="mt-1 font-mono text-lg text-emerald-400/95">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: currencyCode,
                      maximumFractionDigits: 0,
                    }).format(tenYearRoomRevenueTotal)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={resetRevenuePctsToBenchmark}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                >
                  Reset % to benchmark
                </button>
                <p className="text-xs text-slate-500">
                  Sum of categories:{" "}
                  <span
                    className={
                      revenuePctSum >= 99.5 && revenuePctSum <= 100.5
                        ? "text-slate-300"
                        : "text-amber-400/90"
                    }
                  >
                    {revenuePctSum.toFixed(1)}%
                  </span>
                  {revenuePctSum < 99.5 || revenuePctSum > 100.5
                    ? " — target 100%"
                    : null}
                </p>
              </div>

              {errors.revPct_sum && (
                <p className="text-sm text-red-400">{errors.revPct_sum}</p>
              )}

              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/80 text-left text-slate-400">
                      <th className="px-3 py-3 font-medium">Stream</th>
                      <th className="px-3 py-3 font-medium">
                        % of total hotel revenue
                        <span className="mt-1 block text-[10px] font-normal normal-case text-slate-500">
                          amber = override
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {HOTEL_REVENUE_PCT_KEYS.map((k) => (
                      <tr
                        key={k}
                        className="border-b border-slate-800/80 text-slate-200"
                      >
                        <td className="px-3 py-2 font-medium text-slate-300">
                          {REVENUE_STACK_LABELS[k]}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={revPcts[k] ?? ""}
                            onChange={(e) => {
                              const v = Math.min(
                                100,
                                Math.max(0, Number(e.target.value) || 0)
                              );
                              setRevPctOverrides((o) => ({
                                ...o,
                                [k]: true,
                              }));
                              setRevPcts((prev) => ({ ...prev, [k]: v }));
                            }}
                            className={`w-full min-w-[100px] max-w-[140px] ${overrideFieldClass(revPctOverrides[k])}`}
                          />
                          {errors[`revPct_${k}`] && (
                            <p className="mt-1 text-xs text-red-400">
                              {errors[`revPct_${k}`]}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 10-Year Total Revenue Summary Table */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-white">
                  10-Year Total Hotel Revenue Projection
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="px-4 py-3 text-left font-medium text-slate-300">
                          Year
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-slate-300">
                          Total Hotel Revenue ({currencyCode})
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-slate-300">
                          Room Revenue ({currencyCode})
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-slate-300">
                          Other Revenue ({currencyCode})
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-slate-300">
                          YoY Growth
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(
                        { length: OPERATIONAL_ROOM_REVENUE_YEARS },
                        (_, year) => {
                          const total = totalHotelRevenue[year] ?? 0;
                          const room = revenueByStream.rooms[year] ?? 0;
                          const other = total - room;
                          const prevTotal =
                            year === 0
                              ? total
                              : (totalHotelRevenue[year - 1] ?? 0);
                          const growth =
                            year === 0 || prevTotal === 0
                              ? null
                              : ((total - prevTotal) / prevTotal) * 100;

                          return (
                            <tr
                              key={year}
                              className="border-b border-slate-700/50 hover:bg-slate-800/30"
                            >
                              <td className="px-4 py-3 font-medium text-slate-300">
                                Year {year + 1}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                                {Math.round(total).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-300">
                                {Math.round(room).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-400">
                                {Math.round(other).toLocaleString()}
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-mono ${
                                  growth == null
                                    ? "text-slate-500"
                                    : growth >= 0
                                      ? "text-emerald-400"
                                      : "text-red-400"
                                }`}
                              >
                                {growth == null
                                  ? "—"
                                  : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-600 bg-slate-800/50">
                        <td className="px-4 py-3 font-semibold text-white">
                          10-Year Total
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                          {Math.round(
                            totalHotelRevenue.reduce((a, b) => a + b, 0)
                          ).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-300">
                          {Math.round(
                            revenueByStream.rooms.reduce((a, b) => a + b, 0)
                          ).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-400">
                          {revenueByStream.rooms.reduce((a, b) => a + b, 0) >
                          0
                            ? Math.round(
                                totalHotelRevenue.reduce((a, b) => a + b, 0) -
                                  revenueByStream.rooms.reduce(
                                    (a, b) => a + b,
                                    0
                                  )
                              ).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          —
                        </td>
                      </tr>

                      <tr className="border-t border-slate-700 bg-slate-900/30">
                        <td className="px-4 py-3 text-sm text-slate-400">
                          Average Annual
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-slate-300">
                          {Math.round(
                            totalHotelRevenue.reduce((a, b) => a + b, 0) /
                              OPERATIONAL_ROOM_REVENUE_YEARS
                          ).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-slate-400">
                          {Math.round(
                            revenueByStream.rooms.reduce((a, b) => a + b, 0) /
                              OPERATIONAL_ROOM_REVENUE_YEARS
                          ).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-slate-400">
                          {Math.round(
                            (totalHotelRevenue.reduce((a, b) => a + b, 0) -
                              revenueByStream.rooms.reduce(
                                (a, b) => a + b,
                                0
                              )) /
                              OPERATIONAL_ROOM_REVENUE_YEARS
                          ).toLocaleString()}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 md:grid-cols-4">
                  <div className="rounded-lg bg-slate-800/50 p-3">
                    <p className="text-xs text-slate-400">Year 1 Total</p>
                    <p className="text-lg font-mono text-emerald-400">
                      {`${currencyCode} ${((totalHotelRevenue[0] ?? 0) / 1_000_000).toFixed(2)}M`}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-3">
                    <p className="text-xs text-slate-400">Year 10 Total</p>
                    <p className="text-lg font-mono text-emerald-400">
                      {`${currencyCode} ${((totalHotelRevenue[OPERATIONAL_ROOM_REVENUE_YEARS - 1] ?? 0) / 1_000_000).toFixed(2)}M`}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-3">
                    <p className="text-xs text-slate-400">10-Year CAGR</p>
                    <p className="text-lg font-mono text-emerald-400">
                      {(totalHotelRevenue[0] ?? 0) > 0 &&
                      (totalHotelRevenue[
                        OPERATIONAL_ROOM_REVENUE_YEARS - 1
                      ] ?? 0) > 0
                        ? `${(
                            (Math.pow(
                              (totalHotelRevenue[
                                OPERATIONAL_ROOM_REVENUE_YEARS - 1
                              ] ?? 0) / (totalHotelRevenue[0] ?? 1),
                              1 / (OPERATIONAL_ROOM_REVENUE_YEARS - 1)
                            ) -
                              1) *
                            100
                          ).toFixed(1)}%`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-3">
                    <p className="text-xs text-slate-400">Room Revenue Share</p>
                    <p className="text-lg font-mono text-slate-300">
                      {revenuePercentages.rooms.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <HotelTotalRevenueStackedChart
                data={totalHotelRevenueStackedData}
                currencyCode={currencyCode}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">
                  Step 3 — Direct costs
                </h2>
                <p className="text-sm text-slate-400">
                  Revenue streams from Step 2 drive direct costs: each line is
                  revenue × cost % for that department. F&B payroll and other
                  apply to combined food + beverage + room service revenue.
                  Defaults match your hotel segment and location. Manual %
                  cells use the{" "}
                  <span className="text-amber-400/90">amber border</span>.
                </p>
                {hasAnyDirectCostPctOverride ? (
                  <p className="mt-3">
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                      Manual overrides
                    </span>
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-slate-500">
                  Profile:{" "}
                  <span className="font-mono text-slate-400">
                    {directCostProfileKey}
                  </span>
                  <span className="mx-2 text-slate-600">·</span>
                  {directCostProfileSource}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={resetDirectCostsToBenchmark}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                >
                  Reset % to benchmark
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/80 text-left text-slate-400">
                      <th className="px-3 py-3 font-medium">
                        Cost line
                        <span className="mt-1 block text-[10px] font-normal normal-case text-slate-500">
                          basis in Step 2 revenue
                        </span>
                      </th>
                      <th className="px-3 py-3 font-medium">
                        Cost %
                        <span className="mt-1 block text-[10px] font-normal normal-case text-slate-500">
                          amber = override
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {HOTEL_DIRECT_COST_PCT_KEYS.map((k) => (
                      <tr
                        key={k}
                        className="border-b border-slate-800/80 text-slate-200"
                      >
                        <td className="px-3 py-2">
                          <span className="font-medium text-slate-300">
                            {DIRECT_COST_INPUT_LABELS[k]}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {DIRECT_COST_BASE_HELP[k]}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={directCostPcts[k] ?? ""}
                            onChange={(e) => {
                              const v = Math.min(
                                100,
                                Math.max(0, Number(e.target.value) || 0)
                              );
                              setDirectCostPctOverrides((o) => ({
                                ...o,
                                [k]: true,
                              }));
                              setDirectCostPcts((prev) => ({
                                ...prev,
                                [k]: v,
                              }));
                            }}
                            className={`w-full min-w-[100px] max-w-[140px] ${overrideFieldClass(directCostPctOverrides[k])}`}
                          />
                          {errors[`dcPct_${k}`] && (
                            <p className="mt-1 text-xs text-red-400">
                              {errors[`dcPct_${k}`]}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4">
                <h4 className="text-md font-medium text-white">
                  10-Year Direct Costs Projection
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                  <table className="w-full min-w-[360px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/80 text-slate-400">
                        <th className="px-4 py-3 text-left font-medium">
                          Year
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Direct costs ({currencyCode})
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          YoY growth
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyDirectCostTotals.map((total, year) => {
                        const prevTotal =
                          year === 0
                            ? total
                            : (yearlyDirectCostTotals[year - 1] ?? 0);
                        const growth =
                          year === 0 || prevTotal === 0
                            ? null
                            : ((total - prevTotal) / prevTotal) * 100;
                        return (
                          <tr
                            key={year}
                            className="border-b border-slate-800/80 text-slate-200"
                          >
                            <td className="px-4 py-3 font-medium text-slate-300">
                              Year {year + 1}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-amber-400/95">
                              {Math.round(total).toLocaleString()}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-mono ${
                                growth == null
                                  ? "text-slate-500"
                                  : growth >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                              }`}
                            >
                              {growth == null
                                ? "—"
                                : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-600 bg-slate-800/50">
                        <td className="px-4 py-3 font-semibold text-white">
                          10-year total
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-amber-400/95">
                          {Math.round(
                            yearlyDirectCostTotals.reduce((a, b) => a + b, 0)
                          ).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          —
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <DirectCostsStackedChart
                data={directCostStackedData}
                currencyCode={currencyCode}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-8">
              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">
                  Step 4 — Undistributed & fixed expenses
                </h2>
                <p className="text-sm text-slate-400">
                  Undistributed lines use total hotel revenue from Step 2; base
                  management uses room revenue. Incentive fee uses EBITDA before
                  incentive; when the fee is a % of net EBITDA (after the fee),
                  we solve{" "}
                  <span className="font-mono text-slate-300">
                    fee = r ÷ (1 + r) × EBITDA₀
                  </span>
                  . Direct costs from Step 3 feed into that EBITDA. Manual %
                  cells use the{" "}
                  <span className="text-amber-400/90">amber border</span>.
                </p>
                {hasAnyExpensePctOverride ? (
                  <p className="mt-3">
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                      Manual overrides
                    </span>
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-slate-500">
                  Profile:{" "}
                  <span className="font-mono text-slate-400">
                    {expenseProfileKey}
                  </span>
                  <span className="mx-2 text-slate-600">·</span>
                  {expenseProfileSource}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={resetExpensesToBenchmark}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                >
                  Reset % to benchmark
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/80 text-left text-slate-400">
                      <th className="px-3 py-3 font-medium">
                        Expense line
                        <span className="mt-1 block text-[10px] font-normal normal-case text-slate-500">
                          revenue basis
                        </span>
                      </th>
                      <th className="px-3 py-3 font-medium">
                        %
                        <span className="mt-1 block text-[10px] font-normal normal-case text-slate-500">
                          amber = override
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {HOTEL_EXPENSE_PCT_KEYS.map((k) => (
                      <tr
                        key={k}
                        className="border-b border-slate-800/80 text-slate-200"
                      >
                        <td className="px-3 py-2">
                          <span className="font-medium text-slate-300">
                            {EXPENSE_INPUT_LABELS[k]}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {EXPENSE_BASE_HELP[k]}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={expensePcts[k] ?? ""}
                            onChange={(e) => {
                              const v = Math.min(
                                100,
                                Math.max(0, Number(e.target.value) || 0)
                              );
                              setExpensePctOverrides((o) => ({
                                ...o,
                                [k]: true,
                              }));
                              setExpensePcts((prev) => ({
                                ...prev,
                                [k]: v,
                              }));
                            }}
                            className={`w-full min-w-[100px] max-w-[140px] ${overrideFieldClass(expensePctOverrides[k])}`}
                          />
                          {errors[`exPct_${k}`] && (
                            <p className="mt-1 text-xs text-red-400">
                              {errors[`exPct_${k}`]}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4">
                <h4 className="text-md font-medium text-white">
                  10-Year Total Expenses Projection
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/80 text-slate-400">
                        <th className="px-3 py-3 text-left font-medium">
                          Year
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Total ({currencyCode})
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Direct ({currencyCode})
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Undist. ({currencyCode})
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Fixed ({currencyCode})
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          YoY growth
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyTotalExpenseBreakdown.map((row, year) => {
                        const prev =
                          year === 0
                            ? row.total
                            : (yearlyTotalExpenseBreakdown[year - 1]?.total ??
                              0);
                        const growth =
                          year === 0 || prev === 0
                            ? null
                            : ((row.total - prev) / prev) * 100;
                        return (
                          <tr
                            key={year}
                            className="border-b border-slate-800/80 text-slate-200"
                          >
                            <td className="px-3 py-3 font-medium text-slate-300">
                              Year {year + 1}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-semibold text-rose-300/95">
                              {Math.round(row.total).toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-300">
                              {Math.round(row.direct).toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-400">
                              {Math.round(row.undistributed).toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-400">
                              {Math.round(row.fixed).toLocaleString()}
                            </td>
                            <td
                              className={`px-3 py-3 text-right font-mono ${
                                growth == null
                                  ? "text-slate-500"
                                  : growth >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                              }`}
                            >
                              {growth == null
                                ? "—"
                                : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-600 bg-slate-800/50">
                        <td className="px-3 py-3 font-semibold text-white">
                          10-year total
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-rose-300/95">
                          {Math.round(
                            yearlyTotalExpenseBreakdown.reduce(
                              (s, r) => s + r.total,
                              0
                            )
                          ).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-300">
                          {Math.round(
                            yearlyTotalExpenseBreakdown.reduce(
                              (s, r) => s + r.direct,
                              0
                            )
                          ).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-400">
                          {Math.round(
                            yearlyTotalExpenseBreakdown.reduce(
                              (s, r) => s + r.undistributed,
                              0
                            )
                          ).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-400">
                          {Math.round(
                            yearlyTotalExpenseBreakdown.reduce(
                              (s, r) => s + r.fixed,
                              0
                            )
                          ).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-500">
                          —
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <TotalOperatingExpenseStackedChart
                data={totalExpenseStackedData}
                currencyCode={currencyCode}
              />
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-8">
              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">
                  Step 5 — Depreciation & working capital
                </h2>
                <p className="text-sm text-slate-400">
                  Construction and FFE bases come from Component 1 (operational
                  stream). FFE is straight-line over its useful life; from Year
                  6 an extra FFE tranche equal to the renovation % of initial
                  FFE is capitalized and amortized over the same life. Working
                  capital uses Step 2 revenue and Step 4 total opex. Manual
                  fields use the{" "}
                  <span className="text-amber-400/90">amber border</span>.
                </p>
                {hasAnyDepreciationFieldOverride ? (
                  <p className="mt-3">
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                      Manual overrides
                    </span>
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-slate-500">
                  Profile:{" "}
                  <span className="font-mono text-slate-400">
                    {depreciationProfileKey}
                  </span>
                  <span className="mx-2 text-slate-600">·</span>
                  {depreciationProfileSource}
                </p>
              </div>

              <div className="grid gap-4 rounded-lg border border-slate-700/80 bg-slate-800/30 p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Component 1 — Construction cost (depreciation base)
                  </p>
                  <p className="mt-1 font-mono text-lg text-slate-200">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: currencyCode,
                      maximumFractionDigits: 0,
                    }).format(Math.max(0, cashOutflows.constructionCost || 0))}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Component 1 — FFE (depreciation base)
                  </p>
                  <p className="mt-1 font-mono text-lg text-slate-200">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: currencyCode,
                      maximumFractionDigits: 0,
                    }).format(Math.max(0, cashOutflows.ffe || 0))}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={resetDepreciationToBenchmark}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                >
                  Reset to benchmark
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/80 text-left text-slate-400">
                      <th className="px-3 py-3 font-medium">
                        Assumption
                        <span className="mt-1 block text-[10px] font-normal normal-case text-slate-500">
                          amber = override
                        </span>
                      </th>
                      <th className="px-3 py-3 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HOTEL_DEPRECIATION_FIELD_KEYS.map((k) => {
                      const { min, max, step } = depreciationInputBounds(k);
                      const unit =
                        k === "ffeRenovationRate"
                          ? "%"
                          : k === "accountsReceivableMonths" ||
                              k === "accountsPayableMonths"
                            ? "mo"
                            : "yrs";
                      return (
                        <tr
                          key={k}
                          className="border-b border-slate-800/80 text-slate-200"
                        >
                          <td className="px-3 py-2">
                            <span className="font-medium text-slate-300">
                              {DEPRECIATION_FIELD_LABELS[k]}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {DEPRECIATION_FIELD_HELP[k]}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={min}
                                max={max}
                                step={step}
                                value={depFieldValues[k] ?? ""}
                                onChange={(e) => {
                                  const raw = Number(e.target.value);
                                  const v = Number.isFinite(raw)
                                    ? Math.min(
                                        max,
                                        Math.max(min, raw)
                                      )
                                    : min;
                                  setDepFieldOverrides((o) => ({
                                    ...o,
                                    [k]: true,
                                  }));
                                  setDepFieldValues((prev) => ({
                                    ...prev,
                                    [k]: v,
                                  }));
                                }}
                                className={`w-full min-w-[100px] max-w-[140px] ${overrideFieldClass(depFieldOverrides[k])}`}
                              />
                              <span className="text-xs text-slate-500">
                                {unit}
                              </span>
                            </div>
                            {errors[`dep_${k}`] && (
                              <p className="mt-1 text-xs text-red-400">
                                {errors[`dep_${k}`]}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4">
                <h4 className="text-md font-medium text-white">
                  10-Year depreciation & working capital
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                  <table className="w-full min-w-[880px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/80 text-slate-400">
                        <th className="px-3 py-3 text-left font-medium">
                          Year
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Const. dep. ({currencyCode})
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          FFE dep. ({currencyCode})
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Total dep. ({currencyCode})
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          A/R ({currencyCode})
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          A/P ({currencyCode})
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Net WC ({currencyCode})
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyDepreciationWcRows.map((row) => (
                        <tr
                          key={row.yearIndex}
                          className="border-b border-slate-800/80 text-slate-200"
                        >
                          <td className="px-3 py-2 font-medium text-slate-300">
                            {row.label}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-300">
                            {Math.round(row.constructionDep).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-300">
                            {Math.round(row.ffeDep).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-violet-300/95">
                            {Math.round(row.totalDep).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-sky-300/90">
                            {Math.round(row.ar).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-sky-400/80">
                            {Math.round(row.ap).toLocaleString()}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-mono font-medium ${
                              row.netWc >= 0
                                ? "text-emerald-400/90"
                                : "text-amber-400/90"
                            }`}
                          >
                            {Math.round(row.netWc).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <PreviewFloatingBar
        showDownload={false}
        onPreviousClick={handleBack}
        onNextClick={handleNext}
        nextLabel={
          currentStep === TOTAL_STEPS - 1
            ? "Generate P&L →"
            : "Next →"
        }
      />
    </div>
  );
}
