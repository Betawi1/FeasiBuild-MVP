import { useCallback, useEffect, useRef } from "react";
import { logAuditChange } from "@/lib/audit-utils";
import type { AuditEntry } from "@/store/useAuditStore";

type AuditType = AuditEntry["type"];
type AuditStream = AuditEntry["stream"];

/**
 * Non-invasive audit logger — call the returned function after your existing setter.
 *
 * @example
 * const logLandCost = useAuditLog("landCost", "Land Cost", "Component 1", "Step 9", "/operational/cash-outflows?step=9");
 * onChange={(e) => { setLandCost(n); logLandCost(n); }}
 */
export function useAuditLog(
  id: string,
  label: string,
  component: string,
  step: string,
  route: string,
  type: AuditType = "input",
  stream: AuditStream = "operational",
  initialValue?: string | number | boolean,
  logInitial = false
) {
  const initialLogged = useRef(false);

  useEffect(() => {
    if (!logInitial || initialValue === undefined || initialLogged.current) return;
    initialLogged.current = true;
    logAuditChange({
      id: `${id}_initial`,
      label,
      value: initialValue,
      component,
      step,
      route,
      type,
      stream,
    });
  }, [logInitial, initialValue, id, label, component, step, route, type, stream]);

  return useCallback(
    (value: string | number | boolean) => {
      logAuditChange({
        id,
        label,
        value,
        component,
        step,
        route,
        type,
        stream,
      });
    },
    [id, label, component, step, route, type, stream]
  );
}
