import type {
  FeasibilitySlide,
  ImplicationsData,
  RiskFactorsData,
  SuccessFactorsData,
} from "@/types/feasibility";
import { cleanDisplayText } from "@/lib/feasibility/clean-ai-content";

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

/** Split "Label: body" (or Effect/Mitigation) into structured table fields. */
function extractLabelAndBody(
  text: string,
  fallbackLabel: string
): { label: string; body: string } {
  const cleaned = cleanDisplayText(text);
  if (!cleaned) return { label: fallbackLabel, body: "" };

  const labeled = cleaned.match(
    /^(?:Effect|Mitigation|Mitigating factors?)?\s*([^:]{3,90}?)\s*:\s*(.+)$/i
  );
  if (labeled) {
    const rawLabel = labeled[1].trim();
    // Prefer real factor titles over "Effect"/"Mitigation" alone
    if (!/^(effect|mitigation|mitigating factors?)$/i.test(rawLabel)) {
      return { label: rawLabel, body: labeled[2].trim() };
    }
  }

  const colonIdx = cleaned.indexOf(":");
  if (colonIdx > 3 && colonIdx < 90) {
    return {
      label: cleaned.slice(0, colonIdx).trim(),
      body: cleaned.slice(colonIdx + 1).trim(),
    };
  }

  const firstSentence = cleaned.match(/^(.{12,90}?)(?:\.\s+|$)/)?.[1];
  if (
    firstSentence &&
    firstSentence.length < cleaned.length * 0.55 &&
    cleaned.length > firstSentence.length + 20
  ) {
    const rest = cleaned.slice(firstSentence.length).replace(/^\.\s*/, "").trim();
    return {
      label: firstSentence.replace(/\.$/, "").trim(),
      body: rest || cleaned,
    };
  }

  return { label: fallbackLabel, body: cleaned };
}

function parseEffectAndMitigations(body: string): {
  effect: string;
  mitigatingFactors: string[];
} {
  const cleaned = cleanDisplayText(body);
  const mitMatch = cleaned.match(
    /(?:Mitigation|Mitigating factors?)\s*:\s*(.+)$/i
  );
  const effectPart = cleaned
    .replace(/(?:Mitigation|Mitigating factors?)\s*:.+$/i, "")
    .replace(/^Effect\s*:\s*/i, "")
    .trim();

  const mitigatingFactors = mitMatch
    ? mitMatch[1]
        .split(/[;•|]|(?:,\s*(?=[A-Z]))/)
        .map((s) => s.trim())
        .filter((s) => s.length > 3)
        .slice(0, 4)
    : ["Phased launch", "Stress-tested underwriting"];

  return {
    effect: effectPart || cleaned,
    mitigatingFactors:
      mitigatingFactors.length > 0
        ? mitigatingFactors
        : ["Phased launch", "Stress-tested underwriting"],
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

  const marketFallbacks = [
    "Sustained demand catalyst",
    "Sub-market competitive gap",
  ];
  const projectFallbacks = [
    "Product & brand positioning",
    "Operating & delivery advantage",
  ];

  return {
    marketOpportunities: market.slice(0, 3).map((text, i) => {
      const { label, body } = extractLabelAndBody(
        text,
        marketFallbacks[i] ?? `Market opportunity ${i + 1}`
      );
      return { factor: label, effect: body || text };
    }),
    projectStrengths: project.slice(0, 3).map((text, i) => {
      const { label, body } = extractLabelAndBody(
        text,
        projectFallbacks[i] ?? `Project strength ${i + 1}`
      );
      return { strength: label, effect: body || text };
    }),
    mainOutcomes: paragraphs.map((p) => cleanDisplayText(p)).filter(Boolean),
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

  const marketFallbacks = [
    "Competing supply pressure",
    "Demand / rate cyclicality",
  ];
  const projectFallbacks = [
    "Delivery & cost overrun risk",
    "Stabilization / ramp-up risk",
  ];

  return {
    marketThreats: market.slice(0, 3).map((text, i) => {
      const { label, body } = extractLabelAndBody(
        text,
        marketFallbacks[i] ?? `Market threat ${i + 1}`
      );
      const { effect, mitigatingFactors } = parseEffectAndMitigations(body || text);
      return { risk: label, effect, mitigatingFactors };
    }),
    projectWeaknesses: project.slice(0, 3).map((text, i) => {
      const { label, body } = extractLabelAndBody(
        text,
        projectFallbacks[i] ?? `Project weakness ${i + 1}`
      );
      const { effect, mitigatingFactors } = parseEffectAndMitigations(body || text);
      return { weakness: label, effect, mitigatingFactors };
    }),
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
