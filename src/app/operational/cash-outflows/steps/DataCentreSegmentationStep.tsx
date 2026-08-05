"use client";

import { useEffect } from "react";
import useFinModelStore, {
  type ProjectInfo,
} from "@/store/useFinModelStore";
import { logOperationalCashOutflow } from "@/lib/operational-audit-fields";

export type DataCentreSegmentationStepErrors = Record<string, string>;

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

const SEGMENTS: Array<{
  id: NonNullable<ProjectInfo["dataCentreSegment"]>;
  title: string;
  desc: string;
  tooltip: string;
}> = [
  {
    id: "colocation",
    title: "Colocation (Wholesale)",
    desc: "Multi-tenant facilities leasing space and power",
    tooltip:
      "Multi-tenant facilities leasing space and power capacity.",
  },
  {
    id: "edge",
    title: "Edge",
    desc: "Distributed low-latency facilities (100 kW – 1 MW)",
    tooltip:
      "Smaller, distributed facilities (100 kW – 1 MW) for low-latency applications.",
  },
];

const TIER_LEVELS: Array<{
  id: NonNullable<ProjectInfo["dataCentreTierLevel"]>;
  title: string;
  desc: string;
  tooltip: string;
}> = [
  {
    id: "tier-ii",
    title: "Tier II",
    desc: "Redundant components · Single path",
    tooltip:
      "Redundant power & cooling components. Single path. Uptime: 99.741%",
  },
  {
    id: "tier-iii",
    title: "Tier III",
    desc: "Concurrently maintainable · Dual path",
    tooltip:
      "Concurrently maintainable. Dual path. Uptime: 99.982%",
  },
  {
    id: "tier-iv",
    title: "Tier IV",
    desc: "Fault-tolerant · Fully redundant",
    tooltip:
      "Fault-tolerant. Dual active paths. Fully redundant. Uptime: 99.995%",
  },
];

const POSITIONINGS: Array<{
  id: NonNullable<ProjectInfo["dataCentrePositioning"]>;
  title: string;
  desc: string;
  tooltip: string;
}> = [
  {
    id: "premium",
    title: "Premium / Tier III+",
    desc: "Higher specification, higher lease rates",
    tooltip: "Higher specification, higher lease rates",
  },
  {
    id: "standard",
    title: "Standard / Tier II",
    desc: "Cost-optimised, competitive pricing",
    tooltip: "Cost-optimised, competitive pricing",
  },
];

export function validateDataCentreSegmentation(
  projectInfo: Pick<
    ProjectInfo,
    "dataCentreSegment" | "dataCentreTierLevel" | "dataCentrePositioning"
  >
): DataCentreSegmentationStepErrors {
  const next: DataCentreSegmentationStepErrors = {};
  if (!projectInfo.dataCentreSegment) {
    next.dataCentreSegment = "Segment is required.";
  }
  if (!projectInfo.dataCentreTierLevel) {
    next.dataCentreTierLevel = "Tier Level is required.";
  }
  if (!projectInfo.dataCentrePositioning) {
    next.dataCentrePositioning = "Positioning is required.";
  }
  return next;
}

type DataCentreSegmentationStepProps = {
  errors?: DataCentreSegmentationStepErrors;
};

export default function DataCentreSegmentationStep({
  errors = {},
}: DataCentreSegmentationStepProps) {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const updateProjectInfo = useFinModelStore((s) => s.updateProjectInfo);

  const segment = projectInfo.dataCentreSegment;
  const tierLevel = projectInfo.dataCentreTierLevel;
  const positioning = projectInfo.dataCentrePositioning;

  useEffect(() => {
    const patch: Partial<ProjectInfo> = {};
    if (!projectInfo.dataCentreSegment) patch.dataCentreSegment = "colocation";
    if (!projectInfo.dataCentreTierLevel) patch.dataCentreTierLevel = "tier-iii";
    if (!projectInfo.dataCentrePositioning) {
      patch.dataCentrePositioning = "standard";
    }
    if (Object.keys(patch).length > 0) {
      updateProjectInfo(patch, "operational");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (projectInfo.dataCentreSegment) {
      logOperationalCashOutflow(
        "dataCentreSegment",
        projectInfo.dataCentreSegment,
        4
      );
    }
    if (projectInfo.dataCentreTierLevel) {
      logOperationalCashOutflow(
        "dataCentreTierLevel",
        projectInfo.dataCentreTierLevel,
        4
      );
    }
    if (projectInfo.dataCentrePositioning) {
      logOperationalCashOutflow(
        "dataCentrePositioning",
        projectInfo.dataCentrePositioning,
        4
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchInfo = (data: Partial<ProjectInfo>, field: string, value: string) => {
    updateProjectInfo(data, "operational");
    logOperationalCashOutflow(field, value, 4);
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Step 4 of 13
        </p>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Data Centre Segment &amp; Positioning
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Choose Colocation or Edge, Uptime Tier, and market positioning. These
          drive C1S5 building specs and CapEx benchmarks.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 flex items-center text-base font-semibold text-white">
          Segment
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SEGMENTS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() =>
                patchInfo({ dataCentreSegment: opt.id }, "dataCentreSegment", opt.id)
              }
              className={`rounded-lg border p-4 text-left transition-all ${
                segment === opt.id
                  ? "border-emerald-500 bg-emerald-900/20"
                  : "border-slate-600 bg-slate-900/50 hover:border-slate-500"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-white">{opt.title}</div>
                <SegmentInfoTooltip content={opt.tooltip} />
              </div>
              <div className="mt-1 text-xs text-slate-400">{opt.desc}</div>
            </button>
          ))}
        </div>
        {errors.dataCentreSegment && (
          <p className="mt-3 text-sm text-red-400">{errors.dataCentreSegment}</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-base font-semibold text-white">Tier Level</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TIER_LEVELS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() =>
                patchInfo(
                  { dataCentreTierLevel: opt.id },
                  "dataCentreTierLevel",
                  opt.id
                )
              }
              className={`rounded-lg border p-4 text-left transition-all ${
                tierLevel === opt.id
                  ? "border-emerald-500 bg-emerald-900/20"
                  : "border-slate-600 bg-slate-900/50 hover:border-slate-500"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-white">{opt.title}</div>
                <SegmentInfoTooltip content={opt.tooltip} />
              </div>
              <div className="mt-1 text-xs text-slate-400">{opt.desc}</div>
            </button>
          ))}
        </div>
        {errors.dataCentreTierLevel && (
          <p className="mt-3 text-sm text-red-400">{errors.dataCentreTierLevel}</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-base font-semibold text-white">Positioning</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {POSITIONINGS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() =>
                patchInfo(
                  { dataCentrePositioning: opt.id },
                  "dataCentrePositioning",
                  opt.id
                )
              }
              className={`rounded-lg border p-4 text-left transition-all ${
                positioning === opt.id
                  ? "border-emerald-500 bg-emerald-900/20"
                  : "border-slate-600 bg-slate-900/50 hover:border-slate-500"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-white">{opt.title}</div>
                <SegmentInfoTooltip content={opt.tooltip} />
              </div>
              <div className="mt-1 text-xs text-slate-400">{opt.desc}</div>
            </button>
          ))}
        </div>
        {errors.dataCentrePositioning && (
          <p className="mt-3 text-sm text-red-400">
            {errors.dataCentrePositioning}
          </p>
        )}
      </div>
    </div>
  );
}
