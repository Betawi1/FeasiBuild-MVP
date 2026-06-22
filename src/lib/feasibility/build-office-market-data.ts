import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";
import type {
  FeasibilityProjectBundle,
  ImplicationsData,
  OfficeDevelopmentAssumptionsData,
  OfficeOperationalExpensesData,
  OfficeOperationalPnLData,
  OfficeOperationalRevenuesData,
  RetailCompetitiveLandscapeData,
  RetailMarketMetricsData,
  RetailMarketOverviewData,
  RetailMarketSummaryData,
  RetailSupplyPipelineData,
  RetailTenantProfileData,
  RiskFactorsData,
  SuccessFactorsData,
} from "@/types/feasibility";
import { getOfficeContext } from "@/lib/feasibility/office-context";
import { buildOperationalCostBreakdown } from "@/lib/feasibility/build-operational-cost-breakdown";

const PNL_YEARS = OPERATIONAL_ROOM_REVENUE_YEARS;

function padYearSeries(source: number[] | undefined): number[] {
  return Array.from({ length: PNL_YEARS }, (_, i) => source?.[i] ?? 0);
}

export function buildOfficeMarketOverviewData(
  bundle: FeasibilityProjectBundle
): RetailMarketOverviewData {
  const ctx = getOfficeContext(bundle);
  return {
    demandDrivers: [
      `Flight-to-quality office demand in ${ctx.city} CBD`,
      `Corporate expansion and multinational regional headquarters`,
      `Ground-floor retail activation from office worker footfall`,
      `Limited prime Grade A supply in immediate micro-market`,
    ],
    catchmentHighlights: [
      `${ctx.city} central business district employment base`,
      `Transit-oriented professional catchment`,
      `Retail spending from daytime worker population`,
    ],
  };
}

export function buildOfficeMarketMetricsData(
  bundle: FeasibilityProjectBundle
): RetailMarketMetricsData {
  const ctx = getOfficeContext(bundle);
  const chartData = ["2019", "2020", "2021", "2022", "2023", "2024E", "2025E"].map(
    (year, i) => ({
      year,
      footfall: Math.round(12 + i * 0.8),
      salesPsf: Math.round(ctx.officeRentYear1 * 0.9 + i * 4),
      occupancy: Math.round(82 + i * 1.2),
    })
  );
  return {
    chartData,
    footfallCagr: "3.8%",
    salesPsfCagr: "3.2%",
    occupancyLatest: `${chartData.at(-2)?.occupancy ?? ctx.officeStabilizedOccupancy}%`,
  };
}

export function buildOfficeSupplyPipelineData(
  bundle: FeasibilityProjectBundle
): RetailSupplyPipelineData {
  const ctx = getOfficeContext(bundle);
  const totalGla = ctx.officeGla + ctx.retailGla;
  const existing = Math.round(totalGla * 45);
  const chartData = [
    { year: "2021", existingGla: existing * 0.94, pipelineGla: existing * 0.04 },
    { year: "2022", existingGla: existing * 0.96, pipelineGla: existing * 0.05 },
    { year: "2023", existingGla: existing * 0.98, pipelineGla: existing * 0.06 },
    { year: "2024E", existingGla: existing, pipelineGla: existing * 0.07 },
    { year: "2025E", existingGla: existing * 1.02, pipelineGla: existing * 0.06 },
    { year: "2026E", existingGla: existing * 1.04, pipelineGla: existing * 0.05 },
  ];
  return {
    chartData,
    existingStockSqft: existing,
    pipelineSqft: Math.round(existing * 0.07),
    subjectSharePct: existing > 0 ? `${((totalGla / existing) * 100).toFixed(1)}%` : "—",
  };
}

