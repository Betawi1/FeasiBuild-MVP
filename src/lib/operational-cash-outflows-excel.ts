import {
  DEFAULT_POWC_ALLOCATION,
  DEFAULT_SOFT_COST_ALLOCATION,
} from "@/lib/cash-outflow-default-allocations";
import {
  allocatePowcSubMonthlyFromStep13,
  POWC_STEP13_TIMING_NOTES,
  SOFT_COSTS_TIMING_NOTES,
} from "@/lib/cash-outflow-powc-timing";
import type { ExcelCell } from "@/lib/downloads/exportToExcel";
import type {
  CashOutflows,
  ProjectInfo,
  SoftCostAllocation,
} from "@/store/useFinModelStore";

/** Slice of `buildCashOutflowProfile` output needed for monthly export rows. */
export type MonthlyExportProfile = {
  months: number[];
  construction: number[];
  ffe: number[];
  softCosts: number[];
  powc: number[];
  monthlyTotal: number[];
  cumulative: number[];
};

/** Section / padding row: label in column A; month + total cells blank. */
function monthlySectionHeaderRow(
  label: string,
  monthCount: number
): (string | number | null)[] {
  return [label, ...Array.from({ length: monthCount + 1 }, () => "")];
}

/** M0–M2-style weights extended to `totalMonths` (zeros after index 2). */
function lineWeights3(
  totalMonths: number,
  a0: number,
  a1: number,
  a2: number
): number[] {
  const arr = new Array(totalMonths).fill(0);
  if (totalMonths > 0) arr[0] = a0;
  if (totalMonths > 1) arr[1] = a1;
  if (totalMonths > 2) arr[2] = a2;
  const s = arr.reduce((x, y) => x + y, 0);
  if (s <= 0) return arr;
  return arr.map((x) => x / s);
}

/**
 * Soft sub-lines per month: architect front-loaded, PM even, engineering peaks (M2),
 * geotechnical early, other even. Normalized so Σ lines = softByMonth[m] each month.
 */
export function allocateSoftCostSubMonthly(
  softByMonth: number[],
  softTotal: number,
  sc: SoftCostAllocation
): {
  architect: number[];
  projectManagement: number[];
  engineering: number[];
  geotechnical: number[];
  otherFees: number[];
} {
  const tm = softByMonth.length;
  const z = () => new Array(tm).fill(0);
  const out = {
    architect: z(),
    projectManagement: z(),
    engineering: z(),
    geotechnical: z(),
    otherFees: z(),
  };
  if (tm === 0 || softTotal <= 0) return out;

  const L = {
    architect: (softTotal * sc.architect) / 100,
    projectManagement: (softTotal * sc.projectManagement) / 100,
    engineering: (softTotal * sc.engineering) / 100,
    geotechnical: (softTotal * sc.geotechnical) / 100,
    otherFees: (softTotal * sc.otherFees) / 100,
  };

  const wArch = lineWeights3(tm, 0.5, 0.35, 0.15);
  const wPm = lineWeights3(tm, 1 / 3, 1 / 3, 1 / 3);
  const wEng = lineWeights3(tm, 0.15, 0.35, 0.5);
  const wGeo = lineWeights3(tm, 0.7, 0.3, 0);
  const wOth = lineWeights3(tm, 1 / 3, 1 / 3, 1 / 3);

  for (let m = 0; m < tm; m++) {
    const rawArch = L.architect * wArch[m];
    const rawPm = L.projectManagement * wPm[m];
    const rawEng = L.engineering * wEng[m];
    const rawGeo = L.geotechnical * wGeo[m];
    const rawOth = L.otherFees * wOth[m];
    const R = rawArch + rawPm + rawEng + rawGeo + rawOth;
    const sm = softByMonth[m] ?? 0;
    if (R <= 0 || sm <= 0) continue;
    out.architect[m] = (sm * rawArch) / R;
    out.projectManagement[m] = (sm * rawPm) / R;
    out.engineering[m] = (sm * rawEng) / R;
    out.geotechnical[m] = (sm * rawGeo) / R;
    out.otherFees[m] = (sm * rawOth) / R;
  }

  return out;
}

export type OperationalMonthlyExportArgs = {
  profile: MonthlyExportProfile;
  cashOutflows: CashOutflows;
  projectInfo: ProjectInfo;
  roundTo1dp: (n: number) => number;
  lastConstructionIdx: number;
  constructionTotalThousandsDisplayed: number;
  previousConstructionMonthsSumDisplayed: number;
};

/**
 * Operational "Monthly (000)": columns = M0…Mn + Total; rows = cost lines
 * (profile timing for construction / POWC / soft; FFE ∝ construction when hotel).
 */
