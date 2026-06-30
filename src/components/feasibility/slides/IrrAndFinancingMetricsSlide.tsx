"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { IrrAndFinancingMetricsData } from "@/types/feasibility";

interface Props extends SlideEditingProps {
  data: IrrAndFinancingMetricsData;
  paragraphs?: string[];
}

export default function IrrAndFinancingMetricsSlide({
  data,
  paragraphs,
  isEditing = false,
  onParagraphChange,
  onDataChange,
}: Props) {
  const fmtCurrency = (num: number) => {
    if (Math.abs(num) >= 1_000_000) {
      return `${data.currency} ${(num / 1_000_000).toFixed(1)}M`;
    }
    return `${data.currency} ${Math.round(num).toLocaleString("en-US")}`;
  };

  const metrics = [
    {
      label: "Unlevered Project IRR",
      value: `${data.projectIrr.toFixed(1)}%`,
      highlight: true,
    },
    {
      label: "Levered Equity IRR",
      value: `${data.equityIrr.toFixed(1)}%`,
      highlight: true,
    },
    {
      label: "Equity Multiple",
      value: `${data.equityMultiple.toFixed(2)}x`,
      highlight: false,
    },
    {
      label: "Payback Period",
      value: `${data.paybackPeriod} Years`,
      highlight: false,
    },
    {
      label: "Min. DSCR",
      value: `${data.minDscr.toFixed(2)}x`,
      highlight: false,
    },
    {
      label: "Loan at Completion",
      value: fmtCurrency(data.loanAtCompletion),
      highlight: false,
    },
  ];

  const commentaryText = paragraphs?.[0] ?? data.commentary;

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="IRR and Key Financing Metrics"
      />

      <div className="flex-1 flex flex-col gap-6 min-h-0">
        <div className="grid grid-cols-3 gap-4 shrink-0">
          {metrics.map((metric, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border ${
                metric.highlight
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                {metric.label}
              </p>
              <p
                className={`text-2xl font-bold ${
                  metric.highlight ? "text-emerald-700" : "text-slate-900"
                }`}
              >
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 border-l-4 border-blue-500 p-4 rounded-r-lg flex-1 min-h-0 overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-800 mb-2">
            Analyst Commentary
          </h3>
          <EditableTextBlock
            text={commentaryText}
            isEditing={isEditing}
            onChange={(text) => {
              onParagraphChange?.(0, text);
              onDataChange?.({ ...data, commentary: text });
            }}
            className="text-sm text-slate-700 leading-relaxed"
          />
        </div>
      </div>
    </SlideContainer>
  );
}
