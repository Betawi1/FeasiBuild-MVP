"use client";

import { useMemo } from "react";
import {
  DEFAULT_POWC_ALLOCATION,
  DEFAULT_SOFT_COST_ALLOCATION,
} from "@/lib/cash-outflow-default-allocations";
import { allocateFfeMonthly } from "@/lib/cash-outflow-ffe-timing";
import { allocatePowcSubMonthlyFromStep13 } from "@/lib/cash-outflow-powc-timing";
import { allocateSoftCostSubMonthly } from "@/lib/operational-cash-outflows-excel";
import { resolveDataCentreCapEx } from "@/app/operational/cash-outflows/steps/DataCentreConstructionCostsStep";
import useFinModelStore, {
  generateDataCentrePhasingSCurve,
  type CashOutflows,
  type DataCentrePhasing,
  type ProjectInfo,
} from "@/store/useFinModelStore";

export type DataCentreMonthlyRowKind =
  | "data"
  | "section"
  | "subtotal"
  | "total";

export type DataCentreMonthlyRow = {
  label: string;
  kind: DataCentreMonthlyRowKind;
  monthly: number[];
  total: number;
};

export type DataCentreMonthlyCosts = {
  buildingShell: number[];
  meCost: number[];
  itHardware: number[];
  professionalFees: number[];
  contingency: number[];
};

export type DataCentreCostTotals = {
  buildingShell: number;
  meCost: number;
  itHardware: number;
  professionalFees: number;
  contingency: number;
  totalConstruction: number;
};

