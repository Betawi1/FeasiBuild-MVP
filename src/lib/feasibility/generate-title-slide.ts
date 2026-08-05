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
    buildingType === "residential" ||
    buildingType.includes("warehouse") ||
    buildingType.includes("industrial") ||
    buildingType.includes("data_centre") ||
    buildingType.includes("datacentre") ||
    buildingType.includes("data centre")
  ) {
    return false;
  }
  if (buildingType === "hotel") return true;

  const at = (bundle.assetType || bundle.aggregate.assetType || "").toLowerCase();
  const seg = (bundle.aggregate.segment ?? "").toLowerCase();
  if (
    at.includes("warehouse") ||
    at.includes("industrial") ||
    at.includes("data_centre") ||
    at.includes("datacentre") ||
    at.includes("data centre") ||
    seg.includes("warehouse") ||
    seg.includes("industrial")
  ) {
    return false;
  }
  if (at.includes("hotel") || seg.includes("hotel")) return true;

  return false;
}

function isMallBundle(bundle: FeasibilityProjectBundle): boolean {
  const buildingType = (bundle.buildingType ?? "").toLowerCase();
  if (
    buildingType.includes("warehouse") ||
    buildingType.includes("industrial") ||
    buildingType.includes("data_centre") ||
    buildingType.includes("datacentre")
  ) {
    return false;
  }
  if (buildingType === "retail") return true;

  const at = (bundle.assetType || bundle.aggregate.assetType || "").toLowerCase();
  const hasOfficeGla = (bundle.officeHoldSnapshot?.officeGlaSqft ?? 0) > 0;
  const hasResidentialGla =
    (bundle.residentialHoldSnapshot?.residentialGlaSqft ?? 0) > 0;
  if (hasOfficeGla || hasResidentialGla) return false;
  if (at.includes("residential") || at.includes("btr")) return false;
  if (at.includes("warehouse") || at.includes("industrial")) return false;
  return (
    at.includes("retail") ||
    at.includes("mall") ||
    at.includes("shopping") ||
    (bundle.retailHoldSnapshot?.glaSqft ?? 0) > 0
  );
}

function isBTRBundle(bundle: FeasibilityProjectBundle): boolean {
  if (isHotelBundle(bundle)) return false;
  // Never classify a Data Centre project as BTR (even with leftover residential snapshots)
  if (isDataCentreBundle(bundle)) return false;

  const buildingType = (bundle.buildingType ?? "").toLowerCase();
  if (
    buildingType === "retail" ||
    buildingType === "office" ||
    buildingType.includes("warehouse") ||
    buildingType.includes("industrial") ||
    buildingType.includes("data_centre") ||
    buildingType.includes("datacentre") ||
    buildingType.includes("data centre")
  ) {
    return false;
  }
  if (buildingType === "residential") return true;

  const at = (bundle.assetType || bundle.aggregate.assetType || "").toLowerCase();
  const bt = bundle.aggregate.segment?.toLowerCase() ?? "";
  if (
    at.includes("warehouse") ||
    at.includes("industrial") ||
    at.includes("data_centre") ||
    at.includes("datacentre") ||
    at.includes("data centre")
  ) {
    return false;
  }
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
  if (
    buildingType.includes("warehouse") ||
    buildingType.includes("industrial") ||
    buildingType.includes("data_centre") ||
    buildingType.includes("datacentre")
  ) {
    return false;
  }
  if (buildingType === "office") return true;

  const at = (bundle.assetType || bundle.aggregate.assetType || "").toLowerCase();
  const bt = bundle.aggregate.segment?.toLowerCase() ?? "";
  if (
    at.includes("warehouse") ||
    at.includes("industrial") ||
    at.includes("data_centre") ||
    at.includes("datacentre")
  ) {
    return false;
  }
  return (
    at.includes("office") ||
    bt.includes("office") ||
    (bundle.officeHoldSnapshot?.officeGlaSqft ?? 0) > 0
  );
}

