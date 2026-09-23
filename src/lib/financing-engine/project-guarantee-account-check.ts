/**
 * Regression checks for the project guarantee account escrow rule.
 * Run: npx tsx src/lib/financing-engine/project-guarantee-account-check.ts
 */
import {
  generateFinancingCashFlow,
  guaranteeStage3RetentionFunding,
  resolveSaleHorizonLastMonth,
} from "./generate-cash-flow";
import type { FinancingInputs, MonthlyRow } from "./generate-cash-flow";
import { buildFinancingCashFlowExportRows } from "../../app/sale/preview/financing/build-financing-cash-flow-export";
import {
  defaultEscrowRuleForLocation,
  resolveGuaranteeRetentionBasis,
  shouldRenderSaleEscrowSlide,
} from "./escrow-rules";

function assert(cond: boolean, message: string) {
  if (!cond) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("ok:", message);
  }
}

function near(actual: number, expected: number, eps = 0.05) {
  return Math.abs(actual - expected) <= eps;
}

function sumRange(rows: MonthlyRow[], from: number, to: number, pick: (r: MonthlyRow) => number) {
  return rows
    .filter((r) => r.month >= from && r.month <= to)
    .reduce((s, r) => s + pick(r), 0);
}

function baseInputs(overrides: Partial<FinancingInputs> = {}): FinancingInputs {
  const months = 60;
  const zeros = () => Array.from({ length: months }, () => 0);
  return {
    stream: "sale",
    exitStrategy: "sale",
    constructionPeriodMonths: 36,
    sCurveMonthly: zeros(),
    phases: Array.from({ length: months }, () => "Construction"),
    monthlyCosts: { construction: zeros(), soft: zeros(), powc: zeros(), ffe: zeros() },
    landCost: 0,
    monthlySalesInflows: zeros(),
    jurisdiction: "OTHER",
    landEquityPercent: 100,
    landEquityValue: 0,
    cashEquityRequired: 0,
    approvedCreditFacility: 0,
    constructionLoanLtcPct: 0,
    interestRatePct: 0,
    idcTreatment: "capitalize",
    landLoanAmount: 0,
    landLoanRatePct: 0,
    landLoanArrangementFeePct: 0,
    landLoanValuationFeePct: 0,
    prefSharesEnabled: false,
    prefSharesAmount: 0,
    prefSharesReturnPct: 0,
    commitmentFeePct: 0,
    escrowSetupFee: 0,
    escrowManagementFeePct: 0,
    escrowDepositRatePct: 0,
    milestoneMonths: [],
    certificationIntervalMonths: 3,
    hdaDepositPct: 0,
    totalConstructionCosts: 0,
    trustAccountFeePct: 0,
    trustAccountDepositRatePct: 0,
    escrowWithdrawalMode: "project_guarantee_account",
    guaranteeSoftOtherFeesShare: 0,
    guaranteeInterestPermitted: true,
    ...overrides,
  };
}

