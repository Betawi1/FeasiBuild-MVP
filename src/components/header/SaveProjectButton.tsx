"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import useFinModelStore from "@/store/useFinModelStore";
import SaveProjectModal from "@/components/modals/SaveProjectModal";
import { useToast } from "@/components/ui/Toast";
import { studyToolbarSaveBtn } from "@/components/ui/studyToolbarStyles";
import {
  projectSaveButtonLabel,
  useOptimisticProjectSave,
} from "@/hooks/useOptimisticProjectSave";
import type { FinModelStreamKey } from "@/store/useFinModelStore";

type SaveProjectButtonProps = {
  stream?: FinModelStreamKey;
  className?: string;
  label?: string;
};

export default function SaveProjectButton({
  stream,
  className,
  label = "Save Project",
}: SaveProjectButtonProps) {
  const { showToast } = useToast();
  const {
    saveStatus,
    isLoaded,
    user,
    beginOptimisticSave,
    retryLastSave,
    hasPendingSave,
  } = useOptimisticProjectSave();
  const activeProjectId = useFinModelStore((s) => s.activeProjectId);
  const activeProjectName = useFinModelStore((s) => s.activeProjectName);
  const projectInfo = useFinModelStore((s) => {
    const key = stream ?? (s.assetType === "sale" ? "sale" : "operational");
    return s[key].projectInfo;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const defaultProjectName = useMemo(() => {
    if (activeProjectName?.trim()) return activeProjectName;
    const city = projectInfo.city?.trim();
    const buildingType = projectInfo.buildingType
      ? projectInfo.buildingType.charAt(0).toUpperCase() +
        projectInfo.buildingType.slice(1)
      : "Project";
    if (city) return `${city} ${buildingType}`;
    return buildingType;
  }, [activeProjectName, projectInfo.city, projectInfo.buildingType]);

  const idleLabel = activeProjectId ? "Update Project" : label;
  const isBusy =
    saveStatus === "saved_locally" || saveStatus === "syncing";

  const handleSave = async (input: {
    projectName: string;
    description: string;
    tags: string[];
  }) => {
    if (!user?.id) {
      showToast({
        variant: "error",
        title: "Sign in required",
        description: "Please sign in to save projects to your account.",
      });
      throw new Error("Not authenticated");
    }

    setIsModalOpen(false);

    void beginOptimisticSave({
      projectName: input.projectName,
      description: input.description,
      tags: input.tags,
      stream,
      userId: user.id,
      projectId: activeProjectId ?? undefined,
    })
      .then((result) => {
        showToast({
          variant: "success",
          title: "Synced to vault",
          description: `Saved ${input.projectName} (${result.projectId})`,
        });
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Failed to sync project.";
        showToast({
          variant: "error",
          title: "Sync failed — saved locally",
          description: message,
        });
      });
  };

  const handleOpenModal = () => {
    if (!isLoaded || isBusy) return;
    if (!user?.id) {
      showToast({
        variant: "error",
        title: "Sign in required",
        description: "Please sign in to save projects to your account.",
      });
      return;
    }
    if (saveStatus === "failed" && hasPendingSave()) {
      void retryLastSave()?.catch(() => undefined);
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={isBusy || !isLoaded}
        className={className ?? studyToolbarSaveBtn}
      >
        {saveStatus === "syncing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : null}
        {projectSaveButtonLabel(saveStatus, idleLabel)}
      </button>

      <SaveProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isBusy) setIsModalOpen(false);
        }}
        onSave={handleSave}
        isSaving={false}
        defaultProjectName={defaultProjectName}
      />
    </>
  );
}
