import { DEFAULT_MODEL, isKnownPuterModel } from "./puter-models";
import { getSecureKvUserId, secureKv } from "./secure-puter-kv";

export { DEFAULT_MODEL };

const PREFERENCES_KEY = "user_preferences";

export interface UserPreferences {
  preferredModel: string;
}

let cachedModel: string | null = null;

function resolveModelId(id: unknown): string {
  return typeof id === "string" && isKnownPuterModel(id) ? id : DEFAULT_MODEL;
}

function parsePreferences(stored: unknown): UserPreferences | null {
  if (stored == null) return null;

  let parsed: unknown = stored;
  if (typeof stored === "string") {
    try {
      parsed = JSON.parse(stored);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") return null;
  return {
    preferredModel: resolveModelId(
      (parsed as { preferredModel?: unknown }).preferredModel
    ),
  };
}

export function clearPreferredModelCache(): void {
  cachedModel = null;
}

export function setCachedPreferredModel(modelId: string): void {
  cachedModel = resolveModelId(modelId);
}

function resolvePreferencesUserId(explicit?: string | null): string | null {
  return explicit?.trim() || getSecureKvUserId() || null;
}

export async function loadUserPreferences(
  userId?: string | null
): Promise<UserPreferences> {
  const uid = resolvePreferencesUserId(userId);

  try {
    if (!uid || typeof window === "undefined" || !window.puter?.kv) {
      return { preferredModel: cachedModel ?? DEFAULT_MODEL };
    }

    const stored = await secureKv.get(uid, PREFERENCES_KEY);
    const parsed = parsePreferences(stored);
    if (parsed) {
      cachedModel = parsed.preferredModel;
      return parsed;
    }
  } catch (error) {
    console.warn(
      "Failed to load preferences from Puter KV, using default:",
      error
    );
  }
  return { preferredModel: cachedModel ?? DEFAULT_MODEL };
}

export async function saveUserPreferences(
  preferences: UserPreferences,
  userId?: string | null
): Promise<void> {
  const next: UserPreferences = {
    preferredModel: resolveModelId(preferences.preferredModel),
  };
  const uid = resolvePreferencesUserId(userId);

  try {
    if (!uid || typeof window === "undefined" || !window.puter?.kv) {
      throw new Error(
        uid ? "Puter is not available" : "SecureKV: User ID is required"
      );
    }
    await secureKv.set(uid, PREFERENCES_KEY, next);
    cachedModel = next.preferredModel;
  } catch (error) {
    console.error("Failed to save preferences to Puter KV:", error);
    throw new Error(
      "Could not save AI model preference. Please check your Puter connection."
    );
  }
}

/** Cached Puter KV lookup so AI calls do not hit storage on every request. */
export async function getPreferredModel(
  userId?: string | null
): Promise<string> {
  if (cachedModel) return cachedModel;

  try {
    const prefs = await loadUserPreferences(userId);
    cachedModel = prefs.preferredModel;
    return cachedModel;
  } catch (error) {
    console.warn(
      "Falling back to default model due to preference load error:",
      error
    );
    return DEFAULT_MODEL;
  }
}
