const ZUSTAND_INTERNAL_KEYS = new Set([
  "getState",
  "setState",
  "subscribe",
  "destroy",
  "persist",
]);

/** Recursively remove functions, symbols, and unclonable values for JSON / KV storage. */
export function sanitizeForStorage<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return null as T;
  }

  const valueType = typeof obj;

  if (valueType === "function" || valueType === "symbol") {
    return null as T;
  }

  if (valueType !== "object") {
    if (valueType === "number" && !Number.isFinite(obj as number)) {
      return null as T;
    }
    if (valueType === "bigint") {
      return String(obj) as T;
    }
    return obj as T;
  }

  if (obj instanceof Date) {
    return obj.toISOString() as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForStorage(item)) as T;
  }

  if (obj.constructor !== Object) {
    return null as T;
  }

  const cleanObj: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (ZUSTAND_INTERNAL_KEYS.has(key)) {
      continue;
    }

    const val = (obj as Record<string, unknown>)[key];
    if (typeof val === "function" || typeof val === "symbol") {
      continue;
    }

    cleanObj[key] = sanitizeForStorage(val);
  }

  return cleanObj as T;
}
