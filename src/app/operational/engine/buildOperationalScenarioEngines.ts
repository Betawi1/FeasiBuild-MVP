import {
  calculateOperationalLeveredModel,
  type OperationalLeveredModelInputs,
  type OperationalLeveredModelRuntime,
} from "@/app/operational/engine/c4.levered.engine";
import { calculateEquityReturns } from "@/app/operational/engine/c5.equity.engine";
import { shocksToOperationalInput } from "@/app/operational/scenario-analysis/config/shockFactors";
import { computeOperationalHotelHoldPnl } from "@/lib/operational-pnl";
import {
  buildCashOutflowProfile,
  calculateOperationsStartMonth,
  DEFAULT_PREFERENCE_TENOR_MONTHS,
  getOperationalYearMonthRange,
} from "@/store/useFinModelStore";

const STORAGE_KEYS = {
  drawdowns: "operational.financing.drawdowns.v1",
  idcTreatment: "operational.financing.idcTreatment.v1",
  loanAtCompletion: "operational.financing.loanAtCompletion.v1",
  loanType: "operational.financing.loanType.v1",
  amortization: "operational.financing.amortization.v1",
} as const;

function loadFromSessionStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function cloneStoreSlice<T>(v: T): T {
  try {
    if (typeof structuredClone === "function") return structuredClone(v);
  } catch {
    /* fallthrough */
  }
  return JSON.parse(JSON.stringify(v)) as T;
}

export type OperationalScenarioId = "base" | "upside" | "downside";

export type OperationalScenarioSnapshot = {
  cashInflows: any;
  cashOutflows: any;
  financing: any;
  projectInfo: any;
  hotelHoldSnapshot: any | null;
};

/** Apply Base / Upside / Downside tweaks (stream-local only). */
export function applyOperationalScenario(
  snap: OperationalScenarioSnapshot,
  scenario: OperationalScenarioId
): OperationalScenarioSnapshot {
  const out = cloneStoreSlice(snap);

  if (scenario === "upside") {
    const ci = out.cashInflows;
    if (typeof ci.grossSales === "number") ci.grossSales *= 1.1;
    if (typeof ci.netProceeds === "number") ci.netProceeds *= 1.1;
    if (Array.isArray(ci.monthlyInflowSchedule)) {
      ci.monthlyInflowSchedule = ci.monthlyInflowSchedule.map((p: any) => ({
        ...p,
        amount: (Number(p?.amount) || 0) * 1.1,
      }));
    }
    const co = out.cashOutflows;
    if (typeof co.constructionCost === "number") co.constructionCost *= 0.95;
    if (typeof co.softCosts === "number") co.softCosts *= 0.95;
    if (typeof co.powc === "number") co.powc *= 0.95;
    if (typeof co.ffe === "number") co.ffe *= 0.95;
    if (typeof co.tdc === "number") co.tdc *= 0.95;
    if (typeof co.landCost === "number") co.landCost *= 0.95;
    const sched = (co as any).constructionSchedule;
    if (Array.isArray(sched)) {
      (co as any).constructionSchedule = sched.map((e: any) => ({
        ...e,
        amount:
          (Number(e?.amount ?? e?.value ?? 0) || 0) * 0.95,
        value:
          e?.value != null
            ? (Number(e.value) || 0) * 0.95
            : e?.value,
      }));
    }
  }

  if (scenario === "downside") {
    const ci = out.cashInflows;
    if (typeof ci.grossSales === "number") ci.grossSales *= 0.9;
    if (typeof ci.netProceeds === "number") ci.netProceeds *= 0.9;
    if (Array.isArray(ci.monthlyInflowSchedule)) {
      ci.monthlyInflowSchedule = ci.monthlyInflowSchedule.map((p: any) => ({
        ...p,
        amount: (Number(p?.amount) || 0) * 0.9,
      }));
    }
    const fin = out.financing;
    fin.constructionPeriodMonths =
      Math.round(Number(fin.constructionPeriodMonths ?? 0) || 0) + 3;
    const co = out.cashOutflows;
    co.constructionPeriod =
      Math.max(
        Number(co.constructionPeriod ?? 0) || 0,
        fin.constructionPeriodMonths
      ) || fin.constructionPeriodMonths;
  }

  return out;
}

