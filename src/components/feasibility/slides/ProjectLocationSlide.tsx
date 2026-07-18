"use client";

import dynamic from "next/dynamic";
import SlideContainer from "@/components/feasibility/SlideContainer";
import SlideHeader from "@/components/feasibility/SlideHeader";
import type { ProjectLocationSlideData } from "@/types/feasibility";
import type { SlideEditingProps } from "@/components/feasibility/slide-editing";

const ProjectLocationMap = dynamic(
  () => import("@/components/feasibility/slides/ProjectLocationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
        Loading map…
      </div>
    ),
  }
);

interface Props extends SlideEditingProps {
  data: ProjectLocationSlideData;
}

function hasValidCoordinates(
  coordinates: { lat: number; lng: number } | null | undefined
): coordinates is { lat: number; lng: number } {
  return (
    !!coordinates &&
    typeof coordinates.lat === "number" &&
    typeof coordinates.lng === "number" &&
    Number.isFinite(coordinates.lat) &&
    Number.isFinite(coordinates.lng)
  );
}

export default function ProjectLocationSlide({
  data,
  isEditing = false,
  onDataChange,
}: Props) {
  const { city, country, subMarket, coordinates, locationDescription } = data;
  const coords = hasValidCoordinates(coordinates) ? coordinates : null;

  const updateDescription = (text: string) => {
    onDataChange?.({ ...data, locationDescription: text });
  };

  return (
    <SlideContainer>
      <SlideHeader title="Project Analysis" subtitle="Project Location" />

      <div className="flex-1 flex gap-10 items-center min-h-0 overflow-hidden px-1">
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-3 mb-5">
            <svg
              className="w-8 h-8 text-blue-600 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <h3 className="text-2xl font-semibold text-slate-800">
              {city}, {country}
            </h3>
          </div>

          {isEditing && onDataChange ? (
            <textarea
              value={locationDescription}
              onChange={(e) => updateDescription(e.target.value)}
              className="text-base text-slate-700 leading-relaxed mb-5 p-3 bg-slate-50 border border-emerald-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y min-h-[120px] w-full"
            />
          ) : (
            <p className="text-base text-slate-700 leading-relaxed mb-5">
              {locationDescription}
            </p>
          )}

          {subMarket ? (
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg w-fit">
              <span className="text-sm font-medium text-blue-800">
                Sub-Market:{" "}
                <span className="font-bold">{subMarket}</span>
              </span>
            </div>
          ) : null}
        </div>

        {/* Leaflet map — DOM tile images, PDF-capturable */}
        <div
          className="flex-1 h-[360px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative shrink-0 z-0"
          data-pdf-map="project-location"
        >
          {coords ? (
            <ProjectLocationMap lat={coords.lat} lng={coords.lng} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-center p-4">
              <p className="font-medium">Map not available</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 shrink-0 text-right">
        <p className="text-xs text-slate-400">
          ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            OpenStreetMap
          </a>{" "}
          contributors
        </p>
      </div>
    </SlideContainer>
  );
}
