const CACHE_PREFIX = "feasibuild_cache_";
const AUTH_CHECK_KEY = "_auth_check";
export const SALE_HASHES_STORAGE_KEY = "feasibuild_sale_hashes";
export const OPERATIONAL_HASHES_STORAGE_KEY = "feasibuild_operational_hashes";

export type PuterKvStatus = {
  available: boolean;
  authenticated: boolean;
};

function isPuterAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.puter && window.puter.kv);
}

/** Check if Puter KV is loaded and whether the user is authenticated. */
export async function checkPuterStatus(): Promise<PuterKvStatus> {
  if (typeof window === "undefined") {
    return { available: false, authenticated: false };
  }

  const puter = window.puter;
  if (!puter?.kv) {
    return { available: false, authenticated: false };
  }

  try {
    await puter.kv.get(AUTH_CHECK_KEY);
    return { available: true, authenticated: true };
  } catch {
    console.log(
      "[Puter] Available but not authenticated - auth popup will appear on first KV use"
    );
    return { available: true, authenticated: false };
  }
}

function readLocalStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(key);
    return cached ? (JSON.parse(cached) as T) : null;
  } catch (error) {
    console.error(`[Cache] localStorage read error for ${key}:`, error);
    return null;
  }
}

function writeLocalStorage(key: string, serializedContent: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, serializedContent);
    console.log(`[Cache] ✓ Saved to localStorage: ${key}`);
  } catch (error) {
    console.error(`[Cache] localStorage write error for ${key}:`, error);
  }
}

async function getWithFallback<T>(key: string, label: string): Promise<T | null> {
  if (typeof window !== "undefined" && isPuterAvailable()) {
    try {
      console.log(`[Cache] Trying Puter KV read: ${label}`);
      const cached = await window.puter!.kv.get(key);
      if (cached != null) {
        console.log(`[Cache] ✓ Hit (Puter KV): ${label}`);
        return (typeof cached === "string" ? JSON.parse(cached) : cached) as T;
      }
    } catch (error) {
      console.warn(`[Cache] ⚠️ Puter KV read failed for ${label}:`, error);
      console.log(`[Cache] Falling back to localStorage for: ${label}`);
    }
  } else if (typeof window !== "undefined") {
    console.log(`[Cache] Puter not available, using localStorage for: ${label}`);
  }

  const local = readLocalStorage<T>(key);
  if (local != null) {
    console.log(`[Cache] ✓ Hit (localStorage): ${label}`);
  }
  return local;
}

async function setWithFallback(
  key: string,
  content: unknown,
  label: string
): Promise<void> {
  const serializedContent = JSON.stringify(content);

  if (typeof window !== "undefined" && isPuterAvailable()) {
    try {
      console.log(`[Cache] Trying Puter KV write: ${label}`);
      await window.puter!.kv.set(key, serializedContent);
      console.log(`[Cache] ✓ Saved to Puter KV: ${label}`);
      return;
    } catch (error) {
      console.warn(`[Cache] ⚠️ Puter KV write failed for ${label}:`, error);
      console.log(`[Cache] Falling back to localStorage for: ${label}`);
    }
  } else if (typeof window !== "undefined") {
    console.log(`[Cache] Puter not available, using localStorage for: ${label}`);
  }

  writeLocalStorage(key, serializedContent);
}

/** cyrb53 string hash (returns numeric hash). */
export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function stableStringify(data: unknown): string {
  if (data === null || typeof data !== "object") {
    return JSON.stringify(data);
  }
  if (Array.isArray(data)) {
    return `[${data.map(stableStringify).join(",")}]`;
  }
  const obj = data as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** Strip functions, undefined, and non-primitive noise before hashing. */
export function sanitizeHashInput(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "function") return undefined;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map(sanitizeHashInput)
      .filter((entry) => entry !== undefined);
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const sanitized = sanitizeHashInput(entry);
      if (sanitized !== undefined) {
        out[key] = sanitized;
      }
    }
    return out;
  }
  return undefined;
}

/** Generate a stable hash from component data. */
export function generateDataHash(data: unknown, debugLabel?: string): string {
  const stableInputs = sanitizeHashInput(data);
  if (debugLabel) {
    console.log(`[Cache Debug] Hashing ${debugLabel}:`, stableInputs);
  }
  const hash = cyrb53(stableStringify(stableInputs)).toString(36);
  if (debugLabel) {
    console.log(`[Cache Debug] Hash result (${debugLabel}):`, hash);
  }
  return hash;
}

export async function getCachedContent<T = unknown>(
  cacheKey: string
): Promise<T | null> {
  const storageKey = `${CACHE_PREFIX}${cacheKey}`;
  console.log(`[Cache] Checking Puter KV for key: ${cacheKey}`);

  if (typeof window !== "undefined" && isPuterAvailable()) {
    try {
      const cached = await window.puter!.kv.get(storageKey);
      if (cached != null) {
        console.log(`[Cache] ✓ FOUND in Puter KV! key: ${cacheKey}`);
        return (
          typeof cached === "string" ? JSON.parse(cached) : cached
        ) as T;
      }
    } catch (error) {
      console.warn(`[Cache] ⚠️ Puter KV read failed for ${cacheKey}:`, error);
      console.log(`[Cache] Falling back to localStorage for: ${cacheKey}`);
    }
  }

  const local = readLocalStorage<T>(storageKey);
  if (local != null) {
    console.log(`[Cache] ✓ FOUND in localStorage! key: ${cacheKey}`);
    return local;
  }

  console.log(`[Cache] ✗ MISS for key: ${cacheKey}`);
  return null;
}

export async function setCachedContent(
  cacheKey: string,
  content: unknown
): Promise<void> {
  await setWithFallback(`${CACHE_PREFIX}${cacheKey}`, content, cacheKey);
}

export async function getStoredHashes(
  key: string
): Promise<Record<string, string>> {
  return (await getWithFallback<Record<string, string>>(key, key)) ?? {};
}

export async function setStoredHashes(
  key: string,
  hashes: Record<string, string>
): Promise<void> {
  await setWithFallback(key, hashes, key);
}

export async function clearStoredHashes(key: string): Promise<void> {
  if (typeof window !== "undefined") {
    const puter = window.puter;

    if (puter?.kv) {
      try {
        await puter.kv.del(key);
      } catch (error) {
        console.warn(
          `[Cache] Failed to clear Puter KV hash key ${key} (may need auth):`,
          error
        );
      }
    }

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[Cache] Failed to clear localStorage hash key ${key}:`, error);
    }
  }
}

/** Clear all AI content caches (Puter KV + localStorage). */
export async function clearAllCaches(): Promise<void> {
  let puterCleared = 0;

  if (typeof window !== "undefined") {
    const puter = window.puter;

    if (puter?.kv) {
      try {
        const keys = await puter.kv.list();
        const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));

        for (const key of cacheKeys) {
          await puter.kv.del(key);
          puterCleared += 1;
        }
        console.log(`[Cache] ✓ Cleared ${puterCleared} items from Puter KV`);
      } catch (error) {
        console.warn("[Cache] Failed to clear Puter KV (may need auth):", error);
      }
    }

    try {
      const localStorageKeys = Object.keys(localStorage).filter((k) =>
        k.startsWith(CACHE_PREFIX)
      );
      localStorageKeys.forEach((key) => localStorage.removeItem(key));
      console.log(
        `[Cache] ✓ Cleared ${localStorageKeys.length} items from localStorage`
      );
    } catch (error) {
      console.error("[Cache] Failed to clear localStorage:", error);
    }
  }
}
