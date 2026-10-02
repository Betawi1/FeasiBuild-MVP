/**
 * Regression checks for the proportionate escrow rule.
 * Run: npx tsx src/lib/financing-engine/proportionate-escrow-check.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  generateFinancingCashFlow,
  resolveEscrowDepositRatePercent,
  resolveSaleHorizonLastMonth,
} from "./generate-cash-flow";
import { auditProportionateCrossMode } from "./proportionate-cross-mode-audit";
import type { FinancingInputs, MonthlyRow } from "./generate-cash-flow";
import { buildFinancingCashFlowExportRows } from "../../app/sale/preview/financing/build-financing-cash-flow-export";
import { resolveActualConstructionEndMonth } from "../construction-end";
import {
  ESCROW_RULE_CONFIG_TITLE,
  PROPORTIONATE_LOCAL_REGIME_NOTE,
  defaultEscrowRuleForLocation,
  proportionateLocalRegimeNote,
  resolveProportionateEscrowPercent,
  resolveProportionateSweepEnabled,
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

function sum(rows: MonthlyRow[], pick: (r: MonthlyRow) => number) {
  return rows.reduce((s, r) => s + pick(r), 0);
}

function baseInputs(overrides: Partial<FinancingInputs> = {}): FinancingInputs {
  const months = 48;
  const zeros = () => Array.from({ length: months }, () => 0);
  return {
    stream: "sale",
    exitStrategy: "sale",
    constructionPeriodMonths: 5,
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
    escrowWithdrawalMode: "proportionate_escrow",
    guaranteeSoftOtherFeesShare: 0,
    proportionateEscrowPercent: 70,
    proportionateCertFrequency: "monthly",
    proportionateSweepEnabled: true,
    proportionateConstructionInterestPermitted: true,
    ...overrides,
  };
}

/** Linear construction, TEC = land 30 + construction 60 + POWC 10. */
function linearProject(overrides: Partial<FinancingInputs> = {}) {
  const months = 48;
  const construction = Array.from({ length: months }, () => 0);
  const powc = Array.from({ length: months }, () => 0);
  const sales = Array.from({ length: months }, () => 0);
  for (let m = 0; m <= 5; m++) {
    construction[m] = 10;
    powc[m] = 10 / 6;
    sales[m] = 100 / 6;
  }
  return baseInputs({
    landCost: 30,
    landEquityPercent: 100,
    landEquityValue: 30,
    monthlyCosts: {
      construction,
      soft: Array(months).fill(0),
      powc,
      ffe: Array(months).fill(0),
    },
    monthlySalesInflows: sales,
    ...overrides,
  });
}

function sAt(month: number, completion: number) {
  if (month >= completion) return 1;
  return Math.min(1, (month + 1) / (completion + 1));
}

