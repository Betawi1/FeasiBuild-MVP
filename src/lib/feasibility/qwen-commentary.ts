export const MIN_COMMENTARY_PARAGRAPHS = 5;
export const MAX_COMMENTARY_PARAGRAPHS = 6;

export interface QwenCommentaryOptions {
  minParagraphs?: number;
  temperature?: number;
  maxTokens?: number;
}

async function callQwenRaw(
  prompt: string,
  maxTokens = 2500
): Promise<string | null> {
  const url = process.env.FEASIBILITY_AI_URL;
  const apiKey = process.env.FEASIBILITY_AI_API_KEY;
  if (!url || !apiKey) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.FEASIBILITY_AI_MODEL ?? "qwen-plus",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function callQwen(
  prompt: string,
  maxTokens = 2500
): Promise<string[] | null> {
  const content = await callQwenRaw(prompt, maxTokens);
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { paragraphs?: unknown };
    if (!Array.isArray(parsed.paragraphs)) return null;
    const paragraphs = parsed.paragraphs
      .filter((p): p is string => typeof p === "string" && p.trim().length > 15)
      .slice(0, MAX_COMMENTARY_PARAGRAPHS);
    return paragraphs.length > 0 ? paragraphs : null;
  } catch {
    return null;
  }
}

/** Fetch arbitrary JSON from Qwen (charts, structured data, etc.). */
export async function fetchQwenJson<T>(
  prompt: string,
  maxTokens = 2000
): Promise<T | null> {
  const content = await callQwenRaw(
    `${prompt}\n\nReturn ONLY valid JSON. No markdown, no explanations.`,
    maxTokens
  );
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function buildRetryPrompt(originalPrompt: string, minParagraphs: number): string {
  return `
CRITICAL: Previous attempt generated insufficient content.

${originalPrompt}

MANDATORY RETRY REQUIREMENTS:
- Generate EXACTLY ${minParagraphs} concise bullet points (20-30 words each)
- Total content must not exceed 150 words
- Return JSON: { "paragraphs": string[] }
- NO placeholders, NO generic statements
`.trim();
}

/** Fetch AI commentary with validation and automatic retry for insufficient content. */
export async function fetchQwenParagraphs(
  prompt: string,
  options: QwenCommentaryOptions = {}
): Promise<string[] | null> {
  const minParagraphs = options.minParagraphs ?? MIN_COMMENTARY_PARAGRAPHS;
  const maxTokens = options.maxTokens ?? 2500;

  const first = await callQwen(prompt, maxTokens);
  if (first && first.length >= minParagraphs) return first;

  const retryPrompt = buildRetryPrompt(prompt, minParagraphs);
  const retry = await callQwen(retryPrompt, maxTokens + 500);
  if (retry && retry.length >= minParagraphs) return retry;

  if (retry && retry.length > 0) return retry;
  if (first && first.length > 0) return first;
  return null;
}
