import { buildFinancingEnginePreview } from "@/app/sale/preview/financing/financing-cash-flow-engine-bridge";
import { buildSaleCashflowDetailProfile } from "@/lib/sale-cash-preview-profile";
import {
  annualIrrPercentFromMonthlySeries,
  equityMultipleFromSeries,
  paybackMonthCrossingFromNegative,
} from "@/lib/equity-irr";
import { solveAnnualIRR } from "@/lib/irr-calculations";
import { buildCashOutflowProfile } from "@/store/useFinModelStore";
import type { FinancingConfig } from "@/lib/sale-financing-engine";
import type {
  CashInflows,
  CashOutflows,
  Financing,
  MonthlyCashFlowPoint,
  ProjectInfo,
} from "@/store/useFinModelStore";
import type { SaleShockKey } from "@/app/sale/scenario/saleScenarioDrivers";

export type SaleScenarioSnapshot = {
  projectInfo: ProjectInfo;
  cashInflows: CashInflows;
  cashOutflows: CashOutflows;
  financing: Financing;
};

export type SaleScenarioMetrics = {
  equityIrrPct: number;
  equityMultiple: number;
  peakEquityInjected: number;
  equityPaybackMonth: number | null;
  loanRepaymentMonth: number | null;
  unleveredIrrPct: number;
  unleveredPaybackMonths: number;
  /** Monthly sales proceeds by month index (M0…Mn) from financing engine rows. */
  monthlySalesProceeds: number[];
};

export type SaleScenarioEngineResult = {
  metrics: SaleScenarioMetrics;
  rows: ReturnType<typeof buildFinancingEnginePreview>["rows"];
};

function cloneSnapshot(snap: SaleScenarioSnapshot): SaleScenarioSnapshot {
  return JSON.parse(JSON.stringify(snap)) as SaleScenarioSnapshot;
}

/** Revenue: +10% shock → 1.10× inflows. */
export function revenueShockMultiplier(shockPct: number): number {
  return 1 + shockPct / 100;
}

/** Costs: −5% shock → 0.95× outflows (lower costs → higher IRR). */
export function costShockMultiplier(shockPct: number): number {
  return 1 + shockPct / 100;
}

function recomputeTdcFromComponents(co: CashOutflows): void {
  co.tdc =
    (Number(co.landCost) || 0) +
    (Number(co.constructionCost) || 0) +
    (Number(co.softCosts) || 0) +
    (Number(co.powc) || 0) +
    (Number(co.ffe) || 0);
}

function scaleScheduleAmounts(
  schedule: MonthlyCashFlowPoint[],
  multiplier: number
): MonthlyCashFlowPoint[] {
  if (multiplier === 1) return schedule.map((p) => ({ ...p }));
  return schedule.map((p) => ({
    ...p,
    amount: (Number(p.amount) || 0) * multiplier,
  }));
}

/** Compress (+velocity) or stretch (−velocity) absorption timing. */
export function applyVelocityShock(
  schedule: MonthlyCashFlowPoint[],
  velocityPct: number,
  constructionMonths: number
): MonthlyCashFlowPoint[] {
  if (!schedule.length || velocityPct === 0) {
    return schedule.map((p) => ({ ...p }));
  }
  const cp = Math.max(1, constructionMonths);
  const factor = Math.max(0.35, 1 - velocityPct / 100);
  const bucket = new Map<number, number>();
  for (const p of schedule) {
    const rawMonth = Math.round(Number(p.month) || 0);
    const shifted = Math.max(0, Math.min(cp, Math.round(rawMonth * factor)));
    const amt = Number(p.amount) || 0;
    bucket.set(shifted, (bucket.get(shifted) ?? 0) + amt);
  }
  return Array.from(bucket.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([month, amount]) => ({ month, amount }));
}

function scaleConstructionSchedule(
  co: CashOutflows,
  multiplier: number
): void {
  if (multiplier === 1) return;
  if (typeof co.constructionCost === "number") {
    co.constructionCost *= multiplier;
  }
  const sched = (co as { constructionSchedule?: Array<{ amount?: number; value?: number }> })
    .constructionSchedule;
  if (Array.isArray(sched)) {
    for (const e of sched) {
      if (typeof e.amount === "number") e.amount *= multiplier;
      if (typeof e.value === "number") e.value *= multiplier;
    }
  }
}

