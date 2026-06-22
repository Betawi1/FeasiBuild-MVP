import { useCallback, useMemo, useState } from "react";
import { useAuditStore, type AuditEntry } from "@/store/useAuditStore";

type AuditType = AuditEntry["type"];
type AuditStream = AuditEntry["stream"];

type ExternalControl<T> = {
  value: T;
  setValue: (next: T) => void;
};

// usage (local): const { value, setValue } = useAuditInput("id", "Label", "Comp", "Step", "/route", "input", 0);
// usage (controlled): const { value, setValue } = useAuditInput(..., "input", undefined, "operational", { value, setValue });
export function useAuditInput<T>(
  id: string,
  label: string,
  component: string,
  step: string,
  route: string,
  type: AuditType = "input",
  initialValue?: T,
  stream: AuditStream = "operational",
  external?: ExternalControl<T>
) {
  const addEntry = useAuditStore((s) => s.addEntry);

  const [internalValue, setInternalValue] = useState<T>(initialValue as T);
  const value = useMemo(
    () => (external ? external.value : internalValue),
    [external, internalValue]
  );

  const setValue = useCallback(
    (next: T) => {
      if (external) external.setValue(next);
      else setInternalValue(next);

      addEntry({
        id,
        label,
        value: next as any,
        component,
        step,
        route,
        type,
        stream,
      });
    },
    [addEntry, component, external, id, label, route, step, stream, type]
  );

  return { value, setValue };
}

