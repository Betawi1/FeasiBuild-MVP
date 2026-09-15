import Image from "next/image";
import Link from "next/link";
import type { BlogListItem } from "@/content/blog/categories";
import { postMetaLine } from "@/components/blog/format";

type BlogCardProps = {
  item: BlogListItem;
  showTypeBadge?: boolean;
};

export default function BlogCard({ item, showTypeBadge = false }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${item.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 transition hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5"
    >
      <div className="relative aspect-[1.91/1] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/30">
        {item.posterExists !== false && item.poster ? (
          <Image
            src={item.poster}
            alt={item.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : null}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-500/30 bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-400 backdrop-blur-sm">
            {item.category}
          </span>
          {showTypeBadge ? (
            <span className="rounded-full border border-slate-600/80 bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300 backdrop-blur-sm">
              {item.kind === "article" ? "Article" : "Post"}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-2 text-lg font-semibold leading-snug text-white transition group-hover:text-emerald-400">
          {item.title}
        </h3>
        <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-400">
          {item.excerpt}
        </p>
        <p className="text-xs text-slate-500">{postMetaLine(item)}</p>
      </div>
    </Link>
  );
}