/** Apply Component 6 slider shocks to a stream snapshot before re-running C4. */
export function applyDriverShocksToOperationalSnapshot(
  snap: OperationalScenarioSnapshot,
  driverShocks: Record<string, number>,
  assetType: string
): OperationalScenarioSnapshot {
  const legacy = shocksToOperationalInput(driverShocks, assetType);
  if (Object.values(legacy).every((v) => v === 0 || v == null)) {
    return snap;
  }

  const out = cloneStoreSlice(snap);
  const co = out.cashOutflows;
  const fin = out.financing;

  const scaleCost = (mult: number, ...keys: (keyof typeof co)[]) => {
    for (const key of keys) {
      if (typeof co[key] === "number") {
        (co as Record<string, number>)[key as string] =
          (co[key] as number) * mult;
      }
    }
  };

  const constructionMult = 1 + (legacy.constructionCost ?? 0) / 100;
  if (constructionMult !== 1) {
    scaleCost(constructionMult, "constructionCost", "softCosts", "powc", "ffe", "tdc");
    if (typeof co.landCost === "number") co.landCost *= constructionMult;
    const sched = (co as { constructionSchedule?: unknown[] }).constructionSchedule;
    if (Array.isArray(sched)) {
      (co as { constructionSchedule: unknown[] }).constructionSchedule = sched.map(
        (e: unknown) => {
          const entry = e as Record<string, unknown>;
          const amount = Number(entry?.amount ?? entry?.value ?? 0) || 0;
          const scaled = amount * constructionMult;
          return {
            ...entry,
            amount: scaled,
            ...(entry.value != null ? { value: scaled } : {}),
          };
        }
      );
    }
  }

  const revenueMult =
    (1 + (legacy.adr ?? 0) / 100) *
    (1 + ((legacy.occupancy ?? 0) * 1.5) / 100);
  if (revenueMult !== 1 && out.hotelHoldSnapshot) {
    const snapHotel = out.hotelHoldSnapshot as {
      adrYear1?: number;
      stabilizedOccupancy?: number;
    };
    if (typeof snapHotel.adrYear1 === "number") {
      snapHotel.adrYear1 *= revenueMult;
    }
    if (typeof snapHotel.stabilizedOccupancy === "number") {
      snapHotel.stabilizedOccupancy = Math.min(
        100,
        snapHotel.stabilizedOccupancy * (1 + (legacy.occupancy ?? 0) / 100)
      );
    }
  }

  const opexMult = 1 + (legacy.operatingExpenses ?? 0) / 100;
  if (opexMult !== 1 && out.hotelHoldSnapshot) {
    const snapHotel = out.hotelHoldSnapshot as { opexPctOfRevenue?: number };
    if (typeof snapHotel.opexPctOfRevenue === "number") {
      snapHotel.opexPctOfRevenue *= opexMult;
    }
  }

  const bps = legacy.interestRate ?? 0;
  if (bps !== 0) {
    if (fin.rateType === "floating") {
      fin.baseRatePercent = (Number(fin.baseRatePercent) || 0) + bps / 100;
    } else {
      fin.fixedOrProfitRatePercent =
        (Number(fin.fixedOrProfitRatePercent) || 0) + bps / 100;
    }
  }

  const capBps = legacy.exitCapRate ?? 0;
  if (capBps !== 0) {
    fin.saleCapRate = (Number(fin.saleCapRate) || 7) + capBps / 100;
  }

  const extraMonths = Math.round(legacy.constructionDuration ?? 0);
  if (extraMonths !== 0) {
    fin.constructionPeriodMonths =
      Math.round(Number(fin.constructionPeriodMonths) || 0) + extraMonths;
    co.constructionPeriod = Math.max(
      Number(co.constructionPeriod) || 0,
      fin.constructionPeriodMonths
    );
  }

  return out;
}

