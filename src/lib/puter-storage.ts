"use client";

import type { ProjectIndexEntry } from "@/types/project";

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

export async function readKvValue(key: string): Promise<unknown> {
  if (isPuterKvAvailable()) {
    try {
      const raw = await window.puter!.kv.get(key);
      if (raw != null) return raw;
    } catch (error) {
      console.warn(`[PuterStorage] Puter KV read failed for ${key}:`, error);
    }
  }

  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`[PuterStorage] localStorage read failed for ${key}:`, error);
    }
  }

  return null;
}

export async function writeKvValue(
  key: string,
  value: string
): Promise<"puter" | "localStorage"> {
  if (isPuterKvAvailable()) {
    await window.puter!.kv.set(key, value);
    return "puter";
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(key, value);
    return "localStorage";
  }

  throw new Error("Storage is not available in this environment.");
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
  const userIndex = parseStoredIndex(await readKvValue(userKey));
  if (userIndex.length > 0) {
    return userIndex;
  }

  return parseStoredIndex(await readKvValue(LEGACY_PROJECT_INDEX_KEY));
}

export async function writeProjectIndex(
  userId: string,
  index: ProjectIndexEntry[]
): Promise<void> {
  const serialized = JSON.stringify(index);
  await writeKvValue(userProjectListKey(userId), serialized);
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
    const raw = await readKvValue(key);
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
  const destination = await writeKvValue(storageKey, serialized);
  return { storageKey, destination };
}
