"use client";

import { useMemo } from "react";
import useFinModelStore from "@/store/useFinModelStore";
import { resolveDataCentreCapEx } from "./DataCentreConstructionCostsStep";

type DataCentreReviewSummaryStepProps = {
  currency: string;
  city?: string;
  country?: string;
  softCosts: number;
  powc: number;
  ffe: number;
  landCost: number;
  constructionPeriodMonths: number;
};

type MarketStatus =
  | "Within market range"
  | "Slightly above market average"
  | "Significantly above market"
  | "Below market average";

function resolveMarketStatus(
  currentCost: number,
  min: number,
  max: number
): { status: MarketStatus; suggestion: string } {
  if (currentCost < min) {
    return {
      status: "Below market average",
      suggestion:
        "Strong cost efficiency vs peers. Confirm PUE, Tier and contingency buffers are not understated.",
    };
  }
  if (currentCost > max * 1.15) {
    return {
      status: "Significantly above market",
      suggestion:
        "Review M&E rates, IT hardware scope, land, and contingency. Costs are materially above peer benchmarks.",
    };
  }
  if (currentCost > max) {
    return {
      status: "Slightly above market average",
      suggestion:
        "Consider reviewing M&E unit rates, land cost, or contingency to align with market benchmarks.",
    };
  }
  return {
    status: "Within market range",
    suggestion:
      "Your costs are well-aligned with current market benchmarks for this segment, tier, and location.",
  };
}

function formatTier(tier?: string): string {
  if (!tier) return "—";
  const map: Record<string, string> = {
    "tier-ii": "Tier II",
    "tier-iii": "Tier III",
    "tier-iv": "Tier IV",
  };
  return map[tier] || tier;
}

