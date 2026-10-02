"use client";

import { clearContentCache } from "@/lib/feasibility/clean-ai-content";

/** In-memory chart pins. One live object per slide; regenerating drops the previous. */
const MAX_RETAINED_CHARTS = 100;

type MemoryStats = {
  slidesEnriched: number;
  puterCalls: number;
  cacheHits: number;
  cacheMisses: number;
  attempts: Record<number, number>;
};

const retainedCharts = new Map<string, unknown>();
const slidesSeen = new Set<string>();

let stats: MemoryStats = emptyStats();

function emptyStats(): MemoryStats {
  return {
    slidesEnriched: 0,
    puterCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    attempts: { 1: 0, 2: 0, 3: 0 },
  };
}

function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** Node heap when available (dev server); Chrome heap when enrichment runs in the browser. */
export function heapUsedMb(): number {
  if (typeof process !== "undefined" && typeof process.memoryUsage === "function") {
    return process.memoryUsage().heapUsed / 1024 / 1024;
  }
  const browserHeap = (
    globalThis.performance as Performance & { memory?: { usedJSHeapSize?: number } } | undefined
  )?.memory?.usedJSHeapSize;
  if (typeof browserHeap === "number") return browserHeap / 1024 / 1024;
  return 0;
}

export function releaseGeneratedCharts(): void {
  retainedCharts.clear();
}

/**
 * Drop the previous chart object for this slide before pinning the replacement.
 * Null releases the pin without storing a new chart. Capped at 100 slides.
 */
export function retainGeneratedChart(slideKey: string, chart: unknown): void {
  retainedCharts.delete(slideKey);
  if (chart == null) return;
  while (retainedCharts.size >= MAX_RETAINED_CHARTS) {
    const oldest = retainedCharts.keys().next().value;
    if (oldest === undefined) break;
    retainedCharts.delete(oldest);
  }
  retainedCharts.set(slideKey, chart);
}

export function beginEnrichmentMemoryRun(): void {
  stats = emptyStats();
  slidesSeen.clear();
  releaseGeneratedCharts();
  clearContentCache();
  if (!isDev()) return;
  console.log(
    `[Enrichment memory] start heapUsed=${heapUsedMb().toFixed(1)} MB`
  );
}

export function logSlideHeap(slideKey: string): void {
  if (!slidesSeen.has(slideKey)) {
    slidesSeen.add(slideKey);
    stats.slidesEnriched += 1;
  }
  if (!isDev()) return;
  console.log(
    `[Enrichment memory] slide=${slideKey} heapUsed=${heapUsedMb().toFixed(1)} MB`
  );
}

export function notePuterCall(): void {
  stats.puterCalls += 1;
}

export function noteCacheHit(): void {
  stats.cacheHits += 1;
}

export function noteCacheMiss(): void {
  stats.cacheMisses += 1;
}

export function noteEnrichmentAttempt(attempt: number): void {
  stats.attempts[attempt] = (stats.attempts[attempt] ?? 0) + 1;
}

export function finishEnrichmentMemoryRun(): void {
  releaseGeneratedCharts();
  clearContentCache();
  if (!isDev()) return;
  console.log(
    `[Enrichment memory] complete heapUsed=${heapUsedMb().toFixed(1)} MB slides=${stats.slidesEnriched} puterCalls=${stats.puterCalls} cacheHits=${stats.cacheHits} cacheMisses=${stats.cacheMisses} attempts=${JSON.stringify(stats.attempts)}`
  );
}
