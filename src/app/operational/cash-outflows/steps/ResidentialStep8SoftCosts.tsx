"use client";

import BenchmarkHeader from "@/components/BenchmarkHeader";
import { AiInput } from "@/components/ui/AiInput";
import { getOperationalFfeAssetLabel } from "@/lib/operational-ffe-validation";
import type { CashOutflows, ProjectInfo } from "@/store/useFinModelStore";

type ResidentialStep8SoftCostsProps = {
  projectInfo: ProjectInfo;
  cashOutflows: CashOutflows;
  benchmarkReady: boolean;
  hasManualOverride: boolean;
  onReset: () => void;
  onSoftCostChange: (value: number) => void;
  onPowcChange: (value: number) => void;
  onFfeChange: (value: number) => void;
  fieldError: (name: string) => string | undefined;
  showFfe: boolean;
  /** AI soft-cost % when research has completed */
  aiScPct?: number;
  aiPowcPct?: number;
  aiFfePct?: number;
};

/** UI Step 8 — SC, POWC & FFE benchmark-driven percentages. */
export default function ResidentialStep8SoftCosts({
  projectInfo,
  cashOutflows,
  benchmarkReady,
  hasManualOverride,
  onReset,
  onSoftCostChange,
  onPowcChange,
  onFfeChange,
  fieldError,
  showFfe,
  aiScPct,
  aiPowcPct,
  aiFfePct,
}: ResidentialStep8SoftCostsProps) {
  if (!benchmarkReady) return null;

  const scManual = !!cashOutflows.operationalResidentialScManual;
  const powcManual = !!cashOutflows.operationalResidentialPowcManual;
  const ffeManual = !!cashOutflows.operationalResidentialFfeManual;
  const aiFfeRange =
    cashOutflows.aiResearchData?.c1_development?.soft_costs?.ffe_percentage;
  const aiFfeJustification = aiFfeRange?.justification;
  const ffeSegmentLabel = (
    projectInfo.residentialSegment || getOperationalFfeAssetLabel("residential")
  ).replace(/_/g, " ");

  return (
    <>
      <BenchmarkHeader
        assetType="residential"
        country={projectInfo.country}
        segment={projectInfo.residentialSegment}
        positioning={projectInfo.residentialPositioning}
        furnishingLevel={projectInfo.residentialFurnishingLevel}
        isServicedApartment={projectInfo.residentialIsServicedApartment}
        onUseDefaults={onReset}
        isManualOverride={scManual || powcManual || ffeManual || hasManualOverride}
      />
      <p className="mb-4 text-sm text-slate-400">
        SC, POWC, and FFE come from AI research when available, otherwise from your
        residential profile. Calculations use CC{" "}
        <span className="text-slate-300">including contingency</span> from prior
        steps. Typed values count as overrides.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <AiInput
            label="Soft costs % of CC incl. contingency (SC%)"
            value={cashOutflows.softCostPercent || aiScPct || 0}
            onChange={(value) => onSoftCostChange(Number(value) || 0)}
            type="percentage"
            isAiGenerated={!!aiScPct && !scManual}
            isManualOverride={scManual}
            helperText="SC amount = CC incl. contingency × SC% ÷ 100"
          />
          {fieldError("softCostPercent") && (
            <p className="mt-1 text-sm text-red-400">
              {fieldError("softCostPercent")}
            </p>
          )}
        </div>
        <div>
          <AiInput
            label="POWC % of CC incl. contingency (POWC%)"
            value={cashOutflows.powcPercent || aiPowcPct || 0}
            onChange={(value) => onPowcChange(Number(value) || 0)}
            type="percentage"
            isAiGenerated={!!aiPowcPct && !powcManual}
            isManualOverride={powcManual}
            helperText="POWC amount = CC incl. contingency × POWC% ÷ 100"
          />
          {fieldError("powcPercent") && (
            <p className="mt-1 text-sm text-red-400">{fieldError("powcPercent")}</p>
          )}
        </div>
        {showFfe ? (
          <div>
            <AiInput
              label="FFE % of CC incl. contingency (Residential)"
              value={
                ffeManual
                  ? cashOutflows.ffePercent || 0
                  : (aiFfePct ?? cashOutflows.ffePercent ?? 0)
              }
              onChange={(value) => onFfeChange(Number(value) || 0)}
              type="percentage"
              isAiGenerated={!!aiFfePct && !ffeManual}
              isManualOverride={ffeManual}
            />
            {fieldError("ffePercent") && (
              <p className="mt-1 text-sm text-red-400">{fieldError("ffePercent")}</p>
            )}
            <div className="mt-2">
              <p className="text-xs text-slate-400">
                Furniture, fixtures & equipment for residential units and common
                areas.
              </p>

              {aiFfeRange && (
                <p className="mt-2 text-xs text-amber-400">
                  FFE % for {ffeSegmentLabel} is typically between
                  <span className="font-semibold"> {aiFfeRange.min_range}%</span>{" "}
                  and
                  <span className="font-semibold"> {aiFfeRange.max_range}%</span>{" "}
                  of CC incl. contingency
                </p>
              )}

              {aiFfeJustification && (
                <p className="mt-2 text-xs text-slate-400">
                  {aiFfeJustification}
                </p>
              )}

              {!aiFfeRange && (
                <p className="mt-2 text-xs text-slate-500">
                  FFE % is typically between 2% and 8% of CC incl. contingency
                  (varies by asset type).
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
