"use client";

import { useMemo, useRef } from "react";
import { useRouter, useParams, notFound } from "next/navigation";
import {
  generateReportData,
  type FeasibilityReportData,
} from "@/lib/feasibility/generate-report";
import ExecutiveSummary from "@/components/feasibility/ExecutiveSummary";
import FinancialOutcomes from "@/components/feasibility/FinancialOutcomes";
import type { FinModelStreamKey } from "@/store/useFinModelStore";

const STREAMS = new Set<string>(["sale", "operational"]);

function parseStream(raw: string | string[] | undefined): FinModelStreamKey | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !STREAMS.has(value)) return null;
  return value as FinModelStreamKey;
}

export default function FeasibilityStudyPage() {
  const router = useRouter();
  const params = useParams();
  const reportRef = useRef<HTMLDivElement>(null);
  const stream = parseStream(params.stream as string | string[] | undefined);
  const reportData: FeasibilityReportData | null = useMemo(
    () => (stream ? generateReportData(stream) : null),
    [stream]
  );

  if (!stream || !reportData) {
    notFound();
  }

  const handleDownloadPDF = () => {
    alert("PDF export will be wired in Phase 2 using the current view.");
  };

  const handleBack = () => {
    router.push(`/${stream}/preview/scenario-analysis`);
  };

  const btnOutline =
    "rounded-lg border border-slate-600 bg-transparent px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800";
  const btnPrimary =
    "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex justify-between items-center gap-4">
        <h1 className="text-lg font-bold text-white truncate">
          Feasibility Study: {reportData.projectInfo.assetType} —{" "}
          {reportData.projectInfo.location}
        </h1>
        <div className="flex shrink-0 gap-3">
          <button type="button" onClick={handleBack} className={btnOutline}>
            ← Back to Scenarios
          </button>
          <button type="button" onClick={handleDownloadPDF} className={btnPrimary}>
            Download PDF
          </button>
        </div>
      </div>

      <div className="pt-24 pb-12 px-4 flex justify-center">
        <div
          ref={reportRef}
          className="w-full max-w-[210mm] bg-white text-slate-900 shadow-2xl p-[20mm] min-h-[297mm]"
        >
          <div className="mb-12 border-b-4 border-emerald-600 pb-6">
            <h1 className="text-4xl font-bold mb-2">Financial Feasibility Study</h1>
            <p className="text-xl text-slate-600">
              {reportData.projectInfo.assetType} Development
            </p>
            <p className="text-slate-500 mt-4">
              {reportData.projectInfo.location} • {new Date().getFullYear()}
            </p>
          </div>

          <ExecutiveSummary data={reportData} />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 border-b pb-2">
              Part I: Project &amp; Market Analysis
            </h2>
            <div className="prose max-w-none text-slate-700">
              <h3 className="font-semibold">Macroeconomic Overview</h3>
              <p>{reportData.marketAnalysis.macroOverview}</p>
              <h3 className="font-semibold mt-4">Industry / Market Analysis</h3>
              <p>{reportData.marketAnalysis.realEstateMarket}</p>
              <h3 className="font-semibold mt-4">Implications on the Project</h3>
              <p>{reportData.marketAnalysis.implications}</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 border-b pb-2">
              Part II: Financial Feasibility Study
            </h2>

            <h3 className="text-xl font-semibold mb-4 text-slate-700">
              Development Assumptions
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded border">
              <div>
                <span className="font-semibold">Total BUA:</span>{" "}
                {reportData.projectInfo.totalBUA.toLocaleString()} sqft
              </div>
              <div>
                <span className="font-semibold">Construction Period:</span>{" "}
                {reportData.projectInfo.constructionPeriod}
              </div>
              <div>
                <span className="font-semibold">Currency:</span>{" "}
                {reportData.projectInfo.currency}
              </div>
              <div>
                <span className="font-semibold">Segment:</span>{" "}
                {reportData.projectInfo.segment}
              </div>
            </div>

            <FinancialOutcomes
              data={reportData.financials}
              currency={reportData.projectInfo.currency}
            />

            <div className="mt-8 p-4 bg-slate-100 border border-dashed border-slate-400 rounded text-center text-slate-500">
              Detailed P&amp;L and Cash Flow tables per component will be rendered
              here in Phase 1.1.
            </div>
          </div>

          <div className="mt-12 pt-6 border-t">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">
              Limiting Conditions
            </h3>
            <p className="text-xs text-slate-400">
              This feasibility study is based on current market assumptions and
              user-provided inputs. Financial projections are indicative and
              subject to market volatility, construction delays, and regulatory
              changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
