const steps = [
  {
    number: "01",
    title: "Define the Benchmark",
    description:
      "Select asset class, location, segment and scale. Set the macro context that drives market logic and pricing.",
  },
  {
    number: "02",
    title: "Configure the Capital Stack",
    description:
      "Input hard/soft costs, S-curves, financing structures and jurisdiction-specific rules that banks care about.",
  },
  {
    number: "03",
    title: "Generate & Export",
    description:
      "AI compiles the narrative and the engine produces the financials. Download a bankable feasibility deck instantly.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-4 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            From Land Acquisition to Exit Strategy in 3 Steps
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <div className="mb-4 text-6xl font-bold text-slate-800">
                {step.number}
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">{step.title}</h3>
              <p className="leading-relaxed text-slate-400">{step.description}</p>

              {index < steps.length - 1 ? (
                <div className="absolute left-full top-8 hidden h-0.5 w-full bg-gradient-to-r from-emerald-500/20 to-transparent md:block" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

