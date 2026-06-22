export default function SaleComponent6Docs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Sale Stream</p>
        <h1 className="text-4xl font-bold text-white mb-4">Component 6: Scenario Analysis</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          Component 6 is FeasiBuild&apos;s stress-testing engine for for-sale developments. It allows you to apply 
          &quot;shocks&quot; to key financial drivers and instantly see how those changes cascade through your entire 
          model — affecting construction costs, sales revenue, debt sizing, escrow mechanics, and ultimately 
          both your Unlevered Project IRR and Levered Equity IRR.
        </p>
        <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
          <strong>Key Difference from Operational Stream:</strong> Sale Stream shocks are tailored for 
          development-for-sale projects. Instead of operational metrics like ADR and Occupancy, you&apos;ll see 
          development-specific drivers like Sales Price/GDV, Sales Velocity, Pre-Sales Achievement, and 
          LTC Reduction.
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
              Shows your current base case metrics (Unlevered Project IRR, Levered Equity IRR, Peak Equity, 
              Loan Repayment) sourced from Components 3-5. This is your &quot;starting point&quot; before any shocks are applied.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">2. Scenario Presets</h4>
            <p className="text-sm text-slate-400">
              One-click presets for Base Case, Downside, and Upside scenarios. Downside/Upside presets apply 
              pre-configured shocks across pricing, velocity, costs, duration, LTC, and rates.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">3. Adjust Shock Values</h4>
            <p className="text-sm text-slate-400">
              Interactive sliders for each shock factor. Each slider shows the current shock value, the impact 
              on Unlevered IRR, and the impact on Levered IRR.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">4. Scenario Comparison & Tornado Chart</h4>
            <p className="text-sm text-slate-400">
              A comparison table showing Base vs Current vs Downside vs Upside for key metrics, plus a Tornado 
              Chart showing IRR sensitivity ranked by driver impact (most impactful at the top).
            </p>
          </div>
        </div>
      </section>

      {/* Base Case Metrics */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Base Case Metric Sources</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Before applying any shocks, FeasiBuild displays your base case metrics. These are sourced directly 
          from the calculations in Components 3-5:
        </p>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
          <div>
            <h4 className="text-white font-medium">Unlevered Project IRR (15.93%)</h4>
            <p className="text-sm text-slate-400">
              Sourced from <strong className="text-emerald-400">Component 3 (Project IRR)</strong>. This is the 
              IRR calculated on the project&apos;s unlevered cash flows (before debt service). It represents the 
              pure project return independent of financing structure.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium">Levered Equity IRR (11.52%)</h4>
            <p className="text-sm text-slate-400">
              Sourced from <strong className="text-emerald-400">Component 5 (Project IRR - Levered)</strong>. 
              This is the IRR calculated on the equity investor&apos;s cash flows (after debt service). It reflects 
              the actual return to the equity investor given the financing structure from Component 4.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium">Peak Equity (63.0M)</h4>
            <p className="text-sm text-slate-400">
              Sourced from <strong className="text-emerald-400">Component 4 (Financing)</strong>. This is the 
              maximum cumulative equity injection required during the construction phase, calculated using the 
              dynamic gap-fill mechanism.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium">Loan Repayment (M31)</h4>
            <p className="text-sm text-slate-400">
              Sourced from <strong className="text-emerald-400">Component 4 (Financing)</strong>. The month when 
              the construction loan is fully repaid, typically after sales collections cover the outstanding balance.
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
              Applies pre-configured negative shocks. For sale developments, this typically includes: 
              Sales Price -10%, Sales Velocity -25%, Pre-Sales Achievement -30%, Construction Cost +5%, 
              Soft Costs +10%, LTC Reduction +8%.
            </p>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
            <h4 className="text-blue-400 font-medium mb-2">Upside</h4>
            <p className="text-sm text-slate-400">
              Applies pre-configured positive shocks. For sale developments, this typically includes: 
              Sales Price +10%, Sales Velocity +25%, Pre-Sales Achievement +30%, Construction Cost -5%, 
              Soft Costs -10%, LTC Reduction -8%.
            </p>
          </div>
        </div>
      </section>

      {/* Sale-Specific Shock Factors */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Sale-Specific Shock Factors</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Unlike the Operational Stream which focuses on operational metrics, the Sale Stream features 
          development-specific shock factors that directly impact the feasibility of for-sale projects:
        </p>

        <div className="space-y-4">
          {/* Sales Price / GDV */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Sales Price / GDV (±20%)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Applies a percentage multiplier to the average sales price per sqft from Component 2. 
              This is the single most impactful driver for sale developments.
            </p>
            <div className="text-xs text-slate-500">
              <strong>Impact Chain:</strong> Lower sales price → Lower Gross Development Value (GDV) → 
              Lower net proceeds → Lower Unlevered IRR → Lower Levered IRR. Also affects LTV calculations 
              in Component 4, potentially reducing debt capacity.
            </div>
          </div>

          {/* Sales Velocity */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Sales Velocity (±50%)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Applies a percentage multiplier to the sales uptake curve from Component 2. A -25% shock 
              means sales happen 25% slower than the base case.
            </p>
            <div className="text-xs text-slate-500">
              <strong>Impact Chain:</strong> Slower sales → Delayed cash inflows → Higher peak funding gap → 
              More equity required → Higher interest costs → Lower Levered IRR. Critical for projects with 
              tight cash flow timing.
            </div>
          </div>

          {/* Pre-Sales Achievement */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Pre-Sales Achievement (±50%)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Applies a percentage multiplier to the pre-sales percentage from Component 2 (Step 8). 
              Pre-sales are units sold before construction begins, typically 6 months before M0.
            </p>
            <div className="text-xs text-slate-500">
              <strong>Impact Chain:</strong> Lower pre-sales → Less cash collected upfront → Higher initial 
              funding gap → More equity/debt required early → Higher interest costs. Pre-sales are critical 
              for reducing the peak funding requirement.
            </div>
          </div>

          {/* Construction Cost */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Construction Cost (±25%)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Applies a percentage multiplier to all construction costs from Component 1 (including land, 
              hard costs, soft costs, POWC).
            </p>
            <div className="text-xs text-slate-500">
              <strong>Impact Chain:</strong> Higher construction costs → Higher Total Development Cost (TDC) → 
              Lower net surplus → Lower Unlevered IRR. Also increases debt requirement (if LTC stays constant) 
              and equity requirement, reducing Levered IRR.
            </div>
          </div>

          {/* Soft Costs + POWC */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Soft Costs + POWC (±20%)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Applies a percentage multiplier to soft costs and pre-opening working capital from Component 1.
            </p>
            <div className="text-xs text-slate-500">
              <strong>Impact Chain:</strong> Higher soft costs → Higher TDC → Lower net surplus → Lower IRR. 
              Soft costs are typically 15-20% of construction, so a 10% shock has a meaningful but not 
              catastrophic impact.
            </div>
          </div>

          {/* Construction Duration */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Construction Duration (±3 months)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Applies a month adjustment to the construction period from Component 1. A +3 month shock 
              means construction takes 3 months longer than planned.
            </p>
            <div className="text-xs text-slate-500">
              <strong>Impact Chain:</strong> Longer construction → Delayed sales collections → Higher interest 
              costs (IDC) → Higher total debt → Lower Levered IRR. Also increases the risk of market timing 
              issues (selling into a weaker market).
            </div>
          </div>

          {/* LTC Reduction */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">LTC Reduction (±20%)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Applies a percentage reduction to the Loan-to-Cost ratio from Component 4. A +8% shock means 
              the bank reduces LTC by 8 percentage points (e.g., from 65% to 57%).
            </p>
            <div className="text-xs text-slate-500">
              <strong>Impact Chain:</strong> Lower LTC → Less debt available → More equity required → 
              Lower leverage → Lower Levered IRR (but also lower risk). This shock simulates tighter 
              lending conditions or bank risk aversion.
            </div>
          </div>

          {/* Interest Rate */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Interest Rate (±300bps)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Applies a basis point adjustment to the interest rate from Component 4. Affects both 
              construction interest (IDC) and any operating interest expense.
            </p>
            <div className="text-xs text-slate-500">
              <strong>Impact Chain:</strong> Higher interest rate → Higher debt service → Lower cash flow 
              to equity → Lower Levered IRR. Also increases total debt if IDC is capitalized.
            </div>
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
                  <td className="text-right text-emerald-400">15.93%</td>
                  <td className="text-right">1.35%</td>
                  <td className="text-right text-red-400">-10.17%</td>
                  <td className="text-right text-emerald-400">49.21%</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2">Unlevered Payback (months)</td>
                  <td className="text-right">42</td>
                  <td className="text-right">30</td>
                  <td className="text-right">30</td>
                  <td className="text-right">26</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2">Levered Equity IRR</td>
                  <td className="text-right text-emerald-400">11.52%</td>
                  <td className="text-right">0.42%</td>
                  <td className="text-right text-red-400">-6.46%</td>
                  <td className="text-right text-emerald-400">28.58%</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2">Levered Payback (months)</td>
                  <td className="text-right">35</td>
                  <td className="text-right">42</td>
                  <td className="text-right">35</td>
                  <td className="text-right">28</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2">Peak Equity Required</td>
                  <td className="text-right">63.0M</td>
                  <td className="text-right">69.5M</td>
                  <td className="text-right">77.4M</td>
                  <td className="text-right">59.7M</td>
                </tr>
                <tr>
                  <td className="py-2">Loan Repayment (month)</td>
                  <td className="text-right">M31</td>
                  <td className="text-right">M31</td>
                  <td className="text-right">M37</td>
                  <td className="text-right">M28</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200">
            <strong>Warning:</strong> Downside Equity IRR is below 12%. Project may be unfinanceable in a stress case.
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-200">
            <strong>Upside Equity IRR is 25% or higher.</strong> Project has strong upside potential.
          </div>
        </div>
      </section>

      {/* IRR Sensitivity Tornado Chart */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">IRR Sensitivity Tornado Chart</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          The Tornado Chart ranks shock factors by their impact on Levered Equity IRR. The most impactful 
          driver appears at the top, with the least impactful at the bottom. This helps you identify which 
          assumptions matter most for your project&apos;s success.
        </p>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h4 className="text-white font-medium mb-3">How to Read the Tornado Chart</h4>
          <ul className="text-sm text-slate-400 space-y-2 ml-4 list-disc">
            <li>
              <strong className="text-white">Green Bar:</strong> Shows the range of Levered Equity IRR when the driver 
              moves from its minimum shock to maximum shock (one at a time, holding all other factors constant).
            </li>
            <li>
              <strong className="text-white">Range Values:</strong> Shown to the right of each bar (e.g., &quot;0.42% – 2.82%&quot;). 
              This is the IRR range when only that driver is shocked.
            </li>
            <li>
              <strong className="text-white">Ranking:</strong> Drivers are sorted by the width of their bar (widest = most impactful). 
              In the example, Sales Price / GDV has the widest bar, meaning it has the largest impact on IRR.
            </li>
            <li>
              <strong className="text-white">Axis:</strong> The x-axis shows the Levered Equity IRR range. 
              All bars are plotted on this common axis for comparison.
            </li>
          </ul>
        </div>

        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <h4 className="text-emerald-400 font-medium mb-2">Typical Ranking for Sale Developments</h4>
          <ol className="text-sm text-slate-400 space-y-1 ml-4 list-decimal">
            <li><strong className="text-white">Sales Price / GDV</strong> — Most impactful; directly affects revenue and GDV</li>
            <li><strong className="text-white">Sales Velocity</strong> — Affects cash flow timing and funding gap</li>
            <li><strong className="text-white">Pre-Sales Achievement</strong> — Critical for reducing initial equity requirement</li>
            <li><strong className="text-white">Construction Cost</strong> — Affects TDC and net surplus</li>
            <li><strong className="text-white">Soft Costs + POWC</strong> — Moderate impact on total costs</li>
            <li><strong className="text-white">Construction Duration</strong> — Affects interest costs and timing</li>
            <li><strong className="text-white">LTC Reduction</strong> — Affects leverage and equity requirement</li>
            <li><strong className="text-white">Interest Rate</strong> — Affects debt service costs</li>
          </ol>
        </div>
      </section>

      {/* Methodology */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Methodology: How Shocks Affect IRR</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          When you apply a shock factor, FeasiBuild recalculates the entire financial model in real-time. 
          Here&apos;s the step-by-step methodology:
        </p>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Step 1: Apply Shock Multiplier to Base Assumption</h4>
            <p className="text-sm text-slate-400 mb-2">
              Each shock factor applies a multiplier or adjustment to the corresponding base case assumption 
              from Components 1-4.
            </p>
            <div className="bg-slate-950 rounded p-3 font-mono text-xs text-emerald-300">
              <div className="text-slate-500">// Example: Sales Price -10% shock</div>
              <div>adjustedSalesPrice = baseSalesPrice × (1 - 0.10)</div>
              <div className="mt-2 text-slate-500">// Example: Construction Cost +5% shock</div>
              <div>adjustedConstructionCost = baseConstructionCost × (1 + 0.05)</div>
              <div className="mt-2 text-slate-500">// Example: LTC Reduction +8%</div>
              <div>adjustedLTC = baseLTC - 0.08</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Step 2: Recalculate Affected Component</h4>
            <p className="text-sm text-slate-400 mb-2">
              The adjusted assumption flows through the relevant component:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
              <li><strong className="text-white">Sales Price/Velocity/Pre-Sales shocks</strong> → Recalculates Component 2 (Sales Revenue) → New net proceeds, new cash flow timing</li>
              <li><strong className="text-white">Construction Cost/Duration shocks</strong> → Recalculates Component 1 (Development Financials) → New TDC, new monthly construction cash flows</li>
              <li><strong className="text-white">LTC Reduction/Interest Rate shocks</strong> → Recalculates Component 4 (Financing) → New debt sizing, new interest expense</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Step 3: Recalculate Downstream Components</h4>
            <p className="text-sm text-slate-400 mb-2">
              Changes cascade through dependent components:
            </p>
            <div className="bg-slate-950 rounded p-3 font-mono text-xs text-emerald-300">
              <div className="text-slate-500">// Example: Sales Price -10% cascade</div>
              <div>Component 2: Net proceeds decrease by 10%</div>
              <div>  ↓</div>
              <div>Component 3: Lower net proceeds → Lower Unlevered IRR</div>
              <div>  ↓</div>
              <div>Component 4: Lower GDV → Lower LTV → Potentially lower debt capacity</div>
              <div>  ↓</div>
              <div>Component 5: Lower net proceeds + potentially higher equity → Lower Levered IRR</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Step 4: Recalculate Project IRR (Unlevered)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Project IRR is calculated on the unlevered cash flows (before debt service):
            </p>
            <div className="bg-slate-950 rounded p-3 font-mono text-xs text-emerald-300">
              <div className="text-slate-500">// Unlevered Cash Flow = Sales Proceeds - Development Costs</div>
              <div>UnleveredCF[t] = SalesProceeds[t] - DevelopmentCosts[t]</div>
              <div className="mt-2 text-slate-500">// Project IRR = IRR of [-InitialInvestment, UnleveredCF[1], ..., UnleveredCF[n]]</div>
              <div>ProjectIRR = IRR(unleveredCashFlows)</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Step 5: Recalculate Equity IRR (Levered)</h4>
            <p className="text-sm text-slate-400 mb-2">
              Equity IRR is calculated on the levered cash flows (after debt service):
            </p>
            <div className="bg-slate-950 rounded p-3 font-mono text-xs text-emerald-300">
              <div className="text-slate-500">// Levered Cash Flow = Unlevered Cash Flow - Debt Service</div>
              <div>LeveredCF[t] = UnleveredCF[t] - (Interest[t] + Principal[t])</div>
              <div className="mt-2 text-slate-500">// Equity IRR = IRR of [-EquityInvestment, LeveredCF[1], ..., LeveredCF[n]]</div>
              <div>EquityIRR = IRR(leveredCashFlows)</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Step 6: Calculate Delta vs Base Case</h4>
            <p className="text-sm text-slate-400 mb-2">
              The impact is shown as the difference between the shocked IRR and the base case IRR:
            </p>
            <div className="bg-slate-950 rounded p-3 font-mono text-xs text-emerald-300">
              <div className="text-slate-500">// Impact on Project IRR</div>
              <div>ProjectIRRImpact = shockedProjectIRR - baseProjectIRR</div>
              <div className="mt-2 text-slate-500">// Impact on Equity IRR</div>
              <div>EquityIRRImpact = shockedEquityIRR - baseEquityIRR</div>
              <div className="mt-2 text-slate-500">// Example: If base Equity IRR = 11.52% and shocked Equity IRR = 0.42%</div>
              <div>EquityIRRImpact = 0.42% - 11.52% = -11.10pp (negative impact)</div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <strong>Important:</strong> All shocks are applied independently (one at a time) when calculating 
          the Tornado Chart. When multiple shocks are active simultaneously (in the Scenario Summary), they 
          are applied together and the combined impact is calculated.
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Tips & Best Practices</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Start with Downside/Upside Presets</h4>
            <p className="text-sm text-slate-400">
              Use the one-click presets to quickly see the range of possible outcomes, then fine-tune 
              individual shocks using the sliders.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Focus on Sales Price and Velocity</h4>
            <p className="text-sm text-slate-400">
              The Tornado Chart will likely show Sales Price/GDV and Sales Velocity as the top two drivers. 
              Focus your due diligence on validating these assumptions with market data and comparable sales.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Watch the Warning Messages</h4>
            <p className="text-sm text-slate-400">
              If the Downside Equity IRR drops below 12%, the system warns that the project may be 
              unfinanceable. This is a critical red flag — lenders typically require minimum returns 
              to justify the risk.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Test Pre-Sales Sensitivity</h4>
            <p className="text-sm text-slate-400">
              Pre-sales achievement is often underestimated in feasibility studies. Test a -30% to -50% 
              shock to see how sensitive your funding gap is to pre-sales performance.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Use Custom Shocks for Unique Risks</h4>
            <p className="text-sm text-slate-400">
              If your project has unique risks (e.g., regulatory approval delays, infrastructure cost 
              overruns), create custom shock drivers to model their impact.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <a href="/docs/sale-stream/component-5-levered-irr" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          ← Component 5: Project IRR (Levered)
        </a>
        <a href="/docs/generating-the-study" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          Feasibility Study →
        </a>
      </div>
    </div>
  );
}
