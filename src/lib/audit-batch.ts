import { logAuditChange } from "@/lib/audit-utils";
import type { AuditEntry } from "@/store/useAuditStore";

type AuditStream = AuditEntry["stream"];
type AuditType = AuditEntry["type"];

export function logBenchmarkValues(
  component: string,
  step: string,
  route: string,
  values: Record<string, { label: string; value: string | number | boolean; type?: AuditType }>,
  stream: AuditStream = "operational"
) {
  Object.entries(values).forEach(([key, { label, value, type = "input" }]) => {
    logAuditChange({
      id: `${component}_${step}_${key}_benchmark`,
      label: `${label} (benchmark load)`,
      value,
      component,
      step,
      route,
      type,
      stream,
    });
  });
}

export function logResetToBenchmark(
  component: string,
  step: string,
  route: string,
  fieldName: string,
  fieldValue: string | number | boolean,
  stream: AuditStream = "operational"
) {
  logAuditChange({
    id: `${component}_${step}_${fieldName}_reset`,
    label: `${fieldName} (reset to benchmark)`,
    value: fieldValue,
    component,
    step,
    route,
    type: "input",
    stream,
  });
}
