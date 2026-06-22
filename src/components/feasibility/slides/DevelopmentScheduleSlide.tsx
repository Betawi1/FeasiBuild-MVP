"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { DevelopmentScheduleData } from "@/types/feasibility";

interface Props {
  data: DevelopmentScheduleData;
  paragraphs?: string[];
}

function fmt(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return n.toLocaleString("en-US");
}

function YearCells({
  yearly,
}: {
  yearly: Array<{ year: string; value: number }>;
}) {
  return (
    <>
      {yearly.map((y) => (
        <td
          key={y.year}
          className="border border-slate-300 px-2 py-1 text-right font-mono"
        >
          {y.value ? fmt(y.value) : ""}
        </td>
      ))}
    </>
  );
}

function SimpleRow({
  label,
  total,
  yearly,
  bold = false,
}: {
  label: string;
  total: number;
  yearly: Array<{ year: string; value: number }>;
  bold?: boolean;
}) {
  return (
    <tr>
      <td
        className={`border border-slate-300 px-2 py-1 ${bold ? "font-bold" : "font-medium"}`}
      >
        {label}
      </td>
      <td
        className={`border border-slate-300 px-2 py-1 text-right font-mono ${bold ? "font-bold" : ""}`}
      >
        {fmt(total)}
      </td>
      <YearCells yearly={yearly} />
    </tr>
  );
}

export default function DevelopmentScheduleSlide({ data, paragraphs = [] }: Props) {
  const yearlyHeaders = data.yearlyHeaders;
  const colSpan = yearlyHeaders.length + 2;

  return (
    <SlideContainer className="[&>div]:p-6">
      <SlideHeader
        title="Financial Analysis"
        subtitle="Hotel Development Schedule"
        className="mb-4"
      />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {paragraphs.length > 0 ? (
          <p className="text-sm text-slate-700 mb-4 leading-relaxed shrink-0 line-clamp-1">
            {paragraphs[0]}
          </p>
        ) : null}

        <div className="flex-1 min-h-0">
          <table className="feasibility-table w-full text-[10px] text-slate-900 border-collapse border border-slate-300 table-fixed">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 px-2 py-1 text-left w-[34%]">
                  Hotel Development Schedule
                </th>
                <th className="border border-slate-300 px-2 py-1 text-right w-[12%]">
                  Total ({data.currency} &apos;000)
                </th>
                {yearlyHeaders.map((y) => (
                  <th
                    key={y}
                    className="border border-slate-300 px-2 py-1 text-right"
                  >
                    {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SimpleRow
                label="Land Acquisition Costs"
                total={data.landAcquisition.total}
                yearly={data.landAcquisition.yearlyCashFlow}
                bold
              />
              <SimpleRow
                label="Total Construction Costs"
                total={data.construction.total}
                yearly={data.construction.yearlyCashFlow}
                bold
              />
              <SimpleRow
                label="Furniture & Equipment (FF&E)"
                total={data.ffe.total}
                yearly={data.ffe.yearlyCashFlow}
                bold
              />

              <tr className="bg-slate-100 font-bold">
                <td className="border border-slate-300 px-2 py-1" colSpan={colSpan}>
                  Soft Costs
                </td>
              </tr>
              {data.softCosts.breakdown.map((item, i) => (
                <tr key={i}>
                  <td className="border border-slate-300 px-2 py-1 pl-4">{item.item}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                    {fmt(item.value)}
                  </td>
                  <YearCells yearly={item.yearly} />
                </tr>
              ))}
              <tr className="font-bold bg-slate-50">
                <td className="border border-slate-300 px-2 py-1">Total Soft Costs</td>
                <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                  {fmt(data.softCosts.total)}
                </td>
                <YearCells yearly={data.softCosts.yearlyCashFlow} />
              </tr>

              <tr className="bg-slate-100 font-bold">
                <td className="border border-slate-300 px-2 py-1" colSpan={colSpan}>
                  Pre-operating Expenses &amp; Working Capital (POWC)
                </td>
              </tr>
              {data.powc.breakdown.map((item, i) => (
                <tr key={i}>
                  <td className="border border-slate-300 px-2 py-1 pl-4">{item.item}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                    {fmt(item.value)}
                  </td>
                  <YearCells yearly={item.yearly} />
                </tr>
              ))}
              <tr className="font-bold bg-slate-50">
                <td className="border border-slate-300 px-2 py-1">Total POWC</td>
                <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                  {fmt(data.powc.total)}
                </td>
                <YearCells yearly={data.powc.yearlyCashFlow} />
              </tr>

              <tr className="bg-slate-800 text-white font-bold">
                <td className="border border-slate-300 px-2 py-1">
                  Total Hotel Development Cost
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                  {fmt(data.totalDevelopmentCost)}
                </td>
                <YearCells yearly={data.totalYearlyCashFlow} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SlideContainer>
  );
}
