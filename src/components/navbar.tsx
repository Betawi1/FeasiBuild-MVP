"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";

export default function Navbar() {
  const { user, isLoaded } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              <span className="text-white">Feasi</span>
              <span className="text-emerald-400">Build</span>
            </h1>
          </Link>

          <div className="hidden space-x-8 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              How It Works
            </Link>
            <Link
              href="#about"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              About
            </Link>
          </div>

          <div className="hidden items-center space-x-4 md:flex">
            {!isLoaded ? (
              <div className="h-8 w-20 animate-pulse rounded bg-slate-800" />
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 sm:flex"
                >
                  <svg
                    className="h-4 w-4 text-emerald-500"
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
                  Dashboard
                </Link>
                <UserButton
                  appearance={{
                    variables: { colorPrimary: "#10b981" },
                  }}
                />
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-slate-300 transition hover:text-white"
                >
                  Log In
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-300 hover:text-white focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div className="border-b border-slate-800 bg-slate-900 md:hidden">
          <div className="space-y-4 px-4 pb-6 pt-2">
            <Link
              href="#features"
              className="block rounded-md px-3 py-2 text-base font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="block rounded-md px-3 py-2 text-base font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="#about"
              className="block rounded-md px-3 py-2 text-base font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>

            <div className="space-y-3 border-t border-slate-800 pt-4">
              {!isLoaded ? (
                <div className="h-10 animate-pulse rounded bg-slate-800" />
              ) : user ? (
                <div className="flex justify-center py-2">
                  <UserButton
                    appearance={{
                      variables: { colorPrimary: "#10b981" },
                    }}
                  />
                </div>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="block w-full rounded-lg border border-slate-700 px-4 py-2 text-center text-slate-300 transition hover:border-slate-600 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="block w-full rounded-lg bg-emerald-500 px-4 py-2 text-center font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
