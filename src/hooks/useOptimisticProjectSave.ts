"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  buildAndSaveProject,
  generateProjectId,
  type BuildProjectSaveInput,
} from "@/lib/project-save";
import { getCustomerTier } from "@/lib/entitlements";
import { canCreateProject } from "@/lib/report-entitlements";
import useFinModelStore from "@/store/useFinModelStore";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { sendOpsAlert } from "@/lib/ops-monitor";
import type { SaveProjectResult } from "@/types/project";

export type ProjectSaveUiStatus =
  | "idle"
  | "saved_locally"
  | "syncing"
  | "synced"
  | "failed";

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

export function useOptimisticProjectSave() {
  const { user, isLoaded } = useUser();
  const isOnline = useNetworkStatus();
  const [saveStatus, setSaveStatus] = useState<ProjectSaveUiStatus>("idle");
  const lastInputRef = useRef<BuildProjectSaveInput | null>(null);
  const saveStatusRef = useRef<ProjectSaveUiStatus>(saveStatus);
  const wasOnlineRef = useRef(isOnline);
  const syncInFlightRef = useRef(false);

  saveStatusRef.current = saveStatus;

  const syncToVault = useCallback(
    async (
      input: BuildProjectSaveInput,
      options?: { skipLocalStatus?: boolean }
    ): Promise<SaveProjectResult> => {
      lastInputRef.current = input;

      if (!options?.skipLocalStatus) {
        console.log("[ProjectSave] UI → saved_locally");
        setSaveStatus("saved_locally");
        // Let React paint "Saved Locally" before flipping to syncing.
        await sleep(SAVED_LOCALLY_VISIBLE_MS);
      }

      console.log("[ProjectSave] UI → syncing (Puter vault)");
      setSaveStatus("syncing");
      syncInFlightRef.current = true;

      try {
        const result = await buildAndSaveProject(input);
        console.log("[ProjectSave] UI → synced", result.projectId);
        setSaveStatus("synced");
        window.setTimeout(() => {
          setSaveStatus((current) => (current === "synced" ? "idle" : current));
        }, 3000);
        return result;
      } catch (error) {
        console.error("[ProjectSave] UI → failed:", error);
        void sendOpsAlert(error instanceof Error ? error : String(error), {
          source: "Project Save/Sync",
          projectId: input.projectId,
        });
        setSaveStatus("failed");
        throw error;
      } finally {
        syncInFlightRef.current = false;
      }
    },
    []
  );

  const beginOptimisticSave = useCallback(
    async (
      input: Omit<BuildProjectSaveInput, "userId" | "projectId"> & {
        userId?: string;
        projectId?: string;
      }
    ): Promise<SaveProjectResult> => {
      const userId = input.userId?.trim() || user?.id;
      if (!userId) {
        throw new Error("You must be signed in to save a project.");
      }

      const email =
        input.email?.trim() ||
        user?.primaryEmailAddress?.emailAddress ||
        "";
      const isNewProject = !input.projectId?.trim();
      if (isNewProject) {
        const ok = await canCreateProject(getCustomerTier(email), userId);
        if (!ok) {
          throw new Error(
            "Free tier limit reached. Upgrade to start new projects."
          );
        }
      }

      const projectId = input.projectId?.trim() || generateProjectId();
      const payload: BuildProjectSaveInput = {
        ...input,
        userId,
        email,
        projectId,
      };

      console.log("[ProjectSave] Optimistic save started", {
        projectId,
        projectName: payload.projectName,
        isUpdate: Boolean(input.projectId?.trim()),
      });

      lastInputRef.current = payload;
      useFinModelStore
        .getState()
        .setActiveProject(projectId, payload.projectName);

      return syncToVault(payload);
    },
    [syncToVault, user?.id, user?.primaryEmailAddress?.emailAddress]
  );

  const retryLastSave = useCallback(async () => {
    if (!lastInputRef.current) return null;
    // Retry already failed vault sync — skip another local flash.
    return syncToVault(lastInputRef.current, { skipLocalStatus: true });
  }, [syncToVault]);

  useEffect(() => {
    const cameOnline = isOnline && !wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (
      cameOnline &&
      saveStatusRef.current === "failed" &&
      lastInputRef.current &&
      !syncInFlightRef.current
    ) {
      console.log("[ProjectSave] Back online — retrying failed save...");
      void syncToVault(lastInputRef.current, { skipLocalStatus: true }).catch(
        () => undefined
      );
    }
  }, [isOnline, syncToVault]);

  return {
    saveStatus,
    isOnline,
    isLoaded,
    user,
    beginOptimisticSave,
    retryLastSave,
    hasPendingSave: () => lastInputRef.current != null,
  };
}
