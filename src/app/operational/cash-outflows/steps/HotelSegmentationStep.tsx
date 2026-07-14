"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { HotelOperatingType } from "@/config/hotel-cost-profiles";
import { isValidHotelCombo } from "@/config/hotel-cost-profiles";
import useFinModelStore, {
  type ProjectInfo,
} from "@/store/useFinModelStore";
import { logOperationalCashOutflow } from "@/lib/operational-audit-fields";

export type HotelSegmentationStepErrors = Record<string, string>;

function HoverTipAbove({ tip, children }: { tip: string; children: ReactNode }) {
  return (
    <div className="group relative w-full">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 right-0 z-[100] mb-2 whitespace-pre-line rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-left text-xs leading-relaxed text-slate-200 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {tip}
      </div>
    </div>
  );
}

const HOTEL_OPERATING_TYPE_CARDS: {
  value: HotelOperatingType;
  icon: string;
  label: string;
  hint: string;
  title: string;
}[] = [
  {
    value: "business",
    icon: "💼",
    label: "Business / Upscale",
    hint: "Full-service, conference, corporate demand.",
    title: "Business and upscale full-service hotels (3–5★ in this model).",
  },
  {
    value: "resort",
    icon: "🏖️",
    label: "Resort / Leisure",
    hint: "Pool, F&B, destination leisure.",
    title: "Resort and leisure hotels (4–5★ in this model).",
  },
  {
    value: "boutique",
    icon: "✨",
    label: "Boutique / Lifestyle",
    hint: "Design-led, smaller key count.",
    title: "Boutique and lifestyle hotels (3–4★ in this model).",
  },
  {
    value: "budget",
    icon: "🏨",
    label: "Budget / Economy",
    hint: "Limited service, lean FF&E.",
    title: "Economy and limited-service hotels (1★ in this model).",
  },
];

const HOTEL_STARS_BY_TYPE: Record<HotelOperatingType, number[]> = {
  budget: [1],
  boutique: [3, 4],
  business: [3, 4, 5],
  resort: [4, 5],
};

export function validateHotelSegmentation(
  projectInfo: Pick<ProjectInfo, "hotelOperatingType" | "hotelStarRating">
): HotelSegmentationStepErrors {
  const next: HotelSegmentationStepErrors = {};
  const op = projectInfo.hotelOperatingType ?? "";
  if (!op) {
    next.hotelOperatingType = "Select a hotel operating segment.";
  }
  const star = Number(projectInfo.hotelStarRating);
  if (!Number.isFinite(star) || star <= 0) {
    next.hotelStarRating = "Select a star rating for this segment.";
  } else if (op) {
    const combo = isValidHotelCombo(op, star);
    if (!combo.valid && combo.message) {
      next.hotelStarRating = combo.message;
    }
  }
  return next;
}

type HotelSegmentationStepProps = {
  errors?: HotelSegmentationStepErrors;
};

export default function HotelSegmentationStep({
  errors = {},
}: HotelSegmentationStepProps) {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const updateProjectInfo = useFinModelStore((s) => s.updateProjectInfo);

  const [operatingType, setOperatingType] = useState(
    projectInfo?.hotelOperatingType || ""
  );
  const [starRating, setStarRating] = useState(
    projectInfo?.hotelStarRating || ""
  );

  useEffect(() => {
    setOperatingType(projectInfo?.hotelOperatingType || "");
    setStarRating(projectInfo?.hotelStarRating || "");
  }, [projectInfo?.hotelOperatingType, projectInfo?.hotelStarRating]);

  useEffect(() => {
    if (projectInfo?.hotelOperatingType) {
      logOperationalCashOutflow(
        "hotelOperatingType",
        projectInfo.hotelOperatingType,
        5
      );
    }
    if (projectInfo?.hotelStarRating) {
      logOperationalCashOutflow("hotelStarRating", projectInfo.hotelStarRating, 4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOperatingTypeSelect = (value: HotelOperatingType) => {
    setOperatingType(value);
    const allowed = HOTEL_STARS_BY_TYPE[value];
    const cur = Number(starRating);
    const keepStar = allowed.includes(cur);
    updateProjectInfo(
      {
        hotelOperatingType: value,
        hotelStarRating: keepStar ? starRating : "",
      },
      "operational"
    );
    if (!keepStar) {
      setStarRating("");
    }
    logOperationalCashOutflow("hotelOperatingType", value, 4);
    if (keepStar && starRating) {
      logOperationalCashOutflow("hotelStarRating", starRating, 4);
    }
  };

  const handleStarSelect = (s: number) => {
    const next = String(s);
    setStarRating(next);
    updateProjectInfo({ hotelStarRating: next }, "operational");
    logOperationalCashOutflow("hotelStarRating", next, 4);
  };

  return (
    <>
      <h2 className="mb-2 text-xl font-semibold text-white">
        Hotel operating segment &amp; star rating
      </h2>
      <p className="mb-6 text-sm text-slate-400">
        Choose the positioning that best matches your hold strategy. Star options
        follow typical industry pairings; invalid combinations block the next
        step.
      </p>

      <p className="mb-3 text-sm font-medium text-slate-200">
        Operating segment
      </p>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {HOTEL_OPERATING_TYPE_CARDS.map((opt) => {
          const selected = operatingType === opt.value;
          return (
            <HoverTipAbove key={opt.value} tip={opt.title}>
              <button
                type="button"
                onClick={() => handleOperatingTypeSelect(opt.value)}
                className={`min-h-[100px] w-full cursor-pointer rounded-xl border p-5 text-left shadow-sm transition-all ${
                  selected
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-100 ring-2 ring-emerald-500/40"
                    : "border-slate-600 bg-slate-800/80 text-slate-100 hover:border-slate-500 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 text-2xl" aria-hidden>
                    {opt.icon}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-base font-semibold leading-snug">
                      {opt.label}
                    </span>
                    <span className="mt-2 block text-xs font-normal leading-relaxed text-slate-400">
                      {opt.hint}
                    </span>
                  </div>
                </div>
              </button>
            </HoverTipAbove>
          );
        })}
      </div>
      {errors.hotelOperatingType && (
        <p className="mb-4 text-sm text-red-400">{errors.hotelOperatingType}</p>
      )}

      <p className="mb-3 text-sm font-medium text-slate-200">Star rating</p>
      {operatingType ? (
        <div className="flex flex-wrap gap-3">
          {HOTEL_STARS_BY_TYPE[operatingType as HotelOperatingType].map((s) => {
            const selected = starRating === String(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleStarSelect(s)}
                className={`rounded-lg border px-5 py-3 text-sm font-semibold transition-all ${
                  selected
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-200 ring-2 ring-emerald-500/30"
                    : "border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500"
                }`}
              >
                {s}★
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Select an operating segment to see allowed star ratings.
        </p>
      )}
      {errors.hotelStarRating && (
        <p className="mt-3 text-sm text-red-400">{errors.hotelStarRating}</p>
      )}
    </>
  );
}
