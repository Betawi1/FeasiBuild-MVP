"use client";

import type { ProjectIndexEntry } from "@/types/project";
import {
  getSecureKvUserId,
  secureKv,
} from "@/lib/secure-puter-kv";

/** Legacy key shape — still read for backward compatibility. */
const LEGACY_PROJECT_KEY_PREFIX = "feasibuild_project_";
/** @deprecated Legacy global index key. */
export const LEGACY_PROJECT_INDEX_KEY = "feasibuild_projects_index";

export function userProjectListKey(userId: string): string {
  return `feasibuild_${userId}_projects`;
}

export function userProjectDataKey(userId: string, projectId: string): string {
  return `feasibuild_${userId}_${projectId}`;
}

function legacyProjectDataKey(projectId: string): string {
  return `${LEGACY_PROJECT_KEY_PREFIX}${projectId}`;
}

export function isPuterKvAvailable(): boolean {
  return typeof window !== "undefined" && !!window.puter?.kv;
}

function resolveUserId(explicit?: string): string | null {
  const id = explicit?.trim() || getSecureKvUserId();
  return id || null;
}

function toStorageString(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") return raw;
  try {
    return JSON.stringify(raw);
  } catch {
    return null;
  }
}

export async function readKvValue(
  key: string,
  userId?: string
): Promise<unknown> {
  const uid = resolveUserId(userId);

  if (uid && isPuterKvAvailable()) {
    try {
      const raw = await secureKv.get(uid, key);
      if (raw != null) return typeof raw === "string" ? raw : toStorageString(raw);
    } catch (error) {
      console.warn(`[PuterStorage] Puter KV read failed for ${key}:`, error);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const localKey = uid ? `${uid}:${key}` : key;
      return localStorage.getItem(localKey);
    } catch (error) {
      console.warn(`[PuterStorage] localStorage read failed for ${key}:`, error);
    }
  }

  return null;
}

export function writeLocalKvValue(
  key: string,
  value: string,
  userId?: string
): void {
  const uid = resolveUserId(userId);
  if (!uid || typeof window === "undefined") return;
  try {
    localStorage.setItem(`${uid}:${key}`, value);
  } catch (error) {
    console.warn(`[PuterStorage] localStorage write failed for ${key}:`, error);
  }
}

export async function writeKvValue(
  key: string,
  value: string,
  userId?: string
): Promise<"puter" | "localStorage"> {
  const uid = resolveUserId(userId);
  if (!uid) {
    throw new Error("SecureKV: User ID is required to write project data");
  }

  if (typeof window === "undefined") {
    throw new Error("Storage is not available in this environment.");
  }

  // Optimistic: persist locally first so the UI never waits on Puter.
  writeLocalKvValue(key, value, uid);
  console.log(`[PuterStorage] ✓ localStorage write ${uid}:${key}`);

  if (isPuterKvAvailable()) {
    console.log(`[PuterStorage] Syncing via SecureKV → ${key}`);
    await secureKv.set(uid, key, value);
    return "puter";
  }

  console.warn(`[PuterStorage] Puter unavailable — local only for ${key}`);
  return "localStorage";
}

export async function deleteKvValue(
  key: string,
  userId?: string
): Promise<void> {
  const uid = resolveUserId(userId);

  if (uid && isPuterKvAvailable()) {
    try {
      await secureKv.delete(uid, key);
    } catch (error) {
      console.warn(`[PuterStorage] Puter KV delete failed for ${key}:`, error);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const localKey = uid ? `${uid}:${key}` : key;
      localStorage.removeItem(localKey);
      // Also clear legacy un-namespaced local key if present
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[PuterStorage] localStorage delete failed for ${key}:`, error);
    }
  }
}

function parseStoredIndex(raw: unknown): ProjectIndexEntry[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as ProjectIndexEntry[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as ProjectIndexEntry[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function loadProjectIndex(userId: string): Promise<ProjectIndexEntry[]> {
  const userKey = userProjectListKey(userId);
  const userIndex = parseStoredIndex(await readKvValue(userKey, userId));
  if (userIndex.length > 0) {
    return userIndex;
  }

  return parseStoredIndex(await readKvValue(LEGACY_PROJECT_INDEX_KEY, userId));
}

export async function writeProjectIndex(
  userId: string,
  index: ProjectIndexEntry[]
): Promise<void> {
  const serialized = JSON.stringify(index);
  await writeKvValue(userProjectListKey(userId), serialized, userId);
}

export async function upsertProjectIndexEntry(
  userId: string,
  entry: ProjectIndexEntry
): Promise<void> {
  const existingIndex = await loadProjectIndex(userId);
  const existingProjectIndex = existingIndex.findIndex(
    (item) => item.projectId === entry.projectId
  );

  if (existingProjectIndex >= 0) {
    existingIndex[existingProjectIndex] = {
      ...existingIndex[existingProjectIndex],
      ...entry,
    };
  } else {
    existingIndex.push(entry);
  }

  await writeProjectIndex(userId, existingIndex);
}

export async function removeProjectIndexEntry(
  userId: string,
  projectId: string
): Promise<void> {
  const existingIndex = await loadProjectIndex(userId);
  const updatedIndex = existingIndex.filter(
    (item) => item.projectId !== projectId
  );
  await writeProjectIndex(userId, updatedIndex);
}

export function projectDataKeysForLookup(
  userId: string | undefined,
  projectId: string
): string[] {
  const keys: string[] = [];
  if (userId) {
    keys.push(userProjectDataKey(userId, projectId));
  }
  keys.push(legacyProjectDataKey(projectId));
  keys.push(`project:${projectId}`);
  return keys;
}

export async function readProjectRaw(
  userId: string | undefined,
  projectId: string
): Promise<{ raw: unknown; key: string } | null> {
  for (const key of projectDataKeysForLookup(userId, projectId)) {
    const raw = await readKvValue(key, userId);
    if (raw != null && raw !== "") {
      return { raw, key };
    }
  }
  return null;
}

export async function writeProjectRaw(
  userId: string,
  projectId: string,
  serialized: string
): Promise<{ storageKey: string; destination: "puter" | "localStorage" }> {
  const storageKey = userProjectDataKey(userId, projectId);
  const destination = await writeKvValue(storageKey, serialized, userId);
  return { storageKey, destination };
}
