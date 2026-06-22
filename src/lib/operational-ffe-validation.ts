import type { ResidentialFurnishingLevel } from "@/lib/benchmarks/residential-construction-costs";
import type { ProjectInfo } from "@/store/useFinModelStore";

export type FfeRange = { min: number; max: number; label?: string };

const OPERATIONAL_FFE_ASSET_LABEL: Record<string, string> = {
  hotel: "hotels",
  retail: "retail",
  residential: "residential",
  office: "office",
};

export function getOfficeFfeRange(
  segment?: string,
  coworkingDelivery?: string
): FfeRange {
  let min = 5;
  let max = 35;

  if (
    segment === "prime_tower" ||
    segment === "business_park" ||
    segment === "secondary"
  ) {
    min = 1;
    max = 10;
  } else if (segment === "co_working") {
    if (coworkingDelivery === "operator") {
      min = 1;
      max = 5;
    } else {
      min = 10;
      max = 25;
    }
  }

  return { min, max };
}

export function validateOfficeFfePercent(
  ffe: number,
  segment?: string,
  coworkingDelivery?: string
): string | null {
  const { min, max } = getOfficeFfeRange(segment, coworkingDelivery);
  const segmentLabel = segment?.replace(/_/g, " ") ?? "this office type";
  if (ffe < min) {
    return `FFE % must be at least ${min}% for ${segmentLabel}.`;
  }
  if (ffe > max) {
    return `FFE % cannot exceed ${max}% for ${segmentLabel}.`;
  }
  return null;
}

export function getOfficeFfeHint(
  segment?: string,
  coworkingDelivery?: string
): string {
  if (
    segment === "prime_tower" ||
    segment === "business_park" ||
    segment === "secondary"
  ) {
    return "FFE % for Core & Shell office is typically between 1% and 10% (Lobby, Mgmt Office, MEP).";
  }
  if (segment === "co_working" && coworkingDelivery === "operator") {
    return "FFE % for Operator Lease is typically between 1% and 5% (Minimal landlord fit-out).";
  }
  if (segment === "co_working") {
    return "FFE % for Plug & Play Co-Working is typically between 10% and 25% (Full furniture/tech).";
  }
  return "FFE % is typically between 5% and 35%.";
}

function getResidentialFfeRange(
  furnishingLevel?: ResidentialFurnishingLevel | string
): FfeRange {
  if (furnishingLevel === "fully_furnished") {
    return { min: 10, max: 18, label: "10-18% (fully furnished units)" };
  }
  if (furnishingLevel === "semi_furnished") {
    return { min: 6, max: 12, label: "6-12% (semi-furnished units)" };
  }
  return { min: 3, max: 8, label: "3-8% (unfurnished units)" };
}

export function getOperationalFfeRange(
  buildingType: string | undefined,
  projectInfo: Pick<
    ProjectInfo,
    "officeSegment" | "officeCoworkingDelivery" | "residentialFurnishingLevel"
  >
): FfeRange {
  switch (buildingType) {
    case "office":
      return getOfficeFfeRange(
        projectInfo.officeSegment,
        projectInfo.officeCoworkingDelivery
      );
    case "retail":
      return {
        min: 5,
        max: 15,
        label: "5-15% (common areas & tenant improvements)",
      };
    case "residential":
      return getResidentialFfeRange(projectInfo.residentialFurnishingLevel);
    case "hotel":
    default:
      return { min: 15, max: 35, label: "15-35% (fully furnished rooms)" };
  }
}

export function getOperationalFfeAssetLabel(buildingType?: string): string {
  return (
    OPERATIONAL_FFE_ASSET_LABEL[buildingType ?? "hotel"] ??
    buildingType ??
    "hotel"
  );
}

export function getOperationalFfeHint(
  buildingType: string | undefined,
  projectInfo: Pick<
    ProjectInfo,
    "officeSegment" | "officeCoworkingDelivery" | "residentialFurnishingLevel"
  >
): string {
  if (buildingType === "office") {
    return getOfficeFfeHint(
      projectInfo.officeSegment,
      projectInfo.officeCoworkingDelivery
    );
  }
  const range = getOperationalFfeRange(buildingType, projectInfo);
  const assetLabel = getOperationalFfeAssetLabel(buildingType);
  const suffix = range.label ? ` (${range.label})` : "";
  return `FFE % for ${assetLabel} is typically between ${range.min}% and ${range.max}% of CC incl. contingency${suffix}.`;
}

export function validateOperationalFfePercent(
  ffe: number,
  buildingType: string | undefined,
  projectInfo: Pick<
    ProjectInfo,
    "officeSegment" | "officeCoworkingDelivery" | "residentialFurnishingLevel"
  >
): string | null {
  if (buildingType === "office") {
    return validateOfficeFfePercent(
      ffe,
      projectInfo.officeSegment,
      projectInfo.officeCoworkingDelivery
    );
  }
  const range = getOperationalFfeRange(buildingType, projectInfo);
  const assetLabel = getOperationalFfeAssetLabel(buildingType);
  if (ffe < range.min || ffe > range.max) {
    return `FFE % must be between ${range.min}% and ${range.max}% for ${assetLabel}.`;
  }
  return null;
}

export function isOperationalFfeOutsideRange(
  ffe: number,
  buildingType: string | undefined,
  projectInfo: Pick<
    ProjectInfo,
    "officeSegment" | "officeCoworkingDelivery" | "residentialFurnishingLevel"
  >
): boolean {
  const range = getOperationalFfeRange(buildingType, projectInfo);
  return ffe < range.min || ffe > range.max;
}
