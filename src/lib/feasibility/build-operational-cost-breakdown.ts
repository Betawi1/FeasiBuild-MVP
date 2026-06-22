import useFinModelStore from "@/store/useFinModelStore";
import type { FeasibilityProjectBundle } from "@/types/feasibility";

export interface OperationalCostLine {
  area: number;
  rate: number;
  amount: number;
}

export interface OperationalCostBreakdown {
  currency: string;
  building: OperationalCostLine;
  parking: OperationalCostLine;
  basement: OperationalCostLine;
  infrastructure: OperationalCostLine;
  contingency: { percentage: number; amount: number };
  softCosts: { percentage: number; amount: number };
  powc: { percentage: number; amount: number };
  landCosts: { amount: number };
  totalConstructionBeforeContingency: number;
  totalConstructionCosts: number;
  totalDevelopmentCost: number;
}

export function buildOperationalCostBreakdown(
  bundle: FeasibilityProjectBundle
): OperationalCostBreakdown {
  const co = useFinModelStore.getState().operational.cashOutflows;
  const c1 = bundle.component1;

  const buildingAmt = (co.buildingBUA || c1.buildingBUA || 0) * (co.buildingRate || c1.buildingRate || 0);
  const parkingAmt = (co.parkingBUA || c1.parkingBUA || 0) * (co.parkingRate || c1.parkingRate || 0);
  const basementAmt = (co.basementBUA || 0) * (co.basementRate || c1.basementRate || 0);
  const infraArea = co.landArea || 0;
  const infraRate = co.infrastructureRate ?? 0;
  const infraAmt = infraArea * infraRate;

  const totalConstructionBeforeContingency =
    buildingAmt + parkingAmt + basementAmt + infraAmt;
  const contingencyPct = co.contingencyPercent || 0;
  const contingencyAmt =
    totalConstructionBeforeContingency * (contingencyPct / 100);
  const totalConstruction =
    co.constructionCost || totalConstructionBeforeContingency + contingencyAmt;
  const softAmt = co.softCostsTotal ?? co.softCosts ?? c1.softCosts ?? 0;
  const powcAmt = co.powcTotal ?? co.powc ?? c1.powc ?? 0;
  const landAmt = co.landCost || c1.landCost || 0;
  const tdc =
    co.tdc ||
    bundle.component4.tdc ||
    totalConstruction + softAmt + powcAmt + landAmt;

  return {
    currency: bundle.currency,
    building: {
      area: co.buildingBUA || c1.buildingBUA || 0,
      rate: co.buildingRate || c1.buildingRate || 0,
      amount: buildingAmt,
    },
    parking: {
      area: co.parkingBUA || c1.parkingBUA || 0,
      rate: co.parkingRate || c1.parkingRate || 0,
      amount: parkingAmt,
    },
    basement: {
      area: co.basementBUA || 0,
      rate: co.basementRate || c1.basementRate || 0,
      amount: basementAmt,
    },
    infrastructure: {
      area: infraArea,
      rate: infraRate,
      amount: infraAmt,
    },
    contingency: {
      percentage: contingencyPct,
      amount: contingencyAmt,
    },
    softCosts: {
      percentage: co.softCostPercent || 0,
      amount: softAmt,
    },
    powc: {
      percentage: co.powcPercent || 0,
      amount: powcAmt,
    },
    landCosts: { amount: landAmt },
    totalConstructionBeforeContingency,
    totalConstructionCosts: totalConstruction,
    totalDevelopmentCost: tdc,
  };
}
