"use client";

import { useMemo } from "react";
import { DEFAULT_POWC_ALLOCATION } from "@/lib/cash-outflow-default-allocations";
import { allocatePowcMonthlyFromStep13 } from "@/lib/cash-outflow-powc-timing";
import useFinModelStore from "@/store/useFinModelStore";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";

export default function PreviewPreFinancingPage() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const cashInflows = useFinModelStore((s) => s.cashInflows);

  const constructionPeriod = cashOutflows.constructionPeriod || 30;
  const sa = cashOutflows.stageAllocation;
  const stage1End = Math.max(
    0,
    Math.round(constructionPeriod * ((sa?.stage1Percent ?? 20) / 100))
  );
  const stage2End = Math.max(
    stage1End,
    Math.round(
      constructionPeriod *
        (((sa?.stage1Percent ?? 20) + (sa?.stage2Percent ?? 30)) / 100)
    )
  );

  const totalSaleableBUA = useMemo(() => {
    return (
      cashOutflows.buildingBUA *
      ((cashInflows.saleableBUARatio ?? 0) / 100)
    );
  }, [cashOutflows.buildingBUA, cashInflows.saleableBUARatio]);

  const grossSales = useMemo(() => {
    return totalSaleableBUA * (cashInflows.salesPrice ?? 0);
  }, [totalSaleableBUA, cashInflows.salesPrice]);

  const deductionsPercent = useMemo(() => {
    const bm = cashInflows.buyerMix ?? {};
    const bulk = cashInflows.bulkSales ?? {};
    return (
      (bm.brokerCommissionPercent ?? 0) +
      (bm.vatPercent ?? 0) +
      (bm.escrowFeePercent ?? 0) +
      (bm.salesDiscountPercent ?? 0) +
      (cashInflows.defaultRate ?? 0) +
      ((bulk.bulkSalesSharePercent ?? 0) * (bulk.bulkSalesDiscountPercent ?? 0)) /
        100
    );
  }, [cashInflows.buyerMix, cashInflows.defaultRate, cashInflows.bulkSales]);

  const netProceeds = useMemo(() => {
    return grossSales * (1 - deductionsPercent / 100);
  }, [grossSales, deductionsPercent]);

  const monthlySchedule = useMemo(() => {
    const months = 36;
    const weights: number[] = [];
    const uptake = cashInflows.salesUptake ?? { mode: "preset", preset: "even", manualCsv: "" };

    if (uptake.mode === "manual" && uptake.manualCsv?.trim()) {
      const parts = uptake.manualCsv
        .split(",")
        .map((p: string) => Number(p.trim()))
        .filter((n: number) => !Number.isNaN(n) && n > 0);
      const sum = parts.reduce((s: number, n: number) => s + n, 0) || 1;
      for (let i = 0; i < months; i++) {
        const idx = i < parts.length ? i : parts.length - 1;
        weights.push(parts[idx] / sum);
      }
    } else {
      for (let i = 0; i < months; i++) {
        let w = 1;
        if (uptake.preset === "front_loaded") w = months - i;
        else if (uptake.preset === "back_loaded") w = i + 1;
        weights.push(w);
      }
      const sum = weights.reduce((s: number, n: number) => s + n, 0) || 1;
      for (let i = 0; i < months; i++) weights[i] = weights[i] / sum;
    }

    return weights.map((w, i) => ({
      month: i,
      inflowAmount: netProceeds * w,
    }));
  }, [cashInflows.salesUptake, netProceeds]);

  const baseCC =
    (cashOutflows.baseConstructionCost ?? 0) ||
    (cashOutflows.constructionCost ?? 0) /
      (1 + ((cashOutflows.contingencyPercent ?? 0) / 100));
  const contingencyTotal =
    (cashOutflows.constructionCost ?? 0) - baseCC;
  const contingencyMonthly =
    constructionPeriod > 0 ? contingencyTotal / constructionPeriod : 0;

  const constructionMonthly = useMemo(() => {
    const arr = Array(31).fill(0);
    const totalCC = cashOutflows.constructionCost ?? 0;
    for (let m = 1; m <= constructionPeriod; m++) {
      const progress = m / constructionPeriod;
      const sCurveValue = 1 / (1 + Math.exp(-12 * (progress - 0.5)));
      const prevProgress = (m - 1) / constructionPeriod;
      const prevSCurveValue = 1 / (1 + Math.exp(-12 * (prevProgress - 0.5)));
      const monthShare = Math.max(0, sCurveValue - prevSCurveValue);
      arr[m] = totalCC * monthShare;
    }
    return arr;
  }, [cashOutflows.constructionCost, constructionPeriod]);

  const softCostsMonthly = useMemo(() => {
    const arr = Array(31).fill(0);
    const sc = cashOutflows.softCosts ?? 0;
    arr[0] = sc * 0.5;
    if (constructionPeriod > 1) arr[1] = sc * 0.3;
    if (constructionPeriod > 2) arr[2] = sc * 0.2;
    return arr;
  }, [cashOutflows.softCosts, constructionPeriod]);

  const powcMonthly = useMemo(() => {
    const powcTotal = cashOutflows.powc ?? 0;
    const po = cashOutflows.powcAllocation ?? { ...DEFAULT_POWC_ALLOCATION };
    const full = allocatePowcMonthlyFromStep13(
      powcTotal,
      constructionPeriod,
      po
    );
    const arr = Array(31).fill(0);
    for (let m = 0; m < Math.min(31, full.length); m++) {
      arr[m] = full[m] ?? 0;
    }
    return arr;
  }, [cashOutflows.powc, cashOutflows.powcAllocation, constructionPeriod]);

  const cashFlowData = useMemo(() => {
    const data: {
      month: number;
      unitSales: number;
      bulkSales: number;
      otherInflow: number;
      totalInflow: number;
      landCost: number;
      construction: number;
      softCosts: number;
      powc: number;
      totalOutflow: number;
      netCashFlow: number;
      cumulative: number;
    }[] = [];
    let cumulative = 0;
    for (let m = 0; m <= 30; m++) {
      const unitSales =
        monthlySchedule.find((s) => s.month === m)?.inflowAmount ?? 0;
      const bulkSales =
        m >= 24
          ? netProceeds * 0.1 * (m === 24 ? 0.6 : 0.4)
          : 0;
      const totalInflow = unitSales + bulkSales;
      const landCost = m === 0 ? (cashOutflows.landCost ?? 0) : 0;
      const construction = constructionMonthly[m] ?? 0;
      const softCosts = softCostsMonthly[m] ?? 0;
      const powc = powcMonthly[m] ?? 0;
      const totalOutflow = landCost + construction + softCosts + powc;
      const netCashFlow = totalInflow - totalOutflow;
      cumulative += netCashFlow;
      data.push({
        month: m,
        unitSales,
        bulkSales,
        otherInflow: 0,
        totalInflow,
        landCost,
        construction,
        softCosts,
        powc,
        totalOutflow,
        netCashFlow,
        cumulative,
      });
    }
    return data;
  }, [
    monthlySchedule,
    netProceeds,
    constructionMonthly,
    softCostsMonthly,
    powcMonthly,
    cashOutflows.landCost,
  ]);

  const peakFunding = useMemo(() => {
    return Math.abs(Math.min(...cashFlowData.map((d) => d.cumulative), 0));
  }, [cashFlowData]);

  const firstPositiveMonth = useMemo(() => {
    const idx = cashFlowData.findIndex((d) => d.cumulative >= 0);
    return idx >= 0 ? idx : null;
  }, [cashFlowData]);

  const totalInflows = useMemo(
    () => cashFlowData.reduce((sum, d) => sum + d.totalInflow, 0),
    [cashFlowData]
  );
  const totalOutflows = useMemo(
    () => cashFlowData.reduce((sum, d) => sum + d.totalOutflow, 0),
    [cashFlowData]
  );
  const netSurplus = totalInflows - totalOutflows;

  const currency = projectInfo.currency || "AED";
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);

  const formatNumber = (value: number) => {
    if (value === 0 || value === -0) return "-";
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(Math.round(value / 1000));
  };

  const handleDownload = (format: "sheets" | "excel" | "csv") => {
    console.log(`Download ${format} — Pre-Financing Model`);
    alert(`${format.toUpperCase()} export will be implemented here.`);
  };

  const contingencyPerMonth =
    constructionPeriod > 0 ? contingencyTotal / constructionPeriod : 0;

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 pb-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-white">
            📊 Cash Flow Preview — Pre-Financing (Components 1 + 2)
          </h1>
          <p className="text-sm text-slate-400">
            Project: {projectInfo.buildingType}, {projectInfo.city} • Currency:{" "}
            {projectInfo.currency} • Period: {constructionPeriod} months
          </p>
        </div>

        <div className="mb-6 overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            MONTHLY CASH FLOWS ({currency} &apos;000)
          </h2>

          <table className="min-w-[1800px] w-full text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 min-w-[120px] border-b border-slate-700 bg-slate-800 px-3 py-2 text-left font-medium text-slate-300">
                  CASH ITEM
                </th>
                {[...Array(31)].map((_, i) => (
                  <th
                    key={i}
                    className="min-w-[40px] border-b border-slate-700 px-1 py-2 text-center text-xs text-slate-400"
                  >
                    M{i}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 border-b border-slate-700 bg-slate-800" />
                <th className="border-b border-slate-700" />
                <th
                  colSpan={stage1End}
                  className="border-b border-slate-700 border-l-2 border-l-emerald-600 bg-slate-900/50 px-1 py-1 text-center text-xs text-emerald-400"
                >
                  ENABLING
                </th>
                <th
                  colSpan={stage2End - stage1End}
                  className="border-b border-slate-700 border-l-2 border-l-emerald-600 bg-slate-900/30 px-1 py-1 text-center text-xs text-emerald-400"
                >
                  SUB-STRUCTURE
                </th>
                <th
                  colSpan={Math.max(0, 30 - stage2End)}
                  className="border-b border-slate-700 border-l-2 border-l-emerald-600 bg-slate-900/50 px-1 py-1 text-center text-xs text-emerald-400"
                >
                  SUPER + FIN
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-emerald-900/10">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 font-semibold text-emerald-300">
                  💚 CASH INFLOWS
                </td>
                {[...Array(31)].map((_, i) => (
                  <td
                    key={i}
                    className="border-b border-slate-700/50"
                  />
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 text-slate-300">
                  • Unit Sales
                </td>
                {cashFlowData.map((d) => (
                  <td
                    key={d.month}
                    className="border-b border-slate-700/50 px-1 py-2 text-center text-xs text-emerald-400"
                  >
                    {formatNumber(d.unitSales)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 text-slate-300">
                  • Bulk Sales
                </td>
                {cashFlowData.map((d) => (
                  <td
                    key={d.month}
                    className="border-b border-slate-700/50 px-1 py-2 text-center text-xs text-emerald-400"
                  >
                    {formatNumber(d.bulkSales)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 text-slate-300">
                  • Other
                </td>
                {[...Array(31)].map((_, i) => (
                  <td
                    key={i}
                    className="border-b border-slate-700/50 px-1 py-2 text-center text-xs text-slate-500"
                  >
                    -
                  </td>
                ))}
              </tr>
              <tr className="bg-emerald-900/10 font-semibold">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 text-emerald-300">
                  💚 INFLOW TOTAL
                </td>
                {cashFlowData.map((d) => (
                  <td
                    key={d.month}
                    className="border-b border-slate-700/50 px-1 py-2 text-center text-xs text-emerald-400"
                  >
                    {formatNumber(d.totalInflow)}
                  </td>
                ))}
              </tr>

              <tr className="bg-red-900/10">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 font-semibold text-red-300">
                  ❤️ CASH OUTFLOWS
                </td>
                {[...Array(31)].map((_, i) => (
                  <td key={i} className="border-b border-slate-700/50" />
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 text-slate-300">
                  • Land Cost
                </td>
                {cashFlowData.map((d) => (
                  <td
                    key={d.month}
                    className="border-b border-slate-700/50 px-1 py-2 text-center text-xs text-red-400"
                  >
                    {formatNumber(d.landCost)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 text-slate-300">
                  • Construction
                </td>
                {cashFlowData.map((d) => (
                  <td
                    key={d.month}
                    className="border-b border-slate-700/50 px-1 py-2 text-center text-xs text-red-400"
                  >
                    {formatNumber(d.construction)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 text-slate-300">
                  • Soft Costs
                </td>
                {cashFlowData.map((d) => (
                  <td
                    key={d.month}
                    className="border-b border-slate-700/50 px-1 py-2 text-center text-xs text-red-400"
                  >
                    {formatNumber(d.softCosts)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 text-slate-300">
                  • POWC
                </td>
                {cashFlowData.map((d) => (
                  <td
                    key={d.month}
                    className="border-b border-slate-700/50 px-1 py-2 text-center text-xs text-red-400"
                  >
                    {formatNumber(d.powc)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 text-slate-300">
                  • Contingency
                </td>
                {cashFlowData.map((d) => (
                  <td
                    key={d.month}
                    className="border-b border-slate-700/50 px-1 py-2 text-center text-xs text-amber-400"
                  >
                    {formatNumber(
                      d.month >= 1 && d.month <= constructionPeriod
                        ? contingencyPerMonth
                        : 0
                    )}
                  </td>
                ))}
              </tr>
              <tr className="bg-red-900/10 font-semibold">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 text-red-300">
                  ❤️ OUTFLOW TOTAL
                </td>
                {cashFlowData.map((d) => (
                  <td
                    key={d.month}
                    className="border-b border-slate-700/50 px-1 py-2 text-center text-xs text-red-400"
                  >
                    {formatNumber(d.totalOutflow)}
                  </td>
                ))}
              </tr>

              <tr className="bg-blue-900/10">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 text-blue-300">
                  <span className="font-semibold">💙 NET CASH FLOW</span>
                  <br />
                  <span className="text-xs font-normal text-slate-400">
                    (Inflows - Outflows)
                  </span>
                </td>
                {cashFlowData.map((d) => (
                  <td
                    key={d.month}
                    className={`border-b border-slate-700/50 px-1 py-2 text-center text-xs ${
                      d.netCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {formatNumber(d.netCashFlow)}
                  </td>
                ))}
              </tr>
              <tr className="bg-blue-900/20 font-semibold">
                <td className="sticky left-0 border-r border-slate-700 bg-slate-800 px-3 py-2 text-blue-300">
                  💙 CUMULATIVE
                </td>
                {cashFlowData.map((d) => (
                  <td
                    key={d.month}
                    className={`border-b border-slate-700/50 px-1 py-2 text-center text-xs ${
                      d.cumulative >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {formatNumber(d.cumulative)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          <p className="mt-4 text-xs text-slate-500">
            ℹ️ Values shown in {currency} &apos;000. Negative values in red,
            positive in green.
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">
            📈 Key Pre-Financing Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3 lg:grid-cols-5">
            <div>
              <p className="mb-1 text-xs text-slate-400">Peak Funding Required</p>
              <p className="text-lg font-semibold text-red-400">
                {formatCurrency(peakFunding)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-400">
                First Positive Cash Flow
              </p>
              <p className="text-lg font-semibold text-emerald-400">
                {firstPositiveMonth !== null
                  ? `Month ${firstPositiveMonth}`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-400">Total Inflows</p>
              <p className="text-lg font-semibold text-emerald-400">
                {formatCurrency(totalInflows)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-400">Total Outflows</p>
              <p className="text-lg font-semibold text-red-400">
                {formatCurrency(totalOutflows)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-400">
                Net Surplus (pre-financing)
              </p>
              <p
                className={`text-lg font-bold ${
                  netSurplus >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatCurrency(netSurplus)}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/30 p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-300">
            📥 Download Options:
          </h4>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleDownload("sheets")}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-700"
            >
              Google Sheets (with formulas)
            </button>
            <button
              type="button"
              onClick={() => handleDownload("excel")}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600"
            >
              Excel .xlsx (with formulas)
            </button>
            <button
              type="button"
              onClick={() => handleDownload("csv")}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600"
            >
              CSV (values only)
            </button>
          </div>
        </div>

        <PreviewFloatingBar
          previousRoute={withStreamPrefix(streamPrefix, "/cash-inflows")}
          nextRoute={withStreamPrefix(
            streamPrefix,
            streamPrefix === "/operational"
              ? "/preview/pnl"
              : "/preview/project-irr"
          )}
          nextLabel={
            streamPrefix === "/operational"
              ? "Operating P&L preview →"
              : undefined
          }
          onDownload={() => handleDownload("excel")}
        />
      </div>
    </div>
  );
}
