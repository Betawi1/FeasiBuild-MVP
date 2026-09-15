"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import BlogCard from "@/components/blog/BlogCard";
import {
  BLOG_FILTER_CATEGORIES,
  searchBlogItems,
  type BlogListItem,
  type UnifiedBlogCategory,
} from "@/content/blog/categories";

const FILTERS: Array<UnifiedBlogCategory | "All"> = [
  "All",
  ...BLOG_FILTER_CATEGORIES,
];

export default function BlogIndex({ entries }: { entries: BlogListItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<UnifiedBlogCategory | "All">("All");

  const results = useMemo(
    () => searchBlogItems(entries, query, category),
    [entries, query, category]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mx-auto mb-12 max-w-4xl text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Learn
          <span className="mx-3 text-slate-600">·</span>
          <Link
            href="/vault"
            className="transition hover:text-emerald-300"
          >
            Vault
          </Link>
          <span className="mx-3 text-slate-600">·</span>
          <Link
            href="/faq"
            className="transition hover:text-emerald-300"
          >
            FAQ
          </Link>
        </p>
        <h1 className="mb-4 text-3xl font-bold leading-tight text-white md:text-5xl">
          FeasiBuild Learn — feasibility intelligence for developers, valuers
          &amp; financiers
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-400 md:text-lg">
          LinkedIn posters, slide decks, and essays on underwriting, asset
          streams, and the jurisdictions FeasiBuild is built for.
        </p>
      </header>

      <div className="mb-6">
        <label htmlFor="blog-search" className="sr-only">
          Search posts
        </label>
        <div className="relative mx-auto max-w-2xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            id="blog-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, persona, jurisdiction, tags, or keyword…"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3.5 pl-12 pr-12 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {FILTERS.map((filter) => {
          const active = category === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setCategory(filter)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-white"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      <p className="mb-6 text-sm text-slate-500">
        {results.length} {results.length === 1 ? "post" : "posts"}
        {query || category !== "All" ? " matching" : ""}
      </p>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-16 text-center">
          <p className="text-slate-300">No posts match that search.</p>
          <p className="mt-2 text-sm text-slate-500">
            Try a jurisdiction (UAE, Malaysia), a persona (Closer, Scout), or
            clear the filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item) => (
            <BlogCard key={item.slug} item={item} showTypeBadge />
          ))}
        </div>
      )}
    </div>
  );
}
