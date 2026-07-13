"use client";

import BenchmarkHeader from "@/components/BenchmarkHeader";
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
  percentFieldClass: (manual?: boolean) => string;
  fieldError: (name: string) => string | undefined;
  showFfe: boolean;
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
  percentFieldClass,
  fieldError,
  showFfe,
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
        SC, POWC, and FFE are suggested from your residential profile. Calculations
        use CC{" "}
        <span className="text-slate-300">including contingency</span> from prior
        steps. Typed values count as overrides.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Soft costs % of CC incl. contingency (SC%)
            {scManual ? (
              <span className="ml-2 text-xs font-normal text-amber-400">
                (override)
              </span>
            ) : null}
          </label>
          <input
            type="number"
            value={cashOutflows.softCostPercent}
            onChange={(e) => onSoftCostChange(Number(e.target.value) || 0)}
            className={percentFieldClass(scManual)}
          />
          {fieldError("softCostPercent") && (
            <p className="mt-1 text-sm text-red-400">
              {fieldError("softCostPercent")}
            </p>
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            POWC % of CC incl. contingency (POWC%)
            {powcManual ? (
              <span className="ml-2 text-xs font-normal text-amber-400">
                (override)
              </span>
            ) : null}
          </label>
          <input
            type="number"
            value={cashOutflows.powcPercent}
            onChange={(e) => onPowcChange(Number(e.target.value) || 0)}
            className={percentFieldClass(powcManual)}
          />
          {fieldError("powcPercent") && (
            <p className="mt-1 text-sm text-red-400">{fieldError("powcPercent")}</p>
          )}
        </div>
        {showFfe ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              FFE % of CC incl. contingency
              {ffeManual ? (
                <span className="ml-2 text-xs font-normal text-amber-400">
                  (override)
                </span>
              ) : null}
            </label>
            <input
              type="number"
              value={cashOutflows.ffePercent}
              onChange={(e) => onFfeChange(Number(e.target.value) || 0)}
              className={percentFieldClass(ffeManual)}
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
