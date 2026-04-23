// src/types/scenario.ts

// Default shock driver types
export type ShockDriverType =
  | "adr"
  | "occupancy"
  | "constructionCost"
  | "constructionDuration"
  | "interestRate"
  | "operatingExpenses"
  | "exitCapRate"
  | "ffeReserve";

// Shock driver configuration
export interface ShockDriverConfig {
  id: ShockDriverType;
  name: string;
  baseValue: number;
  shockValue: number; // Percentage shock (-25 to +25)
  minShock: number; // e.g., -25
  maxShock: number; // e.g., +25
  step: number; // e.g., 5
  unit: "%" | "months" | "bps" | "pp" | "%rev";
  impactType: "revenue" | "cost" | "timeline" | "exit";
}

// Custom shock driver (user-defined)
export interface CustomShockDriver {
  id: string; // UUID
  name: string;
  baseValue: number;
  shockValue: number;
  minShock: number;
  maxShock: number;
  step: number;
  unit: "%" | "months" | "currency" | "bps" | "pp" | "%rev";
  impactType: "revenue" | "cost" | "timeline" | "custom";
  impactTarget?: string; // Which cash flow line item to affect
  customFormula?: string;
}

// Base case metrics (from Component 4/5)
export interface BaseCaseMetrics {
  unleveredIRR: number;
  leveredIRR: number;
  equityMultiple: number;
  peakEquity: number;
  totalDebt: number;
  minDSCR: number;
  paybackMonth: number;
}

// Scenario metrics (after applying shocks)
export interface ScenarioMetrics {
  unleveredIRR: number;
  leveredIRR: number;
  equityMultiple: number;
  peakEquity: number;
  totalDebt: number;
  minDSCR: number;
  paybackMonth: number;
  // Delta vs. base case
  unleveredIRRDelta: number;
  leveredIRRDelta: number;
  equityMultipleDelta: number;
  peakEquityDelta: number;
  totalDebtDelta: number;
  minDSCRDelta: number;
  paybackMonthDelta: number;
}

// Full scenario state
export interface ScenarioState {
  // Default shock drivers
  defaultDrivers: ShockDriverConfig[];

  // Custom shock drivers (max 3)
  customDrivers: CustomShockDriver[];

  // Base case metrics cache
  baseCaseMetrics: BaseCaseMetrics | null;

  // Current scenario metrics (after applying shocks)
  scenarioMetrics: ScenarioMetrics | null;

  // Is recalculation in progress
  isRecalculating: boolean;

  // Last calculation timestamp (for debouncing)
  lastCalculationAt: number | null;
}

