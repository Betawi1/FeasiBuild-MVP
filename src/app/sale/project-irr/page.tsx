"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useFinModelStore from "@/store/useFinModelStore";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import { BenchmarkBanner } from "@/components/BenchmarkBanner";
import { solveAnnualIRR, type CashFlowPoint } from "@/lib/irr-calculations";
import { buildSaleCashflowDetailProfile } from "@/lib/sale-cash-preview-profile";
import { useStreamPrefix, withStreamPrefix } from "@/lib/stream-path";

type SalePhase = "construction" | "sales" | "handover";
type MonthlyPoint = { month: number; amount: number; phase: SalePhase };

export default function SaleProjectIrrPage() {
  const streamPrefix = useStreamPrefix();
  const projectInfo = useFinModelStore((s) => s.sale.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.sale.cashOutflows);
  const cashInflows = useFinModelStore((s) => s.sale.cashInflows);

  const ncfChartWrapRef = useRef<HTMLDivElement | null>(null);
  const cumChartWrapRef = useRef<HTMLDivElement | null>(null);
  const [ncfHoverMonth, setNcfHoverMonth] = useState<number | null>(null);
  const [cumHoverMonth, setCumHoverMonth] = useState<number | null>(null);
  const [ncfTooltipPos, setNcfTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [cumTooltipPos, setCumTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const currency = projectInfo.currency || "AED";
  const constructionPeriod = cashOutflows.constructionPeriod || 30;
  const postCompletionBuffer = 6;
  const totalMonths = constructionPeriod + postCompletionBuffer; // last month index
  const months = useMemo(
    () => Array.from({ length: totalMonths + 1 }, (_, i) => i),
    [totalMonths]
  );

  // --- UNIFIED CALCULATION PIPELINE (matches `/sale/preview/project-irr`) ---
  const detail = useMemo(
    () => buildSaleCashflowDetailProfile(cashOutflows, projectInfo),
    [cashOutflows, projectInfo]
  );

  const cashFlows: CashFlowPoint[] = useMemo(() => {
    const inflowByMonth = new Map<number, number>();
    for (const p of cashInflows.monthlyInflowSchedule || []) {
      inflowByMonth.set(p.month, (inflowByMonth.get(p.month) || 0) + (p.amount || 0));
    }

    const flows: CashFlowPoint[] = [];
    for (let m = 0; m <= totalMonths; m++) {
      const inflow = inflowByMonth.get(m) || 0;
      const outflow =
        m <= constructionPeriod ? detail.monthlyTotal[m] || 0 : 0;
      flows.push({ month: m, amount: inflow - outflow });
    }
    return flows;
  }, [
    cashInflows.monthlyInflowSchedule,
    detail.monthlyTotal,
    totalMonths,
    constructionPeriod,
  ]);

  const ncfSeries = useMemo(() => cashFlows.map((cf) => cf.amount), [cashFlows]);

  const solved = useMemo(
    () => solveAnnualIRR(cashFlows, 1e-7, 100),
    [cashFlows]
  );
  const unleveredIRR = solved.annualIRR;

  const equityMultiple = useMemo(() => {
    let totalPos = 0;
    let totalNegAbs = 0;
    for (const v of ncfSeries) {
      if (v > 0) totalPos += v;
      if (v < 0) totalNegAbs += Math.abs(v);
    }
    return totalNegAbs > 0 ? totalPos / totalNegAbs : 0;
  }, [ncfSeries]);

  const paybackMonth = useMemo(() => {
    let cumulative = 0;
    for (let i = 0; i < ncfSeries.length; i++) {
      cumulative += ncfSeries[i];
      if (cumulative >= 0) return i;
    }
    return null;
  }, [ncfSeries]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("🔗 [Sale Project IRR — unified pipeline]:", {
      stream: "sale",
      M0: ncfSeries[0],
      M1: ncfSeries[1],
      unleveredIRR: unleveredIRR != null ? `${(unleveredIRR * 100).toFixed(2)}%` : "N/A",
      equityMultiple: equityMultiple.toFixed(2),
      paybackMonth: paybackMonth != null ? `M${paybackMonth}` : "—",
    });
  }, [ncfSeries, unleveredIRR, equityMultiple, paybackMonth]);

  const monthlyPoints: MonthlyPoint[] = useMemo(() => {
    return cashFlows.map((cf) => {
      const m = cf.month;
      const hasInflow = (cashInflows.monthlyInflowSchedule || []).some(
        (p) => p.month === m && (p.amount || 0) > 0
      );
      const phase: SalePhase =
        m > constructionPeriod ? "handover" : hasInflow ? "sales" : "construction";
      return { month: m, amount: cf.amount, phase };
    });
  }, [cashFlows, constructionPeriod, cashInflows.monthlyInflowSchedule]);

  const cumulativePoints = useMemo(() => {
    let cum = 0;
    return monthlyPoints.map((p) => {
      cum += p.amount;
      return { month: p.month, cumulative: cum, phase: p.phase };
    });
  }, [monthlyPoints]);

  const inflowByMonth = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of cashInflows.monthlyInflowSchedule || []) {
      map.set(p.month, (map.get(p.month) || 0) + (p.amount || 0));
    }
    return map;
  }, [cashInflows.monthlyInflowSchedule]);

  const chartData = useMemo(() => {
    const cumMap = new Map<number, number>();
    for (const row of cumulativePoints) cumMap.set(row.month, row.cumulative || 0);
    const ncfMap = new Map<number, number>();
    for (const row of monthlyPoints) ncfMap.set(row.month, row.amount || 0);

    return months.map((m) => {
      const inflow = inflowByMonth.get(m) || 0;
      const net = ncfMap.get(m) || 0;
      const outflow = Math.max(0, inflow - net); // net = inflow - outflow
      return {
        month: m,
        inflow,
        outflow,
        net,
        cumulative: cumMap.get(m) || 0,
      };
    });
  }, [months, inflowByMonth, monthlyPoints, cumulativePoints]);

  const maxAbsNcf = useMemo(
    () => Math.max(1e3, ...monthlyPoints.map((p) => Math.abs(p.amount))),
    [monthlyPoints]
  );
  const maxAbsCum = useMemo(
    () => Math.max(1e3, ...cumulativePoints.map((p) => Math.abs(p.cumulative))),
    [cumulativePoints]
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  const formatNumber = (value: number) => {
    if (!value || Number.isNaN(value)) return "—";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 pb-32">
      <div className="mx-auto max-w-7xl">
        {/* Header Section - Match Component 2 */}
        <div className="mb-8">
          {/* Main Title */}
          <h1 className="mb-2 text-3xl font-bold text-white">
            FinModel App — Component 3
          </h1>

          {/* Subtitle */}
          <p className="mb-6 text-sm text-slate-400">Project IRR</p>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
              <span>Step 1 of 1</span>
              <span>100% Complete</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-full rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="space-y-8 rounded-xl border border-slate-800 bg-slate-900 p-8">
          <div className="mb-6">
            <BenchmarkBanner />
          </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <p className="text-xs text-slate-400">Unlevered IRR (annual)</p>
            <p className="mt-1 font-mono text-emerald-400">
              {unleveredIRR == null
                ? "N/A"
                : `${(unleveredIRR * 100).toFixed(2)}%`}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <p className="text-xs text-slate-400">Equity Multiple</p>
            <p className="mt-1 font-mono text-slate-200">
              {equityMultiple > 0 ? `${equityMultiple.toFixed(2)}x` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <p className="text-xs text-slate-400">Payback</p>
            <p className="mt-1 font-mono text-emerald-400">
              {paybackMonth == null ? "—" : `M${paybackMonth}`}
            </p>
          </div>
        </div>

        {/* Graph 1 */}
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="mb-1 text-lg font-semibold text-white">
            Net Cash Flow (Monthly Timeline)
          </h3>
          <p className="mb-4 text-xs text-slate-400">
            Phases: construction, sales, handover.
          </p>
          <div ref={ncfChartWrapRef} className="relative rounded-lg bg-slate-900/50 p-4">
            <svg
              viewBox="0 0 720 220"
              className="h-auto w-full"
              onMouseMove={(e) => {
                const el = ncfChartWrapRef.current;
                if (!el) return;
                const r = el.getBoundingClientRect();
                setNcfTooltipPos({
                  x: e.clientX - r.left,
                  y: e.clientY - r.top,
                });
              }}
              onMouseLeave={() => {
                setNcfHoverMonth(null);
                setNcfTooltipPos(null);
              }}
            >
              {(() => {
                const svgW = 720;
                const left = 66;
                const right = 16;
                const top = 18;
                const bottom = 190;
                const innerW = svgW - left - right;
                const innerH = bottom - top;
                const xMax = Math.max(1, totalMonths);
                const xAt = (m: number) => left + (m / xMax) * innerW;
                const maxK = maxAbsNcf;
                const yAt = (vK: number) => {
                  const clamped = Math.max(-maxK, Math.min(maxK, vK));
                  const t = (maxK - clamped) / (2 * maxK);
                  return top + t * innerH;
                };
                const zeroY = yAt(0);
                const band = (x1: number, x2: number, fill: string) => (
                  <rect
                    key={`${x1}-${x2}-${fill}`}
                    x={xAt(x1)}
                    y={top}
                    width={Math.max(0, xAt(x2) - xAt(x1))}
                    height={innerH}
                    fill={fill}
                  />
                );
                const slotW = innerW / Math.max(1, monthlyPoints.length);
                const barW = Math.max(1, slotW * 0.85);
                const salesMonths = monthlyPoints.filter((p) => p.phase === "sales").map((p) => p.month);
                const salesStart = salesMonths.length ? Math.min(...salesMonths) : null;
                const salesEnd = salesMonths.length ? Math.max(...salesMonths) : null;
                const handoverStart = constructionPeriod + 1;
                return (
                  <>
                    {band(0, constructionPeriod + 1, "rgba(148,163,184,0.14)")}
                    {salesStart != null && salesEnd != null
                      ? band(salesStart, salesEnd + 1, "rgba(59,130,246,0.14)")
                      : null}
                    {handoverStart <= totalMonths
                      ? band(handoverStart, totalMonths + 1, "rgba(16,185,129,0.10)")
                      : null}
                    <line x1={left} y1={top} x2={left} y2={bottom} stroke="#64748b" strokeWidth="1" />
                    <line x1={left} y1={bottom} x2={left + innerW} y2={bottom} stroke="#64748b" strokeWidth="1" />
                    <line x1={left} y1={zeroY} x2={left + innerW} y2={zeroY} stroke="#64748b" strokeDasharray="4 4" strokeWidth="1" />
                    {[-maxK, -maxK / 2, 0, maxK / 2, maxK].map((v, i) => (
                      <text
                        key={`yncf-${i}`}
                        x={left - 10}
                        y={yAt(v) + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill={v === 0 ? "#94a3b8" : "#cbd5e1"}
                      >
                        {Math.round(v).toLocaleString("en-US")}
                      </text>
                    ))}
                    {monthlyPoints.map((p, i) => {
                      const vK = p.amount;
                      const x = left + i * slotW + (slotW - barW) / 2;
                      const y = yAt(vK);
                      const h = Math.max(1, Math.abs(zeroY - y));
                      const isPos = vK >= 0;
                      const fill =
                        p.phase === "sales"
                          ? isPos
                            ? "#60a5fa"
                            : "#f87171"
                          : isPos
                            ? "#10b981"
                            : "#f87171";
                      return (
                        <rect
                          key={`ncf-${p.month}`}
                          x={x}
                          y={isPos ? y : zeroY}
                          width={barW}
                          height={h}
                          fill={fill}
                          opacity={0.85}
                          rx={1}
                          onMouseEnter={() => setNcfHoverMonth(p.month)}
                          onMouseLeave={() => setNcfHoverMonth(null)}
                        />
                      );
                    })}
                  </>
                );
              })()}
            </svg>
            {ncfHoverMonth != null && ncfTooltipPos != null ? (
              <div
                className="pointer-events-none absolute z-10"
                style={{
                  left: Math.min(ncfTooltipPos.x + 12, 520),
                  top: Math.max(8, ncfTooltipPos.y - 10),
                }}
              >
                {(() => {
                  const d = chartData[ncfHoverMonth];
                  if (!d) return null;
                  return (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
                      <p className="text-sm font-semibold text-white mb-1">
                        Month {d.month}
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Cash Inflow:</span>
                          <span className="text-emerald-400 font-mono">
                            {formatCurrency(d.inflow)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Cash Outflow:</span>
                          <span className="text-red-400 font-mono">
                            {formatCurrency(d.outflow)}
                          </span>
                        </div>
                        <div className="border-t border-slate-700 pt-1 flex justify-between gap-4">
                          <span className="text-slate-300 font-medium">
                            Net Cash Flow:
                          </span>
                          <span
                            className={`font-mono font-semibold ${
                              d.net >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {formatCurrency(d.net)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : null}
            <p className="mt-2 text-center text-xs text-slate-500">
              Values in {currency}
            </p>
          </div>
        </div>

        {/* Graph 2 */}
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="mb-1 text-lg font-semibold text-white">
            Cumulative Cash Flow &amp; Payback (Monthly Timeline)
          </h3>
          <p className="mb-4 text-xs text-slate-400">
            Cumulative sum of the monthly series above; payback is the first month with cumulative ≥ 0.
          </p>
          <div ref={cumChartWrapRef} className="relative rounded-lg bg-slate-900/50 p-4">
            <svg
              viewBox="0 0 720 220"
              className="h-auto w-full"
              onMouseMove={(e) => {
                const el = cumChartWrapRef.current;
                if (!el) return;
                const r = el.getBoundingClientRect();
                setCumTooltipPos({
                  x: e.clientX - r.left,
                  y: e.clientY - r.top,
                });
              }}
              onMouseLeave={() => {
                setCumHoverMonth(null);
                setCumTooltipPos(null);
              }}
            >
              {(() => {
                const svgW = 720;
                const left = 66;
                const right = 16;
                const top = 18;
                const bottom = 190;
                const innerW = svgW - left - right;
                const innerH = bottom - top;
                const xMax = Math.max(1, totalMonths);
                const xAt = (m: number) => left + (m / xMax) * innerW;
                const maxK = maxAbsCum;
                const yAt = (vK: number) => {
                  const clamped = Math.max(-maxK, Math.min(maxK, vK));
                  const t = (maxK - clamped) / (2 * maxK);
                  return top + t * innerH;
                };
                const zeroY = yAt(0);
                const band = (x1: number, x2: number, fill: string) => (
                  <rect
                    key={`c-${x1}-${x2}`}
                    x={xAt(x1)}
                    y={top}
                    width={Math.max(0, xAt(x2) - xAt(x1))}
                    height={innerH}
                    fill={fill}
                  />
                );
                const pts = cumulativePoints.map((row) => ({
                  x: xAt(row.month),
                  y: yAt(row.cumulative),
                }));
                const pathD =
                  pts.length < 2
                    ? ""
                    : pts.reduce((d, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${d} L ${p.x} ${p.y}`), "");
                const paybackX = paybackMonth != null ? xAt(paybackMonth) : null;
                const handoverStart = constructionPeriod + 1;
                const paybackY =
                  paybackMonth != null
                    ? yAt(chartData[paybackMonth]?.cumulative ?? 0)
                    : null;
                return (
                  <>
                    {band(0, constructionPeriod + 1, "rgba(148,163,184,0.14)")}
                    {handoverStart <= totalMonths
                      ? band(handoverStart, totalMonths + 1, "rgba(16,185,129,0.10)")
                      : null}
                    <line x1={left} y1={top} x2={left} y2={bottom} stroke="#64748b" strokeWidth="1" />
                    <line x1={left} y1={bottom} x2={left + innerW} y2={bottom} stroke="#64748b" strokeWidth="1" />
                    <line x1={left} y1={zeroY} x2={left + innerW} y2={zeroY} stroke="#64748b" strokeDasharray="4 4" strokeWidth="1" />
                    {[-maxK, -maxK / 2, 0, maxK / 2, maxK].map((v, i) => (
                      <text
                        key={`ycum-${i}`}
                        x={left - 10}
                        y={yAt(v) + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill={v === 0 ? "#94a3b8" : "#cbd5e1"}
                      >
                        {Math.round(v).toLocaleString("en-US")}
                      </text>
                    ))}
                    <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" />
                    {paybackX != null ? (
                      <line
                        x1={paybackX}
                        x2={paybackX}
                        y1={top}
                        y2={bottom}
                        stroke="rgba(251, 191, 36, 0.7)"
                        strokeWidth="1"
                        strokeDasharray="4 3"
                      />
                    ) : null}
                    {paybackX != null && paybackY != null ? (
                      <>
                        <circle
                          cx={paybackX}
                          cy={paybackY}
                          r={4}
                          fill="#fbbf24"
                          stroke="rgba(251, 191, 36, 0.9)"
                          strokeWidth="2"
                        />
                        <text
                          x={paybackX}
                          y={Math.max(top + 12, paybackY - 10)}
                          textAnchor="middle"
                          fontSize="12"
                          fill="#fbbf24"
                          fontWeight="700"
                        >
                          Payback: M{paybackMonth}
                        </text>
                      </>
                    ) : null}
                    {cumulativePoints.map((row) => (
                      <circle
                        key={`pt-${row.month}`}
                        cx={xAt(row.month)}
                        cy={yAt(row.cumulative)}
                        r={10}
                        fill="transparent"
                        onMouseEnter={() => setCumHoverMonth(row.month)}
                        onMouseLeave={() => setCumHoverMonth(null)}
                      />
                    ))}
                  </>
                );
              })()}
            </svg>
            {cumHoverMonth != null && cumTooltipPos != null ? (
              <div
                className="pointer-events-none absolute z-10"
                style={{
                  left: Math.min(cumTooltipPos.x + 12, 520),
                  top: Math.max(8, cumTooltipPos.y - 10),
                }}
              >
                {(() => {
                  const d = chartData[cumHoverMonth];
                  if (!d) return null;
                  const isPayback = paybackMonth != null && d.month === paybackMonth;
                  return (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
                      <p className="text-sm font-semibold text-white mb-1">
                        Month {d.month}
                        {isPayback ? (
                          <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                            ✓ PAYBACK
                          </span>
                        ) : null}
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Cumulative Cash Flow:</span>
                          <span
                            className={`font-mono font-semibold ${
                              d.cumulative >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {formatCurrency(d.cumulative)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Net Cash Flow:</span>
                          <span
                            className={`font-mono ${
                              d.net >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {formatCurrency(d.net)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : null}
            <p className="mt-2 text-center text-xs text-slate-500">
              Values in {currency}
            </p>
          </div>
        </div>
        </div>

        <PreviewFloatingBar
          previousRoute={withStreamPrefix(streamPrefix, "/preview/cash-inflows")}
          nextRoute={withStreamPrefix(streamPrefix, "/preview/project-irr")}
          nextLabel="Generate Model"
        />
      </div>
    </div>
  );
}

