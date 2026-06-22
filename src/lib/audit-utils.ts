import { useAuditStore } from "@/store/useAuditStore";
import type { AuditEntry } from "@/store/useAuditStore";

export type LogAuditChangeParams = {
  id: string;
  label: string;
  value: string | number | boolean;
  component: string;
  step: string;
  route: string;
  type?: AuditEntry["type"];
  stream?: AuditEntry["stream"];
};

/** Imperative audit log — safe to call from handlers and store actions (no hook). */
export function logAuditChange(params: LogAuditChangeParams): void {
  const {
    id,
    label,
    value,
    component,
    step,
    route,
    type = "input",
    stream = "operational",
  } = params;

  useAuditStore.getState().addEntry({
    id,
    label,
    value,
    component,
    step,
    route,
    type,
    stream,
  });
}

export function trackCalculatedMetric(params: {
  id: string;
  label: string;
  value: number;
  component: string;
  route: string;
  step?: string;
  stream?: "operational" | "sale";
}) {
  const {
    id,
    label,
    value,
    component,
    route,
    step = "Preview / Calculations",
    stream = "operational",
  } = params;

  logAuditChange({
    id,
    label,
    value,
    component,
    step,
    route,
    type: "calculated",
    stream,
  });
}
