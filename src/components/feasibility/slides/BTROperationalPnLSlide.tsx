"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { BTROperationalPnLData } from "@/types/feasibility";

interface Props {
  data: BTROperationalPnLData;
  commentary?: string;
}

const cell = "border border-slate-300 py-0.5 px-1";
const cellRight = `${cell} text-right font-mono`;
const cellIndent = `${cell} pl-2`;

function formatNumber(num: number): string {
  return (num / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatPercentage(num: number): string {
  if (!Number.isFinite(num)) return "—";
  return `${num.toFixed(1)}%`;
}

function marginPct(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return formatPercentage((numerator / denominator) * 100);
}

function DataRow({
  label,
  values,
  indent = false,
  bold = false,
  valueClass = "",
}: {
  label: string;
  values: number[];
  indent?: boolean;
  bold?: boolean;
  valueClass?: string;
}) {
  const rowClass = bold ? "font-bold bg-slate-50" : "";
  return (
    <tr className={rowClass}>
      <td className={indent ? cellIndent : cell}>{label}</td>
      {values.map((val, i) => (
        <td key={i} className={`${cellRight} ${valueClass}`}>
          {formatNumber(val)}
        </td>
      ))}
    </tr>
  );
}

function SectionHeader({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr className="bg-slate-100 font-bold">
      <td
        className={`${cell} text-[6px] uppercase tracking-wider`}
        colSpan={colSpan}
      >
        {label}
      </td>
    </tr>
  );
}

export default function BTROperationalPnLSlide({ data, commentary }: Props) {
  const colSpan = data.years.length + 1;
  const y1EbitdaMargin = marginPct(
    data.ebitda[0] ?? 0,
    data.revenues.totalRevenue[0] ?? 0
  );
  const y3EbitdaMargin = marginPct(
    data.ebitda[2] ?? 0,
    data.revenues.totalRevenue[2] ?? 0
  );

  const defaultCommentary = `The Residential BTR development demonstrates strong operational leverage, with EBITDA margins expanding from ${y1EbitdaMargin} in Year 1 to ${y3EbitdaMargin} by Year 3 as lease-up completes and occupancy stabilizes. Post-stabilization, the asset delivers consistent NOI growth supported by recurring residential rents and ancillary income streams.`;

  return (
    <SlideContainer className="[&>div]:p-4">
      <SlideHeader
        title="Financial Analysis"
        subtitle="Operational Profit & Loss"
        className="!mb-2"
      />

      <div className="mb-2 bg-emerald-50 border-l-4 border-emerald-500 p-2 rounded shrink-0">
        <h3 className="text-sm font-bold text-slate-800 mb-1">P&L HIGHLIGHTS</h3>
        <p className="text-sm text-slate-700 leading-relaxed">
          {commentary ?? defaultCommentary}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <table className="w-full text-[7px] border-collapse border border-slate-300 text-slate-900">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className={`${cell} text-left`}>{data.currency} &apos;000</th>
              {data.years.map((year) => (
                <th key={year} className={cellRight}>
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SectionHeader label="REVENUE" colSpan={colSpan} />
            <DataRow
              label="Residential Rent"
              values={data.revenues.residentialRent}
              indent
            />
            <DataRow
              label="Retail Min Rent"
              values={data.revenues.retailMinRent}
              indent
            />
            <DataRow label="Parking" values={data.revenues.parking} indent />
            <DataRow label="Amenity" values={data.revenues.amenity} indent />
            <DataRow label="Utility" values={data.revenues.utility} indent />
            <DataRow label="Other" values={data.revenues.other} indent />
            <DataRow
              label="TOTAL REVENUE"
              values={data.revenues.totalRevenue}
              bold
              valueClass="text-emerald-600"
            />

            <SectionHeader label="OPERATING EXPENSES" colSpan={colSpan} />
            <DataRow
              label="Management Fee"
              values={data.operatingExpenses.managementFee}
              indent
            />
            <DataRow
              label="Maintenance"
              values={data.operatingExpenses.maintenance}
              indent
            />
            <DataRow
              label="Utilities"
              values={data.operatingExpenses.utilities}
              indent
            />
            <DataRow
              label="Property Tax"
              values={data.operatingExpenses.propertyTax}
              indent
            />
            <DataRow
              label="Insurance"
              values={data.operatingExpenses.insurance}
              indent
            />
            <DataRow
              label="Marketing"
              values={data.operatingExpenses.marketing}
              indent
            />
            <DataRow label="G&A" values={data.operatingExpenses.gAndA} indent />
            <DataRow
              label="Renovation / CAPEX Reserve"
              values={data.operatingExpenses.capexReserve}
              indent
            />
            <DataRow
              label="TOTAL EXPENSES"
              values={data.operatingExpenses.totalExpenses}
              bold
              valueClass="text-red-600"
            />

            <SectionHeader label="NET OPERATING INCOME" colSpan={colSpan} />
            <tr className="font-bold bg-emerald-100">
              <td className={cell}>EBITDA</td>
              {data.ebitda.map((val, i) => (
                <td key={i} className={`${cellRight} text-emerald-600`}>
                  {formatNumber(val)}
                </td>
              ))}
            </tr>

            <SectionHeader label="DEPRECIATION & AMORTIZATION" colSpan={colSpan} />
            <DataRow
              label="Total Depreciation & Amortization"
              values={data.depreciationTotal}
              indent
              bold
            />

            <SectionHeader label="NET INCOME" colSpan={colSpan} />
            <tr className="font-bold bg-slate-800 text-white">
              <td className={cell}>Net Income / Loss</td>
              {data.netIncome.map((val, i) => (
                <td key={i} className={cellRight}>
                  {formatNumber(val)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </SlideContainer>
  );
}
