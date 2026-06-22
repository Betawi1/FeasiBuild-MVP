export default function GeneratingStudyDocs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Documentation</p>
        <h1 className="text-4xl font-bold text-white mb-4">Generating the AI-Powered Feasibility Study</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          Once you complete all components in either the Operational or Sale Stream, FeasiBuild&apos;s AI engine
          synthesizes your inputs, financial results, and market research into a comprehensive, institutional-grade
          feasibility study ready for investor presentations and lender submissions.
        </p>
      </div>

      {/* What's Included */}
      <section>
        <h2 className="text-2xl font-bold text-emerald-400 mb-4">What&apos;s Included in the Study</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          The AI-powered feasibility study is not a generic template—it&apos;s a customized, narrative-driven report
          that tells the story of your specific project with data-backed analysis and professional commentary.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-3">📊 Executive Summary</h3>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>• Project overview and key highlights</li>
              <li>• Total Development Cost (TDC) breakdown</li>
              <li>• Key return metrics (IRR, Equity Multiple)</li>
              <li>• Investment recommendation summary</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-3">📍 Market Analysis</h3>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>• Location and submarket overview</li>
              <li>• Supply and demand dynamics</li>
              <li>• Competitive landscape analysis</li>
              <li>• Market positioning and target demographics</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-3">🏗️ Development Program</h3>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>• Building configuration and specifications</li>
              <li>• Unit mix and area schedules</li>
              <li>• Construction timeline and phasing</li>
              <li>• Key milestones and deliverables</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-3">💰 Financial Analysis</h3>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>• Detailed cost breakdown (land, construction, soft costs)</li>
              <li>• Revenue projections and absorption schedules</li>
              <li>• Financing structure and debt sizing</li>
              <li>• Cash flow projections and funding gap analysis</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-3">📈 Returns & Performance</h3>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>• Unlevered and levered IRR analysis</li>
              <li>• Equity multiple and payback period</li>
              <li>• Sensitivity analysis and scenario testing</li>
              <li>• Benchmark comparisons</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-3">⚠️ Risk Assessment</h3>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>• Market risk analysis</li>
              <li>• Construction and cost overrun risks</li>
              <li>• Sales/absorption risk</li>
              <li>• Mitigation strategies and contingencies</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How AI Generates the Study */}
      <section>
        <h2 className="text-2xl font-bold text-emerald-400 mb-4">How the AI Generates the Study</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          The AI doesn&apos;t just plug numbers into a template—it synthesizes multiple data sources to create
          contextual, project-specific narrative content.
        </p>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-2">Step 1: Data Aggregation</h3>
            <p className="text-sm text-slate-400">
              The AI collects all your inputs from Components 1-6: location, asset type, building specs, cost
              assumptions, revenue projections, financing structure, and scenario analysis results.
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-2">Step 2: Fixed Parameter Framework</h3>
            <p className="text-sm text-slate-400">
              Based on your asset type (e.g., Hotel, Residential High-Rise, Retail Mall), the AI knows exactly
              which sections and topics need to be covered. Each asset type has a pre-defined study structure
              optimized for that specific development type.
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-2">Step 3: Dynamic Content Generation</h3>
            <p className="text-sm text-slate-400">
              The AI writes narrative commentary by combining:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc mt-2">
              <li>Your specific inputs (e.g., &quot;30-month construction period for a 12-floor tower&quot;)</li>
              <li>Financial results (e.g., &quot;The project achieves a levered Equity IRR of 23.95%&quot;)</li>
              <li>Market context (e.g., &quot;Dubai&apos;s high-rise residential market shows strong fundamentals&quot;)</li>
              <li>Industry benchmarks (e.g., &quot;Construction costs of AED 400/sqft are in line with Grade A developments&quot;)</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-2">Step 4: Visual Integration</h3>
            <p className="text-sm text-slate-400">
              The AI automatically generates and embeds charts, graphs, and tables from your financial model:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc mt-2">
              <li>Cash flow projection charts</li>
              <li>Capital stack visualizations</li>
              <li>Sensitivity analysis tornado charts</li>
              <li>Monthly cash flow tables</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Export Options */}
      <section>
        <h2 className="text-2xl font-bold text-emerald-400 mb-4">Export & Distribution Options</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          Once generated, your feasibility study can be exported in multiple formats for different audiences
          and use cases.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <div className="text-3xl mb-3">📄</div>
            <h3 className="text-white font-semibold mb-2">PDF Report</h3>
            <p className="text-sm text-slate-400">
              Full feasibility study in professional PDF format, ready for email distribution or printing.
              Includes all sections, charts, and financial tables.
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-white font-semibold mb-2">PowerPoint Deck</h3>
            <p className="text-sm text-slate-400">
              Executive summary slides optimized for investor presentations. Key metrics, charts, and
              recommendations in a visually compelling format.
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <div className="text-3xl mb-3">📑</div>
            <h3 className="text-white font-semibold mb-2">Excel Model</h3>
            <p className="text-sm text-slate-400">
              The underlying financial model with all calculations, assumptions, and cash flow projections
              in a transparent, auditable spreadsheet format.
            </p>
          </div>
        </div>
      </section>

      {/* Sample Output */}
      <section>
        <h2 className="text-2xl font-bold text-emerald-400 mb-4">Sample Output Pages</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          Here&apos;s what you can expect from the AI-generated feasibility study:
        </p>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
            <div className="bg-slate-950 px-5 py-3 border-b border-slate-800">
              <h4 className="text-white font-medium">Executive Summary Page</h4>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-400 mb-3">
                <strong className="text-white">Project:</strong> Residential High-Rise Development - Dubai Marina
              </p>
              <p className="text-sm text-slate-400 mb-3">
                <strong className="text-white">Investment Highlights:</strong>
              </p>
              <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
                <li>Total Development Cost: AED 157.4M with projected GDV of AED 180.7M</li>
                <li>Levered Equity IRR of 23.95% significantly exceeds the 15% hurdle rate</li>
                <li>Equity multiple of 1.36x with payback achieved by Month 35</li>
                <li>Peak funding gap of AED 76.8M efficiently structured with 65% LTC financing</li>
              </ul>
              <p className="text-sm text-slate-400 mt-3">
                <em className="text-slate-500">[AI-generated narrative continues with market context and recommendations...]</em>
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
            <div className="bg-slate-950 px-5 py-3 border-b border-slate-800">
              <h4 className="text-white font-medium">Financial Summary Table</h4>
            </div>
            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 text-slate-400">Metric</th>
                      <th className="text-right py-2 text-slate-400">Value</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-slate-800">
                      <td className="py-2">Total Development Cost</td>
                      <td className="text-right font-mono">AED 157,442,609</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2">Net Sales Proceeds</td>
                      <td className="text-right font-mono text-emerald-400">AED 164,262,047</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2">Net Surplus</td>
                      <td className="text-right font-mono text-emerald-400">AED 6,819,438</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2">Unlevered Project IRR</td>
                      <td className="text-right font-mono">4.63%</td>
                    </tr>
                    <tr>
                      <td className="py-2">Levered Equity IRR</td>
                      <td className="text-right font-mono text-emerald-400 font-bold">23.95%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-2xl font-bold text-emerald-400 mb-4">Tips for Best Results</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Complete All Components First</h4>
            <p className="text-sm text-slate-400">
              The AI needs complete data from all 6 components to generate a comprehensive study. Don&apos;t skip
              steps—even optional fields like preference shares improve the accuracy of the financing narrative.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Review Scenario Analysis</h4>
            <p className="text-sm text-slate-400">
              Run the Scenario Analysis (Component 6) before generating the study. The AI will incorporate
              your downside and upside cases into the risk assessment section.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Customize Key Assumptions</h4>
            <p className="text-sm text-slate-400">
              While AI provides excellent defaults, manually reviewing and adjusting key assumptions
              (sales price, construction costs, financing terms) ensures the study reflects your
              specific project vision.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="text-white font-medium mb-1">Export in Multiple Formats</h4>
            <p className="text-sm text-slate-400">
              Use PDF for formal submissions to lenders/investors, PowerPoint for presentations, and Excel
              for detailed due diligence requests. Each format serves a different purpose.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
