import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import type {
  BTRDevelopmentAssumptionsData,
  BTROperationalAssumptionsData,
  BTROperationalExpensesData,
  BTROperationalPnLData,
  BTROperationalRevenuesData,
  FeasibilityProjectBundle,
  ImplicationsData,
  RetailCompetitiveLandscapeData,
  RetailMarketMetricsData,
  RetailMarketOverviewData,
  RetailMarketSummaryData,
  RetailSupplyPipelineData,
  RetailTenantProfileData,
  RiskFactorsData,
  SuccessFactorsData,
} from "@/types/feasibility";
import { getBTRContext } from "@/lib/feasibility/btr-context";
import {
  blendedResidentialLeasedPct,
  utilitiesBaseSqft,
} from "@/lib/residential-revenue-calculations";
import { totalOperationalBua } from "@/lib/operational-pnl";
import { buildOperationalCostBreakdown } from "@/lib/feasibility/build-operational-cost-breakdown";

const PNL_YEARS = OPERATIONAL_ROOM_REVENUE_YEARS;

function padYearSeries(source: number[] | undefined): number[] {
  return Array.from({ length: PNL_YEARS }, (_, i) => source?.[i] ?? 0);
}

export function buildBTRMarketOverviewData(
  bundle: FeasibilityProjectBundle
): RetailMarketOverviewData {
  const ctx = getBTRContext(bundle);
  return {
    demandDrivers: [
      `Urban household formation and rental preference in ${ctx.city}`,
      `Institutional BTR supply gap versus fragmented rental stock`,
      `Transit-oriented young professional catchment`,
      `Corporate relocation and expatriate rental demand`,
    ],
    catchmentHighlights: [
      `${ctx.city} employment nodes within 5 km radius`,
      `University and healthcare worker rental demand`,
      `Ground-floor retail serving resident convenience`,
    ],
  };
}

export function buildBTRMarketMetricsData(
  bundle: FeasibilityProjectBundle
): RetailMarketMetricsData {
  const ctx = getBTRContext(bundle);
  const chartData = ["2019", "2020", "2021", "2022", "2023", "2024E", "2025E"].map(
    (year, i) => ({
      year,
      footfall: Math.round(8 + i * 0.6),
      salesPsf: Math.round(ctx.residentialRentYear1 * 0.85 + i * 2),
      occupancy: Math.round(78 + i * 1.5),
    })
  );
  return {
    chartData,
    footfallCagr: "4.2%",
    salesPsfCagr: "3.5%",
    occupancyLatest: `${chartData.at(-2)?.occupancy ?? ctx.residentialStabilizedOccupancy}%`,
  };
}

export function buildBTRSupplyPipelineData(
  bundle: FeasibilityProjectBundle
): RetailSupplyPipelineData {
  const ctx = getBTRContext(bundle);
  const totalGla = ctx.residentialGla + ctx.retailGla;
  const existing = Math.round(totalGla * 38);
  const chartData = [
    { year: "2021", existingGla: existing * 0.93, pipelineGla: existing * 0.05 },
    { year: "2022", existingGla: existing * 0.95, pipelineGla: existing * 0.06 },
    { year: "2023", existingGla: existing * 0.97, pipelineGla: existing * 0.07 },
    { year: "2024E", existingGla: existing, pipelineGla: existing * 0.08 },
    { year: "2025E", existingGla: existing * 1.02, pipelineGla: existing * 0.07 },
    { year: "2026E", existingGla: existing * 1.04, pipelineGla: existing * 0.06 },
  ];
  return {
    chartData,
    existingStockSqft: existing,
    pipelineSqft: Math.round(existing * 0.08),
    subjectSharePct: existing > 0 ? `${((totalGla / existing) * 100).toFixed(1)}%` : "—",
  };
}

