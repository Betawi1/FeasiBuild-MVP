export default function SaleComponent4Docs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Sale Stream</p>
        <h1 className="text-4xl font-bold text-white mb-4">Component 4: Financing (Sale)</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          Component 4 models the complete financing structure for for-sale developments, including
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
        <p className="mt-4 text-sm text-slate-400 leading-relaxed">
          <strong className="text-white">Note:</strong> For{' '}
          <strong className="text-white">Commercial Strata</strong> assets (Office and Warehouse), the system
          may apply <strong className="text-white">Non-Escrow</strong> logic or simplified withdrawal rules
          depending on jurisdiction, as these assets are not subject to residential HDA/RERA regulations.
        </p>
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
            The screen is titled <strong className="text-white">Land as Equity</strong>. Use it to configure land as an equity contribution to the development financing. A <strong className="text-white">BENCHMARK</strong> chip at the top of the wizard shows asset • city • country, and a read-only <strong className="text-white">Land Cost (Component 1)</strong> value is shown so you can see the land figure this step is using.
          </p>
          <div className="space-y-4">
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">BENCHMARK</span>
              <span className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200">
                Asset • City • Country
              </span>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Land Cost (Component 1)</span>
                <span className="font-medium text-white">Read-only from Component 1</span>
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <h4 className="text-amber-300 font-medium mb-2">Land Equity Contribution slider</h4>
              <p className="text-sm text-slate-400">
                Locked at <strong className="text-white">100%</strong> only for <strong className="text-white">Dubai, United Arab Emirates</strong>.
              </p>
              <p className="text-sm text-slate-400 mt-2">
                <strong className="text-white">KSA</strong>, the other emirates (<strong className="text-white">Abu Dhabi, Ras Al Khaimah, Sharjah, Ajman, Fujairah</strong>), and <strong className="text-white">all other countries</strong> are unlocked, range <strong className="text-white">30%</strong> to <strong className="text-white">100%</strong>.
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Selecting or switching the escrow withdrawal rule never changes the stored land equity percentage.
              </p>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Equity sources breakdown</h4>
              <p className="text-sm text-slate-400 mb-3">
                Always shown. Total equity requirement = TDC − senior debt. Land value only counts toward equity if you own 100% of the land as equity; 70% of land value is credited after the bank haircut.
              </p>
              <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-xs text-emerald-300">
                  At 100% land equity: <strong className="text-white">100% land ownership</strong> — 70% of land value counts toward the equity requirement; remaining land value is not credited and must be funded via cash or other sources.
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Total equity requirement</span>
                  <span className="text-white font-mono">TDC − senior debt</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Land (counted as equity, 70% haircut)</span>
                  <span className="text-emerald-400 font-mono">70% of land value at 100% land equity; otherwise 0</span>
                </div>
                <div className="flex justify-between py-2 bg-amber-500/10 rounded px-2">
                  <span className="text-white font-medium">Cash equity (required)</span>
                  <span className="text-amber-400 font-mono font-bold">Residual after land credit</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <h4 className="text-amber-400 font-semibold mb-2">Land Term Loan Required</h4>
              <p className="text-sm text-slate-400 mb-3">
                Appears automatically whenever land equity is set below 100%. The portion of the land not owned through equity must be financed. The land loan appears in the Monthly Cash Flow Projection under <strong className="text-white">all escrow rules, including the Staged Escrow Rule</strong> (drawdown, interest, and bullet repayment rows).
              </p>
              <ul className="text-sm text-slate-400 space-y-2 ml-4 list-disc">
                <li>
                  <strong className="text-white">Principal (drawn at M0)</strong> = the unowned portion of the land cost. Bullet repayment of full principal at maturity.
                </li>
                <li>
                  <strong className="text-white">Land loan rate % (annual)</strong> — numeric input for the land facility rate.
                </li>
              </ul>
              <h5 className="text-white font-medium mt-4 mb-2">Interest payment on land loan</h5>
              <ul className="text-sm text-slate-400 space-y-2 ml-4 list-disc">
                <li>
                  <strong className="text-white">Capitalize:</strong> interest accrues to the loan balance — no cash interest during the tenor; bullet repayment of principal plus capitalized interest at maturity (e.g. M33).
                </li>
                <li>
                  <strong className="text-white">Paid current (quarterly):</strong> interest paid every 3 months from developer cash (increases peak equity requirement vs capitalize).
                </li>
                <li>
                  <strong className="text-white">Paid current (semi-annual):</strong> interest paid every 6 months from developer cash (increases peak equity requirement vs capitalize).
                </li>
              </ul>
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3">
                <p className="text-sm text-white font-medium">Loan tenor (bullet repayment)</p>
                <p className="mt-1 text-xs text-slate-400">
                  Construction period + 6 months post-completion; full principal repayment at maturity.
                </p>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-slate-300">Land term loan fees</p>
                <p className="text-sm text-slate-400">
                  <strong className="text-white">Arrangement / processing fee (%)</strong> with benchmark hint (0.75% arrangement fee).
                </p>
                <p className="text-sm text-slate-400">
                  <strong className="text-white">Legal &amp; valuation fee (%)</strong> with benchmark hint (0.15% legal/valuation bundle).
                </p>
              </div>
              <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                <p className="text-xs text-blue-300">
                  <strong className="text-white">Capitalized interest (illustrative):</strong> shows the amount that accrues to the loan and is repaid at maturity (principal + accrued interest).
                </p>
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
            Four tabs: <strong className="text-white">10/90 Rule</strong>, <strong className="text-white">Staged Escrow Rule</strong> (Staged Escrow Rule Configuration; formerly Certification Intervals), <strong className="text-white">Progress Drawdown Rule</strong> (Progress Drawdown Rule Configuration; formerly HDA Progress Withdrawals), and <strong className="text-white">No Escrow Rules</strong>. All four remain selectable everywhere.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            These are withdrawal mechanisms, not country labels; the project&apos;s location only pre-selects a default.
          </p>

          <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Location defaults (pre-select only)</h4>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li><strong className="text-white">10/90 Rule:</strong> Australia.</li>
              <li><strong className="text-white">Staged Escrow Rule:</strong> Dubai (UAE) only.</li>
              <li><strong className="text-white">Progress Drawdown Rule:</strong> Malaysia.</li>
              <li>
                <strong className="text-white">No Escrow Rules:</strong> all other locations — including KSA, the other emirates (Abu Dhabi, Ras Al Khaimah, Sharjah, Ajman, Fujairah), Thailand, and China — with all four options still selectable.
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h4 className="text-emerald-400 font-medium mb-1">Staged Escrow Rule</h4>
              <p className="text-xs text-slate-500 mb-2">Staged Escrow Rule Configuration</p>
              <p className="text-sm text-slate-400 mb-2">
                Certification-based staged withdrawals. Default only for Dubai, United Arab Emirates; selectable in any other market.
              </p>
              <ul className="text-xs text-slate-400 space-y-1 ml-4 list-disc">
                <li><strong>Certification interval:</strong> progress withdrawals at each certification (e.g. every 3 months), with cash drawn the following month (1-month offset).</li>
                <li><strong>Retention %:</strong> user-editable (default 5), held until practical completion plus defect liability.</li>
                <li><strong>Release timing:</strong> retention released at practical completion + defect liability. Residual trust is swept by CP+12.</li>
                <li><strong>Horizon:</strong> CP+12.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
              <h4 className="text-blue-400 font-medium mb-1">10/90 Rule</h4>
              <p className="text-xs text-slate-500 mb-2">10/90 Rule Configuration</p>
              <p className="text-sm text-slate-400 mb-2">
                Deposit held in trust at lock; balance paid at settlement. Default for Australia; selectable anywhere.
              </p>
              <ul className="text-xs text-slate-400 space-y-1 ml-4 list-disc">
                <li><strong>Purchase Deposit %:</strong> user-editable (default 10). Must sum with Balance % to 100.</li>
                <li><strong>Balance %:</strong> user-editable (default 90). Paid at settlement.</li>
                <li><strong>Deposit timing:</strong> lodged to trust at every lock month — during and after the construction period.</li>
                <li><strong>Settlement timing:</strong> construction-period locks settle at handover; post-CP locks settle in the same month. Deposits are released at settlement.</li>
                <li><strong>Residual sweep:</strong> any leftover trust is fully swept by CP+12 (never later).</li>
                <li><strong>Trust interest:</strong> earned on the prior month&apos;s trust balance (1-month offset).</li>
                <li><strong>Actual Sales Proceeds:</strong> balance + releases. Proceeds equal total locked sales plus net trust interest minus fees. Horizon is CP+12.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
              <h4 className="text-purple-400 font-medium mb-1">Progress Drawdown Rule</h4>
              <p className="text-xs text-slate-500 mb-2">Progress Drawdown Rule Configuration</p>
              <p className="text-sm text-slate-400 mb-2">
                Milestone / S-curve-linked drawdowns. HDA is the Malaysian regime that uses this rule. Default for Malaysia; selectable anywhere.
              </p>
              <ul className="text-xs text-slate-400 space-y-1 ml-4 list-disc">
                <li><strong>Drawdowns:</strong> withdrawals follow construction milestones and the S-curve (SPA signing, foundation, framework, and later completion / title stages).</li>
                <li><strong>Retention:</strong> post-VP schedule through VP+24.</li>
                <li><strong>Horizon:</strong> CP+24.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">No Escrow Rules</h4>
              <p className="text-sm text-slate-400 mb-3">
                Default for every location that does not map to the three mechanisms above (including KSA and UAE emirates other than Dubai). Sales proceeds sweep directly to debt service and equity distribution; no escrow or trust accounts apply. Horizon is CP+6.
              </p>
              <p className="text-sm text-slate-400">
                Optional toggle: <strong className="text-white">Sales reduce equity need (optional)</strong>.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Escrow Account Fees</h4>
            <p className="text-sm text-slate-400 mb-2">
              Shown on the three escrow options (10/90 Rule, Progress Drawdown Rule, and Staged Escrow Rule). Hidden when No Escrow Rules is selected.
            </p>
            <p className="text-sm text-slate-400 mb-2">
              <strong className="text-white">Setup fee (flat amount)</strong> — one-time setup fee, e.g. 5,000.
            </p>
            <p className="text-sm text-slate-400">
              <strong className="text-white">Management fee (% p.a.)</strong> — annual management fee, e.g. 0.03–0.08% p.a. on average balance.
            </p>
          </div>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">
            The feasibility report&apos;s escrow slide is titled by the selected rule name (for example, &quot;Staged Escrow Rule Configuration&quot;) and never by a country regulator outside that regulator&apos;s market.
          </p>
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

          <div className="mt-6 rounded-lg border border-blue-700/50 bg-blue-900/20 p-5">
            <h5 className="mb-2 flex items-center font-semibold text-blue-400">
              <svg
                className="mr-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Canonical Rule: The 1-Month Offset
            </h5>
            <p className="mb-3 text-sm text-slate-300">
              To ensure institutional-grade accuracy, FeasiBuild applies a strict{' '}
              <strong className="text-white">1-month offset</strong> to specific financial calculations:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>
                <strong className="text-white">Construction Loan Interest:</strong> Interest at Month{' '}
                <em>t</em> is calculated on the outstanding loan balance at the end of Month <em>t-1</em>.
              </li>
              <li>
                <strong className="text-white">Escrow / Trust Interest Income:</strong> Interest earned in
                Month <em>t</em> is based on the prior month&apos;s escrow balance.
              </li>
              <li>
                <strong className="text-white">UAE/KSA Progress Withdrawals:</strong> When a milestone is
                certified in a given month, the actual cash withdrawal occurs in the{' '}
                <strong className="text-white">following month</strong>.
              </li>
            </ul>
            <p className="mt-3 text-xs italic text-slate-500">
              This lag reflects real-world banking and regulatory processing times, preventing the model from
              overstating early-period cash availability.
            </p>
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
                <strong className="text-white">Construction Cost-Based Release (Staged Escrow Rule):</strong> Surplus escrow receipts automatically reduce the drawn RCF during the development phase, lowering interest costs.
              </p>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <p className="text-sm text-slate-400">
                <strong className="text-white">GDV-Based Release (Progress Drawdown Rule):</strong> Sales reduce the equity need. Enabled when the Progress Drawdown Rule is selected (GDV-based release models).
              </p>
            </div>
            <p className="text-sm text-slate-400">
              Recycling behavior follows the selected escrow rule, not the country. The 10/90 Rule and No Escrow Rules keep their current treatment.
            </p>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900">
                <tr>
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3">Definition</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800">
                  <td className="px-4 py-3 font-medium text-white">Total Equity Amount</td>
                  <td className="px-4 py-3">Land + cash injection deployed in the project.</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="px-4 py-3 font-medium text-white">Total Cash Injection</td>
                  <td className="px-4 py-3">Cash equity injected by the gap-fill engine (excludes land equity).</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="px-4 py-3 font-medium text-white">Preference Shares</td>
                  <td className="px-4 py-3">Pref. drawdown when the mezzanine tranche is enabled (zero otherwise).</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="px-4 py-3 font-medium text-white">Total Land Loan Amount</td>
                  <td className="px-4 py-3">Land facility drawdown (appears when land equity is below 100%).</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="px-4 py-3 font-medium text-white">Total Construction Loan Amount</td>
                  <td className="px-4 py-3">Construction facility (RCF) drawdown.</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="px-4 py-3 font-medium text-white">Total Loan Interest</td>
                  <td className="px-4 py-3">Total interest across land and construction facilities.</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="px-4 py-3 font-medium text-white">Equity Multiple</td>
                  <td className="px-4 py-3">Total distributions divided by total equity injected.</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="px-4 py-3 font-medium text-white">Equity Payback</td>
                  <td className="px-4 py-3">Month of full equity recovery.</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="px-4 py-3 font-medium text-white">Equity IRR</td>
                  <td className="px-4 py-3">Annualized levered internal rate of return on the equity cash-flow series.</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="px-4 py-3 font-medium text-white">DSCR Metrics</td>
                  <td className="px-4 py-3">Skipped during the construction/sales phase — DSCR requires an operational CFADS definition and is not applicable during construction/sales.</td>
                </tr>
              </tbody>
            </table>
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
