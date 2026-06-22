import type {
  Jurisdiction,
  MonthlyRow as EngineMonthlyRow,
} from "@/lib/financing-engine/generate-cash-flow";

export type FinancingCashFlowExportOpts = {
  rows: EngineMonthlyRow[];
  jurisdiction: Jurisdiction;
  hideEscrowRows?: boolean;
  projectLabel?: string;
};

type ExportRowSpec = {
  section?: string;
  label?: string;
  get?: (r: EngineMonthlyRow) => number;
  /** How to fill the TOTAL column */
  totalMode?: "sum" | "none" | "last";
  /** Export discount rate as % points (e.g. 8.5) */
  asPercentPoints?: boolean;
};

function exportCellThousands(value: number): number | null {
  if (!Number.isFinite(value) || value === 0 || Object.is(value, -0)) return null;
  return Math.round(value / 1000);
}

function totalForMode(
  values: number[],
  mode: ExportRowSpec["totalMode"],
  asPercentPoints?: boolean
): number | string | null {
  if (mode === "none") return null;
  if (asPercentPoints) return null;
  if (mode === "last") {
    const last = values[values.length - 1] ?? 0;
    return exportCellThousands(last);
  }
  const sum = values.reduce((s, v) => s + (Number(v) || 0), 0);
  return exportCellThousands(sum);
}

function pushSection(
  out: (string | number | null)[][],
  spec: ExportRowSpec,
  dataRows: EngineMonthlyRow[]
) {
  if (!spec) {
    console.error("pushSection called with undefined spec");
    return;
  }

  if (spec.section) {
    out.push([spec.section]);
  }

  // Section-only header rows (e.g. Australia CASH INFLOWS) have no data line
  if (typeof spec.get !== "function" || spec.label == null) {
    return;
  }

  const getValue = spec.get;
  const values = dataRows.map((r) => {
    try {
      return getValue(r);
    } catch {
      console.warn(`Failed to read export value for "${spec.label}" at month ${r.month}`);
      return 0;
    }
  });
  const mode = spec.totalMode ?? "sum";
  out.push([
    spec.label,
    ...values.map((v) => {
      if (spec.asPercentPoints) {
        return Number.isFinite(v) ? Math.round(v * 10000) / 100 : null;
      }
      return exportCellThousands(v);
    }),
    totalForMode(values, mode, spec.asPercentPoints),
  ]);
}

function uaeSpecs(hideEscrow: boolean): ExportRowSpec[] {
  const specs: ExportRowSpec[] = [
    { section: "CASH INFLOWS", label: "Sales proceeds", get: (r) => r.salesProceeds },
  ];
  if (!hideEscrow) {
    specs.push(
      {
        label: "Escrow account balance",
        get: (r) => r.escrowBalance,
        totalMode: "none",
      },
      { label: "Escrow interest income", get: (r) => r.escrowInterest },
      { label: "Escrow account fees", get: (r) => r.escrowAccountFees },
      { label: "Escrow releases", get: (r) => r.escrowReleases },
      { label: "Progress withdrawal", get: (r) => r.progressWithdrawal }
    );
  }
  specs.push(
    { section: "CASH OUTFLOWS", label: "Construction costs", get: (r) => r.constructionCosts },
    { label: "Soft costs", get: (r) => r.softCosts },
    { label: "POWC", get: (r) => r.powc },
    {
      label: "Total outflows (excl. land costs)",
      get: (r) => r.totalOutflowsExclLand,
    },
    { label: "Land cost", get: (r) => r.landCost },
    {
      label: "Total outflows (incl. land costs)",
      get: (r) => r.totalOutflowsInclLand,
    },
    { label: "NET CASH FLOWS (NCF)", get: (r) => r.ncf },
    { section: "CONSTRUCTION LOAN", label: "Loan drawdown", get: (r) => r.constLoanDrawdown },
    {
      label: "Cumulative drawdown",
      get: (r) => r.constLoanCumulative,
      totalMode: "last",
    },
    { label: "Interest payment", get: (r) => r.constLoanInterest },
    { label: "Loan repayment", get: (r) => r.constLoanRepayment },
    { label: "Commitment fee", get: (r) => r.constLoanCommitmentFee },
    { section: "PREF. SHARES / MEZZANINE CAPITAL", label: "Pref. drawdown", get: (r) => r.prefDrawdown },
    { label: "Pref. dividend", get: (r) => r.prefDividend },
    { label: "Pref. repayment", get: (r) => r.prefRepayment },
    { section: "EQUITY CAPITAL", label: "Capital—land injection", get: (r) => r.capitalLand },
    { label: "Capital—cash injection", get: (r) => r.capitalCash },
    {
      label: "Cumulative capital",
      get: (r) => r.cumulativeCapital,
      totalMode: "last",
    },
    { section: "BOTTOM LINE", label: "NCF after loan & equity", get: (r) => r.ncfAfterFinancing },
    {
      label: "Cumulative NCF",
      get: (r) => r.cumulativeNcf,
      totalMode: "last",
    },
    {
      section: "INTERNAL RATE OF RETURN",
      label: "Cash flows (equity)",
      get: (r) => r.irrCashFlow,
    },
    {
      label: "Discount rate",
      get: (r) => r.irrDiscountRate,
      totalMode: "none",
      asPercentPoints: true,
    },
    { label: "NPV", get: (r) => r.irrNpv }
  );
  return specs;
}

