"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { PreferenceSharesExitStrategyData } from "@/types/feasibility";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

interface Props extends SlideEditingProps {
  data: PreferenceSharesExitStrategyData;
  paragraphs?: string[];
}

export default function PreferenceSharesExitStrategySlide({
  data,
  paragraphs = [],
  isEditing = false,
  onParagraphChange,
}: Props) {
  const minDscr = data.minDscrTarget ?? 1.2;
  const dscrMax = Math.max(
    minDscr * 1.25,
    ...data.dscrByYear.map((row) => row.dscr),
    1.5
  );
  const yDomainMax = Math.ceil(dscrMax * 10) / 10;

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Preference Shares, Covenants & Exit Strategy"
      />

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="flex flex-col gap-4 min-h-0">
          <div className="bg-slate-50 border border-slate-300 rounded p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-2 border-b border-slate-300 pb-1">
              Preference Shares
            </h3>
            {data.preferenceShares.isIssuing ? (
              <ul className="text-sm text-slate-700 space-y-2">
                <li>
                  <span className="font-semibold">Amount:</span>{" "}
                  {data.currency}{" "}
                  {data.preferenceShares.amount.toLocaleString()}
                </li>
                <li>
                  <span className="font-semibold">Return Rate:</span>{" "}
                  {data.preferenceShares.returnRate}% p.a.
                </li>
                <li>
                  <span className="font-semibold">Payment Terms:</span> Returns
                  are paid semi-annually.
                </li>
              </ul>
            ) : (
              <p className="text-sm text-slate-700 italic">
                The developer is not issuing preference shares for this
                development.
              </p>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded p-4 flex-1 min-h-0 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 mb-2 border-b border-slate-300 pb-1">
              Debt Covenants
            </h3>
            <ul className="text-sm text-slate-700 space-y-2 list-disc pl-4">
              {data.debtCovenants.map((covenant, i) => (
                <li key={i}>{covenant}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-300 rounded p-4 flex flex-col min-h-0">
          <h3 className="text-sm font-bold text-slate-900 mb-2 border-b border-slate-300 pb-1 shrink-0">
            Debt Service Coverage Ratio (DSCR)
          </h3>
          <div className="w-full min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.dscrByYear}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" fontSize={10} />
                <YAxis domain={[0, yDomainMax]} fontSize={10} />
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number"
                      ? `${value.toFixed(2)}x`
                      : `${value}x`
                  }
                />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <ReferenceLine
                  y={minDscr}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{
                    value: `Min ${minDscr.toFixed(2)}x`,
                    position: "right",
                    fontSize: 10,
                  }}
                />
                <Bar
                  dataKey="dscr"
                  fill="#10b981"
                  name="DSCR (x)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 text-center shrink-0">
            Minimum required DSCR of {minDscr.toFixed(2)}x indicated by red
            dashed line.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-300 rounded p-4 min-h-0 overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-900 mb-2 border-b border-slate-300 pb-1">
            Exit Strategy
          </h3>
          <div className="space-y-3 text-sm text-slate-700">
            <div>
              <p className="font-semibold text-slate-700">Strategy Type:</p>
              <p className="text-base font-bold text-emerald-700">
                {data.exitStrategy.type}
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">Exit Timing:</p>
              <p>{data.exitStrategy.timing}</p>
            </div>

            {data.exitStrategy.type === "Refinance" && (
              <div className="pt-2 border-t border-slate-300">
                <p className="font-semibold text-slate-700 mb-1">
                  Refinance Terms:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Refinance LTC: {data.exitStrategy.refinanceLTC}%</li>
                  <li>Refinance Rate: {data.exitStrategy.refinanceRate}%</li>
                </ul>
              </div>
            )}

            {data.exitStrategy.type === "Sale" && (
              <div className="pt-2 border-t border-slate-300">
                <p className="font-semibold text-slate-700 mb-1">
                  Sale Assumptions:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Exit Cap Rate: {data.exitStrategy.exitCapRate}%</li>
                  <li>Sale Costs: {data.exitStrategy.saleCosts}%</li>
                </ul>
              </div>
            )}

            {data.exitStrategy.type === "Hold" && (
              <div className="pt-2 border-t border-slate-300">
                <p className="italic text-slate-600">
                  Asset held for long-term yield. Terminal value calculated
                  using Exit Cap Rate of {data.exitStrategy.exitCapRate}%.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <EditableSlideParagraphs
        paragraphs={paragraphs}
        isEditing={isEditing}
        onParagraphChange={onParagraphChange}
        className="mt-4 shrink-0"
        itemClassName="text-sm text-slate-700 leading-relaxed"
      />
    </SlideContainer>
  );
}
