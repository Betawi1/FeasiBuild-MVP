"use client";

const TOTAL_TH_CLASS =
  "min-w-[120px] border-l-2 border-slate-600 bg-slate-800/50 px-2 py-2 text-center font-semibold text-slate-200";
const TOTAL_TD_CLASS =
  "min-w-[120px] border-l-2 border-slate-600 bg-slate-800/50 px-2 py-2 text-right font-mono font-semibold text-slate-200";

/** Pre-calculated monthly row from the financing engine (Australia / 10-90 off-the-plan trust account model). */
export type MonthlyRow = {
  month: number;
  phase: string;
  progressPct: number;
  isMilestone: boolean;

  salesProceeds?: number;
  lockedInSales: number;
  cumuLockedInSales: number;
  cumuTrustAccount: number;
  trustAccountInterest: number;
  trustAccountFees: number;
  trustAccountReleases: number;
  actualSalesProceeds: number;

  constructionCosts: number;
  softCosts: number;
  powc: number;
  totalOutflowsExclLand: number;
  landCost: number;
  totalOutflowsInclLand: number;
  ncf: number;

  landLoanDrawdown: number;
  landLoanInterest: number;
  landLoanRepayment: number;
  landLoanFees: number;

  constLoanDrawdown: number;
  constLoanCumulative: number;
  constLoanInterest: number;
  constLoanRepayment: number;
  constLoanCommitmentFee: number;

  prefDrawdown: number;
  prefDividend: number;
  prefRepayment: number;

  capitalLand: number;
  capitalCash: number;
  cumulativeCapital: number;

  ncfAfterFinancing: number;
  cumulativeNcf: number;

  irrCashFlow: number;
  irrDiscountRate: number;
  irrNpv: number;
};

export type CashFlowTableAustraliaProps = {
  data: MonthlyRow[];
  formatCurrency: (val: number) => string;
  hideEscrowRows?: boolean;
};

