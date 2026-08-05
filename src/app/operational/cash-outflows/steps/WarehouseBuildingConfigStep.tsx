"use client";

import { useEffect, useMemo, useState } from "react";
import useFinModelStore, {
  DEFAULT_INDUSTRIAL_PARK_CONFIG,
  DEFAULT_WAREHOUSE_CONFIG,
  deriveIndustrialParkFromTemplate,
  ensureWarehouseConfigDefaults,
  type IndustrialParkConfig,
  type WarehouseConfig,
  type WarehouseDevelopmentType,
} from "@/store/useFinModelStore";
import { logOperationalCashOutflow } from "@/lib/operational-audit-fields";
import {
  calculateWarehouseSpecs,
  formatWarehouseGradeLabel,
  formatWarehouseSubTypeLabel,
} from "@/lib/warehouse-building-specs";

export type WarehouseBuildingConfigStepErrors = Record<string, string>;

export function validateWarehouseBuildingConfig(cashOutflows: {
  developmentType?: string;
  warehouseConfig?: WarehouseConfig;
  industrialParkConfig?: IndustrialParkConfig;
}): WarehouseBuildingConfigStepErrors {
  const next: WarehouseBuildingConfigStepErrors = {};
  const cfg = cashOutflows.warehouseConfig;

  if (!cfg || cfg.totalBua <= 0) {
    next.totalBua = "Total warehouse BUA must be greater than 0.";
  }
  if (!cfg || cfg.totalLandArea <= 0) {
    next.totalLandArea = "Total land area must be greater than 0.";
  }
  if (!cfg || (cfg.numberOfFloors || 0) < 1) {
    next.numberOfFloors = "Number of floors must be at least 1.";
  }

  if (cashOutflows.developmentType === "INDUSTRIAL_PARK") {
    const park = cashOutflows.industrialParkConfig;
    const units = park?.numberOfWarehouses ?? 0;
    if (units < 4) {
      next.numberOfWarehouses =
        "Industrial parks require at least 4 warehouses.";
    }
    if (!park || (park.totalLandArea || 0) <= 0) {
      next.totalLandArea = "Total park land area must be greater than 0.";
    }
  }

  return next;
}

type WarehouseBuildingConfigStepProps = {
  errors?: WarehouseBuildingConfigStepErrors;
};

type SpecOverrideKey =
  | "clearHeight"
  | "columnSpacing"
  | "dockDoors"
  | "driveInDoors"
  | "yardArea"
  | "parkingCars"
  | "parkingTrailers";

function emptyWarehouseConfig(
  overrides: Partial<WarehouseConfig> = {}
): WarehouseConfig {
  return { ...DEFAULT_WAREHOUSE_CONFIG, ...overrides };
}

/** Pure manual user entry — no AI / override chrome. */
const userInputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";
/** Rule-engine default (editable) — grey border until overridden. */
const defaultSpecInputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";
/** User overrode a rule-engine default. */
const overrideSpecInputClass =
  "w-full rounded-lg border border-amber-500 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500";
/** Read-only derived values. */
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

