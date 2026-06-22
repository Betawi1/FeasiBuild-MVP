import {
  HOTEL_DEPRECIATION_PROFILES,
  resolveHotelDepreciationProfile,
  valuesFromDepreciationProfile,
  type HotelDepreciationFieldKey,
} from "@/config/hotel-depreciation-profiles";
import {
  HOTEL_DIRECT_COST_PROFILES,
  pctsFromDirectCostProfile,
  resolveHotelDirectCostProfile,
  type HotelDirectCostPctKey,
} from "@/config/hotel-direct-cost-profiles";
import {
  HOTEL_EXPENSE_PROFILES,
  pctsFromExpenseProfile,
  resolveHotelExpenseProfile,
  type HotelExpensePctKey,
} from "@/config/hotel-expense-profiles";
import type { OperationalHotelHoldSnapshot } from "@/lib/operational-pnl";
import type {
  FeasibilityProjectBundle,
  OperationalExpenseRow,
  OperationalExpensesData,
} from "@/types/feasibility";
import type { ProjectInfo } from "@/store/useFinModelStore";

function roundPct(n: number): number {
  return Math.round(n * 10) / 10;
}

function row(
  item: string,
  index: string,
  percentage: number
): OperationalExpenseRow {
  return { item, index, percentage: roundPct(percentage) };
}

function coerceDirectPcts(
  snapshot?: OperationalHotelHoldSnapshot | null
): Record<HotelDirectCostPctKey, number> {
  return {
    ...pctsFromDirectCostProfile(HOTEL_DIRECT_COST_PROFILES.default),
    ...(snapshot?.directCostPcts ?? {}),
  } as Record<HotelDirectCostPctKey, number>;
}

function coerceExpensePcts(
  snapshot?: OperationalHotelHoldSnapshot | null
): Record<HotelExpensePctKey, number> {
  return {
    ...pctsFromExpenseProfile(HOTEL_EXPENSE_PROFILES.default),
    ...(snapshot?.expensePcts ?? {}),
  } as Record<HotelExpensePctKey, number>;
}

function coerceDepFields(
  snapshot?: OperationalHotelHoldSnapshot | null
): Record<HotelDepreciationFieldKey, number> {
  return {
    ...valuesFromDepreciationProfile(HOTEL_DEPRECIATION_PROFILES.default),
    ...(snapshot?.depFieldValues ?? {}),
  } as Record<HotelDepreciationFieldKey, number>;
}

function resolveProfileDefaults(projectInfo?: Pick<
  ProjectInfo,
  "hotelOperatingType" | "hotelStarRating" | "country" | "city" | "buildingType"
>): {
  direct: Record<HotelDirectCostPctKey, number>;
  expense: Record<HotelExpensePctKey, number>;
  dep: Record<HotelDepreciationFieldKey, number>;
} {
  const star = Number(projectInfo?.hotelStarRating);
  const hotelType = (projectInfo?.hotelOperatingType || "business") as
    | "business"
    | "resort";

  if (
    projectInfo?.buildingType === "hotel" &&
    projectInfo.country &&
    projectInfo.city &&
    Number.isFinite(star) &&
    star > 0
  ) {
    const directProfile = resolveHotelDirectCostProfile(
      hotelType,
      star,
      projectInfo.country,
      projectInfo.city
    ).profile;
    const expenseProfile = resolveHotelExpenseProfile(
      hotelType,
      star,
      projectInfo.country,
      projectInfo.city
    ).profile;
    const depProfile = resolveHotelDepreciationProfile(
      hotelType,
      star,
      projectInfo.country,
      projectInfo.city
    ).profile;
    return {
      direct: pctsFromDirectCostProfile(directProfile),
      expense: pctsFromExpenseProfile(expenseProfile),
      dep: valuesFromDepreciationProfile(depProfile),
    };
  }

  return {
    direct: pctsFromDirectCostProfile(HOTEL_DIRECT_COST_PROFILES.default),
    expense: pctsFromExpenseProfile(HOTEL_EXPENSE_PROFILES.default),
    dep: valuesFromDepreciationProfile(HOTEL_DEPRECIATION_PROFILES.default),
  };
}

