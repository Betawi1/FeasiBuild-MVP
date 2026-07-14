"use client";

import { useEffect, useState } from "react";
import useFinModelStore, {
  type ProjectInfo,
} from "@/store/useFinModelStore";
import type { OfficeCoworkingDelivery } from "@/lib/benchmarks/office-construction-costs";
import { logOperationalCashOutflow } from "@/lib/operational-audit-fields";

export type OfficeSegmentationStepErrors = Record<string, string>;

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

const SEGMENTS = [
  {
    id: "prime_tower" as const,
    title: "Prime / Grade A Tower",
    sub: "CBD high-rise, premium specs",
    icon: "🏢",
    tooltip:
      "CBD high-rise with premium specifications. Core & Shell delivery: landlord provides structure, facade, elevators, HVAC plant, and lobby shell. Tenant fit-out is captured separately in TI Allowance. Typical for multinational HQs and financial institutions.",
  },
  {
    id: "business_park" as const,
    title: "Business Park / Campus",
    sub: "Suburban, low-density campus",
    icon: "🌳",
    tooltip:
      "Suburban low-density campus with ample parking and green spaces. Core & Shell with functional common areas. Flexible floor plates suit tech companies, R&D, and regional back-offices.",
  },
  {
    id: "secondary" as const,
    title: "Secondary / Grade B",
    sub: "Established urban locations",
    icon: "🏢",
    tooltip:
      "Established urban locations with functional specifications. Core & Shell delivery; reliable infrastructure but basic finishes. Cost-effective for SMEs and professional services.",
  },
  {
    id: "co_working" as const,
    title: "Co-Working / Flexible",
    sub: "Serviced offices, flexible leases",
    icon: "🤝",
    tooltip:
      "Serviced office model with shared amenities and flexible leases. Delivery choice: (1) Developer plug & play fit-out (high FFE), or (2) Shell & Core leased to a third-party operator (low FFE).",
  },
];

const POSITIONINGS = [
  {
    id: "premium" as const,
    title: "Premium / Trophy",
    icon: "💎",
    desc: "Landmark status",
    tooltip:
      "Iconic architecture and best-in-class specs. Top-tier market rents. Attracts blue-chip corporates with highest TI allowances and longest lease terms.",
  },
  {
    id: "grade_a" as const,
    title: "Grade A / Institutional",
    icon: "✨",
    desc: "High-quality specs",
    tooltip:
      "High-quality construction, modern systems, professional management. Suitable for established corporates and regional headquarters.",
  },
  {
    id: "grade_b" as const,
    title: "Grade B / Core",
    icon: "🏢",
    desc: "Functional, well-maintained",
    tooltip:
      "Functional, well-maintained assets in good locations. Appeals to SMEs and cost-conscious corporates with moderate TI budgets.",
  },
  {
    id: "grade_c" as const,
    title: "Grade C / Value",
    icon: "💰",
    desc: "Older stock, basic",
    tooltip:
      "Older stock with basic finishes. Targets startups and cost-sensitive tenants with minimal landlord TI and shorter leases.",
  },
];

export function validateOfficeSegmentation(
  projectInfo: Pick<
    ProjectInfo,
    "officeSegment" | "officePositioning"
  >
): OfficeSegmentationStepErrors {
  const next: OfficeSegmentationStepErrors = {};
  if (!projectInfo.officeSegment?.trim()) {
    next.officeSegment = "Select an office operating segment.";
  }
  if (!projectInfo.officePositioning?.trim()) {
    next.officePositioning = "Select market positioning.";
  }
  return next;
}

type OfficeSegmentationStepProps = {
  errors?: OfficeSegmentationStepErrors;
};