export function buildOfficeCompetitiveLandscapeData(
  bundle: FeasibilityProjectBundle
): RetailCompetitiveLandscapeData {
  const ctx = getOfficeContext(bundle);
  const c = ctx.currency;
  const isKL = ctx.city.toLowerCase().includes("kuala");
  const benchmarks = isKL
    ? [
        {
          name: "Petronas Twin Towers / KLCC",
          gla: "4.6M sqft",
          occupancy: "94%",
          baseRent: `${c} 135/sqft`,
          positioning: "Super Prime Office",
        },
        {
          name: "The Exchange TRX",
          gla: "2.1M sqft",
          occupancy: "92%",
          baseRent: `${c} 128/sqft`,
          positioning: "Grade A Mixed-Use",
        },
        {
          name: "Merdeka 118 Precinct",
          gla: "1.8M sqft",
          occupancy: "88%",
          baseRent: `${c} 125/sqft`,
          positioning: "Grade A Office",
        },
        {
          name: "Pavilion Damansara Heights",
          gla: "890K sqft",
          occupancy: "90%",
          baseRent: `${c} 220/sqft retail`,
          positioning: "Prime Retail Podium",
        },
      ]
    : [
        {
          name: `${ctx.city} Tower One`,
          gla: "1.2M sqft",
          occupancy: "91%",
          baseRent: `${c} ${ctx.officeRentYear1}/sqft`,
          positioning: "Grade A Office",
        },
        {
          name: `${ctx.city} Mixed-Use Centre`,
          gla: "750K sqft",
          occupancy: "89%",
          baseRent: `${c} ${Math.round(ctx.officeRentYear1 * 0.95)}/sqft`,
          positioning: "Mixed-Use",
        },
      ];

  return {
    benchmarkMalls: benchmarks,
    avgOccupancy: "91%",
    avgBaseRent: `${c} ${Math.round(ctx.officeRentYear1 * 1.02)}/sqft`,
  };
}

export function buildOfficeTenantProfileData(
  bundle: FeasibilityProjectBundle
): RetailTenantProfileData {
  return {
    tenantMix: [
      { category: "Financial Services", sharePct: 28 },
      { category: "Technology & Media", sharePct: 22 },
      { category: "Professional Services", sharePct: 18 },
      { category: "F&B Retail", sharePct: 14 },
      { category: "Convenience & Services", sharePct: 10 },
      { category: "Other Office", sharePct: 8 },
    ],
    catchmentRadius: "CBD + 5 km professional catchment",
    primaryDemographics: [
      "Corporate tenants seeking Grade A office space",
      "Daytime worker population for podium retail",
      "Transit-connected professional demographic",
    ],
    waleYears: 5.5,
  };
}

export function buildOfficeMarketSummaryData(
  bundle: FeasibilityProjectBundle
): RetailMarketSummaryData {
  const ctx = getOfficeContext(bundle);
  return {
    marketOverview: [
      `${ctx.city} prime office market supports flight-to-quality absorption.`,
      `Mixed-use format combines office income stability with retail upside.`,
    ],
    supplyDemand: [
      `Measured pipeline; subject ${(ctx.officeGla + ctx.retailGla).toLocaleString()} sqft GLA incremental supply.`,
      `Office stabilization target ${ctx.officeStabilizedOccupancy}%; retail ${ctx.retailStabilizedOccupancy}%.`,
    ],
    competitivePosition: [
      `Benchmark towers support rent and occupancy assumptions.`,
      `Podium retail differentiates versus pure office competitors.`,
    ],
    investmentThesis: [
      `Project IRR ${ctx.projectIRR}% with ${ctx.equityMultiple.toFixed(2)}x equity multiple.`,
      `Blended lease-up captures office and retail stabilization curves.`,
    ],
  };
}

export function buildOfficeDevelopmentAssumptionsData(
  bundle: FeasibilityProjectBundle
): OfficeDevelopmentAssumptionsData {
  const ctx = getOfficeContext(bundle);
  return {
    currency: ctx.currency,
    officeGla: ctx.officeGla,
    retailGla: ctx.retailGla,
    constructionCost: ctx.constructionCost,
    ffeBase: ctx.ffeBase,
    officeTI: ctx.officeTI,
    retailTI: ctx.retailTI,
    officeLeasingComm: ctx.officeLeasingComm,
    retailLeasingComm: ctx.retailLeasingComm,
    landCost: ctx.landCost,
    softCosts: ctx.softCosts,
    powc: ctx.powc,
    tdc: ctx.tdc,
    costBreakdown: buildOperationalCostBreakdown(bundle),
  };
}

