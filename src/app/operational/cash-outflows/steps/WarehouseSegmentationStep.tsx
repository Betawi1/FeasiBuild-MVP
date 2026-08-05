"use client";

import { useEffect } from "react";
import useFinModelStore, {
  ensureWarehouseSegmentDefaults,
  type CashOutflows,
  type WarehouseQualityGrade,
  type WarehouseSubType,
} from "@/store/useFinModelStore";
import { logOperationalCashOutflow } from "@/lib/operational-audit-fields";

export type WarehouseSegmentationStepErrors = Record<string, string>;

function SegmentInfoTooltip({ content }: { content: string }) {
  return (
    <div className="group relative ml-2 inline-block cursor-help">
      <span className="cursor-pointer text-xs text-slate-500 transition hover:text-emerald-400">
        ℹ️
      </span>
      <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-72 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs leading-relaxed text-slate-200 shadow-xl group-hover:block">
        {content}
      </div>
    </div>
  );
}

const WAREHOUSE_SUB_TYPES: Array<{
  id: WarehouseSubType;
  title: string;
  desc: string;
  tooltip: string;
}> = [
  {
    id: "BULK_DISTRIBUTION",
    title: "Bulk / Distribution",
    desc: "Large-scale, high-bay storage & distribution",
    tooltip:
      "High clear height, deep docking, large floor plates for regional distribution.",
  },
  {
    id: "LAST_MILE_URBAN",
    title: "Last-Mile / Urban",
    desc: "Smaller facilities closer to population centres",
    tooltip:
      "Urban or peri-urban logistics with tighter sites and higher land intensity.",
  },
  {
    id: "MULTI_STOREY",
    title: "Multi-Storey",
    desc: "Land-scarce urban locations, multiple levels",
    tooltip:
      "Vertical industrial product for constrained land; higher shell and access costs.",
  },
  {
    id: "COLD_STORAGE",
    title: "Cold Storage",
    desc: "Temperature-controlled facilities (higher cost)",
    tooltip:
      "Refrigeration and specialised systems drive elevated CapEx and OpEx.",
  },
  {
    id: "LIGHT_MANUFACTURING",
    title: "Light Manufacturing / Workshop",
    desc: "Combined warehouse + light industrial",
    tooltip:
      "Hybrid warehouse/workshop space for light assembly and production tenants.",
  },
];

const QUALITY_GRADES: Array<{
  id: WarehouseQualityGrade;
  title: string;
  desc: string;
  tooltip: string;
}> = [
  {
    id: "GRADE_A",
    title: "Grade A",
    desc: "Modern, high-spec, prime location",
    tooltip:
      "Institutional-quality specs and location; premium rents and lower vacancy.",
  },
  {
    id: "GRADE_B",
    title: "Grade B",
    desc: "Functional, secondary location",
    tooltip:
      "Functional product in secondary locations; cost-efficient for value tenants.",
  },
];

export function validateWarehouseSegmentation(
  cashOutflows: Pick<CashOutflows, "warehouseSubType" | "qualityGrade">
): WarehouseSegmentationStepErrors {
  const next: WarehouseSegmentationStepErrors = {};
  if (!cashOutflows.warehouseSubType) {
    next.warehouseSubType = "Select a warehouse sub-type.";
  }
  if (!cashOutflows.qualityGrade) {
    next.qualityGrade = "Select a quality grade.";
  }
  return next;
}

type WarehouseSegmentationStepProps = {
  errors?: WarehouseSegmentationStepErrors;
};

export default function WarehouseSegmentationStep({
  errors = {},
}: WarehouseSegmentationStepProps) {
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const updateCashOutflows = useFinModelStore((s) => s.updateCashOutflows);

  const warehouseSubType = cashOutflows.warehouseSubType;
  const qualityGrade = cashOutflows.qualityGrade;

  useEffect(() => {
    const defaults = ensureWarehouseSegmentDefaults(cashOutflows);
    if (Object.keys(defaults).length > 0) {
      updateCashOutflows(defaults, "operational");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cashOutflows.warehouseSubType) {
      logOperationalCashOutflow(
        "warehouseSubType",
        cashOutflows.warehouseSubType,
        4
      );
    }
    if (cashOutflows.qualityGrade) {
      logOperationalCashOutflow("qualityGrade", cashOutflows.qualityGrade, 4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWarehouseSubTypeChange = (value: WarehouseSubType) => {
    updateCashOutflows({ warehouseSubType: value }, "operational");
    logOperationalCashOutflow("warehouseSubType", value, 4);
  };

  const handleQualityGradeChange = (value: WarehouseQualityGrade) => {
    updateCashOutflows({ qualityGrade: value }, "operational");
    logOperationalCashOutflow("qualityGrade", value, 4);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 4 of 13: Warehouse Segment &amp; Positioning
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Choose your warehouse sub-type and quality grade. These selections
          determine technical specifications in Step 5.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 flex items-center text-base font-semibold text-white">
          Warehouse Sub-Type
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {WAREHOUSE_SUB_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleWarehouseSubTypeChange(type.id)}
              className={`rounded-lg border p-4 text-left transition-all ${
                warehouseSubType === type.id
                  ? "border-emerald-500 bg-emerald-900/20"
                  : "border-slate-600 bg-slate-900/50 hover:border-slate-500"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-white">{type.title}</div>
                <SegmentInfoTooltip content={type.tooltip} />
              </div>
              <div className="mt-1 text-xs text-slate-400">{type.desc}</div>
            </button>
          ))}
        </div>
        {errors.warehouseSubType && (
          <p className="mt-3 text-sm text-red-400">{errors.warehouseSubType}</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-base font-semibold text-white">
          Quality Grade
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {QUALITY_GRADES.map((grade) => (
            <button
              key={grade.id}
              type="button"
              onClick={() => handleQualityGradeChange(grade.id)}
              className={`rounded-lg border p-4 text-left transition-all ${
                qualityGrade === grade.id
                  ? "border-emerald-500 bg-emerald-900/20"
                  : "border-slate-600 bg-slate-900/50 hover:border-slate-500"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-white">{grade.title}</div>
                <SegmentInfoTooltip content={grade.tooltip} />
              </div>
              <div className="mt-1 text-xs text-slate-400">{grade.desc}</div>
            </button>
          ))}
        </div>
        {errors.qualityGrade && (
          <p className="mt-3 text-sm text-red-400">{errors.qualityGrade}</p>
        )}
      </div>
    </div>
  );
}
