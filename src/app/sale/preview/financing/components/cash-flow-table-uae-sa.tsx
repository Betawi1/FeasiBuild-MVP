"use client";

const TOTAL_TH_CLASS =
  "min-w-[120px] border-l-2 border-slate-600 bg-slate-800/50 px-2 py-2 text-center font-semibold text-slate-200";
const TOTAL_TD_CLASS =
  "min-w-[120px] border-l-2 border-slate-600 bg-slate-800/50 px-2 py-2 text-right font-mono font-semibold text-slate-200";

export type MonthlyRow = {
  month: number;
  phase: string;
  progressPct: number;
  isMilestone: boolean;

  salesProceeds: number;
  escrowInterest: number;
  escrowAccountFees: number;
  escrowBalance: number;
  escrowReleases: number;
  progressWithdrawal: number;

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

  loanDrawdown: number;
  cumulativeLoanDrawdown: number;
  interestPayment: number;
  loanRepayment: number;
  commitmentFee: number;

  prefDrawdown: number;
  prefDividend: number;
  prefRepayment: number;

  capitalLandInjection: number;
  capitalCashInjection: number;
  cumulativeCapital: number;

  ncfAfterFinancing: number;
  cumulativeNcfAfterFinancing: number;

  equityCashFlow: number;
  discountRate: number;
  npv: number;
};

export type CashFlowTableUaeSaProps = {
  data: MonthlyRow[];
  formatCurrency: (val: number) => string;
  hideEscrowRows?: boolean;
};

export function CashFlowTableUaeSa({
  data,
  formatCurrency,
  hideEscrowRows = false,
}: CashFlowTableUaeSaProps) {
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
          <TableRow label="Sales proceeds" data={data} getValue={(r) => r.salesProceeds} formatCurrency={formatCurrency} />
          {!hideEscrowRows && (
            <>
              <TableRow
                label="Escrow account balance"
                data={data}
                getValue={(r) => r.escrowBalance}
                formatCurrency={formatCurrency}
                isBalance
              />
              <TableRow
                label="Escrow interest income"
                data={data}
                getValue={(r) => r.escrowInterest}
                formatCurrency={formatCurrency}
              />
              <TableRow
                label="Escrow account fees"
                data={data}
                getValue={(r) => r.escrowAccountFees}
                formatCurrency={formatCurrency}
                isNegative
              />
              <TableRow
                label="Escrow releases"
                data={data}
                getValue={(r) => r.escrowReleases}
                formatCurrency={formatCurrency}
                isHighlight
              />
              <TableRow
                label="Progress withdrawal"
                data={data}
                getValue={(r) => r.progressWithdrawal}
                formatCurrency={formatCurrency}
                isHighlight
              />
            </>
          )}

          <SectionHeader colSpan={colCount} label="CASH OUTFLOWS" />
          <TableRow
            label="Construction costs"
            data={data}
            getValue={(r) => r.constructionCosts}
            formatCurrency={formatCurrency}
          />
          <TableRow label="Soft costs" data={data} getValue={(r) => r.softCosts} formatCurrency={formatCurrency} />
          <TableRow label="POWC" data={data} getValue={(r) => r.powc} formatCurrency={formatCurrency} />
          <TableRow
            label="Total outflows (excl. land costs)"
            data={data}
            getValue={(r) => r.totalOutflowsExclLand}
            formatCurrency={formatCurrency}
            isBold
          />
          <TableRow label="Land cost" data={data} getValue={(r) => r.landCost} formatCurrency={formatCurrency} />
          <TableRow
            label="Total outflows (incl. land costs)"
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

          {/* Land Loan Section: Only shown for Commercial & No-Escrow (hideEscrowRows=true) */}
          {hideEscrowRows && (
            <>
              <SectionHeader colSpan={colCount} label="LAND LOAN" />
              <TableRow
                label="Loan drawdown"
                data={data}
                getValue={(r) => r.landLoanDrawdown}
                formatCurrency={formatCurrency}
                isHighlight
              />
              <TableRow
                label="Interest payment"
                data={data}
                getValue={(r) => r.landLoanInterest}
                formatCurrency={formatCurrency}
                isNegative
              />
              <TableRow
                label="Loan repayment"
                data={data}
                getValue={(r) => r.landLoanRepayment}
                formatCurrency={formatCurrency}
                isNegative
              />
              <TableRow
                label="Loan fees"
                data={data}
                getValue={(r) => r.landLoanFees}
                formatCurrency={formatCurrency}
                isNegative
              />
            </>
          )}

          <SectionHeader colSpan={colCount} label="CONSTRUCTION LOAN" />
          <TableRow
            label="Loan drawdown"
            data={data}
            getValue={(r) => r.loanDrawdown}
            formatCurrency={formatCurrency}
            isHighlight
          />
          <TableRow
            label="Cumulative drawdown"
            data={data}
            getValue={(r) => r.cumulativeLoanDrawdown}
            formatCurrency={formatCurrency}
          />
          <TableRow
            label="Interest payment"
            data={data}
            getValue={(r) => r.interestPayment}
            formatCurrency={formatCurrency}
            isNegative
          />
          <TableRow
            label="Loan repayment"
            data={data}
            getValue={(r) => r.loanRepayment}
            formatCurrency={formatCurrency}
            isNegative
          />
          <TableRow
            label="Commitment fee"
            data={data}
            getValue={(r) => r.commitmentFee}
            formatCurrency={formatCurrency}
            isNegative
          />

          <SectionHeader colSpan={colCount} label="PREF. SHARES / MEZZANINE CAPITAL" />
          <TableRow
            label="Pref. drawdown"
            data={data}
            getValue={(r) => r.prefDrawdown}
            formatCurrency={formatCurrency}
            isHighlight
          />
          <TableRow
            label="Pref. dividend"
            data={data}
            getValue={(r) => r.prefDividend}
            formatCurrency={formatCurrency}
            isNegative
          />
          <TableRow
            label="Pref. repayment"
            data={data}
            getValue={(r) => r.prefRepayment}
            formatCurrency={formatCurrency}
            isNegative
          />

          <SectionHeader colSpan={colCount} label="EQUITY CAPITAL" />
          <TableRow
            label="Capital—land injection"
            data={data}
            getValue={(r) => r.capitalLandInjection}
            formatCurrency={formatCurrency}
            isHighlight
          />
          <TableRow
            label="Capital—cash injection"
            data={data}
            getValue={(r) => r.capitalCashInjection}
            formatCurrency={formatCurrency}
            isHighlight
          />
          <TableRow
            label="Cumulative capital"
            data={data}
            getValue={(r) => r.cumulativeCapital}
            formatCurrency={formatCurrency}
          />

          <SectionHeader colSpan={colCount} label="BOTTOM LINE" />
          <TableRow
            label="NCF after loan & equity"
            data={data}
            getValue={(r) => r.ncfAfterFinancing}
            formatCurrency={formatCurrency}
            isBold
          />
          <TableRow
            label="Cumulative NCF"
            data={data}
            getValue={(r) => r.cumulativeNcfAfterFinancing}
            formatCurrency={formatCurrency}
            isBold
            isNCF
          />

          <SectionHeader colSpan={colCount} label="INTERNAL RATE OF RETURN" />
          <TableRow
            label="Cash flows (equity)"
            data={data}
            getValue={(r) => r.equityCashFlow}
            formatCurrency={formatCurrency}
          />
          <TableRow
            label="Discount rate"
            data={data}
            getValue={(r) => r.discountRate}
            formatCurrency={formatCurrency}
            isPercent
          />
          <TableRow
            label="NPV"
            data={data}
            getValue={(r) => r.npv}
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
