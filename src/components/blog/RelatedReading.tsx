import Link from "next/link";
import type { BlogListItem } from "@/content/blog/categories";

export default function RelatedReading({ items }: { items: BlogListItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="mb-6 text-2xl font-semibold text-white">Related reading</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/blog/${item.slug}`}
            className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-emerald-500/50"
          >
            <h3 className="mb-2 font-semibold leading-snug text-white">
              {item.title}
            </h3>
            <p className="line-clamp-3 text-sm leading-relaxed text-slate-400">
              {item.excerpt}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
