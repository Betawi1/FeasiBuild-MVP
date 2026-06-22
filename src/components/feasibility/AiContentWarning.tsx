"use client";

export function hasAiContentWarning(paragraphs: string[]): boolean {
  return paragraphs.some((p) => p.includes("⚠️"));
}

export function AiContentWarningBanner({
  paragraphs,
}: {
  paragraphs: string[];
}) {
  if (!hasAiContentWarning(paragraphs)) return null;

  return (
    <div className="mb-4 border-l-4 border-yellow-400 bg-yellow-50 p-3">
      <p className="text-sm text-yellow-800">
        ⚠️ <strong>Warning:</strong> Some content may need refinement. Click
        &quot;Regenerate&quot; or &quot;Edit Content&quot; to improve.
      </p>
    </div>
  );
}

export function aiParagraphClassName(text: string): string {
  return text.includes("⚠️")
    ? "text-sm leading-relaxed text-yellow-700 italic"
    : "text-sm leading-relaxed text-slate-700";
}
