import {
  BrainCircuit,
  Building2,
  Calculator,
  FileText,
  GitCompare,
  RefreshCw,
} from "lucide-react";

const features = [
  {
    title: "AI Market Intelligence",
    description:
      "Generate macro and micro-market commentary tailored to your city, segment, and positioning—ready for investment committees.",
    icon: BrainCircuit,
  },
  {
    title: "Institutional Financial Model",
    description:
      "Automated cash flows, waterfalls, debt schedules, IRR/NPV, DSCR—built for real underwriting workflows.",
    icon: Calculator,
  },
  {
    title: "Bankable Feasibility Decks",
    description:
      "Export a consistent, professionally formatted 30+ slide narrative with charts, tables, and metrics in minutes.",
    icon: FileText,
  },
  {
    title: "Scenario & Sensitivity",
    description:
      "Compare base / upside / downside scenarios with clear drivers so stakeholders understand risk, not just outputs.",
    icon: GitCompare,
  },
  {
    title: "Multi-Asset Support",
    description:
      "Hotel, mall, office, residential rentals and sale developments—using asset-specific assumptions and outputs.",
    icon: Building2,
  },
  {
    title: "Fast Iteration Loops",
    description:
      "Change assumptions and regenerate only the affected sections—so you can iterate like a modern product team.",
    icon: RefreshCw,
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Institutional-Grade Capabilities
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            Everything you need to create bankable feasibility studies
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={feature.title}
                className="group rounded-xl border border-slate-800 bg-slate-900 p-6 transition-all hover:border-emerald-500/50"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800 transition-colors group-hover:bg-emerald-500/10">
                  <IconComponent className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white transition-colors group-hover:text-emerald-400">
                  {feature.title}
                </h3>
                <p className="leading-relaxed text-slate-400">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
