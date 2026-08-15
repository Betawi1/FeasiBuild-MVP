import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getDocPath } from "@/lib/analyst-doc-routes";
import type { AnalystContextApiResponse } from "@/lib/analyst-doc-routes";
import {
  extractDocText,
  extractStepSection,
} from "@/lib/doc-text-extractor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOCS_ROOT = path.resolve(process.cwd(), "src/app/docs");
const ALLOWED_EXTENSIONS = new Set([".tsx", ".ts", ".mdx", ".md"]);

const MISSING_STEP_FALLBACK =
  "No documentation is mapped for this wizard step. Answer from FeasiBuild engine invariants only, and ask which Component (C1–C6) the user is on.";

const MISSING_FILE_FALLBACK = "No documentation found for this step.";

function resolveSafeDocPath(relativePath: string): string | null {
  const absolute = path.resolve(process.cwd(), relativePath);
  const relativeToDocs = path.relative(DOCS_ROOT, absolute);
  if (relativeToDocs.startsWith("..") || path.isAbsolute(relativeToDocs)) {
    return null;
  }
  if (!ALLOWED_EXTENSIONS.has(path.extname(absolute))) {
    return null;
  }
  return absolute;
}

function parseStepNumber(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
}

function stepNumberFromStepId(stepId: string): number | null {
  const match = stepId.trim().toLowerCase().match(/-s(\d+)$/);
  if (!match) return null;
  return parseStepNumber(match[1]);
}

function jsonBody(
  body: AnalystContextApiResponse,
  status = 200
): NextResponse<AnalystContextApiResponse> {
  return NextResponse.json(body, { status });
}

/**
 * GET /api/analyst-context?stepId=operational-c1-s3&stepNumber=3
 * Reads the live docs page from disk, strips it, and returns the matching
 * Step/Tab section when `stepNumber` is provided.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stepId = searchParams.get("stepId")?.trim() ?? "";
  const stepNumber =
    parseStepNumber(searchParams.get("stepNumber")) ??
    stepNumberFromStepId(stepId);

  if (!stepId) {
    return jsonBody(
      {
        success: false,
        content:
          "Missing required query parameter: stepId. Pass a wizard step identifier such as operational-c1-location.",
        stepId: "",
        stepNumber,
        sectionFound: false,
      },
      400
    );
  }

  const mappedPath = getDocPath(stepId);
  if (!mappedPath) {
    return jsonBody({
      success: false,
      content: MISSING_STEP_FALLBACK,
      stepId,
      stepNumber,
      sectionFound: false,
    });
  }

  const filePath = resolveSafeDocPath(mappedPath);
  if (!filePath) {
    return jsonBody({
      success: false,
      content: MISSING_FILE_FALLBACK,
      stepId,
      stepNumber,
      sectionFound: false,
    });
  }

  try {
    const raw = await readFile(filePath, "utf8");
    const cleanText = extractDocText(raw);
    if (!cleanText) {
      return jsonBody({
        success: false,
        content: MISSING_FILE_FALLBACK,
        stepId,
        stepNumber,
        sectionFound: false,
      });
    }

    let content = cleanText;
    let sectionFound = false;

    if (stepNumber != null) {
      let section = extractStepSection(cleanText, stepNumber);
      if (!section) {
        section = extractStepSection(raw, stepNumber);
      }
      if (section) {
        content = section;
        sectionFound = true;
      }
    }

    return jsonBody({
      success: true,
      content,
      stepId,
      stepNumber,
      sectionFound,
    });
  } catch {
    return jsonBody({
      success: false,
      content: MISSING_FILE_FALLBACK,
      stepId,
      stepNumber,
      sectionFound: false,
    });
  }
}
