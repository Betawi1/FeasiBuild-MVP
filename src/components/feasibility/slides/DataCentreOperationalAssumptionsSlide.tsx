"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import EditableTextBlock from "@/components/feasibility/EditableTextBlock";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";
import type { DataCentreOperationalAssumptionsData } from "@/types/feasibility";

interface Props extends SlideEditingProps {
  data: DataCentreOperationalAssumptionsData;
  paragraphs?: string[];
}

const MAX_BULLETS = 3;

/** Combined revenue mix + OpEx breakdown for data centre operational assumptions. */
export default function DataCentreOperationalAssumptionsSlide({
  data,
  paragraphs = [],
  isEditing = false,
  onParagraphChange,
}: Props) {
  const c = data.currency;
  const cell = "border border-slate-300 px-2 py-0.5";
  const head = "border border-slate-300 px-2 py-1 text-left";
  const headRight = "border border-slate-300 px-2 py-1 text-right";

  // Keep commentary presentation-ready: max 3 short bullets
  const bullets = paragraphs.slice(0, MAX_BULLETS);
  const showCommentary = bullets.length > 0 || isEditing;
  const editItems = isEditing && bullets.length === 0 ? [""] : bullets;

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Operational Assumptions — Revenue Mix & OpEx"
        className="mb-2"
      />
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        {showCommentary && (
          <ul className="shrink-0 list-disc space-y-1 pl-4 text-xs leading-tight text-slate-700">
            {editItems.map((point, idx) => (
              <li key={idx} className="marker:text-slate-500">
                <EditableTextBlock
                  text={point}
                  isEditing={isEditing}
                  onChange={(text) => onParagraphChange?.(idx, text)}
                  className="text-xs leading-tight text-slate-700"
                />
              </li>
            ))}
          </ul>
        )}

        <p className="shrink-0 text-[11px] text-slate-500">
          {data.itLoadMw.toFixed(1)} MW IT load
          {" · "}
          White space {data.whiteSpaceSqft.toLocaleString()} sqft
        </p>

        <div className="mt-1 grid min-h-0 flex-1 grid-cols-2 gap-6 overflow-hidden">
          <div className="min-h-0 overflow-y-auto">
            <h3 className="mb-1.5 text-[11px] font-semibold text-slate-700">
              Revenue mix (Power / Space / Ancillary)
            </h3>
            <table className="feasibility-table w-full border border-slate-300 text-[10px] leading-tight">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className={head}>Revenue Source</th>
                  <th className={headRight}>Amount ({c})</th>
                  <th className={headRight}>%</th>
                </tr>
              </thead>
              <tbody>
                {data.revenueRows.map((row) => (
                  <tr key={row.source}>
                    <td className={cell}>{row.source}</td>
                    <td className={`${cell} text-right font-mono`}>
                      {row.amount.toLocaleString()}
                    </td>
                    <td className={`${cell} text-right`}>{row.sharePct}%</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className={cell}>Total Revenue</td>
                  <td className={`${cell} text-right font-mono`}>
                    {data.totalRevenue.toLocaleString()}
                  </td>
                  <td className={`${cell} text-right`}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="min-h-0 overflow-y-auto">
            <h3 className="mb-1.5 text-[11px] font-semibold text-slate-700">
              OpEx breakdown (Power / Cooling / Maintenance)
            </h3>
            <table className="feasibility-table w-full border border-slate-300 text-[10px] leading-tight">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className={head}>Expense Category</th>
                  <th className={headRight}>Amount ({c})</th>
                  <th className={headRight}>% of Rev</th>
                </tr>
              </thead>
              <tbody>
                {data.opexRows.map((row) => (
                  <tr key={row.category}>
                    <td className={cell}>{row.category}</td>
                    <td className={`${cell} text-right font-mono`}>
                      {row.amount.toLocaleString()}
                    </td>
                    <td className={`${cell} text-right`}>
                      {row.shareOfRevenuePct}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className={cell}>Total OpEx</td>
                  <td className={`${cell} text-right font-mono`}>
                    {data.totalOpex.toLocaleString()}
                  </td>
                  <td className={`${cell} text-right`}>
                    {data.totalRevenue > 0
                      ? `${Math.round((data.totalOpex / data.totalRevenue) * 1000) / 10}%`
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}
