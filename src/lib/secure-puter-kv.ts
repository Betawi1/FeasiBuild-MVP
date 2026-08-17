"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect } from "react";
import { sendOpsAlert } from "@/lib/ops-monitor";

/** Prefix to namespace all FeasiBuild Puter KV keys. */
export const KV_PREFIX = "feasi_build_";
/**
 * Legacy puter-storage prefix. Combined with Clerk `user_…` ids this looks like
 * `feasibuild_user_XXX_` — do not append userId a second time.
 */
export const LEGACY_USER_KEY_PREFIX = "feasibuild_";

/**
 * Module-level Clerk userId for non-React lib/ utilities.
 * Bound by {@link useSecureKv} / {@link SecureKvUserBinder}.
 */
let activeClerkUserId: string | null = null;

export function bindSecureKvUserId(userId: string | null): void {
  activeClerkUserId = userId?.trim() || null;
}

export function getSecureKvUserId(): string | null {
  return activeClerkUserId;
}

function userNamespacePrefixes(userId: string): string[] {
  return [`${KV_PREFIX}${userId}_`, `${LEGACY_USER_KEY_PREFIX}${userId}_`];
}

/**
 * Strip any existing new/legacy user namespaces so callers can pass either
 * `proj_123` or `feasibuild_${userId}_proj_123` and still get one key:
 * `feasi_build_${userId}_proj_123`.
 */
export function toLogicalKvKey(userId: string, key: string): string {
  if (!userId) throw new Error("SecureKV: User ID is required");
  if (!key) throw new Error("SecureKV: Key is required");

  let cleanKey = key;
  let previous = "";
  const prefixes = userNamespacePrefixes(userId);

  while (previous !== cleanKey) {
    previous = cleanKey;
    for (const prefix of prefixes) {
      if (cleanKey.startsWith(prefix)) {
        cleanKey = cleanKey.slice(prefix.length);
      }
    }
  }

  if (!cleanKey) throw new Error("SecureKV: Key is required");
  return cleanKey;
}

export function buildNamespacedKvKey(userId: string, key: string): string {
  const cleanKey = toLogicalKvKey(userId, key);
  return `${KV_PREFIX}${userId}_${cleanKey}`;
}