export function buildBTRCompetitiveLandscapeData(
  bundle: FeasibilityProjectBundle
): RetailCompetitiveLandscapeData {
  const ctx = getBTRContext(bundle);
  const c = ctx.currency;
  const isKL = ctx.city.toLowerCase().includes("kuala");
  const benchmarks = isKL
    ? [
        {
          name: "The MET Corporate Towers",
          gla: "1.2M sqft res.",
          occupancy: "94%",
          baseRent: `${c} 62/sqft`,
          positioning: "Prime BTR",
        },
        {
          name: "Sunway Belfield",
          gla: "890K sqft res.",
          occupancy: "91%",
          baseRent: `${c} 58/sqft`,
          positioning: "Grade A BTR",
        },
        {
          name: "Verde Residence",
          gla: "650K sqft res.",
          occupancy: "89%",
          baseRent: `${c} 55/sqft`,
          positioning: "Mid-Market BTR",
        },
        {
          name: "KL Sentral Living",
          gla: "420K sqft res.",
          occupancy: "92%",
          baseRent: `${c} 61/sqft`,
          positioning: "Transit BTR",
        },
      ]
    : [
        {
          name: `${ctx.city} BTR Tower One`,
          gla: "750K sqft res.",
          occupancy: "90%",
          baseRent: `${c} ${ctx.residentialRentYear1}/sqft`,
          positioning: "Grade B BTR",
        },
        {
          name: `${ctx.city} Urban Rentals`,
          gla: "520K sqft res.",
          occupancy: "88%",
          baseRent: `${c} ${Math.round(ctx.residentialRentYear1 * 0.95)}/sqft`,
          positioning: "Mid-Market BTR",
        },
      ];

  return {
    benchmarkMalls: benchmarks,
    avgOccupancy: "91%",
    avgBaseRent: `${c} ${Math.round(ctx.residentialRentYear1 * 1.02)}/sqft`,
  };
}

export function buildBTRTenantProfileData(
  bundle: FeasibilityProjectBundle
): RetailTenantProfileData {
  return {
    tenantMix: [
      { category: "Young Professionals", sharePct: 35 },
      { category: "Small Families", sharePct: 25 },
      { category: "Expatriates", sharePct: 18 },
      { category: "Students / Graduates", sharePct: 12 },
      { category: "Corporate Leased", sharePct: 10 },
    ],
    catchmentRadius: "5 km urban catchment",
    primaryDemographics: [
      "Ages 25–40 seeking flexible rental tenure",
      "Household income supporting amenity fee uptake",
      "Transit-connected urban lifestyle preference",
    ],
    waleYears: 1.2,
  };
}

export function buildBTRMarketSummaryData(
  bundle: FeasibilityProjectBundle
): RetailMarketSummaryData {
  const ctx = getBTRContext(bundle);
  return {
    marketOverview: [
      `${ctx.city} BTR market benefits from urbanisation and rental preference over ownership.`,
      `Institutional product commands premium to fragmented rental stock.`,
    ],
    supplyDemand: [
      `Subject ${(ctx.residentialGla + ctx.retailGla).toLocaleString()} sqft GLA adds measured supply.`,
      `Lease-up to ${ctx.residentialStabilizedOccupancy}% over ${ctx.residentialLeaseUpMonths} months.`,
    ],
    competitivePosition: [
      `Benchmark towers support rent at ${ctx.currency} ${ctx.residentialRentYear1}/sqft.`,
      `Amenity-rich BTR with ground-floor retail differentiates versus pure residential competitors.`,
    ],
    investmentThesis: [
      `Project IRR ${ctx.projectIRR}% with ${ctx.equityMultiple.toFixed(2)}x equity multiple.`,
      `Recurring rents and ancillary income support institutional hold strategy.`,
    ],
  };
}

export function buildBTRDevelopmentAssumptionsData(
  bundle: FeasibilityProjectBundle
): BTRDevelopmentAssumptionsData {
  const ctx = getBTRContext(bundle);
  return {
    currency: ctx.currency,
    residentialGla: ctx.residentialGla,
    retailGla: ctx.retailGla,
    constructionCost: ctx.constructionCost,
    ffeBase: ctx.ffeBase,
    constructionLife: ctx.constructionLife,
    ffeLife: ctx.ffeLife,
    landCost: bundle.component1.landCost,
    softCosts: bundle.component1.softCosts,
    powc: bundle.component1.powc,
    tdc: ctx.tdc,
    costBreakdown: buildOperationalCostBreakdown(bundle),
  };
}