export default function DataCentreReviewSummaryStep({
  currency,
  city,
  country,
  softCosts,
  powc,
  ffe,
  landCost,
  constructionPeriodMonths,
}: DataCentreReviewSummaryStepProps) {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const aiResearch = cashOutflows.aiResearchData;

  const capEx = useMemo(
    () => resolveDataCentreCapEx(projectInfo),
    [projectInfo]
  );

  const buildingCost = capEx.buildingCost;
  const meCost = capEx.meCost;
  const itHardwareCost = capEx.itHardwareCost;
  const professionalFees = capEx.professionalFees;
  const contingency = capEx.contingency;
  const hardCapEx = capEx.totalCapEx;

  const totalProjectCost =
    hardCapEx + softCosts + powc + ffe + landCost;

  const currencyCode = projectInfo.currency || currency || "USD";
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);

  const includeIT =
    projectInfo.dataCentreITHardwareProvidedByOperator === true;

  const categories = [
    { name: "Building & Shell", cost: buildingCost },
    { name: "Critical Infrastructure (M&E)", cost: meCost },
    ...(includeIT
      ? [{ name: "IT Hardware", cost: itHardwareCost }]
      : []),
    { name: "Professional Fees", cost: professionalFees },
    { name: "Contingency", cost: contingency },
    { name: "Land Cost", cost: landCost || 0 },
    { name: "FF&E", cost: ffe || 0 },
    { name: "Soft Costs", cost: softCosts || 0 },
    { name: "POWC", cost: powc || 0 },
  ];

  const categoriesWithPct = categories.map((cat) => ({
    ...cat,
    percentage: totalProjectCost > 0 ? (cat.cost / totalProjectCost) * 100 : 0,
  }));

  const itLoadMw = projectInfo.dataCentreITLoadCapacity || 0;
  const whiteSpace = projectInfo.dataCentreWhiteSpaceArea || 0;
  const costPerMw = itLoadMw > 0 ? totalProjectCost / itLoadMw : 0;
  const costPerSqftWhiteSpace =
    whiteSpace > 0 ? totalProjectCost / whiteSpace : 0;

  const marketBenchmarks = useMemo(() => {
    const raw = aiResearch?.market_benchmarks?.all_in_cost_per_sqft;
    const min = Number(raw?.min);
    const max = Number(raw?.max);
    const recommended = Number(raw?.recommended);
    if (
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      max > 0 &&
      max >= min
    ) {
      return {
        min,
        max,
        recommended: Number.isFinite(recommended)
          ? recommended
          : (min + max) / 2,
        justification:
          typeof raw?.justification === "string" ? raw.justification : undefined,
        fromAi: true as const,
      };
    }
    return null;
  }, [aiResearch?.market_benchmarks?.all_in_cost_per_sqft]);

  // Prefer white-space $/sqft for DC market compare when GFA all-in exists
  const compareCost =
    whiteSpace > 0
      ? costPerSqftWhiteSpace
      : projectInfo.dataCentreTotalBuildingGFA
        ? totalProjectCost / (projectInfo.dataCentreTotalBuildingGFA || 1)
        : 0;

  const marketAssessment = useMemo(() => {
    if (!marketBenchmarks || compareCost <= 0) return null;
    return resolveMarketStatus(
      compareCost,
      marketBenchmarks.min,
      marketBenchmarks.max
    );
  }, [marketBenchmarks, compareCost]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Data Centre — Review &amp; Summary
        </h2>
        <p className="text-sm text-slate-400">
          Read-only summary of CapEx inputs before generating the model.
        </p>
      </div>

      <div className="mx-auto max-w-5xl rounded-lg border border-slate-700 bg-slate-900 p-6">
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
          <span>
            {city || "—"}, {country || "—"}
          </span>
          <span>·</span>
          <span>{currency}</span>
          <span>·</span>
          <span className="text-slate-300">
            {projectInfo.dataCentreSegment === "edge"
              ? "Edge"
              : "Colocation"}
          </span>
          <span>·</span>
          <span>{formatTier(projectInfo.dataCentreTierLevel)}</span>
          <span>·</span>
          <span>{constructionPeriodMonths} months</span>
        </div>

        <h3 className="mb-6 border-b border-slate-700 pb-2 text-lg font-semibold text-white">
          Total Project Costs Breakdown
        </h3>

        <div className="space-y-4">
          {categoriesWithPct.map((cat) => (
            <div key={cat.name} className="flex items-center text-sm">
              <div className="w-64 text-slate-300">{cat.name}</div>
              <div className="w-44 text-right font-mono text-slate-200">
                {formatCurrency(cat.cost)}
              </div>
              <div className="relative mx-6 h-4 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, cat.percentage)}%` }}
                />
              </div>
              <div className="w-12 text-right text-xs text-slate-400">
                {cat.percentage.toFixed(0)}%
              </div>
            </div>
          ))}

          <div className="mt-5 flex items-center border-t border-slate-700 pt-5 text-sm font-bold">
            <div className="w-64 text-white">Total CapEx (All-In)</div>
            <div className="w-44 text-right font-mono text-white">
              {formatCurrency(totalProjectCost)}
            </div>
            <div className="relative mx-6 h-4 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-full rounded-full bg-emerald-500" />
            </div>
            <div className="w-12 text-right text-xs text-slate-400">100%</div>
          </div>
        </div>

        <h3 className="mb-4 mt-10 border-b border-slate-700 pb-2 text-lg font-semibold text-white">
          Data Centre KPIs
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Cost per MW"
            value={
              itLoadMw > 0
                ? formatCurrency(costPerMw)
                : "—"
            }
            hint={itLoadMw > 0 ? `${itLoadMw} MW IT load` : "Set IT load in Step 5"}
          />
          <KpiCard
            label="Cost per sqft (White Space)"
            value={
              whiteSpace > 0
                ? `${formatCurrency(costPerSqftWhiteSpace)} / sqft`
                : "—"
            }
            hint={
              whiteSpace > 0
                ? `${Math.round(whiteSpace).toLocaleString()} sqft`
                : "Set white space in Step 5"
            }
          />
          <KpiCard
            label="PUE"
            value={
              projectInfo.dataCentrePUE != null
                ? projectInfo.dataCentrePUE.toFixed(2)
                : "—"
            }
            hint="Power usage effectiveness"
          />
          <KpiCard
            label="Tier Level"
            value={formatTier(projectInfo.dataCentreTierLevel)}
            hint={
              projectInfo.dataCentrePositioning
                ? projectInfo.dataCentrePositioning === "premium"
                  ? "Premium"
                  : "Standard"
                : "Positioning"
            }
          />
        </div>

        <div className="mt-6 rounded-xl border border-blue-500/30 bg-blue-900/20 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="mt-0.5 h-5 w-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>

            <div className="flex-1">
              <h4 className="mb-2 text-sm font-semibold text-blue-300">
                AI Market Benchmark Recommendation
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-300">
                    Your All-In Cost (white space):
                  </span>
                  <span className="font-mono font-semibold text-white">
                    {compareCost > 0
                      ? `${formatCurrency(compareCost)} / sqft`
                      : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-300">Market Benchmark:</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {marketBenchmarks
                      ? `${formatCurrency(marketBenchmarks.min)} – ${formatCurrency(marketBenchmarks.max)} / sqft`
                      : "Awaiting AI research"}
                  </span>
                </div>
              </div>

              {marketBenchmarks && marketAssessment ? (
                <div className="mt-3 border-t border-blue-500/30 pt-3">
                  <p
                    className={`text-xs font-semibold ${
                      marketAssessment.status === "Within market range" ||
                      marketAssessment.status === "Below market average"
                        ? "text-emerald-400"
                        : marketAssessment.status ===
                            "Slightly above market average"
                          ? "text-amber-400"
                          : "text-rose-400"
                    }`}
                  >
                    {marketAssessment.status === "Within market range"
                      ? "✓ "
                      : ""}
                    Status: {marketAssessment.status}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    💡 {marketAssessment.suggestion}
                  </p>
                  {marketBenchmarks.justification ? (
                    <p className="mt-2 text-[11px] text-slate-500">
                      {marketBenchmarks.justification}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 border-t border-blue-500/30 pt-3">
                  <p className="text-xs text-slate-400">
                    Complete AI research (triggered after Segment &amp;
                    Positioning) to populate location-specific all-in cost
                    benchmarks for this data centre product.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-emerald-400">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}
