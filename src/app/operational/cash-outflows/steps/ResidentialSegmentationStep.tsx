"use client";

import { useEffect, useState } from "react";
import useFinModelStore, {
  type ProjectInfo,
} from "@/store/useFinModelStore";
import type {
  ResidentialFurnishingLevel,
  ResidentialPositioning,
  ResidentialSegment,
} from "@/lib/benchmarks/residential-construction-costs";
import { logOperationalCashOutflow } from "@/lib/operational-audit-fields";

export type ResidentialSegmentationStepErrors = Record<string, string>;

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

const SEGMENTS: {
  id: ResidentialSegment;
  title: string;
  sub: string;
  icon: string;
  tooltip: string;
}[] = [
  {
    id: "high_rise",
    title: "High-Rise Tower",
    sub: "Urban core, 10+ floors",
    icon: "🏙️",
    tooltip:
      "CBD/prime urban high-rise with elevator service, concierge, rooftop amenities, and structured parking. Targets young professionals, executives, and corporate housing. Higher construction costs but premium rent psf.",
  },
  {
    id: "mid_rise",
    title: "Mid-Rise / Garden Style",
    sub: "Suburban, 3-6 floors",
    icon: "🌳",
    tooltip:
      "Low-to-mid density suburban buildings with walk-up or limited elevator access. Surface/podium parking, community amenities (pool, playground). Targets families and mid-career professionals.",
  },
  {
    id: "townhome",
    title: "Townhome / Low-Rise",
    sub: "G+2 max, private entrances",
    icon: "🏡",
    tooltip:
      "2-3 story attached units with ground-level parking and private outdoor space. Lower density, family-focused, privacy-seeking renters. Typically no basement; simpler MEP systems.",
  },
  {
    id: "compact",
    title: "Compact Units",
    sub: "G+4 to G+16, Studios & 1BR only",
    icon: "🏘️",
    tooltip:
      "High-density workforce housing (G+4 to G+16 max) comprising only Studios and 1BR units. Targets single workers, young professionals, and project staff. Efficient layouts, lower blended rent psf but higher density absorption.",
  },
];

const POSITIONINGS: {
  id: ResidentialPositioning;
  title: string;
  icon: string;
  desc: string;
  tooltip: string;
}[] = [
  {
    id: "luxury",
    title: "Luxury",
    icon: "💎",
    desc: "Top 10% market rents",
    tooltip:
      "Resort-style amenities, prime locations, high-end finishes (quartz, smart home, designer fixtures). Targets top 15% household income. Highest rent psf, longer lease-up, 94-97% stabilized occupancy.",
  },
  {
    id: "grade_a",
    title: "Grade A",
    icon: "✨",
    desc: "Top 25% market rents",
    tooltip:
      "Quality amenities, modern appliances, upgraded flooring. Targets top 40% household income. Balanced risk-return, 92-95% stabilized occupancy, institutional-grade asset.",
  },
  {
    id: "grade_b",
    title: "Grade B",
    icon: "🏢",
    desc: "Market average ±10%",
    tooltip:
      "Functional amenities, durable materials, established locations. Targets middle 50% household income. Lower capex, faster absorption, 90-94% stabilized occupancy.",
  },
  {
    id: "grade_c",
    title: "Grade C",
    icon: "💰",
    desc: "Bottom 25% market rents",
    tooltip:
      "Essential amenities only, basic finishes, secondary locations. Targets bottom 40% household income. Highest yield tolerance, 89-92% stabilized occupancy, minimal TI requirements.",
  },
];

const FURNISHING_OPTIONS: {
  id: ResidentialFurnishingLevel;
  title: string;
  desc: string;
}[] = [
  {
    id: "unfurnished",
    title: "Unfurnished",
    desc: "Shell + basic finishes, kitchen cabinets, closets, A/C",
  },
  {
    id: "semi_furnished",
    title: "Semi-Furnished",
    desc: "Unfurnished + major appliances & window treatments",
  },
  {
    id: "fully_furnished",
    title: "Fully Furnished",
    desc: "Semi-furnished + furniture, decor, kitchenware, linens",
  },
];

