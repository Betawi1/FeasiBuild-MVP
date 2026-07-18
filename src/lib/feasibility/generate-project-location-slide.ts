import type {
  FeasibilityProjectBundle,
  FeasibilitySlide,
  ProjectLocationSlideData,
} from "@/types/feasibility";

export function isProjectLocationSlideData(
  data: unknown
): data is ProjectLocationSlideData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.city === "string" &&
    typeof d.country === "string" &&
    typeof d.locationDescription === "string"
  );
}

function formatAssetLabel(bundle: FeasibilityProjectBundle): string {
  const at = (bundle.assetType || bundle.aggregate.assetType || "development").trim();
  const positioning = bundle.aggregate.positioning?.trim();
  if (positioning && !at.toLowerCase().includes(positioning.toLowerCase())) {
    return `${positioning} ${at}`;
  }
  return at || "development";
}

/** Build static project-location slide data from the feasibility bundle (no AI). */
export function buildProjectLocationSlideData(
  bundle: FeasibilityProjectBundle
): ProjectLocationSlideData {
  const city = bundle.location.city?.trim() || "—";
  const country = bundle.location.country?.trim() || "—";
  const subMarket =
    bundle.location.subMarket?.trim() ||
    bundle.aggregate.location.subMarket?.trim() ||
    undefined;
  const coordinates = bundle.location.coordinates ?? null;
  const assetType = formatAssetLabel(bundle);

  const locationDescription = subMarket
    ? `The proposed ${assetType} is strategically situated in the ${subMarket} district of ${city}, ${country}, offering excellent connectivity to key demand generators and infrastructure.`
    : `The proposed ${assetType} is strategically located in ${city}, ${country}, offering excellent connectivity to key demand generators and infrastructure.`;

  return {
    city,
    country,
    subMarket,
    coordinates,
    assetType,
    locationDescription,
  };
}

/** Slide 3 — Project Location (static map; no AI generation). */
export function generateProjectLocationSlide(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide {
  const data = buildProjectLocationSlideData(bundle);
  return {
    id: "project-location",
    section: "project",
    title: "Project Analysis",
    subtitle: "Project Location",
    paragraphs: [data.locationDescription],
    data,
  };
}

/** Insert project-location immediately after exec-1 (or after title if exec missing). */
export function insertProjectLocationSlide(
  slides: FeasibilitySlide[],
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  const locationSlide = generateProjectLocationSlide(bundle);
  const withoutDup = slides.filter((s) => s.id !== "project-location");
  const execIdx = withoutDup.findIndex((s) => s.id === "exec-1");
  if (execIdx >= 0) {
    return [
      ...withoutDup.slice(0, execIdx + 1),
      locationSlide,
      ...withoutDup.slice(execIdx + 1),
    ];
  }
  const titleIdx = withoutDup.findIndex((s) => s.id === "title-slide");
  if (titleIdx >= 0) {
    return [
      ...withoutDup.slice(0, titleIdx + 1),
      locationSlide,
      ...withoutDup.slice(titleIdx + 1),
    ];
  }
  return [locationSlide, ...withoutDup];
}
