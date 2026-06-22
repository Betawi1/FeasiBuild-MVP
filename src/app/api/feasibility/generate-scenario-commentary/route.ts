import { NextResponse } from "next/server";
import {
  buildScenarioCommentaryAiPrompt,
  generateScenarioAnalysisCommentary,
} from "@/lib/feasibility/generate-scenario-commentary";
import type { ScenarioAnalysisCase } from "@/types/feasibility";

type RequestBody = {
  assetType?: string;
  location?: { city: string; country: string };
  currency?: string;
  scenarios?: ScenarioAnalysisCase[];
};

async function tryQwenCommentary(prompt: string): Promise<string | null> {
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
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as { commentary?: unknown };
    return typeof parsed.commentary === "string" ? parsed.commentary : null;
  } catch {
    return null;
  }
}

function isValidBody(body: unknown): body is Required<RequestBody> {
  if (!body || typeof body !== "object") return false;
  const b = body as RequestBody;
  return (
    typeof b.assetType === "string" &&
    b.location != null &&
    typeof b.location.city === "string" &&
    typeof b.location.country === "string" &&
    Array.isArray(b.scenarios) &&
    b.scenarios.length > 0
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!isValidBody(body)) {
      return NextResponse.json(
        { error: "Invalid request: assetType, location, and scenarios required" },
        { status: 400 }
      );
    }

    const input = {
      assetType: body.assetType,
      location: body.location,
      currency: body.currency ?? "AED",
      scenarios: body.scenarios,
    };

    const prompt = buildScenarioCommentaryAiPrompt(input);
    const aiCommentary = await tryQwenCommentary(prompt);
    const commentary =
      aiCommentary ?? generateScenarioAnalysisCommentary(input);

    return NextResponse.json({ commentary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