function roundTo1dp(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatThousands(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) return "-";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function plugSeriesToTotal(series: number[], total: number): number[] {
  const out = series.map((v) => v || 0);
  if (out.length === 0 || total <= 0) return out;
  const sum = out.reduce((a, b) => a + b, 0);
  out[out.length - 1] += total - sum;
  return out;
}

function allocateByPhasingPct(
  total: number,
  pcts: number[] | undefined,
  monthCount: number
): number[] {
  const out = new Array(monthCount).fill(0);
  if (total <= 0 || monthCount <= 0) return out;
  if (!pcts || pcts.length === 0) {
    return allocateEqualAcrossConstructionMonths(total, monthCount - 1);
  }
  for (let m = 0; m < monthCount; m++) {
    out[m] = total * ((pcts[m] || 0) / 100);
  }
  return plugSeriesToTotal(out, total);
}

function allocateEqualAcrossConstructionMonths(
  total: number,
  period: number
): number[] {
  const monthCount = Math.max(0, period) + 1;
  const out = new Array(monthCount).fill(0);
  if (total <= 0 || period <= 0) return out;
  const each = total / period;
  for (let m = 1; m <= period; m++) out[m] = each;
  return plugSeriesToTotal(out, total);
}

function softCostsFrontLoaded(total: number, monthCount: number): number[] {
  const out = new Array(monthCount).fill(0);
  if (total <= 0 || monthCount <= 0) return out;
  out[0] = total * 0.5;
  if (monthCount > 1) out[1] = total * 0.3;
  if (monthCount > 2) out[2] = total * 0.2;
  return plugSeriesToTotal(out, total);
}

function sectionRow(label: string, monthCount: number): DataCentreMonthlyRow {
  return {
    label,
    kind: "section",
    monthly: new Array(monthCount).fill(0),
    total: 0,
  };
}

function dataRow(
  label: string,
  monthly: number[],
  total: number,
  kind: DataCentreMonthlyRowKind = "data"
): DataCentreMonthlyRow {
  return { label, kind, monthly, total };
}

/**
 * Build Data Centre monthly cash outflow rows (absolute currency).
 * Building / M&E / IT follow `dataCentrePhasing`; fees & contingency equal on M1…Mn.
 */
export function buildDataCentreMonthlyCashOutflowRows(
  cashOutflows: CashOutflows,
  projectInfo: ProjectInfo
): {
  months: number[];
  rows: DataCentreMonthlyRow[];
  exportRows: (string | number | null)[][];
  dataCentreMonthlyCosts: DataCentreMonthlyCosts;
  dataCentreTotals: DataCentreCostTotals;
} {
  const period = Math.max(0, cashOutflows.constructionPeriod || 0);
  const emptyCosts: DataCentreMonthlyCosts = {
    buildingShell: [],
    meCost: [],
    itHardware: [],
    professionalFees: [],
    contingency: [],
  };
  const emptyTotals: DataCentreCostTotals = {
    buildingShell: 0,
    meCost: 0,
    itHardware: 0,
    professionalFees: 0,
    contingency: 0,
    totalConstruction: 0,
  };

  if (period <= 0) {
    return {
      months: [],
      rows: [],
      exportRows: [],
      dataCentreMonthlyCosts: emptyCosts,
      dataCentreTotals: emptyTotals,
    };
  }

  const monthCount = period + 1;
  const months = Array.from({ length: monthCount }, (_, i) => i);
  const includeIT =
    projectInfo.dataCentreITHardwareProvidedByOperator === true;

  const capEx = resolveDataCentreCapEx(projectInfo);
  const phasing: DataCentrePhasing =
    cashOutflows.dataCentrePhasing ||
    generateDataCentrePhasingSCurve(period);

  const buildingTotal = capEx.buildingCost || 0;
  const meTotal = capEx.meCost || 0;
  const itTotal = includeIT ? capEx.itHardwareCost || 0 : 0;
  const professionalFeesTotal = capEx.professionalFees || 0;
  const contingencyTotal = capEx.contingency || 0;

  const buildingShellMonthly = allocateByPhasingPct(
    buildingTotal,
    phasing.buildingShell,
    monthCount
  );
  const meMonthly = allocateByPhasingPct(
    meTotal,
    phasing.criticalME,
    monthCount
  );
  const itHardwareMonthly = includeIT
    ? allocateByPhasingPct(itTotal, phasing.itHardware, monthCount)
    : new Array(monthCount).fill(0);
  const professionalFeesMonthly = allocateEqualAcrossConstructionMonths(
    professionalFeesTotal,
    period
  );
  const contingencyMonthly = allocateEqualAcrossConstructionMonths(
    contingencyTotal,
    period
  );

  const constructionHardMonthly = months.map(
    (_, m) =>
      (buildingShellMonthly[m] || 0) +
      (meMonthly[m] || 0) +
      (itHardwareMonthly[m] || 0)
  );
  const constructionHardTotal = buildingTotal + meTotal + itTotal;

  const constructionTotalMonthly = months.map(
    (_, m) =>
      (constructionHardMonthly[m] || 0) +
      (professionalFeesMonthly[m] || 0) +
      (contingencyMonthly[m] || 0)
  );
  const constructionTotal =
    constructionHardTotal + professionalFeesTotal + contingencyTotal;

  const landTotal = cashOutflows.landCost || 0;
  const landMonthly = months.map((_, m) => (m === 0 ? landTotal : 0));

  const ffeTotal = cashOutflows.ffe || 0;
  const ffeMonthly = allocateFfeMonthly(ffeTotal, constructionHardMonthly);

  const softTotal = cashOutflows.softCosts || 0;
  const softMonthly = softCostsFrontLoaded(softTotal, monthCount);

  const powcTotal = cashOutflows.powc || 0;
  const powcSubs = allocatePowcSubMonthlyFromStep13(
    powcTotal,
    period,
    cashOutflows.powcAllocation ?? { ...DEFAULT_POWC_ALLOCATION }
  );
  const powcMonthly = months.map(
    (_, m) =>
      (powcSubs.site[m] || 0) +
      (powcSubs.overhead[m] || 0) +
      (powcSubs.authority[m] || 0)
  );

  const sc =
    cashOutflows.softCostAllocation ?? { ...DEFAULT_SOFT_COST_ALLOCATION };
  const softSubs = allocateSoftCostSubMonthly(softMonthly, softTotal, sc);
  const po = cashOutflows.powcAllocation ?? { ...DEFAULT_POWC_ALLOCATION };

  const monthlyTotal = months.map(
    (_, m) =>
      (landMonthly[m] || 0) +
      (constructionTotalMonthly[m] || 0) +
      (ffeMonthly[m] || 0) +
      (softMonthly[m] || 0) +
      (powcMonthly[m] || 0)
  );

  const tdcTarget =
    cashOutflows.tdc ||
    landTotal + constructionTotal + ffeTotal + softTotal + powcTotal;

  const sumMonthly = monthlyTotal.reduce((a, b) => a + b, 0);
  if (Math.abs(tdcTarget - sumMonthly) > 1 && monthlyTotal.length > 0) {
    monthlyTotal[monthlyTotal.length - 1] += tdcTarget - sumMonthly;
  }

  const cumulative: number[] = [];
  let running = 0;
  for (const v of monthlyTotal) {
    running += v;
    cumulative.push(running);
  }

  const dataCentreMonthlyCosts: DataCentreMonthlyCosts = {
    buildingShell: buildingShellMonthly,
    meCost: meMonthly,
    itHardware: itHardwareMonthly,
    professionalFees: professionalFeesMonthly,
    contingency: contingencyMonthly,
  };
  const dataCentreTotals: DataCentreCostTotals = {
    buildingShell: buildingTotal,
    meCost: meTotal,
    itHardware: itTotal,
    professionalFees: professionalFeesTotal,
    contingency: contingencyTotal,
    totalConstruction: constructionTotal,
  };

  const rows: DataCentreMonthlyRow[] = [
    dataRow("Land Cost", landMonthly, landTotal),
    sectionRow("Construction Costs", monthCount),
    dataRow("Building & Shell", buildingShellMonthly, buildingTotal),
    dataRow("Critical Infrastructure (M&E)", meMonthly, meTotal),
  ];

  if (includeIT) {
    rows.push(dataRow("IT Hardware", itHardwareMonthly, itTotal));
  }

  rows.push(
    dataRow(
      "Professional Fees",
      professionalFeesMonthly,
      professionalFeesTotal
    ),
    dataRow("Contingency", contingencyMonthly, contingencyTotal),
    dataRow(
      "Construction Cost (total)",
      constructionTotalMonthly,
      constructionTotal,
      "subtotal"
    ),
    dataRow("FF&E", ffeMonthly, ffeTotal),
    sectionRow("POWC", monthCount),
    dataRow(
      "Site Establishment",
      powcSubs.site,
      (powcTotal * po.siteEstablishment) / 100
    ),
    dataRow("Overhead", powcSubs.overhead, (powcTotal * po.overhead) / 100),
    dataRow(
      "Authority Fees",
      powcSubs.authority,
      (powcTotal * po.authorityFees) / 100
    ),
    dataRow("POWC (total)", powcMonthly, powcTotal, "subtotal"),
    sectionRow("Soft Costs", monthCount),
    dataRow(
      "Main Architect",
      softSubs.architect,
      (softTotal * sc.architect) / 100
    ),
    dataRow(
      "Project Management",
      softSubs.projectManagement,
      (softTotal * sc.projectManagement) / 100
    ),
    dataRow(
      "Engineering Consultant",
      softSubs.engineering,
      (softTotal * sc.engineering) / 100
    ),
    dataRow(
      "Geotechnical Consultant",
      softSubs.geotechnical,
      (softTotal * sc.geotechnical) / 100
    ),
    dataRow("Other Fees", softSubs.otherFees, (softTotal * sc.otherFees) / 100),
    dataRow("Soft Costs (total)", softMonthly, softTotal, "subtotal"),
    dataRow("Monthly Total", monthlyTotal, tdcTarget, "total"),
    dataRow(
      "Cumulative",
      cumulative,
      cumulative[cumulative.length - 1] || 0,
      "total"
    )
  );

  const header: (string | number | null)[] = [
    "",
    ...months.map((m) => `M${m}`),
    "Total",
  ];

  const exportRows: (string | number | null)[][] = [
    header,
    ...rows.map((row) => {
      if (row.kind === "section") {
        return [row.label, ...months.map(() => ""), ""];
      }
      return [
        row.label,
        ...row.monthly.map((v) => {
          const t = roundTo1dp(v / 1000);
          return t > 0 ? t : null;
        }),
        roundTo1dp(row.total / 1000),
      ];
    }),
  ];

  return {
    months,
    rows,
    exportRows,
    dataCentreMonthlyCosts,
    dataCentreTotals,
  };
}

export type CashOutflowsTableDataCentreProps = {
  currencyCode: string;
};

export function CashOutflowsTableDataCentre({
  currencyCode,
}: CashOutflowsTableDataCentreProps) {
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);

  const { months, rows } = useMemo(
    () => buildDataCentreMonthlyCashOutflowRows(cashOutflows, projectInfo),
    [cashOutflows, projectInfo]
  );

  if (months.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Set a positive construction period and generate the model in Component 1
        to see the data centre monthly cash flow profile.
      </p>
    );
  }

  return (
    <table className="min-w-[1200px] w-full">
      <thead>
        <tr>
          <th className="sticky left-0 z-10 min-w-[180px] border-b border-slate-700 bg-slate-800 px-4 py-3 text-left text-xs font-medium text-slate-300">
            Cost Item
          </th>
          {months.map((month) => (
            <th
              key={month}
              className="min-w-[56px] border-b border-slate-700 px-2 py-3 text-center text-xs font-medium text-slate-400"
            >
              M{month}
            </th>
          ))}
          <th className="min-w-[72px] border-b border-slate-700 px-4 py-3 text-right text-xs font-semibold tabular-nums text-slate-300">
            Total
          </th>
        </tr>
        <tr>
          <th className="sticky left-0 border-b border-slate-700 bg-slate-800" />
          <th className="border-b border-slate-700 bg-slate-900/30 px-2 py-2 text-center text-xs font-medium text-slate-500">
            M0
          </th>
          <th
            colSpan={Math.max(months.length - 1, 1)}
            className="border-b border-l-2 border-slate-700 border-l-emerald-600 bg-slate-900/50 px-2 py-2 text-center text-xs font-medium text-emerald-400"
          >
            Construction ({cashOutflows.constructionPeriod || 0} months)
          </th>
          <th className="border-b border-slate-700" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          if (row.kind === "section") {
            return (
              <tr key={row.label} className="border-t border-slate-700">
                <td
                  colSpan={months.length + 2}
                  className="sticky left-0 bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-400"
                >
                  {row.label}
                </td>
              </tr>
            );
          }

          const isTotal = row.kind === "total";
          const isSubtotal = row.kind === "subtotal";

          return (
            <tr
              key={row.label}
              className={
                isTotal
                  ? "border-t border-slate-700 bg-slate-900/50"
                  : "border-t border-slate-700"
              }
            >
              <td
                className={`sticky left-0 z-10 border-r border-slate-700 bg-slate-800 px-4 py-3 text-sm ${
                  isTotal
                    ? "font-semibold text-white"
                    : isSubtotal
                      ? "font-medium text-slate-100"
                      : "font-medium text-slate-200"
                }`}
              >
                {row.label}
              </td>
              {row.monthly.map((v, idx) => (
                <td
                  key={idx}
                  className={`border-r border-slate-700/50 px-2 py-3 text-center text-xs ${
                    isTotal ? "font-medium text-white" : "text-slate-400"
                  }`}
                >
                  {formatThousands(v / 1000)}
                </td>
              ))}
              <td
                className={`px-4 py-3 text-right text-sm tabular-nums ${
                  isTotal
                    ? "font-semibold text-emerald-400"
                    : "font-medium text-slate-200"
                }`}
              >
                {formatThousands(row.total / 1000)}
              </td>
            </tr>
          );
        })}
      </tbody>
      <caption className="mt-3 caption-bottom text-left text-xs text-slate-500">
        Values in {currencyCode} &apos;000. Building, M&amp;E
        {projectInfo.dataCentreITHardwareProvidedByOperator
          ? ", and IT Hardware"
          : ""}{" "}
        follow Data Centre S-curve phasing; professional fees and contingency
        are equal across construction months. FF&amp;E sits after Construction
        Cost (total), before POWC.
      </caption>
    </table>
  );
}

export default CashOutflowsTableDataCentre;
