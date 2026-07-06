"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchParamsBoundary from "@/components/SearchParamsBoundary";
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
import HotelRevenueStep, {
  getOperationalHotelHoldSnapshot,
  useHotelRoomRevenueFromStore,
  validateHotelRevenueStep,
} from "./steps/HotelRevenueStep";
import RetailDepreciationStep, {
  buildRetailDepreciationFromSnapshot,
  validateRetailDepreciationStep,
} from "./steps/RetailDepreciationStep";
import RetailOpexStep, {
  buildRetailOpexFromSnapshot,
  validateRetailOpexStep,
} from "./steps/RetailOpexStep";
import RetailOtherIncomeStep, {
  validateRetailOtherIncomeStep,
} from "./steps/RetailOtherIncomeStep";
import OfficeOtherIncomeStep, {
  validateOfficeOtherIncomeStep,
} from "./steps/OfficeOtherIncomeStep";
import OfficeDepreciationStep, {
  buildOfficeDepreciationFromSnapshot,
  validateOfficeDepreciationStep,
} from "./steps/OfficeDepreciationStep";
import OfficeOpexStep, {
  buildOfficeOpexFromSnapshot,
  validateOfficeOpexStep,
} from "./steps/OfficeOpexStep";
import OfficeRevenueStep, {
  getOperationalOfficeHoldSnapshot,
  validateOfficeRevenueStep,
} from "./steps/OfficeRevenueStep";
import RetailRevenueStep, {
  getOperationalRetailHoldSnapshot,
  validateRetailRevenueStep,
} from "./steps/RetailRevenueStep";
import ResidentialRevenueStep, {
  getOperationalResidentialHoldSnapshot,
  validateResidentialRevenueStep,
} from "./steps/ResidentialRevenueStep";
import ResidentialOtherIncomeStep, {
  validateResidentialOtherIncomeStep,
} from "./steps/ResidentialOtherIncomeStep";
import ResidentialOpexStep, {
  buildResidentialOpexFromSnapshot,
  validateResidentialOpexStep,
} from "./steps/ResidentialOpexStep";
import ResidentialDepreciationStep, {
  buildResidentialDepreciationFromSnapshot,
  validateResidentialDepreciationStep,
} from "./steps/ResidentialDepreciationStep";
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
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import { logBenchmarkValues, logResetToBenchmark } from "@/lib/audit-batch";
import { logAuditChange } from "@/lib/audit-utils";
import {
  CASH_INFLOWS_COMPONENT,
  cashInflowAuditRoute,
} from "@/lib/operational-audit-fields";
import { useStreamPrefix, withStreamPrefix } from "@/lib/stream-path";
import type { OperationalHotelHoldSnapshot } from "@/lib/operational-pnl";

const HOTEL_STEP2_TITLE = "Step 2: F&B and Other Sources of Revenues";
const HOTEL_STEP3_TITLE = "Step 3: Direct costs";
const HOTEL_STEP4_TITLE = "Step 4: Undistributed & fixed expenses";
const HOTEL_STEP5_TITLE = "Step 5: Depreciation & working capital";

/** Wizard length: retail 4 steps, hotel (and other hold types) 5 steps. */
function totalStepsForBuildingType(
  buildingType: ProjectInfo["buildingType"] | undefined
): number {
  if (buildingType === "retail") return 4;
  if (buildingType === "office") return 4;
  if (buildingType === "residential") return 4;
  return 5;
}

const PROFILE_DEFAULTS: Record<
  string,
  {
    adrBenchmark: number;
    occupancyBenchmark: number;
    regionBucket: string;
  }
> = {
  "United Arab Emirates:Dubai:Business:5": {
    adrBenchmark: 650,
    occupancyBenchmark: 75,
    regionBucket: "dubai",
  },
  "United Arab Emirates:Dubai:Resort:5": {
    adrBenchmark: 950,
    occupancyBenchmark: 68,
    regionBucket: "dubai",
  },
  "United Arab Emirates:Abu Dhabi:Business:5": {
    adrBenchmark: 600,
    occupancyBenchmark: 70,
    regionBucket: "abudhabi",
  },
  "United Arab Emirates:Abu Dhabi:Resort:5": {
    adrBenchmark: 800,
    occupancyBenchmark: 65,
    regionBucket: "abudhabi",
  },
};

// F&B and Other Revenue Benchmarks (% of Total Hotel Revenue)
// Sources: HVS Resort Development Cost Survey, STR, HVS Global, CBRE Hotels
const STEP2_PROFILE_DEFAULTS: Record<
  string,
  {
    roomsPercent: number;
    foodPercent: number;
    beveragePercent: number;
    roomServicePercent: number;
    telecomPercent: number;
    spaPercent: number;
    rentalPercent: number;
  }
> = {
  // === UNITED ARAB EMIRATES ===
  "United Arab Emirates:Dubai:Business:5": {
    roomsPercent: 60,
    foodPercent: 20,
    beveragePercent: 8,
    roomServicePercent: 1.5,
    telecomPercent: 0.5,
    spaPercent: 7,
    rentalPercent: 3,
  },
  "United Arab Emirates:Dubai:Resort:5": {
    roomsPercent: 55,
    foodPercent: 22,
    beveragePercent: 10,
    roomServicePercent: 2,
    telecomPercent: 0.5,
    spaPercent: 8,
    rentalPercent: 2.5,
  },
  "United Arab Emirates:Dubai:Business:4": {
    roomsPercent: 65,
    foodPercent: 18,
    beveragePercent: 7,
    roomServicePercent: 1,
    telecomPercent: 1,
    spaPercent: 5,
    rentalPercent: 3,
  },
  "United Arab Emirates:Abu Dhabi:Business:5": {
    roomsPercent: 60,
    foodPercent: 20,
    beveragePercent: 8,
    roomServicePercent: 1.5,
    telecomPercent: 0.5,
    spaPercent: 7,
    rentalPercent: 3,
  },
  "United Arab Emirates:Abu Dhabi:Resort:5": {
    roomsPercent: 55,
    foodPercent: 22,
    beveragePercent: 10,
    roomServicePercent: 2,
    telecomPercent: 0.5,
    spaPercent: 8,
    rentalPercent: 2.5,
  },
  "United Arab Emirates:Abu Dhabi:Business:4": {
    roomsPercent: 65,
    foodPercent: 18,
    beveragePercent: 7,
    roomServicePercent: 1,
    telecomPercent: 1,
    spaPercent: 5,
    rentalPercent: 3,
  },

  // === SAUDI ARABIA ===
  "Saudi Arabia:Riyadh:Business:5": {
    roomsPercent: 62,
    foodPercent: 18,
    beveragePercent: 7,
    roomServicePercent: 1.5,
    telecomPercent: 0.5,
    spaPercent: 6,
    rentalPercent: 4,
  },
  "Saudi Arabia:Riyadh:Business:4": {
    roomsPercent: 67,
    foodPercent: 16,
    beveragePercent: 6,
    roomServicePercent: 1,
    telecomPercent: 1,
    spaPercent: 4,
    rentalPercent: 4,
  },
  "Saudi Arabia:Jeddah:Business:5": {
    roomsPercent: 60,
    foodPercent: 20,
    beveragePercent: 8,
    roomServicePercent: 1.5,
    telecomPercent: 0.5,
    spaPercent: 6,
    rentalPercent: 4,
  },
  "Saudi Arabia:Makkah:Business:5": {
    roomsPercent: 65,
    foodPercent: 18,
    beveragePercent: 6,
    roomServicePercent: 1,
    telecomPercent: 0.5,
    spaPercent: 5,
    rentalPercent: 4,
  },

  // === MALAYSIA ===
  "Malaysia:Kuala Lumpur:Business:5": {
    roomsPercent: 60,
    foodPercent: 18,
    beveragePercent: 8,
    roomServicePercent: 1.5,
    telecomPercent: 0.5,
    spaPercent: 7,
    rentalPercent: 4,
  },
  "Malaysia:Kuala Lumpur:Business:4": {
    roomsPercent: 65,
    foodPercent: 16,
    beveragePercent: 7,
    roomServicePercent: 1,
    telecomPercent: 1,
    spaPercent: 5,
    rentalPercent: 4,
  },
  "Malaysia:Kuala Lumpur:Budget:3": {
    roomsPercent: 72,
    foodPercent: 16,
    beveragePercent: 5,
    roomServicePercent: 0.5,
    telecomPercent: 1,
    spaPercent: 2,
    rentalPercent: 3.5,
  },

  // === VIETNAM ===
  "Vietnam:Ho Chi Minh City:Business:5": {
    roomsPercent: 58,
    foodPercent: 20,
    beveragePercent: 9,
    roomServicePercent: 1.5,
    telecomPercent: 0.5,
    spaPercent: 7,
    rentalPercent: 4,
  },
  "Vietnam:Ho Chi Minh City:Business:4": {
    roomsPercent: 63,
    foodPercent: 18,
    beveragePercent: 7,
    roomServicePercent: 1,
    telecomPercent: 1,
    spaPercent: 5,
    rentalPercent: 4,
  },

  // === THAILAND ===
  "Thailand:Bangkok:Business:5": {
    roomsPercent: 58,
    foodPercent: 20,
    beveragePercent: 9,
    roomServicePercent: 1.5,
    telecomPercent: 0.5,
    spaPercent: 7,
    rentalPercent: 4,
  },
  "Thailand:Bangkok:Business:4": {
    roomsPercent: 63,
    foodPercent: 18,
    beveragePercent: 7,
    roomServicePercent: 1,
    telecomPercent: 1,
    spaPercent: 5,
    rentalPercent: 4,
  },
  "Thailand:Phuket:Resort:5": {
    roomsPercent: 52,
    foodPercent: 24,
    beveragePercent: 11,
    roomServicePercent: 2.5,
    telecomPercent: 0.5,
    spaPercent: 8,
    rentalPercent: 2.5,
  },

  // === AUSTRALIA ===
  "Australia:Sydney:Business:5": {
    roomsPercent: 60,
    foodPercent: 18,
    beveragePercent: 8,
    roomServicePercent: 1.5,
    telecomPercent: 0.5,
    spaPercent: 7,
    rentalPercent: 4,
  },
  "Australia:Sydney:Business:4": {
    roomsPercent: 65,
    foodPercent: 16,
    beveragePercent: 7,
    roomServicePercent: 1,
    telecomPercent: 1,
    spaPercent: 5,
    rentalPercent: 4,
  },

  // === GENERIC FALLBACKS ===
  "generic:5": {
    roomsPercent: 58,
    foodPercent: 20,
    beveragePercent: 9,
    roomServicePercent: 1.5,
    telecomPercent: 0.5,
    spaPercent: 7,
    rentalPercent: 4,
  },
  "generic:4": {
    roomsPercent: 65,
    foodPercent: 17,
    beveragePercent: 7,
    roomServicePercent: 1,
    telecomPercent: 1,
    spaPercent: 5,
    rentalPercent: 3,
  },
  "generic:3": {
    roomsPercent: 72,
    foodPercent: 16,
    beveragePercent: 5,
    roomServicePercent: 0.5,
    telecomPercent: 1,
    spaPercent: 2,
    rentalPercent: 3.5,
  },
};

