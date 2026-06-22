import { Brain, Database, Globe, ShieldCheck } from "lucide-react";

const techFeatures = [
  {
    title: "Advanced Financial Reasoning",
    description:
      "Structured logic specifically tuned for complex real estate calculations, including IRR, DSCR, NPV, and multi-tier cash flow waterfalls.",
    icon: Brain,
  },
  {
    title: "Multi-Jurisdiction Knowledge",
    description:
      "Deeply trained on global real estate regulations, escrow rules (RERA, HDA), and local market dynamics across ASEAN and the Middle East.",
    icon: Globe,
  },
  {
    title: "Institutional Content Generation",
    description:
      "Produces bankable, professional commentary and market analysis that meets the rigorous standards of investment committees and lenders.",
    icon: ShieldCheck,
  },
  {
    title: "Enterprise-Grade Data Processing",
    description:
      "Handles massive datasets, construction S-curves, and operational assumptions with high accuracy and zero hallucination in financial tables.",
    icon: Database,
  },
];

export default function TechnologySection() {
  return (
    <section className="border-y border-slate-800 bg-slate-900/30 px-4 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            TECHNOLOGY STACK
          </div>
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
            Powered by Enterprise-Grade AI
          </h2>
          <p className="text-lg leading-relaxed text-slate-400">
            FeasiBuild leverages{" "}
            <span className="font-semibold text-white">Qwen</span>, an advanced
            large language model with specialized capabilities in financial
            analysis and multi-jurisdiction market research. Qwen&apos;s strong
            performance in structured reasoning and institutional-quality
            content generation ensures every feasibility study meets
            professional underwriting standards.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {techFeatures.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-slate-800 bg-slate-900 p-6 transition-all hover:border-emerald-500/30"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800 transition-colors group-hover:bg-emerald-500/10">
                <feature.icon className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-slate-500">
            Continuously updated with the latest market data, regulatory
            changes, and financial modeling best practices.
          </p>
        </div>
      </div>
    </section>
  );
}