export function CashFlowTableAustralia({
  data,
  formatCurrency,
  hideEscrowRows = false,
}: CashFlowTableAustraliaProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">No cash flow data available.</div>
    );
  }

  const colCount = data.length + 2;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900">
      <table className="w-max min-w-full border-collapse text-xs text-slate-300">
        <thead className="sticky top-0 z-20 shadow-sm shadow-slate-950/40">
          <tr className="bg-slate-800">
            <th className="sticky left-0 z-30 w-64 border-b border-r border-slate-700 bg-slate-800 px-3 py-2 text-left font-semibold text-slate-200">
              Month
            </th>
            {data.map((row) => (
              <th
                key={row.month}
                className={`min-w-[80px] border-b border-r border-slate-700 px-2 py-2 text-center font-medium ${
                  row.isMilestone
                    ? "border-l-2 border-l-emerald-500 bg-emerald-500/20 text-emerald-300"
                    : ""
                }`}
              >
                M{row.month}
              </th>
            ))}
            <th className={TOTAL_TH_CLASS}>TOTAL</th>
          </tr>

          <tr className="bg-slate-800/80">
            <th className="sticky left-0 z-30 border-b border-r border-slate-700 bg-slate-800/80 px-3 py-1.5 text-left text-xs text-slate-400">
              Construction phase
            </th>
            {data.map((row) => (
              <th
                key={row.month}
                className={`max-w-[100px] border-b border-r border-slate-700 px-2 py-1.5 text-center text-[10px] leading-tight text-slate-400 ${
                  row.isMilestone ? "border-l-2 border-l-emerald-500 bg-emerald-500/10" : ""
                }`}
              >
                {row.phase}
              </th>
            ))}
            <th className={TOTAL_TH_CLASS}>—</th>
          </tr>

          <tr className="bg-slate-800/60">
            <th className="sticky left-0 z-30 border-b border-r border-slate-700 bg-slate-800/60 px-3 py-1.5 text-left text-xs text-slate-400">
              Progress %
            </th>
            {data.map((row) => (
              <th
                key={row.month}
                className={`border-b border-r border-slate-700 px-2 py-1.5 text-center font-mono text-[10px] ${
                  row.isMilestone
                    ? "border-l-2 border-l-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : ""
                }`}
              >
                {Number.isFinite(row.progressPct) ? `${row.progressPct.toFixed(1)}%` : "—"}
              </th>
            ))}
            <th className={TOTAL_TH_CLASS}>—</th>
          </tr>
        </thead>

        <tbody>
          <SectionHeader colSpan={colCount} label="CASH INFLOWS" />
          {hideEscrowRows ? (
            <TableRow
              label="Sales proceeds"
              data={data}
              getValue={(r) => r.salesProceeds ?? 0}
              formatCurrency={formatCurrency}
            />
          ) : (
            <>
              <TableRow
                label="Locked-in Sales"
                data={data}
                getValue={(r) => r.lockedInSales}
                formatCurrency={formatCurrency}
              />
              <TableRow
                label="Cumu. Locked-in Sales"
                data={data}
                getValue={(r) => r.cumuLockedInSales}
                formatCurrency={formatCurrency}
              />
              <TableRow
                label="Cumu. Trust Account"
                data={data}
                getValue={(r) => r.cumuTrustAccount}
                formatCurrency={formatCurrency}
                isBalance
              />
              <TableRow
                label="Trust Account Interest Income"
                data={data}
                getValue={(r) => r.trustAccountInterest}
                formatCurrency={formatCurrency}
              />
              <TableRow
                label="Trust Account Fees"
                data={data}
                getValue={(r) => r.trustAccountFees}
                formatCurrency={formatCurrency}
                isNegative
              />
              <TableRow
                label="Trust Account Releases"
                data={data}
                getValue={(r) => r.trustAccountReleases}
                formatCurrency={formatCurrency}
                isHighlight
              />
              <TableRow
                label="Actual Sales Proceeds"
                data={data}
                getValue={(r) => r.actualSalesProceeds}
                formatCurrency={formatCurrency}
                isHighlight
              />
            </>
          )}

          <SectionHeader colSpan={colCount} label="CASH OUTFLOWS" />
          <TableRow
            label="Construction Costs"
            data={data}
            getValue={(r) => r.constructionCosts}
            formatCurrency={formatCurrency}
          />
          <TableRow label="Soft Costs" data={data} getValue={(r) => r.softCosts} formatCurrency={formatCurrency} />
          <TableRow label="POWC" data={data} getValue={(r) => r.powc} formatCurrency={formatCurrency} />
          <TableRow
            label="Total Outflows (excl. land costs)"
            data={data}
            getValue={(r) => r.totalOutflowsExclLand}
            formatCurrency={formatCurrency}
            isBold
          />
          <TableRow label="Land Cost" data={data} getValue={(r) => r.landCost} formatCurrency={formatCurrency} />
          <TableRow
            label="Total Outflows (incl. land costs)"
            data={data}
            getValue={(r) => r.totalOutflowsInclLand}
            formatCurrency={formatCurrency}
            isBold
          />
          <TableRow
            label="NET CASH FLOWS (NCF)"
            data={data}
            getValue={(r) => r.ncf}
            formatCurrency={formatCurrency}
            isBold
            isNCF
          />

          <SectionHeader colSpan={colCount} label="LAND LOAN" />
          <TableRow
            label="Loan Drawdown"
            data={data}
            getValue={(r) => r.landLoanDrawdown}
            formatCurrency={formatCurrency}
            isHighlight
          />
          <TableRow
            label="Interest Payment"
            data={data}
            getValue={(r) => r.landLoanInterest}
            formatCurrency={formatCurrency}
            isNegative
          />
          <TableRow
            label="Loan Repayment"
            data={data}
            getValue={(r) => r.landLoanRepayment}
            formatCurrency={formatCurrency}
            isNegative
          />
          <TableRow
            label="Loan Fees"
            data={data}
            getValue={(r) => r.landLoanFees}
            formatCurrency={formatCurrency}
            isNegative
          />

          <SectionHeader colSpan={colCount} label="CONSTRUCTION LOAN" />
          <TableRow
            label="Loan Drawdown"
            data={data}
            getValue={(r) => r.constLoanDrawdown}
            formatCurrency={formatCurrency}
            isHighlight
          />
          <TableRow
            label="Cumulative Drawdown"
            data={data}
            getValue={(r) => r.constLoanCumulative}
            formatCurrency={formatCurrency}
          />
          <TableRow
            label="Interest Payment"
            data={data}
            getValue={(r) => r.constLoanInterest}
            formatCurrency={formatCurrency}
            isNegative
          />
          <TableRow
            label="Loan Repayment"
            data={data}
            getValue={(r) => r.constLoanRepayment}
            formatCurrency={formatCurrency}
            isNegative
          />
          <TableRow
            label="Commitment Fee"
            data={data}
            getValue={(r) => r.constLoanCommitmentFee}
            formatCurrency={formatCurrency}
            isNegative
          />

          <SectionHeader colSpan={colCount} label="PREF. SHARES / MEZZANINE CAPITAL" />
          <TableRow
            label="Pref. Drawdown"
            data={data}
            getValue={(r) => r.prefDrawdown}
            formatCurrency={formatCurrency}
            isHighlight
          />
          <TableRow
            label="Pref. Dividend"
            data={data}
            getValue={(r) => r.prefDividend}
            formatCurrency={formatCurrency}
            isNegative
          />
          <TableRow
            label="Pref. Repayment"
            data={data}
            getValue={(r) => r.prefRepayment}
            formatCurrency={formatCurrency}
            isNegative
          />

          <SectionHeader colSpan={colCount} label="EQUITY CAPITAL" />
          <TableRow
            label="Capital-Land Injection"
            data={data}
            getValue={(r) => r.capitalLand}
            formatCurrency={formatCurrency}
            isHighlight
          />
          <TableRow
            label="Capital-Cash Injection"
            data={data}
            getValue={(r) => r.capitalCash}
            formatCurrency={formatCurrency}
            isHighlight
          />
          <TableRow
            label="Cumulative Capital"
            data={data}
            getValue={(r) => r.cumulativeCapital}
            formatCurrency={formatCurrency}
          />

          <SectionHeader colSpan={colCount} label="BOTTOM LINE" />
          <TableRow
            label="NCF after Loan & Equity"
            data={data}
            getValue={(r) => r.ncfAfterFinancing}
            formatCurrency={formatCurrency}
            isBold
          />
          <TableRow
            label="Cumulative NCF"
            data={data}
            getValue={(r) => r.cumulativeNcf}
            formatCurrency={formatCurrency}
            isBold
            isNCF
          />

          <SectionHeader colSpan={colCount} label="INTERNAL RATE OF RETURN" />
          <TableRow
            label="Cash Flows (Equity)"
            data={data}
            getValue={(r) => r.irrCashFlow}
            formatCurrency={formatCurrency}
          />
          <TableRow
            label="Discount Rate"
            data={data}
            getValue={(r) => r.irrDiscountRate}
            formatCurrency={formatCurrency}
            isPercent
          />
          <TableRow
            label="NPV"
            data={data}
            getValue={(r) => r.irrNpv}
            formatCurrency={formatCurrency}
            isNegative
          />
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr className="bg-slate-800/50">
      <td
        colSpan={colSpan}
        className="sticky left-0 z-10 border-b border-r border-slate-700 bg-slate-800/50 px-3 py-2 font-bold text-slate-100"
      >
        {label}
      </td>
    </tr>
  );
}

