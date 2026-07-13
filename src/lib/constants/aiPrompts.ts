export type AiAssetType =
  | "hotel"
  | "retail"
  | "shopping-mall"
  | "office"
  | "residential-btr"
  | "sale-residential-landed"
  | "sale-residential-highrise"
  | "sale-commercial-landed"
  | "sale-commercial-strata";

export type AiResearchLocation = {
  country: string;
  city: string;
  currency: string;
  subMarket?: string;
  coordinates?: { lat: number; lng: number } | null;
};

export type AiResearchBuildingConfig = {
  basements?: number;
  podiums?: number;
  groundFloors?: number;
  guestRoomFloors?: number;
  towerFloors?: number;
  totalUnits?: number;
  landAreaPerUnit?: number;
  buaPerUnit?: number;
  totalBUA?: number;
  totalBuildingBUA?: number;
  basementBUA?: number;
  podiumBUA?: number;
  guestRoomGLA?: number;
  totalKeys?: number;
  plotArea?: number;
  residentialGLA?: number;
  retailGLA?: number;
  retailFloors?: number;
  residentialFloors?: number;
  officeFloors?: number;
  officeGLA?: number;
  commonArea?: number;
  gla?: number;
  glaSqft?: number;
  coworkingDelivery?: string;
  operatingSegment?: string;
  starRating?: string;
  positioning?: string;
  marketPositioning?: string;
  furnishingLevel?: string;
  isServiced?: boolean;
  numUnits?: number;
  commonAreaPct?: number;
  totalLandArea?: number;
  landArea?: number;
  upperFloors?: number;
};

export type AiResearchOptions = {
  assetType: AiAssetType;
  location: AiResearchLocation;
  buildingConfig: AiResearchBuildingConfig;
};

export type AiGuardrailRange = {
  min: number;
  max: number;
  recommended: number;
};

export type AiResearchResult = {
  fx_rate_to_usd?: number;
  c1_development: Record<string, unknown>;
  c2_operational?: Record<string, unknown>;
  c2_sales?: Record<string, unknown>;
  hints?: {
    contingency_text?: string;
    construction_period_text?: string;
    sales_launch_text?: string;
  };
  guardrails?: {
    land_tdc_target_pct?: AiGuardrailRange;
    dc_tdc_target_pct?: AiGuardrailRange;
  };
};

// Land Use Category Mapping for AI Research
export type LandUseCategory =
  | "Residential Land"
  | "Commercial Land"
  | "Office/Commercial Land"
  | "Hospitality/Tourism Land"
  | "Industrial Land"
  | "Mixed-Use Land";

const ASSET_TO_LAND_CATEGORY: Record<AiAssetType, LandUseCategory> = {
  hotel: "Hospitality/Tourism Land",
  retail: "Commercial Land",
  "shopping-mall": "Commercial Land",
  office: "Office/Commercial Land",
  "residential-btr": "Residential Land",
  "sale-residential-landed": "Residential Land",
  "sale-residential-highrise": "Residential Land",
  "sale-commercial-landed": "Commercial Land",
  "sale-commercial-strata": "Commercial Land",
};

function getLandCategory(assetType: AiAssetType): LandUseCategory {
  return ASSET_TO_LAND_CATEGORY[assetType];
}

const HYPER_LOCAL_INSTRUCTIONS = `
CRITICAL: If the user provides a specific sub-market, neighborhood, or exact coordinates, you MUST provide benchmarks specific to that micro-location, not just the general city averages. Micro-location data takes precedence over city-wide data.
`;

const JSON_OUTPUT_INSTRUCTIONS = `
CRITICAL OUTPUT FORMAT:
Return ONLY valid JSON. No markdown, no code fences, no commentary outside the JSON object.

Use this exact top-level structure (nested keys required — do not flatten C1 rates):
{
  "c1_development": {
    "construction_rates": {
      "building_rate_psf": number,
      "parking_rate_psf": number,
      "basement_rate_psf": number,
      "infrastructure_rate_psf": number
    },
    "soft_costs": {
      "sc_percentage": number,
      "powc_percentage": number,
      "ffe_percentage": {
        "recommended": number,
        "min_range": number,
        "max_range": number,
        "justification": "short string"
      }
    },
    "land_rate_psf": number,
    "construction_period": {
      "months": number,
      "range": "e.g. 24-36",
      "justification": "short string"
    },
    "s_curve": {
      "stage_1_pct": number,
      "stage_2_pct": number,
      "stage_3_pct": number,
      "stage_4_pct": number,
      "justification": "short string"
    },
    "powc_breakdown": {
      "site_establishment_pct": number,
      "overhead_pct": number,
      "authority_fees_pct": number
    },
    "sc_breakdown": {
      "architect_pct": number,
      "pm_pct": number,
      "engineering_pct": number,
      "geotech_pct": number,
      "other_pct": number
    }
  },
  "c2_operational": { ... },   // operational stream only — omit for sale-only assets
  "c2_sales": { ... },         // sale stream only — omit for operational-only assets
  "hints": {
    "contingency_text": "1-2 sentence rationale for contingency %",
    "construction_period_text": "1-2 sentence rationale for construction period",
    "sales_launch_text": "1-2 sentence rationale for sales launch timing (sale stream) or N/A for operational"
  },
  "guardrails": {
    "land_tdc_target_pct": { "min": number, "max": number, "recommended": number },
    "dc_tdc_target_pct": { "min": number, "max": number, "recommended": number }
  }
}

All monetary rates must be in the project's local currency per sqft unless noted otherwise.
All percentages must be numeric values (e.g. 7.5 for 7.5%, not 0.075).
Base estimates on current market data for the specified city and country.
`.trim();

const C1_DEVELOPMENT_FIELDS = `
c1_development MUST use the nested structure above.
Required numeric fields:
- construction_rates.building_rate_psf, parking_rate_psf, basement_rate_psf
- soft_costs.sc_percentage, powc_percentage, ffe_percentage.recommended/min_range/max_range
- land_rate_psf
- construction_period.months (+ range string)
- s_curve.stage_1_pct through stage_4_pct (must sum to ~100)
- powc_breakdown and sc_breakdown percentage shares (must sum to ~100 each)
`.trim();

const OPERATIONAL_C2_FIELDS = `
c2_operational MUST use nested hotel/retail/office fields where applicable.

CRITICAL: ALL RENT RATES MUST BE ANNUAL (per year), NOT MONTHLY.
- If you find monthly rent rates in your research, you MUST multiply by 12 to convert to annual.
- Example: If market rent is RM 10/psf/month, you MUST return base_rent_year_1_psf: 120 (not 10).
- Always clearly state in your <reasoning> block whether you found monthly or annual rates, and show the conversion.

For hotels include:
- room_revenues: { adr_year_1, adr_inflation_pct }
- revenue_mix: { rooms, food, beverage, room_service, telecom, spa, rental } (sum ≈ 100)
- direct_costs: { rooms_payroll, rooms_other, food_cos, beverage_cos, fnb_payroll, fnb_other, telecom, spa, rental }
- undistributed_expenses: { g_and_a, marketing, prop_ops, utilities, base_mgmt_fee_room_rev, incentive_fee_ebitda, renovation_y1, renovation_y2, renovation_y3_10 }
- depreciation_wc: { construction_useful_life_years, ffe_useful_life_years, ffe_renovation_pct_year_6, accounts_receivable_months_revenue, accounts_payable_months_opex }
`.trim();

const TWO_PHASE_INSTRUCTIONS = `
TWO-PHASE RESEARCH (retail, office, residential BTR — not hotel):
- Phase 1 (buildingConfig has NO glaSqft): Return ONLY c1_development, hints, and guardrails. Omit c2_operational entirely.
- Phase 2 (buildingConfig includes glaSqft): Return ONLY c2_operational using the nested step structure below. Omit c1_development entirely.
Use snake_case keys only — do not flatten step objects.
CRITICAL: When returning c2_operational rent fields (base_rent_year_1_psf), values MUST be ANNUAL psf rates. Convert monthly × 12 if research sources quote monthly rents.
`.trim();

