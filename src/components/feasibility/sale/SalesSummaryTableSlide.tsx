"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { SaleSalesSummaryTableData } from "@/types/feasibility";

interface Props {
  data: SaleSalesSummaryTableData;
}

function formatNumber(num: number): string {
  return Math.round(num).toLocaleString();
}

const cell = "border border-slate-300 p-2 text-black";
const cellRight = `${cell} text-right`;

export default function SalesSummaryTableSlide({ data }: Props) {
  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Sales & Revenues Assumption"
        className="mb-4"
      />

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-auto text-xs">
        <div>
          <h3 className="text-xs font-bold text-slate-900 mb-2">Gross-to-Net</h3>
          <table className="w-full border-collapse border border-slate-300">
            <tbody className="text-black">
              <tr>
                <td className={`${cell} font-medium`}>Gross Sales</td>
                <td className={cellRight}>{formatNumber(data.grossSales)}</td>
              </tr>
              <tr>
                <td className={`${cell} font-medium`}>Total Deductions</td>
                <td className={cellRight}>
                  {formatNumber(data.totalDeductions)}
                </td>
              </tr>
              <tr className="font-bold bg-emerald-100">
                <td className={`${cell} font-bold`}>Net Proceeds</td>
                <td className={`${cellRight} font-bold`}>
                  {formatNumber(data.netProceeds)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-black">
            <div>
              <p className="font-medium">
                Broker Commission: {formatNumber(data.brokerCommission)}
              </p>
              <p className="font-medium">VAT: {formatNumber(data.vat)}</p>
              <p className="font-medium">
                Escrow Fees: {formatNumber(data.escrowFees)}
              </p>
            </div>
            <div>
              <p className="font-medium">
                Sales Discounts: {formatNumber(data.salesDiscounts)}
              </p>
              <p className="font-medium">
                Defaults: {formatNumber(data.defaults)}
              </p>
              <p className="font-medium">
                Bulk Sales Discount: {formatNumber(data.bulkSalesDiscount)}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-900 mb-2">Assumptions</h3>
          <table className="w-full border-collapse border border-slate-300">
            <tbody className="text-black">
              <tr>
                <td className={`${cell} font-medium`}>Saleable BUA Ratio</td>
                <td className={cellRight}>{data.saleableBUARatio}%</td>
              </tr>
              <tr>
                <td className={`${cell} font-medium`}>Average Price</td>
                <td className={cellRight}>
                  {data.averagePrice} {data.currency}/sqft
                </td>
              </tr>
              <tr>
                <td className={`${cell} font-medium`}>Buyer Mix</td>
                <td className={cellRight}>{data.buyerMix}</td>
              </tr>
              <tr>
                <td className={`${cell} font-medium`}>Launch Offset</td>
                <td className={cellRight}>M{data.launchOffset}</td>
              </tr>
              <tr>
                <td className={`${cell} font-medium`}>Default Rate</td>
                <td className={cellRight}>{data.defaultRate}%</td>
              </tr>
              <tr>
                <td className={`${cell} font-medium`}>Cash Plan</td>
                <td className={cellRight}>{data.cashPlan}</td>
              </tr>
              <tr>
                <td className={`${cell} font-medium`}>Mortgage</td>
                <td className={cellRight}>{data.mortgage}</td>
              </tr>
              <tr>
                <td className={`${cell} font-medium`}>Deductions</td>
                <td className={cellRight}>{data.deductions}</td>
              </tr>
              <tr>
                <td className={`${cell} font-medium`}>Default &amp; Bulk</td>
                <td className={cellRight}>{data.defaultBulk}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SlideContainer>
  );
}
