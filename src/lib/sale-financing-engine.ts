import type { CashOutflows, CashInflows } from "@/store/useFinModelStore";

export interface FinancingConfig {
  // Step 1: Debt sizing (wizard compatibility)
  loanToCostPercent: number; // 0-100
  maxLtvPercent: number; // 0-100

  // Step 4 (wizard): Rate inputs (engine uses `interestRatePct`)
  rateType: "fixed" | "floating";
  baseRateName: string;
  baseRatePercent: number;
  marginPercent: number;
  fixedOrProfitRatePercent: number;

  // Step 2: Land
  landEquityPct: number; // 0-100
  isLandIntegrated: boolean; // Integrate land refinance into main LTC base?

  // Step 3: Debt Settings
  commitmentFeePct: number; // Annual % on undrawn facility
  interestRatePct: number; // Annual % on drawn balance
  idcTreatment: "capitalize" | "current" | "hybrid";
  idcCapitalizedSharePct: number; // 0-100 (only used when idcTreatment === "hybrid")

  // Step 4: Drawdown & Hybrid Logic
  drawdownMode: "30/70" | "gap-fill";
  milestoneThresholdPct: number; // e.g., 30%
  certificationIntervalMonths: number; // Custom: 1, 3, 4, 6, etc.

  // Step 7: Escrow & Sales
  salesRecyclingMode: "immediate" | "trapped";
  escrowReleaseTrigger: "handover" | "topping_out" | "milestone_70"; // When trapped sales release
  financingModel?: "commercial" | "residential";
}

export interface MonthlyFinancing {
  month: number;
  cumulativeCosts: number;
  landRefinanceDrawn: number;
  bankDrawdown: number;
  equityInjection: number;
  salesInflow: number;
  salesRecycled: number;
  escrowBalance: number;
  commitmentFee: number;
  idcAccrued: number;
  interestPaid: number;
  openingDebt: number;
  closingDebt: number;
  ltcPct: number;
  warnings: string[];
}

export interface FinancingResult {
  monthly: MonthlyFinancing[];
  summary: {
    peakDebt: number;
    peakEquity: number;
    totalIdc: number;
    totalCommitmentFee: number;
    finalDebt: number;
    maxLtcPct: number;
    warnings: string[];
  };
}

/**
 * Find the month where S-Curve cumulative percentage crosses the threshold
 */
function findMilestoneMonth(sCurvePcts: number[], thresholdPct: number): number {
  let cumulative = 0;
  for (let m = 1; m <= sCurvePcts.length; m++) {
    cumulative += sCurvePcts[m - 1] || 0;
    if (cumulative >= thresholdPct) return m;
  }
  return sCurvePcts.length; // Fallback to end
}

/** Monthly construction draw (M0..M{constructionPeriod}) from total TDC construction cost. */
function allocateConstructionMonthly(
  totalCost: number,
  constructionPeriod: number
): number[] {
  const allocation = Array(constructionPeriod + 1).fill(0);
  if (totalCost <= 0 || constructionPeriod <= 0) return allocation;

  for (let m = 1; m <= constructionPeriod; m++) {
    const progress = m / constructionPeriod;
    const sCurveValue = 1 / (1 + Math.exp(-12 * (progress - 0.5)));
    const prevProgress = (m - 1) / constructionPeriod;
    const prevSCurveValue = 1 / (1 + Math.exp(-12 * (prevProgress - 0.5)));
    const monthShare = Math.max(0, sCurveValue - prevSCurveValue);
    allocation[m] = totalCost * monthShare;
  }

  return allocation;
}

/**
 * Pure Financing Calculation Engine
 */