const RETAIL_TWO_PHASE_OUTPUT = `
{
  "c1_development": {
    "construction_rates": {
      "building_rate_psf": 000,
      "parking_rate_psf": 000,
      "basement_rate_psf": 000,
      "infrastructure_rate_psf": 000
    },
    "soft_costs": {
      "sc_percentage": 0.00,
      "powc_percentage": 0.00,
      "ffe_percentage": {
        "recommended": 0.00,
        "min_range": 0.00,
        "max_range": 0.00
      }
    },
    "land_rate_psf": 000,
    "construction_period": { "months": 00 },
    "s_curve": {
      "stage_1_pct": 00,
      "stage_2_pct": 00,
      "stage_3_pct": 00,
      "stage_4_pct": 00
    },
    "powc_breakdown": {
      "site_establishment_pct": 00,
      "overhead_pct": 00,
      "authority_fees_pct": 00
    },
    "sc_breakdown": {
      "architect_pct": 00,
      "pm_pct": 00,
      "engineering_pct": 00,
      "geotech_pct": 00,
      "other_pct": 00
    }
  },
  "c2_operational": {
    "step1_base_rent": {
      "base_rent_year_1_psf": 000,
      "rent_escalation_pct": 0.00,
      "opening_occupancy_pct": 0,
      "stabilized_occupancy_pct": 0,
      "lease_up_years": 0
    },
    "RENT_RATE_RULE": "CRITICAL: base_rent_year_1_psf is ANNUAL (NOT monthly). If monthly rent is RM 10/psf, return 120.",
    "step2_other_income": {
      "avg_tenant_sales_psf": 000,
      "percentage_rent_rate_pct": 0.00,
      "recovery_rate_pct": 0.00,
      "property_tax_pct_of_revenue": 0.00,
      "insurance_pct_of_revenue": 0.00,
      "parking_revenue_per_space_day": 00,
      "advertising_kiosks_events_psf": 00
    },
    "step3_operating_expenses": {
      "cam_fixed_base_annual": 000000,
      "cam_variable_rate_psf": 00,
      "marketing_pct_revenue": 0.00,
      "g_and_a_pct_revenue": 0.00,
      "management_fee_pct_revenue": 0.00,
      "property_tax_pct_of_revenue": 0.00,
      "insurance_pct_of_revenue": 0.00,
      "renovation_provision": {
        "year_1_pct": 0.00,
        "year_2_pct": 0.00,
        "years_3_10_pct": 0.00
      }
    },
    "step6_useful_life_working_capital": {
      "construction_useful_life_years": 00,
      "ffe_useful_life_years": 0,
      "ffe_renovation_pct_year_6": 0.00,
      "ti_useful_life_years": 0,
      "leasing_commissions_life_years": 0,
      "accounts_receivable_months_revenue": 0.0,
      "accounts_payable_months_opex": 0.0
    }
  }
}
`.trim();

const OFFICE_TWO_PHASE_OUTPUT = `
{
  "c1_development": {
    "construction_rates": {
      "building_rate_psf": 000,
      "parking_rate_psf": 000,
      "basement_rate_psf": 000,
      "infrastructure_rate_psf": 000
    },
    "soft_costs": {
      "sc_percentage": 0.00,
      "powc_percentage": 0.00,
      "ffe_percentage": { "recommended": 0.00, "min_range": 0.00, "max_range": 0.00 }
    },
    "land_rate_psf": 000,
    "construction_period": { "months": 00 },
    "s_curve": { "stage_1_pct": 00, "stage_2_pct": 00, "stage_3_pct": 00, "stage_4_pct": 00 },
    "powc_breakdown": { "site_establishment_pct": 00, "overhead_pct": 00, "authority_fees_pct": 00 },
    "sc_breakdown": { "architect_pct": 00, "pm_pct": 00, "engineering_pct": 00, "geotech_pct": 00, "other_pct": 00 }
  },
  "c2_operational": {
    "step1_base_rent": {
      "base_rent_year_1_psf": 000,
      "rent_escalation_pct": 0.00,
      "opening_occupancy_pct": 0,
      "stabilized_occupancy_pct": 0,
      "lease_up_years": 0,
      "ti_allowance_psf": 000
    },
    "RENT_RATE_RULE": "CRITICAL: base_rent_year_1_psf is ANNUAL (NOT monthly). If monthly rent is RM 15/psf, return 180.",
    "step2_other_income": {
      "parking_revenue_per_space_day": 00,
      "parking_utilization_pct": 0,
      "amenity_income_psf": 00,
      "property_tax_pct_of_revenue": 0.00,
      "insurance_pct_of_revenue": 0.00
    },
    "step3_operating_expenses": {
      "cam_fixed_base_annual": 000000,
      "cam_variable_rate_psf": 00,
      "marketing_pct_revenue": 0.00,
      "g_and_a_pct_revenue": 0.00,
      "management_fee_pct_revenue": 0.00,
      "utilities_pct_revenue": 0.00,
      "renovation_provision": {
        "year_1_pct": 0.00,
        "year_2_pct": 0.00,
        "years_3_10_pct": 0.00
      }
    },
    "step6_useful_life_working_capital": {
      "construction_useful_life_years": 00,
      "ffe_useful_life_years": 0,
      "ffe_renovation_pct_year_6": 0.00,
      "ti_useful_life_years": 0,
      "leasing_commissions_life_years": 0,
      "accounts_receivable_months_revenue": 0.0,
      "accounts_payable_months_opex": 0.0
    }
  }
}
`.trim();

const RESIDENTIAL_TWO_PHASE_OUTPUT = `
{
  "c1_development": {
    "construction_rates": {
      "building_rate_psf": 000,
      "parking_rate_psf": 000,
      "basement_rate_psf": 000,
      "infrastructure_rate_psf": 000
    },
    "soft_costs": {
      "sc_percentage": 0.00,
      "powc_percentage": 0.00,
      "ffe_percentage": { "recommended": 0.00, "min_range": 0.00, "max_range": 0.00 }
    },
    "land_rate_psf": 000,
    "construction_period": { "months": 00 },
    "s_curve": { "stage_1_pct": 00, "stage_2_pct": 00, "stage_3_pct": 00, "stage_4_pct": 00 },
    "powc_breakdown": { "site_establishment_pct": 00, "overhead_pct": 00, "authority_fees_pct": 00 },
    "sc_breakdown": { "architect_pct": 00, "pm_pct": 00, "engineering_pct": 00, "geotech_pct": 00, "other_pct": 00 }
  },
  "c2_operational": {
    "step1_base_rent": {
      "base_rent_year_1_psf": 000,
      "rent_escalation_pct": 0.00,
      "opening_occupancy_pct": 0,
      "stabilized_occupancy_pct": 0,
      "lease_up_years": 0
    },
    "RENT_RATE_RULE": "CRITICAL: base_rent_year_1_psf is ANNUAL (NOT monthly). If monthly rent is RM 3/psf, return 36.",
    "step2_other_income": {
      "parking_fee_per_space": 00,
      "parking_uptake_pct": 0,
      "amenity_fee_per_unit": 00,
      "amenity_uptake_pct": 0,
      "utility_recovery_per_unit": 00,
      "utility_uptake_pct": 0
    },
    "step3_operating_expenses": {
      "maintenance_pct_of_residential_gla": 0.00,
      "utilities_pct_of_common_vacant_gla": 0.00,
      "property_tax_pct_of_revenue": 0.00,
      "insurance_pct_of_revenue": 0.00,
      "marketing_pct_of_EGI": 0.00,
      "g_and_a_pct_of_revenue": 0.00,
      "capex_reserve_pct_of_gla": 0.00
    },
    "step6_useful_life_working_capital": {
      "construction_useful_life_years": 00,
      "ffe_useful_life_years": 0,
      "ffe_renovation_pct_year_6": 0.00,
      "accounts_receivable_months_revenue": 0.0,
      "accounts_payable_months_opex": 0.0
    }
  }
}
`.trim();

const SALE_C2_FIELDS = `
c2_sales must include:
- avg_sales_price_psf (average selling price per sqft of saleable BUA)
- deductions.agent_commission_pct (% of Gross Sales Value)
- deductions.vat_pct (% of Gross Sales Value) — current VAT/GST for property sales in the country (0 if none)
- deductions.escrow_fees_pct (% of Gross Sales Value) — escrow / registration / collection fees (e.g. Oqood)
- deductions.avg_sales_discount_pct (% of list price) — typical early-bird / marketing discount
`.trim();

const GUARDRAIL_INSTRUCTIONS = `
guardrails land_tdc_target_pct and dc_tdc_target_pct:
- Express as % of Total Development Cost (TDC)
- land_tdc_target_pct: typical land cost as % of TDC for this market/asset
- dc_tdc_target_pct: typical hard+soft development cost (ex-land) as % of TDC
- Provide realistic min/max bands and a recommended midpoint for the specific market
`.trim();

