"use client";

import { useCallback, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import {
  buildAndSaveProject,
  generateProjectId,
  resolveDefaultProjectName,
  resolveSaveUserId,
  type BuildProjectSaveInput,
} from "@/lib/project-save";
import { getCustomerTier } from "@/lib/entitlements";
import { canCreateProject } from "@/lib/report-entitlements";
import useFinModelStore, { type FinModelStreamKey } from "@/store/useFinModelStore";
import {
  useProjectSaveUiStore,
  type ProjectSaveUiStatus,
} from "@/store/useProjectSaveUiStore";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { sendOpsAlert } from "@/lib/ops-monitor";
import type { SaveProjectResult } from "@/types/project";

export type { ProjectSaveUiStatus };

/** Minimum time to show "Saved Locally" before switching to Syncing. */
const SAVED_LOCALLY_VISIBLE_MS = 500;

export function projectSaveButtonLabel(
  status: ProjectSaveUiStatus,
  idleLabel: string
): string {
  switch (status) {
    case "syncing":
      return "Syncing...";
    case "synced":
      return "✓ Synced";
    case "failed":
      return "Retry Save";
    case "saved_locally":
      return "Saved Locally";
    default:
      return idleLabel;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function subscriptionFromUser(user: {
  publicMetadata?: Record<string, unknown>;
} | null | undefined) {
  return (user?.publicMetadata as { subscription?: Record<string, unknown> } | undefined)
    ?.subscription;
}

async function syncToVault(
  input: BuildProjectSaveInput,
  options?: { skipLocalStatus?: boolean }
): Promise<SaveProjectResult> {
  const ui = useProjectSaveUiStore.getState();
  ui.setLastInput(input);

  if (!options?.skipLocalStatus) {
    console.log("[ProjectSave] UI → saved_locally");
    ui.setSaveStatus("saved_locally");
    await sleep(SAVED_LOCALLY_VISIBLE_MS);
  }

  console.log("[ProjectSave] UI → syncing (Puter vault)");
  ui.setSaveStatus("syncing");
  ui.setSyncInFlight(true);

  try {
    const result = await buildAndSaveProject(input);
    console.log("[ProjectSave] UI → synced", result.projectId);
    ui.setSaveStatus("synced");
    window.setTimeout(() => {
      const current = useProjectSaveUiStore.getState().saveStatus;
      if (current === "synced") {
        useProjectSaveUiStore.getState().setSaveStatus("idle");
      }
    }, 3000);
    return result;
  } catch (error) {
    console.error("[ProjectSave] UI → failed:", error);
    void sendOpsAlert(error instanceof Error ? error : String(error), {
      source: "Project Save/Sync",
      projectId: input.projectId,
    });
    ui.setSaveStatus("failed");
    throw error;
  } finally {
    useProjectSaveUiStore.getState().setSyncInFlight(false);
  }
}

export async function beginOptimisticSave(input: Omit<
  BuildProjectSaveInput,
  "userId" | "projectId"
> & {
  userId?: string;
  projectId?: string;
}): Promise<SaveProjectResult> {
  const userId = resolveSaveUserId(input.userId);
  const email = input.email?.trim() || "";
  const subscription = input.subscription ?? undefined;
  const existingId = input.projectId?.trim() || undefined;
  const isNewProject = !existingId;

  if (isNewProject) {
    const ok = await canCreateProject(
      getCustomerTier(email, subscription),
      userId
    );
    if (!ok) {
      throw new Error(
        "Free tier limit reached. Upgrade to start new projects."
      );
    }
  }

  const projectId = existingId || generateProjectId();
  const payload: BuildProjectSaveInput = {
    ...input,
    userId,
    email,
    subscription,
    projectId,
  };

  console.log("[ProjectSave] Optimistic save started", {
    projectId,
    projectName: payload.projectName,
    isUpdate: Boolean(existingId),
  });

  useProjectSaveUiStore.getState().setLastInput(payload);
  useFinModelStore.getState().setActiveProject(projectId, payload.projectName);

  return syncToVault(payload);
}

const AUTO_SAVE_TOAST = "Project saved — it now appears on your dashboard.";

let ensureInFlight: Promise<string | null> | null = null;

export type AutoSaveToastFn = (toast: {
  variant: "success" | "error" | "info";
  title: string;
  description?: string;
}) => void;

/**
 * Persist the current session if it is unsaved. Reuses the existing optimistic
 * save path (local-first → vault). No-ops when a proj_ id already exists.
 * Explorer + dashboard lock + no id → skip silently.
 */
export async function ensureProjectAutoSaved(options: {
  stream: FinModelStreamKey;
  clerkUserId?: string | null;
  email?: string;
  subscription?: BuildProjectSaveInput["subscription"];
  showToast?: AutoSaveToastFn;
}): Promise<string | null> {
  if (ensureInFlight) return ensureInFlight;

  ensureInFlight = (async () => {
    const existingId = useFinModelStore.getState().activeProjectId?.trim();
    if (existingId) {
      return existingId;
    }

    const userId = resolveSaveUserId(options.clerkUserId);
    const email = options.email?.trim() || "";
    const ok = await canCreateProject(
      getCustomerTier(email, options.subscription),
      userId
    );
    if (!ok) {
      console.log(
        "[ProjectSave] Auto-save skipped — Explorer new-project lock"
      );
      return null;
    }

    const wasUnsaved = true;
    try {
      const result = await beginOptimisticSave({
        projectName: resolveDefaultProjectName(options.stream),
        stream: options.stream,
        userId,
        email,
        subscription: options.subscription,
      });

      if (wasUnsaved && result.projectId) {
        const after = useProjectSaveUiStore.getState();
        if (!after.autoSaveToastShown[result.projectId]) {
          after.markAutoSaveToastShown(result.projectId);
          options.showToast?.({
            variant: "success",
            title: AUTO_SAVE_TOAST,
          });
        }
      }

      return result.projectId;
    } catch (error) {
      console.error("[ProjectSave] Auto-save failed:", error);
      return useFinModelStore.getState().activeProjectId;
    }
  })().finally(() => {
    ensureInFlight = null;
  });

  return ensureInFlight;
}

export function useOptimisticProjectSave() {
  const { user, isLoaded } = useUser();
  const isOnline = useNetworkStatus();
  const saveStatus = useProjectSaveUiStore((s) => s.saveStatus);
  const wasOnlineRef = useRef(isOnline);

  const retryLastSave = useCallback(async () => {
    const last = useProjectSaveUiStore.getState().lastInput;
    if (!last) return null;
    return syncToVault(last, { skipLocalStatus: true });
  }, []);

  const beginSave = useCallback(
    async (
      input: Omit<BuildProjectSaveInput, "userId" | "projectId"> & {
        userId?: string;
        projectId?: string;
      }
    ): Promise<SaveProjectResult> => {
      return beginOptimisticSave({
        ...input,
        userId: input.userId?.trim() || user?.id,
        email:
          input.email?.trim() ||
          user?.primaryEmailAddress?.emailAddress ||
          "",
        subscription:
          input.subscription ?? subscriptionFromUser(user) ?? undefined,
      });
    },
    [user]
  );

  useEffect(() => {
    const cameOnline = isOnline && !wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    const ui = useProjectSaveUiStore.getState();
    if (
      cameOnline &&
      ui.saveStatus === "failed" &&
      ui.lastInput &&
      !ui.syncInFlight
    ) {
      console.log("[ProjectSave] Back online — retrying failed save...");
      void syncToVault(ui.lastInput, { skipLocalStatus: true }).catch(
        () => undefined
      );
    }
  }, [isOnline]);

  useEffect(() => {
    const clerkId = user?.id;
    if (!isLoaded || !clerkId) return;
    const last = useProjectSaveUiStore.getState().lastInput;
    if (!last?.projectId || last.userId === clerkId) return;
    if (last.userId.startsWith("anon_") || last.userId === "anonymous") {
      console.log("[ProjectSave] Clerk bound — syncing local save to account");
      const payload: BuildProjectSaveInput = {
        ...last,
        userId: clerkId,
        email: user?.primaryEmailAddress?.emailAddress || last.email || "",
        subscription: subscriptionFromUser(user) ?? last.subscription,
      };
      void syncToVault(payload, { skipLocalStatus: true }).catch(
        () => undefined
      );
    }
  }, [isLoaded, user?.id, user?.primaryEmailAddress?.emailAddress]);

  return {
    saveStatus,
    isOnline,
    isLoaded,
    user,
    beginOptimisticSave: beginSave,
    retryLastSave,
    hasPendingSave: () => useProjectSaveUiStore.getState().lastInput != null,
  };
}
