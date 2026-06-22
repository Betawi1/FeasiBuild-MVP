import { NextResponse } from "next/server";
import {
  analyzePnlMetrics,
  buildPnlCommentaryPrompt,
  generatePnlCommentaryFallback,
  type PnlCommentaryPayload,
} from "@/lib/feasibility/generate-pnl-commentary";

function isValidPayload(body: unknown): body is {
  assetType: string;
  pnlData: PnlCommentaryPayload;
} {
  if (!body || typeof body !== "object") return false;
  const b = body as { assetType?: unknown; pnlData?: unknown };
  if (typeof b.assetType !== "string" || !b.pnlData || typeof b.pnlData !== "object") {
    return false;
  }
  const p = b.pnlData as PnlCommentaryPayload;
  return (
    Array.isArray(p.years) &&
    Array.isArray(p.revenues) &&
    Array.isArray(p.ebitda) &&
    Array.isArray(p.depreciation) &&
    Array.isArray(p.netIncome)
  );
}

async function tryQwenPnlCommentary(prompt: string): Promise<string | null> {
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
    return typeof parsed.commentary === "string" ? parsed.commentary.trim() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isValidPayload(body)) {
      return NextResponse.json(
        { error: "Invalid assetType or pnlData" },
        { status: 400 }
      );
    }

    const { assetType, pnlData } = body;
    const prompt = buildPnlCommentaryPrompt(assetType, pnlData);
    const aiCommentary = await tryQwenPnlCommentary(prompt);
    const commentary =
      aiCommentary ?? generatePnlCommentaryFallback(assetType, pnlData);
    const metrics = analyzePnlMetrics(pnlData);

    return NextResponse.json({ commentary, metrics, source: aiCommentary ? "ai" : "fallback" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
