"use client";

import { useEffect, useMemo } from "react";
import useFinModelStore, {
  buildDataCentreMonthlyConstructionCosts,
  generateDataCentrePhasingSCurve,
  type DataCentrePhasing,
} from "@/store/useFinModelStore";
import { resolveDataCentreCapEx } from "./DataCentreConstructionCostsStep";

function curvesEqual(
  a: DataCentrePhasing,
  b: DataCentrePhasing,
  includeIT: boolean
): boolean {
  const keys: (keyof DataCentrePhasing)[] = includeIT
    ? ["buildingShell", "criticalME", "itHardware"]
    : ["buildingShell", "criticalME"];
  return keys.every((key) => {
    const left = a[key];
    const right = b[key];
    if (left.length !== right.length) return false;
    return left.every((v, i) => Math.abs(v - (right[i] ?? 0)) < 0.001);
  });
}

function monthlyEqual(a: number[] | undefined, b: number[]): boolean {
  if (!a || a.length !== b.length) return false;
  return a.every((v, i) => Math.abs(v - (b[i] ?? 0)) < 0.5);
}

export type DataCentreConstructionPhasingStepErrors = Record<string, string>;

export function validateDataCentreConstructionPhasing(cashOutflows: {
  dataCentrePhasing?: DataCentrePhasing;
  monthlyConstructionCosts?: number[];
  constructionPeriod?: number;
}): DataCentreConstructionPhasingStepErrors {
  const next: DataCentreConstructionPhasingStepErrors = {};
  if (!cashOutflows.dataCentrePhasing) {
    next.dataCentrePhasing = "Data Centre construction phasing is required.";
    return next;
  }
  const expectedLen = (cashOutflows.constructionPeriod ?? 0) + 1;
  const series = [
    cashOutflows.dataCentrePhasing.buildingShell,
    cashOutflows.dataCentrePhasing.criticalME,
    cashOutflows.dataCentrePhasing.itHardware,
  ];
  if (series.some((s) => s.length !== expectedLen)) {
    next.dataCentrePhasing =
      "Phasing curves do not match the construction period. Re-open this step to regenerate.";
  }
  if (
    !cashOutflows.monthlyConstructionCosts ||
    cashOutflows.monthlyConstructionCosts.length !== expectedLen
  ) {
    next.dataCentrePhasing =
      "Monthly construction schedule is missing. Re-open this step to regenerate.";
  }
  return next;
}

type Props = {
  errors?: DataCentreConstructionPhasingStepErrors;
};

