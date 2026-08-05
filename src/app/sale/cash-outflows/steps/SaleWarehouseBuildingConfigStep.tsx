"use client";

import { useEffect, useMemo, useState } from "react";
import useSaleModelStore, {
  type ProjectInfo,
} from "@/store/useSaleModelStore";
import type {
  SaleWarehouseQualityGrade,
  SaleWarehouseSubType,
} from "@/types/sale-warehouse-config";
import {
  calculateWarehouseSpecs,
  formatWarehouseGradeLabel,
  formatWarehouseSubTypeLabel,
} from "@/lib/warehouse-building-specs";
import type {
  WarehouseQualityGrade,
  WarehouseSubType,
} from "@/store/useFinModelStore";

export type SaleWarehouseBuildingConfigErrors = Record<string, string>;

type Props = {
  errors?: SaleWarehouseBuildingConfigErrors;
};

type SpecOverrideKey =
  | "clearHeight"
  | "columnSpacing"
  | "dockDoors"
  | "driveInDoors"
  | "yardArea"
  | "parkingCars"
  | "parkingTrailers";

export const DEFAULT_SALE_WAREHOUSE_SINGLE: NonNullable<
  ProjectInfo["salesWarehouseSingle"]
> = {
  bua: 100000,
  floors: 1,
  clearHeight: 32,
  columnSpacing: "40x50",
  dockDoors: 20,
  driveInDoors: 2,
  landArea: 200000,
  yardArea: 40000,
  parkingCars: 40,
  parkingTrailers: 10,
  siteCoveragePct: 50,
};

export const DEFAULT_SALE_WAREHOUSE_PARK: NonNullable<
  ProjectInfo["salesWarehousePark"]
> = {
  numberOfUnits: 6,
  warehouseLandArea: 1200000,
  commonInfrastructureAreaPct: 25,
  totalLandArea: 1500000,
};

const userInputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";
const defaultSpecInputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";
const overrideSpecInputClass =
  "w-full rounded-lg border border-amber-500 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500";
const lockedInputClass =
  "w-full cursor-not-allowed rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-slate-400";

function SpecFieldLabel({
  label,
  overridden,
}: {
  label: string;
  overridden: boolean;
}) {
  return (
    <label className="mb-1 flex items-center gap-2 text-xs text-slate-400">
      {label}
      {overridden ? (
        <span className="inline-flex items-center rounded-full border border-amber-700/50 bg-amber-900/30 px-2 py-0.5 text-[10px] text-amber-300">
          Override
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
          Default
        </span>
      )}
    </label>
  );
}

function specInputClass(overridden: boolean): string {
  return overridden ? overrideSpecInputClass : defaultSpecInputClass;
}

function toOpsSubType(
  subType?: SaleWarehouseSubType
): WarehouseSubType | undefined {
  if (!subType) return undefined;
  const map: Record<SaleWarehouseSubType, WarehouseSubType> = {
    "bulk-distribution": "BULK_DISTRIBUTION",
    "last-mile-urban": "LAST_MILE_URBAN",
    "multi-storey": "MULTI_STOREY",
    "cold-storage": "COLD_STORAGE",
    "light-manufacturing": "LIGHT_MANUFACTURING",
  };
  return map[subType];
}

function toOpsGrade(
  grade?: SaleWarehouseQualityGrade
): WarehouseQualityGrade | undefined {
  if (!grade) return undefined;
  return grade === "grade-b" ? "GRADE_B" : "GRADE_A";
}

function deriveParkFromTemplate(
  single: NonNullable<ProjectInfo["salesWarehouseSingle"]>,
  numberOfUnits: number,
  commonInfrastructureAreaPct: number
): NonNullable<ProjectInfo["salesWarehousePark"]> {
  const units = Math.max(0, Math.floor(numberOfUnits));
  const pct = Math.max(0, Math.min(100, commonInfrastructureAreaPct));
  const warehouseLandArea = units * (single.landArea || 0);
  const commonInfrastructureArea = Math.round(warehouseLandArea * (pct / 100));
  return {
    numberOfUnits: units,
    warehouseLandArea,
    commonInfrastructureAreaPct: pct,
    totalLandArea: warehouseLandArea + commonInfrastructureArea,
  };
}

