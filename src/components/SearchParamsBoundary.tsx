"use client";

import { Suspense, type ReactNode } from "react";

export function SearchParamsFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <div className="text-slate-400">Loading...</div>
    </div>
  );
}

export default function SearchParamsBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return <Suspense fallback={<SearchParamsFallback />}>{children}</Suspense>;
}
