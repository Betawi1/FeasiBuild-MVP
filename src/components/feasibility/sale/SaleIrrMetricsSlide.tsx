"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableSlideParagraphs from "@/components/feasibility/EditableSlideParagraphs";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { SaleIrrMetricsData } from "@/types/feasibility";

interface Props extends SlideEditingProps {
  data: SaleIrrMetricsData;
  paragraphs?: string[];
}

function fmtCurrency(amount: number, currency: string): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

export default function SaleIrrMetricsSlide({
  data,
  paragraphs = [],
  isEditing = false,
  onParagraphChange,
}: Props) {
  const metrics = [
    { label: "Unlevered Project IRR", value: `${data.projectIRR}%`, highlight: true },
    { label: "Levered Equity IRR", value: `${data.equityIRR}%`, highlight: true },
    { label: "Equity Multiple", value: `${data.equityMultiple.toFixed(2)}x`, highlight: false },
    { label: "Payback Period", value: `M${data.paybackMonth}`, highlight: false },
    { label: "Min. DSCR", value: `${data.minDSCR.toFixed(2)}x`, highlight: false },
    { label: "Loan at Completion", value: fmtCurrency(data.loanAtCompletion, data.currency), highlight: false },
  ];

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="IRR and Key Financing Metrics"
        className="mb-4"
      />
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <EditableSlideParagraphs
          paragraphs={paragraphs}
          isEditing={isEditing}
          onParagraphChange={onParagraphChange}
          itemClassName="text-sm text-slate-700 leading-relaxed"
        />
        <div className="grid grid-cols-3 gap-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className={`p-4 rounded-lg border ${
                m.highlight
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                {m.label}
              </p>
              <p
                className={`text-2xl font-bold ${
                  m.highlight ? "text-emerald-700" : "text-slate-900"
                }`}
              >
                {m.value}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          TDC: {fmtCurrency(data.tdc, data.currency)} · Loan at completion:{" "}
          {fmtCurrency(data.loanAtCompletion, data.currency)}
        </p>
      </div>
    </SlideContainer>
  );
}
