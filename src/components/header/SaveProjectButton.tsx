"use client";

import { useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import useFinModelStore from "@/store/useFinModelStore";
import { buildAndSaveProject } from "@/lib/project-save";
import SaveProjectModal from "@/components/modals/SaveProjectModal";
import { useToast } from "@/components/ui/Toast";
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
  const projectInfo = useFinModelStore((s) => {
    const key = stream ?? (s.assetType === "sale" ? "sale" : "operational");
    return s[key].projectInfo;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const defaultProjectName = useMemo(() => {
    const city = projectInfo.city?.trim();
    const buildingType = projectInfo.buildingType
      ? projectInfo.buildingType.charAt(0).toUpperCase() +
        projectInfo.buildingType.slice(1)
      : "Project";
    if (city) return `${city} ${buildingType}`;
    return buildingType;
  }, [projectInfo.city, projectInfo.buildingType]);

  const handleSave = async (input: {
    projectName: string;
    description: string;
    tags: string[];
  }) => {
    setIsSaving(true);
    try {
      const result = await buildAndSaveProject({
        projectName: input.projectName,
        description: input.description,
        tags: input.tags,
        stream,
      });
      showToast({
        variant: "success",
        title: "Project saved",
        description: `Saved as ${result.projectId}`,
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

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={isSaving}
        className={
          className ??
          "inline-flex items-center gap-2 rounded-lg border border-emerald-700/60 bg-emerald-600/20 px-3 py-2 text-emerald-200 transition hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {label}
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
