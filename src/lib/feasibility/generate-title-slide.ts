import type {
  AggregatedProjectData,
  FeasibilityProjectBundle,
  FeasibilitySlide,
  TitleSlideData,
} from "@/types/feasibility";
import {
  formatBTRGradeLabel,
  formatBTRSegmentLabel,
} from "@/lib/feasibility/btr-context";
import { buildHotelBenchmarkTitleLabel } from "@/lib/feasibility/generate-hotel-report";
import { buildMallBenchmarkTitleLabel } from "@/lib/feasibility/generate-shopping-mall-report";
import { buildOfficeBenchmarkTitleLabel } from "@/lib/feasibility/generate-office-report";
import { buildBTRBenchmarkTitleLabel } from "@/lib/feasibility/generate-btr-report";
import { getSaleStreamConfig } from "@/lib/feasibility/sale/sale-stream-config";

const COUNTRY_DISPLAY: Record<string, string> = {
  UAE: "United Arab Emirates",
  KSA: "Kingdom of Saudi Arabia",
  SA: "Saudi Arabia",
  MY: "Malaysia",
  AU: "Australia",
};

function formatToken(value: string): string {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatCountryForTitle(country: string): string {
  const trimmed = country.trim();
  if (!trimmed || trimmed === "—") return "United Arab Emirates";
  return COUNTRY_DISPLAY[trimmed] ?? trimmed;
}

function formatStarRating(starRating: string): string {
  const trimmed = starRating.trim();
  if (!trimmed || trimmed === "—") return "5 Star";
  if (/star/i.test(trimmed)) return formatToken(trimmed);
  const num = trimmed.replace(/[^\d.]/g, "");
  return num ? `${num} Star` : formatToken(trimmed);
}

function formatAssetType(assetType: string): string {
  const trimmed = assetType.trim();
  if (!trimmed || trimmed === "—") return "Hotel";
  return formatToken(trimmed);
}

function isHotelBundle(bundle: FeasibilityProjectBundle): boolean {
  const buildingType = (bundle.buildingType ?? "").toLowerCase();
  if (
    buildingType === "retail" ||
    buildingType === "office" ||
    buildingType === "residential"
  ) {
    return false;
  }
  if (buildingType === "hotel") return true;

  const at = (bundle.assetType || bundle.aggregate.assetType || "").toLowerCase();
  const seg = (bundle.aggregate.segment ?? "").toLowerCase();
  if (at.includes("hotel") || seg.includes("hotel")) return true;

  return false;
}

function isMallBundle(bundle: FeasibilityProjectBundle): boolean {
  const buildingType = (bundle.buildingType ?? "").toLowerCase();
  if (buildingType === "retail") return true;

  const at = (bundle.assetType || bundle.aggregate.assetType || "").toLowerCase();
  const hasOfficeGla = (bundle.officeHoldSnapshot?.officeGlaSqft ?? 0) > 0;
  const hasResidentialGla =
    (bundle.residentialHoldSnapshot?.residentialGlaSqft ?? 0) > 0;
  if (hasOfficeGla || hasResidentialGla) return false;
  if (at.includes("residential") || at.includes("btr")) return false;
  return (
    at.includes("retail") ||
    at.includes("mall") ||
    at.includes("shopping") ||
    (bundle.retailHoldSnapshot?.glaSqft ?? 0) > 0
  );
}

function isBTRBundle(bundle: FeasibilityProjectBundle): boolean {
  if (isHotelBundle(bundle)) return false;

  const buildingType = (bundle.buildingType ?? "").toLowerCase();
  if (buildingType === "retail" || buildingType === "office") return false;
  if (buildingType === "residential") return true;

  const at = (bundle.assetType || bundle.aggregate.assetType || "").toLowerCase();
  const bt = bundle.aggregate.segment?.toLowerCase() ?? "";
  return (
    at.includes("residential") ||
    at.includes("btr") ||
    bt.includes("residential") ||
    bt.includes("btr") ||
    (bundle.residentialHoldSnapshot?.residentialGlaSqft ?? 0) > 0
  );
}

function isSaleBundle(bundle: FeasibilityProjectBundle): boolean {
  return bundle.stream === "sale";
}

function isOfficeMixedUseBundle(bundle: FeasibilityProjectBundle): boolean {
  if (isSaleBundle(bundle)) return false;
  if (isBTRBundle(bundle)) return false;

  const buildingType = (bundle.buildingType ?? "").toLowerCase();
  if (buildingType === "retail") return false;
  if (buildingType === "office") return true;

  const at = (bundle.assetType || bundle.aggregate.assetType || "").toLowerCase();
  const bt = bundle.aggregate.segment?.toLowerCase() ?? "";
  return (
    at.includes("office") ||
    bt.includes("office") ||
    (bundle.officeHoldSnapshot?.officeGlaSqft ?? 0) > 0
  );
}

/** "regional_mall" → "Regional" for title slide */
export function formatMallTypeLabel(retailSegment?: string): string {
  const raw = (retailSegment ?? "regional_mall").replace(/_/g, " ").trim();
  const first = raw.split(/\s+/)[0] ?? "Regional";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function buildTitleSlideData(
  bundle: FeasibilityProjectBundle
): TitleSlideData {
  const agg = bundle.aggregate;
  const isSale = isSaleBundle(bundle);
  const isHotel = !isSale && isHotelBundle(bundle);
  const isBTR = !isSale && !isHotel && isBTRBundle(bundle);
  const isOffice = !isSale && !isHotel && !isBTR && isOfficeMixedUseBundle(bundle);
  const isMall = !isSale && !isHotel && !isBTR && !isOffice && isMallBundle(bundle);
  const saleLabel = isSale
    ? getSaleStreamConfig(
        (bundle as { buildingSubType?: string }).buildingSubType
      ).assetLabel
    : undefined;

  const hotelBusinessType = formatToken(
    agg.segment?.replace(/_/g, " ") || "Business"
  );
  const hotelStarRaw = agg.starRating?.trim();
  const benchmarkTitleLabel = isHotel
    ? buildHotelBenchmarkTitleLabel(hotelStarRaw, hotelBusinessType)
    : isMall
      ? buildMallBenchmarkTitleLabel(bundle.retailSegment, bundle.retailPositioning)
      : isOffice
        ? buildOfficeBenchmarkTitleLabel(
            bundle.officePositioning,
            bundle.officeSegment
          )
        : isBTR
          ? buildBTRBenchmarkTitleLabel(
              bundle.residentialPositioning,
              bundle.residentialSegment
            )
          : undefined;

  return {
    assetType: isSale
      ? saleLabel ?? formatAssetType(agg.assetType)
      : isMall
      ? "Shopping Mall"
      : isOffice
        ? "Office & Retail Tower"
        : isBTR
          ? "Residential BTR Tower"
          : isHotel
            ? "Hotel"
            : formatAssetType(agg.assetType || "Hotel"),
    segment: isHotel
      ? hotelBusinessType
      : formatToken(agg.segment || "Business"),
    starRating: isHotel
      ? formatStarRating(hotelStarRaw || "5")
      : formatStarRating(agg.starRating),
    country: formatCountryForTitle(bundle.location.country),
    city: bundle.location.city?.trim() || agg.location.city?.trim() || "Dubai",
    isShoppingMall: isMall,
    mallTypeLabel: isMall ? formatMallTypeLabel(bundle.retailSegment) : undefined,
    isOfficeMixedUse: isOffice,
    isResidentialBTR: isBTR,
    btrGradeLabel: isBTR
      ? formatBTRGradeLabel(bundle.residentialPositioning)
      : undefined,
    btrSegmentLabel: isBTR
      ? formatBTRSegmentLabel(bundle.residentialSegment)
      : undefined,
    isSaleStream: isSale,
    saleAssetLabel: saleLabel,
    businessType: isHotel ? hotelBusinessType : undefined,
    benchmarkTitleLabel,
  };
}

export function buildTitleSlideDataFromAggregate(
  project: AggregatedProjectData
): TitleSlideData {
  return {
    assetType: formatAssetType(project.assetType),
    segment: formatToken(project.segment),
    starRating: formatStarRating(project.starRating),
    country: formatCountryForTitle(project.location.country),
    city: project.location.city?.trim() || "Dubai",
  };
}

export function generateTitleSlide(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide {
  return {
    id: "title-slide",
    section: "title",
    title: "Title Slide",
    subtitle: "",
    paragraphs: [],
    data: buildTitleSlideData(bundle),
  };
}

export function isTitleSlideData(data: unknown): data is TitleSlideData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.assetType === "string" &&
    typeof d.segment === "string" &&
    typeof d.starRating === "string" &&
    typeof d.country === "string" &&
    typeof d.city === "string"
  );
}

/** Ensures a single title slide is always first in the deck. */
export function ensureTitleSlideFirst(
  bundle: FeasibilityProjectBundle,
  slides: FeasibilitySlide[]
): FeasibilitySlide[] {
  const rest = slides.filter((slide) => slide.id !== "title-slide");
  return [generateTitleSlide(bundle), ...rest];
}
