"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import useFinModelStore from "@/store/useFinModelStore";
import { buildAndSaveProject } from "@/lib/project-save";
import SaveProjectModal from "@/components/modals/SaveProjectModal";
import { useToast } from "@/components/ui/Toast";
import { studyToolbarSaveBtn } from "@/components/ui/studyToolbarStyles";
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
  const { user, isLoaded } = useUser();
  const { showToast } = useToast();
  const activeProjectId = useFinModelStore((s) => s.activeProjectId);
  const activeProjectName = useFinModelStore((s) => s.activeProjectName);
  const projectInfo = useFinModelStore((s) => {
    const key = stream ?? (s.assetType === "sale" ? "sale" : "operational");
    return s[key].projectInfo;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

    setIsSaving(true);
    try {
      const result = await buildAndSaveProject({
        projectName: input.projectName,
        description: input.description,
        tags: input.tags,
        stream,
        userId: user.id,
        projectId: activeProjectId ?? undefined,
      });
      showToast({
        variant: "success",
        title: activeProjectId ? "Project updated" : "Project saved",
        description: activeProjectId
          ? `Updated ${input.projectName}`
          : `Saved as ${result.projectId}`,
      });
      setIsModalOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save project.";
      showToast({
        variant: "error",
        title: "Save failed",
        description: message,
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenModal = () => {
    if (!isLoaded) return;
    if (!user?.id) {
      showToast({
        variant: "error",
        title: "Sign in required",
        description: "Please sign in to save projects to your account.",
      });
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={isSaving || !isLoaded}
        className={className ?? studyToolbarSaveBtn}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {activeProjectId ? "Update Project" : label}
      </button>

      <SaveProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSaving) setIsModalOpen(false);
        }}
        onSave={handleSave}
        isSaving={isSaving}
        defaultProjectName={defaultProjectName}
      />
    </>
  );
}
