export default function FounderEdgeSection() {
  return (
    <section
      id="about"
      className="bg-gradient-to-b from-slate-900/50 to-slate-950 px-4 py-20"
    >
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <span className="text-3xl text-emerald-500">💡</span>
        </div>

        <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
          Built on 30 Years of Real-World Structuring
        </h2>

        <p className="mb-8 text-lg leading-relaxed text-slate-400">
          FeasiBuild isn’t a generic AI wrapper. The financial logic, multi-jurisdiction
          escrow rules, and cash flow waterfalls are engineered by a veteran who has
          structured sukuks, project finance, and multi-phase developments across
          ASEAN and the Middle East.
        </p>

        <p className="text-lg leading-relaxed text-slate-400">
          We don’t just write code; we speak the language of your investment committee,
          arrangers, and bankers.
        </p>
      </div>
    </section>
  );
}

