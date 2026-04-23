"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useFinModelStore from "@/store/useFinModelStore";

export default function HomePage() {
  const router = useRouter();
  const setAssetType = useFinModelStore((s) => s.setAssetType);
  const resetAssetType = useFinModelStore((s) => s.resetAssetType);

  useEffect(() => {
    resetAssetType();
  }, [resetAssetType]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            FinModel App
          </h1>
          <p className="text-lg text-slate-400">
            Real Estate Development Financial Modeling
          </p>
        </div>

        {/* Stream Selection Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Development for Sale */}
          <button
            type="button"
            onClick={() => {
              setAssetType("sale");
              router.push("/sale/cash-outflows");
            }}
            className="group relative rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-left transition-all duration-300 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10"
          >
            <div className="mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-500/20 transition-colors group-hover:bg-emerald-500/30">
                <svg
                  className="h-8 w-8 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">
              Development for Sale
            </h2>
            <p className="mb-4 text-slate-400">
              Residential & Commercial projects for sale (condos, landed,
              shop-offices, strata offices)
            </p>
            <div className="flex items-center font-medium text-emerald-400">
              Start Project
              <svg
                className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </button>

          {/* Development for Hold/Operations */}
          <button
            type="button"
            onClick={() => {
              setAssetType("operational");
              router.push("/operational/cash-outflows");
            }}
            className="group relative rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-left transition-all duration-300 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10"
          >
            <div className="mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-500/20 transition-colors group-hover:bg-blue-500/30">
                <svg
                  className="h-8 w-8 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">
              Development for Hold/Operations
            </h2>
            <p className="mb-4 text-slate-400">
              Income-producing assets (Hotels, Shopping Malls, Office Buildings)
            </p>
            <div className="flex items-center font-medium text-blue-400">
              Start Project
              <svg
                className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </button>
        </div>

        {/* Footer Note */}
        <p className="mt-12 text-center text-sm text-slate-500">
          Select a development type to begin your financial model
        </p>
      </div>
    </div>
  );
}