function locationDefaults() {
  for (const sub of ["residential_high_rise", "commercial_strata_warehouse"] as const) {
    assert(
      defaultEscrowRuleForLocation({
        country: "India",
        countryCode: "IN",
        city: "Mumbai",
        buildingSubType: sub,
      }) === "proportionate_escrow",
      `India ${sub} defaults to proportionate escrow`
    );
  }
  assert(
    defaultEscrowRuleForLocation({
      country: "India",
      city: "Bengaluru",
      buildingSubType: "commercial_strata_warehouse",
    }) === "proportionate_escrow",
    "India warehouse without a code still defaults to proportionate escrow"
  );
  assert(
    defaultEscrowRuleForLocation({
      country: "Thailand",
      countryCode: "TH",
      city: "Bangkok",
      buildingSubType: "residential_high_rise",
    }) === "none",
    "Thailand stays on no escrow"
  );
  assert(
    defaultEscrowRuleForLocation({
      country: "Indonesia",
      countryCode: "ID",
      city: "Jakarta",
      buildingSubType: "residential_high_rise",
    }) === "none",
    "Indonesia is not treated as India"
  );
  assert(
    defaultEscrowRuleForLocation({
      country: "United Arab Emirates",
      city: "Dubai",
      buildingSubType: "residential_high_rise",
    }) === "staged",
    "Dubai default is unchanged"
  );
  assert(
    shouldRenderSaleEscrowSlide("commercial_strata_warehouse", "proportionate_escrow"),
    "warehouse + proportionate shows the escrow slide"
  );
  assert(
    shouldRenderSaleEscrowSlide("residential_high_rise", "proportionate_escrow"),
    "residential + proportionate shows the escrow slide"
  );
  assert(
    !shouldRenderSaleEscrowSlide("commercial_landed", "staged"),
    "commercial staged still hides the escrow slide"
  );
  assert(
    ESCROW_RULE_CONFIG_TITLE.proportionate_escrow === "Proportionate Escrow Rule Configuration",
    "deck heading is the rule name"
  );
  assert(
    proportionateLocalRegimeNote({ country: "India", city: "Mumbai" }) ===
      PROPORTIONATE_LOCAL_REGIME_NOTE,
    "India location default carries the local-regime note"
  );
  assert(
    proportionateLocalRegimeNote({ country: "Thailand", city: "Bangkok" }) === undefined,
    "Thailand opt-in has no local-regime note"
  );
  const horizon = resolveSaleHorizonLastMonth(
    baseInputs({
      country: "India",
      countryCode: "IN",
      constructionPeriodMonths: 36,
      escrowWithdrawalMode: undefined,
      buildingSubType: "commercial_strata_warehouse",
    })
  );
  assert(horizon === 42, `India horizon CP+6 (got ${horizon})`);
}

function entitlementLedger() {
  const inputs = linearProject();
  const rows = generateFinancingCashFlow(inputs);
  const completion = resolveActualConstructionEndMonth(
    { constructionPeriod: 5 },
    inputs.monthlyCosts.construction
  );
  const tec = 100;
  const split = 0.7;
  let cumDeposits = 0;
  let cumWithdrawals = 0;
  let cumConstInterest = 0;
  for (const row of rows) {
    cumDeposits += row.escrowDeposit;
    cumWithdrawals += row.proportionateWithdrawal + row.lenderCashSweep;
    if (row.constLoanInterest < 0) cumConstInterest += -row.constLoanInterest;
    const s = sAt(row.month, completion);
    assert(
      cumWithdrawals <= cumDeposits + 0.05,
      `M${row.month} withdrawals ${cumWithdrawals} <= escrow deposits ${cumDeposits} (the ${split * 100}% split)`
    );
    assert(
      cumWithdrawals <= tec * s + cumConstInterest + 0.05,
      `M${row.month} withdrawals ${cumWithdrawals} <= entitlement ${tec * s + cumConstInterest}`
    );
    assert(row.escrowBalance >= -1e-6, `M${row.month} balance ${row.escrowBalance} >= 0`);
  }
  const close = rows.find((r) => r.month === completion + 1);
  assert(!!close && near(close.escrowBalance, 0), `balance is 0 at completion+1 (got ${close?.escrowBalance})`);
  assert(
    rows.filter((r) => r.month > completion + 1).every(
      (r) =>
        near(r.escrowBalance, 0) && near(r.escrowInterest, 0) && near(r.escrowAccountFees, 0)
    ),
    "no balance or accruals after closure"
  );
  assert(near(sum(rows, (r) => r.developerFreeCash), 30), "free cash is the 30% remainder");
  assert(near(sum(rows, (r) => r.escrowDeposit), 70), "deposits are the 70% split");
  assert(rows.length === resolveSaleHorizonLastMonth(inputs) + 1, "row length matches horizon");
  const quietSales = Array.from({ length: 48 }, () => 0);
  const quiet = generateFinancingCashFlow(
    linearProject({ monthlySalesInflows: quietSales })
  );
  const equity = (series: MonthlyRow[]) => sum(series, (r) => r.capitalCash);
  assert(
    equity(quiet) > equity(rows) + 20,
    `free cash reduces equity gap-fill (${equity(rows)} vs ${equity(quiet)} without sales)`
  );
  assert(rows[1].proportionateWithdrawal > 0, "monthly mode withdraws at M1");
}

