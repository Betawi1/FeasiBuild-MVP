"use client";

import { useState } from "react";
import {
  DEFAULT_POWC_ALLOCATION,
  DEFAULT_SOFT_COST_ALLOCATION,
} from "@/lib/cash-outflow-default-allocations";
import type {
  PowcAllocation,
  SoftCostAllocation,
} from "@/store/useFinModelStore";

export type PowcAiBreakdown = {
  site_establishment_pct?: number | null;
  overhead_pct?: number | null;
  authority_fees_pct?: number | null;
};

export type SoftCostAiBreakdown = {
  architect_pct?: number | null;
  pm_pct?: number | null;
  engineering_pct?: number | null;
  geotech_pct?: number | null;
  other_pct?: number | null;
};

type DetailedAllocationSectionProps = {
  powcAllocation?: PowcAllocation;
  softCostAllocation?: SoftCostAllocation;
  onPowcChange: (next: PowcAllocation) => void;
  onSoftCostChange: (next: SoftCostAllocation) => void;
  powcError?: string;
  softCostError?: string;
  /** AI research POWC breakdown — drives blue border / AI badge when present */
  aiPowcBreakdown?: PowcAiBreakdown | null;
  /** AI research soft-cost breakdown — drives blue border / AI badge when present */
  aiScBreakdown?: SoftCostAiBreakdown | null;
  /** Optional external reset handler; defaults to applying AI breakdown props */
  onResetToBenchmark?: () => void;
};

function differsFromAi(current: number, aiVal?: number | null): boolean {
  return aiVal != null && Math.abs(current - aiVal) > 0.001;
}

function allocInputClass(current: number, aiVal?: number | null): string {
  const base =
    "w-20 rounded bg-slate-800 px-3 py-2 text-right text-white focus:outline-none focus:ring-2";
  if (aiVal != null && differsFromAi(current, aiVal)) {
    return `${base} border-2 border-amber-500 focus:ring-amber-500`;
  }
  if (aiVal != null) {
    return `${base} border-2 border-blue-500 focus:ring-blue-500`;
  }
  return `${base} border border-slate-600 focus:ring-emerald-500`;
}

function AllocBadge({
  current,
  aiVal,
}: {
  current: number;
  aiVal?: number | null;
}) {
  if (aiVal == null) return null;
  if (differsFromAi(current, aiVal)) {
    return (
      <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
        Override
      </span>
    );
  }
  return (
    <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
      AI
    </span>
  );
}

function AllocRow({
  label,
  hint,
  value,
  onChange,
  aiVal,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  aiVal?: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-900/50 p-3">
      <div className="min-w-0">
        <label className="text-sm font-medium text-slate-200">{label}</label>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={allocInputClass(value, aiVal)}
        />
        <AllocBadge current={value} aiVal={aiVal} />
        <span className="text-slate-400">%</span>
      </div>
    </div>
  );
}

function TotalRow({ total }: { total: number }) {
  const ok = Math.abs(total - 100) < 0.01;
  return (
    <div className="flex items-center justify-between border-t border-slate-700 pt-4">
      <label className="text-sm font-semibold text-slate-200">Total</label>
      <div className="flex items-center gap-2">
        <span
          className={`font-semibold ${ok ? "text-emerald-400" : "text-amber-400"}`}
        >
          {total.toFixed(1)}%
        </span>
        {ok ? (
          <span className="text-sm text-emerald-400">✓</span>
        ) : (
          <span className="text-sm text-amber-400">Must equal 100%</span>
        )}
      </div>
    </div>
  );
}

