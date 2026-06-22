export default function GettingStarted() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Getting Started</h1>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-emerald-400 mb-3">1. Logging In</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          FeasiBuild uses Clerk for secure authentication. When you first access the platform, you will be prompted to sign in using your email, Google, or GitHub account.
          If you are a beta tester, ensure you are using the email address that was approved for the waitlist.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-emerald-400 mb-3">2. The Dashboard</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Once logged in, you will land on the Dashboard. Here you can see your recent projects, their status (Draft, In Progress, Completed), and key metrics.
        </p>
        <ul className="list-disc list-inside text-slate-400 space-y-2 ml-4">
          <li><span className="text-white font-medium">New Operational Study:</span> For hold assets (Hotels, Retail, Offices).</li>
          <li><span className="text-white font-medium">New Sale Study:</span> For development & sale assets (Residential, Land).</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-emerald-400 mb-3">3. Choosing a Stream</h2>
        <p className="text-slate-300 leading-relaxed">
          The platform is divided into two distinct financial engines. Choose the one that matches your asset type. The Operational Stream is designed for assets that generate recurring income, while the Sale Stream is for assets built to be sold upon completion.
        </p>
      </section>

      {/* AI Powered by puter.js & Qwen */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-emerald-400 mb-4">AI Powered by puter.js & Qwen</h2>
        <p className="text-slate-300 leading-relaxed mb-6">
          FeasiBuild leverages the power of <strong className="text-white">puter.js</strong> and{' '}
          <strong className="text-white">Qwen AI</strong> to deliver intelligent, context-aware feasibility
          studies. Here&apos;s how it works:
        </p>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-3">What is puter.js?</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-3">
              puter.js is a JavaScript SDK that provides seamless access to cloud-based AI services.
              In FeasiBuild, it serves as the bridge between your inputs and the Qwen AI model, enabling
              real-time market research, intelligent defaults, and automated report generation.
            </p>
            <div className="bg-slate-950 rounded p-3 text-xs text-slate-400">
              <p className="mb-1"><strong className="text-emerald-400">Key Capabilities:</strong></p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Real-time AI-powered market research</li>
                <li>Dynamic benchmark calculations</li>
                <li>Contextual narrative generation</li>
                <li>Intelligent scenario calibration</li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-3">What is Qwen AI?</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Qwen is a state-of-the-art large language model developed by Alibaba Cloud. FeasiBuild uses
              Qwen to analyze your project inputs, research market conditions, and generate professional-grade
              feasibility study content. Qwen&apos;s advanced reasoning capabilities ensure accurate, context-aware
              analysis tailored to your specific project.
            </p>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
            <h3 className="text-emerald-400 font-semibold mb-3">🔔 When Will the puter.js Pop-up Appear?</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-3">
              The first time you use an AI-powered feature in FeasiBuild (such as generating a feasibility study
              or accessing AI-researched benchmarks), a puter.js authentication pop-up will appear.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <h4 className="text-white font-medium text-sm mb-1">First-Time Authentication</h4>
                  <p className="text-slate-400 text-xs">
                    You&apos;ll be prompted to sign in or create a free puter.js account. This is required to access
                    the AI services that power FeasiBuild&apos;s intelligent features.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <h4 className="text-white font-medium text-sm mb-1">Subsequent Uses</h4>
                  <p className="text-slate-400 text-xs">
                    After initial authentication, puter.js will remember your session. You won&apos;t see the pop-up
                    again unless you clear your browser data or log out.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <h4 className="text-white font-medium text-sm mb-1">What to Do</h4>
                  <p className="text-slate-400 text-xs mb-2">
                    Simply click &quot;Sign Up&quot; or &quot;Sign In&quot; in the pop-up window and follow the prompts. The process
                    takes less than 2 minutes.
                  </p>
                  <div className="bg-slate-950 rounded p-2 text-xs text-amber-300">
                    <strong>⚠️ Important:</strong> You must complete puter.js authentication to use AI-powered
                    features. Without it, you can still manually input data, but AI research and automated study
                    generation will not be available.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-white font-semibold mb-3">Free Tier vs. Paid Tier</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
                <h4 className="text-slate-300 font-medium mb-2 flex items-center gap-2">
                  <span className="text-lg">🆓</span>
                  Free Tier (puter.js)
                </h4>
                <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
                  <li>Limited AI API calls per month</li>
                  <li>Sufficient for 1-2 feasibility studies</li>
                  <li>Basic market research capabilities</li>
                  <li>Standard report generation</li>
                  <li>Community support</li>
                </ul>
              </div>

              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                <h4 className="text-emerald-400 font-medium mb-2 flex items-center gap-2">
                  <span className="text-lg">⭐</span>
                  Paid Tier (Recommended)
                </h4>
                <ul className="text-sm text-slate-300 space-y-1 ml-4 list-disc">
                  <li>Unlimited AI API calls</li>
                  <li>Unlimited feasibility studies</li>
                  <li>Advanced market research & analytics</li>
                  <li>Priority report generation</li>
                  <li>Priority support</li>
                  <li>Access to premium features</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              <strong>Note:</strong> FeasiBuild itself may have separate pricing. The puter.js tier is for AI
              service access only.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
