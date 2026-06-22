export default function ProblemSolutionSection() {
  return (
    <section className="bg-slate-900/50 px-4 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Why FeasiBuild?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            Traditional feasibility studies are slow, expensive, and error-prone.
            We fixed that.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-red-900/30 bg-slate-950 p-8">
            <div className="mb-6 flex items-center">
              <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                <span className="text-xl text-red-500">✕</span>
              </div>
              <h3 className="text-xl font-bold text-red-400">The Old Way</h3>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start">
                <span className="mr-3 text-red-500">•</span>
                <span className="text-slate-300">
                  Weeks spent building fragile Excel models
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-red-500">•</span>
                <span className="text-slate-300">
                  Copy-pasting generic, outdated market reports
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-red-500">•</span>
                <span className="text-slate-300">
                  Days lost formatting decks for IC meetings
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-red-500">•</span>
                <span className="text-slate-300">
                  High risk of formula errors and disjointed narratives
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-emerald-900/30 bg-slate-950 p-8">
            <div className="mb-6 flex items-center">
              <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                <span className="text-xl text-emerald-500">✓</span>
              </div>
              <h3 className="text-xl font-bold text-emerald-400">
                The FeasiBuild Way
              </h3>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start">
                <span className="mr-3 text-emerald-500">•</span>
                <span className="text-slate-300">
                  Input project parameters once; engine calculates instantly
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-emerald-500">•</span>
                <span className="text-slate-300">
                  AI analyzes local macro/micro market dynamics in seconds
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-emerald-500">•</span>
                <span className="text-slate-300">
                  Export a 30+ slide institutional deck in PDF today
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-emerald-500">•</span>
                <span className="text-slate-300">
                  Rigorous logic, consistent narrative, and bank-ready formatting
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

