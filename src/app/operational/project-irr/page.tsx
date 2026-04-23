"use client";

import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import useFinModelStore from "@/store/useFinModelStore";
import { useStreamPrefix, withStreamPrefix } from "@/lib/stream-path";

export default function OperationalProjectIRRPage() {
  const streamPrefix = useStreamPrefix();

  const exitCapRate = useFinModelStore((s) => s.projectIRR.exitCapRate ?? 7);
  const updateExitCapRate = useFinModelStore((s) => s.updateExitCapRate);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 pb-32">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white">
            FinModel App — Component 3
          </h1>
          <p className="text-slate-400">Project IRR — Exit Assumptions</p>
        </div>

        <div className="mb-8">
          <div className="mb-2 flex justify-between text-sm text-slate-400">
            <span>Step 1 of 1</span>
            <span>100% Complete</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-emerald-600 transition-all"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <label
            htmlFor="operational-project-irr-exit-cap"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Exit Cap Rate (%)
          </label>
          <input
            id="operational-project-irr-exit-cap"
            type="number"
            step="0.1"
            min={0}
            max={20}
            value={exitCapRate}
            onChange={(e) => {
              const v = Number(e.target.value);
              updateExitCapRate(Number.isFinite(v) ? v : 7);
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <p className="mt-2 text-xs text-slate-500">
            Used to calculate terminal value at Year 13 (final operational year).
            This cap rate also serves as placeholder for Component 4 (Sale option).
          </p>
        </div>

        <PreviewFloatingBar
          showDownload={false}
          previousRoute={withStreamPrefix(streamPrefix, "/preview/pnl")}
          nextRoute={withStreamPrefix(streamPrefix, "/preview/project-irr")}
          nextLabel="Next →"
        />
      </div>
    </div>
  );
}
