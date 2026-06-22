export default function SaleComponent3Docs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Sale Stream</p>
        <h1 className="text-4xl font-bold text-white mb-4">Component 3: Project IRR</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          Component 3 calculates the unlevered Project IRR based on the cash inflows (sales revenue) from
          Component 2 and cash outflows (development costs) from Component 1. This is a read-only component
          that consolidates your project&apos;s financial performance into key return metrics.
        </p>
        <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
          <strong>Key Difference from Operational Stream:</strong> The Sale Stream Project IRR covers only the
          construction period plus a 6-month post-completion sales collection period (typically 36 months total).
          There is no 10-year operational period or terminal value calculation — all returns come from unit sales.
        </div>
      </div>

      {/* Overview */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Component 3 is a single-step, read-only component that automatically calculates the Project IRR once
          you complete Components 1 and 2. It provides three key metrics and two visual charts to help you
          understand the project&apos;s financial performance and payback timing.
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Key Output Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Unlevered IRR (annual)</p>
              <p className="text-2xl font-bold text-emerald-400">4.63%</p>
              <p className="text-xs text-slate-500">Annualized return on project</p>
            </div>
            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Equity Multiple</p>
              <p className="text-2xl font-bold text-emerald-400">1.11x</p>
              <p className="text-xs text-slate-500">Total returns ÷ Total invested</p>
            </div>
            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Payback</p>
              <p className="text-2xl font-bold text-emerald-400">M36</p>
              <p className="text-xs text-slate-500">Month of full recovery</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Structure */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Project Timeline Structure</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          The Sale Stream Project IRR covers a shorter timeline than the Operational Stream. The project
          lifecycle is divided into two phases:
        </p>

        <div className="space-y-4">
          {/* Phase 1 */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <h3 className="text-lg font-semibold text-white">Phase 1: Construction (M0–M30)</h3>
            </div>
            <p className="text-slate-400 text-sm mb-3">
              The construction period where all capital expenditure occurs. Duration is user-defined in
              Component 1 (typically 24-36 months depending on project scale).
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>Land acquisition costs (M0)</li>
              <li>Construction costs (phased via S-Curve)</li>
              <li>Soft costs, POWC</li>
              <li>Sales revenue begins during construction (pre-sales and progress payments)</li>
            </ul>
          </div>

          {/* Phase 2 */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
              <h3 className="text-lg font-semibold text-white">Phase 2: Post-Completion (M31–M36)</h3>
              <span className="ml-auto text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded">FIXED 6-MONTH PERIOD</span>
            </div>
            <p className="text-slate-400 text-sm mb-3">
              <strong className="text-amber-300">Fixed 6-Month Buffer:</strong> After construction completion,
              FeasiBuild automatically extends the timeline by 6 months to capture final sales collections,
              handover payments, and mortgage disbursements from banks.
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>No construction outflows during this period</li>
              <li>Sales revenue continues (final payments, handover collections)</li>
              <li>Cash flow typically turns positive as collections exceed zero outflows</li>
              <li>Helps close the funding gap before financing costs are applied</li>
            </ul>
            <div className="mt-4 p-3 rounded bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-200">
                <strong>Why Fixed?</strong> In real estate development, not all buyers pay immediately at
                construction completion. Mortgage approvals, handover paperwork, and final payment collections
                typically take 3-6 months. This buffer ensures realistic cash flow modeling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Explained */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Key Metrics Explained</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          Component 3 displays three critical return metrics that help you assess project viability:
        </p>

        <div className="space-y-6">
          {/* Unlevered IRR */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">Unlevered IRR (Annual)</h3>
            <p className="text-slate-300 text-sm mb-3">
              The Internal Rate of Return on the project&apos;s unlevered cash flows (before debt service).
              This represents the pure project return independent of financing structure.
            </p>
            <div className="bg-slate-950 rounded-lg p-4 mb-3 font-mono text-sm">
              <div className="text-emerald-300 mb-2">Formula: Σ [NCFₘ / (1+IRR)^(m/12)] = 0</div>
              <div className="text-slate-500 text-xs mt-3">Where:</div>
              <div className="text-slate-400 text-xs mt-1">• NCFₘ = Net Cash Flow in month m</div>
              <div className="text-slate-400 text-xs">• m = Month number (M0 to M36)</div>
              <div className="text-slate-400 text-xs">• IRR = The discount rate that makes NPV = 0</div>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">
                <strong className="text-white">Example:</strong> For a project with 4.63% IRR, the net present
                value of all cash flows (construction costs + sales revenue) discounted at 4.63% annually equals zero.
                This means the project generates a 4.63% annualized return on invested capital.
              </p>
            </div>
          </div>

          {/* Equity Multiple */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">Equity Multiple</h3>
            <p className="text-slate-300 text-sm mb-3">
              Also known as the &quot;Money-on-Money&quot; (MoM) multiple. This is the ratio of total cash returned
              to total cash invested.
            </p>
            <div className="bg-slate-950 rounded-lg p-4 mb-3 font-mono text-sm">
              <div className="text-emerald-300 mb-2">Equity Multiple = Total Returns ÷ Total Invested</div>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">
                <strong className="text-white">Example:</strong> An equity multiple of 1.11x means that for every
                AED 1.00 invested, the project returns AED 1.11. This represents a 11% total return over the
                project lifecycle (not annualized).
              </p>
            </div>
          </div>

          {/* Payback */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">Payback (Month)</h3>
            <p className="text-slate-300 text-sm mb-3">
              The month in which cumulative cash flow turns positive (≥ 0). This is the &quot;break-even&quot; point
              where the project has recovered all invested capital.
            </p>
            <div className="bg-slate-950 rounded-lg p-4 mb-3 font-mono text-sm">
              <div className="text-emerald-300 mb-2">Payback = First month where Cumulative NCF ≥ 0</div>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">
                <strong className="text-white">Example:</strong> Payback at M36 means the project recovers all
                invested capital by the end of the 36-month timeline (construction + 6-month post-completion).
                For sale developments, payback typically occurs at or near the end of the project when final
                sales collections are received.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Charts */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Visual Charts</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          Component 3 provides two visual charts to help you understand the project&apos;s cash flow dynamics
          and payback timing:
        </p>

        <div className="space-y-6">
          {/* Net Cash Flow Chart */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold text-white mb-3">Net Cash Flow (Monthly Timeline)</h3>
            <p className="text-slate-400 text-sm mb-4">
              This bar chart shows the net cash flow for each month, with negative values (outflows) in red
              and positive values (inflows) in green.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-4 w-4 rounded bg-red-500 mt-1"></div>
                <div>
                  <p className="text-sm text-white font-medium">Red Bars (Negative)</p>
                  <p className="text-xs text-slate-400">
                    Months where cash outflows (construction costs, land, soft costs) exceed cash inflows (sales).
                    Typically occurs in early months (M0-M10) when land is paid and construction begins but sales
                    are minimal.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-4 w-4 rounded bg-blue-500 mt-1"></div>
                <div>
                  <p className="text-sm text-white font-medium">Blue Bars (Near Zero)</p>
                  <p className="text-xs text-slate-400">
                    Months where inflows and outflows are roughly balanced. Typically occurs in mid-construction
                    when sales collections start to offset construction costs.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-4 w-4 rounded bg-emerald-500 mt-1"></div>
                <div>
                  <p className="text-sm text-white font-medium">Green Bars (Positive)</p>
                  <p className="text-xs text-slate-400">
                    Months where sales revenue exceeds costs. Typically occurs in late construction and
                    post-completion (M25-M36) when most units are sold and collections accelerate.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cumulative Cash Flow Chart */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold text-white mb-3">Cumulative Cash Flow & Payback (Monthly Timeline)</h3>
            <p className="text-slate-400 text-sm mb-4">
              This line chart shows the cumulative sum of monthly cash flows. The line starts negative
              (representing initial investment) and trends upward as sales revenue is collected. The point
              where the line crosses zero is the payback month.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-4 w-4 rounded-full bg-amber-500 mt-1"></div>
                <div>
                  <p className="text-sm text-white font-medium">Payback Marker</p>
                  <p className="text-xs text-slate-400">
                    The amber dot and dashed line indicate the exact month where cumulative cash flow turns
                    positive. In the example, payback occurs at M36 (end of project).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-0.5 w-4 bg-slate-600 mt-2"></div>
                <div>
                  <p className="text-sm text-white font-medium">Zero Line</p>
                  <p className="text-xs text-slate-400">
                    The horizontal dashed line at zero represents the break-even point. When the cumulative
                    cash flow line crosses this, the project has recovered all invested capital.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NPV Table Methodology */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">NPV Table Methodology</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          Behind the scenes, FeasiBuild uses the Discount Factor Method to calculate the Project IRR.
          The NPV Table shows the detailed monthly breakdown:
        </p>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-5 space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">Net Cash Flow Row</h4>
            <p className="text-sm text-slate-400">
              Shows the net cash flow for each month (inflows minus outflows). Negative values are shown
              in red, positive values in green.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Discount Factor Row</h4>
            <p className="text-sm text-slate-400">
              Calculated as: <code className="text-emerald-400">1 / (1 + monthly_IRR)^m</code> where
              monthly_IRR = annual_IRR / 12. This converts future cash flows to present value terms.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Discounted Cash Flow Row</h4>
            <p className="text-sm text-slate-400">
              Calculated as: <code className="text-emerald-400">Net Cash Flow × Discount Factor</code>.
              This shows the present value of each month&apos;s cash flow.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Cumulative NPV Row</h4>
            <p className="text-sm text-slate-400">
              Running total of discounted cash flows. The IRR is solved so that cumulative NPV approaches
              zero at the final month (M36).
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
          <strong>💡 IRR Calculation:</strong> The system uses an iterative solver (Newton-Raphson method)
          to find the discount rate that makes the final cumulative NPV equal to zero. This is the Project IRR.
        </div>
      </section>

      {/* Interpretation */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Interpreting the Results</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          Understanding what the Project IRR tells you about your sale development:
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
            <h3 className="text-white font-medium mb-2">Typical IRR Benchmarks for Sale Developments</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Residential (Mid-Market)</span>
                <span className="text-white font-mono">8-15%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Residential (Luxury/Prime)</span>
                <span className="text-white font-mono">12-20%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Commercial (Office/Retail)</span>
                <span className="text-white font-mono">10-18%</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Mixed-Use Development</span>
                <span className="text-white font-mono">12-22%</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
            <h3 className="text-amber-300 font-medium mb-2">Sale Stream vs. Operational Stream IRR</h3>
            <p className="text-sm text-slate-400 mb-2">
              Sale Stream IRRs are typically <strong className="text-white">lower</strong> than Operational Stream IRRs
              for comparable projects because:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li>Shorter timeline (36 months vs. 13+ years) means less time for value appreciation</li>
              <li>No terminal value capture (all returns come from unit sales, not asset appreciation)</li>
              <li>Higher risk profile (construction risk, sales risk, market timing risk)</li>
              <li>Lower equity multiple (1.11x vs. 4-5x for operational assets)</li>
            </ul>
            <p className="text-sm text-slate-400 mt-3">
              However, Sale Stream projects offer <strong className="text-white">faster capital recycling</strong> —
              you can complete and exit the project in 3 years vs. holding for 10+ years.
            </p>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Tips & Best Practices</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Focus on Sales Velocity</h4>
            <p className="text-sm text-slate-400">
              The #1 driver of Project IRR in sale developments is sales velocity. Faster sales = earlier
              cash inflows = higher IRR. Use conservative uptake curves and validate against comparable
              project absorption rates.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Pre-Launch Sales Boost IRR</h4>
            <p className="text-sm text-slate-400">
              Starting sales 6 months before construction and achieving 10-20% pre-launch sales can
              significantly improve IRR by bringing cash inflows forward and reducing the funding gap.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Minimize the Funding Gap</h4>
            <p className="text-sm text-slate-400">
              The funding gap (peak negative cumulative cash flow) determines your financing needs.
              A smaller gap means lower debt costs and higher equity returns. Optimize payment plans
              and sales timing to reduce the gap.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Sensitivity Analysis is Critical</h4>
            <p className="text-sm text-slate-400">
              After reviewing Component 3, proceed to Scenario Analysis to test how changes in sales price,
              uptake speed, and construction costs affect your IRR. Sale developments are highly sensitive
              to market timing.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <a href="/docs/sale-stream/component-2-sales-revenue" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          ← Component 2: Sales Revenue
        </a>
        <a href="/docs/sale-stream/component-4-financing" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          Component 4: Financing →
        </a>
      </div>
    </div>
  );
}
