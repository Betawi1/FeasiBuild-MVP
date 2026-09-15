import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";
import AuthorBio from "@/components/blog/AuthorBio";
import MarkdownBody from "@/components/blog/MarkdownBody";
import RelatedReading from "@/components/blog/RelatedReading";
import { formatPostDate } from "@/components/blog/format";
import type { BlogArticle, BlogListItem } from "@/content/blog/categories";

type ArticleViewProps = {
  article: BlogArticle;
  related: BlogListItem[];
  posterExists: boolean;
};

export default function ArticleView({
  article,
  related,
  posterExists,
}: ArticleViewProps) {
  const slides = article.slides ?? [];
  const hasDeck = Boolean(article.deckPdf);

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/blog"
        className="mb-8 inline-flex text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
      >
        ← All Learn posts
      </Link>

      <div className="relative mb-8 aspect-[1.91/1] overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/40">
        {posterExists ? (
          <Image
            src={article.poster}
            alt={article.title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 896px) 100vw, 896px"
          />
        ) : (
          <div className="flex h-full items-end p-8">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
              FeasiBuild Learn
            </p>
          </div>
        )}
      </div>

      <h1 className="text-3xl font-bold leading-tight text-white md:text-5xl">
        {article.title}
      </h1>
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-400">
        <span>{article.author}</span>
        <span className="text-slate-600">·</span>
        <span>{formatPostDate(article.date)}</span>
        <span className="text-slate-600">·</span>
        <span>{article.readTime}</span>
        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-400">
          {article.category}
        </span>
        <span className="inline-flex rounded-full border border-slate-600 bg-slate-900 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-300">
          Article
        </span>
      </div>

      <div className="mt-10">
        <MarkdownBody markdown={article.markdown} />
      </div>

      {hasDeck ? (
        <section className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Slide deck</h2>
          <a
            href={article.deckPdf}
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
                    alt={`${article.title} slide ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </a>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <AuthorBio />
      <RelatedReading items={related} />
    </article>
  );
}
