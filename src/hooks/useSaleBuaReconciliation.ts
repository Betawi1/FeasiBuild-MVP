"use client";

import { useEffect } from "react";
import useFinModelStore from "@/store/useFinModelStore";
import { reconcileSaleBuaState } from "@/lib/feasibility/sale/sale-bua";

/** Rewrite stale sale BUA copies from Component 1 after persisted state loads. */
function reconcilePersistedSaleBua(): void {
  const sale = useFinModelStore.getState().sale;
  if (!sale?.projectInfo || !sale.cashOutflows || !sale.cashInflows) return;
  const reconciled = reconcileSaleBuaState(
    sale.projectInfo,
    sale.cashOutflows,
    sale.cashInflows
  );
  if (!reconciled.changed) return;
  useFinModelStore.setState({
    sale: {
      ...sale,
      projectInfo: reconciled.projectInfo,
      cashOutflows: reconciled.cashOutflows,
      cashInflows: reconciled.cashInflows,
    },
  });
}

/**
 * Client-only. `persist` is absent during server module evaluation because
 * localStorage is unavailable, so this must not run at import time.
 */
export function useSaleBuaReconciliation(): void {
  useEffect(() => {
    const persistApi = useFinModelStore.persist;
    if (!persistApi?.onFinishHydration) {
      reconcilePersistedSaleBua();
      return;
    }
    if (persistApi.hasHydrated()) reconcilePersistedSaleBua();
    return persistApi.onFinishHydration(() => {
      reconcilePersistedSaleBua();
    });
  }, []);
}
