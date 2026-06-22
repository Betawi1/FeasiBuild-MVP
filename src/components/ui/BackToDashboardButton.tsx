"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BackToDashboardButton() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" />
      Dashboard
    </Link>
  );
}
