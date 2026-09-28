"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  FIT_SLIDE_REMEASURE_EVENT,
  type FitSlideRemeasureDetail,
} from "./fit-slide-events";
import { computeFitScale, contentBoxSize } from "./fit-slide-scale";

const SCALE_EPSILON = 0.002;
const ROOT_OVERFLOW_PX = 2;
const INNER_OVERFLOW_PX = 4;
const CLIP_OVERFLOW = new Set(["auto", "scroll", "hidden"]);
const CHART_OR_MAP =
  ".recharts-wrapper, .recharts-responsive-container, .leaflet-container";

interface FitSlideProps {
  children: ReactNode;
  className?: string;
  /** Changes force a fresh measure (textarea values do not mutate the DOM). */
  remeasureKey?: string;
  /** Stable slide id. Logged when the body is scaled. */
  slideKey?: string;
}

function readSize(el: HTMLElement): { h: number; w: number } {
  return {
    h: Math.max(el.scrollHeight, el.offsetHeight, 1),
    w: Math.max(el.scrollWidth, el.offsetWidth, 1),
  };
}

function overflows(
  size: { h: number; w: number },
  box: { width: number; height: number }
): boolean {
  return (
    size.h > box.height + ROOT_OVERFLOW_PX ||
    size.w > box.width + ROOT_OVERFLOW_PX
  );
}

/** True when a nested scroll/clip box hides content from the outer scrollHeight. */
function hasClippedOverflow(root: HTMLElement): boolean {
  const nodes = root.querySelectorAll<HTMLElement>("*");
  for (const el of nodes) {
    if (el.closest(CHART_OR_MAP)) continue;
    if (el.querySelector(CHART_OR_MAP)) continue;
    const style = getComputedStyle(el);
    const clipsY = CLIP_OVERFLOW.has(style.overflowY);
    const clipsX = CLIP_OVERFLOW.has(style.overflowX);
    if (clipsY && el.scrollHeight > el.clientHeight + INNER_OVERFLOW_PX) return true;
    if (clipsX && el.scrollWidth > el.clientWidth + INNER_OVERFLOW_PX) return true;
  }
  return false;
}

function restoreProp(
  el: HTMLElement,
  prop: string,
  value: string,
  priority: string
): void {
  if (value) el.style.setProperty(prop, value, priority);
  else el.style.removeProperty(prop);
}