export function buildOfficeOperationalRevenuesData(
  bundle: FeasibilityProjectBundle
): OfficeOperationalRevenuesData {
  const ctx = getOfficeContext(bundle);
  const snap = ctx.snap;
  const officeRent = snap?.officeRentValues?.[0] ??
    ctx.officeGla * ctx.officeRentYear1 * (ctx.officeLeaseUpYear1 / 100);
  const retailRent = snap?.retailMinRentValues?.[0] ??
    ctx.retailGla * ctx.retailRentYear1 * (ctx.retailLeaseUpYear1 / 100);
  const cam = snap?.camRecoveryValues?.[0] ?? 0;
  const parking = snap?.parkingIncomeValues?.[0] ?? 0;
  const advertising = snap?.advertisingValues?.[0] ?? 0;
  const total = officeRent + retailRent + cam + parking + advertising;

  const row = (source: string, amount: number) => ({
    source,
    amount: Math.round(amount),
    sharePct: total > 0 ? Math.round((amount / total) * 100) : 0,
  });

  return {
    currency: ctx.currency,
    officeGla: ctx.officeGla,
    retailGla: ctx.retailGla,
    rows: [
      row("Office Rent", officeRent),
      row("Retail Min Rent", retailRent),
      row("CAM & Tax Recoveries", cam),
      row("Parking Income", parking),
      row("Advertising / Signage", advertising),
    ],
    totalRevenue: Math.round(total),
  };
}

export function buildOfficeOperationalExpensesData(
  bundle: FeasibilityProjectBundle
): OfficeOperationalExpensesData {
  const ctx = getOfficeContext(bundle);
  const snap = ctx.snap;
  const rev = buildOfficeOperationalRevenuesData(bundle).totalRevenue;
  const cam = snap?.opexCamValues?.[0] ?? 0;
  const propertyTax = snap?.opexPropertyTaxValues?.[0] ?? 0;
  const insurance = snap?.opexInsuranceValues?.[0] ?? 0;
  const marketing = snap?.opexMarketingValues?.[0] ?? 0;
  const gAndA = snap?.opexGaValues?.[0] ?? 0;
  const mgmt = snap?.opexMgmtFeeValues?.[0] ?? 0;
  const renovation = snap?.opexRenovationValues?.[0] ?? 0;
  const total = cam + propertyTax + insurance + marketing + gAndA + mgmt + renovation;

  const row = (category: string, amount: number) => ({
    category,
    amount: Math.round(amount),
    shareOfRevenuePct: rev > 0 ? Math.round((amount / rev) * 1000) / 10 : 0,
  });

  return {
    currency: ctx.currency,
    rows: [
      row("CAM", cam),
      row("Property Tax", propertyTax),
      row("Insurance", insurance),
      row("Marketing", marketing),
      row("G&A", gAndA),
      row("Management Fee", mgmt),
      row("Renovation Provision", renovation),
    ],
    totalOpex: Math.round(total),
    totalRevenue: rev,
  };
}

