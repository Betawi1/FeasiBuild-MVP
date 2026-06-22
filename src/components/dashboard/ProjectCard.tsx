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
}

export default function ProjectCard({
  title,
  type,
  location,
  status,
  lastModified,
  projectId,
}: ProjectCardProps) {
  const statusColors = {
    Draft: "bg-slate-800 text-slate-400",
    "In Progress": "bg-blue-500/10 text-blue-400",
    Completed: "bg-emerald-500/10 text-emerald-400",
  };

  const route = type === "Sale" ? "/sale" : "/operational";
  const href = `${route}?projectId=${encodeURIComponent(projectId)}`;

  return (
    <Link href={href} className="group block">
      <div className="group rounded-xl border border-slate-800 bg-slate-900 p-6 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5">
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