export function buildBTROperationalRevenuesData(
  bundle: FeasibilityProjectBundle
): BTROperationalRevenuesData {
  const combined = buildBTROperationalAssumptionsData(bundle);
  const revenueRows = combined.rows.filter(
    (row) => !row.category.toLowerCase().includes("opex")
  );
  return {
    currency: combined.currency,
    residentialGla: combined.residentialGla,
    retailGla: combined.retailGla,
    rows: revenueRows,
    totalRevenue: combined.totalRevenue,
  };
}

export function buildBTROperationalExpensesData(
  bundle: FeasibilityProjectBundle
): BTROperationalExpensesData {
  const ctx = getBTRContext(bundle);
  const opex = bundle.residentialOpex;
  const snap = ctx.snap;
  const totalUnits =
    opex?.estimatedTotalUnits ?? snap?.estimatedTotalUnits ?? ctx.totalUnits ?? 0;
  const mgmtPct = opex?.mgmtFeePctOfEgi ?? 4;
  const residentialGla = ctx.residentialGla;
  const retailGla = ctx.retailGla;
  const totalGla = residentialGla + retailGla;
  const totalBua = totalOperationalBua({
    buildingBUA: bundle.component1?.buildingBUA ?? bundle.component1?.bua,
    parkingBUA: bundle.component1?.parkingBUA,
    basementBUA: 0,
  });
  const maintenancePct = opex?.maintenancePctOfResidentialGla ?? 2.5;
  const utilitiesPct = opex?.utilitiesPctOfCommonVacantGla ?? 15;
  const blendedY1 = blendedResidentialLeasedPct(
    1,
    residentialGla,
    retailGla,
    snap
  );
  const utilBase = utilitiesBaseSqft(totalBua, totalGla, blendedY1);
  const maintenance =
    snap?.opexMaintenanceValues?.[0] ??
    (maintenancePct / 100) * residentialGla;
  const utilities =
    snap?.opexUtilitiesValues?.[0] ?? (utilitiesPct / 100) * utilBase;
  const propertyTaxPct = opex?.propertyTaxPctOfGrossRent ?? 5;
  const insurancePct = opex?.insurancePctOfGrossRent ?? 1;
  const grossRentYear1 =
    snap?.totalBaseRentValues?.[0] ?? snap?.residentialRentValues?.[0] ?? 0;
  const propertyTax =
    snap?.opexPropertyTaxValues?.[0] ??
    grossRentYear1 * (propertyTaxPct / 100);
  const insurance =
    snap?.opexInsuranceValues?.[0] ??
    grossRentYear1 * (insurancePct / 100);
  const marketingPct = opex?.marketingPctOfEgi ?? 1;
  const gAndAPct = opex?.gAndAPctOfGrossRent ?? 3;
  const gAndA =
    snap?.opexGaValues?.[0] ?? grossRentYear1 * (gAndAPct / 100);
  const capexReservePct = opex?.capexReservePctOfTotalGla ?? 5;
  const capex =
    snap?.opexCapexValues?.[0] ?? (capexReservePct / 100) * totalGla;
  const totalOpexYear1 =
    snap?.opexTotalValues?.[0] ??
    maintenance +
      utilities +
      propertyTax +
      insurance +
      gAndA +
      capex;

  return {
    currency: ctx.currency,
    totalUnits,
    assumptions: [
      { item: "Property Management Fee", value: `${mgmtPct}%`, basis: "EGI" },
      {
        item: "Maintenance & Repairs",
        value: `${maintenancePct}%`,
        basis: "of residential GLA per year",
      },
      {
        item: "Utilities (Common Areas + Vacant)",
        value: `${utilitiesPct}%`,
        basis: "of common area + vacant GLA per year",
      },
      {
        item: "Property Tax",
        value: `${propertyTaxPct}%`,
        basis: "of gross rental revenue",
      },
      {
        item: "Insurance",
        value: `${insurancePct}%`,
        basis: "of gross rental revenue",
      },
      { item: "Marketing & Leasing", value: `${marketingPct}%`, basis: "EGI" },
      {
        item: "G&A (General & Administrative)",
        value: `${gAndAPct}%`,
        basis: "of gross rental revenue",
      },
      {
        item: "Renovation / Capex Reserve",
        value: `${capexReservePct}%`,
        basis: "of total GLA per year",
      },
    ],
    annualTotals: [
      { item: "Property Management Fee", amount: `${mgmtPct}% of EGI` },
      {
        item: "Maintenance & Repairs",
        amount: maintenance,
      },
      { item: "Utilities", amount: utilities },
      { item: "Property Tax", amount: propertyTax },
      { item: "Insurance", amount: insurance },
      { item: "Marketing & Leasing", amount: `${marketingPct}% of EGI` },
      { item: "G&A", amount: gAndA },
      { item: "Renovation / Capex Reserve", amount: capex },
      { item: "Total OpEx (Year 1)", amount: Math.round(totalOpexYear1) },
    ],
    totalOpexYear1: Math.round(totalOpexYear1),
  };
}

