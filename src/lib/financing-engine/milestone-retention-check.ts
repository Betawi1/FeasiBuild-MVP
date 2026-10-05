/**
 * Regression checks for the milestone & retention escrow rule.
 * Run: npx tsx src/lib/financing-engine/milestone-retention-check.ts
 */
import {
  generateFinancingCashFlow,
  resolveSaleHorizonLastMonth,
} from "./generate-cash-flow";
import type { FinancingInputs, MonthlyRow } from "./generate-cash-flow";
import { buildFinancingCashFlowExportRows } from "../../app/sale/preview/financing/build-financing-cash-flow-export";
import {
  defaultEscrowRuleForLocation,
  fillUndefinedMilestoneEscrow,
  isMilestoneCertMonth,
  readMilestoneEscrowForPersist,
  resolveMilestoneCompletionRetentionPercent,
  resolveMilestoneSweepEnabled,
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
  const months = 80;
  const zeros = () => Array.from({ length: months }, () => 0);
  return {
    stream: "sale",
    exitStrategy: "sale",
    constructionPeriodMonths: 12,
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
    escrowWithdrawalMode: "milestone_retention",
    guaranteeSoftOtherFeesShare: 0,
    milestonePermitLandAndFinancing: true,
    milestoneSweepEnabled: true,
    ...overrides,
  };
}

function floorAndDlpHold() {
  const construction = Array.from({ length: 80 }, () => 0);
  const sales = Array.from({ length: 80 }, () => 0);
  construction[6] = 400_000;
  construction[12] = 100_000;
  sales[1] = 200_000;
  const inputs = baseInputs({
    country: "Saudi Arabia",
    countryCode: "SA",
    city: "Riyadh",
    milestoneCompletionRetentionPercent: 10,
    monthlyCosts: {
      construction,
      soft: Array(80).fill(0),
      powc: Array(80).fill(0),
      ffe: Array(80).fill(0),
    },
    monthlySalesInflows: sales,
  });
  assert(
    defaultEscrowRuleForLocation({
      country: "Saudi Arabia",
      countryCode: "SA",
      city: "Riyadh",
      buildingSubType: "commercial_strata_warehouse",
    }) === "milestone_retention",
    "KSA warehouse defaults to milestone retention"
  );
  assert(
    defaultEscrowRuleForLocation({
      country: "Saudi Arabia",
      buildingSubType: "residential_high_rise",
    }) === "milestone_retention",
    "KSA residential defaults to milestone retention"
  );
  assert(
    resolveMilestoneCompletionRetentionPercent(10, { country: "Saudi Arabia", countryCode: "SA" }) === 20,
    "KSA locks the completion floor at 20 even when 10 is stored"
  );
  assert(resolveMilestoneSweepEnabled(false, { countryCode: "SA" }) === true, "KSA locks the sweep on");
  assert(resolveSaleHorizonLastMonth(inputs) === 24, "KSA horizon is CP+12");
  assert(
    shouldRenderSaleEscrowSlide("commercial_strata_warehouse", "milestone_retention"),
    "warehouse + milestone retention shows the escrow slide"
  );
  assert(
    shouldRenderSaleEscrowSlide("residential_landed", "none"),
    "residential still shows the escrow slide"
  );

  const rows = generateFinancingCashFlow(inputs);
  assert(inputs.milestoneCompletionRetentionPercent === 10, "engine does not rewrite the stored floor percent");
  const preCompletion = rows.filter((r) => r.month < 12 && r.month > 0);
  const floorHolds = preCompletion.every((r) => {
    const cum = sumRange(rows, 0, r.month, (row) => row.salesProceeds);
    return r.escrowBalance + 1e-4 >= 0.2 * cum;
  });
  assert(floorHolds, "pre-completion balance stays at or above 20% of cumulative collections");
  const m7 = rows.find((r) => r.month === 7);
  assert(!!m7 && near(m7.escrowBalance, 40_000) && near(m7.certifiedMilestoneWithdrawal, 160_000),
    `M7 floor binds at 40,000 (balance ${m7?.escrowBalance}, withdrawal ${m7?.certifiedMilestoneWithdrawal})`);
  const m12 = rows.find((r) => r.month === 12);
  assert(!!m12 && near(m12.escrowBalance, 25_000), `completion balance equals the 5% hold (${m12?.escrowBalance})`);
  const releases = rows.filter((r) => r.dlpRetentionRelease > 0.01);
  assert(
    releases.length === 1 && releases[0].month === 24 && near(releases[0].dlpRetentionRelease, 25_000),
    `DLP release at CP+12 is ${releases.map((r) => `M${r.month}:${r.dlpRetentionRelease}`).join(",")}`
  );
  assert(rows.every((r) => r.escrowBalance >= -1e-6), "no negative escrow balance");
  assert(
    rows.filter((r) => r.month > 24).every((r) => r.escrowBalance === 0 && r.escrowInterest === 0 && r.escrowAccountFees === 0),
    "no accruals after closure"
  );
  assert(near(sumRange(rows, 0, 24, (r) => r.escrowDeposit), 200_000), "100% of sales enter escrow before closure");
  assert(rows.length === resolveSaleHorizonLastMonth(inputs) + 1, "row length matches the horizon");

  const exported = buildFinancingCashFlowExportRows({
    rows,
    jurisdiction: "OTHER",
    escrowRule: "milestone_retention",
  });
  for (const label of [
    "Escrow account balance",
    "Escrow interest income",
    "Escrow account fees",
    "Certified milestone withdrawal",
    "Lender cash sweep",
    "Developer withdrawal",
    "DLP retention release",
  ]) {
    const line = exported.find((r) => r[0] === label);
    assert(!!line && line.length === rows.length + 2, `${label} export length ${line?.length} vs horizon ${rows.length}`);
  }
  const certified = exported.find((r) => r[0] === "Certified milestone withdrawal");
  if (certified) {
    const parity = rows.every((row, i) => {
      const raw = row.certifiedMilestoneWithdrawal;
      const expected = !Number.isFinite(raw) || raw === 0 ? null : Math.round(raw / 1000);
      return certified[i + 1] === expected;
    });
    assert(parity, "Excel certified-withdrawal row matches engine values in thousands");
  }
  const release = exported.find((r) => r[0] === "DLP retention release");
  assert(release?.[25] === 25, `Excel DLP release at M24 is ${release?.[25]}`);
}

