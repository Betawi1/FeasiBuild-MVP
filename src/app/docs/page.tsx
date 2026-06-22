import Link from 'next/link';

export default function DocsHome() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-white mb-4">FeasiBuild Documentation</h1>
      <p className="text-lg text-slate-400 leading-relaxed mb-8">
        FeasiBuild is an AI-powered feasibility study platform that transforms raw project data into bankable,
        institutional-grade financial models and narrative reports. Whether you&apos;re developing a hotel, residential
        tower, retail mall, or mixed-use project, FeasiBuild guides you through a structured component-based workflow—
        from development costs and revenue modeling to financing structure and scenario analysis—then uses AI to
        generate a comprehensive feasibility study ready for investors and lenders.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/docs/getting-started" className="rounded-lg border border-slate-700 bg-slate-900 p-6 hover:border-emerald-500/50 transition">
          <h3 className="text-white font-semibold mb-2">Getting Started</h3>
          <p className="text-sm text-slate-400">How to log in, navigate the dashboard, and choose your study stream.</p>
        </Link>

        <Link href="/docs/operational-stream" className="rounded-lg border border-slate-700 bg-slate-900 p-6 hover:border-emerald-500/50 transition">
          <h3 className="text-white font-semibold mb-2">Operational Stream</h3>
          <p className="text-sm text-slate-400">A complete guide to modeling hold assets like Hotels, Retail, and Offices.</p>
        </Link>

        <Link href="/docs/sale-stream" className="rounded-lg border border-slate-700 bg-slate-900 p-6 hover:border-emerald-500/50 transition">
          <h3 className="text-white font-semibold mb-2">Sale Stream</h3>
          <p className="text-sm text-slate-400">Model development-for-sale projects: Residential Towers, Landed Properties, and Commercial Strata.</p>
        </Link>

        <Link href="/docs/ai-research-automation" className="rounded-lg border border-slate-700 bg-slate-900 p-6 hover:border-emerald-500/50 transition">
          <h3 className="text-white font-semibold mb-2">AI Research & Automation</h3>
          <p className="text-sm text-slate-400">How AI powers market research, smart defaults, and automated study generation.</p>
        </Link>

        <Link href="/docs/generating-the-study" className="rounded-lg border border-slate-700 bg-slate-900 p-6 hover:border-emerald-500/50 transition md:col-span-2">
          <h3 className="text-white font-semibold mb-2">Generating the Study</h3>
          <p className="text-sm text-slate-400">How the AI generates commentary and how to export your final report.</p>
        </Link>
      </div>
    </div>
  );
}
