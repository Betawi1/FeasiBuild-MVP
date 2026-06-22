import SlideHeader from "@/components/feasibility/SlideHeader";
import type { FeasibilityReportData } from "@/lib/feasibility/generate-report";

interface ExecutiveSummaryProps {
  data: FeasibilityReportData;
}

export default function ExecutiveSummary({ data }: ExecutiveSummaryProps) {
  const isFeasible =
    data.financials.projectIRR > 12 && data.financials.equityIRR > 15;

  return (
    <div className="mb-12">
      <SlideHeader title="Executive Summary" subtitle="Financial Feasibility Study" />
      <div className="max-w-none">
        <p className="text-sm text-slate-700 leading-relaxed mb-4">
          The objective of this study is to evaluate the financial feasibility of
          the proposed {data.projectInfo.assetType} development located in{" "}
          {data.projectInfo.location}. The project comprises a total Built-Up
          Area (BUA) of {data.projectInfo.totalBUA.toLocaleString()} sqft with an
          anticipated construction period of{" "}
          {data.projectInfo.constructionPeriod}.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed mb-4">
          Based on the financial analysis, the project demonstrates a{" "}
          <span className="font-bold text-emerald-600">
            Unlevered Project IRR of {data.financials.projectIRR}%
          </span>{" "}
          and an{" "}
          <span className="font-bold text-emerald-600">
            Equity IRR of {data.financials.equityIRR}%
          </span>
          . The total development cost (TDC) is estimated at{" "}
          {data.projectInfo.currency}{" "}
          {data.financials.tdc.toLocaleString()}, with a projected Gross
          Development Value (GDV) of {data.projectInfo.currency}{" "}
          {data.financials.gdv.toLocaleString()}.
        </p>
        <p
          className={`text-sm leading-relaxed p-4 rounded-lg border-l-4 ${
            isFeasible
              ? "bg-emerald-50 border-emerald-500 text-emerald-800"
              : "bg-amber-50 border-amber-500 text-amber-800"
          }`}
        >
          <strong>Conclusion:</strong> The project{" "}
          {isFeasible
            ? "is considered financially feasible and presents a viable investment opportunity"
            : "requires further optimization to meet standard investment hurdles"}
          .
        </p>
      </div>
    </div>
  );
}
