"use client";

import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import useFinModelStore from "@/store/useFinModelStore";
import { useCanCreateProject } from "@/hooks/useCanCreateProject";

export default function DashboardNewStudyButtons() {
  const router = useRouter();
  const resetOperational = useFinModelStore((state) => state.resetOperational);
  const resetSale = useFinModelStore((state) => state.resetSale);
  const { canCreate, lockedHint } = useCanCreateProject();

  const handleNewOperationalStudy = () => {
    if (!canCreate) return;
    resetOperational();
    router.push("/operational");
  };

  const handleNewSaleStudy = () => {
    if (!canCreate) return;
    resetSale();
    router.push("/sale");
  };

  const lockedClass = !canCreate ? "cursor-not-allowed opacity-40" : "";

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleNewOperationalStudy}
        disabled={!canCreate}
        title={!canCreate ? lockedHint : undefined}
        className={`flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:hover:bg-slate-900 ${lockedClass}`}
      >
        <PlusCircle className="h-4 w-4 text-blue-400" />
        New Operational Study
      </button>
      <button
        type="button"
        onClick={handleNewSaleStudy}
        disabled={!canCreate}
        title={!canCreate ? lockedHint : undefined}
        className={`flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:hover:bg-emerald-500 ${lockedClass}`}
      >
        <PlusCircle className="h-4 w-4" />
        New Sale Study
      </button>
    </div>
  );
}
