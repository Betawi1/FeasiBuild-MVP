"use client";

type Step8CommercialFinancingProps = {
  onNext: () => void;
  onPrevious: () => void;
  showPrevious?: boolean;
  nextLabel?: string;
  /** When true, navigation is handled by the parent wizard shell. */
  embedded?: boolean;
};

export default function Step8CommercialFinancing({
  onNext,
  onPrevious,
  showPrevious = true,
  nextLabel = "Generate Model →",
  embedded = false,
}: Step8CommercialFinancingProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          Commercial Financing (Sales Recycling)
        </h2>
        <p className="mt-2 text-slate-400">
          Standard waterfall repayment. Sales proceeds sweep directly to debt service
          and equity distribution. No escrow or trust accounts.
        </p>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-4 text-lg font-semibold text-white">Repayment Waterfall</h3>
        <ol className="space-y-3 text-sm text-slate-300">
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-400">
              1
            </span>
            Senior Construction Loan (principal + interest)
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-xs text-purple-400">
              2
            </span>
            Land Loan (principal + capitalized interest)
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs text-amber-400">
              3
            </span>
            Preference Shares / Mezzanine (if enabled)
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400">
              4
            </span>
            Equity distribution
          </li>
        </ol>
      </div>

      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-slate-300">
        <p>
          Preview uses a simplified NCF: <strong className="text-white">Sales − Total Outflows</strong>.
          Model tenor extends <strong className="text-white">6 months</strong> past construction end.
        </p>
      </div>

      {!embedded && (
        <div className="flex justify-between pt-6">
          {showPrevious && (
            <button
              type="button"
              onClick={onPrevious}
              className="rounded-lg bg-slate-700 px-6 py-2 text-white hover:bg-slate-600"
            >
              ← Previous
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="ml-auto rounded-lg bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-500"
          >
            {nextLabel}
          </button>
        </div>
      )}
    </div>
  );
}
