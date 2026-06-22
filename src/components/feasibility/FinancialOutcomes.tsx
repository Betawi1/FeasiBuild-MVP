import type { FeasibilityFinancials } from "@/lib/feasibility/generate-report";

interface FinancialOutcomesProps {
  data: FeasibilityFinancials;
  currency?: string;
}

export default function FinancialOutcomes({
  data,
  currency,
}: FinancialOutcomesProps) {
  const prefix = currency ? `${currency} ` : "";

  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-4 text-slate-700">
        Summary of Key Financial Outcomes
      </h3>
      <table className="feasibility-table w-full text-sm text-slate-900 border-collapse border border-slate-300">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 p-3 text-left font-bold text-slate-900">
              Metric
            </th>
            <th className="border border-slate-300 p-3 text-right font-bold text-slate-900">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-slate-300 p-3 text-slate-900 font-medium">
              Total Development Cost (TDC)
            </td>
            <td className="border border-slate-300 p-3 text-right font-mono">
              {prefix}
              {data.tdc.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </td>
          </tr>
          <tr className="bg-slate-50">
            <td className="border border-slate-300 p-3 text-slate-900 font-medium">
              Gross Development Value (GDV)
            </td>
            <td className="border border-slate-300 p-3 text-right font-mono">
              {prefix}
              {data.gdv.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 p-3 text-slate-900 font-medium">
              Unlevered Project IRR
            </td>
            <td className="border border-slate-300 p-3 text-right font-bold text-emerald-600">
              {data.projectIRR}%
            </td>
          </tr>
          <tr className="bg-slate-50">
            <td className="border border-slate-300 p-3 text-slate-900 font-medium">Levered Equity IRR</td>
            <td className="border border-slate-300 p-3 text-right font-bold text-emerald-600">
              {data.equityIRR}%
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 p-3 text-slate-900 font-medium">Equity Multiple</td>
            <td className="border border-slate-300 p-3 text-right font-bold">
              {data.equityMultiple}x
            </td>
          </tr>
          <tr className="bg-slate-50">
            <td className="border border-slate-300 p-3 text-slate-900 font-medium">Payback Period</td>
            <td className="border border-slate-300 p-3 text-right font-mono">
              {data.paybackPeriod} Years
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 p-3 text-slate-900 font-medium">Net Profit Margin</td>
            <td className="border border-slate-300 p-3 text-right font-bold">
              {data.netProfitMargin}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
