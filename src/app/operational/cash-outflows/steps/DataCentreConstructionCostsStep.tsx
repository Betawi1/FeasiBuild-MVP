"use client";

import { useEffect, useMemo } from "react";
import useFinModelStore, {
  type ProjectInfo,
} from "@/store/useFinModelStore";
import { AiInput } from "@/components/ui/AiInput";
import { extractDataCentreCapExRates } from "@/lib/data-centre-ai";
import { logOperationalCashOutflow } from "@/lib/operational-audit-fields";

export type DataCentreConstructionCostsStepErrors = Record<string, string>;

const readOnlyClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-slate-200";

/** Exact CapEx formulas from Data Centre C1S6 brainstorming. */
export function resolveDataCentreCapEx(projectInfo: ProjectInfo): {
  buildingBua: number;
  itLoadMw: number;
  buildingCost: number;
  meElectrical: number;
  meCooling: number;
  meCost: number;
  itHardwareCost: number;
  baseForFeesAndContingency: number;
  professionalFees: number;
  contingency: number;
  /** Hard costs before contingency (building + M&E + IT + fees). */
  hardBeforeContingency: number;
  totalCapEx: number;
} {
  const buildingBua = projectInfo.dataCentreTotalBuildingGFA || 0;
  const itLoadMw = projectInfo.dataCentreITLoadCapacity || 0;
  const buildingCost =
    buildingBua * (projectInfo.dataCentreBuildingRate || 0);
  const meElectrical =
    itLoadMw * (projectInfo.dataCentreMECostPerMWElectrical || 0);
  const meCooling =
    itLoadMw * (projectInfo.dataCentreMECostPerMWCooling || 0);
  const meCost = meElectrical + meCooling;
  const itHardwareCost = projectInfo.dataCentreITHardwareProvidedByOperator
    ? itLoadMw * (projectInfo.dataCentreITHardwareCostPerMW || 0)
    : 0;
  // IT Hardware excluded from professional fees / contingency base
  const baseForFeesAndContingency = buildingCost + meCost;
  const professionalFees =
    baseForFeesAndContingency *
    ((projectInfo.dataCentreProfessionalFeesPercent || 0) / 100);
  const contingency =
    baseForFeesAndContingency *
    ((projectInfo.dataCentreContingencyPercent || 0) / 100);
  const hardBeforeContingency =
    buildingCost + meCost + itHardwareCost + professionalFees;
  const totalCapEx =
    buildingCost + meCost + itHardwareCost + professionalFees + contingency;

  return {
    buildingBua,
    itLoadMw,
    buildingCost,
    meElectrical,
    meCooling,
    meCost,
    itHardwareCost,
    baseForFeesAndContingency,
    professionalFees,
    contingency,
    hardBeforeContingency,
    totalCapEx,
  };
}

export function validateDataCentreConstructionCosts(
  projectInfo: Pick<
    ProjectInfo,
    | "dataCentreBuildingRate"
    | "dataCentreMECostPerMWElectrical"
    | "dataCentreMECostPerMWCooling"
    | "dataCentreITHardwareProvidedByOperator"
    | "dataCentreITHardwareCostPerMW"
  >
): DataCentreConstructionCostsStepErrors {
  const next: DataCentreConstructionCostsStepErrors = {};
  if (
    !projectInfo.dataCentreBuildingRate ||
    projectInfo.dataCentreBuildingRate <= 0
  ) {
    next.dcBuildingRate = "Building Rate is required.";
  }
  if (
    !projectInfo.dataCentreMECostPerMWElectrical ||
    projectInfo.dataCentreMECostPerMWElectrical <= 0
  ) {
    next.dcMECostElectrical = "M&E Electrical Cost is required.";
  }
  if (
    !projectInfo.dataCentreMECostPerMWCooling ||
    projectInfo.dataCentreMECostPerMWCooling <= 0
  ) {
    next.dcMECostCooling = "M&E Cooling Cost is required.";
  }
  if (
    projectInfo.dataCentreITHardwareProvidedByOperator &&
    (!projectInfo.dataCentreITHardwareCostPerMW ||
      projectInfo.dataCentreITHardwareCostPerMW <= 0)
  ) {
    next.dcITHardwareCost = "IT Hardware Cost per MW is required when Operator Provides.";
  }
  return next;
}