function malaysiaSpecs(hideEscrow: boolean): ExportRowSpec[] {
  const specs: ExportRowSpec[] = [
    { section: "CASH INFLOWS", label: "Sales proceeds", get: (r) => r.salesProceeds },
  ];
  if (!hideEscrow) {
    specs.push(
      {
        label: "Escrow account balance",
        get: (r) => r.escrowBalance,
        totalMode: "none",
      },
      { label: "Escrow interest income", get: (r) => r.escrowInterest },
      { label: "Escrow account fees", get: (r) => r.escrowAccountFees },
      { label: "Escrow releases", get: (r) => r.escrowReleases },
      { label: "Progress withdrawal", get: (r) => r.progressWithdrawal }
    );
  }
  specs.push(
    { section: "CASH OUTFLOWS", label: "Construction costs", get: (r) => r.constructionCosts },
    { label: "Soft costs", get: (r) => r.softCosts },
    { label: "POWC", get: (r) => r.powc },
    {
      label: "Total outflows (excl. land costs)",
      get: (r) => r.totalOutflowsExclLand,
    },
    { label: "Land cost", get: (r) => r.landCost },
    {
      label: "Total outflows (incl. land costs)",
      get: (r) => r.totalOutflowsInclLand,
    },
    { label: "NET CASH FLOWS (NCF)", get: (r) => r.ncf },
    { section: "LAND LOAN", label: "Loan drawdown", get: (r) => r.landLoanDrawdown },
    { label: "Interest payment", get: (r) => r.landLoanInterest },
    { label: "Loan repayment", get: (r) => r.landLoanRepayment },
    { label: "Loan fees", get: (r) => r.landLoanFees },
    { section: "CONSTRUCTION LOAN", label: "Loan drawdown", get: (r) => r.constLoanDrawdown },
    {
      label: "Cumulative drawdown",
      get: (r) => r.constLoanCumulative,
      totalMode: "last",
    },
    { label: "Interest payment", get: (r) => r.constLoanInterest },
    { label: "Loan repayment", get: (r) => r.constLoanRepayment },
    { label: "Commitment fee", get: (r) => r.constLoanCommitmentFee },
    { section: "PREF. SHARES / MEZZANINE CAPITAL", label: "Pref. drawdown", get: (r) => r.prefDrawdown },
    { label: "Pref. dividend", get: (r) => r.prefDividend },
    { label: "Pref. repayment", get: (r) => r.prefRepayment },
    { section: "EQUITY CAPITAL", label: "Capital—HDA deposit", get: (r) => r.capitalHdaDeposit },
    { label: "Capital—land injection", get: (r) => r.capitalLand },
    { label: "Capital—cash injection", get: (r) => r.capitalCash },
    {
      label: "Cumulative capital",
      get: (r) => r.cumulativeCapital,
      totalMode: "last",
    },
    { section: "BOTTOM LINE", label: "NCF after loan & equity", get: (r) => r.ncfAfterFinancing },
    {
      label: "Cumulative NCF",
      get: (r) => r.cumulativeNcf,
      totalMode: "last",
    },
    {
      section: "INTERNAL RATE OF RETURN",
      label: "Cash flows (equity)",
      get: (r) => r.irrCashFlow,
    },
    {
      label: "Discount rate",
      get: (r) => r.irrDiscountRate,
      totalMode: "none",
      asPercentPoints: true,
    },
    { label: "NPV", get: (r) => r.irrNpv }
  );
  return specs;
}