export default function DetailedAllocationSection({
  powcAllocation,
  softCostAllocation,
  onPowcChange,
  onSoftCostChange,
  powcError,
  softCostError,
  aiPowcBreakdown,
  aiScBreakdown,
  onResetToBenchmark,
}: DetailedAllocationSectionProps) {
  const [resetConfirmation, setResetConfirmation] = useState(false);

  const powcAlloc = powcAllocation ?? { ...DEFAULT_POWC_ALLOCATION };
  const softAlloc = softCostAllocation ?? { ...DEFAULT_SOFT_COST_ALLOCATION };

  const hasAiBenchmarksForPowc = !!(
    aiPowcBreakdown?.site_establishment_pct != null &&
    aiPowcBreakdown?.overhead_pct != null &&
    aiPowcBreakdown?.authority_fees_pct != null
  );

  const hasAiBenchmarksForSoftCosts = !!(
    aiScBreakdown?.architect_pct != null &&
    aiScBreakdown?.pm_pct != null &&
    aiScBreakdown?.engineering_pct != null &&
    aiScBreakdown?.geotech_pct != null &&
    aiScBreakdown?.other_pct != null
  );

  const hasPowcOverride =
    differsFromAi(
      powcAlloc.siteEstablishment,
      aiPowcBreakdown?.site_establishment_pct
    ) ||
    differsFromAi(powcAlloc.overhead, aiPowcBreakdown?.overhead_pct) ||
    differsFromAi(
      powcAlloc.authorityFees,
      aiPowcBreakdown?.authority_fees_pct
    );

  const hasScOverride =
    differsFromAi(softAlloc.architect, aiScBreakdown?.architect_pct) ||
    differsFromAi(softAlloc.projectManagement, aiScBreakdown?.pm_pct) ||
    differsFromAi(softAlloc.engineering, aiScBreakdown?.engineering_pct) ||
    differsFromAi(softAlloc.geotechnical, aiScBreakdown?.geotech_pct) ||
    differsFromAi(softAlloc.otherFees, aiScBreakdown?.other_pct);

  /** Only show RTB when at least one allocation field differs from AI. */
  const showResetButton =
    (hasAiBenchmarksForPowc || hasAiBenchmarksForSoftCosts) &&
    (hasPowcOverride || hasScOverride);

  const handleResetDetailedAllocationToBenchmark = () => {
    if (onResetToBenchmark) {
      onResetToBenchmark();
    } else {
      if (hasAiBenchmarksForPowc && aiPowcBreakdown) {
        onPowcChange({
          siteEstablishment: aiPowcBreakdown.site_establishment_pct ?? 40,
          overhead: aiPowcBreakdown.overhead_pct ?? 12,
          authorityFees: aiPowcBreakdown.authority_fees_pct ?? 48,
        });
      }
      if (hasAiBenchmarksForSoftCosts && aiScBreakdown) {
        onSoftCostChange({
          architect: aiScBreakdown.architect_pct ?? 30,
          projectManagement: aiScBreakdown.pm_pct ?? 20,
          engineering: aiScBreakdown.engineering_pct ?? 30,
          geotechnical: aiScBreakdown.geotech_pct ?? 10,
          otherFees: aiScBreakdown.other_pct ?? 10,
        });
      }
    }

    setResetConfirmation(true);
    window.setTimeout(() => setResetConfirmation(false), 2000);
  };

  const powcTotal =
    powcAlloc.siteEstablishment + powcAlloc.overhead + powcAlloc.authorityFees;
  const softTotal =
    softAlloc.architect +
    softAlloc.projectManagement +
    softAlloc.engineering +
    softAlloc.geotechnical +
    softAlloc.otherFees;

  return (
    <div className="mt-8 space-y-4 border-t border-slate-800 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Detailed Allocation</h3>
        <div className="flex items-center gap-2">
          {resetConfirmation && (
            <span className="text-xs text-emerald-400">✓ Reset to benchmark</span>
          )}
          {showResetButton && (
            <button
              type="button"
              onClick={handleResetDetailedAllocationToBenchmark}
              className="text-sm text-emerald-400 transition-colors hover:text-emerald-300"
            >
              Reset to benchmark
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
          <h4 className="mb-4 text-base font-medium text-white">
            POWC Allocation
          </h4>
          <div className="space-y-3">
            <AllocRow
              label="Site Establishment"
              hint="Mobilization, temporary facilities, site prep"
              value={powcAlloc.siteEstablishment}
              aiVal={aiPowcBreakdown?.site_establishment_pct}
              onChange={(siteEstablishment) =>
                onPowcChange({ ...powcAlloc, siteEstablishment })
              }
            />
            <AllocRow
              label="Overhead Costs"
              hint="Admin, HSE, Management, site staff"
              value={powcAlloc.overhead}
              aiVal={aiPowcBreakdown?.overhead_pct}
              onChange={(overhead) => onPowcChange({ ...powcAlloc, overhead })}
            />
            <AllocRow
              label="Authority Fees"
              hint="Telco, power, water, drainage, permits"
              value={powcAlloc.authorityFees}
              aiVal={aiPowcBreakdown?.authority_fees_pct}
              onChange={(authorityFees) =>
                onPowcChange({ ...powcAlloc, authorityFees })
              }
            />
            <TotalRow total={powcTotal} />
            {powcError && (
              <p className="text-sm text-red-400">{powcError}</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
          <h4 className="mb-4 text-base font-medium text-white">
            Soft Costs Allocation
          </h4>
          <div className="space-y-3">
            <AllocRow
              label="Main Architect"
              hint="Design, drawings, site supervision"
              value={softAlloc.architect}
              aiVal={aiScBreakdown?.architect_pct}
              onChange={(architect) =>
                onSoftCostChange({ ...softAlloc, architect })
              }
            />
            <AllocRow
              label="Project Management"
              hint="Owner's rep, coordination, reporting"
              value={softAlloc.projectManagement}
              aiVal={aiScBreakdown?.pm_pct}
              onChange={(projectManagement) =>
                onSoftCostChange({ ...softAlloc, projectManagement })
              }
            />
            <AllocRow
              label="Engineering Consultant"
              hint="Structural, MEP, civil engineering"
              value={softAlloc.engineering}
              aiVal={aiScBreakdown?.engineering_pct}
              onChange={(engineering) =>
                onSoftCostChange({ ...softAlloc, engineering })
              }
            />
            <AllocRow
              label="Geotechnical Consultant"
              hint="Soil investigation, foundation recommendations"
              value={softAlloc.geotechnical}
              aiVal={aiScBreakdown?.geotech_pct}
              onChange={(geotechnical) =>
                onSoftCostChange({ ...softAlloc, geotechnical })
              }
            />
            <AllocRow
              label="Other Fees"
              hint="Legal, insurance, marketing, miscellaneous"
              value={softAlloc.otherFees}
              aiVal={aiScBreakdown?.other_pct}
              onChange={(otherFees) =>
                onSoftCostChange({ ...softAlloc, otherFees })
              }
            />
            <TotalRow total={softTotal} />
            {softCostError && (
              <p className="text-sm text-red-400">{softCostError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
