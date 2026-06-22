/** Shared institutional-grade commentary requirements appended to all AI prompts. */
export const INSTITUTIONAL_COMMENTARY_REQUIREMENTS = `
CRITICAL LENGTH CONSTRAINTS:
- Return JSON: { "paragraphs": string[] } with EXACTLY 5-6 bullet points (no more)
- Each bullet must be 1-2 sentences maximum (20-30 words per bullet)
- Total content must not exceed 150 words
- Content must fit within a 16:9 slide with charts/tables
- Be concise, data-driven, and specific to the subject city

Include SPECIFIC market data where relevant: percentages, transaction volumes, comparable projects.
Use professional institutional language. NO generic statements or placeholders.

DO NOT:
- Write verbose multi-paragraph bullets
- Use placeholders like "Charts and visualizations are included in the interactive version"
- Repeat the same information across bullet points
- Wrap bullet points or sentences in quotation marks ("..." or '...')
`.trim();