export function buildOfficeOperationalPnlData(
  bundle: FeasibilityProjectBundle
): OfficeOperationalPnLData {
  const snap = bundle.officeHoldSnapshot;
  const officeRent = padYearSeries(snap?.officeRentValues);
  const retailMinRent = padYearSeries(snap?.retailMinRentValues);
  const camRecoveries = padYearSeries(snap?.camRecoveryValues);
  const parkingIncome = padYearSeries(snap?.parkingIncomeValues);
  const advertisingIncome = padYearSeries(snap?.advertisingValues);
  const totalRevenue = officeRent.map(
    (v, i) =>
      v + retailMinRent[i]! + camRecoveries[i]! + parkingIncome[i]! + advertisingIncome[i]!
  );

  const cam = padYearSeries(snap?.opexCamValues);
  const propertyTax = padYearSeries(snap?.opexPropertyTaxValues);
  const insurance = padYearSeries(snap?.opexInsuranceValues);
  const marketing = padYearSeries(snap?.opexMarketingValues);
  const gAndA = padYearSeries(snap?.opexGaValues);
  const managementFee = padYearSeries(snap?.opexMgmtFeeValues);
  const renovationProvision = padYearSeries(snap?.opexRenovationValues);
  const totalExpenses = padYearSeries(snap?.opexTotalValues).map((v, i) =>
    v > 0
      ? v
      : cam[i]! +
        propertyTax[i]! +
        insurance[i]! +
        marketing[i]! +
        gAndA[i]! +
        managementFee[i]! +
        renovationProvision[i]!
  );

  const ebitda = totalRevenue.map((r, i) => r - totalExpenses[i]!);
  const depreciationTotal = padYearSeries(snap?.depTotalValues).map((v, i) =>
    v > 0
      ? v
      : (snap?.depConstructionValues?.[i] ?? 0) +
        (snap?.depFfeValues?.[i] ?? 0) +
        (snap?.depOfficeTiValues?.[i] ?? 0) +
        (snap?.depRetailTiValues?.[i] ?? 0) +
        (snap?.depOfficeLeasingCommValues?.[i] ?? 0) +
        (snap?.depRetailLeasingCommValues?.[i] ?? 0)
  );
  const ebit = ebitda.map((e, i) => e - depreciationTotal[i]!);
  const netIncome = ebit;

  const yoyGrowth = totalRevenue.map((r, i) => {
    if (i === 0 || !totalRevenue[i - 1]) return "—";
    const pct = ((r / totalRevenue[i - 1]! - 1) * 100).toFixed(1);
    return `${pct}%`;
  });

  return {
    currency: bundle.currency,
    years: Array.from({ length: PNL_YEARS }, (_, i) => `Y${i + 1}`),
    revenues: {
      officeRent,
      retailMinRent,
      camRecoveries,
      parkingIncome,
      advertisingIncome,
      totalRevenue,
    },
    operatingExpenses: {
      cam,
      propertyTax,
      insurance,
      marketing,
      gAndA,
      managementFee,
      renovationProvision,
      totalExpenses,
    },
    ebitda,
    depreciationTotal,
    ebit,
    netIncome,
    yoyGrowth,
  };
}

export function buildOfficeImplicationsData(
  bundle: FeasibilityProjectBundle
): ImplicationsData {
  const ctx = getOfficeContext(bundle);
  return {
    hospitalityImplications: [
      {
        number: 1,
        title: "Office demand",
        description: `Flight-to-quality supports lease-up from ${ctx.officeLeaseUpYear1}% to ${ctx.officeStabilizedOccupancy}%.`,
      },
      {
        number: 2,
        title: "Retail activation",
        description: "Ground-floor podium retail captures worker footfall and diversifies income.",
      },
      {
        number: 3,
        title: "Blended rents",
        description: `Office ${ctx.currency} ${ctx.officeRentYear1}/sqft and retail ${ctx.currency} ${ctx.retailRentYear1}/sqft align with benchmarks.`,
      },
      {
        number: 4,
        title: "WALE profile",
        description: "Target office WALE above five years supports refinancing optionality.",
      },
      {
        number: 5,
        title: "Parking yield",
        description: "Structured parking income supplements core rental streams.",
      },
      {
        number: 6,
        title: "CAM recoveries",
        description: "Pass-through recoveries mitigate opex leakage on controllable costs.",
      },
      {
        number: 7,
        title: "Supply pipeline",
        description: `Incremental ${(ctx.officeGla + ctx.retailGla).toLocaleString()} sqft must pre-lease ahead of delivery.`,
      },
      {
        number: 8,
        title: "Investment case",
        description: `Project IRR of ${ctx.projectIRR}% achievable with disciplined blended lease-up.`,
      },
    ],
    keyTakeaways: [
      `Market fundamentals in ${ctx.city} support prime mixed-use development.`,
      "Office and retail components provide complementary income diversification.",
      "Success depends on pre-leasing, tenant mix, and opex discipline.",
    ],
  };
}

