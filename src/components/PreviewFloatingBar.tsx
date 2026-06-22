"use client";

import Link from "next/link";

export type PreviewFloatingBarProps = {
  /** Used when `onPreviousClick` is not set (link navigation). */
  previousRoute?: string;
  /** Used when `onNextClick` is not set (link navigation). */
  nextRoute?: string;
  /** Wizard / custom navigation — renders a button instead of a link. */
  onPreviousClick?: () => void;
  onNextClick?: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onDownload?: () => void;
  /** Optional primary action (e.g., "Calculate") instead of Download. */
  onCalculate?: () => void;
  isCalculating?: boolean;
  calculateLabel?: string;
  showPrevious?: boolean;
  showNext?: boolean;
  /** Hide the center Download button (e.g. on edit / input pages). Default: show. */
  showDownload?: boolean;
  /** Override the next-route link label. Default: `Next →`. */
  nextLabel?: string;
  /** Optional: link after Download (e.g. restart wizard at step 1). */
  restartRoute?: string;
  restartLabel?: string;
  /** Optional feasibility study action (link or button). */
  showFeasibilityStudy?: boolean;
  feasibilityStudyLabel?: string;
  feasibilityStudyTitle?: string;
  feasibilityStudyRoute?: string;
  onFeasibilityStudyClick?: () => void;
};

const secondaryBtn =
  "rounded-lg bg-slate-700 px-4 py-2 text-center text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600 disabled:pointer-events-none disabled:opacity-40";
const primaryBtn =
  "rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-40";

export default function PreviewFloatingBar({
  previousRoute,
  nextRoute,
  onPreviousClick,
  onNextClick,
  previousDisabled = false,
  nextDisabled = false,
  onDownload,
  onCalculate,
  isCalculating = false,
  calculateLabel = "Calculate",
  showPrevious = true,
  showNext = true,
  showDownload = true,
  nextLabel = "Next →",
  restartRoute,
  restartLabel = "Restart",
  showFeasibilityStudy = false,
  feasibilityStudyLabel = "Feasibility Study",
  feasibilityStudyTitle = "Coming Soon!",
  feasibilityStudyRoute,
  onFeasibilityStudyClick,
}: PreviewFloatingBarProps) {
  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 rounded-xl border border-slate-700/50 bg-slate-800/90 px-4 py-4 shadow-[0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-md md:bottom-6 md:left-1/2 md:right-auto md:w-auto md:-translate-x-1/2 md:flex-row md:gap-4 md:px-6 md:py-3"
      style={{
        background: "rgba(30, 41, 59, 0.9)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(71, 85, 105, 0.5)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      }}
    >
      {showPrevious &&
        (onPreviousClick ? (
          <button
            type="button"
            disabled={previousDisabled}
            onClick={onPreviousClick}
            className={secondaryBtn}
          >
            ← Previous
          </button>
        ) : previousRoute ? (
          <Link href={previousRoute} className={secondaryBtn}>
            ← Previous
          </Link>
        ) : null)}
      {showDownload && (onCalculate || onDownload) ? (
        <button
          type="button"
          onClick={(onCalculate ?? onDownload) ?? (() => {})}
          disabled={!!onCalculate && isCalculating}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          {onCalculate ? calculateLabel : "Download"}
        </button>
      ) : null}
      {restartRoute ? (
        <Link href={restartRoute} className={secondaryBtn}>
          {restartLabel}
        </Link>
      ) : null}
      {showFeasibilityStudy ? (
        onFeasibilityStudyClick ? (
          <button
            type="button"
            onClick={onFeasibilityStudyClick}
            title={feasibilityStudyTitle}
            className={secondaryBtn}
          >
            {feasibilityStudyLabel}
          </button>
        ) : feasibilityStudyRoute ? (
          <Link
            href={feasibilityStudyRoute}
            title={feasibilityStudyTitle}
            className={secondaryBtn}
          >
            {feasibilityStudyLabel}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title={feasibilityStudyTitle}
            className={`${secondaryBtn} cursor-not-allowed opacity-60`}
          >
            {feasibilityStudyLabel}
          </button>
        )
      ) : null}
      {showNext &&
        (onNextClick ? (
          <button
            type="button"
            disabled={nextDisabled}
            onClick={onNextClick}
            className={primaryBtn}
          >
            {nextLabel}
          </button>
        ) : nextRoute ? (
          <Link href={nextRoute} className={primaryBtn}>
            {nextLabel}
          </Link>
        ) : null)}
    </div>
  );
}
