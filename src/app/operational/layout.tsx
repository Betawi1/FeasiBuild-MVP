"use client";

import { Suspense, useEffect, useState } from "react";
import useFinModelStore from "@/store/useFinModelStore";
import { useAuditStore } from "@/store/useAuditStore";
import AuditTrailDrawer from "@/components/AuditTrailDrawer";
import SaveProjectButton from "@/components/header/SaveProjectButton";
import { ProjectHydrationLoader } from "@/hooks/useProjectHydration";

export default function OperationalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const assetType = useFinModelStore((s) => s.assetType);
  const setAssetType = useFinModelStore((s) => s.setAssetType);
  const resetAssetType = useFinModelStore((s) => s.resetAssetType);
  const resetProject = useFinModelStore((s) => s.resetProject);

  useEffect(() => {
    if (assetType === "operational") return;
    resetAssetType();
    setAssetType("operational");
  }, [assetType, resetAssetType, setAssetType]);

  return (
    <>
      <Suspense fallback={null}>
        <ProjectHydrationLoader stream="operational" />
      </Suspense>
      <div className="fixed right-4 top-4 z-[200] flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsAuditOpen(true)}
          className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800 transition"
        >
          Audit trail
        </button>
        <SaveProjectButton stream="operational" label="Save Project" />
        <button
          type="button"
          onClick={() => {
            useAuditStore.getState().clearLog();
            resetProject();
          }}
          className="px-3 py-2 rounded-lg border border-rose-700/60 bg-rose-600/20 text-rose-200 hover:bg-rose-600/30 transition"
        >
          Reset
        </button>
      </div>
      <AuditTrailDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        stream="operational"
      />
      {children}
    </>
  );
}