const LAND_CATEGORY_INSTRUCTIONS = `
LAND RATE RESEARCH - CRITICAL INSTRUCTIONS:
You MUST research land rates for the SPECIFIC LAND USE CATEGORY required for this asset type.

Land Categories by Asset Type:
- Hotels: "Hospitality/Tourism Land" - land zoned for hotel/resort development
- Shopping Malls/Retail: "Commercial Land" - land zoned for retail/commercial use
- Office: "Office/Commercial Land" - land zoned for office/business use
- Residential (BTR/Sale): "Residential Land" - land zoned for residential development
- Commercial Sale: "Commercial Land" - land zoned for commercial use

CRITICAL:
- DO NOT return generic "raw land" or "vacant land" rates
- DO NOT return residential land rates for commercial assets (or vice versa)
- The land rate MUST reflect the value of land WITH the necessary development permissions/zoning for the specific asset type
- Commercial land is typically 2-10x more expensive than raw/residential land in the same location
- If exact land category data is unavailable, use the closest comparable category and explicitly state this in your <reasoning> block

Example for Malaysia:
- Raw Land: ~RM 64/psf
- Residential Land: ~RM 385-410/psf
- Commercial Land: ~RM 599/psf
- Industrial Land: ~RM 222/psf

You MUST research the correct category for the asset type provided.
`.trim();

export type AiPromptConfig = {
  systemPrompt: string;
  userPromptIntro: string;
};

const OPERATIONAL_STREAM_SYSTEM_PROMPT = `You are a Senior Real Estate Development Analyst and Feasibility Expert with 30 years of institutional experience in operational/hold property developments. You specialize in hotel, retail, office, and residential BTR projects across the Middle East and Southeast Asia.

CRITICAL RULES FOR ALL OUTPUTS:
1. HARD COSTS ONLY: Construction rates must be 'Hard Costs Only' (materials and labor). Exclude preliminaries, contractor profit, and professional fees.
2. TIER 1 vs TIER 2 ANCHORING: Strictly differentiate between Tier 1 cities (e.g., Dubai, Kuala Lumpur) and Tier 2 cities (e.g., Ras Al Khaimah, Johor Bahru). NEVER use Tier 1 benchmarks for a Tier 2 city.
3. MARKET POSITIONING DEFAULT: You MUST strictly adhere to the 'Positioning' or 'Market Positioning' provided in the prompt. If 'Mid-Market' is selected, NEVER output Prime/Luxury benchmarks.
4. NO HALLUCINATION: Do not invent data. If exact data for a specific sub-market is unavailable, use the broader city data but explicitly state this in your reasoning.
5. LAND RATE IS A FIXED LOCATION BENCHMARK: Land rates are determined SOLELY by the specific Sub-Market and Coordinates. They are NOT affected by Market Positioning, Star Rating, or Operating Segment.
CRITICAL: If the user changes positioning from Mid-Market to Luxury, the Land Rate (psf) MUST remain virtually identical (max 10% variance). Do NOT calculate "residual land value". The value of the land is fixed by its location, not the building on it.

${LAND_CATEGORY_INSTRUCTIONS}

RESPONSE FORMAT:
- First write a <reasoning>...</reasoning> block with your chain-of-thought analysis.
- Then output ONLY the JSON object (no markdown fences, no commentary after the JSON).

In the <reasoning> block, you MUST:
1. Confirm the exact location, sub-market, and coordinates.
2. Confirm the Land Use Category for this asset and that land rates were researched for THAT category (NOT raw land or wrong category).
3. Confirm the asset type, positioning, and any star rating or segment.
4. Explicitly state the realistic market rate ranges you are using for this specific city and positioning.
5. For construction period hints, you MUST explicitly state the exact number of floors and basements — do NOT round or approximate these numbers.
6. Confirm that land_rate_psf is a fixed location + land-category benchmark (sub-market/coordinates only).

${JSON_OUTPUT_INSTRUCTIONS}

${C1_DEVELOPMENT_FIELDS}

${GUARDRAIL_INSTRUCTIONS}`.trim();

const SALE_STREAM_SYSTEM_PROMPT = `You are a Senior Real Estate Development Analyst and Feasibility Expert with 30 years of institutional experience in for-sale property developments. You specialize in residential and commercial sales projects across the Middle East and Southeast Asia.

CRITICAL RULES FOR ALL OUTPUTS:
1. HARD COSTS ONLY: Construction rates must be 'Hard Costs Only' (materials and labor). Exclude preliminaries, contractor profit, and professional fees.
2. TIER 1 vs TIER 2 ANCHORING: Strictly differentiate between Tier 1 cities (e.g., Dubai, Kuala Lumpur) and Tier 2 cities (e.g., Ras Al Khaimah, Johor Bahru). NEVER use Tier 1 benchmarks for a Tier 2 city.
3. MARKET POSITIONING DEFAULT: You MUST strictly adhere to the 'Market Positioning' provided in the prompt. If 'Mid-Market' is selected, NEVER output Prime/Luxury benchmarks.
4. NO HALLUCINATION: Do not invent data. If exact data for a specific sub-market is unavailable, use the broader city data but explicitly state this in your reasoning.
5. LAND RATE IS A FIXED LOCATION BENCHMARK: Land rates are determined SOLELY by the specific Sub-Market and Coordinates. They are NOT affected by Market Positioning or Finishing Standard.
CRITICAL: If the user changes positioning from Mid-Market to Luxury, the Land Rate (psf) MUST remain virtually identical (max 10% variance). Do NOT calculate "residual land value". The value of the land is fixed by its location (e.g., Al Dhait South), not the building on it. If Mid-Market land is 105, Luxury land must also be ~105-115.

${LAND_CATEGORY_INSTRUCTIONS}

RESPONSE FORMAT:
- First write a <reasoning>...</reasoning> block with your chain-of-thought analysis.
- Then output ONLY the JSON object (no markdown fences, no commentary after the JSON).

${JSON_OUTPUT_INSTRUCTIONS}

${C1_DEVELOPMENT_FIELDS}

Sale stream c1_development notes:
- Construction rates are hard costs only (psf)
- Include infrastructure_rate_psf for landed products (else 0)
- Soft costs: sc_percentage and powc_percentage of CC including contingency
- Provide ffe_percentage recommended/min_range/max_range when applicable
- Omit c2_operational — use c2_sales instead

${SALE_C2_FIELDS}

${GUARDRAIL_INSTRUCTIONS}`.trim();

