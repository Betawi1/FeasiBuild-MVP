"use client";

import React, { useState } from "react";

export default function NewInvestmentPage() {
  const [assetName, setAssetName] = useState("");
  const [amount, setAmount] = useState("");
  const [investmentType, setInvestmentType] = useState("Stock");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ assetName?: string; amount?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { assetName?: string; amount?: string } = {};

    if (!assetName.trim()) {
      newErrors.assetName = "Asset Name is required.";
    }

    if (!amount || Number(amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    console.log("✅ Form Submitted!", {
      assetName,
      amount,
      investmentType,
      purchaseDate,
      notes,
    });
    alert(`Investment created: ${assetName} - $${amount}`);
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto p-8 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl">
        <h1 className="mb-6 text-2xl font-bold text-white">
          New Investment
        </h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Asset Name
            </label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="e.g., Bitcoin, Ethereum"
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {errors.assetName && (
              <p className="mt-1 text-sm text-red-400">{errors.assetName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Amount (USD)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 1000"
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-400">{errors.amount}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Investment Type
            </label>
            <select
              value={investmentType}
              onChange={(e) => setInvestmentType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Stock">Stock</option>
              <option value="Crypto">Crypto</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Bond">Bond</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Purchase Date
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this investment..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Create Investment
          </button>
        </form>
      </div>
    </div>
  );
}