function TableRow({
  label,
  data,
  getValue,
  formatCurrency,
  isBold = false,
  isNegative = false,
  isHighlight = false,
  isBalance = false,
  isNCF = false,
  isPercent = false,
}: {
  label: string;
  data: MonthlyRow[];
  getValue: (r: MonthlyRow) => number;
  formatCurrency: (v: number) => string;
  isBold?: boolean;
  isNegative?: boolean;
  isHighlight?: boolean;
  isBalance?: boolean;
  isNCF?: boolean;
  isPercent?: boolean;
}) {
  const rowSum = data.reduce((sum, row) => sum + getValue(row), 0);
  const sumZero = rowSum === 0 || Object.is(rowSum, -0);

  return (
    <tr className="border-b border-slate-800 transition-colors hover:bg-slate-800/30">
      <td
        className={`sticky left-0 z-10 whitespace-nowrap border-r border-slate-700 px-3 py-2 text-left ${
          isBold ? "bg-slate-900 font-semibold text-slate-100" : "bg-slate-900 text-slate-300"
        } ${isNCF ? "border-t-2 border-t-slate-600" : ""} ${isBalance ? "text-slate-200" : ""}`}
      >
        {label}
      </td>
      {data.map((row) => {
        const val = getValue(row);
        const isZero = val === 0 || (typeof val === "number" && Object.is(val, -0));
        const showRed = isNegative && val < 0;
        const showGreen = isHighlight && val > 0;
        const cellClass = `min-w-[80px] border-r border-slate-700 px-2 py-2 text-center font-mono ${
          isBold ? "font-semibold text-slate-100" : "text-slate-300"
        } ${showRed ? "text-red-400" : ""} ${showGreen ? "text-emerald-400" : ""} ${
          row.isMilestone ? "border-l-2 border-l-emerald-500 bg-emerald-500/10" : "bg-slate-900/40"
        } ${isZero ? "text-slate-500" : ""}`;

        let display: string;
        if (isZero) {
          display = "—";
        } else if (isPercent) {
          display = Number.isFinite(val) ? `${(val * 100).toFixed(2)}%` : "—";
        } else {
          display = formatCurrency(val);
        }

        return (
          <td key={row.month} className={cellClass}>
            {display}
          </td>
        );
      })}
      <td className={TOTAL_TD_CLASS}>
        {isPercent ? "—" : sumZero ? "—" : formatCurrency(rowSum)}
      </td>
    </tr>
  );
}