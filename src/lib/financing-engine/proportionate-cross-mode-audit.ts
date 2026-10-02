/**
 * Dev-only cross-mode check for proportionate escrow.
 * Compares monthly vs quarterly cumulative withdrawals once per escrow-config
 * change. The financing engine must not call this — it runs the engine twice.
 */
import { resolveEscrowRule } from "@/lib/financing-engine/escrow-rules";
import {
  buildProportionateAssertCalendar,
  generateFinancingCashFlow,
  grossCertifiedWithdrawal,
  isProportionateCertMonth,
  proportionateCapBoundThrough,
  resolveSaleHorizonLastMonth,
  sumProportionateThrough,
  type FinancingInputs,
  type MonthlyRow,
} from "@/lib/financing-engine/generate-cash-flow";

export type ProportionateCrossModeMonth = {
  payMonth: number;
  delta: number;
  interestDifferential: number;
  capBound: boolean;
};

export type ProportionateCrossModeAudit = {
  boundMonths: number[];
  equalMonths: number[];
  deltasWithinInterest: boolean;
  errors: string[];
  summary: string;
  months: ProportionateCrossModeMonth[];
};

const auditedConfigKeys = new Set<string>();

function isProportionateInputs(inputs: FinancingInputs): boolean {
  const raw =
    inputs.escrowWithdrawalMode || inputs.withdrawalMethod || inputs.escrowModelType;
  if (raw == null || String(raw).trim() === "") return false;
  return (
    resolveEscrowRule({
      withdrawalMode: raw,
      jurisdiction: inputs.jurisdiction,
    }) === "proportionate_escrow"
  );
}

function cloneForFrequency(
  inputs: FinancingInputs,
  frequency: "monthly" | "quarterly"
): FinancingInputs {
  return {
    ...inputs,
    proportionateCertFrequency: frequency,
    monthlySalesInflows: [...inputs.monthlySalesInflows],
    monthlyCosts: {
      construction: [...inputs.monthlyCosts.construction],
      soft: [...inputs.monthlyCosts.soft],
      powc: [...inputs.monthlyCosts.powc],
      ffe: [...(inputs.monthlyCosts.ffe ?? [])],
    },
  };
}

function formatMonths(months: number[]): string {
  if (months.length === 0) return "none";
  return months.map((month) => `M${month}`).join(", ");
}

/**
 * Runs monthly and quarterly engines and compares cumulative certified
 * withdrawals at each quarterly cert+1 month. Returns null when the inputs
 * are not on the proportionate rule.
 */
export function auditProportionateCrossMode(
  inputs: FinancingInputs
): ProportionateCrossModeAudit | null {
  if (!isProportionateInputs(inputs)) return null;

  const monthlyInputs = cloneForFrequency(inputs, "monthly");
  const quarterlyInputs = cloneForFrequency(inputs, "quarterly");
  const calendar = buildProportionateAssertCalendar(
    quarterlyInputs,
    resolveSaleHorizonLastMonth(quarterlyInputs) + 1
  );
  const monthlyRows = generateFinancingCashFlow(monthlyInputs);
  const quarterlyRows = generateFinancingCashFlow(quarterlyInputs);

  const errors: string[] = [];
  const boundMonths: number[] = [];
  const equalMonths: number[] = [];
  const months: ProportionateCrossModeMonth[] = [];
  let deltasWithinInterest = true;
  let previousCumulative = 0;

  for (let cert = 0; cert <= calendar.completionMonth; cert++) {
    if (!isProportionateCertMonth(cert, "quarterly", calendar.completionMonth)) {
      continue;
    }
    const payMonth = cert + 1;
    const capBoundMonthly = proportionateCapBoundThrough(
      monthlyRows,
      "monthly",
      cert,
      calendar
    );
    const capBoundQuarterly = proportionateCapBoundThrough(
      quarterlyRows,
      "quarterly",
      cert,
      calendar
    );
    const capBound = capBoundMonthly || capBoundQuarterly;
    const monthlyCumulative = sumProportionateThrough(
      monthlyRows,
      payMonth,
      grossCertifiedWithdrawal
    );
    const quarterlyCumulative = sumProportionateThrough(
      quarterlyRows,
      payMonth,
      grossCertifiedWithdrawal
    );
    const delta = quarterlyCumulative - monthlyCumulative;
    const lumpRow = quarterlyRows.find((row) => row.month === payMonth);
    const lump = lumpRow ? grossCertifiedWithdrawal(lumpRow) : 0;
    if (Math.abs(lump - (quarterlyCumulative - previousCumulative)) > 1e-6) {
      errors.push(
        `[proportionate] quarterly lump at M${payMonth} is ${lump}, expected ${quarterlyCumulative - previousCumulative}`
      );
    }
    previousCumulative = quarterlyCumulative;

    const monthlyInterest = sumProportionateThrough(
      monthlyRows,
      payMonth,
      (row: MonthlyRow) => row.escrowInterest
    );
    const quarterlyInterest = sumProportionateThrough(
      quarterlyRows,
      payMonth,
      (row: MonthlyRow) => row.escrowInterest
    );
    const interestDifferential = Math.abs(quarterlyInterest - monthlyInterest);
    months.push({ payMonth, delta, interestDifferential, capBound });

    if (!capBound) {
      if (Math.abs(delta) > 1e-6) {
        errors.push(
          `[proportionate] cumulative withdrawal at M${payMonth} diverges before the cap binds: monthly ${monthlyCumulative} vs quarterly ${quarterlyCumulative}`
        );
      } else {
        equalMonths.push(payMonth);
      }
      continue;
    }

    boundMonths.push(payMonth);
    if (Math.abs(delta) > interestDifferential + 1) {
      deltasWithinInterest = false;
      errors.push(
        `[proportionate] M${payMonth} cumWD delta ${delta} exceeds trust-interest differential ${interestDifferential} + 1`
      );
    }
  }

  const range =
    boundMonths.length > 0
      ? ` (M${boundMonths[0]}..M${boundMonths[boundMonths.length - 1]})`
      : "";
  const deltaClause = deltasWithinInterest
    ? "all deltas within interest differential"
    : "deltas exceed interest differential";
  const summary = `[proportionate audit] ${boundMonths.length} months with cap bound${range}; ${deltaClause}; cross-mode equality holds before cap at ${formatMonths(equalMonths)}.`;

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    for (const error of errors) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  return {
    boundMonths,
    equalMonths,
    deltasWithinInterest,
    errors,
    summary,
    months,
  };
}

/** One summary line per escrow-config key. Skips SSR and production. */
export function logProportionateCrossModeAudit(
  configKey: string,
  inputs: FinancingInputs
): void {
  if (process.env.NODE_ENV !== "development") return;
  if (typeof window === "undefined") return;
  if (!configKey || auditedConfigKeys.has(configKey)) return;
  if (!isProportionateInputs(inputs)) return;
  auditedConfigKeys.add(configKey);
  const result = auditProportionateCrossMode(inputs);
  if (!result) return;
  // eslint-disable-next-line no-console
  console.info(result.summary);
}
