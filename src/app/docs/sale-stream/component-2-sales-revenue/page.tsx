export default function SaleComponent2Docs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Sale Stream</p>
        <h1 className="text-4xl font-bold text-white mb-4">Component 2: Sales Revenue & Cash Inflows</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          The Sales Revenue component models how you will monetize the development through unit sales.
          Unlike the Operational Stream&apos;s recurring rental income, this component captures one-time sales
          revenue with complex payment structures, buyer financing, and sales velocity curves that determine
          when cash flows into the project.
        </p>
        <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
          <strong>Key Difference from Operational Stream:</strong> Revenue comes from selling units (one-time
          transactions) rather than renting them (recurring monthly income). Payment timing is tied to
          construction milestones and buyer financing structures.
        </div>
      </div>

      {/* Overview */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Component 2 walks you through 8 sequential steps to model your complete sales strategy and revenue
          structure. The component calculates gross sales revenue, applies realistic deductions (commissions,
          VAT, discounts), and generates a monthly cash inflow schedule that aligns with your construction
          timeline from Component 1.
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">What This Component Produces</h3>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Monthly Sales Revenue Schedule:</strong> Cash inflows phased according to sales uptake curve and payment plans</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Gross to Net Reconciliation:</strong> Gross sales minus deductions (VAT, commissions, discounts, defaults)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Buyer Mix Analysis:</strong> Cash buyers vs. mortgage buyers with different payment structures</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Funding Gap Analysis:</strong> Peak cash shortfall before sales revenue covers development costs</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Steps */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Step-by-Step Walkthrough</h2>

        {/* Step 1 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 1: Saleable BUA Ratio</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Define the proportion of total built-up area (BUA) that is actually saleable. Not all constructed
            area generates revenue — common areas, corridors, plant rooms, and amenities are necessary but
            non-revenue-generating spaces.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Saleable BUA Ratio (% of total BUA)</h4>
            <p className="text-sm text-slate-400 mb-3">
              Typical residential/office projects range from <strong className="text-white">70-90%</strong> saleable
              BUA depending on corridor and core efficiency. High-rise luxury towers often have lower ratios
              (70-80%) due to larger common areas, while mid-rise buildings can achieve 85-90%.
            </p>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-500">
                <strong className="text-white">Calculation:</strong><br />
                Saleable BUA = Total Building BUA × (Saleable BUA Ratio / 100)<br />
                Example: 147,208 sqft × 86% = <strong className="text-emerald-400">126,599 sqft saleable</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 2: Average Sales Price</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Set the blended average sales price per square foot for saleable units. This should reflect a
            weighted average across different unit types (studios, 1BR, 2BR, 3BR, etc.) and their respective
            market prices.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-2">Average Sales Price (AED/sqft)</h4>
            <p className="text-sm text-slate-400 mb-3">
              Use market comparables and AI-researched benchmarks to determine your average price. In production,
              this will be dynamically researched based on your location, building type, and market positioning.
            </p>
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-xs text-emerald-300 font-medium mb-1">Unadjusted Sales Revenue (Gross)</p>
              <p className="text-xs text-slate-400">
                Based on total building BUA from Component 1, saleable BUA ratio, and average sales price.
                Deductions (VAT, commissions, defaults) are applied in later steps.
              </p>
              <div className="mt-2 text-xs text-slate-500">
                <p>Total Building BUA: <strong className="text-white">147,208 sqft</strong></p>
                <p>Saleable BUA: <strong className="text-white">126,599 sqft</strong></p>
                <p>Average Price: <strong className="text-white">1,500 AED/sqft</strong></p>
                <p className="mt-2">Gross Sales Revenue: <strong className="text-emerald-400">AED 189,898,320</strong></p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 3: Payment Plan — Cash Buyers</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Define the payment structure for cash buyers (buyers who pay without mortgage financing).
            Percentages must sum to 100% of gross sales value.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div>
              <h4 className="text-white font-medium">Down Payment (%)</h4>
              <p className="text-sm text-slate-400">
                Initial payment received at booking/signing. Typically <strong className="text-white">10-20%</strong> for off-plan sales.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">During Construction (%)</h4>
              <p className="text-sm text-slate-400">
                Progress payments collected during the construction period. Typically <strong className="text-white">60-80%</strong>,
                often tied to construction milestones (e.g., foundation completion, structure completion, handover).
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium">On Handover (%)</h4>
              <p className="text-sm text-slate-400">
                Final payment upon project completion and handover. Typically <strong className="text-white">10-20%</strong>.
              </p>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-500">
                <strong className="text-white">Example:</strong> 10% down / 70% during construction / 20% on handover<br />
                For a 1,000,000 AED unit: 100,000 AED at booking, 700,000 AED during construction, 200,000 AED at handover
              </p>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 4: Payment Plan — Mortgage Buyers</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Define the down payment and mortgage assumptions for leveraged buyers. Mortgage buyers typically
            pay a smaller down payment directly to the developer, with the remainder financed through a bank mortgage.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div>
              <h4 className="text-white font-medium">Buyer Down Payment (Direct to Developer)</h4>
              <p className="text-sm text-slate-400 mb-2">
                The portion of the unit price paid directly by the buyer to the developer (not financed).
              </p>
              <ul className="text-xs text-slate-500 space-y-1 ml-4 list-disc">
                <li><strong>Total Down Payment Amount:</strong> Fixed amount (e.g., 100,000 AED)</li>
                <li><strong>Received Over (Months):</strong> Typically M0-M2 (3 months) for booking and installments</li>
                <li><strong>Down Payment (% of unit price):</strong> Percentage (e.g., 10%)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium">Mortgage Terms</h4>
              <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
                <li><strong className="text-white">Mortgage Tenor (years):</strong> Loan duration (typically 15-25 years)</li>
                <li><strong className="text-white">LTV (% of value financed):</strong> Loan-to-value ratio (typically 80-90% for expats, up to 95% for nationals)</li>
                <li><strong className="text-white">Mortgage Rate (% p.a.):</strong> Interest rate on the mortgage (typically 4-6% in UAE)</li>
              </ul>
            </div>
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-xs text-emerald-300 font-medium mb-1">Treatment: Down Payment is 100% Direct to Developer</p>
              <p className="text-xs text-slate-400">
                The down payment is collected directly by the developer (not escrowed). The mortgage portion
                is paid by the bank to the developer, typically at handover or according to construction
                milestones depending on the mortgage structure.
              </p>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 5: Sales Uptake Schedule</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Choose a preset sales curve or provide a custom monthly uptake profile. This determines how quickly
            units are sold over the sales period, which directly impacts cash flow timing.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Front-loaded</h4>
              <p className="text-sm text-slate-400">
                <strong className="text-emerald-400">Strong launch / early sales</strong><br />
                Aggressive sales in the first 6-12 months, then tapering off. Common for well-located projects
                with strong marketing and pre-launch campaigns.
              </p>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h4 className="text-emerald-400 font-medium mb-2">Even Over Sales Period ✓</h4>
              <p className="text-sm text-slate-400">
                <strong className="text-white">Steady, consistent sales</strong><br />
                Linear sales velocity throughout the sales period. Conservative assumption suitable for most
                mid-market residential projects.
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Back-loaded</h4>
              <p className="text-sm text-slate-400">
                <strong className="text-amber-400">Slower start, stronger finish</strong><br />
                Conservative early sales with acceleration as construction progresses and buyers gain confidence.
                Common for speculative developments or challenging markets.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-200">
            <strong>Manual Monthly Profile:</strong> For advanced users, you can provide a custom month-by-month
            sales uptake curve. This is useful for phased developments or projects with unique sales patterns.
          </div>
        </div>

        {/* Step 6 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 6: Buyer Mix & Deductions</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Define the mix between cash and mortgage buyers, and headline deductions from gross sales. These
            deductions significantly impact net developer proceeds and must be modeled accurately.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-3">Buyer Mix</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400">Cash Buyers (% of units)</label>
                  <p className="text-xs text-slate-500 mb-1">Buyers who pay without mortgage financing</p>
                  <input type="number" value="40" readOnly className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Mortgage Buyers (% of units)</label>
                  <p className="text-xs text-slate-500 mb-1">Buyers who finance through bank mortgages</p>
                  <input type="number" value="60" readOnly className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-3">Deductions</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400">Agent / Broker Commission (% of GV)</label>
                  <p className="text-xs text-slate-500 mb-1">Typically 2-3% in UAE</p>
                  <input type="number" value="2" readOnly className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">VAT on Sales (% of GV)</label>
                  <p className="text-xs text-slate-500 mb-1">5% in UAE (if applicable)</p>
                  <input type="number" value="5" readOnly className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Escrow / Collection Fees (% of GV)</label>
                  <p className="text-xs text-slate-500 mb-1">Typically 1-2%</p>
                  <input type="number" value="1" readOnly className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Average Sales Discount (% of list price)</label>
                  <p className="text-xs text-slate-500 mb-1">Negotiated discounts from asking price</p>
                  <input type="number" value="3" readOnly className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
            <strong>⚠️ Impact on Net Proceeds:</strong> These deductions can total <strong className="text-white">10-15%</strong> of
            gross sales value. For a 200M AED project, this means 20-30M AED in deductions — a critical factor
            in project feasibility.
          </div>
        </div>

        {/* Step 7 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 7: Default Rate & Bulk Sales</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Capture expected buyer defaults and bulk / institutional sales. These are important risk factors
            that affect net revenue and cash flow timing.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Default Rate (% of gross sales)</h4>
              <p className="text-sm text-slate-400 mb-2">
                Expected percentage of buyers who fail to complete their purchase.
              </p>
              <p className="text-xs text-slate-500">
                Typical range: <strong className="text-white">2-5%</strong> for off-plan residential.
                Higher in economic downturns or for speculative investors.
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Bulk Sales Share (% of units)</h4>
              <p className="text-sm text-slate-400 mb-2">
                Percentage of units sold in bulk to institutional investors or investment groups.
              </p>
              <p className="text-xs text-slate-500">
                Typical range: <strong className="text-white">5-15%</strong>. Bulk sales provide
                certainty but at discounted prices.
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Bulk Sales Discount (% off list)</h4>
              <p className="text-sm text-slate-400 mb-2">
                Discount offered to bulk buyers in exchange for purchasing multiple units.
              </p>
              <p className="text-xs text-slate-500">
                Typical range: <strong className="text-white">5-10%</strong> discount from list price.
              </p>
            </div>
          </div>
        </div>

        {/* Step 8 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 8: Sales Launch Timing & Summary</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Choose when sales begin relative to construction, and review the complete cash inflows summary.
          </p>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-4">
            <h4 className="text-white font-medium mb-3">Sales Launch Timing</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400">Sales Launch (months before construction start)</label>
                <p className="text-xs text-slate-500 mb-1">
                  For GCC off-plan projects, launches often occur up to 6-12 months before or around construction start.
                </p>
                <input type="number" value="6" readOnly className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
              </div>
              <div>
                <label className="text-sm text-slate-400">Pre-launch Sales (% of total)</label>
                <p className="text-xs text-slate-500 mb-1">
                  Used to model reservation/EOI collections before full launch.
                </p>
                <input type="number" value="10" readOnly className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-3">Summary: Cash Inflows (Sale Assets)</h4>
            <div className="p-4 rounded bg-slate-950 border border-slate-800 mb-4">
              <h5 className="text-sm font-semibold text-emerald-400 mb-2">GROSS TO NET PROCEEDS RECONCILIATION</h5>
              <p className="text-xs text-slate-500 mb-3">
                This shows how gross sales are adjusted for discounts, commissions, VAT, defaults and bulk sales
                to arrive at net developer proceeds.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Gross Sales (unadjusted):</span>
                  <span className="text-white font-mono">AED 189,898,320</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Less Discounts & Deductions:</span>
                  <span className="text-amber-400 font-mono">AED 25,636,273</span>
                </div>
                <div className="flex justify-between py-2 bg-emerald-500/10 rounded px-2">
                  <span className="text-white font-medium">Net Proceeds:</span>
                  <span className="text-emerald-400 font-mono font-bold">AED 164,262,047</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-500 mb-1">Broker Commission: <span className="text-amber-400">AED 3,797,966</span></p>
                  <p className="text-slate-500 mb-1">VAT: <span className="text-amber-400">AED 9,494,916</span></p>
                  <p className="text-slate-500 mb-1">Escrow Fees: <span className="text-amber-400">AED 1,898,983</span></p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Sales Discounts: <span className="text-amber-400">AED 5,696,950</span></p>
                  <p className="text-slate-500 mb-1">Defaults: <span className="text-amber-400">AED 3,797,966</span></p>
                  <p className="text-slate-500 mb-1">Bulk Sales Discount: <span className="text-amber-400">AED 949,492</span></p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-500 mb-1">Path: <span className="text-white">Sale Assets (Residential / Office / Retail)</span></p>
                <p className="text-slate-500 mb-1">Saleable BUA Ratio: <span className="text-white">86%</span></p>
                <p className="text-slate-500 mb-1">Average Price: <span className="text-white">1,500 AED/sqft</span></p>
                <p className="text-slate-500 mb-1">Buyer Mix: <span className="text-white">40% cash / 60% mortgage</span></p>
                <p className="text-slate-500 mb-1">Launch Offset: <span className="text-white">6 months (pre-launch 10%)</span></p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Cash Plan (Down / During / Handover): <span className="text-white">10% / 70% / 20%</span></p>
                <p className="text-slate-500 mb-1">Mortgage (LTV / Rate / Tenor): <span className="text-white">90% / 5% p.a. / 20 years</span></p>
                <p className="text-slate-500 mb-1">Deductions: <span className="text-white">2% commission, 5% VAT, 1% escrow, 3% discount</span></p>
                <p className="text-slate-500 mb-1">Default & Bulk: <span className="text-white">2% default, 10% bulk @ 5% discount</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Output */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Output: Cash Flow Preview — Pre-Financing</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Upon completing Component 2, FeasiBuild generates a comprehensive monthly cash flow preview combining
          Components 1 (outflows) and 2 (inflows). This shows your project&apos;s cash position before financing
          (debt/equity) is applied.
        </p>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Monthly Cash Flows Table</h3>
          <p className="text-sm text-slate-400 mb-4">
            The table shows monthly cash inflows (Unit Sales, Bulk Sales) and outflows (Land, Construction,
            Soft Costs, POWC) from M0 through the construction period.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Cost Item</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">M0</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">M1</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">M2</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">...</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800 bg-emerald-500/5">
                  <td className="py-2 px-3 text-emerald-400 font-medium">CASH INFLOWS</td>
                  <td className="py-2 px-3 text-right" colSpan={5}></td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-3 pl-6 text-white">Unit Sales</td>
                  <td className="py-2 px-3 text-right text-emerald-400">14,783,584</td>
                  <td className="py-2 px-3 text-right text-emerald-400">199,778</td>
                  <td className="py-2 px-3 text-right text-emerald-400">399,556</td>
                  <td className="py-2 px-3 text-right text-slate-500">...</td>
                  <td className="py-2 px-3 text-right text-emerald-400">164,262,047</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-3 pl-6 text-white">Bulk Sales</td>
                  <td className="py-2 px-3 text-right text-emerald-400">1,642,620</td>
                  <td className="py-2 px-3 text-right text-emerald-400">22,198</td>
                  <td className="py-2 px-3 text-right text-emerald-400">44,395</td>
                  <td className="py-2 px-3 text-right text-slate-500">...</td>
                  <td className="py-2 px-3 text-right text-emerald-400">16,426,205</td>
                </tr>
                <tr className="border-b border-slate-800 bg-slate-950">
                  <td className="py-2 px-3 text-white font-medium">TOTAL INFLOW</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-medium">16,426,205</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-medium">221,976</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-medium">443,951</td>
                  <td className="py-2 px-3 text-right text-slate-500">...</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-bold">164,262,047</td>
                </tr>
                <tr className="border-b border-slate-800 bg-red-500/5">
                  <td className="py-2 px-3 text-red-400 font-medium">CASH OUTFLOWS</td>
                  <td className="py-2 px-3 text-right" colSpan={5}></td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-3 pl-6 text-white">Land Cost</td>
                  <td className="py-2 px-3 text-right text-red-400">48,577,650</td>
                  <td className="py-2 px-3 text-right text-slate-600">—</td>
                  <td className="py-2 px-3 text-right text-slate-600">—</td>
                  <td className="py-2 px-3 text-right text-slate-500">...</td>
                  <td className="py-2 px-3 text-right text-red-400">48,577,650</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-3 pl-6 text-white">Construction Cost</td>
                  <td className="py-2 px-3 text-right text-slate-600">—</td>
                  <td className="py-2 px-3 text-right text-red-400">735,296</td>
                  <td className="py-2 px-3 text-right text-red-400">1,113,448</td>
                  <td className="py-2 px-3 text-right text-slate-500">...</td>
                  <td className="py-2 px-3 text-right text-red-400">87,794,322</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-2 px-3 pl-6 text-white">Soft Costs</td>
                  <td className="py-2 px-3 text-right text-red-400">8,340,461</td>
                  <td className="py-2 px-3 text-right text-red-400">5,004,276</td>
                  <td className="py-2 px-3 text-right text-red-400">3,336,184</td>
                  <td className="py-2 px-3 text-right text-slate-500">...</td>
                  <td className="py-2 px-3 text-right text-red-400">16,680,921</td>
                </tr>
                <tr className="border-b border-slate-800 bg-slate-950">
                  <td className="py-2 px-3 text-white font-medium">Total Outflow</td>
                  <td className="py-2 px-3 text-right text-red-400 font-medium">57,444,877</td>
                  <td className="py-2 px-3 text-right text-red-400 font-medium">6,986,252</td>
                  <td className="py-2 px-3 text-right text-red-400 font-medium">4,993,957</td>
                  <td className="py-2 px-3 text-right text-slate-500">...</td>
                  <td className="py-2 px-3 text-right text-red-400 font-bold">157,442,609</td>
                </tr>
                <tr className="border-b border-slate-800 bg-blue-500/5">
                  <td className="py-2 px-3 text-blue-400 font-medium">NET CASH FLOW</td>
                  <td className="py-2 px-3 text-right text-blue-400 font-medium">-41,018,672</td>
                  <td className="py-2 px-3 text-right text-red-400 font-medium">-6,764,276</td>
                  <td className="py-2 px-3 text-right text-red-400 font-medium">-4,550,006</td>
                  <td className="py-2 px-3 text-right text-slate-500">...</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-bold">6,819,438</td>
                </tr>
                <tr className="bg-slate-950">
                  <td className="py-2 px-3 text-white font-medium">CUMULATIVE NCF</td>
                  <td className="py-2 px-3 text-right text-red-400 font-medium">-41,018,672</td>
                  <td className="py-2 px-3 text-right text-red-400 font-medium">-47,782,948</td>
                  <td className="py-2 px-3 text-right text-red-400 font-medium">-52,332,953</td>
                  <td className="py-2 px-3 text-right text-slate-500">...</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-bold">6,819,438</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-400 font-bold text-sm uppercase tracking-wide">⚠️ Fixed Assumption: 6-Month Post-Completion Period</span>
          </div>
          <p className="text-sm text-slate-300 mb-3 leading-relaxed">
            The cash flow preview automatically extends <strong className="text-white">6 months beyond the construction period</strong> (e.g., months M31–M36 if construction ends at M30). This period is critical for capturing the final phase of cash collections.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="rounded-md bg-slate-900/50 p-3 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 font-semibold mb-1">Cash Inflows (Sales Proceeds)</p>
              <p className="text-xs text-slate-400">
                <strong className="text-white">Continue mapping</strong> over the construction period + the 6-month post-completion period. This captures final handover payments, mortgage disbursements from banks, and any delayed collections from buyers.
              </p>
            </div>
            <div className="rounded-md bg-slate-900/50 p-3 border border-red-500/20">
              <p className="text-xs text-red-400 font-semibold mb-1">Cash Outflows (Construction)</p>
              <p className="text-xs text-slate-400">
                <strong className="text-white">Stop mapping</strong> at the end of the construction period. All construction costs, soft costs, and POWC are fully expended by the final construction month. Outflows are 0 during the post-completion period.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 italic">
            This period often shows a positive net cash flow as sales collections exceed zero outflows, helping to close the funding gap before financing costs are applied in Component 3.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
            <p className="text-sm text-emerald-400">Total Inflows</p>
            <p className="text-xl font-bold text-emerald-400">AED 164,262,047</p>
          </div>
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4">
            <p className="text-sm text-red-400">Total Outflows</p>
            <p className="text-xl font-bold text-red-400">AED 157,442,609</p>
          </div>
          <div className="rounded-lg bg-slate-900 border border-slate-700 p-4">
            <p className="text-sm text-slate-400">Net Surplus (Pre-Financing)</p>
            <p className="text-xl font-bold text-white">AED 6,819,438</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
            <p className="text-sm text-amber-400">Funding Gap</p>
            <p className="text-xl font-bold text-amber-400">AED 56,617,672</p>
            <p className="text-xs text-slate-500 mt-1">Peak negative cumulative NCF (Max funding req)</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <strong>⚠️ Funding Gap Analysis:</strong> The funding gap (peak negative cumulative NCF) represents
          the maximum cash shortfall during development before sales revenue covers costs. This is the amount
          that must be financed through debt and/or equity. In this example, AED 56.6M is needed at the peak
          (typically early in construction when land is paid but sales are minimal).
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Tips & Best Practices</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Be Conservative with Sales Uptake</h4>
            <p className="text-sm text-slate-400">
              Overly optimistic sales velocity is the #1 cause of cash flow shortfalls in development projects.
              Use the &quot;Even&quot; or &quot;Back-loaded&quot; curve unless you have strong evidence for front-loaded sales
              (e.g., prime location, pre-launch commitments, strong brand).
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Model Realistic Deductions</h4>
            <p className="text-sm text-slate-400">
              Don&apos;t underestimate deductions — they can total 10-15% of gross sales. Always include VAT (if
              applicable), broker commissions (2-3%), escrow fees, and realistic sales discounts (3-5%).
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Pre-Launch Sales Reduce Funding Gap</h4>
            <p className="text-sm text-slate-400">
              Starting sales 6 months before construction and achieving 10-20% pre-launch sales can significantly
              reduce your peak funding requirement, lowering financing costs and equity needs.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Balance Cash vs. Mortgage Buyer Mix</h4>
            <p className="text-sm text-slate-400">
              Cash buyers provide faster, more certain cash flows but may demand discounts. Mortgage buyers
              pay closer to asking price but introduce bank approval delays and higher default risk. A 40/60
              or 50/50 mix is typical for mid-market residential.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <a href="/docs/sale-stream/component-1-cash-outflows" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          ← Component 1: Development Financials
        </a>
        <a href="/docs/sale-stream/component-3-project-irr" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          Component 3: Project IRR →
        </a>
      </div>
    </div>
  );
}
