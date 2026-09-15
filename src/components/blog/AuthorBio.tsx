import Link from "next/link";

export default function AuthorBio() {
  return (
    <section className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <Link
        href="/sign-up"
        className="inline-flex shrink-0 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
      >
        Try FeasiBuild free
      </Link>
    </section>
  );
}