function buildDirectCosts(
  p: Record<HotelDirectCostPctKey, number>
): OperationalExpensesData["directCosts"] {
  return {
    rooms: [
      row("Payroll and Related Expenses", "% of room revenues", p.roomsPayroll),
      row("Other Rooms Costs", "% of room revenues", p.roomsOther),
    ],
    fAndB: [
      row("Food - Cost of Sale", "% of food revenues", p.foodCostOfSale),
      row(
        "Beverage - Cost of Sale",
        "% of beverage revenues",
        p.beverageCostOfSale
      ),
      row("Payroll and Related Expenses", "% of F&B revenues", p.fbPayroll),
      row("Other F&B Costs", "% of F&B revenues", p.fbOther),
    ],
    otherDepartments: [
      row(
        "Telecommunications",
        "% of telecommunications revenues",
        p.telecomCost
      ),
      row(
        "Health & Leisure",
        "% of health & leisure revenues",
        p.healthLeisureCost
      ),
      row(
        "Other Departments",
        "% of rental and other department revenues",
        p.otherDeptsCost
      ),
    ],
  };
}

export function buildOperationalExpensesData(
  _bundle: FeasibilityProjectBundle,
  hotelHoldSnapshot?: OperationalHotelHoldSnapshot | null,
  projectInfo?: Pick<
    ProjectInfo,
    "hotelOperatingType" | "hotelStarRating" | "country" | "city" | "buildingType"
  >
): OperationalExpensesData {
  const profiles = resolveProfileDefaults(projectInfo);
  const direct = {
    ...profiles.direct,
    ...coerceDirectPcts(hotelHoldSnapshot),
  };
  const expense = {
    ...profiles.expense,
    ...coerceExpensePcts(hotelHoldSnapshot),
  };
  const dep = {
    ...profiles.dep,
    ...coerceDepFields(hotelHoldSnapshot),
  };

  return {
    title: "Financial Analysis",
    subtitle: "Operational Assumptions - Expenses",
    workingCapital: {
      accountsReceivable: dep.accountsReceivableMonths,
      accountsPayable: dep.accountsPayableMonths,
    },
    depreciation: {
      construction: dep.constructionUsefulLife,
      furnitureAndEquipment: dep.ffeUsefulLife,
    },
    fixedExpenses: [
      row(
        "Base Management Fee",
        "% of room revenues",
        expense.baseManagementFee
      ),
      row("Incentive Fee", "% of EBITDA", expense.incentiveFee),
      row(
        "Renovation Provision - Year 1",
        "% of total revenues",
        expense.renovationProvisionY1
      ),
      row(
        "Renovation Provision - Year 2",
        "% of total revenues",
        expense.renovationProvisionY2
      ),
      row(
        "Renovation Provision - Year 3",
        "% of total revenues",
        expense.renovationProvisionY3to10
      ),
    ],
    undistributedExpenses: [
      row("G&A Expenses", "% of total revenues", expense.gaExpenses),
      row(
        "Marketing and Sales Expenses",
        "% of total revenues",
        expense.marketingSales
      ),
      row(
        "Property Operations & Maintenance",
        "% of total revenues",
        expense.propertyOpsMaintenance
      ),
      row("Utilities", "% of total revenues", expense.utilities),
    ],
    directCosts: buildDirectCosts(direct),
  };
}

function inferHotelOperatingType(segment: string): "business" | "resort" {
  return segment.toLowerCase().includes("resort") ? "resort" : "business";
}

export function buildOperationalExpensesFromBundle(
  bundle: FeasibilityProjectBundle
): OperationalExpensesData {
  const starRaw = bundle.aggregate.starRating.replace(/[^\d.]/g, "");
  const star = Number(starRaw);
  return buildOperationalExpensesData(bundle, null, {
    buildingType: "hotel",
    hotelOperatingType: inferHotelOperatingType(bundle.aggregate.segment),
    hotelStarRating: Number.isFinite(star) && star > 0 ? String(star) : "5",
    country: bundle.location.country,
    city: bundle.location.city,
  });
}

export function isOperationalExpensesData(
  data: unknown
): data is OperationalExpensesData {
  return (
    !!data &&
    typeof data === "object" &&
    "directCosts" in data &&
    "workingCapital" in data
  );
}