function ksaSuspendsLandLoanAndSwitchRestoresIt() {
  const inputs = baseInputs({
    country: "Saudi Arabia",
    countryCode: "SA",
    city: "Jeddah",
    landCost: 100,
    landEquityPercent: 40,
    landEquityValue: 40,
    landLoanAmount: 60,
    landLoanEnabled: true,
    cashEquityRequired: 20,
  });
  const rows = generateFinancingCashFlow(inputs);
  assert(inputs.landEquityPercent === 40, "KSA overlay does not mutate stored land equity %");
  assert(inputs.landLoanAmount === 60, "KSA overlay does not mutate stored land loan amount");
  assert(near(sumRange(rows, 0, 40, (r) => r.landLoanDrawdown), 0), "KSA land loan draw is 0 while the rule is selected");
  const restored = generateFinancingCashFlow({
    ...inputs,
    escrowWithdrawalMode: "staged",
  });
  assert(inputs.landEquityPercent === 40 && inputs.landLoanAmount === 60, "switching rules leaves the stored land inputs in place");
  assert(near(sumRange(restored, 0, 40, (r) => r.landLoanDrawdown), 60), "staged rule on the same inputs draws the stored land loan");
}

function thailandOptIn() {
  assert(
    defaultEscrowRuleForLocation({
      country: "Thailand",
      countryCode: "TH",
      city: "Bangkok",
      buildingSubType: "residential_high_rise",
    }) === "none",
    "Thailand stays on no escrow until the user opts in"
  );
  assert(
    resolveMilestoneCompletionRetentionPercent(10, { country: "Thailand", countryCode: "TH" }) === 10,
    "Thailand can edit the completion floor to 10%"
  );
  assert(
    resolveMilestoneSweepEnabled(false, { country: "Thailand" }) === false,
    "Thailand can turn the sweep off"
  );
  const construction = Array.from({ length: 80 }, () => 0);
  const sales = Array.from({ length: 80 }, () => 0);
  construction[6] = 400_000;
  construction[12] = 100_000;
  sales[1] = 200_000;
  const rows = generateFinancingCashFlow(
    baseInputs({
      country: "Thailand",
      countryCode: "TH",
      city: "Bangkok",
      landCost: 100,
      landEquityPercent: 50,
      landEquityValue: 50,
      landLoanAmount: 50,
      landLoanEnabled: true,
      milestoneCompletionRetentionPercent: 10,
      milestonePermitLandAndFinancing: true,
      monthlyCosts: {
        construction,
        soft: Array(80).fill(0),
        powc: Array(80).fill(0),
        ffe: Array(80).fill(0),
      },
      monthlySalesInflows: sales,
    })
  );
  const m7 = rows.find((r) => r.month === 7);
  assert(!!m7 && near(m7.escrowBalance, 20_000), `Thailand 10% floor leaves ${m7?.escrowBalance}`);
  assert(near(sumRange(rows, 0, 40, (r) => r.landLoanDrawdown), 50), "Thailand land loan still draws");
}