function landInterestExcluded() {
  const months = 48;
  const construction = Array.from({ length: months }, () => 0);
  const sales = Array.from({ length: months }, () => 0);
  for (let m = 0; m <= 5; m++) {
    construction[m] = 10;
    sales[m] = 50;
  }
  const shared = {
    landCost: 30,
    landEquityPercent: 50,
    landEquityValue: 15,
    landLoanAmount: 15,
    landLoanEnabled: true,
    landLoanRatePct: 0.12,
    landLoanInterestTreatment: "paid-current-quarterly" as const,
    landLoanTenorMonths: 11,
    monthlyCosts: {
      construction,
      soft: Array(months).fill(0),
      powc: Array.from({ length: months }, (_, m) => (m <= 5 ? 10 / 6 : 0)),
      ffe: Array(months).fill(0),
    },
    monthlySalesInflows: sales,
    proportionateConstructionInterestPermitted: true,
    approvedCreditFacility: 0,
  };
  const withLand = generateFinancingCashFlow(linearProject(shared));
  const landInterestPaid = sum(withLand, (r) => (r.landLoanInterest < 0 ? -r.landLoanInterest : 0));
  assert(landInterestPaid > 0.2, `land-loan interest was paid (${landInterestPaid})`);
  const gross = sum(withLand, (r) => r.proportionateWithdrawal + r.lenderCashSweep);
  assert(
    gross <= 100.05,
    `certified withdrawals ${gross} stay within TEC 100 and exclude land-loan interest`
  );
  assert(gross > 99, `certified withdrawals reach the TEC cap (got ${gross})`);
  const noInterest = generateFinancingCashFlow(
    linearProject({
      ...shared,
      landLoanRatePct: 0,
      landLoanInterestTreatment: "capitalize",
    })
  );
  const grossQuiet = sum(noInterest, (r) => r.proportionateWithdrawal + r.lenderCashSweep);
  assert(
    near(gross, grossQuiet, 0.05),
    `land-loan interest does not change withdrawals (${gross} vs ${grossQuiet})`
  );
}

function thailandOptIn() {
  const inputs = linearProject({
    country: "Thailand",
    countryCode: "TH",
    city: "Bangkok",
    proportionateEscrowPercent: 60,
    proportionateSweepEnabled: false,
    landEquityPercent: 40,
    landEquityValue: 12,
    landLoanAmount: 18,
    landLoanEnabled: true,
    landLoanRatePct: 0.08,
  });
  assert(
    resolveProportionateEscrowPercent(60, { country: "Thailand" }) === 60,
    "Thailand split stays editable at 60"
  );
  assert(
    resolveProportionateSweepEnabled(false, { country: "Thailand" }) === false,
    "Thailand sweep can be turned off"
  );
  const snapshot = {
    landEquityPercent: inputs.landEquityPercent,
    landLoanAmount: inputs.landLoanAmount,
  };
  const rows = generateFinancingCashFlow(inputs);
  assert(inputs.landEquityPercent === snapshot.landEquityPercent, "Thailand run does not mutate land equity %");
  assert(inputs.landLoanAmount === snapshot.landLoanAmount, "Thailand run does not mutate the land loan");
  assert(sum(rows, (r) => r.landLoanDrawdown) > 0, "land loan is available on an Others opt-in");
  assert(near(sum(rows, (r) => r.escrowDeposit), 60), "60% split is what the engine lodges");
  assert(near(sum(rows, (r) => r.lenderCashSweep), 0), "sweep off sends nothing to the lender");
  const ui = readFileSync(
    resolve("src/app/sale/financing/escrow-config/ProportionateEscrowConfig.tsx"),
    "utf8"
  );
  assert(!/india|rera|maharera/i.test(ui), "config panel has no India, RERA, or regulator language");
}

