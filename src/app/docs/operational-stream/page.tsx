import Link from 'next/link';

export default function OperationalStream() {
  return (
    <div className="space-y-12">
      <h1 className="text-3xl font-bold text-white mb-6">Operational Stream</h1>
      <p className="text-slate-300 leading-relaxed mb-10">
        The Operational Stream models hold assets that generate recurring income over their lifecycle — Hotels, Retail (Mall), Offices, and Residential (Build-to-Rent). Work through the components in order; each step builds on the previous one.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-emerald-400 mb-3">1. Cash Outflows</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Start here. Define your project segmentation, development schedule, construction costs, soft costs, and land acquisition. Asset-specific steps adapt to your building type (e.g. hotel room mix, retail GLA, office floors).
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-emerald-400 mb-3">2. Cash Inflows</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Model operational revenues, operating expenses, other income, and depreciation. Revenue drivers vary by asset — occupancy and ADR for hotels, rent and vacancy for offices and retail, lease-up assumptions for BTR residential.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-emerald-400 mb-3">3. Financing</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Configure debt tranches, equity structure, preference shares, and covenants. The engine links financing draws to your development schedule and operational cash flows.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-emerald-400 mb-3">4. Equity Returns & Project IRR</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Review unlevered and levered returns, equity multiples, and IRR metrics. Preview pages let you inspect P&amp;L, cash flow waterfalls, and financing schedules before moving on.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-emerald-400 mb-3">5. Scenario Analysis</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Stress-test key drivers — occupancy, rent growth, construction cost overruns, interest rates — and compare base, upside, and downside cases side by side.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-emerald-400 mb-3">6. Feasibility Study</h2>
        <p className="text-slate-300 leading-relaxed">
          Once all components are complete, generate your AI-powered feasibility study. The report combines your model outputs with market commentary, risk factors, and executive summary slides ready for export.
        </p>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <Link
          href="/docs/getting-started"
          className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
        >
          ← Getting Started
        </Link>
        <Link
          href="/docs/operational-stream/component-1-cash-outflows"
          className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
        >
          Component 1: Cash Outflows →
        </Link>
      </div>
    </div>
  );
}
