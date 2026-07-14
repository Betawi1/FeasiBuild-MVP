"use client";

import BenchmarkHeader from "@/components/BenchmarkHeader";
import type { CashOutflows, ProjectInfo } from "@/store/useFinModelStore";

type ResidentialStep9LandCostsProps = {
  projectInfo: ProjectInfo;
  cashOutflows: CashOutflows;
  benchmarkReady: boolean;
  landCost: number;
  onReset: () => void;
  onLandAreaChange: (value: number) => void;
  onLandRateChange: (value: number) => void;
  percentFieldClass: (manual?: boolean) => string;
  fieldError: (name: string) => string | undefined;
};

/** UI Step 9 — Land costs benchmark header and land rate input. */
export default function ResidentialStep9LandCosts({
  projectInfo,
  cashOutflows,
  benchmarkReady,
  landCost,
  onReset,
  onLandAreaChange: _onLandAreaChange,
  onLandRateChange,
  percentFieldClass,
  fieldError,
}: ResidentialStep9LandCostsProps) {
  if (!benchmarkReady) return null;

  const landManual = !!cashOutflows.operationalResidentialLandRateManual;

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
        isManualOverride={landManual}
      />
      <p className="mb-4 text-sm text-slate-400">
        Land rate is suggested from your residential segment, positioning, and
        country. Plot area is defined in Step 5 Building Configuration.
      </p>

      <div className="mb-6 grid grid-cols-1 items-end gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Plot / Land Area (sqft)
          </label>
          <input
            type="number"
            value={projectInfo.residentialPlotArea || 0}
            readOnly
            className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-400"
            title="Locked: Defined in Step 5 Building Configuration"
          />
          <p className="mt-1 text-xs text-amber-400">
            🔒 Locked: To change, go back to Step 5
          </p>
          {fieldError("landArea") && (
            <p className="mt-1 text-sm text-red-400">{fieldError("landArea")}</p>
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Land rate ({projectInfo.currency}/sqft)
            {landManual ? (
              <span className="ml-2 text-xs font-normal text-amber-400">
                (override)
              </span>
            ) : null}
          </label>
          <input
            type="number"
            value={cashOutflows.landRate}
            onChange={(e) => onLandRateChange(Number(e.target.value) || 0)}
            className={percentFieldClass(landManual)}
          />
          {fieldError("landRate") && (
            <p className="mt-1 text-sm text-red-400">{fieldError("landRate")}</p>
          )}
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-400">Land cost (LC)</p>
          <p className="text-lg font-semibold text-emerald-400">
            {landCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
            {projectInfo.currency}
          </p>
        </div>
      </div>
      {/* Land Rate per GFA/BUA Display */}
      <div className="mb-6 mt-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Land Rate per GFA/BUA:</span>
          <span className="text-sm font-semibold text-emerald-400">
            {projectInfo.currency || "AED"}{" "}
            {(() => {
              const landRate = cashOutflows.landRate || 0;
              const landArea = projectInfo.residentialPlotArea || 0;
              const bua = projectInfo.residentialTotalBuildingBUA || 0;

              if (landRate > 0 && landArea > 0 && bua > 0) {
                const ratePerGFA = (landRate * landArea) / bua;
                return ratePerGFA.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                });
              }
              return "0";
            })()}
            {" /sqft (GFA)"}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Formula: (Land Rate × Plot Area) / Total BUA
        </p>
      </div>
    </>
  );
}
