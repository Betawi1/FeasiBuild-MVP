"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type {
  SaleDevelopmentScheduleData,
  SaleMonthlyOutflowRow,
} from "@/types/feasibility";

interface Props {
  data: SaleDevelopmentScheduleData;
  paragraphs?: string[];
}

type YearlyRow = {
  year: string;
  landCost: number;
  constructionCost: number;
  softCosts: number;
  powc: number;
  total: number;
  cumulative: number;
};

function formatThousands(num: number): string {
  if (num === 0) return "0";
  return Math.round(num / 1000)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function convertToYearly(monthlyOutflows: SaleMonthlyOutflowRow[]): YearlyRow[] {
  const totalMonths = monthlyOutflows.length;
  if (totalMonths === 0) return [];

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
      landCost: 0,
      constructionCost: 0,
      softCosts: 0,
      powc: 0,
      total: 0,
      cumulative: 0,
    };

    for (let month = startMonth; month < endMonth; month++) {
      const m = monthlyOutflows[month];
      if (m) {
        yearData.landCost += m.landCost || 0;
        yearData.constructionCost += m.constructionCost || 0;
        yearData.softCosts += m.softCosts || 0;
        yearData.powc += m.powc || 0;
        yearData.total += m.total || 0;
      }
    }

    yearData.cumulative =
      monthlyOutflows[endMonth - 1]?.cumulative || yearData.total;

    yearlyData.push(yearData);
  }

  return yearlyData;
}

const cell = "border border-slate-300 p-1.5 text-black";
const cellRight = `${cell} text-right`;
const thCell = "border border-slate-300 p-1.5 text-white text-xs font-bold";

export default function SaleDevelopmentScheduleSlide({
  data,
  paragraphs = [],
}: Props) {
  const yearlyData = convertToYearly(data.monthlyOutflows);

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Development Schedule"
        className="mb-3"
      />

      {paragraphs.length > 0 && (
        <div className="mb-2 bg-blue-50 border-l-4 border-blue-500 px-3 py-2 rounded shrink-0">
          <p className="text-xs text-slate-700 leading-tight">{paragraphs[0]}</p>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto text-xs">
        <table className="w-full border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-800">
              <th className={`${thCell} text-left`}>
                {data.currency} &apos;000
              </th>
              {yearlyData.map((y) => (
                <th key={y.year} className={`${thCell} text-right`}>
                  {y.year}
                </th>
              ))}
              <th className={`${thCell} text-right bg-slate-700`}>Total</th>
            </tr>
          </thead>
          <tbody className="text-black">
            <tr>
              <td className={`${cell} font-medium`}>Land Cost</td>
              {yearlyData.map((y) => (
                <td key={`land-${y.year}`} className={cellRight}>
                  {formatThousands(y.landCost)}
                </td>
              ))}
              <td className={`${cellRight} bg-slate-50 font-bold`}>
                {formatThousands(
                  yearlyData.reduce((sum, y) => sum + y.landCost, 0)
                )}
              </td>
            </tr>
            <tr>
              <td className={`${cell} font-medium`}>Construction Cost</td>
              {yearlyData.map((y) => (
                <td key={`const-${y.year}`} className={cellRight}>
                  {formatThousands(y.constructionCost)}
                </td>
              ))}
              <td className={`${cellRight} bg-slate-50 font-bold`}>
                {formatThousands(
                  yearlyData.reduce((sum, y) => sum + y.constructionCost, 0)
                )}
              </td>
            </tr>
            <tr>
              <td className={`${cell} font-medium`}>Soft Costs</td>
              {yearlyData.map((y) => (
                <td key={`soft-${y.year}`} className={cellRight}>
                  {formatThousands(y.softCosts)}
                </td>
              ))}
              <td className={`${cellRight} bg-slate-50 font-bold`}>
                {formatThousands(
                  yearlyData.reduce((sum, y) => sum + y.softCosts, 0)
                )}
              </td>
            </tr>
            <tr>
              <td className={`${cell} font-medium`}>POWC</td>
              {yearlyData.map((y) => (
                <td key={`powc-${y.year}`} className={cellRight}>
                  {formatThousands(y.powc)}
                </td>
              ))}
              <td className={`${cellRight} bg-slate-50 font-bold`}>
                {formatThousands(
                  yearlyData.reduce((sum, y) => sum + y.powc, 0)
                )}
              </td>
            </tr>
            <tr className="font-bold bg-slate-100">
              <td className={`${cell} font-bold`}>Cash Outflow</td>
              {yearlyData.map((y) => (
                <td
                  key={`out-${y.year}`}
                  className={`${cellRight} text-red-600 font-semibold`}
                >
                  {formatThousands(y.total)}
                </td>
              ))}
              <td
                className={`${cellRight} bg-slate-200 font-bold text-red-600`}
              >
                {formatThousands(
                  yearlyData.reduce((sum, y) => sum + y.total, 0)
                )}
              </td>
            </tr>
            <tr className="font-bold bg-emerald-100">
              <td className={`${cell} font-bold`}>Cumulative</td>
              {yearlyData.map((y) => (
                <td
                  key={`cum-${y.year}`}
                  className={`${cellRight} text-emerald-600 font-semibold`}
                >
                  {formatThousands(y.cumulative)}
                </td>
              ))}
              <td
                className={`${cellRight} bg-emerald-200 font-bold text-emerald-600`}
              >
                {formatThousands(
                  yearlyData[yearlyData.length - 1]?.cumulative || 0
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SlideContainer>
  );
}