function sweepAndLandLoan() {
  const construction = Array.from({ length: 80 }, () => 0);
  const sales = Array.from({ length: 80 }, () => 0);
  construction[4] = 80;
  construction[12] = 1;
  sales[5] = 200;
  const shared = {
    country: "Thailand",
    countryCode: "TH",
    city: "Bangkok",
    landCost: 100,
    landEquityPercent: 50,
    landEquityValue: 50,
    landLoanAmount: 50,
    landLoanEnabled: true,
    landLoanRatePct: 0,
    approvedCreditFacility: 40,
    interestRatePct: 0,
    cashEquityRequired: 0,
    monthlyCosts: {
      construction,
      soft: Array(80).fill(0),
      powc: Array(80).fill(0),
      ffe: Array(80).fill(0),
    },
    monthlySalesInflows: sales,
  };
  const swept = generateFinancingCashFlow(baseInputs({ ...shared, milestoneSweepEnabled: true }));
  const sweepRows = swept.filter((r) => r.lenderCashSweep > 0.01);
  assert(sweepRows.length > 0, "sweep on repays the construction loan from escrow");
  assert(
    sweepRows.every((r) => near(r.constLoanRepayment, -r.lenderCashSweep)),
    "sweep is booked as construction-loan repayment"
  );
  assert(sweepRows.every((r) => r.landLoanRepayment === 0), "sweep months do not repay the land loan");
  assert(near(sumRange(swept, 0, 40, (r) => r.landLoanDrawdown), 50), "land loan still draws while the construction loan is swept");
  const off = generateFinancingCashFlow(baseInputs({ ...shared, milestoneSweepEnabled: false }));
  assert(off.every((r) => r.lenderCashSweep === 0), "sweep off leaves lender cash sweep at zero");
  assert(near(sumRange(off, 0, 40, (r) => r.landLoanDrawdown), 50), "sweep off still draws the land loan");
}

function bankGuarantee() {
  const construction = Array.from({ length: 80 }, () => 0);
  const sales = Array.from({ length: 80 }, () => 0);
  construction[6] = 400_000;
  construction[12] = 100_000;
  sales[1] = 200_000;
  const rows = generateFinancingCashFlow(
    baseInputs({
      country: "Thailand",
      countryCode: "TH",
      milestoneDlpForm: "bank_guarantee",
      monthlyCosts: {
        construction,
        soft: Array(80).fill(0),
        powc: Array(80).fill(0),
        ffe: Array(80).fill(0),
      },
      monthlySalesInflows: sales,
    })
  );
  const m12 = rows.find((r) => r.month === 12);
  assert(!!m12 && near(m12.dlpBankGuaranteeMemo, 25_000) && near(m12.escrowBalance, 0),
    `bank guarantee memo ${m12?.dlpBankGuaranteeMemo}, completion balance ${m12?.escrowBalance}`);
  assert(rows.every((r) => r.dlpRetentionRelease === 0), "bank guarantee DLP release is 0");
  const exported = buildFinancingCashFlowExportRows({
    rows,
    jurisdiction: "OTHER",
    escrowRule: "milestone_retention",
  });
  const memo = exported.find((r) => r[0] === "DLP secured by bank guarantee (no cash retained)");
  assert(!!memo && memo.length === rows.length + 2, "bank-guarantee memo row is exported on the horizon");
  assert(memo?.[13] === 25, `memo at completion exports ${memo?.[13]}`);
}

