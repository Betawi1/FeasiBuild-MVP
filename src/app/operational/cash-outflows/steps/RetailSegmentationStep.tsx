"use client";

import { useEffect, useState } from "react";
import useFinModelStore, {
  type ProjectInfo,
} from "@/store/useFinModelStore";
import { logOperationalCashOutflow } from "@/lib/operational-audit-fields";

export type RetailSegmentationStepErrors = Record<string, string>;

function SegmentInfoTooltip({ content }: { content: string }) {
  return (
    <div className="group relative ml-2 inline-block cursor-help">
      <span className="cursor-pointer text-xs text-slate-500 transition hover:text-emerald-400">
        ℹ️
      </span>
      <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-64 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs text-slate-200 shadow-xl group-hover:block">
        {content}
      </div>
    </div>
  );
}

const RETAIL_SEGMENTS = [
  {
    id: "regional_mall" as const,
    title: "Regional Mall",
    sub: "Large enclosed, multiple anchors",
    icon: "🏢",
    tooltip:
      "High destination traffic, 40k-100k+ sqm GLA. Requires strong anchor mix (department stores/supermarkets). High leasing complexity, high capex, but stable long-term yield.",
  },
  {
    id: "lifestyle_center" as const,
    title: "Lifestyle Center",
    sub: "Open-air, premium experience",
    icon: "🌳",
    tooltip:
      '"Town square" feel, high F&B mix, pedestrian-friendly. Higher construction costs due to landscaping/façades. Appeals to affluent demographic, high rent potential.',
  },
  {
    id: "community_center" as const,
    title: "Community Center",
    sub: "Neighborhood convenience",
    icon: "🏪",
    tooltip:
      "10k-40k sqm GLA, anchored by supermarket/health. Serves 15-min radius. Lower capex, lower risk, but lower yield. Stable occupancy.",
  },
  {
    id: "outlet_center" as const,
    title: "Outlet Center",
    sub: "Discount & value brands",
    icon: "🏷️",
    tooltip:
      "Value positioning, typically peripheral location. Lower construction finish costs. Volume-driven model, dependent on tourism/regional traffic.",
  },
];

const RETAIL_POSITIONING = [
  { id: "luxury" as const, label: "Luxury", icon: "💎", desc: "High-end brands" },
  { id: "upscale" as const, label: "Upscale", icon: "✨", desc: "Premium brands" },
  { id: "mid_market" as const, label: "Mid-Market", icon: "🛍️", desc: "Mainstream brands" },
  { id: "value" as const, label: "Value", icon: "💰", desc: "Discount/Essential" },
];

export function validateRetailSegmentation(
  projectInfo: Pick<ProjectInfo, "retailSegment" | "retailPositioning">
): RetailSegmentationStepErrors {
  const next: RetailSegmentationStepErrors = {};
  if (!projectInfo.retailSegment?.trim()) {
    next.retailSegment = "Select a retail operating segment.";
  }
  if (!projectInfo.retailPositioning?.trim()) {
    next.retailPositioning = "Select market positioning.";
  }
  return next;
}

type RetailSegmentationStepProps = {
  errors?: RetailSegmentationStepErrors;
};

export default function RetailSegmentationStep({
  errors = {},
}: RetailSegmentationStepProps) {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const updateProjectInfo = useFinModelStore((s) => s.updateProjectInfo);

  const [segment, setSegment] = useState(projectInfo?.retailSegment || "");
  const [positioning, setPositioning] = useState(
    projectInfo?.retailPositioning || ""
  );

  useEffect(() => {
    setSegment(projectInfo?.retailSegment || "");
    setPositioning(projectInfo?.retailPositioning || "");
  }, [projectInfo?.retailSegment, projectInfo?.retailPositioning]);

  useEffect(() => {
    if (projectInfo?.retailSegment) {
      logOperationalCashOutflow("retailSegment", projectInfo.retailSegment, 5);
    }
    if (projectInfo?.retailPositioning) {
      logOperationalCashOutflow("retailPositioning", projectInfo.retailPositioning, 5);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSegmentSelect = (id: (typeof RETAIL_SEGMENTS)[number]["id"]) => {
    setSegment(id);
    updateProjectInfo({ retailSegment: id }, "operational");
    logOperationalCashOutflow("retailSegment", id, 5);
  };

  const handlePositioningSelect = (
    id: (typeof RETAIL_POSITIONING)[number]["id"]
  ) => {
    setPositioning(id);
    updateProjectInfo({ retailPositioning: id }, "operational");
    logOperationalCashOutflow("retailPositioning", id, 5);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-xl font-semibold text-white">
          Shopping mall / retail operating segment
        </h2>
        <p className="mb-6 text-sm text-slate-400">
          Choose the mall format and market positioning for your hold strategy.
          Both selections are required to continue.
        </p>
        <h3 className="mb-2 text-lg font-semibold text-white">
          Operating segment
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {RETAIL_SEGMENTS.map((seg) => {
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
        {errors.retailSegment && (
          <p className="mt-3 text-sm text-red-400">{errors.retailSegment}</p>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-white">
          Market positioning
        </h3>
        <div className="flex flex-wrap gap-4">
          {RETAIL_POSITIONING.map((pos) => {
            const selected = positioning === pos.id;
            return (
              <button
                key={pos.id}
                type="button"
                onClick={() => handlePositioningSelect(pos.id)}
                className={`min-w-[120px] rounded-lg border px-6 py-4 text-left transition-all ${
                  selected
                    ? "border-emerald-500 bg-emerald-900/20 text-emerald-400 ring-2 ring-emerald-500/30"
                    : "border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                <div className="mb-1 text-2xl" aria-hidden>
                  {pos.icon}
                </div>
                <div className="text-sm font-medium">{pos.label}</div>
                <div className="text-xs opacity-70">{pos.desc}</div>
              </button>
            );
          })}
        </div>
        {errors.retailPositioning && (
          <p className="mt-3 text-sm text-red-400">
            {errors.retailPositioning}
          </p>
        )}
      </div>
    </div>
  );
}
