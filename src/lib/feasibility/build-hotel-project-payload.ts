import {
  aggregatedToHotelPayload,
  getProjectData,
} from "@/lib/feasibility/data-aggregator";
import type { HotelFeasibilityProjectData } from "@/lib/feasibility/hotel-feasibility-types";

function pct(n: number): string {
  return `${Math.round(n * 10) / 10}%`;
}

export function buildHotelProjectPayload(): HotelFeasibilityProjectData {
  return aggregatedToHotelPayload(getProjectData());
}

export function formatHotelCurrency(
  amount: number,
  currency: string,
  compact = false
): string {
  if (!Number.isFinite(amount)) return `${currency} 0`;
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}

export { pct };