function requirePuterKv(): NonNullable<Window["puter"]>["kv"] {
  if (typeof window === "undefined" || !window.puter?.kv) {
    throw new Error("SecureKV: Puter KV is not available");
  }
  return window.puter.kv;
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i === maxRetries - 1) break;
      const delay = baseDelay * Math.pow(2, i);
      console.warn(
        `[SecureKV] Attempt ${i + 1} failed. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  void sendOpsAlert(
    lastError instanceof Error ? lastError : String(lastError),
    { source: "Secure Puter KV" }
  );
  throw lastError;
}

function serializeValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function deserializeValue(result: unknown): unknown {
  if (result == null) return null;
  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  }
  return result;
}

/**
 * Standalone API for non-React files (e.g. lib/ utilities).
 * Requires the Clerk userId to be passed explicitly.
 */
export const secureKv = {
  get: async (userId: string, key: string): Promise<unknown> => {
    if (!userId) throw new Error("SecureKV: User ID is required");
    const namespacedKey = buildNamespacedKvKey(userId, key);

    try {
      console.debug(`[SecureKV] GET ${namespacedKey}`);
      const value = await retryOperation(async () => {
        const result = await requirePuterKv().get(namespacedKey);
        return deserializeValue(result);
      });
      console.debug(
        `[SecureKV] ✓ GET ${namespacedKey} →`,
        value == null ? "null" : "hit"
      );
      return value;
    } catch (error) {
      console.error(`[SecureKV] ✗ GET ${namespacedKey}:`, error);
      throw error;
    }
  },

  set: async (userId: string, key: string, value: unknown): Promise<void> => {
    if (!userId) throw new Error("SecureKV: User ID is required");
    const namespacedKey = buildNamespacedKvKey(userId, key);

    try {
      console.debug(`[SecureKV] SET ${namespacedKey}`);
      await retryOperation(async () => {
        await requirePuterKv().set(namespacedKey, serializeValue(value));
      });
      console.debug(`[SecureKV] ✓ SET ${namespacedKey}`);
    } catch (error) {
      console.error(`[SecureKV] ✗ SET ${namespacedKey}:`, error);
      throw error;
    }
  },

  delete: async (userId: string, key: string): Promise<void> => {
    if (!userId) throw new Error("SecureKV: User ID is required");
    const namespacedKey = buildNamespacedKvKey(userId, key);

    try {
      console.debug(`[SecureKV] DEL ${namespacedKey}`);
      await retryOperation(async () => {
        await requirePuterKv().del(namespacedKey);
      });
      console.debug(`[SecureKV] ✓ DEL ${namespacedKey}`);
    } catch (error) {
      console.error(`[SecureKV] ✗ DEL ${namespacedKey}:`, error);
      throw error;
    }
  },

  /**
   * Lists namespaced keys for this user. Returns logical keys (prefix stripped)
   * when `stripNamespace` is true (default).
   */
  list: async (
    userId: string,
    options?: { logicalPrefix?: string; stripNamespace?: boolean }
  ): Promise<string[]> => {
    if (!userId) throw new Error("SecureKV: User ID is required");
    const ns = `${KV_PREFIX}${userId}_`;
    const strip = options?.stripNamespace !== false;
    const logicalPrefix = options?.logicalPrefix ?? "";

    try {
      const keys = await requirePuterKv().list();
      return keys
        .filter((k) => k.startsWith(ns))
        .filter((k) => toLogicalKvKey(userId, k).startsWith(logicalPrefix))
        .map((k) => (strip ? toLogicalKvKey(userId, k) : k));
    } catch (error) {
      console.error(`SecureKV List Error for user ${userId}:`, error);
      throw error;
    }
  },
};

/**
 * Auth probe only — not for reading user data.
 * Contained here so no other module touches `puter.kv` directly.
 */
export async function probePuterKvAccess(): Promise<boolean> {
  if (typeof window === "undefined" || !window.puter?.kv) return false;
  try {
    await window.puter.kv.get("_auth_check");
    return true;
  } catch {
    return false;
  }
}

/** Raw KV helpers for one-time migration of pre-namespace / double-prefixed keys. */
export async function listRawPuterKvKeys(): Promise<string[]> {
  return requirePuterKv().list();
}

export async function getRawPuterKvValue(key: string): Promise<unknown> {
  return requirePuterKv().get(key);
}

export async function deleteRawPuterKvKey(key: string): Promise<void> {
  await requirePuterKv().del(key);
}

/**
 * React hook for components. Automatically uses the current Clerk userId.
 */
export function useSecureKv() {
  const { userId, isSignedIn } = useAuth();

  useEffect(() => {
    bindSecureKvUserId(isSignedIn ? userId ?? null : null);
  }, [userId, isSignedIn]);

  const get = useCallback(
    async (key: string) => {
      if (!isSignedIn || !userId) {
        console.warn("SecureKV: User not authenticated");
        return null;
      }
      return secureKv.get(userId, key);
    },
    [userId, isSignedIn]
  );

  const set = useCallback(
    async (key: string, value: unknown) => {
      if (!isSignedIn || !userId) {
        console.warn("SecureKV: User not authenticated");
        return;
      }
      return secureKv.set(userId, key, value);
    },
    [userId, isSignedIn]
  );

  const remove = useCallback(
    async (key: string) => {
      if (!isSignedIn || !userId) {
        console.warn("SecureKV: User not authenticated");
        return;
      }
      return secureKv.delete(userId, key);
    },
    [userId, isSignedIn]
  );

  return { get, set, remove, userId: isSignedIn ? userId : null };
}

/**
 * Mount once under ClerkProvider so lib/ utilities can resolve the active userId
 * via {@link getSecureKvUserId} without threading it through every call site.
 */
export function SecureKvUserBinder() {
  const { userId, isSignedIn } = useAuth();

  useEffect(() => {
    bindSecureKvUserId(isSignedIn ? userId ?? null : null);
  }, [userId, isSignedIn]);

  return null;
}
