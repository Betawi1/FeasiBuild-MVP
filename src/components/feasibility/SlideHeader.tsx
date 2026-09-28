"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import InlineAutoGrow from "@/components/feasibility/InlineAutoGrow";

export interface SlidePagination {
  pageNumber: number | null;
  totalNumbered: number;
}

export const SlidePaginationContext = createContext<SlidePagination>({
  pageNumber: null,
  totalNumbered: 0,
});

export function SlidePaginationProvider({
  pageNumber,
  totalNumbered,
  children,
}: SlidePagination & { children: ReactNode }) {
  return (
    <SlidePaginationContext.Provider value={{ pageNumber, totalNumbered }}>
      {children}
    </SlidePaginationContext.Provider>
  );
}

export const SLIDE_TITLE_CLASS = "text-3xl font-bold text-slate-900 mb-2";
export const SLIDE_SUBTITLE_CLASS = "text-lg text-slate-500";

interface SlideHeaderProps {
  title: string;
  subtitle: string;
  className?: string;
  pageNumber?: number | null;
  totalNumbered?: number;
  /** Click-to-edit. Blur returns to the static title node. */
  onTitleChange?: (value: string) => void;
  onSubtitleChange?: (value: string) => void;
  /** Shown when `title` is empty and the field is not focused. */
  emptyTitleFallback?: string;
}

export default function SlideHeader({
  title,
  subtitle,
  className = "",
  pageNumber,
  totalNumbered,
  onTitleChange,
  onSubtitleChange,
  emptyTitleFallback,
}: SlideHeaderProps) {
  const pagination = useContext(SlidePaginationContext);
  const resolvedPage = pageNumber !== undefined ? pageNumber : pagination.pageNumber;
  const resolvedTotal =
    totalNumbered !== undefined ? totalNumbered : pagination.totalNumbered;
  const [titleFocused, setTitleFocused] = useState(false);
  const [subtitleFocused, setSubtitleFocused] = useState(false);

  const displayTitle =
    title.trim().length > 0 ? title : (emptyTitleFallback ?? title);
  const subtitleEmpty = subtitle.trim().length === 0;

  return (
    <div className={`mb-6 shrink-0 ${className}`.trim()}>
      {onTitleChange && titleFocused ? (
        <InlineAutoGrow
          value={title}
          onChange={onTitleChange}
          onBlur={() => setTitleFocused(false)}
          className={SLIDE_TITLE_CLASS}
          placeholder={emptyTitleFallback}
        />
      ) : (
        <h1
          className={SLIDE_TITLE_CLASS}
          onClick={
            onTitleChange
              ? () => {
                  setTitleFocused(true);
                }
              : undefined
          }
        >
          {displayTitle}
        </h1>
      )}
      <div className="mb-3 flex items-end justify-between gap-4">
        {onSubtitleChange && subtitleFocused ? (
          <InlineAutoGrow
            value={subtitle}
            onChange={onSubtitleChange}
            onBlur={() => setSubtitleFocused(false)}
            className={`${SLIDE_SUBTITLE_CLASS} min-w-0 flex-1`}
            placeholder="Subtitle"
          />
        ) : subtitleEmpty && onSubtitleChange ? (
          <p
            data-pdf-hide
            className="min-w-0 flex-1 text-lg text-slate-400"
            onClick={() => setSubtitleFocused(true)}
          >
            Subtitle
          </p>
        ) : subtitleEmpty && emptyTitleFallback ? (
          <span className="min-w-0 flex-1" />
        ) : (
          <p className={SLIDE_SUBTITLE_CLASS}>{subtitle}</p>
        )}
        {resolvedPage !== null && (
          <span className="shrink-0 text-sm font-medium text-slate-500">
            Page {resolvedPage} of {resolvedTotal}
          </span>
        )}
      </div>
      <div className="w-full h-0.5 bg-blue-600" />
    </div>
  );
}
