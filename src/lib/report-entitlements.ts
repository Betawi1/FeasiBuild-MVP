import { getSecureKvUserId, secureKv } from "@/lib/secure-puter-kv";
import { type CustomerTier } from "@/lib/entitlements";

const EXPORTS_KEY = "fs_exports_used";
const EXPORTED_PROJECTS_KEY = "fs_exported_projects";
export const EXPLORER_REPORT_LIMIT = 1;

function resolveUserId(explicit?: string | null): string | null {
  return explicit?.trim() || getSecureKvUserId() || null;
}

export async function getUsedReportExports(
  userId?: string | null
): Promise<number> {
  try {
    const uid = resolveUserId(userId);
    if (!uid || typeof window === "undefined" || !window.puter?.kv) return 0;
    const v = await secureKv.get(uid, EXPORTS_KEY);
    const n = typeof v === "number" ? v : parseInt(String(v), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

async function incrementExplorerExports(userId?: string | null): Promise<number> {
  const uid = resolveUserId(userId);
  if (!uid) throw new Error("SecureKV: User ID is required");
  const next = (await getUsedReportExports(uid)) + 1;
  await secureKv.set(uid, EXPORTS_KEY, String(next));
  return next;
}

function parseExportedProjects(v: unknown): Record<string, true> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, true>;
  }
  if (typeof v === "string" && v.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(v) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, true>;
      }
    } catch {
      /* corrupted map → start fresh */
    }
  }
  return {};
}

async function getExportedProjects(
  userId?: string | null
): Promise<Record<string, true>> {
  try {
    const uid = resolveUserId(userId);
    if (!uid || typeof window === "undefined" || !window.puter?.kv) return {};
    return parseExportedProjects(await secureKv.get(uid, EXPORTED_PROJECTS_KEY));
  } catch {
    return {};
  }
}

async function markProjectExported(
  projectId: string,
  userId?: string | null
): Promise<void> {
  const uid = resolveUserId(userId);
  if (!uid) throw new Error("SecureKV: User ID is required");
  const map = await getExportedProjects(uid);
  map[projectId] = true;
  await secureKv.set(uid, EXPORTED_PROJECTS_KEY, JSON.stringify(map));
}

export function shouldWatermark(tier: CustomerTier): boolean {
  return tier === "explorer";
}

export interface ExportDecision {
  allowed: boolean;
  /** true = this download consumes a report / credit */
  consumesReport: boolean;
}

export async function evaluateExport(
  tier: CustomerTier,
  projectId: string | null,
  userId?: string | null
): Promise<ExportDecision> {
  if (tier === "advisory") return { allowed: true, consumesReport: false };

  if (tier === "pro") {
    if (!projectId) return { allowed: true, consumesReport: true };
    const map = await getExportedProjects(userId);
    return { allowed: true, consumesReport: !map[projectId] };
    // CREDIT-READY: when checkout goes live, require a credit balance
    // here whenever consumesReport === true, and decrement it in
    // recordExport(). Re-exports (consumesReport === false) never charge.
  }

  const used = await getUsedReportExports(userId);
  if (used >= EXPLORER_REPORT_LIMIT) {
    return { allowed: false, consumesReport: false };
  }
  return { allowed: true, consumesReport: true };
}

export async function recordExport(
  tier: CustomerTier,
  projectId: string | null,
  userId?: string | null
): Promise<void> {
  if (tier === "explorer") {
    await incrementExplorerExports(userId);
  } else if (tier === "pro" && projectId) {
    await markProjectExported(projectId, userId);
  }
}
