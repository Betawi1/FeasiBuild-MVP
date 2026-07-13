import Link from "next/link";
import type {
  ProjectDashboardStatus,
  ProjectDashboardType,
} from "@/types/project";

interface ProjectCardProps {
  title: string;
  type: ProjectDashboardType;
  location: string;
  status: ProjectDashboardStatus;
  lastModified: string;
  projectId: string;
  onDelete?: (projectId: string) => void;
}

export default function ProjectCard({
  title,
  type,
  location,
  status,
  lastModified,
  projectId,
  onDelete,
}: ProjectCardProps) {
  const statusColors = {
    Draft: "bg-slate-800 text-slate-400",
    "In Progress": "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    Completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  };

  const route = type === "Sale" ? "/sale" : "/operational";
  const href = `${route}?projectId=${encodeURIComponent(projectId)}`;

  return (
    <Link href={href} className="group block">
      <div className="relative group rounded-xl border border-slate-800 bg-slate-900 p-6 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5">
        {onDelete ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(projectId);
            }}
            className="absolute top-3 right-3 p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
            title="Delete Project"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        ) : null}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-2 w-2 rounded-full ${type === "Sale" ? "bg-emerald-500" : "bg-blue-500"}`}
            />
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {type} Stream
            </span>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}
          >
            {status}
          </span>
        </div>

        <h3 className="mb-1 text-lg font-semibold text-white transition-colors group-hover:text-emerald-400">
          {title}
        </h3>
        <p className="mb-6 text-sm text-slate-400">{location}</p>

        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <span className="text-xs text-slate-500">Modified {lastModified}</span>
          <span className="text-xs font-medium text-emerald-500 opacity-0 transition-opacity group-hover:opacity-100">
            Open Project &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
