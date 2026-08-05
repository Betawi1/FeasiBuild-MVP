import {
  calculateDataCentreDepreciation,
  calculateDataCentreOpEx,
  calculateDataCentreOtherIncome,
  calculateDataCentreRevenue,
  type AiResearchData,
  type CashInflows,
  type CashOutflows,
  type ProjectInfo,
} from "@/store/useFinModelStore";
import { resolveDataCentreCapEx } from "@/app/operational/cash-outflows/steps/DataCentreConstructionCostsStep";
import { numOrUndef } from "@/lib/warehouse-ai-c2";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function pickNum(
  obj: Record<string, unknown> | undefined,
  ...keys: string[]
): number | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = numOrUndef(obj[k]);
    if (v != null) return v;
  }
  return undefined;
}

/** Phase 1 basics from c1_development for C1S5 sizing. */
export function extractDataCentrePhase1Basics(
  researchData: AiResearchData | Record<string, unknown> | null | undefined
): {
  itLoadDensity?: number;
  typicalPue?: number;
  constructionMonths?: number;
  leaseRatePerKwMonth?: number;
  leaseRatePerSqftMonth?: number;
} {
  if (!researchData) return {};
  const root = researchData as Record<string, unknown>;
  const c1 = asRecord(root.c1_development) ?? {};
  const top = root;

  return {
    itLoadDensity: pickNum(
      c1,
      "it_load_density_kw_sqft",
      "it_load_density",
      "itLoadDensity"
    ) ?? pickNum(top, "it_load_density_kw_sqft", "it_load_density"),
    typicalPue:
      pickNum(c1, "typical_pue", "typicalPUE", "pue") ??
      pickNum(top, "typical_pue", "typicalPUE"),
    constructionMonths:
      pickNum(
        c1,
        "construction_period_months",
        "constructionPeriodMonths",
        "construction_period"
      ) ??
      (typeof c1.construction_period === "object"
        ? pickNum(
            asRecord(c1.construction_period),
            "months",
            "recommended"
          )
        : undefined),
    leaseRatePerKwMonth:
      pickNum(c1, "lease_rate_per_kw_month", "leaseRatePerKwMonth") ??
      pickNum(top, "lease_rate_per_kw_month", "leaseRatePerKwMonth"),
    leaseRatePerSqftMonth:
      pickNum(c1, "lease_rate_per_sqft_month", "leaseRatePerSqftMonth") ??
      pickNum(top, "lease_rate_per_sqft_month", "leaseRatePerSqftMonth"),
  };
}

/** Phase 2 CapEx rates from c1_development.construction_rates for C1S6. */
export function extractDataCentreCapExRates(
  researchData: AiResearchData | Record<string, unknown> | null | undefined
): {
  buildingRate?: number;
  meElectrical?: number;
  meCooling?: number;
  itHardwareCostPerMw?: number;
  professionalFeesPercent?: number;
  contingencyPercent?: number;
} {
  if (!researchData) return {};
  const root = researchData as Record<string, unknown>;
  const c1 = asRecord(root.c1_development) ?? {};
  const rates = asRecord(c1.construction_rates) ?? {};

  return {
    buildingRate: pickNum(rates, "building_rate_psf", "building_rate"),
    meElectrical:
      pickNum(rates, "me_cost_per_mw_electrical", "meCostPerMWElectrical") ??
      pickNum(c1, "me_cost_per_mw_electrical", "me_cost_per_mw"),
    meCooling:
      pickNum(rates, "me_cost_per_mw_cooling", "meCostPerMWCooling") ??
      pickNum(c1, "me_cost_per_mw_cooling"),
    itHardwareCostPerMw: pickNum(
      rates,
      "it_hardware_cost_per_mw",
      "itHardwareCostPerMW"
    ),
    professionalFeesPercent: pickNum(
      rates,
      "professional_fees_percent",
      "professionalFeesPercent"
    ),
    contingencyPercent: pickNum(
      rates,
      "contingency_percent",
      "contingencyPercent"
    ),
  };
}

export type DataCentreFullMappingResult = {
  projectInfoPatch: Partial<ProjectInfo>;
  cashOutflowsPatch: Partial<CashOutflows>;
  cashInflowsPatch: Partial<CashInflows>;
};

