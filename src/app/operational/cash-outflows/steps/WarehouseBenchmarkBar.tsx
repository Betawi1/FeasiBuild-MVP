"use client";

import useFinModelStore, {
  type WarehouseQualityGrade,
  type WarehouseSubType,
} from "@/store/useFinModelStore";

const WAREHOUSE_SUB_TYPE_LABELS: Record<WarehouseSubType, string> = {
  BULK_DISTRIBUTION: "Bulk / Distribution",
  LAST_MILE_URBAN: "Last-Mile / Urban",
  MULTI_STOREY: "Multi-Storey",
  COLD_STORAGE: "Cold Storage",
  LIGHT_MANUFACTURING: "Light Manufacturing / Workshop",
};

const QUALITY_GRADE_LABELS: Record<WarehouseQualityGrade, string> = {
  GRADE_A: "Grade A",
  GRADE_B: "Grade B",
};

function formatToken(id?: string): string {
  if (!id?.trim()) return "—";
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Display-only benchmark pill for Warehouse / Industrial CapEx steps. */
export default function WarehouseBenchmarkBar() {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);

  const country = projectInfo.country?.trim() || "—";
  const subType = cashOutflows.warehouseSubType
    ? WAREHOUSE_SUB_TYPE_LABELS[cashOutflows.warehouseSubType] ||
      formatToken(cashOutflows.warehouseSubType)
    : "—";
  const grade = cashOutflows.qualityGrade
    ? QUALITY_GRADE_LABELS[cashOutflows.qualityGrade] ||
      formatToken(cashOutflows.qualityGrade)
    : "—";

  const profile = `Warehouse / Industrial · ${country} · ${subType} · ${grade}`;

  return (
    <div className="flex flex-wrap items-center">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Benchmark
      </span>
      <div className="ml-3 inline-flex items-center rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs text-slate-300">
        {profile}
      </div>
    </div>
  );
}
