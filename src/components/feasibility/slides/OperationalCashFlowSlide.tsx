"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { OperationalCashFlowData } from "@/types/feasibility";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";

interface Props extends SlideEditingProps {
  data: OperationalCashFlowData;
  paragraphs?: string[];
}

function fmt(num: number): string {
  if (num === 0) return "0";
  return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtRed(num: number): string {
  if (num >= 0) return fmt(num);
  return `(${fmt(Math.abs(num))})`;
}

function sumField(
  rows: OperationalCashFlowData["yearlyData"],
  key: keyof OperationalCashFlowData["yearlyData"][number]
): number {
  return rows.reduce((a, b) => a + (Number(b[key]) || 0), 0);
}

export default function OperationalCashFlowSlide({
  data,
  paragraphs = [],
  isEditing = false,
  onParagraphChange,
}: Props) {
  const { yearlyData, terminalValue, metrics } = data;
  const colSpan = yearlyData.length + 3;

  const totalNetIncome = sumField(yearlyData, "netIncome");
  const totalDepreciation = sumField(yearlyData, "depreciation");
  const totalWorkingCapital = sumField(yearlyData, "workingCapital");
  const totalNetOperating = sumField(yearlyData, "netOperatingCF");
  const totalInitialInvestment = sumField(yearlyData, "initialInvestment");
  const totalNetInvesting = sumField(yearlyData, "netInvestingCF");
  const totalFreeCashFlow = sumField(yearlyData, "freeCashFlow");
  const totalEquity = sumField(yearlyData, "equity");
  const totalPreSales = sumField(yearlyData, "preSales");
  const totalNetFinancing = sumField(yearlyData, "netFinancingCF");
  const totalNetCashFlow = sumField(yearlyData, "netCashFlow");
  const lastCumulative = yearlyData[yearlyData.length - 1]?.cumulativeCash ?? 0;

  return (
    <SlideContainer className="[&>div]:p-4">
      <SlideHeader title={data.title} subtitle={data.subtitle} className="mb-4" />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="feasibility-table w-full text-[8px] text-slate-900 border-collapse border border-slate-300 table-fixed min-w-[920px]">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 px-1 py-0.5 text-left sticky left-0 bg-slate-800 z-10 w-[20%]">
                  {data.currency} &apos;000
                </th>
                {yearlyData.map((y, i) => (
                  <th key={i} className="border border-slate-300 px-1 py-0.5 text-right">
                    {y.year}
                  </th>
                ))}
                <th className="border border-slate-300 px-1 py-0.5 text-right bg-slate-700">
                  Terminal Value
                </th>
                <th className="border border-slate-300 px-1 py-0.5 text-right bg-slate-700">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-100 font-bold">
                <td className="border border-slate-300 px-1 py-0.5 sticky left-0 bg-slate-100 z-10" colSpan={colSpan}>
                  Cash Flow from Operating Activities
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-1 py-0.5 pl-3 sticky left-0 bg-white z-10">Net Income</td>
                {yearlyData.map((y, i) => (
                  <td key={i} className="border border-slate-300 px-1 py-0.5 text-right font-mono">{fmt(y.netIncome)}</td>
                ))}
                <td className="border border-slate-300 px-1 py-0.5" />
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono">{fmt(totalNetIncome)}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-1 py-0.5 pl-3 sticky left-0 bg-white z-10">Add: Depreciation</td>
                {yearlyData.map((y, i) => (
                  <td key={i} className="border border-slate-300 px-1 py-0.5 text-right font-mono">{fmt(y.depreciation)}</td>
                ))}
                <td className="border border-slate-300 px-1 py-0.5" />
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono">{fmt(totalDepreciation)}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-1 py-0.5 pl-3 sticky left-0 bg-white z-10">Change in Working Capital</td>
                {yearlyData.map((y, i) => (
                  <td key={i} className="border border-slate-300 px-1 py-0.5 text-right font-mono text-red-600">{fmtRed(y.workingCapital)}</td>
                ))}
                <td className="border border-slate-300 px-1 py-0.5" />
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono text-red-600">{fmtRed(totalWorkingCapital)}</td>
              </tr>
              <tr className="font-bold bg-slate-50">
                <td className="border border-slate-300 px-1 py-0.5 sticky left-0 bg-slate-50 z-10">Net Cash Flow after Operating Activities</td>
                {yearlyData.map((y, i) => (
                  <td key={i} className="border border-slate-300 px-1 py-0.5 text-right font-mono">{fmt(y.netOperatingCF)}</td>
                ))}
                <td className="border border-slate-300 px-1 py-0.5" />
                <td className="border border-slate-300 px-1 py-0.5 text-right font-mono">{fmt(totalNetOperating)}</td>
              </tr>

              <tr className="bg-slate-100 font-bold">
                <td className="border border-slate-300 px-1 py-0.5 sticky left-0 bg-slate-100 z-10" colSpan={colSpan}>
                  Cash Flow from Investing Activities
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-1 py-0.5 pl-3 sticky left-0 bg-white z-10">Initial Investment</td>
                {yearlyData.map((y, i) => (
                  <td key={i} className="border border-slate-300 px-1 py-0.5 text-right font-mono text-red-600">{fmtRed(y.initialInvestment)}</td>
                ))}
                <td className="border border-slate-300 px-1 py-0.5" />
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono text-red-600">{fmtRed(totalInitialInvestment)}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-1 py-0.5 pl-3 sticky left-0 bg-white z-10">Terminal Value</td>
                {yearlyData.map((_, i) => (
                  <td key={i} className="border border-slate-300 px-1 py-0.5 text-right">0</td>
                ))}
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono">{fmt(terminalValue)}</td>
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono">{fmt(terminalValue)}</td>
              </tr>
              <tr className="font-bold bg-slate-50">
                <td className="border border-slate-300 px-1 py-0.5 sticky left-0 bg-slate-50 z-10">Net Cash Flow after Investing Activities</td>
                {yearlyData.map((y, i) => (
                  <td key={i} className="border border-slate-300 px-1 py-0.5 text-right font-mono text-red-600">{fmtRed(y.netInvestingCF)}</td>
                ))}
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono">{fmt(terminalValue)}</td>
                <td className="border border-slate-300 px-1 py-0.5 text-right font-mono">{fmt(totalNetInvesting + terminalValue)}</td>
              </tr>

              <tr className="font-bold bg-slate-200">
                <td className="border border-slate-300 px-1 py-0.5 sticky left-0 bg-slate-200 z-10">Free Cash Flow</td>
                {yearlyData.map((y, i) => (
                  <td key={i} className="border border-slate-300 px-1 py-0.5 text-right font-mono">{fmt(y.freeCashFlow)}</td>
                ))}
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono">{fmt(terminalValue)}</td>
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono">{fmt(totalFreeCashFlow + terminalValue)}</td>
              </tr>

              <tr className="bg-slate-100 font-bold">
                <td className="border border-slate-300 px-1 py-0.5 sticky left-0 bg-slate-100 z-10" colSpan={colSpan}>
                  Cash Flow from Financing Activities
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-1 py-0.5 pl-3 sticky left-0 bg-white z-10">Equity contribution</td>
                {yearlyData.map((y, i) => (
                  <td key={i} className="border border-slate-300 px-1 py-0.5 text-right font-mono">{fmt(y.equity)}</td>
                ))}
                <td className="border border-slate-300 px-1 py-0.5" />
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono">{fmt(totalEquity)}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-1 py-0.5 pl-3 sticky left-0 bg-white z-10">Pre Sales</td>
                {yearlyData.map((y, i) => (
                  <td key={i} className="border border-slate-300 px-1 py-0.5 text-right font-mono">{fmt(y.preSales)}</td>
                ))}
                <td className="border border-slate-300 px-1 py-0.5" />
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono">{fmt(totalPreSales)}</td>
              </tr>
              <tr className="font-bold bg-slate-50">
                <td className="border border-slate-300 px-1 py-0.5 sticky left-0 bg-slate-50 z-10">Cash Flow after Financing Activities</td>
                {yearlyData.map((y, i) => (
                  <td key={i} className="border border-slate-300 px-1 py-0.5 text-right font-mono">{fmt(y.netFinancingCF)}</td>
                ))}
                <td className="border border-slate-300 px-1 py-0.5" />
                <td className="border border-slate-300 px-1 py-0.5 text-right font-mono">{fmt(totalNetFinancing)}</td>
              </tr>

              <tr className="font-bold bg-slate-800 text-white">
                <td className="border border-slate-300 px-1 py-0.5 sticky left-0 bg-slate-800 z-10">Net Cash flow</td>
                {yearlyData.map((y, i) => (
                  <td key={i} className="border border-slate-300 px-1 py-0.5 text-right font-mono">{fmt(y.netCashFlow)}</td>
                ))}
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono">{fmt(terminalValue)}</td>
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono">{fmt(totalNetCashFlow + terminalValue)}</td>
              </tr>
              <tr className="font-bold bg-slate-700 text-white">
                <td className="border border-slate-300 px-1 py-0.5 sticky left-0 bg-slate-700 z-10">Cumulative NCF</td>
                {yearlyData.map((y, i) => (
                  <td key={i} className="border border-slate-300 px-1 py-0.5 text-right font-mono">{fmt(y.cumulativeCash)}</td>
                ))}
                <td className="border border-slate-300 px-1 py-0.5 text-right font-bold font-mono">{fmt(lastCumulative + terminalValue)}</td>
                <td className="border border-slate-300 px-1 py-0.5" />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-2 p-2 bg-slate-50 border-l-4 border-emerald-500 rounded shrink-0">
          <p className="text-sm text-slate-700 leading-relaxed">
            <span className="font-bold">Unlevered Project Metrics: </span>
            Project IRR of{" "}
            <span className="font-bold text-emerald-600">{metrics.projectIRR}%</span>
            , Equity Multiple of{" "}
            <span className="font-bold">{metrics.equityMultiple}x</span>, and Payback
            Period of{" "}
            <span className="font-bold">{metrics.paybackPeriod} years</span>.
          </p>
        </div>

        {(paragraphs.length > 0 || isEditing) && (
          <EditableSlideParagraphs
            paragraphs={paragraphs}
            isEditing={isEditing}
            onParagraphChange={onParagraphChange}
            className="mt-2 shrink-0"
          />
        )}
      </div>
    </SlideContainer>
  );
}
