"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

export type ReactiveChartHeight = "h-56" | "h-64" | "h-72";

interface ReactiveChartProps {
  /** Chart series. Empty/missing data reserves height and skips mount. */
  data: unknown[] | undefined | null;
  height?: ReactiveChartHeight;
  className?: string;
  /** Recharts chart element (BarChart / LineChart / PieChart). */
  children: ReactElement;
}

type ChartSize = { width: number; height: number };

/**
 * Data-reactive Recharts host.
 * Charts that mount before AI series arrive stay blank; remounting on data
 * arrival (and a fixed-height box) makes first generation paint immediately.
 *
 * ResponsiveContainer's default initial size is -1×-1, which warns on every
 * mount. Init waits until the host is on screen and has a real box, then
 * passes that box as initialDimension. Leaving the viewport unmounts the
 * chart so its canvas is released.
 */
export default function ReactiveChart({
  data,
  height = "h-64",
  className = "",
  children,
}: ReactiveChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize | null>(null);
  const hasData = Array.isArray(data) && data.length > 0;

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    let width = 0;
    let heightPx = 0;
    let visible = typeof IntersectionObserver === "undefined";
    let disposed = false;

    const publish = () => {
      if (disposed) return;
      if (visible && width > 0 && heightPx > 0) {
        setSize((prev) =>
          prev && prev.width === width && prev.height === heightPx
            ? prev
            : { width, height: heightPx }
        );
        return;
      }
      setSize(null);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      width = Math.round(entry.contentRect.width);
      heightPx = Math.round(entry.contentRect.height);
      publish();
    });
    resizeObserver.observe(el);

    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver((entries) => {
        visible = Boolean(entries[0]?.isIntersecting);
        publish();
      });
      intersectionObserver.observe(el);
    }

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
    };
  }, []);

  return (
    <div ref={hostRef} className={`w-full shrink-0 ${height} ${className}`}>
      {hasData && size ? (
        <ResponsiveContainer
          key={JSON.stringify(data)}
          width="100%"
          height="100%"
          initialDimension={{ width: size.width, height: size.height }}
        >
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
