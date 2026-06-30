"use client";

import { useEffect, useMemo, useState } from "react";
import SlideContainer from "@/components/feasibility/SlideContainer";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import { generatePnlCommentaryFallback } from "@/lib/feasibility/generate-pnl-commentary";
import type { OperationalPnLData } from "@/types/feasibility";

interface Props extends SlideEditingProps {
  data: OperationalPnLData;
  paragraphs?: string[];
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function pctOfRev(lineTotal: number, revTotal: number): string {
  if (revTotal <= 0) return "—";
  return `${Math.round((lineTotal / revTotal) * 100)}%`;
}

function PnlRow({
  label,
  values,
  revTotal,
  indent = false,
  bold = false,
  tone,
}: {
  label: string;
  values: number[];
  revTotal: number;
  indent?: boolean;
  bold?: boolean;
  tone?: "emerald" | "blue" | "dark";
}) {
  const lineTotal = sum(values);
  const rowClass =
    tone === "emerald"
      ? "font-bold bg-emerald-100"
      : tone === "blue"
        ? "font-bold bg-blue-100"
        : tone === "dark"
          ? "font-bold bg-slate-800 text-white"
          : bold
            ? "font-bold bg-slate-50"
            : "";

  const stickyBg =
    tone === "emerald"
      ? "bg-emerald-100"
      : tone === "blue"
        ? "bg-blue-100"
        : tone === "dark"
          ? "bg-slate-800"
          : bold
            ? "bg-slate-50"
            : "bg-white";

  const totalBg =
    tone === "emerald"
      ? "bg-emerald-200"
      : tone === "blue"
        ? "bg-blue-200"
        : tone === "dark"
          ? "bg-slate-700"
          : bold
            ? "bg-slate-100"
            : "bg-slate-50";

  return (
    <tr className={rowClass}>
      <td
        className={`border border-slate-300 py-1 px-1.5 sticky left-0 z-10 ${stickyBg} ${indent ? "pl-3" : ""}`}
      >
        {label}
      </td>
      {values.map((val, i) => (
        <td key={i} className="border border-slate-300 py-1 px-1.5 text-right font-mono">
          {fmt(val)}
        </td>
      ))}
      <td
        className={`border border-slate-300 py-1 px-1.5 text-right font-mono ${totalBg}`}
      >
        {fmt(lineTotal)}
      </td>
      <td
        className={`border border-slate-300 py-1 px-1.5 text-right font-mono ${totalBg}`}
      >
        {pctOfRev(lineTotal, revTotal)}
      </td>
    </tr>
  );
}

function SectionHeader({
  label,
  colSpan,
}: {
  label: string;
  colSpan: number;
}) {
  return (
    <tr className="bg-slate-100 font-bold">
      <td
        className="border border-slate-300 py-1 px-1.5 sticky left-0 bg-slate-100 z-10"
      >
        {label}
      </td>
      <td colSpan={colSpan} className="border border-slate-300" />
    </tr>
  );
}

export default function OperationalPnLSlide({
  data,
  paragraphs,
  isEditing = false,
  onParagraphChange,
}: Props) {
  const revTotal = sum(data.revenues.totalGrossRevenues);
  const colSpan = data.years.length + 2;

  const pnlPayload = useMemo(
    () => ({
      years: data.years,
      revenues: data.revenues.totalGrossRevenues,
      ebitda: data.ebitda,
      depreciation: data.depreciation,
      netIncome: data.netIncome,
    }),
    [
      data.years,
      data.revenues.totalGrossRevenues,
      data.ebitda,
      data.depreciation,
      data.netIncome,
    ]
  );

  const [commentary, setCommentary] = useState<string>(
    generatePnlCommentaryFallback(data.assetType, pnlPayload)
  );

  useEffect(() => {
    if (isEditing) return;

    let cancelled = false;

    async function fetchCommentary() {
      try {
        const res = await fetch("/api/feasibility/generate-pnl-commentary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetType: data.assetType,
            pnlData: pnlPayload,
          }),
        });
        if (!res.ok) return;
        const result = (await res.json()) as { commentary?: string };
        if (!cancelled && typeof result.commentary === "string") {
          setCommentary(result.commentary);
        }
      } catch {
        /* keep fallback commentary */
      }
    }

