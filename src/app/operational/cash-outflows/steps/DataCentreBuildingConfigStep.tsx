"use client";

import { useEffect, useMemo } from "react";
import useFinModelStore, {
  type ProjectInfo,
} from "@/store/useFinModelStore";
import { AiInput } from "@/components/ui/AiInput";
import { extractDataCentrePhase1Basics } from "@/lib/data-centre-ai";
import { logOperationalCashOutflow } from "@/lib/operational-audit-fields";

export type DataCentreBuildingConfigStepErrors = Record<string, string>;

const userInputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";
const readOnlyClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-slate-200";

export function validateDataCentreBuildingConfig(
  projectInfo: Pick<
    ProjectInfo,
    | "dataCentreITLoadCapacity"
    | "dataCentrePowerDensity"
    | "dataCentreWhiteSpaceRatio"
    | "dataCentreTotalLandArea"
  >
): DataCentreBuildingConfigStepErrors {
  const next: DataCentreBuildingConfigStepErrors = {};
  if (
    !projectInfo.dataCentreITLoadCapacity ||
    projectInfo.dataCentreITLoadCapacity <= 0
  ) {
    next.dcITLoad = "IT Load Capacity is required.";
  }
  if (
    !projectInfo.dataCentrePowerDensity ||
    projectInfo.dataCentrePowerDensity <= 0
  ) {
    next.dcPowerDensity = "Power Density is required.";
  }
  if (
    !projectInfo.dataCentreWhiteSpaceRatio ||
    projectInfo.dataCentreWhiteSpaceRatio <= 0
  ) {
    next.dcWhiteSpaceRatio = "White Space Ratio is required.";
  }
  if (
    !projectInfo.dataCentreTotalLandArea ||
    projectInfo.dataCentreTotalLandArea <= 0
  ) {
    next.dcLandArea = "Total Land Area is required.";
  }
  return next;
}

type Props = {
  errors?: DataCentreBuildingConfigStepErrors;
};

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}

