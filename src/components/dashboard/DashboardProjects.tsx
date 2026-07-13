"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { PlusCircle } from "lucide-react";
import ProjectCard from "@/components/dashboard/ProjectCard";
import { fetchProjectIndex } from "@/lib/project-save";
import useFinModelStore from "@/store/useFinModelStore";
import type { ProjectIndexEntry } from "@/types/project";

function formatLastModified(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardProjects() {
  const { user, isLoaded } = useUser();
  const deleteProject = useFinModelStore((s) => s.deleteProject);
  const [projects, setProjects] = useState<ProjectIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDeleteProject = useCallback(
    async (project: ProjectIndexEntry) => {
      if (!user?.id) return;

      const confirmed = window.confirm(
        `Are you sure you want to delete "${project.projectName || project.projectId}"? This cannot be undone.`
      );
      if (!confirmed) return;

      try {
        await deleteProject(project.projectId, user.id);
        setProjects((prev) =>
          prev.filter((item) => item.projectId !== project.projectId)
        );
      } catch (error) {
        console.error("[Dashboard] Failed to delete project:", error);
        window.alert("Failed to delete project. Please try again.");
      }
    },
    [deleteProject, user?.id]
  );

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;

    const loadProjects = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setProjects([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const index = await fetchProjectIndex(user.id);
        if (!cancelled) {
          setProjects(index);
        }
      } catch (error) {
        console.error("[Dashboard] Failed to fetch projects:", error);
        if (!cancelled) {
          setProjects([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user?.id]);

  const stats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) => p.status === "In Progress").length;
    const completed = projects.filter((p) => p.status === "Completed").length;
    return { total, inProgress, completed };
  }, [projects]);

  if (!isLoaded || loading) {
    return (
      <>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[0, 1, 2].map((slot) => (
            <div
              key={slot}
              className="rounded-xl border border-slate-800 bg-slate-900 p-6"
            >
              <p className="text-sm text-slate-400">Loading...</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-slate-400">Loading projects...</p>
      </>
    );
  }

  if (!user?.id) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-slate-300">Sign in to view your saved projects.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Total Studies</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">In Progress</p>
          <p className="mt-2 text-3xl font-bold text-blue-400">
            {stats.inProgress}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Completed</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {stats.completed}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-white">Recent Projects</h2>

        {projects.length === 0 ? (
          <p className="mb-6 text-slate-400">
            No projects yet. Create a new study to get started.
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.projectId}
              projectId={project.projectId}
              title={project.projectName}
              type={project.projectType}
              location={project.location}
              status={project.status}
              lastModified={formatLastModified(project.lastModified)}
              onDelete={() => {
                void handleDeleteProject(project);
              }}
            />
          ))}

          <Link
            href="/app"
            className="group flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center transition-all hover:border-emerald-500/50 hover:bg-slate-900"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 transition-colors group-hover:bg-emerald-500/20">
              <PlusCircle className="h-6 w-6 text-slate-400 group-hover:text-emerald-500" />
            </div>
            <h3 className="text-sm font-medium text-white">Start New Study</h3>
            <p className="mt-1 text-xs text-slate-500">Sale or Operational</p>
          </Link>
        </div>
      </div>
    </>
  );
}
