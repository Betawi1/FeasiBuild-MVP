export const TEMPLATE_PHRASES = [
  "charts and visualizations are included",
  "resilient growth",
  "key sectors",
  "strong fundamentals",
  "supportive investment",
  "well-located",
  "institutional capital",
  "expanding at a cagr",
  "non-oil sector diversification",
  "45,000–65,000",
  "45,000-65,000",
  "median age 32–35",
  "median age 32-35",
  "construction cost inflation averaged 4–6%",
  "construction cost inflation averaged 4-6%",
  "wage growth of 3–5%",
  "wage growth of 3-5%",
  "each 1% gdp growth historically translates",
  "golden visa, long-term residency",
  "synchronized tailwinds",
  "constructive investment window",
];

export interface ContentQualityOptions {
  country: string;
  section: string;
  minParagraphs?: number;
  minWords?: number;
  minCountryMentions?: number;
}

export function validateContentQuality(
  content: string[],
  options: ContentQualityOptions
): boolean {
  if (!content.length) return false;

  const fullText = content.join(" ").toLowerCase();
  const minParagraphs = options.minParagraphs ?? 5;
  const minWords = options.minWords ?? 80;
  const minCountryMentions = options.minCountryMentions ?? 2;

  const violations = TEMPLATE_PHRASES.filter((phrase) =>
    fullText.includes(phrase)
  );
  if (violations.length > 0) {
    console.warn(
      `Template language detected in ${options.country} - ${options.section}:`,
      violations
    );
    return false;
  }

  const countryLower = options.country.toLowerCase();
  const countryMentions = (
    fullText.match(new RegExp(countryLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []
  ).length;
  if (countryMentions < minCountryMentions) {
    console.warn(
      `Insufficient country-specific content in ${options.country} - ${options.section} (${countryMentions} mentions)`
    );
    return false;
  }

  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  if (content.length < minParagraphs || wordCount < minWords) {
    console.warn(
      `Insufficient length in ${options.country} - ${options.section} (${content.length} paragraphs, ${wordCount} words)`
    );
    return false;
  }

  return true;
}

export function buildAntiTemplateRetryPrompt(
  country: string,
  city: string,
  section: string,
  assetType: string
): string {
  return `
CRITICAL: Previous attempt generated insufficient or templated content for ${section} in ${country}.

You MUST generate EXACTLY 5-6 concise bullet points (20-30 words each, max 150 words total) that are:
- UNIQUE to ${country} and ${city} (no generic statements)
- Include SPECIFIC numbers, policies, and initiatives where relevant
- Relevant to ${assetType} development in ${city}

Return JSON: { "paragraphs": string[] }

DO NOT use phrases like:
- "Charts and visualizations are included"
- "Resilient growth" without quantification
- "Key sectors" without naming them
- "45,000-65,000 households" or other generic ranges copied across countries
- Generic statements that could apply to any country

Generate content that could ONLY be about ${country}.
`.trim();
}
