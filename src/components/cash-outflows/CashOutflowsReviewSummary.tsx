"use client";

export type CashOutflowsReviewSummaryProps = {
  currency: string;
  city?: string;
  country?: string;
  buildingTypeLabel: string;
  configLabel?: string;
  constructionPeriodMonths: number;
  landArea: number;
  landCost: number;
  buildingGfa: number;
  buildingCost: number;
  softCosts: number;
  softCostPercent: number;
  powc: number;
  powcPercent: number;
  ffe?: number;
  ffePercent?: number;
  showFfe?: boolean;
  contingencyAmount: number;
  contingencyPercent: number;
  totalProjectCost: number;
};

function money(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function CashOutflowsReviewSummary({
  currency,
  city,
  country,
  buildingTypeLabel,
  configLabel,
  constructionPeriodMonths,
  landArea,
  landCost,
  buildingGfa,
  buildingCost,
  softCosts,
  softCostPercent,
  powc,
  powcPercent,
  ffe = 0,
  ffePercent = 0,
  showFfe = false,
  contingencyAmount,
  contingencyPercent,
  totalProjectCost,
}: CashOutflowsReviewSummaryProps) {
  const costPerSqft =
    buildingGfa > 0 ? totalProjectCost / buildingGfa : 0;
  const landPctOfTpc =
    totalProjectCost > 0 ? (landCost / totalProjectCost) * 100 : 0;
  const buildingPctOfTpc =
    totalProjectCost > 0 ? (buildingCost / totalProjectCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-6 border-b border-slate-700 pb-4 text-xl font-bold text-white">
          Review &amp; Summary
        </h2>
        <p className="text-sm text-slate-400">
          Confirm cash outflow inputs before generating the model. This step is
          read-only — go back to edit values.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
          <span>
            {city || "—"}, {country || "—"}
          </span>
          <span>·</span>
          <span>{currency}</span>
          <span>·</span>
          <span className="capitalize text-slate-300">{buildingTypeLabel}</span>
          {configLabel ? (
            <>
              <span>·</span>
              <span>{configLabel}</span>
            </>
          ) : null}
          <span>·</span>
          <span>{constructionPeriodMonths} months construction</span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Land &amp; Building
            </h3>
            <SummaryRow
              label="Total Land Area"
              value={`${money(landArea)} sqft`}
            />
            <SummaryRow
              label="Land Cost"
              value={`${money(landCost)} ${currency}`}
            />
            <SummaryRow
              label="Total Building GFA"
              value={`${money(buildingGfa)} sqft`}
            />
            <SummaryRow
              label="Building / Construction Cost"
              value={`${money(buildingCost)} ${currency}`}
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Soft Costs &amp; Allowances
            </h3>
            <SummaryRow
              label="Soft Costs (SC)"
              value={`${money(softCosts)} ${currency} (${softCostPercent}%)`}
            />
            <SummaryRow
              label="POWC"
              value={`${money(powc)} ${currency} (${powcPercent}%)`}
            />
            {showFfe ? (
              <SummaryRow
                label="FF&E"
                value={`${money(ffe)} ${currency} (${ffePercent}%)`}
              />
            ) : null}
            <SummaryRow
              label="Contingency"
              value={`${money(contingencyAmount)} ${currency} (${contingencyPercent}%)`}
            />
          </div>
        </div>

        <div className="mt-6 border-t border-slate-700 pt-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Total Project Cost (TPC)
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
                {money(totalProjectCost)} {currency}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 sm:gap-6">
              <div>
                <p className="text-xs text-slate-500">Cost / sqft</p>
                <p className="font-semibold text-slate-200">
                  {money(costPerSqft)} {currency}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Land % of TPC</p>
                <p className="font-semibold text-slate-200">
                  {landPctOfTpc.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Building % of TPC</p>
                <p className="font-semibold text-slate-200">
                  {buildingPctOfTpc.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-200">{value}</span>
    </div>
  );
}