export const AI_PROMPTS: Record<string, AiPromptConfig> = {
  hotel: {
    systemPrompt: `${OPERATIONAL_STREAM_SYSTEM_PROMPT}

${OPERATIONAL_C2_FIELDS}

Hotel-specific additions:
- ffe_percentage should reflect star rating and operating type (budget vs luxury)
- construction_period.months should account for basements, podium, and tower keys
- For hotels, land_tdc_target_pct is often 15-35% of TDC in GCC gateway cities.
Hotel-specific c2_operational must use nested room_revenues, revenue_mix, direct_costs, undistributed_expenses, and depreciation_wc objects.`,
    userPromptIntro:
      "Conduct a hotel development feasibility benchmark study. Consider star rating, operating type (budget/boutique/business/resort), room count, and total keys/BUA.",
  },

  shoppingMall: {
    systemPrompt: `${OPERATIONAL_STREAM_SYSTEM_PROMPT}

${OPERATIONAL_C2_FIELDS}
${TWO_PHASE_INSTRUCTIONS}

Full two-phase JSON schema (return only the phase requested):
${RETAIL_TWO_PHASE_OUTPUT}

CRITICAL CONSTRAINTS (retail / shopping mall):
- Property Tax typically 0.3-2.5% of Gross Rental Revenue depending on jurisdiction
- Insurance typically 0.1-1.0% of Gross Rental Revenue depending on asset type and location
- Put property_tax_pct_of_revenue and insurance_pct_of_revenue under step3_operating_expenses (not step2)

Regional malls in GCC often show land_tdc_target_pct of 25-45% depending on land banking strategy.`,
    userPromptIntro:
      "Conduct a shopping mall / retail hold feasibility benchmark. Consider mall segment (regional mall, community, lifestyle), positioning (luxury to value), and total retail GLA.",
  },

  office: {
    systemPrompt: `${OPERATIONAL_STREAM_SYSTEM_PROMPT}

${OPERATIONAL_C2_FIELDS}
${TWO_PHASE_INSTRUCTIONS}

Full two-phase JSON schema (return only the phase requested):
${OFFICE_TWO_PHASE_OUTPUT}`,
    userPromptIntro:
      "Conduct an office hold feasibility benchmark. Consider segment (prime tower, business park, secondary, co-working), grade/positioning, and office vs retail GLA split.",
  },

  residentialBtr: {
    systemPrompt: `${OPERATIONAL_STREAM_SYSTEM_PROMPT}

${OPERATIONAL_C2_FIELDS}
${TWO_PHASE_INSTRUCTIONS}

Full two-phase JSON schema (return only the phase requested):
${RESIDENTIAL_TWO_PHASE_OUTPUT}`,
    userPromptIntro:
      "Conduct a residential BTR feasibility benchmark. Consider segment (high-rise, mid-rise, townhome), positioning, furnishing level, and total units/GLA.",
  },

  saleResidentialLanded: {
    systemPrompt: SALE_STREAM_SYSTEM_PROMPT,
    userPromptIntro:
      "Conduct a landed residential for-sale development benchmark. Consider total units, land area per unit, BUA per unit, market positioning, and finishing standard.",
  },

  saleResidentialHighrise: {
    systemPrompt: SALE_STREAM_SYSTEM_PROMPT,
    userPromptIntro:
      "Conduct a high-rise residential for-sale benchmark. Consider tower floors, BUA mix, market positioning, and finishing standard.",
  },

  saleCommercialLanded: {
    systemPrompt: SALE_STREAM_SYSTEM_PROMPT,
    userPromptIntro:
      "Conduct a commercial landed for-sale development benchmark. Consider land area, BUA, market positioning, and finishing standard.",
  },

  saleCommercialStrata: {
    systemPrompt: SALE_STREAM_SYSTEM_PROMPT,
    userPromptIntro:
      "Conduct a commercial strata for-sale benchmark. Consider tower/podium configuration, market positioning, and finishing standard.",
  },
};

const ASSET_TYPE_TO_PROMPT_KEY: Record<AiAssetType, keyof typeof AI_PROMPTS> = {
  hotel: "hotel",
  retail: "shoppingMall",
  "shopping-mall": "shoppingMall",
  office: "office",
  "residential-btr": "residentialBtr",
  "sale-residential-landed": "saleResidentialLanded",
  "sale-residential-highrise": "saleResidentialHighrise",
  "sale-commercial-landed": "saleCommercialLanded",
  "sale-commercial-strata": "saleCommercialStrata",
};

export function getSystemPrompt(assetType: AiAssetType): string {
  const key = ASSET_TYPE_TO_PROMPT_KEY[assetType];
  const base = AI_PROMPTS[key]?.systemPrompt ?? AI_PROMPTS.hotel.systemPrompt;
  return `${base}\n${HYPER_LOCAL_INSTRUCTIONS}`;
}

function isSaleLandedAssetType(assetType: AiAssetType): boolean {
  return assetType.includes("landed");
}

function saleAssetTypeLabel(assetType: AiAssetType): string {
  return isSaleLandedAssetType(assetType) ? "Landed" : "High-Rise";
}

function buildSaleStreamUserPrompt(options: AiResearchOptions): string {
  const { assetType, location, buildingConfig } = options;
  const isLanded = isSaleLandedAssetType(assetType);
  const assetLabel = saleAssetTypeLabel(assetType);
  const subMarket = location.subMarket?.trim() || "General City Area";
  const coordinates = location.coordinates
    ? `${location.coordinates.lat}, ${location.coordinates.lng}`
    : "Not provided";
  const marketPositioning =
    buildingConfig.positioning?.trim() ||
    buildingConfig.marketPositioning?.trim() ||
    "Not specified";
  const finishingStandard =
    buildingConfig.furnishingLevel?.trim() || "Not specified";
  const landCategory = getLandCategory(assetType);

  const highRiseConfig = isLanded
    ? ""
    : `If High-Rise: ${buildingConfig.basements ?? 0} Basement levels, ${buildingConfig.podiums ?? 0} Podium/Parking floors, ${buildingConfig.upperFloors ?? buildingConfig.towerFloors ?? 0} Tower floors. Total BUA: ${buildingConfig.totalBUA ?? buildingConfig.totalBuildingBUA ?? 0} sqft, Basement BUA: ${buildingConfig.basementBUA ?? 0} sqft, Podium BUA: ${buildingConfig.podiumBUA ?? 0} sqft. Land Area: ${buildingConfig.landArea ?? buildingConfig.plotArea ?? 0} sqft.`;

  const landedConfig = isLanded
    ? `If Landed: ${buildingConfig.numUnits ?? buildingConfig.totalUnits ?? 0} Total Units, ${buildingConfig.buaPerUnit ?? 0} BUA per Unit, ${buildingConfig.landAreaPerUnit ?? 0} Land Area per Unit. Common Area: ${buildingConfig.commonAreaPct ?? 0}%. Total Land Area: ${buildingConfig.totalLandArea ?? 0} sqft.`
    : "";

  const upperFloors = buildingConfig.upperFloors ?? buildingConfig.towerFloors ?? 0;
  const basements = buildingConfig.basements ?? 0;

  return `I am conducting a feasibility study for a new for-sale property development.

Project Parameters:
Location: ${location.city}, ${location.country}
Sub-Market: ${subMarket} (Hyper-local neighborhood)
Coordinates: ${coordinates}
Currency: ${location.currency}
Asset Type: ${assetLabel}
Land Use Category: ${landCategory} ← CRITICAL: Research land rates for THIS category
Market Positioning: ${marketPositioning} (e.g., Mid-Market, Prime/Luxury)
Finishing Standard: ${finishingStandard} (e.g., Standard Finish, Core & Shell)

Building Configuration:
${isLanded ? landedConfig : highRiseConfig}

Your Task:
Please provide the following market benchmarks and institutional norms. All monetary values must be in ${location.currency}.

CRITICAL DISTINCTION:
- Land Rate: Based ONLY on the location (${location.city}, ${subMarket}) AND the Land Use Category (${landCategory}). Do NOT adjust this based on Market Positioning.
- Construction Rates: Scale these based on Market Positioning (${marketPositioning}) and Finishing Standard (${finishingStandard}).
- Sales Price: Scale this based on Market Positioning (${marketPositioning}).

CRITICAL: Before outputting the JSON, you MUST write a <reasoning> block. In this block:
1. Confirm the exact location and sub-market.
2. Confirm the Land Use Category (${landCategory}) and that you researched land rates for THIS category (NOT raw land or wrong category).
3. Confirm the Market Positioning (${marketPositioning}) and Finishing Standard (${finishingStandard}).
4. Explicitly state the realistic market rate ranges you are using for this specific city and positioning (e.g., "For Mid-Market High-Rise in RAK, standard build rates are 250-400 AED/psf").
5. Explain how the Finishing Standard impacts the construction rate (NOT the land rate).
6. Confirm that land_rate_psf is a fixed location benchmark for ${landCategory} (sub-market/coordinates only). Changing Market Positioning must not move land rate by more than ~10% — never use residual land value.
7. For construction period hints, you MUST explicitly state the exact number of Upper Floors (${upperFloors}) and Basements (${basements}) — do NOT round or approximate these numbers.

ADDITIONAL RESEARCH TASK (FX Rate):
CRITICAL: Check the "Currency" selected in the Project Parameters.
- If the Currency is "USD": Set "fx_rate_to_usd" to 1.0 in your JSON output. Do NOT perform any web search for exchange rates.
- If the Currency is NOT "USD" (e.g., MYR, VND, AED): You MUST research and provide the current market exchange rate from ${location.currency} to USD (1 USD = X ${location.currency}). Use reliable financial sources like Currency.Wiki, XE.com, or central bank data. Provide the mid-market (interbank) rate and include it in your JSON output as "fx_rate_to_usd".

PART 1: DEVELOPMENT OUTFLOWS (Component 1)
Provide construction rates (hard costs only), soft costs, land rate (for ${landCategory}), construction period, S-curve, POWC/SC breakdowns, hints, and guardrails for this asset in ${subMarket}.

PART 2: SALES INFLOWS (Component 2)
1. Average Sales Price:
   - Average Sales Price (per sqft of saleable BUA) for the specific asset type and positioning in ${subMarket}.
2. Market Deductions (For C2S6):
   - Agent/Broker Commission (% of Gross Sales Value): What is the standard market practice in ${location.city}? (e.g., 2% in Dubai, 2-3% in Malaysia).
   - VAT on Sales (% of Gross Sales Value): What is the current VAT/GST rate applicable to property sales in ${location.country}? Specify if it applies to off-plan sales, completed sales, or both. If no VAT, specify 0%.
   - Escrow / Collection Fees (% of Gross Sales Value): What are the typical escrow account fees, registration fees (e.g., Oqood in Dubai), or collection charges imposed by banks/developers in ${location.city}? Provide the standard percentage.
   - Average Sales Discount (% of List Price): What is a typical bulk/early-bird discount offered by developers in this market?

CRITICAL: For VAT and Escrow fees, research the CURRENT statutory requirements and market practice for ${location.country} and ${location.city}. Do NOT assume global defaults. For example:
- UAE: VAT = 5%, Escrow (Oqood) = ~1%
- Malaysia: VAT/SST = 0% (or specify if SST applies), Escrow = varies by bank
- Saudi Arabia: VAT = 15%, Escrow = varies
Always verify the current rate for the specific location.

After the <reasoning> block, output the JSON strictly in the following format:

{
  "fx_rate_to_usd": 0.00,
  "c1_development": {
    "construction_rates": { "building_rate_psf": 000, "parking_rate_psf": 000, "basement_rate_psf": 000, "infrastructure_rate_psf": 000 },
    "soft_costs": { "sc_percentage": 0.00, "powc_percentage": 0.00, "ffe_percentage": { "recommended": 0.00, "min_range": 0.00, "max_range": 0.00 } },
    "land_rate_psf": 000,
    "construction_period": { "months": 00, "range": "e.g. 24-36", "justification": "short string" },
    "guardrails": {
      "land_tdc_target_pct": { "min": 0.00, "max": 0.00, "recommended": 0.00 },
      "dc_tdc_target_pct": { "min": 0.00, "max": 0.00, "recommended": 0.00 }
    },
    "hints": { "contingency_text": "...", "construction_period_text": "...", "sales_launch_text": "..." },
    "s_curve": { "stage_1_pct": 0.00, "stage_2_pct": 0.00, "stage_3_pct": 0.00, "stage_4_pct": 0.00 },
    "powc_breakdown": { "site_establishment_pct": 0.00, "overhead_pct": 0.00, "authority_fees_pct": 0.00 },
    "sc_breakdown": { "architect_pct": 0.00, "pm_pct": 0.00, "engineering_pct": 0.00, "geotech_pct": 0.00, "other_pct": 0.00 }
  },
  "c2_sales": {
    "avg_sales_price_psf": 000,
    "deductions": {
      "agent_commission_pct": 0.00,
      "vat_pct": 0.00,
      "escrow_fees_pct": 0.00,
      "avg_sales_discount_pct": 0.00
    }
  },
  "hints": { "contingency_text": "...", "construction_period_text": "...", "sales_launch_text": "..." },
  "guardrails": {
    "land_tdc_target_pct": { "min": 0.00, "max": 0.00, "recommended": 0.00 },
    "dc_tdc_target_pct": { "min": 0.00, "max": 0.00, "recommended": 0.00 }
  }
}

CRITICAL CONSTRAINTS:
- All percentages must be realistic for the specified Market Positioning (${marketPositioning}) in ${subMarket}.
- Construction rates MUST be hard costs only and MUST match ${marketPositioning} — never upgrade Mid-Market to Prime/Luxury rates.
- Land Rate MUST be researched for ${landCategory} category — NOT raw land, NOT residential land for commercial assets. Location + category only (max ~10% variance if positioning changes; never residual land value).
- S-Curve, POWC, and SC breakdown percentages MUST each sum to exactly 100%.
- Guardrail ranges must reflect actual institutional lending criteria in ${location.country}.
- VAT and Escrow fees must reflect CURRENT statutory / market practice for ${location.country} and ${location.city} — never invent global defaults.
- If Currency is USD, fx_rate_to_usd MUST be 1.0. Otherwise fx_rate_to_usd must be mid-market local currency units per 1 USD (e.g. ~3.67 for AED, ~4.70 for MYR).
- After </reasoning>, return ONLY the JSON object (no markdown fences).`;
}

