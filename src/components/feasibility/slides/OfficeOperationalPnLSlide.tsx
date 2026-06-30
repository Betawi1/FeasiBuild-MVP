"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { OfficeOperationalPnLData } from "@/types/feasibility";

interface Props extends SlideEditingProps {
  data: OfficeOperationalPnLData;
  commentary?: string;
}

function formatNumber(num: number): string {
  return (num / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatPercentage(num: number): string {
  if (!Number.isFinite(num)) return "—";
  return `${num.toFixed(1)}%`;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function marginPct(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return formatPercentage((numerator / denominator) * 100);
}

function PnlLineRow({
  label,
  values,
  revTotal,
  indent = false,
  bold = false,
  tone,
  showRevPct = true,
}: {
  label: string;
  values: number[];
  revTotal: number;
  indent?: boolean;
  bold?: boolean;
  tone?: "emerald" | "blue";
  showRevPct?: boolean;
}) {
  const lineTotal = sum(values);
  const rowClass =
    tone === "emerald"
      ? "font-bold bg-emerald-100"
      : tone === "blue"
        ? "font-bold bg-blue-100"
        : bold
          ? "font-bold bg-slate-50"
          : "";

  return (
    <tr className={rowClass}>
      <td className={`border border-slate-300 py-0.5 px-1.5 ${indent ? "pl-3" : ""}`}>{label}</td>
      {values.map((val, i) => (
        <td key={i} className="border border-slate-300 py-0.5 px-1.5 text-right font-mono">
          {formatNumber(val)}
        </td>
      ))}
      <td className="border border-slate-300 py-0.5 px-1.5 text-right font-mono bg-slate-50">
        {formatNumber(lineTotal)}
      </td>
      <td className="border border-slate-300 py-0.5 px-1.5 text-right bg-slate-50">
        {showRevPct ? marginPct(lineTotal, revTotal) : ""}
      </td>
    </tr>
  );
}

export default function OfficeOperationalPnLSlide({
  data,
  commentary,
  isEditing = false,
  onParagraphChange,
}: Props) {
  const revGrandTotal = sum(data.revenues.totalRevenue);
  const y1EbitdaMargin = marginPct(data.ebitda[0] ?? 0, data.revenues.totalRevenue[0] ?? 0);
  const y3EbitdaMargin = marginPct(data.ebitda[2] ?? 0, data.revenues.totalRevenue[2] ?? 0);

  const defaultCommentary = `The Office + Retail mixed-use tower demonstrates operational leverage, with EBITDA margins moving from ${y1EbitdaMargin} in Year 1 to a stabilized ${y3EbitdaMargin} by Year 3 as office and retail lease rates mature. Post-stabilization, the asset is projected to deliver consistent operating cash generation that supports overall project return metrics.`;

  return (
    <SlideContainer className="[&>div]:p-4">
      <SlideHeader
        title="Financial Analysis"
        subtitle="Operational Profit & Loss"
        className="mb-4"
      />

      <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded shrink-0">
        <h3 className="text-sm font-bold text-slate-800 mb-2">P&L HIGHLIGHTS</h3>
        <EditableTextBlock
          text={commentary ?? defaultCommentary}
          isEditing={isEditing}
          onChange={(text) => onParagraphChange?.(0, text)}
          className="text-sm text-slate-700 leading-relaxed"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <table className="w-full text-[8px] border-collapse border border-slate-300 text-slate-900">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-300 py-0.5 px-1.5 text-left">
                {data.currency} &apos;000
              </th>
              {data.years.map((year) => (
                <th key={year} className="border border-slate-300 py-0.5 px-1.5 text-right">
                  {year}
                </th>
              ))}
              <th className="border border-slate-300 py-0.5 px-1.5 text-right bg-slate-700">Total</th>
              <th className="border border-slate-300 py-0.5 px-1.5 text-right bg-slate-700">% of Rev</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-100 font-bold">
              <td
                className="border border-slate-300 py-1 px-2 text-[9px] uppercase tracking-wider"
                colSpan={data.years.length + 3}
              >
                REVENUES
              </td>
            </tr>
            <PnlLineRow label="Office Rent" values={data.revenues.officeRent} revTotal={revGrandTotal} indent />
            <PnlLineRow label="Retail Min Rent" values={data.revenues.retailMinRent} revTotal={revGrandTotal} indent />
            <PnlLineRow label="CAM & Tax Recoveries" values={data.revenues.camRecoveries} revTotal={revGrandTotal} indent />
            <PnlLineRow label="Parking Income" values={data.revenues.parkingIncome} revTotal={revGrandTotal} indent />
            <PnlLineRow label="Advertising / Signage" values={data.revenues.advertisingIncome} revTotal={revGrandTotal} indent />
            <PnlLineRow label="Total Gross Revenues" values={data.revenues.totalRevenue} revTotal={revGrandTotal} bold />

            <tr className="bg-slate-100 font-bold">
              <td
                className="border border-slate-300 py-1 px-2 text-[9px] uppercase tracking-wider"
                colSpan={data.years.length + 3}
              >
                OPERATING EXPENSES
              </td>
            </tr>
            <PnlLineRow label="CAM" values={data.operatingExpenses.cam} revTotal={revGrandTotal} indent />
            <PnlLineRow label="Property Tax" values={data.operatingExpenses.propertyTax} revTotal={revGrandTotal} indent />
            <PnlLineRow label="Insurance" values={data.operatingExpenses.insurance} revTotal={revGrandTotal} indent />
            <PnlLineRow label="Marketing" values={data.operatingExpenses.marketing} revTotal={revGrandTotal} indent />
            <PnlLineRow label="G&A" values={data.operatingExpenses.gAndA} revTotal={revGrandTotal} indent />
            <PnlLineRow label="Management Fee" values={data.operatingExpenses.managementFee} revTotal={revGrandTotal} indent />
            <PnlLineRow label="Renovation Provision" values={data.operatingExpenses.renovationProvision} revTotal={revGrandTotal} indent />
            <PnlLineRow label="Total Operating Expenses" values={data.operatingExpenses.totalExpenses} revTotal={revGrandTotal} bold />

            <PnlLineRow label="EBITDA" values={data.ebitda} revTotal={revGrandTotal} tone="emerald" />

            <tr className="font-bold bg-slate-50">
              <td className="border border-slate-300 py-0.5 px-1.5">Total Depreciation & Amortization</td>
              {data.depreciationTotal.map((val, i) => (
                <td key={i} className="border border-slate-300 py-0.5 px-1.5 text-right font-mono">
                  {formatNumber(val)}
                </td>
              ))}
              <td className="border border-slate-300 py-0.5 px-1.5 text-right font-mono bg-slate-50">
                {formatNumber(sum(data.depreciationTotal))}
              </td>
              <td className="border border-slate-300 py-0.5 px-1.5 text-right bg-slate-50" />
            </tr>

            <PnlLineRow label="EBIT" values={data.ebit} revTotal={revGrandTotal} tone="blue" showRevPct={false} />
            <PnlLineRow label="Net Income" values={data.netIncome} revTotal={revGrandTotal} bold showRevPct={false} />
          </tbody>
        </table>
      </div>
    </SlideContainer>
  );
}
