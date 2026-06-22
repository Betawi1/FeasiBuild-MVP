"use client";

function formatToken(id?: string): string {
  if (!id?.trim()) return "";
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export interface BenchmarkHeaderProps {
  assetType: "retail" | "hotel" | "office" | string;
  country: string;
  segment?: string;
  positioning?: string;
  /** Co-working delivery model (developer / operator). */
  coworkingDelivery?: string;
  furnishingLevel?: string;
  isServicedApartment?: boolean;
  hotelSegment?: string;
  hotelStars?: string | number;
  onUseDefaults: () => void;
  isManualOverride: boolean;
  /** Optional; reset clears manual flags via `onUseDefaults`. */
  setIsManualOverride?: (v: boolean) => void;
  /** Hide reset when step is display-only (e.g. TDC summary). */
  showResetButton?: boolean;
}

export default function BenchmarkHeader({
  assetType,
  country,
  segment,
  positioning,
  coworkingDelivery,
  furnishingLevel,
  isServicedApartment,
  hotelSegment,
  hotelStars,
  onUseDefaults,
  isManualOverride,
  setIsManualOverride,
  showResetButton = true,
}: BenchmarkHeaderProps) {
  let benchmarkText = "";

  if (assetType === "retail") {
    const segmentLabel = formatToken(segment);
    const positioningLabel = formatToken(positioning);
    const displayCountry =
      country === "United Arab Emirates" ? "UAE" : country || "—";
    benchmarkText = `Retail · ${segmentLabel || "—"} · ${positioningLabel || "—"} · ${displayCountry}`;
  } else if (assetType === "hotel") {
    const segmentLabel = formatToken(hotelSegment);
    const stars =
      hotelStars !== undefined && hotelStars !== ""
        ? `${hotelStars}★`
        : "—";
    benchmarkText = `${segmentLabel || "Hotel"} · ${stars} · ${country || "—"}`;
  } else if (assetType === "office") {
    const segmentLabel = formatToken(segment);
    const positioningLabel = formatToken(positioning);
    const deliveryLabel =
      segment === "co_working" && coworkingDelivery
        ? formatToken(coworkingDelivery)
        : "";
    const displayCountry =
      country === "United Arab Emirates" ? "UAE" : country || "—";
    const parts = [
      "Office",
      segmentLabel || "—",
      positioningLabel || "—",
      deliveryLabel,
      displayCountry,
    ].filter(Boolean);
    benchmarkText = parts.join(" · ");
  } else if (assetType === "residential") {
    const segmentLabel = formatToken(segment);
    const positioningLabel = formatToken(positioning);
    const furnishingLabel = formatToken(furnishingLevel);
    const displayCountry =
      country === "United Arab Emirates" ? "UAE" : country || "—";
    const parts = [
      "Residential",
      segmentLabel || "—",
      positioningLabel || "—",
      furnishingLabel,
      isServicedApartment ? "Serviced" : "",
      displayCountry,
    ].filter(Boolean);
    benchmarkText = parts.join(" · ");
  }

  return (
    <div className="mb-6 border-b border-slate-700 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            BENCHMARK
          </span>
          <div className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
            <span className="text-xs text-slate-300">{benchmarkText}</span>
          </div>
          {isManualOverride && (
            <div className="rounded-full border border-amber-600/50 bg-amber-900/30 px-3 py-1">
              <span className="text-xs text-amber-400">Manual overrides</span>
            </div>
          )}
        </div>
        {showResetButton ? (
          <button
            type="button"
            onClick={() => {
              setIsManualOverride?.(false);
              onUseDefaults();
            }}
            className="text-xs font-medium text-emerald-400 underline-offset-2 transition hover:text-emerald-300 hover:underline"
          >
            Use profile defaults
          </button>
        ) : null}
      </div>
    </div>
  );
}
