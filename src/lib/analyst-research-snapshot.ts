import type { AiResearchResult } from "@/lib/constants/aiPrompts";

/** Hard cap for the Analyst research snapshot (~2,000 characters). */
export const RESEARCH_SNAPSHOT_MAX_CHARS = 2000;

/** Section header injected when stored `reasoning_notes` are present. */
export const ORIGINAL_RESEARCH_REASONING_HEADER =
  "ORIGINAL RESEARCH REASONING (stored verbatim):";

/** After core numbers (0), before hints (1) — preserved first when truncating. */
const GROUP_REASONING_NOTES = 0.5;

type SnapshotLine = {
  text: string;
  /** Lower = more important; later groups are dropped first when over cap. */
  group: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 1 : abs >= 10 ? 2 : 4;
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function formatScalar(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  const num = finiteNumber(value);
  if (num != null) return formatNumber(num);
  if (typeof value === "boolean") return value ? "yes" : "no";
  return null;
}

function pushLine(
  lines: SnapshotLine[],
  group: number,
  label: string,
  value: unknown
): void {
  const formatted = formatScalar(value);
  if (formatted == null) return;
  lines.push({ group, text: `- ${label}: ${formatted}` });
}

function pushRange(
  lines: SnapshotLine[],
  group: number,
  label: string,
  range: unknown
): void {
  const rec = asRecord(range);
  if (!rec) return;
  const min = finiteNumber(rec.min);
  const max = finiteNumber(rec.max);
  const recommended = finiteNumber(rec.recommended);
  const parts: string[] = [];
  if (recommended != null) parts.push(`recommended ${formatNumber(recommended)}`);
  if (min != null || max != null) {
    parts.push(
      `range ${min != null ? formatNumber(min) : "?"}–${max != null ? formatNumber(max) : "?"}`
    );
  }
  if (parts.length === 0) return;
  lines.push({ group, text: `- ${label}: ${parts.join("; ")}` });
}

const CONSTRUCTION_RATE_LABELS: Record<string, string> = {
  building_rate_psf: "Building rate (psf)",
  parking_rate_psf: "Parking rate (psf)",
  basement_rate_psf: "Basement rate (psf)",
  infrastructure_rate_psf: "Infrastructure rate (psf)",
  site_yard_rate_psf: "Site/yard rate (psf)",
  common_infrastructure_rate_psf: "Common infrastructure rate (psf)",
  dock_door_cost_per_unit: "Dock door cost / unit",
  drive_in_door_cost_per_unit: "Drive-in door cost / unit",
  car_parking_cost_per_space: "Car parking cost / space",
  trailer_parking_cost_per_space: "Trailer parking cost / space",
  racking_shelving_cost_per_unit: "Racking/shelving cost / unit",
  refrigeration_cost_per_unit: "Refrigeration cost / unit",
  automation_conveyors_cost_per_unit: "Automation/conveyors cost / unit",
  professional_fees_percent: "Professional fees %",
};

function extractC1(c1: Record<string, unknown>, lines: SnapshotLine[]): void {
  const rates = asRecord(c1.construction_rates);
  if (rates) {
    for (const [key, label] of Object.entries(CONSTRUCTION_RATE_LABELS)) {
      pushLine(lines, 0, label, rates[key]);
    }
    for (const [key, value] of Object.entries(rates)) {
      if (key in CONSTRUCTION_RATE_LABELS) continue;
      const formatted = formatScalar(value);
      if (formatted == null) continue;
      lines.push({
        group: 3,
        text: `- Construction rate (${key.replace(/_/g, " ")}): ${formatted}`,
      });
    }
  }

  pushLine(lines, 0, "Land cost (psf)", c1.land_rate_psf);

  const soft = asRecord(c1.soft_costs);
  if (soft) {
    pushLine(lines, 0, "Soft cost % (SC)", soft.sc_percentage);
    pushLine(lines, 0, "POWC %", soft.powc_percentage);
    const ffe = asRecord(soft.ffe_percentage);
    if (ffe) {
      pushRange(lines, 0, "FF&E %", {
        recommended: ffe.recommended,
        min: ffe.min_range ?? ffe.min,
        max: ffe.max_range ?? ffe.max,
      });
      pushLine(lines, 3, "FF&E justification", ffe.justification);
    } else {
      pushLine(lines, 0, "FF&E %", soft.ffe_percentage);
    }
  }

  pushLine(
    lines,
    0,
    "Contingency %",
    c1.contingency_pct ??
      c1.contingency_percentage ??
      c1.contingency_percent ??
      c1.contingency
  );

  const period = asRecord(c1.construction_period);
  if (period) {
    pushLine(lines, 0, "Construction period (months)", period.months);
    pushLine(lines, 1, "Construction period range", period.range);
    pushLine(lines, 3, "Construction period justification", period.justification);
  } else {
    pushLine(lines, 0, "Construction period (months)", c1.construction_period_months);
  }

  pushLine(lines, 0, "IT load density (kW/sqft)", c1.it_load_density_kw_sqft ?? c1.it_load_density);
  pushLine(lines, 0, "Typical PUE", c1.typical_pue);

  const sCurve = asRecord(c1.s_curve);
  if (sCurve) {
    const stages = ["stage_1_pct", "stage_2_pct", "stage_3_pct", "stage_4_pct"]
      .map((key, index) => {
        const n = finiteNumber(sCurve[key]);
        return n != null ? `S${index + 1} ${formatNumber(n)}%` : null;
      })
      .filter((part): part is string => Boolean(part));
    if (stages.length) {
      lines.push({ group: 3, text: `- S-curve: ${stages.join(", ")}` });
    }
  }

  const powc = asRecord(c1.powc_breakdown);
  if (powc) {
    const bits = [
      ["site establishment", powc.site_establishment_pct],
      ["overhead", powc.overhead_pct],
      ["authority fees", powc.authority_fees_pct],
    ]
      .map(([label, value]) => {
        const n = finiteNumber(value);
        return n != null ? `${label} ${formatNumber(n)}%` : null;
      })
      .filter((part): part is string => Boolean(part));
    if (bits.length) {
      lines.push({ group: 3, text: `- POWC breakdown: ${bits.join(", ")}` });
    }
  }

  const sc = asRecord(c1.sc_breakdown);
  if (sc) {
    const bits = [
      ["architect", sc.architect_pct],
      ["PM", sc.pm_pct],
      ["engineering", sc.engineering_pct],
      ["geotech", sc.geotech_pct],
      ["other", sc.other_pct],
    ]
      .map(([label, value]) => {
        const n = finiteNumber(value);
        return n != null ? `${label} ${formatNumber(n)}%` : null;
      })
      .filter((part): part is string => Boolean(part));
    if (bits.length) {
      lines.push({ group: 3, text: `- SC breakdown: ${bits.join(", ")}` });
    }
  }
}

function extractNestedRevenue(
  rec: Record<string, unknown> | null,
  prefix: string,
  lines: SnapshotLine[]
): void {
  if (!rec) return;
  pushLine(lines, 0, `${prefix} ADR (year 1)`, rec.adr_year_1);
  pushLine(lines, 0, `${prefix} base rent Y1 (psf)`, rec.base_rent_year_1_psf ?? rec.avg_rent_psf_year_1);
  pushLine(lines, 0, `${prefix} rent escalation %`, rec.rent_escalation_pct ?? rec.annual_escalation_pct);
  pushLine(lines, 0, `${prefix} opening occupancy %`, rec.opening_occupancy_pct ?? rec.opening_occupancy);
  pushLine(lines, 0, `${prefix} stabilized occupancy %`, rec.stabilized_occupancy_pct ?? rec.stabilized_occupancy);
  pushLine(lines, 1, `${prefix} lease-up years`, rec.lease_up_years);
  pushLine(lines, 1, `${prefix} free rent (months)`, rec.free_rent_months);
  pushLine(lines, 0, `${prefix} lease rate (per kW / month)`, rec.lease_rate_per_kw_month);
  pushLine(lines, 0, `${prefix} lease rate (per sqft / month)`, rec.lease_rate_per_sqft_month);
  pushLine(lines, 1, `${prefix} TI allowance (psf)`, rec.ti_allowance_psf);
  pushLine(lines, 1, `${prefix} yard rate (psf)`, rec.yard_rate_psf);
}

function extractC2Operational(
  c2: Record<string, unknown>,
  lines: SnapshotLine[]
): void {
  extractNestedRevenue(asRecord(c2.room_revenues), "Hotel", lines);
  extractNestedRevenue(asRecord(c2.step1_base_rent), "Primary rent", lines);
  extractNestedRevenue(asRecord(c2.step1_primary_revenue), "Primary revenue", lines);
  extractNestedRevenue(asRecord(c2.office_rent), "Office", lines);
  extractNestedRevenue(asRecord(c2.retail_rent), "Retail", lines);
  extractNestedRevenue(asRecord(c2.residential_rent), "Residential", lines);
  extractNestedRevenue(asRecord(c2.base_rent), "Base rent", lines);

  const retail = asRecord(asRecord(c2.step1_base_rent)?.retail);
  extractNestedRevenue(retail, "Retail (nested)", lines);

  pushLine(lines, 0, "ASP (psf)", c2.avg_sales_price_psf);
  pushLine(lines, 1, "Occupancy %", c2.occupancy_pct ?? c2.stabilized_occupancy_pct);
}

function extractC2Sales(c2: Record<string, unknown>, lines: SnapshotLine[]): void {
  pushLine(lines, 0, "ASP per sqft", c2.avg_sales_price_psf);
  pushLine(lines, 1, "Sales velocity / uptake", c2.sales_velocity ?? c2.uptake_pct ?? c2.sales_uptake_pct);
  const deductions = asRecord(c2.deductions);
  if (deductions) {
    pushLine(lines, 1, "Agent commission %", deductions.agent_commission_pct);
    pushLine(lines, 1, "VAT %", deductions.vat_pct);
    pushLine(lines, 1, "Escrow fees %", deductions.escrow_fees_pct);
    pushLine(lines, 1, "Average sales discount %", deductions.avg_sales_discount_pct);
  }
}

function appendReasoningNotesSection(
  lines: SnapshotLine[],
  sources: Array<Record<string, unknown> | null>
): void {
  const entries: string[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    const notes = asRecord(source?.reasoning_notes);
    if (!notes) continue;
    for (const [key, value] of Object.entries(notes)) {
      if (typeof value !== "string" || !value.trim()) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(`- ${key}: ${value.trim()}`);
    }
  }
  if (!entries.length) return;
  lines.push({ group: GROUP_REASONING_NOTES, text: ORIGINAL_RESEARCH_REASONING_HEADER });
  for (const text of entries) {
    lines.push({ group: GROUP_REASONING_NOTES, text });
  }
}

const COST_SIDE_RE =
  /\b(cost|construction|land|contingency|tdc|capex|soft[\s_-]?cost|powc|s-?curve|period|building|parking|basement|infrastructure|ffe)\b/i;
const REVENUE_SIDE_RE =
  /\b(rent|occupancy|uptake|asp|escalation|lease|sales?|adr|launch|revenue|commission|vat|escrow|discount|absorption|gdv)\b/i;

export const C2_COST_GUARDRAILS_POINTER =
  "Cost-side guardrails from Component 1 are also available — ask 'what cost guardrails did the AI use?' if relevant.";

type HintSide = "cost" | "revenue";

function lineSide(text: string): HintSide | "neither" {
  const cost = COST_SIDE_RE.test(text);
  const revenue = REVENUE_SIDE_RE.test(text);
  if (cost && !revenue) return "cost";
  if (revenue && !cost) return "revenue";
  return "neither";
}

function sideFromKeyAndText(key: string, valueText: string): HintSide | "neither" {
  const fromKey = lineSide(key.replace(/_/g, " "));
  if (fromKey !== "neither") return fromKey;
  return lineSide(valueText);
}

function pushFiltered(
  lines: SnapshotLine[],
  group: number,
  side: HintSide,
  text: string,
  keyForSide?: string
): void {
  const detected = keyForSide
    ? sideFromKeyAndText(keyForSide, text)
    : lineSide(text);
  if (detected !== side) return;
  lines.push({ group, text });
}

function appendHintsOrGuardrails(
  lines: SnapshotLine[],
  group: number,
  kind: "Hint" | "Guardrail",
  value: unknown,
  side: HintSide
): void {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === "string" && item.trim()) {
        pushFiltered(
          lines,
          group,
          side,
          `- ${kind} ${index + 1}: ${item.trim()}`
        );
        return;
      }
      const rec = asRecord(item);
      if (!rec) {
        const formatted = formatScalar(item);
        if (formatted) {
          pushFiltered(
            lines,
            group,
            side,
            `- ${kind} ${index + 1}: ${formatted}`
          );
        }
        return;
      }
      const label = formatScalar(rec.label ?? rec.key) ?? `${kind} ${index + 1}`;
      const text = formatScalar(rec.text ?? rec.value ?? rec.message);
      if (text) {
        pushFiltered(lines, group, side, `- ${label}: ${text}`, label);
        return;
      }
      const before = lines.length;
      pushRange(lines, group, label, rec);
      const added = lines[lines.length - 1];
      if (
        lines.length > before &&
        added &&
        sideFromKeyAndText(label, added.text) !== side
      ) {
        lines.pop();
      }
    });
    return;
  }

  const rec = asRecord(value);
  if (!rec) {
    const formatted = formatScalar(value);
    if (formatted) pushFiltered(lines, group, side, `- ${kind}: ${formatted}`);
    return;
  }

  for (const [key, entry] of Object.entries(rec)) {
    const label = `${kind} (${key.replace(/_/g, " ")})`;
    const nested = asRecord(entry);
    if (
      nested &&
      (nested.min != null || nested.max != null || nested.recommended != null)
    ) {
      const before = lines.length;
      pushRange(lines, group, label, nested);
      const added = lines[lines.length - 1];
      if (
        lines.length > before &&
        added &&
        sideFromKeyAndText(key, added.text) !== side
      ) {
        lines.pop();
      }
      continue;
    }
    const formatted = formatScalar(entry);
    if (formatted) {
      pushFiltered(lines, group, side, `- ${label}: ${formatted}`, key);
    }
  }
}