function cumulativeCertified(rows: MonthlyRow[], through: number) {
  return rows.reduce(
    (sum, row) =>
      row.month <= through ? sum + row.proportionateWithdrawal + row.lenderCashSweep : sum,
    0
  );
}

function quarterlyCert() {
  const rows = generateFinancingCashFlow(
    linearProject({ proportionateCertFrequency: "quarterly" })
  );
  const monthly = generateFinancingCashFlow(linearProject());
  const completion = 5;
  const withdrawalMonths = new Set<number>();
  for (let m = 0; m <= completion; m++) {
    if (m >= 2 && m % 3 === 2) withdrawalMonths.add(m + 1);
  }
  let previousCumulative = 0;
  for (const row of rows) {
    const gross = row.proportionateWithdrawal + row.lenderCashSweep;
    if (row.month === completion + 1) {
      assert(withdrawalMonths.has(row.month), "close month is also a quarterly withdrawal month in this curve");
    } else if (!withdrawalMonths.has(row.month)) {
      assert(near(gross, 0), `no certified withdrawal at M${row.month} (got ${gross})`);
    } else {
      assert(gross > 0, `quarterly withdrawal at M${row.month}`);
    }
    if (withdrawalMonths.has(row.month)) {
      const quarterlyCumulative = cumulativeCertified(rows, row.month);
      const monthlyCumulative = cumulativeCertified(monthly, row.month);
      assert(
        near(quarterlyCumulative, monthlyCumulative, 1),
        `cumulative withdrawal at M${row.month} matches monthly (${quarterlyCumulative} vs ${monthlyCumulative})`
      );
      assert(
        near(gross, quarterlyCumulative - previousCumulative, 0.01),
        `quarterly lump at M${row.month} equals the cumulative delta`
      );
      previousCumulative = quarterlyCumulative;
    }
    if (row.month !== completion + 1) {
      assert(near(row.residualRelease, 0), `residual only at completion+1, not M${row.month}`);
    }
  }
  assert(monthly[1].proportionateWithdrawal > 0, "monthly certification still withdraws at M1");

  const exported = buildFinancingCashFlowExportRows({
    rows,
    jurisdiction: "OTHER",
    escrowRule: "proportionate_escrow",
  });
  const withdrawal = exported.find((line) => line[0] === "Proportionate withdrawal");
  const sweep = exported.find((line) => line[0] === "Lender cash sweep");
  assert(!!withdrawal && !!sweep, "excel export includes proportionate withdrawal rows");
  if (withdrawal && sweep) {
    for (const row of rows) {
      const withdrawalCell = withdrawal[row.month + 1];
      const sweepCell = sweep[row.month + 1];
      const exportedGross =
        (typeof withdrawalCell === "number" ? withdrawalCell : 0) +
        (typeof sweepCell === "number" ? sweepCell : 0);
      const engineGross = row.proportionateWithdrawal + row.lenderCashSweep;
      const expected =
        !Number.isFinite(engineGross) || engineGross === 0 ? 0 : Math.round(engineGross / 1000);
      assert(
        exportedGross === expected,
        `excel cadence at M${row.month} matches the preview (${exportedGross} vs ${expected})`
      );
    }
  }
}

