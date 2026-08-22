"use client";

import useFinModelStore, {
  resolveFinModelStreamKey,
  type FinModelStreamKey,
} from "@/store/useFinModelStore";
import { useFeasibilityStore } from "@/store/useFeasibilityStore";
import useScenarioStore from "@/store/useScenarioStore";
import { getFeasibilityProjectBundle } from "@/lib/feasibility/data-aggregator";
import { getSaleFeasibilityBundle } from "@/lib/feasibility/sale/sale-context";
import { resolveOperationalAssetType } from "@/lib/feasibility/enrich-operational-slides-puter";
import {
  buildCommentaryCacheKey,
  buildOperationalBundleHashes,
  buildSaleBundleHashes,
} from "@/lib/slide-dependencies";
import { getCachedContent, checkPuterStatus } from "@/lib/cache-service";
import {
  loadProjectIndex,
  readProjectRaw,
  removeProjectIndexEntry,
  upsertProjectIndexEntry,
  userProjectDataKey,
  writeProjectRaw,
  writeLocalKvValue,
  deleteKvValue,
  projectDataKeysForLookup,
} from "@/lib/puter-storage";
import { sendOpsAlert } from "@/lib/ops-monitor";
import { sanitizeForStorage } from "@/lib/sanitize";
import { getCustomerTier, type SubscriptionLike } from "@/lib/entitlements";
import { canCreateProject } from "@/lib/report-entitlements";
import { getSecureKvUserId } from "@/lib/secure-puter-kv";
import type {
  AICommentary,
  CollectedProjectState,
  ProjectIndexEntry,
  ProjectSaveData,
  SaveProjectResult,
} from "@/types/project";
import { PROJECT_SAVE_VERSION } from "@/types/project";

const PROJECT_KEY_PREFIX = "feasibuild_project_";
/** @deprecated Legacy global index — reads still supported for migration. */
export const PROJECT_INDEX_KEY = "feasibuild_projects_index";

export function projectStorageKey(
  projectId: string,
  userId?: string
): string {
  if (userId) return userProjectDataKey(userId, projectId);
  return `${PROJECT_KEY_PREFIX}${projectId}`;
}

const LOCAL_ANON_USER_KEY = "feasi_anon_user_id";

/**
 * Clerk id when signed in; otherwise a stable browser-local id so anonymous
 * sessions can local-first save and sync once the account is bound.
 */
