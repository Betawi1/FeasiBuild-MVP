import type { ContentQualityOptions } from "@/lib/feasibility/commentary-quality";

const MACRO_SECTION_LABELS: Record<string, string> = {
  "Macro - GDP": "GDP",
  "Macro - Inflation": "Inflation",
  "Macro - Population": "Population",
  "Macro - Macro Summary": "Macro Summary",
};

const MARKET_SECTION_PREFIXES = [
  "Market -",
  "Market Summary",
  "Market Implications",
  "Success Factors",
  "Risk Factors",
];

export function resolveQualityMeta(
  section: string,
  country: string,
  city: string
): ContentQualityOptions | undefined {
  const macroLabel = MACRO_SECTION_LABELS[section];
  if (macroLabel) {
    return {
      country,
      section: macroLabel,
      minParagraphs: 5,
      minWords: macroLabel === "Macro Summary" ? 250 : 200,
      minCountryMentions: 2,
    };
  }

  const isMarket = MARKET_SECTION_PREFIXES.some(
    (p) => section === p || section.startsWith(p)
  );
  if (isMarket) {
    return {
      country,
      section,
      minParagraphs: 5,
      minWords: 250,
      minCountryMentions: 2,
    };
  }

  return undefined;
}