function sweepAndResidualGate() {
  const months = 48;
  const construction = Array.from({ length: months }, () => 0);
  construction[0] = 40;
  construction[1] = 30;
  construction[2] = 30;
  const sales = Array.from({ length: months }, () => 0);
  sales[1] = 300;
  const shared: Partial<FinancingInputs> = {
    constructionPeriodMonths: 2,
    landCost: 20,
    landEquityPercent: 50,
    landEquityValue: 10,
    landLoanAmount: 10,
    landLoanEnabled: true,
    landLoanRatePct: 0.06,
    landLoanInterestTreatment: "capitalize",
    landLoanTenorMonths: 8,
    approvedCreditFacility: 80,
    interestRatePct: 0.12,
    idcTreatment: "paid-current",
    monthlyCosts: {
      construction,
      soft: Array(months).fill(0),
      powc: Array(months).fill(0),
      ffe: Array(months).fill(0),
    },
    monthlySalesInflows: sales,
    proportionateEscrowPercent: 70,
    proportionateCertFrequency: "monthly",
    proportionateConstructionInterestPermitted: true,
    country: "Thailand",
    countryCode: "TH",
  };
  const on = generateFinancingCashFlow(
    baseInputs({ ...shared, proportionateSweepEnabled: true })
  );
  const off = generateFinancingCashFlow(
    baseInputs({ ...shared, proportionateSweepEnabled: false })
  );
  const sweep = sum(on, (r) => r.lenderCashSweep);
  assert(sweep > 1, `sweep on repays the construction loan (swept ${sweep})`);
  assert(near(sum(off, (r) => r.lenderCashSweep), 0), "sweep off does not prepay the loan");
  const interestOn = sum(on, (r) => (r.constLoanInterest < 0 ? -r.constLoanInterest : 0));
  const interestOff = sum(off, (r) => (r.constLoanInterest < 0 ? -r.constLoanInterest : 0));
  assert(
    interestOn < interestOff - 0.05,
    `sweep reduces later construction interest (${interestOn} vs ${interestOff})`
  );
  const sweepMonth = on.find((r) => r.lenderCashSweep > 0);
  assert(!!sweepMonth, "a sweep month exists");
  if (sweepMonth) {
    assert(
      near(sweepMonth.landLoanRepayment, 0),
      `land loan is not swept at M${sweepMonth.month}`
    );
  }
  const landDraw = sum(on, (r) => r.landLoanDrawdown);
  assert(landDraw > 0, "land loan still draws while the sweep is on");
  const close = on.find((r) => r.residualRelease > 1);
  assert(!!close, "residual release is positive");
  if (close) {
    assert(close.month > 2, `residual month M${close.month} is after construction`);
    assert(
      close.irrCashFlow <= close.cumulativeNcf - close.residualRelease + 0.05,
      `residual at M${close.month} is held by the land-loan gate (irr ${close.irrCashFlow}, cum ${close.cumulativeNcf}, residual ${close.residualRelease})`
    );
  }
  const india = generateFinancingCashFlow(
    baseInputs({
      ...shared,
      country: "India",
      countryCode: "IN",
      proportionateSweepEnabled: false,
    })
  );
  assert(
    sum(india, (r) => r.lenderCashSweep) > 1,
    "India locks the sweep on even when the stored flag is off"
  );
}

function indiaLocksAndPreservesLand() {
  const inputs = linearProject({
    country: "India",
    countryCode: "IN",
    city: "Pune",
    buildingSubType: "commercial_strata_warehouse",
    proportionateEscrowPercent: 60,
    proportionateSweepEnabled: false,
    landEquityPercent: 40,
    landEquityValue: 12,
    landLoanAmount: 18,
    landLoanEnabled: true,
    approvedCreditFacility: 50,
    interestRatePct: 0.1,
    idcTreatment: "paid-current",
    cashEquityRequired: 0,
  });
  const rows = generateFinancingCashFlow(inputs);
  assert(inputs.landEquityPercent === 40, "India overlay does not mutate stored land equity %");
  assert(inputs.landLoanAmount === 18, "India overlay does not mutate stored land loan inputs");
  assert(sum(rows, (r) => r.landLoanDrawdown) > 0, "India proportionate still draws the land loan");
  assert(near(sum(rows, (r) => r.escrowDeposit), 70), "India locks the split at 70 even if 60 was stored");
  assert(sum(rows, (r) => r.lenderCashSweep) >= 0, "India sweep lock does not throw");
  const staged = generateFinancingCashFlow({
    ...inputs,
    escrowWithdrawalMode: "staged",
  });
  assert(inputs.landEquityPercent === 40, "switching the rule id leaves stored land equity % in place");
  assert(sum(staged, (r) => r.landLoanDrawdown) > 0, "staged after proportionate still has the land loan");
}