// Helper function for Step 2 profile lookup
function getStep2ProfileDefaults(profileKey: string) {
  // eslint-disable-next-line no-console
  console.log("🔍 Looking up Step 2 profile:", profileKey);

  // Try exact match first
  const exact = STEP2_PROFILE_DEFAULTS[profileKey];
  if (exact) {
    // eslint-disable-next-line no-console
    console.log("  ✅ Found exact match");
    return exact;
  }

  // eslint-disable-next-line no-console
  console.log("  ❌ No exact match, trying fallback...");

  // Try fallback by star rating
  const stars = profileKey.split(":")[3];
  const genericKey = `generic:${stars}`;

  // eslint-disable-next-line no-console
  console.log("  Fallback key:", genericKey);

  const fallback = STEP2_PROFILE_DEFAULTS[genericKey];
  if (fallback) {
    // eslint-disable-next-line no-console
    console.log("  ✅ Found generic fallback");
    return fallback;
  }

  // eslint-disable-next-line no-console
  console.log("  ❌ No fallback, using hard defaults");

  // Hard defaults
  return {
    roomsPercent: 58,
    foodPercent: 20,
    beveragePercent: 9,
    roomServicePercent: 1.5,
    telecomPercent: 0.5,
    spaPercent: 7,
    rentalPercent: 4,
  };
}

// Direct Costs Benchmarks (% of respective revenue streams)
// Sources: HVS Resort Development Cost Survey, STR, HVS Global, CBRE Hotels
const STEP3_PROFILE_DEFAULTS: Record<
  string,
  {
    roomsPayrollPercent: number;
    roomsOtherPercent: number;
    foodCostPercent: number;
    beverageCostPercent: number;
    fnbPayrollPercent: number;
    fnbOtherPercent: number;
    telecomPercent: number;
    spaPercent: number;
    rentalPercent: number;
  }
> = {
  // === UNITED ARAB EMIRATES ===
  "United Arab Emirates:Dubai:Business:5": {
    roomsPayrollPercent: 8.5,
    roomsOtherPercent: 7,
    foodCostPercent: 30,
    beverageCostPercent: 19,
    fnbPayrollPercent: 24,
    fnbOtherPercent: 10,
    telecomPercent: 42,
    spaPercent: 54,
    rentalPercent: 22,
  },
  "United Arab Emirates:Dubai:Resort:5": {
    roomsPayrollPercent: 9,
    roomsOtherPercent: 7.5,
    foodCostPercent: 32,
    beverageCostPercent: 20,
    fnbPayrollPercent: 26,
    fnbOtherPercent: 11,
    telecomPercent: 40,
    spaPercent: 56,
    rentalPercent: 20,
  },
  "United Arab Emirates:Dubai:Business:4": {
    roomsPayrollPercent: 10,
    roomsOtherPercent: 8,
    foodCostPercent: 32,
    beverageCostPercent: 21,
    fnbPayrollPercent: 28,
    fnbOtherPercent: 11,
    telecomPercent: 44,
    spaPercent: 52,
    rentalPercent: 24,
  },
  "United Arab Emirates:Abu Dhabi:Business:5": {
    roomsPayrollPercent: 8.5,
    roomsOtherPercent: 7,
    foodCostPercent: 30,
    beverageCostPercent: 19,
    fnbPayrollPercent: 24,
    fnbOtherPercent: 10,
    telecomPercent: 42,
    spaPercent: 54,
    rentalPercent: 22,
  },
  "United Arab Emirates:Abu Dhabi:Resort:5": {
    roomsPayrollPercent: 9,
    roomsOtherPercent: 7.5,
    foodCostPercent: 32,
    beverageCostPercent: 20,
    fnbPayrollPercent: 26,
    fnbOtherPercent: 11,
    telecomPercent: 40,
    spaPercent: 56,
    rentalPercent: 20,
  },
  "United Arab Emirates:Abu Dhabi:Business:4": {
    roomsPayrollPercent: 10,
    roomsOtherPercent: 8,
    foodCostPercent: 32,
    beverageCostPercent: 21,
    fnbPayrollPercent: 28,
    fnbOtherPercent: 11,
    telecomPercent: 44,
    spaPercent: 52,
    rentalPercent: 24,
  },

  // === SAUDI ARABIA ===
  "Saudi Arabia:Riyadh:Business:5": {
    roomsPayrollPercent: 9,
    roomsOtherPercent: 7.5,
    foodCostPercent: 30,
    beverageCostPercent: 19,
    fnbPayrollPercent: 25,
    fnbOtherPercent: 10,
    telecomPercent: 42,
    spaPercent: 54,
    rentalPercent: 22,
  },
  "Saudi Arabia:Riyadh:Business:4": {
    roomsPayrollPercent: 10.5,
    roomsOtherPercent: 8.5,
    foodCostPercent: 32,
    beverageCostPercent: 21,
    fnbPayrollPercent: 28,
    fnbOtherPercent: 11,
    telecomPercent: 44,
    spaPercent: 52,
    rentalPercent: 24,
  },
  "Saudi Arabia:Jeddah:Business:5": {
    roomsPayrollPercent: 9,
    roomsOtherPercent: 7.5,
    foodCostPercent: 30,
    beverageCostPercent: 19,
    fnbPayrollPercent: 25,
    fnbOtherPercent: 10,
    telecomPercent: 42,
    spaPercent: 54,
    rentalPercent: 22,
  },
  "Saudi Arabia:Makkah:Business:5": {
    roomsPayrollPercent: 8.5,
    roomsOtherPercent: 7,
    foodCostPercent: 29,
    beverageCostPercent: 18,
    fnbPayrollPercent: 24,
    fnbOtherPercent: 9,
    telecomPercent: 40,
    spaPercent: 50,
    rentalPercent: 20,
  },

  // === MALAYSIA ===
  "Malaysia:Kuala Lumpur:Business:5": {
    roomsPayrollPercent: 9,
    roomsOtherPercent: 7.5,
    foodCostPercent: 30,
    beverageCostPercent: 19,
    fnbPayrollPercent: 25,
    fnbOtherPercent: 10,
    telecomPercent: 42,
    spaPercent: 54,
    rentalPercent: 22,
  },
  "Malaysia:Kuala Lumpur:Business:4": {
    roomsPayrollPercent: 10.5,
    roomsOtherPercent: 8.5,
    foodCostPercent: 32,
    beverageCostPercent: 21,
    fnbPayrollPercent: 28,
    fnbOtherPercent: 11,
    telecomPercent: 44,
    spaPercent: 52,
    rentalPercent: 24,
  },
  "Malaysia:Kuala Lumpur:Budget:3": {
    roomsPayrollPercent: 12,
    roomsOtherPercent: 10,
    foodCostPercent: 35,
    beverageCostPercent: 23,
    fnbPayrollPercent: 32,
    fnbOtherPercent: 12,
    telecomPercent: 46,
    spaPercent: 50,
    rentalPercent: 25,
  },

  // === VIETNAM ===
  "Vietnam:Ho Chi Minh City:Business:5": {
    roomsPayrollPercent: 9,
    roomsOtherPercent: 7.5,
    foodCostPercent: 30,
    beverageCostPercent: 19,
    fnbPayrollPercent: 25,
    fnbOtherPercent: 10,
    telecomPercent: 42,
    spaPercent: 54,
    rentalPercent: 22,
  },
  "Vietnam:Ho Chi Minh City:Business:4": {
    roomsPayrollPercent: 10.5,
    roomsOtherPercent: 8.5,
    foodCostPercent: 32,
    beverageCostPercent: 21,
    fnbPayrollPercent: 28,
    fnbOtherPercent: 11,
    telecomPercent: 44,
    spaPercent: 52,
    rentalPercent: 24,
  },

  // === THAILAND ===
  "Thailand:Bangkok:Business:5": {
    roomsPayrollPercent: 9,
    roomsOtherPercent: 7.5,
    foodCostPercent: 30,
    beverageCostPercent: 19,
    fnbPayrollPercent: 25,
    fnbOtherPercent: 10,
    telecomPercent: 42,
    spaPercent: 54,
    rentalPercent: 22,
  },
  "Thailand:Bangkok:Business:4": {
    roomsPayrollPercent: 10.5,
    roomsOtherPercent: 8.5,
    foodCostPercent: 32,
    beverageCostPercent: 21,
    fnbPayrollPercent: 28,
    fnbOtherPercent: 11,
    telecomPercent: 44,
    spaPercent: 52,
    rentalPercent: 24,
  },
  "Thailand:Phuket:Resort:5": {
    roomsPayrollPercent: 9.5,
    roomsOtherPercent: 8,
    foodCostPercent: 33,
    beverageCostPercent: 21,
    fnbPayrollPercent: 28,
    fnbOtherPercent: 12,
    telecomPercent: 40,
    spaPercent: 58,
    rentalPercent: 20,
  },

  // === AUSTRALIA ===
  "Australia:Sydney:Business:5": {
    roomsPayrollPercent: 10,
    roomsOtherPercent: 8,
    foodCostPercent: 32,
    beverageCostPercent: 20,
    fnbPayrollPercent: 28,
    fnbOtherPercent: 11,
    telecomPercent: 44,
    spaPercent: 56,
    rentalPercent: 22,
  },
  "Australia:Sydney:Business:4": {
    roomsPayrollPercent: 11.5,
    roomsOtherPercent: 9,
    foodCostPercent: 34,
    beverageCostPercent: 22,
    fnbPayrollPercent: 30,
    fnbOtherPercent: 12,
    telecomPercent: 46,
    spaPercent: 54,
    rentalPercent: 24,
  },

  // === GENERIC FALLBACKS ===
  "generic:5": {
    roomsPayrollPercent: 9,
    roomsOtherPercent: 7.5,
    foodCostPercent: 30,
    beverageCostPercent: 19,
    fnbPayrollPercent: 25,
    fnbOtherPercent: 10,
    telecomPercent: 42,
    spaPercent: 54,
    rentalPercent: 22,
  },
  "generic:4": {
    roomsPayrollPercent: 10.5,
    roomsOtherPercent: 8.5,
    foodCostPercent: 32,
    beverageCostPercent: 21,
    fnbPayrollPercent: 28,
    fnbOtherPercent: 11,
    telecomPercent: 44,
    spaPercent: 52,
    rentalPercent: 24,
  },
  "generic:3": {
    roomsPayrollPercent: 12,
    roomsOtherPercent: 10,
    foodCostPercent: 35,
    beverageCostPercent: 23,
    fnbPayrollPercent: 32,
    fnbOtherPercent: 12,
    telecomPercent: 46,
    spaPercent: 50,
    rentalPercent: 25,
  },
};

