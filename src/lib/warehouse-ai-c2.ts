import { normalizeAiResearchData } from "@/lib/constants/aiPrompts";
import type { AiResearchData } from "@/store/useFinModelStore";

/** Prefer finite numbers; otherwise undefined (so callers can fall back). */
export function numOrUndef(...candidates: unknown[]): number | undefined {
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
    if (typeof c === "string" && c.trim() !== "") {
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

export function getAiValue(
  aiValue: number | undefined,
  fallback: number
): number {
  return aiValue != null && Number.isFinite(aiValue) ? aiValue : fallback;
}

/**
 * Resolve warehouse C2 operational payload from stored AI research.
 * Prefer warehouse schema keys (`step1_primary_revenue`, etc.).
 * `reasoning_notes` on c2_operational pass through unchanged (nested path)
 * or via `normalizeAiResearchData` (legacy flat keys).
 */
export function getWarehouseAiC2(
  aiResearchData: AiResearchData | undefined | null
): Record<string, unknown> | undefined {
  if (!aiResearchData) return undefined;
  const raw = aiResearchData as AiResearchData & {
    c2_operational?: Record<string, unknown>;
  };
  const c2 = raw.c2_operational;
  if (!c2) return undefined;

  const hasWarehouseNested =
    !!c2.step1_primary_revenue ||
    !!c2.step1_base_rent ||
    !!c2.step2_other_income ||
    !!c2.step3_operating_expenses ||
    !!c2.step4_depreciation_wc;

  if (!hasWarehouseNested) {
    const normalized = normalizeAiResearchData(raw) as {
      c2_operational?: Record<string, unknown>;
    };
    return normalized.c2_operational;
  }
  return c2 as Record<string, unknown>;
}

export type WarehouseAiStep1 = {
  base_rent_year_1_psf?: number;
  rent_escalation_pct?: number;
  opening_occupancy_pct?: number;
  stabilized_occupancy_pct?: number;
  lease_up_years?: number;
  free_rent_months?: number;
  yard_rate_psf?: number;
  parking_car_rate_monthly?: number;
  parking_trailer_rate_monthly?: number;
};

export function extractWarehouseAiStep1(
  c2: Record<string, unknown> | undefined
): WarehouseAiStep1 {
  const step =
    (c2?.step1_primary_revenue as Record<string, unknown> | undefined) ||
    (c2?.step1_base_rent as Record<string, unknown> | undefined) ||
    {};
  return {
    base_rent_year_1_psf: numOrUndef(
      step.base_rent_year_1_psf,
      step.baseRentYear1Psf
    ),
    rent_escalation_pct: numOrUndef(
      step.rent_escalation_pct,
      step.rentEscalationPct
    ),
    opening_occupancy_pct: numOrUndef(
      step.opening_occupancy_pct,
      step.opening_occupancy,
      step.openingOccupancy
    ),
    stabilized_occupancy_pct: numOrUndef(
      step.stabilized_occupancy_pct,
      step.stabilized_occupancy,
      step.stabilizedOccupancy
    ),
    lease_up_years: numOrUndef(step.lease_up_years, step.leaseUpYears),
    free_rent_months: numOrUndef(step.free_rent_months, step.freeRentMonths),
    yard_rate_psf: numOrUndef(step.yard_rate_psf, step.yardRatePsf),
    parking_car_rate_monthly: numOrUndef(
      step.parking_car_rate_monthly,
      step.parkingCarRateMonthly
    ),
    parking_trailer_rate_monthly: numOrUndef(
      step.parking_trailer_rate_monthly,
      step.parkingTrailerRateMonthly
    ),
  };
}

export type WarehouseAiStep2 = {
  cam_recovery_pct?: number;
  property_tax_recovery_pct?: number;
  insurance_recovery_pct?: number;
  signage_annual_revenue?: number;
};

export function extractWarehouseAiStep2(
  c2: Record<string, unknown> | undefined
): WarehouseAiStep2 {
  const step = (c2?.step2_other_income as Record<string, unknown> | undefined) || {};
  const cam = numOrUndef(step.cam_recovery_pct, step.camRecoveryPct);

  return {
    cam_recovery_pct: cam,
    property_tax_recovery_pct: numOrUndef(
      step.property_tax_recovery_pct,
      step.tax_recovery_pct,
      step.taxRecoveryPct
    ),
    insurance_recovery_pct: numOrUndef(
      step.insurance_recovery_pct,
      step.insuranceRecoveryPct
    ),
    signage_annual_revenue: numOrUndef(
      step.signage_annual_revenue,
      step.signage_revenue_annual,
      step.signageRevenue
    ),
  };
}

export type WarehouseAiStep3 = {
  property_tax_pct_of_capex?: number;
  insurance_pct_of_capex?: number;
  maintenance_pct_of_building_cost?: number;
  landscaping_rate_psf?: number;
  utilities_rate_psf?: number;
  security_annual_cost?: number;
  management_fee_pct_revenue?: number;
  g_and_a_pct_revenue?: number;
};

export function extractWarehouseAiStep3(
  c2: Record<string, unknown> | undefined
): WarehouseAiStep3 {
  const step =
    (c2?.step3_operating_expenses as Record<string, unknown> | undefined) || {};
  const utilities = numOrUndef(
    step.utilities_rate_psf,
    step.utility_rate_psf,
    step.utilityRatePsf
  );

  return {
    property_tax_pct_of_capex: numOrUndef(
      step.property_tax_pct_of_capex,
      step.propertyTaxPctOfCapex
    ),
    insurance_pct_of_capex: numOrUndef(
      step.insurance_pct_of_capex,
      step.insurancePctOfCapex
    ),
    maintenance_pct_of_building_cost: numOrUndef(
      step.maintenance_pct_of_building_cost,
      step.maintenance_pct_of_building,
      step.maintenancePctOfBuilding
    ),
    landscaping_rate_psf: numOrUndef(
      step.landscaping_rate_psf,
      step.landscapingRatePsf,
      step.landscapingRate
    ),
    utilities_rate_psf: utilities,
    security_annual_cost: numOrUndef(
      step.security_annual_cost,
      step.security_annual,
      step.securityAnnual
    ),
    management_fee_pct_revenue: numOrUndef(
      step.management_fee_pct_revenue,
      step.management_fee_pct,
      step.managementFeePct
    ),
    g_and_a_pct_revenue: numOrUndef(
      step.g_and_a_pct_revenue,
      step.g_and_a_pct,
      step.gAndAPct
    ),
  };
}

export type WarehouseAiStep4 = {
  building_useful_life_years?: number;
  site_improvements_useful_life_years?: number;
  ffe_useful_life_years?: number;
  ffe_reserve_pct_revenue?: number;
  accounts_receivable_days?: number;
  accounts_payable_days?: number;
};

export function extractWarehouseAiStep4(
  c2: Record<string, unknown> | undefined
): WarehouseAiStep4 {
  const step =
    (c2?.step4_depreciation_wc as Record<string, unknown> | undefined) || {};
  return {
    building_useful_life_years: numOrUndef(
      step.building_useful_life_years,
      step.buildingUsefulLifeYears
    ),
    site_improvements_useful_life_years: numOrUndef(
      step.site_improvements_useful_life_years,
      step.site_useful_life_years,
      step.siteUsefulLifeYears
    ),
    ffe_useful_life_years: numOrUndef(
      step.ffe_useful_life_years,
      step.ffeUsefulLifeYears
    ),
    ffe_reserve_pct_revenue: numOrUndef(
      step.ffe_reserve_pct_revenue,
      step.ffe_reserve_pct_of_revenue,
      step.ffeReservePctOfRevenue
    ),
    accounts_receivable_days: numOrUndef(
      step.accounts_receivable_days,
      step.ar_days,
      step.arDays
    ),
    accounts_payable_days: numOrUndef(
      step.accounts_payable_days,
      step.ap_days,
      step.apDays
    ),
  };
}
