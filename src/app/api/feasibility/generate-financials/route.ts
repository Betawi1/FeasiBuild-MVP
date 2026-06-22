import { NextResponse } from "next/server";
import type {
  FeasibilityProjectBundle,
  FinancialSlideType,
} from "@/types/feasibility";
import {
  generateFinancialCommentary,
  generateIrrFinancingMetricsCommentary,
} from "@/lib/feasibility/generate-financial-commentary";
import { buildIrrFinancingMetricsAiPrompt } from "@/lib/feasibility/build-irr-financing-metrics-data";

const SLIDE_TYPES: FinancialSlideType[] = [
  "Development Assumptions",
  "Hotel Development Schedule",
  "Term Loan",
  "IRR and Key Financing Metrics",
];

function isValidBundle(data: unknown): data is FeasibilityProjectBundle {
  if (!data || typeof data !== "object") return false;
  const d = data as FeasibilityProjectBundle;
  return (
    d.component4 != null &&
    typeof d.component4.tdc === "number" &&
    d.location != null
  );
}

async function tryQwenCommentary(
  prompt: string,
  mode: "paragraphs" | "commentary" = "paragraphs"
): Promise<string[] | string | null> {
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
    const parsed = JSON.parse(content) as {
      paragraphs?: unknown;
      commentary?: unknown;
    };
    if (mode === "commentary") {
      return typeof parsed.commentary === "string" ? parsed.commentary : null;
    }
    if (!Array.isArray(parsed.paragraphs)) return null;
    return parsed.paragraphs.filter((p) => typeof p === "string") as string[];
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectData?: unknown;
      slideType?: FinancialSlideType;
    };

    if (!isValidBundle(body.projectData)) {
      return NextResponse.json(
        { error: "Invalid projectData bundle" },
        { status: 400 }
      );
    }

    const project = body.projectData;
    const slideType =
      body.slideType && SLIDE_TYPES.includes(body.slideType)
        ? body.slideType
        : "Development Assumptions";

    const c1 = project.component1;
    const c2 = project.component2;
    const c4 = project.component4;

    if (slideType === "IRR and Key Financing Metrics") {
      const dscrFromSlide = project.irrAndFinancingMetrics?.minDscr;
      const dscrFromPref = project.preferenceSharesExitStrategy?.dscrByYear
        ?.map((row) => row.dscr)
        .filter((d) => d > 0);
      const resolvedMinDscr =
        dscrFromSlide ??
        (dscrFromPref?.length ? Math.min(...dscrFromPref) : 1.2);

      const metrics = {
        projectIrr: c4.projectIRR,
        equityIrr: c4.equityIRR,
        equityMultiple: c4.equityMultiple,
        paybackPeriod: c4.paybackPeriod,
        minDscr: resolvedMinDscr,
      };

      const prompt = buildIrrFinancingMetricsAiPrompt(project, metrics);

      const aiCommentary = await tryQwenCommentary(prompt, "commentary");
      const commentary =
        typeof aiCommentary === "string"
          ? aiCommentary
          : generateIrrFinancingMetricsCommentary(metrics);

      return NextResponse.json({
        commentary,
        slideType,
        metrics,
      });
    }

    const prompt = `
You are a senior real estate financial analyst. Write institutional-grade commentary for a Feasibility Study slide.

PROJECT DATA:
- Asset: ${project.assetType} (${project.segment}) in ${project.location.city}, ${project.location.country}
- TDC: ${c4.tdc} ${project.currency}
- Project IRR: ${c4.projectIRR}%
- Equity IRR: ${c4.equityIRR}%
- Construction Period: ${c1.constructionPeriod} months
- Building rate: ${c1.buildingRate}/sqft | Parking rate: ${c1.parkingRate}/sqft
- Stabilized ADR: ${c2.adrStabilized} | Occupancy: ${c2.occupancyStabilized}%
- Payback: ${c4.paybackPeriod} years
- IDC treatment: ${c4.idcTreatment} | Loan at completion: ${c4.loanAtCompletion}

SLIDE TYPE: ${slideType}

REQUIREMENTS:
1. Development Assumptions: Compare building and parking rates to market benchmarks; note variances.
2. Cash Flow: Highlight payback (${c4.paybackPeriod} years) and cumulative NCF trend (no discount factor).
3. Term Loan: Explain IDC treatment impact on loan at completion.

OUTPUT: JSON { "paragraphs": string[] } with 2-3 professional paragraphs. NO PLACEHOLDERS.
`;

    const aiParagraphs = await tryQwenCommentary(prompt);
    const paragraphs =
      aiParagraphs ?? generateFinancialCommentary(project, slideType);

    return NextResponse.json({ paragraphs, slideType });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
