export type PnlCommentaryPayload = {
  years: string[];
  revenues: number[];
  ebitda: number[];
  depreciation: number[];
  netIncome: number[];
};

export type PnlCommentaryMetrics = {
  year1Margin: number;
  stabilizedMargin: number;
  maxGrowthYear: number;
  maxGrowthPct: number;
  maxGrowthYearLabel: string;
};

function marginPct(ebitda: number, revenue: number): number {
  if (!revenue) return 0;
  return Math.round((ebitda / revenue) * 1000) / 10;
}

export function analyzePnlMetrics(
  pnlData: PnlCommentaryPayload
): PnlCommentaryMetrics {
  const y1Rev = pnlData.revenues[0] ?? 0;
  const y3Rev = pnlData.revenues[2] ?? pnlData.revenues[pnlData.revenues.length - 1] ?? 0;
  const y1Ebitda = pnlData.ebitda[0] ?? 0;
  const y3Ebitda = pnlData.ebitda[2] ?? pnlData.ebitda[pnlData.ebitda.length - 1] ?? 0;

  let maxGrowthYear = 1;
  let maxGrowthPct = 0;
  for (let i = 1; i < pnlData.netIncome.length; i++) {
    const prev = pnlData.netIncome[i - 1] ?? 0;
    const curr = pnlData.netIncome[i] ?? 0;
    if (prev === 0) continue;
    const growth = ((curr - prev) / Math.abs(prev)) * 100;
    if (growth > maxGrowthPct) {
      maxGrowthPct = growth;
      maxGrowthYear = i;
    }
  }

  return {
    year1Margin: marginPct(y1Ebitda, y1Rev),
    stabilizedMargin: marginPct(y3Ebitda, y3Rev),
    maxGrowthYear,
    maxGrowthPct: Math.round(maxGrowthPct),
    maxGrowthYearLabel: pnlData.years[maxGrowthYear] ?? `Year ${maxGrowthYear + 1}`,
  };
}

function assetTerminology(assetType: string): {
  revenueDrivers: string;
  depreciationDrivers: string;
} {
  const t = assetType.toLowerCase();
  if (t.includes("retail") || t.includes("mall")) {
    return {
      revenueDrivers: "lease rates and occupancy",
      depreciationDrivers: "tenant fit-out and building depreciation",
    };
  }
  if (t.includes("office")) {
    return {
      revenueDrivers: "rental rates and lease expiries",
      depreciationDrivers: "building shell and tenant improvement amortisation",
    };
  }
  if (t.includes("residential") || t.includes("btr")) {
    return {
      revenueDrivers: "rental yields and occupancy",
      depreciationDrivers: "property and fit-out depreciation",
    };
  }
  return {
    revenueDrivers: "ADR and occupancy",
    depreciationDrivers: "initial FF&E and construction depreciation",
  };
}

export function buildPnlCommentaryPrompt(
  assetType: string,
  pnlData: PnlCommentaryPayload
): string {
  const m = analyzePnlMetrics(pnlData);
  return `
You are a senior real estate financial analyst. Write a professional, 1-paragraph commentary for an Operational Profit & Loss slide.

ASSET TYPE: ${assetType}

FINANCIAL DATA HIGHLIGHTS:
- Year 1 EBITDA Margin: ${m.year1Margin}%
- Stabilized (Year 3) EBITDA Margin: ${m.stabilizedMargin}%
- Largest Net Income spike occurred in ${m.maxGrowthYearLabel} with a ${m.maxGrowthPct}% increase.

CRITICAL RULES:
1. DO NOT use placeholders.
2. Adapt terminology to the ASSET TYPE.
   - Hotel: ADR, occupancy, FF&E depreciation.
   - Shopping Mall / Retail: lease rates, occupancy, tenant fit-out depreciation.
   - Office: rental rates, lease expiries, building depreciation.
   - Residential BTR: rental yields, occupancy, property depreciation.
3. Explain EBITDA margin stabilization from Year 1 to Year 3.
4. Explain the largest Net Income spike year (often depreciation schedule effects).
5. Exactly 3-4 sentences. Institutional tone.

OUTPUT: JSON { "commentary": string } — single paragraph only.
`.trim();
}

export function generatePnlCommentaryFallback(
  assetType: string,
  pnlData: PnlCommentaryPayload
): string {
  const m = analyzePnlMetrics(pnlData);
  const terms = assetTerminology(assetType);

  if (!pnlData.revenues.some((v) => v > 0)) {
    return `Operational P&L commentary will populate once ${assetType} revenue and expense assumptions are synced from Component 2.`;
  }

  return `The ${assetType} demonstrates operational leverage, with EBITDA margins moving from ${m.year1Margin}% in Year 1 to a stabilized ${m.stabilizedMargin}% by Year 3 as ${terms.revenueDrivers} mature. The ${m.maxGrowthPct}% increase in net income in ${m.maxGrowthYearLabel} aligns with the tapering of ${terms.depreciationDrivers}, reducing non-cash charges in that period. Post-stabilization, the asset is projected to deliver consistent operating cash generation that supports overall project return metrics.`;
}
