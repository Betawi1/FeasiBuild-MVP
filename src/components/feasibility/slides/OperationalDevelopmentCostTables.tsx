"use client";

import type { OperationalCostBreakdown } from "@/lib/feasibility/build-operational-cost-breakdown";

interface DepreciationBases {
  constructionCost: number;
  constructionLife: number;
  ffeBase: number;
  ffeLife: number;
}

interface Props {
  costBreakdown: OperationalCostBreakdown;
  depreciationBases?: DepreciationBases;
  showDepreciation?: boolean;
}

function fmtNum(num: number): string {
  return Math.round(num).toLocaleString();
}

function fmtCurrency(amount: number, currency: string): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${fmtNum(amount)}`;
}

export default function OperationalDevelopmentCostTables({
  costBreakdown: cb,
  depreciationBases,
  showDepreciation = false,
}: Props) {
  const c = cb.currency;

  return (
    <div className="space-y-3 text-black">
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-2">
          Construction Costs Breakdown
        </h3>
        <table className="w-full text-xs border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-300 p-2 text-left">Component</th>
              <th className="border border-slate-300 p-2 text-right">Area (sqft)</th>
              <th className="border border-slate-300 p-2 text-right">
                Rate ({c}/sqft)
              </th>
              <th className="border border-slate-300 p-2 text-right">
                Amount ({c})
              </th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["Building", cb.building],
                ["Parking", cb.parking],
                ["Basement", cb.basement],
                ["Infrastructure", cb.infrastructure],
              ] as const
            ).map(([label, line]) => (
              <tr key={label}>
                <td className="border border-slate-300 p-2 font-medium">{label}</td>
                <td className="border border-slate-300 p-2 text-right">
                  {fmtNum(line.area)}
                </td>
                <td className="border border-slate-300 p-2 text-right">
                  {fmtNum(line.rate)}
                </td>
                <td className="border border-slate-300 p-2 text-right font-semibold">
                  {fmtNum(line.amount)}
                </td>
              </tr>
            ))}
            <tr className="font-bold bg-slate-50">
              <td className="border border-slate-300 p-2" colSpan={3}>
                Total Construction Costs (before contingency)
              </td>
              <td className="border border-slate-300 p-2 text-right font-bold">
                {fmtNum(cb.totalConstructionBeforeContingency)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 font-medium">
                Contingency ({cb.contingency.percentage}%)
              </td>
              <td className="border border-slate-300 p-2" colSpan={2} />
              <td className="border border-slate-300 p-2 text-right font-semibold">
                {fmtNum(cb.contingency.amount)}
              </td>
            </tr>
            <tr className="font-bold bg-emerald-100">
              <td className="border border-slate-300 p-2" colSpan={3}>
                Total Construction Costs
              </td>
              <td className="border border-slate-300 p-2 text-right font-bold">
                {fmtNum(cb.totalConstructionCosts)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-2">
          Total Development Cost Summary
        </h3>
        <table className="w-full text-xs border-collapse border border-slate-300">
          <tbody>
            <tr>
              <td className="border border-slate-300 p-2 font-medium">
                Total Construction Costs
              </td>
              <td className="border border-slate-300 p-2 text-right font-semibold">
                {fmtNum(cb.totalConstructionCosts)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 font-medium">
                Soft Costs ({cb.softCosts.percentage}%)
              </td>
              <td className="border border-slate-300 p-2 text-right font-semibold">
                {fmtNum(cb.softCosts.amount)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 font-medium">
                POWC ({cb.powc.percentage}%)
              </td>
              <td className="border border-slate-300 p-2 text-right font-semibold">
                {fmtNum(cb.powc.amount)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 font-medium">Land Costs</td>
              <td className="border border-slate-300 p-2 text-right font-semibold">
                {fmtNum(cb.landCosts.amount)}
              </td>
            </tr>
            <tr className="font-bold bg-emerald-100">
              <td className="border border-slate-300 p-2">
                Total Development Cost (TDC)
              </td>
              <td className="border border-slate-300 p-2 text-right font-bold">
                {fmtNum(cb.totalDevelopmentCost)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {showDepreciation && depreciationBases && (
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-2">Depreciation Bases</h3>
          <table className="w-full text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 p-2 text-left">Base</th>
                <th className="border border-slate-300 p-2 text-right">Amount</th>
                <th className="border border-slate-300 p-2 text-right">Life</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2">Construction Cost</td>
                <td className="border border-slate-300 p-2 text-right">
                  {fmtCurrency(depreciationBases.constructionCost, c)}
                </td>
                <td className="border border-slate-300 p-2 text-right">
                  {depreciationBases.constructionLife} yrs
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2">
                  FFE Base (Appliances, Fixtures, A/C)
                </td>
                <td className="border border-slate-300 p-2 text-right">
                  {fmtCurrency(depreciationBases.ffeBase, c)}
                </td>
                <td className="border border-slate-300 p-2 text-right">
                  {depreciationBases.ffeLife} yrs
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
