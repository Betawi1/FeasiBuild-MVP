import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";
import BlogBody from "@/components/blog/BlogBody";
import BlogCard from "@/components/blog/BlogCard";
import { formatPostDate } from "@/components/blog/format";
import type { BlogListItem } from "@/content/blog/categories";
import type { BlogPost } from "@/content/blog/posts";

type LinkedInPostViewProps = {
  post: BlogPost;
  related: BlogListItem[];
};

export default function LinkedInPostView({
  post,
  related,
}: LinkedInPostViewProps) {
  const slides = post.slides ?? [];

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/blog"
        className="mb-8 inline-flex text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
      >
        ← All Learn posts
      </Link>

      <div className="relative mb-8 aspect-[1.91/1] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <Image
          src={post.poster}
          alt={post.title}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 896px) 100vw, 896px"
        />
      </div>

      <h1 className="text-3xl font-bold leading-tight text-white md:text-5xl">
        {post.title}
      </h1>
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-400">
        <span>{post.author}</span>
        <span className="text-slate-600">·</span>
        <span>{formatPostDate(post.date)}</span>
        <span className="text-slate-600">·</span>
        <span>{post.readTime}</span>
        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-400">
          {post.category}
        </span>
      </div>

      <div className="mt-10">
        <BlogBody body={post.body} />
      </div>

      <section className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-xl font-semibold text-white">Slide deck</h2>
        <a
          href={post.deckPdf}
          download
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
        >
          <Download className="h-4 w-4" />
          Download the slide deck (PDF)
        </a>

        {slides.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {slides.map((slide, index) => (
              <a
                key={slide}
                href={slide}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-video overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
              >
                <Image
                  src={slide}
                  alt={`${post.title} slide ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </a>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-10 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-8 text-center">
        <p className="text-lg font-medium text-white">
          Run this analysis yourself — first report free at feasibuild.app
        </p>
        <Link
          href="/sign-up"
          className="mt-5 inline-flex rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
        >
          Start your first report
        </Link>
      </section>

      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-semibold text-white">
            Related posts
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <BlogCard key={item.slug} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
