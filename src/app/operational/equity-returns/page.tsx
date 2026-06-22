"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchParamsBoundary from "@/components/SearchParamsBoundary";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import BenchmarkProfile from "@/components/BenchmarkProfile";
import { withStreamPrefix } from "@/lib/stream-path";
import useFinModelStore from "@/store/useFinModelStore";

type EquityTab = "summary" | "multiple" | "payback" | "waterfall";

type CashFlowPoint = { month: number; amount: number };

function CumulativeEquityChart({
  cumulative,
  breakevenMonth,
}: {
  cumulative: number[];
  breakevenMonth: number | null;
}) {
  if (!cumulative || cumulative.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500">No data.</p>
    );
  }
  const h = 100;
  const w = 360;
  const minV = Math.min(0, ...cumulative);
  const maxV = Math.max(0, ...cumulative, 1);
  const range = maxV - minV || 1;
  const pts = cumulative
    .map((v, i) => {
      const x = (i / Math.max(1, cumulative.length - 1)) * w;
      const y = h - 6 - ((v - minV) / range) * (h - 12);
      return `${x},${y}`;
    })
    .join(" ");
  const bx =
    breakevenMonth != null && breakevenMonth < cumulative.length
      ? (breakevenMonth / Math.max(1, cumulative.length - 1)) * w
      : null;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-28 w-full text-emerald-400"
      preserveAspectRatio="none"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {bx != null && (
        <line
          x1={bx}
          x2={bx}
          y1={4}
          y2={h - 4}
          stroke="rgba(251, 191, 36, 0.6)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      )}
    </svg>
  );
}

