"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { SaleDevelopmentCostsData } from "@/types/feasibility";

interface Props {
  data: SaleDevelopmentCostsData;
  paragraphs?: string[];
}

function formatNumber(num: number): string {
  return Math.round(num).toLocaleString();
}

const cell = "border border-slate-300 p-1.5 text-black";
const cellRight = `${cell} text-right`;
const cellAmount = `${cellRight} font-semibold`;

export default function SaleDevelopmentCostsSlide({
  data,
  paragraphs = [],
}: Props) {
  const cc = data.constructionCosts;
  const totalConstructionBeforeContingency =
    cc.building.amount +
    cc.parking.amount +
    cc.basement.amount +
    cc.infrastructure.amount;
  const totalConstruction =
    totalConstructionBeforeContingency + cc.contingency.amount;

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Development Assumptions"
        className="mb-2"
      />

      {paragraphs.length > 0 && (
        <div className="mb-2 bg-blue-50 border-l-4 border-blue-500 px-3 py-2 rounded shrink-0">
          <p className="text-xs text-slate-700 leading-tight">
            {paragraphs[0]}
          </p>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto text-[10px]">
        <h3 className="text-xs font-bold text-slate-900 mb-1">
          Construction Costs Breakdown
        </h3>
        <table className="w-full border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-800">
              <th className={`${cell} text-left text-white text-xs font-bold`}>
                Component
              </th>
              <th className={`${cellRight} text-white text-xs font-bold`}>
                Area (sqft)
              </th>
              <th className={`${cellRight} text-white text-xs font-bold`}>
                Rate ({data.currency}/sqft)
              </th>
              <th className={`${cellRight} text-white text-xs font-bold`}>
                Amount ({data.currency})
              </th>
            </tr>
          </thead>
          <tbody className="text-black text-xs">
            <tr>
              <td className={`${cell} font-medium`}>Building</td>
              <td className={cellRight}>{formatNumber(cc.building.bua)}</td>
              <td className={cellRight}>{formatNumber(cc.building.rate)}</td>
              <td className={cellAmount}>{formatNumber(cc.building.amount)}</td>
            </tr>
            <tr>
              <td className={`${cell} font-medium`}>Parking</td>
              <td className={cellRight}>{formatNumber(cc.parking.bua)}</td>
              <td className={cellRight}>{formatNumber(cc.parking.rate)}</td>
              <td className={cellAmount}>{formatNumber(cc.parking.amount)}</td>
            </tr>
            <tr>
              <td className={`${cell} font-medium`}>Basement</td>
              <td className={cellRight}>{formatNumber(cc.basement.bua)}</td>
              <td className={cellRight}>{formatNumber(cc.basement.rate)}</td>
              <td className={cellAmount}>{formatNumber(cc.basement.amount)}</td>
            </tr>
            <tr>
              <td className={`${cell} font-medium`}>Infrastructure</td>
              <td className={cellRight}>
                {formatNumber(cc.infrastructure.area)}
              </td>
              <td className={cellRight}>
                {formatNumber(cc.infrastructure.rate)}
              </td>
              <td className={cellAmount}>
                {formatNumber(cc.infrastructure.amount)}
              </td>
            </tr>
            <tr className="font-bold bg-slate-50">
              <td className={`${cell} font-bold`} colSpan={3}>
                Total Construction Costs (before contingency)
              </td>
              <td className={`${cellRight} font-bold`}>
                {formatNumber(totalConstructionBeforeContingency)}
              </td>
            </tr>
            <tr>
              <td className={`${cell} font-medium`}>
                Contingency ({cc.contingency.percentage}%)
              </td>
              <td className={cell} colSpan={2} />
              <td className={cellAmount}>
                {formatNumber(cc.contingency.amount)}
              </td>
            </tr>
            <tr className="font-bold bg-emerald-100">
              <td className={`${cell} font-bold`} colSpan={3}>
                Total Construction Costs
              </td>
              <td className={`${cellRight} font-bold`}>
                {formatNumber(totalConstruction)}
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="text-xs font-bold text-slate-900 mb-1 mt-3">
          Total Development Cost Summary
        </h3>
        <table className="w-full border-collapse border border-slate-300">
          <tbody className="text-black text-xs">
            <tr>
              <td className={`${cell} font-medium`}>Total Construction Costs</td>
              <td className={cellAmount}>{formatNumber(totalConstruction)}</td>
            </tr>
            <tr>
              <td className={`${cell} font-medium`}>
                Soft Costs ({cc.softCosts.percentage}%)
              </td>
              <td className={cellAmount}>
                {formatNumber(cc.softCosts.amount)}
              </td>
            </tr>
            <tr>
              <td className={`${cell} font-medium`}>
                POWC ({cc.powc.percentage}%)
              </td>
              <td className={cellAmount}>{formatNumber(cc.powc.amount)}</td>
            </tr>
            <tr>
              <td className={`${cell} font-medium`}>Land Costs</td>
              <td className={cellAmount}>
                {formatNumber(cc.landCosts.amount)}
              </td>
            </tr>
            <tr className="font-bold bg-emerald-100">
              <td className={`${cell} font-bold`}>
                Total Development Cost (TDC)
              </td>
              <td className={`${cellRight} font-bold`}>
                {formatNumber(cc.totalDevelopmentCost)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SlideContainer>
  );
}
