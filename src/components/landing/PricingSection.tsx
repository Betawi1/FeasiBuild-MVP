import { Fragment } from "react";
import Link from "next/link";

const Check = () => (
  <svg
    className="h-4 w-4 shrink-0 text-emerald-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const Cross = () => (
  <svg
    className="h-4 w-4 shrink-0 text-slate-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

type Cell = boolean | string;

const tiers = [
  {
    name: "Explorer",
    price: "$0",
    priceNote: "Free forever",
    tagline: "Test the full engine before you commit.",
    cta: "Start Free",
    highlight: false,
    features: [
      "Lifetime platform access",
      "Both streams: Operational & Sale",
      "All asset classes (incl. Data Centre & Warehouse)",
      "Pin-drop location intelligence",
      "Live AI market research",
      "Standard scenario analysis + Tornado chart",
      "1 watermarked feasibility report",
      "24/7 AI Support Concierge (Telegram)",
    ],
  },
  {
    name: "Professional",
    price: "$99",
    priceNote: "One-time • Lifetime access",
    tagline: "Pay-as-you-use for working professionals.",
    cta: "Get Lifetime Access",
    highlight: true,
    badge: "Most Popular",
    features: [
      "Everything in Explorer",
      "Unlimited projects",
      "Clean, unwatermarked PDF reports",
      "Buy report credits as you need them",
      "White-label logo branding with 100-Pack",
      "Priority email support (human-reviewed)",
    ],
  },
  {
    name: "Advisory",
    price: "$2,889",
    priceNote: "per year (+ $99 lifetime)",
    tagline: "For firms that resell institutional reports.",
    cta: "Go Unlimited",
    highlight: false,
    features: [
      "Everything in Professional",
      "Unlimited clean reports",
      "White-label logo branding included",
      "Advanced custom shock parameters",
      "Direct founder / human escalation",
      "Priority email support (human-reviewed)",
    ],
  },
];

const creditPacks = [
  { name: "Single Report", price: "$59", per: "$59 / report", note: "Pay as you go" },
  { name: "10-Pack", price: "$390", per: "$39 / report", note: "Save 34%" },
  { name: "50-Pack", price: "$1,450", per: "$29 / report", note: "Save 51%" },
  { name: "100-Pack", price: "$2,400", per: "$24 / report", note: "Save 59% + Logo Branding" },
];

const comparison: {
  group: string;
  rows: { label: string; values: [Cell, Cell, Cell] }[];
}[] = [
  {
    group: "Platform & Architecture",
    rows: [
      { label: "Zero-Knowledge BYO Infrastructure", values: [true, true, true] },
      { label: "BYO-AI Integration (Qwen via Puter)", values: [true, true, true] },
      { label: "Lifetime Platform Access", values: [true, true, true] },
    ],
  },
  {
    group: "Streams & Asset Classes",
    rows: [
      { label: "Active Projects", values: ["1", "Unlimited", "Unlimited"] },
      { label: "Operational Stream (hold assets)", values: [true, true, true] },
      { label: "Sale Stream (build-to-sell)", values: [true, true, true] },
      { label: "Core Assets (Resi, Retail, Office)", values: [true, true, true] },
      {
        label: "Specialized Assets (Hotel, Data Centre, Warehouse)",
        values: [true, true, true],
      },
    ],
  },
  {
    group: "AI Market Research",
    rows: [
      { label: "Pin-Drop Location Intelligence", values: [true, true, true] },
      { label: "Live AI Market Research", values: [true, true, true] },
      {
        label: "AI Feasibility Study Generation",
        values: ["1 watermarked", "Clean per credit", "Unlimited clean"],
      },
    ],
  },
  {
    group: "Financial Modeling & Scenarios",
    rows: [
      { label: "6-Step Financial Wizard (C1–C6)", values: [true, true, true] },
      { label: "Dynamic Jurisdiction Logic (MY, UAE, AU…)", values: [true, true, true] },
      { label: "Standard Scenario Analysis + Tornado Chart", values: [true, true, true] },
      { label: "Advanced Custom Shock Parameters", values: [false, false, true] },
    ],
  },
  {
    group: "Reporting",
    rows: [
      { label: "PDF Export", values: ["Watermarked", "Clean", "Clean"] },
      { label: "White-Label Logo Branding", values: [false, "With 100-Pack", true] },
    ],
  },
  {
    group: "Support & Onboarding",
    rows: [
      { label: "Documentation & Guides", values: [true, true, true] },
      { label: "24/7 AI Support Concierge (Telegram)", values: [true, true, true] },
      { label: "Priority Email Support (human-reviewed)", values: [false, true, true] },
      { label: "Direct Founder / Human Escalation", values: [false, false, true] },
    ],
  },
];

function renderCell(v: Cell) {
  if (v === true) return <Check />;
  if (v === false) return <Cross />;
  return <span className="text-sm text-slate-300">{v}</span>;
}

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-slate-950 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold tracking-widest text-emerald-400">
            PRICING
          </span>
          <h2 className="mt-4 text-4xl font-bold text-white">
            Pay Only for What You Deliver
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            One-time lifetime access. Then pay per feasibility report — or go
            unlimited. Your data never leaves your own cloud.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                t.highlight
                  ? "border-emerald-500 bg-slate-900 shadow-lg shadow-emerald-500/10"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              {t.badge ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold text-slate-950">
                  {t.badge}
                </span>
              ) : null}
              <h3 className="text-xl font-semibold text-white">{t.name}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{t.price}</span>
              </div>
              <p className="mt-1 text-sm text-emerald-400">{t.priceNote}</p>
              <p className="mt-3 text-sm text-slate-400">{t.tagline}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {t.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-sm text-slate-300"
                  >
                    <span className="mt-0.5">
                      <Check />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold ${
                  t.highlight
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    : "border border-slate-700 text-white hover:bg-slate-800"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-20">
          <h3 className="text-center text-2xl font-semibold text-white">
            Report Credits — Professional Tier
          </h3>
          <p className="mt-2 text-center text-sm text-slate-400">
            Buy reports as you need them. Packs expire 12 months after purchase.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {creditPacks.map((p) => (
              <div
                key={p.name}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center"
              >
                <p className="text-sm font-medium text-slate-400">{p.name}</p>
                <p className="mt-2 text-3xl font-bold text-white">{p.price}</p>
                <p className="mt-1 text-sm text-slate-400">{p.per}</p>
                <p className="mt-3 inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  {p.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900">
                <th className="px-6 py-4 text-sm font-semibold text-slate-400">
                  Features
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-white">
                  Explorer
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-emerald-400">
                  Professional
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-white">
                  Advisory
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((group) => (
                <Fragment key={group.group}>
                  <tr className="border-b border-slate-800 bg-slate-900/60">
                    <td
                      colSpan={4}
                      className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-emerald-400"
                    >
                      {group.group}
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.label} className="border-b border-slate-800/60">
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {row.label}
                      </td>
                      {row.values.map((v, i) => (
                        <td key={i} className="px-6 py-4">
                          {renderCell(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          FeasiBuild never stores your data. Projects are encrypted in your own
          Puter cloud (BYO-Infrastructure). Report packs expire 12 months after
          purchase. Advisory billed annually.
        </p>
      </div>
    </section>
  );
}
