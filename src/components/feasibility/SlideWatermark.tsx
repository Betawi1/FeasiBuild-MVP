"use client";

import { createContext, useContext, type ReactNode } from "react";

const SlideWatermarkContext = createContext(false);

export function SlideWatermarkProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <SlideWatermarkContext.Provider value={enabled}>
      {children}
    </SlideWatermarkContext.Provider>
  );
}

export function useSlideWatermark(): boolean {
  return useContext(SlideWatermarkContext);
}

export default function SlideWatermark() {
  return (
    <>
      <div
        data-pdf-watermark
        className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
      >
        <span
          data-pdf-watermark-mark
          className="select-none whitespace-nowrap text-4xl font-bold uppercase tracking-[0.3em] text-slate-900/10"
          style={{ transform: "rotate(-24deg)" }}
        >
          FeasiBuild · Free Preview
        </span>
      </div>
      <div
        data-pdf-watermark
        data-pdf-watermark-footer
        className="pointer-events-none absolute inset-x-0 bottom-1.5 z-40 text-center text-[10px] font-medium text-slate-400"
      >
        Generated with FeasiBuild (Free tier) — upgrade to remove this watermark
      </div>
    </>
  );
}
