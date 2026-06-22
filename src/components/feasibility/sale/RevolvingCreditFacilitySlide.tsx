"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { SaleRevolvingCreditData } from "@/types/feasibility";

interface Props {
  data: SaleRevolvingCreditData;
  paragraphs?: string[];
}

function fmtCompact(amount: number, currency: string): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

export default function RevolvingCreditFacilitySlide({
  data,
  paragraphs = [],
}: Props) {
  const c = data.currency;
  const rows: Array<[string, string]> = [
    [
      "Approved Credit Facility",
      fmtCompact(data.approvedCreditFacility, c),
    ],
    [
      "Total Construction Loan Amount",
      fmtCompact(data.totalConstructionLoanAmount, c),
    ],
    ["Loan Drawdown", data.loanDrawdown],
    ["IDC Treatment", data.idcTreatment],
    ["Capitalized IDC", fmtCompact(data.capitalizedIDC, c)],
    ["Interest Rate", `${data.interestRate}% p.a.`],
    [
      "Loan Tenor",
      `${data.loanTenorMonths} months (M0 to M${data.loanTenorMonths - 1})`,
    ],
  ];

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Revolving Credit Facility"
        className="mb-4"
      />
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        <div className="space-y-2 overflow-y-auto">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-slate-700 leading-relaxed">
              {p}
            </p>
          ))}
          <p className="text-xs text-slate-600 mt-4">
            <strong>How it works:</strong> The revolving credit facility bridges the
            construction funding gap between equity injections and escrow-released sales
            proceeds. IDC is {data.idcTreatment.toLowerCase()} per financing assumptions,
            with drawdowns timed to peak negative cumulative cash flow through month{" "}
            {data.loanTenorMonths - 1}.
          </p>
        </div>
        <table className="feasibility-table w-full text-sm border border-slate-300 self-start">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td className="border border-slate-300 p-2 font-medium">{label}</td>
                <td className="border border-slate-300 p-2 text-right">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SlideContainer>
  );
}