function computeExitProceeds(params: {
  financing: any;
  hotelPnl: ReturnType<typeof computeOperationalHotelHoldPnl> | null;
}): number {
  const { financing, hotelPnl } = params;
  const exitYear = Math.max(
    4,
    Math.min(13, Math.round(Number(financing.exitYear ?? 13) || 13))
  );
  const exitStrategy = (financing.exitStrategy ?? "hold") as
    | "sale"
    | "refinance"
    | "hold";
  const saleCapRatePct = Math.max(
    0.0001,
    Number(financing.saleCapRate ?? 7) || 7
  );
  const saleCostsPct = Math.max(0, Number(financing.saleCosts ?? 3) || 0);
  const refinanceLtcPct = Math.max(
    0,
    Math.min(100, Number(financing.refinanceLtc ?? 60) || 60)
  );
  const exitIdx = exitYear - 4;
  const ebitda = hotelPnl?.ebitda?.[exitIdx] ?? 0;
  const terminalValue =
    saleCapRatePct > 0 ? ebitda / (saleCapRatePct / 100) : 0;
  const sellingCosts =
    exitStrategy === "sale" ? terminalValue * (saleCostsPct / 100) : 0;
  const grossProceeds =
    exitStrategy === "sale" || exitStrategy === "hold"
      ? Math.max(0, terminalValue - sellingCosts)
      : exitStrategy === "refinance"
        ? Math.max(0, terminalValue * (refinanceLtcPct / 100))
        : 0;

  const loanPayoff = financing.amortizationSchedule?.[exitIdx]?.endBal ?? 0;
  const lockoutYears = Math.max(
    0,
    Math.round(Number(financing.prepaymentLockoutYears ?? 0) || 0)
  );
  const penalties = [...(financing.prepaymentPenalty ?? [5, 4, 3, 2, 1])];
  while (penalties.length < 5) penalties.push(0);
  const rateIdx = Math.min(4, Math.max(0, exitIdx));
  const stepDownPct = Math.max(0, Number(penalties[rateIdx] ?? 0) || 0);
  const effectivePct =
    lockoutYears > 0 && exitIdx < lockoutYears
      ? Math.max(stepDownPct, Math.max(0, Number(penalties[0] ?? 0) || 0))
      : stepDownPct;
  const penalty = loanPayoff <= 0 ? 0 : (loanPayoff * effectivePct) / 100;

  return Math.max(0, grossProceeds - penalty);
}

/**
 * Build full C4 runtime from operational stream data + global cash inflows (matches financing preview sources).
 */