export function buildBTROperationalAssumptionsData(
  bundle: FeasibilityProjectBundle
): BTROperationalAssumptionsData {
  const ctx = getBTRContext(bundle);
  const snap = ctx.snap;
  const y1Residential =
    (snap?.residentialRentValues?.[0] ?? 0) ||
    ctx.residentialGla *
      ctx.residentialRentYear1 *
      (ctx.residentialLeaseUpYear1 / 100);
  const y1Retail = snap?.retailMinRentValues?.[0] ?? 0;
  const parking = snap?.parkingIncomeValues?.[0] ?? 0;
  const amenity = snap?.amenityIncomeValues?.[0] ?? 0;
  const utility = snap?.utilityIncomeValues?.[0] ?? 0;
  const totalOpex =
    (snap?.opexTotalValues?.[0] ?? 0) ||
    (snap?.opexMgmtFeeValues?.[0] ?? 0) +
      (snap?.opexMaintenanceValues?.[0] ?? 0) +
      (snap?.opexUtilitiesValues?.[0] ?? 0) +
      (snap?.opexPropertyTaxValues?.[0] ?? 0) +
      (snap?.opexInsuranceValues?.[0] ?? 0) +
      (snap?.opexMarketingValues?.[0] ?? 0) +
      (snap?.opexGaValues?.[0] ?? 0) +
      (snap?.opexCapexValues?.[0] ?? 0);

  const rows = [
    { category: "Residential Rent", amount: Math.round(y1Residential) },
    { category: "Retail Min Rent", amount: Math.round(y1Retail) },
    { category: "Parking Income", amount: Math.round(parking) },
    { category: "Amenity Fees", amount: Math.round(amenity) },
    { category: "Utility Recoveries", amount: Math.round(utility) },
    { category: "Total OpEx (Year 1)", amount: Math.round(totalOpex) },
  ];

  return {
    currency: ctx.currency,
    residentialGla: ctx.residentialGla,
    retailGla: ctx.retailGla,
    rows,
    totalRevenue: Math.round(y1Residential + y1Retail + parking + amenity + utility),
    totalOpex: Math.round(totalOpex),
  };
}

