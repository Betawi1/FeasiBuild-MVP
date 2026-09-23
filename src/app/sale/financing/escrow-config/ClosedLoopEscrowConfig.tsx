"use client";

import {
  CLOSED_LOOP_CHINA_MAX_LOAN_OF_TDC,
  CLOSED_LOOP_CONTRACTOR_RETENTION_PCT,
} from "@/lib/financing-engine/escrow-rules";

type ClosedLoopEscrowConfigProps = {
  /** Location overlay. The loan cap and land-equity lock stay China-only. */
  chinaOverlay: boolean;
  toppingOutEnabled: boolean;
  toppingOutPct: number;
  onToppingOutEnabled: (value: boolean) => void;
  onToppingOutPct: (value: number) => void;
  /** Read-only 70% of TDC label. Rendered only for the China overlay. */
  maxConstructionLoanLabel: string | null;
};

export default function ClosedLoopEscrowConfig({
  chinaOverlay,
  toppingOutEnabled,
  toppingOutPct,
  onToppingOutEnabled,
  onToppingOutPct,
  maxConstructionLoanLabel,
}: ClosedLoopEscrowConfigProps) {
  const helper = chinaOverlay
    ? "Off-plan sales inflows begin the month after cumulative construction progress first reaches this level. Default is 50%. The raw sales schedule is not overwritten."
    : toppingOutEnabled
      ? "Off-plan sales inflows begin the month after cumulative construction progress first reaches the topping-out %. Land loan and equity splits on Step 3 stay available; no loan-to-cost cap."
      : "Sales keep the Component 2 schedule. Land loan and equity splits on Step 3 stay available. The construction loan follows the S-curve with no extra loan-to-cost cap.";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-3 text-lg font-semibold text-white">
          Closed-Loop Escrow Rule Configuration
        </h3>
        <p className="text-sm text-slate-300">
          100% of buyer funds are locked in escrow until practical completion.{" "}
          {CLOSED_LOOP_CONTRACTOR_RETENTION_PCT}% of building works are retained from the main
          contractor until CP+24.
        </p>
        <p className="mt-3 text-xs text-slate-500">{helper}</p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={toppingOutEnabled}
            onChange={(e) => onToppingOutEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
          />
          <span className="text-sm font-medium text-slate-200">
            Off-plan sales start only after topping out
          </span>
        </label>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Topping Out %
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={toppingOutPct}
              onChange={(e) => {
                const next = parseFloat(e.target.value);
                const clamped = Number.isFinite(next)
                  ? Math.max(1, Math.min(100, next))
                  : 50;
                onToppingOutPct(clamped);
              }}
              className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-center text-sm text-white"
            />
            <span className="text-slate-400">% cumulative construction progress</span>
          </div>
        </div>

        {chinaOverlay && (
          <>
            <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-xs text-slate-400">Max construction loan</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {maxConstructionLoanLabel ?? "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Capped at {Math.round(CLOSED_LOOP_CHINA_MAX_LOAN_OF_TDC * 100)}% of total
                development cost. This limit applies only while this rule is selected here; choosing
                another rule removes it.
              </p>
            </div>

            <p className="text-sm text-amber-300/90">
              Land is 100% equity while this rule is selected. The land term loan on Step 3 is
              suspended and comes back if you choose a different rule.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