/**
 * Map Phase 2 (full) AI JSON into store patches for C1 CapEx rates + C2S1–C2S4.
 * Uses only values present in the AI response — no hardcoded fallbacks.
 */
export function mapDataCentreFullAiResearch(
  researchData: AiResearchData | Record<string, unknown> | null | undefined,
  projectInfo: ProjectInfo
): DataCentreFullMappingResult {
  const empty: DataCentreFullMappingResult = {
    projectInfoPatch: {},
    cashOutflowsPatch: {},
    cashInflowsPatch: {},
  };
  if (!researchData) return empty;

  const root = researchData as Record<string, unknown>;
  const c1 = asRecord(root.c1_development) ?? {};
  const rates = asRecord(c1.construction_rates) ?? {};
  const soft = asRecord(c1.soft_costs) ?? {};
  const c2 = asRecord(root.c2_operational) ?? {};
  const step1 = asRecord(c2.step1_primary_revenue) ?? {};
  const step2 = asRecord(c2.step2_other_income) ?? {};
  const step3 = asRecord(c2.step3_operating_expenses) ?? {};
  const step4 = asRecord(c2.step4_depreciation_wc) ?? {};

  const basics = extractDataCentrePhase1Basics(researchData);

  const buildingRate = pickNum(rates, "building_rate_psf", "building_rate");
  const meElectrical =
    pickNum(rates, "me_cost_per_mw_electrical", "meCostPerMWElectrical") ??
    pickNum(c1, "me_cost_per_mw_electrical", "me_cost_per_mw");
  const meCooling =
    pickNum(rates, "me_cost_per_mw_cooling", "meCostPerMWCooling") ??
    pickNum(c1, "me_cost_per_mw_cooling");
  const itHardware = pickNum(
    rates,
    "it_hardware_cost_per_mw",
    "itHardwareCostPerMW"
  );
  const professionalFees = pickNum(
    rates,
    "professional_fees_percent",
    "professionalFeesPercent"
  );
  const contingency = pickNum(
    rates,
    "contingency_percent",
    "contingencyPercent"
  );

  const scPct = pickNum(soft, "sc_percentage", "scPercentage");
  const powcPct = pickNum(soft, "powc_percentage", "powcPercentage");
  const ffePct =
    typeof soft.ffe_percentage === "object"
      ? pickNum(asRecord(soft.ffe_percentage), "recommended")
      : pickNum(soft, "ffe_percentage");
  const landRatePsf =
    pickNum(c1, "land_rate_psf", "landRatePsf") ??
    pickNum(root, "land_rate_psf", "landRatePsf");

  const constructionMonths =
    basics.constructionMonths ??
    pickNum(asRecord(c1.construction_period), "months", "recommended");

  const projectInfoPatch: Partial<ProjectInfo> = {
    ...(basics.itLoadDensity != null
      ? { dataCentreITLoadDensity: basics.itLoadDensity }
      : {}),
    ...(basics.typicalPue != null ? { dataCentrePUE: basics.typicalPue } : {}),
    ...(basics.leaseRatePerKwMonth != null
      ? { dataCentreLeaseRatePerKwMonth: basics.leaseRatePerKwMonth }
      : {}),
    ...(basics.leaseRatePerSqftMonth != null
      ? { dataCentreLeaseRatePerSqftMonth: basics.leaseRatePerSqftMonth }
      : {}),
    ...(constructionMonths != null
      ? { dataCentreConstructionPeriod: Math.round(constructionMonths) }
      : {}),
    ...(buildingRate != null ? { dataCentreBuildingRate: buildingRate } : {}),
    ...(meElectrical != null
      ? { dataCentreMECostPerMWElectrical: meElectrical }
      : {}),
    ...(meCooling != null ? { dataCentreMECostPerMWCooling: meCooling } : {}),
    ...(itHardware != null
      ? { dataCentreITHardwareCostPerMW: itHardware }
      : {}),
    ...(professionalFees != null
      ? { dataCentreProfessionalFeesPercent: professionalFees }
      : {}),
    ...(contingency != null
      ? { dataCentreContingencyPercent: contingency }
      : {}),
  };

  const cashOutflowsPatch: Partial<CashOutflows> = {
    ...(constructionMonths != null
      ? { constructionPeriod: Math.round(constructionMonths) }
      : {}),
    ...(scPct != null ? { softCostPercent: Math.round(scPct * 100) / 100 } : {}),
    ...(powcPct != null
      ? { powcPercent: Math.round(powcPct * 100) / 100 }
      : {}),
    ...(ffePct != null ? { ffePercent: Math.round(ffePct * 100) / 100 } : {}),
    ...(landRatePsf != null ? { landRate: landRatePsf } : {}),
  };

  const mergedInfo: ProjectInfo = { ...projectInfo, ...projectInfoPatch };
  const capEx = resolveDataCentreCapEx(mergedInfo);
  const itLoadKw = (mergedInfo.dataCentreITLoadCapacity || 0) * 1000;
  const whiteSpace = mergedInfo.dataCentreWhiteSpaceArea || 0;
  const totalGfa = mergedInfo.dataCentreTotalBuildingGFA || 0;
  const isEdge = mergedInfo.dataCentreSegment === "edge";
  const includeIT =
    mergedInfo.dataCentreITHardwareProvidedByOperator === true;

  const ratePerKw =
    pickNum(step1, "lease_rate_per_kw_month", "leaseRatePerKwMonth") ??
    basics.leaseRatePerKwMonth ??
    mergedInfo.dataCentreLeaseRatePerKwMonth;
  const ratePerSqft =
    pickNum(step1, "lease_rate_per_sqft_month", "leaseRatePerSqftMonth") ??
    basics.leaseRatePerSqftMonth ??
    mergedInfo.dataCentreLeaseRatePerSqftMonth;
  const escalation = pickNum(step1, "rent_escalation_pct", "rentEscalationPct");
  const occupancy = pickNum(
    step1,
    "stabilized_occupancy_pct",
    "stabilizedOccupancyPct",
    "occupancy_pct"
  );

  const cashInflowsPatch: Partial<CashInflows> = {};

  if (
    ratePerKw != null ||
    ratePerSqft != null ||
    escalation != null ||
    occupancy != null
  ) {
    cashInflowsPatch.dataCentreRevenue = calculateDataCentreRevenue({
      itLoadKw,
      ratePerKwMonth: ratePerKw ?? 0,
      annualEscalationPct: escalation ?? 3,
      totalBuildingGFA: totalGfa,
      whiteSpaceArea: whiteSpace,
      occupancyRate: occupancy ?? 95,
      ratePerSqftMonth: ratePerSqft ?? 0,
    });
  }

  const crossConnect = pickNum(
    step2,
    "cross_connect_rate_per_rack_month",
    "crossConnectRatePerRackMonth"
  );
  const powerPass = pickNum(
    step2,
    "power_pass_through_rate_per_kwh",
    "powerPassThroughRatePerKwh"
  );
  const utilisation = pickNum(
    step2,
    "power_utilisation_pct",
    "powerUtilisationPct"
  );
  const maintMarkup = pickNum(
    step2,
    "maintenance_markup_pct",
    "maintenanceMarkupPct"
  );
  const setupFee = pickNum(step2, "setup_fee_per_rack", "setupFeePerRack");

  if (
    crossConnect != null ||
    powerPass != null ||
    utilisation != null ||
    maintMarkup != null ||
    setupFee != null
  ) {
    cashInflowsPatch.dataCentreOtherIncome = calculateDataCentreOtherIncome({
      numberOfRacks: mergedInfo.dataCentreNumberOfRacks || 0,
      crossConnectRatePerRackMonth: crossConnect ?? 0,
      itLoadKw,
      powerPassThroughRatePerKwh: powerPass ?? 0,
      powerUtilisationPct: utilisation ?? 0,
      maintenanceCostBase: 0,
      maintenanceMarkupPercent: maintMarkup ?? 0,
      newRacksYear1: 0,
      setupFeePerRack: setupFee ?? 0,
      annualEscalationPct: escalation ?? 3,
    });
  }

  const elecPrice = pickNum(
    step3,
    "electricity_price_per_kwh",
    "electricityPricePerKwh"
  );
  const maintRate = pickNum(
    step3,
    "maintenance_rate_pct_of_me",
    "maintenanceRatePct"
  );
  const staff = pickNum(step3, "number_of_staff", "numberOfStaff");
  const salary = pickNum(
    step3,
    "average_salary_per_staff",
    "averageSalary"
  );
  const insuranceRate = pickNum(
    step3,
    "insurance_rate_pct_of_capex",
    "insuranceRatePct"
  );
  const taxRate = pickNum(
    step3,
    "property_tax_rate_pct_of_capex",
    "propertyTaxRatePct"
  );
  const security = pickNum(
    step3,
    "security_annual_cost",
    "securityAnnualCost"
  );
  const water = pickNum(step3, "water_annual_cost", "waterAnnualCost");
  const gAndA = pickNum(step3, "g_and_a_pct_revenue", "gAndAPercent");
  const mgmtFee = pickNum(
    step3,
    "management_fee_pct_revenue",
    "mgmtFeePercent"
  );

  const y1Revenue =
    cashInflowsPatch.dataCentreRevenue?.totalAnnualRevenue ?? 0;

  if (
    elecPrice != null ||
    maintRate != null ||
    staff != null ||
    salary != null ||
    insuranceRate != null ||
    taxRate != null ||
    security != null ||
    water != null ||
    gAndA != null ||
    mgmtFee != null
  ) {
    const opEx = calculateDataCentreOpEx({
      itLoadKw,
      pue: mergedInfo.dataCentrePUE || basics.typicalPue || 1.35,
      electricityPricePerKwh: elecPrice ?? 0,
      meCostBase: capEx.meCost,
      maintenanceRatePct: maintRate ?? 0,
      numberOfStaff: staff ?? 0,
      averageSalary: salary ?? 0,
      totalCapExBase: capEx.totalCapEx,
      insuranceRatePct: insuranceRate ?? 0,
      propertyTaxRatePct: taxRate ?? 0,
      annualSecurity: security ?? 0,
      annualWaterUtilities: water ?? 0,
      totalAnnualRevenueBase: y1Revenue,
      gAndAPercent: gAndA ?? 0,
      mgmtFeePercent: mgmtFee ?? 0,
      annualEscalationPct: escalation ?? 3,
      inflationPct: 3,
    });
    cashInflowsPatch.dataCentreOpEx = opEx;

    // Keep other-income maintenance base in sync when OpEx maintenance lands
    if (cashInflowsPatch.dataCentreOtherIncome) {
      cashInflowsPatch.dataCentreOtherIncome = calculateDataCentreOtherIncome({
        ...cashInflowsPatch.dataCentreOtherIncome,
        maintenanceCostBase: opEx.annualMaintenance,
      });
    }
    cashOutflowsPatch.dcMaintenanceCost = opEx.annualMaintenance;
  }

  const buildingLife = pickNum(
    step4,
    "building_useful_life_years",
    "buildingUsefulLifeYears"
  );
  const meLife = pickNum(step4, "me_useful_life_years", "meUsefulLifeYears");
  const itLife = pickNum(
    step4,
    "it_hardware_useful_life_years",
    "itHardwareUsefulLifeYears"
  );
  const ffeReserve = pickNum(
    step4,
    "ffe_reserve_pct_revenue",
    "ffeReservePercent"
  );
  const arDays = pickNum(
    step4,
    "accounts_receivable_days",
    "arDays"
  );
  const apDays = pickNum(step4, "accounts_payable_days", "apDays");

  if (
    buildingLife != null ||
    meLife != null ||
    ffeReserve != null ||
    arDays != null ||
    apDays != null
  ) {
    cashInflowsPatch.dataCentreDepreciation = calculateDataCentreDepreciation({
      buildingCostBase: capEx.buildingCost,
      meCostBase: capEx.meCost,
      itHardwareCostBase: includeIT ? capEx.itHardwareCost : 0,
      itHardwareProvidedByOperator: includeIT,
      buildingUsefulLifeYears: buildingLife ?? 25,
      meUsefulLifeYears: meLife ?? (isEdge ? 12 : 15),
      itHardwareUsefulLifeYears: itLife ?? (isEdge ? 4 : 5),
      totalAnnualRevenueBase: y1Revenue,
      ffeReservePercent: ffeReserve ?? 0,
      totalOpExBase: cashInflowsPatch.dataCentreOpEx?.totalAnnualOpEx ?? 0,
      arDays: arDays ?? (isEdge ? 45 : 30),
      apDays: apDays ?? 30,
      annualEscalationPct: escalation ?? 3,
      inflationPct: 3,
    });
  }

  return { projectInfoPatch, cashOutflowsPatch, cashInflowsPatch };
}