export function resolveSaveUserId(clerkUserId?: string | null): string {
  const clerk = clerkUserId?.trim();
  if (clerk) return clerk;
  const bound = getSecureKvUserId();
  if (bound) return bound;
  if (typeof window === "undefined") return "anonymous";
  try {
    let id = window.localStorage.getItem(LOCAL_ANON_USER_KEY);
    if (!id) {
      id = `anon_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      window.localStorage.setItem(LOCAL_ANON_USER_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export function resolveDefaultProjectName(
  stream?: FinModelStreamKey
): string {
  const state = useFinModelStore.getState();
  if (state.activeProjectName?.trim()) return state.activeProjectName.trim();
  const key = resolveFinModelStreamKey(stream, state.assetType);
  const info = state[key].projectInfo;
  const city = info.city?.trim();
  const buildingType = info.buildingType
    ? info.buildingType.charAt(0).toUpperCase() + info.buildingType.slice(1)
    : "Project";
  if (city) return `${city} ${buildingType}`;
  return buildingType;
}

export function generateProjectId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `proj_${crypto.randomUUID()}`;
    }
  } catch {
    // fall through
  }
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseStoredProject(raw: unknown): ProjectSaveData | null {
  if (!raw) return null;
  try {
    const parsed =
      typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    if (!parsed || typeof parsed !== "object") return null;
    const data = parsed as ProjectSaveData;
    if (!data.projectId || !data.stream) return null;
    return data;
  } catch {
    return null;
  }
}

export async function loadProjectFromKV(
  projectId: string,
  userId?: string
): Promise<ProjectSaveData | null> {
  const stored = await readProjectRaw(userId, projectId);
  if (!stored) {
    console.warn(`[ProjectSave] Project not found: ${projectId}`);
    return null;
  }

  const project = parseStoredProject(stored.raw);
  if (!project) {
    console.warn(`[ProjectSave] Invalid project payload for: ${projectId}`);
    return null;
  }

  console.debug(`[ProjectSave] ✓ Loaded project from KV: ${stored.key}`);
  return project;
}

/** Alias for loadProjectFromKV — used by hydration flows. */
export const getProjectFromKV = loadProjectFromKV;

export function collectProjectState(
  streamArg?: FinModelStreamKey
): CollectedProjectState {
  const state = useFinModelStore.getState();
  const stream = resolveFinModelStreamKey(streamArg, state.assetType);
  const slice = state[stream];
  const scenarioState = useScenarioStore.getState();

  const raw = {
    stream,
    assetType: state.assetType,
    projectInfo: slice.projectInfo,
    cashOutflows: slice.cashOutflows,
    cashInflows: slice.cashInflows,
    financing: slice.financing,
    projectIRR: slice.projectIRR,
    equityReturns: slice.equityReturns,
    scenarioAnalysis: slice.scenarioAnalysis,
    scenarioShocks: slice.scenarioShocks ?? {},
    financingMetrics: slice.financingMetrics ?? null,
    hotelHoldSnapshot: slice.hotelHoldSnapshot,
    retailHoldSnapshot: slice.retailHoldSnapshot,
    officeHoldSnapshot: slice.officeHoldSnapshot,
    residentialHoldSnapshot: slice.residentialHoldSnapshot,
    scenarioStore: {
      defaultDrivers: scenarioState.defaultDrivers,
      customDrivers: scenarioState.customDrivers,
      baseCaseMetrics: scenarioState.baseCaseMetrics,
      scenarioMetrics: scenarioState.scenarioMetrics,
      isRecalculating: scenarioState.isRecalculating,
      lastCalculationAt: scenarioState.lastCalculationAt,
    },
  };

  return sanitizeForStorage<CollectedProjectState>(raw);
}

function resolveOperationalCommentarySlideIds(
  buildingType: string,
  assetType?: string
): {
  component1: string;
  component2: string;
} {
  const kind = resolveOperationalAssetType(buildingType, assetType);
  switch (kind) {
    case "office":
      return {
        component1: "office-dev-assumptions",
        component2: "office-operational-revenues",
      };
    case "mall":
      return {
        component1: "mall-dev-assumptions",
        component2: "mall-operational-revenues",
      };
    case "btr":
      return {
        component1: "btr-dev-assumptions",
        component2: "btr-operational-revenues",
      };
    case "hotel":
    default:
      return {
        component1: "fin-dev-assumptions",
        component2: "operational-revenues",
      };
  }
}

function paragraphsToText(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

async function fetchCommentaryForSlide(
  cacheKey: string
): Promise<string> {
  const cached = await getCachedContent<string[] | string>(cacheKey);
  return paragraphsToText(cached);
}

async function fetchOperationalAICommentary(): Promise<AICommentary> {
  const bundle = getFeasibilityProjectBundle();
  const hashes = buildOperationalBundleHashes(bundle);
  const { buildingType, businessModel, stream } =
    useFinModelStore.getState().operational.projectInfo;
  const slideIds = resolveOperationalCommentarySlideIds(
    buildingType,
    businessModel ?? stream
  );

  const keys = {
    executiveSummary: buildCommentaryCacheKey("exec-1", hashes, undefined, "op"),
    component1Analysis: buildCommentaryCacheKey(
      slideIds.component1,
      hashes,
      undefined,
      "op"
    ),
    component2Analysis: buildCommentaryCacheKey(
      slideIds.component2,
      hashes,
      undefined,
      "op"
    ),
    component4Analysis: buildCommentaryCacheKey(
      "irr-and-financing-metrics",
      hashes,
      undefined,
      "op"
    ),
    component6Analysis: buildCommentaryCacheKey(
      "scenario-analysis-results",
      hashes,
      undefined,
      "op"
    ),
  };

  const [
    executiveSummary,
    component1Analysis,
    component2Analysis,
    component4Analysis,
    component6Analysis,
  ] = await Promise.all([
    fetchCommentaryForSlide(keys.executiveSummary),
    fetchCommentaryForSlide(keys.component1Analysis),
    fetchCommentaryForSlide(keys.component2Analysis),
    fetchCommentaryForSlide(keys.component4Analysis),
    fetchCommentaryForSlide(keys.component6Analysis),
  ]);

  return {
    executiveSummary,
    component1Analysis,
    component2Analysis,
    component4Analysis,
    component6Analysis,
  };
}

async function fetchSaleAICommentary(): Promise<AICommentary> {
  const bundle = getSaleFeasibilityBundle();
  const hashes = buildSaleBundleHashes(bundle);

  const keys = {
    executiveSummary: buildCommentaryCacheKey(
      "exec-1",
      hashes,
      undefined,
      "sale"
    ),
    component1Analysis: buildCommentaryCacheKey(
      "sale-dev-assumptions",
      hashes,
      undefined,
      "sale"
    ),
    component2Analysis: buildCommentaryCacheKey(
      "sale-sales-summary-table",
      hashes,
      undefined,
      "sale"
    ),
    component4Analysis: buildCommentaryCacheKey(
      "sale-irr-metrics",
      hashes,
      undefined,
      "sale"
    ),
    component6Analysis: buildCommentaryCacheKey(
      "sale-scenario-results",
      hashes,
      undefined,
      "sale"
    ),
  };

  const [
    executiveSummary,
    component1Analysis,
    component2Analysis,
    component4Analysis,
    component6Analysis,
  ] = await Promise.all([
    fetchCommentaryForSlide(keys.executiveSummary),
    fetchCommentaryForSlide(keys.component1Analysis),
    fetchCommentaryForSlide(keys.component2Analysis),
    fetchCommentaryForSlide(keys.component4Analysis),
    fetchCommentaryForSlide(keys.component6Analysis),
  ]);

  return {
    executiveSummary,
    component1Analysis,
    component2Analysis,
    component4Analysis,
    component6Analysis,
  };
}

export async function fetchAICommentary(
  _projectId: string,
  stream: FinModelStreamKey
): Promise<AICommentary> {
  try {
    if (stream === "sale") {
      return await fetchSaleAICommentary();
    }
    return await fetchOperationalAICommentary();
  } catch (error) {
    console.warn("[ProjectSave] Failed to fetch AI commentary:", error);
    return {
      executiveSummary: "",
      component1Analysis: "",
      component2Analysis: "",
      component4Analysis: "",
      component6Analysis: "",
    };
  }
}

function formatProjectLocation(projectInfo: ProjectSaveData["projectInfo"]): string {
  const city = projectInfo.city?.trim();
  const country = projectInfo.country?.trim();
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return "Unknown";
}

export function resolveProjectStatus(
  projectData: Pick<ProjectSaveData, "feasibilityStudyGeneratedAt">,
  slideCount = 0
): ProjectIndexEntry["status"] {
  if (projectData.feasibilityStudyGeneratedAt || slideCount > 0) {
    return "Completed";
  }
  return "Draft";
}

export function buildProjectIndexEntry(
  projectData: ProjectSaveData,
  options?: { slideCount?: number }
): ProjectIndexEntry {
  const projectType = projectData.stream === "sale" ? "Sale" : "Operational";
  return {
    projectId: projectData.projectId,
    projectName: projectData.projectName || "Untitled Project",
    projectType,
    status: resolveProjectStatus(projectData, options?.slideCount ?? 0),
    lastModified: projectData.metadata.lastModified,
    location: formatProjectLocation(projectData.projectInfo),
  };
}

/** Mark a saved project as having a completed feasibility study (updates KV + index). */
export async function markFeasibilityStudyCompleted(
  userId: string,
  projectId: string,
  generatedAt?: string
): Promise<void> {
  const timestamp = generatedAt ?? new Date().toISOString();
  const existing = await loadProjectFromKV(projectId, userId);

  if (existing) {
    const updated: ProjectSaveData = {
      ...existing,
      feasibilityStudyGeneratedAt:
        existing.feasibilityStudyGeneratedAt ?? timestamp,
      metadata: {
        ...existing.metadata,
        lastModified: timestamp,
      },
    };
    const serialized = JSON.stringify(sanitizeForStorage(updated));
    await writeProjectRaw(userId, projectId, serialized);
    await upsertProjectIndexEntry(userId, buildProjectIndexEntry(updated));
    return;
  }

  const index = await loadProjectIndex(userId);
  const entry = index.find((item) => item.projectId === projectId);
  if (entry && entry.status !== "Completed") {
    await upsertProjectIndexEntry(userId, {
      ...entry,
      status: "Completed",
      lastModified: timestamp,
    });
  }
}

async function updateProjectIndex(
  userId: string,
  projectData: ProjectSaveData
): Promise<void> {
  try {
    const slideCount = useFeasibilityStore.getState().slides.length;
    const projectMetadata = buildProjectIndexEntry(projectData, { slideCount });
    await upsertProjectIndexEntry(userId, projectMetadata);
    console.debug("[ProjectSave] Project index updated successfully");
  } catch (error) {
    console.error("[ProjectSave] Failed to update project index:", error);
  }
}

function validateProjectSaveData(data: ProjectSaveData): void {
  if (!data.userId?.trim()) {
    throw new Error("User ID is required to save a project.");
  }
  if (!data.projectId?.trim()) {
    throw new Error("Project ID is required.");
  }
  if (!data.projectName?.trim()) {
    throw new Error("Project name is required.");
  }
  if (!data.stream) {
    throw new Error("Project stream is required.");
  }
  if (!data.projectInfo || !data.cashOutflows || !data.cashInflows) {
    throw new Error("Project state is incomplete.");
  }
}

export async function fetchProjectIndex(
  userId: string
): Promise<ProjectIndexEntry[]> {
  const index = await loadProjectIndex(userId);
  const enriched = await Promise.all(
    index.map(async (entry) => {
      if (entry.status === "Completed") return entry;
      const project = await loadProjectFromKV(entry.projectId, userId);
      if (!project?.feasibilityStudyGeneratedAt) return entry;
      return {
        ...entry,
        status: "Completed" as const,
        lastModified: project.metadata.lastModified,
      };
    })
  );
  return enriched.sort(
    (a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );
}

export async function deleteProjectFromKV(
  userId: string,
  projectId: string
): Promise<void> {
  if (!userId?.trim()) {
    throw new Error("User ID is required to delete a project.");
  }
  if (!projectId?.trim()) {
    throw new Error("Project ID is required.");
  }

  await removeProjectIndexEntry(userId, projectId);

  const keysToDelete = new Set(projectDataKeysForLookup(userId, projectId));
  await Promise.all(
    [...keysToDelete].map((key) => deleteKvValue(key, userId))
  );

  console.debug(`[ProjectSave] ✓ Deleted project ${projectId}`);
}

export async function saveProjectToKV(
  projectData: ProjectSaveData
): Promise<SaveProjectResult> {
  console.debug("[ProjectSave] Starting save to Puter KV...");
  const sanitized = sanitizeForStorage<ProjectSaveData>(projectData);
  validateProjectSaveData(sanitized);

  try {
    const payloadSize = JSON.stringify(sanitized).length;
    console.debug("[ProjectSave] Sanitized payload size:", payloadSize, "bytes");
  } catch (error) {
    console.warn("[ProjectSave] Could not measure payload size:", error);
  }

  const userId = sanitized.userId!;
  const serialized = JSON.stringify(sanitized);
  const logicalKey = userProjectDataKey(userId, sanitized.projectId);

  // Optimistic: mirror into localStorage before vault sync.
  writeLocalKvValue(logicalKey, serialized, userId);
  console.debug("[ProjectSave] ✓ Saved locally to localStorage", {
    projectId: sanitized.projectId,
    key: logicalKey,
  });

  const status = await checkPuterStatus();
  if (!status.available && typeof window === "undefined") {
    throw new Error("Puter KV is not available.");
  }

  try {
    const { storageKey, destination } = await writeProjectRaw(
      userId,
      sanitized.projectId,
      serialized
    );
    await updateProjectIndex(userId, sanitized);
    console.debug(
      `[ProjectSave] ✓ Synced to Puter KV vault (${destination})`,
      sanitized.projectId
    );

    return {
      projectId: sanitized.projectId,
      storageKey,
    };
  } catch (error) {
    console.error("[ProjectSave] ✗ Failed to sync to Puter KV:", error);
    void sendOpsAlert(error instanceof Error ? error : String(error), {
      source: "Project Save/Sync",
      projectId: sanitized.projectId,
    });
    throw error;
  }
}

export interface BuildProjectSaveInput {
  projectName: string;
  description?: string;
  tags?: string[];
  stream?: FinModelStreamKey;
  userId: string;
  /** Clerk primary email — used to enforce Explorer new-project lock. */
  email?: string;
  /** Clerk publicMetadata.subscription — PayPal plan, used with email fallback. */
  subscription?: SubscriptionLike | null;
  /** When set, updates an existing project instead of creating a duplicate. */
  projectId?: string;
}

export async function buildAndSaveProject(
  input: BuildProjectSaveInput
): Promise<SaveProjectResult> {
  if (!input.userId?.trim()) {
    throw new Error("You must be signed in to save a project.");
  }

  const isNewProject = !input.projectId?.trim();
  if (isNewProject) {
    const ok = await canCreateProject(
      getCustomerTier(input.email ?? "", input.subscription),
      input.userId
    );
    if (!ok) {
      throw new Error(
        "Free tier limit reached. Upgrade to start new projects."
      );
    }
  }

  const collected = collectProjectState(input.stream);
  const projectId = input.projectId?.trim() || generateProjectId();
  const now = new Date().toISOString();
  const existingProject = input.projectId
    ? await loadProjectFromKV(projectId, input.userId)
    : null;

  const feasibilityState = useFeasibilityStore.getState();
  const slideCount = feasibilityState.slides.length;
  const studyGeneratedAt =
    feasibilityState.report?.generatedAt ??
    existingProject?.feasibilityStudyGeneratedAt;

  const draft: ProjectSaveData = {
    projectId,
    userId: input.userId,
    savedAt: existingProject?.savedAt ?? now,
    projectName: input.projectName.trim(),
    description: input.description?.trim() || undefined,
    tags: input.tags?.length ? input.tags : undefined,
    stream: collected.stream,
    projectInfo: collected.projectInfo,
    cashOutflows: collected.cashOutflows,
    cashInflows: collected.cashInflows,
    financing: collected.financing,
    projectIRR: collected.projectIRR,
    aiCommentary: existingProject?.aiCommentary ?? {
      executiveSummary: "",
      component1Analysis: "",
      component2Analysis: "",
      component4Analysis: "",
      component6Analysis: "",
    },
    feasibilityStudyGeneratedAt:
      existingProject?.feasibilityStudyGeneratedAt ??
      (slideCount > 0 ? studyGeneratedAt ?? now : undefined),
    collectedState: collected,
    metadata: {
      version: PROJECT_SAVE_VERSION,
      lastModified: now,
    },
  };

  useFinModelStore.getState().setActiveProject(projectId, draft.projectName);
  writeLocalKvValue(
    userProjectDataKey(input.userId, projectId),
    JSON.stringify(sanitizeForStorage(draft)),
    input.userId
  );
  console.debug("[ProjectSave] ✓ Draft saved locally (pre-commentary)", projectId);

  const aiCommentary = await fetchAICommentary(projectId, collected.stream);
  const projectData: ProjectSaveData = {
    ...draft,
    aiCommentary,
  };

  return saveProjectToKV(projectData);
}
