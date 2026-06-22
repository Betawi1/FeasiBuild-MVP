export default function SaleComponent1Docs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Sale Stream</p>
        <h1 className="text-4xl font-bold text-white mb-4">Component 1: Development Financials</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          The Development Financials component captures all capital expenditure required to deliver your for-sale
          development project. From land acquisition through construction completion, this component models the
          complete cost structure and generates a monthly cash outflow schedule using S-Curve phasing.
        </p>
        <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
          <strong>Key Difference from Operational Stream:</strong> The Sale Stream is designed for developments
          where units are sold upon completion (residential towers, landed properties, commercial strata),
          rather than held for ongoing rental income.
        </div>
      </div>

      {/* Overview */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Component 1 walks you through 13 sequential steps to model the full development cost structure.
          Your early choices (building type, configuration) directly influence the cost benchmarks and
          allocation structures suggested in later steps.
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">What This Component Produces</h3>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Total Development Cost (TDC):</strong> Land + Construction + Soft Costs + POWC</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Monthly Cash Outflow Schedule:</strong> Construction costs phased using S-Curve distribution</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Cost Allocation Breakdown:</strong> Detailed soft cost and POWC allocations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">TDC Ratio Checks:</strong> Land cost vs. development cost balance validation</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Steps */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Step-by-Step Walkthrough</h2>

        {/* Step 1 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 1: Project Location</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Select the <strong className="text-white">country</strong> and <strong className="text-white">city</strong> where the project is located.
            This selection determines:
          </p>
          <ul className="space-y-1 text-slate-400 ml-4 list-disc">
            <li>Default currency and unit conventions</li>
            <li>Construction cost benchmarks specific to the market</li>
            <li>Land cost benchmarks and market insights</li>
            <li>Regulatory and permitting timelines</li>
          </ul>
        </div>

        {/* Step 2 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 2: Currency Selection</h3>
          <p className="text-slate-300 leading-relaxed">
            Choose the currency for your financial model. The system will use this currency throughout all components
            for consistency. Common choices include <strong className="text-white">AED</strong> (UAE Dirham),
            <strong className="text-white"> USD</strong>, <strong className="text-white">MYR</strong> (Malaysian Ringgit),
            and <strong className="text-white">GBP</strong>. All calculations, charts, and exported reports will display in this currency.
          </p>
        </div>

        {/* Step 3 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 3: Building Type</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            Select the primary product sub-type for your for-sale development. This is one of the most consequential
            choices, as it determines the configuration options, cost structures, and revenue modeling approach.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-semibold mb-1">🏠 Residential - Landed</h4>
              <p className="text-sm text-slate-400 mb-2">Terrace, Semi-D, Bungalow</p>
              <p className="text-xs text-slate-500">Low-rise individual units with private land ownership. Requires infrastructure cost modeling.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-semibold mb-1">🏢 Residential - High-Rise</h4>
              <p className="text-sm text-slate-400 mb-2">Condo (high-end), Apartment (low-mid), Serviced Apartment</p>
              <p className="text-xs text-slate-500">Multi-story residential tower with strata titles. May include mixed-use retail component.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-semibold mb-1">🏪 Commercial - Landed</h4>
              <p className="text-sm text-slate-400 mb-2">Terrace shop-offices (G+4 max)</p>
              <p className="text-xs text-slate-500">Low-rise commercial units with individual ownership. Requires infrastructure cost modeling.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-semibold mb-1">🏛️ Commercial - Strata Office</h4>
              <p className="text-sm text-slate-400 mb-2">Office building (G+4+) with strata titles</p>
              <p className="text-xs text-slate-500">Multi-story office tower with individual unit sales. Similar configuration to high-rise residential.</p>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 4: Building Configuration</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            The configuration form auto-selects based on your Building Type from Step 3. There are two distinct
            configuration modes:
          </p>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">High-Rise Config</h4>
              <p className="text-sm text-slate-400 mb-3">For Residential High-Rise and Commercial Strata Office</p>
              <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
                <li><strong className="text-white">Basements (No. of levels):</strong> Underground levels for parking, MEP, or storage</li>
                <li><strong className="text-white">Podium / Parking Floors:</strong> Above-grade parking or retail podium levels</li>
                <li><strong className="text-white">Tower Floors:</strong> Above-grade occupied floors (residential units or office space)</li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Landed Config</h4>
              <p className="text-sm text-slate-400 mb-3">For Residential Landed and Commercial Landed</p>
              <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
                <li><strong className="text-white">Number of Units:</strong> Total number of individual units/plots</li>
                <li><strong className="text-white">Land Area per Unit (sqft):</strong> Plot size for each unit</li>
                <li><strong className="text-white">BUA per Unit (sqft):</strong> Built-up area for each unit</li>
              </ul>
              <div className="mt-3 p-3 rounded bg-slate-950 border border-slate-800">
                <p className="text-xs text-slate-400 font-medium mb-1">Auto-Calculated Summary:</p>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>Total BUA = Units × BUA per Unit</li>
                  <li>Total Saleable Land Area = Units × Land Area per Unit</li>
                  <li>Total Land Area = Saleable Land ÷ 70% (assumes 30% for roads/infrastructure)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 5: Mixed-Use (Retail on Ground/Podium)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            <strong className="text-white">High-Rise Residential Only:</strong> Toggle this option if your high-rise residential
            project includes retail or F&amp;B components on the ground floor or podium levels.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Retail BUA as % of Ground/Podium BUA</h4>
            <p className="text-sm text-slate-400">
              Enter the percentage of ground/podium area allocated to retail. This affects construction cost allocation
              and will be modeled separately in the revenue component.
            </p>
          </div>
        </div>

        {/* Step 6 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 6: Construction Costs (CC)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Enter the built-up areas (BUA) and benchmark construction rates for each component. The system suggests
            benchmark rates based on your selections from Steps 1-4, but you can override these with project-specific data.
          </p>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Superstructure / Main Building</h4>
              <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
                <li><strong className="text-white">Building BUA (sqft):</strong> Total built-up area of above-grade occupied floors</li>
                <li><strong className="text-white">Building Rate (AED/sqft):</strong> Construction cost per square foot</li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Parking &amp; Basements</h4>
              <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
                <li><strong className="text-white">Parking BUA &amp; Rate:</strong> Above-grade parking structure area and cost</li>
                <li><strong className="text-white">Basement BUA &amp; Rate:</strong> Underground levels area and cost (typically 1.5-2.5x above-grade rates)</li>
              </ul>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <h4 className="text-amber-300 font-medium mb-2">Infrastructure Costs (Landed Developments Only)</h4>
              <p className="text-sm text-slate-400 mb-2">
                <strong className="text-white">For Landed Developments:</strong> Enter the infrastructure rate for roads,
                drainage, utilities, and landscaping.
              </p>
              <p className="text-sm text-slate-400">
                <strong className="text-white">For High-Rise &amp; Strata Office:</strong> Leave Infrastructure Rate as 0
                (infrastructure is included in building construction costs).
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
            <strong>💡 AI-Researched Benchmarks:</strong> Construction rates are pre-populated with AI-researched
            benchmarks based on your location and building type. In the MVP, these are static values. In production,
            they will be dynamically researched in real-time based on current market data.
          </div>
        </div>

        {/* Step 7 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 7: Contingency on CC</h3>
          <p className="text-slate-300 leading-relaxed">
            Apply a <strong className="text-white">contingency percentage</strong> to the total construction cost to account for unforeseen expenses,
            design changes, and material price escalation during construction. Industry standard ranges from
            <strong className="text-white"> 5% to 10%</strong>, depending on project complexity and design maturity.
          </p>
        </div>

        {/* Step 8 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 8: SC, POWC &amp; DC</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Enter the indirect costs as a percentage of construction cost (including contingency):
          </p>
          <ul className="space-y-2 text-slate-300 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Soft Costs (SC):</strong> Design fees, permits, legal, project management, insurance. Typically 15-20% of construction for sale developments.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">POWC (Pre-Opening Working Capital):</strong> Marketing, sales team, show unit setup, and operating float before first sales. Typically 3-6%.</span>
            </li>
          </ul>
          <div className="mt-3 p-3 rounded bg-slate-950 border border-slate-800">
            <p className="text-sm text-slate-400">
              <strong className="text-white">Development Cost (DC)</strong> = CC (incl. contingency) + SC + POWC
            </p>
          </div>
          <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
            <strong>💡 AI-Researched Benchmarks:</strong> SC and POWC percentages are pre-populated with AI-researched
            benchmarks. These will be dynamically researched in the production version.
          </div>
        </div>

        {/* Step 9 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 9: Land Costs (LC)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Enter the land acquisition details. The system calculates the total land cost and provides market insights
            comparing your inputs to benchmark values.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div>
              <h4 className="text-white font-medium">Land Area (sqft)</h4>
              <p className="text-sm text-slate-400">Total land area for the development (auto-populated for landed configs from Step 4).</p>
            </div>
            <div>
              <h4 className="text-white font-medium">Land Rate (AED/sqft)</h4>
              <p className="text-sm text-slate-400">Cost per square foot of land. Override the AI-researched benchmark if you have project-specific data.</p>
            </div>
            <div>
              <h4 className="text-white font-medium">Land Cost (LC)</h4>
              <p className="text-sm text-slate-400">Auto-calculated: Land Area × Land Rate</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <h4 className="text-emerald-300 font-medium mb-2">Market Insight</h4>
            <p className="text-sm text-slate-400">
              The system displays the benchmark land rate for your city and calculates land as a percentage of Total
              Development Cost (TDC). This helps validate whether your land cost is in line with market norms.
            </p>
          </div>
        </div>

        {/* Step 10 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 10: TDC &amp; Ratio Checks</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Review the Total Development Cost breakdown and validate the land-to-development cost ratios.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-300">Development Costs (DC)</span>
              <span className="text-emerald-400 font-mono">AED 108,864,959</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-300">Land Cost (LC)</span>
              <span className="text-emerald-400 font-mono">AED 48,577,650</span>
            </div>
            <div className="flex justify-between items-center py-2 bg-emerald-500/10 rounded px-2">
              <span className="text-white font-medium">Total Development Cost (TDC = DC + LC)</span>
              <span className="text-emerald-400 font-mono font-bold">AED 157,442,609</span>
            </div>
            <div className="pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Land / TDC:</span>
                <span className="text-emerald-400">30.9% (target ≤ 51%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Development (DC) / TDC:</span>
                <span className="text-emerald-400">69.1% (target ≥ 49%)</span>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 rounded bg-slate-950 border border-slate-800">
            <p className="text-xs text-slate-500">
              These ratios are simple guardrails. In many GCC projects, land cost is kept below ~50% of total development cost.
            </p>
          </div>
        </div>

        {/* Step 11 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 11: Construction Period (with AI Hint)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Set the overall construction duration in months. This will drive the monthly phasing for CC, SC, and POWC.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Construction Period (months)</h4>
            <p className="text-sm text-slate-400 mb-3">
              Enter the total construction duration from groundbreaking to completion.
            </p>
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-xs text-emerald-300 font-medium mb-1">AI Recommendation (rule-of-thumb)</p>
              <p className="text-xs text-slate-400">
                For a residential with 12 tower floors, a reasonable range is 24–36 months, depending on basement
                complexity and authority approvals.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
            <strong>💡 AI-Powered Recommendation:</strong> The construction period hint is generated by AI based on
            your building configuration (tower floors, basements, building type). This helps ensure realistic project
            timelines.
          </div>
        </div>

        {/* Step 12 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 12: Construction Stages (M0 to Finishes)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Break down the construction cost (including contingency) into stages. Percentages must sum to 100%.
            This allocation drives the S-Curve phasing of construction costs.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">M0</p>
                <p className="text-sm text-white font-medium">Design, authority, early enabling</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Enabling</p>
                <p className="text-sm text-white font-medium">Shoring, piling, early works</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Sub-Structure</p>
                <p className="text-sm text-white font-medium">Basements, foundations</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Super Structure</p>
                <p className="text-sm text-white font-medium">Podium, typical floors</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-slate-400">Stage 1 Label</label>
                <input type="text" value="Enabling" readOnly className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
                <label className="text-xs text-slate-400 mt-2 block">Stage 1 (% of CC%)</label>
                <input type="number" value="10" readOnly className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Stage 2 Label</label>
                <input type="text" value="Sub-Structure" readOnly className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
                <label className="text-xs text-slate-400 mt-2 block">Stage 2 (% of CC%)</label>
                <input type="number" value="20" readOnly className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Stage 3 Label</label>
                <input type="text" value="Super Structure" readOnly className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
                <label className="text-xs text-slate-400 mt-2 block">Stage 3 (% of CC%)</label>
                <input type="number" value="40" readOnly className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Stage 4 Label</label>
                <input type="text" value="Finishes" readOnly className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
                <label className="text-xs text-slate-400 mt-2 block">Stage 4 (% of CC%)</label>
                <input type="number" value="30" readOnly className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800">
              <p className="text-sm text-emerald-400 font-medium">Total Allocation: 100.0%</p>
            </div>
          </div>
        </div>

        {/* Step 13 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 13: Detailed Allocation &amp; Summary</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Define how POWC and Soft Costs are distributed over the programme, review standard allocations, then
            confirm all inputs before generating the model.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* POWC Allocation */}
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🤖</span>
                <h4 className="text-white font-semibold">AI RECOMMENDATION</h4>
              </div>
              <p className="text-xs text-slate-400 mb-1">POWC Allocation</p>
              <p className="text-xs text-slate-500 mb-3">Based on 2024 Dubai residential data<br />Source: ADCB Project Database</p>
              <p className="text-sm text-slate-400 mb-3">These are suggested benchmarks. You can override any value if you have project-specific data.</p>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-white">Site Establishment</p>
                    <p className="text-xs text-slate-500">Mobilization, temporary facilities, site prep</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value="40" readOnly className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white text-right" />
                    <span className="text-sm text-slate-400">%</span>
                    <span className="text-amber-400">✏️</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-white">Overhead Costs</p>
                    <p className="text-xs text-slate-500">Admin, HSE, Management, site staff</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value="12" readOnly className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white text-right" />
                    <span className="text-sm text-slate-400">%</span>
                    <span className="text-amber-400">✏️</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-white">Authority Fees</p>
                    <p className="text-xs text-slate-500">Telco, power, water, drainage, permits</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value="48" readOnly className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white text-right" />
                    <span className="text-sm text-slate-400">%</span>
                    <span className="text-amber-400">✏️</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between">
                  <span className="text-white font-medium">Total</span>
                  <span className="text-emerald-400 font-mono">100.0% ✓</span>
                </div>
              </div>
              <div className="mt-3 p-2 rounded bg-slate-950 border border-slate-800">
                <p className="text-xs text-slate-500">
                  <strong className="text-blue-400">ℹ️ Step 13 timing:</strong> Site: 40% M1, 30% M2, 30% M3 (M0 and M4+ zero);
                  if fewer than 3 construction months, those shares are normalized over M1..Mn. Overhead: even across M1–Mn.
                  Authority: 50% in first 2 months, 50% over last 3 months.
                </p>
              </div>
            </div>

            {/* Soft Costs Allocation */}
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🤖</span>
                <h4 className="text-white font-semibold">AI RECOMMENDATION</h4>
              </div>
              <p className="text-xs text-slate-400 mb-1">Soft Costs Allocation</p>
              <p className="text-xs text-slate-500 mb-3">Based on 2024 Dubai residential data<br />Source: ADCB Project Database</p>
              <p className="text-sm text-slate-400 mb-3">These are suggested benchmarks. You can override any value if you have project-specific data.</p>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-white">Main Architect</p>
                    <p className="text-xs text-slate-500">Design, drawings, site supervision</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value="30" readOnly className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white text-right" />
                    <span className="text-sm text-slate-400">%</span>
                    <span className="text-amber-400">✏️</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-white">Project Management</p>
                    <p className="text-xs text-slate-500">Owner&apos;s rep, coordination, reporting</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value="20" readOnly className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white text-right" />
                    <span className="text-sm text-slate-400">%</span>
                    <span className="text-amber-400">✏️</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-white">Engineering Consultant</p>
                    <p className="text-xs text-slate-500">Structural, MEP, civil engineering</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value="30" readOnly className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white text-right" />
                    <span className="text-sm text-slate-400">%</span>
                    <span className="text-amber-400">✏️</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-white">Geotechnical Consultant</p>
                    <p className="text-xs text-slate-500">Soil investigation, foundation recommendations</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value="10" readOnly className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white text-right" />
                    <span className="text-sm text-slate-400">%</span>
                    <span className="text-amber-400">✏️</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-white">Other Fees</p>
                    <p className="text-xs text-slate-500">Legal, insurance, marketing, miscellaneous</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value="10" readOnly className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white text-right" />
                    <span className="text-sm text-slate-400">%</span>
                    <span className="text-amber-400">✏️</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between">
                  <span className="text-white font-medium">Total</span>
                  <span className="text-emerald-400 font-mono">100.0% ✓</span>
                </div>
              </div>
              <div className="mt-3 p-2 rounded bg-slate-950 border border-slate-800">
                <p className="text-xs text-slate-500">
                  <strong className="text-blue-400">ℹ️ Percentages below are shares of total soft costs (Step 13).</strong>
                  Aggregate cash timing: Soft costs (total): 50% at M0, 30% at M1, 20% at M2 (pre-construction + early design).
                  Sub-lines show Step 13 % of total soft for reference only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Output */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Output: Development Financials Preview</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Upon completing Component 1, FeasiBuild generates a comprehensive Development Financials Preview showing
          the monthly cash outflow schedule with S-Curve phasing.
        </p>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Summary Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Land Cost</p>
              <p className="text-xl font-bold text-white">AED 48,577,650</p>
            </div>
            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Construction Cost</p>
              <p className="text-xl font-bold text-white">AED 87,794,322</p>
            </div>
            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Soft Costs</p>
              <p className="text-xl font-bold text-white">AED 16,680,921</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
              <p className="text-sm text-emerald-400">Total Development Cost</p>
              <p className="text-xl font-bold text-emerald-400">AED 157,442,609</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Monthly Cash Outflows Table</h3>
          <p className="text-sm text-slate-400 mb-4">
            The table shows monthly cash outflows from M0 through the construction period, with construction stages
            (Enabling, Sub-Structure, Super Structure, Finishes) highlighted.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Cost Item</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">M0</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">M1</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">M2</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">M3</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">...</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-3 text-white">Land Cost</td>
                  <td className="py-2 px-3 text-right">48,577,650</td>
                  <td className="py-2 px-3 text-right">—</td>
                  <td className="py-2 px-3 text-right">—</td>
                  <td className="py-2 px-3 text-right">—</td>
                  <td className="py-2 px-3 text-right">...</td>
                  <td className="py-2 px-3 text-right text-emerald-400">48,577,650</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-3 text-white">Construction Cost</td>
                  <td className="py-2 px-3 text-right">—</td>
                  <td className="py-2 px-3 text-right">992,857</td>
                  <td className="py-2 px-3 text-right">1,749,575</td>
                  <td className="py-2 px-3 text-right">2,159,598</td>
                  <td className="py-2 px-3 text-right">...</td>
                  <td className="py-2 px-3 text-right text-emerald-400">87,794,322</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-3 text-white">Soft Costs</td>
                  <td className="py-2 px-3 text-right">8,340,461</td>
                  <td className="py-2 px-3 text-right">5,004,276</td>
                  <td className="py-2 px-3 text-right">3,336,184</td>
                  <td className="py-2 px-3 text-right">—</td>
                  <td className="py-2 px-3 text-right">...</td>
                  <td className="py-2 px-3 text-right text-emerald-400">16,680,921</td>
                </tr>
                <tr className="border-b border-slate-800 bg-slate-950">
                  <td className="py-2 px-3 text-white font-medium">Monthly Total</td>
                  <td className="py-2 px-3 text-right font-medium">57,444,877</td>
                  <td className="py-2 px-3 text-right font-medium">7,243,812</td>
                  <td className="py-2 px-3 text-right font-medium">5,630,084</td>
                  <td className="py-2 px-3 text-right font-medium">2,703,923</td>
                  <td className="py-2 px-3 text-right font-medium">...</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-bold">157,442,609</td>
                </tr>
                <tr className="bg-slate-950">
                  <td className="py-2 px-3 text-white font-medium">Cumulative</td>
                  <td className="py-2 px-3 text-right font-medium">57,444,877</td>
                  <td className="py-2 px-3 text-right font-medium">64,688,689</td>
                  <td className="py-2 px-3 text-right font-medium">70,318,773</td>
                  <td className="py-2 px-3 text-right font-medium">73,022,696</td>
                  <td className="py-2 px-3 text-right font-medium">...</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-bold">157,442,609</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
          <strong>💡 S-Curve Implementation:</strong> Construction costs are phased using an S-Curve distribution based
          on the stage allocations from Step 12. The S-Curve parameters are AI-researched for your specific building
          type and location. In the MVP, these are static benchmarks; in production, they will be dynamically researched
          in real-time.
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Tips & Best Practices</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Use AI Benchmarks as Starting Points</h4>
            <p className="text-sm text-slate-400">
              The system suggests benchmark rates for construction costs, land rates, soft costs, and POWC based on
              your location and building type. Use these as anchors, then adjust based on your specific project&apos;s
              design, contractor quotes, or QS estimates.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Validate Land Cost Ratios</h4>
            <p className="text-sm text-slate-400">
              In Step 10, check that your land cost is within the target range (typically ≤51% of TDC for GCC projects).
              If land costs are too high, the project may have limited profitability.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Infrastructure Costs for Landed Developments</h4>
            <p className="text-sm text-slate-400">
              Don&apos;t forget to include infrastructure costs for landed developments (roads, drainage, utilities,
              landscaping). These can be significant and are often overlooked in early-stage feasibility studies.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Construction Period Realism</h4>
            <p className="text-sm text-slate-400">
              Use the AI recommendation as a guide, but validate against your contractor&apos;s preliminary program.
              Underestimating construction duration can lead to cash flow shortfalls and financing issues.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <a href="/docs/sale-stream" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          ← Sale Stream Overview
        </a>
        <a href="/docs/sale-stream/component-2-sales-revenue" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          Component 2: Sales Revenue →
        </a>
      </div>
    </div>
  );
}