function mockReplay() {
  const construction = Array.from({ length: 60 }, () => 0);
  const sales = Array.from({ length: 60 }, () => 0);
  construction[6] = 14;
  construction[18] = 28;
  construction[30] = 28;
  sales[6] = 45;
  sales[18] = 55;
  sales[30] = 50;
  const rows = generateFinancingCashFlow(
    baseInputs({
      landCost: 30,
      landEquityPercent: 100,
      landEquityValue: 30,
      monthlyCosts: { construction, soft: Array(60).fill(0), powc: Array(60).fill(0), ffe: Array(60).fill(0) },
      monthlySalesInflows: sales,
    })
  );
  const bal = (m: number) => rows.find((r) => r.month === m)?.escrowBalance ?? NaN;
  assert(near(sumRange(rows, 0, 0, (r) => r.ncf), -30), `Y0 developer net ${sumRange(rows, 0, 0, (r) => r.ncf)} ≈ -30`);
  assert(near(sumRange(rows, 1, 12, (r) => r.ncf), 0), `Y1 developer net ${sumRange(rows, 1, 12, (r) => r.ncf)} ≈ 0`);
  assert(near(sumRange(rows, 13, 24, (r) => r.ncf), 25), `Y2 developer net ${sumRange(rows, 13, 24, (r) => r.ncf)} ≈ 25`);
  assert(near(sumRange(rows, 25, 36, (r) => r.ncf), 47.5), `Y3 developer net ${sumRange(rows, 25, 36, (r) => r.ncf)} ≈ 47.5`);
  assert(near(sumRange(rows, 37, 48, (r) => r.ncf), 7.5), `Y4 developer net ${sumRange(rows, 37, 48, (r) => r.ncf)} ≈ 7.5`);
  const proceedsFunding = guaranteeStage3RetentionFunding(rows);
  assert(
    !!proceedsFunding && near(proceedsFunding.funded, 7.5) && near(proceedsFunding.target, 7.5),
    `proceeds Stage-3 release ${proceedsFunding?.funded} of target ${proceedsFunding?.target}`
  );
  assert(near(bal(0), 0) && near(bal(12), 31) && near(bal(24), 33) && near(bal(36), 7.5) && near(bal(48), 0),
    `balances M0/M12/M24/M36/M48 = ${bal(0)}/${bal(12)}/${bal(24)}/${bal(36)}/${bal(48)}`);
  assert(rows.every((r) => r.escrowBalance >= -1e-6), "no negative escrow balance");
  assert(rows.filter((r) => r.month > 42).every((r) => r.escrowInterest === 0 && r.escrowAccountFees === 0 && r.escrowBalance === 0),
    "no accruals or balance after Stage 3");
  assert(resolveSaleHorizonLastMonth(baseInputs()) === 48, "default horizon CP+12");

  const exported = buildFinancingCashFlowExportRows({
    rows,
    jurisdiction: "OTHER",
    escrowRule: "project_guarantee_account",
  });
  for (const label of [
    "Permitted cost reimbursement",
    "Lender cash sweep",
    "Developer profit withdrawal",
    "Defect retention release",
  ]) {
    const line = exported.find((r) => r[0] === label);
    assert(!!line && line.length === rows.length + 2, `${label} export length ${line?.length} vs horizon ${rows.length}`);
  }
  const reimb = exported.find((r) => r[0] === "Permitted cost reimbursement");
  if (reimb) {
    const parity = rows.every((row, i) => {
      const raw = row.permittedCostReimbursement;
      const expected =
        !Number.isFinite(raw) || raw === 0 ? null : Math.round(raw / 1000);
      return reimb[i + 1] === expected;
    });
    assert(parity, "Excel reimbursement row matches engine values in thousands");
  }
}

function locationDefaults() {
  assert(
    defaultEscrowRuleForLocation({ country: "United Arab Emirates", countryCode: "AE", city: "Abu Dhabi", buildingSubType: "commercial_strata_warehouse" }) === "project_guarantee_account",
    "Abu Dhabi warehouse defaults to project guarantee account"
  );
  assert(
    defaultEscrowRuleForLocation({ country: "UAE", city: "Dubai", buildingSubType: "commercial_landed" }) === "staged",
    "Dubai commercial stays staged"
  );
  assert(
    defaultEscrowRuleForLocation({ country: "UAE", city: "Sharjah", buildingSubType: "residential_high_rise" }) === "none",
    "other emirates stay none"
  );
  assert(shouldRenderSaleEscrowSlide("commercial_strata_warehouse", "project_guarantee_account"), "warehouse + guarantee shows escrow slide");
  assert(!shouldRenderSaleEscrowSlide("commercial_landed", "staged"), "Dubai commercial staged hides escrow slide");
  assert(shouldRenderSaleEscrowSlide("residential_high_rise", "staged"), "residential staged still shows escrow slide");
}

