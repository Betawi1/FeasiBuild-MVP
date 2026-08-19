"use client";

import { createContext, useContext, type ReactNode } from "react";

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

interface SlideHeaderProps {
  title: string;
  subtitle: string;
  className?: string;
  pageNumber?: number | null;
  totalNumbered?: number;
}

export default function SlideHeader({
  title,
  subtitle,
  className = "",
  pageNumber,
  totalNumbered,
}: SlideHeaderProps) {
  const pagination = useContext(SlidePaginationContext);
  const resolvedPage = pageNumber !== undefined ? pageNumber : pagination.pageNumber;
  const resolvedTotal =
    totalNumbered !== undefined ? totalNumbered : pagination.totalNumbered;

  return (
    <div className={`mb-6 shrink-0 ${className}`.trim()}>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
      <div className="mb-3 flex items-end justify-between gap-4">
        <p className="text-lg text-slate-500">{subtitle}</p>
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
