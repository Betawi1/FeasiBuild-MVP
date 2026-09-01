"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FIT_SLIDE_REMEASURE_EVENT } from "./fit-slide-events";

const SCALE_EPSILON = 0.002;
const CHART_SETTLE_MS = 300;
const CHART_SETTLE_MS_LATE = 1000;

interface FitSlideProps {
  children: ReactNode;
  className?: string;
}

/**
 * Scales slide body to fit a fixed 16:9 canvas. No scale floor — tall
 * content shrinks below 0.8 rather than clipping.
 */
export default function FitSlide({ children, className = "" }: FitSlideProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const measuringRef = useRef(false);
  const rafRef = useRef(0);
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    const content = contentRef.current;
    if (!canvas || !content || measuringRef.current) return;

    const canvasH = canvas.clientHeight;
    const canvasW = canvas.clientWidth;
    if (canvasH < 1 || canvasW < 1) return;

    measuringRef.current = true;

    // Natural size at identity so width: 100/scale% does not skew the reading.
    // Drop minHeight so flex-1 / overflow-hidden descendants don't clamp to the canvas.
    const prevTransform = content.style.transform;
    const prevWidth = content.style.width;
    const prevMinHeight = content.style.minHeight;
    content.style.transform = "scale(1)";
    content.style.width = "100%";
    content.style.minHeight = "0px";

    const contentH = Math.max(content.scrollHeight, content.offsetHeight, 1);
    const contentW = Math.max(content.scrollWidth, content.offsetWidth, 1);

    content.style.transform = prevTransform;
    content.style.width = prevWidth;
    content.style.minHeight = prevMinHeight;
    measuringRef.current = false;

    const next = Math.min(1, canvasH / contentH, canvasW / contentW);
    if (!Number.isFinite(next) || next <= 0) return;

    setScale((prev) => (Math.abs(prev - next) < SCALE_EPSILON ? prev : next));
    setReady(true);
  }, []);

  const scheduleMeasure = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      measure();
    });
  }, [measure]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const content = contentRef.current;
    if (!canvas || !content) return;

    measure();

    const resizeObserver = new ResizeObserver(() => {
      if (!measuringRef.current) scheduleMeasure();
    });
    resizeObserver.observe(canvas);
    resizeObserver.observe(content);

    const mutationObserver = new MutationObserver((mutations) => {
      const skip = mutations.every(
        (m) => m.type === "attributes" && m.target === content
      );
      if (!skip) scheduleMeasure();
    });
    mutationObserver.observe(content, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });

    const onResize = () => scheduleMeasure();
    window.addEventListener("resize", onResize);
    window.addEventListener(FIT_SLIDE_REMEASURE_EVENT, onResize);

    const t1 = window.setTimeout(scheduleMeasure, CHART_SETTLE_MS);
    const t2 = window.setTimeout(scheduleMeasure, CHART_SETTLE_MS_LATE);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener(FIT_SLIDE_REMEASURE_EVENT, onResize);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [measure, scheduleMeasure]);

  return (
    <div
      ref={canvasRef}
      data-fit-slide=""
      data-fit-ready={ready ? "true" : "false"}
      data-fit-scale={scale.toFixed(4)}
      className={`h-full w-full min-h-0 overflow-hidden ${className}`.trim()}
    >
      <div
        ref={contentRef}
        className="flex w-full shrink-0 flex-col"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `${100 / scale}%`,
          // Fill the canvas when content is short (title slide centering).
          // Leave auto when scaled so overflow-hidden children don't clip.
          minHeight: scale >= 1 - SCALE_EPSILON ? "100%" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