export default function WarehouseBuildingConfigStep({
  errors = {},
}: WarehouseBuildingConfigStepProps) {
  const cashOutflows = useFinModelStore((s) => s.operational.cashOutflows);
  const updateCashOutflows = useFinModelStore((s) => s.updateCashOutflows);

  const developmentType =
    cashOutflows.developmentType ?? ("SINGLE_WAREHOUSE" as WarehouseDevelopmentType);
  const warehouseSubType = cashOutflows.warehouseSubType;
  const qualityGrade = cashOutflows.qualityGrade;
  const warehouseConfig = cashOutflows.warehouseConfig;
  const industrialParkConfig = cashOutflows.industrialParkConfig;

  const [activeTab, setActiveTab] = useState<"single" | "park">(
    developmentType === "INDUSTRIAL_PARK" ? "park" : "single"
  );
  const [overrides, setOverrides] = useState<Partial<Record<SpecOverrideKey, boolean>>>(
    {}
  );

  useEffect(() => {
    const defaults = ensureWarehouseConfigDefaults({
      ...cashOutflows,
      developmentType: cashOutflows.developmentType ?? "SINGLE_WAREHOUSE",
    });
    // Always ensure single-warehouse template exists (park inherits it).
    if (!cashOutflows.warehouseConfig) {
      defaults.warehouseConfig = { ...DEFAULT_WAREHOUSE_CONFIG };
    }
    if (Object.keys(defaults).length > 0) {
      updateCashOutflows(defaults, "operational");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cfg = warehouseConfig ?? DEFAULT_WAREHOUSE_CONFIG;

  const autoSpecs = useMemo(
    () =>
      calculateWarehouseSpecs({
        totalBua: cfg.totalBua || 0,
        numberOfFloors: cfg.numberOfFloors || 1,
        totalLandArea: cfg.totalLandArea || 0,
        warehouseSubType,
        qualityGrade,
      }),
    [
      cfg.totalBua,
      cfg.numberOfFloors,
      cfg.totalLandArea,
      warehouseSubType,
      qualityGrade,
    ]
  );

  // Persist auto specs into store when primary inputs / segment change
  // (unless the user has overridden that field this session).
  useEffect(() => {
    const next: WarehouseConfig = emptyWarehouseConfig({
      ...cfg,
      clearHeight: overrides.clearHeight
        ? cfg.clearHeight
        : autoSpecs.clearHeight,
      columnSpacing: overrides.columnSpacing
        ? cfg.columnSpacing
        : autoSpecs.columnSpacing,
      dockDoors: overrides.dockDoors ? cfg.dockDoors : autoSpecs.dockDoors,
      driveInDoors: overrides.driveInDoors
        ? cfg.driveInDoors
        : autoSpecs.driveInDoors,
      yardArea: overrides.yardArea ? cfg.yardArea : autoSpecs.yardArea,
      parkingCars: overrides.parkingCars
        ? cfg.parkingCars
        : autoSpecs.parkingCars,
      parkingTrailers: overrides.parkingTrailers
        ? cfg.parkingTrailers
        : autoSpecs.parkingTrailers,
      siteCoveragePct: autoSpecs.siteCoveragePct,
      landCoveragePct: autoSpecs.siteCoveragePct,
    });

    const changed =
      next.clearHeight !== cfg.clearHeight ||
      next.columnSpacing !== cfg.columnSpacing ||
      next.dockDoors !== cfg.dockDoors ||
      next.driveInDoors !== cfg.driveInDoors ||
      next.yardArea !== cfg.yardArea ||
      next.parkingCars !== cfg.parkingCars ||
      next.parkingTrailers !== cfg.parkingTrailers ||
      Math.abs((next.siteCoveragePct || 0) - (cfg.siteCoveragePct || 0)) > 0.05 ||
      Math.abs((next.landCoveragePct || 0) - (cfg.landCoveragePct || 0)) > 0.05;

    if (changed) {
      updateCashOutflows({ warehouseConfig: next }, "operational");
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

  // Keep park land/mix derived from template when on park mode.
  // Do NOT clamp unit count here — allow intermediate values (1, 2, 3) while typing.
  useEffect(() => {
    if (developmentType !== "INDUSTRIAL_PARK") return;
    const units =
      industrialParkConfig?.numberOfWarehouses ??
      cashOutflows.numberOfWarehouses ??
      6;
    const pct = industrialParkConfig?.commonInfrastructurePct ?? 25;
    const derived = deriveIndustrialParkFromTemplate(
      cfg,
      units,
      pct,
      industrialParkConfig?.phasing ?? "SINGLE_PHASE"
    );
    const prev = industrialParkConfig;
    const landChanged =
      !prev ||
      prev.numberOfWarehouses !== derived.numberOfWarehouses ||
      prev.warehouseLandArea !== derived.warehouseLandArea ||
      prev.commonInfrastructureArea !== derived.commonInfrastructureArea ||
      prev.totalLandArea !== derived.totalLandArea ||
      (prev.warehouseMix?.[0]?.size ?? 0) !== (cfg.totalBua || 0);

    if (landChanged) {
      updateCashOutflows(
        {
          industrialParkConfig: derived,
          numberOfWarehouses: derived.numberOfWarehouses,
          phasingStrategy: derived.phasing,
        },
        "operational"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    developmentType,
    cfg.totalBua,
    cfg.totalLandArea,
    industrialParkConfig?.numberOfWarehouses,
    industrialParkConfig?.commonInfrastructurePct,
    industrialParkConfig?.phasing,
  ]);

  const switchTab = (tab: "single" | "park") => {
    setActiveTab(tab);
    const nextType: WarehouseDevelopmentType =
      tab === "park" ? "INDUSTRIAL_PARK" : "SINGLE_WAREHOUSE";
    if (tab === "park") {
      const units = Math.max(
        4,
        industrialParkConfig?.numberOfWarehouses ??
          cashOutflows.numberOfWarehouses ??
          6
      );
      const pct = industrialParkConfig?.commonInfrastructurePct ?? 25;
      const derived = deriveIndustrialParkFromTemplate(
        cfg,
        units,
        pct,
        industrialParkConfig?.phasing ?? "SINGLE_PHASE"
      );
      updateCashOutflows(
        {
          developmentType: nextType,
          industrialParkConfig: derived,
          numberOfWarehouses: derived.numberOfWarehouses,
          phasingStrategy: derived.phasing,
          commonInfrastructure: true,
        },
        "operational"
      );
    } else {
      updateCashOutflows({ developmentType: nextType }, "operational");
    }
    logOperationalCashOutflow("developmentType", nextType, 5);
  };

  const patchWarehouse = (partial: Partial<WarehouseConfig>) => {
    updateCashOutflows(
      { warehouseConfig: emptyWarehouseConfig({ ...cfg, ...partial }) },
      "operational"
    );
  };

  const overrideSpec = <K extends SpecOverrideKey>(
    key: K,
    value: WarehouseConfig[K]
  ) => {
    setOverrides((prev) => ({ ...prev, [key]: true }));
    patchWarehouse({ [key]: value } as Partial<WarehouseConfig>);
  };

  const hasSpecOverrides = Object.values(overrides).some(Boolean);

  const handleResetToBenchmark = () => {
    setOverrides({});
    // Revert overridden specs to current rule-engine defaults
    patchWarehouse({
      clearHeight: autoSpecs.clearHeight,
      columnSpacing: autoSpecs.columnSpacing,
      dockDoors: autoSpecs.dockDoors,
      driveInDoors: autoSpecs.driveInDoors,
      yardArea: autoSpecs.yardArea,
      parkingCars: autoSpecs.parkingCars,
      parkingTrailers: autoSpecs.parkingTrailers,
    });
  };

  const park = industrialParkConfig ?? DEFAULT_INDUSTRIAL_PARK_CONFIG;

  const handleParkUnitsChange = (raw: number) => {
    const units = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    const pct = park.commonInfrastructurePct ?? 25;
    const derived = deriveIndustrialParkFromTemplate(
      cfg,
      units,
      pct,
      park.phasing
    );
    updateCashOutflows(
      {
        industrialParkConfig: {
          ...derived,
          // Preserve typed intermediate value (including 0–3) until blur clamps.
          numberOfWarehouses: units,
        },
        numberOfWarehouses: units,
      },
      "operational"
    );
  };

  const handleParkUnitsBlur = (raw: string) => {
    const val = parseInt(raw, 10) || 6;
    const clamped = Math.max(4, Math.min(50, val));
    handleParkUnitsChange(clamped);
  };

  const handleCommonInfraPctChange = (pctRaw: number) => {
    const pct = Math.max(0, Math.min(100, pctRaw || 0));
    const units = park.numberOfWarehouses ?? 6;
    const derived = deriveIndustrialParkFromTemplate(
      cfg,
      Math.max(0, units),
      pct,
      park.phasing
    );
    updateCashOutflows(
      {
        industrialParkConfig: {
          ...derived,
          numberOfWarehouses: units,
        },
      },
      "operational"
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Step 5 of 13: Building Configuration
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
              {formatWarehouseSubTypeLabel(warehouseSubType)}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Quality Grade:</span>
            <span className="ml-2 font-medium text-white">
              {formatWarehouseGradeLabel(qualityGrade)}
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
                  value={cfg.totalBua || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setOverrides({});
                    patchWarehouse({ totalBua: val });
                    logOperationalCashOutflow("warehouseTotalBua", val, 5);
                  }}
                  className={userInputClass}
                />
                {errors.totalBua && (
                  <p className="mt-1 text-sm text-red-400">{errors.totalBua}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Number of Floors
                </label>
                <input
                  type="number"
                  min={1}
                  value={cfg.numberOfFloors || 1}
                  onChange={(e) => {
                    setOverrides({});
                    patchWarehouse({
                      numberOfFloors: Math.max(1, Number(e.target.value) || 1),
                    });
                  }}
                  className={userInputClass}
                />
                {errors.numberOfFloors && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.numberOfFloors}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Total Land Area (sqft)
                </label>
                <input
                  type="number"
                  value={cfg.totalLandArea || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setOverrides({});
                    patchWarehouse({ totalLandArea: val });
                    logOperationalCashOutflow("warehouseTotalLandArea", val, 5);
                  }}
                  className={userInputClass}
                />
                {errors.totalLandArea && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.totalLandArea}
                  </p>
                )}
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
              {hasSpecOverrides && (
                <button
                  type="button"
                  onClick={handleResetToBenchmark}
                  className="shrink-0 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Reset to benchmark
                </button>
              )}
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
                    value={cfg.columnSpacing || autoSpecs.columnSpacing}
                    onChange={(e) =>
                      overrideSpec("columnSpacing", e.target.value)
                    }
                    className={specInputClass(!!overrides.columnSpacing)}
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    ({formatWarehouseGradeLabel(qualityGrade)}{" "}
                    {formatWarehouseSubTypeLabel(warehouseSubType)} Std)
                  </p>
                </div>
                <div>
                  <SpecFieldLabel
                    label="Clear Height (ft)"
                    overridden={!!overrides.clearHeight}
                  />
                  <input
                    type="number"
                    value={cfg.clearHeight || autoSpecs.clearHeight}
                    onChange={(e) =>
                      overrideSpec("clearHeight", Number(e.target.value) || 0)
                    }
                    className={specInputClass(!!overrides.clearHeight)}
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    ({formatWarehouseGradeLabel(qualityGrade)}{" "}
                    {formatWarehouseSubTypeLabel(warehouseSubType)} Std)
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
                    value={cfg.dockDoors ?? autoSpecs.dockDoors}
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
                    value={cfg.driveInDoors ?? autoSpecs.driveInDoors}
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
                    value={cfg.yardArea ?? autoSpecs.yardArea}
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
                    value={cfg.parkingCars ?? autoSpecs.parkingCars}
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
                    value={cfg.parkingTrailers ?? autoSpecs.parkingTrailers}
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
                ["BUA", `${(cfg.totalBua || 0).toLocaleString()} sqft`],
                ["Floors", String(cfg.numberOfFloors || 1)],
                ["Clear Height", `${cfg.clearHeight || autoSpecs.clearHeight} ft`],
                [
                  "Column Spacing",
                  `${cfg.columnSpacing || autoSpecs.columnSpacing} ft`,
                ],
                ["Dock Doors", `${cfg.dockDoors ?? autoSpecs.dockDoors} doors`],
                [
                  "Land Area",
                  `${(cfg.totalLandArea || 0).toLocaleString()} sqft`,
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
                  value={
                    park.numberOfWarehouses === undefined ||
                    park.numberOfWarehouses === null
                      ? 6
                      : park.numberOfWarehouses
                  }
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    // Allow free typing (including single digits like 1, 2, 3)
                    if (!Number.isNaN(val)) {
                      handleParkUnitsChange(val);
                    } else {
                      handleParkUnitsChange(0);
                    }
                  }}
                  onBlur={(e) => handleParkUnitsBlur(e.target.value)}
                  className={userInputClass}
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Min 4 / max 50 (validated when you leave the field)
                </p>
                {errors.numberOfWarehouses && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.numberOfWarehouses}
                  </p>
                )}
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
                  value={park.commonInfrastructurePct ?? 25}
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
                {errors.totalLandArea && activeTab === "park" && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.totalLandArea}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
