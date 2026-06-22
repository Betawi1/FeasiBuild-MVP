"use client";

import useFinModelStore, {
  resolveFinModelStreamKey,
  type FinModelStreamKey,
} from "@/store/useFinModelStore";
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
import { sanitizeForStorage } from "@/lib/sanitize";
import type {
  AICommentary,
  CollectedProjectState,
  ProjectIndexEntry,
  ProjectSaveData,
  SaveProjectResult,
} from "@/types/project";
import { PROJECT_SAVE_VERSION } from "@/types/project";

const PROJECT_KEY_PREFIX = "feasibuild_project_";
/** @deprecated Legacy save key — still read on load for backward compatibility. */
const LEGACY_PROJECT_KEY_PREFIX = "project:";
export const PROJECT_INDEX_KEY = "feasibuild_projects_index";
const MAX_SAVE_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

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

export function projectStorageKey(projectId: string): string {
  return `${PROJECT_KEY_PREFIX}${projectId}`;
}

function legacyProjectStorageKey(projectId: string): string {
  return `${LEGACY_PROJECT_KEY_PREFIX}${projectId}`;
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

async function readProjectByKey(key: string): Promise<ProjectSaveData | null> {
  if (isPuterKvAvailable()) {
    try {
      const raw = await window.puter!.kv.get(key);
      const project = parseStoredProject(raw);
      if (project) return project;
    } catch (error) {
      console.warn(`[ProjectSave] Puter KV read failed for ${key}:`, error);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(key);
      const project = parseStoredProject(raw);
      if (project) return project;
    } catch (error) {
      console.warn(`[ProjectSave] localStorage read failed for ${key}:`, error);
    }
  }

  return null;
}

export async function loadProjectFromKV(
  projectId: string
): Promise<ProjectSaveData | null> {
  const primaryKey = projectStorageKey(projectId);
  const primary = await readProjectByKey(primaryKey);
  if (primary) {
    console.log(`[ProjectSave] ✓ Loaded project from KV: ${primaryKey}`);
    return primary;
  }

  const legacyKey = legacyProjectStorageKey(projectId);
  const legacy = await readProjectByKey(legacyKey);
  if (legacy) {
    console.log(`[ProjectSave] ✓ Loaded project from legacy KV key: ${legacyKey}`);
    return legacy;
  }

  console.warn(`[ProjectSave] Project not found: ${projectId}`);
  return null;
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

function isPuterKvAvailable(): boolean {
  return typeof window !== "undefined" && !!window.puter?.kv;
}

async function writeProjectToKv(
  key: string,
  data: ProjectSaveData
): Promise<"puter" | "localStorage"> {
  const serialized = JSON.stringify(data);

  if (isPuterKvAvailable()) {
    await window.puter!.kv.set(key, serialized);
    return "puter";
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(key, serialized);
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

function formatProjectLocation(projectInfo: ProjectSaveData["projectInfo"]): string {
  const city = projectInfo.city?.trim();
  const country = projectInfo.country?.trim();
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return "Unknown";
}

export function buildProjectIndexEntry(
  projectData: ProjectSaveData
): ProjectIndexEntry {
  const projectType = projectData.stream === "sale" ? "Sale" : "Operational";
  return {
    projectId: projectData.projectId,
    projectName: projectData.projectName || "Untitled Project",
    projectType,
    status: "Draft",
    lastModified: projectData.metadata.lastModified,
    location: formatProjectLocation(projectData.projectInfo),
  };
}

async function readProjectIndexFromStorage(): Promise<ProjectIndexEntry[]> {
  if (isPuterKvAvailable()) {
    try {
      const raw = await window.puter!.kv.get(PROJECT_INDEX_KEY);
      return parseStoredIndex(raw);
    } catch (error) {
      console.warn("[ProjectSave] Puter KV index read failed:", error);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PROJECT_INDEX_KEY);
      return parseStoredIndex(raw);
    } catch (error) {
      console.warn("[ProjectSave] localStorage index read failed:", error);
    }
  }

  return [];
}

async function writeProjectIndexToStorage(
  index: ProjectIndexEntry[]
): Promise<void> {
  const serialized = JSON.stringify(index);

  if (isPuterKvAvailable()) {
    try {
      await window.puter!.kv.set(PROJECT_INDEX_KEY, serialized);
      return;
    } catch (error) {
      console.warn("[ProjectSave] Puter KV index write failed:", error);
    }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(PROJECT_INDEX_KEY, serialized);
  }
}

export async function fetchProjectIndex(): Promise<ProjectIndexEntry[]> {
  const index = await readProjectIndexFromStorage();
  return [...index].sort(
    (a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );
}

async function updateProjectIndex(projectData: ProjectSaveData): Promise<void> {
  try {
    const existingIndex = await readProjectIndexFromStorage();
    const projectMetadata = buildProjectIndexEntry(projectData);
    const existingProjectIndex = existingIndex.findIndex(
      (entry) => entry.projectId === projectMetadata.projectId
    );

    if (existingProjectIndex >= 0) {
      existingIndex[existingProjectIndex] = {
        ...existingIndex[existingProjectIndex],
        ...projectMetadata,
      };
    } else {
      existingIndex.push(projectMetadata);
    }

    await writeProjectIndexToStorage(existingIndex);
    console.log("[ProjectSave] Project index updated successfully");
  } catch (error) {
    console.error("[ProjectSave] Failed to update project index:", error);
  }
}

function validateProjectSaveData(data: ProjectSaveData): void {
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function saveProjectToKV(
  projectData: ProjectSaveData
): Promise<SaveProjectResult> {
  const sanitized = sanitizeForStorage<ProjectSaveData>(projectData);
  validateProjectSaveData(sanitized);

  try {
    const payloadSize = JSON.stringify(sanitized).length;
    console.log("[ProjectSave] Sanitized payload size:", payloadSize, "bytes");
  } catch (error) {
    console.warn("[ProjectSave] Could not measure payload size:", error);
  }

  const key = projectStorageKey(sanitized.projectId);
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_SAVE_RETRIES; attempt++) {
    try {
      const status = await checkPuterStatus();
      if (!status.available && typeof window === "undefined") {
        throw new Error("Puter KV is not available.");
      }

      const destination = await writeProjectToKv(key, sanitized);
      await updateProjectIndex(sanitized);
      console.log(
        `[ProjectSave] ✓ Saved project ${sanitized.projectId} to ${destination}`
      );

      return {
        projectId: sanitized.projectId,
        storageKey: key,
      };
    } catch (error) {
      lastError = error;
      console.warn(
        `[ProjectSave] Save attempt ${attempt}/${MAX_SAVE_RETRIES} failed:`,
        error
      );
      if (attempt < MAX_SAVE_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * attempt);
      }
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "Failed to save project after multiple attempts.";
  throw new Error(message);
}

export interface BuildProjectSaveInput {
  projectName: string;
  description?: string;
  tags?: string[];
  stream?: FinModelStreamKey;
}

export async function buildAndSaveProject(
  input: BuildProjectSaveInput
): Promise<SaveProjectResult> {
  const collected = collectProjectState(input.stream);
  const projectId = generateProjectId();
  const now = new Date().toISOString();

  const aiCommentary = await fetchAICommentary(projectId, collected.stream);

  const projectData: ProjectSaveData = {
    projectId,
    savedAt: now,
    projectName: input.projectName.trim(),
    description: input.description?.trim() || undefined,
    tags: input.tags?.length ? input.tags : undefined,
    stream: collected.stream,
    projectInfo: collected.projectInfo,
    cashOutflows: collected.cashOutflows,
    cashInflows: collected.cashInflows,
    financing: collected.financing,
    projectIRR: collected.projectIRR,
    aiCommentary,
    collectedState: collected,
    metadata: {
      version: PROJECT_SAVE_VERSION,
      lastModified: now,
    },
  };

  return saveProjectToKV(projectData);
}
