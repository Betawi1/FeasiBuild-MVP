import Link from "next/link";

export default function BlogNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
        Learn
      </p>
      <h1 className="mb-4 text-3xl font-bold text-white">Post not found</h1>
      <p className="mb-8 text-slate-400">
        That article is not in FeasiBuild Learn. It may have been moved or the
        link is incomplete.
      </p>
      <Link
        href="/blog"
        className="inline-flex rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
      >
        Back to Learn
      </Link>
    </div>
  );
}
