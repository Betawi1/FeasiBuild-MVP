export const FIT_SLIDE_REMEASURE_EVENT = "feasibuild:fit-slide-remeasure";

export interface FitSlideRemeasureDetail {
  done: () => void;
}

/**
 * Ask the mounted FitSlide to measure again.
 * Resolves after that measure is applied to the DOM (or shortly after, if none is mounted).
 */
export function requestFitSlideRemeasure(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    window.dispatchEvent(
      new CustomEvent<FitSlideRemeasureDetail>(FIT_SLIDE_REMEASURE_EVENT, {
        detail: { done: finish },
      })
    );
    window.setTimeout(finish, 500);
  });
}

/** Measure hook PDF export calls immediately before capture. */
export function remeasure(): Promise<void> {
  return requestFitSlideRemeasure();
}
