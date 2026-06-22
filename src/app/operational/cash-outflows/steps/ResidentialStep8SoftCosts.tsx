"use client";

import BenchmarkHeader from "@/components/BenchmarkHeader";
import {
  getOperationalFfeHint,
  isOperationalFfeOutsideRange,
} from "@/lib/operational-ffe-validation";
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
  const ffeValue = Number(cashOutflows.ffePercent) || 0;
  const showFfeWarning =
    showFfe &&
    !fieldError("ffePercent") &&
    isOperationalFfeOutsideRange(ffeValue, "residential", projectInfo);

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
            {showFfeWarning && (
              <p className="mt-1 text-xs text-amber-500">
                {getOperationalFfeHint("residential", projectInfo)}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
