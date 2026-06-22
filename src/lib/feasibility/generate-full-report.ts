import type { FeasibilityProjectBundle, FeasibilitySlide } from "@/types/feasibility";
import { generateExecutiveSlides } from "@/lib/feasibility/generate-executive-slides";
import { generateFinancialSlides } from "@/lib/feasibility/generate-financial-slides";
import { generateMarketSlides } from "@/lib/feasibility/generate-market-slides";
import { generateTitleSlide } from "@/lib/feasibility/generate-title-slide";

/** Full deck: Title → A (Executive) → B (Project) → C (Market) → D (Financial). */
export function generateFullFeasibilitySlides(
  bundle: FeasibilityProjectBundle
): FeasibilitySlide[] {
  return [
    generateTitleSlide(bundle),
    ...generateExecutiveSlides(bundle),
    ...generateMarketSlides(bundle.aggregate),
    ...generateFinancialSlides(bundle),
  ];
}