function abuDhabiSuspendsLandLoan() {
  const inputs = baseInputs({
    country: "United Arab Emirates",
    countryCode: "AE",
    city: "Abu Dhabi",
    landCost: 100,
    landEquityPercent: 40,
    landEquityValue: 40,
    landLoanAmount: 60,
    landLoanEnabled: true,
    cashEquityRequired: 20,
  });
  const rows = generateFinancingCashFlow(inputs);
  assert(inputs.landEquityPercent === 40, "Abu Dhabi overlay does not mutate stored land equity %");
  assert(inputs.landLoanAmount === 60, "Abu Dhabi overlay does not mutate stored land loan amount");
  assert(near(sumRange(rows, 0, 60, (r) => r.landLoanDrawdown), 0), "Abu Dhabi land loan draw is 0 while the rule is selected");
  assert(resolveSaleHorizonLastMonth(inputs) === 48, "Abu Dhabi horizon CP+12");
}

function thailandSweepDoesNotTouchLandLoan() {
  const construction = Array.from({ length: 60 }, () => 0);
  const sales = Array.from({ length: 60 }, () => 0);
  construction[4] = 20;
  construction[12] = 40;
  construction[24] = 40;
  sales[4] = 80;
  sales[12] = 100;
  sales[24] = 40;
  const rows = generateFinancingCashFlow(
    baseInputs({
      country: "Thailand",
      countryCode: "TH",
      city: "Bangkok",
      constructionPeriodMonths: 24,
      landCost: 100,
      landEquityPercent: 50,
      landEquityValue: 50,
      landLoanAmount: 50,
      landLoanEnabled: true,
      landLoanRatePct: 0.06,
      approvedCreditFacility: 20,
      interestRatePct: 0.12,
      idcTreatment: "paid-current",
      guaranteeInterestPermitted: false,
      monthlyCosts: { construction, soft: Array(60).fill(0), powc: Array(60).fill(0), ffe: Array(60).fill(0) },
      monthlySalesInflows: sales,
    })
  );
  const sweepRows = rows.filter((r) => r.lenderCashSweep > 0.01);
  assert(sweepRows.length > 0, "Thailand construction loan is swept");
  assert(sweepRows.every((r) => near(r.constLoanRepayment, -r.lenderCashSweep)), "sweep is booked as construction-loan repayment");
  assert(sweepRows.every((r) => r.landLoanRepayment === 0), "sweep months do not repay the land loan");
  assert(sweepRows.every((r) => r.developerProfitWithdrawal > -1e-6), "developer withdrawal is the surplus after the sweep");
  const stage1 = sweepRows[0];
  assert(stage1.lenderCashSweep <= 20 + 0.05, "sweep does not exceed the construction facility");
  assert(near(sumRange(rows, 0, 60, (r) => r.landLoanDrawdown), 50), "land loan still draws");
  const positiveEquityWhileLandOpen = rows.filter((r) => r.month > 0 && r.month < 30 && r.irrCashFlow > 0.01);
  assert(positiveEquityWhileLandOpen.length === 0, "no equity distribution while the land loan is outstanding");
  const afterSweep = rows.find((r) => r.month === stage1.month + 1);
  assert(!!afterSweep && Math.abs(afterSweep.constLoanInterest) < 1e-6, "sweep reduces the following month's construction interest");
}

function retentionEighteen() {
  const construction = Array.from({ length: 80 }, () => 0);
  const sales = Array.from({ length: 80 }, () => 0);
  construction[24] = 100;
  sales[1] = 200;
  const inputs = baseInputs({
    constructionPeriodMonths: 24,
    guaranteeRetentionMonths: 18,
    monthlyCosts: { construction, soft: Array(80).fill(0), powc: Array(80).fill(0), ffe: Array(80).fill(0) },
    monthlySalesInflows: sales,
  });
  assert(resolveSaleHorizonLastMonth(inputs) === 42, "retention 18 → horizon CP+18");
  const rows = generateFinancingCashFlow(inputs);
  assert(rows[rows.length - 1]?.month === 42, `last modeled month is ${rows[rows.length - 1]?.month}`);
  const releaseMonths = rows.filter((r) => r.defectRetentionRelease > 0.01).map((r) => r.month);
  assert(releaseMonths.length === 1 && releaseMonths[0] === 42, `Stage 3 release months ${releaseMonths.join(",")}`);
}