    void fetchCommentary();
    return () => {
      cancelled = true;
    };
  }, [data.assetType, pnlPayload, isEditing]);

  const displayCommentary =
    isEditing && paragraphs?.[0] != null ? paragraphs[0] : commentary;

  return (
    <SlideContainer className="[&>div]:p-3">
      <div className="mb-2 border-b-2 border-slate-800 pb-1 shrink-0">
        <h2 className="text-xl font-bold text-slate-900">{data.title}</h2>
        <p className="text-base text-slate-600">{data.subtitle}</p>
      </div>

      <div className="mb-2 bg-emerald-50 border-l-4 border-emerald-500 p-2 rounded shrink-0">
        <h3 className="text-xs font-bold text-slate-800 mb-1">P&amp;L HIGHLIGHTS</h3>
        <EditableTextBlock
          text={displayCommentary}
          isEditing={isEditing}
          onChange={(text) => onParagraphChange?.(0, text)}
          className="text-xs text-slate-700 leading-snug"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-auto">
          <table className="feasibility-table w-full text-[9px] text-slate-900 border-collapse border border-slate-300 table-fixed min-w-[900px]">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 py-1 px-1.5 text-left sticky left-0 bg-slate-800 z-20 w-[22%]">
                  {data.currency} &apos;000
                </th>
                {data.years.map((year) => (
                  <th
                    key={year}
                    className="border border-slate-300 py-1 px-1.5 text-right"
                  >
                    {year}
                  </th>
                ))}
                <th className="border border-slate-300 py-1 px-1.5 text-right bg-slate-700 w-[9%]">
                  Total
                </th>
                <th className="border border-slate-300 py-1 px-1.5 text-right bg-slate-700 w-[8%]">
                  % of Rev
                </th>
              </tr>
            </thead>
            <tbody>
              <SectionHeader label="REVENUES" colSpan={colSpan} />
              <PnlRow
                label="Hotel Room Revenues"
                values={data.revenues.roomRevenues}
                revTotal={revTotal}
                indent
              />
              <PnlRow
                label="F&B Revenues"
                values={data.revenues.fAndBRevenues}
                revTotal={revTotal}
                indent
              />
              <PnlRow
                label="Other Source of Revenues"
                values={data.revenues.otherRevenues}
                revTotal={revTotal}
                indent
              />
              <PnlRow
                label="Total Gross Revenues"
                values={data.revenues.totalGrossRevenues}
                revTotal={revTotal}
                bold
              />

              <SectionHeader label="Direct Cost" colSpan={colSpan} />
              <PnlRow
                label="Rooms Department"
                values={data.directCosts.roomsDepartment}
                revTotal={revTotal}
                indent
              />
              <PnlRow
                label="F&B Department"
                values={data.directCosts.fAndBDepartment}
                revTotal={revTotal}
                indent
              />
              <PnlRow
                label="Other Operating Departments"
                values={data.directCosts.otherDepartments}
                revTotal={revTotal}
                indent
              />
              <PnlRow
                label="Total Direct Cost"
                values={data.directCosts.totalDirectCosts}
                revTotal={revTotal}
                bold
              />

              <SectionHeader label="Undistributed Expenses" colSpan={colSpan} />
              <PnlRow
                label="General and Administrative Expenses"
                values={data.undistributedExpenses.gAndA}
                revTotal={revTotal}
                indent
              />
              <PnlRow
                label="Marketing and Sales Expenses"
                values={data.undistributedExpenses.marketingAndSales}
                revTotal={revTotal}
                indent
              />
              <PnlRow
                label="Property Operations & Maintenance"
                values={data.undistributedExpenses.propertyOpsAndMaintenance}
                revTotal={revTotal}
                indent
              />
              <PnlRow
                label="Utilities"
                values={data.undistributedExpenses.utilities}
                revTotal={revTotal}
                indent
              />
              <PnlRow
                label="Management Fees"
                values={data.undistributedExpenses.managementFees}
                revTotal={revTotal}
                indent
              />
              <PnlRow
                label="Total Undistributed Expenses"
                values={data.undistributedExpenses.totalUndistributedExpenses}
                revTotal={revTotal}
                bold
              />

              <PnlRow
                label="EBITDA"
                values={data.ebitda}
                revTotal={revTotal}
                tone="emerald"
              />
              <PnlRow
                label="Depreciation and Amortization"
                values={data.depreciation}
                revTotal={revTotal}
                indent
              />
              <PnlRow
                label="EBIT"
                values={data.ebit}
                revTotal={revTotal}
                tone="blue"
              />
              <PnlRow
                label="Net Income/ Loss"
                values={data.netIncome}
                revTotal={revTotal}
                tone="dark"
              />
            </tbody>
          </table>
        </div>
      </div>
    </SlideContainer>
  );
}
