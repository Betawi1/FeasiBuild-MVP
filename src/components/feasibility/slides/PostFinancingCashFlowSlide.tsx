"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { PostFinancingCashFlowData } from "@/types/feasibility";

interface Props {
  data: PostFinancingCashFlowData;
}

export default function PostFinancingCashFlowSlide({ data }: Props) {
  const fmt = (num: number) => {
    if (num === 0) return "0";
    return Math.abs(num).toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const fmtSigned = (num: number) => {
    if (num === 0) return "0";
    return num < 0 ? `(${fmt(num)})` : fmt(num);
  };

  const getTotal = (arr: { value: number }[]) =>
    arr.reduce((sum, item) => sum + item.value, 0);

  const rows = [
    { label: "Total Inflow", data: data.totalInflow, isBold: false },
    { label: "Total Outflow", data: data.totalOutflow, isBold: false },
    { label: "NCF (Pre-Financing)", data: data.ncfPreFinancing, isBold: true },
    { label: "Loan Drawdown", data: data.loanDrawdown, isBold: false },
    { label: "Interest Payment", data: data.interestPayment, isBold: false },
    {
      label: "Principal Repayment",
      data: data.principalRepayment,
      isBold: false,
    },
    { label: "Pref. Drawdown", data: data.prefDrawdown, isBold: false },
    { label: "Pref. Dividend", data: data.prefDividend, isBold: false },
    { label: "Pref. Repayment", data: data.prefRepayment, isBold: false },
    { label: "Equity Injection", data: data.equityInjection, isBold: false },
    {
      label: "NCF (Post-Financing)",
      data: data.ncfPostFinancing,
      isBold: true,
      isHighlight: true,
    },
  ];

  const yearColumns =
    data.ncfPostFinancing.length > 0
      ? data.ncfPostFinancing
      : data.totalInflow;

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Post-Financing Annual Cash Flows"
      />

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="feasibility-table w-full text-[10px] text-slate-900 border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 p-2 text-left w-1/4 sticky left-0 bg-slate-800 z-10">
                  {data.currency} &apos;000
                </th>
                {yearColumns.map((y) => (
                  <th
                    key={y.year}
                    className="border border-slate-300 p-2 text-right"
                  >
                    {y.year}
                  </th>
                ))}
                <th className="border border-slate-300 p-2 text-right bg-slate-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={`${row.isHighlight ? "bg-emerald-50" : ""} ${row.isBold ? "font-bold" : ""}`}
                >
                  <td
                    className={`border border-slate-300 p-2 sticky left-0 bg-white z-10 ${row.isBold ? "font-bold" : ""}`}
                  >
                    {row.label}
                  </td>
                  {row.data.map((y, j) => (
                    <td
                      key={j}
                      className={`border border-slate-300 p-2 text-right ${y.value < 0 ? "text-red-600" : ""}`}
                    >
                      {fmtSigned(y.value)}
                    </td>
                  ))}
                  <td
                    className={`border border-slate-300 p-2 text-right font-bold bg-slate-50 ${getTotal(row.data) < 0 ? "text-red-600" : ""}`}
                  >
                    {fmtSigned(getTotal(row.data))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SlideContainer>
  );
}