export function buildOfficeSuccessFactorsData(
  bundle: FeasibilityProjectBundle
): SuccessFactorsData {
  const ctx = getOfficeContext(bundle);
  return {
    marketOpportunities: [
      {
        factor: "Flight-to-quality office demand",
        effect: `Supports absorption in ${ctx.city} CBD. Enables rent premium. Reduces vacancy risk.`,
      },
      {
        factor: "Mixed-use differentiation",
        effect: "Retail podium enhances office amenity. Attracts corporate tenants. Diversifies income.",
      },
      {
        factor: "Limited prime supply",
        effect: "Reduces direct competition. Supports pre-leasing. Extends WALE.",
      },
    ],
    projectStrengths: [
      {
        strength: "Prime location and connectivity",
        effect: "Attracts Grade A tenants. Supports rent growth.",
      },
      {
        strength: `${ctx.officeGla.toLocaleString()} sqft office + ${ctx.retailGla.toLocaleString()} sqft retail`,
        effect: "Efficient income stack. Balanced risk profile.",
      },
      {
        strength: "Institutional management",
        effect: "Preserves occupancy. Supports lender confidence.",
      },
      {
        strength: "Structured parking and recoveries",
        effect: "Enhances NOI conversion. Offsets opex inflation.",
      },
    ],
    mainOutcomes: [
      `Project captures ${ctx.city} office recovery and retail podium upside.`,
      "Differentiated mixed-use product mitigates single-sector cyclicality.",
    ],
  };
}

export function buildOfficeRiskFactorsData(
  bundle: FeasibilityProjectBundle
): RiskFactorsData {
  const ctx = getOfficeContext(bundle);
  return {
    marketThreats: [
      {
        risk: "Office market vacancy increase",
        effect: "Could extend lease-up and compress rents.",
        mitigatingFactors: ["Pre-leasing program", "Grade A specification", "Flexible tenant incentives"],
      },
      {
        risk: "Retail tenancy volatility",
        effect: "May affect podium income stability.",
        mitigatingFactors: ["Diversified F&B mix", "Service retail anchors", "Turnover provisions"],
      },
      {
        risk: "Interest rate sensitivity",
        effect: "Higher rates may reduce exit yields.",
        mitigatingFactors: ["Fixed-rate debt", "Conservative LTC", "Scenario stress testing"],
      },
    ],
    projectWeaknesses: [
      {
        weakness: "Blended lease-up execution",
        effect: "Office and retail timing may diverge.",
        mitigatingFactors: ["Phased delivery", "Separate leasing teams", "TI budgets"],
      },
      {
        weakness: "Construction cost risk",
        effect: "Could erode development margin.",
        mitigatingFactors: ["Fixed-price contracts", "Contingency in TDC", "Phased procurement"],
      },
      {
        weakness: "Single-market concentration",
        effect: "Exposes returns to local macro cycles.",
        mitigatingFactors: ["Diversified tenant sectors", "Long WALE", "Institutional sponsorship"],
      },
      {
        weakness: "Opex recovery shortfalls",
        effect: "May compress NOI if recoveries lag.",
        mitigatingFactors: ["Triple-net structures", "Annual true-ups", "Benchmark opex assumptions"],
      },
    ],
  };
}

export function isOfficeDevelopmentAssumptionsData(
  d: unknown
): d is OfficeDevelopmentAssumptionsData {
  return !!d && typeof d === "object" && typeof (d as OfficeDevelopmentAssumptionsData).officeGla === "number";
}

export function isOfficeOperationalRevenuesData(
  d: unknown
): d is OfficeOperationalRevenuesData {
  return !!d && typeof d === "object" && Array.isArray((d as OfficeOperationalRevenuesData).rows);
}

export function isOfficeOperationalExpensesData(
  d: unknown
): d is OfficeOperationalExpensesData {
  return !!d && typeof d === "object" && Array.isArray((d as OfficeOperationalExpensesData).rows);
}

export function isOfficeOperationalPnLData(d: unknown): d is OfficeOperationalPnLData {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as OfficeOperationalPnLData).years) &&
    typeof (d as OfficeOperationalPnLData).revenues === "object"
  );
}
