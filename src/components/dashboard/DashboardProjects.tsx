"use client";

import { useEffect, useState } from "react";
import {
  fetchProjectIndex,
  deleteProjectFromKV,
} from "@/lib/project-save";
import type { ProjectIndexEntry } from "@/types/project";
import ProjectCard from "@/components/dashboard/ProjectCard";

interface DashboardProjectsProps {
  userId?: string;
}

export default function DashboardProjects({ userId }: DashboardProjectsProps) {
  const [projects, setProjects] = useState<ProjectIndexEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use the userId passed from the server component.
      // If it's missing, try fetching globally (fallback for older projects).
      const fetchId = userId || "";
      const data = await fetchProjectIndex(fetchId);
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
      setError("Failed to load projects. Please ensure you are logged in.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [userId]);

  const handleDelete = async (projectId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const fetchId = userId || "";
      await deleteProjectFromKV(fetchId, projectId);
      await loadProjects();
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Failed to delete project. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50"
          >
            <div className="space-y-4 p-6">
              <div className="h-4 w-1/3 rounded bg-slate-800" />
              <div className="h-6 w-3/4 rounded bg-slate-800" />
              <div className="h-4 w-1/2 rounded bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={loadProjects}
          className="mt-4 text-sm font-medium text-red-300 underline hover:text-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
        <h3 className="mb-2 text-lg font-semibold text-white">
          No projects yet
        </h3>
        <p className="mb-6 text-slate-400">
          Start by creating a new feasibility study using the buttons above.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.projectId}
          projectId={project.projectId}
          title={project.projectName}
          type={project.projectType}
          location={project.location}
          status={project.status}
          lastModified={new Date(project.lastModified).toLocaleDateString(
            "en-US",
            {
              month: "short",
              day: "numeric",
              year: "numeric",
            }
          )}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
