"use client";

import { useMemo } from "react";
import useFinModelStore from "@/store/useFinModelStore";
import WarehouseBenchmarkBar from "./WarehouseBenchmarkBar";

type WarehouseReviewSummaryStepProps = {
  currency: string;
  city?: string;
  country?: string;
  softCosts: number;
  softCostPercent: number;
  powc: number;
  powcPercent: number;
  ffe: number;
  ffePercent: number;
  contingencyAmount: number;
  contingencyPercent: number;
  landCost: number;
  totalProjectCost: number;
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
        "Excellent cost efficiency. Ensure quality specifications and contingency are not compromised.",
    };
  }
  if (currentCost > max * 1.15) {
    return {
      status: "Significantly above market",
      suggestion:
        "Review land, shell rates, specialised systems, and contingency. Costs are materially above peer benchmarks for this location and product.",
    };
  }
  if (currentCost > max) {
    return {
      status: "Slightly above market average",
      suggestion:
        "Consider reviewing land cost, specialised systems, or contingency buffer to align with market benchmarks.",
    };
  }
  return {
    status: "Within market range",
    suggestion:
      "Your costs are well-aligned with current market benchmarks for this asset type and location.",
  };
}

export default function WarehouseReviewSummaryStep({
  currency,
  city,
  country,
  softCosts,
  softCostPercent: _softCostPercent,
  powc,
  powcPercent: _powcPercent,
  ffe,
  ffePercent: _ffePercent,
  contingencyAmount,
  contingencyPercent: _contingencyPercent,
  landCost,
  totalProjectCost: _totalProjectCost,
  constructionPeriodMonths,
}: WarehouseReviewSummaryStepProps) {
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const projectInfo = useFinModelStore((s) => s.operational?.projectInfo);
  const developmentType = cashOutflows.developmentType;
  const warehouseConfig = cashOutflows.warehouseConfig;
  const industrialParkConfig = cashOutflows.industrialParkConfig;
  const warehouseCosts = cashOutflows.warehouseCosts;
  const aiResearch = cashOutflows.aiResearchData;

  const isPark = developmentType === "INDUSTRIAL_PARK";
  const units = Math.max(1, industrialParkConfig?.numberOfWarehouses || 1);
  const totalGfa = isPark
    ? (warehouseConfig?.totalBua || 0) * units ||
      industrialParkConfig?.warehouseMix.reduce((s, w) => s + (w.size || 0), 0) ||
      0
    : warehouseConfig?.totalBua || 0;
  const buildingCost = warehouseCosts?.buildingShellCost || 0;
  const siteYardCost = warehouseCosts?.siteYardWorksCost || 0;
  const commonInfraCost = isPark
    ? warehouseCosts?.commonInfrastructureCost || 0
    : 0;
  const loadingCost = warehouseCosts?.loadingAccessCost || 0;
  const specialisedCost = warehouseCosts?.specialisedSystemsCost || 0;
  const profFees = warehouseCosts?.professionalFees || 0;
  const contingency = contingencyAmount || 0;
  const totalCost =
    landCost +
    buildingCost +
    siteYardCost +
    commonInfraCost +
    loadingCost +
    specialisedCost +
    profFees +
    softCosts +
    powc +
    ffe +
    contingency;

  const currencyCode = projectInfo?.currency || currency || "USD";
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);

  const categories = [
    { name: "Building & Shell", cost: buildingCost },
    { name: "Site & Yard Works", cost: siteYardCost },
    ...(isPark
      ? [{ name: "Common Infrastructure", cost: commonInfraCost }]
      : []),
    { name: "Loading & Access", cost: loadingCost },
    { name: "Specialised Systems", cost: specialisedCost },
    { name: "Professional Fees", cost: profFees },
    { name: "Soft Costs", cost: softCosts || 0 },
    { name: "POWC", cost: powc || 0 },
    { name: "FF&E", cost: ffe || 0 },
    { name: "Contingency", cost: contingency || 0 },
    { name: "Land Cost", cost: landCost || 0 },
  ];

  const categoriesWithMetrics = categories.map((cat) => ({
    ...cat,
    perSqft: totalGfa > 0 ? cat.cost / totalGfa : 0,
    percentage: totalCost > 0 ? (cat.cost / totalCost) * 100 : 0,
  }));
  const totalAllInCostPerSqft = totalGfa > 0 ? totalCost / totalGfa : 0;

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
        recommended: Number.isFinite(recommended) ? recommended : (min + max) / 2,
        justification:
          typeof raw?.justification === "string" ? raw.justification : undefined,
        fromAi: true as const,
      };
    }
    return null;
  }, [aiResearch?.market_benchmarks?.all_in_cost_per_sqft]);

  const marketAssessment = useMemo(() => {
    if (!marketBenchmarks) return null;
    return resolveMarketStatus(
      totalAllInCostPerSqft,
      marketBenchmarks.min,
      marketBenchmarks.max
    );
  }, [marketBenchmarks, totalAllInCostPerSqft]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Warehouse / Industrial — Review &amp; Summary
        </h2>
        <WarehouseBenchmarkBar />
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
            {isPark ? "Industrial Park" : "Single Warehouse"}
          </span>
          <span>·</span>
          <span>{constructionPeriodMonths} months</span>
        </div>

        <h3 className="mb-6 border-b border-slate-700 pb-2 text-lg font-semibold text-white">
          Cost per sqft Breakdown
        </h3>

        <div className="space-y-5">
          {categoriesWithMetrics.map((cat) => (
            <div key={cat.name} className="flex items-center text-sm">
              <div className="w-56 text-slate-300">{cat.name}</div>
              <div className="w-44 text-right font-mono text-slate-200">
                {formatCurrency(cat.cost)}
              </div>
              <div className="w-36 text-right font-mono text-slate-200">
                {formatCurrency(cat.perSqft)} / sqft
              </div>
              <div className="relative mx-6 h-4 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
              <div className="w-12 text-right text-xs text-slate-400">
                {cat.percentage.toFixed(0)}%
              </div>
            </div>
          ))}

          <div className="mt-5 flex items-center border-t border-slate-700 pt-5 text-sm font-bold">
            <div className="w-56 text-white">Total All-In Cost</div>
            <div className="w-44 text-right font-mono text-white">
              {formatCurrency(totalCost)}
            </div>
            <div className="w-36 text-right font-mono text-white">
              {formatCurrency(totalAllInCostPerSqft)} / sqft
            </div>
            <div className="relative mx-6 h-4 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-full rounded-full bg-emerald-500" />
            </div>
            <div className="w-12 text-right text-xs text-slate-400">100%</div>
          </div>
        </div>

        {/* AI Recommendation — AI Hint design pattern */}
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
                  <span className="text-slate-300">Your All-In Cost:</span>
                  <span className="font-mono font-semibold text-white">
                    {formatCurrency(totalAllInCostPerSqft)} / sqft
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
                marketAssessment.status === "Within market range" ? (
                  <div className="mt-3 border-t border-blue-500/30 pt-3">
                    <p className="text-xs font-semibold text-emerald-400">
                      ✓ Status: Within market range
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
                    <p
                      className={`mb-1 text-xs font-semibold ${
                        marketAssessment.status ===
                        "Slightly above market average"
                          ? "text-amber-400"
                          : marketAssessment.status ===
                              "Significantly above market"
                            ? "text-rose-400"
                            : marketAssessment.status ===
                                "Below market average"
                              ? "text-emerald-400"
                              : "text-slate-300"
                      }`}
                    >
                      Status: {marketAssessment.status}
                    </p>
                    <p className="text-xs text-slate-400">
                      💡 Suggestion: {marketAssessment.suggestion}
                    </p>
                    {marketBenchmarks.justification ? (
                      <p className="mt-2 text-[11px] text-slate-500">
                        {marketBenchmarks.justification}
                      </p>
                    ) : null}
                  </div>
                )
              ) : (
                <div className="mt-3 border-t border-blue-500/30 pt-3">
                  <p className="text-xs text-slate-400">
                    Complete AI research (triggered after Building Configuration)
                    to populate location-specific all-in cost benchmarks for this
                    warehouse sub-type and grade.
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