export default function DataCentreBuildingConfigStep({ errors = {} }: Props) {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const aiResearchData = useFinModelStore(
    (s) => s.operational.cashOutflows.aiResearchData
  );
  const updateProjectInfo = useFinModelStore((s) => s.updateProjectInfo);

  const patch = (data: Partial<ProjectInfo>, field?: string, value?: string | number) => {
    updateProjectInfo(data, "operational");
    if (field != null && value != null) {
      logOperationalCashOutflow(field, value, 5);
    }
  };

  const aiBasics = useMemo(
    () => extractDataCentrePhase1Basics(aiResearchData),
    [aiResearchData]
  );
  const aiItLoadDensity = aiBasics.itLoadDensity;
  const aiPue = aiBasics.typicalPue;

  // Seed defaults once on mount (do not overwrite user/AI values)
  useEffect(() => {
    const defaults: Partial<ProjectInfo> = {};
    if (
      projectInfo.dataCentreWhiteSpaceRatio == null ||
      projectInfo.dataCentreWhiteSpaceRatio <= 0
    ) {
      defaults.dataCentreWhiteSpaceRatio = 50;
    }
    if (projectInfo.dataCentreNumberOfBuildings == null) {
      defaults.dataCentreNumberOfBuildings = 1;
    }
    if (projectInfo.dataCentreFloorsPerBuilding == null) {
      defaults.dataCentreFloorsPerBuilding = 1;
    }
    if (projectInfo.dataCentreCoolingSystemType == null) {
      defaults.dataCentreCoolingSystemType = "air-cooled";
    }
    if (projectInfo.dataCentreFiberConnectivity == null) {
      defaults.dataCentreFiberConnectivity = "on-net";
    }
    if (Object.keys(defaults).length > 0) {
      updateProjectInfo(defaults, "operational");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dcITLoadKw = (projectInfo.dataCentreITLoadCapacity || 0) * 1000;

  const dcNumberOfRacks = useMemo(() => {
    const density = projectInfo.dataCentrePowerDensity || 1;
    return density > 0 ? Math.round(dcITLoadKw / density) : 0;
  }, [dcITLoadKw, projectInfo.dataCentrePowerDensity]);

  const dcWhiteSpaceArea = useMemo(() => {
    const density = projectInfo.dataCentreITLoadDensity || 0.1;
    return density > 0 ? Math.round(dcITLoadKw / density) : 0;
  }, [dcITLoadKw, projectInfo.dataCentreITLoadDensity]);

  const dcTotalBuildingGFA = useMemo(() => {
    const ratio = (projectInfo.dataCentreWhiteSpaceRatio || 50) / 100;
    return ratio > 0 ? Math.round(dcWhiteSpaceArea / ratio) : 0;
  }, [dcWhiteSpaceArea, projectInfo.dataCentreWhiteSpaceRatio]);

  const dcLandAreaSqft = projectInfo.dataCentreTotalLandArea || 0;

  const dcLandCoverage = useMemo(() => {
    return dcLandAreaSqft > 0
      ? Number(((dcTotalBuildingGFA / dcLandAreaSqft) * 100).toFixed(1))
      : 0;
  }, [dcTotalBuildingGFA, dcLandAreaSqft]);

  // Persist auto-calcs for downstream CapEx / review steps
  useEffect(() => {
    const next: Partial<ProjectInfo> = {};
    if (projectInfo.dataCentreNumberOfRacks !== dcNumberOfRacks) {
      next.dataCentreNumberOfRacks = dcNumberOfRacks;
    }
    if (projectInfo.dataCentreWhiteSpaceArea !== dcWhiteSpaceArea) {
      next.dataCentreWhiteSpaceArea = dcWhiteSpaceArea;
    }
    if (projectInfo.dataCentreTotalBuildingGFA !== dcTotalBuildingGFA) {
      next.dataCentreTotalBuildingGFA = dcTotalBuildingGFA;
    }
    if (projectInfo.dataCentreLandCoverage !== dcLandCoverage) {
      next.dataCentreLandCoverage = dcLandCoverage;
    }
    if (Object.keys(next).length > 0) {
      updateProjectInfo(next, "operational");
    }
  }, [
    dcNumberOfRacks,
    dcWhiteSpaceArea,
    dcTotalBuildingGFA,
    dcLandCoverage,
    projectInfo.dataCentreNumberOfRacks,
    projectInfo.dataCentreWhiteSpaceArea,
    projectInfo.dataCentreTotalBuildingGFA,
    projectInfo.dataCentreLandCoverage,
    updateProjectInfo,
  ]);

  const pueFromAi =
    (aiPue != null && aiPue > 0) ||
    (projectInfo.dataCentrePUE != null && projectInfo.dataCentrePUE > 0);
  const densityFromAi =
    (aiItLoadDensity != null && aiItLoadDensity > 0) ||
    (projectInfo.dataCentreITLoadDensity != null &&
      projectInfo.dataCentreITLoadDensity > 0);

  const densityOverridden =
    aiItLoadDensity != null &&
    projectInfo.dataCentreITLoadDensity != null &&
    Math.abs(projectInfo.dataCentreITLoadDensity - aiItLoadDensity) > 1e-9;
  const pueOverridden =
    aiPue != null &&
    projectInfo.dataCentrePUE != null &&
    Math.abs(projectInfo.dataCentrePUE - aiPue) > 1e-9;

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Step 5 of 13
        </p>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Data Centre Building Configuration
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Enter IT load and site parameters. Racks, white space, GFA, and land
          coverage calculate automatically.
        </p>
      </div>

      {/* 1. Power & IT Capacity */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">
          Power &amp; IT Capacity
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              IT Load Capacity (MW)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={projectInfo.dataCentreITLoadCapacity ?? ""}
              onChange={(e) => {
                const val = Number(e.target.value);
                patch(
                  { dataCentreITLoadCapacity: val },
                  "dataCentreITLoadCapacity",
                  val
                );
              }}
              className={userInputClass}
              placeholder="e.g. 5"
            />
            {errors.dcITLoad && (
              <p className="mt-1 text-sm text-red-400">{errors.dcITLoad}</p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Power Density (kW per rack)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={projectInfo.dataCentrePowerDensity ?? ""}
              onChange={(e) => {
                const val = Number(e.target.value);
                patch(
                  { dataCentrePowerDensity: val },
                  "dataCentrePowerDensity",
                  val
                );
              }}
              className={userInputClass}
              placeholder="e.g. 10"
            />
            {errors.dcPowerDensity && (
              <p className="mt-1 text-sm text-red-400">{errors.dcPowerDensity}</p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Number of Racks
            </label>
            <div className={readOnlyClass}>{formatNumber(dcNumberOfRacks)}</div>
            <p className="mt-1 text-xs text-slate-500">
              Auto: IT Load (kW) ÷ Power Density
            </p>
          </div>
          <AiInput
            label="IT Load Density (kW/sqft)"
            value={projectInfo.dataCentreITLoadDensity ?? ""}
            onChange={(v) => {
              const val = typeof v === "number" ? v : Number(v);
              if (!Number.isFinite(val)) {
                patch(
                  { dataCentreITLoadDensity: undefined },
                  "dataCentreITLoadDensity",
                  0
                );
                return;
              }
              patch(
                { dataCentreITLoadDensity: val },
                "dataCentreITLoadDensity",
                val
              );
            }}
            type="number"
            step={0.001}
            min={0}
            placeholder="e.g. 0.15"
            isAiGenerated={densityFromAi}
            isManualOverride={densityOverridden}
            benchmarkValue={aiItLoadDensity}
            helperText={
              densityFromAi
                ? "From AI research (C1S4)"
                : "Awaiting AI research — using 0.1 kW/sqft fallback for calcs"
            }
          />
        </div>
      </div>

      {/* 2. White Space Area */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">White Space Area</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              White Space Area (sqft)
            </label>
            <div className={readOnlyClass}>{formatNumber(dcWhiteSpaceArea)}</div>
            <p className="mt-1 text-xs text-slate-500">
              Auto: IT Load (kW) ÷ IT Load Density
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              White Space Ratio (%)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={projectInfo.dataCentreWhiteSpaceRatio ?? 50}
              onChange={(e) => {
                const val = Number(e.target.value);
                patch(
                  { dataCentreWhiteSpaceRatio: val },
                  "dataCentreWhiteSpaceRatio",
                  val
                );
              }}
              className={userInputClass}
            />
            {errors.dcWhiteSpaceRatio && (
              <p className="mt-1 text-sm text-red-400">
                {errors.dcWhiteSpaceRatio}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Total Building GFA (sqft)
            </label>
            <div className={readOnlyClass}>
              {formatNumber(dcTotalBuildingGFA)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Auto: White Space ÷ Ratio
            </p>
          </div>
        </div>
      </div>

      {/* 3. Critical Infrastructure */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">
          Critical Infrastructure
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Cooling System Type
            </label>
            <select
              value={projectInfo.dataCentreCoolingSystemType ?? "air-cooled"}
              onChange={(e) => {
                const val = e.target.value as NonNullable<
                  ProjectInfo["dataCentreCoolingSystemType"]
                >;
                patch(
                  { dataCentreCoolingSystemType: val },
                  "dataCentreCoolingSystemType",
                  val
                );
              }}
              className={userInputClass}
            >
              <option value="air-cooled">Air-Cooled</option>
              <option value="liquid-cooled">Liquid-Cooled</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <AiInput
            label="Cooling Efficiency (PUE)"
            value={projectInfo.dataCentrePUE ?? ""}
            onChange={(v) => {
              const val = typeof v === "number" ? v : Number(v);
              if (!Number.isFinite(val)) {
                patch({ dataCentrePUE: undefined }, "dataCentrePUE", 0);
                return;
              }
              patch({ dataCentrePUE: val }, "dataCentrePUE", val);
            }}
            type="number"
            step={0.01}
            min={1}
            max={3}
            placeholder="e.g. 1.35"
            isAiGenerated={pueFromAi}
            isManualOverride={pueOverridden}
            benchmarkValue={aiPue}
            helperText={
              pueFromAi
                ? "Pre-filled from AI research — edit to override"
                : "Enter design PUE (e.g. 1.3 – 1.6)"
            }
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              UPS / Backup Power (MW)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={projectInfo.dataCentreUPSBackupPower ?? ""}
              onChange={(e) => {
                const val = Number(e.target.value);
                patch(
                  { dataCentreUPSBackupPower: val },
                  "dataCentreUPSBackupPower",
                  val
                );
              }}
              className={userInputClass}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Number of Generators
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={projectInfo.dataCentreNumberOfGenerators ?? ""}
              onChange={(e) => {
                const val = Number(e.target.value);
                patch(
                  { dataCentreNumberOfGenerators: val },
                  "dataCentreNumberOfGenerators",
                  val
                );
              }}
              className={userInputClass}
            />
          </div>
        </div>
      </div>

      {/* 4. Connectivity */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">Connectivity</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Fiber Connectivity
            </label>
            <select
              value={projectInfo.dataCentreFiberConnectivity ?? "on-net"}
              onChange={(e) => {
                const val = e.target.value as NonNullable<
                  ProjectInfo["dataCentreFiberConnectivity"]
                >;
                patch(
                  { dataCentreFiberConnectivity: val },
                  "dataCentreFiberConnectivity",
                  val
                );
              }}
              className={userInputClass}
            >
              <option value="on-net">On-Net</option>
              <option value="near-net">Near-Net</option>
              <option value="off-net">Off-Net</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Number of Diverse Fiber Paths
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={projectInfo.dataCentreNumberOfDiverseFiberPaths ?? ""}
              onChange={(e) => {
                const val = Number(e.target.value);
                patch(
                  { dataCentreNumberOfDiverseFiberPaths: val },
                  "dataCentreNumberOfDiverseFiberPaths",
                  val
                );
              }}
              className={userInputClass}
            />
          </div>
        </div>
      </div>

      {/* 5. Building Configuration */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">
          Building Configuration
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Number of Buildings / Halls
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={projectInfo.dataCentreNumberOfBuildings ?? 1}
              onChange={(e) => {
                const val = Number(e.target.value);
                patch(
                  { dataCentreNumberOfBuildings: val },
                  "dataCentreNumberOfBuildings",
                  val
                );
              }}
              className={userInputClass}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Floors per Building
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={projectInfo.dataCentreFloorsPerBuilding ?? 1}
              onChange={(e) => {
                const val = Number(e.target.value);
                patch(
                  { dataCentreFloorsPerBuilding: val },
                  "dataCentreFloorsPerBuilding",
                  val
                );
              }}
              className={userInputClass}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Building Height (ft)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={projectInfo.dataCentreBuildingHeight ?? ""}
              onChange={(e) => {
                const val = Number(e.target.value);
                patch(
                  { dataCentreBuildingHeight: val },
                  "dataCentreBuildingHeight",
                  val
                );
              }}
              className={userInputClass}
            />
          </div>
        </div>
      </div>

      {/* 6. Land */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">Land</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Total Land Area (sqft)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={projectInfo.dataCentreTotalLandArea ?? ""}
              onChange={(e) => {
                const val = Number(e.target.value);
                patch(
                  { dataCentreTotalLandArea: val },
                  "dataCentreTotalLandArea",
                  val
                );
              }}
              className={userInputClass}
              placeholder="e.g. 200000"
            />
            {errors.dcLandArea && (
              <p className="mt-1 text-sm text-red-400">{errors.dcLandArea}</p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Land Coverage (%)
            </label>
            <div className={readOnlyClass}>{dcLandCoverage.toFixed(1)}%</div>
            <p className="mt-1 text-xs text-slate-500">
              Auto: Building GFA ÷ Land Area (sqft)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
