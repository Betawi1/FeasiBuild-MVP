export default function Component5Docs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Operational Stream</p>
        <h1 className="text-4xl font-bold text-white mb-4">Component 5: Equity Returns (Read-Only)</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          Component 5 is a read-only analytical view that summarizes the equity investor&apos;s returns based on
          the financing structure configured in Component 4. All metrics are automatically calculated from the
          post-financing cash flows — no manual inputs are required or allowed on this page.
        </p>
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <strong>Read-Only Notice:</strong> All values on this page are sourced from{' '}
          <code className="text-amber-300">operational.financingMetrics</code> (Component 4 Financing Preview).
          To change any equity return metric, adjust the financing parameters in Component 4.
        </div>
      </div>

      {/* Overview */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          After configuring your financing structure in Component 4, Component 5 provides a clear, visual summary
          of what the equity investor can expect in terms of returns, payback timing, and distribution priority.
          The page is organized into four tabs, each focusing on a different dimension of equity performance.
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Key Metrics at a Glance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Equity IRR</p>
              <p className="text-2xl font-bold text-emerald-400">12.18%</p>
              <p className="text-xs text-slate-500">Annualized</p>
            </div>
            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Equity Multiple</p>
              <p className="text-2xl font-bold text-emerald-400">4.45x</p>
              <p className="text-xs text-slate-500">Total Distributions ÷ Total Invested</p>
            </div>
            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Equity Payback</p>
              <p className="text-2xl font-bold text-emerald-400">M162</p>
              <p className="text-xs text-slate-500">Month of full recovery</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Tab-by-Tab Walkthrough</h2>

        {/* Summary Tab */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Tab 1: Summary</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            The Summary tab provides a high-level overview of the six key equity return metrics in a clean grid layout,
            plus two visual charts showing equity multiple and cumulative recovery.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div>
              <h4 className="text-white font-medium">Total Equity Invested</h4>
              <p className="text-sm text-slate-400">
                The sum of all equity capital deployed into the project, including both <strong className="text-white">land equity</strong> (if
                &quot;Use Land as Equity&quot; is enabled in Component 4) and <strong className="text-white">cash injections</strong> (the gap-fill equity
                required to keep the project solvent month-by-month).
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">Total Distributions</h4>
              <p className="text-sm text-slate-400">
                The cumulative cash returned to equity investors over the entire hold period, including operating cash flows
                and the terminal exit proceeds at the end of the hold period.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">Equity IRR (Annualized)</h4>
              <p className="text-sm text-slate-400">
                The Internal Rate of Return on equity, calculated from the monthly equity cash flow series (negative for
                injections, positive for distributions). This is the most important metric for equity investors — it represents
                the annualized return on every dollar of equity invested.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">Equity Multiple</h4>
              <p className="text-sm text-slate-400">
                Also known as the &quot;Money-on-Money&quot; (MoM) multiple. Calculated as:{' '}
                <code className="text-emerald-400">Total Distributions ÷ Total Equity Invested</code>. A 4.45x multiple means
                the investor receives 4.45 times their original investment over the hold period.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">Equity Payback (Month)</h4>
              <p className="text-sm text-slate-400">
                The month in which cumulative equity distributions equal or exceed cumulative equity invested. This is the
                &quot;break-even&quot; point for the equity investor. In the example, payback occurs at M162 (the exit month), meaning
                the investor recovers their full investment only at exit.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">Preference Shares Amount</h4>
              <p className="text-sm text-slate-400">
                If preference shares (mezzanine equity) were configured in Component 4, the amount is displayed here along
                with the target return rate. If not configured, this shows &quot;—&quot;.
              </p>
            </div>
          </div>
        </div>

        {/* Multiple Tab */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Tab 2: Multiple (Tranche Breakdown)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            The Multiple tab breaks down the equity investment and returns by tranche, showing how much was invested
            and returned for each capital source separately.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div>
              <h4 className="text-white font-medium">Land Equity</h4>
              <p className="text-sm text-slate-400">
                Shows the land value contributed as equity (if enabled) and the portion of total distributions attributable
                to the land tranche. Displayed as horizontal bar charts comparing Invested vs Returned.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">Cash Equity</h4>
              <p className="text-sm text-slate-400">
                Shows the cumulative cash injections (gap-fill equity) and the portion of distributions attributable to
                the cash tranche. This is typically the smaller tranche when land is used as equity.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">Total Equity (Blended)</h4>
              <p className="text-sm text-slate-400">
                The combined view of all equity tranches, showing the overall invested vs returned bars and the resulting
                blended equity multiple.
              </p>
            </div>
          </div>
        </div>

        {/* Payback Tab */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Tab 3: Payback Analysis</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            The Payback tab visualizes the cumulative equity recovery over time, showing exactly when the investor
            recovers their initial investment.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div>
              <h4 className="text-white font-medium">Cumulative Recovery Chart</h4>
              <p className="text-sm text-slate-400">
                A line chart showing the cumulative equity position month-by-month. The line starts negative (representing
                the initial investment) and trends upward as distributions are received. The point where the line crosses
                zero is the payback month.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">Payback Month</h4>
              <p className="text-sm text-slate-400">
                Displayed prominently (e.g., <strong className="text-emerald-400">M162</strong>). This is the first month
                where cumulative distributions ≥ cumulative invested. For hold assets with exit at the end of the hold
                period, payback typically occurs at the exit month.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">Monthly Cash Flow Table</h4>
              <p className="text-sm text-slate-400">
                A detailed table showing each month&apos;s equity cash flow (negative for injections, positive for distributions)
                with a visual bar indicator. This helps identify the timing and magnitude of each equity movement.
              </p>
            </div>
          </div>
        </div>

        {/* Waterfall Tab */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Tab 4: Distribution Waterfall</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            The Waterfall tab shows the priority order in which cash flows are distributed, reflecting the capital
            structure hierarchy configured in Component 4.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div>
              <h4 className="text-white font-medium">1. Debt Service (Highest Priority)</h4>
              <p className="text-sm text-slate-400">
                Senior debt interest and principal payments are made first. This is sourced directly from Component 4&apos;s
                amortization schedule. No equity distributions occur until debt service obligations are met.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">2. Preference Shares (If Configured)</h4>
              <p className="text-sm text-slate-400">
                If preference shares (mezzanine equity) were enabled in Component 4, their fixed return (e.g., 10% p.a.)
                is paid next. This tranche sits between senior debt and common equity in the priority stack.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">3. Common Equity Distributions (Residual)</h4>
              <p className="text-sm text-slate-400">
                All remaining cash flows after debt service and preference shares are distributed to common equity investors.
                This is the residual claim — it carries the most risk but also captures the upside. The total common equity
                distributions are displayed (e.g., <strong className="text-emerald-400">AED 1,186,466,065.30</strong>).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How Metrics Are Calculated */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">How Metrics Are Calculated</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          All Component 5 metrics are derived from the monthly equity cash flow series generated by Component 4&apos;s
          financing engine. Here&apos;s how each metric is computed:
        </p>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Equity IRR</h4>
            <div className="bg-slate-950 rounded p-3 font-mono text-sm text-emerald-300">
              IRR = rate where NPV(equity cash flows) = 0
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Calculated using the Newton-Raphson method on the monthly equity cash flow series (M0 to M162).
              The monthly IRR is annualized using: <code className="text-emerald-400">(1 + monthly_IRR)^12 - 1</code>.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Equity Multiple</h4>
            <div className="bg-slate-950 rounded p-3 font-mono text-sm text-emerald-300">
              Multiple = Σ(Positive Cash Flows) ÷ |Σ(Negative Cash Flows)|
            </div>
            <p className="text-sm text-slate-400 mt-2">
              A simple ratio of total cash returned to total cash invested. Unlike IRR, this metric does not account
              for the timing of cash flows.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Equity Payback Month</h4>
            <div className="bg-slate-950 rounded p-3 font-mono text-sm text-emerald-300">
              Payback = first month where Cumulative Cash Flow ≥ 0
            </div>
            <p className="text-sm text-slate-400 mt-2">
              The cumulative cash flow starts negative (equal to total equity invested) and increases as distributions
              are received. The payback month is the first period where the cumulative position turns positive.
            </p>
          </div>
        </div>
      </section>

      {/* Relationship to Component 4 */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Relationship to Component 4</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Component 5 is entirely dependent on Component 4. Any change to the financing structure in Component 4
          will automatically update all metrics in Component 5. Key dependencies include:
        </p>
        <ul className="space-y-2 text-slate-300 ml-4 list-disc">
          <li><strong className="text-white">Debt Structure:</strong> LTC/LTV ratios, interest rate, amortization schedule, and IDC treatment all affect the equity cash flow series.</li>
          <li><strong className="text-white">Land as Equity:</strong> Enabling this in Component 4 increases the equity invested (land value) but reduces cash injections, affecting the equity multiple and IRR.</li>
          <li><strong className="text-white">Preference Shares:</strong> If enabled, preference returns are paid before common equity distributions, reducing the common equity IRR.</li>
          <li><strong className="text-white">Exit Strategy:</strong> The exit timing and terminal value (from Component 3&apos;s exit cap rate) determine the final equity distribution, which typically represents the majority of total returns.</li>
          <li><strong className="text-white">Drawdown Schedule:</strong> The timing of debt drawdowns affects when equity injections are required, impacting the IRR calculation.</li>
        </ul>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Tips & Best Practices</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Target Equity IRR Benchmarks</h4>
            <p className="text-sm text-slate-400">
              For operational real estate in the GCC region, target equity IRRs typically range from 12-18% for core/core-plus
              assets and 18-25% for value-add/opportunistic plays. If your equity IRR is below 10%, consider reducing leverage
              costs or improving operational assumptions in Component 2.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Payback Timing</h4>
            <p className="text-sm text-slate-400">
              For hold assets with exit at the end of the hold period, payback typically occurs at the exit month. If you
              want earlier payback, consider a refinance strategy in Component 4 or a shorter hold period.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Multiple vs IRR</h4>
            <p className="text-sm text-slate-400">
              A high equity multiple with a low IRR may indicate that returns are back-loaded (most cash returned at exit).
              Conversely, a high IRR with a lower multiple may indicate early cash distributions. Both metrics should be
              evaluated together.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Sensitivity Analysis</h4>
            <p className="text-sm text-slate-400">
              After reviewing Component 5, proceed to Scenario Analysis to test how changes in key assumptions (exit cap rate,
              interest rate, occupancy) affect your equity returns. This is critical for understanding downside risk.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <a href="/docs/operational-stream/component-4-financing" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          ← Component 4: Financing
        </a>
        <a href="/docs/operational-stream/component-6-scenario-analysis" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          Component 6: Scenario Analysis →
        </a>
      </div>
    </div>
  );
}
