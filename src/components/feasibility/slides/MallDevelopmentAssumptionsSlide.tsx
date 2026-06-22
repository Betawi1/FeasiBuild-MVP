"use client";

import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { MallDevelopmentAssumptionsData } from "@/types/feasibility";
import OperationalDevelopmentCostTables from "./OperationalDevelopmentCostTables";
import { cleanParagraphsForDisplay } from "@/lib/feasibility/clean-ai-content";

interface Props {
  data: MallDevelopmentAssumptionsData;
  paragraphs?: string[];
}

export default function MallDevelopmentAssumptionsSlide({
  data,
  paragraphs = [],
}: Props) {
  const displayParagraphs = cleanParagraphsForDisplay(paragraphs);

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Development Assumptions — General Mall Assumptions"
        className="mb-3"
      />
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {displayParagraphs.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 px-3 py-2 rounded">
            {displayParagraphs.map((p, i) => (
              <p key={i} className="text-xs text-slate-800 leading-tight mb-1 last:mb-0">
                {p}
              </p>
            ))}
          </div>
        )}
        <OperationalDevelopmentCostTables costBreakdown={data.costBreakdown} />
        {(data.tiAllowance > 0 || data.leasingCommissions > 0) && (
          <table className="w-full text-xs border-collapse border border-slate-300">
            <tbody>
              {data.tiAllowance > 0 && (
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">
                    Tenant Improvements (TI)
                  </td>
                  <td className="border border-slate-300 p-2 text-right font-semibold">
                    {Math.round(data.tiAllowance).toLocaleString()} {data.currency}
                  </td>
                </tr>
              )}
              {data.leasingCommissions > 0 && (
                <tr>
                  <td className="border border-slate-300 p-2 font-medium">
                    Leasing Commissions
                  </td>
                  <td className="border border-slate-300 p-2 text-right font-semibold">
                    {Math.round(data.leasingCommissions).toLocaleString()} {data.currency}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </SlideContainer>
  );
}