export default function DataCentreConstructionPhasingStep({
  errors = {},
}: Props) {
  const constructionPeriod = useFinModelStore(
    (s) => s.operational.cashOutflows.constructionPeriod || 24
  );
  const dataCentrePhasing = useFinModelStore(
    (s) => s.operational.cashOutflows.dataCentrePhasing
  );
  const monthlyConstructionCosts = useFinModelStore(
    (s) => s.operational.cashOutflows.monthlyConstructionCosts
  );
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const updateCashOutflows = useFinModelStore((s) => s.updateCashOutflows);

  const includeIT =
    projectInfo.dataCentreITHardwareProvidedByOperator === true;

  // Auto-generate S-curves + translate to monthlyConstructionCosts for the engine
  useEffect(() => {
    if (constructionPeriod <= 0) return;

    const newPhasing = generateDataCentrePhasingSCurve(constructionPeriod);
    const capEx = resolveDataCentreCapEx(projectInfo);
    const monthly = buildDataCentreMonthlyConstructionCosts(
      newPhasing,
      {
        buildingCost: capEx.buildingCost,
        meCost: capEx.meCost,
        itHardwareCost: capEx.itHardwareCost,
        professionalFees: capEx.professionalFees,
        contingency: capEx.contingency,
      },
      includeIT
    );

    const phasingChanged =
      !dataCentrePhasing ||
      !curvesEqual(dataCentrePhasing, newPhasing, includeIT);
    const monthlyChanged = !monthlyEqual(monthlyConstructionCosts, monthly);

    if (phasingChanged || monthlyChanged) {
      updateCashOutflows(
        {
          dataCentrePhasing: newPhasing,
          monthlyConstructionCosts: monthly,
        },
        "operational"
      );
    }
  }, [
    constructionPeriod,
    includeIT,
    dataCentrePhasing,
    monthlyConstructionCosts,
    projectInfo,
    updateCashOutflows,
  ]);

  const categoryTotals = useMemo(() => {
    if (!dataCentrePhasing) return null;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    return {
      buildingShell: sum(dataCentrePhasing.buildingShell),
      criticalME: sum(dataCentrePhasing.criticalME),
      itHardware: sum(dataCentrePhasing.itHardware),
    };
  }, [dataCentrePhasing]);

  if (!dataCentrePhasing) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <p className="text-slate-400">Generating data centre S-curves…</p>
        {errors.dataCentrePhasing && (
          <p className="mt-2 text-sm text-red-400">{errors.dataCentrePhasing}</p>
        )}
      </div>
    );
  }

  const categories = [
    {
      key: "buildingShell" as const,
      label: "Building & Shell",
      description:
        "Standard S-Curve (15% Early / 35% Mid / 35% Late / 15% Final)",
      data: dataCentrePhasing.buildingShell,
      total: categoryTotals?.buildingShell || 0,
    },
    {
      key: "criticalME" as const,
      label: "Critical Infrastructure (M&E)",
      description:
        "Mid–late loaded (10% Early / 25% Mid / 40% Late / 25% Final)",
      data: dataCentrePhasing.criticalME,
      total: categoryTotals?.criticalME || 0,
    },
    ...(includeIT
      ? [
          {
            key: "itHardware" as const,
            label: "IT Hardware",
            description:
              "Back-loaded (5% Early / 15% Mid / 40% Late / 40% Final)",
            data: dataCentrePhasing.itHardware,
            total: categoryTotals?.itHardware || 0,
          },
        ]
      : []),
  ];

  const monthlySum = (monthlyConstructionCosts || []).reduce(
    (a, b) => a + (b || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h2 className="mb-2 text-2xl font-bold text-white">
          Data Centre — Construction phasing (S-Curve)
        </h2>
        <p className="mb-6 text-sm text-slate-400">
          Construction Period:{" "}
          <span className="font-semibold text-emerald-400">
            {constructionPeriod} months
          </span>
          . Category curves are auto-generated and summed month-by-month into
          the construction schedule used by the financial engine
          {includeIT
            ? " (including IT Hardware)."
            : " (IT Hardware excluded — customer-provided)."}
        </p>

        <div className="space-y-8">
          {categories.map((cat) => {
            const maxVal = Math.max(...cat.data, 0.01);
            return (
              <div
                key={cat.key}
                className="border-b border-slate-700 pb-6 last:border-0 last:pb-0"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-base font-medium text-white">
                      {cat.label}
                    </h4>
                    <p className="text-xs text-slate-500">{cat.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs text-slate-400">
                      Total Distribution:
                    </span>
                    <span className="ml-2 font-semibold text-emerald-400">
                      {cat.total.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex h-24 items-end gap-px">
                  {cat.data.map((val, idx) => (
                    <div
                      key={idx}
                      className="group relative min-w-0 flex-1 rounded-t-sm bg-emerald-500/80 transition-colors hover:bg-emerald-400"
                      style={{
                        height: `${Math.max(4, (val / maxVal) * 100)}%`,
                      }}
                    >
                      <div className="absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
                        M{idx}: {val.toFixed(2)}%
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>M0</span>
                  <span>M{Math.floor(constructionPeriod / 4)}</span>
                  <span>M{Math.floor(constructionPeriod / 2)}</span>
                  <span>M{Math.floor((constructionPeriod * 3) / 4)}</span>
                  <span>M{constructionPeriod}</span>
                </div>
              </div>
            );
          })}
        </div>

        {monthlySum > 0 && (
          <p className="mt-6 text-xs text-slate-500">
            Engine schedule:{" "}
            <span className="font-mono text-slate-300">
              {monthlySum.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>{" "}
            total hard CapEx across M0–M{constructionPeriod} (fees &amp;
            contingency equal-spread on M1–Mn).
          </p>
        )}
      </div>

      {!includeIT && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
          <p className="text-sm text-slate-400">
            IT Hardware curve is hidden because hardware is customer-provided
            (not in developer CapEx).
          </p>
        </div>
      )}

      {errors.dataCentrePhasing && (
        <p className="text-sm text-red-400">{errors.dataCentrePhasing}</p>
      )}
    </div>
  );
}
