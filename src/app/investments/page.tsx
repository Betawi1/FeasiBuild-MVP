"use client";

import { useState } from "react";
import Link from "next/link";

// Sample investment data (we'll connect to real data later)
const sampleInvestments = [
  { id: 1, assetName: "Bitcoin", amount: "5000", type: "Crypto", date: "2024-01-15" },
  { id: 2, assetName: "Tesla Stock", amount: "3000", type: "Stock", date: "2024-02-20" },
  { id: 3, assetName: "Ethereum", amount: "2500", type: "Crypto", date: "2024-03-10" },
];

export default function InvestmentsPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">My Investments</h1>
          <Link
            href="/investments/new"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            + New Investment
          </Link>
        </div>

        <div className="grid gap-4">
          {sampleInvestments.map((investment) => (
            <div
              key={investment.id}
              className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-emerald-500/50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">{investment.assetName}</h3>
                  <p className="text-sm text-slate-400">{investment.type} • {investment.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-400">${investment.amount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