export function buildOperationalLeveredEngineArgs(
  snap: OperationalScenarioSnapshot,
  opts: { isClient: boolean; isDataReady: boolean }
): OperationalLeveredModelInputs & OperationalLeveredModelRuntime {
  const cashInflows = snap.cashInflows;
  const cashOutflows = snap.cashOutflows;
  const financing = snap.financing;
  const projectInfo = snap.projectInfo;
  const hotelHoldSnapshot = snap.hotelHoldSnapshot;

  const totalCosts =
    cashOutflows.tdc ||
    (cashOutflows.landCost || 0) +
      (cashOutflows.constructionCost || 0) +
      (cashOutflows.softCosts || 0) +
      (cashOutflows.powc || 0) +
      (cashOutflows.ffe || 0);

  const grossDevelopmentValue =
    cashInflows.grossSales ||
    (cashInflows.monthlyInflowSchedule?.reduce(
      (sum: number, p: { amount?: number }) => sum + (p.amount || 0),
      0
    ) || 0);

  const constructionPeriod =
    Math.max(
      cashOutflows.constructionPeriod ?? 0,
      financing.constructionPeriodMonths ?? 0
    ) || 30;

  const holdPeriodYears = financing.holdPeriodYears || 10;
  const operationsStartMonth = calculateOperationsStartMonth(constructionPeriod);
  const stabilizationEndMonth = operationsStartMonth - 1;
  const repaymentHorizonMonths = Math.round(holdPeriodYears * 12);
  const totalHoldPeriodMonths = Math.max(
    constructionPeriod + 90,
    stabilizationEndMonth + repaymentHorizonMonths
  );

  const debtFromLTC = totalCosts * ((financing.loanToCostPercent || 65) / 100);
  const debtFromLTV =
    grossDevelopmentValue * ((financing.maxLtvPercent || 60) / 100);
  const approvedDebtAmount = Math.min(debtFromLTC, debtFromLTV);
  const debtFacilityAmount =
    financing.debtFacilityAmount && financing.debtFacilityAmount > 0
      ? financing.debtFacilityAmount
      : approvedDebtAmount;

  const effectiveInterestRate =
    financing.rateType === "floating"
      ? (financing.baseRatePercent || 0) + (financing.marginPercent || 0)
      : financing.fixedOrProfitRatePercent || 8;
  const amortizationPeriod = financing.amortizationYears || 7;
  const monthlyInterestRate = effectiveInterestRate / 100 / 12;

  const idcTreatmentData = loadFromSessionStorage<{
    treatment: "capitalized" | "current" | "hybrid";
    sharePercent: number;
  }>(STORAGE_KEYS.idcTreatment, {
    treatment: financing?.idcTreatment ?? "capitalized",
    sharePercent: financing?.idcCapitalizedSharePercent ?? 100,
  });
  let idcCapitalizedSharePercent = Number(idcTreatmentData.sharePercent) || 0;
  if (idcTreatmentData.treatment === "current") idcCapitalizedSharePercent = 0;
  if (idcTreatmentData.treatment === "capitalized") idcCapitalizedSharePercent = 100;
  const idcCapitalizedShare = idcCapitalizedSharePercent / 100;

  const monthlyDrawdowns = (() => {
    if (!opts.isClient || !opts.isDataReady) return [] as number[];
    const fromSession = loadFromSessionStorage<number[]>(
      STORAGE_KEYS.drawdowns,
      []
    );
    if (Array.isArray(fromSession) && fromSession.length > 0)
      return fromSession;
    const fromStore = Array.isArray(financing?.monthlyDrawdowns)
      ? (financing.monthlyDrawdowns as number[])
      : [];
    return fromStore;
  })();

  const amortizationSchedule = (() => {
    const fromStore = Array.isArray(financing?.amortizationSchedule)
      ? financing.amortizationSchedule
      : [];
    if (fromStore.length > 0) return fromStore as any[];
    return loadFromSessionStorage<any[]>(STORAGE_KEYS.amortization, []);
  })();

  const outflowProfile = buildCashOutflowProfile(cashOutflows);

  const constructionCostSchedule = (() => {
    const schedule = Array(totalHoldPeriodMonths + 1).fill(0);
    const scheduleMaybe = (cashOutflows as any)?.constructionSchedule;
    if (Array.isArray(scheduleMaybe)) {
      for (const entry of scheduleMaybe) {
        const month = Number(entry?.month ?? entry?.m ?? 0);
        const amount = Number(entry?.amount ?? entry?.value ?? 0);
        if (Number.isFinite(month) && month >= 0 && month < schedule.length) {
          schedule[month] += Number.isFinite(amount) ? amount : 0;
        }
      }
    } else {
      for (let m = 0; m < schedule.length; m++) {
        schedule[m] = outflowProfile.construction?.[m] || 0;
      }
    }
    const expected = cashOutflows.constructionCost || 0;
    const actual = schedule.reduce((sum, v) => sum + (v || 0), 0);
    const diff = expected - actual;
    const lastConstructionMonth = Math.min(
      constructionPeriod,
      schedule.length - 1
    );
    if (Math.abs(diff) > 1 && lastConstructionMonth >= 0) {
      schedule[lastConstructionMonth] += diff;
    }
    return schedule;
  })();

  const bulkShare =
    (cashInflows.bulkSales?.bulkSalesSharePercent ?? 0) / 100;
  const inflowScheduleMap = (() => {
    const map = new Map<number, number>();
    for (const p of cashInflows.monthlyInflowSchedule || []) {
      const prev = map.get(p.month) || 0;
      map.set(p.month, prev + (p.amount || 0));
    }
    return map;
  })();

  const hotelPnl = hotelHoldSnapshot
    ? computeOperationalHotelHoldPnl(
        hotelHoldSnapshot,
        cashOutflows.constructionCost || 0,
        cashOutflows.ffe || 0
      )
    : null;

  const changeInWorkingCapitalYearly = (() => {
    const nYears = 10;
    if (!hotelPnl || !hotelHoldSnapshot)
      return Array.from({ length: nYears }, () => 0);
    const arM =
      Number(hotelHoldSnapshot.depFieldValues?.accountsReceivableMonths) || 0;
    const apM =
      Number(hotelHoldSnapshot.depFieldValues?.accountsPayableMonths) || 0;
    const nwcLevels = Array.from({ length: nYears }, (_, i) => {
      const rev = hotelPnl.totalHotelRevenue[i] ?? 0;
      const opex = hotelPnl.totalExpenses[i] ?? 0;
      return (arM / 12) * rev - (apM / 12) * opex;
    });
    return nwcLevels.map((w, i) => w - (i > 0 ? nwcLevels[i - 1]! : 0));
  })();

  const ffeRenovationOps = Math.max(0, (cashOutflows.ffe || 0) * 0.5);

  const exitYear = Math.max(
    4,
    Math.min(13, Math.round(Number(financing.exitYear ?? 13) || 13))
  );
  const exitStrategy = (financing.exitStrategy ?? "hold") as
    | "sale"
    | "refinance"
    | "hold";
  const exitProceeds = computeExitProceeds({ financing, hotelPnl });

  const totalLandCost = cashOutflows.landCost || 0;

  const dynamicPeakEquityRequired = Math.max(
    0,
    (cashOutflows.tdc || totalCosts) - (debtFacilityAmount || 0)
  );

  return {
    cashInflows,
    cashOutflows,
    financing,
    projectInfo,
    finStream: "operational",
    isClient: opts.isClient,
    isDataReady: opts.isDataReady,
    hotelHoldSnapshot,
    constructionPeriod,
    operationsStartMonth,
    totalHoldPeriodMonths,
    holdPeriodYears,
    amortizationPeriod,
    monthlyInterestRate,
    debtFacilityAmount,
    totalLandCost,
    totalCosts,
    monthlyDrawdowns,
    amortizationSchedule,
    outflowProfile,
    constructionCostSchedule,
    hotelPnl,
    changeInWorkingCapitalYearly,
    bulkShare,
    inflowScheduleMap,
    idcCapitalizedShare,
    exitYear,
    exitStrategy,
    exitProceeds,
    ffeRenovationOps,
    dynamicPeakEquityRequired,
  };
}

