import { createContext, useContext, type ReactNode } from "react";

interface SlideContainerProps {
  children: ReactNode;
  id?: string;
  className?: string;
}

const SlideCaptureIdContext = createContext<string | undefined>(undefined);

/** Provides a capture id to nested SlideContainer instances (e.g. for PDF export). */
export function SlideCaptureProvider({
  captureId,
  children,
}: {
  captureId?: string;
  children: ReactNode;
}) {
  return (
    <SlideCaptureIdContext.Provider value={captureId}>
      {children}
    </SlideCaptureIdContext.Provider>
  );
}

/** Strict 16:9 presentation frame (1280×720). */
export default function SlideContainer({
  children,
  id,
  className = "",
}: SlideContainerProps) {
  const contextId = useContext(SlideCaptureIdContext);
  const resolvedId = id ?? contextId;

  return (
    <div
      id={resolvedId}
      className={`slide-container flex flex-col overflow-hidden rounded-lg bg-white shadow-2xl border border-slate-200 ${className}`}
      style={{
        width: "1280px",
        height: "720px",
        backgroundColor: "#ffffff",
        flexShrink: 0,
      }}
    >
      <div className="flex h-full w-full min-h-0 flex-col overflow-hidden p-12">
        {children}
      </div>
    </div>
  );
}
