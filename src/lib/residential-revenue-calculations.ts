import { compoundRentForYearIndex } from "@/lib/benchmarks/retail-revenue";
import { OPERATIONAL_ROOM_REVENUE_YEARS } from "@/lib/operational-cash-inflows-chart";

export function leasedPctForYearMonths(
  year: number,
  opening: number,
  target: number,
  leaseUpMonths: number
): number {
  const leaseUpYears = Math.max(leaseUpMonths / 12, 1 / 12);
  if (year === 1) return opening;
  if (year <= leaseUpYears) {
    const progress = (year - 1) / leaseUpYears;
    return opening + (target - opening) * progress;
  }
  return target;
}

export function leasedPctForYear(
  year: number,
  opening: number,
  target: number,
  leaseUpYears: number
): number {
  if (year === 1) return opening;
  if (year <= leaseUpYears) {
    const progress = (year - 1) / leaseUpYears;
    return opening + (target - opening) * progress;
  }
  return target;
}

export type ResidentialRevenueInputs = {
  residentialGla: number;
  residentialRentPsf: number;
  residentialEscalation: number;
  residentialLeasedOpening: number;
  residentialLeasedTarget: number;
  residentialLeaseUpMonths: number;
  residentialVacancyRate: number;
  residentialBadDebtRate: number;
  retailGla: number;
  retailRentPsf: number;
  retailEscalation: number;
  retailLeasedOpening: number;
  retailLeasedTarget: number;
  retailLeaseUpYears: number;
  retailFreeRentMonths: number;
  includePercentageRent: boolean;
  retailSalesPsf: number;
  retailSalesGrowth: number;
  percentageRentRate: number;
  breakpointType: "natural" | "fixed";
  breakpointMultiple: number;
  fixedBreakpointPsf: number;
  manualYearValues: Record<number, Record<string, number>>;
};

export type ResidentialRevenueRow = {
  year: number;
  residentialRentPsfYear: number;
  residentialLeasedPct: number;
  residentialEffectiveOccupancy: number;
  residentialRevenue: number;
  retailRentPsfYear: number;
  retailLeasedPct: number;
  retailEffectiveLeased: number;
  retailMinRent: number;
  percentageRent: number;
  totalBaseRent: number;
  isOverridden: boolean;
  residentialRevenueM: number;
  retailMinRentM: number;
  percentageRentM: number;
};

export function computeResidentialRevenueRows(
  inputs: ResidentialRevenueInputs
): ResidentialRevenueRow[] {
  const rows: ResidentialRevenueRow[] = [];
  const vacancyFactor = 1 - inputs.residentialVacancyRate / 100;
  const badDebtFactor = 1 - inputs.residentialBadDebtRate / 100;

  for (let t = 1; t <= OPERATIONAL_ROOM_REVENUE_YEARS; t++) {
    const residentialRentPsfYear = compoundRentForYearIndex(
      inputs.residentialRentPsf,
      inputs.residentialEscalation,
      t - 1
    );
    const retailRentPsfYear = compoundRentForYearIndex(
      inputs.retailRentPsf,
      inputs.retailEscalation,
      t - 1
    );
    const retailSalesPsfYear = compoundRentForYearIndex(
      inputs.retailSalesPsf,
      inputs.retailSalesGrowth,
      t - 1
    );

    const residentialLeasedPct = leasedPctForYearMonths(
      t,
      inputs.residentialLeasedOpening,
      inputs.residentialLeasedTarget,
      inputs.residentialLeaseUpMonths
    );
    const residentialEffectiveOccupancy =
      residentialLeasedPct * vacancyFactor * badDebtFactor;

    const residentialRevenue =
      inputs.residentialGla *
      residentialRentPsfYear *
      (residentialEffectiveOccupancy / 100);

    const retailLeased = leasedPctForYear(
      t,
      inputs.retailLeasedOpening,
      inputs.retailLeasedTarget,
      inputs.retailLeaseUpYears
    );
    let retailEffectiveLeased = retailLeased;
    if (t === 1) {
      retailEffectiveLeased =
        retailLeased * (1 - inputs.retailFreeRentMonths / 12);
    }
    const retailMinRent =
      inputs.retailGla * retailRentPsfYear * (retailEffectiveLeased / 100);

    let percentageRent = 0;
    if (inputs.includePercentageRent && inputs.retailGla > 0) {
      const totalSales = inputs.retailGla * retailSalesPsfYear;
      const breakpointSales =
        inputs.breakpointType === "natural"
          ? retailRentPsfYear * inputs.breakpointMultiple * inputs.retailGla
          : inputs.fixedBreakpointPsf * inputs.retailGla;
      const excessSales = Math.max(0, totalSales - breakpointSales);
      percentageRent = excessSales * (inputs.percentageRentRate / 100);
    }

    const manual = inputs.manualYearValues[t] ?? {};
    const resRev = manual.residentialRevenue ?? residentialRevenue;
    const retailMin = manual.retailMinRent ?? retailMinRent;
    const pctRent = manual.percentageRent ?? percentageRent;
    const totalBaseRent =
      manual.totalBaseRent ?? resRev + retailMin + pctRent;

    rows.push({
      year: t,
      residentialRentPsfYear,
      residentialLeasedPct,
      residentialEffectiveOccupancy,
      residentialRevenue: resRev,
      retailRentPsfYear,
      retailLeasedPct: retailLeased,
      retailEffectiveLeased,
      retailMinRent: retailMin,
      percentageRent: pctRent,
      totalBaseRent,
      isOverridden: Object.keys(manual).length > 0,
      residentialRevenueM: resRev / 1_000_000,
      retailMinRentM: retailMin / 1_000_000,
      percentageRentM: pctRent / 1_000_000,
    });
  }

  return rows;
}
