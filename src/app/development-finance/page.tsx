"use client";

/**
 * `/development-finance` uses the same wizard as `/financing`.
 *
 * Recharts for the funding gap is loaded client-only (dynamic import, `ssr: false`)
 * in `./FundingGapAreaChart.tsx` to avoid Next.js App Router SSR issues.
 *
 * Step 0 column balance: chart area uses `h-80` in `FundingGapAreaChartImpl.tsx` /
 * `FundingGapAreaChart.tsx` loading state.
 *
 * Layout: main wizard is full width — the old `lg:grid-cols-3` + empty third column
 * (legacy DSCR sidebar) was removed in `financing/page.tsx`.
 */
export { default } from "../financing/page";
