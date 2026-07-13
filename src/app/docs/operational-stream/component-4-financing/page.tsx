export default function Component4FinancingDocs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Operational Stream</p>
        <h1 className="text-4xl font-bold text-white mb-4">Component 4: Financing</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          Component 4 models the complete capital structure for operational real estate projects — senior debt,
          preference shares, and equity. Its key innovation is the dynamic gap-fill equity mechanism, which
          calculates exactly how much cash equity is needed month-by-month to keep the project solvent, combined
          with a waterfall payment structure that enforces proper capital priority.
        </p>
      </div>

      {/* Overview */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Component 4 takes inputs from Component 1 (construction costs, land cost, S-curve phasing) and
          Component 2 (operating cash flows, P&amp;L) and builds the full financing model. It is the most
          complex component in the Operational Stream, bridging development expenditure with operational returns
          through a month-by-month cash flow engine.
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">What This Component Calculates</h3>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Debt Sizing:</strong> Maximum facility size based on LTC and LTV ratios (binding constraint applied)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Monthly Loan Drawdowns:</strong> Aligned with construction S-curve from Component 1</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Interest Calculations:</strong> Including IDC (Interest During Construction) treatment options</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Dynamic Equity Gap-Fill:</strong> Month-by-month cash equity injections to maintain positive cash position</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Exit Proceeds:</strong> Sale, refinance, or hold scenarios based on terminal value</span>
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
            The opening step consolidates all inputs from previous components into a single funding overview.
          </p>
          <ul className="space-y-2 text-slate-300 ml-4 list-disc">
            <li><strong className="text-white">Consolidated Inputs:</strong> Total development cost, land cost, stabilized NOI, and operating period from Components 1–3</li>
            <li><strong className="text-white">Funding Gap Visualization - Preliminary:</strong> Peak funding requirement vs. debt capacity vs. equity required</li>
            <li><strong className="text-white">Capital Stack:</strong> Visual breakdown of debt / preference / equity split</li>
            <li><strong className="text-white">Key Metrics:</strong> Construction period, operating period, and net surplus at stabilization</li>
          </ul>
        </div>

        {/* Step 2 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 2: Debt Sizing (LTC &amp; LTV)</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            The system sizes senior debt using two independent constraints and applies the more restrictive one.
          </p>
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Loan-to-Cost (LTC)</h4>
              <p className="text-sm text-slate-400 mb-2">
                Determines maximum debt as a percentage of total development cost (TDC). Typical range: 60–75% for development finance.
              </p>
              <div className="bg-slate-950 rounded-lg p-3 font-mono text-sm text-emerald-300">
                LTC Debt = TDC × LTC%
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Loan-to-Value (LTV)</h4>
              <p className="text-sm text-slate-400 mb-2">
                Determines maximum debt as a percentage of stabilized property value. Typical range: 55–70% for operational assets.
              </p>
              <div className="bg-slate-950 rounded-lg p-3 font-mono text-sm text-emerald-300 mb-2">
                LTV Debt = Stabilized Value × LTV%
              </div>
              <p className="text-xs text-slate-500">
                Where Stabilized Value = Stabilized NOI ÷ Exit Cap Rate
              </p>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h4 className="text-emerald-400 font-medium mb-2">Binding Constraint</h4>
              <div className="bg-slate-950 rounded-lg p-3 font-mono text-sm text-white">
                Approved Debt = Min(TDC × LTC%, Stabilized Value × LTV%)
              </div>
              <p className="text-sm text-slate-400 mt-2">
                The system uses whichever constraint produces the lower amount, ensuring the facility complies with both cost and value tests.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 3: Land as Equity</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            A toggle determines whether land cost is treated as an equity contribution (skin-in-the-game) or refinanced into the senior facility.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h4 className="text-emerald-400 font-medium mb-2">Enabled: Land as Equity</h4>
              <ul className="text-sm text-slate-400 space-y-1 list-disc ml-4">
                <li>Land cost counts toward equity requirement</li>
                <li>Reduces cash equity needed during construction</li>
                <li>Demonstrates sponsor commitment to lenders</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Disabled: Land Refinanced</h4>
              <ul className="text-sm text-slate-400 space-y-1 list-disc ml-4">
                <li>Land cost included in TDC for LTC calculation</li>
                <li>Subject to LTC/LTV binding constraint</li>
                <li>Higher cash equity requirement during development</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 bg-slate-950 rounded-lg p-4 font-mono text-sm text-slate-300">
            Total Equity Required = TDC − Senior Debt<br />
            <span className="text-slate-500 text-xs">Land Equity Coverage = Land Cost ÷ Total Equity Required</span>
          </div>
        </div>

        {/* Step 4 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 4: Preference Shares (Optional)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            An optional mezzanine or preference tranche sits between senior debt and common equity in the capital stack.
          </p>
          <ul className="space-y-2 text-slate-300 ml-4 list-disc">
            <li><strong className="text-white">Allocation:</strong> Configured as a percentage of cash equity required, after land and senior debt sizing</li>
            <li><strong className="text-white">Return Types:</strong> Fixed dividend (% p.a.) or Islamic target profit (profit-sharing)</li>
            <li><strong className="text-white">Tenor:</strong> Subordinate to senior debt; repaid after bank facility payoff</li>
            <li><strong className="text-white">Priority:</strong> Dividends paid after loan interest and principal; capital repaid before equity distributions</li>
          </ul>
        </div>

        {/* Step 5 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 5: Construction Loan Drawdown Structure</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            Choose how the approved facility is drawn down during the construction period, aligned with cost phasing from Component 1.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Quarterly</h4>
              <p className="text-sm text-slate-400">Equal draws every 3 months. Simplest approach for early-stage feasibility.</p>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h4 className="text-emerald-400 font-medium mb-2">S-Curve (Hybrid Milestones)</h4>
              <p className="text-sm text-slate-400">Draws follow the construction S-curve profile from Component 1. Recommended for lender presentations.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Custom</h4>
              <p className="text-sm text-slate-400">User-defined monthly drawdown schedule for project-specific milestone agreements.</p>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            A preview table shows monthly draw amounts and cumulative drawdown, with a visual chart of the cumulative drawdown curve.
          </p>
        </div>

        {/* Step 6 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 6: Interest Rate &amp; IDC (Interest During Construction)</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            Configure the cost of debt and how interest accrued during construction is treated.
          </p>
          <ul className="space-y-2 text-slate-300 ml-4 list-disc mb-4">
            <li><strong className="text-white">Fixed Rate:</strong> Single rate applied throughout the loan life</li>
            <li><strong className="text-white">Floating Rate:</strong> Base rate + margin (e.g., EIBOR + 250 bps)</li>
            <li><strong className="text-white">Islamic Financing:</strong> Profit rate applied to Murabaha, Ijara, or Sukuk structure</li>
          </ul>
          <h4 className="text-white font-medium mb-3">IDC Treatment Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Fully Capitalized</h4>
              <p className="text-sm text-slate-400">IDC added to loan balance. Increases total debt at conversion but no cash outflow during construction.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Paid Current</h4>
              <p className="text-sm text-slate-400">Interest paid monthly from equity during construction. Increases equity requirement but keeps loan balance lower.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Hybrid</h4>
              <p className="text-sm text-slate-400">Split between capitalized and paid current. Common in practice for partial sponsor funding of IDC.</p>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            An illustrative IDC mechanics table and DSCR projection table (showing debt service coverage during operations) are generated for review.
          </p>
        </div>

        {/* Step 7 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 7: Loan Repayment Terms</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            Define how the facility converts from construction to term loan and how principal is repaid.
          </p>
          <h4 className="text-white font-medium mb-2">Loan Type Options</h4>
          <ul className="space-y-1 text-slate-400 ml-4 list-disc text-sm mb-4">
            <li><strong className="text-white">Equal P+I Payment (Annuity):</strong> Fixed monthly payment of principal + interest</li>
            <li><strong className="text-white">Equal Principal Amortization:</strong> Fixed principal each period, declining interest</li>
            <li><strong className="text-white">Bullet Payment (Interest-Only):</strong> Interest only during term, full principal at maturity</li>
            <li><strong className="text-white">Custom Schedule:</strong> User-defined repayment schedule</li>
          </ul>
          <h4 className="text-white font-medium mb-2">Loan Tenor Structure</h4>
          <ul className="space-y-1 text-slate-400 ml-4 list-disc text-sm mb-4">
            <li>Construction period (auto from Component 1)</li>
            <li>Pre-op buffer (fixed 6 months)</li>
            <li>Interest-only grace period (optional, first N operating years)</li>
            <li>Amortization period (matches hotel operations period)</li>
          </ul>
          <h4 className="text-white font-medium mb-2">Prepayment Terms</h4>
          <ul className="space-y-1 text-slate-400 ml-4 list-disc text-sm mb-4">
            <li><strong className="text-white">Lockout Period:</strong> Years where no prepayment is allowed</li>
            <li><strong className="text-white">Prepayment Penalty Step-Down:</strong> Declining % by year (e.g., Y4: 5%, Y5: 4%, Y6: 3%...)</li>
            <li><strong className="text-white">Yield Maintenance:</strong> Alternative to make-whole penalty calculation</li>
          </ul>
          <p className="text-sm text-slate-400">
            A loan preview table shows start balance, interest, principal, and total debt service by fiscal year end.
          </p>
        </div>

        {/* Step 8 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 8: Debt Covenants &amp; Exit Strategy</h3>
          <h4 className="text-white font-medium mb-2 mt-2">Debt Covenants</h4>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-slate-400 font-medium">Covenant</th>
                  <th className="text-left py-2 text-slate-400 font-medium">Typical Range</th>
                  <th className="text-left py-2 text-slate-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Minimum DSCR</td>
                  <td className="py-2">1.2x – 2.0x</td>
                  <td className="py-2">NOI ÷ Debt Service must exceed threshold</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Max LTV</td>
                  <td className="py-2">70 – 75%</td>
                  <td className="py-2">Outstanding loan ÷ property value must stay below limit</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Minimum Debt Yield</td>
                  <td className="py-2">8 – 10%</td>
                  <td className="py-2">NOI ÷ loan amount must exceed threshold</td>
                </tr>
                <tr>
                  <td className="py-2 text-white">DSCR Test Frequency</td>
                  <td className="py-2">Annual / Quarterly</td>
                  <td className="py-2">How often covenants are tested during operations</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h4 className="text-white font-medium mb-2">Exit Strategy Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-1">Hold</h4>
              <p className="text-sm text-slate-400">Continue operations; model amortization and covenant DSCRs through hold period.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-1">Refinance</h4>
              <p className="text-sm text-slate-400">Refinance senior facility at exit year; calculate refi proceeds after payoff.</p>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h4 className="text-emerald-400 font-medium mb-1">Sale</h4>
              <p className="text-sm text-slate-400">Sell asset at exit year; calculate sale proceeds after loan payoff and penalties.</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-3">
            Exit/refi timing is selected via month selector (e.g., M156 = Year 13 year-end month). A covenant status grid
            shows pass/fail indicators for each operating year, with a validation checklist and monthly debt service &amp; DSCR snapshot.
          </p>
        </div>
      </section>

      {/* Monthly Cash Flows Table */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Monthly Cash Flows Table</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          The comprehensive monthly cash flow table is the engine output of Component 4. Each row represents one month
          from M0 through exit, with all inflows, outflows, and financing activities reconciled to a cumulative cash position.
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">Cash Inflows</h3>
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-300">Operational Revenue</span>
                <span className="text-slate-500 text-xs">From Component 2 P&amp;L (at fiscal year-end months)</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-300">Sales / Refinance Proceeds</span>
                <span className="text-slate-500 text-xs">From exit strategy calculation (at exit month)</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-3">Cash Outflows</h3>
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-2 text-sm">
              {[
                ['Land Cost', 'From Component 1 (typically M0)'],
                ['Construction Cost', 'Phased monthly from Component 1 S-curve'],
                ['FF&E', 'Furniture, Fixtures & Equipment (phased during construction)'],
                ['FF&E Renovation', 'Mid-life renovation reserve (typically Year 6)'],
                ['Soft Costs', 'Architect, engineering, permits (phased early in construction)'],
                ['POWC', 'Pre-Opening Working Capital (phased during pre-op period)'],
                ['Operational Expense ± Chg. WC', 'From Component 2 P&L (at FYE months)'],
              ].map(([label, desc]) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-800 last:border-0">
                  <span className="text-slate-300">{label}</span>
                  <span className="text-slate-500 text-xs text-right ml-4">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">NCF (Pre-Financing)</h3>
            <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm text-emerald-300 mb-2">
              NCF Pre-Financing = Total Inflow − Total Outflow
            </div>
            <p className="text-sm text-slate-400">Represents project cash flow before any financing activities.</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-3">Financing Activities</h3>
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-2 text-sm">
              {[
                ['Loan Drawdown', 'Monthly debt draws from Step 5 schedule'],
                ['Cumulative Loan', 'Running total of outstanding debt'],
                ['Interest Payment', 'Calculated on cumulative loan balance'],
                ['Principal Repayment', 'From amortization schedule (Step 7)'],
                ['Pref. Drawdown / Dividend / Repayment', 'Preference share activities'],
              ].map(([label, desc]) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-800 last:border-0">
                  <span className="text-slate-300">{label}</span>
                  <span className="text-slate-500 text-xs text-right ml-4">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-amber-400 mb-3">Equity</h3>
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-300">Land Equity Injection</span>
                <span className="text-slate-500 text-xs">Land cost counted as equity (if Step 3 enabled)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-amber-300 font-medium">Cash Equity Injection</span>
                <span className="text-amber-400 text-xs">Dynamic gap-fill when cumulative NCF (pre-equity) is negative</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-300">Cumulative Equity</span>
                <span className="text-slate-500 text-xs">Running sum of Land + Cash Equity injections</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">NCF (Post-Financing)</h3>
            <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm text-emerald-300 mb-2">
              NCF Post = NCF Pre + Loan Drawdown − Interest − Principal + Pref Activities + Cash Equity
            </div>
            <p className="text-sm text-slate-400 mb-3">End-of-month cash position after all financing activities.</p>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-200">
              <strong>Cumulative NCF (Post-Financing):</strong> End-of-month balance after cash equity gap-fill — must be ≥ 0 every month.
            </div>
          </div>
        </div>
      </section>

      {/* Gap-Fill Equity Mechanism */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Gap-Fill Equity Mechanism</h2>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 mb-6">
          <p className="text-sm text-amber-200">
            <strong>Critical:</strong> This is FeasiBuild&apos;s core innovation in project finance modeling. Traditional models
            assume a fixed equity amount upfront — gap-fill equity calculates the exact cash needed each month.
          </p>
        </div>

        <h3 className="text-lg font-semibold text-white mb-3">The Problem</h3>
        <p className="text-slate-300 leading-relaxed mb-6">
          Construction phasing, loan drawdown timing, and operating cash flow volatility mean the actual cash equity
          needed varies month-by-month. Over-equity wastes capital and depresses IRR; under-equity causes insolvency.
        </p>

        <h3 className="text-lg font-semibold text-emerald-400 mb-4">The Solution — Gap-Fill Rules</h3>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">1. Calculate Pre-Equity Position</h4>
            <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-slate-300 leading-relaxed">
              Pre-Equity Cumulative = Previous Month Cumulative<br />
              &nbsp;&nbsp;+ NCF Pre-Financing<br />
              &nbsp;&nbsp;+ Loan Drawdown<br />
              &nbsp;&nbsp;− Interest − Principal − Pref Activities
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">2. Check for Shortfall</h4>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>If <strong className="text-emerald-400">Pre-Equity Cumulative ≥ 0</strong>: No equity needed this month</li>
              <li>If <strong className="text-red-400">Pre-Equity Cumulative &lt; 0</strong>: Equity gap exists</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">3. Calculate Required Equity Injection</h4>
            <div className="bg-slate-950 rounded-lg p-3 font-mono text-sm text-amber-300">
              Cash Equity Injection = |Pre-Equity Cumulative| (when negative)
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">4. Apply Equity</h4>
            <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-slate-300 leading-relaxed">
              NCF Post-Financing = Pre-Equity Cumulative + Cash Equity Injection = 0 (or positive)<br />
              Cumulative NCF Post-Financing = Previous Cumulative + NCF Post-Financing
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">5. Track Total Equity</h4>
            <div className="bg-slate-950 rounded-lg p-3 font-mono text-sm text-emerald-300">
              Total Equity = Land Equity (if enabled) + Sum of all Cash Equity Injections
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-white mb-4 mt-8">Example Walkthrough</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900">
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Month</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Activity</th>
                <th className="text-right py-2 px-3 text-slate-400 font-medium">Pre-Equity</th>
                <th className="text-right py-2 px-3 text-slate-400 font-medium">Cash Equity</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-800">
                <td className="py-2 px-3 text-white font-mono">M0</td>
                <td className="py-2 px-3 text-slate-400">Land 210,000 + Construction 220,958. Draw 27,387.</td>
                <td className="py-2 px-3 text-right font-mono text-red-400">−403,571</td>
                <td className="py-2 px-3 text-right font-mono text-amber-300">403,571</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2 px-3 text-white font-mono">M1</td>
                <td className="py-2 px-3 text-slate-400">Construction 9,820. No draw. Interest 205.</td>
                <td className="py-2 px-3 text-right font-mono text-red-400">−10,025</td>
                <td className="py-2 px-3 text-right font-mono text-amber-300">10,025</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-white font-mono">M3</td>
                <td className="py-2 px-3 text-slate-400">Construction 1,892 + POWC 1,300. Draw 27,387.</td>
                <td className="py-2 px-3 text-right font-mono text-emerald-400">+24,195</td>
                <td className="py-2 px-3 text-right font-mono text-slate-500">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Key Benefits</h3>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Minimizes equity commitment</strong> — only inject when needed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Maximizes equity IRR</strong> — equity deployed later = higher return</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Prevents insolvency</strong> — cash position never goes negative</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Reflects real-world practice</strong> — matches how sponsors actually fund development</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Waterfall Payment Structure */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Waterfall Payment Structure</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          The waterfall ensures proper capital structure hierarchy — senior obligations are always paid before subordinate
          claims and equity distributions.
        </p>

        <h3 className="text-lg font-semibold text-emerald-400 mb-4">Payment Priority Order (Highest to Lowest)</h3>
        <div className="space-y-3 mb-8">
          {[
            { step: '1', title: 'Loan Interest', desc: 'Senior debt interest has first claim on cash flows. Calculated monthly on outstanding balance. Must be paid to avoid default.', color: 'text-red-400' },
            { step: '2', title: 'Loan Principal', desc: 'Senior debt principal per amortization schedule from Step 7. Reduces outstanding loan balance.', color: 'text-orange-400' },
            { step: '3', title: 'Preference Dividends', desc: 'Fixed return to preference shareholders (% of preference amount). Paid after senior debt service.', color: 'text-amber-400' },
            { step: '4', title: 'Preference Repayment', desc: 'Return of preference capital, typically at end of preference tenor. After senior debt payoff if subordinate.', color: 'text-yellow-400' },
            { step: '5', title: 'Equity Distributions', desc: 'Residual cash flow to equity holders. Only after all senior obligations met. Represents true levered cash flow.', color: 'text-emerald-400' },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
              <div className={`text-2xl font-bold ${item.color} shrink-0 w-8`}>{item.step}</div>
              <div>
                <h4 className="text-white font-medium">{item.title}</h4>
                <p className="text-sm text-slate-400 mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-white mb-3">Waterfall Logic in Monthly Table</h3>
        <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 leading-relaxed mb-8">
          Available Cash = NCF Pre-Financing + Loan Drawdown<br />
          Step 1: Pay Interest → Remaining = Available Cash − Interest<br />
          Step 2: Pay Principal → Remaining = Step 1 − Principal<br />
          Step 3: Pay Pref Dividend → Remaining = Step 2 − Pref Dividend<br />
          Step 4: Pay Pref Repayment → Remaining = Step 3 − Pref Repayment<br />
          Step 5: Equity Distribution = Remaining (if positive)<br />
          &nbsp;&nbsp;&nbsp;&nbsp;OR Equity Injection = |Remaining| (if negative, gap-fill)
        </div>

        <h3 className="text-lg font-semibold text-white mb-3">Exit Waterfall (at Sale / Refinance)</h3>
        <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 leading-relaxed mb-6">
          Gross Exit Proceeds = Terminal Value − Selling Costs<br />
          Step 1: Loan Payoff → Remaining = Gross Proceeds − Outstanding Loan<br />
          Step 2: Prepayment Penalty (if applicable) → Remaining = Step 1 − Penalty<br />
          Step 3: Preference Repayment → Remaining = Step 2 − Preference Balance<br />
          Step 4: Net Exit Proceeds to Equity = Remaining
        </div>

        <h4 className="text-white font-medium mb-3">Example: Exit Proceeds</h4>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Terminal Value:</span>
            <span className="text-white font-mono">AED 1,080,975,963</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Selling Costs (3%):</span>
            <span className="text-red-400 font-mono">− AED 32,429,279</span>
          </div>
          <div className="flex justify-between border-t border-slate-700 pt-2">
            <span className="text-slate-300">Gross Exit Proceeds:</span>
            <span className="text-white font-mono">AED 1,048,546,684</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Loan Payoff:</span>
            <span className="text-slate-400 font-mono">AED 0 (fully amortized by Y13)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Prepayment Penalty:</span>
            <span className="text-slate-400 font-mono">AED 0 (outside lockout period)</span>
          </div>
          <div className="flex justify-between border-t border-emerald-500/30 pt-2">
            <span className="text-emerald-400 font-medium">Net Exit Proceeds to Equity:</span>
            <span className="text-emerald-400 font-mono font-bold">AED 1,048,546,684</span>
          </div>
        </div>
      </section>

      {/* Key Financing Metrics */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Key Financing Metrics</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          The summary section at the top of the financing output displays these metrics:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Metric</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Description</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Example</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {[
                ['Total Equity Amount', 'Sum of Land Equity + Cash Equity injections', 'AED 288,035,481'],
                ['Total Cash Injection', 'Cash equity only (excludes land if treated as equity)', '—'],
                ['Total Land Equity Injection', 'Land cost counted as equity (AED 0 if land refinanced)', '—'],
                ['Total Loan Drawdown Amount', 'Sum of all monthly loan draws', 'AED 301,252,087'],
                ['Preference Shares Amount', 'Mezzanine / preference tranche size', '—'],
                ['Total Loan Interest', 'Sum of all interest payments over loan life', 'AED 196,566,987'],
                ['Equity Multiple', 'Total equity distributions ÷ Total equity invested', '4.07x'],
                ['Equity Payback', 'Month when cumulative equity distributions = equity invested', 'M156'],
                ['Equity IRR', 'Annualized IRR on equity cash flows', '12.18%'],
                ['DSCR Min / Avg', 'Minimum and average debt service coverage during operations', '—'],
              ].map(([metric, desc, example]) => (
                <tr key={metric} className="border-b border-slate-800">
                  <td className="py-3 px-4 font-medium text-white">{metric}</td>
                  <td className="py-3 px-4 text-slate-400">{desc}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400">{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Exit Proceeds Calculation */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Exit Proceeds Calculation</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          The exit proceeds box summarizes the waterfall at the selected exit month:
        </p>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-4">
          <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm text-emerald-300 mb-2">
            Terminal Value = Stabilized NOI ÷ Exit Cap Rate
          </div>
          <p className="text-sm text-slate-400">
            Example: AED 75,668,320 ÷ 7% = <strong className="text-white">AED 1,080,975,963</strong>
          </p>
        </div>
        <div className="space-y-3 text-sm">
          {[
            ['Exit Strategy', 'Sale, Refinance, or Hold (from Step 8)'],
            ['Exit Year', 'Selected month (e.g., Y13 = Month 156)'],
            ['Selling Costs', 'Typically 2–3% of terminal value (broker, legal, transfer taxes)'],
            ['Gross Exit Proceeds', 'Terminal Value − Selling Costs'],
            ['Loan Payoff', 'Remaining loan balance at exit month (from amortization schedule)'],
            ['Prepayment Penalty', 'Applied if exit is during lockout period (% from Step 7)'],
            ['Net Exit Proceeds', 'Gross Proceeds − Loan Payoff − Prepayment Penalty'],
          ].map(([label, desc]) => (
            <div key={label} className="flex gap-4 rounded-lg border border-slate-700 bg-slate-900 p-3">
              <span className="text-white font-medium shrink-0 w-40">{label}</span>
              <span className="text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <a href="/docs/operational-stream/project-irr" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          ← Component 3: Project IRR
        </a>
        <a href="/docs/operational-stream/component-5-equity-returns" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          Component 5: Equity Returns →
        </a>
      </div>
    </div>
  );
}
