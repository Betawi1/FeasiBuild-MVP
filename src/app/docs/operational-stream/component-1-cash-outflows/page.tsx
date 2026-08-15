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
            Select the <strong className="text-white">country</strong> and{" "}
            <strong className="text-white">city</strong> where the project is located, or use the{" "}
            <strong className="text-white">interactive map</strong> to virtually pinpoint your exact site.
          </p>
          <ul className="space-y-2 text-slate-400 ml-4 list-disc mb-3">
            <li>
              <strong className="text-white">Pin-Drop Precision:</strong> Click anywhere on the map to drop a pin.
              The system captures the exact <strong className="text-white">Latitude and Longitude</strong>. This
              precision allows the AI Research Engine to pull hyper-local micro-market data (e.g., specific
              neighborhood trends).
            </li>
            <li>
              <strong className="text-white">Auto-Currency:</strong> Selecting a country automatically suggests the
              local currency (e.g., Malaysia → MYR), which can be overridden in Step 2.
            </li>
          </ul>
          <p className="text-slate-300 leading-relaxed mb-3">
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
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-semibold mb-1">📦 Warehouse / Industrial</h4>
              <p className="text-sm text-slate-400">Revenue from long-term industrial leases. Requires modeling of loading docks, clear height, and specialized storage.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-semibold mb-1">🖥️ Data Centre</h4>
              <p className="text-sm text-slate-400">Revenue from power capacity (MW), rack space, and cooling services. Requires PUE (Power Usage Effectiveness) and IT load modeling.</p>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 4: Operating Segment & Market Positioning</h3>
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

          <h4 className="text-white font-semibold mb-2 mt-4">📦 Warehouse Sub-Type &amp; Quality Grade</h4>
          <p className="text-slate-300 text-sm mb-3">
            Choosing the warehouse sub-type and quality grade determines the technical specifications auto-calculated in Step 5.
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-slate-400 font-medium">Warehouse Sub-Type</th>
                  <th className="text-left py-2 text-slate-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Bulk / Distribution</td>
                  <td className="py-2">Large-scale, high-bay storage &amp; distribution</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Last-Mile / Urban</td>
                  <td className="py-2">Smaller facilities closer to population centres</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Multi-Storey</td>
                  <td className="py-2">Land-scarce urban locations, multiple levels</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 text-white">Cold Storage</td>
                  <td className="py-2">Temperature-controlled facilities, higher cost</td>
                </tr>
                <tr>
                  <td className="py-2 text-white">Light Manufacturing / Workshop</td>
                  <td className="py-2">Combined warehouse + light industrial</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h5 className="text-white font-medium mb-1">Grade A</h5>
              <p className="text-sm text-slate-400">Modern, high-spec, prime location.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h5 className="text-white font-medium mb-1">Grade B</h5>
              <p className="text-sm text-slate-400">Functional, secondary location.</p>
            </div>
          </div>

          <h4 className="text-white font-semibold mb-2 mt-4">🖥️ Data Centre Segment & Positioning</h4>
          <p className="text-slate-300 text-sm mb-3">
            For Data Centres, choosing the Colocation or Edge segment, Uptime Tier, and market positioning drives the building specifications and CapEx benchmarks in subsequent steps.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h5 className="text-white font-medium mb-1">Colocation (Wholesale)</h5>
              <p className="text-sm text-slate-400">Multi-tenant facilities leasing space and power.</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h5 className="text-white font-medium mb-1">Edge</h5>
              <p className="text-sm text-slate-400">Distributed low-latency facilities (100 kW – 1 MW).</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <h5 className="text-white font-medium mb-2">Tier Level</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Tier II:</strong> Redundant components · Single path</li>
                <li><strong className="text-white">Tier III:</strong> Concurrently maintainable · Dual path</li>
                <li><strong className="text-white">Tier IV:</strong> Fault-tolerant · Fully redundant</li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-2">Positioning</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Premium / Tier III+:</strong> Higher specification, higher lease rates</li>
                <li><strong className="text-white">Standard / Tier II:</strong> Cost-optimised, competitive pricing</li>
              </ul>
            </div>
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

        {/* Step 5 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 5: Building Configuration</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Define the physical structure of your building. These inputs directly affect construction cost calculations
            in Step 6.
          </p>
          
          <h4 className="text-white font-medium mb-2 mt-4">Standard Assets (Hotel, Retail, Office, BTR)</h4>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3 mb-4">
            <div>
              <h5 className="text-white font-medium">Number of Basements</h5>
              <p className="text-sm text-slate-400">Underground levels for parking, MEP, or storage. Basements have significantly higher construction costs per sqm than above-grade floors.</p>
            </div>
            <div>
              <h5 className="text-white font-medium">Number of Podium / Parking Floors</h5>
              <p className="text-sm text-slate-400">Above-grade parking or retail podium levels. These typically have lower construction costs per sqm than occupied floors.</p>
            </div>
            <div>
              <h5 className="text-white font-medium">Number of Building Floors</h5>
              <p className="text-sm text-slate-400">Above-grade occupied floors (guest rooms, office space, residential units). This is the primary revenue-generating area.</p>
            </div>
          </div>

          <h4 className="text-white font-medium mb-2 mt-4">📦 Warehouse Building Configuration</h4>
          <p className="text-slate-300 text-sm mb-3">
            FeasiBuild auto-calculates technical details from the selected sub-type &amp; grade. A{" "}
            <strong className="text-white">Summary of Your Selections (from Step 4)</strong> panel shows Sub-Type and Quality Grade.
          </p>
          <p className="text-slate-300 text-sm mb-3">
            Two tabs: <strong className="text-white">Single Warehouse</strong> and{" "}
            <strong className="text-white">Industrial Park</strong>.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-4 mb-4">
            <div>
              <h5 className="text-white font-medium mb-1">Single Warehouse template</h5>
              <p className="text-sm text-slate-400 mb-2">
                The template is editable from the park tab via{" "}
                <strong className="text-white">Edit Template → Single Warehouse</strong>.
              </p>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">BUA (sqft)</strong></li>
                <li><strong className="text-white">Floors</strong></li>
                <li><strong className="text-white">Clear Height (ft)</strong></li>
                <li><strong className="text-white">Column Spacing (ft)</strong></li>
                <li><strong className="text-white">Dock Doors (count)</strong></li>
                <li><strong className="text-white">Land Area (sqft)</strong></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-1">Industrial Park — Park Configuration</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li>
                  <strong className="text-white">Number of Units:</strong> min 4 / max 50, validated when you leave the field.
                </li>
                <li>
                  <strong className="text-white">Warehouse Land Area (sqft):</strong> units × single warehouse land.
                </li>
                <li>
                  <strong className="text-white">Common Infrastructure Area (% of Land):</strong> auto-suggested 20–30%.
                </li>
                <li>
                  <strong className="text-white">Total Land Area (sqft):</strong> warehouse land + common infrastructure area.
                </li>
              </ul>
            </div>
          </div>

          <h4 className="text-white font-medium mb-2 mt-4">🖥️ Data Centre Building Configuration</h4>
          <p className="text-slate-300 text-sm mb-3">
            For Data Centres, enter IT load and site parameters. Racks, white space, GFA, and land coverage calculate automatically based on these inputs.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-4">
            <div>
              <h5 className="text-white font-medium mb-1">Power & IT Capacity</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">IT Load Capacity (MW) & Power Density (kW per rack):</strong> Determines the total power requirement.</li>
                <li><strong className="text-white">Number of Racks:</strong> Auto-calculated (IT Load ÷ Power Density).</li>
                <li><strong className="text-white">IT Load Density (kW/sqft):</strong> Can be manually overridden or reset to benchmark.</li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-1">White Space Area</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">White Space Area (sqft):</strong> Auto-calculated (IT Load ÷ IT Load Density).</li>
                <li><strong className="text-white">White Space Ratio (%):</strong> Percentage of total area dedicated to white space.</li>
                <li><strong className="text-white">Total Building GFA (sqft):</strong> Auto-calculated (White Space ÷ Ratio).</li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-1">Critical Infrastructure</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Cooling System Type:</strong> e.g., Air-Cooled.</li>
                <li><strong className="text-white">Cooling Efficiency (PUE):</strong> Power Usage Effectiveness (pre-filled from AI research, editable).</li>
                <li><strong className="text-white">UPS / Backup Power (MW) & Number of Generators.</strong></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-1">Connectivity</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Fiber Connectivity:</strong> e.g., On-Net.</li>
                <li><strong className="text-white">Number of Diverse Fiber Paths.</strong></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-1">Building Configuration & Land</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Number of Buildings / Halls, Floors per Building, Building Height (ft).</strong></li>
                <li><strong className="text-white">Total Land Area (sqft) & Land Coverage (%).</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 6 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 6: Construction Costs</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Enter the <strong className="text-white">Built-Up Area (BUA)</strong> and <strong className="text-white">construction rate per sqm</strong> for each building element.
            The system will suggest benchmark rates based on your selections from Steps 1-5, but you can override these with project-specific data.
          </p>
          
          <h4 className="text-white font-medium mb-2 mt-4">Standard Assets (Hotel, Retail, Office, BTR)</h4>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3 mb-4">
            <div>
              <h5 className="text-white font-medium">Building Floors BUA & Rate</h5>
              <p className="text-sm text-slate-400">Total built-up area of above-grade occupied floors and the construction cost per square meter. This is typically the largest cost line item.</p>
            </div>
            <div>
              <h5 className="text-white font-medium">Podium / Parking BUA & Rate</h5>
              <p className="text-sm text-slate-400">Area and rate for above-grade parking structures. Rates are lower than occupied floors due to simpler finishes.</p>
            </div>
            <div>
              <h5 className="text-white font-medium">Basement BUA & Rate</h5>
              <p className="text-sm text-slate-400">Area and rate for underground levels. Basement construction carries a significant premium (typically 1.5-2.5x above-grade rates) due to excavation, waterproofing, and shoring.</p>
            </div>
          </div>

          <h4 className="text-white font-medium mb-2 mt-4">📦 Warehouse Construction Costs</h4>
          <p className="text-slate-300 text-sm mb-3">
            A benchmark chip identifies the benchmark set (e.g.{" "}
            <strong className="text-white">Warehouse / Industrial · Malaysia · Bulk / Distribution · Grade B</strong>).
            Quantities are locked from Step 5; rates use AI research when available (AI badge); totals calculate
            automatically and, in Industrial Park mode, scale by the number of units (shown as{" "}
            <strong className="text-white">× Number of Units [N]</strong> badges).
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-4 mb-4">
            <div>
              <h5 className="text-white font-medium mb-1">Building &amp; shell</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Building BUA (sqft)</strong> [Auto]</li>
                <li><strong className="text-white">Building Rate (/sqft)</strong> (AI)</li>
                <li><strong className="text-white">Building Cost</strong> [Auto]</li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-1">Site &amp; yard works</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Yard Area (sqft)</strong> [Auto] + <strong className="text-white">Yard Rate (/sqft)</strong> (AI) + <strong className="text-white">Yard Cost</strong> [Auto]</li>
                <li><strong className="text-white">Car Parking Stalls</strong> [Auto] + <strong className="text-white">Car Parking Rate (/stall)</strong> (AI) + <strong className="text-white">Car Parking Cost</strong> [Auto]</li>
                <li><strong className="text-white">Trailer Parking Stalls</strong> [Auto] + <strong className="text-white">Trailer Parking Rate (/stall)</strong> (AI) + <strong className="text-white">Trailer Parking Cost</strong> [Auto]</li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-1">Loading &amp; access</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Dock Doors</strong> [Auto] + <strong className="text-white">Cost per Dock Door</strong> (AI)</li>
                <li><strong className="text-white">Drive-In Doors</strong> [Auto] + <strong className="text-white">Cost per Drive-In Door</strong> (AI)</li>
                <li><strong className="text-white">Loading Cost</strong> [Auto]</li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-1">Specialised systems (per unit)</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li>Racking / Shelving</li>
                <li>Refrigeration / Cold Storage</li>
                <li>Automation / Conveyors</li>
                <li><strong className="text-white">Total Specialised Systems</strong> [Auto]</li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-1">Common Infrastructure</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Common Infrastructure Area (sqft)</strong> [Auto] + <strong className="text-white">Infrastructure Rate (/sqft)</strong> (AI) + <strong className="text-white">Common Infrastructure Cost</strong> [Auto]</li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-1">Professional fees</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Professional Fees (%)</strong> (AI) + <strong className="text-white">Professional Fees</strong> [Auto]</li>
              </ul>
            </div>
            <p className="text-sm text-slate-400 pt-1">
              Footer total: <strong className="text-white">Estimated hard costs + fees</strong>.
            </p>
          </div>

          <h4 className="text-white font-medium mb-2 mt-4">🖥️ Data Centre Construction Costs</h4>
          <p className="text-slate-300 text-sm mb-3">
            CapEx rates for shell, M&E, and optional IT hardware. Professional fees and contingency apply to Building + M&E only (IT hardware excluded from that base).
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-4">
            <div>
              <h5 className="text-white font-medium mb-1">Building & Shell</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Building BUA (sqft):</strong> Pulled automatically from Step 5 Total Building GFA.</li>
                <li><strong className="text-white">Building Rate & Cost:</strong> AI-suggested when available from Phase 2 research.</li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-1">Critical Infrastructure (M&E)</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">IT Load Capacity (MW):</strong> Pulled from Step 5.</li>
                <li><strong className="text-white">M&E Cost per MW — Electrical & Cooling:</strong> Can be manually overridden or reset to benchmark. Calculates total M&E Cost.</li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-1">IT Hardware</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">IT Hardware Provided By:</strong> Choose between <em>Tenant Provides</em> (excluded from developer CapEx) or <em>Operator Provides</em> (included in developer CapEx, but excluded from fees/contingency base).</li>
                <li><strong className="text-white">IT Hardware Cost per MW & Total Cost.</strong></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-medium mb-1">Professional Fees & Contingency</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Professional Fees (%):</strong> Applied to Building + M&E only (from AI research).</li>
                <li><strong className="text-white">Contingency (%):</strong> Applied to Building + M&E only (from AI research).</li>
              </ul>
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
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 10: TDC & Ratio Checks</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            After land is entered, the wizard displays the cost stack as{" "}
            <strong className="text-white">Development Costs (DC)</strong>,{" "}
            <strong className="text-white">Land Cost (LC)</strong>, and{" "}
            <strong className="text-white">Total Development Cost (TDC = DC + LC)</strong>.
            Two institutional guardrail ratios are shown against market- and asset-specific target ranges:
          </p>
          <ul className="space-y-2 text-slate-300 ml-4 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Land / TDC</strong> — land as a share of total development cost.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Development (DC) / TDC</strong> — hard/soft development costs as a share of TDC.</span>
            </li>
          </ul>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-4">
            <h4 className="text-white font-medium mb-2">Example: Data Centre in Malaysia (Penang)</h4>
            <p className="text-sm text-slate-400">
              Target ranges are location- and asset-aware. For a Data Centre in Malaysia (Penang), typical AI
              guardrails are <strong className="text-white">Land / TDC 1–3%</strong> and{" "}
              <strong className="text-white">DC / TDC 97–99%</strong>.
            </p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200 mb-4">
            <strong>TDC Ratio Outside Institutional Range:</strong> Shown when either ratio sits outside its
            target band. You may adjust land or development costs, or proceed anyway — the warning is
            informational, not a hard block.
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            These ratios are simple guardrails. For conventional assets in Malaysia, land typically represents{" "}
            <strong className="text-white">15–25%</strong> of total development cost (the Data Centre example
            above is much more M&amp;E-heavy, so land is a far smaller share).
          </p>
        </div>

        {/* Step 11 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 11: Construction Period (with AI Hint)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Set the overall construction duration in months. This drives the monthly phasing for{" "}
            <strong className="text-white">CC</strong>, <strong className="text-white">SC</strong>, and{" "}
            <strong className="text-white">POWC</strong>.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-4">
            <h4 className="text-white font-medium mb-1">Construction Period (months)</h4>
            <p className="text-sm text-slate-400">
              The field carries an <strong className="text-white">AI badge</strong> and is pre-filled from AI
              research. Edit to override; a reset-to-benchmark control appears when the value differs from the
              AI suggestion.
            </p>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200 mb-4">
            <strong>💡 AI Construction Period Recommendation:</strong> When research has run, a hint box
            justifies the suggested duration in context. Data Centre example:{" "}
            <strong className="text-white">22 months</strong> for a 2-storey, 0-basement Tier IV facility
            accounts for 2N redundancy commissioning, integrated systems testing, and on-net fiber
            connectivity deployment.
          </div>
          <ul className="space-y-2 text-slate-300 ml-4">
            <li>
              <strong className="text-white">Typical construction period ranges:</strong> Hotels 30–48 months,
              Residential 24–36 months, Office 24–42 months.
            </li>
          </ul>
        </div>

        {/* Step 12 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 12: Construction Phasing (S-Curve)</h3>
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

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200 mb-6">
            <strong>💡 How the S-Curve is selected:</strong> The system suggests an appropriate S-Curve based on your
            project&apos;s asset type, location, building configuration, and construction period. In future versions,
            FeasiBuild&apos;s AI Research Engine will analyze comparable projects in your market to calibrate the optimal
            phasing profile. See the <a href="/docs/ai-research" className="text-blue-400 underline">AI Research & Automation</a> section for details.
          </div>

          <h4 className="text-white font-semibold mb-2 mt-4">🖥️ Data Centre Construction Phasing</h4>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            For Data Centres the category curves are <strong className="text-white">auto-generated</strong> (not
            manually selected) and summed month-by-month into the construction schedule used by the financial
            engine (including IT Hardware when the operator provides it).
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div>
              <h5 className="text-white font-medium">Building &amp; Shell</h5>
              <p className="text-sm text-slate-400">Standard S-Curve (15% Early / 35% Mid / 35% Late / 15% Final).</p>
            </div>
            <div>
              <h5 className="text-white font-medium">Critical Infrastructure (M&amp;E)</h5>
              <p className="text-sm text-slate-400">Mid–late loaded (10% Early / 25% Mid / 40% Late / 25% Final).</p>
            </div>
            <div>
              <h5 className="text-white font-medium">IT Hardware</h5>
              <p className="text-sm text-slate-400">Back-loaded (5% Early / 15% Mid / 40% Late / 40% Final).</p>
            </div>
            <p className="text-sm text-slate-400 pt-1">
              Each category distributes <strong className="text-white">100.0%</strong> of its cost across M0
              through the end of the construction period. Fees &amp; contingency are equal-spread on M1–Mn.
            </p>
          </div>

          <h4 className="text-white font-semibold mb-2 mt-6">📦 Warehouse Construction Phasing (S-Curve)</h4>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            For warehouses, <strong className="text-white">four</strong> cost-category curves are auto-generated
            from the construction period and warehouse sub-type (not manually selected). Each distributes{" "}
            <strong className="text-white">100.0%</strong> across M0 through the end of the construction period.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div>
              <h5 className="text-white font-medium">Building &amp; Shell</h5>
              <p className="text-sm text-slate-400">Standard S-Curve (15% Early / 35% Mid / 35% Late / 15% Final).</p>
            </div>
            <div>
              <h5 className="text-white font-medium">Site &amp; Yard Works</h5>
              <p className="text-sm text-slate-400">Front-loaded (40% Early / 30% Mid / 20% Late / 10% Final).</p>
            </div>
            <div>
              <h5 className="text-white font-medium">Loading &amp; Access</h5>
              <p className="text-sm text-slate-400">Mid-Late (10% Early / 20% Mid / 40% Late / 30% Final).</p>
            </div>
            <div>
              <h5 className="text-white font-medium">Specialised Systems</h5>
              <p className="text-sm text-slate-400">Back-loaded (10% Early / 20% Mid / 40% Late / 30% Final).</p>
            </div>
          </div>
        </div>

        {/* Step 13 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 13: Review & Summary</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Confirm cash outflow inputs before generating the model. This step is{" "}
            <strong className="text-white">read-only</strong> — go back to edit values.
          </p>
          <p className="text-slate-300 leading-relaxed mb-3">
            A context-chip row at the top shows location, currency, asset type, building configuration
            shorthand (e.g. <strong className="text-white">0B / 0P / 10F</strong> = basements / podiums /
            occupied floors), and construction duration in months.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h5 className="text-white font-medium mb-2 uppercase tracking-wide text-xs text-slate-500">Land &amp; Building</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Total Land Area (sqft)</strong></li>
                <li><strong className="text-white">Land Cost</strong></li>
                <li><strong className="text-white">Total Building GFA (sqft)</strong></li>
                <li><strong className="text-white">Building / Construction Cost</strong></li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h5 className="text-white font-medium mb-2 uppercase tracking-wide text-xs text-slate-500">Soft Costs &amp; Allowances</h5>
              <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
                <li><strong className="text-white">Soft Costs (SC)</strong> — amount with percentage</li>
                <li><strong className="text-white">POWC</strong> — amount with percentage</li>
                <li><strong className="text-white">FF&amp;E</strong> — amount with percentage (when the asset includes FF&amp;E)</li>
                <li><strong className="text-white">Contingency</strong> — amount with percentage</li>
              </ul>
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-4">
            <h5 className="text-white font-medium mb-2">Headline Total Project Cost (TPC)</h5>
            <p className="text-sm text-slate-400 mb-2">
              The TPC figure is shown with three key ratios:
            </p>
            <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
              <li><strong className="text-white">Cost / sqft</strong> — TPC ÷ total GFA</li>
              <li><strong className="text-white">Land % of TPC</strong></li>
              <li><strong className="text-white">Building % of TPC</strong></li>
            </ul>
          </div>
          <p className="text-slate-300 leading-relaxed mb-3">
            <strong className="text-white">Generate Model →</strong> is now the final button on this step
            (next to <strong className="text-white">← Previous</strong>). It is not a separate wizard step.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-6">
            <h4 className="text-white font-medium mb-2">What happens when you click Generate Model</h4>
            <ol className="space-y-2 text-slate-300 ml-4 list-decimal text-sm">
              <li>Apply the selected S-Curve to phase construction costs across the construction period</li>
              <li>Distribute soft costs, FF&E, and POWC according to their respective phasing schedules</li>
              <li>Place land cost as an upfront outflow (Month 0)</li>
              <li>Generate a month-by-month cash outflow table and cumulative expenditure chart</li>
            </ol>
          </div>

          <h4 className="text-white font-semibold mb-2 mt-4">📦 Warehouse / Industrial — Review &amp; Summary</h4>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            Shows the benchmark chip (e.g.{" "}
            <strong className="text-white">Warehouse / Industrial · Malaysia · Bulk / Distribution · Grade B</strong>)
            and context chips for location, currency, Single Warehouse vs Industrial Park, and construction months.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-4">
            <h5 className="text-white font-medium mb-2">Cost per sqft Breakdown</h5>
            <p className="text-sm text-slate-400 mb-3">
              Every CapEx line is shown with its total amount, its cost per sqft, and a share bar / % of total:
            </p>
            <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
              <li>Building &amp; Shell</li>
              <li>Site &amp; Yard Works</li>
              <li>Common Infrastructure</li>
              <li>Loading &amp; Access</li>
              <li>Specialised Systems</li>
              <li>Professional Fees</li>
              <li>Soft Costs</li>
              <li>POWC</li>
              <li>FF&amp;E</li>
              <li>Contingency</li>
              <li>Land Cost</li>
              <li>
                <strong className="text-white">Total All-In Cost</strong> — total amount + total per-sqft = 100%
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200 mb-6">
            <strong>AI Market Benchmark Recommendation:</strong> Compares{" "}
            <strong className="text-white">Your All-In Cost</strong> (per sqft) against an AI-derived{" "}
            <strong className="text-white">Market Benchmark</strong> range (per sqft). Displays a status (e.g.{" "}
            <strong className="text-white">Significantly above market</strong>) with a suggestion (e.g. review
            land, shell rates, specialised systems, and contingency when materially above peer benchmarks), plus
            an AI commentary paragraph explaining the benchmark context for the specific location and product
            (grade, sub-type, tier market, and what drives the range).
          </div>

          <h4 className="text-white font-semibold mb-2 mt-4">🖥️ Data Centre — Review &amp; Summary</h4>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            Read-only summary of CapEx inputs before generating the model, with context chips for location,
            currency, segment, tier level, and construction period.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-4">
            <h5 className="text-white font-medium mb-2">Total Project Costs Breakdown</h5>
            <p className="text-sm text-slate-400 mb-3">
              Each row shows amount and a % share bar:
            </p>
            <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
              <li>Building &amp; Shell</li>
              <li>Critical Infrastructure (M&amp;E)</li>
              <li>IT Hardware</li>
              <li>Professional Fees</li>
              <li>Contingency</li>
              <li>Land Cost</li>
              <li>FF&amp;E</li>
              <li>Soft Costs</li>
              <li>POWC</li>
              <li><strong className="text-white">Total CapEx (All-In)</strong></li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-4">
            <h5 className="text-white font-medium mb-2">Data Centre KPIs</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p className="text-sm text-slate-400"><strong className="text-white">Cost per MW</strong></p>
              <p className="text-sm text-slate-400"><strong className="text-white">Cost per sqft (white space)</strong></p>
              <p className="text-sm text-slate-400"><strong className="text-white">PUE</strong></p>
              <p className="text-sm text-slate-400"><strong className="text-white">Tier Level</strong></p>
            </div>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
            <strong>AI Market Benchmark Recommendation:</strong> Compares the project&apos;s All-In Cost
            (white space) per sqft against a market benchmark range. Shows{" "}
            <strong className="text-white">Awaiting AI research</strong> until research completes.
          </div>
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