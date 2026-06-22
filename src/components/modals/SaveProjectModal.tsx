"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { SaveProjectModalProps } from "@/types/project";

const TAG_OPTIONS = [
  "Residential",
  "Office",
  "Retail",
  "Hotel",
  "Sale",
  "Operational",
  "UAE",
  "Malaysia",
  "Australia",
  "High-Rise",
  "Landed",
] as const;

export default function SaveProjectModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
  defaultProjectName = "",
}: SaveProjectModalProps) {
  const [projectName, setProjectName] = useState(defaultProjectName);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setProjectName(defaultProjectName);
    setDescription("");
    setTags([]);
    setError(null);
  }, [isOpen, defaultProjectName]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!projectName.trim()) {
      setError("Project name is required.");
      return;
    }
    setError(null);
    try {
      await onSave({
        projectName: projectName.trim(),
        description: description.trim(),
        tags,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project.");
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Save Project</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded p-1 text-slate-400 transition hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label
              htmlFor="project-name"
              className="mb-2 block text-sm text-slate-300"
            >
              Project Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Dubai Marina Office Tower"
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="project-description"
              className="mb-2 block text-sm text-slate-300"
            >
              Project Description
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes about this feasibility study..."
              disabled={isSaving}
              className="w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-300">Tags / Categories</p>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => {
                const selected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={isSaving}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-60 ${
                      selected
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-200"
                        : "border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-700 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !projectName.trim()}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
