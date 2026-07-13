export default function SaleComponent4Docs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Sale Stream</p>
        <h1 className="text-4xl font-bold text-white mb-4">Component 4: Residential Financing (Sale)</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          Component 4 models the complete financing structure for for-sale residential developments, including
          land term loans, construction revolving credit facilities (RCF), escrow-regulated sales proceeds, and
          jurisdiction-specific withdrawal rules. The component uses a dynamic gap-fill engine to determine
          equity requirements and calculates levered Equity IRR based on the waterfall payment structure.
        </p>
        <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
          <strong>Key Difference from Operational Stream:</strong> Sale Stream financing is structured around
          the construction period (typically 30-36 months) with escrow-regulated sales proceeds, rather than
          long-term hold financing with DSCR covenants. The focus is on funding the development gap until
          sales collections cover costs.
        </div>
      </div>

      {/* Overview */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Component 4 walks you through 8 sequential steps to configure your complete financing structure.
          The component integrates with Components 1-3 to calculate debt sizing, equity requirements, escrow
          mechanics, and ultimately the levered Equity IRR.
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">What This Component Produces</h3>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Monthly Cash Flow Projection:</strong> Post-financing cash flows showing loan drawdowns, interest, equity injections, and net cash position.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Levered Equity IRR:</strong> Internal rate of return on equity cash flows after debt service.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Escrow Schedule:</strong> Jurisdiction-specific withdrawal milestones and retention releases.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Capital Stack:</strong> Debt/Equity split with peak funding gap analysis.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Steps */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Step-by-Step Walkthrough</h2>

        {/* Step 1 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 1: Project Summary</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Review consolidated inputs from Components 1-3 before configuring financing. This step provides a comprehensive overview of your project&apos;s financial position.
          </p>
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Development Costs & Project Metrics</h4>
              <p className="text-sm text-slate-400">Displays Total Development Costs (TDC) from Component 1, and Net Sales Proceeds, Construction Period, Sales Start Month (e.g., -M6 for pre-sales), and Net Surplus from Component 2.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Funding Gap Visualization - Preliminary</h4>
              <p className="text-sm text-slate-400 mb-3">Three critical metrics displayed in cards:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded bg-amber-500/10 border border-amber-500/30 p-3">
                  <p className="text-xs text-amber-400">Peak Funding Gap</p>
                  <p className="text-xs text-slate-500 mt-1">Maximum cash shortfall during construction before debt drawdowns.</p>
                </div>
                <div className="rounded bg-blue-500/10 border border-blue-500/30 p-3">
                  <p className="text-xs text-blue-400">Max Debt Capacity</p>
                  <p className="text-xs text-slate-500 mt-1">Maximum loan based on LTC ratio.</p>
                </div>
                <div className="rounded bg-emerald-500/10 border border-emerald-500/30 p-3">
                  <p className="text-xs text-emerald-400">Min Equity Required</p>
                  <p className="text-xs text-slate-500 mt-1">Minimum equity based on LTC.</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h4 className="text-emerald-400 font-medium mb-2">Peak Equity Required (Dynamic)</h4>
              <p className="text-sm text-slate-400 mb-2">
                This is the <strong className="text-white">actual</strong> equity needed, calculated dynamically based on:
              </p>
              <ul className="text-xs text-slate-400 space-y-1 ml-4 list-disc">
                <li>The larger of: cumulative construction shortfall (pre-drawdowns) OR residual cash equity from senior debt sizing on full TDC.</li>
                <li>Equity breakdown: land counts only at 100% land equity (then 70% of land value); below 100% land equity, no land credit.</li>
                <li>Actual needs may differ with sales recycling and land loan configuration.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 2: Debt Sizing (LTC &amp; LTV)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Configure your debt type and define loan-to-cost (LTC) and loan-to-value (LTV) ratios to determine your maximum credit facility amount.
          </p>
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Debt Type Selection</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <p className="text-sm text-emerald-400 font-medium">Conventional Debt</p>
                  <p className="text-xs text-slate-400">Fixed or floating interest (e.g., benchmark + margin).</p>
                </div>
                <div className="rounded border border-slate-700 bg-slate-950 p-3">
                  <p className="text-sm text-slate-300 font-medium">Islamic Financing</p>
                  <p className="text-xs text-slate-400">Murabaha / Ijara / Sukuk-style profit rate wording.</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Credit Facility Sizing</h4>
              <p className="text-sm text-slate-400 mb-3">
                Two sliders allow you to set your desired Loan-to-Cost and Loan-to-Value ratios. The system calculates the credit facility amount based on both metrics and uses the <strong className="text-white">lower</strong> value as the binding constraint (lenders use the more conservative figure).
              </p>
              <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs">
                <p className="text-slate-500">Based on LTC (60% of TDC): <span className="text-emerald-400">AED 94,465,566</span></p>
                <p className="text-slate-500">Based on LTV (60% of Stabilized Value): <span className="text-emerald-400">AED 125,332,891</span></p>
                <p className="text-slate-500 mt-2">Approved Credit Facility Amount: <span className="text-emerald-400 font-bold">AED 94,465,566 ✓ Limited by LTC</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 3: Land Ownership &amp; Equity</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Configure land as equity contribution to the development financing. This step is critical because land ownership rules vary by jurisdiction and significantly impact your cash equity requirement.
          </p>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <h4 className="text-amber-300 font-medium mb-2">⚠️ Jurisdiction-Specific Rules</h4>
              <p className="text-sm text-slate-400">
                <strong className="text-white">UAE:</strong> Developer must own 100% of land equity. Land value is credited at 70% (30% haircut) for equity calculation purposes.
              </p>
              <p className="text-sm text-slate-400 mt-2">
                <strong className="text-white">Malaysia / Australia:</strong> Different rules apply based on local HDA or state regulations.
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Equity Sources Breakdown</h4>
              <p className="text-sm text-slate-400 mb-3">
                The system calculates how much of your total equity requirement can be met with land value (after haircut) and how much must come from cash.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Total equity requirement</span>
                  <span className="text-white font-mono">AED 62,977,044</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Land (counted as equity, 70% haircut)</span>
                  <span className="text-emerald-400 font-mono">AED 34,004,355</span>
                </div>
                <div className="flex justify-between py-2 bg-amber-500/10 rounded px-2">
                  <span className="text-white font-medium">Cash equity (required)</span>
                  <span className="text-amber-400 font-mono font-bold">AED 28,972,689</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 4: Preference Shares</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Optional mezzanine tranche with a fixed return or Islamic target profit. Configure after land and senior debt sizing; amounts reference cash equity required from the stack above.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <p className="text-sm text-slate-400">Toggle to enable preference shares. You can allocate a percentage of your cash equity requirement to this tranche, set a target return (e.g., 10% p.a. fixed dividend), and define the return type.</p>
            <p className="text-xs text-slate-500">Preference shares are subordinate to senior debt and repaid after bank facility payoff at handover.</p>
          </div>
        </div>

        {/* Step 5 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 5: Escrow Withdrawal Configuration</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Configure escrow withdrawal rules based on your project&apos;s jurisdiction. The system provides pre-configured templates for major markets. Users selecting different jurisdictions can choose between these three primary withdrawal configurations:
          </p>

          <div className="space-y-4">
            {/* UAE */}
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h4 className="text-emerald-400 font-medium mb-2">🇦🇪 UAE — RERA (Certification Intervals)</h4>
              <p className="text-sm text-slate-400 mb-2">
                Used for projects in the UAE. Withdrawals are based on certification intervals and retention percentages.
              </p>
              <ul className="text-xs text-slate-400 space-y-1 ml-4 list-disc">
                <li><strong>Certification Interval:</strong> Progress withdrawals occur at each certification milestone (e.g., Every 3 Months).</li>
                <li><strong>Retention Percentage:</strong> A percentage (e.g., 5%) is held until project completion.</li>
                <li><strong>Release Timing:</strong> Retention is typically released 12 months post-completion.</li>
              </ul>
            </div>

            {/* Malaysia */}
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
              <h4 className="text-purple-400 font-medium mb-2">🇲🇾 Malaysia — GDV Escrow (HDA Progress Withdrawals)</h4>
              <p className="text-sm text-slate-400 mb-2">
                Used for Malaysian projects under the Housing Development Act (HDA). Withdrawals are strictly tied to construction milestones and S-Curve triggers.
              </p>
              <ul className="text-xs text-slate-400 space-y-1 ml-4 list-disc">
                <li><strong>HDA Deposit:</strong> A deposit percentage (e.g., 3% of construction costs) is lodged into escrow at M0.</li>
                <li><strong>Milestone Schedule:</strong> Withdrawals trigger when the construction S-curve reaches specific thresholds (e.g., 10% at SPA Signing, 10% at Foundation Works ≥15%, 15% at RC Framework ≥30%, up to 100% at Strata Title Application).</li>
                <li><strong>Retention Release:</strong> 50% released 8 months after VP (Vacant Possession), final 50% released 24 months after VP.</li>
              </ul>
            </div>

            {/* Australia */}
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
              <h4 className="text-blue-400 font-medium mb-2">🇦🇺 Australia — State Regimes (10/90 Rule)</h4>
              <p className="text-sm text-slate-400 mb-2">
                Used for Australian projects. Follows the standard 10/90 withdrawal rule.
              </p>
              <ul className="text-xs text-slate-400 space-y-1 ml-4 list-disc">
                <li><strong>Purchase Deposit (10%):</strong> Typically 10% of sales proceeds held in trust until units are delivered.</li>
                <li><strong>Balance Payment (90%):</strong> The remaining 90% of the sales price is paid when the project is completed.</li>
                <li><strong>Retention:</strong> 5% GDV retention held for 12 months post-completion.</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Escrow Account Fees</h4>
            <p className="text-sm text-slate-400">Configure the one-time setup fee (e.g., AED 5,000) and the annual management fee (e.g., 0.05% p.a. on average balance) for the escrow account.</p>
          </div>
        </div>

        {/* Step 6 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 6: Drawdown Structure</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Choose how the construction loan (RCF) is drawn down to fund the project.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">LTC-Proportional Milestone</h4>
              <p className="text-sm text-slate-400">
                Drawdown occurs at MAX(S-curve month, certification month). The S-curve cumulative must reach a specific progress threshold (e.g., 30% TDC) before the milestone window opens.
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Equity-First Gap-Fill</h4>
              <p className="text-sm text-slate-400">
                Equity funds shortfalls first; the RCF fills the residual gap each period. This is the engine&apos;s default gap-fill mode, minimizing debt interest by using equity before drawing on the loan.
              </p>
            </div>
          </div>
        </div>

        {/* Step 7 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 7: Interest, IDC &amp; Escrow Income</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Configure the interest rate type (Fixed or Floating), the all-in rate percentage, and how Interest During Construction (IDC) is handled.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div>
              <h4 className="text-white font-medium">IDC Treatment (Construction RCF)</h4>
              <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc mt-2">
                <li><strong className="text-emerald-400">Capitalize:</strong> Interest is added to the loan balance and released pro-rata with principal. (Most common for sale developments).</li>
                <li><strong className="text-white">Pay Current:</strong> Interest is paid monthly from equity during construction.</li>
                <li><strong className="text-white">Hybrid:</strong> A split between capitalized and paid current.</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium">Escrow Deposit Rate %</h4>
              <p className="text-sm text-slate-400">The interest rate earned on funds held in the escrow account (default set by jurisdiction, e.g., 3.9%).</p>
            </div>
          </div>
        </div>

        {/* Step 8 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 8: Sales &amp; Escrow Recycling</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Configure how surplus sales proceeds collected in escrow are utilized during the development phase.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <p className="text-sm text-slate-400">
                <strong className="text-white">Construction Cost-Based Release (UAE/KSA):</strong> Surplus escrow receipts automatically reduce the drawn RCF during the development phase, lowering interest costs.
              </p>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <p className="text-sm text-slate-400">
                <strong className="text-white">GDV-Based Release (Malaysia):</strong> Sales reduce the equity need. Enabled when the jurisdiction is set to Malaysia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Output Section */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Output: Financing Model Preview</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          Upon completing Component 4, FeasiBuild generates a comprehensive Monthly Cash Flow Projection and Key Financing Metrics. This output demonstrates how the gap-fill engine and waterfall structure work together to fund the project and calculate returns.
        </p>

        {/* Gap Fill Explanation */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-6">
          <h3 className="text-lg font-semibold text-emerald-400 mb-3">How the Gap-Fill Engine Works</h3>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            The Sale Stream uses a dynamic <strong className="text-white">Gap-Fill Mechanism</strong> to determine exactly how much cash equity is required to keep the project solvent month-by-month. Instead of assuming a fixed equity amount upfront, the engine calculates the shortfall dynamically:
          </p>
          <ol className="text-sm text-slate-400 space-y-2 ml-4 list-decimal">
            <li><strong className="text-white">Calculate Pre-Equity Position:</strong> The engine sums all cash inflows (sales proceeds, escrow interest) and outflows (construction costs, soft costs, land cost, loan interest, commitment fees).</li>
            <li><strong className="text-white">Apply Debt Drawdowns:</strong> Based on the selected Drawdown Structure (Step 6), the RCF is drawn to cover costs up to the LTC limit.</li>
            <li><strong className="text-white">Identify the Gap:</strong> If the cumulative cash position is still negative after debt drawdowns, a &quot;gap&quot; exists.</li>
            <li><strong className="text-white">Inject Equity:</strong> Cash equity is injected exactly equal to the gap amount to bring the cumulative NCF to zero (or positive). This minimizes the total equity deployed and maximizes the Equity IRR.</li>
          </ol>
        </div>

        {/* Waterfall Explanation */}
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-3">The Waterfall Structure &amp; Equity IRR</h3>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            The Monthly Cash Flow Projection table follows a strict <strong className="text-white">Payment Waterfall</strong> to ensure capital is returned in the correct order of priority. This structure is critical for calculating the levered Equity IRR.
          </p>
          <div className="space-y-2 text-sm text-slate-400">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">1.</span>
              <span><strong className="text-white">Senior Debt Service:</strong> Loan interest and principal repayments are made first from available cash flows.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">2.</span>
              <span><strong className="text-white">Preference Shares:</strong> If enabled, fixed dividends and eventual repayment of the mezzanine tranche are paid next.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">3.</span>
              <span><strong className="text-white">Common Equity Distributions:</strong> All remaining residual cash flows are distributed to the common equity investors. This is the &quot;levered&quot; cash flow used to calculate the Equity IRR.</span>
            </div>
          </div>
          <div className="mt-4 p-3 rounded bg-slate-950 border border-slate-800">
            <p className="text-xs text-slate-500">
              <strong className="text-white">IRR Calculation:</strong> The Equity IRR is solved using the Newton-Raphson method on the series of equity cash flows (negative for injections, positive for distributions). The discount rate that makes the Net Present Value (NPV) of these flows equal to zero is the Equity IRR.
            </p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Key Financing Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Total Equity Amount</p>
              <p className="text-emerald-400 font-mono font-bold">AED 62,977,043.71</p>
              <p className="text-xs text-slate-500">Land + Cash Injection</p>
            </div>
            <div>
              <p className="text-slate-400">Total Cash Injection</p>
              <p className="text-white font-mono">AED 28,972,688.71</p>
            </div>
            <div>
              <p className="text-slate-400">Total Construction Loan Amount</p>
              <p className="text-blue-400 font-mono">AED 8,692,155.47</p>
            </div>
            <div>
              <p className="text-slate-400">Equity Multiple</p>
              <p className="text-emerald-400 font-mono font-bold">1.36x</p>
            </div>
            <div>
              <p className="text-slate-400">Equity Payback</p>
              <p className="text-emerald-400 font-mono font-bold">M35</p>
              <p className="text-xs text-slate-500">Month of full recovery</p>
            </div>
            <div>
              <p className="text-slate-400">Equity IRR</p>
              <p className="text-emerald-400 font-mono font-bold">11.52%</p>
              <p className="text-xs text-slate-500">Annualized</p>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <a href="/docs/sale-stream/component-3-project-irr" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          ← Component 3: Project IRR
        </a>
        <a href="/docs/sale-stream/component-5-levered-irr" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          Component 5: Project IRR (Levered) →
        </a>
      </div>
    </div>
  );
}