function otherFeesExcludedAndClosedAccount() {
  const construction = Array.from({ length: 50 }, () => 0);
  const soft = Array.from({ length: 50 }, () => 0);
  const sales = Array.from({ length: 50 }, () => 0);
  construction[12] = 10;
  soft[0] = 30;
  sales[1] = 100;
  sales[30] = 15;
  const rows = generateFinancingCashFlow(
    baseInputs({
      constructionPeriodMonths: 24,
      escrowDepositRatePct: 0.12,
      escrowManagementFeePct: 0.012,
      guaranteeSoftOtherFeesShare: 1,
      monthlyCosts: { construction, soft, powc: Array(50).fill(0), ffe: Array(50).fill(0) },
      monthlySalesInflows: sales,
    })
  );
  const reimbursed = sumRange(rows, 0, 49, (r) => r.permittedCostReimbursement);
  assert(near(reimbursed, 10), `Other Fees excluded from reimbursement (got ${reimbursed})`);
  assert(
    rows.filter((r) => r.month > 24).every((r) => r.escrowBalance === 0 && r.escrowInterest === 0 && r.escrowAccountFees === 0),
    "no balance or accruals after Stage 3"
  );
  const pass = rows.find((r) => r.month === 30);
  assert(!!pass && near(pass.developerProfitWithdrawal, 15) && pass.escrowBalance === 0, "post-closure sales pass through");
  for (const label of ["permittedCostReimbursement", "lenderCashSweep", "developerProfitWithdrawal", "defectRetentionRelease"] as const) {
    assert(rows.length === resolveSaleHorizonLastMonth(baseInputs({ constructionPeriodMonths: 24 })) + 1, `${label} series length matches horizon`);
  }
}

function aedSeries() {
  const construction = Array.from({ length: 60 }, () => 0);
  const sales = Array.from({ length: 60 }, () => 0);
  construction[6] = 14;
  construction[18] = 28;
  construction[30] = 28;
  sales[6] = 45;
  sales[18] = 55;
  sales[30] = 50;
  return { construction, sales };
}

function constructionCostBasisStage3() {
  const { construction, sales } = aedSeries();
  const zeros = Array(60).fill(0);
  const rows = generateFinancingCashFlow(
    baseInputs({
      landCost: 30,
      landEquityPercent: 100,
      landEquityValue: 30,
      guaranteeRetentionBasis: "construction_cost",
      monthlyCosts: { construction, soft: zeros, powc: zeros, ffe: zeros },
      monthlySalesInflows: sales,
    })
  );
  const funding = guaranteeStage3RetentionFunding(rows);
  assert(
    !!funding && near(funding.funded, 3.5) && near(funding.target, 3.5),
    `construction-cost Stage-3 release ${funding?.funded} of target ${funding?.target}`
  );
  assert(rows.every((r) => r.escrowBalance >= -1e-6), "construction-cost basis: no negative balance");
  const horizon = resolveSaleHorizonLastMonth(baseInputs({ guaranteeRetentionBasis: "construction_cost" }));
  assert(rows.length === horizon + 1, `construction-cost rows ${rows.length} vs horizon ${horizon}`);
  for (const label of ["permittedCostReimbursement", "lenderCashSweep", "developerProfitWithdrawal", "defectRetentionRelease"] as const) {
    assert(rows.length === horizon + 1, `${label} stays horizon-aligned on construction-cost basis`);
  }
}

