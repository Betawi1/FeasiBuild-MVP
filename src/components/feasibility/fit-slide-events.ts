export const FIT_SLIDE_REMEASURE_EVENT = "feasibuild:fit-slide-remeasure";

export function requestFitSlideRemeasure(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FIT_SLIDE_REMEASURE_EVENT));
}