function MultipleHBarGroup({
  label,
  invested,
  returned,
  maxScale,
}: {
  label: string;
  invested: number;
  returned: number;
  maxScale: number;
}) {
  const scale = maxScale > 0 ? 100 / maxScale : 0;
  return (
    <div className="space-y-2 rounded-lg border border-slate-700/80 bg-slate-900/40 p-3">
      <p className="text-xs font-medium text-slate-300">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] text-slate-500">
            Invested
          </span>
          <div className="h-2.5 min-w-0 flex-1 rounded-full bg-slate-800">
            <div
              className="h-2.5 rounded-full bg-rose-500/75"
              style={{ width: `${Math.min(100, invested * scale)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] text-slate-500">
            Returned
          </span>
          <div className="h-2.5 min-w-0 flex-1 rounded-full bg-slate-800">
            <div
              className="h-2.5 rounded-full bg-emerald-500/75"
              style={{ width: `${Math.min(100, returned * scale)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EquityReturnsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<EquityTab>("summary");

  const operational = useFinModelStore((s) => s.operational);
  const projectIRR = operational?.projectIRR;
  const projectMetrics = projectIRR?.projectMetrics;
  const financingMetrics = operational?.financingMetrics;
  const financing = operational?.financing ?? {};
  const projectInfo = operational?.projectInfo ?? {};

  const totalEquityInvested =
    financingMetrics?.totalEquityAmount ??
    projectMetrics?.totalEquityInvested ??
    projectMetrics?.peakEquityInjected ??
    0;
  const totalDistributions =
    financingMetrics?.netExitProceeds ?? projectMetrics?.totalDistributions ?? 0;
  const equityMultiple =
    financingMetrics?.equityMultiple ?? projectMetrics?.equityMultiple ?? 0;
  const equityPaybackMonth =
    financingMetrics?.equityPayback ?? projectMetrics?.equityPaybackMonth ?? 0;
  const leveredEquityIRRPercent = (() => {
    if (financingMetrics?.equityIRR != null && financingMetrics.equityIRR > 0) {
      return financingMetrics.equityIRR * 100;
    }
    const pct = projectMetrics?.leveredEquityIRR ?? 0;
    return pct;
  })();

  const landEquity = financingMetrics?.landEquityTotal ?? 0;
  const cashEquity = financingMetrics?.cashEquityTotal ?? 0;
  const prefAmount =
    financingMetrics?.preferenceSharesAmount ??
    (financing.preferenceShares?.hasPreferenceShares
      ? Number(financing.preferenceShares?.amount ?? 0)
      : 0);
  const prefRate = financing.preferenceShares?.returnPercent ?? 0;
  const hasPreferenceShares = prefAmount > 0;

  const timelineLength = useMemo(() => {
    const a = projectIRR?.monthlyData?.length ?? 0;
    const b = projectIRR?.equityInjectionByMonth?.length ?? 0;
    return Math.max(a, b, 157); // default: M0..M156
  }, [
    projectIRR?.monthlyData,
    projectIRR?.equityInjectionByMonth,
  ]);

  const exitMonthIndex = useMemo(() => {
    // If the store provides a more specific exit month later, wire it here.
    return Math.max(0, timelineLength - 1);
  }, [timelineLength]);

  const finalEquityCashFlowSeries = useMemo(() => {
    const injections = projectIRR?.equityInjectionByMonth ?? [];
    const base = Array.from({ length: timelineLength }, (_, m) => {
      // Equity injections are stored as positive inflows to the project (Row G).
      // For the equity holder, they are negative cash flows.
      const eqIn = injections[m] ?? 0;
      return -eqIn;
    });

    const exitProceeds = totalDistributions;
    if (base.length > 0 && exitProceeds !== 0) {
      base[exitMonthIndex] = (base[exitMonthIndex] ?? 0) + exitProceeds;
    }
    return base;
  }, [exitMonthIndex, projectIRR?.equityInjectionByMonth, timelineLength, totalDistributions]);

  const equityCashFlows: CashFlowPoint[] = useMemo(
    () => finalEquityCashFlowSeries.map((amount, month) => ({ month, amount })),
    [finalEquityCashFlowSeries]
  );

  const cumulativeEquity = useMemo(() => {
    const cumulative: number[] = [];
    let running = 0;
    for (const v of finalEquityCashFlowSeries) {
      running += v;
      cumulative.push(running);
    }
    return cumulative;
  }, [finalEquityCashFlowSeries]);

  useEffect(() => {
    const tab = searchParams?.get("tab") as EquityTab | null;
    if (
      tab === "summary" ||
      tab === "multiple" ||
      tab === "payback" ||
      tab === "waterfall"
    ) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const currency = projectInfo.currency || "AED";
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  const formatMoney = (v: number) =>
    v > 0 ? formatCurrency(v) : "—";
  const fmtIRR = (n: number) =>
    Number.isFinite(n) && n > 0 ? `${n.toFixed(2)}%` : "—";
  const fmtMult = (n: number) =>
    Number.isFinite(n) && n > 0 ? `${n.toFixed(2)}x` : "—";
  const fmtPay = (n: number) => (n > 0 ? `M${Math.round(n)}` : "—");

  const maxBarScale = Math.max(
    totalEquityInvested,
    totalDistributions,
    landEquity,
    cashEquity,
    prefAmount,
    1
  );

  const maxAbsFlow = Math.max(
    1,
    ...equityCashFlows.map((c) => Math.abs(c.amount))
  );

  const hasFinancingData = totalEquityInvested > 0;

  if (!hasFinancingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <p className="text-lg font-medium">No metrics found.</p>
          <p className="mb-4 text-sm text-slate-400">
            Complete Component 4 Financing Preview to populate equity returns.
          </p>
          <button
            type="button"
            onClick={() => router.push("/operational/preview/financing")}
            className="rounded bg-emerald-600 px-4 py-2 hover:bg-emerald-500"
          >
            Go to Financing Preview
          </button>
        </div>
      </div>
    );
  }

  const projectLabel =
    projectInfo.buildingType === "residential"
      ? "Residential"
      : projectInfo.buildingType || "Project";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="mb-2 text-3xl font-bold text-white">
            FinModel App — Component 5
          </h1>
          <p className="text-slate-400">Equity Returns (read-only)</p>
          <div className="mt-4 h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-emerald-600"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 pb-32">
        <p className="mb-6 text-sm text-slate-500">
          Project: {projectLabel} • Currency: {currency}
        </p>

        <div className="mb-4 rounded-lg border border-amber-700/50 bg-amber-900/20 p-3 text-sm text-amber-300">
          ℹ️ Component 5: Equity Returns (Read-Only) — All metrics sourced from
          Component 4 Financing calculations.
        </div>

        <div className="mb-6">
          <BenchmarkProfile />
        </div>

        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Key Equity Returns Summary
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Read-only from{" "}
            <code className="text-slate-400">operational.financingMetrics</code>{" "}
            (Component 4 Financing Preview)
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Total Equity Invested</p>
              <p className="mt-1 text-xl font-bold text-white">
                {formatMoney(totalEquityInvested)}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Land + Cash Injection
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Total Distributions</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">
                {formatMoney(totalDistributions)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Equity IRR</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">
                {fmtIRR(leveredEquityIRRPercent)}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Annualized</p>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Equity Multiple</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">
                {fmtMult(equityMultiple)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Equity Payback</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">
                {fmtPay(equityPaybackMonth)}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Month of full recovery
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Preference Shares Amount</p>
              <p className="mt-1 text-xl font-bold text-purple-400">
                {prefAmount > 0 ? formatMoney(prefAmount) : "—"}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Configured in Component 4
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50">
          <div className="flex flex-wrap border-b border-slate-700">
            {(
              [
                ["summary", "Summary"],
                ["multiple", "Multiple"],
                ["payback", "Payback"],
                ["waterfall", "Waterfall"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  router.push(`/operational/equity-returns?tab=${id}`, {
                    scroll: false,
                  });
                }}
                className={`px-6 py-3 text-sm font-medium capitalize ${
                  activeTab === id
                    ? "border-b-2 border-emerald-400 text-emerald-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[400px] rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          {activeTab === "summary" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <p className="mb-2 text-sm font-medium text-slate-300">
                  Equity Multiple
                </p>
                <p className="mb-3 text-2xl font-bold text-emerald-400">
                  {fmtMult(equityMultiple)}
                </p>
                <MultipleHBarGroup
                  label="Total Equity"
                  invested={totalEquityInvested}
                  returned={totalDistributions}
                  maxScale={maxBarScale}
                />
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <p className="mb-2 text-sm font-medium text-slate-300">
                  Cumulative Equity Recovery
                </p>
                <p className="mb-1 text-xs text-slate-500">
                  Amber line = payback month{" "}
                  {equityPaybackMonth > 0 ? `(M${equityPaybackMonth})` : ""}
                </p>
                <CumulativeEquityChart
                  cumulative={cumulativeEquity}
                  breakevenMonth={
                    equityPaybackMonth > 0 ? equityPaybackMonth : null
                  }
                />
              </div>
            </div>
          )}

          {activeTab === "multiple" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">
                Invested vs Returned — Tranche Breakdown
              </h3>
              <p className="text-sm text-slate-400">
                Land, cash, and preference tranches from Component 4 financing.
              </p>
              {landEquity > 0 && (
                <MultipleHBarGroup
                  label="Land Equity"
                  invested={landEquity}
                  returned={0}
                  maxScale={maxBarScale}
                />
              )}
              {cashEquity > 0 && (
                <MultipleHBarGroup
                  label="Cash Equity"
                  invested={cashEquity}
                  returned={0}
                  maxScale={maxBarScale}
                />
              )}
              {hasPreferenceShares && (
                <MultipleHBarGroup
                  label="Preference Shares"
                  invested={prefAmount}
                  returned={0}
                  maxScale={maxBarScale}
                />
              )}
              <MultipleHBarGroup
                label="Total Equity (blended)"
                invested={totalEquityInvested}
                returned={totalDistributions}
                maxScale={maxBarScale}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Equity Multiple</p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {fmtMult(equityMultiple)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Total Distributions</p>
                  <p className="text-lg font-semibold text-white">
                    {formatMoney(totalDistributions)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "payback" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">
                Payback Analysis
              </h3>
              <p className="text-sm text-slate-400">
                Cumulative equity recovery from Component 4 post-financing cash
                flows.
              </p>
              <div className="rounded-lg bg-slate-950/60 p-4">
                <CumulativeEquityChart
                  cumulative={cumulativeEquity}
                  breakevenMonth={
                    equityPaybackMonth > 0 ? equityPaybackMonth : null
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Payback Month</p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {fmtPay(equityPaybackMonth)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Total Invested</p>
                  <p className="text-lg font-semibold text-white">
                    {formatMoney(totalEquityInvested)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Total Returned</p>
                  <p className="text-lg font-semibold text-white">
                    {formatMoney(totalDistributions)}
                  </p>
                </div>
              </div>
              {equityCashFlows.length > 0 && (
                <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-800">
                  <table className="min-w-full text-[11px] text-slate-200">
                    <thead className="sticky top-0 bg-slate-900/90">
                      <tr>
                        <th className="px-2 py-1 text-left text-slate-400">
                          Month
                        </th>
                        <th className="px-2 py-1 text-right text-slate-400">
                          Cash flow
                        </th>
                        <th className="px-2 py-1 text-left text-slate-400">
                          Visual
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {equityCashFlows.map((cf) => (
                        <tr
                          key={cf.month}
                          className="odd:bg-slate-900/60 even:bg-slate-900/30"
                        >
                          <td className="px-2 py-1">{cf.month}</td>
                          <td className="px-2 py-1 text-right">
                            {cf.amount.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </td>
                          <td className="px-2 py-1">
                            <div className="h-2 w-full rounded-full bg-slate-800">
                              <div
                                className={`h-2 ${
                                  cf.amount >= 0
                                    ? "bg-emerald-500"
                                    : "bg-rose-500"
                                }`}
                                style={{
                                  width: `${(Math.abs(cf.amount) / maxAbsFlow) * 100}%`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "waterfall" && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">
                Distribution Waterfall
              </h3>
              <p className="mb-4 text-sm text-slate-400">
                Display-only split based on Component 4 financing outputs.
              </p>
              <ol className="space-y-3 text-sm text-slate-300">
                <li className="flex justify-between border-b border-slate-800 pb-2">
                  <span>1. Debt Service</span>
                  <span className="text-slate-500">Component 4</span>
                </li>
                <li className="flex justify-between border-b border-slate-800 pb-2">
                  <span>2. Preference Shares</span>
                  <span className="text-amber-300">
                    {prefAmount > 0 ? formatMoney(prefAmount) : "—"}
                    {prefRate > 0 ? ` @ ${prefRate}%` : ""}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>3. Common Equity Distributions</span>
                  <span className="text-emerald-300">
                    {formatMoney(totalDistributions)}
                  </span>
                </li>
              </ol>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-slate-800/80 p-4">
                  <p className="text-xs text-slate-400">Equity IRR</p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {fmtIRR(leveredEquityIRRPercent)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-800/80 p-4">
                  <p className="text-xs text-slate-400">Equity Multiple</p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {fmtMult(equityMultiple)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <PreviewFloatingBar
        previousRoute={withStreamPrefix("/operational", "/preview/financing")}
        nextRoute={withStreamPrefix("/operational", "/scenario-analysis")}
        nextLabel="Scenario Analysis →"
        showDownload={false}
      />
    </div>
  );
}

export default function EquityReturnsPage() {
  return (
    <SearchParamsBoundary>
      <EquityReturnsPageContent />
    </SearchParamsBoundary>
  );
}