type Props = {
  errors?: DataCentreConstructionCostsStepErrors;
};

function formatMoney(n: number): string {
  return Math.round(n).toLocaleString();
}

export default function DataCentreConstructionCostsStep({
  errors = {},
}: Props) {
  const projectInfo = useFinModelStore((s) => s.operational.projectInfo);
  const aiResearchData = useFinModelStore(
    (s) => s.operational.cashOutflows.aiResearchData
  );
  const currency = projectInfo.currency || "USD";
  const updateProjectInfo = useFinModelStore((s) => s.updateProjectInfo);
  const updateCashOutflows = useFinModelStore((s) => s.updateCashOutflows);

  const patchInfo = (
    data: Partial<ProjectInfo>,
    field?: string,
    value?: string | number | boolean
  ) => {
    updateProjectInfo(data, "operational");
    if (field != null && value != null) {
      logOperationalCashOutflow(field, value, 6);
    }
  };

  const aiCapEx = useMemo(
    () => extractDataCentreCapExRates(aiResearchData),
    [aiResearchData]
  );
  const aiItHardwareCost = aiCapEx.itHardwareCostPerMw;
  const aiProfFees = aiCapEx.professionalFeesPercent;
  const aiContingency = aiCapEx.contingencyPercent;
  const aiBuildingRate = aiCapEx.buildingRate;
  const aiMeElec = aiCapEx.meElectrical;
  const aiMeCool = aiCapEx.meCooling;

  // Seed fee/contingency defaults once
  useEffect(() => {
    const defaults: Partial<ProjectInfo> = {};
    if (projectInfo.dataCentreProfessionalFeesPercent == null) {
      defaults.dataCentreProfessionalFeesPercent = 10;
    }
    if (projectInfo.dataCentreContingencyPercent == null) {
      defaults.dataCentreContingencyPercent = 15;
    }
    if (projectInfo.dataCentreITHardwareProvidedByOperator == null) {
      defaults.dataCentreITHardwareProvidedByOperator = false;
    }
    if (Object.keys(defaults).length > 0) {
      updateProjectInfo(defaults, "operational");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dcBuildingBUA = projectInfo.dataCentreTotalBuildingGFA || 0;
  const dcITLoadMW = projectInfo.dataCentreITLoadCapacity || 0;

  const dcBuildingCost = useMemo(() => {
    return dcBuildingBUA * (projectInfo.dataCentreBuildingRate || 0);
  }, [dcBuildingBUA, projectInfo.dataCentreBuildingRate]);

  const dcMECost = useMemo(() => {
    const electricalCost =
      dcITLoadMW * (projectInfo.dataCentreMECostPerMWElectrical || 0);
    const coolingCost =
      dcITLoadMW * (projectInfo.dataCentreMECostPerMWCooling || 0);
    return electricalCost + coolingCost;
  }, [
    dcITLoadMW,
    projectInfo.dataCentreMECostPerMWElectrical,
    projectInfo.dataCentreMECostPerMWCooling,
  ]);

  const dcITHardwareCost = useMemo(() => {
    if (!projectInfo.dataCentreITHardwareProvidedByOperator) return 0;
    return dcITLoadMW * (projectInfo.dataCentreITHardwareCostPerMW || 0);
  }, [
    dcITLoadMW,
    projectInfo.dataCentreITHardwareProvidedByOperator,
    projectInfo.dataCentreITHardwareCostPerMW,
  ]);

  const dcBaseCost = dcBuildingCost + dcMECost;
  const dcProfessionalFees =
    dcBaseCost * ((projectInfo.dataCentreProfessionalFeesPercent || 0) / 100);
  const dcContingency =
    dcBaseCost * ((projectInfo.dataCentreContingencyPercent || 0) / 100);
  const dcTotalCapEx =
    dcBuildingCost +
    dcMECost +
    dcITHardwareCost +
    dcProfessionalFees +
    dcContingency;

  const hardBeforeContingency =
    dcBuildingCost + dcMECost + dcITHardwareCost + dcProfessionalFees;

  // Sync into cashOutflows for contingency / soft / land / TDC downstream
  useEffect(() => {
    const landSqft = projectInfo.dataCentreTotalLandArea || 0;
    updateCashOutflows(
      {
        buildingBUA: dcBuildingBUA,
        buildingRate: projectInfo.dataCentreBuildingRate || 0,
        parkingBUA: 0,
        basementBUA: 0,
        parkingRate: 0,
        basementRate: 0,
        landArea: landSqft > 0 ? landSqft : undefined,
        contingencyPercent:
          projectInfo.dataCentreContingencyPercent ??
          undefined,
        baseConstructionCost: hardBeforeContingency,
        constructionCost: dcTotalCapEx,
      },
      "operational"
    );
  }, [
    dcBuildingBUA,
    dcTotalCapEx,
    hardBeforeContingency,
    projectInfo.dataCentreBuildingRate,
    projectInfo.dataCentreTotalLandArea,
    projectInfo.dataCentreContingencyPercent,
    updateCashOutflows,
  ]);

  const buildingRateFromAi = aiBuildingRate != null && aiBuildingRate > 0;
  const meElecFromAi = aiMeElec != null && aiMeElec > 0;
  const meCoolFromAi = aiMeCool != null && aiMeCool > 0;
  const itHardwareFromAi =
    aiItHardwareCost != null && aiItHardwareCost > 0;
  const profFeesFromAi = aiProfFees != null && aiProfFees > 0;
  const contingencyFromAi = aiContingency != null && aiContingency > 0;

  const buildingRateOverridden =
    aiBuildingRate != null &&
    projectInfo.dataCentreBuildingRate != null &&
    Math.abs(projectInfo.dataCentreBuildingRate - aiBuildingRate) > 1e-9;
  const meElecOverridden =
    aiMeElec != null &&
    projectInfo.dataCentreMECostPerMWElectrical != null &&
    Math.abs(projectInfo.dataCentreMECostPerMWElectrical - aiMeElec) > 1e-9;
  const meCoolOverridden =
    aiMeCool != null &&
    projectInfo.dataCentreMECostPerMWCooling != null &&
    Math.abs(projectInfo.dataCentreMECostPerMWCooling - aiMeCool) > 1e-9;
  const itHardwareOverridden =
    aiItHardwareCost != null &&
    projectInfo.dataCentreITHardwareCostPerMW != null &&
    Math.abs(projectInfo.dataCentreITHardwareCostPerMW - aiItHardwareCost) >
      1e-9;
  const profFeesOverridden =
    aiProfFees != null &&
    projectInfo.dataCentreProfessionalFeesPercent != null &&
    Math.abs(projectInfo.dataCentreProfessionalFeesPercent - aiProfFees) >
      1e-9;
  const contingencyOverridden =
    aiContingency != null &&
    projectInfo.dataCentreContingencyPercent != null &&
    Math.abs(projectInfo.dataCentreContingencyPercent - aiContingency) >
      1e-9;

  const operatorProvides =
    !!projectInfo.dataCentreITHardwareProvidedByOperator;

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Step 6 of 13
        </p>
        <h2 className="mb-2 text-2xl font-bold text-white">
          Data Centre Construction Costs
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          CapEx rates for shell, M&amp;E, and optional IT hardware. Professional
          fees and contingency apply to Building + M&amp;E only (IT hardware
          excluded from that base).
        </p>
      </div>

      {/* 1. Building & Shell */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">
          Building &amp; Shell
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Building BUA (sqft)
            </label>
            <div className={readOnlyClass}>
              {Math.round(dcBuildingBUA).toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              From C1S5 Total Building GFA
            </p>
          </div>
          <AiInput
            label={`Building Rate (${currency}/sqft)`}
            value={projectInfo.dataCentreBuildingRate ?? ""}
            onChange={(v) => {
              const val = typeof v === "number" ? v : Number(v);
              if (!Number.isFinite(val)) return;
              patchInfo(
                { dataCentreBuildingRate: val },
                "dataCentreBuildingRate",
                val
              );
            }}
            type="number"
            step={1}
            min={0}
            isAiGenerated={buildingRateFromAi}
            isManualOverride={buildingRateOverridden}
            benchmarkValue={aiBuildingRate}
            helperText="AI-suggested when available from Phase 2 research"
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Building Cost ({currency})
            </label>
            <div className={readOnlyClass}>{formatMoney(dcBuildingCost)}</div>
            {errors.dcBuildingRate && (
              <p className="mt-1 text-sm text-red-400">{errors.dcBuildingRate}</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Critical Infrastructure (M&E) */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">
          Critical Infrastructure (M&amp;E)
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              IT Load Capacity (MW)
            </label>
            <div className={readOnlyClass}>{dcITLoadMW || "—"}</div>
            <p className="mt-1 text-xs text-slate-500">From C1S5</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              M&amp;E Cost ({currency})
            </label>
            <div className={readOnlyClass}>{formatMoney(dcMECost)}</div>
          </div>
          <AiInput
            label={`M&E Cost per MW — Electrical (${currency})`}
            value={projectInfo.dataCentreMECostPerMWElectrical ?? ""}
            onChange={(v) => {
              const val = typeof v === "number" ? v : Number(v);
              if (!Number.isFinite(val)) return;
              patchInfo(
                { dataCentreMECostPerMWElectrical: val },
                "dataCentreMECostPerMWElectrical",
                val
              );
            }}
            type="number"
            step={1000}
            min={0}
            isAiGenerated={meElecFromAi}
            isManualOverride={meElecOverridden}
            benchmarkValue={aiMeElec}
          />
          <AiInput
            label={`M&E Cost per MW — Cooling (${currency})`}
            value={projectInfo.dataCentreMECostPerMWCooling ?? ""}
            onChange={(v) => {
              const val = typeof v === "number" ? v : Number(v);
              if (!Number.isFinite(val)) return;
              patchInfo(
                { dataCentreMECostPerMWCooling: val },
                "dataCentreMECostPerMWCooling",
                val
              );
            }}
            type="number"
            step={1000}
            min={0}
            isAiGenerated={meCoolFromAi}
            isManualOverride={meCoolOverridden}
            benchmarkValue={aiMeCool}
          />
        </div>
        {errors.dcMECostElectrical && (
          <p className="text-sm text-red-400">{errors.dcMECostElectrical}</p>
        )}
        {errors.dcMECostCooling && (
          <p className="text-sm text-red-400">{errors.dcMECostCooling}</p>
        )}
      </div>

      {/* 3. IT Hardware */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">IT Hardware</h3>
        <div>
          <p className="mb-3 text-sm font-medium text-slate-300">
            IT Hardware Provided By
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                patchInfo(
                  { dataCentreITHardwareProvidedByOperator: false },
                  "dataCentreITHardwareProvidedByOperator",
                  false
                )
              }
              className={`rounded-lg border p-4 text-left transition-all ${
                !operatorProvides
                  ? "border-emerald-500 bg-emerald-900/20"
                  : "border-slate-600 bg-slate-900/50 hover:border-slate-500"
              }`}
            >
              <div className="font-medium text-white">Tenant Provides</div>
              <div className="mt-1 text-xs text-slate-400">
                Excluded from developer CapEx
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                patchInfo(
                  { dataCentreITHardwareProvidedByOperator: true },
                  "dataCentreITHardwareProvidedByOperator",
                  true
                )
              }
              className={`rounded-lg border p-4 text-left transition-all ${
                operatorProvides
                  ? "border-emerald-500 bg-emerald-900/20"
                  : "border-slate-600 bg-slate-900/50 hover:border-slate-500"
              }`}
            >
              <div className="font-medium text-white">Operator Provides</div>
              <div className="mt-1 text-xs text-slate-400">
                Included in developer CapEx (excluded from fees/contingency base)
              </div>
            </button>
          </div>
        </div>

        {operatorProvides && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AiInput
              label={`IT Hardware Cost per MW (${currency})`}
              value={projectInfo.dataCentreITHardwareCostPerMW ?? ""}
              onChange={(v) => {
                const val = typeof v === "number" ? v : Number(v);
                if (!Number.isFinite(val)) return;
                patchInfo(
                  { dataCentreITHardwareCostPerMW: val },
                  "dataCentreITHardwareCostPerMW",
                  val
                );
              }}
              type="number"
              step={1000}
              min={0}
              isAiGenerated={itHardwareFromAi}
              isManualOverride={itHardwareOverridden}
              benchmarkValue={aiItHardwareCost}
              helperText={
                itHardwareFromAi
                  ? "Pre-filled from AI research — edit to override"
                  : "Enter IT hardware cost per MW"
              }
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                IT Hardware Cost ({currency})
              </label>
              <div className={readOnlyClass}>
                {formatMoney(dcITHardwareCost)}
              </div>
              {errors.dcITHardwareCost && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.dcITHardwareCost}
                </p>
              )}
            </div>
          </div>
        )}

        {!operatorProvides && (
          <p className="text-xs text-slate-500">
            IT Hardware Cost: {currency} 0 (tenant-provided)
          </p>
        )}
      </div>

      {/* 4. Professional Fees */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">
          Professional Fees
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AiInput
            label="Professional Fees (%)"
            value={projectInfo.dataCentreProfessionalFeesPercent ?? ""}
            onChange={(v) => {
              const val = typeof v === "number" ? v : Number(v);
              if (!Number.isFinite(val)) return;
              patchInfo(
                { dataCentreProfessionalFeesPercent: val },
                "dataCentreProfessionalFeesPercent",
                val
              );
            }}
            type="number"
            step={0.1}
            min={0}
            max={30}
            isAiGenerated={profFeesFromAi}
            isManualOverride={profFeesOverridden}
            benchmarkValue={aiProfFees}
            helperText={
              profFeesFromAi
                ? "Applied to Building + M&E only — from AI research"
                : "Applied to Building + M&E only · typical 10–12%"
            }
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Professional Fees ({currency})
            </label>
            <div className={readOnlyClass}>
              {formatMoney(dcProfessionalFees)}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Contingency */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">Contingency</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AiInput
            label="Contingency (%)"
            value={projectInfo.dataCentreContingencyPercent ?? ""}
            onChange={(v) => {
              const val = typeof v === "number" ? v : Number(v);
              if (!Number.isFinite(val)) return;
              patchInfo(
                { dataCentreContingencyPercent: val },
                "dataCentreContingencyPercent",
                val
              );
            }}
            type="number"
            step={0.1}
            min={0}
            max={30}
            isAiGenerated={contingencyFromAi}
            isManualOverride={contingencyOverridden}
            benchmarkValue={aiContingency}
            helperText={
              contingencyFromAi
                ? "Applied to Building + M&E only — from AI research"
                : "Applied to Building + M&E only · typical 15–20%"
            }
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Contingency ({currency})
            </label>
            <div className={readOnlyClass}>{formatMoney(dcContingency)}</div>
          </div>
        </div>
      </div>

      {/* 6. Total CapEx */}
      <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-950/30 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-400/80">
              Total Development CapEx
            </p>
            <p className="mt-1 text-3xl font-bold text-emerald-300">
              {currency} {formatMoney(dcTotalCapEx)}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Building + M&amp;E + IT Hardware + Professional Fees + Contingency
            </p>
          </div>
          <div className="text-right text-xs text-slate-400 space-y-1">
            <div>Building: {currency} {formatMoney(dcBuildingCost)}</div>
            <div>M&amp;E: {currency} {formatMoney(dcMECost)}</div>
            <div>IT Hardware: {currency} {formatMoney(dcITHardwareCost)}</div>
            <div>Fees: {currency} {formatMoney(dcProfessionalFees)}</div>
            <div>Contingency: {currency} {formatMoney(dcContingency)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
