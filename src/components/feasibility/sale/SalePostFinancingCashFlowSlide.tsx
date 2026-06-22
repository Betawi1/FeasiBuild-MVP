"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type {
  SalePostFinancingCashFlowData,
  SalePostFinancingMonthlyRow,
} from "@/types/feasibility";

interface Props {
  data: SalePostFinancingCashFlowData;
  paragraphs?: string[];
}

type YearlyRow = {
  year: string;
  cashInflows: number;
  cashOutflows: number;
  netCashFlow: number;
  rcfDrawdown: number;
  rcfInterest: number;
  rcfRepayment: number;
  rcfCommitmentFee: number;
  prefDrawdown: number;
  prefDividend: number;
  prefRepayment: number;
  landInjection: number;
  cashInjection: number;
  ncfAfterLoanEquity: number;
};

function formatNumber(num: number): string {
  if (num === 0) return "0";
  return Math.round(num / 1000)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function convertToYearly(monthly: SalePostFinancingMonthlyRow[]): YearlyRow[] {
  if (!monthly.length) return [];
  const totalMonths = monthly.length;
  const years = Math.ceil(totalMonths / 12);
  const yearlyData: YearlyRow[] = [];

  for (let year = 0; year < years; year++) {
    const startMonth = year * 12;
    const endMonth = Math.min(startMonth + 12, totalMonths);
    const yearLabel =
      year === years - 1 && totalMonths % 12 !== 0
        ? `Year ${(totalMonths / 12).toFixed(1)}`
        : `Year ${year + 1}`;

    const yearData: YearlyRow = {
      year: yearLabel,
      cashInflows: 0,
      cashOutflows: 0,
      netCashFlow: 0,
      rcfDrawdown: 0,
      rcfInterest: 0,
      rcfRepayment: 0,
      rcfCommitmentFee: 0,
      prefDrawdown: 0,
      prefDividend: 0,
      prefRepayment: 0,
      landInjection: 0,
      cashInjection: 0,
      ncfAfterLoanEquity: 0,
    };

    for (let month = startMonth; month < endMonth; month++) {
      const m = monthly[month];
      if (!m) continue;
      yearData.cashInflows += (m.escrowReleases || 0) + (m.progressWithdrawals || 0);
      yearData.cashOutflows += m.totalOutflows || 0;
      yearData.netCashFlow += m.netCashFlow || 0;
      yearData.rcfDrawdown += m.loanDrawdown || 0;
      yearData.rcfInterest += m.interestPayment || 0;
      yearData.rcfRepayment += m.loanRepayment || 0;
      yearData.rcfCommitmentFee += m.commitmentFee || 0;
      yearData.prefDrawdown += m.prefDrawdown || 0;
      yearData.prefDividend += m.prefDividend || 0;
      yearData.prefRepayment += m.prefRepayment || 0;
      yearData.landInjection += m.landInjection || 0;
      yearData.cashInjection += m.cashInjection || 0;
      yearData.ncfAfterLoanEquity += m.ncfAfterLoanEquity || 0;
    }

    yearlyData.push(yearData);
  }

  return yearlyData;
}

function TotalCell({
  yearlyData,
  getter,
}: {
  yearlyData: YearlyRow[];
  getter: (y: YearlyRow) => number;
}) {
  const total = yearlyData.reduce((sum, y) => sum + getter(y), 0);
  return (
    <td className="border border-slate-300 py-0.5 px-1.5 text-right bg-slate-50 font-bold">
      {formatNumber(total)}
    </td>
  );
}

export default function SalePostFinancingCashFlowSlide({
  data,
  paragraphs = [],
}: Props) {
  const yearlyData = convertToYearly(data.monthlyCashFlows);
  const colSpan = yearlyData.length + 2;

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Post-Financing Cash Flows"
        className="mb-4"
      />

      {paragraphs.length > 0 && (
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded shrink-0">
          <p className="text-sm text-slate-700 leading-relaxed">{paragraphs[0]}</p>
        </div>
      )}

      <div className="flex-1 overflow-auto min-h-0">
        <table className="feasibility-table w-full text-[8px] border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-300 py-1 px-2 text-left sticky left-0 bg-slate-800 z-10">
                {data.currency} &apos;000
              </th>
              {yearlyData.map((y) => (
                <th
                  key={y.year}
                  className="border border-slate-300 py-1 px-2 text-right"
                >
                  {y.year}
                </th>
              ))}
              <th className="border border-slate-300 py-1 px-2 text-right bg-slate-700">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-100 font-bold">
              <td className="border border-slate-300 py-0.5 px-1.5 sticky left-0 bg-slate-100 z-10">
                Cash Inflows (Escrow + Progress)
              </td>
              {yearlyData.map((y) => (
                <td
                  key={y.year}
                  className="border border-slate-300 py-0.5 px-1.5 text-right text-emerald-600"
                >
                  {formatNumber(y.cashInflows)}
                </td>
              ))}
              <TotalCell yearlyData={yearlyData} getter={(y) => y.cashInflows} />
            </tr>

            <tr>
              <td className="border border-slate-300 py-0.5 px-1.5 sticky left-0 bg-white z-10">
                Cash Outflows (Total incl. Land)
              </td>
              {yearlyData.map((y) => (
                <td
                  key={y.year}
                  className="border border-slate-300 py-0.5 px-1.5 text-right text-red-600"
                >
                  {formatNumber(y.cashOutflows)}
                </td>
              ))}
              <TotalCell yearlyData={yearlyData} getter={(y) => y.cashOutflows} />
            </tr>

            <tr className="font-bold bg-slate-50">
              <td className="border border-slate-300 py-0.5 px-1.5 sticky left-0 bg-slate-50 z-10">
                Net Cash Flow (NCF)
              </td>
              {yearlyData.map((y) => (
                <td
                  key={y.year}
                  className={`border border-slate-300 py-0.5 px-1.5 text-right ${
                    y.netCashFlow >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatNumber(y.netCashFlow)}
                </td>
              ))}
              <TotalCell yearlyData={yearlyData} getter={(y) => y.netCashFlow} />
            </tr>

            <tr className="bg-slate-100 font-bold">
              <td
                className="border border-slate-300 py-0.5 px-1.5 sticky left-0 bg-slate-100 z-10"
                colSpan={colSpan}
              >
                RCF (Revolving Credit Facility)
              </td>
            </tr>
            {(
              [
                ["RCF Drawdown", (y: YearlyRow) => y.rcfDrawdown],
                ["RCF Interest", (y: YearlyRow) => y.rcfInterest],
                ["RCF Repayment", (y: YearlyRow) => y.rcfRepayment],
                ["RCF Commitment Fee", (y: YearlyRow) => y.rcfCommitmentFee],
              ] as const
            ).map(([label, getter]) => (
              <tr key={label}>
                <td className="border border-slate-300 py-0.5 px-1.5 pl-3 sticky left-0 bg-white z-10">
                  {label}
                </td>
                {yearlyData.map((y) => (
                  <td
                    key={y.year}
                    className="border border-slate-300 py-0.5 px-1.5 text-right"
                  >
                    {formatNumber(getter(y))}
                  </td>
                ))}
                <TotalCell yearlyData={yearlyData} getter={getter} />
              </tr>
            ))}

            <tr className="bg-slate-100 font-bold">
              <td
                className="border border-slate-300 py-0.5 px-1.5 sticky left-0 bg-slate-100 z-10"
                colSpan={colSpan}
              >
                Preference Shares
              </td>
            </tr>
            {(
              [
                ["Pref Shares Drawdown", (y: YearlyRow) => y.prefDrawdown],
                ["Pref Shares Dividend", (y: YearlyRow) => y.prefDividend],
                ["Pref Shares Repayment", (y: YearlyRow) => y.prefRepayment],
              ] as const
            ).map(([label, getter]) => (
              <tr key={label}>
                <td className="border border-slate-300 py-0.5 px-1.5 pl-3 sticky left-0 bg-white z-10">
                  {label}
                </td>
                {yearlyData.map((y) => (
                  <td
                    key={y.year}
                    className="border border-slate-300 py-0.5 px-1.5 text-right"
                  >
                    {formatNumber(getter(y))}
                  </td>
                ))}
                <TotalCell yearlyData={yearlyData} getter={getter} />
              </tr>
            ))}

            <tr className="bg-slate-100 font-bold">
              <td
                className="border border-slate-300 py-0.5 px-1.5 sticky left-0 bg-slate-100 z-10"
                colSpan={colSpan}
              >
                Capital Injections
              </td>
            </tr>
            {(
              [
                ["Capital - Land Injection", (y: YearlyRow) => y.landInjection],
                ["Capital - Cash Injection", (y: YearlyRow) => y.cashInjection],
              ] as const
            ).map(([label, getter]) => (
              <tr key={label}>
                <td className="border border-slate-300 py-0.5 px-1.5 pl-3 sticky left-0 bg-white z-10">
                  {label}
                </td>
                {yearlyData.map((y) => (
                  <td
                    key={y.year}
                    className="border border-slate-300 py-0.5 px-1.5 text-right"
                  >
                    {formatNumber(getter(y))}
                  </td>
                ))}
                <TotalCell yearlyData={yearlyData} getter={getter} />
              </tr>
            ))}

            <tr className="font-bold bg-emerald-100">
              <td className="border border-slate-300 py-0.5 px-1.5 sticky left-0 bg-emerald-100 z-10">
                NCF After Loan & Equity
              </td>
              {yearlyData.map((y) => (
                <td
                  key={y.year}
                  className={`border border-slate-300 py-0.5 px-1.5 text-right ${
                    y.ncfAfterLoanEquity >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatNumber(y.ncfAfterLoanEquity)}
                </td>
              ))}
              <td className="border border-slate-300 py-0.5 px-1.5 text-right bg-emerald-200 font-bold">
                {formatNumber(
                  yearlyData.reduce((sum, y) => sum + y.ncfAfterLoanEquity, 0)
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SlideContainer>
  );
}
