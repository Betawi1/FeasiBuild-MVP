export default function ProjectIRRDocs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Operational Stream</p>
        <h1 className="text-4xl font-bold text-white mb-4">Component 3: Project IRR & NPV Table</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          The NPV Table uses the Discount Factor Method to calculate the Project IRR (Internal Rate of Return).
          This table consolidates all cash flows from development, pre-operating, and operational phases into
          a single comprehensive view, enabling investors to assess project viability and compare against
          required return thresholds.
        </p>
      </div>

      {/* Overview */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          The Project IRR represents the unlevered return on the project, independent of financing structure.
          It answers the fundamental question: <span className="text-white font-medium">&quot;What return does this project generate
          on every dollar invested, regardless of how it&apos;s financed?&quot;</span>
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Key Output Metrics</h3>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Project IRR (%):</strong> The annualized return rate that makes NPV = 0</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Equity Multiple:</strong> Total cash returned ÷ Total equity invested</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Payback Period:</strong> Time (in months) until cumulative cash flow turns positive</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Terminal Value:</strong> Exit value at end of hold period</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Timeline Structure */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Project Timeline Structure</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          The NPV Table spans the entire project lifecycle, divided into three distinct phases:
        </p>

        <div className="space-y-4">
          {/* Phase 1 */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <h3 className="text-lg font-semibold text-white">Phase 1: Development (M0–M36)</h3>
            </div>
            <p className="text-slate-400 text-sm mb-3">
              The construction period where all capital expenditure occurs. Duration is user-defined in Component 1
              (typically 24–48 months depending on project scale).
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>Land acquisition costs (M0)</li>
              <li>Construction costs (phased via S-Curve)</li>
              <li>Soft costs, FF&E, and POWC</li>
              <li>No operating income during this phase</li>
            </ul>
          </div>

          {/* Phase 2 */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
              <h3 className="text-lg font-semibold text-white">Phase 2: Pre-Operating (M37–M42)</h3>
              <span className="ml-auto text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded">FIXED ASSUMPTION</span>
            </div>
            <p className="text-slate-400 text-sm mb-3">
              <strong className="text-amber-300">Fixed 6-Month Buffer:</strong> FeasiBuild applies a mandatory 6-month pre-operating
              period between construction completion and revenue generation. This period is <strong className="text-white">not user-adjustable</strong> and
              represents industry-standard time required for:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>Staff recruitment and training</li>
              <li>Systems commissioning and testing</li>
              <li>Marketing and pre-opening activities</li>
              <li>Regulatory approvals and inspections</li>
              <li>Soft opening and operational readiness</li>
            </ul>
            <div className="mt-4 p-3 rounded bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-200">
                <strong>Why Fixed?</strong> Industry analysis shows that rushing to revenue without adequate pre-operating
                preparation leads to operational issues, poor guest experiences, and revenue shortfalls in the critical
                first year. The 6-month buffer ensures realistic projections.
              </p>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
              <h3 className="text-lg font-semibold text-white">Phase 3: Operations (M54–M162)</h3>
            </div>
            <p className="text-slate-400 text-sm mb-3">
              The operational period where the asset generates revenue. Cash flows are shown at <strong className="text-white">year-end months</strong> (M54, M66, M78... M162)
              representing 10 years of stabilized operations.
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>Net Income from P&L (Component 2)</li>
              <li>+ Depreciation (non-cash add-back)</li>
              <li>- Change in Working Capital</li>
              <li>= Net Cash Flow from Operating Activities</li>
              <li>Terminal Value at M162 (exit)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* NPV Table Structure */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">NPV Table Structure</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          The table is organized into three main sections, each capturing different types of cash flows:
        </p>

        <div className="space-y-6">
          {/* Operating Activities */}
          <div>
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">Cash Flows from Operating Activities</h3>
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-300">Net Income</span>
                  <span className="text-slate-500 text-xs">From Component 2 P&L</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-300">+ Depreciation</span>
                  <span className="text-slate-500 text-xs">Non-cash expense added back</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-300">- Change in Working Capital</span>
                  <span className="text-slate-500 text-xs">Accounts Receivable/Payable changes</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-emerald-500/10 rounded px-2">
                  <span className="text-emerald-300 font-medium">= Net Cash Flow from Operating Activities</span>
                  <span className="text-emerald-400 text-xs">Core operational cash generation</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Terminal Value</span>
                  <span className="text-slate-500 text-xs">Exit value at M162</span>
                </div>
              </div>
            </div>
          </div>

          {/* Development Activities */}
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-3">Cash Flows from Development Activities</h3>
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-300">Total Development Costs</span>
                  <span className="text-slate-500 text-xs">From Component 1 (land + construction + soft costs)</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-300">FFE Renovation</span>
                  <span className="text-slate-500 text-xs">Mid-life renovation (typically Year 6)</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-red-500/10 rounded px-2">
                  <span className="text-red-300 font-medium">= Net Cash Flow (Development)</span>
                  <span className="text-red-400 text-xs">Total capital deployment</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Rows */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Summary & Valuation Rows</h3>
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-white font-medium">Net Cash Flow</span>
                  <span className="text-slate-500 text-xs">Operating + Development cash flows combined</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-300">Discount Factor</span>
                  <span className="text-slate-500 text-xs">1 / (1 + IRR)^n</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-300">Discounted Cash Flow</span>
                  <span className="text-slate-500 text-xs">Net Cash Flow × Discount Factor</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-blue-500/10 rounded px-2">
                  <span className="text-blue-300 font-medium">Cumulative NPV</span>
                  <span className="text-blue-400 text-xs">Running total of discounted cash flows</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Terminal Value Formula */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Terminal Value Calculation</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          The Terminal Value represents the project&apos;s exit value at the end of the hold period (M162 / Year 13).
          This is typically the largest single cash flow in the model and significantly impacts the Project IRR.
        </p>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-6">
          <h3 className="text-lg font-semibold text-emerald-400 mb-4">Formula</h3>
          <div className="bg-slate-950 rounded-lg p-4 mb-4 font-mono text-sm">
            <div className="text-emerald-300 mb-2">Terminal Value = Stabilized NOI ÷ Exit Cap Rate</div>
            <div className="text-slate-500 text-xs mt-3">Where:</div>
            <div className="text-slate-400 text-xs mt-1">• Stabilized NOI = Net Operating Income from final operational year (Year 12)</div>
            <div className="text-slate-400 text-xs">• Exit Cap Rate = User-defined in Component 3 (default: 7%)</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">Example Calculation</h4>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Year 12 Stabilized NOI:</span>
                <span className="text-white font-mono">AED 75,668,320</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Exit Cap Rate:</span>
                <span className="text-white font-mono">7.0%</span>
              </div>
              <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between">
                <span className="text-emerald-400 font-medium">Terminal Value:</span>
                <span className="text-emerald-400 font-mono font-bold">AED 1,080,976,000</span>
              </div>
              <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-800">
                Calculation: 75,668,320 ÷ 0.07 = 1,080,976,000
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <h4 className="text-amber-300 font-medium mb-2">⚠️ Important Notes</h4>
            <ul className="text-sm text-slate-400 space-y-1 list-disc ml-4">
              <li>Terminal Value is calculated using <strong className="text-white">unlevered NOI</strong> (before debt service)</li>
              <li>Exit Cap Rate should reflect market conditions at expected exit date</li>
              <li>Higher cap rates = Lower terminal value (inverse relationship)</li>
              <li>Terminal Value typically represents 60-80% of total project value</li>
              <li>Sensitivity analysis on exit cap rate is critical for risk assessment</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Discount Factor Method */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Discount Factor Method</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          The Discount Factor Method converts future cash flows into present value terms, enabling comparison
          of cash flows occurring at different times.
        </p>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Formula</h3>
          <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm">
            <div className="text-blue-300 mb-2">Discount Factor = 1 / (1 + r)^n</div>
            <div className="text-slate-500 text-xs mt-3">Where:</div>
            <div className="text-slate-400 text-xs mt-1">• r = Project IRR (the rate that makes NPV = 0)</div>
            <div className="text-slate-400 text-xs">• n = Period number (month number from M0)</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">How It Works</h4>
            <ol className="text-sm text-slate-400 space-y-2 list-decimal ml-4">
              <li>The model iteratively tests different IRR rates</li>
              <li>For each rate, it calculates the Discount Factor for every month</li>
              <li>Each month&apos;s Net Cash Flow is multiplied by its Discount Factor</li>
              <li>All Discounted Cash Flows are summed to get NPV</li>
              <li>The IRR is the rate where NPV = 0</li>
            </ol>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-3">Example: Month 54 (Year 4 FYE)</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Net Cash Flow:</span>
                <span className="text-white font-mono">AED 48,071,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Project IRR:</span>
                <span className="text-white font-mono">12.25%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Monthly Rate:</span>
                <span className="text-white font-mono">12.25% ÷ 12 = 1.0208%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Discount Factor (M54):</span>
                <span className="text-white font-mono">1 / (1.010208)^54 = 0.6066</span>
              </div>
              <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between">
                <span className="text-blue-400 font-medium">Discounted Cash Flow:</span>
                <span className="text-blue-400 font-mono">48,071,000 × 0.6066 = 29,161,000</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Assumptions */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Key Assumptions & Inputs</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          The Project IRR calculation depends on several critical assumptions from previous components:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">From Component 1</h4>
            <ul className="text-sm text-slate-400 space-y-1 list-disc ml-4">
              <li>Construction period (months)</li>
              <li>Total Development Costs</li>
              <li>S-Curve phasing profile</li>
              <li>FF&E and renovation costs</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">From Component 2</h4>
            <ul className="text-sm text-slate-400 space-y-1 list-disc ml-4">
              <li>10-year operating P&L</li>
              <li>Net Income by year</li>
              <li>Depreciation schedule</li>
              <li>Working capital changes</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">From Component 3</h4>
            <ul className="text-sm text-slate-400 space-y-1 list-disc ml-4">
              <li>Exit Cap Rate (default: 7%)</li>
              <li>Hold period (years)</li>
              <li>Exit timing</li>
            </ul>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <h4 className="text-emerald-400 font-medium mb-2">Fixed Assumptions</h4>
            <ul className="text-sm text-slate-400 space-y-1 list-disc ml-4">
              <li className="text-amber-300">6-month pre-operating buffer</li>
              <li>Year-end operational cash flows</li>
              <li>Monthly discounting (not annual)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Interpretation */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Interpreting the Results</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          Understanding what the Project IRR tells you about your investment:
        </p>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-medium mb-2">Project IRR vs. Required Return</h3>
            <p className="text-sm text-slate-400 mb-3">
              Compare your Project IRR against your required return threshold (hurdle rate):
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span className="text-slate-300"><strong className="text-white">IRR &gt; Hurdle Rate:</strong> Project creates value and exceeds return requirements</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">⚠</span>
                <span className="text-slate-300"><strong className="text-white">IRR = Hurdle Rate:</strong> Project meets minimum requirements (marginal)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold">✗</span>
                <span className="text-slate-300"><strong className="text-white">IRR &lt; Hurdle Rate:</strong> Project destroys value; reconsider or restructure</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-medium mb-2">Typical IRR Benchmarks</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Core (Stabilized Assets)</span>
                <span className="text-white font-mono">8–12%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Value-Add (Repositioning)</span>
                <span className="text-white font-mono">12–18%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Opportunistic (Development)</span>
                <span className="text-white font-mono">18–25%+</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Ground-Up Development (UAE)</span>
                <span className="text-white font-mono">15–22%</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-5">
            <h3 className="text-blue-300 font-medium mb-2">💡 Pro Tips</h3>
            <ul className="text-sm text-slate-400 space-y-2 list-disc ml-4">
              <li>Always run sensitivity analysis on exit cap rate (±50 bps)</li>
              <li>Test construction cost overruns (±10-15%)</li>
              <li>Model revenue shortfalls (Year 1-3 occupancy ramp)</li>
              <li>Consider interest rate sensitivity if using debt</li>
              <li>Compare Project IRR vs. Equity IRR to understand leverage impact</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <a href="/docs/operational-stream/component-2-cash-inflows" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          ← Component 2: Cash Inflows
        </a>
        <a href="/docs/operational-stream/component-4-financing" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          Component 4: Financing →
        </a>
      </div>
    </div>
  );
}