// Helper function for Step 3 profile lookup
function getStep3ProfileDefaults(profileKey: string) {
  // Try exact match first
  const exact = STEP3_PROFILE_DEFAULTS[profileKey];
  if (exact) return exact;

  // Try fallback by star rating
  const stars = profileKey.split(":")[3];
  const genericKey = `generic:${stars}`;

  return (
    STEP3_PROFILE_DEFAULTS[genericKey] || {
      roomsPayrollPercent: 9,
      roomsOtherPercent: 7.5,
      foodCostPercent: 30,
      beverageCostPercent: 19,
      fnbPayrollPercent: 25,
      fnbOtherPercent: 10,
      telecomPercent: 42,
      spaPercent: 54,
      rentalPercent: 22,
    }
  );
}

// Undistributed & Fixed Expenses Benchmarks (% of respective revenue bases)
// Sources: HVS Resort Development Cost Survey, STR, HVS Global, CBRE Hotels, PKF
const STEP4_PROFILE_DEFAULTS: Record<
  string,
  {
    gnaPercent: number; // % of total hotel revenue
    marketingPercent: number; // % of total hotel revenue
    propertyOMPercent: number; // % of total hotel revenue
    utilitiesPercent: number; // % of total hotel revenue
    baseManagementPercent: number; // % of room revenue
    incentiveFeePercent: number; // % of EBITDA
    renovationYear1Percent: number; // % of total hotel revenue
    renovationYear2Percent: number; // % of total hotel revenue
    renovationYear3to10Percent: number; // % of total hotel revenue
  }
> = {
  // === UNITED ARAB EMIRATES ===
  "United Arab Emirates:Dubai:Business:5": {
    gnaPercent: 7,
    marketingPercent: 3.5,
    propertyOMPercent: 4,
    utilitiesPercent: 4,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },
  "United Arab Emirates:Dubai:Resort:5": {
    gnaPercent: 7.5,
    marketingPercent: 4,
    propertyOMPercent: 4.5,
    utilitiesPercent: 4.5,
    baseManagementPercent: 3,
    incentiveFeePercent: 10,
    renovationYear1Percent: 2,
    renovationYear2Percent: 3,
    renovationYear3to10Percent: 4,
  },
  "United Arab Emirates:Dubai:Business:4": {
    gnaPercent: 8,
    marketingPercent: 4,
    propertyOMPercent: 4.5,
    utilitiesPercent: 4.5,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },
  "United Arab Emirates:Abu Dhabi:Business:5": {
    gnaPercent: 7,
    marketingPercent: 3.5,
    propertyOMPercent: 4,
    utilitiesPercent: 4,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },
  "United Arab Emirates:Abu Dhabi:Resort:5": {
    gnaPercent: 7.5,
    marketingPercent: 4,
    propertyOMPercent: 4.5,
    utilitiesPercent: 4.5,
    baseManagementPercent: 3,
    incentiveFeePercent: 10,
    renovationYear1Percent: 2,
    renovationYear2Percent: 3,
    renovationYear3to10Percent: 4,
  },
  "United Arab Emirates:Abu Dhabi:Business:4": {
    gnaPercent: 8,
    marketingPercent: 4,
    propertyOMPercent: 4.5,
    utilitiesPercent: 4.5,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },

  // === SAUDI ARABIA ===
  "Saudi Arabia:Riyadh:Business:5": {
    gnaPercent: 7.5,
    marketingPercent: 3.5,
    propertyOMPercent: 4,
    utilitiesPercent: 4.5,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },
  "Saudi Arabia:Riyadh:Business:4": {
    gnaPercent: 8.5,
    marketingPercent: 4,
    propertyOMPercent: 4.5,
    utilitiesPercent: 5,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },
  "Saudi Arabia:Jeddah:Business:5": {
    gnaPercent: 7.5,
    marketingPercent: 3.5,
    propertyOMPercent: 4,
    utilitiesPercent: 4.5,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },
  "Saudi Arabia:Makkah:Business:5": {
    gnaPercent: 7,
    marketingPercent: 3,
    propertyOMPercent: 4,
    utilitiesPercent: 4.5,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 2,
    renovationYear2Percent: 3,
    renovationYear3to10Percent: 4,
  },

  // === MALAYSIA ===
  "Malaysia:Kuala Lumpur:Business:5": {
    gnaPercent: 7,
    marketingPercent: 3.5,
    propertyOMPercent: 4,
    utilitiesPercent: 4,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },
  "Malaysia:Kuala Lumpur:Business:4": {
    gnaPercent: 8,
    marketingPercent: 4,
    propertyOMPercent: 4.5,
    utilitiesPercent: 4.5,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },
  "Malaysia:Kuala Lumpur:Budget:3": {
    gnaPercent: 9,
    marketingPercent: 4.5,
    propertyOMPercent: 5,
    utilitiesPercent: 5,
    baseManagementPercent: 2,
    incentiveFeePercent: 8,
    renovationYear1Percent: 1,
    renovationYear2Percent: 2,
    renovationYear3to10Percent: 3,
  },

  // === VIETNAM ===
  "Vietnam:Ho Chi Minh City:Business:5": {
    gnaPercent: 7.5,
    marketingPercent: 4,
    propertyOMPercent: 4,
    utilitiesPercent: 4,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },
  "Vietnam:Ho Chi Minh City:Business:4": {
    gnaPercent: 8.5,
    marketingPercent: 4.5,
    propertyOMPercent: 4.5,
    utilitiesPercent: 4.5,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },

  // === THAILAND ===
  "Thailand:Bangkok:Business:5": {
    gnaPercent: 7,
    marketingPercent: 3.5,
    propertyOMPercent: 4,
    utilitiesPercent: 4,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },
  "Thailand:Bangkok:Business:4": {
    gnaPercent: 8,
    marketingPercent: 4,
    propertyOMPercent: 4.5,
    utilitiesPercent: 4.5,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },
  "Thailand:Phuket:Resort:5": {
    gnaPercent: 8,
    marketingPercent: 4.5,
    propertyOMPercent: 5,
    utilitiesPercent: 5,
    baseManagementPercent: 3,
    incentiveFeePercent: 10,
    renovationYear1Percent: 2,
    renovationYear2Percent: 3,
    renovationYear3to10Percent: 4.5,
  },

  // === AUSTRALIA ===
  "Australia:Sydney:Business:5": {
    gnaPercent: 7.5,
    marketingPercent: 4,
    propertyOMPercent: 4.5,
    utilitiesPercent: 4.5,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 2,
    renovationYear2Percent: 3,
    renovationYear3to10Percent: 4,
  },
  "Australia:Sydney:Business:4": {
    gnaPercent: 8.5,
    marketingPercent: 4.5,
    propertyOMPercent: 5,
    utilitiesPercent: 5,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 2,
    renovationYear2Percent: 3,
    renovationYear3to10Percent: 4,
  },

  // === GENERIC FALLBACKS ===
  "generic:5": {
    gnaPercent: 7.5,
    marketingPercent: 4,
    propertyOMPercent: 4.5,
    utilitiesPercent: 4.5,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },
  "generic:4": {
    gnaPercent: 8.5,
    marketingPercent: 4.5,
    propertyOMPercent: 5,
    utilitiesPercent: 5,
    baseManagementPercent: 2.5,
    incentiveFeePercent: 9,
    renovationYear1Percent: 1.5,
    renovationYear2Percent: 2.5,
    renovationYear3to10Percent: 3.5,
  },
  "generic:3": {
    gnaPercent: 9.5,
    marketingPercent: 5,
    propertyOMPercent: 5.5,
    utilitiesPercent: 5.5,
    baseManagementPercent: 2,
    incentiveFeePercent: 8,
    renovationYear1Percent: 1,
    renovationYear2Percent: 2,
    renovationYear3to10Percent: 3,
  },
};

// Helper function for Step 4 profile lookup
function getStep4ProfileDefaults(profileKey: string) {
  // Try exact match first
  const exact = STEP4_PROFILE_DEFAULTS[profileKey];
  if (exact) return exact;

  // Try fallback by star rating
  const stars = profileKey.split(":")[3];
  const genericKey = `generic:${stars}`;

  return (
    STEP4_PROFILE_DEFAULTS[genericKey] || {
      gnaPercent: 7.5,
      marketingPercent: 4,
      propertyOMPercent: 4.5,
      utilitiesPercent: 4.5,
      baseManagementPercent: 2.5,
      incentiveFeePercent: 9,
      renovationYear1Percent: 1.5,
      renovationYear2Percent: 2.5,
      renovationYear3to10Percent: 3.5,
    }
  );
}