function isDataCentreBundle(bundle: FeasibilityProjectBundle): boolean {
  if (isSaleBundle(bundle)) return false;

  const buildingType = (bundle.buildingType ?? "").toLowerCase();
  if (
    buildingType === "data_centre" ||
    buildingType === "datacentre" ||
    buildingType === "data-centre" ||
    buildingType === "datacenter" ||
    buildingType.includes("data_centre") ||
    buildingType.includes("datacentre") ||
    buildingType.includes("data centre") ||
    buildingType.includes("data-centre") ||
    buildingType.includes("datacenter") ||
    buildingType.includes("data center")
  ) {
    return true;
  }

  // Also detect from metrics when buildingType is missing but DC model is populated
  if ((bundle.dataCentreMetrics?.itLoadMw ?? 0) > 0) {
    return true;
  }

  const at = (bundle.assetType || bundle.aggregate.assetType || "").toLowerCase();
  return (
    at.includes("data_centre") ||
    at.includes("datacentre") ||
    at.includes("data centre") ||
    at.includes("data-centre") ||
    at.includes("datacenter") ||
    at.includes("data center") ||
    at === "data centre"
  );
}

function isWarehouseBundle(bundle: FeasibilityProjectBundle): boolean {
  if (isSaleBundle(bundle)) return false;
  if (isDataCentreBundle(bundle)) return false;
  if (isHotelBundle(bundle)) return false;
  if (isMallBundle(bundle)) return false;
  if (isOfficeMixedUseBundle(bundle)) return false;
  if (isBTRBundle(bundle)) return false;

  const buildingType = (bundle.buildingType ?? "").toLowerCase();
  if (
    buildingType.includes("warehouse") ||
    buildingType.includes("industrial")
  ) {
    return true;
  }

  const at = (bundle.assetType || bundle.aggregate.assetType || "").toLowerCase();
  return at.includes("warehouse") || at.includes("industrial");
}

function buildWarehouseBenchmarkTitleLabel(
  warehouseSubType?: string,
  qualityGrade?: string
): string {
  const grade = qualityGrade ? qualityGrade.replace(/_/g, " ") : "Grade A";
  const type = warehouseSubType
    ? warehouseSubType.replace(/_/g, " ")
    : "Warehouse";
  return `${grade} ${type}`;
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
  // Data Centre before BTR/warehouse so leftover residential snapshots cannot steal the title
  const isDataCentre = !isSale && isDataCentreBundle(bundle);
  const isHotel = !isSale && !isDataCentre && isHotelBundle(bundle);
  const isBTR = !isSale && !isHotel && !isDataCentre && isBTRBundle(bundle);
  const isOffice =
    !isSale && !isHotel && !isBTR && !isDataCentre && isOfficeMixedUseBundle(bundle);
  const isMall =
    !isSale &&
    !isHotel &&
    !isBTR &&
    !isOffice &&
    !isDataCentre &&
    isMallBundle(bundle);
  const isWarehouse =
    !isSale &&
    !isHotel &&
    !isBTR &&
    !isOffice &&
    !isMall &&
    !isDataCentre &&
    isWarehouseBundle(bundle);
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
        : isDataCentre
          ? `${(bundle.dataCentreMetrics?.tierLevel ?? "Tier III").replace(/_/g, " ")} ${(bundle.dataCentreMetrics?.segment ?? "Colocation").replace(/_/g, " ")} Data Centre`
          : isBTR
            ? buildBTRBenchmarkTitleLabel(
                bundle.residentialPositioning,
                bundle.residentialSegment
              )
            : isWarehouse
              ? buildWarehouseBenchmarkTitleLabel(
                  bundle.warehouseMetrics?.warehouseSubType,
                  bundle.warehouseMetrics?.qualityGrade
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
          : isDataCentre
            ? "Data Centre"
            : isWarehouse
              ? "Warehouse & Industrial"
              : isHotel
                ? "Hotel"
                : formatAssetType(agg.assetType || "Warehouse & Industrial"),
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
    isWarehouse,
    warehouseGradeLabel: isWarehouse
      ? (bundle.warehouseMetrics?.qualityGrade ?? "Grade A").replace(/_/g, " ")
      : undefined,
    warehouseSegmentLabel: isWarehouse
      ? (bundle.warehouseMetrics?.warehouseSubType ?? "Warehouse").replace(
          /_/g,
          " "
        )
      : undefined,
    isDataCentre,
    dataCentreTierLabel: isDataCentre
      ? (bundle.dataCentreMetrics?.tierLevel ?? "Tier III").replace(/_/g, " ")
      : undefined,
    dataCentreSegmentLabel: isDataCentre
      ? (bundle.dataCentreMetrics?.segment ?? "Colocation").replace(/_/g, " ")
      : undefined,
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