function collectHintsAndGuardrails(
  research: AiResearchResult,
  side: HintSide,
  lines: SnapshotLine[]
): void {
  const c1Nested = asRecord(research.c1_development);
  appendHintsOrGuardrails(lines, 1, "Hint", research.hints ?? c1Nested?.hints, side);
  appendHintsOrGuardrails(
    lines,
    1,
    "Guardrail",
    research.guardrails ?? c1Nested?.guardrails,
    side
  );
}

function fitToCap(lines: SnapshotLine[], maxChars: number): string {
  const ordered = [...lines].sort((a, b) => a.group - b.group);
  const kept: string[] = [];
  let used = 0;

  for (const line of ordered) {
    const extra = (kept.length ? 1 : 0) + line.text.length;
    if (used + extra <= maxChars) {
      kept.push(line.text);
      used += extra;
      continue;
    }
    const remaining = maxChars - used - (kept.length ? 1 : 0);
    if (remaining >= 32) {
      kept.push(`${line.text.slice(0, remaining - 1)}…`);
    }
    break;
  }

  return kept.join("\n");
}

function fitWithReservedSuffix(
  lines: SnapshotLine[],
  maxChars: number,
  suffix: string
): string {
  const reserved = suffix ? suffix.length + (lines.length ? 1 : 0) : 0;
  const body = fitToCap(lines, Math.max(0, maxChars - reserved));
  if (!suffix) return body;
  if (!body) return suffix.slice(0, maxChars);
  return `${body}\n${suffix}`;
}

