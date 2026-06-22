"use client";

import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-slate-950 to-slate-950" />

      <div className="relative mx-auto max-w-7xl text-center">
        <div className="mb-8 inline-flex items-center rounded-full border border-slate-700 bg-slate-800/50 px-4 py-2">
          <span className="mr-2 flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-sm font-medium text-emerald-400">
            Now in Private Beta
          </span>
        </div>

        <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
          The AI-Powered Financial Engine
          <br />
          <span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
            for Real Estate Development
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-3xl text-lg leading-relaxed text-slate-400 md:text-xl">
          Built for developers, investors, financiers, and consultants, FeasiBuild
          transforms raw project data into bankable feasibility studies. AI-powered
          market research, automated financial modeling, and intelligent content
          generation—delivered in institutional format.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/waitlist"
            className="w-full rounded-xl bg-emerald-500 px-8 py-4 text-lg font-bold text-slate-950 shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-600 sm:w-auto"
          >
            Request Beta Access
          </Link>
        </div>

        <div className="mt-16 border-t border-slate-800 pt-8">
          <p className="mb-6 text-sm text-slate-500">
            Trusted by real estate professionals across
          </p>
          <div className="flex flex-wrap justify-center gap-8 opacity-50">
            <div className="font-semibold text-slate-400">UAE</div>
            <div className="font-semibold text-slate-400">Malaysia</div>
            <div className="font-semibold text-slate-400">Australia</div>
            <div className="font-semibold text-slate-400">Hong Kong</div>
            <div className="font-semibold text-slate-400">UK</div>
          </div>
        </div>
      </div>
    </section>
  );
}

