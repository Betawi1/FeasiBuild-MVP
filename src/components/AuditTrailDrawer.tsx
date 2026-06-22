"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore, type AuditEntry } from "@/store/useAuditStore";

function componentSortKey(name: string): number {
  const m = name.match(/Component\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : 99;
}

function formatEntryValue(entry: AuditEntry): string {
  if (typeof entry.value === "boolean") {
    return entry.value ? "Yes" : "No";
  }
  if (typeof entry.value === "number") {
    return entry.value.toLocaleString();
  }
  return String(entry.value);
}

function valueColorClass(entry: AuditEntry): string {
  if (entry.type === "calculated") return "text-purple-400";
  if (typeof entry.value === "boolean") {
    return entry.value ? "text-emerald-400" : "text-slate-500";
  }
  return "text-white";
}

export default function AuditTrailDrawer({
  isOpen,
  onClose,
  stream = "operational",
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Which model stream entries to show (sale vs operational are stored separately). */
  stream?: AuditEntry["stream"];
}) {
  const router = useRouter();
  const entries = useAuditStore((s) => s.entries);
  const debugEnabled = useAuditStore((s) => s.debugEnabled);

  const groupedEntries = useMemo(() => {
    const acc = Object.values(entries)
      .filter((e) => e.stream === stream)
      .reduce(
        (group, entry) => {
          if (!group[entry.component]) group[entry.component] = [];
          group[entry.component].push(entry);
          return group;
        },
        {} as Record<string, AuditEntry[]>
      );

    Object.keys(acc).forEach((key) => {
      acc[key].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    });

    return acc;
  }, [entries, stream]);

  const sortedComponents = useMemo(
    () =>
      Object.keys(groupedEntries).sort(
        (a, b) => componentSortKey(a) - componentSortKey(b)
      ),
    [groupedEntries]
  );

  useEffect(() => {
    if (!isOpen || !debugEnabled) return;
    // eslint-disable-next-line no-console
    console.log("[AUDIT] entries:", Object.values(useAuditStore.getState().entries));
  }, [isOpen, entries, debugEnabled]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[209] bg-black/50 backdrop-blur-sm transition-opacity"
        aria-hidden
        onClick={onClose}
      />

      <div
        className="fixed inset-y-0 right-0 z-[210] flex w-full max-w-xl flex-col border-l border-slate-700 bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-trail-drawer-title"
      >
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 p-4">
          <h2 id="audit-trail-drawer-title" className="text-lg font-bold text-white">
            Audit Trail
          </h2>
          <div className="flex items-center gap-3">
            {process.env.NODE_ENV === "development" && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={debugEnabled}
                  onChange={(e) =>
                    useAuditStore.getState().setDebugEnabled(e.target.checked)
                  }
                  className="rounded border-slate-600"
                />
                Debug
              </label>
            )}
            <button
              type="button"
              onClick={() => useAuditStore.getState().clearLog()}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
            >
              Clear log
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
              aria-label="Close audit trail"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {sortedComponents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <span className="text-4xl mb-2">📝</span>
              <p>No inputs recorded yet. Start entering data!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {sortedComponents.map((component) => {
                const items = groupedEntries[component];
                const latestTime = items[items.length - 1]?.timestamp;
                const lastModified = latestTime
                  ? new Date(latestTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";

                return (
                  <div
                    key={component}
                    className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300"
                  >
                    <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900/50 px-5 py-4">
                      <h3 className="text-lg font-bold text-white">{component}</h3>
                      <span className="rounded-full bg-slate-700 px-2 py-1 text-xs font-medium text-slate-300">
                        Last updated: {lastModified}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                      {items.map((entry) => (
                        <div
                          key={entry.id}
                          role="button"
                          tabIndex={0}
                          className="group cursor-pointer rounded-lg border border-slate-700/50 bg-slate-900/50 p-3 transition-all hover:border-slate-500 hover:bg-slate-700/30"
                          onClick={() => {
                            onClose();
                            router.push(entry.route);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onClose();
                              router.push(entry.route);
                            }
                          }}
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <span
                              className="max-w-[150px] truncate text-xs font-medium uppercase tracking-wider text-slate-500"
                              title={entry.label}
                            >
                              {entry.label}
                            </span>
                            {entry.type === "calculated" && (
                              <span className="rounded border border-purple-500/30 bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-400">
                                CALC
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={`font-mono text-sm font-semibold ${valueColorClass(entry)}`}
                            >
                              {formatEntryValue(entry)}
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-600 transition group-hover:text-slate-400">
                              {new Date(entry.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
