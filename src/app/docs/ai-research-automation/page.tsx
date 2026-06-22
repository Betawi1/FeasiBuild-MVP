export default function AIResearchDocs() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">Documentation</p>
        <h1 className="text-4xl font-bold text-white mb-4">AI Research & Automation</h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          FeasiBuild is not just a calculator; it is an AI-powered feasibility engine. From the moment you select
          a location and asset type, AI works in the background to research market benchmarks, calibrate financial
          models, and generate institutional-grade commentary.
        </p>
        <div className="mt-6 p-4 rounded-lg border border-blue-500/30 bg-blue-500/5 text-sm text-blue-200">
          <strong>MVP vs. Production:</strong> This page clearly distinguishes between what the AI does in the
          current MVP (using pre-researched static databases) and what it will do in the Production version
          (conducting dynamic, real-time market research).
        </div>
      </div>

      {/* Core Pillars */}
      <div className="space-y-12">

        {/* Pillar 1 */}
        <section>
          <h2 className="text-2xl font-bold text-emerald-400 mb-4">1. Market Research & Smart Defaults (Components 1 & 2)</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            The foundation of any feasibility study is accurate market data. FeasiBuild&apos;s AI engine analyzes your
            initial inputs (Country, City, Asset Type, Segment, and Positioning) to automatically populate default
            values for construction rates, land costs, revenue benchmarks, and operating expense ratios.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-1 rounded bg-amber-500/20 text-amber-400">MVP</span>
                Pre-Researched Placeholders
              </h3>
              <p className="text-sm text-slate-400">
                In the MVP, the AI has already conducted extensive market research. When you select &quot;Residential - High-Rise - Dubai&quot;,
                the system pulls pre-calculated, static benchmark values from our curated database (e.g., ADCB Project Database).
                These serve as highly accurate starting anchors.
              </p>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
              <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">PRODUCTION</span>
                Dynamic Real-Time Research
              </h3>
              <p className="text-sm text-slate-400">
                In Production, the AI will conduct live market research the moment you make your selections. It will scrape
                and analyze current transaction data, construction cost indices, and rental comparables to generate
                bespoke, up-to-the-minute placeholder values and S-Curve phasing profiles.
              </p>
            </div>
          </div>
        </section>

        {/* Pillar 2 */}
        <section>
          <h2 className="text-2xl font-bold text-emerald-400 mb-4">2. Contextual AI Hints & Guardrails</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Beyond just filling in numbers, the AI acts as a junior analyst, providing contextual guidance and
            validating your inputs against institutional norms.
          </p>
          <ul className="space-y-3 text-slate-300 ml-4">
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Rule-of-Thumb Recommendations:</strong> In Component 1 (e.g., Construction Period), the AI analyzes your building configuration (e.g., 12 tower floors) and suggests a realistic timeline range (e.g., 24-36 months).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Allocation Benchmarks:</strong> In Component 1 Step 13, the AI suggests precise percentage splits for Soft Costs and POWC based on your specific asset class.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Financial Guardrails:</strong> The AI defines &quot;safe&quot; thresholds (e.g., Land/TDC target ≤ 51%, Minimum DSCR 1.4x) and flags when your inputs breach market norms.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-1">•</span>
              <span><strong className="text-white">Override Tracking:</strong> When you manually change an AI-populated field, the system highlights it with an &quot;amber border&quot; to maintain a clear audit trail of AI defaults vs. user overrides.</span>
            </li>
          </ul>
        </section>

        {/* Pillar 3 */}
        <section>
          <h2 className="text-2xl font-bold text-emerald-400 mb-4">3. Automated Feasibility Study Generation</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Once the financial model is complete, the AI synthesizes all your inputs, selections, and financial
            results into a comprehensive, narrative-driven Feasibility Study.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-3">How it Works:</h3>
            <p className="text-sm text-slate-400 mb-3">
              The AI does not just dump data into a template. It uses a fixed parameter framework—meaning it knows
              exactly which slides and topics need to be covered for a specific asset type. It then dynamically writes
              the content by combining:
            </p>
            <ul className="text-sm text-slate-400 space-y-2 ml-4 list-disc">
              <li><strong className="text-white">User Inputs:</strong> Location, asset positioning, and specific design choices.</li>
              <li><strong className="text-white">Financial Results:</strong> The actual IRRs, multiples, and cash flow outputs from Components 1-6.</li>
              <li><strong className="text-white">Market Commentary:</strong> AI-researched context about the specific sub-market (e.g., Dubai Marina high-rise trends).</li>
              <li><strong className="text-white">Risk Factors:</strong> Automatically generated risk matrices based on the scenario analysis.</li>
            </ul>
            <p className="text-sm text-slate-400 mt-4">
              <em>(Note: This capability is fully operational in the current MVP version.)</em>
            </p>
          </div>
        </section>

        {/* Pillar 4 */}
        <section>
          <h2 className="text-2xl font-bold text-emerald-400 mb-4">4. Intelligent Scenario Calibration (Component 6)</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Stress-testing a project requires realistic assumptions about how markets move. The AI calibrates the
            &quot;Downside&quot; and &quot;Upside&quot; scenario presets based on historical volatility for your specific asset class and region.
          </p>
          <p className="text-sm text-slate-400">
            For example, a &quot;Downside&quot; shock for a Dubai Residential High-Rise will apply different percentage drops
            to Sales Price and Velocity than a &quot;Downside&quot; shock for a Malaysian Landed development. The AI ensures
            your stress tests reflect actual market behavior, not arbitrary guesses.
          </p>
        </section>

      </div>
    </div>
  );
}