export function buildBTROperationalPnlData(
  bundle: FeasibilityProjectBundle
): BTROperationalPnLData {
  const snap = bundle.residentialHoldSnapshot;
  const residentialOpex = bundle.residentialOpex;
  const residentialDepreciation = bundle.residentialDepreciation;

  const residentialRent = padYearSeries(snap?.residentialRentValues);
  const retailMinRent = padYearSeries(snap?.retailMinRentValues);
  const parking = padYearSeries(snap?.parkingIncomeValues);
  const amenity = padYearSeries(snap?.amenityIncomeValues);
  const utility = padYearSeries(snap?.utilityIncomeValues);
  const other = padYearSeries(snap?.otherFeesIncomeValues);

  const totalRevenue = residentialRent.map(
    (v, i) =>
      v + retailMinRent[i]! + parking[i]! + amenity[i]! + utility[i]! + other[i]!
  );

  const opexRows =
    residentialOpex?.projection?.length === PNL_YEARS
      ? residentialOpex.projection
      : Array.from({ length: PNL_YEARS }, (_, i) => ({
          mgmtFee: snap?.opexMgmtFeeValues?.[i] ?? 0,
          maintenance: snap?.opexMaintenanceValues?.[i] ?? 0,
          utilities: snap?.opexUtilitiesValues?.[i] ?? 0,
          tax: snap?.opexPropertyTaxValues?.[i] ?? 0,
          insurance: snap?.opexInsuranceValues?.[i] ?? 0,
          marketing: snap?.opexMarketingValues?.[i] ?? 0,
          gAndA: snap?.opexGaValues?.[i] ?? 0,
          capex: snap?.opexCapexValues?.[i] ?? 0,
        }));

  const managementFee = opexRows.map((r) => r.mgmtFee);
  const maintenance = opexRows.map((r) => r.maintenance);
  const utilities = opexRows.map((r) => r.utilities);
  const propertyTax = opexRows.map((r) => r.tax);
  const insurance = opexRows.map((r) => r.insurance);
  const marketing = opexRows.map((r) => r.marketing);
  const gAndA = opexRows.map((r) => r.gAndA);
  const capexReserve = opexRows.map((r) => r.capex);
  const totalExpenses = padYearSeries(snap?.opexTotalValues).map((v, i) =>
    v > 0
      ? v
      : managementFee[i]! +
        maintenance[i]! +
        utilities[i]! +
        propertyTax[i]! +
        insurance[i]! +
        marketing[i]! +
        gAndA[i]! +
        capexReserve[i]!
  );

  const ebitda = totalRevenue.map((r, i) => r - totalExpenses[i]!);

  const deprRows =
    residentialDepreciation?.projection?.length === PNL_YEARS
      ? residentialDepreciation.projection
      : Array.from({ length: PNL_YEARS }, (_, i) => ({
          constructionDep: snap?.depConstructionValues?.[i] ?? 0,
          ffeDep: snap?.depFfeValues?.[i] ?? 0,
        }));

  const depreciationTotal = padYearSeries(snap?.depTotalValues).map((v, i) =>
    v > 0 ? v : deprRows[i]!.constructionDep + deprRows[i]!.ffeDep
  );

  const ebit = ebitda.map((e, i) => e - depreciationTotal[i]!);
  const netIncome = [...ebit];

  const yoyGrowth = netIncome.map((ni, i) => {
    if (i === 0 || !netIncome[i - 1]) return "—";
    const pct = ((ni / netIncome[i - 1]! - 1) * 100).toFixed(1);
    return `${pct}%`;
  });

  return {
    currency: bundle.currency,
    years: Array.from({ length: PNL_YEARS }, (_, i) => `Y${i + 1}`),
    revenues: {
      residentialRent,
      retailMinRent,
      parking,
      amenity,
      utility,
      other,
      totalRevenue,
    },
    operatingExpenses: {
      managementFee,
      maintenance,
      utilities,
      propertyTax,
      insurance,
      marketing,
      gAndA,
      capexReserve,
      totalExpenses,
    },
    ebitda,
    depreciationTotal,
    ebit,
    netIncome,
    yoyGrowth,
  };
}

export function buildBTRImplicationsData(
  bundle: FeasibilityProjectBundle
): ImplicationsData {
  const ctx = getBTRContext(bundle);
  return {
    hospitalityImplications: [
      {
        number: 1,
        title: "Rental demand",
        description: `Urban rental demand supports lease-up from ${ctx.residentialLeaseUpYear1}% to ${ctx.residentialStabilizedOccupancy}%.`,
      },
      {
        number: 2,
        title: "BTR positioning",
        description: `Institutional BTR product at ${ctx.currency} ${ctx.residentialRentYear1}/sqft aligns with Grade B benchmarks.`,
      },
      {
        number: 3,
        title: "Ancillary income",
        description: `Parking, amenity fees, and utility recoveries enhance EGI per unit.`,
      },
    ],
    keyTakeaways: [
      `Market supports ${ctx.residentialStabilizedOccupancy}% stabilized occupancy within ${ctx.residentialLeaseUpMonths} months.`,
      "Gross lease BTR model with capex reserve aligns with institutional operating standards.",
    ],
  };
}