export function buildUserPrompt(options: AiResearchOptions): string {
  if (options.assetType.startsWith("sale-")) {
    return buildSaleStreamUserPrompt(options);
  }

  const key = ASSET_TYPE_TO_PROMPT_KEY[options.assetType];
  const config = AI_PROMPTS[key] ?? AI_PROMPTS.hotel;
  const { assetType, location, buildingConfig } = options;
  const landCategory = getLandCategory(assetType);
  const resolvedGlaSqft = Number(
    buildingConfig.glaSqft ??
      buildingConfig.gla ??
      buildingConfig.retailGLA ??
      buildingConfig.officeGLA ??
      buildingConfig.residentialGLA ??
      0
  );
  const hasGla = Number.isFinite(resolvedGlaSqft) && resolvedGlaSqft > 0;
  const phaseInstruction =
    assetType === "retail"
      ? hasGla
        ? `\n\nSINGLE-REQUEST: GLA is ${resolvedGlaSqft} sqft. Return BOTH c1_development and c2_operational in one JSON response using the nested retail step structure. Include hints and guardrails.`
        : `\n\nPHASE 1 REQUEST: Return ONLY c1_development, hints, and guardrails. Omit c2_operational — GLA is not yet set.`
      : assetType === "office"
        ? hasGla
          ? `\n\nSINGLE-REQUEST: GLA is ${resolvedGlaSqft} sqft. Return BOTH c1_development and c2_operational in one JSON response using the nested office step structure. Include hints and guardrails.`
          : `\n\nPHASE 1 REQUEST: Return ONLY c1_development, hints, and guardrails. Omit c2_operational — GLA is not yet set.`
      : assetType === "residential-btr"
        ? hasGla
          ? `\n\nSINGLE-REQUEST: GLA is ${resolvedGlaSqft} sqft. Return BOTH c1_development and c2_operational in one JSON response using the nested residential BTR step structure. Include hints and guardrails.`
          : `\n\nPHASE 1 REQUEST: Return ONLY c1_development, hints, and guardrails. Omit c2_operational — GLA is not yet set.`
        : options.assetType !== "hotel"
          ? `\n\nPHASE 1 REQUEST: Return ONLY c1_development, hints, and guardrails. Omit c2_operational — operational metrics are researched in Phase 2 after GLA is set.`
          : "";

  const hotelBuildingSection =
    assetType === "hotel"
      ? `
Building Configuration & Areas:
- Basements: ${buildingConfig.basements ?? 0}
- Podium / Parking Floors: ${buildingConfig.podiums ?? 0}
- Ground Floor: ${buildingConfig.groundFloors ?? 0}
- Guest Room Floors (Storeys): ${buildingConfig.guestRoomFloors ?? 0}
- Total Building BUA (sqft): ${buildingConfig.totalBuildingBUA ?? 0}
- Basement BUA (sqft): ${buildingConfig.basementBUA ?? 0}
- Podium / Parking BUA (sqft): ${buildingConfig.podiumBUA ?? 0}
- Guest Room Area / GLA (sqft): ${buildingConfig.guestRoomGLA ?? 0}
- Total Keys / Rooms: ${buildingConfig.totalKeys ?? 0}
- Plot / Land Area (sqft): ${buildingConfig.plotArea ?? 0}
- Operating Type: ${buildingConfig.operatingSegment ?? "Not specified"}
- Star Rating: ${buildingConfig.starRating ?? "Not specified"}

CRITICAL: Use these exact physical dimensions to calculate and provide benchmarks. For example, construction rates should reflect the specific mix of basement, podium, and tower floors provided. Land cost benchmarks should be evaluated against the specific plot size and Land Use Category (${landCategory}).`
      : "";

  const retailBuildingSection =
    assetType === "retail"
      ? `
Building Configuration & Areas:
- Basements: ${buildingConfig.basements ?? 0}
- Podium / Parking Floors: ${buildingConfig.podiums ?? 0}
- Ground Floor: ${buildingConfig.groundFloors ?? 0}
- Retail Floors (Storeys): ${buildingConfig.retailFloors ?? 0}
- Total Building BUA (sqft): ${buildingConfig.totalBuildingBUA ?? 0}
- Basement BUA (sqft): ${buildingConfig.basementBUA ?? 0}
- Podium / Parking BUA (sqft): ${buildingConfig.podiumBUA ?? 0}
- Gross Leasable Area / GLA (sqft): ${buildingConfig.gla ?? buildingConfig.retailGLA ?? 0}
- Common Area / Mall (sqft): ${buildingConfig.commonArea ?? 0}
- Plot / Land Area (sqft): ${buildingConfig.plotArea ?? 0}
- Mall Segment: ${buildingConfig.operatingSegment ?? "Not specified"}
- Positioning: ${buildingConfig.positioning ?? "Not specified"}

CRITICAL: Use these exact physical dimensions to calculate and provide benchmarks. Construction rates should reflect the specific mix of basement, podium, and retail floors. Land cost benchmarks should be evaluated against the specific plot size and Land Use Category (${landCategory}). GLA should be used to project potential rental revenues.

CRITICAL RENT RESEARCH:
- Research base rent rates for retail malls in ${location.city}, ${location.subMarket?.trim() || "General City Area"}.
- ALL rates MUST be ANNUAL (per year per sqft), NOT monthly.
- If you find monthly rates (e.g., RM 10-25/psf/month), multiply by 12 to get annual (RM 120-300/psf/year).
- In your <reasoning> block, explicitly state whether you found monthly or annual rates and show the conversion calculation.
- NEVER return monthly rates in the JSON. The base_rent_year_1_psf field MUST be annual.`
      : "";

  const officeBuildingSection =
    assetType === "office"
      ? `
Building Configuration & Areas:
- Basements: ${buildingConfig.basements ?? 0}
- Podium / Parking Floors: ${buildingConfig.podiums ?? 0}
- Ground Floor: ${buildingConfig.groundFloors ?? 0}
- Office Floors (Storeys): ${buildingConfig.officeFloors ?? 0}
- Total Building BUA (sqft): ${buildingConfig.totalBuildingBUA ?? 0}
- Basement BUA (sqft): ${buildingConfig.basementBUA ?? 0}
- Podium / Parking BUA (sqft): ${buildingConfig.podiumBUA ?? 0}
- Gross Leasable Area / GLA (sqft): ${buildingConfig.gla ?? buildingConfig.officeGLA ?? 0}
- Plot / Land Area (sqft): ${buildingConfig.plotArea ?? 0}
- Office Segment: ${buildingConfig.operatingSegment ?? "Not specified"}
- Positioning: ${buildingConfig.positioning ?? "Not specified"}

CRITICAL: Use these exact physical dimensions to calculate and provide benchmarks. Construction rates should reflect the specific mix of basement, podium, and office tower floors. Land cost benchmarks should be evaluated against the specific plot size and Land Use Category (${landCategory}). GLA should be used to project potential rental revenues.

CRITICAL RENT RESEARCH:
- Research base rent rates for office assets in ${location.city}, ${location.subMarket?.trim() || "General City Area"}.
- ALL rates MUST be ANNUAL (per year per sqft), NOT monthly.
- If you find monthly rates (e.g., RM 15/psf/month), multiply by 12 to get annual (RM 180/psf/year).
- In your <reasoning> block, explicitly state: "Found monthly rent of RM X/psf, converted to annual: RM Y/psf (X × 12)".
- NEVER return monthly rates in the JSON. The base_rent_year_1_psf field MUST be annual.`
      : "";

  const residentialBuildingSection =
    assetType === "residential-btr"
      ? `
Building Configuration & Areas:
- Basements: ${buildingConfig.basements ?? 0}
- Podium / Parking Floors: ${buildingConfig.podiums ?? 0}
- Ground Floor: ${buildingConfig.groundFloors ?? 0}
- Residential Floors (Storeys): ${buildingConfig.residentialFloors ?? 0}
- Total Building BUA (sqft): ${buildingConfig.totalBuildingBUA ?? 0}
- Basement BUA (sqft): ${buildingConfig.basementBUA ?? 0}
- Podium / Parking BUA (sqft): ${buildingConfig.podiumBUA ?? 0}
- Residential GLA (sqft): ${buildingConfig.gla ?? buildingConfig.residentialGLA ?? 0}
- Plot / Land Area (sqft): ${buildingConfig.plotArea ?? 0}
- Residential Segment: ${buildingConfig.operatingSegment ?? "Not specified"}
- Positioning: ${buildingConfig.positioning ?? "Not specified"}
- Furnishing Level: ${buildingConfig.furnishingLevel ?? "Not specified"}

CRITICAL: Use these exact physical dimensions to calculate and provide benchmarks. Construction rates should reflect the specific mix of basement, podium, and residential tower floors. Land cost benchmarks should be evaluated against the specific plot size and Land Use Category (${landCategory}). GLA should be used to project potential rental revenues and unit yields.

CRITICAL RENT RESEARCH:
- Research base rent rates for residential BTR in ${location.city}, ${location.subMarket?.trim() || "General City Area"}.
- ALL rates MUST be ANNUAL (per year per sqft), NOT monthly.
- If you find monthly rates (e.g., RM 3/psf/month), multiply by 12 to get annual (RM 36/psf/year).
- In your <reasoning> block, explicitly state: "Found monthly rent of RM X/psf, converted to annual: RM Y/psf (X × 12)".
- NEVER return monthly rates in the JSON. The base_rent_year_1_psf field MUST be annual.`
      : "";

  return `${config.userPromptIntro}

I am conducting a feasibility study for a new ${assetType.replace(/-/g, " ")} development.

Project Parameters:
- Location: ${location.city}, ${location.country}
- Sub-Market/Neighborhood: ${location.subMarket?.trim() || "General City Area"}
- Exact Coordinates: ${
    location.coordinates
      ? `${location.coordinates.lat}, ${location.coordinates.lng}`
      : "Not provided"
  }
- Currency: ${location.currency}
- Asset Type: ${assetType}
- Land Use Category: ${landCategory} ← CRITICAL: Research land rates for THIS category
- Building Configuration:
${JSON.stringify(buildingConfig, null, 2)}${hotelBuildingSection}${retailBuildingSection}${officeBuildingSection}${residentialBuildingSection}
${phaseInstruction}

Research current market benchmarks for this specific location and asset profile. Return realistic, location-specific values — not generic global averages. Where local data is limited, use the closest comparable sub-market and note assumptions briefly in the hints fields.

CRITICAL: Research land rates for ${landCategory} (NOT raw land or wrong category). Commercial land is typically 2-10x more expensive than raw/residential land.

CRITICAL RENT RATE INSTRUCTION:
- ALL rent benchmarks MUST be expressed as ANNUAL rates (per year per sqft).
- If your research finds monthly rent rates (e.g., RM 10/psf/month), you MUST multiply by 12 to get the annual rate (RM 120/psf/year).
- In your <reasoning> block, explicitly state: "Found monthly rent of RM X/psf, converted to annual: RM Y/psf (X × 12)".
- NEVER return monthly rates in the JSON. The base_rent_year_1_psf field MUST be annual.`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function num(...candidates: unknown[]): number | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "string" && candidate.trim() !== "") {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

/**
 * Normalize flat or partially-nested AI JSON into the store's AiResearchData shape.
 * Accepts both the nested schema and legacy flat keys (buildingRate, softCostsPercent, etc.).
 */
export function normalizeAiResearchData(raw: unknown): AiResearchResult {
  const root = asRecord(raw) ?? {};
  const c1Raw = asRecord(root.c1_development) ?? {};
  const ratesRaw = asRecord(c1Raw.construction_rates) ?? {};
  const softRaw = asRecord(c1Raw.soft_costs) ?? {};
  const ffeRaw = asRecord(softRaw.ffe_percentage) ?? {};
  const periodRaw = asRecord(c1Raw.construction_period) ?? {};
  const sCurveRaw = asRecord(c1Raw.s_curve) ?? {};
  const powcRaw = asRecord(c1Raw.powc_breakdown) ?? {};
  const scRaw = asRecord(c1Raw.sc_breakdown) ?? {};

  const building =
    num(ratesRaw.building_rate_psf, ratesRaw.buildingRate, c1Raw.buildingRate, c1Raw.building_rate_psf) ?? 0;
  const parking =
    num(ratesRaw.parking_rate_psf, ratesRaw.parkingRate, c1Raw.parkingRate, c1Raw.parking_rate_psf) ?? 0;
  const basement =
    num(ratesRaw.basement_rate_psf, ratesRaw.basementRate, c1Raw.basementRate, c1Raw.basement_rate_psf) ?? 0;
  const infrastructure = num(
    ratesRaw.infrastructure_rate_psf,
    ratesRaw.infrastructureRate,
    c1Raw.infrastructureRate,
    c1Raw.infrastructure_rate_psf
  );

  const scPct = num(softRaw.sc_percentage, softRaw.softCostsPercent, c1Raw.softCostsPercent, c1Raw.sc_percentage) ?? 0;
  const powcPct = num(softRaw.powc_percentage, softRaw.powcPercent, c1Raw.powcPercent, c1Raw.powc_percentage) ?? 0;
  const ffeRec =
    num(
      ffeRaw.recommended,
      softRaw.ffePercent,
      softRaw.ffe_percentage,
      c1Raw.ffePercent,
      c1Raw.ffe_percentage
    ) ?? 0;
  const ffeMin = num(ffeRaw.min_range, ffeRaw.min) ?? Math.max(0, ffeRec * 0.8);
  const ffeMax = num(ffeRaw.max_range, ffeRaw.max) ?? ffeRec * 1.2;

  const landRate = num(c1Raw.land_rate_psf, c1Raw.landRate) ?? 0;
  const months =
    num(periodRaw.months, periodRaw.constructionPeriodMonths, c1Raw.constructionPeriodMonths, c1Raw.months) ?? 30;
  const range =
    (typeof periodRaw.range === "string" && periodRaw.range) ||
    `${Math.max(6, months - 6)}-${months + 6}`;

  const stage1 = num(sCurveRaw.stage_1_pct, sCurveRaw.stage1Percent, c1Raw.stage1Percent) ?? 10;
  const stage2 = num(sCurveRaw.stage_2_pct, sCurveRaw.stage2Percent, c1Raw.stage2Percent) ?? 20;
  const stage3 = num(sCurveRaw.stage_3_pct, sCurveRaw.stage3Percent, c1Raw.stage3Percent) ?? 40;
  const stage4 = num(sCurveRaw.stage_4_pct, sCurveRaw.stage4Percent, c1Raw.stage4Percent) ?? 30;

  const c2Raw = asRecord(root.c2_operational);
  let c2_operational: Record<string, unknown> | undefined = c2Raw;

  if (c2Raw) {
    const rooms = asRecord(c2Raw.room_revenues) ?? {};
    const mix = asRecord(c2Raw.revenue_mix) ?? {};
    const direct = asRecord(c2Raw.direct_costs) ?? {};
    const und = asRecord(c2Raw.undistributed_expenses) ?? {};
    const dep = asRecord(c2Raw.depreciation_wc) ?? {};

    c2_operational = {
      ...c2Raw,
      room_revenues: {
        adr_year_1: num(rooms.adr_year_1, rooms.adrYear1, c2Raw.baseRentOrRate, c2Raw.adr_year_1) ?? 0,
        adr_inflation_pct:
          num(rooms.adr_inflation_pct, rooms.adrInflation, c2Raw.rentEscalation, c2Raw.adr_inflation_pct) ?? 4,
      },
      revenue_mix: {
        rooms: num(mix.rooms, c2Raw.rooms) ?? 0,
        food: num(mix.food, c2Raw.food) ?? 0,
        beverage: num(mix.beverage, c2Raw.beverage) ?? 0,
        room_service: num(mix.room_service, mix.roomService, c2Raw.roomService) ?? 0,
        telecom: num(mix.telecom, c2Raw.telecom) ?? 0,
        spa: num(mix.spa, mix.spaHealth, c2Raw.spaHealth) ?? 0,
        rental: num(mix.rental, mix.rentalOther, c2Raw.rentalOther) ?? 0,
      },
      direct_costs: {
        rooms_payroll: num(direct.rooms_payroll, direct.roomsPayroll, c2Raw.roomsPayroll) ?? 0,
        rooms_other: num(direct.rooms_other, direct.roomsOther, c2Raw.roomsOther) ?? 0,
        food_cos: num(direct.food_cos, direct.foodCostOfSale, c2Raw.foodCostOfSale) ?? 0,
        beverage_cos: num(direct.beverage_cos, direct.beverageCostOfSale, c2Raw.beverageCostOfSale) ?? 0,
        fnb_payroll: num(direct.fnb_payroll, direct.fbPayroll, c2Raw.fbPayroll) ?? 0,
        fnb_other: num(direct.fnb_other, direct.fbOther, c2Raw.fbOther) ?? 0,
        telecom: num(direct.telecom, direct.telecomCost, c2Raw.telecomCost) ?? 0,
        spa: num(direct.spa, direct.healthLeisureCost, c2Raw.healthLeisureCost) ?? 0,
        rental: num(direct.rental, direct.otherDeptsCost, c2Raw.otherDeptsCost) ?? 0,
      },
      undistributed_expenses: {
        g_and_a: num(und.g_and_a, und.gaExpenses, c2Raw.gaExpenses) ?? 0,
        marketing: num(und.marketing, und.marketingSales, c2Raw.marketingSales) ?? 0,
        prop_ops: num(und.prop_ops, und.propertyOpsMaintenance, c2Raw.propertyOpsMaintenance) ?? 0,
        utilities: num(und.utilities, c2Raw.utilities) ?? 0,
        base_mgmt_fee_room_rev:
          num(und.base_mgmt_fee_room_rev, und.baseManagementFee, c2Raw.baseManagementFee) ?? 0,
        incentive_fee_ebitda: num(und.incentive_fee_ebitda, und.incentiveFee, c2Raw.incentiveFee) ?? 0,
        renovation_y1: num(und.renovation_y1, und.renovationProvisionY1, c2Raw.renovationProvisionY1) ?? 0,
        renovation_y2: num(und.renovation_y2, und.renovationProvisionY2, c2Raw.renovationProvisionY2) ?? 0,
        renovation_y3_10:
          num(und.renovation_y3_10, und.renovationProvisionY3to10, c2Raw.renovationProvisionY3to10) ?? 0,
      },
      depreciation_wc: {
        construction_useful_life_years:
          num(dep.construction_useful_life_years, dep.constructionUsefulLife, c2Raw.constructionUsefulLife) ?? 20,
        ffe_useful_life_years: num(dep.ffe_useful_life_years, dep.ffeUsefulLife, c2Raw.ffeUsefulLife) ?? 5,
        ffe_renovation_pct_year_6:
          num(dep.ffe_renovation_pct_year_6, dep.ffeRenovationRate, c2Raw.ffeRenovationRate) ?? 50,
        accounts_receivable_months_revenue:
          num(
            dep.accounts_receivable_months_revenue,
            dep.accountsReceivableMonths,
            c2Raw.accountsReceivableMonths
          ) ?? 1,
        accounts_payable_months_opex:
          num(dep.accounts_payable_months_opex, dep.accountsPayableMonths, c2Raw.accountsPayableMonths) ?? 1,
      },
    };

    // Handle flat retail structure (fallback) — map flat keys to nested step objects
    if (!asRecord(c2Raw.step1_base_rent)) {
      c2_operational = {
        ...c2_operational,
        step1_base_rent: {
          base_rent_year_1_psf: num(
            c2Raw.baseRent0Rate,
            c2Raw.baseRentRate,
            c2Raw.baseRentOrRate,
            c2Raw.base_rent_year_1_psf
          ),
          rent_escalation_pct: num(c2Raw.rentEscalation, c2Raw.rent_escalation_pct),
          opening_occupancy: num(c2Raw.openingOccupancy, c2Raw.opening_occupancy),
          stabilized_occupancy: num(
            c2Raw.stabilizedOccupancy,
            c2Raw.stabilized_occupancy
          ),
          lease_up_years: num(c2Raw.leaseUpYears, c2Raw.lease_up_years),
        },
      };
    }

    if (!asRecord(c2Raw.step2_other_income)) {
      c2_operational = {
        ...c2_operational,
        step2_other_income: {
          avg_tenant_sales_psf: num(
            c2Raw.avgTenantSalesPsf,
            c2Raw.avg_tenant_sales_psf
          ),
          percentage_rent_rate_pct: num(
            c2Raw.percentageRentRatePct,
            c2Raw.percentage_rent_rate_pct,
            c2Raw.turnoverRentPct
          ),
          recovery_rate_pct: num(
            c2Raw.recoveryRatePct,
            c2Raw.recovery_rate_pct,
            c2Raw.camRecoveryPct
          ),
          property_tax_pct_of_revenue: num(
            c2Raw.propertyTaxPctOfRevenue,
            c2Raw.property_tax_pct_of_revenue
          ),
          insurance_pct_of_revenue: num(
            c2Raw.insurancePctOfRevenue,
            c2Raw.insurance_pct_of_revenue
          ),
          parking_revenue_per_space_day: num(
            c2Raw.parkingRevenuePerSpaceDay,
            c2Raw.parking_revenue_per_space_day
          ),
          advertising_kiosks_events_psf: num(
            c2Raw.advertisingKiosksEventsPsf,
            c2Raw.advertising_kiosks_events_psf
          ),
        },
      };
    }

    if (!asRecord(c2Raw.step3_operating_expenses)) {
      const opexFlat = asRecord(c2Raw.operating_expenses) ?? c2Raw;
      const reno =
        asRecord(opexFlat.renovation_provision) ??
        asRecord(opexFlat.renovationProvision);
      c2_operational = {
        ...c2_operational,
        step3_operating_expenses: {
          cam_fixed_base_annual: num(
            opexFlat.cam_fixed_base_annual,
            opexFlat.camFixedBaseAnnual,
            opexFlat.cam_fixed_base_psf
          ),
          cam_variable_rate_psf: num(
            opexFlat.cam_variable_rate_psf,
            opexFlat.camVariableRatePsf
          ),
          property_tax_pct_of_revenue: num(
            opexFlat.property_tax_pct_of_revenue,
            opexFlat.propertyTaxPctOfRevenue,
            c2Raw.property_tax_pct_of_revenue,
            c2Raw.propertyTaxPctOfRevenue
          ),
          insurance_pct_of_revenue: num(
            opexFlat.insurance_pct_of_revenue,
            opexFlat.insurancePctOfRevenue,
            c2Raw.insurance_pct_of_revenue,
            c2Raw.insurancePctOfRevenue
          ),
          marketing_pct_revenue: num(
            opexFlat.marketing_pct_revenue,
            opexFlat.marketingPctRevenue
          ),
          g_and_a_pct_revenue: num(
            opexFlat.g_and_a_pct_revenue,
            opexFlat.gAndAPctRevenue
          ),
          management_fee_pct_revenue: num(
            opexFlat.management_fee_pct_revenue,
            opexFlat.managementFeePctRevenue
          ),
          renovation_provision: {
            year_1_pct: num(reno?.year_1_pct, reno?.year1Pct) ?? 0,
            year_2_pct: num(reno?.year_2_pct, reno?.year2Pct) ?? 0,
            years_3_10_pct: num(reno?.years_3_10_pct, reno?.years3to10Pct) ?? 0,
          },
        },
      };
    } else {
      // Ensure tax/insurance exist on nested step3 even if model put them only on step2/flat
      const step3 = asRecord(c2Raw.step3_operating_expenses)!;
      const step2 = asRecord(c2Raw.step2_other_income);
      c2_operational = {
        ...c2_operational,
        step3_operating_expenses: {
          ...step3,
          property_tax_pct_of_revenue: num(
            step3.property_tax_pct_of_revenue,
            step2?.property_tax_pct_of_revenue,
            c2Raw.property_tax_pct_of_revenue
          ),
          insurance_pct_of_revenue: num(
            step3.insurance_pct_of_revenue,
            step2?.insurance_pct_of_revenue,
            c2Raw.insurance_pct_of_revenue
          ),
        },
      };
    }
  }

  const hintsRaw = asRecord(root.hints);
  const guardRaw = asRecord(root.guardrails);
  const landGuard = asRecord(guardRaw?.land_tdc_target_pct);
  const dcGuard = asRecord(guardRaw?.dc_tdc_target_pct);
  const fxRateToUsd = num(root.fx_rate_to_usd, root.fxRateToUsd, root.fx_rate);

  return {
    ...(fxRateToUsd != null ? { fx_rate_to_usd: fxRateToUsd } : {}),
    c1_development: {
      construction_rates: {
        building_rate_psf: building,
        parking_rate_psf: parking,
        basement_rate_psf: basement,
        ...(infrastructure !== undefined ? { infrastructure_rate_psf: infrastructure } : {}),
      },
      soft_costs: {
        sc_percentage: scPct,
        powc_percentage: powcPct,
        ffe_percentage: {
          recommended: ffeRec,
          min_range: ffeMin,
          max_range: ffeMax,
          ...(typeof ffeRaw.justification === "string"
            ? { justification: ffeRaw.justification }
            : {}),
        },
      },
      land_rate_psf: landRate,
      construction_period: {
        months,
        range,
        ...(typeof periodRaw.justification === "string"
          ? { justification: periodRaw.justification }
          : {}),
      },
      s_curve: {
        stage_1_pct: stage1,
        stage_2_pct: stage2,
        stage_3_pct: stage3,
        stage_4_pct: stage4,
        ...(typeof sCurveRaw.justification === "string"
          ? { justification: sCurveRaw.justification }
          : {}),
      },
      powc_breakdown: {
        site_establishment_pct:
          num(
            powcRaw.site_establishment_pct,
            powcRaw.site_est_pct,
            powcRaw.siteEstablishment
          ) ?? 40,
        overhead_pct: num(powcRaw.overhead_pct, powcRaw.overhead) ?? 12,
        authority_fees_pct:
          num(powcRaw.authority_fees_pct, powcRaw.authority_pct, powcRaw.authorityFees) ??
          48,
      },
      sc_breakdown: {
        architect_pct: num(scRaw.architect_pct, scRaw.architect) ?? 30,
        pm_pct: num(scRaw.pm_pct, scRaw.projectManagement) ?? 20,
        engineering_pct: num(scRaw.engineering_pct, scRaw.engineering) ?? 30,
        geotech_pct: num(scRaw.geotech_pct, scRaw.geotechnical) ?? 10,
        other_pct: num(scRaw.other_pct, scRaw.otherFees) ?? 10,
      },
    },
    ...(c2_operational ? { c2_operational } : {}),
    ...(asRecord(root.c2_sales)
      ? (() => {
          const c2Raw = asRecord(root.c2_sales)!;
          const deductionsRaw = asRecord(c2Raw.deductions) ?? {};
          const avgPrice =
            num(
              c2Raw.avg_sales_price_psf,
              c2Raw.averageSellingPricePerSqft,
              c2Raw.average_selling_price_psf,
              c2Raw.avgSalesPrice,
              c2Raw.salesPrice
            ) ?? 0;
          return {
            c2_sales: {
              avg_sales_price_psf: avgPrice,
              deductions: {
                agent_commission_pct:
                  num(
                    deductionsRaw.agent_commission_pct,
                    deductionsRaw.agentCommissionPct,
                    deductionsRaw.broker_commission_pct,
                    c2Raw.agent_commission_pct
                  ) ?? 0,
                vat_pct:
                  num(
                    deductionsRaw.vat_pct,
                    deductionsRaw.vatPercent,
                    deductionsRaw.vat,
                    c2Raw.vat_pct
                  ) ?? 0,
                escrow_fees_pct:
                  num(
                    deductionsRaw.escrow_fees_pct,
                    deductionsRaw.escrowFeePercent,
                    deductionsRaw.escrow_pct,
                    deductionsRaw.oqood_pct,
                    c2Raw.escrow_fees_pct
                  ) ?? 0,
                avg_sales_discount_pct:
                  num(
                    deductionsRaw.avg_sales_discount_pct,
                    deductionsRaw.avgSalesDiscountPct,
                    deductionsRaw.sales_discount_pct,
                    c2Raw.avg_sales_discount_pct
                  ) ?? 0,
              },
            },
          };
        })()
      : {}),
    hints: {
      contingency_text:
        (typeof hintsRaw?.contingency_text === "string" && hintsRaw.contingency_text) ||
        undefined,
      construction_period_text:
        (typeof hintsRaw?.construction_period_text === "string" &&
          hintsRaw.construction_period_text) ||
        undefined,
      sales_launch_text:
        (typeof hintsRaw?.sales_launch_text === "string" && hintsRaw.sales_launch_text) ||
        undefined,
    },
    guardrails: {
      land_tdc_target_pct: {
        min: num(landGuard?.min) ?? 0,
        max: num(landGuard?.max) ?? 51,
        recommended: num(landGuard?.recommended) ?? 35,
      },
      dc_tdc_target_pct: {
        min: num(dcGuard?.min) ?? 49,
        max: num(dcGuard?.max) ?? 100,
        recommended: num(dcGuard?.recommended) ?? 65,
      },
    },
  };
}