function scaleSoftCostsAndPowc(co: CashOutflows, multiplier: number): void {
  if (multiplier === 1) return;
  if (typeof co.softCosts === "number") co.softCosts *= multiplier;
  if (typeof co.softCostsTotal === "number") co.softCostsTotal *= multiplier;
  if (typeof co.powc === "number") co.powc *= multiplier;
}

export type SaleScenarioShocks = Partial<Record<SaleShockKey, number>>;

export function applySaleShocksToSnapshot(
  snap: SaleScenarioSnapshot,
  shocks: SaleScenarioShocks
): SaleScenarioSnapshot {
  const out = cloneSnapshot(snap);
  const ci = out.cashInflows;
  const co = out.cashOutflows;
  const fin = out.financing;

  const constructionMonths =
    Math.max(
      Number(co.constructionPeriod ?? 0) || 0,
      Number(fin.constructionPeriodMonths ?? 0) || 0
    ) || 30;

  const schedule = Array.isArray(ci.monthlyInflowSchedule)
    ? ci.monthlyInflowSchedule.map((p) => ({ ...p }))
    : [];

  for (const [id, raw] of Object.entries(shocks) as [SaleShockKey, number][]) {
    const value = Number(raw) || 0;
    if (value === 0) continue;

    switch (id) {
      case "salesPrice": {
        const mult = revenueShockMultiplier(value);
        if (typeof ci.grossSales === "number") ci.grossSales *= mult;
        if (typeof ci.netProceeds === "number") ci.netProceeds *= mult;
        ci.monthlyInflowSchedule = scaleScheduleAmounts(
          ci.monthlyInflowSchedule ?? schedule,
          mult
        );
        break;
      }
      case "salesVelocity": {
        ci.monthlyInflowSchedule = applyVelocityShock(
          ci.monthlyInflowSchedule ?? schedule,
          value,
          constructionMonths
        );
        break;
      }
      case "preSales": {
        const mult = revenueShockMultiplier(value);
        const preEnd = Math.min(3, constructionMonths);
        ci.monthlyInflowSchedule = (ci.monthlyInflowSchedule ?? schedule).map((p) => {
          const m = Math.round(Number(p.month) || 0);
          if (m <= preEnd) {
            return { ...p, amount: (Number(p.amount) || 0) * mult };
          }
          return { ...p };
        });
        break;
      }
      case "constructionCost": {
        scaleConstructionSchedule(co, costShockMultiplier(value));
        break;
      }
      case "softCosts": {
        scaleSoftCostsAndPowc(co, costShockMultiplier(value));
        break;
      }
      case "constructionDuration": {
        const next = Math.max(1, constructionMonths + Math.round(value));
        co.constructionPeriod = next;
        fin.constructionPeriodMonths = next;
        break;
      }
      case "ltcReduction": {
        const factor = Math.max(0.5, 1 - value / 100);
        if (typeof fin.loanToCostPercent === "number") {
          fin.loanToCostPercent *= factor;
        }
        if (typeof fin.ltc === "number") fin.ltc *= factor;
        const cap =
          fin.approvedCreditFacility ?? fin.debtFacilityAmount ?? 0;
        if (cap > 0) {
          fin.approvedCreditFacility = cap * factor;
          fin.debtFacilityAmount = cap * factor;
        }
        break;
      }
      case "interestRate": {
        // Slider is in bps: 100 bps → +1.0 percentage point on the quoted rate.
        const addPct = value / 100;
        if (typeof fin.interestRate === "number") fin.interestRate += addPct;
        if (typeof fin.fixedOrProfitRatePercent === "number") {
          fin.fixedOrProfitRatePercent += addPct;
        }
        if (fin.rateType === "floating" && typeof fin.marginPercent === "number") {
          fin.marginPercent += addPct;
        }
        break;
      }
      default:
        break;
    }
  }

  recomputeTdcFromComponents(co);

  return out;
}