// Depreciation & Working Capital Benchmarks
// Sources: HVS Resort Development Cost Survey, STR, HVS Global, industry standards
const STEP5_PROFILE_DEFAULTS: Record<
  string,
  {
    constructionUsefulLife: number; // years
    ffeUsefulLife: number; // years
    ffeRenovationPercent: number; // % of initial FFE
    accountsReceivableMonths: number; // months of revenue
    accountsPayableMonths: number; // months of expenses
  }
> = {
  // === UNITED ARAB EMIRATES ===
  "United Arab Emirates:Dubai:Business:5": {
    constructionUsefulLife: 25,
    ffeUsefulLife: 7,
    ffeRenovationPercent: 50,
    accountsReceivableMonths: 1,
    accountsPayableMonths: 1,
  },
  "United Arab Emirates:Dubai:Resort:5": {
    constructionUsefulLife: 25,
    ffeUsefulLife: 6,
    ffeRenovationPercent: 60,
    accountsReceivableMonths: 1,
    accountsPayableMonths: 1,
  },
  "United Arab Emirates:Dubai:Business:4": {
    constructionUsefulLife: 30,
    ffeUsefulLife: 8,
    ffeRenovationPercent: 45,
    accountsReceivableMonths: 1,
    accountsPayableMonths: 1,
  },
  "United Arab Emirates:Abu Dhabi:Business:5": {
    constructionUsefulLife: 25,
    ffeUsefulLife: 7,
    ffeRenovationPercent: 50,
    accountsReceivableMonths: 1,
    accountsPayableMonths: 1,
  },
  "United Arab Emirates:Abu Dhabi:Resort:5": {
    constructionUsefulLife: 25,
    ffeUsefulLife: 6,
    ffeRenovationPercent: 60,
    accountsReceivableMonths: 1,
    accountsPayableMonths: 1,
  },
  "United Arab Emirates:Abu Dhabi:Business:4": {
    constructionUsefulLife: 30,
    ffeUsefulLife: 8,
    ffeRenovationPercent: 45,
    accountsReceivableMonths: 1,
    accountsPayableMonths: 1,
  },

  // === SAUDI ARABIA ===
  "Saudi Arabia:Riyadh:Business:5": {
    constructionUsefulLife: 25,
    ffeUsefulLife: 7,
    ffeRenovationPercent: 50,
    accountsReceivableMonths: 1,
    accountsPayableMonths: 1,
  },
  "Saudi Arabia:Riyadh:Business:4": {
    constructionUsefulLife: 30,
    ffeUsefulLife: 8,
    ffeRenovationPercent: 45,
    accountsReceivableMonths: 1,
    accountsPayableMonths: 1,
  },
  "Saudi Arabia:Jeddah:Business:5": {
    constructionUsefulLife: 25,
    ffeUsefulLife: 7,
    ffeRenovationPercent: 50,
    accountsReceivableMonths: 1,
    accountsPayableMonths: 1,
  },
  "Saudi Arabia:Makkah:Business:5": {
    constructionUsefulLife: 20,
    ffeUsefulLife: 6,
    ffeRenovationPercent: 55,
    accountsReceivableMonths: 1,
    accountsPayableMonths: 1,
  },

  // === MALAYSIA ===
  "Malaysia:Kuala Lumpur:Business:5": {
    constructionUsefulLife: 30,
    ffeUsefulLife: 8,
    ffeRenovationPercent: 45,
    accountsReceivableMonths: 1.5,
    accountsPayableMonths: 1.5,
  },
  "Malaysia:Kuala Lumpur:Business:4": {
    constructionUsefulLife: 35,
    ffeUsefulLife: 9,
    ffeRenovationPercent: 40,
    accountsReceivableMonths: 1.5,
    accountsPayableMonths: 1.5,
  },
  "Malaysia:Kuala Lumpur:Budget:3": {
    constructionUsefulLife: 40,
    ffeUsefulLife: 10,
    ffeRenovationPercent: 35,
    accountsReceivableMonths: 2,
    accountsPayableMonths: 2,
  },

  // === VIETNAM ===
  "Vietnam:Ho Chi Minh City:Business:5": {
    constructionUsefulLife: 25,
    ffeUsefulLife: 7,
    ffeRenovationPercent: 50,
    accountsReceivableMonths: 1.5,
    accountsPayableMonths: 1.5,
  },
  "Vietnam:Ho Chi Minh City:Business:4": {
    constructionUsefulLife: 30,
    ffeUsefulLife: 8,
    ffeRenovationPercent: 45,
    accountsReceivableMonths: 1.5,
    accountsPayableMonths: 1.5,
  },

  // === THAILAND ===
  "Thailand:Bangkok:Business:5": {
    constructionUsefulLife: 25,
    ffeUsefulLife: 7,
    ffeRenovationPercent: 50,
    accountsReceivableMonths: 1.5,
    accountsPayableMonths: 1.5,
  },
  "Thailand:Bangkok:Business:4": {
    constructionUsefulLife: 30,
    ffeUsefulLife: 8,
    ffeRenovationPercent: 45,
    accountsReceivableMonths: 1.5,
    accountsPayableMonths: 1.5,
  },
  "Thailand:Phuket:Resort:5": {
    constructionUsefulLife: 25,
    ffeUsefulLife: 6,
    ffeRenovationPercent: 60,
    accountsReceivableMonths: 1.5,
    accountsPayableMonths: 1.5,
  },

  // === AUSTRALIA ===
  "Australia:Sydney:Business:5": {
    constructionUsefulLife: 30,
    ffeUsefulLife: 7,
    ffeRenovationPercent: 50,
    accountsReceivableMonths: 1,
    accountsPayableMonths: 1,
  },
  "Australia:Sydney:Business:4": {
    constructionUsefulLife: 35,
    ffeUsefulLife: 8,
    ffeRenovationPercent: 45,
    accountsReceivableMonths: 1,
    accountsPayableMonths: 1,
  },

  // === GENERIC FALLBACKS ===
  "generic:5": {
    constructionUsefulLife: 25,
    ffeUsefulLife: 7,
    ffeRenovationPercent: 50,
    accountsReceivableMonths: 1.5,
    accountsPayableMonths: 1.5,
  },
  "generic:4": {
    constructionUsefulLife: 30,
    ffeUsefulLife: 8,
    ffeRenovationPercent: 45,
    accountsReceivableMonths: 1.5,
    accountsPayableMonths: 1.5,
  },
  "generic:3": {
    constructionUsefulLife: 40,
    ffeUsefulLife: 10,
    ffeRenovationPercent: 35,
    accountsReceivableMonths: 2,
    accountsPayableMonths: 2,
  },
};

// Helper function for Step 5 profile lookup
function getStep5ProfileDefaults(profileKey: string) {
  // Try exact match first
  const exact = STEP5_PROFILE_DEFAULTS[profileKey];
  if (exact) return exact;

  // Try fallback by star rating
  const stars = profileKey.split(":")[3];
  const genericKey = `generic:${stars}`;

  return (
    STEP5_PROFILE_DEFAULTS[genericKey] || {
      constructionUsefulLife: 25,
      ffeUsefulLife: 7,
      ffeRenovationPercent: 50,
      accountsReceivableMonths: 1.5,
      accountsPayableMonths: 1.5,
    }
  );
}

function normalizeProfileKey(key: string): string {
  return key.replace(/\s+/g, " ").trim().toLowerCase();
}

function getProfileDefaults(profileKey: string) {
  const exact = PROFILE_DEFAULTS[profileKey];
  if (exact) return exact;
  const norm = normalizeProfileKey(profileKey);
  for (const k of Object.keys(PROFILE_DEFAULTS)) {
    if (normalizeProfileKey(k) === norm) return PROFILE_DEFAULTS[k]!;
  }
  return undefined;
}

function capitalizeFirst(str: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

type Errors = Record<string, string>;

const inputBase =
  "rounded bg-slate-900 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";
function overrideFieldClass(overridden: boolean): string {
  return overridden
    ? `${inputBase} border-2 border-amber-500/70`
    : `${inputBase} border border-slate-600`;
}

function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
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
  const mounted = useClientMounted();
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
      {mounted ? (
        <ResponsiveContainer width="100%" height="88%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          >
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
      ) : (
        <div className="h-[88%] w-full" />
      )}
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
  const mounted = useClientMounted();
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
      {mounted ? (
        <ResponsiveContainer width="100%" height="88%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          >
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
      ) : (
        <div className="h-[88%] w-full" />
      )}
    </div>
  );
}

function OperationalCashInflowsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const streamPrefix = useStreamPrefix();
  const mounted = useClientMounted();

  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const updateProjectInfo = useFinModelStore((s) => s.updateProjectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);

  const isRetail = projectInfo.buildingType === "retail";
  const isResidential = projectInfo.buildingType === "residential";
  const TOTAL_STEPS = totalStepsForBuildingType(projectInfo.buildingType);
  const lastStepIndex = TOTAL_STEPS - 1;
  const cashInflows = useFinModelStore((s) => s.operational?.cashInflows);
  const currencyCode = projectInfo.currency || "AED";

  const { defaultOfficeGlaSqft, defaultRetailGlaSqft, defaultResidentialGlaSqft } =
    useMemo(() => {
      const totalBua = cashOutflows.buildingBUA || 0;
      const retailPct = projectInfo.buildingConfig?.hasRetailComponent
        ? (projectInfo.buildingConfig.retailPercentage || 0) / 100
        : projectInfo.buildingType === "office"
          ? totalBua > 0
            ? 0.2
            : 0
          : projectInfo.buildingType === "residential"
            ? totalBua > 0
              ? 0.15
              : 0
            : 0;
      const retail = Math.round(totalBua * retailPct);
      const main = Math.max(0, totalBua - retail);
      return {
        defaultOfficeGlaSqft: main > 0 ? main : 200_000,
        defaultResidentialGlaSqft: main > 0 ? main : 200_000,
        defaultRetailGlaSqft: retail > 0 ? retail : 50_000,
      };
    }, [
      cashOutflows.buildingBUA,
      projectInfo.buildingConfig?.hasRetailComponent,
      projectInfo.buildingConfig?.retailPercentage,
      projectInfo.buildingType,
    ]);

  const {
    numberOfRooms,
    adrValues,
    occupancyValues,
    roomRevenue,
    tenYearRoomRevenueTotal,
  } = useHotelRoomRevenueFromStore(projectInfo);

  const step2ProfileKey = useMemo(() => {
    if (
      !projectInfo.country ||
      !projectInfo.city ||
      !projectInfo.hotelOperatingType ||
      !projectInfo.hotelStarRating
    ) {
      return null;
    }
    return `${projectInfo.country}:${projectInfo.city}:${capitalizeFirst(
      projectInfo.hotelOperatingType
    )}:${projectInfo.hotelStarRating}`;
  }, [
    projectInfo.country,
    projectInfo.city,
    projectInfo.hotelOperatingType,
    projectInfo.hotelStarRating,
  ]);

  const step2ProfileDefaults = useMemo(() => {
    if (!step2ProfileKey) return null;
    return getStep2ProfileDefaults(step2ProfileKey);
  }, [step2ProfileKey]);

  const step3ProfileKey = useMemo(() => {
    if (
      !projectInfo.country ||
      !projectInfo.city ||
      !projectInfo.hotelOperatingType ||
      !projectInfo.hotelStarRating
    ) {
      return null;
    }
    return `${projectInfo.country}:${projectInfo.city}:${capitalizeFirst(
      projectInfo.hotelOperatingType
    )}:${projectInfo.hotelStarRating}`;
  }, [
    projectInfo.country,
    projectInfo.city,
    projectInfo.hotelOperatingType,
    projectInfo.hotelStarRating,
  ]);

  const step3ProfileDefaults = useMemo(() => {
    if (!step3ProfileKey) return null;
    return getStep3ProfileDefaults(step3ProfileKey);
  }, [step3ProfileKey]);

  const step4ProfileKey = useMemo(() => {
    if (
      !projectInfo.country ||
      !projectInfo.city ||
      !projectInfo.hotelOperatingType ||
      !projectInfo.hotelStarRating
    ) {
      return null;
    }
    return `${projectInfo.country}:${projectInfo.city}:${capitalizeFirst(
      projectInfo.hotelOperatingType
    )}:${projectInfo.hotelStarRating}`;
  }, [
    projectInfo.country,
    projectInfo.city,
    projectInfo.hotelOperatingType,
    projectInfo.hotelStarRating,
  ]);

  const step4ProfileDefaults = useMemo(() => {
    if (!step4ProfileKey) return null;
    return getStep4ProfileDefaults(step4ProfileKey);
  }, [step4ProfileKey]);

  const step5ProfileKey = useMemo(() => {
    if (
      !projectInfo.country ||
      !projectInfo.city ||
      !projectInfo.hotelOperatingType ||
      !projectInfo.hotelStarRating
    ) {
      return null;
    }
    return `${projectInfo.country}:${projectInfo.city}:${capitalizeFirst(
      projectInfo.hotelOperatingType
    )}:${projectInfo.hotelStarRating}`;
  }, [
    projectInfo.country,
    projectInfo.city,
    projectInfo.hotelOperatingType,
    projectInfo.hotelStarRating,
  ]);

  const step5ProfileDefaults = useMemo(() => {
    if (!step5ProfileKey) return null;
    return getStep5ProfileDefaults(step5ProfileKey);
  }, [step5ProfileKey]);

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const hotelBenchmarkStepsLogged = useRef<Set<number>>(new Set());
  const step0PersistRef = useRef<(() => void) | null>(null);

  const logC2HotelField = useCallback(
    (
      uiStep: number,
      stepTitle: string,
      fieldKey: string,
      label: string,
      value: string | number | boolean
    ) => {
      logAuditChange({
        id: `operational.cashInflows.step${uiStep}.${fieldKey}`,
        label,
        value,
        component: CASH_INFLOWS_COMPONENT,
        step: stepTitle,
        route: cashInflowAuditRoute(uiStep),
        type: "input",
      });
    },
    []
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
    if (step2ProfileKey && step2ProfileDefaults) {
      setRevenueProfileKey(`mvp:${step2ProfileKey}`);
      setRevenueProfileSource("HVS / STR / CBRE (MVP mix)");
      setRevPcts({
        rooms: step2ProfileDefaults.roomsPercent,
        food: step2ProfileDefaults.foodPercent,
        beverage: step2ProfileDefaults.beveragePercent,
        roomService: step2ProfileDefaults.roomServicePercent,
        telecom: step2ProfileDefaults.telecomPercent,
        spaHealth: step2ProfileDefaults.spaPercent,
        rentalOther: step2ProfileDefaults.rentalPercent,
      });
      setRevPctOverrides(emptyRevPctOverrides());
      // eslint-disable-next-line no-console
      console.log("📊 Step 2 Profile applied:", step2ProfileDefaults);
      return;
    }

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
    if (step3ProfileKey && step3ProfileDefaults) {
      setDirectCostProfileKey(`mvp:${step3ProfileKey}`);
      setDirectCostProfileSource("HVS / STR / CBRE (MVP direct costs)");
      setDirectCostPcts({
        roomsPayroll: step3ProfileDefaults.roomsPayrollPercent,
        roomsOther: step3ProfileDefaults.roomsOtherPercent,
        foodCostOfSale: step3ProfileDefaults.foodCostPercent,
        beverageCostOfSale: step3ProfileDefaults.beverageCostPercent,
        fbPayroll: step3ProfileDefaults.fnbPayrollPercent,
        fbOther: step3ProfileDefaults.fnbOtherPercent,
        telecomCost: step3ProfileDefaults.telecomPercent,
        healthLeisureCost: step3ProfileDefaults.spaPercent,
        otherDeptsCost: step3ProfileDefaults.rentalPercent,
      });
      setDirectCostPctOverrides(emptyDirectCostPctOverrides());
      // eslint-disable-next-line no-console
      console.log("📊 Step 3 Profile applied:", step3ProfileDefaults);
      return;
    }
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
    if (step4ProfileKey && step4ProfileDefaults) {
      setExpenseProfileKey(`mvp:${step4ProfileKey}`);
      setExpenseProfileSource("HVS / STR / CBRE / PKF (MVP undistributed & fixed)");
      setExpensePcts({
        gaExpenses: step4ProfileDefaults.gnaPercent,
        marketingSales: step4ProfileDefaults.marketingPercent,
        propertyOpsMaintenance: step4ProfileDefaults.propertyOMPercent,
        utilities: step4ProfileDefaults.utilitiesPercent,
        baseManagementFee: step4ProfileDefaults.baseManagementPercent,
        incentiveFee: step4ProfileDefaults.incentiveFeePercent,
        renovationProvisionY1: step4ProfileDefaults.renovationYear1Percent,
        renovationProvisionY2: step4ProfileDefaults.renovationYear2Percent,
        renovationProvisionY3to10: step4ProfileDefaults.renovationYear3to10Percent,
      });
      setExpensePctOverrides(emptyExpensePctOverrides());
      // eslint-disable-next-line no-console
      console.log("📊 Step 4 Profile applied:", step4ProfileDefaults);
      return;
    }
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
    if (step5ProfileKey && step5ProfileDefaults) {
      setDepreciationProfileKey(`mvp:${step5ProfileKey}`);
      setDepreciationProfileSource(
        "HVS / STR / industry standards (MVP depreciation & WC)"
      );
      setDepFieldValues({
        constructionUsefulLife: step5ProfileDefaults.constructionUsefulLife,
        ffeUsefulLife: step5ProfileDefaults.ffeUsefulLife,
        ffeRenovationRate: step5ProfileDefaults.ffeRenovationPercent,
        accountsReceivableMonths: step5ProfileDefaults.accountsReceivableMonths,
        accountsPayableMonths: step5ProfileDefaults.accountsPayableMonths,
      });
      setDepFieldOverrides(emptyDepreciationFieldOverrides());
      // eslint-disable-next-line no-console
      console.log("📊 Step 5 Profile applied:", step5ProfileDefaults);
      return;
    }
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
    const steps = totalStepsForBuildingType(projectInfo.buildingType);
    const desired = Math.min(steps - 1, Math.max(0, Math.round(parsed) - 1));
    setCurrentStep(desired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const buildingType = projectInfo.buildingType;
    if (
      (buildingType === "retail" || buildingType === "office") &&
      currentStep > lastStepIndex
    ) {
      setCurrentStep(lastStepIndex);
    }
  }, [projectInfo.buildingType, currentStep, lastStepIndex]);

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
    let nextPcts: Record<HotelRevenuePctKey, number>;
    if (step2ProfileKey && step2ProfileDefaults) {
      setRevenueProfileKey(`mvp:${step2ProfileKey}`);
      setRevenueProfileSource("HVS / STR / CBRE (MVP mix)");
      nextPcts = {
        rooms: step2ProfileDefaults.roomsPercent,
        food: step2ProfileDefaults.foodPercent,
        beverage: step2ProfileDefaults.beveragePercent,
        roomService: step2ProfileDefaults.roomServicePercent,
        telecom: step2ProfileDefaults.telecomPercent,
        spaHealth: step2ProfileDefaults.spaPercent,
        rentalOther: step2ProfileDefaults.rentalPercent,
      };
      setRevPcts(nextPcts);
      setRevPctOverrides(emptyRevPctOverrides());
    } else {
      const { key, profile } = resolveRevenueBenchmarkFromProject(projectInfo);
      setRevenueProfileKey(key);
      setRevenueProfileSource(profile.source);
      nextPcts = pctsFromRevenueProfile(profile);
      setRevPcts(nextPcts);
      setRevPctOverrides(emptyRevPctOverrides());
    }
    HOTEL_REVENUE_PCT_KEYS.forEach((k) => {
      logResetToBenchmark(
        CASH_INFLOWS_COMPONENT,
        HOTEL_STEP2_TITLE,
        cashInflowAuditRoute(2),
        `${REVENUE_STACK_LABELS[k]} %`,
        nextPcts[k]
      );
    });
  }, [projectInfo, step2ProfileDefaults, step2ProfileKey]);

  // Auto-populate all 7 revenue streams when profile changes (only if user has not overridden).
  useEffect(() => {
    if (!step2ProfileKey || !step2ProfileDefaults) return;
    if (hasAnyRevPctOverride) return;

    // Prevent repeated setState loops when values already applied.
    const nextRevPcts = {
      rooms: step2ProfileDefaults.roomsPercent,
      food: step2ProfileDefaults.foodPercent,
      beverage: step2ProfileDefaults.beveragePercent,
      roomService: step2ProfileDefaults.roomServicePercent,
      telecom: step2ProfileDefaults.telecomPercent,
      spaHealth: step2ProfileDefaults.spaPercent,
      rentalOther: step2ProfileDefaults.rentalPercent,
    } as const;

    const already =
      revenueProfileKey === `mvp:${step2ProfileKey}` &&
      HOTEL_REVENUE_PCT_KEYS.every(
        (k) => Math.abs((revPcts[k] ?? 0) - (nextRevPcts as any)[k]) < 1e-9
      );
    if (already) return;

    setRevenueProfileKey(`mvp:${step2ProfileKey}`);
    setRevenueProfileSource("HVS / STR / CBRE (MVP mix)");
    setRevPcts(nextRevPcts as any);
    if (Object.values(revPctOverrides).some(Boolean)) {
      setRevPctOverrides(emptyRevPctOverrides());
    }
    // eslint-disable-next-line no-console
    console.log("📊 Step 2 Profile applied:", step2ProfileDefaults);
  }, [
    step2ProfileDefaults,
    step2ProfileKey,
    hasAnyRevPctOverride,
    revenueProfileKey,
    revPcts,
    revPctOverrides,
  ]);

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
    let nextPcts: Record<HotelDirectCostPctKey, number>;
    if (step3ProfileKey && step3ProfileDefaults) {
      setDirectCostProfileKey(`mvp:${step3ProfileKey}`);
      setDirectCostProfileSource("HVS / STR / CBRE (MVP direct costs)");
      nextPcts = {
        roomsPayroll: step3ProfileDefaults.roomsPayrollPercent,
        roomsOther: step3ProfileDefaults.roomsOtherPercent,
        foodCostOfSale: step3ProfileDefaults.foodCostPercent,
        beverageCostOfSale: step3ProfileDefaults.beverageCostPercent,
        fbPayroll: step3ProfileDefaults.fnbPayrollPercent,
        fbOther: step3ProfileDefaults.fnbOtherPercent,
        telecomCost: step3ProfileDefaults.telecomPercent,
        healthLeisureCost: step3ProfileDefaults.spaPercent,
        otherDeptsCost: step3ProfileDefaults.rentalPercent,
      };
      setDirectCostPcts(nextPcts);
      setDirectCostPctOverrides(emptyDirectCostPctOverrides());
    } else {
      const { key, profile } = resolveDirectCostBenchmarkFromProject(projectInfo);
      setDirectCostProfileKey(key);
      setDirectCostProfileSource(profile.source);
      nextPcts = pctsFromDirectCostProfile(profile);
      setDirectCostPcts(nextPcts);
      setDirectCostPctOverrides(emptyDirectCostPctOverrides());
    }
    HOTEL_DIRECT_COST_PCT_KEYS.forEach((k) => {
      logResetToBenchmark(
        CASH_INFLOWS_COMPONENT,
        HOTEL_STEP3_TITLE,
        cashInflowAuditRoute(3),
        `${DIRECT_COST_INPUT_LABELS[k]} %`,
        nextPcts[k]
      );
    });
  }, [projectInfo, step3ProfileDefaults, step3ProfileKey]);

  // Auto-populate Step 3 direct cost %s when profile changes (skip if user has overrides).
  useEffect(() => {
    if (!step3ProfileKey || !step3ProfileDefaults) return;
    if (hasAnyDirectCostPctOverride) return;

    const next = {
      roomsPayroll: step3ProfileDefaults.roomsPayrollPercent,
      roomsOther: step3ProfileDefaults.roomsOtherPercent,
      foodCostOfSale: step3ProfileDefaults.foodCostPercent,
      beverageCostOfSale: step3ProfileDefaults.beverageCostPercent,
      fbPayroll: step3ProfileDefaults.fnbPayrollPercent,
      fbOther: step3ProfileDefaults.fnbOtherPercent,
      telecomCost: step3ProfileDefaults.telecomPercent,
      healthLeisureCost: step3ProfileDefaults.spaPercent,
      otherDeptsCost: step3ProfileDefaults.rentalPercent,
    } as const;

    const already =
      directCostProfileKey === `mvp:${step3ProfileKey}` &&
      Object.keys(next).every(
        (k) => Math.abs((directCostPcts as any)[k] - (next as any)[k]) < 1e-9
      );
    if (already) return;

    setDirectCostProfileKey(`mvp:${step3ProfileKey}`);
    setDirectCostProfileSource("HVS / STR / CBRE (MVP direct costs)");
    setDirectCostPcts(next as any);
    if (Object.values(directCostPctOverrides).some(Boolean)) {
      setDirectCostPctOverrides(emptyDirectCostPctOverrides());
    }
    // eslint-disable-next-line no-console
    console.log("📊 Step 3 Profile applied:", step3ProfileDefaults);
  }, [
    step3ProfileDefaults,
    step3ProfileKey,
    hasAnyDirectCostPctOverride,
    directCostProfileKey,
    directCostPcts,
    directCostPctOverrides,
  ]);

  // Auto-populate Step 4 expense %s when profile changes (skip if user has overrides).
  useEffect(() => {
    if (!step4ProfileKey || !step4ProfileDefaults) return;
    if (hasAnyExpensePctOverride) return;

    const next = {
      gaExpenses: step4ProfileDefaults.gnaPercent,
      marketingSales: step4ProfileDefaults.marketingPercent,
      propertyOpsMaintenance: step4ProfileDefaults.propertyOMPercent,
      utilities: step4ProfileDefaults.utilitiesPercent,
      baseManagementFee: step4ProfileDefaults.baseManagementPercent,
      incentiveFee: step4ProfileDefaults.incentiveFeePercent,
      renovationProvisionY1: step4ProfileDefaults.renovationYear1Percent,
      renovationProvisionY2: step4ProfileDefaults.renovationYear2Percent,
      renovationProvisionY3to10: step4ProfileDefaults.renovationYear3to10Percent,
    } as const;

    const already =
      expenseProfileKey === `mvp:${step4ProfileKey}` &&
      Object.keys(next).every(
        (k) => Math.abs((expensePcts as any)[k] - (next as any)[k]) < 1e-9
      );
    if (already) return;

    setExpenseProfileKey(`mvp:${step4ProfileKey}`);
    setExpenseProfileSource("HVS / STR / CBRE / PKF (MVP undistributed & fixed)");
    setExpensePcts(next as any);
    if (Object.values(expensePctOverrides).some(Boolean)) {
      setExpensePctOverrides(emptyExpensePctOverrides());
    }
    // eslint-disable-next-line no-console
    console.log("📊 Step 4 Profile applied:", step4ProfileDefaults);
  }, [
    step4ProfileDefaults,
    step4ProfileKey,
    hasAnyExpensePctOverride,
    expenseProfileKey,
    expensePcts,
    expensePctOverrides,
  ]);

  // Auto-populate Step 5 depreciation & WC fields when profile changes (skip if user has overrides).
  useEffect(() => {
    if (!step5ProfileKey || !step5ProfileDefaults) return;
    if (hasAnyDepreciationFieldOverride) return;

    const next = {
      constructionUsefulLife: step5ProfileDefaults.constructionUsefulLife,
      ffeUsefulLife: step5ProfileDefaults.ffeUsefulLife,
      ffeRenovationRate: step5ProfileDefaults.ffeRenovationPercent,
      accountsReceivableMonths: step5ProfileDefaults.accountsReceivableMonths,
      accountsPayableMonths: step5ProfileDefaults.accountsPayableMonths,
    } as const;

    const already =
      depreciationProfileKey === `mvp:${step5ProfileKey}` &&
      Object.keys(next).every(
        (k) => Math.abs((depFieldValues as any)[k] - (next as any)[k]) < 1e-9
      );
    if (already) return;

    setDepreciationProfileKey(`mvp:${step5ProfileKey}`);
    setDepreciationProfileSource(
      "HVS / STR / industry standards (MVP depreciation & WC)"
    );
    setDepFieldValues(next as any);
    if (Object.values(depFieldOverrides).some(Boolean)) {
      setDepFieldOverrides(emptyDepreciationFieldOverrides());
    }
    // eslint-disable-next-line no-console
    console.log("📊 Step 5 Profile applied:", step5ProfileDefaults);
  }, [
    step5ProfileDefaults,
    step5ProfileKey,
    hasAnyDepreciationFieldOverride,
    depreciationProfileKey,
    depFieldValues,
    depFieldOverrides,
  ]);

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
    let nextPcts: Record<HotelExpensePctKey, number>;
    if (step4ProfileKey && step4ProfileDefaults) {
      setExpenseProfileKey(`mvp:${step4ProfileKey}`);
      setExpenseProfileSource(
        "HVS / STR / CBRE / PKF (MVP undistributed & fixed)"
      );
      nextPcts = {
        gaExpenses: step4ProfileDefaults.gnaPercent,
        marketingSales: step4ProfileDefaults.marketingPercent,
        propertyOpsMaintenance: step4ProfileDefaults.propertyOMPercent,
        utilities: step4ProfileDefaults.utilitiesPercent,
        baseManagementFee: step4ProfileDefaults.baseManagementPercent,
        incentiveFee: step4ProfileDefaults.incentiveFeePercent,
        renovationProvisionY1: step4ProfileDefaults.renovationYear1Percent,
        renovationProvisionY2: step4ProfileDefaults.renovationYear2Percent,
        renovationProvisionY3to10:
          step4ProfileDefaults.renovationYear3to10Percent,
      };
      setExpensePcts(nextPcts);
      setExpensePctOverrides(emptyExpensePctOverrides());
    } else {
      const { key, profile } = resolveExpenseBenchmarkFromProject(projectInfo);
      setExpenseProfileKey(key);
      setExpenseProfileSource(profile.source);
      nextPcts = pctsFromExpenseProfile(profile);
      setExpensePcts(nextPcts);
      setExpensePctOverrides(emptyExpensePctOverrides());
    }
    HOTEL_EXPENSE_PCT_KEYS.forEach((k) => {
      logResetToBenchmark(
        CASH_INFLOWS_COMPONENT,
        HOTEL_STEP4_TITLE,
        cashInflowAuditRoute(4),
        `${EXPENSE_INPUT_LABELS[k]} %`,
        nextPcts[k]
      );
    });
  }, [projectInfo, step4ProfileDefaults, step4ProfileKey]);

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
    let nextValues: Record<HotelDepreciationFieldKey, number>;
    if (step5ProfileKey && step5ProfileDefaults) {
      setDepreciationProfileKey(`mvp:${step5ProfileKey}`);
      setDepreciationProfileSource(
        "HVS / STR / industry standards (MVP depreciation & WC)"
      );
      nextValues = {
        constructionUsefulLife: step5ProfileDefaults.constructionUsefulLife,
        ffeUsefulLife: step5ProfileDefaults.ffeUsefulLife,
        ffeRenovationRate: step5ProfileDefaults.ffeRenovationPercent,
        accountsReceivableMonths: step5ProfileDefaults.accountsReceivableMonths,
        accountsPayableMonths: step5ProfileDefaults.accountsPayableMonths,
      };
      setDepFieldValues(nextValues);
      setDepFieldOverrides(emptyDepreciationFieldOverrides());
    } else {
      const { key, profile } =
        resolveDepreciationBenchmarkFromProject(projectInfo);
      setDepreciationProfileKey(key);
      setDepreciationProfileSource(profile.source);
      nextValues = valuesFromDepreciationProfile(profile);
      setDepFieldValues(nextValues);
      setDepFieldOverrides(emptyDepreciationFieldOverrides());
    }
    HOTEL_DEPRECIATION_FIELD_KEYS.forEach((k) => {
      logResetToBenchmark(
        CASH_INFLOWS_COMPONENT,
        HOTEL_STEP5_TITLE,
        cashInflowAuditRoute(5),
        DEPRECIATION_FIELD_LABELS[k],
        nextValues[k]
      );
    });
  }, [projectInfo, step5ProfileDefaults, step5ProfileKey]);

  useEffect(() => {
    if (projectInfo.buildingType !== "hotel") return;
    const uiStep = currentStep + 1;
    if (uiStep < 2 || uiStep > 5) return;
    if (hotelBenchmarkStepsLogged.current.has(uiStep)) return;
    hotelBenchmarkStepsLogged.current.add(uiStep);

    if (uiStep === 2) {
      logBenchmarkValues(
        CASH_INFLOWS_COMPONENT,
        HOTEL_STEP2_TITLE,
        cashInflowAuditRoute(2),
        Object.fromEntries(
          HOTEL_REVENUE_PCT_KEYS.map((k) => [
            k,
            {
              label: `${REVENUE_STACK_LABELS[k]} % of total hotel revenue`,
              value: revPcts[k],
            },
          ])
        )
      );
      return;
    }
    if (uiStep === 3) {
      logBenchmarkValues(
        CASH_INFLOWS_COMPONENT,
        HOTEL_STEP3_TITLE,
        cashInflowAuditRoute(3),
        Object.fromEntries(
          HOTEL_DIRECT_COST_PCT_KEYS.map((k) => [
            k,
            {
              label: `${DIRECT_COST_INPUT_LABELS[k]} %`,
              value: directCostPcts[k],
            },
          ])
        )
      );
      return;
    }
    if (uiStep === 4) {
      logBenchmarkValues(
        CASH_INFLOWS_COMPONENT,
        HOTEL_STEP4_TITLE,
        cashInflowAuditRoute(4),
        Object.fromEntries(
          HOTEL_EXPENSE_PCT_KEYS.map((k) => [
            k,
            {
              label: `${EXPENSE_INPUT_LABELS[k]} %`,
              value: expensePcts[k],
            },
          ])
        )
      );
      return;
    }
    logBenchmarkValues(
      CASH_INFLOWS_COMPONENT,
      HOTEL_STEP5_TITLE,
      cashInflowAuditRoute(5),
      Object.fromEntries(
        HOTEL_DEPRECIATION_FIELD_KEYS.map((k) => [
          k,
          {
            label: DEPRECIATION_FIELD_LABELS[k],
            value: depFieldValues[k],
          },
        ])
      )
    );
  }, [
    currentStep,
    depFieldValues,
    directCostPcts,
    expensePcts,
    projectInfo.buildingType,
    revPcts,
  ]);

  const validateStep = (step: number): boolean => {
    const next: Errors = {};
    if (step === 0) {
      if (projectInfo.buildingType === "retail") {
        Object.assign(
          next,
          validateRetailRevenueStep(getOperationalRetailHoldSnapshot())
        );
      } else if (projectInfo.buildingType === "office") {
        Object.assign(
          next,
          validateOfficeRevenueStep(getOperationalOfficeHoldSnapshot())
        );
      } else if (projectInfo.buildingType === "residential") {
        Object.assign(
          next,
          validateResidentialRevenueStep(getOperationalResidentialHoldSnapshot())
        );
      } else {
        Object.assign(
          next,
          validateHotelRevenueStep(getOperationalHotelHoldSnapshot())
        );
      }
    }
    if (step === 1) {
      if (projectInfo.buildingType === "office") {
        Object.assign(
          next,
          validateOfficeOtherIncomeStep(getOperationalOfficeHoldSnapshot())
        );
      } else if (projectInfo.buildingType === "retail") {
        Object.assign(
          next,
          validateRetailOtherIncomeStep(getOperationalRetailHoldSnapshot())
        );
      } else if (projectInfo.buildingType === "residential") {
        Object.assign(
          next,
          validateResidentialOtherIncomeStep(
            getOperationalResidentialHoldSnapshot()
          )
        );
      } else {
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
    }
    if (step === 2) {
      if (isRetail) {
        Object.assign(
          next,
          validateRetailOpexStep(getOperationalRetailHoldSnapshot())
        );
      } else if (projectInfo.buildingType === "office") {
        Object.assign(
          next,
          validateOfficeOpexStep(getOperationalOfficeHoldSnapshot())
        );
      } else if (isResidential) {
        Object.assign(
          next,
          validateResidentialOpexStep(getOperationalResidentialHoldSnapshot())
        );
      } else {
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
    }
    if (step === 3) {
      if (isRetail) {
        Object.assign(
          next,
          validateRetailDepreciationStep(getOperationalRetailHoldSnapshot())
        );
      } else if (isResidential) {
        Object.assign(
          next,
          validateResidentialDepreciationStep(
            getOperationalResidentialHoldSnapshot()
          )
        );
      } else if (projectInfo.buildingType === "office") {
        Object.assign(
          next,
          validateOfficeDepreciationStep(getOperationalOfficeHoldSnapshot())
        );
      } else {
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
    }
    if (step === 4 && !isRetail) {
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
    if (currentStep === 0) {
      step0PersistRef.current?.();
    }
    if (currentStep === 2 && isRetail) {
      const snap = getOperationalRetailHoldSnapshot();
      const retailOpex = buildRetailOpexFromSnapshot(snap);
      if (retailOpex) {
        updateProjectInfo({ retailOpex }, "operational");
      }
    }
    if (currentStep === 2 && projectInfo.buildingType === "office") {
      const snap = getOperationalOfficeHoldSnapshot();
      const officeOpex = buildOfficeOpexFromSnapshot(snap);
      if (officeOpex) {
        updateProjectInfo({ officeOpex }, "operational");
      }
    }
    if (currentStep === 2 && isResidential) {
      const snap = getOperationalResidentialHoldSnapshot();
      const residentialOpex = buildResidentialOpexFromSnapshot(snap);
      if (residentialOpex) {
        updateProjectInfo({ residentialOpex }, "operational");
      }
    }
    if (currentStep === 3 && isResidential) {
      const snap = getOperationalResidentialHoldSnapshot();
      const residentialDepreciation =
        buildResidentialDepreciationFromSnapshot(snap);
      if (residentialDepreciation) {
        updateProjectInfo({ residentialDepreciation }, "operational");
      }
    }
    if (currentStep === 3 && isRetail) {
      const snap = getOperationalRetailHoldSnapshot();
      const rows =
        snap?.depTotalValues?.map((totalDep, i) => ({
          year: i + 1,
          constructionDep: snap?.depConstructionValues?.[i] ?? 0,
          ffeDep: snap?.depFfeValues?.[i] ?? 0,
          tiAmort: snap?.depTiValues?.[i] ?? 0,
          leasingCommAmort: snap?.depLeasingCommValues?.[i] ?? 0,
          totalDep,
          ar: snap?.wcArValues?.[i] ?? 0,
          ap: snap?.wcApValues?.[i] ?? 0,
          netWc: snap?.wcNetValues?.[i] ?? 0,
          totalRevenue:
            (snap?.revenueValues?.[i] ?? 0) +
            (snap?.otherIncomeTotalValues?.[i] ?? 0),
        })) ?? [];
      const retailDepreciation = buildRetailDepreciationFromSnapshot(snap, rows);
      if (retailDepreciation) {
        updateProjectInfo({ retailDepreciation }, "operational");
      }
    }
    if (currentStep === 3 && projectInfo.buildingType === "office") {
      const snap = getOperationalOfficeHoldSnapshot();
      const cashOutflowsState = useFinModelStore.getState().operational.cashOutflows;
      const constructionBase = Math.max(
        0,
        cashOutflowsState.constructionCost || 0
      );
      const ffeBase = Math.max(0, cashOutflowsState.ffe || 0);
      const rows =
        snap?.depTotalValues?.map((totalDep, i) => ({
          year: i + 1,
          constructionDep: snap?.depConstructionValues?.[i] ?? 0,
          ffeDep: snap?.depFfeValues?.[i] ?? 0,
          officeTiAmort: snap?.depOfficeTiValues?.[i] ?? 0,
          retailTiAmort: snap?.depRetailTiValues?.[i] ?? 0,
          officeLeasingCommAmort: snap?.depOfficeLeasingCommValues?.[i] ?? 0,
          retailLeasingCommAmort: snap?.depRetailLeasingCommValues?.[i] ?? 0,
          totalDep,
          ar: snap?.wcArValues?.[i] ?? 0,
          ap: snap?.wcApValues?.[i] ?? 0,
          netWc: snap?.wcNetValues?.[i] ?? 0,
          totalRevenue:
            (snap?.totalBaseRentValues?.[i] ?? 0) +
            (snap?.otherIncomeTotalValues?.[i] ?? 0),
        })) ?? [];
      const officeDepreciation = buildOfficeDepreciationFromSnapshot(
        snap,
        rows,
        {
          constructionCost: constructionBase,
          ffe: ffeBase,
          officeTi:
            cashOutflowsState.officeTiAllowance ?? snap?.officeTiCapital ?? 0,
          retailTi:
            cashOutflowsState.retailTiAllowance ?? snap?.retailTiCapital ?? 0,
          officeLeasingComm:
            cashOutflowsState.officeLeasingCommissions ??
            snap?.officeLeasingCommCapital ??
            0,
          retailLeasingComm:
            cashOutflowsState.retailLeasingCommissions ??
            snap?.retailLeasingCommCapital ??
            0,
        }
      );
      if (officeDepreciation) {
        updateProjectInfo({ officeDepreciation }, "operational");
      }
    }
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

  // 🔍 TEMP DEBUG: Diagnose hydration + project info mismatch (remove after investigation)
  useEffect(() => {
    const state = useFinModelStore.getState() as any;

    // eslint-disable-next-line no-console
    console.log("=== COMPONENT 2: FULL STORE DEBUG ===");

    // Check store paths
    // eslint-disable-next-line no-console
    console.log("Root projectInfo:", state.projectInfo);
    // eslint-disable-next-line no-console
    console.log("Operational projectInfo:", state.operational?.projectInfo);
    // eslint-disable-next-line no-console
    console.log("Root cashInflows:", state.cashInflows);
    // eslint-disable-next-line no-console
    console.log("Operational cashInflows:", state.operational?.cashInflows);

    // Check component-level values
    // eslint-disable-next-line no-console
    console.log("Local projectInfo:", projectInfo);
    // eslint-disable-next-line no-console
    console.log("Local cashInflows:", cashInflows);
    // eslint-disable-next-line no-console
    // eslint-disable-next-line no-console
    console.log("typeof window:", typeof window);

    // eslint-disable-next-line no-console
    console.log("step routing deps:", {
      cashInflows_keys: cashInflows ? Object.keys(cashInflows as any) : "undefined",
      projectInfo_city: projectInfo?.city,
      projectInfo_buildingType: projectInfo?.buildingType,
    });

    // Flag potential issues
    if (state.projectInfo && !state.operational?.projectInfo) {
      // eslint-disable-next-line no-console
      console.warn(
        "⚠️ WARNING: Root projectInfo has data but operational does not - possible root-level read!"
      );
    }
    if (!projectInfo?.city) {
      // eslint-disable-next-line no-console
      console.warn(
        "⚠️ WARNING: projectInfo.city is empty - may cause fallback to defaults"
      );
    }
  }, [cashInflows, projectInfo]);

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
          {currentStep === 0 &&
            (projectInfo.buildingType === "office" ? (
              <OfficeRevenueStep
                fieldError={fieldError}
                defaultOfficeGlaSqft={defaultOfficeGlaSqft}
                defaultRetailGlaSqft={defaultRetailGlaSqft}
                onRegisterPersist={(persist) => {
                  step0PersistRef.current = persist;
                }}
              />
            ) : projectInfo.buildingType === "retail" ? (
              <RetailRevenueStep
                fieldError={fieldError}
                defaultGlaSqft={cashOutflows.buildingBUA || 0}
              />
            ) : projectInfo.buildingType === "residential" ? (
              <ResidentialRevenueStep
                fieldError={fieldError}
                defaultResidentialGlaSqft={defaultResidentialGlaSqft}
                defaultRetailGlaSqft={defaultRetailGlaSqft}
                onRegisterPersist={(persist) => {
                  step0PersistRef.current = persist;
                }}
              />
            ) : projectInfo.buildingType === "hotel" ? (
              <HotelRevenueStep fieldError={fieldError} />
            ) : (
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-6 text-sm text-slate-400">
                Select <span className="text-slate-200">Hotel</span>,{" "}
                <span className="text-slate-200">Office</span>,{" "}
                <span className="text-slate-200">Residential</span>, or{" "}
                <span className="text-slate-200">Shopping Mall / Retail</span> in
                Component 1 to configure revenue assumptions.
              </div>
            ))}

          {currentStep === 1 && projectInfo.buildingType === "residential" && (
            <ResidentialOtherIncomeStep />
          )}

          {currentStep === 1 && projectInfo.buildingType === "office" && (
            <OfficeOtherIncomeStep />
          )}

          {currentStep === 1 && projectInfo.buildingType === "retail" && (
            <RetailOtherIncomeStep />
          )}

          {currentStep === 1 && projectInfo.buildingType === "hotel" && (
            <div className="space-y-8">
              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">
                  Step 2 — F&B and Other Sources of Revenues
                </h2>
                <div className="text-sm text-slate-400">
                  BENCHMARK &nbsp;{" "}
                  <span suppressHydrationWarning>
                    {mounted
                      ? `${projectInfo.hotelOperatingType || "resort"} · ${
                          projectInfo.hotelStarRating || "5"
                        } · ${(projectInfo.city || "dubai").toLowerCase()}`
                      : "—"}
                  </span>
                </div>
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
                              logC2HotelField(
                                2,
                                HOTEL_STEP2_TITLE,
                                `revPct_${k}`,
                                `${REVENUE_STACK_LABELS[k]} % of total hotel revenue`,
                                v
                              );
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

          {currentStep === 2 && isRetail && <RetailOpexStep />}

          {currentStep === 2 && isResidential && <ResidentialOpexStep />}

          {currentStep === 2 && projectInfo.buildingType === "office" && (
            <OfficeOpexStep />
          )}

          {currentStep === 2 && projectInfo.buildingType === "hotel" && (
            <div className="space-y-8">
              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">
                  Step 3 — Direct costs
                </h2>
                <div className="text-sm text-slate-400">
                  BENCHMARK &nbsp;{" "}
                  <span suppressHydrationWarning>
                    {mounted
                      ? `${projectInfo.hotelOperatingType || "resort"} · ${
                          projectInfo.hotelStarRating || "5"
                        } · ${(projectInfo.city || "dubai").toLowerCase()}`
                      : "—"}
                  </span>
                </div>
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
                              logC2HotelField(
                                3,
                                HOTEL_STEP3_TITLE,
                                `dcPct_${k}`,
                                `${DIRECT_COST_INPUT_LABELS[k]} %`,
                                v
                              );
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

          {currentStep === 3 && isRetail && <RetailDepreciationStep />}

          {currentStep === 3 && isResidential && (
            <ResidentialDepreciationStep />
          )}

          {currentStep === 3 && projectInfo.buildingType === "office" && (
            <OfficeDepreciationStep />
          )}

          {currentStep === 3 && projectInfo.buildingType === "hotel" && (
            <div className="space-y-8">
              <div>
                <h2 className="mb-2 text-xl font-semibold text-white">
                  Step 4 — Undistributed & fixed expenses
                </h2>
                <div className="text-sm text-slate-400">
                  BENCHMARK &nbsp;{" "}
                  <span suppressHydrationWarning>
                    {mounted
                      ? `${projectInfo.hotelOperatingType || "resort"} · ${
                          projectInfo.hotelStarRating || "5"
                        } · ${(projectInfo.city || "dubai").toLowerCase()}`
                      : "—"}
                  </span>
                </div>
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
                              logC2HotelField(
                                4,
                                HOTEL_STEP4_TITLE,
                                `exPct_${k}`,
                                `${EXPENSE_INPUT_LABELS[k]} %`,
                                v
                              );
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

          {currentStep === 4 && !isRetail && (
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
                <div className="mt-3">
                  <div className="text-sm text-slate-400">
                    BENCHMARK &nbsp; {projectInfo.hotelOperatingType || "resort"}{" "}
                    · {projectInfo.hotelStarRating || "5"} ·{" "}
                    {(projectInfo.city || "dubai").toLowerCase()}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Profile:{" "}
                    <span className="font-mono text-slate-400">
                      {depreciationProfileKey}
                    </span>
                    <span className="mx-2 text-slate-600">·</span>
                    {depreciationProfileSource}
                  </p>
                </div>
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
                                  logC2HotelField(
                                    5,
                                    HOTEL_STEP5_TITLE,
                                    `dep_${k}`,
                                    DEPRECIATION_FIELD_LABELS[k],
                                    v
                                  );
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
          currentStep === TOTAL_STEPS - 1 ? "Generate P&L →" : "Next →"
        }
      />
    </div>
  );
}

export default function OperationalCashInflowsPage() {
  return (
    <SearchParamsBoundary>
      <OperationalCashInflowsPageContent />
    </SearchParamsBoundary>
  );
}
