import type {
  FeasibilitySlide,
  ImplicationsData,
  RiskFactorsData,
  SuccessFactorsData,
} from "@/types/feasibility";

/** Map AI-generated paragraphs into implications slide structured data. */
export function applyImplicationsParagraphs(
  data: ImplicationsData,
  paragraphs: string[]
): ImplicationsData {
  if (paragraphs.length < 3) return data;

  const titles = [
    "Market fundamentals",
    "Supply-demand dynamics",
    "Pricing & GDV validation",
    "Buyer profile & velocity",
    "Regulatory environment",
    "Infrastructure catalysts",
    "Competitive positioning",
    "Investment outlook",
  ];

  return {
    hospitalityImplications: paragraphs.map((description, i) => ({
      number: i + 1,
      title: titles[i] ?? `Key implication ${i + 1}`,
      description,
    })),
    keyTakeaways: paragraphs.slice(0, 3),
  };
}

export function applySuccessFactorsParagraphs(
  data: SuccessFactorsData,
  paragraphs: string[]
): SuccessFactorsData {
  if (paragraphs.length < 4) return data;

  const half = Math.ceil(paragraphs.length / 2);
  const market = paragraphs.slice(0, half);
  const project = paragraphs.slice(half);

  return {
    marketOpportunities: market.slice(0, 2).map((effect, i) => ({
      factor: ["Market opportunity", "Demand catalyst"][i] ?? `Opportunity ${i + 1}`,
      effect,
    })),
    projectStrengths: project.slice(0, 2).map((effect, i) => ({
      strength: ["Project strength", "Execution advantage"][i] ?? `Strength ${i + 1}`,
      effect,
    })),
    mainOutcomes: paragraphs,
  };
}

export function applyRiskFactorsParagraphs(
  data: RiskFactorsData,
  paragraphs: string[]
): RiskFactorsData {
  if (paragraphs.length < 4) return data;

  const half = Math.ceil(paragraphs.length / 2);
  const market = paragraphs.slice(0, half);
  const project = paragraphs.slice(half);

  return {
    marketThreats: market.slice(0, 2).map((effect, i) => ({
      risk: ["Market threat", "External risk"][i] ?? `Risk ${i + 1}`,
      effect,
      mitigatingFactors: ["Phased launch", "Stress-tested underwriting"],
    })),
    projectWeaknesses: project.slice(0, 2).map((effect, i) => ({
      weakness: ["Project weakness", "Execution risk"][i] ?? `Weakness ${i + 1}`,
      effect,
      mitigatingFactors: ["Contingency reserve", "Active monitoring"],
    })),
  };
}

/** Sync structured slide data fields with enriched AI paragraphs. */
export function enrichStructuredSlideData(
  slides: FeasibilitySlide[]
): FeasibilitySlide[] {
  return slides.map((slide) => {
    if (!slide.paragraphs?.length || !slide.data) return slide;

    if (
      slide.id === "sale-implications" ||
      slide.id === "hosp-implications" ||
      slide.id === "mall-implications" ||
      slide.id === "office-implications" ||
      slide.id === "btr-implications"
    ) {
      return {
        ...slide,
        data: applyImplicationsParagraphs(
          slide.data as ImplicationsData,
          slide.paragraphs
        ),
      };
    }

    if (
      slide.id === "sale-success-factors" ||
      slide.id === "hosp-success-factors" ||
      slide.id === "mall-success-factors" ||
      slide.id === "office-success-factors" ||
      slide.id === "btr-success-factors"
    ) {
      return {
        ...slide,
        data: applySuccessFactorsParagraphs(
          slide.data as SuccessFactorsData,
          slide.paragraphs
        ),
      };
    }

    if (
      slide.id === "sale-risk-factors" ||
      slide.id === "hosp-risk-factors" ||
      slide.id === "mall-risk-factors" ||
      slide.id === "office-risk-factors" ||
      slide.id === "btr-risk-factors"
    ) {
      return {
        ...slide,
        data: applyRiskFactorsParagraphs(
          slide.data as RiskFactorsData,
          slide.paragraphs
        ),
      };
    }

    return slide;
  });
}
