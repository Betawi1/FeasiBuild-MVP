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
          to produce a comprehensive 10-year Profit & Loss (P&L) statement and key metrics like NOI and EBITDA.
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
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">What This Component Produces</h3>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">10-Year P&L Statement:</strong> Detailed yearly breakdown of revenues and expenses.</span>
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
      </section>

      {/* Steps */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Step-by-Step Walkthrough</h2>

        {/* Step 1 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 1: Primary Revenue Drivers</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Define the core volume and pricing metrics that drive your top-line revenue. The inputs change based on your asset type:
          </p>
          <ul className="space-y-2 text-slate-300 ml-4 list-disc">
            <li><strong className="text-white">Hotels:</strong> Number of Keys (Rooms), Year 1 ADR (Average Daily Rate), Occupancy %, and annual inflation/escalation rates.</li>
            <li><strong className="text-white">Retail/Office:</strong> Gross Leasable Area (GLA), Year 1 Rent (psf/psm), Lease-up period, and stabilized occupancy.</li>
            <li><strong className="text-white">Residential:</strong> Unit mix, average rent per unit, and vacancy rates.</li>
          </ul>
          <p className="text-slate-400 text-sm mt-3 italic">
            Note: The system automatically calculates the stabilized metrics based on your Year 1 inputs and escalation rates.
          </p>
        </div>

        {/* Step 2 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 2: Revenue Mix & Other Income</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Break down your total revenue into its constituent streams. For a hotel, this includes the percentage split between
            Rooms, Food & Beverage, Spa, Telecom, and other departments.
          </p>
          <p className="text-slate-300 leading-relaxed">
            For non-hospitality assets, this step captures ancillary income such as CAM recoveries, parking fees,
            advertising/signage income, and late fees. The sum of all percentages must equal 100%.
          </p>
        </div>

        {/* Step 3 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 3: Direct Costs (Departmental Expenses)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Enter the variable costs directly associated with generating revenue in each department. These are typically expressed
            as a percentage of that department&apos;s revenue.
          </p>
          <ul className="space-y-2 text-slate-300 ml-4 list-disc">
            <li><strong className="text-white">Payroll & Related:</strong> Salaries, benefits, and training for department staff.</li>
            <li><strong className="text-white">Cost of Sales:</strong> Specifically for F&B (cost of food and beverage).</li>
            <li><strong className="text-white">Other Expenses:</strong> Operating supplies, linen, uniforms, and commissions.</li>
          </ul>
        </div>

        {/* Step 4 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 4: Undistributed & Fixed Expenses</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            These are the overhead costs required to run the property, regardless of occupancy or sales volume.
          </p>
          <ul className="space-y-2 text-slate-300 ml-4 list-disc">
            <li><strong className="text-white">Administrative & General (G&A):</strong> Executive office, legal, and insurance.</li>
            <li><strong className="text-white">Sales & Marketing:</strong> Advertising, PR, and sales team salaries.</li>
            <li><strong className="text-white">Property Operations & Maintenance:</strong> Engineering, repairs, and groundskeeping.</li>
            <li><strong className="text-white">Utilities:</strong> Electricity, water, gas, and telecom infrastructure.</li>
            <li><strong className="text-white">Management Fees:</strong> Base fee (typically % of gross revenue) and Incentive fee (% of EBITDA or GOP).</li>
            <li><strong className="text-white">Renovation Provision (FF&E Reserve):</strong> Annual set-aside for future capital replacements (e.g., 3-5% of revenue).</li>
          </ul>
        </div>

        {/* Step 5 */}
        <div className="mb-10 border-l-2 border-emerald-500/30 pl-6">
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Step 5: Depreciation & Working Capital</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            Configure the non-cash accounting entries and cash flow timing assumptions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Depreciation Assumptions</h4>
              <ul className="text-sm text-slate-400 space-y-1 list-disc ml-4">
                <li>Construction Useful Life (e.g., 25-40 years)</li>
                <li>FF&E Useful Life (e.g., 7 years)</li>
                <li>FF&E Renovation Trigger (e.g., 50% replacement at Year 6)</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h4 className="text-white font-medium mb-2">Working Capital</h4>
              <ul className="text-sm text-slate-400 space-y-1 list-disc ml-4">
                <li>Accounts Receivable (e.g., 30 days / 1 month of revenue)</li>
                <li>Accounts Payable (e.g., 30 days / 1 month of expenses)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Outputs */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Outputs & Key Metrics</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Upon completing Component 2, FeasiBuild generates a dynamic 10-year projection table. Key metrics calculated include:
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