export function applySaleScenarioPreset(
  snap: SaleScenarioSnapshot,
  preset: "upside" | "downside"
): SaleScenarioSnapshot {
  if (preset === "downside") {
    return applySaleShocksToSnapshot(snap, {
      salesPrice: -10,
      salesVelocity: -25,
      preSales: -30,
      constructionCost: 15,
      softCosts: 10,
      constructionDuration: 6,
      ltcReduction: 8,
      interestRate: 150,
    });
  }
  return applySaleShocksToSnapshot(snap, {
    salesPrice: 8,
    salesVelocity: 15,
    preSales: 20,
    constructionCost: -8,
    softCosts: -5,
    constructionDuration: -3,
    ltcReduction: 0,
    interestRate: 0,
  });
}

/** Project-level unlevered IRR from shocked inflows/outflows (Component 3 pipeline). */
export function computeSaleUnleveredProjectMetrics(
  snap: SaleScenarioSnapshot
): { unleveredIrrPct: number; unleveredPaybackMonths: number } {
  const { projectInfo, cashInflows, cashOutflows, financing } = snap;
  const constructionPeriod =
    Math.max(
      cashOutflows.constructionPeriod ?? 0,
      financing.constructionPeriodMonths ?? 0
    ) || 30;
  const totalMonths = constructionPeriod + 6;

  const detail = buildSaleCashflowDetailProfile(cashOutflows, projectInfo);
  const inflowByMonth = new Map<number, number>();
  for (const p of cashInflows.monthlyInflowSchedule ?? []) {
    inflowByMonth.set(
      p.month,
      (inflowByMonth.get(p.month) || 0) + (Number(p.amount) || 0)
    );
  }

  const monthlyFlows: number[] = [];
  for (let m = 0; m <= totalMonths; m++) {
    const inflow = inflowByMonth.get(m) || 0;
    const outflow = Number(detail.monthlyTotal[m]) || 0;
    monthlyFlows.push(inflow - outflow);
  }

  const cashFlowPoints = monthlyFlows.map((amount, month) => ({ month, amount }));
  const solved = solveAnnualIRR(cashFlowPoints, 1e-7, 100);
  const unleveredIrrPct =
    solved.annualIRR != null && Number.isFinite(solved.annualIRR)
      ? solved.annualIRR * 100
      : 0;

  const paybackIdx = paybackMonthCrossingFromNegative(monthlyFlows);
  const unleveredPaybackMonths =
    paybackIdx != null && paybackIdx >= 0 ? paybackIdx : 0;

  return { unleveredIrrPct, unleveredPaybackMonths };
}

function computeLandEquityInputs(
  snap: SaleScenarioSnapshot
): { landEquityValue: number; cashEquityRequired: number } {
  const co = snap.cashOutflows;
  const fin = snap.financing;
  const tdc = co.tdc || 0;
  const lc = co.landCost || 0;
  const gdv = snap.cashInflows.grossSales || tdc * 1.2;
  const ltc = (fin.loanToCostPercent ?? fin.ltc ?? 65) / 100;
  const ltv = (fin.maxLtvPercent ?? fin.ltv ?? 65) / 100;
  const approvedDebt = Math.min(tdc * ltc, gdv * ltv);
  const totalEquityRequired = Math.max(0, tdc - approvedDebt);
  const landPct = fin.landEquityPercent ?? 100;
  const landEquityCounted = landPct >= 100 ? lc * 0.7 : 0;
  const landEquityValue =
    landPct >= 100 ? lc : lc * (landPct / 100);
  const cashEquityRequired = Math.max(0, totalEquityRequired - landEquityCounted);
  return { landEquityValue, cashEquityRequired };
}