export function buildBTRSuccessFactorsData(
  bundle: FeasibilityProjectBundle
): SuccessFactorsData {
  const ctx = getBTRContext(bundle);
  return {
    marketOpportunities: [
      {
        factor: "Institutional BTR supply gap",
        effect: `Supports absorption in ${ctx.city}. Enables rent premium over fragmented stock.`,
      },
      {
        factor: "Urban household rental preference",
        effect: "Young professionals favour flexible tenure. Reduces ownership dependency.",
      },
      {
        factor: "Ancillary income upside",
        effect: "Parking, amenities, and utilities diversify EGI. Enhances NOI per unit.",
      },
    ],
    projectStrengths: [
      {
        strength: "Professional property management",
        effect: "Drives tenant retention. Minimizes vacancy through institutional operations.",
      },
      {
        strength: `${ctx.residentialGla.toLocaleString()} sqft residential + ${ctx.retailGla.toLocaleString()} sqft retail`,
        effect: "Balanced income stack. Ground-floor activation supports resident amenity.",
      },
      {
        strength: "Capex reserve discipline",
        effect: "Preserves asset quality. Funds unit turnover and long-term NOI.",
      },
    ],
    mainOutcomes: [
      `Project captures ${ctx.city} BTR rental demand at ${ctx.projectIRR}% project IRR.`,
      "Recurring residential rents and ancillary streams support institutional hold strategy.",
    ],
  };
}

export function buildBTRRiskFactorsData(
  bundle: FeasibilityProjectBundle
): RiskFactorsData {
  const ctx = getBTRContext(bundle);
  return {
    marketThreats: [
      {
        risk: "Lease-up velocity risk",
        effect: "Delayed stabilization compresses early-year returns.",
        mitigatingFactors: [
          `${ctx.residentialLeaseUpMonths}-month lease-up plan`,
          "Pre-leasing marketing program",
        ],
      },
      {
        risk: "Competing BTR supply",
        effect: "New towers may pressure rents and occupancy.",
        mitigatingFactors: ["Differentiated amenity package", "Transit connectivity", "Grade B positioning"],
      },
      {
        risk: "Interest rate sensitivity",
        effect: "Higher rates may reduce exit yields and equity returns.",
        mitigatingFactors: ["Fixed-rate debt", "Conservative LTC", "Scenario stress testing"],
      },
    ],
    projectWeaknesses: [
      {
        weakness: "Bad debt exposure",
        effect: `${ctx.badDebtPct}% bad debt provision may prove insufficient in downturn.`,
        mitigatingFactors: ["Credit screening and deposits", "Corporate lease guarantees"],
      },
      {
        weakness: "Operating cost inflation",
        effect: "Utilities and maintenance may exceed gross lease escalators.",
        mitigatingFactors: ["Annual rent reviews", "Capex reserve for unit turnover"],
      },
      {
        weakness: "Single-asset concentration",
        effect: "Exposes returns to local rental market cycles.",
        mitigatingFactors: ["Diversified unit mix", "Institutional sponsorship", "Long hold horizon"],
      },
    ],
  };
}

export function isBTRDevelopmentAssumptionsData(
  d: unknown
): d is BTRDevelopmentAssumptionsData {
  return (
    !!d &&
    typeof d === "object" &&
    typeof (d as BTRDevelopmentAssumptionsData).residentialGla === "number"
  );
}

export function isBTROperationalRevenuesData(
  d: unknown
): d is BTROperationalRevenuesData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as BTROperationalRevenuesData).rows) &&
    typeof (d as BTROperationalRevenuesData).totalRevenue === "number"
  );
}

export function isBTROperationalExpensesData(
  d: unknown
): d is BTROperationalExpensesData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as BTROperationalExpensesData).assumptions)
  );
}

export function isBTROperationalAssumptionsData(
  d: unknown
): d is BTROperationalAssumptionsData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as BTROperationalAssumptionsData).rows)
  );
}

export function isBTROperationalPnLData(d: unknown): d is BTROperationalPnLData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as BTROperationalPnLData).years) &&
    typeof (d as BTROperationalPnLData).revenues === "object"
  );
}
