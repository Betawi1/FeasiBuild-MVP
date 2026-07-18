"use client";

import BenchmarkHeader from "@/components/BenchmarkHeader";
import type { ProjectInfo } from "@/store/useFinModelStore";
import type { ResidentialCcRateOverrides } from "./residential-cash-outflow-benchmark";

type ResidentialStep6ConstructionProps = {
  projectInfo: ProjectInfo;
  benchmarkReady: boolean;
  ccOverrides: ResidentialCcRateOverrides;
  hasManualOverride: boolean;
  onReset: () => void;
};

/** UI Step 6 — Construction costs benchmark header (rates styled in parent page). */
export default function ResidentialStep6Construction({
  projectInfo,
  benchmarkReady,
  ccOverrides,
  hasManualOverride,
  onReset,
}: ResidentialStep6ConstructionProps) {
  if (!benchmarkReady) return null;

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
        isManualOverride={ccOverrides.any || hasManualOverride}
      />
      <p className="mb-4 text-sm text-slate-400">
        Building, parking, and basement rates come from AI research when available,
        otherwise from your residential segment, positioning, furnishing level, and
        country. Typed values count as overrides.
      </p>
    </>
  );
}
