"use client";

import Link from "next/link";

export default function CTASection() {
  return (
    <section className="px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-12 text-center shadow-2xl">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Ready to streamline your development appraisals?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-400">
            Join our exclusive beta program and be among the first to deploy
            FeasiBuild on your next project.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/sign-up"
              className="rounded-xl bg-emerald-500 px-8 py-4 text-lg font-bold text-slate-950 shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-600"
            >
              Get Early Access
            </Link>
          </div>

          <p className="mt-6 text-sm text-slate-500">
            Free for beta testers • No credit card required
          </p>
        </div>
      </div>
    </section>
  );
}