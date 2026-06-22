"use client";

import {
  streamKeyFromPrefix,
  useStreamPrefix,
} from "@/lib/stream-path";
import useFinModelStore from "@/store/useFinModelStore";

function formatToken(id?: string): string {
  if (!id?.trim()) return "";
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function displayCountry(country?: string): string {
  if (!country?.trim()) return "UAE";
  if (country === "United Arab Emirates") return "UAE";
  return country;
}

const ASSET_TYPE_DISPLAY: Record<string, string> = {
  hotel: "Hotel",
  retail: "Shopping Mall",
  office: "Office",
  residential: "Residential",
};

export default function BenchmarkProfile() {
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const buildingType = projectInfo?.buildingType || "hotel";

  const assetTypeDisplay =
    (ASSET_TYPE_DISPLAY[buildingType] ?? formatToken(buildingType)) || "Hotel";

  const segment = (() => {
    switch (buildingType) {
      case "hotel":
        return (
          formatToken(projectInfo.hotelOperatingType) || "Business Hotel"
        );
      case "retail":
        return formatToken(projectInfo.retailSegment) || "Regional Mall";
      case "office":
        return formatToken(projectInfo.officeSegment) || "High-Rise Tower";
      case "residential":
        return formatToken(projectInfo.residentialSegment) || "High-Rise";
      default:
        return "";
    }
  })();

  const positioning = (() => {
    switch (buildingType) {
      case "hotel": {
        const stars = projectInfo.hotelStarRating?.trim();
        return stars ? `${stars} Star` : "Mid-Market";
      }
      case "retail":
        return formatToken(projectInfo.retailPositioning) || "Mid-Market";
      case "office":
        return formatToken(projectInfo.officePositioning) || "Grade A";
      case "residential":
        return formatToken(projectInfo.residentialPositioning) || "Grade A";
      default:
        return "";
    }
  })();

  const furnishingLevel = projectInfo.residentialFurnishingLevel
    ? formatToken(projectInfo.residentialFurnishingLevel)
    : null;

  const isServicedApartment = projectInfo.residentialIsServicedApartment;

  const coworkingDelivery =
    buildingType === "office" &&
    projectInfo.officeSegment === "co_working" &&
    projectInfo.officeCoworkingDelivery
      ? formatToken(projectInfo.officeCoworkingDelivery)
      : null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-400">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        BENCHMARK
      </span>
      <span className="text-slate-600">•</span>
      <span className="font-medium text-slate-300">{assetTypeDisplay}</span>
      <span className="text-slate-600">•</span>
      <span>{segment}</span>
      <span className="text-slate-600">•</span>
      <span>{positioning}</span>

      {coworkingDelivery ? (
        <>
          <span className="text-slate-600">•</span>
          <span>{coworkingDelivery}</span>
        </>
      ) : null}

      {buildingType === "residential" && furnishingLevel ? (
        <>
          <span className="text-slate-600">•</span>
          <span className="capitalize">{furnishingLevel}</span>
        </>
      ) : null}

      {isServicedApartment ? (
        <>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400">Serviced Apartment</span>
        </>
      ) : null}

      <span className="text-slate-600">•</span>
      <span>{displayCountry(projectInfo.country)}</span>

      {projectInfo.city ? (
        <>
          <span className="text-slate-600">•</span>
          <span>{projectInfo.city}</span>
        </>
      ) : null}
    </div>
  );
}
