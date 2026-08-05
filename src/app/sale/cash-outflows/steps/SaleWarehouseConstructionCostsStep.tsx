"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import useSaleModelStore, {
  type ProjectInfo,
} from "@/store/useSaleModelStore";
import {
  DEFAULT_WAREHOUSE_COSTS,
  calculateWarehouseCosts,
  type IndustrialParkConfig,
  type WarehouseConfig,
  type WarehouseCosts,
} from "@/store/useFinModelStore";
import { DEFAULT_SALE_WAREHOUSE_SINGLE } from "./SaleWarehouseBuildingConfigStep";

export type SaleWarehouseConstructionCostsErrors = Record<string, string>;

export function validateSaleWarehouseConstructionCosts(cashOutflows: {
  warehouseCosts?: WarehouseCosts;
  salesWarehouseConfigType?: string;
}): SaleWarehouseConstructionCostsErrors {
  const next: SaleWarehouseConstructionCostsErrors = {};
  const costs = cashOutflows.warehouseCosts;
  if (!costs) {
    next.warehouseCosts = "Construction cost rates are required.";
    return next;
  }
  if ((costs.buildingShellRate || 0) <= 0) {
    next.buildingShellRate = "Building rate must be greater than 0.";
  }
  if (
    (costs.professionalFeesPct || 0) < 0 ||
    (costs.professionalFeesPct || 0) > 30
  ) {
    next.professionalFeesPct = "Professional fees should be between 0% and 30%.";
  }
  if ((costs.siteYardRate || 0) < 0) {
    next.siteYardRate = "Yard rate cannot be negative.";
  }
  if ((costs.costPerDockDoor || 0) < 0) {
    next.costPerDockDoor = "Cost per dock door cannot be negative.";
  }
  if (
    cashOutflows.salesWarehouseConfigType === "industrial-park" &&
    (costs.infrastructureRate ?? costs.roadRate ?? 0) < 0
  ) {
    next.infrastructureRate = "Infrastructure rate cannot be negative.";
  }
  return next;
}

type Props = {
  errors?: SaleWarehouseConstructionCostsErrors;
};

type RateFieldKey =
  | "buildingShellRate"
  | "siteYardRate"
  | "carParkingRate"
  | "trailerParkingRate"
  | "costPerDockDoor"
  | "costPerDriveInDoor"
  | "rackingCost"
  | "refrigerationCost"
  | "automationCost"
  | "infrastructureRate"
  | "professionalFeesPct";

type CostSection =
  | "building"
  | "site"
  | "loading"
  | "specialised"
  | "infrastructure"
  | "professional";

const SECTION_FIELDS: Record<CostSection, RateFieldKey[]> = {
  building: ["buildingShellRate"],
  site: ["siteYardRate", "carParkingRate", "trailerParkingRate"],
  loading: ["costPerDockDoor", "costPerDriveInDoor"],
  specialised: ["rackingCost", "refrigerationCost", "automationCost"],
  infrastructure: ["infrastructureRate"],
  professional: ["professionalFeesPct"],
};

const SECTION_RESET_LABEL: Record<CostSection, string> = {
  building: "Reset building & shell",
  site: "Reset site & yard works",
  loading: "Reset loading & access",
  specialised: "Reset specialised systems",
  infrastructure: "Reset common infrastructure",
  professional: "Reset professional fees",
};

function money(n: number | undefined): string {
  return Math.round(n || 0).toLocaleString();
}

const qtyClass =
  "w-full cursor-not-allowed rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-slate-400";
const autoMoneyClass =
  "w-full cursor-not-allowed rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 font-semibold text-emerald-400";

function UnitsBadge({ units, show }: { units: number; show: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-2 inline-flex items-center rounded-full border border-emerald-700/50 bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
      × Number of Units [{units}]
    </span>
  );
}

function AiBadge() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white">
      AI
    </span>
  );
}

function OverrideBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-700/50 bg-amber-900/30 px-2 py-0.5 text-[10px] text-amber-300">
      Override
    </span>
  );
}

function rateInputClass(hasAi: boolean, isOverridden: boolean): string {
  const base =
    "w-full rounded-lg border bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2";
  if (isOverridden) return `${base} border-amber-500 focus:ring-amber-500`;
  if (hasAi) return `${base} border-blue-500 focus:ring-blue-500`;
  return `${base} border-slate-600 focus:ring-emerald-500`;
}

function RateInput({
  label,
  value,
  aiValue,
  isOverridden,
  onChange,
  error,
  unit,
}: {
  label: string;
  value: number;
  aiValue: number | undefined;
  isOverridden: boolean;
  onChange: (val: number) => void;
  error?: string;
  unit?: string;
}) {
  const hasAi = aiValue != null && Number.isFinite(aiValue);
  return (
    <div>
      <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">
        {label}
        {isOverridden ? <OverrideBadge /> : hasAi ? <AiBadge /> : null}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className={`${rateInputClass(hasAi, isOverridden)}${unit ? " pr-12" : ""}`}
        />
        {unit ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {unit}
          </span>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}

function SectionCard({
  title,
  unitsBadge,
  section,
  overriddenRates,
  onResetSection,
  children,
}: {
  title: ReactNode;
  unitsBadge?: ReactNode;
  section: CostSection;
  overriddenRates: Set<string>;
  onResetSection: (section: CostSection) => void;
  children: ReactNode;
}) {
  const sectionHasOverride = SECTION_FIELDS[section].some((f) =>
    overriddenRates.has(f)
  );
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h4 className="flex flex-wrap items-center text-base font-medium text-white">
          {title}
          {unitsBadge}
        </h4>
        {sectionHasOverride && (
          <button
            type="button"
            onClick={() => onResetSection(section)}
            className="shrink-0 text-xs text-slate-400 hover:text-white"
          >
            {SECTION_RESET_LABEL[section]}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function toWarehouseConfig(
  single: NonNullable<ProjectInfo["salesWarehouseSingle"]>
): WarehouseConfig {
  return {
    totalBua: single.bua || 0,
    clearHeight: single.clearHeight || 0,
    columnSpacing: single.columnSpacing || "40x40",
    numberOfFloors: single.floors || 1,
    dockDoors: single.dockDoors || 0,
    driveInDoors: single.driveInDoors || 0,
    siteCoveragePct: single.siteCoveragePct || 0,
    yardArea: single.yardArea || 0,
    parkingCars: single.parkingCars || 0,
    parkingTrailers: single.parkingTrailers || 0,
    totalLandArea: single.landArea || 0,
    landCoveragePct: single.siteCoveragePct || 0,
  };
}

function toIndustrialParkConfig(
  park: NonNullable<ProjectInfo["salesWarehousePark"]>,
  single: NonNullable<ProjectInfo["salesWarehouseSingle"]>
): IndustrialParkConfig {
  const units = park.numberOfUnits || 0;
  const warehouseLand = units * (single.landArea || 0);
  const pct = park.commonInfrastructureAreaPct || 0;
  const commonArea = Math.round(warehouseLand * (pct / 100));
  return {
    numberOfWarehouses: units,
    phasing: "SINGLE_PHASE",
    warehouseMix: [],
    commonInfrastructurePct: pct,
    warehouseLandArea: park.warehouseLandArea || warehouseLand,
    commonInfrastructureArea: commonArea,
    internalRoadsArea: 0,
    drainageUtilitiesCost: 0,
    securityPerimeterCost: 0,
    landscapingCost: 0,
    totalLandArea: park.totalLandArea || warehouseLand + commonArea,
    landCoveragePct: 0,
  };
}

/** Sync Ops-style warehouseCosts into Sale flat cost fields used elsewhere. */
function flatFieldsFromWarehouseCosts(costs: WarehouseCosts) {
  return {
    warehouseBuildingRate: costs.buildingShellRate,
    warehouseSiteYardRate: costs.siteYardRate,
    warehouseLoadingAccessCost: costs.loadingAccessCost,
    warehouseSpecialisedSystemsCost: costs.specialisedSystemsCost,
    warehouseCommonInfraCost: costs.commonInfrastructureCost,
  };
}

function SaleWarehouseBenchmarkBar() {
  const projectInfo = useSaleModelStore((s) => s.projectInfo);
  const country = projectInfo.country?.trim() || "—";
  const subType = projectInfo.salesWarehouseSubType
    ? projectInfo.salesWarehouseSubType
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "—";
  const grade =
    projectInfo.salesQualityGrade === "grade-b"
      ? "Grade B"
      : projectInfo.salesQualityGrade === "grade-a"
        ? "Grade A"
        : "—";
  const profile = `Warehouse / Industrial · ${country} · ${subType} · ${grade}`;

  return (
    <div className="flex flex-wrap items-center">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Benchmark
      </span>
      <div className="ml-3 inline-flex items-center rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs text-slate-300">
        {profile}
      </div>
    </div>
  );
}

export default function SaleWarehouseConstructionCostsStep({
  errors = {},
}: Props) {
  const projectInfo = useSaleModelStore((s) => s.projectInfo);
  const cashOutflows = useSaleModelStore((s) => s.cashOutflows);
  const updateCashOutflowsForStream = useSaleModelStore(
    (s) => s.updateCashOutflows
  );

  const isPark =
    projectInfo.salesWarehouseConfigType === "industrial-park";
  const developmentType = isPark ? "INDUSTRIAL_PARK" : "SINGLE_WAREHOUSE";

  const single = useMemo(
    () => ({
      ...DEFAULT_SALE_WAREHOUSE_SINGLE,
      ...projectInfo.salesWarehouseSingle,
    }),
    [projectInfo.salesWarehouseSingle]
  );
  const warehouseConfig = useMemo(
    () => toWarehouseConfig(single),
    [single]
  );
  const industrialParkConfig = useMemo(() => {
    if (!isPark || !projectInfo.salesWarehousePark) return undefined;
    return toIndustrialParkConfig(projectInfo.salesWarehousePark, single);
  }, [isPark, projectInfo.salesWarehousePark, single]);

  const warehouseCosts = cashOutflows.warehouseCosts;
  const aiResearch = cashOutflows.aiResearchData;

  const [overriddenRates, setOverriddenRates] = useState<Set<RateFieldKey>>(
    () => new Set()
  );

  const units = isPark
    ? Math.max(1, projectInfo.salesWarehousePark?.numberOfUnits || 1)
    : 1;

  const aiRates = useMemo(() => {
    const rates = aiResearch?.c1_development?.construction_rates as
      | {
          building_rate_psf?: number;
          site_yard_rate_psf?: number;
          car_parking_cost_per_space?: number;
          trailer_parking_cost_per_space?: number;
          dock_door_cost_per_unit?: number;
          drive_in_door_cost_per_unit?: number;
          infrastructure_rate_psf?: number;
        }
      | undefined;
    const soft = aiResearch?.c1_development?.soft_costs;
    return {
      buildingShellRate: rates?.building_rate_psf,
      siteYardRate: rates?.site_yard_rate_psf,
      carParkingRate: rates?.car_parking_cost_per_space,
      trailerParkingRate: rates?.trailer_parking_cost_per_space,
      costPerDockDoor: rates?.dock_door_cost_per_unit,
      costPerDriveInDoor: rates?.drive_in_door_cost_per_unit,
      infrastructureRate: rates?.infrastructure_rate_psf,
      professionalFeesPct: soft?.sc_percentage,
      rackingCost: undefined as number | undefined,
      refrigerationCost: undefined as number | undefined,
      automationCost: undefined as number | undefined,
    } satisfies Record<RateFieldKey, number | undefined>;
  }, [aiResearch]);

  const benchmarkRates = useMemo(() => {
    const d = DEFAULT_WAREHOUSE_COSTS;
    return {
      buildingShellRate:
        aiRates.buildingShellRate ??
        (isPark ? 100 : d.buildingShellRate),
      siteYardRate: aiRates.siteYardRate ?? d.siteYardRate,
      carParkingRate: aiRates.carParkingRate ?? d.carParkingRate ?? 0,
      trailerParkingRate:
        aiRates.trailerParkingRate ?? d.trailerParkingRate ?? 0,
      costPerDockDoor: aiRates.costPerDockDoor ?? d.costPerDockDoor,
      costPerDriveInDoor:
        aiRates.costPerDriveInDoor ?? d.costPerDriveInDoor ?? 0,
      rackingCost: aiRates.rackingCost ?? d.rackingCost,
      refrigerationCost: aiRates.refrigerationCost ?? d.refrigerationCost,
      automationCost: aiRates.automationCost ?? d.automationCost,
      infrastructureRate:
        aiRates.infrastructureRate ??
        d.infrastructureRate ??
        d.roadRate,
      professionalFeesPct:
        aiRates.professionalFeesPct ?? d.professionalFeesPct,
    } satisfies Record<RateFieldKey, number>;
  }, [aiRates, isPark]);

  useEffect(() => {
    if (!warehouseCosts) {
      const seeded: WarehouseCosts = {
        ...DEFAULT_WAREHOUSE_COSTS,
        buildingShellRate: isPark
          ? 100
          : cashOutflows.warehouseBuildingRate ||
            DEFAULT_WAREHOUSE_COSTS.buildingShellRate,
        siteYardRate:
          cashOutflows.warehouseSiteYardRate ||
          DEFAULT_WAREHOUSE_COSTS.siteYardRate,
      };
      updateCashOutflowsForStream({
        warehouseCosts: seeded,
        ...flatFieldsFromWarehouseCosts(seeded),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!warehouseCosts) return;
    const config = isPark ? industrialParkConfig : warehouseConfig;
    if (!config) return;

    const updated = calculateWarehouseCosts(
      config,
      warehouseCosts,
      developmentType,
      warehouseConfig
    );

    const keys: (keyof WarehouseCosts)[] = [
      "buildingShellCost",
      "siteYardWorksCost",
      "carParkingCost",
      "trailerParkingCost",
      "loadingAccessCost",
      "specialisedSystemsCost",
      "roadCost",
      "commonInfrastructureCost",
      "professionalFees",
    ];
    const hasChanged = keys.some(
      (key) => Math.abs((updated[key] || 0) - (warehouseCosts[key] || 0)) > 0.5
    );

    if (hasChanged) {
      updateCashOutflowsForStream({
        warehouseCosts: updated,
        ...flatFieldsFromWarehouseCosts(updated),
      });
    }
  }, [
    developmentType,
    isPark,
    warehouseConfig,
    industrialParkConfig,
    warehouseCosts,
    updateCashOutflowsForStream,
  ]);

  const quantities = useMemo(() => {
    const bua = (warehouseConfig.totalBua || 0) * units;
    const yard = (warehouseConfig.yardArea || 0) * units;
    const docks = (warehouseConfig.dockDoors || 0) * units;
    const driveIns = (warehouseConfig.driveInDoors || 0) * units;
    const cars = (warehouseConfig.parkingCars || 0) * units;
    const trailers = (warehouseConfig.parkingTrailers || 0) * units;
    const commonArea = industrialParkConfig?.commonInfrastructureArea || 0;
    return { bua, yard, docks, driveIns, cars, trailers, commonArea };
  }, [warehouseConfig, units, industrialParkConfig?.commonInfrastructureArea]);

  const patchCosts = (partial: Partial<WarehouseCosts>) => {
    const next: WarehouseCosts = {
      ...DEFAULT_WAREHOUSE_COSTS,
      ...warehouseCosts,
      ...partial,
    };
    updateCashOutflowsForStream({
      warehouseCosts: next,
      ...flatFieldsFromWarehouseCosts(next),
    });
  };

  const markOverrideAndPatch = (
    fieldKey: RateFieldKey,
    partial: Partial<WarehouseCosts>
  ) => {
    setOverriddenRates((prev) => new Set(prev).add(fieldKey));
    patchCosts(partial);
  };

  const applyRateFields = (fields: RateFieldKey[]) => {
    const partial: Partial<WarehouseCosts> = {};
    for (const key of fields) {
      const val = benchmarkRates[key];
      if (key === "infrastructureRate") {
        partial.infrastructureRate = val;
        partial.roadRate = val;
      } else {
        (partial as Record<string, number>)[key] = val;
      }
    }
    patchCosts(partial);
  };

  const handleResetSection = (section: CostSection) => {
    const fields = SECTION_FIELDS[section];
    setOverriddenRates((prev) => {
      const next = new Set(prev);
      fields.forEach((f) => next.delete(f));
      return next;
    });
    applyRateFields(fields);
  };

  const handleResetAllToBenchmark = () => {
    const allFields = (Object.keys(SECTION_FIELDS) as CostSection[]).flatMap(
      (s) => SECTION_FIELDS[s]
    );
    setOverriddenRates(new Set());
    applyRateFields(allFields);
  };

  const costs = warehouseCosts ?? DEFAULT_WAREHOUSE_COSTS;

  const hardTotal =
    (costs.buildingShellCost || 0) +
    (costs.siteYardWorksCost || 0) +
    (costs.loadingAccessCost || 0) +
    (costs.specialisedSystemsCost || 0) +
    (isPark ? costs.commonInfrastructureCost || 0 : 0);

  const grandTotal = hardTotal + (costs.professionalFees || 0);
  const hasAnyOverride = overriddenRates.size > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-6 border-b border-slate-700 pb-4 text-xl font-bold text-white">
          Construction Costs —{" "}
          {isPark ? "Industrial Park" : "Single Warehouse"}
        </h2>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <SaleWarehouseBenchmarkBar />
            {hasAnyOverride && (
              <span className="inline-flex items-center rounded-full border border-amber-700/50 bg-amber-900/30 px-3 py-1 text-xs text-amber-300">
                Manual overrides
              </span>
            )}
          </div>
          {hasAnyOverride && (
            <button
              type="button"
              onClick={handleResetAllToBenchmark}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              Reset to benchmark
            </button>
          )}
        </div>
        <p className="text-sm text-slate-400">
          Quantities are locked from Step 5. Rates use AI research when
          available. Totals calculate automatically
          {isPark ? ` and scale by ${units} units` : ""}.
        </p>
      </div>

      <SectionCard
        title="Building & shell"
        unitsBadge={<UnitsBadge units={units} show={isPark} />}
        section="building"
        overriddenRates={overriddenRates}
        onResetSection={handleResetSection}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Building BUA (sqft) [Auto]
            </label>
            <input
              type="number"
              value={quantities.bua}
              readOnly
              className={qtyClass}
            />
          </div>
          <RateInput
            label="Building Rate (/sqft)"
            value={costs.buildingShellRate || 0}
            aiValue={aiRates.buildingShellRate}
            isOverridden={overriddenRates.has("buildingShellRate")}
            onChange={(val) =>
              markOverrideAndPatch("buildingShellRate", {
                buildingShellRate: val,
              })
            }
            error={errors.buildingShellRate}
          />
          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Building Cost [Auto]
            </label>
            <input
              type="text"
              value={money(costs.buildingShellCost)}
              readOnly
              className={autoMoneyClass}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Site & yard works"
        unitsBadge={<UnitsBadge units={units} show={isPark} />}
        section="site"
        overriddenRates={overriddenRates}
        onResetSection={handleResetSection}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Yard Area (sqft) [Auto]
            </label>
            <input
              type="number"
              value={quantities.yard}
              readOnly
              className={qtyClass}
            />
          </div>
          <RateInput
            label="Yard Rate (/sqft)"
            value={costs.siteYardRate || 0}
            aiValue={aiRates.siteYardRate}
            isOverridden={overriddenRates.has("siteYardRate")}
            onChange={(val) =>
              markOverrideAndPatch("siteYardRate", { siteYardRate: val })
            }
            error={errors.siteYardRate}
          />
          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Yard Cost [Auto]
            </label>
            <input
              type="text"
              value={money(
                (costs.siteYardWorksCost || 0) -
                  (costs.carParkingCost || 0) -
                  (costs.trailerParkingCost || 0)
              )}
              readOnly
              className={autoMoneyClass}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-700 pt-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Car Parking Stalls [Auto]
            </label>
            <input
              type="number"
              value={quantities.cars}
              readOnly
              className={qtyClass}
            />
          </div>
          <RateInput
            label="Car Parking Rate (/stall)"
            value={costs.carParkingRate || 0}
            aiValue={aiRates.carParkingRate}
            isOverridden={overriddenRates.has("carParkingRate")}
            onChange={(val) =>
              markOverrideAndPatch("carParkingRate", { carParkingRate: val })
            }
          />
          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Car Parking Cost [Auto]
            </label>
            <input
              type="text"
              value={money(costs.carParkingCost)}
              readOnly
              className={autoMoneyClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Trailer Parking Stalls [Auto]
            </label>
            <input
              type="number"
              value={quantities.trailers}
              readOnly
              className={qtyClass}
            />
          </div>
          <RateInput
            label="Trailer Parking Rate (/stall)"
            value={costs.trailerParkingRate || 0}
            aiValue={aiRates.trailerParkingRate}
            isOverridden={overriddenRates.has("trailerParkingRate")}
            onChange={(val) =>
              markOverrideAndPatch("trailerParkingRate", {
                trailerParkingRate: val,
              })
            }
          />
          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Trailer Parking Cost [Auto]
            </label>
            <input
              type="text"
              value={money(costs.trailerParkingCost)}
              readOnly
              className={autoMoneyClass}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Loading & access"
        unitsBadge={<UnitsBadge units={units} show={isPark} />}
        section="loading"
        overriddenRates={overriddenRates}
        onResetSection={handleResetSection}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Dock Doors [Auto]
            </label>
            <input
              type="number"
              value={quantities.docks}
              readOnly
              className={qtyClass}
            />
          </div>
          <RateInput
            label="Cost per Dock Door"
            value={costs.costPerDockDoor || 0}
            aiValue={aiRates.costPerDockDoor}
            isOverridden={overriddenRates.has("costPerDockDoor")}
            onChange={(val) =>
              markOverrideAndPatch("costPerDockDoor", {
                costPerDockDoor: val,
              })
            }
            error={errors.costPerDockDoor}
          />
          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Drive-In Doors [Auto]
            </label>
            <input
              type="number"
              value={quantities.driveIns}
              readOnly
              className={qtyClass}
            />
          </div>
          <RateInput
            label="Cost per Drive-In Door"
            value={costs.costPerDriveInDoor || 0}
            aiValue={aiRates.costPerDriveInDoor}
            isOverridden={overriddenRates.has("costPerDriveInDoor")}
            onChange={(val) =>
              markOverrideAndPatch("costPerDriveInDoor", {
                costPerDriveInDoor: val,
              })
            }
          />
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-400">
              Loading Cost [Auto]
            </label>
            <input
              type="text"
              value={money(costs.loadingAccessCost)}
              readOnly
              className={autoMoneyClass}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Specialised systems"
        unitsBadge={<UnitsBadge units={units} show={isPark} />}
        section="specialised"
        overriddenRates={overriddenRates}
        onResetSection={handleResetSection}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RateInput
            label={`Racking / Shelving${isPark ? " (per unit)" : ""}`}
            value={costs.rackingCost || 0}
            aiValue={aiRates.rackingCost}
            isOverridden={overriddenRates.has("rackingCost")}
            onChange={(val) =>
              markOverrideAndPatch("rackingCost", { rackingCost: val })
            }
          />
          <RateInput
            label={`Refrigeration / Cold Storage${isPark ? " (per unit)" : ""}`}
            value={costs.refrigerationCost || 0}
            aiValue={aiRates.refrigerationCost}
            isOverridden={overriddenRates.has("refrigerationCost")}
            onChange={(val) =>
              markOverrideAndPatch("refrigerationCost", {
                refrigerationCost: val,
              })
            }
          />
          <RateInput
            label={`Automation / Conveyors${isPark ? " (per unit)" : ""}`}
            value={costs.automationCost || 0}
            aiValue={aiRates.automationCost}
            isOverridden={overriddenRates.has("automationCost")}
            onChange={(val) =>
              markOverrideAndPatch("automationCost", { automationCost: val })
            }
          />
          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Total Specialised Systems [Auto]
            </label>
            <input
              type="text"
              value={money(costs.specialisedSystemsCost)}
              readOnly
              className={autoMoneyClass}
            />
          </div>
        </div>
      </SectionCard>

      {isPark && (
        <SectionCard
          title="Common Infrastructure"
          section="infrastructure"
          overriddenRates={overriddenRates}
          onResetSection={handleResetSection}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-slate-400">
                Common Infrastructure Area (sqft) [Auto]
              </label>
              <input
                type="number"
                value={quantities.commonArea}
                readOnly
                className={qtyClass}
              />
            </div>
            <RateInput
              label="Infrastructure Rate (/sqft)"
              value={costs.infrastructureRate ?? costs.roadRate ?? 0}
              aiValue={aiRates.infrastructureRate}
              isOverridden={overriddenRates.has("infrastructureRate")}
              onChange={(val) =>
                markOverrideAndPatch("infrastructureRate", {
                  infrastructureRate: val,
                  roadRate: val,
                })
              }
              error={errors.infrastructureRate}
            />
            <div>
              <label className="mb-1 block text-sm text-slate-400">
                Common Infrastructure Cost [Auto]
              </label>
              <input
                type="text"
                value={money(costs.commonInfrastructureCost)}
                readOnly
                className={autoMoneyClass}
              />
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Professional fees"
        section="professional"
        overriddenRates={overriddenRates}
        onResetSection={handleResetSection}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RateInput
            label="Professional Fees (%)"
            value={costs.professionalFeesPct || 0}
            aiValue={aiRates.professionalFeesPct}
            isOverridden={overriddenRates.has("professionalFeesPct")}
            onChange={(val) =>
              markOverrideAndPatch("professionalFeesPct", {
                professionalFeesPct: val,
              })
            }
            error={errors.professionalFeesPct}
            unit="%"
          />
          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Professional Fees [Auto]
            </label>
            <input
              type="text"
              value={money(costs.professionalFees)}
              readOnly
              className={autoMoneyClass}
            />
          </div>
        </div>
      </SectionCard>

      <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm text-slate-300">
            Estimated hard costs + fees
          </span>
          <span className="font-mono text-lg font-semibold text-emerald-400">
            {money(grandTotal)}
          </span>
        </div>
      </div>
      {errors.warehouseBaseCC ? (
        <p className="text-sm text-red-400">{errors.warehouseBaseCC}</p>
      ) : null}
      {errors.warehouseCosts ? (
        <p className="text-sm text-red-400">{errors.warehouseCosts}</p>
      ) : null}
    </div>
  );
}
