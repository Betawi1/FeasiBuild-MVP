import Link from 'next/link';

export default function SaleStreamDocs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Documentation</p>
        <h1 className="text-4xl font-bold text-white mb-4">Sale Stream</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          The Sale Stream models development-for-sale projects where units are sold upon completion —
          Residential Towers, Landed Properties, Commercial Strata, and Mixed-Use developments. Work
          through the components in order; each step builds on the previous one.
        </p>
      </div>

      {/* Components List */}
      <div className="space-y-8">
        {/* Component 1 */}
        <section>
          <h2 className="text-2xl font-bold text-emerald-400 mb-3">1. Development Financials</h2>
          <p className="text-slate-300 leading-relaxed mb-3">
            Start here. Define your project location, building type (Residential High-Rise, Landed, Commercial Strata),
            configuration, construction costs, soft costs, and land acquisition. The system auto-selects configuration
            forms based on your building type choice.
          </p>
          <p className="text-sm text-slate-400">
            Asset-specific steps adapt to your building type (e.g., tower floors for high-rise, unit count for landed,
            infrastructure costs for landed developments).
          </p>
        </section>

        {/* Component 2 */}
        <section>
          <h2 className="text-2xl font-bold text-emerald-400 mb-3">2. Sales Revenue</h2>
          <p className="text-slate-300 leading-relaxed mb-3">
            Model your sales strategy including saleable BUA ratio, average sales price per sqft, payment plans for
            cash buyers and mortgage buyers, sales uptake schedule (front-loaded, even, or back-loaded), buyer mix,
            and deductions (VAT, commissions, discounts, defaults).
          </p>
          <p className="text-sm text-slate-400">
            Revenue drivers vary by payment structure — down payments, progress payments during construction, and
            handover payments. The component generates monthly cash inflow projections aligned with construction progress.
          </p>
        </section>

        {/* Component 3 */}
        <section>
          <h2 className="text-2xl font-bold text-emerald-400 mb-3">3. Project IRR</h2>
          <p className="text-slate-300 leading-relaxed mb-3">
            Review unlevered project returns before financing is applied. This read-only component shows NPV and
            Project IRR calculated on pre-financing cash flows from Components 1 and 2, using the full development
            timeline including the post-completion collection period.
          </p>
          <p className="text-sm text-slate-400">
            For sale developments, the model typically runs ~36 months with no terminal value — returns are driven
            entirely by development costs versus net sales proceeds.
          </p>
        </section>

        {/* Component 4 */}
        <section>
          <h2 className="text-2xl font-bold text-emerald-400 mb-3">4. Residential Financing (Sale)</h2>
          <p className="text-slate-300 leading-relaxed mb-3">
            Configure debt tranches (LTC/LTV ratios), land equity contribution, preference shares, escrow withdrawal
            rules by jurisdiction (UAE RERA, Malaysia HDA, Australia 10/90 rule), drawdown structure, and interest/IDC
            treatment.
          </p>
          <p className="text-sm text-slate-400">
            The engine uses a dynamic gap-fill mechanism to determine equity requirements and links financing draws
            to your development schedule and escrow-regulated sales proceeds.
          </p>
        </section>

        {/* Component 5 */}
        <section>
          <h2 className="text-2xl font-bold text-emerald-400 mb-3">5. Project IRR (Levered)</h2>
          <p className="text-slate-300 leading-relaxed mb-3">
            Review levered equity returns after financing from Component 4. Compare unlevered Project IRR with
            levered Equity IRR, equity multiple, and payback timing — demonstrating the effect of financial leverage
            on your returns.
          </p>
          <p className="text-sm text-slate-400">
            Preview pages include visual charts showing monthly net cash flow and cumulative equity position over time.
            For sale developments, payback typically occurs near the end of the project (M30–M36).
          </p>
        </section>

        {/* Component 6 */}
        <section>
          <h2 className="text-2xl font-bold text-emerald-400 mb-3">6. Scenario Analysis</h2>
          <p className="text-slate-300 leading-relaxed mb-3">
            Stress-test key drivers specific to sale developments — Sales Price/GDV, Sales Velocity, Pre-Sales
            Achievement, Construction Cost, Soft Costs, Construction Duration, LTC Reduction, and Interest Rate.
          </p>
          <p className="text-sm text-slate-400">
            Compare base, upside, and downside cases side by side. The Tornado Chart ranks drivers by impact on
            Levered Equity IRR, helping you identify which assumptions matter most for project viability.
          </p>
        </section>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <Link
          href="/docs/getting-started"
          className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
        >
          ← Getting Started
        </Link>
        <Link
          href="/docs/sale-stream/component-1-cash-outflows"
          className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
        >
          Component 1: Development Financials →
        </Link>
      </div>
    </div>
  );
}
