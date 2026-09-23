"use client";

import { useFeasibilityStore } from "@/store/useFeasibilityStore";

export function useAiEnrichmentUi() {
  const aiSections = useFeasibilityStore((s) => s.aiSections);
  const dismissed = useFeasibilityStore((s) => s.aiBannerDismissed);
  const entries = Object.entries(aiSections);
  const total = entries.length;
  const pending = entries.filter(([, row]) => row.status === "pending").length;
  const done = total - pending;
  const unavailableIds = entries
    .filter(([, row]) => row.status === "fallback" || row.status === "failed")
    .map(([id]) => id);

  return {
    total,
    pending,
    done,
    unavailable: unavailableIds.length,
    unavailableIds,
    showProgress: pending > 0,
    showBanner: pending === 0 && unavailableIds.length > 0 && !dismissed,
    exportBlocked: pending > 0,
  };
}

/** Editor chrome only. `data-pdf-hide` keeps it out of the exported PDF. */
export default function AiEnrichmentStatus({
  onRetry,
}: {
  onRetry: (slideIds: string[]) => void;
}) {
  const ui = useAiEnrichmentUi();
  const dismiss = useFeasibilityStore((s) => s.dismissAiBanner);
  if (ui.total === 0) return null;

  return (
    <div data-pdf-hide data-ai-progress={`${ui.done}/${ui.total}`}>
      {ui.showProgress && (
        <p className="mt-1 text-sm text-amber-300">
          Completing AI sections… {ui.done}/{ui.total}
        </p>
      )}
      {ui.showBanner && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          <span>
            {ui.unavailable} AI section{ui.unavailable === 1 ? "" : "s"}{" "}
            unavailable —{" "}
            <button
              type="button"
              className="underline decoration-amber-200/80 underline-offset-2 hover:text-white"
              onClick={() => onRetry(ui.unavailableIds)}
            >
              Retry missing sections
            </button>
          </span>
          <button
            type="button"
            aria-label="Dismiss"
            className="px-1 text-base leading-none text-amber-200 hover:text-white"
            onClick={dismiss}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
