export default function Component2Docs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Operational Stream</p>
        <h1 className="text-4xl font-bold text-white mb-4">Component 2: Cash Inflows (Operating Financials)</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          Component 2 models the operational performance of your asset over the holding period (typically 10 years).
          It calculates revenue streams, departmental expenses, fixed overheads, and working capital requirements
          to produce a comprehensive 10-year Profit &amp; Loss (P&amp;L) statement and key metrics like NOI and EBITDA.
        </p>
      </div>

      {/* Overview */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          While Component 1 focuses on the capital expenditure (CapEx) to build the asset, Component 2 focuses on the
          operational expenditure (OpEx) and revenue generation (OpInc). The system automatically suggests benchmark
          percentages for expenses based on your asset type, segment, and location, but all fields are fully editable.
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-4">
          <h3 className="text-lg font-semibold text-white mb-3">What This Component Produces</h3>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">10-Year P&amp;L Statement:</strong> Detailed yearly breakdown of revenues and expenses.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Net Operating Income (NOI):</strong> Revenue minus all operating expenses (before debt service and depreciation).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">EBITDA:</strong> Earnings Before Interest, Taxes, Depreciation, and Amortization.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Working Capital Schedule:</strong> Accounts Receivable and Payable impacts on cash flow.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-4">
          <h3 className="text-lg font-semibold text-white mb-3">How This Page Is Organized</h3>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            The wizard has <strong className="text-white">5 steps for Hotel</strong> and{' '}
            <strong className="text-white">4 steps for Warehouse, Retail / Shopping Mall, Office, Residential BTR, and Data Centre</strong>.
            To keep step-level help working, this page keeps exactly one heading per wizard step number; inside each step,
            per-asset blocks describe the exact inputs for that asset type.
          </p>
          <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc">
            <li><strong className="text-white">Hotel:</strong> 1 Primary Revenue → 2 Revenue Mix → 3 Direct Costs → 4 Undistributed &amp; Fixed → 5 Depreciation &amp; Working Capital.</li>
            <li><strong className="text-white">All other assets:</strong> 1 Primary Revenue → 2 Revenue Mix / Other Income → 3 Operating Expenses → 4 Depreciation &amp; Working Capital.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">UI Mechanics (All Assets)</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Benchmark chip:</strong> Identifies the active benchmark set (asset · market · segment / grade · positioning), e.g. &quot;Warehouse / Industrial · UAE · Light Manufacturing · Grade B&quot;.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">AI badge:</strong> Value pre-filled from AI research — edit to override.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Amber border / Override badge:</strong> Manually overridden cell. Every card has a reset link (&quot;Reset rental&quot;, &quot;Reset to benchmark&quot;, etc.) that restores the AI / benchmark value.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Default badge:</strong> Rule-engine default (not AI-researched).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Locked fields (🔒):</strong> Quantities inherited from Component 1 (mostly the Component 1 Step 5 building configuration and Step 6 CapEx bases). To change them, go back to Component 1.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Cross-step syncs:</strong> Some cards read values from another step (e.g. warehouse recoveries sync from the OpEx step). Each sync is called out in the asset blocks below.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Steps */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Step-by-Step Walkthrough</h2>

        {/* Step 1 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 1: Primary Revenue Drivers</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Define the core volume and pricing metrics that drive top-line revenue. The inputs differ by asset type;
            each block below lists the exact fields shown in the wizard.
          </p>

          <h4 className="text-white font-semibold mb-2 mt-4">🏨 Hotel — Room Revenues</h4>
          <ul className="space-y-2 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Total Keys / Rooms:</strong> Locked from Component 1 Step 5.</li>
            <li><strong className="text-white">ADR Year 1:</strong> AI-suggested, overridable; <strong className="text-white">ADR inflation (annual %)</strong> (AI) rolls forward Years 2–10 with the formula Year t = Year 1 ADR × (1 + inflation%)^(t−1).</li>
            <li><strong className="text-white">Occupancy Year 1 (%)</strong> and <strong className="text-white">Occupancy % increment p.a.</strong> (auto-fills Years 2–10 unless you override a specific year).</li>
            <li><strong className="text-white">Editable 10-year table:</strong> ADR and occupancy per year (editing a cell locks it with an amber border), room revenue per year, notes column, and the 10-year total room revenue; a projected room revenue chart follows.</li>
            <li><strong className="text-white">Resets:</strong> Reset ADR to formula, Reset ADR to benchmark, Reset occupancy to defaults.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">📦 Warehouse / Industrial — Rent &amp; Lease-Up</h4>
          <ul className="space-y-2 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Rental revenue:</strong> Total GFA (sqft) locked from Component 1 Step 5; Occupancy Rate (%) — Stabilized (AI); Rate per sqft / year (AI); Annual Rent Escalation % (AI); Lease-Up Period (years) (AI); Average Free Rent (months) (Default).</li>
            <li><strong className="text-white">Annual Gross Rent (Year 1)</strong> = GFA × Y1 occupancy (lease-up) × rate × free-rent factor.</li>
            <li><strong className="text-white">Other rental income:</strong> Yard / Hardstand Area (locked from Component 1 Step 5) × Yard Rate (AI) → Annual Yard Revenue; Parking — Cars and Parking — Trailers: spaces (from Component 1 Step 5) × Rate / month (AI).</li>
            <li><strong className="text-white">Resets:</strong> Reset rental, Reset other income.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🖥️ Data Centre — Primary Revenue</h4>
          <ul className="space-y-2 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li>IT load, GFA, and white space are locked from the Component 1 building configuration.</li>
            <li><strong className="text-white">Power Capacity Revenue:</strong> Total IT Load (kW) (from Component 1, MW × 1,000); Rate per kW / month (AI, wholesale colo lease rate) → Monthly Power Revenue (IT Load × Rate) → Annual Power Revenue (×12); Annual Escalation % (AI, applied to power and space rates from Year 2).</li>
            <li><strong className="text-white">Space Revenue:</strong> Total Building GFA and White Space Area (locked); Occupancy Rate % (AI, stabilized white-space occupancy); Rate per sqft / month — White Space (AI) → Monthly Space Revenue (White Space × Occupancy × Rate) → Annual (×12).</li>
            <li><strong className="text-white">Total Annual Revenue (Year 1)</strong> = Annual Power + Annual Space (stabilized inputs; the 10-year table shows lease-up Year 1).</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🏢 Office — Base Rent &amp; Lease-Up (office + ground-floor retail)</h4>
          <ul className="space-y-2 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Office portion:</strong> Gross Leasable Area (GLA) locked from Component 1 Step 5; Average Office Rent psf — Year 1 (AI, overridable); Annual Rent Escalation % (AI); Leased % at Opening; Target Leased %; Lease-Up Period (years); Average Free Rent (months).</li>
            <li><strong className="text-white">Retail portion (ground floor to G+2):</strong> Retail GLA; Average Retail Rent psf — Year 1 (AI); Annual Rent Escalation % (AI); Leased % at Opening; Target Leased %; Lease-Up Period (years); Average Free Rent (months).</li>
            <li><strong className="text-white">Include Percentage Rent? toggle:</strong> Average Retail Sales psf (AI), Annual Sales Growth %, Percentage Rent Rate % (AI), Breakpoint Type (Natural = Rent × Multiple), Breakpoint Multiple.</li>
            <li><strong className="text-white">Resets:</strong> Reset office, Reset retail.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🛍️ Retail / Shopping Mall — Base Rent &amp; Lease-Up</h4>
          <ul className="space-y-2 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li>Gross Leasable Area (GLA) locked from Component 1 Step 5; Base rent Year 1 (psf p.a.) (AI); Rent escalation (annual %) (AI); Leased occupancy Year 1 %; Stabilized leased occupancy %; Lease-up period (years) with a linear ramp from Year 1 to stabilized.</li>
            <li>Base rent Year t = Year 1 × (1 + escalation%)^(t−1); revenue = GLA × rent × leased %.</li>
            <li><strong className="text-white">Editable 10-year table:</strong> base rent and leased % per year (amber = override), base rent revenue per year, 10-year total; projected base rent chart.</li>
            <li><strong className="text-white">Resets:</strong> Reset rent to formula, Reset lease-up to defaults.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🏠 Residential BTR — Lease / Rent Income</h4>
          <ul className="space-y-2 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Residential portion:</strong> Residential GLA locked from Component 1 Step 5; Avg blended residential rent psf — Year 1 (AI, overridable); Annual residential rent escalation % (AI, overridable); Leased % at opening; Target leased % (stabilized); Residential lease-up period (months); Average vacancy rate after stabilization %; Bad debt / rent loss %.</li>
            <li><strong className="text-white">Retail portion (ground floor, optionally G+1):</strong> Retail GLA; Average retail rent psf — Year 1; Annual retail rent escalation %; Leased % at opening; Target leased %; Retail lease-up period (years); Average free rent (months).</li>
            <li><strong className="text-white">Include percentage rent for retail? toggle.</strong></li>
            <li><strong className="text-white">Resets:</strong> Reset residential, Reset retail.</li>
          </ul>
        </div>

        {/* Step 2 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 2: Revenue Mix &amp; Other Income</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Hotel uses a revenue-mix model (departmental percentages of total hotel revenue). All other assets model
            income beyond base rent — recoveries, parking, and ancillary fees — with explicit syncs from other steps.
          </p>

          <h4 className="text-white font-semibold mb-2 mt-4">🏨 Hotel — F&amp;B and Other Sources of Revenues</h4>
          <ul className="space-y-2 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li>Total hotel revenue = room revenue ÷ (rooms % ÷ 100); every other stream = total × its category %. Shows Year 1 and 10-year room revenue carried from the room revenue step.</li>
            <li><strong className="text-white">Mix percentages (must sum to 100%):</strong> Rooms, Food, Beverage, Room service, Telecom / other, Spa &amp; health, Rental &amp; other — all AI-suggested.</li>
            <li>Reset % to benchmark; 10-Year Total Hotel Revenue Projection table.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">📦 Warehouse — Other Income</h4>
          <ul className="space-y-2 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Sync banner:</strong> values sync from the Operating Expenses step (C2S3); if that step has not been visited yet, provisional OpEx from AI / benchmarks is used. Shows Total Annual Revenue from C2S1.</li>
            <li><strong className="text-white">1. CAM Recoveries:</strong> Total CAM Expenses (from OpEx = Maintenance + Landscaping + Utilities + Security + Management Fee) × CAM Recovery % (AI, % billed to tenants).</li>
            <li><strong className="text-white">2. Tax Recoveries:</strong> Estimated Property Tax (from OpEx) × Property Tax Recovery % (AI).</li>
            <li><strong className="text-white">3. Insurance Recoveries:</strong> Total Insurance (from OpEx) × Insurance Recovery % (AI).</li>
            <li><strong className="text-white">4. Advertising / Signage:</strong> annual signage revenue (AI).</li>
            <li>Total Other Income = CAM + Tax Recovery + Insurance Recovery + Signage.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🖥️ Data Centre — Other Income</h4>
          <ul className="space-y-2 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li>Rack count and IT load are locked from Component 1.</li>
            <li><strong className="text-white">Cross-Connect Fees:</strong> Number of Racks (from Component 1 Step 5) × Cross-Connect Rate (MYR / rack / month) (AI) × 12.</li>
            <li><strong className="text-white">Metered Power (Pass-Through):</strong> Total IT Load (kW) × Power Pass-Through (per kWh) (AI) × Utilisation % (AI) × 8,760.</li>
            <li><strong className="text-white">Maintenance Markup:</strong> Maintenance Cost <em>synced from OpEx / store</em> × Markup % (AI).</li>
            <li><strong className="text-white">Installation / Setup Fees:</strong> Number of New Racks (Year 1) (AI) × Setup Fee (per rack) (AI) — Year 1 only in the projection.</li>
            <li>Total Annual Other Income = Cross-Connect + Metered Power + Maintenance Markup + Installation.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🏢 Office — Other Income</h4>
          <ul className="space-y-2 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Parking Income:</strong> Total Parking Spaces locked from Component 1 Step 5 (formula: (Basement BUA + Podium BUA) ÷ 350); spaces reserved for office tenants × Monthly Pass Price (AI) × Office Pass Occupancy %; retail hourly parking = Retail Hourly Rate × Avg Daily Hours × Retail Spaces (typically total − office reserved) × Retail Utilization % × 365 operating days.</li>
            <li><strong className="text-white">CAM &amp; Tax Recoveries:</strong> CAM expenses synced from the Operating Expenses step (some UI copy labels this source &quot;Step 4&quot; — it is the OpEx step); Property Tax % and Insurance % of gross rental revenue (AI) applied to base rent; Recovery Rate % (% billed to tenants).</li>
            <li><strong className="text-white">Advertising / Signage:</strong> rate per sqft GLA / year (AI) × total GLA.</li>
            <li>10-year other income table.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🛍️ Retail / Shopping Mall — Other Mall Income</h4>
          <ul className="space-y-2 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">1. Percentage Rent (Overage):</strong> Avg Tenant Sales psf — Year 1 (AI), Annual Sales Growth %, Percentage Rent Rate % (AI), Breakpoint Type (Natural = Rent × Multiple), Breakpoint Multiple (with a worked example).</li>
            <li><strong className="text-white">2. CAM &amp; Tax Recoveries:</strong> CAM Expenses (AI), Property Tax % and Insurance % of gross rental revenue (AI, applied to base rent each year), Recovery Rate % (AI, % billed to tenants, vacancy/caps adjusted).</li>
            <li><strong className="text-white">3. Parking Income:</strong> Total Parking Spaces locked from Component 1 Step 5 ((Basement BUA + Podium BUA) ÷ 350) × Revenue / Space / Day (AI) × Utilization % × 365 days.</li>
            <li><strong className="text-white">4. Advertising, Kiosks, Events:</strong> rate per sqft GLA / year (AI) × total GLA.</li>
            <li>10-year other income table.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🏠 Residential BTR — Other Income</h4>
          <ul className="space-y-2 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li>All lines scale with the effective leased % from C2S1. The header shows derived counts: parking spaces ((Parking BUA + Basement) ÷ 350) and estimated units (Residential GLA ÷ 800 sqft / unit).</li>
            <li><strong className="text-white">Parking income:</strong> Monthly parking fee per space × Parking uptake (% of units renting a space); Annual = spaces × fee × 12 × uptake × leased %.</li>
            <li><strong className="text-white">Amenity fees (gym, pool, lounge):</strong> Monthly amenity fee per unit × Amenity uptake (% of tenants paying).</li>
            <li><strong className="text-white">Utility recoveries (sub-metering):</strong> Monthly utility recovery per unit (AI) × Utility uptake (% of units with sub-meter) (AI).</li>
            <li><strong className="text-white">Other fees (storage, pets, etc.):</strong> Annual other fees per unit (Default) × Other fee uptake (% of units) (Default).</li>
            <li>10-year other income table.</li>
          </ul>
        </div>

        {/* Step 3 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 3: Direct Costs (Hotel) / Operating Expenses (Other Assets)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            For Hotel, this step is <strong className="text-white">Direct Costs</strong> — variable departmental expenses
            driven by the Step 2 revenue mix. For all other assets, it is <strong className="text-white">Operating Expenses</strong> —
            the property-level OpEx stack. Every rate carries an AI badge (or Default badge) and a per-card reset link.
          </p>

          <h4 className="text-white font-semibold mb-2 mt-4">🏨 Hotel — Direct Costs</h4>
          <p className="text-sm text-slate-400 mb-2">
            Revenue streams from the Step 2 mix drive direct costs: each line is revenue × cost % for that department.
            F&amp;B payroll and other apply to the combined food + beverage + room service revenue. Defaults match your
            hotel segment and location.
          </p>
          <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Rooms — payroll</strong> and <strong className="text-white">Rooms — other:</strong> % of room revenue.</li>
            <li><strong className="text-white">Food — cost of sales</strong> (% of food revenue); <strong className="text-white">Beverage — cost of sales</strong> (% of beverage revenue).</li>
            <li><strong className="text-white">F&amp;B — payroll</strong> and <strong className="text-white">F&amp;B — other:</strong> % of F&amp;B revenue (food + beverage + room service).</li>
            <li><strong className="text-white">Telecom, Spa &amp; health, Rental &amp; other depts.:</strong> % of their respective revenues.</li>
            <li>Reset % to benchmark.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">📦 Warehouse — Operating Expenses</h4>
          <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Property Taxes:</strong> rate (% of CapEx, AI) on Total CapEx auto-populated from Component 1.</li>
            <li><strong className="text-white">Insurance:</strong> rate (% of CapEx, AI) on the same CapEx base.</li>
            <li><strong className="text-white">Maintenance &amp; Repairs:</strong> rate (% of building cost, AI) on Total Building Cost from Component 1.</li>
            <li><strong className="text-white">Landscaping (Common Area):</strong> Common Area (sqft) auto-populated from Component 1 Step 5 × Landscaping Rate (per sqft / year) (AI).</li>
            <li><strong className="text-white">Utilities (Common Area):</strong> Total GFA × Utility Rate (per sqft / year) (AI).</li>
            <li><strong className="text-white">Security:</strong> flat annual cost (AI).</li>
            <li><strong className="text-white">Management Fee</strong> and <strong className="text-white">G&amp;A:</strong> % of total annual revenue (AI).</li>
            <li>Footer: <strong className="text-white">Total Operating Expenses</strong> and OpEx as % of revenue (industrial parks typically run higher OpEx ratios).</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🖥️ Data Centre — Operating Expenses</h4>
          <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Power Cost (Facility Load):</strong> IT Load (kW) × PUE × 8,760 × Electricity Price (per kWh) (AI).</li>
            <li><strong className="text-white">Maintenance &amp; Repairs:</strong> rate (% of M&amp;E, AI) on the M&amp;E CapEx base from Component 1; <em>synced to the Other Income step for the maintenance markup</em>.</li>
            <li><strong className="text-white">Labor &amp; Staffing:</strong> Number of Staff (AI) × Average Salary (AI).</li>
            <li><strong className="text-white">Insurance &amp; Property Tax:</strong> Insurance Rate and Property Tax Rate (% of CapEx, AI) on Component 1 Total CapEx.</li>
            <li><strong className="text-white">Security &amp; Water / Utilities:</strong> flat annual amounts (AI).</li>
            <li><strong className="text-white">G&amp;A &amp; Management Fee:</strong> % of total annual revenue from the primary revenue step (AI).</li>
            <li>Footer: Total Annual OpEx (Year 1).</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🏢 Office — Operating Expenses</h4>
          <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">CAM:</strong> fixed base rate (per psf of BUA / year, AI) × total BUA from Component 1, plus variable rate (per psf × blended leased %, AI) × office + retail GLA × blended effective leased % (weights office and retail GLA from the rent step, including free-rent in Year 1).</li>
            <li><strong className="text-white">Property Tax &amp; Insurance:</strong> % of gross rental revenue (AI), applied to office + retail rent each year.</li>
            <li><strong className="text-white">Marketing &amp; G&amp;A:</strong> % of total revenue (base rent + other income) (AI).</li>
            <li><strong className="text-white">Management Fee:</strong> base % of total revenue (AI).</li>
            <li><strong className="text-white">Renovation / Capex Provision:</strong> Year 1 / Year 2 / Years 3–10 % of EGI (AI).</li>
            <li>10-year expenses table.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🛍️ Retail / Shopping Mall — Operating Expenses</h4>
          <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">A. CAM:</strong> fixed base rate (per psf of BUA / year, AI) × total BUA from Component 1, plus variable rate (per psf of leased GLA, AI) × leased GLA from the rent step. Total CAM = (fixed × BUA) + (variable × leased GLA).</li>
            <li><strong className="text-white">B. Property Tax &amp; Insurance:</strong> % of gross rental revenue (AI), applied to base rent each year.</li>
            <li><strong className="text-white">C. Marketing &amp; G&amp;A:</strong> % of total revenue (base rent + other income) (AI).</li>
            <li><strong className="text-white">D. Management Fee:</strong> base % of total revenue (AI).</li>
            <li><strong className="text-white">E. Renovation / Capex Provision:</strong> Year 1 / Year 2 / Years 3–10 % of revenue (AI); any year&apos;s amount can be overridden directly in the table.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🏠 Residential BTR — Operating Expenses</h4>
          <p className="text-sm text-slate-400 mb-2">
            Expenses are primarily fixed or per-unit (gross lease — no CAM recoveries).
          </p>
          <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Property Management:</strong> fee % of EGI (Default); EGI = Net Rent (rent step) + Other Income (other income step).</li>
            <li><strong className="text-white">Maintenance &amp; Repairs:</strong> % of Residential GLA / year (AI), applied to Residential GLA from the rent step.</li>
            <li><strong className="text-white">Utilities (Common Areas + Vacant Units):</strong> % of common area + vacant GLA / year (AI), applied to {"(BUA − GLA) + (GLA × (100% − leased %))"} — includes retail area and vacant units.</li>
            <li><strong className="text-white">Property Tax &amp; Insurance:</strong> % of gross rental revenue (AI), applied to residential + retail rent each year.</li>
            <li><strong className="text-white">Marketing &amp; Leasing:</strong> % of EGI (AI) — advertising, leasing staff, tenant acquisition.</li>
            <li><strong className="text-white">G&amp;A:</strong> % of gross rental revenue (AI).</li>
            <li><strong className="text-white">Renovation / Capex Reserve:</strong> % of total GLA / year (AI) — for unit turnover and appliance replacement.</li>
          </ul>
        </div>

        {/* Step 4 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 4: Undistributed &amp; Fixed Expenses (Hotel) / Depreciation &amp; Working Capital (Other Assets)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            For Hotel, this step is the overhead stack (undistributed &amp; fixed expenses). For the other five assets,
            wizard step 4 is <strong className="text-white">Depreciation, Amortization &amp; Working Capital</strong> — see the per-asset blocks below.
          </p>

          <h4 className="text-white font-semibold mb-2 mt-4">🏨 Hotel — Undistributed &amp; Fixed Expenses</h4>
          <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li>Undistributed lines use <strong className="text-white">total hotel revenue</strong> from the revenue mix step: G&amp;A, Marketing &amp; sales, Property operations &amp; maintenance, Utilities, and Renovation provision (Year 1 / Year 2 / Years 3–10), all % of total hotel revenue (AI).</li>
            <li><strong className="text-white">Base management fee:</strong> % of room revenue (AI).</li>
            <li><strong className="text-white">Incentive fee:</strong> % of EBITDA net of fee (AI); when the fee is a % of net EBITDA (after the fee), the system solves fee = r ÷ (1 + r) × EBITDA before incentive. Direct costs from the direct costs step feed that EBITDA.</li>
            <li>Reset % to benchmark.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">📦 Warehouse — Depreciation, Amortization &amp; Working Capital</h4>
          <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Bases from Component 1:</strong> Construction Cost (Building &amp; Shell); Site Improvements Cost (Yard + Loading + Common Infra); FF&amp;E Cost.</li>
            <li><strong className="text-white">Assumptions (AI):</strong> Building Useful Life, Site Improvements Life, FF&amp;E Useful Life (years); FF&amp;E Reserve (% of revenue); Accounts Receivable (days); Accounts Payable (days).</li>
            <li>Resets: Reset depreciations, Reset WC.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🖥️ Data Centre — Depreciation, Amortization &amp; Working Capital</h4>
          <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Bases from Component 1 CapEx:</strong> Building Cost, M&amp;E Cost, IT Hardware Cost.</li>
            <li><strong className="text-white">Useful lives (AI):</strong> Building, M&amp;E, IT Hardware; FF&amp;E Reserve (% of revenue) (AI). Annual building / M&amp;E / IT hardware depreciation lines plus Total Annual Depreciation &amp; Amortization.</li>
            <li><strong className="text-white">Working Capital:</strong> A/R days (AI) on auto total revenue; A/P days (AI) on auto total OpEx → Net Working Capital (A/R − A/P, Year 1 basis from C2S1 revenue and C2S3 OpEx).</li>
            <li>Resets: Reset depreciations, Reset WC.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🏢 Office — Depreciation, Amortization &amp; Working Capital</h4>
          <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Bases from Component 1:</strong> Construction Cost; FFE Base; Office TI Allowance (e.g. 100 / sqft × office GLA); Retail TI Allowance (e.g. 167 / sqft × retail GLA); Office and Retail Leasing Commissions.</li>
            <li><strong className="text-white">Assumptions (AI):</strong> Construction Useful Life; FFE Useful Life; FFE Renovation (% of cost) at Year 6; Office / Retail TI Useful Life; Office / Retail Leasing Commission Life; Accounts Receivable (months of revenue); Accounts Payable (months of opex).</li>
            <li>Resets: Reset deprec, Reset TI/comm, Reset WC.</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🛍️ Retail / Shopping Mall — Depreciation, Amortization &amp; Working Capital</h4>
          <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Bases from Component 1:</strong> Construction Cost; FFE Base; Tenant Improvements (TI) Allowance (benchmark default 10% of construction); Leasing Commissions Capitalized (benchmark default 3.5% of construction).</li>
            <li><strong className="text-white">Assumptions (AI):</strong> Construction Useful Life (straight-line); FFE Useful Life; FFE Renovation (% of initial) at Year 6 (capitalized at Year 6, amortized over remaining life); TI Useful Life (lease term or building life); Leasing Commissions Life (matches average lease term); Accounts Receivable (months of revenue); Accounts Payable (months of opex).</li>
            <li>10-year D&amp;A + working capital table (const. deprec., FFE deprec., TI amort., leasing comm., total D&amp;A, A/R, A/P, net WC).</li>
          </ul>

          <h4 className="text-white font-semibold mb-2 mt-4">🏠 Residential BTR — Depreciation &amp; Working Capital</h4>
          <ul className="space-y-1 text-sm text-slate-400 ml-4 list-disc mb-3">
            <li><strong className="text-white">Bases from Component 1:</strong> Construction Cost; FFE (Appliances, Fixtures, A/C). Note: residential typically has no separate tenant improvements — finishes are included in construction cost.</li>
            <li><strong className="text-white">Assumptions (AI):</strong> Construction Useful Life (straight-line); FFE Useful Life; FFE Renovation (% of initial) at Year 6 (capitalized at Year 6, amortized over remaining life); Accounts Receivable (months of revenue — rent collected monthly); Accounts Payable (months of opex — expenses paid monthly).</li>
            <li>Resets: Reset depreciation, Reset WC. 10-year depreciation &amp; working capital table.</li>
          </ul>
        </div>

        {/* Step 5 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 5: Depreciation &amp; Working Capital (Hotel Only)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Hotel-only step. Construction and FF&amp;E bases come from Component 1. FFE is straight-lined over its useful
            life; from Year 6 an extra FFE tranche equal to the renovation % of initial FFE is capitalized and amortized
            over the same life. Working capital uses revenue from the revenue mix step and total opex from the
            undistributed &amp; fixed step.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Depreciation Assumptions</h4>
              <ul className="text-sm text-slate-400 space-y-1 list-disc ml-4">
                <li>Construction Useful Life (years) (AI) — straight-line on Component 1 construction cost</li>
                <li>FFE Useful Life (years) (AI) — straight-line on Component 1 FFE</li>
                <li>FFE Renovation (vs initial FFE) % (AI) — capitalized at Year 6, then amortized</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Working Capital</h4>
              <ul className="text-sm text-slate-400 space-y-1 list-disc ml-4">
                <li>Accounts Receivable (months of total hotel revenue) (AI)</li>
                <li>Accounts Payable (months of total operating expenses) (AI)</li>
              </ul>
            </div>
          </div>
          <p className="text-slate-400 text-sm mt-3">
            A 10-year depreciation &amp; working capital table shows construction depreciation, FFE depreciation, total
            depreciation, A/R, A/P, and net WC per year. Reset to benchmark restores all assumptions.
          </p>
        </div>
      </section>

      {/* Outputs */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Outputs &amp; Key Metrics</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Upon completing Component 2, FeasiBuild generates a dynamic 10-year projection. Each step also ends in its own
          10-year table (room / base rent revenue, other income, expenses, depreciation &amp; working capital) that feeds
          the P&amp;L preview. Key metrics calculated include:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900">
              <tr>
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3">Definition</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-800">
                <td className="px-4 py-3 font-medium text-white">Total Revenue</td>
                <td className="px-4 py-3">Sum of all departmental and ancillary income.</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="px-4 py-3 font-medium text-white">GOP (Gross Operating Profit)</td>
                <td className="px-4 py-3">Total Revenue minus Departmental and Undistributed Expenses.</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="px-4 py-3 font-medium text-white">NOI (Net Operating Income)</td>
                <td className="px-4 py-3">GOP minus Management Fees, Property Taxes, and Insurance.</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="px-4 py-3 font-medium text-white">EBITDA</td>
                <td className="px-4 py-3">NOI minus Ground Rent (if applicable). Used for debt service coverage calculations.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <a href="/docs/operational-stream/component-1-cash-outflows" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          ← Component 1: Cash Outflows
        </a>
        <a href="/docs/operational-stream/project-irr" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          Component 3: Project IRR →
        </a>
      </div>
    </div>
  );
}
