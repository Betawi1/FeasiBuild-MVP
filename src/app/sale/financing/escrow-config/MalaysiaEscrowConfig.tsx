"use client";

import useFinModelStore from "@/store/useFinModelStore";
import type { EscrowConfigFormFields, MalaysiaPropertyType } from "./types";

type MalaysiaEscrowConfigProps = {
  formData: Pick<EscrowConfigFormFields, "malaysiaPropertyType">;
};

const MILESTONE_ROWS: Array<{
  stage: string;
  milestone: string;
  pct: string;
  trigger: string;
  landedOnly?: boolean;
  highRiseOnly?: boolean;
  highlight?: boolean;
}> = [
  {
    stage: "Stage 1",
    milestone: "SPA Signing (Monthly)",
    pct: "10%",
    trigger: "Every Month",
    highlight: true,
  },
  { stage: "2a", milestone: "Foundation Works", pct: "10%", trigger: "≥ 15%" },
  { stage: "2b", milestone: "RC Framework & Slab", pct: "15%", trigger: "≥ 30%" },
  { stage: "2c", milestone: "Walls & Frames", pct: "10%", trigger: "≥ 45%" },
  { stage: "2d", milestone: "M&E Rough-ins", pct: "10%", trigger: "≥ 60%" },
  { stage: "2e", milestone: "Plastering", pct: "10%", trigger: "≥ 75%" },
  { stage: "2f/2g", milestone: "Sewerage & Drains", pct: "10%", trigger: "≥ 90%" },
  {
    stage: "2h",
    milestone: "Roads Serving Building",
    pct: "5%",
    trigger: "≥ 90%",
    landedOnly: true,
  },
  {
    stage: "3",
    milestone: "Water & Electricity",
    pct: "17.5%",
    trigger: "≥ 95%",
    highlight: true,
    highRiseOnly: true,
  },
  {
    stage: "3",
    milestone: "Water & Electricity",
    pct: "12.5%",
    trigger: "≥ 95%",
    highlight: true,
    landedOnly: true,
  },
  {
    stage: "4",
    milestone: "Completion / Strata Title",
    pct: "2.5%",
    trigger: "100%",
    highlight: true,
  },
  {
    stage: "5",
    milestone: "Retention (Stakeholder Held)",
    pct: "5%",
    trigger: "Post-VP (8 & 24 mo)",
    highlight: true,
  },
];

function scheduleLabel(propertyType: MalaysiaPropertyType): string {
  return propertyType === "HIGH_RISE"
    ? "Schedule H (Strata / High-Rise)"
    : "Schedule G (Landed)";
}

export default function MalaysiaEscrowConfig({ formData }: MalaysiaEscrowConfigProps) {
  const financing = useFinModelStore((s) => s.sale.financing);
  const updateFinancing = useFinModelStore((s) => s.updateFinancing);
  const propertyType = formData.malaysiaPropertyType ?? "HIGH_RISE";

  const hdaDepositPct =
    financing.hdaDepositPct ?? financing.escrowConfig?.malaysia?.hdaDepositPct ?? 3;

  const persistHdaDepositPct = (value: number) => {
    const pct = Math.max(0, Math.min(100, value));
    updateFinancing(
      {
        hdaDepositPct: pct,
        escrowConfig: {
          ...financing.escrowConfig,
          malaysia: {
            ...financing.escrowConfig?.malaysia,
            propertyType: financing.escrowConfig?.malaysia?.propertyType ?? propertyType,
            retentionFirstReleaseMonths:
              financing.escrowConfig?.malaysia?.retentionFirstReleaseMonths ?? 8,
            retentionFinalReleaseMonths:
              financing.escrowConfig?.malaysia?.retentionFinalReleaseMonths ?? 24,
            hdaDepositPct: pct,
          },
        },
      },
      "sale"
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
        <h4 className="mb-3 text-sm font-semibold text-white">HDA Deposit (Construction)</h4>
        <label className="mb-1 block text-xs text-slate-400">
          Deposit percentage (% of total construction costs)
        </label>
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={hdaDepositPct}
          onChange={(e) => persistHdaDepositPct(parseFloat(e.target.value) || 0)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <p className="mt-2 text-xs text-slate-500">
          Lodged into escrow at M0 and locked until VP + 24 months (released with final escrow
          payout).
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Malaysia HDA Progress Withdrawal Schedule
        </h3>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-400">Property Type:</span>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              propertyType === "HIGH_RISE"
                ? "bg-purple-500/20 text-purple-400"
                : "bg-blue-500/20 text-blue-400"
            }`}
          >
            {scheduleLabel(propertyType)}
          </span>
          <span className="text-xs text-slate-500">
            (from Component 1 product type)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-900/50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Stage</th>
                <th className="px-4 py-3 text-left">Milestone</th>
                <th className="px-4 py-3 text-right">Withdrawal %</th>
                <th className="px-4 py-3 text-right">S-Curve Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {MILESTONE_ROWS.filter((row) => {
                if (row.landedOnly) return propertyType === "LANDED";
                if (row.highRiseOnly) return propertyType === "HIGH_RISE";
                return true;
              }).map((row, i) => (
                <tr
                  key={`${row.stage}-${row.pct}`}
                  className={
                    row.highlight
                      ? "border-t-2 border-amber-500/30 bg-amber-500/10"
                      : i % 2 === 0
                        ? "bg-slate-800/30"
                        : undefined
                  }
                >
                  <td
                    className={`px-4 py-3 font-medium ${
                      row.highlight ? "text-amber-400" : "text-white"
                    }`}
                  >
                    {row.stage}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {row.stage === "4"
                      ? propertyType === "HIGH_RISE"
                        ? "Strata Title Application"
                        : "Completion Certificate"
                      : row.milestone}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${
                      row.highlight ? "text-amber-400" : ""
                    }`}
                  >
                    {row.pct}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {row.trigger}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Withdrawals trigger when construction S-curve reaches each threshold.
          Amounts are based on <strong>actual sales collected</strong> and cannot
          exceed the escrow balance (no carry-forward of shortfalls).
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
        <h4 className="mb-3 text-sm font-semibold text-white">
          Retention Release Schedule
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              First Release (50%)
            </label>
            <div className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
              8 months after VP
            </div>
            <p className="mt-1 text-xs text-slate-500">Fixed per HDA regulations</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Final Release (50%)
            </label>
            <div className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
              24 months after VP
            </div>
            <p className="mt-1 text-xs text-slate-500">Fixed per HDA regulations</p>
          </div>
        </div>
      </div>
    </div>
  );
}
