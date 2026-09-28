"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import FitSlide from "./FitSlide";
import SlideWatermark, { useSlideWatermark } from "./SlideWatermark";

interface SlideContainerProps {
  children: ReactNode;
  id?: string;
  className?: string;
  /** Edit chrome rendered outside the scaled body. Hide with `data-pdf-hide`. */
  chrome?: ReactNode;
  remeasureKey?: string;
}

interface SlideFrame {
  captureId?: string;
  /** Stable generated slide id or custom slide id. Never an array index. */
  slideKey?: string;
}

const SlideFrameContext = createContext<SlideFrame>({});

/** Provides a capture id and stable slide key to nested SlideContainer instances. */
export function SlideCaptureProvider({
  captureId,
  slideKey,
  children,
}: {
  captureId?: string;
  slideKey?: string;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ captureId, slideKey }),
    [captureId, slideKey]
  );
  return (
    <SlideFrameContext.Provider value={value}>
      {children}
    </SlideFrameContext.Provider>
  );
}

/** Strict 16:9 presentation frame (1280×720). */
export default function SlideContainer({
  children,
  id,
  className = "",
  chrome,
  remeasureKey,
}: SlideContainerProps) {
  const frame = useContext(SlideFrameContext);
  const resolvedId = id ?? frame.captureId;
  const watermark = useSlideWatermark();

  return (
    <div
      id={resolvedId}
      className={`slide-container relative flex flex-col overflow-hidden rounded-lg bg-white shadow-2xl border border-slate-200 ${className}`}
      style={{
        width: "1280px",
        height: "720px",
        backgroundColor: "#ffffff",
        flexShrink: 0,
      }}
    >
      <FitSlide
        className="p-12"
        remeasureKey={remeasureKey}
        slideKey={frame.slideKey}
      >
        {children}
      </FitSlide>
      {chrome}
      {watermark && <SlideWatermark />}
    </div>
  );
}