function metricsFromEngineRows(
  rows: ReturnType<typeof buildFinancingEnginePreview>["rows"],
  unleveredIrrPct: number,
  unleveredPaybackMonths: number
): SaleScenarioMetrics {
  const equityCashFlows = rows.map((r) => r.irrCashFlow || 0);
  const equityIrrPct =
    equityCashFlows.length > 1
      ? annualIrrPercentFromMonthlySeries(equityCashFlows) ?? 0
      : 0;
  const equityMultiple = equityMultipleFromSeries(equityCashFlows) ?? 0;

  let peakEquityInjected = 0;
  let cumInject = 0;
  for (const cf of equityCashFlows) {
    if (cf < 0) cumInject += Math.abs(cf);
    peakEquityInjected = Math.max(peakEquityInjected, cumInject);
  }
  const capitalPeak = rows.reduce(
    (max, r) =>
      Math.max(max, (r.capitalLand || 0) + (r.capitalCash || 0)),
    0
  );
  peakEquityInjected = Math.max(peakEquityInjected, capitalPeak);

  const equityPaybackMonth = paybackMonthCrossingFromNegative(equityCashFlows);

  let loanRepaymentMonth: number | null = null;
  let rcfWasPositive = false;
  for (const r of rows) {
    const bal = r.cumulativeDrawdown ?? r.constLoanCumulative ?? 0;
    if (bal > 1e-3) rcfWasPositive = true;
    if (rcfWasPositive && bal <= 0.01) {
      loanRepaymentMonth = r.month;
      break;
    }
  }

  const maxMonth = rows.reduce((m, r) => Math.max(m, r.month), 0);
  const monthlySalesProceeds = Array.from({ length: maxMonth + 1 }, (_, month) => {
    const row = rows.find((r) => r.month === month);
    return row?.salesProceeds ?? 0;
  });

  return {
    equityIrrPct,
    equityMultiple,
    peakEquityInjected,
    equityPaybackMonth,
    loanRepaymentMonth,
    unleveredIrrPct,
    unleveredPaybackMonths,
    monthlySalesProceeds,
  };
}

export function runSaleScenarioEngines(
  snap: SaleScenarioSnapshot,
  options?: {
    unleveredIrrPct?: number;
    unleveredPaybackMonths?: number;
  }
): SaleScenarioEngineResult | null {
  try {
    const { projectInfo, cashInflows, cashOutflows, financing } = snap;
    const constructionPeriod =
      Math.max(
        cashOutflows.constructionPeriod ?? 0,
        financing.constructionPeriodMonths ?? 0
      ) || 30;

    const detail = buildSaleCashflowDetailProfile(cashOutflows, projectInfo);
    const baseOutflowProfile = buildCashOutflowProfile(cashOutflows);
    const outflowProfile = {
      ...baseOutflowProfile,
      construction: detail.construction,
      softCosts: detail.softCostsTotal,
      powc: detail.powcTotal,
      monthlyTotal: detail.monthlyTotal,
      cumulative: detail.cumulative,
      stages: detail.stages,
    };

    const financingConfig = (financing as Financing & { config?: FinancingConfig })
      .config;
    const effectiveRate =
      financing.rateType === "floating"
        ? (financing.baseRatePercent ?? 3) + (financing.marginPercent ?? 0)
        : financing.fixedOrProfitRatePercent ??
          financing.interestRate ??
          8;

    const debtFacilityAmount =
      financing.approvedCreditFacility ??
      financing.debtFacilityAmount ??
      0;

    const { landEquityValue, cashEquityRequired } = computeLandEquityInputs(snap);

    const bundle = buildFinancingEnginePreview({
      projectInfo,
      cashOutflows,
      financing,
      financingConfig,
      outflowProfile,
      constructionCostSchedule: detail.construction,
      constructionPeriod,
      monthlyInflowSchedule: cashInflows.monthlyInflowSchedule ?? [],
      finStream: "sale",
      effectiveInterestRatePercent: effectiveRate,
      debtFacilityAmount,
      landEquityValue,
      cashEquityRequired,
    });

    const computedUnlevered = computeSaleUnleveredProjectMetrics({
      projectInfo,
      cashInflows,
      cashOutflows,
      financing,
    });
    const unleveredIrrPct = computedUnlevered.unleveredIrrPct;
    const unleveredPaybackMonths = computedUnlevered.unleveredPaybackMonths;

    return {
      metrics: metricsFromEngineRows(
        bundle.rows,
        unleveredIrrPct,
        unleveredPaybackMonths
      ),
      rows: bundle.rows,
    };
  } catch {
    return null;
  }
}

export function runSaleScenarioWithShocks(
  baseSnap: SaleScenarioSnapshot,
  shocks: SaleScenarioShocks,
  options?: {
    unleveredIrrPct?: number;
    unleveredPaybackMonths?: number;
  }
): SaleScenarioEngineResult | null {
  const shocked = applySaleShocksToSnapshot(baseSnap, shocks);
  return runSaleScenarioEngines(shocked, options);
}