export function buildOperationalMonthlyExportRows(
  args: OperationalMonthlyExportArgs
): (string | number | null)[][] {
  const {
    profile,
    cashOutflows,
    projectInfo,
    roundTo1dp,
    lastConstructionIdx,
    constructionTotalThousandsDisplayed,
    previousConstructionMonthsSumDisplayed,
  } = args;

  const months = profile.months;
  if (months.length === 0) return [];

  const headerRow: (string | number | null)[] = [
    "",
    ...months.map((m) => `M${m}`),
    "Total",
  ];

  const rowFromMonthly = (
    label: string,
    monthly: number[],
    totalAmt: number
  ): (string | number | null)[] => [
    label,
    ...months.map((_, idx) => {
      const v = roundTo1dp((monthly[idx] || 0) / 1000);
      return v > 0 ? v : null;
    }),
    roundTo1dp(totalAmt / 1000),
  ];

  const landRow: (string | number | null)[] = [
    "Land Cost",
    ...months.map((_, idx) =>
      idx === 0 ? roundTo1dp(cashOutflows.landCost / 1000) : null
    ),
    roundTo1dp(cashOutflows.landCost / 1000),
  ];

  const constructionRow: (string | number | null)[] = [
    "Construction Cost",
    ...months.map((_, idx) => {
      const isLastConstructionMonth = idx === lastConstructionIdx;
      const baseDisplayedThousands = roundTo1dp(
        (profile.construction[idx] || 0) / 1000
      );
      const displayedThousands = isLastConstructionMonth
        ? roundTo1dp(
            constructionTotalThousandsDisplayed -
              previousConstructionMonthsSumDisplayed
          )
        : baseDisplayedThousands;
      return displayedThousands > 0 ? displayedThousands : null;
    }),
    constructionTotalThousandsDisplayed,
  ];

  const ffeTotal = cashOutflows.ffe || 0;
  // Single source of truth: FFE monthly series should come from the already-built profile.
  // Avoid recomputing from construction weights because construction display can be "plugged"
  // for rounding parity, which would otherwise change FFE weights.
  const ffeMonthly = profile.ffe || [];
  const showFfe = ffeTotal > 0 && projectInfo.buildingType === "hotel";

  const period = cashOutflows.constructionPeriod || 0;
  const powcSubs = allocatePowcSubMonthlyFromStep13(
    cashOutflows.powc || 0,
    period,
    cashOutflows.powcAllocation ?? { ...DEFAULT_POWC_ALLOCATION }
  );

  const sc =
    cashOutflows.softCostAllocation ?? { ...DEFAULT_SOFT_COST_ALLOCATION };
  const softSubs = allocateSoftCostSubMonthly(
    profile.softCosts,
    cashOutflows.softCosts || 0,
    sc
  );

  const monthlyTotalRow: (string | number | null)[] = [
    "Monthly Total",
    ...months.map((_, idx) =>
      roundTo1dp((profile.monthlyTotal[idx] || 0) / 1000)
    ),
    roundTo1dp((cashOutflows.tdc || 0) / 1000),
  ];

  const cumulativeRow: (string | number | null)[] = [
    "Cumulative",
    ...months.map((_, idx) =>
      roundTo1dp((profile.cumulative[idx] || 0) / 1000)
    ),
    roundTo1dp(
      (profile.cumulative[profile.cumulative.length - 1] || 0) / 1000
    ),
  ];

  const rows: (string | number | null)[][] = [
    headerRow,
    landRow,
    constructionRow,
  ];

  if (showFfe) {
    rows.push(rowFromMonthly("FFE", ffeMonthly, ffeTotal));
  }

  const po = cashOutflows.powcAllocation ?? { ...DEFAULT_POWC_ALLOCATION };
  const powcTotal = cashOutflows.powc || 0;
  const softTotal = cashOutflows.softCosts || 0;

  rows.push(
    monthlySectionHeaderRow("POWC", months.length),
    rowFromMonthly(
      "Site Establishment",
      powcSubs.site,
      (powcTotal * po.siteEstablishment) / 100
    ),
    rowFromMonthly(
      "Overhead",
      powcSubs.overhead,
      (powcTotal * po.overhead) / 100
    ),
    rowFromMonthly(
      "Authority Fees",
      powcSubs.authority,
      (powcTotal * po.authorityFees) / 100
    ),
    rowFromMonthly("POWC (total)", profile.powc, powcTotal),
    monthlySectionHeaderRow("Soft Costs", months.length),
    rowFromMonthly(
      "Main Architect",
      softSubs.architect,
      (softTotal * sc.architect) / 100
    ),
    rowFromMonthly(
      "Project Management",
      softSubs.projectManagement,
      (softTotal * sc.projectManagement) / 100
    ),
    rowFromMonthly(
      "Engineering Consultant",
      softSubs.engineering,
      (softTotal * sc.engineering) / 100
    ),
    rowFromMonthly(
      "Geotechnical Consultant",
      softSubs.geotechnical,
      (softTotal * sc.geotechnical) / 100
    ),
    rowFromMonthly(
      "Other Fees",
      softSubs.otherFees,
      (softTotal * sc.otherFees) / 100
    ),
    rowFromMonthly("Soft Costs (total)", profile.softCosts, softTotal),
    monthlyTotalRow,
    cumulativeRow
  );

  return rows;
}

