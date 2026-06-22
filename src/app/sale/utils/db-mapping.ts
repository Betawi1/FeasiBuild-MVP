// /app/sale/utils/db-mapping.ts — bridge store ProjectInfo ↔ recommendation DB keys

import type { BuildingRecommendations } from "@/app/sale/data/recommendations";
import {
  getRecommendations,
  type SaleRecommendationBuildingType,
} from "@/app/sale/data/recommendations";

/**
 * Converts store buildingSubType (underscores) to DB key (hyphens)
 * Store: "residential_landed" → DB: "residential-landed"
 */
export function mapBuildingSubTypeToDBKey(
  buildingSubType: string | null | undefined,
): string | null {
  if (!buildingSubType) return null;

  const mapping: Record<string, string> = {
    residential_landed: "residential-landed",
    residential_high_rise: "residential-hi-rise",
    commercial_landed: "commercial-landed",
    commercial_strata_office: "commercial-strata-office",
  };

  return mapping[buildingSubType] ?? null;
}

/**
 * Converts store towerFloors to height range key for DB lookup
 * Matches the getHeightRangeKey logic in recommendations.ts
 */
export function getHeightRangeKeyFromTowerFloors(
  towerFloors: number | null | undefined,
): string | null {
  if (towerFloors == null || towerFloors < 5) return null;

  if (towerFloors <= 8) return "G+5-G+8";
  if (towerFloors <= 16) return "G+9-G+16";
  if (towerFloors <= 24) return "G+17-G+24";
  if (towerFloors <= 32) return "G+25-G+32";
  if (towerFloors <= 50) return "G+33-G+50";
  return "G+51+";
}

/**
 * Helper to get full recommendation query params from store ProjectInfo
 */
export interface RecommendationQueryParams {
  countryCode: string;
  buildingTypeDB: string; // hyphenated key for DB
  heightRange?: string; // only for hi-rise/strata
}

export function buildRecommendationQuery(
  countryCode: string | null | undefined,
  buildingSubType: string | null | undefined,
  towerFloors?: number | null,
): RecommendationQueryParams | null {
  if (!countryCode || !buildingSubType) return null;

  const buildingTypeDB = mapBuildingSubTypeToDBKey(buildingSubType);
  if (!buildingTypeDB) return null;

  // Only hi-rise and strata office need height range
  const needsHeightRange =
    buildingTypeDB === "residential-hi-rise" ||
    buildingTypeDB === "commercial-strata-office";

  if (needsHeightRange && towerFloors) {
    const heightRange = getHeightRangeKeyFromTowerFloors(towerFloors);
    if (!heightRange) return null;
    return { countryCode, buildingTypeDB, heightRange };
  }

  // Landed types don't need height range
  return { countryCode, buildingTypeDB };
}

/**
 * Resolves the recommendation row using query params from ProjectInfo.
 * Passes height range as a string when present so lookups match DB keys exactly.
 */
export function getBuildingRecommendationsFromQuery(
  params: RecommendationQueryParams | null
): BuildingRecommendations | null {
  if (!params) return null;
  const bt = params.buildingTypeDB as SaleRecommendationBuildingType;
  if (params.heightRange) {
    return getRecommendations(params.countryCode, bt, params.heightRange);
  }
  return getRecommendations(params.countryCode, bt);
}

if (process.env.NODE_ENV === "development") {
  console.log("🔗 [Sale DB Mapping] Helpers loaded");
}
