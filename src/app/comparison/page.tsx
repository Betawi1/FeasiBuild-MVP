"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
};

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <span className="text-xl text-emerald-400">✓</span>;
  if (v === false) return <span className="text-xl text-slate-600">✗</span>;
  return <span className="text-xs text-slate-400">{v}</span>;
}

export default function ComparisonPage() {
  const speedData = [
    { method: "FeasiBuild", hours: 0.25 },
    { method: "Regional Cloud SaaS", hours: 20 },
    { method: "Manual Excel", hours: 40 },
    { method: "AI Consultancy", hours: 120 },
    { method: "Legacy Desktop Suite", hours: 240 },
  ];

  const featureData = [
    { feature: "AI Automation", feasiBuild: 100, industryAvg: 35 },
    { feature: "Speed", feasiBuild: 98, industryAvg: 40 },
    { feature: "Market Research", feasiBuild: 90, industryAvg: 45 },
    { feature: "Ease of Use", feasiBuild: 92, industryAvg: 50 },
    { feature: "Output Quality", feasiBuild: 95, industryAvg: 70 },
    { feature: "Jurisdiction Depth", feasiBuild: 95, industryAvg: 40 },
  ];

  const costCards = [
    {
      label: "AI Consultancy",
      value: "$7,000+",
      unit: "per study",
      note: "5-day turnaround, no tool access, data on their servers",
      highlight: false,
    },
    {
      label: "Legacy Desktop Suite",
      value: "$500–$3,000",
      unit: "per month",
      note: "On-premises, Windows-only, steep learning curve",
      highlight: false,
    },
    {
      label: "Regional Cloud SaaS",
      value: "$600–$1,600",
      unit: "per year",
      note: "Single-region only, manual data entry",
      highlight: false,
    },
    {
      label: "FeasiBuild",
      value: "from $24",
      unit: "per report",
      note: "$99 lifetime access, then pay-as-you-use",
      highlight: true,
    },
  ];

  const tableRows = [
    {
      name: "AI-Powered Real-Time Market Research",
      fb: true,
      legacy: false,
      regional: false,
      consultancy: true,
    },
    {
      name: "AI-Written Narrative + Auto-Generated Decks",
      fb: true,
      legacy: false,
      regional: "Limited",
      consultancy: true,
    },
    {
      name: "Zero-Knowledge Privacy (data stays in YOUR cloud)",
      fb: true,
      legacy: false,
      regional: false,
      consultancy: false,
    },
    {
      name: "Multi-Jurisdiction Engine (UAE, KSA, MY, AU…)",
      fb: true,
      legacy: "Limited",
      regional: false,
      consultancy: "Limited",
    },
    {
      name: "Development Waterfalls, Gap-Fill & Escrow Logic",
      fb: true,
      legacy: true,
      regional: "Limited",
      consultancy: true,
    },
    {
      name: "Niche Assets: Data Centre & Warehouse",
      fb: true,
      legacy: "Limited",
      regional: false,
      consultancy: true,
    },
    {
      name: "Self-Service: Results in Minutes, Not Weeks",
      fb: true,
      legacy: false,
      regional: true,
      consultancy: false,
    },
    {
      name: "Pay-As-You-Use Pricing",
      fb: true,
      legacy: false,
      regional: false,
      consultancy: false,
    },
    {
      name: "White-Label Logo Branding",
      fb: true,
      legacy: "Limited",
      regional: true,
      consultancy: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-white">Feasi</span>
            <span className="text-emerald-400">Build</span>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <Link href="/#features" className="transition hover:text-emerald-400">
              Features
            </Link>
            <Link
              href="/#how-it-works"
              className="transition hover:text-emerald-400"
            >
              How It Works
            </Link>
            <Link href="/#pricing" className="transition hover:text-emerald-400">
              Pricing
            </Link>
            <Link href="/founder" className="transition hover:text-emerald-400">
              Founder
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-white transition hover:bg-emerald-600"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-16 text-center">
        <h1 className="mb-6 text-5xl font-bold text-white">
          How FeasiBuild Compares
        </h1>
        <p className="mx-auto max-w-3xl text-xl text-slate-400">
          See why developers, valuers, bankers, and consultants choose FeasiBuild
          over legacy desktop suites, regional tools, manual Excel, and $7,000
          consultancy reports.
        </p>
      </div>

      <section className="mx-auto mb-20 max-w-5xl px-6">
        <h2 className="mb-8 text-center text-3xl font-bold text-white">
          Time to Complete a Feasibility Study
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={speedData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                type="number"
                stroke="#94a3b8"
                label={{ value: "Hours", position: "insideBottom", offset: -5 }}
              />
              <YAxis dataKey="method" type="category" stroke="#94a3b8" width={180} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [
                  `${value ?? 0} hours`,
                  "Time Required",
                ]}
              />
              <Bar dataKey="hours" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mx-auto mb-20 max-w-7xl px-6">
        <h2 className="mb-8 text-center text-3xl font-bold text-white">
          What a Feasibility Study Costs
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {costCards.map((c) => (
            <div
              key={c.label}
              className={`rounded-xl border p-6 text-center ${
                c.highlight
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-slate-800 bg-slate-900"
              }`}
            >
              <p className="text-sm font-medium text-slate-400">{c.label}</p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  c.highlight ? "text-emerald-400" : "text-white"
                }`}
              >
                {c.value}
              </p>
              <p className="text-sm text-slate-400">{c.unit}</p>
              <p className="mt-3 text-xs text-slate-500">{c.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mb-20 max-w-7xl px-6">
        <h2 className="mb-8 text-center text-3xl font-bold text-white">
          Feature Comparison
        </h2>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={featureData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis
                  dataKey="feature"
                  stroke="#94a3b8"
                  style={{ fontSize: "12px" }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" />
                <Radar
                  name="FeasiBuild"
                  dataKey="feasiBuild"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Industry Average"
                  dataKey="industryAvg"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.3}
                />
                <Legend />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col justify-center space-y-6">
            <h3 className="mb-4 text-2xl font-bold text-white">
              Why FeasiBuild Wins
            </h3>
            <div className="space-y-4">
              {[
                {
                  title: "AI-Powered Automation",
                  desc: "Real-time market research and intelligent defaults. Others require manual data entry.",
                },
                {
                  title: "Zero-Knowledge Privacy",
                  desc: "Your models live in YOUR own cloud (BYO-Infrastructure). We never see or store your data.",
                },
                {
                  title: "15-Minute Turnaround",
                  desc: "Institutional-grade studies in minutes, not weeks or 5-day consultancy queues.",
                },
                {
                  title: "Multi-Jurisdiction Depth",
                  desc: "UAE/KSA escrow, Malaysia HDA, Australia 10/90 — not limited to one region.",
                },
                {
                  title: "Pay-As-You-Use Pricing",
                  desc: "From $24 per report with $99 lifetime access. No $7,000 studies or $3,000/month licenses.",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-white">{item.title}</h4>
                    <p className="text-sm text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mb-20 max-w-6xl px-6">
        <h2 className="mb-8 text-center text-3xl font-bold text-white">
          Detailed Feature Comparison
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-950">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-400">
                    FeasiBuild
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-400">
                    Legacy Desktop Suite
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-400">
                    Regional Cloud SaaS
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-400">
                    AI Consultancy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tableRows.map((row) => (
                  <tr key={row.name} className="transition hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-sm text-slate-300">{row.name}</td>
                    <td className="px-6 py-4 text-center">
                      <Cell v={row.fb} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Cell v={row.legacy} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Cell v={row.regional} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Cell v={row.consultancy} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="pb-20 text-center">
        <h2 className="mb-6 text-3xl font-bold text-white">
          Ready to Experience the Difference?
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-slate-400">
          Start free with lifetime access. Model every asset class, run every
          scenario, and pay only when you export a report.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-emerald-500 px-8 py-4 text-lg font-semibold text-white transition hover:bg-emerald-600"
          >
            Start Free
          </Link>
          <Link
            href="/#pricing"
            className="rounded-lg border border-slate-700 px-8 py-4 text-lg font-semibold text-white transition hover:bg-slate-800"
          >
            See Pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