/**
 * Compact plain-text snapshot of the latest C1/C2 AI research for the Analyst.
 * Component-scoped: C1 = cost-side, C2 = revenue-side.
 * Returns "" when no research is on file. Hard-capped at RESEARCH_SNAPSHOT_MAX_CHARS.
 */
export function buildResearchSnapshot(
  research: AiResearchResult | null | undefined,
  component: string,
  assetType: string
): string {
  if (!research) return "";

  const lines: SnapshotLine[] = [];
  const componentId = component.trim().toUpperCase();
  const asset = assetType.trim();
  if (asset) {
    lines.push({ group: 0, text: `- Asset: ${asset}` });
  }

  pushLine(lines, 0, "FX rate to USD", research.fx_rate_to_usd);

  if (componentId === "C1") {
    const c1 = asRecord(research.c1_development);
    if (c1) extractC1(c1, lines);
    appendReasoningNotesSection(lines, [c1]);
    collectHintsAndGuardrails(research, "cost", lines);
    const market = asRecord(research.market_benchmarks);
    const allIn = asRecord(market?.all_in_cost_per_sqft);
    if (allIn) pushRange(lines, 3, "All-in cost (psf)", allIn);
    return fitToCap(lines, RESEARCH_SNAPSHOT_MAX_CHARS).trim();
  }

  if (componentId === "C2") {
    const c2Op = asRecord(research.c2_operational);
    const c2Sales = asRecord(research.c2_sales);
    if (c2Op) extractC2Operational(c2Op, lines);
    if (c2Sales) extractC2Sales(c2Sales, lines);
    appendReasoningNotesSection(lines, [c2Op, c2Sales]);
    const c1 = asRecord(research.c1_development);
    if (c1) {
      pushLine(lines, 0, "Lease rate (per kW / month)", c1.lease_rate_per_kw_month);
      pushLine(lines, 0, "Lease rate (per sqft / month)", c1.lease_rate_per_sqft_month);
    }
    collectHintsAndGuardrails(research, "revenue", lines);
    return fitWithReservedSuffix(
      lines,
      RESEARCH_SNAPSHOT_MAX_CHARS,
      C2_COST_GUARDRAILS_POINTER
    ).trim();
  }

  return fitToCap(lines, RESEARCH_SNAPSHOT_MAX_CHARS).trim();
}

/**
 * Cost-side hints/guardrails only — injected on C2 so an explicit
 * "what cost guardrails did the AI use?" question can be answered
 * without mixing those lines into the C2 revenue snapshot.
 */
export function buildCostSideGuardrailsSnapshot(
  research: AiResearchResult | null | undefined
): string {
  if (!research) return "";
  const lines: SnapshotLine[] = [];
  collectHintsAndGuardrails(research, "cost", lines);
  appendReasoningNotesSection(lines, [asRecord(research.c1_development)]);
  return fitToCap(lines, RESEARCH_SNAPSHOT_MAX_CHARS).trim();
}
