export default function Component1Docs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Operational Stream</p>
        <h1 className="text-4xl font-bold text-white mb-4">Component 1: Cash Outflows</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          The Cash Outflows component captures all development-phase capital expenditure, from land acquisition
          through construction to pre-opening. Your inputs here determine the total project cost (TPC) and feed
          directly into the financing engine.
        </p>
      </div>

      {/* Overview */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Component 1 walks you through 13 sequential steps to model the full capital stack of your development.
          Each step builds on the previous one, and your early choices (asset type, segment, positioning) directly
          influence the benchmark values suggested in later steps.
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">What This Component Produces</h3>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Total Project Cost (TPC):</strong> Land + Construction + Soft Costs + FF&E + POWC + Contingency</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Monthly Cash Outflow Schedule:</strong> Construction costs phased using an S-Curve distribution</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Development Budget Summary:</strong> Itemized breakdown for lender and investor review</span>
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
            This selection is critical because it determines:
          </p>
          <ul className="space-y-1 text-slate-400 ml-4 list-disc">
            <li>Default currency and unit conventions</li>
            <li>Construction cost benchmarks specific to the market</li>
            <li>Regulatory and permitting timelines</li>
            <li>Tax and VAT treatment assumptions</li>
          </ul>
        </div>

        {/* Step 2 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 2: Currency Selection</h3>
          <p className="text-slate-300 leading-relaxed">
            Choose the currency for your financial model. The system will use this currency throughout all components
            for consistency. Common choices include <strong className="text-white">AED</strong> (UAE Dirham),
            <strong className="text-white"> USD</strong>, <strong className="text-white">SAR</strong> (Saudi Riyal),
            and <strong className="text-white">GBP</strong>. All calculations, charts, and exported reports will display in this currency.
          </p>
        </div>

        {/* Step 3 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 3: Operational Asset Type</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            Select the income-producing asset class. This is one of the most consequential choices in the model,
            as it determines the revenue structure, operating expense ratios, and exit cap rates used throughout.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-semibold mb-1">🏨 Hotel / Hospitality</h4>
              <p className="text-sm text-slate-400">Revenue from daily room sales, F&B, and ancillary services. Requires ADR and occupancy modeling.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-semibold mb-1">🛍️ Shopping Mall / Retail</h4>
              <p className="text-sm text-slate-400">Revenue from tenant leases, percentage rents, and CAM charges. Requires tenant mix modeling.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-semibold mb-1">🏢 Office (Stabilized)</h4>
              <p className="text-sm text-slate-400">Revenue from corporate leases with escalation clauses. Requires lease structure modeling.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-semibold mb-1">🏠 Residential BTR</h4>
              <p className="text-sm text-slate-400">Revenue from monthly residential leases. Requires unit mix and furnishing level modeling.</p>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 4: Building Configuration</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Define the physical structure of your building. These inputs directly affect construction cost calculations
            in Step 6.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div>
              <h4 className="text-white font-medium">Number of Basements</h4>
              <p className="text-sm text-slate-400">Underground levels for parking, MEP, or storage. Basements have significantly higher construction costs per sqm than above-grade floors.</p>
            </div>
            <div>
              <h4 className="text-white font-medium">Number of Podium / Parking Floors</h4>
              <p className="text-sm text-slate-400">Above-grade parking or retail podium levels. These typically have lower construction costs per sqm than occupied floors.</p>
            </div>
            <div>
              <h4 className="text-white font-medium">Number of Building Floors</h4>
              <p className="text-sm text-slate-400">Above-grade occupied floors (guest rooms, office space, residential units). This is the primary revenue-generating area.</p>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 5: Operating Segment & Market Positioning</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            Based on the asset type selected in Step 3, you will choose an <strong className="text-white">operating segment</strong> and
            <strong className="text-white"> market positioning</strong>. These selections calibrate the construction cost benchmarks,
            revenue assumptions, and operating expense profiles used throughout the model.
          </p>

          <h4 className="text-white font-semibold mb-2 mt-4">🏨 Hotel Segments</h4>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-slate-400 font-medium">Segment</th>
                  <th className="text-left py-2 text-slate-400 font-medium">Description</th>
                  <th className="text-left py-2 text-slate-400 font-medium">Star Ratings</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Business / Upscale</td>
                  <td className="py-2">Corporate & conference demand, higher ADR, strong weekday occupancy</td>
                  <td className="py-2">3★, 4★, 5★</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Resort / Leisure</td>
                  <td className="py-2">Destination properties with recreational amenities, seasonal demand</td>
                  <td className="py-2">4★, 5★</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Boutique / Lifestyle</td>
                  <td className="py-2">Design-led, smaller key count, personalized service</td>
                  <td className="py-2">4★, 5★</td>
                </tr>
                <tr>
                  <td className="py-2 text-white">Budget / Economy</td>
                  <td className="py-2">Limited service, lean FF&E, high occupancy, low ADR</td>
                  <td className="py-2">3★</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="text-white font-semibold mb-2 mt-4">🛍️ Retail Segments</h4>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-slate-400 font-medium">Segment</th>
                  <th className="text-left py-2 text-slate-400 font-medium">Description</th>
                  <th className="text-left py-2 text-slate-400 font-medium">Positioning</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Regional Mall</td>
                  <td className="py-2">Large enclosed center, anchor tenants, high foot traffic</td>
                  <td className="py-2">Luxury, Upscale, Mid-Market</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Lifestyle Center</td>
                  <td className="py-2">Open-air premium experience, higher-end tenants</td>
                  <td className="py-2">Luxury, Upscale</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Community Center</td>
                  <td className="py-2">Neighborhood convenience, grocery-anchored</td>
                  <td className="py-2">Mid-Market, Value</td>
                </tr>
                <tr>
                  <td className="py-2 text-white">Outlet Center</td>
                  <td className="py-2">Discount brands, destination shopping, tourist traffic</td>
                  <td className="py-2">Value, Mid-Market</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="text-white font-semibold mb-2 mt-4">🏢 Office Segments</h4>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-slate-400 font-medium">Segment</th>
                  <th className="text-left py-2 text-slate-400 font-medium">Description</th>
                  <th className="text-left py-2 text-slate-400 font-medium">Positioning</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Prime / Grade A Tower</td>
                  <td className="py-2">CBD high-rise, premium specs, blue-chip tenants</td>
                  <td className="py-2">Premium / Trophy</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Business Park / Campus</td>
                  <td className="py-2">Suburban low-density, tech & R&D tenants</td>
                  <td className="py-2">Grade A / Institutional</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Secondary / Grade B</td>
                  <td className="py-2">Established locations, functional spaces, value-add</td>
                  <td className="py-2">Grade B / Core</td>
                </tr>
                <tr>
                  <td className="py-2 text-white">Co-Working / Flexible</td>
                  <td className="py-2">Serviced offices, flexible leases, higher opex</td>
                  <td className="py-2">Grade A, Grade B</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="text-white font-semibold mb-2 mt-4">🏠 Residential BTR Segments</h4>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-slate-400 font-medium">Segment</th>
                  <th className="text-left py-2 text-slate-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">High-Rise Tower</td>
                  <td className="py-2">Urban core, 10+ floors, full amenities (gym, pool, concierge)</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Mid-Rise / Garden Style</td>
                  <td className="py-2">Suburban, 3-6 floors, family-oriented, surface parking</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Townhome / Low-Rise</td>
                  <td className="py-2">G+2 max, private entrances, land-intensive</td>
                </tr>
                <tr>
                  <td className="py-2 text-white">Compact Units</td>
                  <td className="py-2">G+4 to G+16, studios & 1BR, young professional demand</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="text-white font-semibold mb-2 mt-2">Furnishing Levels (Residential Only)</h4>
          <ul className="space-y-1 text-slate-400 ml-4 list-disc text-sm mb-3">
            <li><strong className="text-white">Unfurnished:</strong> Shell + basic finishes. Lowest capex.</li>
            <li><strong className="text-white">Semi-Furnished:</strong> + appliances & window treatments. Moderate premium.</li>
            <li><strong className="text-white">Fully Furnished:</strong> + furniture, kitchenware, linens. Commands 20-40% rent premium.</li>
          </ul>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
            <strong>Serviced Apartment Model:</strong> Available for High-Rise/Mid-Rise + Luxury/Grade A. When enabled,
            the model assumes hotel-like services with higher operating costs and a 30-50% revenue premium over standard BTR.
          </div>
        </div>

        {/* Step 6 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 6: Construction Costs</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Enter the <strong className="text-white">Built-Up Area (BUA)</strong> and <strong className="text-white">construction rate per sqm</strong> for each building element.
            The system will suggest benchmark rates based on your selections from Steps 1-5, but you can override these with project-specific data.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div>
              <h4 className="text-white font-medium">Building Floors BUA & Rate</h4>
              <p className="text-sm text-slate-400">Total built-up area of above-grade occupied floors and the construction cost per square meter. This is typically the largest cost line item.</p>
            </div>
            <div>
              <h4 className="text-white font-medium">Podium / Parking BUA & Rate</h4>
              <p className="text-sm text-slate-400">Area and rate for above-grade parking structures. Rates are lower than occupied floors due to simpler finishes.</p>
            </div>
            <div>
              <h4 className="text-white font-medium">Basement BUA & Rate</h4>
              <p className="text-sm text-slate-400">Area and rate for underground levels. Basement construction carries a significant premium (typically 1.5-2.5x above-grade rates) due to excavation, waterproofing, and shoring.</p>
            </div>
          </div>
        </div>

        {/* Step 7 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 7: Contingency</h3>
          <p className="text-slate-300 leading-relaxed">
            Apply a <strong className="text-white">contingency percentage</strong> to the total construction cost to account for unforeseen expenses,
            design changes, and material price escalation during construction. Industry standard ranges from
            <strong className="text-white"> 5% to 10%</strong>, depending on project complexity and design maturity.
          </p>
        </div>

        {/* Step 8 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 8: Soft Costs, POWC & FF&E</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Enter the indirect costs as a percentage of construction cost:
          </p>
          <ul className="space-y-2 text-slate-300 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Soft Costs (SC):</strong> Design fees, permits, legal, project management, insurance. Typically 8-15% of construction.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Pre-Opening Working Capital (POWC):</strong> Staff recruitment, training, marketing, and operating float before revenue begins. Typically 3-6%.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">FF&E (Furniture, Fixtures & Equipment):</strong> Loose furniture, kitchen equipment, IT systems, signage. Varies significantly by asset type and positioning.</span>
            </li>
          </ul>
        </div>

        {/* Step 9 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 9: Land Cost</h3>
          <p className="text-slate-300 leading-relaxed">
            Enter the <strong className="text-white">total land acquisition cost</strong>. You can input this as a lump sum or derive it from
            a per-square-foot rate multiplied by the plot area. Land cost is treated as an upfront equity contribution
            and is typically the first cash outflow in the model (Month 0).
          </p>
        </div>

        {/* Step 10 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 10: Construction Period & Pre-Opening</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Define the timeline for your project:
          </p>
          <ul className="space-y-2 text-slate-300 ml-4">
            <li><strong className="text-white">Construction Period (months):</strong> Total duration from groundbreaking to substantial completion. Typical ranges: Hotels 30-48 months, Residential 24-36 months, Office 24-42 months.</li>
            <li><strong className="text-white">Pre-Opening Period (months):</strong> Time between substantial completion and first revenue. Used for FF&E installation, staff training, soft opening, and marketing ramp-up. Typically 3-12 months.</li>
          </ul>
        </div>

        {/* Step 11 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 11: Construction Phasing (S-Curve)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Select the <strong className="text-white">S-Curve profile</strong> that best represents how construction costs will be distributed
            across the construction period. The S-Curve determines the monthly cash outflow schedule for the construction budget.
          </p>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-4">
            <h4 className="text-white font-semibold mb-3">What is an S-Curve?</h4>
            <p className="text-slate-300 text-sm leading-relaxed mb-3">
              Construction spending does not happen evenly. Projects typically start slowly (enabling works, foundations),
              accelerate through the middle period (superstructure, MEP), and taper off during finishes and commissioning.
              When plotted cumulatively, this creates an &quot;S&quot; shape.
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">
              The S-Curve you select here determines exactly how much of your construction budget is spent in each month.
              This is critical for accurate cash flow modeling, debt drawdown scheduling, and IDC (Interest During Construction) calculations.
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-4">
            <h4 className="text-white font-medium mb-2">Available S-Curve Profiles</h4>
            <p className="text-sm text-slate-400 mb-3">
              Different curves are available based on your asset type, project scale, and complexity. Common profiles include:
            </p>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li><strong className="text-white">Standard S-Curve:</strong> Symmetric bell-shaped spending. Suitable for most mid-scale projects.</li>
              <li><strong className="text-white">Front-Loaded:</strong> Higher spending in early months. Common for projects with extensive basement or enabling works.</li>
              <li><strong className="text-white">Back-Loaded:</strong> Higher spending in later months. Common for projects with expensive FF&E or fit-out phases.</li>
              <li><strong className="text-white">Linear:</strong> Equal monthly spending. Simple but rarely reflects reality.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
            <strong>💡 How the S-Curve is selected:</strong> The system suggests an appropriate S-Curve based on your
            project&apos;s asset type, location, building configuration, and construction period. In future versions,
            FeasiBuild&apos;s AI Research Engine will analyze comparable projects in your market to calibrate the optimal
            phasing profile. See the <a href="/docs/ai-research" className="text-blue-400 underline">AI Research & Automation</a> section for details.
          </div>
        </div>

        {/* Step 12 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 12: Review & Summary</h3>
          <p className="text-slate-300 leading-relaxed">
            Review all inputs before generating the model. This screen displays your Total Project Cost (TPC)
            broken down by category: Land, Construction, Contingency, Soft Costs, FF&E, and POWC. Verify that
            all figures are correct before proceeding.
          </p>
        </div>

        {/* Step 13 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 13: Generate Model</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Click <strong className="text-white">&quot;Generate Model&quot;</strong> to produce the monthly cash outflow schedule.
            The system will:
          </p>
          <ol className="space-y-2 text-slate-300 ml-4 list-decimal">
            <li>Apply the selected S-Curve to phase construction costs across the construction period</li>
            <li>Distribute soft costs, FF&E, and POWC according to their respective phasing schedules</li>
            <li>Place land cost as an upfront outflow (Month 0)</li>
            <li>Generate a month-by-month cash outflow table and cumulative expenditure chart</li>
          </ol>
        </div>
      </section>

      {/* Output */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Output: Monthly Cash Outflows</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          The primary output of Component 1 is a <strong className="text-white">monthly cash outflow table</strong> showing
          the timing and magnitude of every capital expenditure throughout the development period. This table feeds
          directly into Component 4 (Financing) for debt drawdown scheduling and IDC calculations.
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Key Output Metrics</h3>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Total Project Cost (TPC):</strong> Sum of all capital expenditures</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Peak Monthly Outflow:</strong> Highest single-month expenditure (used for liquidity planning)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Cumulative Spend Curve:</strong> Visual representation of total capital deployed over time</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Construction vs. Pre-Opening Split:</strong> Separation of hard costs from soft costs and working capital</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Tips & Best Practices</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Use Benchmark Values as a Starting Point</h4>
            <p className="text-sm text-slate-400">The system suggests benchmark rates based on your market and asset type. Use these as anchors, then adjust based on your specific project&apos;s design, contractor quotes, or QS estimates.</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Don&apos;t Underestimate Contingency</h4>
            <p className="text-sm text-slate-400">Early-stage feasibility studies should use 8-10% contingency. Reducing to 5% is only appropriate when you have detailed designs and fixed-price contracts.</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Land Timing Matters</h4>
            <p className="text-sm text-slate-400">If land is paid in installments, model the actual payment schedule rather than a single upfront cost. This affects your equity requirement and IDC calculations.</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Validate Your S-Curve</h4>
            <p className="text-sm text-slate-400">Compare the generated monthly outflows against your contractor&apos;s preliminary program. If the peak spending month doesn&apos;t align with the main construction phase, consider a different S-Curve profile.</p>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <a href="/docs/operational-stream" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          ← Operational Stream
        </a>
        <a href="/docs/operational-stream/component-2-cash-inflows" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          Component 2: Cash Inflows →
        </a>
      </div>
    </div>
  );
}
