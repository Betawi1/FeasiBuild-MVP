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

export default function ComparisonPage() {
  const speedData = [
    { method: "FeasiBuild", hours: 0.25 },
    { method: "Competitor A (Legacy)", hours: 120 },
    { method: "Competitor B (Manual Excel)", hours: 40 },
    { method: "Competitor C (Enterprise)", hours: 240 },
  ];

  const featureData = [
    { feature: "AI Automation", feasiBuild: 100, industryAvg: 35 },
    { feature: "Speed", feasiBuild: 98, industryAvg: 40 },
    { feature: "Market Research", feasiBuild: 90, industryAvg: 45 },
    { feature: "Ease of Use", feasiBuild: 92, industryAvg: 50 },
    { feature: "Output Quality", feasiBuild: 95, industryAvg: 70 },
    { feature: "Global Coverage", feasiBuild: 95, industryAvg: 40 },
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
            <Link href="/#how-it-works" className="transition hover:text-emerald-400">
              How It Works
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
          See why developers, investors, and consultants choose FeasiBuild over
          traditional feasibility study methods and legacy software.
        </p>
      </div>

      <section className="mx-auto mb-20 max-w-5xl px-6">
        <h2 className="mb-8 text-center text-3xl font-bold text-white">
          Time to Complete Feasibility Study
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={speedData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                type="number"
                stroke="#94a3b8"
                label={{ value: "Hours", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                dataKey="method"
                type="category"
                stroke="#94a3b8"
                width={180}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
                formatter={(value) => [`${value ?? 0} hours`, "Time Required"]}
              />
              <Bar dataKey="hours" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                />
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
                  desc: "Automated market research and intelligent defaults. Competitors require manual data entry.",
                },
                {
                  title: "15-Minute Turnaround",
                  desc: "Generate institutional-grade studies in minutes, not weeks.",
                },
                {
                  title: "International Coverage",
                  desc: "Built for UAE, Saudi Arabia, Malaysia, and beyond. Not limited to one region.",
                },
                {
                  title: "Institutional-Grade Output",
                  desc: "Professional PDF and PowerPoint exports ready for investors and lenders.",
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

      <section className="mx-auto mb-20 max-w-5xl px-6">
        <h2 className="mb-8 text-center text-3xl font-bold text-white">
          Detailed Feature Comparison
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-950">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-400">
                    FeasiBuild
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-400">
                    Competitor A
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-400">
                    Competitor B
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-400">
                    Competitor C
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[
                  {
                    name: "AI-Powered Market Research",
                    fb: true,
                    c1: false,
                    c2: false,
                    c3: false,
                  },
                  {
                    name: "Automated Narrative Generation",
                    fb: true,
                    c1: false,
                    c2: false,
                    c3: false,
                  },
                  {
                    name: "Self-Service Platform",
                    fb: true,
                    c1: false,
                    c2: true,
                    c3: true,
                  },
                  {
                    name: "Scenario Analysis",
                    fb: true,
                    c1: true,
                    c2: true,
                    c3: true,
                  },
                  {
                    name: "PDF/PPT Export",
                    fb: true,
                    c1: true,
                    c2: false,
                    c3: true,
                  },
                  {
                    name: "Global Market Coverage",
                    fb: true,
                    c1: false,
                    c2: false,
                    c3: true,
                  },
                ].map((row) => (
                  <tr key={row.name} className="transition hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-sm text-slate-300">{row.name}</td>
                    <td className="px-6 py-4 text-center text-xl text-emerald-400">
                      ✓
                    </td>
                    <td className="px-6 py-4 text-center text-xl text-slate-600">
                      {row.c1 ? "✓" : "✗"}
                    </td>
                    <td className="px-6 py-4 text-center text-xl text-slate-600">
                      {row.c2 ? "✓" : "✗"}
                    </td>
                    <td className="px-6 py-4 text-center text-xl text-slate-600">
                      {row.c3 ? "✓" : "✗"}
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
          Join developers and consultants who are saving time and delivering
          better results with AI-powered feasibility studies.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/waitlist"
            className="rounded-lg bg-emerald-500 px-8 py-4 text-lg font-semibold text-white transition hover:bg-emerald-600"
          >
            Try FeasiBuild
          </Link>
        </div>
      </section>
    </div>
  );
}
