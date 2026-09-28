/**
 * scale = min(1, canvasH/bodyH, canvasW/bodyW).
 * No minimum floor — a floor such as 0.8 leaves residual overflow.
 * Values at and below 0.5 are kept when the body is that much taller than the canvas.
 */
export function computeFitScale(
  canvasH: number,
  canvasW: number,
  bodyH: number,
  bodyW: number
): number {
  if (canvasH < 1 || canvasW < 1 || bodyH < 1 || bodyW < 1) return 1;
  const next = Math.min(1, canvasH / bodyH, canvasW / bodyW);
  if (!Number.isFinite(next) || next <= 0) return 1;
  return next;
}

/** clientWidth/clientHeight include padding; children lay out in the content box. */
export function contentBoxSize(
  clientWidth: number,
  clientHeight: number,
  paddingTop: number,
  paddingRight: number,
  paddingBottom: number,
  paddingLeft: number
): { width: number; height: number } {
  return {
    width: Math.max(0, clientWidth - paddingLeft - paddingRight),
    height: Math.max(0, clientHeight - paddingTop - paddingBottom),
  };
}