/** Aggregated headline metrics for scenario comparison UI. */
export type ScenarioEngineMetrics = {
  projectLeveredIrrPct: number;
  equityIrrPct: number;
  equityMultiple: number;
  /** C4 CF-sign equity multiple (matches financing preview headline). */
  equityMultipleFromCF: number;
  equityPaybackMonth: number | null;
  peakEquityInjected: number;
  totalLoanDrawdown: number;
  minDscr: number;
};

export type OperationalScenarioEngineRun = {
  metrics: ScenarioEngineMetrics;
  monthlyData: ReturnType<
    typeof calculateOperationalLeveredModel
  >["monthlyData"];
};

/**
 * Run operational C4 → C5 for one scenario branch (base / upside / downside).
 */
export function runOperationalScenarioEngines(
  snap: OperationalScenarioSnapshot,
  scenario: OperationalScenarioId,
  opts: { isClient: boolean; isDataReady: boolean }
): OperationalScenarioEngineRun {
  const tweaked = applyOperationalScenario(snap, scenario);
  const args = buildOperationalLeveredEngineArgs(tweaked, opts);
  const c4 = calculateOperationalLeveredModel(args);
  const md = c4.monthlyData ?? [];
  const financing = tweaked.financing ?? {};
  const ps = financing.preferenceShares ?? {};
  const constructionPeriod = args.constructionPeriod;
  const stabilizationEndMonth = args.operationsStartMonth - 1;
  const operationalFyeMonths: number[] = [];
  for (let oy = 1; oy <= 10; oy++) {
    operationalFyeMonths.push(
      getOperationalYearMonthRange(oy, constructionPeriod).endMonth
    );
  }
  const horizonMonths = Math.max(args.totalHoldPeriodMonths + 1, md.length);
  const resolvedTenorMonths =
    Number(ps.tenorMonths) || DEFAULT_PREFERENCE_TENOR_MONTHS;

  const c5 = calculateEquityReturns(md, {
    hasPreference: !!(ps.hasPreferenceShares && Number(ps.amount) > 0),
    amount: Number(ps.amount) || 0,
    returnPercent: Number(ps.returnPercent) || 0,
    returnType: String(ps.returnType ?? ""),
    tenorMonths: resolvedTenorMonths,
    constructionPeriod,
    stabilizationEndMonth,
    operationalFyeMonths,
    horizonMonths,
  });

  const dscrVals = md
    .map((r: { dscr?: number | null }) => r.dscr)
    .filter((d): d is number => typeof d === "number" && d > 0);
  const minDscr = dscrVals.length > 0 ? Math.min(...dscrVals) : 1.25;

  const totalLoanDrawdown = md.reduce(
    (sum, row) => sum + (Number((row as { loanDrawdown?: number }).loanDrawdown) || 0),
    0
  );

  const metrics: ScenarioEngineMetrics = {
    projectLeveredIrrPct: Number(c4.projectMetrics?.leveredEquityIRR) || 0,
    /** C4 levered equity series (land + cash injections, terminal cumulative NCF) — matches Component 4. */
    equityIrrPct: Number(c4.projectMetrics?.leveredEquityIRR) || 0,
    equityMultiple: Number(c5.metrics?.multiple) || 0,
    equityMultipleFromCF:
      Number(c4.projectMetrics?.equityMultipleFromCF) ||
      Number(c4.projectMetrics?.equityMultiple) ||
      0,
    equityPaybackMonth:
      c5.metrics.payback != null && c5.metrics.payback >= 0
        ? c5.metrics.payback
        : null,
    peakEquityInjected: Number(c4.projectMetrics?.peakEquityInjected) || 0,
    totalLoanDrawdown,
    minDscr,
  };

  return { metrics, monthlyData: md };
}
