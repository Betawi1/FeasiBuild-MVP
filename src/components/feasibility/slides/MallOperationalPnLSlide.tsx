"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { MallOperationalPnLData } from "@/types/feasibility";

interface Props extends SlideEditingProps {
  data: MallOperationalPnLData;
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
  tone?: "emerald" | "blue" | "section";
  showRevPct?: boolean;
}) {
  const lineTotal = sum(values);
  const rowClass =
    tone === "emerald"
      ? "font-bold bg-emerald-100"
      : tone === "blue"
        ? "font-bold bg-blue-100"
        : tone === "section"
          ? "bg-slate-100 font-bold"
          : bold
            ? "font-bold bg-slate-50"
            : "";

  return (
    <tr className={rowClass}>
      <td className={`border border-slate-300 py-1 px-2 ${indent ? "pl-3" : ""}`}>{label}</td>
      {values.map((val, i) => (
        <td key={i} className="border border-slate-300 py-1 px-2 text-right font-mono">
          {formatNumber(val)}
        </td>
      ))}
      <td className="border border-slate-300 py-1 px-2 text-right font-mono bg-slate-50">
        {formatNumber(lineTotal)}
      </td>
      <td className="border border-slate-300 py-1 px-2 text-right bg-slate-50">
        {showRevPct ? marginPct(lineTotal, revTotal) : ""}
      </td>
    </tr>
  );
}

export default function MallOperationalPnLSlide({
  data,
  commentary,
  isEditing = false,
  onParagraphChange,
}: Props) {
  const revGrandTotal = sum(data.revenues.totalRevenue);
  const y1EbitdaMargin = marginPct(data.ebitda[0] ?? 0, data.revenues.totalRevenue[0] ?? 0);
  const y3EbitdaMargin = marginPct(data.ebitda[2] ?? 0, data.revenues.totalRevenue[2] ?? 0);

  const defaultCommentary = `The Shopping Mall demonstrates operational leverage, with EBITDA margins moving from ${y1EbitdaMargin} in Year 1 to a stabilized ${y3EbitdaMargin} by Year 3 as lease rates and occupancy mature. Post-stabilization, the asset is projected to deliver consistent operating cash generation that supports overall project return metrics.`;

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
              <th className="border border-slate-300 py-1 px-2 text-left">
                {data.currency} &apos;000
              </th>
              {data.years.map((year) => (
                <th key={year} className="border border-slate-300 py-1 px-2 text-right">
                  {year}
                </th>
              ))}
              <th className="border border-slate-300 py-1 px-2 text-right bg-slate-700">Total</th>
              <th className="border border-slate-300 py-1 px-2 text-right bg-slate-700">% of Rev</th>
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
            <PnlLineRow
              label="Base Rent"
              values={data.revenues.baseRent}
              revTotal={revGrandTotal}
              indent
            />
            <PnlLineRow
              label="Percentage Rent (Overage)"
              values={data.revenues.percentageRent}
              revTotal={revGrandTotal}
              indent
            />
            <PnlLineRow
              label="CAM & Tax Recoveries"
              values={data.revenues.camRecoveries}
              revTotal={revGrandTotal}
              indent
            />
            <PnlLineRow
              label="Parking Income"
              values={data.revenues.parkingIncome}
              revTotal={revGrandTotal}
              indent
            />
            <PnlLineRow
              label="Advertising, Kiosk & Events"
              values={data.revenues.advertisingIncome}
              revTotal={revGrandTotal}
              indent
            />
            <PnlLineRow
              label="Total Gross Revenues"
              values={data.revenues.totalRevenue}
              revTotal={revGrandTotal}
              bold
            />

            <tr className="bg-slate-100 font-bold">
              <td
                className="border border-slate-300 py-1 px-2 text-[9px] uppercase tracking-wider"
                colSpan={data.years.length + 3}
              >
                OPERATING EXPENSES
              </td>
            </tr>
            <PnlLineRow
              label="CAM"
              values={data.operatingExpenses.cam}
              revTotal={revGrandTotal}
              indent
            />
            <PnlLineRow
              label="Property & Insurance"
              values={data.operatingExpenses.propertyInsurance}
              revTotal={revGrandTotal}
              indent
            />
            <PnlLineRow
              label="Marketing & G&A"
              values={data.operatingExpenses.marketingGAndA}
              revTotal={revGrandTotal}
              indent
            />
            <PnlLineRow
              label="Management Fee"
              values={data.operatingExpenses.managementFee}
              revTotal={revGrandTotal}
              indent
            />
            <PnlLineRow
              label="Renovation Provision"
              values={data.operatingExpenses.renovationProvision}
              revTotal={revGrandTotal}
              indent
            />
            <PnlLineRow
              label="Total Operating Expenses"
              values={data.operatingExpenses.totalExpenses}
              revTotal={revGrandTotal}
              bold
            />

            <PnlLineRow
              label="EBITDA"
              values={data.ebitda}
              revTotal={revGrandTotal}
              tone="emerald"
            />

            <tr className="font-bold bg-slate-50">
              <td className="border border-slate-300 py-1 px-2">Total Depreciation & Amortization</td>
              {data.depreciation.total.map((val, i) => (
                <td key={i} className="border border-slate-300 py-1 px-2 text-right font-mono">
                  {formatNumber(val)}
                </td>
              ))}
              <td className="border border-slate-300 py-1 px-2 text-right font-mono bg-slate-50">
                {formatNumber(sum(data.depreciation.total))}
              </td>
              <td className="border border-slate-300 py-1 px-2 text-right bg-slate-50" />
            </tr>

            <PnlLineRow
              label="NET OPERATING INCOME (NOI)"
              values={data.netOperatingIncome}
              revTotal={revGrandTotal}
              tone="blue"
            />
          </tbody>
        </table>
      </div>
    </SlideContainer>
  );
}
