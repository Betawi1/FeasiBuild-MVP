"use client";

export type PrefSharesReturnType = "fixed-dividend" | "islamic-profit";

type Step4PreferenceSharesProps = {
  prefSharesEnabled: boolean;
  prefSharesAllocationPercent: number;
  prefSharesReturnPct: number;
  prefSharesReturnType: PrefSharesReturnType;
  cashEquityRequired: number;
  prefSharesAmount: number;
  currency: string;
  formatCurrency: (value: number) => string;
  onToggleEnabled: () => void;
  onAllocationChange: (percent: number) => void;
  onReturnPctChange: (percent: number) => void;
  onReturnTypeChange: (type: PrefSharesReturnType) => void;
};

export default function Step4PreferenceShares({
  prefSharesEnabled,
  prefSharesAllocationPercent,
  prefSharesReturnPct,
  prefSharesReturnType,
  cashEquityRequired,
  prefSharesAmount,
  currency,
  formatCurrency,
  onToggleEnabled,
  onAllocationChange,
  onReturnPctChange,
  onReturnTypeChange,
}: Step4PreferenceSharesProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold text-white">Preference shares</h2>
        <p className="text-sm text-slate-400">
          Optional tranche with a fixed return or Islamic target profit. Configure after land
          and senior sizing; amounts reference cash equity required from the stack above.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
        <button
          type="button"
          role="switch"
          aria-checked={prefSharesEnabled}
          onClick={onToggleEnabled}
          className={`relative h-6 w-12 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            prefSharesEnabled ? "bg-emerald-500" : "bg-slate-600"
          }`}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
              prefSharesEnabled ? "left-7" : "left-1"
            }`}
          />
        </button>
        <span className="text-sm font-medium text-white">
          Enable preference shares / mezzanine equity
        </span>
      </div>

      {prefSharesEnabled ? (
        <div className="space-y-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <p className="mb-1 text-xs text-slate-400">
              Reference: cash equity required (from TDC − debt and land equity rules)
            </p>
            <p className="text-xl font-bold text-white">{formatCurrency(cashEquityRequired)}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Allocation (% of cash equity)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={prefSharesAllocationPercent}
                onChange={(e) => onAllocationChange(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-emerald-500"
              />
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Preference amount ({currency})
              </label>
              <input
                type="text"
                readOnly
                value={formatCurrency(prefSharesAmount)}
                className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 font-mono text-white opacity-70"
                aria-readonly
              />
              <p className="mt-1 text-xs text-slate-500">Auto-calculated from allocation %</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Target return (% p.a.)
              </label>
              <input
                type="number"
                min={0}
                max={25}
                step={0.25}
                value={prefSharesReturnPct}
                onChange={(e) =>
                  onReturnPctChange(Math.max(0, Math.min(25, parseFloat(e.target.value) || 0)))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Return type</label>
              <select
                value={prefSharesReturnType}
                onChange={(e) => onReturnTypeChange(e.target.value as PrefSharesReturnType)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              >
                <option value="fixed-dividend">Fixed dividend (% p.a.)</option>
                <option value="islamic-profit">Islamic profit rate</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <div>
              <p className="text-sm font-medium text-white">Preference shares tenor</p>
              <p className="text-xs text-slate-400">
                Subordinate to senior debt. Repaid after bank facility payoff at handover
                (illustrative).
              </p>
            </div>
            <span className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300">
              System-determined
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