function retentionBasisDefaults() {
  assert(
    resolveGuaranteeRetentionBasis(undefined, { country: "United Arab Emirates", countryCode: "AE", city: "Abu Dhabi" }) === "construction_cost",
    "Abu Dhabi defaults retention basis to construction cost"
  );
  assert(
    resolveGuaranteeRetentionBasis(undefined, { country: "Thailand", city: "Bangkok" }) === "escrow_proceeds",
    "Others default retention basis to escrow proceeds"
  );
  assert(
    resolveGuaranteeRetentionBasis("escrow_proceeds", { country: "United Arab Emirates", city: "Abu Dhabi" }) === "escrow_proceeds",
    "stored escrow-proceeds basis wins in Abu Dhabi"
  );
  const { construction, sales } = aedSeries();
  const zeros = Array(60).fill(0);
  const abuDhabi = generateFinancingCashFlow(
    baseInputs({
      country: "United Arab Emirates",
      countryCode: "AE",
      city: "Abu Dhabi",
      landCost: 30,
      landEquityPercent: 100,
      landEquityValue: 30,
      monthlyCosts: { construction, soft: zeros, powc: zeros, ffe: zeros },
      monthlySalesInflows: sales,
    })
  );
  const adFunding = guaranteeStage3RetentionFunding(abuDhabi);
  assert(!!adFunding && near(adFunding.funded, 3.5), `Abu Dhabi omitted basis releases ${adFunding?.funded}`);
  const thailand = generateFinancingCashFlow(
    baseInputs({
      country: "Thailand",
      city: "Bangkok",
      landCost: 30,
      landEquityPercent: 100,
      landEquityValue: 30,
      monthlyCosts: { construction, soft: zeros, powc: zeros, ffe: zeros },
      monthlySalesInflows: sales,
    })
  );
  const thFunding = guaranteeStage3RetentionFunding(thailand);
  assert(
    !!thFunding && near(thFunding.funded, 7.5) && near(sumRange(thailand, 13, 24, (r) => r.ncf), 25) && near(sumRange(thailand, 25, 36, (r) => r.ncf), 47.5),
    `Thailand omitted basis keeps proceeds nets (stage3 ${thFunding?.funded})`
  );
}

function moscowTopsUpBeforeDeveloperRelease() {
  const construction = Array.from({ length: 40 }, () => 0);
  const sales = Array.from({ length: 40 }, () => 0);
  construction[12] = 100;
  sales[12] = 100;
  sales[18] = 4;
  sales[20] = 10;
  const zeros = Array(40).fill(0);
  const rows = generateFinancingCashFlow(
    baseInputs({
      constructionPeriodMonths: 12,
      guaranteeRetentionBasis: "construction_cost",
      monthlyCosts: { construction, soft: zeros, powc: zeros, ffe: zeros },
      monthlySalesInflows: sales,
    })
  );
  const m18 = rows.find((r) => r.month === 18);
  const m20 = rows.find((r) => r.month === 20);
  assert(!!m18 && near(m18.developerProfitWithdrawal, 0) && near(m18.escrowBalance, 4),
    `M18 holds the thin collection (withdrawal ${m18?.developerProfitWithdrawal}, balance ${m18?.escrowBalance})`);
  assert(!!m20 && near(m20.developerProfitWithdrawal, 9) && near(m20.escrowBalance, 5),
    `M20 releases only the excess above the target (withdrawal ${m20?.developerProfitWithdrawal}, balance ${m20?.escrowBalance})`);
  assert(rows.every((r) => r.escrowBalance >= -1e-6), "moscow: no negative balance");
  const shortSales = Array.from({ length: 40 }, () => 0);
  shortSales[12] = 100;
  shortSales[18] = 4;
  const shortRows = generateFinancingCashFlow(
    baseInputs({
      constructionPeriodMonths: 12,
      guaranteeRetentionBasis: "construction_cost",
      monthlyCosts: { construction, soft: zeros, powc: zeros, ffe: zeros },
      monthlySalesInflows: shortSales,
    })
  );
  const shortfall = guaranteeStage3RetentionFunding(shortRows);
  assert(
    !!shortfall && near(shortfall.funded, 4) && near(shortfall.target, 5),
    `short Stage-3 funded ${shortfall?.funded} of target ${shortfall?.target}`
  );
  assert(shortRows.every((r) => r.escrowBalance >= -1e-6), "shortfall case: no negative balance");
  assert(shortRows.length === resolveSaleHorizonLastMonth(baseInputs({ constructionPeriodMonths: 12 })) + 1, "shortfall rows match horizon");
}

mockReplay();
constructionCostBasisStage3();
retentionBasisDefaults();
moscowTopsUpBeforeDeveloperRelease();
locationDefaults();
abuDhabiSuspendsLandLoan();
thailandSweepDoesNotTouchLandLoan();
retentionEighteen();
otherFeesExcludedAndClosedAccount();

if (process.exitCode) {
  console.error("project guarantee account checks failed");
} else {
  console.log("all project guarantee account checks passed");
}
