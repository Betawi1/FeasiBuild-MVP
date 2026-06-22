"use client";

import useFinModelStore from "@/store/useFinModelStore";

/** UI / legacy kebab keys */
const BUILDING_TYPE_LABELS: Record<string, string> = {
  "residential-landed": "Residential - Landed",
  "residential-hi-rise": "Residential - High-Rise",
  "commercial-landed": "Commercial - Landed",
  "commercial-strata-office": "Commercial - Strata Office",
  residential: "Residential",
  office: "Office",
  retail: "Retail",
  hotel: "Hotel",
};

/** Store `buildingSubType` values (`useFinModelStore` ProjectInfo) */
const BUILDING_SUBTYPE_LABELS: Record<string, string> = {
  residential_landed: "Residential - Landed",
  residential_high_rise: "Residential - High-Rise",
  commercial_landed: "Commercial - Landed",
  commercial_strata_office: "Commercial - Strata Office",
};

export function BenchmarkBanner() {
  const projectInfo = useFinModelStore((s) => s.sale.projectInfo);

  const buildingLabel =
    (projectInfo.buildingSubType &&
      BUILDING_SUBTYPE_LABELS[projectInfo.buildingSubType]) ||
    BUILDING_TYPE_LABELS[
      projectInfo.buildingSubType?.replace(/_/g, "-") ?? ""
    ] ||
    BUILDING_TYPE_LABELS[projectInfo.buildingType || ""] ||
    "Project";

  const city = projectInfo?.city || "Abu Dhabi";
  const country = projectInfo?.country || "United Arab Emirates";

  return (
    <div className="mb-6 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-xs text-slate-400">
      <span className="font-semibold uppercase tracking-wide text-slate-500">
        BENCHMARK
      </span>
      <span className="text-slate-300">
        {buildingLabel} • {city} • {country}
      </span>
    </div>
  );
}
