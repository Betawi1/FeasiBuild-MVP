import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { generateExecutiveSlides } from "@/lib/feasibility/generate-executive-slides";
import { generateFinancialSlides } from "@/lib/feasibility/generate-financial-slides";
import { generateMarketSlides } from "@/lib/feasibility/generate-market-slides";
import { generateTitleSlide } from "@/lib/feasibility/generate-title-slide";
import { generateProjectLocationSlide } from "@/lib/feasibility/generate-project-location-slide";

/** Full deck: Title → A (Executive) → Project Location → C (Market) → D (Financial). */
export function generateFullFeasibilitySlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  return [
    generateTitleSlide(bundle),
    ...generateExecutiveSlides(bundle),
    generateProjectLocationSlide(bundle),
    ...generateMarketSlides(bundle.aggregate),
    ...generateFinancialSlides(bundle),
  ];
}