export default function OfficeSegmentationStep({
  errors = {},
}: OfficeSegmentationStepProps) {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const updateProjectInfo = useFinModelStore((s) => s.updateProjectInfo);

  const [segment, setSegment] = useState(projectInfo?.officeSegment || "");
  const [positioning, setPositioning] = useState(
    projectInfo?.officePositioning || ""
  );
  const [coworkingDelivery, setCoworkingDelivery] =
    useState<OfficeCoworkingDelivery>(
      projectInfo?.officeCoworkingDelivery || "developer"
    );

  const handleSegmentSelect = (id: (typeof SEGMENTS)[number]["id"]) => {
    setSegment(id);
    const patch: Partial<ProjectInfo> = { officeSegment: id };
    if (id !== "co_working") {
      setCoworkingDelivery("developer");
      patch.officeCoworkingDelivery = "developer";
    }
    updateProjectInfo(patch, "operational");
    logOperationalCashOutflow("officeSegment", id, 4);
  };

  const handlePositioningSelect = (
    id: (typeof POSITIONINGS)[number]["id"]
  ) => {
    setPositioning(id);
    updateProjectInfo({ officePositioning: id }, "operational");
    logOperationalCashOutflow("officePositioning", id, 4);
  };

  const handleCoworkingDelivery = (val: OfficeCoworkingDelivery) => {
    setCoworkingDelivery(val);
    updateProjectInfo({ officeCoworkingDelivery: val }, "operational");
  };

  useEffect(() => {
    setSegment(projectInfo?.officeSegment || "");
    setPositioning(projectInfo?.officePositioning || "");
    setCoworkingDelivery(projectInfo?.officeCoworkingDelivery || "developer");
  }, [
    projectInfo?.officeSegment,
    projectInfo?.officePositioning,
    projectInfo?.officeCoworkingDelivery,
  ]);

  useEffect(() => {
    if (projectInfo?.officeSegment) {
      logOperationalCashOutflow("officeSegment", projectInfo.officeSegment, 4);
    }
    if (projectInfo?.officePositioning) {
      logOperationalCashOutflow("officePositioning", projectInfo.officePositioning, 4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Office operating segment &amp; positioning
        </h2>
        <p className="text-sm text-slate-400">
          Choose the office format and market positioning for your hold
          strategy. Both selections are required to continue.
        </p>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">
          Operating segment
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SEGMENTS.map((seg) => {
            const selected = segment === seg.id;
            return (
              <div
                key={seg.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSegmentSelect(seg.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSegmentSelect(seg.id);
                  }
                }}
                className={`cursor-pointer rounded-xl border p-6 transition-all ${
                  selected
                    ? "border-emerald-500 bg-emerald-900/20 ring-2 ring-emerald-500/30"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xl" aria-hidden>
                    {seg.icon}
                  </span>
                  <SegmentInfoTooltip content={seg.tooltip} />
                </div>
                <h4 className="text-lg font-semibold text-white">{seg.title}</h4>
                <p className="text-sm text-slate-400">{seg.sub}</p>
              </div>
            );
          })}
        </div>
        {errors.officeSegment && (
          <p className="mt-3 text-sm text-red-400">{errors.officeSegment}</p>
        )}
      </div>

      {segment === "co_working" && (
        <div className="animate-in fade-in slide-in-from-top-4 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Co-Working Delivery Model
          </h3>
          <div className="flex flex-col gap-4 sm:flex-row">
            <label
              className={`flex flex-1 cursor-pointer items-center gap-4 rounded-lg border p-4 transition-all ${
                coworkingDelivery === "developer"
                  ? "border-emerald-500 bg-emerald-900/20"
                  : "border-slate-600 hover:border-slate-500"
              }`}
            >
              <input
                type="radio"
                name="coworkingDelivery"
                className="h-5 w-5 border-slate-600 bg-slate-700 text-emerald-500"
                checked={coworkingDelivery === "developer"}
                onChange={() => handleCoworkingDelivery("developer")}
              />
              <div>
                <p className="font-medium text-white">Developer Plug &amp; Play</p>
                <p className="mt-1 text-xs text-slate-400">
                  Landlord provides full fit-out &amp; FFE (high CAPEX, 12–18%
                  of construction)
                </p>
              </div>
            </label>

            <label
              className={`flex flex-1 cursor-pointer items-center gap-4 rounded-lg border p-4 transition-all ${
                coworkingDelivery === "operator"
                  ? "border-emerald-500 bg-emerald-900/20"
                  : "border-slate-600 hover:border-slate-500"
              }`}
            >
              <input
                type="radio"
                name="coworkingDelivery"
                className="h-5 w-5 border-slate-600 bg-slate-700 text-emerald-500"
                checked={coworkingDelivery === "operator"}
                onChange={() => handleCoworkingDelivery("operator")}
              />
              <div>
                <p className="font-medium text-white">
                  Shell &amp; Core to Operator
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Leased to a third-party operator; minimal landlord FFE (2–3%)
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">
          Market positioning
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {POSITIONINGS.map((pos) => {
            const selected = positioning === pos.id;
            return (
              <button
                key={pos.id}
                type="button"
                onClick={() => handlePositioningSelect(pos.id)}
                className={`cursor-pointer rounded-xl border p-4 text-left transition-all ${
                  selected
                    ? "border-emerald-500 bg-emerald-900/20 text-emerald-400 ring-2 ring-emerald-500/30"
                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500"
                }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-xl" aria-hidden>
                    {pos.icon}
                  </span>
                  <SegmentInfoTooltip content={pos.tooltip} />
                </div>
                <p
                  className={`font-semibold ${selected ? "text-emerald-400" : "text-white"}`}
                >
                  {pos.title}
                </p>
                <p className="mt-1 text-xs opacity-70">{pos.desc}</p>
              </button>
            );
          })}
        </div>
        {errors.officePositioning && (
          <p className="mt-3 text-sm text-red-400">
            {errors.officePositioning}
          </p>
        )}
      </div>
    </div>
  );
}
