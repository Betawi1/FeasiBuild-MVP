export default function SaleComponent5Docs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Sale Stream</p>
        <h1 className="text-4xl font-bold text-white mb-4">Component 5: Project IRR (Levered)</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          Component 5 is a read-only analytical view that displays the levered equity returns after financing 
          from Component 4 has been applied. It compares the unlevered Project IRR with the levered Equity IRR, 
          demonstrating the powerful effect of financial leverage on your returns.
        </p>
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <strong>Read-Only Notice:</strong> All values on this page are sourced from Component 4&apos;s financing 
          calculations. To change any metric, adjust the financing parameters (debt sizing, interest rate, 
          escrow rules) in Component 4.
        </div>
      </div>

      {/* Overview */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          After configuring your financing structure in Component 4, Component 5 provides a clear, side-by-side 
          comparison of your project&apos;s returns before and after leverage. This is the single most important 
          page for equity investors — it answers the question: <span className="text-white font-medium">&quot;What 
          return does my equity capital generate after paying back the bank?&quot;</span>
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Key Metrics at a Glance</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Unlevered IRR</p>
              <p className="text-2xl font-bold text-slate-300">4.63%</p>
              <p className="text-xs text-slate-500">Before financing (Component 3)</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
              <p className="text-sm text-emerald-400">Levered IRR</p>
              <p className="text-2xl font-bold text-emerald-400">23.95%</p>
              <p className="text-xs text-slate-500">After financing (Component 4)</p>
            </div>
            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Equity Multiple</p>
              <p className="text-2xl font-bold text-emerald-400">1.36x</p>
              <p className="text-xs text-slate-500">Total returns ÷ Total invested</p>
            </div>
            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Payback</p>
              <p className="text-2xl font-bold text-emerald-400">M35</p>
              <p className="text-xs text-slate-500">Month of full recovery</p>
            </div>
          </div>
        </div>
      </section>

      {/* Leverage Effect */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">The Power of Leverage</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          The most striking feature of Component 5 is the dramatic difference between the Unlevered IRR 
          <span className="text-slate-500"> (4.63%)</span> and the Levered IRR 
          <span className="text-emerald-400 font-medium"> (23.95%)</span>. This is the <strong className="text-white">leverage effect</strong> — 
          one of the most powerful concepts in real estate finance.
        </p>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-6">
          <h3 className="text-lg font-semibold text-emerald-400 mb-3">Why is Levered IRR So Much Higher?</h3>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            When the project earns a return <strong className="text-white">higher than the cost of debt</strong>, 
            every dollar borrowed amplifies the equity return. Here&apos;s the math in simple terms:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-950 p-4">
              <h4 className="text-white font-medium mb-2 text-sm">Without Leverage (Component 3)</h4>
              <p className="text-xs text-slate-400 mb-2">
                You invest the full AED 157M development cost with your own cash.
              </p>
              <p className="text-xs text-slate-400">
                Project profit: AED 6.8M<br/>
                Return: 6.8M ÷ 157M = <strong className="text-slate-300">4.3% (unlevered)</strong>
              </p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
              <h4 className="text-emerald-400 font-medium mb-2 text-sm">With Leverage (Component 4)</h4>
              <p className="text-xs text-slate-400 mb-2">
                You invest only AED 63M equity; the bank funds AED 94M at 6% interest.
              </p>
              <p className="text-xs text-slate-400">
                Project profit: AED 6.8M<br/>
                Minus interest: ~AED 3M<br/>
                Net to equity: ~AED 21M (with timing benefits)<br/>
                Return: 21M ÷ 63M = <strong className="text-emerald-400">23.95% (levered)</strong>
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded bg-slate-950 border border-slate-800">
            <p className="text-xs text-slate-500">
              <strong className="text-white">The Leverage Premium:</strong> You borrowed at 6% but earned ~15% 
              on the total project. The bank took its 6%, and you kept the excess — on <em>their</em> money. 
              This &quot;positive spread&quot; is what drives the 5x improvement in IRR.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
          <h4 className="text-amber-300 font-medium mb-2">⚠️ Leverage is a Double-Edged Sword</h4>
          <p className="text-sm text-slate-400 mb-2">
            Leverage amplifies returns in <strong className="text-white">both</strong> directions:
          </p>
          <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
            <li><strong className="text-emerald-400">Upside:</strong> If project returns &gt; debt cost → levered IRR &gt; unlevered IRR (positive leverage)</li>
            <li><strong className="text-red-400">Downside:</strong> If project returns &lt; debt cost → levered IRR &lt; unlevered IRR (negative leverage)</li>
            <li><strong className="text-amber-400">Risk:</strong> Higher leverage = higher debt service obligations = greater risk of default if sales underperform</li>
          </ul>
          <p className="text-sm text-slate-400 mt-3">
            Use the Scenario Analysis page to test what happens if sales prices fall or construction costs rise. 
            Highly leveraged projects can see their Equity IRR collapse to negative in downside scenarios.
          </p>
        </div>
      </section>

      {/* Metrics Explained */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Key Metrics Explained</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          Component 5 displays four critical metrics, two from the unlevered analysis and two from the levered analysis:
        </p>

        <div className="space-y-6">
          {/* Unlevered IRR */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold text-slate-300 mb-3">Unlevered IRR (4.63%)</h3>
            <p className="text-slate-400 text-sm mb-3">
              The Project IRR from Component 3 — the annualized return on the project&apos;s cash flows <em>before</em> 
              any debt or equity financing is applied. This is the &quot;raw&quot; project return.
            </p>
            <p className="text-slate-400 text-sm">
              <strong className="text-white">Source:</strong> Component 3&apos;s Project IRR calculation on the pre-financing 
              cash flows from Components 1 and 2.
            </p>
          </div>

          {/* Levered IRR */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">Levered IRR (23.95%)</h3>
            <p className="text-slate-300 text-sm mb-3">
              The Equity IRR after financing — the annualized return on the equity investor&apos;s cash flows 
              <em> after</em> debt service. This is the metric that matters most to equity investors.
            </p>
            <p className="text-slate-300 text-sm mb-3">
              <strong className="text-white">Source:</strong> Component 4&apos;s financing engine, using the gap-fill 
              mechanism to determine equity injections and the waterfall structure to determine equity distributions.
            </p>
            <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm">
              <div className="text-emerald-300 mb-2">Levered IRR = IRR(Equity Cash Flow Series)</div>
              <div className="text-slate-500 text-xs mt-2">Where the equity cash flow series includes:</div>
              <div className="text-slate-400 text-xs">• Negative cash flows = equity injections (gap-fill from Component 4)</div>
              <div className="text-slate-400 text-xs">• Positive cash flows = residual distributions after debt service (waterfall from Component 4)</div>
              <div className="text-slate-400 text-xs">• Final month = net exit proceeds (total sales minus loan payoff)</div>
            </div>
          </div>

          {/* Equity Multiple */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">Equity Multiple (1.36x)</h3>
            <p className="text-slate-400 text-sm mb-3">
              The Money-on-Money (MoM) multiple — total cash returned to equity investors divided by total 
              equity invested. An equity multiple of 1.36x means for every AED 1.00 invested, the project 
              returns AED 1.36 (a 36% total profit).
            </p>
            <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm">
              <div className="text-emerald-300">Equity Multiple = Total Distributions ÷ Total Equity Invested</div>
            </div>
          </div>

          {/* Payback */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">Payback Month (M35)</h3>
            <p className="text-slate-400 text-sm mb-3">
              The month in which cumulative equity distributions equal or exceed cumulative equity invested. 
              This is the &quot;break-even&quot; point for the equity investor. Payback at M35 means the investor 
              recovers their full investment one month before the project ends (M36).
            </p>
            <p className="text-slate-400 text-sm">
              For sale developments, payback typically occurs in the final months when the bulk of sales 
              collections have been received and the debt has been repaid.
            </p>
          </div>
        </div>
      </section>

      {/* Visual Charts */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Visual Charts</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          Component 5 displays two charts to help visualize the project&apos;s cash flow dynamics:
        </p>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold text-white mb-3">Net Cash Flow (Monthly Timeline)</h3>
            <p className="text-slate-400 text-sm mb-4">
              A bar chart showing the net cash flow for each month after financing. The chart visualizes 
              the three phases of the project:
            </p>
            <ul className="text-sm text-slate-400 space-y-2 ml-4 list-disc">
              <li><strong className="text-red-400">Red bars (negative):</strong> Early construction when land is paid and construction begins but sales are minimal.</li>
              <li><strong className="text-blue-400">Blue/neutral bars:</strong> Mid-construction when sales collections start offsetting costs.</li>
              <li><strong className="text-emerald-400">Green bars (positive):</strong> Late construction and post-completion when sales revenue exceeds all costs.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold text-white mb-3">Cumulative Cash Flow & Payback</h3>
            <p className="text-slate-400 text-sm mb-4">
              A line chart showing the cumulative equity position over time. The line starts negative 
              (initial equity injections), dips to the peak funding gap, then rises as distributions 
              are received. The amber dot marks the payback month.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500 mt-1"></div>
                <span className="text-slate-400"><strong className="text-white">Amber Dot:</strong> Payback month where cumulative equity turns positive (M35 in the example).</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-0.5 w-4 bg-slate-600 mt-2"></div>
                <span className="text-slate-400"><strong className="text-white">Zero Line:</strong> The break-even threshold. Crossing this line means the investor has fully recovered their capital.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Relationship to Component 4 */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Relationship to Component 4</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Component 5 is entirely dependent on Component 4&apos;s financing engine. The two key mechanisms 
          that drive the Levered IRR calculation are:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <h4 className="text-emerald-400 font-medium mb-2">Gap-Fill Mechanism</h4>
            <p className="text-sm text-slate-400">
              Determines <strong className="text-white">when and how much</strong> cash equity is injected. 
              By deploying equity only when needed (not upfront), the gap-fill mechanism maximizes the Equity 
              IRR by shortening the equity deployment period.
            </p>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
            <h4 className="text-blue-400 font-medium mb-2">Waterfall Structure</h4>
            <p className="text-sm text-slate-400">
              Determines <strong className="text-white">who gets paid first</strong>. Debt service → Preference 
              shares → Common equity. Only the residual cash flow to common equity is used in the IRR calculation.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h4 className="text-white font-medium mb-2">Key Dependencies</h4>
          <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
            <li><strong className="text-white">Debt Structure:</strong> LTC/LTV ratios, interest rate, IDC treatment all affect the equity cash flow series.</li>
            <li><strong className="text-white">Land as Equity:</strong> Enabling this in Component 4 increases total equity invested (lowering the multiple) but reduces cash injections (improving cash-on-cash return).</li>
            <li><strong className="text-white">Preference Shares:</strong> If enabled, preference returns are paid before common equity distributions, reducing the common equity IRR.</li>
            <li><strong className="text-white">Escrow Rules:</strong> Jurisdiction-specific withdrawal and retention rules affect the timing of cash inflows, impacting IRR.</li>
            <li><strong className="text-white">Sales Recycling:</strong> When enabled, surplus escrow receipts reduce debt earlier, lowering interest costs and improving Equity IRR.</li>
          </ul>
        </div>
      </section>

      {/* Comparison: Sale vs Operational */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Sale Stream vs. Operational Stream</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          The Sale Stream&apos;s Component 5 differs from the Operational Stream&apos;s Component 5 in several important ways:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 text-slate-400 font-medium">Aspect</th>
                <th className="text-left py-2 text-slate-400 font-medium">Sale Stream</th>
                <th className="text-left py-2 text-slate-400 font-medium">Operational Stream</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-800">
                <td className="py-3 text-white font-medium">Interface</td>
                <td className="py-3">Single-page, 4 key metrics</td>
                <td className="py-3">4 tabs (Summary, Multiple, Payback, Waterfall)</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-3 text-white font-medium">Timeline</td>
                <td className="py-3">~36 months (construction + post-completion)</td>
                <td className="py-3">13+ years (construction + 10-year hold)</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-3 text-white font-medium">Equity Multiple</td>
                <td className="py-3">Typically 1.1x - 1.5x (shorter timeline)</td>
                <td className="py-3">Typically 2x - 5x (longer hold period)</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-3 text-white font-medium">Payback Timing</td>
                <td className="py-3">Near end of project (M30-M36)</td>
                <td className="py-3">Mid-to-late hold period (Y8-Y12)</td>
              </tr>
              <tr>
                <td className="py-3 text-white font-medium">Capital Recycling</td>
                <td className="py-3">Fast (3 years) — ideal for active developers</td>
                <td className="py-3">Slow (10+ years) — ideal for long-term investors</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Interpretation */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Interpreting the Results</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          How to evaluate your Levered IRR and decide if the project is worth pursuing:
        </p>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-medium mb-2">Levered IRR vs. Equity Hurdle Rate</h3>
            <p className="text-sm text-slate-400 mb-3">
              Compare your Levered IRR against your required return threshold (hurdle rate). For sale 
              developments, typical hurdle rates are:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Conservative Investors (Family Offices)</span>
                <span className="text-white font-mono">12-15%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Institutional Equity (PE Funds)</span>
                <span className="text-white font-mono">18-22%</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Opportunistic Developers</span>
                <span className="text-white font-mono">20-25%+</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-medium mb-2">The Leverage Spread</h3>
            <p className="text-sm text-slate-400 mb-3">
              The difference between Levered IRR and Unlevered IRR tells you how much value leverage is creating:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span className="text-slate-300"><strong className="text-white">Levered &gt; Unlevered:</strong> Positive leverage — debt is adding value. The larger the spread, the more effective the leverage.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">⚠</span>
                <span className="text-slate-300"><strong className="text-white">Levered ≈ Unlevered:</strong> Neutral leverage — debt cost equals project returns. Consider reducing debt or improving project economics.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold">✗</span>
                <span className="text-slate-300"><strong className="text-white">Levered &lt; Unlevered:</strong> Negative leverage — debt is destroying value. The cost of debt exceeds project returns. Reconsider the financing structure.</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-5">
            <h3 className="text-blue-300 font-medium mb-2">💡 Pro Tips</h3>
            <ul className="text-sm text-slate-400 space-y-2 list-disc ml-4">
              <li>Run Scenario Analysis to stress-test your Levered IRR against downside cases (lower sales price, higher construction costs, delayed sales).</li>
              <li>Optimize the gap-fill timing — deploy equity as late as possible to maximize IRR.</li>
              <li>Consider sales recycling to reduce debt earlier and lower interest costs.</li>
              <li>Use pre-launch sales (6 months before construction) to reduce the peak funding gap.</li>
              <li>If Levered IRR is close to Unlevered IRR, the project may be over-leveraged at too high an interest rate.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <a href="/docs/sale-stream/component-4-financing" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          ← Component 4: Financing
        </a>
        <a href="/docs/sale-stream/component-6-scenario-analysis" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          Component 6: Scenario Analysis →
        </a>
      </div>
    </div>
  );
}