function otherFeesAndClosure() {
  const construction = Array.from({ length: 80 }, () => 0);
  const soft = Array.from({ length: 80 }, () => 0);
  const sales = Array.from({ length: 80 }, () => 0);
  construction[6] = 100;
  soft[1] = 30;
  sales[1] = 100;
  sales[20] = 15;
  const inputs = baseInputs({
    constructionPeriodMonths: 12,
    guaranteeSoftOtherFeesShare: 1,
    monthlyCosts: { construction, soft, powc: Array(80).fill(0), ffe: Array(80).fill(0) },
    monthlySalesInflows: sales,
  });
  // Last construction month is 6, so closure is M18 and the horizon still runs to CP+12.
  assert(resolveSaleHorizonLastMonth(inputs) === 24, "early completion still keeps a CP+12 horizon");
  const rows = generateFinancingCashFlow(inputs);
  const reimbursed =
    sumRange(rows, 0, 24, (r) => r.certifiedMilestoneWithdrawal) +
    sumRange(rows, 0, 18, (r) => r.milestoneDeveloperWithdrawal);
  assert(reimbursed <= 100 + 0.05, `Other Fees stay out of the entitlement (withdrew ${reimbursed})`);
  const pass = rows.find((r) => r.month === 20);
  assert(
    !!pass && near(pass.milestoneDeveloperWithdrawal, 15) && pass.escrowBalance === 0 && pass.escrowInterest === 0 && pass.escrowAccountFees === 0,
    "post-closure sales pass through with no accrual"
  );
  assert(rows.length === 25, `rows ${rows.length} stay on the CP+12 horizon`);
}

function otherLocationsUnchanged() {
  assert(
    defaultEscrowRuleForLocation({ country: "United Arab Emirates", countryCode: "AE", city: "Abu Dhabi", buildingSubType: "residential_high_rise" }) === "project_guarantee_account",
    "Abu Dhabi stays on the project guarantee account"
  );
  assert(
    defaultEscrowRuleForLocation({ country: "UAE", city: "Dubai", buildingSubType: "commercial_landed" }) === "staged",
    "Dubai stays staged"
  );
  assert(
    defaultEscrowRuleForLocation({ country: "India", countryCode: "IN", buildingSubType: "commercial_strata_warehouse" }) === "proportionate_escrow",
    "India stays proportionate"
  );
}

function ledgerSignature(rows: MonthlyRow[]) {
  return JSON.stringify(
    rows.map((r) => [
      r.certifiedMilestoneWithdrawal,
      r.milestoneDeveloperWithdrawal,
      r.lenderCashSweep,
      r.dlpRetentionRelease,
      r.escrowBalance,
      r.escrowInterest,
      r.escrowAccountFees,
      r.escrowDeposit,
    ])
  );
}

function floorScenario(extra: Partial<FinancingInputs> = {}) {
  const construction = Array.from({ length: 80 }, () => 0);
  const sales = Array.from({ length: 80 }, () => 0);
  construction[6] = 400_000;
  construction[12] = 100_000;
  sales[1] = 200_000;
  return baseInputs({
    country: "Saudi Arabia",
    countryCode: "SA",
    city: "Riyadh",
    milestoneCompletionRetentionPercent: 10,
    monthlyCosts: {
      construction,
      soft: Array(80).fill(0),
      powc: Array(80).fill(0),
      ffe: Array(80).fill(0),
    },
    monthlySalesInflows: sales,
    ...extra,
  });
}