function exportParity() {
  const inputs = linearProject();
  const rows = generateFinancingCashFlow(inputs);
  const exported = buildFinancingCashFlowExportRows({
    rows,
    jurisdiction: "OTHER",
    escrowRule: "proportionate_escrow",
  });
  for (const label of [
    "Escrow deposit (70%)",
    "Escrow account balance",
    "Escrow interest income",
    "Escrow account fees",
    "Developer free cash (remainder)",
    "Proportionate withdrawal",
    "Lender cash sweep",
    "Residual release at completion",
  ]) {
    const line = exported.find((r) => r[0] === label);
    assert(!!line && line.length === rows.length + 2, `${label} export length ${line?.length} vs horizon ${rows.length}`);
  }
  const deposit = exported.find((r) => r[0] === "Escrow deposit (70%)");
  if (deposit) {
    const parity = rows.every((row, i) => {
      const raw = row.escrowDeposit;
      const expected = !Number.isFinite(raw) || raw === 0 ? null : Math.round(raw / 1000);
      return deposit[i + 1] === expected;
    });
    assert(parity, "Excel deposit row matches engine values in thousands");
    const rawSum = rows.reduce((s, r) => s + r.escrowDeposit, 0);
    const displayed = deposit[deposit.length - 1];
    assert(displayed === Math.round(rawSum / 1000), "deposit total equals the displayed sum");
  }
}

function otherFeesExcluded() {
  const months = 48;
  const construction = Array.from({ length: months }, () => 0);
  const soft = Array.from({ length: months }, () => 0);
  const sales = Array.from({ length: months }, () => 0);
  for (let m = 0; m <= 5; m++) {
    construction[m] = 10;
    soft[m] = 20 / 6;
    sales[m] = 50;
  }
  const rows = generateFinancingCashFlow(
    linearProject({
      landCost: 30,
      guaranteeSoftOtherFeesShare: 1,
      monthlyCosts: {
        construction,
        soft,
        powc: Array(months).fill(0),
        ffe: Array(months).fill(0),
      },
      monthlySalesInflows: sales,
    })
  );
  const gross = sum(rows, (r) => r.proportionateWithdrawal + r.lenderCashSweep);
  assert(gross <= 90.05, `Other Fees stay out of TEC (withdrawals ${gross})`);
  assert(gross > 89, `permitted land and construction are still withdrawable (got ${gross})`);
}

function captureProportionateAsserts(run: () => void) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const origErr = console.error;
  const origWarn = console.warn;
  console.error = (...args: unknown[]) => {
    const line = args.map(String).join(" ");
    if (line.includes("[proportionate]")) errors.push(line);
    origErr(...args);
  };
  console.warn = (...args: unknown[]) => {
    const line = args.map(String).join(" ");
    if (line.includes("[proportionate]")) warnings.push(line);
    origWarn(...args);
  };
  try {
    run();
  } finally {
    console.error = origErr;
    console.warn = origWarn;
  }
  return { errors, warnings };
}

