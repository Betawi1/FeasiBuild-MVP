"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import {
  buildNamespacedKvKey,
  deleteRawPuterKvKey,
  getRawPuterKvValue,
  KV_PREFIX,
  LEGACY_USER_KEY_PREFIX,
  listRawPuterKvKeys,
  secureKv,
  toLogicalKvKey,
} from "@/lib/secure-puter-kv";

const MIGRATION_SESSION_KEY = "puter_kv_migrated";

export type PuterKvMigrationResult = {
  migrated: number;
  errors: number;
};

function parseStoredValue(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function waitForPuterKv(timeoutMs = 8000): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (typeof window !== "undefined" && window.puter?.kv) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

/**
 * Migrates old `feasibuild_${userId}_*` keys and accidental double-prefixed
 * `feasi_build_${userId}_feasibuild_${userId}_*` keys to
 * `feasi_build_${userId}_${logicalKey}`.
 */
export async function migrateOldPuterKeys(
  userId: string
): Promise<PuterKvMigrationResult> {
  let migrated = 0;
  let errors = 0;

  if (!userId) {
    return { migrated, errors };
  }

  try {
    const ready = await waitForPuterKv();
    if (!ready) {
      console.warn("[Migration] Puter KV not available; skipping");
      return { migrated, errors };
    }

    const allKeys = await listRawPuterKvKeys();
    const legacyPrefix = `${LEGACY_USER_KEY_PREFIX}${userId}_`;
    const newPrefix = `${KV_PREFIX}${userId}_`;
    const doublePrefix = `${newPrefix}${legacyPrefix}`;

    const oldKeys = allKeys.filter(
      (key) =>
        key.startsWith(legacyPrefix) || key.startsWith(doublePrefix)
    );

    console.log(
      `[Migration] Found ${oldKeys.length} old keys to migrate for user ${userId}`
    );

    for (const oldKey of oldKeys) {
      try {
        const value = await getRawPuterKvValue(oldKey);
        if (value == null || value === "") continue;

        const cleanKey = toLogicalKvKey(userId, oldKey);
        const namespacedKey = buildNamespacedKvKey(userId, cleanKey);

        if (namespacedKey === oldKey) continue;

        await secureKv.set(userId, cleanKey, parseStoredValue(value));
        await deleteRawPuterKvKey(oldKey);

        migrated += 1;
        console.log(`[Migration] Migrated: ${oldKey} → ${namespacedKey}`);
      } catch (error) {
        console.error(`[Migration] Error migrating ${oldKey}:`, error);
        errors += 1;
      }
    }

    console.log(`[Migration] Complete: ${migrated} migrated, ${errors} errors`);
  } catch (error) {
    console.error("[Migration] Failed to list keys:", error);
  }

  return { migrated, errors };
}

/** Run once per signed-in session after Clerk + Puter are ready. */
export function PuterKvMigrationTrigger() {
  const { userId, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn || !userId || typeof window === "undefined") return;

    const sessionKey = `${MIGRATION_SESSION_KEY}_${userId}`;
    if (sessionStorage.getItem(sessionKey)) return;

    void migrateOldPuterKeys(userId)
      .then(({ migrated }) => {
        if (migrated > 0) {
          console.log(
            `✅ Migrated ${migrated} old keys to new secure format`
          );
        }
        sessionStorage.setItem(sessionKey, "true");
      })
      .catch((error) => {
        console.error("[Migration] Unexpected failure:", error);
      });
  }, [userId, isSignedIn]);

  return null;
}
