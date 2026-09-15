import type { Metadata } from "next";
import Link from "next/link";
import { faqs, type Faq } from "@/content/faq/faqs";

export const metadata: Metadata = {
  title: "Real Estate Feasibility Study FAQ | FeasiBuild",
  description:
    "Straight answers to the questions developers, valuers and lenders ask most about feasibility studies — DSCR, IRR, waterfalls, appraisals, pricing and data privacy.",
};

const GROUP_ORDER: Faq["group"][] = [
  "Basics",
  "Metrics",
  "Comparisons",
  "Product",
];

function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export default function FaqPage() {
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: faqs.filter((faq) => faq.group === group),
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd()).replace(/</g, "\\u003c"),
        }}
      />

      <header className="mb-14 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
          FAQ
        </p>
        <h1 className="mb-4 text-3xl font-bold leading-tight text-white md:text-5xl">
          Feasibility Study FAQ
        </h1>
        <p className="text-base leading-relaxed text-slate-400 md:text-lg">
          Straight answers for developers, valuers and financiers.
        </p>
      </header>

      <div className="space-y-14">
        {grouped.map(({ group, items }) => (
          <section key={group}>
            <h2 className="mb-6 text-2xl font-semibold text-white">{group}</h2>
            <div className="space-y-8">
              {items.map((faq) => (
                <div key={faq.question}>
                  <h3 className="mb-3 text-lg font-semibold leading-snug text-white">
                    {faq.question}
                  </h3>
                  <p className="text-base leading-relaxed text-slate-300">
                    {faq.answer}
                  </p>
                  {faq.link ? (
                    <Link
                      href={faq.link.href}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                    >
                      {faq.link.label}
                      <span aria-hidden="true">→</span>
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-16 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-8 text-center">
        <p className="text-lg font-medium text-white">
          Still deciding? Run your first study free.
        </p>
        <Link
          href="/sign-up"
          className="mt-5 inline-flex rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
        >
          Try FeasiBuild free
        </Link>
      </section>
    </div>
  );
}
