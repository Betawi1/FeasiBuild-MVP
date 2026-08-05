/** Warehouse-specific configuration for Sale stream (build-to-sell). */

export type SaleWarehouseSubType =
  | "bulk-distribution"
  | "last-mile-urban"
  | "multi-storey"
  | "cold-storage"
  | "light-manufacturing";

export type SaleWarehouseQualityGrade = "grade-a" | "grade-b";

export type SaleWarehouseConfigurationType =
  | "single-warehouse"
  | "industrial-park";

export interface SaleWarehouseSingleConfig {
  bua: number; // Built-up area
  floors: number;
  clearHeight: number; // in feet
  columnSpacing: string; // e.g., "40x40" or "40x50"
  dockDoors: number;
  driveInDoors: number;
  landArea: number;
  yardArea?: number;
  parkingCars?: number;
  parkingTrailers?: number;
  siteCoveragePct?: number;
}

export interface SaleWarehouseParkConfig {
  numberOfUnits: number;
  /** Total warehouse land for all units (units × single land area). */
  warehouseLandArea: number;
  commonInfrastructureAreaPct: number; // % of warehouse land
  totalLandArea: number;
}

/** Warehouse-specific configuration for Sale stream */
export interface SaleWarehouseConfig {
  // From Step 4: Segment & Positioning
  warehouseSubType?: SaleWarehouseSubType;
  qualityGrade?: SaleWarehouseQualityGrade;

  // From Step 5: Building Configuration
  configurationType?: SaleWarehouseConfigurationType;

  // Single Warehouse fields
  singleWarehouse?: SaleWarehouseSingleConfig;

  // Industrial Park fields
  industrialPark?: SaleWarehouseParkConfig;

  // Derived/calculated fields
  totalBUA?: number;
  totalLandArea?: number;
  saleableRatio?: number;
}

/** Flat ProjectInfo fields for warehouse config (mirrors SaleWarehouseConfig). */
export interface SaleWarehouseProjectInfo {
  salesWarehouseSubType?: SaleWarehouseConfig["warehouseSubType"];
  salesQualityGrade?: SaleWarehouseConfig["qualityGrade"];
  salesWarehouseConfigType?: SaleWarehouseConfig["configurationType"];
  salesWarehouseSingle?: SaleWarehouseConfig["singleWarehouse"];
  salesWarehousePark?: SaleWarehouseConfig["industrialPark"];
}