function formatBenchmarkToken(id?: string): string {
  if (!id?.trim()) return "—";
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function validateResidentialSegmentation(
  projectInfo: Pick<
    ProjectInfo,
    | "residentialSegment"
    | "residentialPositioning"
    | "residentialFurnishingLevel"
  >
): ResidentialSegmentationStepErrors {
  const next: ResidentialSegmentationStepErrors = {};
  if (!projectInfo.residentialSegment?.trim()) {
    next.residentialSegment = "Select a residential operating segment.";
  }
  if (!projectInfo.residentialPositioning?.trim()) {
    next.residentialPositioning = "Select market positioning.";
  }
  if (!projectInfo.residentialFurnishingLevel?.trim()) {
    next.residentialFurnishingLevel = "Select a furnishing level.";
  }
  return next;
}

type ResidentialSegmentationStepProps = {
  errors?: ResidentialSegmentationStepErrors;
};

export default function ResidentialSegmentationStep({
  errors = {},
}: ResidentialSegmentationStepProps) {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const updateProjectInfo = useFinModelStore((s) => s.updateProjectInfo);

  const [segment, setSegment] = useState<ResidentialSegment | "">(
    projectInfo?.residentialSegment || ""
  );
  const [positioning, setPositioning] = useState<ResidentialPositioning | "">(
    projectInfo?.residentialPositioning || ""
  );
  const [furnishingLevel, setFurnishingLevel] =
    useState<ResidentialFurnishingLevel>(
      projectInfo?.residentialFurnishingLevel || "unfurnished"
    );
  const [isServicedApartment, setIsServicedApartment] = useState(
    projectInfo?.residentialIsServicedApartment || false
  );

  const showServicedToggle =
    (segment === "high_rise" || segment === "mid_rise") &&
    (positioning === "luxury" || positioning === "grade_a");

  const handleSegmentSelect = (id: ResidentialSegment) => {
    setSegment(id);
    const patch: Partial<ProjectInfo> = { residentialSegment: id };
    if (id !== "high_rise" && id !== "mid_rise") {
      setIsServicedApartment(false);
      patch.residentialIsServicedApartment = false;
    }
    updateProjectInfo(patch, "operational");
    logOperationalCashOutflow("residentialSegment", id, 4);
  };

  const handlePositioningSelect = (id: ResidentialPositioning) => {
    setPositioning(id);
    const patch: Partial<ProjectInfo> = { residentialPositioning: id };
    if (id !== "luxury" && id !== "grade_a") {
      setIsServicedApartment(false);
      patch.residentialIsServicedApartment = false;
    }
    updateProjectInfo(patch, "operational");
    logOperationalCashOutflow("residentialPositioning", id, 4);
  };

  const handleFurnishingChange = (val: ResidentialFurnishingLevel) => {
    setFurnishingLevel(val);
    updateProjectInfo({ residentialFurnishingLevel: val }, "operational");
  };

  const handleServicedToggle = (checked: boolean) => {
    setIsServicedApartment(checked);
    const patch: Partial<ProjectInfo> = {
      residentialIsServicedApartment: checked,
    };
    if (checked) {
      setFurnishingLevel("fully_furnished");
      patch.residentialFurnishingLevel = "fully_furnished";
    }
    updateProjectInfo(patch, "operational");
  };

  useEffect(() => {
    setSegment(projectInfo?.residentialSegment || "");
    setPositioning(projectInfo?.residentialPositioning || "");
    setFurnishingLevel(
      projectInfo?.residentialFurnishingLevel || "unfurnished"
    );
    setIsServicedApartment(
      projectInfo?.residentialIsServicedApartment || false
    );
  }, [
    projectInfo?.residentialSegment,
    projectInfo?.residentialPositioning,
    projectInfo?.residentialFurnishingLevel,
    projectInfo?.residentialIsServicedApartment,
  ]);

  useEffect(() => {
    if (projectInfo?.residentialSegment) {
      logOperationalCashOutflow(
        "residentialSegment",
        projectInfo.residentialSegment,
        5
      );
    }
    if (projectInfo?.residentialPositioning) {
      logOperationalCashOutflow(
        "residentialPositioning",
        projectInfo.residentialPositioning,
        5
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const segmentTitle =
    SEGMENTS.find((s) => s.id === segment)?.title ?? "—";
  const positioningTitle =
    POSITIONINGS.find((p) => p.id === positioning)?.title ?? "—";
  const displayCountry =
    projectInfo?.country === "United Arab Emirates"
      ? "UAE"
      : projectInfo?.country || "—";

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Residential operating segment &amp; positioning
        </h2>
        <p className="text-sm text-slate-400">
          Choose the residential format, furnishing level, and market
          positioning. Selections determine construction, FFE, and revenue
          benchmarks.
        </p>
      </div>

      <div className="mb-6 border-b border-slate-700 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            BENCHMARK
          </span>
          <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
            <span className="text-xs text-slate-300">
              Residential · {displayCountry} · {segmentTitle} ·{" "}
              {positioningTitle}
              {furnishingLevel
                ? ` · ${formatBenchmarkToken(furnishingLevel)}`
                : ""}
              {isServicedApartment ? " · Serviced" : ""}
            </span>
          </div>
        </div>
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
        {errors.residentialSegment && (
          <p className="mt-3 text-sm text-red-400">{errors.residentialSegment}</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Furnishing level
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {FURNISHING_OPTIONS.map((opt) => {
            const selected = furnishingLevel === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-all ${
                  selected
                    ? "border-emerald-500 bg-emerald-900/20"
                    : "border-slate-600 hover:border-slate-500"
                }`}
              >
                <input
                  type="radio"
                  name="furnishing"
                  className="h-4 w-4 border-slate-600 bg-slate-700 text-emerald-500"
                  checked={selected}
                  onChange={() => handleFurnishingChange(opt.id)}
                />
                <div>
                  <p className="font-medium text-white">{opt.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{opt.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
        {errors.residentialFurnishingLevel && (
          <p className="mt-3 text-sm text-red-400">
            {errors.residentialFurnishingLevel}
          </p>
        )}
      </div>

      {showServicedToggle && (
        <div className="animate-in fade-in slide-in-from-top-4 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                Serviced apartment model
                <SegmentInfoTooltip content="Developer delivers fully furnished unit to operator. Operator manages all operations, maintenance, and FFE replacement. Lease term standardized to 12 months. FFE % of construction increases to 15-25%." />
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Only available for High-Rise / Mid-Rise + Luxury / Grade A
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={isServicedApartment}
                onChange={(e) => handleServicedToggle(e.target.checked)}
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
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
        {errors.residentialPositioning && (
          <p className="mt-3 text-sm text-red-400">
            {errors.residentialPositioning}
          </p>
        )}
      </div>
    </div>
  );
}
