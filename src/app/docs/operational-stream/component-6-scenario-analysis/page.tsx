export default function Component6Docs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Operational Stream</p>
        <h1 className="text-4xl font-bold text-white mb-4">Component 6: Scenario Analysis</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          Component 6 is FeasiBuild&apos;s stress-testing engine. It allows you to apply &quot;shocks&quot; to key financial drivers
          and instantly see how those changes cascade through your entire model — affecting construction costs,
          operating cash flows, debt service, and ultimately your Project IRR and Equity IRR.
        </p>
        <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
          <strong>Key Concept:</strong> Scenario Analysis doesn&apos;t create a new model — it applies multipliers to your
          existing base case assumptions and recalculates the entire financial engine in real-time.
        </div>
      </div>

      {/* Overview */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          The Scenario Analysis page is divided into four main sections:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">1. Base Case Metric Sources</h4>
            <p className="text-sm text-slate-400">
              Shows your current base case metrics (Unlevered Project IRR, Levered Equity IRR, Peak Equity, Min DSCR)
              sourced from Components 1-5. This is your &quot;starting point&quot; before any shocks are applied.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">2. Scenario Presets</h4>
            <p className="text-sm text-slate-400">
              One-click presets for Base Case, Downside, and Upside scenarios. Downside/Upside presets apply
              pre-configured shocks based on your asset type (e.g., Hotel downside = lower ADR + higher construction costs).
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">3. Adjust Shock Values</h4>
            <p className="text-sm text-slate-400">
              Interactive sliders for each shock factor. Each slider shows the current shock value, the impact on
              Unlevered IRR, and the impact on Levered IRR. Shocks are categorized into Common Factors and Asset-Specific Factors.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">4. Scenario Comparison &amp; Tornado Chart</h4>
            <p className="text-sm text-slate-400">
              A comparison table showing Base vs Current vs Downside vs Upside for key metrics, plus a Tornado Chart
              showing IRR sensitivity ranked by driver impact (most impactful at the top).
            </p>
          </div>
        </div>
      </section>

      {/* Base Case Metrics */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Base Case Metric Sources</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Before applying any shocks, FeasiBuild displays your base case metrics. These are sourced directly from
          the calculations in Components 1-5:
        </p>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
          <div>
            <h4 className="text-white font-medium">Unlevered Project IRR (9.80%)</h4>
            <p className="text-sm text-slate-400">
              Sourced from <strong className="text-emerald-400">Component 3 (Project IRR)</strong>. This is the IRR
              calculated on the project&apos;s unlevered cash flows (before debt service). It represents the pure project
              return independent of financing structure.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium">Levered Equity IRR (9.40%)</h4>
            <p className="text-sm text-slate-400">
              Sourced from <strong className="text-emerald-400">Component 5 (Equity Returns)</strong>. This is the IRR
              calculated on the equity investor&apos;s cash flows (after debt service). It reflects the actual return to
              the equity investor given the financing structure from Component 4.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium">Peak Equity Required (277.2M)</h4>
            <p className="text-sm text-slate-400">
              Sourced from <strong className="text-emerald-400">Component 4 (Financing)</strong>. This is the maximum
              cumulative equity injection required during the construction phase, calculated using the dynamic gap-fill
              mechanism.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium">Min DSCR (0.59x)</h4>
            <p className="text-sm text-slate-400">
              Sourced from <strong className="text-emerald-400">Component 4 (Financing)</strong>. This is the minimum
              Debt Service Coverage Ratio across all operating years. A DSCR below 1.0x indicates the project cannot
              cover debt service from operating cash flows in that year.
            </p>
          </div>
        </div>
      </section>

      {/* Scenario Presets */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Scenario Presets</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          FeasiBuild provides three one-click scenario presets:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <h4 className="text-emerald-400 font-medium mb-2">Base Case</h4>
            <p className="text-sm text-slate-400">
              All shocks reset to 0%. This is your current model with no modifications.
            </p>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <h4 className="text-red-400 font-medium mb-2">Downside</h4>
            <p className="text-sm text-slate-400">
              Applies pre-configured negative shocks based on your asset type. For example, a Hotel downside scenario
              might apply: Construction Cost +15%, ADR -10%, Occupancy -8pp, Exit Cap Rate +50bps.
            </p>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
            <h4 className="text-blue-400 font-medium mb-2">Upside</h4>
            <p className="text-sm text-slate-400">
              Applies pre-configured positive shocks. For example, a Hotel upside scenario might apply:
              Construction Cost -5%, ADR +12%, Occupancy +5pp, Exit Cap Rate -25bps.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <strong>Note:</strong> Downside/Upside presets are asset-specific. A Residential project will show different
          preset shocks than a Hotel project (e.g., Monthly Rent psf instead of ADR, Absorption Speed instead of Occupancy).
        </div>
      </section>

      {/* Common Shock Factors */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Common Shock Factors</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          These shock factors apply to <strong className="text-white">all asset types</strong> and represent the most
          universal drivers of project risk:
        </p>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Construction Cost (-20% to +30%)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Applies a percentage multiplier to all construction costs from Component 1 (including land, hard costs,
              soft costs, FF&amp;E, and POWC).
            </p>
            <div className="text-xs text-slate-500">
              <strong>Impact Chain:</strong> Higher construction costs → Higher Total Development Cost (TDC) → Higher
              debt required → Higher interest expense → Lower Equity IRR. Also increases peak equity requirement.
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Operating Expenses (-10% to +25%)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Applies a percentage multiplier to all operating expenses from Component 2 (departmental costs,
              undistributed expenses, management fees, etc.).
            </p>
            <div className="text-xs text-slate-500">
              <strong>Impact Chain:</strong> Higher operating expenses → Lower Net Operating Income (NOI) → Lower
              cash flow available for debt service → Lower DSCR → Lower Equity IRR.
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Exit Cap Rate (-50bps to +150bps)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Applies a basis point adjustment to the exit capitalization rate from Component 3. A higher cap rate
              means a lower exit value (inverse relationship).
            </p>
            <div className="text-xs text-slate-500">
              <strong>Impact Chain:</strong> Higher exit cap rate → Lower terminal value → Lower exit proceeds →
              Lower Equity IRR. This is often the most impactful shock for hold assets.
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Interest Rate (-100bps to +300bps)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Applies a basis point adjustment to the interest rate from Component 4. Affects both construction
              interest (IDC) and operating interest expense.
            </p>
            <div className="text-xs text-slate-500">
              <strong>Impact Chain:</strong> Higher interest rate → Higher debt service → Lower cash flow to equity →
              Lower Equity IRR. Also increases total debt if IDC is capitalized.
            </div>
          </div>
        </div>
      </section>

      {/* Asset-Specific Shock Factors */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Asset-Specific Shock Factors</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          These shock factors change based on the asset type selected in Component 1. Each asset type has unique
          revenue drivers that are critical to its financial performance.
        </p>

        <div className="space-y-6">
          {/* Hotel */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <h4 className="text-emerald-400 font-medium mb-3">🏨 Hotel / Hospitality</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <h5 className="text-white text-sm font-medium">ADR (Average Daily Rate) (±15%)</h5>
                <p className="text-xs text-slate-400">
                  Applies a percentage multiplier to the ADR assumptions from Component 2. ADR is the primary revenue
                  driver for hotels.
                </p>
              </div>
              <div>
                <h5 className="text-white text-sm font-medium">Occupancy Rate (±10pp)</h5>
                <p className="text-xs text-slate-400">
                  Applies a percentage point adjustment to the occupancy rate from Component 2. Note: This is in
                  percentage points (pp), not percentage (%). A +5pp shock means occupancy increases from 70% to 75%.
                </p>
              </div>
              <div>
                <h5 className="text-white text-sm font-medium">F&amp;B Revenue (±20%)</h5>
                <p className="text-xs text-slate-400">
                  Applies a percentage multiplier to Food &amp; Beverage revenue from Component 2. F&amp;B is typically 20-30%
                  of total hotel revenue.
                </p>
              </div>
              <div>
                <h5 className="text-white text-sm font-medium">Stabilization Period (±6 months)</h5>
                <p className="text-xs text-slate-400">
                  Adjusts the number of months required to reach stabilized occupancy. Longer stabilization means
                  more months of ramp-up with lower occupancy.
                </p>
              </div>
            </div>
          </div>

          {/* Residential */}
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
            <h4 className="text-blue-400 font-medium mb-3">🏠 Residential (BTR / Multi-Family)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <h5 className="text-white text-sm font-medium">Monthly Rent psf (±15%)</h5>
                <p className="text-xs text-slate-400">
                  Applies a percentage multiplier to the monthly rent per square foot from Component 2. This is the
                  primary revenue driver for residential projects.
                </p>
              </div>
              <div>
                <h5 className="text-white text-sm font-medium">Occupancy Rate (±10pp)</h5>
                <p className="text-xs text-slate-400">
                  Applies a percentage point adjustment to the stabilized occupancy rate. Similar to hotel occupancy
                  but typically higher (90-95% for residential vs 65-75% for hotels).
                </p>
              </div>
              <div>
                <h5 className="text-white text-sm font-medium">Rent Escalation Rate (±50%)</h5>
                <p className="text-xs text-slate-400">
                  Applies a percentage multiplier to the annual rent escalation rate. A +50% shock on a 3% escalation
                  rate means escalation increases to 4.5%.
                </p>
              </div>
              <div>
                <h5 className="text-white text-sm font-medium">Lease-up / Absorption Speed (±50%)</h5>
                <p className="text-xs text-slate-400">
                  Adjusts the speed at which units are leased. Faster absorption means reaching stabilized occupancy
                  sooner, improving early-year cash flows.
                </p>
              </div>
            </div>
          </div>

          {/* Retail */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <h4 className="text-amber-400 font-medium mb-3">🛍️ Shopping Mall / Retail</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <h5 className="text-white text-sm font-medium">Base Rent psf (±15%)</h5>
                <p className="text-xs text-slate-400">
                  Applies a percentage multiplier to the base rent per square foot from Component 2.
                </p>
              </div>
              <div>
                <h5 className="text-white text-sm font-medium">Percentage Rent (±20%)</h5>
                <p className="text-xs text-slate-400">
                  Applies a percentage multiplier to the percentage rent (overage rent) from Component 2.
                </p>
              </div>
              <div>
                <h5 className="text-white text-sm font-medium">Tenant Sales (±15%)</h5>
                <p className="text-xs text-slate-400">
                  Applies a percentage multiplier to tenant sales assumptions, which affects percentage rent calculations.
                </p>
              </div>
              <div>
                <h5 className="text-white text-sm font-medium">Lease-up Period (±6 months)</h5>
                <p className="text-xs text-slate-400">
                  Adjusts the time required to reach stabilized occupancy (typically 12-24 months for retail).
                </p>
              </div>
            </div>
          </div>

          {/* Office */}
          <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
            <h4 className="text-purple-400 font-medium mb-3">🏢 Office (Stabilized)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <h5 className="text-white text-sm font-medium">Base Rent psf (±15%)</h5>
                <p className="text-xs text-slate-400">
                  Applies a percentage multiplier to the base rent per square foot from Component 2.
                </p>
              </div>
              <div>
                <h5 className="text-white text-sm font-medium">Occupancy Rate (±10pp)</h5>
                <p className="text-xs text-slate-400">
                  Applies a percentage point adjustment to the stabilized occupancy rate.
                </p>
              </div>
              <div>
                <h5 className="text-white text-sm font-medium">Rent Escalation (±50%)</h5>
                <p className="text-xs text-slate-400">
                  Applies a percentage multiplier to the annual rent escalation rate.
                </p>
              </div>
              <div>
                <h5 className="text-white text-sm font-medium">Lease-up Period (±6 months)</h5>
                <p className="text-xs text-slate-400">
                  Adjusts the time required to reach stabilized occupancy (typically 12-36 months for office).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Shock Drivers */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Custom Shock Drivers</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          FeasiBuild allows you to define up to 3 custom shock drivers for scenario-specific analysis. This is useful
          for modeling unique risks or opportunities not covered by the standard factors.
        </p>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
          <div>
            <h4 className="text-white font-medium">Define Custom Shock Driver Modal</h4>
            <p className="text-sm text-slate-400 mb-3">
              Click &quot;+ Add Custom Factor&quot; to open the modal. You can:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li><strong className="text-white">Choose a Template:</strong> Pre-configured drivers like &quot;Property Tax Increase&quot;, &quot;Management Fee Increase&quot;, &quot;Stabilization Period&quot;, &quot;F&amp;B Revenue Decline&quot;, &quot;Soft Costs Overrun&quot;, &quot;Insurance Cost Increase&quot;</li>
              <li><strong className="text-white">Driver Name:</strong> Custom name (e.g., &quot;Marketing Spend&quot;, &quot;Permit Delay&quot;)</li>
              <li><strong className="text-white">Base Value:</strong> The starting value (e.g., 0 for percentage shocks)</li>
              <li><strong className="text-white">Min/Max Shock:</strong> The range of the shock (e.g., -25% to +25%)</li>
              <li><strong className="text-white">Unit:</strong> Percentage (%), Basis Points (bps), or Absolute Value</li>
              <li><strong className="text-white">Impact Logic:</strong> Choose how the shock affects the model:
                <ul className="ml-4 mt-1 space-y-1">
                  <li>💚 Affects Revenue (multiply inflows)</li>
                  <li>❤️ Affects Costs (multiply outflows)</li>
                  <li>📅 Affects Timeline (shift cash flows)</li>
                  <li>⚙️ Custom formula (Advanced)</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Scenario Comparison Table */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Scenario Comparison Table</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          The Scenario Comparison table shows key metrics across four scenarios side-by-side:
        </p>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-slate-400 font-medium">Metric</th>
                  <th className="text-right py-2 text-slate-400 font-medium">Base</th>
                  <th className="text-right py-2 text-slate-400 font-medium">Current</th>
                  <th className="text-right py-2 text-slate-400 font-medium">Downside</th>
                  <th className="text-right py-2 text-slate-400 font-medium">Upside</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800">
                  <td className="py-2">Unlevered Project IRR</td>
                  <td className="text-right text-emerald-400">11.75%</td>
                  <td className="text-right">15.20%</td>
                  <td className="text-right text-red-400">10.57%</td>
                  <td className="text-right text-emerald-400">12.92%</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2">Unlevered Payback (months)</td>
                  <td className="text-right">42</td>
                  <td className="text-right">42</td>
                  <td className="text-right">44</td>
                  <td className="text-right">40</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2">Levered Equity IRR</td>
                  <td className="text-right text-emerald-400">12.18%</td>
                  <td className="text-right">14.03%</td>
                  <td className="text-right text-red-400">12.25%</td>
                  <td className="text-right text-emerald-400">13.00%</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2">Levered Payback (months)</td>
                  <td className="text-right">162</td>
                  <td className="text-right">162</td>
                  <td className="text-right">162</td>
                  <td className="text-right">162</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2">Peak Equity Required</td>
                  <td className="text-right">266.4M</td>
                  <td className="text-right">224.7M</td>
                  <td className="text-right">266.4M</td>
                  <td className="text-right">241.7M</td>
                </tr>
                <tr>
                  <td className="py-2">Min DSCR</td>
                  <td className="text-right">0.77x</td>
                  <td className="text-right">0.77x</td>
                  <td className="text-right">0.77x</td>
                  <td className="text-right">0.77x</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* IRR Sensitivity Tornado Chart */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">IRR Sensitivity Tornado Chart</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          The Tornado Chart ranks shock factors by their impact on Levered Equity IRR. The most impactful driver
          appears at the top, with the least impactful at the bottom. This helps you identify which assumptions
          matter most for your project&apos;s success.
        </p>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h4 className="text-white font-medium mb-3">How to Read the Tornado Chart</h4>
          <ul className="text-sm text-slate-400 space-y-2 ml-4 list-disc">
            <li>
              <strong className="text-white">Green Bar:</strong> Shows the range of Levered Equity IRR when the driver
              moves from its minimum shock to maximum shock (one at a time, holding all other factors constant).
            </li>
            <li>
              <strong className="text-white">Range Values:</strong> Shown to the right of each bar (e.g., &quot;14.03% – 16.23%&quot;).
              This is the IRR range when only that driver is shocked.
            </li>
            <li>
              <strong className="text-white">Ranking:</strong> Drivers are sorted by the width of their bar (widest = most impactful).
              In the example, ADR (±15%) has the widest bar, meaning it has the largest impact on IRR.
            </li>
            <li>
              <strong className="text-white">Axis:</strong> The x-axis shows the Levered Equity IRR range (e.g., &quot;10% to 26%&quot;).
              All bars are plotted on this common axis for comparison.
            </li>
          </ul>
        </div>
      </section>

      {/* Methodology: How Shocks Affect IRR */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Methodology: How FeasiBuild Calculates IRR Changes</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          When you apply a shock factor, FeasiBuild recalculates the entire financial model in real-time. Here&apos;s the
          step-by-step methodology:
        </p>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-3">Step 1: Apply Shock Multiplier to Base Assumption</h4>
            <p className="text-sm text-slate-400 mb-2">
              Each shock factor applies a multiplier or adjustment to the corresponding base case assumption from
              Components 1-5.
            </p>
            <div className="bg-slate-950 rounded p-3 font-mono text-xs text-emerald-300">
              <div className="text-slate-500">// Example: Construction Cost +10% shock</div>
              <div>adjustedConstructionCost = baseConstructionCost × (1 + 0.10)</div>
              <div className="mt-2 text-slate-500">// Example: ADR +15% shock</div>
              <div>adjustedADR = baseADR × (1 + 0.15)</div>
              <div className="mt-2 text-slate-500">// Example: Exit Cap Rate +50bps shock</div>
              <div>adjustedCapRate = baseCapRate + 0.0050</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-3">Step 2: Recalculate Affected Component</h4>
            <p className="text-sm text-slate-400 mb-2">
              The adjusted assumption flows through the relevant component:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li><strong className="text-white">Construction Cost shock</strong> → Recalculates Component 1 (Cash Outflows) → New TDC, new monthly construction cash flows</li>
              <li><strong className="text-white">Operating Expenses shock</strong> → Recalculates Component 2 (Cash Inflows) → New NOI, new operating cash flows</li>
              <li><strong className="text-white">ADR/Occupancy/Rent shock</strong> → Recalculates Component 2 (Cash Inflows) → New revenue, new NOI</li>
              <li><strong className="text-white">Interest Rate shock</strong> → Recalculates Component 4 (Financing) → New debt service, new IDC</li>
              <li><strong className="text-white">Exit Cap Rate shock</strong> → Recalculates Component 3 (Project IRR) → New terminal value</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-3">Step 3: Recalculate Downstream Components</h4>
            <p className="text-sm text-slate-400 mb-2">
              Changes cascade through dependent components:
            </p>
            <div className="bg-slate-950 rounded p-3 font-mono text-xs text-emerald-300">
              <div className="text-slate-500">// Example: Construction Cost +10% cascade</div>
              <div>Component 1: TDC increases by 10%</div>
              <div>  ↓</div>
              <div>Component 4: Higher TDC → Higher debt required → Higher interest expense</div>
              <div>  ↓</div>
              <div>Component 5: Higher interest → Lower cash flow to equity → Lower Equity IRR</div>
              <div>  ↓</div>
              <div>Component 3: Higher TDC (same exit value) → Lower Project IRR</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-3">Step 4: Recalculate Project IRR (Unlevered)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Project IRR is calculated on the unlevered cash flows (before debt service):
            </p>
            <div className="bg-slate-950 rounded p-3 font-mono text-xs text-emerald-300">
              <div className="text-slate-500">// Unlevered Cash Flow = Operating Cash Flow - Capital Expenditures</div>
              <div>UnleveredCF[t] = NOI[t] - CapEx[t] - ChangeInWorkingCapital[t]</div>
              <div className="mt-2 text-slate-500">// Terminal Value = NOI[final year] / Exit Cap Rate</div>
              <div>TerminalValue = NOI[final] / adjustedCapRate</div>
              <div className="mt-2 text-slate-500">// Project IRR = IRR of [-InitialInvestment, UnleveredCF[1], ..., UnleveredCF[n] + TerminalValue]</div>
              <div>ProjectIRR = IRR(unleveredCashFlows)</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-3">Step 5: Recalculate Equity IRR (Levered)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Equity IRR is calculated on the levered cash flows (after debt service):
            </p>
            <div className="bg-slate-950 rounded p-3 font-mono text-xs text-emerald-300">
              <div className="text-slate-500">// Levered Cash Flow = Unlevered Cash Flow - Debt Service</div>
              <div>LeveredCF[t] = UnleveredCF[t] - (Interest[t] + Principal[t])</div>
              <div className="mt-2 text-slate-500">// Equity Investment = Peak Equity Required (from Component 4)</div>
              <div>EquityInvestment = peakEquityRequired</div>
              <div className="mt-2 text-slate-500">// Terminal Equity Value = Terminal Value - Remaining Debt Balance</div>
              <div>TerminalEquityValue = TerminalValue - remainingDebt[final]</div>
              <div className="mt-2 text-slate-500">// Equity IRR = IRR of [-EquityInvestment, LeveredCF[1], ..., LeveredCF[n] + TerminalEquityValue]</div>
              <div>EquityIRR = IRR(leveredCashFlows)</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-3">Step 6: Calculate Delta vs Base Case</h4>
            <p className="text-sm text-slate-400 mb-2">
              The impact is shown as the difference between the shocked IRR and the base case IRR:
            </p>
            <div className="bg-slate-950 rounded p-3 font-mono text-xs text-emerald-300">
              <div className="text-slate-500">// Impact on Project IRR</div>
              <div>ProjectIRRImpact = shockedProjectIRR - baseProjectIRR</div>
              <div className="mt-2 text-slate-500">// Impact on Equity IRR</div>
              <div>EquityIRRImpact = shockedEquityIRR - baseEquityIRR</div>
              <div className="mt-2 text-slate-500">// Example: If base Equity IRR = 12.18% and shocked Equity IRR = 14.03%</div>
              <div>EquityIRRImpact = 14.03% - 12.18% = +1.85pp (positive impact)</div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <strong>Important:</strong> All shocks are applied independently (one at a time) when calculating the Tornado Chart.
          When multiple shocks are active simultaneously (in the Scenario Summary), they are applied together and the
          combined impact is calculated.
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Tips & Best Practices</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Start with Downside/Upside Presets</h4>
            <p className="text-sm text-slate-400">
              Use the one-click presets to quickly see the range of possible outcomes, then fine-tune individual
              shocks using the sliders.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Focus on the Tornado Chart</h4>
            <p className="text-sm text-slate-400">
              The Tornado Chart tells you which assumptions matter most. If your project&apos;s IRR is highly sensitive
              to ADR, focus your due diligence on validating your ADR assumptions with market data.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Watch the Min DSCR</h4>
            <p className="text-sm text-slate-400">
              If Min DSCR drops below 1.0x in any scenario, the project cannot cover debt service from operating
              cash flows in that year. This may require equity injections or loan restructuring.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Use Custom Shocks for Unique Risks</h4>
            <p className="text-sm text-slate-400">
              If your project has unique risks (e.g., environmental remediation costs, permit delays), create custom
              shock drivers to model their impact.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <a href="/docs/operational-stream/component-5-equity-returns" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          ← Component 5: Equity Returns
        </a>
        <a href="/docs/generating-the-study" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          Feasibility Study →
        </a>
      </div>
    </div>
  );
}
