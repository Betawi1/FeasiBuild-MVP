"use client";

import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import {
  generateBTRSlidesWithPuter,
  BTR_AI_SLIDE_SECTIONS,
} from "@/lib/feasibility/generate-btr-report";
import {
  generateHotelSlidesWithPuter,
  HOTEL_AI_SLIDE_SECTIONS,
} from "@/lib/feasibility/generate-hotel-report";
import {
  generateShoppingMallSlidesWithPuter,
  MALL_AI_SLIDE_SECTIONS,
} from "@/lib/feasibility/generate-shopping-mall-report";
import {
  generateOfficeSlidesWithPuter,
  OFFICE_AI_SLIDE_SECTIONS,
} from "@/lib/feasibility/generate-office-report";

export type OperationalAssetType = "hotel" | "mall" | "office" | "btr";

export interface EnrichOperationalSlidesOptions {
  oldHashes?: Record<string, string>;
  forceRegenerate?: boolean;
  assetType: OperationalAssetType;
}

export interface EnrichOperationalSlidesResult {
  slides: FeasibilitySlide[];
  hashes: Record<string, string>;
}

export {
  HOTEL_AI_SLIDE_SECTIONS,
  MALL_AI_SLIDE_SECTIONS,
  OFFICE_AI_SLIDE_SECTIONS,
  BTR_AI_SLIDE_SECTIONS,
};

export function resolveOperationalAssetType(
  buildingType: string,
  assetType?: string
): OperationalAssetType {
  const bt = buildingType.toLowerCase();
  const at = (assetType ?? "").toLowerCase();
  if (bt === "hotel" || at.includes("hotel")) return "hotel";
  if (bt === "office" || at.includes("office")) return "office";
  if (
    bt === "retail" ||
    at.includes("retail") ||
    at.includes("mall") ||
    at.includes("shopping")
  ) {
    return "mall";
  }
  if (
    bt === "residential" ||
    at.includes("residential") ||
    at.includes("btr")
  ) {
    return "btr";
  }
  return "hotel";
}

/**
 * Client-side: enrich operational slides with Puter.js AI commentary.
 * Delegates to asset-specific generators that use localStorage caching.
 */
export async function enrichOperationalSlidesWithPuter(
  bundle: FeasibilityProjectBundle,
  options: EnrichOperationalSlidesOptions
): Promise<EnrichOperationalSlidesResult> {
  const { forceRegenerate = false, assetType, oldHashes = {} } = options;
  const cacheOpts = { forceRegenerate, oldHashes };

  switch (assetType) {
    case "mall":
      return generateShoppingMallSlidesWithPuter(bundle, cacheOpts);
    case "office":
      return generateOfficeSlidesWithPuter(bundle, cacheOpts);
    case "btr":
      return generateBTRSlidesWithPuter(bundle, cacheOpts);
    default:
      return generateHotelSlidesWithPuter(bundle, cacheOpts);
  }
}

export async function generateOperationalSlidesWithPuter(
  bundle: FeasibilityProjectBundle,
  buildingType: string,
  options: Omit<EnrichOperationalSlidesOptions, "assetType"> = {}
): Promise<EnrichOperationalSlidesResult> {
  const assetType = resolveOperationalAssetType(
    buildingType,
    bundle.assetType
  );
  return enrichOperationalSlidesWithPuter(bundle, {
    ...options,
    assetType,
  });
}
