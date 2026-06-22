"use client";

import { Suspense, useEffect, useState } from "react";
import useFinModelStore from "@/store/useFinModelStore";
import { useAuditStore } from "@/store/useAuditStore";
import AuditTrailDrawer from "@/components/AuditTrailDrawer";
import SaveProjectButton from "@/components/header/SaveProjectButton";
import BackToDashboardButton from "@/components/ui/BackToDashboardButton";
import { studyToolbarResetBtn, studyToolbarSecondaryBtn } from "@/components/ui/studyToolbarStyles";
import { ProjectHydrationLoader } from "@/hooks/useProjectHydration";

export default function SaleLayout({ children }: { children: React.ReactNode }) {
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const assetType = useFinModelStore((s) => s.assetType);
  const setAssetType = useFinModelStore((s) => s.setAssetType);
  const resetAssetType = useFinModelStore((s) => s.resetAssetType);
  const resetProject = useFinModelStore((s) => s.resetProject);

  useEffect(() => {
    if (assetType === "sale") return;
    resetAssetType();
    setAssetType("sale");
  }, [assetType, resetAssetType, setAssetType]);

  return (
    <>
      <Suspense fallback={null}>
        <ProjectHydrationLoader stream="sale" />
      </Suspense>
      <div className="fixed right-4 top-4 z-[200] flex items-center gap-2">
        <BackToDashboardButton />
        <button
          type="button"
          onClick={() => setIsAuditOpen(true)}
          className={studyToolbarSecondaryBtn}
        >
          Audit trail
        </button>
        <SaveProjectButton stream="sale" label="Save Project" />
        <button
          type="button"
          onClick={() => {
            useAuditStore.getState().clearLog();
            resetProject();
          }}
          className={studyToolbarResetBtn}
        >
          Reset
        </button>
      </div>
      <AuditTrailDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        stream="sale"
      />
      {children}
    </>
  );
}