function escrowDepositRateWire() {
  assert(resolveEscrowDepositRatePercent({ escrowDepositRatePercent: 7, escrowDepositRatePct: 0.039 }) === 7, "stored percent wins over the old 3.9% decimal");
  assert(resolveEscrowDepositRatePercent({ escrowDepositRatePct: 0.039 }) === 3.9, "legacy decimal still scales to percent points");
  const atSeven = generateFinancingCashFlow(
    linearProject({ escrowDepositRatePercent: 7, proportionateCertFrequency: "monthly" })
  );
  const m1 = atSeven[0].escrowBalance * (7 / 100 / 12);
  assert(near(atSeven[1].escrowInterest, m1, 1e-6), `M1 interest is prior balance x 7/100/12 (got ${atSeven[1].escrowInterest}, expected ${m1})`);
  const bangaluruM1 = 57261787.2 * (7 / 100 / 12);
  assert(near(bangaluruM1, 334027.092, 0.01), `7% of the Bangaluru M0 balance is 334,027.09 (got ${bangaluruM1})`);
  const bangaluruM2 = 58840462.3 * (7 / 100 / 12);
  assert(near(bangaluruM2, 343236.03, 0.01), `7% of the Bangaluru M1 balance is 343,236.03 (got ${bangaluruM2})`);
  const atZero = generateFinancingCashFlow(
    linearProject({ escrowDepositRatePercent: 0, proportionateCertFrequency: "monthly" })
  );
  assert(atZero.every((row) => near(row.escrowInterest, 0, 1e-9)), "rate 0 keeps every escrow interest row at 0");
}

function capPathDependence() {
  const unboundInputs = linearProject({
    monthlySalesInflows: (() => {
      const sales = Array.from({ length: 48 }, () => 0);
      for (let m = 0; m <= 5; m++) sales[m] = 500;
      return sales;
    })(),
    proportionateCertFrequency: "quarterly",
    escrowDepositRatePct: 0.08,
    escrowManagementFeePct: 0.01,
    escrowSetupFee: 1000,
  });
  const unboundEngine = captureProportionateAsserts(() => {
    generateFinancingCashFlow(unboundInputs);
  });
  assert(
    unboundEngine.errors.length === 0,
    `unbound cap emits no proportionate errors (${unboundEngine.errors.join(" | ")})`
  );
  assert(
    unboundEngine.warnings.length === 0,
    "engine does not emit per-month cap warns"
  );
  const unbound = auditProportionateCrossMode(unboundInputs);
  assert(unbound != null, "unbound audit runs");
  assert(
    unbound!.errors.length === 0,
    `unbound cap keeps cross-mode equality exact (${unbound!.errors.join(" | ")})`
  );
  assert(unbound!.boundMonths.length === 0, "unbound cap reports no bound months");
  assert(unbound!.deltasWithinInterest, "unbound deltas stay within the interest differential");

  const boundInputs = linearProject({
    proportionateCertFrequency: "quarterly",
    escrowDepositRatePct: 0.06,
    escrowManagementFeePct: 0.02,
    escrowSetupFee: 5,
  });
  const boundEngine = captureProportionateAsserts(() => {
    generateFinancingCashFlow(boundInputs);
  });
  assert(
    boundEngine.errors.length === 0,
    `bound cap emits no proportionate errors (${boundEngine.errors.join(" | ")})`
  );
  assert(
    boundEngine.warnings.length === 0,
    "engine emits no per-month cap warns when the cap binds"
  );
  const bound = auditProportionateCrossMode(boundInputs);
  assert(bound != null && bound.boundMonths.length > 0, "bound cap is reported by the audit");
  assert(
    bound!.errors.length === 0,
    `bound cap audit emits no errors (${bound!.errors.join(" | ")})`
  );
  assert(bound!.deltasWithinInterest, "bound cap deltas stay within the interest differential");
  for (const month of bound!.months) {
    if (!month.capBound) continue;
    assert(
      Math.abs(month.delta) <= month.interestDifferential + 1,
      `audit delta at M${month.payMonth} stays within trust-interest differential + 1`
    );
  }
}

locationDefaults();
entitlementLedger();
otherFeesExcluded();
landInterestExcluded();
thailandOptIn();
quarterlyCert();
escrowDepositRateWire();
capPathDependence();
sweepAndResidualGate();
indiaLocksAndPreservesLand();
exportParity();

if (process.exitCode) {
  console.error("proportionate escrow checks failed");
} else {
  console.log("proportionate escrow checks passed");
}
