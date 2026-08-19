import { getSecureKvUserId, secureKv } from "@/lib/secure-puter-kv";

const LOGO_KEY = "brand_logo";
const HEIGHT_KEY = "brand_logo_height";

export const DEFAULT_LOGO_HEIGHT = 64;
export const MIN_LOGO_HEIGHT = 40;
export const MAX_LOGO_HEIGHT = 200;

function resolveUserId(explicit?: string | null): string | null {
  return explicit?.trim() || getSecureKvUserId() || null;
}

function parseHeight(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (Number.isFinite(n) && n >= MIN_LOGO_HEIGHT && n <= MAX_LOGO_HEIGHT) {
    return n;
  }
  return null;
}

export async function loadBrandLogo(
  userId?: string | null
): Promise<string | null> {
  try {
    const uid = resolveUserId(userId);
    if (!uid || typeof window === "undefined" || !window.puter?.kv) return null;
    const v = await secureKv.get(uid, LOGO_KEY);
    return typeof v === "string" && v.startsWith("data:image") ? v : null;
  } catch {
    return null;
  }
}

export async function saveBrandLogo(
  dataUrl: string,
  userId?: string | null
): Promise<void> {
  const uid = resolveUserId(userId);
  if (!uid) throw new Error("SecureKV: User ID is required");
  await secureKv.set(uid, LOGO_KEY, dataUrl);
}

export async function loadBrandLogoHeight(
  userId?: string | null
): Promise<number> {
  try {
    const uid = resolveUserId(userId);
    if (!uid || typeof window === "undefined" || !window.puter?.kv) {
      return DEFAULT_LOGO_HEIGHT;
    }
    const parsed = parseHeight(await secureKv.get(uid, HEIGHT_KEY));
    if (parsed != null) return parsed;
  } catch {
    /* fall through to default */
  }
  return DEFAULT_LOGO_HEIGHT;
}

export async function saveBrandLogoHeight(
  h: number,
  userId?: string | null
): Promise<void> {
  const uid = resolveUserId(userId);
  if (!uid) throw new Error("SecureKV: User ID is required");
  const clamped = Math.min(
    MAX_LOGO_HEIGHT,
    Math.max(MIN_LOGO_HEIGHT, Math.round(h))
  );
  await secureKv.set(uid, HEIGHT_KEY, String(clamped));
}

export async function clearBrandLogo(userId?: string | null): Promise<void> {
  const uid = resolveUserId(userId);
  if (!uid) throw new Error("SecureKV: User ID is required");
  await Promise.all([
    secureKv.delete(uid, LOGO_KEY),
    secureKv.delete(uid, HEIGHT_KEY),
  ]);
}