export default function SaleWarehouseBuildingConfigStep({
  errors = {},
}: Props) {
  const projectInfo = useSaleModelStore((s) => s.projectInfo);
  const updateProjectInfoForStream = useSaleModelStore(
    (s) => s.updateProjectInfo
  );

  const configType = projectInfo.salesWarehouseConfigType;
  const [activeTab, setActiveTab] = useState<"single" | "park">(
    configType === "industrial-park" ? "park" : "single"
  );
  const [overrides, setOverrides] = useState<
    Partial<Record<SpecOverrideKey, boolean>>
  >({});

  const single = {
    ...DEFAULT_SALE_WAREHOUSE_SINGLE,
    ...projectInfo.salesWarehouseSingle,
  };
  const park = {
    ...DEFAULT_SALE_WAREHOUSE_PARK,
    ...projectInfo.salesWarehousePark,
  };

  const opsSubType = toOpsSubType(projectInfo.salesWarehouseSubType);
  const opsGrade = toOpsGrade(projectInfo.salesQualityGrade);

  useEffect(() => {
    if (!projectInfo.salesWarehouseSingle) {
      updateProjectInfoForStream({
        salesWarehouseSingle: { ...DEFAULT_SALE_WAREHOUSE_SINGLE },
        salesWarehouseConfigType:
          projectInfo.salesWarehouseConfigType ?? "single-warehouse",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setActiveTab(configType === "industrial-park" ? "park" : "single");
  }, [configType]);

  const autoSpecs = useMemo(
    () =>
      calculateWarehouseSpecs({
        totalBua: single.bua || 0,
        numberOfFloors: single.floors || 1,
        totalLandArea: single.landArea || 0,
        warehouseSubType: opsSubType,
        qualityGrade: opsGrade,
      }),
    [single.bua, single.floors, single.landArea, opsSubType, opsGrade]
  );

  const patchSingle = (
    partial: Partial<NonNullable<ProjectInfo["salesWarehouseSingle"]>>
  ) => {
    updateProjectInfoForStream({
      salesWarehouseSingle: { ...single, ...partial },
    });
  };

  useEffect(() => {
    const next = {
      ...single,
      clearHeight: overrides.clearHeight
        ? single.clearHeight
        : autoSpecs.clearHeight,
      columnSpacing: overrides.columnSpacing
        ? single.columnSpacing
        : autoSpecs.columnSpacing,
      dockDoors: overrides.dockDoors ? single.dockDoors : autoSpecs.dockDoors,
      driveInDoors: overrides.driveInDoors
        ? single.driveInDoors
        : autoSpecs.driveInDoors,
      yardArea: overrides.yardArea ? single.yardArea : autoSpecs.yardArea,
      parkingCars: overrides.parkingCars
        ? single.parkingCars
        : autoSpecs.parkingCars,
      parkingTrailers: overrides.parkingTrailers
        ? single.parkingTrailers
        : autoSpecs.parkingTrailers,
      siteCoveragePct: autoSpecs.siteCoveragePct,
    };

    const changed =
      next.clearHeight !== single.clearHeight ||
      next.columnSpacing !== single.columnSpacing ||
      next.dockDoors !== single.dockDoors ||
      next.driveInDoors !== single.driveInDoors ||
      next.yardArea !== single.yardArea ||
      next.parkingCars !== single.parkingCars ||
      next.parkingTrailers !== single.parkingTrailers ||
      Math.abs((next.siteCoveragePct || 0) - (single.siteCoveragePct || 0)) >
        0.05;

    if (changed) {
      updateProjectInfoForStream({ salesWarehouseSingle: next });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoSpecs.clearHeight,
    autoSpecs.columnSpacing,
    autoSpecs.dockDoors,
    autoSpecs.driveInDoors,
    autoSpecs.yardArea,
    autoSpecs.parkingCars,
    autoSpecs.parkingTrailers,
    autoSpecs.siteCoveragePct,
    overrides,
  ]);

  useEffect(() => {
    if (configType !== "industrial-park") return;
    const units = park.numberOfUnits ?? 6;
    const pct = park.commonInfrastructureAreaPct ?? 25;
    const derived = deriveParkFromTemplate(single, units, pct);
    const prev = projectInfo.salesWarehousePark;
    const landChanged =
      !prev ||
      prev.numberOfUnits !== units ||
      prev.warehouseLandArea !== derived.warehouseLandArea ||
      prev.totalLandArea !== derived.totalLandArea ||
      prev.commonInfrastructureAreaPct !== pct;

    if (landChanged) {
      updateProjectInfoForStream({
        salesWarehousePark: {
          ...derived,
          numberOfUnits: units,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    configType,
    single.bua,
    single.landArea,
    park.numberOfUnits,
    park.commonInfrastructureAreaPct,
  ]);

  const switchTab = (tab: "single" | "park") => {
    setActiveTab(tab);
    if (tab === "park") {
      const units = Math.max(4, park.numberOfUnits || 6);
      const pct = park.commonInfrastructureAreaPct ?? 25;
      const derived = deriveParkFromTemplate(single, units, pct);
      updateProjectInfoForStream({
        salesWarehouseConfigType: "industrial-park",
        salesWarehouseSingle: { ...single },
        salesWarehousePark: derived,
      });
    } else {
      updateProjectInfoForStream({
        salesWarehouseConfigType: "single-warehouse",
        salesWarehouseSingle: { ...single },
      });
    }
  };

  const overrideSpec = <K extends SpecOverrideKey>(
    key: K,
    value: NonNullable<ProjectInfo["salesWarehouseSingle"]>[K]
  ) => {
    setOverrides((prev) => ({ ...prev, [key]: true }));
    patchSingle({ [key]: value } as Partial<
      NonNullable<ProjectInfo["salesWarehouseSingle"]>
    >);
  };

  const hasSpecOverrides = Object.values(overrides).some(Boolean);

  const handleResetToBenchmark = () => {
    setOverrides({});
    patchSingle({
      clearHeight: autoSpecs.clearHeight,
      columnSpacing: autoSpecs.columnSpacing,
      dockDoors: autoSpecs.dockDoors,
      driveInDoors: autoSpecs.driveInDoors,
      yardArea: autoSpecs.yardArea,
      parkingCars: autoSpecs.parkingCars,
      parkingTrailers: autoSpecs.parkingTrailers,
      siteCoveragePct: autoSpecs.siteCoveragePct,
    });
  };

  const handleParkUnitsChange = (raw: number) => {
    const units = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    const pct = park.commonInfrastructureAreaPct ?? 25;
    const derived = deriveParkFromTemplate(single, units, pct);
    updateProjectInfoForStream({
      salesWarehousePark: {
        ...derived,
        numberOfUnits: units,
      },
    });
  };

  const handleParkUnitsBlur = (raw: string) => {
    const val = parseInt(raw, 10) || 6;
    handleParkUnitsChange(Math.max(4, Math.min(50, val)));
  };

  const handleCommonInfraPctChange = (pctRaw: number) => {
    const pct = Math.max(0, Math.min(100, pctRaw || 0));
    const units = park.numberOfUnits ?? 6;
    const derived = deriveParkFromTemplate(single, Math.max(0, units), pct);
    updateProjectInfoForStream({
      salesWarehousePark: {
        ...derived,
        numberOfUnits: units,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-6 border-b border-slate-700 pb-4 text-xl font-bold text-white">
          Building Configuration
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Define warehouse specifications. FeasiBuild auto-calculates technical
          details from your selected sub-type &amp; grade.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-white">
          Summary of Your Selections (from Step 4)
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Sub-Type:</span>
            <span className="ml-2 font-medium text-white">
              {formatWarehouseSubTypeLabel(opsSubType)}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Quality Grade:</span>
            <span className="ml-2 font-medium text-white">
              {formatWarehouseGradeLabel(opsGrade)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-700">
        <button
          type="button"
          onClick={() => switchTab("single")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "single"
              ? "border-b-2 border-emerald-400 text-emerald-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Single Warehouse
        </button>
        <button
          type="button"
          onClick={() => switchTab("park")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "park"
              ? "border-b-2 border-emerald-400 text-emerald-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Industrial Park
        </button>
      </div>
      {errors.salesWarehouseConfigType ? (
        <p className="text-sm text-red-400">{errors.salesWarehouseConfigType}</p>
      ) : null}

      {activeTab === "single" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h3 className="mb-4 text-base font-semibold text-white">
              User Inputs
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Total Warehouse BUA (sqft)
                </label>
                <input
                  type="number"
                  value={single.bua || 0}
                  onChange={(e) => {
                    setOverrides({});
                    patchSingle({ bua: Number(e.target.value) || 0 });
                  }}
                  className={userInputClass}
                />
                {errors.salesWarehouseBUA ? (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.salesWarehouseBUA}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Number of Floors
                </label>
                <input
                  type="number"
                  min={1}
                  value={single.floors || 1}
                  onChange={(e) => {
                    setOverrides({});
                    patchSingle({
                      floors: Math.max(1, Number(e.target.value) || 1),
                    });
                  }}
                  className={userInputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Total Land Area (sqft)
                </label>
                <input
                  type="number"
                  value={single.landArea || 0}
                  onChange={(e) => {
                    setOverrides({});
                    patchSingle({ landArea: Number(e.target.value) || 0 });
                  }}
                  className={userInputClass}
                />
                {errors.salesWarehouseLandArea && activeTab === "single" ? (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.salesWarehouseLandArea}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Auto-Calculated Specifications
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Calculated from industry standards for your sub-type &amp;
                  grade (rule engine). Edit any value to override.
                </p>
              </div>
              {hasSpecOverrides ? (
                <button
                  type="button"
                  onClick={handleResetToBenchmark}
                  className="shrink-0 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Reset to benchmark
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-emerald-400">
                  Building Configuration
                </h4>
                <div>
                  <SpecFieldLabel
                    label="Column Spacing (ft)"
                    overridden={!!overrides.columnSpacing}
                  />
                  <input
                    type="text"
                    value={single.columnSpacing || autoSpecs.columnSpacing}
                    onChange={(e) =>
                      overrideSpec("columnSpacing", e.target.value)
                    }
                    className={specInputClass(!!overrides.columnSpacing)}
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    ({formatWarehouseGradeLabel(opsGrade)}{" "}
                    {formatWarehouseSubTypeLabel(opsSubType)} Std)
                  </p>
                </div>
                <div>
                  <SpecFieldLabel
                    label="Clear Height (ft)"
                    overridden={!!overrides.clearHeight}
                  />
                  <input
                    type="number"
                    value={single.clearHeight || autoSpecs.clearHeight}
                    onChange={(e) =>
                      overrideSpec("clearHeight", Number(e.target.value) || 0)
                    }
                    className={specInputClass(!!overrides.clearHeight)}
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    ({formatWarehouseGradeLabel(opsGrade)}{" "}
                    {formatWarehouseSubTypeLabel(opsSubType)} Std)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-emerald-400">
                  Loading &amp; Access
                </h4>
                <div>
                  <SpecFieldLabel
                    label="Dock Doors / Truck Bays"
                    overridden={!!overrides.dockDoors}
                  />
                  <input
                    type="number"
                    value={single.dockDoors ?? autoSpecs.dockDoors}
                    onChange={(e) =>
                      overrideSpec("dockDoors", Number(e.target.value) || 0)
                    }
                    className={specInputClass(!!overrides.dockDoors)}
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    (1 per {autoSpecs.dockDoorRatio.toLocaleString()} sqft)
                  </p>
                </div>
                <div>
                  <SpecFieldLabel
                    label="Drive-In / Grade-Level Doors"
                    overridden={!!overrides.driveInDoors}
                  />
                  <input
                    type="number"
                    value={single.driveInDoors ?? autoSpecs.driveInDoors}
                    onChange={(e) =>
                      overrideSpec("driveInDoors", Number(e.target.value) || 0)
                    }
                    className={specInputClass(!!overrides.driveInDoors)}
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    (20% of dock doors)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-emerald-400">
                  Site &amp; Yard
                </h4>
                <div>
                  <SpecFieldLabel
                    label="Yard / Hardstand Area (sqft)"
                    overridden={!!overrides.yardArea}
                  />
                  <input
                    type="number"
                    value={single.yardArea ?? autoSpecs.yardArea}
                    onChange={(e) =>
                      overrideSpec("yardArea", Number(e.target.value) || 0)
                    }
                    className={specInputClass(!!overrides.yardArea)}
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    (Land − building footprint)
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Site Coverage (%)
                  </label>
                  <input
                    type="number"
                    value={autoSpecs.siteCoveragePct}
                    readOnly
                    className={lockedInputClass}
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    (Building footprint ÷ land)
                  </p>
                </div>
                <div>
                  <SpecFieldLabel
                    label="Parking (cars)"
                    overridden={!!overrides.parkingCars}
                  />
                  <input
                    type="number"
                    value={single.parkingCars ?? autoSpecs.parkingCars}
                    onChange={(e) =>
                      overrideSpec("parkingCars", Number(e.target.value) || 0)
                    }
                    className={specInputClass(!!overrides.parkingCars)}
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    (1 per 5,000 sqft)
                  </p>
                </div>
                <div>
                  <SpecFieldLabel
                    label="Parking (trailers)"
                    overridden={!!overrides.parkingTrailers}
                  />
                  <input
                    type="number"
                    value={single.parkingTrailers ?? autoSpecs.parkingTrailers}
                    onChange={(e) =>
                      overrideSpec(
                        "parkingTrailers",
                        Number(e.target.value) || 0
                      )
                    }
                    className={specInputClass(!!overrides.parkingTrailers)}
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    (1 per 10,000 sqft)
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-700 pt-6">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Building Footprint (sqft)
                </label>
                <input
                  type="number"
                  value={autoSpecs.buildingFootprint}
                  readOnly
                  className={lockedInputClass}
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  (BUA ÷ number of floors)
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Land Coverage (%)
                </label>
                <input
                  type="number"
                  value={autoSpecs.siteCoveragePct}
                  readOnly
                  className={lockedInputClass}
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  (Building Footprint ÷ Land Area)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "park" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h3 className="mb-2 text-base font-semibold text-white">
              Single Warehouse Template
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              Inherited from the single warehouse configuration. Edit the
              template on the Single Warehouse tab.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              {[
                ["BUA", `${(single.bua || 0).toLocaleString()} sqft`],
                ["Floors", String(single.floors || 1)],
                [
                  "Clear Height",
                  `${single.clearHeight || autoSpecs.clearHeight} ft`,
                ],
                [
                  "Column Spacing",
                  `${single.columnSpacing || autoSpecs.columnSpacing} ft`,
                ],
                [
                  "Dock Doors",
                  `${single.dockDoors ?? autoSpecs.dockDoors} doors`,
                ],
                [
                  "Land Area",
                  `${(single.landArea || 0).toLocaleString()} sqft`,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-700 bg-slate-900/50 p-3"
                >
                  <div className="text-xs text-slate-400">{label}</div>
                  <div className="font-mono text-white">{value}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => switchTab("single")}
              className="mt-4 text-xs text-emerald-400 hover:text-emerald-300"
            >
              Edit Template → Single Warehouse
            </button>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h3 className="mb-4 text-base font-semibold text-white">
              Park Configuration
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Number of Units
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={park.numberOfUnits ?? 6}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    handleParkUnitsChange(Number.isNaN(val) ? 0 : val);
                  }}
                  onBlur={(e) => handleParkUnitsBlur(e.target.value)}
                  className={userInputClass}
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Min 4 / max 50 (validated when you leave the field)
                </p>
                {errors.salesWarehouseParkUnits ? (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.salesWarehouseParkUnits}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Warehouse Land Area (sqft)
                </label>
                <input
                  type="text"
                  value={(park.warehouseLandArea || 0).toLocaleString()}
                  readOnly
                  className={lockedInputClass}
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Units × single warehouse land
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Common Infrastructure Area (% of Land)
                </label>
                <input
                  type="number"
                  min={20}
                  max={30}
                  value={park.commonInfrastructureAreaPct ?? 25}
                  onChange={(e) =>
                    handleCommonInfraPctChange(Number(e.target.value) || 0)
                  }
                  className={userInputClass}
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  (Auto-suggested: 20–30%)
                </p>
              </div>
              <div className="md:col-span-3">
                <label className="mb-1 block text-xs text-slate-400">
                  Total Land Area (sqft)
                </label>
                <input
                  type="text"
                  value={(park.totalLandArea || 0).toLocaleString()}
                  readOnly
                  className={lockedInputClass}
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Warehouse land + common infrastructure area
                </p>
                {errors.salesWarehouseLandArea && activeTab === "park" ? (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.salesWarehouseLandArea}
                  </p>
                ) : null}
              </div>
              <div className="md:col-span-3">
                <label className="mb-1 block text-xs text-slate-400">
                  Total BUA (sqft)
                </label>
                <input
                  type="text"
                  value={(
                    (park.numberOfUnits || 0) * (single.bua || 0)
                  ).toLocaleString()}
                  readOnly
                  className={lockedInputClass}
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Units × template BUA
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