/** Freeze stretchy chart/map hosts so unconstrained layout does not collapse them. */
function pinChartHosts(root: HTMLElement): () => void {
  const restores: Array<() => void> = [];
  const charts = root.querySelectorAll<HTMLElement>(CHART_OR_MAP);
  for (const chart of charts) {
    let host: HTMLElement | null = chart.parentElement;
    while (host && host !== root) {
      const cls = typeof host.className === "string" ? host.className : "";
      if (/\bh-(?:56|64|72)\b|\bh-\[/.test(cls)) break;
      if (/\bh-full\b|\bflex-1\b|\bflex-auto\b|\bmin-h-0\b/.test(cls)) {
        const h = host.offsetHeight;
        if (h >= 8) {
          const prevHeight = host.style.getPropertyValue("height");
          const prevHeightPriority = host.style.getPropertyPriority("height");
          const prevMin = host.style.getPropertyValue("min-height");
          const prevMinPriority = host.style.getPropertyPriority("min-height");
          host.style.setProperty("height", `${h}px`, "important");
          host.style.setProperty("min-height", `${h}px`, "important");
          const pinned = host;
          restores.push(() => {
            restoreProp(pinned, "height", prevHeight, prevHeightPriority);
            restoreProp(pinned, "min-height", prevMin, prevMinPriority);
          });
        }
        break;
      }
      host = host.parentElement;
    }
  }
  return () => {
    for (let i = restores.length - 1; i >= 0; i--) restores[i]!();
  };
}

/**
 * Scales slide body to fit a fixed 16:9 canvas.
 * Measurement stays live (resize, mutations, fonts, load) and has no scale floor.
 */
export default function FitSlide({
  children,
  className = "",
  remeasureKey = "",
  slideKey = "",
}: FitSlideProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const measuringRef = useRef(false);
  const ignoreObserversRef = useRef(0);
  const dirtyRef = useRef(false);
  const rafRef = useRef(0);
  const pinRestoreRef = useRef<(() => void) | null>(null);
  const pendingDoneRef = useRef<Array<() => void>>([]);
  const logRef = useRef("");
  const lastSigRef = useRef("");
  const measureChangedRef = useRef(false);
  const scheduleRef = useRef<(done?: () => void) => void>(() => {});
  const [scale, setScale] = useState(1);
  const [unconstrained, setUnconstrained] = useState(false);
  const [ready, setReady] = useState(false);

  const restorePins = useCallback(() => {
    pinRestoreRef.current?.();
    pinRestoreRef.current = null;
  }, []);

  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    const content = contentRef.current;
    if (!canvas || !content || measuringRef.current) return;

    measuringRef.current = true;
    ignoreObserversRef.current += 1;

    try {
      const style = getComputedStyle(canvas);
      const box = contentBoxSize(
        canvas.clientWidth,
        canvas.clientHeight,
        Number.parseFloat(style.paddingTop) || 0,
        Number.parseFloat(style.paddingRight) || 0,
        Number.parseFloat(style.paddingBottom) || 0,
        Number.parseFloat(style.paddingLeft) || 0
      );
      if (box.height < 1 || box.width < 1) return;

      const applyMeasureBox = () => {
        content.style.transform = "none";
        content.style.width = `${box.width}px`;
        content.style.minHeight = "0px";
        content.style.height = "auto";
        content.style.maxHeight = "none";
      };

      restorePins();
      content.removeAttribute("data-fit-unconstrained");
      applyMeasureBox();

      const clamped = readSize(content);
      const clipped = hasClippedOverflow(content);
      let body = clamped;
      let useLoose = false;

      if (overflows(clamped, box) || clipped) {
        pinRestoreRef.current = pinChartHosts(content);
        content.setAttribute("data-fit-unconstrained", "true");
        applyMeasureBox();
        const loose = readSize(content);
        const looseReveals =
          overflows(loose, box) ||
          loose.h > clamped.h + ROOT_OVERFLOW_PX ||
          loose.w > clamped.w + ROOT_OVERFLOW_PX;
        if (looseReveals) {
          body = loose;
          useLoose = true;
        } else {
          content.removeAttribute("data-fit-unconstrained");
          restorePins();
          applyMeasureBox();
          body = readSize(content);
        }
      }

      let next = computeFitScale(box.height, box.width, body.h, body.w);
      if (next < 1 - SCALE_EPSILON) {
        content.style.width = `${box.width / next}px`;
        const refined = readSize(content);
        const refinedScale = computeFitScale(
          box.height,
          box.width,
          refined.h,
          refined.w
        );
        next = Math.min(next, refinedScale);
        body = refined;
      }

      const fitted = next < 1 - SCALE_EPSILON;
      if (!fitted) next = 1;
      const sig = `${slideKey}|${next.toFixed(4)}|${Math.round(body.h)}|${Math.round(body.w)}|${useLoose ? 1 : 0}`;
      measureChangedRef.current = sig !== lastSigRef.current;
      lastSigRef.current = sig;

      if (useLoose) {
        content.setAttribute("data-fit-unconstrained", "true");
      } else {
        content.removeAttribute("data-fit-unconstrained");
        restorePins();
      }

      content.style.transform = `scale(${next})`;
      content.style.transformOrigin = "top left";
      content.style.width = `${100 / next}%`;
      content.style.minHeight = fitted ? "0px" : "100%";
      content.style.height = "";
      content.style.maxHeight = "";

      if (process.env.NODE_ENV === "development" && fitted) {
        const signature = `${slideKey}|${Math.round(body.h)}|${Math.round(box.height)}|${next.toFixed(3)}`;
        if (logRef.current !== signature) {
          logRef.current = signature;
          console.info(
            `[FitSlide] ${slideKey || "(unknown)"} bodyH=${Math.round(body.h)} canvasH=${Math.round(box.height)} scale=${next.toFixed(3)}`
          );
        }
      }

      canvas.setAttribute("data-fit-ready", "true");
      canvas.setAttribute("data-fit-scale", next.toFixed(4));
      if (slideKey) canvas.setAttribute("data-slide-key", slideKey);

      setScale((prev) => (Math.abs(prev - next) < SCALE_EPSILON ? prev : next));
      setUnconstrained(useLoose);
      setReady(true);
    } finally {
      measuringRef.current = false;
      requestAnimationFrame(() => {
        ignoreObserversRef.current = Math.max(0, ignoreObserversRef.current - 1);
        if (
          dirtyRef.current &&
          ignoreObserversRef.current === 0 &&
          measureChangedRef.current
        ) {
          dirtyRef.current = false;
          measureChangedRef.current = false;
          scheduleRef.current();
        } else if (ignoreObserversRef.current === 0) {
          dirtyRef.current = false;
        }
      });
    }
  }, [restorePins, slideKey]);

  const scheduleMeasure = useCallback((done?: () => void) => {
    if (done) pendingDoneRef.current.push(done);
    if (ignoreObserversRef.current > 0) {
      dirtyRef.current = true;
      return;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      measure();
      const callbacks = pendingDoneRef.current.splice(0);
      for (const callback of callbacks) callback();
    });
  }, [measure]);

  scheduleRef.current = scheduleMeasure;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const content = contentRef.current;
    if (!canvas || !content) return;

    measure();
    const initialDone = pendingDoneRef.current.splice(0);
    for (const callback of initialDone) callback();

    const onObserve = () => {
      if (ignoreObserversRef.current > 0) {
        dirtyRef.current = true;
        return;
      }
      scheduleMeasure();
    };

    const resizeObserver = new ResizeObserver(onObserve);
    resizeObserver.observe(canvas);
    resizeObserver.observe(content);

    const mutationObserver = new MutationObserver(onObserve);
    mutationObserver.observe(content, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    const onRemeasure = (event: Event) => {
      const done = (event as CustomEvent<FitSlideRemeasureDetail>).detail?.done;
      canvas.setAttribute("data-fit-ready", "false");
      setReady(false);
      scheduleMeasure(done);
    };
    window.addEventListener("resize", onObserve);
    window.addEventListener(FIT_SLIDE_REMEASURE_EVENT, onRemeasure);

    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) scheduleMeasure();
    });
    const onLoad = () => scheduleMeasure();
    if (document.readyState !== "complete") {
      window.addEventListener("load", onLoad);
    }

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", onObserve);
      window.removeEventListener(FIT_SLIDE_REMEASURE_EVENT, onRemeasure);
      window.removeEventListener("load", onLoad);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      restorePins();
    };
  }, [measure, scheduleMeasure, remeasureKey, slideKey, restorePins]);

  return (
    <div
      ref={canvasRef}
      data-fit-slide=""
      data-fit-ready={ready ? "true" : "false"}
      data-fit-scale={scale.toFixed(4)}
      data-slide-key={slideKey || undefined}
      className={`h-full w-full min-h-0 overflow-hidden ${className}`.trim()}
    >
      <div
        ref={contentRef}
        data-fit-unconstrained={unconstrained ? "true" : undefined}
        className="flex w-full shrink-0 flex-col"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `${100 / scale}%`,
          // Fill the canvas when content is short (title slide centering).
          minHeight: scale >= 1 - SCALE_EPSILON ? "100%" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