export function calculateSaleFinancing(
  cashOutflows: CashOutflows,
  cashInflows: CashInflows,
  config: FinancingConfig,
  constructionPeriod: number
): FinancingResult {
  const totalMonths = constructionPeriod + 12; // +12 for post-completion buffer
  const monthly: MonthlyFinancing[] = [];
  let runningCosts = 0;
  let runningDebt = 0;
  let peakDebt = 0;
  let peakEquity = 0;
  let totalIdc = 0;
  let totalCommitmentFee = 0;
  let maxLtc = 0;
  const allWarnings: string[] = [];
  let escrowBalance = 0;

  // Extract S-Curve percentages from construction cost distribution
  const constructionTotal = cashOutflows.constructionCost || 0;
  const constructionSchedule = allocateConstructionMonthly(
    constructionTotal,
    constructionPeriod
  );
  const sCurvePcts = Array(constructionPeriod)
    .fill(0)
    .map((_, i) => {
      const val = constructionSchedule[i + 1] || 0;
      return constructionTotal > 0 ? (val / constructionTotal) * 100 : 0;
    });

  // Land refinance logic
  const landCost = cashOutflows.landCost || 0;
  const landRefinanceAmount = landCost * (1 - config.landEquityPct / 100);
  let landRefinanceDrawn = false;

  // Find milestone & certification months for hybrid logic
  const estimatedMilestoneMonth = findMilestoneMonth(
    sCurvePcts,
    config.milestoneThresholdPct
  );
  const certMonth =
    Math.ceil(estimatedMilestoneMonth / config.certificationIntervalMonths) *
    config.certificationIntervalMonths;
  const drawdownMonth = Math.max(estimatedMilestoneMonth, certMonth);

  for (let m = 0; m <= totalMonths; m++) {
    const warnings: string[] = [];
    const cumulativeCosts =
      runningCosts + (constructionSchedule[m] || 0) + (m === 0 ? landCost : 0);
    runningCosts = cumulativeCosts;

    // 1. Sales Inflow
    const salesInflow =
      cashInflows.monthlyInflowSchedule?.find((p) => p.month === m)?.amount || 0;

    // 2. Escrow Logic
    if (config.salesRecyclingMode === "trapped") {
      escrowBalance += salesInflow;
      // Release trigger logic (simplified: release at handover = constructionPeriod)
      if (m === constructionPeriod && config.escrowReleaseTrigger === "handover") {
        // Trapped sales become available
      }
    }

    // 3. Equity Requirement & Sales Recycling
    let requiredEquity = Math.max(
      0,
      cumulativeCosts - (config.salesRecyclingMode === "immediate" ? salesInflow : 0)
    );
    const salesRecycled =
      config.salesRecyclingMode === "immediate"
        ? Math.min(salesInflow, requiredEquity)
        : 0;
    requiredEquity = Math.max(0, requiredEquity - salesRecycled);

    // 4. Bank Drawdown Logic
    let bankDrawdown = 0;
    if (config.drawdownMode === "30/70") {
      // Bank draws 70% of costs above equity threshold, only at certification month
      if (m >= drawdownMonth && !landRefinanceDrawn) {
        bankDrawdown = landRefinanceAmount + (cumulativeCosts - landCost) * 0.7;
        landRefinanceDrawn = true;
      }
    } else {
      // Gap-fill: Bank covers anything equity can't
      bankDrawdown = Math.max(0, cumulativeCosts - requiredEquity - salesRecycled);
    }

    // 5. IDC & Interest
    const openingDebt = runningDebt;
    const monthlyRate = config.interestRatePct / 100 / 12;
    const idcAccrued = openingDebt * monthlyRate;
    const capShare =
      config.idcTreatment === "hybrid"
        ? Math.max(0, Math.min(1, (config.idcCapitalizedSharePct || 0) / 100))
        : config.idcTreatment === "capitalize"
          ? 1
          : 0;
    const interestPaid = idcAccrued * (1 - capShare);

    runningDebt += bankDrawdown + idcAccrued * capShare;

    // 6. Commitment Fee (on undrawn portion)
    const committedFacility = Math.max(runningDebt, cumulativeCosts * 0.7); // Simplified LTC target
    const undrawn = Math.max(0, committedFacility - runningDebt);
    const commitmentFee = undrawn * (config.commitmentFeePct / 100 / 12);

    // 7. Track Peaks & Covenants
    peakDebt = Math.max(peakDebt, runningDebt);
    peakEquity = Math.max(peakEquity, requiredEquity);
    totalIdc += idcAccrued;
    totalCommitmentFee += commitmentFee;
    runningDebt = runningDebt - interestPaid; // Adjust if paid

    // LTC Calculation
    const ltcPct = cumulativeCosts > 0 ? (runningDebt / cumulativeCosts) * 100 : 0;
    maxLtc = Math.max(maxLtc, ltcPct);
    if (ltcPct > 75) warnings.push(`M${m}: LTC ${ltcPct.toFixed(1)}% exceeds 75%`);

    monthly.push({
      month: m,
      cumulativeCosts,
      landRefinanceDrawn: m === drawdownMonth ? landRefinanceAmount : 0,
      bankDrawdown,
      equityInjection: requiredEquity,
      salesInflow,
      salesRecycled,
      escrowBalance,
      commitmentFee,
      idcAccrued,
      interestPaid,
      openingDebt,
      closingDebt: runningDebt,
      ltcPct,
      warnings,
    });

    allWarnings.push(...warnings);
  }

  return {
    monthly,
    summary: {
      peakDebt,
      peakEquity,
      totalIdc,
      totalCommitmentFee,
      finalDebt: runningDebt,
      maxLtcPct: maxLtc,
      warnings: allWarnings,
    },
  };
}