function certFrequency() {
  const omitted = generateFinancingCashFlow(floorScenario());
  const monthly = generateFinancingCashFlow(
    floorScenario({ milestoneCertFrequency: "monthly" })
  );
  assert(
    ledgerSignature(omitted) === ledgerSignature(monthly),
    "explicit monthly matches an omitted frequency"
  );
  assert(
    !!monthly[7] && near(monthly[7].certifiedMilestoneWithdrawal, 160_000),
    "monthly still withdraws the month-6 cost at M7"
  );

  const quarterly = generateFinancingCashFlow(
    floorScenario({ milestoneCertFrequency: "quarterly" })
  );
  const payMonths = new Set(
    quarterly.filter((r) => isMilestoneCertMonth(r.month - 1, "quarterly")).map((r) => r.month)
  );
  assert(
    [3, 6, 9, 12, 15, 18, 21, 24].every((m) => payMonths.has(m)),
    "quarterly pay months include M3, M6, M9, M12, …"
  );
  const offCadence = quarterly.filter(
    (r) => r.month > 0 && r.month <= 24 && !payMonths.has(r.month)
  );
  assert(
    offCadence.every(
      (r) =>
        r.certifiedMilestoneWithdrawal === 0 &&
        r.milestoneDeveloperWithdrawal === 0 &&
        r.lenderCashSweep === 0
    ),
    "non-withdrawal months keep the withdrawal rows at 0"
  );
  assert(
    offCadence.every((r) => r.escrowDeposit >= 0 && r.escrowBalance >= 0),
    "non-withdrawal months still carry the escrow balance"
  );
  const m9 = quarterly.find((r) => r.month === 9);
  assert(
    !!m9 && near(m9.certifiedMilestoneWithdrawal, 160_000) && near(m9.escrowBalance, 40_000),
    `quarterly M9 withdraws down to the 20% floor (${m9?.escrowBalance})`
  );
  let cum = 0;
  let floorHolds = true;
  for (const row of quarterly) {
    if (row.month >= 12) break;
    cum += Math.max(0, row.salesProceeds || 0);
    if (row.escrowBalance + 1e-6 < 0.2 * cum) floorHolds = false;
  }
  assert(floorHolds, "quarterly pre-completion balance stays at or above 20% of cumulative collections");
  const m12 = quarterly.find((r) => r.month === 12);
  const m24 = quarterly.find((r) => r.month === 24);
  assert(
    !!m12 && near(m12.escrowBalance, 25_000),
    `quarterly completion balance equals the 5% hold (${m12?.escrowBalance})`
  );
  assert(
    !!m24 && near(m24.dlpRetentionRelease, 25_000) && near(m24.escrowBalance, 0),
    `quarterly DLP release lands at CP+12 (${m24?.dlpRetentionRelease})`
  );

  const exported = buildFinancingCashFlowExportRows({
    rows: quarterly,
    jurisdiction: "OTHER",
    escrowRule: "milestone_retention",
  });
  const certified = exported.find((r) => r[0] === "Certified milestone withdrawal");
  const developer = exported.find((r) => r[0] === "Developer withdrawal");
  const release = exported.find((r) => r[0] === "DLP retention release");
  assert(certified?.[10] === 160, `Excel certified withdrawal at M9 is ${certified?.[10]}`);
  assert(developer?.[13] === 15, `Excel developer withdrawal at M12 is ${developer?.[13]}`);
  assert(release?.[25] === 25, `Excel DLP release at M24 is ${release?.[25]}`);
  const excelMatchesCadence =
    !!certified &&
    quarterly.every((row, i) => {
      const cell = certified[i + 1];
      const raw = row.certifiedMilestoneWithdrawal;
      const expected = !Number.isFinite(raw) || raw === 0 ? null : Math.round(raw / 1000);
      const onPay = payMonths.has(row.month);
      return cell === expected && (cell == null || onPay);
    });
  assert(excelMatchesCadence, "Excel certified-withdrawal cadence matches the quarterly preview");

  const thaiConstruction = Array.from({ length: 80 }, () => 0);
  const thaiSales = Array.from({ length: 80 }, () => 0);
  thaiConstruction[6] = 400_000;
  thaiConstruction[12] = 100_000;
  thaiSales[1] = 200_000;
  const thai = generateFinancingCashFlow(
    baseInputs({
      country: "Thailand",
      countryCode: "TH",
      city: "Bangkok",
      landCost: 100,
      landEquityPercent: 50,
      landEquityValue: 50,
      landLoanAmount: 50,
      landLoanEnabled: true,
      milestoneCompletionRetentionPercent: 10,
      milestoneCertFrequency: "quarterly",
      monthlyCosts: {
        construction: thaiConstruction,
        soft: Array(80).fill(0),
        powc: Array(80).fill(0),
        ffe: Array(80).fill(0),
      },
      monthlySalesInflows: thaiSales,
    })
  );
  const thaiM9 = thai.find((r) => r.month === 9);
  assert(
    resolveMilestoneCompletionRetentionPercent(10, { country: "Thailand", countryCode: "TH" }) === 10,
    "Thailand quarterly keeps an editable 10% floor"
  );
  assert(
    !!thaiM9 && near(thaiM9.escrowBalance, 20_000),
    `Thailand quarterly 10% floor leaves ${thaiM9?.escrowBalance}`
  );
  assert(near(sumRange(thai, 0, 40, (r) => r.landLoanDrawdown), 50), "Thailand quarterly still draws the land loan");

  const kept = fillUndefinedMilestoneEscrow({
    milestoneCertFrequency: "quarterly",
    milestoneCompletionRetentionPercent: 15,
    milestoneDlpRetentionPercent: 7,
    milestoneDlpRetentionMonths: 18,
    milestoneDlpForm: "bank_guarantee",
    milestonePermitLandAndFinancing: false,
    milestoneSweepEnabled: false,
  });
  assert(kept.milestoneCertFrequency === "quarterly", "load keeps a stored quarterly frequency");
  assert(kept.milestoneCompletionRetentionPercent === 15, "load keeps the stored completion floor");
  assert(kept.milestoneDlpRetentionPercent === 7, "load keeps the stored DLP percent");
  assert(kept.milestoneDlpRetentionMonths === 18, "load keeps the stored DLP months");
  assert(kept.milestoneDlpForm === "bank_guarantee", "load keeps the stored DLP form");
  assert(kept.milestonePermitLandAndFinancing === false, "load keeps permit-land turned off");
  assert(kept.milestoneSweepEnabled === false, "load keeps the sweep turned off");
  const filled = fillUndefinedMilestoneEscrow(undefined);
  assert(filled.milestoneCertFrequency === "monthly", "a missing frequency loads as monthly");

  const warns: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warns.push(args.map(String).join(" "));
  };
  const persisted = readMilestoneEscrowForPersist(
    {
      milestoneCertFrequency: "quarterly",
      milestoneDlpRetentionPercent: 7,
      milestoneDlpRetentionMonths: 18,
      milestoneDlpForm: "bank_guarantee",
      milestonePermitLandAndFinancing: false,
      milestoneSweepEnabled: false,
      milestoneCompletionRetentionPercent: 15,
    },
    {
      milestoneCertFrequency: "monthly",
      milestoneCompletionRetentionPercent: 20,
      milestoneDlpRetentionPercent: 5,
      milestoneDlpRetentionMonths: 12,
      milestoneDlpForm: "cash",
      milestonePermitLandAndFinancing: true,
      milestoneSweepEnabled: true,
    }
  );
  console.warn = originalWarn;
  assert(persisted.milestoneCertFrequency === "quarterly", "persist keeps stored quarterly over a monthly fallback");
  assert(persisted.milestoneDlpRetentionPercent === 7, "persist keeps the stored DLP percent");
  assert(persisted.milestoneDlpForm === "bank_guarantee", "persist keeps the stored DLP form");
  assert(persisted.milestonePermitLandAndFinancing === false, "persist keeps permit-land off");
  assert(persisted.milestoneSweepEnabled === false, "persist keeps the sweep off");
  assert(
    warns.some((line) => line.includes("milestoneCertFrequency")),
    "persist warns when a fallback would replace the stored frequency"
  );
}

floorAndDlpHold();
ksaSuspendsLandLoanAndSwitchRestoresIt();
thailandOptIn();
sweepAndLandLoan();
bankGuarantee();
otherFeesAndClosure();
otherLocationsUnchanged();
certFrequency();

if (process.exitCode) {
  console.error("milestone retention checks failed");
} else {
  console.log("all milestone retention checks passed");
}
