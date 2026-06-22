"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import useFinModelStore, { type FinModelStreamKey } from "@/store/useFinModelStore";
import { getProjectFromKV } from "@/lib/project-save";
import { useToast } from "@/components/ui/Toast";

export function useProjectHydration(expectedStream: FinModelStreamKey) {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = searchParams.get("projectId");
  const hydrateProject = useFinModelStore((state) => state.hydrateProject);
  const { showToast } = useToast();
  const loadedRef = useRef<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);

  useEffect(() => {
    if (!isLoaded || !projectId || loadedRef.current === projectId) return;

    let cancelled = false;

    const loadProject = async () => {
      setIsHydrating(true);
      try {
        const savedProject = await getProjectFromKV(
          projectId,
          user?.id ?? undefined
        );
        if (cancelled) return;

        if (!savedProject) {
          console.warn("[Hydration] Project not found in KV:", projectId);
          showToast({
            variant: "error",
            title: "Project not found",
            description: `Could not load project ${projectId}.`,
          });
          return;
        }

        if (
          user?.id &&
          savedProject.userId &&
          savedProject.userId !== user.id
        ) {
          showToast({
            variant: "error",
            title: "Access denied",
            description: "This project belongs to another account.",
          });
          return;
        }

        if (savedProject.stream !== expectedStream) {
          console.warn(
            "[Hydration] Stream mismatch:",
            savedProject.stream,
            "expected",
            expectedStream
          );
          showToast({
            variant: "error",
            title: "Wrong project stream",
            description: `This project belongs to the ${savedProject.stream} stream.`,
          });
          return;
        }

        console.log("[Hydration] Loading project:", projectId);
        hydrateProject(savedProject);
        loadedRef.current = projectId;

        showToast({
          variant: "success",
          title: "Project loaded",
          description: savedProject.projectName || projectId,
        });

        const params = new URLSearchParams(searchParams.toString());
        params.delete("projectId");
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      } catch (error) {
        if (cancelled) return;
        console.error("[Hydration] Error loading project:", error);
        showToast({
          variant: "error",
          title: "Failed to load project",
          description:
            error instanceof Error ? error.message : "Unknown error occurred.",
        });
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    };

    void loadProject();

    return () => {
      cancelled = true;
      setIsHydrating(false);
    };
  }, [
    expectedStream,
    hydrateProject,
    isLoaded,
    pathname,
    projectId,
    router,
    searchParams,
    showToast,
    user?.id,
  ]);

  return { isHydrating };
}

export function ProjectHydrationLoader({
  stream,
}: {
  stream: FinModelStreamKey;
}) {
  const { isHydrating } = useProjectHydration(stream);

  if (!isHydrating) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <p className="text-sm text-slate-300">Loading project...</p>
      </div>
    </div>
  );
}
