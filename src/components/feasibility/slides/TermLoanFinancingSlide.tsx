"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { TermLoanFinancingData } from "@/types/feasibility";

interface Props extends SlideEditingProps {
  data: TermLoanFinancingData;
  paragraphs?: string[];
}

function fmtMoney(amount: number, currency: string): string {
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}

export default function TermLoanFinancingSlide({
  data,
  paragraphs = [],
  isEditing = false,
  onParagraphChange,
}: Props) {
  const { currency } = data;

  return (
    <SlideContainer>
      <div className="w-full h-full flex flex-col min-h-0">
        <SlideHeader title={data.title} subtitle={data.subtitle} />

        <div className="flex-1 flex items-center justify-center min-h-0">
          <table className="feasibility-table w-full max-w-2xl text-sm text-slate-900 border-collapse border border-slate-300">
            <tbody>
              <tr>
                <td className="border border-slate-300 p-3 w-1/2 font-medium">
                  Approved Debt Amount
                </td>
                <td className="border border-slate-300 p-3 text-right font-bold font-mono text-slate-900">
                  {fmtMoney(data.approvedDebt, currency)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-medium">
                  Loan drawdown
                </td>
                <td className="border border-slate-300 p-3 text-right">
                  {data.drawdownType}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-medium">
                  IDC treatment
                </td>
                <td className="border border-slate-300 p-3 text-right">
                  {data.idcTreatment}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-medium">
                  Capitalized IDC
                </td>
                <td className="border border-slate-300 p-3 text-right font-mono">
                  {fmtMoney(data.idcAmount, currency)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-medium">
                  Loan at completion (with IDC)
                </td>
                <td className="border border-slate-300 p-3 text-right font-mono">
                  {fmtMoney(data.loanAtCompletion, currency)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-medium">
                  Repayment structure
                </td>
                <td className="border border-slate-300 p-3 text-right">
                  {data.loanType}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-medium">
                  Interest rate
                </td>
                <td className="border border-slate-300 p-3 text-right font-mono">
                  {data.interestRate}%
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-medium">
                  Loan tenor
                </td>
                <td className="border border-slate-300 p-3 text-right font-bold text-slate-900">
                  {data.totalLoanTenor}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <EditableSlideParagraphs
          paragraphs={paragraphs}
          isEditing={isEditing}
          onParagraphChange={onParagraphChange}
          className="mt-4 space-y-2 shrink-0"
          itemClassName="text-sm text-slate-800 leading-relaxed"
        />
      </div>
    </SlideContainer>
  );
}
