"use client";

import { useEffect, useState } from "react";
import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type {
  ScenarioAnalysisCase,
  ScenarioAnalysisResultsData,
} from "@/types/feasibility";

interface Props {
  data: ScenarioAnalysisResultsData;
}

function fmtCurrency(currency: string, num: number): string {
  if (Math.abs(num) >= 1_000_000) {
    return `${currency} ${(num / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(num).toLocaleString("en-US")}`;
}

function fmtPct(num: number): string {
  return `${num.toFixed(1)}%`;
}

function getCase(
  scenarios: ScenarioAnalysisCase[],
  name: string
): ScenarioAnalysisCase | undefined {
  return scenarios.find((s) => s.name === name);
}

const METRIC_ROWS: {
  label: string;
  format: (
    currency: string,
    scenario: ScenarioAnalysisCase
  ) => string;
}[] = [
  {
    label: "Project IRR",
    format: (_c, s) => fmtPct(s.projectIRR),
  },
  {
    label: "Equity IRR",
    format: (_c, s) => fmtPct(s.equityIRR),
  },
  {
    label: "NPV",
    format: (c, s) => fmtCurrency(c, s.npv),
  },
  {
    label: "Payback Period (yrs)",
    format: (_c, s) => String(s.paybackPeriod),
  },
  {
    label: "Equity Multiple",
    format: (_c, s) => `${s.equityMultiple.toFixed(2)}x`,
  },
];

export default function ScenarioAnalysisResultsSlide({ data }: Props) {
  const [commentary, setCommentary] = useState(
    data.fallbackCommentary ?? "Generating dynamic scenario analysis..."
  );

  const downside = getCase(data.scenarios, "Downside Case") ?? data.scenarios[0];
  const base = getCase(data.scenarios, "Base Case") ?? data.scenarios[1] ?? data.scenarios[0];
  const upside =
    getCase(data.scenarios, "Upside Case") ??
    data.scenarios[data.scenarios.length - 1];

  useEffect(() => {
    let cancelled = false;

    async function fetchCommentary() {
      try {
        const res = await fetch("/api/feasibility/generate-scenario-commentary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetType: data.assetType,
            location: data.location,
            currency: data.currency,
            scenarios: data.scenarios,
          }),
        });
        if (!res.ok) throw new Error("Commentary request failed");
        const result = (await res.json()) as { commentary?: string };
        if (!cancelled && result.commentary) {
          setCommentary(result.commentary);
        }
      } catch {
        if (!cancelled && data.fallbackCommentary) {
          setCommentary(data.fallbackCommentary);
        }
      }
    }

    fetchCommentary();
    return () => {
      cancelled = true;
    };
  }, [data]);

  const assumptionCards = [
    { scenario: downside, tone: "text-red-700" },
    { scenario: base, tone: "text-blue-700" },
    { scenario: upside, tone: "text-emerald-700" },
  ];

  return (
    <SlideContainer>
      <SlideHeader
        title="Financial Analysis"
        subtitle="Scenario Analysis Results"
        className="!mb-2"
      />

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-2">
            Scenario Summary
          </h3>
          <table className="feasibility-table w-full text-xs text-slate-900 border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 p-2 text-left">Metric</th>
                <th className="border border-slate-300 p-2 text-center bg-red-900">
                  Downside Case
                </th>
                <th className="border border-slate-300 p-2 text-center bg-blue-900">
                  Base Case
                </th>
                <th className="border border-slate-300 p-2 text-center bg-emerald-900">
                  Upside Case
                </th>
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((row, i) => (
                <tr
                  key={row.label}
                  className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}
                >
                  <td className="border border-slate-300 p-2 font-medium">
                    {row.label}
                  </td>
                  <td className="border border-slate-300 p-2 text-center text-red-600 font-semibold">
                    {row.format(data.currency, downside)}
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-bold bg-slate-100">
                    {row.format(data.currency, base)}
                  </td>
                  <td className="border border-slate-300 p-2 text-center text-emerald-600 font-semibold">
                    {row.format(data.currency, upside)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {assumptionCards.map(({ scenario, tone }, index) => (
            <div
              key={`${scenario.name}-${tone}-${index}`}
              className="bg-slate-50 border border-slate-300 rounded p-3"
            >
              <h4 className={`text-xs font-bold mb-2 text-center ${tone}`}>
                {scenario.name} Assumptions
              </h4>
              <ul className="text-sm space-y-1 text-slate-700">
                <li>
                  <span className="font-medium">
                    {scenario.keyAssumptions.labels.revenue}:
                  </span>{" "}
                  {scenario.keyAssumptions.revenueDriver}
                </li>
                <li>
                  <span className="font-medium">
                    {scenario.keyAssumptions.labels.occupancy}:
                  </span>{" "}
                  {scenario.keyAssumptions.occupancyDriver}
                </li>
                <li>
                  <span className="font-medium">Construction Cost:</span>{" "}
                  {scenario.keyAssumptions.constructionCostVariance}
                </li>
                <li>
                  <span className="font-medium">Exit Cap Rate:</span>{" "}
                  {scenario.keyAssumptions.exitCapRate}
                </li>
              </ul>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r shrink-0">
          <h4 className="text-xs font-bold text-slate-800 mb-1">
            Scenario Analysis Commentary
          </h4>
          <p className="text-sm text-slate-700 leading-snug">{commentary}</p>
        </div>
      </div>
    </SlideContainer>
  );
}