function fmtMoney(value: number, currency: string): string {
  const n = Math.round(value);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

function fmtPlain(value: number): string {
  return Math.round(value).toLocaleString();
}

/**
 * Operational preview Excel: Key Metrics, Cost Breakdown (POWC/SC sub-lines from Step 13 % in store),
 * Assumptions. Used together with Step 13 inputs + Monthly sheets from the preview page.
 */
export function buildOperationalCashOutExcelSheets(
  projectInfo: ProjectInfo,
  cashOutflows: CashOutflows
): { sheetName: string; data: ExcelCell[][] }[] {
  const currency = projectInfo.currency || "AED";
  const ccWithContingency = cashOutflows.constructionCost || 0;
  const pct = cashOutflows.contingencyPercent ?? 0;
  const baseCC =
    cashOutflows.baseConstructionCost ??
    (pct >= 0 && ccWithContingency > 0
      ? ccWithContingency / (1 + pct / 100)
      : 0);
  const contingencyAmount = Math.max(0, ccWithContingency - baseCC);

  const landCost = cashOutflows.landCost || 0;
  const powcTotal = cashOutflows.powc || 0;
  const softTotal = cashOutflows.softCosts || 0;
  const ffeTotal = cashOutflows.ffe || 0;
  const tdc = cashOutflows.tdc || 0;

  const po = cashOutflows.powcAllocation ?? { ...DEFAULT_POWC_ALLOCATION };
  const sc = cashOutflows.softCostAllocation ?? {
    ...DEFAULT_SOFT_COST_ALLOCATION,
  };

  const powcSite = Math.round((powcTotal * po.siteEstablishment) / 100);
  const powcOh = Math.round((powcTotal * po.overhead) / 100);
  const powcAuth = Math.round(powcTotal - powcSite - powcOh);

  const scArch = Math.round((softTotal * sc.architect) / 100);
  const scPm = Math.round((softTotal * sc.projectManagement) / 100);
  const scEng = Math.round((softTotal * sc.engineering) / 100);
  const scGeo = Math.round((softTotal * sc.geotechnical) / 100);
  const scOther = Math.round(softTotal - scArch - scPm - scEng - scGeo);

  const keyMetricsData: ExcelCell[][] = [
    ["Key Metrics", "Value"],
    ["Total Development Cost", fmtMoney(tdc, currency)],
    ["Construction Cost (incl. contingency)", fmtMoney(ccWithContingency, currency)],
    ["POWC Total", fmtMoney(powcTotal, currency)],
    ["Soft Costs Total", fmtMoney(softTotal, currency)],
    ["FFE Total", fmtMoney(ffeTotal, currency)],
    ["Land Cost", fmtMoney(landCost, currency)],
  ];

  const costBreakdownData: ExcelCell[][] = [
    ["Cost Category", "Item", "Amount", "% of category", "Notes"],
    [
      "Land Cost",
      "Total land cost",
      fmtPlain(landCost),
      "-",
      "From Component 1 land step",
    ],
    ["", "", "", "", ""],
    [
      "Construction Cost (CC)",
      "Base construction",
      fmtPlain(baseCC),
      "-",
      "Before contingency",
    ],
    [
      "Construction Cost (CC)",
      "Contingency",
      fmtPlain(contingencyAmount),
      "-",
      `${pct}% of base CC`,
    ],
    [
      "Construction Cost (CC)",
      "Subtotal (CC incl. contingency)",
      fmtPlain(ccWithContingency),
      "-",
      "Matches construction cost in model",
    ],
    ["", "", "", "", ""],
    [
      "POWC",
      "Site establishment",
      fmtPlain(powcSite),
      `${po.siteEstablishment}%`,
      "Site bucket timing: 40% M1, 30% M2, 30% M3 (M0, M4+ zero; normalized if n < 3).",
    ],
    [
      "POWC",
      "Overhead costs",
      fmtPlain(powcOh),
      `${po.overhead}%`,
      "Even spread across M1–Mn in cash model.",
    ],
    [
      "POWC",
      "Authority fees",
      fmtPlain(powcAuth),
      `${po.authorityFees}%`,
      "50% first 2 months, 50% last 3 months in cash model.",
    ],
    [
      "POWC",
      "Subtotal",
      fmtPlain(powcTotal),
      "100%",
      "Sum of POWC lines (rounded)",
    ],
    ["", "", "", "", ""],
    [
      "Soft Costs (SC)",
      "Main architect",
      fmtPlain(scArch),
      `${sc.architect}%`,
      "Aggregate soft cash: 50% M0, 30% M1, 20% M2 (model curve).",
    ],
    [
      "Soft Costs (SC)",
      "Project management",
      fmtPlain(scPm),
      `${sc.projectManagement}%`,
      "Share of total soft costs (Step 13).",
    ],
    [
      "Soft Costs (SC)",
      "Engineering consultant",
      fmtPlain(scEng),
      `${sc.engineering}%`,
      "Share of total soft costs (Step 13).",
    ],
    [
      "Soft Costs (SC)",
      "Geotechnical consultant",
      fmtPlain(scGeo),
      `${sc.geotechnical}%`,
      "Share of total soft costs (Step 13).",
    ],
    [
      "Soft Costs (SC)",
      "Other fees",
      fmtPlain(scOther),
      `${sc.otherFees}%`,
      "Legal, marketing, insurance, etc.",
    ],
    [
      "Soft Costs (SC)",
      "Subtotal",
      fmtPlain(softTotal),
      "100%",
      "Sum of soft lines (rounded)",
    ],
    ["", "", "", "", ""],
    [
      "FFE",
      "Total FFE",
      fmtPlain(ffeTotal),
      "-",
      projectInfo.buildingType === "hotel"
        ? "Hotel — % of CC incl. contingency in wizard"
        : "N/A for non-hotel",
    ],
    ["", "", "", "", ""],
    [
      "TOTAL",
      "Total development cost",
      fmtPlain(tdc),
      "100%",
      "Land + DC (per generated model)",
    ],
  ];

  const assumptionsData: ExcelCell[][] = [
    ["Cost allocation (Step 13 — same as wizard inputs)", "", ""],
    ["", "", ""],
    ["POWC breakdown", "%", "Timing in monthly model"],
    ["Site establishment", `${po.siteEstablishment}%`, POWC_STEP13_TIMING_NOTES],
    ["Overhead costs", `${po.overhead}%`, "Even across construction months."],
    [
      "Authority fees",
      `${po.authorityFees}%`,
      "50% first 2 months; 50% last 3 months.",
    ],
    [
      "Total",
      `${po.siteEstablishment + po.overhead + po.authorityFees}%`,
      "Must equal 100% in wizard.",
    ],
    ["", "", ""],
    ["Soft costs breakdown", "%", "Aggregate cash timing"],
    ["Main architect", `${sc.architect}%`, SOFT_COSTS_TIMING_NOTES],
    ["Project management", `${sc.projectManagement}%`, ""],
    ["Engineering consultant", `${sc.engineering}%`, ""],
    ["Geotechnical consultant", `${sc.geotechnical}%`, ""],
    ["Other fees", `${sc.otherFees}%`, ""],
    [
      "Total",
      `${
        sc.architect +
        sc.projectManagement +
        sc.engineering +
        sc.geotechnical +
        sc.otherFees
      }%`,
      "Must equal 100% in wizard.",
    ],
    ["", "", ""],
    [
      "Note",
      "Percentages and amounts use `cashOutflows` from the store (Component 1).",
      "",
    ],
  ];

  return [
    { sheetName: "Key Metrics", data: keyMetricsData },
    { sheetName: "Cost Breakdown", data: costBreakdownData },
    { sheetName: "Assumptions", data: assumptionsData },
  ];
}

/** Flat rows to prepend to CSV for operational stream. */
export function buildOperationalCashOutCsvPrefix(
  projectInfo: ProjectInfo,
  cashOutflows: CashOutflows
): ExcelCell[][] {
  const sheets = buildOperationalCashOutExcelSheets(
    projectInfo,
    cashOutflows
  );
  const out: ExcelCell[][] = [
    ["Operational cash outflows — summary export"],
    [],
  ];
  for (const s of sheets) {
    out.push([`--- ${s.sheetName} ---`]);
    out.push(...s.data);
    out.push([]);
  }
  return out;
}