function australiaSpecs(hideEscrow: boolean): ExportRowSpec[] {
  const specs: ExportRowSpec[] = [];
  if (hideEscrow) {
    specs.push({
      section: "CASH INFLOWS",
      label: "Sales proceeds",
      get: (r) => r.salesProceeds,
    });
  } else {
    specs.push(
      {
        section: "CASH INFLOWS",
        label: "Locked-in Sales",
        get: (r) => r.lockedInSales,
      },
      {
        label: "Cumu. Locked-in Sales",
        get: (r) => r.cumuLockedInSales,
        totalMode: "last",
      },
      {
        label: "Cumu. Trust Account",
        get: (r) => r.cumuTrustAccount,
        totalMode: "none",
      },
      { label: "Trust Account Interest Income", get: (r) => r.trustAccountInterest },
      { label: "Trust Account Fees", get: (r) => r.trustAccountFees },
      { label: "Trust Account Releases", get: (r) => r.trustAccountReleases },
      { label: "Actual Sales Proceeds", get: (r) => r.actualSalesProceeds }
    );
  }
  specs.push(
    { section: "CASH OUTFLOWS", label: "Construction Costs", get: (r) => r.constructionCosts },
    { label: "Soft Costs", get: (r) => r.softCosts },
    { label: "POWC", get: (r) => r.powc },
    {
      label: "Total Outflows (excl. land costs)",
      get: (r) => r.totalOutflowsExclLand,
    },
    { label: "Land Cost", get: (r) => r.landCost },
    {
      label: "Total Outflows (incl. land costs)",
      get: (r) => r.totalOutflowsInclLand,
    },
    { label: "NET CASH FLOWS (NCF)", get: (r) => r.ncf },
    { section: "LAND LOAN", label: "Loan drawdown", get: (r) => r.landLoanDrawdown },
    { label: "Interest payment", get: (r) => r.landLoanInterest },
    { label: "Loan repayment", get: (r) => r.landLoanRepayment },
    { label: "Loan fees", get: (r) => r.landLoanFees },
    { section: "CONSTRUCTION LOAN", label: "Loan drawdown", get: (r) => r.constLoanDrawdown },
    {
      label: "Cumulative drawdown",
      get: (r) => r.constLoanCumulative,
      totalMode: "last",
    },
    { label: "Interest payment", get: (r) => r.constLoanInterest },
    { label: "Loan repayment", get: (r) => r.constLoanRepayment },
    { label: "Commitment fee", get: (r) => r.constLoanCommitmentFee },
    { section: "PREF. SHARES / MEZZANINE CAPITAL", label: "Pref. drawdown", get: (r) => r.prefDrawdown },
    { label: "Pref. dividend", get: (r) => r.prefDividend },
    { label: "Pref. repayment", get: (r) => r.prefRepayment },
    { section: "EQUITY CAPITAL", label: "Capital—land injection", get: (r) => r.capitalLand },
    { label: "Capital—cash injection", get: (r) => r.capitalCash },
    {
      label: "Cumulative capital",
      get: (r) => r.cumulativeCapital,
      totalMode: "last",
    },
    { section: "BOTTOM LINE", label: "NCF after loan & equity", get: (r) => r.ncfAfterFinancing },
    {
      label: "Cumulative NCF",
      get: (r) => r.cumulativeNcf,
      totalMode: "last",
    },
    {
      section: "INTERNAL RATE OF RETURN",
      label: "Cash flows (equity)",
      get: (r) => r.irrCashFlow,
    },
    {
      label: "Discount rate",
      get: (r) => r.irrDiscountRate,
      totalMode: "none",
      asPercentPoints: true,
    },
    { label: "NPV", get: (r) => r.irrNpv }
  );
  return specs;
}

function specsForJurisdiction(
  jurisdiction: Jurisdiction,
  hideEscrowRows: boolean
): ExportRowSpec[] {
  if (jurisdiction === "MALAYSIA") return malaysiaSpecs(hideEscrowRows);
  if (jurisdiction === "AUSTRALIA") return australiaSpecs(hideEscrowRows);
  return uaeSpecs(hideEscrowRows);
}

/** Build spreadsheet rows matching the on-screen Monthly Cash Flow Projection table (values in '000). */
export function buildFinancingCashFlowExportRows(
  opts: FinancingCashFlowExportOpts
): (string | number | null)[][] {
  const { rows, jurisdiction, hideEscrowRows = false, projectLabel } = opts;
  if (!rows.length) {
    return [["No financing cash flow data available. Complete Component 4 inputs first."]];
  }

  const dataRows = [...rows].sort((a, b) => a.month - b.month);
  const out: (string | number | null)[][] = [];

  out.push(["Financing Model Preview — Post-Financing Cash Flows"]);
  if (projectLabel) out.push([projectLabel]);
  out.push(["Values in currency units ('000) unless noted as %"]);
  out.push([]);

  out.push([
    "Construction phase",
    ...dataRows.map((r) => r.phase || ""),
    "",
  ]);
  out.push([
    "Progress %",
    ...dataRows.map((r) =>
      Number.isFinite(r.progressPct) ? Math.round(r.progressPct * 10) / 10 : null
    ),
    "",
  ]);

  out.push([
    "Description",
    ...dataRows.map((r) => `M${r.month}`),
    "TOTAL",
  ]);

  for (const spec of specsForJurisdiction(jurisdiction, hideEscrowRows)) {
    pushSection(out, spec, dataRows);
  }

  out.push([]);
  out.push([
    "* Exit proceeds are shown net of any Step 6 prepayment penalty (embedded; no separate row).",
  ]);

  return out;
}
