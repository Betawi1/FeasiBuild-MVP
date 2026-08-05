import type {
  WarehouseQualityGrade,
  WarehouseSubType,
} from "@/store/useFinModelStore";

export type WarehouseSpecInputs = {
  totalBua: number;
  numberOfFloors: number;
  totalLandArea: number;
  warehouseSubType?: WarehouseSubType;
  qualityGrade?: WarehouseQualityGrade;
};

export type WarehouseCalculatedSpecs = {
  clearHeight: number;
  columnSpacing: string;
  dockDoors: number;
  driveInDoors: number;
  buildingFootprint: number;
  siteCoveragePct: number;
  yardArea: number;
  parkingCars: number;
  parkingTrailers: number;
  dockDoorRatio: number;
};

const CLEAR_HEIGHT: Record<
  WarehouseSubType,
  Record<WarehouseQualityGrade, { min: number; max: number }>
> = {
  BULK_DISTRIBUTION: {
    GRADE_A: { min: 32, max: 36 },
    GRADE_B: { min: 28, max: 30 },
  },
  LAST_MILE_URBAN: {
    GRADE_A: { min: 28, max: 30 },
    GRADE_B: { min: 24, max: 26 },
  },
  MULTI_STOREY: {
    GRADE_A: { min: 18, max: 20 },
    GRADE_B: { min: 14, max: 16 },
  },
  COLD_STORAGE: {
    GRADE_A: { min: 36, max: 40 },
    GRADE_B: { min: 32, max: 36 },
  },
  LIGHT_MANUFACTURING: {
    GRADE_A: { min: 24, max: 28 },
    GRADE_B: { min: 20, max: 24 },
  },
};

const COLUMN_SPACING: Record<
  WarehouseSubType,
  Record<WarehouseQualityGrade, string>
> = {
  BULK_DISTRIBUTION: { GRADE_A: "50x50", GRADE_B: "40x40" },
  LAST_MILE_URBAN: { GRADE_A: "30x40", GRADE_B: "30x30" },
  MULTI_STOREY: { GRADE_A: "30x30", GRADE_B: "30x30" },
  COLD_STORAGE: { GRADE_A: "40x45", GRADE_B: "40x40" },
  LIGHT_MANUFACTURING: { GRADE_A: "30x40", GRADE_B: "30x30" },
};

function dockDoorRatioFor(subType?: WarehouseSubType): number {
  if (subType === "LAST_MILE_URBAN") return 8000;
  if (subType === "COLD_STORAGE") return 12000;
  return 10000;
}

/** Rule engine: specs from Sub-Type + Grade + user BUA / floors / land. */
export function calculateWarehouseSpecs(
  inputs: WarehouseSpecInputs
): WarehouseCalculatedSpecs {
  const subType = inputs.warehouseSubType ?? "BULK_DISTRIBUTION";
  const grade = inputs.qualityGrade ?? "GRADE_A";
  const bua = Math.max(0, inputs.totalBua || 0);
  const floors = Math.max(1, inputs.numberOfFloors || 1);
  const landArea = Math.max(0, inputs.totalLandArea || 0);

  const heightRange =
    CLEAR_HEIGHT[subType]?.[grade] ?? { min: 28, max: 32 };
  const clearHeight = Math.round((heightRange.min + heightRange.max) / 2);
  const columnSpacing = COLUMN_SPACING[subType]?.[grade] ?? "40x40";

  const dockDoorRatio = dockDoorRatioFor(subType);
  const dockDoors = bua > 0 ? Math.round(bua / dockDoorRatio) : 0;
  const driveInDoors = Math.round(dockDoors * 0.2);
  const buildingFootprint = Math.round(bua / floors);
  const siteCoveragePct =
    landArea > 0
      ? Math.round((buildingFootprint / landArea) * 1000) / 10
      : 0;
  const yardArea = Math.max(0, Math.round(landArea - buildingFootprint));
  const parkingCars = bua > 0 ? Math.round(bua / 5000) : 0;
  const parkingTrailers = bua > 0 ? Math.round(bua / 10000) : 0;

  return {
    clearHeight,
    columnSpacing,
    dockDoors,
    driveInDoors,
    buildingFootprint,
    siteCoveragePct,
    yardArea,
    parkingCars,
    parkingTrailers,
    dockDoorRatio,
  };
}

export function formatWarehouseSubTypeLabel(
  subType?: WarehouseSubType | string
): string {
  if (!subType) return "—";
  return subType.replace(/_/g, " ");
}

export function formatWarehouseGradeLabel(
  grade?: WarehouseQualityGrade | string
): string {
  if (!grade) return "—";
  return grade.replace(/_/g, " ");
}
