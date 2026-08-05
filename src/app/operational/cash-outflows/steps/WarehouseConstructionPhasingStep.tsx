"use client";

import { useEffect, useMemo } from "react";
import useFinModelStore, {
  generateWarehousePhasingSCurve,
  type WarehousePhasing,
} from "@/store/useFinModelStore";
import WarehouseBenchmarkBar from "./WarehouseBenchmarkBar";

function curvesEqual(a: WarehousePhasing, b: WarehousePhasing): boolean {
  const keys: (keyof WarehousePhasing)[] = [
    "buildingShell",
    "siteYardWorks",
    "loadingAccess",
    "specialisedSystems",
  ];
  return keys.every((key) => {
    const left = a[key];
    const right = b[key];
    if (left.length !== right.length) return false;
    return left.every((v, i) => Math.abs(v - (right[i] ?? 0)) < 0.001);
  });
}

export type WarehouseConstructionPhasingStepErrors = Record<string, string>;

export function validateWarehouseConstructionPhasing(
  cashOutflows: {
    warehousePhasing?: WarehousePhasing;
    constructionPeriod?: number;
  }
): WarehouseConstructionPhasingStepErrors {
  const next: WarehouseConstructionPhasingStepErrors = {};
  if (!cashOutflows.warehousePhasing) {
    next.warehousePhasing = "Warehouse construction phasing is required.";
    return next;
  }
  const expectedLen = (cashOutflows.constructionPeriod ?? 0) + 1;
  const series = [
    cashOutflows.warehousePhasing.buildingShell,
    cashOutflows.warehousePhasing.siteYardWorks,
    cashOutflows.warehousePhasing.loadingAccess,
    cashOutflows.warehousePhasing.specialisedSystems,
  ];
  if (series.some((s) => s.length !== expectedLen)) {
    next.warehousePhasing =
      "Phasing curves do not match the construction period. Re-open this step to regenerate.";
  }
  return next;
}

type WarehouseConstructionPhasingStepProps = {
  errors?: WarehouseConstructionPhasingStepErrors;
};

export default function WarehouseConstructionPhasingStep({
  errors = {},
}: WarehouseConstructionPhasingStepProps) {
  const constructionPeriod = useFinModelStore(
    (s) => s.operational.cashOutflows.constructionPeriod || 18
  );
  const warehouseSubType = useFinModelStore(
    (s) => s.operational.cashOutflows.warehouseSubType
  );
  const developmentType = useFinModelStore(
    (s) => s.operational.cashOutflows.developmentType
  );
  const warehousePhasing = useFinModelStore(
    (s) => s.operational.cashOutflows.warehousePhasing
  );
  const updateCashOutflows = useFinModelStore((s) => s.updateCashOutflows);

  // Auto-generate S-Curves whenever construction period or sub-type changes
  useEffect(() => {
    if (constructionPeriod <= 0) return;
    const newPhasing = generateWarehousePhasingSCurve(
      constructionPeriod,
      warehouseSubType || "BULK_DISTRIBUTION"
    );
    if (!warehousePhasing || !curvesEqual(warehousePhasing, newPhasing)) {
      updateCashOutflows({ warehousePhasing: newPhasing }, "operational");
    }
  }, [
    constructionPeriod,
    warehouseSubType,
    warehousePhasing,
    updateCashOutflows,
  ]);

  const categoryTotals = useMemo(() => {
    if (!warehousePhasing) return null;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    return {
      buildingShell: sum(warehousePhasing.buildingShell),
      siteYardWorks: sum(warehousePhasing.siteYardWorks),
      loadingAccess: sum(warehousePhasing.loadingAccess),
      specialisedSystems: sum(warehousePhasing.specialisedSystems),
    };
  }, [warehousePhasing]);

  if (!warehousePhasing) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <p className="text-slate-400">Generating warehouse S-curves…</p>
        {errors.warehousePhasing && (
          <p className="mt-2 text-sm text-red-400">{errors.warehousePhasing}</p>
        )}
      </div>
    );
  }

  const categories = [
    {
      key: "buildingShell",
      label: "Building & Shell",
      description:
        "Standard S-Curve (15% Early / 35% Mid / 35% Late / 15% Final)",
      data: warehousePhasing.buildingShell,
      total: categoryTotals?.buildingShell || 0,
    },
    {
      key: "siteYardWorks",
      label: "Site & Yard Works",
      description: "Front-loaded (40% Early / 30% Mid / 20% Late / 10% Final)",
      data: warehousePhasing.siteYardWorks,
      total: categoryTotals?.siteYardWorks || 0,
    },
    {
      key: "loadingAccess",
      label: "Loading & Access",
      description: "Mid-Late (10% Early / 20% Mid / 40% Late / 30% Final)",
      data: warehousePhasing.loadingAccess,
      total: categoryTotals?.loadingAccess || 0,
    },
    {
      key: "specialisedSystems",
      label: "Specialised Systems",
      description: "Back-loaded (10% Early / 20% Mid / 40% Late / 30% Final)",
      data: warehousePhasing.specialisedSystems,
      total: categoryTotals?.specialisedSystems || 0,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h2 className="mb-2 text-2xl font-bold text-white">
          Construction phasing (S-Curve)
        </h2>
        <WarehouseBenchmarkBar />
        <p className="mb-6 text-sm text-slate-400">
          Construction Period:{" "}
          <span className="font-semibold text-emerald-400">
            {constructionPeriod} months
          </span>
          . Four cost-category curves are auto-generated from the period and
          warehouse sub-type.
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
      </div>

      {developmentType === "INDUSTRIAL_PARK" && (
        <div className="rounded-xl border border-amber-700/50 bg-amber-900/20 p-4">
          <p className="text-sm text-amber-200">
            <strong>Note for Industrial Park:</strong> Each phase follows its
            own S-Curve. Common infrastructure (roads, utilities) is
            front-loaded in Phase 1.
          </p>
        </div>
      )}

      {errors.warehousePhasing && (
        <p className="text-sm text-red-400">{errors.warehousePhasing}</p>
      )}
    </div>
  );
}
