"use client";

import BenchmarkHeader from "@/components/BenchmarkHeader";
import type { ProjectInfo } from "@/store/useFinModelStore";

type ResidentialBenchmarkHeaderProps = {
  projectInfo: ProjectInfo;
  onUseDefaults?: () => void;
  isManualOverride?: boolean;
  showResetButton?: boolean;
};

/** Static benchmark strip for residential steps without profile-driven inputs. */
export default function ResidentialBenchmarkHeader({
  projectInfo,
  onUseDefaults,
  isManualOverride = false,
  showResetButton = false,
}: ResidentialBenchmarkHeaderProps) {
  if (
    !projectInfo.residentialSegment?.trim() ||
    !projectInfo.residentialPositioning?.trim()
  ) {
    return null;
  }

  return (
    <BenchmarkHeader
      assetType="residential"
      country={projectInfo.country}
      segment={projectInfo.residentialSegment}
      positioning={projectInfo.residentialPositioning}
      furnishingLevel={projectInfo.residentialFurnishingLevel}
      isServicedApartment={projectInfo.residentialIsServicedApartment}
      onUseDefaults={onUseDefaults ?? (() => {})}
      isManualOverride={isManualOverride}
      showResetButton={showResetButton && !!onUseDefaults}
    />
  );
}
