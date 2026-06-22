"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchParamsBoundary from "@/components/SearchParamsBoundary";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import useFinModelStore from "@/store/useFinModelStore";

type EquityTab = "summary" | "multiple" | "payback" | "waterfall";

type CashFlowPoint = { month: number; amount: number };

function seriesFromSaleStore(
  equityInjectionByMonth: number[],
  cumulativeNcfPostFinancingByMonth: number[]
): { equityCashFlows: CashFlowPoint[]; cumulativeEquity: number[] } {
  const len = Math.max(
    equityInjectionByMonth.length,
    cumulativeNcfPostFinancingByMonth.length
  );
  if (len === 0) {
    return { equityCashFlows: [], cumulativeEquity: [] };
  }

  const equityCashFlows: CashFlowPoint[] = [];
  const cumulativeEquity: number[] = [];
  let running = 0;

  for (let m = 0; m < len; m++) {
    const injection = equityInjectionByMonth[m] ?? 0;
    const cumNcf = cumulativeNcfPostFinancingByMonth[m] ?? 0;
    const prevCum =
      m > 0 ? cumulativeNcfPostFinancingByMonth[m - 1] ?? 0 : 0;
    const distribution = Math.max(0, cumNcf - prevCum);
    const net = distribution - injection;
    equityCashFlows.push({ month: m, amount: net });
    running += net;
    cumulativeEquity.push(running);
  }

  return { equityCashFlows, cumulativeEquity };
}

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

  // Sale stream ONLY — never read root / operational slices
  const sale = useFinModelStore((s) => s.sale);
  const saleProjectIRR = sale.projectIRR;
  const saleMetrics = saleProjectIRR.projectMetrics;
  const financing = sale.financing;
  const projectInfo = sale.projectInfo;

  const totalEquityInvested =
    saleMetrics?.totalEquityInvested ?? saleMetrics?.peakEquityInjected ?? 0;
  const totalDistributions = saleMetrics?.totalDistributions ?? 0;
  const leveredEquityIRR = saleMetrics?.leveredEquityIRR ?? 0;
  const equityMultiple = saleMetrics?.equityMultiple ?? 0;
  const equityPaybackMonth = saleMetrics?.equityPaybackMonth ?? 0;

  const prefAmount =
    financing.preferenceShares?.hasPreferenceShares &&
    financing.preferenceShares.amount > 0
      ? financing.preferenceShares.amount
      : 0;
  const prefRate = financing.preferenceShares?.returnPercent ?? 0;
  const hasPreferenceShares = prefAmount > 0;

  const storedEquityCashFlows = saleMetrics?.equityCashFlows ?? [];

  const { equityCashFlows, cumulativeEquity } = useMemo(() => {
    if (storedEquityCashFlows.length > 0) {
      let running = 0;
      const cumulative: number[] = [];
      const points: CashFlowPoint[] = storedEquityCashFlows.map((amount, month) => {
        running += amount;
        cumulative.push(running);
        return { month, amount };
      });
      return { equityCashFlows: points, cumulativeEquity: cumulative };
    }
    return seriesFromSaleStore(
      saleProjectIRR.equityInjectionByMonth ?? [],
      saleProjectIRR.cumulativeNcfPostFinancingByMonth ?? []
    );
  }, [
    storedEquityCashFlows,
    saleProjectIRR.equityInjectionByMonth,
    saleProjectIRR.cumulativeNcfPostFinancingByMonth,
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // eslint-disable-next-line no-console
    console.log("🔍 Component 5 Equity Cash Flows:", storedEquityCashFlows);
  }, [storedEquityCashFlows]);

  const currency = projectInfo.currency || "AED";
  const formatMoney = (v: number) =>
    `${currency} ${(v / 1_000_000).toFixed(2)}M`;
  const fmtIRR = (n: number) =>
    Number.isFinite(n) ? `${n.toFixed(2)}%` : "—";
  const fmtMult = (n: number) =>
    Number.isFinite(n) ? `${n.toFixed(2)}x` : "—";
  const fmtPay = (n: number) => (n > 0 ? `M${Math.round(n)}` : "—");

  const maxBarScale = Math.max(
    totalEquityInvested,
    totalDistributions,
    prefAmount,
    1
  );

  const maxAbsFlow = Math.max(
    1,
    ...equityCashFlows.map((c) => Math.abs(c.amount))
  );

  useEffect(() => {
    const tab = searchParams?.get("tab") as EquityTab | null;
    if (tab === "summary" || tab === "multiple" || tab === "payback" || tab === "waterfall") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  if (!saleMetrics && totalEquityInvested === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <p className="text-lg font-medium">No metrics found.</p>
          <p className="mb-4 text-sm text-slate-400">
            Please generate the model in Component 4 first (
            <code className="text-slate-300">sale.projectIRR.projectMetrics</code>
            ).
          </p>
          <button
            type="button"
            onClick={() => router.push("/sale/preview/financing")}
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

        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Key Equity Returns Summary
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Read-only from{" "}
            <code className="text-slate-400">sale.projectIRR.projectMetrics</code>
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">
                Total Common Equity Invested
              </p>
              <p className="mt-1 text-xl font-bold text-white">
                {formatMoney(totalEquityInvested)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Total Common Distributions</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">
                {formatMoney(totalDistributions)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Common Equity IRR</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">
                {fmtIRR(leveredEquityIRR)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Common Equity Multiple</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">
                {fmtMult(equityMultiple)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Common Equity Payback</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">
                {fmtPay(equityPaybackMonth)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-4">
              <p className="text-xs text-slate-400">Preference Shares Amount</p>
              <p className="mt-1 text-xl font-bold text-purple-400">
                {prefAmount > 0 ? formatMoney(prefAmount) : "—"}
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
                  router.push(`/sale/equity-returns?tab=${id}`, {
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
                  label="Common Equity"
                  invested={totalEquityInvested}
                  returned={totalDistributions}
                  maxScale={maxBarScale}
                />
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <p className="mb-2 text-sm font-medium text-slate-300">
                  Cumulative Cash Flow
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
                Invested vs Returned
              </h3>
              {hasPreferenceShares && (
                <MultipleHBarGroup
                  label="Preference Shares"
                  invested={prefAmount}
                  returned={0}
                  maxScale={maxBarScale}
                />
              )}
              <MultipleHBarGroup
                label="Common Equity"
                invested={totalEquityInvested}
                returned={totalDistributions}
                maxScale={maxBarScale}
              />
            </div>
          )}

          {activeTab === "payback" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">
                Payback Analysis
              </h3>
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
                  <span>3. Common Equity</span>
                  <span className="text-emerald-300">
                    {formatMoney(totalDistributions)}
                  </span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </main>

      <PreviewFloatingBar
        previousRoute="/sale/preview/financing"
        nextRoute="/sale/scenario-analysis"
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
